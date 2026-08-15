// ============================================================================
// قوالب بريد المعاملات — عربي وإنجليزي، بنية واحدة لكل رسالة.
// ============================================================================
// كل قالب يُعلَن كـ«مستند» (`subject` · `preheader` · `blocks` · `footer`)،
// ومنه يشتقّ `render.mjs` نسختَي HTML والنصّ الصِّرف. لا HTML مكتوب هنا.
//
// ─────────────────────────────────────────────────────────────────────────────
// **الحقيقة البنيوية التي تحكم كل ما تحته: الكود يُخزَّن مبصومًا لا نصًّا.**
//
//   `admin_create_access_code` تحفظ `private.hash_identity(upper(btrim(code)))`
//   في `access_codes.code_hash`. والنصّ الصريح **لا يوجد في القاعدة إطلاقًا**؛
//   وجوده الوحيد هو في ذاكرة العملية التي ولّدته، وللحظة واحدة.
//
//   يترتّب على ذلك ثلاثة أحكام لا مفرّ منها، وهي تصميم القوالب كلّه:
//
//   ① **رسالة الكود لا تُطابَر (queue) ولا تُعاد.** لا يمكن لأي طابور أن يعيد
//      إرسال الكود لأن الطابور لا يملكه ولا يحقّ له أن يملكه. لذلك القالب
//      موسوم `carriesSecret: true`، ويرفض الطابور استقباله بنيويًا
//      (`outbox.mjs`). الإرسال يتمّ **بالتمرير المباشر** لحظة التوليد.
//
//   ② **«أعد إرسال كودي» طلبٌ مستحيل صادقًا.** فالرسالة تقولها صراحةً:
//      نحفظ بصمته لا نصّه، وإن ضاع نُصدر كودًا جديدًا. الصدق هنا ليس تجميلًا
//      — البديل هو وعدٌ لا يمكن الوفاء به (الميثاق §5).
//
//   ③ **شراء Premium لا يُسلَّم بكود إطلاقًا.** `redeem_access_code` تكتب
//      `entitlement_type = 'special'` وانتهاءً موقوتًا **دائمًا** — فالكود
//      عاجز عن منح Premium الدائمة بنيويًا. رسالة شراء تحمل كودًا تكون قد
//      وعدت بما لا يملكه الكود. مسار الشراء هو ما تصفه وثيقة المعمار
//      (رحلة ١): سجلّ الشراء بالبصمة ← رابط دعوة ← المستخدم يضع كلمة مروره
//      بنفسه ← `claim_pending_grants()` تطابق البريد فتفتح Premium.
//
// ─────────────────────────────────────────────────────────────────────────────
// ما لا يظهر في أي قالب، وكلٌّ منها ممنوع بحارس مُنفَّذ:
//   • كلمة مرور — مولَّدة أو مقترحة أو مطلوبة. حظر مطلق (§4.6 من وثيقة المعمار).
//   • «مدى الحياة» · "lifetime" · «كل التحديثات الحالية والمستقبلية» (§0.1).
//   • أي ادّعاء اشتراك متجدّد أو خصم دوري — لا وجود لواحد في النظام.
//   • **رقم سعر مكتوب.** سلة هي من تعرض السعر وتُصدر الفاتورة. الرمز
//     `{{orderAmount}}` محجوز ولا يُستعمل اليوم؛ إن استُعمل يومًا فقيمته تُقرأ
//     من `data.amounts.total` في حدث سلة، لا من ثابت في المستودع.
//
// النبرة: عامية بيضاء في الجسد، وفصحى في الكتلة القانونية وحدها — وهي مفصولة
// بصريًا (خلفية وإطار) فتُعلن نفسها ولا تندسّ في نبرة الرسالة (الميثاق §6).
// ============================================================================

import { APPROVED_PREMIUM_LINE, tokensIn } from './render.mjs'

const BRAND = { ar: 'قِمّة', en: 'Qimmah' }

const FOOTER = {
  ar: 'قِمّة — تطبيقك الشخصي للتمرين والتغذية. وصلتك هذه الرسالة لأن هذا البريد استُخدم في قِمّة.',
  en: 'Qimmah — your personal training and nutrition app. You got this because this address was used with Qimmah.',
}

