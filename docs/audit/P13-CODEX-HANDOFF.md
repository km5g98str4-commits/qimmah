# P13 → Codex handoff: UI items found by the final integration gate

Everything below was found while auditing `claude/final-integration-gate-v1` (`bbdad4c` + fixes) and was **deliberately not fixed**, because the P13 mandate forbids touching `src/views/*`, `MobileShell.tsx`, `App.tsx`, styles and the design-system.

Line numbers are against `claude/final-integration-gate-v1`. Paths are absolute-from-repo-root.

---

## A. The 9 known dead / misleading controls — re-verified status

Cross-checked against Appendix I.10 of `docs/audit/APP-STRUCTURE-DEEP-AUDIT.md` (branch `audit/app-structure-deep`). **6 still broken · 1 partially improved · 1 genuinely fixed (with a new small bug) · net: still Codex's queue.**

### A-1 · Account/guest badge — STILL DEAD
`src/components/MobileShell.tsx:98-106` — a plain `<span className={cn('inline-flex items-center gap-1 rounded-full …', badgeClass)}>` holding icon + label. No `onClick`, no `role`, not focusable. The adjacent avatar `<button>` at `:108-119` is the real profile entry.
**Suggested fix:** delete the badge (the full header decision is still deferred by the owner). If it stays, it must not look pressable.

### A-2 · Center «تسجيل» tab action — STILL MISLEADING (exact duplicate)
`src/components/MobileShell.tsx:64` `{ id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.log[lg], icon: 'Plus', action: true }` sits directly next to `:65` `{ id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.nutrition[lg] … }`. Both flow through the same handler at `:161` `onClick={() => onNavigate(tb.route)}` — same route, no slot, no param, no deep link.
**Extra defect found:** both entries share `id: 'nutrition'`, so the React `key={tb.id}` is duplicated **and** `active` highlights on either tab.
**Suggested fix:** make the center action open the add-meal sheet directly (a distinct route/param or a sheet state), and give it a unique `id`.

### A-3 · «أضف يدويًا» in the barcode scanner — STILL A DEAD END
`src/views/NutritionV2.tsx:461` `onManualFallback={() => setScanning(false)}` is **byte-identical** to `onClose={() => setScanning(false)}` on `:462`. Fired from `src/features/barcode/ScanFoodPanel.tsx:154` and `:174` (not-found and failure states).
Mitigation that exists: dismissing reveals the food search input already on screen (`NutritionV2.tsx:419-426`) with `FoodRow`/`logFood` at `:450` — so a manual path exists *underneath*, but there is no focus transfer to it, no manual macro-entry form, and nothing distinguishes the button from ✕.
**Suggested fix:** minimum — `onManualFallback` should close the scanner **and** focus the search input. Proper — open a manual macro-entry form (label/kcal/protein/carbs/fat), since the label promises one.

### A-4 · «الأدوية والمكمّلات» — STILL MISLEADING (decoy)
`src/views/ProfileV2.tsx:106` `<Row icon="Pill" label={t('الأدوية والمكمّلات', 'Supplements & meds')} onClick={() => onNavigate('settings')} />`. Target is `src/views/SettingsView.tsx` (mounted at `src/App.tsx:362-373`), whose groups are Account/Data/Plan/Reminders/Native/Privacy/Dev/Language/About (`:148-359`). `grep -E 'مكمّل|supplement|دواء'` in that file → **0 hits**. The only supplement surfaces are `NotificationsSettingsV2.tsx:267` (a reminder toggle) and `src/sections/Supplements.tsx` (customizer), neither reachable from this row.
**Suggested fix:** remove the row, or route it to a real supplements/meds screen.

### A-5 · «القياسات والصور» — PARTIALLY WIRED ("photos" is fiction)
`src/views/ProfileV2.tsx:105` `onClick={() => onNavigate('progress')}`. Measurements are real but **two hops deeper**: `src/views/ProgressV2.tsx:63` (`screen === 'log'`) → form at `:199-222` → `addLog({ id, date: getDayStamp(), values })` at `:193`, reachable only via progress → weight tile (`:131`) → `onLog={() => setScreen('log')}` (`:61`). Photos: no capture/gallery UI anywhere in `src`; the only `photo` token is an unused enum member at `src/types/progress.ts:44`.
**Suggested fix:** rename the row to «القياسات» and deep-link it straight to the log screen, or build photos.

