# Phase II Exercise Production — Status

## Wave

- Package: `EX-4A` — bounded exact-video research pilot.
- Branch: `h/phase-ii-exercise-production-002`.
- Audited baseline: `origin/main@cc60adfc0da0f893b101230269d4847d33490429`.
- Refreshed: 2026-08-22.
- Scope: one video-research data artifact, its direct scripts, video runbook, and this status file. No `src/**`, package manifest, Web/UI code, review-ledger approval, Web Sovereign worktree, media download/rehosting, merge, rebase, or deployment was touched.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |
| `EX-DEP-MECH-001` | The 37 missing-image jobs cannot safely become prompts from media-only ledger data. | Reviewed mechanics with bilingual start/end descriptions, safe-mechanics notes, exact equipment/muscles/movement metadata, reviewer identity, and review timestamp. | Versioned authoring evidence bound to the same ledger `sourceFingerprint`; all fields complete for each released job. | Create a new prompt-ready job version, assemble prompts mechanically, run preflight, generate a bounded batch, and keep all outputs `NEEDS_REVIEW` until independent visual approval. |
| `EX-DEP-VIDEO-REVIEW-001` | The nine pilot matches were found and verified by one primary researcher, so they are not independent approvals. | Independent visual review of the exact movement, equipment, variation, coaching suitability, and product fit for every candidate. | Signed, versioned review tied to the pilot SHA/fingerprint, with reviewer identity, ISO timestamp, and a per-record accept/reject verdict. | Promote only accepted records through a later manifest package; retain rejected and missing rows visibly and rerun live availability verification before integration. |

These dependencies do not block the research and validation contracts in this package. They block only their named later production or integration work.

## Confirmed baseline facts

The unit of analysis is one canonical exercise ID.

| Check | Confirmed result |
| --- | ---: |
| Canonical exercise rows | 181 |
| Unique canonical exercise IDs | 181 |
| Core structural metadata complete | 181 |
| Bilingual user-ready metadata complete | 0 |
| Arabic descriptions present | 7 |
| English descriptions present | 0 |
| Arabic instruction sets with 3–7 steps | 143 |
| English instruction sets with 3–7 steps | 0 |
| Arabic cue sets with 2–5 cues | 181 |
| English cue sets with 2–5 cues | 0 |
| Arabic common-mistake coverage | 181 |
| English common-mistake coverage | 0 |
| Explicit substitutions present | 54 |
| Current YouTube search URLs | 181 |
| Exact reviewed video references | 0 |

The English gaps are not an inference from empty UI. The current known-exercise path reads optional authored English arrays, which are empty on this baseline. The default YouTube URLs are search pages and therefore are discovery aids, not production video references.

## Media truth

| Production classification | Images | Videos |
| --- | ---: | ---: |
| `APPROVED` | 0 | 0 |
| `NEEDS_REVIEW` | 144 | 0 |
| `REJECTED` | 0 | 0 |
| `MISSING` | 37 | 181 |

The 144 image candidates are 121 start/end pairs plus 23 effective in-house machine diagrams. Rights evidence exists for the underlying inventory, but this wave did not perform a recorded per-exercise anatomy, equipment, start/end, safe-mechanics, or mobile-crop review. None is promoted to `APPROVED`.

The current generated runtime manifest reports 121 still pairs, 25 placeholder-only records, and 35 missing records. Two placeholder records (`chest-press-machine`, `incline-chest-press-machine`) have no machine diagram; one machine mapping (`pec-deck-machine`) is not selected because its still pair wins. The resulting user-visible split is 121 start/end, 23 machine diagrams, and 37 honest fallbacks.

## Findings and risk

### High

- English user-facing guidance is not production complete: 0/181 descriptions, instruction sets, cue sets, and mistake sets meet the contract.
- No image or video has the evidence required for Phase II `APPROVED`; `GO_EXERCISE_MEDIA_RELEASE=NO`.
- Six SHA-256-identical start/end pair groups are mapped to distinct canonical exercises and require exercise-match review:
  - `cable-biceps-curl` / `cable-hammer-curl`
  - `crunch` / `ab-crunch-machine`
  - `glute-bridge` / `single-leg-rdl`
  - `lat-pulldown-machine` / `wide-grip-lat-pulldown` / `neutral-grip-pulldown`
  - `push-up` / `knee-push-up`
  - `romanian-deadlift` / `dumbbell-rdl` / `machine-rdl`

Some groups cross equipment or movement variants. Duplicate bytes are evidence of reuse, not proof of correctness or error; each group remains `NEEDS_REVIEW` until visually adjudicated.

### Medium

- Only 7/181 exercises have an Arabic description and 0/181 have an English description.
- Thirty-eight Arabic instruction sets contain fewer than three steps.
- Only 54/181 records have explicit substitutions; absence must remain visible rather than being presented as reviewed equivalence.
- Two legacy media keys (`low-row-machine`, `machine-row`) resolve to `seated-row-machine`. This is an alias collision to preserve and validate, not silently flatten.

### Confirmed clean checks

