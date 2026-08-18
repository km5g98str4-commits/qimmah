// نقطة الدخول الوحيدة لطبقة المرشد — [SOVEREIGN-COACH-001].
// كل ما تحتها نقيّ وخالٍ من الإطار: لا React ولا DOM ولا شبكة.
export { readCoachEnvironment, buildCoachContext, topWeeklyMuscle } from './context'
export type { CoachContext, CoachEnvironment, CoachSubjectExercise, CoachWeightLog } from './context'
export { buildCoachAnswer } from './rules'
export type { CoachAnswerOptions } from './rules'
export { matchCoachQuestion, normalizeQuery, scoreQuestions } from './intent'
export type { IntentScore } from './intent'
export { renderCoachAnswer } from './render'
export type { NumberFormatter, RenderedAnswer, RenderedLine } from './render'
export {
  COACH_PROVIDERS,
  CoachProviderUnavailableError,
  EXTERNAL_PROVIDER_WIRED,
  externalModelProvider,
  localDeterministicProvider,
  resolveCoachProvider,
} from './provider'
export type { CoachProvider, CoachProviderErrorCode } from './provider'
export { assertAnswerProvenance, verifyAnswerProvenance, CoachProvenanceError } from './provenance'
export type { ProvenanceCode, ProvenanceViolation } from './provenance'
export { collectCopyEntries, findMedicalClaims, findPlanChangeClaims, scanCoachCopy } from './safety'
export type { CopyViolation, CopyViolationCode } from './safety'
export type { CoachEnumTables, CoachStrings } from './strings'
export {
  COACH_LINE_HEDGED,
  COACH_LINE_KEYS,
  COACH_LINE_KIND,
  COACH_QUESTIONS,
  GROUNDING_SOURCES,
  isCoachLineKey,
} from './types'
export type {
  AnswerLine,
  Certainty,
  CoachAnswer,
  CoachAnswerSubject,
  CoachDisclosure,
  CoachEnumTable,
  CoachFact,
  CoachLineKey,
  CoachLineKind,
  CoachProviderId,
  CoachQuestionId,
  GroundingSourceId,
} from './types'
