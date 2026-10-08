# PLAN.md — Trendawe Site Implementation Plan (design reference: smmgen.com)

> Phase-by-phase plan for Claude Code. Context and rules are in `CLAUDE.md`.
> Each phase ends with **acceptance criteria** and a **stop for review**.

## Scope at a glance

| Item | Count |
|---|---|
| Page types / URL patterns | Same as smmgen.com, in English (default) + Arabic (`/ar`) |
| Unique page designs | 17 (11 singleton/landing + 6 templates) |
| Templates | Country (25), Platform (15), Buy (23), Blog post (79), Blog listing, Legal (5) |
| Singleton / landing pages | Home, Services, About, Contact, FAQ + Best, Cheap, Reseller, Wholesale, White Label, API |
| Admin | Payload CMS at `/admin` — collections, globals, blocks, drafts, live preview, roles, en/ar localization |
| Content | smmgen.com text scraped as a source, rewritten for Trendawe (en) and translated (ar) |

## Phase overview

| Phase | Name | Output |
|---|---|---|
| 0 | Setup, audit & content extraction | Running app + admin, i18n routing, design tokens, reference screenshots, source content + images |
| 1 | Foundation | Design system, layout (header/mega menu/footer), shared sections, core globals & libraries |
| 2 | Country template | 25 country pages live from CMS — validates the whole architecture |
| 3 | Platform & Buy templates | 15 + 23 pages, auto-generated menus |
| 4 | Blog | Posts, categories, authors, listing/search/pagination, 79 rewritten posts |
| 5 | Singleton, landing & legal pages | 11 block-built pages + 5 legal pages |
| 6 | SEO, routing & revalidation | Metadata, JSON-LD, sitemap, robots, redirects, 404, live preview |
| 7 | Admin experience | Roles/access, dashboard widget, editor UX polish |
| 8 | QA & launch | URL/i18n checks, visual diff, Lighthouse, deploy |

---

## Phase 0 — Setup, audit & content extraction

**Goal:** a working bilingual Next.js + Payload project, a precise picture of the reference design (smmgen.com), and all its content captured as source JSON.

### 0.1 Project setup
- [x] Scaffold with `pnpm create payload-app` (blank template, Postgres adapter, TypeScript) — Payload 3.90.2 + Next 16.3.3.
- [ ] Configure `src/` structure exactly as in `CLAUDE.md §3`.
- [x] Connect Supabase Postgres (transaction pooler for runtime, session pooler for dev/migrations).
- [x] Configure `@payloadcms/storage-s3` against Supabase Storage (bucket `media`, public read).
- [x] Tailwind v4 + shadcn/ui init; ESLint + Prettier; `typecheck` script; Vitest; Playwright.
- [x] Localization: Payload `localization` (en default, ar, fallback), `src/proxy.ts` locale routing (en un-prefixed, `/ar` prefix), `app/(frontend)/[locale]/` layout with `lang`/`dir`, `lib/i18n.ts`, UI dictionaries.
- [x] `.env.example` with: `DATABASE_URI`, `DATABASE_URI_DIRECT`, `PAYLOAD_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `NEXT_PUBLIC_SITE_URL`, `PREVIEW_SECRET`.
- [x] First admin user created; `/admin` loads; image upload lands in Supabase Storage.

### 0.2 Design audit (Playwright MCP on https://smmgen.com)
- [ ] Extract design tokens from computed styles into `docs/design-tokens.md`: font families + weights + sizes per heading level, color palette (primary blue, text, muted, backgrounds, gradients), radii, shadows, container widths, section spacing, breakpoints.
- [ ] Identify the Latin web font(s) and load them with `next/font`; load **Cairo** for Arabic.
- [ ] Map brand tokens from trendawe.com (`CLAUDE.md §2a`) onto the reference palette: which smmgen colour becomes Trendawe orange / navy / neutral. Get or create a light-background logo variant.
- [ ] Capture **reference screenshots** (desktop 1440px + mobile 390px, full page) for one representative URL per design → `docs/screenshots/reference/`:
  `/`, `/services`, `/about-us`, `/contact-us`, `/faq`, `/best-smm-panel`, `/cheap-smm-panel`, `/smm-reseller-panel`, `/wholesale-smm-panel`, `/white-label-smm-panel`, `/smm-panel-api`, `/smm-panel-egypt`, `/instagram-smm-panel`, `/pinterest-smm-panel`, `/buy-instagram-followers`, `/blog`, `/blog/threads-vs-instagram`, `/privacy-policy`.
- [ ] Capture interaction states: Services mega menu (with sub-menu open), Service Area two-column menu, Company menu, mobile drawer, FAQ accordion open, platform tabs.
- [ ] Write `docs/page-inventory.md`: every section of every design, in order, with its matching block/field name and RTL notes. Include an "Open questions" list.

### 0.3 Content extraction (`scripts/scrape/`)
- [x] `fetch-sitemap.ts` — read `https://smmgen.com/sitemap.xml` → `data/urls.json` (161 URLs). `/blog/author/kanok-miah` returns 404 on the source, so it is not included.
- [x] `fetch-pages.ts` — download raw HTML for every URL to `data/raw/` (throttle ~1 req/s, retry on failure, skip if cached).
- [x] FAQ answers: present in the RSC payload of the static HTML (`question`/`answer` props) — no Playwright needed.
- [ ] Parsers (cheerio), one per template → `data/source/<collection>/<slug>.json` shaped like the planned Payload fields:
  - [ ] `parse-country.ts` (25)
  - [ ] `parse-platform.ts` (15)
  - [ ] `parse-buy.ts` (23)
  - [ ] `parse-post.ts` (79) — keep heading/list/link structure so it can become Lexical; keep internal links.
  - [ ] `parse-legal.ts` (5)
  - [ ] `parse-singletons.ts` — Home, Services, About, Contact, FAQ, 6 landing pages → ordered list of blocks with content.
  - [ ] `parse-shared.ts` — menus, footer, payment methods, testimonials, home FAQ group, authors, categories.
