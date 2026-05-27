'use strict'

/**
 * User Lambda
 * Routes:
 *   GET  /user/{userId}              → get profile
 *   PUT  /user/{userId}              → update profile
 *   PUT  /user/{userId}/preferences  → update genre preferences
 *   GET  /user/{userId}/history      → get watch history
 *   POST /user/{userId}/history      → add to watch history
 */

const {
  success, error, preflight, parseBody,
  getPathParam, getUserId, validateRequired,
  ddb, GetCommand, PutCommand, UpdateCommand, QueryCommand,
} = require('/opt/nodejs/utils')

const USERS_TABLE   = process.env.USERS_TABLE   || 'cinenexa-users'
const HISTORY_TABLE = process.env.HISTORY_TABLE || 'cinenexa-history'

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  const method  = event.httpMethod
  const userId  = getPathParam(event, 'userId')
  const subPath = event.resource || ''

  // Auth guard — users can only access their own data
  const authUserId = getUserId(event)
  if (authUserId && authUserId !== userId) return error('Forbidden', 403)

  try {
    if (method === 'GET'  && subPath.endsWith('/history'))     return await getHistory(userId)
    if (method === 'POST' && subPath.endsWith('/history'))     return await addToHistory(userId, event)
    if (method === 'PUT'  && subPath.endsWith('/preferences')) return await updatePreferences(userId, event)
    if (method === 'GET'  && !subPath.endsWith('/preferences')) return await getProfile(userId)
    if (method === 'PUT'  && !subPath.endsWith('/preferences')) return await updateProfile(userId, event)

    return error('Route not found', 404)
  } catch (err) {
    console.error('User Lambda error:', err)
    return error('Internal server error', 500)
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  if (!userId) return error('userId required', 400)

  const result = await ddb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }))

  if (!result.Item) {
    // Profile doesn't exist yet → return empty shell (first-time login)
    return success({ userId, name: '', preferences: { genres: [] }, createdAt: null })
  }

  // Never return sensitive fields
  const { passwordHash, ...profile } = result.Item
  return success(profile)
}

async function updateProfile(userId, event) {
  if (!userId) return error('userId required', 400)

  const body = parseBody(event)
  const allowed = ['name', 'avatarUrl', 'bio']
  const updates = {}
  allowed.forEach((field) => { if (body[field] !== undefined) updates[field] = body[field] })

  if (Object.keys(updates).length === 0) return error('No valid fields to update', 400)

  const updateExpressions = Object.keys(updates).map((k) => `#${k} = :${k}`)
  const expressionAttributeNames  = Object.fromEntries(Object.keys(updates).map((k) => [`#${k}`, k]))
  const expressionAttributeValues = {
    ...Object.fromEntries(Object.keys(updates).map((k) => [`:${k}`, updates[k]])),
    ':updatedAt': new Date().toISOString(),
  }

  await ddb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}, updatedAt = :updatedAt`,
    ExpressionAttributeNames:  expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }))

  return success({ updated: true, ...updates })
}

async function updatePreferences(userId, event) {
  if (!userId) return error('userId required', 400)

  const { preferences } = parseBody(event)
  if (!preferences) return error('preferences object required', 400)

  await ddb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET preferences = :prefs, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':prefs':     preferences,
      ':updatedAt': new Date().toISOString(),
    },
  }))

  return success({ updated: true, preferences })
}

async function getHistory(userId) {
  if (!userId) return error('userId required', 400)

  const result = await ddb.send(new QueryCommand({
    TableName: HISTORY_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    ScanIndexForward: false, // newest first
    Limit: 50,
  }))

  const items = (result.Items || []).map(({ pk, sk, ...rest }) => rest)
  return success(items)
}

async function addToHistory(userId, event) {
  if (!userId) return error('userId required', 400)

  const body = parseBody(event)
  if (!body.movieId) return error('movieId required', 400)

  const now = new Date().toISOString()

  await ddb.send(new PutCommand({
    TableName: HISTORY_TABLE,
    Item: {
      pk:         `USER#${userId}`,
      sk:         `${Date.now()}#MOVIE#${body.movieId}`,
      userId,
      movieId:    String(body.movieId),
      progress:   body.progress || 0,      // percentage watched 0–100
      watchedAt:  now,
      // TTL: keep history for 1 year
      ttl:        Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
    },
  }))

  return success({ recorded: true, movieId: body.movieId })
}
