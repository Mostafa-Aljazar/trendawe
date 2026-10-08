/**
 * Full-page reference screenshots of smmgen.com (desktop + mobile) → docs/screenshots/reference/.
 * Usage: pnpm audit:screenshots [path ...]   (defaults to one URL per design)
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'

import { SOURCE_ORIGIN } from './config'

export const REFERENCE_PAGES = [
  '/',
  '/services',
  '/about-us',
  '/contact-us',
  '/faq',
  '/best-smm-panel',
  '/cheap-smm-panel',
  '/smm-reseller-panel',
  '/wholesale-smm-panel',
  '/white-label-smm-panel',
  '/smm-panel-api',
  '/smm-panel-egypt',
  '/instagram-smm-panel',
  '/pinterest-smm-panel',
  '/buy-instagram-followers',
  '/blog',
  '/blog/threads-vs-instagram',
  '/privacy-policy',
]

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

export const OUT_DIR = path.resolve(process.cwd(), 'docs/screenshots/reference')

export const fileName = (pathname: string, viewport: string, suffix = '') =>
  `${pathname === '/' ? 'home' : pathname.slice(1).replaceAll('/', '__')}${suffix ? `--${suffix}` : ''}.${viewport}.jpg`

/** Scroll to the bottom in steps so lazy images and scroll animations render, then back to top. */
export const settle = async (page: Page) => {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 150))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => Promise.all([...document.fonts].map((font) => font.load().catch(() => null))))
  await page.waitForTimeout(800)
}

const main = async () => {
  const paths = process.argv.slice(2).length ? process.argv.slice(2) : REFERENCE_PAGES
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  for (const pathname of paths) {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const file = path.join(OUT_DIR, fileName(pathname, name))
      if (existsSync(file)) continue
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
      try {
        await page.goto(`${SOURCE_ORIGIN}${pathname}`, { waitUntil: 'networkidle', timeout: 90_000 })
        // Fonts use font-display: optional — reload so they come from cache and actually render.
        await page.reload({ waitUntil: 'networkidle', timeout: 90_000 })
        await settle(page)
        await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 70, animations: 'disabled' })
        console.log(`✓ ${pathname} @ ${name}`)
      } catch (error) {
        console.warn(`✗ ${pathname} @ ${name}: ${(error as Error).message}`)
        process.exitCode = 1
      } finally {
        await page.close()
      }
    }
  }

  await browser.close()
}

await main()
