# Qimmah formula verification

**Audit date:** 2026-07-16

**Code base:** `integration/wave6-staging` at `82c53ceb0e873727a38b5cfebd641e8db14f7b23`

**Method:** read the live implementation, identify it from its coefficients, verify references against primary or consensus sources, then assert independent hand calculations against the live exports. A green proof means “the implementation produced the documented number”; it does **not** turn a heuristic into a validated physiological model.

Run the proof without changing `package.json`:

```bash
node scripts/science/run-formula-proof.mjs
```

The runner uses the current worktree's installed `esbuild`, or the same lockfile-installed copy from the repository owning the shared Git directory when the worktree intentionally has no `node_modules`.

## Evidence sources

Sources were checked on 2026-07-16. Dates below are publication dates, not access dates.

1. Mifflin MD et al., “A new predictive equation for resting energy expenditure in healthy individuals,” *American Journal of Clinical Nutrition* 51(2), February 1990. [PubMed 2305711](https://pubmed.ncbi.nlm.nih.gov/2305711/), [DOI](https://doi.org/10.1093/ajcn/51.2.241). This is the coefficient-level match for the app's sex-specific adult RMR equation.
2. Morton RW et al., resistance-training protein meta-analysis/meta-regression, *British Journal of Sports Medicine* 52, 2018. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/), [DOI](https://doi.org/10.1136/bjsports-2017-097608). It reports a 1.62 g/kg/day breakpoint and 95% CI up to 2.20; Qimmah's 1.8 is inside that interval.
3. National Academies, *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids*, 2002/2005. [Report](https://www.nationalacademies.org/read/10490/chapter/32). Adult fat AMDR is 20–35% of energy; 27% is an in-range product choice, not a uniquely recommended point.
4. National Academies, *Dietary Reference Intakes for Energy*, 2023. [Report](https://www.nationalacademies.org/read/26818/chapter/3), [DOI](https://doi.org/10.17226/26818). Documents use of general Atwater energy conversion factors. USDA also states 4 kcal/g carbohydrate, 4 kcal/g protein and 9 kcal/g fat in its [Food and Nutrition Information Center](https://www.nal.usda.gov/programs/fnic).
5. EFSA NDA Panel, “Scientific Opinion on Dietary Reference Values for water,” *EFSA Journal* 8(3), 2010. [DOI](https://doi.org/10.2903/j.efsa.2010.1459). Adult adequate intakes are population/sex based (2.0 L/day women, 2.5 L/day men); it does not establish Qimmah's `35 mL/kg` rule or a universal 2.5 L floor.
6. Wishnofsky M, “Caloric equivalents of gained or lost weight,” 1958. [PubMed 13594881](https://pubmed.ncbi.nlm.nih.gov/13594881/). Historical basis for about 7,700 kcal/kg. Modern dynamic-model context: Hall KD et al., *Lancet* 2011, linked by the [NIDDK Body Weight Planner research page](https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner).
7. WHO, “Obesity and overweight,” updated 8 December 2025. [Fact sheet](https://www.who.int/en/news-room/fact-sheets/detail/obesity-and-overweight). BMI is kg/m²; adult thresholds are ≥25 and ≥30, while ages 5–19 require BMI-for-age. This distinction matters at Qimmah's age-12 boundary.
8. Brzycki M, “Strength Testing—Predicting a One-Rep Max from Reps-to-Fatigue,” *JOPERD* 64(1), 1993. [DOI](https://doi.org/10.1080/07303084.1993.10606684). Primary attribution for `w × 36 / (37 − reps)`.
9. Epley B, *Poundage Chart*, 1985. This is the commonly cited origin of `w × (1 + reps/30)`; unlike Brzycki, an accessible peer-reviewed primary paper for the original chart was not found. It is therefore attributed but evidence-graded lower.
10. NIST/SEMATECH, “Linear Least Squares Regression,” e-Handbook §4.1.4.1. [NIST method reference](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm). This supports the ordinary least-squares method, not Qimmah's smoothing window or plateau thresholds.

## Inventory: formulas as implemented

Line numbers refer to this branch after its citation-only comments.

| Metric / claim | Implementation | Formula exactly as implemented | Identification / citation | Proof | Verdict |
|---|---|---|---|---|---|
| Activity multiplier | `src/lib/calculators.ts:21-32,60-64` | `min(1.9, NEAT[level] + clamp(round(days),0,7)×0.025)`; NEAT = 1.20/1.20/1.35/1.45/1.45 | No matching published standard found | 1.2 at zero training; 1.625 at very-active + 7 days | **NON-STANDARD — correctness risk** because it drives every TDEE |
| BMR/RMR | `src/lib/calculators.ts:124-135,235` | rounded `10W + 6.25H − 5A + s`; `s=+5` male, `−161` female, `−78` unspecified | Exact Mifflin–St Jeor coefficient match [1]; `−78` is app midpoint, not MSJ | Male/female ages 18–45 plus edges | Standard for adult male/female; **NON-STANDARD** unspecified-sex midpoint; **out-of-population risk at age 12** |
| TDEE | `src/lib/calculators.ts:237` | `round(round(BMR) × customActivityMultiplier)` | BMR standard; multiplier custom | All six profile vectors | **NON-STANDARD composite** |
| Goal calories | `src/lib/calculators.ts:43-46,148-177,239-243` | maintenance=`TDEE`; cut=`max(round(TDEE−400), floor)`; bulk=`round(TDEE+300)`; floors M/F/U=1500/1200/1350 | Fixed deltas and floors are local policy | Cut, bulk, maintain, floor-adjacent vectors | **NON-STANDARD — correctness risk**; should be adjustable/calibrated |
| Protein | `src/lib/calculators.ts:35-37,252` | `round(1.8 × bodyWeightKg)` | 1.8 sits inside Morton 2018 evidence range [2] | 54–450 g/day across bounds | Evidence-aligned for resistance-training adults; **risk at age 12/extreme body weight** |
| Fat target | `src/lib/calculators.ts:38-40,253` | `round(targetCalories × 0.27 / 9)` | 27% lies in adult 20–35% AMDR [3]; 9 kcal/g Atwater [4] | All profiles | In-range adult heuristic; not an individualized prescription |
| Carb target | `src/lib/calculators.ts:248-254` | `max(0, round((calories − protein×4 − fat×9)/4))` | General Atwater 4/4/9 [4] | All profiles | Standard accounting with rounding; food-specific factors can differ |
| Food database energy audit | `scripts/food-db-validate.mjs:65-75,111-122` | strict=`4P+4C+9F`; fiber-aware lower=`strict−2×min(fiber,C)`; warning outside ±15% | General Atwater [4]; 2 kcal/g fiber and ±15% are audit policies | Covered by `test:food-db` | Atwater-aligned validator; tolerance is **NON-STANDARD** |
| Meal macro aggregation | `src/lib/nutritionPlan.ts:20-37,95-104` | sum each ingredient macro × servings; meal/plan totals are arithmetic sums | Arithmetic, no physiological inference | Existing nutrition/gate proofs | Clean accounting |
| Water target | `src/lib/calculators.ts:255-258` | `max(2.5, roundTo0.5(weightKg×0.035))` | Does not match EFSA sex-specific AI methodology [5] | 2.5–9.0 L/day across bounds | **NON-STANDARD — correctness risk**, especially 9 L max-bound output |
| BMI and labels | `src/lib/calculators.ts:140-145,259-260` | `round1(W/(H/100)²)`; labels at 18.5/25/30 | Adult formula/thresholds match WHO [7] | BMI 20.8–51.7 | Adult match; **incorrect population rule at age 12** because WHO requires BMI-for-age |
| Weekly weight-change estimate | `src/lib/calculators.ts:47-49,262-275` | cut=`−round1(400×7/7700)`; bulk=`round1(300×7/7700)` | Static Wishnofsky rule [6] | −0.4 and +0.3 displayed | **NON-STANDARD static forecast — correctness risk**; physiology is dynamic |
| Weeks to goal | `src/lib/calculators.ts:265-275` | `ceil(abs(target−current) / unroundedWeeklyRate)` when difference exceeds 0.05 kg | Derived from same static rule [6] | 20, 22, 28 weeks | **NON-STANDARD static forecast — correctness risk** |
| Weekly volume change | `src/lib/insights/metrics.ts:59-70` | `round((thisWeek−lastWeek)/lastWeek×100)`; null when prior week=0 | Product statistic | 200 vs 100 = 100% | Exact descriptive arithmetic |
| Adherence (Insights) | `src/lib/insights/metrics.ts:88-108` | weekly=`min(100,round(uniqueDoneDays/planned×100))`; 4-week mean includes zero weeks | Product KPI, no external standard | 75%; four-week 31% | **NON-STANDARD harmless KPI** if named “plan completion,” not clinical adherence |
| Weight smoother | `src/lib/insights/metrics.ts:48-55,121-126` | for each observation, mean observations within ±3.5 days; last ~28 days preferred | Not a conventional trailing 7-calendar-day average | `[70,72,80]→[71,71,80]` | **NON-STANDARD**; centered and observation-weighted |
| Weight slope | `src/lib/insights/metrics.ts:37-46,126-127` | OLS `(nΣxy−ΣxΣy)/(nΣx²−(Σx)²)`, then ×7 and round 0.01 kg/week | OLS standard [10] | `y=2x+1→2`; weight series → −0.2 kg/week | Method standard; result remains an estimate |
| Plateau | `src/lib/insights/metrics.ts:15-24,128-133` | span≥3 weeks and smoothed range≤`2×0.6=1.2 kg`; flat if `|slope|<0.1` | Local thresholds | 3-week/0.6 kg vector → plateau | **NON-STANDARD harmless heuristic**, wording must stay hedged |
| Protein hit rate | `src/lib/insights/metrics.ts:138-152` | hit when logged protein≥`0.9×target`; abstain under 3 logged days in 7-day lookback | Local threshold | 3 hits of 4 logs | **NON-STANDARD harmless KPI** |
| Streak | `src/lib/insights/metrics.ts:156-172` | consecutive session dates ending today/yesterday; consistent weeks have ≥1 session, max 8 | Product counter | Covered by `test:insights` | Exact counter, not a health inference |
| Near-PR | `src/lib/insights/metrics.ts:176-192` | gap=`(best−topSet)/best×100`; “near” at 2.5–6% in last two weeks | Local threshold | Covered by `test:insights` | **NON-STANDARD harmless heuristic** |
| Epley e1RM | `src/lib/strength/e1rm.ts:19-23` | `w×(1+reps/30)` | Epley attribution [9] | 100×12=140 | Known estimate; lower source confidence than Brzycki |
| Brzycki e1RM | `src/lib/strength/e1rm.ts:24-29` | `w×36/(37−reps)`; NaN at reps≥37 | Brzycki 1993 [8] | 100×5=112.5 | Published estimate |
| Qimmah e1RM selector | `src/lib/strength/e1rm.ts:31-39` | reps=1→weight; reps≤10→Brzycki; reps>10→Epley; round 0.5 kg | Hybrid boundary/rounding is local | 5 and 12 reps | **NON-STANDARD hybrid**, but correctly labeled estimated in UI |
| Strength velocity | `src/lib/strength/e1rm.ts:75-87` | `(last e1RM−first e1RM)/elapsedWeeks`, round 0.1 | Endpoint slope, not OLS and not causal | `(117−112.5)/2→2.3` | **NON-STANDARD descriptive estimate**, sensitive to endpoint choice |
| Plate calculator | `src/lib/strength/plates.ts:7-9,87-162` | bounded exact per-side subset sums in 0.25 kg integer units; total=`bar+2×side` | Exact arithmetic/algorithm, not a scientific claim | 100 kg loadout and identity | Correct deterministic accounting |
| Warm-up ramp | `src/lib/strength/warmup.ts:46-72` | bar×10, 40%×8, 60%×5, 80%×3, then work set; nearest reachable plates | Local prescription | 100 kg → 20/40/60/80/100 and 10/8/5/3/5 | **NON-STANDARD training heuristic** |
| Progress two-week adherence | `src/lib/progressV2Model.ts:238-243` | `min(100,round(uniqueFinishedDays/(2×planDays)×100))` | Product KPI distinct from Insights' current-week KPI | Existing `test:progress-v2` | **NON-STANDARD; duplicate definitions can confuse users** |
| Weight “on track” | `src/lib/progressV2Model.ts:246-253` | cut≤−0.2 kg; bulk≥+0.2 kg; maintain `|change|≤0.5 kg` | Local labels | Existing progress proof covers rendering/data path | **NON-STANDARD product thresholds** |
| Today completion rings | `src/lib/todayV2Model.ts:74-77,120-127` | `clamp(round(current/target×100),0,100)`; remaining=`max(0,target−current)` | Exact product ratio | Existing `test:today-v2` | Clean arithmetic |
| Workout duration | `src/lib/todayV2Model.ts:75-77`; `src/lib/workoutV2Model.ts:91-92` | `max(20, round(exerciseCount×9/5)×5)` if no user duration | Local display heuristic | Existing Today/Workout proofs | **NON-STANDARD harmless estimate**; one UI path lacks a nearby estimate marker |
| Steps and burn | `src/lib/todayV2Model.ts:120-125`; `src/lib/stepCounter.ts` | raw stored/HealthKit steps, remaining steps, completion ratio | No kcal/burn conversion exists | Source inventory + native bridge tests | **No step-calorie/burn estimate to validate** |

## Hand-computed profile vectors

All values below are literals in `scripts/science/formula-proof.ts`, not values copied from the engine at runtime. The runner compared them to `computeTargets` and passed all assertions.

| Profile | Hand calculation summary | Expected live result |
|---|---|---|
| Saudi male, cut, 30 y, 178 cm, 85→78 kg, moderate + 4 days | BMR=`850+1112.5−150+5=1817.5→1818`; activity=`1.35+0.10=1.45`; TDEE=`round(1818×1.45)=2636`; cut=`2236`; P=`153`; F=`round(2236×.27/9)=67`; C=`round((2236−612−603)/4)=255`; water=`3.0`; BMI=`26.8`; weeks=`ceil(7/(2800/7700))=20` | PASS |
| Saudi female, bulk, 35 y, 165 cm, 62→68 kg, light + 3 days | BMR=`620+1031.25−175−161=1315.25→1315`; activity=`1.275`; TDEE=`1677`; bulk=`1977`; P/F/C=`112/59/250`; water=`2.5`; BMI=`22.8`; weeks=`ceil(6/(2100/7700))=22` | PASS |
| Male, maintain, 18 y, 172 cm, 68 kg, active + 5 days | BMR=`1670`; activity=`1.575`; TDEE=`2630`; P/F/C=`122/79/358`; water=`2.5`; BMI=`23.0` | PASS |
| Female, cut, 45 y, 160 cm, 75→65 kg, sedentary + 0 | BMR=`1364`; TDEE=`1637`; cut=`1237`; P/F/C=`135/37/91`; water=`2.5`; BMI=`29.3`; weeks=`28` | PASS |
| Onboarding minimum and age-12 boundary: female, 120 cm, 30 kg | BMR=`829`; TDEE=`995`; P/F/C=`54/30/127`; BMI=`20.8` | **Implementation PASS; scientific/population verdict FAIL** |
| Onboarding maximum: male, 80 y, 220 cm, 250 kg, 7 days | BMR=`3480`; TDEE=`5655`; P/F/C=`450/170/581`; water=`9.0`; BMI=`51.7` | **Implementation PASS; extreme-output safety review required** |

Proof total after adding insights/strength/plate/warm-up vectors: **77 passed, 0 failed**.

## NON-STANDARD list and severity

1. **Correctness risk — paediatric boundary:** onboarding accepts age 12, but the code applies adult MSJ coefficients and adult BMI cut-points. WHO explicitly requires BMI-for-age for 5–19. Future gated wave: either set adult-only age eligibility, or implement validated paediatric energy/BMI-for-age handling with clinical review.
2. **Correctness risk — custom TDEE:** the exact NEAT table plus `0.025×trainingDays` has no identified standard. Future wave: label it as Qimmah's calibration, measure prediction error, and let observed weight/intake calibrate it.
3. **Correctness risk — static weight forecast:** `7700 kcal/kg` with constant deficits/surpluses ignores adaptive expenditure and changing tissue composition. Future wave: remove exact weeks or replace with a range/dynamic model; never show it as a promise.
4. **Correctness risk — hydration:** `35 mL/kg` with universal 2.5 L floor can output 9 L/day at allowed maximum weight and ignores sex, climate, food water, renal/cardiac context and exercise losses. Future wave: show a broad estimate/range and require domain review.
5. **Moderate — calorie offsets/floors:** fixed −400/+300 and 1200/1500/1350 floors are product choices. Future wave: expose assumptions and individual adjustment rules rather than calling them safe limits.
6. **Moderate — unspecified sex:** `−78` is the arithmetic midpoint of MSJ sex constants, not a validated coefficient. Future wave: explain the compromise or request the variable needed by the equation.
7. **Moderate — duplicated adherence:** Insights measures current week plus a four-week zero-filled average; Progress measures a two-week window. Both are internally correct but can disagree. Future wave: name windows explicitly or use one canonical KPI.
8. **Harmless heuristic:** centered observation-weighted “7d” smoothing, plateau band, PR proximity, protein-hit threshold, warm-up ramp, duration estimate and hybrid e1RM selector. Keep them labeled as estimates/product rules and regression-test their boundaries.

## Honesty alignment

| Surface | Evidence | Verdict |
|---|---|---|
| Calculation explainer | `src/i18n/dict/calcScreen.ts:70-71,121-122` globally says all values are estimates and not medical advice | Generally aligned |
| Calculation intro | Same intro says the numbers are based on “well-known equations”; only MSJ/Atwater/BMI and component e1RM equations qualify, while TDEE, water, offsets and forecasts are local | **Mismatch:** plural claim over-blesses custom rules |
| BMR/TDEE/calorie results | Individual result rows do not carry `~`/“estimated”; only page-level disclaimer does | **Moderate mismatch:** exact-looking outputs despite compounded uncertainty |
| Fat rationale | `calcScreen.ts:104` says a “healthy 25–30% range”; consensus AMDR found is 20–35% for adults | **Minor mismatch:** 27% is defensible, named range is narrower than cited consensus |
| Weight trend Insights | `src/data/insightCopy.ts:14-15` uses “يبدو”، `~`, and “تقديري”; insufficient data abstains | Aligned |
| e1RM | `src/views/ProgressV2.tsx:416-422` shows `~` and `تقديري` | Aligned |
| Body fat | `src/views/ProgressV2.tsx:199,327-328` says estimated | Aligned |
| Workout duration | Workout V2 shows `~`; Today can show computed minutes without a nearby estimate label when no user duration is stored | **Minor mismatch** |
| Age 12 BMI | Adult labels such as “normal/high” are applied despite WHO requiring BMI-for-age | **Major mismatch / population error** |
| Steps | App uses raw source counts and explicitly avoids fake steps; no burn estimate | Aligned |

## Recommended next gated wave

1. Resolve the age-12/adult-equation conflict before presenting body/energy classifications to minors.
2. Replace exact weeks-to-goal with a range or dynamic, recalibrated forecast.
3. Reframe custom activity, hydration, cut/bulk offsets and floors as editable Qimmah defaults, with nearby estimate markers.
4. Canonicalize adherence window/naming across Insights and Progress.
5. Preserve this proof as a required gate whenever calculator/insight/strength formula versions change.

## Scope integrity

No formula logic, package metadata, or view was changed. Source edits on this branch are citation/classification comments only. Executable additions are confined to `scripts/science/**`; this document is confined to `docs/features/**`.

## Verification record

Fresh verification used an exact `/tmp` copy so this read-only worktree did not gain `node_modules`, `dist`, screenshots, or other generated files outside the allowed surface.

- Formula proof: **77 passed, 0 failed**.
- `typecheck`, strict `lint`, and production `build`: exit 0.
- `test:gate`, `test:observability`, and `test:native-bridge`: exit 0.
- `test:e2e`: onboarding **11/11**, zero console errors.
- `test:e2e:journey`: deterministic journey, export/import, policy and account isolation green.
- `test:e2e:auth:preflight`: **19/19**. The full local-Supabase auth suite was not applicable because the Docker daemon and Supabase images were unavailable; it exercises auth infrastructure, not formula behavior.
- Diff audit: only this report, `scripts/science/**`, and comment-only additions in formula source files; zero logic-line additions/deletions and `git diff --check` clean.

---

# Remediation — scientific guardrails

**Branch:** `fix/scientific-guardrails` (from `integration/wave6-staging`). **Date:** 2026-07-16.

The audit above deliberately changed no logic. This section records the safety fixes that
followed, **with the decision behind each — not only the resulting number.** Two risks were
launch-relevant because the onboarding limits (`src/lib/validation.ts`: `age.min = 12`,
`weightKg.max = 250`) let real users reach them: adult BMI labels applied to minors, and a
hydration target that reached 9 L/day at the maximum weight.

## Decision 1 — minors never receive an adult BMI classification

**Problem.** `bmiLabelFor` applied the adult cut-points 18.5/25/30 to everyone, including a
12-year-old. WHO is explicit that ages 5–19 require **BMI-for-age** (sex- and age-specific
z-scores), and that the adult thresholds (25/30) only coincide with the reference at age 19
([WHO growth reference 5–19](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age);
[WHO obesity fact sheet](https://www.who.int/en/news-room/fact-sheets/detail/obesity-and-overweight)).

**Options weighed.**
1. *Implement BMI-for-age.* Rejected for now: it requires the WHO/CDC LMS reference tables and
   exact sex+age, and inventing percentiles without that data would be a fabricated medical
   classification — the exact failure the mission forbids.
2. *Adult-only eligibility (block <18).* A product/policy change beyond this scope; noted as a
   recommendation, not executed here.
3. *Disable the classification for minors and refer to a specialist.* **Chosen.** It is fully
   defensible with the data we have and invents nothing.

**Decision.** For `age < ADULT_MIN_AGE` (18) the app still shows the raw BMI **number** (the
`kg/m²` ratio is arithmetic and correct) but replaces the adult *label* with a neutral,
non-diagnostic `MINOR_BMI_LABEL` that points to a specialist, and adds `MINOR_PLAN_NOTE` to the
plan so the energy/macro figures (adult Mifflin–St Jeor, protein/kg — out of validated
paediatric range) are read as rough estimates under professional supervision. 18 is the app's
adult boundary; WHO's 5–19 band is documented here, and 18 is the conservative line consistent
with the onboarding age model.

## Decision 2 — hydration is clamped to a sourced, plausible range

**Problem.** `max(2.5, roundHalf(weight × 0.035))` returned 9.0 L/day at 250 kg. The `35 mL/kg`
rule is a common clinical rule of thumb, but fluid needs do not scale linearly with fat mass, so
it overshoots badly at the top of the weight range.

**Primary sources.**
- EFSA 2010 total-water Adequate Intakes: **2.5 L/day men, 2.0 L/day women**, *including water
  from food*, at moderate temperature/activity; adolescents ≥14 treated as adults
  ([EFSA Journal 8(3):1459](https://doi.org/10.2903/j.efsa.2010.1459)).
- IOM/NASEM 2004 total water: **3.7 L/day men, 2.7 L/day women**, of which **~80 % comes from
  beverages** (≈3.0 L men / 2.2 L women) and ~20 % from food; the panel declined a fixed
  "glasses per day" rule and noted excessive intake can rarely be life-threatening
  ([National Academies report](https://www.nationalacademies.org/news/report-sets-dietary-intake-levels-for-water-salt-and-potassium-to-maintain-health-and-reduce-chronic-disease-risk)).

**Total water vs drinking fluids.** The sources separate them, so the app number is framed as
**drinking water only**; total daily water additionally includes ~20 % from food. This is stated
in the code comment and the calc copy.

**Decision.** Keep the `35 mL/kg` heuristic (labelled non-standard) but clamp the output to
**[2.5 L, 4.0 L]** (`WATER_MIN_LITERS`/`WATER_MAX_LITERS`):
- *Floor 2.5 L* sits inside the adult reference band (EFSA men total; IOM women total 2.7 L).
- *Ceiling 4.0 L* is a **product safety cap, not a physiological formula** — it sits above the
  highest cited beverage figure (~3.0 L men, IOM) with headroom for a hot climate and large
  athletes, while removing the implausible 9 L. Only weights above ~114 kg are affected; anyone
  needing more requires individual/medical guidance. The heuristic stays flagged as an estimate.

No coefficient was changed on evidence we do not have; the clamp is a guardrail on an existing
heuristic, and `CALC_FORMULA_VERSION` was bumped to `p25-water-cap4-minor-bmi` so existing
profiles recompute.

## Decision 3 — TDEE, deficit/surplus, floors: labelled, not silently "fixed"

The custom activity multiplier, ±400/+300 offsets, and 1500/1200/1350 floors have no external
standard and were left **unchanged** — the mission forbids editing a formula without a primary
citation, and there is no citable universal calorie cap to add at the top end (the 5,655 kcal
maximum is proportionate to a 250 kg very-active input, i.e. an estimate, not an error). The
existing floors and `LOW_CALORIE_NOTE` remain the low-end guardrail; `MINOR_PLAN_NOTE` now covers
the paediatric case. Honesty copy was corrected: the calc intro no longer implies every number is
a "well-known equation" (some are Qimmah heuristics), and the fat rationale now cites the adult
AMDR **20–35 %** (NASEM) instead of a narrower "healthy 25–30 %".

## Before / after (mission proof vectors)

| Profile | Metric | Before | After |
|---|---|---|---|
| F, 12 y, 120 cm, 30 kg, sed, maintain | BMI label | `ضمن النطاق الطبيعي` (adult) | `يحتاج تقييمًا حسب العمر … راجع مختصًا` + minor note |
| M, 17 y, 170 cm, 60 kg, sed, cut | BMI label | `ضمن النطاق الطبيعي` (adult) | safe minor label + minor note |
| F, 17 y, 160 cm, 55 kg, sed, bulk | BMI label | adult label | safe minor label + minor note |
| M, 18 y, 172 cm, 68 kg, active, maintain | BMI label | `ضمن النطاق الطبيعي` | unchanged (adult) |
| F, 18 y, 165 cm, 58 kg, sed, cut | BMI label / note | adult / low-cal | unchanged (adult) |
| M, 80 y, 220 cm, 250 kg, very-active, maintain | water | **9.0 L** | **4.0 L** |
| F, 70 y, 210 cm, 200 kg, very-active, cut | water | 7.0 L | 4.0 L |
| any, min 15 kg | water | 2.5 L | 2.5 L (floor unchanged) |

All mid-range vectors (`male-cut-30` 3.0 L, `female-bulk-35`/`female-cut-45` 2.5 L, adult BMI
numbers and labels) are unchanged: the clamp only touches weights above ~114 kg, and the age gate
only touches under-18.

## Regression tests

`scripts/science/formula-proof.ts` gained a **SCIENTIFIC GUARDRAIL REGRESSION** block asserting,
across age 12/15/17/18, both sexes, min/max weight+height, and cut/bulk/maintain: water stays in
`[2.5, 4.0]` at every allowed weight (the 9 L output can never return), under-18 always gets
`MINOR_BMI_LABEL` + `MINOR_PLAN_NOTE`, and age 18 is treated as an adult with no minor note.
Proof total: **111 passed, 0 failed** (was 77).

## Residual risks / recommended next wave

1. **Minors are still shown adult-equation energy/macros** (now flagged, not blocked). Product
   decision needed: adult-only eligibility, or validated paediatric handling with clinical review.
2. **Cutting floors are the adult 1500/1200** — inappropriate for a child; covered today only by
   the minor note. Fold into the paediatric decision above.
3. **Hydration ignores climate/exercise/renal-cardiac context.** The 4 L cap is a blunt guardrail;
   a future version could offer a range and route high-need users to guidance.

## Scope integrity (this section)

Logic changes are confined to `src/lib/calculators.ts` (BMI age gate, water clamp, minor note,
version bump) and honesty-copy in `src/i18n/dict/calcScreen.ts`; test additions to
`scripts/science/formula-proof.ts`. No formula coefficient was changed without a primary citation,
no percentiles were invented, and no view/component or `package.json` was touched.
