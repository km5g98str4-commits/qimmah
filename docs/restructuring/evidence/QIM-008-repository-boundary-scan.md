# QIM-008 — Repository-boundary evidence scan

Read-only evidence for the repository-split decision. This record neither creates repositories nor authorizes any path, history, remote, deployment, AASA, iOS, or database change.

## Snapshot identity

| Field | Value |
| --- | --- |
| Repository | `km5g98str4-commits/qimmah` |
| Current execution branch | `codex/qimmah-execution` |
| Evidence commit | `ed640f0b96a46ce976eb89f2c92fc64636d5aed2` |
| Official baseline | `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de` |
| Working tree before QIM-008 documentation | clean |
| Source remote | `https://github.com/km5g98str4-commits/qimmah.git` |
| Audit date | 2026-08-06 |

`git status --short --branch` reported `codex/qimmah-execution...origin/main [ahead 7]`. `git rev-parse HEAD` and `git rev-parse origin/main` produced the two commits above.

## Exact tracked-boundary inventory

Counts below are `git ls-tree -r --name-only <evidence-commit> -- <path>` results at the evidence commit; a `/**` entry means every tracked file under that named directory, including dotfiles. Root files are named literally.

| Boundary | Current paths | Count / evidence | Current role |
| --- | --- | --- | --- |
| Application runtime | `src/**`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | `src/**`: 429 files; `src/main.tsx:1-75` mounts React providers and `src/App.tsx:14-43,368-503` owns routing. | React/TypeScript/Vite product runtime and its static build configuration. |
| Legacy iOS shell | `ios/**`, `capacitor.config.ts` | `ios/**`: 35 files; `capacitor.config.ts:1-79`; `ios/App/App.xcodeproj/project.pbxproj:241,292,311,335` currently declares iOS 15.0. | Capacitor WebView shell, native plugins, signing/build settings, and legacy native assets. |
| Static website | `site/**` | 25 files; `site/index.html`, `site/support.html`, `site/privacy.html`, `site/terms.html`, `site/_headers`, `site/sitemap.xml`, `site/robots.txt`. | Static marketing, legal, support, and press surface. |
| Site operating docs | `docs/site/**` | 4 files: `DEPLOY.md`, `LAUNCH-HANDOFF.md`, `QA.md`, `SITE-COPY-ALIGNMENT.md`. | Static-site deployment, QA, and copy guidance. |
| Legal/support docs | `docs/legal/**`; public pages in `site/privacy.html`, `site/terms.html`, `site/support.html` | `docs/legal/**`: 6 files. | Internal legal evidence plus public legal/support renderings; the current sources must be reconciled before declaring one canonical copy. |
| Backend and schema | `supabase/migrations/**`, `infra/docker/docker-compose.supabase.yml`, `SUPABASE-SCHEMA.sql`, `scripts/db/**` | 12 migration files; 1 Docker compose file; 5 database scripts/docs. | Auth/sync schema, RLS, migration and verification surface. |
| Shared product contracts | `src/types/**`, `src/lib/**` product contracts, `tests/fixtures/plan-engine/v1/**`, `scripts/run-plan-golden-proof.mjs` | `src/types/**` and plan fixtures are part of the application source tree. | Executable application contracts, not a separate package today. |
| Product documentation | `docs/**` except `docs/site/**` and `docs/legal/**` | `docs/` contains product, design, data, iOS, App Store, proof, release, and restructuring records. | App engineering/product evidence; only the site/legal subsets fit the web boundary. |
| Build and verification | `package.json`, `package-lock.json`, `scripts/**`, `.github/workflows/ci.yml`, `.github/workflows/nightly.yml` | `scripts/**`: 310 files; package and lockfile are root files; two workflows. | Node-based app build, deterministic proofs, browser checks, and CI. |
| Built-web public assets | `public/**` | 290 files. | Mixed boundary: PWA/service-worker/assets and exercise media are application assets; `public/.well-known/apple-app-site-association` is a website-served AASA artifact. |
| Cloudflare configuration | `wrangler.toml`; deployment instructions at `docs/site/DEPLOY.md`; headers in `public/_headers` and `site/_headers` | `wrangler.toml:1-8`; `docs/site/DEPLOY.md:1-54`. | Two distinct deployment descriptions currently exist and must not become two authorities for the same public domain. |
| Environment template | `.env.example`; ignored local values through `.gitignore:28-31` | `.env.example:1-68`; `.gitignore:28-31`. | App build/runtime and database-verification variable contract. |

## Deployment and native ownership evidence

