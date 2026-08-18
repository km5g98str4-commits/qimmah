# Repository safety inventory

Snapshot date: 2026-08-06. This is an evidence inventory, not an authorization to change any item.

## Evidence convention

Each finding records the repository, branch, commit, path, and direct evidence used for this snapshot. Classifications mean:

- **verified** — directly established from the named commit or a read-only GitHub query.
- **historical** — preserved reference whose current product role is not an execution target.
- **unresolved** — existence is known, but its relationship or intended future is not decided here.
- **external/unavailable** — requires a runtime, credential, or external setting not available to this inventory.

## Baseline and safety boundary

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Execution baseline is a two-commit descendant of the approved `origin/main` baseline. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `docs/restructuring/BASELINE-LEDGER.md` | `git rev-parse HEAD`; parent chain reaches `dd79a60f193b1163ab1ec549a35458e0d2aab1de`. |
| Official source baseline remains `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de`. | verified | `km5g98str4-commits/qimmah` | `origin/main` | `dd79a60f193b1163ab1ec549a35458e0d2aab1de` | `refs/remotes/origin/main` | `git rev-parse origin/main`. |
| The execution worktree was clean before QIM-002. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | worktree `/Users/ziyad/Documents/Qimmah-execution` | `git status --porcelain` returned no paths. |

## Active route inventory

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Registered hash routes are `start`, `login`, `setup`, `dashboard`, `workout`, `exercises`, `nutrition`, `progress`, `steps`, `profile`, `calc`, `recovery`, `settings`, `privacy`, `terms`, `contact`, `reset`, `productReview`, and `stats`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/lib/appRoutes.ts:5-67` | `AppRoute` and `ROUTES` enumerate these values. |
| Main-tab routes are `dashboard`, `workout`, `nutrition`, `progress`, and `profile`; they are gated by onboarding in the app shell. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/lib/appRoutes.ts:57-58`, `src/App.tsx:468-501` | `MAIN_TABS` plus the shell render branches. |
| The app shell lazy-loads the stable route view names and renders them by `view`; it does not lazy-load `WorkoutV2`, `NutritionV2`, or `ProgressV2`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/App.tsx:14-43`, `src/App.tsx:372-501` | `createLazyViews` and route render branches; static-reference search found no app import of those three V2 views. |
| `productReview` is registered but production-gated to the not-found screen; its UI module is created only when `import.meta.env.DEV` is true. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/App.tsx:38-40`, `src/App.tsx:433-440`, `src/views/SettingsView.tsx:303-312` | DEV guard surrounds both import and route content. |

## Wrappers and V2 ownership

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `StartView` is a live stable-route wrapper whose sole render target is `StartViewV2`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/StartView.tsx:1-13`; `src/App.tsx:372-381` | Wrapper import/render and active `start` route. |
| `DashboardView` is a live stable-route wrapper whose sole render target is `TodayV2`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/DashboardView.tsx:1-14`; `src/App.tsx:468-471` | Wrapper import/render and active `dashboard` route. |
| `SetupView` is a live wrapper: first-time setup renders `OnboardingV2`; advanced mode renders `CustomizationCenter`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/SetupView.tsx:1-62`; `src/App.tsx:415-419` | Mode branch in wrapper and active `setup` route. |
| `ProfileView` is a live stable-route wrapper whose sole render target is `ProfileV2`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/ProfileView.tsx:1-12`; `src/App.tsx:493-496` | Wrapper import/render and active `profile` route. |
| `WorkoutV2` exists but has no app-shell route or static/lazy import; the live `workout` route renders `WorkoutView`. Its future ownership is unresolved. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/WorkoutV2.tsx`; `src/views/WorkoutView.tsx:1-110`; `src/App.tsx:22`, `src/App.tsx:473-476` | `rg` static-reference search found `WorkoutV2` definitions/models but no app-shell import; `WorkoutView` is the route target. |
| `NutritionV2` exists but has no app-shell route or static/lazy import; the live `nutrition` route renders `NutritionView`. Its future ownership is unresolved. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/NutritionV2.tsx`; `src/views/NutritionView.tsx:1-106`; `src/App.tsx:26`, `src/App.tsx:483-486` | `rg` static-reference search found V2 model consumers but no app-shell import; `NutritionView` is the route target. |
| `ProgressV2` exists but has no app-shell route or static/lazy import; the live `progress` route renders `ProgressView`. Its future ownership is unresolved. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/ProgressV2.tsx`; `src/views/ProgressView.tsx:1-92`; `src/App.tsx:27`, `src/App.tsx:488-491` | `rg` static-reference search found the V2 definition/model but no app-shell import; `ProgressView` is the route target. |
| `ProfileV2`, `TodayV2`, `OnboardingV2`, and `StartViewV2` are live only through their named stable wrappers above. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/views/ProfileView.tsx:1-12`, `DashboardView.tsx:1-14`, `SetupView.tsx:50-62`, `StartView.tsx:1-13` | Each wrapper imports and renders the V2 implementation; the app shell imports the wrapper. |

