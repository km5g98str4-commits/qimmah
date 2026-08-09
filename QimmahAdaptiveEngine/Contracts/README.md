# QAE Contracts

Language-neutral contracts for the Qimmah Adaptive Engine. Authorized by [CTO-QAE-001] §17.
**Status: LOCKED by [CTO-QAE-003].** Changes go through Migration, never direct edit (see `Docs/IMPLEMENTATION-ROADMAP.md` §Architecture Lock). Migration log:

| Migration | Authorized by | Change | Golden impact |
|---|---|---|---|
| proposal.schema v0.2.0 | [CTO-QAE-003] (provenance mandate) | `AdaptationProposal` gains required `provenance` object (origin, pipelineStage, engineVersion, ruleManifest, oracleVersion, timestamp, seed) | none — additive; harness re-run verified byte-identical goldens |
| reason-codes v0.1.1 | [CTO-QAE-003] Phase 2 | pipeline codes added (`noCandidateFired`, `preconditionNotMet`, `conflictResolvedByPriority`) | none — additive |
| proposal.schema v0.3.0 | [CTO-QAE-004] §2 | `DecisionProvenance` gains required `decisionSchemaVersion` (Proposal shape versioned independently of engine) | none — additive; harness re-run verified byte-identical goldens |
| time.ts (additive) | [CTO-QAE-003] Phase 2 | `daysFromCivil` / `localDateToDays` pure helpers for cooldown day math | none — additive |
| predicates (additive) | [CTO-QAE-005] Phase 4 | `exists`/`notExists` ops (legacy answered/unanswered conditions) | none — additive; plan goldens byte-identical |
| normalization (additive) | [CTO-QAE-005] Phase 4 | `text`/`openList` answer types; `copyKey` on QuestionDef; `Selection.budgetOverrideReason` | none — additive |
| content contracts v1 | [CTO-QAE-005] Phase 4 | `Contracts/content/`: question-bank.qae.json (153 active, bankManifestHash), question-inventory.json (193), bank-config.qae.json, profile-evidence-map.json, personas.json | new surface — journey goldens are its conformance suite |
| select normalization | [CTO-QAE-006] §5 | `AnswerNormalizationSpec.select` (min/max) enforced by name (`too_few`/`too_many`); converter carries legacy constraints (4 active questions) — closes a silent widening | plan goldens byte-identical; 12 question goldens change `bankManifestHash` only (bank now carries `select`), every journey step byte-identical |
| profile contract v1.0.0 | [CTO-QAE-006] | `Contracts/profile/athlete-profile-fields.json` + `Domain/Profile/` (AthleteProfile, buildAthleteProfile) — the single normalization boundary; downstream engines never read question ids (proved) | none — new surface; qae-profile-proof (79 checks) is its conformance suite |

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
