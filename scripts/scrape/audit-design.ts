/**
 * Design audit: reads computed styles from smmgen.com with Playwright and writes
 * data/design/audit.json — the raw material for docs/design-tokens.md.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

import { DATA_DIR, SOURCE_ORIGIN } from './config'

const PAGES = ['/', '/smm-panel-egypt', '/instagram-smm-panel', '/buy-instagram-followers', '/blog']
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }
const OUT_DIR = path.join(DATA_DIR, 'design')

const collect = (page: Page) =>
  page.evaluate(() => {
    const pick = (el: Element) => {
      const s = getComputedStyle(el)
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        color: s.color,
        background: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : s.backgroundImage,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
        padding: s.padding,
        border: s.border,
      }
    }

    // Typical computed style per tag: the most frequent combination wins.
    const typography: Record<string, unknown> = {}
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'p', 'li', 'a', 'button', 'small']) {
      const counts = new Map<string, number>()
      for (const el of document.querySelectorAll(tag)) {
        if (!(el as HTMLElement).offsetParent) continue
        const s = getComputedStyle(el)
        const key = JSON.stringify({
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          color: s.color,
          fontFamily: s.fontFamily,
        })
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      typography[tag] = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k, n]) => ({ ...JSON.parse(k), count: n }))
    }

    // Value frequencies across every visible element.
    const freq = {
      color: new Map<string, number>(),
      backgroundColor: new Map<string, number>(),
      backgroundImage: new Map<string, number>(),
      borderColor: new Map<string, number>(),
      borderRadius: new Map<string, number>(),
      boxShadow: new Map<string, number>(),
      fontFamily: new Map<string, number>(),
      fontSize: new Map<string, number>(),
      maxWidth: new Map<string, number>(),
      gap: new Map<string, number>(),
    }
    const bump = (m: Map<string, number>, v: string) => {
      if (!v || ['none', 'normal', '0px', 'rgba(0, 0, 0, 0)', 'auto'].includes(v)) return
      m.set(v, (m.get(v) ?? 0) + 1)
    }
    for (const el of document.querySelectorAll('body *')) {
      if (!(el as HTMLElement).offsetParent && getComputedStyle(el).position !== 'fixed') continue
      const s = getComputedStyle(el)
      bump(freq.color, s.color)
      bump(freq.backgroundColor, s.backgroundColor)
      bump(freq.backgroundImage, s.backgroundImage.startsWith('url') ? '' : s.backgroundImage)
      if (s.borderTopWidth !== '0px') bump(freq.borderColor, s.borderTopColor)
      bump(freq.borderRadius, s.borderRadius)
      bump(freq.boxShadow, s.boxShadow)
      bump(freq.fontFamily, s.fontFamily)
      bump(freq.fontSize, s.fontSize)
      bump(freq.maxWidth, s.maxWidth)
      bump(freq.gap, s.gap)
    }
    const top = (m: Map<string, number>, n = 25) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }))

    // Section rhythm: direct children of <main> (or body sections).
    const sections = [...document.querySelectorAll('main > section, main > div > section, body section')]
      .slice(0, 20)
      .map((el) => {
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        const heading = el.querySelector('h1, h2')?.textContent?.trim().slice(0, 60) ?? ''
        return { heading, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, background: pick(el).background, height: Math.round(r.height) }
      })

    // Container: widest centered element with a max-width.
    const containers = [...document.querySelectorAll('body *')]
      .map((el) => getComputedStyle(el))
      .filter((s) => s.maxWidth.endsWith('px') && s.marginLeft === s.marginRight && s.marginLeft !== '0px')
      .map((s) => `${s.maxWidth} pad ${s.paddingLeft}`)
    const containerCounts = new Map<string, number>()
    containers.forEach((c) => bump(containerCounts, c))

    const header = document.querySelector('header')
    const buttons = [...document.querySelectorAll('a, button')]
      .filter((el) => {
        const s = getComputedStyle(el)
        return (el as HTMLElement).offsetParent && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px') && s.paddingLeft !== '0px'
      })
      .slice(0, 40)
      .map((el) => ({ text: el.textContent?.trim().slice(0, 30), ...pick(el) }))
    const uniqueButtons = [...new Map(buttons.map((b) => [JSON.stringify({ ...b, text: '' }), b])).values()]

    // CSS custom properties and media queries from same-origin stylesheets.
    const rootVars: Record<string, string> = {}
    const media = new Set<string>()
    const fontFaces = new Set<string>()
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) media.add(rule.conditionText)
        if (rule instanceof CSSFontFaceRule) fontFaces.add(rule.style.getPropertyValue('font-family'))
        if (rule instanceof CSSStyleRule && /^(:root|html|:host)/.test(rule.selectorText)) {
          for (const prop of rule.style) if (prop.startsWith('--')) rootVars[prop] = rule.style.getPropertyValue(prop).trim()
        }
      }
    }

    return {
      title: document.title,
      body: pick(document.body),
      typography,
      header: header ? { height: Math.round(header.getBoundingClientRect().height), ...pick(header), position: getComputedStyle(header).position } : null,
      buttons: uniqueButtons.slice(0, 15),
      sections,
      containers: top(containerCounts, 8),
      frequencies: Object.fromEntries(Object.entries(freq).map(([k, m]) => [k, top(m)])),
      rootVars,
      media: [...media],
      fontFaces: [...fontFaces],
    }
  })

const browser = await chromium.launch()
const result: Record<string, Record<string, unknown>> = {}

for (const pathname of PAGES) {
  result[pathname] = {}
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport })
    // tsx (esbuild keepNames) wraps functions in __name(); define it inside the page.
    await page.addInitScript({ content: 'window.__name = (fn) => fn' })
    await page.goto(`${SOURCE_ORIGIN}${pathname}`, { waitUntil: 'networkidle', timeout: 90_000 })
    result[pathname][name] = await collect(page)
    await page.close()
    console.log(`✓ ${pathname} @ ${name}`)
  }
}

await browser.close()
await mkdir(OUT_DIR, { recursive: true })
await writeFile(path.join(OUT_DIR, 'audit.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(`→ ${path.join(OUT_DIR, 'audit.json')}`)
