# QIM-008 — Application and web repository split decision

This is a decision package only. It does not create `qimmah-app` or `qimmah-web`, move files, change a remote, deploy Cloudflare, change iOS settings, or begin SwiftUI. Any execution step below is a separate founder-approved REVIEW package.

## Decision

Adopt **two repositories immediately after a controlled, history-preserving split**:

- `qimmah-app` owns the iPhone product, the temporary React/Capacitor legacy reference, native iOS work, Supabase schema/sync, app contracts, and all active product development.
- `qimmah-web` owns the public marketing, privacy, terms, support, AASA, and website deployment surfaces.

The QIM-008 analysis source was `km5g98str4-commits/qimmah`, branch `codex/qimmah-execution`, commit `ed640f0b96a46ce976eb89f2c92fc64636d5aed2`; it is historical evidence only, not an execution source. Any future split must instead start from the reviewed controlled-integration tag `integration/converged-reviewed-2026-08-09`, at the exact commit to which that tag resolves after its final gates and independent reviews. The official historical baseline remains `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de`. Detailed file, deployment, backend, Git/worktree, and GitHub evidence is in [QIM-008-repository-boundary-scan.md](evidence/QIM-008-repository-boundary-scan.md).

## Target architecture and non-negotiable boundaries

- SwiftUI is the final application architecture and its future minimum is iOS 17+.
- React/Capacitor remains in `qimmah-app` as the stable legacy reference until native parity and an approved cutover. It must **not** be moved into `legacy/**` before a native scaffold exists; that would be a noisy move without an ownership gain.
- A user must never be exposed to a mixed SwiftUI/WebView runtime. The native app and the legacy reference remain separately built, separately tested surfaces until a cutover decision.
- Website feature work is frozen. Only legal, security, AASA, support, and founder-required Premium-access work may change `qimmah-web`.
- No third shared-code repository is created in this decision. Executable product/data contracts remain with `qimmah-app`; cross-repository public-link contracts use one named owner and a two-repository review gate.

## Ownership matrix

| Current path / authority | `qimmah-app` decision | `qimmah-web` decision | Boundary rule and evidence |
| --- | --- | --- | --- |
| `src/**` | Owns all current React runtime, models, auth/sync client, PlanEngine, dictionaries, and product behavior as legacy reference until native parity. | No copy. | `src/main.tsx` and `src/App.tsx` are the live runtime chain. |
| `ios/**` | Owns the Capacitor shell, native plugins, assets, signing/project metadata, and later SwiftUI implementation. | No copy. | Current target is 15.0; changing to iOS 17+ is a separate REVIEW decision. |
| `site/**` | No long-term ownership; remove from app only after the web repository passes its own static verification and deployment cutover. | Owns static marketing, support, public privacy/terms, press, fonts, assets, headers, robots, and sitemap. | The static-site tree is largely self-contained at `site/**`; AASA is the explicitly recorded exception. |
| `docs/site/**` | No long-term ownership. | Owns static-site deployment, QA, handoff, and site-copy records. | Four site-operation documents already describe `site/`. |
| `docs/legal/**` | Consumes the approved public/legal contract without copying its source documents. | Owns policy/source documentation and the reconciliation of public legal/support copy. | Public and internal legal text must not have competing canonical owners. |
| `supabase/**`, `SUPABASE-SCHEMA.sql`, `infra/docker/docker-compose.supabase.yml`, `scripts/db/**` | **Supabase remains in `qimmah-app`.** It serves app auth/sync and is coupled to client sync tables, RLS, migrations, account deletion, and database proofs. | No schema/migration authority. | Website must not carry service-role or migration authority. |
| `src/types/**`, application schemas, PlanEngine fixtures | Owns all executable product and data contracts. | Consumes no package in the first split. | Do not make a speculative shared package. Extract only after two independently released consumers prove a need. |
| Cross-repository AASA/link contract | Owns the bundle ID and associated-domain/client behavior. | Owns the served AASA artifact and public-domain deployment. | Any app-ID, domain, or path change requires joint REVIEW. Current AASA contains an owner placeholder and cannot be blindly promoted. |
| `scripts/**` | Retains application build, native, database, media, fixtures, e2e, and proof scripts initially. | No duplicated script authority. A later web package must rehome/replace `scripts/run-site-truth-proof.mjs`, which is currently called by app `test:gate`. | Do not copy a script and allow it to drift in two repos. |
| `public/**` | Retains PWA files, service worker, redirects/headers for the legacy Vite build, app icons, exercise media, and all non-AASA assets initially. | Receives AASA only in its dedicated deployment cutover, at `site/.well-known/apple-app-site-association` or an equivalent single web-owned deploy path. | `public/**` is mixed today; it must not be bulk-moved. |
| `package.json`, `package-lock.json`, Vite/Tailwind/TypeScript configs | Sole application package/dependency authority. | No app package or lockfile. If web later needs tooling, it gets a small web-only package in a separate review. | Prevents two owners for React/Capacitor dependencies and `test:gate`. |
| `wrangler.toml`, Cloudflare Pages | Current file is app `dist`-oriented and is not safe to copy. It loses public-site deployment authority after a verified cutover. | Sole owner of the future public-domain Pages configuration and deploy credential mapping. | Exactly one active Pages config/deploy authority for the public domain. Current `dist` vs `site/` discrepancy is an investigation gate. |
| `.github/workflows/**` | Owns the current Node/app CI (`ci.yml`, `nightly.yml`). | Gets separate, minimal static-site CI only after repository creation; do not copy app CI. | Current workflows build/test the app and do not deploy Cloudflare. |
| `.env.example` and environment configuration | Owns Vite/Supabase/sync/monitoring/media/database-verification variable definitions. | Holds only a future web deployment variable template, without secrets. | `.env`, local `.env.*` values, service-role keys, provider tokens, signing credentials, and Cloudflare secrets never enter either repository; the reviewed placeholder `.env.example` is the sole exception. |
| `docs/**` other than `docs/site/**` and `docs/legal/**` | Owns product, data, iOS, App Store, proof, release, restructuring, and engineering records. | No copy by default. | A document moves only when its active maintainer and source of truth are web-owned. |

