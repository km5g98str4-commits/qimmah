# Phase II Food — DATA CONTRACT

> **الصفة:** عقد مقترح لـDATA-1، لا تنفيذ إنتاجي. مصدره متطلبات Phase II والجرد
> القراءة فقط؛ ولا يتبنى مخطط الفرع المحجور أو كوده.

## 1. حدود النطاق

هذا العقد يفصل بين ثلاثة أنواع لا يجوز دمجها ضمنيًا:

1. **أطعمة عامة** مثل الأطباق السعودية: قد لا تحمل GTIN ولا علامة تجارية.
2. **منتجات معبأة**: تحمل GTIN صالحًا ومصدرًا قابلًا للتتبع.
3. **سجل خام في staging**: يحفظ ما قاله المصدر قبل التطبيع والتحويل.

لا يصبح أي سجل «مقبولًا» بمجرد وجوده في مصدر. يمر بالترتيب عبر fingerprint للمدخل،
parse، تطبيع، تحقق GTIN، فحوص غذائية، schema validation، dedupe، ثم قرار الشحن.

## 2. عقد لقطة المصدر

كل تشغيل كامل يبدأ بسجل immutable للمدخل:

| الحقل | القاعدة |
|---|---|
| `source_id` | معرّف ثابت للمصدر |
| `retrieval_url` | رابط التنزيل المستعمل فعلًا |
| `retrieved_at` | UTC ISO-8601 |
| `content_length_bytes` | حجم البايتات المقروءة فعليًا |
| `sha256` | بصمة الملف الخام قبل فك الضغط |
| `etag` / `last_modified` | كما أعاده المصدر، أو `null` مسمى |
| `licence_id` | نسخة الترخيص الحاكمة |
| `licence_evidence_url` | رابط شروط المصدر وقت الجلب |
| `complete_download` | `true` فقط عند اكتمال stream والتحقق من الضغط |
| `pipeline_version` | نسخة الكود/العقد التي أنتجت التشغيل |

رابط متحرك بلا `sha256` لا يكفي لإعادة الإنتاج. اختلاف بصمة المدخل ينتج build جديدًا
بهوية جديدة، لا «إعادة» للبناء السابق.

## 3. عقد محاسبة الصفوف

كل صف بيانات بعد header يأخذ **terminal outcome واحدًا فقط**:

- `accepted_candidate`
- `rejected`
- `excluded_by_shipping_cap`
- `malformed_short_row`
- `parse_error`

يمكن للصف المرفوض حمل عدة `reason_codes`، لكن عدّاد `unique_rejected_rows` يزيد مرة
واحدة فقط. يجب أن يثبت التقرير المعادلة:

```text
raw_data_rows
= accepted_candidates
 + unique_rejected_rows
 + excluded_by_shipping_cap
 + malformed_short_rows
 + parse_errors
```

ولا يجوز `continue` بلا تسجيل outcome وسبب وموقع صف قابل للتتبع.

## 4. سجل staging الخام

السجل الخام لا يُشحن للتطبيق، لكنه يبقى قابلًا للتدقيق ويشمل:

- `source_id` و`source_record_id` و`source_row_number`.
- `input_fingerprint_sha256`.
- GTIN كما ورد قبل طي الأرقام أو padding.
- القيم والنصوص الخام التي جرى تحويلها: الطاقة ووحدتها، الصوديوم/الملح، حجم الحصة،
  الاسم، العلامة، البلد، وآخر تحديث.
- `raw_payload_sha256`، ومعه payload أو مرجع immutable إليه بحسب ميزانية التخزين.

أي تحويل يحتاج `transformation_codes` مسماة. حفظ الناتج وحده لا يثبت ما حدث.

## 5. سجل المنتج المعبأ المقبول

يدعم العقد، حيث تتوفر البيانات:

| المجموعة | الحقول |
|---|---|
| الهوية | `product_id`, `gtin`, `gtin_as_source` |
| الأسماء | `name_ar`, `name_en`, `brand_ar`, `brand_en`, `manufacturer` |
| السوق | `country`, `market`, `category` |
| الحصة | `serving_size`, `serving_unit`, `servings_per_container`, `nutrition_basis` |
| التغذية | `energy_kcal`, `protein_g`, `carbs_g`, `fat_g`, `saturated_fat_g`, `sugar_g`, `fiber_g`, `sodium_mg`, `micronutrients` |
| المحتوى | `ingredients`, `allergens` |
| الوسائط | `image_url` مع دليل حقوق مستقل، وإلا `null` |
| المصدر | `source`, `source_record_id`, `source_url`, `source_updated_at`, `input_fingerprint_sha256` |
| الجودة | `confidence`, `quality_flags`, `normalization_version`, `schema_version`, `ingested_at` |

