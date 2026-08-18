// Materialises per-exercise BILINGUAL technique tips for the full catalog into
// src/data/coaching/exerciseTechniqueTips.generated.ts.
//
// ── لماذا هذا الملف موجود ──
// «نصائح تقنية» كانت الكتلة الرابعة الوحيدة في تبويب «عن التمرين» بلا مصدر مؤلَّف:
//   • بالعربية كانت تُحلّ من `TECHNIQUE_BY_PATTERN` — نصّ عامّ حسب نمط الحركة.
//   • بالإنجليزية كانت تُحلّ إلى `[]` لكل تمرينٍ في الكتالوج (١٨١/١٨١)، فيقرأ
//     المستخدم الإنجليزي «English guidance for this exercise is not available yet.»
// الكتل الثلاث الأخرى (الخطوات · الأخطاء · السلامة) لها مصدر مؤلَّف لكل تمرين في
// `EXERCISE_CUES` / `EXERCISE_CUES_EN`؛ هذه الكتلة لا نظير لها في `ExerciseCue`.
//
// ── العقد ──
// اللغتان تُؤلَّفان من **نفس المؤلِّف ونفس المكتبة المقترنة**: كل جذاذة زوج
// `{ ar, en }` مكتوب بيدٍ في نفس السطر، فلا يمكن لواحدة أن تُضاف بلا توأمها،
// ولا واحدة أن تكون ترجمة آلية للأخرى. الاختيار حتمي (hash على المعرّف) فالبناء
// قابل لإعادة الإنتاج بايتًا ببايت.
//
// ── التمييز عن الخطوات ──
// `steps` تصف **كيف تؤدّي** الحركة. هذه الكتلة تصف **كيف تحسّنها**: تفصيلة العدّة،
// وصقل النمط الحركي، ونقطة تركيز للعضلة المستهدفة (أو للعمل أحادي الجانب).
// لا تكرار نصّي بين الاثنتين — يحرسه `npm run test:guidance-coverage`.
//
// النبرة: عامية بيضاء دافئة بالعربية (ميثاق §٦)، وإنجليزية ودودة غير رسمية.
// لا ادّعاءات طبية، ولا وعود نتائج، ولا حشو يملأ عددًا.
// Run: node scripts/coaching/build-technique-tips.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, 'manifest.json'), 'utf8'))

// اختيار حتمي — نفس دالّة التجزئة المستعملة في مؤلِّفَي الـcues، فلا Math.random.
const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const pick = (arr, id, salt) => arr[hash(id + '|' + salt) % arr.length]

// نفس ترتيب العدّة المستعمل في مؤلِّفَي الـcues — الأكثر تخصيصًا أولًا.
const EQUIP_ORDER = ['machine', 'smith', 'cable', 'barbell', 'ez-bar', 'dumbbell', 'kettlebell', 'plate', 'band', 'rope', 'bench', 'bodyweight']
const equipOf = (eq) => EQUIP_ORDER.find((t) => eq.includes(t)) || 'bodyweight'
const isUnilateral = (m) => /single|one-arm|one-leg|split|bulgarian|pistol|step-up|lunge|unilateral|alternating/i.test(m.id + ' ' + m.nameEn)

