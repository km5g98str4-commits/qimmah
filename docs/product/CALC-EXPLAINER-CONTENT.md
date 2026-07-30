# محتوى صفحة «كيف يحسب قِمّة أرقامك؟»

**مادة من غرفة المنتج/المحتوى — مادة إدخال لا أوامر (§1.5)**
**الحالة:** ✅ **معتمدة بـ[CTO-15]** — الوجهة: **موجة مصغّرة مستقلّة بعد استقرار حارة A، أو ضمنها إن رخصت** (التقدير للمنسّق).
**التاريخ:** 2026-07-30 · **حُدِّثت بعد [CTO-15]**
**النطاق:** المحتوى الكامل لصفحة الشرح: BMI · BMR · TDEE · السعرات المستهدفة · الماكروز · الماء · معدّل التغيّر المتوقّع.

---

## 0. حدود هذه الوثيقة وما فحصته

- **مواصفة محتوى**، لا تعديل كود ولا حسم علمي. **كل اختيار معادلة موسوم «يُرفع لغرفة الهندسة للتثبيت العلمي»**، وقراره ليس قرار غرفة المنتج.
- **العربية مصدر الحقيقة**، والإنجليزية مرآة.
- **كل رقم في هذه الوثيقة مقروء من الكود**، لا مقترح ولا متذكَّر.

### ما وجدته — والمفاجأة السارّة

**الصفحة موجودة والعمل العلمي منجز.** وجدتُ:

| ما وجدته | الدليل |
|---|---|
| صفحة شرح كاملة تغطّي BMR وTDEE والسعرات والبروتين والماكروز وBMI | `src/views/CalcExplainerView.tsx` (254 سطرًا) + `src/i18n/dict/calcScreen.ts` (220 سطرًا) |
| **تدقيق علمي كامل بمراجع أوّلية وبرهان محسوب يدويًا** | `docs/features/FORMULAS.md` — بتاريخ 2026-07-16، مع 10 مصادر ومصفوفة 30 معادلة |
| تصنيف صريح لكل معادلة: «قياسي» أو «NON-STANDARD» | الجدول نفسه، وتعليقات مطابقة في `src/lib/calculators.ts:15` |
| ثوابت مصدَّرة كمصدر حقيقة واحد تستهلكه الصفحة | `calculators.ts:34` — «تستهلكها صفحة كيف نحسب أرقامك» |
| سقف الماء 4 لتر وتصنيف BMI للقاصرين — **معالَجان بالفعل** | `CALC_FORMULA_VERSION = 'p25-water-cap4-minor-bmi'` (`calculators.ts:103`) |

> **حكم صريح:** التدقيق في `FORMULAS.md` **أعلى جودة ممّا كنتُ سأنتجه**، وفيه مصادر أوّلية وبراهين محسوبة يدويًا. **لن أنقضه ولن أكرّره** — هذه الوثيقة تترجمه إلى لغة المستخدم وتسدّ ثغراته في المحتوى.

### الثغرات الفعلية التي تسدّها هذه الوثيقة

| الثغرة | الحالة اليوم |
|---|---|
| **الماء غير مشروح في الصفحة إطلاقًا** | `calcScreen.ts` فيه BMR وTDEE وسعرات وبروتين وماكروز وBMI — **ولا قسم للماء** رغم أن الرقم يُعرض للمستخدم |
| **معدّل التغيّر المتوقّع غير مشروح** | يُعرض «−0.4 كجم أسبوعيًا» بلا شرح لمصدره |
| **الافتراضات غير معلنة للمستخدم** | التدقيق يذكرها للمهندس، والصفحة لا تذكرها للمستخدم |
| **حدود الدقة غير مذكورة** | الصفحة تشرح «كيف» ولا تقول «إلى أيّ مدى يُوثق بها» |
| **تمييز المُقاس عن المُستنتَج غائب** | كل الأرقام معروضة بنفس درجة اليقين |
| **النبرة عامّية** | «هنا نوريك من وين جت بالضبط» (`calcScreen.ts:74`) — والميثاق §6 يوجب فصحى دافئة |

---

## 1. مبادئ الصفحة الخمسة

1. **الرقم أولًا، ثم من أين جاء.** المستخدم يفتح الصفحة ومعه سؤال عن رقم بعينه، فيجده في أعلى قسمه لا في نهايته.
2. **بأرقامه هو لا بمثال عام.** «١٠ × وزنك ٨٥ = ٨٥٠» أوضح بمراحل من «10 × W».
3. **الصدق في درجة اليقين.** ما هو معادلة منشورة يُقال إنه كذلك؛ وما هو اجتهاد من قِمّة **يُقال إنه اجتهاد**. لا تلبيس.
4. **تقدير لا تشخيص.** يُقال مرّة في المقدّمة وبوضوح في الخاتمة، ولا يُكرَّر في كل فقرة فيفقد أثره.
5. **الشرح لا يبرّر بل يوضّح.** هدف الصفحة أن يفهم المستخدم، لا أن يقتنع.

> **المبدأ الثالث هو أصعبها والتزامي به كامل:** ثلاثة من أرقام قِمّة السبعة **اجتهادات منتج داخل نطاقات معتمدة، لا معادلات منشورة**. عرضها كأنها علم مثبت خيانة للمستخدم، وإخفاؤها تحت مصطلحات غامضة أسوأ.

---

## 2. هيكل الصفحة

```
مقدّمة + تنويه مبكّر
    ↓
بياناتك التي نبني عليها  (ما أدخلتَه — مُقاس)
    ↓
١ · مؤشّر كتلة الجسم BMI
٢ · معدّل الأيض الأساسي BMR
٣ · إجمالي الطاقة اليومية TDEE
٤ · سعراتك المستهدفة
٥ · الماكروز: البروتين والدهون والكربوهيدرات
٦ · الماء
٧ · معدّل التغيّر المتوقّع
    ↓
إلى أيّ مدى تدقّ هذه الأرقام؟
    ↓
درجات اليقين — من أين جاء كل رقم
    ↓
التنويه الطبي
```

**قرار تصميمي:** كل قسم **قابل للطيّ ومطويّ افتراضيًا** ما عدا رقمه ونتيجته. من يريد الرقم يجده في ثانية، ومن يريد الاشتقاق يفتح.

---

## 3. المحتوى الكامل

> **المثال المستخدَم في كل الأقسام واحد ومتّسق:** ذكر · 30 سنة · 178 سم · 85 كجم · نشاط متوسط · 4 أيام تدريب · هدف تنشيف.
> **وهذا المثال بالذات محسوب يدويًا ومُبرهَن** في `docs/features/FORMULAS.md` — لم أخترعه ولم أحسبه بنفسي.

