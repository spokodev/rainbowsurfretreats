import { createClient } from '@/lib/supabase/server'
import RetreatsPageClient from '@/components/RetreatsPageClient'
import type { Metadata } from 'next'
import { getRetreatsHeaderImage } from '@/lib/page-images'

export const metadata: Metadata = {
  title: 'Our Retreats - Rainbow Surf Retreats',
  description: 'Discover our upcoming LGBTQ+ surf retreats around the world. Find your perfect surf adventure.',
}

// Revalidate every 60 seconds for fresh data
export const revalidate = 60

export default async function RetreatsPage() {
  const supabase = await createClient()

  const [{ data: retreats, error }, headerImage] = await Promise.all([
    supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: true }),
    getRetreatsHeaderImage()
  ])

  if (error) {
    console.error('Error fetching retreats:', error)
  }

  return <RetreatsPageClient initialRetreats={retreats || []} headerImage={headerImage} />
}
