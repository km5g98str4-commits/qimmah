/**
 * إثبات تماسك «اليوم» — [SOVEREIGN-003] حارة اليوم/الرئيسية.
 *
 * ═══ ما يحرسه ═══
 * ① **كل بطاقة تصل إلى مسار موجود.** لا وجهةَ مخترَعة، ولا فعلَ لا يستطيعه
 *    البناء الذي يعرضه (زرّ «اربط» في متصفّح لا يقرأ HealthKit).
 * ② **كل رقم معروض يحمل سنده** — ولا يُسمّى الجميع «تقديرًا»: المقيس يُقال
 *    حاسمًا، والمشتقّ يُوسَم، والمُدخَل يُنسب لصاحبه. تعميم وسم «تقديري» على
 *    الأرقام المقيسة كذبٌ من الجهة الأخرى، فيُسقطه فحصٌ مسمّى.
 * ③ **تسجيل الخطوات يُؤكَّد قبل أن يُعلَن.** لا رسالة «محفوظ» قبل استقرار القيمة.
 * ④ **سطر التاريخ لا يخلط المدى.** المقاطع معزولة والفاصل وسم — لا نصّ واحد
 *    يترك ترتيبه لخوارزمية ثنائية الاتجاه فوق محارف محايدة.
 *
 * ═══ العقد المنهجي (§4.2) ═══
 * كل شدّ هنا **مُهاجَم**: لكل فحص بنيوي محاكاة التفاف تُعيد الحالة القديمة
 * وتُثبت أن الفحص يسقط **باسمه** لا باستثناء تقني. وسقوطٌ غير مسمّى ليس إثباتًا.
 */
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
let counter = 0
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}
/** تأكيد مضادّ: يُحسب في عدّاد مستقل ليُقرأ عدده في التقرير. */
const counterCheck = (label, cond) => { counter += 1; check(`↺ ${label}`, cond) }

/** يجرّد التعليقات قبل أي فحص «غياب» — وإلّا صار الشرح الذي يوثّق الإصلاح دليلًا ضدّه. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

// ═══ ① القسم السلوكي — النموذج يُقاد فوق تخزين مُحاكى ═══════════════════════
const banner = `
const __store = new Map();
globalThis.__failWrites = false;
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => {
    if (globalThis.__failWrites) {
      const err = new Error('quota'); err.name = 'QuotaExceededError'; throw err;
    }
    __store.set(k, String(v));
  },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const SNIPPET = `
import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { getDayStamp } from '@/lib/today'
import { getSteps, setSteps } from '@/lib/stepCounter'

const out: { label: string; ok: boolean; counter?: boolean }[] = []
const c1 = (label: string, ok: boolean) => out.push({ label, ok })
const cx = (label: string, ok: boolean) => out.push({ label, ok, counter: true })

const ls = globalThis.localStorage
const stamp = getDayStamp()

function base(extra?: Partial<Customization>): Customization {
  const c = getDefaultCustomization()
  return {
    ...c,
    profile: { ...c.profile, name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    targetsMeta: { ...c.targetsMeta, manuallyEdited: true },
    nutritionPlan: { ...c.nutritionPlan, targetCalories: 2200, targetProtein: 160 },
    ...extra,
  }
}
const seedMigrated = () => ls.setItem('qimmah:history:migrated:v1', 'done')
const seedOnboarded = () => ls.setItem('qimmah:onboarding:profile:v1', '{}')
const seedSteps = (n: number) => ls.setItem('qimmah:steps:v1', JSON.stringify({ [stamp]: n }))
const seedNutrition = (calories: number, protein: number) =>
  ls.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify({ [stamp]: { date: stamp, doneMeals: {}, loggedFood: { calories, protein, carbs: 0, fat: 0 }, updatedAt: new Date().toISOString() } }))

// ── ①-أ سطر التاريخ: مقاطع معزولة، لا نصّ مخلوط المدى ─────────────────────
/**
 * الثابت المحروس: **لا مقطع يحمل فاصلًا محايدًا**. الفاصل المحايد بين مدًى
 * عربي ومدًى رقمي هو بالضبط ما تتفاوض عليه الخوارزمية، فوجوده داخل نصّ مقطع
 * يعني أن الترتيب المعروض ليس ترتيبنا.
 */
const NEUTRAL_SEPARATOR = /[·|\\/]/
const partsAreIsolated = (parts: { text: string }[]) => parts.length > 0 && parts.every((p) => !NEUTRAL_SEPARATOR.test(p.text))
const HAS_DIGIT = /[0-9٠-٩۰-۹]/