---

### المقدّمة

| المعرّف | العربية | English |
|---|---|---|
| `calcPageTitle` | كيف يحسب قِمّة أرقامك؟ | How Qimmah calculates your numbers |
| `calcPageSubtitle` | كل رقم في خطتك له طريقة واضحة — نفكّكها هنا بأرقامك أنت. | Every number in your plan has a clear method — here it is, worked through with your own numbers. |
| `calcIntro` | الأرقام التي تراها في خطتك مبنيّة على معادلات منشورة في علم التغذية والرياضة، وعلى اختيارات عملية من قِمّة داخل نطاقات معتمدة. نوضّح هنا مصدر كل رقم، ونميّز ما هو معادلة مثبتة عمّا هو اجتهاد منّا. | The numbers in your plan are built on published equations from nutrition and exercise science, plus practical choices Qimmah makes within established ranges. Here we show where each number comes from, and distinguish proven equations from our own judgment calls. |
| `calcIntroEstimate` | جميع هذه الأرقام **تقديرات** تصلح للتنظيم والمتابعة. جسمك هو المرجع النهائي، ونعدّل معك بناءً على ما نقيسه فعلًا. | All of these are **estimates** meant for planning and tracking. Your body is the final reference, and we adjust with you based on what we actually measure. |
| `calcNeedData` | أكمل بيانات جسمك في الإعداد لنعرض لك الحساب بأرقامك الفعلية. | Complete your body details in setup and we'll show the calculation with your actual numbers. |

**قاعدة عرض:** `calcIntroEstimate` تظهر **مرّة واحدة في الأعلى**، ولا تتكرّر في كل قسم. التنويه المكرَّر يُقرأ ضجيجًا فيُتخطّى — وهذا يُضعف التنويه بدل أن يقوّيه.

---

### بياناتك التي نبني عليها

| المعرّف | العربية | English |
|---|---|---|
| `calcInputsTitle` | بياناتك التي نبني عليها | What we build on |
| `calcInputsNote` | هذه أرقام أدخلتَها أنت، ونستخدمها كما هي بلا تعديل. | These are numbers you entered, and we use them exactly as they are. |
| `calcInputsAccuracy` | تحديث وزنك بانتظام يجعل كل الأرقام أدقّ — فالوزن يدخل في أربعة منها. | Updating your weight regularly makes every number more accurate — it feeds into four of them. |

| البيان | يدخل في |
|---|---|
| **العمر** | BMR |
| **الجنس** | BMR · الحدّ الأدنى للسعرات |
| **الطول** | BMR · BMI |
| **الوزن** | BMR · BMI · البروتين · الماء |
| **مستوى النشاط** | TDEE |
| **أيام التدريب** | TDEE |
| **الهدف** | السعرات المستهدفة · معدّل التغيّر |

> **لغة حاسمة هنا عمدًا** (الميثاق §6): هذه بيانات **مُقاسة** أدخلها المستخدم، فتُذكر بلا تحفّظ. التحفّظ يبدأ من القسم التالي حيث يبدأ الاستنتاج.

---

### ١ · مؤشّر كتلة الجسم (BMI)

| المعرّف | العربية | English |
|---|---|---|
| `calcBmiTitle` | مؤشّر كتلة الجسم | Body Mass Index |
| `calcBmiWhat` | رقم يقارن وزنك بطولك، ويُستخدم في الصحّة العامة كمؤشّر أوّلي سريع. | A number comparing your weight to your height, used in public health as a quick first indicator. |
| `calcBmiFormula` | الوزن (كجم) ÷ (الطول بالمتر)² | Weight (kg) ÷ (height in metres)² |
| `calcBmiExample` | ٨٥ ÷ (١٫٧٨)² = ٨٥ ÷ ٣٫١٧ = **٢٦٫٨** | 85 ÷ (1.78)² = 85 ÷ 3.17 = **26.8** |
| `calcBmiSource` | المعادلة والعتبات من منظمة الصحة العالمية. | The equation and thresholds come from the World Health Organization. |

**العتبات:**

| المعرّف | العربية | English |
|---|---|---|
| `calcBmiUnder` | أقل من ١٨٫٥ — أقل من النطاق المرجعي | Under 18.5 — below the reference range |
| `calcBmiNormal` | ١٨٫٥ إلى ٢٤٫٩ — ضمن النطاق المرجعي | 18.5 to 24.9 — within the reference range |
| `calcBmiOver` | ٢٥ إلى ٢٩٫٩ — فوق النطاق المرجعي | 25 to 29.9 — above the reference range |
| `calcBmiObese` | ٣٠ فأكثر — أعلى بكثير من النطاق المرجعي | 30 and above — well above the reference range |

**حدود الدقّة — تُعرض داخل القسم لا في الحواشي:**

| المعرّف | العربية | English |
|---|---|---|
| `calcBmiLimits` | مؤشّر كتلة الجسم **لا يفرّق بين العضل والدهون**. رياضي عضليّ قد يظهر «فوق النطاق» وهو في حالة ممتازة، وشخص قليل الحركة قد يظهر «ضمن النطاق» وتكوين جسمه غير مثالي. اقرأه مؤشّرًا أوّليًا لا حكمًا. | BMI **doesn't distinguish muscle from fat**. A muscular athlete may read "above range" while in excellent shape, and a sedentary person may read "within range" with poor body composition. Read it as a first indicator, not a verdict. |
| `calcBmiMinor` | لا نعرض تصنيف مؤشّر كتلة الجسم لمن هم دون ١٨ سنة. تقييمه في هذا العمر يحتاج مخططات نموّ بحسب العمر والجنس، ولا يصحّ تطبيق عتبات البالغين عليه. | We don't show a BMI category for anyone under 18. Assessing it at that age requires age- and sex-specific growth charts; adult thresholds don't apply. |

> **حقيقة مؤكدة:** حجب تصنيف القاصرين **منفَّذ في الكود** (`ADULT_MIN_AGE` في `calculators.ts:76`) استنادًا إلى اشتراط منظمة الصحة العالمية «BMI حسب العمر» لأعمار 5–19. النصّ أعلاه **يشرح سلوكًا قائمًا، لا يطلب سلوكًا جديدًا.**
> **نبرة `calcBmiLimits` مقصودة:** «فوق النطاق المرجعي» لا «زيادة وزن». وصف موضع الرقم من مرجع، لا حكم على الجسم. هذا هو تطبيق «بلا لوم ولا تهويل» على أكثر رقم يُقلق المستخدم.

