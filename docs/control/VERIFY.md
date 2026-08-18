# VERIFY.md — Qimmah Verification Register

**Revision:** v0.9.1
**Status:** PLANNING + VERIFICATION MODE. Not frozen. No implementation authorized.
**Scope:** This file defines *how* a claim becomes evidence, and *which* verification
questions are executed *when*.

---

## ⚠️ PROVENANCE NOTICE — read before trusting anything below

**No predecessor version of this file exists in this repository.**

The founder instruction that produced this revision refers to "the current VERIFY.md",
"the current plan", and "DEC-013". A full repository search found none of them:

```
$ git log --all --oneline --name-only --diff-filter=A -- '*VERIFY.md' '*PLAN.md' '*STATE.md'
  (only docs/MERGE-DEPLOY-PLAN.md and docs/beta/BETA-PLAN.md — unrelated files)
$ grep -rn "DEC-013\|V-GROUND\|QIM-V1-TRUTH\|UX-002\|ACC-001" --include="*.md" .
  (no matches)
$ git stash list ; git status --porcelain --untracked-files=all
  (both empty)
```

The two files named `DECISIONS.md` already in the tree (`/DECISIONS.md` and
`docs/product/DECISIONS.md`) are historical per-agent work logs from Phase 2/2.5.
They contain **no `DEC-nnn` identifiers at all** and are not the decision register
this control set refers to.

**Interpretation (stated as an assumption, not a fact):** the "v0.9 baseline" existed
only in a prior conversation and was never committed. Per this file's own evidence rule,
**that baseline is itself CLAIMED, not VERIFIED.**

Consequences, carried deliberately and visibly:

1. The nine Tier-1 check IDs were supplied by the founder; their **definitions below were
   authored here**, because no prior definitions exist to revise. They require founder
   confirmation that they are the intended questions.
2. `DEC-013`'s subject matter **could not be recovered**. See `DECISIONS.md` — it is
   recorded as `PENDING_FOUNDER` *and* awaiting restatement of its content.
3. `UX-002` and `ACC-001` are reconstructed in `PLAN.md` from repository evidence, not
   from the unrecoverable original.

This notice stays until the founder either confirms the reconstruction or supplies the
original v0.9 text.

---

## 1. Evidence rules (binding on every tier)

A verification answer is valid only if it satisfies **all** of these:

| Rule | Statement |
|---|---|
| E-1 | Evidence is the repository, Git, remote refs, CI, or a running deployment. Nothing else. |
| E-2 | **Conversation history is not evidence.** |
| E-3 | **A previous AI report is not evidence.** So are prior wave reports, `MERGE_REPORT.md`, `FEATURE_INVENTORY.md`, and every `*_QA_REPORT.md` in this repo — they are *claims to be verified*, never proof. |
| E-4 | **A branch name is not evidence.** `final`, `canonical`, `release`, `closure`, `sovereign`, `candidate` carry zero authority. |
| E-5 | Every answer records: ID · YES/NO/UNKNOWN · branch · **full 40-char SHA** · exact evidence · command used · interpretation. |
| E-6 | `UNKNOWN` is a valid, non-penalised answer. A guess dressed as YES is a charter violation (§2, §10). |
| E-7 | The presence of a UI does not prove a feature works (`AGENTS.md` §2). Trace the path to storage/DB. |
| E-8 | Green local gates do not imply green CI. CI must be read separately (`AGENTS.md` §4.0). |

---

## 2. Tier model

The previous register was a single undifferentiated list too large to execute upfront.
Verification is now tiered by **when the answer is actually needed**.

| Tier | Name | When executed | Authorization |
|---|---|---|---|
| **Tier 1** | **Ground verification** | **Now**, before any plan is frozen | Authorized (this instruction) |
| **Tier 2** | Task-attached verification | At the moment the owning PLAN task begins | Authorized by that task starting |
| **Tier 3** | Release-gate verification | Immediately before a release decision | Authorized by founder release go |

**Rule T-1:** No Tier-2 question may be executed early "while we're here". Early answers
rot, and a rotted YES is more dangerous than an open question.

**Rule T-2:** If a question cannot be answered in one short read-only pass, it is **not a
verification question — it is a task.** It moves to `PLAN.md` (see §5) rather than
masquerading as a quick yes/no.

---

## 3. TIER 1 — GROUND VERIFICATION (the only checks executed now)

**Purpose:** cross the boundary from *CLAIMED* project history to *VERIFIED* project
ground. Nothing else. These nine answer one question between them: *what, exactly, is the
real codebase, and is it green?*

**Exactly nine checks. No additions.**

### V-GROUND-01 — Is there a single, identifiable trunk?
Does the repository have one unambiguous default/trunk branch, and what is its full HEAD SHA?
*Method:* `git symbolic-ref refs/remotes/origin/HEAD`, `git rev-parse origin/<trunk>`, GitHub default-branch API.
*Answers:* YES if exactly one trunk is identifiable with a full SHA.

