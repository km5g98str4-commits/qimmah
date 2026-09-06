// الجزء السلوكي من إثبات «الموافقة الثانية تحرس الحمولة لا المربّع».
//
// شقيق `sync-consent-proof.ts` ويكمّله: ذاك برهن أن قائمة السماح تحرس حمولة
// `profiles.data.onboarding`. وهذا يبرهن أن الحراسة تشمل **ما يُرفع فعلًا** —
// `daily_logs` (سجلّا المكمّلات والأدوية) و`recovery_logs` (ألم/نبض/تغيّرية نبض)
// وشريحة `profiles.data.settings` (إصابات وملاحظات صحية وخطة أدوية بجرعاتها).
//
// يُبنى بعلم `VITE_SYNC_ENABLED: 'true'` **داخل صندوق الإثبات وحده** — تهيئة
// الشحن لا تُمسّ. برهانٌ بالعلم مطفأ لا يثبت شيئًا عن البوابة.
//
// والتأكيد على **الحمولة المدرَجة في الطابور** لا على مربّع في الواجهة: مصدر
// العطل الأصلي كان بالضبط أن المربّع محروس والحمولة ليست كذلك.
import { strict as assert } from 'node:assert'
import {
  enqueueSyncOperation,
  readSyncQueue,
  setSyncRuntime,
  isSyncEnabled,
  type SyncTable,
} from '@/lib/syncQueue'
import { setCloudSyncConsent, setSensitiveHealthConsent, hasSensitiveHealthConsent } from '@/lib/syncConsent'
import { auditSyncPayload, sanitizeSyncPayload, SYNC_TABLE_POLICIES } from '@/lib/syncFieldPolicy'
import { cloudOnboardingSnapshot } from '@/lib/onboardingSync'
import type { OnboardingProfile } from '@/types/onboarding'
import { stampDataOwner } from '@/lib/dataOwnership'
import { setEntitlement } from '@/lib/access/entitlementStore'
import { saveSupplementLog, saveMedicationLog, saveNutritionLog, saveWaterLog } from '@/lib/historyStore'
import { saveRecoveryEngineEntry } from '@/lib/recoveryEngine'
import { flushSyncQueue, setSyncTransportForTests, type SyncTransport } from '@/lib/syncService'
import { getDayStamp } from '@/lib/today'

let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}

const USER = 'user-sensitive'
const DAY = '2026-08-18'
const TODAY = getDayStamp()

/**
 * قيم يجب ألّا تظهر في أي حمولة بلا الموافقة الثانية — بأي عمق.
 *
 * وفيها **معرّفات المكمّل والدواء الإنجليزية** لا أسماؤهما العربية فقط: سجلّ
 * اليوم يخزّن `done: { metformin: true }` بالمعرّف، فقائمة عربية وحدها كانت
 * تجعل فحص التسرّب على `daily_logs` **مارًّا بلا مقابل** (§4.2: المرور غير
 * المستحقّ ليس نجاحًا — التُقط بمحاكاة إسقاط الحارس).
 */
const SENSITIVE_VALUES = ['ميتفورمين', 'كرياتين', 'metformin', 'creatine', 'الركبة اليمنى', 'ألم أسفل الظهر', 'د. سعود']

const serialized = (value: unknown) => JSON.stringify(value ?? null)
const leaks = (value: unknown) => SENSITIVE_VALUES.filter((needle) => serialized(value).includes(needle))

type Payload = Record<string, unknown>
const obj = (value: unknown): Payload => (value && typeof value === 'object' ? (value as Payload) : {})

const queued = (table: string, entityKey: string): Payload | null => {
  const op = readSyncQueue(USER).find((item) => item.table === table && item.entityKey === entityKey)
  return op ? (op.payload as Payload) : null
}

/** شريحة إعدادات الحساب كما يبنيها `accountSettingsSlice` — بحقولها الحسّاسة. */
const settingsSlice = () => ({
  identity: { userName: 'زياد', mainGoal: 'تنشيف', userType: 'individual' },
  profile: {
    name: 'زياد',
    age: 28,
    heightCm: 178,
    weightKg: 82,
    injuries: 'الركبة اليمنى',
    healthNotes: 'ألم أسفل الظهر بعد السكوات',
  },
  targets: { calories: 2100, protein: 165 },
  wellnessPlan: {
    enabled: true,
    supplements: [{ id: 's1', supplementId: 'creatine', customNameAr: 'كرياتين', amount: '5غ', order: 0 }],
    medications: [
      { id: 'm1', medicationId: 'metformin', customNameAr: 'ميتفورمين', dose: '500مغ', doctorNote: 'د. سعود', order: 0 },
    ],
  },
  updatedAt: '2026-08-18T00:00:00.000Z',
})

