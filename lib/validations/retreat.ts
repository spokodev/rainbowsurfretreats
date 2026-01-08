import { z } from 'zod'

// Slug regex - URL-friendly
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Retreat validation schema
export const retreatSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug too long')
    .regex(slugRegex, 'Slug must be lowercase with hyphens only'),
  destination: z.string()
    .min(1, 'Destination is required')
    .max(255, 'Destination too long'),
  tagline: z.string().max(500, 'Tagline too long').optional().nullable(),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  price: z.number()
    .positive('Price must be positive')
    .max(100000, 'Price too high'),
  early_bird_price: z.number()
    .positive('Early bird price must be positive')
    .max(100000, 'Price too high')
    .optional()
    .nullable(),
  capacity: z.number()
    .int('Capacity must be an integer')
    .positive('Capacity must be positive')
    .max(1000, 'Capacity too high')
    .optional()
    .nullable(),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  gallery: z.array(z.string().url('Invalid gallery image URL')).optional().nullable(),
  highlights: z.array(z.string().max(255, 'Highlight too long')).optional().nullable(),
  includes: z.array(z.string().max(255, 'Include item too long')).optional().nullable(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
  }).optional().nullable(),
  meta_title: z.string().max(100, 'Meta title too long').optional().nullable(),
  meta_description: z.string().max(300, 'Meta description too long').optional().nullable(),
  is_published: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
}).refine(
  (data) => {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    return end > start
  },
  { message: 'End date must be after start date', path: ['end_date'] }
).refine(
  (data) => {
    if (data.early_bird_price && data.price) {
      return data.early_bird_price < data.price
    }
    return true
  },
  { message: 'Early bird price must be less than regular price', path: ['early_bird_price'] }
)

export type RetreatInput = z.infer<typeof retreatSchema>

// Retreat room validation schema
export const retreatRoomSchema = z.object({
  name: z.string()
    .min(1, 'Room name is required')
    .max(255, 'Room name too long'),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  price: z.number()
    .positive('Price must be positive')
    .max(100000, 'Price too high'),
  deposit_price: z.number()
    .nonnegative('Deposit must be non-negative')
    .max(100000, 'Deposit too high'),
  early_bird_price: z.number()
    .positive('Early bird price must be positive')
    .max(100000, 'Price too high')
    .optional()
    .nullable(),
  early_bird_enabled: z.boolean().optional().default(false),
  early_bird_deadline: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable(),
  capacity: z.number()
    .int('Capacity must be an integer')
    .positive('Capacity must be positive')
    .max(20, 'Room capacity too high')
    .optional()
    .default(2),
  available: z.number()
    .int('Available count must be an integer')
    .nonnegative('Available count cannot be negative')
    .max(100, 'Available count too high')
    .optional()
    .default(0),
  is_sold_out: z.boolean().optional().default(false),
  amenities: z.array(z.string().max(100, 'Amenity too long')).optional().nullable(),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  sort_order: z.number().int().nonnegative().optional().default(0),
}).refine(
  (data) => {
    if (data.early_bird_enabled && data.early_bird_price && data.price) {
      return data.early_bird_price < data.price
    }
    return true
  },
  { message: 'Early bird price must be less than regular price', path: ['early_bird_price'] }
).refine(
  (data) => data.deposit_price <= data.price,
  { message: 'Deposit cannot exceed price', path: ['deposit_price'] }
)

export type RetreatRoomInput = z.infer<typeof retreatRoomSchema>
