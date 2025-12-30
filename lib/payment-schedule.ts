/**
 * Payment Schedule Logic for Rainbow Surf Retreats
 *
 * Standard Flow (booking > 2 months before retreat):
 * - Payment 1: deposit % immediately (from settings, default 30%)
 * - Payment 2: remaining balance 1 month before retreat
 *
 * Late Booking Flow (booking < 2 months before retreat):
 * - Payment 1: 50% immediately
 * - Payment 2: 50% 2 weeks before retreat
 *
 * Early Bird: 10% discount on final payment only
 */

export interface PaymentScheduleItem {
  paymentNumber: number
  amount: number
  dueDate: Date
  description: string
  type: 'deposit' | 'second' | 'balance' | 'late_first' | 'late_second'
  percentage: number
}

export interface PaymentScheduleResult {
  isLateBooking: boolean
  isEarlyBird: boolean
  totalAmount: number
  earlyBirdDiscount: number
  schedules: PaymentScheduleItem[]
}

export interface CalculateScheduleOptions {
  totalPrice: number
  bookingDate: Date
  retreatStartDate: Date
  isEarlyBird?: boolean
  earlyBirdDiscountPercent?: number // Default 10%
  depositPercent?: number // From settings, default 30%
}

/**
 * Calculate the number of months between two dates
 * Accounts for day of month to avoid edge cases like Jan 31 to Feb 28
 */
function monthsBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
  // Adjust if day of month makes it less than a full month
  return d2.getDate() < d1.getDate() ? months - 1 : months
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Subtract days from a date
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

/**
 * Round to 2 decimal places
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate payment schedule based on booking date and retreat date
 */
export function calculatePaymentSchedule(
  options: CalculateScheduleOptions
): PaymentScheduleResult {
  const {
    totalPrice,
    bookingDate,
    retreatStartDate,
    isEarlyBird = false,
    earlyBirdDiscountPercent = 10,
    depositPercent = 30, // From settings
  } = options

  const monthsUntilRetreat = monthsBetween(bookingDate, retreatStartDate)
  const isLateBooking = monthsUntilRetreat < 2

  // Calculate early bird discount (only on final payment)
  let earlyBirdDiscount = 0
  let adjustedTotal = totalPrice

  if (isEarlyBird && !isLateBooking) {
    // Early bird discount is 10% of total price, applied to final payment
    earlyBirdDiscount = roundCurrency(totalPrice * (earlyBirdDiscountPercent / 100))
    adjustedTotal = roundCurrency(totalPrice - earlyBirdDiscount)
  }

  const schedules: PaymentScheduleItem[] = []

  if (isLateBooking) {
    // Late booking: 50% / 50%
    const firstPayment = roundCurrency(adjustedTotal * 0.5)
    const secondPayment = roundCurrency(adjustedTotal - firstPayment)

    schedules.push({
      paymentNumber: 1,
      amount: firstPayment,
      dueDate: bookingDate,
      description: 'First payment (50%)',
      type: 'late_first',
      percentage: 50,
    })

    schedules.push({
      paymentNumber: 2,
      amount: secondPayment,
      dueDate: subtractDays(retreatStartDate, 14), // 2 weeks before
      description: 'Final payment (50%)',
      type: 'late_second',
      percentage: 50,
    })
  } else {
    // Standard booking: deposit% now / balance 1 month before retreat
    const depositFraction = depositPercent / 100
    const balancePercent = 100 - depositPercent
    const depositAmount = roundCurrency(totalPrice * depositFraction)
    // Balance includes early bird discount
    const balanceAmount = roundCurrency(adjustedTotal - depositAmount)

    schedules.push({
      paymentNumber: 1,
      amount: depositAmount,
      dueDate: bookingDate,
      description: `Deposit (${depositPercent}%)`,
      type: 'deposit',
      percentage: depositPercent,
    })

    const balanceDescription = isEarlyBird
      ? `Balance (${balancePercent}%) - Early Bird discount: €${earlyBirdDiscount}`
      : `Balance (${balancePercent}%)`

    schedules.push({
      paymentNumber: 2,
      amount: balanceAmount,
      dueDate: subtractDays(retreatStartDate, 30), // 1 month before
      description: balanceDescription,
      type: 'balance',
      percentage: balancePercent,
    })
  }

  return {
    isLateBooking,
    isEarlyBird: isEarlyBird && !isLateBooking,
    totalAmount: adjustedTotal,
    earlyBirdDiscount,
    schedules,
  }
}

