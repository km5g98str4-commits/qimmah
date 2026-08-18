# VERIFY — سجلّ التحقّق

**Version:** v1.0-rc · **Status:** AWAITING_FOUNDER_REVIEW
**Verified on:** 2026-08-18 · **Verifier branch:** `claude/control-files-tier1-verification-oibji7` @ `cc60adfc0da0f893b101230269d4847d33490429`

## Evidence hierarchy

1. Repository content at an exact SHA
2. Git ancestry / content comparison
3. Remote refs
4. CI at an exact SHA
5. Historical reports — **leads only, never verification**

Conversation claims are not evidence. Branch names containing `final`, `canonical`, `release`, `closure`, `rc`, `production` carry **zero** evidentiary weight on their own.

## Tier structure

- **TIER 1 — ground.** Exactly the nine questions below. Answerable from repo/ancestry/CI, no broad investigation.
- **TIER 2+ — everything deeper.** Belongs **beside the PLAN task that requires it**, not in an upfront audit. A verification item needing broad investigation is a PLAN task, not a Tier-1 question.

There is deliberately **no 100-question upfront audit**.

---

# TIER 1

## V-GROUND-01 — Does local `main` equal `origin/main`?

**Answer: YES**

| | |
|---|---|
| Branch | `main` / `origin/main` |
| local `main` | `cc60adfc0da0f893b101230269d4847d33490429` |
| `origin/main` | `cc60adfc0da0f893b101230269d4847d33490429` |

```
git rev-parse refs/heads/main refs/remotes/origin/main
```
Both resolve to the identical 40-char SHA, after `git fetch --prune origin '+refs/heads/*:refs/remotes/origin/*'`.

**Interpretation:** no local drift on `main`. Nothing on `main` is unpushed.

---

## V-GROUND-02 — Is the verification working tree clean?

**Answer: YES** (captured **before** any governance-file change)

| | |
|---|---|
| Branch | `claude/control-files-tier1-verification-oibji7` |
| HEAD | `cc60adfcc…` → full: `cc60adfc0da0f893b101230269d4847d33490429` |

```
git status --short                              -> (no output)
git status --porcelain=v1 --untracked-files=all  | wc -l -> 0
git stash list | wc -l                           -> 0
```

**Interpretation:** clean, including untracked files. **Nothing was stashed, reset, or discarded to obtain this answer** — the tree was already clean. The branch was, at capture time, identical to `main` (0 ahead / 0 behind).

---

## V-GROUND-03 — Is `main` the most advanced product candidate?

**Answer: NO** — a later product frontier exists.

| | |
|---|---|
| `main` | `cc60adfc0da0f893b101230269d4847d33490429` (63 commits total) |
| **Frontier** | `origin/claude/qimmah-recovery-control-plane-hph1jg` = `dc031fa36929e07c3b00fa025a676ed64327ce59` (292 commits) |
| Ancestry | 229 ahead of `main`, **0 behind** — contains `main` entirely |

Method — containment, not commit count, over all 81 remote refs:

```
git for-each-ref refs/remotes/origin | while read r; do
  git rev-list --left-right --count main...$r ; done
git merge-base --is-ancestor <A> <B>     # pairwise containment
```

19 refs are strict descendants of `main`. Among the top candidates the containment relation is a **total order**:

```
codex/qimmah-sovereign-overnight-rc-001        (141 ahead)
  ⊂ claude/qimmah-today-home-redesign-2q1wdk   (143)
  ⊂ codex/qimmah-founder-qa-candidate-001      (154)
  ⊂ codex/qimmah-canonical-launch-candidate-001(156)
  ⊂ { s/catalog-jointloads (157), s/food-search (158) }
  ⊂ codex/qimmah-sovereign-closure-001         (228)  = 139a7b00d154e1950e5970ed86d2fe6165dba5c6
  ⊂ claude/qimmah-recovery-control-plane-hph1jg(229)  = dc031fa…   ← unique maximum
```

