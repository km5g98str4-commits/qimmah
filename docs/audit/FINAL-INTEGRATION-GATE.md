# P13 — FINAL INTEGRATION GATE

**Branch:** `claude/final-integration-gate-v1`
**Base:** `claude/sync-coverage-v1` @ `011e1f4` (integration line carrying P4–P12)
**Merged in:** `content/dialect-copy-v1` @ `c75e510` (merge commit `bbdad4c`)
**Date:** 2026-07-25 · **Worktree:** `/Users/ziyad/qimmah-p13`
**Mission:** audit + limited technical fix. No UI/product changes. `src/views/*`, `MobileShell`, `App.tsx`, styles and design-system were **not** modified.

---

## 0. The merge

`git merge content/dialect-copy-v1` produced **zero conflicts**. The dialect branch was cut from `19ec00a` (the P5 session-engine tip, which is also the merge base), and P6–P12 did not touch the same lines in the 40 copy files, so git auto-merged all of them. Nothing was hand-resolved, so the resolution rule (dialect wins for strings, engine wins for behavior, proofs take the union) never had to be applied to a conflicted hunk.

Auto-merge success was **not** integration success. One real regression surfaced only in the browser E2E layer, which `test:gate` does not run (see FAIL-1).

---

## 1. PASS / FAIL table (20 rows)

Legend: **PASS** = a command I ran exited 0 · **FIXED** = it failed, I fixed it, it now passes · **NOT VERIFIED** = requires a physical device / docker; no claim made.

| # | Dimension | Verdict | Evidence (command → count) |
|---|---|---|---|
| 1 | Routes / buttons / flows reachable in code | **PASS (with 6 known-dead controls unchanged)** | 9-item Appendix-I matrix re-verified against `bbdad4c`; 6 still dead/misleading, 1 partially improved, 1 genuinely fixed. All are Codex's to wire → `P13-CODEX-HANDOFF.md`. |
| 2 | Arabic copy after dialect merge (فصحى leftovers) | **FIXED** | 5 user-facing MSA leftovers found in central copy; all 5 fixed in the data/scripts layer (3 dict strings + 2 generator templates → 25 regenerated cue lines). 0 remaining. |
| 3 | English mode — no Arabic leakage | **FAIL (12 items, all view-layer or content-gap)** | Audited; **not fixed** — 7 are `src/views/*`/components (forbidden scope), 5 need new English content authored (`restTips`, `lessons`, portability labels, `exerciseGuidance`). Logged in handoff. |
| 4 | RTL/LTR static (no hardcoded direction) | **PASS** | `grep` for `ml-/mr-/pl-/pr-/left-N/right-N/text-left/text-right` across `src/` → **4 hits, all false positives** (`pr-3`,`pr-10` achievement IDs). Fixed px widths ≥100px → **0**. |
| 5 | Small iPhone (320px) layout | **PASS (static+headless only)** | `e2e-onboarding` asserts `documentElement.scrollWidth <= innerWidth` at 320×720 → PASS. Large-iPhone / notch / Dynamic Island = NOT VERIFIED (§5). |
| 6 | Two accounts on one device | **PASS** | `test:isolation` → **39/39**. `e2e/settings-import-security` → **34/34** incl. "user B: zero residue from A". |
| 7 | One account on two devices (sync) | **PASS** | `test:sync` → **38/38** · `test:sync-coverage` → **56/56** (LWW, tombstones, honest `getSyncUiState`, backoff cap, adoption gate). |
| 8 | Offline / online transitions | **PASS** | `test:sync-coverage` §7–8 (never claims "synced" before a real success; frozen ops keep the queue, no data loss) · `resilience/run-chaos` INV 12 → **57/57**. |
| 9 | Migration + rollback | **FIXED** | `test:data-safety` → **31** · `test:canonical` → **16** · **`run-chaos` was FAILING on base** (INV 9+12) — root-caused and fixed in `src/lib/dataOwnership.ts`; chaos now **57/57**. |
| 10 | Full / partial / abandoned workout | **PASS** | `test:session-engine` → **50/50** · `test:finish-confirm` → **11/11** · `test:substitution` → **20/20**. |
| 11 | App-kill session restore | **PASS (headless)** | `test:active-session` → **31/31** · journey E2E produces `03b-workout-resumed.png` from a **fresh document** after a mid-session reload. Real iOS process-kill = NOT VERIFIED. |
| 12 | Background rest timer | **NOT VERIFIED** | Timer logic covered by `test:session-engine` (rest-end notification scheduling) but firing while the app is **backgrounded on iOS** cannot be proven offline. Device checklist item. |
| 13 | Calendar days / rest days | **PASS** | `test:calendar` → **51/51** (real weekly schedule, honest rest days). |
| 14 | Nutrition history / grams / copy-meal | **PASS** | `test:nutrition-history` → **61 ✓ / 0 ✗** · `test:food-db` → **23/23** (accepted warning `DIVERGE_KCAL=4`) · `test:hydration` PASS (one canonical water source). |
| 15 | Barcode | **PASS (logic) / NOT VERIFIED (camera)** | `test:barcode` → **24/24**. `NSCameraUsageDescription` present in `ios/App/App/Info.plist`. Real scan uses web `@zxing` in WKWebView → device-only. |
| 16 | HealthKit full / limited / unavailable | **PASS (logic) / NOT VERIFIED (device)** | `test:health-foundation` → **51 pass / 0 fail** · `test:native-bridge` PASS (per-metric permissions, on-demand, manual fallback). Entitlement `com.apple.developer.healthkit` + `NSHealthShareUsageDescription` present; `HealthKitStepsPlugin.swift` exists. |
| 17 | Recovery | **PASS** | `test:recovery-engine` → **54 نجحت / 0 فشلت** · `test:recovery` → **15/15**. |
| 18 | Import / export | **PASS** | `test:portability` → **49/49** · `test:data-portability` → **12/12** · `e2e:settings-security` → **34/34** (old exploit rejected, `__proto__` blocked, no token in filename). |
| 19 | Password recovery / secure ops | **PASS (offline) / NOT VERIFIED (live auth)** | `test:reset-recovery` → **33/33** · `test:secure-ops` → **9/9**. `test:e2e:auth` needs docker → **19 PASS / 0 FAIL preflight**, full run blocked (docker daemon stopped). |
| 20 | Secret / data leakage | **PASS** | `service_role` in `src/` → **0**. `console.*` logging password/secret/token in `src/` → **0**. Chaos INV 11: conflict log carries no payload/token/email/health values. `test:observability` PASS (PII scrubber). The one JWT in `src/lib/supabaseClient.ts:19` is the **anon** key (`"role":"anon"`), public by design and RLS-protected. |
| — | Perf / bundle budget | **FAIL ×3 (pre-existing, not a P13 regression)** | See §3. |

