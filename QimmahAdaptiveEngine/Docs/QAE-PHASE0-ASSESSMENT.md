# QAE Phase 0 — Architecture Assessment

**Status:** Awaiting founder approval before any Phase 0 documentation set or implementation.
**Scope of this document:** assessment only. No engine code, no changes to Qimmah app code.
**Branch:** `claude/qae-architecture-design-fhg2mh` — isolated directory `QimmahAdaptiveEngine/`; nothing under `src/` is touched.

> **Governance note (charter §1.2):** the QAE brief arrived without a `[CTO-n]` header. Per the charter, unnumbered text carrying orders is treated cautiously: this deliverable is docs-only, fully reversible, on a dedicated branch, and stops exactly where the brief itself says to stop ("stop for architecture approval"). Anything beyond this document waits for a numbered, signed approval.

---

## 1. Architecture assessment

The proposed architecture is fundamentally sound. Its strongest properties:

- **Pure functional core.** `evaluate(inputs, ruleSet, clock) → proposals` with no I/O, no system time, no locale is exactly the right shape for determinism, testability, and portability. This is hexagonal architecture with the domain as a pure kernel; hosts (React app today, Swift app later) are adapters.
- **Proposal-not-mutation.** The engine never edits the plan; it emits `AdaptationProposal[]` that the application layer applies after user consent. This aligns *exactly* with the founder's locked decision #3 in the charter ("plan adjustments are always suggestions in v1 — no silent automatic changes, every change explained").
- **ReasonCodes, not strings.** Keeps localization out of the domain; matches the repo's existing i18n discipline.
- **Non-bypassable safety, explicit versioning, evidence register.** All correct and all enforceable structurally (see §8).

**The one large correction the brief needs:** it assumes a greenfield. It is not one. On `main` today, deterministic rule-based versions of several QAE engines already exist and are gate-tested:

| QAE engine | Existing counterpart on `main` | State |
|---|---|---|
| 1. Assessment | `buildOnboardingProfile` + `computeTargets` (`src/lib/calculators.ts:295`), experience classification in `src/lib/personalization/experience.ts` | Working; profile mostly default-filled (the known body-data P0) |
| 2. Adaptive Questions | `src/lib/personalization/` — 194-question bank, `selectNext` with priorities/budget/starvation-penalty, contradictions module, conditions-as-data | Working, 215 checks in `test:gate` (`test:personalization`); not yet wired to live flow |
| 3. Training | `src/lib/planGenerator.ts` (1,170 lines): splits, equipment gating, injury filters (`INJURY_RISKY_IDS`), sets/reps/rest by goal+experience | Working, in production paths |
| 4. Nutrition | `computeTargets` BMR→activity→goal pipeline, meal templates, diet filters | Working (static targets; no adaptation loop) |
| 6. Recovery | `src/lib/recovery.ts` + `recoveryState.ts` (`test:recovery-engine` in gate) | Working (self-report; not feeding plan decisions) |
| 5, 7, 8. Steps progression, Weekly Check-In, Adaptation/Decision | — | **Genuinely missing.** This is QAE's real new ground. |

The charter's founding lesson (§2: a branch nearly rebuilt the entire translation layer that already existed) applies verbatim. **QAE must be specified as the successor-superset of these systems with an explicit parity-and-migration story — or as a consciously parallel reference implementation — but never as an unacknowledged rebuild.** That choice is founder question Q1.

---

## 2. Contradictions in the specification

