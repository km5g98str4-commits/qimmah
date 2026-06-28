# Qimmah V2 — Post-Merge Bug Hunt

**Date:** 2026-06-28
**Branch analyzed:** `research/v2-post-merge-bug-hunt` (off `feature/v2-product-cleanup-settings`)
**Scope:** Static analysis only — **no source files were modified.**
**Build:** ✅ `npm run build` passes · **Lint:** ✅ `npm run lint` passes (0 warnings)

> Goal: surface likely bugs **before** production testing. Severities are calibrated to real
> user impact in this **frontend-only** template (no backend wired by default; Supabase is optional).
> Each finding below was code-verified, not assumed. Where a subagent claim was overstated it has been
> down-graded and the reasoning noted.

---

## Severity legend
- **P0** — Will break a shipped feature / silent data loss / security. Fix before release.
- **P1** — High-impact bug under realistic conditions (crash, integrity, trust). Fix soon.
- **P2** — Quality / edge-case / maintainability / confusion risk. Schedule.

---

## Top 10 risks (summary)

| # | Severity | Area | Finding | Key file(s) |
|---|----------|------|---------|-------------|
| 1 | **P0** | Export/Import + Sync | Workout sessions & exercise/PR history are **written** to `*:v1` keys but **exported/synced** from `*:history:*:v1` keys → backups silently omit workouts; import can't restore them | `finishWorkout.ts`, `historyStore.ts`, `syncService.ts` |
| 2 | **P1** | Onboarding state | Clickable step chips bypass per-step `validate()` → onboarding can be marked **completed with empty `userName`** | `CustomizationCenter.tsx`, `onboarding.ts` |
| 3 | **P1** | Reset behavior | `resetQimmah()` omits `qimmah:reminders:v1` and `qimmah:sync:meta:v1` → "full reset" leaves stale state | `resetQimmah.ts` |
| 4 | **P1** | Cloud sync null guards | `syncService` casts cloud rows with `as` and no shape check → `.map()` on `null` crashes when Supabase is configured | `syncService.ts` |
| 5 | **P1** | Day rollover | `getDayStamp()` is local-timezone based → travel/DST can flip the day and drop the in-progress day's "today" tracking | `today.ts` |
| 6 | **P2** | Duplicate storage | Legacy `customization.{workouts,meals,supplements,metrics,routine}` arrays still seeded & shown in `PreviewSummary` (e.g. "مكملات: 5" while real plan is empty) | `customization.ts`, `PreviewSummary.tsx` |
| 7 | **P2** | Migration integrity | One-time migration overwrites `updatedAt` with "now" and swallows all errors silently | `historyStore.ts` |
| 8 | **P2** | Route guard | `#/settings`, `#/privacy`, `#/terms` are unguarded pre-onboarding; `onBack` uses `window.history.back()` (breaks on deep-link) | `App.tsx` |
| 9 | **P2** | Dead code | ~24 orphaned files (v1 landing sections + v1 customizer steps) with no imports — confuse future agents | see §15 |
| 10 | **P2** | Dead language path | A full unreachable English (`en`) string set exists while `LANG` is hardcoded `'ar'` → looks like EN is supported when it is not | `strings.ts`, `App.tsx` |

---

## 1. LocalStorage keys & migrations

The app uses **two parallel key namespaces**:

**Live / per-day keys**
- `qimmah:customization:v1` (customization.ts)
- `qimmah:onboarding:v1` (onboarding.ts)
- `qimmah:prefs:v1` (appPreferences.ts)
- `qimmah:today:v1` (today.ts)
- `qimmah:nutritionToday:v1` (nutritionTracking.ts)
- `qimmah:wellnessToday:v1` (wellnessTracking.ts)
- `qimmah:commitmentsToday:v1` (commitmentTracking.ts)
- `qimmah:measurementLogs:v1` (measurementLog.ts)
- `qimmah:workoutSessions:v1` (workoutSessions.ts)
- `qimmah:exerciseHistory:v1` (exerciseHistory.ts)
- `qimmah:reminders:v1` (reminderPrefs.ts)
- `qimmah:supabase-auth:v1` (authContext)
- `qimmah:sync:meta:v1` (syncService.ts)

**Permanent "history" store** (`historyStore.ts`)
- `qimmah:history:{workoutSessions,exerciseHistory,dailyLogs,measurementLogs,nutritionLogs,waterLogs,supplementLogs,medicationLogs}:v1`
- `qimmah:history:migrated:v1` (one-time migration flag)

