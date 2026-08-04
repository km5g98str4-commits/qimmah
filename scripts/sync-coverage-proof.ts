import { setCloudSyncConsent } from '@/lib/syncConsent'
// برهان تغطية المزامنة (P12) — الجداول الجديدة + شواهد القبر + عقد حالة الواجهة.
//
// يثبت: عزل حسابين على الجداول الجديدة؛ تعارضات جهازين لكل جدول (سحابي أقدم
// يخسر / أحدث يفوز / المعلّق بالطابور محمي)؛ tombstone round-trip + سباق
// حذف-مقابل-تعديل؛ استبعاد المستورد الصحي من الرفع؛ انتقالات getSyncUiState
// (لا ادّعاء «متزامن» قبل أول نجاح فعلي)؛ dedup على الجداول الجديدة؛ سقف
// backoff مع 'attention'؛ ومسار profiles الواحد (إصلاح سباق الكتّاب الثلاثة).

import { markAdoptionPendingIfUnowned, stampDataOwner } from '@/lib/dataOwnership'
import { exportHistory, saveMeasurementLog, setMeasurementLogs } from '@/lib/historyStore'
import {
  getDayEntries,
  ledgerDayStamp,
  loadLedgerDays,
  recordLedgerDay,
} from '@/lib/nutritionHistory'
import { defaultOnboardingProfile, loadOnboardingProfile, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { loadRecoveryEngineLog, saveRecoveryEngineEntry } from '@/lib/recoveryEngine'
import { loadCustomization, saveCustomization } from '@/lib/customization'
import { deleteTemplate, listTemplates, saveTemplate, type PlanTemplate } from '@/features/customPlan/templates'
import { loadWeeklySchedule, saveWeeklySchedule, type WeeklySchedule } from '@/lib/workoutCalendar'
import {
  hasExhaustedSyncOperations,
  MAX_SYNC_ATTEMPTS,
  readSyncQueue,
  RETRY_EXHAUSTED_AT,
  retryExhaustedSyncOperations,
  setSyncFeatureEnabledForTests,
  setSyncRuntime,
} from '@/lib/syncQueue'
import {
  flushSyncQueue,
  getSyncUiState,
  hydrateFromCloud,
  setSyncTransportForTests,
  type SyncTransport,
} from '@/lib/syncService'
import { getDayStamp } from '@/lib/today'
import type { WorkoutPlan } from '@/types/workout'

let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const calls: { table: string; rows: Record<string, unknown>[] }[] = []
const selects: { table: string; userId: string }[] = []
let owner = 'A'
let failUpsert = false
let cloudRows: Record<string, Record<string, unknown>[]> = {}
const transport: SyncTransport = {
  async currentUserId() {
    return owner
  },
  async upsert(table, rows) {
    calls.push({ table, rows })
    if (failUpsert) throw new Error('offline')
  },
  async delete(table, userId, entityKeys) {
    calls.push({ table, rows: entityKeys.map((entityKey) => ({ user_id: userId, entityKey, deleted: true })) })
    if (failUpsert) throw new Error('offline')
  },
  async select(table, userId) {
    selects.push({ table, userId })
    return cloudRows[table] ?? []
  },
}

// (ج-١) بوابة الموافقة تحجب الإدراج بلا موافقة سارية — سلوك صحيح خارج موضوع هذا
// الإثبات (تغطية الجداول). حجبُها المستقلّ مُثبَت في run-sync-consent-proof.
const grantConsent = () => { for (const u of ['A','B','C','D','E','user-A','user-B','u1']) setCloudSyncConsent(u, true) }
setSyncFeatureEnabledForTests(true)
grantConsent()
setSyncTransportForTests(transport)

const PAST = '2020-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'
const today = getDayStamp()
const plan: WorkoutPlan = {
  days: [{ id: 'd1', name: 'دفع', nameEn: 'Push', exercises: [{ id: 'ex1', nameAr: 'ضغط صدر', nameEn: 'Bench', sets: 3, reps: '8-10' }] }],
} as unknown as WorkoutPlan
const validSchedule: WeeklySchedule = {
  version: 1,
  weekdays: [0, 'rest', 1, 'rest', 2, 'rest', 'rest'],
  split: 'full_body',
  daysPerWeek: 3,
  weekStart: 6,
  overrides: {},
  missedDecisions: {},
  source: 'user',
  updatedAt: '',
}
const tbl = (t: string) => calls.filter((c) => c.table === t)
const queueOf = (uid: string, table: string) => readSyncQueue(uid).filter((op) => op.table === table)

console.log('\n① dedup على الجداول الجديدة (latest-write coalescing)')
localStorage.clear()
grantConsent()
setSyncRuntime('A', false)
stampDataOwner('A')
recordLedgerDay({ date: '2026-07-20', foods: [{ id: 'f1', nameAr: 'رز', calories: 200, protein: 5, meal: 'lunch' }] })
recordLedgerDay({ date: '2026-07-20', foods: [{ id: 'f1', nameAr: 'رز', calories: 300, protein: 7, meal: 'lunch' }] })
check('nutrition_ledger: كتابتان لنفس اليوم ⇒ عملية واحدة', queueOf('A', 'nutrition_ledger').length === 1)
saveRecoveryEngineEntry('A', { sleepQuality: 'good' })
saveRecoveryEngineEntry('A', { sleepQuality: 'poor' })
check('recovery_logs: فحصان لنفس اليوم ⇒ عملية واحدة', queueOf('A', 'recovery_logs').length === 1)
saveWeeklySchedule(validSchedule)
saveWeeklySchedule(validSchedule)
check('workout_schedule: حفظان ⇒ عملية واحدة (صف self)', queueOf('A', 'workout_schedule').length === 1)
const saved = saveTemplate('A', { ar: 'قالبي' }, plan)
check('plan_templates: الحفظ يرفع upsert بمعرّف القالب', saved.status === 'ok' && queueOf('A', 'plan_templates').length === 1)
const c1 = loadCustomization()
saveCustomization({ ...c1, identity: { ...c1.identity, userName: 'زياد' } })
saveCustomization({ ...c1, identity: { ...c1.identity, userName: 'زياد ع' } })
check('إعدادات الحساب: حفظان ⇒ عملية profiles/settings واحدة', readSyncQueue('A').filter((op) => op.table === 'profiles' && op.entityKey === 'settings').length === 1)

console.log('\n② أشكال الرفع owner-scoped + شريحة الإعدادات داخل profiles.data.settings')
calls.length = 0
await flushSyncQueue(1_000)
const ledgerRow = tbl('nutrition_ledger')[0]?.rows[0] as { user_id?: string; date?: string; data?: { entries?: unknown[] }; updated_at?: string } | undefined
check('صف الدفتر: مالك + يوم + قيود + طابع LWW', ledgerRow?.user_id === 'A' && ledgerRow?.date === '2026-07-20' && Array.isArray(ledgerRow?.data?.entries) && typeof ledgerRow?.updated_at === 'string')
const recRow = tbl('recovery_logs')[0]?.rows[0] as { user_id?: string; date?: string; updated_at?: string } | undefined
check('صف التعافي: مالك + يوم + طابع LWW', recRow?.user_id === 'A' && recRow?.date === today && typeof recRow?.updated_at === 'string')
const schRow = tbl('workout_schedule')[0]?.rows[0] as { user_id?: string; data?: { weekdays?: unknown[] } } | undefined
check('صف الجدول: مالك واحد + 7 خانات', schRow?.user_id === 'A' && schRow?.data?.weekdays?.length === 7)
const tplRow = tbl('plan_templates')[0]?.rows[0] as { user_id?: string; local_id?: string } | undefined
check('صف القالب: مالك + local_id', tplRow?.user_id === 'A' && tplRow?.local_id === 'tpl-1')
const profRow = tbl('profiles')[0]?.rows[0] as { user_id?: string; data?: { settings?: { identity?: { userName?: string }; updatedAt?: string } } } | undefined
check('شريحة الإعدادات تركب profiles.data.settings بطابعها', profRow?.user_id === 'A' && profRow?.data?.settings?.identity?.userName === 'زياد ع' && typeof profRow?.data?.settings?.updatedAt === 'string')
check('flush ناجح يفرغ الطابور', readSyncQueue('A').length === 0)

console.log('\n③ عزل حسابين على الجداول الجديدة')
const beforeIso = readSyncQueue('A').length
saveTemplate('B', { ar: 'قالب ب' }, plan)
saveRecoveryEngineEntry('B', { sleepQuality: 'good' })
stampDataOwner('B')
recordLedgerDay({ date: '2026-07-21', foods: [{ id: 'fb', nameAr: 'تمر', calories: 60, protein: 0.5, meal: 'snack' }] })
stampDataOwner('A')
check('كتابة بيانات مالك B وجلسة المزامنة A ⇒ لا رفع إطلاقًا', readSyncQueue('A').length === beforeIso && readSyncQueue('B').length === 0)
check('مخازن B معزولة عن A محليًا', listTemplates('B').length === 1 && listTemplates('A').length === 1 && Object.keys(loadLedgerDays('B')).length === 1 && loadRecoveryEngineLog('B').length === 1)
selects.length = 0
setSyncRuntime('B', false)
owner = 'B'
cloudRows = {}
await hydrateFromCloud()
check('ترطيب B يسأل السحابة عن B فقط (لا تسرّب لصفوف A)', selects.length > 0 && selects.every((s) => s.userId === 'B'))
setSyncRuntime('A', false)
owner = 'A'

console.log('\n④ تعارضات جهازين لكل جدول جديد (LWW فعلي)')
// nutrition_ledger — سحابي أقدم يخسر / أحدث يفوز / المعلّق محمي.
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { nutrition_ledger: [{ date: '2026-07-20', data: { entries: [{ id: 'cloud-e', nameAr: 'سحابي', meal: 'lunch', quantity: {}, macros: { calories: 999, protein: 9 }, addedAt: PAST }] }, updated_at: PAST }] }
await hydrateFromCloud()
check('دفتر: صف سحابي أقدم لا يدهس يومًا محليًا أحدث', getDayEntries('2026-07-20')[0]?.id === 'f1')
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { nutrition_ledger: [{ date: '2026-07-20', data: { entries: [{ id: 'cloud-e', nameAr: 'سحابي', meal: 'lunch', quantity: {}, macros: { calories: 999, protein: 9 }, addedAt: FUTURE }] }, updated_at: FUTURE }] }
await hydrateFromCloud()
check('دفتر: صف سحابي أحدث يصل الجهاز', getDayEntries('2026-07-20')[0]?.id === 'cloud-e')
recordLedgerDay({ date: '2026-07-20', foods: [{ id: 'pend', nameAr: 'معلّق', calories: 100, protein: 3, meal: 'dinner' }] }) // يبقى في الطابور
await hydrateFromCloud()
check('دفتر: يوم معلّق بالطابور محمي حتى من طابع سحابي أحدث', getDayEntries('2026-07-20')[0]?.id === 'pend')
// recovery_logs
localStorage.removeItem('qimmah:syncQueue:v1:A')
const localRec = loadRecoveryEngineLog('A')[0]
cloudRows = { recovery_logs: [{ date: today, data: { ...localRec, suggestion: 'rest', updatedAt: PAST }, updated_at: PAST }] }
await hydrateFromCloud()
check('تعافي: صف سحابي أقدم يخسر', loadRecoveryEngineLog('A')[0]?.suggestion === localRec?.suggestion)
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { recovery_logs: [{ date: today, data: { ...localRec, suggestion: 'rest', updatedAt: FUTURE }, updated_at: FUTURE }] }
await hydrateFromCloud()
check('تعافي: صف سحابي أحدث يفوز', loadRecoveryEngineLog('A')[0]?.suggestion === 'rest')
// workout_schedule
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { workout_schedule: [{ data: { ...validSchedule, daysPerWeek: 2, weekdays: [0, 'rest', 1, 'rest', 'rest', 'rest', 'rest'], updatedAt: PAST }, updated_at: PAST }] }
await hydrateFromCloud()
check('جدول: سحابي أقدم يخسر', loadWeeklySchedule()?.daysPerWeek === 3)
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { workout_schedule: [{ data: { ...validSchedule, daysPerWeek: 2, weekdays: [0, 'rest', 1, 'rest', 'rest', 'rest', 'rest'], updatedAt: FUTURE }, updated_at: FUTURE }] }
await hydrateFromCloud()
check('جدول: سحابي أحدث يفوز (بطابعه — لا إعادة ختم)', loadWeeklySchedule()?.daysPerWeek === 2 && loadWeeklySchedule()?.updatedAt === FUTURE)
// plan_templates
const localTpl = listTemplates('A')[0]
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { plan_templates: [{ local_id: localTpl.id, data: { ...localTpl, nameAr: 'سحابي قديم', updatedAt: PAST } as unknown as PlanTemplate, updated_at: PAST }] }
await hydrateFromCloud()
check('قوالب: سحابي أقدم يخسر', listTemplates('A')[0]?.nameAr === 'قالبي')
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { plan_templates: [{ local_id: localTpl.id, data: { ...localTpl, nameAr: 'سحابي أحدث', updatedAt: FUTURE } as unknown as PlanTemplate, updated_at: FUTURE }] }
await hydrateFromCloud()
check('قوالب: سحابي أحدث يفوز', listTemplates('A')[0]?.nameAr === 'سحابي أحدث')
// إعدادات الحساب (profiles.data.settings)
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { profiles: [{ data: { settings: { identity: { userName: 'قديم' }, updatedAt: PAST } }, updated_at: PAST }] }
await hydrateFromCloud()
check('إعدادات: شريحة سحابية أقدم تخسر', loadCustomization().identity.userName === 'زياد ع')
localStorage.removeItem('qimmah:syncQueue:v1:A')
const brandBefore = loadCustomization().identity.brandName
cloudRows = { profiles: [{ data: { settings: { identity: { userName: 'سحابي', mainGoal: 'bulk', userType: 'individual' }, updatedAt: FUTURE } }, updated_at: FUTURE }] }
await hydrateFromCloud()
const cAfter = loadCustomization()
check('إعدادات: شريحة سحابية أحدث تفوز بطابعها', cAfter.identity.userName === 'سحابي' && cAfter.settingsUpdatedAt === FUTURE)
check('حقول الجهاز (هوية العلامة) لا تمسّها مزامنة الحساب', cAfter.identity.brandName === brandBefore)

console.log('\n⑤ شواهد القبر: round-trip + سباق حذف-مقابل-تعديل')
cloudRows = {}
calls.length = 0
deleteTemplate('A', localTpl.id)
check('حذف قالب يستبدل upsert بعملية حذف واحدة (dedup عبر الأفعال)', queueOf('A', 'plan_templates').length === 1 && queueOf('A', 'plan_templates')[0].action === 'delete')
await flushSyncQueue(2_000)
const tplTomb = tbl('plan_templates')[0]?.rows[0] as { local_id?: string; deleted_at?: string; data?: unknown } | undefined
check('حذف القالب يصل upsert شاهد قبر بحمولة ممسوحة (خصوصية)', tplTomb?.local_id === localTpl.id && typeof tplTomb?.deleted_at === 'string' && JSON.stringify(tplTomb?.data) === '{}')
calls.length = 0
stampDataOwner('A')
recordLedgerDay({ date: '2026-07-19', foods: [{ id: 'gone', nameAr: 'يُمسح', calories: 50, protein: 1, meal: 'snack' }] })
recordLedgerDay({ date: '2026-07-19', foods: [] })
await flushSyncQueue(3_000)
const ledTomb = tbl('nutrition_ledger')[0]?.rows[0] as { date?: string; deleted_at?: string; data?: unknown } | undefined
check('مسح يوم دفتر يصل شاهد قبر بطابع وحمولة ممسوحة', ledTomb?.date === '2026-07-19' && typeof ledTomb?.deleted_at === 'string' && JSON.stringify(ledTomb?.data) === '{}')
// round-trip: شاهد قبر سحابي أحدث يفوز على الجهاز الآخر
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { plan_templates: [{ local_id: 'tpl-1', deleted_at: FUTURE, updated_at: FUTURE, data: {} }] }
saveTemplate('A', { ar: 'قالبي' }, plan) // «الجهاز الآخر» ما زال يحمل القالب
localStorage.removeItem('qimmah:syncQueue:v1:A')
await hydrateFromCloud()
check('قبر أحدث يفوز: القالب المحذوف لا يُبعث على جهاز آخر', listTemplates('A').length === 0)
// سباق حذف-مقابل-تعديل: التعديل المحلي أحدث من القبر ⇒ يبقى (وسيُعاد رفعه)
saveTemplate('A', { ar: 'محرَّر أحدث' }, plan)
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { plan_templates: [{ local_id: 'tpl-1', deleted_at: PAST, updated_at: PAST, data: {} }] }
await hydrateFromCloud()
check('سباق حذف/تعديل: التعديل الأحدث يهزم قبرًا أقدم', listTemplates('A')[0]?.nameAr === 'محرَّر أحدث')
// نفس السباق على الدفتر والقياسات
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { nutrition_ledger: [{ date: '2026-07-20', deleted_at: FUTURE, updated_at: FUTURE, data: {} }] }
await hydrateFromCloud()
check('دفتر: قبر أحدث يمحو اليوم على الجهاز الآخر', getDayEntries('2026-07-20').length === 0)
saveMeasurementLog({ id: 'm-edit', date: today, values: { weight: 82 } })
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { measurement_logs: [{ local_id: 'm-edit', deleted_at: PAST, updated_at: PAST }] }
await hydrateFromCloud()
check('قياسات: قبر أقدم لا يحذف تعديلًا أحدث (لا حذف صامت)', exportHistory().measurementLogs.some((m) => m.id === 'm-edit'))
localStorage.removeItem('qimmah:syncQueue:v1:A')
cloudRows = { measurement_logs: [{ local_id: 'm-edit', deleted_at: FUTURE, updated_at: FUTURE }] }
await hydrateFromCloud()
check('قياسات: قبر أحدث يفوز round-trip', !exportHistory().measurementLogs.some((m) => m.id === 'm-edit'))

console.log('\n⑥ استبعاد المستورد الصحي من الرفع (خصوصية HealthKit)')
cloudRows = {}
localStorage.removeItem('qimmah:syncQueue:v1:A')
saveMeasurementLog({ id: 'm-health', date: today, values: { weight: 80 }, source: 'health' })
check('قياس مستورد من الصحة لا يدخل طابور الرفع أبدًا', queueOf('A', 'measurement_logs').length === 0)
saveMeasurementLog({ id: 'm-manual', date: today, values: { weight: 81 }, source: 'manual' })
check('القياس اليدوي يُزامَن طبيعيًا', queueOf('A', 'measurement_logs').length === 1)
setMeasurementLogs([])
check('حذف المستورد الصحي لا يرفع قبرًا (لم يُرفع أصلًا)', queueOf('A', 'measurement_logs').every((op) => op.entityKey !== 'm-health'))

console.log('\n⑦ عقد getSyncUiState — لا «متزامن» قبل نجاح فعلي')
localStorage.clear()
grantConsent()
setSyncFeatureEnabledForTests(false)
check('المزامنة مطفأة ⇒ local/sync-disabled', getSyncUiState().state === 'local' && getSyncUiState().reason === 'sync-disabled')
setSyncFeatureEnabledForTests(true)
grantConsent()
setSyncRuntime(null, false)
check('بلا جلسة ⇒ local/signed-out', getSyncUiState().state === 'local' && getSyncUiState().reason === 'signed-out')
setSyncRuntime('D', false)
owner = 'D'
stampDataOwner('D')
check('لم تحدث مزامنة بعد ⇒ local/never-synced (لا ادّعاء نجاح)', getSyncUiState().state === 'local' && getSyncUiState().reason === 'never-synced' && getSyncUiState().lastSyncedAt === null)
saveTemplate('D', { ar: 'قالب د' }, plan)
check('عمليات منتظرة ⇒ syncing مع pendingCount', getSyncUiState().state === 'syncing' && getSyncUiState().pendingCount === 1)
failUpsert = true
await flushSyncQueue(1_000_000)
check('فشل واحد لا يدّعي شيئًا: ما زالت syncing وlastSyncedAt=null', getSyncUiState().state === 'syncing' && getSyncUiState().lastSyncedAt === null)
await flushSyncQueue(2_000_000)
await flushSyncQueue(3_000_000)
check('فشل متكرر (≥3) ⇒ attention/repeated-failures', getSyncUiState().state === 'attention' && getSyncUiState().reason === 'repeated-failures')

console.log('\n⑧ سقف backoff: تجميد بعد MAX + إجراء يدوي يعيد الحياة')
let q = readSyncQueue('D')[0]
check('backoff أُسّي: التأخير يتضاعف بين المحاولات', q.attempts === 3 && q.nextAttemptAt === 3_000_000 + 4_000)
for (let t = 4; q.attempts < MAX_SYNC_ATTEMPTS; t += 1) {
  await flushSyncQueue(t * 1_000_000)
  q = readSyncQueue('D')[0]
}
check(`بعد ${MAX_SYNC_ATTEMPTS} محاولات: العملية مجمّدة لا تُحاول تلقائيًا`, q.nextAttemptAt === RETRY_EXHAUSTED_AT && hasExhaustedSyncOperations('D'))
const frozenCalls = calls.length
await flushSyncQueue(99 * 1_000_000)
check('العملية المجمّدة لا تلمس الشبكة (لا فقدان — تبقى بالطابور)', calls.length === frozenCalls && readSyncQueue('D').length === 1)
check('الاستنفاد ⇒ attention/retry-exhausted', getSyncUiState().state === 'attention' && getSyncUiState().reason === 'retry-exhausted')
failUpsert = false
check('عقد «إعادة المحاولة» اليدوي يصفّر المجمّد', retryExhaustedSyncOperations('D') === 1)
await flushSyncQueue(100 * 1_000_000)
const ui = getSyncUiState()
check('بعد أول نجاح فعلي فقط: synced + lastSyncedAt + طابور فارغ', ui.state === 'synced' && ui.pendingCount === 0 && typeof ui.lastSyncedAt === 'string')

console.log('\n⑨ attention عند تبنٍّ معلّق + مسار profiles الواحد (إصلاح سباق الكتّاب)')
localStorage.clear()
grantConsent()
localStorage.setItem('qimmah:steps:v1', JSON.stringify({ '2026-07-13': 900 })) // بيانات غير منسوبة
markAdoptionPendingIfUnowned('E')
setSyncRuntime('E', false)
check('تبنٍّ معلّق ⇒ attention/adoption-pending (لا رفع صامت)', getSyncUiState().state === 'attention' && getSyncUiState().reason === 'adoption-pending')
localStorage.clear()
grantConsent()
setSyncRuntime('A', false)
owner = 'A'
stampDataOwner('A')
const ob = defaultOnboardingProfile()
saveOnboardingProfile(ob)
check('حفظ onboarding محلي يمرّ بالطابور القانوني (عملية profile واحدة)', readSyncQueue('A').filter((op) => op.table === 'profiles' && op.entityKey === 'profile').length === 1)
calls.length = 0
// الكاتب الثاني (بوابة الإكمال) يمرّ من نفس المسار: استبدال بنفس المفتاح ثم flush.
await persistOnboardingToProfile('A', loadOnboardingProfile() ?? ob)
check('كل كتّاب onboarding يمرّون بمسار واحد ⇒ الطابور يُستبدل لا يتكاثر', readSyncQueue('A').filter((op) => op.table === 'profiles' && op.entityKey === 'profile').length === 0)
const upl = tbl('profiles').flatMap((c) => c.rows).find((r) => (r.data as { onboarding?: unknown })?.onboarding) as { data?: { onboarding?: { _meta?: { updatedAt?: string } } } } | undefined
check('الشكل المرفوع كامل وبطابع LWW (لا essentials مختزلة)', typeof upl?.data?.onboarding?._meta?.updatedAt === 'string')
cloudRows = { profiles: [{ data: { onboarding: { ...ob, _meta: { ...ob._meta, updatedAt: FUTURE } } }, updated_at: FUTURE }] }
localStorage.removeItem('qimmah:syncQueue:v1:A')
await hydrateFromCloud()
check('ترطيب onboarding سحابي أحدث يُكتب بلا إعادة ختم (لا تزوير أحدثية)', loadOnboardingProfile()?._meta.updatedAt === FUTURE)
cloudRows = { profiles: [{ data: { onboarding: { ...ob, _meta: { ...ob._meta, updatedAt: PAST } } }, updated_at: PAST }] }
localStorage.removeItem('qimmah:syncQueue:v1:A')
await hydrateFromCloud()
check('onboarding سحابي أقدم لا يدهس المحلي (LWW لا «الكامل يفوز»)', loadOnboardingProfile()?._meta.updatedAt === FUTURE)

console.log('\n⑩ دليل طابع الدفتر (ledgerDayStamp) — أقصى دليل بين القيود')
check('طابع اليوم = أقصى (addedAt|updatedAt)', ledgerDayStamp([
  { id: 'x', nameAr: 'أ', meal: 'lunch', quantity: {}, macros: { calories: 1, protein: 0 }, addedAt: PAST, updatedAt: FUTURE },
  { id: 'y', nameAr: 'ب', meal: 'lunch', quantity: {}, macros: { calories: 1, protein: 0 }, addedAt: '2025-06-01T00:00:00.000Z' },
]) === FUTURE)

setSyncTransportForTests(undefined)
setSyncFeatureEnabledForTests(undefined)
console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) console.log(`✅ كل فحوص تغطية المزامنة نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
