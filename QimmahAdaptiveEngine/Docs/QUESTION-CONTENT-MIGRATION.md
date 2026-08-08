# Question Content Migration

**Status:** Phase 4 deliverable · [CTO-QAE-005] §§2, 11, 14
**Machine artifacts (source of truth):** `Contracts/content/question-bank.legacy.json` (verbatim structured dump) · `question-inventory.json` (193 records, all mandated fields) · `question-bank.qae.json` (active QAE bank + `bankManifestHash`) · `bank-config.qae.json` · `extraction-summary.json`. All regenerated deterministically by `Tools/run-extract-legacy-bank.mjs`.

## Pipeline (characterize → map → classify → migrate)

1. **Extract** — the legacy bank (193 defs) is imported as data, dumped verbatim; nothing is discarded silently.
2. **Verify materiality** — three verified sources: keys actually read by `profile.ts`/`experience.ts` derivation (regex over property reads — closes L-QST-2's "affects is unchecked" gap for this audit), keys used in routing (conditions/follow-ups) or conflicts, and a curated **QAE-spec consumer map** (each entry cites the approved spec section that consumes it). See PERSONALIZATION-MATERIALITY-AUDIT.md.
3. **Classify** — disposition per question (final: **138 PRESERVE · 15 PRESERVE_WITH_MAPPING · 34 REMOVE_NON_MATERIAL · 6 PRODUCT_DECISION_REQUIRED**; SUPERSEDE/REMOVE_REDUNDANT/RESEARCH_REQUIRED: 0 needed).
4. **Convert** — active questions become QAE `QuestionDef`s.

## Conversion rules (mechanical, fidelity-preserving)

- **Conditions → Predicates** 1:1 (`eq/ne/in/nin/gt/gte/lt/lte/all/any/not/const`); `answered/unanswered → exists/notExists` (the [CTO-QAE-005] additive predicate migration); array ops map onto QAE's multi-normalization shape: `has(k,v) → eq(k.v,true)`, `hasAny → any(…)`, `hasNone → all(not(…))` — unanswered-⇒-true semantics preserved.
- **`levels` gates** become `in('derived.experienceClass', […])` conjuncts — one gating mechanism, not two.
- **Clarify eligibility on `derived.conflict_*` flags is stripped to const-true**: QAE serves clarifies exclusively through the conflict stage, where `detect` has already passed. The 8 conflict `detect` functions (unserializable legacy JS) are hand-transcribed into predicate data in `bank-config.qae.json`, validated by the contradictory-persona goldens.
- **Answer types**: single/multi/number/boolean direct; `slider→number`, `rank/weekdays/bodyAreas/equipment→multi` (vocab injected where the legacy def relied on ambient vocab), `exercises→openList`, `text→text` (the QAE normalization migration). Every remap ⇒ `PRESERVE_WITH_MAPPING`. Legacy `select.min/max` constraints are not yet enforced by QAE normalization — recorded as a contract gap for bank freeze.
- **`provides`**: scalar key, or `key.count` family for multi/openList.
- **Copy**: `copyKey = legacy question id` — the existing Arabic/English wording remains referenced host content (`src/i18n/dict/personalization.ts` keyed by these ids). **No Arabic/English string exists anywhere in the QAE bank** (proof-scanned).
- **Follow-up hygiene**: references to non-active questions are stripped post-pass (an active question may not point at a removed one); bank integrity then proves zero unknown references, zero cycles, zero unreachable clarifies.

## Dispositions requiring product decisions (6)

The 5 legacy-unreachable gap-fill clarifies (L-QST-3, per U4: make reachable or delete at bank freeze) + **`b-target-weight` (NEW defect L-QST-7)**: its legacy eligibility reads `answers.primaryGoal`, which no question provides (the goal key is written to `derived.goalKey`) — the question is **permanently ineligible in today's production**. Reviving it (mapping the path to `derived.goalKey`) would change live behavior, so it awaits sign-off.

## Ramadan seam ([CTO-QAE-005] §10)

No fasting/religious question exists in the bank (legacy proof enforces this; conversion preserves it). The future seam: a host-side `fastingStatus` question feeding `RamadanContext` — schema ready, rule pack disabled, nothing inferred.
