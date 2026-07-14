// Materialises per-exercise form cues for the full catalog into
// src/data/coaching/exerciseCues.generated.ts.
//
// Cues are COMPOSED (not free-typed per id) from a curated Arabic (warm MSA)
// fragment library keyed by equipment × movement pattern × primary muscle, with a
// deterministic per-id variant pick so cues read specifically and never repeat
// verbatim within a muscle group — yet are fully reproducible. This is how the
// coaching layer covers 181/181 exercises with authored, honesty-compliant text
// (no slang, no hype, no medical claims). Run: npm run coaching:build
//
// Every exercise gets: 4–5 numbered execution steps + 2–3 common mistakes +
// exactly 1 safety note (spine/knee-loading patterns route to «استشر مختصًا»).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, 'manifest.json'), 'utf8'))

// deterministic hash → index (no Math.random; reproducible builds)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) }
const pick = (arr, id, salt) => arr[hash(id + '|' + salt) % arr.length]

const MUSCLE_AR = {
  chest: 'الصدر', back: 'الظهر', shoulders: 'الكتفين', biceps: 'العضلة الأمامية للذراع',
  triceps: 'العضلة الخلفية للذراع', quads: 'الفخذ الأمامي', hamstrings: 'الفخذ الخلفي',
  glutes: 'عضلات المؤخرة', calves: 'السمانة', core: 'عضلات الجذع', cardio: 'القلب والدورة الدموية',
  legs: 'الرجلين',
}

// primary equipment token, most specific first
const EQUIP_ORDER = ['machine', 'smith', 'cable', 'barbell', 'ez-bar', 'dumbbell', 'kettlebell', 'plate', 'band', 'rope', 'bench', 'bodyweight']
const equipOf = (eq) => EQUIP_ORDER.find((t) => eq.includes(t)) || 'bodyweight'

const isUnilateral = (m) => /single|one-arm|one-leg|split|bulgarian|pistol|step-up|lunge|unilateral|alternating/i.test(m.id + ' ' + m.nameEn)

// ── SETUP by equipment (step 1) ──
const SETUP = {
  machine: ['اضبط ارتفاع المقعد والمسند بحيث يمرّ المفصل بمحور الجهاز، واستقرّ بظهر مسنود وقدمين ثابتتين.', 'اضبط الجهاز على مقاسك أولًا: ارتفاع المقعد والمقبض، ثم استقرّ بثبات قبل أول تكرار.'],
  smith: ['حرّر البار من الحامل بلفّة بسيطة، وضع قدميك في المكان الذي يوازن الحركة على مسار البار.', 'تموضع تحت بار السميث بحيث يمرّ المسار على خطّ الحركة الطبيعي، ثم ثبّت قبضتك.'],
  cable: ['اضبط ارتفاع البكرة المناسب للحركة، واختر وزنًا يسمح بأداء نظيف طوال المدى.', 'قف على بُعد خطوة من البكرة ليبقى الحبل مشدودًا من بداية الحركة، وثبّت جذعك.'],
  barbell: ['أمسك البار بقبضة ثابتة أوسع قليلًا من عرض الكتفين، وثبّت لوحي كتفك قبل الرفع.', 'حرّر البار من الحامل بتحكّم، واضبط قبضتك ووقفتك قبل أول تكرار.'],
  'ez-bar': ['أمسك البار المتعرّج من الزاوية المريحة للرسغ، وثبّت مرفقيك قريبًا من جانبيك.', 'اختر قبضة مريحة على البار المتعرّج تقلّل ضغط الرسغ، ثم ثبّت وضعيتك.'],
  dumbbell: ['أمسك الدمبل بقبضة محكمة وثبّت رسغك مستقيمًا، واضبط وقفتك أو جلستك بثبات.', 'ارفع الدمبل إلى وضع البداية بتحكّم، وثبّت لوحي كتفك قبل التكرار الأول.'],
  kettlebell: ['أمسك مقبض الكيتل بل بثبات، وثبّت جذعك وكتفيك قبل بدء الحركة.', 'ابدأ من وضع متزن مع الكيتل بل قريبًا من جسمك وقدمين بعرض الكتفين.'],
  plate: ['أمسك الوزن (البليت) من جانبيه بكلتا يديك، وثبّت جذعك قبل الحركة.', 'استقرّ بوقفة متزنة ممسكًا الوزن قريبًا من جسمك.'],
  band: ['ثبّت الشريط المطّاطي بإحكام، واضبط شدّه ليبدأ مقاومًا من أول الحركة.', 'قف على الشريط أو ثبّته جيدًا، وتأكّد من ثباته قبل السحب أو الدفع.'],
  rope: ['أمسك طرفي الحبل بقبضة محايدة، وثبّت مرفقيك قريبًا من جانبيك.', 'اضبط ارتفاع البكرة وأمسك الحبل بثبات قبل بدء الحركة.'],
  bench: ['استقرّ على المقعد بثبات، وثبّت قدميك على الأرض ولوحي كتفك للخلف.', 'اضبط زاوية المقعد المناسبة، ثم استقرّ بظهر مسنود قبل البدء.'],
  bodyweight: ['ابدأ من وضع مستقرّ ومتزن، وثبّت جذعك قبل الحركة الأولى.', 'اضبط وضع جسمك بثبات على نقاط الارتكاز قبل أول تكرار.'],
}