### A-6 · «مشاركة بيانات الصحة» — FIXED as a decoy, but now prints its subtitle twice
`src/views/ProfileV2.tsx:186` `<InfoRow icon="Activity" title={t('مشاركة بيانات الصحة','Health sharing')} sub={t('غير مربوطة بعد','Not connected yet')} disabled />` — no `onClick`, so `InfoRow` renders a `<div>` (`:539` `const Comp = onClick ? 'button' : 'div'`), with no switch element at all. **This one is genuinely honest now.**
**New bug:** with `disabled` set and no `subNote`/`state`, the string renders **twice** — at `:542` (`{subNote ?? sub}`) and again at `:544` (`{disabled && <span…>{subNote ? '' : sub}</span>}`). The row reads «غير مربوطة بعد … غير مربوطة بعد».
**Suggested fix:** in `InfoRow`, only render the `:544` span when `subNote` is set, or drop `sub` from it.

### A-7 · Settings «عام» rows (language / units / numerals) — STILL DEAD
`src/views/ProfileV2.tsx:207-209` — all three pass `state=""` and **no** `onClick`, e.g. `<InfoRow icon="Globe" title={t('اللغة','Language')} sub={model.settings.language} state="" />`. Via `:539` each is a non-interactive `<div>` without even the `v2-pressable`/hover class. Contrast the siblings that *are* wired: `:211` Reminders `onClick={onNotifications}`, `:220` Privacy, `:224` Data, and the working `ThemeControl` at `:205`. Language is only actually changeable from `MobileShell.tsx:107` `<LanguageToggle variant="compact" />`.
**Suggested fix:** wire language to the same setter the header toggle uses; wire units + numerals to real preferences, or render them as plainly non-interactive info (no row affordance).

### A-8 · ProgressV2 lift rows + PR log — STILL DEAD
`LiftRow` root at `src/views/ProgressV2.tsx:415` is a `<div>`; no `onClick` anywhere in `:402-441`; the ladder and `E1rmSparkline` are `role="img"`. PR-log rows at `:477` are also handler-less `<div>`s (`:461-486`). No per-lift detail screen exists — `ProgressScreen` is only home/weight/strength/log (`:61-63`).
**Suggested fix:** either add a lift-detail screen, or stop styling these as cards that invite a tap.

### A-9 · TodayV2 pillars — STILL DEAD for 3 of 4
`src/views/TodayV2.tsx:93-107`. Recovery only is pressable: `:97` `<button type="button" onClick={() => onNavigate('recovery')} className="press flex flex-col items-center gap-2" …>`. The `else` branch at `:102-106` renders تدريب / تغذية / حركة as `<li className="flex flex-col items-center gap-2"><PillarRing …/><span …>{…}</span></li>` with no handler; `PillarRing` itself returns only `<span role="img">` (`:170`, `:178`, `:203`).
**Suggested fix:** each pillar becomes a `<button>` → تدريب → `workout`, تغذية → `nutrition`, حركة → `progress`. They already look identical to the pressable recovery ring, which is exactly why this misleads.

---

## B. English-mode Arabic leakage (dimension 3 of the gate — 12 items)

No-op ternaries (`lang === 'ar' ? x : x`) → **0 found**, good. But 12 real leaks remain.

### B-1 · View-layer leaks — bilingual data already exists, the JSX ignores it (7)

| # | Location | Leak | Fix |
|---|---|---|---|
| 1 | `src/components/ExerciseMedia.tsx:168` and `:191` (import `:8`) | `muscleLabelAr(m)` on muscle chips — the known ExerciseMedia leak | `muscleGroupLabel(id, lang)` already exists at `src/data/muscleGroups.ts:58`. Component has no `lang` prop (signature `:85`) → thread `lang` in, then swap. |
| 2 | `src/components/MuscleMap.tsx:130` | same `muscleLabelAr(m)` | cheaper — `lang` is already in scope as a `GroupCard` prop (`:92`). |
| 3 | `src/views/NutritionV2.tsx:309` | `{…} / {f.servingLabelAr}` rendered inside a `t(ar, en)` line — the known `servingLabelAr` leak | `servingLabelEn` exists (`src/types/nutrition.ts:21`) and `servingSummary(item, lang, unit)` exists (`src/lib/servingDisplay.ts:69`, correctly branched). Only this JSX is raw. |
| 4 | `src/views/ExerciseLibraryView.tsx:215` | `{group.titleEn} · {group.titleAr}` appends Arabic unconditionally | branch on `lang`. |
| 5 | `src/components/customizer/steps/StepWorkoutTemplate.tsx:126` | `tpl.descriptionAr` | `descriptionEn` exists in `src/data/workoutTemplates.ts`. |
| 6 | `src/components/customizer/steps/StepGeneratePlan.tsx:102`, `:121`; `StepNutrition.tsx:177` | raw `nameAr` | `nameEn` exists. |
| 7 | `src/views/WorkoutV2.tsx:897` (`aria-label="إخفاء النصيحة"`); `src/components/coaching/TodayLearnCard.tsx:48` (`تعلّم`) | hardcoded Arabic literals in JSX | wrap in `t(ar, en)`. |

