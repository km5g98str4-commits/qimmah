# LANE R1 — Onboarding Architecture + Equipment Model

**Repo** `/Users/ziyad/qimmah-deploy` · **branch** `codex/qimmah-sovereign-closure-001` · **HEAD** `740023b`
**Mode** read-only forensic. No repo file was created, edited, or deleted. All harnesses live in
`/private/tmp/claude-501/-Users-ziyad-qimmah-deploy/bb1e3adb-0bb3-45a3-a053-230987626595/scratchpad/recon/`.

Every claim below is tagged **MEASURED** (produced by running the real modules through the esbuild
harness, output quoted) or **INFERRED** (read from source, not executed).

---

## (a) LIVE-SURFACE MAP

### The one path a new guest actually walks

| # | Surface | File:line | Evidence |
|---|---|---|---|
| 1 | `StartView` (route `start`) | `src/App.tsx:464` renders `<StartView …>` | — |
| 2 | `StartView` is a 14-line adapter → `StartViewV2` | `src/views/StartView.tsx:12-14` | `return <StartViewV2 {...props} />` |
| 3 | Guest tap → `enterAsGuest()` → route `setup` | `src/App.tsx:339` `setView('setup')`; `src/App.tsx:146` `isOnboardingComplete(userId) ? 'dashboard' : 'setup'` | — |
| 4 | Route `setup` renders `SetupView` | `src/App.tsx:504-516` | `mode={onboarded ? 'advanced' : 'onboarding'}` |
| 5 | `SetupView` with `mode !== 'advanced'` renders **`OnboardingV2`** | `src/views/SetupView.tsx:84-98` | — |
| 6 | State machine / validation | `src/lib/onboardingV2Flow.ts` (`validateStep` :240-272, `LAST_INPUT_STEP = 6` :206) | — |
| 7 | Answers → generator input | `src/lib/onboardingV2Adapter.ts:89-139` `toAnswersFromV2` | — |
| 8 | → source of truth | `src/lib/planBuilderAnswers.ts:93-145` `buildOnboardingProfile` | — |
| 9 | → engine profile | `src/lib/onboardingProfile.ts:257-327` `toLegacyProfile` | — |
| 10 | → plan | `src/lib/onboardingProfile.ts:358-374` `buildPlanArtifactsFromOnboarding` → `src/lib/planGenerator.ts` `generatePlan` | — |
| 11 | Handoff screen | `src/views/OnboardingV2.tsx:1155+` `PlanHandoffScreen`, hoisted into `SetupView` (`src/views/SetupView.tsx:62-79`) | — |

**Confirmed live:** `StartViewV2` · `OnboardingV2` · `onboardingV2Flow.ts` · `onboardingV2Adapter.ts` ·
`SetupView`. `DashboardView`→`TodayV2` (`src/views/DashboardView.tsx:14`), `ProfileView`→`ProfileV2`
(`src/views/ProfileView.tsx:12`) are thin route adapters, both live.

### Dead / unreachable twins inside the onboarding blast radius

| Dead thing | File | Proof of death |
|---|---|---|
| `CustomizationCenter.onboardingSteps` (6-step v1 wizard incl. **the only name input**) | `src/sections/CustomizationCenter.tsx:43-50` | Sole mount site is `src/views/SetupView.tsx:98`, and it is reached **only** when `mode === 'advanced'` (`SetupView.tsx:84`), which uses `advancedEssentialSteps` (`CustomizationCenter.tsx:55-59`). `grep -rn "<CustomizationCenter" src` → 1 hit. |
| `StepWelcome` (name field, "required to start") | `src/components/customizer/steps/StepWelcome.tsx:26-34` | Only referenced from the dead `onboardingSteps` array. |
| `StepBasics` (second name field) | `src/components/customizer/steps/StepBasics.tsx:25-27` | **Zero importers.** `grep -rln StepBasics src` → only its own file. |
| `V2_ONBOARDING.prefs` / `.equipment.prefQ` / `.equipment.injuryQ` / `.equipment.injuryNote` / `.equipment.title` / `.equipment.subtitle` / `.legends.pref` / `.validation.equipment` | `src/design-system/v2/labels.ts:246-263, 315, 322` | No view reads them (`grep` over `src/**/*.tsx` excluding `labels.ts` → 0 hits). `V2_ONBOARDING.equipment.cta` and `.places` and `.injuries` and `.goal.*` and `.training.*` **are** live. |
| `V2_ONBOARDING.stepOf` (hardcoded "من ٤") | `src/design-system/v2/labels.ts:234` | The live counter is `onboardingIntentStrings[lang].stepOf` (`src/views/OnboardingV2.tsx:414`). |
| `dashboardStrings.greetNamedPrefix` / `.greetGuest` | `src/i18n/dict/dashboard.ts:94-96, 169-171` | No consumer anywhere; the live greeting is built inline in `src/lib/todayV2Model.ts:233-238`. |
| Adaptive personalization engine (193 questions) | `src/lib/personalization/` | Frozen by charter §8-7. Only `experience.ts` (`classifyExperience`, `classifyTrainingStatus`) and `bank/core.ts` vocabulary are consumed by the live flow. |

---

## (b) FULL QUESTION TABLE

Flow order (`src/lib/onboardingV2Flow.ts:222-239`): `0` basics · `1` intent+level · `2` history ·
`3` goal · `4` schedule · `5` place/activity/food · `6` limitations · `7` ready.
Canonical id registry: `ONBOARDING_QUESTION_IDS`, 18 ids, `src/lib/onboardingV2Flow.ts:209-216`.

