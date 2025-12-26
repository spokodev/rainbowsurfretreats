import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import { CookieConsent } from '@/components/CookieConsent'
import NewsletterPopup from '@/components/NewsletterPopup'

export const metadata: Metadata = {
  title: 'Rainbow Surf Retreats - LGBTQ+ Surf Adventures',
  description: 'Join Rainbow Surf Retreats for inclusive LGBTQ+ surf adventures. Experience the thrill of surfing in a welcoming, supportive community.',
  keywords: ['LGBTQ+ surf retreats', 'gay surf holidays', 'inclusive surf camps', 'queer surf adventures'],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main>
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
          <CookieConsent />
          <NewsletterPopup />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
