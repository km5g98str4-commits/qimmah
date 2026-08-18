// مدخل طبقة المرشد — [SOVEREIGN-003]. الواجهة تستورد من هنا وحده.
export { buildCoachContext, readCoachEnvironment, topWeeklyMuscle } from './context'
export type { CoachContext, CoachEnvironment } from './context'
export { buildAnswer, capabilityAnswer } from './rules'
export { renderAnswer } from './render'
export type { LineCertainty, RenderedAnswer, RenderedLine } from './render'
export { assertAnswerProvenance, verifyAnswerProvenance, CoachProvenanceError } from './provenance'
export type { ProvenanceCode, ProvenanceViolation } from './provenance'
export { findMedicalClaims, findModelMarketing, MEDICAL_TERMS, MODEL_MARKETING_TERMS } from './safety'
export type { VocabularyHit } from './safety'
export { COACH_QUESTIONS, COACH_LINE_KEYS, COACH_LINE_HEDGED, GROUNDING_SOURCES } from './types'
export type {
  AnswerLine,
  Certainty,
  CoachAnswer,
  CoachEnumTable,
  CoachFact,
  CoachLineKey,
  CoachQuestionId,
  GroundingSourceId,
} from './types'
