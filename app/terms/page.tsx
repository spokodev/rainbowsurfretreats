'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

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

export default function TermsPage() {
  const locale = useLocale()
  const [policies, setPolicies] = useState<PolicySection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicies()
  }, [locale])

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`/api/policies?language=${locale}`)
      const data = await response.json()
      if (data.data) {
        // Filter for paymentTerms and legal sections
        const relevantSections = data.data.filter(
          (p: PolicySection) => p.section_key === 'paymentTerms' || p.section_key === 'legal'
        )
        setPolicies(relevantSections)
      }
    } catch (error) {
      console.error('Error fetching policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const paymentTerms = policies.find(p => p.section_key === 'paymentTerms')
  const legal = policies.find(p => p.section_key === 'legal')

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">
          Please read these terms carefully before booking a retreat.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
