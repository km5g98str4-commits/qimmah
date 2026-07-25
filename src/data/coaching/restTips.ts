// 25 rest-period contextual tips, keyed to muscle groups. Short, calm, useful —
// shown on the dark Active-Workout surface during rest. White Saudi dialect
// (docs/content/DIALECT-TONE-GUIDE.md), honesty-safe.
import type { RestTip } from '@/lib/coaching/types'

export const REST_TIPS: RestTip[] = [
  // chest
  { id: 'chest-1', muscles: ['chest'], textAr: 'قبل جولة الصدر الجاية، ثبّت لوحي كتفك ورا عشان تحمي مفصل الكتف ويتركّز الشدّ على الصدر.' },
  { id: 'chest-2', muscles: ['chest'], textAr: 'تنفّس بعمق الحين؛ وفي الجولة الجاية انزل بالوزن بتحكّم وبعدها ادفع بقوة.' },
  { id: 'chest-3', muscles: ['chest', 'triceps'], textAr: 'خلّ رسغيك مستقيمين فوق مرفقيك في تمارين الدفع عشان يتوزّع الحمل بأمان.' },
  // back
  { id: 'back-1', muscles: ['back'], textAr: 'في السحب الجاي، ابدأ الحركة من ظهرك بعصر لوحي الكتف، مو من كف يدك.' },
  { id: 'back-2', muscles: ['back'], textAr: 'لا تهزّ جذعك في تمارين الظهر؛ الشدّ النظيف أفضل من الوزن الزايد.' },
  { id: 'back-3', muscles: ['back', 'biceps'], textAr: 'كمّل مدى السحب لين تحس بعصرة الظهر، وبعدها ارجع ببطء وتحكّم.' },
  // shoulders
  { id: 'shoulders-1', muscles: ['shoulders'], textAr: 'في الرفرفة الجانبية، خلّك على مدى نظيف بوزن مناسب بدل الهزّ بوزن ثقيل.' },
  { id: 'shoulders-2', muscles: ['shoulders'], textAr: 'ثبّت جذعك في الضغط فوق الراس، ولا تبالغ بتقويس أسفل ظهرك.' },
  { id: 'shoulders-3', muscles: ['shoulders', 'triceps'], textAr: 'كمّل الدفع بدون ما تقفل مرفقك بعنف؛ التحكّم يحمي مفاصلك.' },
  // biceps
  { id: 'biceps-1', muscles: ['biceps'], textAr: 'في تمرين الباي الجاي، ثبّت مرفقيك على جنبك ولا تدفع الوزن بجسمك.' },
  { id: 'biceps-2', muscles: ['biceps'], textAr: 'اعصر العضلة فوق، وبعدها انزل ببطء وتحكّم عشان تحافظ على الشدّ.' },
  // triceps
  { id: 'triceps-1', muscles: ['triceps'], textAr: 'ثبّت مرفقيك في تمرين التراي، وحرّك ساعدك بس عشان تركّز على العضلة.' },
  { id: 'triceps-2', muscles: ['triceps'], textAr: 'استخدم وزن يسمح لك بمدى كامل ونظيف بدل وزن ثقيل يقصّر الحركة.' },
  // quads
  { id: 'quads-1', muscles: ['quads'], textAr: 'في القرفصاء الجاية، ادفع ركبتيك باتجاه أصابع رجلك وخلّ كعبيك ثابتين.' },
  { id: 'quads-2', muscles: ['quads'], textAr: 'انزل ضمن المدى المريح لمرونتك، وخلّ صدرك مرفوع وظهرك محايد.' },
  // hamstrings
  { id: 'hamstrings-1', muscles: ['hamstrings'], textAr: 'في تمارين الفخذ الخلفي، ابدأ بدفع وركك ورا، مو بتقويس ظهرك.' },
  { id: 'hamstrings-2', muscles: ['hamstrings', 'glutes'], textAr: 'خلّ الوزن قريب من جسمك في الحركات المفصلية عشان تحمي أسفل ظهرك.' },
  // glutes
  { id: 'glutes-1', muscles: ['glutes'], textAr: 'اعصر عضلات المؤخرة في نهاية الحركة بدون ما تبالغ بتقويس أسفل ظهرك.' },
  { id: 'glutes-2', muscles: ['glutes', 'quads'], textAr: 'ادفع من كعبيك في تمارين الرجل عشان تشتغل المؤخرة والفخذ مع بعض.' },
  // calves
  { id: 'calves-1', muscles: ['calves'], textAr: 'في تمرين السمانة، استخدم مدى حركة كامل من أسفل نقطة لين أعلى ثبات.' },
  { id: 'calves-2', muscles: ['calves'], textAr: 'اثبت لحظة في قمة الانقباض بدل الارتداد السريع عشان تتحسّن جودة التكرار.' },
  // core
  { id: 'core-1', muscles: ['core'], textAr: 'في تمارين الجذع، ركّز على شدّ بطنك مو رقبتك، وتنفّس بثبات.' },
  { id: 'core-2', muscles: ['core'], textAr: 'الجودة والتحكّم في حركة البطن أهم من كثرة التكرارات السريعة.' },
  // cardio
  { id: 'cardio-1', muscles: ['cardio'], textAr: 'خلّك على إيقاع تقدر تتنفّس فيه بانتظام؛ الثبات أهم من الشدّة الزايدة.' },
  { id: 'cardio-2', muscles: ['cardio'], textAr: 'اختم الكارديو بتهدئة تدريجية ترجّع نبضك لوضعه الطبيعي بهدوء.' },
]
