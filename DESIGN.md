# DESIGN.md — Yooga (yooga.com.br)

> Independent design system analysis for AI coding agents.  
> Based on publicly observable CSS, visual patterns, and brand language from yooga.com.br.  
> Not affiliated with or endorsed by Yooga.

---

## 1. Brand Identity

**Product:** Yooga — Sistema de gestão e delivery para restaurantes  
**Tagline:** "Gestão Suave para o seu negócio"  
**Tone:** Friendly, approachable, operationally confident. Not corporate — speaks directly to restaurant owners in practical language. Warm but efficient.  
**Aesthetic:** Clean SaaS with warm blue accent. Functional-first layout with generous whitespace. Light, airy feel that communicates ease-of-use. Not overly playful, not enterprise-cold.

---

## 2. Color Palette

### Primary

| Token                   | Hex       | Usage                                                |
| ----------------------- | --------- | ---------------------------------------------------- |
| `--color-primary`       | `#19A1E6` | Primary CTA buttons, links, highlights, brand accent |
| `--color-primary-dark`  | `#1282C0` | Hover states, pressed buttons                        |
| `--color-primary-light` | `#E8F6FD` | Background tints, info banners, chip backgrounds     |

### Neutrals

| Token                    | Hex       | Usage                                 |
| ------------------------ | --------- | ------------------------------------- |
| `--color-background`     | `#FFFFFF` | Page background                       |
| `--color-surface`        | `#F8F9FA` | Card backgrounds, section alternates  |
| `--color-border`         | `#E5E7EB` | Dividers, card borders, input borders |
| `--color-text-primary`   | `#111827` | Headings, body primary                |
| `--color-text-secondary` | `#6B7280` | Captions, subtitles, helper text      |
| `--color-text-muted`     | `#9CA3AF` | Placeholders, disabled states         |

### Semantic

| Token                  | Hex       | Usage                                                    |
| ---------------------- | --------- | -------------------------------------------------------- |
| `--color-success`      | `#22C55E` | Positive states, confirmations, "with Yooga" comparisons |
| `--color-warning`      | `#F59E0B` | Alerts, in-progress states                               |
| `--color-error`        | `#EF4444` | Errors, "without Yooga" pain points                      |
| `--color-dark-surface` | `#111827` | Dark sections, footer, feature contrast blocks           |

---

## 3. Typography

### Font Stack

- **Display / Headings:** `'Plus Jakarta Sans', sans-serif` — rounded geometry, modern warmth
- **Body:** `'Inter', sans-serif` — neutral legibility at small sizes
- **Fallback:** `system-ui, -apple-system, sans-serif`

### Type Scale

| Role             | Size    | Weight | Line Height | Usage                         |
| ---------------- | ------- | ------ | ----------- | ----------------------------- |
| `--text-hero`    | 48–64px | 800    | 1.1         | Main hero heading             |
| `--text-h1`      | 40px    | 700    | 1.2         | Page-level headings           |
| `--text-h2`      | 30px    | 700    | 1.25        | Section headings              |
| `--text-h3`      | 22px    | 600    | 1.3         | Feature titles, card headings |
| `--text-h4`      | 18px    | 600    | 1.4         | Sub-section labels            |
| `--text-body-lg` | 18px    | 400    | 1.6         | Hero body, key descriptions   |
| `--text-body`    | 16px    | 400    | 1.6         | Standard paragraph text       |
| `--text-sm`      | 14px    | 400    | 1.5         | Labels, captions              |
| `--text-xs`      | 12px    | 500    | 1.4         | Badges, tags, metadata        |

### Notes

- Headlines use tight tracking (`letter-spacing: -0.02em`) for hero sizes
- No decorative or serif fonts — brand is entirely sans-serif
- Portuguese BR only; no ligature or multilingual considerations needed

---

## 4. Spacing & Layout

### Spacing Scale (8px base grid)

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
--space-24: 96px
--space-32: 128px
```

### Page Layout

- **Max content width:** `1200px`
- **Page horizontal padding:** `24px` (mobile), `48px` (tablet), `80px` (desktop)
- **Section vertical padding:** `80px–96px`
- **Grid:** 12-column with `24px` gutters

### Component Spacing

- Card internal padding: `24px–32px`
- Button padding: `12px 24px` (default), `16px 32px` (large)
- Form input padding: `12px 16px`
- Nav height: `72px`

---

## 5. Elevation & Depth

Yooga uses soft shadows — not dramatic. The UI feels flat-ish with subtle depth cues.

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12);
```

- Cards: `--shadow-md` by default, `--shadow-lg` on hover
- Dropdowns / modals: `--shadow-xl`
- No skeuomorphic shadows — never colored or directional

---

## 6. Border Radius

```css
--radius-sm: 6px /* Badges, chips, small inputs */ --radius-md: 10px /* Buttons, form inputs */
  --radius-lg: 16px /* Cards */ --radius-xl: 24px /* Feature sections, hero panels */
  --radius-2xl: 32px /* Large UI blocks, image containers */ --radius-full: 9999px
  /* Pills, toggles, avatar rings */;
```

---

## 7. Components

### Buttons

**Primary CTA**