/**
 * Get the first payment amount (for checkout)
 */
export function getFirstPaymentAmount(
  totalPrice: number,
  bookingDate: Date,
  retreatStartDate: Date,
  depositPercent: number = 30
): number {
  const monthsUntilRetreat = monthsBetween(bookingDate, retreatStartDate)
  const isLateBooking = monthsUntilRetreat < 2

  if (isLateBooking) {
    return roundCurrency(totalPrice * 0.5)
  }

  return roundCurrency(totalPrice * (depositPercent / 100))
}

/**
 * Check if booking qualifies for early bird discount
 * Early bird is typically available when booking more than 3 months in advance
 */
export function isEligibleForEarlyBird(
  bookingDate: Date,
  retreatStartDate: Date,
  earlyBirdCutoffMonths: number = 3
): boolean {
  const monthsUntilRetreat = monthsBetween(bookingDate, retreatStartDate)
  return monthsUntilRetreat >= earlyBirdCutoffMonths
}

/**
 * Format payment schedule for display
 */
export function formatPaymentScheduleForEmail(
  schedule: PaymentScheduleResult
): string {
  const lines = ['Payment Schedule:', '']

  schedule.schedules.forEach((item, index) => {
    const date = item.dueDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const status = index === 0 ? '(Due Now)' : ''
    lines.push(`${item.paymentNumber}. ${item.description}: €${item.amount} - ${date} ${status}`)
  })

  if (schedule.isEarlyBird) {
    lines.push('')
    lines.push(`Early Bird Discount Applied: -€${schedule.earlyBirdDiscount}`)
  }

  lines.push('')
  lines.push(`Total: €${schedule.totalAmount}`)

  return lines.join('\n')
}

/**
 * Determine payment deadline status
 */
export type PaymentDeadlineStatus =
  | 'upcoming'      // > 7 days
  | 'due_soon'      // 3-7 days
  | 'due_very_soon' // 1-3 days
  | 'due_today'     // today
  | 'overdue'       // past due

export function getPaymentDeadlineStatus(dueDate: Date): PaymentDeadlineStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'due_today'
  if (diffDays <= 3) return 'due_very_soon'
  if (diffDays <= 7) return 'due_soon'
  return 'upcoming'
}

/**
 * Check if we should send a reminder for a payment
 */
export function shouldSendReminder(
  dueDate: Date,
  lastReminderSent: Date | null
): boolean {
  const status = getPaymentDeadlineStatus(dueDate)

  // Always remind if overdue or due today (if not reminded today)
  if (status === 'overdue' || status === 'due_today') {
    if (!lastReminderSent) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastReminder = new Date(lastReminderSent)
    lastReminder.setHours(0, 0, 0, 0)
    return today.getTime() > lastReminder.getTime()
  }

  // Remind at 7 days, 3 days, 1 day before
  if (status === 'due_soon' && !lastReminderSent) return true
  if (status === 'due_very_soon') {
    const daysUntil = Math.ceil(
      (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    // Remind at 3 days and 1 day
    if (daysUntil === 3 || daysUntil === 1) {
      if (!lastReminderSent) return true
      const daysSinceReminder = Math.floor(
        (new Date().getTime() - lastReminderSent.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceReminder >= 1
    }
  }

  return false
}
