import type { IExerciseData, Muscle } from 'react-body-highlighter'
import type { MuscleCoverage, MuscleId } from '@/types/muscles'

// ============================================================================
// جسر خريطة العضلات → مكتبة react-body-highlighter (MIT).
// نحوّل معرّفاتنا التفصيلية (chest_upper, lats, …) إلى شرائح المكتبة التشريحية،
// ثم نحسب «شدّة» كل شريحة (1–3) لتُلوَّن بتدرّج برتقالي هوية القالب.
// المكتبة نفسها تعرض نموذجًا تشريحيًا مجرّدًا (أمامي/خلفي) — محتشم بطبيعته،
// بلا لباس رمادي ولا رسم يدويّ. غير المُدرّبة تبقى بلون محايد.
// ============================================================================

/**
 * خريطة معرّفاتنا التفصيلية → أقرب شريحة في المكتبة.
 * التفصيلي (صدر علوي/أوسط/سفلي) يُجمَّع إلى الأب الأقرب (chest)،
 * والكتف الجانبي إلى الأمامي (لا شريحة جانبية مستقلة في المكتبة).
 */
export const MUSCLE_SLUG: Record<MuscleId, Muscle> = {
  chest_upper: 'chest',
  chest_mid: 'chest',
  chest_lower: 'chest',
  lats: 'upper-back',
  upper_back: 'upper-back',
  traps: 'trapezius',
  rear_delts: 'back-deltoids',
  front_delts: 'front-deltoids',
  side_delts: 'front-deltoids',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  lower_back: 'lower-back',
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  calves: 'calves',
}

/** تدرّج برتقالي التطبيق: فاتح (شدّة 1) → غامق (شدّة 3). فهرس المصفوفة = التكرار − 1. */
export const HEAT_SCALE = ['#F9B98E', '#F58A4B', '#F26A21']

/** لون النموذج المحايد (عضلة لم تُدرّب) — بيج دافئ يناسب هوية القالب. */
export const BODY_NEUTRAL = '#E7DECF'

/** اسم عربيّ مختصر لكل شريحة مكتبة (لعرضه عند النقر). */
export const SLUG_LABEL_AR: Partial<Record<Muscle, string>> = {
  chest: 'الصدر',
  'upper-back': 'الظهر',
  trapezius: 'الترابيس',
  'back-deltoids': 'الكتف الخلفي',
  'front-deltoids': 'الكتف الأمامي',
  biceps: 'البايسبس',
  triceps: 'الترايسبس',
  forearm: 'الساعد',
  abs: 'البطن',
  obliques: 'جوانب البطن',
  'lower-back': 'أسفل الظهر',
  quadriceps: 'أمامية الفخذ',
  hamstring: 'خلفية الفخذ',
  gluteal: 'المؤخرة',
  calves: 'السمانة',
}

/** درجة الإضاءة (1–3) من تغطية عضلة، أو 0 إن لم تُدرّب هذا الأسبوع. */
export function intensityLevel(c?: MuscleCoverage): number {
  if (!c || c.sets <= 0) return 0
  if (c.intensity >= 0.85) return 3
  if (c.intensity >= 0.45) return 2
  return 1
}

/**
 * يبني بيانات المكتبة من تغطية الأسبوع.
 * يُجمّع كل معرّفاتنا على مستوى الشريحة بأخذ أعلى شدّة (الأب الأقرب يرث الأقوى).
 * التكرار (frequency) = الشدّة 1–3 ليختار لونًا من HEAT_SCALE.
 * صالح للجهتين معًا؛ المكتبة تُلوّن فقط ما يظهر في العرض الحالي.
 */
export function buildBodyData(coverage: Record<string, MuscleCoverage>): IExerciseData[] {
  const bySlug = new Map<Muscle, number>()
  for (const id of Object.keys(MUSCLE_SLUG) as MuscleId[]) {
    const lvl = intensityLevel(coverage[id])
    if (lvl <= 0) continue
    const slug = MUSCLE_SLUG[id]
    bySlug.set(slug, Math.max(bySlug.get(slug) ?? 0, lvl))
  }
  return [...bySlug].map(([slug, freq]) => ({ name: slug, muscles: [slug], frequency: freq }))
}
