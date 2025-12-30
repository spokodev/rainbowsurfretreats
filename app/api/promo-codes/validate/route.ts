import { NextRequest, NextResponse } from 'next/server'
import { validatePromoCode, determineBestDiscount } from '@/lib/promo-codes'

/**
 * POST /api/promo-codes/validate
 * Validate a promo code and return discount information
 * Also compares with early bird to show "Best Discount Wins" logic
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, retreatId, roomId, orderAmount, retreatStartDate, roomEarlyBirdPercent } = body

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    if (!retreatId) {
      return NextResponse.json({ error: 'Retreat ID is required' }, { status: 400 })
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json({ error: 'Valid order amount is required' }, { status: 400 })
    }

    // Validate the promo code
    const validation = await validatePromoCode(code, retreatId, roomId, orderAmount)

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error
      })
    }

    // If we have a retreat start date, compare with early bird discount
    if (retreatStartDate && validation.promoCode) {
      const startDate = new Date(retreatStartDate)
      const bestDiscount = determineBestDiscount(
        orderAmount,
        startDate,
        validation.promoCode,
        roomEarlyBirdPercent
      )

      return NextResponse.json({
        valid: true,
        promoCode: {
          code: validation.promoCode.code,
          discountType: validation.promoCode.discount_type,
          discountValue: validation.promoCode.discount_value,
        },
        discount: {
          amount: bestDiscount.discountAmount,
          source: bestDiscount.discountSource,
          promoDiscount: bestDiscount.promoDiscount,
          earlyBirdDiscount: bestDiscount.earlyBirdDiscount,
          isEarlyBirdEligible: bestDiscount.isEarlyBirdEligible,
          appliedDiscount: bestDiscount.discountSource === 'promo_code' ? 'promo' : 'early_bird',
          message: bestDiscount.discountSource === 'promo_code'
            ? `Promo code applied: -€${bestDiscount.promoDiscount}`
            : bestDiscount.isEarlyBirdEligible
              ? `Early bird discount applied (better than promo): -€${bestDiscount.earlyBirdDiscount}`
              : `Promo code applied: -€${bestDiscount.promoDiscount}`,
        },
        finalAmount: orderAmount - bestDiscount.discountAmount,
      })
    }

    // Simple response without early bird comparison
    return NextResponse.json({
      valid: true,
      promoCode: {
        code: validation.promoCode!.code,
        discountType: validation.promoCode!.discount_type,
        discountValue: validation.promoCode!.discount_value,
      },
      discount: {
        amount: validation.discountAmount,
        source: 'promo_code',
      },
      finalAmount: orderAmount - (validation.discountAmount || 0),
    })
  } catch (error) {
    console.error('Promo code validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
