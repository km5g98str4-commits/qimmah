import { setLastUser, wipeUserData } from '@/lib/accountScope'
import { getDefaultCustomization } from '@/lib/customization'
import {
  buildQimmahDataExport,
  applyPreparedDataImport,
  DATA_RESTORE_BACKUP_PREFIX,
  dataExportFilename,
  DataImportError,
  DataExportError,
  MAX_DATA_EXPORT_BYTES,
  prepareQimmahDataImport,
  serializeQimmahDataExport,
} from '@/lib/dataPortability'
import { saveCustomPlan } from '@/features/customPlan/storage'
import { saveTodos } from '@/features/todo/store'
import { getDayStamp } from '@/lib/today'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

function throwsCode(run: () => unknown, code: string): boolean {
  try {
    run()
    return false
  } catch (error) {
    return error instanceof DataExportError && error.code === code
  }
}

function throwsImportCode(run: () => unknown, code: string): boolean {
  try {
    run()
    return false
  } catch (error) {
    return error instanceof DataImportError && error.code === code
  }
}

const ls = globalThis.localStorage
const ownerA = 'user-a'
const ownerB = 'user-b'
const today = getDayStamp()

console.log('\n① تصدير صريح ومربوط بالمالك')
ls.clear()
setLastUser(ownerA)
ls.setItem('qimmah:history:migrated:v1', 'done')
ls.setItem('qimmah:history:measurementLogs:v1', JSON.stringify([{ id: 'm-1', date: today, values: { weightKg: 78 } }]))
ls.setItem('qimmah:steps:v1', JSON.stringify({ [today]: 8123 }))
ls.setItem('qimmah:stepSource:v1', JSON.stringify({ [today]: 'manual' }))
ls.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: { first: today }, proteinDays: [], prCount: 2 }))
ls.setItem('qimmah:nutrition:v2', JSON.stringify({ date: today, foods: [{ id: 'food-a', nameAr: 'تفاح', calories: 80, protein: 0, meal: 'snack' }], waterMl: 500 }))
ls.setItem('qimmah:coach:lessons:v1:user-a', JSON.stringify(['lesson-a']))
ls.setItem('qimmah:supabase-auth:v1', 'AUTH_TOKEN_MUST_NEVER_EXPORT')
ls.setItem('qimmah:syncQueue:v1:user-a', 'SYNC_QUEUE_MUST_NEVER_EXPORT')
ls.setItem('qimmah:syncBackup:v1:user-a', 'SYNC_BACKUP_MUST_NEVER_EXPORT')
ls.setItem('qimmah:sync:meta:v1:user-a', 'SYNC_META_MUST_NEVER_EXPORT')

const basePlan = getDefaultCustomization().workoutPlan
saveCustomPlan(ownerA, { ...basePlan, name: 'A_PRIVATE_PLAN' })
saveCustomPlan(ownerB, { ...basePlan, name: 'B_PRIVATE_PLAN' })
saveTodos(ownerA, { date: today, items: [{ id: 'a', text: 'A_PRIVATE_TODO', done: false }] })
saveTodos(ownerB, { date: today, items: [{ id: 'b', text: 'B_PRIVATE_TODO', done: false }] })

const exportedAt = new Date('2026-07-14T10:00:00.000Z')
const bundle = buildQimmahDataExport({ ownerId: ownerA, email: 'a@example.com', now: exportedAt })
const json = serializeQimmahDataExport(bundle)
const cleanJson = json
check('صيغة وإصدار ثابتان', bundle.format === 'qimmah-data-export' && bundle.schemaVersion === 1)
check('هوية النسخة وتاريخها واضحان', bundle.account.userId === ownerA && bundle.exportedAt === exportedAt.toISOString())
check('القياسات القانونية موجودة', bundle.data.history.measurementLogs[0]?.values.weightKg === 78)
check('الخطوات ومصدرها موجودان', bundle.data.steps.days[0]?.steps === 8123 && bundle.data.steps.days[0]?.source === 'manual')
check('تفاصيل تغذية اليوم موجودة', bundle.data.currentDay.nutrition.foods[0]?.nameAr === 'تفاح')
check('خطة ومهام المالك الحالي فقط', json.includes('A_PRIVATE_PLAN') && json.includes('A_PRIVATE_TODO'))
check('لا أثر لبيانات الحساب الآخر', !json.includes('B_PRIVATE_PLAN') && !json.includes('B_PRIVATE_TODO'))
check('لا رموز مصادقة أو آثار مزامنة', !json.includes('AUTH_TOKEN_MUST_NEVER_EXPORT') && !json.includes('SYNC_QUEUE_MUST_NEVER_EXPORT') && !json.includes('SYNC_BACKUP_MUST_NEVER_EXPORT') && !json.includes('SYNC_META_MUST_NEVER_EXPORT'))
check('اسم الملف حتمي وآمن', dataExportFilename(bundle.exportedAt) === 'qimmah-data-2026-07-14.json')

