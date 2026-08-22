# Final Web HEAD Rebind Runbook

Status: prepared, not executed  
Owner: Phase II coordinator  
Trigger: explicit founder acceptance naming one immutable Web Sovereign SHA

This runbook reconciles two non-negotiable rules:

- Phase II must be rebased onto the accepted Web HEAD after acceptance.
- Published history must not be force-pushed or silently rewritten.

The solution is to preserve every current Phase II remote branch, create a new
rebind branch, rebase that new branch locally, and publish it with a normal
first push. No current branch is rewritten on the remote.

## Preconditions

Do not begin unless all statements below are true.

- The founder has explicitly accepted a full 40-character Web Sovereign SHA.
- The acceptance evidence and SHA are recorded in the central `STATUS.md`.
- `git fetch origin` resolves the accepted object locally.
- The current Web Sovereign worktree remains untouched and read-only.
- Each Phase II lane is clean, committed, and pushed; an untracked or modified
  lane is a stop condition, not an invitation to stash or reset.
- The old baseline and every pre-rebind lane head are recorded.
- GitHub CI status on the accepted SHA has been read and any red job is named.

## Immutable input record

Fill this table before the first rebase command.

| Input | Required value |
| --- | --- |
| Founder acceptance reference | Message/task identifier and timestamp |
| Accepted Web SHA | Full 40-character SHA |
| Accepted ref | Remote ref resolving to the same SHA |
| Prior Phase II baseline | `cc60adfc0da0f893b101230269d4847d33490429` unless a later approved ledger supersedes it |
| Release lane head | SHA plus remote branch |
| Food lane head | SHA plus remote branch |
| Exercise lane head | SHA plus remote branch |
| Executive lane head | SHA plus remote branch |
| Accepted-head CI | Workflow URL, conclusion, failed job/step if red |

If the accepted ref and recorded SHA differ after fetch, stop and record a new
dependency. Never infer that a moving branch name still means the accepted
commit.

## Branch strategy without force push

For each lane, derive a new branch name that includes the accepted short SHA:

```text
i/phase-ii-release-convergence-002-rebound-<sha7>
c/phase-ii-food-production-002-rebound-<sha7>
h/phase-ii-exercise-production-002-rebound-<sha7>
e/phase-ii-executive-dashboard-002-rebound-<sha7>
```

The existing `-002` remote branches remain immutable recovery points. Create
each rebind branch from its corresponding Phase II head, rebase the new branch
onto the accepted SHA, and publish the new name using a normal `git push -u`.
Do not force-update the old remote branch.

## Lane order

Rebind and verify one lane at a time:

1. Release documentation and test architecture.
2. Food production assets and validators.
3. Exercise production assets and validators.
4. Executive contracts and isolated frontend module.
5. Coordinator-owned union (`package.json` and shared CI) only after all four
   rebound lane heads are independently green.

This is sequential landing discipline, not a merge order. No lane merges itself
and no main integration happens in this runbook.

## Per-lane procedure

The commands below are a future operator template. Replace placeholders with
recorded immutable values; do not run it against a branch name that can move.

```text
git fetch origin
git status --short --branch
git switch -c <new-rebound-branch> <old-phase-head-sha>
git rebase --onto <accepted-web-sha> <old-phase-baseline-sha> <new-rebound-branch>
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:gate
git diff --check <accepted-web-sha>...HEAD
git push -u origin <new-rebound-branch>
```

The exact rebase base may differ when a lane contains intentionally reused
Phase II commits from another independent lane. Prove the commit set with
`git log --graph` and `git range-diff` before substituting a different base.

## Conflict policy

Classify every conflict before touching it.

| Class | Action |
| --- | --- |
| Recorded dependency with an expected integration point | Resolve only within the documented Phase II contract, then run its named focused proof. |
| Independent generated artifact | Regenerate deterministically from reviewed inputs; do not hand-edit output. |
| `package.json` or shared CI | Leave for the coordinator-owned union after lane gates pass. |
| Web-owned product file not named by a dependency | Abort the lane rebase, record a new dependency, and continue with another lane. |
| Supabase, SQL, RLS, RPC, service role, Salla merchant state, QAE semantics | Stop; these remain hard no-touch without new explicit authority. |
| Unclear ownership or competing correct outcomes | Stop and request a founder/owner decision; do not choose silently. |

After resolving a conflict in a file touched by earlier work, print and verify
the earlier invariant before committing. A clean conflict marker scan is not
proof that the semantic union survived.

## Verification layers

### Every lane

- Fresh `npm ci`.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build`.
- `npm run test:gate`.
- Lane-specific deterministic proofs, including their negative/counter-proofs.
- `git diff --check`.
- Clean status after the checkpoint commit.
- Normal push and remote-head equality check.

### Final candidate, after lane verification

- Release personas against the built artifact, not the dev server.
- Preview bypass attacks and paid-mutation denial.
- Auth, nutrition, workout, progress, measurements, exercises, and admin.
- Arabic and English core journeys.
- Widths 320, 360, 375, 390, 393, 414, 430, 768, 1024, and 1280+.
- Chromium plus WebKit for critical iPhone paths; otherwise record exactly
  `VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE`.
- Fresh, returning, interrupted, corrupt, and unauthorized-admin contexts.
- Food pipeline, media manifest, broken-link/media, bundle, secret-leak,
  accessibility, and responsive checks.
- GitHub CI read for the exact final candidate SHA.

## Dependency closure rule

For each dependency, append evidence rather than rewriting its original claim:

```text
Dependency ID:
Accepted input SHA:
Integration commit:
Focused proof:
Remaining work:
Closure status: OPEN | PARTIAL | CLOSED
```

Only dependencies already in the ledger are expected work. A new conflict or
behavior mismatch is a new dependency and must not trigger a broad
re-investigation of completed food, exercise, or dashboard production work.

## Stop conditions

Abort the current lane and preserve its state if any of the following occurs:

- founder acceptance is absent, ambiguous, or names a different SHA;
- the Web worktree would need to be modified;
- the lane has uncommitted work not produced by the operator;
- the rebase requires a Web-owned product decision not present in the ledger;
- a deterministic generator cannot reproduce its committed manifest/checksum;
- any mandatory local gate or exact-SHA CI is red;
- the only path forward requires force push, deployment, main merge, or a
  hard-no-touch backend mutation.

## Completion evidence

The rebind is complete only when all new rebound branch SHAs, all gate results,
all recorded dependency resolutions, and all remaining blockers are present in
`STATUS.md`. Completion does not authorize merge or deployment.
