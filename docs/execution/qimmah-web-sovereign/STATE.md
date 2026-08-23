# Qimmah Web Sovereign — execution state

> ⛔ **سطح ضبط متجاوَز — يُقرأ تاريخًا لا أمرًا.**
> الحقيقة الجارية في [`docs/execution/qimmah-final-launch/STATE.md`](../qimmah-final-launch/STATE.md).
> أرقام هذا الملفّ وأحكامه تصف لحظتها، وقد تغيّرت. لا يُبنى عليها قرار اليوم.

---

Updated: 2026-08-14 (PKG-9 — Quick Log, dirty-state boot and production-artifact safety; second recovery)

## Provenance

- Contract: `[QIM-WEB-SOVEREIGN-ULTIMATE-001]` (`SHA-256 555221b88e93d9fc86e1dbc8134dad780253c9e195c4c74bef12283857e95336`).
- Baseline status: **VERIFIED**.
- Remote: `origin` → `https://github.com/km5g98str4-commits/qimmah.git`.
- Baseline SHA: `af5274b2f8558079b43ad1d2dc2676b03db23d2b`.
- Containing remote ref: `origin/claude/founder-ux-access-gate-0rn49k`.
- Execution branch: `codex/qimmah-web-sovereign-001`.
- Execution worktree: `/private/tmp/qimmah-web-sovereign-001`.
- Package parent/baseline: `af5274b2f8558079b43ad1d2dc2676b03db23d2b`; after the package commit, the execution branch's `HEAD` is the authoritative checkpoint pointer.
- Historical production reference: `cc60adf` (document only; no rollback performed).
- Existing checkout `codex/ui-polish` and every other worktree were treated as read-only.

Resolution evidence:

```text
git cat-file -t af5274b...                         → commit
git branch -r --contains af5274b...                → origin/claude/founder-ux-access-gate-0rn49k
git rev-parse HEAD (new worktree)                   → af5274b2f8558079b43ad1d2dc2676b03db23d2b
git status --short --branch (before PKG-0 edits)    → clean
```

`git fetch --all --tags` succeeded. A later `git ls-remote` probe hit a transient DNS failure; local object/ref provenance is exact, but push connectivity must be re-proved at the package checkpoint.

## Current package

### Second recovery — Goal-limit interruption, new container (2026-08-14)

The previous Goal was interrupted by usage limits. This recovery ran in a **different
environment** from the one that produced PKG-0…PKG-8, and that fact changes what could be
recovered. Findings are from disk and `git`, not from the prior transcript.

| Question | Answer from disk |
| --- | --- |
| Codex execution worktree present? | **No.** `/private/tmp/qimmah-web-sovereign-001` does not exist here. This container holds a **fresh shallow clone** created `2026-08-14 19:39` (`.git/shallow` present, `gc.auto=0`, single worktree). |
| Latest committed `[PKG-n][green]` | **PKG-8** at `e8f3bb64569f8732e444dddd6acbd4b9be35c6be`. |
| Latest pushed checkpoint | **PKG-8** — `git ls-remote --heads origin codex/qimmah-web-sovereign-001` → `e8f3bb64…`, byte-identical to local `HEAD`. |
| Uncommitted WIP recovered | **None recoverable.** `git status` was clean at the recovered `HEAD`; no untracked or staged product edit existed in this container. |
| Package in flight at interruption | **PKG-9** (Layer 3 Navigation/404/Quick Log) — the `NEXT_REQUIRED_ACTION` recorded below. |

**Correction to the record below.** The `Recovery checkpoint (2026-08-14)` section that follows
states `LAST_COMMITTED_GREEN: PKG-7` and lists PKG-8 as staged WIP. Git disagrees: PKG-8 is
committed *and* pushed. Both are true in sequence — that section is the pre-commit note that was
staged **into** the PKG-8 commit, so it describes the instant before its own commit and is stale by
exactly one step. It is preserved verbatim as history rather than rewritten.

**What the interrupted WIP actually contained.** The handover named six files. Verified against the
recovered tree:

- `scripts/profile-reliability-proof.ts`, `scripts/run-profile-reliability-proof.mjs`,
  `scripts/e2e/profile-reliability.mjs`, `src/views/ProfileV2.tsx` — **present and committed** in
  PKG-8. That work survived.
- `scripts/e2e/navigation-quick-log.mjs`, `scripts/run-navigation-quick-log-*.mjs` — **absent from
  every commit and from disk.** They were uncommitted work on the Codex machine and are
  **unrecoverable from this container**. PKG-9 was therefore rebuilt from the product source, not
  restored; its defects were re-derived by reading the live Quick Log path rather than trusted from
  the handover note.

**Branch.** Work continues on `claude/web-sovereign-final-recovery-o8alub`, created by
`git merge --ff-only origin/codex/qimmah-web-sovereign-001` — a strict fast-forward, so zero
sovereign commits were lost or rewritten. `codex/qimmah-web-sovereign-001` remains a direct
ancestor of this branch's `HEAD`. No reset, clean, rebase, force-push, `main` change, or
foreign-worktree change was performed.

**Browser reality in this container.** Chromium **141.0.7390.37** launches and renders. **WebKit is
unavailable** (`/opt/pw-browsers/webkit-2311/pw_run.sh` missing, and browser download is disabled).
Playwright 1.61 expected chromium revision `1228` while revision `1194` was installed; the expected
revision path was symlinked to the installed binary — an environment fix, with no test, timeout, or
assertion changed. Consequence recorded honestly: every real-browser result in this document is
**Chromium evidence**. Safari/WebKit behaviour is *not* proven here, which matters most for the
blocked-storage class fixed in PKG-9 (see BUG-024).

### Recovery checkpoint (2026-08-14)

- `LAST_CONFIRMED_GREEN`: **PKG-8 Profile WIP** — at recovery, the staged tree had passed its focused Profile proof (21/21), Profile browser journey (26/26), sequential Progress (25/25), Navigation (96/96), fresh install/static/build checks, and the complete repository gate through `test:workout-day-source` (19/19). This was verified work, but it was not yet a commit when the previous Goal usage limit interrupted the run. Recovery review then exposed one remaining guest-only account row; its named red-first proof failed, the product was corrected, and the focused evidence is now 22/22 static plus 27/27 browser.
- `LAST_COMMITTED_GREEN`: **PKG-7** at `1bcf7a99c657558f982154696b907efbd3d78ac5`.
- `LAST_PUSHED_GREEN`: **PKG-7** at `1bcf7a99c657558f982154696b907efbd3d78ac5`; `git ls-remote --heads origin codex/qimmah-web-sovereign-001` matched that SHA exactly during recovery.
- `CURRENT_WIP`: the 16-file staged PKG-8 Profile package (canonical data ownership, guest/account truth, history-scoped Settings return, heading/touch/numeral convergence and its strengthened proofs). No untracked file or unstaged product edit was found before this recovery note.
- `NEXT_REQUIRED_ACTION`: review the staged PKG-8 diff against PKG-7, re-stage this recovery record, commit `[PKG-8][green]`, push only `codex/qimmah-web-sovereign-001`, verify the remote SHA, then continue Layer 3 Navigation/404/Quick Log.
- Recovery precheck: cwd/repository root `/private/tmp/qimmah-web-sovereign-001`; Git metadata `/Users/ziyad/Documents/Qimmah 2/.git/worktrees/qimmah-web-sovereign-001`; branch/upstream `codex/qimmah-web-sovereign-001` / `origin/codex/qimmah-web-sovereign-001`; remote `origin`; no process was running from this worktree. Other Qimmah dev servers and worktrees were observed and left untouched.