console.log('\n② حراس الاستعادة والمالك والحجم')
check('PASSWORD_RECOVERY يمنع التصدير', throwsCode(() => buildQimmahDataExport({ ownerId: ownerA, recoveryActive: true }), 'recovery-active'))
setLastUser(ownerB)
check('اختلاف مالك الجهاز يمنع التصدير', throwsCode(() => buildQimmahDataExport({ ownerId: ownerA }), 'owner-mismatch'))
setLastUser(ownerA)

console.log('\n③ معاينة الاستعادة والتحقق البنيوي')
const prepared = prepareQimmahDataImport(cleanJson, { ownerId: ownerA, email: 'a@example.com' })
check('المعاينة لا تغيّر البيانات وتعرض العدادات', prepared.preview.measurements === 1 && prepared.preview.stepDays === 1 && prepared.preview.todos === 1)
check('JSON غير صالح يُرفض', throwsImportCode(() => prepareQimmahDataImport('{', { ownerId: ownerA }), 'invalid-json'))
check('صيغة غريبة تُرفض', throwsImportCode(() => prepareQimmahDataImport(JSON.stringify({ ...JSON.parse(cleanJson), format: 'other' }), { ownerId: ownerA }), 'invalid-format'))
check('إصدار غير مدعوم يُرفض', throwsImportCode(() => prepareQimmahDataImport(JSON.stringify({ ...JSON.parse(cleanJson), schemaVersion: 999 }), { ownerId: ownerA }), 'unsupported-version'))
check('حقل علوي غير مسموح يُرفض', throwsImportCode(() => prepareQimmahDataImport(JSON.stringify({ ...JSON.parse(cleanJson), authToken: 'secret' }), { ownerId: ownerA }), 'invalid-data'))
check('حقل مزامنة داخل data يُرفض', throwsImportCode(() => prepareQimmahDataImport(JSON.stringify({ ...JSON.parse(cleanJson), data: { ...JSON.parse(cleanJson).data, syncQueue: ['steal'] } }), { ownerId: ownerA }), 'invalid-data'))
check('مفتاح prototype غير آمن يُرفض', throwsImportCode(() => prepareQimmahDataImport(cleanJson.replace('"build":', '"__proto__": {}, "build":'), { ownerId: ownerA }), 'dangerous-key'))
check('PASSWORD_RECOVERY يمنع الاستعادة', throwsImportCode(() => prepareQimmahDataImport(cleanJson, { ownerId: ownerA, recoveryActive: true }), 'recovery-active'))
setLastUser(ownerB)
check('لا يمكن استعادة نسخة حساب آخر', throwsImportCode(() => prepareQimmahDataImport(cleanJson, { ownerId: ownerB }), 'owner-mismatch'))
setLastUser(ownerA)

