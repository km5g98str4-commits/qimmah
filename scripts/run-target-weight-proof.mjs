// إثبات سلطة الوزن المستهدف — [SOVEREIGN-003] الحارة ١.
//
// ═══ العطل الذي يحرسه ═══
// كان في `src/` **معاملان متنافسان** لنفس الرقم:
//   • `planDerive.ts`          تنشيف ×0.92 · تضخيم ×1.05
//   • `onboardingV2Adapter.ts` تنشيف ×0.90 · تضخيم ×1.10
// شاشة الكشف ترسم الأول، و`estimatedWeeksToGoal` تحته يُحسب من الثاني. فلمستخدم
// ٨٢ كجم على التنشيف: هدف ٧٥ كجم ومدّة مبنيّة على ٧٤ — رقمان في بطاقة واحدة.
//
// ═══ ما يثبته ═══
// ١) زوج معاملات **واحد** في `src/` كلّه — بنيويًّا، ويسقط بالاسم إن عاد ثانٍ.
// ٢) هدفٌ كتبه المستخدم ينجو من طرف الأنبوب إلى طرفه ولا يُستبدل باشتقاق.
// ٣) اتّساق الاتجاه عبر مصفوفة (هدف × وزن).
// ٤) اتّساق (الهدف · المعدّل · المدّة) حسابيًّا على المسار الحقيقي.
// ٥) وسم «تقريبي» يتبع المصدر لا الشاشة.
// وكلّ بند يرافقه **تأكيد مضادّ** يُحاكي الالتفاف ويسقط بفحص مسمّى (§4.2).

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join, relative } from 'node:path'
import { writeFileSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
const fails = []
const check = (label, ok) => {
  if (ok) { pass++; console.log('  ✓ ' + label) } else { fails.push(label); console.log('  ✗ ' + label) }
}

// ───────── أدوات الفحص البنيوي ─────────

/** يُزيل التعليقات كي لا يمرّ معاملٌ حيّ متخفّيًا، ولا يُتّهم شرحٌ ميّت. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function tsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...tsFiles(full))
    else if (/\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

/**
 * ثلاث قواعد تكشف إعادة إدخال معامل ثانٍ — والثالثة موجودة لأن الأوليين
 * تُلتفّان بتسمية أخرى (`Math.round(w * 0.9)` في ملفٍ يحسب الوزن المستهدف).
 *
 *   • **حرفي بالمعرّف**: سطر فيه معرّف وزن جسدي مضروب في كسر حول الواحد.
 *   • **حرفي بالسياق**: ملفّ يذكر `targetWeight` أصلًا، وفيه ضربٌ في كسر حول
 *     الواحد على أي معرّف كان — السياق يجعل الرقم مشبوهًا بذاته.
 *   • **مُسمّى**: ثابت اسمه يوحي بمعامل هدف/تنشيف/تضخيم بقيمة حول الواحد.
 *
 * النطاق [0.5, 1.5) مقصود: معامل وزن مستهدف يقع حوله حتمًا، وما خرج عنه
 * (نِسَب السعرات، أوزان التقييم) لا يُتّهم بلا سبب.
 */
const NEAR_ONE = '(?:0\\.[5-9]\\d*|1\\.[0-4]\\d*)'
const MULT_RE = new RegExp(`(?:[*×]\\s*${NEAR_ONE})|(?:${NEAR_ONE}\\s*\\*)`)
const BODY_WEIGHT_RE = /\b(?:weightKg|currentWeightKg|targetWeightKg|bodyWeight|weight_kg)\b/
const NAMED_RE = new RegExp(
  `\\b(?:const|let|var|readonly)\\s+([A-Za-z0-9_]*(?:TARGET|CUT|BULK|GOAL|WEIGHT)[A-Za-z0-9_]*(?:FACTOR|RATIO|MULT|MULTIPLIER)[A-Za-z0-9_]*|[A-Za-z0-9_]*(?:FACTOR|RATIO|MULT)[A-Za-z0-9_]*(?:TARGET|CUT|BULK|WEIGHT)[A-Za-z0-9_]*)\\s*[:=][^=]*?\\b${NEAR_ONE}\\b`,
  'i',
)

function scanSource(text) {
  const clean = stripComments(text)
  const inTargetFile = /targetWeight/i.test(clean)
  const literal = clean
    .split('\n')
    .filter((line) => MULT_RE.test(line) && (BODY_WEIGHT_RE.test(line) || inTargetFile))
  const named = []
  const re = new RegExp(NAMED_RE.source, 'gi')
  let m
  while ((m = re.exec(clean)) !== null) named.push(m[1])
  return { literal, named }
}

console.log('\n═══ ١) سلطة واحدة: زوج معاملات واحد في src/ ═══')

const offenders = []
let authorityLiteral = 0
let authorityNamed = 0
for (const file of tsFiles(join(root, 'src'))) {
  const rel = relative(root, file).split('\\').join('/')
  const { literal, named } = scanSource(readFileSync(file, 'utf8'))
  if (rel === 'src/lib/planDerive.ts') { authorityLiteral = literal.length; authorityNamed = named.length; continue }
  if (literal.length || named.length) offenders.push(`${rel} → ${[...literal.map((l) => l.trim()), ...named].join(' | ')}`)
}

check(
  'لا معامل وزن مستهدف خارج planDerive.ts' + (offenders.length ? ` — وُجد: ${offenders.join(' ;; ')}` : ''),
  offenders.length === 0,
)
check('السلطة تحمل الزوج الوحيد: سطران لا أكثر ولا أقلّ', authorityLiteral === 2)
check('ولا ثابت معامل مُسمّى يزاحمهما', authorityNamed === 0)

const authority = readFileSync(join(root, 'src/lib/planDerive.ts'), 'utf8')
const derive = stripComments(authority).slice(
  stripComments(authority).indexOf('export function deriveTargetWeight'),
  stripComments(authority).indexOf('export type TargetWeightSource'),
)
check('الزوج يعيش داخل دالّة الاشتقاق نفسها لا متناثرًا', /weightKg \* 0\.92/.test(derive) && /weightKg \* 1\.05/.test(derive))
check('ولا معامل ثالث داخلها', (derive.match(new RegExp(MULT_RE.source, 'g')) || []).length === 2)

const adapter = readFileSync(join(root, 'src/lib/onboardingV2Adapter.ts'), 'utf8')
check('المحوّل يستدعي السلطة ولا يشتقّ لنفسه', /resolveTargetWeight\(/.test(adapter))
check('المحوّل بلا معامل خاص به بعد تجريده من التعليقات', scanSource(adapter).literal.length === 0)

console.log('\n═══ ١-ب) التأكيد المضادّ: إعادة المعامل القديم تُكشف بالاسم ═══')

const SMUGGLED_LITERAL = `
export function toAnswersFromV2(c) {
  const weightKg = c.weightKg
  const targetWeightKg = c.goal === 'cut' ? Math.round(weightKg * 0.9) : weightKg
  return { targetWeightKg }
}`
check('التفاف حرفي بالمعرّف: `weightKg * 0.9` يُكشف', scanSource(SMUGGLED_LITERAL).literal.length === 1)

// الالتفاف الأذكى: معرّف قصير لا يذكر «weight» إطلاقًا داخل ملفّ هدف الوزن.
const SMUGGLED_BY_CONTEXT = `
export function targetWeightFor(w, goal) {
  if (goal === 'cut') return Math.round(w * 0.9)
  return Math.round(w * 1.1)
}`
check('التفاف بالسياق: `w * 0.9` في ملفّ targetWeight يُكشف', scanSource(SMUGGLED_BY_CONTEXT).literal.length === 2)

const INNOCENT_ELSEWHERE = `
const scoring = [{ key: 'gymConfidence', weight: 0.8, scale: (v) => v * 1.25 }]`
check('وزن تقييم في ملفّ لا علاقة له بهدف الوزن لا يُتّهم', scanSource(INNOCENT_ELSEWHERE).literal.length === 0)

const SMUGGLED_NAMED = `
const CUT_TARGET_FACTOR = 0.9
const BULK_TARGET_FACTOR = 1.1
export const t = (w) => Math.round(w * CUT_TARGET_FACTOR)`
check('التفاف مُسمّى: `CUT_TARGET_FACTOR = 0.9` يُكشف', scanSource(SMUGGLED_NAMED).named.length === 2)

const SMUGGLED_IN_COMMENT = `
// المعامل القديم كان weightKg * 0.9 — للتاريخ فقط
const x = 1`
check('شرحٌ ميّت في تعليق لا يُتّهم (لا مسح أعمى)', scanSource(SMUGGLED_IN_COMMENT).literal.length === 0)

// ───────── ٥) الوسم يتبع المصدر — فحص بنيوي على المكوّن ─────────

console.log('\n═══ ٥) وسم «تقريبي» يتبع المصدر لا الشاشة ═══')

const journey = readFileSync(join(root, 'src/views/reveal/RevealJourney.tsx'), 'utf8')
const journeyClean = stripComments(journey)
/** الكتلة الفعلية لنقطة الهدف — تُستخرج بحدودها لا بـ`includes` متفرّقة (§4.2). */
const targetEndpoint = journeyClean.slice(
  journeyClean.indexOf('label={isEstimate'),
  journeyClean.indexOf('/>', journeyClean.indexOf('estimateBadge={')),
)
check('الوسم مشروط بالمصدر داخل كتلة نقطة الهدف', /estimateBadge=\{isEstimate \? j\.estimateBadge : undefined\}/.test(targetEndpoint))
check('التسمية نفسها تتبع المصدر في نفس الكتلة', /label=\{isEstimate \? j\.target : j\.targetYours\}/.test(targetEndpoint))
check('isEstimate مشتقّ من targetSource لا من الوزن', /const isEstimate = targetSource === 'derived'/.test(journeyClean))
check('المدّة تمرّ بحارس الاتّساق قبل العرض', /isTrajectoryConsistent\(currentWeightKg, targetWeightKg, rawRate, rawWeeks\)/.test(journeyClean))
check('تناقض الاتجاه يُسقط المدّة', /!targetContradictsGoal &&/.test(journeyClean))
check('رقم المستخدم المتناقض يُعرض ويُقال تناقضه', journeyClean.includes('reveal-journey-mismatch') && journeyClean.includes('j.mismatchNote'))

const SMUGGLED_BADGE = `
            <Endpoint
              label={j.target}
              estimateBadge={j.estimateBadge}
            />`
check(
  'التفاف: وسم غير مشروط على نقطة الهدف يُكشف',
  !/estimateBadge=\{isEstimate \? j\.estimateBadge : undefined\}/.test(SMUGGLED_BADGE),
)

// النبرة والقاموس
const dict = readFileSync(join(root, 'src/i18n/dict/reveal.ts'), 'utf8')
for (const key of ['targetYours', 'mismatchNote']) {
  check(`«${key}» موجود مرّتين — عربي وإنجليزي`, (dict.match(new RegExp(`\\b${key}:`, 'g')) || []).length === 3)
}
const mismatchAr = /mismatchNote: '([^']*)'/.exec(dict)?.[1] ?? ''
check('نصّ التناقض العربي بلا لوم ولا تعجّب (§6)', mismatchAr.length > 0 && !/!|لازم|يجب عليك|خطأ|غلط/.test(mismatchAr))
check('نصّ التناقض يبقي رقم المستخدم صراحةً', /خلّيناه/.test(mismatchAr))

