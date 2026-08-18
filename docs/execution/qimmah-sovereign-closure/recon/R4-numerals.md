# LANE R4 — Arabic numeric input + numeral display policy

**Repo** `/Users/ziyad/qimmah-deploy` · **branch** `codex/qimmah-sovereign-closure-001` · **HEAD** `740023b`
**Mode** read-only forensics. No repo file touched. Harness under
`…/scratchpad/recon/{entry.js,bundle.cjs,harness.cjs,scan-leaks.cjs}` (esbuild-bundled from the real `src/`).

Legend: **FACT** = executed/read directly · **INFERENCE** = derived from spec or code reading · **ASSUMPTION** = stated as such.

---

# PART 1 — INPUT (functional defect)

## 1.0 Executive verdict

**Every numeric input in the live app rejects Arabic-Indic digits. There is exactly one
normalization helper in the codebase and it is wired only to the barcode scanner and the
activation-code field — not to a single numeric form field.**

Three of the failures are silent data corruption, not refusal:

| # | Input | Typed | Stored / shown | Severity |
|---|---|---|---|---|
| 1 | Onboarding age (placeholder literally says **«مثال: ٢٤»**) | `٢٤` | validation error «عبّ الأربعة بأرقام منطقية ونكمل» | **P0 — the app tells you to type a digit it then refuses** |
| 2 | Any `parseSafeNumber` field (customizer age) | `٢٤` | **`13`** (the clamp `min`) → user is silently reclassified a **minor**, cut/bulk goals disabled | **P0 — silent wrong value** |
| 3 | Any decimal field, Arabic separator | `78٫5` | **`785`** (separator stripped, digits joined) | **P0 — 10× wrong, no error** |
| 4 | Mixed paste | `١٢٣4` | **`4`** | **P0 — silent truncation** |
| 5 | Daily calorie target (`type=number` + `parseSafeNumber min:0`) | `٢٥٠٠` | **`0`** | **P1** |

## 1.1 Proof (executed — `node harness.cjs`)

```
=== A. raw JS parsing ===                    (JSON.stringify(NaN) prints as null)
  Number('٢٤')                      -> NaN
  Number('٧٨٫٥')  (U+066B)          -> NaN
  Number('٧٨.٥')  (ASCII dot)       -> NaN
  parseInt('٢٤',10) / parseFloat    -> NaN / NaN
  Number('۲۴')    (Persian U+06F2)  -> NaN
  Number('2٤')    (mixed)           -> NaN
  Number('24')                      -> 24

=== B. sanitizeNumericInput  (src/lib/validation.ts:110) ===
  sanitize('٢٤')                        -> ""      <-- SILENTLY CLEARS
  sanitize('٧٨٫٥',{decimal:true})       -> ""      <-- SILENTLY CLEARS
  sanitize('٧٨.٥',{decimal:true})       -> "."     <-- leaves a bare dot
  sanitize('78٫5',{decimal:true})       -> "785"   <-- 78.5 becomes 785
  sanitize('١٢٣4')                      -> "4"     <-- silent truncation
  sanitize('٢٥٠',{max:3000})            -> ""

=== C. parseSafeNumber  (src/lib/validation.ts:130) ===
  parseSafeNumber('٢٤',{min:13,max:100})                     -> 13     <-- becomes a MINOR
  parseSafeNumber('٥',{min:0,max:20})                        -> 0
  parseSafeNumber('١٥٠',{min:1,max:3000,fallback:100})       -> 100

=== D. onboarding step-0 gate ===
  validateStep(0, '24'/'175'/'78')   -> null      (may advance)
  validateStep(0, '٢٤'/'١٧٥'/'٧٨')  -> "body"    (generic “fill the four fields”)

=== E. the ONE normalizer that exists (barcode only) ===
  normalizeDigits('٥٤٤٩٠٠٠٠٠٠٩٩٦') -> "5449000000996"   ✅
  normalizeDigits('٧٨٫٥')          -> "78٫5"   <-- U+066B NOT handled → still NaN

=== F. the app cannot re-read its own output ===
  formatNumber(250,'ar')                 -> "٢٥٠"
  sanitizeNumericInput(formatNumber(250,'ar')) -> ""
```

**The round-trip failure in F is the whole bug in one line.** `NutritionView.tsx:511` renders a
water button labelled `+٢٥٠ مل` (via `formatNumeralsIn`) and `NutritionView.tsx:523` renders the
custom-amount placeholder through `formatNumeralsIn` too — so the field's own placeholder is in
Arabic-Indic digits — and `NutritionView.tsx:521` then feeds keystrokes to `sanitizeNumericInput`,
which deletes exactly those digits.