const recoveryInput = {
  sleepQuality: 'poor' as const,
  energy: 'low' as const,
  soreness: { legs: 'severe' as const },
  restingHeartRate: { current: 77, baseline: 59 },
  hrv: { current: 41, baseline: 63 },
}

/** يكتب اليوم كاملًا عبر مسارات المجال الحقيقية (لا ببناء حمولة يدويًا). */
function writeDailyThroughDomain(): void {
  saveNutritionLog(DAY, { doneMeals: { breakfast: true } })
  saveWaterLog(DAY, 1500)
  saveSupplementLog(DAY, { creatine: true })
  saveMedicationLog(DAY, { metformin: true })
}

/** ناقل وهميّ يلتقط ما كان **سيُرفع فعلًا** — حدّ التسريب الحقيقي. */
const uploaded: { table: string; rows: Payload[] }[] = []
const transport: SyncTransport = {
  async currentUserId() {
    return USER
  },
  async upsert(table, rows) {
    uploaded.push({ table, rows: rows as Payload[] })
  },
  async delete() {},
  async select() {
    return []
  },
}

console.log('════════ إثبات حراسة الحمولة بالموافقة الصحّية — قِمّة ════════')

// ── 0) الافتراض الذي يقوم عليه الإثبات ──
check('العلم مفعّل داخل صندوق الإثبات (وإلا لم يثبت الحجبُ شيئًا)', isSyncEnabled() === true)
check('كل جدول مزامنة يحمل سياسة مُعلَنة', Object.keys(SYNC_TABLE_POLICIES).length >= 13)

globalThis.localStorage.clear()
setEntitlement({ status: 'active', source: 'mock' })
stampDataOwner(USER)
setSyncRuntime(USER, false)
check('الموافقة الأولى مُنحت (رفع للسحابة)', setCloudSyncConsent(USER, true) === 'ok')
check('والثانية (الصحية الحسّاسة) مرفوضة', hasSensitiveHealthConsent(USER) === false)

// ══════════ الاتجاه الأول: الموافقة الثانية مرفوضة ⇒ الحسّاس لا يدخل الطابور ══════════
console.log('\n① الموافقة الثانية مرفوضة — التأكيد على الحمولة المدرَجة نفسها')

writeDailyThroughDomain()
const dailyDenied = queued('daily_logs', DAY)
check('daily_logs أُدرج فعلًا (وإلا لم يثبت الحجب شيئًا)', dailyDenied !== null)
const dailyDataDenied = obj(dailyDenied?.data)
check('daily_logs: data.medications غائب من الحمولة المدرَجة', dailyDataDenied.medications === undefined)
check('daily_logs: data.supplements غائب من الحمولة المدرَجة', dailyDataDenied.supplements === undefined)
check(
  `daily_logs: لا قيمة حسّاسة بأي عمق (تسرّب: ${leaks(dailyDenied).join('، ') || 'لا شيء'})`,
  leaks(dailyDenied).length === 0,
)
// ولا إفراط: غير الحسّاس مرّ كما هو.
check('daily_logs: data.nutrition مرّ (لا حجب زائد)', obj(dailyDataDenied.nutrition).doneMeals !== undefined)
check('daily_logs: data.water مرّ (لا حجب زائد)', obj(dailyDataDenied.water).waterMl === 1500)
check('daily_logs: طابع LWW مرّ', typeof dailyDenied?.updated_at === 'string')