**Counts: 16 PASS · 3 FIXED · 1 FAIL (dim 3) · plus 1 pre-existing FAIL (perf) · 4 rows carry a NOT-VERIFIED device half.**

---

## 2. Gate command results (exact)

| Command | Result |
|---|---|
| `npm ci` | OK — `4 vulnerabilities (1 moderate, 3 high)` reported by npm audit; not triaged in this wave |
| `npm run typecheck` | **PASS** (exit 0, no output) |
| `npm run lint` | **PASS** (exit 0, `--max-warnings 0`) |
| `npm run build` | **PASS** — `✓ built in 4.21s` |
| `npm run test:gate` | **PASS** — `GATE_EXIT=0`, **45 suites**, ~**1326** reported checks / **1399** inline `✓` marks, **0 ✗** |
| `npx cap sync ios` | **PASS** — `Sync finished in 0.204s`, 6 Capacitor plugins for ios |
| `npm run perf:budget` | **FAIL ×3** — see §3 |
| `node scripts/resilience/run-chaos.mjs` | **PASS after fix** — `57 checks, seed=1337, 0 data-loss / 0 account-mix / 0 false-success` |
| `node scripts/run-observability-proof.mjs` | **PASS** |
| `node scripts/run-logic-audit-proof.mjs` | **PASS** — `🎉 ALL PROOFS PASSED` |
| `npm run test:e2e:onboarding` | **PASS after fix** — `✅ ALL 11 PASSED` |
| `npm run test:e2e:settings-security` | **PASS** — `34 passed, 0 failed` |
| `npm run test:e2e:journey` | **PASS** — all 6 steps, 7 screenshots, `JOURNEY_EXIT=0` |
| `npm run test:e2e:auth:preflight` | **PASS** — `19 PASS · 0 FAIL`; full `test:e2e:auth` **blocked**: docker daemon stopped, supabase CLI + psql absent |

