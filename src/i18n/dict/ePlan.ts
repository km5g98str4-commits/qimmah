/**
 * قاموس معاينة الخطة (حارة E · المرحلة الثانية).
 *
 * السجلّ: **فصحى دافئة** (الميثاق §6) — لا لوم ولا ضغط ولا تهويل.
 * كل الأرقام هنا **مقيسة** من مخرجات المحرّك، فاللغة حاسمة لا متحفّظة.
 *
 * **قاعدة الترجمة:** هذا القاموس يترجم **مفاتيح المصدر** التي تخرج من
 * `planRationale`/`GeneratedPlan` — لا يخترع قيمًا ولا يحمل منطقًا.
 * أي معرّف جديد يخرج من المحرّك يُضاف هنا بالعربية والإنجليزية معًا.
 */
import type { Lang } from '@/lib/appPreferences'
import type { GoalType } from '@/types/profile'

export interface EPlanStrings {
  previewTitle: string
  previewIntro: string
  /** «{goal} · {days} · {split}» — تُملأ من مفاتيح الخطة. */
  planLabel: string
  daysValue: string
  scheduleHeading: string
  exercisesValue: string
  targetsHeading: string
  calories: string
  caloriesUnit: string
  protein: string
  carbs: string
  fat: string
  gramsUnit: string
  water: string
  litersUnit: string
  notesHeading: string
  emptyPlan: string
  /** أسماء التقسيمات بمعرّف القالب — مفتاح المصدر يُترجم هنا لا في المكوّن. */
  splitTitles: Record<string, string>
  goalLabels: Record<GoalType, string>
}

export const ePlanStrings: Record<Lang, EPlanStrings> = {
  ar: {
    previewTitle: 'معاينة خطتك',
    previewIntro: 'هذه صورة أسبوعك كما بناه المحرّك من إجاباتك. راجعها قبل أن تعتمدها.',
    planLabel: '{goal} · {days} · {split}',
    daysValue: '{n} أيام تدريب',
    scheduleHeading: 'أيام الأسبوع',
    exercisesValue: '{n} تمارين',
    targetsHeading: 'أهدافك اليومية',
    calories: 'السعرات',
    caloriesUnit: 'سعرة',
    protein: 'بروتين',
    carbs: 'كربوهيدرات',
    fat: 'دهون',
    gramsUnit: 'غ',
    water: 'ماء',
    litersUnit: 'لتر',
    notesHeading: 'ملاحظات على خطتك',
    emptyPlan: 'لا توجد أيام تدريب في هذه الخطة بعد.',
    splitTitles: {
      'gen-fullbody': 'جسم كامل',
      'gen-upper-lower-4': 'علوي / سفلي',
      'gen-upper-lower-5': 'علوي / سفلي + يوم مركّز',
      'gen-ppl-6': 'دفع / سحب / أرجل ×٢',
      'gen-ppl-7': 'دفع / سحب / أرجل ×٢ + إضافي',
      'gen-adv-fullbody': 'جسم كامل (اختيارك)',
      'gen-adv-upper-lower': 'علوي / سفلي (اختيارك)',
      'gen-adv-ppl': 'دفع / سحب / أرجل (اختيارك)',
      'gen-adv-arnold': 'تقسيمة أرنولد (اختيارك)',
      'gen-adv-bro': 'عضلة باليوم (اختيارك)',
    },
    goalLabels: {
      cutting: 'تنشيف',
      bulking: 'تضخيم',
      maintenance: 'محافظة',
      returning: 'رجوع بعد انقطاع',
      health: 'صحة عامة',
      recomposition: 'إعادة تكوين',
    },
  },
  en: {
    previewTitle: 'Your plan preview',
    previewIntro: 'This is your week as the engine built it from your answers. Review it before you adopt it.',
    planLabel: '{goal} · {days} · {split}',
    daysValue: '{n} training days',
    scheduleHeading: 'Your week',
    exercisesValue: '{n} exercises',
    targetsHeading: 'Your daily targets',
    calories: 'Calories',
    caloriesUnit: 'kcal',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    gramsUnit: 'g',
    water: 'Water',
    litersUnit: 'L',
    notesHeading: 'Notes on your plan',
    emptyPlan: 'This plan has no training days yet.',
    splitTitles: {
      'gen-fullbody': 'Full Body',
      'gen-upper-lower-4': 'Upper / Lower',
      'gen-upper-lower-5': 'Upper / Lower + Focus day',
      'gen-ppl-6': 'Push / Pull / Legs ×2',
      'gen-ppl-7': 'Push / Pull / Legs ×2 + Extra',
      'gen-adv-fullbody': 'Full Body (your choice)',
      'gen-adv-upper-lower': 'Upper / Lower (your choice)',
      'gen-adv-ppl': 'Push / Pull / Legs (your choice)',
      'gen-adv-arnold': 'Arnold Split (your choice)',
      'gen-adv-bro': 'Bro Split (your choice)',
    },
    goalLabels: {
      cutting: 'Cutting',
      bulking: 'Bulking',
      maintenance: 'Maintenance',
      returning: 'Returning after a break',
      health: 'General health',
      recomposition: 'Recomposition',
    },
  },
}

/** يستبدل `{key}` بقيمته — لا منطق ولا لغة، مجرّد ملء قالب. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
