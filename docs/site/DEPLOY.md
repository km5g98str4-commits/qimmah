# نشر موقع قِمّة التسويقي — Cloudflare Pages

موقع ثابت بحت (HTML/CSS + JavaScript ضئيل)، **بلا خطوة بناء** وبلا أي طلب خارجي.
جذر النشر هو مجلد `site/`. الخطوط والأصول مُستضافة ذاتيًا داخل نفس المجلد.

## المحتويات (جذر النشر = `site/`)
```
site/
├── index.html          # الصفحة الرئيسية (Hero + المزايا + قِمّة+) + JSON-LD
├── support.html        # الدعم (تواصل + أسئلة شائعة)
├── privacy.html        # سياسة الخصوصية (AR + EN)
├── terms.html          # شروط الاستخدام (AR + EN)
├── 404.html            # صفحة «غير موجودة» (يخدمها Cloudflare تلقائيًا)
├── robots.txt          # يسمح بالفهرسة + يشير إلى sitemap
├── sitemap.xml         # خريطة الصفحات الأربع
├── _headers            # ترويسات Cloudflare (CSP ذاتي فقط + أمان + كاش)
├── assets/
│   ├── site.css        # نظام التصميم (Momentum) + @font-face
│   ├── favicon.svg     # علامة Ascent
│   ├── apple-touch-icon.png  # أيقونة iOS (180×180)
│   └── og-image.png    # بطاقة المشاركة (1200×630)
└── fonts/              # IBM Plex Sans Arabic (woff2، ذاتي الاستضافة)
```

> **ملاحظة النطاق:** الروابط المطلقة في `robots.txt`, `sitemap.xml`, `canonical`,
> و`og:image` تفترض النطاق **`https://qimmah.app`**. إن اختلف النطاق النهائي، استبدله
> في هذه الملفات (بحث/استبدال لـ `qimmah.app`). الملفات النسبية (CSS/الخطوط/الأيقونات)
> لا تحتاج تعديلًا. ملف `_headers` يُطبّق CSP `default-src 'self'` — لا يتطلب النطاق.

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

## هـ) العناصر النائبة — ✅ مُلئت

`support.html` و`privacy.html` و`terms.html` **لم يعد فيها أي موضع نائب**:

| كان | صار |
|---|---|
| `[OWNER-EMAIL]` · `support@qimmah.app` | `qimmah.support@gmail.com` |
| `[DATE]` | ٣٠ يوليو ٢٠٢٦ |
| الحد الأدنى للعمر «١٣» | **١٢** — قرار المؤسس النهائي؛ حد البالغين الرقمي يبقى ١٨ |
| جهة الاختصاص `[OWNER-TO-CONFIRM]` | الجهات القضائية المختصّة في المملكة |
| وسم «مسوّدة للمراجعة القانونية» | أُزيل |

**يحرس ذلك إثبات في البوابة:** `npm run test:site-truth` يفشل إن عاد أي موضع نائب أو بريد قديم أو تصريح غير صحيح.

### الباقي الوحيد
`press.html` ما زال يحمل `[FOUNDER-NAME]` و`[FOUNDER-TITLE]`. الصفحة **ليست في `sitemap.xml`** ولا مربوطة من أي صفحة، ووُضع عليها `noindex` مؤقّتًا. بعد ملء الاسم والنبذة، أعِد سطر `robots` إلى `index,follow` (السطر موثّق داخل الملف).

## و) ملاحظات جودة (مضمونة في هذا الموقع)
- **صفر طلبات خارجية:** لا خطوط CDN، لا تحليلات، لا أطر — تحقّق من ذلك في تبويب Network (كل الطلبات من نفس النطاق).
- **عربي أولًا:** `lang="ar" dir="rtl"`.
- **مستجيب:** 320 → 1440 بلا تمرير أفقي.
- **تباين AA:** لوحة Momentum بمتغيّرات ink آمنة للنص الصغير.
- **بلا خطوة بناء:** انشر الملفات كما هي.
