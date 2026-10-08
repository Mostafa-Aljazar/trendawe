# CLAUDE.md — SMMGen Rebuild (Next.js + Payload CMS)

> Persistent context for Claude Code. Read this file fully before any task.
> The step-by-step plan lives in `PLAN.md`. Follow it phase by phase.

---

## 1. What we are building

A rebuild of the owner's marketing site **https://smmgen.com** as a single Next.js application with an embedded **Payload CMS** admin at `/admin`.

**Goals (in priority order):**
1. **URL parity** — every one of the 161 URLs in the original `sitemap.xml` must exist at the exact same path. Never rename, nest, or add trailing slashes. SEO depends on this.
2. **Visual parity** — each page should look and behave like the original (desktop + mobile), using the original assets.
3. **Everything editable** — no content is hardcoded in components. All text, images, menus, numbers, FAQs and SEO fields come from Payload.
4. **Fast & static** — pages are statically generated and refreshed through on-demand revalidation when content changes in the admin.

**Out of scope:**
- `my.smmgen.com` (the ordering app, Log In / Sign Up) — keep these as external links.
- `api.smmgen.com` — the existing backend. We only read from it during migration if needed.

---

## 2. Tech stack (do not add libraries outside this list without asking)

| Concern | Choice |
|---|---|
| Framework | Next.js, latest stable version **supported by Payload 3** (App Router, TypeScript `strict`) |
| CMS | Payload CMS 3.x embedded in the same Next app (`/admin`) |
| Database | PostgreSQL on Supabase via `@payloadcms/db-postgres` (use the pooled connection string in serverless) |
| Media storage | Supabase Storage through `@payloadcms/storage-s3` (S3-compatible endpoint) |
| Rich text | `@payloadcms/richtext-lexical` |
| Payload plugins | `@payloadcms/plugin-seo`, `@payloadcms/plugin-redirects` |
| Styling | Tailwind CSS v4 + design tokens from `docs/design-tokens.md` |
| UI primitives | shadcn/ui (Accordion, Tabs, Sheet, NavigationMenu, Dialog) — restyled to match the original |
| Scraping (migration only) | `cheerio`, Playwright |
| Testing | Playwright (visual + smoke), Vitest (utils) |
| Package manager | pnpm |
| Hosting | Vercel |

MCP servers available in this environment: **Supabase MCP** (DB, storage, SQL), **Playwright MCP** (browsing the original site, screenshots, DOM inspection). Use them instead of guessing.

---

## 3. Folder structure

```
src/
  app/
    (frontend)/
      layout.tsx                 # Header + Footer from globals
      page.tsx                   # Home (global: home-page)
      services/page.tsx
      about-us/page.tsx
      contact-us/page.tsx
      faq/page.tsx
      [slug]/page.tsx            # Root-level resolver (see §4)
      blog/
        page.tsx                 # Listing (?page=, ?q=)
        [slug]/page.tsx          # Post
        category/[slug]/page.tsx
        author/[slug]/page.tsx
      sitemap.ts
      robots.ts
      not-found.tsx
    (payload)/                   # Payload admin + API routes (generated)
  collections/                   # Payload collection configs
  globals/                       # Payload global configs
  blocks/                        # Payload block configs (page-builder)
  fields/                        # Reusable field groups (hero, faq, cta, seo...)
  components/
    layout/                      # Header, MegaMenu, MobileNav, Footer
    sections/                    # Pure presentational sections (Hero, Steps, FeatureGrid...)
    blocks/                      # RenderBlocks + one renderer per block
    templates/                   # CountryTemplate, PlatformTemplate, BuyTemplate, LegalTemplate
    ui/                          # shadcn primitives
  lib/
    payload.ts                   # getPayload() helper
    queries/                     # Cached data fetchers (one file per collection/global)
    resolve-slug.ts              # Root-level slug → template resolver
    tokens.ts                    # {{stat}} text interpolation
    seo.ts                       # generateMetadata + JSON-LD helpers
    revalidate.ts                # Payload hooks → revalidateTag
  payload.config.ts
  payload-types.ts               # Generated — never edit by hand
scripts/
  scrape/                        # Phase 0: fetch + parse the original site into JSON
  seed/                          # Idempotent seeders using the Payload Local API
  qa/                            # URL parity, link checker, meta parity
data/
  raw/                           # Raw HTML snapshots (gitignored)
  content/                       # Parsed JSON per collection/global (committed)
  assets/                        # Downloaded original images (gitignored, uploaded to storage)
docs/
  design-tokens.md
  page-inventory.md
  screenshots/reference/         # Original-site screenshots for visual diffing
```

