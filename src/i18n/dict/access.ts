// نصوص بوّابة Premium ووضع المعاينة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// النبرة: عامية بيضاء (الميثاق §6). وثابت «لا لوم ولا ضغط ولا تهويل» يحكم كل
// سطر هنا تحديدًا — هذه شاشة تطلب مالًا، وأسهل ما فيها أن تنزلق إلى الضغط.
// فالصياغة تصف ما يفتحه الاشتراك، ولا تعاتب من لم يشترك ولا تخوّفه بالفوات.
//
// ═══ [SOVEREIGN-COMMERCE-001] لماذا صار هذا الملف بيت رسائل الفشل كلّها ═══
// كانت سبعة أسباب متمايزة تخرج من نصّ واحد: «ما قدرنا نتحقّق الحين. تأكّد من
// النت». ومنها **غياب الخادم في بناء المراجعة** (ليس عطلًا أصلًا)، و**نقص
// `identity_pepper`** (عطل إعداد عندنا)، و**المهلة**. فكان يُلام نتُ المستخدم
// على عطلٍ عندنا — والمستخدم الذي يُقال له «شبكتك» لا يبلّغ أحدًا.
//
// ورسائل التجربة تعيش هنا أيضًا — لا في `reveal.ts` — لأن **مصدر الحالة واحد**
// (`TrialOutcome` من طبقة الوصول)، فلو تفرّق نصّها على قاموسين لتباعد الوصفان
// لنفس الحالة. القاعدة: مَن يملك الحالة يملك نصّها.

