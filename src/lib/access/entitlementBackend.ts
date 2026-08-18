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

/**
 * مهلة قصوى لأي نداء استحقاق.
 *
 * بلا مهلة، شبكةٌ صامتة (لا مرفوضة) تُبقي الوعد معلّقًا **إلى الأبد**، فتبقى
 * الحالة `loading` — وهي مغلقة فلا خطر أمني، لكن الشاشة لا تستقرّ ولا يعرف
 * المستخدم لماذا. والصمت أسوأ من الرفض: الرفض يُعرَض ويُعاد منه.
 *
 * ثمان ثوانٍ: أطول من أي رحلة سليمة، وأقصر من صبر إنسان ينظر إلى زرّ معطّل.
 */
const CALL_TIMEOUT_MS = 8000

/**
 * علامة المهلة — **قيمة مميّزة لا `null`**.
 *
 * [SOVEREIGN-COMMERCE-001] كانت المهلة تعيد `null`، و`null` هي أيضًا شكل «ردٌّ
 * فارغ» وشكل «لا جلسة». فانطوت ثلاث حقائق مختلفة في قيمة واحدة، وخرجت كلها من
 * الفتحة نفسها: «تأكّد من النت». الرمز يفصلها: من يقارن بـ`TIMED_OUT` يعرف
 * **أن الطلب طوّل**، ولا يخمّن.
 */
export const TIMED_OUT = Symbol('qimmah:access:call-timeout')

/** يقصّ أي وعد عند المهلة بعلامة مميّزة **مغلقة** — لا يرمي ولا يفتح. */
async function withDeadline<T>(promise: PromiseLike<T>): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<typeof TIMED_OUT>((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), CALL_TIMEOUT_MS) }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * أصناف الفشل الأربعة — **كلٌّ رسالته**، ولا يُلام نتُ المستخدم على عطلٍ عندنا.
 *
 * [SOVEREIGN-COMMERCE-001] العطل الذي أنشأ هذا النوع: سبعة أسباب متمايزة كانت
 * تخرج من الفتحة نفسها «ما قدرنا نتحقّق الحين. تأكّد من النت» — ومنها **غياب
 * الخادم في بناء المراجعة** (ليس عطلًا أصلًا) و**نقص `identity_pepper`** (عطل
 * إعداد عندنا). فمن يُبلَّغ أن شبكته معطوبة يعيد المحاولة إلى الأبد على طلبٍ لن
 * ينجح، ولا يصلنا منه بلاغ لأنه يظنّ المشكلة عنده.
 *
 * وكلّها **رفض**: لا عضو هنا يفتح فعلًا مدفوعًا. الفشل يُغلق ويُشرح.
 */
export type AccessFailure =
  /** لا خادم في هذا البناء أصلًا (بناء مراجعة أو ضبط ناقص) — لا عطل. */
  | 'backend_unconfigured'
  /** الخادم لم يردّ خلال المهلة — عابر، والإعادة معقولة. */
  | 'timeout'
  /** عطل **عندنا**: بيبر مفقود · مستخدم مجهول · صلاحية · دالّة ناقصة · مجهول. */
  | 'service_error'
  /** انقطاع شبكة حقيقي — وهذه وحدها تستحق «تأكّد من اتصالك». */
  | 'offline'

/**
 * دلائل انقطاع الشبكة كما تنطق بها المتصفّحات — `supabase-js` لا يرمي عند فشل
 * الشبكة بل يعيد `{ error }` بنصّ المتصفّح، فالتمييز يكون بالنصّ أو بإعلان
 * الجهاز نفسه (`navigator.onLine === false`).
 */
const NETWORK_HINTS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network error',
  'network request failed',
  'load failed',
  'err_internet_disconnected',
  'err_network',
  'err_name_not_resolved',
  'econnrefused',
  'enotfound',
  'etimedout',
  'the internet connection appears to be offline',
] as const

export function looksLikeNetworkFailure(text: string): boolean {
  const lower = text.toLowerCase()
  if (NETWORK_HINTS.some((hint) => lower.includes(hint))) return true
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false
  } catch {
    return false
  }
}

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
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT) return { ...DENIED, error: 'backend_timeout' }
  if (!sessionResult?.data?.session) return { ...DENIED, error: 'not_authenticated' }

  const receivedAtPerfMs = perfNow()
  const rpcResult = await withDeadline(supabase.rpc('my_entitlement'))
  if (rpcResult === TIMED_OUT) return { ...DENIED, error: 'backend_timeout' }
  const { data, error } = rpcResult
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
  | AccessFailure

