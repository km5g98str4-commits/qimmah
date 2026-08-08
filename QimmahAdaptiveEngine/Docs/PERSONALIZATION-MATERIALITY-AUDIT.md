# Personalization Materiality Audit

**Status:** Phase 4 deliverable · [CTO-QAE-005] §3 · Machine record: `Contracts/content/question-inventory.json` (per-question `materialityCategories` + `materialityVerified`)

## Method — verified, not asserted

For every one of the 193 questions, "what downstream behavior can this answer change?" was answered from three **checked** sources, not from the legacy `affects` field alone (which L-QST-2 showed is unverified documentation):

1. **Legacy derivation reads** — keys actually consumed by `profile.ts` (safety flags, constraints, goal, equipment, recovery, intensity…) and `experience.ts` (the 10 signal keys), extracted from source.
2. **Routing/conflict usage** — keys referenced by any eligibility/skip/follow-up condition or conflict detector; conflict-clarify and follow-up targets are material by routing.
3. **QAE-spec consumers** — 28 questions unread by legacy code but with a **named consumer in an approved QAE spec**, each citing its section (e.g. `r-daily-steps` → [CTO-QAE-002] §14 baseline-derived step targets; `v-set-to-failure` → EVR-012 RIR prescription; `e-machine-access` → §6 capability evidence). No entry was admitted without a citation.

Safety-relevant (`screen/restrict/clear`) and required questions are material by definition.

## Results

| Category | Count | Meaning |
|---|---|---|
| Material — active bank | **153** | 138 preserved + 15 preserved with answer-type mapping |
| **Flagged non-material** | **34** | no verified read, no routing use, no spec consumer, not safety, not required |
| Product decision required | 6 | 5 unreachable clarifies (L-QST-3) + b-target-weight (L-QST-7) |

The 34 flagged (excluded from the active bank, retained in inventory): cosmetic/ambience preferences (`p-music-cue-pref`, `p-mirror-avoid`, `p-solo-or-partner`, `p-home-noise-style`, `p-machine-vs-free-reason`), cardio-scoped items excluded from V1 by [CTO-QAE-002] §7 (`e-cardio-machines`, `p-cardio-timing`, `v-cardio-interference`), unconsumed experience-glut probes (`x-coached`, `x-prev-results`, `x-technique-check`, `x-warmup-habit`, `x-failure-familiarity`, `x-strength-marker`, `x-session-tolerance`), unconsumed motivation/logistics texture (`g-event`, `g-performance-sport`, `g-motivation-driver`, `g-past-obstacle`, `g-success-metric`, `g-plan-adherence-style`, `g-body-focus-balance`, `a-commute`, `a-busy-season`, `a-min-session`, `a-weekend-different`, `a-can-add-day`, `a-rest-day-pref`, `a-heat-sensitivity`, `e-equipment-confidence`, `e-weather-dependency`, `b-body-shape`, `r-hydration`, `r-caffeine`).

**Question fatigue impact:** the founder's target is served — the bank a user can ever meet shrank 193 → 153, and the measured journeys ask 16 with ~90 % of the bank avoided per user.

## Findings beyond counts

1. **L-QST-7 (new):** `b-target-weight` permanently ineligible in production (dead `answers.primaryGoal` path). Target weight therefore never enters personalization evidence today.
2. **Queued-follow-up starvation:** `x-return-reason`/`x-return-ramp` (material — `returnRamp` is read by constraint derivation) are queued when `lastTrained` indicates a long break, but the +15 queue bonus never overcomes scores under either legacy or QAE budgets — **they are asked in zero recorded journeys**. Raising their effective priority or making them conditionally required for returning users is a product decision (they carry the returning-user differentiation the four-axis model wants).
3. `a-heat-sensitivity` is flagged non-material today but named as a market differentiator in the product spec — a future Context consumer would rescue it; recorded for the product backlog, not silently kept.
