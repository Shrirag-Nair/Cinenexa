'use strict'

/**
 * Auth Lambda — Cognito Triggers
 *
 * This Lambda handles Cognito User Pool triggers:
 *   - PostConfirmation_ConfirmSignUp  → create user profile in DynamoDB
 *   - PreSignUp_SignUp                → custom validation (optional)
 *
 * It is NOT a REST API handler. It is invoked directly by Cognito.
 */

const {
  ddb, PutCommand, GetCommand, UpdateCommand,
} = require('/opt/nodejs/utils')

const USERS_TABLE = process.env.USERS_TABLE || 'cinenexa-users'

exports.handler = async (event) => {
  console.log('Auth trigger event:', JSON.stringify(event, null, 2))

  const triggerSource = event.triggerSource

  try {
    // ── Post Confirmation: user verified email → create profile ──────────────
    if (triggerSource === 'PostConfirmation_ConfirmSignUp') {
      await createUserProfile(event)
    }

    // ── Pre Sign-Up: optional validation ─────────────────────────────────────
    if (triggerSource === 'PreSignUp_SignUp') {
      // Auto-confirm for simplicity (remove in production if email verification needed)
      // event.response.autoConfirmUser = true
    }

    // IMPORTANT: always return the event back to Cognito
    return event
  } catch (err) {
    console.error('Auth trigger error:', err)
    // Returning the event still lets the signup succeed even if profile creation fails
    return event
  }
}

async function createUserProfile(event) {
  const { sub, email, name } = event.request.userAttributes
  const userId = sub

  // Check if profile already exists (avoid duplicates on re-confirm)
  const existing = await ddb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }))
  if (existing.Item) return

  const now = new Date().toISOString()

  await ddb.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: {
      userId,
      email,
      name:        name || email.split('@')[0],
      avatarUrl:   null,
      bio:         '',
      preferences: {
        genres:    [],
        language:  'en',
        darkMode:  true,
      },
      plan:        'free',
      createdAt:   now,
      updatedAt:   now,
    },
    ConditionExpression: 'attribute_not_exists(userId)',
  })).catch((e) => {
    if (e.name !== 'ConditionalCheckFailedException') throw e
  })

  console.log(`Created profile for user ${userId} (${email})`)
}
