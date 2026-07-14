# Second Pass — Verification Ledger

## A. Apple limits/specs — re-verified against live sources (accessed **July 2026**)

| Item | Value used | Source (accessed July 2026) |
|---|---|---|
| App Name | ≤ **30 chars** | developer.apple.com/help/app-store-connect/reference/app-information/app-information/ |
| Subtitle | ≤ **30 chars** | (same app-information reference) |
| Promotional Text | ≤ **170 chars**, editable without re-review | developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/ ; developer.apple.com/app-store/product-page/ |
| Keywords | ≤ **100 BYTES** (not chars), comma, no spaces | developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/ |
| Description | ≤ **4,000 chars** | (same platform-version reference) |
| Screenshots — required | **6.9″** iPhone set (fallback **6.5″**); auto-scales down | developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/ |
| Screenshots — count | **min 1, max 10** per size; iPad not required | (same screenshot-specifications) |
| Screenshots — px | 6.9″ = **1260×2736**, 6.5″ = **1284×2778** portrait | (same) — *exact accepted 6.9″ resolution: TO-CONFIRM at upload* |
| Age ratings | **4+/9+/13+/16+/18+**; new topic groups (In-App Controls, Capabilities, Medical/Wellness, Violence); "Unrestricted Web Access" and "Gambling" still asked | developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions/ ; developer.apple.com/news/?id=ks775ehf (announced 2025-07-24, mandatory 2026-01-31) |
| Demo account | **Required** when sign-in needed; entered in App Review Information → Sign-In | developer.apple.com/distribute/app-review/ ; developer.apple.com/help/app-store-connect/reference/app-review-information/ |

**Measured against limits (recomputed):** Name 27/30 ✓ · Subtitle 23/30 ✓ · Promo 160/170 ✓ · Keywords 95/100 bytes ✓ · all screenshot captions ≤6 words ✓.

## B. Feature claims → code (re-traced; all exist TODAY on wave2 f0cf693)

| Claim (in description) | Evidence |
|---|---|
| Onboarding builds a plan from goal/days/place/equipment/injury | `src/views/OnboardingV2.tsx:97-104,204-367` |
| Today four-ring path + next-step hero + nudges | `src/views/TodayV2.tsx:58-186` |
| Dark focus workout, set editor, rest timer survives backgrounding, summary | `src/views/WorkoutV2.tsx:32-43,276-318,351-355,457-466` |
| Nutrition macro/water rings, meal logging | `src/views/NutritionV2.tsx:139-201` |
| Barcode scan → Open Food Facts + search + high-protein filter | `src/views/NutritionV2.tsx:330-359` ; `src/features/barcode/ScanFoodPanel.tsx:75-96` ; `src/features/barcode/openFoodFacts.ts:6,84-95` |
| Progress: weight trend, strength ladder, momentum, honest hedging | `src/views/ProgressV2.tsx:56,80-286` |
| Profile: stats, program card, 10-week heatmap | `src/views/ProfileV2.tsx:60-134` |
| No ads/tracking; device-first; optional sync; delete account | `docs/legal/app-privacy-labels.md` §A,§C ; `src/lib/authContext.tsx:244-257,374-401` |
| Qimmah+ = one quiet line (no paywall) | `src/views/ProfileV2.tsx:83-91` |
| v2 surfaces gated behind build flag | `src/design-system/designPreview.ts:41-46` |

**Claims deliberately EXCLUDED (placeholders — not shipped features):** Workout "Replace" (`WorkoutV2.tsx:441`), Profile "Health sharing / Export data" (`ProfileV2.tsx:158-159`), onboarding "preview" disclaimer. None appear in the description.

## C. TO-CONFIRM (unverifiable here — never guessed)
1. **Exact accepted 6.9″ screenshot resolution** — Apple lists more than one per class; confirm in ASC at upload.
2. **Final computed age rating** — Apple computes it from the questionnaire; record what ASC shows (expected 4+/9+).
3. **OWNER-DECISION — minimum eligibility age** (`terms-of-service.md` §3 unset; no code gate `validation.ts`). Must align with/≥ content rating.
4. **OWNER-DECISION — analytics**: does the store build set `VITE_ANALYTICS_ENDPOINT`? Sets the "Usage Data" privacy rows.
5. **OWNER-DECISION — legal hosting**: `docs/legal/**` + `public/legal/*.html` live on `legal/appstore-pack`, NOT merged into wave2; must be merged/hosted for privacy labels + support/privacy URLs.
6. **OWNER-DECISION — RLS enabled** on the Supabase project (data-isolation claim) — `app-privacy-labels.md` §E.
7. **OWNER-DECISION — price/availability, SKU, English screenshot set, TestFlight external.**
8. **The brand voice PDF (§02)** referenced in the brief is **not in the repo**; voice was grounded on `docs/design/DESIGN-DECISIONS.md:19` + `src/design-system/v2/labels.ts` instead. Confirm alignment if the PDF differs.
9. **Keywords tuning** — post-launch, swap Name-duplicated terms for synonyms to widen coverage (non-blocking).