saveRecoveryEngineEntry(USER, recoveryInput)
const recDenied = queued('recovery_logs', TODAY)
check('recovery_logs أُدرج فعلًا', recDenied !== null)
const recDataDenied = obj(recDenied?.data)
const recInputDenied = obj(recDataDenied.input)
check('recovery_logs: input.soreness غائب', recInputDenied.soreness === undefined)
check('recovery_logs: input.restingHeartRate غائب', recInputDenied.restingHeartRate === undefined)
check('recovery_logs: input.hrv غائب', recInputDenied.hrv === undefined)
check('recovery_logs: flags.decisiveSoreness غائب', obj(recDataDenied.flags).decisiveSoreness === undefined)
// أثر القرار يعيد نشر الحالة نصًّا — فحجب المدخل وحده حجبٌ شكليّ (§4.2).
const reasonsDenied = Array.isArray(recDataDenied.reasons) ? (recDataDenied.reasons as Payload[]) : []
check(
  'recovery_logs: أثر القرار خالٍ من العوامل الحسّاسة (soreness/resting_hr/hrv)',
  reasonsDenied.every((item) => !['soreness', 'resting_hr', 'hrv'].includes(String(item.factor))),
)
check('recovery_logs: العوامل غير الحسّاسة باقية في الأثر', reasonsDenied.length > 0)
check('recovery_logs: input.sleepQuality مرّ (لا حجب زائد)', recInputDenied.sleepQuality === 'poor')
check('recovery_logs: الاقتراح والدرجة مرّا', typeof recDataDenied.suggestion === 'string' && typeof recDataDenied.score === 'number')

const settingsOp = enqueueSyncOperation('profiles', 'settings', {
  data: { settings: settingsSlice() },
  updated_at: '2026-08-18T00:00:00.000Z',
})
const settingsDenied = obj(obj(settingsOp?.payload).data).settings as Payload | undefined
check('profiles/settings أُدرج فعلًا', settingsDenied !== undefined)
check('profiles/settings: profile.injuries غائب', obj(settingsDenied?.profile).injuries === undefined)
check('profiles/settings: profile.healthNotes غائب', obj(settingsDenied?.profile).healthNotes === undefined)
check('profiles/settings: wellnessPlan.medications غائب', obj(settingsDenied?.wellnessPlan).medications === undefined)
check('profiles/settings: wellnessPlan.supplements غائب', obj(settingsDenied?.wellnessPlan).supplements === undefined)
check(
  `profiles/settings: لا قيمة حسّاسة بأي عمق (تسرّب: ${leaks(settingsOp?.payload).join('، ') || 'لا شيء'})`,
  leaks(settingsOp?.payload).length === 0,
)
check('profiles/settings: الهوية والأهداف مرّت (لا حجب زائد)', obj(settingsDenied?.identity).userName === 'زياد')
check('profiles/settings: profile.age مرّ رغم حجب شقيقه injuries', obj(settingsDenied?.profile).age === 28)
check('profiles/settings: wellnessPlan.enabled مرّ رغم حجب شقيقيه', obj(settingsDenied?.wellnessPlan).enabled === true)

// التأكيد المضادّ (§4.2): الشبكة ليست حجبًا شاملًا — حمولة بلا حسّاس تمرّ **بعينها**.
const clean = { local_id: 'w1', data: { volume: 1200, notes: 'جلسة ممتازة' }, updated_at: '2026-08-18T00:00:00.000Z' }
check('حمولة بلا حقل حسّاس تمرّ بمرجعها نفسه (لا نسخ ولا حذف)', sanitizeSyncPayload('workout_sessions', clean, false) === clean)

// ══════════ الاتجاه الثاني: الموافقة الثانية ممنوحة ⇒ البيانات تصل ══════════
console.log('\n② الموافقة الثانية ممنوحة — لا حجب زائد')

check('حفظ الموافقة الثانية نجح', setSensitiveHealthConsent(USER, true) === 'ok')
check('الموافقتان ساريتان', hasSensitiveHealthConsent(USER) === true)

writeDailyThroughDomain()
const dailyGranted = obj(queued('daily_logs', DAY)?.data)
check('daily_logs: data.medications حاضر', obj(dailyGranted.medications).done !== undefined)
check('daily_logs: قيمة الدواء نفسها حاضرة', obj(obj(dailyGranted.medications).done).metformin === true)
check('daily_logs: data.supplements حاضر', obj(obj(dailyGranted.supplements).done).creatine === true)
check('daily_logs: وغير الحسّاس لم يتأثّر', obj(dailyGranted.water).waterMl === 1500)

