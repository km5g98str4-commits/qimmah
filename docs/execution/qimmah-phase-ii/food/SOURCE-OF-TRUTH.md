# Phase II Food — SOURCE OF TRUTH

> **الغرض:** منع خلط قاعدة التطبيق الحالية، وأدلة الفروع المحجورة، والمصادر الخارجية،
> ومخرجات الإنتاج. المرجع الأعلى دائمًا هو الأصل الأدنى القابل للتحقق، لا التقرير الأجمل.

## 1. ترتيب السلطة

1. `origin/main@cc60adfc0da0f893b101230269d4847d33490429` هو خط الأساس الوحيد لهذه الموجة.
2. متطلبات Phase II في `QIMMAH-SOVEREIGN-PHASE-II-001.md` هي عقد النطاق، وليست دليل تنفيذ.
3. هذه الوثائق تحدد شروط القبول المستقبلية، ولا تعلن وجود pipeline.
4. الملفات الحالية في `src/data/` و`docs/data-factory/` مصادر داخلية مرشحة؛ كل نوع
   يحتفظ بدلالته ولا يتحول تلقائيًا إلى سجل منتج معبأ.
5. أي branch أو report أو manifest غير مدموج دليل محجور فقط حتى يُعاد إنتاجه والتحقق منه.
6. المصدر الخارجي الخام مع fingerprint وترخيصه هو أصل البيانات؛ artifact مشتق منه.

## 2. الأصول الداخلية المؤكدة

| الأصل | الدور الصحيح | ما لا يثبته |
|---|---|---|
| `src/data/foodItems.ts` | قاعدة الأطعمة المحلية المستخدمة حاليًا؛ 641 صنفًا | لا يثبت provenance إنتاجي أو باركودًا لكل صنف |
| `src/data/saudiFoods.ts` | 130 طبقًا سعوديًا تقليديًا | ليس كتالوج منتجات تجارية معبأة |
| `docs/data-factory/packaged/PKG-001-saudi-gulf-packaged.json` | دفعة داخلية من 55 منتجًا معبأً مرشحة للاستيعاب | لا تصبح وحدها قاعدة 40 ألف ولا تعفي من إعادة التحقق |
| `scripts/food-db-validate.mjs` | مدقق جودة للأطعمة الحالية | لا يتحقق من GTIN أو source snapshot أو shards |
| `scripts/run-food-db-proof.mjs` | حارس ثوابت baseline | ليس إثبات Phase II |
| `scripts/run-saudi-foods-proof.mjs` | حارس وصول الأطباق السعودية | ليس إثبات pipeline خارجي |

## 3. المصادر الخارجية

| المصدر | الأولوية | حالة الجرد المحجور | شرط اعتماده كمصدر حقيقة |
|---|---|---|---|
| Open Food Facts bulk export | اتساع عالمي وتغطية سعودية/خليجية متاحة | قابل للوصول واستُعمل في دليل محجور | تنزيل رسمي كامل، SHA-256 للملف، شروط وODbL مثبتة، ولا crawling للمسارات الممنوعة |
| SFDA | أولوية سعودية رسمية | `ECONNRESET` في probe مؤرخ | probe جديد بلا التفاف، ثم robots/terms/licence قبل أي ingest |
| Saudi Open Data | أولوية سعودية رسمية | timeout في probe مؤرخ | probe جديد وقراءة رخصة البيانات السعودية وتوافقها |
| USDA FoodData Central | اتساع عالمي ثانوي | متاح وملك عام، غير مستوعب | قرار نطاق ثم snapshot fingerprint وadapter مستقل |
| مواقع المصنعين | سد فجوات سعودية محددة | الوصول التقني لا يثبت حق إعادة النشر | إذن/ترخيص صريح لكل مصدر قبل جمع أو توزيع البيانات |
| بيانات Qimmah المنسقة | نواة محلية | مملوكة للمشروع بحسب السجل الحالي | توثيق طريقة التحقق، المراجع، تاريخ المراجعة، وهوية الدفعة |

الوصول التقني لا يساوي إذن إعادة الاستخدام. والحجب لا يبرر proxy أو VPN أو انتحالًا.

## 4. الدليل المحجور

