/**
 * Country pages (/smm-panel-{country}) → data/source/countries/{slug}.json
 * Section order is documented in docs/page-inventory.md §3.1.
 */
import { readFile } from 'fs/promises'

import { URLS_FILE } from './config'
import {
  type $,
  clean,
  expectHeading,
  faqFromJsonLd,
  heading,
  image,
  inline,
  intro,
  link,
  loadPage,
  markdown,
  type Node,
  seo,
  topSections,
  writeSource,
} from './lib'

const COUNTRY = /^\/smm-panel-(?!api$)[a-z-]+$/

/** Name, column and order of every country, read from the header's Service Area menu. */
const readMenu = ($: $) => {
  const menu = new Map<string, { name: string; menuColumn: number; menuOrder: number }>()
  const columns = $('header ul').filter((_, ul) => $(ul).children('li').children('a[href^="/smm-panel-"]').length > 0)
  columns.each((col, ul) => {
    $(ul)
      .children('li')
      .each((order, li) => {
        const a = $(li).children('a').first()
        const href = a.attr('href') ?? ''
        if (COUNTRY.test(href)) menu.set(href.slice(1), { name: clean(a.text()), menuColumn: col + 1, menuOrder: order + 1 })
      })
  })
  return menu
}

const items = ($: $, list: Node) =>
  list
    .children('li')
    .map((_, li) => {
      const $li = $(li)
      return {
        title: clean($li.find('h3').first().text()),
        body: markdown($, $li.find('h3').first().nextAll('p')),
        icon: image($, $li.find('img').first()),
      }
    })
    .get()

const parse = async (pathname: string, menu: ReturnType<typeof readMenu>) => {
  const $ = await loadPage(pathname)
  const slug = pathname.slice(1)
  const s = topSections($)
  const where = (n: number) => `${pathname} §${n}`

  expectHeading(s[0], /^SMM Panel/i, where(1))
  expectHeading(s[1], /What Is an SMM Panel/i, where(2))
  expectHeading(s[2], /^Why/i, where(3))
  expectHeading(s[3], /Services/i, where(4))
  expectHeading(s[4], /Payment/i, where(5))
  expectHeading(s[5], /^How to/i, where(6))
  expectHeading(s[6], /Reseller/i, where(7))
  expectHeading(s[7], /Frequently Asked/i, where(8))

  const [hero, whatIs, why, services, payments, steps, reseller, faq, cta] = s

  // §3 — the highlight note is the last child block, outside the two card lists.
  const noteBlock = why.find('ul').last().nextAll().last()

  // §4 — tabs and panels share order.
  const tabs = services.find('[role=tab]')
  const panels = services.find('[role=tabpanel]')

  // §5 — the payment table is a stack of 3-column grid rows; the first row is the header.
  const methods = payments
    .find('div[class*="grid-cols-["]')
    .filter((_, row) => $(row).children().length === 3)
    .slice(1)
    .map((_, row) => {
      const [name, type, availability] = $(row).children().map((__, c) => clean($(c).text())).get()
      return { name, type, availability }
    })
    .get()
  const secure = payments.find('h3').filter((_, h) => /secure/i.test($(h).text())).first()

  return {
    slug,
    sourceUrl: pathname,
    ...menu.get(slug),
    seo: seo($),
    hero: {
      title: heading($, hero.find('h1')),
      intro: markdown($, hero.find('h1').nextAll('p')),
      cta: link($, hero.find('a').first()),
      image: image($, hero.find('img').last()),
    },
    whatIs: {
      title: heading($, whatIs.find('h2')),
      body: markdown($, whatIs.find('h2').nextAll('p').add(whatIs.find('h2').parent().find('p'))),
      image: image($, whatIs.find('img').eq(1)),
    },
    whyChoose: {
      title: heading($, why.find('h2')),
      intro: intro($, why),
      items: why.find('ul').map((_, ul) => items($, $(ul))).get(),
      highlightNote: markdown($, noteBlock.find('p')),
    },
    services: {
      title: heading($, services.find('h2')),
      intro: intro($, services),
      platforms: tabs
        .map((i, tab) => {
          const panel = panels.eq(i)
          const cta = link($, panel.find('a').last())
          return {
            label: clean($(tab).text()),
            platformSlug: cta?.href.replace(/^\//, '') ?? null,
            title: heading($, panel.find('h3')),
            body: markdown($, panel.find('p')),
            ctaLabel: cta?.label ?? null,
            image: image($, panel.find('img').first()),
          }
        })
        .get(),
    },
    payments: {
      title: heading($, payments.find('h2')),
      intro: intro($, payments),
      methods,
      secureNote: { title: clean(secure.text()), body: inline($, secure.nextAll('p').first()) },
      image: image($, payments.find('img[alt]').filter((_, img) => !!$(img).attr('alt')).last()),
      badgeLabel: clean(payments.find('span').filter((_, sp) => /Payment Method/i.test($(sp).text())).first().text()),
    },
    steps: {
      title: heading($, steps.find('h2')),
      intro: intro($, steps),
      items: steps
        .find('ul')
        .first()
        .children('li')
        .map((_, li) => ({
          title: clean($(li).find('h3').text()),
          body: markdown($, $(li).find('p')),
          icon: image($, $(li).find('img').first()),
        }))
        .get(),
    },
    reseller: {
      title: heading($, reseller.find('h2')),
      body: markdown($, reseller.find('p')),
      cta: link($, reseller.find('a').last()),
      image: image($, reseller.find('img').last()),
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
          buttons: cta
            .find('a')
            .filter((_, a) => /rounded-full/.test($(a).attr('class') ?? ''))
            .map((i, a) => ({ ...link($, $(a)), variant: i === 0 ? 'primary' : 'outline' }))
            .get(),
          image: image($, cta.find('img').last()),
        }
      : null,
  }
}

const paths: string[] = JSON.parse(await readFile(URLS_FILE, 'utf8'))
const countries = paths.filter((p) => COUNTRY.test(p))
const menu = readMenu(await loadPage('/'))

let ok = 0
for (const pathname of countries) {
  try {
    await writeSource('countries', pathname.slice(1), await parse(pathname, menu))
    ok++
  } catch (error) {
    console.warn(`✗ ${(error as Error).message}`)
    process.exitCode = 1
  }
}
console.log(`countries: ${ok}/${countries.length} parsed → data/source/countries/`)
