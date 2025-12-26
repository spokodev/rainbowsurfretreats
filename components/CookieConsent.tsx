"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Cookie, Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const CONSENT_KEY = "cookie_consent"
const CONSENT_PREFERENCES_KEY = "cookie_preferences"

interface CookiePreferences {
  necessary: boolean // Always true
  analytics: boolean
  marketing: boolean
}

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
}

export function CookieConsent() {
  const t = useTranslations('cookies')
  const tCommon = useTranslations('common')
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences)

  useEffect(() => {
    // Check if consent has been given
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid hydration issues
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      // Load saved preferences
      const savedPrefs = localStorage.getItem(CONSENT_PREFERENCES_KEY)
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs))
      }
    }
  }, [])

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    saveConsent(allAccepted)
  }

  const acceptNecessary = () => {
    saveConsent(defaultPreferences)
  }

  const savePreferences = () => {
    saveConsent(preferences)
    setShowSettings(false)
  }

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString())
    localStorage.setItem(CONSENT_PREFERENCES_KEY, JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)

    // Initialize analytics if accepted
    if (prefs.analytics) {
      // TODO: Initialize Google Analytics or other analytics
      console.log("Analytics cookies accepted")
    }

    if (prefs.marketing) {
      // TODO: Initialize marketing cookies (Facebook Pixel, etc.)
      console.log("Marketing cookies accepted")
    }
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background border-t shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{t('title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('description')}{" "}
                  <Link href="/privacy-policy" className="text-primary hover:underline">
                    {t('learnMore')}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex-1 md:flex-none"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('customize')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={acceptNecessary}
                className="flex-1 md:flex-none"
              >
                {t('necessary')}
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="flex-1 md:flex-none"
              >
                {t('accept')}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 md:static"
              onClick={acceptNecessary}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{tCommon('close')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('preferences.title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">{t('preferences.necessary.title')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('preferences.necessary.description')}
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">{t('preferences.analytics.title')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('preferences.analytics.description')}
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">{t('preferences.marketing.title')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('preferences.marketing.description')}
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={savePreferences}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook to check cookie preferences
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const savedPrefs = localStorage.getItem(CONSENT_PREFERENCES_KEY)
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs))
    }
  }, [])

  return {
    hasConsent: preferences !== null,
    preferences,
    hasAnalytics: preferences?.analytics ?? false,
    hasMarketing: preferences?.marketing ?? false,
  }
}
