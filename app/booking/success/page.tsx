'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, MapPin, CreditCard, ArrowRight, Loader2, Mail, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Surfer, SeaShell, WavePattern } from '@/components/illustrations'

interface BookingDetails {
  booking_number: string
  first_name: string
  last_name: string
  email: string
  retreat: {
    destination: string
    start_date: string
    end_date: string
  }
  room: {
    name: string
  }
  guests_count: number
  total_amount: number
  deposit_amount: number
  balance_due: number
  payment_schedules: {
    payment_number: number
    amount: number
    due_date: string
    status: string
  }[]
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails()
    } else {
      setLoading(false)
    }
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`)
      if (response.ok) {
        const data = await response.json()
        setBooking(data)
      } else {
        setError('Could not load booking details')
      }
    } catch {
      setError('Could not load booking details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-ochre py-12 px-4 relative overflow-hidden">
      {/* Decorative Illustrations */}
      <Surfer
        className="absolute -left-8 bottom-8 w-40 h-40 text-[var(--primary-teal)] hidden md:block"
        style={{ opacity: 0.15 }}
      />
      <SeaShell
        variant={1}
        className="absolute right-4 top-20 w-24 h-24 text-[var(--primary-coral)] hidden md:block rotate-12"
        style={{ opacity: 0.12 }}
      />
      <WavePattern
        variant={2}
        className="absolute bottom-0 left-0 right-0 h-24 text-[var(--primary-teal)]"
        style={{ opacity: 0.1 }}
      />

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">
              Thank you for booking with Rainbow Surf Retreats.
              {booking?.email && ` A confirmation email has been sent to ${booking.email}.`}
            </p>
          </div>

          {/* Booking Details */}
          {booking && (
            <div className="space-y-6">
              {/* Booking Number */}
              <div className="bg-ocean-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
                <p className="text-xl font-bold text-ocean-700">{booking.booking_number}</p>
              </div>

              {/* Retreat Info */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-ocean-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{booking.retreat?.destination}</p>
                    <p className="text-sm text-gray-600">{booking.room?.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-ocean-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {booking.retreat?.start_date && formatDate(booking.retreat.start_date)} - {booking.retreat?.end_date && formatDate(booking.retreat.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-ocean-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">{booking.guests_count} guest(s)</p>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              {booking.payment_schedules && booking.payment_schedules.length > 1 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-ocean-600" />
                    Payment Schedule
                  </h3>
                  <div className="space-y-2">
                    {booking.payment_schedules.map((schedule) => (
                      <div key={schedule.payment_number} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">Payment {schedule.payment_number}</span>
                          <span className="text-gray-600 ml-2">
                            {schedule.status === 'paid' || schedule.status === 'processing'
                              ? '(Paid)'
                              : `Due: ${formatDate(schedule.due_date)}`}
                          </span>
                        </div>
                        <span className={schedule.status === 'paid' || schedule.status === 'processing' ? 'text-green-600' : ''}>
                          {'\u20AC'}{schedule.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {booking.balance_due > 0 && (
                    <div className="mt-3 pt-3 border-t flex justify-between font-medium">
                      <span>Balance Due</span>
                      <span>{'\u20AC'}{booking.balance_due.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total Paid Today */}
              <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center">
                <span className="font-medium text-green-800">Paid Today</span>
                <span className="text-xl font-bold text-green-700">{'\u20AC'}{booking.deposit_amount?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !booking && (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                Your booking was successful! Check your email for confirmation details.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-ocean-600" />
              What happens next?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>You will receive a confirmation email with all booking details</li>
              <li>Payment reminders will be sent before each due date</li>
              <li>We will send you a pre-retreat information pack 6 weeks before your trip</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button asChild className="w-full bg-gradient-ocean">
              <Link href="/retreats">
                Explore More Retreats
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Return to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