---

### ٢ · معدّل الأيض الأساسي (BMR)

| المعرّف | العربية | English |
|---|---|---|
| `calcBmrTitle` | معدّل الأيض الأساسي | Basal Metabolic Rate |
| `calcBmrWhat` | الطاقة التي يحتاجها جسمك وأنت ساكن تمامًا — للتنفّس والدورة الدموية والحفاظ على حرارة الجسم ووظائف الأعضاء. | The energy your body needs at complete rest — for breathing, circulation, maintaining body temperature, and organ function. |
| `calcBmrSource` | نستخدم معادلة **Mifflin-St Jeor**، وهي من أكثر المعادلات دقّة واستخدامًا لتقدير طاقة الراحة لدى البالغين الأصحّاء. | We use the **Mifflin-St Jeor** equation, one of the most accurate and widely used for estimating resting energy in healthy adults. |

**المعادلة:**

| المعرّف | العربية | English |
|---|---|---|
| `calcBmrFormulaMale` | (١٠ × الوزن) + (٦٫٢٥ × الطول) − (٥ × العمر) + ٥ | (10 × weight) + (6.25 × height) − (5 × age) + 5 |
| `calcBmrFormulaFemale` | (١٠ × الوزن) + (٦٫٢٥ × الطول) − (٥ × العمر) − ١٦١ | (10 × weight) + (6.25 × height) − (5 × age) − 161 |
| `calcBmrExample` | (١٠ × ٨٥) + (٦٫٢٥ × ١٧٨) − (٥ × ٣٠) + ٥<br>= ٨٥٠ + ١١١٢٫٥ − ١٥٠ + ٥ = **١٨١٨ سعرة يوميًا** | (10 × 85) + (6.25 × 178) − (5 × 30) + 5<br>= 850 + 1112.5 − 150 + 5 = **1,818 kcal/day** |

**الافتراضات وحدود الدقّة:**

| المعرّف | العربية | English |
|---|---|---|
| `calcBmrAssume` | المعادلة مبنيّة على بالغين أصحّاء، وتفترض تكوين جسم قريب من المتوسّط. | The equation is based on healthy adults and assumes a body composition near average. |
| `calcBmrLimits` | تقديرها يقترب عادةً من القياس المخبري بفارق **±١٠٪ تقريبًا** لدى معظم الناس. وقد يزيد الفارق عند من لديه كتلة عضلية عالية جدًّا أو حالة صحّية تؤثّر في الأيض. | Its estimate typically falls within **about ±10%** of laboratory measurement for most people. The gap can widen for those with very high muscle mass or a medical condition affecting metabolism. |
| `calcBmrWhyNoBodyFat` | معادلات أخرى تستخدم نسبة الدهون فتكون أدقّ نظريًا — لكنها تحتاج قياسًا موثوقًا لنسبة الدهون، وهو غير متاح لمعظم الناس. | Other equations use body-fat percentage and are theoretically more accurate — but they require a reliable body-fat measurement, which most people don't have. |

> **`calcBmrWhyNoBodyFat` إجابة استباقية** عن سؤال يطرحه كل مستخدم متقدّم. وجودها في الصفحة يوفّر جدلًا ويبني ثقة: نحن نعرف البديل، واخترنا عنه لسبب.

---

### ٣ · إجمالي الطاقة اليومية (TDEE)

| المعرّف | العربية | English |
|---|---|---|
| `calcTdeeTitle` | إجمالي طاقتك اليومية | Your total daily energy |
| `calcTdeeWhat` | معدّل الأيض الأساسي مضروبًا في معامل يعبّر عن حركتك — نشاط حياتك اليومية زائد تمرينك. | Your basal rate multiplied by a factor reflecting how much you move — daily life activity plus your training. |
| `calcTdeeFormula` | معدّل الأيض الأساسي × معامل النشاط | Basal rate × activity factor |
| `calcTdeeExample` | ١٨١٨ × ١٫٤٥ = **٢٦٣٦ سعرة يوميًا** | 1,818 × 1.45 = **2,636 kcal/day** |

**معامل النشاط — بشفافية كاملة:**

| المعرّف | العربية | English |
|---|---|---|
| `calcTdeeApproach` | نفصل **حركة حياتك اليومية** عن **تمرينك** عمدًا. الجداول الشائعة تدمجهما في معامل واحد فتحتسب التمرين مرّتين لمن يتمرّن كثيرًا. | We deliberately separate **your daily life movement** from **your training**. Common tables merge them into one factor, which double-counts training for people who train often. |
| `calcTdeeNeatTitle` | من حركة حياتك | From your daily movement |
| `calcTdeeTrainingAdd` | ثم نضيف **٠٫٠٢٥** لكل يوم تدريب أسبوعيًا. | Then we add **0.025** for each weekly training day. |
| `calcTdeeCap` | الحدّ الأقصى للمعامل الكلّي **١٫٩**. | The total factor is capped at **1.9**. |

| مستوى النشاط | المعامل |
|---|---|
| خامل / نشاط خفيف | ١٫٢٠ |
| نشاط متوسط | ١٫٣٥ |
| نشِط / نشِط جدًّا | ١٫٤٥ |

| المعرّف | العربية | English |
|---|---|---|
| `calcTdeeExampleFull` | نشاطك متوسط (١٫٣٥) + ٤ أيام تدريب (٤ × ٠٫٠٢٥ = ٠٫١٠) = **١٫٤٥** | Moderate activity (1.35) + 4 training days (4 × 0.025 = 0.10) = **1.45** |

**درجة اليقين — نصّ صريح في الصفحة:**

| المعرّف | العربية | English |
|---|---|---|
| `calcTdeeHonesty` | **هذا المعامل اختيار من قِمّة، لا معادلة منشورة.** بحثنا عن مرجع منشور لهذه الطريقة بالذات فلم نجده، ونذكر ذلك بوضوح بدل أن نقدّمه علمًا مثبتًا. أساسه منطقيّ — تجنّب احتساب التمرين مرّتين — لكنه يبقى تقديرًا عمليًا. | **This factor is a Qimmah choice, not a published equation.** We looked for a published reference for this exact method and didn't find one, and we say so plainly rather than presenting it as established science. Its basis is sound — avoiding double-counting training — but it remains a practical estimate. |
| `calcTdeeLimits` | إجمالي الطاقة اليومية **أكثر أرقامك تفاوتًا بين شخص وآخر**. شخصان بنفس الجسم ونفس التمرين قد يختلفان بمئات السعرات بسبب حركة يومية لا يشعران بها. | Total daily energy is **the number that varies most between people**. Two people with identical bodies and training can differ by hundreds of calories from daily movement they don't even notice. |
| `calcTdeeCalibrate` | لهذا **نعدّل هذا الرقم بناءً على وزنك المسجَّل بعد أسبوعين إلى ثلاثة**، لا بناءً على المعادلة وحدها. الميزان مرجع أدقّ من أيّ معامل. | That's why we **adjust this number from your logged weight after two to three weeks**, not from the equation alone. The scale is a more accurate reference than any factor. |

