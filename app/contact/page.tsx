import type { Metadata } from 'next'
import Contact from '@/components/Contact'

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

export default function ContactPage() {
  return <Contact />
}
