// Exercise-cue lookup with a graceful fallback — bilingual.
//
// Coverage is enforced by npm run test:coaching (Arabic, 181/181 hard fail) and by
// npm run test:exercise-production (English parity, 181/181 hard fail). The fallbacks
// exist only as a runtime safety net — they are unreachable when the generated data
// covers the full catalog (which both proofs guarantee).
//
// Honesty note: the English cues are AUTHORED (composed by scripts/coaching/build-cues-en.mjs
// from a curated English fragment library), never machine-inferred from the Arabic. An id with
// no authored English returns the English fallback below, not a translated guess.
import { EXERCISE_CUES } from '@/data/coaching/exerciseCues.generated'
import { EXERCISE_CUES_EN } from '@/data/coaching/exerciseCuesEn.generated'
import type { Lang } from '@/lib/appPreferences'
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

/** English counterpart of FALLBACK_CUE — same safety net, same honesty bound. */
export const FALLBACK_CUE_EN: ExerciseCue = {
  steps: [
    'Set your position steadily and under control before your first rep.',
    'Move the weight through a comfortable range with the tension on the target muscle.',
    'Breathe steadily without holding your breath, and avoid swinging your body.',
    'Come all the way back slowly and under control, then repeat.',
  ],
  mistakes: ['Using momentum instead of the muscle.', 'Picking a weight that shortens your range.'],
  safety: 'Start with a weight you can move cleanly, and stop and see a qualified professional at any sharp pain.',
}

/** True when the catalog id has an authored cue in the given language. */
export function hasCue(exerciseId: string, lang: Lang = 'ar'): boolean {
  const table = lang === 'en' ? EXERCISE_CUES_EN : EXERCISE_CUES
  return Object.prototype.hasOwnProperty.call(table, exerciseId)
}

/**
 * Returns the authored cue for an exercise id in the requested language,
 * or the honest same-language fallback.
 *
 * `lang` defaults to 'ar' so every existing call site keeps its exact behaviour.
 */
export function getCue(exerciseId: string, lang: Lang = 'ar'): ExerciseCue {
  if (lang === 'en') return EXERCISE_CUES_EN[exerciseId] ?? FALLBACK_CUE_EN
  return EXERCISE_CUES[exerciseId] ?? FALLBACK_CUE
}

/** All authored cue ids in the given language (for coverage checks). */
export function cuedIds(lang: Lang = 'ar'): string[] {
  return Object.keys(lang === 'en' ? EXERCISE_CUES_EN : EXERCISE_CUES)
}
