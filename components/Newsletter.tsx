'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WavePattern, Surfer, Palm } from '@/components/illustrations';
import { illustrationOpacity } from '@/lib/animations';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Newsletter() {
  const t = useTranslations('newsletter');
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
      setEmailError(t('errors.required'));
      return;
    }

    if (!validateEmail(email)) {
      setEmailError(t('errors.invalid'));
      return;
    }

    // Validate terms
    if (!termsAccepted) {
      setTermsError(t('errors.terms'));
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
      {/* Primary Background */}
      <div className="absolute inset-0 bg-[var(--primary-teal)]" />

      {/* Wave Pattern Overlay */}
      <WavePattern
        variant={2}
        animated
        className="absolute bottom-0 left-0 right-0 h-32 md:h-48 text-white"
        style={{ opacity: illustrationOpacity.newsletterWave }}
      />

      {/* Surfer Silhouette */}
      <Surfer
        className="absolute -right-8 md:right-4 bottom-8 h-48 md:h-64 text-white hidden sm:block"
        style={{ opacity: illustrationOpacity.newsletterSurfer }}
      />

      {/* Palm Tree - Left Side */}
      <Palm
        animated
        className="absolute -left-12 md:left-4 bottom-4 h-40 md:h-56 text-white hidden md:block"
        style={{ opacity: illustrationOpacity.palm }}
      />

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
            {t('title')}
          </h2>
          <p className="mb-8 text-lg text-white/90 leading-relaxed">
            {t('subtitle')}
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
                {t('success')}
              </h3>
              <p className="text-white/90">
                {t('successMessage')}
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
                    placeholder={t('placeholder')}
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
                  className="h-12 bg-white px-8 text-[var(--primary-teal)] hover:bg-white/90"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('subscribing')}
                    </>
                  ) : (
                    <>
                      {t('button')}
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
                    className="mt-0.5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[var(--primary-teal)]"
                    aria-invalid={!!termsError}
                    aria-describedby={termsError ? 'terms-error' : undefined}
                  />
                  <label
                    htmlFor="terms"
                    className="text-left text-sm leading-relaxed text-white/90"
                  >
                    {t('terms')}{' '}
                    <Link
                      href="/privacy-policy"
                      className="font-medium text-white underline underline-offset-2 hover:no-underline"
                    >
                      {t('privacyPolicy')}
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
                  {t('errors.generic')}
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
            {t('noSpam')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
