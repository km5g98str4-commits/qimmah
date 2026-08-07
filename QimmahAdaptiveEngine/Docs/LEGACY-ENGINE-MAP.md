# Legacy Engine Map

**Status:** Phase 0.5 deliverable · Authorized by [CTO-QAE-001] §18
**Method:** characterized by direct code reading with file:line references (2026-08-07, branch head = `main` merged into `claude/qae-architecture-design-fhg2mh`). Behavior below is **fact**, not design. Dispositions: `PRESERVE` (QAE reproduces, fixture-pinned) · `SUPERSEDE` (QAE replaces with documented deviation) · `UNRESOLVED` (needs founder/product decision).
**Rule of the phase:** legacy code is the oracle. Nothing here is rewritten now; the 1,170-line generator is **not** copied into the new architecture — contracts and behavior are extracted.

---

## 1. Targets & nutrition calculators — `src/lib/calculators.ts` (440 lines)

| Behavior | Exact characterization | Tests | QAE domain | Disposition |
|---|---|---|---|---|
| BMR | Mifflin-St Jeor `10w + 6.25h − 5a + C`; C: male +5 (`:196`), female −161 (`:197`), unspecified −78 "approximate average" (`:198`); guard: w≤0∨h≤0 ⇒ all-zero targets (`:318`); round after BMR (`:320`) | `test:formula` | Nutrition | PRESERVE (unspecified constant labeled PRODUCT_POLICY, EVR register) |
| TDEE | `min(1.9, NEAT[level] + clamp(days,0,7)×0.025)` (`:110-114`); NEAT: sedentary/light 1.2, moderate 1.35, active/very_active 1.45 (`:22-28`); max reachable 1.625; self-declared NON-STANDARD (`:16-21`); `deriveActivityLevel(days)`: ≤2 light, ≤4 moderate, ≤6 active, else very_active (`planDerive.ts:19-24`) | `test:formula` pins 1.2 and 1.625 | Nutrition | PRESERVE as oracle; flagged for evidence-based revisit (register) |
| Calorie goal | cut −400 (`:44`), bulk +300 (`:47`), maintain/returning/health/recomp +0 (`:244-248`); floor applied **only to cutting**: male 1500 / female 1200 / unspecified 1350 (`:227-229`); low-cal warning vs **raw pre-floor** value, female threshold = BMR, others 1500 (`:262-264`) | `test:formula`, `test:minors` | Nutrition + Safety | PRESERVE (floors reclassified PRODUCT_POLICY per EVR-009; deltas PRODUCT_POLICY) |
| Macros | protein 1.8 g/kg **BW** flat all goals, uncapped (`:38`,`:339`); fat 27 % of target kcal ÷9 (`:41`,`:340`); carbs = remainder from already-rounded grams, floored 0 (`:341`) | `test:formula` | Nutrition | PRESERVE for parity; **flagged L-NUT-1** (see §8) for supersession per EVR-002 |
| Weight forecast | 7,700 kcal/kg (`:50`); rates derived from ±400/300 **regardless of actual goalType** (`:355-366`); minors: diff forced 0 | `test:minors` | Nutrition (display only) | SUPERSEDE — **L-NUT-2**: a maintenance adult with a different target weight gets a cut-derived forecast contradicting their target calories. QAE: forecasts only from the actual active goal; Wishnofsky constant ASSUMPTION, display-only |
| Water | `clamp(roundHalf(kg×0.035), 2.5, 4.0)` L (`:346`); self-declared NON-STANDARD vs EFSA (`:57-61`) | `test:formula` pins clamp | Nutrition | PRESERVE (PRODUCT_POLICY) |
| BMI | value + adult labels at 18.5/25/30; minors get `MINOR_BMI_LABEL` (`:214-224`) | `test:formula` | Assessment (display) | PRESERVE |
| Formula versioning | `CALC_FORMULA_VERSION = 'p25-water-cap4-minor-bmi'` (`:104`) in profile hash → forces recompute | — | Versioning | PRESERVE the *mechanism* (ancestor of RuleSetManifest) |

## 2. Minors / age policy (SAFETY-POLICY §6 baseline)

