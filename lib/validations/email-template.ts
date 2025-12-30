import { z } from 'zod'

// Slug regex - URL-friendly
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Email template validation schema
export const emailTemplateSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(slugRegex, 'Slug must be lowercase with hyphens only'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(255, 'Subject too long'),
  html_content: z.string()
    .min(1, 'HTML content is required')
    .max(100000, 'HTML content too long'),
  text_content: z.string().max(50000, 'Text content too long').optional().nullable(),
  category: z.string().max(50, 'Category too long').optional().default('custom'),
  is_active: z.boolean().optional().default(true),
  available_variables: z.array(z.string().max(50, 'Variable name too long')).optional().default([]),
})

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>

// Email template update schema (partial - for PUT requests)
export const emailTemplateUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .optional(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(255, 'Subject too long')
    .optional(),
  html_content: z.string()
    .min(1, 'HTML content is required')
    .max(100000, 'HTML content too long')
    .optional(),
  text_content: z.string().max(50000, 'Text content too long').optional().nullable(),
  category: z.string().max(50, 'Category too long').optional(),
  is_active: z.boolean().optional(),
  available_variables: z.array(z.string().max(50, 'Variable name too long')).optional(),
})

export type EmailTemplateUpdate = z.infer<typeof emailTemplateUpdateSchema>