saveRecoveryEngineEntry(USER, recoveryInput)
const recGranted = obj(queued('recovery_logs', TODAY)?.data)
const recInputGranted = obj(recGranted.input)
check('recovery_logs: input.soreness حاضر', obj(recInputGranted.soreness).legs === 'severe')
check('recovery_logs: input.restingHeartRate حاضر', obj(recInputGranted.restingHeartRate).current === 77)
check('recovery_logs: input.hrv حاضر', obj(recInputGranted.hrv).current === 41)
check(
  'recovery_logs: أثر العامل الحسّاس حاضر',
  (Array.isArray(recGranted.reasons) ? (recGranted.reasons as Payload[]) : []).some((item) =>
    ['soreness', 'resting_hr', 'hrv'].includes(String(item.factor)),
  ),
)

const settingsGrantedOp = enqueueSyncOperation('profiles', 'settings', {
  data: { settings: settingsSlice() },
  updated_at: '2026-08-18T00:00:01.000Z',
})
const settingsGranted = obj(obj(obj(settingsGrantedOp?.payload).data).settings)
check('profiles/settings: injuries حاضرة', obj(settingsGranted.profile).injuries === 'الركبة اليمنى')
check('profiles/settings: healthNotes حاضرة', typeof obj(settingsGranted.profile).healthNotes === 'string')
check(
  'profiles/settings: خطة الأدوية حاضرة بجرعتها وملاحظة الطبيب',
  serialized(settingsGranted).includes('ميتفورمين') && serialized(settingsGranted).includes('د. سعود'),
)

// ══════════ ③ محاكاة الالتفاف — تسقط بفحص مسمّى (§4.2) ══════════
console.log('\n③ محاكاة الالتفاف: جدول جديد بحقول حسّاسة وبلا سياسة')

setSensitiveHealthConsent(USER, false)
check('عدنا لحالة الرفض قبل المحاكاة', hasSensitiveHealthConsent(USER) === false)

// (أ) جدول غير مسجَّل إطلاقًا — وصل باسم نصّي (تحويل نوع/تخزين) لا عبر الاتحاد.
const rogueTable = 'health_journal' as SyncTable
const roguePayload = { date: DAY, data: { medications: ['ميتفورمين'], mood: 'ok' } }
const rogueAudit = auditSyncPayload(rogueTable, roguePayload, false)
check('الالتفاف يُسمّى: الجدول بلا سياسة (unregisteredTable)', rogueAudit.unregisteredTable === true)
check(
  `الالتفاف يُسمّى: مفتاح حسّاس غير مُعلَن «${rogueAudit.undeclaredSensitiveKeys.join('، ')}»`,
  rogueAudit.undeclaredSensitiveKeys.includes('data.medications'),
)
const rogueOp = enqueueSyncOperation(rogueTable, 'x', roguePayload)
check('وحمولته المدرَجة خالية من الحسّاس رغم غياب السياسة (سقوط مغلق)', obj(obj(rogueOp?.payload).data).medications === undefined)
check('وغير الحسّاس فيها باقٍ', obj(obj(rogueOp?.payload).data).mood === 'ok')

// (ب) إعلان كاذب: جدول أعلن «بلا محتوى حسّاس» ثم حمل حسّاسًا.
const liarAudit = auditSyncPayload('custom_plans', { source: 'custom', data: { plan: { days: [] }, medications: ['ميتفورمين'] } }, false)
check('الإعلان الكاذب لا يُصدَّق: الشبكة تسمّي المفتاح', liarAudit.undeclaredSensitiveKeys.includes('data.medications'))
check('ولا يعبر إلى الحمولة', leaks(liarAudit.payload).length === 0)

// (ج) دفن الحقل في العمق داخل مصفوفة — الشبكة تمشي الحمولة كلها.
const buried = auditSyncPayload('todos', { data: { items: [{ id: 1, meta: { notes: 'ok', supplements: ['كرياتين'] } }] } }, false)
check('الدفن العميق داخل مصفوفة لا يفلت', buried.undeclaredSensitiveKeys.includes('data.items[0].meta.supplements'))
check('ولا تتسرّب قيمته', leaks(buried.payload).length === 0)
check('والجار البريء في نفس الكائن باقٍ (لا حجب شامل)', serialized(buried.payload).includes('"notes":"ok"'))

