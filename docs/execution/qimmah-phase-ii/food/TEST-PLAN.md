# Phase II Food — TEST PLAN

> **الحالة:** خطة تحقق قبل التنفيذ. أسماء الفحوص المستقبلية ليست أوامر موجودة، ولا
> تُسجل `PASS` حتى تعمل على مخرج كامل من input ذي بصمة.

## 1. مبادئ القبول

- fixture يثبت القاعدة، لكنه لا يثبت التشغيل الكامل.
- كل استثناء له تأكيد مضاد يحاكي التفافًا ويفشل باسم القاعدة.
- أي crash تقني يتحول إلى فشل مسمى؛ لا سقوط صامت.
- كل عداد في التقرير يعاد حسابه من artifact أو row ledger، لا من نص التقرير.
- لا يُختبر runtime قبل اعتماد Web HEAD؛ اختبارات pipeline المستقلة تبدأ قبله.

## 2. فحوص baseline لهذه الموجة

| Test ID | الأمر | الغرض | كتابة متوقعة في الشجرة |
|---|---|---|---|
| FOOD-BL-001 | `node scripts/run-food-db-proof.mjs` | جودة 641 صنفًا وقيم baseline | لا تغيير متتبع؛ قد ينشئ bundle مؤقتًا ويحذفه |
| FOOD-BL-002 | `node scripts/run-saudi-foods-proof.mjs` | 130 طبقًا سعوديًا والبحث والوصول | لا تغيير متتبع؛ bundle مؤقت محذوف |
| FOOD-BL-003 | `npm run typecheck` | سلامة TypeScript على baseline | لا مخرج بناء مقصود |
| FOOD-BL-004 | `npm run lint` | سلامة lint على baseline | لا مخرج بناء مقصود |
| FOOD-BL-005 | `git diff --check` | whitespace وأخطاء patch | قراءة فقط |
| FOOD-BL-006 | `git diff --name-only` | حارس docs-only | قراءة فقط |

## 3. DATA-1 — schema والمصادر

| Test ID | الفحص | نتيجة القبول | الهجوم المضاد المطلوب |
|---|---|---|---|
| FOOD-D1-001 | source snapshot fingerprint | الحجم وSHA-256 يطابقان الملف المقروء | تغيير بايت واحد يسقط `input fingerprint mismatch` |
| FOOD-D1-002 | اكتمال التنزيل | gzip/stream EOF سليم و`complete_download=true` | ملف مبتور يسقط باسمه ولا ينتج build نهائيًا |
| FOOD-D1-003 | schema parity | JSON Schema والعقد البرمجي يحملان الحقول والإصدارات نفسها | حقل زائد في جهة واحدة يسقط |
| FOOD-D1-004 | licence registry | كل مصدر مستعمل يحمل رخصة ودليلًا وحكم استعمال | مصدر `USED` بلا license evidence يسقط |
| FOOD-D1-005 | robots/access policy | bulk ingest يستخدم المسار المسموح فقط | إدخال URL لمسار ممنوع يسقط قبل الشبكة |
| FOOD-D1-006 | rights-clean media | `image_url` لا يُملأ بلا سجل حقوق | رابط صورة بلا rights evidence يسقط |
| FOOD-D1-007 | SFDA truth | الحجب أو الوصول يسجلان بنتيجة حديثة | timeout لا يتحول إلى `NOT_FOUND` أو نجاح |

## 4. DATA-2 — parsing والتطبيع والجودة

| Test ID | الفحص | نتيجة القبول | الهجوم المضاد المطلوب |
|---|---|---|---|
| FOOD-D2-001 | row accounting | طرفا معادلة raw outcomes متساويان | صف قصير يؤدي إلى عدم توازن وفشل مسمى |
| FOOD-D2-002 | short-row rejection | كل صف أقل من الأعمدة المطلوبة له outcome وسبب ورقم صف | `continue` صامت يسقط الحارس |
| FOOD-D2-003 | unique rejects | `unique_rejected_rows` مستقل عن مجموع الأسباب | صف بعلمين لا يُعد صفين مرفوضين |
| FOOD-D2-004 | GTIN lengths/check digit | 8/12/13/14 الصحيحة تمر والخاطئة ترفض | placeholder صالح checksum لا يمر |
| FOOD-D2-005 | raw preservation | كل تحويل مهم يعرض raw value/ref وtransformation code | حذف raw sodium أو energy يسقط |
| FOOD-D2-006 | negative nutrients | السالب في macro/sodium/micronutrient يرفض بعلم الحقل | إسقاط micronutrient سالب إلى `null` يسقط |
| FOOD-D2-007 | energy units | kJ/kcal معلنان ولا تصحيح تخميني صامت | 2000 kcal المشتبه لا يتحول تلقائيًا إلى kcal/4.184 |
| FOOD-D2-008 | sodium units/fallback | sodium/salt conversion مسجل؛ الحقل السالب لا يُتجاوز صامتًا | sodium سالب مع salt صالح يبقى رفضًا مسمى |
| FOOD-D2-009 | serving basis | 100g/100ml/serving confusion موسوم | حصّة كبيرة لا تُعامل أساس 100g بلا إشارة |
| FOOD-D2-010 | schema full ingest | كل accepted candidate يمر JSON Schema | سجل واحد ناقص source يفشل التشغيل الكامل |
| FOOD-D2-011 | brand aliases | قاموس aliases ذو نسخة ويعمل باتجاه معلن | كلمة قريبة خارج القاموس لا تتكافأ |
| FOOD-D2-012 | Arabic normalization | التشكيل/التطويل/الألف/التاء/الياء تعمل دون توسع زائد | جارة حرفية غير مقصودة لا تتطابق |
| FOOD-D2-013 | fuzzy semantics | المرشح يحمل algorithm/version/score/threshold ولا يدمج | normalized exact لا يسمى fuzzy، وGTINان مختلفان لا يندمجان |
| FOOD-D2-014 | dedupe hierarchy | كل مستوى يعمل بالترتيب ويترك audit event | تعطيل مستوى source id أو normalized key يُكتشف |

