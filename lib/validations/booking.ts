import { z } from 'zod'

// Phone number regex - allows international format
const phoneRegex = /^[+]?[0-9\s\-().]{7,20}$/

// Checkout request validation schema
export const checkoutRequestSchema = z.object({
  retreatId: z.string().uuid('Invalid retreat ID').optional(),
  retreatSlug: z.string().min(1).max(255).optional(),
  roomId: z.string().uuid('Invalid room ID').optional(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name contains invalid characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  billingAddress: z.string().max(500, 'Address too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  postalCode: z.string().max(20, 'Postal code too long').optional(),
  country: z.string()
    .min(2, 'Country is required')
    .max(100, 'Country name too long'),
  guestsCount: z.number()
    .int('Guest count must be an integer')
    .min(1, 'At least 1 guest required')
    .max(10, 'Maximum 10 guests per booking')
    .optional()
    .default(1),
  paymentType: z.enum(['deposit', 'full', 'scheduled'], {
    message: 'Invalid payment type'
  }),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  newsletterOptIn: z.boolean().optional().default(false),
  notes: z.string().max(1000, 'Notes too long').optional(),
  language: z.enum(['en', 'de', 'es', 'fr', 'nl']).optional().default('en'),
  promoCode: z.string().max(50, 'Promo code too long').optional(),
  // B2B fields
  customerType: z.enum(['private', 'business']).optional().default('private'),
  companyName: z.string().max(255, 'Company name too long').optional(),
  vatId: z.string().max(50, 'VAT ID too long').optional(),
  vatIdValid: z.boolean().optional(),
}).refine(
  (data) => data.retreatId || data.retreatSlug,
  { message: 'Either retreatId or retreatSlug is required' }
)

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name contains invalid characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  message: z.string()
    .min(10, 'Message too short')
    .max(5000, 'Message too long'),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
})

export type ContactForm = z.infer<typeof contactFormSchema>

// Newsletter subscription validation schema
export const newsletterSubscribeSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  firstName: z.string()
    .max(100, 'First name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]*$/, 'First name contains invalid characters')
    .optional(),
  source: z.string().max(50).optional().default('website'),
  language: z.enum(['en', 'de', 'es', 'fr', 'nl']).optional().default('en'),
})

export type NewsletterSubscribe = z.infer<typeof newsletterSubscribeSchema>
