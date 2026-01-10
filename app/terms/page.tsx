import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions - Rainbow Surf Retreats',
  description: 'Please read these terms carefully before booking a retreat.',
}

export const revalidate = 3600 // Revalidate every hour

interface PolicyContent {
  depositTitle?: string
  depositText?: string
  scheduleTitle?: string
  scheduleItems?: string[]
  methodsTitle?: string
  methodsText?: string
  text?: string
}

interface PolicySection {
  section_key: string
  title: string
  content: PolicyContent
}

export default async function TermsPage() {
  const supabase = await createClient()
  const locale = await getLocale()

  // Try to fetch policies for current locale
  let { data: policies } = await supabase
    .from('policies')
    .select('*')
    .eq('language', locale)
    .in('section_key', ['paymentTerms', 'legal'])

  // Fallback to English if no policies for current locale
  if (!policies || policies.length === 0) {
    const { data: enPolicies } = await supabase
      .from('policies')
      .select('*')
      .eq('language', 'en')
      .in('section_key', ['paymentTerms', 'legal'])
    policies = enPolicies
  }

  const typedPolicies = (policies || []) as PolicySection[]
  const paymentTerms = typedPolicies.find(p => p.section_key === 'paymentTerms')
  const legal = typedPolicies.find(p => p.section_key === 'legal')

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">
          Please read these terms carefully before booking a retreat.
        </p>

        <div className="space-y-8">
          {/* Payment Terms Section */}
          {paymentTerms && (
            <section className="bg-background rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4">{paymentTerms.title}</h2>
              <div className="space-y-4 text-muted-foreground">
                {paymentTerms.content.depositTitle && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {paymentTerms.content.depositTitle}
                    </h3>
                    <p>{paymentTerms.content.depositText}</p>
                  </div>
                )}
                {paymentTerms.content.scheduleTitle && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {paymentTerms.content.scheduleTitle}
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {paymentTerms.content.scheduleItems?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {paymentTerms.content.methodsTitle && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {paymentTerms.content.methodsTitle}
                    </h3>
                    <p>{paymentTerms.content.methodsText}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Legal Section */}
          {legal && (
            <section className="bg-background rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4">{legal.title}</h2>
              <p className="text-muted-foreground">{legal.content.text}</p>
            </section>
          )}

          {/* Fallback if no content */}
          {!paymentTerms && !legal && (
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <p className="text-muted-foreground">
                Terms & Conditions content is being prepared. Please check back soon.
              </p>
            </div>
          )}

          {/* Related Links */}
          <div className="bg-background rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Related Policies</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/cancellation-policy"
                className="text-[var(--primary-teal)] hover:underline"
              >
                Cancellation Policy
              </Link>
              <Link
                href="/privacy-policy"
                className="text-[var(--primary-teal)] hover:underline"
              >
                Privacy Policy
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
      </div>
    </div>
  )
}
