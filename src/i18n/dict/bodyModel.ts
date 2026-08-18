import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'

/**
 * نصوص مجسّم العضلات (ثلاثي الأبعاد + العرض المسطّح).
 *
 * المكوّنان مصدرهما فرع p25 حيث كانت النصوص مكتوبةً داخل JSX مباشرةً — وهو مخالف
 * لقاعدة المشروع «كل نص قابل للتخصيص في config/ أو data/». نُقلت هنا كلها،
 * والدوال تُبنى من قِطع كي تبقى الأرقام خارج النص (لا تسلسل نصوص مترجمة).
 */
export interface BodyModelStrings {
  // زوايا العرض
  angleFront: string
  angleBack: string
  angleSide: string
  angleSideOther: string
  // مبدّل العرض
  modeSolid: string
  modeFlat: string
  // الجنس (لوصف الوصول فقط)
  genderMale: string
  genderFemale: string
  genderNeutral: string
  // حجم العضلة
  muscleLarge: string
  muscleSmall: string
  // تعليقات
  /** «فعّلت {n} من {total} عضلة هذا الأسبوع» */
  activatedSummary: (n: number, total: number) => string
  /** «{muscle} · {sets} من {target} مجموعة هذا الأسبوع» */
  muscleWithSets: (muscle: string, sets: number, target: number) => string
  /** «{muscle} · ما سجّلت لها شيء بعد» */
  muscleNoSets: (muscle: string) => string
  emptyHint: string
  /** «{sets} مجموعة من {target} مستهدفة · {exercises} تمرين مختلف» */
  setsDetail: (sets: number, target: number, exercises: number) => string
  untouchedHint: string
  /** وصف الوصول للرسم المسطّح */
  mapAriaLabel: (gender: string, view: string, trained: number) => string
  cardTitle: string
  /** «هذا الأسبوع · {gender}[ · {angle}]» */
  cardSubtitle: (gender: string, angle: string | null) => string
  building: string
  dragHint: string
  legendTrained: string
  legendUntrained: string
  viewFrontLabel: string
  viewBackLabel: string
}

const ar: BodyModelStrings = {
  angleFront: 'أمامي',
  angleBack: 'خلفي',
  angleSide: 'جانب',
  angleSideOther: 'جانب آخر',
  modeSolid: 'مجسّم',
  modeFlat: 'مسطّح',
  genderMale: 'ذكر',
  genderFemale: 'أنثى',
  genderNeutral: 'محايد',
  muscleLarge: 'عضلة كبيرة',
  muscleSmall: 'عضلة صغيرة',
  // الأرقام عبر المنسّق المركزي — لا أرقام لاتينية داخل جملة عربية (BUG-019).
  activatedSummary: (n, total) => `فعّلت ${formatNumber(n, 'ar')} من ${formatNumber(total, 'ar')} عضلة هذا الأسبوع 💪`,
  muscleWithSets: (muscle, sets, target) => `${muscle} · ${formatNumber(sets, 'ar')} من ${formatNumber(target, 'ar')} مجموعة هذا الأسبوع`,
  muscleNoSets: (muscle) => `${muscle} · ما سجّلت لها شيء بعد`,
  emptyHint: 'ابدأ تمرينك وبتشوف عضلاتك تتلوّن هنا.',
  setsDetail: (sets, target, exercises) => `${formatNumber(sets, 'ar')} مجموعة من ${formatNumber(target, 'ar')} مستهدفة · ${formatNumber(exercises, 'ar')} تمرين مختلف`,
  untouchedHint: 'ما لمستها هذا الأسبوع — أضف لها تمرينًا في خطتك.',
  mapAriaLabel: (gender, view, trained) =>
    `خريطة العضلات — جسم ${gender}، العرض ${view}، فعّلت ${formatNumber(trained, 'ar')} عضلة هذا الأسبوع`,
  cardTitle: 'مجسّم عضلاتك',
  cardSubtitle: (gender, angle) => `هذا الأسبوع · ${gender}${angle ? ` · ${angle}` : ''}`,
  building: 'نبني المجسّم…',
  dragHint: 'اسحب لتدوير الجسم ٣٦٠°',
  legendTrained: 'درّبتها (الأغمق أكثر)',
  legendUntrained: 'لم تُدرَّب',
  viewFrontLabel: 'الأمامي',
  viewBackLabel: 'الخلفي',
}

const en: BodyModelStrings = {
  angleFront: 'Front',
  angleBack: 'Back',
  angleSide: 'Side',
  angleSideOther: 'Other side',
  modeSolid: '3D',
  modeFlat: 'Flat',
  genderMale: 'male',
  genderFemale: 'female',
  genderNeutral: 'neutral',
  muscleLarge: 'Large muscle',
  muscleSmall: 'Small muscle',
  activatedSummary: (n, total) => `You worked ${formatNumber(n, 'en')} of ${formatNumber(total, 'en')} muscles this week 💪`,
  muscleWithSets: (muscle, sets, target) => `${muscle} · ${formatNumber(sets, 'en')} of ${formatNumber(target, 'en')} sets this week`,
  muscleNoSets: (muscle) => `${muscle} · nothing logged yet`,
  emptyHint: 'Start training and your muscles will light up here.',
  setsDetail: (sets, target, exercises) => `${formatNumber(sets, 'en')} of ${formatNumber(target, 'en')} target sets · ${formatNumber(exercises, 'en')} different exercises`,
  untouchedHint: "You haven't trained it this week — add an exercise for it to your plan.",
  mapAriaLabel: (gender, view, trained) =>
    `Muscle map — ${gender} body, ${view} view, ${formatNumber(trained, 'en')} muscles worked this week`,
  cardTitle: 'Your muscle map',
  cardSubtitle: (gender, angle) => `This week · ${gender}${angle ? ` · ${angle}` : ''}`,
  building: 'Building the model…',
  dragHint: 'Drag to rotate the body 360°',
  legendTrained: 'Trained (darker = more)',
  legendUntrained: 'Not trained',
  viewFrontLabel: 'front',
  viewBackLabel: 'back',
}

export const bodyModelStrings: Record<Lang, BodyModelStrings> = { ar, en }
