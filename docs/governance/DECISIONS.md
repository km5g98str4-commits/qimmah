# DECISIONS — سجلّ القرارات الدائم

**Version:** v1.0-rc · **Status:** AWAITING_FOUNDER_REVIEW
**Scope:** the durable decision register for Qimmah. One row per decision, stable ID, never silently rewritten.

## Rules

1. **Historical AI reports and conversation history are CLAIMED, not VERIFIED.** Only repository / Git ancestry / remote / CI evidence promotes a claim to VERIFIED.
2. A decision may **not** be reopened without an explicit numbered decision change (a new `DEC-xxx` row whose `Supersedes` names the old ID, which then moves to `SUPERSEDED`).
3. Statuses: `LOCKED` · `PENDING_FOUNDER` · `SUPERSEDED`.
4. **No product decision is inferred.** Absence of evidence is recorded as `PENDING_FOUNDER`, never as a silent default.

---

## PENDING_FOUNDER

### DEC-001 — Canonical ground for V1

| Field | Value |
|---|---|
| **Decision** | Which ref is the canonical ground that all V1 work builds on. |
| **Status** | `PENDING_FOUNDER` |
| **Reason** | `main` is **not** the product frontier. It carries 63 commits and is 229 commits behind `claude/qimmah-recovery-control-plane-hph1jg`, which contains `main` in full (behind = 0). Choosing ground is a founder-level act because it decides which implementation "owns the ground". |
| **Evidence/source** | `git rev-list --left-right --count main...origin/claude/qimmah-recovery-control-plane-hph1jg` → `0  229`. Containment lattice over all 81 remote refs (see `VERIFY.md` V-GROUND-03). CI run #423 (`32174357740`) **success** on `dc031fa36929e07c3b00fa025a676ed64327ce59`. |
| **Proposal** | `claude/qimmah-recovery-control-plane-hph1jg` @ `dc031fa36929e07c3b00fa025a676ed64327ce59` |
| **Date** | 2026-08-18 |
| **Reopen condition** | A ref is shown to contain product work absent from the chosen ground and not deliberately superseded. |

> **Not merged. Proposal only.** Adopting this ground is a founder act (charter §1.1 / §1.3).
>
> **Adopt the SHA, not the branch name.** During this verification the branch tip moved
> `dc031fa` → `8e83963b7d653d6bfb19c00c614ca3a694e65d7d`; another session is writing to it live, and the new tip
> has no completed CI run. The proposal is pinned to the verified-green SHA. See `FA-007`.

### DEC-002 — V1 launch horizon

| Field | Value |
|---|---|
| **Decision** | (A) Web launch first · or (B) Web + iOS launch together. |
| **Status** | `PENDING_FOUNDER` |
| **Reason** | The two horizons imply different Definitions of Done and different blocking sets. |
| **Evidence/source** | Repository carries both surfaces: Cloudflare Pages web deploy (`wrangler.toml`, charter *ملحق: النشر*) **and** a Capacitor iOS shell (`capacitor.config.ts`, `ios/`). Charter §11 records an **open, undiagnosed iOS boot failure** (`ERR_UNKNOWN` on a physical device) assigned outside the coordinator's lane. |
| **Recommendation** | **(A) Web launch first.** |
| **Consequences — A** | Ships on a surface that is already green and already deploys from Git. Defers the undiagnosed iOS `ERR_UNKNOWN` and the entire App Store review/compliance path out of the critical line. Cost: no iOS presence at V1. |
| **Consequences — B** | Adds to the critical path: an undiagnosed native boot failure, App Store compliance (charter §11 marks the minors gate an **App Store compliance item**, not merely a functional one), TestFlight, and review latency — each founder-gated and none of them estimable until the boot failure is diagnosed. |
| **Safe default if no answer** | Proceed as (A) for **planning only** — build nothing iOS-specific, and take no action that forecloses (B). |
| **Date** | 2026-08-18 |
| **Reopen condition** | iOS boot failure diagnosed and closed, or founder sets a dated store commitment. |

### DEC-003 — Onboarding: questions before account

