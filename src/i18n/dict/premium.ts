// شاشة العضوية — نصوص السطح التجاري الدائم.
// [WAVE2-PREMIUM-SURFACE]
//
// ═══ الفراغ الذي تملؤه هذه الشاشة ═══
// كان مسار التفعيل يعيش في `PremiumGate` وحدها — وهي **نافذة لا تُفتح إلا
// بالاصطدام**: `blockedAction` يُضبط حين يحاول المستخدم فعلًا محجوبًا. فمن اشترى
// صكًّا من سلة ثم فتح التطبيق لا يجد أين يُدخله؛ عليه أن يتعثّر بجدارٍ أوّلًا
// ليُعرَض عليه الباب. والمشتري لا يعرف أنه يجب أن يتعثّر.
//
// ═══ حدّ هذه النصوص ═══
// **عرضٌ فقط.** لا شيء هنا يمنح وصولًا ولا يحسب انتهاءً. الحالة تُقرأ من
// `useAccessSummary` (وهي بدورها من الخادم)، والأفعال تمرّ بـ`redeem`/`beginTrial`
// اللتين تعيدان القراءة من المصدر. ولو كذب هذا الملف بالكامل لما فُتح فعل مدفوع.
//
// ⚠️ §0.1: الصيغة المعتمدة وحدها «يشمل تحديثات قِمّة — بلا اشتراك شهري».
// و«مدى الحياة» · «lifetime» · «للأبد» ممنوعة — يحرسها `test:premium-copy`.

export interface PremiumStrings {
  /** عنوان الشاشة ومدخلها في الإعدادات. */
  title: string
  subtitle: string
  settingsLink: string
  back: string

  /** ترويسة الحالة — لكل حالة سطر خبر وسطر خطوة تالية. */
  stateChecking: string
  statePremium: string
  statePremiumBody: string
  /** الصيغة المعتمدة §0.1 — لا تُصاغ ثانيةً. */
  premiumNote: string
  /** Premium دائم: نقول «بلا تاريخ انتهاء» ولا نخترع تاريخًا. */
  premiumNoExpiry: string
  stateSpecial: string
  stateSpecialBody: string
  stateTrial: string
  stateTrialBody: string
  stateTrialExpired: string
  stateTrialExpiredBody: string
  stateNoAccess: string
  stateNoAccessBody: string
  stateRevoked: string
  stateRevokedBody: string
  stateUnknown: string
  stateUnknownBody: string
  /** بلا حساب لا استحقاق — والخطوة التالية حساب لا كود. */
  stateSignedOut: string
  stateSignedOutBody: string
  signIn: string

  /** المتبقّي — يُملأ من ساعة الخادم لا من ساعة الجهاز. */
  remainingLabel: (formatted: string) => string
  endsSoon: string

  /** التجربة. */
  trialHeading: string
  trialBody: string
  trialCta: string

  /** الشراء. */
  buyHeading: string
  buyBody: string
  buyCta: string

  /** الكود. */
  codeHeading: string
  codeBody: string
  codeLabel: string
  codePlaceholder: string
  codeHint: string
  codeSubmit: string
  codeOpen: string

  retry: string
}