- [ ] `download-assets.ts` — decode `/_next/image?url=…` to the original `/image/...` path; download all referenced images (site + `api.smmgen.com/storage/...` for blog) to `data/assets/` with a manifest mapping original URL → local file → alt text.
- [ ] Validation script: every source JSON file passes a Zod schema; report missing fields.

### 0.4 Rewrite pipeline
- [ ] Define the `data/content/` shape (same as source, with `en` + `ar` per localized field) and a style guide for the Trendawe voice in `docs/content-style.md`.
- [ ] Rewrite one sample of each template (1 country, 1 platform, 1 buy page, 1 post) for owner review before rewriting the rest in the phase that seeds them.

### Acceptance criteria — Phase 0
- `pnpm dev` runs; `/admin` login works with en/ar locale switch; DB + storage connected.
- `/` and `/ar` both render (empty shell) with correct `lang`/`dir`.
- `docs/design-tokens.md`, `docs/page-inventory.md` and 18 reference screenshot pairs exist.
- `data/source/` holds JSON for all 161 URLs + shared data; validation passes with zero errors; images downloaded.
- Rewrite samples approved by the owner.
- **STOP — summary + open questions.**

---

## Phase 1 — Foundation

**Goal:** the shell every page shares, plus the data the shell needs.

### 1.1 Design system
- [ ] Map tokens to Tailwind v4 `@theme` (colors, fonts, radii, shadows, container).
- [ ] Base typography styles (h1–h4, body, muted, eyebrow) matching the original.
- [ ] Buttons: primary filled, outline, "Sign Up Free" with arrow icon, text link with arrow.
- [ ] `Container`, `Section` (spacing variants), `SectionHeading` (title + intro, centered/left).

### 1.2 Payload — core collections & globals
- [ ] `media` (alt required), `users` (role field), `payment-methods`, `testimonials`, `faq-groups`.
- [ ] `platforms` — **menu fields only for now** (name, slug, icon, smallIcon, menuOrder, hasBuyPages); template fields come in Phase 3.
- [ ] `buy-pages` — menu fields only (platform, slug, menuLabel, menuOrder).
- [ ] `countries` — menu fields only (name, slug, menuColumn, menuOrder).
- [ ] Globals: `site-settings` (incl. stats + app URLs), `header`, `footer`.
- [ ] Shared field groups in `src/fields/`: `heroFields`, `sectionHeading`, `faqField`, `ctaFields`, `imageWithAlt`, `stepsField`, `featureItemsField`.
- [ ] `validateRootSlug` hook shared by all root-level collections.
- [ ] `lib/tokens.ts` + unit tests (formatting: full number, compact `98K+`, `109M+`).

