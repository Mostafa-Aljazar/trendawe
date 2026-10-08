/**
 * Shared cheerio helpers for the smmgen.com parsers.
 *
 * Conventions for source JSON (data/source):
 * - Headings: highlighted words (gradient / primary colour) are wrapped in **…**.
 * - Rich text: Markdown (paragraphs, `- ` lists, [links](/path), **bold**). Converted to Lexical when seeding.
 * - Images: `{ src: '/image/…', alt }` — the original path, decoded from `/_next/image?url=…`.
 */
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

import { DATA_DIR, rawFileFor, SOURCE_ORIGIN } from './config'

export type $ = cheerio.CheerioAPI
export type Node = cheerio.Cheerio<AnyNode>

export interface Image {
  src: string
  alt: string
}
export interface Link {
  label: string
  /** null = styled like a link on the source but not linked (renderer falls back to signup). */
  href: string | null
}

export const SOURCE_DIR = path.join(DATA_DIR, 'source')

export const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

export const loadPage = async (pathname: string) => cheerio.load(await readFile(rawFileFor(pathname), 'utf8'))

/** Top-level <section> elements of <main>, in order. */
export const topSections = ($: $) => {
  const sections = $('main section').filter((_, s) => $(s).parents('section').length === 0)
  return sections.map((_, s) => $(s)).get()
}

/** Internal links become root-relative paths; external links stay absolute. */
export const normalizeHref = (href = '') => {
  if (href.startsWith(SOURCE_ORIGIN)) return href.slice(SOURCE_ORIGIN.length) || '/'
  return href
}

export const image = ($: $, img: Node | undefined): Image | null => {
  if (!img || !img.length) return null
  const raw = img.attr('src') ?? ''
  let src = raw
  if (raw.startsWith('/_next/image')) src = decodeURIComponent(new URL(raw, SOURCE_ORIGIN).searchParams.get('url') ?? raw)
  return { src: normalizeHref(src), alt: clean(img.attr('alt') ?? '') }
}

export const link = ($: $, a: Node | undefined): Link | null => {
  if (!a || !a.length) return null
  return { label: clean(a.text()), href: normalizeHref(a.attr('href')) }
}

const HIGHLIGHT = /text-gradient|1F41BB|text-primary|bg-clip-text/i

/** Heading text with highlighted spans wrapped in **…**. */
export const heading = ($: $, el: Node | undefined) => {
  if (!el || !el.length) return ''
  const parts: string[] = []
  el.contents().each((_, node) => {
    if (node.type === 'text') parts.push(node.data)
    else if (node.type === 'tag') {
      const text = clean($(node).text())
      if (!text) return
      parts.push(HIGHLIGHT.test($(node).attr('class') ?? '') ? ` **${text}** ` : ` ${text} `)
    }
  })
  return clean(parts.join('')).replace(/\*\*\s+\*\*/g, ' ')
}

/** Inline Markdown for one element's children (text, links, bold, italics). */
export const inline = ($: $, el: Node): string => {
  const out: string[] = []
  el.contents().each((_, node) => {
    if (node.type === 'text') {
      out.push(node.data)
      return
    }
    if (node.type !== 'tag') return
    const $n = $(node)
    const tag = (node as Element).tagName
    if (['svg', 'img', 'script', 'style', 'button'].includes(tag)) return
    if (tag === 'br') {
      out.push('\n')
      return
    }
    const text = inline($, $n)
    if (!clean(text)) return
    if (tag === 'a') out.push(` [${clean(text)}](${normalizeHref($n.attr('href'))}) `)
    else if (tag === 'strong' || tag === 'b') out.push(` **${clean(text)}** `)
    else if (tag === 'em' || tag === 'i') out.push(` *${clean(text)}* `)
    else out.push(` ${text} `)
  })
  // Collapse whitespace but keep explicit line breaks; tidy spaces before punctuation.
  return out
    .join('')
    .split('\n')
    .map((line) => clean(line).replace(/\s+([.,;:!?)])/g, '$1').replace(/\(\s+/g, '('))
    .join('\n')
}

