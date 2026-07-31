// الجزء السلوكي من إثبات بوابة موافقة المزامنة (حارة G · ج-١).
//
// يُبنى بعلم `VITE_SYNC_ENABLED: 'true'` **داخل صندوق الإثبات وحده** — لا يمسّ
// تهيئة الشحن. الغرض أن نبرهن أن البوابة تحجب **حتى والعلم مفعّل**؛ برهانٌ
// بالعلم مطفأ لا يثبت شيئًا عن البوابة، لأن الإطفاء وحده يحجب كل شيء.
import { strict as assert } from 'node:assert'
import {
  enqueueSyncOperation,
  enqueueSyncDelete,
  readSyncQueue,
  setSyncRuntime,
  syncAllowedFor,
  isSyncEnabled,
} from '@/lib/syncQueue'
import {
  setCloudSyncConsent,
  setSensitiveHealthConsent,
  hasCloudSyncConsent,
  hasSensitiveHealthConsent,
  readSyncConsent,
  SYNC_CONSENT_POLICY_VERSION,
} from '@/lib/syncConsent'
import { sanitizeOnboardingForSync } from '@/lib/syncFieldPolicy'

let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}

const USER = 'user-alpha'
const OTHER = 'user-beta'

/** ملف إعداد يحمل كل صنف حسّاس، لاختبار المسح العميق. */
const profileWithSensitive = {
  profile: { name: 'زياد', sex: 'male', age: 28 },
  bodyMetrics: { heightCm: 178, currentWeightKg: 82 },
  goal: { type: 'cut' },
  trainingPreferences: { experience: 'intermediate', daysPerWeek: 4 },
  activityProfile: { neat: 'moderate' },
  nutritionPreferences: { style: 'macros_only' },
  foodPreferences: { dietPattern: 'none', dislikedFoods: ['كبدة'], allergies: ['فول سوداني'] },
  limitations: { injuries: ['الركبة اليمنى'], notes: 'ألم أسفل الظهر بعد السكوات' },
  wellnessTracking: { mode: 'detailed', supplements: ['كرياتين'], medications: ['ميتفورمين'] },
  appPreferences: { language: 'ar', reminders: true },
  consents: { healthData: { accepted: true, policyVersion: '2026-07-13' } },
  _meta: { schemaVersion: 2, completed: true, source: 'onboarding', updatedAt: '2026-07-30T00:00:00.000Z' },
}

/** كل قيمة حسّاسة يجب ألّا تظهر في أي حمولة بلا الموافقة الثانية. */
const SENSITIVE_VALUES = ['الركبة اليمنى', 'ألم أسفل الظهر', 'كرياتين', 'ميتفورمين', 'فول سوداني']

/** مسح عميق: هل تظهر أي قيمة حسّاسة في أي عمق من الكائن؟ */
function deepFindSensitive(value: unknown): string[] {
  const found: string[] = []
  const serialized = JSON.stringify(value ?? null)
  for (const needle of SENSITIVE_VALUES) if (serialized.includes(needle)) found.push(needle)
  return found
}

console.log('════════ إثبات بوابة موافقة المزامنة — قِمّة ════════')

// ── 0) الافتراض الذي يقوم عليه الإثبات كله ──
check('العلم مفعّل داخل صندوق الإثبات (وإلا لم يثبت الحجبُ شيئًا)', isSyncEnabled() === true)

// ── 1) بلا موافقة أولى: لا يُدرَج بايت واحد ──
setSyncRuntime(USER, false)
check('بلا موافقة: hasCloudSyncConsent = false', hasCloudSyncConsent(USER) === false)
check('بلا موافقة: syncAllowedFor = false رغم أن العلم مفعّل', syncAllowedFor(USER) === false)

const blockedUpsert = enqueueSyncOperation('workout_sessions', 'w1', { volume: 1200 })
check('بلا موافقة: enqueueSyncOperation يُرجع null', blockedUpsert === null)

