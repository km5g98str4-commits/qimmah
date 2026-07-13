# دليل النشر على App Store Connect (خطوة بخطوة) — للمالك

> كل بند مكتوب ليُنفَّذ بالترتيب. أي قرار يخصّك مُعلَّم بـ **⟦قرار المالك⟧**.
> المراجع: التسمية `01-naming.md` · الوصف `02-description.md` · التصنيف العمري `03-age-rating.md` · اللقطات `04-screenshots.md` · ملاحظات المراجعة `05-reviewer-notes.md` · ملصقات الخصوصية `docs/legal/app-privacy-labels.md`.

## 0) قبل أن تبدأ (متطلبات)
- حساب **Apple Developer Program** فعّال، ودخول إلى App Store Connect.
- **مُعرّف الحزمة:** `com.qimmah.mobile` (مضبوط في `capacitor.config.ts`). أنشئ App ID مطابقًا في Certificates/Identifiers إن لم يكن موجودًا.
- **⟦قرار المالك⟧ استضافة الصفحات القانونية:** ملفات `public/legal/privacy.html` و`public/legal/terms.html` موجودة على فرع `legal/appstore-pack` (ليست في wave2 بعد). ادمجها/انشرها على نطاق عام (مثل `https://qimmah-8qp.pages.dev/legal/privacy.html`) واحصل على رابطين ثابتين — يلزمان في خطوتَي الخصوصية والدعم.
- **⟦قرار المالك⟧ السنّ الأدنى للأهلية:** غير محدّد في `terms-of-service.md` §3. احسمه (مثل 13+ أو 16+) قبل التصنيف العمري (راجع `03-age-rating.md`).
- **⟦قرار المالك⟧ التحليلات:** هل يضبط بناء المتجر `VITE_ANALYTICS_ENDPOINT`؟ إن لا (المُوصى به) → «بيانات الاستخدام = لا تُجمع».

## 1) بناء النسخة الصحيحة (حرِج)
```
VITE_DESIGN_V2=true npm run build && npx cap sync ios
```
> بدون `VITE_DESIGN_V2=true` سيُرفَع تصميم v1 لا واجهات v2.1 المذكورة في اللقطات (`designPreview.ts:41`). تحقّق أن شاشة «اليوم» تُظهر «مسار اليوم» بأربع حلقات قبل الأرشفة.

## 2) إنشاء سجلّ التطبيق في App Store Connect
- My Apps → **＋ New App** → Platform: **iOS**.
- **Primary Language: Arabic (Saudi Arabia)** (التطبيق عربي أولًا).
- **Name:** `قِمّة — تمرين وتغذية ولياقة` (من `01-naming.md`).
- **Bundle ID:** `com.qimmah.mobile` · **SKU:** ⟦قرار المالك⟧ (مثل `qimmah-ios-001`).

## 3) App Information
- **Subtitle:** `درّب بوضوح. تقدّم بثقة.`
- **Category:** Primary = **Health & Fitness** · Secondary ⟦قرار المالك⟧ (مثل Lifestyle).
- **Age Rating:** افتح الاستبيان وأجب **حرفيًا** حسب `03-age-rating.md` (كلها No عدا «صحة/لياقة عامة»). النتيجة تحسبها Apple — **دوّنها كما تظهر** (متوقّع 4+/9+).
- **Content Rights / legal URLs:** ألصق رابط سياسة الخصوصية (خطوة 0).

## 4) Pricing and Availability
- **Price:** ⟦قرار المالك⟧ (المتوقّع **Free**).
- **Availability:** ⟦قرار المالك⟧ (السعودية على الأقل؛ أو كل الأسواق).

## 5) App Privacy (الملصقات)
- اتبع `docs/legal/app-privacy-labels.md` **حرفيًا**.
- **Tracking = No** (لا ATT). فعّل خانة `VITE_ANALYTICS_ENDPOINT` حسب قرارك في خطوة 0.
- **⟦قرار المالك⟧** أكّد تفعيل RLS في مشروع Supabase (ادّعاء عزل البيانات) — `app-privacy-labels.md` §E.

## 6) نسخة الإصدار (Version Information)
- **Description:** انسخ النسخة العربية من `02-description.md` (ثم الإنجليزية في تعريب English).
- **Promotional Text:** الخيار 1 من `01-naming.md` (قابل للتعديل لاحقًا بلا مراجعة).
- **Keywords:** `تمرين,لياقة,تغذية,نادي,بروتين,سعرات,باركود,gym,diet,workout`
- **Screenshots:** ارفع مجموعة 6.9″ (٦ لقطات) من `04-screenshots.md` — بعد **زرع الحساب التجريبي** (خطوة 8) لتظهر بيانات حقيقية. **⟦قرار المالك⟧** مجموعة إنجليزية للمتجر الإنجليزي؟
- **Support URL / Marketing URL:** رابط الدعم (خطوة 0) · التسويق ⟦قرار المالك⟧.

## 7) App Review Information
- **Sign-In Required = YES** → **Username/Password** = بيانات الحساب التجريبي (`05-reviewer-notes.md`). **⟦قرار المالك⟧** لا تستخدم كلمة مرورك الشخصية.
- **Notes:** ألصق نص الملاحظات من `05-reviewer-notes.md` (عربي أولًا + كيفية الوصول لواجهات v2 + اختبار الباركود).
- **Contact:** اسمك وبريدك وهاتفك.

## 8) زرع الحساب التجريبي (قبل الرفع)
- نفّذ خطوات الزرع السبع في `05-reviewer-notes.md` على **نفس البناء** الذي سترفعه (أنشئ الحساب، فعّل البريد، أكمل الإعداد، سجّل تمرينًا ووجبة ووزنًا) حتى يرى المراجع شاشات ممتلئة.

## 9) الرفع عبر Xcode Organizer
- في Xcode: افتح `ios/App/App.xcworkspace` → اضبط **Version** (مثل 1.0.0) و**Build** (1) و**DEVELOPMENT_TEAM** (توقيعك).
- **Product → Archive** → **Distribute App → App Store Connect → Upload**.
- انتظر معالجة البناء في ASC (بريد تأكيد).

## 10) TestFlight
- **Internal Testing:** أضف نفسك كمختبِر داخلي وثبّت البناء وتأكّد أن واجهات v2 تظهر والحساب التجريبي يعمل.
- **External Testing:** ⟦قرار المالك⟧ (اختياري) — مجموعة خارجية تتطلب مراجعة TestFlight أولى.

## 11) الإرسال للمراجعة
- في نسخة الإصدار: **Build → اختر البناء المرفوع**.
- راجع كل الحقول (وصف/كلمات/لقطات/خصوصية/تصنيف/بيانات المراجعة).
- **⟦قرار المالك⟧ Release option:** يدوي بعد الموافقة (مُوصى به لأول إصدار) أو تلقائي.
- **Add for Review → Submit**.

## تبعية مهمة
حزمة `docs/legal/**` (سياسة الخصوصية، الشروط، الملصقات) على فرع `legal/appstore-pack` وليست مدموجة في `integration/wave2`. **يجب** دمجها/نشرها قبل تعبئة خطوتَي 5 و6 — وإلا فالروابط والملصقات غير متاحة. **⟦قرار المالك⟧**
