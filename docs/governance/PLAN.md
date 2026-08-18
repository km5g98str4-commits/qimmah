# PLAN — خطة التنفيذ الوحيدة المعتمدة

## Version

**v1.0-rc** — supersedes the v0.9 planning baseline. See [Changelog](#changelog).

## Status

**AWAITING_FOUNDER_REVIEW — NOT AUTHORIZED FOR EXECUTION.**

No task in this document may begin until the founder approves this plan **and** resolves `DEC-001` (canonical ground) and `DEC-002` (V1 horizon). Nothing outside this file may be implemented unless a declared plan-update happens first.

## Canonical Ground

**PROPOSED, not adopted** — `DEC-001`.

```
branch = claude/qimmah-recovery-control-plane-hph1jg
sha    = dc031fa36929e07c3b00fa025a676ed64327ce59
```

Justified by containment over all 81 remote refs and a green CI run at that exact SHA (`VERIFY.md` V-GROUND-03/06, V-CI-03). `main` (`cc60adfc0da0f893b101230269d4847d33490429`) is a **production pointer**, 229 commits behind this frontier.

**Pin the SHA, not the branch.** The branch tip advanced to `8e83963b7d653d6bfb19c00c614ca3a694e65d7d` during verification and has no completed CI run. `FA-007` (freeze the line) must be done **before** `FA-001`.

## Target V1 state

A Qimmah release in which:

1. Every material external claim is TRUE, or the claim is corrected before release.
2. One canonical ground exists, and one control plane governs it.
3. The four gates plus the browser gate are green **on the released SHA**, and their greenness is meaningful.
4. Production failures are observable, and a user hitting one has a real support path.
5. Local-first behavior matches the stated philosophy; sensitive health data stays behind explicit separate consent (`DEC-105`).

## Definition of Done

V1 is done when **all** hold:

- `typecheck` · `lint` · `build` · `test:gate` · browser E2E green on the release SHA, evidenced by a CI run **on that SHA** (never transferred).
- `QIM-V1-TRUTH-001` closed with **zero material FALSE claims** outstanding.
- `QIM-V1-OBS-001` closed: errors captured, support path tested, no secret or sensitive-data leakage.
- `DEC-001`…`DEC-005` resolved and recorded.
- `STATE.md` reflects the released SHA.
- Founder has performed the founder-only actions in `STATE.md` → Founder Actions.

## Scope

### IN

- Establishing and adopting canonical ground.
- Claim/product-truth reconciliation (`QIM-V1-TRUTH-001`).
- Gate-integrity verification (`QIM-V1-GATE-001`).
- Minimal release observability and support path (`QIM-V1-OBS-001`).
- Governance consolidation (`QIM-V1-GOV-001`).
- Web release readiness.

### OUT

- Nutrition budget feature (`DEC-101`).
- Any new product feature not already on the canonical ground.
- Expanded exercise-library sourcing (`DEC-104`, suspended).
- Automatic silent plan edits (`DEC-103`).

### DEFERRED

- iOS launch, TestFlight, App Store submission — pending `DEC-002`.
- iOS `ERR_UNKNOWN` boot diagnosis — deferred if `DEC-002 = A`, otherwise critical path.
- Legacy-lineage residual content (`QIM-V1-GROUND-002`).
- Full muscle-map comparative study (charter §11, still scheduled).

## Ordered critical path

1. `QIM-V1-GROUND-001` — founder adopts canonical ground.
2. `QIM-V1-GOV-001` — one control plane governs.
3. `QIM-V1-TRUTH-001` — claim inventory; material FALSE claims block release.
4. `QIM-V1-GATE-001` — prove the gates guard live surfaces.
5. `QIM-V1-OBS-001` — observability and support path.
6. `QIM-V1-REL-001` — release readiness on the adopted ground.

## Workstream table

| Workstream | Owns | Never touches |
|---|---|---|
| **GROUND** | Ref topology, ancestry, branch disposition | Product source |
| **GOV** | The four control files, decision register | Product source |
| **TRUTH** | Claims vs behavior: site, legal, store, entitlement copy | Gate definitions |
| **GATE** | Proof-script integrity, `test:gate` wiring | Product behavior |
| **OBS** | Error capture, reference IDs, support path | Product features |
| **REL** | Release sequencing, deploy readiness | Any founder-only act |

**WIP rule: at most one open item per workstream. Finish before start.**

## Tasks

> No task may be `COMPLETE` without evidence. Evidence means a command, a path with line numbers, or a CI run at an exact SHA.

### QIM-V1-GROUND-001 — Adopt canonical ground

| Field | Value |
|---|---|
| Workstream | GROUND · **Phase** 1 · **Depends-on** — |
| Status | `BLOCKED_ON_FOUNDER` (`DEC-001`) |
| Required evidence | Founder approval in a numbered message; post-adoption `git rev-parse` of the adopted ref; CI green at that SHA |
| Definition of Done | One ground named in `STATE.md`; every later task branches from it |

### QIM-V1-GROUND-002 — Legacy-lineage residual disposition

| Field | Value |
|---|---|
| Workstream | GROUND · **Phase** 3 · **Depends-on** `QIM-V1-GROUND-001`, `DEC-005` |
| Status | `NOT_STARTED` |
| Required evidence | Per-item: path, presence/absence at ground SHA, supersession evidence or a carry-forward decision |
| Definition of Done | Every legacy item is superseded-with-evidence, carried forward, or explicitly dropped by the founder. Opens `V2-GROUND-01`. |

### QIM-V1-GOV-001 — Consolidate to one control plane

| Field | Value |
|---|---|
| Workstream | GOV · **Phase** 1 · **Depends-on** `DEC-004` |
| Status | `BLOCKED_ON_FOUNDER` |
| Required evidence | One authoritative directory; the other two reduced to pointers; no duplicated normative text (charter §1.5) |
| Definition of Done | A fresh session reading one path can act correctly |

### QIM-V1-TRUTH-001 — Claim / product-truth audit

| Field | Value |
|---|---|
| Workstream | TRUTH · **Phase** 2 · **Depends-on** `QIM-V1-GROUND-001` |
| Status | `NOT_STARTED` |
| Required evidence | The claim table below, fully populated, every row citing file:line at the ground SHA |
| Definition of Done | Zero material FALSE claims outstanding; each remaining row TRUE or corrected |

Inventory every material external promise against real implementation, covering where applicable: **landing/site claims · privacy · terms · Salla product description · subscription duration · trial · Premium · account requirements · health/fitness claims · support promises · store-facing copy.**

Each claim records:

```
CLAIM_ID | exact claim | source | actual behavior | TRUE/PARTIAL/FALSE/UNKNOWN | evidence | required action
```

**Material FALSE claims block release.**

Seeded from Tier-1 evidence — one row is already open and material:

| CLAIM_ID | Exact claim | Source | Actual behavior | Verdict | Evidence | Required action |
|---|---|---|---|---|---|---|
| CLM-001 | "**لا يوجد اشتراك فعّال في هذه النسخة**" ("there is no active subscription in this version") | `site/terms.html:84`; `docs/legal/terms-of-service.md:47`; repeated `docs/legal/APPSTORE-COMPLIANCE-PACK.md:355`, `docs/legal/app-privacy-labels.md:54` | 13 product actions are enumerated as **paid** and gated behind entitlement | **UNKNOWN → likely FALSE/PARTIAL** | `src/lib/access/paidActions.ts` defines `PaidAction` + `PAID_ACTIONS` with 13 entries (`workout.start`, `workout.logSet`, `workout.finish`, `nutrition.addFood`, …, `recovery.log`), read at `dc031fa` | Determine whether the gate is **live** at the release SHA. If live → the legal text is FALSE and **blocks release**: correct the text or disable the gate. Founder decides which. |

> Verdict is deliberately `UNKNOWN` and not `FALSE`: the contradiction in the text is **confirmed from source**, but whether entitlement enforcement is *active* at runtime is exactly the broad investigation this task exists to perform. Tier-1 does not decide it.

### QIM-V1-GATE-001 — Gate integrity

| Field | Value |
|---|---|
| Workstream | GATE · **Phase** 2 · **Depends-on** `QIM-V1-GROUND-001` |
| Status | `NOT_STARTED` |
| Required evidence | For each suspect proof: a **counter-simulation that fails by a named check** (charter §4.2) |
| Definition of Done | No gate passes vacuously; every exception list is guarded by a counter-assertion |

Leads to test, none of them yet findings: `test:onboarding-questions` (alleged to check wiring, not consumption) · `run-food-longtail-proof` (alleged to pass whether all slices exist or none) · the coaching guard (alleged runner-less — **did not reproduce**: `test:coaching` → `node scripts/coaching/run-coaching-proof.mjs` is wired). Tightening a gate requires an attack that fails by name.

### QIM-V1-OBS-001 — Release observability and support path

| Field | Value |
|---|---|
| Workstream | OBS · **Phase** 3 · **Depends-on** `QIM-V1-GROUND-001` |
| Status | `NOT_STARTED` |
| Required evidence | A reproduced production-class error showing capture; a screenshot of the user-visible reference; a support message delivered end-to-end; a leakage check over captured payloads |
| Definition of Done | All four below hold |

- **Production error capture** — unhandled errors are recorded, not silently swallowed.
- **Safe user-visible error / reference ID** where appropriate — enough for support to correlate, carrying no personal or sensitive data.
- **Tested support path** — a real message reaches a real destination; the address in the UI is the one that works.
- **No secret / sensitive-data leakage** — no keys, tokens, or health data in captured payloads or logs (`.claude/rules/security.md`; `DEC-105`).

### QIM-V1-REL-001 — Release readiness

| Field | Value |
|---|---|
| Workstream | REL · **Phase** 4 · **Depends-on** all of the above |
| Status | `NOT_STARTED` |
| Required evidence | CI green at the release SHA; `QIM-V1-TRUTH-001` closed; `QIM-V1-OBS-001` closed |
| Definition of Done | Founder has everything needed to authorize release. **Release itself remains founder-only** (`DEC-106`). |

## Phase exit gates

| Phase | Exits when |
|---|---|
| **1 — Ground & governance** | `DEC-001` and `DEC-004` resolved; one ground, one plane |
| **2 — Truth & gates** | Claim table populated; zero material FALSE outstanding; no vacuous gate |
| **3 — Observability & residuals** | `QIM-V1-OBS-001` done; legacy residuals dispositioned |
| **4 — Release** | Definition of Done fully satisfied |

No phase may be entered while the previous phase has an open blocking item.

## Claim / Product Truth audit

Governed by `QIM-V1-TRUTH-001` above. Standing rules:

- A claim is **material** if a reasonable user or reviewer could rely on it to decide to pay, to trust the app with data, or to believe a health/fitness statement.
- **Material FALSE claims block release** — no exceptions, and this is never cut for schedule.
- `UNKNOWN` is a valid interim verdict and must be resolved before release; it may never be silently promoted to TRUE.

## Release readiness

Release requires, at the exact release SHA: all gates green in CI · zero material FALSE claims · observability closed · founder authorization. Promotion, deploy, store submission, and live migrations are **founder-only** (`DEC-106`).

## Observability / support

See `QIM-V1-OBS-001`. Minimum bar, not a feature: capture, a safe reference, a tested path, no leakage.

## Ordered Cut List

Under schedule pressure, cut **in this order**, explicitly and on the record:

1. Visual polish beyond AA contrast and touch-target minimums
2. Legacy-lineage residual carry-forward (`QIM-V1-GROUND-002`)
3. Non-blocking perf-budget overages
4. Documentation tidying beyond the four control files
5. Non-material claim rewording

**Never cut to meet schedule — no exceptions, no silent exceptions:**

- user safety
- security
- entitlement integrity
- data integrity
- corruption recovery
- truthfulness of material claims

A cut that is not written into this list did not happen legitimately.

## Changelog

### v0.9
Initial founder-reviewed planning baseline.
Historical implementation state remained CLAIMED.
Not authorized for execution.

### v1.0-rc
Governance structure revised.
Tier-1 ground verification introduced.
Awaiting founder review before freeze.
