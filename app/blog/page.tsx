import type { Metadata } from 'next'
import BlogPageClient from '@/components/BlogPageClient'
import { getBlogHeaderImage } from '@/lib/page-images'

export const metadata: Metadata = {
  title: 'Surf Blog - Rainbow Surf Retreats',
  description: 'Discover surf destinations, travel tips, LGBTQ+ community stories, and wellness advice from Rainbow Surf Retreats.',
}

export const revalidate = 3600 // Revalidate every hour

export default async function BlogPage() {
  const headerImage = await getBlogHeaderImage()

  return <BlogPageClient headerImage={headerImage} />
}
