# Phase 4 — Final Integration & QA

توثيق الدمج النهائي للمرحلة الرابعة: دمج خمسة فروع مستقلّة في `integration/phase4`،
مع بوّابات جودة بعد كل دمج، ثم اختبار QA شامل قبل النشر إلى `main`.

/ This document records the Phase 4 final integration: five independent feature
branches merged into `integration/phase4`, quality gates after each merge, and a
full QA pass before release to `main`.

---

## 1) الفروع المدموجة (كلها موجودة على origin، ولم يكن أيٌّ منها مدموجًا)

| # | الفرع | الميزة | الدمج | التعارضات |
|---|-------|--------|-------|-----------|
| 1 | `claude/muscle-map-react-body-epbjc5` | خريطة العضلات عبر `react-body-highlighter` (حذف `bodyAnatomy.ts` القديم) | نظيف | — |
| 2 | `claude/p4-achievements-medals-w2z1l2` | محرّك الأوسمة/الإنجازات + بطاقة لوحة التحكم + Toaster | نظيف | — |
| 3 | `claude/p4-nutrition-transparency-7lo0mv` | أحجام المطاعم + عناصر بقالة/مشروبات + شفافية السعرات | تعارض بسيط | `package.json` (سكربتات proof) |
| 4 | `claude/p4-english-i18n-gzj8g9` | طبقة i18n (ar افتراضي) + `LanguageProvider` + مبدّل اللغة | تعارض جوهري | `src/components/WeeklyMuscleMap.tsx` |
| 5 | `claude/phase4-final-qa-deploy-87ofjx` | إصلاح كاش الصور SW v1→v2 + تثبيت PWA + تنبيهات صادقة | تعارض بسيط | `src/views/SettingsView.tsx` |

**كل الفروع الخمسة وُجدت ودُمجت** (FOUND ×5). بوّابة الجودة (`build` + `lint` + `typecheck`)
مرّت بعد كل دمج على حدة (GATES_OK 1→5).

## 2) حلّ التعارضات — «اتحاد الميزات» (Keep BOTH)

- **`package.json`** (فرع 3): أبقينا سكربتي الإثبات معًا — `proof:achievements` و`proof:p4a3`.
- **`WeeklyMuscleMap.tsx`** (فرع 4 ضدّ فرع 1): الأهم. فرع 4 أضاف i18n فوق نسخة SVG اليدوية
  القديمة، بينما فرع 1 أعاد كتابة المكوّن على `react-body-highlighter`. **أبقينا عرض المكتبة
  (المطلوب) وطبّقنا نصوص i18n فوقه** — عنوان/مبدّل/وسيلة الإيضاح/الـ aria من قاموس
  `progressScreen`، مع اختيار العضلة عبر slugs المكتبة (`SLUG_LABEL_AR`). حُذف تمامًا الجسم
  اليدوي القديم (silhouette/clothing/garment الرمادي).
- **`SettingsView.tsx`** (فرع 5 ضدّ فرع 4): أبقينا **كليهما** — قسم `DeviceSettings` (تثبيت PWA +
  تنبيهات) وقسم اللغة الحيّ (`LanguageToggle`). ألغينا صياغة «الإنجليزية قيد التطوير» التي
  كانت من فرع 5، لأن i18n صار مدموجًا والمبدّل مُفعّل.

## 3) تفعيل مبدّل اللغة ar↔en

`LanguageProvider` (فرع 4) يلفّ التطبيق في `main.tsx`، ويطبّق `<html lang dir>` (RTL للعربية /
LTR للإنجليزية) ويحفظ الاختيار في `localStorage`. المبدّل مُفعّل وظاهر في:
- الهيدر (`MobileShell`) — نسخة compact.
- صفحة البداية (`StartView`) — compact.
- الإعدادات (`SettingsView`) — segmented.

**تم التحقق حيًّا**: النقر يقلب الاتجاه `rtl → ltr` و`lang` إلى `en`.

### الشاشات المترجمة جزئيًا (fallback إلى العربية في وضع EN — مقبول وموثّق)
اللغة الأساسية للواجهة مترجمة (لوحة التحكم/التمرين/التغذية/التقدّم/الملف/المكتبة/الإعدادات).
النصوص التالية **عربية فقط** وتظهر بالعربية حتى في وضع EN:
- **الأوسمة/الإنجازات**: عناوين ووصف الأوسمة في `src/data/achievements.ts` وبطاقة/Toaster
  الإنجازات (نصوص مثل «القادم:») — عربية فقط.
