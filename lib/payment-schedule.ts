/**
 * Payment Schedule Logic for Rainbow Surf Retreats
 *
 * Standard Flow (booking >= 2 months before retreat) - 3 payments:
 * - Payment 1: 10% deposit immediately
 * - Payment 2: 50% 2 months before retreat
 * - Payment 3: 40% 1 month before retreat
 *
 * Late Booking Flow (booking < 2 months before retreat) - 2 payments:
 * - Payment 1: 50% immediately
 * - Payment 2: 50% 1 month before retreat
 *
 * Full Payment: 100% immediately (1 payment)
 *
 * Early Bird: 10% discount on total amount (applied when booking >3 months before)
 */

export interface PaymentScheduleItem {
  paymentNumber: number
  amount: number
  dueDate: Date
  description: string
  type: 'deposit' | 'second' | 'balance' | 'late_first' | 'late_second' | 'full'
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
  paymentType?: 'deposit' | 'full' // 'deposit' creates scheduled payments, 'full' is single payment
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
 * Subtract months from a date
 */
function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() - months)
  return result
}

/**
 * Calculate payment schedule based on booking date and retreat date
 *
 * Standard (>=2 months): 10% now, 50% at 2 months before, 40% at 1 month before
 * Late (<2 months): 50% now, 50% at 1 month before
 * Full: 100% now
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
    paymentType = 'deposit',
  } = options

  const monthsUntilRetreat = monthsBetween(bookingDate, retreatStartDate)
  const isLateBooking = monthsUntilRetreat < 2

  // Calculate early bird discount (applied to total amount)
  let earlyBirdDiscount = 0
  let adjustedTotal = totalPrice

  if (isEarlyBird && !isLateBooking) {
    earlyBirdDiscount = roundCurrency(totalPrice * (earlyBirdDiscountPercent / 100))
    adjustedTotal = roundCurrency(totalPrice - earlyBirdDiscount)
  }

  const schedules: PaymentScheduleItem[] = []

  // Full payment - single payment
  if (paymentType === 'full') {
    schedules.push({
      paymentNumber: 1,
      amount: adjustedTotal,
      dueDate: bookingDate,
      description: isEarlyBird
        ? `Full payment (100%) - Early Bird discount: €${earlyBirdDiscount}`
        : 'Full payment (100%)',
      type: 'full',
      percentage: 100,
    })

    return {
      isLateBooking: false,
      isEarlyBird,
      totalAmount: adjustedTotal,
      earlyBirdDiscount,
      schedules,
    }
  }

  if (isLateBooking) {
    // Late booking: 50% now, 50% 1 month before retreat
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
      dueDate: subtractMonths(retreatStartDate, 1), // 1 month before retreat
      description: 'Final payment (50%)',
      type: 'late_second',
      percentage: 50,
    })
  } else {
    // Standard booking: 10% now, 50% 2 months before, 40% 1 month before
    const depositAmount = roundCurrency(adjustedTotal * 0.10) // 10%
    const secondPayment = roundCurrency(adjustedTotal * 0.50) // 50%
    const balanceAmount = roundCurrency(adjustedTotal - depositAmount - secondPayment) // 40%

    schedules.push({
      paymentNumber: 1,
      amount: depositAmount,
      dueDate: bookingDate,
      description: isEarlyBird
        ? `Deposit (10%) - Early Bird discount: €${earlyBirdDiscount} applied`
        : 'Deposit (10%)',
      type: 'deposit',
      percentage: 10,
    })

    schedules.push({
      paymentNumber: 2,
      amount: secondPayment,
      dueDate: subtractMonths(retreatStartDate, 2), // 2 months before retreat
      description: 'Second payment (50%)',
      type: 'second',
      percentage: 50,
    })

    schedules.push({
      paymentNumber: 3,
      amount: balanceAmount,
      dueDate: subtractMonths(retreatStartDate, 1), // 1 month before retreat
      description: 'Final payment (40%)',
      type: 'balance',
      percentage: 40,
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
 * Standard: 10% deposit
 * Late booking: 50%
 * Full: 100%
 */
export function getFirstPaymentAmount(
  totalPrice: number,
  bookingDate: Date,
  retreatStartDate: Date,
  paymentType: 'deposit' | 'full' = 'deposit'
): number {
  if (paymentType === 'full') {
    return totalPrice
  }

  const monthsUntilRetreat = monthsBetween(bookingDate, retreatStartDate)
  const isLateBooking = monthsUntilRetreat < 2

  if (isLateBooking) {
    return roundCurrency(totalPrice * 0.5) // 50% for late booking
  }

  return roundCurrency(totalPrice * 0.10) // 10% deposit for standard
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
  | 'upcoming'         // > 14 days
  | 'due_2_weeks'      // 14 days
  | 'due_1_week'       // 7 days
  | 'due_3_days'       // 3 days
  | 'due_1_day'        // 1 day
  | 'due_today'        // today
  | 'overdue'          // past due

export function getPaymentDeadlineStatus(dueDate: Date): PaymentDeadlineStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'due_today'
  if (diffDays === 1) return 'due_1_day'
  if (diffDays === 3) return 'due_3_days'
  if (diffDays === 7) return 'due_1_week'
  if (diffDays === 14) return 'due_2_weeks'
  return 'upcoming'
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(dueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Payment reminder schedule:
 * - 14 days before: Early reminder
 * - 7 days before: Standard reminder
 * - 3 days before: Reminder
 * - 1 day before: Urgent reminder
 * - Due today: Final reminder
 * - Overdue: Daily reminders
 */
export type ReminderType = '14_days' | '7_days' | '3_days' | '1_day' | 'today' | 'overdue'

/**
 * Check if we should send a reminder for a payment
 * Returns the reminder type if a reminder should be sent, null otherwise
 */
export function shouldSendReminder(
  dueDate: Date,
  lastReminderSent: Date | null
): ReminderType | null {
  const daysUntil = getDaysUntilDue(dueDate)

  // Helper to check if we already reminded today
  const alreadyRemindedToday = (): boolean => {
    if (!lastReminderSent) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastReminder = new Date(lastReminderSent)
    lastReminder.setHours(0, 0, 0, 0)
    return today.getTime() <= lastReminder.getTime()
  }

  // Overdue - remind daily if not reminded today
  if (daysUntil < 0) {
    return alreadyRemindedToday() ? null : 'overdue'
  }

  // Due today
  if (daysUntil === 0) {
    return alreadyRemindedToday() ? null : 'today'
  }

  // Reminder days: 14, 7, 3, 1
  const reminderDays: { days: number; type: ReminderType }[] = [
    { days: 14, type: '14_days' },
    { days: 7, type: '7_days' },
    { days: 3, type: '3_days' },
    { days: 1, type: '1_day' },
  ]

  for (const { days, type } of reminderDays) {
    if (daysUntil === days) {
      return alreadyRemindedToday() ? null : type
    }
  }

  return null
}

/**
 * Legacy function for backward compatibility
 * Returns boolean instead of reminder type
 */
export function shouldSendReminderBool(
  dueDate: Date,
  lastReminderSent: Date | null
): boolean {
  return shouldSendReminder(dueDate, lastReminderSent) !== null
}
