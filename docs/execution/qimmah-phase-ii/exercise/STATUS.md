# Phase II Exercise Production — Status

## Wave

- Package: `EX-DOC-1` — independent contracts and test plan.
- Branch: `h/phase-ii-exercise-production-002`.
- Audited baseline: `origin/main@cc60adfc0da0f893b101230269d4847d33490429`.
- Refreshed: 2026-08-22.
- Scope: documentation only. No product code, catalog data, package manifest, Web Sovereign worktree, merge, or deployment was touched.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `EX-DEP-WS-001` | The final catalog, guidance, media resolver, and exercise-detail seams are not authoritative yet. | Founder-accepted Web Sovereign HEAD plus its canonical exercise/media provenance. | Regenerate the audit and review manifest first; bind approved records only at the accepted media resolver/detail boundary. | Recompute IDs and source fingerprint, review drift, complete outstanding content/media review, run focused counter-proofs and the full gate, then read exact-SHA CI. |

This dependency does not block the contracts in this package. It blocks only the later baseline rebind and any product integration.

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

- `[EX-1]` audit contract: documented; deterministic artifact generator remains a later package.
- `[EX-2]` media contract: documented; canonical JSON manifest remains a later package.
- `[EX-3]` original image production: not started.
- `[EX-4]` exact video research: not started.
- `[EX-5]` product integration: deferred until `EX-DEP-WS-001` closes and the final baseline is revalidated.

## Decisions needed

None for this reversible documentation wave. Extending the exercise library remains out of scope until the current 181-row inventory is production-audited, consistent with the locked project decision.
