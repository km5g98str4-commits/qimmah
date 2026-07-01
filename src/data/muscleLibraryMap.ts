import type { Muscle } from 'react-body-highlighter'
import type { MuscleId } from '@/types/muscles'

// جدول ربط: معرّفاتنا التفصيلية (MuscleId) → شرائح مكتبة react-body-highlighter (Muscle slug).
// حيث لا يوجد مقابل دقيق، نربط لأقرب عضلة «أم» في المكتبة (تعليقٌ يوضّح ذلك).
// المكتبة تعرض العضلة فقط على الجهة المناسبة (أمامي/خلفي)، فلا حاجة لتصفية يدوية بالجهة.

export const MUSCLE_TO_LIBRARY: Record<MuscleId, Muscle> = {
  // الصدر — المكتبة تملك شريحة واحدة للصدر، فنجمع الطبقات الثلاث عليها.
  chest_upper: 'chest', // لا شريحة علوية مستقلة → أقرب أم: chest
  chest_mid: 'chest',
  chest_lower: 'chest', // لا شريحة سفلية مستقلة → أقرب أم: chest

  // الظهر — لا شريحة «lats» مستقلة؛ أقرب أم هي كتلة الظهر العلوي.
  lats: 'upper-back',
  upper_back: 'upper-back',
  traps: 'trapezius',

  // الأكتاف — المكتبة تفرّق بين أمامي/خلفي فقط؛ الجانبي أقرب للأمامي بصريًا.
  rear_delts: 'back-deltoids',
  front_delts: 'front-deltoids',
  side_delts: 'front-deltoids', // لا شريحة جانبية مستقلة → أقرب أم: front-deltoids

  // الذراع والساعد
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',

  // الجذع
  abs: 'abs',
  obliques: 'obliques',
  lower_back: 'lower-back',

  // الأرجل
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  calves: 'calves',
}

/** كل الشرائح التي تُستخدم فعليًا في التطبيق (لتوثيق التغطية). */
export const USED_LIBRARY_SLUGS: Muscle[] = Array.from(
  new Set(Object.values(MUSCLE_TO_LIBRARY)),
)
