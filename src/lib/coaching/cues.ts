// Exercise-cue lookup with a graceful fallback.
//
// Coverage is enforced by npm run test:coaching (181/181 hard fail). The fallback
// exists only as a runtime safety net — it is unreachable when the generated data
// covers the full catalog (which the proof guarantees).
import { EXERCISE_CUES } from '@/data/coaching/exerciseCues.generated'
import type { ExerciseCue } from './types'

/** A minimal, honest fallback used only if an id has no authored cue (proof forbids this). */
export const FALLBACK_CUE: ExerciseCue = {
  steps: [
    'اضبط وضعيتك بثبات وتحكّم قبل أول تكرار.',
    'حرّك الوزن عبر مدى مريح مع تركيز الشدّ على العضلة المستهدفة.',
    'تنفّس بثبات دون حبس النفس، وتجنّب التأرجح بالجسم.',
    'أكمل العودة ببطء متحكّم، ثم كرّر.',
  ],
  mistakes: ['استخدام الزخم بدل عمل العضلة.', 'اختيار وزن يقصّر مدى الحركة.'],
  safety: 'ابدأ بوزن يسمح بأداء نظيف، وتوقّف واستشر مختصًا عند أي ألم حاد.',
}

/** True when the catalog id has an authored cue. */
export function hasCue(exerciseId: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXERCISE_CUES, exerciseId)
}

/** Returns the authored cue for an exercise id, or the honest fallback. */
export function getCue(exerciseId: string): ExerciseCue {
  return EXERCISE_CUES[exerciseId] ?? FALLBACK_CUE
}

/** All authored cue ids (for coverage checks). */
export function cuedIds(): string[] {
  return Object.keys(EXERCISE_CUES)
}
