#!/usr/bin/env node
 
/**
 * CineNexa — Pre-flight Lambda Test Script
 * Run: node test-lambdas.js
 *
 * Tests each Lambda function directly (bypasses API Gateway)
 * so you can verify they work before wiring up the frontend.
 */
 
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda')
 
const REGION = process.env.AWS_REGION || 'ap-south-1'
const client = new LambdaClient({ region: REGION })
 
// ─── Test cases ───────────────────────────────────────────────────────────────
// Each entry: [functionName, description, event payload]
 
const TESTS = [
  // ── Movies Lambda ──────────────────────────────────────────────────────────
  [
    'cinenexa-movies',
    'GET /movies/trending',
    {
      httpMethod: 'GET',
      resource: '/movies/trending',
      path: '/movies/trending',
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
      body: null,
    },
  ],
  [
    'cinenexa-movies',
    'GET /movies/search?q=inception',
    {
      httpMethod: 'GET',
      resource: '/movies/search',
      path: '/movies/search',
      queryStringParameters: { q: 'inception' },
      pathParameters: null,
      headers: {},
      body: null,
    },
  ],
  [
    'cinenexa-movies',
    'GET /movies/550 (Fight Club)',
    {
      httpMethod: 'GET',
      resource: '/movies/{id}',
      path: '/movies/550',
      queryStringParameters: null,
      pathParameters: { id: '550' },
      headers: {},
      body: null,
    },
  ],
 
  // ── Watchlist Lambda ───────────────────────────────────────────────────────
  [
    'cinenexa-watchlist',
    'GET /watchlist/test-user-123',
    {
      httpMethod: 'GET',
      resource: '/watchlist/{userId}',
      path: '/watchlist/test-user-123',
      queryStringParameters: null,
      pathParameters: { userId: 'test-user-123' },
      // Simulate authenticated user (same as userId for test)
      requestContext: {
        authorizer: { claims: { sub: 'test-user-123' } },
      },
      headers: {},
      body: null,
    },
  ],
  [
    'cinenexa-watchlist',
    'POST /watchlist/test-user-123 (add movie)',
    {
      httpMethod: 'POST',
      resource: '/watchlist/{userId}',
      path: '/watchlist/test-user-123',
      queryStringParameters: null,
      pathParameters: { userId: 'test-user-123' },
      requestContext: {
        authorizer: { claims: { sub: 'test-user-123' } },
      },
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieId: '550',
        title: 'Fight Club',
        posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        releaseDate: '1999-10-15',
        voteAverage: 8.8,
        overview: 'Test movie',
        genres: [{ id: 18, name: 'Drama' }],
      }),
    },
  ],
 
  // ── Recommendations Lambda ─────────────────────────────────────────────────
  [
    'cinenexa-recommendations',
    'GET /recommendations/test-user-123',
    {
      httpMethod: 'GET',
      resource: '/recommendations/{userId}',
      path: '/recommendations/test-user-123',
      queryStringParameters: null,
      pathParameters: { userId: 'test-user-123' },
      headers: {},
      body: null,
    },
  ],
 
  // ── User Lambda ────────────────────────────────────────────────────────────
  [
    'cinenexa-user',
    'GET /user/test-user-123',
    {
      httpMethod: 'GET',
      resource: '/user/{userId}',
      path: '/user/test-user-123',
      queryStringParameters: null,
      pathParameters: { userId: 'test-user-123' },
      requestContext: {
        authorizer: { claims: { sub: 'test-user-123' } },
      },
      headers: {},
      body: null,
    },
  ],
]
 
// ─── Test runner ──────────────────────────────────────────────────────────────
 
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
 