// ═══ ① تفصيلة العدّة ═══
const EQUIP_TIP = {
  machine: [
    { ar: 'اضبط ارتفاع الكرسي أول شي — لو المفصل ما كان بمحاذاة محور الجهاز، بتحسّ الشدّ بمكان غلط.', en: 'Set the seat height first — if your joint does not line up with the machine’s pivot, you will feel the work in the wrong place.' },
    { ar: 'خلّ ظهرك ملاصق للمسند طول المجموعة، ولا ترفع نفسك عنه عشان تطلّع تكرار زايد.', en: 'Keep your back against the pad for the whole set, and do not peel off it just to squeeze out one more rep.' },
  ],
  smith: [
    { ar: 'حطّ قدمك قدّام البار شوي، عشان المسار الثابت يوافق خطّ حركتك الطبيعي.', en: 'Set your feet slightly forward of the bar so the fixed track lines up with your natural path.' },
    { ar: 'المسار يمسك البار عنك، بس ما يمسك جذعك — شدّ بطنك مثل ما تشدّه بالبار الحرّ بالضبط.', en: 'The track holds the bar, not your torso — brace your core exactly as you would with a free barbell.' },
  ],
  cable: [
    { ar: 'ابتعد خطوة عن البكرة عشان الشدّ يبدأ من أول سنتيمتر ولا يرتخي الكيبل بأي لحظة.', en: 'Stand a step back from the pulley so there is tension from the first inch and the cable never goes slack.' },
    { ar: 'ارتفاع البكرة يغيّر التمرين كلّه — نزّلها أو ارفعها لين تحسّ الشدّ نازل بالمكان اللي تبيه.', en: 'Pulley height changes the whole exercise — move it up or down until the tension lands where you want it.' },
  ],
  barbell: [
    { ar: 'صفّر قبضتك على علامات البار قبل ما ترفع؛ قبضة مايلة تحمّل جهة أكثر من الثانية.', en: 'Line your hands up on the bar’s knurling marks before you lift — an off-centre grip loads one side more than the other.' },
    { ar: 'حاول «تكسر» البار بيدينك وأنت ماسكه — تثبّت كتفك ويشتغل ظهرك من غير ما تفكّر.', en: 'Try to “bend” the bar apart in your hands — it sets your shoulders and switches your back on without thinking about it.' },
  ],
  'ez-bar': [
    { ar: 'زوايا الباراليز موجودة عشان ترتاح رسغك — امسك من الزاوية اللي ما تزعجك، مو من اللي تعوّدت عليها.', en: 'The EZ bar’s bends exist to spare your wrists — grip at whichever angle feels kind, not the one you are used to.' },
    { ar: 'خلّ مرافقك قريبة من جنبك ولا تتركها تطلع للخارج مع كل تكرار.', en: 'Keep your elbows tucked near your sides instead of letting them drift out with every rep.' },
  ],
  dumbbell: [
    { ar: 'الدمبل يكشف الفرق بين جهتك القوية والضعيفة — امشِ على وتيرة الجهة الأضعف.', en: 'Dumbbells expose the gap between your strong and weak side — set the pace with the weaker one.' },
    { ar: 'ثبّت رسغك مستقيم فوق ساعدك؛ الرسغ المايل يسرق الشدّ من العضلة ويوجّهه للمفصل.', en: 'Keep your wrist straight and stacked over your forearm — a bent wrist pulls the tension off the muscle and into the joint.' },
  ],
  kettlebell: [
    { ar: 'المقبض السميك يتعب قبضتك قبل العضلة — أمسكه بقوة من أول تكرار لا من نصّ المجموعة.', en: 'The thick handle tires your grip before the muscle — hold it tight from rep one, not from halfway through.' },
    { ar: 'خلّ الكيتل قريب من جسمك؛ كل ما بعد عنك زاد الحمل على ظهرك بلا فايدة.', en: 'Keep the bell close to you — the further it drifts, the more your lower back pays for nothing.' },
  ],
  plate: [
    { ar: 'أمسك الوزنة من جنبيها بكفّيك وخلّها قريبة من صدرك، لا معلّقة قدّامك.', en: 'Hold the plate by its sides with both palms and keep it close to your chest, not hanging out in front of you.' },
    { ar: 'الوزنة بسيطة والمدى هو اللي يشتغلك — لا تقصّر المدى عشان وزنة أثقل.', en: 'The plate is simple and the range is what works you — do not trade range for a heavier one.' },
  ],
  band: [
    { ar: 'المطاط أثقل ما يكون بنهاية المدى — تحكّم بالرجوع ولا تخلّه يسحبك.', en: 'A band is heaviest at the end of the range — control the way back instead of letting it snap you home.' },
    { ar: 'تأكّد من تثبيت المطاط قبل كل مجموعة؛ انزلاقه وأنت شادّ مزعج وخطر.', en: 'Check the anchor before every set — a band that slips mid-pull is both startling and risky.' },
  ],
  rope: [
    { ar: 'افتح طرفي الحبل عن بعض بنهاية الحركة — انقباض أقوى بلا وزن زايد.', en: 'Spread the two rope ends apart at the end of the movement — a stronger contraction without adding weight.' },
    { ar: 'ثبّت مرافقك على جنبك، وخلّ الحركة كلها من المفصل اللي تدرّبه.', en: 'Pin your elbows to your sides so the movement stays in the joint you are actually training.' },
  ],
  bench: [
    { ar: 'ثبّت قدمك على الأرض من أول تكرار؛ القدم المتحرّكة تضيّع ثباتك بالمجموعة كلها.', en: 'Plant your feet on the floor from rep one — shifting feet cost you stability across the whole set.' },
    { ar: 'زاوية المقعد تغيّر العضلة اللي تقود الحركة — درجة أو درجتين يبيّن فرقها.', en: 'The bench angle changes which muscle leads — a notch or two makes a difference you can feel.' },
  ],
  bodyweight: [
    { ar: 'لو التمرين صعب عليك، غيّر الزاوية أو الارتفاع قبل ما تقصّر مدى الحركة.', en: 'If it is too hard, change the angle or the height before you shorten the range.' },
    { ar: 'وزن جسمك ثابت، فتقدّمك يجي من التحكّم ومن الوقت تحت الشدّ لا من رقم أثقل.', en: 'Your bodyweight is fixed, so progress comes from control and time under tension, not a bigger number.' },
  ],
}

