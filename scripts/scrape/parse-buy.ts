/**
 * Buy pages (/buy-{platform}-{service}) → data/source/buy-pages/{slug}.json
 * Section order is documented in docs/page-inventory.md §3.3.
 */
import { readFile } from 'fs/promises'

import { URLS_FILE } from './config'
import {
  buttonVariant,
  cards,
  clean,
  expectHeading,
  faqFromJsonLd,
  heading,
  image,
  intro,
  link,
  loadPage,
  markdown,
  type Node,
  readPlatformMenu,
  seo,
  topSections,
  writeSource,
  type $,
} from './lib'

const buttons = ($: $, scope: Node) =>
  scope
    .find('a')
    .filter((_, a) => /rounded-full/.test($(a).attr('class') ?? ''))
    .map((_, a) => ({ ...link($, $(a))!, variant: buttonVariant($(a).attr('class')) }))
    .get()

const pricing = ($: $, section: Node) => {
  const table = section.find('table').first()
  const headers = table.find('tr').first().find('th').map((_, th) => clean($(th).text())).get()
  const packages = table
    .find('tr')
    .slice(1)
    .map((_, tr) => {
      const td = $(tr).find('td')
      const action = td.last().find('a').first()
      return {
        name: clean(td.eq(0).find('span').first().text() || td.eq(0).text()).replace(/\s*Most Popular$/i, ''),
        quantity: clean(td.eq(1).text()),
        price: clean(td.eq(2).text()),
        delivery: clean(td.eq(3).text()),
        isPopular: buttonVariant(action.attr('class')) === 'primary' || /Most Popular/i.test(td.eq(0).text()),
        action: link($, action),
      }
    })
    .get()
  // The note is the paragraph block after the table (outside the mobile card list).
  const note = section.find('p').filter((_, p) => !$(p).closest('table').length && $(p).find('a').length > 0).last()
  return {
    title: heading($, section.find('h2')),
    columns: { package: headers[0], quantity: headers[1], price: headers[2], delivery: headers[3], action: headers[4] },
    packages,
    note: note.length ? markdown($, note) : '',
  }
}

const testimonials = ($: $, section: Node) => {
  const seen = new Set<string>()
  return section
    .find('p')
    .filter((_, p) => /^[“"]/.test(clean($(p).text())))
    .map((_, p) => {
      const quote = clean($(p).text()).replace(/^[“"]|[”"]$/g, '')
      if (seen.has(quote)) return null
      seen.add(quote)
      // The card is the closest ancestor that also holds the star icons.
      const card = $(p).parents().filter((__, el) => $(el).find('img[alt="Star rating"]').length > 0).first()
      const role = card.find('p.font-bold').first()
      return {
        quote,
        role: clean(role.text()).replace(/,$/, ''),
        country: clean(role.next('p').text()),
        rating: card.find('img[alt="Star rating"]').length,
      }
    })
    .get()
    .filter(Boolean)
}

const parse = async (pathname: string, platformSlug: string | null, menuLabel: string | null, menuOrder: number | null) => {
  const $ = await loadPage(pathname)
  const s = topSections($)
  const where = (n: number) => `${pathname} §${n}`

  expectHeading(s[0], /^Buy/i, where(1))
  expectHeading(s[1], /^Why/i, where(2))
  expectHeading(s[2], /Packages|Options|Types/i, where(3))
  expectHeading(s[3], /^Why Choose/i, where(4))
  expectHeading(s[4], /^How to/i, where(5))
  expectHeading(s[5], /Pricing/i, where(6))
  expectHeading(s[6], /Customers Say/i, where(7))
  expectHeading(s[7], /Frequently Asked/i, where(8))

  const [hero, whyBuy, packageTypes, why, steps, prices, reviews, faq, cta] = s
  const trust = hero.find('p').filter((_, p) => /^Trusted by$/i.test(clean($(p).text()))).first()

  return {
    slug: pathname.slice(1),
    sourceUrl: pathname,
    platformSlug,
    menuLabel,
    menuOrder,
    seo: seo($),
    hero: {
      title: heading($, hero.find('h1')),
      intro: markdown($, hero.find('p').filter((_, p) => !$(p).closest('a').length && $(p)[0] !== trust[0] && $(p)[0] !== trust.next()[0])),
      checklist: hero.find('ul').first().children('li').map((_, li) => clean($(li).text())).get(),
      buttons: buttons($, hero),
      trustBadge: trust.length ? { label: clean(trust.text()), value: clean(trust.next().text()) } : null,
      image: image($, hero.find('img').last()),
    },
    whyBuy: {
      title: heading($, whyBuy.find('h2')),
      body: markdown($, whyBuy.find('p, ul').filter((_, el) => !$(el).parents('ul').length)),
      image: image($, whyBuy.find('img').eq(1)),
    },
    packageTypes: {
      title: heading($, packageTypes.find('h2')),
      intro: intro($, packageTypes),
      items: cards($, packageTypes).map(({ title, body, icon }) => ({ title, body, image: icon })),
    },
    whyChoose: {
      title: heading($, why.find('h2')),
      intro: intro($, why),
      items: cards($, why).map(({ title, body, icon }) => ({ title, body, icon })),
    },
    steps: {
      title: heading($, steps.find('h2')),
      intro: intro($, steps),
      items: cards($, steps).map(({ title, body, icon, number }) => ({ title, body, icon, number })),
    },
    pricing: pricing($, prices),
    testimonials: {
      title: heading($, reviews.find('h2')),
      items: testimonials($, reviews),
    },
    faq: {
      title: heading($, faq.find('h2')),
      intro: intro($, faq),
      items: faqFromJsonLd($),
    },
    cta: cta
      ? {
          title: heading($, cta.find('h2')),
          body: markdown($, cta.find('h2').nextAll('p')),
          buttons: buttons($, cta),
          image: image($, cta.find('img').last()),
        }
      : null,
  }
}

const paths: string[] = JSON.parse(await readFile(URLS_FILE, 'utf8'))
const buyPaths = paths.filter((p) => /^\/buy-/.test(p))

// Platform + menu label/order come from the footer "Our Services" tree.
const owner = new Map<string, { platformSlug: string; menuLabel: string; menuOrder: number }>()
for (const platform of readPlatformMenu(await loadPage('/')))
  platform.buyPages.forEach((page, i) => {
    if (page.href) owner.set(page.href, { platformSlug: platform.slug, menuLabel: page.label, menuOrder: i + 1 })
  })

let ok = 0
for (const pathname of buyPaths) {
  try {
    const o = owner.get(pathname)
    if (!o) console.warn(`! ${pathname}: not in the footer menu — platform unknown`)
    await writeSource('buy-pages', pathname.slice(1), await parse(pathname, o?.platformSlug ?? null, o?.menuLabel ?? null, o?.menuOrder ?? null))
    ok++
  } catch (error) {
    console.warn(`✗ ${(error as Error).message}`)
    process.exitCode = 1
  }
}
console.log(`buy pages: ${ok}/${buyPaths.length} parsed → data/source/buy-pages/`)