// ── ١) شراء Premium — بلا كود، وبرابط يضع المستخدم كلمة مروره بنفسه ────────
const premiumPurchase = {
  ar: {
    subject: 'وصلنا طلبك — قِمّة Premium',
    preheader: 'باقي خطوة وحدة: فعّل حسابك بنفس هذا البريد.',
    blocks: [
      { type: 'heading', text: 'شكرًا لك — طلبك وصل' },
      { type: 'lead', text: 'قِمّة Premium صارت مربوطة ببريدك. باقي خطوة وحدة وتفتح لك.' },
      { type: 'facts', rows: [['رقم الطلب', '{{orderRef}}'], ['البريد المرتبط', '{{recipientEmail}}']] },
      { type: 'note', text: `قِمّة Premium — ${APPROVED_PREMIUM_LINE.ar}` },
      { type: 'text', text: 'كيف تفتحها:' },
      { type: 'steps', items: [
        'افتح رابط التفعيل تحت، وحطّ كلمة مرور من عندك.',
        'سجّل دخولك بنفس البريد اللي فوق.',
        'قِمّة Premium تفتح لك على طول.',
      ] },
      { type: 'button', label: 'فعّل حسابك', href: '{{activationUrl}}' },
      { type: 'note', text: 'الرابط لك وحدك — لا تشاركه مع أحد.' },
      { type: 'note', text: 'ما نرسل لك كلمة مرور ولا نطلبها منك أبدًا. أنت اللي تختارها بنفسك.' },
      { type: 'text', text: 'وإذا عندك حساب من قبل بنفس البريد، بس سجّل دخول — بتلقاها مفتوحة بلا أي خطوة زيادة.' },
      { type: 'divider' },
      { type: 'text', text: 'أي شي ما ضبط؟ راسلنا على {{supportEmail}} واذكر رقم طلبك.' },
      { type: 'legal', title: 'ملاحظة قانونية', lines: [
        'هذه رسالة معاملات متعلّقة بطلبك رقم {{orderRef}}، وليست رسالة تسويقية.',
        '«قِمّة Premium» عملية شراء لمرّة واحدة، ولا يترتّب عليها تجديد تلقائي ولا خصم دوري ولا حفظ لأي وسيلة دفع لدينا.',
        'ترتبط المنحة بعنوان البريد المذكور أعلاه. وفي حال حذف الحساب يمكن استعادتها بإنشاء حساب جديد بالبريد نفسه.',
        'تُصدر منصّة سلة فاتورة عملية الشراء، وتُعالَج بياناتك وفق سياسة الخصوصية المنشورة.',
      ] },
    ],
  },
  en: {
    subject: 'We got your order — Qimmah Premium',
    preheader: 'One step left: activate with this same email address.',
    blocks: [
      { type: 'heading', text: 'Thank you — your order is in' },
      { type: 'lead', text: 'Qimmah Premium is tied to your email. One step and it opens up.' },
      { type: 'facts', rows: [['Order', '{{orderRef}}'], ['Linked email', '{{recipientEmail}}']] },
      { type: 'note', text: `Qimmah Premium — ${APPROVED_PREMIUM_LINE.en}` },
      { type: 'text', text: 'How to open it:' },
      { type: 'steps', items: [
        'Open the activation link below and set a password of your own.',
        'Sign in with the same email listed above.',
        'Qimmah Premium unlocks right away.',
      ] },
      { type: 'button', label: 'Activate your account', href: '{{activationUrl}}' },
      { type: 'note', text: 'This link is just for you — please don’t share it.' },
      { type: 'note', text: 'We never send you a password and never ask for one. You choose it yourself.' },
      { type: 'text', text: 'Already have an account on this same email? Just sign in — it will already be open, no extra step.' },
      { type: 'divider' },
      { type: 'text', text: 'Something not working? Email us at {{supportEmail}} and mention your order number.' },
      { type: 'legal', title: 'Legal note', lines: [
        'This is a transactional message about order {{orderRef}}. It is not marketing.',
        'Qimmah Premium is a one-time purchase. There is no automatic renewal, no recurring charge, and no payment method stored by us.',
        'The grant is bound to the email address above. If the account is deleted, it can be restored by creating a new account with the same address.',
        'Salla issues the purchase invoice. Your data is processed according to the published privacy policy.',
      ] },
    ],
  },
}

