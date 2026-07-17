# CHAOS-REPORT — Qimmah resilience & data-loss engagement

- **Agent:** 3 (Chaos & Data-Loss Engineer)
- **Base:** `origin/integration/wave6-staging` @ `82c53ceb0e873727a38b5cfebd641e8db14f7b23`
- **Branch:** `test/resilience-chaos` (worktree `../qimmah-chaos`)
- **Harness:** `scripts/resilience/` — `run-chaos.mjs` (controllable localStorage + seeded clock/UUIDs) + `chaos-proof.ts` (57 checks, 12 invariants, 9 families). `npm run test:chaos`.
- **Determinism:** `CHAOS_SEED=1337` twice → byte-identical output. `CHAOS_SEED=42` → still green (no order-dependence).

## Golden rule verdict

> Not just "doesn't crash": **0 data-loss, 0 account-mix, 0 false-UI-success** across all executed scenarios (post-fix).

## Findings

| ID | السيناريو | الخطورة | النتيجة قبل | الإصلاح | النتيجة بعد | الدليل |
|---|---|---|---|---|---|---|
| F1 | Storage full (`QuotaExceededError`) while **loading** Today / Nutrition / Wellness / Commitments | P2 (crash-to-error-card on view mount; graceful-degradation gap — **not** data loss) | The 4 loaders seed a fresh state with an **unguarded** `setItem`; under quota they **throw**, tripping `ErrorBoundary` and crashing the surface on open. Deviated from the swallow-pattern used by `historyStore.writeJSON` / `saveActiveSession`. | Wrapped each read-path seed-write in `try/catch` (best-effort), returning the in-memory fresh state. Save-writers left throwing (no false-success regression). 4 files: `today.ts`, `nutritionTracking.ts`, `wellnessTracking.ts`, `commitmentTracking.ts`. | Loaders no longer throw under quota; last-good value preserved. | `chaos-proof.ts` family ④ — 4 checks RED→GREEN; `git diff` on the 4 libs. |
| T1 | (harness self-defect) `__proto__` import-rejection test | — | Test built the payload with an object literal `{ '__proto__': {} }`, which folds into the prototype and `JSON.stringify` drops it — the importer never saw a literal key. | Fed `parseImportFile` a **raw JSON string** with a literal `"__proto__"` key. | Importer correctly **rejects** it (reviver-based). Product code was never at fault. | `chaos-proof.ts` family ⑩. |

No P0/P1 data-loss, account-mixing, or false-success defects were found. The sync/owner-scope/import/active-session machinery is already strongly guarded (see "Why most invariants held" below).

## Invariants (all 12 machine-checked, all hold post-fix)

| # | Invariant | Where proven |
|---|---|---|
| 1 | A's data never read/written under B | ③ foreign-op drop, ⑤ queue-under-B, ⑨ two-account read |
| 2 | Finished/stale session never returns active | ② 13h expiry + auto-clear, ⑦ clock-back stays fresh / clock-fwd expires |
| 3 | Saved set never duplicated after retry | ① replace-on-enqueue + single server row, ⑨ double-submit |
| 4 | UI success ⇒ underlying write succeeded | ① drained-on-synced, ④ failed write preserves last-good |
| 5 | Recovery mode performs no sensitive ops | ⑥ enqueue/flush/hydrate/import all refuse |
| 6 | Import writes no unknown raw keys | ⑩ unregistered/unknown-store/`__proto__`/schema rejected |
| 7 | Queue never grows unbounded; idempotent | ①⑥⑨ one op per entity, one server row |
| 8 | server-wins/local-wins follows documented policy | ③ foreign drop, ⑦ per-day keys, ⑨ owner filter |
| 9 | Corrupt data never breaks first render | ③ 10 corruption shapes → null no-throw, ④ loaders no-throw, ⑧ unknown schema isolated |
| 10 | Wipe clears owner data only, keeps global allowlist | ⑤ guest→A→B→guest, language survives |
| 11 | No token/email/health payload in console | ⑩ conflict-log inspection |
| 12 | Every recoverable failure → understandable/retry state | ① error+retry, ② resume, ④ best-effort save |