- **C1 — Target platform vs. reality.** The brief mandates portability to "Qimmah's Pure Swift Domain layer." The repo contains zero Swift; Qimmah is React 18 + TypeScript + Capacitor. A Swift domain layer implies a platform strategy not reflected anywhere in the repo or charter. Needs founder confirmation (Q2) before it constrains the design.
- **C2 — Greenfield premise vs. existing engines.** As above (§1). The brief's "verify nothing exists" step was not part of its own instructions, but it is part of the charter (§2) and it fails today.
- **C3 — Cardio module without a cardio engine.** The module tree contains `Domain/Cardio/` and `Rules/…`, but the 8-engine system, the 7 product guarantees, and the scenario list contain no cardio spec at all. Either spec it or cut it (Q7).
- **C4 — Question Engine is never scheduled.** The 7-phase implementation strategy assigns every engine a phase except Engine #2. Fixed in the phase plan below (§11).
- **C5 — Assessment ⇄ Question circularity.** Engine #1 "transforms raw answers" into the profile, but Engine #2 selects the next question *based on* the profile-so-far. Assessment must therefore be incremental/re-entrant, not a one-shot transform. (The existing repo engine already solved this with a session-state `selectNext`; evidence that reuse is cheaper than reinvention.)
- **C6 — Change Budget vs. Recovery bundles.** "Maximum one major adaptation per cycle" collides with Recovery outputs that legitimately co-occur (reduce volume + increase calories + hold progression). Resolution needed: either recovery/safety-class actions are exempt from the budget, or a recovery bundle is a single *composite* proposal occupying one budget slot (recommended; Q5).
- **C7 — "No silent changes" vs. non-bypassable safety.** Every proposal is user-approvable, but some are safety-mandated (e.g., calories below the safety floor). What happens when the user rejects a safety-required proposal is undefined — and it is a product-policy decision, not an engineering one (Q4).
- **C8 — The steps example contradicts its own principle.** 3,200 → 4,500 is a +40 % first jump under a section titled "begin from realistic baseline behavior." All numeric examples in the brief must be treated as illustrative, not policy; every threshold goes through the evidence register.
- **C9 — Determinism vs. week boundaries.** "Never use Calendar/timezone" is right, but a Weekly Check-In needs week windows. Resolution: the host passes an explicit `ReviewPeriod {start, end}` (and `now`) as input; the domain never derives calendar boundaries itself.
- **C10 — Per-engine versions vs. single `RuleSetVersion`.** The Adaptation Engine receives one `RuleSetVersion`, but versioning is per-engine. Resolution: a composite, hashable `RuleSetManifest` (see §6) recorded on every evaluation.

---

## 3. Missing domains

1. **Ramadan / fasting adaptation.** A locked founder decision makes the Ramadan question permanent; the Gulf market makes fasting-aware nutrition timing and training scheduling core, not optional. No QAE engine owns it. Recommend: a `Context` sub-domain feeding Nutrition, Training, and Steps constraints (Q7).
2. **Cardio** — module exists, spec doesn't (C3).
3. **Goal lifecycle.** Transitions (cut → maintenance), diet breaks, post-cut recovery phases, goal changes mid-journey. Adaptation covers within-goal tuning only.
4. **Data quality / ingestion.** Outlier weight readings, manual-vs-HealthKit conflicts, gaps, and duplicate entries. Weekly Check-In mentions confidence but no module owns cleansing rules. Recommend explicit `Domain/DataQuality/`.
5. **Returning-after-break logic.** A scenario requires it; no engine owns detraining adjustments (belongs to Assessment + Training).
6. **Sex-specific safety screening.** At minimum pregnancy/medical-flag screening routing to `requestMoreData` / "consult a professional" reason codes — with the charter's no-medical-claims rule strictly observed.
7. **Units and value objects.** Internal canonical units (kg, cm, kcal, integer steps) with no locale anywhere in the domain.
8. **Review cadence policy.** *When* evaluations run is host concern, but *eligibility* (minimum data-days before a review is valid) is domain policy and needs an owner (Weekly Check-In).
9. **Supplements/medications — explicit exclusion.** The charter says display/track only, no medical claims. QAE should state this exclusion in writing so nobody "helpfully" adds it later.

---

## 4. Risks

- **R1 — Two brains, one user (highest).** If QAE ships beside `planGenerator`/`personalization` without a reconciliation plan, Qimmah has two rule systems that can disagree about the same user. Mitigation: Q1 decided first; parity fixtures against existing engine outputs before any extension.
- **R2 — Cross-language determinism drift.** JS `number` vs Swift `Double`, rounding, sort stability, object-key ordering. Mitigations: integer/fixed-point arithmetic for all thresholds (kcal as int, weight as decigrams), explicitly defined rounding at every division, stable sorts with total tie-breakers (rule-ID lexical), and **language-neutral JSON golden fixtures as the portability contract** — the Swift port must reproduce them bit-for-bit.
- **R3 — Fabricated thresholds.** Mitigated by `EVIDENCE-REGISTER.md` with `VERIFIED / POLICY / ASSUMPTION` labels; unverifiable numbers stay `ASSUMPTION` and conservative.
- **R4 — Rule-interaction explosion.** 8 engines × dozens of rules → emergent conflicts. Mitigations: single total priority order, Change Budget, cooldowns, property-based tests ("no two accepted proposals target the same variable in one cycle"), mutation tests.
- **R5 — Safety/liability surface.** Minors, eating-disorder-adjacent patterns (rapid loss + high adherence must *never* earn a calorie cut), injuries. Mitigation: QAE adopts the repo's existing minors policy (age-13 gate, minor goal restrictions — `test:age-13`, `test:minors`) as its baseline rather than inventing a parallel one (Q6); hard floors live in SafetyPolicy, not in per-engine rules.
- **R6 — Scope vs. charter wave culture.** The charter's reference wave is 127 lines; QAE is a multi-thousand-line program. Mitigation: the phase plan (§11) is sliced into charter-sized waves, each independently reviewable, each behind the full gate.
- **R7 — Governance.** Lane E owns "the personalization engine" per the lane map; QAE overlaps it, and the brief is unnumbered. Mitigation: this assessment stops for approval; lane assignment is Q3/Q1 territory.

