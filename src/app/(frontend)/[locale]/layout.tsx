import { Cairo } from 'next/font/google'
import { notFound } from 'next/navigation'

import { getDirection, isLocale, locales } from '@/lib/i18n'

import '../globals.css'

// Latin font is set during the design audit (docs/design-tokens.md).
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' })

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <html lang={locale} dir={getDirection(locale)} className={cairo.variable}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
