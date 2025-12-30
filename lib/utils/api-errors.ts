import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/lib/types/database'

/**
 * Standard error responses that don't leak internal details
 * Always log detailed errors server-side, return generic messages to clients
 */

export function handleApiError(error: unknown, context: string): NextResponse<ApiResponse<null>> {
  // Log detailed error server-side
  console.error(`[${context}] Error:`, error)

  // Return generic message to client
  return NextResponse.json<ApiResponse<null>>(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

export function handleDatabaseError(
  error: { code?: string; message?: string } | null,
  context: string,
  customMessages?: Record<string, string>
): NextResponse<ApiResponse<null>> | null {
  if (!error) return null

  // Log detailed error server-side
  console.error(`[${context}] Database error:`, error.code, error.message)

  // Check for specific error codes with custom messages
  if (customMessages && error.code && customMessages[error.code]) {
    return NextResponse.json<ApiResponse<null>>(
      { error: customMessages[error.code] },
      { status: 400 }
    )
  }

  // Standard error code mappings
  const errorMappings: Record<string, { message: string; status: number }> = {
    'PGRST116': { message: 'Resource not found', status: 404 },
    '23505': { message: 'A record with this information already exists', status: 409 },
    '23503': { message: 'Cannot complete operation due to related records', status: 400 },
    '23502': { message: 'Required information is missing', status: 400 },
    '42501': { message: 'You do not have permission to perform this action', status: 403 },
  }

  const mapping = error.code ? errorMappings[error.code] : null

  if (mapping) {
    return NextResponse.json<ApiResponse<null>>(
      { error: mapping.message },
      { status: mapping.status }
    )
  }

  // Generic error for unknown cases
  return NextResponse.json<ApiResponse<null>>(
    { error: 'An error occurred while processing your request' },
    { status: 500 }
  )
}

/**
 * Standard success response
 */
export function apiSuccess<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({
    data,
    ...(message && { message }),
  })
}

/**
 * Standard error response (for validation, auth, etc.)
 */
export function apiError(message: string, status: number = 400): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    { error: message },
    { status }
  )
}

/**
 * Unauthorized response
 */
export function unauthorized(): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

/**
 * Forbidden response
 */
export function forbidden(): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    { error: 'Forbidden' },
    { status: 403 }
  )
}

/**
 * Not found response
 */
export function notFound(resource: string = 'Resource'): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    { error: `${resource} not found` },
    { status: 404 }
  )
}
