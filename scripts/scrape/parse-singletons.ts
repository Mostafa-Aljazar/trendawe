/**
 * Singleton + landing pages → data/source/{globals,landing-pages}/{slug}.json as an ordered list of blocks.
 * Each top-level <section> becomes one block; its type is inferred from structure (see classify()).
 * Block types match CLAUDE.md §5; exact variants are confirmed visually when Phase 5 builds them.
 */
import type { Element } from 'domhandler'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

import {
  buttonVariant,
  cardRoot,
  cards,
  clean,
  faqItems,
  heading,
  image,
  inline,
  link,
  loadPage,
  markdown,
  seo,
  SOURCE_DIR,
  topSections,
  writeSource,
  type $,
  type Node,
} from './lib'

const PRICE_OVERVIEW_FILE = path.join(SOURCE_DIR, 'extras', 'cheap-price-overview.json')
const priceOverview: unknown[] | null = existsSync(PRICE_OVERVIEW_FILE)
  ? JSON.parse(await readFile(PRICE_OVERVIEW_FILE, 'utf8'))
  : null

const PAGES: { path: string; collection: 'globals' | 'landing-pages'; slug: string }[] = [
  { path: '/', collection: 'globals', slug: 'home-page' },
  { path: '/services', collection: 'globals', slug: 'services-page' },
  { path: '/about-us', collection: 'globals', slug: 'about-page' },
  { path: '/contact-us', collection: 'globals', slug: 'contact-page' },
  { path: '/faq', collection: 'globals', slug: 'faq-page' },
  { path: '/best-smm-panel', collection: 'landing-pages', slug: 'best-smm-panel' },
  { path: '/cheap-smm-panel', collection: 'landing-pages', slug: 'cheap-smm-panel' },
  { path: '/smm-reseller-panel', collection: 'landing-pages', slug: 'smm-reseller-panel' },
  { path: '/wholesale-smm-panel', collection: 'landing-pages', slug: 'wholesale-smm-panel' },
  { path: '/white-label-smm-panel', collection: 'landing-pages', slug: 'white-label-smm-panel' },
  { path: '/smm-panel-api', collection: 'landing-pages', slug: 'smm-panel-api' },
]

/** `_next/image` width hint: large (content) vs small (icons, arrows). */
const imgWidth = ($: $, img: Element) => Number(new URL($(img).attr('src') ?? '', 'https://x').searchParams.get('w') ?? 0)

const isInside = ($: $, el: Element, selector: string) => $(el).closest(selector).length > 0
const EXCLUDED = 'a, button, table, [role=tablist], [role=tabpanel], [role=region], pre'

const buttons = ($: $, section: Node) =>
  section
    .find('a')
    .filter((_, a) => /rounded-full/.test($(a).attr('class') ?? '') && !isInside($, a, '[role=tabpanel], li'))
    .map((_, a) => ({ ...link($, $(a))!, variant: buttonVariant($(a).attr('class')) }))
    .get()

const tabs = ($: $, section: Node) => {
  const panels = section.find('[role=tabpanel]')
  return section
    .find('[role=tab]')
    .map((i, tab) => {
      const panel = panels.eq(i)
      return {
        label: clean($(tab).text()),
        icon: image($, $(tab).find('img').first()),
        title: heading($, panel.find('h3').first()),
        body: markdown($, panel.find('h3').first().nextAll('p')),
        links: panel
          .find('li')
          .map((__, li) => ({ ...link($, $(li).find('a').first()), text: clean($(li).find('span').last().text()).replace(/^—\s*/, '') }))
          .get(),
        cta: link($, panel.find('a').filter((__, a) => /rounded-full/.test($(a).attr('class') ?? '')).last()),
        image: image($, panel.find('img').first()),
      }
    })
    .get()
}

/** Rows of a <table>, or of a CSS-grid table (rows = elements whose children are all cells). */
const table = ($: $, section: Node) => {
  const t = section.find('table').first()
  if (t.length)
    return t
      .find('tr')
      .map((_, tr) => [$(tr).find('th, td').map((__, c) => clean($(c).text())).get()])
      .get()
  return null
}

/** Reseller "Margin Examples": per service — buy price, resell price, profit margin. */
const margins = ($: $, section: Node) =>
  section
    .find('li:has(h4)')
    .map((_, li) => {
      const value = (label: RegExp) => clean($(li).find('span').filter((__, sp) => label.test(clean($(sp).text()))).first().next('span').text())
      const margin = $(li).find('span').filter((__, sp) => /^Profit margin$/i.test(clean($(sp).text()))).first()
      return {
        service: clean($(li).find('h4').text()),
        icon: image($, $(li).find('img').first()),
        buyAt: value(/^Buy at$/i),
        resellAt: value(/^Resell at$/i),
        margin: clean(margin.next().text() || margin.parent().find('span').last().text()),
      }
    })
    .get()