## Feature-flag and consent inventory

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Cloud sync is off unless `VITE_SYNC_ENABLED` is exactly the string `true`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/lib/syncQueue.ts:1-11`, `src/lib/syncQueue.ts:97-103` | `ENV_SYNC_ENABLED` is a strict literal comparison. |
| A sync operation additionally requires the authenticated owner, no recovery mode, no pending adoption, and cloud-sync consent. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/lib/syncQueue.ts:118-132` | `syncAllowedFor` combines all listed guards. |
| The actual deployment value of `VITE_SYNC_ENABLED` is not represented in tracked source and was not queried from a deployment environment. | external/unavailable | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | runtime environment | Source establishes the default behavior only; no production environment access was used. |
| The DEV product-review gate is the only explicit app-shell feature gate found by the source search; whether other deployment-time environment controls are set is unresolved. | unresolved | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `src/App.tsx:38-40`, `src/App.tsx:433-440`; `src/views/SettingsView.tsx:303-312` | Search over `src` for `import.meta.env`, `FEATURE`, and feature-flag terms. |

## Branch and worktree inventory

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Current execution worktree is attached to `codex/qimmah-execution`, two commits ahead of `origin/main`. | verified | `km5g98str4-commits/qimmah` | `codex/qimmah-execution` | `937b154909d7af04e98d9775c9c6beffb466a6a6` | `/Users/ziyad/Documents/Qimmah-execution` | `git worktree list --porcelain`; `git status --short --branch`. |
| The original worktree remains attached to preserved source branch `codex/ui-polish`; it contains the approved source fixture commit but was not merged. | historical | `km5g98str4-commits/qimmah` | `codex/ui-polish` | `f3d2f6f829f322cbe86f8064702467dc0d566839` | `/Users/ziyad/Documents/Qimmah 2` | `git worktree list --porcelain`; QIM-000 cherry-pick record. |
| Local `main` points to a different commit than `origin/main` and is not the execution baseline. | historical | `km5g98str4-commits/qimmah` | `main` | `db134afa7253c20d4bbc35efc910cfea27fa39cf` | `refs/heads/main` | `git log -1 main`; baseline is the remote-tracking ref above. |
| Fifty-three remote-tracking branches existed in this local snapshot; their future relationship to the execution baseline was not decided here. | unresolved | `km5g98str4-commits/qimmah` | `origin/*` | see ref snapshot below | `refs/remotes/origin/*` | `git for-each-ref refs/remotes/origin`; no fetch, checkout, deletion, or merge occurred. |

Remote-ref snapshot (`branch | commit`):

