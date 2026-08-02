#!/usr/bin/env python3
"""
Qimmah brand mark — single source of truth + reproducible render pipeline.

THE MARK: the "noded Ascent" (owner-approved, v2.1). On a 1024 grid —
  - chevron apex ............ (512, 340)
  - base node circles ....... (302, 640) and (722, 640)
  - stroke .................. 96   (round caps + joins)
  - node radius ............. 96   (node diameter = 2× stroke)
  - colour .................. white (#FFFFFF) mark on ember (#F0512A)
  - app-icon corner radius .. 230  (≈ iOS mask; baked only into the SVG favicon)

Every raster output below is drawn from THESE constants — change them here and
the whole brand (iOS AppIcon + splash, PWA icons, apple-touch, favicons, OG)
re-renders consistently. Icons carry no text, so rendering is fully
deterministic (no font/shaping dependency). Only the OG image uses text; it is
set in Latin because this offline box has no Arabic-shaping toolchain (no
libraqm) — see docs/brand/MARK-SPEC.md.

Run:  python3 scripts/brand/render.py
Deps: Pillow (system).  No network, no headless browser.
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Canonical geometry (1024 grid) ──────────────────────────────────────────
GRID = 1024
APEX = (512, 340)
NODE_L = (302, 640)
NODE_R = (722, 640)
STROKE = 96
NODE_R_RADIUS = 96
CORNER = 230                      # app-icon rounded-square radius (on 1024)
EMBER = (240, 81, 42)            # #F0512A
WHITE = (255, 255, 255)
SPLASH_BG = (16, 18, 22)         # #101216
SS = 4                            # supersample factor for anti-aliasing

ROOT = Path(__file__).resolve().parents[2]
BRAND_DIR = ROOT / "scripts" / "brand"
IOS_ICON = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
IOS_SPLASH = ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
PUBLIC = ROOT / "public"
SITE = ROOT / "site/assets"


# ── Core: draw the noded Ascent ─────────────────────────────────────────────
def draw_mark(draw: ImageDraw.ImageDraw, cx: float, cy: float, grid_px: float, color):
    """Draw the mark centred at (cx,cy) with the full 1024 grid mapped to grid_px."""
    k = grid_px / GRID

    def T(p):
        return (cx + (p[0] - 512) * k, cy + (p[1] - 512) * k)

    w = STROKE * k
    apex, nl, nr = T(APEX), T(NODE_L), T(NODE_R)

    # Chevron arms (two flat-capped segments); apex joint rounded by a disc,
    # base ends hidden inside the node discs.
    draw.line([nl, apex], fill=color, width=int(round(w)))
    draw.line([apex, nr], fill=color, width=int(round(w)))
    r = w / 2.0
    draw.ellipse([apex[0] - r, apex[1] - r, apex[0] + r, apex[1] + r], fill=color)

    # Base node discs.
    nr_px = NODE_R_RADIUS * k
    for c in (nl, nr):
        draw.ellipse([c[0] - nr_px, c[1] - nr_px, c[0] + nr_px, c[1] + nr_px], fill=color)


def _canvas(size, bg):
    """Supersampled RGBA canvas; bg=None → transparent."""
    return Image.new("RGBA", (size * SS, size * SS), (bg + (255,)) if bg else (0, 0, 0, 0))


def render_icon(size, *, bg=EMBER, mark=WHITE, mark_fill=1.0, flatten=EMBER):
    """Full-bleed square icon. mark_fill scales the grid (1.0 = canonical; <1 = maskable)."""
    img = _canvas(size, bg)
    d = ImageDraw.Draw(img)
    c = size * SS / 2
    draw_mark(d, c, c, size * SS * mark_fill, mark)
    img = img.resize((size, size), Image.LANCZOS)
    if flatten is not None:
        out = Image.new("RGB", (size, size), flatten)
        out.paste(img, (0, 0), img)
        return out
    return img


def render_splash(size):
    """Dark canvas, ember mark, mark height ≈ 26% of canvas."""
    img = Image.new("RGB", (size, size), SPLASH_BG)
    ss = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(ss)
    c = size * SS / 2
    mark_h_frac = 0.26
    # mark natural height on grid = (640+96) - (340-48) = 444 → 444/1024 of grid_px
    grid_px = (mark_h_frac * size * SS) * GRID / 444.0
    draw_mark(d, c, c, grid_px, EMBER)
    ss = ss.resize((size, size), Image.LANCZOS)
    img.paste(ss, (0, 0), ss)
    return img


def save_png(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print("  ✓", path.relative_to(ROOT))


# ── SVG source-of-truth emitters ────────────────────────────────────────────
def glyph_svg_body(color=WHITE):
    return (
        f'<path d="M{NODE_L[0]} {NODE_L[1]} L{APEX[0]} {APEX[1]} L{NODE_R[0]} {NODE_R[1]}" '
        f'fill="none" stroke="{_hex(color)}" stroke-width="{STROKE}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'  <circle cx="{NODE_L[0]}" cy="{NODE_L[1]}" r="{NODE_R_RADIUS}" fill="{_hex(color)}"/>\n'
        f'  <circle cx="{NODE_R[0]}" cy="{NODE_R[1]}" r="{NODE_R_RADIUS}" fill="{_hex(color)}"/>'
    )


def _hex(c):
    return "#%02X%02X%02X" % c


def mark_svg():
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {GRID} {GRID}" '
        f'role="img" aria-label="Qimmah">\n  {glyph_svg_body(WHITE)}\n</svg>\n'
    )


def appicon_svg(rounded=True):
    rx = f' rx="{CORNER}"' if rounded else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {GRID} {GRID}" '
        f'role="img" aria-label="قِمّة">\n'
        f'  <rect width="{GRID}" height="{GRID}"{rx} fill="{_hex(EMBER)}"/>\n'
        f'  {glyph_svg_body(WHITE)}\n</svg>\n'
    )


def favicon_svg():
    """64-grid rounded ember tile + white mark (corner radius scaled from 230/1024)."""
    size = 64
    k = size / GRID
    rx = round(CORNER * k, 2)
    body = (
        f'<g transform="scale({k})">\n    {glyph_svg_body(WHITE)}\n  </g>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'role="img" aria-label="قِمّة">\n'
        f'  <rect width="{size}" height="{size}" rx="{rx}" fill="{_hex(EMBER)}"/>\n'
        f'  {body}\n</svg>\n'
    )


def write_svg(text, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("  ✓", path.relative_to(ROOT))


# ── OG image (1200×630) — mark-forward, Latin wordmark (no Arabic shaping) ───
def _font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), EMBER)
    # subtle vertical depth: darken toward the bottom
    top, bot = EMBER, (196, 60, 28)
    grad = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    img = grad.resize((W, H))
    d = ImageDraw.Draw(img)
    # left: rounded app-icon lockup (white mark in a lighter ember tile)
    tile = 300
    tx, ty = 150, (H - tile) // 2
    tile_img = render_icon(tile, bg=EMBER, mark=WHITE, flatten=EMBER)  # canonical white-on-ember chip
    rounded = Image.new("L", (tile, tile), 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, tile - 1, tile - 1], radius=int(CORNER * tile / GRID), fill=255)
    img.paste(tile_img, (tx, ty), rounded)
    # right: Latin wordmark + domain
    wm = _font(["/System/Library/Fonts/SFNSRounded.ttf", "/System/Library/Fonts/SFNS.ttf",
                "/Library/Fonts/Arial Bold.ttf"], 132)
    sub = _font(["/System/Library/Fonts/SFNS.ttf", "/Library/Fonts/Arial.ttf"], 46)
    x = tx + tile + 70
    d.text((x, 214), "Qimmah", font=wm, fill=WHITE)
    d.text((x + 4, 372), "qimmah.app", font=sub, fill=(255, 236, 226))
    return img


# ── Orchestration ───────────────────────────────────────────────────────────
IOS_ICON_SIZES = {
    "icon-20.png": 20, "icon-29.png": 29, "icon-40.png": 40, "icon-58.png": 58,
    "icon-60.png": 60, "icon-76.png": 76, "icon-80.png": 80, "icon-87.png": 87,
    "icon-120.png": 120, "icon-152.png": 152, "icon-167.png": 167, "icon-180.png": 180,
    "icon-1024.png": 1024, "AppIcon-512@2x.png": 1024,
}


def main():
    print("SVG source of truth →")
    write_svg(mark_svg(), BRAND_DIR / "qimmah-mark.svg")
    write_svg(appicon_svg(rounded=True), BRAND_DIR / "qimmah-appicon.svg")
    write_svg(favicon_svg(), BRAND_DIR / "qimmah-favicon.svg")

    print("iOS AppIcon (full-bleed ember, white mark, no alpha) →")
    for name, sz in IOS_ICON_SIZES.items():
        save_png(render_icon(sz), IOS_ICON / name)

    print("iOS Splash (dark, ember mark) →")
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        save_png(render_splash(2732), IOS_SPLASH / name)

    print("PWA icons (public/) →")
    save_png(render_icon(192), PUBLIC / "icon-192.png")
    save_png(render_icon(512), PUBLIC / "icon-512.png")
    save_png(render_icon(192, mark_fill=0.80), PUBLIC / "icon-maskable-192.png")
    save_png(render_icon(512, mark_fill=0.80), PUBLIC / "icon-maskable-512.png")
    save_png(render_icon(180), PUBLIC / "apple-touch-icon.png")
    write_svg(favicon_svg(), PUBLIC / "favicon.svg")
    save_png(render_og(), PUBLIC / "og-image.png")

    print("Site brand images (site/assets/) →")
    write_svg(favicon_svg(), SITE / "favicon.svg")
    save_png(render_icon(180), SITE / "apple-touch-icon.png")
    save_png(render_og(), SITE / "og-image.png")

    print("Done. All brand surfaces rendered from canonical geometry.")


if __name__ == "__main__":
    main()
