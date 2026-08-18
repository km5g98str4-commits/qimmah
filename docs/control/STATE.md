# STATE.md — Qimmah Project State

**Revision:** v1.0-rc
**Status:** PLANNING + VERIFICATION MODE.
**Purpose:** the single record of what is **VERIFIED** versus what is merely **CLAIMED**.

---

## ⚠️ PROVENANCE NOTICE

No predecessor `STATE.md` exists in this repository (`VERIFY.md` §Provenance). This file
is new. Everything in it is either evidence gathered under this revision, or explicitly
labelled as CLAIMED.

---

## 0. COLD-START — read this first

If you are a new session with no prior context, this section is sufficient to continue.

| Fact | Value |
|---|---|
| **Production pointer** | `main` @ `cc60adfc0da0f893b101230269d4847d33490429` (CI **red**, artifact step) |
| **Proposed canonical ground** | `claude/qimmah-recovery-control-plane-hph1jg` @ `dc031fa36929e07c3b00fa025a676ed64327ce59` (CI **green**, run `32174357740`) |
| **Relationship** | `main` is a **strict ancestor** of the ground — 0 commits behind, +229 ahead |
| **Ground status** | `CANONICAL_GROUND_REQUIRES_COMPOSITION` — **awaiting founder approval**, not adopted |
| **Mode** | PLANNING + VERIFICATION. No implementation authorized. |
| **Plan version** | v1.0-rc — **not frozen** |

**`main` is the production pointer, not the development frontier.** Treating it as the frontier
is the mistake this exercise exists to end.

**Where the evidence lives:** `docs/control/GOV-002-FINDINGS.md` (full forensics),
`docs/control/evidence/` (reproducible ledgers and commands), `docs/control/VERIFY.md`
(check definitions + Tier-1 answers + schema corrections), `docs/control/DECISIONS.md`
(open founder decisions), `docs/control/PLAN.md` (tasks, cut list, changelog).

**Do not** merge, deploy, apply migrations, delete branches, or start product work without an
explicit founder instruction naming the action.

---

## 1. The CLAIMED / VERIFIED boundary

| Class | Meaning | Usable as a basis for work? |
|---|---|---|
| **VERIFIED** | Established under `VERIFY.md` evidence rules E-1..E-8, with a full SHA and a reproducible command | Yes |
| **CLAIMED** | Asserted by a document, a report, a branch name, or a conversation | **No** |

**Everything in this repository's ~40 root and `docs/` report files is CLAIMED** until
re-verified. This includes `MERGE_REPORT.md`, `FEATURE_INVENTORY.md`, `CODE_REVIEW.md`,
`BRANCH_AUDIT.md`, `E2E_GATE_REPORT.md`, `PREVIEW-CHECKLIST.md`, every `PHASE*_QA_REPORT.md`,
and `AGENTS.md` §11 "الحالة الجارية". Their age and authorship are unverified.

This is not a judgement about their accuracy. It is a statement that their accuracy is
**unknown**, which is the condition this control set exists to end.

---

## 2. VERIFIED GROUND

> Populated by Tier-1 execution. See `VERIFY.md` §3 for the check definitions.

