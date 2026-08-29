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
//    منتهية — يعيد `none` مع سبب صادق. لا تفاؤل، ولا تخزين مؤقّت لنتيجة سابقة
//    **في هذا الملف**: ما هنا هو ما قاله الخادم الآن، لا ما قاله بالأمس.
//    [OFFLINE-ENTITLEMENT-001] ولأن «الآن» قد لا يكون متاحًا — انقطاع أو مهلة —
//    صارت هناك طبقة أعلى تعيد **آخر إجابة موجبة** بحدودها
//    (`entitlementCache.applyOfflineGrace`): مربوطةً بالحساب، مقصوصةً بانتهاء
//    الخادم، وضمن نافذة سماح مقفلة، ويمسحها أوّل ردٍّ سالب. وهي لا تُنشئ
//    استحقاقًا قط — تُعيد واحدًا أصدره الخادم. وهذا الملف يخدمها بشيئين لا
//    ثالث: **تصنيف الفشل** (`failure`) و**هوية الحساب** (`accountId`)؛ فبلا
//    الأوّل لا يُفرَّق بين «لم نصل» و«قيل لا»، وبلا الثاني يخدم سجلُّ حسابٍ
//    حسابًا آخر.
// ٣) **الوقت من الخادم لا من الجهاز.** التجربة ٧٢ ساعة يحسمها `expires_at`
//    مقابل `server_time` **كلاهما من قاعدة البيانات**. ونقيس ما مضى محلّيًا
//    بـ`performance.now()` — عدّاد لا يتأثّر بتغيير ساعة النظام — فإرجاع ساعة
//    الجهاز إلى الوراء لا يمدّ تجربةً انتهت.

import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { callGateway, isGatewayFault } from './gatewayClient'
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
  /**
   * [OFFLINE-ENTITLEMENT-001] الحساب الذي أجاب عنه الخادم — **من جلسة المصادقة
   * لا من مدخل مستخدم**. وُجد لأن الإجابة صارت تُحفَظ لتُعاد عند انقطاع
   * (`entitlementCache.ts`)، وإجابةٌ بلا هوية تصلح لأي حساب على الجهاز: أي
   * تسريبُ استحقاقِ حسابٍ إلى آخر. فالهوية جزء من الإجابة لا زينة عليها.
   */
  accountId: string
  /**
   * هل هذه إجابةٌ **معادة** من آخر تحقّق (لا طازجة من الخادم)؟ تُعلَن ولا
   * تُموَّه. غيابها = طازجة.
   */
  fromCache?: true
}

