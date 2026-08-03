// إثبات إغلاق فجوات الحساب (حارة B) — سلوكي لا شكلي.
//
// يثبت أربع سلوكيات لا تُرى في الكود بالنظر:
//   ١) لا تجميد: كل نداء مصادقة ينتهي بنتيجة — مقطوع الشبكة، أو معلّق بلا ردّ، أو رامٍ
//      لاستثناء ليس من نوع AuthError (وهو ما يفعله supabase-js فعلًا: يرمي ما ليس AuthError).
//   ٢) لا تسريب: كل رسالة معروضة عضو في قواميسنا — نصّ الخادم الخام لا يصل المستخدم أبدًا،
//      ولا حتى في الحالة المجهولة، وحتى لو حمل تفاصيل قاعدة بيانات.
//   ٣) انقطاع الشبكة يُلتقط بأي لغة متصفّح — خصوصًا «Load failed» في WKWebView (iOS).
//   ٤) ردّ إنشاء الحساب المموّه لبريد مسجّل لا يُقرأ نجاحًا.
// ثم يحرس التوصيل: أنّ authContext/LoginView يستخدمان هذه الطبقة فعلًا (لا نسخة ميتة).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  AUTH_CALL_TIMEOUT_MS,
  authFailureMessage,
  classifyAuthFailure,
  describeAuthError,
  guardedAuthCall,
  isAmbiguousSignup,
} from '@/lib/authErrors'
import type { AuthFailureKind, AuthOp } from '@/lib/authErrors'
import { miscStrings } from '@/i18n/dict/misc'
import { authFlowStrings } from '@/i18n/dict/authFlow'
import type { Lang } from '@/lib/appPreferences'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.log(`  ✗ ${label}`)
  }
}

const LANGS: Lang[] = ['ar', 'en']

/** كل نصّ يجوز أن يراه المستخدم في عطل مصادقة — لا شيء خارج هذه المجموعة. */
function allowedMessages(lang: Lang): Set<string> {
  const m = miscStrings[lang]
  return new Set<string>([
    m.authInvalidCredentials,
    m.authAlreadyRegistered,
    m.authEmailNotConfirmed,
    m.authWeakPassword,
    m.authInvalidEmail,
    m.authRateLimit,
    m.authNetwork,
    m.authGeneric,
    m.authCloudDisabled,
    ...Object.values(authFlowStrings[lang]),
  ])
}

// ────────────────────────────────────────────────────────────────────────────
console.log('\n(١) لا تجميد — كل نداء ينتهي بنتيجة')

// جهاز مقطوع: لا يُرسَل الطلب إطلاقًا (لا انتظار لفشل محتوم) والرسالة فورية.
let calls = 0
const offline = await guardedAuthCall('signIn', 'ar', async () => {
  calls++
  return { error: null }
}, { online: false })
check('مقطوع الشبكة: لم يُستدعَ الطلب إطلاقًا', calls === 0)
check('مقطوع الشبكة: نتيجة عطل مصنّفة offline', offline.ok === false && offline.kind === 'offline')
check(
  'مقطوع الشبكة: الرسالة هي نصّ الانقطاع من القاموس',
  offline.ok === false && offline.error === authFlowStrings.ar.offline,
)

// طلب معلّق بلا ردّ (شبكة نصف مفتوحة على الجوال) — أخطر حالة: زرّ يدور إلى الأبد.
const hangStart = Date.now()
const hung = await guardedAuthCall('signIn', 'ar', () => new Promise<never>(() => {}), {
  online: true,
  timeoutMs: 40,
})
check('طلب معلّق: انتهى بنتيجة ولم يعلّق الشاشة', hung.ok === false && hung.kind === 'timeout')
check('طلب معلّق: انتهى في حدود المهلة المضبوطة', Date.now() - hangStart < 2000)
check('المهلة الافتراضية سخيّة (٢٠ ثانية) فلا تقطع اتصالًا بطيئًا سليمًا', AUTH_CALL_TIMEOUT_MS === 20_000)

