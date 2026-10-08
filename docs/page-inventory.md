# Page inventory

Section-by-section breakdown of every smmgen.com design, mapped to the components and Payload fields/blocks we build.
Generated from `pnpm audit:inventory` (`data/design/inventory.json`) + the reference screenshots in `docs/screenshots/reference/`.

Legend — **Component** = `components/sections/*` (shared, presentational); **Field / Block** = where the content lives in Payload.
"Template" pages (country, platform, buy) use fixed fields; singleton and landing pages use the `layout` blocks field.

---

## 1. Shared layout (every page)

| Part | Details | Source |
|---|---|---|
| **Header** | Fixed, 81px, transparent over the hero. Logo · Home · Services ▾ · About us · Contact Us · Service Area ▾ · Company ▾ · **Log In** (outline) · **Sign Up** (filled). Active link in primary colour. | `header` global + generated menus |
| Services mega menu | Card list: "All Services" + 15 platforms (icon + "X SMM Panel"). Platforms with buy pages show ›; hovering opens a **second panel** with "Buy X …" links. | `platforms` + `buy-pages` (menuOrder) |
| Service Area menu | 2-column list of 25 countries. | `countries` (menuColumn, menuOrder) |
| Company menu | How it Works (`/#how-it-works`), Blog, FAQ, Cheap, Best, Reseller, Wholesale, White Label, API, Terms, Privacy, Refund, Cookies, Disclaimer. | `header.companyMenu` |
| **Mobile drawer** | Logo + ✕, Log In / Sign Up buttons, collapsible groups (Home, Services ▸ platforms ▸ buy pages, …), **Follow us** icon row, **Contact** card (email, address, trade licence). | same data + `site-settings` |
| **Footer** | Dark navy. Col 1: logo, about text, social icons. Col 2: Quick Links. Col 3–4: **Our Services** (15 platforms, ▾ expands buy pages). Col 5: email, address, trade licence. Bottom band (navy→blue gradient): "Global SMM Panel — Local Payments In Every Country" + **country pills** (all 25). | `footer` global + generated |

---

## 2. Shared sections (components)

| Component | Variants | Seen on |
|---|---|---|
| `Hero` | **split** (H1 with gradient words, intro, 1–2 CTAs, image right); options: `trustBar` (Google ★ 4.9 + avatars + "Trusted by {{activeUsers}} users"), `checklist` (2×2 ✓ items), `platformIconStrip` (glass bar of platform icons), floating badges on image ("Trusted by N users", "Best X Award") | all |
| `StatsRow` | 4 white cards: 3D icon, big number (token), label | home, best |
| `RichTextWithImage` | image **start** + text **end** (with floating emoji/award chips) · text **start** + image **end** · optional bullet list, CTA button, inline links | "What is…", "Is it safe…", "Good choice for resellers…", "Why buy…" |
| `FeatureGrid` | **icon cards** 3-col (rows of 3+2+3 or 3+3), **masonry** (platform "Why choose"), **dark** (black bg, dark cards), **numbered service cards** (01, "From $X/1k" badge, text, "Buy X »" link), **2-col image cards**; optional **highlight note** (✓ bar under grid) | everywhere |
| `PlatformTabs` | Pill tabs with platform icons → card: image start, "X SMM Panel" title, text, CTA. Home: all 15 platforms + detail list; Country: 6 with country-specific text | home, country |
| `PaymentMethodsTable` | Dark section: heading + intro, table (Method · Type · Availability ✓ chip), "Secure Transactions" note, person + phone image, "Available Payment Method" badge | country |
| `StepsTimeline` | Heading + intro (+ optional CTA) sticky at start; vertical line with numbered dots (01–05); step cards with icon, title, text and a large faded number | all templates, home |
| `AudienceGrid` | (= `FeatureGrid` dark/light 2-col with 3D icons) "Who uses…" | home, platform, landing |
| `StartingPriceCard` | Card: $ icon, "Starting price $0.0003", ✓ list, full-width CTA | home pricing |
| `PricingTable` | Header row in primary-tint; rows: package, quantity, price, delivery, **Buy Now** (popular row filled + "Most Popular" chip); note box under table. Mobile: stacked cards | buy |
| `TestimonialsCarousel` | Dark section with hand-drawn arrow; cards ★★★★★, quote, “ ” icon, role + country; prev/next + dots | buy |
| `CodeSample` | Dark code window (traffic lights, `POST /api/v2`), text start | home, api |
| `FaqSection` | Heading + intro, **2-column accordion** (open item: filled primary card, white text), decorative 3D "?" images | all |
| `CtaBanner` | Rounded tinted panel: heading, rich text with links, 1–3 buttons (filled + outline), person image end | all (except some platform pages) |
| `ComparisonTable` | Rows × columns with ✓/✗ and a recommended column | best, wholesale, white label |
| `MarginExamples` | Cost vs. sell price examples | reseller |
| `PriceOverviewTabs` | Per-platform price list cards | cheap |
| `PlatformCardsGrid` | Grid of 15 platform cards (icon, name, link) | services, reseller, wholesale |

