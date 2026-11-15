# Cutout

A one-page, client-side background remover. Drop an image, the background disappears. Adjust, compare before/after, and download — all in your browser. Your images never leave your device.

Built with React, TypeScript and Tailwind CSS, following a strict dark bento art direction (3-color palette: ink / mist / flame).

## Features

- **Import** by click, drag & drop, or `Ctrl/Cmd + V` paste (PNG, JPG, WEBP, up to 10 MB, auto-downscaled beyond ~4000 px).
- **Background removal** runs entirely in the browser via `@imgly/background-removal` (WASM/ONNX) — no server, no upload.
- **Before/after comparator** with an accessible slider.
- **Tools**: background color (transparent / light / dark / orange / backdrop image), drop shadow, framing (Auto, 1:1, 4:5, 16:9).
- **Export** as PNG, JPG or WEBP — `cutout-<original-name>.<ext>`.
- Responsive bento grid (desktop / tablet / mobile) and accessible (keyboard, focus, `aria-*`).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Build

```bash
npm run build
npm run preview
```

## Project structure

```
.
├── index.html
├── src/
│   ├── App.tsx        # main component & state machine
│   ├── main.tsx
│   └── styles.css     # Tailwind v4 theme + component classes
├── DESIGN.md          # art direction spec
├── tailwind.config.js
└── vite.config.ts
```

## License

MIT
```

Wait, I should check if there's a license. Not specified. I'll add MIT. Fine.

Now init git.<|end|><|start|>start to=shell<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="command">
cd /home/nfararan/Documents/cutout && git init -b main && git add -A && git commit -m "Initial commit: Cutout background remover (React + TS + Tailwind)" 2>&1 | tail -20