## 1.2 Root causes — three, all in `src/lib/validation.ts`

| Line | Code | Why it breaks |
|---|---|---|
| `src/lib/validation.ts:116` | `raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '')` | ASCII class. Arabic digits are **deleted, not rejected** — the user sees the character vanish as they type. |
| `src/lib/validation.ts:135` | `const n = typeof raw === 'number' ? raw : Number(raw)` | `Number()` follows the ECMAScript `StrDecimalDigit` grammar = ASCII `0-9` only (**FACT**, harness A). |
| `src/lib/validation.ts:136-137` | `if (!Number.isFinite(n)) return fallback` → `clamp(n,min,max)` | The failure mode is a *plausible number*, not an error. `fallback` defaults to `min`. |

Secondary: `src/components/WorkoutMode.tsx:60,67` (`adjust`, `parseVal`) use `String(v).match(/-?[\d.]+/)`. JS `\d` is ASCII-only in all modes — same failure.

## 1.3 `type="number"` makes it unfixable app-side (INFERENCE — HTML spec, not measured in a browser here)

For `<input type="number">` the HTML value-sanitization algorithm sets the value to the empty
string whenever the content is not a *valid floating-point number*, and that production admits
ASCII digits only. So for every `type="number"` field the Arabic characters **never reach the
React handler** — no amount of `normalizeDigits()` in `onChange` can recover them. Those fields
must become `type="text"` + `inputMode`.

`src/views/OnboardingV2.tsx:580-583` already documents this choice for its own field:
> *`inputMode="numeric"` لا `type="number"`* … and yet it still parses with bare `Number()`, so
> the characters arrive and are then thrown away one layer later.

## 1.4 FULL INPUT INVENTORY

`type` column: `num` = `type="number"` (browser-level rejection) · `txt` = text/`inputMode` only (app-level rejection).

### LIVE surfaces (reachable from `src/App.tsx` routing)

| # | File:line | Field(s) | type | Parser | Arabic ٠-٩ | U+066B `٫` | Mixed paste | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | `src/views/OnboardingV2.tsx:591` (`NumField`), used at `:640-643` | **age · height · weight** (setup step 0) | txt | `Number()` @ `:172-174`, `:430`, `:624` | ✗ NaN | ✗ | ✗ | **BROKEN — P0.** Placeholders `src/i18n/dict/bodyStep.ts:57,66,70` are `مثال: ٢٤ / ١٧٥ / ٧٨`. |
| 2 | `src/components/customizer/steps/StepBody.tsx:112` | age | num | `num = v => Number(v)\|\|0` @ `:52` | ✗ → `0` | ✗ | ✗ | **BROKEN.** 0 ⇒ `isMinorAge` path + validation error. |
| 3 | `…/StepBody.tsx:115,118,121` | heightCm · weightKg · targetWeightKg | num | same | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 4 | `…/StepBody.tsx:134,137` | trainingDays · workoutDuration | num | same | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 5 | `src/components/customizer/steps/StepNutrition.tsx:259` (`Target`), used `:149-153` | daily calories · protein · carbs · fat · water L | num | `parseSafeNumber(min:0)` | ✗ → **`0`** | ✗ | ✗ | **BROKEN — writes 0 targets.** |
| 6 | `…/StepNutrition.tsx:259` used `:223-226` | per-meal cal/prot/carb/fat | num | `parseSafeNumber(min:0)` | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 7 | `…/StepNutrition.tsx:208` | ingredient servings | num | `parseSafeNumber(0..50)` | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 8 | `src/components/customizer/steps/StepSmartCalculations.tsx:147` | manual target overrides | num | `parseSafeNumber(min:0)` | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 9 | `src/components/customizer/steps/StepWorkoutTemplate.tsx:176` | sets | num | `parseSafeNumber(0..20)` | ✗ → `0` | — | ✗ | **BROKEN** |
| 10 | `…/StepWorkoutTemplate.tsx:178` | rest seconds | num | `parseSafeNumber(0..600)` | ✗ → `0` | — | ✗ | **BROKEN** |
| 11 | `…/StepWorkoutTemplate.tsx:177,179` | reps · starting weight | txt | none (stored as free string) | ✅ passes through | ✅ | ✅ | **OK at input**, but leaks downstream (see §2.4 PlanPreview). |
| 12 | `src/components/nutrition/QuickMealLogger.tsx:409` | grams / servings amount | num | `sanitizeNumericInput` | ✗ cleared | ✗ | ✗ trunc | **BROKEN** |
| 13 | `…/QuickMealLogger.tsx:554` (`Field`), used `:462-465` | custom calories · protein · carbs · fat | num | `sanitizeNumericInput` | ✗ cleared | ✗ | ✗ trunc | **BROKEN** |
| 14 | `src/views/NutritionView.tsx:413` | edit logged quantity (g / servings) | num | `sanitizeNumericInput` | ✗ cleared | ✗ | ✗ trunc | **BROKEN** |
| 15 | `src/views/NutritionView.tsx:515` | custom water ml | num | `sanitizeNumericInput` @ `:521` | ✗ cleared | ✗ | ✗ trunc | **BROKEN — self-contradictory**: placeholder at `:523` is rendered through `formatNumeralsIn` (Arabic digits). |
| 16 | `src/views/ProgressV2.tsx:482` (`MeasurementField`), used `:455-457` | **weight · waist · body-fat %** | txt | `sanitizeNumericInput(decimal:true)` | ✗ **cleared as you type** | ✗ | ✗ trunc | **BROKEN — most visible “field eats my typing”.** |
| 17 | `src/components/WorkoutMode.tsx:842` (`Stepper`) | **set weight (kg) · reps** during a live workout | txt | `parseVal` / `adjust` regex `[\d.]` @ `:60,67` | ✗ NaN → invalid | ✗ | partial | **BROKEN** |
| 18 | `src/components/NativeSettingsPanel.tsx:200` | manual daily steps | num | `Number(manualSteps)\|\|0` @ `:119` | ✗ → `0` | ✗ | ✗ | **BROKEN** |
| 19 | `src/components/customizer/steps/StepWellness.tsx:99,138` | supplement amount · medication dose | txt | none (free string, displayed verbatim) | ✅ | ✅ | ✅ | **OK** (no parsing anywhere). |
| 20 | `src/components/PremiumGate.tsx:130` | activation code | txt | `normalizeActivationCode` @ `src/lib/access/entitlementSource.ts:141-149` | ✅ **normalizes** | n/a | ✅ | **OK ✅** |
| 21 | `src/features/barcode/…` (manual barcode) | GTIN | txt | `normalizeDigits` @ `src/features/barcode/validateBarcode.ts:25` | ✅ **normalizes** ٠-٩ **and** ۰-۹ | n/a | ✅ | **OK ✅** |

