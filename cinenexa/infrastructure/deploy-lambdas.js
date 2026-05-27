#!/usr/bin/env node

/**
 * CineNexa — Lambda Deployment Script
 * Run: node deploy-lambdas.js
 *
 * Zips each Lambda function and deploys to AWS.
 * Also creates/updates the shared layer.
 *
 * Prerequisites:
 *   - AWS CLI configured (aws configure)
 *   - npm install done in each lambda directory
 *   - Set AWS_ACCOUNT_ID, TMDB_API_KEY in environment
 */

const { execSync, exec } = require('child_process')
const path = require('path')
const fs   = require('fs')
const {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  GetFunctionCommand,
  PublishLayerVersionCommand,
  CreateFunctionUrlConfigCommand,
} = require('@aws-sdk/client-lambda')

const REGION       = process.env.AWS_REGION      || 'us-east-1'
const ACCOUNT_ID   = process.env.AWS_ACCOUNT_ID  || 'YOUR_ACCOUNT_ID'
const TMDB_API_KEY = process.env.TMDB_API_KEY    || 'YOUR_TMDB_API_KEY'
const PREFIX       = 'cinenexa'
const RUNTIME      = 'nodejs20.x'
const TIMEOUT      = 30         // seconds
const MEMORY       = 256        // MB

const lambdaClient = new LambdaClient({ region: REGION })

// Lambda function configs
const FUNCTIONS = [
  {
    name:    'auth',
    handler: 'index.handler',
    env: {
      USERS_TABLE: 'cinenexa-users',
    },
  },
  {
    name:    'movies',
    handler: 'index.handler',
    env: {
      TMDB_API_KEY,
      CACHE_TABLE:   'cinenexa-cache',
      RATINGS_TABLE: 'cinenexa-ratings',
    },
  },
  {
    name:    'watchlist',
    handler: 'index.handler',
    env: {
      WATCHLIST_TABLE: 'cinenexa-watchlist',
    },
  },
  {
    name:    'recommendations',
    handler: 'index.handler',
    env: {
      TMDB_API_KEY,
      WATCHLIST_TABLE:    'cinenexa-watchlist',
      RATINGS_TABLE:      'cinenexa-ratings',
      INTERACTIONS_TABLE: 'cinenexa-interactions',
    },
  },
  {
    name:    'user',
    handler: 'index.handler',
    env: {
      USERS_TABLE:   'cinenexa-users',
      HISTORY_TABLE: 'cinenexa-history',
    },
  },
]

const LAMBDAS_DIR = path.join(__dirname, '..', 'lambdas')
const TMP_DIR     = path.join(__dirname, '..', '..', 'tmp')

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function zipDir(sourceDir, outputPath) {
  run(`zip -r ${outputPath} . -x "*.DS_Store" -x "__MACOSX/*"`, sourceDir)
}

async function functionExists(functionName) {
  try {
    await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }))
    return true
  } catch {
    return false
  }
}

async function deployLayer() {
  console.log('\n📦 Building shared Lambda layer...')
  const layerDir = path.join(__dirname, '..', 'layers', 'shared', 'nodejs')

  // Install deps in layer
  run('npm install --production', layerDir)

  // Zip the layer
  const layerZip = path.join(TMP_DIR, 'shared-layer.zip')
  const layerSrc = path.join(__dirname, '..', 'layers', 'shared')
  fs.mkdirSync(TMP_DIR, { recursive: true })
  zipDir(layerSrc, layerZip)

  // Publish
  const result = await lambdaClient.send(new PublishLayerVersionCommand({
    LayerName:          `${PREFIX}-shared`,
    Description:        'CineNexa shared utilities',
    CompatibleRuntimes: [RUNTIME],
    Content:            { ZipFile: fs.readFileSync(layerZip) },
  }))

  console.log(`✅ Layer published: v${result.Version}`)
  return result.LayerVersionArn
}

async function deployFunction(fnConfig, layerArn) {
  const fullName   = `${PREFIX}-${fnConfig.name}`
  const fnDir      = path.join(LAMBDAS_DIR, fnConfig.name)
  const zipPath    = path.join(TMP_DIR, `${fnConfig.name}.zip`)

  console.log(`\n📦 Deploying ${fullName}...`)

  // Zip function code
  zipDir(fnDir, zipPath)
  const zipBuffer = fs.readFileSync(zipPath)

  const roleArn = `arn:aws:iam::${ACCOUNT_ID}:role/cinenexa-lambda-role`

  const exists = await functionExists(fullName)

  if (!exists) {
    // Create new function
    await lambdaClient.send(new CreateFunctionCommand({
      FunctionName:  fullName,
      Runtime:       RUNTIME,
      Handler:       fnConfig.handler,
      Role:          roleArn,
      Timeout:       TIMEOUT,
      MemorySize:    MEMORY,
      Layers:        layerArn ? [layerArn] : [],
      Code:          { ZipFile: zipBuffer },
      Environment: {
        Variables: {
          NODE_ENV:    'production',
          AWS_REGION:  REGION,
          ...fnConfig.env,
        },
      },
      Tags: { Project: 'CineNexa', Function: fnConfig.name },
    }))
    console.log(`✅ ${fullName} created`)
  } else {
    // Update existing
    await lambdaClient.send(new UpdateFunctionCodeCommand({
      FunctionName: fullName,
      ZipFile:      zipBuffer,
    }))

    // Small delay to let code update finish
    await new Promise((r) => setTimeout(r, 3000))

    await lambdaClient.send(new UpdateFunctionConfigurationCommand({
      FunctionName:  fullName,
      Runtime:       RUNTIME,
      Handler:       fnConfig.handler,
      Timeout:       TIMEOUT,
      MemorySize:    MEMORY,
      Layers:        layerArn ? [layerArn] : [],
      Environment: {
        Variables: {
          NODE_ENV:    'production',
          AWS_REGION:  REGION,
          ...fnConfig.env,
        },
      },
    }))
    console.log(`✅ ${fullName} updated`)
  }
}

async function main() {
  console.log('\n🎬 CineNexa — Lambda Deployment')
  console.log(`📍 Region: ${REGION}`)
  console.log(`📍 Account: ${ACCOUNT_ID}\n`)

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

  // 1. Deploy shared layer
  const layerArn = await deployLayer()

  // 2. Deploy all functions
  for (const fnConfig of FUNCTIONS) {
    await deployFunction(fnConfig, layerArn)
  }

  // Cleanup tmp
  fs.rmSync(TMP_DIR, { recursive: true, force: true })

  console.log('\n' + '='.repeat(60))
  console.log('✅ All Lambda functions deployed!\n')
  console.log('⚠️  IAM Role required:')
  console.log('   Create role "cinenexa-lambda-role" with policies:')
  console.log('   - AWSLambdaBasicExecutionRole')
  console.log('   - AmazonDynamoDBFullAccess')
  console.log('   - CloudWatchLogsFullAccess')
  console.log('\nNext step: Run setup-apigateway.js\n')
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err)
  process.exit(1)
})