## Approach comparison

| Approach | Benefit | Main risk / cost | Rollback quality | Decision |
| --- | --- | --- | --- | --- |
| Two repositories immediately | Establishes clear product/deployment authority before SwiftUI begins; freezes website scope structurally; avoids duplicate app package/deploy ownership. | Requires a carefully reviewed history filter, deployment handover, and test rehoming. | Strong when source tag, mirror, manifests, and no DNS cutover are retained. | **Recommended.** |
| Temporary monorepo with app/web boundaries | Lowest short-term migration effort. | Keeps package, workflow, and deploy authority shared; freeze rules depend on discipline and legal/AASA drift remains easy. | Easy local rollback, weak ownership enforcement. | Not selected. |
| Native repository first; web extraction later | Lets native work start quickly. | Leaves website/deployment/legal/AASA mixed with legacy app for longer and creates a third active source before web ownership is clean. | Web rollback remains ambiguous. | Not selected. |

## Safest controlled split sequence

Every numbered operation below is REVIEW-gated. None is authorized by this document alone.

1. **Preserve.** Confirm the reviewed integration worktree is clean; resolve `integration/converged-reviewed-2026-08-09` to its immutable commit, create a new immutable `restructuring/pre-repository-split-<short-integration-sha>` tag at that exact commit, then create clean branch `split/source-<short-integration-sha>` from it. Do not reuse `codex/ui-polish`, current PR branches, or a working tree with local changes.
2. **Mirror.** Make a read-only bare mirror of the tag and write a source manifest of path, Git blob ID, and SHA-256 bytes for each selected file. Store the commit/tag identity and filter-repo commit map outside deployment secrets.
3. **Create private empty destinations.** The founder creates `qimmah-app` and `qimmah-web` with no generated README/license/CI. Add no production deployment, DNS, Cloudflare, or Supabase credential at this point.
4. **Filter history, do not copy trees.** From disposable clones of the mirror, use `git filter-repo` path filters. `qimmah-web` receives `site/**`, `docs/site/**`, and `docs/legal/**`. `qimmah-app` receives the exact complement of that web allowlist among tracked source paths, except the three explicit expected exclusions below. The routing manifest must assign every tracked source path to exactly one destination or one named expected exclusion, with no overlap. `public/.well-known/**`, `wrangler.toml`, and `scripts/run-site-truth-proof.mjs` are intentionally excluded from both first-extraction allowlists because each has a dedicated cutover decision below.
5. **Verify bytes and history.** For every retained path, compare source and destination manifest path/blob/SHA-256 values; run `git fsck --full`, inspect the filter map, run `git diff --check`, and compare the selected trees byte-for-byte. Path-renamed AASA is excluded until its separate handover and therefore has an explicit expected-difference record.
6. **Verify CI before use.** `qimmah-app` must pass its clean-install typecheck, lint, build, PlanEngine golden proof, and applicable deterministic gate after its website-test dependency is removed in a separate review. `qimmah-web` must pass static link/asset/CSP checks and a web-owned replacement for the current site-truth proof. Neither repository is production-authoritative until these pass.
7. **AASA and Cloudflare cutover, separately.** Reconcile the source AASA app ID and the actual Apple Team/domain first. Then introduce exactly one website-owned AASA serving path and one Pages configuration that deploys `site/`; verify its HTTPS content type, public path, and Apple association behavior. Retire—not duplicate—the old public-domain deployment authority only after confirmation.
8. **Freeze and operate.** Make `qimmah-app` the sole active product-development repository. Freeze `qimmah-web` to the allowed legal/security/AASA/support/Premium scope. The legacy React/Capacitor tree remains in place in `qimmah-app` until a separately approved native parity/cutover program.