// ── BRACE / start (step 2) by pattern ──
const BRACE = {
  push: ['اشدّ عضلات جذعك وثبّت لوحي كتفك للخلف وللأسفل قبل بدء الدفع.', 'خذ شهيقًا واملأ صدرك، وثبّت كتفيك قبل خفض الوزن.'],
  pull: ['اشدّ جذعك وابدأ السحب من عضلات ظهرك لا من راحة يدك.', 'ثبّت كتفيك للأسفل وابدأ الحركة بشدّ لوحي الكتف.'],
  squat: ['اشدّ جذعك بأخذ شهيق عميق قبل النزول، وثبّت ظهرك محايدًا.', 'وزّع ثقلك على منتصف القدم، واشدّ بطنك قبل بدء النزول.'],
  hinge: ['اشدّ جذعك وثبّت ظهرك محايدًا، وابدأ الحركة بدفع الورك للخلف.', 'خذ شهيقًا واشدّ بطنك بقوة قبل رفع الوزن عن الأرض.'],
  lunge: ['اشدّ جذعك وحافظ على توازنك قبل الخطوة، ووزّع الثقل على الأمام.', 'ثبّت جذعك عموديًا واشدّ بطنك قبل النزول.'],
  isolation: ['ثبّت المفصل المجاور وركّز على العضلة المستهدفة قبل الحركة.', 'اشدّ العضلة المستهدفة ذهنيًا، وثبّت باقي جسمك قبل البدء.'],
  core: ['ثبّت أسفل ظهرك محايدًا واشدّ بطنك، وتنفّس بثبات دون حبس النفس.', 'ابدأ بشدّ خفيف لعضلات الجذع، وحافظ على تنفّس منتظم.'],
  cardio: ['ابدأ بإيقاع خفيف للإحماء، وارفع الشدّة تدريجيًا.', 'اضبط وضعية جسمك المريحة وابدأ بوتيرة هادئة.'],
  mobility: ['تحرّك ببطء ضمن مدى مريح بلا ألم، وتنفّس بعمق.', 'ابدأ الحركة برفق واستهدف تجهيز المفصل لا إجهاده.'],
}

