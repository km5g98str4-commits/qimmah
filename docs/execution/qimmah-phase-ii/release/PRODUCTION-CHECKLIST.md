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
- [x] Immediate commit-and-push cadence established on all four lanes.
- [x] Food deterministic seed checkpoint pushed at `4a4380654ed08fa73124a262411c056d12aa8049`.
- [x] Exercise video research and normalized dependency checkpoint pushed at `e97522f3e68d9022aa7bd6c3203da5b2a2f41355`.
- [x] Executive architecture checkpoint pushed at `3824c08b1cd3dec488b143f3e17f16a268d3fbb4`; dependency schema corrected at `09dbf087a1acec45efd4739d7307fc9eb6e4edcd`.

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
- [x] Evidence manifest validator and nine named anti-circumvention proof cases pass in explicit fixture-only mode.
- [x] Built-artifact manifest tool proves ordered checksums, candidate binding, content drift, and symlink rejection on synthetic fixtures.
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
- [x] The 55-row seed source has an immutable ID, byte count, and SHA-256 fingerprint.
- [x] Every seed row is accounted for exactly once: 51 accepted, four review, zero rejected.
- [x] Short/malformed seed rows cannot disappear silently; a named mutation kills the build.
- [x] Negative seed nutrients produce a named validation failure.
- [x] Seed GTIN checksum validation has a named negative mutation.
- [ ] Arabic-digit normalization has a dedicated counter-proof.
- [ ] Exact GTIN, source ID, brand/name/size, and fuzzy-review dedupe stages are distinct.
- [x] A named seed counter-proof confirms differing valid GTINs do not merge automatically.
- [x] Every accepted seed row has provenance, normalization version, source reference, and raw-value traceability.
- [ ] Full accepted shards, conflict set, and review queue are available and checksummed.
- [ ] Full artifacts reproduce byte-for-byte from fingerprinted inputs.
- [x] The five quarantined seed artifacts reproduce byte-for-byte, carry exact checksums, and are bound to build ID `7bfe4cc245e45ce4d152f0b2956ab8f7e0cece71d95b6d27f63165f709c58ebe`.
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
- [x] Ledger validator, byte-for-byte regeneration, and eight named mutations pass.
- [x] Asset path scope confines still pairs and machine diagrams to their separate approved roots; `MEDIA_PATH_SCOPE` rejects traversal.
- [x] A deterministic 37-job image queue records missing mechanics as blocked; every prompt is null and every output is `NOT_GENERATED`.
- [x] A deterministic ten-exercise video pilot records nine exact public candidates and one honest missing result; all remain unapproved.
- [x] Video pilot validation, byte-for-byte regeneration, eight named mutations, and live public-metadata verification pass for 9/9 candidates.
- [ ] Every image candidate has exercise/equipment/anatomy/start-end/safety/crop review.
- [ ] Duplicate groups adjudicated; no different exercise silently shares approved media.
- [ ] Original candidates produced for the 37 missing exercises with prompt/tool/version metadata.
- [ ] Exact public video references researched and independently reviewed across the full 181-ID library.
- [x] No YouTube search-result URL or pilot candidate appears as an approved video.
- [ ] Arabic and English descriptions/steps/cues/mistakes/breathing meet the authored-content contract.
- [x] Media rollback/version/checksum procedure documented; release activation remains undone.
- [ ] Accepted Web surfaces use one approved resolver with honest fallback states.

Current truth: `GO_EXERCISE_MEDIA_RELEASE=NO-GO`.

## 7. Executive Dashboard

- [x] Existing remote dashboard audited without consumption.
- [x] Missing backend/admin authority recognized as external rather than invented.
- [x] Isolated v2 data/access contract pushed at `3824c08b1cd3dec488b143f3e17f16a268d3fbb4`.
- [x] `AdminAccessDecision` contract is fail-closed and separates loading, denied reasons, and allowed server-claim roles; the exact founder/admin policy remains `ADM-001`.
- [x] Architecture requires server authorization before every sensitive read; the UI guard is explicitly insufficient.
- [x] Top-level denied/loading/empty/partial/error/ready states are explicit in the contract.
- [x] Metric definitions require source/window/time/privacy/role/owner/unavailable state, and ready values require as-of/freshness/quality/coverage.
- [x] Attention contracts carry source/version/time/owner/threshold and detected/clear/unmonitorable/error states.
- [x] Chart contracts forbid relabeling active-user series as workout or retention data.
- [x] User contracts minimize list payloads and exclude individual health values from the executive surface.
- [x] Synthetic Executive contract fixtures reproduce deterministically and kill 11/11 named authorization/data-honesty mutations at `1dc78d6751fb9269a75176f40ad5ba2483db651c`.
- [ ] No fake/inert refresh/open/destructive control is visible.
- [ ] One-screen home answers KPIs, alerts, trends, attention, and recent activity.
- [ ] Arabic/English, RTL, keyboard, focus, 44px touch, contrast, browser layout, and large-data tests pass.
- [ ] Non-admin/forged-claim/browser-route attacks fail closed.
- [x] Live provider is explicitly `EXTERNALLY_BLOCKED` until reviewed backend read contracts and server authorization exist.

Blocking references: `WS-ROUTE-001` and `ADM-001..009` in the executive lane
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
- [x] Implementation-independent deployment-owner handoff prepared for web app, site, backend, and iOS targets.
- [ ] Current Cloudflare app/site project IDs, production branches, outputs, domains, and triggers supplied by owner.
- [ ] One authoritative release runbook reconciled to accepted SHA and current external settings.
- [ ] Food dataset version/activation-pointer rollback documented.
- [x] Exercise media manifest/version rollback documented; no activation was performed.
- [ ] Current release notes generated from accepted commit range.
- [x] Continuous Phase II test-change ledger established through the recorded four lane heads.
- [ ] Phase II test-change ledger frozen at the final candidate with every rebound change recorded.
- [ ] Final production checklist frozen to an exact candidate SHA.
- [x] 10–15 minute founder checklist structure prepared with hard-stop rules and evidence bindings.
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