Content, not just count: `git diff --stat main..dc031fa` → **650 files, +98,622 / −3,474**, spanning `src/lib` (75), `src/components` (25), `src/i18n` (25), `src/views` (24), `supabase` (23), `src/admin` (17). This is real product surface, not documentation only.

**Interpretation:** `main` is a **production pointer**, not the development frontier. `dc031fa` is the unique maximal candidate by containment — a name-independent test.

---

## V-GROUND-04 — Unique product work not in `main` and not obviously superseded?

**Answer: YES** — but materially less than the raw counts suggest.

**Structural finding first.** The repository holds **two disjoint histories**:

| Lineage | Root(s) | Size | Refs |
|---|---|---|---|
| Legacy | `bc59adb30633ed8ec545d2045f73857a0f5d928a` | 630 commits | **51 refs** — all 8 open PRs, `design/v21-*`, `feature/*`, `research/*` |
| Current | `d6421789f46be58d0d6a1145c24961cf67545d86` + `b7d93c1c25e87482f694bc821a2efe0d92cba259` | 63 commits | **30 refs** — `main` and its descendants |

`git merge-base main origin/e/personalization-guardrail-r2` → **exit 1, no common ancestor.** So "632 ahead / 63 behind" was never a divergence measurement — it is the size of two unrelated sets.

**Content-level supersession check** (files present on the legacy lineage, absent at `dc031fa`):

| Module | Verdict | Evidence |
|---|---|---|
| `src/lib/analytics/*` (6 files: consent, events, milestones, provider, http/console providers) | **Deliberately removed — superseded** | `scripts/run-analytics-proof.mjs:169` asserts by name: `'طبقة lib/analytics القادرة على الإرسال محذوفة بالكامل'` → `!existsSync('src/lib/analytics')`. Wired into `test:gate`. Replaced by network-free `src/lib/tracking/*` (4 files). |
| `NotificationSettingsPanel.tsx` | Superseded | `dc031fa` carries 11 `src/lib/notifications/*` files + `NotificationsSettingsV2.tsx` |
| `gccEatingOut.ts` | Superseded | `dc031fa` carries `foodR2EatingOut.ts`, `gccStaples.ts`, `saudiFoods.ts` |
| `WeeklyMuscleMap.tsx`, `muscleLibraryMap.ts` | Superseded | `dc031fa` carries the `src/lib/body3d/*` engine + `MuscleMap`/`FlatMuscleBody` |
| `src/data/dailyPhrases.ts`, `src/i18n/dict/eSettings.ts` | **Residual — no exact counterpart found** | Low materiality (content/dictionary). Assigned to `QIM-V1-GROUND-002`. |

Two same-lineage refs also carried apparent unique work; **both were disproved**:

- `origin/ci/artifact-quota-nonblocking` @ `9e679c37b200f082501cb6eabcf286f7cae5c9cf` — its 1 commit ([CTO-87]) is already present at `dc031fa`: `diff` of both `.github/workflows/ci.yml` → **IDENTICAL**.
- `origin/codex/qimmah-final-release-convergence-001` @ `df10b88f5b91f4d1674fc75f922f2ac9c29f8def` — 4 unique commits; `src/lib/workoutDayLabel.ts` at `dc031fa` **names the transfer in-source**: "منقول من `codex/qimmah-final-release-convergence-001` — المعرفة وحدها دون بقيّة الالتزام، فهي متجاوَزة".

**Interpretation:** the material risk is **not** lost code — it is that 8 open PRs sit on a lineage that cannot reach `main`. This is risk discovery. **No merge is authorized by this answer.**

---

## V-GROUND-05 — Local work not durable on origin?

**Answer: NO for this machine — with an explicit scope limit.**

| Location inspected | Result |
|---|---|
| `git worktree list` | exactly one: `/home/user/qimmah` @ `cc60adf` |
| `find / -xdev -maxdepth 6 -name .git -type d` | `/home/user/qimmah/.git` only (others: `/opt/rbenv`, `/opt/nvm` — tooling) |
| `find / -xdev -maxdepth 5 -iname '*qimmah*' -type d` | one clone; the rest are Claude cache/scratch paths |
| `git status --untracked-files=all` | 0 entries |
| `git stash list` | 0 entries |