### V-GROUND-02 — Do competing ground candidates exist?
Do branches exist that present themselves as the real ground — names containing
`final`, `canonical`, `release`, `closure`, `sovereign`, `candidate`, `rc` — and are any
of them **not** reachable from the trunk?
*Method:* enumerate remote heads; `git merge-base --is-ancestor <candidate> origin/<trunk>` for each.
*Answers:* YES if competing candidates exist that are not merged into trunk.

### V-GROUND-03 — Does unique, unmerged work exist that would be lost?
For every candidate from V-GROUND-02, does it carry commits **not reachable from trunk**
that represent real work (not just merge/CI noise)?
*Method:* `git log --oneline origin/<trunk>..<candidate>`, `git diff --stat origin/<trunk>...<candidate>`.
*Answers:* YES if any candidate carries unique non-trivial work.

### V-GROUND-04 — Is the trunk internally consistent and complete?
At trunk HEAD: does the tree contain the declared build inputs (`package.json`,
lockfile, `src/`, CI workflows), is the lockfile in sync, and is the local checkout
identical to the remote ref (no divergence, no uncommitted state)?
*Method:* `git rev-parse HEAD` vs `git rev-parse origin/<trunk>`; `git status --porcelain`; file existence.
*Answers:* YES if the checkout is clean and identical to remote and all build inputs are present.

### V-GROUND-05 — Are the declared quality gates real and wired?
Do the four gates named by the charter (`typecheck`, `lint`, `build`, `test:gate`) exist
as runnable scripts at trunk HEAD, and does every script `test:gate` chains actually
resolve to a file that exists?
*Method:* read `package.json` scripts; resolve every `npm run test:*` in the `test:gate` chain to its `scripts/*.mjs` file.
*Answers:* YES only if all four exist **and** no member of the chain is a dangling reference.
*(Note: this verifies the gate is real and wired. It does not run it — running is Tier 3.)*

### V-GROUND-06 — Is there one unambiguous production deployment source?
Which branch deploys to production, is that stated in the repository (not just in a
conversation), and does exactly one production hosting configuration exist?
*Method:* read `wrangler.toml`, `vercel.json`, `site/_headers`, deploy workflows, `AGENTS.md` hosting appendix.
*Answers:* YES if one production source is identifiable from repository evidence.

### V-CI-01 — Does a real CI gate exist and does it actually gate?
Are CI workflows defined at trunk HEAD, and do they trigger on push/PR to the trunk
(rather than existing as dormant manual-only files)?
*Method:* read `.github/workflows/*.yml` triggers.
*Answers:* YES if a workflow runs automatically on push/PR affecting trunk.

### V-CI-02 — What is the actual CI status of the ground SHA?
For the exact trunk HEAD SHA, what is the conclusion of the latest CI run — and if red,
**which workflow, which job, which step, and at which commit did it first go red**
(`AGENTS.md` §4.0: red is named before it is passed over)?
*Method:* GitHub Actions API for runs on the trunk, filtered to the ground SHA.
*Answers:* YES = green on the ground SHA. NO = red. UNKNOWN = no run exists for that SHA.

### V-CI-03 — Is CI trustworthy, or is it masking?
Does the CI definition contain non-gating / `continue-on-error` / excluded steps that
would let a real failure pass as green, and are those exclusions **declared**?
*Method:* read workflow for `continue-on-error`, `if: always()`, missing steps vs the charter's declared gate.
*Answers:* YES = CI is trustworthy (exclusions absent or explicitly declared).
NO = undeclared masking exists.

### Tier-1 answers

**Executed 2026-08-18 under revision v0.9.1. Full evidence, commands and interpretations
are recorded in `STATE.md` §5, which is the authoritative record.**

| ID | Answer | One-line finding |
|---|---|---|
| V-GROUND-01 | **YES** | Trunk is `main` @ `cc60adfc0da0f893b101230269d4847d33490429`, confirmed from the GitHub API |
| V-GROUND-02 | **YES** | 14 candidates, **none merged**; 3 form a chain that strictly contains `main` |
| V-GROUND-03 | **YES** | +26,910 lines in `src/` unmerged on the chain tip, plus 6 branches outside it |
| V-GROUND-04 | **YES** | Trunk tree clean, complete, matches remote |
| V-GROUND-05 | **YES** | 4 gates present; 92-script chain; 0 undefined, 0 dangling |
| V-GROUND-06 | **NO** | Three conflicting production identities; no deploy pipeline in repo |
| V-CI-01 | **YES** | `ci.yml` gates every push and PR |
| V-CI-02 | **NO (red)** | Red 7 days / 3 commits; current red is step #13 artifact upload, steps 1–12 green |
| V-CI-03 | **YES** | Only declared exclusions; no undeclared masking |