## Counts

- **Scenario families executed:** 9 (network, app-kill, corruption, quota, account-switch, recovery, time/clock, update/migration, races).
- **Checks:** 57 (all pass post-fix). RED baseline: 5 failing (4 = F1 product bug, 1 = T1 test defect).
- **Invariants defined & tested:** 12 / 12.
- **Data-loss cases found:** 0.
- **Account-mixing cases found:** 0.
- **False-UI-success cases found:** 0.
- **Fixes landed:** 1 product family (F1, 4 files) + 1 harness self-fix (T1).

## Why most invariants already held (evidence-based)

- **Owner-scope:** `accountScope.wipeUserData` is an allowlist **prefix-wipe** — new keys are wiped by default, so no forgotten key can leak across accounts.
- **Sync:** every entry point self-guards to the runtime owner (`syncAllowedFor`), `flushImpl` re-checks `guardedOwner` **before every exfiltration batch**, `readSyncQueue` drops ops whose `userId` ≠ owner, and enqueue is replace-on-entity (bounded, idempotent).
- **Active session:** strict `isRestorableSnapshot` (version + 12h freshness + day-shape + per-exercise-state); corrupt/stale auto-clears; rest timer is timestamp-based (survives background freeze).
- **Import:** allowlist-only, atomic (undo snapshot staged before any write), owner re-encoded, recovery-refused, model-pollution rejected via `JSON.parse` reviver.
- **Recovery:** `recoveryActive` gates sync + import + hydrate at the guard layer.

## Residual risks / accepted design tensions

- **Save-writers throw on quota (by design, not fixed).** `saveToday`/`saveNutritionToday`/`stepCounter.persist`/etc. still throw on `QuotaExceededError` rather than swallow. This is *safer* for invariant #4 (no silent false-success) but can crash the active view via `ErrorBoundary` under sustained quota pressure. Making them swallow would trade a crash for a silent-write-loss — an **owner UX decision**, deliberately left unchanged. Documented, not silently altered.
- **Steps & achievements are device-global keys** (not owner-suffixed). Isolation still holds (prefix-wipe removes them on switch), but a guest→login flow *merges* guest-era steps/achievements into the account on first sync capture. Intended "guest adoption"; flagged for owner confirmation.

## GO / NO-GO

**GO** for daily **offline-first** use. On-device durability, corruption tolerance, account isolation, recovery guards, and time/clock handling all hold under the executed chaos matrix, with `VITE_SYNC_ENABLED` OFF (default) — the shipping config. F1 (the only product defect) is fixed and regression-covered.

## OWNER steps needing a real backend or device (out of harness scope)

Sync/hydrate/import-to-cloud were exercised with a **mock transport** — no real Supabase or RLS
was tested. Before enabling `VITE_SYNC_ENABLED=true` in production, the owner must, on a real
device against real Supabase:

1. Verify RLS actually blocks cross-user rows server-side (harness only proves the *client* refuses).
2. Confirm hydrate server-wins overlay + pre-hydrate backup on a device with real network flaps.
3. Confirm iOS Capacitor `appStateChange` foreground-flush and native reminder cancellation.
4. Confirm service-worker `autoUpdate` (old SW + new HTML) does not white-loop on a physical PWA install.
5. Decide the save-writer quota policy (residual risk above).

## Gate results (this branch)

`typecheck` ✓ · `lint --max-warnings 0` ✓ · `build` ✓ · `test:gate` ✓ (18 suites) · `test:observability` ✓ · `test:native-bridge` ✓ · `test:e2e:onboarding` ✓ (11) · `npm audit` ✓ (0 vulns) · `test:chaos` ✓ (57, deterministic ×2 seeds).