---

## 4. Routing map (exact URLs — the source of truth)

All marketing pages live at the **root level**, so `src/app/(frontend)/[slug]/page.tsx` resolves a slug in this order:

| Pattern | Count | Source | Template |
|---|---|---|---|
| `/` | 1 | global `home-page` | Home blocks |
| `/services`, `/about-us`, `/contact-us`, `/faq` | 4 | globals | Static routes with blocks |
| `/best-smm-panel`, `/cheap-smm-panel`, `/smm-reseller-panel`, `/wholesale-smm-panel`, `/white-label-smm-panel`, `/smm-panel-api` | 6 | collection `landing-pages` (blocks) | `[slug]` → blocks |
| `/privacy-policy`, `/terms-and-conditions`, `/cookies-policy`, `/refund-policy`, `/disclaimer` | 5 | collection `legal-pages` | `[slug]` → LegalTemplate |
| `/smm-panel-{country}` | 25 | collection `countries` | `[slug]` → CountryTemplate |
| `/{platform}-smm-panel` (e.g. `x-twitter-smm-panel`) | 15 | collection `platforms` | `[slug]` → PlatformTemplate |
| `/buy-{platform}-{service}` | 23 | collection `buy-pages` | `[slug]` → BuyTemplate |
| `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/author/[slug]` | 79 posts + listings | `posts`, `categories`, `authors` | Blog templates |

Rules:
- The resolver queries collections by the **stored `slug` field**, never by parsing the pattern. Patterns are only for documentation.
- Slugs must be unique across all root-level collections — enforce with a shared `validateRootSlug` hook.
- `generateStaticParams` returns every published slug from all root-level collections.
- `Log In` → `https://my.smmgen.com`, `Sign Up` → `https://my.smmgen.com/signup` (stored in `site-settings`, not hardcoded).
- "How it Works" in the Company menu is the anchor `/#how-it-works`, not a page.

---

## 5. Content model

### Collections
| Slug | Purpose | Key fields |
|---|---|---|
| `platforms` | 15 platforms | name, slug, icon, smallIcon, menuOrder, hasBuyPages, template fields (hero, whatIs, serviceCards[], whyChoose[], steps[], whoUses[], safety, faq, cta), seo |
| `buy-pages` | 23 "Buy X" pages | platform (rel), slug, menuLabel, menuOrder, hero (with checklist), whyBuy, packageTypes[], whyChoose[], steps[], pricingPackages[], testimonials (rel), faq, cta, seo |
| `countries` | 25 country pages | name, slug, menuColumn, menuOrder, hero, whatIs, whyChoose[5], highlightNote, featuredPlatforms[] (rel + override text), paymentMethods[] (rel + type label), steps[4], reseller, faq, cta, seo |
| `landing-pages` | 6 commercial pages | title, slug, `layout` (blocks), seo |
| `legal-pages` | 5 legal pages | title, slug, intro, lastUpdated, effectiveDate, body (rich text), relatedLinks, seo |
| `posts` | Blog | title, slug, excerpt, featuredImage, body (lexical), category (rel), author (rel), publishedAt, readingTime (computed), relatedPosts (optional override), seo |
| `categories` | Blog categories | name, slug, description |
| `authors` | Blog authors | name, slug, role, avatar, bio |
| `payment-methods` | Shared library | name, type, icon |
| `testimonials` | Shared library | quote, role, country, rating |
| `faq-groups` | Reusable FAQ sets (Home + /faq share one) | title, items[] { question, answer } |
| `media` | Uploads | alt (required), caption |
| `users` | Admin users | name, email, role (`admin` / `editor` / `writer`) |

### Globals
| Slug | Purpose |
|---|---|
| `site-settings` | Brand name, logo(s), contact email, phone, address, trade licence, social links, app URLs, **stats** (ordersCompleted, activeUsers, activeServices, platformsCount, foundedYear, rating) |
| `header` | Company menu items, CTA labels (Services + Service Area menus are generated from collections) |
| `footer` | About text, quick links, bottom country strip toggle |
| `home-page`, `services-page`, `about-page`, `contact-page`, `faq-page` | Singleton pages, each with a `layout` blocks field (+ seo) |