/** Block Markdown: paragraphs separated by blank lines, lists as `- `. */
export const markdown = ($: $, els: Node): string =>
  els
    .map((_, el) => {
      const $el = $(el)
      const tag = (el as Element).tagName
      if (tag === 'ul' || tag === 'ol')
        return $el
          .children('li')
          .map((i, li) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${inline($, $(li))}`)
          .get()
          .join('\n')
      return inline($, $el)
    })
    .get()
    .filter(Boolean)
    .join('\n\n')

export interface FaqItem {
  question: string
  answer: string
}

/** FAQ answers are only in the JSON-LD FAQPage (accordions render closed). */
export const faqFromJsonLd = ($: $): FaqItem[] => {
  const items: FaqItem[] = []
  $('script[type="application/ld+json"]').each((_, s) => {
    const json = JSON.parse($(s).text())
    const nodes = [json, ...(json['@graph'] ?? [])].flat()
    for (const node of nodes) {
      if (node?.['@type'] !== 'FAQPage') continue
      for (const q of node.mainEntity ?? [])
        items.push({ question: clean(q.name), answer: clean(q.acceptedAnswer?.text ?? '') })
    }
  })
  return items
}

/** Title + meta description. (og:image is the smmgen logo everywhere — Trendawe uses its own default from site-settings.) */
export const seo = ($: $) => ({
  title: clean($('title').first().text()),
  description: clean($('meta[name="description"]').attr('content') ?? ''),
})

/** The section's lead paragraph(s) right after its heading. */
export const intro = ($: $, section: Node) => {
  const h = section.find('h1, h2').first()
  return markdown($, h.nextAll('p'))
}

/** Filled vs outline button, from the exact class tokens (ignores hover: variants). */
export const buttonVariant = (cls = '') =>
  cls.split(/\s+/).some((c) => c === 'bg-primary' || /^bg-\[#1a3aad\]$/i.test(c)) ? 'primary' : 'outline'

export const writeSource = async (collection: string, slug: string, data: unknown) => {
  const dir = path.join(SOURCE_DIR, collection)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`)
}

/** Fail loudly when the page layout differs from what a parser expects. */
export const expectHeading = (section: Node | undefined, pattern: RegExp, where: string) => {
  const text = clean(section?.find('h1, h2').first().text() ?? '')
  if (!pattern.test(text)) throw new Error(`${where}: expected heading ${pattern}, got "${text}"`)
}

export interface Card {
  title: string
  body: string
  icon: Image | null
  link: Link | null
  number: string | null
  badge: string | null
}

/** A link-styled <span> with an arrow icon but no href (seen on some service cards). */
const fakeLink = ($: $, root: Node): Link | null => {
  const span = root.find('span').filter((__, sp) => $(sp).children('img').length > 0 && !!clean($(sp).text())).last()
  return span.length ? { label: clean(span.text()), href: null } : null
}

/**
 * Cards inside a section, found from their <h3>: the card root is the closest ancestor
 * that contains exactly one h3. Works for grids, masonry and nested list layouts.
 */
export const cards = ($: $, section: Node): Card[] =>
  section
    .find('h3')
    .map((_, h) => {
      const $h = $(h)
      let root = $h.parent()
      while (root.parent().length && root.parent().find('h3').length === 1 && !root.is('section')) root = root.parent()
      const badgeEl = root.find('div, span').filter((__, d) => /^From\s/i.test(clean($(d).text())) && $(d).children().length === 0).first()
      const numberEl = root.find('span').filter((__, sp) => /^\d{2}$/.test(clean($(sp).text()))).first()
      const linkEl = root.find('a').filter((__, a) => !!clean($(a).text())).last()
      const bodyEls = root.find('p').filter((__, p) => !$(p).closest('a').length)
      return {
        title: clean($h.text()),
        body: markdown($, bodyEls),
        // Icons sit outside links/link-styled spans (those hold the arrow).
        icon: image($, root.find('img').filter((__, img) => !$(img).closest('a, span').length).first()),
        link: linkEl.length && !bodyEls.find('a').filter((__, a) => a === linkEl[0]).length
          ? link($, linkEl)
          : fakeLink($, root),
        number: numberEl.length ? clean(numberEl.text()) : null,
        badge: badgeEl.length ? clean(badgeEl.text()) : null,
      }
    })
    .get()

/** Platform list from the header Services menu + buy pages per platform from the footer tree. */
export const readPlatformMenu = ($: $) => {
  const platforms = $('header a[href$="-smm-panel"]')
    .filter((_, a) => /SMM Panel$/.test(clean($(a).text())) && !!$(a).find('img').length)
    .map((i, a) => ({
      slug: ($(a).attr('href') ?? '').slice(1),
      menuLabel: clean($(a).text()),
      name: clean($(a).text()).replace(/\s*SMM Panel$/, ''),
      menuOrder: i + 1,
      icon: image($, $(a).find('img').first()),
    }))
    .get()
  const buyPages = new Map<string, Link[]>()
  $('footer details').each((_, d) => {
    const all = $(d).find('a').filter((__, a) => /-smm-panel$/.test($(a).attr('href') ?? '')).first()
    const slug = (all.attr('href') ?? '').slice(1)
    if (slug) buyPages.set(slug, $(d).find('a[href^="/buy-"]').map((__, a) => link($, $(a))!).get())
  })
  return platforms.map((p) => ({ ...p, buyPages: buyPages.get(p.slug) ?? [] }))
}
