# CLAUDE.md — Trendawe Marketing Site (Next.js + Payload CMS)

> Persistent context for Claude Code. Read this file fully before any task.
> The step-by-step plan lives in `PLAN.md`. Follow it phase by phase.

---

## 1. What we are building

The **Trendawe** marketing site (brand: https://trendawe.com) as a single Next.js application with an embedded **Payload CMS** admin at `/admin`.
Its **structure and design replicate https://smmgen.com exactly** (the design reference), but with **Trendawe branding and Trendawe's own content**.

**What comes from where:**
| Item | Source |
|---|---|
| Page types, sections, components, layout, interactions, responsive behaviour | **smmgen.com** — replicated exactly, written from scratch (our own React/Tailwind code; never copy its HTML/CSS/JS) |
| Images / illustrations | smmgen.com (owner's decision — **pending confirmation that we have permission**) |
| Logo, colors | **trendawe.com** (see §2a) |
| Text content (all copy, FAQs, posts, SEO) | **Ours.** Seeded with original placeholder copy written for Trendawe (never copied from smmgen); the team replaces it from the admin |

**Goals (in priority order):**
1. **Design parity** — every page type, section and component looks and behaves like the smmgen.com equivalent (desktop + mobile), re-skinned with Trendawe brand tokens.
2. **Same page set** — same page types and URL patterns as smmgen.com (§4), with Trendawe's own slugs/content.
3. **Bilingual** — English (default) + Arabic (RTL). See §4a.
4. **Everything editable** — no content is hardcoded in components. All text, images, menus, numbers, FAQs and SEO fields come from Payload, per locale.
5. **Fast & static** — pages are statically generated and refreshed through on-demand revalidation when content changes in the admin.

**Out of scope:**
- The ordering panel (Log In / Sign Up) — external links stored in `site-settings`.
- Scraping text content from smmgen.com — we don't migrate its copy.

### 2a. Brand (from trendawe.com)
| Token | Value |
|---|---|
| Primary (orange, logo) | `#F37321` |
| Neutral light (logo "awe") | `#E0E0E0` |
| Dark / navy (theme color) | `#0F172A` |
| Arabic font | Cairo |
| Latin font | same as smmgen.com (confirm in design audit) |

The current logo is designed for dark backgrounds (light-grey "awe"); a light-background variant is needed for the white header.

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
      [locale]/                  # en | ar — middleware rewrites un-prefixed URLs to /en (see §4a)
        layout.tsx               # <html lang dir>, Header + Footer from globals
        page.tsx                 # Home (global: home-page)
        services/page.tsx
        about-us/page.tsx
        contact-us/page.tsx
        faq/page.tsx
        [slug]/page.tsx          # Root-level resolver (see §4)
        blog/
          page.tsx               # Listing (?page=, ?q=)
          [slug]/page.tsx        # Post
          category/[slug]/page.tsx
          author/[slug]/page.tsx
        not-found.tsx
      sitemap.ts                 # Includes both locales + hreflang alternates
      robots.ts
  proxy.ts                       # Locale routing (en default, no prefix; /ar prefix). Next 16 renamed middleware → proxy
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
    i18n.ts                      # locales, default locale, dir(), localized href helper
    dictionaries/                # UI-only strings (en.json, ar.json): "Read More", aria labels… — never page content
    queries/                     # Cached data fetchers (one file per collection/global)
    resolve-slug.ts              # Root-level slug → template resolver
    tokens.ts                    # {{stat}} text interpolation
    seo.ts                       # generateMetadata + JSON-LD helpers
    revalidate.ts                # Payload hooks → revalidateTag
  payload.config.ts
  payload-types.ts               # Generated — never edit by hand
scripts/
  audit/                         # Phase 0: design audit + image download from the reference site
  seed/                          # Idempotent seeders using the Payload Local API
  qa/                            # URL parity, link checker, meta parity
data/
  content/                       # Placeholder seed content (our own copy, en + ar) per collection/global (committed)
  assets/                        # Downloaded reference images (gitignored, uploaded to storage)
docs/
  design-tokens.md
  page-inventory.md
  screenshots/reference/         # smmgen.com screenshots for visual diffing
```

---

## 4. Routing map (URL patterns — mirror smmgen.com)

Paths below are for the default locale (English). Arabic uses the same path under `/ar` (see §4a).
All marketing pages live at the **root level**, so `src/app/(frontend)/[locale]/[slug]/page.tsx` resolves a slug in this order:

| Pattern | Count | Source | Template |
|---|---|---|---|
| `/` | 1 | global `home-page` | Home blocks |
| `/services`, `/about-us`, `/contact-us`, `/faq` | 4 | globals | Static routes with blocks |
| `/best-smm-panel`, `/cheap-smm-panel`, `/smm-reseller-panel`, `/wholesale-smm-panel`, `/white-label-smm-panel`, `/smm-panel-api` | 6 | collection `landing-pages` (blocks) | `[slug]` → blocks |
| `/privacy-policy`, `/terms-and-conditions`, `/cookies-policy`, `/refund-policy`, `/disclaimer` | 5 | collection `legal-pages` | `[slug]` → LegalTemplate |
| `/smm-panel-{country}` | 25 (same list as smmgen) | collection `countries` | `[slug]` → CountryTemplate |
| `/{platform}-smm-panel` (e.g. `x-twitter-smm-panel`) | 15 (same list as smmgen) | collection `platforms` | `[slug]` → PlatformTemplate |
| `/buy-{platform}-{service}` | 23 (same list as smmgen) | collection `buy-pages` | `[slug]` → BuyTemplate |
| `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/author/[slug]` | 3–5 placeholder posts + listings | `posts`, `categories`, `authors` | Blog templates |

Rules:
- The resolver queries collections by the **stored `slug` field**, never by parsing the pattern. Patterns are only for documentation.
- Slugs must be unique across all root-level collections — enforce with a shared `validateRootSlug` hook.
- `generateStaticParams` returns every published slug from all root-level collections.
- `Log In` / `Sign Up` → ordering-panel URLs stored in `site-settings` (per locale if needed), never hardcoded.
- "How it Works" in the Company menu is the anchor `/#how-it-works`, not a page.
- No trailing slashes.

### 4a. Localization (English default + Arabic)
- Locales: `en` (default) and `ar`. English URLs have **no prefix** (`/instagram-smm-panel`); Arabic URLs are prefixed (`/ar/instagram-smm-panel`). `/en/...` redirects to the un-prefixed URL.
- `src/proxy.ts` rewrites un-prefixed paths to `/en/...` internally; routes live under `app/(frontend)/[locale]/`. Admin (`/admin`) and `/api` are excluded.
- Payload `localization` is enabled with locales `en`, `ar` and `fallback: true` (missing Arabic falls back to English). All copy/SEO fields are `localized: true`; structural fields (slug, relations, menuOrder, icons, prices) are **not** localized, so both languages share one slug.
- `<html lang dir>` is set per locale (`dir="rtl"` for Arabic). Use Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) — never `ml/mr/pl/pr/left/right` — and flip directional icons (arrows, chevrons) with `rtl:` variants.
- Fonts: Latin font from the design audit for `en`; **Cairo** for `ar` (both via `next/font`).
- Every page outputs `hreflang` alternates (en, ar, x-default → en); the sitemap lists both locales.
- A language switcher in the header links to the same page in the other locale.
- UI micro-strings that are not content (e.g. "Read More", "min read", aria labels) live in `lib/dictionaries/{en,ar}.json`; everything else comes from Payload.

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
- All queries pass the current `locale` to Payload; cache tags and keys include the locale.

---

## 7. Content rules (placeholder copy)

- All seeded copy is **original placeholder text written for Trendawe** in English and Arabic — never copied or paraphrased from smmgen.com. The team replaces it from the admin.
- Use stat tokens for every number (no hardcoded counts).
- Lessons from the reference site to apply structurally: FAQ links always go to `/faq`; Company menu comes from one global; the sitemap includes every author; the testimonial carousel renders its list once (loop with CSS/JS).
- Log open content/branding questions in `docs/page-inventory.md` under "Open questions".

---

## 8. Commands

```bash
pnpm dev                 # Next + Payload admin at /admin
pnpm build && pnpm start
pnpm lint
pnpm typecheck           # tsc --noEmit
pnpm payload generate:types
pnpm payload migrate:create && pnpm payload migrate
pnpm audit:images        # scripts/audit → data/assets (reference images)
pnpm seed                # scripts/seed (idempotent, upsert by slug)
pnpm test:e2e            # Playwright
pnpm qa:urls             # every expected URL (both locales) returns 200
```

---

## 9. How to work in this repo (rules for Claude Code)

1. Work through `PLAN.md` **one phase at a time**. Start each phase in plan mode, propose the approach, then implement.
2. Tick checkboxes in `PLAN.md` as tasks finish. Add newly discovered tasks under the current phase.
3. Before marking any task done: `pnpm typecheck && pnpm lint && pnpm build` must pass.
4. Commit after each task with Conventional Commits (`feat(countries): …`, `fix(header): …`). **No `Co-Authored-By` or other attribution lines.**
5. **Stop at the end of every phase** and post a short summary: what was built, what to review, open questions.
6. Never change an agreed URL pattern. Never hardcode content in components. Never copy smmgen.com text or code. Never edit `payload-types.ts` by hand.
7. When unsure what the reference looks like, inspect smmgen.com with Playwright — don't guess.
8. Ask before: adding a dependency, changing the content model in a way that breaks seeded data, or deleting data.
9. Secrets live in `.env` only. Keep `.env.example` up to date.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