| Field | Value |
|---|---|
| **Decision** | Whether onboarding asks profile questions **before** account creation, and the ordering of intent / age / body / restricted goals. |
| **Status** | `PENDING_FOUNDER` |
| **Reason** | **No repository evidence of a recorded founder decision exists.** `CLAUDE.md` §8 marks this an explicitly **open design point** — "⚠️ نقطة تصميم مفتوحة — تُحسم في موجات الـOnboarding الكامل لا تُورَّث بالسكوت" ("an open design point — decided in the full Onboarding waves, not inherited by silence"). |
| **Evidence/source** | `CLAUDE.md` §8. The charter names the tension itself: the research blueprint puts **intent first**; the minors gate needs **age before restricted goals**; the dam wave chose body-first only because the gate forced it. |
| **Date** | 2026-08-18 |
| **Reopen condition** | Founder decision in a numbered message. Not inheritable by silence — this is the charter's own instruction. |

### DEC-004 — Which control plane governs

| Field | Value |
|---|---|
| **Decision** | Which governance file set is authoritative — **three** now exist. |
| **Status** | `PENDING_FOUNDER` |
| **Reason** | Three parallel control planes exist on three different refs. Two governance planes cannot both be authoritative; the failure mode is exactly the one charter §1.5 warns about ("a copied doc ages and contradicts"). |
| **Evidence/source** | (1) `docs/execution/qimmah-master/` — 13 files, `MASTER_PLAN_VERSION = 1.0`, on `dc031fa` (the proposed ground). (2) `docs/control/` — 4 files, v0.9.1, on `origin/claude/control-files-tier1-verify-yyxg50` @ `64fca13b0ce89eedb0a57046c4d94bb2360612a5`. (3) `docs/governance/` — **this set**, v1.0-rc. |
| **Recommendation** | Adopt **one** plane and reduce the others to pointers. If DEC-001 adopts `dc031fa`, the cheapest consolidation is to merge this `docs/governance/` set **into** the existing `docs/execution/qimmah-master/` rather than run both. |
| **Date** | 2026-08-18 |
| **Reopen condition** | Founder names the authoritative plane. |

### DEC-005 — Disposition of the 8 open PRs

| Field | Value |
|---|---|
| **Decision** | What happens to PRs #38, #39, #42, #43, #44, #45, #46, #47. |
| **Status** | `PENDING_FOUNDER` |
| **Reason** | **These PRs cannot be merged by ordinary means.** Their branches share **no common ancestor** with `main` — `git merge-base main origin/e/personalization-guardrail-r2` exits non-zero. They belong to a disjoint 630-commit lineage that the current `main` lineage (63 commits, two roots) replaced. |
| **Evidence/source** | `git merge-base` → "NO COMMON ANCESTOR"; root of `e/*` = `bc59adb30633ed8ec545d2045f73857a0f5d928a`; roots of `main` = `d6421789f46be58d0d6a1145c24961cf67545d86`, `b7d93c1c25e87482f694bc821a2efe0d92cba259`. |
| **Options** | (a) Close them with a recorded reason and re-implement anything still wanted onto the canonical ground; (b) cherry-pick specific content forward; (c) leave open as historical reference. |
| **Recommendation** | (a) or (b). Leaving eight PRs open against an unreachable lineage will keep costing review attention and will keep implying mergeability that does not exist. |
| **Date** | 2026-08-18 |
| **Reopen condition** | Founder disposition. |

---

## LOCKED

These are recorded here because they exist **in the repository** (`CLAUDE.md` §8, "قرارات المؤسس المقفلة"), not because a report asserted them. They are transcribed, not re-decided.

| ID | Decision | Status | Evidence/source | Reopen condition |
|---|---|---|---|---|
| DEC-101 | Nutrition **budget** feature is out of V1. | `LOCKED` | `CLAUDE.md` §8/1 | Numbered founder decision change |
| DEC-102 | The Ramadan question is **permanent, neutrally worded**, activated seasonally. | `LOCKED` | `CLAUDE.md` §8/2 | Numbered founder decision change |
| DEC-103 | Plan adjustments are **always a suggestion** in V1 — no silent automatic edit; every change explains its cause. | `LOCKED` | `CLAUDE.md` §8/3 | Numbered founder decision change |
| DEC-104 | Source of the expanded exercise library is **suspended** pending inventory of the current library. | `LOCKED` (suspended) | `CLAUDE.md` §8/4 | Completion of the library inventory |
| DEC-105 | Sensitive health data syncs **only behind a separate explicit consent**. | `LOCKED` | `CLAUDE.md` §8/5 | Numbered founder decision change |
| DEC-106 | Merge/promotion/deploy/branch-deletion/live-migration remain **founder-only**, authorized by name each time. | `LOCKED` | `CLAUDE.md` §1, §1.1, §1.3 | Charter amendment |

---

## SUPERSEDED

*(empty at v1.0-rc)*
