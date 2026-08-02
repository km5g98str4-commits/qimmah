# Wave 5 — Standards Court Reviews

قاعدة الحكم: مراجعة diff حقيقية قبل الدمج، ولا قبول لتعديل `package.json` من فروع الأنظمة، أو raw hex في `src/views/**`، أو نص عامّي جديد، أو مفتاح بيانات مستخدم غير مربوط بالمالك، أو منطق جديد بلا proof.

## Open-loop + Wave 4 reconciliation

| Branch | Tip | Verdict | Evidence / integration action |
|---|---|---|---|
| `content/food-db-quality` | `5b56a04` | ACCEPT | Data + validator + 19-check proof; no secrets/storage/package edit. Commander wired `test:food-db` and CI. |
| `docs/runbooks` | `515e80c` | ACCEPT WITH FIX | Docs only. Removed retired `netlify.toml`, made Cloudflare Pages authoritative, and conditioned sync FAQ on the feature being enabled. |
| `site/landing` | `8b063ea` | ACCEPT WITH FIX | Static local-resource site + CSP. Replaced placeholders/colloquial support copy with the approved AR/EN FAQ and `support@qimmah.app`. |
| `perf/bundle-optimization` | `b84783f` | ACCEPT | No storage/package/copy drift. Build proves Nutrition `633.21→182.06 kB` raw and ZXing isolated to an on-demand chunk. |
| `assets/screenshots-site` | `cd8ea7c` | ACCEPT WITH CONFLICT GUARD | Unique work is six 1260×2736 captures + Playwright factory; retained Wave 4 legal/12+ decisions and removed the stale duplicate shot plan. |
| `test/proof-deepening` | — | BLOCKED — NOT PRESENT | Missing from origin after five post-Phase-1 fetch loops; no code or proof was available to review. |
| `integration/wave4` diagnostic | `d2b6bd5` | ACCEPT / ABSOLUTE PRIORITY | `vite.config.ts` only; build-time `data-design="v2"` injection. Preserved Cloudflare build label and manual chunks. |

Security review result for the integrated set: **No high-confidence vulnerabilities identified.** No auth/sync logic changed by these branches; Wave 4 owner/recovery/wipe proofs remain green.

## Five systems

| System branch | Tip | Verdict | Blocking findings / wiring |
|---|---|---|---|
| `feat/notifications-engine` | `4b8a0be` | ACCEPT AFTER SECURITY FIX | Kept the commissioned settings UI/copy and native adapter; retained the trunk's current-owner, recovery, generation-race, and pre-sign-out guards. `test:notifications` remains 30/30. |
| `feat/insights-engine` | `52fc851` | ACCEPT AFTER FIX | Removed raw-hex fallbacks, moved copy to `src/data`, made muscle coverage compare the saved plan rather than a fixed list, preserved immediate Progress refresh, and wired 28 checks into `test:gate`. |
| `feat/plates-and-prs` | `90ddbe1` | ACCEPT AFTER FIX | Bounded plate inputs/DP, preserved canonical history as the sole PR source, treated first session as baseline, corrected zero-rep handling, and wired 33 checks into `test:gate`. |
| `feat/data-portability` | `bcf67c6` | ACCEPT AFTER SECURITY FIX | Explicit allowlist, owner/recovery re-check at preview and apply, owner-scoped backup/undo, bounded input, rollback, and canonical sync re-enqueue; 44 checks. |
| `feat/arabic-coach-content` | `871d20c` | ACCEPT CODE / REJECT PACKAGE DIFF | 181 cues + 40 lessons + 25 rest tips; 25 proof checks and owner-scoped lesson key. Commander wired `test:coaching` into `test:gate`, hid Arabic-only rest copy in EN mode, and replaced raw component colors with semantic success/danger tokens. |

## Gate ledger

Every completed merge ran: `typecheck` → `lint --max-warnings 0` → production build → `test:gate` (including food DB) → onboarding browser E2E → `npx cap sync ios`.

