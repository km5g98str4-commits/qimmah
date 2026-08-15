// ═══════════════════════════════════════════════════════════════════════════
//  NUMERAL-POLICY — حارس سياسة الأرقام على الشاشتين الحيّتين.
//
//  ═══ لماذا هذا الحارس موجود ═══
//  BUG-019 أُعلن مُغلقًا مرّتين وهو حيّ: مرّة لأن `formatNumber` هبط على التوأم
//  غير الموجَّه (أغلقه CANONICAL-SURFACE-LOCK)، ومرّة لأن الحدّ وُضع على بعض
//  الأرقام في المسار الحيّ لا كلّها. فالمستخدم العربي كان يقرأ **الحقيقة
//  الواحدة بنظامين**: «٤ أيام/أسبوع» في حسابه و«4 أيام/أسبوع» في تمرينه.
//
//  ولذلك لا يكفي فحص «هل الملف يستورد formatNumber». هذا الحارس **يُصيّر
//  الشاشتين فعلًا** (SSR) ويقرأ نصّهما المرسوم: لا رقم لاتيني في جلسة عربية،
//  ولا رقم هندي في جلسة إنجليزية.
//
//  ═══ التأكيد المضادّ (§4.2 من الميثاق) ═══
//  ثم يُهاجَم الحارس نفسه: تُعاد الحزمة وقد استُبدل `@/lib/numberFormat` بمرور
//  محايد (identity)، ويجب أن تعود الأرقام اللاتينية فيسقط الفحص **باسمه**.
//  فحصٌ لا يسقط عند نزع ما يحرسه ليس حارسًا بل زينة.
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
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

// ── حزمة SSR: نفس المكوّنين الحيّين اللذين يوجّههما App.tsx ─────────────────
/** تخزين مُحاكى — الشاشتان تقرآن الجلسة/الجدول المخصّص عند الرسم. */
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

const ENTRY = `import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import { getDefaultCustomization } from '@/lib/customization'
import { generatePlan } from '@/lib/planGenerator'
import { NutritionView } from '@/views/NutritionView'
import { WorkoutView } from '@/views/WorkoutView'

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

export function render(lang) {
  const c = fixture()
  const wrap = (node) => renderToString(React.createElement(StaticCustomizationProvider, { customization: c }, node))
  return {
    planDayNames: c.workoutPlan.days.map((d) => d.nameAr),
    nutrition: wrap(React.createElement(NutritionView, { lang })),
    workout: wrap(React.createElement(WorkoutView, { lang, onNavigate: () => {} })),
  }
}
`

/**
 * يبني حزمة SSR واحدة. حين يُمرَّر `neuter` يُستبدل حدّ الأرقام بمرور محايد —
 * وهذه هي هجمة §4.2، لا وضعُ تشغيل.
 */
async function bundle({ neuter = false } = {}) {
  const dir = mkdtempSync(path.join(tmp, neuter ? 'attack-' : 'real-'))
  const entry = path.join(dir, 'entry.jsx')
  writeFileSync(entry, ENTRY)
  const outfile = path.join(dir, 'bundle.cjs')
  const neuterPlugin = {
    name: 'neuter-numeral-boundary',
    setup(b) {
      b.onResolve({ filter: /^@\/lib\/numberFormat$/ }, () => ({ path: 'numeral-stub', namespace: 'neuter' }))
      b.onLoad({ filter: /.*/, namespace: 'neuter' }, () => ({
        contents: 'export const formatNumber = (v) => String(v)\nexport const formatNumeralsIn = (t) => t\n',
        loader: 'js',
      }))
    },
  }
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
    plugins: neuter ? [neuterPlugin] : [],
  })
  return require(outfile)
}

/** نصّ مرئي فقط: تُنزع الوسوم فلا تُحسب أرقام الأصناف (`text-4xl`, `h-11`) نصًّا. */
const visibleText = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
const latinRuns = (html) => visibleText(html).match(/[0-9]+/g) ?? []
const arabicRuns = (html) => visibleText(html).match(/[٠-٩]+/g) ?? []

// ═══ ① الحدّ نفسه — دالّتان بجدول واحد مشتقّ ═══
console.log('\n═══ ① حدّ العرض: `formatNumber` و`formatNumeralsIn` لا يفترقان ═══')
const { formatNumber, formatNumeralsIn } = await bundleHelpers()
async function bundleHelpers() {
  const dir = mkdtempSync(path.join(tmp, 'helpers-'))
  const entry = path.join(dir, 'h.js')
  writeFileSync(entry, "export { formatNumber, formatNumeralsIn } from '@/lib/numberFormat'\n")
  const outfile = path.join(dir, 'h.cjs')
  await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile,
    logLevel: 'error', absWorkingDir: root, alias: { '@': path.join(root, 'src') } })
  return require(outfile)
}

