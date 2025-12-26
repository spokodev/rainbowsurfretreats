'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  categorySlug: string
  image: string
  author: {
    name: string
    avatar?: string
  }
  publishedAt: string
  readTime: string
}

const categoryColors: Record<string, string> = {
  destinations: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  'travel-tips': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  lgbtq: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
  wellness: 'bg-green-100 text-green-800 hover:bg-green-200',
  environment: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
}

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  const categoryColor = categoryColors[post.categorySlug] || 'bg-gray-100 text-gray-800'

  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="group h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-4 left-4">
            <Badge className={`${categoryColor} font-medium`}>
              {post.category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-5">
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[var(--primary-teal)] transition-colors">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {post.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{post.author.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.publishedAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default BlogCard
