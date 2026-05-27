const http = require('http')

const TMDB_KEY = '89b74eb3964248aee57de9154ed937f0'  // paste your key here
const PORT = 3001

async function tmdb(path) {
  const url = `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`)
  return res.json()
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
}

function send(res, data) {
  res.writeHead(200, CORS)
  res.end(JSON.stringify({ success: true, data }))
}

function sendError(res, msg, code = 500) {
  res.writeHead(code, CORS)
  res.end(JSON.stringify({ success: false, error: msg }))
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(200, CORS); res.end(); return }

  const [path, queryStr] = req.url.split('?')
  const qs = new URLSearchParams(queryStr || '')

  console.log(`→ ${req.method} ${req.url}`)

  try {
    // Movies
    if (path === '/movies/trending')    return send(res, (await tmdb('/trending/movie/week')).results)
    if (path === '/movies/top-rated')   return send(res, (await tmdb('/movie/top_rated')).results)
    if (path === '/movies/now-playing') return send(res, (await tmdb('/movie/now_playing')).results)
    if (path === '/movies/upcoming')    return send(res, (await tmdb('/movie/upcoming')).results)
    if (path === '/movies/genres')      return send(res, (await tmdb('/genre/movie/list')).genres)
    if (path === '/movies/search') {
      const q = qs.get('q') || ''
      return send(res, (await tmdb(`/search/movie?query=${encodeURIComponent(q)}`)).results)
    }
    if (path === '/movies/genre') {
      const genreId = qs.get('genreId')
      return send(res, (await tmdb(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`)).results)
    }
    // /movies/{id}/similar
    const similarMatch = path.match(/^\/movies\/(\d+)\/similar$/)
    if (similarMatch) {
      return send(res, (await tmdb(`/movie/${similarMatch[1]}/similar`)).results)
    }
    // /movies/{id}
    const movieMatch = path.match(/^\/movies\/(\d+)$/)
    if (movieMatch) {
      return send(res, await tmdb(`/movie/${movieMatch[1]}?append_to_response=credits,videos,similar`))
    }

    // Auth-required routes — return mock empty data locally
    if (path.startsWith('/watchlist'))       return send(res, [])
    if (path.startsWith('/recommendations')) return send(res, (await tmdb('/trending/movie/week')).results.slice(0, 10))
    if (path.startsWith('/user'))            return send(res, {})

    sendError(res, 'Route not found', 404)
  } catch (e) {
    console.error('Error:', e.message)
    sendError(res, e.message)
  }
}).listen(PORT, () => {
  console.log(`✅ Mock API running at http://localhost:${PORT}`)
  console.log(`   Test it: http://localhost:${PORT}/movies/trending`)
})