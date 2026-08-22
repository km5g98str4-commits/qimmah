# Exercise Media Rollback Runbook

## Purpose

Rollback restores truthful exercise media without deleting evidence. The safe direction is always to stop showing a questionable asset first, preserve the asset and review trail, then investigate. This runbook does not authorize deployment, merge, branch deletion, or destructive asset removal.

The current `EX-MEDIA-PLAN` package has no generated outputs and changes no product resolver or approval status. Its immediate rollback is therefore limited to reverting its planning commit if required; no live media exists to remove.

## Rollback triggers

Initiate rollback for any of the following:

- wrong exercise or equipment;
- reversed or unreadable start/end positions;
- unsafe or anatomically implausible mechanics;
- duplicate content used as if it were a distinct exercise;
- missing or changed rights evidence;
- digest, dimensions, source fingerprint, or job-version mismatch;
- unexpected rendering, crop, accessibility, or performance regression;
- an asset shown before independent review and approval.

## Required checkpoint

Before a future generation or integration batch, record:

- exact repository commit and branch;
- ledger path, SHA-256, and `sourceFingerprint`;
- image-job file SHA-256 and selected job IDs;
- previous production manifest commit;
- output paths and digests;
- reviewer and release owner.

Without this checkpoint, the batch remains blocked.

## Rollback order

1. Freeze the affected batch; do not generate replacements during diagnosis.
2. Identify exact exercise IDs, asset versions, paths, and digests.
3. Remove the affected assets from the user-facing manifest or downgrade them to `NEEDS_REVIEW`/`REJECTED` in a reviewed follow-up package. Do not point to a similar exercise as a substitute.
4. Confirm the UI returns the honest missing-media state.
5. Preserve generated files and prompts in a non-shipping quarantine location with the failure reason. Do not silently delete evidence.
6. Revert the smallest owning commit with a normal `git revert` when code rollback is required. Do not use reset, force push, or broad checkout.
7. Regenerate and validate derived artifacts from the restored source of truth.
8. Run focused media tests, the full required gate, and exact-SHA CI before any later landing.

If a deployment rollback is required, stop and obtain the founder's named authorization; deployment actions are outside this runbook's authority.

## Data-only rollback checks

After rollback, confirm:

- every canonical exercise still has exactly one ledger row;
- no orphan job or media row exists;
- all referenced files remain inside their allowed exercise-media root and match recorded digests;
- duplicate-content findings remain visible;
- no `APPROVED` status survives without complete review evidence;
- a removed output is no longer referenced by any product surface;
- the status report names the trigger, affected IDs, checkpoint, and remaining risk.

## Recovery

Recovery is a new version, never an in-place rewrite of the failed evidence. Correct the reviewed mechanics or source metadata, create a new job/output version, rerun the validator and counter-proofs, and repeat independent visual review. Keep the rejected version and reason in the audit trail.
