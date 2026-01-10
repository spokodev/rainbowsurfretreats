import type { Metadata } from 'next'
import Contact from '@/components/Contact'
import { getContactHeaderImage } from '@/lib/page-images'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Contact Us - Rainbow Surf Retreats',
    description: 'Get in touch with Rainbow Surf Retreats. We are here to answer your questions about our LGBTQ+ surf adventures and help you plan your perfect retreat.',
    openGraph: {
      title: 'Contact Us - Rainbow Surf Retreats',
      description: 'Get in touch with Rainbow Surf Retreats. We are here to answer your questions about our LGBTQ+ surf adventures.',
    },
  }
}

export const revalidate = 3600 // Revalidate every hour

export default async function ContactPage() {
  const headerImage = await getContactHeaderImage()

  return <Contact headerImage={headerImage} />
}
