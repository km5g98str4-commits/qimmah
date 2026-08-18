# LANE R9 — Live UX surface recon
Repo `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b` · read-only.

---

## PART 0 — LIVE vs DEAD SURFACE MAP (import-chain proof)

`src/App.tsx:12-49` builds the lazy view map; `src/App.tsx:461-620` is the route switch.

### Live chain per area

| Area | Route | App.tsx lazy target | Real implementation | Chain proof |
|---|---|---|---|---|
| TODAY / HOME | `dashboard` | `DashboardView` (`App.tsx:23`) | **`src/views/TodayV2.tsx`** (419 ln) | `src/views/DashboardView.tsx:4,13-15` — 15-line adapter, `return <TodayV2 {...props} />` |
| WORKOUT | `workout` | `WorkoutView` (`App.tsx:24`) | **`src/views/WorkoutView.tsx`** (625 ln, its own implementation) | `App.tsx:574-578`. It does **not** import `WorkoutV2` |
| NUTRITION | `nutrition` | `NutritionView` (`App.tsx:28`) | **`src/views/NutritionView.tsx`** (532 ln, own implementation) | `App.tsx:584-588`. Does **not** import `NutritionV2` |
| PROGRESS | `progress` | `ProgressView` (`App.tsx:29`) | **`src/views/ProgressV2.tsx` → `ProgressV2`** | `src/views/ProgressView.tsx:1,15-17` — 22-line adapter |
| MEASUREMENTS | `measurements` | `MeasurementsView` (`App.tsx:30`) | **`src/views/ProgressV2.tsx` → `MeasurementsV2`** (same file) | `src/views/ProgressView.tsx:1,20-22` |
| PROFILE | `profile` | `ProfileView` (`App.tsx:32`) | **`src/views/ProfileV2.tsx`** | `src/views/ProfileView.tsx:3,11-13` — 13-line adapter |
| SETTINGS | `settings` | `SettingsView` (`App.tsx:36`) | **`src/views/SettingsView.tsx`** (474 ln, own) | `App.tsx:517-529` |
| STEPS | `steps` | `StepsView` (`App.tsx:31`) | **`src/views/StepsView.tsx`** (255 ln) | `App.tsx:555` |
| RECOVERY | `recovery` | `RecoveryView` (`App.tsx:45`) | **`src/views/RecoveryView.tsx`** (237 ln) | `App.tsx:553` |
| MY STATS | `stats` | `MyStatsView` (`App.tsx:44`) | **`src/views/MyStatsView.tsx`** (395 ln) | `App.tsx:602-606` — **no UI navigates here** (see R9-C-4) |
| CALC EXPLAINER | `calc` | `CalcExplainerView` (`App.tsx:33`) | **`src/views/CalcExplainerView.tsx`** (381 ln) | `App.tsx:545-551`; entered from Today (`TodayV2.tsx:386`) and Progress (`ProgressV2.tsx:186`) |

### Verdict on the V2 twins

**They are NOT uniformly dead. The suffix `V2` is not a reliable signal — three states exist.**

| File | State | Proof |
|---|---|---|
| `src/views/TodayV2.tsx` | **LIVE** (via adapter) | `DashboardView.tsx:4` |
| `src/views/ProgressV2.tsx` | **LIVE** (via adapter, exports both `ProgressV2` + `MeasurementsV2`) | `ProgressView.tsx:1` |
| `src/views/ProfileV2.tsx` | **LIVE** (via adapter) | `ProfileView.tsx:3` |
| `src/views/NotificationsSettingsV2.tsx` | **LIVE** (nested) | `ProfileV2.tsx:13` |
| `src/views/StartViewV2.tsx` | **LIVE** (nested) | `StartView.tsx:2` |
| `src/views/OnboardingV2.tsx` | **LIVE** (nested) | `SetupView.tsx:4` |
| **`src/views/WorkoutV2.tsx`** | **DEAD TWIN** | only importer is `scripts/workout-v2-shot/harness.tsx:11` + `scripts/momentum-shot/harness.tsx` |
| **`src/views/NutritionV2.tsx`** | **DEAD TWIN** | only importer is `scripts/momentum-shot/harness.tsx:14` |
| **`src/views/PlanPreviewView.tsx`** | **DEAD TWIN** | only importers are `scripts/e-plan-preview-host-proof.ts`, `scripts/e-plan-preview-host-shot/harness.tsx`; the live component is `src/components/plan/PlanPreview.tsx` |

This is already documented in-repo: **`scripts/canonical-surfaces.mjs`** (`SURFACES` / `WRAPPED` / `UNROUTED_SECTIONS`). It exists because two independent fixes landed on the wrong file (`formatNumber`/BUG-019 went into `NutritionV2`/`WorkoutV2` while the user saw `NutritionView`/`WorkoutView`). **Any R9 fix must be checked against this file before touching a `*V2` file.**

### Other dead/orphaned units found in R9 scope

| Unit | Status | Proof |
|---|---|---|
| `src/components/StepCounterCard.tsx` | **orphan** — zero importers | grep `StepCounterCard` across `src/` returns only its own file + a stale comment at `src/i18n/dict/progressScreen.ts:9` |
| `src/components/InstallPrompt.tsx` | **deliberately unmounted, declared** | header comment `InstallPrompt.tsx:8-24`; `App.tsx:649-661` records the removal. Live install UI = `InstallBanner` (`MobileShell.tsx:250`) + Settings guide |
| `src/lib/recoveryEngine.ts` (545 ln, v2 rules engine) | **not wired to any view** | consumers are only `src/lib/syncStores.ts:39` + proof scripts. The live view uses the v1 module |
| `src/features/customPlan/templates.ts` (named plan templates + sync) | **no UI** | consumers: `builder.ts`, `syncStores.ts`, `portability/registry.ts`. No view calls `listTemplates`/`saveTemplate` |
| `src/lib/strength/warmup.ts` (warm-up ladder generator) | **only in the dead twin** | `src/views/WorkoutV2.tsx:79,201-204,726-731,1010`. `WorkoutView.tsx` never imports `@/lib/strength` |
| `src/views/MyStatsView.tsx` (`stats` route) | **route exists, no entry point** | grep for `navigate('stats')` / `go('stats')` / `#/stats` across `src/` returns nothing |
| `src/data/measurementTypes.ts` selections (`measurementPlan.selectedTypeIds`) | **written by onboarding, never read by the logging UI** | written `src/components/customizer/steps/StepMeasurements.tsx`; never read by `ProgressV2.tsx` / `measurementLog.ts` |

---

## PART A — TODAY / HOME (`src/views/TodayV2.tsx`, redesigned in `34b0270`)

### A-1 · First viewport at 390px — MEASURED, not estimated