- **`PKG-9` at `9f88e43bf6c79c228337d83d30d58467db3a04d8`** — pushed to `codex/qimmah-web-sovereign-001` (fast-forward `e8f3bb6..9f88e43`) and to `claude/web-sovereign-final-recovery-o8alub`; both remote heads verified identical.
- Packages completed and pushed: `PKG-0` at `f78676e`; `PKG-1` at `8b29ca3`; `PKG-2` at `28c725e4e4869d454d6b007cc11a92222a059ac1`; `PKG-3` at `678a38d01d2206ff02b245281d621fc37ed19658`; `PKG-4` at `df5e55bebc31149484c3d06a9f59348b1697f9e1`; `PKG-5` at `7478507b7c46ee9b6018b1ef67c31ca40fbed6d2`; `PKG-6` at `f49ae011450b9a0097e65b277d36bc7348ebd51f`; `PKG-7` at `1bcf7a99c657558f982154696b907efbd3d78ac5`.
- Package verified for checkpoint: Layer 3 Profile (`PKG-8`).
- Profile now routes both of its data entries through the canonical hardened `DataManagementPanel`; its second portability UI and duplicate Settings facts are removed.
- Account truth is conditional: signed-in users can reach account deletion, while guests are offered device-data management without a false account promise.
- Leaving Profile for canonical Settings preserves and restores the originating internal context (`settings` or `privacy`) on the Profile history entry, without adding a data-store key. Profile and its exposed reminder/native controls now have one route-owned `h1` and 44px targets.
- Dynamic Profile values use the same `formatNumber` presentation boundary established in PKG-7. The browser proved account/guest, AR/EN, RTL/LTR, 320px, contextual Back, data ownership and zero console/page errors.
- No dependency, backend, Supabase, QAE, canonical dataset, service-worker, deployment, or Salla authority file changed.
- Next action: commit/push `[PKG-8][green]`, then continue Layer 3 with Navigation/404/Quick Log.

### FINAL GATE — executed from the final HEAD `9f88e43`

Run after the last implementation change, from a clean tree, beginning with a fresh `npm ci`.
Every step's exit code was recorded; nothing was skipped.

| Step | Exit | Result |
| --- | --- | --- |
| `npm ci` | 0 | deterministic install from lockfile |
| `npm run typecheck` | 0 | — |
| `npm run lint` | 0 | zero warnings (`--max-warnings 0`) |
| `npm run build` | 0 | production build |
| `npm run test:gate` | 0 | full repository gate, through final `test:workout-day-source` 19/19, including new `test:quick-log` 27/27 |
| `npm run test:bundle-safety` | 0 | 9/9 on the built artifact |
| `npm run test:e2e:onboarding` | 0 | 20/20 |
| `npm run test:e2e:navigation` | 0 | 96/96 |
| `npm run test:e2e:profile` | 0 | 27/27 |
| `npm run test:e2e:settings` | 0 | 14/14 |
| `npm run test:e2e:settings-security` | 0 | 34/34 |
| `npm run test:e2e:nutrition` | 0 | 106/106 |
| `npm run test:e2e:workout` | 0 | 31/31 |
| `npm run test:e2e:progress` | 0 | 25/25 |
| `npm run test:e2e:exercises` | 0 | 32/32 |
| `npm run test:e2e:preview-gate` | 0 | 35/35 |
| `npm run test:e2e:install-overlap` | 0 | 200/200 across 320/360/375/390/430 in ar/en |
| `npm run test:e2e:plan-handoff` | 0 | 98/98 |
| `npm run test:e2e:dirty-state` | 0 | 47/47 |
| `npm run test:e2e:auth:preflight` | 0 | 19/19 offline checks |

**765 real-browser assertions across 13 suites, all on Chromium 141.** Not run, and why:
`test:e2e:auth` needs a Docker daemon (unavailable here) — its own preflight reports the blocker,
and its README states the full run "cannot be run in this environment … the OWNER runs it locally".
`test:e2e:journey`, `test:chaos` and the historical journey scripts were not part of this gate.

### PKG-9 Navigation / Quick Log / dirty-state / production-artifact evidence

Three defects in the Quick Log path (BUG-024…BUG-026), one test-infra defect found while running the
suites (BUG-027), and one data-truth defect the new dirty-state suite caught (BUG-028).

**Red before green — the reproductions, not just the results.** Every fix below was preceded by a
failure with a *named* check, per §4.2 (“وسقوط غير مسمّى ليس إثباتًا”):

| Reproduction | Result at `e8f3bb6` (pre-fix) |
| --- | --- |
| Quick Log red reproduction | **6 named failures** — `no-raw-intent-storage-app`, `no-raw-intent-storage-profile`, `water-live`, `no-stale-intent`, plus two runtime checks executing the exact live expressions from `App.tsx:388` and `ProfileV2.tsx:84`, both throwing `SecurityError` under blocked storage |
| `test:e2e:dirty-state` attempt 1 | **NAMED FAIL — the proof was wrong, not the product.** `guest-complete` landed on `#/start`; investigation against `initialRoute` and the existing `test:guest-entry` contract showed the start screen *is* the guest front door. The assertion was corrected to drive the real «كمّل كضيف» control, which is a stronger check than the boot hash |
| `test:e2e:dirty-state` attempt 2 | **NAMED PRODUCT FAIL — BUG-028.** `{"completed":"yes-please"}` reached `#/dashboard` while the four other corrupt shapes were refused; `!!parsed.completed` was coercing garbage into completion |
| `test:bundle-safety` attempt 1 | **NAMED FAIL — investigated, not waived.** `localhost` present in the production asset; traced to `@supabase/auth-js` v2.108.2's default `GOTRUE_URL`, proven unreachable because `createClient` always receives an explicit url. A narrow named exemption was added **with** a guard proving it stays narrow |

