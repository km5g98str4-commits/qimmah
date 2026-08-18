# R2 — INJURY / CONTRAINDICATION SAFETY

Repo `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b`
Read-only forensic. No repo file was created, edited, or deleted. All harnesses live under this
scratchpad and bundle `src/` with esbuild (same pattern as `scripts/run-plan-golden-proof.mjs`).

Scope note: this is **exercise suitability**, not diagnosis. Nothing here is a medical claim.

---

## 0. ROOT CAUSE — ONE SENTENCE

> The injury answer is captured, serialized and parsed **correctly**, and the generator **does**
> call an injury filter — but that filter's only knowledge of danger is a **hand-written denylist of
> 94 exercise ids** in `planGenerator.ts`, and because no exercise in the 181-item catalog carries
> any contraindication metadata, every movement not personally typed into that list passes the gate:
> the shoulder list is **4 ids long**, so `dumbbell-shoulder-press`, `front-raise` and
> `overhead-triceps-extension` were never candidates for exclusion at all.

**Which layer is broken (of the four offered):** **(c) — parsed, but no contraindication data on
exercises.** Not (a): the answer is stored. Not (b): the values are stable English keys in *both*
locales and round-trip through the Arabic comma cleanly. Not (d): the filter *is* called, at
`planGenerator.ts:705-706` and applied at `:719` and `:723`.

The most damning single artifact: with `knee+shoulder` declared, the filter **fires**, correctly
removes `arnold-press` (which *is* on the 4-id shoulder list) — and the slot-filler then substitutes
**`dumbbell-shoulder-press`**, the identical overhead-loading mechanism, because it is not on the
list. The safety layer did work; it just does not know what a shoulder is.

---

## 1. WHERE INJURIES ARE CAPTURED AND SERIALIZED

### 1.1 Capture — stable keys, not localized text

| Layer | file:line | value |
|---|---|---|
| UI question | `src/views/OnboardingV2.tsx:1059-1075` (`questionId="limitations.injury_areas"`) | multi-select chips |
| Option source | `src/design-system/v2/labels.ts:265-272` (ar) and `:360-367` (en) | **identical `value` keys in both locales** |
| Keys | — | `knee` · `shoulder` · `lower_back` · `wrist` · `elbow` · `ankle` |
| Duplicate list (v1 customizer) | `src/data/planBuilder.ts:206-213` (`injuryChoices`) | same six keys |
| Gate on the follow-up | `src/lib/onboardingV2Flow.ts:63` (`injuryAreasApply`), cleared at `:446` if `hasInjury` is not true | |
| Free-text second path | `src/components/customizer/steps/StepBody.tsx:146` | **arbitrary user prose** into the same field |

So the option values are **stable keys**, and they are the same keys in Arabic and English. Locale
does not change what is stored.

### 1.2 Serialization — array joined with an ARABIC comma

**Writer** — `src/lib/onboardingProfile.ts:303`

```ts
injuries: op.limitations.injuries.join('، '),   // U+060C ARABIC COMMA + space
```

`Profile.injuries` is declared as a plain `string` at `src/types/profile.ts:64`. Verified live
value for a knee+shoulder user: `"knee، shoulder"`.

**Reader (round-trip back to structured)** — `src/lib/onboardingProfile.ts:483`

```ts
const injuries = (p.injuries ?? '').split(/[،,]/).map((s) => s.trim()).filter(Boolean)
```

Accepts both the Arabic comma and the ASCII comma. Round-trip is lossless.

**Reader (the one that matters — the generator)** — `src/lib/planGenerator.ts:194-207`

```ts
function detectInjuries(injuries?: string): Set<InjuryArea> {
  const out = new Set<InjuryArea>()
  if (!injuries) return out
  const t = injuries.toLowerCase()
  if (/knee|ركبة|ركب/.test(t)) out.add('knee')
  if (/shoulder|كتف|أكتاف|اكتاف/.test(t)) out.add('shoulder')
  if (/back|lower_back|ظهر|عمود/.test(t)) out.add('back')
  ...
```

It does not split at all — it substring-matches the whole string. So the delimiter is irrelevant to
the generator and the Arabic comma is **not** the bug.

### 1.3 Full path, profile → generated exercise ids

