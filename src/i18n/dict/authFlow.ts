// نصوص حالات المصادقة الصعبة — انقطاع الشبكة، تعذّر الوصول، الخادم لا يستجيب،
// وحالة البريد الذي قد يكون مسجّلًا من قبل.
//
// لماذا قاموس منفصل؟ `misc.ts` يحمل رسائل المصادقة القائمة (بريد/كلمة مرور غير صحيحة،
// محاولات كثيرة…) وهي تغطّي الأخطاء التي يُجيب بها الخادم. ما هنا يغطّي الحالات التي
// **لا جواب فيها من الخادم أصلًا**: لا اتصال، أو اتصال بلا رد، أو ردّ لا نعرف معناه.
//
// النبرة (§6): فصحى دافئة. المبدأ الحاكم هو الصدق قبل الطمأنينة:
//   • حين لا نعرف هل اكتملت العملية، **نقول ذلك صراحةً** ونعطي الخطوة التالية.
//   • لا لوم على المستخدم ولا على شبكته، ولا تهويل، ولا تعجّب مكدّس.
//   • حين يكون العطل من جهتنا نصرّح به بدل تحميله على المستخدم.

import type { Lang } from '@/lib/appPreferences'

export interface AuthFlowStrings {
  /** الجهاز غير متصل — نعرفها قبل إرسال أي طلب فلا ينتظر المستخدم فشلًا محتومًا. */
  offline: string
  /**
   * انتهت المهلة أثناء إنشاء الحساب. الصدق هنا حرج: قد يكون الحساب أُنشئ فعلًا على
   * الخادم وضاع الردّ في الطريق — فلا ندّعي فشلًا ولا نجاحًا، ونرشد لتسجيل الدخول أولًا.
   */
  timeoutSignUp: string
  /** انتهت المهلة أثناء تسجيل الدخول — هنا لا غموض: لا جلسة، والإعادة آمنة. */
  timeoutSignIn: string
  /** انتهت المهلة في عملية أخرى (إرسال رابط الاستعادة، تغيير كلمة المرور). */
  timeoutGeneric: string
  /** ردّ الخادم بخطأ من طرفه (5xx) — نصرّح أنّ العطل عندنا. */
  serverDown: string
  /** كلمة المرور الجديدة مماثلة للقديمة (يرفضها الخادم في مسار الاستعادة). */
  samePassword: string
  /** إنشاء الحسابات موقوف على الخادم. */
  signupDisabled: string
  /**
   * ردّ إنشاء الحساب غامض: الخادم يخفي وجود البريد حمايةً للخصوصية، فلا نستطيع الجزم
   * بأنّ الحساب أُنشئ. نصوغها صادقة في الحالتين ونعطي طريقًا للأمام بلا كشف.
   */
  emailMaybeRegistered: string
}

const ar: AuthFlowStrings = {
  offline: 'يبدو أن الجهاز غير متصل بالإنترنت. أعد المحاولة بعد عودة الاتصال.',
  timeoutSignUp:
    'استغرق الاتصال وقتًا أطول من المعتاد، ولا نعرف إن اكتمل إنشاء الحساب. جرّب تسجيل الدخول أولًا، وإن لم ينجح فأعد إنشاء الحساب.',
  timeoutSignIn: 'استغرق الاتصال وقتًا أطول من المعتاد ولم يكتمل تسجيل الدخول. تحقّق من اتصالك وأعد المحاولة.',
  timeoutGeneric: 'استغرق الاتصال وقتًا أطول من المعتاد ولم تكتمل العملية. تحقّق من اتصالك وأعد المحاولة.',
  serverDown: 'الخادم لا يستجيب الآن، والعطل من جهتنا. أعد المحاولة بعد قليل.',
  samePassword: 'كلمة المرور الجديدة مماثلة للسابقة. اختر كلمة مرور مختلفة.',
  signupDisabled: 'إنشاء الحسابات موقوف مؤقتًا.',
  emailMaybeRegistered:
    'إن كان هذا البريد جديدًا فرسالة التأكيد في طريقها إليه. وإن كان لك حساب به من قبل فسجّل الدخول من هنا، أو استعد كلمة المرور.',
}

const en: AuthFlowStrings = {
  offline: 'Your device appears to be offline. Try again once the connection is back.',
  timeoutSignUp:
    "The connection took longer than usual, and we can't tell whether the account was created. Try signing in first; if that doesn't work, create the account again.",
  timeoutSignIn: "The connection took longer than usual and sign-in did not complete. Check your connection and try again.",
  timeoutGeneric: "The connection took longer than usual and the request did not complete. Check your connection and try again.",
  serverDown: 'The server is not responding right now, and the fault is on our side. Try again shortly.',
  samePassword: 'The new password matches your previous one. Choose a different password.',
  signupDisabled: 'New account creation is paused for now.',
  emailMaybeRegistered:
    'If this email is new, a confirmation message is on its way to it. If you already have an account with it, sign in here or reset your password.',
}

export const authFlowStrings: Record<Lang, AuthFlowStrings> = { ar, en }