### 1.3 Seed (first pass)
- [ ] Rewrite shared content (menus, footer, testimonials, FAQ group, payment methods) into `data/content/` (en + ar).
- [ ] `scripts/seed/` framework: Payload Local API, upsert by slug, writes both locales, uploads media from `data/assets` once (dedupe by original URL), idempotent re-runs.
- [ ] Seed: media, site-settings, header, footer, payment methods, testimonials, FAQ groups, platforms/buy-pages/countries (menu fields).

### 1.4 Layout components
- [ ] `Header` — logo, Home, Services (mega menu: "All Services" + 15 platforms, hover → sub-menu of buy pages), About, Contact, Service Area (two-column countries), Company (dropdown), Log In / Sign Up. Active-link styling.
- [ ] `MobileNav` — drawer with collapsible groups, matching original (opens from the end side in RTL).
- [ ] `LanguageSwitcher` — links to the same page in the other locale.
- [ ] `Footer` — about text, social icons, quick links, "Our Services" tree (generated), contact block, bottom country strip (generated).
- [ ] Shared sections in `components/sections/`: `Hero` (variants: split-image, checklist, trust-badge + platform icon strip), `StatsRow`, `RichTextWithImage`, `FeatureGrid` (variants), `StepsTimeline`, `AudienceGrid`, `FaqSection` (accordion), `CtaBanner`, `TestimonialsCarousel`, `ComparisonTable`, `TrustBadge` ("Trusted by N users" + avatars).
- [ ] `/dev/sections` page (dev-only) rendering every section with sample data for visual checks.

### Acceptance criteria — Phase 1
- Header, mega menu, mobile nav and footer visually match the reference screenshots at 1440px and 390px, and mirror correctly in `/ar`.
- Menus are fully generated from CMS data (adding a platform in the admin makes it appear in header + footer after revalidation).
- All sections render in `/dev/sections` with no hardcoded copy.
- typecheck / lint / build pass. **STOP — review.**

---

## Phase 2 — Country template (architecture proof)

**Goal:** 25 pages from one template, end to end: schema → seed → route → render → revalidate.

- [ ] Complete `countries` fields: hero (title, intro, image, CTA), whatIs, whyChoose (5 items: title, body, image), highlightNote, services (heading + `featuredPlatforms[]` → platform relation + country-specific description), payments (heading, intro, `methods[]` → payment-method relation + type label, secure-transaction note, side image, methods count badge), steps (4), reseller (title, body, image, CTA), faq, cta, seo.
- [ ] `lib/resolve-slug.ts` + `src/app/(frontend)/[slug]/page.tsx` with `generateStaticParams` and `dynamicParams = false` once all collections are wired (keep `true` until Phase 5).
- [ ] `CountryTemplate` composed from shared sections; platform tabs inside "Which services…" section.
- [ ] Rewrite the 25 countries (en + ar) into `data/content/countries/` and seed them.
- [ ] Revalidation hook: saving a country revalidates `country:{slug}` and the countries menu tag.
- [ ] Live Preview configured for `countries`.
- [ ] Playwright visual test: `/smm-panel-egypt` and `/smm-panel-usa` vs reference (desktop + mobile).

### Acceptance criteria — Phase 2
- All 25 `/smm-panel-*` URLs (and their `/ar` versions) return 200 and render country-specific content (payments, platforms, FAQ).
- Editing a country in `/admin` and publishing updates the live page without a rebuild.
- Visual diff within agreed threshold. **STOP — review the architecture before scaling it.**

---

## Phase 3 — Platform & Buy templates

### 3.1 Platforms (15)
- [ ] Complete `platforms` fields: hero (+ trust badge), whatIs, serviceCards[] (number, title, priceFrom, body, link → buy-page relation **or** external URL fallback to signup), whyChoose[] (image cards), steps (4), whoUses[] (4–5), safety (title, body, image, CTA), faq, cta, seo.
- [ ] `PlatformTemplate`.
- [ ] Rewrite (en + ar) and seed 15 platforms; verify platforms without buy pages (Pinterest, Snapchat, Threads, Reddit, Twitch, SoundCloud) link cards to signup.

