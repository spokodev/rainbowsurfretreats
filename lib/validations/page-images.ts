import { z } from 'zod'

// Single image schema (for page headers)
export const singleImageSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  alt: z.string().max(255, 'Alt text too long').default(''),
})

// Slider image schema (for home page)
export const sliderImageSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  alt: z.string().max(255, 'Alt text too long').default(''),
  sort_order: z.number().int().min(0),
})

// Page keys enum
export const pageKeySchema = z.enum(['home', 'about', 'retreats', 'blog', 'policies', 'contact'])

// Home page images schema
export const homePageImagesSchema = z.object({
  slider: z.array(sliderImageSchema).min(1, 'At least 1 slide required').max(10, 'Maximum 10 slides'),
})

// Other page images schema
export const otherPageImagesSchema = z.object({
  header: singleImageSchema.nullable(),
})

// Complete page images schema
export const pageImagesSchema = z.object({
  home: homePageImagesSchema,
  about: otherPageImagesSchema,
  retreats: otherPageImagesSchema,
  blog: otherPageImagesSchema,
  policies: otherPageImagesSchema,
  contact: otherPageImagesSchema,
})

// Update request schema
export const updatePageImageSchema = z.discriminatedUnion('pageKey', [
  z.object({
    pageKey: z.literal('home'),
    images: homePageImagesSchema,
  }),
  z.object({
    pageKey: z.literal('about'),
    images: otherPageImagesSchema,
  }),
  z.object({
    pageKey: z.literal('retreats'),
    images: otherPageImagesSchema,
  }),
  z.object({
    pageKey: z.literal('blog'),
    images: otherPageImagesSchema,
  }),
  z.object({
    pageKey: z.literal('policies'),
    images: otherPageImagesSchema,
  }),
  z.object({
    pageKey: z.literal('contact'),
    images: otherPageImagesSchema,
  }),
])

// Type exports
export type SingleImage = z.infer<typeof singleImageSchema>
export type SliderImage = z.infer<typeof sliderImageSchema>
export type PageKey = z.infer<typeof pageKeySchema>
export type HomePageImages = z.infer<typeof homePageImagesSchema>
export type OtherPageImages = z.infer<typeof otherPageImagesSchema>
export type PageImages = z.infer<typeof pageImagesSchema>
export type UpdatePageImageRequest = z.infer<typeof updatePageImageSchema>