/**
 * Span-based grid table (wholesale "Pricing Tier", white-label "Feature" comparison).
 * Cells are spans with their own text, read in order and chunked by the header-row width.
 * A "Recommended" chip flags the cell before it: in the header → recommended column, else → row.
 * Yes/No cells keep their text ("Yes" / "No" / "Partially") so the renderer can show ✓/✗ icons.
 */
const spanTable = ($: $, section: Node) => {
  const headerCell = section.find('span').filter((_, sp) => /^(Pricing Tier|Feature)$/i.test(clean($(sp).text()))).first()
  if (!headerCell.length) return null
  const ownText = (sp: Element) => clean($(sp).contents().filter((__, n) => n.type === 'text').text())

  let container = headerCell.parent()
  while (container.parent().length && container.find('span').length < 12) container = container.parent()

  const cells: string[] = []
  let flagged: number | null = null
  container.find('span').each((_, sp) => {
    const own = ownText(sp)
    if (!own) return
    if (/^Recommended$/i.test(own)) flagged = cells.length - 1
    else cells.push(own)
  })

  // Header row: climb from the first header cell until the element holds more than one cell.
  const cellCount = (el: Node) => el.find('span').filter((_, sp) => !!ownText(sp) && !/^Recommended$/i.test(ownText(sp))).length
  let headerRow = headerCell.parent()
  while (cellCount(headerRow) < 2 && headerRow.parent().length) headerRow = headerRow.parent()
  const width = cellCount(headerRow)
  const rows: string[][] = []
  for (let i = 0; i < cells.length; i += width) rows.push(cells.slice(i, i + width))
  const f = flagged as number | null
  return {
    rows,
    recommendedColumn: f !== null && f < width ? f : null,
    recommendedRow: f !== null && f >= width ? Math.floor(f / width) : null,
  }
}

