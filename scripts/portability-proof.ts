// إثبات نظام نقل البيانات (تصدير/استيراد) — قِمّة (PDPL R-1). بلا متصفح.
// يعمل فوق localStorage مُحاكى (banner في المُشغّل). يغطّي:
//  ١) أمانة الجولة الكاملة (export→wipe→import→deep-equal لكل متجر عبر المُحمِّلات).
//  ٢) بوّابة الإصدار (رفض schemaVersion غير متوافق).
//  ٣) رفض الملفّات المشوّهة/المعادية (لكل شكل متجر + تلويث النموذج + النوع + الحجم).
//  ٤) إعادة الترميز للمستخدم الحالي (استيراد نسخة A إلى B → تهبط تحت B لا A).
//  ٥) التراجع يُعيد ما قبل الاستيراد تمامًا.
//  ٦) عزل مستخدمَين (تصدير A لا يحوي بيانات B).

import { getDayStamp } from '@/lib/today'
import { wipeUserData } from '@/lib/accountScope'
import { readSyncQueue, setSyncFeatureEnabledForTests, setSyncRuntime } from '@/lib/syncQueue'
import { setCloudSyncConsent } from '@/lib/syncConsent'
import {
  buildExportBundle,
  parseImportFile,
  applyImport,
  undoImport,
  hasUndo,
  PortabilityError,
  PORTABILITY_SCHEMA_VERSION,
  undoKey,
} from '@/lib/portability'
import { STORE_BY_ID } from '@/lib/portability/registry'
import { getWorkoutSessions, getNutritionLogs } from '@/lib/historyStore'
import { loadTodos } from '@/features/todo/store'
import { loadCustomPlanRecord } from '@/features/customPlan/storage'

let pass = 0
let fail = 0
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}
function expectThrow(label: string, fn: () => void, wantStore?: string): void {
  try {
    fn()
    fail++; console.log(`  ✗ FAIL: ${label} (لم يرمِ)`)
  } catch (e) {
    const isPE = e instanceof PortabilityError
    const storeOk = wantStore == null || (isPE && (e as PortabilityError).store === wantStore)
    if (isPE && storeOk) { pass++; console.log(`  ✓ ${label} → «${(e as PortabilityError).message}»`) }
    else { fail++; console.log(`  ✗ FAIL: ${label} (خطأ غير متوقّع: ${String(e)})`) }
  }
}

const ls = () => globalThis.localStorage
function clearAll(): void { ls().clear() }
function raw(key: string, value: unknown): void { ls().setItem(key, JSON.stringify(value)) }
function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const ka = Object.keys(a as object), kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every((k) => deepEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

const TODAY = getDayStamp()
const UID_A = 'user-A-11111111'
const UID_B = 'user-B-22222222'

/** يبذر مجموعة متاجر تمثّل الأنواع الثلاثة (ثابت/مالك-لاحقة/مالك-خريطة) للمستخدم المعطى. */
function seedFor(uid: string): void {
  // ثابت: مصفوفة + ByDate + كائن
  raw('qimmah:history:workoutSessions:v1', [
    { id: 's1', date: TODAY, dayId: 'push', exercises: [] },
    { id: 's2', date: TODAY, dayId: 'pull', exercises: [] },
  ])
  raw('qimmah:history:nutritionLogs:v1', { [TODAY]: { items: [{ id: 'f1', kcal: 250 }] } })
  raw('qimmah:history:measurementLogs:v1', [{ id: 'm1', date: TODAY, weightKg: 80 }])
  raw('qimmah:steps:v1', { [TODAY]: 5231 })
  raw('qimmah:customization:v1', { profile: { goal: 'cut' }, marker: `cust-${uid}` })
  // مالك-لاحقة: todo + activeSession
  raw(`qimmah:todo:v1:${uid}`, { date: TODAY, items: [{ id: 't1', text: `مهمة ${uid}`, done: false }] })
  raw(`qimmah:activeSession:v1:${uid}`, { dayId: 'push', startedAt: TODAY, marker: uid })
  // مالك-خريطة: customPlan
  raw('qimmah:customPlan:v1', {
    [uid]: { plan: { days: [{ id: 'd1', nameAr: 'دفع', nameEn: 'Push', exercises: [] }] }, source: 'custom', updatedAt: TODAY },
  })
}

/** يلتقط مخرجات المُحمِّلات لكل المتاجر المسجّلة (خطّ الأساس للمقارنة). */
function loaderBaseline(uid: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const def of Object.values(STORE_BY_ID)) out[def.id] = def.load(uid)
  return out
}

console.log('\n=== إثبات نقل البيانات (Portability) ===\n')