- Background: `#19A1E6`
- Text: `#FFFFFF`, weight 600
- Border radius: `--radius-md`
- Padding: `12px 28px`
- Hover: `#1282C0` + slight `translateY(-1px)`
- No border

**Secondary / Outline**

- Background: transparent
- Border: `1.5px solid #19A1E6`
- Text: `#19A1E6`
- Hover: background `#E8F6FD`

**Ghost / Text**

- No border, no background
- Text: `#6B7280`
- Hover: text `#111827`

**CTA Pattern:**  
"Fale com um especialista" and "Quero assinar" are the two dominant CTA labels. Primary action is always the commercial conversion (sales call / subscription).

---

### Cards

- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Border radius: `--radius-lg`
- Shadow: `--shadow-md`
- Hover: `--shadow-lg` + `translateY(-2px)` transition
- Padding: `24px–32px`

**Feature Cards** contain:

1. Icon (colored, 32–40px)
2. Title (`--text-h3`)
3. Short description (`--text-body`, `--color-text-secondary`)

---

### Navigation

- Fixed top bar, `72px` height
- White background with `box-shadow: 0 1px 0 #E5E7EB`
- Logo left-aligned
- Nav links center or right: `--text-sm` weight 500, `--color-text-secondary`
- Active link: `--color-primary`
- CTA button ("Acessar") top-right: primary style, compact

**Dropdown menus:** white card, `--shadow-lg`, `--radius-lg`, appear on hover with 200ms ease-in-out.

---

### Badges / Tags

- Pill shape (`--radius-full`)
- Background: `--color-primary-light` (`#E8F6FD`)
- Text: `--color-primary` (`#19A1E6`), `--text-xs`, weight 600
- Used above section headings as category labels (e.g. "PDV", "Delivery", "Financeiro")

---

### Stats / Social Proof Numbers

- Large number: `48–64px`, weight 800, `--color-primary` or `--color-text-primary`
- Label: `--text-sm`, `--color-text-secondary`
- Pattern: "+7.000 restaurantes", "+1.400 cidades", "4ª melhor startup do Brasil"

---

### Comparison Sections (Before/After)

Yooga uses side-by-side or slider comparisons with:

- Left column (pain): icons in red/gray, `--color-error` tone
- Right column (solution): icons in green/blue, `--color-success` tone
- Divider with slide/drag interaction

---

### Testimonials / Quotes

- Card-based
- Avatar + name + restaurant type
- Quote text: italic, `--text-body-lg`
- Logo bar (client logos, grayscale, scrolling marquee)

---

## 8. Iconography & Imagery

### Icons

- Style: Rounded, 2px stroke, outline-first (Lucide or similar)
- Size: 20px (inline), 24px (feature), 40px (hero icons)
- Color: matches section context — primary blue in light sections, white in dark sections

### Illustrations / Screenshots

- UI screenshots of the actual product (PDV, delivery manager, KDS)
- Displayed in device mockups (browser frame or tablet/phone)
- No abstract 3D shapes — product-realistic approach

### Photography

- Real restaurants and operators
- Warm lighting, candid feel
- Used sparingly as full-bleed backgrounds with overlay gradient

---

## 9. Motion & Animation

- **Duration:** 200ms (hover states), 300ms (transitions), 500ms (reveals)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out, Material-like)
- **Card hover:** `transform: translateY(-2px)` + shadow lift
- **Button hover:** `translateY(-1px)` + darker background
- **Scroll reveals:** `opacity 0→1` + `translateY(16px→0)`, staggered per item
- **Logo marquee:** infinite horizontal scroll at `~40px/s`, pauses on hover
- **Comparison slider:** drag interaction on before/after panels

No heavy GSAP-style animations. Motion is subtle, functional, and never distracting.

---

## 10. Dark Sections

Yooga uses dark blocks (`#111827`) for high-contrast feature sections and footer.

- Background: `#111827`
- Text primary: `#F9FAFB`
- Text secondary: `#9CA3AF`
- Accent: `#19A1E6` (unchanged)
- Card backgrounds in dark sections: `#1F2937`
- Border in dark sections: `rgba(255,255,255,0.08)`

---

## 11. Responsive Behavior

| Breakpoint | Width  | Layout change                    |
| ---------- | ------ | -------------------------------- |
| `sm`       | 640px  | Single column, stacked cards     |
| `md`       | 768px  | 2-column grids activated         |
| `lg`       | 1024px | Full nav, 3-column feature grids |
| `xl`       | 1280px | Max content width reached        |

- Mobile: Nav collapses to hamburger. CTA floats bottom-sticky on landing pages.
- Hero text scales down: 64px → 40px → 32px
- Cards stack vertically on mobile, side-scroll on tablet where applicable

---

## 12. Voice & Copy Patterns

- **Direct and operator-focused:** "Zero papel, zero grito — pedido vai direto pra cozinha"
- **Contrast framing:** Before (pain) vs After (Yooga) — short, sharp statements
- **Numbers as proof:** Always includes quantified social proof above the fold
- **Action-first CTAs:** "Quero assinar", "Fale com um especialista", "Acessar"
- **Minimal legal/corporate language** in product-facing pages

---

_Generated from public design observation of yooga.com.br — May 2026._  
_This file is for development reference only. Not an official Yooga document._