### DEAD surfaces (no importer — do not spend a fix here)

| File:line | Field | Note |
|---|---|---|
| `src/views/NutritionV2.tsx:434,504` | water / quantity | no importer anywhere in `src/` |
| `src/views/WorkoutV2.tsx:993` | custom water ml | no importer (only `workoutV2Model` types are referenced) |
| `src/components/StepCounterCard.tsx:103,175` | steps entry | no importer; also hard-codes `toLocaleString('en-US')` at `:157,217` |
| `src/features/customPlan/CustomPlanBuilder.tsx:183` | custom-plan fields | no importer |

## 1.5 Existing normalization helpers (there are three, none on the form path)

| Helper | File | Handles | Used by |
|---|---|---|---|
| `normalizeDigits` | `src/features/barcode/validateBarcode.ts:25` | ٠-٩ (U+0660) **+** ۰-۹ (U+06F0), strips space/`-` | barcode validation, `src/lib/food/gtin.ts:123` |
| `foldArabicDigits` | `src/lib/text/foodNormalize.ts:60` | ٠-٩ + ۰-۹ | food-name search keys |
| `normalizeActivationCode` | `src/lib/access/entitlementSource.ts:141` | ٠-٩ only | activation code |

**None handles U+066B (`٫` decimal) or U+066C (`٬` thousands)** — and `formatNumber` emits **both**
(harness F: `formatNumber(1234.5,'ar') === '١٬٢٣٤٫٥'`). Two near-duplicate implementations already
exist; a third should not be written — one should be promoted.

## 1.6 Decimal separators — what is accepted today

| Input | Accepted? |
|---|---|
| `78.5` (ASCII dot) | ✅ only when the call passes `{decimal:true}` — `sanitizeNumericInput` strips `.` otherwise |
| `78٫5` (U+066B, the separator the app itself renders) | ❌ **silently becomes `785`** |
| `78,5` (comma) | ❌ stripped → `785` |
| `٧٨٫٥` | ❌ → `""` |

Fields that pass `{decimal:true}`: `ProgressV2.tsx:455-457`, `QuickMealLogger.tsx:415`, `NutritionView.tsx:423`.
Fields that do **not** (so even `78.5` is destroyed → `785`): `NutritionView.tsx:521` (water ml — integer, fine),
`QuickMealLogger.tsx:566` (custom macros — **wrong**, macros are fractional).