// ————— (١) أمانة الجولة الكاملة عبر المُحمِّلات —————
console.log('١) أمانة الجولة: export → wipe → import → deep-equal لكل متجر')
clearAll()
seedFor(UID_A)
setSyncRuntime(UID_A, false)
const baselineA = loaderBaseline(UID_A)
const bundleA = buildExportBundle(UID_A)
check('الحزمة تحمل schemaVersion + exportedAt + summaryAr', bundleA.schemaVersion === PORTABILITY_SCHEMA_VERSION && !!bundleA.exportedAt && bundleA.summaryAr.includes('نسخة بيانات قِمّة'))
check('الملخّص العربي يذكر التمارين', bundleA.summaryAr.includes('تمارين'))
check('الحزمة التقطت المتاجر (todo/customPlan/workoutSessions)', 'todo' in bundleA.stores && 'customPlan' in bundleA.stores && 'workoutSessions' in bundleA.stores)
wipeUserData(UID_A)
check('بعد المسح: لا تمارين', getWorkoutSessions().length === 0)
const res = applyImport(bundleA, UID_A, UID_A)
check('applyImport طبّق متاجر', res.storesApplied >= 8)
const afterA = loaderBaseline(UID_A)
let rtOk = true
for (const id of Object.keys(baselineA)) {
  if (!deepEq(baselineA[id], afterA[id])) { rtOk = false; console.log(`    ✗ اختلاف في المتجر: ${id}`) }
}
check('كل المتاجر متطابقة بعد الجولة (deep-equal عبر المُحمِّلات)', rtOk)
check('التمارين استُعيدت (2)', getWorkoutSessions().length === 2)
check('التغذية استُعيدت', Object.keys(getNutritionLogs()).length === 1)

// ————— (٢) بوّابة الإصدار —————
console.log('\n٢) بوّابة الإصدار: رفض schemaVersion غير متوافق')
const badVer = JSON.stringify({ ...bundleA, schemaVersion: 999 })
expectThrow('رفض إصدار 999', () => parseImportFile(badVer, UID_A))
const goodVer = JSON.stringify(bundleA)
check('قبول الإصدار الصحيح (parse ينجح)', parseImportFile(goodVer, UID_A).totalStores >= 8)

// ————— (٣) رفض الملفّات المشوّهة/المعادية —————
console.log('\n٣) رفض الملفّات المشوّهة/المعادية')
expectThrow('رفض JSON تالف', () => parseImportFile('{ not json', UID_A))
expectThrow('رفض نوع غير قِمّة', () => parseImportFile(JSON.stringify({ kind: 'other', schemaVersion: 1, stores: {} }), UID_A))
// نصّ JSON خام يحمل __proto__ فعليًّا (object literal يضبط النموذج لا مفتاحًا — لذا نستخدم نصًّا).
expectThrow('رفض تلويث النموذج (__proto__)', () => parseImportFile('{"kind":"qimmah-data-export","schemaVersion":1,"stores":{},"unregistered":{},"evil":{"__proto__":{"admin":true}}}', UID_A))
expectThrow('رفض تلويث النموذج (constructor)', () => parseImportFile('{"kind":"qimmah-data-export","schemaVersion":1,"stores":{"x":{"constructor":{"y":1}}},"unregistered":{}}', UID_A))
// شكل متجر خاطئ لكل نوع — يُسمّي المتجر
expectThrow('رفض workoutSessions ككائن (يجب مصفوفة)', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, workoutSessions: { not: 'array' } } })), 'تمارين')
expectThrow('رفض todo بلا items', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, todo: { date: TODAY } } })), 'مهام')
expectThrow('رفض customPlan بلا plan', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, customPlan: { source: 'custom' } } })), 'الجدول المخصّص')
expectThrow('رفض متجر مجهول', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, ghostStore: [1, 2] } })), 'ghostStore')
expectThrow('رفض مفتاح مستثنى في unregistered (رمز الجلسة)', () => parseImportFile(JSON.stringify({ ...bundleA, unregistered: { 'qimmah:supabase-auth:v1': { token: 'x' } } })))
expectThrow('رفض البقايا غير المسجّلة بدل كتابتها بمفتاح خام', () => parseImportFile(JSON.stringify({ ...bundleA, unregistered: { 'qimmah:future:v1': { value: 1 } } })))
// سقف العناصر (DoS)
const huge = new Array(100_001).fill(0).map((_, i) => ({ id: `x${i}` }))
expectThrow('رفض تجاوز سقف العناصر', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, workoutSessions: huge } })), 'تمارين')
let deep: unknown = 'leaf'
for (let i = 0; i < 70; i += 1) deep = { value: deep }
expectThrow('رفض عمق JSON غير آمن', () => parseImportFile(JSON.stringify({ ...bundleA, stores: { ...bundleA.stores, customization: deep } }), UID_A))
expectThrow('التطبيق المباشر يعيد التحقّق', () => applyImport({ ...bundleA, stores: { ...bundleA.stores, ghostStore: [] } }, UID_A, UID_A))