- No orphan media mapping.
- No orphan generated-manifest record.
- No referenced media file missing on disk.
- Rights inventory: 274 rows — 250 `CLEARLY-LICENSED`, 24 `IN-HOUSE`, 0 `UNKNOWN`, 0 `RESTRICTED` — reviewed on 2026-07-16. This is rights evidence, not exercise-match approval.

## Package state

- `[EX-1]` audit contract: documented; deterministic baseline fingerprint and canonical-key coverage are now executable.
- `[EX-2]` media contract: documented; `data/exercise-production/review-ledger.json` now records all 181 canonical IDs with conservative statuses and evidence digests.
- `[EX-3]` original image production: 37/37 stable jobs planned; all prompts blocked and all outputs `NOT_GENERATED` pending `EX-DEP-MECH-001`.
- `[EX-4]` exact video research: v1 pilot complete for 10 deterministic canonical IDs — 9 first-researcher candidates / 1 honest missing / 0 approved; all candidates require independent review.
- `[EX-5]` product integration: deferred until `EX-DEP-WS-001` closes and the final baseline is revalidated.

## Executable evidence

The committed review ledger is generated only from the four ordered `cc60adf` source-of-truth files named in `DATA-CONTRACT.md`. Its composite `sourceFingerprint` is:

```text
12ce6523dc2f98920b421110b44f49141e937f7dfbccb7f80430e4dd0f682c60
```

The generator records an individual SHA-256 for each source and a SHA-256 plus measured byte count and dimensions for every referenced image asset. It refuses source drift from `cc60adfc0da0f893b101230269d4847d33490429`.

Fresh direct-script results on 2026-08-22:

| Command | Result |
| --- | --- |
| `node scripts/exercise-production/validate-review-ledger.mjs` | PASS — 181 rows; images 0 approved / 144 needs review / 37 missing; videos 0 approved / 181 missing; 6 duplicate-content groups |
| `node scripts/exercise-production/review-ledger-proof.mjs` | PASS — base ledger plus 8/8 named anti-circumvention mutations, including `MEDIA_PATH_SCOPE` |
| `node scripts/exercise-production/build-review-ledger.mjs --check` | PASS — committed ledger matches deterministic generation byte-for-byte |
| `for file in scripts/exercise-production/*.mjs; do node --check "$file"; done` and `git diff --check` | PASS — direct scripts parse; no whitespace errors |
| `node scripts/exercise-production/validate-image-production-jobs.mjs` | PASS — 37/37 ledger `MISSING` IDs; 37 mechanics-blocked; 37 not generated |
| `node scripts/exercise-production/image-production-jobs-proof.mjs` | PASS — 8/8 named mutations reject schema drift, coverage loss, binding drift, invented metadata/mechanics/safety, premature prompts, and fake outputs |
| `node scripts/exercise-production/build-image-production-jobs.mjs --check` | PASS — committed job queue matches ledger-only generation byte-for-byte |
| `node scripts/exercise-production/validate-video-research-pilot.mjs` | PASS — 10 rows; 9 candidates needing independent review / 1 missing / 0 approved |
| `node scripts/exercise-production/video-research-pilot-proof.mjs` | PASS — 8/8 named mutations reject malformed IDs, noncanonical/search URLs, coverage loss, duplicate reuse, bad timestamps, incomplete evidence, and premature approval |
| `node scripts/exercise-production/build-video-research-pilot.mjs --check` | PASS — committed pilot matches deterministic generation byte-for-byte |
| `node scripts/exercise-production/verify-video-research-live.mjs` | PASS — 9/9 candidate watch URLs currently return matching public YouTube title/channel metadata |

The ledger guards are `MEDIA_COVERAGE`, `MEDIA_ORPHAN`, `MEDIA_KEY_MISMATCH`, `IMAGE_APPROVAL_EVIDENCE`, `VIDEO_REFERENCE_EXACT`, `DUPLICATE_CONTENT_PAIR`, `MEDIA_FILE_INTEGRITY`, and `MEDIA_PATH_SCOPE`. `MEDIA_PATH_SCOPE` rejects backslashes, NULs, dot segments, and resolved escapes; start/end assets are confined to `/exercise-images/`, while the existing machine-diagram candidates are separately confined to `/exercise-machine-images/`. The duplicate queue is derived from real asset-pair digests rather than a hand-maintained list; its six groups match the baseline findings above.

`image-production-jobs.json` reads only the committed review ledger. Because that ledger does not contain names, equipment, muscles, movement pattern, or reviewed mechanics, the corresponding job fields remain explicitly null/empty and `metadataStatus=BLOCKED_METADATA_NOT_PRESENT_IN_LEDGER`. No prompt or safety language was inferred from application code or model knowledge.

`video-research-pilot.json` records the exact public watch page and YouTube oEmbed source checked for every candidate. It stores no search-result URL and no downloaded or rehosted media. `plank` remains `MISSING` because the bounded official-source search did not produce an accepted exact standalone match. The nine live matches remain research candidates only and do not modify the 0-approved video truth in `review-ledger.json`.

## Decisions needed

None for this reversible ledger wave. Extending the exercise library remains out of scope until the current 181-row inventory is production-audited, consistent with the locked project decision.
