// ─── Response Helpers ──────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
}

/**
 * Build a standard success response
 */
function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  }
}

/**
 * Build a standard error response
 */
function error(message, statusCode = 500, details = null) {
  const body = { success: false, error: message }
  if (details) body.details = details
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  }
}

/**
 * CORS preflight response
 */
function preflight() {
  return { statusCode: 200, headers: CORS_HEADERS, body: '' }
}

// ─── Input Helpers ─────────────────────────────────────────────────────────────

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}')
  } catch {
    return {}
  }
}

function getPathParam(event, name) {
  return event.pathParameters?.[name] || null
}

function getQueryParam(event, name, defaultVal = null) {
  return event.queryStringParameters?.[name] ?? defaultVal
}

function getUserId(event) {
  // JWT authorizer injects claims into requestContext
  return (
    event.requestContext?.authorizer?.claims?.sub ||
    event.requestContext?.authorizer?.jwt?.claims?.sub ||
    null
  )
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateRequired(obj, fields) {
  const missing = fields.filter((f) => !obj[f] && obj[f] !== 0)
  return missing.length ? missing : null
}

// ─── DynamoDB helpers ──────────────────────────────────────────────────────────

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb')

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
})

// ─── TMDB helpers ─────────────────────────────────────────────────────────────

const https = require('https')

function tmdbRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.themoviedb.org',
      path: `/3${path}${path.includes('?') ? '&' : '?'}api_key=${process.env.TMDB_API_KEY}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Failed to parse TMDB response')) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

module.exports = {
  success, error, preflight, parseBody,
  getPathParam, getQueryParam, getUserId,
  validateRequired, ddb,
  GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand,
  tmdbRequest,
}
