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

---

# §P14 — iOS native hardening: the UI wiring Codex must land

Added by wave **P14** (`claude/p14-ios-native-hardening`, base `60ea9d9`). Same rule as
above: I may not touch `src/views/*`, `src/components/*`, `App.tsx`, styles or the
design-system, so everything below is a lib-level API that is **already built, tested (93
checks) and shipping dormant** — it needs call sites.

Full audit: `docs/audit/P14-NATIVE-HARDENING.md`. Device checklist:
`docs/audit/DEVICE-NOT-VERIFIED.md`.

## P14-0 · The headline: two P5 features are dead code in the app

```
grep -rn "scheduleRestEndNotification\|cancelRestEndNotification\|classifyRestoredSession" src/
```
→ **zero call sites** outside `src/lib/**` and the proofs.

Consequences shipping today:
- **No rest-end notification has ever fired.** Rest ends silently while the phone is in a
  pocket.
- **A session abandoned for days resumes as "in progress"** with a live elapsed timer,
  because `WorkoutV2.tsx:257-283` restores on `isUsableSession` alone.

Both are 100% view-layer wiring. Nothing in the lib needs to change.

## P14-A · Rest-end notification — 4 call sites in `WorkoutV2.tsx`

Single import surface (everything re-exported from the engine):

```ts
import {
  scheduleRestEndNotification,
  releaseRestEndForSession,
  reconcileWorkoutColdStart,
} from '@/lib/workoutSessionEngine'
```

| UI event | Existing code | Call to add |
|---|---|---|
| rest starts (a set is logged) | `WorkoutV2.tsx:570` sets `rest: { endsAt: Date.now() + REST_DEFAULT*1000, … }` | `void scheduleRestEndNotification(endsAt, lang, Date.now(), { ownerId: userId })` |
| «+١٥ ثانية» | `:576` `addRest` bumps `endsAt` | same call with the **new** `endsAt` — replacement is built in, do **not** cancel first |
| rest skipped **or** completed in the foreground | wherever `rest` is cleared | `void releaseRestEndForSession(userId)` |
| session finished / discarded (Rule D confirm, and the discard confirm at `:confirmDiscard`) | `:417` `persistFinishedSession(session)` and the discard path | `void releaseRestEndForSession(userId)` |

Rules:
- `ownerId` **must** be the same `userId` used for `ownerActiveKey` — the pending trace is
  owner-scoped (`qimmah:restEndPending:v1:<owner>`), and passing `undefined` writes to the
  `guest` slot and breaks the two-accounts-one-device case.
- Never `await` these in a render path; all of them are no-throw and return a status.
- On web they return `'unsupported'` and do nothing — no platform check needed at the call
  site.
- Results you may surface: `'scheduled' | 'unsupported' | 'denied' | 'skipped' | 'error'`.
  **`'denied'` here means notification permission** (a real, knowable OS state) — unrelated
  to the HealthKit honesty rule in P14-C.

## P14-B · Cold-start reconciliation — replace the restore effect

Today `WorkoutV2.tsx:257-283` does: read key → `isUsableSession` → resume, else
`localStorage.removeItem`. It has no abandoned classification, no notification cleanup, and
it cannot tell "corrupt JSON" from "you had 6 completed sets under a plan that changed".

Replace the body of that effect with one call:

```ts
useEffect(() => {
  let alive = true
  void reconcileWorkoutColdStart({
    ownerId: userId,
    exerciseIds: model.exercises.map((e) => e.id),   // slot ids, same order as the plan
  }).then((rec) => {
    if (!alive) return
    const d = rec.decision
    switch (d.action) {
      case 'resume':
        setActive(d.session as ActiveState)
        setNow(Date.now())
        setScreen('active')
        // d.restState: 'running' | 'elapsed' | 'none'; d.restRemainingSec already recomputed
        break
      case 'abandoned':
        // Rule D: show a sheet — «تمرين قديم من <ageMs>» with Save / Discard.
        // Save  → addSession(abandonedSessionFrom(d.session, model, { date, nowMs }))
        //         but ONLY if !rec.alreadySaved  ← no double save
        // Either → clearPersistedActiveWorkout(userId) after the user decides
        break
      case 'discard':
        if (d.discardReason === 'plan-changed' && d.completedSets > 0) {
          // WARN FIRST — d.completedSets real sets are about to be dropped.
          // The lib deliberately did NOT delete the key; you own the deletion.
        } else {
          // 'malformed' → the lib already cleared the key (rec.clearedKey === true)
        }
        setScreen('plan')
        break
      case 'none':
        break
    }
  })
  return () => { alive = false }
}, [model.exercises, userId])
```

