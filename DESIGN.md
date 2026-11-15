# Cutout — Art direction (dark bento)

Brief for an AI agent: build a **one-page app** for removing image backgrounds.
Visual reference: https://claude.ai/artifact/8ZvGRxgUgHsD9JEov5z1Yo

## 1. Principles

- A single page, the bare essentials: import, remove the background, compare before/after, adjust, export.
- **Bento** layout: grid of tiles with very rounded corners.
- **Strict 3-color palette**, 60 / 30 / 10 rule. No other color, no opacity, no hue gradients.
- Geometric typography, tight titles, lots of air.
- No emoji, no drop shadows on the UI, no decorative gradients.

## 2. Colors (tokens)

| Token | Hex | Part | Usage |
|---|---|---|---|
| `ink` | `#2b2d30` | 60 % | Page background, dark tiles, text on light or orange backgrounds |
| `mist` | `#c9d6df` | 30 % | Light tiles, text and borders on dark backgrounds |
| `flame` | `#ff4b2b` | 10 % | Actions (buttons), active state, comparison slider, accents |

Rules:
- Dark tile = `ink` background + `mist` border 2 px (otherwise it blends into the page) + `mist` text.
- Light tile = `mist` background + `ink` text.
- Orange tile = `flame` background + `ink` text.
- `ink` on `flame` contrast ≈ 4:1: any text on `flame` must be **≥ 19 px and bold** (buttons, titles, chips).
- Never put small `flame` text on `ink` (< 18 px). Orange is for icons, button backgrounds and strokes.
- The transparency checkerboard is an `ink` / `mist` 20 px checkerboard.

## 3. Typography

- Titles: **Space Grotesk** 700, `letter-spacing: -0.03em`, `line-height: 1.02`.
- Body: **Inter** 400 / 500 / 600.
- Scale: h1 `60px` (44 px < 900 px), tile titles `20px`, subtitle `18px`, secondary text `14px`, eyebrow `13px` uppercase + `tracking .08em`.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap`

## 4. Shapes and spacing

- Tile radius `28px`, inner radius (drop zone, comparator) `20px`, buttons and chips `999px`.
- Grid gutter `16px`, tile padding `28px` (`20px` on mobile), container `max-w-[1200px]`, page padding `24px`.
- Touch targets **≥ 44 px** (buttons 52 px, chips 44 px, color swatches 44 px).

## 5. Tailwind configuration

### Tailwind v3 — `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2b2d30',
        mist: '#c9d6df',
        flame: '#ff4b2b',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        tile: '28px',
        inner: '20px',
      },
      spacing: { tile: '28px' },
      letterSpacing: { tightest: '-0.03em' },
      backgroundImage: {
        checker:
          'repeating-conic-gradient(#2b2d30 0 25%, #c9d6df 0 50%)',
        'checker-sm':
          'repeating-conic-gradient(#2b2d30 0 25%, #c9d6df 0 50%)',
      },
      backgroundSize: { checker: '20px 20px', 'checker-sm': '12px 12px' },
    },
  },
  plugins: [],
};
```

### Tailwind v4 — `src/styles.css`

```css
@import "tailwindcss";

