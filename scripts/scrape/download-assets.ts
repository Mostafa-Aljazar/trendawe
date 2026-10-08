/**
 * Collect every image used by the reference pages (content + decorative backgrounds) and download
 * them to data/assets/, resumable. Writes data/assets-manifest.json (url → file, size, pages).
 *
 *   pnpm scrape:assets --dry-run   # count + total size via HEAD requests, downloads nothing
 *   pnpm scrape:assets             # download missing files (safe to re-run after a dropped connection)
 */
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises'
import path from 'path'

import { DATA_DIR, RAW_DIR, SOURCE_ORIGIN, USER_AGENT, sleep } from './config'
import { normalizeHref } from './lib'

const DRY_RUN = process.argv.includes('--dry-run')
const ASSETS_DIR = path.join(DATA_DIR, 'assets')
const MANIFEST = path.join(DATA_DIR, 'assets-manifest.json')
const CONCURRENCY = 4
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i

/** Absolute URL for every image reference in a page's HTML. */
const collect = (html: string) => {
  const urls = new Set<string>()
  const add = (raw: string) => {
    let value = raw.replace(/&amp;/g, '&').trim()
    if (value.startsWith('/_next/image')) value = decodeURIComponent(new URL(value, SOURCE_ORIGIN).searchParams.get('url') ?? '')
    if (!value || value.startsWith('data:')) return
    // Offline legacy media host → current host (same files).
    const url = new URL(normalizeHref(value), SOURCE_ORIGIN)
    if (IMAGE_EXT.test(url.pathname)) urls.add(url.origin + url.pathname)
  }
  for (const m of html.matchAll(/(?:src|href|content)="([^"]+)"/g)) add(m[1])
  for (const m of html.matchAll(/srcSet="([^"]+)"/gi)) m[1].split(',').forEach((part) => add(part.trim().split(' ')[0]))
  for (const m of html.matchAll(/url\((?:&quot;|['"])?([^'")&]+)(?:&quot;|['"])?\)/g)) add(m[1])
  return urls
}

/** Local path mirroring the source path: /image/a/b.png → data/assets/smmgen.com/image/a/b.png */
const localFile = (url: string) => {
  const u = new URL(url)
  return path.join(ASSETS_DIR, u.hostname, ...decodeURIComponent(u.pathname).split('/').filter(Boolean))
}

const format = (bytes: number) => (bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} KB`)

// 1. Collect from every raw page.
const usage = new Map<string, Set<string>>()
for (const file of await readdir(RAW_DIR)) {
  const page = file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '').replaceAll('__', '/')}`
  for (const url of collect(await readFile(path.join(RAW_DIR, file), 'utf8'))) {
    if (!usage.has(url)) usage.set(url, new Set())
    usage.get(url)!.add(page)
  }
}
const urls = [...usage.keys()].sort()
const byHost = urls.reduce<Record<string, number>>((acc, u) => ((acc[new URL(u).hostname] = (acc[new URL(u).hostname] ?? 0) + 1), acc), {})
console.log(`${urls.length} unique images  ${JSON.stringify(byHost)}`)

// 2. Size (HEAD) or download (GET), with a small worker pool.
const manifest: { url: string; file: string; bytes: number | null; status: string; pages: string[] }[] = []
let done = 0
let bytesTotal = 0
let failed = 0
let lastReport = Date.now()

const work = async (url: string) => {
  const file = localFile(url)
  const entry = { url, file: path.relative(DATA_DIR, file).replaceAll('\\', '/'), bytes: null as number | null, status: '', pages: [...usage.get(url)!] }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (!DRY_RUN && existsSync(file)) {
        entry.bytes = (await stat(file)).size
        entry.status = 'cached'
        break
      }
      const res = await fetch(url, { method: DRY_RUN ? 'HEAD' : 'GET', headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (DRY_RUN) {
        entry.bytes = Number(res.headers.get('content-length') ?? 0) || null
      } else {
        const body = Buffer.from(await res.arrayBuffer())
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, body)
        entry.bytes = body.length
      }
      entry.status = 'ok'
      break
    } catch (error) {
      entry.status = `error: ${(error as Error).message}`
      if (attempt < 3) await sleep(1000 * attempt)
    }
  }
  if (entry.status.startsWith('error')) failed++
  bytesTotal += entry.bytes ?? 0
  manifest.push(entry)
  done++
  if (Date.now() - lastReport > 15_000 || done === urls.length) {
    lastReport = Date.now()
    console.log(`${DRY_RUN ? 'sized' : 'downloaded'} ${done}/${urls.length} (${Math.round((done / urls.length) * 100)}%) · ${format(bytesTotal)} · ${failed} failed`)
  }
}

const queue = [...urls]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await work(queue.shift()!)
  }),
)

manifest.sort((a, b) => a.url.localeCompare(b.url))
if (!DRY_RUN) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
const unknown = manifest.filter((m) => m.bytes === null).length
console.log(`\n${DRY_RUN ? 'DRY RUN — ' : ''}${urls.length} images · ${format(bytesTotal)}${unknown ? ` (+${unknown} without a size)` : ''} · ${failed} failed`)
if (failed) {
  console.log(manifest.filter((m) => m.status.startsWith('error')).slice(0, 10).map((m) => `  ${m.url} — ${m.status}`).join('\n'))
  process.exitCode = 1
}
