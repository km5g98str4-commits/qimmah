# Testing — Qimmah (proof scripts)

The suite is **browserless proof scripts**: each `scripts/*-proof.ts` runs its logic
over a mocked `localStorage` (esbuild bundles it with `@/` aliases, a runner injects
the shim, then imports it). No test framework, no DOM. Deterministic and fast.
Verified on `integration/wave5`.

## Gate suites (must be green to release)

Run the release gate:
```bash
npm run test:gate
```

| Suite (`npm run test:…`) | Checks | Covers | Source |
|---|---|---|---|
| `active-session` | 31 | workout snapshot save/restore, owner isolation, 12h freshness, **timestamp rest timer** (background-safe) | `scripts/active-session-proof.ts` |
| `today-v2` | 32 | Today v2 model: 3 states, pillars, hero, hedged copy | `scripts/*today-v2*`/`run-today-v2-model-proof.mjs` |
| `progress-v2` | 11 | canonical hydrated measurements, immediate logging, honest trend copy, actual PR-event count | `scripts/progress-v2-proof.ts` |
| `data-portability` | 12 | allowlisted export schema, owner isolation, recovery guard, secret exclusion, size cap | `scripts/data-portability-proof.ts` |
| `notifications` | 30 | owner-scoped preferences, restart persistence, quiet hours, five reminder types, permission discipline, sign-out/account-switch cancellation, recovery guard, generic lock-screen copy | `scripts/notifications-proof.ts` |
| `insights` | 28 | honest weekly metrics, abstention thresholds, plan-based muscle coverage, deterministic priority, store isolation | `scripts/insights-proof.ts` |
| `sync` | 19 | sync queue: enqueue gating (`syncAllowedFor`), recovery guard, dedup, retry/backoff | `scripts/sync-proof.ts` |
| `onboarding-async` | 28 | onboarding flow: step validation, finalize state machine, owner-scoped draft round-trip, discard-on-finish | `scripts/onboarding-async-proof.ts` |
| `fixforward` | 17 | wave3 fixes: v2 workout → canonical session mapping; NutritionV2 → canonical `loggedFood` mirror | `scripts/fixforward-proof.ts` |
| `isolation` | 28 | account-scope: prefix wipe, global-safe allowlist, no cross-account leak | `scripts/isolation-proof.ts` |
| `reset-recovery` | 33 | `PASSWORD_RECOVERY` routing, `decideResetPhase`, no sync/wipe during recovery | `scripts/reset-recovery-proof.ts` |

The recovery + isolation + sync suites are the security-critical trio (they guard
`authContext`/`accountScope`/`syncQueue`); keep them green. `test:gate` also runs
the seed, catalog, food-database, coaching, and policy suites; `package.json` is
the authoritative list so new proof suites cannot be omitted from release checks.

## Runner pattern (how a proof works)

```
scripts/run-<name>-proof.mjs
  → esbuild.build({ entryPoints: ['scripts/<name>-proof.ts'], alias: { '@': 'src' },
                    banner: <localStorage shim>, platform: 'node' })
  → write bundle to tmp → import() → asserts print ✓/✗ → process.exit(1) on any fail
```
So **`node scripts/run-<name>-proof.mjs`** is the direct invocation behind each
`npm run test:<name>`. Data proofs that touch the filesystem/network use
`packages: 'external'` instead of the shim (e.g. media proof).

## Phase / feature QA proofs (direct node)

Not wired into the gate loop, run on demand:

| Command | Covers |
|---|---|
| `node scripts/run-logic-audit-proof.mjs` | cross-module logic invariants |
| `node scripts/run-achievements-proof.mjs` | medal/PR unlock logic |
| `node scripts/run-p3-media-proof.mjs` | exercise media resolution |
| `node scripts/run-p5-plan-proof.mjs` · `run-p5-reset-proof.mjs` | plan generation · reset |
| `node scripts/run-p8a3-proof.mjs` · `run-p8a2-off-proof.mjs` | phase-8 flows |
| `node scripts/run-p10-integration-qa.mjs` · `run-p10-i18n-proof.mjs` · `run-p10a3-session-proof.mjs` | P10 integration · i18n · session |
| `node scripts/run-p12-b-barcode-qa.mjs` · `run-p12-c-stats-qa.mjs` · `run-p12-d-polish-qa.mjs` · `run-p12-install-qa.mjs` · `run-p12-a3-proof.mjs` | P12 barcode · stats · polish · install · a3 |
| `node scripts/run-p4a3-proof.mjs` · `run-p4a3-ssr-proof.mjs` | P4 · SSR |

## End-to-end (build + browser)

```bash
npm run test:e2e            # npm run build && node scripts/e2e-onboarding.mjs
npm run test:e2e:auth       # scripts/e2e-auth/run.mjs (needs preflight)
```

## Database (RLS) — staging only

```bash
node scripts/db/run-verify-rls.mjs   # needs SUPABASE_* env (see scripts/db/apply-guide.md)
```
Asserts RLS own-row on all 13 tables + `delete_own_account` behaviour.

## Integrated content proofs

| Branch | Command | Covers |
|---|---|---|
| catalog | `npm run test:catalog` (+`CATALOG_MEDIA_REMOTE=1` for remote verification) | local assets + remote media URL policy |
| demo data | `npm run test:seed` | demo-seed shapes + idempotency |
| food database | `npm run test:food-db` | schema, quality, media, and Saudi/GCC catalog coverage |
| Arabic coaching | `npm run test:coaching` | exercise cues, lessons, rest tips, and owner-scoped progress |

## What "green" means at release
`npm run typecheck && npm run lint -- --max-warnings 0 && npm run build`, then
`npm run test:gate` passes. See `docs/RELEASE-RUNBOOK.md` Step 1.
