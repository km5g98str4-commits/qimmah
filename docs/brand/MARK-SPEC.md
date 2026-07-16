# Qimmah Mark — Specification (DO NOT DEVIATE)

The **owner-approved** Qimmah brand mark is the **noded Ascent**: a chevron
rising to an apex, anchored by two base nodes. It reads as ascent + momentum,
survives at favicon sizes, and is the single mark across every surface.

## Canonical geometry (1024 grid)

| Element | Value |
|---|---|
| Chevron apex | **(512, 340)** |
| Base node — left | **(302, 640)** |
| Base node — right | **(722, 640)** |
| Chevron stroke | **96** (round cap + round join) |
| Node radius | **96** (node diameter = 2 × stroke) |
| Mark colour | **white `#FFFFFF`** |
| Background (ember) | **`#F0512A`** |
| App-icon corner radius | **230** on the 1024 grid (≈ iOS superellipse mask) |
| Splash background | **`#101216`** (mark rendered in ember on dark) |

Path: `M302 640 L512 340 L722 640` (stroke) + filled `circle`s r=96 at each base
node. Vector source of truth: [`scripts/brand/qimmah-mark.svg`](../../scripts/brand/qimmah-mark.svg)
(glyph), [`qimmah-appicon.svg`](../../scripts/brand/qimmah-appicon.svg) (ember lockup),
[`qimmah-favicon.svg`](../../scripts/brand/qimmah-favicon.svg) (rounded tile).

## Do-not-deviate rules

1. **Never ship the mark without the two base nodes.** The bare chevron `^` (the
   previously shipped iOS icon), the "mountain-over-bar" glyph, and the
   "ascending bars" placeholder are all **retired** — they are the bug this spec
   exists to prevent.
2. **Ember is exactly `#F0512A`.** Not `#F26A21`, not any other orange.
3. **White mark on ember** for icons/favicons; **ember mark on `#101216`** for the
   dark splash; **ember mark** inline on the dark app hero (no tile).
4. App-icon PNGs are **full-bleed squares with no alpha and no baked corners** —
   iOS/Android apply their own mask. Corner radius 230 is baked **only** into the
   SVG favicon (where we own the shape).
5. Any new mark placement must be generated from the geometry above — do not
   hand-draw or eyeball it.

## Reproducible pipeline (single source of truth)

```bash
python3 scripts/brand/render.py      # Pillow only — no network, no headless browser
```

Regenerates, from the constants at the top of `render.py`:

- **iOS** `AppIcon.appiconset` — all 14 PNG sizes (20…1024) + `Contents.json` unchanged.
- **iOS** `Splash.imageset` — 3 × 2732².
- **PWA** `public/` — `icon-192/512`, `icon-maskable-192/512` (mark at 80% for the
  safe zone), `apple-touch-icon`, `favicon.svg`, `og-image`.
- **Site** `site/assets/` — `favicon.svg`, `apple-touch-icon`, `og-image`.

Change a constant → the whole brand re-renders consistently. Icons carry no text,
so rendering is deterministic (no font dependency).

### In-app mark (React)

`src/views/StartViewV2.tsx` → `AscentMark` (header lockup) and `AscentMotif`
(faint hero watermark) render the **same** path/nodes in a `0 0 1024 1024`
viewBox, filled with `var(--c-primary)` (ember). Keep them in lockstep with this
spec.

### Note — OG wordmark

`og-image.png` sets the wordmark in **Latin ("Qimmah")** because the render host
has no Arabic-shaping toolchain (Pillow without libraqm). When a shaping pipeline
is available, the Arabic wordmark «قِمّة» can be substituted in `render_og()`
with no change to the mark geometry.
