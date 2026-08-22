# Release Convergence Plan

Status: ready to execute after final-HEAD acceptance  
Current verdict basis: planning only; no accepted artifact exists  
Target question: Can the first 10–50 real users safely use Qimmah?

This plan preserves the investigation value of prior remote release work without
transferring its verdicts or product fixes. Results are valid only for one
accepted SHA, one production build, and the exact evidence bundle generated from
that build.

## Artifact identity

Before any browser opens, create an immutable test identity:

```text
accepted_web_sha=<40-character founder-accepted SHA>
candidate_sha=<40-character Phase II convergence SHA>
node_version=<exact>
npm_version=<exact>
build_command=npm run build
dist_manifest_sha256=<hash of ordered file path + file sha256 list>
started_at=<ISO-8601>
```

The server must expose only the freshly produced `dist/`. A dev server, stale
preview, mismatched service worker, or artifact copied from another SHA invalidates
the run.

## Evidence contract

Each assertion records:

```ts
interface ReleaseAssertionEvidence {
  assertionId: string
  personaId: string
  candidateSha: string
  distManifestSha256: string
  engine: 'chromium' | 'webkit'
  locale: 'ar' | 'en'
  viewport: { width: number; height: number }
  initialState: 'fresh' | 'returning' | 'interrupted' | 'corrupt' | 'unauthorized-admin'
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE'
  screenshot: string | null
  consoleErrors: string[]
  networkFailures: string[]
  finishedAt: string
}
```

`BLOCKED` requires a dependency ID. `NOT_APPLICABLE` requires an explicit
contract reason and a counter-proof that the excluded path is not silently
reachable.

## Environment matrix

### Browser and locale

- Chromium: every persona and width.
- WebKit: critical iPhone flows for newcomer, preview boundary, returning guest,
  onboarding resume, nutrition, workout, and auth.
- Arabic and English on all core surfaces.
- If WebKit cannot be installed or launched, record exactly
  `VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE`; Chromium is not relabeled as
  Safari evidence.

### Widths

`320`, `360`, `375`, `390`, `393`, `414`, `430`, `768`, `1024`, and `1280+`.

The full Cartesian product is required for smoke-level navigation and overflow.
Interaction-deep coverage may use representative 320/390/430/768/1280 widths,
but every omitted combination must inherit from a named invariant rather than a
timeout-saving guess.

### State isolation

Each persona starts in a fresh browser context. Corrupt/returning/interrupted
fixtures are created only through sanctioned test setup, carry an owner ID, and
are destroyed with their context. Premium authority uses the accepted test-only
provider seam; localStorage and query parameters never confer access.

## Persona matrix

### `P1` — New preview user

Journey:

```text
Landing → onboarding → personalized reveal → decline Premium → Preview
→ Today → Workout → Nutrition → Progress → Measurements → Exercises
→ Profile → Settings
```

Required assertions:

- the reveal explains the user's inputs and never claims server persistence;
- every named route is reachable through canonical navigation and direct route;
- browsing remains useful without account or Premium;
- every paid mutation is visibly blocked before durable state changes;
- nested actions, keyboard activation, direct routes, reload, history traversal,
  dispatched events, and stale UI state do not bypass preview;
- the blocked state explains the next legitimate step without pretending a
  purchase or account succeeded.

### `P2` — Premium test state

- Authority comes only from the sanctioned test provider seam.
- Legitimate workout, meal, measurement, progress, profile, and settings writes
  confirm storage before success UI clears input.
- Quota/storage failure preserves user data and shows an honest recovery path.
- Removing the test entitlement returns the same session to protected behavior.
- The production bundle contains no test authority hook.

### `P3` — Returning guest

- Seed an old completed guest through sanctioned fixture code.
- Open to the correct dashboard, refresh, navigate back/forward, close/reopen,
  and retain owner-scoped state.
- Verify current-day identity agrees across Today and Workout.
- Confirm no cross-account or previous-context data is visible.

### `P4` — Interrupted onboarding

- Interrupt at every conditional boundary.
- Refresh and resume the exact meaningful step.
- Back/forward preserves valid answers.
- Changing a parent answer clears now-invalid children and never resurrects
  stale conditional answers.
- Unsupported/unknown schema resumes safely or restarts with an honest message;
  it never invents completion.

### `P5` — Dirty or corrupt state

Cases: old schema, malformed JSON, unknown version, array/object mismatch, quota
failure, stale draft, missing owner, and mixed-version keys.

- No boot crash or infinite recovery loop.
- No silent deletion of recoverable data.
- Corrupt keys are isolated; unrelated valid domains still load.
- Failure details do not expose sensitive data.
- A reset/recovery action requires deliberate confirmation and accurately states
  its scope.