export const premiumStrings: Record<'ar' | 'en', PremiumStrings> = {
  ar: {
    title: 'العضوية',
    subtitle: 'حالتك الحالية، وكيف تفتح قِمّة كاملة.',
    settingsLink: 'العضوية والتفعيل',
    back: 'رجوع',

    stateChecking: 'نتحقّق من حالتك…',
    statePremium: 'عندك قِمّة Premium',
    statePremiumBody: 'كل الميزات مفتوحة لك.',
    premiumNote: 'يشمل تحديثات قِمّة — بلا اشتراك شهري',
    premiumNoExpiry: 'بلا تاريخ انتهاء',
    stateSpecial: 'عندك وصول خاص',
    stateSpecialBody: 'وصول مؤقّت — غير الشراء. تقدر تفعّل صكّ شراء أي وقت وتصير Premium.',
    stateTrial: 'تجربتك شغّالة',
    stateTrialBody: 'استمتع بقِمّة كاملة. عندك صكّ شراء؟ فعّله الحين وما تنتظر نهاية التجربة.',
    stateTrialExpired: 'انتهت تجربتك',
    stateTrialExpiredBody: 'التجربة مرّة وحدة لكل حساب. تفتح قِمّة كاملة بصكّ شراء.',
    stateNoAccess: 'قِمّة كاملة مقفلة',
    stateNoAccessBody: 'ابدأ تجربتك المجانية، أو فعّل صكّ شراء عندك.',
    stateRevoked: 'وصولك موقوف',
    stateRevokedBody: 'ما نقدر نفتح الميزات المدفوعة على هذا الحساب. راسلنا وبنوضّح لك.',
    stateUnknown: 'ما قدرنا نتحقّق الحين',
    stateUnknownBody: 'يبدو ما فيه اتصال بالخادم. جرّب مرّة ثانية.',
    stateSignedOut: 'سجّل دخولك أوّلًا',
    stateSignedOutBody: 'العضوية مربوطة بحسابك — بلا حساب ما نقدر نعرف وشو وضعك.',
    signIn: 'تسجيل الدخول',

    remainingLabel: (f) => `باقي ${f}`,
    endsSoon: 'تقارب تخلص',

    trialHeading: 'تجربة مجانية',
    trialBody: 'جرّب قِمّة كاملة ٧٢ ساعة. مرّة وحدة لكل حساب.',
    trialCta: 'ابدأ التجربة',

    buyHeading: 'قِمّة Premium',
    buyBody: 'شراء واحد يفتح قِمّة كاملة.',
    buyCta: 'اشترِ Premium',

    codeHeading: 'عندك كود؟',
    codeBody: 'صكّ الشراء اللي وصلك، أو كود وصول أعطيناك إيّاه — الصقه هنا.',
    codeLabel: 'الكود',
    codePlaceholder: 'مثال: QMH-XXXX-XXXX',
    codeHint: 'انسخ الكود والصقه كما هو. ما يفرق حروف كبيرة أو صغيرة.',
    codeSubmit: 'فعّل',
    codeOpen: 'تفعيل كود',

    retry: 'أعد المحاولة',
  },
  en: {
    title: 'Membership',
    subtitle: 'Where you stand, and how to unlock all of Qimmah.',
    settingsLink: 'Membership & activation',
    back: 'Back',

    stateChecking: 'Checking your status…',
    statePremium: 'You have Qimmah Premium',
    statePremiumBody: 'Everything is unlocked for you.',
    premiumNote: 'Includes Qimmah updates — no monthly subscription',
    premiumNoExpiry: 'No expiry date',
    stateSpecial: 'You have special access',
    stateSpecialBody: 'Temporary access — different from a purchase. You can activate a purchase code anytime to become Premium.',
    stateTrial: 'Your trial is running',
    stateTrialBody: 'Enjoy all of Qimmah. Got a purchase code? Activate it now — no need to wait for the trial to end.',
    stateTrialExpired: 'Your trial has ended',
    stateTrialExpiredBody: 'The trial is once per account. A purchase code unlocks all of Qimmah.',
    stateNoAccess: 'Full Qimmah is locked',
    stateNoAccessBody: 'Start your free trial, or activate a purchase code you already have.',
    stateRevoked: 'Your access is suspended',
    stateRevokedBody: "We can't unlock paid features on this account. Get in touch and we'll explain.",
    stateUnknown: "We couldn't check right now",
    stateUnknownBody: 'Looks like the server is unreachable. Give it another try.',
    stateSignedOut: 'Sign in first',
    stateSignedOutBody: "Membership is tied to your account — without one we can't tell where you stand.",
    signIn: 'Sign in',

    remainingLabel: (f) => `${f} left`,
    endsSoon: 'Ending soon',

    trialHeading: 'Free trial',
    trialBody: 'Try all of Qimmah for 72 hours. Once per account.',
    trialCta: 'Start trial',

    buyHeading: 'Qimmah Premium',
    buyBody: 'One purchase unlocks all of Qimmah.',
    buyCta: 'Buy Premium',

    codeHeading: 'Got a code?',
    codeBody: 'The purchase code you received, or an access code we gave you — paste it here.',
    codeLabel: 'Code',
    codePlaceholder: 'e.g. QMH-XXXX-XXXX',
    codeHint: 'Copy and paste it as-is. Upper or lower case makes no difference.',
    codeSubmit: 'Activate',
    codeOpen: 'Activate a code',

    retry: 'Try again',
  },
}
