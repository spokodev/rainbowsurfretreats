import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/settings'
import {
  generateMetaDescription,
  generateMetaTitle,
  type SupportedLanguageCode,
  SUPPORTED_LANGUAGES,
} from '@/lib/deepseek'

interface GenerateMetaRequest {
  content?: string
  title?: string
  lang?: SupportedLanguageCode
  type: 'description' | 'title' | 'both'
}

// POST /api/translate/generate-meta - Generate SEO meta content using DeepSeek (admin only)
export async function POST(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body: GenerateMetaRequest = await request.json()
    const { content, title, lang = 'en', type } = body

    // Validate language
    if (!SUPPORTED_LANGUAGES[lang]) {
      return NextResponse.json(
        { error: `Invalid language. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}` },
        { status: 400 }
      )
    }

    const result: { meta_description?: string; meta_title?: string } = {}

    // Generate meta description
    if ((type === 'description' || type === 'both') && content) {
      result.meta_description = await generateMetaDescription(content, lang)
    }

    // Generate meta title
    if ((type === 'title' || type === 'both') && title) {
      result.meta_title = await generateMetaTitle(title, lang)
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json(
        { error: 'Provide content for description or title for meta title' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Meta generation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('DEEPSEEK_API_KEY')) {
        return NextResponse.json(
          { error: 'DeepSeek API key not configured' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Meta generation failed' }, { status: 500 })
  }
}