---

## 3. Templates

### 3.1 Country — `/smm-panel-{country}` (25) · collection `countries`
| # | Section | Component | Fields |
|---|---|---|---|
| 1 | "SMM **Panel in Egypt**" + intro + "Start Free Today" + country image | `Hero` split | `hero` |
| 2 | "What Is an SMM Panel and How Does It Work for {Country} Users?" | `RichTextWithImage` image-start | `whatIs` |
| 3 | "Why {Country} Users and Agencies Choose …" — 5 icon cards (3+2) + ✓ highlight note | `FeatureGrid` icon cards | `whyChoose[5]`, `highlightNote` |
| 4 | "Which Social Media Services Are Available for {Country} Users?" — 6 platform tabs | `PlatformTabs` | `featuredPlatforms[]` (platform rel + country text) |
| 5 | "Payment Options for {Country} Users" — dark, table of ~7 methods | `PaymentMethodsTable` | `payments` (methods[] rel + type label, secureNote, image) |
| 6 | "How to Place Your First Order from {Country}" — 4 steps | `StepsTimeline` | `steps[4]` |
| 7 | "Is … a Good Choice for SMM Resellers in {Country}?" + CTA | `RichTextWithImage` text-start | `reseller` |
| 8 | FAQ (6) | `FaqSection` | `faq` |
| 9 | "Start Growing Your Social Media in {Country} Today" — 3 buttons | `CtaBanner` | `cta` |

### 3.2 Platform — `/{platform}-smm-panel` (15) · collection `platforms`
| # | Section | Component | Fields |
|---|---|---|---|
| 1 | "Instagram SMM Panel — Grow …" + Sign Up Free / View All Services, floating badges | `Hero` split | `hero` |
| 2 | "What Is an Instagram SMM Panel?" | `RichTextWithImage` image-start | `whatIs` |
| 3 | "Our Instagram SMM Services" — 6–8 numbered cards with price badge + link | `FeatureGrid` numbered service cards | `serviceCards[]` (link → buy-page rel or signup) |
| 4 | "Why Choose … For Instagram SMM Services?" — 6 cards masonry | `FeatureGrid` masonry | `whyChoose[]` |
| 5 | "How to Order Instagram SMM Services" — 4 steps + CTA | `StepsTimeline` | `steps[4]` |
| 6 | "Who Uses …'s Instagram SMM Panel?" — dark, 4–5 cards | `AudienceGrid` dark | `whoUses[]` |
| 7 | "Is It Safe to Buy Instagram Services…?" + CTA | `RichTextWithImage` text-start | `safety` |
| 8 | FAQ (8) | `FaqSection` | `faq` |
| 9 | CTA (present on Pinterest, **missing on Instagram** — see open questions) | `CtaBanner` | `cta` (optional) |

