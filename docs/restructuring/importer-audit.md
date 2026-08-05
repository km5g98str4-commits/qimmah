# QIM-003 — Duplicate importer paths and authorities

## Scope and evidence identity

This is a read-only characterization of JSON file-import paths and the code that has authority to apply imported product data. It does not recommend, implement, or authorize consolidation.

- Repository: `km5g98str4-commits/qimmah`
- Branch: `codex/qimmah-execution`
- Evidence commit: `8f999dbe09bedb129ac7c3d4c5a699344091a27c`
- Audit date: 2026-08-06
- Static-evidence record: `docs/restructuring/evidence/QIM-003-importer-static-scan.md`

Classification:

- **verified** — direct static path and authority evidence exists at the evidence commit.
- **historical** — a prior document records a superseded claim that conflicts with current source.
- **unresolved** — a future ownership/consolidation decision is required; this audit does not make it.
- **external/unavailable** — runtime reachability was intentionally not exercised in this read-only package.

## Finding summary

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Two live, user-file JSON paths can apply a full data backup: Profile V2's portability pipeline and the legacy Settings path. They have different validation, ownership, rollback, and success semantics. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/views/ProfileV2.tsx:394-530`; `src/views/SettingsView.tsx:81-124,228-259`; `src/App.tsx:420-431,493-496` | Static route and call-chain scan in the evidence record. |
| The canonical portability pipeline is a full-data import authority: it parses, validates, previews, rekeys to the active owner, snapshots, atomically applies, verifies, and supports undo. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/lib/portability/importer.ts:74-294`; `src/lib/portability/registry.ts:121-235` | `parseImportFile`, `applyImport`, and `undoImport` are invoked by the live Profile V2 DataScreen. |
| `DataManagementPanel` duplicates the hardened portability UI flow but has no source importer outside its own definition and no app-shell route/import. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/components/DataManagementPanel.tsx:1-247`; `src/App.tsx:14-43,372-501` | Static reference scan finds `DataManagementPanel` only at its definition; the app shell does not import it. |
| `CustomizationCenter` imports a plan-draft JSON file into React state and requires a separate save; it is not a full-device data-backup importer. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/sections/CustomizationCenter.tsx:158-225`; `src/components/customizer/steps/StepReview.tsx:180-185`; `src/views/SetupView.tsx:50-62` | It uses `FileReader`, assigns only `setData`, and persists only through later `applyCustomization(data)`. |
| `historyStore.importHistory` is a direct partial-history write authority, reached by the live legacy Settings importer and cloud hydration; it is not itself a file parser. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/lib/historyStore.ts:441-456`; `src/views/SettingsView.tsx:100-123`; `src/lib/syncService.ts:657-704` | Call-site scan shows both Settings and sync hydration invoke `importHistory`. |
| `syncService.restoreSnapshot` is an exported direct-history wrapper with no source callers in this snapshot. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/lib/syncService.ts:736-742` | Exact-reference scan found its definition only. |
| A prior audit states that the raw Settings importer was removed. Current source retains it, so that statement is historical rather than current evidence. | historical | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `docs/audit/FULL-E2E-AUDIT.md:27,158`; `src/views/SettingsView.tsx:99-124,228-259` | Current source is the controlling evidence for this audit. |
| Runtime browser reachability and hostile-input behavior were not executed because QIM-003 is read-only characterization. | external/unavailable | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | browser/runtime environment | Static paths were traced; no browser, file-upload, or mutation test was run. |

## Importer-path and authority matrix

| ID | Entry path and status | Authority boundary | Contract and safeguards | Repository / branch / commit / path / evidence |
| --- | --- | --- | --- | --- |
| P1 | **Live full-data importer.** `#/profile` → `ProfileView` → `ProfileV2` → internal `DataScreen` → file picker. | `parseImportFile` is the parser/validator; `applyImport` is the apply authority; `undoImport` is rollback authority. | Reads via `readFileText`; validates schema, structure, bounds, registered stores, and owner; requires preview/confirm; blocks password recovery; applies through portability snapshot/rollback/verification. | `km5g98str4-commits/qimmah`; `codex/qimmah-execution`; `8f999dbe09bedb129ac7c3d4c5a699344091a27c`; `src/App.tsx:493-496`, `src/views/ProfileView.tsx:1-12`, `src/views/ProfileV2.tsx:79-81,394-530`, `src/lib/portability/importer.ts:74-294`; evidence record §1. |
| P2 | **Live legacy full-data importer.** `#/settings` → `SettingsView` → file picker. | `SettingsView.onImport` parses bytes and directly calls `applyCustomization`, `importHistory`, `savePreferences`, and `markPendingSync`. | Reads with `FileReader` and `JSON.parse`; asks for browser confirmation; merges partial customization and writes history/preferences directly; no portability preview, owner rekey, undo snapshot, or post-apply verification appears in this path. | `km5g98str4-commits/qimmah`; `codex/qimmah-execution`; `8f999dbe09bedb129ac7c3d4c5a699344091a27c`; `src/App.tsx:420-431`, `src/views/SettingsView.tsx:81-124,228-259`, `src/lib/historyStore.ts:441-456`; evidence record §2. |
| P3 | **Unreachable duplicate hardened UI.** `DataManagementPanel` has a file picker and the same portability sequence as P1, but no source route/import reaches it. | Same portability parser/apply/undo authorities as P1. | Same safety primitives as P1, but the component itself is not part of an active route graph in this snapshot. | `km5g98str4-commits/qimmah`; `codex/qimmah-execution`; `8f999dbe09bedb129ac7c3d4c5a699344091a27c`; `src/components/DataManagementPanel.tsx:18-118,225-247`; evidence record §3. |
| P4 | **Live plan-draft importer, distinct contract.** `#/setup` in advanced mode → `CustomizationCenter` → `StepReview` file picker. | `CustomizationCenter.onImportFile` can alter only the unsaved React draft; `applyCustomization(data)` is a later explicit persistence boundary. | Uses a prototype-key-filtering JSON reviver and object check. It has no full-data schema, store allowlist, owner rekey, or undo because it does not claim to restore a device backup. | `km5g98str4-commits/qimmah`; `codex/qimmah-execution`; `8f999dbe09bedb129ac7c3d4c5a699344091a27c`; `src/views/SetupView.tsx:50-62`, `src/sections/CustomizationCenter.tsx:168-225`, `src/components/customizer/steps/StepReview.tsx:180-185`; evidence record §4. |
| P5 | **Programmatic cloud hydration, not a user-file importer.** Cloud data flow calls `importHistory(merged)`. | `historyStore.importHistory` writes the history subset directly; sync orchestration pauses capture around hydration. | Sync is separately guarded by the sync feature flag and consent path; this audit does not treat cloud hydration as a duplicate UI backup flow. | `km5g98str4-commits/qimmah`; `codex/qimmah-execution`; `8f999dbe09bedb129ac7c3d4c5a699344091a27c`; `src/lib/syncService.ts:657-704`, `src/lib/historyStore.ts:441-456`, `src/lib/syncQueue.ts:118-132`; evidence record §5. |

