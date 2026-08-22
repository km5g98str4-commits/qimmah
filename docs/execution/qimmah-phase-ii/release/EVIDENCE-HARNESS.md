# Release Evidence Harness

Status: `CONTRACT_EXECUTABLE / FINAL_ARTIFACT_BLOCKED`

This package turns the Release Convergence evidence shape into an executable,
fail-closed validator without claiming that browser evidence exists. Its
committed JSON is synthetic contract data, visibly marked `FIXTURE_ONLY`; the
validator forbids that source mode from producing any `GO` verdict.

## Artifacts

| Path | Purpose |
| --- | --- |
| `data/phase-ii-release/evidence-contract-fixture.json` | Deterministic examples of PASS/FAIL/BLOCKED/NOT_APPLICABLE records and seven unevaluated verdicts |
| `scripts/phase-ii-release/evidence-lib.mjs` | Contract builder and validator |
| `scripts/phase-ii-release/build-contract-fixture.mjs` | Fixture writer and byte-for-byte check |
| `scripts/phase-ii-release/validate-evidence-manifest.mjs` | CLI validator for a supplied manifest |
| `scripts/phase-ii-release/release-evidence-proof.mjs` | Named anti-circumvention mutations |

No script starts a browser, changes product state, or synthesizes a final
candidate result.

## Required record truth

Each record binds an evidence ID and assertion ID to one candidate SHA, built
artifact manifest digest, persona, browser engine, locale, viewport, initial
state, action, expectation, observation, terminal status, diagnostics, and UTC
timestamp.

- `BLOCKED` requires a dependency ID.
- `NOT_APPLICABLE` requires both a contract reason and a counter-proof ID.
- Screenshot paths, when present, are relative and cannot contain absolute,
  backslash, NUL, encoded traversal, `.` or `..` segments.
- Duplicate evidence IDs or duplicate execution tuples fail.
- All records must match the top-level candidate SHA and dist digest.

The seven verdicts are required as one exact set. A `GO` requires
`FINAL_CANDIDATE` source mode, referenced PASS evidence, and zero listed
dependencies. `NO-GO` requires referenced failing evidence. `BLOCKED` requires
at least one dependency. The contract fixture keeps all verdicts
`NOT_EVALUATED`.

## Commands

```bash
node scripts/phase-ii-release/build-contract-fixture.mjs --check
node scripts/phase-ii-release/validate-evidence-manifest.mjs
node scripts/phase-ii-release/release-evidence-proof.mjs
for file in scripts/phase-ii-release/*.mjs; do node --check "$file"; done
```

To validate a future manifest, pass its repository-relative path to
`validate-evidence-manifest.mjs`. Validation is necessary but does not establish
that screenshots, browser actions, or external systems are genuine; the final
runner and evidence custody still require accepted-artifact execution and human
review.

## Current proof

- Contract fixture: 4 terminal-state examples and exactly 7 verdict slots.
- Reproducibility: byte-for-byte PASS.
- Validator: PASS for `FIXTURE_ONLY`; no verdict evaluated.
- Mutations: 9/9 PASS — artifact identity, duplicate evidence, blocked without
  dependency, not-applicable without counter-proof, screenshot traversal,
  fixture GO, GO backed by failure, and NO-GO without failure, plus the base
  fixture assertion.

## Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-REL-HARNESS-001` | The validator is executable, but selectors, browser actions, artifact identity, and real results depend on the accepted product. | Founder-accepted Web SHA, final route map, sanctioned state-setup seams, and reproducible `dist` artifact. | Final release persona runner and evidence bundle. | Bind the runner to accepted selectors, create fresh isolated contexts, capture genuine browser evidence, validate the manifest, inspect failures/blocks, and calculate verdicts without transferring fixture results. |

