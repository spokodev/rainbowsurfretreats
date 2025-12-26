'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Mail, Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

const POPUP_DELAY = 15000 // 15 seconds
const POPUP_STORAGE_KEY = 'newsletter_popup_dismissed'
const POPUP_EXPIRY_DAYS = 7

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if popup was dismissed recently
    const dismissed = localStorage.getItem(POPUP_STORAGE_KEY)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSince = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < POPUP_EXPIRY_DAYS) {
        return
      }
    }

    // Show popup after delay
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, POPUP_DELAY)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem(POPUP_STORAGE_KEY, new Date().toISOString())
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    if (!accepted) {
      setError('Please accept the terms')
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'popup',
          language: navigator.language?.split('-')[0] || 'en',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setStatus('success')
      localStorage.setItem(POPUP_STORAGE_KEY, new Date().toISOString())

      // Auto close after success
      setTimeout(() => {
        setIsOpen(false)
      }, 3000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Popup */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-popup-title"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close newsletter popup"
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </button>

            {/* Header image/gradient */}
            <div className="bg-gradient-ocean h-32 flex items-center justify-center">
              <div className="text-center text-white">
                <Sparkles className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm font-medium">Stay in the Loop</p>
              </div>
            </div>

            <div className="p-6">
              {status === 'success' ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">You&apos;re In!</h3>
                  <p className="text-gray-600">
                    Check your email to confirm your subscription.
                  </p>
                </div>
              ) : (
                <>
                  <h2 id="newsletter-popup-title" className="text-2xl font-bold text-center mb-2">
                    Join the Rainbow Surf Family
                  </h2>
                  <p className="text-gray-600 text-center mb-6">
                    Subscribe and get exclusive access to early bird offers, surf tips, and community updates.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        aria-required="true"
                        aria-invalid={error && !email.includes('@') ? 'true' : undefined}
                      />
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="popup-terms"
                        checked={accepted}
                        onCheckedChange={(c) => setAccepted(c === true)}
                        className="mt-1"
                      />
                      <label htmlFor="popup-terms" className="text-sm text-gray-600">
                        I agree to receive newsletters and accept the{' '}
                        <Link href="/privacy-policy" className="text-[#2C7A7B] underline" onClick={handleClose}>
                          Privacy Policy
                        </Link>
                      </label>
                    </div>

                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full h-12 bg-gradient-ocean text-white"
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Subscribing...
                        </>
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    No spam, ever. Unsubscribe anytime.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
