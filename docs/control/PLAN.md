# PLAN.md — Qimmah V1 Execution Plan

**Revision:** v0.9.1
**Status:** PLANNING + VERIFICATION MODE — **NOT AUTHORIZED FOR EXECUTION.**
**Freeze state:** NOT frozen. This is not v1.0.

---

## ⚠️ PROVENANCE NOTICE

No predecessor `PLAN.md` exists in this repository (`VERIFY.md` §Provenance). The phases
and tasks below are **reconstructed** from two sources only:

1. The founder instruction that produced this revision (task IDs `UX-002`, `ACC-001`,
   `GOV-002`, `QIM-V1-TRUTH-001`, the observability task, the cut list).
2. **Repository evidence** — the tree at trunk HEAD, `package.json`, `.github/workflows/`,
   `AGENTS.md` §11, `docs/legal/`, `site/`, `src/config/product.ts`.

**Every task below is CLAIMED scope, not verified scope.** Task sizing, and in several
cases task existence, is provisional until its Tier-2 verification runs.

---

## 0. Standing rules

| Rule | Statement |
|---|---|
| P-1 | **The dependency graph must be executable in phase order.** A task may depend only on tasks in the same or an *earlier* phase. Violations are structural errors, not scheduling details. |
| P-2 | A phase may not be renumbered to hide a dependency. If the cycle is real, the task is **split**, not moved. |
| P-3 | No task begins before its Tier-2 verification questions are answered (`VERIFY.md` §4). |
| P-4 | Nothing in the **Never-Cut list** (§6) may be removed for schedule under any circumstance. |
| P-5 | A task blocked on a `PENDING_FOUNDER` decision is **blocked**, not "proceed with best guess". |

**ID convention:** canonical form is `QIM-V1-<AREA>-<n>`. Short form (`ACC-001`, `UX-002`,
`GOV-002`) is the same task.

---

## 1. Phase 0 — Ground (in progress under this revision)

*Purpose: establish what the real codebase is. Nothing may be planned against unverified ground.*

| ID | Task | Depends on | Status |
|---|---|---|---|
| GOV-001 | Tier-1 ground verification — the nine checks in `VERIFY.md` §3 | — | **EXECUTING (this revision)** |
| GOV-002 | Branch reality audit — resolve all competing ground candidates; identify unique unmerged work; propose disposition per branch | GOV-001 | **NOT STARTED — explicitly not authorized** |

**Phase 0 exit criterion:** a canonical ground branch + full SHA is founder-accepted, and
`GROUND_CONFIDENCE` is HIGH.

---

## 2. Phase 1 — Truth and safety foundation

*Purpose: the things that make a release legal, honest and safe. These come first because
they can invalidate everything built after them.*

| ID | Task | Depends on |
|---|---|---|
| **TRUTH-001** | **Claim / product truth audit** — see §4. Permanent, never closed. | GOV-001 |
| SAFE-001 | Verify user-safety gates end to end: minors gate on **every** entry path, medical/health disclaimers wherever a number could read as advice | GOV-001 |
| SEC-001 | Secrets, RLS and data-exposure audit: repository, built bundle, `VITE_*` surface, Supabase policies | GOV-001 |
| DATA-001 | Data-integrity and corruption-recovery verification: no failed write ever presents as success; corrupted local state is recoverable | GOV-001 |

---

## 3. Phase 2 — Account, entitlement and the UX that depends on them

*Purpose: the account/entitlement substrate, and only then the UX built on top of it.*

> **Dependency correction applied in this revision — see §7.**
> `ACC-001` was in Phase 3 while `UX-002` in Phase 2 depended on it. `ACC-001` has been
> moved **into Phase 2, ahead of `UX-002`**. This is a real reordering, not a renumbering.

