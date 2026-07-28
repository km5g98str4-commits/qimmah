// نصوص صفحة «كيف نحسب أرقامك؟» — شرح علمي مبسّط للحسابات (BMR/TDEE/سعرات/ماكروز/BMI).
// المصدر العربي (خليجي) هو الأصل، والمفاتيح التقنية إنجليزية كما هي شائعة في اللياقة.
// تقديرات تعليمية للتنظيم والمتابعة فقط — لا نصائح طبية.

import type { Lang } from '@/lib/appPreferences'

export interface CalcScreenStrings {
  back: string
  pageTitle: string
  pageSubtitle: string
  intro: string
  needData: string

  // BMR
  bmrTitle: string
  bmrBasis: string
  bmrDesc: string
  bmrResult: string

  // TDEE
  tdeeTitle: string
  tdeeDesc: string
  tdeeTableActivity: string
  tdeeTableMultiplier: string
  tdeeYourPick: string
  tdeeTrainingAdd: string
  tdeeResult: string

  // Calories / goal
  caloriesTitle: string
  caloriesDesc: string
  goalCut: string
  goalMaintain: string
  goalBulk: string
  caloriesResult: string

  // Protein
  proteinTitle: string
  proteinDesc: string
  proteinRationale: string
  proteinResult: string

  // Fat + Carbs
  macrosTitle: string
  fatDesc: string
  carbsDesc: string
  fatLabel: string
  carbsLabel: string

  // BMI
  bmiTitle: string
  bmiDesc: string
  bmiNote: string
  bmiResult: string

  // units
  unitCal: string
  unitCalPerDay: string
  unitGram: string
  unitGramPerDay: string
  unitKg: string

  disclaimer: string
}

const ar: CalcScreenStrings = {
  back: 'رجوع',
  pageTitle: 'كيف نحسب أرقامك؟',
  pageSubtitle: 'كل رقم في خطتك وله معادلة واضحة — نفكّكها لك بأرقامك أنت، خطوة بخطوة.',
  intro:
    'الأرقام اللي تشوفها في خطتك مبنية على معادلات معروفة في علم التغذية والرياضة، وعلى قواعد تقدير عملية من Qimmah. هنا نوريك من وين جت بالضبط، عشان تفهمها وتثق فيها. كلها تقديرات للتنظيم والمتابعة، تعدّلها حسب نتائجك على أرض الواقع.',
  needData:
    'كمّل بيانات جسمك (الوزن والطول والعمر والجنس) في الإعداد عشان نوريك طريقة الحساب بأرقامك الفعلية.',

  bmrTitle: 'معدل الأيض الأساسي (BMR)',
  bmrBasis: 'الأساس: معادلة ميفلين–سانت جيور (Mifflin-St Jeor)',
  bmrDesc:
    'كم سعرة يحرقها جسمك وأنت مرتاح بالكامل طول اليوم — للتنفّس ونبض القلب ووظائف الأعضاء. هذي أدق معادلة شائعة لتقدير BMR.',
  bmrResult: 'معدل أيضك الأساسي',

  tdeeTitle: 'إجمالي صرف الطاقة اليومي (TDEE)',
  tdeeDesc:
    'نضرب BMR في معامل نشاطك اليومي عشان نقدّر سعرات يومك الكامل (حركة + تمرين). المعامل يفصل حركة حياتك اليومية (NEAT) عن التمرين عشان ما نحسب التمرين مرتين.',
  tdeeTableActivity: 'مستوى النشاط',
  tdeeTableMultiplier: 'المعامل',
  tdeeYourPick: 'اختيارك',
  tdeeTrainingAdd: 'نضيف 0.025 لكل يوم تمرين بالأسبوع فوق معامل الحركة (بسقف 1.9).',
  tdeeResult: 'إجمالي صرفك اليومي',

  caloriesTitle: 'سعراتك المستهدفة حسب هدفك',
  caloriesDesc: 'نعدّل TDEE حسب هدفك عشان نوصل لسعراتك اليومية المستهدفة:',
  goalCut: 'تنشيف: ننقص عن سعرات صيانتك عشان تخسر الدهون بثبات.',
  goalMaintain: 'محافظة على العضل: نثبت على سعرات صيانتك (TDEE) بالضبط — بدون عجز ولا فائض.',
  goalBulk: 'تضخيم: نزيد فوق سعرات صيانتك عشان تبني العضل بالتدريج.',
  caloriesResult: 'سعراتك المستهدفة',

  proteinTitle: 'البروتين',
  proteinDesc: 'نحسب البروتين من وزنك: 1.8غ لكل كيلوغرام من وزن الجسم — لكل الأهداف.',
  proteinRationale:
    'الأبحاث الرياضية عادة توصي بـ 1.6–2.2غ/كجم للحفاظ على العضل أو بنائه، واخترنا 1.8غ/كجم كنقطة متوازنة تناسب التنشيف والتضخيم والمحافظة.',
  proteinResult: 'بروتينك اليومي',

  macrosTitle: 'الدهون والكربوهيدرات',
  fatDesc: 'الدهون ~27% من سعراتك المستهدفة (ضمن نطاق الدهون المقبول للبالغين 20–35%)، وكل غرام دهون = 9 سعرات.',
  carbsDesc: 'الكربوهيدرات هي الباقي بعد البروتين والدهون، وكل غرام كارب = 4 سعرات.',
  fatLabel: 'الدهون',
  carbsLabel: 'الكربوهيدرات',

  bmiTitle: 'مؤشر كتلة الجسم (BMI)',
  bmiDesc: 'الوزن (كجم) ÷ مربّع الطول (متر). مؤشر وصفي عام لعلاقة وزنك بطولك.',
  bmiNote:
    'مهم: BMI مؤشر وصفي بس، ما يفرّق بين العضل والدهون وما يحكم على صحتك. رياضي بعضلات كثيرة ممكن يطلع «مرتفع» وهو بصحة ممتازة. خذه كإشارة عامة، مو تشخيص.',
  bmiResult: 'مؤشرك',

  unitCal: 'سعرة',
  unitCalPerDay: 'سعرة / يوم',
  unitGram: 'غرام',
  unitGramPerDay: 'غرام / يوم',
  unitKg: 'كجم',

  disclaimer:
    'كل اللي فوق تقديرات تعليمية تساعدك تنظّم أكلك وتتابع تقدّمك — مو نصيحة طبية ولا تشخيص. راجع مختص لأي قرار صحي.',
}

