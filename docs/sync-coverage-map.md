# Sync Coverage Map (wave3)

Base: `origin/integration/wave3` @ `e610b11`. Feature flag `VITE_SYNC_ENABLED` stays **OFF** (no live project). This closes the client-wiring gap on the **existing engine patterns only** (owner-scoped ops, client ids, idempotent upserts, tombstones, backoff, persisted queue). **Nothing double-syncs.**

| # | Local store | Schema table | Home / decision | Status | Rationale |
|---|---|---|---|---|---|
| 1 | onboarding profile | `profiles` | dedicated (single) | ✅ covered (pre-existing) | — |
| 2 | workout sessions | `workout_sessions` | dedicated (per-entity) | ✅ covered (pre-existing) | — |
| 3 | exercise history | `exercise_history` | dedicated (`user_id,exercise_id`) | ✅ covered (pre-existing) | — |
| 4 | measurement logs | `measurement_logs` | dedicated (`user_id,local_id`) | ✅ covered (pre-existing) | — |
| 5 | daily aggregate | `daily_logs` | aggregate (`user_id,date`) | ✅ covered (pre-existing) | Carries the day slices below in one row. |
| 6 | nutrition (`nutritionLogs`) | ~~`nutrition_logs`~~ | **stays in `daily_logs`** | ⏸ intentionally NOT dedicated | Already syncs as a `daily_logs` slice (`syncService enqueueSnapshot`). Wiring `nutrition_logs` too would **double-sync**. |
| 7 | water (`waterLogs`) | ~~`water_logs`~~ | **stays in `daily_logs`** | ⏸ intentionally NOT dedicated | Same — already a `daily_logs` slice. |
| 8 | supplements (`supplementLogs`) | ~~`supplement_logs`~~ | **stays in `daily_logs`** | ⏸ intentionally NOT dedicated | Same — already a `daily_logs` slice. |
| 9 | medications (`medicationLogs`) | ~~`medication_logs`~~ | **stays in `daily_logs`** | ⏸ intentionally NOT dedicated | Same — already a `daily_logs` slice (PDPL-sensitive; one home only). |
| 10 | steps (`stepCounter`) | `step_logs` | **dedicated (`user_id,date`)** | ✅ NEW this change | Was sync-blind; per-day count + source. Not part of the daily aggregate. |
| 11 | achievements (`achievements/engine`) | `achievements` | **dedicated (single `user_id`)** | ✅ NEW this change | Was sync-blind; one aggregate row (unlocked + PR count). |
| 12 | custom plan (`customPlan/storage`) | `custom_plans` | **dedicated (single `user_id`)** | ✅ NEW this change | Was sync-blind; one per-account plan snapshot + source. |
| 13 | todos (`todo/store`) | `todos` | **dedicated (single `user_id`)** | ✅ NEW this change | Was sync-blind; one per-account current-day list. |

## No-double-sync guarantee
Rows 6–9 have dedicated tables in the schema but are **not** wired client-side, because the same data already ships inside the `daily_logs` aggregate. Only rows 10–13 (previously sync-blind) get dedicated-table wiring. So every datum has exactly one cloud home.

## Engine touchpoints (this change)
- `syncQueue.ts` — `SyncTable` + `SYNC_TABLES` gain `step_logs | achievements | custom_plans | todos`.
- `syncStores.ts` (new) — the only reader/writer of the four aux stores for sync: `readAuxBackup`, `enqueueAuxOperations`, `hydrateAuxFromCloud`.
- `syncService.ts` — `onConflict`/delete-column for the new tables; **flush-time aux capture** (live-edit coverage without a per-write hook in the out-of-surface feature stores); hydrate selects the new tables, folds aux into the backup, and does a server-wins overlay with conflict logging.

## Owner-guard invariants (re-verified on every new path)
- Ops enqueue only for the authenticated runtime owner (`enqueueSyncOperation` self-guards); `enqueueAuxOperations` runs only after `guardedOwner` in flush.
- `recoveryActive` ⇒ `guardedOwner` returns null ⇒ **no aux capture, no aux upload** (proof ⑧).
- `wipeUserData(userId)` clears the shared queue + backup (`clearSyncArtifacts`) and prefix-wipes the aux store keys (none are in `GLOBAL_SAFE_KEYS`) (proof ⑨).
- Bounded queue: one op per step-day + one `'self'` op per single; replace-on-enqueue caps growth (proof ⑥).

## Legacy nutrition compat (wave3 debt)
`loadNutritionDay()` (`nutritionV2Model.ts`) reads the unified `qimmah:nutrition:v2`, with a one-release **read-only** fallback to legacy `qimmah:nutritionToday:v1`. Removal plan documented in-code (delete the fallback + legacy key one release after wave3 ships v2 as default).

## Tests (direct node run — no package.json edit)
```
node scripts/run-sync-proof.mjs
```
Extends the sync proof with sections ⑥–⑨ (new op types, aux hydrate/backup/server-wins/conflict, recovery guard, wipe). All other suites unchanged.
