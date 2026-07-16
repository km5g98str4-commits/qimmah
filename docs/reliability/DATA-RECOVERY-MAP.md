# DATA-RECOVERY-MAP — Qimmah on-device data sources

> Agent 3 (Chaos & Data-Loss). Base: `origin/integration/wave6-staging` @ `82c53ceb0e873727a38b5cfebd641e8db14f7b23`.
> Scope: **frontend-only**. The single durable store on device is `window.localStorage`
> (prefix `qimmah:`). Cloud sync (Supabase) is **feature-gated OFF** by default
> (`VITE_SYNC_ENABLED !== 'true'`); it is a *backup/mirror*, never the on-device source of truth.

## Reading the table

- **Owner** — who the data belongs to. `device` = shared across all accounts (allowlisted, survives wipe).
  `account` = one user's data; must never be read/written under another account.
  `guest|account` = keyed by owner id, `guest` bucket when signed-out.
- **Backup** — is there a pre-mutation snapshot / recoverability path?
- **Recovery behavior** — what happens on corrupt / missing / adverse read.

## Owner-scoped vs. device-global keys

Isolation is enforced by `accountScope.wipeUserData()` — an **allowlist prefix wipe**: every
`qimmah:*` key is treated as user data and removed on logout / account-switch **unless** it is in
`GLOBAL_SAFE_KEYS`. This is fail-safe: a *new* key added later is wiped by default (it cannot leak
across accounts through a forgotten key). Some stores additionally embed the owner id in the key
(`…:<uid>`) or as a map field, so two accounts never share a slot even before a wipe runs.

