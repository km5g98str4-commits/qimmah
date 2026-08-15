// عقد الخادم للاستحقاق — الترجمة الوحيدة بين دوال قاعدة البيانات والعميل.
// [OVERNIGHT-3] الحزمة ٣ · «سلطة واحدة لكل حقيقة».
//
// ═══ لماذا وُجد هذا الملف ═══
// كان `resolveEntitlement()` يعيد `none` **دائمًا** في الإنتاج، لأن عقد الخادم
// لم يكن موجودًا. والنتيجة أن البناء المنشور لا يستطيع منح Premium لأحد: من
// يدفع فعلًا في سلة لا يملك أي وسيلة لفتح التطبيق. الخلفية وصلت الآن
// (`supabase/migrations/20260806*`, `20260809*`, `20260812*`)، فهذا هو الجسر.
//
// ═══ ثلاثة مبادئ لا تُخرَق ═══
// ١) **الخادم هو السلطة.** لا عنوان، ولا `localStorage`، ولا عودة من صفحة
//    الدفع، ولا ردّ محلّي — تفتح فعلًا مدفوعًا. المدخل الوحيد `my_entitlement()`.
// ٢) **الفشل يُغلق لا يفتح.** أي خطأ — شبكة، دالّة غير مطبَّقة بعد، جلسة
//    منتهية — يعيد `none` مع سبب صادق. لا تفاؤل، ولا تخزين مؤقّت لنتيجة سابقة.
// ٣) **الوقت من الخادم لا من الجهاز.** التجربة ٧٢ ساعة يحسمها `expires_at`
//    مقابل `server_time` **كلاهما من قاعدة البيانات**. ونقيس ما مضى محلّيًا
//    بـ`performance.now()` — عدّاد لا يتأثّر بتغيير ساعة النظام — فإرجاع ساعة
//    الجهاز إلى الوراء لا يمدّ تجربةً انتهت.

import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { EntitlementStatus } from './paidActions'

/** حالات الخادم كما تعيدها `private.derive_state` — نسخة حرفية من الـSQL. */
export type ServerEntitlementState =
  | 'premiumActive'
  | 'specialAccessActive'
  | 'trialActive'
  | 'trialExpired'
  | 'revoked'
  | 'noAccess'

export const SERVER_ENTITLEMENT_STATES: readonly ServerEntitlementState[] = [
  'premiumActive',
  'specialAccessActive',
  'trialActive',
  'trialExpired',
  'revoked',
  'noAccess',
] as const

/**
 * **الجدول الحاكم.** أي حالة غير مذكورة هنا تُقرأ `none` — الافتراض منع.
 * ولاحظ `trialExpired` و`revoked`: كلتاهما `none` صراحةً، ولا تُحذف البيانات.
 */
const ACTIVE_STATES: ReadonlySet<ServerEntitlementState> = new Set([
  'premiumActive',
  'specialAccessActive',
  'trialActive',
])

export function statusForServerState(state: string): EntitlementStatus {
  return ACTIVE_STATES.has(state as ServerEntitlementState) ? 'active' : 'none'
}

/** تفصيل الاستحقاق كما يعرضه الخادم — للعرض الصادق لا لاتّخاذ القرار. */
export interface EntitlementDetail {
  serverState: ServerEntitlementState
  entitlementType: 'premium' | 'special' | 'trial' | 'none'
  /** `true` لـPremium — «شراء واحد، بلا اشتراك شهري». لا تُشتقّ منه صياغة تسويقية هنا. */
  noExpiry: boolean
  /** ميلي ثانية من الخادم؛ `null` لِما لا ينتهي. */
  expiresAtMs: number | null
  activatedAtMs: number | null
  /** لحظة الخادم وقت الردّ — أساس كل حساب زمني. */
  serverTimeMs: number
  /** قراءة `performance.now()` وقت الاستلام — لقياس ما مضى بلا ساعة الجهاز. */
  receivedAtPerfMs: number
}

export interface BackendEntitlement {
  status: EntitlementStatus
  detail: EntitlementDetail | null
  /** سبب عام — لا يكشف وجود كود ولا تفاصيل داخلية. */
  error?: string
}

const DENIED: BackendEntitlement = { status: 'none', detail: null }

function perfNow(): number {
  try {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : 0
  } catch {
    return 0
  }
}

