# دليل النشر على App Store — قِمّة (للمالك)

> خطوات عملية بترتيب التنفيذ. كل بند مُعلّم **⚠ قرار المالك** يحتاج قرارك قبل المتابعة.
> المراجع: بطاقات الخصوصية `docs/legal/app-privacy-labels.md` · السياسة/الشروط `docs/legal/` ·
> إعداد iOS `docs/ios-setup.md` · الجاهزية `docs/APP-READINESS.md`. حدود Apple موثّقة ومؤرّخة في
> `07-second-pass-verification.md` (تحقّق 2026-07-13).

## المرحلة 0 — متطلّبات مسبقة (قبل App Store Connect)
1. **حساب Apple Developer** فعّال (Organization يُفضّل للنشر باسم كيان). ⚠ قرار المالك: الكيان الناشر.
2. **فريق التوقيع** (`DEVELOPMENT_TEAM`) مضبوط في Xcode على جهاز Mac (`APP-READINESS.md` §1). ⚠
3. **الأيقونة والـ Splash** النهائية (1024×1024 بلا شفافية) — مُعطّلة على «Cloud Design» (`APP-READINESS.md` §7). ⚠
4. **مشروع Supabase الإنتاجي** مضبوط (لا القالب المشترك)، مع تفعيل RLS ونشر دالة `delete_own_account`
   (تحقّق بـ `npm run db:verify` — راجع خطة قاعدة البيانات). ⚠
5. **صفحتا الخصوصية والشروط مستضافتان** على رابط عام (من `public/legal/privacy.html` و`terms.html`).
   ⚠ قرار المالك: النطاق/الرابط العام النهائي.
6. **بوابة سنّ الأهلية** مطبّقة عند التسجيل: 12+ مع موافقة صريحة على الشروط والخصوصية (`03-age-rating.md`).
7. **واجهة v2.1** يجب أن تطابق اللقطات في البناء المرفوع.

## المرحلة 1 — إنشاء سجلّ التطبيق في App Store Connect
1. App Store Connect → **My Apps → + → New App**.
2. Platform: **iOS**. Name: **قِمّة: تمارين وتغذية وتقدّم** (اسم AR الموصى به، `01-naming.md`). ⚠ قرار المالك.
3. Primary Language: **Arabic**. Bundle ID: **`com.qimmah.mobile`** (مطابق `capacitor.config.ts`).
4. SKU: قيمة داخلية (مثل `qimmah-ios-1`). User Access: حسب الحاجة.

## المرحلة 2 — تعبئة صفحة المتجر (App Information + Version)
1. **Name / Subtitle**: من `01-naming.md` (الاسم 27 حرفًا، Subtitle «درّب بوضوح. تقدّم بثقة.» 23 حرفًا).
   تحقّق من العدّاد داخل ASC.
2. **Promotional text** (≤170) و**Description** (AR من `02-description.md`، ثم النسخة EN إن لوكِّل storefront الإنجليزي). ⚠
3. **Keywords** (≤100، بفواصل بلا مسافات): الخيار A من `01-naming.md`.
4. **Support URL** و**Marketing URL** (اختياري): رابط الدعم/الموقع. ⚠ قرار المالك.
5. **Screenshots**: ارفع مجموعة **6.9″ (1260×2736)** بستّ لقطات من `docs/appstore/screenshots/raw/` حسب `04-screenshots.md`.
6. **Category**: الأساسية **Health & Fitness**. ⚠ قرار المالك (ثانوية اختيارية).
7. **Age Rating**: افتح الاستبيان وأجب حرفيًا حسب `03-age-rating.md` (Apple تحسب التصنيف). ⚠