## Authority overlap

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P1 and P2 overlap as full-data user-file import authorities. P1 writes via the registered-store portability contract; P2 directly writes customization, history, and preferences. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | P1/P2 paths above | `ProfileV2` calls portability; `SettingsView` calls direct writers. |
| P3 duplicates P1's hardened UI behavior, not P2's legacy behavior, but is currently unreferenced. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/components/DataManagementPanel.tsx:18-118`; `src/views/ProfileV2.tsx:408-454` | Both invoke `buildExportBundle`, `readFileText`, `parseImportFile`, `applyImport`, and `undoImport`. |
| P4 should not be folded into a full-data importer without a separate product and validation decision because its defined purpose is loading an unsaved plan draft. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `src/sections/CustomizationCenter.tsx:168-225` | The current scope and persistence boundary differ from P1/P2; QIM-003 makes no ownership decision. |
| The future canonical full-data importer and the disposition of P2/P3 require QIM-004 as a separate REVIEW package. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `8f999dbe09bedb129ac7c3d4c5a699344091a27c` | `docs/restructuring/WORK-PACKAGE-PROTOCOL.md:22-58`; this audit | QIM-003 is evidence only; code consolidation changes a privacy-sensitive authority boundary. |

## Non-actions and stop boundary

This audit did not modify application code, routes, wrappers, flags, importers, calculators, screens, dictionaries, fixtures, package files, branches, worktrees, PRs, or remotes. No browser upload, hostile-input, or mutation test was run. QIM-004 is not started by this document.
