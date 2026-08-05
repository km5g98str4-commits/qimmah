# QIM-003 static importer-path evidence

Repository: `km5g98str4-commits/qimmah`
Branch: `codex/qimmah-execution`
Evidence commit: `8f999dbe09bedb129ac7c3d4c5a699344091a27c`
Method: read-only static inspection on 2026-08-06.

## 1. Route and full-data importer discovery

Command:

```text
rg -n "DataManagementPanel|DataScreen|parseImportFile|applyImport|undoImport|snapshotForExport|readFileText|onImportFile|restoreSnapshot" src
```

Result:

- `ProfileV2` imports portability functions at `src/views/ProfileV2.tsx:20-31`, switches to `DataScreen` at `:79-81`, parses selected input at `:422-434`, applies at `:437-449`, and undoes at `:452-454`.
- `DataManagementPanel` imports the same portability functions at `src/components/DataManagementPanel.tsx:5-16`, parses at `:66-84`, applies at `:86-108`, and undoes at `:116-118`.
- `SettingsView` contains `onImport` at `src/views/SettingsView.tsx:99-124` and invokes it from its file input at `:247-257`.
- `CustomizationCenter` contains `onImportFile` at `src/sections/CustomizationCenter.tsx:173-195` and exposes it to `StepReview` at `:209-221`.

## 2. Direct file-reader and storage-writer scan

Command:

```text
rg -n "new FileReader|readAsText\(|type=\"file\"|accept=\"application/json|parseImportFile\(|importHistory\(|restoreSnapshot\(" src
```

Result:

- File-reader paths: `SettingsView` and `CustomizationCenter`.
- Portability file-reader wrapper: `src/lib/portability/index.ts:31-41`.
- JSON file inputs: `ProfileV2`, `SettingsView`, `DataManagementPanel`, and `StepReview`.
- `historyStore.importHistory` is called from `SettingsView` and from cloud hydration in `syncService`.
- `syncService.restoreSnapshot` appears only at its definition (`src/lib/syncService.ts:740-742`) in the source scan.

## 3. DataManagementPanel reachability

Command:

```text
rg -n "DataManagementPanel" src --glob '*.{ts,tsx}'
```

Result: the only source occurrence is its own definition at `src/components/DataManagementPanel.tsx:31`. `src/App.tsx:14-43,372-501` contains no import or render of that component.

## 4. Active route evidence

Command:

```text
nl -ba src/App.tsx | sed -n '14,52p;372,505p'
nl -ba src/views/ProfileView.tsx | sed -n '1,24p'
nl -ba src/views/SetupView.tsx | sed -n '50,62p'
```

Result:

- `#/settings` renders `V.SettingsView` at `src/App.tsx:420-431`.
- `#/profile` renders `V.ProfileView` at `src/App.tsx:493-496`; `ProfileView` renders `ProfileV2` at `src/views/ProfileView.tsx:1-12`.
- `#/setup` uses `SetupView`; advanced mode renders `CustomizationCenter` at `src/views/SetupView.tsx:50-62`.

## 5. Historical-document comparison

Source inspected: `docs/audit/FULL-E2E-AUDIT.md:27,158` states that the legacy Settings importer was removed. The current `SettingsView` source at `src/views/SettingsView.tsx:99-124,228-259` retains the raw FileReader/JSON parse path. The source finding is current; the documentation claim is historical.

No code, runtime state, Git refs, PRs, or remote state was modified while collecting this evidence.