> **`calcTdeeHonesty` أهمّ نصّ في هذه الصفحة كلها، ومصدره تدقيق موجود لا اجتهاد منّي.** جدول `FORMULAS.md` يصنّف هذا المعامل صراحةً «NON-STANDARD — correctness risk because it drives every TDEE»، والتعليق في `calculators.ts:15` يقول «no primary source was found for this exact model».
>
> **قرار محتوى:** الشفافية هنا **ليست خيارًا تجميليًا**. المعامل يقود كل رقم غذائي في التطبيق، والادّعاء بأنه علم منشور ادّعاء كاذب. وذكره صراحة يحوّل نقطة ضعف إلى دليل مصداقية — وهو ما لا تفعله معظم تطبيقات اللياقة.

---

### ٤ · سعراتك المستهدفة

| المعرّف | العربية | English |
|---|---|---|
| `calcCaloriesTitle` | سعراتك المستهدفة | Your calorie target |
| `calcCaloriesWhat` | نبدأ من إجمالي طاقتك اليومية، ثم نطرح أو نضيف بحسب هدفك. | We start from your total daily energy, then subtract or add based on your goal. |

| الهدف | التعديل | مثالنا |
|---|---|---|
| `calcCaloriesCut` — تنشيف | ناقص **٤٠٠** سعرة | ٢٦٣٦ − ٤٠٠ = **٢٢٣٦** |
| `calcCaloriesMaintain` — محافظة | بلا تعديل | ٢٦٣٦ |
| `calcCaloriesBulk` — تضخيم | زائد **٣٠٠** سعرة | ٢٦٣٦ + ٣٠٠ = **٢٩٣٦** |

| المعرّف | العربية | English |
|---|---|---|
| `calcCaloriesFloor` | لا تنزل سعراتك المستهدفة تحت حدّ أدنى مهما كان هدفك: **١٥٠٠** للذكور و**١٢٠٠** للإناث. النزول تحت هذا الحدّ يحتاج إشرافًا مختصًّا، ولا نصل إليه بحساب تلقائي. | Your target never goes below a floor, whatever your goal: **1,500** for men and **1,200** for women. Going below that needs professional supervision and isn't something we reach automatically. |
| `calcCaloriesMinor` | لمن هم دون ١٨ سنة نحسب على **المحافظة دائمًا** — بلا عجز أو فائض — لأن تعديل الوزن في هذا العمر يحتاج متابعة مختصّ ومخططات نموّ. | For anyone under 18 we always calculate at **maintenance** — no deficit or surplus — because changing weight at that age needs specialist follow-up and growth charts. |
| `calcCaloriesHonesty` | **رقما ٤٠٠ و٣٠٠ اختيار من قِمّة**، لا معادلة منشورة. اخترناهما لأنهما يعطيان تغيّرًا ملموسًا مع بقاء الخطة قابلة للاستمرار. الأنسب لك قد يختلف. | **The 400 and 300 figures are Qimmah's choice**, not a published equation. We chose them to give noticeable change while keeping the plan sustainable. What suits you may differ. |
| `calcCaloriesAdjust` | إن لاحظنا أن وزنك لا يتحرّك كما هو متوقّع، **سنقترح** تعديلًا ونشرح سببه. ولن نغيّر أرقامك دون علمك. | If we notice your weight isn't moving as expected, **we'll suggest** an adjustment and explain why. We won't change your numbers without telling you. |

> **`calcCaloriesAdjust` تنفيذ نصّي مباشر لقرارك المقفل رقم 3** — التعديلات اقتراح دائمًا مع شرح السبب. وموضعها هنا مقصود: القارئ في هذه اللحظة يسأل «وماذا لو لم ينجح الرقم؟»، فيجد الجواب قبل أن يقلق.
> **حقيقة مؤكدة:** حساب القاصر على المحافظة دائمًا **منفَّذ في الكود** (`effectiveGoalTypeForAge` في `calculators.ts:88`) — والنصّ يشرح سلوكًا قائمًا.

---

### ٥ · الماكروز

#### البروتين

| المعرّف | العربية | English |
|---|---|---|
| `calcProteinTitle` | البروتين | Protein |
| `calcProteinFormula` | **١٫٨ غرام** لكل كيلوغرام من وزن جسمك | **1.8 grams** per kilogram of body weight |
| `calcProteinExample` | ١٫٨ × ٨٥ = **١٥٣ غرامًا يوميًا** | 1.8 × 85 = **153 g/day** |
| `calcProteinWhy` | البروتين يحمي عضلك أثناء خسارة الدهون، ويبني عضلًا جديدًا مع التدريب، ويُشبع أكثر من غيره لكل سعرة. | Protein protects your muscle during fat loss, builds new muscle alongside training, and is more filling per calorie than other macros. |
| `calcProteinSource` | مراجعة بحثية شاملة لتدريب المقاومة وجدت أن الفائدة تستقرّ عند نحو **١٫٦ غ/كجم**، مع نطاق ثقة يمتدّ إلى **٢٫٢**. رقمنا ١٫٨ يقع داخل هذا النطاق. | A comprehensive resistance-training review found benefits plateau around **1.6 g/kg**, with a confidence interval extending to **2.2**. Our 1.8 sits inside that range. |
| `calcProteinLimits` | الرقم مبنيّ على وزن الجسم الكلّي. من لديه نسبة دهون مرتفعة قد يكفيه أقلّ، إذ إن حاجة البروتين ترتبط بالكتلة الخالية من الدهون أكثر من الوزن الكلّي. | The figure is based on total body weight. Someone with a high body-fat percentage may need less, since protein needs track lean mass more closely than total weight. |

#### الدهون

