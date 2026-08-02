# 08 — App Preview video storyboard (6.9", portrait)

A single **15–30 second** iPhone App Preview for the 6.9" slot. Portrait, RTL, Arabic UI, recorded from the
**`VITE_DESIGN_V2=true`** build on a 6.9" simulator. **No music-licensing assumptions** — deliver silent or use
only audio the owner has licensed (see §Audio). Target run time below: **~24 s**.

> App Preview specs (verify exact accepted resolution at upload in App Store Connect):
> Apple — *App preview specifications*
> <https://developer.apple.com/help/app-store-connect/reference/app-preview-specifications/>. App Previews are
> recorded on-device/simulator at the device resolution; the 6.9" slot accepts the 6.9" recording. 15–30 s, H.264/HEVC.

## Shot-by-shot
| # | t (s) | Surface | Action | On-screen AR caption (≤6 words) | Transition |
|---|---|---|---|---|---|
| 1 | 0–3 | Welcome | App opens; brand mark + headline settle | درّب بوضوح. تقدّم بثقة. | Fade in |
| 2 | 3–6 | Today | Pillars fill (تغذية ٩٥٪ · حركة ٨٢٪); hero pulses | ابدأ يومك بخطوة واضحة | Cut |
| 3 | 6–7 | Today→Workout | Tap «ابدأ التمرين» | — | Push (RTL) |
| 4 | 7–12 | Active Workout (dark) | Log a set → tap «أنهِ المجموعة»; rest timer counts | سجّل كل مجموعة بثقة | Cut |
| 5 | 12–16 | Nutrition | Add a meal; protein ring fills toward target | تتبّع تغذيتك بسهولة | Cross-fade |
| 6 | 16–20 | Progress | Slow scroll over the hedged brief + رؤى الأسبوع cards | اقرأ تقدّمك بصدق | Slow pan |
| 7 | 20–22 | Profile | Stats + commitment heatmap reveal | تابع رحلتك التدريبية | Cut |
| 8 | 22–24 | End card | قِمّة noded mark + tagline; hold | قِمّة · رفيقك نحو القمّة | Fade out |

Notes: keep motion calm (Momentum, not hype). Every action is real (no faked data) — use the seeded reviewer
profile from `04-screenshots.md`. Captions are burned-in text overlays, verb-first MSA, one per shot.

## Recording instructions (owner — macOS + Xcode)
```bash
# 1) Boot a 6.9" simulator (16 Pro Max = 6.9").
xcrun simctl boot "iPhone 16 Pro Max"
open -a Simulator

# 2) Run the v2 build in the simulator (or load the preview URL in Safari on-device for a web capture).
VITE_DESIGN_V2=true npm run build && npx cap run ios   # or the native scheme in Xcode

# 3) Record the screen while performing shots 1→8 above.
xcrun simctl io booted recordVideo --codec h264 --mask ignored qimmah-preview.mov
#    …perform the storyboard… then press Ctrl-C to stop.

# 4) Trim to 15–30 s and (optionally) add burned-in captions, no audio track:
ffmpeg -i qimmah-preview.mov -ss 00:00:00 -t 24 -c:v libx264 -an qimmah-preview-6_9.mp4
```
- Upload `qimmah-preview-6_9.mp4` in the **App Preview** slot of the 6.9" set (max 3 previews).
- **Audio:** leave silent (`-an`) unless the owner supplies **licensed** music — do **not** add stock/licensed
  tracks without a cleared licence.
- First frame = the poster frame; make shot 1 land on the brand + headline.
