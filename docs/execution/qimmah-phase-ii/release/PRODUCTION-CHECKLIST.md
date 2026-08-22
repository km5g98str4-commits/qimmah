# Phase II Production Checklist

Status date: 2026-08-22  
Rule: a checked box requires exact evidence; unchecked does not mean forgotten

This checklist prepares production but does not perform deployment, main merge,
live database work, Salla mutation, or App Store/TestFlight submission.

## 1. Program identity and isolation

- [x] Phase II brief fingerprint recorded: `50bb61138aae13124eed9cf62c670ed31f7eb0c6a3c80fd0d10f340f52a97a07`.
- [x] Provisional baseline recorded: `origin/main@cc60adfc0da0f893b101230269d4847d33490429`.
- [x] Release, food, exercise, and executive work use separate worktrees and branches.
- [x] Active Web Sovereign worktree is documented as read-only.
- [x] No Web Sovereign merge, rebase, cherry-pick, manual port, or file copy was used by the `-002` lanes.
- [x] Superseded `/private/tmp` worktrees were preserved after host cleanup; no destructive recovery was attempted.
- [x] Immediate commit-and-push cadence established on release and exercise lanes.
- [x] Food first checkpoint pushed at `8a78f86eec8b9b0019c021dfa6213a45e1a20763`.
- [ ] Executive first checkpoint pushed.

Evidence: central `STATUS.md`, `release/SOURCE-OF-TRUTH.md`, and remote `-002`
branch heads.

## 2. Source-of-truth and dependency control

- [x] Fresh remote fetch and ancestry inventory completed.
- [x] Existing Phase II branches identified and quarantined because they contain unaccepted Web history.
- [x] Open PR inventory read; no Phase II/Web Sovereign PR is open.
- [x] Exact Web Sovereign CI history read and the first/latest red SHAs named.
- [x] Artifact-quota failure distinguished from successful code/browser steps without relabeling red CI as green.
- [x] Every current dependency uses ID, description, blocking artifact, future integration point, and remaining work.
- [x] Final-HEAD rebind procedure preserves old remote checkpoints and requires no force push.
- [ ] Founder acceptance names one immutable final Web SHA.
- [ ] Every lane rebound onto that accepted SHA.
- [ ] Only recorded dependencies resolved after rebind.

Blocking references: `WS-HEAD-001`, `WS-PH2-ANCESTRY-001`, and
`WS-CLOSURE-001` in central `STATUS.md`.

## 3. Baseline engineering gate

Verified on release checkpoint `c20211cea0e45f3056fcb1a5a077cc44a807d90d`
after a clean `npm ci`:

- [x] `npm run typecheck` — exit 0.
- [x] `npm run lint` — exit 0, zero-warning policy.
- [x] `npm run build` — exit 0, 2,539 modules transformed.
- [x] `npm run test:gate` — exit 0.
- [x] `git diff --check` — exit 0.
- [ ] Equivalent full gate on the founder-accepted Web SHA.
- [ ] Equivalent full gate on every rebound Phase II lane.
- [ ] Exact-SHA final candidate CI entirely green.

The checked baseline gate proves planning-branch integrity only.

## 4. Release convergence

- [x] Immutable artifact identity and evidence record defined.
- [x] Eight persona journeys defined, including executive authorization.
- [x] Required widths, Arabic/English, Chromium/WebKit, and state isolation defined.
- [x] Historical defect replay ledger defined.
- [x] Preview bypass and production-bundle attack surfaces defined.
- [x] Seven evidence-linked GO/NO-GO rules defined.
- [ ] Harness selectors/adapters validated against accepted routes.
- [ ] Tests executed against the final built artifact, not a dev server.
- [ ] Fresh/returning/interrupted/corrupt/unauthorized contexts executed.
- [ ] WebKit critical paths executed or exact downgrade recorded.
- [ ] Physical founder device QA completed.

Current truth: `GO_MERGE_MAIN=NO-GO`; no accepted artifact or merge authority.

## 5. Food production data

- [x] Baseline catalog and packaged-source inventory completed read-only.
- [x] Existing remote food branch audited without consumption.
- [x] Isolated `CanonicalFoodV1` contract, source ledger, status, and test plan pushed.
- [ ] Raw source files have immutable IDs and SHA-256 fingerprints.
- [ ] Every parsed row is accepted or counted under one unique rejection record.
- [ ] Short/malformed rows cannot disappear silently.
- [ ] Negative nutrients and unit fallbacks produce named quality flags or rejection.
- [ ] GTIN 8/12/13/14 checks and Arabic-digit normalization have counter-proofs.
- [ ] Exact GTIN, source ID, brand/name/size, and fuzzy-review dedupe stages are distinct.
- [ ] Differing valid GTINs never merge automatically.
- [ ] Every accepted row has provenance, normalization version, and raw-value traceability.
- [ ] Full accepted shards, conflict set, and review queue are available and checksummed.
- [ ] Full artifacts reproduce byte-for-byte from fingerprinted inputs.
- [ ] ODbL attribution/share-alike decision approved before shipping OFF-derived data.
- [ ] Saudi/SFDA source availability and permitted use recorded honestly.
- [ ] Food production report derives all counts from final artifacts.
- [ ] Runtime/scan/search integration performed only after accepted Web seam.

