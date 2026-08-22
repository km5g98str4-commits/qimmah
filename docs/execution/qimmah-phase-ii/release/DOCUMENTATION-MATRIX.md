# Phase II Release Documentation Matrix

Observed: 2026-08-22 19:44 +03  
Baseline: `origin/main@cc60adfc0da0f893b101230269d4847d33490429`

This matrix prevents two failure modes: treating an old runbook as current
because it is on `main`, and recreating a document that already exists on a
quarantined Phase/Web branch. It is an index and gap analysis, not release or
deployment authorization.

## Classification

| Class | Meaning |
| --- | --- |
| `BASELINE-REVIEW` | Present on `origin/main`, but must be reconciled with the accepted final SHA and current external configuration. |
| `CURRENT-PHASE-II` | Created on the isolated `-002` branches from confirmed evidence. |
| `QUARANTINED` | Exists only on a branch containing unaccepted Web Sovereign history. Readable for discovery, not consumable wholesale. |
| `EXTERNAL-EVIDENCE` | Truth lives outside Git and requires founder/owner confirmation. |
| `MISSING` | No authoritative or quarantined artifact was found. |

## Baseline operational documents

| Artifact | Last baseline change | Class | Finding / required action |
| --- | --- | --- | --- |
| `docs/RELEASE-RUNBOOK.md` | `ff31f3f`, 2026-07-14 | `BASELINE-REVIEW` | Has gates and rollback points, but says Cloudflare automatically deploys `main`; verify this externally before using any main operation. |
| `docs/MERGE-DEPLOY-PLAN.md` | `231f936`, 2026-07-10 | `BASELINE-REVIEW` | Refers to historical branch `claude/p10-integrate-qa-deploy-kr4q6x` and a specific Pages URL; structure is useful, identities are stale. |
| `docs/release-checklist.md` | `cb97369`, 2026-07-07 | `BASELINE-REVIEW` | Covers web, Supabase, privacy, iOS, and QA, but predates Web Sovereign and Phase II. |
| `docs/release/RC-CHECKLIST.md` | `13216eb`, 2026-07-18 | `BASELINE-REVIEW` | Names historical `design/v21-promotion` and exact old SHAs; cannot serve as current RC evidence. |
| `docs/FOUNDER-QA-HANDOFF.md` | `46caa65`, 2026-07-10 | `BASELINE-REVIEW` | Useful manual categories, but its ready-state and branch stack are historical. |
| `PREVIEW-CHECKLIST.md` | `05ae7d4`, 2026-06-27 | `BASELINE-REVIEW` | Broad product checklist; must be mapped to final canonical surfaces instead of run as an undifferentiated legacy list. |
| `docs/launch/DEPLOY-TRUTH-VERIFICATION.md` | `ae21f88`, 2026-07-30 | `BASELINE-REVIEW` | Records a past hosting investigation and also says the app project used `main`; requires a current Cloudflare settings snapshot. |
| `docs/site/LAUNCH-HANDOFF.md` | `cf433e2`, 2026-07-30 | `BASELINE-REVIEW` | Separates site and app projects, but depends on the now-historical `design/v21-promotion` site branch. |
| `docs/BREACH-RUNBOOK.md` | `8f96d45`, 2026-07-13 | `BASELINE-REVIEW` | Incident structure exists; data inventory, contacts, and deployed processors need final verification. |
| `docs/legal/pdpl-gap-checklist.md` | `237e6ff`, 2026-08-03 | `BASELINE-REVIEW` | Newer than most runbooks, but live RLS/deletion verification remains owner-controlled. |
| `docs/ios/backend-verification-checklist.md` | `980f101`, 2026-07-09 | `BASELINE-REVIEW` | Correctly says staging first; backend application remains hard no-touch here. |
| `docs/CHANGELOG.md` | `515e80c`, 2026-07-13 | `BASELINE-REVIEW` | Stops at historical Wave 3 and explicitly derives from `integration/wave3`; not usable as current release notes. |

## Current isolated Phase II documents

| Artifact | Class | Purpose |
| --- | --- | --- |
| `docs/execution/qimmah-phase-ii/STATUS.md` | `CURRENT-PHASE-II` | Central resumability, dependencies, risks, and next tasks. |
| `release/SOURCE-OF-TRUTH.md` | `CURRENT-PHASE-II` | Exact refs, ancestry, PR inventory, and CI truth. |
| `release/FINAL-HEAD-REBIND-RUNBOOK.md` | `CURRENT-PHASE-II` | Future rebase without force-pushing published checkpoints. |
| `release/DEPENDENCY-RISK.md` | `CURRENT-PHASE-II` | Exact baseline npm advisory reachability and deferred remediation. |
| `release/RELEASE-CONVERGENCE-PLAN.md` | `CURRENT-PHASE-II` | Persona, attack, evidence, and verdict contract awaiting the accepted artifact. |
| `release/PRODUCTION-CHECKLIST.md` | `CURRENT-PHASE-II` | Continuously updated evidence checklist; unchecked items remain hard stops. |
| `release/RELEASE-NOTES-TEMPLATE.md` | `CURRENT-PHASE-II` | Evidence-bound bilingual release-note contract, explicitly unreleased. |
| `release/FOUNDER-MORNING-QA-TEMPLATE.md` | `CURRENT-PHASE-II` | Prepared 10–15 minute device path; not executable until final evidence fills it. |
| `release/TEST-CHANGE-LEDGER.md` | `CURRENT-PHASE-II` | Continuous exact-SHA inventory of executable proof changes and anti-weakening review. |
| `release/DEPLOYMENT-OWNER-HANDOFF.md` | `CURRENT-PHASE-II` | Owner-operated target, evidence, authorization, smoke, and rollback protocol; no external action. |
| Food contract package on `c/phase-ii-food-production-002` | `CURRENT-PHASE-II` | Canonical contract, source ledger, status, and adversarial test plan. |
| Exercise contract package on `h/phase-ii-exercise-production-002` | `CURRENT-PHASE-II` | Review-led exercise data/media contract and counter-proof plan. |
| Executive contract package on `e/phase-ii-executive-dashboard-002` | `CURRENT-PHASE-II` | Fail-closed access/data architecture and future browser/security test plan. |

