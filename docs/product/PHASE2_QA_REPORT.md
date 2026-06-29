# Phase 2 — Integration QA Report (Agent 6)

- **Branch:** `integration/phase2`
- **Integration HEAD at QA time:** `1088464` ("Integrate P2 A2: machine catalog UI + beginner machine-first"). **All Phase-2 feature branches are now merged** (`phase2-goals`/`-goals-onboarding`, `-exercises`, `-nutrition`, `-simplify`, `-muscle-steps`, A2 machine-first, A4 simple/greeting/quick-entry). This QA commit sits on top. NOTE: this branch was being pushed to concurrently by multiple agents during QA; results reflect the stated HEAD.
- **Date:** 2026-06-29
- **Method:** static audit (3 parallel deep-audit passes) + full browser QA on a production preview build (`vite preview`), fresh `localStorage`. Re-verified after the remote advanced mid-QA (A2/A4/exercises/simplify landed after the initial clone).

---

## 0. Build / Lint / Typecheck (re-run on final HEAD)

| Check | Result |
|---|---|
| `npm install` | ✅ ok (non-blocking `npm audit` advisories only) |
| `npm run build` | ✅ pass — main chunk ~0.9 MB / ~0.24 MB gzip (non-blocking size advisory) |
| `npm run lint` | ✅ pass — exit 0, **0 warnings** (`--max-warnings 0`) |
| `npm run typecheck` (`tsc -b --noEmit`) | ✅ pass — no errors |

---

## 1. Are A1–A5 present? (integration coherence)

**YES — all Phase-2 feature branches are merged (as of HEAD `1088464`).**

- Merged: `phase2-goals` / `-goals-onboarding` (A1), `-exercises`, `-nutrition` (A3: gram-based + declutter + Saudi/Gulf), `-simplify` + A4 (simple/greeting/quick-entry), `-muscle-steps` (A5: muscle map + manual step counter), A2 (machine catalog UI + beginner machine-first), `v2-onboarding-engine`.
- The earlier QA pass found `phase2-muscle-steps` unmerged; it has since landed (`d0200ac`/`18f2d5e`), resolving the manual step counter gap.
- The app is coherent and builds/lints/typechecks clean. Per-feature results below are authoritative over branch names.

---

## 2. Per-feature verification

### Item 1 — Goals (3 only) + recomp→cut + target weight — ✅ PASS (product note)
- Onboarding offers **exactly 3** goals: تضخيم / تنشيف / **زيادة القوة** (bulk/cut/strength).
- **Product note:** 3rd goal is *strength*, not *maintain* — confirm with founder.
- Recomp→cut migration verified (`lib/customization.ts:187`, `lib/onboardingProfile.ts:73`).
- Target weight drives cut/bulk with validation + ETA. Live: cut onboarding → "تنشيف · 3 أيام · 2013 سعرة".

### Item 2 — Training / machine library / day naming — ⚠️ PARTIAL (improved by A2)
- **Beginner machine-first + no free cables — ✅ now handled by the generator:** `planGenerator.ts` adds `prefersMachines(tier)` (beginner/novice prefer machines) and `cableOk` excludes **free-cable** stations for non-advanced (`isFreeCableExercise` = cable && !machine; machine-guided lat-pulldown/row stay allowed). New `data/machineCatalog.ts` added.
- **Legacy gap:** the static `beginner-gym` *template* (`workoutTemplates.ts`) still lists `lat-pulldown`/`seated-cable-row` and is not the default path (default = generated plan), so low impact — but inconsistent.
- **Machine library grouping — ✅ now PASS:** `ExerciseLibraryView.tsx` adds a view toggle "كل التمارين / الأجهزة (للمبتدئين)" rendering `machineCatalog` grouped by muscle group (chest/back/legs/shoulders/bi/tri), beginner-friendly.
- **Demo/placeholder + YouTube fallback, no broken images — ✅ PASS** (gradient placeholders, no external `<img>`, YouTube-search `videoUrl` fallback).
- **Day naming — ⚠️ PARTIAL:** push/pull/legs use numbers (دفع ١/٢…), but **full-body** generated days still use **"جسم كامل أ/ب/ج"** (`planGenerator.ts:403`), and legacy `beginner-gym`/`full-body-3`/`fat-loss` templates still أ/ب/ج. Beginners on 3 days get full-body → still see أ/ب/ج.

### Item 3 — Nutrition — ✅ PASS
- Gram-based (`servingGrams`, per-serving macros). نسخ/مفضّلة gone. Saudi/restaurant foods searchable (kabsa/mandi/shawarma/broast; **no "Al Baik" specifically**).
- Quick-add + **live updates** + **persistence** verified live: "كبسة" → "كبسة دجاج" added → food 0→620 live; macros كارب65/بروتين35/دهون24; survived refresh (`nutritionToday:v1`). Water +500 ml live + persisted.

