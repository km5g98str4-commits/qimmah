# Qimmah Founder Morning QA — 10–15 Minute Template

Status: `PREPARED_NOT_EXECUTABLE`

This is the short final-device handoff structure, not evidence that a review
build exists. The release coordinator changes the status to `READY_FOR_FOUNDER`
only after every preflight field below is filled from the accepted, fully tested
candidate. The founder does not troubleshoot, inspect developer tools, or repair
data during this pass; any unexpected result is recorded and the pass stops at
the named hard-stop rule.

## 1. Preflight card — coordinator fills before handoff

| Field | Required value |
| --- | --- |
| Founder-accepted Web SHA | `[40-character SHA]` |
| Final candidate SHA | `[40-character SHA]` |
| Review URL/build label | `[immutable review identity]` |
| Dist manifest SHA-256 | `[64-character digest]` |
| Device/browser | `[physical device + OS + browser versions]` |
| Arabic test context | `[fresh preview fixture/context ID]` |
| English test context | `[returning fixture/context ID]` |
| Premium test authority | `[sanctioned test-only provider evidence or EXTERNALLY_BLOCKED]` |
| Executive access context | `[reviewed role fixture/live-read evidence or UNAVAILABLE]` |
| Evidence bundle | `[path/URL bound to candidate SHA]` |
| Known accepted limits | `[dependency IDs only]` |
| Handoff owner | `[name + timestamp]` |

Preflight fails if a placeholder remains, the URL can serve a different build,
the browser suite and CI are not green on the same candidate, or the test state
requires a production entitlement bypass. Failure means the status remains
`PREPARED_NOT_EXECUTABLE`.

## 2. Twelve-minute path

The timeboxes are guidance; correctness wins over speed. Record only
`PASS`, `FAIL`, or `BLOCKED:<dependency-id>` and attach one screenshot when a
visual mismatch matters.

### 00:00–01:00 — identity and first paint

- [ ] Open the immutable review build from a fresh physical-device context.
- [ ] Confirm the displayed build identity matches the preflight card through
  the coordinator-provided safe build-info surface; do not infer it from URL.
- [ ] Confirm the first screen is usable with no blank page, crash, overlap, or
  clipped primary action.

Evidence links: `REL-ARTIFACT-IDENTITY`, `REL-INSTALL-OVERLAP`, `REL-TOUCH`.

### 01:00–03:00 — Arabic newcomer and Preview boundary

- [ ] In Arabic, complete the coordinator-selected shortest representative
  onboarding path and reach the personalized reveal.
- [ ] Choose Preview/decline Premium through the visible product flow.
- [ ] Open Today, Workout, and Nutrition; confirm navigation is stable and the
  current day agrees.
- [ ] Attempt the one named paid mutation from the handoff card; it must remain
  blocked with honest next-step copy and no saved change.

Evidence links: `P1`, `REL-PREVIEW-MUTATION`, `REL-PREVIEW-BYPASS`,
`REL-TODAY-WORKOUT-DAY`, `REL-NUTRITION-EJECT`.

### 03:00–05:00 — persistence honesty

- [ ] Use the sanctioned Premium test context only if its preflight field is
  evidence-backed; otherwise mark this block `BLOCKED:<dependency-id>`.
- [ ] Perform the one named representative write, refresh, and verify the exact
  saved value returns.
- [ ] Run the coordinator-prepared failed-save case and confirm the input stays,
  no false success appears, and the recovery action remains available.

Evidence links: `P2`, `REL-STORAGE-HONESTY`, final storage failure assertion.

### 05:00–06:30 — returning and interrupted state

- [ ] Open the returning context, refresh, use Back/Forward, and confirm it
  returns to the correct dashboard without losing owner-scoped state.
- [ ] Open the interrupted-onboarding context and confirm it resumes at the
  named meaningful point; change its parent answer and confirm invalid child
  answers clear.

Evidence links: `P3`, `P4`, `REL-RETURNING-GUEST`, `REL-ONBOARDING-RESUME`.

### 06:30–08:00 — exercise understanding and recovery

- [ ] Open the named reviewed exercise detail and confirm its name, equipment,
  muscles, steps, cues, and media states match the release evidence.
- [ ] Use Back, then open the named unknown/deep-link case; recovery must be
  deterministic and must not show a different exercise.