| البيانات | مفتاح/جدول التخزين | المالك | الكاتب | القارئ | backup | recovery behavior |
|---|---|---|---|---|---|---|
| Account / session token | `qimmah:supabase-auth:v1` | device (allowlisted) | Supabase GoTrue | `authContext` | — (re-auth) | Kept across wipe (allowlisted) so account-switch doesn't self-eject the new user. |
| Last-seen owner | `qimmah:lastUser:v1` | device (allowlisted) | `accountScope.setLastUser` | `reconcileAccountScope` | — | Distinguishes "first run" (`undefined`) vs "guest" (`null`) vs uid; only real→different-real triggers wipe. |
| Onboarding draft | `qimmah:onboarding:v1` | guest\|device flag | `onboarding.saveOnboarding` | `loadOnboarding` | — | `loadOnboarding` swallows parse errors → `freshState()`. **Seed-write on read path is unguarded** (see F1). |
| Onboarding completion registry | `qimmah:onboarding:accounts:v1` | device (allowlisted) | `onboarding.markAccountOnboarded` | `isAccountOnboarded` | — | Kept across switch-wipe; cleared only by full `resetQimmah`. Per-account completion. |
| Onboarding profile (answers) | `qimmah:onboarding:profile:v1` | account | `onboardingProfile.saveOnboardingProfile` | `loadOnboardingProfile` | sync backup + import undo | Strict validate on read; invalid → default profile. Wiped on switch. |
| Customization (name/theme/units) | `qimmah:customization:v1` | account | `customization.ts` | `customizationContext` | import store | Validated read; unguarded write (best-effort). Wiped on switch. |
| Active workout snapshot | `qimmah:activeSession:v1:<uid\|guest>` | account (key-scoped) | `activeSession.saveActiveSession` | `loadActiveSession` | — (live) | **Strict** `isRestorableSnapshot`: version=1, freshness < 12h, day-shape match, every-exercise-state. Corrupt/stale → auto-clear, no restore. Write & read **swallow** quota. ✅ model store. |
| Workout history (sessions) | `qimmah:history:workoutSessions:v1` | account | `historyStore` (`saveWorkoutSession`) | `exportHistory`/UI | sync `workout_sessions`; import undo | `readJSON`→fallback; per-session normalize on read (never throws). Write swallows quota. Wiped on switch. |
| Exercise history (PRs/last) | `qimmah:history:exerciseHistory:v1` | account | `historyStore` | progress/insights | sync `exercise_history` | Same `writeJSON`/`readJSON` safe pattern. |
| Measurements | `qimmah:history:measurementLogs:v1` | account | `measurementLog.ts` → historyStore | progress | sync `measurement_logs`; import undo | Safe read/write; server-wins merge logs conflict. |
| Nutrition (per-day history) | `qimmah:history:nutritionLogs:v1` | account | `historyStore.saveNutritionLog` | history/insights | sync `daily_logs` aggregate | Safe. Deliberately synced inside `daily_logs`, not double-homed. |
| Water (per-day history) | `qimmah:history:waterLogs:v1` | account | `historyStore` | history | sync `daily_logs` | Safe. |
| Supplements / Medications | `qimmah:history:{supplement,medication}Logs:v1` | account | `historyStore` | wellness/history | sync `daily_logs` | Safe. |
| Nutrition — today scratch | `qimmah:nutritionToday:v1` | account | `nutritionTracking.saveNutritionToday` | `loadNutritionToday` | mirrored → history on persist | Read swallows parse errors. **F1: seed-write + save-write unguarded** → throws under quota → route-error card. |
| Nutrition v2 day model | `qimmah:nutrition:v2` | account | `nutritionV2Model` | v2 today | mirrored → history | Read guarded; **write unguarded** (F1). |
| Wellness — today scratch | `qimmah:wellnessToday:v1` | account | `wellnessTracking` | wellness | mirrored → history | **F1: seed-write + save-write unguarded.** |
| Commitments — today scratch | `qimmah:commitmentsToday:v1` | account | `commitmentTracking` | routine | mirrored → history | **F1: seed-write + save-write unguarded.** |
| Today done-flags | `qimmah:today:v1` | account | `today.saveToday` | `loadToday` | — (derived) | Day-stamp reset on read; **F1: seed-write + save-write unguarded.** |
| Steps (per-day) | `qimmah:steps:v1` | account | `stepCounter.setSteps` | `getSteps`/UI | sync `step_logs`; aux backup | `loadStepLog` clamps + drops bad values; **`persist`/`persistSources`/`saveStepGoal` writes unguarded** (F1). Day-keyed → no clock-shift cross-day bleed. |
| Step source / goal | `qimmah:stepSource:v1`, `qimmah:stepGoal:v1` | account | `stepCounter` | UI | aux backup | Clamped read; unguarded write (F1). |
| Custom plan | `qimmah:customPlan:v1` (owner-map) | account (map key = uid) | `features/customPlan/storage` | plan views | sync `custom_plans`; import | Owner-map: `{ [uid]: record }`. Import re-encodes under current uid only. |
| Plan builder answers / day names | via customization + plan libs | account | plan libs | plan | import | Derived from onboarding + custom plan. |
| To-dos / tasks | `qimmah:todo:v1:<uid\|guest>` | account (key-scoped) | `features/todo/store` | today/tasks | sync `todos`; import | Day-rollover on read; owner-suffix key. Unguarded write. |
| Notification prefs | `qimmah:notifications:v1:<uid\|guest>` | account (key-scoped) | `notifications/prefs` | engine | import | Validated `safe` read; write guarded (try/catch). |
| Reminder prefs (legacy) | `qimmah:reminders:v1` | account | `reminderPrefs` | reminders | — | Legacy single; superseded by notifications engine. |
| Achievements | `qimmah:achievements:v1` | account | `features/achievements/engine` + `syncStores.writeAchievements` | engine/UI | sync `achievements`; aux backup | `readAchievements` sanitizes shape; `writeAchievements` **guarded**. Engine writer unguarded. |
| Analytics consent + anon id | `qimmah:analytics:v1` | device (allowlisted) | `analytics/consent` | analytics | — | Allowlisted (survives wipe); de-identified via `resetAnalytics`. Guarded write. |
| Analytics milestones | `qimmah:analytics:milestones:v1` | device (allowlisted) | `analytics/milestones` | analytics | — | Allowlisted first-time flags (non-PII). |
| Sync queue | `qimmah:syncQueue:v1:<uid>` | account (key-scoped) | `syncQueue` | `syncService.flush` | is-the-queue | Per-op strict `isOperation(op, userId)`; foreign/corrupt ops dropped on read. Bounded (replace-on-enqueue). Owner-guarded at every entry point. |
| Sync backup (pre-hydrate) | `qimmah:syncBackup:v1:<uid>` | account (key-scoped) | `syncQueue.writeSyncBackup` | recovery | **the backup** | Written before server-wins hydrate overlay; wiped with owner. |
| Sync meta (lastSyncedAt) | `qimmah:sync:meta:v1:<uid>` | account (key-scoped) | `syncService.writeMeta` | status | — | Metadata only; guarded write. |
| Import undo snapshot | `qimmah:portability:undoBackup:v1:<uid>` | account (key-scoped) | `portability/importer` | `undoImport` | **the undo** | Staged before any import write; atomic rollback; owner-checked on undo. |
| Password recovery state | in-memory (`syncQueue.runtime.recoveryActive`) + URL params | session | `authContext` / `recoveryState` | sync guards | — | Pure URL parsing; while active, sync/import/hydrate all refuse (owner guard `!recoveryActive`). |
| Plates / warmup / lesson prefs | `qimmah:plates:v1:<uid>`, `qimmah:{warmup,lesson}…:<uid>` | account (key-scoped) | strength/coaching libs | UI | import (some) | Owner-suffix keys; guarded writes. |
| Products catalog / audit / seed | `qimmah:products:v1`, `…:audit:v1`, `…:saudi-seed-done:v1` | device (allowlisted) | `features/products` | product views | reseed | Device-level catalog; allowlisted (reseedable, non-PII). |
| Open Food Facts cache | `qimmah:off:cache:v1` | device (allowlisted) | `features/barcode` | barcode | refetch | Anonymous public cache; allowlisted. |
| Language / UI density / install flags | `qimmah:prefs:v1`, `qimmah:uiMode:v1`, `qimmah:install*` | device (allowlisted) | prefs/uiMode | app | — | Device preferences; **must survive wipe** (explicit requirement). |
| History migration flag | `qimmah:history:migrated:v1` | device (allowlisted) | historyStore | migration | — | One-shot accounting flag. |
| Service-worker caches | Cache Storage (`vite-pwa` `sw.js`) | device | Workbox SW | fetch | network | Precache + runtime; versioned by build; `autoUpdate`. Not localStorage. |

## Multiple-source-of-truth / risk notes

- **Today-scratch stores mirror into history on write** (`nutritionToday`→`nutritionLogs`,
  `wellnessToday`→{supplement,medication}Logs, `commitmentsToday`→derived). Two homes, but the
  scratch is a *cache of today* and history is authoritative for past days. Not a conflict —
  the write path always updates both; the read path prefers scratch only when `date === today`.
- **Steps & achievements are device-global keys** (not owner-suffixed) but are **account-owned**:
  they are wiped by the prefix wipe on switch/logout, so isolation holds. Because they are not
  key-scoped, a guest→login flow *merges* guest-era steps/achievements into the account on the
  next sync capture. This is intended (guest data adoption on first login), documented here.
- **Sync is a mirror, never authoritative on device.** Local write is durable first; the queue is
  the durable "pending" truth. Server-wins only during first-login hydrate, and only after an
  owner-scoped local backup is persisted (`writeSyncBackup`) — otherwise hydrate aborts unchanged.

## Invariants derived from this map (tested by the chaos harness)

See `scripts/resilience/chaos-proof.ts`. 12 machine-checked invariants, listed in
`docs/reliability/CHAOS-REPORT.md`.
