#!/usr/bin/env node

/**
 * CineNexa — S3 + CloudFront Setup Script
 * Run: node setup-s3.js
 *
 * Creates:
 *   1. S3 bucket for static site hosting (cinenexa-frontend)
 *   2. S3 bucket for media assets (cinenexa-media)
 *   3. CloudFront distribution for the frontend bucket
 */

const {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  HeadBucketCommand,
  PutCORSConfigurationCommand,
  PutBucketTaggingCommand,
} = require('@aws-sdk/client-s3')

const {
  CloudFrontClient,
  CreateDistributionCommand,
  ListDistributionsCommand,
} = require('@aws-sdk/client-cloudfront')

const REGION              = process.env.AWS_REGION || 'us-east-1'
const FRONTEND_BUCKET     = `cinenexa-frontend-${Date.now()}`  // must be globally unique
const MEDIA_BUCKET        = `cinenexa-media-${Date.now()}`
const s3Client            = new S3Client({ region: REGION })
const cfClient            = new CloudFrontClient({ region: 'us-east-1' }) // CF is global, always us-east-1

async function bucketExists(bucketName) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
    return true
  } catch {
    return false
  }
}

async function createFrontendBucket(bucketName) {
  console.log(`📦 Creating frontend S3 bucket: ${bucketName}`)

  await s3Client.send(new CreateBucketCommand({
    Bucket: bucketName,
    ...(REGION !== 'us-east-1' && {
      CreateBucketConfiguration: { LocationConstraint: REGION },
    }),
  }))

  // Block all public access (CloudFront OAC will handle access)
  await s3Client.send(new PutPublicAccessBlockCommand({
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls:       true,
      IgnorePublicAcls:      true,
      BlockPublicPolicy:     true,
      RestrictPublicBuckets: true,
    },
  }))

  // Tags
  await s3Client.send(new PutBucketTaggingCommand({
    Bucket: bucketName,
    Tagging: { TagSet: [{ Key: 'Project', Value: 'CineNexa' }, { Key: 'Purpose', Value: 'Frontend' }] },
  }))

  console.log(`✅ Frontend bucket created: ${bucketName}`)
  return bucketName
}

async function createMediaBucket(bucketName) {
  console.log(`\n📦 Creating media S3 bucket: ${bucketName}`)

  await s3Client.send(new CreateBucketCommand({
    Bucket: bucketName,
    ...(REGION !== 'us-east-1' && {
      CreateBucketConfiguration: { LocationConstraint: REGION },
    }),
  }))

  // Block public access
  await s3Client.send(new PutPublicAccessBlockCommand({
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls:       true,
      IgnorePublicAcls:      true,
      BlockPublicPolicy:     true,
      RestrictPublicBuckets: true,
    },
  }))

  // CORS for media access from frontend
  await s3Client.send(new PutCORSConfigurationCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'],   // tighten to your domain in production
          ExposeHeaders:  ['ETag'],
          MaxAgeSeconds:  3600,
        },
      ],
    },
  }))

  // Tags
  await s3Client.send(new PutBucketTaggingCommand({
    Bucket: bucketName,
    Tagging: { TagSet: [{ Key: 'Project', Value: 'CineNexa' }, { Key: 'Purpose', Value: 'Media' }] },
  }))

  console.log(`✅ Media bucket created: ${bucketName}`)
  return bucketName
}

async function createCloudFrontDistribution(frontendBucket) {
  console.log('\n🌐 Creating CloudFront distribution...')
  console.log('   (This may take 5–15 minutes to fully deploy)')

  const originId = `S3-${frontendBucket}`

  const result = await cfClient.send(new CreateDistributionCommand({
    DistributionConfig: {
      CallerReference: `cinenexa-${Date.now()}`,
      Comment:         'CineNexa Frontend Distribution',
      Enabled:         true,
      HttpVersion:     'http2',
      IsIPV6Enabled:   true,
      PriceClass:      'PriceClass_100', // US, Canada, Europe only (cheapest)

      DefaultRootObject: 'index.html',

      Origins: {
        Quantity: 1,
        Items: [
          {
            Id:         originId,
            DomainName: `${frontendBucket}.s3.${REGION}.amazonaws.com`,
            S3OriginConfig: {
              OriginAccessIdentity: '', // Using OAC instead of OAI (newer/recommended)
            },
          },
        ],
      },

      DefaultCacheBehavior: {
        TargetOriginId:       originId,
        ViewerProtocolPolicy: 'redirect-to-https',
        Compress:             true,
        AllowedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
          CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
        },
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // CachingOptimized managed policy
        ForwardedValues: {
          QueryString: false,
          Cookies:     { Forward: 'none' },
        },
        MinTTL:     0,
        DefaultTTL: 86400,
        MaxTTL:     31536000,
      },

      // SPA: serve index.html for all 404s (React Router)
      CustomErrorResponses: {
        Quantity: 2,
        Items: [
          { ErrorCode: 403, ResponseCode: '200', ResponsePagePath: '/index.html', ErrorCachingMinTTL: 0 },
          { ErrorCode: 404, ResponseCode: '200', ResponsePagePath: '/index.html', ErrorCachingMinTTL: 0 },
        ],
      },

      // Geo restriction: none
      Restrictions: {
        GeoRestriction: { RestrictionType: 'none', Quantity: 0 },
      },

      ViewerCertificate: {
        CloudFrontDefaultCertificate: true, // use *.cloudfront.net domain
      },
    },
  }))

  const distribution = result.Distribution
  console.log(`✅ CloudFront distribution created!`)
  console.log(`   Distribution ID:  ${distribution.Id}`)
  console.log(`   Domain:           https://${distribution.DomainName}`)

  return distribution
}

async function main() {
  console.log('\n🎬 CineNexa — S3 + CloudFront Setup')
  console.log(`📍 Region: ${REGION}\n`)

  const frontendBucket = await createFrontendBucket(FRONTEND_BUCKET)
  const mediaBucket    = await createMediaBucket(MEDIA_BUCKET)
  const distribution   = await createCloudFrontDistribution(frontendBucket)

  console.log('\n' + '='.repeat(60))
  console.log('📋 Add these to your .env file:')
  console.log('='.repeat(60))
  console.log(`VITE_CLOUDFRONT_URL=https://${distribution.DomainName}`)
  console.log(`VITE_S3_BUCKET_NAME=${frontendBucket}`)
  console.log(`MEDIA_BUCKET_NAME=${mediaBucket}`)
  console.log('='.repeat(60))

  console.log('\n📋 Deployment command (after npm run build):')
  console.log(`   aws s3 sync dist/ s3://${frontendBucket} --delete`)
  console.log(`   aws cloudfront create-invalidation --distribution-id ${distribution.Id} --paths "/*"`)

  console.log('\n⚠️  Manual step required:')
  console.log('   CloudFront → Origins → Edit → Change to OAC (Origin Access Control)')
  console.log('   and add the generated S3 bucket policy\n')

  console.log('✅ S3 + CloudFront setup complete!\n')
  console.log('Next step: Run setup-apigateway.js\n')
}

main().catch((err) => {
  console.error('❌ S3 setup failed:', err)
  process.exit(1)
})