| المعرّف | العربية | English |
|---|---|---|
| `calcFatTitle` | الدهون | Fat |
| `calcFatFormula` | **٢٧٪** من سعراتك المستهدفة ÷ ٩ | **27%** of your target calories ÷ 9 |
| `calcFatExample` | (٢٢٣٦ × ٠٫٢٧) ÷ ٩ = ٦٠٤ ÷ ٩ = **٦٧ غرامًا يوميًا** | (2,236 × 0.27) ÷ 9 = 604 ÷ 9 = **67 g/day** |
| `calcFatWhy` | الدهون ضرورية لتوازن الهرمونات وامتصاص الفيتامينات الذائبة فيها. كل غرام منها يعطي ٩ سعرات. | Fat is essential for hormone balance and absorbing fat-soluble vitamins. Each gram provides 9 calories. |
| `calcFatSource` | النطاق المعتمد للبالغين **٢٠–٣٥٪** من الطاقة، و٢٧٪ اختيار من قِمّة في وسطه. | The established adult range is **20–35%** of energy; 27% is Qimmah's choice near its midpoint. |

#### الكربوهيدرات

| المعرّف | العربية | English |
|---|---|---|
| `calcCarbsTitle` | الكربوهيدرات | Carbohydrates |
| `calcCarbsFormula` | ما تبقّى من سعراتك بعد البروتين والدهون ÷ ٤ | Whatever remains of your calories after protein and fat ÷ 4 |
| `calcCarbsExample` | ٢٢٣٦ − (١٥٣ × ٤) − (٦٧ × ٩) = ٢٢٣٦ − ٦١٢ − ٦٠٣ = ١٠٢١<br>١٠٢١ ÷ ٤ = **٢٥٥ غرامًا يوميًا** | 2,236 − (153 × 4) − (67 × 9) = 2,236 − 612 − 603 = 1,021<br>1,021 ÷ 4 = **255 g/day** |
| `calcCarbsWhy` | الكربوهيدرات وقودك الأساسي في التمرين. نحسبها آخرًا لأن البروتين والدهون لهما حدّ أدنى وظيفي، أمّا الكربوهيدرات فتملأ ما تبقّى. | Carbs are your main training fuel. We calculate them last because protein and fat have functional minimums, while carbs fill the remainder. |
| `calcMacrosConversion` | معاملات التحويل: **٤ سعرات** لكل غرام بروتين · **٤** لكل غرام كربوهيدرات · **٩** لكل غرام دهون. | Conversion factors: **4 calories** per gram of protein · **4** per gram of carbohydrate · **9** per gram of fat. |
| `calcMacrosLimits` | هذه المعاملات متوسّطات عامّة معتمدة. القيمة الفعلية تختلف قليلًا بين الأطعمة بحسب تركيبها وقابليتها للهضم. | These factors are established general averages. Actual values differ slightly between foods depending on composition and digestibility. |

---

### ٦ · الماء

> **هذا القسم غير موجود في الصفحة اليوم رغم أن الرقم يُعرض للمستخدم.** أضعه كاملًا.

| المعرّف | العربية | English |
|---|---|---|
| `calcWaterTitle` | الماء | Water |
| `calcWaterFormula` | **٣٥ مليلترًا** لكل كيلوغرام من وزنك، ثم نقرّبه لأقرب نصف لتر. | **35 millilitres** per kilogram of your weight, rounded to the nearest half litre. |
| `calcWaterExample` | ٨٥ × ٠٫٠٣٥ = ٢٫٩٧٥ لتر ← **٣٫٠ لتر يوميًا** | 85 × 0.035 = 2.975 L → **3.0 L per day** |
| `calcWaterRange` | ونُبقي النتيجة بين **٢٫٥ لتر** كحدّ أدنى و**٤ لترات** كحدّ أقصى. | And we keep the result between a **2.5 L** floor and a **4 L** ceiling. |

**لماذا الحدّان — وهذا موضع صدق ثانٍ:**

| المعرّف | العربية | English |
|---|---|---|
| `calcWaterFloorWhy` | **الأرضية ٢٫٥ لتر** تقع ضمن المراجع الأوروبية والأمريكية لاحتياج البالغين اليومي من الماء. | The **2.5 L floor** sits within European and American references for adult daily water needs. |
| `calcWaterCapWhy` | **السقف ٤ لترات** حدّ أمان. قاعدة «٣٥ مل/كجم» تعطي أرقامًا غير معقولة عند الأوزان العالية جدًّا — لأن حاجة السوائل لا ترتفع بنفس نسبة ارتفاع كتلة الدهون. ما فوق ٤ لترات يحتاج تقييمًا فرديًا. | The **4 L ceiling** is a safety limit. The "35 mL/kg" rule produces unreasonable figures at very high body weights, because fluid needs don't rise in proportion to fat mass. Above 4 L needs individual assessment. |
| `calcWaterHonesty` | **قاعدة ٣٥ مل/كجم قاعدة سريرية شائعة لا معيارًا مثبتًا.** المراجع الرسمية تبني توصياتها على الجنس والفئة السكّانية لا على وزن الجسم. اخترناها لأنها تعطي رقمًا شخصيًا مفيدًا، ونذكر أنها تقدير عملي. | **The 35 mL/kg rule is a common clinical rule of thumb, not an established standard.** Official references base their recommendations on sex and population group rather than body weight. We chose it because it gives a useful personal number, and we note that it's a practical estimate. |
| `calcWaterDrinking` | هذا الرقم يقدّر **ما تشربه** فقط. طعامك يوفّر نحو ٢٠٪ إضافية من ماء يومك. | This figure estimates **what you drink** only. Your food provides roughly another 20% of your daily water. |
| `calcWaterHeat` | في الأيام الحارّة أو التمارين الطويلة تزيد حاجتك. العطش مؤشّر جيّد، ولون البول الفاتح علامة مطمئنة. | On hot days or during long sessions your needs rise. Thirst is a good signal, and pale urine is a reassuring sign. |

> **`calcWaterDrinking` تصحيح لسوء فهم شائع جدًّا** — كثيرون يقارنون رقمنا بتوصيات «إجمالي الماء» فيجدونها مختلفة ويظنّون أحدهما خاطئًا. الجملة تحسم الالتباس بسطر.
> **`calcWaterHeat` مكتوبة بلا تهويل** — «العطش مؤشّر جيّد» لا «الجفاف خطر». المعلومة نفسها، والنبرة مطمئنة.

---

### ٧ · معدّل التغيّر المتوقّع

> **هذا القسم غير موجود في الصفحة اليوم رغم أن الرقم يُعرض للمستخدم.** وهو **أكثر أرقام قِمّة حاجةً إلى تحفّظ لغوي**.

