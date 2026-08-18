# STATE — حالة المشروع للبدء البارد

**Plan version:** v1.0-rc · **Updated:** 2026-08-18 · **Status:** AWAITING_FOUNDER_REVIEW

> A fresh session must be able to act correctly from this file alone, without chat memory.
> Everything below is repository/CI evidence or an explicitly labelled unknown.

## Current Ground

**Adopted ground: NONE — the founder has not yet chosen one (`DEC-001`).**

| Role | Ref | Full SHA |
|---|---|---|
| Production pointer | `main` | `cc60adfc0da0f893b101230269d4847d33490429` |
| **Proposed** ground (verified green) | `claude/qimmah-recovery-control-plane-hph1jg` | `dc031fa36929e07c3b00fa025a676ed64327ce59` |
| Live tip of that branch (**unverified**) | same branch | `8e83963b7d653d6bfb19c00c614ca3a694e65d7d` |
| This verification branch | `claude/control-files-tier1-verification-oibji7` | based on `cc60adf…` |

`main` is **229 commits behind** the proposed ground and contains no commit the proposal lacks.
Do **not** treat `main` as the development frontier. Do **not** merge the proposal — that is a founder act.

## Last verified branch + full SHA

| | |
|---|---|
| Branch | `claude/control-files-tier1-verification-oibji7` |
| Full SHA at verification | `cc60adfc0da0f893b101230269d4847d33490429` |
| Working tree | clean (`git status --short` empty; 0 untracked; 0 stashes) |
| Verified | 2026-08-18, Tier-1 (nine checks) — see `VERIFY.md` |

## Plan version

`PLAN.md` **v1.0-rc** — not frozen, not authorized for execution.

## Completed

- Four control files created at `docs/governance/` (v1.0-rc): `DECISIONS.md`, `VERIFY.md`, `PLAN.md`, `STATE.md`.
- Tier-1 verification answered: `V-GROUND-01..06`, `V-CI-01..03`, each with branch, full SHA, and command evidence.
- Ref topology established: 81 remote branches, 100 tags, two disjoint histories.
- CI red on `main` classified as `INFRASTRUCTURE` and named at commit level.

## In Progress

**Nothing.** Execution is deliberately not started. WIP rule: **max one open item per workstream; finish before start.**

| Workstream | Open item |
|---|---|
| GROUND | — |
| GOV | — |
| TRUTH | — |
| GATE | — |
| OBS | — |
| REL | — |

## Next 3

1. **Founder resolves `DEC-001`** (canonical ground) → unblocks `QIM-V1-GROUND-001`.
2. **Founder resolves `DEC-002`** (Web-first vs Web+iOS) → fixes the Definition of Done.
3. **`QIM-V1-TRUTH-001`** begins on the adopted ground, starting with `CLM-001`.

## Blockers

| # | Blocker | Blocks | Owner |
|---|---|---|---|
| B-1 | `DEC-001` unresolved — no adopted ground | All execution | Founder |
| B-2 | `DEC-002` unresolved — V1 horizon undefined | Definition of Done, iOS scope | Founder |
| B-3 | `DEC-004` unresolved — three control planes coexist | `QIM-V1-GOV-001` | Founder |
| B-4 | `CLM-001` — legal text says no active subscription while 13 actions are enumerated as paid | Release (if material FALSE) | TRUTH workstream, after B-1 |
| B-5 | `main` CI red (`INFRASTRUCTURE`) — the `[CTO-87]` fix exists at `dc031fa` but not on `main` | Nothing technically; misleads every future agent and branch protection | Resolves with B-1 |
| B-6 | **The proposed ground branch is moving.** Tip advanced `dc031fa` → `8e83963` mid-verification; another session writes to it live and the new tip has no completed CI run | Pinning any ground at all | Founder (FA-007) |

## Unknowns

