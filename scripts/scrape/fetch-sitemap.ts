import { mkdir, writeFile } from 'fs/promises'

import { DATA_DIR, EXTRA_PATHS, SOURCE_ORIGIN, URLS_FILE, USER_AGENT } from './config'

const res = await fetch(`${SOURCE_ORIGIN}/sitemap.xml`, { headers: { 'user-agent': USER_AGENT } })
if (!res.ok) throw new Error(`sitemap.xml → HTTP ${res.status}`)

const xml = await res.text()
const fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => {
  const pathname = new URL(loc.trim()).pathname.replace(/\/$/, '')
  return pathname || '/'
})

const paths = [...new Set([...fromSitemap, ...EXTRA_PATHS])]

await mkdir(DATA_DIR, { recursive: true })
await writeFile(URLS_FILE, `${JSON.stringify(paths, null, 2)}\n`)

console.log(`sitemap: ${fromSitemap.length} URLs (+${paths.length - fromSitemap.length} extra) → ${URLS_FILE}`)
