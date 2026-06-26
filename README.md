# Gym OS — قالب ويب فاخر للياقة والتغذية

قالب تجاري جاهز للبيع والتخصيص، مصمّم لمتابعة **التمارين، المكملات، الأدوية، التغذية، القياسات، الروتين، والأهداف**. عربي أولاً (RTL)، Dark mode فاخر، Mobile-first، ومناسب للسوق السعودي/الخليجي.

> **بدون backend** — كل البيانات تُغذّى من ملفات `src/config` و `src/data`، فيسهل على المشتري التخصيص دون لمس الكود.

---

## ⚙️ المتطلبات

- Node.js 20 أو أحدث
- npm 10 أو أحدث

## 🚀 التشغيل محليًا

```bash
npm install      # تثبيت الاعتماديات
npm run dev      # تشغيل خادم التطوير (افتراضيًا http://localhost:5173)
```

أوامر أخرى:

```bash
npm run build      # بناء نسخة الإنتاج إلى مجلد dist/
npm run preview    # معاينة نسخة الإنتاج محليًا
npm run typecheck  # فحص الأنواع فقط
npm run lint       # فحص الجودة (ESLint)
```

---

## 🎨 التخصيص — أين يغيّر المشتري بياناته؟

كل المحتوى القابل للتعديل **مركزي** في مجلدي `config` و `data`. لا حاجة لتعديل المكونات.

| ما تريد تغييره | الملف |
|---|---|
| اسم المنتج، الشعار، الوصف، روابط CTA | `src/config/site.ts` |
| روابط التنقل في الهيدر/الفوتر | `src/config/site.ts` |
| ألوان الهوية في قسم التخصيص | `src/config/theme.ts` |
| الميزات وإحصائيات الـ Hero | `src/data/features.ts` |
| بطاقات اللوحة ورسم التقدّم | `src/data/dashboard.ts` |
| تمارين اليوم | `src/data/workout.ts` |
| المكملات والأدوية | `src/data/supplements.ts` |
| الوجبات وأهداف الماكروز | `src/data/meals.ts` |
| قياسات الجسم | `src/data/metrics.ts` |
| الروتين الأسبوعي | `src/data/routine.ts` |
| خطط الأسعار | `src/data/pricing.ts` |

### تغيير الألوان (الهوية البصرية)
لوحة الألوان الأساسية في `tailwind.config.js` تحت `theme.extend.colors` — عدّل `brand` و `gold` و `ink` لتغيير الطابع العام.

### تغيير الخط
الخط الافتراضي **Tajawal** (يدعم العربية) محمّل في `index.html` ومعرّف في `tailwind.config.js`.

### المتغيرات البيئية (اختياري)
انسخ `.env.example` إلى `.env` وعدّل:

```bash
VITE_APP_NAME="اسم منتجك"
VITE_CONTACT_URL="https://wa.me/9665XXXXXXXX"
VITE_CHECKOUT_URL="https://رابط-الدفع"
```

> لا تضع أي أسرار أو مفاتيح API هنا — هذا المشروع frontend فقط، وأي قيمة `VITE_*` تكون **مرئية للعموم** في نسخة الإنتاج.

---

## ☁️ النشر

### Netlify
المشروع يحتوي `netlify.toml` جاهز:
1. اربط المستودع بـ Netlify (أو اسحب مجلد `dist/` بعد `npm run build`).
2. أمر البناء: `npm run build` — مجلد النشر: `dist`.
3. الإعدادات تُلتقط تلقائيًا من `netlify.toml`.

### Vercel
المشروع يحتوي `vercel.json` جاهز:
1. استورد المشروع في Vercel — سيتعرّف على إطار Vite تلقائيًا.
2. أمر البناء: `npm run build` — مخرجات: `dist`.
3. أو عبر CLI: `vercel` ثم `vercel --prod`.

كلا الإعدادين يتضمنان توجيه SPA (كل المسارات → `index.html`).

---

## 📁 هيكلة الملفات

```
gym-os-template/
├─ public/                 # أصول ثابتة (favicon)
├─ src/
│  ├─ components/          # مكونات واجهة مشتركة (Header, Footer, Icon, ...)
│  ├─ sections/           # أقسام الصفحة (Hero, Dashboard, Pricing, ...)
│  ├─ config/             # إعدادات الموقع والهوية (site.ts, theme.ts)
│  ├─ data/               # محتوى الأقسام القابل للتعديل
│  ├─ lib/                # أدوات مساعدة (cn, icons)
│  ├─ types/              # أنواع TypeScript المشتركة
│  ├─ styles/             # ستايلات Tailwind العامة
│  ├─ App.tsx             # تركيب الأقسام
│  └─ main.tsx            # نقطة الدخول
├─ .claude/rules/          # قواعد عمل للوكيل (frontend, product, security, copywriting)
├─ CLAUDE.md               # تعليمات الوكيل
├─ PRODUCT.md / PRD.md / ROADMAP.md
├─ netlify.toml / vercel.json
├─ tailwind.config.js
└─ vite.config.ts
```

---

## 📄 الترخيص
قالب تجاري. التفاصيل تُحدَّد عند البيع.
