# 03 — BRANCH LEDGER (سجلّ الفروع)

> **Canonical owner of one fact only: what every branch contains and what happens to it.**
> Measured against `CANONICAL_GROUND` (`00-GROUND.md`) on 2026-08-18. 80 remote branches.
> **No branch is allowed to stay "maybe useful."** Every row carries exactly one decision.

Decision vocabulary: `ADOPT` · `REFERENCE` · `SUPERSEDED` · `ARCHIVE` · `WITHDRAW` · `UNKNOWN`

Reproduce any row:
```bash
git rev-list --left-right --count origin/codex/qimmah-sovereign-closure-001...origin/<branch>
git diff --stat origin/codex/qimmah-sovereign-closure-001...origin/<branch>
```

---

## A. Current-era branches carrying commits the ground does NOT have — 8

80 remote branches: **27 fully contained**, 53 with at least one unique commit. Of those 53,
these **8** are the only ones from the current era (August 2026) — the rest are pre-frontier
(§C). These are the only branches where live work can be lost.

| ID | branch | HEAD | date | uniq | decision | why |
|---|---|---|---|---|---|---|
| **BR-01** | `codex/qimmah-final-release-convergence-001` | `df10b88` | 08-16 | **4** | **ADOPT** → `QIM-V1-004` | FINAL-018/019/020: hardens the numeral-policy guard **at the display boundary** (`workoutDayLabel` output is stored, not displayed — the old guard checked the wrong file and could pass while the real limit was removed), lands BUG-033..036 in the ledger, fixes 4 persona harnesses. **106 lines of `src/`.** Real, small, release-grade. |
| **BR-02** | `ci/artifact-quota-nonblocking` | `9e679c3` | 08-11 | **1** | **ADOPT** → `QIM-V1-005` | 9-line CI change so a GitHub **storage-quota** failure on artifact upload cannot mask the gate result. This exact masking already cost the project 6 days of unread red (charter §4.0). |
| **BR-03** | `claude/salla-activation` | `7590ce7` | 08-11 | 22 | **REFERENCE** | Its product payload (Salla webhook, entitlement migrations, purchase integrity) **is already on the ground** via `claude/salla-reconciled` — `supabase/functions/salla-webhook/index.ts`, `supabase/migrations/20260812120001_salla_webhook_ingest.sql`. Genuinely unique here: `scripts/staging/*` (staging preflight + contract capture). Not V1: no staging environment exists yet. |
| **BR-04** | `claude/access-entitlements` | `df85c77` | 08-09 | 17 | **SUPERSEDED** by BR-03 | Strict ancestor subset of `claude/salla-activation` (`df85c77` is that branch's 6th commit). Zero content of its own. |
| **BR-05** | `claude/web-rc-cto009` | `da11034` | 08-10 | 20 | **SUPERSEDED** | The same CTO-009 work-packages already landed on `main` via merge `695e649` (`15b50b7`, `0d0cfb7`, `090ef15`, `18c4b30`, `1781f10`, `d65f63c`, `51767d2`, `ff93511`, `672302d`) and are therefore on the ground. These are pre-merge duplicates of adopted commits. |
| **BR-06** | `claude/qae-architecture-design-fhg2mh` | `3da8162` | 08-09 | 16 | **REFERENCE** (post-launch) | QAE — a **second, parallel training engine** (ExerciseMetadata catalog, capability profile, staged selection, AthleteProfile contract v1.0.0, 131-check proof suite). **200 files / +110,964 lines.** Genuinely valuable and genuinely not V1: adopting a second plan engine during release convergence is the exact move this mission exists to stop. |
| **BR-07** | `archive/qae-training-wave2-269b2bb` | `269b2bb` | 08-13 | 30 | **REFERENCE** (post-launch) | QAE wave 2 — supersedes BR-06 (contains it). ACSM-2026 reconciliation, prescription foundation (sets/reps/RIR/rest), shadow integration (diagnostic, fail-open), M1a/M1b athlete profile. **257 files / +121,112 lines.** Same verdict, same reason. **This is the single largest body of unadopted work in the repository — it must not be lost.** |
| **BR-08** | `claude/codex-web-sovereign-trace-j9kzwz` | `6fce502` | 08-15 | 1 | **SUPERSEDED** by BR-01 | `6fce502` is the first of BR-01's four commits. |

### The QAE decision, stated plainly (BR-06 + BR-07)

Two branches hold ~121k lines of a **more rigorous training engine** than the one shipping.
It is not dead, not superseded, and not V1. It is `REFERENCE`, tagged for preservation
(`QIM-V1-014`), and it re-enters through a numbered decision after launch — never by an
agent noticing it and deciding the current engine should be replaced.
See `01-DECISIONS.md` **DEC-009**.

---

## B. Fully contained in the ground — nothing to lose (27, the notable ones listed)

`main` · `codex/qimmah-canonical-launch-candidate-001` · `codex/qimmah-founder-qa-candidate-001` ·
`codex/qimmah-sovereign-overnight-rc-001` · `codex/qimmah-release-convergence-001` ·
`codex/qimmah-postweb-convergence-001` · `codex/qimmah-food-production-001` ·
`codex/qimmah-exercise-production-001` · `codex/qimmah-executive-dashboard-001` ·
`codex/qimmah-web-sovereign-001` · `claude/web-sovereign-final-recovery-o8alub` ·
`claude/salla-reconciled` · `claude/qimmah-today-home-redesign-2q1wdk` ·
`claude/founder-ux-access-gate-0rn49k` · `audit/web-sovereign-final` ·
`codex/qimmah-web-integration` · `fix/asset-404-hardening` · `s/food-search` ·
`s/catalog-jointloads`

**Decision for all: `SUPERSEDED`.** They were the lanes; the ground is their union.
Safe to delete whenever the founder chooses — *after* tagging (charter §1.1). Nothing is
lost by deleting them and nothing is gained by keeping them.

> `s/food-search` HEAD is `wip(food): … عمل غير مكتمل حُفظ عند انقطاع الجلسة` — a WIP
> commit whose content was landed properly on the ground via `46f76c3`
> (`merge(food): [SOVEREIGN-FOOD-001] سلطة بحث واحدة`). Verified 0-ahead. Nothing to rescue.

---

## C. Pre-frontier era — 300–1050 commits behind (45)

Every `feature/*`, `research/*`, `design/v21-*`, `fix/*`, `hotfix/*`, `e/*`, `content/*`,
`claude/p1*`, `claude/q1*`, `merge/*`, `backup/*`, `audit/design-fidelity`, `feat/v11-experience`.
Each is 300–1050 commits behind with 1–6 unique commits that are **June–July experiments
already re-implemented on the frontier**. This group includes the three August-dated `e/*`
branches (`e/personalization-guardrail`, `…-r2`, `e/settings-clarity-r2`) — dated 2026-08-01 but
based on `design/v21-promotion`, and their content already ships as the live gate steps
`test:e-guardrail` and the `test:e-plan-*` family.

**Decision for all: `ARCHIVE`.** They are git history, not candidates. Do not diff them,
do not rebase them, do not "check if anything was missed" — that check was performed in
[CTO-78] (264 branches deleted) and again here by containment.

`design/v21-promotion` specifically: **320 behind, 0 ahead.** It is a historical reference
with no authority (charter §1). Any doc still calling it the trunk is stale.

---

## D. Open pull requests — all stale, all against a dead base

| PR | title | base | verdict |
|---|---|---|---|
| #38 · #39 | personalization guardrail / settings clarity (superseded by #46/#47 in their own titles) | `design/v21-promotion` | **WITHDRAW** |
| #42 · #43 · #44 · #45 | plan rationale → preview → why → honest axes (stacked chain) | each other | **WITHDRAW** — content landed on the frontier (`test:e-plan-rationale`, `test:e-plan-why`, `test:e-plan-preview` are all live gate steps) |
| #46 · #47 | guardrail / settings r2 | `design/v21-promotion` | **WITHDRAW** — `test:e-guardrail` is a live gate step |
| #7 | `react-body-highlighter` muscle map | `main` | **WITHDRAW** — frozen since July pending a study that never happened; the ground ships its own body model with `test:body3d` in the gate |

All six open PRs target `design/v21-promotion`, a branch that is **320 commits behind the
ground**. Merging any of them would be a regression. Closing them is founder-owned
(`10-FOUNDER-ACTIONS.md` **FA-07**) because closing another party's PR is irreversible
(charter §1.3).

---

## E. Worktrees

One: `/home/user/qimmah` on the working branch. The two stale worktrees named in
`CLAUDE.md §11` (`qimmah-ux-core`, `qimmah-ux-entry`) do not exist in this environment —
they were local to the founder's machine. No action from an agent.