**Nothing was modified.**

**Scope limit — read this before trusting the NO.** This session runs in an **ephemeral cloud container** cloned fresh at session start. It is **not** the founder's machine. The answer is `NO` for the surface that is *accessible from this machine*, which is what the question bounds. Any clone or worktree on the founder's own hardware is **outside reach and unverifiable from here** — see `FA-004`.

---

## V-GROUND-06 — Can one canonical ground be proposed without merging?

**Answer: YES**

```
PROPOSED_CANONICAL_GROUND_BRANCH = claude/qimmah-recovery-control-plane-hph1jg
PROPOSED_CANONICAL_GROUND_SHA    = dc031fa36929e07c3b00fa025a676ed64327ce59
GROUND_CONFIDENCE                = MEDIUM
```

Why this candidate, in evidence order:

1. **Containment, not naming.** Unique maximum of the containment lattice over all 81 refs; contains `main` with behind = 0 — no `main` fix can be lost by adopting it.
2. **Real product mass.** 650 files / +98,622 lines vs `main`, across `src/lib`, `src/views`, `src/components`, `supabase`, `src/admin`.
3. **Green at that exact SHA.** CI run **#423** (`32174357740`) → `success` on `dc031fa`. Not transferred from any other SHA.
4. **Absorbs its rivals demonstrably** — see V-GROUND-04; both apparent exceptions were disproved at content level.

**This is a PROPOSAL. It has not been merged and must not be merged before founder approval (DEC-001).**

> ### ⚠ Late finding — the branch moved *during* this verification
>
> A re-fetch at the end of the pass returned `dc031fa..8e83963`. The branch tip is now
> **`8e83963b7d653d6bfb19c00c614ca3a694e65d7d`** (5 commits beyond `codex/qimmah-sovereign-closure-001`, was 1).
> Another session is **actively writing to this line right now.**
>
> - **The proposal stays pinned to `dc031fa36929e07c3b00fa025a676ed64327ce59`** — the only SHA on this line with a
>   completed, green CI run. Per the evidence rules, a PASS is never transferred to another SHA.
> - **`8e83963` is UNVERIFIED**: `list_workflow_runs` for this branch returns `total_count: 1` — run #423 on `dc031fa`.
>   The new tip has no completed run.
> - Consequence: **the founder must adopt a SHA, not a branch name.** A branch name on this line does not denote a
>   fixed object today. See `FA-007`.

---

## V-CI-01 — Current CI status of `main`

**Answer: RED — infrastructure only.**

| | |
|---|---|
| Workflow | `CI` (`.github/workflows/ci.yml`), job `Quality gate (typecheck · lint · build · proofs)` |
| Run | **#339**, id `31478324999`, job id `93737207118` |
| SHA | `cc60adfc0da0f893b101230269d4847d33490429` |
| Status | `completed` / **`failure`** |
| Failing step | **step 13 — `Upload dist artifact`** (the last step) |

