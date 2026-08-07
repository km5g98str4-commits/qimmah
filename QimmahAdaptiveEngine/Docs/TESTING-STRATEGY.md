# QAE Testing Strategy

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]

## 1. Layers

| Layer | What it proves | When |
|---|---|---|
| **Scenario goldens** (`Fixtures/`) | End-to-end behavior on the 34+ specification scenarios; canonical-value byte parity | every gate; later the Swift conformance suite |
| **Characterization tests** | QAE reproduces legacy-oracle behavior where the legacy map says `preserve` | implementation waves |
| **Rule unit fixtures** | per rule: ≥1 Fired, ≥1 NotFired, ≥1 InsufficientEvidence | with each rule |
| **Counter-tests** (charter §4.2) | every guard attacked: named failures, not accidental ones | with each guard |
| **Property-based tests** | invariants over generated inputs | Phase-6-equivalent wave |
| **Mutation tests** | rule/threshold mutations are caught by some test | hardening wave |
| **Determinism fuzz** | same request ⇒ identical canonical output across repeats and input permutations | hardening wave |

## 1a. The golden law ([CTO-QAE-002])

> **Every future runtime must pass 100 % golden compatibility before ANY optimization. Correctness precedes performance.**

No performance work, refactor-for-speed, or algorithmic substitution is reviewable until the candidate runtime reproduces every enabled golden byte-for-byte. A runtime at 99 % is not "almost done" — it is not started.

## 1b. Determinism envelope ([CTO-QAE-002])

Every fixture carries a `determinism` envelope — `{seed, timezone, clock, locale, ruleManifest, engineVersion}` — so replay is perfectly deterministic. `seed` exists for replay-format completeness (the domain has no randomness; it must be ignored), and `locale` is recorded precisely so tests can prove the output does **not** vary with it.

## 2. Golden fixtures as the portability contract

- Fixtures are language-neutral JSON (canonical integers only; fixture linter rejects floats).
- Expected outputs are **never invented**: each expected block carries a source label — `CHARACTERIZED_EXISTING` (pinned from the legacy oracle), `PRODUCT_POLICY_APPROVED` (founder-approved policy), `RESEARCH_REQUIRED`, `UNRESOLVED`. A fixture with `RESEARCH_REQUIRED`/`UNRESOLVED` expectations documents the scenario now and becomes executable only after its label resolves.
- The future Swift implementation must reproduce every golden byte-for-byte after canonical serialization. Divergence = parity failure, no tolerance.
- Oracle harness (implementation wave): a runner that executes the legacy TS functions on fixture inputs to *generate* characterized expectations — expectations come from executing the oracle, not from reading its code.

## 3. Core property tests (initial set)

1. **Budget invariant:** for all inputs, emitted proposals contain ≤1 major-or-composite and ≤1 minor.
2. **Composite legality:** no emitted composite contains a non-protective component.
3. **Safety dominance:** no emitted proposal violates the concurrently-computed ValidDecisionSpace.
4. **No-evidence ⇒ no-change:** degrading any series below its confidence gate never yields a plan-changing proposal for rules requiring it — only keepPlan/requestMoreData.
5. **Priority monotonicity:** adding a higher-class conflicting candidate never lets the lower-class one win its variable.
6. **Determinism:** permuting input array orders (pre-canonicalization) never changes canonical output.
7. **Cooldown:** a variable changed in cycle N is not proposed for change in cycle N+1 within its window (safety exempt).
8. **Minors:** for every generated minor profile, no restricted-goal plan or proposal is ever issuable.
9. **Explainability totality:** every emitted proposal has ≥1 reason code and ≥1 evidence ref; every suppressed candidate appears in the trace.

## 4. Counter-test catalogue (seeded now, grows with every guard)

- Composite-bundle bypass (calories −300 + steps +3000 + volume +20 % as a "recovery bundle") → rejected by named check.
- Engine emitting a plan without SafetyPolicy → unconstructible/named failure.
- Stale accepted proposal turned unsafe → blocked at checkpoint 3.
- Simulated jargon leak into beginner question path → caught by name (carried from legacy proof).
- Simulated minor-goal smuggling (injected answer, stored draft, direct profile write) → each rejected by name (carried from legacy proof).
- Fixture with a float or unordered canonical list → fixture linter fails by name.
- Rule behavioral change without version bump → manifest test fails.

Rule of charter §4.2: **no gate is accepted until it has been attacked.** A negative test that fails with a `TypeError` instead of a named check is itself a defect.

## 5. Gates

QAE waves run the repo's standard gate (`npm ci && typecheck && lint && build && test:gate`) plus, once QAE tests exist, a `test:qae` aggregate wired into `test:gate` via the coordinator (package.json is coordinator-owned, charter §1.4). Fixture linting and manifest checks live inside `test:qae`. During Phase 0.5 (docs/contracts/fixtures only) the existing repo gate must simply remain green — QAE adds no runtime to break it, and CI must be read before any push lands (§4.0).

## 6. Coverage discipline

- Every rule ID appears in ≥1 scenario fixture or dedicated rule fixture; the linter cross-references.
- The legacy map's "known defects" list each get a regression fixture in QAE proving the defect is *fixed* (or a documented decision to preserve it, e.g., bug-compatible behavior during parity).
- No silent caps: any test that samples (property-test iterations, fuzz rounds) logs its bounds.
