/**
 * Section inventory of the reference pages (from data/raw) → data/design/inventory.json.
 * Feeds docs/page-inventory.md: one entry per top-level section with structural hints.
 */
import * as cheerio from 'cheerio'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

import { DATA_DIR, rawFileFor } from './config'

const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/', '/services', '/about-us', '/contact-us', '/faq',
      '/best-smm-panel', '/cheap-smm-panel', '/smm-reseller-panel', '/wholesale-smm-panel', '/white-label-smm-panel', '/smm-panel-api',
      '/smm-panel-egypt', '/instagram-smm-panel', '/pinterest-smm-panel', '/buy-instagram-followers',
      '/blog', '/blog/threads-vs-instagram', '/privacy-policy',
    ]

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

const describe = ($: cheerio.CheerioAPI, el: cheerio.Cheerio<never>) => {
  const heading = clean(el.find('h1, h2').first().text())
  const bg = (el.attr('class') ?? '').match(/bg-\[[^\]]+\]|bg-[a-z-]+(?:\/\d+)?|bg-linear[^\s]*/g) ?? []
  const style = el.attr('style') ?? ''
  return {
    tag: el.prop('tagName')?.toLowerCase(),
    id: el.attr('id') ?? null,
    heading,
    intro: clean(el.find('h1, h2').first().nextAll('p').first().text()).slice(0, 90),
    h3: el.find('h3').map((_, h) => clean($(h).text()).slice(0, 50)).get(),
    images: el.find('img').length,
    listItems: el.find('li').length,
    links: el.find('a').map((_, a) => clean($(a).text()).slice(0, 30)).get().filter(Boolean).slice(0, 8),
    tabs: el.find('[role=tab]').length,
    accordion: el.find('[aria-controls][data-state]').length,
    table: el.find('table').length,
    tableRows: el.find('tr').length,
    code: el.find('pre, code').length,
    forms: el.find('form, input, textarea').length,
    background: [...bg, style.includes('background') ? 'inline-bg' : ''].filter(Boolean).join(' '),
  }
}

const result: Record<string, unknown> = {}
for (const pathname of PAGES) {
  const $ = cheerio.load(await readFile(rawFileFor(pathname), 'utf8'))
  const main = $('main').first()
  // Top-level sections: <section> elements not nested in another section.
  const sections = main.find('section').filter((_, s) => $(s).parents('section').length === 0)
  const blocks = sections.length ? sections : main.children()
  result[pathname] = {
    title: clean($('title').text()),
    sections: blocks.map((_, s) => describe($, $(s) as cheerio.Cheerio<never>)).get(),
  }
}

const out = path.join(DATA_DIR, 'design', 'inventory.json')
await writeFile(out, `${JSON.stringify(result, null, 2)}\n`)
console.log(`→ ${out}`)