Legend for **Reaches engine?**
- **YES** = changing only this answer changes the generated plan (measured).
- **PARTIAL** = changes output only under some other answers, or only some of its options are distinguishable.
- **NO** = collected, persisted, and provably has **zero** effect on `generatePlan()` output.

| Step | Question id | Prompt AR | Prompt EN | Type / options | Conditional visibility | Profile field(s) | Consumed by (file:line) | Reaches engine? |
|---|---|---|---|---|---|---|---|---|
| 0 | *(gate, not in the 18)* `healthDataConsent` | «أوافق على معالجة بياناتي الصحية» + شرح | health-consent copy | checkbox, required | always, **first thing on screen** | `op.consents.healthData` | `planBuilderAnswers.ts:131-137` | **NO** (privacy gate; blocks step 0 via `onboardingV2Flow.ts:244`) |
| 0 | `body.age` | «العمر» (ph. «مثال: ٢٤») | "Age" | numeric 13–100 (`src/config/profileDomain.ts:38`) | always | `profile.age` | `onboardingProfile.ts:259, 261`; `calculators.ts` BMR; minor gate `calculators.ts:isMinorAge` | **YES** |
| 0 | `body.sex` | «الجنس» → ذكر / أنثى | "Sex" → Male/Female | 2-way | always | `profile.gender` | `onboardingProfile.ts:289` → Mifflin-St Jeor | **YES** |
| 0 | `body.height` | «الطول» | "Height" | numeric 120–220 | always | `bodyMetrics.heightCm` | `onboardingProfile.ts:291` | **YES** |
| 0 | `body.weight` | «الوزن الحالي» | "Current weight" | numeric 30–250 | always | `bodyMetrics.currentWeightKg` | `onboardingProfile.ts:270, 276-278` | **YES** |
| 1 | `intent.primary` | «وش أكثر شيء تحتاج مساعدة فيه؟» → خطة تمرين أمشي عليها / اقتراحات أكل جاهزة / أرقامي فقط | "Where you need the most help" | 3-way | always | `nutritionPreferences.style` | `onboardingV2Adapter.ts:63-67`; `onboardingProfile.ts:309` | **PARTIAL** — sets `nutritionDisplayStyle`; only `meals` produces meals (`meals in plan = 4`), `plan`/`numbers` → `0` |
| 1 | `experience.declared` | «مستواك بالتمرين» → مبتدئ / متوسط / متقدّم | "Your training level" | 3-way | always | `trainingHistory.declaredLevel`, feeds `experienceLevel` | `onboardingV2Flow.ts:278-296` → `personalization/experience.ts` (`selfLevel` weight **1.0** of 6.5 supplied = 15.4%) | **PARTIAL** — changes the plan in **363/900** measured contexts (40%) |
| 2 | `history.trained_before` | «تمرّنت من قبل؟» → لا، أول مرة / جرّبت شوي / شهور / سنوات | "Have you trained before?" | 4-way | always | `trainingHistory.trainedBefore` | `experience.ts` weight 2.0; `classifyTrainingStatus` | **YES** |
| 2 | `history.total_months` | «كم مدة تمرينك الكلية؟» → أقل من ٣ شهور … أكثر من ٣ سنوات | "How long have you trained in total?" | 5-way | **only if** `trainedBefore !== 'never'` (`onboardingV2Flow.ts:59-61`) | `trainingHistory.totalMonths` | `experience.ts` weight 1.5; `isReturning` | **PARTIAL** — 530/900 (59%) |
| 2 | `history.last_trained` | «متى آخر مرة تمرّنت؟» → أتمرّن حاليًا … أكثر من سنة | "When did you last train?" | 5-way | same condition | `consistency` (`returning`) | `experience.ts:classifyTrainingStatus`; `planGenerator.ts:1124` | **PARTIAL** — 455/900 (51%) |
| 2 | `history.consistency` | «كيف كان انتظامك؟» → نادر / متقطّع / غالبًا منتظم / منتظم | "How consistent were you?" | 4-way | same condition | `consistency` | `experience.ts` weight 2.0; `planGenerator.ts:1124` | **YES** — 812/900 (90%) |
| 3 | `goal.primary` | «وش هدفك الحين؟» → wording follows declared level (`onboardingIntent.ts:131-152`) | "What is your goal now?" | 3-way (`cut`/`maintain`/`bulk`) | `cut` & `bulk` **disabled if minor** (`OnboardingV2.tsx:848`) | `goal.type` → `goalType` | `onboardingProfile.ts:261-264`; `planGenerator.ts` `SCHEMES` :143-150 | **YES** |
| 4 | `training.days` | «كم يوم تتمرن بالأسبوع؟» | "How many days per week?" | segmented 3/4/5/6 | always | `trainingDays` | `planGenerator.ts:696, 699-700`; `calculators.ts:113` | **YES** |
| 4 | `training.duration` | «وش مدة التمرين اللي تناسبك؟» | "Session length that suits you?" | segmented 30/45/60/75 | always | `workoutDuration` | `planGenerator.ts:703` `targetExerciseCount` | **YES** (30→5, 45→6, 60→7, 75→8 exercises/day) |
| 5 | `training.place` | «مكان التمرين» → نادي / منزل / أجهزة فقط | "Training place" | 3 tiles | always | `environment`→`gymType`→`gymAccess` | `onboardingV2Adapter.ts:70-74`; `equipmentAccess.ts:10-22`; `planGenerator.ts:712-724` | **PARTIAL** — **`نادي` and `أجهزة فقط` are byte-identical** (0/48 configs differ) |
| 5 | `activity.neat` | «كيف تكون حركتك خارج التمرين؟» → قليل الحركة / حركة خفيفة / حركة متوسطة / حركة عالية | "How active are you outside training?" | 4-way | always | `activityProfile.neat`→`activityLevel` | `onboardingProfile.ts:279-281`; `calculators.ts:22-28, 111` | **PARTIAL** — only **3 distinct** outcomes of 4 (`sedentary` ≡ `light`, both ×1.2) |
| 5 | `nutrition.diet_pattern` | «وش نمط أكلك؟» → بدون قيود / نباتي / نباتي صرف / سمك بدون لحوم / قليل الكارب / كيتو | "What is your diet pattern?" | 6-way | always | `foodPreferences.dietPattern` | `planGenerator.ts:946-997` `pickTemplateForDiet` | **PARTIAL** — **no effect at all unless `intent = meals`**; and even then `low_carb`/`keto` are no-ops |
| 6 | `limitations.has_injury` | «عندك إصابة أو حركة ممنوعة؟» → نعم / لا | "Any injury or movement to avoid?" | 2-way | always | `limitations.hasInjury` | *(gate only — `toLegacyProfile` never reads it)* | **NO** (only reveals the next question) |
| 6 | `limitations.injury_areas` | «وش المنطقة المتأثرة؟» → الركبة / الكتف / أسفل الظهر / الرسغ / المرفق / الكاحل | "Which area is affected?" | multi-select 6 | **only if** `hasInjury === true` (`onboardingV2Flow.ts:63-65`) | `injuries` (joined string) | `planGenerator.ts:194-207, 705-706` | **PARTIAL** — at `place=نادي/أجهزة` only **knee** changes anything; shoulder/back/wrist/elbow/ankle are inert |