// ═══ ② صقل النمط الحركي ═══
const PATTERN_TIP = {
  push: [
    { ar: 'ازفر مع الدفع واشهق مع النزول — الإيقاع نفسه يثبّت جذعك.', en: 'Exhale as you press and inhale as you lower — the rhythm itself keeps your core braced.' },
    { ar: 'خلّ مرفقك تحت رسغك طول الحركة، ولا تفتحه بزاوية قائمة عن جسمك.', en: 'Keep your elbow under your wrist the whole way, and do not flare it out square from your body.' },
  ],
  pull: [
    { ar: 'فكّر بيدينك كأنها خطّاف بس — الشغل من الظهر مو من القبضة.', en: 'Think of your hands as hooks — the work comes from your back, not your grip.' },
    { ar: 'اسحب مرفقك للخلف وللأسفل، ووقف لحظة عند الانقباض قبل ما ترجع.', en: 'Drive your elbow back and down, and hold for a beat at the squeeze before you return.' },
  ],
  squat: [
    { ar: 'وزّع ثقلك على وسط قدمك — لا على أطراف الأصابع ولا على الكعب وحده.', en: 'Spread your weight across your mid-foot — not out on the toes, not back on the heel alone.' },
    { ar: 'انزل بسرعة تقدر توقف عندها بأي لحظة؛ هذا أصدق مقياس لتحكّمك بالوزن.', en: 'Descend at a speed you could stop at any point — that is the most honest read on your control.' },
  ],
  hinge: [
    { ar: 'الحركة من الورك لا من الظهر: تخيّل إنك تسكّر باب بمؤخرتك.', en: 'The movement happens at your hips, not your back — imagine closing a door with your backside.' },
    { ar: 'خلّ رقبتك على امتداد ظهرك؛ رفع راسك للأعلى يكسر الوضعية من فوق.', en: 'Keep your neck in line with your spine — craning your head up breaks the position from the top down.' },
  ],
  lunge: [
    { ar: 'ثبّت نظرك على نقطة قدّامك؛ التوازن يبدأ من العين قبل الرجل.', en: 'Fix your eyes on one point ahead — balance starts with your gaze before your feet.' },
    { ar: 'خطوة أطول تشغّل الجلوت أكثر، وخطوة أقصر تشغّل مقدّمة الفخذ — اختر حسب هدفك.', en: 'A longer step loads your glutes more, a shorter one loads your quads — pick the one that matches your goal.' },
  ],
  isolation: [
    { ar: 'وقف لحظة عند قمة الانقباض بدل ما ترجع على طول.', en: 'Hold for a beat at peak contraction instead of dropping straight back.' },
    { ar: 'لو احتجت تهزّ جسمك عشان تكمّل التكرار، الوزن أثقل من اللازم.', en: 'If you need to swing your body to finish the rep, the weight is heavier than it should be.' },
  ],
  carry: [
    { ar: 'خلّ كتفك للخلف وصدرك مفتوح؛ أول ما ترتخي الوضعية، خفّف أو وقّف.', en: 'Keep your shoulders back and chest open — the moment the position slips, lighten it or stop.' },
    { ar: 'خطوات قصيرة ثابتة أفضل من خطوات واسعة تهزّك يمين ويسار.', en: 'Short, steady steps beat long strides that rock you side to side.' },
  ],
  core: [
    { ar: 'الجودة مو العدد: عشرة تكرارات بتحكّم أنفع من ثلاثين بسرعة.', en: 'Quality over count — ten controlled reps do more than thirty rushed ones.' },
    { ar: 'لا تشدّ رقبتك بيدك؛ خلّ يدك خفيفة على راسك والشغل كله من البطن.', en: 'Do not pull on your neck — keep your hands light on your head and let your abs do the work.' },
  ],
  cardio: [
    { ar: 'خلّ شدّتك عند حدّ تقدر معه تكمّل جملة قصيرة وأنت تتمرّن.', en: 'Keep the effort at a level where you could still finish a short sentence.' },
    { ar: 'لا تتّكئ بثقلك على المقابض؛ تخفّف الشغل عنك وتتعب ظهرك بالمقابل.', en: 'Do not lean your weight on the handles — it takes work away from you and nags your lower back instead.' },
  ],
  mobility: [
    { ar: 'المدى المريح هو الهدف، والألم الحادّ إشارة وقوف لا تحدّي.', en: 'A comfortable range is the goal — sharp pain is a stop sign, not a challenge.' },
    { ar: 'تنفّس بعمق مع كل ثبات؛ الزفير يرخي العضلة أكثر من أي دفع إضافي.', en: 'Breathe deeply into each hold — the exhale releases the muscle more than any extra push.' },
  ],
}