كل سجل مقبول يجب أن ينجح في JSON Schema الفعلية. عدد مخالفات المخطط في المخرج
المقبول يساوي صفرًا، ويظهر العدد في التقرير.

## 6. GTIN

- تقبل الأطوال 8 و12 و13 و14 حيث تنطبق.
- تُفحص check digit قبل أي توحيد.
- المفتاح القانوني الداخلي GTIN-14 بأصفار بادئة، مع حفظ الشكل الخام.
- ترفض الأكواد غير الرقمية، الخاطئة، placeholders، ونطاقات التداول المقيد المعلنة.
- لا تُستنتج دولة المنشأ من بادئة GS1. إن استعملت البادئة كإشارة سوق، تُوسم
  `market_inferred_from_gs1` ولا تتحول إلى حقيقة بلد.

## 7. التطبيع والجودة

- التطبيع العربي واللاتيني والوحدات يحمل رقم نسخة.
- تحويل kJ/kcal وg/mg وsalt/sodium يسجل transformation code والقيمتين الخام والمطبعة.
- كل قيمة غذائية سالبة، بما فيها micronutrients والصوديوم، تنتج علمًا باسم الحقل
  ورفضًا مسمىً؛ لا تُحذف ولا يُستعاض عنها من حقل آخر بصمت.
- خلط 100g/serving، شذوذ الطاقة، خطأ الصوديوم، ومجموع الماكروز ينتج أعلامًا مستقلة.
- brand aliases قاموس مستقل ذو نسخة ومصدر؛ لا alias صلب مجهول داخل mapper.
- serving names تُطبع إلى vocabulary معلنة مع حفظ النص الخام.
- عدم اليقين يخفض الثقة أو يرسل للمراجعة؛ لا يصحح قيمة المصدر صامتًا.

## 8. Dedupe وfuzzy

الترتيب:

1. GTIN صالح مطابق.
2. `source_id + source_record_id`.
3. brand alias canonical + name canonical + package/serving size.
4. fuzzy candidate review.

لا يدمج fuzzy آليًا. المرشح الضبابي يجب أن يحمل الخوارزمية والنسخة والدرجة والعتبة
والحقول المقارنة. التطابق النصي الكامل بعد التطبيع يسمى `normalized_exact`، لا `fuzzy`.
ولا يدمج سجلان يحملان GTINين صالحين مختلفين.

## 9. عقد المخرجات

- كل shard وفهرس وhot set له: المسار، الحجم الخام/المضغوط، SHA-256، عدد السجلات،
  نسخة المخطط والتطبيع والترخيص.
- manifest نفسه له checksum محدد الدلالة: bytes أو canonical JSON، ويذكر أيهما.
- artifact غير المتتبع في Git يجب أن يوجد في مخزن قابل للتنزيل بعنوان immutable.
- `verify` يفشل عند غياب أي artifact، لا يكتفي بصمته في manifest.
- التقرير يفرّق بين `accepted_candidates` و`accepted_unique` و`shipped`، وبين
  `unique_rejected_rows` وتكرارات `rejection_reason_counts`.

## 10. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
|---|---|---|---|---|
| FOOD-CONTRACT-DEP-001 | تثبيت إصدار التطبيع نفسه في البناء ووقت التشغيل | وحدة البحث النهائية على Web HEAD | محمل الاستعلام والفهرس | اختبار stamps ورفض mismatch قبل تحميل shard |
| FOOD-CONTRACT-DEP-002 | تثبيت عقد ranking ونتيجة البحث | واجهة نتائج البحث النهائية | adapter الكتالوج | تعريف tie-breaks وقياس العربية والباركود |
| FOOD-CONTRACT-DEP-003 | حقن `input_fingerprint_sha256` في القياس التشغيلي | لا يوجد | pipeline manifest والتقرير | اختيار مخزن snapshot ومدة الاحتفاظ |
| FOOD-CONTRACT-DEP-004 | حقول attribution المرئية | شاشة التغذية/الإعدادات النهائية | نتائج البحث والمسح | اعتماد النص القانوني وإثبات ظهوره |
