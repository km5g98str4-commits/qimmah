// قِمّة — إثبات موجة الصقل [CTO-72] المرحلة ب (البنود التي تعيش في الواجهة).
//
// لماذا ملف واحد بأقسام مسمّاة لا ثلاثة ملفات: البنود الثلاثة تحرس **فكرة واحدة**
// — «لا تعرض ما ليس عندك، ولا تأخذ ما عند المستخدم بلا سؤال». وفصلها إلى ثلاث
// بوّابات يجعل كلًّا منها أفقر سياقًا، ويخفي أن كسر أحدها يكسر المعنى نفسه.
//
// القسم ① البند ١ — اللوحة تفتح بحالة فارغة ذكية (`TodayV2`).
// القسم ② البند ٢ — سياق «ليش نسأل» فوق كل خطوة إعداد (`OnboardingV2`).
// القسم ③ البند ٤ — لا فقدان لتقدّم جلسة بلا تأكيد (`WorkoutMode` · `WorkoutView`).
//
// ═══ لماذا فحص بنيوي لا `includes()` ═══
// §4.2 من الميثاق: «مرور غير مستحقّ ليس نجاحًا». خمس `includes()` متفرّقة تُرضى
// من خمسة مواضع لا علاقة بينها. فكل تأكيد هنا **يستخرج الكتلة بحدودها** (عدّ
// أقواس متوازن) ويسأل: هل هذا العنصر **داخل** هذا الحارس؟ — لا: هل الاثنان
// موجودان في الملف؟
//
// وكل قسم يُرفَق بـ**محاكاة التفاف** تنقض الحارس في نسخة من المصدر وتؤكّد أن
// الفحص يسقط **باسمه** — فلو رخا التأكيد يومًا، سقطت المحاكاة أولًا وأعلنت ذلك.
//
//   node scripts/run-cto72-polish-proof.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
let fail = 0
const check = (label, cond, detail = '') => {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * يستخرج كتلة JSX محروسة بحدودها الحقيقية: يبدأ من `opener` ويعدّ الأقواس حتى
 * يُغلق القوس المفتوح. هذا هو الفرق بين «الحارس والعنصر موجودان في الملف» وبين
 * «العنصر **داخل** الحارس» — والثاني وحده ما نريده.
 *
 * يعيد مصفوفة الكتل (قد يتكرّر الحارس)، أو [] إن لم يوجد.
 */
function guardedBlocks(src, opener) {
  const blocks = []
  let from = 0
  for (;;) {
    const start = src.indexOf(opener, from)
    if (start === -1) return blocks
    let depth = 1
    let i = start + opener.length
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth += 1
      else if (src[i] === ')') depth -= 1
      i += 1
    }
    blocks.push(src.slice(start, i))
    from = start + opener.length
  }
}

/** هل يقع `needle` داخل إحدى الكتل المحروسة بـ`opener`؟ */
const insideGuard = (src, opener, needle) => guardedBlocks(src, opener).some((b) => b.includes(needle))

/**
 * جسم دالّة سهمية بحدوده — `const NAME = () => { … }` بعدّ أقواس معقوفة متوازن.
 * (لا يصلح `guardedBlocks` هنا: قوس المعاملات يُغلق فورًا فتصير الكتلة فارغة.)
 */
function arrowBody(src, name) {
  const opener = `const ${name} = () => {`
  const start = src.indexOf(opener)
  if (start === -1) return ''
  let depth = 1
  let i = start + opener.length
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') depth -= 1
    i += 1
  }
  return src.slice(start, i)
}

// ═════════════════════════════════════════════════════════════════════════
console.log('\n① البند ١ — اللوحة تفتح بحالة فارغة ذكية (TodayV2)')
// ═════════════════════════════════════════════════════════════════════════

