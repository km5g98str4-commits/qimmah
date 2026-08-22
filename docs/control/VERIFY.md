> # ⛔ SUPERSEDED — NOT THE CANONICAL CONTROL PLANE
>
> **The canonical control plane is [`docs/execution/qimmah-master/`](../execution/qimmah-master/README.md).
> Start there. This file is retained as an evidence archive only.**
>
> Why: two control planes is the same failure mode as two nutrition screens — a future agent
> reads the wrong owner and acts on stale truth. GOV-003 selected `qimmah-master/` as canonical
> (more complete, cold-start usable, decision-owning, and it lives with the ground).
>
> **What of this file survived, and where it went:**
> - the verified ground + preservation refs → [`00-GROUND.md`](../execution/qimmah-master/00-GROUND.md)
> - founder decisions → [`01-DECISIONS.md`](../execution/qimmah-master/01-DECISIONS.md)
> - founder actions → [`10-FOUNDER-ACTIONS.md`](../execution/qimmah-master/10-FOUNDER-ACTIONS.md)
> - the GOV-002 forensics remain here, unmoved and still valid, in
>   [`GOV-002-FINDINGS.md`](./GOV-002-FINDINGS.md) and [`evidence/`](./evidence/).
>
> **One correction this file got wrong:** it raised `DEC-015` (entitlement posture) as
> `PENDING_FOUNDER`. It was already **LOCKED** — by charter §0.1 and
> `01-DECISIONS.md:153-183`. Do not reopen it from this file.

# VERIFY.md — Qimmah Verification Register

**Revision:** v1.0-rc
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

## TIER1_SCHEMA_CHECK — plan-update: TIER1-SCHEMA-CORRECTION

Each Tier-1 ID re-read against its **literal definition** in `VERIFY.md` §3, and the
previous answer audited for whether it actually answered *that* question.

| ID | Verdict |
|---|---|
| V-GROUND-01 | **MATCH** |
| V-GROUND-02 | **PARTIAL** — answer right, enumeration method wrong |
| V-GROUND-03 | **PARTIAL** — "real work vs noise" was never adjudicated |
| V-GROUND-04 | **PARTIAL** — two of three clauses unverified |
| V-GROUND-05 | **MATCH** |
| V-GROUND-06 | **MATCH** |
| V-CI-01 | **MATCH** |
| V-CI-02 | **MATCH** |
| V-CI-03 | **PARTIAL** — exclusion set never enumerated |

---

### V-GROUND-01 — MATCH
- **Literal question:** one unambiguous default/trunk branch + its full HEAD SHA?
- **Previous answer:** YES — `main` @ `cc60adfc0da0f893b101230269d4847d33490429`
- **Actually answered it?** MATCH.
- **Corrected answer:** unchanged (YES).
- **Evidence:** GitHub repo object `"default_branch":"main"`; `git rev-parse origin/main`.

### V-GROUND-02 — PARTIAL → corrected
- **Literal question:** do branches exist that *present themselves as the real ground* — names containing final/canonical/release/closure/sovereign/candidate/rc — and are any not reachable from the trunk?
- **Previous answer:** YES, 14 candidates, none merged.
- **Actually answered it?** **PARTIAL.** The answer is right and the 14 are real. But the **candidate universe was built by name matching** — which silently contradicts this register's own rule E-4 ("a branch name is not evidence"). Using names as the *filter* grants names exactly the authority E-4 denies them.
- **What it missed:** `claude/qimmah-recovery-control-plane-hph1jg` @ `dc031fa36929e07c3b00fa025a676ed64327ce59` — matches none of those name patterns, yet is the **actual tip** of the superset chain (+229 over main, contains `139a7b0` plus one commit) and its CI is **green**. The name-based filter missed the winner.
- **Corrected answer:** **YES** — candidate universe re-derived by **ancestry and content over all 81 remote heads**, not by name. Corrected count: **58 branches carry patch-unique commits**; **22** are fully contained in the candidate.
- **Evidence:** `git ls-remote --heads origin` (81) → per-branch `git merge-base --is-ancestor` + `git cherry`; ledger at `docs/control/evidence/gov002-branch-ledger.txt`.

### V-GROUND-03 — PARTIAL → corrected
- **Literal question:** do candidates carry commits not reachable from trunk that **represent real work (not just merge/CI noise)**?
- **Previous answer:** YES — with the explicit admission "value unassessed".
- **Actually answered it?** **PARTIAL.** The definition requires distinguishing real work from noise; the previous pass measured **volume only** (commit counts, +26,910 lines) and declined the distinction. Volume is not the question asked.
- **Corrected answer:** **YES, but far narrower than the raw counts implied.** Adjudicated by patch-id and file-level containment:
  - Raw `git cherry` over-reports: rebased/squashed/conflict-resolved commits get new patch-ids, so pre-July branches show hundreds of "unique" commits whose content is long absorbed.
  - **The 82 `public/exercise-gifs/*.gif` on `hotfix/p12-field-fixes-r2` are not lost value — they are watermarked proprietary WorkoutX assets deliberately deleted** for licensing (`src/data/exerciseGifs.ts:1-8`), with `test:media-rights` guarding it inside the gate. Classification: **DANGEROUS_TO_ADOPT**, not UNIQUE_VALUABLE.
  - Genuinely unique and valuable: the **QAE engine** (232 files, `QimmahAdaptiveEngine/`, absent from main and candidate alike) and a small number of commerce/nutrition commits.