### 3.3 Buy — `/buy-{platform}-{service}` (23) · collection `buy-pages`
| # | Section | Component | Fields |
|---|---|---|---|
| 1 | "Buy **Instagram Followers**" + 2 paragraphs + ✓ checklist (4) + CTA, floating badges | `Hero` split + checklist | `hero` |
| 2 | "Why Buy Instagram Followers?" — text with bullet list | `RichTextWithImage` image-start | `whyBuy` |
| 3 | "Our Instagram Follower Packages" — 4 cards 2-col | `FeatureGrid` 2-col image cards | `packageTypes[]` |
| 4 | "Why Choose … for Instagram Followers?" — 6 cards 3-col | `FeatureGrid` icon cards | `whyChoose[6]` |
| 5 | "How to Buy … — 3 Simple Steps" | `StepsTimeline` | `steps[3]` |
| 6 | "Pricing Packages" — 5 rows + note | `PricingTable` | `pricingPackages[]`, `pricingNote` |
| 7 | "What Our Customers Say" — carousel | `TestimonialsCarousel` | `testimonials` (rel) |
| 8 | FAQ (7) | `FaqSection` | `faq` |
| 9 | "Ready to grow your Instagram profile today?" | `CtaBanner` | `cta` |

---

## 4. Singleton pages (blocks)

### Home `/` · global `home-page`
1 `hero` (trustBar + platformIconStrip) · 2 `statsRow` · 3 `richTextWithImage` "What Is an SMM Panel?" · 4 `featureGrid` "Why Choose…" (8) · 5 `platformTabs` "Every Platform. Every Service. One Dashboard" (15) · 6 `audienceGrid` "Who Uses…?" (4) · 7 `stepsTimeline` **id `how-it-works`** (5) · 8 `richTextWithImage` + `startingPriceCard` "Pricing: How Cheap…" · 9 `featureGrid` dark "Is … Safe and Trusted?" (5) · 10 `codeSample` "SMM Panel API…" · 11 `faqSection` (8, shared group with `/faq`) · 12 `ctaBanner` "Ready to Start? Join {{activeUsers}} Active Users".

### Services `/services` · `services-page`
1 `hero` "All Social Media Services" · 2 `platformCardsGrid` "Browse by Platform" (15 platforms with their service lists) · 3 `ctaBanner`.

### About `/about-us` · `about-page`
1 `hero` · 2 `richTextWithImage` "Who Is…?" · 3 `richTextWithImage` "The Story — Founded in 2018" · 4 `featureGrid` "What … Does" (4) · 5 `featureGrid` "Core Values" (4) · 6 `audienceGrid` "Who Trusts…?" (4) · 7 `featureGrid` "How … Compares" (4) · 8 `featureGrid` "Commitment to Security" (4) · 9 `faqSection` (7) · 10 `ctaBanner`.

### Contact `/contact-us` · `contact-page`
1 `hero` · 2 contact cards "Get in Touch" (email, verified business — from `site-settings`) · 3 "Follow Us on Social Media" (social links from `site-settings`). No form on the reference.

### FAQ `/faq` · `faq-page`
1 `faqSection` (shared group, page H1 variant) · 2 `ctaBanner` "Still have a question?".

## 5. Landing pages (blocks) · collection `landing-pages`