// ═══ ③ نقطة تركيز للعضلة المستهدفة ═══
const MUSCLE_TIP = {
  chest: { ar: 'خلّ الإحساس بصدرك مو بمقدّمة كتفك — قرّب مرفقك من جسمك شوي وبيتحوّل الشدّ.', en: 'Feel it in your chest rather than your front delt — tuck the elbow in a little and the tension moves.' },
  back: { ar: 'ابدأ كل تكرار بشدّ لوح كتفك، وبعدها اسحب — بهالترتيب بالذات.', en: 'Start every rep by setting your shoulder blade, then pull — in that order specifically.' },
  shoulders: { ar: 'ارفع لين مستوى كتفك تقريبًا؛ أعلى من كذا تبدأ الترابيس تاخذ الشغل.', en: 'Raise to about shoulder height — go higher and your traps start taking the work.' },
  biceps: { ar: 'ثبّت مرفقك مكانه؛ إذا راح قدّام، صار التمرين كتف مو بايسبس.', en: 'Keep your elbow pinned in place — if it drifts forward, you are training shoulders, not biceps.' },
  triceps: { ar: 'خلّ الجزء العلوي من ذراعك ثابت، وخلّ الحركة كلها من المرفق.', en: 'Keep your upper arm still and let the whole movement happen at the elbow.' },
  quads: { ar: 'ركبتك تمشي باتجاه أصابع قدمك، وتجاوزها شوي شيء طبيعي مو غلط.', en: 'Your knee tracks in line with your toes, and travelling a little past them is normal, not a fault.' },
  hamstrings: { ar: 'بتحسّ شدّ خلف فخذك قبل نهاية النزول — هذي علامة إنك بالمدى الصح.', en: 'You will feel a stretch behind your thigh before the bottom — that is the sign you are in the right range.' },
  glutes: { ar: 'اعصر الجلوت ثانية كاملة بالنهاية بدل ما تقوّس ظهرك عشان تكمّل المدى.', en: 'Squeeze your glutes for a full second at the top instead of arching your back to finish the range.' },
  calves: { ar: 'انزل لأقصى مدى مريح قبل ما ترفع؛ السمانة تحتاج المدى كامل عشان تستجيب.', en: 'Drop into a full comfortable stretch before you rise — calves need the whole range to respond.' },
  core: { ar: 'شدّ بطنك كأن أحد بيلكزك بخفّة؛ هذا مستوى الشدّ المطلوب لا أكثر.', en: 'Brace like someone is about to poke you in the stomach — that is the level you want, no more.' },
  cardio: { ar: 'راقب نفسك أكثر من الشاشة؛ إحساسك بالنَّفَس أصدق من رقم الجهاز.', en: 'Watch your breathing more than the screen — how it feels is more honest than the machine’s number.' },
  legs: { ar: 'خلّ رجليك تشتغلان بالتساوي، ولا تعتمد على جهتك القوية بلا ما تنتبه.', en: 'Share the work evenly between both legs instead of quietly leaning on your strong side.' },
}