const blockedDelete = enqueueSyncDelete('measurement_logs', 'm1')
check('بلا موافقة: enqueueSyncDelete يُرجع null', blockedDelete === null)
check('بلا موافقة: الطابور فارغ تمامًا', readSyncQueue(USER).length === 0)

// ── 2) بالموافقة الأولى وحدها: يُدرَج، والحسّاس لا يعبر ──
check('حفظ الموافقة الأولى نجح (WriteResult = ok)', setCloudSyncConsent(USER, true) === 'ok')
check('بعد الموافقة: syncAllowedFor = true', syncAllowedFor(USER) === true)
check('الموافقة الثانية لا تُستنتج من الأولى', hasSensitiveHealthConsent(USER) === false)

const op = enqueueSyncOperation('profiles', 'profile', {
  data: { onboarding: profileWithSensitive },
  updated_at: '2026-07-30T00:00:00.000Z',
})
check('بالموافقة الأولى: العملية أُدرجت', op !== null)

const leaked = deepFindSensitive(op?.payload)
check(
  `الحمولة المدرَجة خالية من كل حقل حسّاس حتى المتداخل (تسرّب: ${leaked.join('، ') || 'لا شيء'})`,
  leaked.length === 0,
)

// وحقول غير حسّاسة حاضرة — لئلا يمرّ الفحص بحمولة فارغة.
const onboardingSent = (op?.payload as Record<string, unknown>)?.data as Record<string, unknown>
const sent = onboardingSent?.onboarding as Record<string, unknown>
check('الحقول غير الحسّاسة حاضرة (goal.type)', (sent?.goal as Record<string, unknown>)?.type === 'cut')
check('الحقول غير الحسّاسة حاضرة (bodyMetrics.heightCm)', (sent?.bodyMetrics as Record<string, unknown>)?.heightCm === 178)
check('طابع LWW حاضر (_meta.updatedAt)', Boolean((sent?._meta as Record<string, unknown>)?.updatedAt))

// التأكيد المضادّ (§4.2): الفرع المسموح جزئيًا لا يمرّر شقيقه الحسّاس.
const wellnessSent = sent?.wellnessTracking as Record<string, unknown>
check('wellnessTracking.mode مرّ', wellnessSent?.mode === 'detailed')
check('wellnessTracking.medications لم يمرّ رغم مرور شقيقه mode', wellnessSent?.medications === undefined)
check('wellnessTracking.supplements لم يمرّ رغم مرور شقيقه mode', wellnessSent?.supplements === undefined)
const foodSent = sent?.foodPreferences as Record<string, unknown>
check('foodPreferences.dislikedFoods مرّ', Array.isArray(foodSent?.dislikedFoods))
check('foodPreferences.allergies لم يمرّ رغم مرور شقيقه dislikedFoods', foodSent?.allergies === undefined)
check('فرع limitations كامل لم يظهر إطلاقًا', sent?.limitations === undefined)

// ── 3) بالموافقة الثانية: الحسّاس يحضر ──
check('حفظ الموافقة الثانية نجح', setSensitiveHealthConsent(USER, true) === 'ok')
check('الموافقتان ساريتان', hasSensitiveHealthConsent(USER) === true)

const op2 = enqueueSyncOperation('profiles', 'profile', {
  data: { onboarding: profileWithSensitive },
  updated_at: '2026-07-30T00:00:01.000Z',
})
const sent2 = ((op2?.payload as Record<string, unknown>)?.data as Record<string, unknown>)?.onboarding as Record<string, unknown>
const limitations2 = sent2?.limitations as Record<string, unknown>
check('بالموافقة الثانية: الإصابات حاضرة', Array.isArray(limitations2?.injuries) && (limitations2.injuries as string[])[0] === 'الركبة اليمنى')
check('بالموافقة الثانية: الملاحظات الصحية حاضرة', typeof limitations2?.notes === 'string')
check('بالموافقة الثانية: الأدوية حاضرة', Array.isArray((sent2?.wellnessTracking as Record<string, unknown>)?.medications))
check('بالموافقة الثانية: الحساسيات حاضرة', Array.isArray((sent2?.foodPreferences as Record<string, unknown>)?.allergies))

