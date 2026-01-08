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

const POSTS_PER_PAGE = 6

export default function BlogPage() {
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
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={BLOG_IMAGES.surfingFrance}
            alt="Surf Blog"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
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
              className="pl-12 pr-4 py-6 text-lg bg-white/95 border-0 shadow-lg rounded-full"
            />
          </div>
        </div>
      </section>

      {/* Categories & Content */}
      <section className="py-12 md:py-16 bg-[var(--sand-light)]">
        <div className="container mx-auto px-4">
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
                  className="px-6 py-2.5 rounded-full data-[state=active]:bg-[var(--primary-teal)] data-[state=active]:text-white bg-white shadow-sm border-0 text-gray-700 hover:bg-gray-50 transition-all"
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
