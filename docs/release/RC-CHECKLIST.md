# Release-Candidate Checklist — Qimmah / قِمّة

Generated 2026-07-16. Two canonical branches, both **UNMERGED** pending the owner's
on-device verification:

- `integration/wave5` — the integrated commissioned trunk (v2 behind `VITE_DESIGN_V2=true`).
- `design/v21-promotion` — the promotion build (**v2 is the flagless default; v1 retired**).

> **Grand consolidation update (2026-07-17):** `design/v21-promotion` is now the **single shipping
> branch carrying everything** (HEAD `7b35435`). It contains wave5 + wave6-staging + the four wave6
> fix branches (secure-import, scientific-guardrails, media-rights, chaos) + both ux polish branches
> + the audit & formula-verification docs. Full gate is green after every merge; see §2.5 and the
> consolidation-resolution table in `docs/audit/FULL-E2E-AUDIT.md`. It remains **UNMERGED** to any
> trunk — owner's word only (§5).

## 1. Automated gate — `integration/wave5`

Fresh `npm ci` → `typecheck` (0) → `lint --max-warnings 0` (0) → `build` → `test:gate` → three-profile smoke.

| Suite | Checks | Status |
|---|---:|---|
| `active-session` | 31 | ✅ |
| `today-v2` | 32 | ✅ |
| `progress-v2` | 11 | ✅ |
| `data-portability` | 12 | ✅ |
| `portability` | 44 | ✅ |
| `notifications` | 30 | ✅ |
| `insights` | 28 | ✅ |
| `strength` | 33 | ✅ |
| `sync` | 35 | ✅ |
| `onboarding-async` | 29 | ✅ |
| `fixforward` | 17 | ✅ |
| `isolation` | 39 | ✅ |
| `reset-recovery` | 33 | ✅ |
| `seed` | 35 | ✅ |
| `catalog media` | 274 files | ✅ |
| `food-db` | 23 | ✅ |
| `coaching` | 37 | ✅ |
| `policy` | 14 | ✅ |
| **Total** | **483 assertions + 274 media** | ✅ |

- `typecheck` / `lint --max-warnings 0` / `build`: ✅ clean.
- Browser E2E (`test:e2e:onboarding`): consent gate, all onboarding steps, retry — ✅ (credential-free).
- `test:e2e:auth` (live Supabase auth): **OWNER** — self-runs `supabase start`; needs a Docker daemon.
  Offline preflight verified 19 PASS · 0 FAIL here.

## 2. Automated gate — `design/v21-promotion` (flagless v2 default)

`npm ci` → `typecheck` (0) → `lint` (0) → `build` (flagless) → `test:gate` (18 suites) →
three-profile smoke (`fresh`/`reviewer`/`veteran`) **zero console errors**. ✅

- v2-default proof: no `VITE_DESIGN` flag exists in source; `DashboardView` renders `<TodayV2>`
  unconditionally; `designPreview.ts`/`uiMode.ts` deleted.

## 2.5 Consolidated gate — `design/v21-promotion` @ `7b35435` (grand consolidation)

Fresh gate re-run after each of the 6 merges: `typecheck` (0) → `lint --max-warnings 0` (0) →
`build` (flagless) → `test:gate` (18 suites) → `test:observability` → `test:native-bridge` →
`test:chaos` → `npx cap sync ios`. All ✅.

| Additional proof merged in | Vector | Status |
|---|---|---|
| `test:e2e:settings-security` (secure-import) | 34 hostile #/settings imports rejected, zero mutation | ✅ 34/34 |
| formula proof (scientific-guardrails + formula-verification) | water ≤4.0 L at extremes; ages 12/15/17 safe BMI phrasing | ✅ 111/111 |
| media-rights proof | FITWILL removed; 274 assets, 24 IN-HOUSE, UNKNOWN=0/RESTRICTED=0 | ✅ 274/274 |
| chaos harness | 12 invariants, seed=1337, 0 data-loss/account-mix/false-success | ✅ 57/57 |
| skip-link + safe-area (ux/core) | `#main-content` bypass + `--safe-*` paddings | ✅ source + native |
| HealthKit + haptics (wave6) | `NativeSettingsPanel` row + toggle; native bridge | ✅ (updates audit 4.2 verdict) |

Native (this consolidation): `xcodebuild` iPhone 17 Pro (iOS 26) **BUILD SUCCEEDED** → install
`com.qimmah.mobile` → launch → interactive welcome (canonical mark, safe-area). Artifacts:
`docs/proof/native/consolidation/*`.

### OWNER items still open from the audit (mapped)

- [ ] **QEA-002** — deploy production `delete_own_account` + run `npm run db:verify` on prod with disposable A/B users (also §4 Supabase row).
- [ ] **QEA-003** — on physical device: connected-install → mid-workout network kill → process kill/reopen offline (chaos 57/57 proves the logic layer; device reopen is owner-only).
- [ ] **QEA-006** — run live duplicate-email + generated all-free-text XSS matrix with a disposable Supabase account (also §4 live-auth row).
- [ ] **QEA-004 / tracked debt** — parameterize the browser journey to table-drive every goal×equipment×reload path (see `docs/debt/` tracked item).