### Per-suite counts inside `test:gate`

`active-session 31` · `today-v2 48` · `progress-v2 11` · `data-portability 12` · `portability 49` · `notifications 30` · `insights 28` · `strength 33` · `finish-confirm 11` · `substitution 20` · `state-block 27` · `theme 26` · `recovery 15` · `secure-ops 9` · `canonical 16` · `data-safety 31` · `sync 38` · `onboarding-async 29` · `fixforward 17` · `isolation 39` · `reset-recovery 33` · `seed 35` · `catalog 274 media` · `food-db 23` · `coaching 38` · `policy 14` · `formula 159` · `media-rights inventory=274 magic=274 http=274, CLEARLY-LICENSED=250 IN-HOUSE=24` · `proof:media 4` · `minors 82` · `native-bridge PASS` · `hydration PASS` · `polish1 PASS` · `polish2 14` · `polish3 13` · `sand 16` · `calendar 51` · `session-engine 50` · `plan-builder 62` · `nutrition-history 61` · `health-foundation 51` · `recovery-engine 54` · `barcode 24` · `media-pipeline 15` · `sync-coverage 56`.

---

## 3. Perf / bundle — actual vs budget

```
✗ entry (index-*.js from index.html):        113.0KB  (budget 80.0KB)   +41%
✗ boot JS (entry + modulepreload):           168.7KB  (budget 140.0KB)  +21%
✗ largest lazy chunk:                        162.5KB  (budget 130.0KB)  +25%
```

**All three are pre-existing, not caused by P13.** Verified by running `perf:budget` on the base worktree (`/Users/ziyad/qimmah-p12`, `claude/sync-coverage-v1` @ `011e1f4`): identical failures, `entry 113.2KB` → the dialect merge actually shaved 0.2KB. The largest-lazy 162.5KB (`index-D0FJSvLw.js`) is the known-deferred `exercises` + `exerciseCues.generated` static coupling documented as D6 in the structure audit. **The entry and boot-JS overruns are the two that were NOT previously called out as deferred** — treat them as open budget debt, not as accepted.

Largest emitted chunks: `index-D0FJSvLw.js 493KB (gzip 162KB)`, `index-*.js 482KB (gzip 113KB)`, `vendor-zxing 444KB (gzip 112KB)`, `muscles 183KB (gzip 10KB)`, `SetupView 145KB (gzip 34KB)`, `vendor-react 135KB (gzip 43KB)`.

---

## 4. FAILs with reproduction steps

### FAIL-1 — `test:e2e:onboarding` broke on the dialect merge → **FIXED**

**Cause:** `scripts/e2e-onboarding.mjs` asserted four pre-dialect MSA literals that `content/dialect-copy-v1` rewrote in `src/design-system/v2/labels.ts`. `test:gate` does not include browser E2E, so the gate was green while the app's own onboarding E2E was red.

Reproduce on the merge commit before the fix:
```bash
git checkout bbdad4c -- scripts/e2e-onboarding.mjs && node scripts/e2e-onboarding.mjs
# ❌ training step rendered / equipment step exact MSA / forced failure is visible
# ❌ TimeoutError waiting for button 'أعد المحاولة'  → 4 FAILED
```
Base branch for contrast: `cd /Users/ziyad/qimmah-p12 && node scripts/e2e-onboarding.mjs` → `✅ ALL 11 PASSED`.

**Fix** (`scripts/e2e-onboarding.mjs`) — expectations re-pointed at the dialect literals; **no check weakened**, every assertion is still an exact-string role query:

| was (MSA) | now (dialect) | source |
|---|---|---|
| heading `نُعد جدولك` | `نجهّز جدولك` | `labels.ts` `training.title` |
| heading `أين وكيف تتمرّن؟` | `وين وكيف تتمرّن؟` | `labels.ts` `equipment.title` |
| heading `تعذّر إعداد الخطة` (×2) | `ما قدرنا نجهّز الخطة` | `labels.ts` `error.title` |
| button `أعد المحاولة` | `جرّب مرة ثانية` | `labels.ts` `error.retry` |

