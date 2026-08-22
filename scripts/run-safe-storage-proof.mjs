// ⛔ خارج `test:gate` عن قصد — استبعاد موثَّق لا تعطيل صامت.
//
// السبب: هذا الإثبات يفحص **شكل** طبقة التخزين كما بُنيت على خطّ
// `release/v1.2.0-rc` (أسماء `safe*` وتوقيع `lastFinishStorageFailure`)، وعند
// توحيد الجبهة فازت نسخة الجذع (المربوطة بسلسلة صدق الحفظ في `confirmFinish`).
// فبقيت أربعة تأكيدات فيه تخصّ شكلًا لم نتبنّه.
//
// ما يغطّي ضماناته السلوكية: `test:storage-honesty` (٢٥ فحصًا، داخل البوابة) —
// امتلاء الحصّة · التخزين المحجوب · البيانات التالفة · وأن التمرين الجاري ينجو
// من حفظ فاشل.
//
// ⚠️ قبل أرشفته نهائيًا في موجة توحيد الأسماء: راجعه مراجعة أخيرة، وأي تأكيد
// **سلوكي** فيه لا نظير له في `test:storage-honesty` يُنقل إليه أولًا.
//
// إثبات طبقة التخزين الآمنة (RC v1.2.0).
//
// سلوكي: يشغّل safeStorage الحقيقي فوق localStorage مُحاكى يرمي عند الطلب —
// امتلاء حصّة، تخزين محظور، كائن غير قابل للتسلسل — ويتحقّق أن الطبقة لا ترمي
// أبدًا، وتُصنّف السبب بدقّة، وتُبلّغ المستمعين.
//
// وساكن: يتحقّق أن مواقع الكتابة غير المحميّة حُوّلت فعلًا، وأن `portability/`
// **بقيت** بلا حماية عن قصد (تراجع الاستيراد يعتمد على انتشار الاستثناء).
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { strict as assert } from 'node:assert'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

console.log('════════ إثبات التخزين الآمن — قِمّة ════════')

// ─────────────────────────────────────────────────────────────── سلوكي
const banner = `
globalThis.__mode = 'ok';
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => {
    if (globalThis.__mode === 'quota') { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    if (globalThis.__mode === 'safari22') { const e = new Error('quota'); e.name = 'Whatever'; e.code = 22; throw e; }
    if (globalThis.__mode === 'blocked') { throw new Error('access denied'); }
    __store.set(k, String(v));
  },
  removeItem: (k) => {
    if (globalThis.__mode === 'blocked') { throw new Error('access denied'); }
    __store.delete(k);
  },
};
globalThis.localStorage = __ls;
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: __ls };
globalThis.__store = __store;
`