// ───────── الجزء السلوكي: المسار الحقيقي ─────────

const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const ENTRY = `
import { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import { computeTargets } from '@/lib/calculators'
import { deriveTargetWeight, resolveTargetWeight, isTrajectoryConsistent } from '@/lib/planDerive'
import type { V2OnboardingChoices } from '@/lib/onboardingV2Adapter'

const results: Array<[string, boolean]> = []
const check = (label: string, ok: boolean) => { results.push([label, ok]) }

const base: V2OnboardingChoices = {
  age: 28, gender: 'male', heightCm: 178, weightKg: 82,
  intent: 'plan', level: 'intermediate',
  trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady',
  goal: 'cut', days: 4, duration: 60, place: 'gym', neat: 'moderate', dietPattern: 'none',
  hasInjury: false, injuries: [], healthDataConsent: true,
}

const profileFor = (over: Partial<V2OnboardingChoices>) =>
  toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, ...over })))

// ═══ ٢) هدف المستخدم ينجو من طرف الأنبوب إلى طرفه ═══
const derivedCut = profileFor({})
check('بلا هدف مُدخَل: المحوّل يعطي رقم السلطة نفسه', derivedCut.targetWeightKg === deriveTargetWeight(82, 'cutting'))
check('ورقم السلطة هو ٧٥ لا ٧٤ (المعامل القديم مُزال)', derivedCut.targetWeightKg === 75)

const explicit = profileFor({ targetWeightKg: 70 })
check('هدف كتبه المستخدم يصل الملفّ كما كتبه', explicit.targetWeightKg === 70)
check('ولم يُستبدل بالاشتقاق', explicit.targetWeightKg !== deriveTargetWeight(82, 'cutting'))
check('targetTouched يقول الحقيقة: صحيح للمُدخَل', toAnswersFromV2({ ...base, targetWeightKg: 70 }).targetTouched === true)
check('targetTouched يقول الحقيقة: خطأ للمشتقّ', toAnswersFromV2({ ...base }).targetTouched === false)
check('هدف مُدخَل مساوٍ للوزن الحالي ينجو بلا «تصحيح»', profileFor({ targetWeightKg: 82 }).targetWeightKg === 82)

// ═══ ٢-ب) التأكيد المضادّ: أي «تفضيل للاشتقاق» يسقط بالاسم ═══
const badResolver = (w: number, gt: 'cutting' | 'bulking', explicitKg?: number | null) =>
  deriveTargetWeight(w, gt) // يتجاهل رقم المستخدم — الالتفاف المُحاكى
check(
  'التفاف: مُحلّل يتجاهل رقم المستخدم يسقط بفحص مسمّى',
  badResolver(82, 'cutting', 70) !== resolveTargetWeight(82, 'cutting', 70).targetWeightKg,
)
check('ولولا الفرق لكان الفحص فارغًا', resolveTargetWeight(82, 'cutting', 70).targetWeightKg === 70)

// ═══ ٣) اتّساق الاتجاه — مصفوفة (هدف × وزن) ═══
const WEIGHTS = [15, 45, 60, 82, 120, 250, 400]
const GOALS = [['cut', 'cutting'], ['bulk', 'bulking'], ['maintain', 'maintenance']] as const
let matrix = 0
let matrixBad = 0
for (const w of WEIGHTS) {
  for (const [v2, gt] of GOALS) {
    const r = resolveTargetWeight(w, gt)
    matrix++
    const ok =
      (gt === 'cutting' && r.targetWeightKg < w) ||
      (gt === 'bulking' && r.targetWeightKg > w) ||
      (gt === 'maintenance' && r.targetWeightKg === w)
    if (!ok || r.contradictsGoal || !r.isEstimate || r.source !== 'derived') matrixBad++
    void v2
  }
}
check(\`المصفوفة (\${matrix} حالة): المشتقّ لا يعاكس هدفه أبدًا ويُوسم تقديرًا\`, matrixBad === 0)
check('ولولا الحالات لكانت المصفوفة فارغة', matrix === WEIGHTS.length * GOALS.length)

// هدف مُدخَل يعاكس الاتجاه: يُقال ولا يُصحَّح ولا يُمنع
const against = resolveTargetWeight(82, 'cutting', 90)
check('هدف مُدخَل معاكس: الرقم يبقى كما كتبه', against.targetWeightKg === 90)
check('هدف مُدخَل معاكس: يُوسم متناقضًا صراحةً', against.contradictsGoal === true)
check('هدف مُدخَل معاكس: ليس تقديرًا (كتبه بنفسه)', against.isEstimate === false && against.source === 'user')
check('هدف مُدخَل معاكس: ينجو حتى الملفّ بلا تصحيح صامت', profileFor({ targetWeightKg: 90 }).targetWeightKg === 90)
const againstBulk = resolveTargetWeight(70, 'bulking', 60)
check('تضخيم بهدف أخفّ يُوسم متناقضًا كذلك', againstBulk.contradictsGoal === true && againstBulk.targetWeightKg === 60)
check('وهدف موافق لاتجاهه لا يُوسم متناقضًا (لا تعميم)', resolveTargetWeight(82, 'cutting', 75).contradictsGoal === false)

// ═══ ٤) اتّساق (الهدف · المعدّل · المدّة) على المسار الحقيقي ═══
let consistent = 0
let inconsistent = 0
for (const w of [60, 70, 82, 95, 120]) {
  for (const goal of ['cut', 'bulk'] as const) {
    const p = profileFor({ weightKg: w, goal })
    const t = computeTargets(p)
    if (isTrajectoryConsistent(w, p.targetWeightKg, t.weeklyWeightChangeKg, t.estimatedWeeksToGoal)) consistent++
    else inconsistent++
  }
}
check(\`المدّة متّسقة مع الهدف المعروض في \${consistent} حالة\`, inconsistent === 0 && consistent === 10)

// ═══ ٤-ب) التأكيد المضادّ: العطل الأصلي بعينه يسقط بالاسم ═══
// نُحاكي العالم القديم: المحرّك يحسب من ×0.9 بينما الشاشة ترسم ×0.92.
const w0 = 82
const legacyEngineTarget = Math.round(w0 * 0.9) // ٧٤ — المعامل المحذوف
const legacyTargets = computeTargets({ ...profileFor({}), targetWeightKg: legacyEngineTarget })
const shownTarget = deriveTargetWeight(w0, 'cutting') // ٧٥ — ما كانت الشاشة ترسمه
check(
  'العطل الأصلي (هدف ٧٥ ومدّة من ٧٤) يسقط بفحص الاتّساق',
  isTrajectoryConsistent(w0, shownTarget, legacyTargets.weeklyWeightChangeKg, legacyTargets.estimatedWeeksToGoal) === false,
)
check(
  'ولولا الاختلاف لمرّ: نفس الهدف مع نفس المدّة متّسق',
  isTrajectoryConsistent(w0, legacyEngineTarget, legacyTargets.weeklyWeightChangeKg, legacyTargets.estimatedWeeksToGoal) === true,
)
check('والفارق حقيقي لا صفري', shownTarget !== legacyEngineTarget)

// اتجاه معاكس بين المعدّل والهدف يسقط ولو طابق المقدار
check(
  'معدّل صاعد تحت هدف نازل يسقط بالاتجاه',
  isTrajectoryConsistent(82, 75, 0.4, 18) === false,
)
check('ونفس الأرقام باتجاه صحيح تمرّ', isTrajectoryConsistent(82, 75, -0.4, 18) === true)
check('مدّة صفرية لا تُعتبر متّسقة', isTrajectoryConsistent(82, 75, -0.4, 0) === false)

// المعاملان يعملان بقيمتيهما المُعلنتين — الرقم لا الاسم
check('معامل التنشيف يعمل بـ0.92', deriveTargetWeight(100, 'cutting') === 92 && deriveTargetWeight(200, 'cutting') === 184)
check('معامل التضخيم يعمل بـ1.05', deriveTargetWeight(100, 'bulking') === 105 && deriveTargetWeight(200, 'bulking') === 210)
check('ولا معامل للثبات (الحفاظ = نفس الوزن)', deriveTargetWeight(100, 'maintenance') === 100)

export function run() { return results }
`

const result = await build({
  stdin: { contents: ENTRY, resolveDir: root, sourcefile: 'target-weight-proof.ts', loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'target-weight-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
const mod = await import(pathToFileURL(file).href)

console.log('\n═══ ٢–٤) المسار الحقيقي: من الإجابة إلى الملفّ إلى المدّة ═══')
for (const [label, ok] of mod.run()) check(label, ok)

console.log('')
if (fails.length) {
  console.log(`❌ إثبات الوزن المستهدف: ${pass} نجحت، ${fails.length} فشلت.`)
  for (const f of fails) console.log('   ✗ ' + f)
  process.exitCode = 1
} else {
  console.log(`✅ إثبات الوزن المستهدف: ${pass} فحصًا، 0 فشل.`)
}
