# GOV-002 — CANONICAL GROUND CONVERGENCE — Findings

**Revision:** v1.0-rc · **Executed:** 2026-08-18 · **Mode:** verification / forensics only.
**No product code was modified. No merge, deploy, migration, deletion or history rewrite occurred.**

Reference SHAs used throughout:

| Ref | Full SHA |
|---|---|
| `main` (production pointer) | `cc60adfc0da0f893b101230269d4847d33490429` |
| `claude/qimmah-recovery-control-plane-hph1jg` (**proposed ground**) | `dc031fa36929e07c3b00fa025a676ed64327ce59` |
| `codex/qimmah-sovereign-closure-001` (its parent) | `139a7b00d154e1950e5970ed86d2fe6165dba5c6` |

---

## 1. Preservation record (§0) — taken before analysis

| Item | Value |
|---|---|
| Working branch at start | `claude/control-files-tier1-verify-yyxg50` @ `64fca13b0ce89eedb0a57046c4d94bb2360612a5` |
| `main` / `origin/main` | `cc60adfc0da0f893b101230269d4847d33490429` (identical) |
| Working tree | **clean** — `git status --porcelain --untracked-files=all` → 0 lines |
| Stash | empty |
| Worktrees | one (`/home/user/qimmah`); two read-only analysis worktrees added under scratchpad, outside the repo |
| Local-only branches | none |
| Unpushed commits | none |
| Remote heads | 81 · Remote tags | 186 |

**`UNIQUE_WORK_AT_RISK` (local) = NONE.** This container holds a fresh clone with no
uncommitted or unpushed state. **Scope limit, stated rather than glossed:** "the accessible
machine estate" is *this container only*. The founder's own machines, any other agent
container, and Cloudflare/Supabase consoles are **not visible from here**, so no claim is
made about work that may exist there.

**Nothing was deleted, reset, stashed, or overwritten.**

### Preservation proposal — NOT executed, founder approval required
45 of the 58 branches carrying patch-unique commits already have an `archive/*` tag at their
head. **13 do not.** No branch deletion is authorized or planned, so nothing is at risk today;
this is hardening only.

Proposed (non-destructive, additive tags only — say the word and it is one command each):
`archive/qae-training-wave2-269b2bb` · `claude/qae-architecture-design-fhg2mh` ·
`claude/salla-activation` · `claude/web-rc-cto009` · `claude/codex-web-sovereign-trace-j9kzwz` ·
`codex/qimmah-final-release-convergence-001` · `design/v21-promotion` · `e/plan-honest-axes` ·
`e/plan-preview` · `e/plan-rationale` · `e/plan-why` · `feature/p25-steps-health` ·
`claude/control-files-tier1-verify-yyxg50`.

---

## 2. Candidate universe (§2) — re-derived, not inherited

The founder-supplied list was **treated as incomplete, and was incomplete.**

All 81 remote heads were enumerated and classified by **ancestry and content**. Branch names
were given zero weight — which matters, because the previous pass built its candidate set by
*name matching* (`final|canonical|release|closure|sovereign|candidate|rc`) and that filter
**missed the actual winner**:

> **`claude/qimmah-recovery-control-plane-hph1jg`** matches none of those words, yet strictly
> contains `codex/qimmah-sovereign-closure-001` plus one commit, and **its CI is green** where
> its parent's is red.

### Containment chain (each strictly contains the previous)

```
main cc60adf
  └─ codex/qimmah-founder-qa-candidate-001      bcec642…  +154
      └─ codex/qimmah-canonical-launch-candidate-001  740023b…  +156
          └─ codex/qimmah-sovereign-closure-001  139a7b0…  +228   [CI RED]
              └─ claude/qimmah-recovery-control-plane-hph1jg  dc031fa…  +229  [CI GREEN]
```

Verified in both directions (`git merge-base --is-ancestor`, `git rev-list --count`): the chain
is **linear, not forked** — 0 commits run the other way at every link.

### Ledger summary (81 branches)

| Class | Count |
|---|---|
| Fully contained in the proposed ground | 22 |
| Patch-identical (absorbed, different SHA) | 2 |
| Carrying patch-unique commits | 58 |

`git cherry` **over-reports** uniqueness: rebased, squashed and conflict-resolved commits
receive new patch-ids. Pre-July branches therefore show hundreds of "unique" commits whose
content is long absorbed. Every branch was therefore re-tested at **file level** against the
candidate tree. Full ledger: `docs/control/evidence/gov002-branch-ledger.txt`.

