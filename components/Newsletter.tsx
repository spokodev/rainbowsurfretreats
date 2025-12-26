'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Reset errors
    setEmailError('');
    setTermsError('');

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate terms
    if (!termsAccepted) {
      setTermsError('You must agree to the terms');
      return;
    }

    // Submit
    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'website',
          language: navigator.language?.split('-')[0] || 'en',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus('success');
      setEmail('');
      setTermsAccepted(false);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Teal Background */}
      <div className="absolute inset-0 bg-[#2C7A7B]" />

      {/* Wave Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="absolute bottom-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
          >
            <Mail className="h-8 w-8 text-white" />
          </motion.div>

          {/* Heading */}
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Stay in the Loop
          </h2>
          <p className="mb-8 text-lg text-white/90">
            Subscribe to our newsletter for exclusive retreat updates, surf tips,
            and early access to new destinations.
          </p>

          {/* Form */}
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-white/20 p-8 backdrop-blur-sm"
            >
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-300" />
              <h3 className="mb-2 text-xl font-semibold text-white">
                You&apos;re on the list!
              </h3>
              <p className="text-white/90">
                Thanks for subscribing. Get ready for some amazing surf stories!
              </p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Email Input */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className="h-12 border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:border-white focus-visible:ring-white/30"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                  />
                  {emailError && (
                    <p id="email-error" className="mt-1 text-left text-sm text-red-300">
                      {emailError}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="h-12 bg-white px-8 text-blue-600 hover:bg-white/90"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Terms Checkbox */}
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      setTermsAccepted(checked === true);
                      setTermsError('');
                    }}
                    className="mt-0.5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                    aria-invalid={!!termsError}
                    aria-describedby={termsError ? 'terms-error' : undefined}
                  />
                  <label
                    htmlFor="terms"
                    className="text-left text-sm leading-relaxed text-white/90"
                  >
                    I agree to receive newsletters and accept the{' '}
                    <Link
                      href="/policies"
                      className="font-medium text-white underline underline-offset-2 hover:no-underline"
                    >
                      Policies
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy-policy"
                      className="font-medium text-white underline underline-offset-2 hover:no-underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>
                {termsError && (
                  <p id="terms-error" className="text-left text-sm text-red-300">
                    {termsError}
                  </p>
                )}
              </div>

              {/* Error State */}
              {status === 'error' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-300"
                >
                  Something went wrong. Please try again.
                </motion.p>
              )}
            </motion.form>
          )}

          {/* Trust Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 text-sm text-white/70"
          >
            No spam, unsubscribe anytime. Join 2,000+ surf enthusiasts.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
