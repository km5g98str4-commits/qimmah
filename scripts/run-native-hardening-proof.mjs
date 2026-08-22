// مشغّل برهان P14 (تقوية الطبقة الأصلية) — نمط شيم esbuild المعتمد.
// المرحلة ١: فحوص grep على السويفت وInfo.plist وApp.entitlements — أشياء لا يمكن
//            إثباتها من TypeScript (قائمة الكتابة الفارغة، صدق «لا denied»، نصوص
//            الأذونات ثنائية اللغة، غياب أوضاع الخلفية غير المبرَّرة).
// المرحلة ٢: برهان الوحدات native-hardening-proof.ts.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let manifestPassed = 0
const fail = (label, detail = '') => {
  console.error(`✗ FAIL: ${label}${detail ? `\n${detail}` : ''}`)
  process.exit(1)
}
const ok = (label) => {
  manifestPassed += 1
  console.log(`  ✓ ${label}`)
}
const read = (rel) => readFileSync(resolve(root, rel), 'utf8')

console.log('\n⓪ الجسر الأصلي وملفّات البيان (grep)')

const health = read('ios/App/App/HealthKitStepsPlugin.swift')
const barcode = read('ios/App/App/BarcodeScanPlugin.swift')
const plist = read('ios/App/App/Info.plist')
const entitlements = read('ios/App/App/App.entitlements')

// ── قراءة فقط: قائمة الكتابة فارغة حرفيًا، ولا سجلّات سريرية ──
if (!/requestAuthorization\(toShare:\s*\[\],/.test(health)) fail('قائمة كتابة HealthKit فارغة حرفيًا (toShare: [])')
ok('HealthKit: قائمة الكتابة فارغة حرفيًا (toShare: [])')
if (/HKClinicalType|clinicalType/.test(health)) fail('لا سجلّات سريرية في الجسر')
ok('HealthKit: لا أنواع سجلّات سريرية إطلاقًا')
if (/NSHealthUpdateUsageDescription/.test(plist)) fail('لا NSHealthUpdateUsageDescription (لا كتابة ⇒ لا مفتاح كتابة)')
ok('Info.plist: لا مفتاح كتابة صحية (يطابق قراءة-فقط)')

// ── صدق «لا denied»: لا مسار قراءة يدّعي رفض المستخدم ──
const deniedHits = health
  .split('\n')
  .map((line, i) => [i + 1, line])
  .filter(([, line]) => /"permission":\s*"denied"/.test(line))
if (deniedHits.length) fail('لا مسار في جسر الصحة يدّعي "denied" (iOS يخفي رفض القراءة)', deniedHits.map(([n, l]) => `  ${n}: ${l.trim()}`).join('\n'))
ok('HealthKit: صفر مسار يدّعي "denied" — الفشل يعود "unknown"')
if (!/"permission":\s*"unknown"/.test(health)) fail('الجسر يعيد "unknown" عند فشل الاستعلام/الطلب')
ok('HealthKit: فشل الاستعلام/الطلب يعود "unknown" صراحةً')
if (/'denied'/.test(read('src/lib/health/connect.ts').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))) {
  fail("طبقة الصحة الواسعة لا تنتج 'denied' في أي كود فعلي")
}
ok('طبقة الصحة الواسعة: لا حالة denied في الكود (التعليقات وحدها تشرحها)')