The check name `equipment step exact MSA` was renamed to `equipment step exact dialect copy` — the old name was factually wrong after the merge. Result: **11/11**.

### FAIL-2 — `run-chaos` INV 9 + INV 12: a read path crashes under storage quota → **FIXED**

**Pre-existing on base** (`/Users/ziyad/qimmah-p12` reproduces the identical `1 of 57 checks broke`), so it is not a merge regression — but it is a genuine bug and it is in the lib layer, so I fixed it.

Reproduce:
```bash
node scripts/resilience/run-chaos.mjs
# ✗ FAIL: تحميل «التغذية اليوم» تحت الامتلاء → لا رمي  [INV 9,12]
# ✗ Invariants BROKEN: 9, 12  →  ❌ 1 of 57 checks broke (seed=1337)
```

**Root cause chain:** `loadNutritionToday()` → `assemble()` → `getNutritionDaySnapshot()` → `loadNutritionDay()` → `ensureNutritionUnified()` → `runMigration()`. Inside `src/lib/dataOwnership.ts`, `runMigration` wrote its rollback snapshot **outside** the `try` block:

```ts
writeJSON(snapKey, snapshot)   // line 141 — unguarded, and writeJSON is
                               // `ls()?.setItem(...)` with no try (line 39-41)
```

Under `QuotaExceededError` that throws straight out of `runMigration`, out of a pure **read** path, on component mount — i.e. the ErrorBoundary trips and the Nutrition view white-screens on a full device. Secondary defect: `rollback()` (line 143-149) also called bare `s.setItem`, so the `catch` handler could itself throw and re-escape.

**Fix** — two guards, both strengthening the contract:
1. If the snapshot cannot be persisted, **abort before touching any data** and return `skipped`. The migration stays recorded as *not done*, so it retries on a later load when storage frees up. This is stricter than before: previously a migration could proceed with no rollback point.
2. `rollback()` now guards each key individually, so one failing restore no longer aborts the rest, and `runMigration` never throws.

`writeJSON` was deliberately **left unguarded globally** — silently swallowing failures there would hide `stampDataOwner` write failures, which the data-safety contract depends on.

Verification after the fix: `run-chaos` **57/57**, and `test:data-safety` 31 · `test:canonical` 16 · `test:portability` 49 · full `test:gate` all still green.

### FAIL-3 — English mode still leaks Arabic (12 items) → **NOT FIXED, out of scope**

Full list with file:line in `P13-CODEX-HANDOFF.md` §B. Split:
- **7 view-layer** (forbidden scope — bilingual data already exists, the JSX just ignores it): `ExerciseMedia.tsx:168,191`, `MuscleMap.tsx:130`, `NutritionV2.tsx:309` (`servingLabelAr`), `ExerciseLibraryView.tsx:215`, `StepWorkoutTemplate.tsx:126`, `StepGeneratePlan.tsx:102,121` + `StepNutrition.tsx:177`, `WorkoutV2.tsx:897` + `TodayLearnCard.tsx:48`.
- **5 data/lib gaps that no view branch can fix** because **no English field exists at all** — these need English content authored, which is a content wave, not a technical fix: `restTips.ts` (`textEn` missing), `lessons.ts` (`titleEn`/`bodyEn`/`takeawayEn` missing), `portability/registry.ts:59` (`StoreDef.labelEn` missing, + Arabic-only errors in `importer.ts:263`, `format.ts:41`), `exerciseGuidance.ts:106,113,119` (function has no `lang` parameter), `exercises.ts` `targetMuscleAr`/`subGroupAr` (latent — currently guarded at the call site).

**The guard is far too narrow:** `scripts/polish1-proof.ts` is the only EN-leak proof and its Arabic regex `/[؀-ۿ]/` is applied to **only the 5 `V2_TAB_LABELS[*].en` values**. It cannot catch any of the 12. Recommended: a repo-wide proof asserting "no `*Ar` field is rendered without a `lang` branch" + a reverse EN-in-AR guard.

### FAIL-4 — perf budget ×3 → pre-existing, see §3. Not fixed (would require the D6 lazy-cues refactor + entry-chunk split, i.e. real product/arch work).

---

## 5. What is NOT VERIFIED (device-only — Ziyad's checklist)