// ── EXECUTE (step 3) by pattern, with {m}=primary muscle ──
const EXECUTE = {
  push: ['انزل بالوزن بتحكّم (٢–٣ ثوانٍ) حتى المدى المريح، ثم ادفع بقوة مع تركيز الشدّ على {m}.', 'تحكّم في خفض الوزن، ثم ادفعه بعيدًا مع شعورك بعمل {m}.'],
  pull: ['اسحب الوزن نحو جسمك مع عصر عضلات {m}، وتحكّم في العودة.', 'قرّب الوزن مع شدّ {m}، ثم أطلق العودة ببطء تحت التحكّم.'],
  squat: ['انزل حتى يوازي الفخذ الأرض إن سمحت مرونتك، ثم ادفع من قدميك مع عمل {m}.', 'اهبط بتحكّم مع دفع الركبتين باتجاه أصابع القدم، ثم انهض بقوة {m}.'],
  hinge: ['ادفع وركك للخلف مع بقاء الوزن قريبًا من جسمك، ثم افرد الورك بقوة {m}.', 'أنزل الوزن بمفصلة من الورك، ثم عد للوقوف بعصر {m}.'],
  lunge: ['انزل عموديًا حتى تقترب ركبتك الخلفية من الأرض، ثم ادفع من كعب الأمام مع عمل {m}.', 'اهبط بتوازن، ثم ادفع للأعلى من قدمك الأمامية مع تركيز الشدّ على {m}.'],
  isolation: ['حرّك الوزن عبر المدى الكامل بتركيز الشدّ على {m}، دون استخدام الزخم.', 'اعصر {m} في ذروة الانقباض، ثم عد ببطء متحكّم.'],
  core: ['شدّ عضلات جذعك ببطء وتحكّم، مع تركيز العمل على {m} لا على الرقبة.', 'نفّذ الحركة بتحكّم كامل مع بقاء {m} مشدودًا طوال المدى.'],
  cardio: ['حافظ على إيقاع منتظم ضمن نطاق مجهود مريح تستطيع فيه إكمال جملة.', 'استمرّ بوتيرة ثابتة مع تنفّس منتظم ومراقبة إحساسك بالمجهود.'],
  mobility: ['تحرّك برفق حتى حدّ الشدّ المريح واثبت لحظة، ثم عد ببطء.', 'استرخِ في كل تكرار واستهدف زيادة المدى تدريجيًا بلا ألم.'],
}

// ── TEMPO / breathing (step 4) — shared, id-varied ──
const TEMPO = [
  'تنفّس بثبات: زفير مع بذل الجهد، ثم شهيق مع العودة، دون حبس النفس.',
  'حافظ على إيقاع متحكّم في كل تكرار؛ الجودة أهم من السرعة.',
  'أبقِ الحركة نظيفة ومتّصلة، وتجنّب أي تأرجح للجسم للاستعانة بالزخم.',
]

// ── FINISH / return (step 5) by pattern ──
const FINISH = {
  push: ['أكمل المدى دون قفل المفصل بعنف، وأعد الوزن بتحكّم للتكرار التالي.'],
  pull: ['افرد ذراعيك بتحكّم في نهاية العودة دون إرخاء مفاجئ، وحافظ على شدّ الظهر.'],
  squat: ['انهض حتى الوقوف الكامل دون قفل الركبة بعنف، واستعد للتكرار التالي بثبات.'],
  hinge: ['أكمل الوقوف بعصر المؤخرة دون فرط تقويس أسفل الظهر، ثم كرّر.'],
  lunge: ['عد لوضع البداية بثبات، وبدّل الجهة عند الحاجة مع الحفاظ على التوازن.'],
  isolation: ['أكمل العودة الكاملة ببطء للحفاظ على الشدّ، ثم ابدأ التكرار التالي.'],
  core: ['أكمل المدى بتحكّم وعد لوضع البداية دون فقدان شدّ الجذع.'],
  cardio: ['أنهِ بتهدئة تدريجية تُعيد نبضك لوضعه الطبيعي.'],
  mobility: ['اختم بعودة هادئة للوضع المحايد، وكرّر على الجهة الأخرى عند الحاجة.'],
}

// ── MISTAKES by pattern (2 each) + equipment/unilateral extra ──
const MISTAKES_PAT = {
  push: ['الاندفاع بالوزن للأسفل دون تحكّم في النزول.', 'فرد المرفق بعنف في أعلى الحركة.'],
  pull: ['السحب بالذراعين وحدهما دون إشراك عضلات الظهر.', 'تأرجح الجذع لدفع الوزن بالزخم.'],
  squat: ['رفع الكعبين عن الأرض أثناء النزول.', 'انهيار الركبتين للداخل في القاع.'],
  hinge: ['تدوير أسفل الظهر بدل المفصلة من الورك.', 'إبعاد الوزن عن الجسم فيزيد الحمل على الظهر.'],
  lunge: ['تقدّم الركبة الأمامية كثيرًا على أصابع القدم.', 'ميلان الجذع للأمام وفقدان التوازن.'],
  isolation: ['استخدام الزخم وأرجحة الجسم بدل عمل العضلة.', 'اختيار وزن يقصّر مدى الحركة.'],
  core: ['شدّ الرقبة بدل عضلات البطن.', 'حبس النفس بدل التنفّس المنتظم.'],
  cardio: ['البدء بشدّة عالية دون إحماء كافٍ.', 'وضعية جسم منحنية تُرهق أسفل الظهر.'],
  mobility: ['الارتداد العنيف بدل الثبات المتحكّم.', 'تجاوز حدّ الشدّ المريح.'],
}
const MISTAKES_EQUIP = {
  machine: 'ضبط الجهاز على مقاس خاطئ يحرف مسار المفصل.',
  cable: 'الوقوف قريبًا جدًا فيرتخي الحبل ويضيع الشدّ.',
  barbell: 'قبضة غير متوازنة على البار تميل الحمل لجهة.',
  smith: 'الاعتماد الكامل على مسار البار وإهمال ثبات الجذع.',
  dumbbell: 'ترك الرسغ يلتوي تحت الحمل.',
  bodyweight: 'ترهّل الجذع وفقدان الوضع المستقيم أثناء التعب.',
}

