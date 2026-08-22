// ═══════════════════════════════════════════════════════════════════════════
//  قاموس مرشد قِمّة — [SOVEREIGN-COACH-001].
//
//  عربية **عامية بيضاء** (سعودية/خليجية دافئة يفهمها كل عربي) وإنجليزية غير
//  رسمية ودودة — §6 من الميثاق. ولا نصّ من هذه النصوص يُكتب صلبًا في مكوّن.
//
//  ═══ مفردتان ممنوعتان بالبنية لا بالمراجعة ═══
//  ① **لا مفردة طبية إطلاقًا** — ولا حتى داخل تنويه نافٍ. ولذلك تنويه الحدود
//     مكتوب «كلامنا عن ملاءمة الحركة والتغذية بس، وأي قرار يخصّ صحّتك مرجعه
//     مختصّ» بدل الصياغة المعتادة: يؤدّي المعنى ولا يفتح ثقب استثناء.
//  ② **لا جملة بصوت التطبيق تدّعي أنه غيّر شيئًا** — المرشد يقرأ ولا يكتب.
//  يمسحهما `scanCoachCopy` على هذا الملف كلّه، ومعه إثبات مضادّ يحقن مخالفة
//  فتسقط باسمها (`medical-claim` · `plan-change-claim`).
//
//  والأرقام هنا **وسائط** لا محارف: `{sets}` · `{days}` — تمرّ من `formatNumber`
//  وقت الرسم فتتبع تفضيل نظام الأرقام. ولذلك تُكتب الأعداد الثابتة في النصّ
//  بالحروف («سبعة أيام») لا بالمحارف الرقمية.
// ═══════════════════════════════════════════════════════════════════════════

import type { Lang } from '@/lib/appPreferences'
import type { CoachEntryStrings, CoachStrings } from '@/lib/coach/strings'

// ── نصوص بطاقة المدخل — كائنان مستقلّان قبل القاموسين الكبيرين ──────────────
//
// السبب: بطاقة «اليوم» تحتاج أربعة نصوص لا ثلاثمئة، والفصل يجعل `coachStrings`
// **غير مشار إليه** من مسار البطاقة فيصير هزّه ممكنًا. **وقيس ولم يُهَزّ**:
// esbuild يبقي القاموس كاملًا (٧٫٤ ك.ب مضغوطة) — وRollup لم يُقَس لأن الشاشة لم
// تُوصَل بعد بـ`App.tsx`. فالفصل بنية صحيحة **لا مكسبًا مُثبَتًا**، ويُقال كذلك
// بدل أن يُكتب رقم لم يُقَس. القياس يُعاد بعد الوصل: `scripts/coach-chunk-measure.mjs`.

const arEntry: CoachEntryStrings = {
  eyebrow: 'المرشد',
  entryTitle: 'مرشد قِمّة',
  entryBody: 'ستة أسئلة يجاوبها من بياناتك أنت — بلا نموذج لغوي وبلا اتصال.',
  entryCta: 'افتح المرشد',
}

const enEntry: CoachEntryStrings = {
  eyebrow: 'Coach',
  entryTitle: 'Qimmah coach',
  entryBody: 'Six questions answered from your own data — no language model, no connection.',
  entryCta: 'Open the coach',
}

export const coachEntryStrings: Record<Lang, CoachEntryStrings> = { ar: arEntry, en: enEntry }

