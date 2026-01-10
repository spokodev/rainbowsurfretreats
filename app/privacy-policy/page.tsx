import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Rainbow Surf Retreats',
  description: 'How we collect, use, and protect your personal information.',
}

export const revalidate = 3600 // Revalidate every hour

interface PrivacyContent {
  introTitle?: string
  introText?: string
  collectTitle?: string
  collectItems?: string[]
  useTitle?: string
  useItems?: string[]
  shareTitle?: string
  shareText?: string
  cookiesTitle?: string
  cookiesText?: string
  rightsTitle?: string
  rightsItems?: string[]
  contactTitle?: string
  contactText?: string
}

interface PolicySection {
  section_key: string
  title: string
  content: PrivacyContent
}

export default async function PrivacyPolicyPage() {
  const supabase = await createClient()
  const locale = await getLocale()

  // Try to fetch privacy policy for current locale
  let { data: policies } = await supabase
    .from('policies')
    .select('*')
    .eq('language', locale)
    .eq('section_key', 'privacy')
    .single()

  // Fallback to English if no policy for current locale
  if (!policies) {
    const { data: enPolicy } = await supabase
      .from('policies')
      .select('*')
      .eq('language', 'en')
      .eq('section_key', 'privacy')
      .single()
    policies = enPolicy
  }

  const policy = policies as PolicySection | null
  const content = policy?.content

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          How we collect, use, and protect your personal information.
        </p>

        {!content ? (
          <div className="bg-background rounded-lg p-6 shadow-sm">
            <p className="text-muted-foreground">
              Privacy policy content is being prepared. Please check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Introduction */}
            {content.introTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.introTitle}</h2>
                <p className="text-muted-foreground">{content.introText}</p>
              </section>
            )}

            {/* Information We Collect */}
            {content.collectTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.collectTitle}</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.collectItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* How We Use Information */}
            {content.useTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.useTitle}</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.useItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Information Sharing */}
            {content.shareTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.shareTitle}</h2>
                <p className="text-muted-foreground">{content.shareText}</p>
              </section>
            )}

            {/* Cookies */}
            {content.cookiesTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.cookiesTitle}</h2>
                <p className="text-muted-foreground">{content.cookiesText}</p>
              </section>
            )}

            {/* Your Rights */}
            {content.rightsTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.rightsTitle}</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.rightsItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Contact */}
            {content.contactTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.contactTitle}</h2>
                <p className="text-muted-foreground">{content.contactText}</p>
              </section>
            )}

            {/* Related Links */}
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Related Policies</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/terms"
                  className="text-[var(--primary-teal)] hover:underline"
                >
                  Terms & Conditions
                </Link>
                <Link
                  href="/cancellation-policy"
                  className="text-[var(--primary-teal)] hover:underline"
                >
                  Cancellation Policy
                </Link>
                <Link
                  href="/policies"
                  className="text-[var(--primary-teal)] hover:underline"
                >
                  All Policies
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