| Page | Section order |
|---|---|
| `/best-smm-panel` (9) | hero · statsRow · featureGrid (8) · comparisonTable "vs the Competition" · featureGrid "by Use Case" (6) · featureGrid "Criteria-by-Criteria" (8) · featureGrid "How to Choose" (6) · faqSection (7) · ctaBanner "The Verdict" |
| `/cheap-smm-panel` (11) | hero · richTextWithImage · priceOverviewTabs (7) · featureGrid "Cheap ≠ Low Quality" (3) · featureGrid "How to Get the Cheapest Prices" (4) · richText "for Resellers" · stepsTimeline (4) · richText "Is it safe?" · richTextWithImage "Cheap vs Best" · faqSection (7) · ctaBanner |
| `/smm-reseller-panel` (11) | hero · richTextWithImage · featureGrid (6) · richText "How the Model Works" · audienceGrid (5) · stepsTimeline (5) · marginExamples · comparisonTable "Reseller vs White Label vs Wholesale" (3) · platformCardsGrid (15) · faqSection (7) · ctaBanner |
| `/wholesale-smm-panel` (12) | hero · richTextWithImage · comparisonTable "Wholesale vs Standard" (2) · audienceGrid (5) · featureGrid "Pricing Economics" (3) · featureGrid "Wholesale Ordering" (4) · featureGrid "Platforms at Wholesale Rates" (6) · featureGrid "Combining Models" (3) · stepsTimeline (5) · featureGrid "Why … for Wholesale" (7) · faqSection (7) · ctaBanner |
| `/white-label-smm-panel` (10) | hero · richTextWithImage · featureGrid (5) · comparisonTable "vs Reseller Panel" (2) · featureGrid "What Your Panel Includes" (7) · audienceGrid (5) · stepsTimeline (6) · featureGrid "Why … " (7, **retitle — see issues**) · faqSection (8) · ctaBanner |
| `/smm-panel-api` (8) | hero · richTextWithImage · audienceGrid (4) · featureGrid (2: API key, connecting) · codeSample + featureGrid "Technical Overview" (8) · featureGrid "Best Practices" (6) · faqSection (6) · ctaBanner |

Exact visual variants of landing-page sections are confirmed against the screenshots when Phase 5 builds them.

## 6. Blog & legal

| Page | Sections |
|---|---|
| `/blog` | Hero "Read Our Blog" with **search form** · grid of post cards (25/page: image, category, read time, title, excerpt, author + date, Read More) · pagination |
| `/blog/category/[slug]`, `/blog/author/[slug]` | Same listing, filtered |
| `/blog/[slug]` | Title + meta, featured image, **"In this article" TOC** sidebar, body (H2/H3, lists, tables, images, links), author card, share buttons, related posts, CTA |
| `/privacy-policy` (+4 legal) | Title, intro, last updated / effective date, long rich text (≈35 H3), related legal links |

---

## 7. RTL notes (Arabic)
- Mirror every "image start / text start" split, the steps timeline (line and dots on the right), mega-menu sub-panel (opens to the left), drawer (slides from the left edge = end side).
- Flip directional icons (›, », → in buttons, carousel arrows); keep platform logos and the ✓/★ icons unflipped.
- Gradient text and section gradients: `90deg` → `270deg`.
- Numbers (prices, stats, step numbers) stay Western digits unless the owner wants Arabic-Indic digits.
- Tables (pricing, payments, comparison) read right-to-left: first column on the right.

## 8. Open questions
1. Instagram platform page has **no final CTA section** while Pinterest has one — make `cta` optional per platform (default on)?
2. Home "Ready to Start? Join N Active Users" and Services CTA look like a different CTA style from the template `CtaBanner` — confirm visually in Phase 5.
3. Western vs Arabic-Indic digits in `/ar`.

## 9. Content issues (from the reference — fix while rewriting)
- Blog post CTA leftover from another brand ("SMMSun", "Bangladesh", "68,000 users").
- `/white-label-smm-panel` section titled "Why SMMGen for **Wholesale** SMM Services?" (copied from wholesale).
- Inconsistent numbers: "76 million orders" (wholesale, country pages) vs 108,774,260 (home); 79,000 vs 98,121 users → stat tokens.
- Buy-page CTA says "over 500,000 users" — another inconsistent number.
- Footer address/phone differ between pages → Trendawe details from `site-settings`.
- FAQ link alternates `/faq` vs `/#faq` → always `/faq`.
- Testimonial carousel repeats the same 3 quotes 3× → render once.
- `/blog/author/kanok-miah` returns 404.
