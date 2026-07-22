// 25 rest-period contextual tips, keyed to muscle groups. Short, calm, useful —
// shown on the dark Active-Workout surface during rest. Warm MSA, honesty-safe.
import type { RestTip } from '@/lib/coaching/types'

export const REST_TIPS: RestTip[] = [
  // chest
  { id: 'chest-1', muscles: ['chest'], textAr: 'قبل جولة الصدر التالية، ثبّت لوحي كتفك للخلف لتحمي مفصل الكتف وتركّز الشدّ على الصدر.', textEn: 'Before your next chest set, draw your shoulder blades back to keep the shoulder stable and load the chest.' },
  { id: 'chest-2', muscles: ['chest'], textAr: 'تنفّس بعمق الآن؛ في الجولة القادمة انزل بالوزن بتحكّم ثم ادفع بقوة.', textEn: 'Take a deep breath now. On the next set, lower the weight with control, then press firmly.' },
  { id: 'chest-3', muscles: ['chest', 'triceps'], textAr: 'أبقِ رسغيك مستقيمين فوق مرفقيك في تمارين الدفع لتوزيع الحمل بأمان.', textEn: 'Keep your wrists straight above your elbows during presses to distribute the load safely.' },
  // back
  { id: 'back-1', muscles: ['back'], textAr: 'في السحب القادم، ابدأ الحركة من ظهرك بعصر لوحي الكتف لا من راحة يدك.', textEn: 'On your next pull, start from your back by squeezing the shoulder blades instead of pulling with your hands.' },
  { id: 'back-2', muscles: ['back'], textAr: 'تجنّب تأرجح جذعك في تمارين الظهر؛ الشدّ النظيف أفضل من الوزن الزائد.', textEn: 'Avoid swinging your torso on back exercises. A clean contraction beats extra weight.' },
  { id: 'back-3', muscles: ['back', 'biceps'], textAr: 'أكمل مدى السحب حتى تشعر بعصر الظهر، ثم تحكّم في العودة ببطء.', textEn: 'Complete the pull until you feel your back contract, then control the return slowly.' },
  // shoulders
  { id: 'shoulders-1', muscles: ['shoulders'], textAr: 'في الرفرفة الجانبية، اقصد المدى النظيف بوزن مناسب بدل الأرجحة بوزن ثقيل.', textEn: 'On lateral raises, use a manageable weight and clean range instead of swinging a heavier load.' },
  { id: 'shoulders-2', muscles: ['shoulders'], textAr: 'ثبّت جذعك في الضغط فوق الرأس، ولا تفرط في تقويس أسفل ظهرك.', textEn: 'Brace your torso during overhead presses and avoid over-arching your lower back.' },
  { id: 'shoulders-3', muscles: ['shoulders', 'triceps'], textAr: 'أكمل الدفع دون قفل المرفق بعنف؛ التحكّم يحمي مفاصلك.', textEn: 'Finish the press without snapping your elbows into lockout. Control protects your joints.' },
  // biceps
  { id: 'biceps-1', muscles: ['biceps'], textAr: 'في تمرين الباي القادم، ثبّت مرفقيك بجانبك وتجنّب دفع الوزن بجسمك.', textEn: 'On your next curl, keep your elbows by your sides and avoid driving the weight with your body.' },
  { id: 'biceps-2', muscles: ['biceps'], textAr: 'اعصر العضلة في الأعلى، ثم أنزل ببطء متحكّم للحفاظ على الشدّ.', textEn: 'Squeeze at the top, then lower slowly under control to keep tension on the muscle.' },
  // triceps
  { id: 'triceps-1', muscles: ['triceps'], textAr: 'ثبّت مرفقيك في تمرين التراي، وحرّك الساعد فقط للتركيز على العضلة.', textEn: 'Keep your elbows fixed on triceps work and move only the forearm to focus the muscle.' },
  { id: 'triceps-2', muscles: ['triceps'], textAr: 'استخدم وزنًا يسمح بمدى كامل نظيف بدل وزن ثقيل يقصّر الحركة.', textEn: 'Use a weight that allows a clean full range instead of a heavier load that shortens the movement.' },
  // quads
  { id: 'quads-1', muscles: ['quads'], textAr: 'في القرفصاء القادمة، ادفع ركبتيك باتجاه أصابع قدميك وحافظ على كعبيك ثابتين.', textEn: 'On your next squat, track your knees toward your toes and keep your heels planted.' },
  { id: 'quads-2', muscles: ['quads'], textAr: 'انزل ضمن المدى المريح لمرونتك، وحافظ على صدرك مرفوعًا وظهرك محايدًا.', textEn: 'Descend within a range your mobility supports, keeping your chest up and spine neutral.' },
  // hamstrings
  { id: 'hamstrings-1', muscles: ['hamstrings'], textAr: 'في تمارين الفخذ الخلفي، ابدأ بدفع الورك للخلف لا بتقويس الظهر.', textEn: 'On hamstring movements, start by pushing your hips back instead of rounding your spine.' },
  { id: 'hamstrings-2', muscles: ['hamstrings', 'glutes'], textAr: 'أبقِ الوزن قريبًا من جسمك في الحركات المفصلية لحماية أسفل ظهرك.', textEn: 'Keep the weight close to your body during hip hinges to reduce stress on your lower back.' },
  // glutes
  { id: 'glutes-1', muscles: ['glutes'], textAr: 'اعصر عضلات مؤخرتك في نهاية الحركة دون فرط تقويس أسفل ظهرك.', textEn: 'Squeeze your glutes at the top without over-arching your lower back.' },
  { id: 'glutes-2', muscles: ['glutes', 'quads'], textAr: 'ادفع من كعبيك في تمارين الرجل لإشراك المؤخرة والفخذ معًا.', textEn: 'Drive through your heels on leg exercises to engage your glutes and thighs together.' },
  // calves
  { id: 'calves-1', muscles: ['calves'], textAr: 'في تمرين السمانة، استخدم مدى حركة كاملًا من أسفل نقطة إلى أعلى ثبات.', textEn: 'On calf raises, use a full range from the bottom stretch to a stable top position.' },
  { id: 'calves-2', muscles: ['calves'], textAr: 'اثبت لحظة في قمّة الانقباض بدل الارتداد السريع لتحسين جودة التكرار.', textEn: 'Pause briefly at peak contraction instead of bouncing to improve rep quality.' },
  // core
  { id: 'core-1', muscles: ['core'], textAr: 'في تمارين الجذع، ركّز على شدّ بطنك لا شدّ رقبتك، وتنفّس بثبات.', textEn: 'During core work, brace your abs rather than pulling with your neck, and keep breathing steadily.' },
  { id: 'core-2', muscles: ['core'], textAr: 'الجودة والتحكّم في حركة البطن أهمّ من كثرة التكرارات السريعة.', textEn: 'Quality and control on core movements matter more than rushing through extra reps.' },
  // cardio
  { id: 'cardio-1', muscles: ['cardio'], textAr: 'حافظ على إيقاع تتنفّس فيه بانتظام؛ الثبات أهمّ من الشدّة المفرطة.', textEn: 'Keep a pace that lets you breathe steadily. Consistency matters more than excessive intensity.' },
  { id: 'cardio-2', muscles: ['cardio'], textAr: 'أنهِ الكارديو بتهدئة تدريجية تعيد نبضك لوضعه الطبيعي برفق.', textEn: 'Finish cardio with a gradual cooldown that brings your heart rate down smoothly.' },
]