**Ground:** `main` @ `cc60adfc0da0f893b101230269d4847d33490429` — **contested**.
**Confidence: MEDIUM.** Trunk identity HIGH; ground sufficiency LOW (unmerged superset chain).

---

## 4. TIER 2 — Task-attached verification (deferred by design)

Each question below is **owned by a PLAN task** and is answered **when that task begins**,
not before. Executing these now is a violation of Rule T-1.

| ID | Question | Owning PLAN task | Tier |
|---|---|---|---|
| V-ENT-01 | Does a Premium entitlement actually gate anything, end to end (purchase → entitlement → feature access)? | QIM-V1-ENT-001 | 2 |
| V-ENT-02 | Can entitlement state be forged or bypassed from the client alone? | QIM-V1-ENT-001 | 2 |
| V-ACC-01 | Does account creation, login, reset and delete work against the real backend? | QIM-V1-ACC-001 | 2 |
| V-ACC-02 | Is guest→account data migration lossless? | QIM-V1-ACC-001 | 2 |
| V-DATA-01 | Does a failed write ever present as success on any surface? | QIM-V1-DATA-001 | 2 |
| V-DATA-02 | Is corrupted local state recoverable without total data loss? | QIM-V1-DATA-001 | 2 |
| V-SYNC-01 | Is the sync flag's real state consistent with what the UI and site claim? | QIM-V1-SYNC-001 | 2 |
| V-SYNC-02 | Does sensitive health data stay behind its separate explicit consent? | QIM-V1-SYNC-001 | 2 |
| V-SEC-01 | Are there secrets, keys or tokens in the repository or in the built bundle? | QIM-V1-SEC-001 | 2 |
| V-SEC-02 | Do RLS policies actually deny cross-user reads on the real database? | QIM-V1-SEC-001 | 2 |
| V-SAFE-01 | Is the minors gate enforced on every entry path, not just the happy path? | QIM-V1-SAFE-001 | 2 |
| V-SAFE-02 | Are health/medical disclaimers present wherever a number could be read as advice? | QIM-V1-SAFE-001 | 2 |
| V-CLAIM-01..n | Per-claim truth verification (one per CLAIM_ID) | **QIM-V1-TRUTH-001** | 2 |
| V-OBS-01 | Does a production error actually arrive somewhere a human reads? | QIM-V1-REL-001 | 2 |
| V-OBS-02 | Does the support destination actually receive and answer a message? | QIM-V1-REL-001 | 2 |
| V-I18N-01 | Is every user-visible string present in both AR and EN, with RTL correct? | QIM-V1-UX-001 | 2 |
| V-A11Y-01 | Do focus, labels, touch targets and contrast meet AA on changed surfaces? | QIM-V1-UX-003 | 2 |
| V-IOS-01 | Does the iOS build launch on a physical device? *(only if horizon = B — DEC-014)* | QIM-V1-IOS-001 | 2 |
| V-REL-01 | Do all four gates pass green from a clean `npm ci` on the release SHA? | QIM-V1-REL-002 | 3 |
| V-REL-02 | Is CI green on the exact release SHA, with no undeclared exclusion? | QIM-V1-REL-002 | 3 |
| V-REL-03 | Are zero material FALSE claims outstanding in QIM-V1-TRUTH-001? | QIM-V1-REL-002 | 3 |

---

## 5. Promoted to PLAN — questions that were never verifications

Per Rule T-2, the following were framed as verification items but are **multi-step audits**.
Pretending they are quick yes/no checks is how a plan lies about its own size. They are now
tasks in `PLAN.md` and are **not** answerable in Tier 1.

| Was framed as | Reality | Now lives as |
|---|---|---|
| "Verify all product claims are true" | Full external-surface inventory + per-claim tracing | **QIM-V1-TRUTH-001** |
| "Verify the 79 branches" | Branch-by-branch ancestry and content audit | **QIM-V1-GOV-002** |
| "Verify no dead code remains" | Static + dynamic reference audit across ~23 candidate files | **QIM-V1-GOV-003** |
| "Verify the feature inventory is accurate" | Re-verification of every CLAIMED feature end to end | **QIM-V1-GOV-004** |
| "Verify observability" | Building it first, then verifying | **QIM-V1-REL-001** |
| "Verify the database schema is correct" | Schema + RLS + migration-state audit against a live project | **QIM-V1-SEC-001** |

---

## 6. Change log

| Rev | Change |
|---|---|
| v0.9 | Baseline referenced by the founder instruction. **Not present in this repository** — see Provenance Notice. |
| v0.9.1 | Split into Tier 1/2/3. Tier 1 fixed at the nine founder-named checks and defined. Tier 2 attached to owning tasks. Six pseudo-verifications promoted to PLAN tasks. Evidence rules E-1..E-8 made binding. |
