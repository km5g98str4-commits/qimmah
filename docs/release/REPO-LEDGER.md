# REPO LEDGER — Post-War Cleanup Map

**Generated:** 2026-07-18 · **Author:** repo-custodian (read-only) · **Branch:** `chore/repo-ledger`
**Base:** `git fetch origin --prune` · **Shipping branch:** `design/v21-promotion` @ `134c114`

> ⚠️ **This is a PLAN. ZERO deletions were executed.** Every destructive command below is
> **OWNER-GATED** — the owner runs them manually after reviewing this ledger.
> Repo code was **not touched**; the only change on this branch is this document.

---

## 🔴 SECTION 0 — STRANDED WORK (safety-critical, read first)

The mission rule: **nothing valuable may exist only on disk.** The whole Mac was swept —
both local clones and every `qimmah-*` directory. Result: **4 genuinely local-only commits**
and a set of uncommitted working-tree changes. None of it blocks the ship, but none of it
should be deleted before the owner decides.

### Repo topology (why the sweep was large)
There are **two independent local clones of the same origin**
(`github.com/km5g98str4-commits/gym-os-template.git`), plus ~30 older standalone clones:

| Clone root | Role | Worktrees | Notes |
|---|---|---|---|
| `/Users/ziyad/qimmah-deploy` | **Repo A** — primary checkout | 33 registered | current working repo; holds `design/v21-promotion`, `chore/repo-ledger`, minors |
| `/Users/ziyad/gym-os-template` | **Repo B** — second clone | main + 25 registered | parallel worktree fleet, same origin |
| `/Users/ziyad/qimmah-{mobile,p2,v2,fix,…}-*` | ~30 standalone June clones | own `.git` each | pre-v2 era, mostly clean |

### 🔴 Genuinely local-only COMMITS (not reachable from any origin ref)

| # | Clone / worktree | Branch | Commit | Subject | Assessment |
|---|---|---|---|---|---|
| 1 | Repo A `qimmah-deploy` | `feature/p25-steps-health` | `64702e0` (2026-06-30) | P2.5: exercise demos + day naming | **Active checkout.** 1 commit ahead of `origin/feature/p25-steps-health` (`dfa19ee`). Content likely already superseded by promotion, but the exact SHA is not on origin. Owner: confirm superseded, then discard branch or push. |
| 2 | Repo A `qimmah-minors-merge` | `merge/minors-promotion` | `b3e639e` (2026-07-18) | merge(promotion): fix/minors-maintenance-only | **Pending integration merge.** Parent `730df00` IS on origin (`fix/minors-maintenance-only`); only the *merge commit* is local. This is the un-pushed minors→promotion merge. Owner: push if this is the intended merge, else re-do on top of current promotion tip. |
| 3 | standalone `qimmah-merge` | `hotfix/replace-bad-muscle-map` | `af080a0` (2026-06-27) | Polish mobile QA routes copy and lint | Pre-v2 June work, object absent from shared origin. Almost certainly superseded. Owner: confirm, then clone is disposable. |
| 4 | standalone `qimmah-p25-a1` | `integration/phase2.5` | `06c1a98` (2026-06-30) | Merge P2.5 A1: 2 goals + split choice + nutrition Qs | Pre-v2 merge, absent from shared origin. Superseded by shipped P2.5. Owner: confirm, then disposable. |

> **False alarms cleared:** `qimmah-catalog`, `qimmah-design-workout`, `qimmah-docs` (8),
> `qimmah-integration-w3` (13), `qimmah-onboarding-async`, `qimmah-plates` all reported
> "ahead of upstream," but every one of those tip commits **is already on origin** under its
> own branch name — their local upstream tracking just points elsewhere. **Not stranded.**
> All three divergent `design/v21-promotion` local tips (`46e6ead`, `80e31f7`, `134c114`)
> are **all on origin** — no promotion commit is stranded.

### 🟠 Uncommitted working-tree changes (exist only on disk)
None block shipping; most are reproducible. Listed for honesty — **do not delete blindly.**

| Clone/worktree | Files | Value |
|---|---|---|
| Repo A `qimmah-deploy` | `M launch.json`, `M WeeklyMuscleMap.tsx`, `M foodItems.ts`, `?? src/data/bodyAnatomy.ts` | **Real in-progress source** (new `bodyAnatomy.ts` + muscle-map edits). Owner: commit or discard deliberately. |
| Repo B `gym-os-template` (main) | `M docs/product/P12_ASSETS.md`, `M src/data/machineImages.ts`, `?? AGENTS.md`, `?? claude-skills/`, `?? output/`, `?? phase3-review.patch` | Mixed: `machineImages.ts` + `AGENTS.md` may be real; `output/`, `.patch` are artifacts. |
| Repo A `qimmah-e2e` | `?? scripts/e2e-journey.mjs`, `?? test-artifacts/` | Possible real e2e harness + generated artifacts. |
| Repo B `qimmah-integration` | `M ios/…project.pbxproj`, `M Package.swift`, `?? …/swiftpm/` | Xcode/SPM build state — regenerable. |
| Repo A `qimmah-design-nutrition`, `qimmah-portability` | `*-preview.html`, `src/dev*Preview.tsx` | Dev-preview scaffolding — reproducible. |
| Repo A `qimmah-ci`, `qimmah-design-workout`, `qimmah-fixwave` | `scripts/.*proof.bundle.mjs` | Generated proof bundles — build artifacts. |
| Repo B `qimmah-assets` | `_debug-panel.png`, `_debug-nutrition.mjs` | Debug artifacts. |
| standalone `qimmah-docs-main`, `qimmah-p25-a1`, `qimmah-phase1-smart-foundation` | `*.applescript/.command`, `.claude/launch.json`, `docs/product/` | Local automation/config — low value. |

