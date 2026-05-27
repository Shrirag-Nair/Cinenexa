'use strict'

/**
 * Movies Lambda
 * Routes handled:
 *   GET /movies/trending
 *   GET /movies/top-rated
 *   GET /movies/now-playing
 *   GET /movies/upcoming
 *   GET /movies/genres
 *   GET /movies/search?q=&page=
 *   GET /movies/genre?genreId=&page=
 *   GET /movies/{id}
 *   GET /movies/{id}/similar
 *   POST /movies/rate
 */

const {
  success, error, preflight, parseBody,
  getPathParam, getQueryParam, getUserId,
  ddb, GetCommand, PutCommand, QueryCommand,
  tmdbRequest,
} = require('/opt/nodejs/utils')

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  const method = event.httpMethod
  const resource = event.resource || event.path || ''

  try {
    // Trending
    if (method === 'GET' && resource.endsWith('/trending')) {
      return await getTrending()
    }
    // Top rated
    if (method === 'GET' && resource.endsWith('/top-rated')) {
      return await getTopRated(event)
    }
    // Now playing
    if (method === 'GET' && resource.endsWith('/now-playing')) {
      return await getNowPlaying(event)
    }
    // Upcoming
    if (method === 'GET' && resource.endsWith('/upcoming')) {
      return await getUpcoming(event)
    }
    // Genres list
    if (method === 'GET' && resource.endsWith('/genres')) {
      return await getGenres()
    }
    // Search
    if (method === 'GET' && resource.endsWith('/search')) {
      return await searchMovies(event)
    }
    // Genre filter
    if (method === 'GET' && resource.endsWith('/genre')) {
      return await getByGenre(event)
    }
    // Rate movie
    if (method === 'POST' && resource.endsWith('/rate')) {
      return await rateMovie(event)
    }
    // Similar movies  /movies/{id}/similar
    if (method === 'GET' && resource.includes('/similar')) {
      return await getSimilar(event)
    }
    // Movie detail  /movies/{id}
    if (method === 'GET' && getPathParam(event, 'id')) {
      return await getMovieById(event)
    }

    return error('Route not found', 404)
  } catch (err) {
    console.error('Movies Lambda error:', err)
    return error('Internal server error', 500)
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function getTrending() {
  // Try cache in DynamoDB first (TTL 1 hour)
  const cacheKey = 'trending_week'
  try {
    const cached = await ddb.send(new GetCommand({
      TableName: process.env.CACHE_TABLE || 'cinenexa-cache',
      Key: { cacheKey },
    }))
    if (cached.Item && cached.Item.ttl > Math.floor(Date.now() / 1000)) {
      return success(cached.Item.data)
    }
  } catch { /* cache miss - fetch fresh */ }

  const data = await tmdbRequest('/trending/movie/week')
  const movies = data.results || []

  // Store in cache (TTL 1 hour)
  try {
    await ddb.send(new PutCommand({
      TableName: process.env.CACHE_TABLE || 'cinenexa-cache',
      Item: {
        cacheKey,
        data: movies,
        ttl: Math.floor(Date.now() / 1000) + 3600,
      },
    }))
  } catch { /* cache write failure is non-fatal */ }

  return success(movies)
}

async function getTopRated(event) {
  const page = getQueryParam(event, 'page', '1')
  const data = await tmdbRequest(`/movie/top_rated?page=${page}`)
  return success(data.results || [])
}

async function getNowPlaying(event) {
  const page = getQueryParam(event, 'page', '1')
  const data = await tmdbRequest(`/movie/now_playing?page=${page}`)
  return success(data.results || [])
}

async function getUpcoming(event) {
  const page = getQueryParam(event, 'page', '1')
  const data = await tmdbRequest(`/movie/upcoming?page=${page}`)
  return success(data.results || [])
}

async function getGenres() {
  const data = await tmdbRequest('/genre/movie/list')
  return success(data.genres || [])
}

async function searchMovies(event) {
  const query = getQueryParam(event, 'q', '')
  const page  = getQueryParam(event, 'page', '1')

  if (!query.trim()) return success([])

  // Encode query for URL
  const encoded = encodeURIComponent(query.trim())
  const data = await tmdbRequest(`/search/movie?query=${encoded}&page=${page}&include_adult=false`)
  return success(data.results || [])
}

async function getByGenre(event) {
  const genreId = getQueryParam(event, 'genreId')
  const page    = getQueryParam(event, 'page', '1')

  if (!genreId) return error('genreId is required', 400)

  const data = await tmdbRequest(
    `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  )
  return success(data.results || [])
}

async function getMovieById(event) {
  const id = getPathParam(event, 'id')
  if (!id) return error('Movie ID required', 400)

  // Fetch movie details + credits + videos + similar in parallel
  const [details, credits, videos, similar] = await Promise.allSettled([
    tmdbRequest(`/movie/${id}?append_to_response=credits,videos,similar`),
    Promise.resolve(null), // included in append_to_response
    Promise.resolve(null),
    Promise.resolve(null),
  ])

  if (details.status === 'rejected') return error('Movie not found', 404)

  const movie = details.value
  // TMDB appended credits, videos, similar directly
  return success(movie)
}

async function getSimilar(event) {
  const id   = getPathParam(event, 'id')
  const page = getQueryParam(event, 'page', '1')

  if (!id) return error('Movie ID required', 400)

  const data = await tmdbRequest(`/movie/${id}/similar?page=${page}`)
  return success(data.results || [])
}

async function rateMovie(event) {
  const userId = getUserId(event)
  if (!userId) return error('Unauthorized', 401)

  const { movieId, rating } = parseBody(event)
  if (!movieId || rating == null) return error('movieId and rating required', 400)
  if (rating < 1 || rating > 10) return error('Rating must be 1–10', 400)

  await ddb.send(new PutCommand({
    TableName: process.env.RATINGS_TABLE || 'cinenexa-ratings',
    Item: {
      pk: `USER#${userId}`,
      sk: `MOVIE#${movieId}`,
      userId,
      movieId: String(movieId),
      rating: Number(rating),
      ratedAt: new Date().toISOString(),
    },
  }))

  return success({ movieId, rating }, 201)
}
