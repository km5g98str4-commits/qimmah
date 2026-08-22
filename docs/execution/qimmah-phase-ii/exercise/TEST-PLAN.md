# Exercise Production Test Plan

## Objective

Prove that the audit and media manifest cover the real canonical catalog, expose missing/review-needed states, and cannot be satisfied by fabricated approval evidence.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |

On closure, run the rebind suite first. A changed count or fingerprint is expected drift to investigate, not a reason to preserve the old 181 threshold.

## Current documentation-wave checks

1. Confirm branch/worktree and exact baseline SHA.
2. Confirm only the four owned documentation files changed.
3. Verify required headings and one fully formed five-field dependency line per document.
4. Cross-check the same baseline counts across the four documents.
5. Run `node scripts/build-media-manifest.mjs --check`.
6. Run `node scripts/media/exercise-media-audit.mjs --check`.
7. Run `node scripts/run-media-pipeline-proof.mjs`.
8. Run `git diff --check`.

Because this wave changes no application code or package metadata, typecheck/build/test:gate are deferred to the later implementation package. This is a named scope decision, not a claim that those gates passed here.

## Future deterministic validator

### Primary key and coverage

- `METADATA_PRIMARY_KEY`: canonical IDs are unique.
- `METADATA_GRAIN`: audit row count equals unique canonical ID count.
- `MEDIA_COVERAGE`: every canonical ID has exactly one media entry.
- `MEDIA_ORPHAN`: no media entry exists outside the canonical dimension.
- `MEDIA_KEY_MISMATCH`: object key equals `exerciseId`.
- `SUBSTITUTION_INTEGRITY`: every substitution resolves and does not self-reference.

### Metadata validity

- names, equipment, movement pattern, difficulty, and environment satisfy the data contract;
- cardio is the only accepted exception to non-empty detailed primary muscles;
- user-ready completeness is computed separately from structural completeness;
- pattern fallback is labeled fallback and cannot satisfy exercise-specific authored completeness;
- empty English arrays remain visible failures rather than being silently replaced during audit.

### Media evidence

- `MEDIA_FILE_INTEGRITY`: every path exists, has non-zero bytes, expected MIME, dimensions, and matching SHA-256.
- `IMAGE_APPROVAL_EVIDENCE`: approved image has rights evidence, eight passed review checks, reviewer, and timestamp.
- `VIDEO_APPROVAL_EVIDENCE`: approved video has exact ID/URL, channel, title, reviewer, confidence, and verification timestamp.
- `VIDEO_REFERENCE_EXACT`: search-result URLs are rejected from the video field.
- `DUPLICATE_CONTENT_PAIR`: identical asset-pair digests across canonical IDs are reported and prevent approval pending review.
- Rights statuses outside `CLEARLY-LICENSED` and `IN-HOUSE` prevent image approval.

## Required anti-circumvention mutations

Every guard tightening must be attacked and must fail by its named assertion:

1. Delete one canonical media row → `MEDIA_COVERAGE`.
2. Add `not-a-canonical-exercise` → `MEDIA_ORPHAN`.
3. Make an entry key disagree with `exerciseId` → `MEDIA_KEY_MISMATCH`.
4. Set an image to `APPROVED` while `reviewedAt` or one review check is null → `IMAGE_APPROVAL_EVIDENCE`.
5. Set a YouTube search-results URL to `APPROVED` while filling unrelated metadata → `VIDEO_REFERENCE_EXACT`.
6. Reuse an approved pair for a different exercise ID → `DUPLICATE_CONTENT_PAIR`.
7. Delete or zero one referenced asset → `MEDIA_FILE_INTEGRITY`.
8. Add an undocumented rights verdict → the named rights allow-list guard.

A generic exception or crash does not count as a successful negative test.

## Baseline expectations

- Canonical rows and unique IDs: 181/181.
- Runtime rendering: 121 start/end pairs, 23 machine diagrams, 37 fallbacks.
- Production image statuses: 0 approved, 144 needs review, 37 missing.
- Production video statuses: 0 approved, 181 missing.
- Duplicate-content pair groups: 6.
- Orphan mappings, orphan manifest rows, and missing referenced files: 0.
- Rights inventory: 250 clearly licensed + 24 in-house.

These are snapshot expectations for `cc60adf`, not hard-coded forever. The implementation should generate a summary and compare it to committed artifacts byte-for-byte.

## Final Web Sovereign rebind

After `EX-DEP-WS-001` closes:

1. Record the approved final SHA and provenance.
2. Recompute canonical IDs and the ordered source fingerprint from that SHA.
3. Rerun all metadata/media counts without copying from the Web Sovereign worktree.
4. Diff added, removed, and changed IDs and all status changes.
5. Regenerate artifacts if drift is legitimate; otherwise raise the mismatch.
6. Run `npm ci`, the focused exercise suite, typecheck, lint, build, and `test:gate` before any integration request.
7. Read CI before landing. No merge or deployment is authorized by this plan.
