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
| Release | `67c6b2407447fd84679698647df6a7d5c14e1411` | Seven new lane-owned evidence/artifact scripts; no baseline script changed |
| Food | `4a4380654ed08fa73124a262411c056d12aa8049` | Six new lane-owned seed-pipeline scripts; no baseline script changed |
| Exercise | `e97522f3e68d9022aa7bd6c3203da5b2a2f41355` | Thirteen new lane-owned scripts; no baseline script changed |
| Executive | `1dc78d6751fb9269a75176f40ad5ba2483db651c` | Three new lane-owned fixture scripts; no baseline script changed |

Any newer lane head containing an executable/tooling delta makes this ledger
stale until its diff is appended; later documentation-only commits do not alter
the executable inventory. The final candidate needs a regenerated file
inventory after rebind; branch names or earlier assertion totals are not
sufficient.

## 2. Executable changes

### Food deterministic seed package

Introduced at `ed162aed` and hardened at
`4a4380654ed08fa73124a262411c056d12aa8049`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/food-production/lib/canonical-food-v1.mjs` | New canonicalization and terminal-outcome builder | Transform only the fingerprinted 55-row package while preserving raw provenance | 55 rows become exactly 51 accepted, four review, zero rejected | None; emits quarantined Phase-owned data only |
| `scripts/food-production/lib/json-schema.mjs` | New local schema validator | Validate emitted canonical rows without adding a runtime dependency | Every emitted canonical record satisfies `canonical-food-v1.schema.json` | None |
| `scripts/food-production/lib/pkg-001-validation.mjs` | New fail-closed package validator, later hardened around identity and exact artifact set | Bind source, build, baseline, status, counts, paths, and checksums so a valid row file cannot hide a corrupt envelope | Build/source fingerprints, five exact artifacts, confined paths, record counts, terminal conservation | None |
| `scripts/food-production/build-pkg-001.mjs` | New deterministic package builder/check mode | Make all five artifacts reproducible from the immutable source | Byte-for-byte rebuild and build ID `7bfe4cc245e45ce4d152f0b2956ab8f7e0cece71d95b6d27f63165f709c58ebe` | None |
| `scripts/food-production/validate-pkg-001.mjs` | New validator entry point | Produce explicit nonzero failure on package drift | Manifest checksum `61f9f69b72e05136ac157fd8389230f477f9d471e17f93d12336cd3a304b229b` at the recorded head | None |
| `scripts/food-production/run-data-1a-proof.mjs` | New anti-circumvention suite, later extended with envelope attacks | Prove row accounting, GTIN, provenance, schema, input identity, and package metadata fail by name | 25/25 named checks, including six hardening counter-mutations | None |

The seed package remains `QUARANTINED_SEED_NOT_FOR_DISTRIBUTION`. Its executable
evidence proves integrity and determinism, not data rights, full-catalog
coverage, production activation, or runtime behavior.

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

### Exercise video-research pilot package

Introduced at `40937fe7cca4812ec5aa0f0fdff8bcad916c245e`; dependency wording was
normalized without changing executable files at
`e97522f3e68d9022aa7bd6c3203da5b2a2f41355`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/exercise-production/video-research-pilot-lib.mjs` | New deterministic candidate builder and validator | Record exact public evidence for a bounded ten-ID pilot without treating research as approval | Ten rows: nine `CANDIDATE_NEEDS_INDEPENDENT_REVIEW`, one `MISSING`, zero `APPROVED` | None |
| `scripts/exercise-production/build-video-research-pilot.mjs` | New builder/check entry point | Reproduce the pilot byte-for-byte | `VIDEO_RESEARCH_REPRODUCIBILITY` | None |
| `scripts/exercise-production/validate-video-research-pilot.mjs` | New offline validator | Fail closed on malformed, unbound, or prematurely approved research | Candidate URL/ID/source/status and source-fingerprint rules | None |
| `scripts/exercise-production/video-research-pilot-proof.mjs` | New anti-circumvention suite | Attack approval, missing-result dishonesty, URL shape, publisher binding, canonical coverage, and source drift | Eight named mutations pass | None |
| `scripts/exercise-production/verify-video-research-live.mjs` | New read-only public metadata verifier | Detect deleted/private/reassigned candidates before any later review package | 9/9 candidate IDs returned public metadata from the recorded publisher on 2026-08-22 | None; network read only |

Live availability does not prove movement correctness, coaching suitability,
rights, or independent approval. Those remain `EX-VIDEO-REVIEW-001`.

### Executive contract-fixture package

