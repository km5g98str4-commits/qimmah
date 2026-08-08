# Question Oracle Coverage

**Status:** Phase 4 deliverable · [CTO-QAE-005] §§1, 12 · Artifacts: `Fixtures/golden/questions/`

## Legacy oracle (`legacy-*.golden.json`, 12 personas)

`Tools/run-question-oracle.mjs` executes the REAL legacy engine (`src/lib/personalization`) with an injected monotonic clock over the shared personas (`Contracts/content/personas.json`): beginner, intermediate, advanced, home, commercial gym, minor, injury, high-confidence, low-confidence, contradictory, follow-up path, returning. Each step records the full mandated set: known facts before the question · candidate ids (via the exported `isEligible`) · selected question + stage + effective score (characterized formula) · remaining soft budget · new evidence · follow-up activations · completion state. **Every persona is executed twice and must be byte-identical or the runner throws** — determinism is enforced at generation time, not assumed.

Notes on fidelity: answers come from persona overrides validated by the legacy engine itself (invalid values fall back to a deterministic default, recorded as `rejectedFirst`); the clarification path uses a **recorded injected answer** (`x-selfrated-level`) because the level-conflict trigger question never surfaces under selection pressure — the same technique the legacy proof uses, and the injection is part of the golden, never hidden.

## QAE journeys (`qae-*.golden.json`, 12 personas + comparisons)

`Tools/run-qae-journeys.mjs` runs the QAE engine over the converted bank with ProfileClassification-derived routing facts. Every golden carries the full mandated envelope: `seed · clock · timezone · locale · engineVersion · questionSchemaVersion · ruleManifest · bankManifestHash` — plus fatigue metrics (asked/skipped/clarifications/budget overrides/bank-avoided bp) and final completeness. The runner enforces double-run byte-identity **and bank-order-permutation identity** (reversed bank ⇒ identical asked sequence) per persona.

## Decision-surface coverage (mandated list → where pinned)

| Surface | Pinned by |
|---|---|
| every priority class (gate/required/safety-clear/clarify/scored) | journey stages across the 12 personas + content-proof positive/negative/bypass per class |
| conflict clarification | `qae-contradictory` (clarify=1) + legacy twin + proof |
| required question | all journeys (required block leads) |
| safety follow-up | `qae-followup-path`, `qae-injury-knee` + proof (`budgetOverrideReason='safetyEvidenceRequired'` recorded when past soft max) |
| optional scored question | all journeys (scored stage) |
| budget exhaustion | legacy `cap_reached` personas; QAE `complete` at max 16 |
| completeness reached | every `complete` journey has `mandatoryMissing: []` (proof) |
| unfillable evidence gap | `detectGaps` proof (`never1`-style path → empty candidates, visible) |
| revision/orphan pruning | Phase-3 suite (real-bank eligibility-bypass pruning in content proof) |
| invalid answer | content proof (out_of_range named; prior evidence intact) |
| bank-order permutation | enforced per persona at generation + integrity check both orders |

## QAE ↔ legacy comparison (not a parity claim)

The QAE journeys are **not** required to replay legacy sequences byte-for-byte — the founder changed the budget (single 13/16/20 vs legacy per-class) and the bank (153 active vs 193). Observed: identical required-block ordering, same early sequence, QAE stops at 16 where legacy runs to 17–20; the questions QAE drops are tail-scored ones. The five comparison pairs (`qae-comparisons.golden.json`) show question-set differences of 6/4/6/6 for A–D with per-question responsible evidence; pair E differs by classification (returning + conservative capacity vs advanced), not question set — both engines starve the returning-specific follow-ups (finding #2 of the materiality audit, product decision pending).