| ID | Task | Depends on | Phase of dependency |
|---|---|---|---|
| **ACC-001** | Account foundation verified end to end: signup · login · password reset · delete-account · guest→account migration is lossless | GOV-001, SEC-001 | 0, 1 ✅ |
| **ENT-001** | Entitlement integrity: purchase → entitlement → feature access, verified server-side; client-side forgery is not sufficient to grant Premium | ACC-001, SEC-001 | 2, 1 ✅ |
| **UX-002** | Account-dependent UX surfaces: entry/guest state, account screens, entitlement-gated UI states, and their honest empty/error states | **ACC-001**, ENT-001 | **2, 2 ✅** |
| UX-001 | Bilingual completeness: every user-visible string in AR **and** EN, RTL correct in both | GOV-001 | 0 ✅ |
| UX-003 | Accessibility on all changed surfaces: labels, focus management, touch targets, AA contrast | UX-001, UX-002 | 2, 2 ✅ |
| SYNC-001 | Sync posture truth: real flag state matches what UI and site claim; sensitive health data stays behind its separate explicit consent | ACC-001, SEC-001, TRUTH-001 | 2, 1, 1 ✅ |

---

## 4. Phase 3 — Release readiness

| ID | Task | Depends on |
|---|---|---|
| **REL-001** | **Minimum production observability and support** — see §5 | ACC-001, SEC-001 |
| GOV-003 | Dead-layer cleanup (~23 candidate files). Static import analysis is **not** a death certificate — every candidate needs a documented dynamic-reference `grep` (string keys, lazy imports, route tables, i18n dicts) | GOV-002 |
| GOV-004 | Feature-inventory re-verification: every CLAIMED feature traced UI → storage/DB | GOV-002, TRUTH-001 |
| IOS-001 | iOS horizon work: `ERR_UNKNOWN` device-boot diagnosis, device QA, store compliance. **`HORIZON-PENDING` — gated on DEC-014** | DEC-014, ACC-001 |
| REL-002 | Release gate: four gates green from clean `npm ci` on the release SHA · CI green on that exact SHA · zero material FALSE claims outstanding | **all of the above** |

---

## 5. QIM-V1-TRUTH-001 — Claim / Product Truth Audit

**Type:** PERMANENT. This task is never "done" — it is re-run before every release.
**Status:** NOT STARTED.
**Phase:** 1.

### Purpose

Inventory **every material promise Qimmah makes externally**, and verify each one against
**actual product behaviour**. A promise the product does not keep is a defect of the same
class as a crash, and in the commercial and legal surfaces it is a larger one.

### Required coverage (minimum — not a ceiling)

- Website claims (all pages)
- Landing page
- Privacy page (`site/privacy.html`, `docs/legal/privacy-policy.md`)
- Terms (`site/terms.html`, `docs/legal/terms-of-service.md`)
- Salla product description
- Subscription duration
- Trial claims
- Premium claims
- Account requirements
- Data / privacy promises (including the "local-first, optional sync" posture)
- Health / fitness claims
- Support promises (`site/support.html`, in-app support path)
- Any store-facing copy (App Store listing / privacy labels — scope depends on DEC-014)

### Required record — every claim, no exceptions

| Field | Requirement |
|---|---|
| `CLAIM_ID` | Stable unique ID, e.g. `CLM-014` |
| Exact claim | Verbatim text, in its original language. Not paraphrased. |
| Source | Exact location — file + line, URL, or store field |
| Actual implementation / behaviour | What the product **actually does**, traced in code or observed running |
| Status | `TRUE` · `PARTIAL` · `FALSE` · `UNKNOWN` |
| Evidence | Command, file:line, screenshot, or observed run. Per `VERIFY.md` E-1..E-4. |
| Required action | Fix the product · fix the claim · remove the claim · none |

### Binding release rule

> **No release is allowed while a material FALSE claim remains unresolved.**

A claim is *material* if a reasonable user or regulator could rely on it in deciding to
pay, to sign up, or to share personal or health data. `PARTIAL` on a material claim is
treated as `FALSE` until narrowed to what is actually true.

`UNKNOWN` on a material claim **does not** satisfy this rule. Unknown is not permission.

---

## 6. QIM-V1-REL-001 — Minimum production observability and support

**Status:** NOT STARTED. **Phase:** 3. **Scope discipline: deliberately minimal.**

