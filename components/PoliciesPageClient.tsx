'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { CreditCard, XCircle, Shield, Briefcase, Scale, ChevronDown } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { POLICIES_IMAGES } from '@/lib/images'
import type { SingleImage } from '@/lib/validations/page-images'

interface PolicyContent {
  depositTitle?: string
  depositText?: string
  scheduleTitle?: string
  scheduleItems?: string[]
  methodsTitle?: string
  methodsText?: string
  byCancelTitle?: string
  byCancelText?: string
  byYouTitle?: string
  byYouItems?: string[]
  noteTitle?: string
  noteText?: string
  requiredText?: string
  mustIncludeTitle?: string
  mustIncludeItems?: string[]
  tipTitle?: string
  tipText?: string
  introText?: string
  essentialsTitle?: string
  essentialsItems?: string[]
  optionalTitle?: string
  optionalItems?: string[]
  text?: string
}

interface PolicySection {
  section_key: string
  title: string
  content: PolicyContent
  sort_order: number
}

// Default header image fallback
const defaultHeaderImage = { url: POLICIES_IMAGES.underwater, alt: 'Policies - Rainbow Surf Retreats' }

interface PoliciesPageClientProps {
  initialPolicies: PolicySection[]
  headerImage?: SingleImage
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  paymentTerms: CreditCard,
  cancellation: XCircle,
  insurance: Shield,
  whatToBring: Briefcase,
  legal: Scale,
}

export default function PoliciesPageClient({ initialPolicies, headerImage }: PoliciesPageClientProps) {
  const displayHeaderImage = headerImage || defaultHeaderImage
  const t = useTranslations('policies')
  const [openSection, setOpenSection] = useState<string | null>(
    initialPolicies.length > 0 ? initialPolicies[0].section_key : null
  )

  const toggleSection = (key: string) => {
    setOpenSection(openSection === key ? null : key)
  }

  const renderSectionContent = (policy: PolicySection) => {
    const content = policy.content

    switch (policy.section_key) {
      case 'paymentTerms':
        return (
          <div className="space-y-4">
            {content.depositTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.depositTitle}</h4>
                <p className="text-muted-foreground">{content.depositText}</p>
              </div>
            )}
            {content.scheduleTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.scheduleTitle}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.scheduleItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.methodsTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.methodsTitle}</h4>
                <p className="text-muted-foreground">{content.methodsText}</p>
              </div>
            )}
          </div>
        )

      case 'cancellation':
        return (
          <div className="space-y-4">
            {content.byCancelTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.byCancelTitle}</h4>
                <p className="text-muted-foreground">{content.byCancelText}</p>
              </div>
            )}
            {content.byYouTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.byYouTitle}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.byYouItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.noteTitle && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800">
                  <strong>{content.noteTitle}:</strong> {content.noteText}
                </p>
              </div>
            )}
          </div>
        )

      case 'insurance':
        return (
          <div className="space-y-4">
            {content.requiredText && (
              <p className="text-muted-foreground">{content.requiredText}</p>
            )}
            {content.mustIncludeTitle && (
              <div>
                <h4 className="font-semibold mb-2">{content.mustIncludeTitle}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {content.mustIncludeItems?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.tipTitle && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>{content.tipTitle}:</strong> {content.tipText}
                </p>
              </div>
            )}
          </div>
        )

      case 'whatToBring':
        return (
          <div className="space-y-4">
            {content.introText && (
              <p className="text-muted-foreground">{content.introText}</p>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {content.essentialsTitle && (
                <div>
                  <h4 className="font-semibold mb-2">{content.essentialsTitle}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {content.essentialsItems?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {content.optionalTitle && (
                <div>
                  <h4 className="font-semibold mb-2">{content.optionalTitle}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {content.optionalItems?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )

      case 'legal':
        return (
          <p className="text-muted-foreground">{content.text}</p>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={displayHeaderImage.url}
            alt={displayHeaderImage.alt}
            fill
            className="object-cover"
            priority
            unoptimized={displayHeaderImage.url.includes('googleusercontent.com') || displayHeaderImage.url.includes('drive.google.com')}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-white px-4"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
            {t('subtitle')}
          </p>
        </motion.div>
      </section>

      {/* Policies Content */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {initialPolicies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No policies available.
              </div>
            ) : (
              initialPolicies.map((policy, index) => {
                const Icon = SECTION_ICONS[policy.section_key] || CreditCard
                const isExpanded = openSection === policy.section_key

                return (
                  <motion.div
                    key={policy.section_key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-background rounded-lg shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection(policy.section_key)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-[var(--primary-teal)]/10 text-[var(--primary-teal)]">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-lg">{policy.title}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </motion.div>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: isExpanded ? 'auto' : 0,
                        opacity: isExpanded ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0">
                        {renderSectionContent(policy)}
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
