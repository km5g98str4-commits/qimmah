// 25 rest-period contextual tips, keyed to muscle groups. Short, calm, useful —
// shown on the dark Active-Workout surface during rest. Warm MSA, honesty-safe.
import type { RestTip } from '@/lib/coaching/types'

export const REST_TIPS: RestTip[] = [
  // chest
  { id: 'chest-1', muscles: ['chest'], textAr: 'قبل جولة الصدر التالية، ثبّت لوحي كتفك للخلف لتحمي مفصل الكتف وتركّز الشدّ على الصدر.' },
  { id: 'chest-2', muscles: ['chest'], textAr: 'تنفّس بعمق الآن؛ في الجولة القادمة انزل بالوزن بتحكّم ثم ادفع بقوة.' },
  { id: 'chest-3', muscles: ['chest', 'triceps'], textAr: 'أبقِ رسغيك مستقيمين فوق مرفقيك في تمارين الدفع لتوزيع الحمل بأمان.' },
  // back
  { id: 'back-1', muscles: ['back'], textAr: 'في السحب القادم، ابدأ الحركة من ظهرك بعصر لوحي الكتف لا من راحة يدك.' },
  { id: 'back-2', muscles: ['back'], textAr: 'تجنّب تأرجح جذعك في تمارين الظهر؛ الشدّ النظيف أفضل من الوزن الزائد.' },
  { id: 'back-3', muscles: ['back', 'biceps'], textAr: 'أكمل مدى السحب حتى تشعر بعصر الظهر، ثم تحكّم في العودة ببطء.' },
  // shoulders
  { id: 'shoulders-1', muscles: ['shoulders'], textAr: 'في الرفرفة الجانبية، اقصد المدى النظيف بوزن مناسب بدل الأرجحة بوزن ثقيل.' },
  { id: 'shoulders-2', muscles: ['shoulders'], textAr: 'ثبّت جذعك في الضغط فوق الرأس، ولا تفرط في تقويس أسفل ظهرك.' },
  { id: 'shoulders-3', muscles: ['shoulders', 'triceps'], textAr: 'أكمل الدفع دون قفل المرفق بعنف؛ التحكّم يحمي مفاصلك.' },
  // biceps
  { id: 'biceps-1', muscles: ['biceps'], textAr: 'في تمرين الباي القادم، ثبّت مرفقيك بجانبك وتجنّب دفع الوزن بجسمك.' },
  { id: 'biceps-2', muscles: ['biceps'], textAr: 'اعصر العضلة في الأعلى، ثم أنزل ببطء متحكّم للحفاظ على الشدّ.' },
  // triceps
  { id: 'triceps-1', muscles: ['triceps'], textAr: 'ثبّت مرفقيك في تمرين التراي، وحرّك الساعد فقط للتركيز على العضلة.' },
  { id: 'triceps-2', muscles: ['triceps'], textAr: 'استخدم وزنًا يسمح بمدى كامل نظيف بدل وزن ثقيل يقصّر الحركة.' },
  // quads
  { id: 'quads-1', muscles: ['quads'], textAr: 'في القرفصاء القادمة، ادفع ركبتيك باتجاه أصابع قدميك وحافظ على كعبيك ثابتين.' },
  { id: 'quads-2', muscles: ['quads'], textAr: 'انزل ضمن المدى المريح لمرونتك، وحافظ على صدرك مرفوعًا وظهرك محايدًا.' },
  // hamstrings
  { id: 'hamstrings-1', muscles: ['hamstrings'], textAr: 'في تمارين الفخذ الخلفي، ابدأ بدفع الورك للخلف لا بتقويس الظهر.' },
  { id: 'hamstrings-2', muscles: ['hamstrings', 'glutes'], textAr: 'أبقِ الوزن قريبًا من جسمك في الحركات المفصلية لحماية أسفل ظهرك.' },
  // glutes
  { id: 'glutes-1', muscles: ['glutes'], textAr: 'اعصر عضلات مؤخرتك في نهاية الحركة دون فرط تقويس أسفل ظهرك.' },
  { id: 'glutes-2', muscles: ['glutes', 'quads'], textAr: 'ادفع من كعبيك في تمارين الرجل لإشراك المؤخرة والفخذ معًا.' },
  // calves
  { id: 'calves-1', muscles: ['calves'], textAr: 'في تمرين السمانة، استخدم مدى حركة كاملًا من أسفل نقطة إلى أعلى ثبات.' },
  { id: 'calves-2', muscles: ['calves'], textAr: 'اثبت لحظة في قمّة الانقباض بدل الارتداد السريع لتحسين جودة التكرار.' },
  // core
  { id: 'core-1', muscles: ['core'], textAr: 'في تمارين الجذع، ركّز على شدّ بطنك لا شدّ رقبتك، وتنفّس بثبات.' },
  { id: 'core-2', muscles: ['core'], textAr: 'الجودة والتحكّم في حركة البطن أهمّ من كثرة التكرارات السريعة.' },
  // cardio
  { id: 'cardio-1', muscles: ['cardio'], textAr: 'حافظ على إيقاع تتنفّس فيه بانتظام؛ الثبات أهمّ من الشدّة المفرطة.' },
  { id: 'cardio-2', muscles: ['cardio'], textAr: 'أنهِ الكارديو بتهدئة تدريجية تعيد نبضك لوضعه الطبيعي برفق.' },
]
