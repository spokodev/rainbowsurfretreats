import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentReminder, sendPreRetreatReminder } from '@/lib/email'

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

// GET /api/cron/send-reminders - Send payment and pre-retreat reminders
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results = {
    paymentReminders: { sent: 0, errors: 0 },
    preRetreatReminders: { sent: 0, errors: 0 },
  }

  console.log(`[Reminders] Running reminder cron for ${today.toISOString().split('T')[0]}`)

  // =====================
  // PAYMENT REMINDERS
  // =====================
  try {
    // Find pending payments with upcoming due dates (include language)
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

        // Determine urgency level
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

        // Send reminder if applicable
        if (urgency) {
          try {
            const bookingLanguage = booking.language || 'en'
            const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                               bookingLanguage === 'es' ? 'es-ES' :
                               bookingLanguage === 'fr' ? 'fr-FR' :
                               bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
            const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

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
  // PRE-RETREAT REMINDERS (6 weeks = 42 days before)
  // =====================
  try {
    const sixWeeksFromNow = new Date(today)
    sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 42)
    const sixWeeksDate = sixWeeksFromNow.toISOString().split('T')[0]

    // Find bookings with retreats starting in exactly 6 weeks (include language)
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