### Collected but IGNORED — the explicit list

1. **`limitations.has_injury` (the yes/no itself).** `op.limitations.hasInjury` is written
   (`planBuilderAnswers.ts:128`) and never read by `toLegacyProfile` — only the joined `injuries`
   string reaches the engine (`onboardingProfile.ts:303`).
2. **`nutrition.diet_pattern` for 2 of 3 intents.** MEASURED: with `intent=plan` or `intent=numbers`
   the `nutritionPlan` is byte-identical across all six diet patterns, because `meals: []`.
3. **`low_carb` and `keto`.** MEASURED: identical `nutritionPlan` even under `intent=meals`.
   No macro split shift, no template filter.
4. **`training.place = أجهزة فقط` vs `نادي`.** MEASURED: 0/48 configurations differ.
5. **`activity.neat = قليل الحركة` vs `حركة خفيفة`.** MEASURED: TDEE 2337 for both.
6. **`limitations.injury_areas` = shoulder / lower_back / wrist / elbow / ankle at gym.** MEASURED:
   exercise list unchanged vs. no-injury baseline.
7. **`experience.declared` in 60% of history contexts.** MEASURED (see §c-D2).
8. **The health-consent checkbox value.** Recorded, never consulted by any generator branch.

---

## (c) DEFECTS

### D1 — «نادي» and «أجهزة فقط» generate the identical plan · **HIGH**

**Root cause.** `src/lib/planGenerator.ts:713`
```
const machinesOnly = access === 'full' || access === 'small'
```
`full` (نادي) and `small` (أجهزة فقط) both take the machine-only branch (`:719`), which draws
exclusively from `primaryMachineIdSet` and **bypasses `equipOk` entirely**. The user's third option
therefore changes nothing.

**Proof** (`probe4.mjs`, section O):
```
=== O. gym vs machines byte-identical proof (all 48 configs) ===
   configs where gym != machines: 0 / 48
```
(48 = 3 levels × 4 day-counts × 4 durations, full `JSON.stringify(plan)` comparison.)

Side effect: a full-gym member never receives a barbell or dumbbell movement — `primaryMachineIdSet`
is 31 ids, **100% `machine`** (`probe2.mjs` section F: `equipment histogram: {"machine":31}`).

**Minimal fix.** Either (i) drop `access === 'full'` from `:713` so a commercial-gym member gets the
full filtered pool, or (ii) if the machine-first catalog is the deliberate founder decision, remove
`أجهزة فقط` from the place tiles so the app stops asking a question it cannot honor.
**Files:** `src/lib/planGenerator.ts` (:713), and for (ii) `src/design-system/v2/labels.ts` (:255-259, 350-354)
+ `src/lib/onboardingV2Adapter.ts` (:30, :70-74) + `src/lib/onboardingV2Flow.ts` (:377 draft guard).

---

### D2 — The declared level question is silently overruled 60% of the time · **HIGH**

**Root cause.** `resolveExperienceLevel` (`src/lib/onboardingV2Flow.ts:278-296`) hands the declared
level to `classifyExperience` as one weighted signal among many. In
`src/lib/personalization/experience.ts:EXPERIENCE_SIGNALS`, `selfLevel` carries **weight 1.0** while
`consistency` and `trainedBefore` carry **2.0** each and `totalMonths` **1.5**. The onboarding
supplies only those 4 of the 10 defined signals, so `selfLevel` is 1.0 / 6.5 = **15.4%** of the score.

