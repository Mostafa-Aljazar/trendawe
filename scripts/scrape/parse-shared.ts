/**
 * Shared data → data/source/shared/*.json
 *   site-settings · header · footer · payment-methods · testimonials · faq-groups
 * Platform, buy-page and country menus are generated from those collections (see parse-platform /
 * parse-country), so only the hand-curated parts of the header/footer are stored here.
 */
import { readdir, readFile } from 'fs/promises'
import path from 'path'

import { clean, image, link, loadPage, rscPayload, SOURCE_DIR, writeSource, type $ } from './lib'

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const readJsonDir = async <T>(dir: string): Promise<T[]> =>
  Promise.all((await readdir(path.join(SOURCE_DIR, dir))).map(async (f) => JSON.parse(await readFile(path.join(SOURCE_DIR, dir, f), 'utf8')) as T))

/** "Email:" / "Address:" / "Trade Licence:" label spans in a scope → value of the next element. */
const labelled = ($: $, scope: ReturnType<$>, label: RegExp) =>
  clean(
    scope
      .find('span')
      .filter((_, s) => label.test(clean($(s).text())))
      .first()
      .next()
      .text(),
  )

const $ = await loadPage('/')
const header = $('header').first()
const footer = $('footer').first()

// ── site-settings ──────────────────────────────────────────────────────────────
const statsMatch = rscPayload($).match(/"stats":(\{[^}]*\})/)
const rawStats = statsMatch ? JSON.parse(statsMatch[1]) : {}
const socials = footer
  .find('a[href^="http"]')
  .filter((_, a) => !/smmgen\.com/.test($(a).attr('href') ?? ''))
  .map((_, a) => ({ platform: clean($(a).text()) || ($(a).attr('aria-label') ?? ''), href: $(a).attr('href') ?? '', icon: image($, $(a).find('img').first()) }))
  .get()
const rating = $('main section').first().find('span').filter((_, s) => /^\d\.\d$/.test(clean($(s).text()))).first()

await writeSource('shared', 'site-settings', {
  brandName: clean(header.find('img').first().attr('alt') ?? ''),
  logo: image($, header.find('img').first()),
  contact: {
    email: labelled($, footer, /^Email:?$/i),
    address: labelled($, footer, /^Address:?$/i),
    tradeLicence: labelled($, footer, /^Trade Licen[cs]e:?$/i),
  },
  socials,
  appUrls: {
    login: header.find('a').filter((_, a) => /^Log In$/i.test(clean($(a).text()))).attr('href') ?? null,
    signup: header.find('a').filter((_, a) => /^Sign Up$/i.test(clean($(a).text()))).attr('href') ?? null,
  },
  // Live numbers from the source (rendered as {{tokens}} in copy).
  stats: {
    ordersCompleted: rawStats.ordersCompleted ?? null,
    ordersAll: rawStats.ordersAll ?? null,
    activeServices: rawStats.servicesAll ?? null,
    activeUsers: rawStats.usersAll ?? null,
    usersActive: rawStats.usersActive ?? null,
    ticketsAll: rawStats.ticketsAll ?? null,
    platformsCount: 15,
    foundedYear: 2018,
    rating: rating.length ? Number(clean(rating.text())) : null,
  },
})

// ── header ─────────────────────────────────────────────────────────────────────
const companyButton = header.find('button').filter((_, b) => /^Company$/i.test(clean($(b).text()))).first()
const companyMenu = companyButton.parent().find('a').map((_, a) => link($, $(a))).get()
await writeSource('shared', 'header', {
  nav: [
    { type: 'link', ...link($, header.find('a').filter((_, a) => clean($(a).text()) === 'Home').first()) },
    { type: 'servicesMenu', label: 'Services', allServices: link($, header.find('a[href="/services"]').first()) },
    { type: 'link', ...link($, header.find('a[href="/about-us"]').first()) },
    { type: 'link', ...link($, header.find('a[href="/contact-us"]').first()) },
    { type: 'countriesMenu', label: 'Service Area' },
    { type: 'dropdown', label: 'Company', items: companyMenu },
  ],
  ctas: {
    login: link($, header.find('a').filter((_, a) => /^Log In$/i.test(clean($(a).text()))).first()),
    signup: link($, header.find('a').filter((_, a) => /^Sign Up$/i.test(clean($(a).text()))).first()),
  },
})

