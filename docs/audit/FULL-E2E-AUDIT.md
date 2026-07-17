# Qimmah — Full End-to-End Audit

**Audit date:** 2026-07-16 (Asia/Riyadh)

**Frozen base:** `80e31f7bb62970954c9fa3f33c365ecc88c8e6a1`

**Verified remote at start:** `origin/design/v21-promotion` → `80e31f7` — `proof(promotion): refresh three-profile smoke screenshots (final gate re-run)`

**Branch:** `audit/full-e2e-report`

**Mutation boundary:** only `docs/audit/**`; product source was read-only and no defect was fixed.

## Verdict

## **NO-GO for owner-device week**

There are no observed P0 failures, but the exposed legacy Settings importer accepts incompatible and cross-owner-shaped files and reports success (QEA-001, P1). Production account deletion is still an unverified deployment dependency (QEA-002, P1), and the exact offline production artifact could not be exercised under the write-only audit boundary (QEA-003, P1 verification gap). These are release-evidence blockers, not permission to fix source in this branch.

## Skills used

- **verification-before-completion** — substituted for requested `verify/testing`; every pass claim below has a fresh command result.
- **security-review** — attacker-controlled imports, owner scoping, recovery, XSS, tokens, and destructive account actions were traced before reporting.
- **a11y-audit** — one-off pre-owner WCAG 2.1 AA gate across runtime routes, three widths, static semantics, and contrast spots.
- **code-review** — reviewed the frozen implementation against the supplied persona specification; no source modifications.
- **git-worktree-manager** — confirmed the dedicated clean worktree/branch and kept all work isolated to it.

## Evidence index

- Runtime aggregate: [`evidence/runtime-results.json`](evidence/runtime-results.json) — **150/150 passed** after the corrected session and legal-link run.
- Targeted hostile/offline run: [`evidence/targeted-results.json`](evidence/targeted-results.json) — expected negative evidence for the two import failures and the audit-build offline limit.
- Sanitized command/source excerpts: [`evidence/static-evidence.txt`](evidence/static-evidence.txt).
- Screenshots: [`fresh-dashboard.png`](evidence/fresh-dashboard.png), [`reviewer-dashboard.png`](evidence/reviewer-dashboard.png), [`veteran-dashboard.png`](evidence/veteran-dashboard.png), [`reset-public.png`](evidence/reset-public.png).
- Reproducible audit drivers: [`e2e-audit-runner.mjs`](e2e-audit-runner.mjs), [`targeted-persona-runner.mjs`](targeted-persona-runner.mjs).

The three seed tools were run exactly as requested (`fresh`, `reviewer`, `veteran`). Their generated snippets were used at runtime, SHA-checked, then removed rather than committing user-shaped bulk data. The flagless bundle was built into a temporary `docs/audit/**` outDir; generated bundles were removed after testing.

## Findings