## Exact first migration wave

The first executable wave is **repository preparation and filtered extraction only**:

- input: tag and clean branch from `ed640f0…`;
- output: two private repositories with filtered history and no production remote/deploy cutover;
- web selection: `site/**`, `docs/site/**`, `docs/legal/**`;
- app selection: the exact tracked-source complement of the web allowlist, excluding the three named cutover files; this includes application, iOS, backend, contracts, tests, product documentation, CI, and the legacy runtime;
- excluded from both migration commits pending their own REVIEW: `wrangler.toml`, `public/.well-known/apple-app-site-association`, and `scripts/run-site-truth-proof.mjs`.

The exclusions are deliberate. They prevent an incorrect `dist` Pages configuration, an AASA placeholder, or a duplicate test/deployment authority from entering the new repositories under the appearance of a clean split.

## No-action list and investigation gates

The first split commit must **not** refactor, path-restructure, or alter behavior in:

- `src/**`, `ios/**`, `supabase/**`, `package.json`, `package-lock.json`, `capacitor.config.ts`, or `vite.config.ts` as a behavior refactor;
- any database migration, RLS policy, sync/consent behavior, PlanEngine fixture, calculator, route, wrapper, or product UI;
- `wrangler.toml`, `public/.well-known/apple-app-site-association`, `public/_headers`, `public/_redirects`, or `scripts/run-site-truth-proof.mjs` without deployment/test authority review;
- Cloudflare project configuration, DNS, custom domains, GitHub Actions secrets, Supabase project settings, Apple signing/Team settings, or deployment credentials;
- `.env`, local `.env.*` values (except the reviewed placeholder `.env.example`), `SUPABASE_SERVICE_ROLE_KEY`, `WORKOUTX_API_KEY`, Cloudflare API tokens, GitHub tokens, signing certificates/profiles, or any provider secret.

Additional investigation is required for the real Cloudflare project/domain mapping, the AASA Team ID and domain association, legal-copy reconciliation, site-truth test rehoming, and the iOS-15-to-iOS-17 native target change.

## Pre-cleanup blockers carried from QIM-005

These do not block the repository decision or initial filtered extraction. They block later legacy deletion and require separate REVIEW packages:

1. **V2 active-workout portability disposition.** `qimmah:active-workout:v2:<owner>` is marked exported while the inspected portability registry names a different active-session key.
2. **Manual measurement-entry ownership.** `ProgressV2` is the only observed manual UI writer to `measurementLog.addLog`, although `ProgressView` is the live route owner.

## Rollback and freeze

Before DNS or Pages cutover, rollback means abandoning the new private destination branches and returning to the preserved source tag/mirror; no user data, schema, or production traffic is touched. After a verified website cutover, rollback means retargeting the single Pages deployment/DNS association to the previously verified artifact—not force-pushing, deleting branches, or creating a second live deploy path. Supabase stays untouched throughout.

No native/SwiftUI work starts under this decision. The iOS 17+ target is recorded as future architecture direction, while the current legacy shell remains unchanged until its own approved native-foundation package.
