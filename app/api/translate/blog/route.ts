import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/settings'
import {
  translateBlogPost,
  translateBlogPostToAll,
  type SupportedLanguageCode,
  type BlogPostInput,
  SUPPORTED_LANGUAGES,
} from '@/lib/deepseek'

interface TranslateBlogRequest {
  post: BlogPostInput
  targetLang?: SupportedLanguageCode
  translateAll?: boolean
  sourceLang?: SupportedLanguageCode
}

// POST /api/translate/blog - Translate blog post using DeepSeek (admin only)
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
    const body: TranslateBlogRequest = await request.json()
    const { post, targetLang, translateAll, sourceLang = 'en' } = body

    // Validate post data
    if (!post || !post.title || !post.content) {
      return NextResponse.json(
        { error: 'Post must have title and content' },
        { status: 400 }
      )
    }

    // Translate to all languages
    if (translateAll) {
      const translations = await translateBlogPostToAll(post, sourceLang)
      return NextResponse.json({ translations })
    }

    // Translate to single target language
    if (!targetLang) {
      return NextResponse.json(
        { error: 'Either targetLang or translateAll must be provided' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_LANGUAGES[targetLang]) {
      return NextResponse.json(
        { error: `Invalid target language. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}` },
        { status: 400 }
      )
    }

    const translation = await translateBlogPost(post, targetLang)
    return NextResponse.json({ translation })

  } catch (error) {
    console.error('Blog translation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('DEEPSEEK_API_KEY')) {
        return NextResponse.json(
          { error: 'DeepSeek API key not configured' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
