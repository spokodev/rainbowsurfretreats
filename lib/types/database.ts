// Database types for Rainbow Surf Retreats
// These types match the Supabase schema

export type RetreatLevel = 'Beginners' | 'Intermediate' | 'Advanced' | 'All Levels'
export type AvailabilityStatus = 'available' | 'few_spots' | 'sold_out'
export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'deposit' | 'paid' | 'refunded' | 'partial_refund'
export type PaymentType = 'deposit' | 'balance' | 'full' | 'refund'
export type StripePaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'
export type CustomerType = 'private' | 'business'

export interface AboutSection {
  title?: string
  paragraphs: string[]
}

// =====================
// RETREAT TYPES
// =====================
export interface Retreat {
  id: string
  destination: string
  slug: string | null
  image_url: string | null
  level: RetreatLevel
  duration: string
  participants: string
  food: string
  gear: string
  price: number | null
  early_bird_price: number | null
  start_date: string
  end_date: string
  description: string | null
  intro_text: string | null
  exact_address: string | null
  pricing_note: string | null
  country_code: string | null
  availability_status: AvailabilityStatus
  highlights: string[]
  included: string[]
  not_included: string[]
  about_sections: AboutSection[]
  is_published: boolean
  created_at: string
  updated_at: string
  // Soft delete
  deleted_at: string | null
  deleted_by: string | null
  // Joined data
  rooms?: RetreatRoom[]
}

export interface RetreatRoom {
  id: string
  retreat_id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  deposit_price: number
  capacity: number
  available: number
  is_sold_out: boolean
  is_published: boolean
  sort_order: number
  early_bird_enabled: boolean
  early_bird_deadline: string | null
  created_at: string
  updated_at: string
}

// For creating/updating retreats
export interface RetreatInsert {
  destination: string
  slug?: string | null
  image_url?: string | null
  level: RetreatLevel
  duration: string
  participants: string
  food: string
  gear: string
  price?: number | null
  early_bird_price?: number | null
  start_date: string
  end_date: string
  description?: string | null
  intro_text?: string | null
  exact_address?: string | null
  pricing_note?: string | null
  country_code?: string | null
  availability_status?: AvailabilityStatus
  highlights?: string[]
  included?: string[]
  not_included?: string[]
  about_sections?: AboutSection[]
  is_published?: boolean
}

export interface RetreatRoomInsert {
  retreat_id: string
  name: string
  description?: string | null
  image_url?: string | null
  price: number
  deposit_price: number
  capacity?: number
  available: number
  is_sold_out?: boolean
  is_published?: boolean
  sort_order?: number
  early_bird_enabled?: boolean
  early_bird_deadline?: string | null
}

// =====================
// BLOG TYPES
// =====================
export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  created_at: string
}

// Translation content for a blog post
export interface BlogPostTranslation {
  title: string
  slug: string
  excerpt?: string
  content: string
  meta_title?: string
  meta_description?: string
}

// Supported languages for blog posts
export type BlogLanguage = 'en' | 'de' | 'es' | 'fr' | 'nl'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  author_id: string | null
  author_name: string
  category_id: string | null
  status: BlogStatus
  published_at: string | null
  scheduled_at: string | null
  views: number
  meta_title: string | null
  meta_description: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Multilingual support
  primary_language: BlogLanguage
  translations: Record<BlogLanguage, BlogPostTranslation>
  // Soft delete
  deleted_at: string | null
  deleted_by: string | null
  // Joined data
  category?: BlogCategory
}

export interface BlogPostInsert {
  title: string
  slug: string
  excerpt?: string | null
  content: string
  featured_image_url?: string | null
  author_id?: string | null
  author_name?: string
  category_id?: string | null
  status?: BlogStatus
  published_at?: string | null
  scheduled_at?: string | null
  meta_title?: string | null
  meta_description?: string | null
  tags?: string[]
  // Multilingual support
  primary_language?: BlogLanguage
  translations?: Record<string, BlogPostTranslation>
}

export interface BlogCategoryInsert {
  name: string
  slug: string
  description?: string | null
  color?: string
}