@theme {
  --color-ink: #2b2d30;
  --color-mist: #c9d6df;
  --color-flame: #ff4b2b;
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-sans: Inter, system-ui, sans-serif;
  --radius-tile: 28px;
  --radius-inner: 20px;
}
```

### Component utility classes (v3 or v4)

```css
.tile      { @apply rounded-tile p-5 sm:p-7 flex flex-col; }
.tile-dark { @apply bg-ink text-mist border-2 border-mist; }
.tile-light{ @apply bg-mist text-ink; }
.tile-flame{ @apply bg-flame text-ink; }
.btn       { @apply min-h-[52px] px-7 rounded-full bg-flame text-ink font-bold text-[19px] cursor-pointer; }
.chip      { @apply min-h-[44px] px-4 rounded-full border-2 border-current bg-transparent font-semibold text-[15px]; }
.chip[aria-pressed="true"] { @apply bg-flame border-flame text-ink font-bold; }
.checker   { background-image: repeating-conic-gradient(#2b2d30 0 25%, #c9d6df 0 50%); background-size: 20px 20px; }
```

## 6. Bento grid

Desktop (≥ 1024 px): `grid grid-cols-12 gap-4`.

| Tile | Style | Columns | Min height |
|---|---|---|---|
| Hero + drop zone | dark | 7 | 560 px |
| Before / after comparator | light | 5 | 560 px |
| Background color | dark | 3 | 220 px |
| Drop shadow | light | 3 | 220 px |
| Framing | dark | 3 | 220 px |
| Export | orange | 3 | 220 px |

Responsive: < 1024 px, hero and comparator span 12 columns, tools span 6; < 520 px, everything spans 12 columns, page padding 12 px.

## 7. HTML skeleton (Tailwind)

See `maquette.html` for the reference markup.

## 8. Behaviors to implement

**Flow**: state `empty` → `processing` → `result`.
- `empty`: drop zone visible, comparator showing an example image or empty state, tools disabled (`opacity` forbidden: use `disabled` + `cursor-not-allowed` + dashed border).
- `processing`: button replaced by a loading state (text "Processing…" + progress bar `bg-flame` on `ink` background).
- `result`: comparator filled, tools active, Download button active.

**Inputs**: click on the zone, drag and drop, paste with `Ctrl/Cmd + V` (`paste` event, `clipboardData.files`). Accept PNG, JPG, WEBP, reject the rest with an error message in `mist`/`ink` text (no other color). Set a maximum size (e.g. 10 MB) and downscale beyond ~4000 px.

**Comparator**: the `input[type=range]` updates `--pos` on `#cmp`:

```js
const cmp = document.getElementById('cmp');
document.getElementById('slider').addEventListener('input', (e) => {
  cmp.style.setProperty('--pos', e.target.value + '%');
});
```

**Tools** (applied on a `<canvas>` then exported):
- Background color: transparent / `mist` / `ink` / `flame` + import of a backdrop image.
- Drop shadow: intensity 0–100 → `shadowBlur` / `shadowOffsetY` of the canvas context (black), 0 = none.
- Framing: Auto (subject bounding box) / 1:1 / 4:5 / 16:9.
- Export: PNG (transparency kept), JPG (background required), WEBP; name `cutout-<original-name>.<ext>`.

**Background removal** (developer's choice):
- Browser: `@imgly/background-removal` (WASM/ONNX, nothing sent to a server, compatible with the "Your images stay on your device" note). Check the license before commercial use.
- Server: third-party API or `rembg` (Python) behind an endpoint. In that case, **remove** the privacy note from the footer.

## 9. Accessibility

- Text contrast 4.5:1 minimum, except text ≥ 19 px bold on `flame`.
- Real `button`, `label`, `input` elements; `aria-label` on any icon-only control; decorative icons `aria-hidden="true"`.
- Visible focus: `outline: 3px solid #ff4b2b; outline-offset: 3px` on dark backgrounds, `outline-color: #2b2d30` on light or orange backgrounds.
- `aria-pressed` on chips, `aria-live="polite"` on the processing state.
- Respect `prefers-reduced-motion`: no mandatory animation.

## 10. Forbidden

- Any color outside `ink`, `mist`, `flame`; any opacity (`opacity-*`, `bg-*/50`).
- Hue gradients, `shadow-*` shadows, emojis, decorative stock images.
- More than one page, multi-level navigation, unnecessary modals.

## 11. Ready-to-paste prompt

> Build the site described in DESIGN.md as a single `index.html` + Tailwind + vanilla JavaScript (Vite accepted). Strictly follow the tokens, the bento grid, the contrast rules and the 3-color palette. Implement the empty → processing → result flow, the before/after comparator, the 4 tools and export. Use `@imgly/background-removal` on the client side. Add no feature, no color and no page. Ship a responsive site (desktop, tablet, mobile) that is accessible.