const today = read('src/views/TodayV2.tsx')
/**
 * ═══ تحديث بعد [QIMMAH-TODAY-SOVEREIGN-REDESIGN-001] ═══
 *
 * **المقصد محروس كما هو؛ البنية تغيّرت فتتبعها الحراسة.**
 *   • سطر الماكروز الأربع الرقاقات ⇐ `DailyRingsCard` (حلقة سعرات + ثلاث ماكرو).
 *   • الحارس `{!blankSlate && (` ⇐ `showRings` = `hasAnyTarget` (انظر [LIVE-QA-B]
 *     أدناه): شرط الأهداف المحسوبة باقٍ، وشرط «ليس اليوم الأول» سقط بدليل حيّ.
 *   • مصادر الإشارة صارت هوك التغذية الحيّ (`totals` · `dayLog`) بدل لقطة
 *     `buildNutritionV2Model` غير التفاعلية — نفس البيانات، ومصدرٌ يتحدّث فورًا.
 *
 * **وبند واحد نُسخ صراحةً بأمر المؤسس، ولم يسقط بالسكوت:** كان «نبض أسبوعك»
 * يُخفى كلّيًّا في الحالة الفارغة. وأمرُ إعادة التصميم ينصّ حرفيًّا على العكس:
 * «Show an honest empty state such as: سيبدأ نبض أسبوعك بعد أول نشاط مسجّل».
 * فالإخفاء استُبدل بحالة فارغة صادقة — والصدق يُحرَس هنا بشرط أقوى من الإخفاء:
 * ممنوع أن تدّعي البطاقة نسبةً أو يومًا مكتملًا بلا جلسة (يحرسه `test:today-home`
 * سلوكيًّا، ويحرسه أدناه بنيويًّا).
 */
// [LIVE-QA-B] الحلقات خرجت من السلسلة إلى ما فوقها:
//   {showRings && <DailyRingsCard/>}
//   {blankSlate ? <FirstDayCard/> : !showRings ? <بطاقة الإعداد/> : null}
// **المقصد المحروس لم يتغيّر** — «لا لوحة أصفار لمن لا رقم له» — لكن مرساته
// انتقلت من «الحلقات آخر الفروع» إلى «الحلقات مشروطة بالأهداف المحسوبة وحدها».
// والفرق ليس أسلوبيًّا: القاعدة القديمة كانت تحجب حلقاتٍ **محسوبة أصلًا** عمّن
// أنهى الإعداد للتوّ — عطلٌ حيّ رفعه المؤسس من المعاينة المنشورة، والدليل الحيّ
// يعلو على الإثبات البائت (§2: القرارات تشيخ كما يشيخ الكود).
const BLANK_GUARD = '{blankSlate ? ('
const RINGS_GUARD = '{showRings && ('

// أ) التعريف: القيد مركّب من شرطين — «قادم جديد» **و**«لا إشارة اليوم».
const blankDecl = /const blankSlate = model\.state === 'newUser' && !hasTodaySignal/.test(today)
check('`blankSlate` = قادم جديد ∧ لا إشارة اليوم (شرطان لا واحد)', blankDecl)
check(
  'وحارس الحلقات = الأهداف المحسوبة وحدها (§5 محفوظة: لا «—» بلا هدف)',
  /const showRings = hasAnyTarget$/m.test(today),
)
check(
  'ولا يعود شرط «ليس اليوم الأول» — العطل الحيّ الذي حجب حلقات محسوبة',
  !/const showRings = !blankSlate/.test(today),
)

// ب) الإشارة مشتقّة من مصادر البطاقات نفسها — لا علم منفصل يشيخ.
const signalBlock = today.slice(today.indexOf('const hasTodaySignal ='), today.indexOf('const blankSlate ='))
const SIGNALS = [
  ['سعرات مستهلَكة', 'totals.calories > 0'],
  ['ماء مسجَّل', 'dayLog.waterMl > 0'],
  ['وجبة مسجَّلة', 'hasMeal'],
  ['وزن اليوم', 'todayWeightLogged'],
  ['تمرين منتهٍ', "trainPillar?.state === 'done'"],
  ['تمرين جارٍ', "trainPillar?.state === 'active'"],
]
SIGNALS.forEach(([name, expr]) => check(`الإشارة تشمل: ${name}`, signalBlock.includes(expr)))
// والمصادر **حيّة**: لقطة `useMemo` على `customization` كانت لا تتحرّك عند تسجيل
// كوب ماء، فتبقى الإشارة كاذبة بعد فعلٍ حقيقي.
check(
  'مصادر الإشارة من الهوك التفاعلي لا من لقطة جامدة',
  today.includes('const { state: dayLog, totals, addWater } = useNutritionToday()'),
)

