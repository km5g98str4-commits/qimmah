# قواعد الـ Frontend

## التقنيات
- React 18 + TypeScript (strict) + Vite + Tailwind CSS.
- أيقونات من `lucide-react` عبر `src/lib/icons.ts` فقط — لا استيراد مباشر داخل الأقسام.

## RTL والعربية
- الصفحة `dir="rtl"`. استخدم خصائص Tailwind المنطقية:
  - `ms-*`/`me-*` بدل `ml-*`/`mr-*`.
  - `ps-*`/`pe-*` بدل `pl-*`/`pr-*`.
  - `text-start`/`text-end` بدل `text-left`/`text-right`.
  - `start-*`/`end-*` بدل `left-*`/`right-*`.
- تجنّب أي قيمة اتجاهية ثابتة تكسر العربية.

## Responsive (Mobile-first)
- ابدأ بأنماط الجوال، ثم وسّع: `sm:` (640) `md:` (768) `lg:` (1024).
- اختبر عند 320px و768px و1280px.
- استخدم `container-page` للحاوية القياسية.

## الأنماط
- أعد استخدام أصناف `styles/index.css`: `.btn-primary` `.btn-ghost` `.card` `.glass` `.heading` `.subheading` `.eyebrow` `.section`.
- لا تكرّر قيم الألوان الخام؛ استخدم لوحة `tailwind.config.js` (`brand`, `gold`, `ink`).
- ادمج الأصناف الشرطية عبر `cn()` من `src/lib/cn.ts`.

## المكونات
- مكوّن واحد لكل ملف، تصدير مُسمّى (عدا `App`).
- المكوّن يستقبل بياناته من `data/`/`config/` — لا يحتوي محتوى ثابتًا.
- أبقِ المكونات نقية وبسيطة؛ الحالة المحلية فقط عند الحاجة (هيدر/قائمة).

## الجودة
- `npm run typecheck` و`npm run build` يجب أن يمرّا.
- لا `any` غير مبرّر، لا متغيرات غير مستخدمة.
- إمكانية الوصول: `aria-label` للأزرار الأيقونية، `alt`/`role` للصور والرسوم.
