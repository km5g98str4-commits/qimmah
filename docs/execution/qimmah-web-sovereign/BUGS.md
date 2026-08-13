# Qimmah Web Sovereign — bug ledger

Updated: 2026-08-13 (Layer 1 / PKG-1 verified)

## BUG-001 — Preview mutation handlers can surface an exception instead of Premium

- Severity: P1
- Surface: Recovery submit; ProgressV2 measurement save.
- Reproduction: complete guest preview, browse to the surface, invoke save while entitlement is `none`.
- Evidence: writer functions correctly throw `PaidActionDenied`, but the baseline live handlers do not call `useAccess().guard`; the central gate therefore does not open before the writer rejects.
- Root cause: writer-level policy was added without the corresponding live-handler guard on two later surfaces.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: both handlers call the central UI guard before the already-guarded writer.
- Evidence: `test:access-gate` 72/72; `test:e2e:preview-gate` proves Premium opens and both recovery/measurement stores remain unchanged.

## BUG-002 — Live Progress route does not expose the current measurement experience

- Severity: P1
- Surface: `#/progress` / Measurements.
- Reproduction: open live Progress tab and look for the current weight/body detail and logging route implemented by `ProgressV2`.
- Evidence: `App.tsx` renders `ProgressView`; baseline `ProgressView` is the older summary/reminder surface while `ProgressV2` owns the maintained measurement flow.
- Root cause: duplicate UI implementations drifted; the route wrapper was not pointed at the maintained owner.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: the stable `ProgressView` route module is now a thin owner-preserving wrapper over `ProgressV2`; Steps and Recovery remain explicit routes from that screen.
- Evidence: `test:progress-v2` 11/11 plus the browser measurement entry/save attack.

## BUG-003 — Three high transitive dependency advisories

- Severity: P2
- Surface: build/development toolchain.
- Reproduction: `npm audit --json`.
- Evidence: `brace-expansion` through TypeScript-ESLint/ESLint/glob; `js-yaml` through ESLint; `nanoid` through PostCSS. `npm ls` shows no application-runtime importer; production bundle scan still required.
- Root cause: pinned lockfile contains vulnerable transitive versions.
- Status: OPEN
- Containment: no user-controlled input is passed to these build tools in the shipped browser. The contract forbids dependency upgrades tonight; do not run `npm audit fix`. Track for an authorized dependency wave.

## BUG-004 — Setup-specific ErrorBoundary can falsely complete a crashed onboarding

- Severity: P1
- Surface: Setup/onboarding render failure.
- Reproduction: cause a child render exception; choose the escape action.
- Evidence: `SetupErrorBoundary` in `src/views/SetupView.tsx` calls `onForceComplete`, whose contract marks onboarding complete and enters the dashboard. It is also a second boundary primitive with hardcoded bilingual copy.
- Root cause: a historical “never trap the user” escape treats failure as completion rather than retry/recovery.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: remove `SetupErrorBoundary` and the `onForceComplete` path; setup reuses `RouteErrorBoundary`, so retry cannot write completion.
- Evidence: `test:error-boundary` 13/13 with a named assertion and counter-proof for the no-false-completion contract.

## BUG-005 — Error recovery lacks a support reference id

- Severity: P2
- Surface: app and route ErrorBoundary fallbacks.
- Reproduction: trigger a render or lazy-import error.
- Evidence: fallback offers reload/retry, but no non-sensitive reference id and no `qimmah.support@gmail.com`/support route.
- Root cause: pre-launch fallback predates the support-correlation contract.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: both canonical fallbacks display a client-generated `QW-*` id, log the same id, focus their headings, and provide `qimmah.support@gmail.com` without exposing stack/message/PII.
- Evidence: `test:error-boundary` 14/14, including the shared Contact address.

## BUG-006 — First-run question target is not met truthfully

- Severity: P2
- Surface: Onboarding personalization.
- Reproduction: inventory every visible answer and trace each into a real consumer.
- Evidence: 14 candidate answers are visible; equipment preference is explicitly discarded, leaving 13 proven meaningful. Required history facts are absent from the live baseline.
- Root cause: V2 onboarding was intentionally a shorter adapter over defaults; the adaptive bank is not routed to the live UI.
- Status: OPEN
- Constraint: no filler and no QAE modification. Final N must be proved consumer-by-consumer.

## EXTERNAL-001 — Paid Salla product binding cannot be proven

- Severity: P1 commercial blocker (does not block Preview).
- Surface: Premium purchase CTA.
- Reproduction: search `1181109938|1084925309|salla.sa`.
- Evidence: only `https://salla.sa/Qimmahsa` store root is present; neither product id exists in the frontend contract.
- Root cause: no verified product-specific public URL was supplied to this baseline.
- Status: EXTERNALLY_BLOCKED

## EXTERNAL-002 — Live activation backend is unavailable

- Severity: P1 commercial blocker (does not block Preview).
- Surface: activation code redemption.
- Reproduction: production-mode `redeemActivationCode` call.
- Evidence: `src/lib/access/entitlementSource.ts` returns `offline` unless the build-only mock seam is enabled.
- Root cause: webhook/code verification/entitlement backend is outside authorized Web scope and not present as a reviewed contract.
- Status: EXTERNALLY_BLOCKED