/** Name/description pairs (e.g. API request parameters): a highlighted label span followed by its text. */
const definitions = ($: $, section: Node) =>
  section
    .find('span')
    .filter((_, sp) => /text-\[#1F41BB\]/.test($(sp).attr('class') ?? '') && /font-semibold/.test($(sp).attr('class') ?? ''))
    .map((_, sp) => ({ name: clean($(sp).text()), description: clean($(sp).next('span').text()) }))
    .get()
    .filter((d) => d.name && d.description)

const stats = ($: $, section: Node) =>
  section
    .find('li')
    .map((_, li) => {
      const ps = $(li).find('p')
      return { value: clean(ps.first().text()), label: clean(ps.last().text()), icon: image($, $(li).find('img').first()) }
    })
    .get()

const heroExtras = ($: $, section: Node) => {
  const rating = section.find('span').filter((_, s) => /^\d\.\d$/.test(clean($(s).text()))).first()
  const trusted = section.find('span, p').filter((_, s) => /^Trusted by/i.test(clean($(s).text())) && $(s).children().length === 0).first()
  const trustValue = trusted.next('p')
  return {
    rating: rating.length ? { value: clean(rating.text()), label: clean(rating.next().text()), logo: image($, section.find('img[alt*="Google"]').first()) } : null,
    trustedBy: trusted.length ? clean(`${trusted.text()} ${trustValue.text()}`) : null,
    avatars: section.find('img.rounded-full').map((_, img) => image($, $(img))).get(),
    platformIcons: section
      .find('img')
      .filter((_, img) => /SMM Panel$/.test($(img).attr('alt') ?? '') && imgWidth($, img) > 0 && !isInside($, img, 'a'))
      .map((_, img) => image($, $(img)))
      .get()
      .slice(0, 12),
  }
}

const classify = (
  $: $,
  index: number,
  total: number,
  s: Node,
  f: { cards: unknown[]; hasHeading: boolean; buttons: unknown[] },
) => {
  const title = clean(s.find('h1, h2').first().text())
  const platformLinks = new Set(s.find('a[href$="-smm-panel"]').map((_, a) => $(a).attr('href')).get()).size
  if (s.find('[role=region], h3:has(button)').length || s.attr('id') === 'faq') return 'faqSection'
  if (index === 0) return 'hero'
  if (/^Follow Us/i.test(title)) return 'socialLinks'
  if (/^Get in Touch/i.test(title)) return 'contactInfo'
  if (index === total - 1 && f.buttons.length) return 'ctaBanner'
  if (s.find('[role=tab]').length) return 'platformTabs'
  if (s.find('pre').length) return 'codeSample'
  if (s.find('table').length || /\bvs\.?\s|Comparison/i.test(title)) return 'comparisonTable'
  if (platformLinks >= 10) return 'platformCardsGrid'
  if (/Price Overview/i.test(title)) return 'priceOverviewTabs'
  if (/\bEarn\b|Margin/i.test(title)) return 'marginExamples'
  if (!f.hasHeading && s.find('li').length >= 3 && !f.cards.length) return 'statsRow'
  if (s.find('span').filter((_, sp) => /text-\[100px\]/.test($(sp).attr('class') ?? '')).length) return 'stepsTimeline'
  if (s.find('*').filter((_, e) => /^Starting price$/i.test(clean($(e).text()))).length) return 'startingPriceCard'
  if (f.cards.length >= 2) return /^Who\b/i.test(title) ? 'audienceGrid' : 'featureGrid'
  return 'richTextWithImage'
}

const parseSection = ($: $, s: Node, index: number, total: number) => {
  const h = s.find('h1, h2').first()
  const eligible = s.find('h3').map((i, h3) => !isInside($, h3, '[role=tabpanel]') && !$(h3).find('button').length).get()
  const sectionCards = cards($, s).filter((_, i) => eligible[i])
  const roots = s
    .find('h3')
    .filter((i) => eligible[i])
    .map((_, h3) => cardRoot($, $(h3)).get(0))
    .get()
  const insideCard = (el: Element) => roots.some((r) => r === el || $(r).find(el).length > 0)
  const prose = s
    .find('p, ul, ol')
    .filter((_, el) => {
      if (isInside($, el, EXCLUDED) || $(el).parents('ul, ol').length || insideCard(el)) return false
      if ($(el).find('h3').length) return false // a list that wraps the cards
      return (el as Element).tagName !== 'p' || !!clean($(el).text())
    })
  const intro = h.nextAll('p')
  const btns = buttons($, s)
  const contentImages = s
    .find('img')
    .filter((_, img) => imgWidth($, img) >= 640 && !isInside($, img, `${EXCLUDED}, li`) && !!$(img).attr('alt'))
    .map((_, img) => image($, $(img)))
    .get()

  const blockType = classify($, index, total, s, { cards: sectionCards, hasHeading: h.length > 0, buttons: btns })
  const block: Record<string, unknown> = {
    blockType,
    id: s.attr('id') ?? undefined,
    dark: /bg-black|bg-\[#0{3,6}\]|bg-\[#111|bg-\[#171E2F\]/i.test(s.attr('class') ?? '') || undefined,
    heading: h.length ? heading($, h) : undefined,
    intro: intro.length ? markdown($, intro) : undefined,
    body: markdown($, prose.filter((_, el) => !intro.toArray().includes(el))) || undefined,
    cards: sectionCards.length ? sectionCards : undefined,
    buttons: btns.length ? btns : undefined,
    images: contentImages.length ? contentImages : undefined,
  }
  if (blockType === 'hero') Object.assign(block, heroExtras($, s))
  if (blockType === 'platformTabs') block.tabs = tabs($, s)
  if (blockType === 'faqSection') block.faq = faqItems($)
  if (blockType === 'codeSample') block.code = s.find('pre').first().text()
  if (blockType === 'comparisonTable') block.table = table($, s) ?? spanTable($, s) ?? undefined
  if (blockType === 'marginExamples') block.margins = margins($, s)
  const defs = definitions($, s)
  if (defs.length >= 3) block.definitions = defs
  if (blockType === 'priceOverviewTabs' && priceOverview) {
    // Only the first tab is server-rendered; all tabs come from scripts/scrape/price-overview.ts.
    block.tabs = priceOverview
    delete block.cards
    delete block.buttons
  }
  if (blockType === 'statsRow') block.stats = stats($, s)
  if (blockType === 'startingPriceCard') {
    const card = s.find('*').filter((_, e) => /^Starting price$/i.test(clean($(e).text()))).first().closest('div:has(ul)')
    block.priceCard = {
      label: 'Starting price',
      value: clean(card.find('*').filter((_, e) => /^\$[\d.]+$/.test(clean($(e).text()))).first().text()),
      features: card.find('li').map((_, li) => clean($(li).text())).get(),
      cta: link($, card.find('a').last()),
    }
  }
  return Object.fromEntries(Object.entries(block).filter(([, v]) => v !== undefined))
}

let ok = 0
for (const page of PAGES) {
  try {
    const $ = await loadPage(page.path)
    const sections = topSections($)
    await writeSource(page.collection, page.slug, {
      slug: page.slug,
      sourceUrl: page.path,
      seo: seo($),
      layout: sections.map((s, i) => parseSection($, s, i, sections.length)),
    })
    ok++
  } catch (error) {
    console.warn(`✗ ${page.path}: ${(error as Error).stack}`)
    process.exitCode = 1
  }
}
console.log(`singletons + landing pages: ${ok}/${PAGES.length} parsed → data/source/{globals,landing-pages}/`)

// Keep the import used for inline markdown in future block-specific tweaks.
void inline
