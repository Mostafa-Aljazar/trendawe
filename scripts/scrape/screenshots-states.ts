/**
 * Interaction-state reference screenshots of smmgen.com → docs/screenshots/reference/states/.
 * Menus (desktop + mobile drawer), FAQ accordion, platform tabs.
 */
import { chromium, type Locator, type Page } from '@playwright/test'
import { mkdir } from 'fs/promises'
import path from 'path'

import { SOURCE_ORIGIN } from './config'

const OUT_DIR = path.resolve(process.cwd(), 'docs/screenshots/reference/states')
const shot = async (page: Page, name: string) => {
  await page.evaluate(() => Promise.all([...document.fonts].map((font) => font.load().catch(() => null))))
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.jpg`), type: 'jpeg', quality: 75 })
}

/** Menus may open on hover or on click — try hover first. */
const open = async (page: Page, trigger: Locator) => {
  await trigger.hover()
  await page.waitForTimeout(500)
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click()
    await page.waitForTimeout(500)
  }
}

const closeMenus = async (page: Page) => {
  await page.keyboard.press('Escape')
  await page.mouse.move(720, 600)
  await page.waitForTimeout(400)
}

const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.warn(`✗ ${name}: ${(error as Error).message.split('\n')[0]}`)
    process.exitCode = 1
  }
}

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch()

// Desktop menus
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await desktop.goto(SOURCE_ORIGIN, { waitUntil: 'networkidle', timeout: 90_000 })
// Fonts use font-display: optional — reload so they come from cache and actually render.
await desktop.reload({ waitUntil: 'networkidle', timeout: 90_000 })
await desktop.evaluate(() => Promise.all([...document.fonts].map((font) => font.load().catch(() => null))))
await desktop.waitForTimeout(1500)
const header = desktop.locator('header')

await run('services menu', async () => {
  await open(desktop, header.getByRole('button', { name: 'Services' }))
  await shot(desktop, 'menu-services.desktop')
  await header.getByRole('link', { name: 'Instagram SMM Panel' }).hover()
  await desktop.waitForTimeout(600)
  await shot(desktop, 'menu-services-submenu.desktop')
  await closeMenus(desktop)
})
await run('service area menu', async () => {
  await open(desktop, header.getByRole('button', { name: 'Service Area' }))
  await shot(desktop, 'menu-service-area.desktop')
  await closeMenus(desktop)
})
await run('company menu', async () => {
  await open(desktop, header.getByRole('button', { name: 'Company' }))
  await shot(desktop, 'menu-company.desktop')
  await closeMenus(desktop)
})
await run('nav link hover', async () => {
  await header.getByRole('link', { name: 'About us' }).hover()
  await desktop.waitForTimeout(300)
  await desktop.screenshot({ path: path.join(OUT_DIR, 'nav-hover.desktop.jpg'), type: 'jpeg', quality: 75, clip: { x: 0, y: 0, width: 1440, height: 100 } })
  await closeMenus(desktop)
})
await run('platform tabs', async () => {
  const tabs = desktop.getByRole('tab')
  await tabs.first().scrollIntoViewIfNeeded()
  await desktop.waitForTimeout(800)
  await shot(desktop, 'platform-tabs-default.desktop')
  await tabs.nth(2).click()
  await desktop.waitForTimeout(800)
  await shot(desktop, 'platform-tabs-selected.desktop')
})
await run('faq accordion', async () => {
  const trigger = desktop.locator('[aria-controls][data-state]').first()
  await trigger.scrollIntoViewIfNeeded()
  await desktop.evaluate(() => window.scrollBy(0, -150))
  await desktop.waitForTimeout(500)
  await shot(desktop, 'faq-closed.desktop')
  await trigger.click()
  await desktop.waitForTimeout(800)
  await shot(desktop, 'faq-open.desktop')
})
await desktop.close()

// Mobile drawer
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto(SOURCE_ORIGIN, { waitUntil: 'networkidle', timeout: 90_000 })
// Fonts use font-display: optional — reload so they come from cache and actually render.
await mobile.reload({ waitUntil: 'networkidle', timeout: 90_000 })
await mobile.evaluate(() => Promise.all([...document.fonts].map((font) => font.load().catch(() => null))))
await mobile.waitForTimeout(1500)
await run('mobile drawer', async () => {
  await shot(mobile, 'header.mobile')
  // The hamburger is the last visible button in the header on mobile.
  const toggle = mobile.locator('header button:visible').last()
  await toggle.click()
  await mobile.waitForTimeout(800)
  await shot(mobile, 'drawer-open.mobile')
  const group = mobile.getByRole('button', { name: 'Services' }).last()
  await group.click()
  await mobile.waitForTimeout(600)
  await shot(mobile, 'drawer-services-open.mobile')
})
await mobile.close()

await browser.close()
