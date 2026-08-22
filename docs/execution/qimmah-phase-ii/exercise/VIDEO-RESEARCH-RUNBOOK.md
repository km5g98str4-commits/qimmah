# Exercise Video Research Pilot Runbook

## Current state

`EX-4A` is a bounded research pilot, not a production video manifest. It contains a deterministic set of 10 canonical exercises from the audited baseline:

1. `barbell-bench-press`
2. `bodyweight-squat`
3. `burpees`
4. `deadlift`
5. `front-squat`
6. `kettlebell-swing`
7. `overhead-press`
8. `plank`
9. `pull-up`
10. `push-up`

The committed result is 9 `CANDIDATE_NEEDS_INDEPENDENT_REVIEW`, 1 honest `MISSING`, and 0 `APPROVED`. Every candidate is first-researcher evidence only. It must not be copied into the review ledger, product code, or a release manifest before independent review.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-VIDEO-REVIEW-001` | The nine pilot matches were found and verified by one primary researcher, so they are not independent approvals. | None; the blocker is independent human review, not a Web Sovereign artifact. | A versioned review package tied to the pilot SHA/fingerprint, before any later binding to the accepted exercise-detail/media resolver. | Review exact movement, equipment, variation, coaching suitability, and product fit per record; record reviewer/timestamp/verdict; promote only accepted records; retain rejected/missing rows; rerun live availability before integration. |

## Contract and source policy

The versioned artifact is `data/exercise-production/video-research-pilot.json`. It binds the pilot to the exact review-ledger baseline commit and source fingerprint, and records the canonical exercise metadata used to decide whether a title is an exact or near-exact match.

An accepted research candidate must have:

- one canonical baseline `exerciseId`;
- an 11-character YouTube video ID;
- the exact stable watch form `https://www.youtube.com/watch?v=<id>`;
- no search-result URL;
- a public YouTube oEmbed response matching the recorded title and channel;
- an ISO-8601 verification timestamp;
- a bounded confidence note that exposes naming or variation uncertainty;
- `researchStatus=CANDIDATE_NEEDS_INDEPENDENT_REVIEW`.

The artifact records the public watch page and oEmbed endpoint used for verification. It does not reproduce protected instructional content. Videos remain hosted by their publisher: no download, copying, or rehosting is permitted by this runbook.

If a bounded search does not produce an acceptable exact standalone match, record `MISSING`, leave all video fields `null`, retain the search evidence, and continue. Coverage is not a reason to force an uncertain URL. This is why `plank` remains `MISSING` in v1.

## Deterministic validation

Run from the repository root:

```bash
node scripts/exercise-production/validate-review-ledger.mjs
node scripts/exercise-production/build-video-research-pilot.mjs --check
node scripts/exercise-production/validate-video-research-pilot.mjs
node scripts/exercise-production/video-research-pilot-proof.mjs
```

The proof attacks ID format, canonical URL exactness, search-result URLs, pilot coverage, duplicate video reuse, timestamps, evidence coupling, and premature approval. Each mutation must fail through its named validator guard.

## Live availability verification

Network verification is intentionally separate from deterministic generation:

```bash
node scripts/exercise-production/verify-video-research-live.mjs
```

Run it during research, again during independent review, and immediately before any later integration package. A removed, private, region-blocked, retitled, or channel-moved video returns to research; historical success is not permanent availability evidence.

## Independent review workflow

For each of the nine candidates, the second reviewer must watch the exact canonical URL and record:

1. whether the movement matches the canonical exercise ID;
2. whether equipment and meaningful variation match the baseline metadata;
3. whether the full visible motion is instructionally useful and safely presented;
4. whether the title/channel metadata still matches and the URL remains public;
5. an explicit accept or reject verdict with reviewer identity, timestamp, and reason.

The reviewer must pay particular attention to the documented terminology/variation uncertainties for air squat versus bodyweight squat, shoulder press versus overhead press, strict versus kipping pull-up, and the kettlebell-swing variation. Review must occur in a new versioned artifact; do not edit `review-ledger.json` approval fields in place.

## Exit condition

This pilot is complete when its deterministic checks and live URL verification pass and the independent-review dependency remains explicit. Video production integration stays blocked until a later authorized package consumes independently reviewed evidence against the accepted final baseline.