// ————— (٤) إعادة الترميز للمستخدم الحالي —————
console.log('\n٤) إعادة الترميز: استيراد نسخة A إلى المستخدم B')
clearAll()
seedFor(UID_A)
setSyncRuntime(UID_A, false)
const bundleFromA = buildExportBundle(UID_A)
clearAll() // جهاز B نظيف
setSyncRuntime(UID_B, false)
applyImport(bundleFromA, UID_B, UID_B)
// افحص المفاتيح الخام أولًا (قبل استدعاء loadTodos(A) الذي قد يُثبّت حالة فارغة عند القراءة).
check('مفتاح todo:B مكتوب (إعادة ترميز)', ls().getItem(`qimmah:todo:v1:${UID_B}`) !== null)
check('مفتاح todo:A غير موجود إطلاقًا (لا حقن حساب A)', ls().getItem(`qimmah:todo:v1:${UID_A}`) === null)
check('رمز الجلسة لم يُكتب إطلاقًا', ls().getItem('qimmah:supabase-auth:v1') === null)
check('todo هبط تحت B', loadTodos(UID_B).items.length === 1 && loadTodos(UID_B).items[0].text.includes(UID_A))
check('todo لم يهبط تحت A (لا حقن حساب)', loadTodos(UID_A).items.length === 0)
check('customPlan هبط تحت B فقط', !!loadCustomPlanRecord(UID_B) && !loadCustomPlanRecord(UID_A))

// ————— (٥) التراجع —————
console.log('\n٥) التراجع يُعيد ما قبل الاستيراد تمامًا')
clearAll()
seedFor(UID_A) // حالة B الأصلية (نستخدم UID_A كمالك حالي)
setSyncRuntime(UID_A, false)
const preImport = loaderBaseline(UID_A)
// حزمة مختلفة (من مستخدم آخر ببيانات مختلفة)
clearAll(); seedFor(UID_B)
setSyncRuntime(UID_B, false)
const otherBundle = buildExportBundle(UID_B)
clearAll(); seedFor(UID_A) // أعِد الحالة الأصلية
setSyncRuntime(UID_A, false)
applyImport(otherBundle, UID_A, UID_A)
check('بعد الاستيراد: البيانات تغيّرت', loadTodos(UID_A).items[0].text.includes(UID_B))
check('نسخة التراجع متاحة', hasUndo(UID_A))
check('مفتاح التراجع مربوط بالمالك', ls().getItem(undoKey(UID_A)) !== null && ls().getItem(undoKey(UID_B)) === null)
check('undoImport نجح', undoImport(UID_A))
const restored = loaderBaseline(UID_A)
let undoOk = true
for (const id of Object.keys(preImport)) if (!deepEq(preImport[id], restored[id])) { undoOk = false; console.log(`    ✗ اختلاف بعد التراجع: ${id}`) }
check('كل المتاجر عادت تمامًا لما قبل الاستيراد', undoOk)
check('نسخة التراجع مُسحت بعد الاستخدام', !hasUndo(UID_A))

// ————— (٦) عزل مستخدمَين + بوّابة الاستعادة —————
console.log('\n٦) عزل مستخدمَين + رفض الاستيراد أثناء الاستعادة')
clearAll()
seedFor(UID_A)
setSyncRuntime(UID_A, false)
raw(`qimmah:todo:v1:${UID_B}`, { date: TODAY, items: [{ id: 'tb', text: 'مهمة B', done: false }] }) // بيانات B على نفس الجهاز
const exportA = buildExportBundle(UID_A)
check('تصدير A لا يحوي مفتاح todo:B الخام', JSON.stringify(exportA).indexOf('مهمة B') === -1)
check('تصدير A: todo يخصّ A فقط', deepEq(exportA.stores.todo, { date: TODAY, items: [{ id: 't1', text: `مهمة ${UID_A}`, done: false }] }))
raw(`qimmah:notifications:v1:${UID_B}`, { masterEnabled: true, marker: 'owner-b-secret' })
check('لا يُصدّر المسح العام مفتاح مالك آخر', !JSON.stringify(buildExportBundle(UID_A)).includes('owner-b-secret'))
// بوّابة الاستعادة
setSyncRuntime(UID_A, true) // recoveryActive = true
expectThrow('رفض الاستيراد أثناء جلسة الاستعادة', () => applyImport(exportA, UID_A, UID_A))
setSyncRuntime(UID_A, false)
check('بعد انتهاء الاستعادة: الاستيراد مسموح', applyImport(exportA, UID_A, UID_A).storesApplied >= 8)
setSyncRuntime(UID_B, false)
expectThrow('رفض الاستيراد عند تغيّر مالك runtime', () => applyImport(exportA, UID_A, UID_A))
let exportOwnerRejected = false
try { buildExportBundle(UID_A) } catch { exportOwnerRejected = true }
check('رفض التصدير عند تغيّر مالك runtime', exportOwnerRejected)