| Checkpoint | Result |
|---|---|
| food database | PASS |
| runbooks + Cloudflare reconciliation | PASS |
| marketing/support site | PASS |
| bundle optimization | PASS |
| App Store screenshot assets | PASS |
| Wave 4 v2 promotion reconciliation | PASS — built HTML contains `data-design="v2"`; RTL surface screenshots, zero console errors/overflow |
| Arabic coaching content | PASS after one fix loop — TypeScript narrowing corrected; 25 coaching checks + full gate green |
| Coaching semantic-color follow-up | PASS — typecheck, lint 0, v2 build, every `test:gate` suite, onboarding E2E 11/11, Capacitor iOS sync |
| Progress canonical-data follow-up | PASS — cloud-style measurements feed Progress without the retired key; validated logging enqueues through `historyStore`; actual achievement PR count feeds Profile; 11 regression checks + shared RTL browser proof |
| Data-access export fix-forward | PASS — 12 allowlist/owner/recovery checks + real JSON download, status/error semantics, and 3-breakpoint RTL proof |
| Notifications fix-forward | PASS — 30 owner/recovery/privacy/scheduling checks + 320/768/1280 RTL settings proof; native delivery remains a physical-device release check |
| Insights engine | PASS after standards fixes — 28 threshold/truth/plan/isolation checks; shared 320/768/1280 RTL proof covers Today and Progress |

Security follow-up: the new measurement form accepts bounded numeric values only,
creates a client id, and writes through the existing owner-guarded sync boundary.
No auth/recovery/wipe logic changed; queue execution still requires the matching
runtime owner with `recoveryActive=false`, and database RLS remains owner-only.

## Commander data-access export fix-forward

| Review axis | Verdict | Evidence |
|---|---|---|
| Standards | ACCEPT | Copy is data-driven; v2 UI uses semantic tokens, RTL logical layout, reduced-motion-compatible press feedback, and error icon + text. |
| Owner isolation | ACCEPT | Export requires `accountScope` owner equality; owner-scoped plan, tasks, session, and coaching readers receive that same owner id. |
| Recovery safety | ACCEPT | `recoveryActive` fails closed before any data is read or delivered. |
| Exfiltration surface | ACCEPT | Explicit allowlist excludes auth/session tokens, sync queue/backup/meta, analytics IDs, caches, and other-owner registries; 10 MB cap limits accidental oversized output. |
| Proof | ACCEPT | 12 deterministic checks plus real-browser download/error/status proof and 320/768/1280 RTL screenshots. |

This trunk fix-forward closes the access-export gap; it does not claim that the absent
`feat/data-portability` branch landed, and it intentionally does not implement import/restore.

## Commander notifications fix-forward

| Review axis | Verdict | Evidence |
|---|---|---|
| Standards | ACCEPT | All copy is data-driven; shared v1/v2 UI uses semantic tokens, logical RTL layout, switch semantics, icon + text errors, and reduced-motion fallbacks. |
| Owner isolation | ACCEPT | Preferences use `qimmah:notifications:v1:<ownerId>`; each reconcile requires the runtime owner and cancels known native schedules before rescheduling. |
| Recovery safety | ACCEPT | `recoveryActive` cancels and schedules nothing; the permission prompt is never requested during background reconciliation. |
| Lock-screen privacy | ACCEPT | Notification payloads are generic and contain no medication, supplement, workout-plan, account, or body-data values. |
| Lifecycle safety | ACCEPT | Sign-out awaits native cancellation; serialized reconciliation and a generation guard prevent a stale account-switch task from winning. |
| Proof | ACCEPT | 30 deterministic checks plus web unsupported-state semantics and 320/768/1280 RTL screenshots with no console error/overflow. |

## Blocker record

All five commissioned system branches now have immutable reviewed tips and are integrated. `test/proof-deepening` remains the only requested branch absent from `origin`; its missing work is not claimed green. The commander's earlier overlapping side branch remains archive-only and contributed review notes, not competing implementations.