for (const lang of ['ar', 'en'] as const) {
  ls.clear(); seedMigrated(); seedOnboarded(); seedSteps(8000); seedNutrition(1320, 125)
  const m = buildTodayV2Model(base(), lang)
  c1(\`[\${lang}] سطر التاريخ مقاطع لا جملة (\${m.dateParts.length} مقاطع)\`, m.dateParts.length >= 2)
  c1(\`[\${lang}] لا مقطع يحمل فاصلًا محايدًا\`, partsAreIsolated(m.dateParts))
  const weekdayPart = m.dateParts.find((p) => p.key === 'weekday')
  const dayMonthPart = m.dateParts.find((p) => p.key === 'dayMonth')
  c1(\`[\${lang}] مقطع اليوم بلا أرقام\`, !!weekdayPart && !HAS_DIGIT.test(weekdayPart.text))
  c1(\`[\${lang}] مقطع التاريخ يحمل الرقم وحده\`, !!dayMonthPart && HAS_DIGIT.test(dayMonthPart.text))
  // النموذج يؤلّف بأرقام لاتينية والتحويل عند العرض — لولا التثبيت لاختلف النظامان.
  c1(\`[\${lang}] الرقم لاتيني في النموذج (التحويل عند العرض)\`, !!dayMonthPart && /[0-9]/.test(dayMonthPart.text))
  // ↺ محاكاة الارتداد: إعادة خبز المقطعين نصًّا واحدًا يجب أن تُسقط الثابت باسمه.
  const regressed = [{ text: \`\${weekdayPart?.text ?? ''} · \${dayMonthPart?.text ?? ''}\` }]
  cx(\`[\${lang}] إعادة خبز التاريخ نصًّا واحدًا تُسقط ثابت العزل باسمه\`, !partsAreIsolated(regressed))
}

// ── ①-ب وجهات البطاقات: كلّها حقيقية، ولا فعل مستحيل على الويب ─────────────
const destinations = new Set<string>()
const labels: string[] = []
const scenarios: { name: string; seed: () => void }[] = [
  { name: 'newUser', seed: () => { ls.clear(); seedMigrated() } },
  { name: 'normal-no-steps', seed: () => { ls.clear(); seedMigrated(); seedOnboarded(); seedNutrition(1320, 125) } },
  { name: 'normal-with-steps', seed: () => { ls.clear(); seedMigrated(); seedOnboarded(); seedSteps(8000); seedNutrition(1320, 125) } },
]
for (const s of scenarios) {
  s.seed()
  const m = buildTodayV2Model(base(), 'ar')
  for (const card of m.cards) { if (card.destination) destinations.add(card.destination); labels.push(card.label) }
  if (m.hero.destination) destinations.add(m.hero.destination)
  c1(\`[\${s.name}] كل بطاقة لها وجهة (لا إحصاء ميّت)\`, m.cards.every((card) => card.destination !== null))
}
;(globalThis as Record<string, unknown>).__DESTINATIONS__ = Array.from(destinations)

// بطاقة الحركة بلا خطوات: تسجيل يدوي على شاشة الخطوات، لا «تفعيل عدّاد» في الإعدادات.
{
  ls.clear(); seedMigrated(); seedOnboarded(); seedNutrition(1320, 125)
  const m = buildTodayV2Model(base(), 'ar')
  const move = m.cards.find((card) => card.tone === 'move')
  c1('بطاقة الحركة بلا خطوات تهبط على شاشة الخطوات', move?.destination === 'steps')
  c1('لا وعد بـ«تفعيل عدّاد» لا وجود له على الويب', !labels.some((l) => l.includes('فعّل عدّاد')))
  c1('سطر الثقة يقول مصدر الرقم لا «مصدر غير مربوط»', (m.trustNote ?? '').includes('تسجيلك') && !(m.trustNote ?? '').includes('مربوط'))
  cx('النصّ القديم «مصدر الحركة مو مربوط» يُسقط فحص الثقة باسمه', !('ما نعرض خطوات وهمية — مصدر الحركة مو مربوط.'.includes('تسجيلك')))
}
// بطاقة الحركة مع خطوات ناقصة: الوجهة شاشة الخطوات لا شاشة التقدّم العامة.
{
  ls.clear(); seedMigrated(); seedOnboarded(); seedSteps(8000); seedNutrition(1320, 125)
  const m = buildTodayV2Model(base(), 'ar')
  const move = m.cards.find((card) => card.tone === 'move')
  c1('بطاقة «امشِ … خطوة» تهبط على شاشة الخطوات', move?.destination === 'steps')
}

// ── ①-ج سند المدّة: مصنَّف بصدق، لا «تقديري» على كل شيء ────────────────────
{
  ls.clear(); seedMigrated(); seedOnboarded(); seedNutrition(1320, 125)
  const withPlan = buildTodayV2Model(base(), 'ar')
  c1('مدّة محسوبة من تمارين اليوم ⇒ السند «estimated»', withPlan.durationSource === 'estimated' && withPlan.durationMin > 0)

  const c = getDefaultCustomization()
  const noPlan = base({ workoutPlan: { ...c.workoutPlan, days: [] } })
  const mPref = buildTodayV2Model(noPlan, 'ar')
  c1('بلا تمارين والمدّة من إعداد المستخدم ⇒ السند «preference»', mPref.durationSource === 'preference' && mPref.durationMin === 45)

  const none = base({ workoutPlan: { ...c.workoutPlan, days: [] }, profile: { ...c.profile, name: 'أحمد', goal: 'cut', workoutDuration: 0 } })
  const mNone = buildTodayV2Model(none, 'ar')
  c1('بلا تمارين وبلا إعداد ⇒ لا رقم ولا وسم («none»)', mNone.durationSource === 'none' && mNone.durationMin === 0)

  // ↺ التعميم المحظور: لو صار السند ثابتًا «تقديريًّا» لانهار التمييز — وهو ما
  //   يمنعه الفحص أعلاه صراحةً. نحاكيه هنا لنُثبت أنه يسقط باسمه لا بالصدفة.
  const collapsed = (_: unknown) => 'estimated'
  cx('تعميم «تقديري» على كل مدّة يُسقط تمييز السند باسمه', collapsed(mPref) !== mPref.durationSource)
}

// ── ①-د صدق كتابة الخطوات: الفشل يُكشف بالقراءة بعد الكتابة ────────────────
{
  ls.clear()
  const first = setSteps(4200)
  ;(globalThis as Record<string, unknown>).__failWrites = true
  const requested = setSteps(9999)
  const persisted = getSteps()
  c1('عقد التأكيد: القيمة لم تستقرّ عند فشل التخزين', persisted !== requested && persisted === first)
  c1('الرقم القديم باقٍ كما هو (لا فقدان بيانات عند الفشل)', persisted === 4200)
  // ↺ العقد الساذج — الاكتفاء بمخرج \`setSteps\` — **لا يكشف الفشل**. وهذا هو
  //   بالضبط ما كانت الشاشة ستعلن عليه «محفوظ».
  cx('الاكتفاء بمخرج setSteps وحده لا يكشف الفشل (فيلزم التأكيد)', requested === 9999)
  ;(globalThis as Record<string, unknown>).__failWrites = false
  const recovered = setSteps(7000)
  c1('عودة التخزين ⇒ الكتابة تستقرّ ويُقرأ الجديد', getSteps() === recovered && recovered === 7000)
}

;(globalThis as Record<string, unknown>).__PROOF__ = out
`

const built = await build({
  stdin: { contents: SNIPPET, resolveDir: root, loader: 'ts', sourcefile: 'today-coherence-proof.ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'today-coherence-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, built.outputFiles[0].text)

console.log('\n① السلوك — النموذج فوق تخزين مُحاكى')
await import(pathToFileURL(file).href)
for (const row of globalThis.__PROOF__ ?? []) {
  if (row.counter) counterCheck(row.label, row.ok)
  else check(row.label, row.ok)
}

// ── ①-هـ الوجهات مقابل جدول المسارات الفعلي ────────────────────────────────
const routesSrc = read('src/lib/appRoutes.ts')
const declared = new Set(Array.from(routesSrc.matchAll(/^\s*'([a-zA-Z]+)',$/gm), (m) => m[1]))
const used = globalThis.__DESTINATIONS__ ?? []
check(`جدول المسارات مقروء (${declared.size} مسارًا)`, declared.size > 10)
check(
  `كل وجهة تُصدرها الرئيسية مسار معلَن (${used.length} وجهة)`,
  used.length > 0 && used.every((d) => declared.has(d)),
)
counterCheck('وجهة مخترَعة تُسقط فحص المسارات باسمه', !used.concat('stepsCounter').every((d) => declared.has(d)))

// ═══ ② القسم البنيوي — مقترن بالوسم نفسه، لا رضا من مواضع متفرّقة ═══════════
const today = read('src/views/TodayV2.tsx')
const model = read('src/lib/todayV2Model.ts')
const rings = read('src/components/today/DailyRingsCard.tsx')
const next = read('src/components/today/NextActionCard.tsx')
const steps = read('src/views/StepsView.tsx')
const dict = read('src/i18n/dict/todayCoherence.ts')

console.log('\n② سطر التاريخ — العزل بنيوي لا نصّي')
const dateBlock = today.slice(today.indexOf('{model.dateParts.map('), today.indexOf('</p>', today.indexOf('{model.dateParts.map(')))
check('الرئيسية تصيّر المقاطع لا نصًّا مجموعًا', dateBlock.length > 0 && dateBlock.includes('<bdi dir="auto">{loc(part.text)}</bdi>'))
check('الفاصل وسمٌ مخفيّ عن قارئ الشاشة لا محرف داخل النصّ', dateBlock.includes('aria-hidden="true"') && dateBlock.includes('·'))
check('لا حقل `dateLabel` مجموع في النموذج', !model.includes('dateLabel'))
check('التقويم والأرقام مثبَّتان صراحةً في Intl', model.includes("'ar-u-ca-gregory-nu-latn'") && model.includes("'en-US-u-ca-gregory-nu-latn'"))
{
  const regressed = today.replace(dateBlock, '{loc(model.dateParts.map((p) => p.text).join(\' · \'))}')
  const block = regressed.slice(regressed.indexOf('{model.dateParts.map('), regressed.indexOf('</p>', regressed.indexOf('{model.dateParts.map(')))
  counterCheck('إعادة الجمع نصًّا واحدًا تُسقط فحص العزل باسمه', !block.includes('<bdi dir="auto">{loc(part.text)}</bdi>'))
}
{
  const regressed = model.replace('const durationSource', 'const dateLabel = `x · y`\n  const durationSource')
  counterCheck('إعادة `dateLabel` المجموع إلى النموذج تُسقط فحص الغياب باسمه', regressed.includes('dateLabel'))
}

console.log('\n③ الوحدة العربية خارج المدى اليساري المفروض')
/** الخليّة وحدها هي نطاق الفحص — ذكرٌ متفرّق في الملف لا يُرضيه (§4.2). */
const macroCell = (src) => {
  const open = src.indexOf('<span className="whitespace-nowrap text-[12px]')
  return open < 0 ? '' : src.slice(open, src.indexOf('</li>', open))
}
const macroLine = macroCell(rings)
check('نسبة الماكرو معزولة رقميًّا والوحدة خارجها', macroLine.includes('<bdi dir="ltr">') && macroLine.includes('</bdi> {d.gramsShort}'))
const LTR_BLOCK_WITH_ARABIC_UNIT = /dir="ltr"[^>]*>\s*\{?[^<]*d\.gramsShort/
check('لا `dir="ltr"` على كتلة تحوي وحدة عربية', !LTR_BLOCK_WITH_ARABIC_UNIT.test(rings))
{
  // ↺ إعادة الشكل القديم حرفيًّا — الوحدة داخل فقرة يسارية مفروضة — يجب أن يقلبه.
  const oldForm = rings.replace(
    '<span className="whitespace-nowrap text-[12px] leading-none text-ink-500 tabular-nums">',
    '<span dir="ltr" className="whitespace-nowrap text-[11px] leading-none text-ink-400 tabular-nums">{has ? `x ${d.gramsShort}` : \'—\'}',
  )
  counterCheck('إعادة الوحدة داخل فقرة يسارية مفروضة يقلب الحارس باسمه', LTR_BLOCK_WITH_ARABIC_UNIT.test(oldForm))
}
const statBlock = steps.slice(steps.indexOf('function StatCard'), steps.indexOf('</article>'))
check('بطاقة الإحصاء تعزل الرقم وتُخرج الوحدة', statBlock.includes('<bdi dir="ltr">{value}</bdi>') && statBlock.includes('{unit ? ` ${unit}` : \'\'}'))
check('السلسلة تمرّر الوحدة منفصلة لا ملحومة بالرقم', steps.includes('value={number(model.streakDays, lang)} unit={copy.days}'))
{
  const regressed = statBlock.replace('<bdi dir="ltr">{value}</bdi>', '{value}')
  counterCheck('إعادة الرقم بلا عزل تُسقط فحص بطاقة الإحصاء باسمه', !regressed.includes('<bdi dir="ltr">{value}</bdi>'))
}
{
  const regressed = rings.replace('</bdi> {d.gramsShort}', ' ${d.gramsShort}</bdi>')
  counterCheck('لحم الوحدة داخل المدى المعزول يُسقط فحص الماكرو باسمه', !macroCell(regressed).includes('</bdi> {d.gramsShort}'))
}

console.log('\n④ سند كل رقم — والوسم لا يعمَّم')
const durationMetric = next.slice(next.indexOf('<Metric\n              label={d.metaDuration}'), next.indexOf('/>', next.indexOf('<Metric\n              label={d.metaDuration}')))
check('مقياس المدّة يحمل وسم سنده مقترنًا به', durationMetric.length > 0 && durationMetric.includes('note={durationSource ===') && durationMetric.includes('noteAria={durationSource ==='))
check('الوسم مشتقّ من النموذج لا من استنتاج في الواجهة', !code(next).includes('estimateDurationMin') && next.includes("durationSource: TodayV2Model['durationSource']"))
// **التعميم محظور**: «تمارين» و«مجموعات» أرقام مقيسة من الخطة — وسمها «تقديريًّا» كذب.
check('مقياس التمارين مقيس فلا وسم له', next.includes('<Metric label={d.metaExercises} value={n(training.exerciseCount)} />'))
check('مقياس المجموعات مقيس فلا وسم له', next.includes('<Metric label={d.metaSets} value={n(training.setCount)} />'))
check('الوصف الكامل للسند يصل قارئ الشاشة', next.includes('<span className="sr-only">{noteAria ?? note}</span>'))
{
  const regressed = next.replace('note={durationSource ===', 'note={null && durationSource ===')
  const block = regressed.slice(regressed.indexOf('<Metric\n              label={d.metaDuration}'), regressed.indexOf('/>', regressed.indexOf('<Metric\n              label={d.metaDuration}')))
  counterCheck('نزع وسم السند عن المدّة يُسقط الفحص باسمه', !block.includes('note={durationSource ==='))
}
{
  const regressed = next.replace('<Metric label={d.metaExercises} value={n(training.exerciseCount)} />', '<Metric label={d.metaExercises} value={n(training.exerciseCount)} note={c.durationEstimate} />')
  counterCheck('وسم «تقديري» على رقم مقيس يُسقط فحص عدم التعميم باسمه', !regressed.includes('<Metric label={d.metaExercises} value={n(training.exerciseCount)} />'))
}

console.log('\n⑤ الخطوات — تسجيل حقيقي، ولا سطح ربط في بناء الويب')
check('عقد الكتابة المؤكَّدة موجود بالقراءة بعد الكتابة', steps.includes('const requested = setSteps(value)') && steps.includes('const persisted = getSteps()') && steps.includes('ok: persisted === requested'))
check('الهدف اليومي بنفس عقد التأكيد', steps.includes('const persisted = loadStepGoal()') && steps.includes('ok: persisted === requested'))
// اقتران الترتيب: الفشل يُفحص **ويُعاد منه** قبل أي إعلان نجاح.
const commitBody = steps.slice(steps.indexOf('const commit = (value: number) => {'), steps.indexOf('const commitGoal = () => {'))
/**
 * اقتران الترتيب — لا يكفي **وجود** الفحص، بل موضعه:
 *   ① حارس الفشل موجود، ② يعقبه خروج مبكر، ③ وكلاهما **قبل** أي إعلان نجاح.
 * ولذلك يُشترط `guard >= 0` صراحةً: بلا هذا الشرط يُرضي الفحصَ **غيابُ الحارس
 * أصلًا** (`indexOf` تعيد ‎-1‎ وهي أصغر من أي موضع) — أي أن نزع الحارس كان
 * سيمرّ. مرورٌ غير مستحقّ ليس نجاحًا (§4.2).
 */
const failsBeforeSuccess = (body) => {
  const guard = body.indexOf('if (!result.ok)')
  const success = body.indexOf('ok: true')
  const bail = body.indexOf('return', guard)
  return guard >= 0 && success > guard && bail > guard && bail < success
}
check('الفشل يُفحص ويُعاد منه قبل أي رسالة نجاح', failsBeforeSuccess(commitBody))
check('الهدف اليومي بنفس ترتيب الحراسة', failsBeforeSuccess(steps.slice(steps.indexOf('const commitGoal = () => {'), steps.indexOf('return (\n    <section aria-labelledby="steps-manual-title"'))))
check('حقل مجموع اليوم موجود ومسمّى', steps.includes('id="steps-manual-input"') && steps.includes('htmlFor="steps-manual-input"'))
check('هدف اللمس ٤٤بك في كل عناصر التسجيل', (steps.match(/min-h-\[44px\]/g) ?? []).length >= 5)
check('رسائل الحالة تُعلَن لقارئ الشاشة', (steps.match(/role="status"/g) ?? []).length >= 2)
// سطح الربط/التحديث محبوس داخل بوّابة الغلاف الأصلي — اقترانًا لا ذكرًا متفرّقًا.
const beforeRefresh = steps.slice(0, steps.indexOf('data-testid="steps-refresh"'))
check('زرّ التحديث الصحي داخل بوّابة الغلاف الأصلي', beforeRefresh.lastIndexOf('native && (model?.hasData || health.enabled)') > beforeRefresh.lastIndexOf('</section>'))
check('علم المنصّة من القدرة لا من التفضيل', steps.includes('const native = isHealthKitPlatform()'))
check('لا استدعاء ربط صحي من شاشة الخطوات', !code(steps).includes('connectHealthKit('))
{
  const regressed = steps.replace('native && (model?.hasData || health.enabled)', '(model?.hasData || health.enabled)')
  const before = regressed.slice(0, regressed.indexOf('data-testid="steps-refresh"'))
  counterCheck('نزع بوّابة الغلاف عن زرّ التحديث يُسقط الفحص باسمه', !(before.lastIndexOf('native && (model?.hasData || health.enabled)') > before.lastIndexOf('</section>')))
}
{
  const regressed = commitBody.replace('if (!result.ok) {', 'if (false) {')
  counterCheck('نزع حارس الفشل يُسقط فحص الترتيب باسمه', !failsBeforeSuccess(regressed))
}
{
  // ↺ التفافٌ أدقّ: الحارس باقٍ لكنّ رسالة النجاح رُفعت فوقه — الترتيب هو المقصد.
  const reordered = commitBody.replace('const result = commitStepsChecked(value)', "const result = commitStepsChecked(value)\n    setStatus({ ok: true, text: c.manualSaved('') })")
  counterCheck('رفع رسالة النجاح فوق الحارس يُسقط فحص الترتيب باسمه', !failsBeforeSuccess(reordered))
}

console.log('\n⑥ النصوص في قاموس الحارة بلغتين')
check('قاموس مستقلّ للحارة', dict.includes('export const todayCoherenceStrings'))
check('العربية والإنجليزية معًا', dict.includes('const ar: TodayCoherenceStrings') && dict.includes('const en: TodayCoherenceStrings'))
{
  const keys = (block) => Array.from(block.matchAll(/^\s{2}([a-zA-Z]+):/gm), (m) => m[1])
  const arKeys = keys(dict.slice(dict.indexOf('const ar: TodayCoherenceStrings'), dict.indexOf('const en: TodayCoherenceStrings')))
  const enKeys = keys(dict.slice(dict.indexOf('const en: TodayCoherenceStrings')))
  check(`كل مفتاح عربي له نظير إنجليزي (${arKeys.length} مفتاحًا)`, arKeys.length > 15 && arKeys.every((k) => enKeys.includes(k)))
  counterCheck('مفتاح بلا نظير إنجليزي يُسقط فحص الاكتمال باسمه', !arKeys.every((k) => enKeys.concat().filter((x) => x !== arKeys[0]).includes(k)))
}
const hardcodedArabic = (src) => /[؀-ۿ]/.test(code(src))
check('لا نصّ عربي صلب في مكوّن التسجيل اليدوي', !hardcodedArabic(steps.slice(steps.indexOf('function ManualStepsCard'), steps.indexOf('function StatCard'))))
{
  const smuggled = steps.replace('{c.manualTitle}', "{'سجّل خطوات اليوم'}")
  counterCheck('نصّ عربي مدسوس في الكود يقلب حارس النصّ الصلب', hardcodedArabic(smuggled.slice(smuggled.indexOf('function ManualStepsCard'), smuggled.indexOf('function StatCard'))))
}

if (fails.length > 0) {
  console.log(`\n❌ تماسك اليوم: ${pass} نجحت، ${fails.length} فشلت:`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`\n✅ تماسك اليوم: ${pass} فحصًا (منها ${counter} تأكيدًا مضادًّا)، 0 فشل.`)