setSyncRuntime(UID_A, false)
const previewA = parseImportFile(JSON.stringify(exportA), UID_A)
setSyncRuntime(UID_B, false)
expectThrow('رفض تأكيد معاينة A بعد الانتقال إلى B', () => applyImport(previewA.bundle, UID_B, previewA.ownerId))

clearAll()
seedFor(UID_A)
setSyncRuntime(UID_A, false)
setSyncFeatureEnabledForTests(true)
const syncBundle = buildExportBundle(UID_A)

// (ج-١) التأكيد المضادّ أوّلًا: بلا موافقة صريحة لا يُعبَّأ الطابور **ولو كان العلم
// مفعّلًا**. أُضيف مع بوابة الموافقة — الاستيراد مسار كتابة كامل، ولو نجا من
// البوابة لكان بابًا خلفيًا يرفع بيانات مستخدم لم يوافق.
const noConsentResult = applyImport(syncBundle, UID_A, UID_A)
check(
  'بلا موافقة: الاستيراد لا يُعبّئ طابور المزامنة رغم تفعيل العلم',
  !noConsentResult.syncQueued && readSyncQueue(UID_A).length === 0,
)

// وبالموافقة: السلوك الأصلي كما كان.
setCloudSyncConsent(UID_A, true)
const syncResult = applyImport(syncBundle, UID_A, UID_A)
check('الاستيراد يُعيد تعبئة طابور المزامنة', syncResult.syncQueued && readSyncQueue(UID_A).length > 0)
setCloudSyncConsent(UID_A, false)
setSyncFeatureEnabledForTests(undefined)

// ————— (QEA-001) متّجهات التدقيق الدقيقة —————
// المستورد القديم غير المُتحقَّق في `#/settings` أُزيل؛ المسار الوحيد للاستيراد هو هذا الخطّ
// المُتحقَّق. نُثبّت متّجهَي التدقيق الحرفيَّين: (أ) ملفّ إصدار خاطئ → مرفوض قبل أي كتابة،
// (ب) ملفّ مالك آخر (uid=B) يُستورَد بواسطة A → يُعاد ترميزه إلى A حصراً وبيانات B على الجهاز
//     تبقى سليمة (حقن حساب آخر مستحيل بنيويًّا).
console.log('\nQEA-001) متّجهات التدقيق: رفض ملفّ الإصدار الخاطئ + استحالة حقن حساب آخر')
clearAll()
seedFor(UID_A)
setSyncRuntime(UID_A, false)
const qeaBundle = buildExportBundle(UID_A)
// (أ) ملفّ إصدار غير متوافق (كما في تقرير التدقيق) → رفض قبل أي كتابة
expectThrow('QEA-001(أ): رفض ملفّ schemaVersion خاطئ', () => parseImportFile(JSON.stringify({ ...qeaBundle, schemaVersion: 999 }), UID_A))
// (ب) ملفّ مالك آخر: B له بيانات حقيقية على الجهاز، ثم يستورد A نسخة B
clearAll()
seedFor(UID_B)
setSyncRuntime(UID_B, false)
const fileFromB = buildExportBundle(UID_B)
clearAll()
seedFor(UID_A)
raw(`qimmah:todo:v1:${UID_B}`, { date: TODAY, items: [{ id: 'b-real', text: 'بيانات B الحقيقية', done: false }] })
setSyncRuntime(UID_A, false)
const previewOfB = parseImportFile(JSON.stringify(fileFromB), UID_A)
check('QEA-001(ب): المعاينة تربط الملكية بالمستورِد A لا B', previewOfB.ownerId === UID_A)
applyImport(previewOfB.bundle, UID_A, previewOfB.ownerId)
check('QEA-001(ب): مفتاح todo الخاص بـ B لم يُلمس (لا حقن)', ls().getItem(`qimmah:todo:v1:${UID_B}`) === JSON.stringify({ date: TODAY, items: [{ id: 'b-real', text: 'بيانات B الحقيقية', done: false }] }))
check('QEA-001(ب): محتوى ملفّ B هبط تحت A حصراً (إعادة ترميز)', loadTodos(UID_A).items.some((i) => i.text.includes(UID_B)))
check('QEA-001(ب): رمز الجلسة لم يُكتب من ملفّ خارجي', ls().getItem('qimmah:supabase-auth:v1') === null)

// ————— النتيجة —————
console.log(`\n=== النتيجة: ${pass} ✓ / ${fail} ✗ ===`)
if (fail > 0) { console.error(`\n❌ فشل ${fail} فحصًا.`); process.exit(1) }
console.log(`\n✅ كل فحوص النقل نجحت — ${pass} فحصًا.`)