## Command-correction disclosure — 2026-07-14

The commander pushed `codex/v21-completion @ 98a4ff6` before command correction. It is
**not merged into Wave 5** because it overlaps the commissioned `plates-and-prs` and
`data-portability` systems; their future origin branches remain canonical.

| Overlap | Review notes available to the commissioned branch | Disposition |
|---|---|---|
| Plates + PRs | Bounded exact/nearest-lower plate solver (avoids greedy failure), first-load baseline is not a PR, events derive from canonical finished sessions, no second PR storage key, 26 proof checks. | Notes only; wait for `feat/plates-and-prs`. |
| Data portability | Import allowlists and size/depth/node bounds, owner re-check at preview **and** apply, recovery fail-closed, pre-replacement backup, storage rollback, canonical writer/sync re-enqueue, 33 proof checks. | Notes only; wait for `feat/data-portability`. |
| v2 production switch | The side branch made all production builds v2 by default. Wave 5 keeps the absolute-priority Wave 4 seam from `d2b6bd5`; no side-branch switch logic was imported. | Canonical Wave 4 decision wins. |

Side-branch proof was independently green before disclosure: typecheck, lint 0, production
build, 427 assertions + 274 media files, Capacitor sync, Xcode Simulator build, 30 RTL
screenshots, zero console errors/overflow, reduced-motion and AA contrast.

## Fresh trunk depth ladder — 2026-07-14

| Review | Verdict | Evidence |
|---|---|---|
| Adversarial owner/recovery review | PASS | Notification reconcile cancels first, rejects missing/mismatched owner and `recoveryActive`, then generation-checks again before native scheduling. Coaching uses `qimmah:coach:lessons:v1:<owner>`; insights has no persistence/network boundary. |
| Standards sweep | PASS | Zero raw hex literals in `src/views/*V2.tsx`; forbidden-copy grep produced only documented dish/exercise-name substrings, not real voice violations. |
| Accessibility AA | PASS | 30 RTL screenshots at 320/768/1280; zero overflow/console errors; token contrast and reduced-motion fallbacks pass. Notification switches expose `role=switch` + `aria-checked`; errors/statuses use live roles and icon + text. |
| Fresh full gate | PASS | Clean install; typecheck; lint 0; production build (2140 modules); 379 assertions + 274 media files; Capacitor iOS sync with 5 plugins. |

Security-review conclusion: **No high-confidence vulnerabilities identified in the merged
Wave 5 system diffs.** Production RLS deployment and physical-device notification delivery
remain manual release checks, not inferred green results.

The command-correction refresh loop originally ended before three commissioned branches
appeared. They were later reviewed and integrated at the immutable tips recorded above.
`test/proof-deepening` is still absent and remains the only unreviewable requested branch.

## Data portability branch refresh — 2026-07-15

| Review axis | Verdict | Evidence / fix-forward |
|---|---|---|
| Branch | ACCEPT AFTER FIX | `feat/data-portability @ bcf67c6` appeared after the earlier bounded loop and was merged with the existing export surface and notifications settings preserved. |
| Owner boundary | FIXED | Preview captures the authenticated owner; apply re-checks runtime owner + recovery state; account switches fail closed. Export performs the same immediate owner check. |
| Raw storage | FIXED | Export/import are explicit-allowlist only. Unknown `qimmah:*` keys are not exported and schema v1 rejects unregistered imports before any write. |
| Atomicity | PASS | Owner-scoped pre-import snapshot, loader verification, rollback on failure, one-step undo, and canonical sync re-enqueue when the guarded sync feature is enabled. |
| Input limits | PASS | 25 MB, 250k-node, 64-depth, per-store shape/count limits, dangerous-key rejection, and schema gate. |
| UI standards | FIXED | Existing notifications route retained; raw status/error hex removed for v2 semantic tokens; error/status live semantics added. |
| Proof | PASS | 44 portability assertions; full typecheck/lint/build/`test:gate`; onboarding E2E 11/11; Capacitor iOS sync; flagged build contains `data-design="v2"`. |