Migration (`ensureMigrated`, `historyStore.ts:335`) copies the legacy live keys into the history
namespace **once** (guarded by both an in-memory `migrationRan` flag and the persistent
`qimmah:history:migrated:v1`). This is the root cause of Finding **#1** below.

> **PASS:** keys are consistently versioned (`:v1`) and reads are try/catch-guarded.
> **RISK:** the two namespaces are not kept in sync for all data types (see #1).

---

## Finding 1 — **P0**: Workout/exercise history write vs export/sync key mismatch (silent data loss)

**Files:** `src/lib/finishWorkout.ts:8-16`, `src/lib/workoutSessions.ts:63`, `src/lib/exerciseHistory.ts`, `src/lib/historyStore.ts:298-326`, `src/lib/syncService.ts:123,211,232`

**What's happening (verified):**
- `persistFinishedSession()` writes finished workouts via `addSession()` → `qimmah:workoutSessions:v1` (OLD), and exercise PRs via `saveHistory()` → `qimmah:exerciseHistory:v1` (OLD).
- All **display** paths (`progressStats.ts`, `RecentWorkout.tsx`, `WorkoutView.tsx`, `Today.tsx`) read those **OLD** keys → screen output is correct.
- `exportHistory()` (`historyStore.ts:298`) reads `getWorkoutSessions()` / `getExerciseHistory()` → **NEW** `qimmah:history:*` keys. `importHistory()` writes to NEW keys. `syncService` pulls/pushes NEW keys.
- The NEW keys are populated **only** by the one-time migration or a cloud pull. **Every workout finished after the first migration lives only in OLD keys.**

**Important scoping correction:** the other data types are *not* affected — `today.ts`, `commitmentTracking.ts`, `wellnessTracking.ts`, `nutritionTracking.ts`, and `measurementLog.ts` all **also** write to the history store (`saveDailyLog`, `saveNutritionLog`, `saveWaterLog`, `saveSupplement/MedicationLog`, `saveMeasurementLog`). Only **workout sessions** and **exercise history** are OLD-only writers.

**Why it matters:**
- **Export** ("تصدير نسخة احتياطية" in Settings) produces a backup that is missing the user's actual workouts and PRs.
- **Import** restores workouts to NEW keys, which the UI never reads → imported workouts are invisible.
- **Cloud sync** uploads/downloads NEW keys → workouts never round-trip across devices.
- This is a trust-critical failure of a shipped Settings feature, hence **P0** despite no crash.

**Reproduction:**
1. Clear localStorage, complete onboarding, finish a workout.
2. DevTools → Application → Local Storage: data is in `qimmah:workoutSessions:v1`, **absent** from `qimmah:history:workoutSessions:v1`.
3. Settings → Export → open the JSON → `workoutSessions: []` (or only pre-migration data).
4. Reset, then Import the file → ProgressView shows no workouts/PRs.

**Suggested fix (do not apply here):**
- Make `persistFinishedSession()` write through the history store (`saveWorkoutSession` + `saveExerciseHistory`), **or** make `getWorkoutSessions()/getExerciseHistory()` read-merge OLD+NEW keys (dedupe by id) so export/sync see everything. Long term, collapse to a single source of truth.

---

## 2. Duplicate storage sources

**Finding 6 — P2:** Legacy v1 arrays `customization.workouts / meals / supplements / metrics / routine`
(seeded in `customization.ts:148-178` from `@/data/*`) still exist alongside the v2 plan objects
(`workoutPlan`, `nutritionPlan`, `wellnessPlan`, `measurementPlan`).

- The real app renders the **v2 plans**; the legacy arrays are mostly dead **except** `PreviewSummary`
  (`src/components/customizer/PreviewSummary.tsx:45-48`), which is rendered live during setup
  (`CustomizationCenter.tsx:231`) and counts the **legacy** arrays.
- Effect: during onboarding the preview shows e.g. **"مكملات: 5"** (from seeded `data/supplements.ts`)
  even though the real `wellnessPlan.supplements` is now **empty** after the V2 cleanup. Misleading,
  and a divergent source of truth.
- Also: Finding #1 (workout sessions) is a second duplicate-source instance.

**Fix idea:** point `PreviewSummary` at the v2 plans (like `StepReview.tsx:21-23` already does), and
delete the legacy arrays from the `Customization` model.

---

## 3. Route guards

**Finding 8 (part A) — P2:** `App.tsx:31-38` `guardRoute()` only protects `MAIN_TABS` + `exercises`.
`settings`, `privacy`, `terms` pass through unguarded, so they render before onboarding completes.
This is **not a crash** (SettingsView reads safe defaults) and `#/settings|privacy|terms` *must* work
(per the V2 requirements), so the behavior is arguably acceptable — but it is inconsistent and worth a
deliberate decision.

**PASS:** Unknown routes are handled (`App.tsx:76-82`) → redirect to `dashboard`/`start` + hash
correction. The valid-route list (`appRoutes.ts:20-34`) matches the required set.

**Watch (P2, speculative):** the `view→hash` (`App.tsx:66-68`) and `hash→view` (`71-86`) effects can
in theory ping-pong during very rapid navigation; `setHashRoute` guards against identical hashes
(`appRoutes.ts:48-51`), so this is low-risk. No reproduction found in practice.

---

## 4. Demo providers vs real providers

**PASS (verified — strong):** Demo data is isolated.
- `DemoCustomizationProvider` (`customizationContext.tsx:99`) builds an in-memory demo customization
  with `applyCustomization`/`resetCustomization` as **no-ops** → never writes `qimmah:customization:v1`.
- Tracking hooks gate writes on demo mode: `today.ts:66`, `wellnessTracking.ts:46`,
  `commitmentTracking.ts:46`, `nutritionTracking.ts:116` all early-return / use a demo cache instead of
  `localStorage`. Toggling checkboxes inside `#/demo` does **not** pollute real data.
- Demo badge present and persistent (`DemoView.tsx:42-45`).

**Finding (P2, UX only):** `DemoView` receives the **real** `navigate` (`App.tsx:147`). Clicking a main
tab inside demo runs `guardRoute`, which (if onboarding incomplete) bounces the user into the **real**
`start`/`setup` flow. No data leaks (real context, real storage), but it's a jarring exit from demo.
*Fix idea:* give demo its own nav that stays within `#/demo` or returns via `onBack`.

**Minor (P2):** `today.ts:73-90`, `wellnessTracking.ts:53-70`, `commitmentTracking.ts:52-69` attach
`focus`/`visibilitychange` listeners in a `useEffect(…, [])` with an eslint-disable while reading
`demo` from closure; `nutritionTracking.ts:156-173` correctly uses `[demo]`. Harmless today (demo flag
is stable per mount) but inconsistent.

---

## 5. Nutrition dashboard sync

**PASS (by design, verified):** `DailySummary.tsx` shows **plan targets** + a historical week summary;
`Today.tsx` shows the same targets **plus live actuals** from `useNutritionToday()`
(`Today.tsx:259-270`). The plan (fixed) and the live log (actuals) are intentionally separate, and both
read the same sources. No divergence.

**Watch (P2):** `DailySummary` does not surface today's *consumed* calories/protein next to the target,
only the target — users may read the dashboard number as "remaining/consumed". Cosmetic clarity issue,
not a sync bug.

---

## 6. Workout history sync

Covered by **Finding #1 (P0)**. Additional sync-layer issues:

**Finding 7 — P2 (migration integrity):** `historyStore.ts` migration (`ensureMigrated`, ~`335-441`):
- Overwrites `updatedAt` of migrated daily logs with "now" instead of the original timestamp → breaks
  `updated_at`-based conflict resolution in `syncService` (old data can win/lose incorrectly).
- Wraps the whole migration in `try { … } catch {}` with **no logging** → a mid-migration failure
  (e.g. quota) silently leaves a partial NEW store and still sets the "migrated" flag on the next run.
- Per-session disk read+write inside a loop (O(n) I/O) — slow and more failure-prone for large histories.

---

## 7. Onboarding completion state

**Finding 2 — P1:** `CustomizationCenter.tsx`:
- Step chips (`:198-214`) call `onClick={() => setStep(i)}` with **no validation** — a user can jump
  straight to **Review** without passing intermediate `validate()` gates (which only block the *Next*
  button at `:150-152`).
- `saveAndClose()` (`:145-149`) → `markCompleted(step)` (`onboarding.ts:38-46`) sets `completed: true`
  **unconditionally**, with no check that `data` is valid.
- Result: onboarding can be completed with an **empty `identity.userName`** (and, in principle, other
  unfilled fields). Impact is bounded because `profile` starts from a valid `defaultProfile`, so the
  worst observed effect is an empty greeting / blank name in the dashboard — not a crash. Rated **P1**
  because the completion gate is a correctness/trust contract the rest of the app relies on.

**Reproduction:** Setup → step 1, leave name empty → click the "المراجعة" chip → Finish → dashboard
shows an empty user name; `qimmah:onboarding:v1` = `{completed:true}`.

**Fix idea:** validate the full `Customization` in `saveAndClose()` (reuse step validators), and/or
disable forward chips while the current step is invalid.

---

## 8. reset / export / import behavior

**Finding 3 — P1 (reset is incomplete):** `resetQimmah.ts:3-24` `QIMMAH_KEYS` is missing:
- `qimmah:reminders:v1` → reminder prefs survive a "full reset".
- `qimmah:sync:meta:v1` → stale sync metadata survives (can mislead the next sync).
- `qimmah:supabase-auth:v1` → **intentional?** (reset = wipe data, not log out). Decide explicitly; if a
  full reset should also sign out, add it.

Since the reset confirmation copy promises to delete **"كل بيانات قِمّة"**, leaving keys behind breaks
that promise → **P1 (trust)**.

**Export/Import:** see **Finding #1 (P0)** for the workout/exercise gap.

**Finding (P2):** `importHistory` (`historyStore.ts:312-326`) and most JSON readers silently **skip**
malformed fields (`if (Array.isArray(...)) …` with no `else`). A partially corrupt backup imports
"successfully" while dropping fields, with the alert still showing "تم استيراد نسختك بنجاح." Consider
returning/reporting which sections were skipped.

---

## 9. Settings route behavior

**Finding 8 (part B) — P2:** `PrivacyView`/`TermsView` use `onBack={() => window.history.back()}`
(`App.tsx:135,139`). If the user deep-links to `#/privacy` (bookmark/shared link) with no in-app
history, Back may exit the app or do nothing. Other Settings nav uses explicit `setView`, which is
robust. *Fix idea:* track a `returnTo` route instead of relying on browser history.

Otherwise Settings is well-formed: account, data (export/import/reset), plan (edit/regenerate),
privacy/terms, language status, health disclaimer all present and wired.

---

## 10. Mobile overflow risks

**Mostly PASS (verified):** `Today.tsx`/`DailySummary.tsx` use `min-w-0 flex-1`, `truncate`, responsive
grids, and full-width-on-mobile widths — no horizontal-scroll smells found.

**Finding (P2, maintainability):** `MobileShell.tsx` bottom nav uses a hardcoded `grid-cols-5` tied to a
static 5-tab array. Adding/removing a tab silently breaks the layout (Tailwind class won't auto-update).
*Fix idea:* `style={{ gridTemplateColumns: \`repeat(${tabs.length},1fr)\` }}` or a safelisted dynamic class.

---

## 11. Missing null guards

- **PASS:** all per-day trackers (`today.ts`, `nutritionTracking.ts`, `wellnessTracking.ts`,
  `commitmentTracking.ts`, `measurementLog.ts`, `reminderPrefs.ts`) wrap `JSON.parse` in try/catch with
  shape checks.
- **Finding 4 — P1:** `syncService.ts` casts **cloud** rows with `as` and minimal validation
  (`:210`, `:224`, `:245-250`, `:263-270`). A malformed cloud row (e.g. `exercises: null`) is written
  locally, then a later `session.exercises.map(...)` throws. Only reachable when Supabase is configured,
  but a crash-class bug there → **P1**. *Fix:* add `isWorkoutSession`/`isMeasurementLog` type guards
  before persisting cloud data.
- **Finding (P2):** live readers use `JSON.parse(raw) as Partial<…>` casts without per-field validation;
  corrupt localStorage could load a structurally-invalid object. Low likelihood.

---

## 12. Hardcoded fake user data

**PASS (verified) for the real flow:**
- No `زياد العبدالله`. The only seeded name is the **demo-only** `أحمد محمد`
  (`customizationContext.tsx:60-61`, inside `DemoCustomizationProvider`) plus a clearly-labeled demo
  medication — never written to real storage.
- `getDefaultCustomization()` ships empty `identity.userName`/`mainGoal`; wellness lists are empty.
- Setup inputs use **placeholders** ("مثال: زياد") not prefilled values (`StepWelcome.tsx:29`,
  `StepBasics.tsx:22`), and goal suggestions are an opt-in chip list (`StepGoal.tsx:5-9`).

**Note (P2):** the seeded legacy arrays (`data/supplements.ts` = 5 items, `data/meals.ts`, etc.) still
feed `PreviewSummary` counts during setup (see Finding #6) — the closest thing to "fake data" still
visible to a real user, though only as numeric counts.

---

## 13. Incomplete language switch

**PASS (verified):** `LANG` is hardcoded `'ar'` (`App.tsx:24-25`); no reachable UI toggles language.
Settings shows a read-only status ("العربية — مفعّلة" / "الإنجليزية قريبًا"). `applyLanguage` correctly
sets `dir`.

**Finding 10 — P2 (confusion / dead path):** `strings.ts` carries a **complete, unreachable English
string set** and components still branch on `lang === 'en'` throughout. Because `en` is never selected,
this is dead-but-live code that will mislead future agents into thinking EN is supported (and the EN copy
will silently rot). Consider gating it behind a clearly-marked `ENABLE_EN` flag or removing until ready.

---

## 14. Apple Health / steps false claims

**PASS (verified):**
- Health sync copy is honest: "قريبًا: Apple Health و Google Fit" + "حاليًا تقدر تتابع تمرينك وتغذيتك
  داخل قِمّة" (`strings.ts:623-625`), rendered as an explicit placeholder ("نائب صادق",
  `ProgressView.tsx:121`). No claim that data is connected.
- The `steps` measurement (`measurementTypes.ts`) is a **manual** log entry, not an auto-synced counter
  — no false "connected steps" claim.
- Progress photos were removed in the V2 cleanup (no photo card/type remains).

**Watch (P2):** account strings claim "بياناتك تُزامَن مع حسابك السحابي" (`strings.ts:356-357`). Given
Findings #1/#4, cloud sync is partially broken for workouts — keep this copy honest until sync is fixed.

---

## 15. Dead code likely to confuse future agents

**Finding 9 — P2:** 24 files have **no static imports anywhere** (verified by import-path grep). These
are the v1 marketing landing + v1 customizer steps, superseded by the v2 view/wizard. There is no
landing page in the app, so the entire marketing set is dead.

```
src/sections/Hero.tsx            src/sections/Pricing.tsx        src/sections/Faq.tsx
src/sections/Problem.tsx         src/sections/Solution.tsx       src/sections/Benefits.tsx
src/sections/Audience.tsx        src/sections/FinalCta.tsx       src/sections/Meals.tsx
src/sections/Supplements.tsx     src/sections/BodyMetrics.tsx    src/sections/Dashboard.tsx
src/sections/Customization.tsx   src/sections/CommitmentKeys.tsx src/sections/WorkoutTracker.tsx
src/components/Header.tsx         src/components/WorkoutSummary.tsx
src/components/customizer/steps/StepBasics.tsx   StepGoal.tsx    StepLook.tsx
   StepMeals.tsx   StepMetrics.tsx   StepSchedule.tsx   StepSupplements.tsx   StepWorkouts.tsx
```

Also: `exerciseHistory.ts` exports a legacy `recordWeight()` with no callers.

These compile cleanly (so they pass build/lint) but inflate the surface and will mislead agents into
editing the wrong "Dashboard"/"Supplements"/"StepSupplements". *Fix idea:* delete after a quick
double-check, or move under `src/_legacy/` excluded from the build.

> ⚠️ Verify before deleting — confirm none are referenced via non-standard/dynamic paths first.

---

## Appendix — verification commands used

```bash
# storage keys
grep -rohn "'qimmah:[^']*'" src/ | sort -u
# reset coverage gap
grep -oh "'qimmah:[^']*'" src/lib/*.ts | sort -u | sed "s/'//g" \
  | while read k; do grep -q "'$k'" src/lib/resetQimmah.ts || echo "missing: $k"; done
# OLD vs NEW workout writers/readers
grep -rn "loadSessions\|loadHistory\|getWorkoutSessions\|getExerciseHistory" src/
# orphan files (no import of their path)
for f in $(find src/sections src/components -name '*.tsx'); do b=$(basename "$f" .tsx); \
  [ "$(grep -rl "/$b'" src --include='*.tsx' --include='*.ts' | grep -v "^$f$" | wc -l)" = "0" ] && echo "$f"; done
```

*End of report.*
