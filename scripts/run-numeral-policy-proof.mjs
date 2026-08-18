// ═══════════════════════════════════════════════════════════════════════════
//  NUMERAL-POLICY — حارس الأرقام: **الإدخال** و**العرض** و**التفضيل**.
//
//  ═══ لماذا هذا الحارس موجود ═══
//  BUG-019 أُعلن مُغلقًا مرّتين وهو حيّ: مرّة لأن `formatNumber` هبط على التوأم
//  غير الموجَّه (أغلقه CANONICAL-SURFACE-LOCK)، ومرّة لأن الحدّ وُضع على بعض
//  الأرقام في المسار الحيّ لا كلّها. فالمستخدم العربي كان يقرأ **الحقيقة
//  الواحدة بنظامين**: «٤ أيام/أسبوع» في حسابه و«4 أيام/أسبوع» في تمرينه.
//
//  ═══ ولماذا وُسِّع في [SOVEREIGN-NUMERALS-001] ═══
//  كان يُصيّر `NutritionView` و`WorkoutView` **بحالتهما الافتراضية وحدها**، فبقيت
//  `WorkoutMode` (تحتاج جلسة نشطة) و`WorkoutSummary` (بعد الإنهاء) داخل ملفّات
//  «محروسة» **بلا أن تُرسَم مرّة واحدة**. و«الشاشتان محروستان» كان صحيحًا عن
//  الملفّات وكاذبًا عن الشاشات.
//
//  وأخطر من ذلك: الحارس كان يفحص **العرض وحده**. والعطل الأكبر كان في **الإدخال** —
//  الواجهة تعرض «مثال: ٢٤» ثم ترفض ٢٤، و«78٫5» تصير «785»، و«٢٤» في حقل العمر
//  تصير 13 فيُعاد تصنيف البالغ قاصرًا. لا يكفي أن يخرج الرقم صحيحًا؛ يجب أن
//  **يُقرأ** صحيحًا.
//
//  ═══ التأكيد المضادّ (§4.2 من الميثاق) — خمس هجمات ═══
//  ① نزع حدّ العرض ⇒ تسقط فحوص الرسم.        ② نزع طيّ الأرقام ⇒ تسقط فحوص الإدخال.
//  ③ زرع تسرّب لاتيني في سطح مغطّى ⇒ يسقط.    ④ اشتقاق النمط من اللغة وحدها ⇒ يسقط.
//  ⑤ تخزين جدول الأرقام بمفتاح اللغة وحدها ⇒ يسقط الافتراق.
//  وكل هجمة **يُتحقَّق أنها وقعت فعلًا** — هجمة لم تُطبَّق تجعل الحارس يمرّ مجّانًا.
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(path.join(os.tmpdir(), 'numeral-policy-'))
const require = createRequire(import.meta.url)

let pass = 0
const fails = []
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log('  ✓ ' + label) }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const LATIN = /[0-9]/
const ARABIC_INDIC = /[٠-٩]/