## Quarantined documents found remotely

These artifacts demonstrate completed prior investigation, but their branches
contain unaccepted Web history.

| Artifact group | Remote evidence | Class | Reuse rule |
| --- | --- | --- | --- |
| Release persona evidence and four verdicts | `origin/codex/qimmah-release-convergence-001@54ad599` | `QUARANTINED` | Re-run against accepted built artifact; do not port its product fixes. |
| Food production report and pipeline evidence | `origin/codex/qimmah-food-production-001@e12bad0` | `QUARANTINED` | Keep investigation findings; independently prove raw input and full artifacts before adoption. |
| Exercise production report/media specification | `origin/codex/qimmah-exercise-production-001@dfde745` | `QUARANTINED` | Retain research value; require review evidence and remove Web/UI coupling before adoption. |
| Executive data contract/proofs/previews | `origin/codex/qimmah-executive-dashboard-001@1091451` | `QUARANTINED` | File-level audit may identify isolated commits; no live route/backend adoption now. |
| Final candidate, founder checklist, tests-changed ledger | `origin/codex/qimmah-final-release-convergence-001@df10b88` | `QUARANTINED` | Prior evidence only; verdicts do not transfer to a different accepted SHA. |
| Later founder QA/closure documents | `origin/claude/qimmah-sovereign-closure-h503u6@aa27fb1` | `QUARANTINED` | Commit names such as “closure” or “READY” are not founder acceptance. |

## Net-new deliverables still required

| Deliverable | Current class | Completion rule |
| --- | --- | --- |
| Final release convergence persona/evidence matrix | `CURRENT-PHASE-II / EXECUTION_BLOCKED` | Execute only against the founder-accepted built SHA. |
| Current release notes | `CURRENT-PHASE-II / TEMPLATE_ONLY` | Generate from the eventual accepted range, distinguish product changes from operations, and cite exact commits. |
| Phase II production checklist | `CURRENT-PHASE-II / CONTINUOUS` | Freeze only after the candidate and evidence bundle are immutable. |
| 10–15 minute founder checklist | `CURRENT-PHASE-II / PREPARED_NOT_EXECUTABLE` | Fill only from final passed evidence; every expected state must remain tied to the accepted build label. |
| Food rollback/data-version procedure | `MISSING` | Define immutable dataset version, checksums, activation pointer, and reversible rollback without production execution. |
| Exercise media rollback/version procedure | `CURRENT-PHASE-II` | Runbook exists on the exercise lane; activation remains unperformed. |
| Executive dashboard live-data handoff | `EXTERNAL-EVIDENCE` | Requires reviewed admin role/read endpoints and metric source ownership. |
| Deployment target truth | `EXTERNAL-EVIDENCE` | Founder/Cloudflare owner provides current projects, branches, build outputs, domains, and deployment triggers. |

## Deployment-trigger contradiction

Repository documents say the app's Cloudflare Pages project deploys from
`main`, while the current project charter says ordinary pushes to `main` are not
deployment because CI has no deploy step. Both can be textually true only if
the external Git integration is absent/disabled or the wording means different
things. GitHub workflow inspection alone cannot decide Cloudflare behavior.

Until current external settings are evidenced, Phase II treats every main merge
or push as potentially deployment-triggering and performs neither.

## Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-DOC-RECONCILE-001` | Final product paths, behavior, and build label are needed to retire stale identities in the release documents. | Founder-accepted Web Sovereign SHA and final route/build inventory. | Post-rebind documentation reconciliation package. | Update commands and journeys, remove stale branch/SHA claims with evidence, generate current release notes, and link every verdict to the accepted build. |
| `OPS-DEPLOY-TRUTH-001` | Repository documents conflict on whether a main update triggers external Cloudflare deployment. | None; the blocker is a current Cloudflare project/settings export from the founder or deployment owner. | Pre-merge/pre-deploy production checklist. | Record app/site project IDs, production branches, build outputs, domains and triggers; reconcile runbooks, then test only in an authorized preview/staging context. |
| `WS-FOUNDER-CHECKLIST-001` | A short founder checklist cannot honestly name expected final behavior or build labels yet. | Founder-accepted Web Sovereign SHA plus final convergence evidence. | Final report/handoff after all rebound lanes are green. | Condense only the passed critical paths and remaining external blockers into a 10–15 minute device checklist. |

## Next documentation actions

1. Prepare the versioned food rollback procedure from its canonical contract.
2. Maintain the Phase II test-change ledger as executable proofs land.
3. Keep the existing baseline runbooks referenced, not copied.
4. After final-HEAD acceptance, reconcile one authoritative release runbook,
   production checklist, release-notes file, and founder checklist.

No file in this matrix authorizes production deployment, a main merge, backend
mutation, or consumption of Web Sovereign changes.