| # | Unknown | Why it is not answered |
|---|---|---|
| U-1 | Is entitlement gating **live at runtime** at the ground SHA? | Requires broad investigation — Tier-2, owned by `QIM-V1-TRUTH-001`. The *text* contradiction is confirmed; the *runtime* state is not. |
| U-2 | Do any of the ~140 proofs pass vacuously? | Three leads exist; one (`test:coaching` runner-less) **did not reproduce**. Owned by `QIM-V1-GATE-001`. |
| U-3 | Does unique product work exist on founder-side machines? | This container is ephemeral and cannot see the founder's hardware. See `FA-004`. |
| U-4 | Do `src/data/dailyPhrases.ts` / `src/i18n/dict/eSettings.ts` carry content still wanted? | Low materiality; owned by `QIM-V1-GROUND-002`. |
| U-5 | Root cause of iOS `ERR_UNKNOWN` boot failure | Outside this scope; charter §11 assigns it to lane D. |
| U-6 | What the 5 commits beyond `dc031fa` (up to `8e83963`) contain, and whether they are green | They landed during this verification pass; no completed CI run exists for them. |

## Founder Decisions

Open, from `DECISIONS.md`:

| ID | Decision | Status |
|---|---|---|
| DEC-001 | Canonical ground for V1 | `PENDING_FOUNDER` |
| DEC-002 | V1 horizon: Web-first (A) or Web+iOS (B) — recommendation **A** | `PENDING_FOUNDER` |
| DEC-003 | Onboarding: questions before account | `PENDING_FOUNDER` |
| DEC-004 | Which control plane governs | `PENDING_FOUNDER` |
| DEC-005 | Disposition of the 8 open PRs (disjoint lineage) | `PENDING_FOUNDER` |

Locked and **not** reopenable without a numbered decision change: `DEC-101`…`DEC-106`.

## Founder Actions

Actions only the founder can perform or authorize. Derived from real blockers — none invented to fill the section.

| ACTION_ID | Action | Why founder is required | Blocks | When required | Status |
|---|---|---|---|---|---|
| FA-001 | Approve or reject the proposed canonical ground `dc031fa36929e07c3b00fa025a676ed64327ce59` | Choosing ground decides which implementation owns the product; charter §1.1/§1.3 reserve promotion to the founder | All execution (B-1) | **Now** — first gate | `OPEN` |
| FA-002 | Answer `DEC-002` (Web-first vs Web+iOS) | Sets release scope and commercial timing | Definition of Done (B-2) | **Now** — before planning freeze | `OPEN` |
| FA-003 | Name the authoritative control plane (`DEC-004`) | Two normative planes cannot both govern | `QIM-V1-GOV-001` (B-3) | **Now** | `OPEN` |
| FA-004 | Confirm whether any Qimmah clone/worktree on founder-side hardware holds unpushed work | This container cannot see the founder's machines; only the founder can check | Completeness of `V-GROUND-05` (U-3) | Before ground is frozen | `OPEN` |
| FA-005 | Decide the disposition of PRs #38, #39, #42–#47 (`DEC-005`) | Closing others' PRs is founder-only (charter §1.3) | Branch hygiene; reviewer attention | After FA-001 | `OPEN` |
| FA-007 | Freeze the ground line: tag `dc031fa36929e07c3b00fa025a676ed64327ce59`, and direct the session writing to `claude/qimmah-recovery-control-plane-hph1jg` to stop or to branch elsewhere | Ground cannot be pinned while an unattended session advances it; only the founder can direct another lane (charter §1.4) | FA-001, and all execution (B-6) | **Now — before FA-001** | `OPEN` |
| FA-006 | Decide `CLM-001`: correct the legal text, or disable the paid gate | A legal document contradicting the code is a founder-level commercial and compliance call | Release, if material FALSE (B-4) | After `QIM-V1-TRUTH-001` resolves U-1 | `OPEN` |

**Not listed, because it is not required now:** deployment, App Store/TestFlight submission, branch deletion, and live database migrations remain founder-only (`DEC-106`) but none is currently pending.
