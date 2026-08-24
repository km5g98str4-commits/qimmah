// جدول الصدق — سببٌ واحد ⇒ رسالة واحدة، ولا سببان يتقاسمان نصًّا.
// [SOVEREIGN-COMMERCE-001]
//
// ═══ العطل الذي أنشأ هذا الملف ═══
// كان اختيار الرسالة سلسلةَ `? :` داخل المكوّن، وكانت **سبعة أسباب متمايزة**
// تنتهي إلى النصّ نفسه: «ما قدرنا نتحقّق الحين. تأكّد من النت وجرّب بعد شوي».
// ومنها: غياب الخادم في بناء المراجعة (ليس عطلًا أصلًا) · فشل تحميل العميل ·
// مهلة ٨ ثوانٍ · انقطاع نت حقيقي · `identity_pepper` مفقود (P0002) · مستخدم
// مجهول · وأي SQLSTATE غير مصنَّف. فكان **عطل إعدادٍ عندنا يُلبَس شبكةَ
// المستخدم**، ومَن يُقال له «شبكتك معطوبة» يعيد المحاولة إلى الأبد ولا يبلّغ.
//
// ═══ لماذا جدول لا سلسلة شروط ═══
// السلسلة تسمح بالنسيان الصامت: نتيجة جديدة بلا فرع تعني **رسالة فارغة** أمام
// المستخدم — فشلٌ لا صوت له. الجدول يجعل الإغفال **خطأ أنواع**: `satisfies
// Record<…>` يرفض التصريف إن نقصت حالة واحدة.
//
// ═══ ما يبقى مدموجًا عمدًا ═══
// `invalid` وحدها تجمع خمس حالات خادم (غير موجود · مُعطَّل · لم تبدأ نافذته ·
// انتهت · استُنفدت مرّاته) لأن فصلها يحوّل الحقل إلى **أوراكل** على وجود
// الأكواد. الدمج هنا حمايةٌ لا كسل — ولا يُفكّ.

import type { Lang } from '@/lib/appPreferences'
import { accessStrings, type AccessStrings } from '@/i18n/dict/access'
import { isFounderPreview } from '@/lib/appEnv'
import type { RedeemOutcome } from './entitlementSource'
import type { TrialOutcome } from './entitlementBackend'

/** حالة واجهة الاستبدال: ما قبل المحاولة، وأثناءها، ونتيجتها. */
export type RedeemUiState = 'idle' | 'checking' | RedeemOutcome
/** حالة واجهة التجربة — نفس البنية على مسار التجربة. */
export type TrialUiState = 'idle' | 'working' | TrialOutcome

/** نبرة العرض — للتلوين وحده، ولا يُشتقّ منها إذن. */
export type OutcomeTone = 'pending' | 'success' | 'refusal'

type MessageKey = {
  [K in keyof AccessStrings]: AccessStrings[K] extends string ? K : never
}[keyof AccessStrings]

/**
 * `backend_unconfigured` نصّان لا واحد: البناء الذي **يُعلن أنه نسخة مراجعة**
 * يقولها صراحةً بدل أن يلمّح. الإشارة هي `isFounderPreview()` القائمة — قرار
 * وقت بناء لا يملك المتصفّح تبديله — ولا تُخترع إشارة ثانية.
 */
const PREVIEW_SWAP: Partial<Record<MessageKey, MessageKey>> = {
  codeBackendAbsent: 'codePreviewNoServer',
  trialBackendAbsent: 'trialPreviewNoServer',
}

/**
 * كل نتيجة استبدال ورسالتها. **الإغفال خطأ تصريف** بفضل `satisfies`.
 * ولاحظ: لا مفتاح مكرَّر — سببان لا يتقاسمان نصًّا (يحرسه `test:activation-ui`).
 */
const REDEEM_MESSAGE = {
  checking: 'codeChecking',
  success: 'codeSuccess',
  empty: 'codeEmpty',
  invalid: 'codeInvalid',
  already_used: 'codeAlreadyUsed',
  revoked: 'codeRevoked',
  not_authenticated: 'codeNeedsAccount',
  // [COMMISSIONING §5] نصٌّ خاصّ لا يتقاسمه أحد: «كودك غلط» بعد عشر محاولات
  // كذبةٌ تدفع لمحاولة حادية عشرة، والحقيقة أن الوتيرة هي التي رُفضت.
  rate_limited: 'redeemRateLimited',
  // [COMMISSIONING §5] وكذلك هذه: الكود صحيح والناقص تأكيد البريد. ودمجها في
  // `codeInvalid` كان يرسل المستخدم يفتّش عن غلطٍ لا وجود له.
  email_not_verified: 'codeNeedsVerifiedEmail',
  backend_unconfigured: 'codeBackendAbsent',
  timeout: 'codeTimeout',
  service_error: 'codeServiceError',
  offline: 'codeOffline',
} satisfies Record<Exclude<RedeemUiState, 'idle'>, MessageKey>

/** كل نتيجة تجربة ورسالتها — نفس القاعدة، ونفس الحراسة. */
const TRIAL_MESSAGE = {
  working: 'trialStarting',
  started: 'trialStarted',
  not_authenticated: 'trialNeedsAccount',
  email_not_verified: 'trialNeedsVerifiedEmail',
  already_claimed: 'trialAlreadyUsed',
  revoked: 'trialRevoked',
  backend_unconfigured: 'trialBackendAbsent',
  timeout: 'trialTimeout',
  service_error: 'trialServiceError',
  offline: 'trialOffline',
} satisfies Record<Exclude<TrialUiState, 'idle'>, MessageKey>

