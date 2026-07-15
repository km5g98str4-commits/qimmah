# Qimmah canonical mark

The reproducible source is `scripts/brand/render-mark.mjs`; generated SVG masters live under
`scripts/brand/generated/`. Run `node scripts/brand/render-mark.mjs`, then `npx cap sync ios`.

| Geometry | Canonical value |
|---|---:|
| Grid | 1024 × 1024 |
| Apex | (512, 340) |
| Base nodes | (302, 640), (722, 640) |
| Chevron stroke | 96, round caps/joins |
| Node radius | 96 (2× stroke) |
| Foreground / background | white / ember `#F0512A` |
| Icon corner radius | 230 |

Inventory: iOS AppIcon and splash catalogs; public favicon, PWA any/maskable icons,
apple-touch icon and OG image; site favicon; `StartViewV2` in-app mark/motif. Pixel proof uses
the generated 1024 master and 180 px apple-touch output; the same vector is the source of both.