/**
 * ج) البنية: الحارس صار **ثلاثيًّا** (فارغ ⇒ بطاقة إعداد · وإلا ⇒ الحلقات)، لا
 *    `&&` يُظهر أو يُخفي. ولذلك لا يكفي `insideGuard`: عدّاد الأقواس يقف عند
 *    `) : (` فيلتقط الفرع الأول وحده، فيبدو أن الحلقات «خارج الحارس» وهي في
 *    فرعه الآخر. يُستخرج التعبير كاملًا بعدّ الأقواس المعقوفة، ثم يُسأل عن
 *    **موضع كل فرع من الفاصل** — وهذا ما يمنع الرضا من مجرّد وجود الاسمين.
 */
function ternaryRegion(src, opener) {
  const start = src.indexOf(opener)
  if (start === -1) return ''
  let depth = 1
  let i = start + 1 // بعد `{`
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') depth -= 1
    i += 1
  }
  return src.slice(start, i)
}
const ringsBlock = ternaryRegion(today, RINGS_GUARD)
const ringsTernary = ternaryRegion(today, BLANK_GUARD)
const firstSplit = ringsTernary.indexOf(') : ')                  // نهاية فرع «اليوم الأول»
const secondSplit = ringsTernary.indexOf(') : ', firstSplit + 1) // نهاية فرع «بلا أهداف»
const firstBranch = firstSplit > 0 ? ringsTernary.slice(0, firstSplit) : ''
const middleBranch = secondSplit > 0 ? ringsTernary.slice(firstSplit, secondSplit) : ''
check(
  'كتلة الحلقات مستخرَجة بحدودها (لا رضا بمجرّد ورود الاسم)',
  ringsBlock.length > 0 && ringsBlock.includes('<DailyRingsCard'),
)
check(
  'وسلسلة الحالة الفارغة مستخرَجة بفرعيها',
  ringsTernary.length > 0 && firstSplit > 0 && secondSplit > firstSplit,
)
check(
  'والحلقات **تسبق** السلسلة (الرقم يقود · والشرح تحته لا فوقه)',
  today.indexOf(RINGS_GUARD) > 0 && today.indexOf(RINGS_GUARD) < today.indexOf(BLANK_GUARD),
)
check(
  'وفرع اليوم الأول يشرح قبل أن يقيس (FirstDayCard) — بلا أرقام',
  firstBranch.includes('<FirstDayCard') && !firstBranch.includes('<DailyRingsCard'),
)
check(
  'وبديل «بلا أهداف» (بطاقة إعداد) في فرعه الأوسط لا أصفار',
  middleBranch.includes('d.noTargetsTitle') && !middleBranch.includes('<DailyRingsCard'),
)
check(
  'ومصدر الحلقات واحد — لا نسخة ثانية داخل السلسلة',
  (today.match(/<DailyRingsCard/g) ?? []).length === 1,
)
check(
  'ولا حلقات متبقّية خارج البطاقة (مصدر واحد للحلقات)',
  !/<MacroRing/.test(today) && !/<ProgressRing/.test(today),
)

// د) «نبض أسبوعك» يُعرض دائمًا الآن — والشرط أنه **لا يدّعي** ما ليس عنده.
const pulseModel = read('src/lib/weeklyPulse.ts')
check(
  'النبض يقيس التاريخ لا الخطة (`hasData` من الجلسات وحدها)',
  /hasData: sessions\.length > 0/.test(pulseModel),
)
check(
  'ولا نسبة بلا مقام حقيقي',
  /percent: plannedCount > 0 \?/.test(pulseModel) && /: null,/.test(pulseModel),
)
const pulseCard = read('src/components/today/WeeklyPulseCard.tsx')
check(
  'والبطاقة تعرض «—» لا رقمًا حين لا نبض',
  /pulse\.percent === null \|\| empty \? '—'/.test(pulseCard),
)

// هـ) الحالة الفارغة **مؤقّتة**: لا شيء يقيّدها بعلم دائم يُخزَّن.
check(
  'لا تخزين للحالة الفارغة (تزول بأول تسجيل، لا بعلم محفوظ)',
  !/blankSlate[\s\S]{0,120}(localStorage|safeStorage|setItem)/.test(today),
)

