'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Loader2, Eye, Globe, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import ImageUpload from './image-upload'
import BlogEditor from './blog-editor'
import { TranslateButton } from './translate-button'
import type { BlogPost, BlogCategory, BlogStatus } from '@/lib/types/database'

// Validation schema
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1, 'Content is required'),
  featured_image_url: z.string().nullable().optional(),
  author_name: z.string().min(1, 'Author name is required'),
  category_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  published_at: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  tags: z.string().optional(), // Comma-separated
})

type BlogFormData = z.infer<typeof blogPostSchema>

interface BlogFormProps {
  post?: BlogPost
  isEdit?: boolean
}

const statusOptions: { value: BlogStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'draft', label: 'Draft', icon: <Eye className="w-4 h-4 mr-1" /> },
  { value: 'published', label: 'Published', icon: <Globe className="w-4 h-4 mr-1" /> },
  { value: 'scheduled', label: 'Scheduled', icon: <Clock className="w-4 h-4 mr-1" /> },
]

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function BlogForm({ post, isEdit = false }: BlogFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/blog/categories')
        const result = await response.json()
        if (result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const defaultValues: BlogFormData = {
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || null,
    content: post?.content || '',
    featured_image_url: post?.featured_image_url || null,
    author_name: post?.author_name || 'Rainbow Surf Team',
    category_id: post?.category_id || null,
    status: post?.status || 'draft',
    published_at: post?.published_at || null,
    scheduled_at: post?.scheduled_at || null,
    meta_title: post?.meta_title || null,
    meta_description: post?.meta_description || null,
    tags: post?.tags?.join(', ') || '',
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues,
  })

  const title = watch('title')
  const status = watch('status')
  const watchedImageUrl = watch('featured_image_url')
  const watchedContent = watch('content')

  // Auto-generate slug from title
  const handleTitleBlur = useCallback(() => {
    const currentSlug = watch('slug')
    if (!currentSlug && title) {
      setValue('slug', generateSlug(title))
    }
  }, [title, watch, setValue])

  const onSubmit = useCallback(async (data: BlogFormData) => {
    setIsSubmitting(true)

    try {
      // Parse tags
      const tags = data.tags
        ? data.tags.split(',').map(t => t.trim()).filter(t => t)
        : []

      // Set published_at for published posts
      let publishedAt = data.published_at
      if (data.status === 'published' && !publishedAt) {
        publishedAt = new Date().toISOString()
      }

      const payload = {
        ...data,
        tags,
        published_at: publishedAt,
      }

      const url = isEdit ? `/api/blog/posts/${post?.id}` : '/api/blog/posts'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save post')
      }

      toast.success(isEdit ? 'Post updated successfully' : 'Post created successfully')
      router.push('/admin/blog')
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save post')
    } finally {
      setIsSubmitting(false)
    }
  }, [isEdit, post?.id, router])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter post title..."
                  className="text-lg font-medium"
                  onBlur={handleTitleBlur}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <Input
                    id="slug"
                    {...register('slug')}
                    placeholder="post-url-slug"
                    className="flex-1"
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Content *</Label>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <BlogEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Write your blog post content here..."
                    />
                  )}
                />
                {errors.content && (
                  <p className="text-sm text-red-500">{errors.content.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  {...register('meta_title')}
                  placeholder="SEO title (defaults to post title)"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 50-60 characters
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <TranslateButton
                    text={watch('meta_description') || ''}
                    onTranslated={(text) => setValue('meta_description', text)}
                  />
                </div>
                <Textarea
                  id="meta_description"
                  {...register('meta_description')}
                  placeholder="SEO description for search results..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 150-160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Publishing */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              {option.icon}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {status === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Schedule Date</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    {...register('scheduled_at')}
                  />
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEdit ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={watchedImageUrl || undefined}
                onChange={(url) => setValue('featured_image_url', url)}
                bucket="blog-images"
              />
            </CardContent>
          </Card>

          {/* Category & Author */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author_name">Author *</Label>
                <Input
                  id="author_name"
                  {...register('author_name')}
                  placeholder="Author name"
                />
                {errors.author_name && (
                  <p className="text-sm text-red-500">{errors.author_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  {...register('tags')}
                  placeholder="surf, travel, wellness (comma separated)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Excerpt */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Excerpt</CardTitle>
                <TranslateButton
                  text={watch('excerpt') || ''}
                  onTranslated={(text) => setValue('excerpt', text)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('excerpt')}
                placeholder="Brief summary for listing pages..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Used in blog listing and social sharing
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

export default BlogForm
