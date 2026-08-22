// إثبات سلطة واحدة للوزن المستهدف — [QIM-V1-002]
//
// ═══ الفجوة التي يُغلقها ═══
// كان للوزن المستهدف **مشتقّان**:
//   · `planDerive.deriveTargetWeight`  (تنشيف ×0.92 · تضخيم ×1.05)
//     ⇐ يقرأه **مسار العرض** (شاشة التسليم، `OnboardingV2.tsx:1385`)
//        و**مسار التخزين** (`onboardingProfile.ts:316`).
//   · حساب خاصّ داخل `onboardingV2Adapter`  (×0.9 · ×1.1)
//     ⇐ يغذّي **المولّد** والملفَّ المبنيّ من الإجابات.
//
// فمن يزن ٨٠ كجم ويريد التنشيف: **يُعرض له ٧٤ ويُبنى له على ٧٢**. رقمان لحقيقة
// واحدة، والمعروض ليس هو المعمول به. §5 تمنع هذا نصًّا.
//
// الفحص طبقتان — لأن أيًّا منهما وحدها تُخدَع:
//   ① **سلوكي**: مصفوفة أوزان × أهداف؛ قيمة المسند = قيمة السلطة، دائمًا.
//   ② **بنيوي**: لا مُعامِل وزن مستقلّ في المسند أصلًا. فلو أعاد أحدهم حسابًا
//      خاصًّا يصادف أنه يطابق اليوم، يسقط ② قبل أن يصير انحرافًا غدًا.
//
// Run: npm run test:target-weight-authority
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓  ${name}`) }
  else { failures.push(name); console.log(`  ✗  ${name}${detail ? ` — ${detail}` : ''}`) }
}

const banner = `
const __s = new Map();
const __ls = {
  get length(){return __s.size}, key(i){return Array.from(__s.keys())[i] ?? null},
  getItem:(k)=>(__s.has(k)?__s.get(k):null), setItem:(k,v)=>{__s.set(k,String(v))},
  removeItem:(k)=>{__s.delete(k)}, clear:()=>{__s.clear()},
};
globalThis.localStorage = __ls;
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: __ls };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`
const ENTRY = `
export { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
export { deriveTargetWeight } from '@/lib/planDerive'
export { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
`
const dir = mkdtempSync(join(tmpdir(), 'target-weight-authority-'))
const entryFile = join(dir, 'entry.ts')
writeFileSync(entryFile, ENTRY)
const result = await build({
  entryPoints: [entryFile], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'error',
})
const outFile = join(dir, 'proof.mjs')
writeFileSync(outFile, result.outputFiles[0].text)
const { toAnswersFromV2, deriveTargetWeight, buildOnboardingProfile } = await import(pathToFileURL(outFile).href)

const GOALS = [['cut', 'cutting'], ['bulk', 'bulking'], ['maintain', 'maintenance']]
const WEIGHTS = [45, 58, 62.5, 70, 75, 80, 93, 110, 140]
/** مسودّة v2 صالحة الحدّ الأدنى — الحقول المطلوبة فقط، والباقي يسقط على الافتراضي. */
const draft = (weightKg, goal) => ({ weightKg, goal, injuries: [], equipment: [] })

console.log('\n① السلوك: ما يُبنى عليه = ما يُعرض')
let drift = []
for (const [v2goal, goalType] of GOALS) {
  for (const weightKg of WEIGHTS) {
    const answers = toAnswersFromV2(draft(weightKg, v2goal))
    const authority = deriveTargetWeight(weightKg, goalType)
    if (answers.targetWeightKg !== authority) {
      drift.push(`${v2goal}/${weightKg}: مسند=${answers.targetWeightKg} سلطة=${authority}`)
    }
  }
}
check(`مصفوفة ${GOALS.length}×${WEIGHTS.length} — لا انحراف بين المسند والسلطة`,
  drift.length === 0, drift.slice(0, 4).join(' · '))

console.log('\n② الملف المخزَّن يحمل نفس الرقم')
const storeDrift = []
for (const [v2goal, goalType] of GOALS) {
  for (const weightKg of WEIGHTS) {
    const answers = toAnswersFromV2(draft(weightKg, v2goal))
    const profile = buildOnboardingProfile(answers)
    const stored = profile.bodyMetrics.targetWeightKg
    // maintain لا يعرض وزنًا مستهدفًا أصلًا (`showsTargetWeight`) — الغياب صحيح.
    if (v2goal === 'maintain') { if (stored !== undefined) storeDrift.push(`maintain/${weightKg}: خُزِّن ${stored}`) ; continue }
    if (stored !== deriveTargetWeight(weightKg, goalType)) {
      storeDrift.push(`${v2goal}/${weightKg}: مخزَّن=${stored} سلطة=${deriveTargetWeight(weightKg, goalType)}`)
    }
  }
}
check('الوزن المستهدف المخزَّن = السلطة (والمحافظة بلا رقم بحقّ)',
  storeDrift.length === 0, storeDrift.slice(0, 4).join(' · '))

console.log('\n③ الاتجاه لا ينقلب — رقمٌ يخالف هدفه أسوأ من غيابه')
const dirBad = []
for (const weightKg of WEIGHTS) {
  if (deriveTargetWeight(weightKg, 'cutting') >= weightKg) dirBad.push(`تنشيف/${weightKg}`)
  if (deriveTargetWeight(weightKg, 'bulking') <= weightKg) dirBad.push(`تضخيم/${weightKg}`)
  if (deriveTargetWeight(weightKg, 'maintenance') !== weightKg) dirBad.push(`محافظة/${weightKg}`)
}
check('تنشيف ينزل · تضخيم يصعد · محافظة تثبت', dirBad.length === 0, dirBad.slice(0, 4).join(' · '))

console.log('\n④ البنية: لا مشتقّ ثانٍ في المسند')
const adapterSrc = readFileSync(resolve(root, 'src/lib/onboardingV2Adapter.ts'), 'utf8')
const ownMultiplier = /weightKg\s*\*\s*[\d.]+/.test(adapterSrc)
check('المسند لا يضرب الوزن بمعامل خاصّ به', !ownMultiplier,
  'عاد حساب مستقلّ — سيصير انحرافًا عند أول تعديل للسلطة')
check('والمسند يستدعي السلطة صراحةً', /deriveTargetWeight\s*\(/.test(adapterSrc))
check('حارس الحارس: الملفّ قُرئ فعلًا وليس فارغًا', adapterSrc.length > 2000, `${adapterSrc.length} حرفًا`)

console.log('\n⑤ ⚔️ محاكاة الالتفاف — تسقط بفحص مسمّى')
{
  // مسند وهميّ يعيد الثوابت القديمة: ① يجب أن يرصده.
  const legacy = (w, g) => (g === 'cut' ? Math.round(w * 0.9) : g === 'bulk' ? Math.round(w * 1.1) : w)
  const caught = WEIGHTS.some((w) => legacy(w, 'cut') !== deriveTargetWeight(w, 'cutting'))
  check('⚔️ عودة الثوابت القديمة (×0.9/×1.1) يرصدها فحص ①', caught,
    'لو لم تُرصد لكان الفحص بلا معنى')
}
{
  // نصّ مسند يحمل معامله الخاصّ: ④ يجب أن يرصده.
  const tampered = 'const targetWeightKg = Math.round(weightKg * 0.9)'
  check('⚔️ معامل خاصّ في نصّ المسند يرصده فحص ④', /weightKg\s*\*\s*[\d.]+/.test(tampered))
}
{
  // ولو انقلب الاتجاه لصار الرقم يقرأ عكس هدفه.
  check('⚔️ انقلاب الاتجاه يرصده فحص ③', (80 * 1.1) > 80 && !(deriveTargetWeight(80, 'cutting') > 80))
}

console.log(`\n${failures.length === 0 ? '🎉' : '❌'} ${pass} نجحت / ${failures.length} فشلت`)
if (failures.length) { console.log('الفاشلة:', failures.join(' · ')); process.exit(1) }