// ── ٢) كود وصول — القالب الوحيد الحامل لسرّ، ولذلك لا يدخل طابورًا أبدًا ────
const accessCode = {
  ar: {
    subject: 'كود التفعيل — قِمّة',
    preheader: 'كودك جاهز، ومدّته تبدأ من لحظة ما تفعّله.',
    blocks: [
      { type: 'heading', text: 'هذا كودك' },
      { type: 'code', label: 'كود التفعيل', value: '{{code}}' },
      { type: 'text', text: 'الكود يفتح لك قِمّة كاملة لمدّة {{durationDays}}، تبدأ من لحظة ما تفعّله — مو من الحين.' },
      { type: 'text', text: 'كيف تستخدمه:' },
      { type: 'steps', items: [
        'افتح قِمّة.',
        'اضغط «عندك كود تفعيل؟».',
        'الصق الكود واضغط «فعّل».',
      ] },
      { type: 'note', text: 'احتفظ بهذي الرسالة. إحنا نحفظ بصمة الكود لا نصّه، فما نقدر نرسله لك مرّة ثانية. لو ضاع منك راسلنا ونصدر لك كود جديد.' },
      { type: 'note', text: 'الكود لك وحدك. لا تنشره.' },
      { type: 'divider' },
      { type: 'text', text: 'أي سؤال؟ راسلنا على {{supportEmail}}.' },
      { type: 'legal', title: 'ملاحظة قانونية', lines: [
        'كود الوصول منحة مؤقّتة قابلة للإلغاء، ولا يترتّب عليه تجديد تلقائي ولا خصم دوري.',
        'يُستخدم الكود مرّة واحدة لكل هوية بريد، وتُحتسب مدّته من تاريخ التفعيل بتوقيت الخادم.',
        'لا تتضمّن هذه الرسالة كلمة مرور، ولن يطلب منك فريق قِمّة كلمة مرورك في أي حال.',
      ] },
    ],
  },
  en: {
    subject: 'Your activation code — Qimmah',
    preheader: 'Your code is ready. The clock starts when you redeem it.',
    blocks: [
      { type: 'heading', text: 'Here is your code' },
      { type: 'code', label: 'Activation code', value: '{{code}}' },
      { type: 'text', text: 'This code opens all of Qimmah for {{durationDays}}, counted from the moment you redeem it — not from now.' },
      { type: 'text', text: 'How to use it:' },
      { type: 'steps', items: [
        'Open Qimmah.',
        'Tap “Have an activation code?”',
        'Paste the code and tap Activate.',
      ] },
      { type: 'note', text: 'Keep this email. We store a fingerprint of the code, not the code itself, so we cannot resend this one. If you lose it, write to us and we will issue a new code.' },
      { type: 'note', text: 'This code is just for you. Please don’t share it.' },
      { type: 'divider' },
      { type: 'text', text: 'Any questions? Email us at {{supportEmail}}.' },
      { type: 'legal', title: 'Legal note', lines: [
        'An access code is a temporary, revocable grant. It carries no automatic renewal and no recurring charge.',
        'A code may be redeemed once per email identity, and its duration is counted from the redemption date on server time.',
        'This message contains no password, and the Qimmah team will never ask you for your password.',
      ] },
    ],
  },
}