### `P6` — Auth

Test login, signup, forgot/reset, reload, direct routes, back/forward, invalid
forms, keyboard, and both languages.

- Signup trims the user's display name according to the accepted contract.
- Logged-in does not imply Premium or admin.
- Auth failures are translated without leaking provider internals.
- Reset and verification links preserve deterministic route semantics.
- Account/session changes clear prior-owner data from view.

### `P7` — Failure conditions

Test slow/failed network where deterministic, failed storage, invalid activation,
unknown exercise, invalid deep link, deterministic 404 recovery, broken media,
and recoverable ErrorBoundary.

- No dead tap or fake success.
- The next action remains available after recovery.
- Unknown IDs never crash or display a different user's/product's record.
- The bundle contains no localhost, private test endpoint, service-role secret,
  or production test entitlement.

### `P8` — Executive authorization

This Phase II extension remains isolated until the accepted route/provider seam
exists.

- unauthenticated and ordinary authenticated users receive a generic denial;
- forged `user_metadata`, local storage, URL parameters, or fixture modes never
  grant founder/admin access;
- the authorization decision occurs before any sensitive snapshot read;
- empty/partial/error/unavailable metrics remain distinct from numeric zero;
- fixtures are visibly synthetic and impossible to confuse with live data;
- no destructive or inert fake control is exposed.

## Historical defect replay ledger

Every item gets a stable assertion ID and one negative/counter-proof:

| ID | Defect to replay | Minimum evidence |
| --- | --- | --- |
| `REL-NUTRITION-EJECT` | Nutrition mobile crash/ejection | mobile navigation loop, console/network record |
| `REL-PREVIEW-MUTATION` | guest paid mutations | attempted state diff remains empty |
| `REL-INSTALL-OVERLAP` | install banner overlap | 320/390 screenshots and usable controls |
| `REL-TODAY-WORKOUT-DAY` | Today/Workout disagreement | same canonical day ID at both boundaries |
| `REL-BREAKFAST-ADD` | breakfast Add wrong pointer | exact target record mutation |
| `REL-MACRO-CLIP` | clipped macro labels/values | AR/EN at critical widths, no overflow |
| `REL-SETTINGS-DEAD` | dead Settings rows | each visible action works or is honestly unavailable |
| `REL-NUMERALS` | mixed Arabic/Western numeral policy | live surfaces plus a counter-example outside allowed exceptions |
| `REL-MEASUREMENTS` | measurements route/promise | route, save honesty, refresh retention |
| `REL-AUTH-ROUTES` | auth route semantics | direct/reload/history matrix |
| `REL-ONBOARDING-RESUME` | onboarding resume | every conditional boundary |
| `REL-RETURNING-GUEST` | returning guest route | close/reopen and history |
| `REL-EXERCISE-BACK` | exercise detail Back | origin-aware back and direct-link fallback |
| `REL-EXERCISE-DEEP` | exercise deep links | known/alias/unknown ID matrix |
| `REL-404` | nondeterministic 404 recovery | bad path then canonical recovery |
| `REL-SIGNUP-SPACE` | whitespace display name | normalized stored/displayed value |
| `REL-TOUCH` | undersized targets | computed box evidence and keyboard path |
| `REL-STORAGE-HONESTY` | silent persistence failure | failure retains draft/input and no success state |
| `REL-MALFORMED` | malformed state | no crash/deletion, named recovery |
| `REL-NEVER-TRAINED` | never-trained semantics | conditional question and generated plan truth |
| `REL-PREVIEW-BYPASS` | preview bypass attacks | URL/storage/event/history/nested-action attacks |
| `REL-SALLA-BINDING` | paid product binding | exact public product destination, owner evidence |
| `REL-NO-TEST-HOOK` | production test authority | bundle/static scan plus attack attempt |
| `REL-NO-DEV-ENDPOINT` | localhost/dev endpoint | built artifact scan and request log |

Prior remote scripts may be inspected to avoid losing a useful assertion, but
their results and product-specific selectors must be revalidated against the
accepted implementation. No prior PASS transfers automatically.

## Static and supply checks

- exact lockfile install;
- typecheck, zero-warning lint, production build, and deterministic gate;
- secret patterns, service role, private key, localhost, test-entitlement, and
  source-map policy scans on source and built artifact;
- service worker/build label/cache identity consistency;
- bundle-size report and critical lazy-route budgets;
- dependency audit with production reachability analysis;
- food manifest/checksum/license validation;
- exercise media file/checksum/rights/review validation;
- broken link/media checks without uncontrolled external scraping;
- `git diff --check` and clean status.