| ID | Persona | Severity | Reproduction | Evidence | Suggested fix owner |
|---|---|---:|---|---|---|
| **QEA-001** | المخترق | **P1** | Sign in with seeded account → `#/settings` → import JSON with `version: 999` and `profile.name=WRONG_VERSION_ACCEPTED`; accept confirmation. Repeat with `ownerId=owner-b` and `profile.name=OWNER_B_INJECTED`. Both show the success alert and mutate the current profile. | [`targeted-results.json`](evidence/targeted-results.json) (`hostile-wrong-version`, `hostile-cross-uid`); [`static-evidence.txt`](evidence/static-evidence.txt) (`IMPORT-LEGACY`). The hardened ProfileV2 path separately passed 44/44, proving two exposed import contracts disagree. | Data portability owner: remove/redirect the legacy `SettingsView` importer so every entry point uses `readFileText` → `parseImportFile` → preview → owner-checked atomic apply. |
| **QEA-002** | مراجع أبل | **P1** | Settings → Delete account → typed confirmation. Client and SQL migration exist, but destructive completion needs the production `delete_own_account` RPC. Its deployment remains unchecked in the frozen repo and could not be called without an OWNER test account. | [`static-evidence.txt`](evidence/static-evidence.txt) (`ACCOUNT-DELETION`); repo checklist `docs/MERGE-DEPLOY-PLAN.md:33` is still unchecked. | Backend/release owner: deploy migrations, run `npm run db:verify` against production with throwaway A/B users, capture auth-user deletion plus row/RLS proof. |
| **QEA-003** | المستخدم / مراجع أبل | **P1** verification gap | Build to the only authorized location (`docs/audit/**`), visit workout online, then kill network and reload. The audit build's SW never becomes ready because the build hook post-processes only hard-coded `dist/*`; reload returns `ERR_INTERNET_DISCONNECTED`. This does **not** prove the normal production `dist` fails. | [`targeted-results.json`](evidence/targeted-results.json) (`service-worker-ready-in-audit-build`, `offline-kill-reload`); [`static-evidence.txt`](evidence/static-evidence.txt) (`OFFLINE-AUDIT-LIMIT`). | Build/release owner: make the SW hook honor resolved `build.outDir`, or authorize a standard `npm run build` artifact for an isolated audit; rerun connected-install → mid-session offline → kill/reopen on device. |
| **QEA-004** | المستخدم | **P2** verification gap | The fresh browser E2E covers cut → gym → mixed, consent validation, forced failure/retry, and 320px RTL. There is no repository test enumerating every goal × equipment/preference path, and the existing full journey writer targets `docs/appstore/**`, forbidden by this audit's write boundary. | Fresh onboarding E2E **11/11**; onboarding state proof **29/29**; [`static-evidence.txt`](evidence/static-evidence.txt) (`GATES`). | QA owner: parameterize the browser journey output directory and table-drive every goal/equipment branch plus reload-resume. |
| **QEA-005** | A11Y | **P2** | Load an authenticated main route and press Tab from the address bar. App chrome precedes the main region and no “skip to main content” target is present; repository search finds no skip-link implementation. | [`static-evidence.txt`](evidence/static-evidence.txt) (`A11Y`). Other automated AA checks passed, so this is a focused WCAG 2.4.1 issue rather than a general semantics failure. | Design-system/accessibility owner: add a first-focus skip link to a stable `main` target and include keyboard regression coverage. |
| **QEA-006** | المستخدم / المخترق | **P2** verification gap | Duplicate-email localization requires a live Supabase account. Exhaustive XSS entry through *every* free-text editor requires a parameterized UI inventory; the runtime profile-name probe passed, but it is not every field. Hard cap was respected and no fake result was substituted. | Password/age policy **14/14**; profile-name XSS runtime passed; no console token leak across three profiles in [`runtime-results.json`](evidence/runtime-results.json). | Auth + QA owners: run the live-auth suite with disposable duplicate account and add a generated free-text-field XSS matrix. |

## Persona 1 — المستخدم الحقيقي

