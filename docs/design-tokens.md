# Design tokens

Measured from smmgen.com computed styles with `pnpm audit:design` (raw data: `data/design/audit.json`;
pages `/`, `/smm-panel-egypt`, `/instagram-smm-panel`, `/buy-instagram-followers`, `/blog` at 1440px and 390px).
smmgen.com is itself built with Tailwind v4 + shadcn (neutral base), so its scale maps 1:1 onto ours.

Every smmgen **blue** is re-skinned to the matching **Trendawe orange / navy** value below. Greys, spacing,
radii, shadows and type scale are kept exactly.

---

## 1. Colour

### 1.1 Brand mapping (smmgen → Trendawe)

| Role | smmgen | Trendawe | Notes |
|---|---|---|---|
| `--primary` (buttons, links, active tabs, borders of selected cards) | `#1F41BB` | `#F37321` | Logo orange. See §1.4 for text-on-orange contrast |
| `--primary-darker` (hover, pressed, dark CTA panels) | `#112779` | `#B8480A` | |
| Primary hover (e.g. "Create Free Account") | `#1A3AAD` | `#D95A0B` | |
| Secondary accent (icon chips, small highlights) | `#5666F2` | `#FF8A4C` | |
| Light tint (badges, chip backgrounds) | `#C2D5FF` | `#FFD9BF` | |
| Light tint 2 (cards, table header) | `#CFD8F8` | `#FDE3D0` | |
| Very light tint (section washes) | `#E3EBFF` / `#D4DFFF` | `#FFF1E6` / `#FFE4D0` | |
| Primary at 10% (selected chip background) | `oklab(… / 0.1)` of primary | `rgb(243 115 33 / 0.1)` | |
| Heading gradient text (`--text`) | `linear-gradient(90deg,#0D35C7,#3C44D6 26.44%,#9EC1FF)` | `linear-gradient(90deg,#C9500A,#F37321 26.44%,#FFC08A)` | Used on highlighted words in H1/H2 |
| Hero/section gradient | `#7187D4 → #D2DFFB → #FFFFFF` | `#F5A26B → #FDE3D0 → #FFFFFF` | |
| Glow (radial behind hero art) | `#D4DFFF` radial | `#FFE4D0` radial | |
| Dark surface (footer, dark cards) | `#171E2F` | `#0F172A` | Trendawe navy (theme colour) |
| Dark surface 2 | `#222222` | `#1E293B` | |

### 1.2 Neutrals (kept as-is)

| Token | Value | Use |
|---|---|---|
| `--foreground` | `oklch(0.145 0 0)` (≈ `#0A0A0A`) | Default text, H2 |
| `--heading-3` | `#232323` | H3 / card titles |
| `--nav` | `#121212` | Header links |
| `--paragraph-1` | `#333333` | Body copy |
| `--paragraph-2` | `#313131` | Links, small text |
| `--paragraph-3` | `#202633` | |
| `--paragraph-4` | `#404A60` | Muted paragraph (section intros) |
| muted label | `#9696A1` | Captions, meta |
| `--muted-foreground` | `oklch(0.556 0 0)` | |
| footer text | `oklch(0.872 0.01 258.338)` (≈ `#D1D5DB`) | On dark surface |
| footer link | `rgb(255 255 255 / 0.8)` | |
| `--border` | `oklch(0.922 0 0)` | Default border |
| card borders | `#E2E2E2`, `#E3E3E3`, `#E8E8E8`, `#EBECEF` | |
| section backgrounds | `#FFFFFF`, `#FAFAFB`, `#F5F5F7`, `#F5F6F7` | Alternating sections |
| success chip | `rgb(52 199 89 / 0.2)` | "✓" badges |

### 1.3 Overlays
`rgb(0 0 0 / 0.3)` and `/ 0.2` (chips on dark/hero backgrounds), `rgb(255 255 255 / 0.1–0.4)` (glass cards on dark), border `rgb(255 255 255 / 0.2)`.

### 1.4 ⚠️ Open decision — text on orange
smmgen puts **white text on the primary colour** (buttons, active tabs). White on `#F37321` has a contrast of **2.88:1** (WCAG AA needs 4.5:1 for normal text, 3:1 for large/bold ≥ 18.66px). Options:

| Option | Button background | Contrast with white |
|---|---|---|
| A. Brand orange everywhere | `#F37321` | 2.88 ✗ |
| B. **Darker orange for filled buttons/links, brand orange for accents** (recommended) | `#C9500A` | 4.53 ✓ |
| C. Brand orange with **navy text** | `#F37321` + `#0F172A` text | 6.19 ✓ |