| المعرّف | العربية | English |
|---|---|---|
| `calcRateTitle` | معدّل التغيّر المتوقّع | Expected rate of change |
| `calcRateWhat` | تقدير لسرعة تغيّر وزنك إن التزمت بسعراتك المستهدفة. | An estimate of how quickly your weight may change if you stay close to your calorie target. |
| `calcRateFormula` | (العجز أو الفائض اليومي × ٧) ÷ ٧٧٠٠ | (daily deficit or surplus × 7) ÷ 7,700 |
| `calcRateExampleCut` | (٤٠٠ × ٧) ÷ ٧٧٠٠ = ٢٨٠٠ ÷ ٧٧٠٠ = **تقديريًا ٠٫٤ كجم أسبوعيًا** | (400 × 7) ÷ 7,700 = 2,800 ÷ 7,700 = **around 0.4 kg per week** |
| `calcRateExampleBulk` | (٣٠٠ × ٧) ÷ ٧٧٠٠ = **تقديريًا ٠٫٣ كجم أسبوعيًا** | (300 × 7) ÷ 7,700 = **around 0.3 kg per week** |
| `calcRateWhy7700` | الرقم ٧٧٠٠ تقدير تقليدي للطاقة المخزّنة في كيلوغرام من نسيج الجسم. | The 7,700 figure is a traditional estimate of the energy stored in a kilogram of body tissue. |

**حدود الدقّة — أوسع فقرة في الصفحة، وعن قصد:**

| المعرّف | العربية | English |
|---|---|---|
| `calcRateHonesty` | **هذه أكثر أرقامك تقديرًا.** قاعدة ٧٧٠٠ قاعدة ثابتة قديمة، والجسم في الواقع **يتكيّف**: كلّما نزل وزنك انخفض احتياجك من الطاقة قليلًا، فيبطؤ المعدّل تدريجيًا. الأسابيع الأولى عادةً أسرع من التالية. | **This is the most estimated of your numbers.** The 7,700 rule is an old fixed rule, while the body actually **adapts**: as your weight drops your energy needs fall slightly, so the rate gradually slows. The first weeks are usually faster than the ones after. |
| `calcRateWater` | تغيّر وزن الأسبوع الأول غالبًا **ماء لا دهون** — خصوصًا مع تغيّر الكربوهيدرات أو الملح. لا تقرأ نتيجة أسبوع واحد على أنها اتّجاه. | First-week weight change is often **water, not fat** — especially when carbs or salt change. Don't read a single week's result as a trend. |
| `calcRateReal` | نعرض إلى جانب هذا التقدير **معدّلك الفعلي المحسوب من وزنك المسجَّل**. وحين يختلفان، **الفعلي هو الصحيح**. | Alongside this estimate we show **your actual rate calculated from your logged weight**. When they differ, **the actual one is right**. |

> **`calcRateReal` هي القاعدة الذهبية للصفحة كلّها مصوغة في سطر:** حين يتعارض تقدير مع قياس، **القياس هو الحكم**. وهذا ما يميّز تطبيقًا صادقًا عن آلة حاسبة واثقة من نفسها.
>
> **لغة هذا القسم متحفّظة في كل جملة** التزامًا بالميثاق §6: «تقديريًا» · «قد» · «عادةً» · «غالبًا». ولا تظهر فيه جملة حاسمة واحدة إلّا `calcRateReal` — لأنها عن رقم **مقاس** لا مُستنتَج.

---

### إلى أيّ مدى تدقّ هذه الأرقام؟

| المعرّف | العربية | English |
|---|---|---|
| `calcAccuracyTitle` | إلى أيّ مدى تدقّ هذه الأرقام؟ | How accurate are these numbers? |
| `calcAccuracyIntro` | سؤال عادل، وهذه إجابته بصراحة: | A fair question, and here's the honest answer: |
| `calcAccuracyBody` | نقطة انطلاق جيّدة، لا حقيقة نهائية. المعادلات مبنيّة على متوسّطات مجموعات كبيرة، وأنت لست متوسّطًا. الفارق المعتاد بين التقدير والواقع يتراوح بين **١٠٪ و١٥٪** في أرقام الطاقة. | A good starting point, not a final truth. The equations are built on averages from large groups, and you are not an average. The usual gap between estimate and reality runs **10% to 15%** on the energy numbers. |
| `calcAccuracyWhatMatters` | **الأهمّ من دقّة الرقم الأول هو ما نفعله بعده.** نتابع وزنك وسجلّك، ونقترح تعديلًا حين نلاحظ أن الواقع يخالف التقدير. الرقم الجيّد بعد ثلاثة أسابيع من المتابعة أفضل من أدقّ رقم في اليوم الأول. | **What matters more than the first number's accuracy is what we do next.** We track your weight and logs, and suggest adjustments when reality differs from the estimate. A good number after three weeks of tracking beats the most accurate number on day one. |
| `calcAccuracyHelp` | تساعدنا على الدقّة بثلاثة أمور: تسجيل وزنك بانتظام · تسجيل طعامك بصدق · إبقاء بياناتك محدّثة. | Three things help our accuracy: logging your weight regularly, logging your food honestly, and keeping your details up to date. |

> **`calcAccuracyWhatMatters` هو الردّ الصحيح على «هل أرقامكم دقيقة؟».** الجواب الفارغ «نعم دقيقة جدًّا»، والجواب الصادق أن الدقّة تأتي من **حلقة التعديل** لا من المعادلة الأولى.
> **`calcAccuracyHelp` بلا لوم:** «تساعدنا على الدقّة» لا «أرقامك خاطئة لأنك لا تسجّل».

---

### درجات اليقين — من أين جاء كل رقم

> **هذا القسم لا نظير له في أي تطبيق لياقة أعرفه، وهو أقوى ما في الصفحة.**

| المعرّف | العربية | English |
|---|---|---|
| `calcSourcesTitle` | من أين جاء كل رقم؟ | Where each number comes from |
| `calcSourcesIntro` | نميّز بين ثلاث درجات، ونضع كل رقم في درجته بلا تجميل: | We distinguish three levels and place each number in its own, without dressing it up: |
| `calcSourceLevel1` | **معادلة منشورة** — من بحث علمي منشور ومراجَع. | **Published equation** — from peer-reviewed published research. |
| `calcSourceLevel2` | **اختيار داخل نطاق معتمد** — الرقم من عندنا، والنطاق الذي يقع فيه معتمد علميًا. | **A choice within an established range** — the figure is ours, the range it sits in is scientifically established. |
| `calcSourceLevel3` | **تقدير عملي من قِمّة** — لم نجد له مرجعًا منشورًا بهذه الصيغة، ونقوله صراحة. | **A practical Qimmah estimate** — we found no published reference for this exact form, and we say so plainly. |

