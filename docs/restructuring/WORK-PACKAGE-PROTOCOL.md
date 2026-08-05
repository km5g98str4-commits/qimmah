# Controlled work-package protocol

This protocol applies to all restructuring work beginning from repository `km5g98str4-commits/qimmah`, execution branch `codex/qimmah-execution`, and baseline commit `937b154909d7af04e98d9775c9c6beffb466a6a6`. It is an operating standard adopted by QIM-002; it does not authorize implementation outside an approved package.

## Required package record

Every package must contain all fields below before implementation begins:

```markdown
## <ID> — <short name> [AUTO | REVIEW | BLOCKED]

- Objective:
- Exact scope:
- Allowed files:
- Forbidden files:
- Prerequisites:
- Implementation steps:
- Tests:
- Acceptance criteria:
- Rollback plan:
- Stop conditions:
```

The package report must state its repository, branch, starting and resulting commit, touched paths, exact commands, actual results, unresolved risks, and whether a requested action was intentionally not performed.

## Execution classes

| Class | Meaning | Allowed progression |
| --- | --- | --- |
| **AUTO** | A narrow, reversible package with explicit file scope and pre-approved tests. | May proceed only when every prerequisite and test passes, may create one narrow commit, then may advance to the next AUTO package. |
| **REVIEW** | A package requiring founder approval before its state-changing step. | Stop for written founder approval; do not infer approval from a prior package. |
| **BLOCKED** | A package waiting on an external dependency, prior review decision, or unavailable evidence. | Do not begin implementation; record the precise blocker and the next required authority or input. |

## Mandatory REVIEW boundaries

Founder approval is required before any package that:

- creates or splits repositories;
- deletes or moves legacy code;
- changes database schemas;
- changes PlanEngine behavior or calculators;
- enables cloud sync or changes consent, RLS, privacy, or legal behavior;
- changes the minimum iOS version;
- starts public beta, deployment, TestFlight, or App Store work;
- merges or closes PRs; or
- deletes branches or worktrees.

## Safety rules for every package

1. Work on one package only. Do not begin a successor before the current package has an evidence-backed terminal report.
2. Modify only the package's allowed files. A newly discovered needed file is a stop condition, not an implied scope expansion.
3. Preserve unrelated working-tree changes. Do not reset, checkout, delete, or overwrite them.
4. Before changing code, verify existing routes, wrappers, flags, imports, branches, and open PRs relevant to that scope.
5. Never create parallel `V2`, `New`, or `Final` implementations. Establish ownership first.
6. Do not weaken consent, privacy, RLS, validation, rollback, safe storage, or minor protections.
7. Do not delete legacy code until parity, dynamic-reference, and rollback gates all pass.
8. Use `npm ci` after an approved branch/worktree switch when the environment permits it; report environment failures separately from repository failures.
9. No bypass: a failed check stops the package. Report the command, raw error, affected paths, and recommended next action.
10. Do not push, merge, close PRs, change remotes, or delete branches/worktrees unless the package explicitly authorizes it and the founder has approved it.

## Evidence and verification standard

Each factual finding must be classified as **verified**, **historical**, **unresolved**, or **external/unavailable**, and include:

- repository;
- branch;
- commit;
- path or external URL; and
- the command, test, or source line that supports it.

Minimum checks are selected by risk and scope. Documentation-only packages run `git diff --check` and a path-scope review. Source-changing packages additionally run the explicit affected tests and the agreed typecheck, lint, build, and gate commands. A passing command may not be claimed if it was not actually run.

## Standard rollback and stop rules

Rollback must be named before implementation: normally a revert of the narrow commit, restoration from a documented snapshot, or `git cherry-pick --abort` for an in-progress cherry-pick. A rollback that deletes user data is never an acceptable default.

Stop immediately when any of these occurs:

- an allowed-file boundary is crossed;
- a prerequisite, test, hash, or deterministic-proof check fails;
- a merge/cherry-pick conflict appears;
- a working tree is unexpectedly dirty;
- a required external fact cannot be verified;
- a safety, consent, privacy, RLS, validation, minor-protection, or data-loss risk is discovered; or
- the work would require a REVIEW approval not yet provided.

The terminal report must distinguish repository failures from environment failures and must not hide either.
