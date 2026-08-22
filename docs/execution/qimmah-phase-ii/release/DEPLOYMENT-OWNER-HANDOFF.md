# Phase II Deployment Owner Handoff

Status: `PLAN_ONLY / EXTERNAL_TRUTH_BLOCKED`

This runbook prepares a safe handoff; it does not deploy, merge, push `main`,
upload TestFlight/App Store builds, change Cloudflare, or mutate Supabase. The
repository contains conflicting historical claims about deployment triggers, so
no Git action is used as an implied deployment mechanism until the current
external settings are captured and approved.

## 1. Separate targets and authority

Each target is a separate change window and requires its own named founder
authorization. Approval for one does not authorize another.

| Target | Candidate artifact | External owner evidence required | Rollback authority |
| --- | --- | --- | --- |
| Web application | Exact `dist/` manifest built from final candidate SHA | Cloudflare project ID/name, production branch, build command/output, custom domains, Git trigger state, current deployment ID | Founder/deployment owner promotes exact previous deployment |
| Marketing/legal site | Ordered `site/` file manifest | Separate site project, output root, production branch, domains, redirects/headers, current deployment ID | Founder/site owner promotes exact previous deployment |
| Supabase/backend | Reviewed ordered migration/function/config set | Project ref, environment classification, applied migration list, RLS/function verification owner, backup/recovery evidence | Backend owner uses approved forward recovery; never improvised rollback SQL |
| iOS/TestFlight/App Store | Signed archive identity and build number | Bundle ID, signing team, marketing/build versions, App Store Connect app, privacy/support URLs, release mode | Founder/App Store owner pauses/replaces according to platform controls |

No service-role key, token, certificate, account email, or secret value is
copied into this handoff. Record names, secret-manager locations, and owner
attestation only.

## 2. External truth capture — stop before Git if incomplete

The deployment owner records a dated settings export or screenshots for each
selected target:

```text
captured_at_utc=
captured_by=
target=
provider_account_or_team=
project_id_or_app_id=
production_branch=
git_integration_enabled=
automatic_production_trigger=
preview_trigger=
build_command=
build_output_directory=
root_directory=
production_domains=
current_deployment_id=
current_deployment_source_sha=
last_known_good_deployment_id=
rollback_control_verified=
environment_variable_names_only=
evidence_location=
```

For Cloudflare, explicitly answer whether merging or pushing `main` triggers an
external deployment even though GitHub CI itself has no deploy job. A blank or
assumed answer keeps `OPS-DEPLOY-TRUTH-001` open and blocks both merge and web
deployment.

## 3. Immutable candidate packet

Before requesting authorization, freeze one packet:

- founder-accepted Web SHA;
- rebound Food, Exercise, Executive, and Release lane SHAs;
- final candidate SHA and clean status;
- Node/npm versions and exact `npm ci` lockfile digest;
- ordered `dist/` path/SHA-256 manifest;
- food artifact/version/source/checksum manifest;
- exercise ledger/media manifest and review state counts;
- Executive source mode and accepted role/backend dependencies;
- full local gate and exact-candidate CI links;
- browser/persona/accessibility evidence bundle;
- dependency, risk, release-note, and test-change ledgers;
- exact last-known-good target for each selected deployment.

Any rebuild, commit, environment change, dataset pointer change, or asset change
invalidates the packet and requires regeneration. A branch name or a green run
from another SHA cannot substitute.

## 4. Owner readback and authorization record

The coordinator presents, and the deployment owner reads back:

```text
authorized_by=
authorization_message_id=
authorized_at_utc=
target_exactly=
candidate_sha_or_artifact_digest=
production_project_or_app_id=
expected_trigger_or_manual_action=
last_known_good_rollback_target=
operator=
observer=
scheduled_window=
automatic_abort_conditions=
```

The authorization must name the target and immutable candidate. A general
“looks good,” a CTO approval directed to someone else, or permission to merge is
not deployment authority.

## 5. Preview/staging rehearsal

The authorized owner first uses a non-production target whose configuration is
proved to match production in the fields relevant to the release.

1. Serve the exact frozen web artifact or signed build; do not rebuild in a
   different environment without replacing the packet.
2. Apply backend work to staging only through the backend owner's approved
   migration procedure; verify RLS, own-row access, deletion, consent, and
   failure recovery. Phase II does not perform this step.
3. Activate food/media versions only through a versioned pointer with the prior
   pointer recorded. Do not overwrite the last-known-good artifact.