| Evidence | Result |
| --- | --- |
| `npm run test:quick-log` | PASS — 27/27: guarded canonical owner, scoped consumption, live water intent, guard-first destination, runtime survival under both blocked-storage shapes, and six bypass simulations |
| `npm run test:e2e:dirty-state` | PASS — 47/47 across eleven seeded storage states plus a blocked-write boot; corrupt values are refused at the guest door while a genuine completed guest still enters |
| `npm run test:bundle-safety` | PASS — 9/9: mock activation codes and mock entitlement key absent from the production artifact, present in a mock build (counter-proof), and three owned dev-endpoint injections still rejected |
| `npm run test:e2e:navigation` | PASS — 96/96, exit 0 (unchanged contract, rerun after the `openQuickLog` rewrite) |
| `npm run test:e2e:profile` | PASS — 27/27, exit 0, and the suite now **terminates** (BUG-027) |
| `npm run test:e2e:nutrition` | PASS — 106/106, exit 0, including the stale-intent and unknown-intent scenarios that cross the rewritten consumption path |
| `npm run test:e2e:progress` | PASS — 25/25, exit 0 |
| `npm run test:e2e:preview-gate` | PASS — 35/35, exit 0 |
| `npm run typecheck` + `npm run lint` | PASS — exit 0, zero warnings |

**Gate strengthening attacked before it was trusted.** The first version of the quick-log structural
check asked whether a `catch` appeared *near* each storage access. That is satisfiable from two
unrelated places, so it was replaced with brace-counted `try/catch` region containment; the
simulation that defeats the old form is now a permanent assertion. Attacking it also exposed a
false positive of my own making — the check was reading the **documentation** of the bug, so
comments are now blanked before scanning.

### PKG-8 Profile evidence

| Evidence | Result |
| --- | --- |
| `npm run test:profile-reliability` | PASS — 22/22: account/device truth across Privacy and internal Settings, one data owner, history-scoped contextual return, centralized numerals, heading ownership, 44px targets and four named bypass attacks |
| `npm run test:e2e:profile` attempt 1 | NAMED PRODUCT FAIL — strict English locator found two `h1` headings; Profile duplicated the route heading owned by `MobileShell` |
| Strengthened `npm run test:e2e:profile` | PASS — 27/27 for signed-in and guest personalities, including absence of guest-only account actions, AR/EN, RTL/LTR, 320px, data/settings/measurements routes, Back context, touch size, no overflow and zero browser errors |
| Standards + spec review against PKG-7 | FOUND/FIXED — both reviewers independently found the remaining guest-only logout/delete row; a named red-first proof failed, the Account group was made signed-in-only, and both reviewers reported no other actionable product finding |
| Foreign-server collision attack on port 5328 | EXPECTED NAMED FAIL — with an unrelated 200 server owning the port, the runner rejected `profile reliability preview exited before ready` instead of accepting the foreign artifact; after removing the attack server, the owned preview passed 27/27 |
| Full `npm run test:gate` attempt 1 | NAMED STALE-PROOF FAIL at `test:delete-account` after 19 passes: it required a removed historical comment instead of checking the live conditional Profile→Settings binding |
| Parallel Progress + Navigation regression attempt | NAMED TEST-INFRA FAIL — both legacy scripts bind fixed port 5325; one process killed the shared preview while the other was still running |
| Sequential `npm run test:e2e:progress` | PASS — 25/25 after updating the canonical Profile route-heading expectation |
| Sequential `npm run test:e2e:navigation` | PASS — 96/96, including `#/profile`, route refresh/history and deterministic 404 |
| `npm run typecheck` + `npm run lint` | PASS — exit 0, zero warnings |
| Fresh `npm ci` + `npm run typecheck` + `npm run lint` | PASS — deterministic 361-package install; typecheck exit 0; lint exit 0 with zero warnings |
| Production `npm run build` | PASS — 2,564 modules |
| Final `npm run lint` + strengthened full `npm run test:gate` | PASS — lint exit 0; gate includes Profile 22/22 and deletion binding 28/28, then exits 0 through final `test:workout-day-source` 19/19 |

### PKG-7 Settings/numbers/units evidence

| Evidence | Result |
| --- | --- |
| `npm run test:settings-preferences` | PASS — 17/17: locale policy, stored-value immutability, secure panel binding, metric truth, import-undo touch targets, five critical consumers and two named bypass attacks |
| `npm run test:e2e:settings-security` | PASS — 34/34 hostile/valid import, atomic restore, A/B isolation and zero token/PII leakage |
| `npm run test:e2e:settings` | PASS — 14/14 at 320px: AR/RTL, EN/LTR, persisted reload, metric/no-fake control, numeral samples, data disclosure and zero browser errors |
| `npm run test:e2e:nutrition` | PASS — 106/106 after numeral convergence |
| `npm run test:e2e:workout` | PASS — 31/31 after numeral convergence |
| `npm run test:e2e:progress` attempt 1 | NAMED TEST-EXPECTATION FAIL — 23/25 because two assertions still required Latin `81.5` in Arabic UI after the deliberate policy change |
| Strengthened `npm run test:e2e:progress` | PASS — 25/25; now requires Arabic `٨١٫٥`, rejects Latin `81.5`, and proves reload retention |
| Fresh `npm ci` + `npm run typecheck` + `npm run lint` | PASS — deterministic install, typecheck exit 0, lint exit 0 with zero warnings |
| `npm run build` | PASS — production mode, 2,563 modules |
| Full `npm run test:gate` | PASS — includes `test:settings-preferences` 17/17 and exits 0 through final `test:workout-day-source` 19/19 |

### PKG-6 Exercises/detail evidence

| Evidence | Result |
| --- | --- |
| `npm run test:exercise-library` | PASS — 16/16 including 181 records, AR/EN search, filter combinations, machine integrity, route modes and named bypass attacks |
| `npm run test:catalog` | PASS — 274/274 shipped local media files |
| `npm run test:guidance-honesty` | PASS — 4/4 |
| `npm run test:e2e:exercises` | PASS — 32/32 live-browser assertions; all §28 cases, Machines, modal keyboard lifecycle, 320px/LTR, zero page errors |
| `npm run test:e2e:navigation` | PASS — unchanged 96/96 after route push/replace and direct-link close changes |
| Fresh `npm ci` + `npm run typecheck` + `npm run lint` | PASS — deterministic install, typecheck exit 0, lint exit 0 with zero warnings |
| `npm run build` | PASS — production mode, 2,560 modules |
| Full `npm run test:gate` | PASS — includes `test:exercise-library` 16/16 and exits 0 through final `test:workout-day-source` 19/19 |

### PKG-5 Progress/Measurements evidence