### Blocks (page builder for singletons + landing pages)
`hero`, `statsRow`, `richTextWithImage`, `featureGrid` (variants: icon cards, numbered, image cards; 2/3/4 cols), `platformTabs` (auto from `platforms`), `platformCardsGrid` (auto), `stepsTimeline`, `audienceGrid`, `startingPriceCard`, `priceOverviewTabs`, `comparisonTable` (generic rows × columns, supports yes/no icons and a "recommended" column), `marginExamples`, `codeSample`, `testimonials`, `faqSection` (rel → `faq-groups` or inline), `ctaBanner`.

### Stat tokens
The original text embeds live numbers ("over 108774260 orders", "98121 users"). Never hardcode them. Write `{{ordersCompleted}}`, `{{activeUsers}}`, `{{activeServices}}`, `{{platformsCount}}`, `{{foundedYear}}` in CMS text; `lib/tokens.ts` replaces them at render time from `site-settings.stats` with locale formatting (e.g. `108,774,260`, `98K+`).

---

## 6. Rendering & data rules

- Server Components by default. `'use client'` only for: mega menu / mobile nav, tabs, accordions, carousels, blog search input.
- All data access goes through `lib/queries/*` using the Payload Local API, wrapped in `unstable_cache` / `cache` with **tags** (`platforms`, `platform:{slug}`, `countries`, `global:site-settings`, …).
- Payload `afterChange` / `afterDelete` hooks call `revalidateTag` (see `lib/revalidate.ts`). Changing `site-settings`, `header` or `footer` revalidates the layout tag.
- Header "Services" and "Service Area" menus, the footer "Our Services" tree, and the footer country strip are **generated** from `platforms`, `buy-pages`, `countries` ordered by `menuOrder`.
- Every collection and global has **drafts + versions** enabled and **Live Preview** configured.
- Images: always `next/image` with explicit sizes; remote patterns for the storage bucket only.
- Section components receive typed props (from `payload-types.ts`) and contain **no copy** of their own.

---

## 7. Known issues on the original site — fix them during migration

1. Blog post CTA contains a leftover from another brand ("Ready to Grow your Social Media in Bangladesh", "SMMSun", "68,000 users") → replace with the standard SMMGen CTA from `site-settings`.
2. `/white-label-smm-panel` contains a section titled "Why SMMGen for Wholesale SMM Services?" copied from the wholesale page → retitle for white label.
3. Inconsistent numbers (79,000 vs 98,121 users; 76M vs 108M orders) → replace with stat tokens.
4. Footer address/phone differ between pages (Bangladesh vs Southampton UK, a US phone on one page) → single source in `site-settings`. **Ask the owner which address is correct.**
5. FAQ link alternates between `/faq` and `/#faq` → always `/faq`.
6. Some Company menus omit "Best SMM Panel" → menu comes from one global.
7. Author `kanok-miah` exists but is missing from the sitemap → generated sitemap includes all authors.
8. Buy-page testimonial carousel duplicates the same 3 quotes 3× in the HTML → render the list once; loop with CSS/JS if needed.

Log any other inconsistency you find in `docs/page-inventory.md` under "Content issues" instead of silently copying it.

---

## 8. Commands

```bash
pnpm dev                 # Next + Payload admin at /admin
pnpm build && pnpm start
pnpm lint
pnpm typecheck           # tsc --noEmit
pnpm payload generate:types
pnpm payload migrate:create && pnpm payload migrate
pnpm scrape              # scripts/scrape → data/raw + data/content
pnpm seed                # scripts/seed (idempotent, upsert by slug)
pnpm test:e2e            # Playwright
pnpm qa:urls             # 161-URL parity check against a base URL
```

---

## 9. How to work in this repo (rules for Claude Code)

1. Work through `PLAN.md` **one phase at a time**. Start each phase in plan mode, propose the approach, then implement.
2. Tick checkboxes in `PLAN.md` as tasks finish. Add newly discovered tasks under the current phase.
3. Before marking any task done: `pnpm typecheck && pnpm lint && pnpm build` must pass.
4. Commit after each task with Conventional Commits (`feat(countries): …`, `fix(header): …`).
5. **Stop at the end of every phase** and post a short summary: what was built, what to review, open questions.
6. Never change a public URL. Never hardcode content in components. Never edit `payload-types.ts` by hand.
7. When unsure what the original looks like, inspect it with Playwright MCP — don't guess.
8. Ask before: adding a dependency, changing the content model in a way that breaks seeded data, or deleting data.
9. Secrets live in `.env` only. Keep `.env.example` up to date.