// رسالة مهلة إنشاء الحساب تختلف صراحةً: لا تدّعي فشلًا ولا نجاحًا (قد يكون الحساب أُنشئ).
const timeoutSignUp = await guardedAuthCall('signUp', 'ar', () => new Promise<never>(() => {}), {
  online: true,
  timeoutMs: 20,
})
check(
  'مهلة إنشاء الحساب: رسالة الغموض الصادقة لا رسالة الدخول',
  timeoutSignUp.ok === false && timeoutSignUp.error === authFlowStrings.ar.timeoutSignUp,
)
check(
  'رسالة مهلة إنشاء الحساب تعترف بعدم معرفة النتيجة (تختلف عن رسالة الدخول)',
  authFlowStrings.ar.timeoutSignUp !== authFlowStrings.ar.timeoutSignIn &&
    authFlowStrings.en.timeoutSignUp !== authFlowStrings.en.timeoutSignIn,
)
const timeoutReset = await guardedAuthCall('resetPassword', 'en', () => new Promise<never>(() => {}), {
  online: true,
  timeoutMs: 20,
})
check(
  'مهلة إرسال رابط الاستعادة: الرسالة العامة',
  timeoutReset.ok === false && timeoutReset.error === authFlowStrings.en.timeoutGeneric,
)

// استثناء مرمي: supabase-js يرمي كل ما ليس AuthError (مثال حقيقي: تخزين مقفل في
// التصفّح الخاص يُفشل حفظ code-verifier قبل أن يبدأ الطلب).
const quota = new Error('The quota has been exceeded.')
quota.name = 'QuotaExceededError'
const thrown = await guardedAuthCall('signUp', 'ar', async () => {
  throw quota
}, { online: true })
check('استثناء مرمي: عاد نتيجةً لا وعدًا مرفوضًا', thrown.ok === false)
check(
  'استثناء مرمي: رسالة عامّة من القاموس لا نصّ الاستثناء',
  thrown.ok === false && thrown.error === miscStrings.ar.authGeneric,
)

// النجاح يمرّ كما هو (الحارس لا يفسّر المحتوى).
const success = await guardedAuthCall('signIn', 'ar', async () => ({ error: null, data: { ok: 1 } }), {
  online: true,
})
check('النجاح يعود كما هو للمستدعي', success.ok === true && success.value.data.ok === 1)

// وعد مرفوض بعد انتهاء المهلة لا يجوز أن يصير UnhandledRejection يُسقط العملية.
let unhandled = 0
const onUnhandled = () => {
  unhandled++
}
process.on('unhandledRejection', onUnhandled)
await guardedAuthCall(
  'signIn',
  'ar',
  () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('late failure')), 30)),
  { online: true, timeoutMs: 10 },
)
await new Promise((r) => setTimeout(r, 120))
process.off('unhandledRejection', onUnhandled)
check('رفض متأخّر بعد المهلة لا يصير UnhandledRejection', unhandled === 0)

// ────────────────────────────────────────────────────────────────────────────
console.log('\n(٢) لا تسريب — نصّ الخادم الخام لا يصل المستخدم')

