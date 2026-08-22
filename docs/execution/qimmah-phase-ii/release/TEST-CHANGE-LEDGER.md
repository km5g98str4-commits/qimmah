# Phase II Test Change Ledger

Status: `CONTINUOUS / CURRENT_THROUGH_RECORDED_HEADS`

Baseline: `main@cc60adfc0da0f893b101230269d4847d33490429`

This ledger records every executable test, validator, proof, shared gate, and CI
change made by the isolated Phase II `-002` lanes. It distinguishes adding a
proof from changing an existing baseline test, and records why each change was
necessary. Documentation-only test plans are indexed separately because they do
not count as executable evidence.

## 1. Coverage boundary

Recorded lane heads for this checkpoint:

| Lane | Recorded head | Executable test/tooling delta from baseline |
| --- | --- | --- |
| Release | `142789e8e4180c5ec57e3642b1998b99b5fbfd4e` | None; documents only |
| Food | `8a78f86eec8b9b0019c021dfa6213a45e1a20763` | None; documents only at this head |
| Exercise | `e7435544410bb4c151a017da55658e435c8e69c2` | Eight new lane-owned scripts; no baseline script changed |
| Executive | `09dbf087a1acec45efd4739d7307fc9eb6e4edcd` | None; documents only at this head |

Any newer lane head makes this ledger stale until its diff is appended. The
final candidate needs a regenerated file inventory after rebind; branch names
or earlier assertion totals are not sufficient.

## 2. Executable changes

### Exercise review-ledger package

Introduced at `cea98dca086f0277025cc39d4a54120895d20a5c`, then hardened at
`e7435544410bb4c151a017da55658e435c8e69c2`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/exercise-production/ledger-lib.mjs` | New generator/validator library; later tightened media-path resolution | Derive the 181-row ledger from immutable baseline sources and prevent referenced assets from escaping their media roots | Canonical coverage, evidence digests, approval prerequisites, duplicate derivation, source fingerprint, `MEDIA_PATH_SCOPE` | None; reads baseline and generates Phase-owned data only |
| `scripts/exercise-production/build-review-ledger.mjs` | New deterministic builder/check mode | Make ledger regeneration byte-for-byte reproducible | `LEDGER_REPRODUCIBILITY` | None |
| `scripts/exercise-production/validate-review-ledger.mjs` | New validator entry point | Produce explicit summaries and nonzero failure for contract violations | 181 rows; image/video state counts; duplicate group count | None |
| `scripts/exercise-production/review-ledger-proof.mjs` | New mutation suite; later added traversal attack | Prove guards fail by their own names rather than by incidental exceptions | Eight named mutations: coverage, orphan, key mismatch, image approval, video exact reference, duplicate pair, file integrity, path scope | None |

The hardening commit did not weaken or delete an assertion. It added
`MEDIA_PATH_SCOPE` after adversarial review found that a public path beginning
with the expected prefix could still contain `..` segments. The counter-test
uses `/exercise-images/../../package.json` and requires the named guard.

### Exercise image-job package

Introduced at `e7435544410bb4c151a017da55658e435c8e69c2`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/exercise-production/image-production-jobs-lib.mjs` | New deterministic job builder/validator library | Represent all 37 missing-image IDs without inventing absent mechanics or metadata | Schema, ledger binding, coverage, provenance, mechanics, prompt, and output-state checks | None; creates blocked planning data only |
| `scripts/exercise-production/build-image-production-jobs.mjs` | New builder/check entry point | Reproduce the queue byte-for-byte from the review ledger | `IMAGE_JOB_REPRODUCIBILITY` | None |
| `scripts/exercise-production/validate-image-production-jobs.mjs` | New validator entry point | Confirm 37/37 coverage, mechanics blocks, and zero generated outputs | `IMAGE_PRODUCTION_JOBS` | None |
| `scripts/exercise-production/image-production-jobs-proof.mjs` | New anti-circumvention suite | Reject schema drift, dropped IDs, binding drift, invented metadata/mechanics/safety, premature prompts, and fake outputs | Eight named mutations | None |

## 3. Existing baseline tests changed

None through the recorded heads.

- No file present under `scripts/**` at `cc60adf` was edited or deleted.
- No baseline assertion was relaxed, skipped, replaced by a snapshot, or made
  conditional.
- No browser test was converted into an SSR/static-markup proof.

The exercise scripts above are entirely new under
`scripts/exercise-production/**`. Changes between their two Phase II commits are
explicitly described in section 2 instead of being hidden by the baseline-only
comparison.

## 4. Shared gates, package manifest, and CI

Through the recorded heads:

| Surface | Result |
| --- | --- |
| `package.json` | Not changed by any `-002` lane |
| `package-lock.json` | Not changed by any `-002` lane |
| `.github/workflows/**` | Not changed by any `-002` lane |
| `test:gate` membership | Not changed; lane scripts run directly until a coordinator-owned union is reviewed |
| Existing browser suites | Not changed |

This is deliberate isolation, not a waiver. Before final convergence, every
accepted lane proof must either enter the coordinator-owned gate union or have a
named, reviewed CI invocation with equivalent failure behavior.

## 5. Anti-weakening audit

The recorded Phase II executable scripts were reviewed for the prohibited test
shortcuts named in the launch brief:

- no `.skip`, focused `.only`, or placeholder `todo` test;
- no `|| true` that converts a failing assertion into success;
- no swallowed validator error or success-by-exception;
- no mocked production entitlement, backend, media approval, or generated file;
- every exception hardening has a named mutation that attacks its stated intent.

The review result applies only to the exact exercise head recorded above. It
must be rerun for later Food/Executive/release harness commits.

## 6. Documentation-only plans

These specify future tests but are not counted as passes:

| Lane | Plan | Current truth |
| --- | --- | --- |
| Food | `docs/execution/qimmah-phase-ii/food/TEST-PLAN.md` | Contract plan at `8a78f86`; executable seed pipeline pending |
| Exercise | `docs/execution/qimmah-phase-ii/exercise/TEST-PLAN.md` | Plan plus the focused executable packages listed above |
| Executive | `docs/execution/qimmah-phase-ii/admin/TEST-PLAN.md` | Future contract/component/browser/server plan; no executable admin test at `09dbf08` |
| Release | `docs/execution/qimmah-phase-ii/release/RELEASE-CONVERGENCE-PLAN.md` | Persona/attack contract; final-artifact execution blocked |

## 7. Append protocol

For every later pushed checkpoint:

1. Record the full lane SHA and compare it with the prior recorded SHA.
2. List every added, modified, renamed, or deleted executable test/tooling file.
3. State the behavior protected and why the prior evidence was insufficient.
4. Name removed or weakened assertions explicitly; absence of such changes is a
   claim requiring diff evidence.
5. Rerun the affected validator/proof, parse checks, `git diff --check`, and any
   relevant gate.
6. Search the new executable diff for skip/only/todo, `|| true`, loose presence
   assertions, swallowed exceptions, and mocked production success.
7. Commit and push this ledger update before calling the new checkpoint current.

## 8. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-TEST-LEDGER-001` | The continuous ledger can record independent Phase II proofs now, but cannot inventory final route/browser/gate changes against an unaccepted implementation. | Founder-accepted Web SHA and every rebound lane head selected for the final candidate. | Coordinator-owned final convergence and gate-union review. | Diff each rebound head from its recorded checkpoint, append all executable changes, audit assertion removals/weakening, run the union and exact-SHA CI, then freeze the ledger at the final candidate. |