/** النتائج التي تعني «تمّ» — وما عداها رفضٌ أو انتظار. */
const SUCCEEDED = new Set<string>(['success', 'started'])
const PENDING = new Set<string>(['checking', 'working'])

function resolveKey(key: MessageKey): MessageKey {
  return (isFounderPreview() && PREVIEW_SWAP[key]) || key
}

function dict(lang: Lang): AccessStrings {
  return accessStrings[lang] ?? accessStrings.ar
}

/** مفتاح رسالة الاستبدال — مكشوف للإثباتات كي تفحص الجدول لا النصّ. */
export function redeemMessageKey(state: RedeemUiState): MessageKey | null {
  if (state === 'idle') return null
  return resolveKey(REDEEM_MESSAGE[state])
}

/** مفتاح رسالة التجربة. */
export function trialMessageKey(state: TrialUiState): MessageKey | null {
  if (state === 'idle') return null
  return resolveKey(TRIAL_MESSAGE[state])
}

/** الرسالة المعروضة لنتيجة استبدال — `null` قبل أي محاولة. */
export function redeemMessage(state: RedeemUiState, lang: Lang): string | null {
  const key = redeemMessageKey(state)
  return key ? dict(lang)[key] : null
}

/**
 * الرسالة المعروضة لنتيجة تجربة.
 *
 * تُستهلك من شاشة التسليم (حارة الإعداد) بدل سلسلة `? :` كانت تعرض **المنع
 * الإداري الدائم** (`revoked`) بنصّ «تأكّد من اتصالك وجرّب مرة ثانية».
 */
export function trialMessage(state: TrialUiState, lang: Lang): string | null {
  const key = trialMessageKey(state)
  return key ? dict(lang)[key] : null
}

/** نبرة النتيجة — للتلوين، ولا يُبنى عليها إذن بفعل. */
export function outcomeTone(state: RedeemUiState | TrialUiState): OutcomeTone {
  if (PENDING.has(state)) return 'pending'
  if (SUCCEEDED.has(state)) return 'success'
  return 'refusal'
}

/**
 * أسماء الأسباب الجذرية ⇒ النتيجة المعروضة. **جدول توثيقي مُنفَّذ**: تقرؤه
 * الإثباتات فتفشل بالاسم إن عاد سببان يتقاسمان نصًّا. مصدر كل صف مذكور.
 */
export const REDEEM_CAUSE_MAP: ReadonlyArray<{ cause: string; source: string; outcome: RedeemUiState }> = [
  { cause: 'empty input', source: 'entitlementSource.redeemActivationCode', outcome: 'empty' },
  { cause: 'malformed input (separators only)', source: 'normalizeActivationCode ⇒ ""', outcome: 'invalid' },
  { cause: 'backend absent by build', source: 'backendAvailable() === false', outcome: 'backend_unconfigured' },
  { cause: 'supabase client failed to load', source: 'getSupabase() === null', outcome: 'service_error' },
  { cause: 'no session', source: 'auth.getSession() empty', outcome: 'not_authenticated' },
  { cause: 'rpc timeout (8s)', source: 'withDeadline ⇒ TIMED_OUT', outcome: 'timeout' },
  { cause: 'network failure', source: 'looksLikeNetworkFailure(error)', outcome: 'offline' },
  { cause: 'code_already_redeemed (23505)', source: 'migration 20260809120001:257', outcome: 'already_used' },
  { cause: 'access_revoked (28000)', source: 'migration 20260809120001:234', outcome: 'revoked' },
  { cause: 'not authenticated (28000)', source: 'migration 20260809120001:228', outcome: 'not_authenticated' },
  { cause: 'invalid_code (22023) — five states FUSED on purpose', source: 'migration 20260809120001:251', outcome: 'invalid' },
  { cause: 'identity_pepper: no active version (P0002)', source: 'migration 20260806120001:94', outcome: 'service_error' },
  { cause: 'unknown user (P0002)', source: 'migration 20260809120001:230', outcome: 'service_error' },
  { cause: 'permission denied / missing function (42501, 42883)', source: 'postgres', outcome: 'service_error' },
  { cause: 'any unmapped SQLSTATE', source: 'classifyRedeemError default', outcome: 'service_error' },
]

/** نفس الجدول لمسار التجربة. */
export const TRIAL_CAUSE_MAP: ReadonlyArray<{ cause: string; source: string; outcome: TrialUiState }> = [
  { cause: 'backend absent by build', source: 'backendAvailable() === false', outcome: 'backend_unconfigured' },
  { cause: 'supabase client failed to load', source: 'getSupabase() === null', outcome: 'service_error' },
  { cause: 'no session', source: 'auth.getSession() empty', outcome: 'not_authenticated' },
  { cause: 'rpc timeout (8s)', source: 'withDeadline ⇒ TIMED_OUT', outcome: 'timeout' },
  { cause: 'network failure', source: 'looksLikeNetworkFailure(error)', outcome: 'offline' },
  { cause: 'email_not_verified (28000)', source: 'migration 20260809120001:176', outcome: 'email_not_verified' },
  { cause: 'access_revoked (28000) — PERMANENT ban', source: 'migration 20260809120001:181', outcome: 'revoked' },
  { cause: 'trial_already_used (23505)', source: 'migration 20260809120001:188', outcome: 'already_claimed' },
  { cause: 'identity_pepper missing / unknown user (P0002)', source: 'migration 20260809120001:175', outcome: 'service_error' },
  { cause: 'any unmapped SQLSTATE', source: 'classifyTrialError default', outcome: 'service_error' },
]
