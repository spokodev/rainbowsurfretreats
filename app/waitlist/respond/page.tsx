'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TokenStatus {
  status: string
  isExpired: boolean
  firstName: string
  retreatDestination: string
  expiresAt: string | null
  roomName?: string
  roomPrice?: number
}

function WaitlistResponseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const action = searchParams.get('action')

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ message: string; bookingUrl?: string } | null>(null)

  // Check token status on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError('Invalid link. No token provided.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/waitlist/respond?token=${token}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Invalid or expired link')
          setLoading(false)
          return
        }

        setTokenStatus(result.data)

        // If action is provided in URL and status is valid, process immediately
        if (action && result.data.status === 'notified' && !result.data.isExpired) {
          handleResponse(action as 'accept' | 'decline')
        } else {
          setLoading(false)
        }
      } catch {
        setError('Failed to verify link. Please try again.')
        setLoading(false)
      }
    }

    checkToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleResponse = async (responseAction: 'accept' | 'decline') => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/waitlist/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: responseAction }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to process response')
        setProcessing(false)
        setLoading(false)
        return
      }

      setSuccess({
        message: result.message,
        bookingUrl: result.data?.bookingUrl,
      })

      // If accepted, redirect to booking page after short delay
      if (responseAction === 'accept' && result.data?.bookingUrl) {
        setTimeout(() => {
          router.push(result.data.bookingUrl)
        }, 2000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setProcessing(false)
      setLoading(false)
    }
  }

  // Loading state
  if (loading || processing) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {processing ? 'Processing your response...' : 'Verifying your link...'}
          </h1>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    const isAccepted = !!success.bookingUrl

    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isAccepted ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {isAccepted ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-gray-500" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAccepted ? 'Offer Accepted!' : 'Offer Declined'}
          </h1>

          <p className="text-gray-600 mb-6">{success.message}</p>

          {isAccepted && success.bookingUrl && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Redirecting you to complete your booking...</p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 gap-2">
                <Link href={success.bookingUrl}>
                  Complete Booking Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}

          {!isAccepted && (
            <Button asChild variant="outline">
              <Link href="/retreats">Browse Other Retreats</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !tokenStatus) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something Went Wrong
          </h1>

          <p className="text-gray-600 mb-6">
            {error || 'Invalid or expired link.'}
          </p>

          <div className="space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/retreats">Browse Retreats</Link>
            </Button>
            <p className="text-sm text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:info@rainbowsurfretreats.com" className="text-orange-500 hover:underline">
                info@rainbowsurfretreats.com
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Already responded or expired
  if (tokenStatus.status !== 'notified' || tokenStatus.isExpired) {
    const statusContent = {
      accepted: {
        icon: <CheckCircle className="w-10 h-10 text-green-600" />,
        bg: 'bg-green-100',
        title: 'Already Accepted',
        message: 'You have already accepted this offer. Please complete your booking.',
      },
      declined: {
        icon: <XCircle className="w-10 h-10 text-gray-500" />,
        bg: 'bg-gray-100',
        title: 'Already Declined',
        message: 'You have already declined this offer.',
      },
      expired: {
        icon: <Clock className="w-10 h-10 text-amber-600" />,
        bg: 'bg-amber-100',
        title: 'Offer Expired',
        message: 'This offer has expired. The spot has been offered to the next person on the waitlist.',
      },
      booked: {
        icon: <CheckCircle className="w-10 h-10 text-green-600" />,
        bg: 'bg-green-100',
        title: 'Booking Complete',
        message: 'You have already completed your booking for this retreat.',
      },
      waiting: {
        icon: <Clock className="w-10 h-10 text-blue-600" />,
        bg: 'bg-blue-100',
        title: 'Still Waiting',
        message: 'You are still on the waitlist. You will receive an email when a spot becomes available.',
      },
    }

    const content = statusContent[tokenStatus.status as keyof typeof statusContent] || statusContent.expired

    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className={`w-20 h-20 ${content.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {content.icon}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>
          <p className="text-gray-600 mb-6">{content.message}</p>

          <Button asChild variant="outline">
            <Link href="/retreats">Browse Retreats</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show accept/decline buttons (valid notified status)
  const expiryTime = tokenStatus.expiresAt ? new Date(tokenStatus.expiresAt) : null
  const hoursRemaining = expiryTime
    ? Math.max(0, Math.round((expiryTime.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0

  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hi {tokenStatus.firstName}!
          </h1>

          <p className="text-gray-600">
            A spot is available for the <strong>{tokenStatus.retreatDestination}</strong> retreat!
          </p>

          {tokenStatus.roomName && tokenStatus.roomPrice && (
            <p className="text-gray-500 text-sm mt-2">
              Room: {tokenStatus.roomName} - €{tokenStatus.roomPrice.toFixed(2)}
            </p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Time Remaining</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{hoursRemaining} hours</p>
          <p className="text-sm text-amber-600">
            Offer expires: {expiryTime?.toLocaleString()}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => handleResponse('accept')}
            disabled={processing}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept & Book Now
              </>
            )}
          </Button>

          <Button
            onClick={() => handleResponse('decline')}
            disabled={processing}
            variant="outline"
            className="w-full py-6 text-lg"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Decline Offer
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          By accepting, you will be redirected to complete your booking and pay the deposit.
        </p>
      </div>
    </div>
  )
}

export default function WaitlistRespondPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
      </div>
    }>
      <WaitlistResponseContent />
    </Suspense>
  )
}
