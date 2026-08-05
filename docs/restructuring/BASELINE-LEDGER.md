# Qimmah execution baseline

Repository: `km5g98str4-commits/qimmah`

Execution branch: `codex/qimmah-execution`

Execution HEAD: `eaa03e1e2458be61fdc73133e312a2d47f64801c`

Official baseline: `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de`

Approved Golden Fixtures commit: `f3d2f6f829f322cbe86f8064702467dc0d566839`

Working tree status at QIM-001 start: clean (`codex/qimmah-execution...origin/main [ahead 1]`).

PlanEngine Golden Fixtures v1:

- Fixture count: 12.
- Manifest source commit: `dd79a60f193b1163ab1ec549a35458e0d2aab1de`.
- Manifest verification: passed before QIM-001; all recorded input, expected-output, and canonical-fixture hashes matched.
- Golden proof result: `npm run test:plan-golden` passed with deterministic, finite, strict, mutation-protected output.

Environment warning from QIM-000:

- A redundant final `npm ci` revalidation failed with `EPERM` while unlinking `node_modules/.package-lock.json`.
- This was an operating-system permission issue inside `node_modules`, not a repository or implementation failure.
- No repository validation was invalidated and no source files were changed.
