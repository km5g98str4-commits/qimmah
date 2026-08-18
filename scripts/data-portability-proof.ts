import { setLastUser } from '@/lib/accountScope'
import { getDefaultCustomization } from '@/lib/customization'
import {
  buildQimmahDataExport,
  dataExportFilename,
  DataExportError,
  MAX_DATA_EXPORT_BYTES,
  serializeQimmahDataExport,
} from '@/lib/dataPortability'
import { saveCustomPlan } from '@/features/customPlan/storage'
import { saveTodos } from '@/features/todo/store'
import { getDayStamp } from '@/lib/today'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


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
bundle.data.todos.items[0].text = 'س'.repeat(MAX_DATA_EXPORT_BYTES)
check('النسخة الضخمة تُرفض قبل التسليم', throwsCode(() => serializeQimmahDataExport(bundle), 'too-large'))

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص تصدير البيانات نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
