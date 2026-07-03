# CLAUDE.md — Gym OS Template

تعليمات العمل على هذا المشروع لأي وكيل (Claude Code).

## ما هو المشروع
قالب ويب تجاري (Landing + معاينة منتج) لنظام لياقة شامل: تمارين، مكملات، أدوية، تغذية، قياسات، روتين، أهداف. **Frontend فقط** — لا backend حاليًا.

## التقنيات
- React 18 + TypeScript + Vite
- Tailwind CSS (Dark mode عبر `class`)
- lucide-react للأيقونات
- بدون مكتبات رسم خارجية (رسم SVG محلي)

## مبادئ أساسية (التزم بها)
1. **Data-driven**: أي نص أو رقم قابل للتخصيص يجب أن يكون في `src/config` (`product.ts`, `theme.ts`, `content.ts`) أو `src/data` — ممنوع hardcoding داخل المكونات.
2. **RTL أولاً**: التصميم عربي (`dir="rtl"`). استخدم خصائص منطقية (`ms-`, `me-`, `text-start`, `text-end`) لا `left/right`.
3. **Mobile-first**: ابدأ من الجوال ثم وسّع بـ `sm: md: lg:`.
4. **هوية موحّدة**: استخدم أصناف `.btn-primary`, `.card`, `.heading`, `.eyebrow`, `.container-page` من `styles/index.css`.
5. **بدون أسرار**: أي `VITE_*` مرئي للعموم. لا مفاتيح API في الكود أو `.env.example`.

## بنية الإضافة
- قسم جديد → ملف في `src/sections/` + بياناته في `src/data/` + تركيبه في `src/App.tsx`.
- أيقونة جديدة → استوردها في `src/lib/icons.ts` وأضفها للخريطة.
- نوع بيانات جديد → `src/types/index.ts`.

## النشر (Hosting)
- **الاستضافة انتقلت نهائيًا من Netlify إلى Cloudflare Pages** (2026-07). لا تفحص Netlify ولا تعتمد عليه.
- مشروع Cloudflare Pages: `qimmah` — ينشر تلقائيًا من `main`.
- رابط الإنتاج: https://qimmah-8qp.pages.dev
- فروع المعاينة تُنشر على نطاقات فرعية مثل `https://integration-p10-1.qimmah-8qp.pages.dev`.
- للتحقق من النسخة المنشورة: `BUILD_LABEL` (الفوتر/console) يعرض هاش الـ commit.

## قبل التسليم
```bash
npm run typecheck && npm run build
```
يجب أن يمرّا بلا أخطاء.

## أسلوب
- نفّذ المهام كاملة وبأقل أسئلة.
- لا تغيّر الهوية البصرية إلا لتحسين الجودة.
- راجع `.claude/rules/` قبل أي تعديل كبير.