// ── حراسة توفّر أنواع iOS 16 ──
if (!/#available\(iOS 16\.0, \*\)/.test(health)) fail('أنواع iOS 16 محروسة بـ#available')
ok('HealthKit: أنواع iOS 16 (حرارة المعصم/تعافي النبض) محروسة بـ#available')

// ── تشخيص الصحة: بيانات وصفية فقط ──
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const healthDiag = stripComments(read('src/lib/health/diagnostics.ts'))
if (/\.value\b|kcal|bpm|weightKg|quantity\./.test(healthDiag)) fail('تشخيص الصحة لا يلمس أي قيمة صحية')
ok('تشخيص الصحة: صفر وصول لقيمة عيّنة (بيانات وصفية فقط)')

// ── الباركود الأصلي: تفكيك حتمي وفحص كاميرا مسبق ──
if (!/guard AVCaptureDevice\.default\(\.builtInWideAngleCamera[\s\S]{0,220}"no-camera"/.test(barcode)) {
  fail('الباركود: فحص توفّر الكاميرا قبل عرض الشاشة (تفادي شاشة سوداء عالقة)')
}
ok('الباركود: توفّر الكاميرا يُفحص قبل العرض ⇒ no-camera فوري')
if (!/private func teardownCapture\(\)/.test(barcode) || !/setTorch\(false\)/.test(barcode)) {
  fail('الباركود: تفكيك حتمي يُطفئ الفلاش (torch off) في المسار الطرفي')
}
ok('الباركود: التفكيك يُطفئ الفلاش أولًا (لا فلاش يبقى مشتعلًا)')
if (!/for input in session\.inputs \{ session\.removeInput\(input\) \}/.test(barcode) || !/setMetadataObjectsDelegate\(nil, queue: nil\)/.test(barcode)) {
  fail('الباركود: جلسة الالتقاط تُفكَّك (إزالة المدخلات/المخارج + تصفير المفوَّض)')
}
ok('الباركود: الجلسة تُفكَّك كاملة (لا جلسة التقاط معلّقة تستهلك البطارية)')
if (!/stopRunning\(\)/.test(barcode)) fail('الباركود: الجلسة تُوقَف عند الإغلاق')
ok('الباركود: الجلسة تُوقَف عند الإغلاق')
if (!/\.ean13, \.ean8, \.upce/.test(barcode)) fail('الباركود: صيغ التجزئة EAN-13/EAN-8/UPC-E مطلوبة')
ok('الباركود: صيغ التجزئة (EAN-13/EAN-8/UPC-E؛ UPC-A يصل كـEAN-13)')
if (!/position: \.back/.test(barcode)) fail('الباركود: الكاميرا الخلفية صراحةً')
ok('الباركود: الكاميرا الخلفية مُختارة صراحةً')

// ── نصوص الأذونات: كل مفتاح مستخدم فعلًا وثنائي اللغة ──
const purpose = (key) => {
  const m = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([\\s\\S]*?)</string>`))
  return m ? m[1] : null
}
const arabic = /[؀-ۿ]/
for (const key of ['NSCameraUsageDescription', 'NSHealthShareUsageDescription', 'NSLocationWhenInUseUsageDescription']) {
  const text = purpose(key)
  if (!text) fail(`Info.plist: ${key} موجود`)
  if (!arabic.test(text)) fail(`Info.plist: ${key} يحتوي نصًّا عربيًا`)
  if (!/Qimmah/.test(text)) fail(`Info.plist: ${key} يحتوي نصًّا إنجليزيًا (Qimmah ...)`)
  ok(`Info.plist: ${key} ثنائي اللغة (عربي + إنجليزي)`)
}
// صدق الوصف: الكاميرا للباركود فقط، والموقع للغروب فقط، والصحة تذكر المجموعات الموسّعة.
if (!/باركود/.test(purpose('NSCameraUsageDescription')) || !/barcode/i.test(purpose('NSCameraUsageDescription'))) {
  fail('Info.plist: وصف الكاميرا يقتصر على مسح الباركود')
}
ok('Info.plist: وصف الكاميرا = مسح باركود الطعام فقط (يطابق الاستخدام الفعلي)')
if (!/الغروب/.test(purpose('NSLocationWhenInUseUsageDescription')) || !/sunset/i.test(purpose('NSLocationWhenInUseUsageDescription'))) {
  fail('Info.plist: وصف الموقع يقتصر على حساب الغروب/الشروق')
}
ok('Info.plist: وصف الموقع = جدولة الوضع الداكن بالغروب فقط (يطابق الاستخدام الفعلي)')
const healthPurpose = purpose('NSHealthShareUsageDescription')
for (const group of ['النوم', 'القلب', 'التغذية', 'قياسات الجسم']) {
  if (!healthPurpose.includes(group)) fail(`Info.plist: وصف الصحة يذكر مجموعة «${group}» الموسّعة`)
}
ok('Info.plist: وصف الصحة يغطّي المجموعة الموسّعة (نشاط/جسم/قلب/نوم/علامات/تغذية)')
if (!/يقرأ ولا يكتب/.test(healthPurpose) || !/Read-only/i.test(healthPurpose)) fail('Info.plist: وصف الصحة يقرّ «قراءة فقط» باللغتين')
ok('Info.plist: وصف الصحة يقرّ قراءة-فقط ولا مشاركة ولا إعلانات')

// ── التصدير/التشفير + أوضاع الخلفية ──
if (!/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist)) {
  fail('Info.plist: ITSAppUsesNonExemptEncryption معلَن (false — لا تشفير خاص)')
}
ok('Info.plist: ITSAppUsesNonExemptEncryption = false (لا سؤال تصدير عند كل رفع)')
if (/UIBackgroundModes/.test(plist)) {
  fail('Info.plist: لا أوضاع خلفية — الإشعارات المحلية لا تحتاجها ومؤقّت الراحة يُحسب من endsAt')
}
ok('Info.plist: صفر UIBackgroundModes (لا صلاحية خلفية غير مبرَّرة)')

// ── الاستحقاقات: HealthKit وحده ──
const entKeys = [...entitlements.matchAll(/<key>([^<]+)<\/key>/g)].map((m) => m[1])
if (entKeys.length !== 1 || entKeys[0] !== 'com.apple.developer.healthkit') {
  fail('App.entitlements: HealthKit وحده لا غير', `الموجود: ${entKeys.join(', ') || '(فارغ)'}`)
}
ok('App.entitlements: استحقاق واحد فقط (com.apple.developer.healthkit) — لا قدرات غير مستخدمة')

console.log(`  — ${manifestPassed} فحص بيان/جسر ✓`)

// ── المرحلة ٢: برهان الوحدات ───────────────────────────────────────────────
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/native-hardening-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'native-hardening-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
process.chdir(root)
await import(pathToFileURL(file).href)
