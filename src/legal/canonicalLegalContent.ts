import type { Lang } from '@/lib/appPreferences'

export type LegalDocumentKind = 'privacy' | 'terms'
export interface LegalSection { heading: string; paragraphs: readonly string[] }
export interface LegalDocument { title: string; summary: string; sections: readonly LegalSection[] }
export interface LegalLaunchConfig {
  ready: boolean
  unresolved: string[]
  controllerNameAr: string
  controllerNameEn: string
  contactEmail: string
  effectiveDate: string
  governingVenueAr: string
  governingVenueEn: string
  dataRegionAr: string
  dataRegionEn: string
  legalReviewId: string
}

const fallbackConfig: LegalLaunchConfig = {
  ready: false,
  unresolved: ['LEGAL_BUILD_CONFIG_UNAVAILABLE'],
  controllerNameAr: '', controllerNameEn: '', contactEmail: '', effectiveDate: '',
  governingVenueAr: '', governingVenueEn: '', dataRegionAr: '', dataRegionEn: '', legalReviewId: '',
}

export const legalLaunchConfig: LegalLaunchConfig =
  typeof __LEGAL_LAUNCH_CONFIG__ === 'undefined' ? fallbackConfig : __LEGAL_LAUNCH_CONFIG__

export const POLICY_LINKS = { terms: '#/terms', privacy: '#/privacy' } as const

const missing = (field: string) => `[FOUNDER_INPUT_REQUIRED: ${field}]`
const configured = (value: string, field: string) => value || missing(field)

export const policyCopy: Record<Lang, {
  eligibilityPrefix: string
  terms: string
  joiner: string
  privacy: string
  eligibilityRequired: string
  healthExplanation: string
  healthConsent: string
  healthConsentRequired: string
}> = {
  ar: {
    eligibilityPrefix: 'عمري 12 سنة أو أكثر، وأوافق على', terms: 'الشروط', joiner: 'و', privacy: 'سياسة الخصوصية',
    eligibilityRequired: 'أكّد أن عمرك 12 سنة أو أكثر، ووافق على الشروط وسياسة الخصوصية.',
    healthExplanation: 'نستخدم عمرك وطولك ووزنك عشان نجهّز هدفك وخطتك. بياناتك تنحفظ على جهازك، وما تطلع منه إلا إذا سجّلت دخولك وفعّلت المزامنة بنفسك.',
    healthConsent: 'أوافق على معالجة بياناتي الصحية لإعداد خطتي',
    healthConsentRequired: 'وافق على معالجة بياناتك الصحية للمتابعة.',
  },
  en: {
    eligibilityPrefix: 'I am 12 or older and agree to the', terms: 'Terms', joiner: 'and', privacy: 'Privacy Policy',
    eligibilityRequired: 'Confirm that you are 12 or older and accept the Terms and Privacy Policy.',
    healthExplanation: 'We use your age, height and weight to set up your goal and plan. Your data stays on your device — it only leaves if you sign in and turn sync on yourself.',
    healthConsent: 'I agree to the processing of my health data to prepare my plan',
    healthConsentRequired: 'Agree to the processing of your health data to continue.',
  },
}

