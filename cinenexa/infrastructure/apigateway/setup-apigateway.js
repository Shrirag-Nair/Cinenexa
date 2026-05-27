#!/usr/bin/env node

/**
 * CineNexa — API Gateway Setup Script
 * Run: node setup-apigateway.js [--lambda-prefix cinenexa]
 *
 * Creates a REST API with:
 *   - JWT Cognito Authorizer
 *   - CORS pre-flight OPTIONS on every resource
 *   - Routes wired to Lambda functions
 *   - Stage: prod
 */

const {
  APIGatewayClient,
  CreateRestApiCommand,
  GetRestApisCommand,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand,
  CreateDeploymentCommand,
  CreateAuthorizerCommand,
  PutGatewayResponseCommand,
} = require('@aws-sdk/client-api-gateway')

const {
  LambdaClient,
  AddPermissionCommand,
  ListFunctionsCommand,
} = require('@aws-sdk/client-lambda')

const REGION         = process.env.AWS_REGION || 'us-east-1'
const ACCOUNT_ID     = process.env.AWS_ACCOUNT_ID || 'YOUR_ACCOUNT_ID'
const USER_POOL_ID   = process.env.COGNITO_USER_POOL_ID || 'YOUR_USER_POOL_ID'
const LAMBDA_PREFIX  = process.argv[3] || 'cinenexa'
const API_NAME       = 'CineNexa-API'
const STAGE          = 'prod'

const agClient     = new APIGatewayClient({ region: REGION })
const lambdaClient = new LambdaClient({ region: REGION })

// ─── Route definitions ────────────────────────────────────────────────────────
// [path, method, lambda, requiresAuth]
const ROUTES = [
  // Movies (public)
  ['/movies/trending',   'GET',  'movies', false],
  ['/movies/top-rated',  'GET',  'movies', false],
  ['/movies/now-playing','GET',  'movies', false],
  ['/movies/upcoming',   'GET',  'movies', false],
  ['/movies/genres',     'GET',  'movies', false],
  ['/movies/search',     'GET',  'movies', false],
  ['/movies/genre',      'GET',  'movies', false],
  ['/movies/{id}',       'GET',  'movies', false],
  ['/movies/{id}/similar','GET', 'movies', false],
  ['/movies/rate',       'POST', 'movies', true],

  // Watchlist (auth required)
  ['/watchlist/{userId}',         'GET',    'watchlist', true],
  ['/watchlist/{userId}',         'POST',   'watchlist', true],
  ['/watchlist/{userId}/{movieId}','GET',    'watchlist', true],
  ['/watchlist/{userId}/{movieId}','DELETE', 'watchlist', true],

  // Recommendations (public GET, auth POST)
  ['/recommendations/{userId}', 'GET',  'recommendations', false],
  ['/recommendations/record',   'POST', 'recommendations', true],

  // User (auth required)
  ['/user/{userId}',              'GET', 'user', true],
  ['/user/{userId}',              'PUT', 'user', true],
  ['/user/{userId}/preferences',  'PUT', 'user', true],
  ['/user/{userId}/history',      'GET', 'user', true],
  ['/user/{userId}/history',      'POST','user', true],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'method.response.header.Access-Control-Allow-Origin':  "'*'",
  'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date'",
  'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
}

async function getLambdaArn(name) {
  const functions = await lambdaClient.send(new ListFunctionsCommand({}))
  const fn = functions.Functions.find((f) =>
    f.FunctionName === `${LAMBDA_PREFIX}-${name}` || f.FunctionName === name
  )
  if (!fn) throw new Error(`Lambda function not found: ${LAMBDA_PREFIX}-${name}`)
  return fn.FunctionArn
}

async function createOrGetApi() {
  const apis = await agClient.send(new GetRestApisCommand({ limit: 100 }))
  const existing = apis.items.find((a) => a.name === API_NAME)
  if (existing) {
    console.log(`⚠️  API "${API_NAME}" already exists: ${existing.id}`)
    return existing.id
  }

  console.log(`📦 Creating REST API: ${API_NAME}`)
  const result = await agClient.send(new CreateRestApiCommand({
    name:                  API_NAME,
    description:           'CineNexa Serverless API',
    endpointConfiguration: { types: ['REGIONAL'] },
  }))
  console.log(`✅ API created: ${result.id}`)
  return result.id
}

async function getResources(apiId) {
  const result = await agClient.send(new GetResourcesCommand({ restApiId: apiId, limit: 500 }))
  const map = {}
  for (const r of result.items) map[r.path] = r.id
  return map
}

async function ensureResource(apiId, resourceMap, fullPath) {
  if (resourceMap[fullPath]) return resourceMap[fullPath]

  const parts = fullPath.split('/').filter(Boolean)
  let currentPath = ''
  let parentId = resourceMap['/']

  for (const part of parts) {
    currentPath += '/' + part
    if (resourceMap[currentPath]) {
      parentId = resourceMap[currentPath]
      continue
    }
    const result = await agClient.send(new CreateResourceCommand({
      restApiId: apiId,
      parentId,
      pathPart:  part,
    }))
    resourceMap[currentPath] = result.id
    parentId = result.id
  }

  return resourceMap[fullPath]
}