// =====================
// BOOKING TYPES
// =====================
export interface Booking {
  id: string
  booking_number: string
  retreat_id: string
  room_id: string | null
  // Guest Information
  first_name: string
  last_name: string
  email: string
  phone: string | null
  // Billing Address
  billing_address: string | null
  city: string | null
  postal_code: string | null
  country: string
  // Booking Details
  guests_count: number
  check_in_date: string
  check_out_date: string
  // Pricing
  subtotal: number
  discount_amount: number
  discount_code: string | null
  vat_rate: number
  vat_amount: number
  total_amount: number
  deposit_amount: number
  balance_due: number
  // Early Bird
  is_early_bird: boolean
  early_bird_discount: number
  // Stripe
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  // Status
  status: BookingStatus
  payment_status: PaymentStatus
  // Consent
  accept_terms: boolean
  newsletter_opt_in: boolean
  // B2B fields
  customer_type: CustomerType
  company_name: string | null
  vat_id: string | null
  vat_id_valid: boolean
  vat_id_validated_at: string | null
  // Metadata
  notes: string | null
  internal_notes: string | null
  source: string
  language: string // User preferred language for emails (en, de, es, fr, nl)
  created_at: string
  updated_at: string
  // Joined data
  retreat?: Retreat
  room?: RetreatRoom
  payments?: Payment[]
  payment_schedules?: PaymentSchedule[]
}

export interface BookingInsert {
  retreat_id: string
  room_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  billing_address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string
  guests_count?: number
  check_in_date: string
  check_out_date: string
  subtotal: number
  discount_amount?: number
  discount_code?: string | null
  vat_rate?: number
  vat_amount?: number
  total_amount: number
  deposit_amount: number
  balance_due: number
  // Early Bird
  is_early_bird?: boolean
  early_bird_discount?: number
  // Stripe
  stripe_customer_id?: string | null
  stripe_payment_method_id?: string | null
  status?: BookingStatus
  payment_status?: PaymentStatus
  accept_terms?: boolean
  newsletter_opt_in?: boolean
  notes?: string | null
  source?: string
  language?: string // User preferred language for emails (en, de, es, fr, nl)
  // Promo code support
  discount_source?: DiscountSource | null
  promo_code_id?: string | null
  // B2B fields
  customer_type?: CustomerType
  company_name?: string | null
  vat_id?: string | null
  vat_id_valid?: boolean
  vat_id_validated_at?: string | null
}