```
OnboardingV2.tsx:308  injuries: hasInjury === true ? injuries : []      (string[] of keys)
  → onboardingV2Adapter.ts:134   injuries: [...choices.injuries]        (Answers)
  → planBuilderAnswers.ts:128    limitations: { hasInjury, injuries }   (OnboardingProfile)
  → onboardingProfile.ts:303     injuries: injuries.join('، ')          (Profile — STRING)
  → onboardingProfile.ts:357-366 buildPlanArtifactsFromOnboarding → generatePlan(profile)
  → planGenerator.ts:1110        generatePlan
  → planGenerator.ts:694-770     generateWorkoutPlan
       :705  detectInjuries(p.injuries)
       :706  makeInjuryFilter(areas)
       :719  machines-only pool  … && injuryOk(ex) && …
       :723  general pool        … && injuryOk(ex) && …
       :752  pickAccessory(...)  ← NO injury argument (see §2, gap #2)
```

---

## 2. EVERY CONSUMER THAT READS INJURIES

| # | file:line | what it actually does |
|---|---|---|
| 1 | `planGenerator.ts:194-207` `detectInjuries` | regex maps free text → one of six `InjuryArea` |
| 2 | `planGenerator.ts:208-210` `hasRecognizedInjuryArea` (exported) | boolean — "did any regex hit" |
| 3 | `planGenerator.ts:215-257` `INJURY_RISKY_IDS` | **the entire safety model**: 94 hardcoded ids across 6 areas |
| 4 | `planGenerator.ts:259-266` `makeInjuryFilter` | `(ex) => !banned.has(ex.id)` — pure id membership |
| 5 | `planGenerator.ts:705-706, 719, 723` | the only place the filter is applied — at pool construction |
| 6 | `planGenerator.ts:1141-1144` | pushes an Arabic warning **claiming** the filter protected the user |
| 7 | `planRationale.ts:239-321` | "why this plan" surfaces `injuryFilter: applied` when `hasRecognizedInjuryArea` is true |
| 8 | `src/lib/workoutSubstitution.ts:54-75` `findSubstitutes` | **receives the full `Profile` and never reads `.injuries`** — zero matches for `injur` in the file |
| 9 | `src/lib/syncFieldPolicy.ts:62` | sync allow-list entry `limitations.injuries` (transport only) |
| 10 | `src/lib/exerciseGuidance.ts:128,197` | generic prose ("check with a professional") — not a filter |
| 11 | `src/lib/personalization/**` | the frozen 193-question engine — not wired to any UI (charter §8.7) |
| 12 | `src/components/customizer/steps/StepBody.tsx:146` | free-text writer into the same string |

**Nothing else filters.** `grep` for `contraindication` across `src/` returns **zero hits**.
No script in `test:gate` (130+ proofs) contains `injur` — there is **no guard at all** on this.

### Gap #2 (secondary, same root): accessory slot bypasses the filter entirely

`planGenerator.ts:752` calls `pickAccessory(cat, variation, new Set(ids), tier)`; the function at
`:394-404` filters only by `cableOk`. It never receives `injuryOk`. It is currently harmless only
because `ACCESSORY_POOL` (`:366-371`) happens to hold six machine/cable ids — a coincidence, not a
control.

### Gap #3 (secondary, same root): live substitution is injury-blind

`findSubstitutes` (`workoutSubstitution.ts:54`) keeps `movementPattern` and `primaryMuscle` as hard
rules. So a knee-injured user who taps "swap" on a squat is offered **another squat**, by design,
with the injury field sitting unread in the `profile` argument it already holds.

---

## 3. THE CATALOG — NO CONTRAINDICATION METADATA EXISTS

`src/data/exercises.ts` → **181 exercises**. `Exercise` (`src/types/workout.ts:35-65`) fields:

```
id, nameAr, nameEn, primaryMuscle, secondaryMuscles, primaryMusclesDetailed,
secondaryMusclesDetailed, equipment, level, movementPattern, environment,
defaultSets, defaultReps, defaultRestSec, videoUrl, videoSource, alternatives,
notesAr, notesEn, howToEn, techniqueTipsEn, commonMistakesEn, safetyNotesEn,
techniqueTipsAr, commonMistakesAr, safetyNotesAr
```

**Fields matching `/contra|injur|avoid|restrict|risk/`: NONE.**

What *does* exist and is usable as the raw material for a real model:

- `movementPattern` — `isolation 58 · push 30 · pull 24 · hinge 16 · core 16 · cardio 12 · squat 11 · mobility 10 · lunge 4`
- `equipment` — `band, barbell, bench, bodyweight, cable, dumbbell, ez-bar, kettlebell, machine, plate, rope, smith`
- `primaryMuscle` + `primaryMusclesDetailed` / `secondaryMusclesDetailed` (`MuscleId[]`, e.g. `front_delts`)