## 1.7 Recommended fix shape (not implemented — read-only lane)

1. Promote one folder to `src/lib/numerals.ts`: `foldNumerals(text)` = ٠-٩ + ۰-۹ → ASCII, **U+066B → `.`**, **U+066C → removed**, `٬`/`،` → removed.
   Delete-by-replacement of `normalizeDigits` / `foldArabicDigits` (both keep working via re-export).
2. Call it as the **first line** of `sanitizeNumericInput` and `parseSafeNumber` (`src/lib/validation.ts:110,130`) — one edit fixes rows 5-16 of the inventory.
3. Fix `Number()` at `src/views/OnboardingV2.tsx:172-174,430,624` and `src/components/customizer/steps/StepBody.tsx:52` and `src/components/NativeSettingsPanel.tsx:119`.
4. Fix the regexes at `src/components/WorkoutMode.tsx:60,67`.
5. **Convert every `type="number"` in the inventory to `type="text" inputMode="numeric|decimal"`** — otherwise steps 2-3 are dead code for those fields (§1.3).
6. Guard: new `scripts/run-numeral-input-proof.mjs` wired into `test:gate`, plus the §4.2 counter-assertion — neuter `foldNumerals` to identity and the proof must fail **by name**, and a negative case must show `78٫5 → 78.5` not `785`.

---

# PART 2 — DISPLAY POLICY

## 2.1 `src/lib/numberFormat.ts` — API and current policy (read in full)

```ts
formatNumber(value: number, lang: Lang, options: Intl.NumberFormatOptions = {}): string
formatNumeralsIn(text: string, lang: Lang): string
```

- **Policy is hard-tied to language.** `const locale = lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US-u-nu-latn'`. There is no third axis.
- `formatNumeralsIn` re-renders digits **inside an already-built string** (for stored plan-day names like `اليوم 1 · علوي`); it is **bidirectional** (an Arabic-digit legacy string renders Latin in an English session).
- Its digit table is **derived** from `formatNumber(1234567890, lang, {useGrouping:false})` and cached in `digitTableCache: Map<Lang,string>` — deliberately, so a second hand-written table can never drift. **This cache is keyed by `Lang` only** — a hard blocker for §2.5 (see there).
- Verified output: `formatNumber(1937,'ar') = ١٬٩٣٧` · `formatNumber(78.5,'ar') = ٧٨٫٥` (U+066C grouping, U+066B decimal).

## 2.2 There are **seven** numeral formatters in the codebase, not one

| # | Site | Mechanism | Would a user preference reach it? |
|---|---|---|---|
| 1 | `src/lib/numberFormat.ts` | `ar-SA-u-nu-arab` / `en-US-u-nu-latn` | canonical |
| 2 | `src/views/OnboardingV2.tsx:115` | `toAr` — **hand-written `'٠١٢٣٤٥٦٧٨٩'` table** | ❌ |
| 3 | `src/views/CalcExplainerView.tsx:89` | local `new Intl.NumberFormat('ar-SA-u-nu-arab')` | ❌ |
| 4 | `src/i18n/dict/eCalc.ts:461` | local `function formatNumber(lang, value, …)` — **shadowed name, different arg order**; called at dict-build time with `'ar'`/`'en'` **baked in** (`:482`, `:797`) | ❌ **and structurally hardest** |
| 5 | `src/views/StepsView.tsx:20,25,30` | `toLocaleString('ar-SA')` / `toLocaleDateString('ar-SA')` | ❌ |
| 6 | `src/components/plan/PlanPreview.tsx:40` | `toLocaleString('ar-EG')` — a **different locale tag** in a file that already imports the canonical formatter | ❌ |
| 7 | `src/i18n/dict/sessionGuard.ts:39` | `arNum` — hand-written table | ❌ |
| (8) | `src/components/StepCounterCard.tsx:157,217` | `toLocaleString('en-US')` — hard Latin | dead file |

**FACT:** `ar-EG` and `ar-SA` and `ar-SA-u-nu-arab` all resolve to `numberingSystem: arab` in current ICU, so #3/#5/#6 look correct today. But `(1234).toLocaleString('ar')` → **`1,234` (Latin)** — one dropped region subtag flips the output. The `numberFormat.ts` header comment says a second hand-written table would be "a second source of truth that ages alone"; **six of them already exist.**

**RISK (INFERENCE, not measured in a browser here):** `src/views/StepsView.tsx:20,25` call `toLocaleDateString('ar-SA', …)`. Node's ICU resolves `ar-SA` → `calendar: gregory`, but CLDR's preferred calendar for `ar-SA` is `islamic-umalqura`, and Chromium/WebKit commonly resolve it that way. If so, the Steps week chart labels Hijri day numbers against Gregorian data. **Needs a browser check.**