function privacy(lang: Lang): LegalDocument {
  const c = legalLaunchConfig
  if (lang === 'en') return {
    title: 'Privacy Policy',
    summary: `Effective date: ${configured(c.effectiveDate, 'effectiveDate')} · Controller: ${configured(c.controllerNameEn, 'controllerNameEn')} · Contact: ${configured(c.contactEmail, 'contactEmail')}`,
    sections: [
      { heading: '1. Local-first by default', paragraphs: ['Qimmah stores your profile, plans, workout, nutrition, wellness, and progress records on your device by default. You can set up a profile, generate and preview a plan, and browse preview screens without an account. An account is optional for local use; it is required for account-based access such as the verified trial, code redemption, and optional cloud sync.'] },
      { heading: '2. Data used by the app', paragraphs: ['The app uses the information you choose to enter, including age, sex, height, weight, goals, training history, injuries, workouts, food and water logs, measurements, and wellness reminders, to provide the features you request. Passwords are handled by the authentication provider; Qimmah does not generate or send passwords to users.'] },
      { heading: '3. Health data choices', paragraphs: ['Health-data processing for plan setup requires an explicit consent. Cloud sync is a separate, optional choice and sensitive health data is not synced merely because you created an account. You can keep using local features without enabling sync.'] },
      { heading: '4. Users aged 12–17', paragraphs: ['The minimum supported age is 12. For users under 18, Qimmah does not calculate or display numeric calorie, macro, or hydration prescriptions, adult BMI interpretation, deficit or surplus prescriptions, weight-change-rate prescriptions, or numeric forecasts derived from the adult personalization model. Food logging, training, progress, and qualitative guidance remain available. This version does not provide a parental-consent flow.'] },
      { heading: '5. Services data may reach', paragraphs: ['Supabase provides authentication and, only when enabled, cloud data services. Open Food Facts receives a barcode or search term when you request packaged-food lookup. External exercise-media hosts receive an ordinary image request. Apple Health data is read only after you explicitly connect it. Location is requested only if you choose automatic dark-mode scheduling, is used to calculate local sunrise and sunset, and is not stored; manual city selection remains available. Optional diagnostics remain disabled unless configured and consented to.'] },
      { heading: '6. Storage location and transfers', paragraphs: [`The production data region must match the deployed Supabase project: ${configured(c.dataRegionEn, 'dataRegionEn')}. The founder and legal reviewer must confirm any cross-border wording before launch; this draft makes no adequacy or regulatory-compliance claim.`] },
      { heading: '7. Control, export, and deletion', paragraphs: ['Local data remains until you clear it or remove the app. Available settings let you export local data and request account deletion. A deletion failure must not be presented as success. Retention periods and any additional request channel require legal approval before launch.'] },
      { heading: '8. Security and limits', paragraphs: ['The service uses HTTPS, authentication, and server-side row-level access controls where cloud services are used. No security measure is absolute. Public client configuration is not treated as a secret; authorization is enforced by server-side policy.'] },
      { heading: '9. Contact and changes', paragraphs: [`Controller: ${configured(c.controllerNameEn, 'controllerNameEn')}. Contact: ${configured(c.contactEmail, 'contactEmail')}. Material policy changes will be published with a new effective date.`] },
    ],
  }
  return {
    title: 'سياسة الخصوصية',
    summary: `تاريخ النفاذ: ${configured(c.effectiveDate, 'effectiveDate')} · المسؤول عن المعالجة: ${configured(c.controllerNameAr, 'controllerNameAr')} · التواصل: ${configured(c.contactEmail, 'contactEmail')}`,
    sections: [
      { heading: '١. محلي افتراضيًا', paragraphs: ['يحفظ قِمّة ملفك وخططك وسجلّ التمرين والتغذية والعافية والتقدّم على جهازك افتراضيًا. يمكنك إنشاء ملفك وتوليد خطتك ومعاينتها وتصفّح وضع المعاينة بلا حساب. الحساب اختياري للاستخدام المحلي، ويُطلب للمزايا المرتبطة بالحساب مثل التجربة للحساب الموثّق، واسترداد الكود، والمزامنة السحابية الاختيارية.'] },
      { heading: '٢. البيانات التي يستخدمها التطبيق', paragraphs: ['يستخدم التطبيق ما تختار إدخاله، مثل العمر والجنس والطول والوزن والهدف وتاريخ التدريب والإصابات والتمارين والطعام والماء والقياسات وتذكيرات العافية، لتقديم المزايا التي تطلبها. مزوّد المصادقة يتولى كلمات المرور؛ وقِمّة لا يولّد كلمة مرور للمستخدم ولا يرسلها له.'] },
      { heading: '٣. خيارات بيانات الصحة', paragraphs: ['تتطلب معالجة بيانات الصحة لإعداد الخطة موافقة صريحة. المزامنة السحابية اختيار منفصل، ولا تُزامن البيانات الصحية الحساسة لمجرد إنشاء حساب. يمكنك استخدام المزايا المحلية دون تفعيل المزامنة.'] },
      { heading: '٤. الأعمار من 12 إلى 17', paragraphs: ['الحد الأدنى المدعوم 12 سنة. لمن هم دون 18، لا يحسب قِمّة ولا يعرض أهداف سعرات أو ماكروز أو ماء رقمية، ولا تفسير BMI للبالغين، ولا وصفة عجز أو فائض، ولا معدل تغيّر وزن، ولا توقعًا رقميًا مشتقًا من نموذج تخصيص البالغين. يبقى تسجيل الطعام والتمرين والتقدّم والإرشاد النوعي متاحًا. لا يوجد في هذه النسخة مسار موافقة ولي أمر.'] },
      { heading: '٥. خدمات قد تصلها بيانات', paragraphs: ['يوفّر Supabase المصادقة، وعند تفعيلها فقط خدمات البيانات السحابية. يستقبل Open Food Facts رقم باركود أو عبارة بحث عندما تطلب البحث عن منتج معبّأ. تستقبل استضافات صور التمارين طلب صورة عاديًا. بيانات Apple Health قراءة فقط بعد ربطك الصريح. لا يُطلب موقعك إلا إذا اخترت جدولة الوضع الداكن تلقائيًا لحساب الشروق والغروب محليًا، ولا يُخزّن؛ ويبقى اختيار المدينة يدويًا متاحًا. ويبقى التشخيص الاختياري متوقفًا ما لم يُضبط وتوافق عليه.'] },
      { heading: '٦. موقع التخزين والنقل', paragraphs: [`يجب أن تطابق منطقة البيانات مشروع Supabase المنشور: ${configured(c.dataRegionAr, 'dataRegionAr')}. على المؤسس والمراجع القانوني اعتماد صياغة أي نقل عبر الحدود قبل الإطلاق؛ وهذه المسودة لا تدّعي كفاية أو امتثالًا نظاميًا.`] },
      { heading: '٧. التحكم والتصدير والحذف', paragraphs: ['تبقى البيانات المحلية حتى تمسحها أو تحذف التطبيق. تتيح الإعدادات المتوفرة تصدير البيانات المحلية وطلب حذف الحساب. لا يجوز عرض نجاح إذا فشل الحذف. مدد الاحتفاظ وأي قناة إضافية للطلبات تحتاج اعتمادًا قانونيًا قبل الإطلاق.'] },
      { heading: '٨. الأمان وحدوده', paragraphs: ['تستخدم الخدمة HTTPS والمصادقة وصلاحيات الصف على الخادم عند استخدام الخدمات السحابية. لا يوجد إجراء أمني مطلق. إعداد العميل العام ليس سرًا؛ والصلاحية تُفرض بسياسة الخادم.'] },
      { heading: '٩. التواصل والتغييرات', paragraphs: [`المسؤول عن المعالجة: ${configured(c.controllerNameAr, 'controllerNameAr')}. التواصل: ${configured(c.contactEmail, 'contactEmail')}. تُنشر التغييرات الجوهرية مع تاريخ نفاذ جديد.`] },
    ],
  }
}