| Requested journey | Result | Evidence / limitation |
|---|---|---|
| Welcome and flagless first render | **PASS** | Real preview; welcome copy rendered, no PWA install banner; three dashboard screenshots retained. |
| Signup: bypass 12+, weak password | **PASS** | Submit is disabled unless name + valid 8+/letter/number password + age/policy checkbox; submit guard rechecks eligibility. Policy proof 14/14. |
| Duplicate-email UI | **BLOCKED** | Requires a live disposable Supabase user; no OWNER credentials were used. QEA-006. |
| Onboarding validation, consent, failure/retry | **PASS** | Browser E2E 11/11, zero console errors. Draft/owner/retry model 29/29. |
| Every goal/equipment branch and reload-resume | **PARTIAL / BLOCKED** | Cut/gym/mixed executed; model validation covered. No exhaustive matrix. QEA-004. |
| Today ×3 states | **PASS** | `newUser`, `normal`, `afterWorkout`: 32/32 model assertions; fresh/reviewer/veteran rendered. |
| Workout sets/edit/rest/2-minute background/kill-resume/finish | **PARTIAL** | Active-session proof 31/31 includes weight persistence, owner isolation, stale rejection, 90s rest and exact two-minute background arithmetic. Strength 33/33 covers plates/PR/e1RM. A fresh full browser gesture journey could not write its hard-coded evidence path. |
| Progress/Today/Profile move after finish | **PASS at model/storage layer; browser gesture partial** | Today 32/32, Progress 11/11; reviewer/veteran runtime renders. |
| Nutrition Arabic/Saudi search, water, pillar math | **PASS at data/model layer** | Saudi/Arabic search/calculation proof 57/57; Today pillar assertions pass. Full `test:food-db` runner was blocked because it writes `scripts/.food-db.bundle.mjs` outside audit scope. |
| Insights honesty/thin-data abstention | **PASS** | 28/28: hedged `~`/تقديري, insufficient-data abstention, stale input, deterministic priority. |
| Notification toggles | **PASS at engine layer** | 30/30: owner isolation, corrupt prefs fallback, quiet hours, five types, permission denial, recovery and race guards. Physical notification UI remains owner-device work. |
| Export → wipe → import → deep-equal | **PASS on hardened path; FAIL on exposed legacy path** | Hardened portability 44/44 plus data export 12/12. QEA-001 records the separate Settings entry-point defect. |
| Logout → user B → zero residue | **PASS** | Isolation 28/28; A→B, sign-out wipe, future unknown keys, language allowlist. |
| Loading/empty/error states | **PARTIAL PASS** | Designed global/route boundaries, skeletons, empty states, onboarding error/retry, barcode/notification/import errors were found. Exhaustive forced error on every screen was not available as a single harness. |

## Persona 2 — مراجع أبل

| Review surface | Verdict |
|---|---|
| Account deletion | UI and honest failure path exist; production completion **BLOCKED/P1** by QEA-002. |
| Privacy/terms | **PASS** — both actual `/legal/*.html` links return 200 with substantive content. |
| Camera copy | **PASS static** — `NSCameraUsageDescription` is barcode-specific; camera frames are documented as local/non-persistent. Physical prompt is OWNER-gated. |
| PWA banner | **PASS** on flagless web preview and native guards; no banner observed. |
| External purchase language | **PASS static** — no enabled subscription/purchase CTA; Qimmah+ is disabled/informational. |
| 12+ age gate | **PASS** — UI disable + submit guard. It is self-attestation, as designed. |
| Health consent | **PASS** — starts false, blocks first transition, enters saved source-of-truth. |
| Genuine offline | **BLOCKED** for exact audit artifact, QEA-003. Source and prior harness exist, but this audit does not promote historical proof to a fresh pass. |
| `#/reset` | **PASS** — expired-link state renders a designed Arabic recovery screen; screenshot retained. |

### Guideline 4.2 native-evidence verdict

**Conditional evidence, not an owner-device pass.** This base contains camera barcode scanning, local-notification scheduling, custom URL/deep-link handling plus associated domains, and an offline app-shell design. `@capacitor/haptics` and HealthKit are **not merged at `80e31f7`**; the UI model explicitly reports health sharing unavailable. The available native set is materially more than a repackaged marketing website, but 4.2 remains OWNER-device/App Review judgment until camera, permission prompts, notification delivery, deep links, and offline reopen are exercised on the signed binary.

## Persona 3 — المخترق

