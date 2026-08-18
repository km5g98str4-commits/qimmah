// نصوص سؤال الأدوات — «وش متوفر عندك؟».
//
// ═══ لماذا سؤال جديد أصلًا؟ ═══
// المكان كان المصدر الوحيد للأدوات: «منزل» تعني ضمنًا **«أملك بارًا ومقعدًا
// ودمبلات ومطاطًا»** (`equipmentAccess.ts:40`). ومن قاس وجد أن ٤٠٢ من ١١٩٧
// خانة في خطط المنزل — **٣٣٫٦٪** — تطلب بارًا أو مقعدًا قد لا يملكه أحد.
// فمن عنده مطّاط وسجّادة يُسلَّم برنامج بار.
//
// المكان يبقى **سياقًا** (يقود الافتراضات الأولى وصياغة الخطة)، والأداة تصير
// **الحاكمة**. والنبرة (§6) عامية بيضاء: سؤال واحد قصير، بلا لوم على من لا
// يملك شيئًا — «وزن الجسم» خيار كامل لا خيار العاجز.

import type { Lang } from '@/lib/appPreferences'
import type { Equipment } from '@/types/profile'

export interface OnboardingEquipmentStrings {
  /** السؤال كما يراه المستخدم. */
  question: string
  /** يشرح الأثر: الأدوات تختار التمارين فعلًا. */
  note: string
  /** يُقال حين يكون وزن الجسم وحده هو المختار — تأكيد لا اعتذار. */
  bodyweightOnlyNote: string
  /** تسمية كل مفتاح أداة. المفاتيح هي `Equipment` حرفيًا — لا نصّ يُطابَق. */
  labels: Record<Equipment, string>
  /** legend لمجموعة الاختيار (a11y — غير مرئي). */
  legend: string
  /** رسالة التحقق حين لا تُختار أي أداة. */
  validation: string
}

const ar: OnboardingEquipmentStrings = {
  question: 'وش متوفر عندك؟',
  note: 'اختر كل اللي تقدر توصله. نبني تمارينك من هذي بالضبط.',
  bodyweightOnlyNote: 'تمام — نبني لك خطة وزن جسم كاملة، بلا أي أداة.',
  labels: {
    dumbbell: 'دمبل',
    barbell: 'بار',
    bench: 'مقعد',
    machine: 'أجهزة',
    cable: 'كيبل',
    bands: 'مطاط',
    smith: 'سميث',
    pullup_bar: 'عقلة',
    bodyweight: 'وزن الجسم',
  },
  legend: 'الأدوات المتوفرة',
  validation: 'اختر أداة وحدة على الأقل — وزن الجسم يكفي.',
}

const en: OnboardingEquipmentStrings = {
  question: 'What do you have access to?',
  note: 'Pick everything you can get to. We build your exercises from exactly these.',
  bodyweightOnlyNote: 'All good — we build you a full bodyweight plan, no gear needed.',
  labels: {
    dumbbell: 'Dumbbells',
    barbell: 'Barbell',
    bench: 'Bench',
    machine: 'Machines',
    cable: 'Cable',
    bands: 'Bands',
    smith: 'Smith machine',
    pullup_bar: 'Pull-up bar',
    bodyweight: 'Bodyweight',
  },
  legend: 'Available equipment',
  validation: 'Pick at least one — bodyweight alone is enough.',
}

export const onboardingEquipmentStrings: Record<Lang, OnboardingEquipmentStrings> = { ar, en }