Method: a static replica of the exact JSX class strings, loaded against the **built** stylesheet `dist/assets/index-04AYqzXM.css`, rendered headless Chromium at 390×844. Scratch harness: `…/scratchpad/recon/today.html` + `measure.mjs`. Numbers are ±a few px (system Arabic font vs. shipped font); the nav in the replica is 36px because icons were omitted — the real nav is ~60px + safe-bottom, so real fold is **tighter** than shown.

Order and vertical cost (offsets are from the top of the scrolling `<main>`):

| # | Section | JSX | Height | Top → Bottom |
|---|---|---|---|---|
| 1 | Header (date + greeting + avatar) | `TodayV2.tsx:248-265` | **60 px** | 24 → 84 |
| — | `MinorGoalNotice` (minors only) | `TodayV2.tsx:267` | 0 (usually) | — |
| — | Thursday heads-up (Thu AM only) | `TodayV2.tsx:271-275` | 0 (usually) | — |
| — | `MissedDayCard` (return-after-break only) | `TodayV2.tsx:279-286` | 0 (usually) | — |
| — | `FirstWinCard` (new user only) | `TodayV2.tsx:289-303` | 0 (usually) | — |
| 2 | **`DailyRingsCard`** (macro rings) | `TodayV2.tsx:325-332` | **209 px** | 100 → 309 |
| 3 | `NextActionCard` | `TodayV2.tsx:337-349` | **223 px** | 325 → 548 (CTA bottom **531**) |
| 4 | `WaterCard` | `TodayV2.tsx:352` | 92 px | 564 → 656 |
| 5 | `QuickActions` (meal / weight) | `TodayV2.tsx:354-359` | 73 px | 672 → 745 |
| 6 | `WeeklyPulseCard` (+ 1 nudge row) | `TodayV2.tsx:361-375` | 173 px | 761 → 934 |
| 7 | Trust note + "how we calculate" | `TodayV2.tsx:379-392` | 99 px | 950 → 1048 |

Total scroll length ≈ **1192 px** (1048 + `pb-36` = 144).
Visible content area in the replica: **751 px** (viewport 844 − shell header 57 − nav 36). With the real 60px nav + safe-area + mobile-browser URL bar, expect **≈600–640 px**.

**Reading:** the primary CTA ("ابدأ التمرين") bottom sits at **531 px** — inside the fold in every realistic configuration. ✅ The commit's claim holds.
`QuickActions` (672→745) is **at or below the fold** on real mobile web; `WeeklyPulseCard` and the trust line are **always below the fold**.

### A-2 · Do the macro rings exist, and what do they cost?

Yes — `src/components/today/DailyRingsCard.tsx`, rendered at `TodayV2.tsx:325-332` when `showRings` is true.
Layout: one 84px calorie ring sharing its row with the title/ratio, then a 3-column row of 40px protein/carb/fat rings (`DailyRingsCard.tsx:79,113`).
**Measured cost: 209 px = 27.8 % of a 751 px content area, and ~33 % of a realistic 630 px mobile-web fold.**
The commit message claims "≈١٩٠" / "١٦٨ بكسل"; the measured figure at 390px is **209**. Not a defect, but the "half the reference / not a third of the fold" claim is at the boundary rather than comfortably inside it. If the founder wants real headroom, the cheapest 30–40 px come from the third line of the calorie block (`ringLegend`, `DailyRingsCard.tsx:99`) and the per-macro "consumed / target" line (`DailyRingsCard.tsx:126-128`), which duplicate what the ring already encodes.

Colour is not load-bearing: all numbers use `text-ink-900`, only the arc is coloured (`DailyRingsCard.tsx:31-36` + header note). Screen-reader text is a single `sr-only` string per macro (`DailyRingsCard.tsx:117-121`) with the visual copy `aria-hidden`. ✅ Accessible.

### A-3 · Does Today answer the four questions?

| Question | Answered by | Verdict |
|---|---|---|
| **Where am I / what day is it?** | header, `TodayV2.tsx:248-265` ← `model.dateLabel` / `model.greeting` (`todayV2Model.ts:216-239`) | ✅ (see F-3 below) |
| **How am I doing today?** | `DailyRingsCard` (`TodayV2.tsx:325`) + `WaterCard` (`:352`) | ✅ nutrition + hydration only. **Training** progress-of-today is not shown as a state — the `pillars` array (`todayV2Model.ts:259-264`) computes train/nutrition/move/recover states and `progressLabel` ("٢ من ٤ مكتمل") **and none of it is rendered** — `TodayV2.tsx:193` uses only `pillars.find(k==='train')` for an internal flag |
| **What do I do now?** | `NextActionCard` (`TodayV2.tsx:337-349`) ← `model.hero` (`todayV2Model.ts:241`) | ✅ the strongest part of the screen |
| **What's next after that?** | — | ❌ **unanswered.** There is exactly one hero; no "then" / rest-of-day sequence. `model.cards` (up to 3 nudges) is collapsed to **one** row inside the pulse card (`TodayV2.tsx:240-242, 363-373`) |
| **How am I progressing over time?** | `WeeklyPulseCard` (`TodayV2.tsx:361`) — 7 squares + % | ✅ week only. Longer-horizon insights were deliberately moved to Progress (`TodayV2.tsx:377` comment, live at `ProgressV2.tsx:118`) |

**Dead computation:** `todayV2Model.ts` returns `pillars`, `progressLabel`, `completedCount`, `totalCount`, `goalLabel` — all computed on every render, **none rendered** by `TodayV2.tsx` (grep `model.` in `TodayV2.tsx`: only `pillars` at :193 for a boolean). Cost is small but it is a silent liar for the next reader.

### A-4 · STEPS on Today

**There is no step surface on Today at all.** `TodayV2.tsx` never renders steps; `QuickActions` offers only meal + weight (`QuickActions.tsx:38-41`).

What the web build **can** do (`src/lib/stepCounter.ts`):
- store a manual daily total — `setSteps(steps, date, source='manual')` (`stepCounter.ts:123-141`), goal `clampGoal` 1 000–100 000 default 10 000 (`:44-49`), cap 200 000 (`:14`)
- accept a push from a native shell via `window.QimmahSteps.ingest(...)` (`stepCounter.ts:163-185`), registered at boot in `src/main.tsx:32-33`
- read HealthKit **only inside Capacitor iOS** — `isHealthKitPlatform()` = `Capacitor.isNativePlatform() && getPlatform()==='ios'` (`src/lib/healthKit.ts:66-68`)

What it **cannot** do: read phone steps passively in a browser. There is no pedometer/`Accelerometer` fallback anywhere in `src/`.

**The copy does not overclaim** — it is unusually honest (`todayV2Model.ts:282` «ما نعرض خطوات وهمية — مصدر الحركة مو مربوط»; `eSteps.ts:60` «لا يستطيع iOS إخبارنا…»). **The defect is the routing, not the wording** — see F-4/F-5.

