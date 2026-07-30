// تصنيف أعطال المصادقة وحراسة نداءاتها — طبقة نقيّة بلا React وبلا DOM (قابلة للإثبات).
//
// ثلاث مشاكل حقيقية يغلقها هذا الملف:
//
// ١) **تسريب نصّ الخادم الخام** (خرق §9): التصنيف القديم كان يطابق كلمات إنجليزية في نصّ
//    الرسالة، وإن لم يطابق شيئًا أعاد **رسالة الخادم كما هي** للمستخدم. النتيجة: عربيّ
//    يقرأ «Load failed» أو «New password should be different…».
//
// ٢) **عمى انقطاع الشبكة على WKWebView**: supabase-js يحوّل كل فشل fetch إلى
//    `AuthRetryableFetchError(message, 0)` حيث `message` هو نصّ المتصفّح الحرفي:
//    Chrome «Failed to fetch» · Firefox «NetworkError when attempting…» · **Safari/WKWebView
//    «Load failed»**. المطابقة القديمة على `fetch`/`network` تفوّت «Load failed» تمامًا —
//    أي أنّ الحالة تفشل بالذات على المنصّة الأساسية للتطبيق (Capacitor/iOS). الحلّ:
//    `status === 0` علامة قاطعة على فشل شبكي مهما كانت لغة المتصفّح.
//
// ٣) **التجميد**: `signUp/signInWithPassword` **يرمي** كل خطأ ليس AuthError (مثال واقعي:
//    تخزين محليّ مقفل في التصفّح الخاص يُفشل حفظ code-verifier). الرمي يهرب من الشاشة
//    فلا يُصفَّر `busy` أبدًا ⇒ زرّ يدور إلى الأبد. وكذلك الطلب المعلّق بلا ردّ (شبكة
//    نصف مفتوحة على الجوال) يترك الشاشة دائرة بلا رسالة. `guardedAuthCall` يضمن أنّ كل
//    نداء **ينتهي دائمًا** بنتيجة: نجاح، أو عطل مصنَّف برسالة صادقة.
//
// المبدأ: التصنيف يعتمد أولًا على `code` الثابت من GoTrue (لا يتغيّر بلغة أو صياغة)،
// ثم على `status`، والنصّ آخر ملاذ لخوادم قديمة بلا رموز. وفي كل الأحوال: **الرسالة
// المعروضة من قواميسنا حصرًا**، لا من الخادم.

import type { Lang } from './appPreferences'
import { miscStrings } from '@/i18n/dict/misc'
import { authFlowStrings } from '@/i18n/dict/authFlow'

/** العملية الجارية — تحدّد صياغة رسالة المهلة (الغموض في إنشاء الحساب فقط). */
export type AuthOp = 'signUp' | 'signIn' | 'resetPassword' | 'updatePassword' | 'resendConfirmation'

/** نوع العطل المصنَّف. لا يظهر للمستخدم؛ يُترجَم عبر `authFailureMessage`. */
export type AuthFailureKind =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalidCredentials'
  | 'alreadyRegistered'
  | 'emailNotConfirmed'
  | 'weakPassword'
  | 'samePassword'
  | 'invalidEmail'
  | 'rateLimit'
  | 'signupDisabled'
  | 'cloudDisabled'
  | 'unknown'

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) return undefined
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function readNumber(source: unknown, key: string): number | undefined {
  if (typeof source !== 'object' || source === null) return undefined
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : undefined
}

/**
 * يصنّف عطل مصادقة (كائن خطأ من supabase-js أو استثناء مرمي أو أي شيء آخر).
 * لا يرمي أبدًا، ولا يُرجِع نصًّا — النوع فقط، فالنصّ من القاموس.
 */
export function classifyAuthFailure(error: unknown): AuthFailureKind {
  const code = readString(error, 'code')
  const status = readNumber(error, 'status')
  const message = (readString(error, 'message') ?? '').toLowerCase()

  // (١) رموز GoTrue الثابتة — المصدر الأدقّ، مستقلّ عن اللغة والصياغة.
  switch (code) {
    case 'invalid_credentials':
      return 'invalidCredentials'
    case 'email_exists':
    case 'user_already_exists':
    case 'identity_already_exists':
      return 'alreadyRegistered'
    case 'email_not_confirmed':
      return 'emailNotConfirmed'
    case 'weak_password':
      return 'weakPassword'
    case 'same_password':
      return 'samePassword'
    case 'email_address_invalid':
      return 'invalidEmail'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'rateLimit'
    case 'request_timeout':
      return 'timeout'
    case 'signup_disabled':
      return 'signupDisabled'
    default:
      break
  }
  // `validation_failed` عامّ (بريد أو حقل آخر) — نخصّه بالبريد فقط إن ذكرته الرسالة.
  if (code === 'validation_failed' && message.includes('email')) return 'invalidEmail'

  // (٢) الحالة الشبكية القاطعة: supabase-js يضع status = 0 لكل فشل fetch، بأي لغة متصفّح.
  if (status === 0) return 'network'
  if (typeof status === 'number' && status >= 500) return 'server'
  if (status === 429) return 'rateLimit'

  // (٣) آخر ملاذ: مطابقة النصّ (خوادم قديمة بلا رموز). نضمّ صياغات المتصفّحات الثلاثة.
  if (message.includes('invalid login') || message.includes('invalid credentials')) return 'invalidCredentials'
  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already')
  )
    return 'alreadyRegistered'
  if (message.includes('email not confirmed')) return 'emailNotConfirmed'
  if (message.includes('should be different')) return 'samePassword'
  if (
    message.includes('password') &&
    (message.includes('6') || message.includes('short') || message.includes('weak') || message.includes('least'))
  )
    return 'weakPassword'
  if (message.includes('email') && message.includes('valid')) return 'invalidEmail'
  if (message.includes('rate limit') || message.includes('too many')) return 'rateLimit'
  if (
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('network') ||
    message.includes('networkerror') ||
    message.includes('connection')
  )
    return 'network'

  // مجهول: رسالة عامّة من قاموسنا — **لا نصّ الخادم**.
  return 'unknown'
}

