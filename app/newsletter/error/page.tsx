'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const messages: Record<string, { title: string; description: string }> = {
    missing_token: {
      title: 'Missing Token',
      description: 'The confirmation link is incomplete. Please try subscribing again.',
    },
    invalid_token: {
      title: 'Invalid Link',
      description: 'This confirmation link is invalid or has already been used.',
    },
    expired_token: {
      title: 'Link Expired',
      description: 'This confirmation link has expired. Please subscribe again to receive a new link.',
    },
    server_error: {
      title: 'Something Went Wrong',
      description: 'We encountered an error processing your request. Please try again later.',
    },
  }

  const { title, description } = messages[reason || 'server_error'] || messages.server_error

  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold mb-4">{title}</h1>

        <p className="text-gray-600 mb-6">{description}</p>

        <div className="space-y-3">
          <Button asChild className="w-full bg-gradient-ocean text-[var(--earth-brown)]">
            <Link href="/#newsletter">
              <RefreshCw className="mr-2 w-4 h-4" />
              Try Again
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NewsletterErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
