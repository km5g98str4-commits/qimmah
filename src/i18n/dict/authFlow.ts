// نصوص حالات المصادقة الصعبة — انقطاع الشبكة، تعذّر الوصول، الخادم لا يستجيب،
// وحالة البريد الذي قد يكون مسجّلًا من قبل.
//
// لماذا قاموس منفصل؟ `misc.ts` يحمل رسائل المصادقة القائمة (بريد/كلمة مرور غير صحيحة،
// محاولات كثيرة…) وهي تغطّي الأخطاء التي يُجيب بها الخادم. ما هنا يغطّي الحالات التي
// **لا جواب فيها من الخادم أصلًا**: لا اتصال، أو اتصال بلا رد، أو ردّ لا نعرف معناه.
//
// النبرة (§6): **عامية بيضاء** — سعودية/خليجية دافئة يفهمها كل عربي، لا عامية
// غميقة ولا فصحى كتب. والإنجليزية غير رسمية ودودة. المبدأ الحاكم هو الصدق قبل
// الطمأنينة:
//   • حين لا نعرف هل اكتملت العملية، **نقولها صريحة** ونعطي الخطوة التالية.
//   • لا لوم على المستخدم ولا على شبكته، ولا تهويل، ولا تعجّب مكدّس.
//   • حين يكون العطل من جهتنا نصرّح به بدل ما نحمّله على المستخدم.
//   • اللغة المتحفّظة للمُستنتَج باقية («يبدو» · «ما نعرف») — الانقلاب في النبرة
//     لا في الصدق.

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
  offline: 'يبدو ما فيه اتصال بالنت. جرّب مرة ثانية لمّا يرجع.',
  timeoutSignUp:
    'الاتصال طوّل أكثر من العادة، وما نعرف إذا الحساب انفتح ولا لا. جرّب تسجّل دخولك أول، وإذا ما ضبط افتح الحساب من جديد.',
  timeoutSignIn: 'الاتصال طوّل أكثر من العادة وما اكتمل تسجيل الدخول. شيّك على اتصالك وجرّب مرة ثانية.',
  timeoutGeneric: 'الاتصال طوّل أكثر من العادة وما اكتملت العملية. شيّك على اتصالك وجرّب مرة ثانية.',
  serverDown: 'الخادم ما يستجيب الحين، والخلل من عندنا. جرّب بعد شوي.',
  samePassword: 'كلمة المرور الجديدة نفس القديمة. اختر وحدة غيرها.',
  signupDisabled: 'فتح الحسابات موقوف مؤقتًا.',
  emailMaybeRegistered:
    'إذا هذا البريد جديد فرسالة التأكيد في طريقها له. وإذا لك حساب فيه من قبل، سجّل دخولك من هنا أو استعد كلمة المرور.',
}

const en: AuthFlowStrings = {
  offline: "Looks like you're offline. Give it another go once you're back.",
  timeoutSignUp:
    "That took longer than usual, and we can't tell if the account went through. Try signing in first — if that doesn't work, just create it again.",
  timeoutSignIn: "That took longer than usual and sign-in didn't go through. Check your connection and give it another go.",
  timeoutGeneric: "That took longer than usual and it didn't go through. Check your connection and give it another go.",
  serverDown: "Our server isn't responding right now — that one's on us. Try again in a bit.",
  samePassword: "That's the same password as before. Pick a different one.",
  signupDisabled: 'New sign-ups are paused for now.',
  emailMaybeRegistered:
    "If this email is new, a confirmation is on its way. If you already have an account with it, sign in here or reset your password.",
}

export const authFlowStrings: Record<Lang, AuthFlowStrings> = { ar, en }