---

## 2. Typography

| | English | Arabic |
|---|---|---|
| Headings (h1–h3) | **Poppins** 700 | **Cairo** 700 |
| Body, UI | **Inter** 400 / 500 / 600 | **Cairo** 400 / 500 / 600 |

All three via `next/font/google`.

### 2.1 Scale

| Element | Desktop (≥ 1024px) | Mobile (390px) | Weight | Colour |
|---|---|---|---|---|
| H1 (hero) | 52px / 59.8px (1.15) | 32px / 36.8px | 700 | `#000` (+ gradient word) |
| H2 (section) | 52px / 59.8px; large variant 56px / 78.4px | 32px / 36.8px; 28px variant | 700 | `--foreground` |
| H3 (card title) | 24px / 33px (1.375) | 18px / 24.75px | 700 | `#232323` |
| Body | 16px / 24px; prose 16px / 25.6px (1.6) | 14px / 24px | 400 | `#404A60` / `#333` |
| Nav link | 16px / 24px | — | 500 | `#121212` |
| Small / list / footer | 14px / 20px | 14px | 400–500 | |
| Caption / chip | 12px | 12px | 500 | |
| Button (header) | 18px | | 500 | |
| Button (CTA) | 16–20px | | 600–700 | |
| Stat number | 120px (decorative), 40px, 36px | | 700 | |

---

## 3. Layout

| Token | Value |
|---|---|
| Container | `max-width: 1440px; padding-inline: 32px` (mobile 16–20px) |
| Narrow content columns | 750px, 876px, 900px, 920px (section intros, FAQ) |
| Breakpoints | `sm` 40rem (640px), `lg` 64rem (1024px), custom `1200px` — use Tailwind defaults + `xl2: 1200px` |
| Header | `position: fixed`, height **81px**, transparent over hero |
| Body offset under header | hero `padding-top: 56px` (+ header height) |

### 3.1 Section vertical rhythm (padding-top / bottom)

| Desktop | Mobile | Where |
|---|---|---|
| 80px | 40px | Compact sections (stats strip, CTA) |
| 96px | 48px | FAQ |
| 120px | 60px | Most content sections |
| 128px | 48px | Feature-heavy sections (Why choose, platforms) |
| 192px | — | Country page final section with large art |

### 3.2 Gaps
Most common: 12px, 8px, 6px, 16px, 24px, 32px, 48px, 64px (Tailwind `gap-3`, `2`, `1.5`, `4`, `6`, `8`, `12`, `16`).

---

## 4. Shape

| Token | Value | Use |
|---|---|---|
| `--radius` | `0.625rem` (10px) | Default (shadcn) |
| pill | `9999px` | CTA buttons, chips, country pills |
| 12px | | Header Log In / Sign Up buttons, inputs |
| 14px | | Platform tab buttons |
| 18px | | Cards |
| 20px, 24px, 32px | | Large panels, images, CTA banner |

## 5. Shadows

| Token | Value | Use |
|---|---|---|
| `shadow-xs` | `0 1px 4px rgb(0 0 0 / 0.1)` | Small cards |
| `shadow-sm` | `0 2px 4px rgb(0 0 0 / 0.08)` | Chips, tabs |
| `shadow-card` | `0 4px 8px rgb(56 56 56 / 0.07)` | Feature cards |
| `shadow-card-lg` | `0 0 0 1px #fff, 0 12.29px 31.61px 2.63px rgb(150 150 161 / 0.18)` | Pricing / step cards |
| `shadow-float` | `0 12px 40px rgb(0 0 0 / 0.12)` | Mega menu, dropdowns |
| `shadow-soft` | `0 10px 20px rgb(0 0 0 / 0.08)` | Testimonials |
| `shadow-inset` | `inset 0 4px 4px rgb(0 0 0 / 0.25)` | Pressed tabs |

## 6. Imagery

Section backgrounds are **images** on smmgen (`/image/updated-backgrounds/*.webp`, `service-section-bg.webp`, `pricing-bg.webp`) in blue tones. For Trendawe they must be **recoloured to the orange palette** (hue-shift during asset download) or replaced by CSS gradients from §1.1. Decision per image during the asset step.

## 7. Implementation notes
- Map these onto the shadcn CSS variables in `src/app/(frontend)/globals.css` (`--primary`, `--border`, `--radius`, …) plus custom ones (`--primary-darker`, `--heading-3`, `--paragraph-*`, `--text-gradient`, shadows).
- RTL: use logical utilities; the gradient text direction flips with `rtl:` (`90deg` → `270deg`).