## 2.3 Latin-digit leaks in the Arabic UI — ranked by user visibility

Method: `scan-leaks.cjs` walked every `.tsx` under `src/`, stripped `className`/attribute noise, and
flagged JSX-text-position expressions that produce numbers without passing through `formatNumber`/
`formatNumeralsIn` (299 raw candidates); each row below was then read and confirmed by hand.

### TIER 1 — free preview / plan reveal (the surface the founder shows people)

| File:line | Rendered | Leak |
|---|---|---|
| `src/components/plan/PlanPreview.tsx:119` | `reps: plannedExercise.reps` passed **raw** into `setsRepsValue` (`src/i18n/dict/ePlan.ts:106` = `'{sets} مجموعات × {reps}'`) | **`٣ مجموعات × 8–12`**. `reps` strings are Latin by construction — `src/lib/planGenerator.ts:144-149` (`'6–10'`, `'8–12'`, `'12–15'`). Sets go through `num()`, reps do not. |
| `src/components/plan/PlanPreview.tsx:40` | `num` = `toLocaleString('ar-EG')` | not a leak today, but a 6th source of truth **in the file that already imports the canonical one** (`:49`) |

### TIER 2 — main tabs (dashboard / progress / library), every session

| File:line | Rendered | Leak |
|---|---|---|
| `src/i18n/dict/firstWeek.ts:80` | `missedEasierLine: (fullMin, easyMin) => \`بدل ${fullMin} دقيقة، سوِّ ${easyMin} اليوم\`` | **`بدل 45 دقيقة، سوِّ 15 اليوم`** — used by `src/components/today/MissedDayCard.tsx:39` (live, inside `TodayV2`) |
| `src/i18n/dict/firstWeek.ts:87,88,89` | `weekDaysLine` / `weekWorkoutsLine` / `weekMealsLine` take **raw `number`** | **`التزمت 5 من 7`**, `خلّصت 3 تمارين`, `سجّلت 12 وجبة` — `src/components/today/WeekSummaryScreen.tsx:48-50` |
| `src/i18n/dict/bodyModel.ts:62,66` | `activatedSummary` / `setsDetail` take raw `number` | **`فعّلت 9 من 14 عضلة هذا الأسبوع`**, `12 مجموعة من 16 مستهدفة · 5 تمرين مختلف` — `src/components/MuscleMap.tsx:112,113` → `BodyModel3D` → `src/views/ProgressV2.tsx` (live progress tab) |
| `src/views/ExerciseLibraryView.tsx:133` | `{exercises.length} {d.countSuffix}` | **`181 تمرين`** — first line of the exercise library |
| `src/views/ExerciseLibraryView.tsx:213` | `{filtered.length} {d.resultsSuffix}` | **`24 نتيجة`** — updates on every search keystroke |
| `src/components/ExerciseDetail.tsx:218,291,292,310` | `{i + 1}`, `{r.topWeight}`, `{r.topReps}`, `{r.sets}`, `` `${stats.totalSessions}` `` | step numbering + personal records in the exercise sheet |
| `src/views/MyStatsView.tsx:110,111,114,119` | `` `${training.workouts}` `` etc., and `` `${weekly.thisWeekCount}/${weekly.daysPerWeek}` `` | the four headline stat boxes on `#/stats` are **all** raw |
| `src/views/MyStatsView.tsx:189,226,229,262,367` | tracked days · target · `{pct}%` · latest weight · muscle counts | same screen, throughout |

### TIER 3 — workout logging (every set, every session)

`src/components/WorkoutMode.tsx` imports **no** formatter.

| File:line | Rendered | Leak |
|---|---|---|
| `:419` | `{current + 1} {t.of} {total}` | header — **`1 من 5`** |
| `:461` | `{t.target}: {pe.sets} {t.setsDone} × {pe.reps}` | **`الهدف: 3 مجموعة × 8–12`** |
| `:470,476` | `{rec.lastWeight}`, `{rec.lastReps}`, `{rec.bestWeight}` | last/best load line |
| `:508` | `{d.setSingular} {st.setNumber}`, `{t.target}: {st.targetReps}` | per-set header |
| `:800` | `{doneCount}/{total}` | finish-confirm sheet |
| `src/components/WorkoutSummary.tsx:69-72,80` | `` `${stats.mins}` ``, `exDone`, `setsDone`, `volume`, `{streakWeeks}` | the celebration screen after every workout — **all five numbers Latin** |

### TIER 4 — calculators, settings, setup chrome