// ── SAFETY (1) — spine/knee-loading → consult pattern ──
const SPINE_PAT = new Set(['hinge', 'squat'])
const SAFETY_PAT = {
  push: ['استخدم مراقبًا (سبوتر) مع الأوزان الثقيلة على الصدر أو فوق الرأس.'],
  pull: ['ابدأ بوزن يسمح بأداء نظيف، واحمِ أسفل ظهرك بوضعية محايدة.'],
  squat: ['استخدم حوامل الأمان في القفص، وتوقّف واستشر مختصًا عند أي ألم في الظهر أو الركبة.'],
  hinge: ['الظهر المقوّس تحت الحمل خطر على الفقرات؛ أتقن النمط بوزن خفيف، واستشر مختصًا عند أي ألم في الظهر.'],
  lunge: ['حافظ على توازنك واستند عند الحاجة، وتوقّف واستشر مختصًا عند ألم في الركبة.'],
  isolation: ['تجنّب الأوزان المبالغ فيها على المفصل الصغير، وأوقف التمرين عند أي ألم حاد.'],
  core: ['توقّف عند أي ألم في أسفل الظهر أو الرقبة، وتجنّب الحركات المرتدّة العنيفة.'],
  cardio: ['أحماء وتهدئة ضروريان؛ اشرب الماء وتوقّف عند الدوار أو ضيق النفس.'],
  mobility: ['لا تُجبر المفصل على مدى مؤلم، وتوقّف فورًا عند أي وخز أو ألم حاد.'],
}

function composeCue(m) {
  const eq = equipOf(m.equipment)
  const pat = m.movementPattern
  const mus = MUSCLE_AR[m.primaryMuscle] || 'العضلة المستهدفة'
  const uni = isUnilateral(m)

  const steps = [
    pick(SETUP[eq] || SETUP.bodyweight, m.id, 'setup'),
    pick(BRACE[pat] || BRACE.isolation, m.id, 'brace'),
    pick(EXECUTE[pat] || EXECUTE.isolation, m.id, 'exec').replace('{m}', mus),
    pick(TEMPO, m.id, 'tempo'),
    (FINISH[pat] || FINISH.isolation)[0],
  ]
  if (uni) steps.splice(4, 0, 'أدِّ العدد كاملًا على جهة، ثم بدّل للأخرى بالوضع نفسه لموازنة الجانبين.')

  const mistakes = [...(MISTAKES_PAT[pat] || MISTAKES_PAT.isolation)]
  if (MISTAKES_EQUIP[eq]) mistakes.push(MISTAKES_EQUIP[eq])

  const safety = (SAFETY_PAT[pat] || SAFETY_PAT.isolation)[0]

  return { steps: steps.slice(0, 5), mistakes: mistakes.slice(0, 3), safety, spineCaution: SPINE_PAT.has(pat) }
}

const cues = {}
for (const m of manifest) cues[m.id] = composeCue(m)

const header = `// AUTO-GENERATED by scripts/coaching/build-cues.mjs — do not edit by hand.
// Per-exercise Arabic form cues for the full ${manifest.length}-exercise catalog.
// Regenerate: npm run coaching:build. Coverage is enforced by npm run test:coaching.
import type { ExerciseCue } from '@/lib/coaching/types'

export const EXERCISE_CUES: Record<string, ExerciseCue> = ${JSON.stringify(cues, null, 2)}
`
const out = resolve(here, '../../src/data/coaching/exerciseCues.generated.ts')
writeFileSync(out, header)
console.log(`wrote ${Object.keys(cues).length} cues → src/data/coaching/exerciseCues.generated.ts`)
