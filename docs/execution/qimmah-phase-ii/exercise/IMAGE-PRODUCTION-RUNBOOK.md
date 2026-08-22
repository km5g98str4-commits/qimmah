# Exercise Image Production Runbook

## Current state

This runbook prepares a future image-generation wave; it does not authorize or perform generation. The deterministic queue contains 37 jobs and every job is deliberately blocked:

- `promptStatus=BLOCKED_NEEDS_REVIEWED_MECHANICS`
- `outputStatus=NOT_GENERATED`
- `prompt=null`
- all start-position, end-position, and safe-mechanics authoring fields are `null`

No job may advance merely because an exercise has no current image.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-MECH-001` | Image generation must not infer exercise mechanics, equipment, anatomy, or safe form. | None; the blocker is reviewed bilingual mechanics and metadata, not a Web Sovereign artifact. | A versioned authoring artifact tied to the same ledger fingerprint, before any later binding to the accepted media resolver. | Obtain reviewed start/end and safe-mechanics content with reviewer/timestamp, create a new job-schema version, assemble prompts mechanically, run preflight, and generate only the explicitly released batch. |

## Sources and grain

The only current input is `data/exercise-production/review-ledger.json`. One job exists for each canonical ledger row whose image status is `MISSING`; the job key is stable as `exercise-image-v1:<exerciseId>`.

The ledger currently carries media-review data, not exercise names, equipment, muscles, movement pattern, or authored mechanics. Therefore those job metadata fields are explicitly `null` or empty. The queue does not read `src/**`, a historical branch, or Web Sovereign to fill them. Missing metadata is a dependency, not permission to guess.

The queue envelope records:

- the exact ledger SHA-256;
- the ledger baseline commit;
- the ledger `sourceFingerprint`;
- schema and job version;
- derived counts for blocked and non-generated jobs.

## Preconditions for a future prompt-ready version

For each job selected for production, obtain and review:

1. Arabic and English exercise names.
2. Exact equipment and meaningful primary/secondary muscles.
3. Movement pattern.
4. Bilingual start-position description.
5. Bilingual end-position description.
6. Safe-mechanics notes that describe visible form without inventing medical claims.
7. Reviewer identity and ISO-8601 review timestamp.
8. The source fingerprint against which the authoring was reviewed.

If any field is missing or disputed, keep the job blocked and move to another job. Do not infer the missing motion from a similar exercise, an existing duplicate image, a search result, or a model's general knowledge.

Advancing the queue requires a new schema/job version and matching validator update. Editing the current v1 jobs to say `READY` is an integrity failure, not a shortcut.

## Preflight

Run from the repository root:

```bash
node scripts/exercise-production/validate-review-ledger.mjs
node scripts/exercise-production/build-image-production-jobs.mjs --check
node scripts/exercise-production/validate-image-production-jobs.mjs
node scripts/exercise-production/image-production-jobs-proof.mjs
```

Stop if the ledger SHA, source fingerprint, 37/37 coverage, blocked mechanics, or output state differs. A changed baseline requires a reviewed regeneration package, not a manual count update.

## Future generation batch protocol

Once `EX-DEP-MECH-001` is closed for a reviewed subset:

1. Freeze the exact job-file SHA and select explicit job IDs.
2. Assemble prompts only from reviewed fields; retain the prompt text, model/tool version, seed, and job version.
3. Use a consistent neutral studio, crop, aspect ratio, and visual language; prohibit logos, watermarks, unsafe joint positions, wrong equipment, reversed motion, and misleading overlays.
4. Generate start and end frames as a linked pair. Never substitute a generic fitness image.
5. Store outputs outside the live product path until review completes.
6. Record output digest, dimensions, and byte count before visual review.
7. Review exercise match, equipment match, start/end order, anatomy, movement readability, safe mechanics, duplicate/wrong image risk, and mobile crop.
8. Keep the first post-generation status `NEEDS_REVIEW`. Generation success never sets `APPROVED`.

## Exit evidence

A future batch report must name the baseline commit, ledger and job SHA-256 values, job IDs attempted, tool/model/prompt versions, outputs generated or failed, reviewer results, rejected assets, and rollback checkpoint. Product integration remains a separate authorized package after review.