const built = await build({
  entryPoints: [resolve(root, 'src/lib/safeStorage.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'safe-storage-proof-'))
const file = join(dir, 'mod.mjs')
writeFileSync(file, built.outputFiles[0].text)
const S = await import(pathToFileURL(file).href)

console.log('\n═══ 1) الكتابة الطبيعية ═══')
globalThis.__mode = 'ok'
check("safeWrite يُرجع 'ok'", S.safeWrite('k1', 'v1') === 'ok')
check('القيمة نزلت فعلًا', globalThis.__store.get('k1') === 'v1')
check("safeWriteJson يُرجع 'ok'", S.safeWriteJson('k2', { a: 1 }) === 'ok')
check('JSON نزل صحيحًا', globalThis.__store.get('k2') === '{"a":1}')
check('لا فشل مسجَّل بعد نجاح', S.getStorageFailure() === null)

console.log('\n═══ 2) امتلاء الحصّة — لا رمي، وتصنيف صحيح ═══')
S.clearStorageFailure()
globalThis.__mode = 'quota'
let threw = false
let res
try { res = S.safeWriteJson('big', { x: 'y' }) } catch { threw = true }
check('safeWriteJson لا يرمي عند امتلاء الحصّة', threw === false)
check("يُرجع 'quota'", res === 'quota')
check('الفشل مسجَّل بالمفتاح الصحيح', S.getStorageFailure()?.key === 'big')
check("سبب الفشل 'quota'", S.getStorageFailure()?.result === 'quota')

console.log('\n═══ 3) Safari القديم (code === 22) يُصنَّف quota أيضًا ═══')
S.clearStorageFailure()
globalThis.__mode = 'safari22'
check("code=22 يُصنَّف 'quota'", S.safeWrite('s', '1') === 'quota')

console.log('\n═══ 4) التخزين محظور ═══')
S.clearStorageFailure()
globalThis.__mode = 'blocked'
check("خطأ غير الحصّة يُصنَّف 'error'", S.safeWrite('b', '1') === 'error')
threw = false
try { S.safeRemove('b') } catch { threw = true }
check('safeRemove لا يرمي عند الحظر', threw === false)
check('isStorageWritable يُرجع false عند الحظر', S.isStorageWritable() === false)
globalThis.__mode = 'ok'
check('isStorageWritable يُرجع true وقت السلامة', S.isStorageWritable() === true)
check('فحص الكتابة لا يترك مفتاح الفحص خلفه', globalThis.__store.has('__qimmah_probe__') === false)

console.log('\n═══ 5) كائن غير قابل للتسلسل ═══')
S.clearStorageFailure()
const cyclic = {}
cyclic.self = cyclic
threw = false
let r2
try { r2 = S.safeWriteJson('c', cyclic) } catch { threw = true }
check('الكائن الدوري لا يرمي', threw === false)
check("يُرجع 'error'", r2 === 'error')

console.log('\n═══ 6) تنبيه المستمعين ═══')
S.clearStorageFailure()
const seen = []
const off = S.onStorageFailure((f) => seen.push(f?.result))
globalThis.__mode = 'quota'
S.safeWrite('n', '1')
check('المستمع أُبلِغ', seen.length === 1 && seen[0] === 'quota')
off()
S.safeWrite('n2', '1')
check('إلغاء الاشتراك يعمل', seen.length === 1)
const throwing = S.onStorageFailure(() => { throw new Error('bad listener') })
threw = false
try { S.safeWrite('n3', '1') } catch { threw = true }
check('مستمعٌ يرمي لا يُسقط الكتابة', threw === false)
throwing()
globalThis.__mode = 'ok'

// ─────────────────────────────────────────────────────────────── ساكن
console.log('\n═══ 7) مواقع الكتابة حُوّلت فعلًا ═══')
const CONVERTED = [
  'src/features/todo/store.ts', 'src/lib/appPreferences.ts', 'src/lib/commitmentTracking.ts',
  'src/lib/customization.ts', 'src/lib/healthKit.ts', 'src/lib/notifications/prefs.ts',
  'src/lib/onboarding.ts', 'src/lib/stepCounter.ts', 'src/lib/today.ts',
  'src/lib/wellnessTracking.ts', 'src/lib/workoutHydration.ts', 'src/lib/historyStore.ts',
]
for (const f of CONVERTED) {
  const s = read(f)
  check(`${f.replace('src/', '')} لا يكتب إلى localStorage مباشرةً`, !/window\.localStorage\.(setItem|removeItem)/.test(s))
  check(`${f.replace('src/', '')} يستورد الطبقة الآمنة`, /from '@\/lib\/safeStorage'/.test(s))
}

console.log('\n═══ 8) historyStore لم يعد يبتلع الفشل ═══')
const hs = read('src/lib/historyStore.ts')
check('writeJSON يُرجع boolean', /function writeJSON\(key: string, value: unknown\): boolean/.test(hs))
// النمط القديم: catch يبتلع فشل الكتابة بلا أثر. (الذِكر في تعليق توثيقي مسموح.)
check('لم يبقَ catch يبتلع فشل الكتابة', !/catch \{\s*\/\* تجاهل امتلاء التخزين \*\/\s*\}/.test(hs))
const fw = read('src/lib/finishWorkout.ts')
check('إنهاء التمرين يبدأ من حالة فشل نظيفة', /clearStorageFailure\(\)/.test(fw))
check('إنهاء التمرين يكشف فشل التخزين للواجهة', /export function lastFinishStorageFailure\(\)/.test(fw))

console.log('\n═══ 9) portability بقيت بلا حماية — عن قصد ═══')
// تراجع الاستيراد يعتمد على انتشار الاستثناء إلى applyImport. حمايتها تحوّل
// استيرادًا فاشلًا إلى استيراد جزئي صامت.
const reg = read('src/lib/portability/registry.ts')
const imp = read('src/lib/portability/importer.ts')
check('registry.writeRaw ما زال يكتب مباشرةً (يجب أن يرمي)', /window\.localStorage\.setItem\(key, JSON\.stringify\(value\)\)/.test(reg))
check('registry لا يستورد الطبقة الآمنة', !/from '@\/lib\/safeStorage'/.test(reg))
check('restoreSnapshot ما زال يكتب مباشرةً', /window\.localStorage\.setItem\(key, JSON\.stringify\(entry\.v\)\)/.test(imp))
check('importer لا يستورد الطبقة الآمنة', !/from '@\/lib\/safeStorage'/.test(imp))

console.log(`\n✅ إثبات التخزين الآمن: ${pass} فحصًا، 0 فشل.`)