const ar: CoachStrings = {
  ...arEntry,
  title: 'مرشد قِمّة',
  subtitle: 'يجاوب من بياناتك أنت — لا غير.',
  back: 'رجوع',
  disclosureLocal:
    'كل جواب هنا محسوب من بياناتك على جهازك. ما فيه نموذج لغوي ولا اتصال بأي خدمة خارجية — وكل سطر مكتوب تحته مصدره.',
  disclosureExternal: 'هذا الجواب جا من مزوّد خارجي.',
  askLabel: 'اسأل المرشد',
  askPlaceholder: 'مثال: ليش سعراتي هذا الرقم؟',
  askSubmit: 'اسأل',
  noMemoryNote:
    'ما أحفظ أسئلتك ولا أتعلّم منها. كل جواب ينحسب من جديد وقت ما تسأل — فلو تغيّرت بياناتك تغيّر الجواب، ولو ما تغيّرت جاك نفسه.',
  answerBlocked:
    'فيه سطر ما قدرت أربطه بمصدر من بياناتك، وما راح أعرض لك نصف جواب. جرّب سؤال ثاني من القائمة.',
  quickTitle: 'أسئلة جاهزة',
  answerTitle: 'الجواب',
  sourceLabel: 'المصدر',
  unknownLabel: 'اللي ما نعرفه',
  openExercise: 'افتح التمرين',
  reset: 'سؤال ثاني',
  kinds: {
    fact: 'محسوب من بياناتك',
    suggestion: 'اقتراح المرشد',
    note: 'ملاحظة',
  },
  questions: {
    todayPlan: 'وش أسوّي اليوم؟',
    whyThisExercise: 'ليش اخترت لي هذا التمرين؟',
    missedYesterday: 'فاتني أمس — وش الحين؟',
    canSubstitute: 'أقدر أبدّل هذا التمرين؟',
    whyCaloriesChanged: 'ليش سعراتي هذا الرقم؟',
    progressTrend: 'كيف تقدّمي؟',
  },
  lines: {
    'capability.intro': 'ما فهمت سؤالك، وما أبغى أخمّن. هذي الأسئلة اللي أقدر أجاوبها من بياناتك:',
    'capability.item': '{question}',
    'capability.noGuessing': 'أي شي غير هذي ما عندي له جواب صادق — فما راح أخترع لك واحد.',
    'today.noPlan': 'ما عندك خطة محفوظة لين الحين، فما أقدر أقول لك وش تمرين اليوم.',
    'today.rest': 'اليوم راحة في جدولك.',
    'today.restNext': 'أقرب يوم تمرين: {day}، بعد {days} يوم.',
    'today.restNoNext': 'وما لقيت يوم تمرين قادم في جدولك.',
    // «{day}» يأتي باسم يوم الخطة، وقد يبدأ بكلمة «اليوم» («اليوم ٣ · جسم كامل»).
    // فالقالب لا يسبقه بها ثانيةً — «اليوم اليوم ٣» تلعثم قِيس على خطة حقيقية.
    'today.training': '{day} — {exercises} تمارين، {sets} مجموعة.',
    'today.recovery': 'حسب تسجيل تعافيك اليوم، يبدو الأنسب {suggestion} — ثقة تقريبية {confidence}٪.',
    'today.recoveryUnknown': 'ما سجّلت تعافيك اليوم، فما عندي شي أقوله عن جاهزيتك.',
    'today.caloriesLeft': 'باقي لك {remaining} سعرة من هدف {target}.',
    'today.caloriesOver': 'تجاوزت هدفك بـ{over} سعرة (الهدف {target}).',
    'today.caloriesUnknown': 'ما فيه هدف سعرات محفوظ، فما أقدر أقول لك كم باقي.',
    'why.noPlan': 'ما فيه خطة محفوظة أشرح لك اختياراتها.',
    'why.todayDay': 'يومك في الخطة: {day}.',
    'why.trainingDays': 'اخترت {days} أيام تمرين بالأسبوع في الإعداد، والتقسيمة انبنت على هذا الرقم.',
    'why.sessionSize': 'عدد تمارين اليوم {exercises} — مربوط بالوقت اللي حدّدته للجلسة.',
    'why.experienceLoad': 'مستواك المسجّل {level}، وهو اللي يحدّد التكرارات والراحة.',
    'why.experienceLoadFallback':
      'ما فيه مستوى خبرة مسجّل صراحة، فيبدو أنك {level} حسب حقل أقدم — والتكرارات انبنت على هذا.',
    'why.equipmentPool': 'أدواتك المتاحة: {access} — والتمارين مصفّاة عليها.',
    'why.equipmentPoolFallback': 'ما فيه مكان تمرين مسجّل صراحة، فيبدو أنه {access} حسب إعدادك الأقدم.',
    'why.injuryFilterApplied': 'سجّلت إصابة في ملفك، فالحركات اللي تحمّل المنطقة هذي مستبعدة من خطتك ومن البدائل.',
    'why.injuryFilterNone': 'ما فيه إصابة مسجّلة، فما فيه استبعاد على أساسها.',
    'why.volumeTop': 'أكثر عضلة تاخذ حجم بالأسبوع: {muscle} بـ{sets} مجموعة.',
    'why.inactiveAxis': 'محور «{axis}» ما هو موصول بالتوليد لين الآن — نقولها بدل ما ندّعي أنه أثّر.',
    'missed.noSchedule': 'ما فيه جدول أسبوعي محفوظ، فما أقدر أعرف إذا فاتك يوم.',
    'missed.none': 'ما فيه يوم فايت في جدولك.',
    'missed.found': 'فاتك {day} بتاريخ {date}.',
    'missed.yoursToDecide': 'القرار لك: تنقله، تتخطّاه، أو تعيد جدولته. ما يتحرّك شي بروحه.',
    'missed.adherence': 'سجّلت {sessions} جلسة في آخر سبعة أيام.',
    'missed.next': 'أقرب يوم تمرين: {day}، بعد {days} يوم.',
    'missed.nextNone': 'وما لقيت يوم تمرين قادم في جدولك.',
    'sub.noExercise': 'ما فيه تمرين قدّامي أبدّله — لا في يومك ولا في أقرب يوم تمرين.',
    'sub.intro': 'التمرين اللي بين يديك: {exercise}.',
    'sub.option': 'بديل: {exercise}.',
    'sub.noneFound': 'ما لقيت بديل يحافظ على نفس نمط الحركة بأدواتك المتاحة.',
    'sub.injuryWithheld':
      'ما فيه بديل آمن لنفس العضلة مع الإصابة المسجّلة — وأصدق شي أقوله إنه ما فيه، بدل ما أعطيك حركة تحمّل نفس المنطقة.',
    'sub.useWorkoutSheet': 'التبديل نفسه يصير من ورقة التمرين. المرشد يشرح ويقترح وما يعدّل خطتك.',
    'sub.notMedical': 'كلامنا هنا عن ملاءمة الحركة والتغذية بس — وأي قرار يخصّ صحّتك مرجعه مختصّ.',
    'cal.noTarget': 'ما فيه هدف سعرات محفوظ عندك.',
    'cal.current': 'هدفك الحالي {calories} سعرة باليوم.',
    'cal.arithmetic': 'الرقم جا من: أيض أساسي {bmr}، وصرف يومي {tdee}، وهدف {goal}.',
    'cal.manual': 'والرقم هذا معدَّل يدويًا منك — يعني هو اللي يسبق حساب المحرّك.',
    'cal.minorMigrated': 'هدفك تحوّل إلى محافظة بتاريخ {date} لأن عمرك تحت سنّ الثامنة عشرة.',
    'cal.staleProfile': 'بياناتك تغيّرت بعد آخر حساب، فالرقم اللي تشوفه انحسب من ملف أقدم.',
    'cal.weightDrift': 'آخر وزن سجّلته {logged} كجم، وفي ملفك {profile} كجم — والحساب يمشي على وزن الملف.',
    'cal.noLoggedWeight': 'ما فيه وزن مسجّل في القياسات، فما أقدر أقارنه بملفك.',
    'cal.unchangedSince': 'آخر مرّة انحسبت فيها أهدافك: {date}.',
    'cal.updatedUnknown': 'ما فيه تاريخ محفوظ لآخر حساب.',
    'progress.noData': 'ما فيه قياسات ولا جلسات مسجّلة، فما عندي شي أقيس عليه تقدّمك.',
    'progress.weightDelta': 'من أول وزن سجّلته إلى آخر واحد: {delta} كجم خلال {days} يوم، على {points} قياس.',
    'progress.weightSingle': 'عندك قياس وزن واحد بس ({weight} كجم) — ونقطة وحدة ما تصير اتجاه.',
    'progress.weightUnknown': 'ما فيه وزن مسجّل في القياسات.',
    'progress.weightToTarget': 'وزنك المستهدف {target} كجم، والفرق الحالي {gap} كجم.',
    'progress.sessions': 'جلساتك: {sessions} في آخر سبعة أيام، مقابل {prior} في السبعة اللي قبلها.',
    'progress.loadRatio': 'يبدو حملك الحالي حوالي {ratio} ضعف الأسبوع اللي قبله — رقم تقريبي على نافذتين قصيرتين.',
    'progress.loadUnknown': 'ما فيه جلسات كافية أقارن بها أسبوعك بالأسبوع اللي قبله.',
    'progress.notScale': 'الميزان إشارة وحدة. قياساتك والأوزان اللي ترفعها في الجلسات تكمّل الصورة.',
    'suggest.startSession': 'افتح تبويب التمرين وابدأ الجلسة وأنت مرتاح — مب لازم تفتح بأقصى وزن.',
    'suggest.restDay': 'خلّها راحة فعلية: مشي خفيف، وماء، ونوم أطول شوي.',
    'suggest.pickMissedOption': 'افتح جدولك واختر بنفسك: تنقله، تتخطّاه، أو تعيد جدولته.',
    'suggest.logWeight': 'سجّل وزنك في القياسات عشان يصير عندي شي أقيس عليه.',
    'suggest.keepLogging': 'كمّل تسجيل جلساتك وقياساتك — الصورة تتّضح بالتكرار مب بيوم.',
  },
  enums: {
    experienceLevel: {
      beginner: 'ما بدأت بعد',
      novice: 'مبتدئ',
      intermediate: 'متوسّط',
      advanced: 'متقدّم',
    },
    goalType: {
      cutting: 'تنشيف',
      bulking: 'تضخيم',
      maintenance: 'محافظة',
      returning: 'رجوع بعد انقطاع',
      health: 'لياقة عامّة',
      recomposition: 'إعادة تكوين',
    },
    gymAccess: {
      full: 'نادي كامل',
      small: 'نادي صغير',
      home: 'البيت',
      bodyweight: 'وزن الجسم بس',
    },
    recoverySuggestion: {
      proceed: 'تكمّل عادي',
      reduce_volume: 'تقلّل عدد المجموعات',
      reduce_intensity: 'تخفّف الأوزان',
      rest: 'تاخذ راحة اليوم',
    },
    muscle: {
      chest: 'الصدر',
      back: 'الظهر',
      shoulders: 'الأكتاف',
      biceps: 'البايسبس',
      triceps: 'الترايسبس',
      legs: 'الأرجل',
      glutes: 'الجلوت',
      hamstrings: 'خلفية الفخذ',
      quads: 'أمامية الفخذ',
      calves: 'السمانة',
      core: 'وسط الجسم',
      cardio: 'الكارديو',
    },
    planAxis: {
      trainingFocus: 'تركيز التمرين',
      pastPerformance: 'أداؤك السابق',
      muscleFocus: 'العضلة اللي تبي تركّز عليها',
    },
    injuryArea: {
      knee: 'الركبة',
      shoulder: 'الكتف',
      lower_back: 'أسفل الظهر',
      wrist: 'الرسغ',
      elbow: 'المرفق',
      ankle: 'الكاحل',
    },
  },
  sources: {
    'plan.customization': 'إعداداتك وخطتك المحفوظة',
    'plan.rationale': 'شرح مولّد الخطة',
    'workout.daySource': 'يوم التمرين الحالي',
    'workout.calendar': 'جدولك الأسبوعي',
    'workout.history': 'سجلّ جلساتك',
    'nutrition.day': 'اللي سجّلته أكل اليوم',
    'nutrition.targets': 'أهداف التغذية المحسوبة',
    'progress.measurements': 'قياساتك المسجّلة',
    'recovery.engineLog': 'تسجيل تعافيك اليومي',
    'onboarding.profile': 'ملفك من الإعداد',
    'substitution.engine': 'محرّك البدائل',
  },
}