4. Run the applicable final browser/persona/admin/data/media gates and the short
   founder checklist against this exact rehearsal identity.
5. Record failures as failures; a blocked external system is not a pass.

Rehearsal success is necessary but not production authorization.

## 6. Production change window — owner-operated

The operator follows the command or dashboard action captured from the current
external provider settings, not a historical repository snippet. The observer
verifies target, candidate digest/SHA, and rollback ID immediately before the
action.

Sequence:

1. Announce window and freeze unrelated release actions.
2. Re-read the authorization record and immutable packet.
3. Verify the current production deployment still equals the recorded starting
   point; if it changed, abort and rebuild the plan.
4. Execute exactly one selected target action.
5. Record provider deployment/build ID and timestamps.
6. Run the target-specific smoke checks below.
7. Continue to another target only under its own authorization.

Phase II never runs the production action itself under this program.

## 7. Post-change smoke checks

### Web application

- build/source identity matches the frozen candidate;
- start/auth and canonical navigation load without console/network failure;
- Arabic and English first paint, 390px and desktop, show no critical overflow;
- Preview mutation remains denied and a representative saved-state read is
  honest;
- privacy/support routes resolve to their intended content, not an SPA fallback;
- no localhost/private test endpoint/test entitlement/service-role material is
  present in source maps, bundle, or requests.

### Marketing/legal site

- `/`, `/support.html`, `/privacy.html`, `/terms.html`, and a real missing path
  return the intended distinct content/status;
- canonical, robots, sitemap, and App Store URLs use the approved live domain;
- TLS, headers, CSP, self-hosted assets, AR/EN legal content, and no-placeholder
  scan match the frozen manifest.

### Backend

Only the authorized backend owner records results: migration identity, RLS
positive/negative matrix, account deletion behavior, sync consent, audit/log
health, and recovery readiness. No live user data is copied into evidence.

### iOS

The authorized App Store owner records archive/build identity, launch, safe area,
auth link behavior, core local-first journey, privacy/support URLs, and staged
distribution state. Upload/submission is not inferred from an archive success.

## 8. Automatic abort and rollback

Abort or roll back the affected target for wrong artifact identity, blank/crash
loop, Preview write, cross-user or admin exposure, silent loss, missing legal
page, secret/test hook, failed backend authorization, corrupt data/media pointer,
or a critical smoke failure.

Rollback principles:

- promote the exact recorded previous immutable deployment; do not “rebuild the
  old branch”;
- restore the prior food/media activation pointer; preserve failed artifacts and
  evidence;
- use a new reviewed forward migration for an applied backend change unless the
  backend owner has a pre-approved reversible procedure;
- TestFlight/App Store recovery follows platform controls and needs the owner's
  separate action;
- after rollback, rerun identity and critical smoke checks and record the
  incident; rollback success does not erase the failed release result.

## 9. Completion record

For each target, capture provider deployment/build ID, source SHA/digest,
operator/observer, start/end times, smoke assertion IDs, rollback target,
incidents, and final state `SUCCESS`, `ROLLED_BACK`, or `ABORTED`. Link this record
from release notes and the final evidence bundle without exposing secrets or
user data.

## 10. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-DEPLOY-ARTIFACT-001` | No production packet exists while the product head and rebound lanes are unaccepted. | Founder-accepted Web SHA, final route/build inventory, rebound lanes, and exact candidate evidence. | Immutable candidate packet before preview/staging rehearsal. | Build and hash artifacts, attach exact gates/CI/persona evidence, select last-known-good targets, and request target-specific authorization. |
| `OPS-DEPLOY-TRUTH-001` | Repository history conflicts on Cloudflare projects, branches, domains, and automatic triggers. | None; current Cloudflare/App Store/Supabase owner settings are external to Web. | External truth capture before any merge or deployment decision. | Owner supplies dated settings evidence, reconciles app/site targets, and verifies rollback controls. |
| `AUTH-DEPLOY-001` | This plan does not grant authority for any external mutation. | None; authority is a separate founder decision. | Owner readback immediately before each target action. | Obtain a named authorization record for the exact target/candidate/window; keep merge, deployment, backend, and store permissions separate. |
| `WS-BACKEND-SET-001` | Final backend-affecting artifacts cannot be enumerated against a moving Web implementation. | Accepted final migration/function/env-name set from Web, if any. | Backend-owner staging review. | Inventory ordered changes, security review RLS/functions, apply to staging under owner control, prove recovery, then seek separate production authority. |

