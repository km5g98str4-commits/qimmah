# مادة إدخال — كتالوج الأطعمة العامّة (٦٠٠ صنف) · ٢٠٢٦-٠٩-١٢

**الحالة: مادة إدخال محفوظة، غير مشحونة.** الملف من المؤسس (`qimmah_food_catalog_600.xlsx`) يحمل ٦٠٠ صنف عامّ (صدر دجاج نيء/مشوي/مسلوق، أرز نيء، خبز شباتي…) بأسماء عربية وإنجليزية وكلمات بحث — **وبلا قيمة غذائية واحدة عمدًا**: ورقة `Import_Notes` تقول حرفيًا «Do NOT fabricate calories/macros. Map every row to a verified nutrient record before production use».

وهذا يطابق الميثاق §5 («لا بيانات وهمية في أي مسار إنتاجي»): صنفٌ بلا سعرات لا يمكن تسجيله، وصنفٌ بسعرات مخترَعة كذبٌ على المستخدم. فالملف **محفوظ كاملًا** في `docs/data-factory/generic/GENERIC-600-2026-09-12.json` بحالته `NEEDS_NUTRITION_MAPPING`، ولا يدخل الشرائح ولا `foodItems.ts` قبل موجة ربط غذائي مُتحقَّق منه.

## ما قيس اليوم مقابل المنسَّق القائم (٦٤٧ صنفًا)

| المقياس | العدد |
|---|---|
| مطابقة اسم/كلمة تامّة مع صنف منسَّق قائم | 125 |
| تقاطع رمزي (الكلمة موجودة في اسم/كلمات صنف قائم) | 411 |
| **لا تغطية إطلاقًا** | **64** ({'P1': 46, 'P2': 18}) |

الـ٦٤ بلا تغطية كلّها P1/P2 (لا P0): قطع لحم مسمّاة (ريب آي · سيرلوين)، أسماك (بلطي · ماكريل · قد)، مخبوزات (شباتي · بريوش · باغيت · بقسماط)، وخضار (جرجير · كرفس · هليون · خرشوف · شمندر · لفت…).

## التوزيع

 | الفئة | العدد |
|---|---|
| Vegetables | 68 |
| Proteins | 63 |
| Breakfast & Snacks | 57 |
| Saudi & Gulf Dishes | 52 |
| Rice, Grains & Pasta | 47 |
| Fruits | 47 |
| Breads & Bakery | 43 |
| Dairy | 41 |
| Oils, Sauces & Condiments | 39 |
| Beverages | 35 |
| Prepared International | 32 |
| Nuts & Seeds | 26 |
| Soups & Salads | 26 |
| Legumes | 24 |

الأولويات: {'P0': 73, 'P1': 227, 'P2': 300}

## الطريق إلى الشحن (موجة مستقلّة، تحتاج شبكة)

1. ربط كل صفّ بسجلّ USDA FoodData Central (Foundation/SR Legacy/FNDDS) أو مصدر سعودي موثّق، مع `fdc_id` ورابط لكل صفّ.
2. بوابة `checkNutrition` نفسها (أتواتر ≤ ٢٥٪ · لا كثافة مستحيلة) قبل القبول.
3. القبول إلى `foodItems.ts` بحصص واقعية (`servingGrams`) وكلمات البحث من عمودَي `search_aliases`.
4. `validation_status = VERIFIED` فقط بعد الربط والمراجعة — كما يشترط الملف نفسه.

## الـ٦٤ بلا تغطية

- `QF0016` ريب آي ستيك — Ribeye steak (P1)
- `QF0017` سيرلوين ستيك — Sirloin steak (P1)
- `QF0033` بلطي نيء — Tilapia, raw (P1)
- `QF0039` ماكريل — Mackerel (P1)
- `QF0040` قد نيء — Cod, raw (P1)
- `QF0071` خبز شباتي — Chapati (P1)
- `QF0075` خبز هوت دوج — Hot dog bun (P1)
- `QF0077` باغيت — Baguette (P1)
- `QF0086` بقسماط — Rusk (P1)
- `QF0090` خبز بريوش — Brioche (P1)
- `QF0093` مافن إنجليزي — English muffin (P1)
- `QF0134` سميد — Semolina (P1)
- `QF0141` حبوب إفطار نخالة — Bran cereal (P1)
- `QF0187` جرجير — Arugula (P1)
- `QF0192` قرنبيط نيء — Cauliflower, raw (P1)
- `QF0206` كراث — Leek (P1)
- `QF0214` شمندر — Beetroot (P1)
- `QF0215` لفت — Turnip (P1)
- `QF0216` فجل — Radish (P1)
- `QF0217` كرفس — Celery (P1)
- `QF0218` هليون — Asparagus (P1)
- `QF0219` خرشوف — Artichoke (P1)
- `QF0223` يقطين — Pumpkin (P1)
- `QF0224` قرع عسلي — Butternut squash (P1)
- `QF0236` بقدونس — Parsley (P1)
- `QF0237` كزبرة — Cilantro (P1)
- `QF0238` شبت — Dill (P1)
- `QF0240` ريحان — Basil (P1)
- `QF0247` يوسفي — Mandarin (P1)
- `QF0250` جريب فروت — Grapefruit (P1)
- `QF0252` توت أزرق — Blueberries (P1)
- `QF0253` توت أسود — Blackberries (P1)
- `QF0254` توت العليق — Raspberries (P1)
- `QF0262` خوخ — Peach (P1)
- `QF0263` نكتارين — Nectarine (P1)
- `QF0264` برقوق — Plum (P1)
- `QF0266` كمثرى — Pear (P1)
- `QF0273` زبيب — Raisins (P1)
- `QF0276` قراصيا — Prunes (P1)
- `QF0279` بابايا — Papaya (P1)
- `QF0280` باشن فروت — Passion fruit (P1)
- `QF0281` جوافة — Guava (P1)
- `QF0282` ليتشي — Lychee (P1)
- `QF0283` كاكا — Persimmon (P1)
- `QF0284` كرز — Cherries (P1)
- `QF0300` إدامامي — Edamame (P1)
- `QF0318` بندق — Hazelnuts (P2)
- `QF0321` بيكان — Pecans (P2)
- `QF0337` زيت دوار الشمس — Sunflower oil (P2)
- `QF0338` زيت كانولا — Canola oil (P2)
- `QF0343` مايونيز — Mayonnaise (P2)
- `QF0344` مايونيز لايت — Light mayonnaise (P2)
- `QF0345` كاتشب — Ketchup (P2)
- `QF0346` خردل — Mustard (P2)
- `QF0353` صلصة سيزر — Caesar dressing (P2)
- `QF0354` صلصة إيطالية — Italian dressing (P2)
- `QF0355` خل بلسمي — Balsamic vinegar (P2)
- `QF0363` ستيفيا — Stevia sweetener (P2)
- `QF0370` بيستو — Pesto (P2)
- `QF0378` إسبريسو — Espresso (P2)
- `QF0494` براوني — Brownie (P2)
- `QF0553` سباغيتي بولونيز — Spaghetti bolognese (P2)
- `QF0556` ريزوتو فطر — Mushroom risotto (P2)
- `QF0568` بازلاء وجزر مجمدة — Frozen peas and carrots (P2)