/**
 * ترجمة أخطاء Postgres إلى نتائج معروضة.
 *
 * ═══ ما يبقى مدموجًا **عمدًا** — لا تفكّه ═══
 * `invalid_code` (`22023`) رسالة **واحدة عامّة** تجمع خمس حالات يرفعها الخادم
 * من نفس السطر (`20260809120001:245-251`): الكود غير موجود · مُعطَّل · لم تبدأ
 * نافذته · انتهت نافذته · استُنفدت مرّاته. والدمج هو الحماية نفسها: لو فُصلت
 * «منتهٍ» عن «غير موجود» لصار الحقل **أوراكل** يُسأل عن وجود الأكواد — يكتب
 * المهاجم كودًا فيعرف من نصّ الرسالة أنه موجود لكنه انتهى، فيجرّب جواره.
 * **فصلها يُضعف سلطة الخادم، ولا يُفعل.** ولهذا لا يوجد `codeExpired`.
 *
 * ═══ وما فُصل، ولماذا ═══
 * كل ما عدا ذلك كان يسقط في `offline` — «تأكّد من النت» لعطلٍ ليس في النت.
 * صار الافتراض `service_error` (عطل عندنا)، و`offline` لا تُقال إلا حين تقولها
 * الشبكة فعلًا. **الافتراض المجهول عطلٌ عندنا لا عند المستخدم**: من يُلام على
 * شبكته لا يبلّغنا، ومن يُقال له «الخلل عندنا» يبلّغ.
 */
export function classifyRedeemError(message: string, code: string): RedeemServerOutcome {
  const text = `${message} ${code}`.toLowerCase()
  if (text.includes('code_already_redeemed') || code === '23505') return 'already_used'
  if (text.includes('access_revoked')) return 'revoked'
  if (text.includes('not authenticated') || code === '28000') return 'not_authenticated'
  if (text.includes('invalid_code') || code === '22023') return 'invalid'
  if (looksLikeNetworkFailure(text)) return 'offline'
  return 'service_error'
}

export async function redeemCodeOnServer(code: string): Promise<RedeemServerOutcome> {
  if (!isSupabaseConfigured()) return 'backend_unconfigured'
  // الضبط موجود والوحدة لم تُحمَّل ⇒ عطلٌ عندنا لا غيابُ خادم: البناء يعِد بخادم
  // ولا يصل إليه. `service_error` تقولها كما هي.
  const supabase = await getSupabase()
  if (!supabase) return 'service_error'
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT) return 'timeout'
  if (!sessionResult?.data?.session) return 'not_authenticated'

  const rpcResult = await withDeadline(supabase.rpc('redeem_access_code', { p_code: code }))
  if (rpcResult === TIMED_OUT) return 'timeout'
  const { data, error } = rpcResult
  if (error) return classifyRedeemError(error.message ?? '', String((error as { code?: string }).code ?? ''))
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
  | AccessFailure

/**
 * ترجمة أخطاء `start_trial` — نفس قاعدة الاستبدال.
 *
 * [SOVEREIGN-COMMERCE-001] `access_revoked` **منعٌ إداري دائم**، وكانت الواجهة
 * تعرضه «تأكّد من اتصالك وجرّب مرة ثانية»: يُقال لمن أُوقف حسابه إن شبكته
 * معطوبة، فيعيد المحاولة أبدًا على بابٍ لن يُفتح بالإعادة. صار له نصّه.
 */
export function classifyTrialError(message: string, code: string): TrialOutcome {
  const text = `${message} ${code}`.toLowerCase()
  if (text.includes('email_not_verified')) return 'email_not_verified'
  if (text.includes('access_revoked')) return 'revoked'
  if (text.includes('trial_already') || text.includes('already')) return 'already_claimed'
  if (text.includes('not authenticated')) return 'not_authenticated'
  if (looksLikeNetworkFailure(text)) return 'offline'
  return 'service_error'
}

export async function startTrialOnServer(): Promise<TrialOutcome> {
  if (!isSupabaseConfigured()) return 'backend_unconfigured'
  const supabase = await getSupabase()
  if (!supabase) return 'service_error'
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT) return 'timeout'
  if (!sessionResult?.data?.session) return 'not_authenticated'

  const rpcResult = await withDeadline(supabase.rpc('start_trial'))
  if (rpcResult === TIMED_OUT) return 'timeout'
  const { data, error } = rpcResult
  if (error) return classifyTrialError(error.message ?? '', String((error as { code?: string }).code ?? ''))
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
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT || !sessionResult?.data?.session) return false
  const rpcResult = await withDeadline(supabase.rpc('claim_pending_grants'))
  if (rpcResult === TIMED_OUT) return false
  const { data, error } = rpcResult
  if (error) return false
  return typeof data === 'string' && statusForServerState(data) === 'active'
}