const en: CoachStrings = {
  ...enEntry,
  title: 'Qimmah coach',
  subtitle: 'Answers built from your data — nothing else.',
  back: 'Back',
  disclosureLocal:
    "Every answer here is worked out from your own data on this device. No language model, no outside service — and each line names where it came from.",
  disclosureExternal: 'This answer came from an outside provider.',
  askLabel: 'Ask the coach',
  askPlaceholder: 'e.g. Why is my calorie number this?',
  askSubmit: 'Ask',
  noMemoryNote:
    "I don't keep your questions and I don't learn from them. Every answer is worked out fresh the moment you ask — change your data and the answer changes, leave it and you get the same one back.",
  answerBlocked:
    "One line here couldn't be tied back to a source in your data, and I won't show you half an answer. Try another question from the list.",
  quickTitle: 'Ready-made questions',
  answerTitle: 'Answer',
  sourceLabel: 'Source',
  unknownLabel: "What we don't know",
  openExercise: 'Open exercise',
  reset: 'Ask something else',
  kinds: {
    fact: 'Calculated from your data',
    suggestion: 'Coach suggestion',
    note: 'Note',
  },
  questions: {
    todayPlan: 'What should I do today?',
    whyThisExercise: 'Why did you pick this exercise?',
    missedYesterday: 'I missed yesterday — now what?',
    canSubstitute: 'Can I swap this movement?',
    whyCaloriesChanged: 'Why is my calorie number this?',
    progressTrend: "How's my progress?",
  },
  lines: {
    'capability.intro': "I didn't catch that, and I'm not going to guess. Here's what I can answer from your data:",
    'capability.item': '{question}',
    'capability.noGuessing': "Anything outside that list, I don't have an honest answer for — so I won't invent one.",
    'today.noPlan': "You don't have a saved plan yet, so I can't tell you today's session.",
    'today.rest': 'Today is a rest day on your schedule.',
    'today.restNext': 'Your next training day is {day}, {days} day(s) from now.',
    'today.restNoNext': "And I couldn't find an upcoming training day on your schedule.",
    'today.training': '{day} — {exercises} exercises, {sets} sets.',
    'today.recovery':
      "Going by today's recovery check-in, {suggestion} looks like the best fit — roughly {confidence}% confidence.",
    'today.recoveryUnknown': "You haven't logged your recovery today, so I have nothing to say about how ready you are.",
    'today.caloriesLeft': 'You have {remaining} kcal left out of {target}.',
    'today.caloriesOver': "You're {over} kcal past your {target} goal.",
    'today.caloriesUnknown': "There's no saved calorie goal, so I can't tell you what's left.",
    'why.noPlan': "There's no saved plan for me to explain.",
    'why.todayDay': 'Your day in the plan: {day}.',
    'why.trainingDays': 'You picked {days} training days a week during setup, and the split was built around that.',
    'why.sessionSize': 'Today has {exercises} exercises — tied to the session length you set.',
    'why.experienceLoad': 'Your saved level is {level}, and that sets the reps and the rest periods.',
    'why.experienceLoadFallback':
      "There's no explicit experience level saved, so it looks like you're {level} going by an older field — and the reps follow that.",
    'why.equipmentPool': 'What you have access to: {access} — the exercises are filtered to it.',
    'why.equipmentPoolFallback': "There's no explicit training place saved, so it looks like {access} going by your older setting.",
    'why.injuryFilterApplied':
      'You logged an injury in your profile, so movements that load that area are left out of your plan and your options.',
    'why.injuryFilterNone': 'No injury is logged, so nothing is left out on that basis.',
    'why.volumeTop': 'The muscle getting the most weekly volume: {muscle}, at {sets} sets.',
    'why.inactiveAxis': 'The "{axis}" axis is not wired into generation yet — saying so beats claiming it shaped anything.',
    'missed.noSchedule': "There's no weekly schedule saved, so I can't tell whether you missed a day.",
    'missed.none': 'Nothing is missed on your schedule.',
    'missed.found': 'You missed {day} on {date}.',
    'missed.yoursToDecide': "It's your call: move it, skip it, or reschedule it. Nothing shifts on its own.",
    'missed.adherence': 'You logged {sessions} sessions in the last seven days.',
    'missed.next': 'Your next training day is {day}, {days} day(s) from now.',
    'missed.nextNone': "And I couldn't find an upcoming training day on your schedule.",
    'sub.noExercise': "There's no movement in front of me to swap — not today's, not the next day's.",
    'sub.intro': 'The movement in question: {exercise}.',
    'sub.option': 'Alternative: {exercise}.',
    'sub.noneFound': "I couldn't find an alternative that keeps the same movement pattern with what you have access to.",
    'sub.injuryWithheld':
      "There's no safe alternative for the same muscle given the injury you logged — and the honest answer is 'none', not a movement that loads the same area.",
    'sub.useWorkoutSheet': "The swap itself happens on the workout sheet. The coach explains and suggests; it doesn't edit your plan.",
    'sub.notMedical': "This is about movement fit and nutrition only — anything to do with your health belongs with a qualified professional.",
    'cal.noTarget': "You don't have a saved calorie goal.",
    'cal.current': 'Your current goal is {calories} kcal a day.',
    'cal.arithmetic': 'The number comes from: base burn {bmr}, daily burn {tdee}, and a {goal} goal.',
    'cal.manual': 'And you edited this number by hand — so it wins over what the engine works out.',
    'cal.minorMigrated': 'Your goal moved to maintenance on {date} because you are under eighteen.',
    'cal.staleProfile': 'Your details changed after the last calculation, so the number you see was worked out from an older profile.',
    'cal.weightDrift': 'Your last logged weight is {logged} kg and your profile says {profile} kg — the maths runs on the profile one.',
    'cal.noLoggedWeight': "There's no logged weight in your measurements, so I can't compare it with your profile.",
    'cal.unchangedSince': 'Your goals were last worked out on {date}.',
    'cal.updatedUnknown': "There's no saved date for the last calculation.",
    'progress.noData': 'No logged measurements and no logged sessions, so I have nothing to measure your progress against.',
    'progress.weightDelta': 'From your first logged weight to your latest: {delta} kg across {days} days, over {points} entries.',
    'progress.weightSingle': "You have one weight entry only ({weight} kg) — and a single point isn't a trend.",
    'progress.weightUnknown': "There's no logged weight in your measurements.",
    'progress.weightToTarget': 'Your target weight is {target} kg, and the gap right now is {gap} kg.',
    'progress.sessions': 'Sessions: {sessions} in the last seven days, against {prior} in the seven before.',
    'progress.loadRatio': 'Your load looks like roughly {ratio}× the week before — a rough number off two short windows.',
    'progress.loadUnknown': "There aren't enough logged sessions to compare this week with the one before.",
    'progress.notScale': 'The scale is one signal. Your measurements and the loads you log in sessions fill in the rest.',
    'suggest.startSession': "Open the workout tab and ease into the session — you don't have to open at your heaviest.",
    'suggest.restDay': 'Make it a real rest day: an easy walk, water, and a bit more sleep.',
    'suggest.pickMissedOption': 'Open your schedule and pick for yourself: move it, skip it, or reschedule it.',
    'suggest.logWeight': "Log your weight in measurements so there's something to measure against.",
    'suggest.keepLogging': 'Keep logging sessions and measurements — the picture sharpens with repetition, not in a day.',
  },
  enums: {
    experienceLevel: {
      beginner: 'not started yet',
      novice: 'beginner',
      intermediate: 'intermediate',
      advanced: 'advanced',
    },
    goalType: {
      cutting: 'cutting',
      bulking: 'bulking',
      maintenance: 'maintenance',
      returning: 'getting back into it',
      health: 'general fitness',
      recomposition: 'recomposition',
    },
    gymAccess: {
      full: 'a full gym',
      small: 'a small gym',
      home: 'home',
      bodyweight: 'bodyweight only',
    },
    recoverySuggestion: {
      proceed: 'going ahead as planned',
      reduce_volume: 'cutting the number of sets',
      reduce_intensity: 'going lighter',
      rest: 'resting today',
    },
    muscle: {
      chest: 'chest',
      back: 'back',
      shoulders: 'shoulders',
      biceps: 'biceps',
      triceps: 'triceps',
      legs: 'legs',
      glutes: 'glutes',
      hamstrings: 'hamstrings',
      quads: 'quads',
      calves: 'calves',
      core: 'core',
      cardio: 'cardio',
    },
    planAxis: {
      trainingFocus: 'training focus',
      pastPerformance: 'past performance',
      muscleFocus: 'muscle focus',
    },
    injuryArea: {
      knee: 'knee',
      shoulder: 'shoulder',
      lower_back: 'lower back',
      wrist: 'wrist',
      elbow: 'elbow',
      ankle: 'ankle',
    },
  },
  sources: {
    'plan.customization': 'your saved setup and plan',
    'plan.rationale': "the plan generator's own breakdown",
    'workout.daySource': "today's scheduled session",
    'workout.calendar': 'your weekly schedule',
    'workout.history': 'your session history',
    'nutrition.day': 'what you logged as food today',
    'nutrition.targets': 'your calculated nutrition goals',
    'progress.measurements': 'your logged measurements',
    'recovery.engineLog': 'your daily recovery check-in',
    'onboarding.profile': 'your profile from setup',
    'substitution.engine': 'the substitution engine',
  },
}

export const coachStrings: Record<Lang, CoachStrings> = { ar, en }