Security review conclusion: **No high-confidence exploitable vulnerability remains in the
merged portability path.** The original branch's missing apply-time owner re-check and raw
unregistered-key import were rejected and fixed before the merge checkpoint.

## Finish-line decisions — 2026-07-16

### Requested-branch dispositions

| Branch / ref | Decision | One-line rationale |
|---|---|---|
| `test/proof-deepening` | **DROPPED** | Re-fetched `origin --prune`; still absent on origin. The open-loop agent never pushed it — unreviewable, so it is closed as dropped, not deferred. |
| `codex/v21-completion @ 98a4ff6` | **SALVAGE-REVIEW ONLY — NO MERGE** | Parallel completion (62 files, +1473/-290) that duplicates commissioned systems. Not merged; commissioned branches are canonical. |

### `codex/v21-completion` salvage notes (diff vs `integration/wave5`)

Merge-base `cef7aad`. The branch's substantive additions all overlap systems already
commissioned and integrated on wave5, generally with weaker proofs:

- **Data restore/import** (`DataRestorePanel.tsx`, `dataRestoreCopy.ts`, `dataPortability.ts +234`) —
  duplicates the canonical `src/lib/portability/*` (importer with preview/apply/undo, owner-guarded)
  already wired into `ProfileV2`, which ships a **44-assertion** portability proof. No extraction.
- **Plate calculator** (`PlateCalculatorPanel.tsx`, `plates.ts`) — overlaps the commissioned strength
  system (`src/lib/strength.ts`: plate math, warm-up, unified PR detection) already in `WorkoutV2`.
- **Personal records** (`personalRecords.ts`) — overlaps the unified PR detection in `strength.ts` +
  achievements engine.
- **Weekly insights / notifications / progress** deltas — overlap the commissioned insights (28-check)
  and notifications (30-check) engines already on wave5.

**No genuinely superior fragment warrants extraction.** wave5's canonical implementations carry
stronger proofs (portability 44, isolation 39, coaching 37, notifications 30, insights 28). Verdict:
do not merge; branch left in place on origin for the owner's reference only.

### Four standards findings — closed on `integration/wave5`

| # | Finding | Status | Proof |
|---|---|---|---|
| 7 | workout-summary key not owner-scoped | **FIXED** | owner-scoped `qimmah:workout-summary:v2:<owner>` + legacy-flat migration (ambiguous discarded) + export registry; isolation proof 28→**39** (two-user + wipe + migration). |
| 8 | rest tips not rendered on Active Workout | **FIXED** | `WorkoutV2` RestPanel renders muscle-matched tip: dismissible, `role=note`/`aria-live`, AA (~9.3:1) on dark, reduced-motion-safe; coaching proof 28→**37** (behavioural + source wiring). |
| 9 | LIVE-AUTH.md inaccurate Docker command | **FIXED** | Postgres-only compose can't serve auth; `test:e2e:auth` self-runs `supabase start`. Doc rewritten; offline preflight 19/0 verified; live run OWNER (no Docker here). |
| 10 | portability count 38→44 | **FIXED** | Proof derives count (44); corrected the stale doc mirror in E2E.md, plus isolation 28→39 and coaching 25→37 doc reconciliation. |

### Native proof (the sandbox-blocked chain)

Both branches: `npm run build` → `npx cap sync ios` (5 plugins, SPM) →
`xcodebuild -project ios/App/App.xcodeproj -scheme App` (iphonesimulator) **BUILD SUCCEEDED** →
install `com.qimmah.mobile` on iPhone 17 Pro (iOS 26) → launch → render → home-icon visible.
Screenshots: `docs/proof/native/wave5/*` (wave5, VITE_DESIGN_V2) and
`docs/proof/native/promotion/*` (flagless v2-default StartView).