// =====================
// PAYMENT SCHEDULE TYPES
// =====================
export type PaymentScheduleStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export interface PaymentSchedule {
  id: string
  booking_id: string
  payment_number: number
  amount: number
  due_date: string
  description: string | null
  status: PaymentScheduleStatus
  stripe_payment_intent_id: string | null
  stripe_payment_method_id: string | null
  attempts: number
  max_attempts: number
  last_attempt_at: string | null
  next_retry_at: string | null
  failure_reason: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentScheduleInsert {
  booking_id: string
  payment_number: number
  amount: number
  due_date: string
  description?: string | null
  status?: PaymentScheduleStatus
  stripe_payment_intent_id?: string | null
  stripe_payment_method_id?: string | null
}

// =====================
// PAYMENT TYPES
// =====================
export interface Payment {
  id: string
  booking_id: string
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  stripe_customer_id: string | null
  stripe_webhook_event_id: string | null // For idempotency tracking
  amount: number
  currency: string
  payment_type: PaymentType
  status: StripePaymentStatus
  payment_method: string | null
  receipt_url: string | null
  failure_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PaymentInsert {
  booking_id: string
  stripe_payment_intent_id?: string | null
  stripe_checkout_session_id?: string | null
  stripe_customer_id?: string | null
  stripe_webhook_event_id?: string | null // For idempotency tracking
  amount: number
  currency?: string
  payment_type: PaymentType
  status?: StripePaymentStatus
  payment_method?: string | null
  receipt_url?: string | null
  failure_reason?: string | null
  metadata?: Record<string, unknown>
}

// =====================
// API RESPONSE TYPES
// =====================
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// =====================
// FORM TYPES (for admin forms)
// =====================
export interface RetreatFormData extends Omit<RetreatInsert, 'price' | 'early_bird_price'> {
  // Price is now only set at room level
  rooms: RetreatRoomFormData[]
}

export interface RetreatRoomFormData {
  id?: string
  name: string
  description: string
  image_url: string | null
  price: string
  deposit_price: string
  capacity: number
  available: number
  is_sold_out: boolean
  is_published: boolean
  early_bird_enabled: boolean
  early_bird_deadline: string | null
}

export interface BlogPostFormData extends Omit<BlogPostInsert, 'tags'> {
  tags: string // Comma-separated string for form input
}

// =====================
// TRASH / SOFT DELETE TYPES
// =====================
export interface TrashItem {
  id: string
  item_type: 'retreat' | 'blog_post'
  title: string
  slug: string | null
  deleted_at: string
  deleted_by: string | null
  days_remaining: number
}

// =====================
// PROMO CODE TYPES
// =====================
export type PromoCodeDiscountType = 'percentage' | 'fixed_amount'
export type PromoCodeScope = 'global' | 'retreat' | 'room'
export type DiscountSource = 'early_bird' | 'promo_code'

export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: PromoCodeDiscountType
  discount_value: number
  scope: PromoCodeScope
  retreat_id: string | null
  room_id: string | null
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  current_uses: number
  min_order_amount: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  retreat?: Retreat
  room?: RetreatRoom
}

export interface PromoCodeInsert {
  code: string
  description?: string | null
  discount_type: PromoCodeDiscountType
  discount_value: number
  scope?: PromoCodeScope
  retreat_id?: string | null
  room_id?: string | null
  valid_from?: string
  valid_until?: string | null
  max_uses?: number | null
  min_order_amount?: number | null
  is_active?: boolean
}

export interface PromoCodeRedemption {
  id: string
  promo_code_id: string
  booking_id: string
  original_amount: number
  discount_applied: number
  final_amount: number
  redeemed_at: string
  // Joined data
  promo_code?: PromoCode
  booking?: Booking
}

export interface PromoCodeRedemptionInsert {
  promo_code_id: string
  booking_id: string
  original_amount: number
  discount_applied: number
  final_amount: number
}

// Validation result for promo code check
export interface PromoCodeValidationResult {
  valid: boolean
  promoCode?: PromoCode
  discountAmount?: number
  error?: string
}

// =====================
// WAITLIST TYPES
// =====================
export type WaitlistStatus = 'waiting' | 'notified' | 'accepted' | 'declined' | 'expired' | 'booked'

export interface WaitlistEntry {
  id: string
  retreat_id: string
  room_id: string | null
  email: string
  first_name: string
  last_name: string
  phone: string | null
  guests_count: number
  notes: string | null
  status: WaitlistStatus
  notified_at: string | null
  notification_expires_at: string | null
  responded_at: string | null
  response_token: string | null
  position: number
  created_at: string
  updated_at: string
  // Joined data
  retreat?: Retreat
  room?: RetreatRoom
}

export interface WaitlistEntryInsert {
  retreat_id: string
  room_id?: string | null
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  guests_count?: number
  notes?: string | null
}

export interface WaitlistStats {
  waiting: number
  notified: number
  accepted: number
  declined: number
  expired: number
  booked: number
  total: number
}

// =====================
// EMAIL AUDIT LOG TYPES
// =====================
export type EmailType =
  | 'booking_confirmation'
  | 'payment_failed'
  | 'deadline_reminder'
  | 'booking_cancelled'
  | 'admin_payment_failed'
  | 'admin_waitlist_join'
  | 'admin_new_booking'
  | 'waitlist_spot_available'

export type EmailRecipientType = 'customer' | 'admin'

export type EmailStatus = 'sent' | 'delivered' | 'failed' | 'bounced'

export interface EmailAuditLog {
  id: string
  email_type: string
  recipient_email: string
  recipient_type: EmailRecipientType
  subject: string
  booking_id: string | null
  payment_id: string | null
  resend_email_id: string | null
  status: EmailStatus
  error_message: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  bounce_reason: string | null
  complained_at: string | null
  open_count: number
  click_count: number
  metadata: Record<string, unknown>
  created_at: string
  // Joined data
  booking?: Booking
  payment?: Payment
}

export interface EmailAuditLogInsert {
  email_type: string
  recipient_email: string
  recipient_type?: EmailRecipientType
  subject: string
  booking_id?: string | null
  payment_id?: string | null
  resend_email_id?: string | null
  status?: EmailStatus
  error_message?: string | null
  metadata?: Record<string, unknown>
}

// =====================
// ROOM OCCUPANCY TYPES
// =====================

// Guest info for room occupancy display
export interface RoomGuest {
  booking_id: string
  booking_number: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  guests_count: number
  payment_status: PaymentStatus
  status: BookingStatus
  check_in_date: string
  check_out_date: string
}

// Room with guests for occupancy view
export interface RoomWithGuests extends RetreatRoom {
  guests: RoomGuest[]
  occupied: number // Total guests_count in this room
}

// Unassigned booking (no room assigned yet)
export interface UnassignedBooking {
  id: string
  booking_number: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  guests_count: number
  payment_status: PaymentStatus
  status: BookingStatus
  check_in_date: string
  check_out_date: string
  created_at: string
}

// Room occupancy response from API
export interface RoomOccupancyResponse {
  retreat: {
    id: string
    destination: string
    start_date: string
    end_date: string
    slug: string | null
  }
  rooms: RoomWithGuests[]
  unassigned: UnassignedBooking[]
  waitlist: WaitlistEntry[]
  summary: {
    totalCapacity: number
    totalOccupied: number
    unassignedCount: number
    waitlistCount: number
  }
}