- **شفافية السعرات**: عناوين `CalorieExplainer` (مثل «كيف نحسب سعراتك؟») — عربية فقط.
- **بيانات الأطعمة الجديدة**: أسماء عناصر البقالة/المشروبات/أحجام المطاعم في `foodItems.ts`
  (`servingLabelAr`) — عربية فقط (بيانات محتوى).
- **تسمية العضلة المختارة** في خريطة العضلات (`SLUG_LABEL_AR` + «اضغط عضلة ثانية للتفاصيل») — عربية فقط.

هذا مقبول ضمن نطاق المرحلة: المفاتيح الأحدث (أوسمة/تغذية) ترتدّ إلى العربية في وضع EN بدل كسر البناء.

## 4) Service Worker — الإصدار v2 (إصلاح كاش الصور)

- `public/sw.js` و`dist/sw.js`: `const VERSION = 'qimmah-v2'`. **مؤكَّد**.
- عند التفعيل يُحذف أي كاش لا يبدأ بـ `qimmah-v2` → المستخدمون العائدون يتخلّصون من كاش v1
  التالف ويحصلون على الصور من جديد (stale-while-revalidate لأصول نفس الأصل، 136 مجلّد صور تمارين في `dist/exercise-images`).

## 5) PWA + التنبيهات الصادقة
- `src/lib/pwa.ts` + `DeviceSettings.tsx` + `InstallBanner.tsx` حاضرة ومدموجة.
- تثبيت PWA عبر `beforeinstallprompt`، مع توضيح صادق لحدود iOS. تنبيهات محلية صادقة
  (لا مزامنة صحّية وهمية).

---

## جدول QA

بيئة: بناء الإنتاج مُقدَّم عبر `vite preview` على 4173، متصفح Chromium (Playwright).

| # | فحص | طريقة | نتيجة |
|---|------|-------|-------|
| 1 | يبني بلا أخطاء | `npm run build` | ✅ |
| 2 | Lint (0 تحذير) | `npm run lint` | ✅ |
| 3 | Typecheck | `npm run typecheck` | ✅ |
| 4 | إقلاع نظيف بلا أخطاء console | متصفح | ✅ |
| 5 | localStorage تالف → لا انهيار | حقن JSON فاسد ثم تحميل | ✅ (يُصيّر، 0 أخطاء) |
| 6 | التنقّل بين كل التبويبات | نقر 5/5 تبويبات | ✅ |
| 7 | Onboarding → قشرة التطبيق | حالة completed → dashboard | ✅ |
| 8 | بطاقة الإنجازات على لوحة التحكم | متصفح | ✅ |
| 9 | خريطة العضلات تُصيَّر نظيفة (react-body-highlighter) | svg واحد تحت aria الخريطة | ✅ |
| 10 | شفافية السعرات (Calorie Explainer) | نصّ «كيف نحسب سعراتك؟» | ✅ |
| 11 | مبدّل اللغة ar↔en + الاتجاه | rtl→ltr، lang=en | ✅ |
| 12 | SW يُقدَّم بإصدار v2 | fetch(/sw.js) | ✅ |
| 13 | أحجام المطاعم (صغير/وسط/كبير بماكروز) | `foodItems.ts` + proof p4a3 | ✅ |
| 14 | عناصر بقالة/مشروبات جديدة (27) | proof p4a3 | ✅ |
| 15 | إثبات الأوسمة (19 وسام، تُفتح مرّة وتثبت) | `proof:achievements` | ✅ |
| 16 | إثبات التغذية (57 + SSR 6) | `proof:p4a3` | ✅ |
| 17 | ثبات التمرين (localStorage) | `qimmah:workoutSessions:v1` | ✅ |
| 18 | الصور تُحمَّل (SW v2, أصول محلية) | dist/exercise-images (136) | ✅ |

## الخطوط الحمراء (Red lines) — ملتزمة
- لا نصائح طبية؛ التنويهات الصحّية حاضرة (`healthDisclaimer`).
- BMI/القياسات وصفية لا تشخيصية.
- لا مزامنة صحّية وهمية؛ التنبيهات محلية وصادقة.
- صور محتشمة، لا وسائط مكسورة، لا أصول محفوظة الحقوق (صور تمارين محلية مولّدة).

## المخاطر المتبقية
- ترجمة جزئية في وضع EN لشاشات الأوسمة/شفافية السعرات وأسماء الأطعمة (موثّقة أعلاه) —
  مقبولة لـ v1؛ تُستكمل مفاتيحها لاحقًا.
- `npm audit` يبلّغ عن ثغرات في اعتماديات التطوير (غير مؤثّرة على حزمة الإنتاج).
