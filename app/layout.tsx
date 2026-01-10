import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { headers } from 'next/headers'
import './globals.css'
import Header from '@/components/Header'
import FooterWrapper from '@/components/FooterWrapper'
import WhatsAppButton from '@/components/WhatsAppButton'
import { CookieConsent } from '@/components/CookieConsent'
import NewsletterPopup from '@/components/NewsletterPopup'
import { NProgressProvider } from '@/components/NProgressProvider'

// BUG-018 FIX: Add metadataBase for canonical URLs
// BUG-015 FIX: Add hreflang alternates for SEO
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'),
  title: 'Rainbow Surf Retreats - LGBTQ+ Surf Adventures',
  description: 'Join Rainbow Surf Retreats for inclusive LGBTQ+ surf adventures. Experience the thrill of surfing in a welcoming, supportive community.',
  keywords: ['LGBTQ+ surf retreats', 'gay surf holidays', 'inclusive surf camps', 'queer surf adventures'],
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'de': '/de',
      'es': '/es',
      'fr': '/fr',
      'nl': '/nl',
      'x-default': '/en',
    },
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  // Check if we're on admin or login pages
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isAdminOrLogin = pathname.startsWith('/admin') || pathname.startsWith('/login')

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <NProgressProvider>
            {!isAdminOrLogin && <Header />}
            <main>
              {children}
            </main>
            {!isAdminOrLogin && <FooterWrapper />}
            {!isAdminOrLogin && <WhatsAppButton />}
            {!isAdminOrLogin && <CookieConsent />}
            {!isAdminOrLogin && <NewsletterPopup />}
          </NProgressProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
