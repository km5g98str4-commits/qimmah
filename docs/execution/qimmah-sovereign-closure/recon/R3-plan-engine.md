# LANE R3 — PLAN GENERATION QUALITY

Repo: `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b`
Mode: **read-only**. Nothing under the repo was created, edited or deleted. All harnesses live in
`/private/tmp/claude-501/-Users-ziyad-qimmah-deploy/bb1e3adb-0bb3-45a3-a053-230987626595/scratchpad/recon/`
and bundle the *real* `src/` TypeScript with esbuild (same pattern as `scripts/run-plan-golden-proof.mjs`).

| Defect | Verdict |
|---|---|
| D1 target-weight direction | **CONFIRMED** (reachable without typing a wrong number) |
| D2 regeneration identity | **CONFIRMED** |
| D3 machine conversion is a no-op | **CONFIRMED** |
| D4 session-duration mismatch | **CONFIRMED** — 5 independent implementations, worst live spread 35 min |
| D5 first workout on "day 4" | **CONFIRMED** in both scheduling branches |
| D6 push/pull misclassification | **CONFIRMED** — reproduced verbatim (front raise on a pull day) |
| D7 inert fields | **CONFIRMED** — 7 profile fields change nothing |

Shared loader: `recon/load-engine.mjs` (installs a `localStorage`/`window` shim, bundles `src/`).

---

## D1 — TARGET WEIGHT DIRECTION · **CONFIRMED** · fault = **GENERATION + missing cross-field VALIDATION**

### Reproduction

```
cd .../scratchpad/recon
node d1-target-weight.mjs      # matrix: 3 goals x 5 ages x 6 weights x 3 heights, live V2 pipeline
node d1b-goal-switch.mjs       # faithful replay of StepBody's own reducers
```

### Verbatim output (`d1b-goal-switch.mjs`)

```
== SCENARIO 1: bulk user switches goal to cut in "تعديل خطتي" ==
 before: goalType=bulking weight=80 target=88 weeklyΔ=0.3 weeks=30 kcal=2878/2578
 after : goalType=cutting weight=80 target=88 weeklyΔ=0.3 weeks=30 kcal=2178/2578
 => CUT user, target 88kg ABOVE current 80kg; validateProfile=[]
 => generatePlan targets: targetCalories=2178 (deficit) weeklyWeightChangeKg=0.3 (GAIN) weeks=30

== SCENARIO 2: cut user edits ONLY current weight downward (default profile 86→70, target stays 78) ==
 before: goalType=cutting weight=86 target=78 weeklyΔ=-0.4
 after : goalType=cutting weight=70 target=78 weeklyΔ=0.3 weeks=30 kcal=2062/2462
 => CUT user, target ABOVE current, no validation error: []

== SCENARIO 3: full direction matrix over the goal-switch reducer ==
┌─────────┬───────────────┬───────────────┬────────┬────────┬────────┬─────────┬─────────────┬─────────────┐
│ (index) │ from          │ to            │ weight │ target │ dir    │ weeklyΔ │ kcalVsMaint │ CONTRADICTS │
├─────────┼───────────────┼───────────────┼────────┼────────┼────────┼─────────┼─────────────┼─────────────┤
│ 0       │ 'cutting'     │ 'bulking'     │ 80     │ 74     │ 'down' │ -0.4    │ 300         │ true        │
│ 1       │ 'cutting'     │ 'maintenance' │ 80     │ 74     │ 'down' │ -0.4    │ 0           │ false       │
│ 2       │ 'bulking'     │ 'cutting'     │ 80     │ 84     │ 'up'   │ 0.3     │ -400        │ true        │
│ 3       │ 'bulking'     │ 'maintenance' │ 80     │ 84     │ 'up'   │ 0.3     │ 0           │ false       │
│ 4       │ 'maintenance' │ 'cutting'     │ 80     │ 80     │ 'flat' │ 0       │ -400        │ true        │
│ 5       │ 'maintenance' │ 'bulking'     │ 80     │ 80     │ 'flat' │ 0       │ 300         │ true        │
└─────────┴───────────────┴───────────────┴────────┴────────┴────────┴─────────┴─────────────┴─────────────┘
```

**4 of 6 goal transitions leave a target weight that contradicts the newly chosen goal.**
In scenario 1 the same screen simultaneously says *"eat 400 kcal below maintenance"* **and**
*"you will gain 0.3 kg/week for 30 weeks"*.

### Root cause

1. `src/components/customizer/steps/StepBody.tsx:47-50` — `setGoal` writes **only** `goalType` + `goal`:
   ```ts
   const setGoal = (goalType: Profile['goalType']) => {
     if (minor && isWeightGoal(goalType)) return
     set({ goalType, goal: calorieGoalFromGoalType(goalType) })   // targetWeightKg untouched
   }
   ```
   and `set` (`StepBody.tsx:33-45`) immediately recomputes `computeTargets(next)` from the stale target.
2. `src/lib/validation.ts:52-62` — `validateProfile` is a **per-field range check only**. There is **no
   cross-field rule** `cutting ⇒ target < weight`. Returns `[]` for the contradictory profile.
