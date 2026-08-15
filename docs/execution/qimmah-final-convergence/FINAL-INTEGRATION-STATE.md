# FINAL-INTEGRATION-STATE

> Integration Command Center — Phase II closure, release convergence, founder handoff.
> Authority: coordinator. Read-only monitoring opened 2026-08-15 ~01:40 UTC.
> **Git is the source of truth. Chat claims and lane self-reports are inputs, not evidence.**

## 0. Baseline discovery — the finding that reshaped the plan

`main` is **NOT** the integration baseline.

- `main` = `cc60adf` (production; Cloudflare Pages auto-deploys from it — untouched, forbidden)
- `d83add2` = "final Web head", **ancestor of all five lanes**
- **`1614d41`** (`claude/codex-web-sovereign-trace-j9kzwz`) = **the already-existing integration head**

`1614d41` had already merged **all five lanes** at earlier SHAs, plus four of its own integration fixes:

| commit | what it added |
|---|---|
| `8bc53b2` | `CANONICAL-SURFACE-LOCK` — proves the live owner of every doubled surface |
| `22e9a4c` | closes BUG-019 on the **live** routes; ledger watch extended to 28 |
| `1412648` | wires the lane's four scripts + fixes a cross-account leak its harness found |
| `05be857` | routes the product store through checked storage |

Convergence therefore is **not** a five-way merge. It is absorbing the **deltas** the lanes produced
after `1614d41` consumed them. Integration branch: `codex/qimmah-final-release-convergence-001`,
based at `1614d41`, worktree `/Users/ziyad/qimmah-final`.

## 1. Lane ledger

| lane | branch | HEAD | pushed | worktree clean | baseline | outstanding vs `1614d41` | status |
|---|---|---|---|---|---|---|---|
| **A** release/access | `codex/qimmah-release-convergence-001` | `d405b38` | yes | **NO — 11 dirty** | `d83add2` | **1** | ACTIVE WRITER |
| **B** sovereign audit / WebKit | `audit/web-sovereign-final` | `863e540` | yes | n/a | `d83add2` | **1** | settling |
| **C** exercise production | `codex/qimmah-exercise-production-001` | `dfde745` | yes | clean (tip elsewhere) | `d83add2` | **1** | ACTIVE WRITER |
| **D** food production | `codex/qimmah-food-production-001` | `e12bad0` | yes | clean (tip elsewhere) | `d83add2` | **3** | ACTIVE WRITER |
| **E** executive dashboard | `codex/qimmah-executive-dashboard-001` | `1091451` | yes | 1 untracked proof | `d83add2` | **0 — absorbed** | COMPLETE |
| **F** postweb convergence | `codex/qimmah-postweb-convergence-001` | `1806b81` | yes | clean | `d83add2` | **0 — absorbed** | COMPLETE |

Outstanding commits to absorb (6 total):

- A `d405b38` fix(access) [CONV-8] close preview bypass for plan save — at the mutation boundary
- C `dfde745` feat(exercise) wire English coaching + approved video refs into the live detail surface
- D `714f9cd` shard loader, IndexedDB cache, index-backed search
- D `a2dbec1` [D-1 close] static delivery, live UI adoption, ODbL on search
- D `e12bad0` docs: F-1 Arabic-normalization gap (P2), F-2 shard-upload deploy dependency
- B `863e540` test(e2e): open WebKit, diagnose trunk red, audit report

**Activity evidence** (age at 01:40 UTC): exercise 5 min · food 12 min · sovereign-trace 13 min ·
release 28 min (+ dirty tree incl. modified persona scripts) · dashboard 110 min · postweb 110 min.
Per §4 of the command: idleness is not proof of completion, and an active writer is not interfered with.

## 2. Merge prediction — coordinator's own `merge-tree`, not a lane claim

| delta | prediction |
|---|---|
| `d405b38` | conflict: `docs/execution/qimmah-postweb/release/evidence/latest.json` (regenerable evidence artifact) |
| `dfde745` | **conflict: `package.json`** |
| `e12bad0` | **conflict: `package.json`** |
| `863e540` | **CLEAN** |

## 3. package.json — the §4.1 trap, quantified before it fires

Script counts: `1614d41`=**175** · `d405b38`=160 · `dfde745`=161 · `e12bad0`=164 · `863e540`=155.

**Every lane is BEHIND the integration head.** A `--theirs` resolution would silently delete
11–20 scripts; a `--ours` would silently drop the lane's new ones. Both are forbidden (§4.1).

Resolution is **semantic union**, pre-computed and provable:

- keep all **175** scripts from `1614d41`
- add the 4 scripts that exist only in a lane:
  - `test:e2e:exercise-detail` (C) — browser suite, stays outside the local gate per §4.0
  - `food:emit` (D) — pipeline tool, not a gate step
  - `test:e2e:food-catalog` (D) — browser suite, outside the local gate
  - `test:food-catalog` (D) — **belongs in `test:gate`** (lane's own gate references it)
- **target: 179 scripts**

`test:gate` steps: `1614d41`=**109**; lanes carry 102–104 and add exactly one new step
(`test:food-catalog`, from D). **Target gate: 110 steps.** No lane removes a step that
`1614d41` has — every "missing" entry is the lane being behind, not a deliberate removal.

## 4. Standing constraints

- `main` / production / Cloudflare / Salla / Supabase / QAE: **untouched**. Output is an RC branch, not a deploy.
- No force push, no rebase of published branches, no merge into `main`.
- Lane worktrees are read-only to the coordinator; the primary clone `/Users/ziyad/qimmah-deploy`
  carries another session's dirty files (`docs/audit/*`, `ui-audit/onboarding/`) — untouched (§2).
- Every lane is independently audited before acceptance; a lane's own report is never sufficient.
