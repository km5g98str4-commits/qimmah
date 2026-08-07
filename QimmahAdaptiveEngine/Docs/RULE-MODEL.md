# QAE Rule Model

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §15

## 1. Anatomy of a rule

Every rule is a small, composable, inspectable unit with **all** of the following fields ([CTO-QAE-001] §15). A rule missing any field fails the (future) rule linter.

```
Rule {
  ruleId:          "QAE-<DOM>-<NNN>"        # e.g. QAE-ADP-003; stable forever, never reused
  version:         SemVer                    # bumped on ANY behavioral change
  domain:          Domain
  priorityClass:   PriorityClass             # the 9-class order, DECISION-MODEL §2
  preconditions:   Predicate[]               # declarative data (see §3)
  requiredEvidence: EvidenceSpec[]           # §4 — unmet ⇒ InsufficientEvidence, never a guess
  evaluate:        pure fn(EvaluationContext) → RuleOutcome
  candidateAction: AdaptationAction template # what this rule can propose (one action kind per rule)
  reasonCodes:     ReasonCode[]              # codes this rule may emit (closed, registered)
  confidenceImpact: how the rule derives proposal confidence from evidence confidence
  safetyClassification: none | protective | restrictive
  cooldownPolicy:  { key: TargetVariable|custom, minDaysBetweenFirings: int }
  tests:           fixture ids + property tests (mandatory)
  evidenceRefs:    EVIDENCE-REGISTER ids for every numeric threshold used
}

RuleOutcome =
  | Fired(CandidateProposal[])                       # usually exactly one
  | NotFired(reasonCodes)                            # explainable non-firing
  | InsufficientEvidence(gaps: EvidenceGap[])        # feeds requestMoreData
```

Domain prefixes: `DQ` DataQuality · `ASM` Assessment · `QST` Question · `SAF` Safety · `TRN` Training · `EXS` ExerciseSelection · `NUT` Nutrition · `STP` Steps · `RCV` Recovery · `TRD` WeeklyTrends · `ADP` Adaptation · `DEC` Decision · `BGT` ChangeBudget · `GLC` GoalLifecycle · `RUP` ReturningUser · `RMD` Ramadan · `VER` Versioning.

## 2. One rule, one concern

- One action kind per rule. "Plateau → small calorie cut" and "plateau → step increase" are **two rules** competing in the resolver, not one rule with a branch.
- No giant switch, no giant adaptation file, no nested untraceable condition trees. Rule files are small; composition happens in the registry and the resolver.
- Rules never call other rules. Shared logic lives in domain functions (e.g., trend math) that rules consume via context.

## 3. Predicates — data, not code

Following the pattern proven in the legacy personalization engine (conditions as data made the branching matrix printable and machine-checkable), preconditions use a small closed combinator set:

```
Predicate =
  | {op: eq|neq|gte|lte|between, path: FieldPath, value | min,max}   # ints/enums only
  | {op: trendIs, metric, direction: TrendDirection}
  | {op: confidenceAtLeast, metric, level: Confidence}
  | {op: hasFlag / notFlag, path, flag}
  | {op: daysSinceAtLeast|daysSinceLessThan, eventKey, days}          # cooldowns, exposure periods
  | {op: all|any|not, children: Predicate[]}
```

Consequences: the full precondition matrix of a rule set can be printed, diffed between versions, attacked by counter-tests, and ported to Swift as data with a tiny interpreter. Escape hatch: a rule may declare `evaluate`-only logic where combinators genuinely cannot express it, but must state why in the rule doc — the linter flags these for review.

## 4. Evidence requirements

```
EvidenceSpec { metric, minValidObservations, minSpanDays, minConfidence,
               maxStalenessDays, source?: QualityAssessedSeries kind }
```

- Evidence is checked **before** preconditions; an unmet spec short-circuits to `InsufficientEvidence` with named gaps.
- Rules read only quality-assessed data (DATA-QUALITY.md); an `EvidenceSpec` naming a raw series is invalid.
- Never change calories because of one day's weight: the minimum-evidence discipline is structural, not stylistic. Baseline windows/counts per metric are set in ADAPTATION-POLICY.md with evidence-register labels.

## 5. Priority classes and scores

- `priorityClass` (closed, ordered): `safety > minorRestriction > injuryRestriction > dataIntegrity > recovery > adherence > goalProgress > optimization > preference`.
- Class comparison always precedes score comparison; a preference rule can never outrank a recovery rule by score inflation.
- `priorityScore` (0–100 int) orders rules **within** a class. Ties break on `ruleId` lexical (total ordering, NUMERIC-CONTRACT §3).

## 6. Cooldowns

- `cooldownKey` defaults to the proposal's `targetVariable` (calories, stepTarget, volume, frequency, macros, exerciseSlot:<id>).
- The resolver enforces `minDaysBetweenFirings` against `AdaptationHistory` (accepted **and** rejected proposals both count — a user who rejected a proposal is not re-nagged next cycle; see fixture S30).
- Cooldown windows are policy values (evidence-register labeled), not hard-coded per rule ad hoc.

## 7. Registry, packs, manifest

- Rules register explicitly in a per-domain **rule pack**; a `RuleSet` is the composition of packs.
- `RuleSetManifest {perDomainVersions, contentHash}` — canonical hash per NUMERIC-CONTRACT §3. Adding/removing/editing any rule changes the hash; every output embeds it.
- A rule behavioral change without a version bump is a gate failure (manifest test pins version↔behavior via fixtures).

## 8. Authoring checklist (enforced by review + linter)

1. RuleId, version, domain, class assigned; action singular.
2. Every numeric literal has an `EVIDENCE-REGISTER` id with label (`VERIFIED_EVIDENCE / PRODUCT_POLICY / ASSUMPTION / RESEARCH_REQUIRED`). `RESEARCH_REQUIRED` thresholds cannot ship enabled.
3. Preconditions expressed as predicate data; any `evaluate`-only logic justified in the rule doc.
4. Evidence specs present; the "insufficient" path emits named gaps.
5. Reason codes registered in `Contracts/reason-codes.json`.
6. Fixtures: at least one Fired, one NotFired, one InsufficientEvidence case.
7. Counter-test attacking the rule's guard (charter §4.2): a simulated bypass/abuse input that must fail **by name**, not by accident.
8. Cooldown and change-class declared; interaction with ChangeBudget covered by a fixture when the rule proposes a major change.