3. `src/lib/calculators.ts:355-366` — `computeTargets` derives the projection **purely from
   `targetWeightKg - weightKg`**, while the calorie target comes from `goalType`
   (`calculators.ts:328-330`). The two never cross-check each other, so the sign of
   `weeklyWeightChangeKg` and the sign of the calorie delta are free to disagree.
4. Dead guard copy already exists but is **never referenced**:
   `src/i18n/dict/onboarding.ts:548-549` and `:975-976`
   (`targetWeightErrorCut` / `targetWeightErrorBulk`) — grep shows zero consumers.

### Secondary finding — two different derivation constants for the same number

`node d1-target-weight.mjs` PART A/D:

```
rows: 270 | direction contradictions (declared goal vs target): 0
rows where SAVED target !== REVEAL-SCREEN target: 180 of 270
w=60  adapter(cut)=54  planDerive(cutting)=55   adapter(bulk)=66  planDerive(bulking)=63
w=82  adapter(cut)=74  planDerive(cutting)=75   adapter(bulk)=90  planDerive(bulking)=86
w=100 adapter(cut)=90  planDerive(cutting)=92   adapter(bulk)=110 planDerive(bulking)=105
```

* `src/lib/onboardingV2Adapter.ts:90-96` — stored target = `round(w * 0.9)` / `round(w * 1.1)`
* `src/lib/planDerive.ts:26-30` — `deriveTargetWeight` = `round(w * 0.92)` / `round(w * 1.05)`
* `src/views/OnboardingV2.tsx:1182-1183` — the **handoff screen** draws `deriveTargetWeight(...)`,
  not the value that was saved. **180/270 adult rows show a target weight that differs from the one
  the plan's weeks/rate were computed from.** The file header of `RevealJourney.tsx` explicitly
  claims the two are the same source; they are not.

### Latent (blocked at the V2 UI, reachable via sync/import/legacy customizer)

`d1-target-weight.mjs` PART B: a minor who declared `bulk` stores `targetWeightKg = 90` against
`weightKg = 82` while `goalType` is forced to `maintenance` and calories are maintenance —
the profile/progress cards read that stored number (`profileV2Model.ts:191`, `progressV2Model.ts:150`).
`src/lib/onboardingProfile.ts:276` gates on the **raw** `op.goal.type`, not the age-effective goal.

### Minimal fix

* Add a **derived, non-editable** target weight, or a cross-field validator in
  `src/lib/validation.ts` (`cutting ⇒ target < weight`, `bulking ⇒ target > weight`,
  `maintenance ⇒ target === weight`), wired to the already-written error copy.
* In `StepBody.setGoal`, re-derive `targetWeightKg` via `deriveTargetWeight(p.weightKg, goalType)`
  whenever the new goal contradicts the current target.
* Collapse the two constants into **one** exported function (`planDerive.deriveTargetWeight`) and make
  `onboardingV2Adapter` call it; make `OnboardingV2.tsx:1182` read
  `loadOnboardingProfile()?.bodyMetrics?.targetWeightKg` instead of re-deriving.
* In `calculators.computeTargets`, refuse to emit a `weeklyWeightChangeKg` whose sign disagrees with
  the calorie delta — emit `0` + an honest note instead.

### Files to edit

`src/lib/validation.ts` · `src/components/customizer/steps/StepBody.tsx` ·
`src/lib/onboardingV2Adapter.ts` · `src/lib/planDerive.ts` · `src/views/OnboardingV2.tsx` ·
`src/lib/calculators.ts` · `src/lib/onboardingProfile.ts`

### Deepest correct authority

`src/lib/planDerive.ts::deriveTargetWeight` is the single legitimate source of a derived target weight;
`src/lib/validation.ts` is the correct home for the direction invariant.

---

## D2 — REGENERATION IDENTITY · **CONFIRMED** · fault = **COPY** (generation is correctly deterministic)

### Reproduction

```
node d2d3-regenerate.mjs
```

### Verbatim output

```
== D2: is generation deterministic? (SettingsView.regenerateFromProfile -> generatePlan(customization.profile)) ==
 gym-intermediate-cut: run1===run2 ? true | run1===run3(fresh clone) ? true | bytes=8168
 home-intermediate-cut: run1===run2 ? true | run1===run3(fresh clone) ? true | bytes=7229
 bodyweight-beginner: run1===run2 ? true | run1===run3(fresh clone) ? true | bytes=6528

 -> byte-identical output on every press. Success copy claims a NEW plan.
```

### Root cause

`src/views/SettingsView.tsx:77-95`:

```ts
const regenerateFromProfile = () => {
  const g = generatePlan(customization.profile)     // pure function of the unchanged profile
  ...
}
const onRegenerate = () => {
  if (!window.confirm(t.settings.regenerateConfirm)) return
  regenerateFromProfile()
  window.alert(t.settings.regenerateSuccess)        // unconditional success
}
```

`generatePlan` is deterministic **by design** — it is the guarantee `scripts/run-plan-golden-proof.mjs`
enforces (`NONDETERMINISM: ... is not byte-stable`). Determinism is not the bug; the copy is.

**Exact copy strings:**

