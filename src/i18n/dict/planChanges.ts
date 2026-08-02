import type { Lang } from '@/lib/appPreferences'
import type { DriverField } from '@/lib/planChanges'

/**
 * قاموس فرق الخطة عند المراجعة — [CTO-65] البند ٤.
 * السجلّ: عامية بيضاء (§6). الشاشة كلها سجلّ واحد، والسبب يُقال بلا تهويل ولا وعد.
 */
export interface PlanChangeStrings {
  /** عنوان كتلة التغييرات. */
  title: string
  /** سطر تحت العنوان — يشرح أن الحفظ لم يقع بعد. */
  subtitle: string
  /** يُعرض حين لا تغييرات إطلاقًا. */
  none: string
  /** فاصل «كان → صار» للقارئ الشاشي. */
  fromTo: (before: string, after: string) => string
  /** بادئة السبب. */
  reasonPrefix: string
  /** السبب حين يقود التغييرَ مدخلٌ في الملف. */
  becauseDriver: (fields: string) => string
  /** السبب حين يكون تحريرًا يدويًا مباشرًا — لا تعليل هندسي مخترَع. */
  manualEdit: string
  /** واصل بين أسماء المدخلات. */
  driverJoin: string
  /** أسماء المدخلات القائدة كما يفهمها المستخدم. */
  driver: Record<DriverField, string>
}

const ar: PlanChangeStrings = {
  title: 'وش بيتغيّر؟',
  subtitle: 'هذي التعديلات ما انحفظت بعد — تقدر ترجع وتغيّرها قبل الحفظ.',
  none: 'ما فيه شي تغيّر. خطتك زي ما هي.',
  fromTo: (before, after) => `كان ${before}، صار ${after}`,
  reasonPrefix: 'السبب:',
  becauseDriver: (fields) => `غيّرنا الرقم لأنك عدّلت ${fields}.`,
  manualEdit: 'عدّلته بنفسك.',
  driverJoin: ' و',
  driver: {
    weightKg: 'وزنك',
    targetWeightKg: 'وزنك المستهدف',
    heightCm: 'طولك',
    age: 'عمرك',
    gender: 'الجنس',
    activityLevel: 'مستوى نشاطك',
    goal: 'هدفك',
    goalType: 'نوع هدفك',
    trainingLevel: 'مستواك بالتمرين',
    trainingDays: 'أيام تمرينك',
  },
}

const en: PlanChangeStrings = {
  title: "What's changing?",
  subtitle: "These edits aren't saved yet — you can go back and change them before saving.",
  none: 'Nothing changed. Your plan stays as it is.',
  fromTo: (before, after) => `was ${before}, now ${after}`,
  reasonPrefix: 'Why:',
  becauseDriver: (fields) => `We changed the number because you edited ${fields}.`,
  manualEdit: 'You edited it yourself.',
  driverJoin: ' and ',
  driver: {
    weightKg: 'your weight',
    targetWeightKg: 'your target weight',
    heightCm: 'your height',
    age: 'your age',
    gender: 'sex',
    activityLevel: 'your activity level',
    goal: 'your goal',
    goalType: 'your goal type',
    trainingLevel: 'your training level',
    trainingDays: 'your training days',
  },
}

export const planChangeStrings: Record<Lang, PlanChangeStrings> = { ar, en }