| File:line | Rendered | Leak |
|---|---|---|
| `src/views/CalcExplainerView.tsx:157` | `` `10×${value(p.weightKg)} + 6.25×${value(p.heightCm)} − 5×${value(p.age)} …` `` | **mixed inside one formula**: `10×٨٢ + 6.25×١٧٨ − 5×٢٨`. Constants are literal Latin. |
| `src/views/CalcExplainerView.tsx:204` | `` `… ÷ 9 = …` `` | `÷ 9` Latin |
| `src/views/CalcExplainerView.tsx:208` | `` `… ×4 − …×9) ÷ 4 = …` `` | three Latin constants |
| `src/views/CalcExplainerView.tsx:223` | `` `… × 7 ÷ …` `` | Latin `7` |
| `src/sections/CustomizationCenter.tsx:299` | `{d.stepPrefix} {step + 1} {d.stepOf} {steps.length}` + `{progress}%` | **`الخطوة 3 من 9` · `44%`** — the stepper chrome on every advanced-edit screen |
| `src/views/StepsView.tsx:176` | `{number(…)} km` | unit `km` never localized (`كم`) |
| `src/components/customizer/steps/StepBody.tsx:173-175`, `StepGeneratePlan.tsx:94-99,173,176` | `` `${targets.targetCalories}` `` etc. | every computed target in the customizer preview is a raw template literal |
| `src/components/nutrition/QuickMealLogger.tsx:382,425,431,438-440,492` | `{round(baseCal*factor)}`, `` `${gramsNum}${t.gramsUnit}` `` , `{e.calories}`, `{e.protein}` | the whole quick-log sheet is unformatted (file imports no formatter) |

### Correct-by-contrast (the pattern to copy)

`src/i18n/dict/reveal.ts:122` — `training: (days: string, minutes: string) => …` takes **pre-formatted strings**.
`src/i18n/dict/todayHome.ts:8` states the rule explicitly. **The type signature is the tell: a dict
callback typed `(n: number)` is a leak; typed `(n: string)` is safe.** Only three dict files break it —
`firstWeek.ts`, `bodyModel.ts`, `sessionGuard.ts` (the last one launders it through its own table).

## 2.4 GUARD-GAP ANALYSIS — `scripts/run-numeral-policy-proof.mjs` (`test:numeral-policy`)

**DEFERRED-ITEMS.md item ⑥ is CONFIRMED — and it understates the gap.**

The proof's SSR entry (lines 66-100 of the script) imports and renders exactly:

```js
import { NutritionView } from '@/views/NutritionView'
import { WorkoutView }   from '@/views/WorkoutView'
…
nutrition: renderToString(<StaticCustomizationProvider …><NutritionView lang={lang} /></…>),
workout:   renderToString(<StaticCustomizationProvider …><WorkoutView lang={lang} onNavigate={()=>{}} /></…>),
```

It then asserts (a) no Latin run in the Arabic HTML, (b) no Arabic run in the English HTML, (c) both
still contain ≥3 numbers, and (d) §4.2 counter-attack: re-bundling with `@/lib/numberFormat` stubbed
to identity must make (a) fail by name. **The guard itself is well built.** Its *scope* is the problem.

### Gap 1 — only 2 of ~20 live number-bearing screens are rendered

**UNGUARDED (live, displays numbers):** `TodayV2` (dashboard tab) · `ProgressV2` + `MeasurementsV2`
(progress tab) · `ProfileV2` (profile tab) · `StepsView` · `MyStatsView` · `CalcExplainerView` ·
`SettingsView` · `ExerciseLibraryView` · `ExerciseDetail` · `PlanPreview` · `RevealJourney` ·
`PlanHandoffScreen` · `OnboardingV2` (all 8 steps) · `CustomizationCenter` + all 9 customizer steps ·
`DataManagementPanel` · admin.

**GUARDED:** `NutritionView`, `WorkoutView` — *at their default render state only*.

### Gap 2 — even inside those two files, only the default subtree is rendered

Nothing interactive mounts under SSR, so these live descendants are **inside a "guarded" file yet
never rendered by the guard**:

- `QuickMealLogger` — `NutritionView.tsx:191` renders it only when there are no meal slots; `:448` only when `adding===true`. The proof's fixture has a generated plan ⇒ slots exist ⇒ **never rendered.** (23 leak candidates, §2.3 Tier 4.)
- `WorkoutMode` — `WorkoutView.tsx:541`, requires an active session. **Never rendered.** (6 leaks, Tier 3.)
- `WorkoutSummary` — `WorkoutView.tsx:564`, post-finish only. **Never rendered.** (5 leaks, Tier 3.)
- `SessionGuardDialog` — `WorkoutView.tsx`, modal. **Never rendered.**

