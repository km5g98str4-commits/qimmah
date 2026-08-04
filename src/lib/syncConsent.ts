/**
 * بوابة الموافقة على المزامنة — موافقتان منفصلتان لا واحدة (حارة G · ج-١).
 *
 * القرار المقفل (الميثاق §8-5): «بيانات الصحة الحسّاسة تُزامَن خلف موافقة منفصلة
 * صريحة فقط». فالموافقة على **رفع بياناتك للسحابة** شيء، والموافقة على أن يشمل
 * الرفع **إصاباتك وأدويتك وحساسياتك** شيء آخر — ولا تُستنتج الثانية من الأولى.
 *
 * لماذا موافقة لكل حساب لا موافقة واحدة للجهاز: الجهاز قد يتناوب عليه حسابان
 * (انظر accountScope). موافقة أحدهما ليست موافقة الآخر، والمفتاح يحمل معرّف
 * الحساب فيُمسح مع بياناته عند تبديل الحساب أو حذفه.
 *
 * كل كتابة تمرّ عبر safeStorage ويُفحص WriteResult (الميثاق §5): فشل الحفظ لا
 * يُبتلع — الدالة تُرجع النتيجة والمستدعي يعرض رسالة صادقة ولا يدّعي نجاحًا.
 */
import { readJson, writeJson, type WriteResult } from './safeStorage'

/** بادئة مفاتيح الموافقة — مفتاح لكل حساب، خارج قائمة السماح العامّة فيُمسح مع الحساب. */
export const SYNC_CONSENT_PREFIX = 'qimmah:syncConsent:v1:'

/**
 * إصدار سياسة الموافقة. تغييره يُبطل الموافقات السابقة فتُطلب من جديد —
 * وهذا مقصود: موافقة أُعطيت على نصّ قديم ليست موافقة على نصّ جديد.
 */
export const SYNC_CONSENT_POLICY_VERSION = '2026-07-30'

/** سجلّ موافقة واحدة — القبول وطابعه ونسخة السياسة التي قُبلت. */
export interface ConsentRecord {
  accepted: boolean
  acceptedAt?: string
  policyVersion?: string
}

/** حالة الموافقتين لحساب واحد. */
export interface SyncConsentState {
  /** الموافقة الأولى: رفع أي بيانات إلى السحابة. */
  cloudSync: ConsentRecord
  /** الموافقة الثانية: أن يشمل الرفع البيانات الصحية الحسّاسة. */
  sensitiveHealth: ConsentRecord
}

const EMPTY: SyncConsentState = {
  cloudSync: { accepted: false },
  sensitiveHealth: { accepted: false },
}

function consentKey(userId: string): string {
  return `${SYNC_CONSENT_PREFIX}${userId}`
}

/** هل هذا السجلّ موافقة سارية على **نسخة السياسة الحالية**؟ */
function isLive(record: ConsentRecord | undefined): boolean {
  return Boolean(record?.accepted) && record?.policyVersion === SYNC_CONSENT_POLICY_VERSION
}

/**
 * قراءة متشدّدة: أي شكل غير متوقّع يعود إلى «لا موافقة».
 * مدخل التخزين غير موثوق كغيره (الميثاق §5) — ولا يُفترض حسن النيّة في بوابة.
 */
export function readSyncConsent(userId: string): SyncConsentState {
  if (!userId) return EMPTY
  const raw = readJson<unknown>(consentKey(userId), EMPTY)
  if (!raw || typeof raw !== 'object') return EMPTY
  const value = raw as Partial<SyncConsentState>
  const pick = (r: unknown): ConsentRecord => {
    if (!r || typeof r !== 'object') return { accepted: false }
    const rec = r as Partial<ConsentRecord>
    if (rec.accepted !== true) return { accepted: false }
    return {
      accepted: true,
      acceptedAt: typeof rec.acceptedAt === 'string' ? rec.acceptedAt : undefined,
      policyVersion: typeof rec.policyVersion === 'string' ? rec.policyVersion : undefined,
    }
  }
  return { cloudSync: pick(value.cloudSync), sensitiveHealth: pick(value.sensitiveHealth) }
}

/** الموافقة الأولى سارية؟ — بدونها لا يُدرَج بايت واحد في أي طابور. */
export function hasCloudSyncConsent(userId: string): boolean {
  if (!userId) return false
  return isLive(readSyncConsent(userId).cloudSync)
}

/**
 * الموافقة الثانية سارية؟ — وتشترط الأولى معها.
 *
 * الاشتراط مقصود ومنعُ حالةٍ غير متسقّة: «وافقتُ على رفع إصاباتي ولم أوافق على
 * الرفع أصلًا» ليست حالة ذات معنى. ولو سُمح بها لكان انفراد الثانية بابًا
 * لتسريب الأخطر وحده.
 */
export function hasSensitiveHealthConsent(userId: string): boolean {
  if (!userId) return false
  const state = readSyncConsent(userId)
  return isLive(state.cloudSync) && isLive(state.sensitiveHealth)
}

function persist(userId: string, state: SyncConsentState): WriteResult {
  return writeJson(consentKey(userId), state)
}

/**
 * منح/سحب الموافقة الأولى. سحبها يسحب الثانية معها حتمًا — لا يبقى إذن للأخطر
 * بعد سحب الأعمّ.
 *
 * **تُرجع WriteResult ولا تبتلعه** (§5): المستدعي يفحصها قبل أي شاشة نجاح.
 */
export function setCloudSyncConsent(userId: string, accepted: boolean, now = new Date()): WriteResult {
  if (!userId) return 'error'
  const current = readSyncConsent(userId)
  const stamp = now.toISOString()
  const next: SyncConsentState = accepted
    ? {
        cloudSync: { accepted: true, acceptedAt: stamp, policyVersion: SYNC_CONSENT_POLICY_VERSION },
        sensitiveHealth: current.sensitiveHealth,
      }
    : { cloudSync: { accepted: false }, sensitiveHealth: { accepted: false } }
  return persist(userId, next)
}

/**
 * منح/سحب الموافقة الثانية (البيانات الصحية الحسّاسة).
 * منحها لا يمنح الأولى ضمنًا — الاستنتاج الصامت هو ما تمنعه هذه البوابة.
 */
export function setSensitiveHealthConsent(userId: string, accepted: boolean, now = new Date()): WriteResult {
  if (!userId) return 'error'
  const current = readSyncConsent(userId)
  const next: SyncConsentState = {
    cloudSync: current.cloudSync,
    sensitiveHealth: accepted
      ? { accepted: true, acceptedAt: now.toISOString(), policyVersion: SYNC_CONSENT_POLICY_VERSION }
      : { accepted: false },
  }
  return persist(userId, next)
}

/** هل نعرض شاشة البوابة؟ — مسجَّل دخول وبلا موافقة أولى سارية. */
export function needsSyncConsentDecision(userId: string | null): boolean {
  return Boolean(userId) && !hasCloudSyncConsent(userId as string)
}