## Verdict rules

| Verdict | GO requires | Automatic NO-GO / blocked condition |
| --- | --- | --- |
| `GO_FOUNDER_DEVICE_QA` | exact candidate built; mandatory local gates green; critical desktop/mobile journeys pass; founder checklist names known limits | boot/navigation/data-loss blocker, mismatched artifact, or unavailable review build |
| `GO_PREVIEW_FREE_USERS` | P1/P3/P4/P5/P7 pass; every paid mutation denied honestly; no test authority in bundle | any preview mutation, crash, cross-owner leak, silent loss, or stale artifact |
| `GO_PAID_COMMERCIAL_FUNNEL` | reviewed Salla product binding, staging activation backend, legitimate P2 mutations, rollback/support path | external commerce/backend unavailable or any fake/test authority |
| `GO_EXECUTIVE_DASHBOARD_FRONTEND` | isolated frontend contract/UI proofs pass; non-admin fail closed; live wiring may remain external | access bypass, sensitive read before auth, invented metrics, secret/client privilege |
| `GO_PRODUCTION_DATA_INGEST` | full canonical food artifacts reproducible from fingerprinted inputs with complete provenance and quality report | unavailable full shards/input, silent reject/normalization, license gap, unverifiable checksum |
| `GO_EXERCISE_MEDIA_RELEASE` | every released item has evidence-backed approval; missing/review states remain honest | auto-approved/unreviewed media, wrong/duplicate exercise image, search URL presented as reviewed video |
| `GO_MERGE_MAIN` | all relevant verdict prerequisites, exact-SHA CI green, dependencies resolved or founder-isolated, explicit founder merge authority | any red CI, unaccepted HEAD, unresolved launch blocker, deployment-trigger uncertainty, or absent authority |

## Current verdicts

| Verdict | Status | Reason |
| --- | --- | --- |
| `GO_FOUNDER_DEVICE_QA` | `NOT_EVALUATED` | no founder-accepted Web SHA/build |
| `GO_PREVIEW_FREE_USERS` | `NOT_EVALUATED` | no accepted built artifact |
| `GO_PAID_COMMERCIAL_FUNNEL` | `EXTERNALLY_BLOCKED` and `NOT_EVALUATED` | final Salla/backend evidence unavailable |
| `GO_EXECUTIVE_DASHBOARD_FRONTEND` | `NOT_EVALUATED` | isolated contract package still in progress; live provider external |
| `GO_PRODUCTION_DATA_INGEST` | `NOT_EVALUATED` | full reproducible food artifact not yet established on this lane |
| `GO_EXERCISE_MEDIA_RELEASE` | `NO-GO` | baseline review contract records zero approved images and videos |
| `GO_MERGE_MAIN` | `NO-GO` | unaccepted Web HEAD, red Web CI, incomplete Phase II, and no merge authorization |

## Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-REL-ARTIFACT-001` | Browser convergence requires one immutable accepted build; the moving/unaccepted Web branch cannot supply it. | Founder-accepted Web SHA, final route map, build label, and reproducible `dist` output. | Execute this matrix after all independent lanes rebind. | Build/hash artifact, update selectors only where the accepted UI requires it, run personas/attacks, and attach exact-SHA evidence. |
| `WS-REL-PREVIEW-001` | Preview security assertions depend on the final entitlement and mutation boundaries. | Accepted access contract and all final paid mutation entry points. | P1/P2/P7 attack harness. | Enumerate final boundaries, bind sanctioned test provider, run bypass mutations, and scan production bundle. |
| `WS-REL-ROUTES-001` | Direct-route/history assertions need the final route owner map. | Accepted `App`/navigation/404/auth/exercise route implementation. | P1/P3/P4/P6/P7 route matrix. | Map stable route IDs, revalidate history/reload behavior, and add any newly reachable canonical route. |
| `WS-REL-ADMIN-001` | Executive authorization cannot be exercised without the accepted host seam. | Accepted route/auth host plus reviewed admin read provider. | P8 unauthorized/admin contexts. | Wire only the reviewed adapter, run browser/a11y/privacy proofs, and keep live data externally blocked if backend reads remain absent. |

## Completion package

The final run produces:

- build identity and dist manifest;
- machine-readable assertion evidence;
- screenshots only for named visual assertions/failures;
- console/network failure ledger;
- historical defect replay table;
- test totals by persona/engine/locale/width;
- seven evidence-linked verdicts;
- external blocker list;
- 10–15 minute founder device checklist.

This plan itself authorizes no rebase, merge, deployment, commerce mutation, or
production database action.
