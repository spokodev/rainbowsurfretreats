'use client'

import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SeaShell, Flowers, WavePattern } from '@/components/illustrations'

export default function NewsletterSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative Illustrations */}
      <SeaShell
        variant={2}
        className="absolute -left-8 top-1/4 w-28 h-28 text-[var(--primary-coral)] hidden md:block"
        style={{ opacity: 0.12 }}
      />
      <Flowers
        animated
        className="absolute right-4 bottom-1/4 w-32 h-32 text-[var(--primary-coral)] hidden md:block"
        style={{ opacity: 0.15 }}
      />
      <WavePattern
        variant={1}
        className="absolute bottom-0 left-0 right-0 h-20 text-[var(--primary-teal)]"
        style={{ opacity: 0.1 }}
      />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center relative z-10">
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
