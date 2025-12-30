import { createClient } from '@/lib/supabase/server'
import type { PromoCode, PromoCodeValidationResult, DiscountSource } from '@/lib/types/database'

/**
 * Validate a promo code for a specific retreat/room
 * Checks: exists, active, valid dates, usage limits, scope
 */
export async function validatePromoCode(
  code: string,
  retreatId: string,
  roomId?: string | null,
  orderAmount?: number
): Promise<PromoCodeValidationResult> {
  const supabase = await createClient()

  // Normalize code (uppercase, trim)
  const normalizedCode = code.trim().toUpperCase()

  // Fetch promo code
  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single()

  if (error || !promoCode) {
    return { valid: false, error: 'Invalid promo code' }
  }

  const today = new Date().toISOString().split('T')[0]

  // Check valid_from
  if (promoCode.valid_from > today) {
    return { valid: false, error: 'Promo code is not yet active' }
  }

  // Check valid_until
  if (promoCode.valid_until && promoCode.valid_until < today) {
    return { valid: false, error: 'Promo code has expired' }
  }

  // Check usage limit
  if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
    return { valid: false, error: 'Promo code usage limit reached' }
  }

  // Check minimum order amount
  if (promoCode.min_order_amount !== null && orderAmount !== undefined) {
    if (orderAmount < promoCode.min_order_amount) {
      return {
        valid: false,
        error: `Minimum order amount is €${promoCode.min_order_amount}`
      }
    }
  }

  // Check scope
  if (promoCode.scope === 'retreat' && promoCode.retreat_id !== retreatId) {
    return { valid: false, error: 'Promo code is not valid for this retreat' }
  }

  if (promoCode.scope === 'room') {
    if (!roomId || promoCode.room_id !== roomId) {
      return { valid: false, error: 'Promo code is not valid for this room' }
    }
  }

  // Calculate discount amount
  const discountAmount = calculatePromoDiscount(orderAmount || 0, promoCode)

  return {
    valid: true,
    promoCode: promoCode as PromoCode,
    discountAmount
  }
}

/**
 * Calculate the discount amount for a promo code
 */
export function calculatePromoDiscount(basePrice: number, promoCode: PromoCode): number {
  if (promoCode.discount_type === 'percentage') {
    return Math.round((basePrice * promoCode.discount_value) / 100)
  } else {
    // Fixed amount - can't exceed the base price
    return Math.min(promoCode.discount_value, basePrice)
  }
}

/**
 * Calculate early bird discount
 * Standard rule: 10% discount if booking >= 3 months before retreat
 */
export function calculateEarlyBirdDiscount(
  basePrice: number,
  retreatStartDate: Date,
  earlyBirdPercent: number = 10
): number {
  const now = new Date()
  const monthsUntilRetreat = (retreatStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)

  if (monthsUntilRetreat >= 3) {
    return Math.round((basePrice * earlyBirdPercent) / 100)
  }

  return 0
}

/**
 * Check if booking is eligible for early bird discount
 */
export function isEligibleForEarlyBird(retreatStartDate: Date): boolean {
  const now = new Date()
  const monthsUntilRetreat = (retreatStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return monthsUntilRetreat >= 3
}

/**
 * Best Discount Wins - Compare early bird vs promo code and return the better one
 */
export interface BestDiscountResult {
  discountAmount: number
  discountSource: DiscountSource | null
  earlyBirdDiscount: number
  promoDiscount: number
  promoCode: PromoCode | null
  isEarlyBirdEligible: boolean
}

export function determineBestDiscount(
  basePrice: number,
  retreatStartDate: Date,
  promoCode: PromoCode | null,
  roomEarlyBirdPercent?: number
): BestDiscountResult {
  // Calculate early bird discount
  const earlyBirdPercent = roomEarlyBirdPercent || 10
  const isEarlyBirdEligible = isEligibleForEarlyBird(retreatStartDate)
  const earlyBirdDiscount = isEarlyBirdEligible
    ? calculateEarlyBirdDiscount(basePrice, retreatStartDate, earlyBirdPercent)
    : 0

  // Calculate promo code discount
  const promoDiscount = promoCode ? calculatePromoDiscount(basePrice, promoCode) : 0

  // Determine which is better
  if (earlyBirdDiscount === 0 && promoDiscount === 0) {
    return {
      discountAmount: 0,
      discountSource: null,
      earlyBirdDiscount: 0,
      promoDiscount: 0,
      promoCode: null,
      isEarlyBirdEligible: false
    }
  }

  // Best discount wins - if equal, prefer early bird (automatic benefit for customer)
  if (promoDiscount > earlyBirdDiscount) {
    return {
      discountAmount: promoDiscount,
      discountSource: 'promo_code',
      earlyBirdDiscount,
      promoDiscount,
      promoCode,
      isEarlyBirdEligible
    }
  } else {
    // Early bird wins when discounts are equal or early bird is greater
    return {
      discountAmount: earlyBirdDiscount,
      discountSource: 'early_bird',
      earlyBirdDiscount,
      promoDiscount,
      promoCode,
      isEarlyBirdEligible
    }
  }
}

/**
 * Record a promo code redemption with atomic usage limit check
 * Throws error if promo code usage limit has been reached (race condition safe)
 */
export async function recordPromoCodeRedemption(
  promoCodeId: string,
  bookingId: string,
  originalAmount: number,
  discountApplied: number,
  finalAmount: number
): Promise<void> {
  const supabase = await createClient()

  // Atomically try to increment usage - this prevents race conditions
  // where two concurrent checkouts both validate the same code at limit-1
  const { data: incrementSuccess, error: rpcError } = await supabase.rpc(
    'try_increment_promo_code_usage',
    { code_id: promoCodeId }
  )

  if (rpcError) {
    console.error('Error incrementing promo code usage:', rpcError)
    throw new Error('Failed to apply promo code')
  }

  // If atomic increment failed, the usage limit was reached between validation and redemption
  if (!incrementSuccess) {
    throw new Error('Promo code usage limit reached')
  }

  // Insert redemption record
  const { error: insertError } = await supabase.from('promo_code_redemptions').insert({
    promo_code_id: promoCodeId,
    booking_id: bookingId,
    original_amount: originalAmount,
    discount_applied: discountApplied,
    final_amount: finalAmount
  })

  if (insertError) {
    console.error('Error recording promo code redemption:', insertError)
    // Note: Usage was already incremented, but this is acceptable
    // as the promo code was validly used even if audit trail failed
  }
}

/**
 * Get promo code statistics for admin
 */
export async function getPromoCodeStats(promoCodeId: string) {
  const supabase = await createClient()

  const { data: redemptions, error } = await supabase
    .from('promo_code_redemptions')
    .select('discount_applied, original_amount')
    .eq('promo_code_id', promoCodeId)

  if (error || !redemptions) {
    return {
      totalRedemptions: 0,
      totalDiscountGiven: 0,
      totalRevenue: 0,
      averageDiscount: 0
    }
  }

  const totalRedemptions = redemptions.length
  const totalDiscountGiven = redemptions.reduce((sum, r) => sum + r.discount_applied, 0)
  const totalRevenue = redemptions.reduce((sum, r) => sum + (r.original_amount - r.discount_applied), 0)
  const averageDiscount = totalRedemptions > 0 ? totalDiscountGiven / totalRedemptions : 0

  return {
    totalRedemptions,
    totalDiscountGiven,
    totalRevenue,
    averageDiscount
  }
}