---

## 5. Recommended module structure

The proposed tree is accepted with four amendments:

```
QimmahAdaptiveEngine/
├── Domain/
│   ├── Shared/            # +NEW: value objects (Kg, Kcal, Steps, Percentage),
│   │                      #  Clock, ReviewPeriod, Confidence, Evidence — used by all
│   ├── Profile/
│   ├── Assessment/
│   ├── Questions/         # (renamed from implicit) Adaptive Question Engine domain
│   ├── Training/
│   ├── ExerciseSelection/
│   ├── Nutrition/
│   ├── Steps/
│   ├── Context/           # +NEW: Ramadan/fasting, environment (heat), schedule constraints
│   ├── Recovery/
│   ├── DataQuality/       # +NEW: outlier/gap/conflict handling for observations
│   ├── CheckIn/           # weekly trend computation
│   ├── Safety/
│   ├── Adaptation/
│   ├── Decisions/
│   ├── Explainability/
│   └── Versioning/
├── Contracts/             # +NEW: input/output DTOs + ports (the only surface hosts see)
├── Rules/                 # declarative rule definitions grouped by domain
├── Fixtures/              # language-neutral JSON goldens (the Swift-port contract)
├── Tests/
├── Docs/
└── Tools/                 # fixture runner, rule linter, manifest hasher
```

`Cardio/` is omitted pending Q7 — adding a directory is cheap once it has a spec; an empty module invites unspecified code.

**Dependency rule (enforced by a lint check in `Tools/`):** `Domain/*` imports only `Domain/Shared` and sibling domain types via `Contracts`. Nothing in `Domain/` may import from host, storage, i18n, or network namespaces. This is what makes the later Swift extraction mechanical.

---

## 6. Recommended Rule abstraction

Small, composable, declarative-first — following the pattern already proven in `src/lib/personalization` ("conditions are data, not code," which made the branching matrix printable and machine-checkable):

```
Rule {
  id:            RuleId            // "ADP-CAL-001" — domain prefix + stable number
  domain:        Domain
  version:       SemVer
  priorityClass: PriorityClass     // the 9-level order, as a closed enum
  preconditions: Predicate[]       // declarative, introspectable data
  evidence:      EvidenceSpec[]    // e.g. { metric: weightTrend, minObservations: 4,
                                   //        minSpanDays: 14, minConfidence: moderate }
  evaluate(ctx: EvaluationContext): RuleOutcome
}

RuleOutcome =
  | Fired(proposals: CandidateProposal[])
  | NotFired(reasonCodes: ReasonCode[])          // explainable non-firing
  | InsufficientEvidence(missing: EvidenceGap[]) // feeds requestMoreData
```

- `evaluate` is a **pure function**; `EvaluationContext` is immutable and contains profile, current plan, history, check-in, adaptation history (for cooldowns), `now`, and the `RuleSetManifest`.
- Predicates are a small closed combinator set (`gte`, `lte`, `between`, `trendIs`, `and`, `or`, `not`, `hasFlag`) so preconditions are printable for explainability and attackable by the counter-assertion discipline (charter §4.2).
- **RuleSet + manifest:** a `RuleSet` is a registry of rules; `RuleSetManifest` = `{ perDomainVersions, contentHash }`. Every evaluation output embeds the manifest — this resolves C10 and answers "which rule version created this recommendation?" permanently.
- No giant switch, no giant file: one rule per unit, registered explicitly, each with its own tests and evidence-register links.

---

## 7. Recommended Decision model

A single deterministic pipeline owned by `Decisions/`:

```
EvaluationContext
  → engines emit CandidateProposal[]           (each tagged with rule id, priorityClass,
                                                evidence, confidence, safetyImpact)
  → SafetyPolicy.screen(candidates)            (checkpoint 2: block/clamp, visibly)
  → group by TargetVariable                     (calories, steps, volume, frequency, …)
  → resolve conflicts: priorityClass first,     (Recovery beats Optimization by class,
      then priority score,                       never by accident)
      then stable tie-break on RuleId
  → apply cooldowns                             (from adaptation history in the input —
                                                 "same variable changed < N days ago")
  → apply Change Budget                         (1 major + optionally 1 low-risk minor;
                                                 a recovery bundle = 1 composite slot)
  → SafetyPolicy.validate(final)                (checkpoint 2 again on the composed set —
                                                 conflicting-recommendation check)
  → AdaptationProposal[]
```