// و) ⚔️ محاكاة التفاف — كل شدّ يُهاجَم، والسقوط بفحص **مسمّى** (§4.2).
{
  // ١) نزع شرط الأهداف ⇒ أربع حلقات بـ«—» لمن لا رقم له: يسقط باسمه.
  const unconditional = today.replace('const showRings = hasAnyTarget', 'const showRings = true')
  check(
    '⚔️ جعل الحلقات بلا شرط يُسقط فحص «الأهداف المحسوبة وحدها»',
    !/const showRings = hasAnyTarget$/m.test(unconditional),
    'الفحص مرّ على مصدر بلا شرط أهداف — البوابة رخوة',
  )
  // ٢) إعادة `!blankSlate` ⇒ عودة العطل الحيّ نفسه: يسقط باسمه.
  const regressed = today.replace('const showRings = hasAnyTarget', 'const showRings = !blankSlate && hasAnyTarget')
  check(
    '⚔️ إعادة حجب اليوم الأول تُسقط فحص «لا يعود شرط ليس اليوم الأول»',
    /const showRings = !blankSlate/.test(regressed),
  )
  // ٣) دسّ نسخة ثانية داخل السلسلة ⇒ مصدران للحلقات: يسقط باسمه.
  const duplicated = today.replace('<FirstDayCard', '<DailyRingsCard')
  check(
    '⚔️ نسخة ثانية من الحلقات داخل السلسلة تُسقط فحص «مصدر واحد»',
    (duplicated.match(/<DailyRingsCard/g) ?? []).length !== 1,
  )
  // ٤) نزع كتلة الحلقات كلّها ⇒ لا تُستخرج أصلًا: يسقط باسمه.
  const removed = today.split(RINGS_GUARD).join('{false && (')
  check(
    '⚔️ نزع كتلة الحلقات يُسقط فحص «مستخرَجة بحدودها»',
    ternaryRegion(removed, RINGS_GUARD) === '',
  )
  // ٥) وإنزال الحلقات تحت السلسلة يُسقط فحص الترتيب باسمه.
  const reordered = today.split(RINGS_GUARD).join('{showRingsMoved && (')
  check(
    '⚔️ نقل الحلقات أسفل السلسلة يُسقط فحص «الرقم يقود»',
    !(reordered.indexOf(RINGS_GUARD) > 0 && reordered.indexOf(RINGS_GUARD) < reordered.indexOf(BLANK_GUARD)),
  )
}
// ز) ⚔️ ومحاكاة ثانية على البند المنسوخ: إعادة `hasData` إلى «أو وجود خطة»
//    تُعيد «٠٪ · أكملت ٠ من ٤» للقادم الجديد — أي لوحة الأصفار بثوب آخر.
{
  const tampered = pulseModel.replace('hasData: sessions.length > 0', 'hasData: sessions.length > 0 || plannedCount > 0')
  check(
    '⚔️ ربط النبض بالخطة بدل التاريخ يُسقط فحص «يقيس التاريخ» باسمه',
    !/hasData: sessions\.length > 0,/.test(tampered),
  )
}

// ═════════════════════════════════════════════════════════════════════════
console.log('\n② البند ٢ — سياق «ليش نسأل» فوق كل خطوة إعداد (OnboardingV2)')
// ═════════════════════════════════════════════════════════════════════════

const onboarding = read('src/views/OnboardingV2.tsx')
const whyDict = read('src/i18n/dict/setupWhy.ts')