- [ ] A missing or review-needed image/video must remain honest; a search-result
  URL must never be presented as an approved instructional video.

Evidence links: `REL-EXERCISE-BACK`, `REL-EXERCISE-DEEP`, `REL-404`, final media
ledger entry IDs.

### 08:00–09:30 — English and auth

- [ ] Switch to English and confirm the selected core surface preserves meaning,
  direction, readable numbers, and unclipped actions.
- [ ] Execute the handoff's one auth failure/recovery case with keyboard; no raw
  provider detail appears and direct/reload behavior matches the evidence.

Evidence links: `P6`, `REL-AUTH-ROUTES`, `REL-SIGNUP-SPACE`, `REL-NUMERALS`.

### 09:30–11:00 — Executive access truth

- [ ] Ordinary-user context receives a generic denial before any dashboard data
  request or structure leak.
- [ ] If the executive frontend verdict is GO and the reviewed role context is
  provided, open it and confirm unavailable/partial/stale values remain distinct
  from zero; otherwise record the exact `ADM-*` dependency and stop this block.
- [ ] No destructive or inert control is visible.

Evidence links: `P8`, final executive auth/provider/browser assertion IDs.

### 11:00–12:00 — visual sweep and decision

- [ ] Rotate or resize once and scan the current screen for overflow, clipped
  values, undersized primary controls, lost focus, or unreadable contrast.
- [ ] Read the seven verdicts and accepted limits below. Record the founder's
  review result; do not convert review into merge or deployment authority.

Evidence links: viewport/accessibility matrix and final evidence manifest.

## 3. Optional 12:00–15:00 block

Run only when the paid commercial funnel has a reviewed staging path and the
preflight card names it. Never exercise a live purchase, live database mutation,
or production activation from this checklist.

- [ ] Open the reviewed public product destination.
- [ ] Complete the staging activation path with the sanctioned test identity.
- [ ] Confirm entitlement appears only after authoritative success and survives
  refresh.
- [ ] Confirm invalid/replayed input fails honestly without exposing the code or
  backend internals.

Otherwise record `BLOCKED:<commerce/backend dependency>` and end at 12 minutes.

## 4. Hard-stop rules

Stop the pass immediately for any blank/crash loop, wrong artifact identity,
cross-user data, Preview mutation, silent data loss, production test-authority
hook, admin bypass, secret/token exposure, or media presented as approved without
ledger evidence. Record the time, screen, last action, candidate SHA, and one
screenshot; do not retry into a pass.

## 5. Founder review record

| Verdict | Evidence status before review | Founder observation |
| --- | --- | --- |
| `GO_FOUNDER_DEVICE_QA` | `[GO/NO-GO/BLOCKED + link]` | `[PASS/FAIL/BLOCKED]` |
| `GO_PREVIEW_FREE_USERS` | `[GO/NO-GO/BLOCKED + link]` | `[PASS/FAIL/BLOCKED]` |
| `GO_PAID_COMMERCIAL_FUNNEL` | `[GO/NO-GO/BLOCKED + link]` | `[PASS/FAIL/BLOCKED]` |
| `GO_EXECUTIVE_DASHBOARD_FRONTEND` | `[GO/NO-GO/BLOCKED + link]` | `[PASS/FAIL/BLOCKED]` |
| `GO_PRODUCTION_DATA_INGEST` | `[GO/NO-GO/BLOCKED + link]` | `[reviewed/not reviewed]` |
| `GO_EXERCISE_MEDIA_RELEASE` | `[GO/NO-GO/BLOCKED + link]` | `[reviewed/not reviewed]` |
| `GO_MERGE_MAIN` | `[GO/NO-GO/BLOCKED + link]` | `[reviewed only]` |

Founder device QA is a review input. It is not authorization to merge, deploy,
change a live database, publish to an app store, or delete a branch. Each such
action keeps its separate named authority.

## 6. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-FOUNDER-CHECKLIST-001` | The timeboxed structure is prepared, but final expected states and build identity cannot be filled honestly yet. | Founder-accepted Web SHA, rebound lane heads, exact final candidate, and complete convergence evidence. | Final release handoff after every applicable verdict has evidence. | Replace every placeholder, select only passed representative cases, insert exact dependency IDs for blocked blocks, validate the 10–15 minute run on the same candidate, and change status to `READY_FOR_FOUNDER`. |

