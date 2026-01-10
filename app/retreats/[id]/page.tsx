import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RetreatDetailClient from '@/components/RetreatDetailClient'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: slug } = await params
  const supabase = await createClient()

  const { data: retreat } = await supabase
    .from('retreats')
    .select('destination, intro_text, image_url')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!retreat) {
    return {
      title: 'Retreat Not Found - Rainbow Surf Retreats',
    }
  }

  return {
    title: `${retreat.destination} - Rainbow Surf Retreats`,
    description: retreat.intro_text || `Join our ${retreat.destination} surf retreat for an unforgettable LGBTQ+ adventure.`,
    openGraph: {
      title: `${retreat.destination} - Rainbow Surf Retreats`,
      description: retreat.intro_text || `Join our ${retreat.destination} surf retreat.`,
      images: retreat.image_url ? [retreat.image_url] : [],
    },
  }
}

export default async function RetreatPage({ params }: PageProps) {
  const { id: slug } = await params
  const supabase = await createClient()

  const { data: retreat, error } = await supabase
    .from('retreats')
    .select(`
      *,
      rooms:retreat_rooms(*)
    `)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !retreat) {
    notFound()
  }

  return <RetreatDetailClient retreat={retreat} />
}
