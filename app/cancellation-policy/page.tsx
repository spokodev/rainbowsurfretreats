'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CancellationContent {
  byCancelTitle?: string
  byCancelText?: string
  byYouTitle?: string
  byYouItems?: string[]
  noteTitle?: string
  noteText?: string
}

interface PolicySection {
  section_key: string
  title: string
  content: CancellationContent
}

export default function CancellationPolicyPage() {
  const locale = useLocale()
  const [policy, setPolicy] = useState<PolicySection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicy()
  }, [locale])

  const fetchPolicy = async () => {
    try {
      const response = await fetch(`/api/policies?language=${locale}`)
      const data = await response.json()
      if (data.data) {
        const cancellationSection = data.data.find(
          (p: PolicySection) => p.section_key === 'cancellation'
        )
        setPolicy(cancellationSection || null)
      }
    } catch (error) {
      console.error('Error fetching cancellation policy:', error)
    } finally {
      setLoading(false)
    }
  }

  const content = policy?.content

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Cancellation Policy</h1>
        <p className="text-muted-foreground mb-8">
          What happens if plans change.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !content ? (
          <div className="bg-background rounded-lg p-6 shadow-sm">
            <p className="text-muted-foreground">
              Cancellation policy content is being prepared. Please check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* If We Cancel */}
            {content.byCancelTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.byCancelTitle}</h2>
                <p className="text-muted-foreground">{content.byCancelText}</p>
              </section>
            )}

            {/* If You Cancel */}
            {content.byYouTitle && (
              <section className="bg-background rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-3">{content.byYouTitle}</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.byYouItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Important Note */}
            {content.noteTitle && (
              <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-200">
                  {content.noteTitle}
                </h2>
                <p className="text-amber-700 dark:text-amber-300">{content.noteText}</p>
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