// ── footer ─────────────────────────────────────────────────────────────────────
const sectionLinks = (title: RegExp) => {
  const heading = footer.find('*').filter((_, e) => title.test(clean($(e).text())) && $(e).children().length === 0).first()
  let scope = heading.parent()
  while (!scope.find('a').length && scope.parent().length) scope = scope.parent()
  return scope.find('a').map((_, a) => link($, $(a))).get()
}
const stripTitle = footer.find('*').filter((_, e) => /Local Payments/i.test(clean($(e).text())) && $(e).children().length === 0).first()
await writeSource('shared', 'footer', {
  about: clean(footer.find('p').first().text()),
  quickLinksTitle: 'Quick Links',
  quickLinks: sectionLinks(/^Quick Links$/i),
  servicesTitle: 'Our Services',
  countryStrip: { enabled: true, title: clean(stripTitle.text()) },
})

// ── payment-methods (deduplicated across all countries) ───────────────────────
type Country = { slug: string; payments: { methods: { name: string; type: string }[] } }
const countries = await readJsonDir<Country>('countries')
const methods = new Map<string, { slug: string; name: string; types: Set<string>; countries: string[] }>()
for (const country of countries)
  for (const m of country.payments.methods) {
    const slug = slugify(m.name)
    const entry = methods.get(slug) ?? { slug, name: m.name, types: new Set<string>(), countries: [] }
    entry.types.add(m.type)
    entry.countries.push(country.slug)
    methods.set(slug, entry)
  }
await writeSource(
  'shared',
  'payment-methods',
  [...methods.values()]
    .sort((a, b) => b.countries.length - a.countries.length || a.name.localeCompare(b.name))
    .map((m) => ({ ...m, types: [...m.types] })),
)

// ── testimonials (each buy page has its own 3) ────────────────────────────────
type Buy = { slug: string; testimonials: { items: { quote: string; role: string; country: string; rating: number }[] } }
const buyPages = await readJsonDir<Buy>('buy-pages')
await writeSource(
  'shared',
  'testimonials',
  buyPages.flatMap((page) => page.testimonials.items.map((t, i) => ({ id: `${page.slug}-${i + 1}`, ...t, usedOn: [page.slug] }))),
)

// ── faq-groups: home + /faq share one group when identical ─────────────────────
type Block = { blockType: string; heading?: string; intro?: string; faq?: { question: string; answer: string }[] }
const home = JSON.parse(await readFile(path.join(SOURCE_DIR, 'globals', 'home-page.json'), 'utf8')) as { layout: Block[] }
const faqPage = JSON.parse(await readFile(path.join(SOURCE_DIR, 'globals', 'faq-page.json'), 'utf8')) as { layout: Block[] }
const homeFaq = home.layout.find((b) => b.blockType === 'faqSection')?.faq ?? []
const pageFaq = faqPage.layout.find((b) => b.blockType === 'faqSection')?.faq ?? []
const same = JSON.stringify(homeFaq) === JSON.stringify(pageFaq)
await writeSource('shared', 'faq-groups', [
  { slug: 'general', title: 'General FAQ', items: same || pageFaq.length >= homeFaq.length ? pageFaq : homeFaq, usedOn: ['/', '/faq'] },
  ...(same ? [] : [{ slug: 'home', title: 'Home FAQ', items: homeFaq, usedOn: ['/'], note: 'Differs from /faq on the source' }]),
])

console.log(
  `shared: site-settings, header (${companyMenu.length} company links), footer, ${methods.size} payment methods, ` +
    `${buyPages.length * 3} testimonials, faq-groups (home ${same ? '=' : '≠'} /faq) → data/source/shared/`,
)