// (د) وبالموافقة الثانية لا تعمل الشبكة أصلًا — الحجب من البوابة لا من الشبكة.
setSensitiveHealthConsent(USER, true)
const allowedAudit = auditSyncPayload(rogueTable, roguePayload, true)
check('بالموافقة الثانية: الجدول غير المسجَّل يمرّ بحمولته كاملة', allowedAudit.undeclaredSensitiveKeys.length === 0)
check('وبمرجعها نفسه', allowedAudit.payload === roguePayload)

// ══════ ④ سحب الموافقة بعد الإدراج — حدّ التسريب يُعيد الفحص ══════
console.log('\n④ الموافقة سُحبت بعد الإدراج — الطابور لا يرفع ما لم يعد مأذونًا به')

setSyncTransportForTests(transport)
globalThis.localStorage.clear()
stampDataOwner(USER)
setSyncRuntime(USER, false)
setCloudSyncConsent(USER, true)
setSensitiveHealthConsent(USER, true)
writeDailyThroughDomain()
check('أُدرج بالموافقة الثانية سارية (الحمولة تحمل الدواء)', obj(obj(queued('daily_logs', DAY)?.data).medications).done !== undefined)

// السحب بعد الإدراج وقبل الدفع — الحالة التي يحرسها حدّ التسريب لا حدّ الإدراج.
setSensitiveHealthConsent(USER, false)
uploaded.length = 0
await flushSyncQueue(Date.now())
const uploadedDaily = uploaded.find((call) => call.table === 'daily_logs')
check('الدفع جرى فعلًا (وإلا لم يثبت شيء)', uploadedDaily !== undefined)
check(
  `الصف المرفوع خالٍ من الحسّاس بعد السحب (تسرّب: ${leaks(uploadedDaily?.rows).join('، ') || 'لا شيء'})`,
  leaks(uploadedDaily?.rows).length === 0,
)
check('وغير الحسّاس رُفع كما هو', obj(obj(uploadedDaily?.rows?.[0]).data).water !== undefined)

// ══════ ⑤ [RELEASE-REVIEW-003] بوّابة الإكمال (مزامنة مطفأة) لا ترفع صحّة ══════
console.log('\n⑤ مسار بوّابة الإكمال بلا مزامنة — الشكل المرفوع منقًّى بنفس قائمة السماح')
const fullProfile = {
  _meta: { completed: true, updatedAt: '2026-09-06T00:00:00.000Z' },
  goal: { type: 'fat_loss' },
  bodyMetrics: { currentWeightKg: 80, heightCm: 175 },
  limitations: { injuries: ['knee'], notes: 'ألم في الركبة اليسرى' },
  wellnessTracking: { mode: 'both', medications: ['metformin'], supplements: ['creatine'] },
  foodPreferences: { dietPattern: 'balanced', allergies: ['peanut'] },
} as unknown as OnboardingProfile
const strict = cloudOnboardingSnapshot(fullProfile, false)
const strictText = JSON.stringify(strict)
check('بلا موافقة صحّية: لا إصابات ولا أدوية ولا حساسيات ولا ملاحظات في الشكل المرفوع',
  !/knee|metformin|creatine|peanut|الركبة/.test(strictText))
check('وبوّابة الإكمال سليمة: _meta.completed والهدف والوزن باقية',
  obj(strict._meta).completed === true && obj(strict.goal).type === 'fat_loss' && obj(strict.bodyMetrics).currentWeightKg === 80)
const permissive = cloudOnboardingSnapshot(fullProfile, true)
check('بالموافقة الثانية: الحقول الحسّاسة تُضاف — وهي الإضافة الوحيدة', /metformin/.test(JSON.stringify(permissive)))
// ⚔️ محاكاة الالتفاف: الشكل الخام (ما كان يُرفع قبل الإصلاح) يحمل الحسّاس — فالفحص أعلاه يميّز فعلًا.
check('⚔️ الشكل الخام كان يحمل الحسّاس (المحاكاة تميّز الإصلاح عن غيابه)', /metformin/.test(JSON.stringify(fullProfile)))

console.log(`\n✅ إثبات حراسة الحمولة بالموافقة الصحّية: ${pass} فحصًا، 0 فشل.`)
