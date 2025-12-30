import { z } from 'zod'

// Phone number regex - allows international format
const phoneRegex = /^[+]?[0-9\s\-().]{7,20}$/

// General settings schema
export const generalSettingsSchema = z.object({
  siteName: z.string().min(1, 'Site name is required').max(255, 'Site name too long'),
  siteDescription: z.string().max(1000, 'Description too long').optional().default(''),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid phone number format').optional().default(''),
})

// Email settings schema
export const emailSettingsSchema = z.object({
  contactEmail: z.string().email('Invalid contact email'),
  supportEmail: z.string().email('Invalid support email'),
})

// Payment settings schema
export const paymentSettingsSchema = z.object({
  currency: z.enum(['EUR', 'USD', 'GBP']),
  depositPercentage: z.number().min(10, 'Minimum deposit is 10%').max(100, 'Maximum deposit is 100%'),
  stripeEnabled: z.boolean(),
})

// Booking settings schema
export const bookingSettingsSchema = z.object({
  autoConfirm: z.boolean(),
  requireDeposit: z.boolean(),
  cancellationDays: z.number().min(1, 'Minimum 1 day').max(365, 'Maximum 365 days'),
  maxParticipants: z.number().min(1, 'Minimum 1 participant').max(100, 'Maximum 100 participants'),
})

// Notifications settings schema
export const notificationsSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  bookingAlerts: z.boolean(),
  paymentAlerts: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyReports: z.boolean(),
})

// Combined site settings schema
export const siteSettingsSchema = z.object({
  general: generalSettingsSchema,
  email: emailSettingsSchema,
  payment: paymentSettingsSchema,
  booking: bookingSettingsSchema,
  notifications: notificationsSettingsSchema,
})

// Type exports
export type GeneralSettings = z.infer<typeof generalSettingsSchema>
export type EmailSettings = z.infer<typeof emailSettingsSchema>
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>
export type BookingSettings = z.infer<typeof bookingSettingsSchema>
export type NotificationsSettings = z.infer<typeof notificationsSettingsSchema>
export type SiteSettings = z.infer<typeof siteSettingsSchema>

// Partial schema for updates (all fields optional)
export const partialSiteSettingsSchema = z.object({
  general: generalSettingsSchema.optional(),
  email: emailSettingsSchema.optional(),
  payment: paymentSettingsSchema.optional(),
  booking: bookingSettingsSchema.optional(),
  notifications: notificationsSettingsSchema.optional(),
})

export type PartialSiteSettings = z.infer<typeof partialSiteSettingsSchema>

// Default values
export const defaultSettings: SiteSettings = {
  general: {
    siteName: 'Rainbow Surf Retreats',
    siteDescription: 'LGBTQ+ surf retreats around the world. Join our inclusive community and catch the perfect wave.',
    phoneNumber: '+1 (555) 123-4567',
  },
  email: {
    contactEmail: 'hello@rainbowsurfretreats.com',
    supportEmail: 'support@rainbowsurfretreats.com',
  },
  payment: {
    currency: 'EUR',
    depositPercentage: 30,
    stripeEnabled: true,
  },
  booking: {
    autoConfirm: false,
    requireDeposit: true,
    cancellationDays: 30,
    maxParticipants: 14,
  },
  notifications: {
    emailNotifications: true,
    bookingAlerts: true,
    paymentAlerts: true,
    marketingEmails: false,
    weeklyReports: true,
  },
}
