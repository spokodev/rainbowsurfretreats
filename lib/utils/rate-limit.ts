/**
 * Simple in-memory rate limiter for API routes
 *
 * Note: This is suitable for single-server deployments.
 * For production with multiple instances, use Redis-based rate limiting
 * (e.g., Upstash Redis or similar)
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store rate limit data per IP (in-memory, resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export interface RateLimitConfig {
  /** Identifier for this rate limit (e.g., 'newsletter', 'checkout') */
  id: string
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSec: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when limit resets
}

/**
 * Check rate limit for an identifier (typically IP + route)
 *
 * @param identifier - Unique identifier (e.g., IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.id}:${identifier}`
  const now = Date.now()
  const windowMs = config.windowSec * 1000

  let entry = rateLimitStore.get(key)

  // Create new entry if none exists or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.limit - entry.count)
  const success = entry.count <= config.limit

  return {
    success,
    limit: config.limit,
    remaining,
    reset: Math.ceil(entry.resetTime / 1000),
  }
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for real IP (behind proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to a generic identifier
  return 'unknown'
}

// Common rate limit presets
export const rateLimitPresets = {
  /** For login/auth endpoints - strict: 5 requests per minute */
  auth: { id: 'auth', limit: 5, windowSec: 60 } as RateLimitConfig,

  /** For newsletter subscription - moderate: 3 requests per minute */
  newsletter: { id: 'newsletter', limit: 3, windowSec: 60 } as RateLimitConfig,

  /** For checkout - moderate: 10 requests per minute */
  checkout: { id: 'checkout', limit: 10, windowSec: 60 } as RateLimitConfig,

  /** For contact form - moderate: 5 requests per minute */
  contact: { id: 'contact', limit: 5, windowSec: 60 } as RateLimitConfig,

  /** For general API - lenient: 60 requests per minute */
  api: { id: 'api', limit: 60, windowSec: 60 } as RateLimitConfig,

  /** For webhooks - very lenient: 100 requests per minute */
  webhook: { id: 'webhook', limit: 100, windowSec: 60 } as RateLimitConfig,

  /** For waitlist - moderate: 5 requests per hour */
  waitlist: { id: 'waitlist', limit: 5, windowSec: 3600 } as RateLimitConfig,
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}
