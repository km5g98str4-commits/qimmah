# R10 — Data Integrity & Recovery · I18n · Search · Mobile/A11y · PWA

**Scope:** read-only forensic recon.
**Repo:** `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b`
**Date:** 2026-08-18
**Harness (scratch, outside repo):** `.../scratchpad/recon/harness/recovery-proof.ts` + `run.mjs` (esbuild bundle of real repo modules, Node localStorage shim). All A-section claims below are **executed**, not read.

Severity key: **P0** = user loses data or is lied to about their data · **P1** = broken for a real user segment · **P2** = quality/consistency defect · **P3** = polish.


> ### ⚠️ Baseline drift — re-verified
> The branch moved **during** this recon: baseline `740023b` → `fa482f6` (two commits by the founder, not by me; the repo was never written to from this session). I re-verified every affected finding against the new HEAD.
>
> `fa482f6` *"الأداة والإصابة يصيران مفتاحين بنيويين لا اشتقاقًا نصّيًا"* touches **only `src/types/profile.ts`** — it adds `InjuryAreaKey` and `Profile.injuryAreas`, and widens `Equipment`. Its own message states both fields are optional and that their absence means the old behaviour literally.
>
> **No finding in this report is stale.** Specifically:
> - **B6-j is unchanged and still live** — `src/lib/planGenerator.ts:198-203` still classifies injuries by Arabic regex, and `:705`/`:1141` still call `detectInjuries(p.injuries)`. `Profile.injuryAreas` has **zero consumers**. The contract landed; the migration has not started. This finding is now *pre-solved at the type level, awaiting its consumer*.
> - **B5-a is unchanged and partly worsened** — `Exercise.equipment` is still `string[]` (`src/types/workout.ts:45`), and the newly widened `Equipment` union **still omits `rope` and `plate`**, the two ids that leak. Worth folding into that migration while it is open.

## Ranked index

| # | Finding | file:line | Sev |
|---|---|---|---|
| 1 | Onboarding success screen fires on unchecked writes; draft discarded → all inputs lost | `OnboardingV2.tsx:331,338,339` + `customization.ts:388` | **P0** |
| 2 | Corrupt/blocked customization silently becomes a fabricated 24y/86kg generic plan | `customization.ts:313-315`, `:279-280` | **P0** |
| 3 | `hasSavedCustomization()` throws uncaught `SecurityError` when storage is blocked | `customization.ts:427-429` | **P0** |
| 4 | Plan source-of-truth written with raw `localStorage` in a swallowing `catch` | `onboardingProfile.ts:172-179,189` | **P0** |
| 5 | `saveCustomization` returns `void` — write failure is structurally unreportable; syncs anyway | `customization.ts:371,388,391` | **P0** |
| 6 | Reconstruction from onboarding is exact + deterministic but wired to nothing | `onboardingProfile.ts:379` (only caller `OnboardingV2.tsx:327`) | **P0** |
| 7 | Corrupt bytes never cleaned → permanent failure; `hasSavedCustomization` reports corrupt as saved | `customization.ts:313`, `onboardingProfile.ts:122` | P1 |
| 8 | Partial corruption merged unvalidated (`age:"abc"`, `workoutPlan:42`, `heightCm:-5`) | `customization.ts:282-311`, `planDayNames.ts:131` | P1 |
| 9 | 32/44 `safeStorage` calls discard `WriteResult`; 40 raw `localStorage` writes bypass it; `onStorageFailure` has 0 subscribers | repo-wide | P1 |
| 10 | `:root .btn-primary` font override defeats `text-xs` on 27 live buttons (largest 320px overflow cause) | `tokens.css:353-357` | P1 |
| 11 | Arabic sentences used as dictionary keys; one comma edit silently breaks EN | `profileChoices.ts:59-74` ← `workoutValidation.ts:78,92,93` | P1 |
| 12 | Arabic letters `/[ثد]/` are the plan-generation time-unit sentinel | `planGenerator.ts:680` | P1 |
| 13 | Arabic weekday names key notification scheduling (already carries hamza dupes) | `notifications/planWeek.ts:4-18` | P1 |
| 14 | Water input has no label/aria/id; `ProgressBar` has no `role="progressbar"` — success never announced | `NutritionView.tsx:514-528`, `ProgressBar.tsx:13-19` | P1 |
| 15 | Home screen has no `h1` (shell renders `<button>` on the dashboard tab) | `MobileShell.tsx:209-215` vs `TodayV2.tsx:251` | P1 |
| 16 | Support email row overflows 320px unconditionally in production; BUILD_LABEL row overflows in preview | `SettingsView.tsx:309`, `:288` | P1 |
| 17 | Equipment `band`/`rope`/`plate` render raw English in AR filter chips; 5 sites bypass `equipmentLabel` | `exerciseLabels.ts:23`, `ExerciseLibraryView.tsx:205` | P1 |
| 18 | 28/181 exercises carry Arabic rep units in canonical persisted plan data | `exercises.ts` (28 rows) | P1 |
| 19 | `muscleLabelAr` used with `lang` in scope → Arabic on the EN Progress screen | `MuscleMap.tsx:130`, `ExerciseMedia.tsx:156` | P1 |
| 20 | `foodCategoryEn` written and never wired; EN nutrition search shows Arabic categories | `foodItems.ts:65`, `QuickMealLogger.tsx:331` | P1 |
| 21 | 29 live touch targets below 44px; `.tap-target` helper exists and is used 0 times | `WorkoutView.tsx:371`, +28 | P1 |
| 22 | `vercel.json` catch-all rewrite re-introduces the explicitly forbidden rule; guard is blind to it | `vercel.json:6` vs `public/_redirects:4` | P1 |
| 23 | Exercise search has zero Arabic normalization; the better normalizer exists and is shelved | `exerciseLibrary.ts:17,22`; `text/foodNormalize.ts` | P1 |
| 24 | SW purges caches before the reload → live tab requests dead chunks; no update prompt exists | `sw.js:104,112-114`, `swUpdate.ts:40-44,66` | P2 |

**Clean lanes (verified, no action):** dictionary key parity (0 ar-only across ~2,900 keys) · RTL logical properties (1 cosmetic hit, non-breaking) · build-SHA provenance (real, guarded by `build-convergence-proof.mjs`) · width discipline (`0` fixed-px widths) · no skipped heading levels.

---

## A. CORRUPT-STATE RECOVERY

### A1 — The silent generic-plan fallback (P0)

**`src/lib/customization.ts:313-315`**

```ts
    return withFreshTargets(migrateMinorGoal(merged))
  } catch {
    return base            // ← the silent fallback
  }
```

`base` is `getDefaultCustomization()` (`src/lib/customization.ts:193-240`), which contains a **fabricated body profile and a generic 3-day full-body plan**:
- `src/lib/customization.ts:208` — `profile: { ...defaultProfile }`
- `src/lib/customization.ts:211` — `workoutPlan: generatePlanFromTemplate('full-body')`
- `src/lib/customization.ts:209` — `targets: computeTargets(defaultProfile)`

**Executed proof** (harness section A1):

```
PASS  corrupt load -> userName is EMPTY ("") — user's own name lost silently
PASS  corrupt load -> plan is BYTE-IDENTICAL to the generic default
     generic fallback: goal=cutting days=4 cal=2294 age=24 weight=86
PASS  NO error, NO throw, NO flag returned
```

The fallback presents **age 24 / weight 86 kg / 2294 kcal** — numbers belonging to no one — through the same `useCustomization()` surface that renders "your plan". This is a direct breach of the charter: §5 *"لا واجهة تَعِد بما لا يحدث"* and *"لا بيانات وهمية في أي مسار إنتاجي دون وسم صريح"*.

**Three separate doors reach that same silent `base`:**