**Proof** (`probe5.mjs`, section S — 900 contexts = 3 declared levels × 3 trainedBefore × 5 totalMonths × 5 lastTrained × 4 consistency):
```
   level         changes the plan in 363/900 contexts (40%)
   totalMonths   changes the plan in 530/900 contexts (59%)
   lastTrained   changes the plan in 455/900 contexts (51%)
   consistency   changes the plan in 812/900 contexts (90%)
```
**Concrete no-op** (`probe1.mjs` section A) — with `trainedBefore=months, totalMonths=m6_12, lastTrained=now, consistency=mostly`:
```
level=beginner     -> experienceLevel=intermediate band=1to2y trainingLevel=intermediate
level=intermediate -> experienceLevel=intermediate band=1to2y trainingLevel=intermediate
level=advanced     -> experienceLevel=intermediate band=1to2y trainingLevel=intermediate
sig(beginner)==sig(advanced)? true
```
**Resolution table** (`probe2.mjs` section D2) — declared level ⇒ resolved level:
```
 trainedBefore=never: beginner=>beginner  intermediate=>beginner  advanced=>beginner
 trainedBefore=tried: beginner=>novice    intermediate=>novice    advanced=>intermediate
 trainedBefore=months: beginner=>intermediate intermediate=>intermediate advanced=>intermediate
 trainedBefore=years: beginner=>intermediate  intermediate=>advanced     advanced=>advanced
```
Read row 3: a self-declared **مبتدئ** who says he trained "شهور" is programmed as **intermediate**
without a word of explanation. Read row 1: a self-declared **متقدّم** who says "أول مرة" is silently
demoted to beginner. Both may be defensible engine policy — but the charter (§6-4, honesty before
reassurance) is breached because the UI never tells him his answer was overridden.

**Minimal fix.** Two options, both cheap: (a) surface the resolution on the ready/handoff screen
("قلت متقدّم، وحسب تاريخك بدأناك من مستوى متوسط — تقدر تعدّله") — the `PlanRationale` already carries a
`startingLoad` decision (`src/lib/planRationale.ts`); or (b) raise `selfLevel` weight and make the
declared level a hard floor/ceiling. (a) is the smaller wave.
**Files:** `src/views/OnboardingV2.tsx` (ReadyScreen / PlanHandoffScreen), `src/i18n/dict/onboardingIntent.ts`;
for (b) `src/lib/personalization/experience.ts` (weights) — but that file is charter-frozen (§8-7), so (a) is the correct lane.

---

### D3 — The onboarding summary promises a split the engine does not build · **HIGH**

**Root cause.** `splitFor()` is a hardcoded lookup table in the view
(`src/views/OnboardingV2.tsx:99-113`) that was never reconciled with `splitDays()` in the generator.
It is shown live on step 4 (`OnboardingV2.tsx:467`) **and** on the final ready screen (`:373`).

**Proof** (`probe5.mjs`, section R):
```
 days=3
   promised (splitFor)     : دفع · سحب · أرجل
   engine suggestedSplit   : جسم كامل (Full Body)
   DELIVERED day names     : جسم كامل · جسم كامل · جسم كامل
 days=5
   promised (splitFor)     : لكل عضلة يوم
   engine suggestedSplit   : ٥ أيام: علوي/سفلي + يوم تركيز
   DELIVERED day names     : علوي · سفلي · علوي · سفلي · ذراعين وأكتاف
```
`days=4` and `days=6` match. So **2 of the 4 selectable day-counts show a false promise** at the most
expensive point of the funnel. Charter §5-1 ("لا واجهة تَعِد بما لا يحدث").

**Minimal fix.** Delete `splitFor` and read the label from the engine. `generatePlan().targets.suggestedTrainingSplit`
already carries the truthful string, but it is only available *after* generation; the cheap equivalent
is to export the pure `splitId(days)`/`splitDays(days, focus)` naming from `planGenerator` (or a new
`planDerive` helper) and have the view call it.
**Files:** `src/views/OnboardingV2.tsx` (:99-113, :373, :467), `src/lib/planGenerator.ts` (export a pure `splitLabelFor(days, muscleFocus, lang)`), optionally `src/lib/planDerive.ts`.

---

### D4 — No name is ever collected on the live path; the greeting can never say «هلا زياد» · **HIGH (founder-named)**

**Measured state.**
- `Answers.name` exists (`src/lib/planBuilderAnswers.ts:26`) and defaults to `''` (`:64`).
- `toAnswersFromV2` spreads `defaultAnswers` and **never sets `name`** (`src/lib/onboardingV2Adapter.ts:103-138`).
- `buildOnboardingProfile` therefore writes `profile: { name: undefined }` (`planBuilderAnswers.ts:98`).
  MEASURED (`probe3.mjs` section I): `op.profile = {"sex":"male","age":28}` — no `name` key.
- `toLegacyProfile` → `name: ''` (`src/lib/onboardingProfile.ts:288`). MEASURED: `profile.name = ""`.
- `assembleCustomization` → `identity.userName = profile.name` = `''` (`onboardingProfile.ts:400`).
- The Today greeting reads exactly that: `src/lib/todayV2Model.ts:146` `const name = (customization.profile.name ?? '').trim()`,
  `:147` `firstName`, `:235` `firstName ? t(\`هلا ${firstName}\`…) : t('هلا فيك','Welcome')`.
  ⇒ **the named branch is structurally unreachable for every user built by `OnboardingV2`.**
