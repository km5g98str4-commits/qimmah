# Gym OS — قالب ويب فاخر للياقة والتغذية

قالب تجاري جاهز للبيع والتخصيص، مصمّم لمتابعة **التمارين، المكملات، الأدوية، التغذية، القياسات، الروتين، والأهداف**. عربي أولاً (RTL)، Dark mode فاخر، Mobile-first، ومناسب للسوق السعودي/الخليجي.

> **بدون backend** — كل البيانات تُغذّى من ملفات `src/config` و `src/data`، فيسهل على المشتري التخصيص دون لمس الكود.

---

## ⚙️ المتطلبات
- Node.js 20 أو أحدث
- npm 10 أو أحدث

## 🚀 1) كيف تشغّل المشروع

```bash
npm install      # تثبيت الاعتماديات (مرة واحدة)
npm run dev      # خادم التطوير → http://localhost:5173
```

أوامر أخرى:

```bash
npm run build      # بناء نسخة الإنتاج إلى dist/
npm run preview    # معاينة نسخة الإنتاج محليًا
npm run typecheck  # فحص الأنواع
npm run lint       # فحص الجودة
```

---

## 🎨 2) كيف تغيّر الاسم والهوية والألوان

### أ) الاسم والروابط والشعار النصي
كل هوية المنتج في ملف واحد: **`src/config/product.ts`**

```ts
export const product = {
  name: 'Gym OS',                 // ← اسم منتجك
  tagline: 'نظامك الكامل للياقة', // ← الشعار
  description: '...',             // ← وصف يظهر في الفوتر و meta
  contactUrl: '#pricing',         // ← رابط زر «تواصل معنا»
  checkoutUrl: '#pricing',        // ← رابط زر الشراء
  ctaLabel: 'ابدأ الآن',          // ← نص زر الهيدر
  footerNote: '...',
  rightsNote: '...',
  year: 2026,
}
```

روابط التنقّل (الهيدر/الفوتر) في نفس الملف ضمن `nav`.

> يمكنك أيضًا ضبط الاسم والروابط دون لمس الكود عبر `.env` (انظر القسم الأخير).

### ب) الألوان (الهوية البصرية)
لوحة الألوان في **`tailwind.config.js`** تحت `theme.extend.colors`:

```js
colors: {
  brand: { 500: '#10b981', ... },  // ← اللون الأساسي
  gold:  { 500: '#d4af37', ... },  // ← اللون الثانوي (فخامة)
  ink:   { 950: '#06070a', ... },  // ← خلفيات داكنة
}
```
غيّر قيم `brand` لتبديل طابع المنتج بالكامل. خيارات اللون المعروضة في قسم «التخصيص» تُعدّل من **`src/config/theme.ts`**.

### ج) الخط
الخط الافتراضي **Tajawal** (يدعم العربية) — محمّل في `index.html` ومعرّف في `tailwind.config.js`.

### د) النصوص التسويقية (عناوين الأقسام)
كل عناوين وأوصاف الأقسام في **`src/config/content.ts`** — عدّلها دون لمس المكونات.

---

## 🏋️ 3) كيف تغيّر التمارين والمكملات والوجبات

كل بيانات الأقسام في مجلد **`src/data/`** — ملف لكل قسم، معرّف بنوع TypeScript يرشدك للحقول المطلوبة:

| القسم | الملف | المحتوى |
|---|---|---|
| التمارين | `src/data/workouts.ts` | تمرين اليوم: الاسم، العضلة، المجموعات، التكرارات، الوزن، الحالة |
| المكملات والأدوية | `src/data/supplements.ts` | الاسم، الجرعة، التوقيت، النوع (`supplement`/`medication`) |
| الوجبات والماكروز | `src/data/meals.ts` | الوجبات + أهداف البروتين/الكارب/الدهون/السعرات |
| قياسات الجسم | `src/data/metrics.ts` | الوزن، الدهون، الكتلة، المحيطات + نسبة التغيّر |
| الروتين الأسبوعي | `src/data/routine.ts` | 7 أيام + نوع كل يوم + حالة الإنجاز |
| اللوحة | `src/data/dashboard.ts` | بطاقات سريعة + نقاط رسم التقدّم |
| الميزات | `src/data/features.ts` | بطاقات الميزات + إحصائيات الـ Hero |
| الأسعار | `src/data/pricing.ts` | خطط الأسعار وميزاتها |

**مثال — إضافة مكمّل** في `src/data/supplements.ts`:
```ts
{
  name: 'فيتامين C',
  dose: '1000 ملغ',
  timing: 'مع الإفطار',
  type: 'supplement',   // أو 'medication'
  taken: false,
}
```
الواجهة تسحب هذه البيانات تلقائيًا — لا حاجة لتعديل أي مكوّن.

---

## ☁️ 4) كيف تنشر على Netlify أو Vercel

### Netlify (`netlify.toml` جاهز)
1. اربط المستودع بـ Netlify (أو اسحب مجلد `dist/` بعد `npm run build`).
2. أمر البناء: `npm run build` — مجلد النشر: `dist`.
3. الإعدادات تُلتقط تلقائيًا (مع توجيه SPA).

### Vercel (`vercel.json` جاهز)
1. استورد المشروع في Vercel — يتعرّف على Vite تلقائيًا.
2. أمر البناء: `npm run build` — المخرجات: `dist`.
3. أو عبر CLI: `vercel` ثم `vercel --prod`.

---

## 🔐 5) المتغيرات البيئية (اختياري)
انسخ `.env.example` إلى `.env` وعدّل:

```bash
VITE_APP_NAME="اسم منتجك"
VITE_CONTACT_URL="https://wa.me/9665XXXXXXXX"
VITE_CHECKOUT_URL="https://رابط-الدفع"
```

> ⚠️ لا تضع أي أسرار أو مفاتيح API — هذا مشروع frontend، وأي قيمة `VITE_*` **مرئية للعموم** في نسخة الإنتاج.

---

## 📁 هيكلة الملفات

```
gym-os-template/
├─ public/                 # أصول ثابتة (favicon)
├─ src/
│  ├─ components/          # مكونات واجهة مشتركة (Header, Footer, Icon, ...)
│  ├─ sections/           # أقسام الصفحة (Hero, Dashboard, Pricing, ...)
│  ├─ config/             # ← هوية المنتج: product.ts · theme.ts · content.ts
│  ├─ data/               # ← محتوى الأقسام: workouts, supplements, meals, ...
│  ├─ lib/                # أدوات مساعدة (cn, icons)
│  ├─ types/              # أنواع TypeScript المشتركة
│  ├─ styles/             # ستايلات Tailwind العامة
│  ├─ App.tsx             # تركيب الأقسام
│  └─ main.tsx            # نقطة الدخول
├─ .claude/rules/          # قواعد العمل (frontend, product, security, copywriting)
├─ CLAUDE.md · PRODUCT.md · PRD.md · ROADMAP.md
├─ netlify.toml · vercel.json
├─ tailwind.config.js · vite.config.ts
└─ .env.example
```

---

## 🧭 خلاصة سريعة للمشتري
| تريد تغيير… | افتح |
|---|---|
| الاسم/الروابط/CTA | `src/config/product.ts` |
| الألوان | `tailwind.config.js` |
| نصوص الأقسام | `src/config/content.ts` |
| التمارين/المكملات/الوجبات/القياسات/الروتين | `src/data/*.ts` |
| الأسعار | `src/data/pricing.ts` |

## 📄 الترخيص
قالب تجاري. التفاصيل تُحدَّد عند البيع.