## 5. DATA-3 — artifacts والتقرير

| Test ID | الفحص | نتيجة القبول | الهجوم المضاد المطلوب |
|---|---|---|---|
| FOOD-D3-001 | deterministic build | نفس input fingerprint/config/epoch ينتج نفس البايتات | تغيير input أو config يغير build identity |
| FOOD-D3-002 | full artifact availability | كل shard/index/hot path في manifest قابل للقراءة | manifest مع shard مفقود يفشل |
| FOOD-D3-003 | checksums | SHA-256 والحجم لكل artifact مطابقان | تبديل shard صحيح بآخر يسقط routing/checksum |
| FOOD-D3-004 | routing | كل GTIN موجود في shard المحسوب بالعقد | تغيير finalizer في طرف واحد يسقط |
| FOOD-D3-005 | schema after dedupe | كل سجل مشحون يمر schema | merged record ناقص provenance يسقط |
| FOOD-D3-006 | report recomputation | raw/accepted/rejected/markets/source/quality يعاد حسابها | رقم يدوي أو stale stats يسقط |
| FOOD-D3-007 | rejected artifacts | العدد الكامل أو artifact immutable متاح، لا عينة موهمة | `_total` أكبر من sample بلا رابط artifact يسقط |
| FOOD-D3-008 | Arabic/brand coverage | التغطية تقاس كعدد ونسبة حسب السوق والمصدر | المتوسط العالمي لا يخفي الخليج/السعودية |
| FOOD-D3-009 | no filler | كل سجل يحمل provenance ويمر حد الجودة | تكرار صفوف أو مصدر مجهول لبلوغ 40 ألف يسقط |
| FOOD-D3-010 | ODbL package | notice وlicense metadata وقرار التوزيع موجودة | artifact OFF بلا attribution metadata يسقط |

## 6. اختبارات runtime المؤجلة

لا تبدأ قبل اعتماد Web HEAD وإعادة الربط. تشمل: barcode direct lookup، hot-set offline،
فشل shard والشبكة، IndexedDB quota/eviction، تطابق stamps، ترتيب العربية، attribution
المرئي، وعدم كسر مسار الأطعمة العامة.

## 7. بوابة القبول المستقبلية

ترتيب البوابة المقترح بعد وجود التنفيذ:

1. fixture proof بلا شبكة.
2. source snapshot verification.
3. full ingest مع row ledger وschema validation.
4. deterministic rebuild على snapshot نفسه.
5. artifact verification من مخزن خارجي نظيف.
6. report regeneration ومقارنة الأرقام.
7. runtime tests بعد اعتماد Web HEAD فقط.

## 8. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
|---|---|---|---|---|
| FOOD-TEST-DEP-001 | اختبارات البحث الحي والترتيب | واجهة البحث وranking النهائية | e2e nutrition/barcode | بناء journeys للعربية والباركود والفشل/offline |
| FOOD-TEST-DEP-002 | اختبارات التخزين والـcache | عقد IndexedDB وsafe storage النهائي | catalog cache tests | quota، corruption، eviction، migration، واستعادة صادقة |
| FOOD-TEST-DEP-003 | اختبار attribution المرئي | شاشة العرض النهائية وقاموسها | UI/e2e assertions | العربية والإنجليزية والرابط والترخيص |
| FOOD-TEST-DEP-004 | اختبار artifact hosting | لا يوجد؛ خدمة الاستضافة قرار مستقل | post-upload verification | تنزيل كل artifact من بيئة نظيفة والتحقق من SHA-256 |
| FOOD-TEST-DEP-005 | إعادة probe السعودية | لا يوجد | source discovery gate | تنفيذ probe موثق وتحديث سجل المصادر دون bypass |
