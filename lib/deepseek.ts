/**
 * DeepSeek API integration for translation and content generation
 * Uses DeepSeek's chat API for high-quality translations
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// Language names for better translation prompts
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  nl: 'Dutch',
}

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  nl: 'Dutch',
} as const

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

function getApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable')
  }
  return apiKey
}

async function callDeepSeek(messages: DeepSeekMessage[], temperature = 0.3): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
  }

  const data: DeepSeekResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from DeepSeek API')
  }

  return data.choices[0].message.content.trim()
}

/**
 * Translate text to a target language
 */
export async function translateText(
  text: string,
  targetLang: SupportedLanguageCode,
  context?: string
): Promise<string> {
  if (!text.trim()) return ''

  const targetLanguage = LANGUAGE_NAMES[targetLang]

  const systemPrompt = `You are a professional translator. Translate the given text to ${targetLanguage}.
Rules:
- Maintain the original formatting (paragraphs, lists, etc.)
- Keep HTML tags intact if present
- Preserve the tone and style of the original
- Do not add any explanations, just provide the translation
- Keep brand names and proper nouns unchanged unless they have official translations
${context ? `Context: This is content for a surf retreat website targeting LGBTQ+ travelers.` : ''}`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ]

  return callDeepSeek(messages)
}

/**
 * Translate multiple texts to a target language (batch translation)
 */
export async function translateTexts(
  texts: string[],
  targetLang: SupportedLanguageCode
): Promise<string[]> {
  if (texts.length === 0) return []

  // For efficiency, translate all texts in a single request
  const targetLanguage = LANGUAGE_NAMES[targetLang]

  const systemPrompt = `You are a professional translator. Translate each numbered text to ${targetLanguage}.
Rules:
- Return ONLY the translations, one per line, maintaining the same order
- Each translation should be on its own line, prefixed with the same number
- Maintain the original formatting within each text
- Keep HTML tags intact if present
- Keep brand names and proper nouns unchanged
Context: This is content for a surf retreat website targeting LGBTQ+ travelers.`

  const numberedTexts = texts.map((t, i) => `${i + 1}. ${t}`).join('\n\n')

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: numberedTexts },
  ]

  const response = await callDeepSeek(messages)

  // Parse numbered responses
  const lines = response.split('\n').filter(line => line.trim())
  const translations: string[] = []

  let currentNumber = 1
  let currentText = ''

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.*)$/)
    if (match) {
      if (currentText && currentNumber > 0) {
        translations[currentNumber - 1] = currentText.trim()
      }
      currentNumber = parseInt(match[1])
      currentText = match[2]
    } else {
      currentText += '\n' + line
    }
  }

  if (currentText && currentNumber > 0) {
    translations[currentNumber - 1] = currentText.trim()
  }

  // Fallback if parsing fails
  if (translations.length < texts.length) {
    // Simple line-by-line fallback
    const simpleLines = response.split('\n').filter(line => line.trim())
    for (let i = translations.length; i < texts.length && i < simpleLines.length; i++) {
      translations[i] = simpleLines[i].replace(/^\d+\.\s*/, '').trim()
    }
  }

  return translations
}

/**
 * Blog post translation structure
 */
export interface BlogPostTranslation {
  title: string
  slug: string
  excerpt: string
  content: string
  meta_title: string
  meta_description: string
}

export interface BlogPostInput {
  title: string
  slug: string
  excerpt?: string
  content: string
  meta_title?: string
  meta_description?: string
}

/**
 * Generate a URL-friendly slug from translated title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim()
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Translate an entire blog post to a target language
 */