| lang | file:line | text |
|---|---|---|
| ar | `src/config/strings.ts:606` | `'تم — سوّينا لك خطة جديدة من بياناتك الحالية.'` |
| en | `src/config/strings.ts:1080` | `'Your plan was regenerated from your current data.'` |
| ar (confirm) | `src/config/strings.ts:574-575` | `'بنسوّي لك خطة تمرين وتغذية جديدة من بياناتك الحالية، وبتحل مكان خطتك الحالية. تبي تكمّل؟'` |

«خطة **جديدة**» / "a **new** plan" is false: the output is byte-identical unless the profile changed.
The English string is already honest ("regenerated from your current data"); the Arabic is not.

### Minimal fix

Compare before/after (`JSON.stringify` of the six replaced slices) and branch the message:
identical ⇒ «خطتك أصلًا محدّثة على بياناتك الحالية — ما تغيّر شيء» ; different ⇒ name what changed.
Charter §5 ("no screen promises what did not happen") makes the silent-success alert the violation.

### Files to edit

`src/views/SettingsView.tsx` · `src/config/strings.ts`

### Deepest correct authority

`src/views/SettingsView.tsx::regenerateFromProfile` must return a change summary; `strings.ts` holds
the honest copy. The generator itself must **not** be made non-deterministic.

---

## D3 — MACHINE CONVERSION IS A NO-OP · **CONFIRMED** · fault = **MAPPING** (no input carries the intent)

### Reproduction

```
node d2d3-regenerate.mjs
```

### Verbatim output

```
== D3: "التحويل لنسخة الأجهزة" — onSwitchToMachines calls the SAME regenerateFromProfile() ==
 gym-intermediate-cut: exercises=28 changed-after-"convert"=0 | already-catalog-machines=24/28
 home-intermediate-cut: exercises=24 changed-after-"convert"=0 | already-catalog-machines=0/24
 bodyweight-beginner: exercises=20 changed-after-"convert"=0 | already-catalog-machines=0/20
```

### Root cause

1. `src/views/SettingsView.tsx:99-103` — `onSwitchToMachines` calls **the identical**
   `regenerateFromProfile()` used by `onRegenerate`. It passes no machine preference of any kind, then
   unconditionally alerts `switchMachinesSuccess`.
2. `src/lib/planGenerator.ts:712-719` — the machines-only pool is selected **solely** by gym access:
   ```ts
   const access = resolveGymAccess(p)
   const machinesOnly = access === 'full' || access === 'small'
   ```
   There is no `Profile` field expressing "I want the machines version".
   ⇒ **full/small-gym users are already machines-only before pressing the button** (24/28 catalog
   machines above; the other 4 are the appended accessories). **home/bodyweight users can never
   become machines-only by pressing it** — `makeEquipmentGate` (`src/lib/equipmentAccess.ts:30-46`)
   has no machine bucket for them.

Either way the diff is empty and the alert claims success.

**Copy:** `src/config/strings.ts:579` `'تم — خطتك التلقائية صارت بنسخة الأجهزة.'` ·
`:1053` `'Done — your auto plan is now the machines version.'` ·
confirm at `:577-578` / `:1051-1052` promises "catalog machine exercises only".

### Minimal fix

Either (a) delete the control — it is structurally meaningless once `machinesOnly` is derived from
gym access — or (b) add an explicit `Profile.preferMachines?: boolean`, make
`planGenerator.ts:713` read `machinesOnly = preferMachines ?? (access === 'full' || access === 'small')`,
and have `onSwitchToMachines` write that flag before regenerating. Then gate the alert on a real diff.

### Files to edit

`src/views/SettingsView.tsx` · `src/lib/planGenerator.ts` · `src/types/profile.ts` ·
`src/config/strings.ts`

### Deepest correct authority

`src/lib/planGenerator.ts:713` (`machinesOnly`) is where the intent must be readable; today the
intent has nowhere to live.

---

## D4 — SESSION DURATION MISMATCH · **CONFIRMED** · fault = **PRESENTATION** (five independent formulas)

### Reproduction

```
node d4-duration.mjs        # level x declared-duration
node d4b-duration-full.mjs  # place x declared x level, all five implementations side by side
```

### The five live implementations

| # | file:line | formula | where the user sees it |
|---|---|---|---|
| 1 | `src/views/OnboardingV2.tsx:944` and `:1343` | the raw declared answer | setup summary + Ready screen |
| 2 | `src/lib/todayV2Model.ts:161` | `profile.workoutDuration > 0 ? declared : estimate` | Today hero (`:366`, `:389`) |
| 3 | `src/lib/workoutV2Model.ts:127` | `max(20, round(n*9/5)*5)` | Workout screen chip (`WorkoutV2.tsx:1087`) |
| 4 | `src/views/WorkoutView.tsx:597-605` | `max(5, round(Σ sets*(rest+40)/60/5)*5)` | live workout view (`App.tsx:579`) |
| 5 | `src/features/customPlan/builder.ts:493-498` | duplicate of #3 | custom-plan "session too long" warning |
| — | `src/lib/workoutStats.ts:47-52` | `max(5, round(Σ sets*(40+rest)/60))` | **no live caller** (dead) |

`todayV2Model.ts:118` re-declares #3 as a private const rather than importing it — a sixth copy of
the same 9-min heuristic.

### Verbatim output (`d4b-duration-full.mjs`, excerpt)