// ── 4) السحب والاتساق ──
check('سحب الأولى يسحب الثانية معها', setCloudSyncConsent(USER, false) === 'ok' && hasSensitiveHealthConsent(USER) === false)
check('بعد السحب: syncAllowedFor = false', syncAllowedFor(USER) === false)
// الثانية وحدها بلا الأولى ليست حالة ذات معنى — ولا تفتح بابًا.
setSensitiveHealthConsent(USER, true)
check('الموافقة الثانية وحدها لا تُفعِّل شيئًا بلا الأولى', hasSensitiveHealthConsent(USER) === false && syncAllowedFor(USER) === false)

// ── 5) الموافقة لكل حساب لا لكل جهاز ──
setCloudSyncConsent(USER, true)
setSyncRuntime(OTHER, false)
check('موافقة حساب ليست موافقة حساب آخر على نفس الجهاز', hasCloudSyncConsent(OTHER) === false && syncAllowedFor(OTHER) === false)
check('والحساب الأول ما زالت موافقته سارية', hasCloudSyncConsent(USER) === true)

// ── 6) نسخة السياسة: موافقة على نصّ قديم ليست موافقة على الجديد ──
check('الموافقة المخزَّنة تحمل نسخة السياسة الحالية', readSyncConsent(USER).cloudSync.policyVersion === SYNC_CONSENT_POLICY_VERSION)
globalThis.localStorage.setItem(
  `qimmah:syncConsent:v1:${USER}`,
  JSON.stringify({ cloudSync: { accepted: true, policyVersion: '1999-01-01' }, sensitiveHealth: { accepted: false } }),
)
check('موافقة بنسخة سياسة قديمة لا تُقبل', hasCloudSyncConsent(USER) === false)

// ── 7) مدخل تخزين معطوب لا يفتح البوابة (§5: المدخل غير موثوق) ──
for (const [label, raw] of [
  ['نصّ غير JSON', 'not-json'],
  ['مصفوفة', '[]'],
  ['accepted نصّية بدل منطقية', JSON.stringify({ cloudSync: { accepted: 'true', policyVersion: SYNC_CONSENT_POLICY_VERSION } })],
  ['null', 'null'],
] as const) {
  globalThis.localStorage.setItem(`qimmah:syncConsent:v1:${USER}`, raw)
  check(`تخزين معطوب (${label}) لا يمنح موافقة`, hasCloudSyncConsent(USER) === false)
}

// ── 8) محاكاة الالتفاف (§4.2) — تسقط بفحص مسمّى لا باستثناء تقني ──
// الالتفاف المُتخيَّل: حقل حسّاس جديد يُضاف للملف ولا يُدرج في أي قائمة.
// قائمة الحظر كانت ستمرّره؛ قائمة السماح تحجبه من غير أن يعرف أحد بوجوده.
const withUnknownField = {
  ...profileWithSensitive,
  medicalHistory: { diagnoses: ['سكري النوع الثاني'] },
  limitations: { injuries: ['الكتف'], notes: 'تشخيص جديد' },
}
const sanitizedUnknown = sanitizeOnboardingForSync(withUnknownField, false)
check(
  'حقل حسّاس جديد غير معلَن (medicalHistory) لا يُزامَن — آمن افتراضيًا',
  (sanitizedUnknown as Record<string, unknown>).medicalHistory === undefined,
)
check(
  'ومع الموافقة الثانية يبقى محجوبًا لأنه غير معلَن — السماح لا الحظر',
  (sanitizeOnboardingForSync(withUnknownField, true) as Record<string, unknown>).medicalHistory === undefined,
)
check(
  'ولا يتسرّب التشخيص الجديد في أي عمق',
  !JSON.stringify(sanitizedUnknown).includes('سكري النوع الثاني'),
)

console.log(`\n✅ إثبات بوابة موافقة المزامنة: ${pass} فحصًا، 0 فشل.`)