// ── ٣) بدء التجربة — ٧٢ ساعة، وما يصير بعدها مكتوب صراحةً ──────────────────
const trialStarted = {
  ar: {
    subject: 'تجربتك بدأت — ٧٢ ساعة',
    preheader: 'كل شي مفتوح لك الحين. تنتهي {{trialEndsAt}}.',
    blocks: [
      { type: 'heading', text: 'تجربتك شغّالة' },
      { type: 'lead', text: 'كل شي مفتوح لك الحين: تمارينك وأكلك وقياساتك وتعديل خطتك.' },
      { type: 'facts', rows: [['المدّة', '٧٢ ساعة بالضبط'], ['تنتهي', '{{trialEndsAt}}']] },
      { type: 'note', text: 'الوقت محسوب من ساعة الخادم، فما يتأثّر بساعة جهازك.' },
      { type: 'text', text: 'وش يصير بعد ٧٢ ساعة؟' },
      { type: 'bullets', items: [
        'بياناتك تبقى مكانها — ما ينحذف منها ولا شي.',
        'خطتك وسجلّك يظلّون قدّامك تتصفّحهم عادي.',
        'اللي يتوقّف هو التسجيل الجديد: تمرين، أكل، قياسات، تعديل الخطة.',
        'ما فيه تجديد تلقائي ولا خصم — التجربة تنتهي بروحها وبس.',
      ] },
      { type: 'text', text: 'حابّ تكمل بعدها؟ قِمّة Premium تفتح كل شي من جديد.' },
      { type: 'note', text: `قِمّة Premium — ${APPROVED_PREMIUM_LINE.ar}` },
      { type: 'note', text: 'التجربة مرّة وحدة لكل حساب موثَّق.' },
      { type: 'divider' },
      { type: 'text', text: 'أي شي ما ضبط؟ راسلنا على {{supportEmail}}.' },
      { type: 'legal', title: 'ملاحظة قانونية', lines: [
        'مدّة التجربة ٧٢ ساعة من لحظة التفعيل، وتُحتسب بتوقيت الخادم.',
        'لا يترتّب على التجربة أي التزام مالي، ولا تتحوّل تلقائيًا إلى شراء، ولا تُحفظ لدينا أي وسيلة دفع.',
        'عند انتهاء المدّة تتوقّف عمليات الإضافة والتعديل داخل التطبيق، ولا تُحذف بياناتك.',
        'تُتاح التجربة مرّة واحدة لكل هوية بريد موثَّقة.',
      ] },
    ],
  },
  en: {
    subject: 'Your trial is running — 72 hours',
    preheader: 'Everything is open now. It ends {{trialEndsAt}}.',
    blocks: [
      { type: 'heading', text: 'Your trial is running' },
      { type: 'lead', text: 'Everything is open now: your workouts, your food, your measurements, and plan edits.' },
      { type: 'facts', rows: [['Length', 'Exactly 72 hours'], ['Ends', '{{trialEndsAt}}']] },
      { type: 'note', text: 'The clock runs on server time, so your device clock does not affect it.' },
      { type: 'text', text: 'What happens after the 72 hours?' },
      { type: 'bullets', items: [
        'Your data stays exactly where it is — nothing is deleted.',
        'Your plan and your history stay there for you to read.',
        'What stops is new logging: workouts, food, measurements, plan edits.',
        'No auto-renewal and no charge — the trial simply ends.',
      ] },
      { type: 'text', text: 'Want to keep going? Qimmah Premium opens all of it again.' },
      { type: 'note', text: `Qimmah Premium — ${APPROVED_PREMIUM_LINE.en}` },
      { type: 'note', text: 'The trial is once per verified account.' },
      { type: 'divider' },
      { type: 'text', text: 'Something not working? Email us at {{supportEmail}}.' },
      { type: 'legal', title: 'Legal note', lines: [
        'The trial lasts 72 hours from activation, counted on server time.',
        'The trial carries no financial obligation, never converts to a purchase automatically, and no payment method is stored by us.',
        'When it ends, adding and editing inside the app stops. Your data is not deleted.',
        'One trial is available per verified email identity.',
      ] },
    ],
  },
}