الفرع `origin/codex/qimmah-food-production-001@e12bad0a140ff833a8a1ac4ffa3b1854cb67e4b5`
يحمل نموذجًا مفيدًا وأرقامًا متسقة داخليًا، لكنه غير معتمد للأسباب التالية:

- يحتوي 34 التزامًا فوق `cc60adf` ويمزج تاريخ Web وFood.
- الدمج `086c19b1dd10b10c01616fac6637690dbd0c297f` يربط Food برأس Web
  `d83add22e904819c7d7fdc27890c757cd5dbaa5c`.
- فرق الفرع 628 ملفًا، منها 426 تحت `dist-release/`.
- الشرائح الكاملة ومجموعة الـ59,941 سجلًا ليست متتبعة؛ الموجود القابل لتدقيق مباشر
  هو hot set من 599 سجلًا وmanifest وتقارير.
- full conflicts/review queues غير متاحة؛ الموجود عينات.
- لا توجد بصمة للـOFF input تربط الأرقام بنسخة مصدر immutable.

بناءً عليه يجوز الاستفادة من الجرد لتحديد الفجوات فقط. لا يجوز نسخ ملف أو commit أو
اعتبار رقم فيه نتيجة لفرع Phase II الحالي.

## 5. مصدر حقيقة كل مخرج مستقبلي

| المخرج | مصدر الحقيقة | برهان القبول |
|---|---|---|
| source registry | شروط المصدر وprobe مؤرخ | رابط، حالة HTTP/transport، license evidence، وقرار استعمال |
| input snapshot | البايتات المنزلة | SHA-256 وحجم ووقت وheaders وهوية تخزين immutable |
| normalized staging | input snapshot + pipeline commit | row ledger كامل وقيم خام/تحويلات قابلة للتتبع |
| accepted dataset | staging + schema + quality policy | صفر schema violations وعداد outcomes متوازن |
| deduped dataset | accepted + dedupe policy version | قرارات merge/conflict/review قابلة لإعادة التشغيل |
| shards/indexes/hot set | deduped dataset + build config | checksums وأحجام وعدد سجلات وartifact URLs قابلة للتحقق |
| production report | manifests وتقارير الآلة فقط | لا رقم مكتوب يدويًا، ولا خلط reason occurrences بـunique rejects |
| runtime catalog | artifacts المعتمدة + Web integration contract | تطابق stamps والتوجيه والترخيص واختبار offline/failure |

## 6. قرارات قبل DATA-1

1. هل يعتمد المؤسس توزيع قاعدة مشتقة من OFF تحت ODbL ومتطلبات المشاركة بالمثل؟
2. أين تحفظ snapshots الخام والشرائح بصورة immutable، وما مدة الاحتفاظ؟
3. هل الهدف 40 ألف «مشحون» أم «مقبول قبل سقف الشحن»؟ يجب تثبيت التعريف.
4. هل USDA ضمن النسخة الأولى أم extension موثق؟
5. هل inferred market من GS1 مقبول مع وسم صريح، أم لا يدخل مقياس السعودية؟

## 7. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
|---|---|---|---|---|
| FOOD-SOT-DEP-001 | اعتماد HEAD الذي سيستهلك artifacts | Web Sovereign final approved HEAD | إعادة ربط فرع Phase II بعد الاعتماد | جرد التعارضات فقط ثم تصميم adapter على الرأس النهائي |
| FOOD-SOT-DEP-002 | قرار ODbL والمشاركة بالمثل | لا يوجد؛ قرار مؤسس/قانوني | source registry وواجهة attribution | توثيق القرار، فصل البيانات ذات التراخيص المختلفة، وتحديث شروط الشحن |
| FOOD-SOT-DEP-003 | إتاحة مخزن artifact immutable | لا يوجد | source snapshots وshard release | اختيار الخدمة، الصلاحيات، retention، والتحقق من checksum بعد الرفع |
| FOOD-SOT-DEP-004 | إعادة probe للمصادر السعودية | لا يوجد | source discovery | تسجيل SFDA/Saudi Open Data بنتيجة حديثة دون تجاوز حجب |
| FOOD-SOT-DEP-005 | استقرار عقد البحث | search/index architecture النهائية في Web | runtime catalog | توحيد normalization/routing/ranking stamps واختبارات عدم التباعد |
