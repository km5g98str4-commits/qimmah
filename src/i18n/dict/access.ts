// نصوص بوّابة Premium ووضع المعاينة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// النبرة: عامية بيضاء (الميثاق §6). وثابت «لا لوم ولا ضغط ولا تهويل» يحكم كل
// سطر هنا تحديدًا — هذه شاشة تطلب مالًا، وأسهل ما فيها أن تنزلق إلى الضغط.
// فالصياغة تصف ما يفتحه الاشتراك، ولا تعاتب من لم يشترك ولا تخوّفه بالفوات.

import type { Lang } from '@/lib/appPreferences'

export interface AccessStrings {
  /** عنوان البوّابة — يذكر الفعل الممنوع بلغة المستخدم لا بلغة الكود. */
  gateTitle: string
  gateBody: string
  gatePrimary: string
  gateSecondary: string
  /** سطر يوضّح أن التصفّح مفتوح — فلا يظنّ أنه طُرد من الشاشة. */
  gateBrowseNote: string
  /** شارة «معاينة» على الأسطح. */
  previewBadge: string
  /** أسماء الأفعال المحجوبة — تُعرض في عنوان البوّابة. */
  actions: {
    workout: string
    nutrition: string
    progress: string
    plan: string
    recovery: string
  }
  /** كود التفعيل (§D). */
  haveCode: string
  codeTitle: string
  /**
   * [OVERNIGHT-5] كان النصّ «اكتب الكود اللي وصلك **بعد الشراء**» — ووعدٌ لا
   * يمكن الوفاء به: `redeem_access_code` تكتب `entitlement_type = 'special'`
   * بمدّة منتهية **دائمًا**، فالكود عاجز بنيويًا عن منح Premium الدائم. ومسار
   * الشراء لا يصدر كودًا أصلًا (سجلّ الشراء ← رابط دعوة ← `claim_pending_grants`).
   * فالكود وسيلة **وصول مؤقّت** — حملة أو دعوة — لا إيصال شراء.
   */
  codeBody: string
  codeLabel: string
  codePlaceholder: string
  codeSubmit: string
  codeChecking: string
  codeSuccess: string
  /** رسالة عامّة واحدة لكل كود غير مقبول — لا تكشف وجود الأكواد (§D). */
  codeInvalid: string
  codeAlreadyUsed: string
  codeExpired: string
  codeOffline: string
  /** [OVERNIGHT-5] حالتان من الخادم لم تكونا موجودتين قبل وصول العقد. */
  codeRevoked: string
  codeNeedsAccount: string
}

export const accessStrings: Record<Lang, AccessStrings> = {
  ar: {
    gateTitle: 'هذي الخطوة مع قِمّة Premium',
    gateBody: 'خطتك قدّامك وتقدر تتصفّحها كاملة. التسجيل الفعلي — تمارينك وأكلك وقياساتك — يفتح مع Premium.',
    gatePrimary: 'احصل على قِمّة Premium',
    gateSecondary: 'أكمل التصفّح',
    gateBrowseNote: 'تصفّحك ما توقّف — ارجع لأي شاشة وقت ما تبي.',
    previewBadge: 'معاينة',
    actions: {
      workout: 'تسجيل التمرين',
      nutrition: 'تسجيل الأكل',
      progress: 'تسجيل القياسات',
      plan: 'حفظ تعديل الخطة',
      recovery: 'تسجيل التعافي',
    },
    haveCode: 'عندك كود تفعيل؟',
    codeTitle: 'كود التفعيل',
    codeBody: 'اكتب كود الوصول اللي وصلك من حملة أو دعوة. الشراء من سلة يفتح حسابك بنفسه — ما يحتاج كود.',
    codeLabel: 'كود التفعيل',
    codePlaceholder: 'مثال: QIMMAH-XXXX-XXXX',
    codeSubmit: 'فعّل',
    codeChecking: 'نتحقّق من الكود…',
    codeSuccess: 'تمّ التفعيل — كل شي مفتوح لك الحين.',
    codeInvalid: 'الكود ما ضبط. تأكّد منه وجرّب مرة ثانية.',
    codeAlreadyUsed: 'هذا الكود مستخدم من قبل.',
    codeExpired: 'هذا الكود منتهي.',
    codeOffline: 'ما قدرنا نتحقّق الحين. تأكّد من النت وجرّب بعد شوي.',
    codeRevoked: 'وصولك موقوف حاليًا. راسل الدعم وبنساعدك.',
    codeNeedsAccount: 'سجّل دخولك أول عشان نربط الكود بحسابك.',
  },
  en: {
    gateTitle: 'This step comes with Qimmah Premium',
    gateBody: 'Your plan is right here and you can browse all of it. Actually logging — your workouts, food and measurements — opens with Premium.',
    gatePrimary: 'Get Qimmah Premium',
    gateSecondary: 'Keep browsing',
    gateBrowseNote: "Browsing doesn't stop — head back to any screen whenever you like.",
    previewBadge: 'Preview',
    actions: {
      workout: 'workout logging',
      nutrition: 'food logging',
      progress: 'measurement logging',
      plan: 'saving plan edits',
      recovery: 'recovery logging',
    },
    haveCode: 'Have an activation code?',
    codeTitle: 'Activation code',
    codeBody: 'Enter an access code from a campaign or invite. A Salla purchase unlocks your account on its own — no code needed.',
    codeLabel: 'Activation code',
    codePlaceholder: 'e.g. QIMMAH-XXXX-XXXX',
    codeSubmit: 'Activate',
    codeChecking: 'Checking your code…',
    codeSuccess: "You're activated — everything is open now.",
    codeInvalid: "That code didn't work. Double-check it and try again.",
    codeAlreadyUsed: 'This code has already been used.',
    codeExpired: 'This code has expired.',
    codeOffline: "We couldn't check right now. Check your connection and try again shortly.",
    codeRevoked: 'Your access is currently suspended. Contact support and we will help.',
    codeNeedsAccount: 'Sign in first so we can link the code to your account.',
  },
}