- `avatarInitial` (`todayV2Model.ts:147`, rendered `src/views/TodayV2.tsx:255-262`) is likewise always `null`.
- The only two name inputs in the codebase (`StepWelcome.tsx:26-34`, `StepBasics.tsx:25-27`) are on
  dead paths (see §a).
- Signup **does** collect a name (`src/views/LoginView.tsx:51, 200-213`, passed at `:116` to
  `auth.signUp(email, password, name.trim())`), but it lands in Supabase `user_metadata.display_name`
  and is **never copied into `customization.profile.name`** — `src/lib/onboardingSync.ts` contains no
  `name` field at all (`grep -n name src/lib/onboardingSync.ts` → 0 hits).

**Email-fallback exposure — REAL, but not on Today.**
`src/lib/authContext.tsx:128-133`:
```
function userDisplayName(user) { … return name || user.email || null }
```
Two consumers:
- `src/views/SetupView.tsx:34-40` `greetableName()` **already guards** it (`trimmed.includes('@') → null`). Good.
- `src/lib/profileV2Model.ts:168-169` does **not**:
  `displayName: auth.displayName || 'ضيف قِمّة'` and `initials: initialsOf(auth.displayName, ar)`.
  Rendered at `src/views/ProfileV2.tsx:129` (initials) and `:131` (name).
  ⇒ a signed-in user who never typed a name in the signup form sees **`ziyad.alfahhad@gmail.com`** as
  his display name and **`ZI`** as his avatar initials in the حسابي tab. INFERRED from the code path
  (not executed — requires a live Supabase session).

