# Experience Model

**Status:** Phase 4 deliverable · [CTO-QAE-005] §5 · Implementation: `Domain/ProfileClassification/classify.ts`

## Four axes — never collapsed

| Axis | Derived from | Decays with a break? |
|---|---|---|
| **TrainingKnowledge** | knowledge-subset signals: `programExperience · knowsProgression · exerciseFamiliarity · tracksSets · selfLevel · trainingAgeHonest` | No |
| **RecentTrainingExposure** | `lastTrained` (detrained = m3_12/y1_plus) + `consistency`; `monthsSinceConsistent` from bucket midpoints (integer PRODUCT_POLICY, no fake precision) | Definitionally |
| **CurrentWorkCapacity** | knowledge band **stepped down** by exposure (advanced→intermediate, else→beginner) with `conservative: true` whenever exposure isn't consistent | Yes |
| **ConsistencyHistory** | `consistency` band + tenure from `totalMonths` midpoints | — |

**Planning classification** is derived separately (drives question routing: budgets, `levels` gates as `derived.experienceClass`): the characterized legacy 10-signal weighted model re-derived in canonical integers — weights ×10, value maps ×20, `scoreCenti = 100·Σ(v20·w10)/Σw10` (algebraically ≡ legacy `(Σv·w/Σw)×20`, ×100), thresholds ×100 (1800/3800/5500/7500), the hard rules preserved (`trainedBefore='never'` ⇒ complete_beginner; long layoff ∧ real history ⇒ `returning`).

The mandated example holds and is golden-pinned: **advanced knowledge + 10 months inactive** classifies `returning` with `currentWorkCapacity = intermediate (conservative)` — not an actively training advanced athlete (persona `returning-advanced` vs `advanced-gym`).

## Honest divergence notes

1. **Integer vs float boundaries:** legacy scores are floats; QAE scores are exact integers (centi-scale). At class boundaries (e.g. exactly 75.0) results can differ from legacy by rounding — QAE journeys carry their own goldens; the legacy oracle records legacy classes separately. No silent claim of bit-parity is made for classification.
2. **Signal-set dependence:** classification depends on which signals were *asked*; the founder-approved tighter budget (13/16/20 vs legacy per-class up to 20) can leave fewer signals answered than legacy, shifting borderline classes (observed: `intermediate-gym` lands `advanced` at 16 questions). Recorded, not hidden.
3. Confidence is coverage-based (`confidenceCenti` = answered-weight share); the legacy self-agreement term is superseded by the four-axis structure (the axes carry what agreement tried to approximate).

## What this phase does NOT do

Classification produces facts (`derived.knowledgeBand`, `derived.exposureBand`, `derived.capacityBand`, `derived.consistencyBand`, `derived.experienceClass`) for **question routing and completeness only**. No workout, volume table, or plan parameter is generated from them — that is the Training Engine's phase, not this one.