// ── ٤) تأكيد التفعيل ───────────────────────────────────────────────────────
const activationSucceeded = {
  ar: {
    subject: 'تم التفعيل — قِمّة مفتوحة لك',
    preheader: 'كل شي جاهز. تقدر تبدأ من الحين.',
    blocks: [
      { type: 'heading', text: 'تم التفعيل' },
      { type: 'lead', text: 'كل شي مفتوح: تمارينك وأكلك وقياساتك وتعديل خطتك.' },
      { type: 'facts', rows: [['نوع الوصول', '{{grantLabel}}'], ['التفاصيل', '{{grantDetail}}']] },
      { type: 'text', text: 'ما تحتاج تسوي شي ثاني — افتح قِمّة وكمّل من وين وقفت.' },
      { type: 'divider' },
      { type: 'text', text: 'لو لاحظت شي غريب في وصولك، راسلنا على {{supportEmail}}.' },
      { type: 'legal', title: 'ملاحظة قانونية', lines: [
        'هذه رسالة تأكيد لعملية تفعيل تمّت على حسابك.',
        'إن لم تكن أنت من قام بهذا التفعيل، يُرجى التواصل معنا فورًا.',
      ] },
    ],
  },
  en: {
    subject: 'Activated — Qimmah is open',
    preheader: 'You are all set. You can start now.',
    blocks: [
      { type: 'heading', text: 'You are activated' },
      { type: 'lead', text: 'Everything is open: your workouts, your food, your measurements, and plan edits.' },
      { type: 'facts', rows: [['Access', '{{grantLabel}}'], ['Details', '{{grantDetail}}']] },
      { type: 'text', text: 'Nothing else to do — open Qimmah and pick up where you left off.' },
      { type: 'divider' },
      { type: 'text', text: 'If anything about your access looks off, email us at {{supportEmail}}.' },
      { type: 'legal', title: 'Legal note', lines: [
        'This message confirms an activation that took place on your account.',
        'If this was not you, please contact us right away.',
      ] },
    ],
  },
}

// ── ٥) الاحتياطي — التفعيل لم يتمّ، والخلل منّا ─────────────────────────────
const supportFallback = {
  ar: {
    subject: 'ما ضبط التفعيل — إحنا هنا',
    preheader: 'وصلك هذا لأن التفعيل ما تمّ. وصولك محفوظ ما ضاع.',
    blocks: [
      { type: 'heading', text: 'ما ضبط معنا التفعيل' },
      { type: 'lead', text: 'صار خلل من طرفنا وما قدرنا نكمّل التفعيل. الغلط مو منك.' },
      { type: 'text', text: 'المهم اللي تحتاج تعرفه:' },
      { type: 'bullets', items: [
        'وصولك محفوظ ومربوط ببريدك — ما ضاع شي.',
        'بياناتك وخطتك زي ما هي بالضبط.',
        'إحنا نتابع الموضوع، وتقدر تستعجلنا بالرقم اللي تحت.',
      ] },
      { type: 'facts', rows: [['رقم المرجع', '{{reference}}']] },
      { type: 'text', text: 'راسلنا على {{supportEmail}} واذكر رقم المرجع، ونرجع لك.' },
      { type: 'note', text: 'ما نطلب منك كلمة مرورك أبدًا ولا نرسلها لك. أي رسالة تطلب كلمة مرورك ليست منّا.' },
      { type: 'legal', title: 'ملاحظة قانونية', lines: [
        'هذه رسالة معاملات تتعلّق بمحاولة تفعيل لم تكتمل.',
        'لا يترتّب على هذه الرسالة أي التزام مالي إضافي، ولا تُلغى بها أي منحة قائمة.',
      ] },
    ],
  },
  en: {
    subject: 'Activation did not go through — we are on it',
    preheader: 'You got this because activation failed. Your access is safe.',
    blocks: [
      { type: 'heading', text: 'Activation did not go through' },
      { type: 'lead', text: 'Something broke on our side and we could not finish activating. This is not on you.' },
      { type: 'text', text: 'What matters right now:' },
      { type: 'bullets', items: [
        'Your access is recorded and tied to your email — nothing is lost.',
        'Your data and your plan are exactly as they were.',
        'We are following it up, and you can chase us with the reference below.',
      ] },
      { type: 'facts', rows: [['Reference', '{{reference}}']] },
      { type: 'text', text: 'Email us at {{supportEmail}} with that reference and we will get back to you.' },
      { type: 'note', text: 'We never ask for your password and never email one to you. Any message asking for your password is not from us.' },
      { type: 'legal', title: 'Legal note', lines: [
        'This is a transactional message about an activation attempt that did not complete.',
        'It creates no additional financial obligation and cancels no existing grant.',
      ] },
    ],
  },
}