### B-2 · Data/lib gaps — no English field exists at all, so no view branch can fix them (5)

These need English **content authored** — a content wave, not a code fix. I did not invent translations.

| # | Location | Missing | Leaks at |
|---|---|---|---|
| 8 | `src/lib/coaching/types.ts:32` + every entry in `src/data/coaching/restTips.ts` | only `textAr`; needs `textEn` | `src/views/WorkoutV2.tsx:896` |
| 9 | `src/data/coaching/lessons.ts` | only `titleAr`/`bodyAr`/`takeawayAr`; no `*En` anywhere | `src/components/coaching/TodayLearnCard.tsx:49, 57, 60` |
| 10 | `src/lib/portability/registry.ts:59` (`StoreDef.labelAr`, builders `:80`, `:89`); Arabic-only errors at `src/lib/portability/importer.ts:53, 129, 263` and `format.ts:41` | needs `StoreDef.labelEn` + bilingual errors | `src/views/ProfileV2.tsx:316`, `src/components/DataManagementPanel.tsx:132` |
| 11 | `src/lib/exerciseGuidance.ts:106, 113, 119` | function has **no `lang` parameter at all**; returns `techniqueTipsAr`/`commonMistakesAr`/`safetyNotesAr` | every consumer |
| 12 | `src/data/exercises.ts` `targetMuscleAr`/`subGroupAr` | no EN counterparts — **latent only**, `ExerciseLibraryView.tsx:235-241` currently guards it (falls back to `detailedMuscleLabel`, hides `subGroupAr` when `lang === 'en'`) | not a leak today |

Correctly guarded, for contrast — copy these patterns: `MedicationLibraryPicker.tsx:82-84`, `SupplementLibraryPicker.tsx:68-72`, `RecoveryView.tsx:126-129/146-147`, `TodayV2.tsx:99, 105, 163`, `WorkoutV2.tsx:922`, `IngredientPicker.tsx:76`.

### B-3 · The existing guard is far too narrow

`scripts/polish1-proof.ts` (runner `scripts/run-polish1-proof.mjs`, 35 lines) is the **only** EN-leak proof.

- **Covers:** `equipmentLabel()` ar/en incl. unknown-id fallback (`:7-11`); `muscleLabel('chest', ar|en)` — one muscle (`:14-15`); all 5 `V2_TAB_LABELS` ar+en (`:18-27`); an Arabic regex `/[؀-ۿ]/` applied to **only the 5 `V2_TAB_LABELS[*].en` values** (`:30`).
- **Misses:** all 12 items above. It never touches `muscleLabelAr` call sites, asserts nothing about `.tsx`, and cannot test items 8-11 by construction (those types have no `.en`). There is also no reverse guard for English leaking into AR mode.
- **Recommended proof:** a repo-wide scan asserting no `*Ar` field is rendered in JSX without a `lang` branch, plus a rendered-string Arabic-regex check over EN-mode snapshots.

---

## C. Non-UI follow-ups worth queueing (not fixed here)

1. **Chain browser E2E into `test:gate` or CI.** P13's only real merge regression (4 broken onboarding checks) was invisible to a fully green `test:gate` because `test:e2e:*` is not in the chain. This is the single highest-value follow-up from this wave.
2. **Stop duplicating copy literals in E2E.** `scripts/e2e-onboarding.mjs` re-types strings that live in `src/design-system/v2/labels.ts`. Import `V2_ONBOARDING.ar.*` instead so a copy change updates both sides at once.
3. **Perf budget is red on 3/3** (entry 113.0KB/80KB · boot 168.7KB/140KB · largest lazy 162.5KB/130KB). Only the largest-lazy was previously accepted as deferred (structure-audit D6: `workoutV2Model.ts:10-11` and `coaching/cues.ts:6` pull `exercises` + the 201KB `exerciseCues.generated` statically). The entry and boot overruns are unflagged debt. The lazy-by-id precedent already exists at `onboardingProfile.ts:286`.
4. **`npm audit`: 4 vulnerabilities (1 moderate, 3 high)** reported at `npm ci`, not triaged.
5. **`DIVERGE_KCAL=4`** — 4 food items in `test:food-db` whose calories diverge from their macros. Accepted as a warning by the suite; worth a data pass.
