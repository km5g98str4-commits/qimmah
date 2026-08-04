# P14 — iOS NATIVE HARDENING

**Branch:** `claude/p14-ios-native-hardening`
**Base:** `claude/final-integration-gate-v1` @ `60ea9d9` (P4–P12 + dialect copy + P13 fixes)
**Worktree:** `/Users/ziyad/qimmah-p14-ios` — `../qimmah-p14` was already occupied by a
concurrent session's branch (`claude/p14-supabase-schema-rls`), so a distinct path was used.
**Date:** 2026-07-26
**Scope:** native + data/lib + manifests only. **Zero** files touched under `src/views/`,
`src/components/`, `src/App.tsx`, `src/styles/`, `src/design-system/`.

---

## 0. The single most important finding

**The entire P5 rest-end notification API and the abandoned-session classifier are dead
code in the shipped app.** `grep -rn "scheduleRestEndNotification\|cancelRestEndNotification\|classifyRestoredSession" src/` returns
**zero call sites outside the lib and its own proof**. So:

- No rest-end notification has ever been scheduled on a real device. P13's row 12
  ("background rest timer — NOT VERIFIED") is optimistic: there is nothing to verify yet.
- A workout session abandoned for three days is restored as "in progress" with a live
  elapsed timer, because `WorkoutV2.tsx:257` restores on `isUsableSession` alone.

Everything I hardened in surfaces ③ and ④ is therefore **correct but still unwired**. The
wiring is 4 call sites in `WorkoutV2.tsx`, spelled out literally in
`P13-CODEX-HANDOFF.md §P14`. Until Codex lands it, the device checklist items for rest
notifications and abandoned sessions cannot pass — not because they are broken, because
they are not connected.

---

## 1. Surface ① — HealthKit

### Audited end-to-end
Swift bridge (`HealthKitStepsPlugin.swift`) → TS bridge contract (`health/connect.ts`
`HealthReadBridge`) → normalize (`health/normalize.ts`) → store (`health/store.ts`) →
per-metric state (`metricDataState`), plus the legacy steps/weight/HR bridge
(`src/lib/healthKit.ts`) which P9 left untouched.

| Claim under audit | Verdict |
|---|---|
| Aggregated single authorization path | **HOLDS.** `requestAllHealthAccess` (`connect.ts:139`) is the only caller of `requestAuthorization` for the wide layer, one call with all supported metrics. Proven: `auth === 1`. |
| Write list empty | **HOLDS.** `toShare: []` literal (Swift), `HEALTH_WRITE_TYPES = []`, no `NSHealthUpdateUsageDescription`. Proven by grep in the proof runner. |
| Availability-guarded types don't crash on older iOS | **HOLDS.** `#available(iOS 16.0, *)` for `heartRateRecoveryOneMinute` + `appleSleepingWristTemperature`; `supportedMetrics()` filters them out before the request. Deployment target is **iOS 15.0** (`project.pbxproj`), so the guard is load-bearing. |
| No clinical records | **HOLDS.** zero `HKClinicalType`. |
| 90-day windowing + dedup by HK UUID | **HOLDS.** `historyStart` clamps 1…365 default 90; `dedupeKey` prefers `u:<uuid>`. Proven: a repeated sync keeps `stored === 2`. |
| Per-metric disconnect purges only that metric | **HOLDS.** `purgeMetricSamples` deletes `metrics[m]` + `anchors[m]` only; proven other metrics untouched. |
| Imported samples excluded from cloud upload (P12) | **HOLDS**, and is now enforced by the registry (see FIXED-H5). |
| Unknown-vs-denied honesty airtight | **DID NOT HOLD — 4 real violations, all fixed.** |

### FIXED

**FIXED-H1 — the bridge claimed the user denied read access, three times.**
HealthKit *never* reveals a read denial: `requestAuthorization` returns `success = true`
even when the user denies every single type, and a denied read query returns **empty
results, not an error**. Yet the Swift bridge resolved `"permission": "denied"` in three
places, all of which are actually "the request/query failed to run":