**Minimal fix (matches the founder's ask).**
1. Add an **optional** `profile.displayName` question — «وش نسمّيك؟» / "What should we call you?" —
   as a skippable field. Cheapest correct home: step 0 (`BodyStep`), above the numeric grid, since
   that step already owns `profile.*`. New question id `profile.display_name` in
   `ONBOARDING_QUESTION_IDS`, new draft field, new dict entries.
2. Wire it: `OnboardingV2` state → `V2OnboardingChoices.name` → `toAnswersFromV2({… name …})`
   → already flows to `op.profile.name` → `profile.name` → `identity.userName` → the Today greeting.
   **Zero engine change needed** — the pipe exists end-to-end and is only missing its source.
3. Harden the Profile tab against the email fallback by reusing `greetableName`.

**Files that would need editing:**
`src/lib/onboardingV2Flow.ts` (draft type :88-111, `initialDraftV2` :123-146, `isPersistedDraft` :365-393,
`normalizeDraft` :439-448, `DRAFT_VERSION` :84 bump to 7 + migration :411-436, `ONBOARDING_QUESTION_IDS` :209-216) ·
`src/lib/onboardingV2Adapter.ts` (:32-54 add `name?`, :103 pass it) ·
`src/views/OnboardingV2.tsx` (`BodyStep` :620-676, state :140-144, draft effect :236-250, finalize :304-312) ·
`src/i18n/dict/bodyStep.ts` (AR+EN labels) ·
`src/lib/profileV2Model.ts` (:168-169) + extract `greetableName` out of `src/views/SetupView.tsx:34-40`
into a shared helper ·
`scripts/onboarding-questions-proof.ts` (the "exactly 18" assertions at :54-55 and the copy map :71-89 will fail until updated).

---

### D5 — The home/gym model never asks what equipment the user owns · **HIGH**

**Root cause.** Three places map to three fixed equipment rulesets
(`src/lib/onboardingV2Adapter.ts:70-74` → `src/lib/equipmentAccess.ts:30-45`). The `home` ruleset is:
```
const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])   // equipmentAccess.ts:40
```
i.e. choosing «منزل» is treated as *"I own a barbell, a bench, dumbbells and bands."*
`Profile.equipment` exists and `toLegacyProfile` sets it to `[]` (`onboardingProfile.ts:323`);
`planGenerator` never reads it (`grep -c "p.equipment" src/lib/planGenerator.ts` → 0).

**Formal gate leak: ZERO.** I swept 144 configurations (3 places × 3 levels × 4 day-counts × 4 durations)
and checked every generated exercise against `makeEquipmentGate(profile)`:
```
=== C. EQUIPMENT LEAK CHECK ===
(leak scan done)          ← no line printed = 0 violations
```
So the generator is **internally consistent**: it never emits an exercise the gate forbids.

**Product leak: 33.6%.** The gate itself is the wrong model. MEASURED (`probe4.mjs` section M),
48 home configurations, 1197 generated exercise slots:
```
home configs=48  generated slots=1197  slots needing barbell/bench/etc = 402 (33.6%)
distinct heavy-gear exercises prescribed to HOME users:
   barbell-back-squat [barbell] · barbell-bench-press [barbell+bench] · barbell-curl [barbell]
   barbell-row [barbell] · barbell-shrug [barbell] · bench-dip [bodyweight+bench]
   chest-supported-row [dumbbell+bench] · deadlift [barbell] · decline-barbell-press [barbell+bench]
   decline-dumbbell-press [dumbbell+bench] · dumbbell-row [dumbbell+bench]
   hip-thrust [barbell+bench] · overhead-press [barbell]
```
Plus fixture-dependent movements tagged `bodyweight` that still need a pull-up bar or parallel bars
(`probe4.mjs` section M2): `chin-up`, `pull-up`, `chest-dip`, `hanging-leg-raise`, `nordic-curl`.

**And there is no bodyweight-only escape hatch.** `V2Place = 'gym' | 'home' | 'machines'`
(`onboardingV2Adapter.ts:30`). MEASURED (`probe4.mjs` section N):
```
   place=gym -> gymAccess=full
   place=home -> gymAccess=home
   place=machines -> gymAccess=small
```
`gymAccess === 'bodyweight'` — a whole supported branch in `equipmentAccess.ts:44-45` and
`planGenerator` — is **unreachable from onboarding**. A user with a mat and nothing else is handed
a barbell program.

**Minimal fix.** Add a follow-up multi-select shown **only when `place === 'home'`** ("وش عندك في
البيت؟" → دمبل / بار وأثقال / بنش / مطاط / عقلة / ولا شيء) writing into `Answers.equipment`, then:
- map "ولا شيء / bodyweight only" → `Environment 'bodyweight'` so the existing branch becomes reachable;
- have `makeEquipmentGate` intersect its `home` allow-set with `profile.equipment` when that array is non-empty
  (keep today's behavior when it is empty → backward-compatible for existing profiles).
**Files:** `src/lib/equipmentAccess.ts` (:30-45) · `src/lib/onboardingV2Adapter.ts` (:30, :70-74, :103-138) ·
`src/lib/onboardingProfile.ts` (:323 stop hardcoding `equipment: []`) · `src/views/OnboardingV2.tsx` (`LifestyleStep` :997-1023) ·
`src/lib/onboardingV2Flow.ts` (draft + validation + question ids) · `src/i18n/dict/onboardingLifestyle.ts` ·
`src/data/exercises.ts` (add a `pullUpBar` / `dipBars` equipment tag to the 5 fixture movements, or a `homeFeasible` flag).

---

### D6 — Injury filtering is inert for gym/machines users on 5 of 6 areas · **MEDIUM-HIGH (safety-adjacent)**

**Root cause.** For `access ∈ {full, small}` the pool is `primaryMachineIdSet`
(`planGenerator.ts:719`), while `INJURY_RISKY_IDS` (`planGenerator.ts:211-240`) names almost entirely
barbell / bodyweight movements. The intersection is empty for shoulder, back, wrist, elbow, ankle.

**Proof** (`probe3.mjs`, section H):
```
place=gym injury=knee        -> changed
place=gym injury=shoulder    -> NO CHANGE
place=gym injury=lower_back  -> NO CHANGE
place=gym injury=wrist       -> NO CHANGE
place=gym injury=elbow       -> NO CHANGE
place=gym injury=ankle       -> NO CHANGE
place=machines …             -> identical results
place=home  … all six        -> changed
```
The screen says «جوابك يستبعد الحركات اللي ما تناسب المنطقة المتأثرة»
(`src/i18n/dict/onboardingLifestyle.ts:27`). For 5 of 6 areas at a commercial gym, it does not.

**Minimal fix.** Extend `INJURY_RISKY_IDS` with the machine-catalog ids that load the named joint
(e.g. shoulder → `shoulder-press-machine`, `incline-chest-press-machine`; back → `hack-squat-machine`,
`t-bar-row-machine`; ankle → `standing-calf-raise-machine`, `leg-press-machine`). Then add a
counter-assertion (charter §4.2) that **each** of the six areas changes the plan at **each** of the
three places.
**Files:** `src/lib/planGenerator.ts` (:211-240) · `scripts/onboarding-questions-proof.ts` (:154).

---

### D7 — Diet pattern is dead for 2 of 3 intents, and `low_carb`/`keto` are dead always · **MEDIUM**

**Proof** (`probe3.mjs`, section G):
```
intent=plan    (simple_guidance) → all six patterns: nutritionPlan IDENTICAL, meals=[]
intent=numbers (macros_only)     → all six patterns: nutritionPlan IDENTICAL, meals=[]
intent=meals   (meal_suggestions)→ vegetarian/vegan/pescatarian differ; low_carb IDENTICAL; keto IDENTICAL
```
`pickTemplateForDiet` (`planGenerator.ts:946-957`) only reacts to `dietRestrictsSources(dietPattern)`
— a protein-source filter. `low_carb`/`keto` are macro-ratio patterns, and the macro split is a fixed
constant (`FAT_CALORIE_RATIO = 0.27`, `PROTEIN_PER_KG = 1.8` — `src/lib/calculators.ts`), so they
change nothing anywhere.

**Root cause.** The question is asked unconditionally at step 5, but its only consumer is the meal
generator, which only runs when `nutritionStyle === 'meal_suggestions'` (i.e. `intent = meals`),
selected by a question **four steps earlier**.

**Minimal fix (smallest honest wave).** Show `nutrition.diet_pattern` only when `intent === 'meals'`
(a one-line conditional mirroring `historyFollowUpsApply`), and remove `low_carb`/`keto` from the
option list until a macro-shift exists — or wire them to a carb/fat ratio override.
**Files:** `src/views/OnboardingV2.tsx` (`LifestyleStep` :1020) · `src/lib/onboardingV2Flow.ts`
(`validateStep` step 5 :266, plus a `dietPatternApplies(intent)` predicate next to `historyFollowUpsApply` :59) ·
`src/data/planBuilder.ts` (`dietPatternChoices`) · for the macro route: `src/lib/calculators.ts` + `src/lib/nutritionPlan.ts`.

---

### D8 — Two NEAT options are indistinguishable · **MEDIUM**

`src/lib/calculators.ts:22-28`:
```
const NEAT_MULTIPLIER = { sedentary: 1.2, light: 1.2, moderate: 1.35, active: 1.45, very_active: 1.45 }
```
**Proof** (`probe5.mjs`, section T):
```
{"sedentary":2337,"light":2337,"moderate":2607,"high":2787}  -> distinct outcomes: 3 of 4 options
```
«قليل الحركة» and «حركة خفيفة» are presented as a real choice with distinct descriptions
(`src/data/planBuilder.ts:neatChoices`) and produce the same number.

**Minimal fix.** Either separate the multipliers (`light: 1.275`) or merge the two options into one.
Requires a founder decision — it is a formula change guarded by `test:formula` and
`CALC_FORMULA_VERSION` (`src/lib/calculators.ts`), which must be bumped so existing users recompute.
**Files:** `src/lib/calculators.ts` (:22-28, `CALC_FORMULA_VERSION`) · `scripts/…formula proof` · or `src/data/planBuilder.ts` (`neatChoices`).

---

### D9 — Logical incoherence: history questions contradict the level just declared · **MEDIUM**

Order is step 1 = declared level, step 2 = history (`onboardingV2Flow.ts:222-224`). A user who taps
**«مبتدئ — توّك تبدأ أو لك أقل من ستة شهور»** (`src/i18n/dict/onboardingIntent.ts:108-111`) is then
shown, on the very next screen, «تمرّنت من قبل؟» with a **«سنوات — التمرين جزء من حياتي»** option
(`src/i18n/dict/trainingHistory.ts:44`) and «كم مدة تمرينك الكلية؟ → أكثر من ٣ سنوات» (`:52`).
No option is suppressed, no contradiction is surfaced, and the answer that wins is the history one
(see D2). Symmetrically, «متقدّم» → «لا، أول مرة» is accepted and silently becomes `beginner`.

Redundancy count: five questions (`experience.declared`, `history.trained_before`,
`history.total_months`, `history.last_trained`, `history.consistency`) measure one construct across
two screens, and the first of them is a no-op 60% of the time.

**Minimal fix.** Cheapest: gate the follow-up option ranges by the declared level, or drop
`experience.declared` entirely and derive the goal wording from the history answers (the wording
selector `goalWordingFor(lang, level)` at `src/i18n/dict/onboardingIntent.ts:238-241` already falls
back to `intermediate` when level is `null`, so removal is structurally safe). Removing it also
removes the contradiction and one screen from the funnel.
**Files:** `src/views/OnboardingV2.tsx` (`IntentStep` :718-752) · `src/lib/onboardingV2Flow.ts`
(:96, :257, :278-296, question ids) · `src/i18n/dict/onboardingIntent.ts` · `src/lib/onboardingV2Adapter.ts` (:109-123).

---

### D10 — The step-5 heading does not cover the question it contains · **LOW (copy/IA)**

`LifestyleStep` renders under the title «يومك وأكلك» / "Your day and food"
(`src/i18n/dict/onboardingLifestyle.ts:22`) with the why-line «حركتك تضبط حساب الطاقة، ونمط أكلك يفلتر
اقتراحات الوجبات» (`:23`) — neither mentions **مكان التمرين**, which is the first question on that
screen (`src/views/OnboardingV2.tsx:1014-1017`). The training place was orphaned here when the
old dedicated «وين وكيف تتمرّن؟» screen was folded away (its title/subtitle survive unused at
`src/design-system/v2/labels.ts:247-248`).

**Minimal fix.** Retitle step 5 or move `training.place` next to `training.days`/`training.duration`
in step 4 (where it belongs semantically and where `t.legends.place` already lives).
**Files:** `src/i18n/dict/onboardingLifestyle.ts` (:22-23, :43-44) or `src/views/OnboardingV2.tsx` (:915-948, :997-1023) + `src/lib/onboardingV2Flow.ts` (`validateStep` :265-266).

---

### D11 — The gate that guards this flow is loose (charter §4.2) · **MEDIUM (process)**

`npm run test:onboarding-questions` is **green — 97 checks, 0 failures** (run at HEAD `740023b`), and
it passes *while* D1, D6, D7 and D8 are all true. Three of its "consumer matrix" assertions
(`scripts/onboarding-questions-proof.ts:147-155`) prove *existence at one favorable point* rather
than sensitivity across the option set:

| Assertion | Line | Why it passes anyway |
|---|---|---|
| `place → اختيار التمارين` | :147 | Compares **gym vs home** only — the one pair that differs. gym vs machines (0/48) is never touched. |
| `NEAT → TDEE` | :150 | Compares **sedentary vs high**. `sedentary ≡ light` is never touched. |
| `injury areas → استبعاد حركات` | :154 | Compares **knee vs shoulder at place=gym**. Passes because knee moves and shoulder doesn't — the very fact D6 reports. |
| `dietPattern → تصفية الوجبات` | :152 | Runs with `base.intent = 'meals'`, the only intent where diet matters. |

**Minimal fix.** Convert each to an all-options partition assertion: every option of a question must
produce a distinct outcome from every other, in every context the question is shown.
**Files:** `scripts/onboarding-questions-proof.ts` (:147-155).

---

### D12 — Latent: minor with a stale `targetWeightKg` · **LOW**

`toLegacyProfile` coerces the goal for minors (`onboardingProfile.ts:261-264`,
`effectiveGoalTypeForAge`) but computes `targetWeightKg` from the **original** `op.goal.type`
(`:276-278`). MEASURED (`probe3.mjs` section J):
```
age=15 goalChosen=bulk -> profile.goalType=maintenance targetCalories=2701 targetWeight=90
age=15 goalChosen=cut  -> profile.goalType=maintenance targetCalories=2701 targetWeight=74
```
A maintenance plan carrying a −8 kg / +8 kg target weight. The live UI blocks minors from reaching
this state (see §"Age gate" below), so this is latent, not live. Fix: apply
`effectiveGoalTypeForAge` **before** the `showsTargetWeight` decision at `onboardingProfile.ts:276`.

---

### Age gate for minors — **FUNCTIONING** (verified end to end)

| Layer | File:line | Behavior |
|---|---|---|
| Hard floor 13 | `src/config/profileDomain.ts:38` `AGE_RANGE = {min:13,max:100}` | single source |
| Named block under 13 | `src/lib/onboardingV2Flow.ts:248` | returns `'ageBelowMin'` → «قِمّة لعمر ١٣ وفوق — نشوفك قريب» (`src/i18n/dict/bodyStep.ts:74`); `next()` refuses to advance (`OnboardingV2.tsx:258-266`) |
| Range block | `onboardingV2Flow.ts:249-254` | age/sex/height/weight all required |
| Minor detection | `src/views/OnboardingV2.tsx:180` `isMinorAge(ageNum ?? …)` → `src/lib/calculators.ts:isMinorAge` (`age > 0 && age < 18`) |
| Live invalidation while typing | `OnboardingV2.tsx:429-433` | lowering the age clears a previously chosen cut/bulk |
| State invalidation | `OnboardingV2.tsx:183-189` | `goalAllowedForEligibility` (`onboardingV2Flow.ts:68-70`) nulls the goal |
| Visual disable + a11y | `OnboardingV2.tsx:848, 855-860, 878-883` | `disabled`, `aria-disabled`, `aria-describedby` → `profileChoiceStrings[lang].minorGoalNote` |
| Click guard | `OnboardingV2.tsx:463` | `if (minor && (g==='cut'||g==='bulk')) return` |
| Notice on the body step | `OnboardingV2.tsx:668-672` + `bodyStep.ts:75` | shown for 13 ≤ age < 18 |
| **Engine backstop** | `src/lib/onboardingProfile.ts:261-264` | `effectiveGoalTypeForAge` forces `maintenance` |

**MEASURED** (`probe3.mjs` section J): ages 13, 15, 17 → `goalType=maintenance` for **all three**
chosen goals; age 18 → `cutting`/`maintenance`/`bulking` respectively. The gate holds at the model
layer even if every UI guard were bypassed.

---

## (d) REPRODUCTION

All commands are read-only. Harness dir:
```
export R=/private/tmp/claude-501/-Users-ziyad-qimmah-deploy/bb1e3adb-0bb3-45a3-a053-230987626595/scratchpad/recon
```

| File | What it prints |
|---|---|
| `$R/harness.mjs` | esbuild bundler (pattern copied from `scripts/run-plan-golden-proof.mjs:237-262`); exposes `toAnswersFromV2`, `buildOnboardingProfile`, `toLegacyProfile`, `generatePlan`, `exercises`, `makeEquipmentGate`, `resolveGymAccess`, `primaryMachineIdSet`, `resolveExperienceLevel`. Imports esbuild by absolute path from the repo's `node_modules` (no install performed). |
| `node $R/probe1.mjs` | A: level sensitivity · A2: never-vs-years · B: place sensitivity · **C: 144-config equipment-leak scan** · C2: home exercise/equipment listing |
| `node $R/probe2.mjs` | D: 301-combo "does declared level matter" sweep · D2: resolution table · **E: 23-variant field-impact matrix (NO-OP / CHANGE)** · F: `primaryMachineIdSet` equipment histogram |
| `node $R/probe3.mjs` | G: diet × intent · **H: injury area × place** · I: unused profile fields · **J: minor age gate** · K: duration → exercise count · L: days → split |
| `node $R/probe4.mjs` | **M: home heavy-gear share (33.6%)** · M2: fixture-dependent bodyweight items · N: bodyweight-access reachability · **O: gym==machines over 48 configs** · P: intent → meals · Q: NEAT → TDEE |
| `node $R/probe5.mjs` | **R: promise-vs-delivered split** · **S: 900-context per-question impact rates** · T: NEAT option distinctness |

Existing repo gate, for the §4.2 finding (D11):
```
npm run test:onboarding-questions
# → ✅ إثبات أسئلة الإعداد: 97 فحصًا، 0 فشل.
```

Static confirmations used above:
```
grep -rn "<CustomizationCenter" src --include='*.tsx'                 # → 1 hit (SetupView.tsx:98)
grep -rln "StepBasics" src                                            # → only its own file
grep -c "p.equipment" src/lib/planGenerator.ts                        # → 0
grep -n "name" src/lib/onboardingSync.ts                              # → 0 hits
grep -rn "greetNamedPrefix\|greetGuest" src                           # → dict only, no consumer
sed -n '712,714p' src/lib/planGenerator.ts                            # → machinesOnly = full || small
sed -n '22,28p'  src/lib/calculators.ts                               # → sedentary 1.2, light 1.2
sed -n '128,133p' src/lib/authContext.tsx                             # → return name || user.email || null
```
