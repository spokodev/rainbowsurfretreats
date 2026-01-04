import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { sendPaymentReminder, sendPreRetreatReminder, sendDeadlineReminder } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET not configured - rejecting request')
    return false
  }
  return authHeader === `Bearer ${cronSecret}`
}

// GET /api/cron/send-reminders - Send payment, deadline, and pre-retreat reminders
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results = {
    paymentReminders: { sent: 0, errors: 0 },
    deadlineReminders: { sent: 0, errors: 0 },
    preRetreatReminders: { sent: 0, errors: 0 },
  }

  console.log(`[Reminders] Running reminder cron for ${today.toISOString().split('T')[0]}`)

  // =====================
  // 1. PAYMENT REMINDERS (for pending payments with upcoming due dates)
  // =====================
  try {
    // Find pending payments with upcoming due dates
    const { data: pendingPayments, error: fetchError } = await supabase
      .from('payment_schedules')
      .select(`
        *,
        booking:bookings!inner(
          id,
          booking_number,
          first_name,
          last_name,
          email,
          status,
          language,
          access_token,
          stripe_customer_id,
          retreat:retreats!inner(
            destination,
            start_date,
            end_date
          )
        )
      `)
      .eq('status', 'pending')
      .gt('payment_number', 1) // Skip first payment (already paid)
      .order('due_date', { ascending: true })

    if (fetchError) {
      console.error('[Reminders] Error fetching payments:', fetchError)
    } else if (pendingPayments) {
      for (const payment of pendingPayments) {
        const booking = payment.booking as {
          id: string
          booking_number: string
          first_name: string
          last_name: string
          email: string
          status: string
          language: string
          access_token: string | null
          stripe_customer_id: string | null
          retreat: {
            destination: string
            start_date: string
            end_date: string
          }
        }

        // Skip cancelled bookings
        if (booking.status === 'cancelled') continue

        const dueDate = new Date(payment.due_date)
        dueDate.setHours(0, 0, 0, 0)

        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const retreatStartDate = new Date(booking.retreat.start_date)
        const daysUntilRetreat = Math.ceil((retreatStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Determine urgency level - matching sendPaymentReminder supported values
        let urgency: 'week' | 'days' | 'tomorrow' | 'today' | 'overdue' | null = null

        if (daysUntilDue < 0) {
          urgency = 'overdue'
        } else if (daysUntilDue === 0) {
          urgency = 'today'
        } else if (daysUntilDue === 1) {
          urgency = 'tomorrow'
        } else if (daysUntilDue === 3) {
          urgency = 'days'
        } else if (daysUntilDue === 7) {
          urgency = 'week'
        }
        // Note: 14-day reminders not sent for payment reminders (use deadline reminders for failed payments)

        // Send reminder if applicable
        if (urgency) {
          try {
            const bookingLanguage = booking.language || 'en'
            const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                               bookingLanguage === 'es' ? 'es-ES' :
                               bookingLanguage === 'fr' ? 'fr-FR' :
                               bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
            const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

            // Generate early payment URL if booking has access_token
            const payNowUrl = booking.access_token
              ? `${SITE_URL}/api/payments/${payment.id}/checkout?token=${booking.access_token}`
              : undefined

            await sendPaymentReminder(
              {
                bookingNumber: booking.booking_number,
                firstName: booking.first_name,
                lastName: booking.last_name,
                email: booking.email,
                retreatDestination: booking.retreat.destination,
                retreatDates,
                retreatStartDate: booking.retreat.start_date,
                daysUntilRetreat,
                amount: payment.amount,
                dueDate: payment.due_date,
                paymentNumber: payment.payment_number,
                language: bookingLanguage,
                payNowUrl,
                paymentScheduleId: payment.id,
              },
              urgency
            )

            console.log(`[Reminders] Payment reminder sent to ${booking.email} (${urgency}) in ${bookingLanguage}`)
            results.paymentReminders.sent++
          } catch (emailError) {
            console.error(`[Reminders] Failed to send payment reminder:`, emailError)
            results.paymentReminders.errors++
          }
        }
      }
    }
  } catch (error) {
    console.error('[Reminders] Payment reminder error:', error)
  }

  // =====================
  // 2. DEADLINE REMINDERS (for failed payments with 14-day deadline)
  // =====================
  try {
    console.log('[Reminders] Checking for failed payment deadline reminders...')

    // Find failed payments that have a payment deadline set
    const { data: failedPayments, error: failedError } = await supabase
      .from('payment_schedules')
      .select(`
        *,
        booking:bookings!inner(
          id,
          booking_number,
          first_name,
          last_name,
          email,
          status,
          language,
          access_token,
          stripe_customer_id,
          total_amount,
          retreat:retreats!inner(
            destination,
            start_date,
            end_date
          )
        )
      `)
      .eq('status', 'failed')
      .not('payment_deadline', 'is', null)
      .order('payment_deadline', { ascending: true })

    if (failedError) {
      console.error('[Reminders] Error fetching failed payments:', failedError)
    } else if (failedPayments && failedPayments.length > 0) {
      console.log(`[Reminders] Found ${failedPayments.length} failed payments to check`)

      for (const payment of failedPayments) {
        const booking = payment.booking as {
          id: string
          booking_number: string
          first_name: string
          last_name: string
          email: string
          status: string
          language: string
          access_token: string | null
          stripe_customer_id: string | null
          total_amount: number
          retreat: {
            destination: string
            start_date: string
            end_date: string
          }
        }

        // Skip if booking is already cancelled
        if (booking.status === 'cancelled') continue

        const deadline = new Date(payment.payment_deadline)
        deadline.setHours(0, 0, 0, 0)

        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Determine reminder stage: 3 days (Day 11), 1 day (Day 13)
        // Note: Day 0 (final) doesn't send a reminder - process-payments handles auto-cancel
        let reminderType: '3_days' | '1_day' | null = null

        if (daysUntilDeadline === 3 && payment.reminder_stage !== '3_days') {
          reminderType = '3_days'
        } else if (daysUntilDeadline === 1 && payment.reminder_stage !== '1_day') {
          reminderType = '1_day'
        }

        if (reminderType) {
          try {
            const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

            // Generate Customer Portal URL for updating payment method
            let updatePaymentUrl = `${SITE_URL}/my-booking?token=${booking.access_token || ''}`
            if (booking.stripe_customer_id) {
              try {
                const stripe = getStripe()
                const portalSession = await stripe.billingPortal.sessions.create({
                  customer: booking.stripe_customer_id,
                  return_url: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
                })
                updatePaymentUrl = portalSession.url
              } catch {
                console.log('[Reminders] Could not create portal session, using fallback URL')
              }
            }

            // Get total payment count
            const { data: allSchedules } = await supabase
              .from('payment_schedules')
              .select('id')
              .eq('booking_id', booking.id)
            const totalPayments = allSchedules?.length || 3

            await sendDeadlineReminder(
              {
                bookingNumber: booking.booking_number,
                firstName: booking.first_name,
                lastName: booking.last_name,
                email: booking.email,
                retreatDestination: booking.retreat.destination,
                retreatDates,
                amount: payment.amount,
                paymentNumber: payment.payment_number,
                totalPayments,
                failureReason: payment.failure_reason || 'Payment failed',
                paymentDeadline: deadline.toISOString(),
                daysRemaining: daysUntilDeadline,
                updatePaymentUrl,
                myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
                language: booking.language || 'en',
              },
              reminderType
            )

            // Update reminder stage to prevent duplicate emails
            await supabase
              .from('payment_schedules')
              .update({
                reminder_stage: reminderType,
                last_reminder_sent_at: new Date().toISOString(),
              })
              .eq('id', payment.id)

            console.log(`[Reminders] Deadline reminder (${reminderType}) sent to ${booking.email}`)
            results.deadlineReminders.sent++
          } catch (emailError) {
            console.error(`[Reminders] Failed to send deadline reminder:`, emailError)
            results.deadlineReminders.errors++
          }
        }
      }
    }
  } catch (error) {
    console.error('[Reminders] Deadline reminder error:', error)
  }

  // =====================
  // 3. PRE-RETREAT REMINDERS (6 weeks = 42 days before)
  // =====================
  try {
    const sixWeeksFromNow = new Date(today)
    sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 42)
    const sixWeeksDate = sixWeeksFromNow.toISOString().split('T')[0]

    // Find bookings with retreats starting in exactly 6 weeks
    const { data: upcomingBookings, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        first_name,
        last_name,
        email,
        status,
        language,
        retreat:retreats!inner(
          destination,
          start_date,
          end_date
        )
      `)
      .eq('status', 'confirmed')
      .eq('retreat.start_date', sixWeeksDate)

    if (bookingError) {
      console.error('[Reminders] Error fetching upcoming bookings:', bookingError)
    } else if (upcomingBookings) {
      for (const booking of upcomingBookings) {
        try {
          const retreat = (Array.isArray(booking.retreat) ? booking.retreat[0] : booking.retreat) as { destination: string; start_date: string; end_date: string }
          const bookingLanguage = booking.language || 'en'
          const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                             bookingLanguage === 'es' ? 'es-ES' :
                             bookingLanguage === 'fr' ? 'fr-FR' :
                             bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
          const retreatDates = `${new Date(retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

          await sendPreRetreatReminder({
            firstName: booking.first_name,
            lastName: booking.last_name,
            email: booking.email,
            bookingNumber: booking.booking_number,
            retreatDestination: retreat.destination,
            retreatDates,
            retreatStartDate: retreat.start_date,
            daysUntilRetreat: 42,
            language: bookingLanguage,
          })

          console.log(`[Reminders] Pre-retreat reminder sent to ${booking.email} in ${bookingLanguage}`)
          results.preRetreatReminders.sent++
        } catch (emailError) {
          console.error(`[Reminders] Failed to send pre-retreat reminder:`, emailError)
          results.preRetreatReminders.errors++
        }
      }
    }
  } catch (error) {
    console.error('[Reminders] Pre-retreat reminder error:', error)
  }

  console.log('[Reminders] Complete:', results)

  return NextResponse.json({
    message: 'Reminders processed',
    date: today.toISOString().split('T')[0],
    ...results,
  })
}

// POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request)
}
