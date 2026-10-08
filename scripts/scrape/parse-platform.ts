/**
 * Platform pages (/{platform}-smm-panel) → data/source/platforms/{slug}.json
 * Section order is documented in docs/page-inventory.md §3.2.
 */
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

const parse = async (menuEntry: ReturnType<typeof readPlatformMenu>[number]) => {
  const pathname = `/${menuEntry.slug}`
  const $ = await loadPage(pathname)
  const s = topSections($)
  const where = (n: number) => `${pathname} §${n}`

  expectHeading(s[0], /SMM Panel/i, where(1))
  expectHeading(s[1], /^What Is/i, where(2))
  expectHeading(s[2], /Services/i, where(3))
  expectHeading(s[3], /^Why/i, where(4))
  expectHeading(s[4], /^How to/i, where(5))
  expectHeading(s[5], /^Who Uses/i, where(6))
  expectHeading(s[6], /Safe/i, where(7))
  expectHeading(s[7], /Frequently Asked/i, where(8))

  const [hero, whatIs, services, why, steps, whoUses, safety, faq, cta] = s
  const trust = hero.find('p').filter((_, p) => /^Trusted by$/i.test(clean($(p).text()))).first()

  return {
    slug: menuEntry.slug,
    sourceUrl: pathname,
    name: menuEntry.name,
    menuLabel: menuEntry.menuLabel,
    menuOrder: menuEntry.menuOrder,
    icon: menuEntry.icon,
    buyPages: menuEntry.buyPages,
    hasBuyPages: menuEntry.buyPages.length > 0,
    seo: seo($),
    hero: {
      title: heading($, hero.find('h1')),
      intro: markdown($, hero.find('h1').nextAll('p')),
      buttons: buttons($, hero),
      trustBadge: trust.length ? { label: clean(trust.text()), value: clean(trust.next().text()) } : null,
      image: image($, hero.find('img').last()),
    },
    whatIs: {
      title: heading($, whatIs.find('h2')),
      body: markdown($, whatIs.find('p')),
      image: image($, whatIs.find('img').first()),
    },
    services: {
      title: heading($, services.find('h2')),
      intro: intro($, services),
      items: cards($, services),
    },
    whyChoose: {
      title: heading($, why.find('h2')),
      intro: intro($, why),
      items: cards($, why),
    },
    steps: {
      title: heading($, steps.find('h2')),
      intro: intro($, steps),
      cta: link($, steps.find('a').filter((_, a) => /rounded-full/.test($(a).attr('class') ?? '')).first()),
      items: cards($, steps).map(({ title, body, icon, number }) => ({ title, body, icon, number })),
    },
    whoUses: {
      title: heading($, whoUses.find('h2')),
      intro: intro($, whoUses),
      items: cards($, whoUses).map(({ title, body, icon }) => ({ title, body, icon })),
    },
    safety: {
      title: heading($, safety.find('h2')),
      body: markdown($, safety.find('p')),
      cta: link($, safety.find('a').filter((_, a) => /rounded-full/.test($(a).attr('class') ?? '')).last()),
      image: image($, safety.find('img').last()),
    },
    faq: {
      title: heading($, faq.find('h2')),
      intro: intro($, faq),
      items: faqFromJsonLd($),
    },
    cta: cta
      ? {
          enabled: true,
          title: heading($, cta.find('h2')),
          body: markdown($, cta.find('h2').nextAll('p')),
          buttons: buttons($, cta),
          image: image($, cta.find('img').last()),
        }
      : { enabled: false },
  }
}

const menu = readPlatformMenu(await loadPage('/'))
let ok = 0
for (const entry of menu) {
  try {
    await writeSource('platforms', entry.slug, await parse(entry))
    ok++
  } catch (error) {
    console.warn(`✗ ${(error as Error).message}`)
    process.exitCode = 1
  }
}
console.log(`platforms: ${ok}/${menu.length} parsed → data/source/platforms/`)