```text
origin/audit/design-fidelity | 9ca3df83e1911d73d2c44424e04ae05dfa8a2e42
origin/backup/claude-p25-3d-20260725 | cb43ef48a406b97c9a7f59006c95b0aeb5b7b647
origin/claude/off-integration-saudi-seed-fgzgc0 | 0a410505fbb7f61dc51d0af60165839be98b6477
origin/claude/p12-install-guide | 0660e26235c12f43a50f37475cf94a7b8c10c9fa
origin/claude/p14-body3d-engine-audit | cef75757531b2ee32f9d57ec9f55efcdf1539f77
origin/claude/p14-e2e-release-gate | 45b583cb97d554afd35f47cb6a0f8e3be6f88a3d
origin/claude/p31-muscle-lib-8w7upl | 3ee93318a10fe161be7ba2fd1fd2bdef99c6338c
origin/claude/q16-today-greeting-contrast | 2a07bc2dcd5bb3cebfdf47c934cbb9a1d1cc1de2
origin/claude/q18-health-discoverability | a18d3984b93811ebfe0b59b350d2c990de7a5d84
origin/codex/ui-polish | d99091d36fad449c483899459357acb14905713b
origin/content/food-r2-gcc-eatingout | 5c630b9e90abe71137668811f6b1afda31ff5bfe
origin/design/v21-promotion | cc96d842212d0143051c1c2974b3bdc529487265
origin/design/v21-slice0-1 | 4827873de968a1d3e969d6e5b9b1f20e6d9bcf39
origin/design/v21-slice2 | c3cbfbdfa6a9a5b8dffdec1a47bb0ac82b5ea792
origin/e/personalization-guardrail | 87590f0ac19a610605e8fc9e11f01b35e2472d49
origin/e/personalization-guardrail-r2 | dbc6bcdcdb174af7f9daa2ad9ecef42ab89cbc63
origin/e/plan-honest-axes | 6f0d33fe86b3a3aef58c63be4cd56a52bf523a63
origin/e/plan-preview | e5546377f0f4c290adea66a376648431752c48f1
origin/e/plan-rationale | 3998506e0f39c89c29190dba2cf313993a5271f1
origin/e/plan-why | c304227e986814bcd95756a9a8c632fb2b34536e
origin/e/settings-clarity | c5d977fe8df4e6ba96aacbf13bff02ba601d3864
origin/e/settings-clarity-r2 | 9d3cf0a750e891621f52e849fab90c712fb016ae
origin/feat/v11-experience | 7157c0fd9aa66d992b46cc105383107bbc397d74
origin/feature/mobile-app-shell-design | 725bf0a5845636f43419ab2ff4705db59c0276a8
origin/feature/mobile-plan-builder | 156a6bae749c9e3f3f402f6bcd1ea9754b575571
origin/feature/mobile-qa-product-polish | 3d4360ef1d095d30336519de52b0b2ad18d083ab
origin/feature/nutrition-progress-health-mobile | dd785f9e32ce80a094d1c93e17e0fb2d62216906
origin/feature/p25-steps-health | dfa19ee7a02f40ea5e70bb1fc75d3a3998cafe90
origin/feature/phase1-training-engine | a49ac27ab69442c8b2b76102016fe753950c7e64
origin/feature/phase2-exercises | 9e1e819b41d69a7435032413ed5b7d2483b9d847
origin/feature/v2-food-database-foundation | 53ab6e650c9c524a08a5547bd0a35f03a781b7b3
origin/feature/v2-nutrition-live-engine | c097520a7e0ab6624ee450e6767a50f29b0a193b
origin/feature/v2-product-cleanup-settings | 25c52b4e8f3800413552e33daa36b9f229fdd639
origin/feature/v2-training-plan-engine | a3d3e4b925995faa270887ebef12b87e95b2dd78
origin/feature/v2-workout-persistence-streak | 83384dc7241913d8f8433f3e16a2f1bc83eb33f6
origin/feature/workout-library-exercise-detail | 3ea1fe66e49dd6e1c9ac47cd6d98b7c79c16ee09
origin/fix/bodybuilding-ui-muscle-coverage | 3195935de0bfd56083d722df2754c428acd66de0
origin/fix/design-fidelity-v21 | a6415dfa3832c17b791f952a30a0ec5a2ba3ee2d
origin/fix/foundation-auth-app-shell | 7195445254ceafee3c24618a68ac861cbe1a14f7
origin/fix/founder-qa-round1 | a6415dfa3832c17b791f952a30a0ec5a2ba3ee2d
origin/fix/nutrition-inputs-validation | 14ca3c7afdbdf474f64c0a706e5ae9a388a68e63
origin/fix/product-foundation-auth-bb-ui | bd4d82318bf3fde6a2321cac45c422029e8ee9ed
origin/fix/qa-hardening-release-readiness | 3d4360ef1d095d30336519de52b0b2ad18d083ab
origin/fix/workout-history-dashboard-binding | 85858138317199e89939234f5f342aff3581afe4
origin/hotfix/p12-field-fixes-r2 | 4e17c67b49e4c94ffd6bfd982374023730c18d09
origin/hotfix/replace-bad-muscle-map | 68aec8c8497cb98e9086882cf10906c1e7c07dcb
origin/main | dd79a60f193b1163ab1ec549a35458e0d2aab1de
origin/merge/release-rc-into-trunk | bdc0cef8a652aa29ec41a9828e65f017c2a25c96
origin/research/v2-exercise-data-audit | 98db8f749551d6ff52cdc6de29304df869a4fed0
origin/research/v2-nutrition-data-audit | 7fa79cceee7d93d8d1c2b646fec3a10f5910b675
origin/research/v2-post-merge-bug-hunt | b13695aa2c224ba48cd9018502585b2af776d3e7
origin/research/v2-product-qa-checklist | 58d73fab4847e65e01ab2cbb560f92b1e48f0897
origin/research/v2-user-testing-script | 01678f619d6179b4c31df8b75fe8b8c1dcb60130
```

