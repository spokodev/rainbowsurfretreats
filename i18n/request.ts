import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { locales, defaultLocale, type Locale } from './config'

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value as Locale | undefined

  // Then try Accept-Language header
  const headerStore = await headers()
  const acceptLanguage = headerStore.get('accept-language')

  let locale: Locale = defaultLocale

  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie
  } else if (acceptLanguage) {
    // Parse Accept-Language header
    const browserLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => locales.includes(lang as Locale)) as Locale | undefined

    if (browserLocale) {
      locale = browserLocale
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