Red history on `main`: first red `695e649cbfcd4b703b21ca97f2c3c62a5a925a5f` (#330, 2026-08-10) → `b2514eeb2c3df150e83ce2c7dbad7dc6456fa7d1` (#333) → `cc60adf` (#339). Last green: `dd79a60f193b1163ab1ec549a35458e0d2aab1de` (#316, 2026-08-04).

**Steps 1–12 all `success`**, including Typecheck, Lint, Production build, `test:food-db`, `test:gate`, and the Onboarding browser E2E. Infrastructure failure and product-test failure are **not** collapsed here — see V-CI-02.

---

## V-CI-02 — Classification of the red

**Answer: `INFRASTRUCTURE`**

Re-verified this session against the live API — not carried over from any earlier response.

Exact failing step: **`Upload dist artifact`** (step 13 of 13). Log, job `93737207118`:

```
With the provided path, there will be 405 files uploaded
Artifact name is valid!
Root directory input is valid!
##[error]Failed to CreateArtifact: Artifact storage quota has been hit.
Unable to upload any new artifacts. Usage is recalculated every 6-12 hours.
```

Why `INFRASTRUCTURE` and not `MIXED`:

- Every quality-bearing step (5–12) concluded `success` on this exact SHA.
- The failure is account-level GitHub **storage quota**, not repository content.
- The artifact is build *evidence*, not a release input: no `download-artifact` step exists, and deployment runs through Cloudflare Pages' Git integration.

**Masking note (charter §4.0):** because the failure is the *last* step, it masks nothing behind it. It does, however, make `main` read red to every future agent and to branch protection. The fix already exists — `[CTO-87]` marks the upload `continue-on-error: true` — and is **already present** at `dc031fa`; `main` simply does not carry it yet.

---

## V-CI-03 — Gates defined at the proposed SHA, and their evidence state

Proposed SHA: **`dc031fa36929e07c3b00fa025a676ed64327ce59`**. No test was modified. No PASS is transferred from another SHA — every PASS below comes from CI run **#423** (`32174357740`) executed on this exact SHA.

| Gate | Defined? | Definition at this SHA | State |
|---|---|---|---|
| typecheck | **DEFINED** | `npx tsc -b --noEmit` (ci.yml step 5; `package.json` `typecheck`) | **PASS** |
| lint | **DEFINED** | `npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` (step 6) | **PASS** |
| production build | **DEFINED** | `npx tsc -b && npx vite build` (step 7) | **PASS** |
| `test:gate` | **DEFINED** | `package.json:80` — ~140 chained proofs | **PASS** |
| browser/E2E | **DEFINED** | `npm run test:e2e:onboarding` on Playwright Chromium (steps 11–12) | **PASS** |
| food-db proof | **DEFINED** | `npm run test:food-db` (step 9) | **PASS** |
| perf budget | **DEFINED, non-gating** | `node scripts/check-perf-budget.mjs`, `continue-on-error: true` (step 8) | **PASS** (advisory) |
| artifact upload | **DEFINED, non-gating** | `continue-on-error: true` per `[CTO-87]` (step 13) | **PASS** |

Run #423 conclusion: **`success`**, 2026-08-18T19:02:16Z → 19:09:05Z.

**These states belong to `dc031fa` alone.** The branch has since advanced to `8e83963b7d653d6bfb19c00c614ca3a694e65d7d`,
for which **no completed CI run exists**. Every gate at `8e83963` is therefore `NOT_RUN`/`UNKNOWN`, and none of the
PASSes above may be read across to it.

**Caveat carried forward, not resolved here.** "Defined and passing" is not "meaningfully guarding". The commit message at `dc031fa` itself alleges three hollow guards (`test:onboarding-questions`, `run-food-longtail-proof`, and a coach guard said to have no runner). I attempted reproduction: `test:coaching` **is** wired (`node scripts/coaching/run-coaching-proof.mjs`), so the runner-less claim did **not** reproduce as stated, and my orphan-script scan was too noisy to be decisive (many `.ts` files are sources of their `.mjs` runners). **Recorded as a lead, not a finding** → Tier 2, `QIM-V1-GATE-001`.

---

# TIER 2 — opened by PLAN tasks only

| ID | Question | Owning PLAN task |
|---|---|---|
| V2-CLAIMS-01 | Every material external promise vs real behavior | `QIM-V1-TRUTH-001` |
| V2-GATE-01 | Do the ~140 proofs guard live surfaces, or do any pass vacuously? | `QIM-V1-GATE-001` |
| V2-GROUND-01 | Residual legacy-lineage content worth carrying forward | `QIM-V1-GROUND-002` |
| V2-OBS-01 | Production error capture, reference IDs, support path, no secret leakage | `QIM-V1-OBS-001` |