Nothing below was tested. No pass is claimed for any of it.

1. **Barcode camera scan** — real product barcode on a physical iPhone; the web `@zxing` path inside WKWebView, camera permission prompt text, torch toggle, and the "not found" → «أضف يدويًا» path (which is a confirmed dead-end, HANDOFF §A-3).
2. **HealthKit — three states:** (a) full authorization, (b) *limited* (user grants steps, denies weight/HR), (c) unavailable (iPad / permission denied). Confirm the honest per-metric UI and that disconnecting a metric deletes its imported rows.
3. **Background rest timer** — start a rest interval, background the app, lock the screen; confirm the local notification fires at the right second and the timer is correct on return.
4. **True app-kill restore** — swipe-kill mid-workout (not a reload), relaunch, confirm the session resumes with the correct elapsed time and set state.
5. **Large-iPhone layout** — Pro Max / Dynamic Island / notch safe areas, and landscape. Only 320px width was verified, headless.
6. **Sunset auto-dark with real location** — the location permission prompt and the actual sunset switch.
7. **Two physical devices, one account** — sign in on both, log a workout on A offline, go online, confirm it lands on B with no duplicate and no false "synced".
8. **Live password recovery** — real Supabase email → reset link → new password → old password rejected. `test:e2e:auth` could not run (docker daemon stopped).
9. **Haptics** and the native status-bar/splash behavior.
10. **`npm audit`** — 4 vulnerabilities (1 moderate, 3 high) were reported at `npm ci` and were not triaged in this wave.

---

## 6. Remaining risks (honest)

1. **Browser E2E is outside `test:gate`.** This wave's only real merge regression was invisible to the gate. Until `test:e2e:onboarding` / `test:e2e:journey` are chained into `test:gate` (or CI), any future copy wave can silently break onboarding again. **Highest-value follow-up.**
2. **Copy assertions are string-literal coupled.** Four E2E checks broke on a pure copy change. Consider asserting on `V2_ONBOARDING.ar.*` imported values rather than duplicated literals, so a copy change updates test and app together.
3. **6 dead/misleading controls remain shipped** (HANDOFF §A). They are Codex's to wire; none is a crash, but «أضف يدويًا» and «الأدوية والمكمّلات» actively mislead.
4. **English mode is not shippable** (FAIL-3). Five of the twelve leaks need English content that does not exist yet.
5. **Perf budget is red on 3 of 3 checks** and two of them were not previously flagged as deferred.
6. **`unifyAttempted` is a module-level latch** — after my fix, a quota-blocked nutrition migration is skipped and will not retry until the next page load. Correct (no data touched, no crash) but worth knowing.
7. **Anon Supabase key is hardcoded as a build-time fallback** (`supabaseClient.ts:17-19`). Public by design and RLS-protected, but it means a fork ships pointing at this project unless `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set.
8. **`DIVERGE_KCAL=4`** accepted warnings in `test:food-db` — 4 food items whose calories diverge from their macros. Accepted by the suite, not investigated here.
9. **Merge cleanliness ≠ semantic cleanliness.** Zero conflicts meant zero human review of 40 copy files against P6–P12 behavior. The gate + E2E + chaos are the only evidence; nothing was eyeballed screen-by-screen.

---

## 7. Files changed by this wave

| File | Why |
|---|---|
| `scripts/e2e-onboarding.mjs` | FAIL-1 — 4 stale MSA expectations re-pointed at dialect literals |
| `src/lib/dataOwnership.ts` | FAIL-2 — `runMigration` snapshot/rollback made fail-safe under quota |
| `src/i18n/dict/onboarding.ts` | 3 missed MSA→dialect strings (`basicsDescription`, `goalStepEditLater`, `metricsDescription`) |
| `scripts/coaching/build-cues.mjs` | 2 MSA cue templates → dialect (generator, not the generated file) |
| `src/data/coaching/exerciseCues.generated.ts` | regenerated from the above (25 lines); generator confirmed byte-deterministic first |
| `docs/audit/FINAL-INTEGRATION-GATE.md`, `docs/audit/P13-CODEX-HANDOFF.md` | this report + UI handoff |

No file under `src/views/`, `src/components/MobileShell.tsx`, `src/App.tsx`, `src/styles/` or `src/design-system/` was modified.
