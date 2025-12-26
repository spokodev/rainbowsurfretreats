'use client'

import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewsletterSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold mb-4">Subscription Confirmed!</h1>

        <p className="text-gray-600 mb-6">
          Welcome to the Rainbow Surf family! You&apos;ll now receive our updates
          about retreats, surf tips, and exclusive offers.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full bg-gradient-ocean">
            <Link href="/">
              Explore Retreats
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/blog">
              Read Our Blog
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
