import { createClient } from '@/lib/supabase/server'
import Footer from './Footer'

interface FooterRetreat {
  id: string
  slug: string
  destination: string
  start_date: string
  availability_status: 'available' | 'sold_out' | 'few_spots'
}

export default async function FooterWrapper() {
  const supabase = await createClient()

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('retreats')
    .select('id, slug, destination, start_date, availability_status')
    .eq('is_published', true)
    .is('deleted_at', null)
    .gte('start_date', now.toISOString())
    .neq('availability_status', 'sold_out')
    .order('start_date', { ascending: true })
    .limit(5)

  const retreats = (data || []) as FooterRetreat[]

  return <Footer initialRetreats={retreats} />
}
