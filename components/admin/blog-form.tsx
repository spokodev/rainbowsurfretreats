'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Loader2, Eye, Globe, Clock, Languages, Sparkles, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import ImageUpload from './image-upload'
import BlogEditor from './blog-editor'
import { TranslateButton } from './translate-button'
import type { BlogPost, BlogCategory, BlogStatus, BlogLanguage, BlogPostTranslation } from '@/lib/types/database'

// Language configuration
const LANGUAGES: { code: BlogLanguage; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
]

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
  const [activeLanguage, setActiveLanguage] = useState<BlogLanguage>(post?.primary_language || 'en')
  const [translations, setTranslations] = useState<Record<string, BlogPostTranslation>>(
    post?.translations || {}
  )
  const [isTranslating, setIsTranslating] = useState<BlogLanguage | 'all' | null>(null)

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

  // Helper to check if translation exists
  const hasTranslation = useCallback((lang: BlogLanguage) => {
    if (lang === 'en') return true // Primary always exists
    return translations[lang] && translations[lang].title && translations[lang].content
  }, [translations])

  // Update translation for a specific language
  const updateTranslation = useCallback((lang: BlogLanguage, field: keyof BlogPostTranslation, value: string) => {
    if (lang === 'en') return // Primary language uses form fields
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }))
  }, [])

  // Translate to a single language
  const handleTranslateToLanguage = useCallback(async (targetLang: BlogLanguage) => {
    const currentTitle = watch('title')
    const currentExcerpt = watch('excerpt')
    const currentContent = watch('content')
    const currentMetaTitle = watch('meta_title')
    const currentMetaDescription = watch('meta_description')

    if (!currentTitle || !currentContent) {
      toast.error('Please fill in title and content first')
      return
    }

    setIsTranslating(targetLang)
    try {
      const response = await fetch('/api/translate/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          excerpt: currentExcerpt || '',
          content: currentContent,
          meta_title: currentMetaTitle || '',
          meta_description: currentMetaDescription || '',
          targetLang,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      // Generate slug for translated title
      const translatedSlug = generateSlug(result.data.title)

      setTranslations(prev => ({
        ...prev,
        [targetLang]: {
          ...result.data,
          slug: translatedSlug,
        },
      }))

      toast.success(`Translated to ${LANGUAGES.find(l => l.code === targetLang)?.name}`)
      setActiveLanguage(targetLang)
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Translation failed. Please try again.')
    } finally {
      setIsTranslating(null)
    }
  }, [watch])

  // Translate to all languages
  const handleTranslateToAll = useCallback(async () => {
    const currentTitle = watch('title')
    const currentExcerpt = watch('excerpt')
    const currentContent = watch('content')
    const currentMetaTitle = watch('meta_title')
    const currentMetaDescription = watch('meta_description')

    if (!currentTitle || !currentContent) {
      toast.error('Please fill in title and content first')
      return
    }

    setIsTranslating('all')
    try {
      const response = await fetch('/api/translate/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          excerpt: currentExcerpt || '',
          content: currentContent,
          meta_title: currentMetaTitle || '',
          meta_description: currentMetaDescription || '',
          targetLang: 'all',
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      // Add slugs to each translation
      const translationsWithSlugs: Record<string, BlogPostTranslation> = {}
      for (const [lang, translation] of Object.entries(result.data as Record<string, BlogPostTranslation>)) {
        translationsWithSlugs[lang] = {
          ...translation,
          slug: generateSlug(translation.title),
        }
      }

      setTranslations(translationsWithSlugs)
      toast.success('Translated to all languages!')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Translation failed. Please try again.')
    } finally {
      setIsTranslating(null)
    }
  }, [watch])

  // Generate meta description from content
  const handleGenerateMeta = useCallback(async (lang: BlogLanguage) => {
    const content = lang === 'en' ? watch('content') : translations[lang]?.content
    if (!content) {
      toast.error('Please add content first')
      return
    }

    try {
      const response = await fetch('/api/translate/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, lang, type: 'description' }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      if (lang === 'en') {
        setValue('meta_description', result.data)
      } else {
        updateTranslation(lang, 'meta_description', result.data)
      }
      toast.success('Meta description generated!')
    } catch (error) {
      console.error('Generate meta error:', error)
      toast.error('Failed to generate meta description')
    }
  }, [watch, translations, setValue, updateTranslation])

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
        primary_language: 'en' as BlogLanguage,
        translations: translations,
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
  }, [isEdit, post?.id, router, translations])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Main Content - Left Column */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4 md:space-y-6">
          {/* Language Tabs and Translate Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <Tabs value={activeLanguage} onValueChange={(v) => setActiveLanguage(v as BlogLanguage)}>
                  <TabsList className="flex-wrap h-auto">
                    {LANGUAGES.map((lang) => (
                      <TabsTrigger
                        key={lang.code}
                        value={lang.code}
                        className="relative flex items-center gap-1"
                      >
                        <span>{lang.flag}</span>
                        <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
                        {lang.code === 'en' && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                            Primary
                          </Badge>
                        )}
                        {lang.code !== 'en' && hasTranslation(lang.code) && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                        {lang.code !== 'en' && !hasTranslation(lang.code) && (
                          <AlertCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isTranslating !== null || !watchedContent}
                    >
                      {isTranslating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Languages className="mr-2 h-4 w-4" />
                      )}
                      {isTranslating === 'all' ? 'Translating...' : 'Translate'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {LANGUAGES.filter(l => l.code !== 'en').map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleTranslateToLanguage(lang.code)}
                        disabled={isTranslating !== null}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        Translate to {lang.name}
                        {isTranslating === lang.code && (
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        )}
                        {hasTranslation(lang.code) && isTranslating !== lang.code && (
                          <Check className="ml-auto h-4 w-4 text-green-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleTranslateToAll}
                      disabled={isTranslating !== null}
                      className="font-medium"
                    >
                      <Languages className="mr-2 h-4 w-4" />
                      Translate to All Languages
                      {isTranslating === 'all' && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {activeLanguage !== 'en' && !hasTranslation(activeLanguage) && (
                <div className="mb-4 p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                  <p>No translation for {LANGUAGES.find(l => l.code === activeLanguage)?.name} yet.</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => handleTranslateToLanguage(activeLanguage)}
                    disabled={isTranslating !== null || !watchedContent}
                  >
                    Click here to translate from English
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Post Content
                {activeLanguage !== 'en' && (
                  <Badge variant="outline" className="ml-2">
                    {LANGUAGES.find(l => l.code === activeLanguage)?.flag} {LANGUAGES.find(l => l.code === activeLanguage)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* English (Primary) Content */}
              {activeLanguage === 'en' && (
                <>
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
                </>
              )}

              {/* Translated Content */}
              {activeLanguage !== 'en' && hasTranslation(activeLanguage) && (
                <>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={translations[activeLanguage]?.title || ''}
                      onChange={(e) => updateTranslation(activeLanguage, 'title', e.target.value)}
                      placeholder="Translated title..."
                      className="text-lg font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/{activeLanguage}/blog/</span>
                      <Input
                        value={translations[activeLanguage]?.slug || ''}
                        onChange={(e) => updateTranslation(activeLanguage, 'slug', e.target.value)}
                        placeholder="translated-slug"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <BlogEditor
                      content={translations[activeLanguage]?.content || ''}
                      onChange={(value) => updateTranslation(activeLanguage, 'content', value)}
                      placeholder="Translated content..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>
                SEO Settings
                {activeLanguage !== 'en' && (
                  <Badge variant="outline" className="ml-2">
                    {LANGUAGES.find(l => l.code === activeLanguage)?.flag}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* English SEO */}
              {activeLanguage === 'en' && (
                <>
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
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateMeta('en')}
                          disabled={!watchedContent}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      </div>
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
                </>
              )}

              {/* Translated SEO */}
              {activeLanguage !== 'en' && hasTranslation(activeLanguage) && (
                <>
                  <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                      value={translations[activeLanguage]?.meta_title || ''}
                      onChange={(e) => updateTranslation(activeLanguage, 'meta_title', e.target.value)}
                      placeholder="SEO title for this language..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 50-60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateMeta(activeLanguage)}
                        disabled={!translations[activeLanguage]?.content}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <Textarea
                      value={translations[activeLanguage]?.meta_description || ''}
                      onChange={(e) => updateTranslation(activeLanguage, 'meta_description', e.target.value)}
                      placeholder="SEO description for this language..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 150-160 characters
                    </p>
                  </div>
                </>
              )}

              {activeLanguage !== 'en' && !hasTranslation(activeLanguage) && (
                <p className="text-muted-foreground text-center py-4">
                  Translate the post first to edit SEO settings for this language.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-4 md:space-y-6">
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
                <CardTitle>
                  Excerpt
                  {activeLanguage !== 'en' && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {LANGUAGES.find(l => l.code === activeLanguage)?.flag}
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {activeLanguage === 'en' ? (
                <>
                  <Textarea
                    {...register('excerpt')}
                    placeholder="Brief summary for listing pages..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Used in blog listing and social sharing
                  </p>
                </>
              ) : hasTranslation(activeLanguage) ? (
                <>
                  <Textarea
                    value={translations[activeLanguage]?.excerpt || ''}
                    onChange={(e) => updateTranslation(activeLanguage, 'excerpt', e.target.value)}
                    placeholder="Translated excerpt..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Excerpt for {LANGUAGES.find(l => l.code === activeLanguage)?.name}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Translate the post first.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

export default BlogForm
