import { z } from 'zod'

// Slug regex - URL-friendly
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Blog post validation schema
export const blogPostSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug too long')
    .regex(slugRegex, 'Slug must be lowercase with hyphens only'),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title too long'),
  excerpt: z.string()
    .max(500, 'Excerpt too long')
    .optional()
    .nullable(),
  content: z.string()
    .min(1, 'Content is required')
    .max(100000, 'Content too long'),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  category_id: z.string().uuid('Invalid category ID').optional().nullable(),
  author: z.string().max(100, 'Author name too long').optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  meta_title: z.string().max(100, 'Meta title too long').optional().nullable(),
  meta_description: z.string().max(300, 'Meta description too long').optional().nullable(),
  is_published: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
})

export type BlogPostInput = z.infer<typeof blogPostSchema>

// Blog category validation schema
export const blogCategorySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(slugRegex, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
})

export type BlogCategoryInput = z.infer<typeof blogCategorySchema>