| Evidence | Result |
| --- | --- |
| `npm run test:measurement-reliability` | PASS — 11/11: checked add/edit/delete, quota preservation, writer denial, restore right and Health-source isolation |
| `npm run test:progress-v2` | PASS — 11 canonical Progress checks + 11 measurement-reliability checks |
| `npm run test:access-gate` | PASS — 84/84, including measurement add/edit/delete writers and both live UI owners |
| `npm run test:e2e:progress` | PASS — 25/25 live-browser assertions; no page error; 320px English/LTR pass |
| `npm run test:e2e:preview-gate` | PASS — 35/35; `#/measurements` is explicitly browsable and mutations remain denied |
| `npm run test:e2e:navigation` | PASS — 96/96 including `#/measurements` deep route |
| `npm run test:canonical` | PASS — 16/16 |
| `npm run test:sync-coverage` | PASS — 56/56 including measurement LWW/tombstones and HealthKit exclusion |
| `npm run test:asset-integrity` | PASS — 35/35; route and Pages rewrite lists remain 1:1 |
| Fresh `npm ci` + `npm run typecheck` + `npm run lint` | PASS — deterministic install, typecheck exit 0, lint exit 0 with zero warnings |
| `npm run build` | PASS — production mode, 2,558 modules |
| Full `npm run test:gate` | PASS — exit 0 through final `test:workout-day-source` 19/19 |

### PKG-4 Today/Workout evidence

| Evidence | Result |
| --- | --- |
| `npm run test:storage-honesty` | PASS — 44/44, including active-snapshot quota, last-good preservation, finish rollback, child-clear and false-saved attacks |
| `npm run test:workout-day-source` | PASS — 19/19 across 3/4/5/6-day plans over 14 days and next-workout agreement |
| `npm run test:today-v2` | PASS — 48/48, including ended-early partial truth |
| `npm run test:e2e:workout` | PASS — mock-entitlement build plus 31/31 live-browser assertions; no page error |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — production mode, 2,557 modules |
| Fresh `npm ci` + full `npm run test:gate` | PASS — exit 0 through final `test:workout-day-source` 19/19 |

### PKG-3 Nutrition evidence