> **This is not an observability platform.** No dashboards, no metrics pipeline, no
> session replay, no analytics build-out. If a proposed item is not in the list below,
> it is out of scope.

### Must establish

1. **Production error capture** — unhandled errors and promise rejections in production
   reach a destination a human actually reads.
2. **User-visible reference / error ID** — where a user hits a failure they may need to
   report, they are shown a short reference ID that can be correlated with the captured
   error. Shown where it helps; not sprayed across every surface.
3. **A tested support path** — the in-app/site support route is exercised end to end, by
   actually using it.
4. **Verified support destination** — proof the destination *receives* and can *answer*.
   A support address that nobody monitors is a false promise and feeds back into
   `TRUTH-001` (support promises).
5. **Safe diagnostics** — captured payloads carry enough to debug and **no** secrets,
   tokens, credentials, or sensitive user data. Health data in particular must not leak
   into error payloads (`AGENTS.md` §8, locked decision 5).

### Explicitly out of scope

Metrics/APM, uptime dashboards, user analytics, session replay, log aggregation,
alerting rules beyond "a human sees it".

---

## 7. V1 CUT LIST (ordered)

**This is contingency planning only. Nothing is cut now.** No item below is cut by an
agent — cutting is a founder decision, taken at the moment schedule pressure is real.

Answers: *"If schedule pressure appears, what gets removed first?"*

Ordered **safest to cut → least safe to cut**. Cut from the top.

| # | Item | Why it is safe(r) to cut | Cost of cutting |
|---|---|---|---|
| 1 | Dead-layer cleanup (GOV-003) | Pure hygiene. Zero user-facing effect. | Tech debt persists |
| 2 | Press/marketing polish beyond truthful copy | Presentation, not function or truth | Weaker launch presentation |
| 3 | Non-blocking perf-budget debt (lazy-chunk overage) | Already declared non-gating in CI | Slower load on one view |
| 4 | Feature-inventory re-verification breadth (GOV-004) — narrow to shipped V1 surfaces only | Unshipped surfaces cannot mislead users | Unverified claims about non-V1 features must then be *removed*, not left standing |
| 5 | Bilingual polish beyond completeness (UX-001 tone/register debt) | Correct-and-present beats elegant | Rougher voice; charter §6 debt grows |
| 6 | iOS horizon entirely (IOS-001) — **if DEC-014 = A** | Deferral, not deletion | No native V1; work preserved for V1.1 |
| 7 | Accessibility beyond AA on **changed** surfaces (UX-003) | Scope narrowing, not standard lowering | Pre-existing a11y debt persists |
| 8 | Non-essential Premium features (not entitlement *integrity*) | Fewer features is honest; a broken entitlement is not | Thinner Premium — **and every Premium claim must be re-cut to match (TRUTH-001)** |
| 9 | Optional cloud sync (SYNC-001) — ship local-only | Charter posture already local-first | **Only** if every sync claim is removed from site, app and store copy first |

### NEVER CUT — under any schedule pressure, ever

These are not ordered, because none of them is available at any position:

- **User safety** — minors gate, medical/health disclaimers
- **Security** — secrets exposure, RLS, auth integrity
- **Entitlement integrity** — a user must not be charged for what they do not receive, nor receive what they did not buy
- **Data integrity** — no failed write may present as success
- **Corruption recovery** — a user must not lose their data irrecoverably
- **Truthful material product claims** — no material FALSE claim ships

> Cutting from this list does not make the date. It makes the failure worse and later.

---

## 8. Dependency-order correction (instruction §7)

### The contradiction

`UX-002` sat in **Phase 2** and depended on `ACC-001` in **Phase 3**. Under Rule P-1 the
graph was not executable in phase order: Phase 2 could not start without a Phase 3 output.

### Is it circular?

**No — checked, not assumed.** `ACC-001` (signup, login, reset, delete, guest→account
migration) has no dependency on `UX-002` (account-dependent UX surfaces). The account
substrate can be verified and made correct without the UX layer above it; the UX layer
cannot be built without the substrate. The edge runs one way only.

Because it is a genuine ordering error and not a cycle, the correct fix is to **move the
dependency earlier**, not to renumber the dependent later and call it solved.

