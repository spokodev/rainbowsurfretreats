'use client'

import { useState, useMemo } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BlogCard } from '@/components/BlogCard'
import { blogPosts, blogCategories } from '@/lib/blog-data'

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-teal py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Surf Blog
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Stories, tips, and inspiration from the world of surfing
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search articles..."
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
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Blog Grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                No articles found matching your criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveCategory('all')
                  setSearchQuery('')
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Load More Button */}
          {filteredPosts.length > 0 && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                className="px-8 border-[var(--primary-teal)] text-[var(--primary-teal)] hover:bg-[var(--primary-teal)] hover:text-white"
              >
                Load More Articles
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