async function invokeFunction(functionName, payload) {
  const command = new InvokeCommand({
    FunctionName:   functionName,
    Payload:        JSON.stringify(payload),
    InvocationType: 'RequestResponse',
    LogType:        'Tail',
  })
 
  const response = await client.send(command)
 
  // Decode base64 logs
  const logs = response.LogResult
    ? Buffer.from(response.LogResult, 'base64').toString('utf8')
    : ''
 
  // Decode response payload
  const body = JSON.parse(Buffer.from(response.Payload).toString('utf8'))
 
  return { statusCode: body.statusCode, body, logs, functionError: response.FunctionError }
}
 
async function runTests() {
  console.log(`\n${BOLD}🎬 CineNexa — Lambda Pre-flight Tests${RESET}`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`Region: ${REGION}`)
  console.log(`${'─'.repeat(60)}\n`)
 
  const results = { pass: 0, fail: 0, errors: [] }
 
  for (const [fnName, description, event] of TESTS) {
    process.stdout.write(`  ${CYAN}${description.padEnd(45)}${RESET} `)
 
    try {
      const { statusCode, body, logs, functionError } = await invokeFunction(fnName, event)
 
      if (functionError) {
        console.log(`${RED}✗ FUNCTION ERROR${RESET}`)
        console.log(`    Error: ${functionError}`)
        if (body.errorMessage) console.log(`    Msg: ${body.errorMessage}`)
        results.fail++
        results.errors.push({ description, error: body.errorMessage || functionError })
        continue
      }
 
      if (statusCode >= 200 && statusCode < 300) {
        // Parse response body
        const responseBody = typeof body.body === 'string' ? JSON.parse(body.body) : body.body
        const dataLength = Array.isArray(responseBody?.data)
          ? ` (${responseBody.data.length} items)`
          : ''
        console.log(`${GREEN}✓ ${statusCode}${dataLength}${RESET}`)
        results.pass++
      } else {
        const responseBody = typeof body.body === 'string' ? JSON.parse(body.body) : body.body
        console.log(`${RED}✗ ${statusCode} — ${responseBody?.error || 'Unknown error'}${RESET}`)
        results.fail++
        results.errors.push({ description, error: `HTTP ${statusCode}: ${responseBody?.error}` })
      }
    } catch (err) {
      // Lambda function doesn't exist or IAM error
      if (err.name === 'ResourceNotFoundException') {
        console.log(`${RED}✗ FUNCTION NOT FOUND${RESET}`)
        results.errors.push({ description, error: `Lambda "${fnName}" not found — did you deploy it?` })
      } else {
        console.log(`${RED}✗ ${err.message}${RESET}`)
        results.errors.push({ description, error: err.message })
      }
      results.fail++
    }
  }
 
  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${BOLD}Results: ${GREEN}${results.pass} passed${RESET}${BOLD}, ${RED}${results.fail} failed${RESET}`)
 
  if (results.errors.length > 0) {
    console.log(`\n${YELLOW}Issues to fix:${RESET}`)
    results.errors.forEach(({ description, error }) => {
      console.log(`  ${RED}✗${RESET} ${description}`)
      console.log(`    → ${error}`)
    })
 
    console.log(`\n${YELLOW}Common fixes:${RESET}`)
    console.log('  • "Function not found"   → run zip + upload in Lambda console')
    console.log('  • "Invalid TMDB API key" → check TMDB_API_KEY env var in Lambda')
    console.log('  • "Cannot read properties of undefined" → env var missing')
    console.log('  • "ResourceNotFoundException" → DynamoDB table name mismatch')
    console.log('  • Timeout error → increase Lambda timeout to 30s in console')
  }
 
  if (results.fail === 0) {
    console.log(`\n${GREEN}${BOLD}✅ All Lambdas healthy! Ready to connect frontend.${RESET}`)
    console.log('\nNext steps:')
    console.log('  1. Set up API Gateway (Step 6)')
    console.log('  2. Update frontend/.env with real values')
    console.log('  3. Replace apiClient.js with apiClient.real.js')
  }
 
  console.log('')
}
 
runTests().catch((err) => {
  console.error('Test runner failed:', err.message)
  process.exit(1)
})