| Finding | Status | Evidence |
| --- | --- | --- |
| The committed `wrangler.toml` names Pages project `qimmah` with `dist` as build output. | verified | `wrangler.toml:1-8`. |
| The static-site deployment guide instead describes a no-build deploy of `site/` and its command names `qimmah-site`. | verified | `docs/site/DEPLOY.md:1-54`. |
| `public/.well-known/apple-app-site-association` is delivered by the Vite public tree today, not the `site/` tree. Its app ID still contains `OWNER-TO-CONFIRM`. | verified | `public/.well-known/apple-app-site-association:1-11`; `vite.config.ts:1-130`; no `site/.well-known/**` path exists in the inventory. |
| Legacy iOS is a Capacitor WebView shell; its current deployment target is 15.0, not the founder-approved future iOS 17+ target. | verified | `capacitor.config.ts:1-79`; `ios/App/App.xcodeproj/project.pbxproj:241,292,311,335`. |
| No GitHub Actions workflow deploys Cloudflare Pages or invokes `wrangler`; both workflows build/test the Node application and upload `dist`. | verified | `.github/workflows/ci.yml:32-76`; `.github/workflows/nightly.yml:45-116`; exact workflow search. |
| The actual Cloudflare Pages projects, DNS/custom-domain attachment, deploy credentials, and Apple Team/app-link association are not represented in tracked source. | external/unavailable | Repository-only review; no Cloudflare, DNS, or Apple developer-account access was used. |

## Backend and contract evidence

| Finding | Status | Evidence |
| --- | --- | --- |
| Supabase migrations establish the sync tables, owner-only RLS policies, and schema guard; database proofs compare client sync tables against migrations. | verified | `supabase/migrations/20260713120002_core_active_tables.sql`; `20260713120003_sync_target_tables.sql`; `20260713120005_rls_enable_and_policies.sql`; `20260726120005_p14_schema_guard.sql`; `scripts/db/run-schema-rls-proof.mjs:1-26`. |
| The migration guide explicitly describes the schema as serving the Capacitor iOS application's sync engine. | verified | `scripts/db/apply-guide.md:1-6,110-115`. |
| `.env.example` contains public Vite configuration, staging-only database verification variables, and a service-role key placeholder. The service-role key and WorkoutX key are explicitly documented as non-`VITE_*` values that must not be committed. | verified | `.env.example:1-68`; `.gitignore:28-31`. |
| The PlanEngine fixtures are application characterization assets pinned to the official source commit, rather than a standalone cross-repository schema package. | verified | `tests/fixtures/plan-engine/v1/manifest.json`; `scripts/run-plan-golden-proof.mjs`; `docs/restructuring/plan-engine-contract.md`. |

## Read-only Git, worktree, and GitHub evidence

| Finding | Status | Evidence |
| --- | --- | --- |
| Two clean worktrees exist: `codex/ui-polish` at `f3d2f6f829f322cbe86f8064702467dc0d566839` and this execution worktree at the evidence commit. | verified | `git worktree list --porcelain`; read-only Worktree Manager `list` output: 2 total, 0 dirty, 0 merged. |
| The execution branch tracks `origin/main` and is seven commits ahead; the source remote is the private GitHub repository named above. | verified | `git branch -vv`; `git remote -v`; read-only `gh repo view`. |
| The GitHub default branch is `main`. | verified | `gh repo view km5g98str4-commits/qimmah --json defaultBranchRef`. |
| Eight open PRs exist (#38, #39, #42–#47), all on historical `e/*`/`design/v21-promotion` chains rather than the execution branch. | verified | Read-only `gh pr list --state open`; heads and bases are recorded in `docs/restructuring/evidence/QIM-005-v2-reference-scan.md`. |
| No worktree, branch, tag, remote, PR, or deployment state was changed by QIM-008. | verified | This task used only read-only inspection before documentation staging. |

## Boundary hazards to carry into a future REVIEW package

1. `wrangler.toml` and `docs/site/DEPLOY.md` describe different Pages outputs/project names. The real deployed project and DNS ownership must be verified before any handover.
2. AASA is in `public/.well-known/`, while the founder-approved owner is the website. Its current app-ID placeholder makes a raw copy or deployment unsafe.
3. `scripts/run-site-truth-proof.mjs` is currently invoked by the application package's `test:gate`; it must be rehomed or replaced before the web directory can be removed from the app repository. Do not copy it into two authorities.
4. The future iOS 17+ minimum is approved direction, but the current Capacitor project declares 15.0. Raising it is a separate REVIEW package, not part of a split.
5. QIM-005 found two pre-cleanup blockers: the `qimmah:active-workout:v2:<owner>` portability disposition and the orphaned `ProgressV2` manual measurement-entry authority. They do not block this decision but block legacy deletion.
