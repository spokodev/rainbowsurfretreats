'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-gray-500" />
        </div>

        <h1 className="text-2xl font-bold mb-4">You&apos;ve Been Unsubscribed</h1>

        <p className="text-gray-600 mb-6">
          We&apos;re sorry to see you go. You will no longer receive our newsletter
          emails. If you change your mind, you can always subscribe again.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full bg-gradient-ocean">
            <Link href="/">
              Back to Homepage
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/#newsletter">
              Resubscribe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