- **Evidence:** `git cherry`, file-set `comm` against the candidate tree, `git show <sha>:src/data/exerciseGifs.ts`.

### V-GROUND-04 — PARTIAL → corrected
- **Literal question:** three clauses — (a) tree contains declared build inputs, (b) **lockfile is in sync**, (c) **local checkout identical to the remote ref**.
- **Previous answer:** YES.
- **Actually answered it?** **PARTIAL.** Only clause (a) was actually verified.
  - (b) "lockfile in sync" was answered by reading `name` and `lockfileVersion` — that is a *format* check, not a sync check. Sync is only provable by `npm ci`, which was not run.
  - (c) was **false at execution time**: `HEAD` was `80cf1554…` (this revision's own docs commit), not `cc60adf`. It was disclosed in a note but the clause was still scored YES.
- **Corrected answer:** **PARTIAL/YES-with-exceptions.** (a) YES. (b) **UNVERIFIED** — deferred to Tier 3 `V-REL-01`, which runs `npm ci`. (c) YES for the *remote ref* `origin/main`, which is what all verification actually ran against; the working checkout was one docs-only commit ahead.
- **Evidence:** `git status --porcelain` → 0; `git rev-parse HEAD origin/main` → differing at the time.

### V-GROUND-05 — MATCH
- **Literal question:** do the four gates exist as runnable scripts, and does every script `test:gate` chains resolve to a file that exists?
- **Previous answer:** YES — 92-script chain, 0 undefined, 0 dangling.
- **Actually answered it?** MATCH. The question asks about **dangling invocations** (a chain entry with no file). It does *not* ask about **orphan scripts** (a file no chain invokes) — that is `VERIFY.md` Tier 2 / GOV-002 §7 territory, and is reported there.
- **Corrected answer:** unchanged (YES) for main. On the candidate the chain is larger and re-measured under GOV-002 §7.

### V-GROUND-06 — MATCH
- **Literal question:** which branch deploys to production, is it stated in the repository, and does exactly one production hosting configuration exist?
- **Previous answer:** NO.
- **Actually answered it?** MATCH.
- **Corrected answer:** unchanged (**NO**), and re-confirmed on the candidate: `wrangler.toml` **and** `vercel.json` both still present at `dc031fa`, still no deploy workflow.

### V-CI-01 — MATCH
- **Literal question:** are workflows defined and do they trigger on push/PR to the trunk?
- **Previous answer:** YES. **MATCH.** Unchanged.

### V-CI-02 — MATCH
- **Literal question:** conclusion of the latest CI run for the exact trunk HEAD SHA; if red, name workflow/job/step and the first red commit.
- **Previous answer:** NO (red) — CI · Quality gate · step #13 `Upload dist artifact`; first red `695e649`; last green `dd79a60`.
- **Actually answered it?** MATCH — all required naming was supplied.
- **Corrected answer:** unchanged (**NO/red**) for `main`. New adjacent fact, not a correction: the **candidate** `dc031fa` is **green** (run `32174357740`, 2026-08-18T19:09:05Z).

### V-CI-03 — PARTIAL → corrected
- **Literal question:** does the CI definition contain non-gating / `continue-on-error` / **excluded** steps that would let a real failure pass as green, and are those exclusions **declared**?
- **Previous answer:** YES (trustworthy).
- **Actually answered it?** **PARTIAL.** The `continue-on-error` half was properly checked. The **"excluded steps"** half was not: only two named exclusions (`test:safe-storage`, `test:body-model`) were checked, chosen because a document mentioned them. The full set of defined-but-unrun scripts was never enumerated — so "no undeclared exclusion" was asserted over an unmeasured set.
- **Corrected answer:** see GOV-002 §7. The exclusion set is now enumerated on the candidate, and the corrected verdict is recorded there rather than restated here.
- **Evidence:** previous pass ran only `grep -n "continue-on-error\|if: always\|if: success"` plus a two-name spot check.


### Corrected Tier-1 answers (v1.0-rc)

| ID | v0.9.1 | Corrected | Note |
|---|---|---|---|
| V-GROUND-01 | YES | **YES** | unchanged |
| V-GROUND-02 | YES | **YES** | universe re-derived by ancestry over all 81 heads, not by name |
| V-GROUND-03 | YES | **YES, narrower** | patch-id over-reports; GIFs are legal risk not lost value |
| V-GROUND-04 | YES | **YES, partial** | lockfile sync still UNVERIFIED (needs `npm ci` — Tier 3) |
| V-GROUND-05 | YES | **YES** | 92 steps on `main`, 140 on the ground, 0 dangling on both |
| V-GROUND-06 | NO | **NO** | re-confirmed on the ground; both hosting configs still present |
| V-CI-01 | YES | **YES** | unchanged |
| V-CI-02 | NO (red) | **NO for `main`; YES for the ground** | ground run `32174357740` green — but see V-CI-03 |
| V-CI-03 | YES | **NO** | **corrected.** 44 gate exclusions, ~37 undeclared; and the artifact step was made non-gating on the ground (declared, `[CTO-87]`), so the two SHAs' "green" are not step-for-step comparable |

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
