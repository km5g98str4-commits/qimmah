# Data Export + Restore — Implemented (PDPL Right of Access, R-1)

> Implemented in `src/lib/dataPortability.ts` and shared by the v1 Settings and
> v2 Privacy surfaces. Export and restore are owner-scoped, blocked during
> `PASSWORD_RECOVERY`, capped at 10 MB, and covered by `npm run test:data-portability`.

## What "your data" is (per store)

### A. Local history — already serialised by `snapshotForExport()`
`src/lib/syncService.ts` → `snapshotForExport(): HistorySnapshot` = `historyStore.exportHistory()`.
Shape (`src/lib/historyStore.ts` `HistorySnapshot`):

| Field | Contents |
|---|---|
| `workoutSessions` | dated finished sessions (exercises, sets: weight×reps) |
| `exerciseHistory` | per-exercise best/last weight, 1RM est., streak |
| `dailyLogs` | per-day `workoutCompleted`, commitments |
| `measurementLogs` | weight / waist / body-fat entries |
| `nutritionLogs` | per-day `loggedFood` totals + doneMeals |
| `waterLogs` | per-day ml |
| `supplementLogs` / `medicationLogs` | per-day done map |

### B. Profile & settings — `customization.ts`
`qimmah:customization:v1`: profile (name, goal, weight, target, height, age, gender,
activity), computed targets, workout/nutrition plans, measurement plan.

### C. Account — Supabase (server-held)
Email + display name (auth). Cloud mirror rows in the **13 tables** (RLS own-row):
`profiles, workout_sessions, exercise_history, measurement_logs, daily_logs`
(`…120002`) + `nutrition_logs, water_logs, supplement_logs, medication_logs,
step_logs, achievements, custom_plans, todos` (`…120003`).

> **Excluded (not personal / not the subject's):** anonymous analytics
> (`src/lib/analytics/index.ts` — random id, no PII), the exercise/food **catalog**
> (`src/data/**`, static reference content), and media assets.

## Export envelope (schema v1)

```jsonc
{
  "format": "qimmah-data-export",
  "schemaVersion": 1,
  "exportedAt": "<ISO>",
  "build": "<build label>",
  "account": { "userId": "<owner-or-null>", "email": "<email-or-null>" },
  "data": { /* explicit allowlist of profile, history, daily, plan and coaching stores */ }
}
```
- UTF-8, Arabic preserved. One file: `qimmah-data-<yyyy-mm-dd>.json`.
- Auth/session tokens, sync internals, analytics identifiers, catalogs, and other-owner records are excluded.

## Path 1 — Owner-run manual access (available now)

For a request to `support@qimmah.app` (statutory access period):
1. Verify the requester owns the account (reply-to matches account email; if unsure, out-of-band confirm).
2. **Local half:** ask the user to run the in-app reset-adjacent console snippet, *or* if
   they can't, assemble from their cloud rows (step 3).
3. **Cloud half (owner, Supabase dashboard):** for the user's `user_id`, `select *` from each
   of the 13 tables + `auth.users` email → paste into the envelope above.
4. Send the single JSON to the verified address. Log the request + fulfilment date.

> Do the SQL read-only and scoped to the one `user_id`. Never export another user's rows
> (RLS protects the app; the dashboard bypasses RLS — be deliberate).

## Path 2 — In-app export and restore (live)

1. Export builds the exact allowlisted envelope and uses the native share sheet when available, with a deterministic browser download fallback.
2. Restore rejects wrong format/version/owner, unknown top-level data, dangerous prototype keys, oversized/deep payloads, and recovery sessions.
3. The user sees counts and source date before an explicit confirmation checkbox becomes actionable.
4. The app writes `qimmah:restoreBackup:v1:<owner>` before replacement, applies through canonical store writers, enqueues sync-ready rows, and rolls the whole Qimmah namespace back on failure.
5. `wipeUserData` removes the owner's restore backup by default through the account-scope fail-safe allowlist policy.

### Proof

- `npm run test:data-portability`: 33 deterministic export, owner, recovery, schema, malicious-input, backup, rollback, wipe, and UI-wiring checks.
- `node scripts/run-momentum-proof.mjs`: real download→upload→preview→confirm→restore round trip, RTL screenshots, reduced motion, no overflow/console errors.

## Deletion (the mirror right, already shipped)
Right of erasure (R-3) is live: `public.delete_own_account` (`…120007`, security-definer,
self-only) cascades cloud rows; the app then `wipeUserData()` locally. Export and deletion
together satisfy access + erasure.
