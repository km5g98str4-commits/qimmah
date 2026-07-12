// منطق حالة استعادة كلمة المرور — دوال خالصة قابلة للاختبار (بلا React، بلا متصفح، بلا Supabase).
//
// المشكلة الجذرية التي تعالجها: التوجيه لشاشة «كلمة مرور جديدة» كان يعتمد كليًا على أن يكون
// hash العنوان «#/reset». إن هبط رابط Supabase على جذر التطبيق (قالب افتراضي، أو رابط
// إعادة توجيه بلا لاحقة #/reset، أو Deep Link على iOS) لا يُعرَف أنها استعادة فيُقذف
// المستخدم لتسجيل الدخول. هنا نجمع «مؤشّرات الاستعادة» من أي عنوان، ونقرّر المسار/الطور
// من مصدر حقيقة واحد: حدث PASSWORD_RECOVERY أو وجود مؤشّر استعادة في العنوان.

/** نوع رابط الاستعادة كما يضعه GoTrue في المعامل type. */
export const RECOVERY_TYPE = 'recovery'

/** مؤشّرات الاستعادة المستخرجة من عنوان (query أو hash أو fragment ثانٍ). */
export interface RecoveryParams {
  /** رمز PKCE (?code=) إن وُجد. */
  code: string | null
  /** رمز الوصول للتدفّق الضمني (#access_token=) إن وُجد. */
  accessToken: string | null
  /** رمز التجديد للتدفّق الضمني (#refresh_token=) إن وُجد. */
  refreshToken: string | null
  /** قيمة type (recovery/signup/…) إن وُجدت. */
  type: string | null
  /** هل يحمل العنوان أي مؤشّر استعادة صالح؟ (PKCE code، أو زوج implicit، أو type=recovery). */
  hasRecovery: boolean
}

/**
 * فكّ ترميز URI آمن: ترميز percent مشوّه (مثل «%zz») يجعل decodeURIComponent يرمي URIError.
 * نعيد null بدل الرمي فيُعامَل كغياب المؤشّر (حالة «الرابط منتهٍ» الهادئة بدل شاشة عالقة).
 */
export function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/**
 * يستخرج مؤشّرات الاستعادة من نص عنوان أينما وقعت المعاملات: query (?a=b)، hash التوجيه
 * (#/reset?code=…)، أو fragment ثانٍ ضمني (#access_token=…&refresh_token=…&type=recovery).
 * لا يعتمد على URL() (قد يفشل مع hash مزدوج) — يمسح بتعبير نمطي متساهل عبر [?&#].
 * لا يطبع أي رمز إطلاقًا. دالة خالصة: النص يدخل، القرار يخرج.
 */
export function parseRecoveryParams(url: string | null | undefined): RecoveryParams {
  const empty: RecoveryParams = { code: null, accessToken: null, refreshToken: null, type: null, hasRecovery: false }
  if (!url) return empty

  const pick = (name: string): string | null => {
    // نلتقط المعامل أينما سُبِق بـ ? أو & أو #.
    const m = url.match(new RegExp(`[?&#]${name}=([^&#]+)`))
    return m ? safeDecode(m[1]) : null
  }

  const code = pick('code')
  const accessToken = pick('access_token')
  const refreshToken = pick('refresh_token')
  const type = pick('type')

  // مؤشّر استعادة صالح: رمز PKCE، أو زوج implicit كامل، أو تصريح type=recovery.
  const hasRecovery =
    Boolean(code) || Boolean(accessToken && refreshToken) || type === RECOVERY_TYPE

  return { code, accessToken, refreshToken, type, hasRecovery }
}

/** هل يحمل هذا العنوان مؤشّر استعادة؟ (اختصار منطقي فوق parseRecoveryParams). */
export function isRecoveryUrl(url: string | null | undefined): boolean {
  return parseRecoveryParams(url).hasRecovery
}

/** زوج الرموز الضمنية الكامل إن توفّر، وإلا null (للتمرير إلى setSession). */
export function implicitTokens(params: RecoveryParams): { access_token: string; refresh_token: string } | null {
  if (params.accessToken && params.refreshToken) {
    return { access_token: params.accessToken, refresh_token: params.refreshToken }
  }
  return null
}

/**
 * القرار المركزي: هل يجب أن نُثبّت المستخدم على شاشة الاستعادة؟ مصدر الحقيقة الواحد.
 * true إذا أطلق Supabase حدث PASSWORD_RECOVERY، أو إن حمل عنوان الإقلاع مؤشّر استعادة
 * (حتى لو لم يكن hash هو #/reset — القالب الافتراضي/الرابط العميق على iOS). هذا يمنع
 * قذف جلسة الاستعادة لشاشة الدخول/الأسئلة.
 */
export function shouldRouteToRecovery(input: { event?: string | null; hasRecoveryParam?: boolean }): boolean {
  return input.event === 'PASSWORD_RECOVERY' || Boolean(input.hasRecoveryParam)
}

/** أطوار شاشة إعادة التعيين. */
export type ResetPhase = 'checking' | 'ready' | 'expired'

/**
 * يقرّر طور شاشة إعادة التعيين قرارًا خالصًا:
 *   • جلسة حاضرة → ready (نعرض النموذج فورًا).
 *   • لا جلسة، ومحاولة الاستكمال لم تُحسم بعد، ويوجد مؤشّر استعادة → checking.
 *   • لا جلسة وحُسمت المحاولة (أو لا مؤشّر إطلاقًا) → expired (رسالة هادئة، لا تعليق).
 */
export function decideResetPhase(input: {
  hasSession: boolean
  hasRecoveryIndicator: boolean
  exchangeResolved: boolean
}): ResetPhase {
  if (input.hasSession) return 'ready'
  if (!input.hasRecoveryIndicator) return 'expired'
  return input.exchangeResolved ? 'expired' : 'checking'
}