### A-5 · PWA install

Files: `src/lib/pwa.ts`, `src/lib/installState.ts`, `src/components/InstallBanner.tsx` (live, `MobileShell.tsx:250`), `src/components/InstallPrompt.tsx` (**unmounted by design**, `InstallPrompt.tsx:8-24`), Settings guide `SettingsView.tsx:228,395-432`.

- **Can the button be dead?** Not literally, but it is **mislabelled** on iOS. `InstallBanner.tsx:34` shows when `installable || ios`. On iOS Safari `canPromptInstall()` is false (no `beforeinstallprompt`), so the button captioned «ثبّت التطبيق» (`installGuide.ts:44`) actually just calls `onOpenSettings()` and dismisses (`InstallBanner.tsx:44-49`). The user taps "Install" and gets a settings page.
- **Wrong-platform instructions:** `InstallBanner` gates on `isIOS()` (`pwa.ts:63-70`), which matches Chrome/Firefox/Edge on iOS too. `installState.isIOSSafari()` (`installState.ts:33-42`) correctly excludes `CriOS|FxiOS|EdgiOS|OPiOS` — but only `SettingsView.tsx:397` uses it. So a Chrome-on-iOS user gets a banner whose destination guide is Safari-specific.
- **Is dismissal persisted?** Yes, but through **two different keys** and **raw `localStorage`**: `InstallBanner.tsx:7,37-41` writes `qimmah:install-banner:dismissed`; `installState.ts:5,19-26` writes `qimmah:installPromptDismissed:v1` (the dead component's key). Neither goes through `safeStorage` — charter §5 deviation on a device-scoped preference (low blast radius, but it is a raw write).
- **Does it explain unavailability?** Partially. On desktop Safari / desktop Firefox / Android Firefox the banner is simply **absent with no explanation** (`InstallBanner.tsx:34`). The Settings section `InstallGuideSection` (`SettingsView.tsx:395-432`) always shows both iOS and Android step lists and badges the detected platform — a good permanent fallback, but it names only Safari and Chrome/Edge, so a Firefox user is told nothing that applies to them.

### A-6 · F-3, the date line — **NOT REPRODUCED**

Claim: `todayV2Model.ts:232` renders «الاثنين ١٧ · أغسطس» instead of «الاثنين · ١٧ أغسطس».

Source is exactly as expected — hexdump of line 232 gives ``dateLabel = dayMonth ? `${weekday} · ${dayMonth}` : weekday`` with **U+00B7** and plain U+0020 spaces (no NBSP, no bidi marks). Render path: `TodayV2.tsx:250` → `loc()` → `formatNumeralsIn` (`numberFormat.ts:52-59`) which inserts **no** directional marks.

Three independent checks all give the correct visual order:

1. Hand-run UBA (Python, `unicodedata.bidirectional` + W/N/I/L rules) — RTL **and** LTR base: visual L→R `سطسغأ ١٧ · نينثالا`, i.e. reads «الاثنين · ١٧ أغسطس».
2. **Headless Chromium**, per-character `Range.getBoundingClientRect()` inside `dir=rtl`: same order.
3. **Headless WebKit** (the engine inside the iOS Capacitor shell): same order.

The reported visual would require the *logical* string «الاثنين ١٧ · أغسطس» (dot after the number), which this HEAD does not produce — and `git show 34b0270^` line 209 shows the same template before the redesign, so no recent regression either.

**Recommendation: do not "fix" line 232.** Reproduce on the founder's actual device/build first (the deployed build may differ), or treat it as a transcription of the correct output. **However, the investigation turned up a real, adjacent, higher-severity bidi/locale defect — see F-1.**

---

## PART B — WARM-UP / WORKOUT

### B-7 · The "إحماء قصير" promise — **GAP PROVEN**

Promise chain:
- `src/lib/firstWin.ts:107-110` — daytime first-win is always `kind:'warmup'`
- `src/i18n/dict/firstWeek.ts:64` — `warmup: { label: 'إحماء قصير', cta: 'سوّه الحين', minutes: 'دقيقتين' }` (EN `:107` — "Quick warm-up · 2 min")
- rendered `src/components/today/FirstWinCard.tsx:82-84`
- tap → `src/views/TodayV2.tsx:296` — `if (kind === 'warmup') onNavigate('workout')`

Delivery:
- `App.tsx:574-578` → `src/views/WorkoutView.tsx`
- `src/views/WorkoutView.tsx:129-137` — `startDay()` **immediately starts the full plan session** and, at **`WorkoutView.tsx:134-135`**, comments «بدء التمرين هو «الإحماء القصير» المقترح» then calls `completeFirstWin('warmup')`.

**So the app marks the 2-minute warm-up as "done" the instant you start a 45-minute session.** There is no warm-up content, no warm-up screen, no warm-up sets anywhere in the live path: `grep -n "warm|إحماء"` over `WorkoutView.tsx` + `WorkoutMode.tsx` + `planGenerator.ts` + `workoutDaySource.ts` + `types/workout.ts` returns **only that one comment**.

A real warm-up engine **exists and is unrouted**: `src/lib/strength/warmup.ts` (`generateWarmup`, `WarmupPref`, `WARMUP_PREF_BASE`, key registered at `userDataKeys.ts:92`, portability entry `portability/registry.ts:179-183`) with a full `WarmupPanel` UI — all of it consumed **only** by the dead twin `src/views/WorkoutV2.tsx:79,201-204,726-731,1010`.

Severity: **HIGH (honesty, charter §6.4 "الصدق قبل الطمأنينة")** — the screen states a 2-minute action and delivers a 45-minute one, then reports success.

### B-8 · «قوالبي» (My templates) — **dead heading over a fully-built subsystem**

Rendered unconditionally at **`src/views/WorkoutView.tsx:482-485`**:
```
<H2 icon="Layers">{d.myTemplates}</H2>
<EmptyCard text={d.templatesAutoGenerated} />
```
`d.myTemplates` = «قوالبي» (`workoutScreen.ts:116`), body = «خطتك تتولّد تلقائي من بياناتك…» (`:117`). It is **always** empty, has **no** button, and its body text does not describe templates at all — it describes automatic plan generation. A heading that promises a feature and delivers a paragraph about a different feature.

Meanwhile the actual template subsystem is complete: `src/features/customPlan/templates.ts` — `listTemplates` / save with `MAX_TEMPLATES` / delete / owner-scoped key `qimmah:planTemplates:v1` / **cloud sync** (`enqueueTemplateSync`, `syncStores.ts:34-37,122,270,373-385`) / export-import (`portability/registry.ts:37,225`). Zero UI reaches it.

**Honest verdict:** the section as shipped is pure dead complexity — it costs a heading + a card of vertical space and teaches the user that a feature exists which they can never use. Two defensible fixes: (a) delete the section (≈4 lines, `WorkoutView.tsx:482-485`), or (b) wire the existing `templates.ts` API to it. (a) is the R9-appropriate one; (b) is a feature wave.

---

## PART C — PROGRESS / MEASUREMENTS / RECOVERY / STEPS

### C-9 · Metric inventory

#### `ProgressV2` (route `progress`, `src/views/ProgressV2.tsx`)

| Metric shown | Source (file:line) | Kind | Decision it supports | Explained? | Actionable? |
|---|---|---|---|---|---|
| Hedged headline «شكلك ماشي على المسار الصحيح» | `progressV2Model.ts:296-303` (weight-on-track OR strength-up OR adherence ≥70) | **derived, policy thresholds** | mood/orientation | ❌ the three-way OR is invisible | no |
| Summary row · weight | `progressV2Model.ts:259-281` | measured (logs) | am I moving toward target | partly (`disclaimer:328`) | tap → weight screen |
| Summary row · strength | `progressV2Model.ts:283-287` (`improvedCount`) | derived from session top-weights (`:186-217`) | is my lifting going up | ❌ "improved" rule not shown | no |
| Summary row · adherence % | `progressV2Model.ts:288-293`; formula `:240-246` | **derived, NON-STANDARD** — distinct finished days ÷ (plan days/wk × 2) | am I keeping up | ❌ | no |
| **«زخم التدريب» / Training momentum** | `progressV2Model.ts:233-239` ← `recentVolumes(8)` (`src/lib/progressStats.ts:36-40`) = last 8 finished sessions' `sessionVolume` | **derived** | trend of session volume | ❌ **worst offender** | no |
| Muscle body model | `BodyModel3D` at `ProgressV2.tsx:145-147` | measured (weekly coverage) | which muscles I skipped | visual only | no |
| Weight tile / Strength tile | `ProgressV2.tsx:150-164` | measured / derived | drill-in | — | tap |
| Insight cards | `ProgressV2.tsx:118` | derived (insights engine) | — | hedged copy | tap |
| Disclaimer | `progressV2Model.ts:328` «قراءة تقريبية…» | — | — | ✅ one global hedge | — |

**Training momentum, specifically.** It is the app's "training load" and it is the weakest number on the screen:
- the model field is called `weeks` but holds a **session count** (`progressV2Model.ts:236` `weeks: volumes.length` where `volumes` = last 8 *sessions*). The UI label is honest («آخر ٨ جلسات», `ProgressV2.tsx:134`) — the model name is not.
- the chart (`MomentumArea`, `ProgressV2.tsx:749-775`) has **no axis, no unit, no value labels, no tooltip** and deliberately compresses the baseline (`:756-757`, `lo = min - spread*0.5`) so "a gentle upward trend is visible" — i.e. **the y-scale is chosen to make the line look like it rises**. Two sessions of 4 800 kg and 4 900 kg draw a visibly climbing curve.
- the user is never told the unit is volume (kg × reps), never told 8 sessions, and cannot act on it.

**Severity: HIGH (charter §1 «صدق المعروض» / product rule "no number that says about itself what it is not").**

**«progress points»: does not exist.** grep for `points` / `نقاط` / `score` across `src/i18n/dict/**` and `src/design-system/v2/labels.ts` returns only technique-tip strings and one calculator sentence. Nothing gamified. ✅

#### `MyStatsView` (route `stats`)

Metrics: workouts (7d), total sets, streak weeks, this-week/plan-days, muscles covered, muscles missed, avg calories vs target, avg protein vs target, tracked days, latest weight, weight delta, 12-point sparkline — `MyStatsView.tsx:106-192, 244-310`, sourced from `src/lib/statsSummary.ts` + `historyStore` + `muscleCoverage`.
All measured or simple averages; the screen carries an honest note («أرقام للعرض بس… بدون أي تفسير طبي», `statsScreen.ts:59`).
**Two defects: it has no entry point (F-6) and it leaks Latin digits (F-2).**

#### `RecoveryView` (route `recovery`)

Inputs (all optional): effort 1–10, sleep, soreness, energy, note — `RecoveryView.tsx:70-119`.
Output: one of rest / light / full / reassess — `recommendRecovery` (`src/lib/recovery.ts:63-73`): severe soreness ⇒ rest; else additive score (soreness 0-3 + sleep 0-2 + energy 0-2 + effort≥8→2/≥6→1); ≥5 rest, ≥3 light, else full.
**Kind: policy (hand-tuned constants), from self-report only.** Explained? The screen says "self-reported, not medical" (`RecoveryView.tsx:65`) ✅ but never shows the weights or which answer drove the verdict. Actionable? It is advisory only — nothing changes the plan (by design, "Rule D").
**Three defects here: F-7 (silent save failure), F-8 (deprecated engine live / real engine dark), and the sync split it causes.**

#### `StepsView` (route `steps`)

Today, goal %, remaining, 7-day total, 30-day total, best day, streak, estimated distance (0.75 m/step, labelled «تقديري» — `eSteps.ts:52` ✅), 7-bar week chart, data-source block. All from `buildStepsPageModel` (`src/lib/eStepsModel.ts`) over the local step log.
**Read-only screen — see F-4.**

### C-10 · Body measurements

Record type is an open map — `MeasurementLog { id, date, values: Record<string, string|number>, notes?, source?, updatedAt? }` (`src/types/progress.ts:62-71`). Key `qimmah:history:measurementLogs:v1` (`historyStore.ts:28`). Writes go through checked `safeStorage` (`measurementLog.ts:23-51` → `historyStore.ts:306-347` → `safeStorage.ts:88-96`) and are paid-gated (`assertPaid('progress.logMeasurement')`). ✅ charter §5 compliant.

**Recordable today — exactly three**, all in `WeightLogScreen` (`ProgressV2.tsx:392-473`):

| Field | Input | Range enforced |
|---|---|---|
| Weight (required) | `ProgressV2.tsx:455` | 30–250 kg (`validation.ts:28`) |
| Waist | `ProgressV2.tsx:456` | 30–250 cm, **hard-coded literals** `ProgressV2.tsx:412` |
| Body fat % | `ProgressV2.tsx:457` | 2–70, hard-coded `ProgressV2.tsx:417` |

**Missing:** hip, chest, arm/biceps, thigh, neck (all five **exist in the catalogue** `src/data/measurementTypes.ts:9-13` and are **offered as checkboxes during onboarding** in `src/components/customizer/steps/StepMeasurements.tsx` — the selection lands in `customization.measurementPlan.selectedTypeIds` and is **never read by the logging UI**). Calf, shoulders and any custom/user-named field do not exist anywhere.

**Cost to extend:** low. `values` is a generic map and the Supabase column is `jsonb` (`supabase/migrations/20260713120002_core_active_tables.sql:64-65`), so **type, storage, portability and sync need zero change**. Work is ~5 edits inside `ProgressV2.tsx` (state, `<MeasurementField>`, range check, submit payload, history row at `:339-359`) plus `src/i18n/dict/measurementsScreen.ts`. No proof script pins the field list. Fastest route: wire the already-built onboarding picker through instead of starting fresh.

### C-11 · Live weight-logging entry point — **yes, but 3 taps**

The only weight input is `id="v2-weight"` (`ProgressV2.tsx:455`). Every route costs three taps:
- Today «وزن اليوم» (`QuickActions.tsx:40`) → `onLogWeight` = `onNavigate('progress')` (`TodayV2.tsx:356`) → **Progress home, not an input** → "Weight & body" tile (`ProgressV2.tsx:151-157`) → "Log today's weight" (`ProgressV2.tsx:608`) → input.
- Or Progress → Measurements card (`ProgressV2.tsx:167-181`) → "Add measurement" (`ProgressV2.tsx:312-315`) → same form.

The earlier memory note ("no weight entry point at all") is **stale** — it exists on this HEAD. What is true is that the Today card labelled "Log weight" does not log weight; it opens a dashboard. History list with per-row edit/delete exists (`ProgressV2.tsx:337-386`), Health-imported rows are correctly read-only (`measurementLog.ts:37-39,48`).

---

## PART D — SETTINGS / PROFILE

### D-12a · `SettingsView` (route `settings`) — every row in render order

Shell note: Settings renders with **`AppNav`** (`SettingsView.tsx:115`) inside `container-page`, i.e. **outside `MobileShell`** — a different chrome and a different nav from every tab screen. Inconsistency, not a bug.

| # | Group (`SettingsGroup`) | Rows | file:line |
|---|---|---|---|
| 1 | الحساب / Account | guest-or-account badge · display name · sync status line (`syncNote(getSyncUiState())`) · Log out **or** Log in | `:119-149` |
| | | **حذف الحساب** (signed-in only) → `DeleteAccountDialog` — in-app typed confirmation ✅ | `:158-171` |
| 2 | البيانات / Data (collapsible) | `DataManagementPanel` (export / import) | `:175-176` |
| | | **إعادة الضبط** (reset the whole app) → `onReset` | `:177-187` |
| 3 | خطتي / My plan | تعديل الخطة → `onEditPlan` (opens `SetupView` advanced) · **إعادة التوليد** → `onRegenerate` · **التحويل لنسخة الأجهزة** → `onSwitchToMachines` | `:190-206` |
| 4 | الخصوصية والثقة | الخصوصية · الشروط · health disclaimer banner | `:209-227` |
| 5 | `DeviceSettings` | PWA install button + notification permission (honest iOS limits) | `:229` (component `src/components/DeviceSettings.tsx`) |
| 5.1 | `InstallGuideSection` | iOS (Safari) + Android (Chrome/Edge) step lists, detected platform badged | `:232`, impl `:395-432` |
| 6 | أدوات داخلية | product-review panel — **DEV only**, excluded from production bundle ✅ | `:236-250` |
| 7 | اللغة / Language | `LanguageToggle` · units policy row · **numbers policy row** (renders `formatNumber(1234, lang)` as a live sample) | `:253-282` |
| 8 | عن التطبيق / About | `BUILD_LABEL` (forced `dir="ltr"` ✅) · «كيف نحسب أرقامك؟» → `calc` | `:284-301` |
| 9 | الدعم / Support | intro · **selectable email `qimmah.support@gmail.com`** · `mailto:` CTA · «بلّغ عن مشكلة» → `#/contact` | `:303-333` |

**Flagged rows:**
- **«إعادة التوليد» and «التحويل لنسخة الأجهزة» are near-duplicates.** Both call the identical `regenerateFromProfile()` (`:77-90`); the only difference is the confirm text. Two buttons, one behaviour — `:92-103`.
- Group 1 tells the user to log out and delete the account from the same block, while **Profile** shows a row titled «تسجيل الخروج · حذف الحساب» that merely says *"in account settings"* and bounces here (`ProfileV2.tsx:421`). A signpost pointing at a signpost.

### D-12b · `ProfileV2` (tab `profile`) — sections in render order

**Home** (`ProfileV2.tsx:124-193`): identity card (initials + goal chip) `:127-138` · three stat tiles — workouts / day-streak / PRs, with an honest "need more data" line `:140-148` · `ProgramCard` (week X of Y · days/week) `:151` · `CommitmentHeatmap` (last 10 weeks) `:154` · three rows — القياسات → `measurements`, الأدوية والمكمّلات → `routine`, الإعدادات والخصوصية → `settings` sub-screen `:157-161` · quiet **قِمّة Premium** line linking out to Salla with `target="_blank" rel="noopener noreferrer"` ✅ `:170-190`.

**Sub-screens** (internal `screen` state, not routes): `routine` `:256` · `privacy` `:367-378` · `settings` `:397-424` · `data-settings` / `data-privacy` `:97-98,433` · `notifications` → `NotificationsSettingsV2` `:100-102`.

**Profile → «الإعدادات والخصوصية»** (`:397-424`): المظهر (`ThemeControl`) · عام → **links out to the canonical Settings route** · الإشعارات → Reminders · **`NativeSettingsPanel`** (health metrics + the app's only manual step field) `:407-410` · الخصوصية والبيانات · بياناتي (export/import) · Account rows.

**Flagged:**
- **Two settings surfaces.** Export/import appears in *both* (`SettingsView.tsx:175` and `ProfileV2.tsx:416`); Privacy appears in both; and Profile's "عام" row exists only to hand the user back to the other screen (`:401-403`). A user hunting for "steps" or "Apple Health" has to guess that they live under Profile, not Settings — which is exactly the dead end in F-4.
- `ProfileV2.tsx:376` — «مشاركة بيانات الصحة / Health sharing» is rendered `disabled` with sub-text «غير مربوطة بعد». Honest ✅, but it sits two taps away from `NativeSettingsPanel`, which *is* the health connection. Confusing adjacency.

### D-12c · Native browser dialogs — **five, three of them on destructive flows**

| file:line | Call | Destructive? |
|---|---|---|
| **`src/views/SettingsView.tsx:73`** | `window.confirm(t.settings.resetConfirm)` → `resetQimmah()` | **YES — wipes all local app data** |
| **`src/components/customizer/steps/StepReview.tsx:199`** | `window.confirm(d.reviewFullResetConfirm)` → full reset | **YES** |
| `src/views/SettingsView.tsx:92` | `window.confirm(t.settings.regenerateConfirm)` | overwrites the generated plan |
| `src/views/SettingsView.tsx:94` | `window.alert(t.settings.regenerateSuccess)` | — (unverified success) |
| `src/views/SettingsView.tsx:100 / :102` | `window.confirm` + `window.alert` for switch-to-machines | overwrites plan / unverified success |

`src/lib/pwa.ts:81` is `deferredPrompt.prompt()` — the browser install API, **not** `window.prompt`. Not a defect.

The codebase already knows better: `src/components/SessionGuardDialog.tsx:20` documents *why* an in-app dialog is used instead of `window.confirm` («لا تحمل نبرة قِمّة»), and `DeleteAccountDialog` uses a typed confirmation. The reset path never got the same treatment. See **F-17**.

### D-12d · Support / report-a-problem

Single address, three surfaces, one hard-coded duplicate:
- `qimmah.support@gmail.com` — `src/config/strings.ts:677` (ar) and `:1151` (en) as `contact.emailValue`
- **`src/components/ErrorBoundary.tsx:25`** hard-codes the same string as `const SUPPORT_EMAIL` and builds `mailto:…?subject=Qimmah error <referenceId>` (`:40`) — a second source of truth for the support address, outside the dictionaries (charter §6: no hard-coded strings).
- Surfaces: Settings §9 (`SettingsView.tsx:303-333`), `src/views/ContactView.tsx:15-16` (plain `mailto` + a pre-subjected "report a problem" `mailto`), the footer link, and the crash screen.
- There is **no in-app report form** — every path hands off to the OS mail client, which on a desktop browser with no mail client configured does nothing at all. Worth knowing; not filed as a defect since it is a deliberate no-backend choice.

### D-12e · Guards and storage honesty in this area
- `SettingsView` itself does **not** call `useAccess()`; the paid gate sits deeper (`assertPaid` inside the stores). `ProfileV2` likewise reads a model rather than gating rows.
- Measurement writes are checked end-to-end ✅ — `measurementLog.ts:23-51` (`assertPaid` + `MeasurementWriteResult`) → `historyStore.ts:306-312` (`writeJSON`, returns early on non-`ok`) → consumed at `ProgressV2.tsx:429-434`.
- Recovery writes are **not** — see F-7.

---

## DEFECTS

Ordered by severity. "Minimal fix" is the smallest change that closes the honesty/UX gap, not a redesign.

### F-1 · `ar-SA` renders **Hijri dates in WebKit** on the Steps screen — HIGH
- **Where:** `src/views/StepsView.tsx:22`, `:27`, `:220` (also `:31` for numbers).
- **Proof:** headless engines, same date (17 Aug 2026): Chromium `Intl.DateTimeFormat('ar-SA',{day:'numeric',month:'short'})` → «١٧ أغسطس»; **WebKit → «٤ ربيع الأول»** (`resolvedOptions().calendar === 'islamic-umalqura'`). WebKit is the engine inside Safari **and inside the iOS Capacitor shell**. Node's ICU says `gregory`, which is why no test caught it.
- **Impact:** on iPhone, the Steps week chart and "best day" show Hijri day numbers/months while Today, Progress and Measurements show Gregorian — because those deliberately use locale `'ar'`. The codebase already documents the correct choice at `src/lib/todayV2Model.ts:225` («`ar` (not `ar-SA`) keeps the Gregorian calendar»).
- **Minimal fix:** replace `'ar-SA'` with `'ar'` at `StepsView.tsx:22,27,220`; route `:31` through `formatNumber` from `@/lib/numberFormat` instead of `toLocaleString`.
- **Files:** `src/views/StepsView.tsx`. Add a guard assertion that no view file outside `numberFormat.ts` contains the literal `'ar-SA'`.

### F-2 · BUG-019 recurrence — Latin digits in the Arabic UI on `MyStatsView` — HIGH (policy)
- **Where:** `src/views/MyStatsView.tsx:110,111,114,119,189` — values are template-interpolated raw numbers (`` `${training.workouts}` ``). The file imports **no** number formatter (grep `formatNumber|numberFormat|toLocaleString` in it → empty).
- **Why it survived:** the guard `scripts/run-numeral-policy-proof.mjs` server-renders only `NutritionView` and `WorkoutView` (`:74-75`). `MyStatsView` is outside its scope.
- **Minimal fix:** import `formatNumber` and wrap the five call sites; then extend the proof's entry to also render `MyStatsView` (and, per §4.2, add a circumvention simulation that fails by name).
- **Files:** `src/views/MyStatsView.tsx`, `scripts/run-numeral-policy-proof.mjs`.

### F-3 · Date bidi on Today — **NOT REPRODUCED**, do not patch
See A-6. Source at `src/lib/todayV2Model.ts:232` is correct; Chromium and WebKit both render «الاثنين · ١٧ أغسطس». Verify against the founder's actual build before spending a line.

### F-4 · Steps: the screen that shows steps cannot record steps, and its CTA lands nowhere — HIGH
- **Where:** `src/views/StepsView.tsx` (whole file — read-only, no input); empty state `:110-118` and error state `:96-108` both offer `onOpenSettings`; `App.tsx:555` wires that to `navigate('settings')` → `SettingsView`.
- **Proof of dead end:** `grep -n "steps|Steps|health|Health" src/components/DeviceSettings.tsx` → **zero hits**; `SettingsView.tsx` has no step control. The **only** manual step input in the app is `src/components/NativeSettingsPanel.tsx:198-213`, rendered from `src/views/ProfileV2.tsx:409` (Profile → Settings & privacy → health group).
- The copy makes it explicit and wrong: `src/i18n/dict/eSteps.ts:67` «أضف مجموع اليوم يدويًا من **إعدادات البيانات**» and `:61` «فتح إعدادات البيانات».
- **Same dead end from Today:** the movement nudge «فعّل عدّاد الخطوات وتابع حركتك» has `destination: 'settings'` (`src/lib/todayV2Model.ts:448`) — a button labelled «فعّل» that opens a screen with nothing to enable.
- **Minimal fix (smallest honest one):** point both destinations at `profile` instead of `settings` — `todayV2Model.ts:448` and `App.tsx:555`'s `onOpenSettings`. **Better fix:** add the manual daily-total field directly to `StepsView` (it already imports nothing it would need beyond `setSteps`), since that is the screen the user is standing on.
- **Files:** `src/views/StepsView.tsx`, `src/lib/todayV2Model.ts`, `src/App.tsx`, `src/i18n/dict/eSteps.ts`.

### F-5 · Today promises a 2-minute warm-up and delivers the full session — HIGH (honesty)
See B-7. Promise `src/i18n/dict/firstWeek.ts:64,107`; delivery `src/views/WorkoutView.tsx:129-137` (`completeFirstWin('warmup')` on session start). Real warm-up engine `src/lib/strength/warmup.ts` is live only in the dead twin `src/views/WorkoutV2.tsx:726-731`.
- **Minimal fix:** change the daytime first-win suggestion so the label matches what actually happens — e.g. `firstWin.ts:110` → a kind whose copy is «ابدأ تمرين اليوم» — **or** stop claiming completion at `WorkoutView.tsx:135` until a warm-up actually exists.
- **Real fix (separate wave):** port `WarmupPanel` + `generateWarmup` from `WorkoutV2.tsx` into the live `WorkoutMode`/`WorkoutView` path.
- **Files:** `src/lib/firstWin.ts`, `src/i18n/dict/firstWeek.ts`, `src/views/WorkoutView.tsx`.

### F-6 · `MyStatsView` is unreachable — MEDIUM
- **Where:** route `stats` is registered (`src/lib/appRoutes.ts:67`), guarded (`App.tsx:118`), rendered (`App.tsx:602-606`), and shell-mapped to the `dashboard` tab (`App.tsx:562`) — but **no UI navigates to it** (grep `navigate('stats')|go('stats')|#/stats` across `src/` → empty). 395 lines of view + a 206-line model reachable only by typing the hash.
- **Minimal fix:** either add one entry row on Progress (next to the existing Recovery/Steps rows, `ProgressV2.tsx:200-217` pattern) or delete the route + view. Do not leave it half-live.
- **Files:** `src/views/ProgressV2.tsx` **or** `src/App.tsx` + `src/lib/appRoutes.ts` + `src/views/MyStatsView.tsx`.

### F-7 · Recovery check-in reports success on a failed write — HIGH (charter §5)
- **Where:** `src/lib/recovery.ts:100-113` — raw `window.localStorage.setItem` inside a `try/catch` whose comment literally says *"storage full/unavailable — the returned entry still drives the view"*. It returns `RecoveryEntry`, never a `WriteResult`.
- **Consumer:** `src/views/RecoveryView.tsx:44-48` — `saveRecoveryEntry(...)` then unconditional `setResult(entry); setScreen('result')`. The user sees their recommendation screen; nothing was saved; the history list stays empty.
- This is precisely the pattern §5 forbids («فشل الحفظ لا يُبتلع… لا شاشة نجاح قبل تأكيد الكتابة»), and it is the one module in R9 scope still bypassing `safeStorage`.
- **Minimal fix:** route through `writeJson`/`safeWriteJson`, return `{ entry, write: WriteResult }`, and in `RecoveryView.submit` show the honest failure block (the pattern already exists at `WorkoutView.tsx:504-520`) instead of advancing to `result`.
- **Files:** `src/lib/recovery.ts`, `src/views/RecoveryView.tsx`; add a case to `scripts/storage-honesty-proof.ts`.

### F-8 · Two recovery logs; the live one is deprecated, the synced one is never written — MEDIUM
- `src/lib/recovery.ts:1-9` marks itself **DEPRECATED (P11)** and points to `src/lib/recoveryEngine.ts` (545 lines: rules-versioned, confidence, per-factor decision impact, 7/28-day trend). `RecoveryView.tsx:8-11` imports the deprecated one.
- Registry consequence (`src/lib/userDataKeys.ts:87-88`): v1 `qimmah:recovery-log:v1` is `synced: false`; v2 `qimmah:recovery-log:v2` is `synced: true` and `exported: false`. So **the log that syncs is the one no UI writes**, and the log the user actually fills neither syncs nor reaches the engine. `syncStores.ts:39` faithfully syncs an always-empty table.
- **Minimal fix:** decide (founder call — this is a product decision, not a cleanup): either wire `RecoveryView` to `saveRecoveryEngineEntry`, or flip the registry flags so v1 is the synced/exported one. Do **not** do both silently.
- **Files:** `src/views/RecoveryView.tsx`, `src/lib/userDataKeys.ts`, `src/lib/syncStores.ts`.

### F-9 · "Training momentum" is an unlabelled, scale-flattered chart — MEDIUM (honesty)
- Chart `src/views/ProgressV2.tsx:749-775`; baseline compression at `:756-757`; data `progressV2Model.ts:233-239` ← `progressStats.ts:36-40`.
- No unit, no axis, no values; y-range chosen so small differences read as a rising trend. Model field `weeks` actually holds a session count (`progressV2Model.ts:236`).
- **Minimal fix:** (a) rename `weeks` → `sessions` in the model + its consumer at `ProgressV2.tsx:134`; (b) add a one-line caption under the chart naming the unit and window («حجم الجلسة (كجم × تكرار) — آخر ٨ جلسات»), in the i18n dict; (c) set `lo = 0` or state the compression in the caption.
- **Files:** `src/lib/progressV2Model.ts`, `src/views/ProgressV2.tsx`, `src/i18n/dict/` (progress strings).

### F-10 · Weight-range error message contradicts the enforced range — MEDIUM (**verified**)
- **Enforced:** `LIMITS.weightKg = WEIGHT_RANGE = { min: 30, max: 250 }` — `src/config/profileDomain.ts:40` → `src/lib/validation.ts:28`, checked at `src/views/ProgressV2.tsx:407`.
- **Message shown on rejection:** «أدخل وزنًا بين **15** و250 كجم» — `src/i18n/dict/measurementsScreen.ts:72`, EN "between **15** and 250 kg" `:109`.
- A user entering 20 kg is told the range starts at 15 and is rejected anyway.
- **Provenance makes this an obvious miss, not a judgement call:** `src/config/profileDomain.ts:5-6` documents this exact drift being fixed in [CTO-65] («كان `lib/validation.ts` يعلن … `weightKg = 15–250`»). The dictionary copy is the leftover of that same drift. A correct interpolating helper **already exists** — `weightRangeCopy()` (`profileDomain.ts`, used at `validation.ts:43`) — `measurementsScreen.ts` just doesn't call it.
- **Minimal fix:** make `weightRange`/`waistRange`/`bodyFatRange` interpolate from `profileDomain` instead of hard-coding digits.
- **Files:** `src/i18n/dict/measurementsScreen.ts` (`:72-74`, `:109-111`).

### F-11 · The plan editor lets the user pick measurements the app can never record — MEDIUM (**verified live**)
- `src/data/measurementTypes.ts:6-21` catalogues **14** types; `src/components/customizer/steps/StepMeasurements.tsx:19-27` lets the user toggle any of them into `customization.measurementPlan.selectedTypeIds`.
- **Reachability:** live — `SetupView.tsx:98` renders `CustomizationCenter` when `mode==='advanced'`, i.e. for any onboarded user tapping «تعديل الخطة» in Settings (`SettingsView.tsx:193`). `CustomizationCenter.tsx:48,64` includes the step.
- **The selection is never read by anything that logs.** Only consumer is a **count** on the review screen — `src/components/customizer/steps/StepReview.tsx:36`. `ProgressV2.tsx` and `measurementLog.ts` ignore it entirely.
- The default (`src/lib/customization.ts:215`, `src/lib/planGenerator.ts:1059`) is `['weightKg','waistCm','bodyFatPercent']` — exactly the three the form supports, so the *default* path is consistent. The defect is that **ticking chest / arm / thigh / neck / hip / sleep / mood / blood-pressure / blood-sugar changes nothing anywhere**.
- **Minimal fix (honest, cheap):** restrict the picker to the three supported ids. **Better fix:** drive `WeightLogScreen`'s fields from `selectedTypeIds` — `values` is `Record<string, string|number>` (`src/types/progress.ts:65`) and the Supabase column is `jsonb`, so storage/sync/portability need **zero** change (C-10).
- **Files:** `src/components/customizer/steps/StepMeasurements.tsx` **or** `src/views/ProgressV2.tsx:392-473` + `src/i18n/dict/measurementsScreen.ts`.

### F-12 · «قوالبي» — permanently empty section with mismatched body copy — MEDIUM
See B-8. `src/views/WorkoutView.tsx:482-485`; copy `src/i18n/dict/workoutScreen.ts:116-117`.
- **Minimal fix:** delete the four lines. (Wiring `src/features/customPlan/templates.ts` is a feature wave, not an R9 fix.)

### F-13 · Install banner: "Install" button that opens Settings, on possibly the wrong platform — MEDIUM
- `src/components/InstallBanner.tsx:34,44-49` gates on `isIOS()` (`pwa.ts:63-70`) which matches Chrome/Firefox/Edge on iOS; the guide it opens is Safari-specific (`installGuide.ts:49-54`). `installState.isIOSSafari()` (`installState.ts:33-42`) already does this correctly and is used only by `SettingsView.tsx:397`.
- On iOS the button caption is «ثبّت التطبيق» but the action is "open settings".
- **Minimal fix:** import `isIOSSafari` in `InstallBanner`, and swap the caption to a "show me how" string when `!installable`.
- **Files:** `src/components/InstallBanner.tsx`, `src/i18n/dict/installGuide.ts` / `src/config/strings.ts` (`pwa.bannerInstall`).

### F-14 · Two install-dismissal keys, both raw `localStorage` — LOW (charter §5)
- `qimmah:install-banner:dismissed` written at `src/components/InstallBanner.tsx:37-41`; `qimmah:installPromptDismissed:v1` written at `src/lib/installState.ts:19-26` (the dead component's key).
- **Minimal fix:** route both through `safeWriteJson`; delete the orphan key with `src/components/InstallPrompt.tsx` in the dead-code wave.
- **Files:** `src/components/InstallBanner.tsx`, `src/lib/installState.ts`.

### F-15 · Hard-coded chevron direction in the live Workout list — LOW (RTL/LTR)
- `src/views/WorkoutView.tsx:473` — `<Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />` with **no** `rtl:rotate-0 ltr:rotate-180`. Every comparable row in `ProgressV2.tsx` (`:180,196,206,215`) and `ProfileV2.tsx` (`:210,384,598,610`) has it. In English the arrow points the wrong way.
- **Minimal fix:** append `rtl:rotate-0 ltr:rotate-180`. One line.

### F-16 · Today computes a four-pillar day model that is never rendered — LOW
- `src/lib/todayV2Model.ts:248-266` builds `pillars`, `progressLabel`, `completedCount`, `totalCount`; `src/views/TodayV2.tsx` renders none of them (only `:193` reads one pillar for a boolean). `goalLabel` likewise unused.
- **Minimal fix:** either render a compact day strip (it would answer the "how am I doing today" question for *training*, which the rings do not — A-3), or drop the fields from the model. Leaving both is how the next reader gets misled.
- **Files:** `src/lib/todayV2Model.ts`, `src/views/TodayV2.tsx`.

### F-17 · The app's most destructive local action is gated by a browser-native `window.confirm()` — HIGH
- **`src/views/SettingsView.tsx:73`** — `if (window.confirm(t.settings.resetConfirm)) resetQimmah()`. A full local wipe behind an OS dialog with an OS-language "OK / Cancel", no typed confirmation, no undo, no write verification.
- **`src/components/customizer/steps/StepReview.tsx:199`** — the same pattern for the customizer's full reset.
- The codebase already rejected this pattern elsewhere and wrote down why: `src/components/SessionGuardDialog.tsx:20` («لماذا نافذة داخل التطبيق لا `window.confirm`: الأخيرة لا تحمل نبرة قِمّة»), and `DeleteAccountDialog` requires typed confirmation for the *cloud* account. Deleting everything on the *device* got neither.
- Native dialogs also render in the OS locale/direction, breaking the RTL surface, and are suppressed outright in some WKWebView configurations — meaning on iOS the reset could fire with no prompt at all, or silently not fire.
- **Also here:** `SettingsView.tsx:92,100` gate plan-overwrite with `window.confirm`, and `:94,:102` announce success with `window.alert` **before any write result is inspected** (`regenerateFromProfile()` returns nothing and `applyCustomization` is not checked).
- **Minimal fix:** reuse `SessionGuardDialog`/`DeleteAccountDialog`'s in-app confirmation for the two resets; replace the two alerts with the existing `SuccessToast`, fired only after a checked write.
- **Files:** `src/views/SettingsView.tsx:73,92-103`, `src/components/customizer/steps/StepReview.tsx:199`.

### F-18 · Support email hard-coded outside the dictionaries — LOW
- `src/components/ErrorBoundary.tsx:25` — `const SUPPORT_EMAIL = 'qimmah.support@gmail.com'`, duplicating `contact.emailValue` (`src/config/strings.ts:677,1151`). Two sources of truth for the one address the user writes to when the app has crashed.
- **Minimal fix:** read it from `getStrings(lang).contact.emailValue`, with the literal kept only as the crash-time fallback if the dictionary import is itself the thing that failed.

### F-19 · Settings has two buttons with identical behaviour — LOW
- «إعادة التوليد» (`SettingsView.tsx:92-95`) and «التحويل لنسخة الأجهزة» (`:99-103`) both call the same `regenerateFromProfile()` (`:77-90`). Only the confirm/alert copy differs; nothing in the call switches the plan to machine-based exercises.
- Either the machine switch is unimplemented (the copy promises something the code does not do — an honesty defect) or the button is redundant. **Needs a product answer before a fix.**

---

## Notes for whoever picks this up

1. **Check `scripts/canonical-surfaces.mjs` before editing any `*V2.tsx`.** `WorkoutV2` and `NutritionV2` are dead; `ProgressV2`, `ProfileV2`, `TodayV2` are live. Two past fixes landed on the wrong twin.
2. **F-1 is engine-dependent.** Node's ICU says `ar-SA` = gregory; WebKit says islamic-umalqura. Any future locale guard must run in a browser engine, not Node.
3. F-3 was investigated with three independent methods and did not reproduce — please confirm the founder's build/device before spending a line on it.