// أ) الضمان البنيوي: الصفّ سبعة بالضبط، فخطوة ثامنة بلا سطر **لا تُترجم**.
check(
  '`SetupWhyLines` صفٌّ بطول سبعة بالضبط (المترجم يحرس الاكتمال)',
  /export type SetupWhyLines = readonly \[string, string, string, string, string, string, string\]/.test(whyDict),
)
check(
  '`StepTitle.why` إلزامي لا اختياري (لا خطوة بعنوان بلا سياق)',
  /function StepTitle\(\{ id, title, why \}: \{ id: string; title: string; why: string \}\)/.test(onboarding),
)
check(
  '`StepTitle` يرسم السطر بلا شرط (لا `why &&` يبتلعه بصمت)',
  /<p className="mt-2 text-sm leading-relaxed text-ink-500">\{why\}<\/p>/.test(onboarding)
    && !/\{why && </.test(onboarding),
)

// ب) المُجمِّع يقرأ من مصادر الخطوات القائمة ولا ينسخها (نسخة ثانية تشيخ).
const SOURCES = [
  ['خطوة ٠ الأساسيات', 'bodyStepStrings[lang].whyNote'],
  ['خطوة ١ النية والمستوى', 'intent.subtitle'],
  ['خطوة ٢ التاريخ', 'trainingHistoryStrings[lang].why'],
  ['خطوة ٤ التدريب', 't.training.subtitle'],
  ['خطوة ٥ السياق', 'onboardingLifestyleStrings[lang].contextWhy'],
  ['خطوة ٦ القيود', 'onboardingLifestyleStrings[lang].limitationsWhy'],
]
SOURCES.forEach(([name, expr]) =>
  check(`المُجمِّع يقرأ ${name} من قاموسه لا بنسخة`, whyDict.includes(expr)),
)
check('خطوة ٣ الهدف — السطر المفقود يُضاف هنا (بالعربية والإنجليزية)', /const goalWhy: Record<Lang, string> = \{[\s\S]*?ar: '[^']+',[\s\S]*?en: '[^']+',/.test(whyDict))

// ج) الخطوات السبع تُغذَّى بالفهرس الصحيح — لا خطوة تأخذ سطر جارتها.
for (let i = 0; i <= 6; i += 1) {
  check(`الخطوة ${i} تمرّر \`whyLines[${i}]\``, onboarding.includes(`why={whyLines[${i}]}`))
}
check(
  'سبعة تمريرات لا أقل (كل خطوة لها سطرها)',
  (onboarding.match(/why=\{whyLines\[\d\]\}/g) || []).length === 7,
)

// د) الازدواج المُزال: لم يعد لخطوة الأساسيات سطران شارحان.
check(
  'سطر «ليش» لم يعد مكرَّرًا أسفل خطوة الأساسيات',
  !onboarding.includes('{s.whyNote}'),
)
check(
  '`bodyStepStrings` لم يعد يحمل `subtitle` الذي كان يعيد المعنى نفسه',
  !/^\s*subtitle: /m.test(read('src/i18n/dict/bodyStep.ts')),
)
check(
  'خطوة الهدف لم تعد تكرّر «تقدر تغيّره» (السياق أثرٌ · والملاحظة رجعة)',
  !/goalWhy[\s\S]{0,200}تقدر تغيّره/.test(whyDict),
)

// هـ) ⚔️ محاكاة التفاف: أعِد `why` اختياريًا ⇒ يسقط الفحص باسمه.
{
  const tampered = onboarding.replace('title: string; why: string }', 'title: string; why?: string }')
  const stillRequired = /function StepTitle\(\{ id, title, why \}: \{ id: string; title: string; why: string \}\)/.test(tampered)
  check(
    '⚔️ جعل `why` اختياريًا يُسقط فحص الإلزام (لا يمرّ بوجود الاسم وحده)',
    stillRequired === false,
    'الفحص مرّ على توقيع اختياري — البوابة رخوة',
  )
}

// ═════════════════════════════════════════════════════════════════════════
console.log('\n③ البند ٤ — لا تخلٍّ عن جلسة فيها عمل بلا سؤال (WorkoutView)')
// ═════════════════════════════════════════════════════════════════════════

const workoutView = read('src/views/WorkoutView.tsx')
const activeWorkout = read('src/lib/activeWorkout.ts')
const guardCopy = read('src/i18n/dict/sessionGuard.ts')
const guardDialog = read('src/components/SessionGuardDialog.tsx')

// أ) الإشارة عند جذرها — دالّة واحدة يقرأها المساران، لا حسابان متوازيان يتباعدان.
check(
  '`completedSetCount` معرَّفة في مالك شكل الجلسة (`activeWorkout.ts`)',
  /export function completedSetCount\(active: ActiveWorkout \| undefined \| null\): number/.test(activeWorkout),
)
check(
  'لا جلسة ⇒ صفر (لا انهيار على `undefined`)',
  /if \(!active\) return 0/.test(activeWorkout),
)
check(
  'الحساب المكرَّر أُزيل من الشاشة (لا نسخة ثانية تتباعد)',
  !/Object\.values\((?:saved|pendingResume)\.exercises\)\.reduce/.test(workoutView),
)
check(
  'المساران يقرآن من الدالّة نفسها',
  (workoutView.match(/completedSetCount\(/g) || []).length >= 4,
)

// ب) المساران محروسان — **كلاهما**، ولا يُستدعى الفعل الخام من الواجهة.
check('زرّ ✕ يمرّ بالحارس لا بالفعل الخام', /onClose=\{requestClose\}/.test(workoutView) && !/onClose=\{closeWithoutFinishing\}/.test(workoutView))
check('«ابدأ نظيفًا» يمرّ بالحارس لا بالفعل الخام', /onClick=\{requestDiscardResume\}/.test(workoutView) && !/onClick=\{discardResume\}/.test(workoutView))

// ج) بلا تقدّم ⇒ فوري (الأمر: «مع بقاء الرجوع الفوري إذا لا تقدم»).
for (const [name, fn, act] of [
  ['✕', 'requestClose', 'closeWithoutFinishing'],
  ['ابدأ نظيفًا', 'requestDiscardResume', 'discardResume'],
]) {
  const body = arrowBody(workoutView, fn)
  check(`${name}: بلا تقدّم ⇒ الفعل فوري بلا حوار`, new RegExp(`if \\(sets === 0\\) \\{\\s*${act}\\(\\)`).test(body))
  check(`${name}: مع تقدّم ⇒ يُفتح الحارس`, /setGuard\(\{ kind: '(stop|discard)', sets \}\)/.test(body))
}

// د) الصدق (§5) — الجملتان تصفان **نتيجتين مختلفتين فعلًا**.
check(
  'نصّ التوقّف يطمئن أن العمل **باقٍ** (ولا يحذّر من فقدٍ لا يقع)',
  /stopBody: \(sets\) =>[\s\S]{0,180}بتنحفظ لك/.test(guardCopy) && !/stopBody[\s\S]{0,180}بيروح/.test(guardCopy),
)
check(
  'نصّ المحو يقول إن الفقد **حقيقي ولا تراجع بعده**',
  /discardTitle: 'تقدّمك في الجلسة بيروح — متأكد؟'/.test(guardCopy) && /discardBody[\s\S]{0,200}ما فيه تراجع/.test(guardCopy),
)
check('النصّان بالعربية والإنجليزية معًا (§6)', /const en: SessionGuardCopy/.test(guardCopy) && /const ar: SessionGuardCopy/.test(guardCopy))
check('العدد يُذكر في السؤال (كم على المحكّ لا «بيانات»)', /sets\b/.test(guardCopy) && /\$\{arNum\(sets\)\}/.test(guardCopy))

// هـ) الوصولية والسلامة (§4 من دستور الجودة).
check('نافذة داخل التطبيق لا `window.confirm` خام', /role="dialog"[\s\S]{0,120}aria-modal="true"/.test(guardDialog) && !/window\.confirm/.test(workoutView))
check('التركيز يبدأ على الخيار **الآمن** (Enter بلا قراءة لا يُتلف)', /cancelRef\.current\?\.focus\(\)/.test(guardDialog))
check('Esc = البقاء لا الفعل', /e\.key === 'Escape'\) onCancel\(\)/.test(guardDialog))
check('هدفا لمس ≥44px', (guardDialog.match(/min-h-\[44px\]/g) || []).length >= 2)
check('الفعل المدمّر مميَّز بنصّه لا بلونه وحده (§4)', /destructive \? s\.discardConfirm : s\.stopConfirm/.test(guardDialog))
check('الحارس فوق وضع الجلسة والملخّص (z-80 > 70 > 60)', /className="fixed inset-0 z-\[80\]/.test(guardDialog))

// و) الرصد لا يكذب: لا يُسجَّل قطعٌ لم يقع لأن المستخدم تراجع.
check(
  'حدث القطع يبقى في الفعل نفسه لا في طلب الحارس',
  /const requestClose = \(\) => \{[\s\S]{0,300}?\}/.test(workoutView)
    && !/const requestClose[\s\S]{0,300}?trackLocal\('workout_session_abandoned'/.test(workoutView),
)

// ز) ⚔️ محاكاة التفاف: أعِد توصيل الفعل الخام بالزرّ ⇒ يسقط الفحص باسمه.
{
  const tampered = workoutView.replace('onClick={requestDiscardResume}', 'onClick={discardResume}')
  const stillGuarded = /onClick=\{requestDiscardResume\}/.test(tampered) && !/onClick=\{discardResume\}/.test(tampered)
  check(
    '⚔️ إعادة الفعل الخام إلى الزرّ تُسقط فحص «ابدأ نظيفًا محروس»',
    stillGuarded === false,
    'الفحص مرّ على زرّ موصول بالمسح المباشر — البوابة رخوة',
  )
}

// ═════════════════════════════════════════════════════════════════════════
console.log(`\n${'─'.repeat(58)}\nالنتيجة: ${pass} ناجح · ${fail} فاشل`)
if (fail > 0) process.exit(1)
