# QAE Contracts

Language-neutral contracts for the Qimmah Adaptive Engine. Authorized by [CTO-QAE-001] §17.
**Status: LOCKED by [CTO-QAE-003].** Changes go through Migration, never direct edit (see `Docs/IMPLEMENTATION-ROADMAP.md` §Architecture Lock). Migration log:

| Migration | Authorized by | Change | Golden impact |
|---|---|---|---|
| proposal.schema v0.2.0 | [CTO-QAE-003] (provenance mandate) | `AdaptationProposal` gains required `provenance` object (origin, pipelineStage, engineVersion, ruleManifest, oracleVersion, timestamp, seed) | none — additive; harness re-run verified byte-identical goldens |
| reason-codes v0.1.1 | [CTO-QAE-003] Phase 2 | pipeline codes added (`noCandidateFired`, `preconditionNotMet`, `conflictResolvedByPriority`) | none — additive |

## Conventions

- JSON Schema draft 2020-12. One file per aggregate area under `schemas/`, cross-referenced by `$id`/`$ref`.
- **All quantities are canonical integers** per `Docs/NUMERIC-CONTRACT.md` (grams, mm, kcal, integer steps, basis points, epoch ms, tz-offset minutes). No floats anywhere; scaled integers carry the scale in the field name (`…Bp`, `…Milli`, `…Grams`, `…Mm`, `…Kcal`).
- All enums are **closed**; extending one is a versioned rule-set change.
- Every list is explicitly ordered; the ordering key is documented in the field description.
- Every response embeds the `RuleSetManifest` that produced it.
- `reason-codes.json` is the closed reason-code registry (initial draft set). Domain logic emits codes; hosts map codes to Arabic/English copy — codes are never UI strings.
- Swift portability: string-raw enums, discriminated unions via `kind`, Int64-safe integers.

## Files

| File | Contents |
|---|---|
| `schemas/core.schema.json` | shared enums, Now, ReviewPeriod, Confidence, RuleSetManifest, ReasonTrace |
| `schemas/profile.schema.json` | AthleteProfile, PartialAthleteState, ExperienceModel, AssessmentCompleteness, EvidenceGap |
| `schemas/observations.schema.json` | RawObservation, QualityAssessedSeries, DataQualityReport |
| `schemas/plan.schema.json` | Plan, ExerciseSlot, plan versioning; ExerciseMetadata ([CTO-QAE-001] §8) |
| `schemas/proposal.schema.json` | AdaptationAction, CandidateProposal, AdaptationProposal, SafetyVerdict, ValidDecisionSpace, change classes |
| `schemas/evaluation.schema.json` | engine entry points: assess / selectQuestion / generatePlan / evaluateWeek / checkAction; TrendReport; QuestionDef |
| `schemas/scenario-spec.schema.json` | the Fixtures/spec scenario format incl. expectation source labels |
| `reason-codes.json` | reason-code registry (draft initial set) |
