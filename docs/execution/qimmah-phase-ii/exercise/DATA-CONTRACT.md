# Exercise Production Data Contract

## Purpose and grain

The production audit has exactly one record per canonical exercise ID. The primary key is `exerciseId`; aliases are inputs to canonicalization and never create additional production rows.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |

The contract is baseline-independent. When the dependency closes, the generator must be rerun against the final HEAD; copied Web Sovereign data is not accepted.

## Source-of-truth order

1. `src/data/exercises.ts`: canonical IDs, bilingual names, muscle/equipment fields, difficulty, movement pattern, environment, authored notes, authored guidance fields, and substitutions.
2. `src/lib/exerciseGuidance.ts`: effective guidance shown for a known exercise. Audits must execute this path rather than assume the generic table is used in both languages.
3. `src/data/exerciseMediaManifest.generated.ts`: canonical still-pair status and file metadata.
4. `src/data/machineImages.ts`: in-house machine-diagram candidates.
5. `scripts/media/provenance-manifest.json`: source, rights verdict, digest, and MIME evidence for media assets.

Historical branches are discovery inputs only. On the audited baseline the relevant branch catalogs contain 165, 170, 81, and 181 records respectively; none outranks the current canonical 181-row source.

## Audit envelope

```ts
interface ExerciseProductionAudit {
  schemaVersion: 1
  baseline: {
    commit: string
    sourceFingerprint: string
  }
  generatedAt: string
  grain: 'one-record-per-canonical-exercise-id'
  records: ExerciseProductionRecord[]
}
```

`sourceFingerprint` is a deterministic SHA-256 over the ordered authoritative source files. It changes when the data being audited changes; timestamps do not participate in reproducibility comparisons.

## Record contract

```ts
interface ExerciseProductionRecord {
  exerciseId: string
  aliases: string[]
  name: { ar: string; en: string }
  description: { ar: string | null; en: string | null }
  muscles: {
    primary: string[]
    secondary: string[]
  }
  equipment: string[]
  movementPattern: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  environment: 'gym' | 'home' | 'both'
  instructions: { ar: string[]; en: string[] }
  cues: { ar: string[]; en: string[] }
  commonMistakes: { ar: string[]; en: string[] }
  breathingCue: { ar: string | null; en: string | null }
  existingSafetyNotes: { ar: string[]; en: string[] }
  substitutions: string[]
  imageStatus: MediaReviewStatus
  videoStatus: MediaReviewStatus
  completeness: {
    coreMetadataComplete: boolean
    bilingualUserReadyComplete: boolean
    productionMediaComplete: boolean
    missing: string[]
  }
}
```

`existingSafetyNotes` preserves what the product currently says. It must not be renamed or treated as medical contraindication policy. This package does not invent contraindications or change QAE safety/prescription behavior.

## Completeness rules

### Core structural metadata

Complete only when all are present and valid:

- canonical `exerciseId` and unique key;
- non-empty Arabic and English names;
- at least one primary detailed muscle, except cardio where an empty detailed-muscle set is allowed by the current model;
- non-empty equipment;
- valid movement pattern, difficulty, and environment.

The audited baseline is 181/181 complete by this structural rule.

### Bilingual user-ready content

Complete only when both languages have:

- a clear description;
- 3–7 execution steps;
- 2–5 cues;
- at least one common mistake;
- a breathing cue where authored and relevant;
- equipment and target muscles inherited from the structural record.

Pattern-level fallback text may be reported as fallback coverage, but it is not exercise-specific authored completeness. Empty authored English arrays stay empty in the audit. The audited baseline is therefore 0/181 bilingual user-ready, not 181/181.

### Substitutions

Every substitution ID must resolve to a canonical exercise. Empty is valid-but-incomplete and must remain explicit. An audit may recommend a candidate but may not write or approve an equivalence without product review.

## Key and integrity rules

- `records.length === unique(exerciseId).length`.
- Every manifest key equals its record's `exerciseId`.
- Every alias resolves to exactly one canonical ID.
- Every substitution resolves to a canonical ID and cannot equal its parent ID.
- Every media record joins one-to-one with the canonical exercise dimension.
- Unknown fields are rejected by the future JSON schema to expose drift.
- Counts are derived from records, never copied into a second hand-maintained source.

## Baseline profile

| Dimension | Present | Missing / outside contract |
| --- | ---: | ---: |
| Canonical IDs | 181 | 0 |
| Core structural metadata | 181 | 0 |
| Arabic descriptions | 7 | 174 |
| English descriptions | 0 | 181 |
| Arabic 3–7-step instructions | 143 | 38 |
| English 3–7-step instructions | 0 | 181 |
| Arabic 2–5 cues | 181 | 0 |
| English 2–5 cues | 0 | 181 |
| Arabic common mistakes | 181 | 0 |
| English common mistakes | 0 | 181 |
| Explicit substitutions | 54 | 127 |

These figures describe the audited baseline, not a target and not a frozen threshold. Rebinding must recompute them.