check('العربية تُظهر الأرقام الهندية', !LATIN.test(formatNumber(1937, 'ar')) && ARABIC_INDIC.test(formatNumber(1937, 'ar')), formatNumber(1937, 'ar'))
check('الإنجليزية تُظهر الأرقام اللاتينية', LATIN.test(formatNumber(1937, 'en')) && !ARABIC_INDIC.test(formatNumber(1937, 'en')), formatNumber(1937, 'en'))
check('اسم يوم مخزَّن يُطبَّع عند الرسم إلى العربية', formatNumeralsIn('اليوم 1 · علوي', 'ar') === 'اليوم ١ · علوي', formatNumeralsIn('اليوم 1 · علوي', 'ar'))
check('ونصّ إرث بأرقام هندية يُطبَّع إلى الإنجليزية', formatNumeralsIn('اليوم ١ · علوي', 'en') === 'اليوم 1 · علوي', formatNumeralsIn('اليوم ١ · علوي', 'en'))
// الاقتران: الجدول مشتقّ من `formatNumber` — فلا يجوز أن يعطيا رقمين مختلفين لعدد واحد.
const drift = []
for (const n of [0, 1, 5, 9, 10, 42, 250, 1937, 90210]) {
  for (const lang of ['ar', 'en']) {
    if (formatNumeralsIn(String(n), lang) !== formatNumber(n, lang, { useGrouping: false })) drift.push(`${n}/${lang}`)
  }
}
check('المساعدان يعطيان نفس الرقم لنفس القيمة (لا جدول ثانٍ مكتوب بيد)', drift.length === 0, drift.join(', '))
// مرور غير مستحقّ: «سياسة» تمسح الأرقام بدل تحويلها ليست سياسة.
check('التطبيع يحوّل ولا يمسح — عدد المحارف والنصّ حوله كما هو',
  formatNumeralsIn('~30 د', 'ar').length === '~30 د'.length && formatNumeralsIn('~30 د', 'ar').startsWith('~') && formatNumeralsIn('~30 د', 'ar').endsWith(' د'),
  formatNumeralsIn('~30 د', 'ar'))

// ═══ ② الشاشتان الحيّتان — مقروءتان من الرسم لا من الاستيراد ═══
console.log('\n═══ ② `NutritionView` و`WorkoutView` مُصيَّرتان فعلًا ═══')
const real = await bundle()
const ar = real.render('ar')
const en = real.render('en')

check('الشاشتان تُصيَّران إلى HTML حقيقي', ar.nutrition.length > 800 && ar.workout.length > 800, `nut=${ar.nutrition.length} wk=${ar.workout.length}`)
// لولا أن الخطة المولَّدة تحمل أرقامًا مخزَّنة لاتينية لكان الإثبات فارغًا.
check('أسماء أيام الخطة المخزَّنة لاتينية الأرقام (المُدخَل الذي نحرسه)',
  ar.planDayNames.some((n) => LATIN.test(n)), JSON.stringify(ar.planDayNames.slice(0, 2)))

const nutLatinAr = latinRuns(ar.nutrition)
const wkLatinAr = latinRuns(ar.workout)
check('التغذية الحيّة بلا رقم لاتيني في الجلسة العربية', nutLatinAr.length === 0, JSON.stringify(nutLatinAr.slice(0, 8)))
check('التمرين الحيّ بلا رقم لاتيني في الجلسة العربية', wkLatinAr.length === 0, JSON.stringify(wkLatinAr.slice(0, 8)))

// الاتجاه المضادّ: جلسة إنجليزية لا ترث أرقامًا هندية — ولا تخلو من الأرقام.
const nutArabicEn = arabicRuns(en.nutrition)
const wkArabicEn = arabicRuns(en.workout)
check('التغذية بالإنجليزية بلا رقم هندي', nutArabicEn.length === 0, JSON.stringify(nutArabicEn.slice(0, 8)))
check('التمرين بالإنجليزية بلا رقم هندي', wkArabicEn.length === 0, JSON.stringify(wkArabicEn.slice(0, 8)))
check('والجلسة الإنجليزية ما زالت تعرض أرقامًا (لا «سياسة» تمسحها)',
  latinRuns(en.nutrition).length >= 3 && latinRuns(en.workout).length >= 3,
  `nut=${latinRuns(en.nutrition).length} wk=${latinRuns(en.workout).length}`)
// والعربية تعرض أرقامها فعلًا — شاشة بلا أرقام تمرّ ①-② مجّانًا.
check('والجلسة العربية تعرض أرقامها الهندية فعلًا',
  arabicRuns(ar.nutrition).length >= 3 && arabicRuns(ar.workout).length >= 3,
  `nut=${arabicRuns(ar.nutrition).length} wk=${arabicRuns(ar.workout).length}`)

// ═══ ③ محاكاة الالتفاف — نزع الحدّ يجب أن يُسقط ② باسمه ═══
console.log('\n═══ ③ محاكاة الالتفاف: نزع حدّ الأرقام ═══')
const attack = await bundle({ neuter: true })
const attackAr = attack.render('ar')
const attackNut = latinRuns(attackAr.nutrition)
const attackWk = latinRuns(attackAr.workout)
check('بنزع الحدّ يعود العطل إلى التغذية (فيسقط الفحص أعلاه)', attackNut.length > 0, `latin=${JSON.stringify(attackNut.slice(0, 6))}`)
check('وبنزعه يعود إلى التمرين كذلك', attackWk.length > 0, `latin=${JSON.stringify(attackWk.slice(0, 6))}`)
// «٤ أيام/أسبوع» مقابل «4 أيام/أسبوع» — الشكل الذي يراه المستخدم من العطل.
const daysFact = (html) => (visibleText(html).match(/([0-9٠-٩]+)\s*أيام/) || [])[1] ?? ''
check('الحقيقة المسمّاة (أيام/أسبوع) هندية بعد الإصلاح', ARABIC_INDIC.test(daysFact(ar.workout)), `«${daysFact(ar.workout)}»`)
check('ولاتينية عند نزع الحدّ — أي أن هذا الفحص بالذات هو الحارس', LATIN.test(daysFact(attackAr.workout)), `«${daysFact(attackAr.workout)}»`)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} سياسة الأرقام: ${pass} ناجحًا · ${fails.length} فاشلًا`)
if (fails.length) {
  console.log('\nnumeral-policy-breach:')
  for (const f of fails) console.log('  · ' + f)
}
process.exit(fails.length === 0 ? 0 : 1)
