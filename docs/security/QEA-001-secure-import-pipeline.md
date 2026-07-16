# QEA-001 — Secure the `#/settings` data import pipeline

**Status:** Fixed · **Branch:** `fix/secure-import-pipeline` · **Base:** `integration/wave6-staging`
**Severity:** High (integrity / cross-account injection + false success signal)
**Area:** `src/views/SettingsView.tsx` (classic Settings, route `#/settings`)

---

## 1. Finding

The classic Settings page (`#/settings`) shipped its **own** import path that
bypassed the hardened portability pipeline used by Profile v2. `onImport` did:

```
FileReader → JSON.parse(String(result)) → applyCustomization(...) + importHistory(...) → window.alert(importSuccess)
```

Concretely it:

- **Never checked the schema version.** `EXPORT_VERSION = 2` was written on export
  but the importer read `parsed.version` **nowhere** — any shape was accepted.
- **Accepted any JSON as a customization.** When `parsed.customization` was absent
  it spread the **whole file** as a partial `Customization` (`parsed as Partial<Customization>`).
- **Performed no owner validation / rekey.** `importHistory(parsed.history)` wrote
  straight into the global History namespace regardless of the signed-in account —
  a **cross-owner injection** vector.
- **Had no prototype-pollution guard, no size/depth/node caps, no unknown-store
  rejection, and no password-recovery gate.**
- **Always reported success.** `window.alert(t.settings.importSuccess)` fired even
  for wrong-version or foreign-account payloads that were partially or wrongly
  applied — a dishonest success signal.

Meanwhile `src/lib/portability/*` (used by Profile v2 `DataScreen`) already
implemented the correct, defense-in-depth flow. The bug was solely that
`#/settings` did **not** call it.

## 2. Fix

The legacy `onExport` / `onImport` (raw `FileReader` + `JSON.parse`) and the
`QimmahExport` / `EXPORT_VERSION` shapes were **deleted** from `SettingsView`.
Data export/import now render through a new hardened component,
`src/components/DataManagementPanel.tsx`, which routes **exclusively** through
`src/lib/portability`:

```
readFileText → parseImportFile → preview → applyImport → done/undo
```

Guarantees inherited from the pipeline (verified in code — see `importer.ts`,
`registry.ts`, `guard.ts`):

| Threat | Control | Where |
| --- | --- | --- |
| Corrupt JSON | `safeJsonParse` throws → generic error | `importer.ts` |
| Unsupported schema/version | `schemaVersion !== 1` → reject | `importer.ts` |
| Oversized / deep / node-heavy | 25 MB + depth 64 + 250k nodes + per-store 100k caps | `importer.ts`, `registry.ts` |
| Prototype pollution | `__proto__`/`constructor`/`prototype` rejected via reviver at any depth | `importer.ts` |
| Cross-owner injection | allowlist-only stores + rekey to current owner; `unregistered` non-empty → reject; auth/sync keys never in allowlist | `registry.ts`, `importer.ts` |
| Unknown stores | `STORE_BY_ID[id]` miss → reject | `importer.ts` |
| Import during password recovery | `requirePortabilityOwner` fails closed on `recoveryActive` | `guard.ts` |
| False success | success UI only after atomic `applyImport` returns (snapshot → write → real-loader verify → rollback on any failure) | `importer.ts`, `DataManagementPanel.tsx` |

`export → wipe → import → deep-equal → undo` round-trip and owner isolation are
preserved (Profile v2 `DataScreen` was already correct and is **untouched**; both
surfaces now converge on the one hardened lib).

## 3. Proof — real `#/settings` browser regression

`scripts/e2e/settings-import-security.mjs` (Playwright/Chromium over `vite preview`)
drives the **actual** `#/settings` route — not a model test — and asserts, for a
signed-in user A:

- **Old exploit fails** for every payload (corrupt JSON, legacy v2 shape,
  `schemaVersion: 999`, `__proto__` pollution, unknown store, cross-owner
  `unregistered` carrying a foreign owner-map + a fake `supabase-auth` key):
  an **error** shows, **no preview**, **no success**, and `localStorage` is
  **byte-for-byte unchanged**.
- **Valid import succeeds** end-to-end: real Export button → captured file →
  preview → confirm → “Import complete”, and the mutated value is restored.
- The import **never rewrites the session token**.
- **User A then user B**: B sees zero residue of A; B's export contains neither
  A's data nor A's token/email.
- **No token/PII** appears in the console or in the export filename/content.

Result: **34 checks passed, 0 failed.** Registered as
`npm run test:e2e:settings-security` and wired into `scripts/e2e/journey.mjs`.

## 4. Gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ pass |
| `npm run lint -- --max-warnings 0` | ✅ pass |
| `npm run build` | ✅ pass |
| `npm run test:portability` | ✅ 44 |
| `npm run test:data-portability` | ✅ 12 |
| `npm run test:isolation` | ✅ 39 |
| `npm run test:reset-recovery` | ✅ 33 |
| `npm run test:e2e:settings-security` | ✅ 34 |
| `npm audit` | ✅ 0 vulnerabilities |

## 5. Notes / adjacent (out of scope)

- `src/sections/CustomizationCenter.tsx` and `src/components/customizer/steps/StepReview.tsx`
  import a **workout plan template** (`qimmah-plan.json`), a different, owner-agnostic
  trust model — not user-data restore. Not touched here; worth a follow-up review
  for parity of parse hardening.
- The obsolete `settings.importConfirm` / `importSuccess` / `importError` strings
  are retained (harmless data) since the legacy `window.confirm`/`alert` flow they
  served is gone; they can be pruned in a later tidy.

Do **not** merge to `main` without an explicit `approved`.
