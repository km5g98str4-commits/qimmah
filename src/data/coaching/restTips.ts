// 25 rest-period contextual tips, keyed to muscle groups. Short, calm, useful —
// shown on the dark Active-Workout surface during rest. White Saudi dialect
// (docs/content/DIALECT-TONE-GUIDE.md), honesty-safe.
import type { RestTip } from '@/lib/coaching/types'

export const REST_TIPS: RestTip[] = [
  // chest
  { id: 'chest-1', muscles: ['chest'], textAr: 'قبل جولة الصدر الجاية، ثبّت لوحي كتفك ورا عشان تحمي مفصل الكتف ويتركّز الشدّ على الصدر.', textEn: 'Before your next chest set, draw your shoulder blades back to keep the shoulder stable and load the chest.' },
  { id: 'chest-2', muscles: ['chest'], textAr: 'تنفّس بعمق الحين؛ وفي الجولة الجاية انزل بالوزن بتحكّم وبعدها ادفع بقوة.', textEn: 'Take a deep breath now. On the next set, lower the weight with control, then press firmly.' },
  { id: 'chest-3', muscles: ['chest', 'triceps'], textAr: 'خلّ رسغيك مستقيمين فوق مرفقيك في تمارين الدفع عشان يتوزّع الحمل بأمان.', textEn: 'Keep your wrists straight above your elbows during presses to distribute the load safely.' },
  // back
  { id: 'back-1', muscles: ['back'], textAr: 'في السحب الجاي، ابدأ الحركة من ظهرك بعصر لوحي الكتف، مو من كف يدك.', textEn: 'On your next pull, start from your back by squeezing the shoulder blades instead of pulling with your hands.' },
  { id: 'back-2', muscles: ['back'], textAr: 'لا تهزّ جذعك في تمارين الظهر؛ الشدّ النظيف أفضل من الوزن الزايد.', textEn: 'Avoid swinging your torso on back exercises. A clean contraction beats extra weight.' },
  { id: 'back-3', muscles: ['back', 'biceps'], textAr: 'كمّل مدى السحب لين تحس بعصرة الظهر، وبعدها ارجع ببطء وتحكّم.', textEn: 'Complete the pull until you feel your back contract, then control the return slowly.' },
  // shoulders
  { id: 'shoulders-1', muscles: ['shoulders'], textAr: 'في الرفرفة الجانبية، خلّك على مدى نظيف بوزن مناسب بدل الهزّ بوزن ثقيل.', textEn: 'On lateral raises, use a manageable weight and clean range instead of swinging a heavier load.' },
  { id: 'shoulders-2', muscles: ['shoulders'], textAr: 'ثبّت جذعك في الضغط فوق الراس، ولا تبالغ بتقويس أسفل ظهرك.', textEn: 'Brace your torso during overhead presses and avoid over-arching your lower back.' },
  { id: 'shoulders-3', muscles: ['shoulders', 'triceps'], textAr: 'كمّل الدفع بدون ما تقفل مرفقك بعنف؛ التحكّم يحمي مفاصلك.', textEn: 'Finish the press without snapping your elbows into lockout. Control protects your joints.' },
  // biceps
  { id: 'biceps-1', muscles: ['biceps'], textAr: 'في تمرين الباي الجاي، ثبّت مرفقيك على جنبك ولا تدفع الوزن بجسمك.', textEn: 'On your next curl, keep your elbows by your sides and avoid driving the weight with your body.' },
  { id: 'biceps-2', muscles: ['biceps'], textAr: 'اعصر العضلة فوق، وبعدها انزل ببطء وتحكّم عشان تحافظ على الشدّ.', textEn: 'Squeeze at the top, then lower slowly under control to keep tension on the muscle.' },
  // triceps
  { id: 'triceps-1', muscles: ['triceps'], textAr: 'ثبّت مرفقيك في تمرين التراي، وحرّك ساعدك بس عشان تركّز على العضلة.', textEn: 'Keep your elbows fixed on triceps work and move only the forearm to focus the muscle.' },
  { id: 'triceps-2', muscles: ['triceps'], textAr: 'استخدم وزن يسمح لك بمدى كامل ونظيف بدل وزن ثقيل يقصّر الحركة.', textEn: 'Use a weight that allows a clean full range instead of a heavier load that shortens the movement.' },
  // quads
  { id: 'quads-1', muscles: ['quads'], textAr: 'في القرفصاء الجاية، ادفع ركبتيك باتجاه أصابع رجلك وخلّ كعبيك ثابتين.', textEn: 'On your next squat, track your knees toward your toes and keep your heels planted.' },
  { id: 'quads-2', muscles: ['quads'], textAr: 'انزل ضمن المدى المريح لمرونتك، وخلّ صدرك مرفوع وظهرك محايد.', textEn: 'Descend within a range your mobility supports, keeping your chest up and spine neutral.' },
  // hamstrings
  { id: 'hamstrings-1', muscles: ['hamstrings'], textAr: 'في تمارين الفخذ الخلفي، ابدأ بدفع وركك ورا، مو بتقويس ظهرك.', textEn: 'On hamstring movements, start by pushing your hips back instead of rounding your spine.' },
  { id: 'hamstrings-2', muscles: ['hamstrings', 'glutes'], textAr: 'خلّ الوزن قريب من جسمك في الحركات المفصلية عشان تحمي أسفل ظهرك.', textEn: 'Keep the weight close to your body during hip hinges to reduce stress on your lower back.' },
  // glutes
  { id: 'glutes-1', muscles: ['glutes'], textAr: 'اعصر عضلات المؤخرة في نهاية الحركة بدون ما تبالغ بتقويس أسفل ظهرك.', textEn: 'Squeeze your glutes at the top without over-arching your lower back.' },
  { id: 'glutes-2', muscles: ['glutes', 'quads'], textAr: 'ادفع من كعبيك في تمارين الرجل عشان تشتغل المؤخرة والفخذ مع بعض.', textEn: 'Drive through your heels on leg exercises to engage your glutes and thighs together.' },
  // calves
  { id: 'calves-1', muscles: ['calves'], textAr: 'في تمرين السمانة، استخدم مدى حركة كامل من أسفل نقطة لين أعلى ثبات.', textEn: 'On calf raises, use a full range from the bottom stretch to a stable top position.' },
  { id: 'calves-2', muscles: ['calves'], textAr: 'اثبت لحظة في قمة الانقباض بدل الارتداد السريع عشان تتحسّن جودة التكرار.', textEn: 'Pause briefly at peak contraction instead of bouncing to improve rep quality.' },
  // core
  { id: 'core-1', muscles: ['core'], textAr: 'في تمارين الجذع، ركّز على شدّ بطنك مو رقبتك، وتنفّس بثبات.', textEn: 'During core work, brace your abs rather than pulling with your neck, and keep breathing steadily.' },
  { id: 'core-2', muscles: ['core'], textAr: 'الجودة والتحكّم في حركة البطن أهم من كثرة التكرارات السريعة.', textEn: 'Quality and control on core movements matter more than rushing through extra reps.' },
  // cardio
  { id: 'cardio-1', muscles: ['cardio'], textAr: 'خلّك على إيقاع تقدر تتنفّس فيه بانتظام؛ الثبات أهم من الشدّة الزايدة.', textEn: 'Keep a pace that lets you breathe steadily. Consistency matters more than excessive intensity.' },
  { id: 'cardio-2', muscles: ['cardio'], textAr: 'اختم الكارديو بتهدئة تدريجية ترجّع نبضك لوضعه الطبيعي بهدوء.', textEn: 'Finish cardio with a gradual cooldown that brings your heart rate down smoothly.' },
]
