import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import PoliciesPageClient from '@/components/PoliciesPageClient'
import { getPoliciesHeaderImage } from '@/lib/page-images'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Policies - Rainbow Surf Retreats',
  description: 'Read our booking policies, cancellation terms, insurance requirements, and what to bring to your surf retreat.',
}

export const revalidate = 3600 // Revalidate every hour

export default async function PoliciesPage() {
  const supabase = await createClient()
  const locale = await getLocale()

  // Fetch policies and header image in parallel
  const [policiesResult, headerImage] = await Promise.all([
    (async () => {
      // Try to fetch policies for current locale, fallback to EN
      let { data: policies } = await supabase
        .from('policy_sections')
        .select('*')
        .eq('language', locale)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      // BUG-017 FIX: Fallback to English if no policies for current locale
      if (!policies || policies.length === 0) {
        const { data: enPolicies } = await supabase
          .from('policy_sections')
          .select('*')
          .eq('language', 'en')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
        policies = enPolicies
      }
      return policies
    })(),
    getPoliciesHeaderImage()
  ])

  return <PoliciesPageClient initialPolicies={policiesResult || []} headerImage={headerImage} />
}
