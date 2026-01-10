/**
 * Locale-aware formatting utilities
 * BUG-016 FIX: Centralized formatting with proper locale support
 */

/**
 * Format a price with the given locale and currency
 */
export function formatPrice(
  amount: number,
  locale: string,
  currency: string = 'EUR',
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(amount)
}

/**
 * Format a date with the given locale
 */
export function formatDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, options)
}

/**
 * Format a date range (e.g., "January 15 - January 22, 2026")
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: string
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  const dayMonthOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }

  return `${start.toLocaleDateString(locale, dayMonthOptions)} - ${end.toLocaleDateString(locale, dayMonthOptions)}, ${end.toLocaleDateString(locale, yearOptions)}`
}

/**
 * Format a number with the given locale
 */
export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/**
 * Format a percentage with the given locale
 */
export function formatPercent(
  value: number,
  locale: string,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(value)
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string,
  now: Date = new Date()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const diffMs = dateObj.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.round(diffMs / (1000 * 60))

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day')
  } else if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour')
  } else {
    return rtf.format(diffMinutes, 'minute')
  }
}

/**
 * Supported locales for the application
 */
export const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr', 'nl'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

/**
 * Default locale
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en'