`AdaptationProposal` carries exactly the brief's fields: `action` (closed ADT: `keepPlan | changeCalories(delta) | changeStepTarget(delta) | changeTrainingVolume(pct) | changeTrainingFrequency | scheduleDeload | replaceExercise | changeProgressionMethod | changeMacroDistribution | requestMoreData`), `reasonCodes`, `evidence`, `confidence`, `safetyImpact`, `priority`, `requiresApproval`. `keepPlan` and `requestMoreData` are first-class outcomes, not absences of output — "we looked and chose not to change anything, and here's why" is itself explainable.

Confidence is a closed enum (`low | moderate | high`) with documented numeric backing per metric, never a free float invented per rule.

---

## 8. Recommended Safety model

Structural non-bypassability, not disciplinary: **the type system is the guard** ("parse, don't validate").

- `SafetyPolicy` is the *only* module that can construct `ValidatedProposal` / `IssuablePlan` (opaque/sealed types). Engines produce `CandidateProposal`; nothing downstream accepts a candidate. An engine cannot skip safety because the output type it needs is unobtainable elsewhere. (This is the charter §4.2 lesson made structural: "a gate that survived by an agent's ethics must survive by its structure.")
- Verdicts: `Pass | Clamp(adjusted, reasonCodes) | Block(reasonCodes)`. Clamps are always visible in reason codes — no silent flooring.
- Three checkpoints exactly as the brief specifies: initial plan acceptance, proposal issuance, application of an accepted proposal (the host must call checkpoint 3; the contract makes the applied-plan type constructible only through it).
- Safety rules carry their own version stream and evaluate both **first** (hard exclusions: minors policy, injury exclusions, calorie floors/ceilings, max weekly change rates) and **last** (compositional checks: conflicting recommendations, cumulative weekly adaptation limits).
- Minors: adopt the repo's live policy (13+ gate, restricted goals for minors) as the baseline — one policy, two implementations is a bug factory (Q6).

---

## 9. Research plan

Per-topic, each producing `EVIDENCE-REGISTER.md` entries `{claim, source, rationale, confidence, date, dependent rule IDs, label: VERIFIED|POLICY|ASSUMPTION}`:

| Topic | Candidate credible anchors (to verify at research time, not from memory) |
|---|---|
| Resistance volume/frequency | ACSM position stands; Schoenfeld et al. volume/frequency meta-analyses |
| Progression & RIR/RPE | Helms et al. RIR-based autoregulation literature |
| Weight-loss rate & deficits | Obesity-society guidance; 0.5–1 %BW/week literature |
| Protein ranges | ISSN position stand; per-goal g/kg ranges |
| Step targets & progression | WHO PA guidelines 2020; Paluch et al. step-count meta-analysis |
| Recovery/deload/sleep | Sleep-and-athletic-performance reviews; deload survey literature |
| Minors (13–17) | NSCA/AAP youth resistance-training position statements |
| Fasting/Ramadan training | Ramadan-athlete literature (timing, hydration-adjacent caution re: claims) |

Rules of the register: no number ships as `VERIFIED` without a checked citation; product choices (e.g., "one major adaptation per cycle") are honestly labeled `POLICY`; gaps are labeled `ASSUMPTION` with conservative values. Research happens in a dedicated wave with network access; nothing in this assessment pre-commits a threshold.

---

## 10. Scenario matrix plan

All 26 scenarios from the brief, plus 8 required by Qimmah's actual context:

27. Ramadan week (fasting flag on) — nutrition timing + training scheduling constraints
28. Female user — sex-specific BMR path, screening flags
29. Minor age 13–16 — restricted goals per existing repo policy (distinct from the 17/18 boundary pair)
30. User rejects the same proposal twice — engine must not nag; cooldown on re-proposal
31. Equipment loss mid-plan (gym → home) — replaceExercise cascade without plan explosion
32. Weight *up* during cut with high adherence and rising performance — recomp/water signal, not a calorie cut
33. Check-in entirely missed — requestMoreData, no adaptation on stale data
34. Plateau + poor sleep + high fatigue (the brief's own worked example) — recovery wins, encoded as a fixture

Format: one JSON fixture per scenario in `Fixtures/`, sections exactly as the brief mandates — `INPUT / EXPECTED_CLASSIFICATION / EXPECTED_INITIAL_PLAN / EXPECTED_ADAPTATION / EXPECTED_REASON_CODES / EXPECTED_SAFETY_RESULT`. Fixtures are written **before** engine code (spec-first), run as golden tests in CI, and later serve unchanged as the Swift-port conformance suite. Expected numeric values reference evidence-register IDs, not magic numbers.

---

## 11. Phase-by-phase implementation plan

Each phase = one or more charter-sized waves, full local gate green per wave, entry/exit criteria explicit. Question Engine is now scheduled (fixes C4).

| Phase | Content | Exit criteria |
|---|---|---|
| **0** | This assessment → approval → the 10-doc set (`QAE-VISION` … `IMPLEMENTATION-ROADMAP`), entities/enums/contracts, evidence register skeleton, all 34 scenario fixtures authored | Founder approves docs + fixtures; Q1–Q8 answered |
| **1** | `Domain/Shared` value objects, Clock/ReviewPeriod, Rule primitives + manifest, SafetyPolicy skeleton (types + checkpoints), Assessment engine | Safety non-bypassability proven by a counter-test (an engine attempting to bypass fails to compile/run) |
| **2** | Question Engine: **reconciliation with the existing 194-question bank** (reuse or formal supersession per Q1), incremental assessment loop | Question-selection fixtures green; no duplicated bank |
| **3** | Training + ExerciseSelection (metadata-driven), Nutrition initial targets, Steps baseline targets, Context (Ramadan) constraints | Initial-plan sections of all fixtures green |
| **4** | DataQuality + CheckIn: trend math, observation validity, confidence | Trend fixtures green incl. outlier/gap cases |
| **5** | Adaptation rules + Recovery decisions → CandidateProposals | Adaptation sections of fixtures green |
| **6** | DecisionResolver, Change Budget, cooldowns, Explainability surface, full safety composition | Scenario 34 (recovery-beats-plateau) and budget/cooldown property tests green |
| **7** | Hardening: property-based tests, mutation tests, determinism fuzz (same input × 1000 runs, cross-ordering), rule linter | Mutation score threshold met; goldens byte-stable |
| **8** | Port plan: Swift (or per Q2) implementation plan for Qimmah, fixture-conformance harness, integration proposal — **document only; integration itself stays founder-gated** | Port plan approved |

---

## 12. Questions requiring founder decisions

1. **Relationship to the existing engines (decides everything else).** Is QAE (a) the *successor-superset* — reuses/absorbs `planGenerator`, `personalization`, `computeTargets`, `recovery` with parity fixtures, then extends with engines 5/7/8 — or (b) a *parallel reference implementation* whose design is later back-ported? **Recommendation: (a).** Option (b) institutionalizes two brains for one user (R1).
2. **Reference language & platform strategy.** The brief says Pure Swift; the product is TypeScript/React/Capacitor with zero Swift. Is a Swift-native Qimmah truly the roadmap? **Recommendation: implement QAE in strict-TypeScript with the portability disciplines of §4-R2 (fixed-point, goldens), so it can run inside today's app immediately, with the JSON fixtures as the binding contract for a later Swift port.** If Swift-first is confirmed instead, the design holds; only Phase 1+ tooling changes.
3. **Where the project lives.** Currently: `QimmahAdaptiveEngine/` on the dedicated branch of this repo (the only repo this session can reach). Separate repository instead? And which lane owns QAE, given lane E owns "the personalization engine"?
4. **Safety-mandated proposal rejected by the user.** Freeze adaptation and keep the current plan? Restrict features? Plain persistent notice? (Engine-side, `Block`/`Clamp` still prevents unsafe *new* plans regardless — this question is about the product experience.)
5. **Change Budget semantics for recovery bundles.** Confirm: a recovery bundle (e.g., deload = volume ↓ + calories hold + steps hold) is **one composite proposal in one budget slot**. (Recommended.)
6. **Minors policy.** Confirm QAE adopts the repo's live policy (13+ gate, restricted goals for minors) as its safety baseline, so the 17/18 boundary scenarios encode the *existing* policy rather than a new one.
7. **Scope confirmations for v1:** Cardio — in (needs a spec) or out (drop the module)? Ramadan/fasting — in QAE v1 (recommended for this market) or later?
8. **Exercise metadata now, content later.** The exercise-library source is a locked-pending founder decision (#4). Confirm QAE may define the metadata *schema* with placeholder/fixture content, leaving the content-source decision untouched.

---

*Prepared as Phase 0 first deliverable. Stopping here for architecture approval per the brief.*
