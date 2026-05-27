#!/usr/bin/env node

/**
 * CineNexa DynamoDB Setup Script
 * Run: node setup-dynamodb.js
 *
 * Creates all required DynamoDB tables:
 *   - cinenexa-users
 *   - cinenexa-watchlist
 *   - cinenexa-ratings
 *   - cinenexa-interactions
 *   - cinenexa-history
 *   - cinenexa-cache
 */

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb')

const REGION = process.env.AWS_REGION || 'us-east-1'
const client = new DynamoDBClient({ region: REGION })

// ─── Table definitions ────────────────────────────────────────────────────────

const TABLES = [
  // ── Users ──────────────────────────────────────────────────────────────────
  {
    TableName: 'cinenexa-users',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },

  // ── Watchlist ──────────────────────────────────────────────────────────────
  // pk = USER#{userId}  sk = MOVIE#{movieId}
  {
    TableName: 'cinenexa-watchlist',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk',      AttributeType: 'S' },
      { AttributeName: 'sk',      AttributeType: 'S' },
      { AttributeName: 'addedAt', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    LocalSecondaryIndexes: [
      {
        IndexName: 'addedAt-index',
        KeySchema: [
          { AttributeName: 'pk',      KeyType: 'HASH' },
          { AttributeName: 'addedAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },

  // ── Ratings ────────────────────────────────────────────────────────────────
  // pk = USER#{userId}  sk = MOVIE#{movieId}
  {
    TableName: 'cinenexa-ratings',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk',      AttributeType: 'S' },
      { AttributeName: 'sk',      AttributeType: 'S' },
      { AttributeName: 'movieId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        // Allows querying "all users who rated movie X"
        IndexName: 'movieId-index',
        KeySchema: [{ AttributeName: 'movieId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['userId', 'rating', 'ratedAt'] },
      },
    ],
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },

  // ── Interactions ───────────────────────────────────────────────────────────
  // pk = USER#{userId}  sk = {timestamp}#MOVIE#{movieId}
  {
    TableName: 'cinenexa-interactions',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    // TTL enabled for auto-expiry after 90 days
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },

  // ── Watch History ──────────────────────────────────────────────────────────
  {
    TableName: 'cinenexa-history',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },

  // ── Cache ──────────────────────────────────────────────────────────────────
  // Used for caching TMDB responses (trending, genres etc.)
  {
    TableName: 'cinenexa-cache',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'cacheKey', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'cacheKey', KeyType: 'HASH' },
    ],
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
    Tags: [{ Key: 'Project', Value: 'CineNexa' }],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }))
    return true
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false
    throw e
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForTable(tableName) {
  console.log(`  ⏳ Waiting for ${tableName} to be ACTIVE...`)
  for (let i = 0; i < 30; i++) {
    const desc = await client.send(new DescribeTableCommand({ TableName: tableName }))
    if (desc.Table.TableStatus === 'ACTIVE') {
      console.log(`  ✅ ${tableName} is ACTIVE`)
      return
    }
    await sleep(2000)
  }
  throw new Error(`Table ${tableName} did not become active in time`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎬 CineNexa — DynamoDB Setup`)
  console.log(`📍 Region: ${REGION}\n`)

  for (const tableConfig of TABLES) {
    const { TableName, TimeToLiveSpecification, ...createParams } = tableConfig

    const exists = await tableExists(TableName)
    if (exists) {
      console.log(`⚠️  ${TableName} already exists — skipping`)
      continue
    }

    console.log(`📦 Creating ${TableName}...`)
    await client.send(new CreateTableCommand({ TableName, ...createParams }))
    await waitForTable(TableName)

    // Enable TTL separately if configured
    if (TimeToLiveSpecification) {
      const { UpdateTimeToLiveCommand } = require('@aws-sdk/client-dynamodb')
      await client.send(new UpdateTimeToLiveCommand({
        TableName,
        TimeToLiveSpecification,
      }))
      console.log(`  🕐 TTL enabled on ${TableName}`)
    }
  }

  console.log('\n✅ All DynamoDB tables ready!\n')
  console.log('Next step: Run setup-cognito.js\n')
}

main().catch((err) => {
  console.error('❌ Setup failed:', err)
  process.exit(1)
})
