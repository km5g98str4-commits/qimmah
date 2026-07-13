# نشر موقع قِمّة التسويقي — Cloudflare Pages

موقع ثابت بحت (HTML/CSS + JavaScript ضئيل)، **بلا خطوة بناء** وبلا أي طلب خارجي.
جذر النشر هو مجلد `site/`. الخطوط والأصول مُستضافة ذاتيًا داخل نفس المجلد.

## المحتويات (جذر النشر = `site/`)
```
site/
├── index.html          # الصفحة الرئيسية (Hero + المزايا + قِمّة+)
├── support.html        # الدعم (تواصل + أسئلة شائعة)
├── privacy.html        # سياسة الخصوصية (AR + EN)
├── terms.html          # شروط الاستخدام (AR + EN)
├── assets/
│   ├── site.css        # نظام التصميم (Momentum) + @font-face
│   └── favicon.svg     # علامة Ascent
└── fonts/              # IBM Plex Sans Arabic (woff2، ذاتي الاستضافة)
```

## أ) النشر عبر Git (موصى به)
1. ادفع الفرع (هذا المستودع) إلى GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. اختر المستودع والفرع.
4. إعدادات البناء:
   - **Framework preset:** `None`
   - **Build command:** *(اتركه فارغًا)*
   - **Build output directory:** `site`
   - **Root directory:** *(اتركه فارغًا — الجذر)*
5. **Save and Deploy**. ستحصل على رابط `https://<project>.pages.dev`.

> ملاحظة: لأن `site/` مجلد فرعي، اضبط **Build output directory = `site`**. إن لزم، اضبط **Root directory = `site`** واترك مخرجات البناء فارغة — كلاهما يخدم نفس الملفات مباشرة.

## ب) النشر المباشر (بلا Git — Wrangler)
```bash
npx wrangler pages deploy site --project-name qimmah-site
```

## ج) نطاق مخصّص (اختياري)
1. Pages project → **Custom domains** → **Set up a domain** → مثال `qimmah.app`.
2. أضف سجل CNAME الذي يقترحه Cloudflare (أو فعّل الـ proxy إن كان النطاق على Cloudflare).
3. تصدر شهادة TLS تلقائيًا؛ انتظر حالة **Active**.

## د) الروابط في App Store Connect
بعد النشر، استخدم الروابط في **App Store Connect → التطبيق → App Information / Version**:

| حقل App Store Connect | الرابط |
|---|---|
| **Marketing URL** | `https://<domain>/` أو `/index.html` |
| **Support URL** | `https://<domain>/support.html` |
| **Privacy Policy URL** | `https://<domain>/privacy.html` |

> شروط الاستخدام (`/terms.html`) ليست حقلًا إلزاميًا في App Store Connect، لكنها مرتبطة من تذييل الموقع وصفحة الدعم.

## هـ) قبل الإطلاق العام (عناصر نائبة يملؤها المالك)
استبدل هذه المواضع بين `[ ]` في `support.html` + `privacy.html` + `terms.html`:
- `[OWNER-ENTITY]` — الجهة/الاسم المسؤول.
- `[support@OWNER-DOMAIN]` / `[OWNER-EMAIL]` — بريد الدعم.
- `[DATE]` — تاريخ آخر تحديث للوثائق القانونية.
- `[OWNER-TO-CONFIRM]` — الحد الأدنى للعمر وجهة الاختصاص القانوني.

## و) ملاحظات جودة (مضمونة في هذا الموقع)
- **صفر طلبات خارجية:** لا خطوط CDN، لا تحليلات، لا أطر — تحقّق من ذلك في تبويب Network (كل الطلبات من نفس النطاق).
- **عربي أولًا:** `lang="ar" dir="rtl"`.
- **مستجيب:** 320 → 1440 بلا تمرير أفقي.
- **تباين AA:** لوحة Momentum بمتغيّرات ink آمنة للنص الصغير.
- **بلا خطوة بناء:** انشر الملفات كما هي.