function terms(lang: Lang): LegalDocument {
  const c = legalLaunchConfig
  if (lang === 'en') return {
    title: 'Terms of Use',
    summary: `Effective date: ${configured(c.effectiveDate, 'effectiveDate')} · Provider: ${configured(c.controllerNameEn, 'controllerNameEn')} · Contact: ${configured(c.contactEmail, 'contactEmail')}`,
    sections: [
      { heading: '1. Acceptance and eligibility', paragraphs: ['Using Qimmah means accepting these Terms and the Privacy Policy. The minimum supported age is 12. Account creation requires an explicit age confirmation. This version does not claim identity verification or provide a parental-consent flow.'] },
      { heading: '2. Fitness guidance, not medical care', paragraphs: ['Qimmah organises workouts, nutrition, measurements, and progress. It is not a medical provider and does not diagnose, treat, prescribe, or guarantee results. Medication and supplement tracking organises information you enter; it does not recommend a product, dose, or schedule. Seek qualified help for medical decisions or emergencies.'] },
      { heading: '3. Under-18 product policy', paragraphs: ['For users aged 12–17, Qimmah provides training, logging, progress, and qualitative guidance without adult-derived numeric calorie, macro, hydration, BMI-interpretation, deficit, surplus, weight-change-rate, or numeric forecast prescriptions.'] },
      { heading: '4. Free preview and paid access', paragraphs: ['Without payment or an account, you may complete setup, generate and preview a plan, create an account, and browse the app in preview mode. Productive actions are behind one of three access paths: a 72-hour trial once per verified account, Qimmah Premium, or a time-limited access code.'] },
      { heading: '5. Premium purchase', paragraphs: ['Qimmah Premium costs SAR 19.99 across authorised sales channels. It is a one-time purchase, not a monthly or auto-renewing subscription. It includes Qimmah updates — no monthly subscription. The purchase channel must show its applicable purchase and refund terms before checkout.'] },
      { heading: '6. Accounts and acceptable use', paragraphs: ['You are responsible for your credentials and account activity. Do not attempt unauthorised access, disrupt the service, pose as another person, submit unlawful content, or reverse-engineer in violation of applicable law.'] },
      { heading: '7. Your content and third parties', paragraphs: ['You retain rights in the records you enter and allow their limited processing to operate the features you request. Some features rely on third-party services identified in the Privacy Policy and may also be subject to their terms.'] },
      { heading: '8. Availability, estimates, and termination', paragraphs: ['The service and its estimates are provided without a promise of uninterrupted availability or a particular result. You may request account deletion. Access may be suspended for a material breach of these Terms, subject to the final legal review.'] },
      { heading: '9. Governing terms and contact', paragraphs: [`Governing-law and venue wording awaiting founder and legal approval: ${configured(c.governingVenueEn, 'governingVenueEn')}. Provider: ${configured(c.controllerNameEn, 'controllerNameEn')}. Contact: ${configured(c.contactEmail, 'contactEmail')}.`] },
    ],
  }
  return {
    title: 'شروط الاستخدام',
    summary: `تاريخ النفاذ: ${configured(c.effectiveDate, 'effectiveDate')} · مقدم الخدمة: ${configured(c.controllerNameAr, 'controllerNameAr')} · التواصل: ${configured(c.contactEmail, 'contactEmail')}`,
    sections: [
      { heading: '١. القبول والأهلية', paragraphs: ['استخدام قِمّة يعني موافقتك على هذه الشروط وسياسة الخصوصية. الحد الأدنى المدعوم 12 سنة. إنشاء الحساب يحتاج تأكيدًا صريحًا للعمر. لا تدّعي هذه النسخة التحقق من الهوية ولا توفّر مسار موافقة ولي أمر.'] },
      { heading: '٢. إرشاد لياقة لا رعاية طبية', paragraphs: ['قِمّة ينظّم التمرين والتغذية والقياسات والتقدّم. ليس جهة طبية، ولا يشخّص أو يعالج أو يصف أو يضمن نتيجة. متابعة الأدوية والمكمّلات تنظّم ما تدخله أنت؛ ولا توصي بمنتج أو جرعة أو توقيت. ارجع لمختص مؤهل للقرارات الطبية وللجهات المختصة في الطوارئ.'] },
      { heading: '٣. سياسة من هم دون 18', paragraphs: ['لمن أعمارهم من 12 إلى 17، يقدّم قِمّة التمرين والتسجيل والتقدّم والإرشاد النوعي بدون أهداف رقمية مشتقة من نموذج البالغين للسعرات أو الماكروز أو الماء أو تفسير BMI أو العجز والفائض أو معدل تغيّر الوزن أو التوقعات الرقمية.'] },
      { heading: '٤. المعاينة المجانية والوصول المدفوع', paragraphs: ['بلا دفع أو حساب، يمكنك إكمال الإعداد وتوليد خطتك ومعاينتها وإنشاء حساب وتصفّح التطبيق في وضع المعاينة. الأفعال المنتجة خلف واحد من ثلاثة مسارات: تجربة ٧٢ ساعة مرة واحدة لكل حساب موثّق، أو قِمّة Premium، أو كود وصول محدود المدة.'] },
      { heading: '٥. شراء Premium', paragraphs: ['سعر قِمّة Premium هو 19.99 ريال سعودي في قنوات البيع المعتمدة. هو شراء مرة واحدة، وليس اشتراكًا شهريًا ولا تجديدًا تلقائيًا. يشمل تحديثات قِمّة — بلا اشتراك شهري. يجب أن تعرض قناة الشراء شروط الشراء والاسترداد المطبقة قبل الدفع.'] },
      { heading: '٦. الحساب والاستخدام المقبول', paragraphs: ['أنت مسؤول عن بيانات دخولك ونشاط حسابك. لا تحاول وصولًا غير مصرح، ولا تعطّل الخدمة، ولا تنتحل غيرك، ولا تدخل محتوى غير نظامي، ولا تعكس هندسيًا بما يخالف النظام المطبق.'] },
      { heading: '٧. محتواك والخدمات الخارجية', paragraphs: ['تبقى لك حقوق السجلات التي تدخلها، وتسمح بمعالجتها في الحد اللازم لتشغيل المزايا التي تطلبها. تعتمد بعض المزايا على خدمات خارجية مذكورة في سياسة الخصوصية وقد تسري شروطها أيضًا.'] },
      { heading: '٨. التوفر والتقديرات والإنهاء', paragraphs: ['لا تعد الخدمة أو تقديراتها بتوفر بلا انقطاع أو نتيجة معينة. يمكنك طلب حذف حسابك. وقد يوقف الوصول عند مخالفة جوهرية للشروط، وفق الصياغة التي يعتمدها المراجع القانوني.'] },
      { heading: '٩. النظام والتواصل', paragraphs: [`صياغة النظام الحاكم والاختصاص بانتظار اعتماد المؤسس والمراجع القانوني: ${configured(c.governingVenueAr, 'governingVenueAr')}. مقدم الخدمة: ${configured(c.controllerNameAr, 'controllerNameAr')}. التواصل: ${configured(c.contactEmail, 'contactEmail')}.`] },
    ],
  }
}

export function getLegalDocument(kind: LegalDocumentKind, lang: Lang): LegalDocument {
  return kind === 'privacy' ? privacy(lang) : terms(lang)
}

export const legalUiCopy: Record<Lang, { back: string; blockedTitle: string; blockedBody: string; review: string }> = {
  ar: { back: 'رجوع', blockedTitle: 'هذه المسودة غير معتمدة للإطلاق', blockedBody: 'حقول المالك أو المراجعة القانونية غير مكتملة. لا تعتمد هذا النص كنسخة إطلاق.', review: 'معرّف المراجعة القانونية' },
  en: { back: 'Back', blockedTitle: 'This draft is not approved for launch', blockedBody: 'Owner fields or legal review are incomplete. Do not treat this as launch-ready copy.', review: 'Legal review ID' },
}
