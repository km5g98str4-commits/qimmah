# App Store launch visual kit

Apple accepts 1–10 screenshots and currently accepts 6.9-inch portrait screenshots at
1260×2736, 1290×2796, or 1320×2868. Qimmah ships 1260×2736. App previews are 15–30 seconds,
up to 30 fps, and up to 500 MB. Sources: [screenshots](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [app previews](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/).

Run `VITE_DESIGN_V2=true npm run build && node scripts/appstore-screenshot-factory.mjs`, then
`node scripts/launch/composite-screenshots.mjs`. Captions are verb-first and ≤6 Arabic words.

| Shot | Action | Duration | Caption |
|---|---|---:|---|
| Welcome | Start and accept 12+ | 2s | ابدأ رحلتك بوضوح |
| Today | Scan three pillars | 3s | تابع يومك بثقة |
| Workout | Enter 99 kg and finish set | 5s | سجّل تمرينك فورًا |
| Nutrition | Add a Saudi meal | 4s | أضف وجبتك بسهولة |
| Progress | Open trends and PRs | 4s | شاهد تقدّمك بصدق |
| Profile | Open achievements/export | 3s | اجمع إنجازاتك هنا |

Owner recording: delete the app before shell-changing installs, record portrait at 30 fps, trim
to 21 seconds, then encode with `ffmpeg -i capture.mov -c:v libx264 -profile:v high -level 4.0
-r 30 -b:v 11M -c:a aac -b:a 256k preview.mp4`.