### 3.2 Buy pages (23)
- [ ] Complete `buy-pages` fields: hero (title, intro, checklist[], CTA, image, trust badge), whyBuy (rich text with bullet list + image), packageTypes[] (title, body, image), whyChoose[] (6), steps (3), pricingPackages[] (name, quantity, delivery, price, isPopular), pricingNote (rich text), testimonials (rel, many), faq, cta, seo.
- [ ] `BuyTemplate` with responsive pricing (cards on mobile, table on desktop) and a testimonials carousel rendered **once** (fix issue #8).
- [ ] Rewrite (en + ar) and seed 23 buy pages.

### Acceptance criteria — Phase 3
- 38 more URLs return 200 with correct content; the mega menu sub-menus link to the right buy pages.
- Visual tests pass for `/instagram-smm-panel`, `/pinterest-smm-panel`, `/buy-instagram-followers`. **STOP — review.**

---

## Phase 4 — Blog

> The blog is managed in Payload. All 79 posts are rewritten (en + ar) and seeded.

- [ ] Collections: `posts` (drafts, versions, scheduled publish), `categories`, `authors`.
- [ ] Computed `readingTime` (beforeChange hook) and auto-generated table of contents from H2/H3 headings (slugified anchors).
- [ ] `/blog` listing: hero with background, search (`?q=` → Payload `like` on title/excerpt), category chips with counts, post cards (category, read time, title, excerpt, author + date, Read More), pagination (`?page=`, 25 per page).
- [ ] `/blog/category/[slug]` and `/blog/author/[slug]` reuse the listing.
- [ ] `/blog/[slug]`: TOC sidebar, author card, share buttons (Facebook, LinkedIn, X), featured image, published date, read time, Lexical body (custom converters for headings with anchors, lists, links, images), related posts (same category, latest 3), CTA from `site-settings` (fix issue #1).
- [ ] Rewrite and seed 79 posts (en + ar) + images + authors + categories; keep original `publishedAt` dates.
- [ ] Revalidation: post change → `post:{slug}`, `posts`, its category and author tags.

### Acceptance criteria — Phase 4
- Posts + listing/category/author pages return 200 in both locales; internal links inside posts resolve.
- Search and pagination work.
- Visual tests pass for `/blog` and `/blog/threads-vs-instagram`. **STOP — review.**

---

## Phase 5 — Singleton, landing & legal pages

### 5.1 Blocks
- [ ] Payload block configs in `src/blocks/` + renderers in `components/blocks/` + `RenderBlocks`:
  `hero`, `statsRow`, `richTextWithImage`, `featureGrid`, `platformTabs`, `platformCardsGrid`, `stepsTimeline`, `audienceGrid`, `startingPriceCard`, `priceOverviewTabs`, `comparisonTable`, `marginExamples`, `codeSample`, `testimonials`, `faqSection`, `ctaBanner`.
- [ ] Each block has an admin preview thumbnail/label so editors can recognize it.

### 5.2 Pages
- [ ] Globals with `layout` blocks: `home-page`, `services-page`, `about-page`, `contact-page`, `faq-page`.
- [ ] Collection `landing-pages` with `layout` blocks; seed the 6 pages in the reference section order with rewritten copy (en + ar).
- [ ] Home "How it Works" section has id `how-it-works`; FAQ page and Home share one `faq-groups` entry.
- [ ] Use stat tokens for every number in seeded copy.
- [ ] Collection `legal-pages` + `LegalTemplate` (title, intro, last updated / effective date, rich text body, related legal links); rewrite (en + ar) and seed 5 pages, marked "to be reviewed by the owner" (legal text must match Trendawe's real business details).
- [ ] Switch `[slug]` route to `dynamicParams = false` now that every root-level collection is wired.

### Acceptance criteria — Phase 5
- Every expected URL returns 200 in both locales.
- Visual tests pass for every singleton and landing page and `/privacy-policy`.
- An editor can reorder, add or remove blocks on any singleton page and see it via Live Preview. **STOP — review.**

---

## Phase 6 — SEO, routing & revalidation

- [ ] `@payloadcms/plugin-seo` on every page-producing collection/global; `generateMetadata` uses it with fallbacks (title template `%s | Trendawe`, default OG image from `site-settings`).
- [ ] Rewritten titles/meta descriptions seeded per locale; editors can override per page.
- [ ] Canonical URL on every page (no trailing slash), `hreflang` alternates (en, ar, x-default), Open Graph + Twitter cards.
- [ ] JSON-LD: `Organization` (layout), `WebSite`, `BreadcrumbList` (all non-home pages), `FAQPage` (pages with FAQ), `Article` (posts), `Product`/`Offer` for buy-page pricing packages.
- [ ] `sitemap.ts` generated from all published documents in both locales (includes every author; `lastmod` from `updatedAt`).
- [ ] `robots.ts` (disallow `/admin`, `/api`, `/dev`).
- [ ] `@payloadcms/plugin-redirects` + redirect handling in middleware or `next.config` (for future URL changes).
- [ ] Custom `not-found.tsx` matching the site design.
- [ ] Audit every collection/global has revalidation hooks and Live Preview; draft preview route secured with `PREVIEW_SECRET`.

### Acceptance criteria — Phase 6
- `pnpm qa:meta` (see Phase 8): every URL in both locales has a title, description, canonical and hreflang.
- Rich Results Test passes for one page of each type (FAQ, Article, Breadcrumb).
- Generated sitemap contains every public URL in both locales. **STOP — review.**

---

## Phase 7 — Admin experience

- [ ] Access control: `admin` (everything, users, settings), `editor` (all content, no users/settings), `writer` (posts only, own drafts; publish requires editor).
- [ ] Admin groups/navigation: **Pages** (singletons, landing, legal), **Templates** (countries, platforms, buy pages), **Blog**, **Libraries** (media, payment methods, testimonials, FAQ groups), **Settings** (site settings, header, footer, redirects), **Users**.
- [ ] Custom admin dashboard component: counts per collection, recent edits, drafts awaiting publish, quick links.
- [ ] Field-level UX: descriptions on tricky fields (stat tokens, slugs), `admin.useAsTitle`, list columns, filters (e.g. buy pages by platform), default sort by `menuOrder`.
- [ ] "Duplicate" enabled for countries and buy pages (new country from an existing one).
- [ ] Slug fields auto-generated from title with uniqueness validation.

### Acceptance criteria — Phase 7
- A writer account can only manage posts; an editor cannot reach Users/Settings.
- A non-technical user can create a new country page by duplicating one and publishing it, and it appears in the Service Area menu, footer strip and sitemap. **STOP — review.**

---

## Phase 8 — QA & launch

### 8.1 Automated checks (`scripts/qa/`)
- [ ] `qa:urls` — request every expected path (en + ar) on a given base URL; all must return 200 with the correct canonical.
- [ ] `qa:meta` — every URL has title, meta description, canonical and hreflang.
- [ ] `qa:links` — crawl the built site; zero broken internal links or images.
- [ ] Playwright visual suite for all 18 reference pages (desktop + mobile) with an agreed diff threshold.
- [ ] Smoke tests: mega menu hover/keyboard, mobile drawer, accordions, tabs, blog search, pagination, language switcher, RTL layout.

### 8.2 Quality budgets
- [ ] Lighthouse (mobile) on `/`, `/smm-panel-egypt`, `/instagram-smm-panel`, `/buy-instagram-followers`, `/blog/threads-vs-instagram`: Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90, Best Practices ≥ 95.
- [ ] Keyboard navigation and focus states on menus; images have alt text; color contrast passes.

### 8.3 Deploy
- [ ] Vercel project, env vars set, Supabase pooled connection, `payload migrate` in the build/deploy step.
- [ ] Staging deploy → run the full QA suite against staging.
- [ ] Owner sign-off on staging.
- [ ] DNS cutover plan + post-launch: submit sitemap in Google Search Console, monitor 404s for 2 weeks.
- [ ] `README.md`: setup, env, scripts, content-editing guide for the owner.

### Acceptance criteria — Phase 8
- All automated checks green on staging; budgets met; owner sign-off. **Launch.**
