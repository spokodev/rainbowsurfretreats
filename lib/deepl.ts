import * as deepl from 'deepl-node'

let translatorInstance: deepl.Translator | null = null

function getTranslator(): deepl.Translator {
  if (!translatorInstance) {
    const authKey = process.env.DEEPL_AUTH_KEY
    if (!authKey) {
      throw new Error('Missing DEEPL_AUTH_KEY environment variable')
    }
    translatorInstance = new deepl.Translator(authKey)
  }
  return translatorInstance
}

// Supported target languages for the site
export const SUPPORTED_LANGUAGES = {
  en: 'EN-US',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  nl: 'NL',
} as const

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES

/**
 * Translate text to a target language
 */
export async function translateText(
  text: string,
  targetLang: SupportedLanguageCode
): Promise<string> {
  const translator = getTranslator()
  const deeplTargetLang = SUPPORTED_LANGUAGES[targetLang] as deepl.TargetLanguageCode

  const result = await translator.translateText(text, null, deeplTargetLang)

  // result can be a single TextResult or an array
  if (Array.isArray(result)) {
    return result.map((r) => r.text).join('\n')
  }
  return result.text
}

/**
 * Translate multiple texts to a target language
 */
export async function translateTexts(
  texts: string[],
  targetLang: SupportedLanguageCode
): Promise<string[]> {
  const translator = getTranslator()
  const deeplTargetLang = SUPPORTED_LANGUAGES[targetLang] as deepl.TargetLanguageCode

  // When passing an array, the result is always an array
  const results = await translator.translateText(texts, null, deeplTargetLang) as deepl.TextResult[]

  return results.map((r) => r.text)
}

/**
 * Translate an object's string values to a target language
 * Useful for translating retreat fields at once
 */
export async function translateObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  targetLang: SupportedLanguageCode
): Promise<Partial<T>> {
  const textsToTranslate: string[] = []
  const fieldMap: { field: keyof T; index: number }[] = []

  fields.forEach((field) => {
    const value = obj[field]
    if (typeof value === 'string' && value.trim()) {
      fieldMap.push({ field, index: textsToTranslate.length })
      textsToTranslate.push(value)
    }
  })

  if (textsToTranslate.length === 0) {
    return {}
  }

  const translated = await translateTexts(textsToTranslate, targetLang)

  const result: Partial<T> = {}
  fieldMap.forEach(({ field, index }) => {
    result[field] = translated[index] as T[keyof T]
  })

  return result
}

/**
 * Get remaining character count for the API key
 */
export async function getUsage(): Promise<{ characterCount: number; characterLimit: number }> {
  const translator = getTranslator()
  const usage = await translator.getUsage()

  return {
    characterCount: usage.character?.count ?? 0,
    characterLimit: usage.character?.limit ?? 0,
  }
}