| الرقم | الدرجة | المصدر |
|---|---|---|
| مؤشّر كتلة الجسم | **معادلة منشورة** | منظمة الصحة العالمية |
| معدّل الأيض الأساسي | **معادلة منشورة** | Mifflin-St Jeor (1990) |
| معاملات ٤/٤/٩ للماكروز | **معادلة منشورة** | معاملات Atwater العامة |
| البروتين ١٫٨ غ/كجم | **اختيار داخل نطاق معتمد** | مراجعة Morton (2018): استقرار عند ١٫٦، ونطاق ثقة إلى ٢٫٢ |
| الدهون ٢٧٪ | **اختيار داخل نطاق معتمد** | النطاق المعتمد للبالغين ٢٠–٣٥٪ |
| أرضية الماء ٢٫٥ لتر | **اختيار داخل نطاق معتمد** | مراجع البالغين الأوروبية والأمريكية |
| **معامل النشاط** | **تقدير عملي من قِمّة** | لا مرجع منشور لهذه الصيغة |
| **العجز ٤٠٠ / الفائض ٣٠٠** | **تقدير عملي من قِمّة** | سياسة منتج |
| **الماء ٣٥ مل/كجم** | **تقدير عملي من قِمّة** | قاعدة سريرية شائعة |
| **معدّل التغيّر ٧٧٠٠** | **تقدير عملي من قِمّة** | قاعدة ثابتة قديمة، والجسم يتكيّف |
| **سقف الماء ٤ لترات** | **تقدير عملي من قِمّة** | حدّ أمان للمنتج |

> **الجدول مقروء حرفيًا من `docs/features/FORMULAS.md`** — لم أصنّف شيئًا بنفسي. عمود «الدرجة» ترجمة مباشرة لعمود Verdict في التدقيق.
>
> **أربعة من أحد عشر رقمًا اجتهادات منّا.** عرضها هكذا قد يبدو مخاطرة تسويقية، وهو في الحقيقة **أقوى دليل مصداقية في التطبيق كلّه**: من يخفي حدوده يفقد الثقة عند أول تدقيق، ومن يعلنها يكسبها قبل أن تُطلب.

---

### التنويه الطبي

| المعرّف | العربية | English |
|---|---|---|
| `calcDisclaimerTitle` | تنويه | A note |
| `calcDisclaimerBody` | هذه الأرقام **تقديرات تنظيمية للتخطيط والمتابعة، وليست تشخيصًا طبيًا ولا وصفة علاجية ولا بديلًا عن استشارة مختصّ**. قِمّة لا يشخّص ولا يعالج ولا يصف دواءً. | These numbers are **planning and tracking estimates. They are not a medical diagnosis, not a treatment prescription, and not a substitute for professional advice**. Qimmah does not diagnose, treat, or prescribe. |
| `calcDisclaimerWhen` | راجع مختصًّا قبل أي تغيير كبير في تمرينك أو طعامك إن كان لديك حالة صحّية أو تتناول دواءً بانتظام، أو إن كنتِ حاملًا أو مرضعًا، أو إن كان عمرك دون ١٨ سنة، أو إن ظهرت أعراض تقلقك. | Consult a professional before any major change to your training or diet if you have a health condition or take regular medication, if you are pregnant or breastfeeding, if you are under 18, or if you notice symptoms that concern you. |
| `calcDisclaimerYou` | أنت أعرف بجسمك. إن خالف رقمٌ ما تشعر به، فما تشعر به يستحقّ الانتباه. | You know your body best. If a number contradicts how you feel, how you feel deserves attention. |

> **`calcDisclaimerYou` تحوّل التنويه من إخلاء مسؤولية إلى احترام.** الجملة صحيحة طبيًا وصحيحة إنسانيًا معًا، وهي بالضبط ما يجعل التنويه يُقرأ بدل أن يُتخطّى.
> **`calcDisclaimerWhen` تذكر الفئات بلا تهويل** — قائمة عملية، لا تحذير مفزع.

---

## 4. جدول حدود الدقّة المجمَّع

> **مرجع داخلي للحارة، لا يُعرض للمستخدم مجموعًا** — كل سطر معروض في قسمه.

| الرقم | الفارق المتوقّع عن الواقع | السبب الرئيسي |
|---|---|---|
| مؤشّر كتلة الجسم | يعتمد على التكوين | لا يفرّق العضل عن الدهون |
| معدّل الأيض الأساسي | **±١٠٪** تقريبًا | فروق فردية في التكوين والأيض |
| إجمالي الطاقة اليومية | **±١٥٪** أو أكثر | الحركة اليومية غير الملحوظة |
| السعرات المستهدفة | يرث فارق TDEE | مبنيّ عليه |
| البروتين | منخفض | مبنيّ على وزن مُقاس |
| الدهون والكربوهيدرات | يرث فارق السعرات | نسبة من رقم مقدَّر |
| الماء | متوسط | القاعدة غير قياسية والمناخ يؤثّر |
| معدّل التغيّر | **الأعلى** | قاعدة ثابتة وجسم متكيّف |

---

## 5. مراجعة النبرة

| القاعدة | التطبيق |
|---|---|
| **فصحى دافئة** | «سؤال عادل، وهذه إجابته بصراحة» — لا «يُرجى ملاحظة أن الدقّة نسبية» |
| **بلا لوم** | «تساعدنا على الدقّة بثلاثة أمور» لا «أرقامك خاطئة لأنك لا تسجّل» |
| **بلا تهويل** | «العطش مؤشّر جيّد» لا «الجفاف خطر» · «فوق النطاق المرجعي» لا «سمنة» |
| **متحفّظة للمُستنتَج** | «تقديريًا ٠٫٤ كجم» · «قد يزيد الفارق» · «عادةً أسرع» |
| **حاسمة للمُقاس** | «١٠ × وزنك ٨٥ = ٨٥٠» · «هذه أرقام أدخلتَها أنت ونستخدمها كما هي» |
| **بلا مصطلحات متقدّمة** | لا RIR ولا RPE ولا Deload في الصفحة · BMR وTDEE تُشرح بجملة قبل أول استخدام |
| **صفر علامة تعجّب** | ✓ |
| **RTL** | الأرقام العربية-الهندية في النصّ · الوحدات بعد الرقم · المعادلات تُعرض في كتلة معزولة الاتجاه لئلّا تنقلب |

---

## 6. يُرفع لغرفة الهندسة للتثبيت العلمي

> **لا شيء في هذه القائمة قرار غرفة منتج.** كلها موسومة في `docs/features/FORMULAS.md` بـ«NON-STANDARD — correctness risk»، وأعيد رفعها لأن **نصوصي تعلنها للمستخدم صراحةً** — فإعلانها التزام يجب أن يوافق عليه من يملك القرار.