const en: CalcScreenStrings = {
  back: 'Back',
  pageTitle: 'How we calculate your numbers',
  pageSubtitle: 'Every number in your plan has a clear formula — here it is, worked out with your own data.',
  intro:
    "The numbers in your plan come from well-known nutrition and exercise-science equations, plus Qimmah's practical estimation rules. Here's exactly where each one comes from, so you can understand it and trust it. They're estimates for tracking and organizing — tweak them based on your real-world results.",
  needData:
    "Fill in your body data (weight, height, age, sex) in setup and we'll show the math with your actual numbers.",

  bmrTitle: 'Basal Metabolic Rate (BMR)',
  bmrBasis: 'Basis: the Mifflin-St Jeor equation',
  bmrDesc:
    "How many calories your body burns just resting all day — breathing, heartbeat, keeping your organs running. It's the most accurate of the common BMR estimates.",
  bmrResult: 'Your BMR',

  tdeeTitle: 'Total Daily Energy Expenditure (TDEE)',
  tdeeDesc:
    "We multiply BMR by your daily activity factor to estimate your full-day calories (movement + training). The factor separates everyday movement (NEAT) from training so training doesn't get counted twice.",
  tdeeTableActivity: 'Activity level',
  tdeeTableMultiplier: 'Factor',
  tdeeYourPick: 'Your pick',
  tdeeTrainingAdd: 'We add 0.025 per weekly training day on top of the movement factor (capped at 1.9).',
  tdeeResult: 'Your daily expenditure',

  caloriesTitle: 'Your target calories by goal',
  caloriesDesc: 'We adjust TDEE by your goal to reach your daily target calories:',
  goalCut: 'Cut: below your maintenance to lose fat steadily.',
  goalMaintain: 'Maintain muscle: exactly at your maintenance (TDEE) — no deficit or surplus.',
  goalBulk: 'Bulk: above your maintenance to build muscle gradually.',
  caloriesResult: 'Your target calories',

  proteinTitle: 'Protein',
  proteinDesc: 'We set protein from your weight: 1.8 g per kilogram of bodyweight — for every goal.',
  proteinRationale:
    'Sports research usually recommends 1.6–2.2 g/kg to keep or build muscle; we go with 1.8 g/kg as a balanced middle ground that works for cutting, bulking, and maintenance.',
  proteinResult: 'Your daily protein',

  macrosTitle: 'Fat and carbs',
  fatDesc: 'Fat is ~27% of your target calories (within the adult acceptable range of 20–35%); each gram of fat = 9 calories.',
  carbsDesc: 'Carbs are the remainder after protein and fat; each gram of carbs = 4 calories.',
  fatLabel: 'Fat',
  carbsLabel: 'Carbs',

  bmiTitle: 'Body Mass Index (BMI)',
  bmiDesc: 'Weight (kg) ÷ height squared (m). A general descriptive index of weight relative to height.',
  bmiNote:
    'Heads up: BMI is descriptive only. It can\'t tell muscle from fat, and it\'s not a health verdict. A muscular athlete can read as "high" while being in great health. Treat it as a general signal, not a diagnosis.',
  bmiResult: 'Your BMI',

  unitCal: 'cal',
  unitCalPerDay: 'cal / day',
  unitGram: 'g',
  unitGramPerDay: 'g / day',
  unitKg: 'kg',

  disclaimer:
    'Everything above is an educational estimate to help you organize your eating and track progress — not medical advice or a diagnosis. Talk to a professional for any health decision.',
}

export const calcScreenStrings: Record<Lang, CalcScreenStrings> = { ar, en }
