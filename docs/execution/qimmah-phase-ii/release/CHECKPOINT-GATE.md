# Phase II Isolated Checkpoint Gate

Status: `TOOL_READY / CURRENT EVIDENCE NOT YET CAPTURED`

This coordinator-owned tool executes only the focused, implementation-
independent validators already committed on the four isolated `-002` lanes. It
does not merge their files, edit `package.json`, modify CI workflows, consume a
Web Sovereign branch, or replace the full project gate.

## Fail-closed contract

- All four lane roots and all four exact 40-character heads are mandatory.
- The checked-out branch must equal the isolated branch recorded in the plan.
- Every lane worktree must be clean before the first command runs.
- Commands are fixed Node argument arrays. No shell, `|| true`, pipes, command
  substitution, arbitrary executable, or path outside `scripts/**` is accepted.
- Removing a lane or required command invalidates the plan.
- A nonzero command stops the run. A report is written only after every command
  passes, and uses exclusive creation so prior evidence is never overwritten.
- Standard output/error are represented by SHA-256 in the report rather than
  copied wholesale, reducing accidental data leakage while retaining drift
  detection.

The plan is `data/phase-ii-release/checkpoint-gate-plan.json`. Its integrity is
captured in every evidence report.

## Invocation shape

```bash
node scripts/phase-ii-release/run-checkpoint-gate.mjs \
  --lane release=/absolute/release-worktree --expect release=<full-sha> \
  --lane food=/absolute/food-worktree --expect food=<full-sha> \
  --lane exercise=/absolute/exercise-worktree --expect exercise=<full-sha> \
  --lane executive=/absolute/executive-worktree --expect executive=<full-sha> \
  --output /absolute/new-report.json
```

The output path must not already exist. Live video availability is intentionally
outside this offline gate because it requires network access and separate
timestamped evidence. The full `npm ci` + typecheck + lint + build + test gate,
browser suites, final artifact scan, and CI reading remain separate mandatory
layers.

## Proof

```bash
node scripts/phase-ii-release/checkpoint-gate-proof.mjs
```

The proof attacks duplicate/missing lanes, wrong branch, missing/duplicate
commands, shell execution, traversal, shell operators, and unapproved arguments.

## Dependency

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-GATE-UNION-001` | The isolated checkpoint gate can execute current lane-owned proofs, but cannot become the final repository/CI gate before the accepted dependency graph and rebound heads exist. | Founder-accepted Web Sovereign SHA and the four selected rebound heads. | Coordinator-owned final gate union after rebind. | Regenerate the exact command inventory, add the full baseline and browser layers, review any `package.json`/workflow union, execute on the final candidate, and read exact-SHA CI. |