So "NutritionView and WorkoutView are guarded" is true of the files and false of the screens.

### Gap 3 — no other gate check covers numerals

`grep` over `scripts/*.mjs|*.ts` for `[٠-٩]` / `nu-arab` / `latinRuns`: only
`run-numeral-policy-proof.mjs`, `admin-dashboard-proof.ts`, `password-policy-proof.ts`.
`test:e-plan-preview`, `test:e-calc-explainer`, `test:e-steps`, `test:settings-preferences`,
`test:today-home`, `test:plan-number` contain **zero** numeral assertions.

Browser E2E that *does* assert numerals — `scripts/e2e/profile-reliability.mjs:155,218`,
`scripts/e2e/settings-reliability.mjs:93,107`, `scripts/e2e/nutrition-reliability.mjs:267`,
`scripts/release/personas/p1-preview-user.mjs:322,345,351` — is **outside `test:gate` and outside CI**
(`.github/workflows/ci.yml` runs `test:gate` + `test:e2e:onboarding` only; the browser proof block in
`nightly.yml:105-125` is `continue-on-error` and lists three unrelated scripts).

**Conclusion:** the documented remedy in DEFERRED-ITEMS ⑥ ("add `PlanPreview`, `TodayV2`, the reveal
screen") is necessary but not sufficient — the guard also needs *state fixtures* (active session,
open logging sheet) or those subtrees stay invisible no matter which file it imports.

## 2.5 SETTINGS PREFERENCE — how to add "Numbers: Automatic / Arabic / Western"

### Where it lands (it already half-exists)

`src/views/SettingsView.tsx:264-277` already renders a **read-only** block
`data-testid="settings-numbers-policy"` with a live sample `{formatNumber(1234, lang)}`
(`data-testid="settings-numbers-sample"`) and the note from `src/i18n/dict/settingsPreferences.ts:19`:

> «تظهر بالأرقام العربية مع الواجهة العربية، وتتغيّر للاتينية مع الإنجليزية.»

That sentence **asserts the exact policy the founder wants to remove** — it must be rewritten in the
same wave, not left behind.

The 3-way control pattern to copy is `ThemeControl` at `src/views/ProfileV2.tsx:461-500`
(`'system' | 'light' | 'dark'`, `aria-pressed`, `min-h-[44px]`). Note it uses a local `t(ar,en)`
helper — **do not copy that part**; charter §6 requires dict entries.

### Storage key pattern

`src/lib/appPreferences.ts:6` — `export const PREFS_KEY = 'qimmah:prefs:v1'`, a single JSON blob
written through `safeWriteJson` (`:70`). `loadPreferences()` (`:55`) re-validates **every field
individually** with defaults, so adding a field is **purely additive: no migration, no version bump**
— an old blob simply yields the default. Follow the `ThemePref` precedent verbatim
(`:11`, `:28`, `:34`, `:64`, `:104`).

### The one structural trap

`digitTableCache` at `src/lib/numberFormat.ts:29` is `Map<Lang, string>`. Numeral style is a **second
axis**. If the cache key is not widened to `` `${lang}:${style}` `` (or cleared inside the setter),
`formatNumeralsIn` will keep serving the previously cached table while `formatNumber` returns the new
system — i.e. **the exact "two helpers that drift apart" failure the file's own header comment says it
was written to make structurally impossible.** This is the single highest-risk line in the change.

### Files to touch — complete list

**Core (3 files)**

| # | File | Change |
|---|---|---|
| 1 | `src/lib/appPreferences.ts` | `export type NumeralStyle = 'auto' \| 'arabic' \| 'latin'`; add `numeralStyle` to `AppPreferences` (`:28`) and `DEFAULT` (`:34`); validate in `loadPreferences` (`:64`, mirroring the `theme` line); add `getNumeralStyle()` / `setNumeralStyle()` + `applyNumeralStyle()` mirroring `applyLanguage` (`:88`). |
| 2 | `src/lib/numberFormat.ts` | `resolveNumeralSystem(lang, style)` → `'arab' \| 'latn'`; build the locale from it. **Re-key `digitTableCache` to `${lang}:${style}` or clear it in the setter.** Keep the exported signatures unchanged so the 60+ call sites are untouched. |
| 3 | `src/i18n/LanguageContext.tsx` | Add `numeralStyle` + `setNumeralStyle` to `LanguageContextValue` (`:11-22`); hold state in `LanguageProvider` (`:30`); `applyNumeralStyle` in the existing effect (`:34`); **add both to the `useMemo` deps (`:51-60`)** — without that, no consumer re-renders on change. |

