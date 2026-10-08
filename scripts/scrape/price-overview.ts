/**
 * /cheap-smm-panel "Price Overview" tabs render only the first platform server-side; the rest
 * live in client JS. Click each tab with Playwright and capture its price cards
 * → data/source/extras/cheap-price-overview.json (merged by parse-singletons).
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

import { SOURCE_ORIGIN } from './config'
import { SOURCE_DIR } from './lib'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
// tsx (esbuild keepNames) wraps functions in __name(); define it inside the page.
await page.addInitScript({ content: 'window.__name = (fn) => fn' })
await page.goto(`${SOURCE_ORIGIN}/cheap-smm-panel`, { waitUntil: 'networkidle', timeout: 90_000 })

const section = page.locator('main section').filter({ has: page.getByRole('heading', { name: /Price Overview/i }) }).first()
const tabs = section.locator('button.rounded-xl')
const count = await tabs.count()
const result = []

for (let i = 0; i < count; i++) {
  const tab = tabs.nth(i)
  await tab.click()
  await page.waitForTimeout(500)
  const label = (await tab.innerText()).trim()
  const icon = await tab.locator('img').first().getAttribute('src')
  const items = await section.evaluate((root) =>
    [...root.querySelectorAll('h3')].map((h3) => {
      let card = h3.parentElement!
      while (card.parentElement && card.parentElement.querySelectorAll('h3').length === 1) card = card.parentElement
      const text = (sel: string) => card.querySelector(sel)?.textContent?.trim() ?? ''
      const price = [...card.querySelectorAll('span')].find((s) => /^From \$/.test(s.textContent?.trim() ?? ''))
      const unit = [...card.querySelectorAll('div')].find((d) => /^Per /i.test(d.textContent?.trim() ?? ''))
      const cta = card.querySelector('a')
      return {
        title: h3.textContent?.trim() ?? '',
        price: price?.textContent?.trim() ?? '',
        unit: unit?.textContent?.trim() ?? '',
        cta: cta ? { label: cta.textContent?.trim() ?? '', href: cta.getAttribute('href') } : null,
        image: text('img') || (card.querySelector('img')?.getAttribute('src') ?? null),
      }
    }),
  )
  result.push({ label, icon, items })
  console.log(`✓ ${label}: ${items.length} services`)
}

await browser.close()
const dir = path.join(SOURCE_DIR, 'extras')
await mkdir(dir, { recursive: true })
await writeFile(path.join(dir, 'cheap-price-overview.json'), `${JSON.stringify(result, null, 2)}\n`)