export async function translateBlogPost(
  post: BlogPostInput,
  targetLang: SupportedLanguageCode
): Promise<BlogPostTranslation> {
  const targetLanguage = LANGUAGE_NAMES[targetLang]

  // Prepare texts to translate
  const textsToTranslate = [
    post.title,
    post.excerpt || '',
    post.content,
    post.meta_title || post.title,
    post.meta_description || post.excerpt || '',
  ].filter(t => t.trim())

  const systemPrompt = `You are a professional translator for a surf retreat website (LGBTQ+ focused).
Translate ALL the following content to ${targetLanguage}. Return in JSON format with these exact keys:
{
  "title": "translated title",
  "excerpt": "translated excerpt",
  "content": "translated content (keep HTML formatting)",
  "meta_title": "translated SEO title (50-60 chars recommended)",
  "meta_description": "translated SEO description (150-160 chars recommended)"
}

Rules:
- Maintain HTML tags and formatting in content
- Keep the translations natural and fluent
- Preserve the friendly, welcoming tone
- Keep "Rainbow Surf Retreats" unchanged`

  const userContent = `Title: ${post.title}

Excerpt: ${post.excerpt || '(generate from content)'}

Content:
${post.content}

Meta Title: ${post.meta_title || post.title}

Meta Description: ${post.meta_description || post.excerpt || '(generate from content)'}`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ]

  const response = await callDeepSeek(messages, 0.3)

  // Parse JSON response
  let parsed: Partial<BlogPostTranslation>
  try {
    // Try to extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse blog translation response:', response)
    throw new Error('Failed to parse translation response')
  }

  // Generate slug from translated title
  const translatedSlug = generateSlug(parsed.title || post.title)

  return {
    title: parsed.title || post.title,
    slug: translatedSlug,
    excerpt: parsed.excerpt || post.excerpt || '',
    content: parsed.content || post.content,
    meta_title: parsed.meta_title || parsed.title || post.title,
    meta_description: parsed.meta_description || parsed.excerpt || '',
  }
}

/**
 * Translate a blog post to all supported languages (except source)
 */
export async function translateBlogPostToAll(
  post: BlogPostInput,
  sourceLang: SupportedLanguageCode = 'en'
): Promise<Record<SupportedLanguageCode, BlogPostTranslation>> {
  const targetLangs = (Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguageCode[])
    .filter(lang => lang !== sourceLang)

  const translations = await Promise.all(
    targetLangs.map(async (lang) => {
      const translation = await translateBlogPost(post, lang)
      return { lang, translation }
    })
  )

  const result: Partial<Record<SupportedLanguageCode, BlogPostTranslation>> = {}
  translations.forEach(({ lang, translation }) => {
    result[lang] = translation
  })

  return result as Record<SupportedLanguageCode, BlogPostTranslation>
}

/**
 * Generate SEO-friendly meta description from content
 */
export async function generateMetaDescription(
  content: string,
  lang: SupportedLanguageCode = 'en'
): Promise<string> {
  const language = LANGUAGE_NAMES[lang]

  const systemPrompt = `You are an SEO expert. Create a compelling meta description in ${language} for search engine results.
Rules:
- Maximum 160 characters
- Include a call-to-action if appropriate
- Make it engaging and click-worthy
- Use natural language, avoid keyword stuffing
- Return ONLY the meta description, no quotes or explanations`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a meta description for this content:\n\n${content.slice(0, 1000)}` },
  ]

  const response = await callDeepSeek(messages, 0.7)

  // Ensure it's within limits
  return response.slice(0, 160)
}

/**
 * Generate SEO-friendly meta title from content
 */
export async function generateMetaTitle(
  title: string,
  lang: SupportedLanguageCode = 'en'
): Promise<string> {
  const language = LANGUAGE_NAMES[lang]

  const systemPrompt = `You are an SEO expert. Create a compelling meta title in ${language} for search engine results.
Rules:
- Maximum 60 characters
- Include the main topic
- Make it engaging
- Return ONLY the meta title, no quotes or explanations`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a meta title based on: ${title}` },
  ]

  const response = await callDeepSeek(messages, 0.7)

  // Ensure it's within limits
  return response.slice(0, 60)
}
