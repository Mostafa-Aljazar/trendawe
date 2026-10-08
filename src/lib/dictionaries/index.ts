import type { Locale } from '@/lib/i18n'

import en from './en.json'

export type Dictionary = typeof en

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./en.json').then((m) => m.default),
  ar: () => import('./ar.json').then((m) => m.default),
}

export const getDictionary = (locale: Locale) => dictionaries[locale]()
