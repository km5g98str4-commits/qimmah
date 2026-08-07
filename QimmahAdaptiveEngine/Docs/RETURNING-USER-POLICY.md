# QAE Returning-User Policy

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §12

## 1. Principle

**Training experience and current readiness are separate concepts.** An advanced user returning after 10 months must not receive the workload of an actively training advanced user. Three axes, never collapsed (DOMAIN-MODEL §3):

| Axis | What it drives | Decays with time away? |
|---|---|---|
| `TrainingKnowledge` | question depth, terminology (RIR ok), exercise-pool complexity, split options | No (knowledge persists) |
| `RecentTrainingExposure` | detraining assessment; ramp trigger | Definitionally |
| `CurrentWorkCapacity` | starting volume, intensity, progression pace | Yes — estimated conservatively |

A rule reading "experience" without naming an axis fails the rule linter (RULE-MODEL).

## 2. Detection

From assessment evidence: prior consistent training + `monthsSinceConsistent` above threshold ⇒ `ReturningUserState.detected`. The legacy engine's characterized `returning` classification (long layoff ∧ real prior volume; two months of training two years ago does *not* qualify) is the adopted baseline. Thresholds labeled; detraining timeline evidence: strength largely retained ~3–4 weeks of cessation, losses accelerate after (EVR-014) — so "returning" begins well above the trivial-break window (candidate ≥ 2–3 months: PRODUCT_POLICY anchored on EVR-014).

## 3. Re-entry ramp

- Starting `CurrentWorkCapacity`: stepped down from knowledge-implied capacity as a function of `monthsSinceConsistent` (mapping PRODUCT_POLICY, anchored on detraining evidence ranges — encode ranges, not false-precision points).
- Starting plan: reduced volume (legacy characterized baseline: returning users get a deload-style −1 set/exercise and `VOLUME_BY_CLASS.returning = 9` sets vs advanced 16 — carried as the oracle behavior), conservative RIR targets, machine/stable-movement bias regardless of knowledge, full exercise vocabulary retained.
- Ramp: progressive weekly capacity restoration while completion is high and recovery is stable; ramp increments are volume-class changes inside ChangeBudget rules, cooldown-gated like any change. Muscle-memory evidence (EVR-014: retraining gains come faster) supports **reassuring reason codes** (`regainsComeFaster`) — messaging only, never aggressive ramp math.
- Early exit: sustained high completion + performance markers at knowledge-implied levels ⇒ ramp ends early (evidence-gated), reason-coded.

## 4. Interactions

- **Question engine:** returning users get the returning budget/path (characterized); break-length and prior-volume questions are material and asked; basic gym-literacy questions are skipped unless contradiction evidence fires.
- **Safety:** a returning user's ValidDecisionSpace caps early volume increases regardless of user enthusiasm (restrictive bound, visible reason codes).
- **Fixture:** S20 (experienced user returning after long break) pins: advanced knowledge classification + reduced starting capacity + ramp plan + no advanced-jargon suppression.
