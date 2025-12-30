/**
 * Escape HTML special characters to prevent XSS attacks
 * Should be used whenever inserting user input into HTML context
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Escape HTML for attribute values (more restrictive)
 */
export function escapeHtmlAttr(unsafe: string | null | undefined): string {
  if (!unsafe) return ''

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;')
}
