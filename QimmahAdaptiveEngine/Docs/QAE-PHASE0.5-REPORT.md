# QAE Phase 0.5 Report — Specification, Contracts, Legacy Map, Fixtures

**Per [CTO-QAE-001] §20.** Stop condition honored: no runtime implementation exists in this tree.

## Deliverables

- **Docs/** — 17 documents: the 16 mandated specs (QAE-VISION, QAE-ARCHITECTURE, DOMAIN-MODEL, RULE-MODEL, DECISION-MODEL, SAFETY-POLICY, ADAPTATION-POLICY, QUESTION-ENGINE, DATA-QUALITY, GOAL-LIFECYCLE, RETURNING-USER-POLICY, RAMADAN-CONTEXT, NUMERIC-CONTRACT, TESTING-STRATEGY, EVIDENCE-REGISTER, IMPLEMENTATION-ROADMAP) + LEGACY-ENGINE-MAP + this report (+ the Phase 0 assessment).
- **Contracts/** — 7 JSON Schema drafts + reason-code registry (46 codes) + conventions README.
- **Fixtures/spec/** — 34 scenario specifications + schema + index README. Every expectation labeled `CHARACTERIZED_EXISTING / PRODUCT_POLICY_APPROVED / RESEARCH_REQUIRED / UNRESOLVED`; no invented behavior.
- **Research/** — pointer notes; findings live in EVIDENCE-REGISTER.md (14 verified entries, all citations located live on 2026-08-07).

## Mapped legacy behaviors (LEGACY-ENGINE-MAP)

Six subsystems fully characterized with file:line and dispositions: calculators (BMR/TDEE/calories/macros/water/forecast), minors policy (both thresholds, all enforcement points, both proofs), plan generator (split/schemes/slots/equipment/injury/placement/nutrition/commitments), personalization question engine (selection order, scoring constants, budgets, bank, contradictions, experience, exercise selection, persistence), recovery (v1 deprecated + v2 unwired), steps/observations/trends (incl. the confirmed absence of any weekly check-in engine). **19 known defects registered** (L-SAF-1 … L-STP-3), each with a QAE handling.

## Unresolved decisions (founder queue)

| ID | Decision | Recommendation |
|---|---|---|
| **#U1** | Unknown/unset age: legacy treats as adult (`isMinorAge(0)=false`, proof-pinned). Supersede so unknown age **blocks** plan finalization? | **Yes — block.** Safety-critical; deviation documented in SAFETY-POLICY §6 |
| **#U2** | 5-day split with no muscle focus defaults to an **arms** day (legacy). Keep bug-compatible or default balanced? | Keep for parity now; change alongside #U3 wave |
| **#U3** | Full-gym users get a **machines-only 32-exercise pool** (legacy L-TRN-1). Intended? QAE target: full vocabulary + machine-priority weighting | Confirm QAE target; keep oracle behavior only as parity reference |
| **#U4** | Fate of the 5 unreachable gap-fill clarify questions (L-QST-3) at bank freeze | Make reachable or delete — no dead questions |
| **#U5** | Question budget: wired `DEFAULT_BUDGET` (15–20) vs declared-but-unwired `CHARTER_TREE_BUDGET` (11–19, the [CTO-15] numbers) | Product choice needed at contract freeze |
| **#U6** | Does QAE v1 proactively **propose** diet breaks, or only model the state? | State-only in v1 |
| **#U7** | Sequencing: RamadanContext needs a host-side fasting question, but the live [CTO-76] decision bans religious terms in the bank (proof-enforced). Context feed is a product change outside QAE | Founder sequencing decision; QAE spec is compatible with either timing |
| **#U8** | Retain declared recomp **intent** on the profile (non-enum field) so stable-weight+rising-performance reads as success? | Yes — keeps the locked goal enum intact |
| **#U9** | Legacy `AREA_RESTRICTIONS` maps shoulder/elbow/wrist/upper-back/neck to **no** pattern restriction (partial coverage via overhead/valsalva flags). Confirm intent | Verify at contract freeze; metadata contraindications close the gap regardless |

## Contradictions discovered during Phase 0.5

1. **[CTO-QAE-001] §7 (Ramadan in V1) vs live [CTO-76] (Gulf-context assumed, religious terms banned from the bank, proof-enforced).** The engine-side design is compatible (context is host-supplied facts), but the *data source* for that context contradicts the current live product decision → #U7.
2. **§1 "preserve verified behavior" vs §6 "adopt the live minors policy" vs safety principles:** the live policy, proof-pinned, includes L-SAF-1 (unknown age ⇒ adult). Adopting it verbatim would adopt a safety hole → #U1.
3. **§1 preserve vs §8 metadata-only selection:** legacy injury id-blocklists and the machines-only pool cannot be both preserved and superseded. Resolved by the parity-then-supersede pattern: oracle behavior pinned as parity fixtures, approved deviations documented per fixture (S08, S17).
4. **NUMERIC-CONTRACT no-floats vs legacy float constants** (0.025 multiplier, 1.8 g/kg, 0.27 fat ratio): resolved via scaled integers; the Phase-1 oracle harness must define the float→canonical-integer boundary once, so TS goldens and the Swift port compare canonicalized values, not float artifacts.
5. **Legacy internal disagreements surfaced by characterization** (not QAE-created, now on record): two split recommenders disagree; weight forecast ignores the actual goal (L-NUT-2); `ex.environment` metadata exists but is never read; deprecated recovery v1 ships in UI while complete v2 sits unwired.

## Research gaps (blocking-labeled)

1. **EVR-007 — step progression increments:** no credible source located; all `QAE-STP` increase magnitudes blocked or ASSUMPTION-labeled pending founder sign-off.
2. Pelland et al. volume meta-regression + Refalo 2025 protein/FFM update: located, need a dedicated verification pass before their numbers enter rules.
3. Mapping athlete/general-population rate bands (EVR-001/010) to g/week thresholds for trend rules.
4. Operational plateau definition (weeks × band) — likely lands PRODUCT_POLICY.
5. Youth-specific quantitative volume caps (EVR-008 is qualitative).

## Recommended first runtime wave (after separate approval)

**Oracle harness + domain kernel & SafetyPolicy** (Roadmap Phases 1–2): the harness turns characterization into machine-generated goldens (everything downstream depends on it), and the sealed-safety kernel is the highest-risk architectural claim — proving non-bypassability first retires the biggest unknown while touching zero product behavior. Both fit charter wave size.