### Resolution

**`ACC-001` moves from Phase 3 into Phase 2, positioned ahead of `UX-002`.**
`ENT-001` moves with it, since entitlement sits on account identity and `UX-002` renders
entitlement-gated states.

No phase was renumbered. No task was deleted. No cycle was hidden.

### Full edge list — verified acyclic and phase-ordered

| Task | Phase | Depends on | Dependency phases | Legal? |
|---|---|---|---|---|
| GOV-001 | 0 | — | — | ✅ |
| GOV-002 | 0 | GOV-001 | 0 | ✅ |
| TRUTH-001 | 1 | GOV-001 | 0 | ✅ |
| SAFE-001 | 1 | GOV-001 | 0 | ✅ |
| SEC-001 | 1 | GOV-001 | 0 | ✅ |
| DATA-001 | 1 | GOV-001 | 0 | ✅ |
| ACC-001 | 2 | GOV-001, SEC-001 | 0, 1 | ✅ |
| ENT-001 | 2 | ACC-001, SEC-001 | 2, 1 | ✅ |
| UX-002 | 2 | ACC-001, ENT-001 | 2, 2 | ✅ |
| UX-001 | 2 | GOV-001 | 0 | ✅ |
| UX-003 | 2 | UX-001, UX-002 | 2, 2 | ✅ |
| SYNC-001 | 2 | ACC-001, SEC-001, TRUTH-001 | 2, 1, 1 | ✅ |
| REL-001 | 3 | ACC-001, SEC-001 | 2, 1 | ✅ |
| GOV-003 | 3 | GOV-002 | 0 | ✅ |
| GOV-004 | 3 | GOV-002, TRUTH-001 | 0, 1 | ✅ |
| IOS-001 | 3 | DEC-014, ACC-001 | decision, 2 | ✅ (blocked on DEC-014) |
| REL-002 | 3 | all above | ≤3 | ✅ |

**No task depends on a later phase. No cycles. Executable in phase order.**

---

## 9. CHANGELOG

### v0.9
- Initial founder-reviewed planning baseline.
- All historical implementation state remains **CLAIMED** until repository verification.
- Not authorized for execution.

### v0.9.1 — this revision
- **Recorded that the v0.9 control files do not exist in this repository.** No `PLAN.md`,
  `VERIFY.md`, or control `DECISIONS.md` was found in the working tree, in any commit, or
  on any of the 79 remote branches. The v0.9 baseline is therefore itself CLAIMED, and
  this revision is a **reconstruction from repository evidence + the founder instruction**,
  not an edit of an existing file.
- `VERIFY.md` split into Tier 1 / Tier 2 / Tier 3. Tier 1 fixed at exactly the nine
  founder-named ground checks and defined; all other questions attached to the PLAN task
  that needs them.
- Six items previously framed as verifications, but actually multi-step audits, promoted
  to real PLAN tasks (GOV-002, GOV-003, GOV-004, TRUTH-001, REL-001, SEC-001).
- `DEC-013` changed `LOCKED` → `PENDING_FOUNDER`; recorded that its subject matter is
  unrecoverable from the repository and must be restated by the founder.
- `DEC-014` created (`PENDING_FOUNDER`): V1 product horizon — Web only vs Web + iOS —
  with recommendation, consequences of both, and a guarded default. iOS/Capacitor marked
  `HORIZON-PENDING`, **not** silently Deferred.
- `QIM-V1-TRUTH-001` added as a permanent claim/product-truth audit with a binding
  release rule.
- `QIM-V1-REL-001` added: minimum production observability and support, scope-capped.
- Ordered V1 cut list added, with a Never-Cut list.
- Dependency contradiction resolved: `ACC-001` (and `ENT-001`) moved from Phase 3 into
  Phase 2 ahead of `UX-002`. Verified non-circular; full edge list published.
- `FOUNDER ACTIONS` section added to `STATE.md`, distinct from Founder Decisions.
- Tier-1 verification executed; results recorded in `STATE.md` §2.

> **Not frozen. This is not v1.0.**
