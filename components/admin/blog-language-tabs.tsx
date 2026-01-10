'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Languages, Loader2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { BlogPostTranslation, BlogLanguage } from '@/lib/types/database'

const LANGUAGES: { code: BlogLanguage; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Espanol', flag: '🇪🇸' },
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
]

interface BlogLanguageTabsProps {
  primaryLanguage: BlogLanguage
  translations: Record<string, BlogPostTranslation>
  currentPost: {
    title: string
    slug: string
    excerpt: string
    content: string
    meta_title?: string
    meta_description?: string
  }
  onTranslationChange: (lang: BlogLanguage, translation: BlogPostTranslation) => void
  onTranslateToLanguage: (targetLang: BlogLanguage) => Promise<void>
  onTranslateToAll: () => Promise<void>
  activeTab: BlogLanguage
  onTabChange: (tab: BlogLanguage) => void
  children: (lang: BlogLanguage, translation: BlogPostTranslation | null) => React.ReactNode
}

export function BlogLanguageTabs({
  primaryLanguage,
  translations,
  currentPost,
  onTranslationChange,
  onTranslateToLanguage,
  onTranslateToAll,
  activeTab,
  onTabChange,
  children,
}: BlogLanguageTabsProps) {
  const [translating, setTranslating] = useState<BlogLanguage | 'all' | null>(null)

  const handleTranslateToLanguage = async (targetLang: BlogLanguage) => {
    if (targetLang === primaryLanguage) {
      toast.error('Cannot translate to primary language')
      return
    }

    setTranslating(targetLang)
    try {
      await onTranslateToLanguage(targetLang)
      toast.success(`Translated to ${LANGUAGES.find(l => l.code === targetLang)?.name}`)
    } catch (error) {
      toast.error('Translation failed')
      console.error(error)
    } finally {
      setTranslating(null)
    }
  }

  const handleTranslateToAll = async () => {
    setTranslating('all')
    try {
      await onTranslateToAll()
      toast.success('Translated to all languages')
    } catch (error) {
      toast.error('Translation failed')
      console.error(error)
    } finally {
      setTranslating(null)
    }
  }

  const hasTranslation = (lang: BlogLanguage) => {
    if (lang === primaryLanguage) return true
    return translations[lang] && translations[lang].title && translations[lang].content
  }

  const getTranslation = (lang: BlogLanguage): BlogPostTranslation | null => {
    if (lang === primaryLanguage) {
      return {
        title: currentPost.title,
        slug: currentPost.slug,
        excerpt: currentPost.excerpt,
        content: currentPost.content,
        meta_title: currentPost.meta_title,
        meta_description: currentPost.meta_description,
      }
    }
    return translations[lang] || null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as BlogLanguage)}>
          <TabsList>
            {LANGUAGES.map((lang) => (
              <TabsTrigger
                key={lang.code}
                value={lang.code}
                className="relative"
              >
                <span className="mr-1">{lang.flag}</span>
                {lang.code.toUpperCase()}
                {lang.code === primaryLanguage && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    Primary
                  </Badge>
                )}
                {lang.code !== primaryLanguage && hasTranslation(lang.code) && (
                  <Check className="ml-1 h-3 w-3 text-green-500" />
                )}
                {lang.code !== primaryLanguage && !hasTranslation(lang.code) && (
                  <AlertCircle className="ml-1 h-3 w-3 text-muted-foreground" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={translating !== null || !currentPost.content}
            >
              {translating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Languages className="mr-2 h-4 w-4" />
              )}
              {translating === 'all' ? 'Translating...' : 'Translate'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.filter(l => l.code !== primaryLanguage).map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleTranslateToLanguage(lang.code)}
                disabled={translating !== null}
              >
                <span className="mr-2">{lang.flag}</span>
                Translate to {lang.name}
                {translating === lang.code && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                {hasTranslation(lang.code) && translating !== lang.code && (
                  <Check className="ml-auto h-4 w-4 text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleTranslateToAll}
              disabled={translating !== null}
              className="font-medium"
            >
              <Languages className="mr-2 h-4 w-4" />
              Translate to All Languages
              {translating === 'all' && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4">
        {children(activeTab, getTranslation(activeTab))}
      </div>
    </div>
  )
}

export default BlogLanguageTabs