**Is there anything that could express "this movement loads the shoulder overhead"?** No. Nothing
distinguishes `dumbbell-bench-press` (horizontal push) from `dumbbell-shoulder-press` (overhead
push) — both are `movementPattern: 'push'`, `equipment: ['dumbbell']`, and both list `front_delts`.
The one distinguishing fact — the arm passes above the head under load — is **not represented
anywhere in the data model**. That is the whole defect, in one line.

Denylist audit (`R2-catalog-audit.txt`): all 94 listed ids **do** exist in the catalog (0 dead ids),
so the list is not rotted — it is simply, and unfixably-by-hand, incomplete:

```
knee      listed= 13   shoulder  listed=  4   back  listed=  9
wrist     listed= 34   elbow     listed= 22   ankle listed= 12
TOTAL listed ids = 94, dead = 0   |   catalog size = 181
```

`shoulder: new Set(['overhead-press', 'push-press', 'upright-row', 'arnold-press'])`
— `planGenerator.ts:223`. Four ids. That is the entire shoulder safety model.

---

## 4. RED REPRODUCTION (verbatim)

Harness: `repro-injury.mjs` / `find-founder.mjs` — builds the profile through the **real live path**
(`toAnswersFromV2` → `buildOnboardingProfile` → `toLegacyProfile` → `generatePlan`), no shortcuts.

### 4.1 Exact founder configuration — all five named movements reproduced

`R2-founder-exact-repro.txt`, verbatim:

```
BEST MATCH to founder report: 5 of 5 named movements
config = {"place":"home","days":5,"duration":75,"level":"never","goal":"cut"}
Profile.injuries = "knee، shoulder"  gymAccess= home  level= beginner
matched = dumbbell-shoulder-press, front-raise, overhead-triceps-extension, goblet-squat, bodyweight-squat
--- gen-1-upper
    barbell-bench-press             | Barbell Bench Press           | barbell+bench
    barbell-row                     | Barbell Row                   | barbell
    dumbbell-shoulder-press         | Dumbbell Shoulder Press       | dumbbell  <<< FOUNDER-REPORTED UNSAFE
    chest-supported-row             | Chest-Supported Row           | dumbbell+bench
    decline-barbell-press           | Decline Barbell Press         | barbell+bench
    front-raise                     | Front Raise                   | dumbbell  <<< FOUNDER-REPORTED UNSAFE
--- gen-2-lower
    bodyweight-squat                | Bodyweight Squat              | bodyweight  <<< FOUNDER-REPORTED UNSAFE
    dumbbell-rdl                    | Dumbbell RDL                  | dumbbell
    goblet-squat                    | Goblet Squat                  | dumbbell  <<< FOUNDER-REPORTED UNSAFE
    banded-lateral-walk             | Banded Lateral Walk           | band
    bodyweight-calf-raise           | Bodyweight Calf Raise         | bodyweight
    bicycle-crunch                  | Bicycle Crunch                | bodyweight
--- gen-3-upper
    chest-dip                       | Chest Dip                     | bodyweight
    chin-up                         | Chin-Up                       | bodyweight
    dumbbell-shoulder-press         | Dumbbell Shoulder Press       | dumbbell  <<< FOUNDER-REPORTED UNSAFE
    barbell-row                     | Barbell Row                   | barbell
    decline-dumbbell-press          | Decline Dumbbell Press        | dumbbell+bench
    front-raise                     | Front Raise                   | dumbbell  <<< FOUNDER-REPORTED UNSAFE
--- gen-4-lower
    dumbbell-sumo-squat             | Dumbbell Sumo Squat           | dumbbell
    frog-pump                       | Frog Pump                     | bodyweight
    bodyweight-squat                | Bodyweight Squat              | bodyweight  <<< FOUNDER-REPORTED UNSAFE
    hip-thrust                      | Hip Thrust                    | barbell+bench
    single-leg-calf-raise           | Single-Leg Calf Raise         | dumbbell+bodyweight
    crunch                          | Crunch                        | bodyweight
--- gen-5-arms
    dumbbell-shoulder-press         | Dumbbell Shoulder Press       | dumbbell  <<< FOUNDER-REPORTED UNSAFE
    front-raise                     | Front Raise                   | dumbbell  <<< FOUNDER-REPORTED UNSAFE
    barbell-curl                    | Barbell Curl                  | barbell
    dumbbell-kickback               | Dumbbell Kickback             | dumbbell
    concentration-curl              | Concentration Curl            | dumbbell
    overhead-triceps-extension      | Overhead Triceps Extension    | dumbbell  <<< FOUNDER-REPORTED UNSAFE
```

