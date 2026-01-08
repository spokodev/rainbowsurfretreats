'use client'

import { useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const LANGUAGES = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  nl: 'Dutch',
} as const

type LanguageCode = keyof typeof LANGUAGES

interface TranslateButtonProps {
  text: string
  onTranslated: (translatedText: string, lang: LanguageCode) => void
  disabled?: boolean
  className?: string
}

export function TranslateButton({
  text,
  onTranslated,
  disabled = false,
  className = '',
}: TranslateButtonProps) {
  const [isTranslating, setIsTranslating] = useState(false)

  const handleTranslate = async (targetLang: LanguageCode) => {
    if (!text || !text.trim()) {
      toast.error('No text to translate')
      return
    }

    setIsTranslating(true)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed')
      }

      onTranslated(data.translated, targetLang)
      toast.success(`Translated to ${LANGUAGES[targetLang]}`)
    } catch (error) {
      console.error('Translation error:', error)
      toast.error(error instanceof Error ? error.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isTranslating || !text?.trim()}
          className={className}
        >
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Languages className="h-4 w-4 mr-1" />
          )}
          Translate
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleTranslate(code as LanguageCode)}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TranslateMultipleButtonProps {
  texts: { key: string; value: string }[]
  onTranslated: (results: { key: string; translatedText: string }[], lang: LanguageCode) => void
  disabled?: boolean
  className?: string
  label?: string
}

export function TranslateMultipleButton({
  texts,
  onTranslated,
  disabled = false,
  className = '',
  label = 'Translate All',
}: TranslateMultipleButtonProps) {
  const [isTranslating, setIsTranslating] = useState(false)

  const handleTranslate = async (targetLang: LanguageCode) => {
    const validTexts = texts.filter((t) => t.value && t.value.trim())
    if (validTexts.length === 0) {
      toast.error('No text to translate')
      return
    }

    setIsTranslating(true)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: validTexts.map((t) => t.value),
          targetLang,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed')
      }

      const results = validTexts.map((t, i) => ({
        key: t.key,
        translatedText: data.translated[i],
      }))

      onTranslated(results, targetLang)
      toast.success(`Translated ${results.length} fields to ${LANGUAGES[targetLang]}`)
    } catch (error) {
      console.error('Translation error:', error)
      toast.error(error instanceof Error ? error.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  const hasText = texts.some((t) => t.value && t.value.trim())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isTranslating || !hasText}
          className={className}
        >
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Languages className="h-4 w-4 mr-1" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleTranslate(code as LanguageCode)}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
