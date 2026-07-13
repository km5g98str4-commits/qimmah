# Data Export — Design (PDPL Right of Access, R-1)

> **Design only — no code in this change.** Closes the *design* half of PDPL gap
> **R-1** (`docs/legal/pdpl-gap-checklist.md`, branch `legal/appstore-pack`): the
> app shows a disabled "تنزيل نسخة — قادم لاحقًا" and has no export yet. This spec
> defines the export shape and two delivery paths so the owner can honour access
> requests **now** (manual) and implement the in-app button **later** (wired to
> code that already exists). Traces to `integration/wave3`.

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

## Export envelope (proposed JSON)

```jsonc
{
  "export": { "app": "Qimmah", "version": "1.0.0", "generatedAt": "<ISO>", "schema": 1 },
  "account": { "email": "<from Supabase>", "displayName": "<optional>" },
  "profile": { /* customization.profile + targets + plans */ },
  "history": { /* HistorySnapshot verbatim (snapshotForExport) */ }
}
```
- UTF-8, Arabic preserved. One file: `qimmah-export-<yyyy-mm-dd>.json`.
- `schema` lets a future importer validate; `restoreSnapshot()` already consumes the `history` half.

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

## Path 2 — In-app "Export my data" (implementation design, future)

Wire the disabled ProfileV2 button (`docs/legal/pdpl-gap-checklist.md` R-1) to:
1. `const snapshot = snapshotForExport()` (already exists) + read `customization` + the live
   Supabase account email.
2. Build the envelope; `JSON.stringify(…, null, 2)`.
3. **Deliver:** web → `Blob` download; iOS (Capacitor) → write to app dir + share sheet
   (`@capacitor/filesystem` + share) so it lands in Files/Mail.
4. No new backend needed — everything is already on-device for a synced user.
5. Round-trip safety: a future "Import" reuses `restoreSnapshot()` (validates via `importHistory`).

### Acceptance criteria (when built)
- Produces the envelope above for `reviewer`/`veteran` seed profiles (see `DEMO-ACCOUNTS.md`).
- Contains zero other-user data; excludes analytics + catalog.
- Re-importable through `restoreSnapshot()` with no shape errors.
- A `scripts/export-proof.ts` can assert the envelope matches `HistorySnapshot` + customization keys.

## Deletion (the mirror right, already shipped)
Right of erasure (R-3) is live: `public.delete_own_account` (`…120007`, security-definer,
self-only) cascades cloud rows; the app then `wipeUserData()` locally. Export and deletion
together satisfy access + erasure.
