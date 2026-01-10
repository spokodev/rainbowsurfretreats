import crypto from 'crypto'

const FEEDBACK_SECRET = process.env.FEEDBACK_TOKEN_SECRET || process.env.CRON_SECRET || 'default-dev-secret'

/**
 * Generate a secure feedback token for a booking
 * Uses HMAC-SHA256 to sign the booking ID
 */
export function generateFeedbackToken(bookingId: string): string {
  const hmac = crypto.createHmac('sha256', FEEDBACK_SECRET)
  hmac.update(bookingId)
  return hmac.digest('hex')
}

/**
 * Verify a feedback token for a booking
 * Returns true if the token is valid for the given booking ID
 */
export function verifyFeedbackToken(bookingId: string, token: string): boolean {
  if (!bookingId || !token) {
    return false
  }

  const expectedToken = generateFeedbackToken(bookingId)

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  } catch {
    // If tokens have different lengths or invalid hex, they don't match
    return false
  }
}

/**
 * Generate a feedback URL with token for a booking
 */
export function generateFeedbackUrl(bookingId: string, siteUrl: string): string {
  const token = generateFeedbackToken(bookingId)
  return `${siteUrl}/feedback?booking=${bookingId}&token=${token}`
}