/** يترجم نوع العطل إلى رسالة جاهزة للعرض من قواميسنا. لا تُبنى من نصّ الخادم أبدًا. */
export function authFailureMessage(kind: AuthFailureKind, lang: Lang, op: AuthOp): string {
  const m = miscStrings[lang]
  const f = authFlowStrings[lang]
  switch (kind) {
    case 'offline':
      return f.offline
    case 'timeout':
      return op === 'signUp' ? f.timeoutSignUp : op === 'signIn' ? f.timeoutSignIn : f.timeoutGeneric
    case 'network':
      return m.authNetwork
    case 'server':
      return f.serverDown
    case 'invalidCredentials':
      return m.authInvalidCredentials
    case 'alreadyRegistered':
      return m.authAlreadyRegistered
    case 'emailNotConfirmed':
      return m.authEmailNotConfirmed
    case 'weakPassword':
      return m.authWeakPassword
    case 'samePassword':
      return f.samePassword
    case 'invalidEmail':
      return m.authInvalidEmail
    case 'rateLimit':
      return m.authRateLimit
    case 'signupDisabled':
      return f.signupDisabled
    case 'cloudDisabled':
      return m.authCloudDisabled
    case 'unknown':
    default:
      return m.authGeneric
  }
}

/** طريق مختصر: من كائن خطأ الخادم إلى رسالة معروضة. */
export function describeAuthError(error: unknown, lang: Lang, op: AuthOp): string {
  return authFailureMessage(classifyAuthFailure(error), lang, op)
}

/** المهلة الافتراضية لنداء مصادقة واحد. سخيّة كي لا تقطع اتصالًا بطيئًا سليمًا. */
export const AUTH_CALL_TIMEOUT_MS = 20_000

export type GuardedResult<T> = { ok: true; value: T } | { ok: false; kind: AuthFailureKind; error: string }

export interface GuardedAuthOptions {
  /** لتجاوز قراءة `navigator.onLine` (الإثبات يضبطها صراحةً). */
  online?: boolean
  /** لتقصير المهلة في الإثبات. */
  timeoutMs?: number
}

/** هل الجهاز متصل؟ نحكم بالانقطاع فقط عند تصريح المتصفّح به (لا نخترع انقطاعًا). */
function deviceOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return (navigator as Navigator & { onLine?: boolean }).onLine !== false
}

/**
 * يضمن أن نداء المصادقة **ينتهي دائمًا** بنتيجة قابلة للعرض:
 *   • الجهاز مقطوع ⇒ رسالة فورية بلا طلب محتوم الفشل (ولا يُستدعى `run` إطلاقًا).
 *   • الطلب معلّق بلا ردّ ⇒ ينتهي بـ`timeout` عند المهلة (لا زرّ يدور إلى الأبد).
 *   • `run` رمى استثناءً ⇒ يُصنَّف ويُترجَم (لا وعد مرفوض يهرب من الشاشة).
 * لا يفسّر محتوى النجاح — المستدعي يفحص `{ data, error }` بنفسه.
 */
export async function guardedAuthCall<T>(
  op: AuthOp,
  lang: Lang,
  run: () => Promise<T>,
  opts: GuardedAuthOptions = {},
): Promise<GuardedResult<T>> {
  const online = opts.online ?? deviceOnline()
  if (!online) {
    return { ok: false, kind: 'offline', error: authFailureMessage('offline', lang, op) }
  }

  const timeoutMs = opts.timeoutMs ?? AUTH_CALL_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  const TIMED_OUT = Symbol('auth-timeout')

  try {
    // نبني الوعد مرّة واحدة ونضمن التقاط أي رفض لاحق حتى بعد المهلة (لا رفض غير مُعالَج).
    const call = (async () => run())()
    call.catch(() => {
      /* أي رفض بعد انتهاء المهلة لا يجوز أن يصير UnhandledRejection */
    })
    const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs)
    })
    const outcome = await Promise.race([call, timeout])
    if (outcome === TIMED_OUT) {
      return { ok: false, kind: 'timeout', error: authFailureMessage('timeout', lang, op) }
    }
    return { ok: true, value: outcome as T }
  } catch (error) {
    const kind = classifyAuthFailure(error)
    return { ok: false, kind, error: authFailureMessage(kind, lang, op) }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * هل ردّ إنشاء الحساب يعني «هذا البريد مسجّل من قبل»؟
 *
 * حين يكون تأكيد البريد مفعّلًا، GoTrue **لا يُرجع خطأ** لبريد موجود — يُرجع مستخدمًا
 * مموّهًا بلا جلسة و**بمصفوفة identities فارغة** (منع تعداد الحسابات). التطبيق كان يقرأ
 * ذلك نجاحًا ويقول «فتحنا حسابك» — ادّعاء كاذب (§5). العلامة الوحيدة الموثوقة هي
 * `identities: []`، ونتحقّق أنها مصفوفة فعلًا كي لا نُطلق إنذارًا على خادم لا يُرجعها.
 */
export function isAmbiguousSignup(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const record = data as { user?: unknown; session?: unknown }
  if (record.session) return false
  const user = record.user
  if (typeof user !== 'object' || user === null) return false
  const identities = (user as { identities?: unknown }).identities
  return Array.isArray(identities) && identities.length === 0
}