## المرحلة 3 — الخصوصية (App Privacy)
1. App Store Connect → **App Privacy**.
2. اتبع `docs/legal/app-privacy-labels.md` **حرفيًا**: التتبّع = لا؛ وأنواع البيانات «المجموعة» مقابل
   «غير المجموعة» كما في الجدول (البريد/الاسم/الصحة/اللياقة/معرّف المستخدم/محتوى المستخدم = مجموعة ومرتبطة،
   بلا تتبّع؛ وبيانات التغذية/الماء/الخطوات تُصرّح وفق إعداد المزامنة الفعلي للبناء).
3. **خانة التحليلات**: «Usage/Diagnostics = Not Collected» **قطعًا** — لا متغيّر ولا مزوّد إرسال في الكود بعد [CTO-71]. (تاريخيًا كان مشروطًا بـ`VITE_ANALYTICS_ENDPOINT`) → «Usage/Diagnostics = Not
   Collected» (الموصى به). إن كانت تضبطه → أكمل صفّي Usage/Diagnostics (مجهول، وليس تتبّعًا). ⚠ قرار المالك.
4. أرفق **رابط سياسة الخصوصية العام** المستضاف (مطلوب).

## المرحلة 4 — الروابط القانونية
1. **Privacy Policy URL**: الرابط العام المستضاف (مطلوب في App Privacy وصفحة التطبيق).
2. **Terms (EULA)**: استخدم EULA الافتراضي من Apple أو الصق شروطك المستضافة (`docs/legal/terms-of-service.md`). ⚠

## المرحلة 5 — بناء الحزمة ورفعها (على Mac)
1. `VITE_DESIGN_V2=true npm run build` (إن قرّرت شحن v2.1) — وإلا `npm run build` لواجهة v1. ⚠
2. `npx cap sync ios` ثم `npx cap open ios` (`docs/ios-setup.md`).
3. في Xcode: اضبط **Team/Signing**، ثم **Product → Archive**.
4. **Xcode Organizer → Distribute App → App Store Connect → Upload** (لرفع الحزمة).
5. انتظر معالجة الحزمة في App Store Connect (بضع دقائق–ساعة).

## المرحلة 6 — TestFlight
1. **Internal Testing**: أضف مختبِرين داخليين (فريقك) على الحزمة المرفوعة — بلا مراجعة Apple.
2. جرّب المسارات الحرجة على جهاز حقيقي: تسجيل الدخول، الإعداد، وضع التمرين، مسح الباركود، حذف الحساب،
   التذكيرات، RTL. (راجع `docs/release-checklist.md`).
3. **External Testing**: أنشئ مجموعة خارجية + معلومات الاختبار (بالعربية) → يتطلّب **Beta App Review**
   (عادةً أسرع من مراجعة الإصدار). أضف ملاحظات المراجعة والحساب التجريبي من `05-reviewer-notes.md`.

## المرحلة 7 — التقديم للمراجعة (App Review)
1. في الإصدار: اختر الحزمة، أكمل **App Review Information** (الحساب التجريبي + الملاحظات من `05-reviewer-notes.md`).
2. **Export Compliance**: التطبيق يستخدم HTTPS القياسي فقط (بلا تشفير خاص) — أجب حسب ذلك. ⚠ قرار المالك (تأكيد).
3. **Content Rights / IDFA**: لا إعلانات ولا IDFA → «لا». 
4. اختر **Automatically/Manually release** بعد الموافقة. ⚠ قرار المالك.
5. **Submit for Review**.

## قائمة قرارات المالك (مجمّعة)
- الكيان الناشر · فريق التوقيع · الأيقونة/الـSplash النهائية · نطاق الروابط القانونية العام ·
  ضبط `VITE_ANALYTICS_ENDPOINT` أم لا · الفئة الثانوية · روابط الدعم/التسويق ·
  الحساب التجريبي وكلمته · باركود اختبار معروف · نمط الإصدار (تلقائي/يدوي) · هل iPad ضمن النطاق.

> بعد الموافقة: راقب أول 48 ساعة (أعطال TestFlight/المراجعات)، وحدّث Promotional text عند الحاجة (لا يتطلّب
> بناءً جديدًا).
