'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BlogCard } from '@/components/BlogCard'
import { blogPosts, blogCategories } from '@/lib/blog-data'
import ImageWithFallback from '@/components/ImageWithFallback'
import { BLOG_IMAGES } from '@/lib/images'
import type { SingleImage } from '@/lib/validations/page-images'
import { SeaShell, Starfish, Bird, WavePattern } from '@/components/illustrations'
import { illustrationOpacity } from '@/lib/animations'

const POSTS_PER_PAGE = 6

// Default header image fallback
const defaultHeaderImage = { url: BLOG_IMAGES.surfingFrance, alt: 'Surf Blog' }

interface BlogPageClientProps {
  headerImage?: SingleImage
}

export default function BlogPageClient({ headerImage }: BlogPageClientProps) {
  const displayHeaderImage = headerImage || defaultHeaderImage
  const t = useTranslations('blog')
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)

  const getCategoryLabel = (slug: string) => {
    const categoryMap: Record<string, string> = {
      'all': t('categories.all'),
      'destinations': t('categories.destinations'),
      'travel-tips': t('categories.travelTips'),
      'lgbtq': t('categories.lgbtq'),
      'wellness': t('categories.wellness'),
      'environment': t('categories.environment'),
    }
    return categoryMap[slug] || slug
  }

  const filteredPosts = useMemo(() => {
    let posts = blogPosts

    // Filter by category
    if (activeCategory !== 'all') {
      posts = posts.filter((post) => post.categorySlug === activeCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.category.toLowerCase().includes(query)
      )
    }

    return posts
  }, [activeCategory, searchQuery])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE)
  }, [activeCategory, searchQuery])

  const visiblePosts = filteredPosts.slice(0, visibleCount)
  const hasMorePosts = filteredPosts.length > visibleCount

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + POSTS_PER_PAGE)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] md:h-[50vh] min-h-[300px] md:min-h-[400px] flex items-center justify-center overflow-hidden">
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

        {/* Decorative Illustration */}
        <Bird
          animated
          className="absolute top-12 right-8 md:right-16 w-12 h-12 md:w-16 md:h-16 text-white pointer-events-none"
          style={{ opacity: illustrationOpacity.blogBird }}
        />

        {/* Wave Pattern - Bottom */}
        <WavePattern
          variant={2}
          animated
          className="absolute bottom-0 left-0 right-0 h-16 md:h-24 text-white pointer-events-none"
          style={{ opacity: illustrationOpacity.heroWave }}
        />

        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t('subtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 sm:py-6 text-base sm:text-lg bg-white/95 border-0 shadow-lg rounded-full"
            />
          </div>
        </div>
      </section>

      {/* Categories & Content */}
      <section className="py-12 md:py-16 bg-[var(--sand-light)] relative overflow-hidden">
        {/* Decorative Illustrations */}
        <SeaShell
          animated
          className="absolute top-16 left-4 w-14 h-14 md:w-20 md:h-20 text-[var(--primary-teal)] rotate-[-10deg] pointer-events-none"
          style={{ opacity: illustrationOpacity.blogShell }}
        />
        <Starfish
          animated
          className="absolute bottom-20 right-8 w-16 h-16 md:w-24 md:h-24 text-[var(--coral-accent)] rotate-[25deg] pointer-events-none hidden md:block"
          style={{ opacity: illustrationOpacity.blogStarfish }}
        />

        <div className="container mx-auto px-4 relative z-10">
          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="mb-10"
          >
            <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0">
              {blogCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.slug}
                  className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-full data-[state=active]:bg-[var(--primary-teal)] data-[state=active]:text-white bg-white shadow-sm border-0 text-gray-700 hover:bg-gray-50 transition-all text-sm sm:text-base"
                >
                  {getCategoryLabel(category.slug)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Blog Grid */}
          {visiblePosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {visiblePosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                {t('noResults')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveCategory('all')
                  setSearchQuery('')
                }}
              >
                {t('clearFilters')}
              </Button>
            </div>
          )}

          {/* Load More Button */}
          {hasMorePosts && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                className="px-8 border-[var(--primary-teal)] text-[var(--primary-teal)] hover:bg-[var(--primary-teal)] hover:text-white"
                onClick={handleLoadMore}
              >
                {t('loadMore')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
