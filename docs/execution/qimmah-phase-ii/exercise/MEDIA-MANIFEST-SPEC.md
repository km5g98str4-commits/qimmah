# Canonical Exercise Media Manifest Specification

## Scope

The manifest is keyed by canonical `exerciseId` and contains exactly one entry for every canonical exercise. It is the Phase II review ledger; it does not replace the existing runtime manifest until a later reviewed integration package.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |

Closing this dependency requires regeneration and comparison against the final HEAD before any integration. It does not permit copying unreviewed Web Sovereign media.

## Status vocabulary

```ts
type MediaReviewStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | 'MISSING'
```

- `APPROVED`: required rights, identity, quality, and reviewer evidence is complete.
- `NEEDS_REVIEW`: a candidate exists, but at least one required review is absent or unresolved.
- `REJECTED`: a candidate was examined and failed a named review check; rejection evidence is retained.
- `MISSING`: no candidate exists. Search-result links and unrelated substitutes count as missing, not coverage.

## Envelope and entry

```ts
interface ExerciseMediaManifest {
  schemaVersion: 1
  baselineCommit: string
  sourceFingerprint: string
  exercises: Record<string, ExerciseMediaEntry>
}

interface ExerciseMediaEntry {
  exerciseId: string
  image: ImageCandidate | null
  imageStatus: MediaReviewStatus
  video: VideoCandidate | null
  videoStatus: MediaReviewStatus
  source: { image: string | null; video: string | null }
  reviewedAt: { image: string | null; video: string | null }
  reviewer: { image: string | null; video: string | null }
  notes: string[]
}
```

The object key must equal `exerciseId`. `reviewedAt` uses an ISO-8601 timestamp only after a real review; `null` is required otherwise.

## Image candidate

```ts
interface ImageCandidate {
  kind: 'START_END_COMPOSITE' | 'START_END_PAIR' | 'MACHINE_DIAGRAM'
  version: number
  assets: Array<{
    path: string
    sha256: string
    width: number
    height: number
    bytes: number
  }>
  sourceId: string
  license: string
  rightsEvidence: string
  originalProduction: {
    tool: string | null
    model: string | null
    promptVersion: string | null
    seed: string | null
  } | null
  review: {
    exerciseMatch: boolean | null
    equipmentMatch: boolean | null
    startEndOrder: boolean | null
    anatomy: boolean | null
    movementReadability: boolean | null
    safeMechanics: boolean | null
    duplicateOrWrongImage: boolean | null
    mobileCrop: boolean | null
  }
}
```

An image may be `APPROVED` only when:

- every asset exists and its digest and dimensions match;
- rights are `CLEARLY-LICENSED` or `IN-HOUSE`, with evidence;
- all eight review checks are explicitly `true`;
- reviewer and review timestamp are present;
- the image depicts the exact exercise and equipment;
- a start/end claim has a verified order and readable movement.

A generic machine diagram can support an honest interim UI but is not automatically an approved start/end instruction image.

## Original image production metadata

Each future generation job must retain:

- canonical exercise ID and asset version;
- bilingual exercise name, equipment, movement pattern, primary and secondary muscles;
- reviewed start-position and end-position descriptions;
- visual contract: neutral studio, consistent crop/aspect, realistic anatomy, mobile readability, no logos or misleading overlays;
- negative constraints: impossible joint angles, unsafe mechanics, trademarks, wrong equipment, reversed movement;
- tool/model/prompt version/seed and generated asset digest;
- rights basis and independent review result.

Generation success never sets `APPROVED`. The first post-generation state is `NEEDS_REVIEW`.

## Video candidate

```ts
interface VideoCandidate {
  provider: 'youtube'
  youtubeVideoId: string
  canonicalUrl: string
  channel: string
  videoTitle: string
  exerciseId: string
  matchConfidence: number
  verifiedAt: string
  reviewer: string
  publicAvailability: 'PUBLIC' | 'UNAVAILABLE'
  notes: string
}
```

A video may be `APPROVED` only when:

- an 11-character YouTube video ID and canonical watch URL are stored;
- channel and title are recorded from the actual public page;
- the reviewer confirms exact exercise/equipment match and clear demonstration;
- `verifiedAt`, reviewer, and confidence are present;
- the video is referenced or privacy-respecting click-to-load embedded, never downloaded or rehosted;
- it does not autoplay.

`youtube.com/results?search_query=...` is prohibited in `video`. A search URL is discovery input and the production status remains `MISSING`.

## Audited baseline classification

| Status | Images | Videos |
| --- | ---: | ---: |
| `APPROVED` | 0 | 0 |
| `NEEDS_REVIEW` | 144 | 0 |
| `REJECTED` | 0 | 0 |
| `MISSING` | 37 | 181 |

Rights provenance covers 274 inventory rows: 250 clearly licensed still assets and 24 in-house schematics. This inventory is broader than effective canonical rendering and does not establish per-exercise match.

## Duplicate and orphan policy

- Unknown canonical key: fail as `MEDIA_ORPHAN`.
- Missing canonical row: fail as `MEDIA_COVERAGE`.
- Missing referenced asset: fail as `MEDIA_FILE_INTEGRITY`.
- Same SHA-256 pair used by different canonical exercises: emit `DUPLICATE_CONTENT_PAIR`, force each affected candidate to `NEEDS_REVIEW`, and block approval until adjudicated.
- Alias collision: retain aliases, require one canonical target, and report the collision.
- Unused candidate: report it separately; do not call it approved coverage.

The six duplicate-content groups recorded in `STATUS.md` are the initial review queue. No automatic deduplication or substitution is permitted.