What the call already did for you before resolving:
- reconciled the pending rest notification — `rec.restEnd.action` is one of
  `kept | cleared-stale | cleared-orphan | none | unsupported`. `cleared-stale` also pulled
  the notification out of Notification Center via `removeDeliveredNotifications`.
- cleared the storage key **only** for `malformed` (`rec.clearedKey`).
- computed `rec.alreadySaved` from `session-v2-<startedAt>` so a restore-then-finish (or a
  double abandoned-save) cannot create a duplicate session.

**Also:** delete `isUsableSession` from `WorkoutV2.tsx:133-169` and use
`isUsableActiveWorkout(value, exerciseIds)` from the engine. They are currently byte-level
twins and **will** drift. The safety-net effect at `:287` should use the lib version too.

Threshold: `ABANDONED_AFTER_MS` = 8h, overridable per call via `thresholdMs` (used by the
proof; do not override in the app without an owner decision).

## P14-C · HealthKit honesty — one explicit branch, plus a copy key

`src/components/NativeSettingsPanel.tsx` needs a small correction. Data-layer facts that
changed under it:

- `HealthKitPermission` gained `'unknown'`. **The bridge no longer emits `'denied'` at
  all** — HealthKit never reveals a read denial, so any "you refused" claim is a lie
  (`P14-NATIVE-HARDENING.md` FIXED-H1). `'denied'` survives in the union only so
  already-persisted legacy values still parse.
- `NATIVE_SETTINGS_COPY[lang]` gained **`unknown`**, and the existing `denied` string was
  rewritten so it no longer claims refusal in either language.

| Line | Today | Should be |
|---|---|---|
| `NativeSettingsPanel.tsx:194` | `stepsPerm === 'authorized' ? copy.connected : stepsPerm === 'unavailable' ? copy.unavailable : copy.denied` | same shape but use `copy.unknown` for the fallback — honest either way now, but the key name should stop lying |
| `:237` | `weightPerm === 'denied' && <p>{copy.denied}</p>` | `(weightPerm === 'unknown' \|\| weightPerm === 'denied') && <p>{copy.unknown}</p>` — **today `'unknown'` renders nothing at all**, so a failed weight read is silent |
| `:104`, `:134` | `setStepsPerm('denied')` / `setWeightPerm('denied')` in the catch | `'unknown'` — a thrown bridge call is not a user denial |

Hard rule for any Health UI, existing or new: **no string may say «رفضت الوصول» / «ما
انعطى الإذن» / "Permission wasn't given"**. The only honest states are
`not-connected` / `has-data` / `unknown-or-denied` (wide layer, `metricDataState`) and
`authorized` / `unknown` / `unavailable` (legacy bridge). A proof check now fails if the
denial phrasing reappears in `nativeSettings.ts`.

## P14-D · Diagnostics available to any device-report UI (optional)

Both are read-only, metadata-only, and already on `window` for Safari Web Inspector. If you
ever want an in-app "device report" screen, these are the sources — **never render a health
value from them; they don't carry any**:

```ts
import { healthDiagnosticsReport, healthDiagnosticsText } from '@/lib/health/connect'
import { getScanDiagnostics, scanDiagnosticsSummary } from '@/features/barcode/scanDiagnostics'
```

Health rows: `{metric, requested, enabled, hasData, lastQueryMs, lastStatus, sampleCount,
lastPages, unitUsed, source}`.
Scan rows now also carry `path: 'native' | 'web'` and `torch: boolean`.

## P14-E · Owner decision, not a Codex task

`reconcileNotificationSchedule` → `cancelKnown()` cancels **all** Qimmah notification ids,
id 3600 included, on every reconciliation. So changing a notification setting during a live
rest silently kills that rest's notification. P5 justified this as "no orphan
notifications"; P14-N2 now handles orphans properly at cold start, so excluding `restEnd`
from `cancelKnown` would be strictly better — but it changes account-switch behavior and
needs the owner's call.
