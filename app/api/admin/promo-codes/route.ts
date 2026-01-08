import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { z } from 'zod'
import { getPromoCodeStats } from '@/lib/promo-codes'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Validation schema for promo code
const promoCodeSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be less than 50 characters')
    .transform((val) => val.toUpperCase().trim()),
  description: z.string().max(500).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().positive('Discount value must be positive'),
  scope: z.enum(['global', 'retreat', 'room']).default('global'),
  retreat_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  min_order_amount: z.number().positive().optional().nullable(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    // If percentage, must be <= 100
    if (data.discount_type === 'percentage' && data.discount_value > 100) {
      return false
    }
    return true
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discount_value'] }
).refine(
  (data) => {
    // If scope is retreat, retreat_id is required
    if (data.scope === 'retreat' && !data.retreat_id) {
      return false
    }
    return true
  },
  { message: 'Retreat ID is required for retreat-scoped codes', path: ['retreat_id'] }
).refine(
  (data) => {
    // If scope is room, room_id is required
    if (data.scope === 'room' && !data.room_id) {
      return false
    }
    return true
  },
  { message: 'Room ID is required for room-scoped codes', path: ['room_id'] }
)

// GET /api/admin/promo-codes - List all promo codes
export async function GET(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const searchParams = request.nextUrl.searchParams
    const includeStats = searchParams.get('stats') === 'true'
    const activeOnly = searchParams.get('active') === 'true'

    // New params
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || '' // active, inactive
    const discountType = searchParams.get('type') || '' // percentage, fixed_amount

    let query = supabase
      .from('promo_codes')
      .select(`
        *,
        retreat:retreats(id, destination, start_date),
        room:retreat_rooms(id, name, retreat_id)
      `, { count: 'exact' })

    // Sorting
    const validSortColumns = ['created_at', 'code', 'valid_from', 'valid_until', 'current_uses']
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at'
    const ascending = order === 'asc'
    query = query.order(sortColumn, { ascending })

    // Legacy filter
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    // New status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Discount type filter
    if (discountType && discountType !== 'all') {
      query = query.eq('discount_type', discountType)
    }

    // Search
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Pagination
    if (searchParams.has('page')) {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching promo codes:', error)
      return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 })
    }

    // Optionally add stats for each code
    let codesWithStats = data
    if (includeStats) {
      codesWithStats = await Promise.all(
        data.map(async (code) => {
          const stats = await getPromoCodeStats(code.id)
          return { ...code, stats }
        })
      )
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      data: codesWithStats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      }
    })
  } catch (error) {
    console.error('Promo codes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/promo-codes - Create a new promo code
export async function POST(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()

    // Validate input
    const validationResult = promoCodeSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    const promoData = validationResult.data

    // Check if code already exists
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', promoData.code)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 })
    }

    // Clear unnecessary fields based on scope
    if (promoData.scope === 'global') {
      promoData.retreat_id = null
      promoData.room_id = null
    } else if (promoData.scope === 'retreat') {
      promoData.room_id = null
    }

    // Insert promo code
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: promoData.code,
        description: promoData.description,
        discount_type: promoData.discount_type,
        discount_value: promoData.discount_value,
        scope: promoData.scope,
        retreat_id: promoData.retreat_id,
        room_id: promoData.room_id,
        valid_from: promoData.valid_from || new Date().toISOString().split('T')[0],
        valid_until: promoData.valid_until,
        max_uses: promoData.max_uses,
        min_order_amount: promoData.min_order_amount,
        is_active: promoData.is_active,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating promo code:', error)
      return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Create promo code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/promo-codes - Update a promo code
export async function PUT(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Promo code ID is required' }, { status: 400 })
    }

    // Partial validation for update
    const updateSchema = promoCodeSchema.partial()
    const validationResult = updateSchema.safeParse(updateData)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    const promoData = validationResult.data

    // If code is being changed, check for duplicates
    if (promoData.code) {
      const { data: existing } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', promoData.code)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 })
      }
    }

    // Update promo code
    const { data, error } = await supabase
      .from('promo_codes')
      .update({
        ...promoData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating promo code:', error)
      return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Update promo code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/promo-codes - Delete a promo code
export async function DELETE(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Promo code ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting promo code:', error)
      return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete promo code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
