// 25 rest-period contextual tips, keyed to muscle groups. Short, calm, useful —
// shown on the dark Active-Workout surface during rest. White Saudi dialect
// (docs/content/DIALECT-TONE-GUIDE.md), honesty-safe.
import type { RestTip } from '@/lib/coaching/types'

export const REST_TIPS: RestTip[] = [
  // chest
  {
    id: 'chest-1',
    muscles: ['chest'],
    textAr: 'قبل جولة الصدر الجاية، ثبّت لوحي كتفك ورا عشان تحمي مفصل الكتف ويتركّز الشدّ على الصدر.',
    textEn: 'Before your next chest set, set your shoulder blades back and hold them there. It gives your shoulders a stable base and keeps the work on your chest.',
  },
  {
    id: 'chest-2',
    muscles: ['chest'],
    textAr: 'تنفّس بعمق الحين؛ وفي الجولة الجاية انزل بالوزن بتحكّم وبعدها ادفع بقوة.',
    textEn: 'Breathe deeply now. On the next set, lower the weight under control, then press back up strong.',
  },
  {
    id: 'chest-3',
    muscles: ['chest', 'triceps'],
    textAr: 'خلّ رسغيك مستقيمين فوق مرفقيك في تمارين الدفع عشان يتوزّع الحمل بأمان.',
    textEn: 'On pressing moves, keep your wrists straight and stacked over your elbows so the load sits where it should.',
  },
  // back
  {
    id: 'back-1',
    muscles: ['back'],
    textAr: 'في السحب الجاي، ابدأ الحركة من ظهرك بعصر لوحي الكتف، مو من كف يدك.',
    textEn: 'On the next pull, start the movement from your back by squeezing your shoulder blades together, not by yanking with your hands.',
  },
  {
    id: 'back-2',
    muscles: ['back'],
    textAr: 'لا تهزّ جذعك في تمارين الظهر؛ الشدّ النظيف أفضل من الوزن الزايد.',
    textEn: 'Keep your torso still on back work. A clean, controlled pull beats extra weight.',
  },
  {
    id: 'back-3',
    muscles: ['back', 'biceps'],
    textAr: 'كمّل مدى السحب لين تحس بعصرة الظهر، وبعدها ارجع ببطء وتحكّم.',
    textEn: 'Pull through the full range until you feel your back squeeze, then return slowly and under control.',
  },
  // shoulders
  {
    id: 'shoulders-1',
    muscles: ['shoulders'],
    textAr: 'في الرفرفة الجانبية، خلّك على مدى نظيف بوزن مناسب بدل الهزّ بوزن ثقيل.',
    textEn: 'On lateral raises, pick a weight you can move cleanly through the whole range instead of swinging a heavy one.',
  },
  {
    id: 'shoulders-2',
    muscles: ['shoulders'],
    textAr: 'ثبّت جذعك في الضغط فوق الراس، ولا تبالغ بتقويس أسفل ظهرك.',
    textEn: 'Brace your torso on overhead presses, and do not let your lower back arch too far.',
  },
  {
    id: 'shoulders-3',
    muscles: ['shoulders', 'triceps'],
    textAr: 'كمّل الدفع بدون ما تقفل مرفقك بعنف؛ التحكّم يحمي مفاصلك.',
    textEn: 'Finish the press without snapping your elbows into lockout. Staying in control is easier on your joints.',
  },
  // biceps
  {
    id: 'biceps-1',
    muscles: ['biceps'],
    textAr: 'في تمرين الباي الجاي، ثبّت مرفقيك على جنبك ولا تدفع الوزن بجسمك.',
    textEn: 'On the next curl, keep your elbows tucked at your sides and let your arms do the work, not your body.',
  },
  {
    id: 'biceps-2',
    muscles: ['biceps'],
    textAr: 'اعصر العضلة فوق، وبعدها انزل ببطء وتحكّم عشان تحافظ على الشدّ.',
    textEn: 'Squeeze at the top, then lower slowly and under control to keep the tension on the muscle.',
  },
  // triceps
  {
    id: 'triceps-1',
    muscles: ['triceps'],
    textAr: 'ثبّت مرفقيك في تمرين التراي، وحرّك ساعدك بس عشان تركّز على العضلة.',
    textEn: 'Keep your elbows fixed on triceps work and move only your forearms, so the effort stays on the muscle.',
  },
  {
    id: 'triceps-2',
    muscles: ['triceps'],
    textAr: 'استخدم وزن يسمح لك بمدى كامل ونظيف بدل وزن ثقيل يقصّر الحركة.',
    textEn: 'Use a weight that lets you move through a full, clean range rather than a heavy one that cuts the movement short.',
  },
  // quads
  {
    id: 'quads-1',
    muscles: ['quads'],
    textAr: 'في القرفصاء الجاية، ادفع ركبتيك باتجاه أصابع رجلك وخلّ كعبيك ثابتين.',
    textEn: 'On the next squat, track your knees in line with your toes and keep your heels planted.',
  },
  {
    id: 'quads-2',
    muscles: ['quads'],
    textAr: 'انزل ضمن المدى المريح لمرونتك، وخلّ صدرك مرفوع وظهرك محايد.',
    textEn: 'Go down as far as your mobility allows comfortably, with your chest up and your back neutral.',
  },
  // hamstrings
  {
    id: 'hamstrings-1',
    muscles: ['hamstrings'],
    textAr: 'في تمارين الفخذ الخلفي، ابدأ بدفع وركك ورا، مو بتقويس ظهرك.',
    textEn: 'On hamstring work, start by pushing your hips back, not by bending through your lower back.',
  },
  {
    id: 'hamstrings-2',
    muscles: ['hamstrings', 'glutes'],
    textAr: 'خلّ الوزن قريب من جسمك في الحركات المفصلية عشان تحمي أسفل ظهرك.',
    textEn: 'Keep the weight close to your body on hinge movements. It keeps your lower back in a better position.',
  },
  // glutes
  {
    id: 'glutes-1',
    muscles: ['glutes'],
    textAr: 'اعصر عضلات المؤخرة في نهاية الحركة بدون ما تبالغ بتقويس أسفل ظهرك.',
    textEn: 'Squeeze your glutes at the top of the movement, without arching your lower back too far.',
  },
  {
    id: 'glutes-2',
    muscles: ['glutes', 'quads'],
    textAr: 'ادفع من كعبيك في تمارين الرجل عشان تشتغل المؤخرة والفخذ مع بعض.',
    textEn: 'Drive through your heels on leg work so your glutes and quads share the load.',
  },
  // calves
  {
    id: 'calves-1',
    muscles: ['calves'],
    textAr: 'في تمرين السمانة، استخدم مدى حركة كامل من أسفل نقطة لين أعلى ثبات.',
    textEn: 'On calf raises, use the full range: a full stretch at the bottom, all the way up to a steady hold at the top.',
  },
  {
    id: 'calves-2',
    muscles: ['calves'],
    textAr: 'اثبت لحظة في قمة الانقباض بدل الارتداد السريع عشان تتحسّن جودة التكرار.',
    textEn: 'Pause for a beat at the top instead of bouncing straight back down. It makes every rep count for more.',
  },
  // core
  {
    id: 'core-1',
    muscles: ['core'],
    textAr: 'في تمارين الجذع، ركّز على شدّ بطنك مو رقبتك، وتنفّس بثبات.',
    textEn: 'On core work, focus on bracing your abs rather than straining your neck, and keep your breathing steady.',
  },
  {
    id: 'core-2',
    muscles: ['core'],
    textAr: 'الجودة والتحكّم في حركة البطن أهم من كثرة التكرارات السريعة.',
    textEn: 'With ab work, quality and control matter more than piling on fast reps.',
  },
  // cardio
  {
    id: 'cardio-1',
    muscles: ['cardio'],
    textAr: 'خلّك على إيقاع تقدر تتنفّس فيه بانتظام؛ الثبات أهم من الشدّة الزايدة.',
    textEn: 'Hold a pace where your breathing stays steady. Consistency matters more than pushing the intensity too high.',
  },
  {
    id: 'cardio-2',
    muscles: ['cardio'],
    textAr: 'اختم الكارديو بتهدئة تدريجية ترجّع نبضك لوضعه الطبيعي بهدوء.',
    textEn: 'Finish your cardio with a gradual cool-down so your heart rate comes back down calmly.',
  },
]
