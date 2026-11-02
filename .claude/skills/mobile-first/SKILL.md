---
name: mobile-first
description: Mandatory rule for ANY front-end work (site, landing page, OS screen, dashboard, artifact, email template, HTML file). Use before writing or changing HTML/CSS/JSX/Astro/Tailwind, and before saying a front-end task is done. Every page must work on phones (iPhone + Android), tablets, laptops and desktops with no horizontal scroll, nothing cut off, images centered and correctly framed. Ends with the check.cjs gate.
---

# Mobile-first rule (Juliano, permanent)

Phones are the main screen of our clients' customers. A page that only works on desktop is NOT done.

## Hard rules (never break)

1. **Design at 360 px first**, then enhance with `min-width` media queries (360 → 768 → 1024 → 1440). Never desktop-first with `max-width` patches.
2. **No horizontal scroll, ever.** `html, body { overflow-x: clip; }` is a safety net, not the fix: find the element that overflows.
3. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Never block zoom (`user-scalable=no`, `maximum-scale=1`).
4. **No fixed widths** above 320 px. Use `width: 100%; max-width: …`, `min()`, `clamp()`, `minmax(0, 1fr)`. Grid children and flex children get `min-width: 0`.
5. **Images and video**: `max-width: 100%; height: auto;` always set `width`/`height` attributes (no layout jump). Cropped media uses `object-fit: cover` + an explicit `object-position` chosen for portrait. Art-direct portrait with `<picture>` / `srcset` (9:16 or 4:5 crop for phones; never a 16:9 shot squeezed into 9:16). Subject must be centered and visible at 360 px.
6. **Heights**: `100dvh` / `100svh` (with `100vh` fallback first). Never build a scroll timeline on `vh` measured at every resize (mobile address bar fires resize).
7. **Safe areas** (iPhone notch, Android gesture bar): `padding: env(safe-area-inset-*)` on fixed headers, bottom bars, sheets.
8. **Text**: body ≥ 16 px on phones (inputs ≥ 16 px or iOS zooms), labels ≥ 12 px, fluid titles with `clamp()`; long words: `overflow-wrap: anywhere`.
9. **Touch**: tap targets ≥ 44×44 px with 8 px gap; nothing depends on hover (`@media (hover: none)` shows hover-only info).
10. **Overlays** (menus, modals, cards): `max-height: 100dvh` (or `92svh` sheet) + inner `overflow-y: auto`; Close button always reachable at the top.
11. **Tables / wide content**: wrap in `overflow-x: auto` container, or turn rows into cards under 640 px.
12. **Weight**: phone-sized images (≤ 1200 px wide, WebP/AVIF, `loading="lazy"` below the fold), phone video renditions, no per-frame `filter: blur()` on touch devices.
13. **Both engines**: Safari/WebKit (every iPhone browser) and Chrome/Android. Add `-webkit-backdrop-filter` next to `backdrop-filter`; `playsinline muted` on autoplay video.

## Starter CSS (paste in every new project)

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
html, body { margin: 0; overflow-x: clip; }
img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }
input, select, textarea, button { font: inherit; font-size: max(16px, 1em); }
.container { width: min(100% - 2rem, 1200px); margin-inline: auto; }
.screen { min-height: 100vh; min-height: 100svh; }
```

## Done gate (mandatory before "done", commit or deploy)

```bash
node .claude/skills/mobile-first/check.cjs <url-or-file> [more pages]
```

It tests 8 screens (Android 360, iPhone SE 375, iPhone 390, iPhone Max 430, phone landscape, tablet 768, laptop 1366, desktop 1920) and saves screenshots (`SHOTS=dir`, default the system temp dir: never commit them). It exits 1 on:
- horizontal scroll: the page is wider than the screen (the phone zooms out or pans sideways);
- missing viewport meta;
- text cut at the screen edge, or a photo/video less than 80% visible.

Decorative shapes that pass the edge without widening the page (no text, `aria-hidden`, empty `alt`) and fully off-canvas elements (closed drawer) only warn. Put decor inside a parent with `overflow: hidden` (or `clip`) so it never widens the page.

- **FAIL = not done.** Fix and re-run.
- Look at the 360 and 390 screenshots yourself (Read the jpg): framing of photos, cut text, overlaps.
- Warnings (text < 12 px, taps < 44 px, `100vh` only) must be fixed unless there is a written reason.
- If the URL is unreachable from the session (network policy), run it on the local build (`npm run build && npx serve dist`) or the HTML file.
- Report the result (PASS/FAIL per viewport) to Juliano. Never claim mobile-ready without the run.
- Chromium emulation cannot reproduce WebKit bugs: for launches, ask Juliano for a 30 s check on a real iPhone + Android.
