// Database types for Rainbow Surf Retreats
// These types match the Supabase schema

export type RetreatLevel = 'Beginners' | 'Intermediate' | 'Advanced' | 'All Levels'
export type RetreatType = 'Budget' | 'Standard' | 'Premium'
export type AvailabilityStatus = 'available' | 'few_spots' | 'sold_out'
export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'deposit' | 'paid' | 'refunded' | 'partial_refund'
export type PaymentType = 'deposit' | 'balance' | 'full' | 'refund'
export type StripePaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'

export interface AboutSection {
  title?: string
  paragraphs: string[]
}

export interface ImportantInfo {
  paymentTerms?: string
  cancellationPolicy?: string
  travelInsurance?: string
  whatToBring?: string
}

// =====================
// RETREAT TYPES
// =====================
export interface Retreat {
  id: string
  destination: string
  location: string
  slug: string | null
  image_url: string | null
  level: RetreatLevel
  duration: string
  participants: string
  food: string
  type: RetreatType
  gear: string
  price: number
  early_bird_price: number | null
  start_date: string
  end_date: string
  description: string | null
  intro_text: string | null
  exact_address: string | null
  address_note: string | null
  pricing_note: string | null
  // Geolocation for maps
  latitude: number | null
  longitude: number | null
  map_zoom: number | null
  country_code: string | null
  availability_status: AvailabilityStatus
  highlights: string[]
  included: string[]
  not_included: string[]
  about_sections: AboutSection[]
  important_info: ImportantInfo
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
  price: number
  deposit_price: number
  capacity: number
  available: number
  is_sold_out: boolean
  sort_order: number
  early_bird_price: number | null
  early_bird_enabled: boolean
  created_at: string
  updated_at: string
}

// For creating/updating retreats
export interface RetreatInsert {
  destination: string
  location: string
  slug?: string | null
  image_url?: string | null
  level: RetreatLevel
  duration: string
  participants: string
  food: string
  type: RetreatType
  gear: string
  price: number
  early_bird_price?: number | null
  start_date: string
  end_date: string
  description?: string | null
  intro_text?: string | null
  exact_address?: string | null
  address_note?: string | null
  pricing_note?: string | null
  // Geolocation for maps
  latitude?: number | null
  longitude?: number | null
  map_zoom?: number | null
  country_code?: string | null
  availability_status?: AvailabilityStatus
  highlights?: string[]
  included?: string[]
  not_included?: string[]
  about_sections?: AboutSection[]
  important_info?: ImportantInfo
  is_published?: boolean
}

export interface RetreatRoomInsert {
  retreat_id: string
  name: string
  description?: string | null
  price: number
  deposit_price: number
  capacity?: number
  available: number
  is_sold_out?: boolean
  sort_order?: number
  early_bird_price?: number | null
  early_bird_enabled?: boolean
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
  price: string // Form uses string for input
  early_bird_price: string
  rooms: RetreatRoomFormData[]
}

export interface RetreatRoomFormData {
  id?: string
  name: string
  description: string
  price: string
  deposit_price: string
  capacity: number
  available: number
  is_sold_out: boolean
  early_bird_price: string
  early_bird_enabled: boolean
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
