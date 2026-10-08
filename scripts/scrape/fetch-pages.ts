import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'

import { RAW_DIR, SOURCE_ORIGIN, URLS_FILE, USER_AGENT, rawFileFor, sleep } from './config'

const DELAY_MS = 1000
const MAX_ATTEMPTS = 3

const paths: string[] = JSON.parse(await readFile(URLS_FILE, 'utf8'))
await mkdir(RAW_DIR, { recursive: true })

let fetched = 0
let skipped = 0
const failed: string[] = []

for (const pathname of paths) {
  const file = rawFileFor(pathname)
  if (existsSync(file)) {
    skipped++
    continue
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${SOURCE_ORIGIN}${pathname}`, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await writeFile(file, await res.text())
      fetched++
      console.log(`✓ ${pathname}`)
      break
    } catch (error) {
      console.warn(`✗ ${pathname} (attempt ${attempt}): ${(error as Error).message}`)
      if (attempt === MAX_ATTEMPTS) failed.push(pathname)
      else await sleep(DELAY_MS * attempt * 2)
    }
  }

  await sleep(DELAY_MS)
}

console.log(`\nfetched ${fetched}, cached ${skipped}, failed ${failed.length}`)
if (failed.length) {
  console.log(failed.join('\n'))
  process.exitCode = 1
}
