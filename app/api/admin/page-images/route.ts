import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/lib/settings'
import { getPageImages, DEFAULT_PAGE_IMAGES } from '@/lib/page-images'
import {
  updatePageImageSchema,
  pageImagesSchema,
  type PageImages,
} from '@/lib/validations/page-images'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/page-images - Get all page images
export async function GET() {
  // Check authentication and admin status
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const images = await getPageImages()
    return NextResponse.json({ data: images, defaults: DEFAULT_PAGE_IMAGES })
  } catch (error) {
    console.error('Page images API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/page-images - Update page images
export async function PUT(request: NextRequest) {
  // Check authentication and admin status
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

    // Validate the update request
    const validationResult = updatePageImageSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      )
    }

    const { pageKey, images } = validationResult.data

    // Get current page images
    const currentImages = await getPageImages()

    // Update the specific page
    const updatedImages: PageImages = {
      ...currentImages,
      [pageKey]: images,
    }

    // Validate the complete structure
    const fullValidation = pageImagesSchema.safeParse(updatedImages)
    if (!fullValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid page images structure',
          details: fullValidation.error.issues,
        },
        { status: 400 }
      )
    }

    // Upsert to site_settings
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: 'page_images',
          value: updatedImages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('Error updating page images:', error)
      return NextResponse.json(
        { error: 'Failed to update page images' },
        { status: 500 }
      )
    }

    // Revalidate affected pages
    const pathsToRevalidate: Record<string, string[]> = {
      home: ['/'],
      about: ['/about'],
      retreats: ['/retreats'],
      blog: ['/blog'],
      policies: ['/policies'],
      contact: ['/'],
    }

    const paths = pathsToRevalidate[pageKey] || []
    for (const path of paths) {
      revalidatePath(path)
    }

    return NextResponse.json({
      success: true,
      message: `Page images for "${pageKey}" updated successfully`,
      data: updatedImages,
    })
  } catch (error) {
    console.error('Update page images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
