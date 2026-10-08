export const locales = ['en', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)

export const getDirection = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr')

/** Public URL for a path in a locale: the default locale is un-prefixed, others get `/{locale}`. */
export const localizedHref = (locale: Locale, path = '/') => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (locale === defaultLocale) return normalized
  return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`
}