### 4.2 The filter fires, and the plan lies about it

Same run, 4-day home case (`R2-red-proof.txt` head), verbatim tail:

```
  hasRecognizedInjuryArea() = true
  WARNINGS: ["بدأنا بحجم أخفّ هذا الأسبوع لبداية آمنة — زِد تدريجيًا بعدها.",
             "راعينا مناطق الإصابة التي تعرّفنا عليها باستبعاد التمارين المطابقة لقائمة المخاطر واختيار بدائل لنفس العضلات."]
  >>> UNSAFE COUNT = 7  (RED)
```

The plan tells the user, in Arabic, that risky exercises were excluded and safer alternatives for
the same muscles were chosen — while handing them a dumbbell overhead press. Charter §5 ("no screen
promises what does not happen") and the `planRationale` "injuryFilter: applied" driver
(`planRationale.ts:316-321`) are both violated by the same defect.

**Proof the filter is alive, not dead:** with `knee` only, the same slot yields `arnold-press`
(unfiltered — it is only on the *shoulder* list). With `knee+shoulder`, `arnold-press` disappears
and **`dumbbell-shoulder-press` takes its place**. The gate ran; the denylist was blind.

### 4.3 Sweep — this is not an edge case

`R2-sweep.txt`, verbatim:

```
SWEEP over 720 knee+shoulder configurations (place x days x duration x level x goal)
configurations prescribing >=1 contraindicated movement: 720/720 (100.0%)

movement                        | times prescribed to a knee+shoulder user
shoulder-press-machine          | 1200
leg-press-machine               | 1056
dumbbell-shoulder-press         | 480
bodyweight-squat                | 384
dumbbell-sumo-squat             | 240
chest-dip                       | 240
front-raise                     | 240
chin-up                         | 192
goblet-squat                    | 192
overhead-triceps-extension      | 48
```

Restricting the count to **only the five movements the founder named plus their exact-mechanism
twins** (`shoulder-press-machine`, `cable-shoulder-press`, `seated-dumbbell-press`) — i.e. removing
every judgement call of mine — the result is unchanged (`R2-strict.txt`):

```
STRICT (founder-named movements + exact-mechanism twins only):
  720/720 knee+shoulder configurations prescribe at least one. (100.0%)
```

*Honest caveat on `leg-press-machine`:* the source comment at `planGenerator.ts:216` says leg press
is **deliberately retained** as the safer knee alternative. I flagged it in the wide sweep by my own
joint-loading heuristic; it is a defensible product choice, not a bug. It is excluded from the
STRICT count above. The strict count is the load-bearing number.

### 4.4 Single injury, and locale

`R2-red-proof.txt` cases 4–6:

- `shoulder` alone @ home → **4** contraindicated prescriptions (RED).
- `knee` alone @ home → **3** (RED).
- `lower_back` alone @ home → 0 by my flag set (the 9-id back list happens to cover the deadlift
  family the home pool would have drawn); not evidence the model is sound, only that this one list
  is longer.
- no injury (control) → 0, and the injury warning is correctly absent.

**Locale dependence: NONE for the onboarding path.** `labels.ts` ships the *same* `value` keys
(`knee`, `shoulder`, …) in the Arabic and English blocks, so `Profile.injuries` is
`"knee، shoulder"` regardless of UI language. Verified (`R2-locale.txt`):

```
onboarding key AR/EN (identical):          "knee، shoulder"        recognized=true
onboarding single key:                     "shoulder"              recognized=true
onboarding lower_back key:                 "lower_back"            recognized=true
free text AR (StepBody placeholder):       "ألم أسفل الظهر"        recognized=true
free text AR knee:                         "ألم في الركبة"         recognized=true
free text EN:                              "shoulder impingement"  recognized=true
free text AR rotator cuff:                 "تمزق الروتيتر كاف"     recognized=false
free text AR neck:                         "ديسك الرقبة"           recognized=false
free text AR hip:                          "خشونة الورك"           recognized=false
free text EN hip:                          "hip labral tear"       recognized=false
free text EN ACL:                          "ACL reconstruction"    recognized=false
comma western:                             "knee,shoulder"         recognized=true
```

Tertiary finding: the **free-text** path (`StepBody.tsx:146`) silently drops anything outside the
six regexes — hip, neck, ACL by name, rotator cuff — and the user still gets the "we accounted for
your injuries" warning **only** when a regex hits, so at least that half stays honest.

---

## 5. PROPOSED MINIMAL CORRECT ARCHITECTURE

Three layers, in dependency order. Each is independently testable.

### L1 — Structured injury keys, not a joined string

Keep the six existing keys (they are already stable and locale-independent — this is the one layer
that is *not* broken). Freeze them as a type and stop laundering them through prose:

```ts
// src/types/profile.ts
export type InjuryAreaKey = 'knee' | 'shoulder' | 'lower_back' | 'wrist' | 'elbow' | 'ankle'
export interface Profile {
  /** @deprecated free-text; kept for migration + the customizer notes field */
  injuries: string
  /** structured, authoritative */
  injuryAreas?: InjuryAreaKey[]
}
```

`toLegacyProfile` writes **both** (`injuryAreas` from `op.limitations.injuries`, `injuries` as today
for back-compat). `detectInjuries` becomes: prefer `injuryAreas`; fall back to the regex **only** for
legacy/free-text profiles. `lower_back` normalizes to the existing internal `back` area — one alias,
declared.

### L2 — Per-exercise joint-load metadata on the catalog

Add one optional field to `Exercise`, expressing the *mechanism*, which is what the current model
cannot say:

```ts
// src/types/workout.ts
export type JointLoad =
  | 'overhead'          // arm passes above the head under load  → shoulder
  | 'deep_knee_flexion' // loaded knee flexion past ~90°         → knee
  | 'spinal_hinge'      // loaded flexion/extension of the spine → lower_back
  | 'axial_spinal'      // bar compressing the spine             → lower_back
  | 'loaded_grip'       // bodyweight/heavy grip through wrist   → wrist
  | 'elbow_flexion_load'| 'elbow_extension_load'                 // → elbow
  | 'impact'            // jumping / landing                     → ankle, knee
  | 'unilateral_balance'// single-leg balance demand             → ankle
export interface Exercise { /* … */ jointLoads?: JointLoad[] }
```

Then the filter becomes **derived, not enumerated**:

```ts
const AREA_LOADS: Record<InjuryAreaKey, JointLoad[]> = {
  shoulder:   ['overhead'],
  knee:       ['deep_knee_flexion', 'impact'],
  lower_back: ['spinal_hinge', 'axial_spinal'],
  wrist:      ['loaded_grip'],
  elbow:      ['elbow_flexion_load', 'elbow_extension_load'],
  ankle:      ['impact', 'unilateral_balance'],
}
```

The existing 94-id denylist is **retained as a belt-and-braces union**, not deleted — it encodes real
review work. The new rule is `banned = denylist ∪ jointLoad-derived`.

**Conservative default (this is the part that makes it a safety layer rather than a lookup table):**
an exercise with `jointLoads === undefined` in a `push`/`squat`/`lunge`/`hinge` pattern is treated as
**unknown ⇒ excluded** for a matching declared injury. A movement nobody has classified must not be
prescribed to an injured user. This is what would have caught `dumbbell-shoulder-press` on day one
without anyone having thought of it.

### L3 — One filter at the generation boundary, applied everywhere

- `planGenerator.ts` — apply to *all three* selection sites: the two pools (`:719`, `:723`) **and**
  `pickAccessory` (`:752`/`:394`), which today has no injury argument.
- `workoutSubstitution.ts:54` — `findSubstitutes` already receives `profile`; add the same predicate
  to the `candidates` filter at `:69-75`. Without this, the user can walk around the fix by tapping
  "swap".
- **Honesty:** if the filter cannot fill a slot safely, leave it short and say so, rather than
  falling through to an unfiltered pick. And if `injuries` contains free text that matched nothing
  (`hip labral tear`), the plan must **not** claim the injury was accounted for — today
  `planGenerator.ts:1141` and `planRationale.ts:316` both key off the regex, so this is already
  half-right and needs only the negative branch surfaced to the user.

### Scope of the data work

`R2-catalog-audit.txt` heuristic bound: **105 of 181** exercises sit in a pattern/muscle band that
requires an explicit joint-load review. Practical estimate for a first correct pass:

| set | count | note |
|---|---|---|
| must be classified before ship (`squat` 11 + `lunge` 4 + `hinge` 16 + `push` 30 + `pull` 24) | **85** | the load-bearing patterns |
| `isolation` needing review (front/lateral raise, overhead extension, curls, leg extension, calf) | **~35 of 58** | the rest are unambiguous |
| `cardio` 12 + `core` 16 + `mobility` 10 | 38 | mostly `impact` tagging only; ~12 need a tag |
| **realistic total needing an explicit `jointLoads` value** | **~120** | remainder can stay `[]` (explicitly reviewed as unloaded) |

With the conservative-default rule in L2, shipping partial coverage is **safe** — unclassified
compound movements are simply withheld from injured users until reviewed. That makes this landable
incrementally instead of as one 181-row bet.

### Guard (charter §4 / §4.2 — mandatory, none exists today)

New `scripts/run-injury-safety-proof.ts`, wired into `test:gate`:

1. For every one of the six keys × every `place` × `days` × `duration` × `level`, assert **no**
   generated id carries a `jointLoad` in that area's set. (Today this fails 720/720.)
2. Counter-assertion (§4.2, "every exception is guarded"): assert the *control* profile (no injury)
   **does** receive `dumbbell-shoulder-press` / `goblet-squat` — otherwise the proof could pass by a
   generator that returns nothing.
3. Counter-assertion: assert `findSubstitutes` on a squat for a knee-injured profile returns no
   `deep_knee_flexion` option, and returns a non-empty list for the uninjured profile.
4. Circumvention simulation that must fail by a **named** check: add a fake exercise with
   `jointLoads: undefined` and `movementPattern: 'push'`, assert it is withheld from a
   shoulder-injured user (proving the conservative default, not just the denylist).

---

## 6. EXACT FILE LIST TO EDIT

| # | file | change |
|---|---|---|
| 1 | `src/types/workout.ts` (`Exercise`, ~:35-65) | add `JointLoad` type + optional `jointLoads?: JointLoad[]` |
| 2 | `src/types/profile.ts` (~:64) | add `InjuryAreaKey` + optional `injuryAreas?: InjuryAreaKey[]`; keep `injuries: string` |
| 3 | `src/data/exercises.ts` (181 entries) | populate `jointLoads` — ~120 entries need a value; the `ex({...})` factory can default the rest |
| 4 | `src/lib/planGenerator.ts` | `:191` area type ← shared key type · `:194-210` `detectInjuries` prefers `injuryAreas` · `:215-257` keep denylist, add `AREA_LOADS` · `:259-266` `makeInjuryFilter` = denylist ∪ jointLoad ∪ conservative-unknown · `:752`+`:394` pass `injuryOk` into `pickAccessory` · `:1141` honest warning incl. the "declared but unrecognized" branch |
| 5 | `src/lib/workoutSubstitution.ts` (`:54-75`) | apply the same predicate to `candidates`; drop `movementPattern` as a *hard* rule when it is the injured mechanism |
| 6 | `src/lib/onboardingProfile.ts` (`:303`, `:483`, `:515`) | write `injuryAreas` alongside the joined string; read it back on migration |
| 7 | `src/lib/planRationale.ts` (`:239-321`) | third state — `applied` / `unrecognized` / `notApplied` already modelled at `:320`; surface `unrecognized` to the user instead of collapsing it |
| 8 | `src/i18n/dict/ePlan.ts` (`:198-199`, `:385-386`) + `src/i18n/dict/profileChoices.ts:70` | ar+en strings for the honest "you told us X, we could not map it" case |
| 9 | `scripts/run-injury-safety-proof.ts` **(new)** | the guard in §5 |
| 10 | `package.json` | `test:injury-safety` + append to `test:gate` — **coordinator only** (charter §1.4/2) |

Lane ownership per the charter map: items 4, 6, 7 are lane **E** (`planGenerator` / plan preview);
item 5 is lane **H** (`WorkoutV2` session); items 1, 3 are catalog/shared and need a coordinator
call; item 10 is coordinator-only.

---

## 7. ARTIFACTS

All under this directory:

| file | contents |
|---|---|
| `repro-injury.mjs` | 7-case live-path reproduction harness |
| `R2-red-proof.txt` | its full output (7 cases, every exercise id, warnings) |
| `find-founder.mjs` / `R2-founder-exact-repro.txt` | the exact config reproducing all 5 founder-named movements |
| `sweep.mjs` / `R2-sweep.txt` | 720-configuration sweep + frequency table |
| `strict.mjs` / `R2-strict.txt` | 720-config sweep restricted to founder-named movements |
| `locale-parse.mjs` / `R2-locale.txt` | locale + free-text parse probe |
| `coverage.mjs` / `R2-catalog-audit.txt` | denylist audit, catalog field audit, metadata scope |