async function addOptionsMethod(apiId, resourceId) {
  try {
    await agClient.send(new PutMethodCommand({
      restApiId:         apiId,
      resourceId,
      httpMethod:        'OPTIONS',
      authorizationType: 'NONE',
      requestParameters: {},
    }))
    await agClient.send(new PutIntegrationCommand({
      restApiId:            apiId,
      resourceId,
      httpMethod:           'OPTIONS',
      type:                 'MOCK',
      requestTemplates:     { 'application/json': '{"statusCode": 200}' },
    }))
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e
  }

  try {
    await agClient.send(new PutMethodResponseCommand({
      restApiId:  apiId,
      resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Origin':  true,
      },
    }))
    await agClient.send(new PutIntegrationResponseCommand({
      restApiId:          apiId,
      resourceId,
      httpMethod:         'OPTIONS',
      statusCode:         '200',
      responseParameters: CORS_HEADERS,
      responseTemplates:  { 'application/json': '' },
    }))
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e
  }
}

async function addMethod(apiId, resourceId, httpMethod, lambdaArn, authorizerId) {
  try {
    await agClient.send(new PutMethodCommand({
      restApiId:         apiId,
      resourceId,
      httpMethod,
      authorizationType: authorizerId ? 'COGNITO_USER_POOLS' : 'NONE',
      ...(authorizerId && { authorizerId }),
    }))

    const lambdaUri = `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`

    await agClient.send(new PutIntegrationCommand({
      restApiId:             apiId,
      resourceId,
      httpMethod,
      type:                  'AWS_PROXY',
      integrationHttpMethod: 'POST',
      uri:                   lambdaUri,
    }))
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e
  }
}

async function grantApiGatewayPermission(apiId, lambdaArn) {
  try {
    await lambdaClient.send(new AddPermissionCommand({
      FunctionName:  lambdaArn,
      StatementId:   `apigateway-${apiId}-${Date.now()}`,
      Action:        'lambda:InvokeFunction',
      Principal:     'apigateway.amazonaws.com',
      SourceArn:     `arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${apiId}/*/*`,
    }))
  } catch (e) {
    if (!e.message?.includes('already exists')) console.warn('  Permission already exists or skipped')
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎬 CineNexa — API Gateway Setup')
  console.log(`📍 Region: ${REGION}`)
  console.log(`📍 Lambda prefix: ${LAMBDA_PREFIX}\n`)

  const apiId = await createOrGetApi()
  const resourceMap = await getResources(apiId)

  // Create Cognito Authorizer
  console.log('\n🔒 Creating Cognito authorizer...')
  let authorizerId
  try {
    const authResult = await agClient.send(new CreateAuthorizerCommand({
      restApiId:                    apiId,
      name:                         'CineNexaCognitoAuth',
      type:                         'COGNITO_USER_POOLS',
      providerARNs:                 [`arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${USER_POOL_ID}`],
      identitySource:               'method.request.header.Authorization',
      authorizerResultTtlInSeconds: 300,
    }))
    authorizerId = authResult.id
    console.log(`✅ Authorizer created: ${authorizerId}`)
  } catch (e) {
    console.warn(`⚠️  Could not create authorizer (may already exist): ${e.message}`)
  }

  // Lambda ARN cache
  const lambdaArns = {}

  // Add all routes
  console.log('\n🛣️  Adding routes...')
  for (const [path, method, lambdaName, requiresAuth] of ROUTES) {
    process.stdout.write(`  ${method.padEnd(7)} ${path.padEnd(40)} → ${lambdaName}`)

    // Get/create resource
    const resourceId = await ensureResource(apiId, resourceMap, path)

    // Ensure CORS OPTIONS (once per resource)
    await addOptionsMethod(apiId, resourceId)

    // Get Lambda ARN (cached)
    if (!lambdaArns[lambdaName]) {
      try {
        lambdaArns[lambdaName] = await getLambdaArn(lambdaName)
        await grantApiGatewayPermission(apiId, lambdaArns[lambdaName])
      } catch {
        process.stdout.write(' ⚠️  Lambda not found, skipping\n')
        continue
      }
    }

    await addMethod(apiId, resourceId, method, lambdaArns[lambdaName], requiresAuth ? authorizerId : null)
    console.log(requiresAuth ? ' 🔒' : ' ✅')
  }

  // Deploy to prod stage
  console.log(`\n🚀 Deploying to stage: ${STAGE}`)
  await agClient.send(new CreateDeploymentCommand({
    restApiId:   apiId,
    stageName:   STAGE,
    description: `CineNexa deployment ${new Date().toISOString()}`,
  }))

  const apiUrl = `https://${apiId}.execute-api.${REGION}.amazonaws.com/${STAGE}`
  console.log(`\n✅ API deployed!\n`)
  console.log('='.repeat(60))
  console.log('📋 Add this to your frontend .env file:')
  console.log('='.repeat(60))
  console.log(`VITE_API_BASE_URL=${apiUrl}`)
  console.log('='.repeat(60))
  console.log('\n✅ API Gateway setup complete!\n')
}

main().catch((err) => {
  console.error('❌ API Gateway setup failed:', err)
  process.exit(1)
})
