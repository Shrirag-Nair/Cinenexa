#!/usr/bin/env node

/**
 * CineNexa — Cognito User Pool Setup Script
 * Run: node setup-cognito.js
 *
 * Creates:
 *   1. Cognito User Pool  (cinenexa-users)
 *   2. User Pool Client   (cinenexa-web-client)
 *   3. Outputs IDs to .env format
 */

const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  DescribeUserPoolCommand,
  ListUserPoolsCommand,
} = require('@aws-sdk/client-cognito-identity-provider')

const REGION      = process.env.AWS_REGION || 'us-east-1'
const POOL_NAME   = 'cinenexa-users'
const CLIENT_NAME = 'cinenexa-web-client'
const client      = new CognitoIdentityProviderClient({ region: REGION })

async function main() {
  console.log('\n🎬 CineNexa — Cognito Setup')
  console.log(`📍 Region: ${REGION}\n`)

  // ── Check if pool already exists ─────────────────────────────────────────
  const listResult = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }))
  const existing   = listResult.UserPools.find((p) => p.Name === POOL_NAME)

  let userPoolId

  if (existing) {
    console.log(`⚠️  User Pool "${POOL_NAME}" already exists: ${existing.Id}`)
    userPoolId = existing.Id
  } else {
    // ── Create User Pool ────────────────────────────────────────────────────
    console.log(`📦 Creating User Pool: ${POOL_NAME}...`)

    const poolResult = await client.send(new CreateUserPoolCommand({
      PoolName: POOL_NAME,

      // Email as primary identifier
      UsernameAttributes:       ['email'],
      AutoVerifiedAttributes:   ['email'],
      UsernameConfiguration:    { CaseSensitive: false },

      // Password policy
      Policies: {
        PasswordPolicy: {
          MinimumLength:                 8,
          RequireUppercase:              false,
          RequireLowercase:              false,
          RequireNumbers:                false,
          RequireSymbols:                false,
          TemporaryPasswordValidityDays: 7,
        },
      },

      // Required attributes
      Schema: [
        {
          Name:     'email',
          Required: true,
          Mutable:  false,
          AttributeDataType: 'String',
          StringAttributeConstraints: { MinLength: '5', MaxLength: '256' },
        },
        {
          Name:     'name',
          Required: false,
          Mutable:  true,
          AttributeDataType: 'String',
          StringAttributeConstraints: { MinLength: '1', MaxLength: '100' },
        },
      ],

      // Email verification (code)
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_CODE',
        EmailSubject:       'CineNexa — Verify your email',
        EmailMessage:       'Your CineNexa verification code is {####}. It expires in 24 hours.',
      },

      // Account recovery via email
      AccountRecoverySetting: {
        RecoveryMechanisms: [
          { Priority: 1, Name: 'verified_email' },
        ],
      },

      // MFA: optional (off by default)
      MfaConfiguration: 'OFF',

      // Email configuration (uses Cognito built-in for free tier)
      EmailConfiguration: {
        EmailSendingAccount: 'COGNITO_DEFAULT',
      },

      // Deletion protection
      DeletionProtection: 'INACTIVE', // set to ACTIVE in production

      UserPoolTags: { Project: 'CineNexa' },
    }))

    userPoolId = poolResult.UserPool.Id
    console.log(`✅ User Pool created: ${userPoolId}`)
  }

  // ── Create App Client ───────────────────────────────────────────────────────
  console.log(`\n📦 Creating App Client: ${CLIENT_NAME}...`)

  const clientResult = await client.send(new CreateUserPoolClientCommand({
    UserPoolId:  userPoolId,
    ClientName:  CLIENT_NAME,

    // No client secret for browser-based apps
    GenerateSecret: false,

    // Auth flows
    ExplicitAuthFlows: [
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
    ],

    // Token validity
    AccessTokenValidity:  1,    // 1 hour
    IdTokenValidity:      1,    // 1 hour
    RefreshTokenValidity: 30,   // 30 days
    TokenValidityUnits: {
      AccessToken:  'hours',
      IdToken:      'hours',
      RefreshToken: 'days',
    },

    // Prevent user existence errors leaking
    PreventUserExistenceErrors: 'ENABLED',

    // Readable attributes
    ReadAttributes:  ['email', 'name', 'sub', 'email_verified'],
    WriteAttributes: ['email', 'name'],
  }))

  const appClientId = clientResult.UserPoolClient.ClientId
  console.log(`✅ App Client created: ${appClientId}`)

  // ── Output ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('📋 Add these to your frontend .env file:')
  console.log('='.repeat(60))
  console.log(`VITE_COGNITO_USER_POOL_ID=${userPoolId}`)
  console.log(`VITE_COGNITO_CLIENT_ID=${appClientId}`)
  console.log('='.repeat(60))

  console.log('\n📋 Add these to your Lambda environment variables:')
  console.log('='.repeat(60))
  console.log(`COGNITO_USER_POOL_ID=${userPoolId}`)
  console.log(`COGNITO_CLIENT_ID=${appClientId}`)
  console.log('='.repeat(60))

  console.log('\n⚠️  Manual step required:')
  console.log('   In the AWS Console → Cognito → User Pool → Triggers')
  console.log('   Set "Post confirmation" trigger → cinenexa-auth Lambda')
  console.log('\n✅ Cognito setup complete!\n')
  console.log('Next step: Run setup-s3.js\n')
}

main().catch((err) => {
  console.error('❌ Cognito setup failed:', err)
  process.exit(1)
})
