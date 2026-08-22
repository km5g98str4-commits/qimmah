# Exercise Production Test Plan

## Objective

Prove that the library audit and media manifest cover the real canonical catalog, preserve authored content without fallback inflation or translation, expose missing/review-needed states, and cannot be satisfied by fabricated evidence.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |
| `EX-DEP-MECH-001` | Image generation must not infer exercise mechanics, equipment, anatomy, or safe form. | None; the blocker is reviewed bilingual mechanics and metadata, not a Web Sovereign artifact. | A versioned authoring artifact tied to the same ledger fingerprint, before any later binding to the accepted media resolver. | Obtain reviewed start/end and safe-mechanics content with reviewer/timestamp, create a new job-schema version, assemble prompts mechanically, run preflight, and generate only the explicitly released batch. |
| `EX-DEP-VIDEO-REVIEW-001` | The nine pilot matches were found and verified by one primary researcher, so they are not independent approvals. | None; the blocker is independent human review, not a Web Sovereign artifact. | A versioned review package tied to the pilot SHA/fingerprint, before any later binding to the accepted exercise-detail/media resolver. | Review exact movement, equipment, variation, coaching suitability, and product fit per record; record reviewer/timestamp/verdict; promote only accepted records; retain rejected/missing rows; rerun live availability before integration. |

On closure of `EX-DEP-WS-001`, regenerate against the accepted final HEAD. This is a future rebind dependency only: it does not block the current audit, and a changed count or fingerprint is expected drift to investigate rather than a reason to preserve the old 181 threshold. The other two dependencies remain separately testable review gates.

## Current library-audit checks

1. Run `node scripts/exercise-production/validate-library-audit.mjs`.
2. Run `node scripts/exercise-production/library-audit-proof.mjs`.
3. Run `node scripts/exercise-production/build-library-audit.mjs --check`.
4. Run `node scripts/exercise-production/validate-review-ledger.mjs` and its reproducibility check to prove media approvals did not move.
5. Run `for file in scripts/exercise-production/*.mjs; do node --check "$file"; done`.
6. Run `git diff --check` and inspect the exact changed-file list.

Because this wave changes no application code or package metadata, typecheck/build/test:gate are deferred to a later integration package. This is a named scope decision, not a claim that those gates passed here.

## Implemented library-audit validator

### Primary key and coverage

- `LIBRARY_COVERAGE`: every baseline canonical ID has exactly one audit row and no noncanonical row exists.
- `LIBRARY_UNIQUE_IDS`: canonical IDs are unique.
- `LIBRARY_SOURCE_IDENTITY`: baseline commit, ordered source paths, and alias provenance stay bound to the approved source identities.
- `LIBRARY_SOURCE_FINGERPRINT`: source digests and composite fingerprint stay bound to the exact `cc60adf` bytes.
- `LIBRARY_UNKNOWN_FIELD`: any field outside the versioned envelope or record schema is rejected.
- `LIBRARY_COUNT_DRIFT`: summary counts must equal deterministic baseline-derived counts.

### Authored content and substitutions

- `LIBRARY_CORE_INTEGRITY`: names, muscles, equipment, movement, difficulty, environment, and defaults stay source-exact.
- `LIBRARY_AUTHORED_TEXT_INTEGRITY`: authored strings and arrays stay byte-for-byte source-exact.
- `LIBRARY_FALLBACK_IS_NOT_AUTHORED`: missing Arabic authoring cannot be filled with a pattern fallback.
- `LIBRARY_MISSING_ENGLISH_VISIBILITY`: missing English cannot be hidden by generated or translated text.
- `LIBRARY_SUBSTITUTION_INTEGRITY`: every substitution is source-exact, canonical, and non-self-referencing.
- `LIBRARY_COMPLETENESS_DRIFT`: per-record core, bilingual, and substitution gaps remain derived rather than hand-edited.

### Existing media validator

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

### Library audit — implemented

1. Delete one canonical row → `LIBRARY_COVERAGE`.
2. Duplicate one canonical row → `LIBRARY_UNIQUE_IDS`.
3. Change the source fingerprint → `LIBRARY_SOURCE_FINGERPRINT`.
4. Change an ordered source path → `LIBRARY_SOURCE_IDENTITY`.
5. Add an unrecognized record field → `LIBRARY_UNKNOWN_FIELD`.
6. Add an invalid substitution → `LIBRARY_SUBSTITUTION_INTEGRITY`.
7. Place fallback Arabic in an unauthored field → `LIBRARY_FALLBACK_IS_NOT_AUTHORED`.
8. Fill missing English with generated text → `LIBRARY_MISSING_ENGLISH_VISIBILITY`.
9. Hand-edit a summary count → `LIBRARY_COUNT_DRIFT`.
10. Remove core equipment → `LIBRARY_CORE_INTEGRITY`.
11. Alter one of the seven authored Arabic descriptions → `LIBRARY_AUTHORED_TEXT_INTEGRITY`.
12. Toggle a derived completeness flag → `LIBRARY_COMPLETENESS_DRIFT`.

### Media ledger — implemented

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
- Core metadata complete/gaps: 181/0.
- Bilingual authored complete/gaps: 0/181.
- Authored Arabic/English descriptions: 7/0; all other authored guidance readiness counts: 0/0.
- Explicit substitution rows/gaps: 54/127; references valid/invalid/self: 106/0/0.
- Runtime rendering: 121 start/end pairs, 23 machine diagrams, 37 fallbacks.
- Production image statuses: 0 approved, 144 needs review, 37 missing.
- Production video statuses: 0 approved, 181 missing.
- Duplicate-content pair groups: 6.
- Orphan mappings, orphan manifest rows, and missing referenced files: 0.
- Rights inventory: 250 clearly licensed + 24 in-house.

These are snapshot expectations for `cc60adf`, not hard-coded forever. The implementation derives the summary from records and compares the committed artifact to deterministic generation byte-for-byte.

## Final Web Sovereign rebind

After `EX-DEP-WS-001` closes, and only for regeneration/rebinding:

1. Record the approved final SHA and provenance.
2. Recompute canonical IDs and the ordered source fingerprint from that SHA.
3. Rerun all library/media counts from the accepted commit without copying from the Web Sovereign worktree.
4. Diff added, removed, and changed IDs and all status changes.
5. Regenerate artifacts if drift is legitimate; otherwise raise the mismatch.
6. Run `npm ci`, the focused exercise suite, typecheck, lint, build, and `test:gate` before any integration request.
7. Read CI before landing. No merge or deployment is authorized by this plan.
