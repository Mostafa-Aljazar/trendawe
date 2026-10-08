/**
 * Content coverage check: for every parsed page, compares the words in each source <section>
 * with the words in the matching JSON block. Flags sections below the threshold so no content
 * is silently lost. Usage: pnpm scrape:coverage [threshold=0.9]
 */
import * as cheerio from 'cheerio'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

import { rawFileFor } from './config'
import { SOURCE_DIR, topSections } from './lib'

const threshold = Number(process.argv[2] ?? 0.9)
const words = (text: string) => new Set((text.toLowerCase().match(/[a-z0-9$%]+(?:[.,][0-9]+)*/g) ?? []).filter((w) => w.length > 2))

/** Text of an element with a space between every text node (cheerio's .text() glues them). */
const spacedText = ($: cheerio.CheerioAPI, el: cheerio.Cheerio<never>) => {
  const parts: string[] = []
  el.find('*')
    .addBack()
    .contents()
    .each((_, n) => {
      if (n.type === 'text') parts.push(n.data)
    })
  return parts.join(' ')
}

const jsonText = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/"(src|href|blockType|variant|id|sourceUrl|slug)":"[^"]*"/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\]\([^)]*\)/g, '] ')
    .replace(/[*#[\]_]/g, ' ')

let flagged = 0
for (const dir of ['globals', 'landing-pages']) {
  for (const file of await readdir(path.join(SOURCE_DIR, dir))) {
    const page = JSON.parse(await readFile(path.join(SOURCE_DIR, dir, file), 'utf8'))
    const $ = cheerio.load(await readFile(rawFileFor(page.sourceUrl), 'utf8'))
    const sections = topSections($)
    page.layout.forEach((block: Record<string, unknown>, i: number) => {
      const section = sections[i].clone()
      section.find('[role=region], script, style, svg').remove()
      const source = words(spacedText($, section as cheerio.Cheerio<never>))
      const got = words(jsonText(block))
      const missing = [...source].filter((w) => !got.has(w))
      const coverage = source.size ? 1 - missing.length / source.size : 1
      if (coverage < threshold) {
        flagged++
        console.log(`${page.sourceUrl.padEnd(24)} §${i + 1} ${String(block.blockType).padEnd(18)} ${(coverage * 100).toFixed(0)}%  missing: ${missing.slice(0, 16).join(' ')}`)
      }
    })
  }
}
console.log(`\n${flagged} section(s) below ${threshold * 100}% coverage`)