```
│ place      │ declared │ level          │ ex │ ReadyScreen+Today │ WorkoutV2 chip │ WorkoutView est │ workoutStats(dead) │ max spread │
│ 'gym'      │ 30       │ 'intermediate' │ 5  │ 30                │ 45             │ 40              │ 40                 │ 15         │
│ 'gym'      │ 60       │ 'beginner'     │ 6  │ 60                │ 55             │ 40              │ 38                 │ 20         │
│ 'gym'      │ 75       │ 'beginner'     │ 7  │ 75                │ 65             │ 45              │ 43                 │ 30         │
│ 'home'     │ 45       │ 'beginner'     │ 4  │ 45                │ 35             │ 25              │ 26                 │ 20         │
│ 'home'     │ 60       │ 'beginner'     │ 5  │ 60                │ 45             │ 35              │ 33                 │ 25         │
│ 'home'     │ 75       │ 'beginner'     │ 6  │ 75                │ 55             │ 40              │ 38                 │ 35         │
│ 'machines' │ 75       │ 'beginner'     │ 7  │ 75                │ 65             │ 45              │ 43                 │ 30         │

Worst live spread: {"place":"home","declared":75,"level":"beginner","ex":6,
                    "ReadyScreen+Today":75,"WorkoutV2 chip":55,"WorkoutView est":40,"max spread":35}
```

**The founder's exact "75 vs ~40" is `place=home, level=beginner, declared=75`:** Ready screen and
Today say **75 دقيقة**, the live workout view says **40**. The chip on the V2 workout screen says a
third number (**55**).

### Root cause

`workoutDuration` is an **input** that the generator only uses to pick an exercise *count*
(`planGenerator.ts:100-110 targetExerciseCount`, ±2 around the experience base). Nothing ever computes
the session length from the plan's own sets/reps/rest and reconciles it with the declared answer, and
each screen picked a different heuristic. `todayV2Model` shows the *promise*, `WorkoutView` shows the
*workload* — and they are never compared.

### Minimal fix