## Open pull-request inventory

| Finding | Class | Repository | Branch | Commit | Path | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PR #38 is open: `e/personalization-guardrail` → `design/v21-promotion`. | verified | `km5g98str4-commits/qimmah` | `e/personalization-guardrail` | `87590f0ac19a610605e8fc9e11f01b35e2472d49` | `https://github.com/km5g98str4-commits/qimmah/pull/38` | `gh pr list --state open --json headRefOid,...` on 2026-08-06. |
| PR #39 is open: `e/settings-clarity` → `design/v21-promotion`. | verified | `km5g98str4-commits/qimmah` | `e/settings-clarity` | `c5d977fe8df4e6ba96aacbf13bff02ba601d3864` | `https://github.com/km5g98str4-commits/qimmah/pull/39` | Same read-only GitHub query. |
| PR #42 is open: `e/plan-rationale` → `e/personalization-guardrail`. | verified | `km5g98str4-commits/qimmah` | `e/plan-rationale` | `3998506e0f39c89c29190dba2cf313993a5271f1` | `https://github.com/km5g98str4-commits/qimmah/pull/42` | Same read-only GitHub query. |
| PR #43 is open: `e/plan-preview` → `e/plan-rationale`. | verified | `km5g98str4-commits/qimmah` | `e/plan-preview` | `e5546377f0f4c290adea66a376648431752c48f1` | `https://github.com/km5g98str4-commits/qimmah/pull/43` | Same read-only GitHub query. |
| PR #44 is open: `e/plan-why` → `e/plan-preview`. | verified | `km5g98str4-commits/qimmah` | `e/plan-why` | `c304227e986814bcd95756a9a8c632fb2b34536e` | `https://github.com/km5g98str4-commits/qimmah/pull/44` | Same read-only GitHub query. |
| PR #45 is open: `e/plan-honest-axes` → `e/plan-why`. | verified | `km5g98str4-commits/qimmah` | `e/plan-honest-axes` | `6f0d33fe86b3a3aef58c63be4cd56a52bf523a63` | `https://github.com/km5g98str4-commits/qimmah/pull/45` | Same read-only GitHub query. |
| PR #46 is open: `e/personalization-guardrail-r2` → `design/v21-promotion`. | verified | `km5g98str4-commits/qimmah` | `e/personalization-guardrail-r2` | `dbc6bcdcdb174af7f9daa2ad9ecef42ab89cbc63` | `https://github.com/km5g98str4-commits/qimmah/pull/46` | Same read-only GitHub query. |
| PR #47 is open: `e/settings-clarity-r2` → `design/v21-promotion`. | verified | `km5g98str4-commits/qimmah` | `e/settings-clarity-r2` | `9d3cf0a750e891621f52e849fab90c712fb016ae` | `https://github.com/km5g98str4-commits/qimmah/pull/47` | Same read-only GitHub query. |

No PR was opened, modified, merged, closed, or deleted by this task.
