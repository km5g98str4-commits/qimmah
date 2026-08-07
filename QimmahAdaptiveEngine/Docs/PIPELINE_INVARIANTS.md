# QAE Pipeline Invariants

**Status:** Baseline · Mandated by [CTO-QAE-004]
**Any breach of any invariant is a first-degree bug** — highest severity after user safety, ahead of every feature concern. Each invariant names its enforcement (structural where possible, proof otherwise). The proof suite carries a named check per invariant; a new pipeline change that cannot keep all invariants green does not merge.

| # | Invariant | Enforcement |
|---|---|---|
| I1 | **No proposal before Safety.** No candidate becomes a proposal without passing the safety screen stage; composites are legality-checked before conflict resolution ever sees them. | Structural (stage order in `resolver.ts`) + proof: the smuggled composite is suppressed at screen and never appears in proposals |
| I2 | **No proposal after rejection.** A (variable, direction) pair the user rejected within its cooldown window is never re-proposed — the engine does not nag. | Proof: `proposalRejectedCooldown` suppression; opposite-direction non-suppression asserted to keep the invariant tight, not over-broad |
| I3 | **Every proposal has provenance.** All minimum fields ([CTO-QAE-004]): `engineVersion`, `decisionSchemaVersion`, `oracleVersion`, `manifestHash` (ruleManifest), `seed`, `timestamp`, `origin` — including `keepPlan`. | Structural (provenance builder requires every field; schema `required`) + proof per proposal |
| I4 | **Every proposal has explainability.** ≥1 registered reason code; appears in the trace; derivable into all three layers from the single developer-level source. | Proof: reason-code minimum + trace totality + layer derivation |
| I5 | **Budget never mutates rules.** The budget stage reads only `{priorityClass, priorityScore, changeClass, magnitude}` and emits accept/suppress decisions; rule objects are never written. | Structural (budget is **blind**: it must not read `kind`/`targetVariable` semantics — [CTO-QAE-004] §5) + proof: kind-renaming invariance + frozen-rules evaluation |
| I6 | **Rules never mutate evidence.** `evaluateRule` reads a frozen request; facts/series are inputs, never outputs. | Proof: deep-frozen request evaluated successfully (mutation would throw) |
| I7 | **Pipeline never mutates request.** `resolve` is a pure function; the request object is byte-identical before and after. | Proof: deep-freeze + pre/post canonical comparison |
| I8 | **Registration order is meaningless.** The output is invariant under any permutation of the rules array; `ruleId` is a stable identifier, never derived from insertion order ([CTO-QAE-004] §3). | Proof: permutation invariance (result AND manifest hash) |
| I9 | **Every rule has a fate.** The trace partitions the rule set: fired ∪ suppressed ∪ notFired ∪ insufficientEvidence (∪ the reserved `disabledByManifest`, §Reserved) covers every rule exactly once. | Proof: trace totality |

## Reserved trace state

`disabledByManifest` ([CTO-QAE-004] §4) is reserved in the trace model for distinguishing *a rule disabled by manifest configuration* from *a rule whose conditions didn't hold*. It is *not implemented* until a phase needs rule disabling; reserving the name now prevents a future overload of `notFired`.

## Relationship to the locked pipeline

These invariants bind the locked components (Decision Pipeline, Proposal Model, Provenance Contract, Explainability Layers, Conflict Resolver, Change Budget, Composite Evaluation Order, Pipeline Trace Model — locked by [CTO-QAE-004]). A migration that touches any locked component must re-prove every invariant and re-verify golden byte-identity before it lands.
