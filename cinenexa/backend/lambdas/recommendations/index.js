'use strict'

/**
 * Recommendations Lambda
 * Routes:
 *   GET /recommendations/{userId}   → get personalized recommendations
 *   POST /recommendations/record    → record a movie interaction (view, rate, add)
 *
 * Algorithm:
 *   1. Fetch user's watchlist + ratings from DynamoDB
 *   2. Extract genre preferences from their activity
 *   3. Fetch popular movies in those genres from TMDB
 *   4. Score & rank by genre match + rating signal
 *   5. Filter out already-seen/watchlisted movies
 *   6. Return top N recommendations
 */

const {
  success, error, preflight, parseBody,
  getPathParam, getUserId,
  ddb, GetCommand, PutCommand, QueryCommand,
  tmdbRequest,
} = require('/opt/nodejs/utils')

const WATCHLIST_TABLE    = process.env.WATCHLIST_TABLE    || 'cinenexa-watchlist'
const RATINGS_TABLE      = process.env.RATINGS_TABLE      || 'cinenexa-ratings'
const INTERACTIONS_TABLE = process.env.INTERACTIONS_TABLE || 'cinenexa-interactions'
const RECO_COUNT         = 20   // how many to return

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  const method = event.httpMethod
  const path   = event.resource || event.path || ''

  try {
    if (method === 'GET') {
      const userId = getPathParam(event, 'userId')
      if (!userId) return error('userId required', 400)
      return await getRecommendations(userId)
    }

    if (method === 'POST' && path.endsWith('/record')) {
      return await recordInteraction(event)
    }

    return error('Route not found', 404)
  } catch (err) {
    console.error('Recommendations Lambda error:', err)
    return error('Internal server error', 500)
  }
}

// ─── Core recommendation logic ────────────────────────────────────────────────

async function getRecommendations(userId) {
  // 1. Fetch user's activity in parallel
  const [watchlistResult, ratingsResult, interactionsResult] = await Promise.allSettled([
    ddb.send(new QueryCommand({
      TableName: WATCHLIST_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    })),
    ddb.send(new QueryCommand({
      TableName: RATINGS_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    })),
    ddb.send(new QueryCommand({
      TableName: INTERACTIONS_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
      Limit: 50,
      ScanIndexForward: false,
    })),
  ])

  const watchlist     = watchlistResult.value?.Items     || []
  const ratings       = ratingsResult.value?.Items       || []
  const interactions  = interactionsResult.value?.Items  || []

  // 2. Build a set of already-seen movie IDs (to exclude from recommendations)
  const seenMovieIds = new Set([
    ...watchlist.map((w) => w.movieId),
    ...ratings.map((r) => r.movieId),
    ...interactions.map((i) => i.movieId),
  ])

  // 3. Build genre preference scores
  const genreScores = buildGenreScores(watchlist, ratings, interactions)

  // 4. If no activity yet → return trending
  if (Object.keys(genreScores).length === 0) {
    const trending = await tmdbRequest('/trending/movie/week')
    return success((trending.results || []).slice(0, RECO_COUNT))
  }

  // 5. Pick top 3 genres and fetch movies for each
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genreId]) => genreId)

  const genreMovieFetches = topGenres.map((genreId) =>
    tmdbRequest(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100`)
  )

  const genreResults = await Promise.allSettled(genreMovieFetches)

  // 6. Collect all candidate movies
  const candidates = new Map()
  genreResults.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    const movies = result.value.results || []
    const genreId = topGenres[idx]
    const genreWeight = genreScores[genreId] || 1

    movies.forEach((movie) => {
      if (seenMovieIds.has(String(movie.id))) return
      if (!movie.poster_path) return // skip movies without posters

      if (!candidates.has(movie.id)) {
        candidates.set(movie.id, { ...movie, recommendationScore: 0 })
      }

      // Score: popularity + genre affinity + rating quality
      const existing = candidates.get(movie.id)
      const popularityScore  = Math.log(movie.popularity + 1) * 0.3
      const genreAffinityScore = genreWeight * 2.0
      const ratingScore      = (movie.vote_average / 10) * 1.5

      existing.recommendationScore += popularityScore + genreAffinityScore + ratingScore
    })
  })

  // 7. Sort by score and return top N
  const recommendations = Array.from(candidates.values())
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, RECO_COUNT)

  return success(recommendations)
}

/**
 * Build a genre → affinity score map from user activity.
 * Ratings > 7 boost a genre; low ratings reduce it.
 * Watchlist adds = moderate boost.
 * Views = small boost.
 */
function buildGenreScores(watchlist, ratings, interactions) {
  const scores = {}

  const add = (genreId, weight) => {
    scores[String(genreId)] = (scores[String(genreId)] || 0) + weight
  }

  // Watchlist genres
  watchlist.forEach((item) => {
    (item.genres || []).forEach((g) => add(g.id || g, 1.5))
  })

  // Ratings (weighted by rating value)
  ratings.forEach((item) => {
    const ratingWeight = (item.rating - 5) * 0.4  // -2 to +2
    ;(item.genres || []).forEach((g) => add(g.id || g, ratingWeight))
  })

  // View interactions
  interactions.forEach((item) => {
    if (item.type === 'view') {
      ;(item.genres || []).forEach((g) => add(g.id || g, 0.5))
    }
  })

  // Clamp minimum to 0
  Object.keys(scores).forEach((k) => {
    if (scores[k] < 0) delete scores[k]
  })

  return scores
}

async function recordInteraction(event) {
  const userId = getUserId(event)
  if (!userId) return error('Unauthorized', 401)

  const body = parseBody(event)
  const { movieId, type, genres } = body
  if (!movieId || !type) return error('movieId and type required', 400)

  const validTypes = ['view', 'trailer_play', 'search_click', 'detail_view']
  if (!validTypes.includes(type)) return error(`Invalid type. Use: ${validTypes.join(', ')}`, 400)

  await ddb.send(new PutCommand({
    TableName: INTERACTIONS_TABLE,
    Item: {
      pk:          `USER#${userId}`,
      sk:          `${Date.now()}#MOVIE#${movieId}`,
      userId,
      movieId:     String(movieId),
      type,
      genres:      genres || [],
      recordedAt:  new Date().toISOString(),
      // TTL: keep interactions for 90 days
      ttl:         Math.floor(Date.now() / 1000) + 90 * 24 * 3600,
    },
  }))

  return success({ recorded: true })
}