*(Recorded at the end of this file, §5, under this revision's execution.)*

---

## 3. FOUNDER ACTIONS

**This section is distinct from Founder Decisions (`DECISIONS.md`).**

- A **Founder Decision** is a *choice* only the founder may make.
- A **Founder Action** is an *operation* only the founder can perform or authorize —
  typically because it requires a credential, an identity, a legal capacity, or an
  irreversible production effect that no agent holds or may hold.

**Rule A-1:** An agent may **prepare** a Founder Action (write the migration, draft the
copy, stage the config) but may **never execute** one.
**Rule A-2:** A blocked PLAN task stays blocked. It is not routed around.
**Rule A-3:** Every action below is included **only** on verified repository evidence that
the project actually requires it. Actions considered and excluded are listed in §3.1.

| ACTION_ID | Action | Why the founder is required | Blocks | When required | Status |
|---|---|---|---|---|---|
| **ACT-001** | **Salla commercial verification** — confirm the Salla store is live, commercially verified, and that `https://salla.sa/Qimmahsa` resolves to the correct, purchasable product | Commercial/legal identity of the merchant. No agent can hold or verify a merchant account. | ENT-001, TRUTH-001 (subscription duration, trial, Premium claims) | Before any Premium or purchase claim is verified | ⬜ NOT STARTED |
| **ACT-002** | **Production secrets provisioning** — set real values for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_*`, `WORKOUTX_API_KEY` in the platform panel (never the repo) | Secrets must never reach an agent or the repository (`.claude/rules/security.md`) | REL-002, SEC-001 | Before production deploy | ⬜ NOT STARTED |
| **ACT-003** | **Production database migration authorization** — authorize applying `supabase/migrations/*` (12 files) to the live project | Irreversible effect on live user data. Charter §1: founder-only, named authorization each time. | ACC-001, SEC-001, REL-002 | Before production launch | ⬜ NOT STARTED |
| **ACT-004** | **Supabase production project action** — confirm which project is production, its auth settings, and its RLS enforcement state | Requires console access no agent holds | ACC-001, SEC-001 | Before ACC-001 verification | ⬜ NOT STARTED |
| **ACT-005** | **DNS / domain action for `qimmah.app`** — the site declares `https://qimmah.app/` canonical across `index/privacy/terms/press/support`, while the deployed production URL is `qimmah-8qp.pages.dev`. The domain must be owned, pointed, and TLS-valid — or the canonical URLs corrected. | Domain registrar and DNS control | TRUTH-001, REL-002 | Before public launch | ⬜ NOT STARTED |
| **ACT-006** | **Cloudflare Pages production deployment** — the actual production deploy of the `qimmah` Pages project | Charter §1: any deploy is founder-only, with named authorization each time | REL-002 | At release | ⬜ NOT STARTED |
| **ACT-007** | **Email provider configuration** — auth email delivery (signup confirm, password reset via `VITE_RESET_REDIRECT_URL`) and a monitored `support@qimmah.app` inbox | Requires provider/domain credentials; also a standing human commitment to read support mail | ACC-001, REL-001 (support destination must actually work) | Before ACC-001 and REL-001 verification | ⬜ NOT STARTED |
| **ACT-008** | **Final merge to `main`** — promotion of the release commit to the trunk | Charter §1: trunk promotion is founder-only and is the launch act | REL-002 | At release | ⬜ NOT STARTED |
| **ACT-010** | **Confirm `VITE_ENTITLEMENT_MODE` is absent** in Cloudflare Pages for **both** production and preview | If it were ever `mock`, entitlement becomes client-authoritative on that deployment — Premium grantable from `sessionStorage` | ENT-001, REL-002 | Before any Premium claim is verified | ⬜ NOT STARTED |
| **ACT-011** | **Read the deployed commit SHA** — `curl -s https://qimmah.app/ \| grep -o 'qimmah-commit[^>]*'` (and the `pages.dev` URL) | External hosts are unreachable from agent containers (proxy denies CONNECT). One command settles PRODUCTION_DEPLOYMENT_IDENTITY. | GOV-002 closure, REL-002 | **Now — cheapest open unknown** | ⬜ NOT STARTED |
| **ACT-012** | **Approve preservation tags** — `PRESERVE-01` (tag the ground SHA) and `PRESERVE-02` (13 unique-work branches) | Additive, non-destructive; the ground is currently pinned only by a mutable branch ref | Ground promotion | **Before any other GOV-002 follow-up** | ⬜ NOT STARTED |
| **ACT-009** | **App Store / TestFlight action** — Apple Developer enrollment, signing, App Store Connect records, TestFlight distribution | Apple developer identity and legal entity | IOS-001 | **Only if DEC-014 = B.** `HORIZON-PENDING` while DEC-014 is unanswered. | ⏸ HORIZON-PENDING |

### 3.1 Considered and excluded — no evidence the project requires them

Listed so their absence is a recorded finding rather than an oversight.

| Candidate | Why excluded |
|---|---|
| ~~Founder / admin role provisioning~~ | **CORRECTED — it IS required.** My v0.9.1 exclusion was measured against `main` only. The proposed ground carries `supabase/migrations/20260816120002_founder_role_provisioning.sql` and a full `src/admin/` surface. Now tracked as **ACT-003** (migration authorization) plus **ACT-004** (Supabase project), since the admin RPCs are unapplied on any database. A lesson recorded rather than quietly patched: *an exclusion is only as good as the ref it was measured against.* |
| Payment-processor (Stripe/Apple IAP) setup | No processor integration in the tree. Purchase is an **outbound link** to Salla (`src/config/product.ts:25`), and `[CTO-009/WP-3]` records "no in-app payment". Commercial verification is covered by ACT-001. |
| App-store age-rating / third-party review accounts | Subsumed by ACT-009; not separated while DEC-014 is unanswered. |

---

## 4. Open founder items — summary

### Decisions required (`DECISIONS.md`)
| ID | Subject | Status |
|---|---|---|
| DEC-013 | Unrecoverable — must be **restated** and then approved | `PENDING_FOUNDER` |
| DEC-014 | V1 horizon: Web only (A) vs Web + iOS (B) | `PENDING_FOUNDER` |

### Actions required (§3)
Nine actions, ACT-001..ACT-009. **None is required today** — none blocks Tier-1
verification. Their timing is stated per-row above.

---

## 5. TIER-1 GROUND VERIFICATION RESULTS

*Executed under revision v0.9.1 on 2026-08-18. Definitions: `VERIFY.md` §3.*
*Evidence rules E-1..E-8 applied. No conversation history, no prior report, and no branch
name was accepted as evidence.*

**Reference SHAs used throughout:**

| Ref | Full SHA |
|---|---|
| `origin/main` (trunk HEAD at verification) | `cc60adfc0da0f893b101230269d4847d33490429` |
| `codex/qimmah-sovereign-closure-001` (superset chain tip) | `139a7b00d154e1950e5970ed86d2fe6165dba5c6` |
| `codex/qimmah-canonical-launch-candidate-001` | `740023b913103546f1ece4741ae987a4dcfc9536` |
| `codex/qimmah-founder-qa-candidate-001` | `bcec642163c275427b29976e9269701271485799` |

---

### V-GROUND-01 — Is there a single, identifiable trunk? → **YES**

- **Branch:** `main`
- **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** GitHub repository object reports `"default_branch":"main"`. Local
  `git rev-parse origin/main` → `cc60adfc0da0f893b101230269d4847d33490429`.
  `AGENTS.md` §1 declares `main` the trunk. `nightly.yml` scopes its drift gate to `main`.
  Note: `refs/remotes/origin/HEAD` is **not set** in this clone (`fatal: ref ... is not a
  symbolic ref`) — a local clone artefact, not a repository ambiguity.
- **Command:** `git rev-parse origin/main` · `mcp github search_repositories repo:km5g98str4-commits/qimmah`
- **Interpretation:** Trunk identity is unambiguous and confirmed from the GitHub API, not
  from documentation. This answers *which branch is the trunk* — **not** whether the trunk
  is the most complete ground. See V-GROUND-02/03.

### V-GROUND-02 — Do competing ground candidates exist? → **YES**

- **Branch:** 14 candidates matched on name (`final|canonical|release|closure|sovereign|candidate|rc`)
- **Evidence:** **All 14 are NOT ancestors of `origin/main`.** Not one has been merged.
  Three of them form a strict linear chain that **fully contains `main`** (0 commits behind):

  | Branch | Full SHA | Behind main | Ahead of main |
  |---|---|---|---|
  | `codex/qimmah-founder-qa-candidate-001` | `bcec642163c275427b29976e9269701271485799` | 0 | +154 |
  | `codex/qimmah-canonical-launch-candidate-001` | `740023b913103546f1ece4741ae987a4dcfc9536` | 0 | +156 |
  | `codex/qimmah-sovereign-closure-001` | `139a7b00d154e1950e5970ed86d2fe6165dba5c6` | 0 | +228 |

  Ancestry verified: founder-qa ⊂ canonical-launch ⊂ sovereign-closure. Confirmed both
  directions — `sovereign-closure` is **not** an ancestor of `canonical-launch`
  (72 commits exist in the former and 0 in the reverse), so the chain is linear, not forked.
- **Command:** `git merge-base --is-ancestor <sha> origin/main` per branch · `git rev-list --count`
- **Interpretation:** **This is the central ground finding.** `main` is the trunk but it is
  **not the most advanced line**. A strict superset of it exists, last committed
  **2026-08-18** — the day of this verification. Per E-4 the word "sovereign"/"canonical"
  in those names carries no authority; what carries weight is the verified ancestry.

### V-GROUND-03 — Does unique, unmerged work exist that would be lost? → **YES**

- **Branch:** `codex/qimmah-sovereign-closure-001` and six branches outside its chain
- **Full SHA:** `139a7b00d154e1950e5970ed86d2fe6165dba5c6`
- **Evidence:** `git diff --stat origin/main...139a7b00 -- src/` →
  **185 files changed, 26,910 insertions(+), 2,281 deletions(-)** in `src/` alone.
  Eight of the 14 candidates are contained in this tip. **Six are not**, each carrying work
  reachable from nowhere else:

  | Branch outside the chain | Full SHA | Commits not in tip |
  |---|---|---|
  | `merge/release-rc-into-trunk` | `bdc0cef8a652aa29ec41a9828e65f017c2a25c96` | 541 |
  | `claude/p14-e2e-release-gate` | `45b583cb97d554afd35f47cb6a0f8e3be6f88a3d` | 527 |
  | `claude/web-rc-cto009` | `da11034dca8ab9b15ec61bde5bc9af7a76367f45` | 20 |
  | `fix/qa-hardening-release-readiness` | `3d4360ef1d095d30336519de52b0b2ad18d083ab` | 18 |
  | `codex/qimmah-final-release-convergence-001` | `df10b88f5b91f4d1674fc75f922f2ac9c29f8def` | 4 |
  | `claude/codex-web-sovereign-trace-j9kzwz` | `6fce5026be981924e6ffcd737e8bd299d150f6ba` | 1 |

  The two largest (541 / 527) are also **63 commits behind `main`** — stale divergent lines,
  not simply "ahead".
- **Command:** `git diff --stat origin/main...<sha> -- src/` · `git rev-list --count <tip>..<sha>`
- **Interpretation:** Substantial unique work is at risk. Its **value is unassessed** — line
  counts measure volume, not worth, and none of it has been reviewed here. Disposition is
  `GOV-002`, which is explicitly not authorized in this step.

### V-GROUND-04 — Is the trunk internally consistent and complete? → **YES**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** `git status --porcelain` → 0 lines (clean). Build inputs all present:
  `package.json`, `package-lock.json` (lockfileVersion 3, name matches, 19 runtime deps),
  `src/`, `.github/workflows/ci.yml`. No stash, no untracked files.
- **Command:** `git status --porcelain` · `git rev-parse HEAD origin/main` · lockfile/package cross-read
- **Interpretation:** The trunk tree is clean and complete.
  **Disclosure:** at the moment of reporting, local `HEAD` is
  `80cf1554c4163f6d8c7034d7c40838d045f70322`, one commit ahead of `origin/main` — that
  commit is **this revision's own control-file commit** on
  `claude/control-files-tier1-verify-yyxg50`. It touches only `docs/control/` and no
  product code. All verification above was run against `origin/main`, not against `HEAD`.

### V-GROUND-05 — Are the declared quality gates real and wired? → **YES**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** `typecheck`, `lint`, `build`, `test:gate` all present in `package.json`.
  `test:gate` chains **92** sub-scripts. Every one resolves: **0 undefined npm scripts**,
  **0 dangling `scripts/*.mjs` files**.
- **Command:** Node resolution of the full `test:gate` chain against `package.json` + `fs.existsSync`
- **Interpretation:** The gate is real and wired, not decorative. **This does not mean it
  passes** — running it is Tier 3 (`V-REL-01`) and was not executed here.

### V-GROUND-06 — Is there one unambiguous production deployment source? → **NO**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** **Two hosting configurations coexist at trunk:**
  - `wrangler.toml` → Cloudflare Pages project `qimmah`, `pages_build_output_dir = "dist"`
  - `vercel.json` → Vercel config, `buildCommand`/`outputDirectory`/SPA rewrites

  **No deploy workflow exists** in `.github/workflows/` (only `ci.yml`, `nightly.yml`), so
  the deploy trigger is not repository-verifiable. `AGENTS.md:340-341` claims Cloudflare
  Pages auto-deploys from `main` at `https://qimmah-8qp.pages.dev` — but per E-3 that is a
  document claim, not evidence. Independently, `site/*.html` declares canonical
  `https://qimmah.app/` (5 pages), which matches **neither** config.
- **Command:** `cat wrangler.toml vercel.json` · `grep -l deploy .github/workflows/*.yml` · `grep -n canonical site/*.html`
- **Interpretation:** **NO — genuinely ambiguous.** Three different production identities are
  asserted across the repository (Pages project, Vercel config, `qimmah.app` canonical URLs)
  and none is confirmed by a deploy pipeline in the repo. This feeds `ACT-005`, `ACT-006`,
  and `TRUTH-001` (a canonical URL that does not serve the site is a false external claim).

### V-CI-01 — Does a real CI gate exist and does it actually gate? → **YES**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** `.github/workflows/ci.yml` triggers on `push: branches: ['**']` and
  `pull_request: branches: ['**']`. Job `Quality gate (typecheck · lint · build · proofs)`
  runs `npm ci` → typecheck → lint → build → perf → food-db → `test:gate` → Playwright →
  onboarding E2E. Run history confirms it fires automatically (`event: push`).
- **Command:** `cat .github/workflows/ci.yml` · `actions_list list_workflow_runs ci.yml`
- **Interpretation:** CI is live and gating on every branch, not dormant or manual-only.

### V-CI-02 — What is the actual CI status of the ground SHA? → **NO (red)**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** Run `31478324999`, conclusion **`failure`**, 2026-08-11T09:34:42Z.
  Named per `AGENTS.md` §4.0:

  | | |
  |---|---|
  | **Workflow** | `CI` (`ci.yml`) |
  | **Job** | `Quality gate (typecheck · lint · build · proofs)` |
  | **Failing step** | **#13 `Upload dist artifact`** |
  | **Steps 1–12** | **all `success`** — including typecheck, lint, production build, `test:gate`, and the onboarding E2E |
  | **First red on main** | `695e649cbfcd4b703b21ca97f2c3c62a5a925a5f`, run `31435389377`, 2026-08-10T21:46 |
  | **Last green on main** | `dd79a60f193b1163ab1ec549a35458e0d2aab1de`, run `30880399389`, 2026-08-04T05:20 |

  **Two distinct reds in sequence, not one:**
  1. `695e649` — failed at step **#12 `Onboarding v2 browser E2E`** (a real test failure).
  2. `b2514ee` — the commit whose message claims to fix that E2E — still `failure`.
  3. `cc60adf` — E2E now **passes**; the red moved to step **#13 artifact upload**.
- **Command:** `actions_list list_workflow_runs ci.yml branch=main` · `list_workflow_jobs 31478324999` · `list_workflow_jobs 31435389377`
- **Interpretation:** **The trunk is red and has been for 7 days across 3 commits.** But the
  *current* red is an infrastructure step (artifact upload) sitting **after** every quality
  step passed — consistent with the GitHub storage-quota red already recorded in
  `AGENTS.md` §4.0. This is the §4.0 masking pattern repeating in reverse: a **false red**
  now hides the fact that the trunk's actual quality signal is green. Named, not normalised.
  Fixing it is **not** authorized here.

### V-CI-03 — Is CI trustworthy, or is it masking? → **YES (no undeclared masking)**

- **Branch:** `main` · **Full SHA:** `cc60adfc0da0f893b101230269d4847d33490429`
- **Evidence:** Exactly one `continue-on-error: true` in `ci.yml` (line 55) — the perf
  budget — and it is **declared** in an in-file comment and in `AGENTS.md`. `if: success()`
  on the artifact upload is ordinary gating, not masking. The two proofs excluded from
  `test:gate` (`test:safe-storage`, `test:body-model`) are **defined and present** in
  `package.json` and their exclusion is declared in `AGENTS.md` §11 with stated rationale
  and coverage substitutes.
- **Command:** `grep -n "continue-on-error\|if: always\|if: success" .github/workflows/*.yml` · script-presence check
- **Interpretation:** No undeclared exclusion could let a real failure pass as green. CI's
  *green* is trustworthy. Its *red*, as V-CI-02 shows, currently over-reports — which is the
  safer direction of error but still costs the trunk a usable signal.

---

### GOV-002 ground summary — supersedes the Tier-1 summary below

Full forensics: `docs/control/GOV-002-FINDINGS.md`.

```
CANONICAL_GROUND_RESULT = CANONICAL_GROUND_REQUIRES_COMPOSITION
BASE_BRANCH             = claude/qimmah-recovery-control-plane-hph1jg
BASE_SHA                = dc031fa36929e07c3b00fa025a676ed64327ce59
MAIN_RELATIONSHIP       = strict ancestor (0 behind, +229 ahead)
GROUND_CONFIDENCE       = HIGH  (identity)  ·  release-readiness LOW
```

**Blocking the promotion (all named, none silent):**
1. `PRESERVE-01` — the ground SHA carries **no tag**; anchored only by a mutable branch ref.
2. `DEC-014` unanswered · `DEC-013` unrecoverable · **`DEC-015` new** (entitlement posture).
3. The published Terms say "Core features remain free" while the ground gates **13 core
   actions** — a material FALSE claim under `QIM-V1-TRUTH-001`.
4. The ground is **read-only without a live entitlements backend** (`ACT-002/003/004`).
5. `PRODUCTION_DEPLOYMENT_IDENTITY` is UNKNOWN — one founder command settles it (`ACT-011`).

---

### Tier-1 ground summary (v0.9.1 — retained for history)

| Field | Value |
|---|---|
| **PROPOSED_CANONICAL_GROUND_BRANCH** | `main` — **contested, see below** |
| **PROPOSED_CANONICAL_GROUND_SHA** | `cc60adfc0da0f893b101230269d4847d33490429` |
| **GROUND_CONFIDENCE** | **MEDIUM** |

**Why MEDIUM and not HIGH.** Two different questions have two different confidence levels,
and collapsing them would be the exact false confidence this exercise exists to remove:

- *Which branch is the trunk?* — **HIGH.** `main` is confirmed from the GitHub API, clean,
  complete, with real wired gates and live CI.
- *Is the trunk the ground V1 should be built on?* — **LOW.** A strict superset
  (`codex/qimmah-sovereign-closure-001`, +228 commits, +26,910 lines in `src/`, committed
  the same day) exists and is unmerged, plus six further branches with unique work.

`main` is proposed as ground because it is the verified trunk, the declared deploy source,
and the only line whose quality steps are currently green. It is **not** proposed as
complete. Promoting the superset chain instead would mean adopting ~27,000 unreviewed lines
whose own CI is red on a **real** E2E failure (step #12, run `32155970912`) — the opposite
of establishing verified ground. `GOV-002` resolves this, and is not authorized here.