---

## 📋 SECTION 1 — BRANCH LEDGER (167 origin branches)

Containment verified with `git merge-base --is-ancestor <branch> 134c114` (never guessed).

| Verdict | Count | Meaning |
|---|---:|---|
| **MERGED-ARCHIVABLE** | 126 | tip is an ancestor of `design/v21-promotion` `134c114` → fully absorbed, safe to tag+archive |
| **ACTIVE** | 4 | keep live |
| **OWNER-DECISION** | 37 | NOT contained in promotion; owner decides salvage vs archive |

### ACTIVE (4) — do not archive
| Branch | Tip | Date | Role |
|---|---|---|---|
| `design/v21-promotion` | `134c114` | 2026-07-17 | **shipping branch** — feeds `main` at final ship |
| `main` | `e0a4144` | 2026-07-06 | release trunk; **behind** promotion (promotion → main pending) |
| `fix/minors-maintenance-only` | `730df00` | 2026-07-17 | under-18 maintenance goals; awaiting merge (see stranded #2) |
| `feat/v11-experience` | `7157c0f` | 2026-07-17 | v11 experience track, in flight |

### OWNER-DECISION (37) — not contained in promotion
**Recent (2026-07-12→17) — most likely to hold unmerged value; salvage-review first:**
`codex/v21-completion` (`98a4ff6`) · `fix/release-qa-offline-a11y` (`05e2c7d`) · `content/food-r2-gcc-eatingout` (`5c630b9`) · `docs/beta-ops` (`f893e5a`) · `design/v21-slice0-1` (`4827873`) · `design/v21-slice2` (`c3cbfbd`)

**Mid (2026-07-01→04) — small leftovers:**
`hotfix/p12-field-fixes-r2` (`4e17c67`) · `wip/p12-phase-d` (`14466e3`) · `claude/p12-install-guide` (`0660e26`) · `integration/phase3.1` (`09bff0f`) · `claude/p31-muscle-lib-8w7upl` (`3ee9331`) · `claude/off-integration-saudi-seed-fgzgc0` (`0a41050`)

**Pre-v2 June era (2026-06-27→30) — superseded by the v2 rebuild, almost certainly dead:**
`feature/mobile-app-shell-design` · `feature/mobile-plan-builder` · `feature/mobile-qa-product-polish` · `feature/nutrition-progress-health-mobile` · `feature/workout-library-exercise-detail` · `feature/phase1-training-engine` · `feature/phase2-exercises` · `feature/v2-food-database-foundation` · `feature/v2-nutrition-live-engine` · `feature/v2-product-cleanup-settings` · `feature/v2-training-plan-engine` · `feature/v2-workout-persistence-streak` · `fix/bodybuilding-ui-muscle-coverage` · `fix/foundation-auth-app-shell` · `fix/nutrition-inputs-validation` · `fix/product-foundation-auth-bb-ui` · `fix/qa-hardening-release-readiness` · `fix/workout-history-dashboard-binding` · `hotfix/replace-bad-muscle-map` · `integration/food-database-v2` · `research/v2-exercise-data-audit` · `research/v2-nutrition-data-audit` · `research/v2-post-merge-bug-hunt` · `research/v2-product-qa-checklist` · `research/v2-user-testing-script`

### MERGED-ARCHIVABLE (126)
All 126 are ancestors of `134c114` — every commit is already in the shipping branch, so
archiving loses nothing. Full list is derivable and regenerable with:

```bash
for b in $(git branch -r | grep -v HEAD | sed 's|^ *origin/||'); do
  git merge-base --is-ancestor "origin/$b" 134c114 2>/dev/null \
    && [ "$b" != main ] && [ "$b" != design/v21-promotion ] && echo "$b"
done
```
Spans: all `integration/phase*`, `integration/wave1-6`, `claude/*` phase agents,
`feature/phase*` + `feature/p*`, `feat/*` (insights, plates, portability, notifications,
observability, native), `design/v21-*` (workout, profile, nutrition, onboarding, momentum,
today), `content/*`, `docs/*` (runbooks, appstore, formula), `fix/*` (science, security,
media-rights, sync, account-isolation), `assets/*`, `ux/*`, `ios/*`, `infra/*`, `site/landing`,
`legal/*`, `audit/*`, `test/resilience-chaos`, `staging/prerelease`, `backup/qimmah-aa9d665`.

---

## 🧹 SECTION 2 — WORKTREE & CLONE INVENTORY

### Repo A (`qimmah-deploy`) — 33 registered worktrees
Clean except the 7 dirty listed in §0. `qimmah-consolidation` holds local branch
`consolidation/v21-work` @ `134c114` (= origin promotion, no unique commits; **local branch
name only**). `qimmah-minors-merge` holds stranded merge `b3e639e` (§0 #2).

### Repo B (`gym-os-template`) — main + 25 worktrees
**Every worktree tip is on origin** (zero stranded commits). Dirty: `gym-os-template` (main),
`qimmah-assets`, `qimmah-integration` — see §0. Local-only branch name `design/v21-on-wave1`
(`83c6ce0`, in `qimmah-design-port`) — tip is on origin, name is local; harmless.

### Standalone June clones (~30) — mostly clean
Only 4 have anything (§0 #3, #4 + 2 dirty). Non-git dirs: `qimmah-backups`, `qimmah-gifs`,
`qimmah-temp-password`, `qimmah-worktrees` (+ `qimmah-gifs.zip`, `qimmah-gifs.sh`).

---

## 🗄️ SECTION 3 — ARCHIVAL PLAN (OWNER-GATED — nothing run here)

> Run these **only after** confirming §0 stranded items are handled.
> Order matters: **tag before delete**, always.

### 3a — Archive-tag every MERGED-ARCHIVABLE branch, then delete
Generate + review the tag/delete pairs (dry run — prints commands, runs nothing):

```bash
# From /Users/ziyad/qimmah-deploy — PRINTS the plan, executes nothing:
for b in $(git branch -r | grep -v HEAD | sed 's|^ *origin/||'); do
  git merge-base --is-ancestor "origin/$b" 134c114 2>/dev/null || continue
  [ "$b" = main ] && continue
  [ "$b" = design/v21-promotion ] && continue
  echo "git tag archive/$b origin/$b && git push origin archive/$b && git push origin --delete $b"
done > /tmp/archive-plan.sh
less /tmp/archive-plan.sh     # review
# bash /tmp/archive-plan.sh   # ← OWNER runs this line only when satisfied
```

Each line is the copy-paste pair, e.g.:
```bash
git tag archive/integration/phase2 origin/integration/phase2 && git push origin archive/integration/phase2 && git push origin --delete integration/phase2
```

### 3b — OWNER-DECISION branches: salvage-review, do NOT auto-delete
Leave all 37 until reviewed. For the recent 6 (codex/v21-completion, release-qa-offline-a11y,
food-r2, beta-ops, slice0-1, slice2), diff against promotion first:
```bash
git log --oneline 134c114..origin/<branch>   # what's unique on the branch
```
Archive-tag only after confirming nothing is worth merging.

### 3c — Stale worktree removal (after their §0 items are cleared)
```bash
# Repo A: remove worktrees whose branch is archived (example)
git -C /Users/ziyad/qimmah-deploy worktree remove /Users/ziyad/qimmah-<name>
# Repo B:
git -C /Users/ziyad/gym-os-template worktree remove /Users/ziyad/qimmah-<name>
git -C /Users/ziyad/gym-os-template worktree prune
# Standalone June clones are plain dirs — after confirming §0 #3/#4 superseded:
#   rm -rf /Users/ziyad/qimmah-<june-clone>   ← OWNER-GATED, irreversible
```
**Do NOT remove** `qimmah-deploy`, `qimmah-ledger`, `qimmah-promotion`, `qimmah-minors*`,
`qimmah-v11`, or `gym-os-template` — active or holders of stranded work.

---

## 🗺️ SECTION 4 — ONE-GLANCE MAP

```
                        origin/design/v21-promotion  @ 134c114   ← SHIPPING (software-complete)
                                     │ (strictly ahead of main)
   feeds ── final ship ──▶  origin/main  @ e0a4144               ← release trunk (promotion → main pending)

   WAITS ON promotion (ACTIVE, not yet merged):
     ├─ fix/minors-maintenance-only  @ 730df00   (+ local merge b3e639e un-pushed)
     └─ feat/v11-experience          @ 7157c0f

   ABSORBED into promotion → 126 MERGED-ARCHIVABLE branches (tag archive/* + delete, §3a)
   OUTSIDE promotion       →  37 OWNER-DECISION branches (salvage-review, §3b)
                                 └─ 6 recent may hold value; 25 June-era superseded; codex/v21-completion

   STRANDED ON DISK (§0): 4 local-only commits + 7-clone working-tree dirt — owner clears first
```

**Bottom line:** the ship is safe on `design/v21-promotion`. Nothing valuable is lost —
but 4 local-only commits and a handful of uncommitted files exist **only on this Mac**;
resolve those (§0) before running any §3 deletion. All deletion is owner-gated.
