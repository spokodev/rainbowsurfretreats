import { BLOG_IMAGES, RETREAT_IMAGES } from './images'
import type { BlogPost } from '@/components/BlogCard'

export const blogCategories = [
  { id: 'all', name: 'All', slug: 'all' },
  { id: 'destinations', name: 'Destinations', slug: 'destinations' },
  { id: 'travel-tips', name: 'Travel Tips', slug: 'travel-tips' },
  { id: 'lgbtq', name: 'LGBTQ+', slug: 'lgbtq' },
  { id: 'wellness', name: 'Wellness', slug: 'wellness' },
  { id: 'environment', name: 'Environment', slug: 'environment' },
]

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: '10-things-surfing-france',
    title: '10 Things You Need to Know Before You Go Surfing in France',
    excerpt: 'Thinking of surfing in France? Here\'s what you need to know — from hot surfers and heavenly baguettes to smelly cheese, free water, and...',
    category: 'Destinations',
    categorySlug: 'destinations',
    image: BLOG_IMAGES.surfingFrance,
    author: { name: 'Steven' },
    publishedAt: 'Oct 23, 2024',
    readTime: '3 min read',
  },
  {
    id: '2',
    slug: '13-surf-trip-essentials',
    title: 'The 13 Absolute Essentials You Need for Every Surf Trip (Don\'t...)',
    excerpt: 'If you\'re planning a surf trip—whether it\'s your first or your fiftieth—there are a few things that can make or break your experience. From the...',
    category: 'Travel Tips',
    categorySlug: 'travel-tips',
    image: BLOG_IMAGES.surfTripEssentials,
    author: { name: 'Steven' },
    publishedAt: 'Jun 29, 2024',
    readTime: '5 min read',
  },
  {
    id: '3',
    slug: '10-reasons-gay-surf-retreat',
    title: '10 Reasons to Go on a Gay Surf Retreat',
    excerpt: '...and why it\'s way better than a "regular" one. Looking for your next gay adventure? Dreaming of a vacation that\'s more than just a beach...',
    category: 'LGBTQ+',
    categorySlug: 'lgbtq',
    image: BLOG_IMAGES.gaySurfRetreat,
    author: { name: 'Steven' },
    publishedAt: 'Jun 29, 2024',
    readTime: '3 min read',
  },
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getBlogPostsByCategory(categorySlug: string): BlogPost[] {
  if (categorySlug === 'all') {
    return blogPosts
  }
  return blogPosts.filter((post) => post.categorySlug === categorySlug)
}
