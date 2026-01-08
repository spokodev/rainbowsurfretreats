import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/settings'
import {
  translateText,
  translateTexts,
  SUPPORTED_LANGUAGES,
  type SupportedLanguageCode,
} from '@/lib/deepl'

interface TranslateRequest {
  text?: string
  texts?: string[]
  targetLang: SupportedLanguageCode
}

// POST /api/translate - Translate text using DeepL (admin only)
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
    const body: TranslateRequest = await request.json()
    const { text, texts, targetLang } = body

    // Validate target language
    if (!targetLang || !SUPPORTED_LANGUAGES[targetLang]) {
      return NextResponse.json(
        {
          error: `Invalid target language. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Check for text to translate
    if (!text && (!texts || texts.length === 0)) {
      return NextResponse.json(
        { error: 'Either text or texts must be provided' },
        { status: 400 }
      )
    }

    // Translate single text
    if (text) {
      const translated = await translateText(text, targetLang)
      return NextResponse.json({ translated })
    }

    // Translate multiple texts
    if (texts && texts.length > 0) {
      const translated = await translateTexts(texts, targetLang)
      return NextResponse.json({ translated })
    }

    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  } catch (error) {
    console.error('Translation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('DEEPL_AUTH_KEY')) {
        return NextResponse.json(
          { error: 'DeepL API key not configured' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
