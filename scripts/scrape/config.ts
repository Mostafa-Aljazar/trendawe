import path from 'path'

export const SOURCE_ORIGIN = 'https://smmgen.com'
export const USER_AGENT = 'Mozilla/5.0 (compatible; TrendaweMigration/1.0)'

export const DATA_DIR = path.resolve(process.cwd(), 'data')
export const URLS_FILE = path.join(DATA_DIR, 'urls.json')
export const RAW_DIR = path.join(DATA_DIR, 'raw')

/** Pages that exist on the source site but are missing from its sitemap (kanok-miah was listed in the plan but returns 404). */
export const EXTRA_PATHS: string[] = []

/** `/blog/foo` → `blog__foo.html`, `/` → `index.html` */
export const rawFileFor = (pathname: string) =>
  path.join(RAW_DIR, `${pathname === '/' ? 'index' : pathname.slice(1).replaceAll('/', '__')}.html`)

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
