# Pre-release Staging: P8 + P9 Assembly

هذا التقرير يوثّق تجميع مسارَي العمل غير المدموجين على `main` — **P8 (قاعدة بيانات المنتجات)** و**P9 (مصادقة Supabase)** — على فرع تجميع واحد للتحقق، **بدون أي لمسة لـ `main`**.

## الفرع

```
staging/prerelease   (مبني من origin/main @ bc1b20b)
  ← merge --no-ff origin/integration/phase8
  ← merge --no-ff origin/claude/supabase-auth-login-8uqrhc
```

مدفوع إلى: `origin/staging/prerelease` (فرع آمن، غير `main`، لم يُنشر/يُبنَى للإنتاج).

## نتيجة الدمج

| الخطوة | النتيجة |
|---|---|
| `merge origin/integration/phase8` → main | ✅ نظيف تمامًا، **بدون أي تعارض** |
| `merge origin/claude/supabase-auth-login-8uqrhc` → (main+P8) | ✅ دمج تلقائي ناجح، **بدون تعارض يدوي** |

الدمج الثاني لمس 3 ملفات مشتركة بين P8 وP9 (`src/config/strings.ts`, `src/lib/icons.ts`, `src/views/SettingsView.tsx`) — استطاع Git دمجها تلقائيًا (`Auto-merging`) لأن التعديلات كانت في مواضع مختلفة من كل ملف. لم يتطلب الأمر أي تدخل يدوي أو قرار "الإبقاء على الجانبين".

## P8 — قاعدة بيانات المنتجات (4 وكلاء)

كل الأربعة موجودون على `integration/phase8` ووصلوا لفرع التجميع:

- **A1 — قاعدة بيانات داخلية**: `src/features/products/store.ts`, `types.ts`, `resolve.ts`, `index.ts` — مفتاحها الباركود، مع dedup ومصادر وتتبّع تدقيق (audit).
- **A2 — Open Food Facts + بذرة سعودية**: `src/features/products/offSource.ts`, `saudiSeed.ts`.
- **A3 — إضافة يدوية + OCR**: `src/features/products/addProduct/` (`AddProductScreen.tsx`, `PhotoCapture.tsx`, `ocr.ts`, `strings.ts`).
- **A4 — فلاش الكاميرا + لوحة المراجعة**: فلاش/Torch داخل `src/features/barcode/BarcodeCamera.tsx` (كشف الدعم + تبديل الحالة عبر Image Capture API)، ولوحة مراجعة داخلية في `src/features/products/reviewPanel/` (`ReviewPanelView.tsx`, `seed.ts`, `strings.ts`).

تحقّق فعلي: مسار `/#/productReview` يعرض منتجًا مبذورًا ("مراجعة المنتجات — الباركود: 6281007311111") بلا أخطاء وحدة تحكّم.

## P9 — مصادقة Supabase

- `src/lib/supabase.ts` (barrel) + `src/lib/supabaseClient.ts` (المنطق الفعلي، عميل + أنواع `ProfileRow`/`Database`).
- `AuthProvider` + `useAuth()` في `src/lib/authContext.tsx`.
- `src/views/LoginView.tsx`: تبديل تسجيل دخول/إنشاء حساب (`mode: 'login' | 'signup'`) بحقلي بريد/كلمة مرور، وزر **"المتابعة كضيف"** بارز أسفل النموذج.
- **وضع الضيف سليم**: التحقق الفعلي (تشغيل المتصفح) يؤكد أن الضغط على "المتابعة كضيف" من `/#/login` ينقل مباشرة لتدفّق الإعداد `/#/setup` دون أي حاجة لحساب.
- **رابط Supabase مدمج افتراضيًا**: `DEFAULT_SUPABASE_URL` و`DEFAULT_SUPABASE_ANON_KEY` مضمّنان في `supabaseClient.ts` (anon key عام ومحمي بـ RLS حسب التوثيق الداخلي)، مع إمكانية التجاوز عبر `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` في `.env`. يعمل تسجيل الدخول بلا أي إعداد إضافي.

## البوابات (Gates) على فرع التجميع المدموج

```bash
npm install       ✅ (تحذير غير حاجب: @zxing/library يفضّل Node 24+، البيئة الحالية 22.22.2)
npm run typecheck  ✅ tsc -b --noEmit — بلا أخطاء
npm run build      ✅ tsc -b && vite build — بلا أخطاء، الحزمة تُبنى كاملة (2029 وحدة)
npm run lint        ✅ eslint --max-warnings 0 — بلا تحذيرات/أخطاء
```

## اختبار الدخان (Smoke Test)

تشغيل `vite dev` محليًا + متصفّح Chromium بلا واجهة (Playwright):

- ✅ الصفحة الرئيسية تُحمَّل (200 OK)، `dir="rtl"` و`lang="ar"` سليمان، العنوان والنصوص العربية تظهر بلا كسر.
- ✅ زر "تسجيل الدخول" ينقل إلى `/#/login` ويعرض نموذج بريد/كلمة مرور + تبديل "أنشئ حسابًا" + "المتابعة كضيف".
- ✅ "المتابعة كضيف" ينقل إلى `/#/setup` (تدفّق الإعداد) بلا أي عطل.
- ✅ `/#/productReview` يعرض لوحة مراجعة المنتجات ببيانات مبذورة.
- ✅ `/#/settings` يعرض حالة "ضيف" وزر تسجيل الدخول بشكل صحيح.
- ⚠️ خطأ شبكة واحد غير متعلق بالكود: طلب خط Google Fonts (`fonts.googleapis.com`) فشل بـ `ERR_CONNECTION_CLOSED` — بسبب حجب الشبكة الصادرة في بيئة التحقق (sandbox)، وليس عطلاً في التطبيق. لا أخطاء JavaScript (`pageerror`/`console.error`) غير هذا.

## المخاطر / ملاحظات

- لا تعارضات دمج حقيقية — التقاطع بين P8 وP9 كان سطحيًا (ثلاثة ملفات مشتركة، تعديلات غير متداخلة سطريًا).
- `.env.example` يوثّق أن مفتاح Supabase anon مدمج بشكل متعمّد وآمن (RLS)، حسب تعليق المطوّر داخل `supabaseClient.ts` — يستحق مراجعة بشرية أخيرة قبل الإطلاق للتأكد من أن سياسات RLS مُفعّلة فعليًا على مشروع Supabase المرتبط بهذا المفتاح.
- طبقة مزامنة البيانات السحابية (ربط أنواع الجداول الكاملة بـ `Database` في `createClient<Database>`) مؤجّلة عمدًا (seam) — موثّقة كتعليق في `supabaseClient.ts`، وليست ضمن نطاق P9 الحالي.
- تحذير `npm install` بخصوص `@zxing/library` (يفضّل Node ≥24، البيئة الحالية 22.22.2) غير حاجب للبناء لكنه يستحق رصدًا عند ترقية بيئة CI/الإنتاج.

## خطوة الإطلاق (Go-Live) عندما يعود زياد

فرع التجميع هذا **للتحقق فقط** ولم يُدمج بـ `main`. خطوة الإطلاق الوحيدة المطلوبة:

```bash
git checkout main
git pull origin main
git merge --no-ff staging/prerelease -m "Release: P8 product DB + P9 Supabase auth"
git push origin main
```

(بديل مكافئ: فتح Pull Request من `staging/prerelease` إلى `main` عبر GitHub ثم الدمج بعد مراجعة زياد.)

لم يتم تنفيذ أي نشر (deploy) أو دمج لـ `main` كجزء من هذه المهمة.