### أ · معامل النشاط (NEAT + أيام×0.025، سقف 1.9)
**التصنيف في التدقيق:** «NON-STANDARD — correctness risk because it drives every TDEE».
**نصّي يعلن هذا للمستخدم** في `calcTdeeHonesty`. **القرار المطلوب:** يُثبَّت المعامل كما هو مع الإعلان (توصيتي)، أم يُستبدل بجدول منشور؟ الاستبدال يُبسّط الشرح لكنه يعيد مشكلة احتساب التمرين مرّتين التي بُني المعامل لتفاديها.

### ب · العجز ٤٠٠ والفائض ٣٠٠ الثابتان
**التصنيف:** «NON-STANDARD fixed policy; individual response is not encoded».
ثابتان مطلقان لا يتناسبان مع حجم الجسم — 400 سعرة لمن TDEE عنده 1600 نسبة مختلفة تمامًا عمّن TDEE عنده 3200. **القرار:** يبقيان ثابتين، أم يصيران نسبة من TDEE؟

### ج · قاعدة ٣٥ مل/كجم للماء
**التصنيف:** «does not match EFSA sex-specific AI methodology».
**نصّي يعلنها تقديرًا عمليًا** في `calcWaterHonesty`. الحدّان (2.5 و4.0) **معالَجان بالفعل** في `p25-water-cap4`. **القرار:** يُبقى على القاعدة مع الإعلان (توصيتي)، أم يُنتقل إلى توصية بحسب الجنس والفئة؟ الثانية أدقّ علميًا وأقلّ شخصنة.

### د · قاعدة ٧٧٠٠ لمعدّل التغيّر
**التصنيف:** «NON-STANDARD static forecast — correctness risk; physiology is dynamic».
**أخطر الأربعة على توقّعات المستخدم** لأنه يُنتج أيضًا «الأسابيع المتبقّية للهدف». وعدٌ زمنيّ مبنيّ على قاعدة ثابتة **يخيب حتمًا** مع التكيّف. **القرار المطلوب — وأوصي به:** إمّا نموذج ديناميكي، وإمّا **إبقاء القاعدة مع تحفّظ لغوي صريح ومراجعة الرقم من الوزن الفعلي** — وهو ما تفعله نصوصي في `calcRateHonesty` و`calcRateReal`.

### هـ · تعارض النبرة — ✅ **محسوم بـ[CTO-15] §3**
فصحى دافئة. `calcScreen.ts` يحمل **14 سطرًا** من دين النبرة يُسدَّد **كاملًا** مع هذه الموجة — قاعدة «الشاشة ذرّة لا تتجزّأ»: الموجة تمسّ الشاشة فتحوّلها كلها. الدفتر: `docs/product/TONE-DEBT-LEDGER.md`.
⚠️ **`docs/content/DIALECT-TONE-GUIDE.md` يُنزع عن سلطته أوّلًا** — يُلغي «فصحى دافئة» بالاسم.

### و · موضع القاموس
قسما **الماء** و**معدّل التغيّر** جديدان كليًّا على `calcScreen.ts`، وبقيّة الأقسام توحيد نبرة وتوسيع. **القرار:** توسيع `calcScreen.ts` القائم (لا تصادم متوقّع — الملف يخدم شاشة واحدة)، أم ملف جديد؟ **توصيتي هنا التوسيع** خلافًا للوثيقتين السابقتين، لأن الملف مخصَّص لهذه الشاشة وحدها ولا يشاركه أحد.

### ز · ربط الصفحة بالثوابت لا بنسخ الأرقام
`calculators.ts:34` يصدّر الثوابت كمصدر حقيقة واحد بتعليق صريح: «تستهلكها صفحة كيف نحسب أرقامك». **شرط ملزم:** كل رقم في النصوص (1.8 · 0.27 · 400 · 300 · 7700 · 0.035 · 2.5 · 4.0) **يُقرأ من الثابت المصدَّر ولا يُكتب في القاموس**. رقم منسوخ في نصّ يصير كذبًا صامتًا يوم يتغيّر الثابت — وهو أخطر أنواع الخطأ لأنه لا يكسر بناءً ولا يُسقط اختبارًا.

---

## 7. الجرد

| القسم | مفاتيح |
|---|---|
| المقدّمة | 5 |
| بياناتك | 3 |
| BMI | 11 |
| BMR | 8 |
| TDEE | 11 |
| السعرات | 9 |
| الماكروز | 13 |
| **الماء (جديد)** | **8** |
| **معدّل التغيّر (جديد)** | **9** |
| حدود الدقّة | 5 |
| درجات اليقين | 5 + جدول 11 صفًّا |
| التنويه | 4 |
| **المجموع** | **~91 مفتاحًا × لغتين = ~182 نصًّا** |

**منها ~35 لها نظير قائم** يحتاج توحيد نبرة، و**~56 جديدة** — أبرزها قسما الماء ومعدّل التغيّر، وقسم «درجات اليقين» بأكمله.

---

## 8. حالة القرارات بعد [CTO-15]

| البند | الحالة |
|---|---|
| **النبرة** | ✅ **محسوم** — فصحى دافئة ([CTO-15] §3) |
| **موضع الموجة** | ✅ **محسوم** — موجة مصغّرة مستقلّة بعد استقرار A، أو ضمنها إن رخصت. التقدير للمنسّق |
| **سدّ فجوتي الماء ومعدّل التغيّر** | ✅ **مطلوب صراحةً في [CTO-15]**: «الرقمان معروضان اليوم بلا شرح» |
| **مبدأ الإفصاح (درجات اليقين)** | ⏳ **لم يُحسم** — إعلان أن أربعة من أرقامنا اجتهادات منّا. قرار مالك، وأراه أقوى ما في الصفحة |
| **§6-أ..د · تثبيت المعادلات علميًا** | ⏳ **لم يُحسم** — والأخطر §6-د: قاعدة 7700 تنتج وعدًا زمنيًا («الأسابيع المتبقّية») يخيب حتمًا مع التكيّف |

> **تنبيه تسلسل:** بند الإفصاح **يسبق كتابة الشاشة لا يتبعها**. القرار بعدم الإفصاح يُسقط قسمًا كاملًا (~16 مفتاحًا) ويغيّر نبرة أربعة أقسام أخرى — فحسمه بعد التنفيذ يعني إعادة كتابة، لا تعديلًا.

---

*انتهت المهامّ الثلاث.*
