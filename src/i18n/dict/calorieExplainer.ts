import type { Lang } from '@/lib/appPreferences'

// نصوص «كيف نحسب سعراتك؟» — تُبنى بعض الجُمل بالتركيب مع أرقام المستخدم في المكوّن.
export interface CalorieExplainerStrings {
  toggleTitle: string
  toggleHint: string
  needData: string
  bmrTitle: string
  bmrDesc: string
  calorieUnit: string
  tdeeTitle: string
  tdeeDescPrefix: string
  daysWord: string
  goalTitlePrefix: string
  descCut: string
  descBulk: string
  descMaintain: string
  targetDayUnit: string
  proteinTitle: string
  proteinDescA: string
  proteinDescB: string
  proteinDayUnit: string
  kg: string
  disclaimer: string
}

const ar: CalorieExplainerStrings = {
  toggleTitle: 'كيف نحسب سعراتك؟',
  toggleHint: 'اعرف من وين جت أرقامك خطوة بخطوة',
  needData: 'أكمل بيانات جسمك (الوزن والطول والعمر) في الإعداد حتى نعرض لك طريقة الحساب بأرقامك.',
  bmrTitle: 'سعرات جسمك وأنت مرتاح (BMR)',
  bmrDesc: 'كم يحرق جسمك لو ما تحركت طول اليوم — نحسبها بمعادلة Mifflin-St Jeor من وزنك وطولك وعمرك.',
  calorieUnit: 'سعرة',
  tdeeTitle: 'سعرات يومك كامل (TDEE)',
  tdeeDescPrefix: 'نضرب BMR في معامل حركتك',
  daysWord: 'أيام تمرين',
  goalTitlePrefix: 'تعديل حسب هدفك',
  descCut: 'للتنشيف ننقص ٤٠٠ سعرة عن سعرات يومك لخسارة الدهون بثبات.',
  descBulk: 'للتضخيم نزيد ٣٠٠ سعرة فوق سعرات يومك لبناء العضل تدريجيًا.',
  descMaintain: 'لهدف الثبات نبقى على سعرات يومك بدون زيادة أو نقص.',
  targetDayUnit: 'سعرة / يوم',
  proteinTitle: 'بروتينك اليومي',
  proteinDescA: 'نحسب ',
  proteinDescB: 'غ لكل كيلو من وزنك — ضمن النطاق الموصى به للرياضيين ١٫٦–٢٫٢غ/كجم للحفاظ على العضل.',
  proteinDayUnit: 'غرام / يوم',
  kg: 'كجم',
  disclaimer:
    'هذه تقديرات لتنظيم أكلك ومتابعة تقدّمك فقط، وليست نصيحة طبية. عدّلها حسب إحساسك ونتائجك على أرض الواقع.',
}

const en: CalorieExplainerStrings = {
  toggleTitle: 'How do we calculate your calories?',
  toggleHint: 'See exactly where your numbers come from, step by step',
  needData: 'Complete your body data (weight, height, age) in setup so we can show the calculation with your numbers.',
  bmrTitle: 'Calories at rest (BMR)',
  bmrDesc:
    'How much your body burns if you never moved all day — from the Mifflin-St Jeor equation using your weight, height, and age.',
  calorieUnit: 'kcal',
  tdeeTitle: 'Full-day calories (TDEE)',
  tdeeDescPrefix: 'We multiply BMR by your activity factor',
  daysWord: 'training days',
  goalTitlePrefix: 'Adjusted for your goal',
  descCut: 'For cutting we drop 400 kcal below your daily calories to lose fat steadily.',
  descBulk: 'For bulking we add 300 kcal above your daily calories to build muscle gradually.',
  descMaintain: 'For maintenance we keep your daily calories as they are, no more, no less.',
  targetDayUnit: 'kcal / day',
  proteinTitle: 'Your daily protein',
  proteinDescA: 'We use ',
  proteinDescB:
    ' g per kg of body weight — within the 1.6–2.2 g/kg range recommended for athletes to preserve muscle.',
  proteinDayUnit: 'g / day',
  kg: 'kg',
  disclaimer:
    'These are estimates to organize your eating and track your progress only, not medical advice. Adjust them to how you feel and your real-world results.',
}

export const calorieExplainerStrings: Record<Lang, CalorieExplainerStrings> = { ar, en }