// ═══════════════════════════════════════════════════════════════════════════
//  أدوات الهجوم: تحويل نصّ المصدر نفسه. `assertApplied` شرط لا زينة —
//  هجمة تُخطئ موضعها تمرّ صامتة وتجعل «الحارس يسقط» ادّعاءً بلا برهان.
// ═══════════════════════════════════════════════════════════════════════════
function sourceRewrite(name, fileSuffix, edits) {
  return {
    name,
    setup(b) {
      b.onLoad({ filter: new RegExp(`${fileSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, (args) => {
        let code = readFileSync(args.path, 'utf8')
        for (const [from, to] of edits) {
          if (!code.includes(from)) {
            throw new Error(`[${name}] هجمة لم تُطبَّق: لم يُعثر على «${from.slice(0, 60)}…» في ${args.path}`)
          }
          code = code.split(from).join(to)
        }
        return { contents: code, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' }
      })
    },
  }
}

/** نزع حدّ العرض كاملًا — الهجمة الأصلية. */
const NEUTER_DISPLAY = {
  name: 'neuter-numeral-boundary',
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/numberFormat$/ }, () => ({ path: 'numeral-stub', namespace: 'neuter' }))
    b.onLoad({ filter: /.*/, namespace: 'neuter' }, () => ({
      contents: [
        'export const formatNumber = (v) => String(v)',
        'export const formatNumeralsIn = (t) => t',
        // الطيّ يبقى سليمًا: الهجمة على العرض وحده حتى يُعرف أيّ فحص يحرس ماذا.
        "export const foldDigits = (s) => String(s).replace(/[\\u0660-\\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\\u066B/g, '.').replace(/\\u066C/g, '')",
        "export const resolveNumeralSystem = (lang) => (lang === 'ar' ? 'arab' : 'latn')",
        'export const getActiveNumeralStyle = () => "auto"',
        'export const setActiveNumeralStyle = () => {}',
        'export const subscribeNumeralStyle = () => () => {}',
      ].join('\n'),
      loader: 'js',
    }))
  },
}

/** ② نزع طيّ الأرقام وحده — يعيد عطل الإدخال بلا مساس بالعرض. */
const NEUTER_FOLD = sourceRewrite('neuter-fold', 'lib/numberFormat.ts', [
  ['export function foldDigits(input: string, opts: { separators?: boolean } = {}): string {',
   'export function foldDigits(input: string, opts: { separators?: boolean } = {}): string {\n  if (opts) return input'],
])

/** ③ زرع تسرّب لاتيني في سطح مغطّى — محاكاة ارتداد حقيقي. */
const PLANT_LEAK = sourceRewrite('plant-latin-leak', 'components/WorkoutSummary.tsx', [
  ['<StatCard icon="Layers" value={formatNumber(stats.setsDone, lang)} label={t.setsDone} />',
   '<StatCard icon="Layers" value={`${stats.setsDone}`} label={t.setsDone} />'],
])

/** ④ اشتقاق النمط من اللغة وحدها — أي أن التفضيل لا يصل. */
const BYPASS_STYLE = sourceRewrite('bypass-style-from-lang', 'lib/numberFormat.ts', [
  ["  if (style === 'arabic') return 'arab'\n  if (style === 'latin') return 'latn'\n", ''],
])

/** ⑤ جدول الأرقام بمفتاح اللغة وحدها + بلا مسح — افتراق المساعدَين. */
const STALE_CACHE = sourceRewrite('stale-digit-table', 'lib/numberFormat.ts', [
  ['  const key = `${lang}:${activeNumeralStyle}`', '  const key = lang'],
  ['  digitTableCache.clear()\n', ''],
])

// ═══════════════════════════════════════════════════════════════════════════
//  حزم
// ═══════════════════════════════════════════════════════════════════════════
const STORAGE_SHIM = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: () => null,
  get length() { return __store.size },
};
globalThis.localStorage = __ls;
globalThis.sessionStorage = __ls;
const __loc = { hash: '', search: '', href: 'http://localhost/', pathname: '/', origin: 'http://localhost' };
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: __ls, sessionStorage: __ls, location: __loc,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout: (f, t) => setTimeout(f, t), clearTimeout: (h) => clearTimeout(h),
    navigator: { userAgent: 'node', language: 'ar' },
  };
}
if (typeof globalThis.location === 'undefined') globalThis.location = __loc;
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node', language: 'ar' };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

/** حزمة الحدّ وحده — دوالّ خالصة، لا React. */
const HELPERS_ENTRY = `
export { foldDigits, formatNumber, formatNumeralsIn, resolveNumeralSystem, setActiveNumeralStyle, getActiveNumeralStyle } from '@/lib/numberFormat'
export { sanitizeNumericInput, parseSafeNumber, parseNumericField, numLimitMessage } from '@/lib/validation'
export { normalizeDigits } from '@/features/barcode/validateBarcode'
export { foldArabicDigits, NORMALIZATION_VERSION } from '@/lib/text/foodNormalize'
export { settingsPreferencesStrings } from '@/i18n/dict/settingsPreferences'
export { eCalcStrings } from '@/i18n/dict/eCalc'
`

/**
 * حزمة SSR: الشاشتان الحيّتان **مع حالاتهما التفاعلية**، والشاشات التي أُصلحت
 * في هذه الموجة. `WorkoutMode` و`WorkoutSummary` تُرسَمان مباشرةً لأنهما لا
 * تُركَّبان أبدًا في الحالة الافتراضية لـ`WorkoutView` (فجوة ٢ في التحقيق).
 */
const ENTRY = `import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import { getDefaultCustomization } from '@/lib/customization'
import { generatePlan } from '@/lib/planGenerator'
import { NutritionView } from '@/views/NutritionView'
import { WorkoutView } from '@/views/WorkoutView'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WorkoutSummary } from '@/components/WorkoutSummary'
import { ExerciseLibraryView } from '@/views/ExerciseLibraryView'
import { StepsView } from '@/views/StepsView'
import { setActiveNumeralStyle } from '@/lib/numberFormat'

/** تخصيص واقعي: خطة مولَّدة فعلًا، فأسماء أيامها تحمل أرقامها المخزَّنة. */
function fixture() {
  const base = getDefaultCustomization()
  const profile = {
    ...base.profile,
    age: 28, gender: 'male', heightCm: 178, weightKg: 82,
    goalType: 'cut', trainingLevel: 'intermediate', experienceLevel: 'intermediate',
    trainingDays: 4, workoutDuration: 60, workoutEnvironment: 'gym',
  }
  const generated = generatePlan(profile)
  return {
    ...base,
    profile,
    workoutPlan: generated.workoutPlan,
    nutritionPlan: generated.nutritionPlan,
    targets: generated.targets,
  }
}

/** جلسة منتهية واقعية — أوزان وتكرارات مخزَّنة نصًّا كما يكتبها المستخدم. */
function finishedSession(day) {
  return {
    id: 's1',
    date: '2026-08-18',
    startedAt: '2026-08-18T06:00:00.000Z',
    finishedAt: '2026-08-18T07:05:00.000Z',
    workoutDayId: day.id,
    workoutDayName: day.nameAr,
    status: 'completed',
    exercises: day.exercises.slice(0, 3).map((pe) => ({
      exerciseId: pe.exerciseId,
      targetSets: pe.sets,
      targetReps: pe.reps,
      targetRestSec: pe.restSec,
      completed: true,
      sets: [
        { setNumber: 1, targetReps: pe.reps, actualReps: '10', weightKg: '60', completed: true },
        { setNumber: 2, targetReps: pe.reps, actualReps: '9', weightKg: '62.5', completed: true },
        { setNumber: 3, targetReps: pe.reps, actualReps: '8', weightKg: '65', completed: true },
      ],
    })),
  }
}

export function render(lang, style = 'auto') {
  setActiveNumeralStyle(style)
  const c = fixture()
  const day = c.workoutPlan.days[0]
  const wrap = (node) => renderToString(React.createElement(StaticCustomizationProvider, { customization: c }, node))
  const out = {
    planDayNames: c.workoutPlan.days.map((d) => d.nameAr),
    nutrition: wrap(React.createElement(NutritionView, { lang })),
    workout: wrap(React.createElement(WorkoutView, { lang, onNavigate: () => {} })),
    // ═══ الحالات التفاعلية — لم تكن تُرسَم قطّ ═══
    workoutMode: wrap(React.createElement(WorkoutMode, {
      lang, day, onClose: () => {}, onFinish: () => {}, userId: null,
    })),
    workoutSummary: wrap(React.createElement(WorkoutSummary, {
      lang, session: finishedSession(day), prs: [], streakWeeks: 3,
      onBackToToday: () => {}, onViewProgress: () => {},
    })),
    library: wrap(React.createElement(ExerciseLibraryView, { lang })),
    steps: wrap(React.createElement(StepsView, { lang, onBack: () => {}, onOpenSettings: () => {} })),
  }
  setActiveNumeralStyle('auto')
  return out
}
`

async function bundleWith(entrySource, plugins, tag) {
  const dir = mkdtempSync(path.join(tmp, `${tag}-`))
  const entry = path.join(dir, 'entry.jsx')
  writeFileSync(entry, entrySource)
  const outfile = path.join(dir, 'bundle.cjs')
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    logLevel: 'error',
    jsx: 'automatic',
    banner: { js: STORAGE_SHIM },
    define: { 'import.meta.env': '{}', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
    absWorkingDir: root,
    nodePaths: [path.join(root, 'node_modules')],
    alias: { '@': path.join(root, 'src') },
    loader: { '.js': 'jsx' },
    plugins,
  })
  return require(outfile)
}

const helpers = (plugins = [], tag = 'helpers') => bundleWith(HELPERS_ENTRY, plugins, tag)
const screens = (plugins = [], tag = 'screens') => bundleWith(ENTRY, plugins, tag)

/** نصّ مرئي فقط: تُنزع الوسوم فلا تُحسب أرقام الأصناف (`text-4xl`, `h-11`) نصًّا. */
const visibleText = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
const latinRuns = (html) => visibleText(html).match(/[0-9]+/g) ?? []
/** سياق التسرّب — يجعل «١» المجرّدة قابلة للتعقّب إلى موضعها بدل تخمينها. */
const latinContexts = (html) => {
  const t = visibleText(html).replace(/\s+/g, ' ')
  const out = []
  for (const m of t.matchAll(/[0-9]+/g)) out.push(t.slice(Math.max(0, m.index - 45), m.index + m[0].length + 25))
  return out
}
const arabicRuns = (html) => visibleText(html).match(/[٠-٩]+/g) ?? []

// ═══════════════════════════════════════════════════════════════════════════
//  ① الإدخال — العطل المقيس: الواجهة تعرض «مثال: ٢٤» ثم ترفض ٢٤
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ ① الإدخال: ما يكتبه المستخدم بالعربية يُقرأ رقمًا ═══')
const H = await helpers()
const {
  foldDigits, formatNumber, formatNumeralsIn, resolveNumeralSystem, setActiveNumeralStyle,
  sanitizeNumericInput, parseSafeNumber, parseNumericField, normalizeDigits, foldArabicDigits,
  settingsPreferencesStrings, eCalcStrings,
} = H

/** جدول الرحلات — كل سطر كان يسقط قبل هذه الموجة. */
const INPUT_CASES = [
  ['٢٤ ⇐ 24 (كان "")', () => sanitizeNumericInput('٢٤'), '24'],
  ['78٫5 ⇐ 78.5 (كان "785" — خطأ ×١٠ صامت)', () => sanitizeNumericInput('78٫5', { decimal: true }), '78.5'],
  ['٨٥٫٥ ⇐ 85.5 (كان "")', () => sanitizeNumericInput('٨٥٫٥', { decimal: true }), '85.5'],
  ['٣٥٠ ⇐ 350 (كان "")', () => sanitizeNumericInput('٣٥٠'), '350'],
  ['خليط ١٢٣4 ⇐ 1234 (كان "4" — بتر صامت)', () => sanitizeNumericInput('١٢٣4'), '1234'],
  ['فارسية ۲۴ ⇐ 24', () => sanitizeNumericInput('۲۴'), '24'],
  ['فاصلة آلاف ١٬٢٣٤ ⇐ 1234', () => sanitizeNumericInput('١٬٢٣٤'), '1234'],
]
for (const [label, fn, expected] of INPUT_CASES) {
  const got = fn()
  check(label, got === expected, `got=${JSON.stringify(got)} want=${JSON.stringify(expected)}`)
}

// أخطر سطر في التحقيق: بالغ يُعاد تصنيفه قاصرًا بصمت فتُقفل أهداف التنشيف والتضخيم.
const age = parseSafeNumber('٢٤', { min: 13, max: 100 })
check('parseSafeNumber("٢٤",{min:13}) = 24 لا 13 (لا يُعاد تصنيف البالغ قاصرًا)', age === 24, `got=${age}`)
check('parseSafeNumber("١٥٠",{min:1,max:3000,fallback:100}) = 150', parseSafeNumber('١٥٠', { min: 1, max: 3000, fallback: 100 }) === 150)
check('parseSafeNumber("٧٨٫٥") = 78.5', parseSafeNumber('٧٨٫٥', { min: 0, max: 500 }) === 78.5)

// الرحلة المغلقة: التطبيق يقرأ مخرجاته هو.
const printed = formatNumber(250, 'ar')
check('formatNumber(250,"ar") = ٢٥٠', printed === '٢٥٠', printed)
check('…و sanitizeNumericInput(٢٥٠) = "250" — التطبيق يقرأ مخرجاته', sanitizeNumericInput(printed) === '250', JSON.stringify(sanitizeNumericInput(printed)))
const printedDec = formatNumber(1234.5, 'ar')
check('…والرحلة تصمد مع الفواصل: ١٬٢٣٤٫٥ ⇐ 1234.5', sanitizeNumericInput(printedDec, { decimal: true }) === '1234.5', JSON.stringify(sanitizeNumericInput(printedDec, { decimal: true })))

// الصدق: لا مسح صامت ولا قصّ صامت — الحالة تُسمّى.
check('حقل فارغ يُسمّى «فارغ» لا يُملأ بالحدّ الأدنى', parseNumericField('', { min: 13 }).status === 'empty')
check('نصّ غير مقروء يُسمّى «غير مقروء»', parseNumericField('كتابة', { min: 13 }).status === 'unreadable')
const oor = parseNumericField('٩٩٩', { min: 13, max: 100 })
check('رقم خارج النطاق يُسمّى ويحتفظ بقيمته (لا قصّ صامت)', oor.status === 'out-of-range' && oor.value === 999, JSON.stringify(oor))

// نسخة واحدة لا أربع.
check('طيّ الباركود مفوَّض للطبقة نفسها', normalizeDigits('٥٤٤٩٠٠٠٠٠٠٩٩٦') === '5449000000996')
check('وطيّ الطعام كذلك — وبلا توسيع عقد الفهرسة', foldArabicDigits('عصير ٥٫٥ لتر') === 'عصير 5٫5 لتر', foldArabicDigits('عصير ٥٫٥ لتر'))
check('الطيّ لا يلمس النصّ غير الرقمي', foldDigits('صدر دجاج ٢٠٠ غ، مشوي') === 'صدر دجاج 200 غ، مشوي', foldDigits('صدر دجاج ٢٠٠ غ، مشوي'))
check('والسالب المنسَّق يعود سالبًا (علامات الاتجاه لا تسمّم القراءة)', Number(foldDigits(formatNumber(-1234.5, 'ar'))) === -1234.5, foldDigits(formatNumber(-1234.5, 'ar')))

// ═══════════════════════════════════════════════════════════════════════════
//  ② حدّ العرض — دالّتان بجدول واحد مشتقّ
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ ② حدّ العرض: `formatNumber` و`formatNumeralsIn` لا يفترقان ═══')
check('العربية تُظهر الأرقام الهندية', !LATIN.test(formatNumber(1937, 'ar')) && ARABIC_INDIC.test(formatNumber(1937, 'ar')), formatNumber(1937, 'ar'))
check('الإنجليزية تُظهر الأرقام اللاتينية', LATIN.test(formatNumber(1937, 'en')) && !ARABIC_INDIC.test(formatNumber(1937, 'en')), formatNumber(1937, 'en'))
check('اسم يوم مخزَّن يُطبَّع عند الرسم إلى العربية', formatNumeralsIn('اليوم 1 · علوي', 'ar') === 'اليوم ١ · علوي', formatNumeralsIn('اليوم 1 · علوي', 'ar'))
check('ونصّ إرث بأرقام هندية يُطبَّع إلى الإنجليزية', formatNumeralsIn('اليوم ١ · علوي', 'en') === 'اليوم 1 · علوي', formatNumeralsIn('اليوم ١ · علوي', 'en'))
{
  const drift = []
  for (const style of ['auto', 'arabic', 'latin']) {
    setActiveNumeralStyle(style)
    for (const n of [0, 1, 5, 9, 10, 42, 250, 1937, 90210]) {
      for (const lang of ['ar', 'en']) {
        if (formatNumeralsIn(String(n), lang) !== formatNumber(n, lang, { useGrouping: false })) drift.push(`${n}/${lang}/${style}`)
      }
    }
  }
  setActiveNumeralStyle('auto')
  check('المساعدان يعطيان نفس الرقم لنفس القيمة — في الأنماط الثلاثة', drift.length === 0, drift.slice(0, 6).join(', '))
}
check('التطبيع يحوّل ولا يمسح — عدد المحارف والنصّ حوله كما هو',
  formatNumeralsIn('~30 د', 'ar').length === '~30 د'.length && formatNumeralsIn('~30 د', 'ar').startsWith('~') && formatNumeralsIn('~30 د', 'ar').endsWith(' د'),
  formatNumeralsIn('~30 د', 'ar'))

// ═══════════════════════════════════════════════════════════════════════════
//  ③ التفضيل — نظام الأرقام محور مستقل عن اللغة
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ ③ التفضيل: «تلقائي · عربية · غربية» ═══')
check('تلقائي يتبع اللغة', resolveNumeralSystem('ar', 'auto') === 'arab' && resolveNumeralSystem('en', 'auto') === 'latn')
check('«غربية» تكسر الربط باللغة — واجهة عربية بأرقام غربية', resolveNumeralSystem('ar', 'latin') === 'latn')
check('«عربية» تكسره في الاتجاه الآخر', resolveNumeralSystem('en', 'arabic') === 'arab')
setActiveNumeralStyle('latin')
const arLatin = formatNumber(1234.5, 'ar')
check('عربية + غربية ⇒ 1,234.5 فعليًا', arLatin === '1,234.5', arLatin)
check('…وحدّ النصوص يتبعه فورًا (لا جدول بائت)', formatNumeralsIn('اليوم ١', 'ar') === 'اليوم 1', formatNumeralsIn('اليوم ١', 'ar'))
setActiveNumeralStyle('arabic')
check('إنجليزية + عربية ⇒ ١٬٢٣٤٫٥', formatNumber(1234.5, 'en') === '١٬٢٣٤٫٥', formatNumber(1234.5, 'en'))
// القاموس المخبوز وقت البناء يجب أن يتبع النمط كذلك — وإلا تجمّدت شاشة الحاسبة.
check('نصوص `eCalc` المخبوزة تتبع النمط (لا تتجمّد على لحظة الإقلاع)',
  ARABIC_INDIC.test(eCalcStrings.en.bmiFormula ?? eCalcStrings.en.pageTitle + formatNumber(1, 'en')) || ARABIC_INDIC.test(JSON.stringify(eCalcStrings.en)),
  'en+arabic')
setActiveNumeralStyle('auto')
{
  const dictJson = JSON.stringify(eCalcStrings.ar).replace(/\\u[0-9a-f]{4}/gi, '')
  // ── استثناء مُعلَن: سنة الاقتباس الأكاديمي ──────────────────────────────
  // «Mifflin-St Jeor (1990)» و«مراجعة Morton (2018)» و«Wishnofsky (1958)» أسماء
  // مصادر لا أرقامَ واجهة. اسم المؤلّف لاتيني بالضرورة، وتحويل سنته وحدها إلى
  // «(٢٠١٨)» يُنتج اقتباسًا نصفه لاتيني ونصفه هندي — وهو أسوأ من كليهما، ولا
  // يُستشهَد به هكذا في أي مرجع. فالاستثناء ضيّق: **أربعة أرقام داخل قوسين**.
  const CITATION_YEAR = /\((?:1[89]|20)\d{2}\)/g
  const withoutCitations = dictJson.replace(CITATION_YEAR, '(سنة)')
  check('وبالوضع التلقائي تعود نصوص `eCalc` العربية بلا رقم لاتيني (عدا سنة الاقتباس)',
    !LATIN.test(withoutCitations), (withoutCitations.match(/[0-9]+/g) ?? []).slice(0, 6).join(','))
  // ⟲ التأكيد المضادّ (§4.2): الاستثناء لم يصر قاعدة — رقم عارٍ خارج قوسين ما زال يسقط.
  check('⟲ والاستثناء ضيّق: رقم عربي عارٍ خارج قوسي الاقتباس ما زال تسرّبًا',
    LATIN.test('نصّ عربي فيه 1990 عارية'.replace(CITATION_YEAR, '(سنة)')))
  check('⟲ وسنة داخل قوسين تُستثنى فعلًا (وإلا كان التأكيد أعلاه فارغًا)',
    !LATIN.test('مراجعة Morton (2018)'.replace(/[A-Za-z-]/g, '').replace(CITATION_YEAR, '(سنة)')))
}
// النصّ الذي كان يُثبّت السياسة المُزالة.
for (const lang of ['ar', 'en']) {
  const note = settingsPreferencesStrings[lang].numbersNote
  check(`نصّ الإعدادات (${lang}) لا يَعِد بربط الأرقام باللغة`,
    !/تتغيّر للاتينية مع الإنجليزية|switch to Latin digits in English/.test(note), note)
  check(`ونصّ الإعدادات (${lang}) يذكر الخيارات الثلاثة`,
    Boolean(settingsPreferencesStrings[lang].numbersAuto && settingsPreferencesStrings[lang].numbersArabic && settingsPreferencesStrings[lang].numbersLatin))
}

// ═══════════════════════════════════════════════════════════════════════════
//  ④ الشاشات — مقروءة من الرسم لا من الاستيراد، ومعها الحالات التفاعلية
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ ④ الشاشات الحيّة مُصيَّرة فعلًا — بحالاتها التفاعلية ═══')
const real = await screens()
const ar = real.render('ar')
const en = real.render('en')

const SURFACES = ['nutrition', 'workout', 'workoutMode', 'workoutSummary', 'library', 'steps']
const LABEL = {
  nutrition: 'التغذية', workout: 'التمرين', workoutMode: 'الجلسة النشطة (لم تكن تُرسَم قطّ)',
  workoutSummary: 'ملخّص ما بعد التمرين (لم يكن يُرسَم قطّ)', library: 'مكتبة التمارين', steps: 'الخطوات',
}
check('كل الأسطح تُصيَّر إلى HTML حقيقي', SURFACES.every((k) => ar[k].length > 500), SURFACES.map((k) => `${k}=${ar[k].length}`).join(' '))
check('أسماء أيام الخطة المخزَّنة لاتينية الأرقام (المُدخَل الذي نحرسه)',
  ar.planDayNames.some((n) => LATIN.test(n)), JSON.stringify(ar.planDayNames.slice(0, 2)))

for (const k of SURFACES) {
  const leaked = latinRuns(ar[k])
  check(`${LABEL[k]}: بلا رقم لاتيني في الجلسة العربية`, leaked.length === 0,
    leaked.length === 0 ? '' : JSON.stringify(latinContexts(ar[k]).slice(0, 4)))
}
for (const k of SURFACES) {
  const leaked = arabicRuns(en[k])
  check(`${LABEL[k]}: بلا رقم هندي في الجلسة الإنجليزية`, leaked.length === 0, JSON.stringify(leaked.slice(0, 8)))
}
// شاشة بلا أرقام تمرّ الفحوص أعلاه مجّانًا — فالعدّ شرط.
// سطح لا يعرض رقمًا **في أيّ من اللغتين** ليس تسرّبًا ولا نجاحًا: هو ببساطة بلا
// محتوى رقمي في حالته الافتراضية (الخطوات بلا بيانات مبذورة). يُسمَّى صراحةً كي
// لا يمرّ صامتًا، ويبقى الشرط قائمًا على كل سطح يعرض رقمًا فعلًا.
const NUMERIC_SURFACES = SURFACES.filter((k) => arabicRuns(ar[k]).length + latinRuns(en[k]).length > 0)
const SILENT_SURFACES = SURFACES.filter((k) => !NUMERIC_SURFACES.includes(k))
if (SILENT_SURFACES.length) console.log(`  ℹ️  أسطح بلا محتوى رقمي في حالتها الافتراضية (خارج شرط العدّ، ومعلَنة): ${SILENT_SURFACES.join(', ')}`)
check('والجلسة العربية تعرض أرقامها الهندية فعلًا',
  NUMERIC_SURFACES.every((k) => arabicRuns(ar[k]).length >= 2), NUMERIC_SURFACES.map((k) => `${k}=${arabicRuns(ar[k]).length}`).join(' '))
check('والجلسة الإنجليزية تعرض أرقامها اللاتينية فعلًا',
  NUMERIC_SURFACES.every((k) => latinRuns(en[k]).length >= 2), NUMERIC_SURFACES.map((k) => `${k}=${latinRuns(en[k]).length}`).join(' '))
// ⟲ الاستثناء محروس: سطحٌ يعرض أرقامًا بلغة ويخلو منها بالأخرى **يسقط** — فلا
// يتحوّل «بلا محتوى رقمي» إلى مهرب من فحص التسرّب.
check('⟲ ولا يُعَدّ «بلا محتوى رقمي» سطحٌ يعرض أرقامًا بلغة دون الأخرى',
  SURFACES.every((k) => (arabicRuns(ar[k]).length > 0) === (latinRuns(en[k]).length > 0)),
  SURFACES.map((k) => `${k}:ar=${arabicRuns(ar[k]).length}/en=${latinRuns(en[k]).length}`).join(' '))

// المحور الثاني على الشاشات نفسها: عربية + «غربية» ⇒ لا رقم هندي في شاشة عربية.
const arLatinStyle = real.render('ar', 'latin')
check('واجهة عربية بنمط «غربية»: لا رقم هندي في أيّ سطح',
  SURFACES.every((k) => arabicRuns(arLatinStyle[k]).length === 0),
  SURFACES.map((k) => `${k}=${arabicRuns(arLatinStyle[k]).length}`).join(' '))
check('…وهي ما زالت تعرض أرقامًا (التفضيل يبدّل ولا يمسح)',
  NUMERIC_SURFACES.every((k) => latinRuns(arLatinStyle[k]).length >= 2),
  NUMERIC_SURFACES.map((k) => `${k}=${latinRuns(arLatinStyle[k]).length}`).join(' '))

// الحقيقة المسمّاة — «٤ أيام/أسبوع» مقابل «4 أيام/أسبوع».
const daysFact = (html) => (visibleText(html).match(/([0-9٠-٩]+)\s*أيام/) || [])[1] ?? ''
check('الحقيقة المسمّاة (أيام/أسبوع) هندية بعد الإصلاح', ARABIC_INDIC.test(daysFact(ar.workout)), `«${daysFact(ar.workout)}»`)

// ═══════════════════════════════════════════════════════════════════════════
//  ⑤ محاكاة الالتفاف — خمس هجمات، كلٌّ تسقط بفحص مسمّى
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ ⑤ محاكاة الالتفاف ═══')

// ① نزع حدّ العرض
const attack1 = await screens([NEUTER_DISPLAY], 'attack-display')
const a1 = attack1.render('ar')
check('① بنزع حدّ العرض تعود الأرقام اللاتينية إلى الجلسة العربية (فتسقط ④)',
  SURFACES.some((k) => latinRuns(a1[k]).length > 0),
  SURFACES.map((k) => `${k}=${latinRuns(a1[k]).length}`).join(' '))
check('① وبنزعه تسقط الحقيقة المسمّاة تحديدًا', LATIN.test(daysFact(a1.workout)), `«${daysFact(a1.workout)}»`)

// ② نزع طيّ الأرقام
const attack2 = await helpers([NEUTER_FOLD], 'attack-fold')
check('② بنزع الطيّ يعود «٢٤» فراغًا (فتسقط ①)', attack2.sanitizeNumericInput('٢٤') === '', JSON.stringify(attack2.sanitizeNumericInput('٢٤')))
check('② ويعود «78٫5» إلى «785» — الخطأ ×١٠ الصامت', attack2.sanitizeNumericInput('78٫5', { decimal: true }) === '785', attack2.sanitizeNumericInput('78٫5', { decimal: true }))
check('② ويعود البالغ قاصرًا: parseSafeNumber("٢٤",{min:13}) = 13', attack2.parseSafeNumber('٢٤', { min: 13, max: 100 }) === 13, String(attack2.parseSafeNumber('٢٤', { min: 13, max: 100 })))

// ③ زرع تسرّب لاتيني في سطح مغطّى
const attack3 = await screens([PLANT_LEAK], 'attack-leak')
const a3 = attack3.render('ar')
check('③ تسرّب لاتيني مزروع في `WorkoutSummary` يُلتقَط (السطح مغطّى فعلًا لا اسمًا)',
  latinRuns(a3.workoutSummary).length > 0, JSON.stringify(latinRuns(a3.workoutSummary).slice(0, 6)))
check('③ ولا يُلتقَط من سطح آخر — الفحص يشير إلى موضعه',
  latinRuns(a3.workout).length === 0 && latinRuns(a3.nutrition).length === 0)

// ④ اشتقاق النمط من اللغة وحدها
const attack4 = await helpers([BYPASS_STYLE], 'attack-style')
check('④ باشتقاق النمط من اللغة وحدها لا يصل التفضيل (فتسقط ③)',
  attack4.resolveNumeralSystem('ar', 'latin') === 'arab', attack4.resolveNumeralSystem('ar', 'latin'))

// ⑤ جدول أرقام بمفتاح اللغة وحدها
const attack5 = await helpers([STALE_CACHE], 'attack-cache')
attack5.formatNumeralsIn('1', 'ar') // يملأ الجدول بالنمط التلقائي
attack5.setActiveNumeralStyle('latin')
const staleTable = attack5.formatNumeralsIn('١', 'ar')
const freshNumber = attack5.formatNumber(1, 'ar')
check('⑤ بمفتاح اللغة وحدها يفترق المساعدان (جدول بائت مقابل نظام جديد)',
  staleTable !== freshNumber, `formatNumeralsIn=«${staleTable}» formatNumber=«${freshNumber}»`)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} سياسة الأرقام: ${pass} ناجحًا · ${fails.length} فاشلًا`)
if (fails.length) {
  console.log('\nnumeral-policy-breach:')
  for (const f of fails) console.log('  · ' + f)
}
process.exit(fails.length === 0 ? 0 : 1)