| Evidence | Result |
| --- | --- |
| `npm run test:nutrition-live` | PASS — 13/13: quantity/source round-trip, fractional inputs, quota/security failures, stable cache/listeners, no invented legacy quantity |
| `npm run test:nutrition-history` | PASS — 61/61 |
| `npm run test:access-gate` | PASS — 77/77, including live MealCard/QuickMealLogger add/remove guards, visible save-failure feedback, and bypass attacks |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e:preview-gate` | PASS — build 2,556 modules; Preview/activated matrix 34/34 |
| `npm run test:e2e:nutrition` | PASS — 106/106 on its required mock-entitlement build: 18 crash scenarios, quick intent, real pointer, four meal rows, paid lifecycle, hostile storage, ar/en and 320–1280px |
| Fresh `npm ci` + typecheck + lint + production build + full `npm run test:gate` | PASS — first sandbox attempt named `listen EPERM` at `test:media-rights`; authorized complete rerun passed through final `test:workout-day-source` 19/19 |

### PKG-2 evidence

| Evidence | Result |
| --- | --- |
| `npm run test:onboarding-questions` | PASS — 97/97: exact registry, one UI binding each, canonical vocabulary, consumer matrix, never semantics and bypass attacks |
| `npm run test:onboarding-intent` | PASS — 70/70, including minor age downgrade clearing restricted goals |
| `npm run test:onboarding-async` | PASS — 40/40, including v5→v6 migration, owner isolation, malformed/unknown drafts and retry |
| `npm run test:body-fields` | PASS — 37/37 |
| `npm run test:plan-number` | PASS — 16/16 |
| `npm run test:cto72-polish` | PASS — 59/59 |
| `npm run test:onboarding-e2e-contract` | PASS — 8/8 |
| `npm run test:e2e:onboarding` | PASS — 20/20 |
| `node scripts/onboarding-matrix-e2e.mjs /tmp/qimmah-pkg2-matrix` | PASS — 36/36 goal × place × NEAT combinations, 36 zero-console checks, fail/retry and four-history resume (`/tmp/qimmah-pkg2-matrix/onboarding-matrix-e2e.json`) |
| `npm run test:e2e:navigation` | PASS — 95/95 |
| `npm run test:e2e:plan-handoff` | PASS — 98/98 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — 2,556 modules |
| `npm run test:e2e:preview-gate` | PASS — 34/34, Preview plus activated mock personality; no unhandled page error |
| `npm run test:e2e:install-overlap` | PASS — 200/200 across 320/360/375/390/430 and ar/en |
| `npm run test:e2e:nutrition` | PASS — 91/91 across crash, quick-log, real pointer and macro matrices |
| Historical journey — newcomer | PASS — 30 checks / 18 selected capture points; correct Premium browsing boundaries |
| Historical journey — minor | PASS — 26 checks / 10 selected capture points; adult→minor stale-goal attack included |
| Historical journey — advanced | PASS — 8 checks / 18 selected capture points; raw history retained and derived plan differs from beginner |
| Fresh full `npm run test:gate` attempt 1 | NAMED FAIL at `test:training-focus-gap`: required explicit adapter comment had drifted during the rewrite |
| Focused repair `npm run test:training-focus-gap` | PASS — 6/6; explicit no-`Answers`-field/balanced-default contract restored, no logic change |
| Fresh full `npm run test:gate` after repair | PASS — exit 0 through final `test:workout-day-source` 19/19 |

## Baseline gates

| Gate | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | 361 packages installed from lockfile. |
| `npm run typecheck` | PASS | exit 0. |
| `npm run lint` | PASS | exit 0. |
| `npm run build` | PASS | exit 0; Vite built 2,549 modules. |
| `npm run test:gate` (sandbox) | ENVIRONMENT FAIL | first browser-backed proof could not bind `127.0.0.1` (`listen EPERM`). |
| `npm run test:gate` (local-listen permission) | PASS | exit 0 through final `test:workout-day-source` (19/19). |
| `npm audit --json` | 3 HIGH, 0 CRITICAL | all three are transitive build/dev-chain packages; no dependency change authorized. See BUG-003. |

## Canonical implementation map

Rule: discover canonical → route to it → isolate legacy. No third implementation is authorized.

| Concern | Canonical owner | Live consumers | Duplicate / legacy alternatives |
| --- | --- | --- | --- |
| Routes/history | `src/lib/appRoutes.ts`; composition in `src/App.tsx` | every public/auth/app hash route | `view` state inside `App` mirrors the hash; old auth-internal mode was already removed |
| First-run/onboarding UI | `src/views/OnboardingV2.tsx` + pure state in `src/lib/onboardingV2Flow.ts` | `src/views/SetupView.tsx` | adaptive bank under `src/lib/personalization/**` is implemented/tested but not the live UI; `CustomizationCenter` is post-onboarding editing |
| Onboarding persistence | `src/lib/onboarding.ts` envelope + `onboardingV2Flow` v6 draft guard with additive v5 migration | live onboarding/resume | legacy/current completed profile in `src/lib/onboardingProfile.ts` is a separate generated source |
| Profile used by plan | `OnboardingProfile` built by `src/lib/planBuilderAnswers.ts`; bridged by `src/lib/onboardingProfile.ts` | calculators, plan generator, customization | adaptive `PersonalizationProfile` is local/read-only to this program until deliberately routed |
| Plan generation | `src/lib/planGenerator.ts` and `src/lib/planRationale.ts` | onboarding handoff, customization, Today/Workout | no rewrite; QAE prescription logic is a hard no-touch zone |
| Premium/access | `src/lib/access/paidActions.ts`, `guard.ts`, `entitlementStore.ts`, `provider.tsx` | mutation handlers and writers | UI-only checks are insufficient; query/localStorage/Salla return are not authority |
| Guest Preview | entitlement status `none` plus `ALWAYS_BROWSABLE`; central `PremiumGate` | main app surfaces | `VITE_ENTITLEMENT_MODE=mock` is test-only and session-scoped |
| Current workout/day | `src/lib/workoutDaySource.ts` | `TodayV2`, `WorkoutView` | prior rotating/index logic is retained only as named fallback when no schedule exists |
| Workout persistence | `src/lib/activeWorkout.ts`, `finishWorkout.ts`, `historyStore.ts` | `WorkoutView` | legacy `activeSession.ts` is retired/dead per data registry |
| Nutrition display/persistence | `src/views/NutritionView.tsx`; `src/lib/nutritionV2Model.ts`; owner-scoped history in `nutritionHistory.ts` | Nutrition tab, Quick Log | `NutritionV2.tsx` is not the live route wrapper; do not fork a third flow |
| Measurements/progress | data: `measurementLog.ts`/`historyStore.ts`; current experiences: `ProgressV2.tsx` and its exported `MeasurementsV2` | `#/progress`, `#/measurements`, Profile, calculator | `ProgressView` remains the thin stable adapter for both exports; no third store or backend schema |
| Exercises | `ExerciseLibraryView.tsx`; `ExerciseDetail.tsx`; pure filter in `src/lib/exerciseLibrary.ts`; catalog `src/data/exercises.ts`; labels/media helpers | workout/library/`#/exercises/:exerciseId` | canonical dataset is read-only; Machines and full catalog share one route owner |
| Auth | `authContext.tsx`, `LoginView.tsx`, route-owned `login/signup/forgot` | `App.tsx` | no local secrets; Supabase config/semantics are no-touch |
| Language | `src/i18n/LanguageContext.tsx`; persisted device preference in `appPreferences.ts` | all routes | hardcoded bilingual helpers remain historical debt and are not a new pattern |
| Number presentation | `src/lib/numberFormat.ts` | Settings sample/import preview and Layer-3 Nutrition/Today/Workout/Progress/Measurements surfaces | locale policy is presentation-only; stored numeric data remains numeric |
| Settings data transfer | `src/components/DataManagementPanel.tsx` over `src/lib/portability` | `#/settings` | raw `FileReader` + manual `JSON.parse` importer is prohibited and guarded |
| Profile shell/data/account truth | `ProfileView.tsx` adapter → `ProfileV2.tsx`; data operations remain owned by `DataManagementPanel` | `#/profile`, internal privacy/settings/reminders/data screens | no second portability UI; canonical `#/settings` owns language/account/device controls |
| Error handling | `src/components/ErrorBoundary.tsx` (`ErrorBoundary`, `RouteErrorBoundary`) + `src/i18n/dict/errorBoundary.ts` | `main.tsx`, route shell, setup | setup reuses the canonical route primitive; prior duplicate strings in `config/strings.ts` are isolated/removed |
| Local data registry | `src/lib/userDataKeys.ts` | account wipe, portability, sync allowlists | raw key literals not registered here require investigation |

## Route inventory

Public/auth/product routes declared by `ROUTES`:

`start`, `login`, `signup`, `forgot`, `setup`, `dashboard`, `workout`, `exercises`, `nutrition`, `progress`, `measurements`, `steps`, `profile`, `calc`, `recovery`, `settings`, `privacy`, `terms`, `contact`, `reset`, `productReview`, `stats`.

- `notfound` and `accountRequired` are internal only.
- `#/exercises/:exerciseId` uses `resourceIdFromHash`; refresh preserves the id.
- Main tabs: `dashboard`, `workout`, `nutrition`, `progress`, `profile`.
- Existing named browser coverage: `test:e2e:navigation`, `test:e2e:onboarding`, `test:e2e:plan-handoff`.

## Paid mutation inventory

Central enum (`PAID_ACTIONS`) currently has 13 actions:

`workout.start`, `workout.startEmpty`, `workout.logSet`, `workout.finish`, `nutrition.addFood`, `nutrition.removeFood`, `nutrition.quickAdd`, `nutrition.water`, `nutrition.toggleMeal`, `progress.logWeight`, `progress.logMeasurement`, `plan.saveEdit`, `recovery.log`.

`test:access-gate` now verifies writer-level guards plus every live action guard. Recovery submit and ProgressV2 measurement save open the one coherent Premium surface before the writer, and the browser attack proves they leave storage untouched in Preview.

## Storage/schema inventory

- Canonical registry: `src/lib/userDataKeys.ts`.
- High-risk primary state confirmed: onboarding envelope/profile; active workout; workout/history logs; Nutrition V2 day/history; measurement logs; recovery logs; customization; account ownership; sync queue/backup/meta; local tracking.
- Device-only preferences confirmed: language/theme/haptics (`qimmah:prefs:v1`), UI mode, install dismissals, product caches, Supabase auth token key.
- Adaptive personalization state/profile are already owner-scoped and explicitly excluded from sync because they can contain health screening answers.
- Legacy keys are explicitly classified `retire`; no broad deletion is permitted.
- Dirty-state proof obligations remain: old onboarding draft, completed guest, invalid/truncated JSON, array-for-object, missing/unknown versions, stale conditionals, quota failure.

## Onboarding question inventory (Layer 2 final)

The live V2 UI collects exactly 18 meaningful answers over seven input screens. The stable ids and proved consumers are:

| # | Stable id | Answer | Proved consumer/effect |
| ---: | --- | --- | --- |
| 1 | `body.age` | age | minor eligibility and goal restriction |
| 2 | `body.sex` | sex | BMR calculation |
| 3 | `body.height` | height | BMR calculation |
| 4 | `body.weight` | weight | BMR, calories and target weight |
| 5 | `intent.primary` | intent | nutrition display style |
| 6 | `experience.declared` | declared level | canonical experience resolution |
| 7 | `history.trained_before` | trained before | new/returning point of departure |
| 8 | `history.total_months` | total months | canonical experience band |
| 9 | `history.last_trained` | last trained | conservative first-week/deload behavior |
| 10 | `history.consistency` | consistency | conservative first-week/deload behavior |
| 11 | `goal.primary` | goal | calorie direction and target weight |
| 12 | `training.days` | days/week | generated schedule count |
| 13 | `training.duration` | session duration | session volume |
| 14 | `training.place` | place | exercise/environment selection |
| 15 | `activity.neat` | daily activity | TDEE |
| 16 | `nutrition.diet_pattern` | diet pattern | generated meal filtering |
| 17 | `limitations.has_injury` | current injury yes/no | injury-area presentation branch |
| 18 | `limitations.injury_areas` | injury areas | exercise exclusion/substitution |

Consumer verdict and exclusions:

- `ONBOARDING_QUESTION_IDS` is the exact 18-item registry; the UI binds each id exactly once via `data-question-id`.
- `trainingYears` was removed from the visible flow because it duplicates canonical `totalMonths`; it remains read-only input to v5 migration only.
- equipment preference was removed because its adapter explicitly discarded it and no approved consumer exists.
- health-data consent remains a safety/legal gateway inside basics, but is not counted as a personalization question.
- raw `declaredLevel` plus the four canonical history facts persist in `OnboardingProfile.trainingPreferences.history`; existing `classifyExperience` and `classifyTrainingStatus` derive generator inputs.
- `never` is a complete answer: follow-ups are absent, returning status is false, stale values are cleared, and trained→never→trained does not resurrect them.
- No QAE file or prescription logic changed.

## Premium / Salla / activation truth

- Default frontend purchase destination is `https://salla.sa/Qimmahsa` from `src/config/product.ts`.
- Repository search found neither approved paid product id `1181109938` nor negative id `1084925309` in a purchase path.
- The default URL is a store root, not a provable product-specific URL. No URL format will be guessed.
- Production `redeemActivationCode` returns `offline` unless the build-only mock mode is enabled. No reviewed live redemption backend is available on this baseline.
- Consequence until external evidence changes: paid activation is `EXTERNALLY_BLOCKED`; `GO_PAID_COMMERCIAL_FUNNEL` cannot be YES. Preview readiness remains independently reachable.

## Error-boundary inventory

- App primitive: `ErrorBoundary` with reload, focus transfer, exact support email, and a client-generated non-sensitive `QW-*` reference.
- Route primitive: `RouteErrorBoundary` with retry/re-import, the same diagnostics contract, and stale-reference reset.
- Setup reuses `RouteErrorBoundary`; it cannot mark onboarding complete after a render failure.
- Console evidence includes the same reference id shown to the user; the UI exposes neither stack/message nor user data.

## Historical acceptance registry

Status here means evidence at this checkpoint, not remembered intent.

| # | Target | Layer-0 evidence status |
| ---: | --- | --- |
| 1 | Nutrition mobile crash/ejection | PASS — current `test:e2e:nutrition` contract 106/106 |
| 2 | Preview could log food | PASS — browser attack opens Premium and storage remains unchanged |
| 3 | Preview could start/log/finish workout | PASS — access matrix plus live Workout E2E: gate opens, no active snapshot is created, activation then permits the same action |
| 4 | install banner covered handoff CTA | `test:bottom-overlay` green; real hit-test pending |
| 5 | Today/Workout mismatch | PASS — `test:workout-day-source` 19/19 plus live-browser name, completion-next and Today-transition agreement |
| 6 | Breakfast Add pointer miss | PASS — real pointer at 320/390 and ≥44px |
| 7 | macro clipping | PASS — ar/en at 320/390/640/768/894/1280, no clipping/overflow |
| 8 | Language row dead | PASS — live AR/EN switch synchronizes `lang`/`dir`, persists, and survives reload in `test:e2e:settings` 14/14 |
| 9 | Units row dead | PASS — truthful metric-only information row; no interactive styling and no fake imperial support |
| 10 | Numbers row dead | PASS — explicit locale-derived numeral policy and live sample; not presented as a control |
| 11 | Arabic/Western numeral inconsistency | PASS for Layer-3 critical surfaces — one `formatNumber` boundary, structural guard 17/17, and Arabic-only measurement browser assertion |
| 12 | Measurements route/promise | PASS — real `#/measurements` route with empty/history/add/edit/delete, Profile/Progress entries and 25-case browser proof |
| 13 | auth route/state | PASS — `test:e2e:navigation` 96/96 |
| 14 | onboarding reload resume | PASS — onboarding matrix history resume plus `test:e2e:onboarding` |
| 15 | returning guest route | PASS — `test:e2e:navigation` 96/96 |
| 16 | exercise detail Back | PASS — route-safe direct-link action plus `test:e2e:exercises` 32/32 and historical navigation 96/96 |
| 17 | exercise deep-link | PASS — full catalog + Machines, refresh/Back/Forward/unknown-id in `test:e2e:exercises` 32/32 |
| 18 | deterministic 404 | PASS — `test:e2e:navigation` 96/96 |
| 19 | whitespace-only signup name | PASS — `test:e2e:navigation` 96/96 |
| 20 | sub-44px touch targets | PARTIAL PASS — bottom/nav 200/200, Premium close/input, and Profile/reminders/native switches corrected; full-site audit remains Layer 4 |
| 21 | silent persistence failure | PASS for live Nutrition, Workout and Measurements — quota/security proofs plus browser input/store/snapshot preservation |
| 22 | malformed storage recovery | PASS — `test:e2e:dirty-state` 47/47 boots the built app on malformed JSON, array-for-object, scalar, `null`, missing/unknown draft version and a non-boolean completion flag; the last of these was a real defect (BUG-028) |
| 23 | never-trained semantics | PASS — 97-case question proof plus newcomer/minor browser journeys |
| 24 | minor/age eligibility | PASS — restricted goal clears immediately after adult→minor change; unit and browser counter-proof green |
| 25 | Preview direct/back/refresh/dispatch | PASS for paid-action matrix — `test:e2e:preview-gate` 35/35 and Progress/Measurements 25/25 |
| 26 | Salla id 1181109938 / reject 1084925309 | EXTERNALLY_BLOCKED: only store root found |
| 27 | no production Premium hook | PASS — `test:bundle-safety` 9/9 proves the mock activation codes and mock entitlement key are absent from the **built** production asset, and present in a mock build so the scanner is proven sighted |
| 28 | install overlap real hit test | PASS — 200/200 with named synthetic regression attacks |
| 29 | old guest/draft preserved | PASS — `test:e2e:dirty-state` covers an existing completed guest, a v5 draft and a legacy guest with missing fields; each boots without crash and the genuine completed guest still enters the app |
| 30 | no localhost/dev endpoint in production | PASS with one **declared, guarded** exemption — no Qimmah-owned dev endpoint and no Vite dev client in the artifact. `@supabase/auth-js` carries a dead default `http://localhost:9999`; the exemption is named, justified by proof that `createClient` always receives an explicit url, and guarded by three owned-endpoint injections that still fail |

## Release judgments at `9f88e43`

Four independent judgments. None rests on "the build is green" — a green build proves the code
compiles and the written tests pass, not that the product works for a user.

### A — FREE PREVIEW: **GO**

- Browse-vs-mutate policy proven in a real browser: `test:e2e:preview-gate` 35/35 covers direct
  navigation, Back/refresh, query tampering and dispatch; every paid mutation opens the Premium
  surface and storage is verified unchanged afterwards.
- Authority cannot be forged client-side: `test:bundle-safety` 9/9 proves the production artifact
  contains no mock activation code and no mock entitlement key — and proves the scanner is sighted
  by finding both in a mock build.
- The product is usable and survives abuse: onboarding 20/20, plan handoff 98/98, navigation 96/96
  (incl. deterministic 404), nutrition 106/106, workout 31/31, progress 25/25, exercises 32/32.
- Reliability and layout floors: `dirty-state` 47/47 over eleven corrupt/legacy storage states plus
  a blocked-write boot; `install-overlap` 200/200 across 320–430px in Arabic and English.

### B — AUTHENTICATED FREE: **NO-GO**

- Not for a known defect — for an unexecuted layer. Every client-side auth contract is green
  (password policy, signup completion, account-required, delete-account binding, reset/recovery,
  guest↔account isolation, `settings-security` 34/34, auth routes 96/96, preflight 19/19).
- The server side was never run. `qa-reports/QA-SESSION-2-room-B.md:386` states that
  `delete_own_account` was never proven deployed on the production Supabase project, and
  `test:e2e:auth` cannot execute without a Docker daemon (EXTERNAL-003).
- Account deletion is an App Store compliance obligation. Shipping accounts while the deletion path
  is unverified means a real user can request deletion and receive a failure.
- **This is one execution away, not one feature away.** See EXTERNAL-003 for the exact unblock.

### C — PAID / PREMIUM: **NO-GO**

- Doubly blocked, and C requires B.
- EXTERNAL-001: no product-specific Salla URL exists in the contract — only the store root
  `https://salla.sa/Qimmahsa`. No URL will be guessed.
- EXTERNAL-002: production `redeemActivationCode` returns `offline`; there is no reviewed activation
  backend on this baseline. The app therefore **cannot grant Premium to anyone** today — which is
  the honest state, not a defect, but it is not a shippable paid funnel.

### D — RELEASE CANDIDATE: **NO-GO**

Not because the code is failing — it is not — but because two of the three surfaces cannot be
honestly declared, and one platform was never tested.

Exact actions required before production:

1. **Run the live auth harness.** `npm run test:e2e:auth` on a machine with Docker, and confirm
   `delete_own_account` is deployed on the production Supabase project. Clears EXTERNAL-003 → B.
2. **Verify on Safari/WebKit.** No WebKit exists in this container, so *every* browser result here
   is Chromium-only. This is not a formality for Qimmah: the audience is Saudi/Gulf mobile, where
   iOS Safari dominates, and PKG-9 fixed a **Safari-shaped** defect (blocked storage, BUG-024) whose
   fix could only be proven at unit level. Re-run the critical journeys on real iOS Safari.
3. **Supply a product-specific Salla URL** and a reviewed activation/entitlement backend. Clears
   EXTERNAL-001/002 → C.
4. **Decide BUG-003** (three high transitive advisories in the build/dev chain) in an authorized
   dependency wave. No runtime importer was found; it does not block A.

If the founder chooses to ship **Preview only**, A stands on its own evidence and items 1 and 3 do
not apply to it — but item 2 does.

## Current severity counts

- P0: 0 confirmed.
- P1: 0 internal open; BUG-001, BUG-002, BUG-004, BUG-008–BUG-012, BUG-018, BUG-020, BUG-024 and BUG-028 are resolved and fully gated.
- P2: 1 open (BUG-003); BUG-005–BUG-007, BUG-013, BUG-019, BUG-021, BUG-022, BUG-025, BUG-026 and BUG-027 are resolved and fully gated.
- P3: 0.
- External blockers: product-specific Salla URL not present; live activation backend unavailable.
- **WebKit: resolved from “not tested yet” to a stated limitation.** WebKit cannot be launched in
  this container, so no Safari evidence exists for any result in this document. This is not a
  neutral gap — BUG-024 is a Safari-shaped defect (blocked storage) whose fix is proven only at unit
  level. An iOS/Safari pass on the built artifact remains genuinely OPEN.

## Skills used at pre-implementation checkpoint

| Skill | Recommendation applied |
| --- | --- |
| senior-frontend | preserve React/Vite owners, typed boundaries, accessibility and measured bundle work |
| frontend-design | keep v3/Qimmah visual identity; copy is functional; no redesign without a defect |
| a11y-audit | AA launch floor; names, labels, focus, dialogs, 44px targets |
| playwright | real pointer/keyboard/browser evidence, snapshot after state changes |
| security-review | trace attacker-controlled data before reporting; fail closed; no fake authority |
| performance-profiler | measure before optimization; performance remains Layer 6 |
| verification-before-completion | fresh full command evidence before checkpoint/complete claims |
| code-review | standards/spec review will be applied to the execution diff before final simulation |

## Evidence map

| DoD / claim | Named evidence |
| --- | --- |
| Exact baseline | `git cat-file`, containing-ref query, execution-worktree `git rev-parse` |
| Deterministic dependencies | `npm ci` exit 0 |
| Baseline static health | `typecheck`, `lint`, production `build` exit 0 |
| Baseline repository contract | full `test:gate` exit 0 |
| Today/Workout source consistency | `test:workout-day-source` 19/19 |
| Central paid-action enum/writer guards | `test:access-gate` 42/42 at baseline |
| Salla current truth | repository search + `src/config/product.ts` |
| Storage registry | `src/lib/userDataKeys.ts`; `test:data-safety`, `test:canonical` in full gate |
| Exact 18-question funnel | `ONBOARDING_QUESTION_IDS`; `test:onboarding-questions` 97/97; 36-case browser matrix |
| Draft migration and never semantics | `test:onboarding-async` 40/40; `test:onboarding-intent` 70/70; newcomer/minor journeys |
| Navigation and handoff after the seven-screen flow | `test:e2e:navigation` 95/95; `test:e2e:plan-handoff` 98/98 |
| Production artifact built | baseline `npm run build`; final artifact proof still pending |

---

# تحديث تدقيق الإصدار النهائي — 2026-08-15

> المصدر: [`docs/audit/QIM-WEB-FINAL-RELEASE-AUDIT-2026-08-15.md`](../../audit/QIM-WEB-FINAL-RELEASE-AUDIT-2026-08-15.md).
> **ما يلي يُعدِّل ثلاثة مواضع في هذه الوثيقة أعلاه** (السطور 69 · 74 · 481 · 500) — لا يُلغيها بل يُقيّدها ببيئتها.

## WebKit: من «متعذّر» إلى **منفَّذ ١١ من ١٣**

قول هذه الوثيقة إن «لا WebKit في هذه الحاوية، فكل نتيجة متصفّح هنا Chromium حصرًا»
**صحيح لتلك الحاوية**. وهو **غير صحيح لجهاز المؤسس**: ذاكرة Playwright المحلّية تحمل
`webkit-2311`، و**WebKit 26.5 يُقلع فعلًا**.

أُضيف `scripts/e2e/lib/engine.mjs` (اختيار المحرّك عبر `E2E_ENGINE`، افتراضه `chromium`)
وأُعيد توجيه ١٤ سكربت E2E إليه بسطر الاستيراد وحده.

```bash
E2E_ENGINE=webkit npm run test:e2e:navigation
```

| الطقم | Chromium | WebKit 26.5 |
|---|---|---|
| onboarding · navigation · preview-gate · dirty-state | 20 · 96 · 35 · 47 | **مطابق تمامًا** |
| install-overlap · nutrition · workout · progress | 200 · 106 · 31 · 25 | **مطابق تمامًا** |
| profile · settings · plan-handoff | 27 · 14 · 98 | **مطابق تمامًا** |
| exercises | 32/32 | ❌ **31/32** — `BUG-029` |
| settings-security | 34/34 | ❌ **26/34** — `BUG-030` |
| **المجموع** | **765/765** | **756/765** |

**ما يعنيه هذا للحاجز رقم ٢ في «الإجراءات المطلوبة قبل الإنتاج»:**
لم يعد «Safari لم يُختبر إطلاقًا» — بل **عطلان مسمّيان قابلان لإعادة الإنتاج بأمر واحد**.
وعلى الأخصّ: `dirty-state` **47/47 على WebKit** — أي أن إصلاح `BUG-024` (التخزين المحجوب،
وهو عطل **على شكل Safari** لم يكن يُثبَت إلا على مستوى الوحدة) صار مُثبتًا على محرّك Safari الحقيقي.

**وما يبقى قائمًا بلا تغيير:** WebKit في Playwright **ليس** iOS Safari على جهاز حقيقي.
تمريرة على جهاز iOS فعلي تبقى مطلوبة — لكنها الآن تبدأ من أرضية مقيسة لا من فراغ.

## حمراوان خارج البوابة — مُسمّيان الآن

السطر 127 من هذه الوثيقة يعلن أن `test:e2e:journey` و`test:chaos` خارج تلك البوابة. شُغِّلا في هذا التدقيق:

- كلاهما **أحمر عند الرأس** `d83add2`.
- وكلاهما **أحمر بالتطابق على `main` (`cc60adf`)** — `test:chaos` بنفس الـ١٣ من ٥٧ بالضبط.
- **الحكم: سابقان للسيادة، لا Regression من عمل Codex.** وسلسلة السيادة لم تمسّ `scripts/resilience`
  ولا مكتبات المزامنة ولا طابور العمليات.
- التفصيل وحدود ما أُصلح وما تُرك عمدًا: `PRE-EXISTING-001` في `BUGS.md`.

## البوابات عند الرأس بعد `npm ci` نظيف — أُعيد تنفيذها كاملة

`typecheck` · `lint` · `build` · `test:gate` ⇒ **أربعتها `exit 0`** (١٠٣ سكربت · ٤٠٩١ ✓ · ٠ ✗)،
وأُعيدت **بعد** تغييرات هذا التدقيق فبقيت خضراء.

---

# إغلاق عطلَي WebKit — 2026-08-15 (تلي تحديث التدقيق أعلاه)

`BUG-029` و`BUG-030` **مغلقان**، و`BUG-033` (التُقط أثناء الإغلاق) معه.
والنتيجة: **٧٦٥/٧٦٥ على Chromium و٧٦٦/٧٦٦ على WebKit** — أي أن الفارق بين المحرّكين صار **صفر إخفاقات**.
والزيادة تأكيدٌ **إضافي** لا اختلاف تغطية: فرع المشاركة الأصلية يُثبَت حيث يتوفّر فقط.

| الطقم | Chromium | WebKit 26.5 |
|---|---|---|
| exercises | 32/32 | **32/32** ✅ (كان 31/32) |
| settings-security | 34/34 | **35/35** ✅ (كان 26/34 ثم مهلة) |
| بقيّة الأحد عشر | بلا تغيير | **مطابقة** |

`settings-security` على WebKit يزيد تأكيدًا واحدًا لأن المشاركة الأصلية متاحة هناك
فيُثبَت فرعها إضافةً إلى فرع التنزيل. **ولا تأكيد أُسقط ولا خُفّف على أي محرّك.**

## ما تعلّمناه — فرقان بين المحرّكين لا واحد

١. **Safari لا يُركّز الزرّ عند النقر، بل يُسند البؤرة إلى أقرب سلف قابل للتركيز.**
   وهنا `<main tabIndex={-1}>`. فحرس «ما كان مركَّزًا» يلتقط `<main>` لا `body` —
   ومنعُ `body` وحده لا يكفي، وقد جُرِّب فبقي أحمر.
٢. **وWebKit يُعيد الإسناد إلى ذلك السلف عند إزالة الحوار** — بعد تنظيف `useEffect`.
   فالاستعادة المتزامنة داخل التنظيف تُدهَس دائمًا.

**كلاهما محروس الآن بفحصين مسمّيين في `test:exercise-library` مع محاكاتَي التفاف**
(العودة إلى منع `body` وحده · الاستعادة المتزامنة) — الطقم ارتفع من ١٦ إلى ١٨ فحصًا.

## تصحيح قياس في تقرير التدقيق

ذُكر أن `navigator.share` غير متاح على WebKit فاستُبعد فرع المشاركة. **القياس كان على
`about:blank`** — وعلى أصل حقيقي مخدوم كلتا الدالّتين موجودة، و`BUG-030` كان **بالضبط**
فرع المشاركة: المنتج شارك النسخة ونجح، والطقم كان ينتظر تنزيلًا لا يأتي. **عمى أداة عن
سلوك صحيح، لا عطل منتج.** التفصيل في `BUGS.md`.