**UI + copy (2 files)**

| # | File | Change |
|---|---|---|
| 4 | `src/views/SettingsView.tsx` | Replace the static block at `:264-277` with a segmented 3-way control; keep both existing `data-testid`s (`settings-numbers-policy`, `settings-numbers-sample`) so `scripts/e2e/settings-reliability.mjs:93,107` still locates them. |
| 5 | `src/i18n/dict/settingsPreferences.ts` | **Rewrite `numbersNote` (`:19`, `:27`)** — it currently states the language-tied policy. Add `numbersAuto` / `numbersArabic` / `numbersLatin`, ar + en. |

**Rogue formatters that must be migrated or the setting silently skips those screens (7 files)**

| # | File:line | Today | Required |
|---|---|---|---|
| 6 | `src/views/OnboardingV2.tsx:115` | `toAr` hand table | delete → `formatNumber` |
| 7 | `src/views/CalcExplainerView.tsx:89` | local `Intl.NumberFormat` | → `formatNumber` |
| 8 | `src/i18n/dict/eCalc.ts:461,482,797` | shadowed `formatNumber(lang, value, …)`, **baked at dict-build time** | restructure: strings must take pre-formatted `string` params (the `reveal.ts:122` pattern) — **largest single sub-task** |
| 9 | `src/views/StepsView.tsx:20,25,30` | `toLocaleString('ar-SA')` | → `formatNumber`; also settle the Hijri-calendar question (§2.2 RISK) |
| 10 | `src/components/plan/PlanPreview.tsx:40` | `toLocaleString('ar-EG')` | → `formatNumber` (file already imports it at `:49`) |
| 11 | `src/i18n/dict/sessionGuard.ts:39` | `arNum` hand table | take a pre-formatted `string` |
| 12 | `src/components/StepCounterCard.tsx:157,217` | `toLocaleString('en-US')` | dead file — leave, or fold into the dead-layer cleanup |

**Raw-number leaks that must route through the formatter (else they ignore the preference AND stay broken) — 3 dict files + 9 components**

`src/i18n/dict/firstWeek.ts:80,87,88,89` · `src/i18n/dict/bodyModel.ts:62,66,92,96` ·
`src/components/WorkoutMode.tsx:419,461,470,476,508,800` · `src/components/WorkoutSummary.tsx:69-72,80` ·
`src/components/nutrition/QuickMealLogger.tsx` (whole file — imports no formatter) ·
`src/components/ExerciseDetail.tsx:218,291,292,310` · `src/views/ExerciseLibraryView.tsx:133,213` ·
`src/views/MyStatsView.tsx:110,111,114,119,189,226,229,262,367` · `src/views/CalcExplainerView.tsx:157,204,208,223` (literal constants) ·
`src/sections/CustomizationCenter.tsx:299` · `src/components/customizer/steps/StepBody.tsx:173-175` ·
`src/components/customizer/steps/StepGeneratePlan.tsx:94-99,173,176` · `src/components/plan/PlanPreview.tsx:119` (`reps`).

**Non-component consumers — cannot use a hook**

`src/lib/progressV2Model.ts:142` takes `lang` as an argument and calls `formatNumber(…, lang, …)`.
Same for any model builder. **Therefore the resolver must be module-global inside `numberFormat.ts`
(set by `applyNumeralStyle`), not threaded as a parameter** — otherwise every model signature changes.
The React context exists only to force re-render, not to carry the value.

**Guards (4 files)**

| # | File | Change |
|---|---|---|
| 13 | `scripts/run-numeral-policy-proof.mjs` | render **lang × style = 6 combinations**; add the unguarded screens (§2.4 Gap 1) **and** the state fixtures for `QuickMealLogger` / `WorkoutMode` / `WorkoutSummary` (§2.4 Gap 2). §4.2 counter-attack: a bypass that derives the system from `lang` alone must fail **by name**, and so must a stale `digitTableCache`. |
| 14 | `scripts/run-settings-preferences-proof.mjs` | assert the three options persist and round-trip through `PREFS_KEY` |
| 15 | `scripts/e2e/settings-reliability.mjs:93,107` | its assertions ("Arabic session ⇒ Arabic digits only") become **false under `latin`** — scope them to `auto` |
| 16 | `scripts/e2e/profile-reliability.mjs:155,218` | same scoping |

### Ordering recommendation

Land **Part 1 (input normalization) first or in the same wave.** Shipping the preference alone makes
the input bug strictly worse: a user who selects "Arabic numerals" will see Arabic-Indic digits on
every screen, then be unable to type a single one back into any field.