- `requestAuthorization` on `success == false || error != nil` → now `"unknown"` (`HealthKitStepsPlugin.swift:148`)
- `getDailySteps` on query error → now `"unknown"` (`:183`)
- `fetchLatest` (weight + heart rate) on query error → now `"unknown"` (`:468`)

And in TS, `refreshHealthKitStepsIfEnabled`'s catch returned `'denied'` → now `'unknown'`
(`src/lib/healthKit.ts:192`). `HealthKitPermission` gained `'unknown'`
(`:17`); `'denied'` is kept in the union **only** so already-persisted legacy states still
parse, and is documented as never produced. Adding a member (rather than renaming) is what
made this fixable without touching `NativeSettingsPanel.tsx`.

The proof asserts **zero** `"permission": "denied"` occurrences in the Swift bridge and
zero `'denied'` in non-comment code of `health/connect.ts`.

**FIXED-H2 — the user-facing string said the permission was refused.**
`src/data/nativeSettings.ts` rendered «ما انعطى الإذن.» / "Permission wasn't given." for
any non-`authorized` state — which, per FIXED-H1, is a claim the app cannot make. Both
languages rewritten to the only honest phrasing («ما وصلنا شي من صحة Apple. يا إن الإذن
مقفّل للمقياس هذا، يا إنه ما فيه بيانات مسجّلة…» / "Nothing came through from Apple
Health. Either the permission for this metric is off, or there's nothing recorded yet…"),
Saudi dialect per `DIALECT-TONE-GUIDE.md`, with the manual fallback named in both. A new
`unknown` key carries the same text so Codex can branch explicitly; the legacy `denied`
key name is kept (the view references it) with a comment explaining why.

**FIXED-H3 — paged sync could re-fetch the same page 8×.**
`connect.ts` looped while `page.hasMore`, but only advanced the anchor `if (page.anchor)`.
The Swift side omits `anchor` whenever `NSKeyedArchiver` fails, so `hasMore: true` +
missing anchor meant re-issuing the *identical* query up to `MAX_PAGES_PER_SYNC`. Now the
loop breaks when `hasMore` is set without a new anchor (`connect.ts:256`). Proven: one
bridge call, not eight.

**FIXED-H4 — `hasMore` was computed from the post-cast row count.**
All three paged readers used `out.count >= limit`, where `out` only holds successfully
cast samples. One uncastable sample in a full page would report `hasMore: false` and
**silently truncate history**. Now compared against the raw returned count
(`HealthKitStepsPlugin.swift:315, 368, 452`).

**FIXED-H5 — two P9 storage keys were never registered in the central key registry.**
`qimmah:health:samples:v1` and `qimmah:health:connection:v1` were absent from
`src/lib/userDataKeys.ts`, whose own header says "any new key must be registered here".
Consequence: they were invisible to `dataOwnership`'s adoption gate and quarantine, so
imported Health samples left by an anonymous session could be silently adopted by a real
account. Both now registered as `kind:'user', scoped:false, exported:false, synced:false,
migration:'owner-suffix'`. The proof asserts `synced === false && exported === false` for
both — the P12 "health never leaves the device" guarantee is now a registry-enforced fact
rather than an absence of code.
*They were never a cross-account leak:* `accountScope` is an allowlist, so any
unregistered `qimmah:*` key is wiped on switch (verified).
**The registry-completeness proof is still too weak** — `data-safety-proof.ts:134` only
asserts `DATA_KEYS.length >= 50`; it cannot catch the next unregistered key. See §6.

### NEW — diagnostics (metadata only)
`src/lib/health/diagnostics.ts` + `healthDiagnosticsReport()` / `healthDiagnosticsText()`
exported from `connect.ts`, exposed read-only as `window.__QIMMAH_HEALTH_DIAG__`
(same pattern as the barcode diag; no in-app UI). Per metric:
`{requested, enabled, hasData, lastQueryMs, lastStatus, sampleCount, lastPages, unitUsed, source}`.

**No health value can reach it by construction**: `recordHealthQuery` accepts only
`{status, durationMs, pages, sampleMeta:{unit, source.name}}` — there is no parameter that
could carry a value. Two proof checks enforce it: a grep asserting `diagnostics.ts`
contains no `.value` / `kcal` / `bpm` / `quantity.` access outside comments, and a runtime
check that the serialized report contains none of the stored sample values.

### REMAINS (not fixed)
- **`getWorkouts` is single-page by design** (`HKSampleQuery`, no anchor). Beyond 500
  workouts in 90 days the oldest are unread. Documented in the Swift doc comment; not
  reachable in practice, so not converted to an anchored query.
- **`historyStart` counts back from `Date()` not `startOfDay`**, so the window edge drifts
  within the day. Harmless for a 90-day window; left alone.
- **`healthKit.ts` and `health/connect.ts` are two parallel bridges** to the same plugin
  with two independent persisted states (`qimmah:healthkit:v1` vs
  `qimmah:health:connection:v1`). P9 kept the legacy one "for compatibility". Unifying
  them is a wave, not a fix.
- **`NativeSettingsPanel.tsx:194,237`** lumps every non-`authorized` state into
  `copy.denied` and shows nothing at all for weight when the state is `'unknown'`. The
  copy is now honest either way, but the explicit branch is Codex's (handoff §P14-A).

---

## 2. Surface ② — Barcode

### Dependency claim re-verified (it still holds)
`ios/App/CapApp-SPM/Package.swift` exists, **no `Podfile` anywhere in `ios/App/`**, and
`npm ls` shows no `@capacitor-mlkit/*`. The build I ran resolved 6 Capacitor plugins
purely through SPM. So the P8 rationale — MLKit is CocoaPods-only, this project is
SPM-managed, therefore AVFoundation — remains correct and unchanged.

| Claim under audit | Verdict |
|---|---|
| Rear camera selection | **HOLDS** — `position: .back`, `.builtInWideAngleCamera`. |
| Symbologies EAN-13/8, UPC-A/E | **HOLDS** — `[.ean13, .ean8, .upce]` intersected with `availableMetadataObjectTypes`; UPC-A arrives as `.ean13` (documented AVFoundation behavior), so all four retail forms are covered. |
| Torch passthrough | **HOLDS** — `setTorch` reports what was actually applied. |
| Permission-denied path is honest | **HOLDS at the API level** (`"permission-denied"`, never a fake "not found") — but was **lost in diagnostics**, see FIXED-B4. |
| Web zxing fallback still functional | **HOLDS** — exercised live in the new proof with a stubbed `getUserMedia`: resolution recorded, `stop()` tears the stream down, repeat `stop()` is a no-op. |
| Session teardown on dismiss | **DID NOT HOLD fully — fixed (B1–B3).** |

### FIXED

**FIXED-B1 — a no-camera device could strand a black full-screen view.**
`scanOnce` presented the controller, then `viewDidLoad` → `configureSession()` →
`finish(.noCamera)` → `dismiss(animated:)` **while the presentation was still animating
in** — UIKit drops that dismiss. Two guards now: camera availability is checked *before*
presenting (`BarcodeScanPlugin.swift:45`, resolves `no-camera` immediately), and any
terminal outcome reached pre-presentation is stored in `pendingOutcome` and replayed from
`viewDidAppear` (`:137`, `:304`, `:395`). This is the simulator path, and also any future
`cannot-add-input` failure.

**FIXED-B2 — the torch was never explicitly extinguished.**
`finish()` stopped the session but left `device.torchMode == .on`. Stopping a session
usually drops the torch, but the device property persisted, so the next scan could start
with the light on. `teardownCapture()` (`:414`) now turns the torch off **first**.

**FIXED-B3 — the capture session was not deterministically released.**
Teardown relied on the view controller deallocating. Now: delegate set to `nil`, the
`AVCaptureSessionDidStartRunning` observer removed eagerly, and inputs/outputs removed
inside a `beginConfiguration`/`commitConfiguration` pair — the camera device is released
when the scan ends, not whenever ARC gets around to it.

**FIXED-B4 — diagnostics could not distinguish a permission denial from a real fault.**
`ScanOutcome` was `'running'|'detected'|'cancelled'|'error'`, so `nativeScanner.ts` mapped
both `permission-denied` and `no-camera` to `'error'`, and `webZxingEngine.begin()`'s
catch closed the record as `'error'` before the caller classified the DOMException. On a
device this is exactly the difference between "your camera permission is off" and "the
scanner is broken". `ScanOutcome` now includes `'permission-denied' | 'no-camera'`, and
both engines record the precise state.

**FIXED-B5 — the diagnostics record lacked `path` and `torch`** (both required by the
device report). Added `path: 'native' | 'web'` (derived via `scanPathOf`) and
`torch: boolean`, fed from a new `recordTorch()` — set by the web engine when
`applyConstraints` succeeds, and by the native path from a new `torchUsed` field the Swift
plugin returns in every outcome. Per-attempt the report now carries
`{path, durationMs, symbology(formatHit), resolution, torch, outcome}` + ROI/frames/FPS.
`barcode-proof.ts`'s exact-key allowlist was **extended, not loosened** — a value-bearing
field would still fail it.

**FIXED-B6 — native scan buttons could fall below a 44pt tap target.**
The Xcode build surfaced two pre-existing deprecation warnings:
`contentEdgeInsets` (deprecated iOS 15, ignored when UIKit resolves a
`UIButtonConfiguration`) was the *only* source of horizontal padding on the cancel and
torch buttons, and only `heightAnchor >= 44` was constrained. Added
`widthAnchor >= 44` to both. The deprecation warnings themselves remain (converting to
`UIButton.Configuration` changes title/background handling and I cannot verify the visual
result without a device — deliberately not done).

### REMAINS
- The two `contentEdgeInsets` deprecation warnings (above) are the only warnings in the
  app target's Swift.
- `BarcodeCamera.tsx` / `ScanFoodPanel.tsx` are UI (read-only for me). The P13 handoff
  item that «أضِف الطعام يدويًا» is a dead end is unchanged.

---

## 3. Surface ③ — Rest-end notification

Audited `src/lib/notifications/restEnd.ts` against every requirement.

| Requirement | Before | After |
|---|---|---|
| Scheduled at `endsAt` | ✅ one-shot `schedule.at`, id **3600** | unchanged |
| Replaced on "+time" | ✅ cancel-then-schedule built in | unchanged |
| Cancelled on skip / foreground completion / finish | ✅ `cancelRestEndNotification()` | now also clears the pending trace |
| No-op without permission | ✅ `'denied'` before any scheduling | unchanged |
| No-op on web | ✅ `'unsupported'` | unchanged |
| No duplicate ids across sessions | ✅ single constant id | + per-owner trace keys |
| Cancelled when the session is discarded/finished | ⚠️ only if the UI called it — **and the UI never does** | `reconcileWorkoutColdStart` now cancels orphans automatically |
| Must not fire after force-quit with the rest already elapsed | ❌ **no mechanism existed** | FIXED-N2 |

### FIXED

**FIXED-N1 — a skipped reschedule left the previous notification pending.**
`scheduleRestEndNotification` returned `'skipped'` for a past `endsAt` **before** reaching
its `port.cancel(...)`. So the sequence "rest scheduled for T+90 → reschedule with an
already-elapsed `endsAt`" left the T+90 notification armed and fired it after the rest was
over. The cancel now precedes the skip check (`restEnd.ts:138`), and the pending trace is
cleared on the skip path.

**FIXED-N2 — nothing could clean up a stale notification on cold start.**
A one-shot `schedule.at` survives a force-quit: iOS delivers it whether or not Qimmah is
alive, and nothing in the app knew a notification was outstanding. Added a per-owner trace
`qimmah:restEndPending:v1:<owner>` (`endsAt` + `scheduledAt` only — no workout data) and
`reconcileRestEndOnColdStart({ownerId, activeRestEndsAt, nowMs})` (`:195`) returning one of:

- `cleared-stale` — trace `endsAt` already past ⇒ cancel **and**
  `removeDeliveredNotifications` (pulls it out of Notification Center if it fired while the
  app was dead).
- `cleared-orphan` — trace still in the future but no live rest ⇒ cancel, no
  Notification-Center removal (nothing was delivered).
- `kept` — trace matches a rest that is genuinely still running ⇒ leave the correct
  notification armed.
- `none` / `unsupported`.

`removeDelivered` is an **optional** port method, so existing test doubles keep working.
The trace is registered in `userDataKeys.ts` as owner-scoped, unexported, unsynced.

### REMAINS
- **Unwired.** Nothing calls any of it (see §0). The 4 call sites are in the handoff.
- `reconcileNotificationSchedule` still calls `cancelKnown()` — which includes id 3600 —
  on every reconciliation, so a settings change during a live rest silently kills that
  rest's notification. P5 framed this as "no orphan notifications". With FIXED-N2 the
  orphan case is handled properly, so excluding `restEnd` from `cancelKnown` would now be
  strictly better — but that changes account-switch behavior, so it is a decision, not a
  fix. Logged in the handoff.

---

## 4. Surface ④ — Cold-start session restore

The restore path is `WorkoutV2.tsx:257-283` (forbidden to edit). Audited it read-only:

| Requirement | Finding |
|---|---|
| Rest timer recomputed from `endsAt` | ✅ correct — `restRemainingSec(endsAt, now)`, timestamps not counters. |
| Stale-notification cleanup | ❌ **absent entirely.** |
| Abandoned-session classification (P5 threshold) | ❌ **absent entirely** — `classifyRestoredSession` has zero call sites. An 8-hour-old session resumes as live. |
| No double-save after restore-then-finish | ✅ safe *by accident* — the id is seeded from `startedAt` (`session-v2-<startedAt>`) and `saveWorkoutSession` is idempotent. Nothing asserts it at the restore boundary. |
| Behavior when the plan changed while killed | ⚠️ **silent data loss.** `isUsableSession` fails → `localStorage.removeItem` with no distinction between "corrupt JSON" and "you had 6 completed sets under a plan that changed", and no warning either way. |

### NEW — the lib-level API (in `workoutSessionEngine.ts`, per the mission)

Pure decision layer, no side effects, directly testable:
- `isUsableActiveWorkout(value, exerciseIds)` (`:269`) — the data-layer twin of the view's
  `isUsableSession`, taking plan slot ids instead of a model.
- `decideColdStart({persisted, exerciseIds, nowMs, thresholdMs})` (`:366`) → `{action:
  'none'|'resume'|'abandoned'|'discard', discardReason: 'none'|'empty'|'malformed'|'plan-changed',
  restState: 'none'|'running'|'elapsed', restRemainingSec, restEndsAt, ageMs, completedSets, session}`.

Effectful entry point — **one call is all Codex needs**:
- `reconcileWorkoutColdStart({ownerId, exerciseIds, nowMs?, thresholdMs?})` (`:457`) →
  `{decision, restEnd, alreadySaved, clearedKey}`. It reconciles the rest notification
  (stale/orphan/kept), clears the key **only** for `malformed`, and deliberately **does
  not** clear a `plan-changed` session — it reports `completedSets` so the UI can warn
  before discarding real work instead of deleting it silently.
- `isActiveWorkoutAlreadySaved(startedAt)` (`:427`) — makes the no-double-save guarantee
  explicit and assertable.
- `releaseRestEndForSession(ownerId)` (`:485`) — one call for skip/finish/discard so the
  pending trace can't be forgotten.

Also re-exported from the engine for a single import surface:
`reconcileRestEndOnColdStart`, `pendingRestEnd`, `restEndPendingKey`.

### REMAINS
- **Unwired** (§0). Exact contract: handoff §P14.
- `isUsableActiveWorkout` currently **duplicates** the view's `isUsableSession`. Codex
  should delete the view copy and call the lib one, or the two will drift. Flagged in the
  handoff.

---

## 5. Manifest / privacy audit

| Item | Verdict |
|---|---|
| `NSCameraUsageDescription` | **PASS** — bilingual, and barcode-only, matching the only camera use in the codebase. |
| `NSHealthShareUsageDescription` | **PASS** — bilingual, covers the full broadened set (activity, body, heart, sleep + stages, vitals, nutrition) and states read-only / never shared / never for ads / disconnect deletes. Proof asserts each group name is present. |
| `NSLocationWhenInUseUsageDescription` | **FIXED** — was **Arabic-only**, inconsistent with the other two keys. English added. Verified sunset-only: the sole caller is `requestGeolocation()` from `ProfileV2.tsx:424` (dark-mode scheduling) with a manual-city fallback. |
| `NSHealthUpdateUsageDescription` | **Correctly absent** (zero write types). |
| `ITSAppUsesNonExemptEncryption` | **ADDED** `<false/>`. Justification: the app ships no proprietary or non-standard cryptography — network use is HTTPS via WKWebView/URLSession only, which falls under the standard exemption. Verified present in the **built** `App.app/Info.plist`. Removes the per-upload export-compliance prompt. |
| `UIBackgroundModes` | **Correctly absent, and deliberately not added.** Local notifications are delivered by the OS with no background mode, and the rest timer is recomputed from `endsAt` rather than run in the background. |
| `App.entitlements` | **PASS** — exactly one key, `com.apple.developer.healthkit`. No push, no background, no associated domains. The proof fails if a second entitlement ever appears. |
| `PrivacyInfo.xcprivacy` | **Absent — deliberately NOT added.** See below. |
| `UIRequiredDeviceCapabilities: armv7` | Stale Capacitor-template value (deployment target is iOS 15, arm64-only). Cosmetically wrong, functionally inert — **not changed**, no benefit. |

### Why no `PrivacyInfo.xcprivacy` was added
Apple's requirement bites when code accesses a **required-reason API**
(file timestamps, system boot time, disk space, active keyboard, `UserDefaults`).
Evidence I gathered:
`grep -rE "UserDefaults|creationDate|modificationDate|systemUptime|mach_absolute_time|volumeAvailableCapacity|statfs|activeInputModes" ios/App/App/`
→ **zero hits**. Our own Swift (both plugins + `AppDelegate`) touches none of them.
The Capacitor frameworks that *do* use `UserDefaults` ship their own manifests
(`node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy`, and one for
`CapacitorCordova`), which is exactly how the SDK-level requirement is meant to be met.

I could not obtain evidence for the *whole linked binary*, only for source I can read —
Xcode's own privacy report is the authoritative source and needs an archive build.
Writing a manifest whose declared reasons I cannot substantiate would be a false
declaration, which is worse than its absence. **Ziyad's step is in
`DEVICE-NOT-VERIFIED.md` item 9** (Product → Archive → Generate Privacy Report); if it
lists an app-target API, the manifest gets added then, with the reason code that report
gives.

---

## 6. Commands actually run (exact results)

| Command | Result |
|---|---|
| `npm ci` | OK (exit 0) |
| `npm run typecheck` | **PASS** — exit 0, no output |
| `npm run lint` | **PASS** — exit 0 (`--max-warnings 0`) |
| `npm run build` | **PASS** — `✓ built in 4.57s` |
| `npm run test:native-hardening` | **PASS** — `93 نجحت / 0 فشلت` (24 manifest/bridge grep checks + 69 unit checks) |
| `npm run test:gate` (full, 46 suites) | **PASS** — `GATE_EXIT=0`, **1522** `✓` marks, 0 failures |
| `npm run test:barcode` | **PASS** — 24/24 (key allowlist extended for `path`/`torch`) |
| `npx cap sync ios` | **PASS** — `Sync finished in 0.195s`, 6 Capacitor plugins |
| `xcodebuild -scheme App -sdk iphonesimulator -destination 'iPhone 17 Pro' -configuration Debug` | **BUILD SUCCEEDED** (Xcode 26.6, build 17F113) — this compiled every Swift change |

Gate delta: 1326 → 1522 `✓` marks (+196; the new suite's 93 plus its own re-runs across
the gate's grep phases).

**Not run / cannot be run here:** anything on a physical iPhone. No device is attached to
me and none of the four surfaces can be honestly signed off without one — see
`DEVICE-NOT-VERIFIED.md`.

---

## 7. Remaining risks (honest)

1. **Surfaces ③ and ④ are still not wired.** The hardening is real but dormant until
   Codex lands `P13-CODEX-HANDOFF.md §P14`. Do not read the green proof as "rest
   notifications work on the phone".
2. **Simulator ≠ device for all four surfaces.** The simulator has no camera (the new
   `no-camera` pre-check is exactly what it exercises), no HealthKit data, no real
   notification delivery, and no process-kill semantics identical to a swipe-kill.
3. **The key-registry proof is still `DATA_KEYS.length >= 50`.** FIXED-H5 fixed the two
   missing keys but not the reason they went missing. A repo-wide "every `qimmah:` literal
   in `src/` is registered" check is the follow-up (P13 §6 raised the same shape of
   complaint about the EN-leak guard).
4. **`plan-changed` sessions are still discarded by the view**, just no longer by the lib.
   Until Codex uses `completedSets`, real work is dropped without a warning.
5. **Two parallel HealthKit bridges** with two persisted states remain (§1 REMAINS).
6. **`cancelKnown()` still nukes a live rest notification** on any reconciliation (§3
   REMAINS) — a decision for the owner.
7. **Privacy manifest is unresolved by evidence, not by judgment** (§5). It may turn out
   to be required.
8. **Perf budget is untouched and still red ×3** (pre-existing, P13 §3). Out of scope here.
9. `npm audit` reported vulnerabilities at `npm ci` in P13 and was not triaged in this
   wave either.

---

## 8. Files changed

| File | Why |
|---|---|
| `ios/App/App/HealthKitStepsPlugin.swift` | FIXED-H1 (3 × `denied`→`unknown`), FIXED-H4 (`hasMore` ×3), doc comments |
| `ios/App/App/BarcodeScanPlugin.swift` | FIXED-B1/B2/B3/B5/B6 (pre-check, deferred outcome, torch-off + full teardown, `torchUsed`, 44pt width) |
| `ios/App/App/Info.plist` | bilingual location string, `ITSAppUsesNonExemptEncryption` |
| `src/lib/healthKit.ts` | FIXED-H1 (TS side), `'unknown'` member + `isUnknownHealthPermission` |
| `src/lib/health/connect.ts` | FIXED-H3 (paging), diagnostics instrumentation + public report surface |
| `src/lib/health/diagnostics.ts` | **new** — metadata-only per-metric diagnostics |
| `src/data/nativeSettings.ts` | FIXED-H2 (honest bilingual copy + `unknown` key) |
| `src/lib/userDataKeys.ts` | FIXED-H5 (2 health keys) + rest-end pending trace |
| `src/features/barcode/scanDiagnostics.ts` | FIXED-B4/B5 (`path`, `torch`, honest outcomes) |
| `src/features/barcode/nativeScanner.ts` | FIXED-B4/B5 wiring |
| `src/features/barcode/webZxingEngine.ts` | FIXED-B4/B5 wiring |
| `src/lib/notifications/restEnd.ts` | FIXED-N1/N2 (cancel-before-skip, pending trace, cold-start reconciliation, `removeDelivered`) |
| `src/lib/workoutSessionEngine.ts` | **new API** — cold-start reconciliation (§4) |
| `scripts/native-hardening-proof.ts`, `scripts/run-native-hardening-proof.mjs` | **new** — 93 checks |
| `scripts/barcode-proof.ts` | key allowlist extended for the two new metadata fields |
| `package.json` | `test:native-hardening` + appended to `test:gate` |
| `docs/audit/P14-NATIVE-HARDENING.md`, `docs/audit/DEVICE-NOT-VERIFIED.md`, `docs/audit/P13-CODEX-HANDOFF.md` | this report, the device checklist, the wiring contract |

No file under `src/views/`, `src/components/`, `src/App.tsx`, `src/styles/` or
`src/design-system/` was modified.