function ms(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * الوقت المتبقّي بالميلي ثانية — **من الخادم**، مصحّحًا بما مضى محلّيًا.
 *
 * `performance.now()` عدّاد تصاعدي منذ فتح الصفحة، لا يتأثّر بتغيير ساعة النظام
 * ولا بالمناطق الزمنية. فمن يُرجع ساعة جهازه يومًا إلى الوراء لا يكسب ثانية.
 * ويُقصّ الناتج عند الصفر: لا رقم سالب يُعرض «متبقٍّ».
 */
export function remainingMs(detail: EntitlementDetail, nowPerfMs: number = perfNow()): number | null {
  if (detail.expiresAtMs === null) return null
  const elapsed = Math.max(0, nowPerfMs - detail.receivedAtPerfMs)
  return Math.max(0, detail.expiresAtMs - detail.serverTimeMs - elapsed)
}

/** هل مصدر الخادم متاح أصلًا؟ (ضبط Supabase موجود) */
export function backendAvailable(): boolean {
  return isSupabaseConfigured()
}

/**
 * القراءة المعتمدة. تُستدعى عند الإقلاع وعند كل تغيّر جلسة وبعد كل استبدال.
 * لا تُخزَّن نتيجتها بين الجلسات — الاستحقاق يُسأل عنه، ولا يُتذكَّر.
 */
export async function fetchEntitlement(): Promise<BackendEntitlement> {
  if (!isSupabaseConfigured()) return { ...DENIED, error: 'backend_unconfigured' }
  const supabase = await getSupabase()
  if (!supabase) return { ...DENIED, error: 'backend_unavailable' }

  // بلا جلسة لا استحقاق. الدالّة نفسها ترفض `auth.uid() is null`، ونوفّر رحلة.
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return { ...DENIED, error: 'not_authenticated' }

  const receivedAtPerfMs = perfNow()
  const { data, error } = await supabase.rpc('my_entitlement')
  if (error) return { ...DENIED, error: 'backend_error' }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return { ...DENIED, error: 'backend_empty' }

  const r = row as Record<string, unknown>
  const serverState = String(r.state ?? 'noAccess') as ServerEntitlementState
  // حالة لا نعرفها ⇒ منع. لا نفترض أن الجديد آمن.
  if (!SERVER_ENTITLEMENT_STATES.includes(serverState)) return { ...DENIED, error: 'backend_unknown_state' }

  const serverTimeMs = ms(r.server_time)
  if (serverTimeMs === null) return { ...DENIED, error: 'backend_no_clock' }

  const rawType = String(r.entitlement_type ?? 'none')
  const entitlementType = (['premium', 'special', 'trial'] as const).includes(rawType as never)
    ? (rawType as 'premium' | 'special' | 'trial')
    : 'none'

  return {
    status: statusForServerState(serverState),
    detail: {
      serverState,
      entitlementType,
      noExpiry: r.no_expiry === true,
      expiresAtMs: ms(r.expires_at),
      activatedAtMs: ms(r.activated_at),
      serverTimeMs,
      receivedAtPerfMs,
    },
  }
}

/** نتائج استبدال الكود — تُعرض للمستخدم عبر القاموس، ولا تُشتقّ منها صلاحية. */
export type RedeemServerOutcome =
  | 'success'
  | 'invalid'
  | 'already_used'
  | 'revoked'
  | 'not_authenticated'
  | 'offline'

/**
 * ترجمة أخطاء Postgres إلى نتائج معروضة.
 * `invalid_code` **واحدة عامّة** لكل كود غير مقبول — فلا يصير الحقل أوراكل
 * يُستدلّ به على وجود كود من عدمه.
 */
function redeemOutcomeFor(message: string, code: string): RedeemServerOutcome {
  const text = `${message} ${code}`.toLowerCase()
  if (text.includes('code_already_redeemed') || code === '23505') return 'already_used'
  if (text.includes('access_revoked')) return 'revoked'
  if (text.includes('not authenticated') || text.includes('28000')) return 'not_authenticated'
  if (text.includes('invalid_code') || code === '22023') return 'invalid'
  return 'offline'
}

export async function redeemCodeOnServer(code: string): Promise<RedeemServerOutcome> {
  if (!isSupabaseConfigured()) return 'offline'
  const supabase = await getSupabase()
  if (!supabase) return 'offline'
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return 'not_authenticated'

  const { data, error } = await supabase.rpc('redeem_access_code', { p_code: code })
  if (error) return redeemOutcomeFor(error.message ?? '', String((error as { code?: string }).code ?? ''))
  // النجاح لا يُعلَن من هنا: المستدعي يُعيد القراءة من `fetchEntitlement`.
  return typeof data === 'string' && statusForServerState(data) === 'active' ? 'success' : 'invalid'
}

/** نتائج بدء التجربة — كلٌّ منها رسالة صادقة للمستخدم. */
export type TrialOutcome =
  | 'started'
  | 'already_claimed'
  | 'email_not_verified'
  | 'not_authenticated'
  | 'revoked'
  | 'offline'

export async function startTrialOnServer(): Promise<TrialOutcome> {
  if (!isSupabaseConfigured()) return 'offline'
  const supabase = await getSupabase()
  if (!supabase) return 'offline'
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return 'not_authenticated'

  const { data, error } = await supabase.rpc('start_trial')
  if (error) {
    const text = `${error.message ?? ''}`.toLowerCase()
    if (text.includes('email_not_verified')) return 'email_not_verified'
    if (text.includes('access_revoked')) return 'revoked'
    if (text.includes('trial_already') || text.includes('already')) return 'already_claimed'
    if (text.includes('not authenticated')) return 'not_authenticated'
    return 'offline'
  }
  return typeof data === 'string' && statusForServerState(data) === 'active' ? 'started' : 'already_claimed'
}

/**
 * مِنَح تنتظر الحساب — الشراء يسبق التسجيل أحيانًا. تُستدعى بعد تسجيل الدخول
 * مباشرةً، وفشلها لا يُظهر خطأً: لا شيء ينتظر في الحالة الغالبة.
 */
export async function claimPendingGrantsOnServer(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const supabase = await getSupabase()
  if (!supabase) return false
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return false
  const { data, error } = await supabase.rpc('claim_pending_grants')
  if (error) return false
  return typeof data === 'string' && statusForServerState(data) === 'active'
}