One exported `sessionMinutes(day: PlanDay): number` in `src/lib/workoutStats.ts` (the physiological
`Σ sets*(rest+work)` version — it is the only one grounded in the plan's own numbers), imported by
`todayV2Model`, `workoutV2Model`, `WorkoutView`, and `customPlan/builder`. Delete the 9-min heuristic
and its three copies. Where the declared answer and the computed workload differ by more than ~10 min,
either adjust `targetExerciseCount` to close the gap or say the honest thing.

### Files to edit

`src/lib/workoutStats.ts` · `src/lib/workoutV2Model.ts` · `src/lib/todayV2Model.ts` ·
`src/views/WorkoutView.tsx` · `src/features/customPlan/builder.ts` · `src/lib/planGenerator.ts`

### Deepest correct authority

`src/lib/workoutStats.ts::estimateDurationMin` — already the correct formula, currently dead.

---

## D5 — FIRST WORKOUT ON "DAY 4" · **CONFIRMED** · fault = **GENERATION/scheduling** (no start anchor)

### Reproduction

```
node d5-first-day.mjs
```

### Verbatim output

```
plan days: [ 'اليوم 1 · علوي', 'اليوم 2 · سفلي', 'اليوم 3 · علوي', 'اليوم 4 · سفلي' ]

== BRANCH 1: guest opened the app BEFORE finishing setup (no saved plan yet) ==
 loadWeeklySchedule() -> null
 migration ledger now  -> {"workout-calendar-schedule-v1":{"doneAt":"2026-08-18T00:29:12.162Z"}}
 calendar key written  -> null
 re-running ensureCalendarMigrated() after setup completes -> {"status":"skipped"} (isMigrationDone gate: it never runs again)
 => scheduledDayFor() therefore uses legacyRotation: date.getDay() % plan.days.length

│ weekday │ date         │ source            │ planDayIndex │ shownAs          │
│ 'Sun'   │ '2026-08-16' │ 'legacy-rotation' │ 0            │ 'اليوم 1 · علوي' │
│ 'Mon'   │ '2026-08-17' │ 'legacy-rotation' │ 1            │ 'اليوم 2 · سفلي' │
│ 'Tue'   │ '2026-08-18' │ 'legacy-rotation' │ 2            │ 'اليوم 3 · علوي' │
│ 'Wed'   │ '2026-08-19' │ 'legacy-rotation' │ 3            │ 'اليوم 4 · سفلي' │
│ 'Thu'   │ '2026-08-20' │ 'legacy-rotation' │ 0            │ 'اليوم 1 · علوي' │
│ 'Fri'   │ '2026-08-21' │ 'legacy-rotation' │ 1            │ 'اليوم 2 · سفلي' │
│ 'Sat'   │ '2026-08-22' │ 'legacy-rotation' │ 2            │ 'اليوم 3 · علوي' │

== BRANCH 2: migration DID run (a plan was already saved at first calendar read) ==
 suggested weekday map (0=Sun..6=Sat): [1,"rest",2,3,"rest","rest",0]
│ weekday │ type       │ source     │ planDayIndex │ shownAs          │
│ 'Sun'   │ 'training' │ 'schedule' │ 1            │ 'اليوم 2 · سفلي' │
│ 'Mon'   │ 'rest'     │ 'schedule' │ '-'          │ 'rest'           │
│ 'Tue'   │ 'training' │ 'schedule' │ 2            │ 'اليوم 3 · علوي' │
│ 'Wed'   │ 'training' │ 'schedule' │ 3            │ 'اليوم 4 · سفلي' │
│ 'Thu'   │ 'rest'     │ 'schedule' │ '-'          │ 'rest'           │
│ 'Fri'   │ 'rest'     │ 'schedule' │ '-'          │ 'rest'           │
│ 'Sat'   │ 'training' │ 'schedule' │ 0            │ 'اليوم 1 · علوي' │
```

### Root cause

**Two independent faults, and both land on "اليوم 4" for a Wednesday finisher.**

1. **The calendar migration can be permanently consumed before there is anything to migrate.**
   `src/lib/workoutCalendar.ts:591-620 ensureCalendarMigrated` is called lazily from
   `loadWeeklySchedule()` (`:194-204`). If the very first calendar read happens **before** the user
   has a saved plan, `run()` returns early (`:601` `if (!hasSavedCustomization()) return`) and
   `verify()` returns `true` — so `runMigration` records success:
   `src/lib/dataOwnership.ts:177` writes `qimmah:migrations:v1 → {"workout-calendar-schedule-v1":{doneAt}}`,
   and `:136 if (isMigrationDone(def.id)) return {status:'skipped'}` blocks it **forever**, across
   reloads. The user finishes setup and **no weekly schedule is ever created**.
   Confirmed: `grep -rn "suggestedSchedule\|setTrainingWeekdays\|writeSchedule" src/` outside
   `workoutCalendar.ts` returns **zero hits** — there is no other writer and no UI to set training days.
2. **Fallback rotation is calendar-keyed, not user-keyed.**
   `src/lib/workoutCalendar.ts:406-409`:
   ```ts
   function legacyRotation(plan, date) {
     const index = date.getDay() % plan.days.length
     return { type: 'training', source: 'legacy-rotation', planDayIndex: index, day: plan.days[index] }
   }
   ```
   `getDay()` is 0=Sunday…6=Saturday. A 4-day plan on a **Wednesday** ⇒ `3 % 4 = 3` ⇒ **"اليوم 4"**.
3. Even in the healthy branch, `buildAssignments` (`:266-...`) maps plan day 0 to the *first training
   weekday of the week* (Saturday), never to the day the user finished setup — so a Wednesday finisher
   still gets index 3, and a Monday/Thursday/Friday finisher is greeted with **"rest"** as their
   very first day.

### Minimal fix

* In `ensureCalendarMigrated`, do **not** record completion when nothing was written — return before
  `runMigration`, or add a `skipIf`/`shouldRun` predicate to `runMigration` so a no-op is not a "done".
* Write the schedule at the moment the plan is created: call `suggestedSchedule(plan, trainingDays, 6)`
  from `onboardingProfile.buildPlanArtifactsFromOnboarding` / `assembleCustomization`.
* Anchor the rotation to the plan's own start: store `startedOn` on the `WorkoutPlan` (or the schedule)
  and make `buildAssignments` rotate so the user's first training day is `planDayIndex 0`.
* `legacyRotation` should either be removed or keyed to `daysSince(planStart) % days.length`.

### Files to edit

`src/lib/workoutCalendar.ts` · `src/lib/dataOwnership.ts` · `src/lib/onboardingProfile.ts` ·
`src/types/workout.ts` (for the start anchor)

### Deepest correct authority

`src/lib/workoutCalendar.ts` is the declared single source of truth for "which workout today"
(`workoutDaySource.ts` header). The anchor belongs there, not in any view.

---

## D6 — PUSH/PULL CLASSIFICATION · **CONFIRMED** · fault = **DATA taxonomy + MAPPING**

### Reproduction

```
node d6-split-classification.mjs
```

### Verbatim output — the founder's exact observation

```
--- PPL gym advanced 6d (templateId=gen-ppl-6) ---
  اليوم 2 · سحب (PULL):
     chest-supported-row-machine[PULL]
     iso-lateral-pulldown[PULL]
     rear-delt-row-machine[PULL]
       <<< WRONG SIDE lateral-raise-machine[PUSH]
       <<< WRONG SIDE shoulder-press-machine[PUSH]
     single-arm-lat-pulldown[PULL]
     preacher-curl-machine[PULL]
  اليوم 4 · دفع (PUSH):
     decline-chest-press-machine[PUSH]
     shoulder-press-machine[PUSH]
     iso-lateral-chest-press[PUSH]
       <<< WRONG SIDE reverse-pec-deck[PULL]
     assisted-dip-machine[PUSH]
     chest-press-machine[PUSH]
     cable-triceps-pushdown[PUSH]

--- Upper/Lower gym 4d ---   (home profile)
  اليوم 1 · علوي: barbell-bench-press, barbell-row, arnold-press, chest-supported-row,
                   decline-barbell-press, front-raise[PUSH]
```

```
>>> exercises that landed on the wrong side of a push/pull split:
┌──────────────────────────┬───────────────┬─────────────────┬─────────────┬──────────────────────────┬──────────┐
│ id                       │ primaryMuscle │ movementPattern │ role        │ detailed                 │ landedOn │
├──────────────────────────┼───────────────┼─────────────────┼─────────────┼──────────────────────────┼──────────┤
│ 'lateral-raise-machine'  │ 'shoulders'   │ 'isolation'     │ 'isolation' │ 'side_delts'             │ 'PULL'   │
│ 'shoulder-press-machine' │ 'shoulders'   │ 'push'          │ 'compound'  │ 'front_delts+side_delts' │ 'PULL'   │
│ 'reverse-pec-deck'       │ 'shoulders'   │ 'isolation'     │ 'isolation' │ 'rear_delts'             │ 'PUSH'   │
│ 'front-raise'            │ 'shoulders'   │ 'isolation'     │ 'isolation' │ 'front_delts'            │ 'PULL'   │
│ 'pike-push-up'           │ 'shoulders'   │ 'push'          │ 'compound'  │ 'side_delts+front_delts' │ 'PULL'   │
└──────────────────────────┴───────────────┴─────────────────┴─────────────┴──────────────────────────┴──────────┘
```

### Which field assigns an exercise to push/pull/legs

**Only two**, and both are too coarse:

* `Exercise.primaryMuscle` — `src/types/workout.ts:5-18`, the enum is
  `chest | back | shoulders | biceps | triceps | legs | …`. **There is no rear/side/front delt
  distinction at this level.**
* `Exercise.movementPattern` — `src/types/workout.ts:20-26`
  (`push | pull | squat | hinge | lunge | isolation | …`), used only to derive
  compound-vs-isolation (`planGenerator.ts:139-141 exerciseRole`).

The slot table is `src/lib/planGenerator.ts:277-348 SLOTS` and the backfill list is
`src/lib/planGenerator.ts:350-360 TYPE_MUSCLES`:

```
planGenerator.ts:325   pull slot #4:  { muscles: ['shoulders'], role: 'isolation' }
planGenerator.ts:316   push slot #4:  { muscles: ['shoulders'], role: 'isolation' }
planGenerator.ts:354   push: ['chest', 'shoulders', 'triceps']
planGenerator.ts:355   pull: ['back',  'biceps',    'shoulders']    <-- 'shoulders' is in BOTH
```

The pull-day shoulder slot carries **no `patterns` constraint**, so *any* `primaryMuscle === 'shoulders'`
isolation exercise satisfies it. Candidates are then sorted alphabetically
(`planGenerator.ts:406-416 sortCandidates`, machines first for beginners), and the intended rear-delt
exercise is only one of six equally eligible ids. `TYPE_MUSCLES.pull` including `'shoulders'` lets
the backfill loop (`planGenerator.ts:487-500`) put a shoulder **press** on a pull day.

**The correct data already exists but the generator never reads it**: every exercise carries
`primaryMusclesDetailed` (`src/data/exercises.ts:195-217`, from `muscleDetailById` at `:23-…`) with
`front_delts` / `side_delts` / `rear_delts`. The generator uses the coarse field exclusively.

### Full-catalog audit — every misclassified assignment

| id | primaryMuscle | movementPattern | role | `primaryMusclesDetailed` | true function | wrong because |
|---|---|---|---|---|---|---|
| `front-raise` | shoulders | isolation | isolation | `front_delts` | **PUSH** | eligible for pull slot #4 |
| `lateral-raise` | shoulders | isolation | isolation | `side_delts` | **PUSH** | eligible for pull slot #4 |
| `cable-lateral-raise` | shoulders | isolation | isolation | `side_delts` | **PUSH** | eligible for pull slot #4 |
| `lateral-raise-machine` | shoulders | isolation | isolation | `side_delts` | **PUSH** | observed on a pull day |
| `seated-lateral-raise` | shoulders | isolation | isolation | `side_delts+front_delts` | **PUSH** | eligible for pull slot #4 |
| `arm-circles` | shoulders | mobility | isolation | `side_delts+front_delts` | PUSH | mobility, still pull-slot eligible |
| `shoulder-dislocates` | shoulders | mobility | isolation | `side_delts+front_delts` | PUSH | mobility, still pull-slot eligible |
| `rear-delt-fly` | shoulders | isolation | isolation | `rear_delts` | PULL | **correct**, but competes alphabetically |
| `reverse-pec-deck` | shoulders | isolation | isolation | `rear_delts` | PULL | observed on a **push** day |
| `shoulder-press-machine` | shoulders | push | compound | `front_delts+side_delts` | PUSH | observed on a **pull** day (backfill) |
| `pike-push-up` | shoulders | push | compound | `side_delts+front_delts` | PUSH | observed on a **pull** day (backfill) |
| `upright-row` | shoulders | **pull** | compound | `side_delts+front_delts` | PUSH | pattern says pull, anatomy says push |
| `face-pull` | shoulders | pull | compound | `rear_delts` | PULL | pull-correct but filed under `shoulders`, so push-eligible |
| `rear-delt-row-machine` | **back** | pull | compound | `rear_delts+upper_back` | PULL | rear-delt work filed under `back` |
| `cable-rear-delt-fly` | shoulders | isolation | isolation | `side_delts+front_delts` | **PUSH** | **DATA BUG** — a *rear*-delt fly with no `rear_delts`; missing from `muscleDetailById`, falls back to `coarseToDetailed['shoulders']` |

### Minimal fix

* Smallest correct change: give the push/pull shoulder slots an explicit **id allow-list or a
  detailed-muscle predicate**, e.g. pull slot #4 filters `primaryMusclesDetailed.includes('rear_delts')`
  and push slot #4 filters `front_delts|side_delts`; remove `'shoulders'` from `TYPE_MUSCLES.pull`
  (mirroring the comment already applied to `arms` at `:356-358`).
* Add `'cable-rear-delt-fly': { primary: ['rear_delts'], secondary: ['upper_back'] }` to
  `muscleDetailById` in `src/data/exercises.ts`.
* Longer term: split the coarse `Muscle` enum's `shoulders` into `front_delts|side_delts|rear_delts`,
  or make the slot matcher read `primaryMusclesDetailed` throughout.

### Files to edit

`src/lib/planGenerator.ts` (SLOTS `:277-348`, TYPE_MUSCLES `:350-360`, `pickForSlot` `:449-467`) ·
`src/data/exercises.ts` (`muscleDetailById`) · optionally `src/types/workout.ts`

### Deepest correct authority

`src/lib/planGenerator.ts::SLOTS` / `TYPE_MUSCLES` decide the assignment; `src/data/exercises.ts::
muscleDetailById` holds the anatomy that already answers the question correctly.

---

## D7 — WHICH INPUTS ACTUALLY CHANGE THE OUTPUT · **CONFIRMED (7 inert fields)**

### Reproduction

```
node d7-field-sensitivity.mjs
node dbg.mjs                  # drill-down on muscleFocus, injuries and equipment
```

### Verbatim output (one field changed at a time from a fixed baseline)

```
│ field                                      │ exercise ids │ day count        │ day names │ sets/reps/rest │ ex/day           │ calories/macros │ nutrition plan │ weekly schedule │
│ 'trainingLevel: intermediate->beginner'    │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'CHANGED (7->6)' │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'trainingLevel: intermediate->advanced'    │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'trainingLevel ONLY (experienceBand kept)' │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'trainingDays: 4->3'                       │ 'CHANGED'    │ 'CHANGED (4->3)' │ 'CHANGED' │ 'CHANGED'      │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'CHANGED'       │
│ 'trainingDays: 4->6'                       │ 'CHANGED'    │ 'CHANGED (4->6)' │ 'CHANGED' │ 'CHANGED'      │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'CHANGED'       │
│ 'workoutDuration: 60->30'                  │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'CHANGED (7->5)' │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'workoutDuration: 60->90'                  │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'CHANGED (7->9)' │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'muscleFocus: balanced->chest'             │ 'inert'      │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'muscleFocus: balanced->back'              │ 'inert'      │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'muscleFocus: balanced->lower'             │ 'inert'      │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'goalType: cutting->bulking'               │ 'inert'      │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'inert'         │
│ 'gymAccess: full->small'                   │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'gymAccess: full->home'                    │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'CHANGED (7->6)' │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'gymAccess: full->bodyweight'              │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'CHANGED (7->6)' │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'activityLevel: moderate->very_active'     │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'inert'         │
│ 'gender: male->female'                     │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'inert'         │
│ 'age: 30->17 (minor)'                      │ 'inert'      │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'CHANGED'       │ 'CHANGED'      │ 'inert'         │
│ 'injuries: none->knee'                     │ 'CHANGED'    │ 'inert'          │ 'inert'   │ 'CHANGED'      │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'injuries: none->shoulder'                 │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'mealsPerDay: 4->6'                        │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'CHANGED'      │ 'inert'         │
│ 'nutritionStyle -> simple_guidance'        │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'equipment: full list -> []'               │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'preferredDays: [0,1,2,3]->[2,3,4,5]'      │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'CHANGED'       │
│ 'consistency: regular->never'              │ 'inert'      │ 'inert'          │ 'inert'   │ 'inert'        │ 'inert'          │ 'inert'         │ 'inert'        │ 'inert'         │
│ 'splitMode auto->advanced/push_pull_legs'  │ 'CHANGED'    │ 'CHANGED (4->6)' │ 'CHANGED' │ 'CHANGED'      │ 'CHANGED'        │ 'CHANGED'       │ 'CHANGED'      │ 'CHANGED'       │
```

```
== exercise count per (level x duration) — the only lever duration pulls ==
 beginner      30min=4  45min=5  60min=6  75min=7  90min=8
 intermediate  30min=5  45min=6  60min=7  75min=8  90min=9
 advanced      30min=5  45min=6  60min=7  75min=8  90min=9

== muscleFocus detail: what exactly changes ==
 days=4 focus=chest      -> اليوم 1 · علوي | اليوم 2 · سفلي | اليوم 3 · علوي | اليوم 4 · سفلي
 days=5 focus=chest      -> ... | اليوم 5 · علوي (مركّز)
 days=5 focus=lower      -> ... | اليوم 5 · أرجل (مركّز)
 days=5 focus=core       -> ... | اليوم 5 · بطن وكور
```

### Per-field verdict

| field | verdict |
|---|---|
| `trainingDays` | **fully live** — split, day count, names, schedule, nutrition |
| `splitMode` / `splitChoice` | **fully live** |
| `workoutDuration` | **partially live** — changes exercise *count* only (±2). No effect on sets, rest or displayed duration (see D4). |
| `trainingLevel` | **INERT on its own.** `expTier` (`planGenerator.ts:62-77`) reads `experienceBand` **first** and only falls back to `trainingLevel` when the band is absent. `StepBody.tsx:127-131` exposes a `trainingLevel` dropdown and never touches `experienceBand` ⇒ **the "training level" control in "تعديل خطتي" does nothing for any profile built by the V2 onboarding.** |
| `muscleFocus` | **nearly inert.** At ≤4 days it changes **zero** exercises; it only adds +1 set to focused-muscle compounds (`chest-press-machine 4x→5x`). It only reshapes the split at **5 days**, renaming day 5. `advanced`/`arms`/`balanced` produce identical day-5 output. |
| `gymAccess: full ↔ small` | **INERT** — both hit the `machinesOnly` branch (`planGenerator.ts:713`) with the identical 32-machine pool. |
| `Profile.equipment` | **INERT everywhere.** `makeEquipmentGate` (`src/lib/equipmentAccess.ts:30-46`) never reads `p.equipment`; it buckets on `gymAccess` only. Verified at home too: `[]` and `['dumbbell','bench','bands']` give the identical plan. Worse, the `home` bucket allows `'barbell'` ⇒ a home user is prescribed `barbell-bench-press` and `decline-barbell-press`. |
| `injuries: 'shoulder'` | **INERT at any gym profile** (`makeInjuryFilter` excludes nothing from the 32-machine pool). At home it swaps one press but still prescribes `front-raise` to a shoulder-injured user. `'knee'` works. |
| `consistency` | **INERT** in the generator. |
| `nutritionStyle` | **INERT** in the generator (it is a display style consumed elsewhere). |
| `activityLevel`, `gender`, `age` | live for calories/macros only, as designed. |
| `preferredDays` | affects `weeklySchedule` only — and that row is **not** what `scheduledDayFor` reads (see D5). |

### Minimal fix

* Make `expTier` reconcile `trainingLevel` and `experienceBand` (or hide the dropdown in `StepBody`).
* Make `makeEquipmentGate` intersect the bucket with `p.equipment` when the list is non-empty, and drop
  `'barbell'` from the `home` allow-list (or gate it on the equipment list).
* Either make `muscleFocus` actually bias slot selection, or stop asking for it.
* Extend `detectInjuries`/`makeInjuryFilter` coverage to the machine catalog.

### Files to edit

`src/lib/planGenerator.ts` · `src/lib/equipmentAccess.ts` ·
`src/components/customizer/steps/StepBody.tsx`

---

## Fault classification summary

| Defect | DATA | MAPPING | GENERATION | PRESENTATION | COPY | Deepest correct authority |
|---|---|---|---|---|---|---|
| D1 target weight | | | ✔ | | ✔ | `planDerive.deriveTargetWeight` + `validation.validateProfile` |
| D2 regenerate | | | | | ✔ | `SettingsView.regenerateFromProfile` (must return a diff) |
| D3 machines | | ✔ | | | ✔ | `planGenerator.ts:713 machinesOnly` (intent has no field) |
| D4 duration | | | | ✔ | | `workoutStats.estimateDurationMin` |
| D5 day 4 | | | ✔ | | | `workoutCalendar` (+ `dataOwnership.runMigration` no-op ledger) |
| D6 push/pull | ✔ | ✔ | | | | `planGenerator SLOTS/TYPE_MUSCLES` + `exercises.muscleDetailById` |
| D7 inert fields | | ✔ | ✔ | | | `planGenerator.expTier` · `equipmentAccess.makeEquipmentGate` |

## Union of files needing edits

```
src/lib/planGenerator.ts
src/lib/calculators.ts
src/lib/validation.ts
src/lib/planDerive.ts
src/lib/onboardingV2Adapter.ts
src/lib/onboardingProfile.ts
src/lib/equipmentAccess.ts
src/lib/workoutCalendar.ts
src/lib/dataOwnership.ts
src/lib/workoutStats.ts
src/lib/workoutV2Model.ts
src/lib/todayV2Model.ts
src/data/exercises.ts
src/views/SettingsView.tsx
src/views/OnboardingV2.tsx
src/views/WorkoutView.tsx
src/components/customizer/steps/StepBody.tsx
src/features/customPlan/builder.ts
src/config/strings.ts
src/types/profile.ts        (new: preferMachines)
src/types/workout.ts        (optional: plan start anchor / delt split)
```

## Nothing was NOT REPRODUCED

All seven items were reproduced with a runnable proof. Two carry a caveat:

* **D1** — the founder-visible route is *editing an existing plan* (`StepBody`), not the first pass
  through `OnboardingV2` (which derives the target and cannot be typed wrong). The minor variant is
  currently blocked at the V2 goal step (`goalAllowedForEligibility`) but stays reachable via sync,
  import or the legacy customizer.
* **D2** — determinism itself is a deliberate, gate-enforced guarantee. The defect is strictly the
  Arabic success copy claiming «خطة جديدة».