### Item 4 — Simple-by-default + greeting + 1-tap — ✅ PASS (fixed by A4)
- **Greeting — ✅ now exactly "أهلًا يا {name} 👋"** (`DashboardView.tsx:102`); verified live: "أهلًا يا سعد 👋".
- **Daily rotating phrase — ✅ implemented** (`data/dailyPhrases.ts` + `phraseForDay`, deterministic by date); verified live ("الراحة المخطّطة تقوّي العودة"). No health-promise / no worth-tied-to-body language.
- **Quick-start-workout + quick-add-food — ✅ now 1-tap on home:** dashboard shows "ابدأ تمرين" and "سجّل أكل" cards directly.
- **Simple-by-default — ✅ improved:** advanced split steps are now gated behind `splitMode==='advanced'` and several steps marked `optional` (`PlanBuilder.tsx`). Onboarding still has a fair number of (mostly optional/conditional) steps — see FU-P2-4 for further trimming.
- "تعديل خطتي" reachable + decluttered.

### Item 5 — Muscle map / step counter / no fake sync — ✅ PASS (muscle-steps now merged)
- **Muscle map highlights trained muscles — ✅** (`muscleGroupCoverage.computeGroup` from logged sets).
- **Manual step counter — ✅ now implemented:** `src/lib/stepCounter.ts` (`setSteps`, daily log key `qimmah:steps:v1`, editable daily goal `qimmah:stepGoal:v1`) + `StepCounterCard.tsx`. Manual daily entry, persisted locally.
- **No fake health-sync — ✅** honest "قريبًا: Apple Health و Google Fit" label; no fake/auto data.

### Item 6 — RED LINES — ✅ PASS (all)
- No medical advice; no dosage **recommendations** (user-input only + "استشر الطبيب"); BMI descriptive/neutral; no fake stats/testimonials; no broken media; no demo data in real flow (real dashboard shows no demo name; `#/demo` isolated, "أحمد (نموذج)", does not overwrite real customization); no "Ziyad/زياد" placeholder (`git grep` matches only "زيادة").

---

## 3. Full QA — core flows

| Flow | Result | Notes |
|---|---|---|
| Fresh beginner onboarding end-to-end | ✅ PASS | Completes → dashboard with generated plan; onboarding marked complete; customization saved. **rAF caveat below.** |
| Corrupted / legacy localStorage | ✅ PASS | Invalid JSON in 6 keys → no crash, falls back to `#/start`, no console errors. |
| Food + water logging live + persist | ✅ PASS | Verified live + across refresh. |
| Workout start → finish persists after refresh | ✅ PASS | In-app finish confirmation, summary, session + exerciseHistory persisted. |
| Routes settings/privacy/terms/contact/404 | ✅ PASS | All render; unknown hash → Arabic 404 "٤٠٤ الصفحة غير موجودة". |
| No console errors | ✅ PASS | Only the intentional build-marker `console.info`. |
| Build marker | ✅ present | `BUILD_LABEL` in console + Footer. |
| Greeting + rotating phrase + 1-tap entry | ✅ PASS | Verified live on final build (see Item 4). |

**Caveat (onboarding "building" screen):** the ~2.5s "نبني خطتك…" screen advances via `requestAnimationFrame` (`PlanBuilder.tsx`), which browsers pause in a backgrounded tab → if the user switches away during those 2.5s the build stalls at 0% until refocus (**self-heals on refocus**, verified). Not a crash/data-loss; foreground use unaffected. See FU-P2-1.

---

## 4. P0 fixes applied

**None.** No P0 regressions found (no crashes, no data loss, no broken core flow in normal foreground use). Per scope (fix only P0, no feature work), this pass is **docs-only**; integration code untouched.

---

## 5. Risk summary & readiness

- **Ready for founder smoke test?** ✅ **Yes.** All core flows work end-to-end, no crashes/console errors, data persists, greeting/quick-entry polished. Brief the founder to keep the tab foreground during the ~2.5s "building your plan" screen (FU-P2-1).
- **Ready for `main`?** ⚠️ **Almost — recommend a short polish pass.** No stability blockers, and all Phase-2 branches are now merged. Resolved since first pass: greeting + rotating phrase + 1-tap entry (A4), beginner cable handling (A2 generator), machine catalog UI (A2), manual step counter (A5/muscle-steps). Remaining gaps: full-body day names still أ/ب/ج (FU-P2-3, MED); legacy `beginner-gym` template still lists cables (FU-P2-2, LOW — default is the generated plan); rAF onboarding-completion robustness (FU-P2-1, HIGH); onboarding can be trimmed further (FU-P2-4, MED); Al Baik not in food DB (LOW); bundle size (LOW). Land FU-P2-1 and FU-P2-3 before promoting to `main`; the rest are non-blocking.

See `FOLLOW_UPS.md` (Phase 2 section) for the itemized list with fixes.