Blocking references include `WS-STORAGE-001`, `WS-FOOD-SCAN-001`, and the food
lane dependency register.

## 6. Exercise production library and media

- [x] 181 canonical IDs recorded with deterministic source fingerprint.
- [x] Evidence-led data/media contracts pushed at `4125691`.
- [x] Review ledger pushed at `cea98dc`: 181/181 coverage.
- [x] Image states are conservative: 0 approved, 144 needs review, 37 missing.
- [x] Video states are conservative: 0 approved, 181 missing.
- [x] Six duplicate-content groups are derived from asset-pair digests.
- [x] Validator, byte-for-byte regeneration, and seven named mutations pass.
- [ ] Asset path scope prevents traversal outside approved media root.
- [ ] Every image candidate has exercise/equipment/anatomy/start-end/safety/crop review.
- [ ] Duplicate groups adjudicated; no different exercise silently shares approved media.
- [ ] Original candidates produced for the 37 missing exercises with prompt/tool/version metadata.
- [ ] Exact public video references researched and independently reviewed.
- [ ] No YouTube search-result URL appears as an approved video.
- [ ] Arabic and English descriptions/steps/cues/mistakes/breathing meet the authored-content contract.
- [ ] Released media manifest has rollback/version/checksum procedure.
- [ ] Accepted Web surfaces use one approved resolver with honest fallback states.

Current truth: `GO_EXERCISE_MEDIA_RELEASE=NO-GO`.

## 7. Executive Dashboard

- [x] Existing remote dashboard audited without consumption.
- [x] Missing backend/admin authority recognized as external rather than invented.
- [ ] Isolated v2 data/access contract pushed.
- [ ] `AdminAccessDecision` distinguishes denied, authorized founder/admin, and unavailable.
- [ ] Server authorization is required before any sensitive read; UI guard alone is insufficient.
- [ ] Top-level denied/loading/empty/partial/error/ready states are explicit.
- [ ] Every metric carries definition, source, window, updated time, freshness/quality, privacy class, role, owner, and unavailable state.
- [ ] Attention items carry source, time, owner, and detectable/blind distinction.
- [ ] Active-user data is never relabeled as workout or retention data.
- [ ] User rows are privacy-minimized and health detail requires deliberate drill-down.
- [ ] No fake/inert refresh/open/destructive control is visible.
- [ ] One-screen home answers KPIs, alerts, trends, attention, and recent activity.
- [ ] Arabic/English, RTL, keyboard, focus, 44px touch, contrast, browser layout, and large-data tests pass.
- [ ] Non-admin/forged-claim/browser-route attacks fail closed.
- [ ] Live provider remains externally blocked until reviewed backend read contracts exist.

Blocking references: `WS-ROUTE-001`, `WS-REL-ADMIN-001`, and the executive lane
dependency register.

## 8. Privacy and security

- [x] Hard no-touch boundary recorded for Supabase/SQL/RLS/RPC/service role/Salla/QAE/production.
- [x] Complete npm audit findings triaged on the provisional lockfile.
- [x] Production-only npm audit returned zero findings on `cc60adf`.
- [x] Automatic audit fix intentionally not run.
- [ ] Final accepted lockfile audited with runtime reachability mapping.
- [ ] Source and built artifact scans find no secrets, service role, localhost, private test endpoints, or production entitlement hook.
- [ ] Admin denial exposes no role-provisioning internals.
- [ ] No sensitive value appears in console, screenshot, fixture, dataset, or generated report.
- [ ] Food and exercise external licenses/rights evidence reviewed for release use.
- [ ] Live deletion/RLS/consent behavior verified by authorized backend owner in staging first.

Blocking references: `WS-PACKAGE-LOCK-001` and external backend owner evidence.

## 9. Operations and deployment preparation

- [x] Baseline runbooks/checklists inventoried and classified by currency.
- [x] Stale branch/SHA references identified rather than copied.
- [x] Potential contradiction about Cloudflare deployment from `main` recorded.
- [ ] Current Cloudflare app/site project IDs, production branches, outputs, domains, and triggers supplied by owner.
- [ ] One authoritative release runbook reconciled to accepted SHA and current external settings.
- [ ] Food dataset version/activation-pointer rollback documented.
- [ ] Exercise media manifest/version rollback documented.
- [ ] Current release notes generated from accepted commit range.
- [ ] Phase II test-change ledger completed.
- [ ] Final production checklist frozen to an exact candidate SHA.
- [ ] 10–15 minute founder checklist generated from passed evidence.
- [ ] No deployment executed by Phase II.

Blocking reference: `OPS-DEPLOY-TRUTH-001`.

## 10. Final authority

- [ ] Founder accepts final Web Sovereign SHA.
- [ ] Founder reviews all seven final verdicts and evidence.
- [ ] CTO/CI conditions required by the charter are satisfied.
- [ ] Founder explicitly authorizes any merge action required by the current workflow.
- [ ] Founder explicitly authorizes deployment, App Store/TestFlight, live migration, or branch deletion separately.

Unchecked authority boxes are hard stops. This checklist never converts silence
or a historical commit message into permission.