console.log('\n④ تطبيق ذري ونسخة احتياطية ومسح مالكي')
const incoming = JSON.parse(cleanJson)
incoming.data.customization.identity.userName = 'RESTORED_OWNER_A'
incoming.data.steps.days = [{ date: today, steps: 4321, source: 'manual' }]
incoming.data.todos.items = [{ id: 'restored', text: 'RESTORED_TODO', done: false }]
const beforeRestore = buildQimmahDataExport({ ownerId: ownerA, email: 'a@example.com' })
const incomingPrepared = prepareQimmahDataImport(JSON.stringify(incoming), { ownerId: ownerA, email: 'a@example.com' })
const applied = applyPreparedDataImport(incomingPrepared, { ownerId: ownerA, email: 'a@example.com' })
const afterRestore = buildQimmahDataExport({ ownerId: ownerA, email: 'a@example.com' })
const storedBackup = JSON.parse(localStorage.getItem(applied.backupKey) ?? 'null')
check('تُحفظ نسخة احتياطية قبل الاستبدال', applied.backupKey === `${DATA_RESTORE_BACKUP_PREFIX}${ownerA}` && storedBackup?.account?.userId === ownerA && JSON.stringify(storedBackup.data) === JSON.stringify(beforeRestore.data))
check('الاستعادة تكتب عبر المخازن القانونية', afterRestore.data.customization.identity.userName === 'RESTORED_OWNER_A' && afterRestore.data.steps.days[0]?.steps === 4321 && afterRestore.data.todos.items[0]?.text === 'RESTORED_TODO')
check('إعادة فحص المالك عند التطبيق', throwsImportCode(() => applyPreparedDataImport(incomingPrepared, { ownerId: ownerB }), 'owner-mismatch'))

const customizationBeforeFailure = localStorage.getItem('qimmah:customization:v1')
const failureControl = globalThis as typeof globalThis & { __failSetKey?: string }
failureControl.__failSetKey = 'qimmah:customization:v1'
check('فشل كتابة يعيد اللقطة السابقة ويُعلن الخطأ', throwsImportCode(() => applyPreparedDataImport(prepared, { ownerId: ownerA, email: 'a@example.com' }), 'apply-failed') && localStorage.getItem('qimmah:customization:v1') === customizationBeforeFailure)
check('حتى بعد التراجع تبقى النسخة الاحتياطية السابقة للاستعادة', localStorage.getItem(`${DATA_RESTORE_BACKUP_PREFIX}${ownerA}`) !== null)
wipeUserData(ownerA)
check('مسح بيانات المالك يحذف نسخة الاستعادة', localStorage.getItem(`${DATA_RESTORE_BACKUP_PREFIX}${ownerA}`) === null)

console.log('\n⑤ حدود الحجم')
const oversized = structuredClone(bundle)
oversized.data.todos.items[0].text = 'س'.repeat(MAX_DATA_EXPORT_BYTES)
check('النسخة الضخمة تُرفض قبل التسليم', throwsCode(() => serializeQimmahDataExport(oversized), 'too-large'))
check('ملف الاستعادة الضخم يُرفض قبل التحليل', throwsImportCode(() => prepareQimmahDataImport(' '.repeat(MAX_DATA_EXPORT_BYTES + 1), { ownerId: ownerA }), 'too-large'))

console.log('\n⑥ ربط الواجهة وإتاحة الوصول')
const restorePanelSource = readFileSync(resolve(process.cwd(), 'src/components/DataRestorePanel.tsx'), 'utf8')
const settingsSource = readFileSync(resolve(process.cwd(), 'src/views/SettingsView.tsx'), 'utf8')
const profileSource = readFileSync(resolve(process.cwd(), 'src/views/ProfileV2.tsx'), 'utf8')
check('سطح v1 يستخدم مستورد البيانات القانوني', settingsSource.includes('<DataRestorePanel') && !settingsSource.includes('JSON.parse(String(reader.result))'))
check('سطح v2 يستخدم المستورد نفسه', profileSource.includes('<DataRestorePanel'))
check('التطبيق يتطلب تأكيدًا صريحًا', restorePanelSource.includes('checked={confirmed}') && restorePanelSource.includes('disabled={!confirmed'))
check('حالات النجاح والخطأ معلنة لقارئ الشاشة', restorePanelSource.includes('role="status"') && restorePanelSource.includes('role="alert"'))
check('اختيار الملف له اسم وصولي', restorePanelSource.includes('aria-label={copy.choose}'))

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص تصدير البيانات نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
