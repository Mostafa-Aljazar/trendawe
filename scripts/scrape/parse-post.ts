/**
 * Blog posts, authors and categories → data/source/{posts,authors,categories}/{slug}.json
 * Post bodies are Quill HTML (div.ql-editor) converted to Markdown. The template's leftover
 * "SMMSun" CTA sits outside the body and is intentionally not extracted.
 */
import type { Element } from 'domhandler'
import { readFile } from 'fs/promises'

import { URLS_FILE } from './config'
import { clean, image, inline, loadPage, normalizeHref, seo, writeSource, type $, type Node } from './lib'

const jsonLd = ($: $, type: string) => {
  for (const s of $('script[type="application/ld+json"]').toArray()) {
    const json = JSON.parse($(s).text())
    const node = [json, ...(json['@graph'] ?? [])].flat().find((n) => n?.['@type'] === type)
    if (node) return node
  }
  return null
}

const slugFromUrl = (url = '') => url.split('/').filter(Boolean).pop() ?? ''

/** Quill list: every <li> carries data-list (bullet | ordered) and an optional ql-indent-N class. */
const list = ($: $, ol: Node) => {
  const counters: number[] = []
  return ol
    .children('li')
    .map((_, li) => {
      const $li = $(li)
      const depth = Number(($li.attr('class') ?? '').match(/ql-indent-(\d)/)?.[1] ?? 0)
      counters.length = depth + 1
      counters[depth] = (counters[depth] ?? 0) + 1
      const marker = $li.attr('data-list') === 'ordered' ? `${counters[depth]}.` : '-'
      return `${'   '.repeat(depth)}${marker} ${inline($, $li)}`
    })
    .get()
    .join('\n')
}

const bodyMarkdown = ($: $, root: Node) =>
  root
    .children()
    .map((_, el) => {
      const $el = $(el)
      const tag = (el as Element).tagName
      if (/^h[2-4]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${inline($, $el)}`
      if (tag === 'ol' || tag === 'ul') return list($, $el)
      const images = $el
        .find('img')
        .map((__, img) => {
          const i = image($, $(img))
          return i ? `![${i.alt}](${i.src})` : ''
        })
        .get()
      // A paragraph that starts like a list marker ("8. API…", "- …") must not become a list.
      const text = inline($, $el).replace(/^(\d+)\. /, '$1\\. ').replace(/^([-+*]) /, '\\$1 ')
      return [text, ...images].filter(Boolean).join('\n\n')
    })
    .get()
    .filter((block) => clean(block))
    .join('\n\n')

const parsePost = async (pathname: string) => {
  const $ = await loadPage(pathname)
  const ld = jsonLd($, 'BlogPosting')
  if (!ld) throw new Error(`${pathname}: no BlogPosting JSON-LD`)
  const article = $('h1').first().closest('article')
  const editor = article.find('.ql-editor').first()
  if (!editor.length) throw new Error(`${pathname}: no .ql-editor body`)

  const body = bodyMarkdown($, editor)
  return {
    slug: slugFromUrl(pathname),
    sourceUrl: pathname,
    title: clean($('h1').first().text()),
    excerpt: clean(ld.description ?? ''),
    featuredImage: ld.image?.[0] ? { src: normalizeHref(ld.image[0]), alt: clean($('h1').first().text()) } : null,
    category: ld.articleSection ?? null,
    author: slugFromUrl(ld.author?.url),
    publishedAt: ld.datePublished ?? null,
    updatedAt: ld.dateModified ?? null,
    sourceReadTime: clean(article.find('header span').filter((_, s) => /Read$/i.test(clean($(s).text()))).first().text()),
    seo: { ...seo($), headline: clean(ld.headline ?? '') },
    body,
    stats: {
      words: body.split(/\s+/).length,
      headings: (body.match(/^#{2,4} /gm) ?? []).length,
      links: (body.match(/\]\((?!http)[^)]*\)/g) ?? []).length,
      images: (body.match(/!\[/g) ?? []).length,
    },
  }
}

const parseAuthor = async (pathname: string) => {
  const $ = await loadPage(pathname)
  const main = $('main')
  const h1 = main.find('h1').first()
  // Name + role sit in a <header>; the bio paragraphs follow it inside the same <article>.
  const paragraphs = h1.closest('article').find('p')
  return {
    slug: slugFromUrl(pathname),
    sourceUrl: pathname,
    name: clean(h1.text()),
    role: clean(paragraphs.first().text()),
    bio: paragraphs.slice(1).map((_, p) => inline($, $(p))).get().join('\n\n'),
    avatar: image($, main.find('img').first()),
    seo: seo($),
  }
}

const parseCategory = async (pathname: string) => {
  const $ = await loadPage(pathname)
  const h1 = $('main h1').first()
  return {
    slug: slugFromUrl(pathname),
    sourceUrl: pathname,
    name: clean(h1.text()),
    description: clean(h1.nextAll('p').first().text()),
    seo: seo($),
  }
}

const paths: string[] = JSON.parse(await readFile(URLS_FILE, 'utf8'))
const groups = {
  posts: paths.filter((p) => /^\/blog\/(?!category\/|author\/)[^/]+$/.test(p)),
  authors: paths.filter((p) => p.startsWith('/blog/author/')),
  categories: paths.filter((p) => p.startsWith('/blog/category/')),
}
const parsers = { posts: parsePost, authors: parseAuthor, categories: parseCategory }

for (const [collection, list] of Object.entries(groups) as [keyof typeof groups, string[]][]) {
  let ok = 0
  for (const pathname of list) {
    try {
      await writeSource(collection, slugFromUrl(pathname), await parsers[collection](pathname))
      ok++
    } catch (error) {
      console.warn(`✗ ${(error as Error).message}`)
      process.exitCode = 1
    }
  }
  console.log(`${collection}: ${ok}/${list.length} parsed → data/source/${collection}/`)
}