export interface BackendEntitlement {
  status: EntitlementStatus
  detail: EntitlementDetail | null
  /** سبب عام — لا يكشف وجود كود ولا تفاصيل داخلية. */
  error?: string
  /**
   * [OFFLINE-ENTITLEMENT-001] تصنيف الفشل — **الفيصل بين «لم نصل» و«أُجبنا
   * بالمنع»**. بدونه لا يستطيع أي مستدعٍ أن يفرّق بين شبكةٍ غائبة وخادمٍ قال
   * «لا»، فيتساوى المشتري المنقطع مع من لا استحقاق له. غيابه = لا فشل.
   */
  failure?: AccessFailure
  /** الحساب كما عرفته الجلسة وقت المحاولة — يُعرف حتى حين يفشل النداء. */
  accountId?: string | null
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
 * نصّ خطأ من ردٍّ قد يحمل `{ error }` — بلا `any` وبلا افتراض شكل.
 * يُرجع `null` حين **لا يوجد كائن خطأ أصلًا** (وهو تمييز يعتمد عليه المستدعي:
 * «لا جلسة» غير «تعذّر تجديد الجلسة»).
 */
function errorMessageOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const err = (value as { error?: unknown }).error
  if (!err || typeof err !== 'object') return null
  const message = (err as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

/**
 * القراءة المعتمدة. تُستدعى عند الإقلاع وعند كل تغيّر جلسة وبعد كل استبدال.
 *
 * [OFFLINE-ENTITLEMENT-001] **هذه الدالّة ما زالت لا تقرأ تخزينًا ولا تتذكّر
 * شيئًا** — ما تقوله هو ما قاله الخادم في هذه اللحظة، وكل فشل يعود منعًا.
 * الجديد أن الفشل صار **مصنَّفًا ومسمّى الهوية**: من يريد أن يعيد آخر إجابة
 * موجبة عند انقطاعٍ يفعلها في طبقة أعلى (`entitlementCache.applyOfflineGrace`)
 * وبحدودها، ولا يفعلها هذا الجسر. سلطة الجسر تبقى للخادم وحده.
 */
export async function fetchEntitlement(): Promise<BackendEntitlement> {
  if (!isSupabaseConfigured()) return { ...DENIED, error: 'backend_unconfigured', failure: 'backend_unconfigured' }
  const supabase = await getSupabase()
  if (!supabase) return { ...DENIED, error: 'backend_unavailable', failure: 'service_error' }

  // بلا جلسة لا استحقاق. الدالّة نفسها ترفض `auth.uid() is null`، ونوفّر رحلة.
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT) return { ...DENIED, error: 'backend_timeout', failure: 'timeout' }
  const session = sessionResult?.data?.session
  if (!session) {
    // **جلسةٌ غابت بسبب الشبكة ليست «غير مسجَّل»** — والفرق يقرّر مصير مشترٍ
    // انقطعت شبكته: `getSession()` تحاول تجديد رمزٍ منتهٍ، وتعيد عند فشل
    // الشبكة `{ session: null, error }`. لو قرأنا ذلك «لا حساب» لصار كل من
    // تجاوزت جلسته ساعةً بلا نت مستخدمًا مجهولًا.
    const message = errorMessageOf(sessionResult)
    if (message !== null && looksLikeNetworkFailure(message)) {
      return { ...DENIED, error: 'backend_offline', failure: 'offline' }
    }
    return { ...DENIED, error: 'not_authenticated', failure: 'service_error' }
  }
  const rawAccountId = (session as { user?: { id?: unknown } }).user?.id
  const accountId = typeof rawAccountId === 'string' && rawAccountId !== '' ? rawAccountId : null

  const receivedAtPerfMs = perfNow()
  const rpcResult = await withDeadline(supabase.rpc('my_entitlement'))
  if (rpcResult === TIMED_OUT) return { ...DENIED, error: 'backend_timeout', failure: 'timeout', accountId }
  const { data, error } = rpcResult
  if (error) {
    // المجهول عطلٌ عندنا حتى يثبت أنه شبكة المستخدم — نفس قاعدة
    // `classifyRedeemError`، ولا تُوسَّع «انقطاع الشبكة» لتبتلع أعطالنا.
    const text = `${error.message ?? ''} ${String((error as { code?: string }).code ?? '')}`
    const failure: AccessFailure = looksLikeNetworkFailure(text) ? 'offline' : 'service_error'
    return { ...DENIED, error: failure === 'offline' ? 'backend_offline' : 'backend_error', failure, accountId }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return { ...DENIED, error: 'backend_empty', failure: 'service_error', accountId }

  const r = row as Record<string, unknown>
  const serverState = String(r.state ?? 'noAccess') as ServerEntitlementState
  // حالة لا نعرفها ⇒ منع. لا نفترض أن الجديد آمن.
  if (!SERVER_ENTITLEMENT_STATES.includes(serverState)) return { ...DENIED, error: 'backend_unknown_state', failure: 'service_error', accountId }

  const serverTimeMs = ms(r.server_time)
  if (serverTimeMs === null) return { ...DENIED, error: 'backend_no_clock', failure: 'service_error', accountId }

  // هويةٌ مجهولة مع ردٍّ سليم ⇒ لا نبني تفصيلًا بلا صاحب. منعٌ صادق.
  if (accountId === null) return { ...DENIED, error: 'not_authenticated', failure: 'service_error' }

  const rawType = String(r.entitlement_type ?? 'none')
  const entitlementType = (['premium', 'special', 'trial'] as const).includes(rawType as never)
    ? (rawType as 'premium' | 'special' | 'trial')
    : 'none'

  return {
    status: statusForServerState(serverState),
    accountId,
    detail: {
      serverState,
      entitlementType,
      noExpiry: r.no_expiry === true,
      expiresAtMs: ms(r.expires_at),
      activatedAtMs: ms(r.activated_at),
      serverTimeMs,
      receivedAtPerfMs,
      accountId,
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
  /**
   * [COMMISSIONING §5] بريدٌ لم يُؤكَّد بعد.
   *
   * **والكود ليس خاطئًا** — فقول «كودك غلط» هنا يرسل المستخدم يفتّش عن خطأ في
   * كودٍ صحيح، ويترك الخطوة الحقيقية (تأكيد البريد) غير مذكورة. الخطوة
   * التالية تُقال صريحة (§6/٤).
   */
  | 'email_not_verified'
  /**
   * [COMMISSIONING §5/§12] تجاوز حدّ المحاولات.
   *
   * **ليست فشلًا في الكود بل في وتيرة المحاولة**، فلها نصّها: من أخطأ عشر
   * مرّات يستحقّ أن يُقال له «هدّئ شوي» لا «كودك غلط» — والثانية كذبة صغيرة
   * تدفعه لمحاولة حادية عشرة.
   */
  | 'rate_limited'
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
/**
 * ═══ [STAGING-COMMISSIONING §16] جلسةٌ رفضها الخادم ═══
 *
 * `PGRST301` وأخواتها تعني: **الرمز نفسه مرفوض** — انتهى أو فسد توقيعه. وهذه
 * ليست عطلًا عندنا ولا شبكةً عند المستخدم، ولها **خطوة تالية واحدة معروفة**:
 * سجّل دخولك ثانية.
 *
 * وكانت تسقط في `service_error`، فيُقال لمن انتهت جلسته «صار خلل عندنا، جرّب
 * بعد شوي» — وهو نصٌّ **يخفي الخطوة التي تحلّ المشكلة** ويرسل بلاغًا كاذبًا
 * إلى الدعم عن عطلٍ لا وجود له. الصدق قبل الطمأنينة (§6/٤).
 *
 * ولا خطر التباس: لا خطأ عملٍ في هذا العقد يحمل كلمة `jwt`.
 */
function looksLikeRejectedSession(text: string, code: string): boolean {
  if (/^pgrst30[0-9]$/.test(code.toLowerCase())) return true
  const t = text.toLowerCase()
  return t.includes('jwt') && (t.includes('expired') || t.includes('invalid') || t.includes('malformed'))
}

export function classifyRedeemError(message: string, code: string): RedeemServerOutcome {
  const text = `${message} ${code}`.toLowerCase()
  if (text.includes('code_already_redeemed') || code === '23505') return 'already_used'
  if (text.includes('access_revoked')) return 'revoked'
  // ⚠️ **قبل فحص `28000`**: تأكيد البريد يرفع بنفس رمز الحالة، فترتيبٌ معكوس
  // يترجمه «لست مسجّل الدخول» — وهو مسجّل الدخول فعلًا، فيُرسَل إلى شاشة لا
  // تحلّ شيئًا. والفصل بالاسم لا بالرمز.
  if (text.includes('email_not_verified')) return 'email_not_verified'
  // جلسةٌ رفضها الخادم ⇒ نفس رسالة «سجّل دخولك»: الخطوة التالية واحدة.
  if (looksLikeRejectedSession(message, code)) return 'not_authenticated'
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
  const token = sessionResult.data.session.access_token

  /**
   * ═══ [COMMISSIONING §5] لماذا `_v2` ═══
   * الدالّة القديمة **ترفع** عند كل فشل تجاري، والرفع يُلغي معاملته — بما فيه
   * أي صفّ يسجّل المحاولة. فحدُّ المعدّل فوقها كان سيعدّ **النجاحات وحدها**:
   * حارسٌ لا يُطلق أبدًا. و`_v2` تُعيد الفشل **قيمةً**، فتُثبَّت المحاولة
   * ويصير الحدّ ذا معنى. والنواة واحدة، فلا سلوك اختلف في المسار السعيد.
   *
   * والارتداد مقصود ومعلَن: خادمٌ لم تُطبَّق عليه هجرة `_v2` بعد يردّ
   * `PGRST202`، فنسقط إلى التوقيع القديم بدل أن نُفشل المستخدم على فرقٍ
   * في النشر لا يعنيه.
   */
  /**
   * [RED-TEAM-FINAL] **عبر البوّابة، لا إلى PostgREST مباشرةً.**
   * القاعدة تشترط ختم `x-qimmah-gate` منذ `20260827120004`، ولا يسكّه إلا
   * `qimmah-gateway`. والنداء المباشر يُرفض بـ`28000` فيُقرأ «سجّل دخولك».
   *
   * والارتداد إلى `redeem_access_code` القديمة **أُسقط ولم يُنقل**: التوقيع
   * القديم منزوعٌ من `authenticated` منذ `20260824120004` (مقيس:
   * `has_function_privilege('authenticated', …) = false`)، فالارتداد كان
   * مسارًا ميتًا يعِد بإنقاذٍ لا يقع. وإسقاط وعدٍ كاذب ليس فقدان قدرة.
   */
  const gw = await withDeadline(callGateway('redeem_access_code', { p_code: code }, token))
  if (gw === TIMED_OUT) return 'timeout'
  if (gw.outcome === 'unreachable') return looksLikeNetworkFailure(gw.reason.toLowerCase()) ? 'offline' : 'service_error'
  if (gw.outcome === 'rate_limited') return 'rate_limited'
  if (gw.outcome === 'unauthenticated') return 'not_authenticated'
  if (isGatewayFault(gw.outcome)) return 'service_error'
  if (gw.outcome === 'rpc_error') return classifyRedeemError(gw.reason, gw.code)
  const data = gw.result

  // `_v2` تُعيد `{ outcome, reason }`. والفشل قيمةٌ هنا، فيُصنَّف بنفس المُصنِّف
  // الذي يقرأ رسائل الأخطاء — مصدرٌ واحد للتسمية، لا جدولان يتباعدان.
  const payload = (data ?? {}) as { outcome?: unknown; reason?: unknown }
  const outcome = typeof payload.outcome === 'string' ? payload.outcome : ''
  const reason = typeof payload.reason === 'string' ? payload.reason : ''
  if (outcome === 'rate_limited') return 'rate_limited'
  if (outcome === 'failed') return classifyRedeemError(reason, '')
  // النجاح لا يُعلَن من هنا: المستدعي يُعيد القراءة من `fetchEntitlement`.
  return statusForServerState(outcome) === 'active' ? 'success' : 'invalid'
}

/** نتائج بدء التجربة — كلٌّ منها رسالة صادقة للمستخدم. */
export type TrialOutcome =
  | 'started'
  | 'already_claimed'
  | 'email_not_verified'
  | 'not_authenticated'
  | 'revoked'
  /**
   * [RED-TEAM-FINAL] حدّ البوّابة لكل عنوان شبكة (١٢/ساعة لبدء التجربة).
   *
   * **حالةٌ مشروعة لا عطل:** مكتبٌ أو جامعة أو مشغّل خلوي خلف NAT مشترك قد
   * يبلغها بمستخدمين حقيقيين. وقولها «خلل عندنا» يكذب، وقولها «كودك/حسابك»
   * يلوم بريئًا — فتُقال كما هي، والخطوة التالية صريحة (§6/٤).
   */
  | 'rate_limited'
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
  if (looksLikeRejectedSession(message, code)) return 'not_authenticated'
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
  const token = sessionResult.data.session.access_token

  // [RED-TEAM-FINAL] عبر البوّابة — انظر `redeemCodeOnServer` لسبب التحويل.
  const gw = await withDeadline(callGateway('start_trial', {}, token))
  if (gw === TIMED_OUT) return 'timeout'
  if (gw.outcome === 'unreachable') return looksLikeNetworkFailure(gw.reason.toLowerCase()) ? 'offline' : 'service_error'
  if (gw.outcome === 'rate_limited') return 'rate_limited'
  if (gw.outcome === 'unauthenticated') return 'not_authenticated'
  if (isGatewayFault(gw.outcome)) return 'service_error'
  if (gw.outcome === 'rpc_error') return classifyTrialError(gw.reason, gw.code)
  const data = gw.result
  return typeof data === 'string' && statusForServerState(data) === 'active' ? 'started' : 'already_claimed'
}

/**
 * ═══ [STAGING-COMMISSIONING §16] نتيجة مسمّاة — والسبب تجاريّ لا أسلوبيّ ═══
 *
 * كانت هذه الدالّة تعيد `boolean`، وهو يخلط **ثلاث حالات مختلفة تمامًا**:
 *   ① مُنحت منحة                        → `granted`
 *   ② الخادم ردّ: لا شيء ينتظر (الغالب)  → `nothing_pending`
 *   ③ **لم نبلغ الخادم أصلًا**            → `unreachable`
 *
 * والفرق بين ② و③ هو الفرق بين «لا شيء لك» و«ما عرفنا». ومن يخلطهما يخسر
 * مشتريًا: العائد من سلة يُطفئ نيّة المطالبة قبل أن تُنفَّذ، فإن تعثّرت
 * المطالبة لحظتَها لم تُعَد أبدًا — ويقف من دفع ١٩٫٩٩ أمام تطبيق مقفل بلا
 * طريق للاسترجاع سوى مراسلة الدعم.
 */
export type ClaimOutcome = 'granted' | 'nothing_pending' | 'unreachable'

export async function claimPendingGrantsOnServer(): Promise<ClaimOutcome> {
  if (!isSupabaseConfigured()) return 'unreachable'
  const supabase = await getSupabase()
  if (!supabase) return 'unreachable'
  const sessionResult = await withDeadline(supabase.auth.getSession())
  if (sessionResult === TIMED_OUT) return 'unreachable'
  // بلا جلسة لا مطالبة **ولا إعادة محاولة**: الغياب هنا ليس عطلًا عابرًا.
  if (!sessionResult?.data?.session) return 'nothing_pending'
  const token = sessionResult.data.session.access_token
  // [RED-TEAM-FINAL] عبر البوّابة — انظر `redeemCodeOnServer` لسبب التحويل.
  const gw = await withDeadline(callGateway('claim_pending_grants', {}, token))
  if (gw === TIMED_OUT) return 'unreachable'
  // ⚠️ **الخطأ ليس «لا شيء ينتظر»**: قد تكون المنحة موجودة ولم نبلغها. وكل ما
  // ليس ردًّا ناجحًا من الـRPC يبقى `unreachable` — فالنيّة لا تُطفأ بالخطأ.
  if (gw.outcome !== 'ok') return 'unreachable'
  const data = gw.result
  return typeof data === 'string' && statusForServerState(data) === 'active'
    ? 'granted' : 'nothing_pending'
}