import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'

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
  /** لافتة QA — تظهر في بناء معاينة المؤسس وحده. */
  qaTitle: string
  qaBody: string
  codeTitle: string
  /**
   * ═══ [FINAL-COPY-RC] النصّ هنا يصف عقد التفعيل V1 — ولا يجوز أن يخالفه ═══
   *
   * **تاريخٌ يُقال كي لا يُعاد:** كتب [OVERNIGHT-5] هنا «الشراء من سلة يفتح
   * حسابك بنفسه — ما يحتاج كود»، وكان **صادقًا يومها**: `redeem_access_code`
   * تكتب `entitlement_type = 'special'` بمدّة منتهية دائمًا، فالكود كان عاجزًا
   * بنيويًا عن منح Premium الدائم.
   *
   * **ثمّ نُقض ذلك ولم يُنقض النصّ.** هجرة `20260829120001_purchase_credentials`
   * أضافت `grant_purpose = 'purchase'` وفرع الشراء في `private.redeem_core`،
   * و`20260830120001_premium_authority_hardening` ثبّتت `grant_premium_from_code`
   * سلطةً واحدة. فصار الصكّ **يمنح Premium دائمًا** — بينما بقي النصّ يقول للمشتري
   * ألّا يستعمله، في `PremiumGate` وحدها: اللوحة التي يفتحها وهو ممسك بصكّه.
   *
   * ═══ العقد المفروض الآن ═══
   * سلة في V1 **قناة دفع وتسليم فقط** — لا webhook منشور ولا منح آليّ
   * (`docs/product/PURCHASE-CREDENTIAL-MODEL.md`). المشتري يستلم صكًّا فريدًا
   * **ويكتبه هنا** أو لا يحصل على شيء.
   *
   * ⛔ **ممنوع في هذا الحقل** — يحرسه `test:activation-contract`:
   * أن الشراء من سلة يفعّل الحساب تلقائيًّا · أنه لا يحتاج كودًا · أي نقل آليّ.
   */
  codeBody: string
  codeLabel: string
  /** تلميح دائم تحت الحقل — يشرح ما يُنتظر قبل أي محاولة، لا بعد فشلها. */
  codeHint: string
  codePlaceholder: string
  codeSubmit: string
  codeChecking: string
  codeSuccess: string
  /**
   * رسالة عامّة واحدة لكل كود غير مقبول (§D).
   *
   * **مدموجة عمدًا ولا تُفكَّك:** الخادم يرفع `invalid_code` واحدة لخمس حالات
   * (غير موجود · مُعطَّل · لم تبدأ نافذته · انتهت · استُنفدت مرّاته)، وتفكيكها
   * يحوّل الحقل إلى **أوراكل** يُسأل عن وجود الأكواد. ولهذا لا يوجد `codeExpired`
   * — نصٌّ يقول «هذا الكود منتهي» لا يمكن أن يكون صادقًا في الإنتاج.
   */
  codeInvalid: string
  /** «ما كتبت كودًا» ليست «كودك خاطئ» — حقيقة محلّية لا حكم على كود. */
  codeEmpty: string
  codeAlreadyUsed: string
  /** لا خادم تفعيل في هذا البناء — ليس عطلًا، ولا علاقة له بشبكة المستخدم. */
  codeBackendAbsent: string
  /** نسخة مراجعة المؤسس تحديدًا — تُسمّي نفسها بدل أن تلمّح. */
  codePreviewNoServer: string
  /** الطلب تجاوز المهلة — عابر، والإعادة معقولة. */
  codeTimeout: string
  /** عطل عندنا (بيبر مفقود · صلاحية · دالّة ناقصة · مجهول) — لا عند المستخدم. */
  codeServiceError: string
  /** **مُضيَّقة**: انقطاع شبكة حقيقي وحده. */
  codeOffline: string
  /** [OVERNIGHT-5] حالتان من الخادم لم تكونا موجودتين قبل وصول العقد. */
  codeRevoked: string
  codeNeedsAccount: string

  /**
   * ═══ التجربة (٧٢ ساعة) — نفس التصنيف ═══
   * كل رسالة فشل تقول صراحةً **إن التجربة لم تبدأ**: الفشل يُغلق ولا يُترك
   * غامضًا يظنّ منه المستخدم أن شيئًا بدأ.
   */
  trialStarting: string
  trialStarted: string
  trialNeedsAccount: string
  trialNeedsVerifiedEmail: string
  trialAlreadyUsed: string
  /** منعٌ إداري **دائم** — كان يُعرض «تأكّد من اتصالك»، فيُعاد المحاولة أبدًا. */
  trialRevoked: string
  trialBackendAbsent: string
  trialPreviewNoServer: string
  /** [RED-TEAM-FINAL] حدّ البوّابة لكل عنوان شبكة — حالة مشروعة لا عطل. */
  trialRateLimited: string
  trialTimeout: string
  trialServiceError: string
  trialOffline: string
  /** [COMMISSIONING §1] نداء بدء التجربة من داخل البوّابة — لا من التسليم وحده. */
  trialCta: string
  /** [COMMISSIONING §5] كثرة المحاولات — تهدئة لا اتّهام للكود. */
  redeemRateLimited: string
  codeNeedsVerifiedEmail: string

  /**
   * ═══ مؤشّر الوصول الحالي ═══
   * لم يكن في التطبيق سطر واحد يقول للمستخدم **ما وضعه الآن**: لا «عندك
   * Premium»، ولا عدّاد تجربة، ولا إشعار إيقاف. الحالة كانت تُقرأ للقرار
   * وتُرمى بلا عرض.
   */
  statusChecking: string
  statusPremium: string
  statusSpecial: string
  statusTrial: (remaining: string) => string
  statusTrialEndingSoon: (remaining: string) => string
  statusTrialExpired: string
  statusRevoked: string
  statusPreview: string
  statusUnknown: string
  /** صياغة المتبقّي — بأرقام اللغة، ومن ساعة الخادم لا ساعة الجهاز. */
  remainingHoursMinutes: (hours: number, minutes: number) => string
  remainingMinutes: (minutes: number) => string
  remainingLessThanAMinute: string
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
    qaTitle: 'وضع مراجعة المؤسس — تفعيل QA',
    qaBody: 'هذا الكود للمراجعة على هذا الجهاز فقط: يفتح أفعال Premium محليًّا عشان تجرّب التمرين والتغذية والقياسات. ما يمسّ أي حساب ولا خادم، ويروح لو أغلقت التبويب.',
    codeTitle: 'كود التفعيل',
    codeBody: 'اشتريت Premium من سلة؟ الصق هنا صكّ الشراء اللي وصلك بعد الشراء. وكود الوصول من حملة أو دعوة — نفس المكان.',
    codeLabel: 'كود التفعيل',
    codeHint: 'اكتب الكود كما وصلك — الشرطات والمسافات ما تفرق.',
    codePlaceholder: 'QIMMAH-XXXX-XXXX',
    codeSubmit: 'فعّل',
    codeChecking: 'نتحقّق من الكود…',
    codeSuccess: 'تمّ التفعيل — كل شي مفتوح لك الحين.',
    codeInvalid: 'الكود ما ضبط. تأكّد منه وجرّب مرة ثانية.',
    codeEmpty: 'اكتب كود التفعيل أول.',
    codeAlreadyUsed: 'هذا الكود مستخدم من قبل.',
    codeBackendAbsent: 'خدمة التفعيل مو موصولة في هذي النسخة، فما نقدر نتحقّق من كودك. يشتغل في النسخة الحيّة.',
    codePreviewNoServer: 'هذي نسخة مراجعة بلا خادم، فالتفعيل ما يشتغل فيها. كودك ينفع في النسخة الحيّة.',
    codeTimeout: 'الطلب طوّل وما وصلنا ردّ، وما تفعّل شي. جرّب مرة ثانية.',
    codeServiceError: 'فيه خلل عندنا — مو عندك — وما تفعّل شي. جرّب بعد شوي، وإذا تكرّر راسلنا.',
    codeOffline: 'يبدو ما فيه اتصال بالنت. تأكّد من اتصالك وجرّب مرة ثانية.',
    codeRevoked: 'وصولك موقوف حاليًا. راسل الدعم وبنساعدك.',
    codeNeedsAccount: 'سجّل دخولك أول عشان نربط الكود بحسابك.',

    trialStarting: 'نجهّز تجربتك…',
    trialStarted: 'تجربتك بدأت — ٧٢ ساعة كاملة.',
    trialNeedsAccount: 'التجربة تحتاج حساب موثَّق. أنشئ حسابك أو سجّل دخولك.',
    trialNeedsVerifiedEmail: 'أكّد بريدك أول، وبعدها تبدأ تجربتك.',
    trialAlreadyUsed: 'تجربتك استُخدمت من قبل على هذا الحساب.',
    trialRevoked: 'وصولك موقوف حاليًا، فما نقدر نبدأ تجربة. راسل الدعم وبنساعدك.',
    trialBackendAbsent: 'خدمة التجربة مو موصولة في هذي النسخة، وما بدأت تجربتك. تشتغل في النسخة الحيّة.',
    trialPreviewNoServer: 'هذي نسخة مراجعة بلا خادم، فالتجربة ما تبدأ فيها. تصفّح خطتك كاملة، والتجربة تشتغل في النسخة الحيّة.',
    trialRateLimited: 'محاولات كثيرة من نفس الشبكة في وقت قصير. خذ لك دقايق وجرّب بعدها.',
    trialTimeout: 'الطلب طوّل وما وصلنا ردّ، وما بدأت تجربتك. جرّب مرة ثانية.',
    trialServiceError: 'فيه خلل عندنا — مو عندك — وما بدأت تجربتك. جرّب بعد شوي.',
    trialOffline: 'يبدو ما فيه اتصال بالنت، وما بدأت تجربتك. تأكّد من اتصالك وجرّب مرة ثانية.',
    trialCta: 'جرّب Premium ٧٢ ساعة',
    redeemRateLimited: 'حاولت كثير في وقت قصير. خذ لك دقايق وجرّب بعدها.',
    codeNeedsVerifiedEmail: 'كودك تمام — بس لازم تأكّد بريدك أول. افتح رسالة التأكيد وبعدها ارجع جرّب.',

    statusChecking: 'نتحقّق من وصولك…',
    statusPremium: 'قِمّة Premium مفعّل',
    statusSpecial: 'وصولك مفتوح',
    statusTrial: (remaining) => `تجربتك شغّالة — باقي ${remaining}`,
    statusTrialEndingSoon: (remaining) => `تجربتك تقارب تخلص — باقي ${remaining}`,
    statusTrialExpired: 'انتهت تجربتك. التصفّح مفتوح، والتسجيل يفتح مع Premium.',
    statusRevoked: 'وصولك موقوف حاليًا. راسل الدعم وبنساعدك.',
    statusPreview: 'وضع المعاينة — التصفّح مفتوح، والتسجيل يفتح مع Premium.',
    statusUnknown: 'ما قدرنا نتحقّق من وصولك الحين.',
    remainingHoursMinutes: (hours, minutes) =>
      `${formatNumber(hours, 'ar')} ساعة و${formatNumber(minutes, 'ar')} دقيقة`,
    remainingMinutes: (minutes) => `${formatNumber(minutes, 'ar')} دقيقة`,
    remainingLessThanAMinute: 'أقل من دقيقة',
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
    qaTitle: 'Founder review mode — QA activation',
    qaBody: 'Review-only code for this device: it unlocks Premium actions locally so you can test workouts, nutrition and measurements. It touches no account or server, and clears when you close the tab.',
    codeTitle: 'Activation code',
    codeBody: 'Bought Premium through Salla? Paste the purchase code you received after your purchase here. An access code from a campaign or invite goes in the same place.',
    codeLabel: 'Activation code',
    codeHint: 'Type it exactly as you received it — dashes and spaces are fine.',
    codePlaceholder: 'QIMMAH-XXXX-XXXX',
    codeSubmit: 'Activate',
    codeChecking: 'Checking your code…',
    codeSuccess: "You're activated — everything is open now.",
    codeInvalid: "That code didn't work. Double-check it and try again.",
    codeEmpty: 'Type your activation code first.',
    codeAlreadyUsed: 'This code has already been used.',
    codeBackendAbsent: "Activation isn't connected in this build, so we can't check your code. It works in the live version.",
    codePreviewNoServer: "This is a review build with no server, so activation doesn't run here. Your code works in the live version.",
    codeTimeout: 'The request took too long and we got no answer — nothing was activated. Give it another try.',
    codeServiceError: 'Something broke on our side — not yours — and nothing was activated. Try again shortly, and tell us if it keeps happening.',
    codeOffline: "Looks like there's no internet connection. Check it and try again.",
    codeRevoked: 'Your access is currently suspended. Contact support and we will help.',
    codeNeedsAccount: 'Sign in first so we can link the code to your account.',

    trialStarting: 'Starting your trial…',
    trialStarted: 'Your trial has started — a full 72 hours.',
    trialNeedsAccount: 'The trial needs a verified account. Create one or sign in.',
    trialNeedsVerifiedEmail: 'Confirm your email first, then your trial can start.',
    trialAlreadyUsed: 'This account has already used its trial.',
    trialRevoked: "Your access is currently suspended, so a trial can't start. Contact support and we will help.",
    trialBackendAbsent: "Trials aren't connected in this build, so nothing started. They work in the live version.",
    trialPreviewNoServer: "This is a review build with no server, so trials don't start here. Browse your whole plan — trials work in the live version.",
    trialRateLimited: 'A lot of tries from the same network in a short window. Give it a few minutes and try again.',
    trialTimeout: 'The request took too long and we got no answer — your trial did not start. Give it another try.',
    trialServiceError: 'Something broke on our side — not yours — and your trial did not start. Try again shortly.',
    trialOffline: "Looks like there's no internet connection, so your trial did not start. Check it and try again.",
    trialCta: 'Try Premium for 72 hours',
    redeemRateLimited: "That's a lot of tries in a short window. Give it a few minutes and try again.",
    codeNeedsVerifiedEmail: 'Your code is fine — you just need to confirm your email first. Open the confirmation message, then try again.',

    statusChecking: 'Checking your access…',
    statusPremium: 'Qimmah Premium is active',
    statusSpecial: 'Your access is open',
    statusTrial: (remaining) => `Trial running — ${remaining} left`,
    statusTrialEndingSoon: (remaining) => `Trial almost over — ${remaining} left`,
    statusTrialExpired: 'Your trial has ended. Browsing stays open; logging comes with Premium.',
    statusRevoked: 'Your access is currently suspended. Contact support and we will help.',
    statusPreview: 'Preview mode — browsing is open; logging comes with Premium.',
    statusUnknown: "We couldn't check your access right now.",
    remainingHoursMinutes: (hours, minutes) =>
      `${formatNumber(hours, 'en')}h ${formatNumber(minutes, 'en')}m`,
    remainingMinutes: (minutes) => `${formatNumber(minutes, 'en')}m`,
    remainingLessThanAMinute: 'less than a minute',
  },
}