// ═══ بديل ③ للحركات أحادية الجانب ═══
const UNILATERAL_TIP = {
  ar: 'ابدأ بجهتك الأضعف، وخلّ الجهة الثانية تتوقّف عند نفس عددها بالضبط.',
  en: 'Start with your weaker side, and make the stronger side stop at exactly the same number.',
}

function composeTips(m) {
  const eq = equipOf(m.equipment)
  const pat = m.movementPattern
  const patTable = PATTERN_TIP[pat]?.length ? PATTERN_TIP[pat] : PATTERN_TIP.isolation

  const equipTip = pick(EQUIP_TIP[eq] || EQUIP_TIP.bodyweight, m.id, 'equip')
  const patternTip = pick(patTable, m.id, 'pattern')
  const focusTip = isUnilateral(m) ? UNILATERAL_TIP : MUSCLE_TIP[m.primaryMuscle] || MUSCLE_TIP.core

  return {
    ar: [equipTip.ar, patternTip.ar, focusTip.ar],
    en: [equipTip.en, patternTip.en, focusTip.en],
  }
}

const tips = {}
for (const m of manifest) tips[m.id] = composeTips(m)

const header = `// AUTO-GENERATED by scripts/coaching/build-technique-tips.mjs — do not edit by hand.
// نصائح تقنية ثنائية اللغة لكل تمرين في الكتالوج (${manifest.length} تمرينًا).
//
// كل نصيحة زوج \`{ ar, en }\` مكتوب بيدٍ في نفس السطر داخل مكتبة الجذاذات، ويُختار
// بنفس المؤلِّف لكلا اللغتين — فلا لغة تسبق الأخرى ولا واحدة ترجمة آلية للثانية.
// التغطية والتكافؤ وغياب الحشو يحرسها \`npm run test:guidance-coverage\`.
// Regenerate: node scripts/coaching/build-technique-tips.mjs

/** نصائح تقنية لتمرين واحد — نفس العدد في اللغتين بحكم المؤلِّف. */
export interface BilingualTechniqueTips {
  ar: string[]
  en: string[]
}

export const EXERCISE_TECHNIQUE_TIPS: Record<string, BilingualTechniqueTips> = ${JSON.stringify(tips, null, 2)}
`
const out = resolve(here, '../../src/data/coaching/exerciseTechniqueTips.generated.ts')
writeFileSync(out, header)
console.log(`wrote ${Object.keys(tips).length} bilingual technique-tip sets → src/data/coaching/exerciseTechniqueTips.generated.ts`)