| Behavior | Characterization | Tests | Disposition |
|---|---|---|---|
| Two thresholds | app minimum **13** (`AGE_RANGE {min:13,max:100}`, `profileDomain.ts:38`, single source consumed by validation/flows) · adult line **18** (`ADULT_MIN_AGE`, `calculators.ts:75`) | `test:age-13` (static text proof incl. anti-smuggling counter-test), `test:minors` (runtime, 9 age×goal combos) | PRESERVE — one policy, single authority, several enforcement points |
| Goal restriction | `isMinorAge = age>0 && age<18` (`:83-85`); `effectiveGoalTypeForAge` ⇒ maintenance (`:92-94`); enforced again at generator entry (`planGenerator.ts:1114-1120`), in personalization derive (`profile.ts:135`), at stored-draft load (`persistence.ts:52`), and in UI option construction | `test:minors` pins: minor targets == TDEE, deficit impossible, forecast zeroed, notes attached; 18 restores cut/bulk | PRESERVE (defense in depth kept; registered under one safety rule ID) |
| Migration | stored minor with cut/bulk → maintenance, idempotent stamp, adult untouched, user-isolation on wipe (`customization.ts:257-269`) | `test:minors` | PRESERVE pattern |
| **Defect** | **L-SAF-1: `isMinorAge(0) === false`** — unset/zero age bypasses the guard entirely (pinned by the proof as intended behavior!) | `test:minors:78-81` | **SUPERSEDE** — QAE: unknown age is a blocking assessment gap (dataIntegrity), never default-adult. Founder confirmation: UNRESOLVED **#U1** |
| Stale comment | `calculators.ts:77-82` says "12+" while the validator floor is 13 | — | note for legacy cleanup wave (not QAE's file to touch) |

## 3. Plan generator — `src/lib/planGenerator.ts` (1,171 lines) → Training/ExerciseSelection

| Behavior | Exact characterization | Disposition |
|---|---|---|
| Experience tiers | `ExpTier` from `experienceBand`: lt1m/1to6m→beginner, 6to12m→novice, 1to2y→intermediate, gt2y→advanced; fallback from trainingLevel (`:64-80`) | PRESERVE → maps onto ExperienceModel.trainingKnowledge (three-axis split is additive) |
| Split | days→split: 1–3 full; 4 U/L; 5 U/L+focus; 6 PPL; 7 PPL×2+full (`:570-588`); focus default **arms** when muscleFocus undefined (`:563-565`); advanced override cycles (full/UL/PPL/arnold/bro) requiring days ≥ cycle length (`:601-648`) | PRESERVE; **L-TRN-2**: arms-as-default-focus is a surprising default — UNRESOLVED **#U2** (keep bug-compatible vs. balanced default) |
| Two split recommenders disagree | `calculators.suggestedSplit` (string, `:278-290`) vs actual generator `splitDays` | SUPERSEDE — QAE has one authority (Training); the string field retires |
| Sets/reps/rest | SCHEMES per goal (bulk 6–10/120s; cut 8–12/90s; etc., `:143-150`); sets by tier: beg/nov 3/3, int 4/3, adv 4/4 (`:124-134`); compound = pattern∈{squat,hinge,push,pull,lunge} (`:116-121`) | PRESERVE (PRODUCT_POLICY tables in register) |
| Session size | base 5/5/6/6 by tier; duration delta −2…+2 at ≤30/≤45/≤60/≤75/>75; clamp [3,9]; full-body min 5 (`:83-114`,`:744`) | PRESERVE |
| Equipment gate | `resolveGymAccess` fallbacks (`equipmentAccess.ts:10-22`); **L-TRN-1: `machinesOnly = access ∈ {full, small}`** — a full-gym user's pool is exactly the 32-machine catalog, never barbells/dumbbells (`planGenerator.ts:713-719`); home = {dumbbell,barbell,bodyweight,band,bench}; bodyweight = {bodyweight}; `ex.environment` field exists but is **never read** | **SUPERSEDE** — metadata-driven selection ([CTO-QAE-001] §8) replaces pool hacks; full gym should mean full equipment with machine-priority for low tiers. Parity fixtures pin the *old* behavior for oracle comparison; the deviation is documented. UNRESOLVED **#U3** (product confirmation of intended full-gym behavior) |
| Free-cable restriction | free cable (cable ∧ ¬machine) only for advanced tier (`:176-183`); beginners machine-first ordering (`:186-188`,`:407-416`) | PRESERVE as selection-policy input |
| Injury filtering | free-text regex detection over 6 areas (ar/en, `:194-205`; `/back/` over-matches); per-area id blocklists (knee 13, shoulder 4, back 9, wrist 34, elbow 22, ankle 12 ids, `:215-257`); **no injury tag on exercises** — new exercises silently opt into every injury profile (**L-TRN-3**); no pool-exhaustion warning (**L-TRN-4**) | SUPERSEDE — metadata `contraindications` + structured injury flags replace id blocklists and free-text regex; blocklists become the initial metadata seeding source. Pool-exhaustion becomes a named DataIntegrity signal |
| Slot system | SLOTS per day-type (full 9, upper 8, lower 8, push 7, pull 7, arms 6, core 6, `:277-348`); pick → backfill from TYPE_MUSCLES → whole-pool (machines-only); A/B/C variation via muscle-rank round-robin (`:424-450`); machines-only accessory append, optional-flagged (`:366-404`,`:750-762`) | PRESERVE structure as ExerciseSelection baseline |
| Weekly placement | Saturday-indexed week; TRAIN_PATTERN per days; Thu/Fri prefer light routines (`:772-816`); user preferred days merged (`:819-835`) | PRESERVE (host-facing; ReviewPeriod-compatible) |
| Post-processing | muscleFocus +1 set (cap 5) then returning/onoff deload −1 set (floor 2) — **can net-cancel** (`:1063-1129`, L-TRN-5 minor) | PRESERVE; ordering documented |
| Progression | **none exists** in the generator; only per-exercise hint: `streakFullReps ≥ 2` → "try +2.5–5 kg" (`exerciseHistory.ts:131-135`) | QAE Adaptation is new ground; the streak hint is the characterized seed of `progressionCompatibility` |
| Nutrition plan | style→template tables, diet substitution (`:890-959`), portion redistribution weight tables (`:900-940`), uniform scaling clamp [0.6,1.6] (`:1007-1022`), honesty warning at >12 % kcal or >15 % protein deviation (`:1024-1040`) | PRESERVE (meal templating remains host/product; QAE owns targets, not menus) |
| Commitments/measurements | per-goal commitment id sets (`:1043-1055`); fixed measurement plan {weightKg, waistCm, bodyFatPercent} (`:1058-1060`) | PRESERVE (host-side plan furniture) |
| Warnings | minor note, conservative start, beginner ≥5 days advice, injury note, legs<2 warnings (`:1134-1152`) | PRESERVE → become reason codes |
| Determinism | no Date/random/Intl; **`localeCompare` at `:414`,`:433` (+ personalization `engine.ts:167,:255`, `exerciseSelection.ts:191`) = L-GEN-1**: host-locale-dependent tie-breaks, ASCII-safe in practice, not by spec | SUPERSEDE — ordinal comparison per NUMERIC-CONTRACT §3 (behavior-identical for current ASCII ids ⇒ safe supersession) |

## 4. Adaptive question engine — `src/lib/personalization/` (2,564 lines + 863-line dict) → AdaptiveQuestion/IncrementalAssessment

| Behavior | Exact characterization | Disposition |
|---|---|---|
| Condition system | ops: eq/ne/in/nin/gt/gte/lt/lte/has/hasAny/hasNone/answered/unanswered + all/any/not/const (`types.ts:42-72`); total evaluator, unknown⇒false, undefined⇒true (`rules.ts:90-98`); introspection `fieldsOf`/`explain` | PRESERVE → maps 1:1 onto RULE-MODEL predicates |
| Selection | consent gate → contradiction clarify (off-budget) → mandatory (to hardCap) → safety `clear` follow-ups (off-budget vs soft max) → scored remainder: `priority + 15·queued − 6·answeredSiblings` (exempt: basics/safety/limitations/clarify); past min only `infoGain ≥ 5`; stops complete/cap_reached/exhausted/consent_pending (`engine.ts:171-265`) | PRESERVE (QUESTION-ENGINE §4) |
| Budgets | DEFAULT_BUDGET 15–17/16–18/18–20 by class, hardCap 20; `CHARTER_TREE_BUDGET` (11–13…15–19) declared but **unwired** | PRESERVE default; **UNRESOLVED #U5**: which budget is the product intent |
| Bank | 193 questions (core 31, goals 22, logistics 33, health 32, preferences 37, advanced 24, clarify 14); 14 required; 10 safety-clear; `levels` gating only in advanced pack; integrity checker (dup ids, empty affects, unknown followups…) | PRESERVE (content untouched; schema formalized in contracts) |
| Effects wiring | `affects` is documentation-only (never read by engine) — actual impact via string-key reads in `profile.ts` (**L-QST-2**: no static guarantee affects ↔ reads) | SUPERSEDE — contract requires verified affects↔derivation mapping |
| Contradictions | 8 conflicts as pure predicates; flags recomputed each answer (stale-impossible); clarify eligibility on flags; resolved conflicts never re-fire; `CLARIFY_TO_CONFLICT` is a **duplicated literal** claiming to be derived (**L-QST-4**) | PRESERVE semantics; derive the map, delete the duplication |
| Unreachable clarifies | 5 gap-fill clarify questions can never be served by `selectNext` (stage 3 filters `category !== 'clarify'`; they're neither required nor safety-clear) (**L-QST-3**) | SUPERSEDE — clarify reachability becomes a bank-integrity check; product decides each question's fate at contract freeze |
| Experience classification | 10 weighted signals (Σw 13.5), score×20 → bands 18/38/55/75; `trainedBefore='never'` hard-forces complete_beginner; returning-state detection (layoff ∧ real prior volume); confidence = 0.6·coverage + 0.4·self-agreement | PRESERVE → seeds ExperienceModel (knowledge axis + returning detection) |
| Profile derivation | safety flags (screen answers → needsClearance, area→pattern restrictions — note shoulder/elbow/wrist/upper_back/neck map to **no pattern restriction** (**L-QST-5**, likely intentional for patterns but worth confirming), maxExerciseLevel min-of-two, noValsalva); volume by class 8/10/12/14/16/9 ± recovery/pref adjustments, clearance cap 8, clamp [6,22]; rep/rest/intensity ranges; equipment derivation (gym ⇒ full vocab **without asking**); cardio willingness mapping | PRESERVE as characterized derivation contract |
| Exercise selection | 4-stage: hardExclude (8 named reasons) → level cap → additive ranking (goal/preference/style/priority/level/pattern/quality) → substitutions (same pattern+muscle, ±1 level, cap 3); **L-QST-6: `isImpact` uses English-name regex `/bike|row|elliptical|swim|walk/i`** inside a safety filter | PRESERVE pipeline; SUPERSEDE L-QST-6 via metadata (impact flag) |
| Persistence | safeStorage envelopes, owner-scoped keys, versioned, drafts treated as untrusted (incl. minor-goal draft rejection); migration from onboarding never invents consent, never guesses injuries into body areas | PRESERVE pattern (host-side in QAE; contract states expectations) |
| Determinism | no Math.random; `Date.now` only as injectable defaults; proof injects fake clock; localeCompare = L-GEN-1 | PRESERVE clock-injection discipline (ancestor of the Clock contract) |
| Proof | `test:personalization`: 222 executed assertions incl. counter-tests (jargon leak, minor smuggling, Gulf-context term ban) — but **does not pin**: +15/−6 constants, infoGain threshold, exempt list, cap_reached/exhausted reasons | PRESERVE proof; QAE fixtures close the unpinned-constant gaps |
| Wiring status | **fact:** nothing outside the module imports it — engine complete, UI-unwired | context for #U5 sequencing |

## 5. Recovery — `src/lib/recovery.ts` (v1, deprecated) + `src/lib/recoveryEngine.ts` (v2, 543 lines) → Recovery

| Behavior | Exact characterization | Disposition |
|---|---|---|
| v1 (shipped UI) | 3-level enums, additive score, severe soreness ⇒ rest; outputs rest/light/full/reassess; DEPRECATED header | characterized only; QAE baseline is v2 |
| v2 factors | 8 factors with weights: sleep quality/duration (7–9.5 h recovered band), energy, stress, soreness (severe=w3 decisive; area-granular), training load (7d vs 8–14d ratio ≥1.5 or ≥6 sessions ⇒ w2), resting-HR ratio ≥1.08, HRV ratio ≤0.85 (`recoveryEngine.ts:147-202`) | PRESERVE as Recovery's characterized factor model (weights PRODUCT_POLICY in register) |
| v2 decision | margin = strain−recovered; severe ⇒ rest; ≥2 strained ∧ margin ≥5 ⇒ rest; margin ≥2 ⇒ reduce_volume (if load-strain w≥2) else reduce_intensity; mixed signals ⇒ conflicting proceed with capped confidence | PRESERVE; outputs map onto QAE recovery actions incl. composite construction |
| v2 confidence | `0.2 + 0.7·(reasons/8)`, caps 0.35 conflicting / 0.3 low-data, clamp [0.1,0.95] | SUPERSEDE representation — QAE Confidence is the closed enum with documented backing (v2's float becomes the internal backing of the mapping) |
| Trend | 7/28-day split-half means, ±5 band, <2 days ⇒ stable, explicit null missing days | PRESERVE (WeeklyTrends seed) |
| Rule D | engine cannot touch the plan — enforced by a *textual* source guard in the proof | PRESERVE intent; QAE enforces structurally (proposals-only architecture makes Rule D a type property, not a grep) |
| Wiring status | **fact:** v2 is complete and UI-unwired; shipped screen uses deprecated v1 | context: QAE Recovery formalizes v2, retiring both |
| Determinism | injectable now in core fns; wall-clock at save/enqueue; `new Date("YYYY-MM-DD")` UTC-midnight vs local stamps ⇒ ±1 day drift (**L-OBS-2** family) | SUPERSEDE via NUMERIC-CONTRACT §4 |

## 6. Steps, observations, trends → Steps/DataQuality/WeeklyTrends

| Behavior | Exact characterization | Disposition |
|---|---|---|
| Steps model | day-keyed maps, sources manual/healthkit/google-fit/external (unknown→external); clamps: steps ≤200,000, goal [1,000,100,000] default **10,000**; zero deletes the day; **no progression/adaptive target of any kind**; onboarding `stepEstimate` never influences goal or calories | Steps engine is new ground ([CTO-QAE-001] §14); flat default SUPERSEDED by baseline-derived targets; clamps PRESERVE as sanity bounds |
| Steps proof | `test:e-steps` is **static text analysis** — no numeric behavior pinned (**L-STP-1**: clamps/default/streak math have zero runtime coverage) | QAE fixtures add runtime pins |
| Step displays | streak loop **unbounded** in `eStepsModel.ts:59-65` (vs 366-cap in insights) (**L-STP-2**); two 7-day builders with inconsistent DST handling (**L-STP-3**) | superseded by DataQuality localDate arithmetic |
| Measurements | `MeasurementLog` values `Record<string, string\|number>` parsed by regex `/-?[\d.]+/` at read sites; units baked into key names; no unit field (**L-OBS-1**) | SUPERSEDE — canonical typed observations (DATA-QUALITY) |
| Weight "trend" | `measurementLog.trendFor` = last-two-entries comparison, no tolerance band (**L-OBS-3**: 0.1 kg jitter reads as trend); `progressV2Model` = first-vs-last differencing in 14-day window, ≥2 points; on-track bands cut ≤−0.2 / bulk ≥+0.2 / maintain ±0.5 kg; adherence `done/(daysPerWeek×2)`, self-labeled NON-STANDARD | SUPERSEDE for decisions (WeeklyTrends uses the insights-grade math); display bands PRESERVE as PRODUCT_POLICY candidates |
| Insights (real trend math) | OLS slope (NIST-cited) over 28 days after 7-day centered observation-weighted smoothing; abstains < 4 points or < 14-day span; plateau = ≥3 weeks ∧ smoothed range ≤1.2 kg (= 2×0.6 band); stale at 9 days; Saturday week start; priority-ordered cards, max 3, explicit abstain | PRESERVE as the characterized seed of WeeklyTrends (thresholds self-labeled NON-STANDARD ⇒ PRODUCT_POLICY in register, EVR gap #4) |
| Exercise history | Epley 1RM `round(w(1+reps/30))`; skipped sessions untouched (PR integrity); `streakFullReps` reset semantics (0 on incomplete, 1 on weight change) | PRESERVE (performance-marker observations feed WeeklyTrends) |
| Day stamping | local-TZ `getDayStamp` everywhere; duplicated impl in historyStore; two different date parsers across modules; wall-clock writes unin jectable in historyStore (**L-OBS-2**) | SUPERSEDE — single arithmetic localDate (NUMERIC-CONTRACT §4); host stamps observations at capture |
| Health data | health-sourced measurement rows **never sync** (`historyStore.ts:306`, `:325`) | PRESERVE invariant (DATA-QUALITY §4) |
| Weekly check-in | **fact: none exists.** No engine evaluates weeks or feeds plans; insights are render-time display cards; weekSummary is one-time first-week retrospective | WeeklyTrends/Adaptation/DecisionResolver are confirmed greenfield |
| Hydration | in-workout reminder cadence (20 min/250 ml defaults, clamps, single-source write) — runtime-proofed | out of QAE scope (host feature); water *target* formula covered in §1 |

## 7. Test coverage index (for characterization fixtures)

Runtime proofs (pin numeric behavior): `test:formula` · `test:minors` · `test:recovery` · `test:recovery-engine` · `test:hydration` · `test:personalization` (222 asserts).
Static text proofs (pin wiring/copy only — **no numeric coverage**): `test:age-13` · `test:e-steps`.
Gaps QAE fixtures must close: personalization scoring constants (+15/−6/infoGain≥5/exempt list), steps math entirely, stop reasons cap_reached/exhausted, planGenerator slot behavior (no direct proof pins SLOTS/backfill), calculators' unspecified-sex path beyond formula proof.

## 8. Known-defect register (each gets a QAE regression fixture or an explicit bug-compatibility decision)

| ID | Defect | Severity | QAE handling |
|---|---|---|---|
| L-SAF-1 | `isMinorAge(0)=false` — unknown age ⇒ adult path | High (safety) | supersede: unknown age blocks finalization (**#U1**) |
| L-GEN-1 | `localeCompare` tie-breaks (5 sites) — host-locale-dependent ordering | Med (determinism) | supersede: ordinal comparison (behavior-identical on current ASCII ids) |
| L-TRN-1 | full gym ⇒ 32-machine-only pool; equipment gate bypassed; `ex.environment` never read | Med (product) | supersede via metadata (**#U3**) |
| L-TRN-2 | undefined muscleFocus ⇒ arms focus day at 5 days | Low (product) | **#U2** |
| L-TRN-3 | injury exclusion by id blocklist; new exercises unprotected | Med (safety) | supersede via `contraindications` metadata |
| L-TRN-4 | injury+machines pool exhaustion under-fills days silently | Med | named DataIntegrity signal |
| L-TRN-5 | focus +1 / deload −1 net-cancel | Low | documented; ordering explicit in contract |
| L-NUT-1 | protein 1.8 g/kg BW uncapped — 250 kg ⇒ 450 g protein, carbs floor 0 | Med | supersede: EVR-002-aligned bounds + macro sanity in SafetyPolicy |
| L-NUT-2 | weight forecast ignores actual goal | Low (honesty) | supersede (display honesty) |
| L-QST-2 | `affects` unchecked vs actual reads | Med (maintainability) | contract-verified mapping |
| L-QST-3 | 5 clarify questions unreachable | Low | reachability integrity check |
| L-QST-4 | CLARIFY_TO_CONFLICT duplicated literal | Low | derived, not duplicated |
| L-QST-5 | shoulder/elbow/wrist/upper_back/neck → no pattern restriction in AREA_RESTRICTIONS | Med (safety, likely partial by design — overhead/valsalva flags cover some) | verify intent at contract freeze; metadata contraindications close the gap |
| L-QST-6 | impact detection via English-name regex in safety filter | Med (safety) | supersede via metadata impact flag |
| L-OBS-1 | measurements untyped, regex-parsed, unit-in-key-name | Med | canonical observations |
| L-OBS-2 | local-TZ day stamps, dual parsers, UTC/local mixing, wall-clock writes | Med (determinism) | NUMERIC-CONTRACT §4 |
| L-OBS-3 | two-point "trend" with no band | Med (honesty) | WeeklyTrends replaces for decisions |
| L-STP-1..3 | steps math runtime-untested; unbounded streak loop; inconsistent DST in 7-day builders | Low–Med | QAE fixtures + DataQuality |

**Wiring facts worth repeating:** the personalization engine (193 questions) and recoveryEngine v2 are both *complete and unwired to UI*. QAE's specification treats them as the strongest oracles precisely because their behavior is proof-pinned and free of UI coupling.
