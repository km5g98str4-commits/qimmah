// كشف التناقض — «لا تخمّن بصمت» (§15 من المواصفة).
//
// كل تناقض هنا **زوج إجابات لا يجتمعان منطقيًا**، لا مجرّد إجابة غريبة. الفرق
// مهم: من قال «مبتدئ» واختار ٦ أيام ليس متناقضًا — طموحًا فقط، ويُعالَج بتأكيد
// لطيف (`c-confirm-high-frequency`). أمّا من قال «ما تمرّنت أبدًا» ثم اختار
// نموذج تدرّج متقدّمًا فقد قال شيئين لا يصحّان معًا.
//
// المخرج علم مشتقّ `derived.conflict_<name>`، وسؤال التوضيح معلَّق عليه في
// `bank/clarify.ts`. فالكشف والعلاج منفصلان: هذا الملف لا يعرف نصًّا ولا سؤالًا.

import type { AnswerValue, PersonalizationState } from './types'

export interface ConflictDef {
  id: string
  /** العلم المكتوب في `derived`. */
  flag: string
  /** سؤال التوضيح المقابل. */
  clarify: string
  detect: (a: Record<string, AnswerValue>) => boolean
}

const has = (v: AnswerValue, x: string): boolean => Array.isArray(v) && (v as string[]).includes(x)

export const CONFLICTS: readonly ConflictDef[] = [
  {
    id: 'level',
    flag: 'conflict_level',
    clarify: 'c-level-mismatch',
    // الاتجاهان معًا: من يقلّل من نفسه ومن يبالغ. أحدهما فقط كان سيصنع تحيّزًا.
    detect: (a) =>
      (a.selfLevel === 'beginner' && (a.programExperience === 'wrote_own' || (a.knowsProgression === 'yes' && a.tracksSets === 'always'))) ||
      (a.selfLevel === 'advanced' && (a.trainedBefore === 'never' || a.trainedBefore === 'tried' || a.totalMonths === 'lt3')),
  },
  {
    id: 'equipment',
    flag: 'conflict_equipment',
    clarify: 'c-equipment-mismatch',
    detect: (a) =>
      (a.trainingStyle === 'machines' && (a.bodyweightOnly === true || (a.place !== 'gym' && a.place !== 'mixed' && !has(a.equipmentList, 'machine')))) ||
      (a.place === 'gym' && a.bodyweightOnly === true),
  },
  {
    id: 'days_split',
    flag: 'conflict_days_split',
    clarify: 'c-days-split-mismatch',
    detect: (a) => {
      const days = Number(a.daysPerWeek)
      if (!Number.isFinite(days)) return false
      if (days <= 3 && (a.splitChoice === 'bro_split' || a.splitChoice === 'push_pull_legs')) return true
      if (days <= 2 && a.frequencyPerMuscle === '3') return true
      return false
    },
  },
  {
    id: 'limitation',
    flag: 'conflict_limitation',
    clarify: 'c-limitation-mismatch',
    // قيد مُعلَن مع تفضيل يناقضه صراحةً — أخطر تناقض لأن السلامة طرفه.
    detect: (a) =>
      (a.shoulderOverhead === 'cannot' && has(a.mainLiftFocus, 'overhead')) ||
      (a.backHinge === 'avoid' && has(a.mainLiftFocus, 'deadlift')) ||
      (a.kneeDepth === 'minimal' && has(a.mainLiftFocus, 'squat')) ||
      (a.impactTolerance === 'none' && has(a.cardioType, 'run')) ||
      (a.standingTolerance === 'seated_only' && has(a.cardioType, 'walk')),
  },
  {
    id: 'progression',
    flag: 'conflict_progression',
    clarify: 'c-progression-mismatch',
    detect: (a) =>
      (a.trainedBefore === 'never' || a.knowsProgression === 'no') &&
      typeof a.progressionStyle === 'string' &&
      a.progressionStyle !== 'auto',
  },
  {
    id: 'goal_pace',
    flag: 'conflict_goal_pace',
    clarify: 'c-goal-pace-mismatch',
    detect: (a) => a.changePace === 'aggressive' && (a.daysPerWeek === '2' || a.sessionMinutes === '20'),
  },
  {
    id: 'time_volume',
    flag: 'conflict_time_volume',
    clarify: 'c-time-volume-mismatch',
    detect: (a) =>
      (a.sessionMinutes === '20' || a.sessionMinutes === '30') &&
      (a.volumePref === 'high' || a.accessoryAppetite === 'lots' || a.weeklySetTarget === '20'),
  },
  {
    id: 'cardio',
    flag: 'conflict_cardio',
    clarify: 'c-cardio-mismatch',
    detect: (a) =>
      a.cardioWilling === 'no' &&
      (Boolean(a.enduranceTarget && a.enduranceTarget !== 'none') || (Array.isArray(a.cardioType) && a.cardioType.length > 0)),
  },
]

export interface DetectedConflict {
  id: string
  flag: string
  clarify: string
}

/** يعيد التناقضات القائمة الآن. نقيّ — لا يكتب في الحالة. */
export function detectConflicts(state: PersonalizationState): DetectedConflict[] {
  return CONFLICTS.filter((c) => c.detect(state.answers)).map(({ id, flag, clarify }) => ({ id, flag, clarify }))
}

/**
 * التناقضات التي **لم يُطرح** لها سؤال توضيح بعد. هذه وحدها تدخل الطابور —
 * تناقض سُئل عنه وأُجيب لا يُعاد سؤاله ولو بقيت الإجابتان الأصليتان كما هما
 * (المستخدم قال كلمته، وإعادة السؤال استجواب لا توضيح).
 */
export function unresolvedConflicts(state: PersonalizationState): DetectedConflict[] {
  const asked = new Set(state.clarifications.map((c) => c.conflictId))
  return detectConflicts(state).filter((c) => !asked.has(c.id))
}
