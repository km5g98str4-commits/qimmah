/**
 * إثبات خطوات اليوم + اليوم الأول — [R4-UX-STEPS] · [R4-UX-FIRSTDAY].
 *
 * ═══ الارتدادات التي يمنعها ═══
 * ① **ادّعاء التتبّع التلقائي.** بناء الويب لا يقرأ HealthKit ولا أي عدّاد —
 *    الجسر مسجَّل لكن الذي يدفع فيه plugin أصلي غير موجود في المتصفّح. أي نصّ
 *    يقول «نتتبّع خطواتك» يَعِد بما لا يحدث (§5).
 * ② **`type="number"` في حقل رقمي.** خوارزمية تعقيم HTML تُفرّغ القيمة إن لم
 *    تكن أرقامًا لاتينية — فالأرقام العربية **لا تصل React أصلًا**.
 * ③ **ابتلاع فشل الحفظ.** رقمٌ يُقال إنه حُفظ ولم يُحفظ.
 * ④ **رقم بلا شرح على الطية الأولى** للقادم الجديد.
 *
 * قسمان: ① سلوكي فوق تخزين مُحاكى، ② بنيوي مقترن، ثم محاكاتا التفاف (§4.2).
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
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}
/** يجرّد التعليقات قبل أي فحص **غياب** — وإلا أسقط شرحُ العطل الإثباتَ. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

// ── ① القسم السلوكي ─────────────────────────────────────────────────────────
// كعب نافذة **كامل** (addEventListener/removeEventListener/dispatchEvent):
// نصفُ كعبٍ يجعل `typeof window` صادقًا ثم ينهار عند أول إعلان حدث.
const banner = `
const __store = new Map();
let __failNextWrites = null;
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => {
    if (__failNextWrites) { const e = new Error('stub'); e.name = __failNextWrites; throw e; }
    __store.set(k, String(v));
  },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
const __listeners = new Map();
const __events = [];
class __CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
const __win = {
  localStorage: __ls,
  addEventListener(type, fn) { if (!__listeners.has(type)) __listeners.set(type, new Set()); __listeners.get(type).add(fn); },
  removeEventListener(type, fn) { __listeners.get(type)?.delete(fn); },
  dispatchEvent(ev) { __events.push(ev.type); __listeners.get(ev.type)?.forEach((fn) => fn(ev)); return true; },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  navigator: { userAgent: 'node' },
};
Object.defineProperty(__win, '__events', { value: __events });
Object.defineProperty(__win, '__failNextWrites', {
  get: () => __failNextWrites,
  set: (v) => { __failNextWrites = v; },
});
globalThis.localStorage = __ls;
globalThis.window = __win;
globalThis.CustomEvent = __CustomEvent;
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const built = await build({
  entryPoints: [resolve(root, 'scripts/today-steps-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'today-steps-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, built.outputFiles[0].text)
await import(pathToFileURL(file).href)

// ── ② القسم البنيوي ─────────────────────────────────────────────────────────
const card = read('src/components/today/StepsCard.tsx')
const today = read('src/views/TodayV2.tsx')
const dict = read('src/i18n/dict/stepsManual.ts')
const counter = read('src/lib/stepCounter.ts')
const firstDay = read('src/components/today/FirstDayCard.tsx')
const homeDict = read('src/i18n/dict/todayHome.ts')

console.log('\n⑦ البطاقة حيّة على الرئيسية — لا مكوّن يتيم')
check('الرئيسية تركّب `StepsCard`', today.includes('<StepsCard'))
check('البطاقة تقرأ من `stepCounter` لا من متجر ثانٍ', card.includes("from '@/lib/stepCounter'") && !code(card).includes('localStorage'))
check('وتستمع لحدث التحديث فتُحدَّث من أي كاتب', card.includes('STEPS_UPDATED_EVENT') && card.includes('removeEventListener'))

console.log('\n⑧ لا ادّعاء تتبّع تلقائي (§5)')
check('السطر التوضيحي يُشتقّ من `stepEntryMode()`', card.includes("stepEntryMode() === 'manual-only' ? d.sourceWeb : d.sourceNative"))
check('نصّ الويب يقول إن الرقم من المستخدم', dict.includes('نسخة المتصفّح ما تقرأ عدّاد جهازك') && dict.includes('the number you type here is our only source'))
check('نصّ الغلاف الأصلي «لو ربطت» لا «نتتبّع»', dict.includes('لو ربطت Apple Health') && dict.includes('If you connect Apple Health'))
// حارس نصّي مقترن: لا صيغة وعد بتتبّع في أي سلسلة من القاموس.
// **بعد تجريد التعليقات**: رأس القاموس يشرح الصيغ الممنوعة بنصّها، وفحصٌ على
// النصّ الخام كان يُسقط الإثبات بأصدق ما في الملف.
const CLAIMS = ['نتتبّع خطواتك', 'يتحدّث تلقائيًا', 'we track your steps', 'automatically tracked', 'tracks your steps']
const claimsIn = (src) => CLAIMS.some((c) => code(src).toLowerCase().includes(c.toLowerCase()))
check('لا جملة تَعِد بتتبّع تلقائي في نصوص القاموس', !claimsIn(dict))
check('`stepEntryMode` يقرأ المنصّة لا علمًا مكتوبًا', counter.includes("return isNativePlatform() ? 'bridge-available' : 'manual-only'"))

console.log('\n⑨ الإدخال يقبل الأرقام العربية')
check('البطاقة تستعمل `NumericInput` (النصّي) لا حقلًا خامًّا', card.includes('<NumericInput') && !code(card).includes('type="number"'))
check('حقلا الخطوات والهدف كلاهما منه', (card.match(/<NumericInput/g) || []).length === 2)
check('`NumericInput` نصّي مع لوحة رقمية', read('src/components/NumericInput.tsx').includes('type="text"') && read('src/components/NumericInput.tsx').includes("inputMode={decimal ? 'decimal' : 'numeric'}"))

console.log('\n⑩ الحفظ صادق والأرقام مركزية')
check('البطاقة تكتب عبر `writeSteps`/`writeStepGoal` لا `setSteps`', card.includes('writeSteps(') && card.includes('writeStepGoal(') && !code(card).includes('setSteps(stepsDraft)'))
check('الفشل يُعرض برسالة تسمّي السبب', card.includes("failure === 'quota' ? d.saveFailedQuota") && card.includes("failure === 'unavailable' ? d.saveFailedBlocked"))
check('والمحرّر يبقى مفتوحًا عند الفشل (لا مسح للمُدخَل)', /if \(!written\.ok \|\| !goalWritten\.ok\) \{[\s\S]{0,160}return\n?\s*\}/.test(card))
check('كل رقم معروض يمرّ بالمنسّق المركزي', card.includes("const n = (value: number) => formatNumber(value, lang)") && !/>\s*\{\s*steps\s*\}\s*</.test(card))
check('لا نصّ عربي صلب في البطاقة', !/[؀-ۿ]/.test(code(card)))
check('القاموس بلغتين', dict.includes('const ar: StepsManualStrings') && dict.includes('const en: StepsManualStrings'))

console.log('\n⑪ اليوم الأول: لا رقم بلا شرح على الطية الأولى')
check('الرئيسية تركّب `FirstDayCard` للقادم الجديد', today.includes('<FirstDayCard') && today.includes('blankSlate ? ('))
check('البطاقة تقول ما المتوقّع اليوم', firstDay.includes('d.firstDayExpect') && homeDict.includes('firstDayExpect:'))
check('وتشرح معنى الأرقام **قبل** ظهورها', firstDay.includes('d.firstDayNumbers') && homeDict.includes('firstDayNumbers:'))
check('الأبواب من `model.cards` لا قائمة ثانية', today.includes('cards={model.cards}') && firstDay.includes('cards.map('))
check('الشرح بلغتين', homeDict.includes('يومك الأول في قِمّة') && homeDict.includes('Your first day on Qimmah'))
check('لا نصّ عربي صلب في بطاقة اليوم الأول', !/[؀-ۿ]/.test(code(firstDay)))
check('البطاقة تزول عند أول إشارة (لا تلاحق من بدأ)', today.includes('const blankSlate = model.state === \'newUser\' && !hasTodaySignal'))

console.log('\n⑫ الوصولية')
check('شريط التقدّم يحمل وصفًا كاملًا لا لونًا وحده', card.includes('aria-label={d.progressAria(') && dict.includes('progressAria:'))
check('لكل حقل تسمية مربوطة', (card.match(/<label htmlFor=/g) || []).length === 2)
check('رسالة الفشل تُعلَن (`role="alert"`)', card.includes('role="alert"'))
check('أهداف اللمس ≥٤٤بك', (card.match(/tap-target/g) || []).length >= 3)

// ── ③ محاكاة الالتفاف — كل شدّ يُهاجَم (§4.2) ───────────────────────────────
console.log('\n⑬ محاكاة الالتفاف — الفحوص تسقط بأسمائها')

// (أ) إعادة الحقل الرقمي الخام يجب أن تُسقط فحص الإدخال العربي **باسمه**.
const rawInput = card.replace('<NumericInput', '<input type="number"')
check('استبدال الحقل بـ`type="number"` يُسقط الفحص باسمه', code(rawInput).includes('type="number"') && !code(card).includes('type="number"'))

// (ب) ادّعاء تتبّع مدسوس في القاموس يجب أن يقلب الحارس النصّي.
const lying = dict.replace("sourceWeb: 'نسخة المتصفّح", "sourceWeb: 'نتتبّع خطواتك تلقائيًا · نسخة المتصفّح")
if (lying === dict) throw new Error('FAIL: محاكاة الادّعاء لم تُغيّر شيئًا — الإثبات نفسه معطوب')
check('ادّعاء «نتتبّع خطواتك» مدسوس في نصّ يقلب الحارس', claimsIn(lying) && !claimsIn(dict))

// (ج) العودة إلى `setSteps` (التي تبتلع نتيجة التخزين) تُسقط فحص الصدق.
const swallowing = card.replace('const written: StepWriteResult = writeSteps(stepsDraft)', 'const written = { ok: true, reason: \'ok\' as const, steps: setSteps(stepsDraft) }')
check('العودة إلى الكتابة التي تبتلع الفشل تُسقط الفحص باسمه', !swallowing.includes('writeSteps(stepsDraft)') && card.includes('writeSteps(stepsDraft)'))

// (د) حذف شرح معنى الأرقام يُسقط فحص اليوم الأول.
// [MINOR-COPY-001] الشرح صار تعبيرًا شرطيًّا (بالغ/قاصر) — المحاكاة تحذف التعبير كلّه لا لفظًا واحدًا.
const unexplained = firstDay.replace(/\{[^{}]*d\.firstDayNumbers[^{}]*\}/, '{null}')
if (unexplained === firstDay) throw new Error('FAIL: محاكاة حذف الشرح لم تُغيّر شيئًا — الإثبات نفسه معطوب')
check('حذف شرح معنى الأرقام يُسقط فحص اليوم الأول باسمه', !unexplained.includes('d.firstDayNumbers') && firstDay.includes('d.firstDayNumbers'))

// (هـ) حارس النصّ الصلب يُهاجَم: نصّ عربي **داخل الكود** يجب أن يقلبه.
const smuggled = card.replace('{d.title}', "{'خطوات اليوم'}")
check('نصّ عربي مدسوس في الكود يقلب حارس النصّ الصلب', /[؀-ۿ]/.test(code(smuggled)) && !/[؀-ۿ]/.test(code(card)))

if (fails.length > 0) {
  console.log(`\n❌ خطوات اليوم: ${pass} نجحت، ${fails.length} فشلت:`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`\n✅ خطوات اليوم واليوم الأول: ${pass} فحصًا بنيويًّا، 0 فشل.`)
