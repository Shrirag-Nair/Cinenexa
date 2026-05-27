import https from 'https'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

// Test if SDK loads
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' })
const ddb = DynamoDBDocumentClient.from(client)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
}

const ok  = (data, code=200) => ({ statusCode: code, headers: CORS, body: JSON.stringify({ success: true, data }) })
const err = (msg,  code=500) => ({ statusCode: code, headers: CORS, body: JSON.stringify({ success: false, error: msg }) })

function tmdb(path) {
  return new Promise((resolve, reject) => {
    const key = process.env.TMDB_API_KEY
    const sep = path.includes('?') ? '&' : '?'
    const req = https.get(
      `https://api.themoviedb.org/3${path}${sep}api_key=${key}`,
      { headers: { 'User-Agent': 'CineNexa/1.0', 'Accept': 'application/json' } },
      (res) => {
        let raw = ''
        res.on('data', c => raw += c)
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw)
            if (parsed.status_code === 7) return reject(new Error('Invalid TMDB API key - check Lambda env var TMDB_API_KEY'))
            resolve(parsed)
          } catch(e) { reject(e) }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('TMDB timeout')) })
  })
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }

  const method     = event.httpMethod
  const path       = event.path || ''
  const qs         = event.queryStringParameters || {}
  const pathParams = event.pathParameters || {}

  try {
    if (method === 'GET' && path.endsWith('/trending')) {
      const d = await tmdb('/trending/movie/week')
      return ok(d.results || [])
    }
    if (method === 'GET' && path.endsWith('/top-rated')) {
      const d = await tmdb('/movie/top_rated')
      return ok(d.results || [])
    }
    if (method === 'GET' && path.endsWith('/now-playing')) {
      const d = await tmdb('/movie/now_playing')
      return ok(d.results || [])
    }
    if (method === 'GET' && path.endsWith('/upcoming')) {
      const d = await tmdb('/movie/upcoming')
      return ok(d.results || [])
    }
    if (method === 'GET' && path.endsWith('/genres')) {
      const d = await tmdb('/genre/movie/list')
      return ok(d.genres || [])
    }
    if (method === 'GET' && path.endsWith('/search')) {
      const q = qs.q || ''
      if (!q.trim()) return ok([])
      const d = await tmdb(`/search/movie?query=${encodeURIComponent(q)}&page=${qs.page||1}`)
      return ok(d.results || [])
    }
    if (method === 'GET' && path.endsWith('/genre')) {
      const d = await tmdb(`/discover/movie?with_genres=${qs.genreId}&sort_by=popularity.desc`)
      return ok(d.results || [])
    }
    if (method === 'GET' && path.includes('/similar')) {
      const id = pathParams.id || path.split('/').slice(-2)[0]
      const d  = await tmdb(`/movie/${id}/similar`)
      return ok(d.results || [])
    }
    if (method === 'GET' && pathParams.id) {
      const d = await tmdb(`/movie/${pathParams.id}?append_to_response=credits,videos,similar`)
      return ok(d)
    }
    return err('Route not found', 404)
  } catch(e) {
    console.error('Movies error:', e.message)
    return err(e.message)
  }
}