/** أخطاء واقعية من GoTrue/المتصفّح كما تصل فعلًا (رمز + حالة + نصّ إنجليزي خام). */
const serverErrors: { label: string; error: unknown; expect: AuthFailureKind }[] = [
  { label: 'WKWebView/Safari: انقطاع الشبكة «Load failed»', error: { message: 'Load failed', status: 0 }, expect: 'network' },
  { label: 'Chrome: «Failed to fetch»', error: { message: 'Failed to fetch', status: 0 }, expect: 'network' },
  {
    label: 'Firefox: «NetworkError when attempting to fetch resource.»',
    error: { message: 'NetworkError when attempting to fetch resource.', status: 0 },
    expect: 'network',
  },
  {
    label: 'بيانات دخول خاطئة',
    error: { message: 'Invalid login credentials', status: 400, code: 'invalid_credentials' },
    expect: 'invalidCredentials',
  },
  {
    label: 'بريد مسجّل من قبل (user_already_exists)',
    error: { message: 'User already registered', status: 422, code: 'user_already_exists' },
    expect: 'alreadyRegistered',
  },
  {
    label: 'بريد مسجّل من قبل (email_exists)',
    error: { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' },
    expect: 'alreadyRegistered',
  },
  {
    label: 'بريد غير مؤكَّد',
    error: { message: 'Email not confirmed', status: 400, code: 'email_not_confirmed' },
    expect: 'emailNotConfirmed',
  },
  {
    label: 'كلمة مرور ضعيفة (رفض الخادم)',
    error: { message: 'Password should be at least 6 characters', status: 422, code: 'weak_password' },
    expect: 'weakPassword',
  },
  {
    label: 'كلمة المرور الجديدة مماثلة للقديمة (مسار الاستعادة)',
    error: { message: 'New password should be different from the old password.', status: 422, code: 'same_password' },
    expect: 'samePassword',
  },
  {
    label: 'بريد غير صالح',
    error: { message: 'Unable to validate email address: invalid format', status: 400, code: 'validation_failed' },
    expect: 'invalidEmail',
  },
  {
    label: 'حدّ المحاولات',
    error: { message: 'Email rate limit exceeded', status: 429, code: 'over_email_send_rate_limit' },
    expect: 'rateLimit',
  },
  { label: 'عطل الخادم (5xx)', error: { message: 'Internal Server Error', status: 500 }, expect: 'server' },
  {
    label: 'إنشاء الحسابات موقوف',
    error: { message: 'Signups not allowed for this instance', status: 422, code: 'signup_disabled' },
    expect: 'signupDisabled',
  },
  {
    label: 'ردّ مجهول يحمل تفاصيل قاعدة بيانات',
    error: { message: '{"hint":"relation public.profiles does not exist","details":"pgrst"}', status: 400 },
    expect: 'unknown',
  },
  { label: 'استثناء جافاسكربت عادي', error: new Error('localStorage is not available'), expect: 'unknown' },
]

for (const item of serverErrors) {
  check(`تصنيف: ${item.label} → ${item.expect}`, classifyAuthFailure(item.error) === item.expect)
}

for (const lang of LANGS) {
  const allowed = allowedMessages(lang)
  let leaks = 0
  let latin = 0
  for (const item of serverErrors) {
    for (const op of ['signUp', 'signIn', 'resetPassword', 'updatePassword'] as AuthOp[]) {
      const shown = describeAuthError(item.error, lang, op)
      if (!allowed.has(shown)) leaks++
      if (lang === 'ar' && /[A-Za-z]/.test(shown)) latin++
    }
  }
  check(`[${lang}] كل رسالة معروضة عضو في القواميس (لا نصّ خادم خام)`, leaks === 0)
  if (lang === 'ar') check('[ar] لا حرف لاتيني واحد في أي رسالة عربية معروضة', latin === 0)
}

// مطلب الرؤية: «البريد مسجّل» يجب أن يتميّز عن «كلمة مرور خاطئة» — لا رسالة واحدة للحالتين.
for (const lang of LANGS) {
  check(
    `[${lang}] رسالة «البريد مسجّل» تختلف عن رسالة «بيانات دخول خاطئة»`,
    miscStrings[lang].authAlreadyRegistered !== miscStrings[lang].authInvalidCredentials,
  )
}

// التصنيف لا يرمي على أي مدخل مهما كان شكله.
const weird: unknown[] = [null, undefined, 'boom', 42, [], { code: 42 }, { status: '400' }, new Date()]
let threw = 0
for (const w of weird) {
  try {
    const kind = classifyAuthFailure(w)
    if (!allowedMessages('ar').has(authFailureMessage(kind, 'ar', 'signIn'))) threw++
  } catch {
    threw++
  }
}
check('التصنيف لا يرمي ولا يسرّب على مدخلات شاذّة (null/رقم/مصفوفة/…)', threw === 0)

// القاموس كامل في اللغتين (لا نصّ ناقص يظهر فراغًا للمستخدم).
for (const lang of LANGS) {
  const values = Object.values(authFlowStrings[lang])
  check(
    `[${lang}] قاموس حالات المصادقة كامل بلا نصّ فارغ`,
    values.length === Object.keys(authFlowStrings.ar).length && values.every((v) => typeof v === 'string' && v.trim().length > 0),
  )
}
check(
  'العربية والإنجليزية بنفس المفاتيح تمامًا',
  Object.keys(authFlowStrings.ar).sort().join(',') === Object.keys(authFlowStrings.en).sort().join(','),
)
check(
  'نبرة §6: لا تعجّب مكدّس في أي نصّ جديد',
  [...Object.values(authFlowStrings.ar), ...Object.values(authFlowStrings.en)].every((v) => !v.includes('!!') && !v.includes('!')),
)

// ────────────────────────────────────────────────────────────────────────────
console.log('\n(٣) ردّ إنشاء الحساب المموّه لا يُقرأ نجاحًا')

// حين يكون تأكيد البريد مفعّلًا، GoTrue يُرجع لبريد موجود مستخدمًا مموّهًا بلا جلسة
// و identities فارغة — بلا أي خطأ. هذا ما كان يُقرأ «فتحنا حسابك».
check(
  'بريد مسجّل (مستخدم مموّه: identities فارغة، بلا جلسة) → غامض',
  isAmbiguousSignup({ user: { id: 'x', identities: [] }, session: null }) === true,
)
check(
  'حساب جديد فعلًا (identities فيها هوية) → غير غامض',
  isAmbiguousSignup({ user: { id: 'x', identities: [{ provider: 'email' }] }, session: null }) === false,
)
check(
  'تسجيل بجلسة فورية (تأكيد البريد مطفأ) → غير غامض',
  isAmbiguousSignup({ user: { id: 'x', identities: [] }, session: { access_token: 't' } }) === false,
)
check(
  'خادم لا يُرجع identities إطلاقًا → غير غامض (لا إنذار كاذب)',
  isAmbiguousSignup({ user: { id: 'x' }, session: null }) === false,
)
check('ردّ بلا مستخدم → غير غامض', isAmbiguousSignup({ user: null, session: null }) === false)
check('مدخل غير كائن → غير غامض', isAmbiguousSignup(null) === false && isAmbiguousSignup('x') === false)

// ────────────────────────────────────────────────────────────────────────────
console.log('\n(٤) حرس التوصيل — الطبقة مستخدَمة فعلًا لا نسخة ميتة')

const root = resolve(process.cwd())
const authCtx = readFileSync(resolve(root, 'src/lib/authContext.tsx'), 'utf8')
const loginView = readFileSync(resolve(root, 'src/views/LoginView.tsx'), 'utf8')

for (const op of ['signUp', 'signIn', 'resetPassword', 'updatePassword', 'resendConfirmation']) {
  check(`authContext: نداء ${op} يمرّ عبر guardedAuthCall`, authCtx.includes(`guardedAuthCall('${op}'`))
}
check(
  'authContext: لم يبقَ تمرير error.message للترجمة (الطريق القديم للتسريب)',
  !authCtx.includes('localizedAuthError(error.message)'),
)
check('authContext: لم يبقَ إرجاع نصّ الخادم عند عدم المطابقة', !authCtx.includes('return message ||'))
check('authContext: علم الردّ الغامض معلن ومُملأ', authCtx.includes('ambiguousExistingAccount: isAmbiguousSignup(data)'))
check('LoginView: الزرّ يُصفَّر في finally (لا دوران أبدي)', /finally\s*\{\s*setBusy\(false\)/.test(loginView))
check('LoginView: الحالة الغامضة تُعرض بنصّها الصادق لا برسالة «فتحنا حسابك»', loginView.includes('af.emailMaybeRegistered'))
// [CTO-71] البند ١ — كان هذا الفحص يقارن ترتيب النصّ الغامض بنداء
// `track('signup_succeeded')`. حُذفت طبقة التحليلات فاختفى النداء، و`indexOf`
// يعيد −١ فيسقط الفحص على تغيّر **لا علاقة له بمقصده**. المقصد نفسه صار أقوى
// وأسهل إثباتًا: لا إشارة «نجاح تسجيل» في الشاشة **إطلاقًا**، لا في الحالة
// الغامضة ولا في غيرها. يُشدّ لا يُحذف.
check(
  'LoginView: لا إشارة «نجاح تسجيل» في الشاشة إطلاقًا (فبالأولى في الحالة الغامضة)',
  !/signup_succeeded/.test(loginView),
)
check(
  'LoginView: الحالة الغامضة ما زالت تُعرض (الفحص أعلاه ليس على شاشة فارغة)',
  loginView.indexOf('af.emailMaybeRegistered') > 0,
)

// بقاء الجلسة (بند الرؤية ٥): العميل يحفظها ويحدّثها تلقائيًا بمفتاح ثابت.
const client = readFileSync(resolve(root, 'src/lib/supabaseClient.ts'), 'utf8')
check('بقاء الجلسة: persistSession مفعّل', /persistSession:\s*true/.test(client))
check('بقاء الجلسة: تحديث الرمز تلقائي', /autoRefreshToken:\s*true/.test(client))
check("بقاء الجلسة: مفتاح تخزين ثابت", client.includes("storageKey: 'qimmah:supabase-auth:v1'"))

console.log(`\nSignup-completion proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