/**
 * سجلّ القوالب — ووسمان يحكمان مسار كل رسالة، والفرق بينهما ليس درجةً بل نوعًا.
 *
 * `lateTokens` — **سرّ يمكن سكّه من جديد.** رابط الدعوة بيانات اعتماد كاملة
 *   بشكل رابط: من يفتحه يضع كلمة مرور على الحساب. فلا يُخزَّن في الطابور
 *   إطلاقًا — بل **يُسكّ لحظة التسليم** من Supabase Auth، يُستعمل، ويُنسى.
 *   والإعادة تسكّ رابطًا جديدًا صالحًا لنفس الهوية، فلا تخسر شيئًا.
 *
 * `carriesSecret` — **سرّ لا يمكن سكّه من جديد.** كود الوصول مبصوم في
 *   `access_codes.code_hash`، وسكّ بديلٍ يعني كودًا **مختلفًا** بصفٍّ جديد لا
 *   إعادةَ إرسالِ الأول. فالقالب لا يدخل طابورًا يعد بما لا يستطيع.
 *
 * هذا هو الحدّ: **ما يُسكّ من جديد يُطابَر، وما لا يُسكّ يُمرَّر مباشرة.**
 */
export const TEMPLATES = {
  premium_purchase:     { id: 'premium_purchase',     carriesSecret: false, lateTokens: ['activationUrl'], docs: premiumPurchase },
  access_code:          { id: 'access_code',          carriesSecret: true,  lateTokens: [], docs: accessCode },
  trial_started:        { id: 'trial_started',        carriesSecret: false, lateTokens: [], docs: trialStarted },
  activation_succeeded: { id: 'activation_succeeded', carriesSecret: false, lateTokens: [], docs: activationSucceeded },
  support_fallback:     { id: 'support_fallback',     carriesSecret: false, lateTokens: [], docs: supportFallback },
}

/** الرموز التي يجب أن يمرّرها المستدعي — أي المطلوبة ناقص المسكوكة متأخّرًا. */
export function callerTokens(templateId, lang) {
  const late = TEMPLATES[templateId]?.lateTokens ?? []
  return requiredTokens(templateId, lang).filter((n) => !late.includes(n))
}

export const TEMPLATE_IDS = Object.keys(TEMPLATES)
export const LANGS = ['ar', 'en']

/** يجلب مستند قالب. معرّف أو لغة مجهولة ⇒ خطأ مسمّى لا `undefined`. */
export function getDocument(templateId, lang) {
  const t = TEMPLATES[templateId]
  if (!t) throw new Error(`EMAIL_UNKNOWN_TEMPLATE:${templateId}`)
  const d = t.docs[lang]
  if (!d) throw new Error(`EMAIL_UNKNOWN_LANG:${templateId}/${lang}`)
  return { ...d, brand: BRAND[lang], footer: FOOTER[lang] }
}

/** كل نصوص القالب مسطَّحةً — لفحص العبارات الممنوعة والنبرة. */
export function documentStrings(doc) {
  const out = [doc.subject, doc.preheader, doc.brand, doc.footer]
  for (const b of doc.blocks) {
    if (b.text) out.push(b.text)
    if (b.label) out.push(b.label)
    if (b.value) out.push(b.value)
    if (b.title) out.push(b.title)
    if (b.items) out.push(...b.items)
    if (b.lines) out.push(...b.lines)
    if (b.rows) for (const [k, v] of b.rows) out.push(k, v)
  }
  return out
}

/** أسماء الرموز التي يطلبها قالب بلغة معيّنة — مرتّبة، بلا تكرار. */
export function requiredTokens(templateId, lang) {
  const doc = getDocument(templateId, lang)
  const names = new Set()
  for (const s of documentStrings(doc)) for (const n of tokensIn(s)) names.add(n)
  for (const b of doc.blocks) if (b.href) for (const n of tokensIn(b.href)) names.add(n)
  return [...names].sort()
}