## 3. Native proof (iOS Simulator)

Both branches: `build` → `npx cap sync ios` (5 plugins, SPM) →
`xcodebuild -project ios/App/App.xcodeproj -scheme App` (iphonesimulator) **BUILD SUCCEEDED** →
install `com.qimmah.mobile` on iPhone 17 Pro (iOS 26) → launch → render → home-icon visible.
Artifacts: `docs/proof/native/wave5/*`, `docs/proof/native/promotion/*`.

## 3b. FIX WAVE — audit blockers closed (2026-07-17, `design/v21-promotion`)

> **⚠ Superseded by §2.5 above.** This records the *earlier fix-wave* session's homegrown closure. The
> grand consolidation later merged the **specialized** branches (deeper proofs) and per DEDUPE LAW
> replaced two homegrown fixes: secure-import (`f4b2f95`, 34-vector e2e) and media (`1d4d64f`, **24
> IN-HOUSE / UNKNOWN=0 / 274**, not the 23-UNKNOWN-acknowledged variant). QEA-005 skip-link is now
> **FIXED** (`4b8f266`). Trust §2.5 + the consolidation table in `FULL-E2E-AUDIT.md`.

Promotion now **carries `integration/wave5` + `integration/wave6-staging`** (observability, HealthKit,
haptics, canonical mark, web headers, launch kit) plus every fix branch. Fresh
`npm ci` → flagless `typecheck`/`lint --max-warnings 0`/`build` → `test:gate` → all extra proofs
green. Every CODE finding from the three audit reports is FIXED (see
[`docs/audit/FULL-E2E-AUDIT.md`](../audit/FULL-E2E-AUDIT.md) verdict table):

| Fix | Proof | Result (consolidation) |
|---|---|---|
| QEA-001 legacy importer → hardened `DataManagementPanel` | `test:e2e:settings-security` | **34/34** hostile rejected |
| Water target clamp [2.5, 4.0] L (EFSA/IOM) | `scripts/science/run-formula-proof.mjs` | **111/111** (250kg→4.0, was 9.0) |
| Minor (<18) BMI label + specialist-referral note | same formula proof (age 12/15/17/18) | included in 111 |
| 24 unsafe assets → in-house SVG schematics (FITWILL gone) | `media-rights-proof.mjs` + `run-p3-media-proof.mjs` | **274/274**, 24 IN-HOUSE, 0 UNKNOWN/RESTRICTED, p3 ✅ |
| QEA-005 skip-link + safe-area | `MobileShell` source + native launch | ✅ |
| Chaos / data-loss resilience | `test:chaos` | **57/57** |

- **HealthKit/haptics (audit finding #3):** present + rendering post-merge (haptics toggle live,
  HealthKit row iOS-gated); `cap sync ios` → plugins incl. `@capacitor/haptics`.
- **Gate wiring:** `test:chaos` and `test:e2e:settings-security` are wired into `package.json`; the
  science/media formula proofs (`run-formula-proof`, `media-rights-proof`, `run-p3-media-proof`) run as
  named checks in the consolidation ledger but are **not yet folded into the `test:gate` chain** — a
  future one-line addition, tracked, not a blocker.

## 4. OWNER release actions (cannot be automated / verified here)

- [ ] **Device verification** on a physical iPhone — **delete the app before every reinstall** that
      changes the iOS shell, icons, or storage (see `OWNER-BUILD.md`, 15-item manual list).
- [ ] **Supabase**: apply the latest migrations to the production project, then run `npm run db:verify`
      (RLS verification) against production.
- [ ] **Reset-redirect URLs**: register `com.qimmah.mobile://reset` (and the web `#/reset` URL) in the
      Supabase Auth redirect allowlist; confirm the deep-link lands on the new-password screen.
- [ ] **Live auth E2E**: run `npm run test:e2e:auth` on a machine with a Docker daemon (disposable/local
      Supabase only — never production). See `LIVE-AUTH.md`.
- [ ] **Paid Apple Developer account**: enrol / confirm active; set the signing Team in Xcode.
- [ ] **TestFlight**: archive a Release build, upload, and run internal testing.
- [ ] **App Store forms**: privacy nutrition labels, age rating, category, screenshots, description,
      keywords, support URL.
- [ ] **Legal**: finalise the legal-entity contact **email**, **domain**, and support **handle**;
      replace the `[OWNER-EMAIL]` placeholder across `site/` and store metadata.
- [ ] **Merge decision**: merging either canonical branch is the owner's word after device verification.

## 5. Do-not-do (standing directives)

- Do **not** merge `design/v21-promotion` anywhere — owner's word only, post device-verification.
- Do **not** merge `codex/v21-completion` — it overlaps commissioned systems; salvage-reviewed, no
  superior fragment (see `WAVE5-REVIEWS.md`).
