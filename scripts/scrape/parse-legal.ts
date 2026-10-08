/**
 * Legal pages → data/source/legal-pages/{slug}.json
 * Layout: header (H1, intro, "Last updated … Effective date …", contact note) · body (H2/H3 sections)
 * · "How to Contact Us" cards · related legal links.
 */
import type { Element } from 'domhandler'

import { clean, faqItems, heading, inline, link, loadPage, markdown, seo, writeSource, type $, type Node } from './lib'

const LEGAL = ['/privacy-policy', '/terms-and-conditions', '/cookies-policy', '/refund-policy', '/disclaimer']
const BLOCK = new Set(['p', 'div', 'h2', 'h3', 'h4', 'ul', 'ol', 'section', 'article', 'header', 'li', 'table'])

/** Walk in document order; emit leaf blocks once (a block whose children are all inline). */
const blocks = ($: $, el: Node, out: string[] = []) => {
  el.children().each((_, child) => {
    const $c = $(child)
    const tag = (child as Element).tagName
    if (/^h[2-4]$/.test(tag)) out.push(`${'#'.repeat(Number(tag[1]))} ${inline($, $c)}`)
    else if (tag === 'ul' || tag === 'ol') out.push(markdown($, $c))
    else if (BLOCK.has(tag) && $c.children().filter((__, g) => BLOCK.has((g as Element).tagName)).length) blocks($, $c, out)
    else if (BLOCK.has(tag)) {
      const text = inline($, $c)
      if (text) out.push(text)
    }
  })
  return out
}

const parse = async (pathname: string) => {
  const $ = await loadPage(pathname)
  const h1 = $('main h1').first()
  const dates = $('main p').filter((_, p) => /Last updated/i.test($(p).text())).first()
  const dateText = clean(dates.text())

  // Body: the closest common container of the content H2s (excluding the related-links H2).
  const h2s = $('main h2').filter((_, h) => !/related legal documents/i.test($(h).text()))
  let body = h2s.first().parent()
  while (body.find(h2s).length < h2s.length) body = body.parent()

  // Contact cards and related links are rendered from site-settings / the legal collection, not stored as text.
  const contactList = body.find('ul').filter((_, ul) => $(ul).find('a[href^="mailto:"]').length > 0)
  const bodyClone = body.clone()
  bodyClone.find('ul').filter((_, ul) => $(ul).find('a[href^="mailto:"]').length > 0).remove()
  // Related-links block and FAQ accordion (refund policy) are stored as their own fields.
  bodyClone.find('h2').filter((_, h) => /related legal documents/i.test($(h).text())).parent().remove()
  const faqHeading = bodyClone.find('h2').filter((_, h) => /Frequently Asked/i.test($(h).text())).first()
  const faqTitle = faqHeading.length ? heading($, faqHeading) : null
  faqHeading.remove()
  bodyClone.find('h3:has(button), [role=region]').remove()

  const intro = inline($, h1.nextAll('p').first())
  const allBlocks = blocks($, bodyClone)
  const firstH2 = Math.max(0, allBlocks.findIndex((b) => b.startsWith('## ')))
  const headerBlocks = allBlocks.slice(0, firstH2)

  const related = $('main h2')
    .filter((_, h) => /related legal documents/i.test($(h).text()))
    .first()
    .parent()
    .find('a')

  return {
    slug: pathname.slice(1),
    sourceUrl: pathname,
    title: heading($, h1),
    intro,
    lastUpdated: dateText.match(/Last updated:\s*(.+?)(?=\s*Effective date|$)/i)?.[1] ?? null,
    effectiveDate: dateText.match(/Effective date:\s*(.+)$/i)?.[1] ?? null,
    // Blocks before the first H2 are the header (intro, dates, contact note) — kept as fields, not body.
    contactNote: headerBlocks.filter((b) => !/^Last updated/i.test(b) && b !== intro).join('\n\n'),
    body: allBlocks.slice(firstH2).join('\n\n'),
    contactLinks: contactList
      .find('a')
      .map((_, a) => ({ label: clean($(a).find('p').first().text()), value: clean($(a).find('p').last().text()), href: $(a).attr('href') ?? '' }))
      .get(),
    relatedLinks: related.map((_, a) => link($, $(a))).get(),
    faq: faqTitle ? { title: faqTitle, items: faqItems($) } : null,
    seo: seo($),
  }
}

let ok = 0
for (const pathname of LEGAL) {
  try {
    await writeSource('legal-pages', pathname.slice(1), await parse(pathname))
    ok++
  } catch (error) {
    console.warn(`✗ ${pathname}: ${(error as Error).message}`)
    process.exitCode = 1
  }
}
console.log(`legal pages: ${ok}/${LEGAL.length} parsed → data/source/legal-pages/`)
