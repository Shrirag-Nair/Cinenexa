'use strict'

/**
 * Watchlist Lambda
 * Routes:
 *   GET    /watchlist/{userId}          → list
 *   POST   /watchlist/{userId}          → add
 *   GET    /watchlist/{userId}/{movieId} → check
 *   DELETE /watchlist/{userId}/{movieId} → remove
 */

const {
  success, error, preflight, parseBody,
  getPathParam, getUserId, validateRequired,
  ddb, GetCommand, PutCommand, DeleteCommand, QueryCommand,
} = require('/opt/nodejs/utils')

const TABLE = process.env.WATCHLIST_TABLE || 'cinenexa-watchlist'

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  const method  = event.httpMethod
  const userId  = getPathParam(event, 'userId')
  const movieId = getPathParam(event, 'movieId')

  // Auth: only allow the authenticated user to touch their own watchlist
  const authUserId = getUserId(event)
  if (authUserId && authUserId !== userId) {
    return error('Forbidden', 403)
  }

  try {
    if (method === 'GET'    && !movieId) return await listWatchlist(userId)
    if (method === 'POST'   && !movieId) return await addToWatchlist(userId, event)
    if (method === 'GET'    &&  movieId) return await checkWatchlist(userId, movieId)
    if (method === 'DELETE' &&  movieId) return await removeFromWatchlist(userId, movieId)

    return error('Route not found', 404)
  } catch (err) {
    console.error('Watchlist Lambda error:', err)
    return error('Internal server error', 500)
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listWatchlist(userId) {
  if (!userId) return error('userId required', 400)

  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    // Newest first
    ScanIndexForward: false,
  }))

  const items = (result.Items || []).map(({ pk, sk, ...rest }) => rest)
  return success(items)
}

async function addToWatchlist(userId, event) {
  if (!userId) return error('userId required', 400)

  const body = parseBody(event)
  const missing = validateRequired(body, ['movieId', 'title'])
  if (missing) return error(`Missing required fields: ${missing.join(', ')}`, 400)

  const item = {
    pk: `USER#${userId}`,
    sk: `MOVIE#${body.movieId}`,
    userId,
    movieId:     String(body.movieId),
    title:       body.title,
    posterPath:  body.posterPath  || null,
    releaseDate: body.releaseDate || null,
    voteAverage: body.voteAverage || 0,
    overview:    body.overview    || '',
    genres:      body.genres      || [],
    addedAt:     new Date().toISOString(),
  }

  // ConditionExpression prevents duplicates
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: 'attribute_not_exists(pk)',
  })).catch((e) => {
    // ConditionalCheckFailedException = already exists, silently ignore
    if (e.name !== 'ConditionalCheckFailedException') throw e
  })

  return success({ movieId: body.movieId, addedAt: item.addedAt }, 201)
}

async function checkWatchlist(userId, movieId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `USER#${userId}`, sk: `MOVIE#${movieId}` },
  }))
  return success({ inWatchlist: !!result.Item })
}

async function removeFromWatchlist(userId, movieId) {
  if (!userId || !movieId) return error('userId and movieId required', 400)

  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { pk: `USER#${userId}`, sk: `MOVIE#${movieId}` },
  }))

  return success({ removed: true })
}
