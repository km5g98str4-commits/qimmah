# QIMMAH — PROJECT CONTROL PLANE

**Start here. Every session. No exceptions.**

This folder exists because Qimmah kept restarting: each new session reconstructed the project
from memory, rediscovered the same branches, and re-litigated settled decisions. **One fact has
exactly one owner here.** If two files disagree, the owner wins.

## Read in this order

| file | owns |
|---|---|
| [`00-GROUND.md`](./00-GROUND.md) | **which commit is the product**, and the verified gate on it |
| [`01-DECISIONS.md`](./01-DECISIONS.md) | what is already decided — `LOCKED` decisions are not reopened by preference |
| [`06-MASTER-PLAN.md`](./06-MASTER-PLAN.md) | the ordered work, permanent task IDs, the red-team pass |
| [`07-STATE.md`](./07-STATE.md) | where execution stands **right now** — the only file a session updates at the end |

Then, as needed:

| file | owns |
|---|---|
| [`02-SCOPE.md`](./02-SCOPE.md) | what V1 is · out of scope · cut list · parking lot · **the stop rule** |
| [`03-BRANCH-LEDGER.md`](./03-BRANCH-LEDGER.md) | every branch and PR, one decision each |
| [`04-FEATURE-MAP.md`](./04-FEATURE-MAP.md) | which capability actually reaches a user, and where the chain breaks |
| [`05-CLAIMS.md`](./05-CLAIMS.md) | does the product do what it tells the user it does |
| [`08-UNKNOWNS.md`](./08-UNKNOWNS.md) | what we do not know + the exact command that settles it |
| [`09-RELEASE-RUNBOOK.md`](./09-RELEASE-RUNBOOK.md) | build · gate · CI · deploy · rollback · definition of done |
| [`10-FOUNDER-ACTIONS.md`](./10-FOUNDER-ACTIONS.md) | what only the founder can do — **no last-hour surprises** |
| [`CHANGELOG.md`](./CHANGELOG.md) | plan changes — scope may not expand silently |

## Session protocol

**On start** — read the four files above, then prove the ground still exists:

```bash
git fetch origin codex/qimmah-sovereign-closure-001
git merge-base --is-ancestor 139a7b0 origin/codex/qimmah-sovereign-closure-001 && echo GROUND-OK
npm ci    # mandatory after any branch switch
```

**On end** — update `07-STATE.md`. Only that file. Not this one, not the ground.

## The rules that override preference

1. **`main` is not the frontier.** It is the production pointer and is 228 commits behind (DEC-001).
2. **A `LOCKED` decision is reopened only by a new numbered decision** — never because an agent
   prefers a different architecture.
3. **If it is not in `02-SCOPE.md`, it is not built** without a numbered PLAN CHANGE.
4. **Never weaken a test to get green.** Classify every test change `STRONGER` / `EQUIVALENT` /
   `WEAKER`; `WEAKER` needs explicit justification and should be avoided.
5. **Code existing is not a feature.** A capability is LIVE only when the whole user path connects.
6. **Read CI before every landing.** Red freezes the landing even when the local gate is green —
   and red can hide red, so read the whole run.
7. **When the release candidate's `BLOCKS_V1` list is empty, the candidate freezes.** After that,
   only release blockers may change code. New findings go to the parking lot.

## Cold-start check

A session with no conversation history should be able to answer all ten from these files alone:
canonical branch/SHA · what V1 is · locked decisions · the next three tasks · what is blocked ·
which branches hold unique work · production status · what not to work on · which commands prove
the current state · what needs the founder personally.

If any answer is missing, the control plane is incomplete — fix it before doing product work.