| Attack | Result |
|---|---|
| Malformed import | **PASS** — rejected cleanly. |
| Wrong-version import | **FAIL (P1)** on legacy Settings path; hardened ProfileV2 path rejects. |
| Oversized import | **PASS** in runtime probe; hardened importer also enforces byte/node/depth ceilings. |
| Cross-UID-shaped import | **FAIL (P1)** on legacy Settings path; hardened importer rekeys to current owner and passed isolation proof. |
| Corrupt owner-scoped localStorage | **PASS** — 39 actual key corruptions across fresh/reviewer/veteran, no white screen; 150/150 aggregate runtime checks. |
| Crafted cross-user reads | **PASS** — isolation 28/28 and portability 44/44. |
| Recovery triggers sync/wipe | **PASS** — reset/recovery 33/33; notifications and import are recovery-gated. |
| XSS free text | **PARTIAL PASS** — React-escaped profile-name payload did not create an image or execute; exhaustive all-field matrix is QEA-006. No `dangerouslySetInnerHTML` attacker flow was found. |
| Secret/token in console | **PASS for executed routes** — zero console matches across three profiles; npm audit found 0 vulnerabilities. |

## RTL + accessibility sweep (WCAG 2.1 AA)

- **320 / 768 / 1280:** 54 authenticated route/viewport combinations across three data profiles, zero horizontal overflow.
- **Semantics:** Arabic `lang`, RTL root, no positive `tabindex`, no unnamed dashboard buttons, and no images missing `alt` in the runtime sample.
- **Console/render:** 150/150 runtime checks, zero console/page errors and zero token-pattern matches.
- **Contrast spots:** muted text 5.64:1, blue link text 5.30:1, strong ink 17.25:1 on the warm canvas — all AA normal-text passes.
- **Reduced motion:** contexts were created with `reducedMotion: reduce`; an exhaustive computed-animation assertion was not available and is not claimed.
- **Keyboard:** no positive tabindex/trap observed in automation, but the missing bypass link is QEA-005.

## Verification ledger

| Gate | Fresh result |
|---|---|
| TypeScript (`tsconfig.app` + `tsconfig.node`, no emit) | PASS |
| Flagless Vite production transform | PASS — 2,098 modules; output isolated under audit and removed afterward |
| ESLint, zero warnings | PASS |
| Browser onboarding | PASS — 11/11, zero console errors |
| Three-profile runtime + corrupt-key + RTL sweep | PASS — 150/150 |
| Security/data proofs | PASS except exposed legacy importer finding |
| Dependency audit | PASS — 0 vulnerabilities |
| Exact production SW/offline | BLOCKED — QEA-003 |
| Live Supabase auth/deletion | BLOCKED — QEA-002/QEA-006 |

## Top five actions before changing verdict

1. Route **all** imports through the hardened portability pipeline; delete or redirect the legacy Settings importer.
2. Deploy and destructively verify `delete_own_account` plus RLS on production with disposable A/B accounts.
3. Produce a standard flagless `dist` artifact and rerun connected-install → mid-workout network kill → process kill/reopen.
4. Parameterize the full browser journey to write under an injected evidence directory; enumerate every goal/equipment path.
5. Add the WCAG skip link, then run keyboard/focus/reduced-motion checks and live duplicate-email/all-free-text XSS matrices.

## ≤12-line handoff summary

1. Frozen shipping base verified: `origin/design/v21-promotion` at `80e31f7`.
2. Source stayed read-only; only `docs/audit/**` changed.
3. Verdict: **NO-GO** for owner-device week; 0 P0, 3 P1 blockers/gaps, 3 P2 findings/gaps.
4. Flagless core bundle, TypeScript, lint, dependency audit, and browser onboarding passed freshly.
5. Three seeded profiles completed a 150/150 route/RTL/storage/console sweep.
6. Hardened portability passed 44/44, isolation 28/28, but legacy Settings import accepts wrong-version/cross-owner payloads.
7. Today, Progress, insights, strength, notifications, recovery, and active-session proofs are green.
8. Arabic/Saudi nutrition search and plan math passed 57/57.
9. Production account deletion remains OWNER/backend-deployment blocked.
10. Exact offline reopen is unverified because the SW hook hard-codes `dist` outside the authorized audit write surface.
11. Native 4.2 evidence exists for camera/notifications/deep links/offline design; HealthKit/haptics are absent at this base.
12. Fixes belong in a separate gated wave; none were applied here.