---

## 3. What the candidate contains relative to `main` (§3, §10 criterion 1)

```
$ git merge-base --is-ancestor cc60adf dc031fa   → true
$ git rev-list --count dc031fa..cc60adf          → 0
```

**`main` is a strict ancestor. Criterion 1 is satisfied outright** — there are no "main-only
changes" to account for.

Files present in `main` but absent from the candidate: **50 — 46 `.png` + 4 `.json`**
(`docs/proof/journeys/**`, `scripts/today-v2-shot/shots/**`). **Zero source files, zero
migrations, zero dictionaries, zero configuration** — `git diff --diff-filter=D --name-only
cc60adf dc031fa -- src/` returns nothing, and i18n dictionaries grew 31 → 45.

> **Correction, found by adversarial review of my own claim.** I first reported these as "50
> regenerable PNGs". Four are **not** screenshots: `docs/proof/journeys/{j1-newcomer,j2-minor,
> j3-advanced}/ar-large/manifest.json` and `j3-advanced/.../fingerprints.json` are **inputs to a
> live script** — `scripts/e2e/journeys/build-contact-sheet.mjs:117` reads them. So
> `npm run journeys:sheet` is **broken on the candidate** until the journey harnesses are
> re-run. Still regenerable; not cosmetic. Tracked as a named follow-up, not a blocker.

The candidate adds ~185 files in `src/` (+26,910 / −2,281 lines), 12 migrations, 12 access-layer
modules, `src/admin/`, `src/lib/food/`, and two Supabase edge functions.

---

## 4. Work outside the candidate — classified by content (§3)

| Branch / asset | Classification | Basis |
|---|---|---|
| `QimmahAdaptiveEngine/` on `archive/qae-training-wave2-269b2bb` + `claude/qae-architecture-design-fhg2mh` | **UNIQUE_VALUABLE / EXPERIMENTAL** | 232 files, 3.5 MB, absent from `main` **and** the candidate. **Never wired into `src/`** on its own branch — standalone reference architecture. Out of V1 scope; preserve, do not adopt. **Founder decision.** |
| 81 `public/exercise-gifs/*.gif` on `hotfix/p12-field-fixes-r2` | **DANGEROUS_TO_ADOPT** | Watermarked proprietary WorkoutX assets, **deliberately deleted** for licensing. `src/data/exerciseGifs.ts:1-8` documents the removal; the map is empty by design and `ExerciseMedia` falls back to public-domain frames. Guarded in-gate by `test:media-rights`. **Not lost value — legal risk.** |
| `20260811120001_purchase_integrity.sql` on `claude/salla-activation` | **DANGEROUS_TO_ADOPT** | Explicitly rejected by the candidate, with reasons recorded in `supabase/migrations/20260812120001_salla_webhook_ingest.sql:9-19`: its later number would have **silently won** over the reviewed baseline and reopened four proven holes (`ſ`→`S` case-fold, un-trimmed `provider_order_id`, re-dated `activated_at`, hard-coded `source`). The one thing it had that the baseline lacked — provenance columns — **was carried across.** |
| `claude/codex-web-sovereign-trace-j9kzwz` (1) | **SUPERSEDED** | Its single commit is superseded by the candidate's later work on the same surfaces. |
| `codex/qimmah-final-release-convergence-001` (4 non-ancestor commits) | **UNIQUE_UNCERTAIN — the one real stitch candidate** | 2 of 4 are evidence-JSON churn, but its `scripts/release/static/regression-ledger.mjs` differs from the candidate's by **+91/−55**, and its `BUG-019` entry holds literal bare-render-site patterns (Arabic sessions shipping `1937`, `اليوم 1 · علوي`, `4 أيام/أسبوع`) that the candidate's `[SOVEREIGN-002]` rewrite does **not** contain. The two ledgers **diverged**; neither strictly supersedes the other. See `STITCH-01`. |
| `claude/web-rc-cto009` (1) | **ABSORBED** | Gram/serving conversion — `test:serving-conversion` is in the gate on **both** `main` and the candidate. Patch-id differs; content is present. |
| `e/*`, `feature/*`, `research/*`, `design/*` (pre-July, all 63 behind `main`) | **ABSORBED / OBSOLETE** | Their file-level "unique" content is the retired marketing-template layer (`src/data/audience.ts`, `benefits.ts`, `src/components/PlanBuilder.tsx`) deliberately removed from the modern line. |

**Corrected conclusion.** My first formulation — "no branch outside the candidate carries
unique valuable work" — was too strong, and adversarial review broke it. The accurate statement
is: **no branch outside the candidate carries work that blocks adopting it as ground**, and
exactly **one** carries content worth porting (`STITCH-01`, the regression-ledger divergence).
Sixty remote branches are not ancestors of the candidate; each was classified, but "I judged
none worth porting" is a weaker claim than "none exists", and only the weaker one is proven.

---

## 5. Capability genealogy (§4) — 30 capabilities tracked

Full per-capability records with `file:line` evidence are in the lane reports; summary:

| Disposition | Capabilities |
|---|---|
| **ADOPT_FROM_CANDIDATE** (19) | onboarding engine · plan generation · **injury safety** · equipment/environment · exercise library · exercise media · AR/EN guidance · nutrition targets · food search · packaged food DB · progress · measurements · steps · authentication · preview/guest · activation codes · Salla integration · entitlement engineering · admin dashboard · import/export · corruption recovery · routing · Supabase migrations/RLS |
| **NEEDS_FOUNDER_DECISION** (4) | **entitlement paywall posture** · long-tail food shards · machines-only pool seeding · Premium gating vs published Terms |
| **ALREADY_ABSORBED / EQUAL** (3) | PWA/service worker · recovery · meal & workout template data |
| **KEEP_MAIN** (0 net) | — (template *data* is identical; nothing in `main` is better) |

### The five strongest reasons the candidate is better ground

1. **Injury safety.** `main` filters the main pool but leaves two live bypasses: the accessory
   slot (`planGenerator.ts:394-398`) and the swap engine (`workoutSubstitution.ts:69-73`) — a
   knee-injured user tapping "swap" on a squat is offered another squat. `main` has **no injury
   proof of any kind**. The candidate adds a per-exercise `jointLoads` model + fail-closed
   filter (`src/lib/injurySafety.ts`) and `test:injury-safety` in the gate.
2. **Equipment honesty.** On `main`, `Profile.equipment` is written as an empty array and never
   read — "home" silently grants barbell and bench to everyone. The candidate makes the declared
   list authoritative and requires it.
3. **Preview/production isolation.** `main/src/lib/supabaseClient.ts:21-22` falls back
   unconditionally to the built-in project, so **every branch preview build reads and writes the
   production database**. The candidate strips credentials from preview artifacts and derives
   the preview flag from `CF_PAGES_BRANCH`.
4. **Storage honesty.** `main`'s `saveCustomization(): void` swallows the write result and still
   enqueues sync — a write that never landed becomes cloud truth (charter §5 violation). The
   candidate returns `WriteResult` and enqueues only on success.
5. **Two dead buttons on `main`.** The "log a meal / log water" quick action dispatches to a
   listener that lives only in an unimported file; and manual weight/measurement entry has **no
   reachable caller at all** — `main`'s Progress tab shows a weight card only HealthKit can fill.

---

## 6. High-risk defect adjudication (§5) — reproduced on exact SHAs

Historical reports were treated as leads. Each verdict below rests on read code.

| # | Defect | MAIN | CANDIDATE |
|---|---|---|---|
| 1 | Injuries don't exclude contraindicated exercises | **CONFIRMED** | **FIXED** |
| 2 | Home/equipment mismatch | **CONFIRMED** | **FIXED** |
| 3 | Machine-plan conversion claims success without changing the plan | **CONFIRMED** | **CONFIRMED** |
| 4 | Arabic numeric input fails/corrupts decimals | **CONFIRMED** | **CONFIRMED** (fixed centrally; first-run onboarding fields still raw `Number()`) |
| 5 | Corrupt customization fabricates a fallback plan | **CONFIRMED** | **CONFIRMED** (honestly flagged `isDefault`, but **no surface reads the flag**) |
| 6 | Corruption recovery crosses Premium boundaries | REFUTED (n/a) | **CONFIRMED — new in candidate** |
| 7 | Premium modal survives route changes | REFUTED (n/a) | **REFUTED** (closed on route transition, `App.tsx:109-116`) |
| 8 | Target weight contradicts stated goal | **CONFIRMED** | **CONFIRMED** (files byte-identical; never addressed) |
| 9 | Session duration disagrees across surfaces | **CONFIRMED** | **FIXED** |
| 10 | First workout/day selection wrong | **CONFIRMED** | **FIXED** |
| — | Food search omits shawarma | **REFUTED** | **REFUTED** (was a transient candidate regression, already fixed) |
| — | Long-tail shards generated but not shipped | n/a | **CONFIRMED** — 599 of 59,941 records ship; declared honestly as `unavailable` |
| — | Exercise imagery exists outside Git | **REFUTED** | **REFUTED** — deliberately deleted for licensing, not lost |
| — | Admin exists but not operational | n/a | **CONFIRMED** — routed and role-guarded, but RPCs unapplied and no in-app entry point |
| — | Migration version collisions | n/a | **CONFIRMED historically, FIXED** — three files shared `20260816120001`; renumbered, now guarded by `test:migration-version` |
| — | Preview builds embed production credentials | **CONFIRMED** | **FIXED** |
| — | External commercial claims disagree with code | **CONFIRMED** | **CONFIRMED — and sharper** (see §9) |

**Severity note on "credentials":** the committed values are the **public anon key and project
URL**, which are public by design and RLS-guarded. **No `service_role` key or secret is
committed** on either SHA. The defect is environment isolation, not secret exposure.

---

## 7. Dead & duplicate surfaces (§6) — measured, not guessed

Reachability was computed with an independent BFS from `index.html → src/main.tsx`, following
static **and** dynamic imports, with comment/string-aware scanning. Hardening: `import.meta.glob`
and `require.context` return **0 hits** repo-wide, so there is no hidden dynamic registry.

```
candidate dc031fa : LIVE 418 · ORPHAN 95 · TOTAL 513
main     cc60adf : LIVE 332 · ORPHAN 95 · TOTAL 427
```

### The headline finding — and it is a user-safety one

> **`test:allergy-notice` is in `test:gate` and passes green. It asserts against
> `src/views/NutritionV2.tsx` — a file no importer reaches.** The live
> `src/views/NutritionView.tsx` contains **zero** allergy references.
> **A food-allergy warning is proven mounted and has never been shown to a user.**

Verified independently on both SHAs: `App.tsx` lazy-loads `NutritionView`; live view allergy
matches = 0; twin = 3; proof reads the twin. **This is identical on `main` and the candidate —
it is live in production today and is not a candidate regression.**

**16 proof scripts inside `test:gate` assert against modules the running app never loads:**
`test:allergy-notice` · `test:saudi-foods` · `test:saved-meals` · `test:polish3` ·
`test:polish2` · `test:rpe-level` · `test:workout-rest-state` · `test:coaching` ·
`test:settings-preferences` · `test:substitution` · `test:hydration` · `test:workout-order` ·
`test:personalization` · `test:e-plan-preview-host` · `test:data-portability` ·
`test:media-pipeline`.

Other named surfaces: `NutritionV2`/`WorkoutV2`/`PlanPreviewView` (DEAD twins, declared) ·
a ~5,300-line personalization engine built, key-registered for sync/export, and **never
routed** · `TodoWidget` dead while its store is synced *and* exported · duplicate Open Food
Facts clients · duplicate portability implementations.

**Resolves an open charter §11 question:** `src/config/theme.ts` is **DEAD** — its only two
referrers are themselves orphans, and live theming is `src/lib/appPreferences.ts`. It is a
*different file* from the live theme system, so deleting it costs nothing. Classification:
`DELETE_LATER` (not in GOV-002).

The candidate does add a real guard for this class — `test:canonical-surface`, derived from an
esbuild metafile — but its registry is hand-listed and covers 3 surfaces; it catches fixes
drifting *onto* twins, not proofs aimed *at* them.

---

## 8. Test-the-tests (§7)

| Metric | `main` | candidate |
|---|---|---|
| `test:gate` steps | 92 | **140** |
| `test:*`/`proof:*` scripts defined | — | 188 |
| **Excluded from the gate** | — | **44 real exclusions** |
| Declared exclusions | 2 (`test:safe-storage`, `test:body-model`) | ~7 |
| **Undeclared exclusions** | — | **~37** |

Undeclared exclusions include `test:observability`, `test:chaos`, `test:bundle-safety`,
`test:deploy-cutover`, `test:release-gate`, `test:journey:newcomer`, and **21 `test:e2e:*`
suites**. Also orphaned: `run-warmup-promise-proof.mjs` (the warm-up feature's own guard, run by
nothing) and `test:measurement-reliability`.

**Classified findings**

- `GREEN_BUT_VACUOUS` — `test:food-longtail` passes on `allPresent || allAbsent`
  (`run-food-longtail-proof.mjs:65-71`); the shipped state is `present = 0`.
  *Declared in its header, and it does assert honest degradation* — so vacuous in name, honest
  in substance. `test:guest-entry` and `test:e-calc-explainer` are the charter §4.2 pattern:
  independent `includes()` over whole files, satisfiable from comments.
- `TESTS_DEAD_SURFACE` — the 16 above.
- `CI_MASKING` — two `continue-on-error` sites, **both declared in-file** (perf budget; artifact
  upload). Plus documentation drift: `docs/ci/README.md` lists six proofs as gate content that
  are not in the gate.
- **Guard with no runner** — `src/lib/coach/provenance.ts`: 16 named checks, no npm script, no
  CI step, no importer, and its declared consumer `src/lib/coach/render.ts` **does not exist**.
- `REAL_PASS` — `test:onboarding-questions` was alleged to check wiring only; **refuted.** Its
  §6 drives real `generatePlan` over every value of all 20 questions and asserts distinct
  downstream outcomes, with a wraparound simulation and a two-directional exception ledger.

**The candidate's DB proofs need no secrets:** `scripts/db/lib/supabase-sandbox.mjs` runs
migrations from clean against in-process PGlite, deliberately reproducing Supabase's real
`anon`/`authenticated` grants so that "denied" checks cannot pass for free.

---

## 9. Production identity (§9)

| Axis | Verdict | Basis |
|---|---|---|
| **A · SOURCE** | **INFERRED** | `wrangler.toml` names Pages project `qimmah`, output `dist`. `AGENTS.md:340-341` says Pages auto-deploys from `main`. **But `vercel.json` also exists on both SHAs and no deploy workflow exists in `.github/workflows/`** — so the repository does not settle it. |
| **B · DEPLOYMENT** | **UNKNOWN** | Not resolvable from this container: the agent proxy denies external hosts (`qimmah-8qp.pages.dev` and `qimmah.app` both → 403 CONNECT). |
| **C · DATA** | **INFERRED** | Client resolves `VITE_SUPABASE_URL` else a built-in project (`supabaseClient.ts:17-22`). Which Supabase project is production, and which of the 24 migrations are applied, cannot be read from the repo. |
| **D · COMMERCIAL** | **VERIFIED (repo-side)** | Candidate points at a specific product page (`src/config/product.ts:30-44`), percent-encoded, with the in-code note that it was read from the live store DOM and returned 200 at 19.99 SAR. `main` points only at the store root. Price is deliberately not in code. |

**Founder actions that collapse the unknowns** — precise and cheap:

1. **Deployment identity (B):** both SHAs inject a build-identity meta tag
   (`vite.config.ts` → `<meta name="qimmah-commit">`). One command:
   ```
   curl -s https://qimmah.app/ | grep -o 'qimmah-commit[^>]*'
   curl -s https://qimmah-8qp.pages.dev/ | grep -o 'qimmah-commit[^>]*'
   ```
   That returns the exact deployed SHA and settles whether production is `main`.
2. **Source identity (A):** Cloudflare Pages → project `qimmah` → Settings → confirm the
   production branch, and confirm whether the Vercel config is live or vestigial.
3. **Data identity (C):** in the production Supabase project:
   `select * from supabase_migrations.schema_migrations order by version;` and diff against
   `ls supabase/migrations/` (24 files on the candidate, 12 on `main`).
4. **Entitlement-mode check (C, security):** confirm `VITE_ENTITLEMENT_MODE` is **absent** for
   both production and preview environments. If it were ever set to `mock`, entitlement would be
   client-authoritative on that deployment.

---

## 10. The published Terms contradict the code — highest-severity finding

Byte-identical on **both** SHAs (`docs/legal/terms-of-service.md:46-48,105-107`;
`site/terms.html:84,132`):

> «قد نطرح **لاحقًا** اشتراكًا مدفوعًا … **الميزات الأساسية تبقى مجانية**. … **لا يوجد اشتراك
> فعّال في هذه النسخة.**»
> "We may **later** offer a paid subscription … **Core features remain free.** … **No
> subscription is active in this version.**"

Against that, the candidate gates **13 product actions** behind a server-verified entitlement,
default-deny (`src/lib/access/paidActions.ts:17-52`, allow predicate `:89-92` returns
`status === 'active'`), enforced at the **storage layer** across 12 call sites — including
`workout.logSet`, `nutrition.addFood`, `nutrition.water`, `progress.logWeight`,
`recovery.log`.

The sharper contradiction is not "no subscription" (Premium is modelled as a one-time purchase)
— it is **"Core features remain free"**. Logging a set, a meal, water, or a weight are core
features, and all are blocked without server `active`.

**No proof guards this.** `run-site-truth-proof.mjs:63-64` checks only the age-13 and medical
lines. Nothing compares `PAID_ACTIONS` against the Terms text.

**On `main` the Terms are true** (there is no entitlement layer at all). **They become false the
moment the candidate ships.** This is `QIM-V1-TRUTH-001`'s first material `FALSE` claim, and
under the binding release rule it blocks release until resolved — by changing the Terms, the
gating, or both. **Founder decision — it is a product-posture and legal question, not a lane call.**

---

## 11. Deployment dependency created by the candidate

`entitlementSource.ts:108` returns `none` with `backend_unconfigured` when Supabase is not
configured, and `isPaidActionAllowed` grants only on `active`. The design is deliberately
fail-closed ("الفشل يُغلق ولا يفتح") and is **correct security**.

**Consequence, stated plainly:** a production build of the candidate with no entitlements
backend wired is a **read-only app** — the user cannot log a set, a meal, water, a weight, a
measurement, or a recovery check-in. `main` has no such gate and logs everything locally.

This is not a bug to fix; it is a **hard sequencing dependency**: `ACT-002` (production
secrets), `ACT-003` (apply migrations) and `ACT-004` (Supabase production project) must
complete **before** the candidate can serve users. It also sits against the project's declared
"local-first" posture in `.claude/rules/product.md` — which is why it is a founder decision and
not an adoption detail.

---

## 12. Durability and self-containment (§10 criterion 9) — the ground's weakest point

Adversarial review **refuted** my initial claim that the candidate is "reproducible from durable
sources". Two independent breaks, both verified directly:

### 12.1 The candidate SHA is not pinned — `BLOCKER for promotion, trivial to fix`

```
$ git tag --points-at dc031fa36929e07c3b00fa025a676ed64327ce59   → (empty)
$ git tag --contains  dc031fa36929e07c3b00fa025a676ed64327ce59   → (empty)
```

In a repository with **186 tags**, the proposed ground is anchored only by a **mutable branch
ref** — deletable and force-pushable. `main` at least sits on the deploy path. **Nominating a
canonical ground that no tag pins contradicts the purpose of nominating one.**

**Proposed first action (non-destructive, additive, awaiting founder approval):**
tag `dc031fa` — e.g. `ground/v1-rc-20260818` — **before** any other GOV-002 follow-up.

### 12.2 The candidate imports a 91 MB dependency that git does not hold

Candidate-only `.gitignore` entries (absent from `main`):

```
data/food-production/accepted/shards/   # ~91 MB, 160 files — generated, not committed
.food-cache/
```

Tracked under `public/food/`: exactly **three** files — `README.md`, `hot-set.json`,
`manifest.json`. The tracked manifest declares **41 shards / 59,941 records**; the shipped hot
set holds **599**. Reproduction runs through
`data/food-production/accepted/README.md`, which pulls a **rolling daily third-party export**
(`static.openfoodfacts.org/.../products.csv.gz`) and needs a pinned `SOURCE_DATE_EPOCH` for
fingerprints to match. Build fingerprints do exist
(`data/food-production/manifests/build-manifest.json`), which makes the pipeline *deterministic*
— but the **input** is not durable, and `main` has no `public/food/` at all, so adopting the
candidate imports this dependency.

**The release-shaped risk, stated plainly:** Cloudflare Pages builds from git. Promoting this
SHA ships a manifest advertising **59,941 records** against **41 shards that will 404**, while
CI stays green — because `scripts/run-food-longtail-proof.mjs:10-17` rules absent shards an
acceptable, honestly-degraded state. The gate proves the app *degrades honestly*; it does not
prove the catalogue *ships*. That is a `QIM-V1-TRUTH-001` claim to resolve (either upload the
shards, or stop advertising a number the product cannot serve), not a gate to weaken.

### 12.3 The candidate's CI green is not step-for-step comparable with main's red

`git diff cc60adf dc031fa -- .github/workflows/ci.yml` adds `continue-on-error: true` to the
**Upload dist artifact** step (and cuts retention 7 → 3). That step was **blocking on `main`**
and is **non-blocking on the candidate**.

This is declared and reasoned in-file under `[CTO-87]`: nothing downloads the artifact, no job
depends on it, deployment runs through Cloudflare's Git integration, and a storage-quota failure
was reddening the whole gate after all eight quality steps had passed — i.e. an infrastructure
red that **masks** a future code red (§4.0). The eight preceding steps remain mandatory and none
was removed. An identical change exists independently as `origin/ci/artifact-quota-nonblocking`.

**It is legitimate. It is also the reason both reds cleared:** the E2E red was *fixed*
(`dc031fa`), and the artifact red was made *non-gating*. Both facts belong in the record; only
one of them is a repair.

### 12.4 Doctrine/reality drift found in passing

`CLAUDE.md`/`AGENTS.md` §4.0 states CI runs `test:e2e:onboarding` **and** a journeys guard.
`grep -n journey .github/workflows/ci.yml` returns nothing on **either** SHA. The journeys guard
is not in CI. Pre-existing on both lines; named here, not fixed.

---

## 13. Red-team results (§11) — two adversarial lanes, independent method

Two lanes were tasked to **disprove**, not confirm. Both landed hits on my own claims; those
corrections are folded into §3, §4 and §12 above rather than quarantined here.

### 13.1 Ground-claim lane

| Claim attacked | Verdict |
|---|---|
| C1 `main` is a strict ancestor, nothing missing | **SURVIVES** — attacked graph-side *and* content-side; 0 reverts of main's fixes; `_redirects` additive only |
| C2 only 50 regenerable PNGs lost | **WEAKENED** — 46 PNG + 4 JSON; the JSONs feed a live script (§3) |
| C3 candidate CI is green | **WEAKENED** — real and verified, but the artifact step was made non-gating (§12.3). Gate itself: **92 → 140 steps, zero removals** |
| C4 no other branch has unique valuable work | **WEAKENED** — GIF count 81 not 82; `STITCH-01` found (§4) |
| C5 reproducible from durable sources | **REFUTED — MAJOR** (§12.1, §12.2) |

### 13.2 Safety/security lane

**Sound under attack** (each with a defeated attack list): entitlement server authority
(no client-reachable grant path; `revoke all` chosen specifically because selective revoke
leaves TRUNCATE, which RLS does not guard) · secrets (only the public anon key; `service_role`
read from env in edge functions only) · RLS (all **26** public tables enabled; sensitive tables
run RLS with *zero* policies plus explicit revoke) · founder preview (strictly *removes*
capability) · Salla webhook (HMAC verified before any write; refuses to boot rather than guess
which status means paid) · admin role (`app_metadata` only; forged `user_metadata` claim
rejected **by name**) · storage honesty (raw `setItem` sites 32 → 27).

Also confirmed fixed: the `noopener` regression on the onboarding privacy link that
`AGENTS.md` §11 lists as outstanding **is repaired** in the candidate; all 8 external links
carry `rel="noopener noreferrer"`.

**Vulnerable — three findings, all named and none previously recorded:**

| ID | Finding | Severity | vs `main` |
|---|---|---|---|
| **RED-009** | **Sensitive-health consent covers only the `profiles` table.** `syncFieldPolicy.ts:131` short-circuits — `if (table !== 'profiles') return payload` — while `historyStore.ts:429-432` ships `supplements` and `medications` verbatim on `daily_logs`, and `recoveryEngine.ts:411-414` does the same. A user who grants cloud-sync consent and **declines** the sensitive-health consent would still upload medication history. | **MAJOR (latent)** | New subsystem |
| **RED-007** | **Minors gate fails open on unknown age.** `calculators.ts:84` `age > 0 && age < ADULT_MIN_AGE` classifies `age = 0`/absent as **adult**; `onboardingProfile.ts:298` defaults a missing age to 24. Safe default for a safety gate is "unknown ⇒ restricted". | MINOR | **SAME on `main`** |
| **RED-008** | **Import accepts ages below the locked floor.** `customization.ts:361` `age: [5, 120]` against the declared `AGE_RANGE = {min:13,max:100}` (`config/profileDomain.ts:38`). Bounded harm (goal restriction still applies) but contradicts the 13+ store claim. | MINOR | **SAME on `main`** |

**RED-009 is the one to hold onto.** It is dormant *only* because `VITE_SYNC_ENABLED` is off
and set nowhere in the repo, CI, `wrangler.toml`, or `.env.example`. It contradicts charter §8
locked decision 5 (sensitive health data syncs only behind separate explicit consent) and it
**must land before that flag is ever set true** — the day the flag flips is the day the promise
breaks. It is recorded as a PLAN task, not fixed here.

---

## 14. Canonical-ground selection test (§10)

| # | Criterion | Verdict |
|---|---|---|
| 1 | `main` is an ancestor, or every main-only change accounted for | **PASS** — strict ancestor, 0 behind |
| 2 | No known valuable branch silently lost | **PASS** — 81 branches ledgered; `STITCH-01` named; 13 preservation tags proposed |
| 3 | No known security/safety regression knowingly preferred | **PASS with conditions** — RED-009 (latent), DEFECT_6 (new), step-goal editor: all named, none silent |
| 4 | Live surface at least as complete | **PASS** — materially more complete; one named loss (step-goal editor) |
| 5 | Migration state coherent or blockers isolated | **PASS** — collision fixed and guarded by `test:migration-version`; none applied to production (founder action) |
| 6 | Tests understood, not blindly trusted | **PASS** — 140-step gate mapped, 44 exclusions enumerated, 16 dead-surface proofs named, vacuity patterns identified |
| 7 | Environment/release behaviour understood | **PARTIAL** — deployment identity UNKNOWN (§9); shard dependency now understood (§12.2) |
| 8 | Unique local work accounted for | **PASS** — none exists in this container; scope limit stated |
| 9 | Reproducible from durable sources | **FAIL as-is** — untagged SHA + 91 MB gitignored dependency (§12) |
| 10 | Remaining gaps expressible as PLAN tasks | **PASS** |

### Result

```
CANONICAL_GROUND_RESULT = CANONICAL_GROUND_REQUIRES_COMPOSITION
BASE_BRANCH = claude/qimmah-recovery-control-plane-hph1jg
BASE_SHA    = dc031fa36929e07c3b00fa025a676ed64327ce59
```

Not `FOUND`, because criterion 9 fails today and one real stitch item exists.
Not `UNKNOWN`, because the base is settled by containment over all 81 branches, not by name.

### STITCH MAP — **NOT EXECUTED**

| STITCH-ID | Source | Content | Why needed | Order | Risk | Proof required after adoption |
|---|---|---|---|---|---|---|
| **PRESERVE-01** | — | Tag `dc031fa` (e.g. `ground/v1-rc-20260818`) | The ground is anchored only by a mutable branch ref (§12.1) | **First — before anything else** | None (additive) | `git tag --points-at dc031fa` non-empty |
| **PRESERVE-02** | — | Archive tags for the 13 untagged unique-work branches (§1) | Hardening before any future cleanup wave | Second | None (additive) | Each SHA tag-reachable |
| **STITCH-01** | `codex/qimmah-final-release-convergence-001` @ `df10b88f5b91f4d1674fc75f922f2ac9c29f8def` | `scripts/release/static/regression-ledger.mjs` — the `BUG-019` literal bare-render-site patterns (`1937`, `اليوم 1 · علوي`, `4 أيام/أسبوع`) absent from the candidate's rewrite | The two ledgers diverged; neither supersedes the other | After PRESERVE-01 | Low — test asset only, no product code | Merged ledger fails on a seeded bare-render regression |
| **STITCH-02** | `main` @ `cc60adf` | 4 journey `manifest.json` / `fingerprints.json` | `npm run journeys:sheet` is broken until regenerated (§3) | Any time | Low | `journeys:sheet` runs clean |

**Nothing else needs porting.** Notably **excluded by decision, with reasons on record:** the
81 watermarked GIFs (legal risk), `20260811120001_purchase_integrity.sql` (would reopen four
proven holes), and the QAE engine (out of V1 scope — preserve, founder decision).