Introduced at `1dc78d6751fb9269a75176f40ad5ba2483db651c`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/executive-dashboard/lib/contract-fixtures.mjs` | New source-integrity, deterministic generation, access/provider, data-minimization, chart, attention, capability, and bundle validator | Turn the reviewed admin architecture into executable contracts without adding a route or live source | Six load states, three metric states, five chart identities, two minimized users, four attention states, source/bundle fingerprints | None; synthetic fixture code outside `src/**` |
| `scripts/executive-dashboard/generate-fixtures.mjs` | New `--check`, `--integrity`, and `--print` entry point | Prove repeatable generation and inspect exact fingerprints | Byte-for-byte output and fixed reference time | None |
| `scripts/executive-dashboard/proof-contract-fixtures.mjs` | New proof suite | Attack absence-as-zero, partial/stale honesty, chart identity, raw/health data, role forgery, early provider calls, and fake capability controls | 9 positive assertions and 11/11 named mutations | None |

### Release evidence-contract package

Introduced at `4863da1df56d7785304bb2090e75a6d18d991de8`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/phase-ii-release/evidence-lib.mjs` | New evidence/verdict validator and deterministic fixture builder | Bind every future browser result to immutable artifact identity and prevent fixture data from becoming a release decision | Record/state/dependency/path/identity rules and seven exact verdict names | None; no browser or product import |
| `scripts/phase-ii-release/build-contract-fixture.mjs` | New fixture writer/check | Keep the synthetic contract fixture byte-for-byte reproducible | `EVIDENCE_FIXTURE_REPRODUCIBILITY` | None |
| `scripts/phase-ii-release/validate-evidence-manifest.mjs` | New manifest CLI | Fail closed on malformed final evidence | 4 fixture records / 7 verdict slots validation | None |
| `scripts/phase-ii-release/release-evidence-proof.mjs` | New counter-proof suite | Prevent identity mismatch, status loopholes, path traversal, or unevidenced verdicts | Base assertion plus 8 named mutations; 9/9 total | None |

### Release built-artifact manifest package

Introduced at `67c6b2407447fd84679698647df6a7d5c14e1411`.

| Path | Change | Why | Assertions/evidence | Production behavior impact |
| --- | --- | --- | --- | --- |
| `scripts/phase-ii-release/artifact-manifest-lib.mjs` | New deterministic file inventory and digest library | Bind future release evidence to exact built bytes instead of a branch name | Ordered relative paths, sizes, per-file SHA-256, candidate SHA, root label, tree digest | None |
| `scripts/phase-ii-release/build-artifact-manifest.mjs` | New manifest CLI | Generate or verify the future accepted build manifest | Refuses missing/empty roots and symlinks | None |
| `scripts/phase-ii-release/artifact-manifest-proof.mjs` | New fixture and mutation suite | Attack byte drift, identity drift, label drift, empty output, ordering, and symlink traversal | 7/7 focused proof cases | None |

This tool has been proven only on synthetic fixtures; no final Web artifact
manifest has been generated or declared.

## 3. Existing baseline tests changed

None through the recorded heads.

- No file present under `scripts/**` at `cc60adf` was edited or deleted.
- No baseline assertion was relaxed, skipped, replaced by a snapshot, or made
  conditional.
- No browser test was converted into an SSR/static-markup proof.

The Food, Exercise, Executive, and Release scripts above are entirely new in their
lane-owned directories. Changes between the two Exercise Phase II commits are
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

The recorded Food, Exercise, Executive, and Release executable scripts were reviewed for the prohibited test
shortcuts named in the launch brief:

- no `.skip`, focused `.only`, or placeholder `todo` test;
- no `|| true` that converts a failing assertion into success;
- no swallowed validator error or success-by-exception;
- no mocked production entitlement, backend, media approval, or generated file;
- every exception hardening has a named mutation that attacks its stated intent.

The review result applies only to the exact three executable heads recorded
above. It must be rerun for later Food or other harness commits.

## 6. Documentation-only plans

These specify future tests but are not counted as passes:

| Lane | Plan | Current truth |
| --- | --- | --- |
| Food | `docs/execution/qimmah-phase-ii/food/TEST-PLAN.md` | Plan plus the deterministic quarantined seed package at `4a43806`; full licensed production corpus remains pending |
| Exercise | `docs/execution/qimmah-phase-ii/exercise/TEST-PLAN.md` | Plan plus ledger, image-job, and video-pilot executable packages; human approval remains pending |
| Executive | `docs/execution/qimmah-phase-ii/admin/TEST-PLAN.md` | Contract fixtures execute at `1dc78d6`; component/browser/server execution remains blocked |
| Release | `docs/execution/qimmah-phase-ii/release/RELEASE-CONVERGENCE-PLAN.md` | Evidence schema and synthetic artifact-manifest proofs execute through `67c6b24`; persona/browser execution remains blocked |

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