| # | file:line | Trigger | Severity |
|---|---|---|---|
| 1 | `src/lib/customization.ts:313-315` | `JSON.parse` throws (truncated/corrupt bytes) | **P0** |
| 2 | `src/lib/customization.ts:279-280` | key absent → `if (!raw) return base` | P1 (legitimate for a fresh device, but indistinguishable from #3) |
| 3 | `src/lib/customization.ts:279` | `window.localStorage.getItem` **throws** (`SecurityError`, storage blocked by browser/enterprise policy, Safari Private) — caught by the *same* catch as #1 | **P0** |

Door #3 is the sharp one: **storage-blocked and data-corrupt are collapsed into one indistinguishable outcome**, and both look identical to "brand-new user". The read at line 279 is raw `window.localStorage.getItem` rather than `readRaw()` from `safeStorage` — the layer built precisely to classify this (`safeStorage.ts:53-63` `classify()` already distinguishes `SecurityError` → `'unavailable'` from other failures).

**The signature cannot express failure.** `loadCustomization(): Customization` has no channel for "I fell back". Its consumer `src/lib/customizationContext.tsx:31` (`useState(() => loadCustomization())`) therefore cannot know either, and neither can any of the **13 other call sites** (`workoutCalendar.ts:602,611` · `syncStores.ts:123,279,412` · `dataPortability.ts:95` · `insights/readers.ts:61` · `portability/registry.ts:131` · `notifications/planWeek.ts:24` · `notifications/supplementNames.ts:12` · `onboardingProfile.ts:539`).

**Aggravating factor — `syncStores.ts:412` + `123`:** the fallback object is a *valid-looking* `Customization`. If sync is ever enabled, a device that merely had storage blocked for one boot can push the **fabricated default profile** into `profiles.data.settings` and overwrite the real cloud copy under LWW. Currently dormant only because the sync flag is off — same class as the latent conflict already logged in the charter §11.

### A1b — Partial corruption is *merged*, not rejected (P0)

`src/lib/customization.ts:282-311` merges the parsed object field-by-field over `base` with **zero shape or range validation**. Executed proof (harness A1b):

```
PASS  garbage age survived merge: age="not-a-number" (typeof string)
PASS  workoutPlan:42 survived merge -> 42 (no shape validation)
PASS  negative heightCm=-5 accepted (no range validation)
```

`workoutPlan: 42` survives because `normalizePlanDayNames` (`src/lib/planDayNames.ts:130-131`) guards with `if (!plan || !Array.isArray(plan.days) || !plan.days.length) return plan` — it returns the garbage **unchanged** rather than rejecting it. A string `age` then flows into `profileHash`/`computeTargets` (`customization.ts:323-341`) and produces `NaN` targets displayed as real numbers.

This is *worse* than total corruption: total corruption at least yields a coherent (if fake) object; partial corruption yields a **type-confused hybrid** that no downstream consumer validates.

### A2 — Reconstruction IS possible and IS deterministic (proven)

**`src/lib/onboardingProfile.ts:44`** stores the onboarding truth under a **separate key** — `qimmah:onboarding:profile:v1` — from the customization key `qimmah:customization:v1` (`customization.ts:25`). The two fail independently.

**Executed proof** (harness A2), with a realistic profile (22 y/male/178 cm/92 kg/cut/4 days/commercial gym) and a deliberately corrupted customization:

```
PASS  onboarding profile SURVIVES independently of corrupt customization (separate key)
PASS  reconstruction is DETERMINISTIC (two runs byte-identical on plan+targets)
PASS  reconstructed plan DIFFERS from the generic fallback (so the fallback IS a lie)
     reconstructed:   goal=cutting days=4 cal=2106 age=22 weight=92 name="زياد"
     generic default: goal=cutting days=4 cal=2294 age=24 weight=86
     reconstructed workout days: اليوم 1 · علوي | اليوم 2 · سفلي | اليوم 3 · علوي | اليوم 4 · سفلي
     generic  workout days:      اليوم 1 · جسم كامل | اليوم 2 · جسم كامل | اليوم 3 · جسم كامل
PASS  toLegacyProfile is pure/deterministic: age=22 w=92 goal=cutting
```

**Determinism is structural, not incidental.** `grep -nE "Math\.random|Date\.now|new Date\(" src/lib/planGenerator.ts src/lib/workoutPlan.ts src/lib/planDerive.ts src/lib/calculators.ts src/lib/nutritionPlan.ts src/lib/commitmentPlan.ts` returns exactly **one** hit — `src/lib/workoutPlan.ts:103` `new Date().getDay() % plan.days.length` — and that is *today's-day selection*, not plan construction. The generator itself has **no** entropy and **no** clock. The only clock in the assembly path is `src/lib/onboardingProfile.ts:408` (`targetsMeta.updatedAt`), a bookkeeping stamp that does not touch plan content.

**Verdict: a corrupt `customization` is fully recoverable, exactly, whenever the onboarding profile is intact.** The user's real plan (upper/lower ×4 @ 2106 kcal) is sitting one function call away from the generic lie (full-body ×3 @ 2294 kcal) that is shown instead.

### A2b — The reconstruction path exists but is wired to nothing (P0)

`grep -rn "buildCustomizationFromOnboarding|buildPlanArtifactsFromOnboarding" src/ scripts/`:

| Caller | file:line | Context |
|---|---|---|
| `OnboardingV2` | `src/views/OnboardingV2.tsx:327` | **only** at first onboarding completion |
| proof script | `scripts/plan-number-consistency-proof.ts:43` | test harness, not runtime |

**No runtime caller reconstructs on corruption. No caller detects corruption at all.** `grep -rniE "corrupt|تالف" src/` returns 20 hits — and every single one is a *different* store: `activeSession.ts:145` · `activeWorkout.ts:97,119-120` · `workoutSessionEngine.ts:228,336` · `nutritionHistory.ts:127,178,228` · `today.ts:50` · `historyStore.ts:128` · `features/todo/store.ts:76` · `features/barcode/openFoodFacts.ts:70`.

**The honest pattern already exists in this codebase and the plan store is the one place that does not use it.** `src/lib/activeWorkout.ts:97` does a strict shape check and wipes on deviation. `src/lib/workoutSessionEngine.ts:336` even carries a `reason` field that *"يفرّق «تالف» عن «الخطة تغيّرت»"* — exactly the distinction `customization.ts` collapses. This is not a missing capability; it is a missing application of a capability.

### A2c — Corrupt bytes are never cleaned (P1)

```
PASS  corrupt onboarding profile -> null (honest absence, but the raw corrupt bytes are LEFT IN PLACE)
PASS  corrupt bytes NOT cleaned up -> every subsequent boot re-parses and re-fails forever
PASS  corrupt customization bytes NOT cleaned up either
```

`src/lib/onboardingProfile.ts:122-124` and `src/lib/customization.ts:313-315` both `catch { return <fallback> }` and leave the bad bytes on disk. Consequences:
1. The failure is **permanent** — every boot repeats it, with no escalation and no user-visible signal.
2. `hasSavedCustomization()` (`customization.ts:427-429`) tests only `getItem(KEY) !== null` — so with corrupt bytes present it returns **`true`**. Every guard built on it is therefore wrong in the corrupt state: `isExistingPlanEdit()` (`customization.ts:367-369`) → `saveCustomization`'s paywall check (`customization.ts:382-386`), `workoutCalendar.ts:611`, `syncStores.ts:123,412`, `notifications/planWeek.ts`, `notifications/supplementNames.ts`, `onboardingProfile.ts:538`.
3. The corrupt bytes occupy quota, making the next write more likely to fail too.

**Compound worst case:** corrupt customization + intact onboarding → `hasSavedCustomization()===true` and `hasCompletedOnboardingProfile()===true` → the user is shown the generic plan as theirs, **and** any attempt to redo setup hits `assertPaid('plan.saveEdit')` (`onboardingProfile.ts:171`, `customization.ts:385`, `OnboardingV2.tsx:319`). **The user is charged to recover from our data loss.**

### A3 — The honest recovery design

Required sequence, in order: **detect → tell → reconstruct if safe → clean → never present a default as theirs.**

**1. Detect — make the load result honest.**
Change `loadCustomization(): Customization` → `loadCustomization(): { customization: Customization; state: 'saved' | 'absent' | 'corrupt' | 'storage-blocked'; }`, and route the read through `readRaw()`/`classify()` so `SecurityError` separates from parse failure. Add a shape validator (mirroring `activeWorkout.ts:97`) so A1b partial corruption is classified `'corrupt'` rather than merged.

**2. Tell — surface the state.**
`CustomizationProvider` exposes `state` from context; a banner renders on non-`'saved'`. Copy in white-dialect AR + informal EN (charter §6), e.g. «ما قدرنا نقرأ خطتك المحفوظة — نقدر نعيد بناءها من إعدادك» / "We couldn't read your saved plan — we can rebuild it from your setup."

**3. Reconstruct if safe.**
`'corrupt'` **and** `hasCompletedOnboardingProfile()` → offer one button that calls `buildPlanArtifactsFromOnboarding(loadOnboardingProfile()!, getDefaultCustomization())`. Proven deterministic and exact (A2). Must be **offered, not automatic** (charter §8 locked decision 3: plan changes are always a suggestion in v1).

**4. Clean.** Only *after* a verified `WriteResult === 'ok'` on the rebuilt value, `safeRemove` the corrupt bytes. Never before — deleting first and failing to write is a second data loss.

**5. Never show a default as theirs.** When reconstruction is impossible (both stores corrupt), do **not** silently mount the generic plan. Route to setup with an honest message. `getDefaultCustomization()` should be reachable only for a genuinely new user, or be explicitly tagged (e.g. `isDefault: true`) so surfaces can label it.

**6. Exempt recovery from the paywall.** Reconstructing after *our* corruption is not `plan.saveEdit`. Needs a `fromRecovery` bypass at `onboardingProfile.ts:171`, `customization.ts:382-386`, `OnboardingV2.tsx:319`.

**Files that must change:**

| File | Change |
|---|---|
| `src/lib/customization.ts` | `loadCustomization` returns state; `readRaw` instead of raw `getItem`; shape validation; **check the `safeWriteJson` result at :388 and :420**; `hasSavedCustomization` must not report corrupt-as-saved |
| `src/lib/customizationContext.tsx` | carry `state` in context; expose `reconstructFromOnboarding()` |
| `src/lib/onboardingProfile.ts` | `saveOnboardingProfile` :172-179 → `safeWriteJson` + check result; recovery bypass for `assertPaid` at :171; clean corrupt bytes at :122-124 |
| `src/lib/planDayNames.ts` | `:131` reject non-conforming input instead of returning it unchanged |
| **new** `src/components/DataRecoveryBanner.tsx` | the "tell + offer rebuild" surface |
| `src/i18n/dict/misc.ts` (or a new `recovery` dict) | AR+EN strings (charter §6 — no hardcoded text) |
| `src/views/OnboardingV2.tsx` | accept a `mode: 'recovery'` that skips the paid gate at :319 |
| `scripts/` + `package.json` `test:gate` | new `scripts/run-recovery-honesty-proof.mjs` (charter §4: every critical behavior fix adds a proof wired into the gate) |

### A4 — `safeStorage` contract, and who ignores it

**Contract** (`src/lib/safeStorage.ts:22`): `type WriteResult = 'ok' | 'quota' | 'unavailable' | 'error'`. `'ok'` **alone** means the bytes reached storage. Writers never throw (`writeRaw` :82-91, `writeJson` :94-103). Failures also land in a global indicator (`recordFailure` :75-79) readable via `getStorageFailure()` :140 and subscribable via `onStorageFailure()` :152.

The module is well-built. **The problem is entirely on the consumption side.**

#### A4a — The failure indicator has exactly one consumer (P0)

`grep -rn "onStorageFailure|getStorageFailure|clearStorageFailure" src/` (excluding `safeStorage.ts`) →
- `src/lib/finishWorkout.ts:89` `const failureBefore = getStorageFailure()`
- `src/lib/finishWorkout.ts:97` `const failureAfter = getStorageFailure()`
- `src/features/products/store.ts:34` — a *comment* only.

So the entire honest-save machinery is wired to **one** flow (finish-workout, the charter's named reference pattern). `onStorageFailure()` — the subscription built for a UI banner — has **zero subscribers**. There is no global "your data didn't save" surface anywhere in the app.

#### A4b — 32 of 44 `safeStorage` write calls discard the result (P1, P0 for two)

`grep -rnE "\b(safeWriteJson|writeJson|safeWrite|writeRaw)\(" src/` (excl. `safeStorage.ts`) → **44** call sites; only **12** assign, return, or branch on the value. **32 are fire-and-forget**, which is precisely the pattern `safeStorage` was built to end.

**The two that matter most:**

| file:line | Call | Why it is P0 |
|---|---|---|
| **`src/lib/customization.ts:388`** | `safeWriteJson(STORAGE_KEY, stamped)` | The **plan write**. Result discarded; then `enqueueSyncOperation(...)` at :391 runs **unconditionally** — so a write that never hit disk still enters the sync queue. |
| **`src/lib/customization.ts:420`** | `safeWriteJson(STORAGE_KEY, merged)` | `applyAccountSettingsFromSync` — inbound cloud settings. Discarded result means a failed hydrate is indistinguishable from a successful one. |

The rest (P1/P2, ordered by data value): `src/lib/onboarding.ts:91,132` (completion state — a lost write here re-runs setup) · `src/lib/today.ts:56,64` · `src/lib/commitmentTracking.ts:36,44` · `src/lib/wellnessTracking.ts:36,44` · `src/lib/stepCounter.ts:65,89,108` · `src/lib/appPreferences.ts:68` · `src/lib/workoutHydration.ts:52` · `src/lib/healthKit.ts:102` · `src/lib/firstWin.ts:76` · `src/lib/weekSummary.ts:42` · `src/lib/easySession.ts:26` · `src/lib/notifyAsk.ts:44` · `src/lib/historyStore.ts:593` · `src/features/todo/store.ts:79,84` · `src/lib/portability/importer.ts:196,200,208,211,239,267,295,306` (8 sites — **import/restore**, where a swallowed failure means a restore that silently didn't restore).

#### A4c — 40 raw `localStorage` writes bypass `safeStorage` entirely (P1, P0 for one)

`grep -rnE "localStorage\.(setItem|removeItem|clear)" src/` (excl. `safeStorage.ts`) → **40 sites in 29 files**. Nearly all sit inside a `try { … } catch { /* ignore */ }` — the exact anti-pattern named in the `safeStorage.ts:3-7` header comment as the reason the module exists.

**P0 — `src/lib/onboardingProfile.ts:172-179`:**

```ts
  try {
    const stamped: OnboardingProfile = { ...value, _meta: { ...value._meta, updatedAt: new Date().toISOString() } }
    window.localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(stamped))
    enqueueOnboardingProfileUpsert(stamped)
  } catch {
    /* تجاهل أخطاء التخزين (وضع التصفّح الخاص …) */
  }
```

This is the write of **the single source of truth for the whole plan** — the exact store that A2 proves is the recovery anchor — and it is raw, unchecked, and silently swallowed. The comment even names Safari Private Browsing, the documented zero-quota case from `safeStorage.ts:10-11`. Same pattern at `:189` (`saveOnboardingProfileFromSync`) and `:198`.

**The compound P0 — false success on onboarding completion.**
`src/views/OnboardingV2.tsx:326-341`:

```
326  saveOnboardingProfile(op)                     // swallows write failure
327  const artifacts = await buildPlanArtifactsFromOnboarding(op, customization)
328  applyCustomization(artifacts.customization)   // setState FIRST, then unchecked write
...
331  markCompleted(userId)                         // unconditional
338  clearDraftV2(userId)                          // DISCARDS the resumable draft
339  setStatus((s) => finalizeReduce(s, 'ok'))     // success screen — unconditional
340  onComplete()
```

`applyCustomization` (`customizationContext.tsx:38-41`) calls `setCustomization(next)` **before** `saveCustomization(next)`, and `saveCustomization` never checks its `WriteResult` (:388). So on a quota-blocked or storage-blocked device the user completes setup, sees their real plan rendered from memory, is told it succeeded, `markCompleted(userId)` fires, `clearDraftV2(userId)` **discards the resumable draft** — and on the next reload gets the fabricated 24-year-old's full-body plan from A1. Every input is gone.

Contrast `src/lib/finishWorkout.ts:89-97`, which does exactly the right thing on the same class of write. **The pattern is in the repo; the two most valuable writes in the app don't use it.**

**Minimal fix for A4:** route `onboardingProfile.ts:172-199` through `safeWriteJson` and check; make `saveCustomization`/`saveOnboardingProfile` return `WriteResult`; gate `OnboardingV2.tsx:331,338,339` (`markCompleted` / `clearDraftV2` / success) on `'ok'`; enqueue to sync only on `'ok'`; add one global `onStorageFailure` subscriber banner. Files: `src/lib/customization.ts`, `src/lib/onboardingProfile.ts`, `src/lib/customizationContext.tsx`, `src/views/OnboardingV2.tsx`, + new banner component and dict entries.

### A5 — `hasSavedCustomization()` throws uncaught when storage is blocked (P0, newly found)

**`src/lib/customization.ts:427-429`**

```ts
export function hasSavedCustomization(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null   // ← no try/catch
}
```

Merely *accessing* `localStorage` throws `SecurityError` when storage is blocked — the case `safeStorage.ts:12-14` documents explicitly and `safeStorage.ts:66-73` `storage()` guards against. This function does not guard.

**Executed proof** (harness `blocked-proof.ts`, `SecurityError`-throwing shim):

```
PASS  with storage OK: real saved plan loads (age=22, w=92)
PASS  storage BLOCKED -> returns the GENERIC default, identical to the corrupt-data outcome
PASS  user's real age 22 replaced by fabricated 24; weight 92 -> 86
PASS  hasSavedCustomization() THROWS uncaught SecurityError — it has no try/catch
```

This confirms **door #3** from A1: with the user's real plan intact on disk, a blocked read silently substitutes the fabricated 24-year-old's plan — *and* the "do I have a saved plan?" predicate crashes.

**Blast radius** — every consumer of `hasSavedCustomization()` inherits the throw: `isExistingPlanEdit()` (`customization.ts:368`) → `saveCustomization` (`:382`) and `OnboardingV2.tsx:319`; plus `workoutCalendar.ts:611`, `syncStores.ts:123,412`, `notifications/planWeek.ts`, `notifications/supplementNames.ts`, `onboardingProfile.ts:538`.

In `OnboardingV2` the throw is caught by the outer handler and produces the `'fail'` error screen — **precisely the failure the code's own comment at `OnboardingV2.tsx:344-348` warns must never happen**: *«ما قدرنا نجهّز الخطة» تكذب على المستخدم، وزرّ الإعادة معها لا ينجح أبدًا لأن السبب ليس عطلًا عابرًا*. Storage stays blocked, so retry can never succeed. In `notifications/planWeek.ts` and `workoutCalendar.ts` the throw is not obviously caught at all.

**Minimal fix:** `return readRaw(STORAGE_KEY) !== null` (`safeStorage.ts:106-114` already swallows correctly), and have it report `false` for corrupt bytes too. *Files:* `src/lib/customization.ts`.

### A6 — Quota failure on save is invisible to the caller (P0, executed)

```
PASS  saveCustomization does NOT throw on quota (safeStorage absorbs it)
PASS  saveCustomization returns undefined -> caller has NO way to learn the write failed
PASS  nothing was written to storage — yet the caller was told nothing
```

`saveCustomization(value: Customization): void` (`customization.ts:371`) has a `void` return type: the failure is *structurally* unreportable. This is the mechanical root of the A4c compound P0 — the success screen at `OnboardingV2.tsx:339` cannot check what it is never told.

---

## B. I18N LEAKS

**Method.** Dict parity was measured by **runtime introspection**, not regex: an esbuild bundle of all 42 modules in `src/i18n/dict/`, then a recursive key-path diff of every `{ ar, en }` record pair. Harness: `.../scratchpad/recon/b/{entry.ts,run.mjs}`.

### B7 — Dictionary parity is clean; the diff instead exposed an architectural defect

```
dict files scanned: 42 · ar/en record pairs found: 40
### KEYS IN ar BUT MISSING FROM en: 0
### KEYS IN en BUT MISSING FROM ar: 10   (all in profileChoices.ts)
### IDENTICAL ARABIC VALUE IN BOTH: 1    (workoutScreen.emptyWorkoutNameAr — an …Ar/…En pair, correct)
### en VALUE CONTAINS ARABIC: 1          (same key, same reason)
### ar VALUE IS PURE LATIN: 14           (all correct — see below)
```

**The dictionary layer is in good shape: 0 ar-only keys across ~2,900 key paths.** The 14 "pure Latin in `ar`" hits are all legitimate and should not be "fixed": `Premium` (the charter-mandated brand name, §0.1), `{value}`/`{goal}` interpolation placeholders in `ePlan.ts`, and five `*NameEnPlaceholder` fields in `onboarding.ts` that deliberately ask the user for an English name.

**The 10 "en-only" keys are not missing translations — they are the symptom of B6-a below.** `src/i18n/dict/profileChoices.ts:41,44` declare `workoutBalanceWarning: {}` and `generatedWarning: {}` as **empty objects** in the `ar` branch, while `:59-74` in the `en` branch holds an **Arabic-sentence → English-sentence** passthrough map. The parity delta is 10 because 10 Arabic sentences are being used as dictionary keys.

**Conclusion:** every genuine leak found below lives in `src/data/` and `src/components/` — *outside* the dictionary system. That is precisely why dict-level parity has never caught them, and why a parity gate alone would not have helped.

### B5-a — Equipment ids leak raw English into the Arabic UI (P1)

`src/lib/exerciseLabels.ts:8-18` maps **9** equipment ids; `:23` falls back to the raw id:

```ts
return key ? libraryStrings[lang][key] : eq      // exerciseLabels.ts:23
```

The data contains **12** distinct values (counted across `src/data/*.ts`). Three have no dict key and therefore render as English words in the Arabic UI:

| id | count | first occurrence |
|---|---|---|
| `band` | 3 | `src/data/exercises.ts:421` (`banded-lateral-walk`), `:437`, `:455` |
| `rope` | 1 | `src/data/exercises.ts:445` (`battle-ropes`) |
| `plate` | 1 | `src/data/exercises.ts:362` (`svend-press`) |

`src/i18n/dict/library.ts:41-49 / 141-149 / 231-239` has `equipBarbell…equipEzBar` and no `equipBand`/`equipRope`/`equipPlate`.

**Highest-visibility surface — the filter chips.** `src/views/ExerciseLibraryView.tsx:110-114` derives `equipList` from the data itself, so all 12 values become chips, and `:205` renders them via `equipmentLabel`. An Arabic user sees three English words in an RTL chip row. Also leaks at `ExerciseLibraryView.tsx:266`, `src/components/ExerciseDetail.tsx:135`, `src/views/WorkoutV2.tsx:1105` (dead file).

*Fix:* 3 dict keys + 3 `EQUIP_KEY` rows; change the `: eq` fallback to something loud so the next new id fails visibly. *Files:* `src/i18n/dict/library.ts`, `src/lib/exerciseLabels.ts`.

### B5-b — Five call sites bypass `equipmentLabel` entirely (P1)

Raw ids (`barbell`, `dumbbell`, `machine`, …) render as English tokens in the Arabic UI at: `src/components/WorkoutMode.tsx:689` · `src/components/ExerciseLibraryPicker.tsx:119` · `src/features/customPlan/ExercisePickerSheet.tsx:149` · `src/views/WorkoutV2.tsx:1132,1310` (dead).

`WorkoutMode.tsx:689` is unambiguous evidence — **the separator is localized while the values are not**:

```tsx
{muscleLabel(a.primaryMuscle, lang)} · {a.equipment.join(lang === 'en' ? ', ' : '، ')}
```

*Fix:* `equipment.map((e) => equipmentLabel(e, lang)).join(…)`; `lang` is already in scope at each site.

### B5-c — `muscleLabelAr` called with `lang` in scope but ignored (P1)

`src/data/muscleGroups.ts:53` is Arabic-only by construction; the bilingual sibling `muscleGroupLabel(id, lang)` exists at `:59`. Two **live** components call the Arabic-only one anyway:

- `src/components/MuscleMap.tsx:130` — `{muscleLabelAr(m)}`; `lang` is a prop of the enclosing card and already used nearby. Render path: `src/views/ProgressV2.tsx:146` → `src/components/BodyModel3D.tsx:552`. **The English Progress screen shows `صدر علوي`, `لاتس`, `ترابيس`.**
- `src/components/ExerciseMedia.tsx:156` — same, and `ExerciseMedia` is rendered from 7 surfaces.
- `src/components/FlatMuscleBody.tsx:51` — same, but the file has **0 importers** (verified) → P3.

*Fix:* `muscleGroupLabel(m, lang)`. One-token change; `labelEn` already exists for all groups.

### B5-d — Arabic rep units baked into canonical plan data (P1)

**28 of 181 exercises** carry Arabic inside `defaultReps` (executed count):

```
exercises.ts:339 plank            '30–60 ث'      exercises.ts:348 treadmill-run  '20–30 د'
exercises.ts:421 banded-lateral-walk '12–15 لكل جهة'   exercises.ts:452 hip-flexor-stretch '30 ث لكل جهة'
… 24 more (all cardio / core / mobility / warm-up — i.e. exactly what a beginner plan is full of)
```

The value flows verbatim into `PlanExercise.reps` (`src/lib/planGenerator.ts:685`, `src/lib/workoutPlan.ts:14`) and is **persisted in the user's plan**, then rendered unlocalized in the English UI at `src/components/WorkoutMode.tsx:461`, `src/components/customizer/steps/StepGeneratePlan.tsx:121`, `src/features/customPlan/CustomPlanBuilder.tsx:261`, `src/components/ExerciseLibraryPicker.tsx:119`, `src/features/customPlan/ExercisePickerSheet.tsx:149`.

*Fix:* structured `{ value, unit: 'rep'|'sec'|'min', perSide? }` on `Exercise`, or minimally a `formatReps(reps, lang)` display helper routed through all 5 sites. *Files:* `src/types/workout.ts`, `src/data/exercises.ts`, + the 5 render sites.

### B5-e — `foodCategoryEn` was written and never wired up (P1)

`src/data/foodItems.ts:65` defines `foodCategoryEn: Record<FoodCategory, string>` explicitly for the English UI. `grep -rn "foodCategoryEn" src/` returns **only the definition** — zero consumers (verified). Meanwhile `src/components/nutrition/QuickMealLogger.tsx:331` renders `{f.category}` raw, and `FoodCategory` is a union of **16 Arabic literals** (`foodItems.ts:5-21`). The English nutrition search therefore shows Arabic category names, with the translation table sitting unused in the same file.

*Fix:* one line — `lang === 'en' ? foodCategoryEn[f.category] : f.category`.

### B5-f — `titleEn` renders the raw enum (P2)

`src/lib/workoutV2Model.ts:137` — `titleEn: goal ? \`${goal} program\` : 'Your program'`, where `goal` is `'cut'|'bulk'|'maintain'`. English users see literally **"cut program"**, while the Arabic branch at `:130` uses a proper word map. *Fix:* add `goalWordEn` mirroring `:130`.

### B6 — Arabic literals used as canonical authority

Greps run across `src/`: `=== '…Arabic'`, `!==`, `case`, `includes`, `startsWith`, `endsWith`, `indexOf`. **Zero** `switch`/`case` on Arabic and **zero** Arabic values written to storage as canonical state (all keys are ASCII `qimmah:*`). The defects are these:

| # | file:line | Literal used as authority | Sev |
|---|---|---|---|
| **B6-a** | `src/i18n/dict/profileChoices.ts:59-74` | **10 full Arabic sentences as dictionary keys.** Producers: `src/lib/workoutValidation.ts:78,92,93` and `src/lib/planGenerator.ts:1136` emit Arabic-only `message` strings. Consumers: `src/components/customizer/steps/StepGeneratePlan.tsx:49` and `StepWorkoutTemplate.tsx:140` do `dict[arabicSentence] ?? fallback`. **A single comma edit in `workoutValidation.ts` silently degrades every English user to a generic fallback**, with no test able to see it. The correct pattern exists 40 lines away — `src/features/customPlan/builder.ts:540-541` carries `messageAr` + `messageEn` side by side. | **P1** |
| **B6-b** | `src/lib/planGenerator.ts:680` | `/[ثد]/.test(ex?.defaultReps ?? '')` — **two Arabic letters are the time-unit sentinel that decides `keepDefaultReps`**, i.e. whether a generated plan keeps a duration prescription or overwrites it with a rep scheme. Plan-generation logic is coupled to the display language of a data string. | **P1** |
| **B6-c** | `src/lib/notifications/planWeek.ts:4-18` | `DAY_TO_WEEKDAY` keyed by Arabic day names — **and it already carries hamza-variant duplicates** (`الإثنين`/`الاثنين`, `الأربعاء`/`الاربعاء`), which is proof the approach has broken before. Drives **notification scheduling** from the persisted `RoutineRow.day`; any spelling outside the 9 keys returns `null` at `:18` and the day is **silently dropped from the schedule**. | **P1** |
| **B6-d** | `src/features/customPlan/CustomPlanBuilder.tsx:385` | `pe.reps === '30 ث'` — an Arabic-suffixed rep string compared as an enum. Only that one exact variant is normalized; the other 15 Arabic rep variants in `exercises.ts` escape and land in `repOptions` untranslated. | P2 |
| **B6-e** | `src/i18n/dict/profileChoices.ts:38,39` | `weekdays` and `recommendedFor` keyed by Arabic. `recommendedFor` is typed `string` (`src/types/workout.ts:80`) and populated with bare Arabic in `src/data/workoutTemplates.ts:22,36,…`; consumers use `?? tpl.recommendedFor`, falling back to raw Arabic in the EN UI. | P2 |
| **B6-f** | `src/data/foodItems.ts:5-21` | `FoodCategory` = union of 16 Arabic string literals, persisted with every logged food. Note it already contains three near-duplicate Saudi-dish categories — exactly the drift a slug enum prevents. | P2 |
| **B6-g** | `src/components/nutrition/QuickMealLogger.tsx:150` | `f.sizes.find((s) => s.labelAr === 'وسط')` — the **default portion size** is chosen by comparing an Arabic display label. Every food whose middle size is labelled anything else silently falls to `sizes[0]`. Each row already has a stable id. | P2 |
| **B6-h** | `src/lib/servingDisplay.ts:41` | `servingLabelAr.includes(n.ar)` over a 17-entry table where ordering is load-bearing and undocumented. | P2 |
| **B6-i** | `src/lib/planDayNames.ts:19-26,33-51` | Stored Arabic day-name prose is the canonical identity from which `nameEn` is reverse-engineered; `:122` `nameEn: derived ?? ar` copies unrecognized Arabic into the English field. Justified as legacy migration — should stop growing. | P2 |
| **B6-j** | `src/lib/planGenerator.ts:198-203` | Free-text injury classified by Arabic+English keyword regexes, driving **exercise exclusion**. Genuinely bilingual, but it is Arabic literal as plan-*safety* authority. | P3 |

**Correctly display-only (verified, no action):** `src/lib/todayV2Model.ts:318` (`withPrefix` is only ever called inside the AR arm of `t(ar,en)`), `src/lib/text/foodNormalize.ts:90` and `src/lib/food/catalog/rank.ts:68` (`startsWith('ال')` — necessary Arabic orthographic normalization for search), `src/lib/workoutDayLabel.ts:13`, `src/lib/access/entitlementSource.ts:144` (digit folding).

**Charter §6 note:** `src/lib/todayV2Model.ts` uses a local `t(ar, en)` helper — a pattern §6 explicitly forbids (*"لا مساعدات `t(ar, en)` محلية جديدة"*). It is one of only two such files, so the rule is nearly held. P3.

---

## C. SEARCH QUALITY

There are **three** independent search implementations with sharply different quality. Executed harness: `.../scratchpad/recon/ce-search-pwa/harness.mjs` (reimplements the repo logic verbatim). **19 pass / 11 fail.**

### C1 — Exercise search has NO Arabic normalization (P1)

**`src/lib/exerciseLibrary.ts:17,22`** — consumed by `src/views/ExerciseLibraryView.tsx:113`:

```ts
const query = search.trim().toLocaleLowerCase(lang === 'ar' ? 'ar' : 'en')
...
if (query && !`${exercise.nameAr} ${exercise.nameEn}`.toLocaleLowerCase(...).includes(query)) return false
```

Trim + lowercase + raw `includes`. No NFD/NFKD, no diacritic strip, no tatweel strip, no alef/hamza/taa-marbuta/yaa folding. **In an Arabic-first product, the Arabic search is the unnormalized one.**

Measured failures:

```
FAIL  AR "دجاج"  finds diacritized "دَجَاج مشوي"      -> false
FAIL  AR "سكوات" finds tatweel "سكــوات"              -> false
FAIL  AR "ارجحة" (plain alef) finds "أرجحة الأرجل"    -> false
FAIL  AR "الرفعه" (taa marbuta) finds "الرفعة"         -> false
```

These hit **real catalog data**: `src/data/exercises.ts` carries `nameAr: 'أرجحة الأرجل (إحماء)'` — typing the plain-alef `ارجحة` (among the most common Arabic mistypes) returns zero results. `src/data/saudiFoods.ts:1093` carries diacritized entries (`'العَبيلة بالدجاج'`, `'عُصاب (معاصيب)'`, `'غَموس تمر وسمح'`).

### C2 — Eight clones of the same defect (P1)

The same raw `.toLowerCase().includes()` predicate is copy-pasted across every picker in the app:

| file:line | Surface |
|---|---|
| `src/components/ExerciseLibraryPicker.tsx:62` | exercise picker |
| `src/features/customPlan/ExercisePickerSheet.tsx:120` | custom-plan picker |
| `src/components/IngredientPicker.tsx:41` | ingredients |
| `src/components/SupplementLibraryPicker.tsx:38` | supplements |
| `src/components/MedicationLibraryPicker.tsx:42` | medications |
| `src/components/CommitmentLibraryPicker.tsx:39` | commitments |
| `src/components/customizer/steps/StepNutrition.tsx:98` | meal templates |
| `src/features/products/store.ts:229` | user products (plain `toLowerCase`, no locale) |

### C3 — English plural queries never match (P2)

`includes()` matches only when the **query is a substring of the name**, and the catalog is singular. So the direction users actually type fails:

```
PASS  "squat"    finds "Barbell Back Squat"  -> true
FAIL  "squats"   finds "Barbell Back Squat"  -> false
FAIL  "crunches" finds "Crunch"              -> false
FAIL  [CAT] "squats" matches product "Squat" -> false
```

Affects `src/lib/exerciseLibrary.ts:22` and `src/data/foodItems.ts:5813-5830`.

### C4 — Food search is the good one, with one gap: the «ال» article (P2)

`normalizeSearch` at **`src/data/foodItems.ts:5657-5671`** is genuinely well-built — strips harakat U+064B–U+0652 + dagger alef, tatweel, folds `أإآٱ→ا`, `ة→ه`, `ى→ي`, `ؤ→و`, `ئ→ي`, drops `ء`. Plus closed-list loanword and transliteration canonicalizers (`:5773-5779`, `:5795-5801`) applied to both sides, and a relevance-tiered scorer (`:5813-5830`). Measured: 12/13 Arabic cases pass, including transliteration (`kabsa`→`كبسة`) and loanwords (`برغر`→`برجر`).

The one gap:

```
PASS  "بروتين"   finds "بار بروتين"      -> true
FAIL  "البروتين" finds "بار بروتين"      -> false
```

The definite article is not stripped — **even though the fix already exists in the repo** at `src/lib/text/foodNormalize.ts:85-88` (`withAlDefinite`).

### C5 — Two divergent normalizers; the declared reference has one consumer (P2)

**`src/lib/text/foodNormalize.ts`** is the repo's declared reference (`NORMALIZATION_VERSION = '1.1.0'`, `:23`). Its `foldArabic` (`:30-52`) is strictly wider than `normalizeSearch`: adds NFD + Latin combining-mark strip, Persian yaa `ی`, Persian kaf/gaf `ک گ`, U+0653–U+0655. Its `tokenize` (`:92-102`) emits an «ال»-stripped token — exactly C4's missing fix.

**It has exactly one consumer:** `src/lib/food/catalog/catalog.ts:24` (used `:142-143`, `:174`). Every user-facing search path uses the weaker normalizer or none at all. The better tool exists and is shelved.

### C6 — Catalog matching is token-prefix only (P3)

`src/lib/food/catalog/catalog.ts:154,184` use `token.startsWith(q)`, so mid-word queries miss: `FAIL [CAT] "روتين" matches "بروتين واي" -> false`.

### C7 — The exercise-library proof only tests exact full names (P2)

`scripts/exercise-library-proof.ts:23-24` asserts that searching the **complete exact name** finds the item. Every real-world variant fails while the gate stays green. This is the §4.2 pattern: an assertion satisfiable without the behavior it claims to guard.

### C8 — Smallest practical improvement

**Do not build a new normalizer.** `foldArabic` already exists and is already the declared v1.1.0 reference. Add two thin exports beside it in `src/lib/text/foodNormalize.ts` (no change to existing exports, so `NORMALIZATION_VERSION` and the on-disk catalog index stay valid):

```ts
export function normalizeQuery(text: string): string {
  return foldArabicDigits(foldArabic(text))
}
export function looseIncludes(haystack: string, query: string): boolean {
  const h = normalizeQuery(haystack), q = normalizeQuery(query)
  if (!q) return true
  if (h.includes(q)) return true
  return q.length > 4 && q.startsWith('ال') && h.includes(q.slice(2))
}
```

Then a **one-line predicate swap** in nine files: `src/lib/exerciseLibrary.ts:17,22` · `src/components/ExerciseLibraryPicker.tsx:62` · `src/features/customPlan/ExercisePickerSheet.tsx:120` · `src/components/IngredientPicker.tsx:41` · `src/components/SupplementLibraryPicker.tsx:38` · `src/components/MedicationLibraryPicker.tsx:42` · `src/components/CommitmentLibraryPicker.tsx:39` · `src/components/customizer/steps/StepNutrition.tsx:98` · `src/features/products/store.ts:229,232-234`.

For C4, one line at `src/data/foodItems.ts:5811`: also try `q.slice(2)` when `q.length > 4 && q.startsWith('ال')` — closes the only measured food gap without touching `normalizeSearch`, which the catalog index version-contract depends on matching.

**Deliberately out of scope:** Arabic stemming (`تمرين`/`تمارين`) needs a lexicon, not a rule; a naive rule poisons recall exactly as the `foodItems.ts:5675-5690` comment warns. English plural (C3) is cheap if wanted: strip a trailing `s` from ASCII tokens of length ≥ 4 on **both** sides, so it stays symmetric.

**Per §4.2, any fix must ship with a proof that fails by a named check** — and C7 must be tightened in the same wave, or the new normalizer ships behind an assertion that never tested it.

---

## D. MOBILE / A11Y

**Context that sets every severity below.** `src/styles/index.css:50-60` sets `overflow: hidden` on `html`/`body.qimmah-shell-mounted` and `#root`, and `:162-171` hides all scrollbars. **Inside the shell, horizontal overflow is silently clipped — content is unreachable with no scrollbar and no affordance.** Outside the shell (Settings, Calc, legal) the body scrolls, so overflow shifts the whole page instead.

**Dead files (verified: 0 importers).** `src/views/NutritionV2.tsx`, `src/views/WorkoutV2.tsx` (its one apparent importer is a *code comment* in `src/lib/workoutSessionEngine.ts:224`), `src/views/PlanPreviewView.tsx`, `src/components/StepCounterCard.tsx`, `src/components/FlatMuscleBody.tsx`, `src/components/InstallPrompt.tsx`, `src/components/Header.tsx`. The live tabs are `WorkoutView` / `NutritionView` (`src/App.tsx:24,28,579,589`). **Roughly 40% of the raw a11y violations in this repo sit in dead files** and must be discounted — they also hold *better* patterns than the live code (see D12), which actively misleads anyone auditing by grep.

### D9 — Horizontal overflow at 320px

**Width discipline is genuinely good:** `w-[Npx]` fixed widths **0** · `w-64/72/80/96` **0** · `flex-nowrap` **0** · `min-w-[…]` 2 (both 44/64px touch floors) · `<table>` 1 (admin only). The real overflow driver is not a fixed width.

| # | file:line | Cause | Sev |
|---|---|---|---|
| **D9-1** | `src/design-system/tokens.css:353-357` | `:root .btn-primary { font-size: max(1.1875rem, 1em) }` — specificity **(0,2,0)** beats `.text-xs` **(0,1,0)**, so **27 live buttons written as `btn-primary … text-xs` actually render at 19px** — a ~58% label-width inflation invisible in the class list. Verified: `.btn` base at `src/styles/index.css:213` sets `text-sm`, and the token override wins over both. Worst live sites: `src/views/WorkoutView.tsx:350,405,451` · `src/views/NutritionView.tsx:434,526` · `src/components/nutrition/QuickMealLogger.tsx:258,442,466` · `src/components/WorkoutMode.tsx:692` · `src/views/SettingsView.tsx:143`. **Largest single 320px contributor in the app.** *Fix:* drop the `font-size` line; set the default size on `.btn` in `@layer components`. | **P1** |
| **D9-2** | `src/views/SettingsView.tsx:288` | The **known** version-text overflow. `container-page` is `px-5` (verified `src/styles/index.css:190`) → ~280px, minus `SettingsGroup` card padding ≈ **232px usable**. `BUILD_LABEL` (`src/lib/buildInfo.ts:23-26`) is `v1.0.0·a1b2c3d` (~128px mono) beside a ~90px Arabic label — on the knife's edge. In `founder_preview` it becomes `v1.0.0·a1b2c3d·founder_preview` (~236px alone) → **~106px overflow**. Neither flex child has `min-w-0`; the span has no `break-all`; `·`-joined text is one unbreakable token. SettingsView is outside the shell, so the whole page scrolls sideways. *Fix:* `min-w-0 break-all text-end` on the value span, `shrink-0` on the label. | **P1** |
| **D9-3** | `src/views/SettingsView.tsx:309` | Same shape, but **overflows unconditionally in production**: `qimmah.support@gmail.com` (24 mono chars ≈ 173px + 20px padding = 193px) beside `البريد للدعم` (~85px) + 12px gap ≈ **290px vs 232px → ~58px overflow, no env flag needed.** *Fix:* same, or move the email to its own line. | **P1** |
| **D9-4** | `src/components/customizer/steps/StepNutrition.tsx:222` | `grid grid-cols-4 gap-2` holding four `<input type="number">` — **~50px per column at 320px**, with `text-base` (16px) values and `text-[10px]` Arabic labels (`كربوهيدرات`) wider than the column. Live via Settings → «تعديل الخطة». *Fix:* `grid-cols-2 sm:grid-cols-4`. | **P1** |
| D9-5 | `src/views/OnboardingV2.tsx:888` | `Segmented` uses `grid grid-cols-4 gap-2` → ~55px cells with `min-h-[3rem] flex-col py-3` content, on the **first-run onboarding**, the highest-traffic screen in the app. Any 2-line label blows the cell. | P2 |
| D9-6 | `src/components/today/DailyRingsCard.tsx:121` | `whitespace-nowrap` inside `grid grid-cols-3` on the **Today home screen** → ~79px columns holding `"1200 / 1800 غ"` (~78px). No wrap allowed and the shell clips, so the number is silently truncated. | P2 |
| D9-7 | `src/components/customizer/PreviewSummary.tsx:59` | `grid-cols-4` stat strip, ~50px cells with `text-[10px]` Arabic labels. | P2 |
| D9-8 | `src/components/today/NextActionCard.tsx:155` | `<dd className="whitespace-nowrap">` inside `flex min-w-0`, but the `<dt>` has no `truncate`. | P2 |
| D9-9 | `src/sections/CustomizationCenter.tsx:314` | `whitespace-nowrap` step chips; with 8+ Arabic step titles the row exceeds 320px — and if the parent is not a horizontal scroller the later steps become **unreachable**. | P2 |
| D9-10 | `src/views/NutritionView.tsx:515` | Water input `w-40` (160px fixed) + `gap-2` + a `btn-primary text-xs` rendering at 19px (D9-1) ≈ 242px vs ~246px available. Passes by **4px** in Arabic; any longer CTA or larger system font overflows. *Fix:* `w-full min-w-0`. | P2 |
| D9-11 | `src/components/InstallBanner.tsx:54` | `flex-1` without `min-w-0` (so `min-width: auto` blocks shrinking), beside a `shrink-0` 19px button. Shown on every tab. | P2 |
| D9-12 | `src/components/Footer.tsx:32-35` | `BUILD_LABEL` inline in the copyright `<p>`, unbreakable, no `break-all`. | P3 |
| D9-13 | `src/components/MobileShell.tsx:269` | `grid grid-cols-5` bottom nav, ~63px cells, no `truncate` on the label span. Fits today; one longer label overflows into neighbours. | P3 |

### D10 — Touch targets below 44px

The base classes are **correct**: `.btn` (`src/styles/index.css:212-213`) includes `min-h-[44px]`, and a `.tap-target` helper exists at `:320-322` — **used 0 times**. Every violation is a control that bypassed both.

**49 total sub-44px interactive elements; 29 live, 20 in dead files.** Worst live offenders, most-used surfaces first:

| file:line | Class | Computed | Sev |
|---|---|---|---|
| `src/views/WorkoutView.tsx:371,380` | `rounded-lg px-3 py-1.5 text-xs` (`role="tab"`) | **28px** | **P1** — primary control on the Workout tab |
| `src/components/WorkoutMode.tsx:719` | `rounded-full border px-3 py-1 text-xs` | **26px** | **P1** — difficulty chips mid-session, sweaty hands |
| `src/components/InstallBanner.tsx:61` | `shrink-0 rounded-lg p-1.5` | **28×28px** | **P1** — the only dismiss for a banner on every tab |
| `src/views/ExerciseLibraryView.tsx:216` | `min-h-[36px] … px-3 text-[11px]` | **36px** | **P1** — "clear all filters", the single escape from a bad filter state |
| `src/sections/CustomizationCenter.tsx:314` | `px-3 py-1 text-[11px]` | **25px** | **P1** — step nav for the entire plan editor |
| `src/views/NotificationsSettingsV2.tsx:244` | `px-2.5 py-1.5 text-xs` ×7 | **28px** | **P1** — 7 adjacent weekday targets in `flex-wrap gap-1.5` |
| `src/features/customPlan/CustomPlanBuilder.tsx:438,448` | `grid h-8 w-8` | **32×32px** | **P1** — sets −/+ stepper, most-repeated tap in plan building |
| `src/features/customPlan/CustomPlanBuilder.tsx:102,404,413,422` | `grid h-10 w-10` | 40×40px | P2 |
| `src/features/customPlan/ExercisePickerSheet.tsx:173,198` | `h-9 w-9` / `px-3 py-1.5` | 36 / 28px | P2 |
| `src/components/customizer/steps/StepNutrition.tsx:230-232`, `StepCommitments.tsx:67-69`, `StepWellness.tsx:87,126` | `grid h-8 w-8` | 32×32px | P2 |
| `src/components/customizer/EditableTable.tsx:76`, `src/components/ExerciseLibraryPicker.tsx:122` | `h-9 w-9` | 36×36px | P2 |
| `src/components/customizer/steps/StepGoal.tsx:31` | `px-3 py-1.5 text-xs` | 28px | P2 |

*Fix:* apply the already-defined-but-unused `.tap-target` (`src/styles/index.css:320-322`); for icon buttons use `h-11 w-11` keeping the icon at `h-4 w-4`. Consider a lint rule banning `h-8`/`h-9`/`p-1.5` on `button`/`a` without `min-h-[44px]`.

**Correct patterns already shipped (do not regress):** `src/components/Footer.tsx:41-43`, `src/components/AppNav.tsx:58`, `src/views/NutritionView.tsx:511-512,526`, all `role="switch"` controls.

### D11 — Heading semantics

`src/components/MobileShell.tsx:208-216` supplies an `h1` for every tab **except `dashboard`**, where the title is rendered as `<button><span>` (verified).

| Finding | file:line | Sev |
|---|---|---|
| **D11-A — the home screen has no `h1` at all.** `src/views/TodayV2.tsx:251-253` carries a comment asserting *«h2 لا h1: القشرة تملك h1 الصفحة»* — but `MobileShell.tsx:209-215` renders a `<button><span>` precisely when `tab === 'dashboard'`. **The comment documents an invariant the shell does not honour**, and the app's landing screen starts at `h2`. *Fix:* wrap the dashboard title in `<h1>`. | `src/components/MobileShell.tsx:209` | **P1** |
| **D11-B — duplicate `h1` on 4 live tabs + 4 sub-screens.** `src/views/WorkoutView.tsx:290` · `ExerciseLibraryView.tsx:132` · `NutritionView.tsx:110` · `MyStatsView.tsx:70` · `ProgressV2.tsx:308,449,545,633` each emit an `h1` **while inside `MobileShell`**, which already emitted one. *Fix:* demote to `h2` (matching the `TodayV2`/`ProfileV2` convention). | as listed | P2 |
| **D11-C — the plan editor has zero headings.** `src/sections/CustomizationCenter.tsx` contains no `h1`–`h6` anywhere; `src/views/SetupView.tsx:96` returns it directly in `advanced` mode, so the whole plan-editing flow is a heading-less document. | `src/sections/CustomizationCenter.tsx` | P2 |
| **D11-D — the active workout has only an `h3`.** `MobileShell.tsx:203` sets `hidden={immersive}`, removing the shell `h1` from the tree; the only heading in `WorkoutMode` is an `h3` at `:798`. | `src/components/WorkoutMode.tsx:798` | P2 |

**No skipped heading levels found anywhere in live code** — every problem is a missing or duplicated `h1`, never a skip. Views correctly relying on a wrapper `h1` (`StandaloneAppScreen.tsx:47`): Privacy, Terms, Contact, CalcExplainer.

### D12 — Water input accessibility (P1)

`src/views/NutritionView.tsx:514-524`, verified:

| Question | Answer |
|---|---|
| `<label for>` | **No** — `grep -c htmlFor src/views/NutritionView.tsx` = **0** for the whole file |
| `aria-label` / `aria-labelledby` | **No** — only `placeholder` (`'كمية بالمل (مثال: 350)'`) |
| `id` | **No** — nothing to associate a label to |
| Error linked | **No** — `:528` renders the validation message as a bare `<p>`: no `id`, no `aria-describedby` on the input, no `aria-invalid`, no `role="alert"` |
| Value announced | **No** — `grep aria-live\|role="status"` over the file returns **nothing** |

WCAG 4.1.2 (Name, Role, Value) and 3.3.2 (Labels or Instructions). A placeholder is not an accessible name, and it disappears the moment the user types — the field becomes anonymous exactly when it matters.

**Compounding: the shared progress primitive is invisible to assistive tech.** `src/components/ProgressBar.tsx:13-19` renders two bare `<div>`s with **no `role="progressbar"`, no `aria-valuenow/min/max`, no label** (verified — the whole file is 21 lines). So pressing `+250` produces **zero** screen-reader feedback: the number at `NutritionView.tsx:504` changes silently and the bar does not exist for AT.

`src/components/today/WaterCard.tsx` is better-intentioned but has the same gap: `:78-85` the `+` button has a proper `aria-label`; `:75` has an sr-only value string **that is not in a live region**, so it never re-announces; `:106-109` uses `role="status"` for the **failure** path — so failure is announced and success is not. Neither surface has a decrement control.

*Fix:* `id` + `aria-label` + `aria-invalid`/`aria-describedby` on the input and `role="alert"` on the error; `aria-live="polite"` on `NutritionView.tsx:504` and `WaterCard.tsx:75`; give `ProgressBar` `role="progressbar"` + `aria-valuenow/min/max` + a required label prop. *Files:* `src/views/NutritionView.tsx`, `src/components/today/WaterCard.tsx`, `src/components/ProgressBar.tsx`, + dict entries.

**Note:** a correct `−/+` stepper *with* `aria-label` on both buttons already exists at `src/views/NutritionV2.tsx:414-416` — in a **dead file**. The good pattern is in the repo and not shipped.

### D13 — Physical-direction classes: effectively zero (verified twice)

I swept `src/` with a class-string parser and cross-checked with independent raw greps. **Both agree.**

| Pattern | Matches |
|---|---|
| `ml-` `mr-` `pl-` `pr-` | **0** |
| `text-left` / `text-right` | **0** |
| `border-l-` `border-r-` `rounded-r` | **0** |
| `float-left/right`, `origin-left/right`, `space-x-*`, `divide-x*` | **0** |
| inline `style={{ left / right / marginLeft … }}` | **0** |
| `left-*` / `right-*` | **1** |

*(`rounded-l` appeared to match 97 times; all 132 occurrences are `rounded-lg` — a substring false positive.)*

**Adoption of the mandated logical properties is real:** `ms-` 15 · `me-` 3 · `ps-` 4 · `pe-` 7 · `start-` 24 · `end-` 20, plus `text-start`/`text-end` and `rtl:`/`ltr:` variants and `insetInlineStart` at `MobileShell.tsx:189`.

**The single hit is not a defect.** `src/components/ExerciseMedia.tsx:269` uses `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` — a **symmetric centering idiom** that renders identically in both directions. Note that a naive "fix" to `start-1/2` would actually *break* it in RTL. *Optional cleanup:* `absolute inset-0 m-auto`, which drops both physical anchors and both translates. **P3, cosmetic charter compliance only.**

**This lane is closed.** Worth a CI grep to keep it that way.

---

## E. PWA

Hand-written SW at **`public/sw.js`** (177 lines). No `vite-plugin-pwa`. Registration is at **`src/main.tsx:63`**, gated on `import.meta.env.PROD && !Capacitor.isNativePlatform()`.

### E0 — Strategy, update flow, offline indicator, provenance (baseline: mostly sound)

**Cache strategy per class:**

| Class | Strategy | file:line |
|---|---|---|
| HTML navigations | **Network-first, 6 s timeout**; falls back to precached `/index.html` only on abort/network error. 5xx passes through unmasked. | `public/sw.js:130-138`, `:27` |
| `/assets/*` (hashed) | Cache-first | `public/sw.js:148` |
| Other same-origin | Stale-while-revalidate | `public/sw.js:150-166` |
| Cross-origin | Not intercepted | `public/sw.js:175` |

Two genuinely good guards: `mayCache` (`public/sw.js:71-84`) refuses to store `text/html` under a non-document request and content-type-checks script/style/image; precache is split required/optional (`:36`, `:40-47`, `:92-105`) so one 404 icon cannot abort `addAll`.

**Update flow:** `install` → `addAll(REQUIRED_URLS)` → `skipWaiting()` (`public/sw.js:104`); `activate` → delete every cache key not prefixed with current `VERSION` → `clients.claim()` (`:108-117`). Client (`src/lib/swUpdate.ts:52-88`) registers on `load`, calls `registration.update()` on each `visibilitychange`→visible, throttled to 60 s (`:76-83`); on `controllerchange` (`:63-67`) it **force-reloads with no prompt**, guarded by `hadController` (`:60`) and `reloadedOnce` (`:61`). `reloadWhenSafe()` (`:27-45`) defers the reload while focus is in an input.
**No update can get stuck waiting** — `skipWaiting()` at install means there is never a waiting worker. The opposite risk applies (see E-3).

**Offline indicator:** yes — `src/components/MobileShell.tsx:237-249` renders a persistent non-blocking offline `StateBlock` from `useOnlineStatus()` (`src/lib/useOnlineStatus.ts:9-25`). Copy is honest and bilingual. **But it covers network loss only, never staleness.**

**Build SHA provenance — real and guarded.** `vite.config.ts:17-25` (`CF_PAGES_COMMIT_SHA` ?? `git rev-parse --short HEAD` ?? `'dev'`) → `define` `__BUILD_COMMIT__` (`:102-105`) → `src/lib/buildInfo.ts:9-13`. `buildIdentityPlugin` (`vite.config.ts:46-64`) injects `<meta name="qimmah-build|qimmah-commit|qimmah-sw-version|…">` into `index.html` only, so bundle hashes stay stable. `swVersionPlugin` (`:66-91`) replaces `__SW_VERSION__`/`__SW_PRECACHE_ASSETS__` in `dist/sw.js` at `closeBundle`. Verified in the checked-out `dist/`: `dist/sw.js:23 const VERSION = 'qimmah-bcec642'` matching `<meta name="qimmah-sw-version" content="qimmah-bcec642">`. `scripts/build-convergence-proof.mjs:66-74` asserts the match and that no `__SW_` placeholder survives.
*(Note: the checked-out `dist/` carries `<meta name="qimmah-env" content="founder_preview">` — a preview build, not production.)*

### E-1 — `vercel.json` re-introduces the explicitly forbidden catch-all (P1) ⚠️

**`vercel.json:6`** — verified by direct read:

```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

**`public/_redirects:4`** forbids exactly this, in bold, with the incident number:

> ⚠️ ممنوع إعادة قاعدة شاملة «/* /index.html 200». [QIM-WEB-HOTFIX-002]

The documented consequence: a hashed asset deleted by a new deploy returns **200 + `index.html` body**; the browser requests it `type="module"`, `nosniff` blocks sniffing, MIME failure, error card. `_redirects:19-23` further notes that `public/404.html` and the *absence* of the catch-all are **interdependent** — one without the other does not work.

**The guard is blind to this file.** `grep -n vercel scripts/asset-integrity-proof.mjs` returns **nothing**; it parses only `dist/_redirects` (`:56,65`). So the invariant is enforced on Cloudflare and silently bypassed on Vercel. `docs/audit/QIMMAH-FULL-AUDIT-2026-08-03.md:883` already logs the dual-config ambiguity as **F-CFG-01, still open on this branch**.

*Fix:* delete `vercel.json` (the repo deploys via `wrangler.toml` → Cloudflare Pages), or replace the rewrite with the same explicit allowlist **and** teach `asset-integrity-proof.mjs` to parse `vercel.json`. *Files:* `vercel.json`, `scripts/asset-integrity-proof.mjs`.

### E-2 — `public/_headers` is Cloudflare-only; on Vercel every cache and security header vanishes (P1, conditional on host)

`public/_headers:29-38` is what pins `Cache-Control: no-cache` on `/sw.js` and `/index.html` — the entire mechanism that stops a new deploy being held hostage by cache. Vercel does not read `_headers`, and `vercel.json` declares no `headers` block, so on Vercel you also lose CSP, HSTS and `X-Content-Type-Options`. Same root cause as E-1.
*Fix:* single deploy target, or mirror `_headers` into `vercel.json`. *Files:* `vercel.json`, `public/_headers`.

### E-3 — Caches are purged before the reload; the live tab runs dead code (P2)

`skipWaiting()` at install (`public/sw.js:104`) + `activate` deleting every non-matching cache (`:112-114`) means the purge happens **before** the page reloads. Any lazy chunk the old page requests in that window 404s — or, under E-1, returns HTML. `src/lib/swUpdate.ts:40-44` widens the window arbitrarily by deferring the reload while the user types.
The user sees the generic error boundary and is never told a new version exists.
*Fix:* move `skipWaiting()` behind a client `postMessage`, and/or keep the previous version's cache for one generation in `activate`. *Files:* `public/sw.js:104,108-117`, `src/lib/swUpdate.ts:52-67`.

### E-4 — The "don't interrupt typing" guard misfires on app switch (P3)

`src/lib/swUpdate.ts:44` uses `window.addEventListener('blur', onBlur, true)`. That fires on element blur **and** when the whole window loses focus — i.e. switching apps on mobile, the single most common action. The reload then triggers while the user is away mid-input, discarding exactly the typed text the code exists to protect.
*Fix:* listen on the specific `document.activeElement`, or check `document.visibilityState` in `onBlur`. *Files:* `src/lib/swUpdate.ts:40-44`.

### E-5 — No update prompt exists anywhere; staleness is never surfaced (P2)

Convergence is entirely implicit force-reload (`src/lib/swUpdate.ts:66`). If `registration.update()` fails (offline, the 60 s throttle at `:80`, or a desktop tab that stays foregrounded for days so `visibilitychange` never fires), the tab runs an arbitrarily old build with **no signal at all**. `BUILD_LABEL` *is* rendered (`src/components/Footer.tsx:34`, `src/views/SettingsView.tsx:282`) but nothing compares it to the deployed `<meta name="qimmah-commit">` — which is trivially fetchable since `/index.html` is `no-cache`.
*Fix:* on the visibility check, `fetch('/index.html', {cache:'no-store'})`, parse `qimmah-commit`, compare to `BUILD_COMMIT`, show a dismissible "Update available" toast. *Files:* `src/lib/swUpdate.ts:69-88`, `src/lib/buildInfo.ts`, `src/components/MobileShell.tsx` (beside the offline banner at `:237`).

### E-6 — A failed `swVersionPlugin` ships a syntactically dead SW, silently (P2)

`vite.config.ts:86-88` catches and ignores. If it no-ops, `sw.js` ships with `const PRECACHE_ASSETS = __SW_PRECACHE_ASSETS__` — a `ReferenceError` that kills the entire worker — and `src/lib/swUpdate.ts:85-87` swallows the registration rejection. Net: no offline shell, no update mechanism, no error, and the app looks fine online. Caught only by `scripts/build-convergence-proof.mjs:74`, a separate npm script not part of `npm run build`.
*Fix:* make `closeBundle` throw when placeholders survive. *Files:* `vite.config.ts:74-89`.

### E-7 — Precache is regex-scraped from HTML; lazy chunks are never cached (P3)

`vite.config.ts:80` matches only `src=`/`href=` `/assets/*.{js,css}`. Route-level lazy chunks (`feature-nutrition-catalog` at `vite.config.ts:133-142`, `vendor-zxing` at `:127`) are not precached, so a first offline visit fails to load Nutrition/barcode. The SW's honest-failure policy (`public/sw.js:161-165`) is correct by design; what is missing is UI distinguishing "offline, never cached" from "broken".
*Fix:* offline-aware message on chunk-load failure. *Files:* `src/components/ErrorBoundary.tsx`.

**Checked and clear (not traps):** cache-first HTML — does not happen, navigations are network-first (`public/sw.js:130-138`); long-lived caches without a version key — `VERSION` is the commit SHA (`:23`) with real cleanup on activate (`:112-114`); stuck waiting worker — impossible given `skipWaiting()` at install.
