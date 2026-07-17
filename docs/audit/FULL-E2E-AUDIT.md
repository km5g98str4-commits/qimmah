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

## Consolidation resolution — `design/v21-promotion` (2026-07-17)

The audit above is a frozen point-in-time record against `80e31f7`. The grand consolidation
merged every fix branch onto `design/v21-promotion` (HEAD `7b35435`). Per-finding disposition,
each with a merge commit (FIXED) or an owner pointer (OWNER — cannot be closed in-branch):

| ID | Disposition | Commit / pointer | Re-verification against the audit's own vectors |
|---|---|---|---|
| **QEA-001** legacy Settings importer accepts wrong-version/cross-owner | **FIXED** | `78aaf66` (merge of `f4b2f95` `fix/secure-import-pipeline`) | Legacy `onExport`/`onImport` deleted; `SettingsView` now renders `DataManagementPanel` routing export/import exclusively through `readFileText → parseImportFile → preview → applyImport` (atomic, owner-rekeyed, undo). **`test:e2e:settings-security` 34/34** — every hostile vector (v999, `__proto__`, unknown store, cross-owner) rejected with zero `localStorage` mutation; valid round-trip + A→B zero-residue pass. |
| **QEA-002** production account deletion RPC unverified | **OWNER** | RC-CHECKLIST → "Production `delete_own_account` + RLS proof" | Client + SQL migration present; destructive completion needs the production RPC deployed and `npm run db:verify` run against prod with disposable A/B users. Not closable under any code branch. |
| **QEA-003** exact offline reopen unverified (SW hook / audit-build limit) | **OWNER** (verification gap) | `docs/reliability/CHAOS-REPORT.md` (GO for offline-first) + RC-CHECKLIST on-device offline reopen | Root cause was the audit's `docs/audit/**` write boundary, not a production defect; the flagless `dist` build honors the SW. Offline-first resilience now proven at the logic layer by **chaos 57/57 / 12 invariants**. On-device connected-install → network-kill → process-kill/reopen stays owner work. |
| **QEA-004** no exhaustive goal×equipment matrix | **OWNER / tracked debt** | Tech-debt item below + RC-CHECKLIST QA row | Journey E2E covers cut/gym/mixed + model validation; a fully table-driven goal×equipment×reload matrix remains QA scope. |
| **QEA-005** missing WCAG 2.4.1 skip-link | **FIXED** | `4b8f266` (merge of `9c5520b` `ux/core-product-polish`) | `MobileShell` renders a first-focus `a[href="#main-content"]` ("تخطَّ إلى المحتوى / Skip to content") targeting `<main id="main-content" tabIndex={-1}>`; safe-area `--safe-top`/`--safe-bottom` paddings applied. Verified in source + native launch (safe-area clears notch/home-indicator). |
| **QEA-006** duplicate-email localization + exhaustive XSS matrix | **OWNER** (live Supabase) | RC-CHECKLIST live-auth row | Password/age policy 14/14 and runtime profile-name XSS pass; live duplicate-email + generated all-free-text XSS matrix need a disposable Supabase account. |

### New guarantees added by the consolidation (beyond the original audit scope)

| Area | Commit | Re-verification |
|---|---|---|
| Hydration safety cap + minor-BMI phrasing | `b9f0e42`/`1d910cb` (`fix/scientific-guardrails`, already on promotion base) + `bd95db9` (`docs/formula-verification`) | **111/111 formula vectors.** Water caps **≤4.0 L** at 250 kg (was 9.0) and never exceeds cap at 115/150/200/250 kg; ages 12/15/17 (M+F) all receive the safe specialist-referral BMI label with number+plan-note retained; age 18 gets the adult label. |
| Media rights remediation | `2f9f1b2` (merge of `1d4d64f`) | **FITWILL asset deleted** (returns SPA fallback, not an image); 24 unsafe machine assets replaced by in-house SVG schematics. `media-rights-proof` **inventory=274, 250 CLEARLY-LICENSED + 24 IN-HOUSE, UNKNOWN=0, RESTRICTED=0**; 3 schematic SVGs render (HTTP 200, valid `<svg>`). |
| Chaos / data-loss resilience | `315746c` (merge of `8bc825b`) | **chaos 57/57**, 12 invariants, seed=1337, 0 data-loss / 0 account-mix / 0 false-success; quota-on-load read-path crash fixed. |
| Observability + HealthKit + haptics (wave6) | on promotion base | `test:observability` + `test:native-bridge` green. **Updates the Guideline 4.2 verdict above:** HealthKit steps + `@capacitor/haptics` are now merged (the audit noted them absent at `80e31f7`); `NativeSettingsPanel` + `nativeSettings` render the HealthKit row and haptics toggle. |

**Dedupe log (DEDUPE LAW — specialized branch kept, never applied twice):**
- **secure-import:** the earlier fix-wave's homegrown `0e293bf` (delete importer → redirect to ProfileV2, +5 vectors) was **superseded** by specialized `f4b2f95` (in-place hardened `DataManagementPanel` + 34-vector Playwright proof + security doc). Kept specialized on the `SettingsView.tsx` conflict; the homegrown's *separate* CustomizationCenter proto-pollution guard + portability vectors do not overlap and were retained.
- **media-rights:** the already-merged `content/media-rights` provenance manifest (pre-remediation NO-GO classification) conflicted add/add with specialized `1d4d64f`; kept specialized (post-remediation GO manifest with 24 IN-HOUSE) on all three provenance files. Complementary, not double-applied.
- **package.json:** script unions resolved keeping the **flagless** `test:e2e:journey` (promotion default) + adding `test:e2e:settings-security` and `test:chaos`.

### Consolidation verification ledger (fresh, HEAD `7b35435`)

| Gate | Result |
|---|---|
| typecheck / lint (`--max-warnings 0`) / flagless build | PASS (green after every one of the 6 merges) |
| `test:gate` (18 suites) | PASS |
| `test:observability` / `test:native-bridge` | PASS |
| `test:chaos` | PASS — 57/57 |
| `test:e2e:settings-security` | PASS — 34/34 |
| formula proof (`scripts/science/run-formula-proof.mjs`) | PASS — 111/111 |
| media-rights proof | PASS — 274/274 (24 IN-HOUSE) |
| `cap sync ios` | PASS |
| Native: `xcodebuild` (iPhone 17 Pro sim) → install → launch → screenshots | **BUILD SUCCEEDED**, interactive welcome UI, canonical mark, safe-area respected (`docs/proof/native/consolidation/`) |
| Web smoke | zero console errors on landing; canonical noded Ascent mark renders |

**Updated verdict:** the two in-code P1/P2 defects the audit could act on (QEA-001 import, QEA-005 skip-link) are **FIXED and re-verified**. The remaining blockers (QEA-002 prod RPC, QEA-003 on-device offline, QEA-006 live-auth) are **OWNER device/deployment gates**, not code defects — tracked in `docs/release/RC-CHECKLIST.md`. Promotion stays **UNMERGED** pending owner on-device verification.

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
