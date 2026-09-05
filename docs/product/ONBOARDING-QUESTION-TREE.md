# شجرة أسئلة الإعداد (Onboarding) — النصوص النهائية

**مادة من غرفة المنتج/المحتوى — مادة إدخال لا أوامر (§1.5)**
**الحالة:** ✅ **معتمدة بـ[CTO-15]** — الوجهة: **حارة A (`a/onboarding-intent`)**، وهي موجتها القادمة حرفيًا.
**التاريخ:** 2026-07-30 · **حُدِّثت بعد [CTO-15]**
**النطاق:** شجرة الأسئلة كاملة بنصوصها بالعربية والإنجليزية، منطق التفرّع، وأثر كل إجابة على المخرجات.

---

## 0. حدود هذه الوثيقة

- هذه **مواصفة محتوى**، لا تعديل كود ولا أمر لأي وكيل. كل ما يحتاج صلاحية أو يمسّ الكود مجموع في §10 «يُرفع لغرفة الهندسة».
- النصوص العربية هي **مصدر الحقيقة**، والإنجليزية مرآة لها لا ترجمة حرفية.
- المعرّفات المقترحة **اقتراح تسمية** — التثبيت النهائي لغرفة الهندسة.
- **ما تحقّقتُ منه فعلًا على الجذع** موسوم بـ«حقيقة مؤكدة» مع المسار ورقم السطر. وما استنتجته موسوم كذلك.

### ما فحصته قبل الكتابة (حقائق مؤكدة)

| الحقيقة | الدليل |
|---|---|
| التدفّق الحالي يجمع الجسد أولًا ثم الهدف، والموافقة الصحية **قبل** الحقول | `src/lib/onboardingV2Flow.ts:130` — «الإذن يسبق الجمع لا يليه» |
| حاجز القاصرين يقبل من 12 سنة ويقيّد الأهداف ولا يطرد | `src/config/profileDomain.ts` و`src/lib/calculators.ts` |
| نموذج `Answers` يحمل حقولًا **جاهزة وغير مسؤولة** في التدفّق الحالي: الخبرة، الانتظام، النشاط اليومي، نمط التغذية، عدد الوجبات، الحساسية، نمط الأكل | `src/lib/planBuilderAnswers.ts:23-58` |
| سؤال المعدّات الحالي (`pref`) **لا يُحفظ ولا يغيّر شيئًا** | `src/lib/onboardingV2Adapter.ts:48` — «no field in `Answers`, so it is NOT persisted» |
| الأهداف في الكود ثلاثة فقط: `cut` · `maintain` · `bulk` | `src/data/planBuilder.ts:51` و`src/design-system/v2/labels.ts:137` |
| بيئة `bodyweight` معرّفة في الأنواع ولا يصلها أي مسار من التدفّق الحالي | `src/types/onboarding.ts:25` مقابل `PLACE_TO_ENV` في `onboardingV2Adapter.ts:33` |
| تنويه القاصر الحالي موجود في القاموس | `src/i18n/dict/profileChoices.ts` — `minorGoalNote` |
| لا يوجد في الكود اليوم أي أثر لرمضان أو الصلاة أو الحر | `grep` على `src/` بلا نتائج |

---

## 1. نقطة التصميم — ✅ محسومة بـ[CTO-15] §1

> **الحسم:** فصل النية عن الهدف **معتمد، و§8 من الميثاق يُغلق رسميًا**.
> نصّ الاعتماد: *«المشكلة لم تكن في الترتيب بل في خلط مفهومين في سؤال واحد — النية (الدافع) آمنة لكل الأعمار فتتصدّر للتفاعل، والهدف (الاتجاه السعري) هو وحده المقيَّد فيتأخّر بعد العمر والمستوى.»*
> **التسلسل أدناه ملزم لحارة A.** ونصّ §8 الجاهز للإدراج في §9-أ من هذه الوثيقة.

**ما يلي هو الاقتراح كما قُدّم — يبقى موثّقًا لأن تسبيبه هو ما اعتُمد، لا خلاصته وحدها.**

### التوتر (كما كان قبل الحسم)

| الطرف | ما يقوله | لماذا هو محقّ |
|---|---|---|
| **النية أولًا** | أول سؤال يجب أن يكون عن رغبة المستخدم، لا عن جسده | السؤال الأول يحدّد ما إذا كان المستخدم سيُكمل. طلب العمر والوزن من شخص لم يُقنع بعد بقيمة التطبيق طلبٌ سابق لأوانه — يعطي قبل أن يأخذ |
| **العمر قبل الأهداف المقيَّدة** | لا يجوز عرض «تنشيف/تضخيم» على قاصر | حاجز القاصرين لا يعمل إن جاء الهدف قبل العمر. وهذا بند امتثال، لا تفضيل تصميمي |

### اقتراحي: **يُدمجان — والدمج ليس تسوية بل هو الحل الأصح**

المفتاح أن **«النية» و«الهدف» شيئان مختلفان خُلطا في سؤال واحد**:

- **النية** = لماذا أنت هنا. جواب عن الدافع. **آمن لكل الأعمار بلا استثناء.**
- **الهدف** = اتجاه سعري وتدريبي محدَّد (`cut`/`maintain`/`bulk`). **هذا وحده ما يُقيَّد بالعمر.**

فالترتيب المعتمد:

```
شاشة القيمة  →  سؤال النية (آمن، بلا أرقام، بلا قيود)
                      ↓
                 المستوى (خبرة + انتظام)
                      ↓
        الموافقة الصحية  →  الأساسيات (عمر · جنس · طول · وزن)
                      ↓
        ★ الهدف — يُعرض الآن فقط، ومحتواه يتحدّد بشيئين:
              العمر (≥18 يرى الكل · <18 يرى المسموح فقط)
              المستوى (مبتدئ يرى ٤ خيارات · متقدّم يرى ٦)
                      ↓
          اللوجستيات → التغذية → السياق المحلي → الحسّاس
```

**لماذا هذا أفضل من أيٍّ من الطرفين وحده:**

1. **يربح التفاعل بالكامل** — أول سؤال يبقى عن المستخدم لا عن جسده، وهذا ما تطلبه أفضل الممارسات.
2. **يربح الامتثال بالكامل** — لا خيار مقيَّد يُعرض قبل معرفة العمر. الحاجز غير قابل للالتفاف بنيويًا، لا بشرط في الواجهة.
3. **يُصلح خللًا قائمًا لا يخصّ القاصرين** — سؤال الهدف اليوم يُطرح دون معرفة المستوى، فالمبتدئ يرى مفردات لا تعنيه. تأخير الهدف يجعله **تكيّفيًا مع المستوى أيضًا**، وهذه فائدة صافية للجميع.
4. **يُبقي الترتيب الحالي في الكود سليمًا** — التدفّق القائم يضع الجسد قبل الهدف أصلًا (`onboardingV2Flow.ts:130`). فالاقتراح **لا يقلب البنية**، بل يضيف النية قبلها والمستوى بينهما.

**الكلفة الصادقة:** المستخدم يمرّ بأربع شاشات قبل أن يختار هدفه. أخفّفها بأن شاشة النية **تُظهر ما ستفعله بالإجابة فورًا** («يبدو أن هدفك يميل إلى…») فيشعر بالتقدّم لا بالاستجواب.

> ✅ **معتمد بـ[CTO-15] §1.** بقيّة الوثيقة مبنيّة عليه، والتسلسل ملزم لحارة A.

---

## 2. الخريطة العامة وعدّاد الأسئلة

| الكتلة | الشاشات | أسئلة إجبارية | أسئلة شرطية |
|---|---|---|---|
| أ · القيمة | 1 | — | — |
| ب · النية | 1 | 1 | — |
| ج · المستوى | 2 | 1 | 1 |
| د · الموافقة الصحية | 1 | (بوابة) | — |
| هـ · الأساسيات | 1 | 1 (أربعة حقول) | — |
| و · الهدف | 2 | 1 | 1 |
| ز · اللوجستيات | 4 | 3 | 1 |
| ح · التغذية | 4 | 2 | 2 |
| ط · السياق المحلي | 3 | 2 | 1 |
| ي · الحسّاس الاختياري | 1 | — | 1 (قابل للتخطّي) |
| ك · نبني خطتك | 1 | — | — |
| ل · معاينة الخطة | 1 | — | — |
| م · إنشاء الحساب | 1 | — | — |

**العدّاد:**
- **الحدّ الأقصى المطلق: 19 سؤالًا** — أسوأ حالة (متقدّم · هدف تنشيف · منزل · اقتراحات وجبات · هواء طلق · لديه إصابة). داخل سقف الـ20.
- **المسار النموذجي للمبتدئ: 12 سؤالًا.**
- **أقصر مسار ممكن: 11 سؤالًا.**

### شرط سلامة العدّاد

> **أي سؤال يُضاف لاحقًا يجب أن يحذف سؤالًا أو يُثبت أنه يبقي أسوأ حالة ≤20.** السقف ليس متوسّطًا، بل حدّ أقصى للمسار الأطول.

---

## 3. اتفاقيات القاموس

- **الملف المقترح:** `src/i18n/dict/onboardingFlow.ts`، يصدّر `onboardingFlowStrings: Record<Lang, OnboardingFlowStrings>`.
- **لماذا ملف جديد لا توسيع `onboarding.ts`:** الملف القائم 1306 سطرًا ويخدم باني الخطة ومركز التخصيص معًا. وميثاق §1.4 يمنع تعديل قاموس مشترك من حارة. الملف الجديد يمنع التصادم.
- **نمط المعرّفات:** `camelCase` مسطّح مطابق للقواميس القائمة. البادئات:
  - `…Title` نص السؤال · `…Hint` السطر المساعد · `…Adv` صياغة المتقدّم
  - `…Opt<Value>` نص الخيار · `…Desc<Value>` وصف الخيار سطرًا واحدًا
  - `…Aria` تسمية الوصولية · `…Err` رسالة التحقّق
- **قاعدة ملزمة:** لا نص صلب في أي مكوّن، ولا مساعد `t(ar, en)` محلي جديد (الميثاق §6).

---

## 4. الكتل والأسئلة — التفصيل الكامل

---

### الكتلة أ · شاشة القيمة

#### S0 · شاشة القيمة (بلا سؤال)

- **المعرّف:** `valueTitle` · `valueBody` · `valueBullet1..3` · `valueCta` · `valueTrust`
- **شرط الظهور:** أول فتح فقط. لا تظهر عند استئناف مسوّدة.

| المعرّف | العربية | English |
|---|---|---|
| `valueTitle` | رحلتك تبدأ بخطة تشبهك | A plan that fits you |
| `valueBody` | نسألك أسئلة قليلة، ونبني لك خطة تدريب وتغذية مبنية على وضعك أنت — لا على قالب جاهز. | A few short questions, and we build a training and nutrition plan around your situation — not a generic template. |
| `valueBullet1` | أسئلة قصيرة، ودقائق معدودة | Short questions, just a few minutes |
| `valueBullet2` | خطة يمكنك تعديلها في أي وقت | A plan you can adjust anytime |
| `valueBullet3` | بياناتك محفوظة على جهازك، والمزامنة اختيارية | Your data stays on your device; syncing is optional |
| `valueCta` | لنبدأ | Let's begin |
| `valueTrust` | يمكنك التوقّف والعودة في أي لحظة — ما أدخلته يبقى محفوظًا. | You can pause and come back anytime — what you entered is saved. |

**ما تغيّره:** لا شيء في الخطة. مبرَّرة بأنها **شرط قبول** لبقية الأسئلة: طلب البيانات قبل عرض القيمة هو أعلى نقطة تسرّب في أي إعداد.

---

### الكتلة ب · النية

#### Q1 · النية — «ما الذي جاء بك؟»

- **المعرّف:** `intentTitle` · `intentHint` · `intentOpt*` · `intentDesc*`
- **الكتلة:** النية
- **شرط الظهور:** دائم. **أول سؤال في التطبيق.**
- **صياغة واحدة للجميع** — لا نسخة متقدّم. السؤال عن الدافع، والدافع لا مستوى له.

| | العربية | English |
|---|---|---|
| `intentTitle` | ما الذي تودّ أن يتغيّر؟ | What would you like to change? |
| `intentHint` | لا توجد إجابة خاطئة، ويمكنك تغييرها لاحقًا. | There's no wrong answer, and you can change it later. |

| المعرّف | العربية | English | ما يغيّره |
|---|---|---|---|
| `intentOptShape` | شكل جسمي وتكويني | My body shape and composition | يرجّح `cut`/`bulk` في Q6 حسب الوزن والهدف · التغذية `meal_suggestions` |
| `intentOptStrength` | قوّتي وأدائي | My strength and performance | يرجّح `maintain` + تركيز القوة · يقدّم أرقام الأداء في المعاينة |
| `intentOptHealth` | صحّتي وطاقتي اليومية | My health and daily energy | يرجّح `maintain` · التغذية `simple_guidance` · يخفّف بروز السعرات في «اليوم» |
| `intentOptHabit` | انتظامي — أن ألتزم فعلًا | My consistency — actually sticking to it | يرجّح `maintain` · أيام أقل افتراضيًا (3) · إبراز سلسلة الالتزام في «اليوم» |

**ما تغيّره الإجابة (مؤكَّد أنه قابل للتنفيذ على حقول قائمة):**
1. **الاختيار المسبق في Q6** — لا فرضًا، بل ترجيحًا مرئيًا («بناءً على إجابتك، يبدو أن هذا يناسبك»)، والمستخدم حرّ.
2. **افتراضي `nutritionStyle`** (`src/types/onboarding.ts:37`) — `meal_suggestions` أم `simple_guidance`.
3. **افتراضي `trainingDays`** — 3 لنية الانتظام، 4 لغيرها.
4. **ترتيب بطاقات شاشة «اليوم»** بعد الإعداد.

> **يُرفع لغرفة الهندسة (§10-أ):** لا يوجد حقل `intent` في `OnboardingProfile`. أثره الأول (الترجيح) عابر ولا يحتاج تخزينًا، لكن أثره الرابع (ترتيب البطاقات) يحتاج حقلًا مخزَّنًا.

---

### الكتلة ج · المستوى

#### Q2 · مستوى الخبرة

- **المعرّف:** `levelTitle` · `levelHint` · `levelOpt*`
- **شرط الظهور:** دائم.
- **الحقل:** `Answers.experienceLevel` (`beginner` · `intermediate` · `advanced`)

| | العربية | English |
|---|---|---|
| `levelTitle` | ما مدى خبرتك بتمارين الأثقال؟ | How familiar are you with weight training? |
| `levelHint` | نستخدم هذا لضبط حجم التمرين ومفرداته — لا لتقييمك. | We use this to set your training volume and wording — not to grade you. |

| المعرّف | العربية | English |
|---|---|---|
| `levelOptBeginner` | جديد عليّ، أو جرّبت قليلًا | New to it, or I've tried a little |
| `levelOptIntermediate` | أتمرّن منذ فترة وأعرف الأساسيات | I've been training a while and know the basics |
| `levelOptAdvanced` | أتمرّن بانتظام منذ سنوات وأتابع تقدّمي | I've trained consistently for years and track my progress |

**ما تغيّره:**
1. **مفردات كل ما يليه** — المبتدئ لا يرى Recomposition ولا Hypertrophy ولا أي مصطلح متقدّم في أي شاشة (قاعدة ملزمة من نبرة المشروع).
2. **حجم البداية وعدد الأيام الموصى به** — 3–4 للمبتدئ (نص قائم في `profileChoices.ts`: «للمبتدئ ننصح بـ3–4 أيام…»).
3. **يُخفي Q3 تمامًا** — المبتدئ يُثبَّت انتظامه على `new` في الكود أصلًا (`planBuilderAnswers.ts:90`)، فسؤاله عبث.
4. **يُخفي التقسيمة المتقدّمة** — `splitMode` يُثبَّت على `auto` للمبتدئ (المصدر نفسه).

#### Q3 · الانتظام السابق — **شرطي**

- **المعرّف:** `consistencyTitle` · `consistencyOpt*`
- **شرط الظهور:** `experienceLevel ≠ beginner` **فقط**.
- **الحقل:** `Answers.consistency` (`on_and_off` · `consistent` · `returning`)

| | العربية | English |
|---|---|---|
| `consistencyTitle` | كيف كان تمرينك في الأشهر الماضية؟ | How has your training been these past months? |
| `consistencyHint` | الانقطاع أمر طبيعي، ونبني عليه بداية مناسبة. | Breaks are normal — we'll build a suitable starting point around it. |

| المعرّف | العربية | English |
|---|---|---|
| `consistencyOptConsistent` | منتظم إلى حدّ كبير | Fairly consistent |
| `consistencyOptOnOff` | متقطّع — أنتظم ثم أنقطع | On and off |
| `consistencyOptReturning` | منقطع منذ فترة وأعود الآن | I've been away and I'm returning now |

**ما تغيّره:** أسبوع البداية. الإجابتان الأخيرتان تفعّلان بداية أخفّ بنصّ قائم في القاموس («بدأنا بحجم أخفّ هذا الأسبوع لبداية آمنة — زِد تدريجيًا بعدها»). **لا نسمّي هذا Deload في أي مسار.**

---

### الكتلة د · الموافقة الصحية

#### S1 · الموافقة الصحية (بوابة، تسبق أي حقل جسدي)

- **المعرّف:** `consentTitle` · `consentBody` · `consentWhat1..3` · `consentCheckbox` · `consentErr` · `consentLink`
- **شرط الظهور:** دائم، **قبل** الأساسيات مباشرة. (الترتيب قائم في الكود ويحرسه `test:policy` — `onboardingV2Flow.ts:130`.)

| | العربية | English |
|---|---|---|
| `consentTitle` | قبل أن نسألك عن جسمك | Before we ask about your body |
| `consentBody` | نحتاج بيانات أساسية لحساب أرقامك. هذه بيانات صحية، ولا نجمعها دون إذنك الصريح. | We need a few basics to calculate your numbers. This is health data, and we don't collect it without your explicit permission. |
| `consentWhat1` | ما نجمعه: العمر والجنس والطول والوزن | What we collect: age, sex, height, and weight |
| `consentWhat2` | لماذا: لحساب احتياجك من السعرات والماء وبناء خطتك | Why: to calculate your calorie and water needs and build your plan |
| `consentWhat3` | أين تُحفظ: على جهازك. المزامنة السحابية اختيارية وتُفعّلها أنت | Where it's stored: on your device. Cloud syncing is optional and you turn it on |
| `consentCheckbox` | أوافق على جمع هذه البيانات لبناء خطتي | I agree to this data being collected to build my plan |
| `consentErr` | نحتاج موافقتك لنكمل. يمكنك تصفّح التطبيق دون خطة إن فضّلت. | We need your agreement to continue. You're welcome to explore the app without a plan instead. |
| `consentLink` | اقرأ سياسة الخصوصية | Read the privacy policy |

**ما تغيّره:** `consents.healthData` مع `policyVersion` (`src/types/onboarding.ts:133`). بلا موافقة **لا تُجمع** الحقول ولا تُبنى خطة.

> **ملاحظة نبرة:** لا نستخدم «الرفض يمنعك من استخدام التطبيق». الرفض يمنع **الخطة**، لا التطبيق، وهذا فرق صدق لا تجميل.
> **ملاحظة توافق:** رابط سياسة الخصوصية يفتح بـ`rel="noopener noreferrer"` — التزامًا بـ`.claude/rules/security.md`.

---

### الكتلة هـ · الأساسيات

#### Q4 · الأساسيات — شاشة واحدة بأربعة حقول

- **المعرّف:** `basicsTitle` · `basicsHint` · `basicsAgeLabel` · `basicsGenderLabel` · `basicsHeightLabel` · `basicsWeightLabel` · `basicsErr*`
- **شرط الظهور:** دائم، بعد الموافقة.
- **الحقول:** `age` · `sex` · `heightCm` · `weightKg`
- **النطاقات المؤكَّدة في الكود:** العمر 12–100 · الطول 120–220 سم · الوزن 30–250 كجم (`src/config/profileDomain.ts`)

| | العربية | English |
|---|---|---|
| `basicsTitle` | أربعة أرقام، ونبدأ | Four numbers, and we're off |
| `basicsHint` | هذه الأرقام تحدّد احتياجك من السعرات والماء. كلّما دقّت، دقّ التقدير. | These determine your calorie and water needs. The more accurate they are, the closer the estimate. |
| `basicsAgeLabel` | العمر | Age |
| `basicsGenderLabel` | الجنس | Sex |
| `basicsHeightLabel` | الطول (سم) | Height (cm) |
| `basicsWeightLabel` | الوزن (كجم) | Weight (kg) |
| `basicsGenderMale` | ذكر | Male |
| `basicsGenderFemale` | أنثى | Female |
| `basicsGenderWhy` | لماذا نسأل؟ معادلة حساب الطاقة تختلف بين الجنسين، ولا نستخدمها لغير ذلك. | Why we ask: the energy equation differs by sex, and we use it for nothing else. |

**رسائل التحقّق:**

| المعرّف | العربية | English |
|---|---|---|
| `basicsErrAge` | العمر بين 12 و100 سنة. | Age should be between 12 and 100. |
| `basicsErrHeight` | الطول بين 120 و220 سم. | Height should be between 120 and 220 cm. |
| `basicsErrWeight` | الوزن بين 30 و250 كجم. | Weight should be between 30 and 250 kg. |
| `basicsErrMissing` | نحتاج الأربعة جميعًا لنحسب أرقامك بدقّة. | We need all four to calculate your numbers accurately. |

**ما تغيّره:** **كل شيء رقمي في التطبيق** — BMR وTDEE والسعرات المستهدفة والماكروز والماء ومعدل التغيّر. وهو يفتح حاجز القاصرين الذي يحكم Q5.

> **حقيقة مؤكَّدة تستحق التسجيل:** دون هذه الحقول يسقط الجميع على 25 سنة · 170 سم · 75 كجم (`planBuilderAnswers.ts:60`) — أي **نفس BMR لكل المستخدمين**. هذه الشاشة هي إغلاق ذلك الخلل.

---

### الكتلة و · الهدف (بعد العمر — حسم نقطة التصميم)

#### Q5 · الهدف — تكيّفي بالعمر والمستوى

- **المعرّف:** `goalTitle` · `goalTitleAdv` · `goalHint` · `goalOpt*` · `goalDesc*` · `goalMinorNote`
- **شرط الظهور:** دائم، **بعد** الأساسيات حصرًا.
- **الحقل:** `Answers.goalValue` (`cut`/`maintain`/`bulk`) + حقل تركيز جديد (انظر §10-ب)

**نصّ السؤال:**

| | العربية | English |
|---|---|---|
| `goalTitle` (مبتدئ) | ما هدفك في هذه المرحلة؟ | What's your goal right now? |
| `goalTitleAdv` (متقدّم) | ما اتجاهك في هذه المرحلة؟ | What's your focus for this phase? |
| `goalHint` | يمكنك تغيير هدفك في أي وقت، وسنشرح لك أثر التغيير قبل تطبيقه. | You can change your goal anytime, and we'll explain what changes before applying it. |

##### الحالة أ — مبتدئ، 18 سنة فأكثر (أربعة خيارات)

| المعرّف | العربية | English | الوصف (ar) | الوصف (en) | يُخزَّن |
|---|---|---|---|---|---|
| `goalOptFatLoss` | خسارة دهون | Lose fat | تنزّل الدهون وتحافظ على عضلك | Reduce fat while keeping your muscle | `cut` |
| `goalOptMuscle` | بناء عضل | Build muscle | تبني عضلًا بزيادة محسوبة | Build muscle with a measured surplus | `bulk` |
| `goalOptFitness` | تحسين اللياقة | Improve fitness | تحسّن نفسك وقدرتك على الاستمرار | Improve your conditioning and stamina | `maintain` + تركيز لياقة |
| `goalOptGeneral` | صحة عامة | General health | تتحرّك بانتظام وتشعر بتحسّن | Move regularly and feel better | `maintain` + تركيز عام |

##### الحالة ب — متوسّط أو متقدّم، 18 سنة فأكثر (ستة خيارات)

| المعرّف | العربية | English | الوصف (ar) | يُخزَّن (اتجاه سعري + تركيز) |
|---|---|---|---|---|
| `goalOptCut` | تنشيف | Cut | عجز محسوب مع الحفاظ على العضل | `cut` + hypertrophy |
| `goalOptLeanBulk` | تضخيم نظيف | Lean Bulk | فائض صغير لبناء عضل بأقلّ دهون | `bulk` + hypertrophy |
| `goalOptMaintenance` | محافظة | Maintenance | تثبّت وزنك وتحسّن أداءك | `maintain` + عام |
| `goalOptRecomp` | إعادة تشكيل | Recomposition | تبني عضلًا وتنزّل دهونًا حول التثبيت | `maintain` + hypertrophy + بروتين مرتفع |
| `goalOptStrength` | قوّة | Strength | تركيز على رفع أرقامك في الحركات الأساسية | `maintain` + strength |
| `goalOptHypertrophy` | تضخيم عضلي | Hypertrophy | تركيز على حجم العضلة وتراكم الحجم | `maintain` + hypertrophy |

##### الحالة ج — تحت 18 سنة (ثلاثة خيارات، أيًّا كان المستوى)

| المعرّف | العربية | English | يُخزَّن |
|---|---|---|---|
| `goalOptFitness` | تحسين اللياقة | Improve fitness | `maintain` + تركيز لياقة |
| `goalOptGeneral` | صحة عامة | General health | `maintain` + تركيز عام |
| `goalOptMaintain` | محافظة على وزني | Maintain my weight | `maintain` |

**تنويه القاصر — النصّ المعتمد (يحلّ محلّ `minorGoalNote` القائم):**

| | العربية | English |
|---|---|---|
| `goalMinorNote` | في عمرك، جسمك ما زال في مرحلة نموّ، فنركّز معك على اللياقة والقوّة والعادات بدل تغيير الوزن. لو رغبت في هدف يخصّ وزنك، فمختصّ التغذية هو الجهة المناسبة لذلك. | At your age your body is still growing, so we focus on fitness, strength, and habits rather than changing weight. If you're interested in a weight-related goal, a nutrition specialist is the right person for that. |

> **قواعد كتابة هذا التنويه — ملزمة:**
> - **بلا إحراج:** يشرح السبب («ما زال في مرحلة نموّ») ولا يقول «غير مسموح لك».
> - **بلا إخفاء:** لا نُظهر الخيارات المقيَّدة ثم نعطّلها بصريًا. لا تُعرض أصلًا.
> - **بلا لوم:** لا يفترض أن المستخدم كان يحاول التحايل.
> - **يعطي طريقًا:** يذكر المختصّ كوجهة، لا كتحذير.
> - النصّ القائم اليوم («أهداف تعديل الوزن متاحة من 18 سنة — ننصح بمراجعة مختص تغذية») صحيح المضمون لكنه إداري النبرة. المقترح يشرح **لماذا**، وهذا فرق الدفء كلّه.

**ما تغيّره الإجابة:** اتجاه السعرات (عجز/تثبيت/فائض) · نسب الماكروز · مدى نطاقات التكرارات · الوزن الهدف المشتقّ (`onboardingV2Adapter.ts:56`) · نبرة رسائل التقدّم.

#### Q6 · الوزن الهدف ووتيرة التغيّر — **شرطي**

- **المعرّف:** `targetTitle` · `targetHintCut` · `targetHintBulk` · `targetPaceLabel` · `targetPaceOpt*` · `targetErr*`
- **شرط الظهور:** `goalValue ∈ {cut, bulk}` **و** `age ≥ 18`. مخفيّ تمامًا في غير ذلك.

| | العربية | English |
|---|---|---|
| `targetTitle` | إلى أين تودّ أن تصل؟ | Where would you like to get to? |
| `targetHintCut` | اقترحنا رقمًا مبدئيًا يمكنك تعديله. الوتيرة المعتدلة أسهل في الاستمرار. | We've suggested a starting number you can adjust. A moderate pace is easier to sustain. |
| `targetHintBulk` | اقترحنا رقمًا مبدئيًا يمكنك تعديله. الزيادة البطيئة تعني دهونًا أقل. | We've suggested a starting number you can adjust. Slower gain means less fat. |
| `targetPaceLabel` | وتيرة التغيّر | Rate of change |
| `targetPaceOptSteady` | متأنّية — تقديريًا 0.25 كجم أسبوعيًا | Gradual — around 0.25 kg per week |
| `targetPaceOptModerate` | معتدلة — تقديريًا 0.5 كجم أسبوعيًا | Moderate — around 0.5 kg per week |
| `targetPaceOptFaster` | أسرع — تقديريًا 0.75 كجم أسبوعيًا | Faster — around 0.75 kg per week |
| `targetPaceNote` | هذه تقديرات، والواقع يختلف بين شخص وآخر. سنعدّل معك بناءً على ما نقيسه فعلًا. | These are estimates and reality differs between people. We'll adjust with you based on what we actually measure. |

**ما تغيّره:** `targetWeightKg` وحجم العجز/الفائض اليومي، ومن ثمّ السعرات المستهدفة كاملة، ومدّة الوصول المعروضة في المعاينة.

> **حدّ سلامة (يُرفع لغرفة الهندسة §10-ج):** الوتيرة «الأسرع» تُقيَّد بحدّ أدنى للسعرات لا يُخترق مهما اختار المستخدم. ولا نعرض وتيرة تتجاوز 1% من وزن الجسم أسبوعيًا.
> **لغة الوتيرة متحفّظة عمدًا** — «تقديريًا»، لأن معدّل التغيّر مُستنتَج لا مُقاس (قاعدة النبرة §6).

---

### الكتلة ز · اللوجستيات

#### Q7 · أيامك ومدّتك (شاشة واحدة، ضابطان)

- **المعرّف:** `scheduleTitle` · `scheduleDaysLabel` · `scheduleDurationLabel` · `scheduleRecommended`
- **شرط الظهور:** دائم.
- **القيم المؤكَّدة في الكود:** الأيام 3·4·5·6 والمدّة 30·45·60·75 دقيقة (`onboardingV2Flow.ts:21-22`)

| | العربية | English |
|---|---|---|
| `scheduleTitle` | كم يومًا في الأسبوع، وكم من الوقت في المرّة؟ | How many days a week, and how long each time? |
| `scheduleHint` | اختر ما تستطيع الالتزام به فعلًا، لا ما تتمنّاه. الخطة تتبعك لا العكس. | Choose what you can realistically commit to, not what you wish for. The plan follows you, not the reverse. |
| `scheduleDaysLabel` | أيام التمرين | Training days |
| `scheduleDurationLabel` | مدّة الحصة | Session length |
| `scheduleDaysUnit` | أيام | days |
| `scheduleDurationUnit` | دقيقة | min |
| `scheduleRecommended` | الموصى به لمستواك: {n} أيام | Recommended for your level: {n} days |

**ما تغيّره:** بنية التقسيمة (`splitMode`/`advancedSplit`) · عدد التمارين في الحصة · الحجم الأسبوعي لكل عضلة. والمبتدئ الذي يختار 6 أيام يرى **اقتراحًا** لا منعًا (القرار المقفل: التعديلات اقتراح دائمًا).

#### Q8 · مكان التمرين

- **المعرّف:** `placeTitle` · `placeOpt*`
- **شرط الظهور:** دائم.
- **الحقل:** `Answers.environment`

| المعرّف | العربية | English | يُخزَّن |
|---|---|---|---|
| `placeOptGym` | نادٍ مجهّز | A full gym | `commercial_gym` |
| `placeOptMachines` | صالة أجهزة محدودة | A machines-only gym | `small_gym` |
| `placeOptHome` | المنزل | At home | `home_gym` أو `bodyweight` (يحسمه Q9) |
| `placeOptOutdoor` | في الهواء الطلق | Outdoors | `bodyweight` |

| | العربية | English |
|---|---|---|
| `placeTitle` | أين تتمرّن عادةً؟ | Where do you usually train? |
| `placeHint` | نختار تمارينك بناءً على المتاح لك فعلًا. | We choose your exercises based on what's actually available to you. |

**ما تغيّره:** مجموعة التمارين المتاحة كاملةً، والبدائل المقترحة عند تعذّر تمرين.

#### Q9 · المعدّات المتاحة — **شرطي**

- **المعرّف:** `equipTitle` · `equipHint` · `equipOpt*`
- **شرط الظهور:** `place = home` **فقط**. (النادي يُفترض مجهّزًا، والهواء الطلق يُفترض وزن جسم.)
- **متعدّد الاختيار.**

| المعرّف | العربية | English |
|---|---|---|
| `equipOptNone` | لا شيء — وزن جسمي فقط | Nothing — bodyweight only |
| `equipOptDumbbells` | دمبل | Dumbbells |
| `equipOptBarbell` | بار وأوزان | Barbell and plates |
| `equipOptBands` | حبال مقاومة | Resistance bands |
| `equipOptBench` | بنش | A bench |
| `equipOptPullup` | عقلة | A pull-up bar |

| | العربية | English |
|---|---|---|
| `equipTitle` | ما المتاح لديك في المنزل؟ | What do you have at home? |
| `equipHint` | اختر كل ما ينطبق. لو لم يتوفّر شيء، فوزن الجسم كافٍ لبداية جيدة. | Select everything that applies. If you have nothing, bodyweight is enough for a good start. |

**ما تغيّره:** اختيار «لا شيء» وحده ⇒ البيئة `bodyweight` بدل `home_gym`، وهي **قيمة معرَّفة في الأنواع ولا يصلها أي مسار اليوم** (`src/types/onboarding.ts:25`). بقية الاختيارات تُرشِّح مكتبة التمارين.

> **هذا هو إصلاح السؤال الميت.** السؤال الحالي (`pref`: أجهزة/حرّة/مزيج) **لا يُحفظ ولا يغيّر شيئًا** بنصّ التعليق في `onboardingV2Adapter.ts:48`. وبقاعدتك «ما لا يغيّر شيئًا يُحذف» كان مصيره الحذف. أعدتُ صياغته سؤالًا **يغيّر البيئة فعلًا** — فصار له مستقبِل. **إن لم يُوصَل، فليُحذف** ولا يبقى سؤالًا شكليًا.

#### Q10 · النشاط خارج التمرين

- **المعرّف:** `neatTitle` · `neatOpt*` · `neatStepsToggle`
- **شرط الظهور:** دائم.
- **الحقل:** `Answers.neat` + `includeSteps` + `stepEstimate`

| | العربية | English |
|---|---|---|
| `neatTitle` | كيف يمرّ يومك خارج التمرين؟ | What does your day look like outside training? |
| `neatHint` | الحركة اليومية تصنع فرقًا في احتياجك من الطاقة أكبر ممّا يُتوقّع. | Daily movement affects your energy needs more than most people expect. |

| المعرّف | العربية | English | يُخزَّن |
|---|---|---|---|
| `neatOptSedentary` | أجلس معظم اليوم | I sit most of the day | `sedentary` |
| `neatOptLight` | أجلس كثيرًا مع بعض المشي | Mostly sitting, with some walking | `light` |
| `neatOptModerate` | أتحرّك كثيرًا خلال اليوم | I move around a lot during the day | `moderate` |
| `neatOptHigh` | على قدميّ أغلب الوقت — عمل بدني | On my feet most of the time — physical work | `high` |

| | العربية | English |
|---|---|---|
| `neatStepsToggle` | لديّ عدد خطواتي التقريبي | I know my approximate step count |
| `neatStepsLabel` | متوسط الخطوات اليومية | Average daily steps |

**ما تغيّره:** **معامل النشاط في TDEE مباشرة** — أكبر مصدر تفاوت بين شخصين متطابقَي الجسد. الفرق بين `sedentary` و`high` قد يتجاوز 600 سعرة يوميًا تقديريًا.

---

### الكتلة ح · التغذية

#### Q11 · كيف تحبّ أن نتعامل مع الطعام؟

- **المعرّف:** `nutriStyleTitle` · `nutriStyleOpt*`
- **شرط الظهور:** دائم.
- **الحقل:** `Answers.nutritionStyle` (`src/types/onboarding.ts:37`)

| | العربية | English |
|---|---|---|
| `nutriStyleTitle` | كيف تحبّ أن نساعدك في الطعام؟ | How would you like us to help with food? |
| `nutriStyleHint` | لا توجد طريقة واحدة صحيحة — اختر ما يريحك، وغيّرها متى شئت. | There's no single right way — pick what suits you, and change it whenever. |

| المعرّف | العربية | English | يُخزَّن |
|---|---|---|---|
| `nutriStyleOptMeals` | اقترح عليّ وجبات جاهزة | Suggest meals for me | `meal_suggestions` |
| `nutriStyleOptMacros` | أعطني الأرقام وأنا أدبّر نفسي | Give me the numbers, I'll handle it | `macros_only` |
| `nutriStyleOptSimple` | إرشاد بسيط بلا أرقام كثيرة | Simple guidance, without lots of numbers | `simple_guidance` |

**ما تغيّره:** شكل شاشة التغذية بالكامل · بروز أرقام الماكروز أو خفوتها · ظهور Q12 وQ14 من عدمه.

#### Q12 · عدد الوجبات — **شرطي**

- **المعرّف:** `mealsTitle` · `mealsHint` · `mealsUnit`
- **شرط الظهور:** `nutritionStyle = meal_suggestions` **فقط**. (مثبَّت في الكود: `mealsPerDay` لا يُحفظ لغير هذا النمط — `planBuilderAnswers.ts:110`.)

| | العربية | English |
|---|---|---|
| `mealsTitle` | كم وجبة تناسب يومك؟ | How many meals fit your day? |
| `mealsHint` | العدد مسألة راحة لا أفضلية — المجموع اليومي هو ما يهمّ. | The number is about comfort, not superiority — the daily total is what matters. |
| `mealsUnit` | وجبات | meals |

**ما تغيّره:** توزيع السعرات والبروتين على الوجبات، وعدد بطاقات الطعام في «اليوم».

#### Q13 · نمط الأكل والحساسية (شاشة واحدة، حقلان)

- **المعرّف:** `foodPatternTitle` · `foodPatternOpt*` · `foodAllergyLabel` · `foodAllergyPlaceholder`
- **شرط الظهور:** دائم (الحساسية مسألة سلامة، لا رفاهية نمط).
- **الحقول:** `dietPattern` + `allergies`

| المعرّف | العربية | English | يُخزَّن |
|---|---|---|---|
| `foodPatternOptNone` | لا قيود | No restrictions | `none` |
| `foodPatternOptVegetarian` | نباتي مع الألبان والبيض | Vegetarian | `vegetarian` |
| `foodPatternOptVegan` | نباتي صرف | Vegan | `vegan` |
| `foodPatternOptPescatarian` | نباتي مع الأسماك | Pescatarian | `pescatarian` |
| `foodPatternOptLowCarb` | قليل الكربوهيدرات | Low carb | `low_carb` |
| `foodPatternOptKeto` | كيتو | Keto | `keto` |

| | العربية | English |
|---|---|---|
| `foodPatternTitle` | هل هناك نمط تتبعه في طعامك؟ | Do you follow a particular way of eating? |
| `foodAllergyLabel` | حساسية أو أطعمة تتجنّبها | Allergies or foods you avoid |
| `foodAllergyPlaceholder` | مثال: مكسّرات، لاكتوز، جلوتين | e.g. nuts, lactose, gluten |
| `foodAllergyHint` | نستبعدها من كل اقتراح. أضف ما تشاء وافصل بينها بفاصلة. | We exclude these from every suggestion. Add as many as you like, separated by commas. |

**ما تغيّره:** ترشيح قاعدة الأطعمة كاملة (بما فيها الـ130 طبقًا السعودية في `src/data/saudiFoods.ts`) · اختيار مصادر البروتين البديلة · تعديل نسب الماكروز في الكيتو وقليل الكربوهيدرات.

#### Q14 · القدرة على الطبخ — **شرطي**

- **المعرّف:** `cookingTitle` · `cookingOpt*`
- **شرط الظهور:** `nutritionStyle = meal_suggestions` **فقط**.

| المعرّف | العربية | English |
|---|---|---|
| `cookingOptFull` | أطبخ بلا مشكلة | I cook without a problem |
| `cookingOptQuick` | أطبخ أشياء سريعة فقط | Only quick things |
| `cookingOptMinimal` | نادرًا ما أطبخ — جاهز أو خارجي | I rarely cook — ready-made or eating out |

| | العربية | English |
|---|---|---|
| `cookingTitle` | ما وضعك مع الطبخ؟ | How's your cooking situation? |
| `cookingHint` | نرشّح لك اقتراحات تناسب وقتك، لا اقتراحات مثالية لا تُطبَّق. | We'll suggest what fits your time, not ideal meals that never happen. |

**ما تغيّره:** ترشيح الاقتراحات حسب زمن التحضير ودرجة التعقيد، وإبراز الخيارات الجاهزة والمطاعم لصاحب «نادرًا ما أطبخ».

> **يُرفع لغرفة الهندسة (§10-د):** لا يوجد حقل `cookingCapacity` ولا وسم زمن تحضير في قاعدة الأطعمة. **بلا هذين، السؤال لا يغيّر شيئًا ويجب حذفه** بقاعدة «ما لا يغيّر شيئًا يُحذف». القرار: يُوصَل أو يُحذف — ولا يبقى معلّقًا.

> **بند مقفل مُحترَم:** لا سؤال عن الميزانية الغذائية. خارج v1 بقرار المؤسس، ولم أدرجه ولو ضمنيًا.

---

### الكتلة ط · السياق المحلي

> **مبدأ هذه الكتلة:** لا نسأل عمّا نستطيع استنتاجه، ولا نستنتج ما يمسّ خصوصية أو معتقدًا. الوقت والموسم يُستنتجان؛ الصيام والصلاة يُسألان بصياغة محايدة.

#### Q15 · وقت التمرين المفضّل

- **المعرّف:** `timingTitle` · `timingOpt*` · `timingPrayerToggle`
- **شرط الظهور:** دائم.

| المعرّف | العربية | English |
|---|---|---|
| `timingOptMorning` | صباحًا | Morning |
| `timingOptMidday` | بعد الظهر | Early afternoon |
| `timingOptAfternoon` | بعد العصر | Late afternoon |
| `timingOptEvening` | بعد المغرب | After sunset |
| `timingOptVaries` | يختلف من يوم لآخر | It varies day to day |

| | العربية | English |
|---|---|---|
| `timingTitle` | متى يناسبك التمرين عادةً؟ | When do you usually prefer to train? |
| `timingHint` | نضبط تذكيراتك على هذا الوقت، ويمكنك تعديله في أي يوم. | We'll set your reminders around this, and you can adjust any day. |
| `timingPrayerToggle` | اجعل التذكيرات تراعي أوقات الصلاة | Schedule reminders around prayer times |
| `timingPrayerHint` | لن نرسل تذكيرًا في وقت الصلاة أو قريبًا منه. | We won't send reminders at or near prayer times. |

**ما تغيّره:** جدولة التذكيرات · الخانة الزمنية المقترحة في «اليوم» · توقيت اقتراح الوجبة حول التمرين.

> **صياغة محايدة عمدًا:** «تراعي أوقات الصلاة» خيار عملي لجدولة، لا سؤال عن التزام ديني. المستخدم الذي لا يريدها يتركها دون أن يُسأل عن سبب.

#### Q16 · الصيام (رمضان بصياغة محايدة ودائمة)

- **المعرّف:** `fastingTitle` · `fastingOpt*` · `fastingNote`
- **شرط الظهور:** **دائم في كل الأوقات** — قرار مقفل. لا يظهر موسميًا ولا يختفي خارج رمضان.

| | العربية | English |
|---|---|---|
| `fastingTitle` | هل تصوم في أوقات من السنة؟ | Do you fast at times during the year? |
| `fastingHint` | نسأل مرّة واحدة، ونجهّز لك التعديل المناسب حين يحين وقته. | We ask once, and prepare the right adjustment for when the time comes. |

| المعرّف | العربية | English |
|---|---|---|
| `fastingOptRamadan` | نعم، في رمضان | Yes, during Ramadan |
| `fastingOptRegular` | نعم، صيام منتظم خلال السنة | Yes, I fast regularly through the year |
| `fastingOptNo` | لا | No |

| | العربية | English |
|---|---|---|
| `fastingNote` | حين يبدأ الصيام سنقترح عليك تعديل مواعيد الوجبات والتمرين — اقتراحًا تقبله أو تتركه، ولن نغيّر خطتك دون علمك. | When your fasting period begins we'll suggest adjusting meal and training times — a suggestion you can accept or ignore. We won't change your plan without telling you. |

**ما تغيّره:** عند تفعيل الموسم — نافذتا الوجبات (سحور/إفطار) بدل التوزيع العادي · اقتراح نقل التمرين إلى ما بعد الإفطار · تذكيرات ترطيب في نافذة الإفطار. **وخارج الموسم لا يغيّر شيئًا، وهذا صحيح ومقصود.**

> **الالتزام بالقرار المقفل مزدوج هنا:** الصياغة محايدة (لا تفترض)، والتفعيل موسمي، والتعديل **اقتراح** لا تغيير آلي صامت — القراران 2 و3 معًا.

#### Q17 · التمرين في الحرّ — **شرطي**

- **المعرّف:** `heatTitle` · `heatOpt*`
- **شرط الظهور:** `place = outdoor` **فقط**.

| | العربية | English |
|---|---|---|
| `heatTitle` | في أشهر الحرّ، ما خطّتك؟ | During the hot months, what's your plan? |
| `heatOptShift` | أنقل تمريني لوقت أبرد | I move my training to a cooler time |
| `heatOptIndoor` | أنتقل إلى مكان مغلق | I move indoors |
| `heatOptSame` | أكمل كما أنا | I carry on as usual |

| | العربية | English |
|---|---|---|
| `heatNote` | سنزيد تقدير احتياجك من الماء في الأيام الحارّة، ونذكّرك بالترطيب قبل التمرين وبعده. | We'll raise your estimated water needs on hot days and remind you to hydrate before and after training. |

**ما تغيّره:** رفع تقدير الماء موسميًا · اقتراح خانة زمنية أبرد · تنبيه ترطيب حول التمرين.

> **لماذا شرطي لا دائم:** من يتمرّن في نادٍ مكيَّف لا يستفيد شيئًا من هذا السؤال، وسؤاله يُهدر واحدًا من العشرين. أثر الحرّ على الماء يُستنتج من الموسم دون سؤال.

---

### الكتلة ي · الحسّاس الاختياري

#### Q18 · الإصابات والقيود — **قابل للتخطّي بوضوح**

- **المعرّف:** `injuryTitle` · `injuryHint` · `injurySkip` · `injuryOpt*` · `injuryOtherLabel` · `injuryConsent`
- **شرط الظهور:** دائم، **آخر الأسئلة**.
- **الحقل:** `Answers.injuries`

| | العربية | English |
|---|---|---|
| `injuryTitle` | هل هناك ما نراعيه في جسمك؟ | Is there anything we should work around? |
| `injuryHint` | نستبعد التمارين عالية الخطورة على المنطقة ونختار بدائل تمرّن العضلة نفسها. | We'll exclude higher-risk exercises for that area and pick alternatives that train the same muscle. |
| `injurySkip` | تخطّي — لا يوجد شيء | Skip — nothing to note |

| المعرّف | العربية | English |
|---|---|---|
| `injuryOptShoulder` | الكتف | Shoulder |
| `injuryOptKnee` | الركبة | Knee |
| `injuryOptLowBack` | أسفل الظهر | Lower back |
| `injuryOptWrist` | الرسغ | Wrist |
| `injuryOptAnkle` | الكاحل | Ankle |
| `injuryOptNeck` | الرقبة | Neck |
| `injuryOptElbow` | المرفق | Elbow |
| `injuryOtherLabel` | شيء آخر | Something else |

| | العربية | English |
|---|---|---|
| `injuryConsent` | هذه بيانات صحية حسّاسة. تُحفظ على جهازك، ولا تُزامَن سحابيًا إلا بموافقة منفصلة تمنحها في الإعدادات. | This is sensitive health data. It's stored on your device and is not synced to the cloud unless you give separate permission in Settings. |
| `injuryMedicalNote` | قِمّة لا تشخّص ولا تعالج. إن كان الألم مستمرًّا أو حديثًا، فمراجعة مختصّ هي الخطوة الأصحّ. | Qimmah doesn't diagnose or treat. If the pain is ongoing or recent, seeing a specialist is the right next step. |

**ما تغيّره:** استبعاد تمارين وترشيح بدائل — بنصّ قائم في القاموس («راعينا الإصابات المحدَّدة باستبعاد تمارين عالية الخطورة واختيار بدائل أأمن لنفس العضلات»).

> **زرّ التخطّي شرط تصميمي لا تفصيل:** يظهر بنفس بروز زرّ المتابعة، لا كرابط باهت أسفل الشاشة. السؤال عن الإصابات في مرحلة ما قبل الثقة سبب انسحاب معروف.
>
> **يُرفع لغرفة الهندسة (§10-هـ) — تعارض مزامنة كامن مسجَّل في الميثاق:** `onboardingProfile.ts` يُدرج الملف الكامل بما فيه `limitations.injuries` في طابور المزامنة العام، بينما `onboardingSync.ts` يكتب لقطة مصغّرة آمنة. **نصّ `injuryConsent` أعلاه وعدٌ لا يفي به الكود اليوم.** خامد فقط لأن علم المزامنة مطفأ. **لا يُنشر هذا النصّ قبل حسم التعارض** — وإلا صار وعدًا كاذبًا موقَّعًا منّا.

---

### الكتلة ك · نبني خطتك

#### S2 · شاشة البناء

- **المعرّف:** `buildingTitle` · `buildingStep1..4` · `buildingErr` · `buildingRetry`
- **الحالة:** تتبع آلة الحالة القائمة `idle → building → error/done` (`onboardingV2Flow.ts:96`).

| | العربية | English |
|---|---|---|
| `buildingTitle` | نبني خطتك الآن | Building your plan |
| `buildingStep1` | نحسب احتياجك من الطاقة | Calculating your energy needs |
| `buildingStep2` | نختار تقسيمة تناسب أيامك | Choosing a split that fits your days |
| `buildingStep3` | نرشّح التمارين المتاحة لك | Filtering exercises available to you |
| `buildingStep4` | نجهّز أهدافك الغذائية | Preparing your nutrition targets |
| `buildingErr` | لم نتمكّن من إكمال بناء خطتك. إجاباتك محفوظة كما هي. | We couldn't finish building your plan. Your answers are saved as they are. |
| `buildingRetry` | أعد المحاولة | Try again |

**قاعدة صدق ملزمة:** الخطوات المعروضة **تعكس عملًا حقيقيًا يجري**. لا شريط تقدّم وهميًا يملأ نفسه بمؤقّت. إن انتهى البناء في نصف ثانية فلتُعرض النتيجة في نصف ثانية.

**عند الفشل:** لا تُمسح الإجابات ولا تُغلق الشاشة. النمط المعتمد في الميثاق §5: تأكيد ← كتابة ← فحص ← عند الفشل: استرجاع + رسالة صادقة + **بقاء البيانات**.

---

### الكتلة ل · معاينة الخطة

#### S3 · معاينة الخطة

- **المعرّف:** `previewTitle` · `previewNumbers*` · `previewWhy` · `previewEdit` · `previewConfirm`

| | العربية | English |
|---|---|---|
| `previewTitle` | هذه خطتك المبدئية | Here's your starting plan |
| `previewNumbersTitle` | أرقامك | Your numbers |
| `previewCalories` | السعرات اليومية المستهدفة | Daily calorie target |
| `previewProtein` | البروتين | Protein |
| `previewWater` | الماء | Water |
| `previewSplit` | تقسيمتك | Your split |
| `previewWhy` | لماذا هذه الأرقام؟ | Why these numbers? |
| `previewEstimateNote` | هذه تقديرات مبنية على معادلات معتمدة وعلى ما أدخلته. الأرقام الحقيقية تظهر مع القياس، وسنعدّل معك. | These are estimates based on established equations and what you entered. Real numbers emerge with measurement, and we'll adjust with you. |
| `previewEdit` | عدّل إجاباتي | Edit my answers |
| `previewConfirm` | ابدأ | Start |

**ما تغيّره:** لا شيء — لكنها **الشاشة التي تُثبت أن الأسئلة كانت لها قيمة**. رابط `previewWhy` يفتح صفحة «كيف يحسب قِمّة أرقامك؟» (المهمّة الثالثة).

> **لغة الأرقام (قاعدة §6):** كل رقم مُستنتَج يُعرض بلغة متحفّظة («تقديري»)، وكل رقم مُقاس (الوزن الذي أدخله، أيامه التي اختارها) يُعرض بلغة حاسمة.

---

### الكتلة م · إنشاء الحساب

#### S4 · إنشاء الحساب — **بعد المعاينة لا قبلها**

- **المعرّف:** `signupTitle` · `signupBody` · `signupLater` · `signupNameLabel`

| | العربية | English |
|---|---|---|
| `signupTitle` | احفظ خطتك | Save your plan |
| `signupBody` | خطتك محفوظة على جهازك الآن. إنشاء حساب يتيح لك استعادتها لو غيّرت جهازك أو حذفت التطبيق. | Your plan is saved on this device. Creating an account lets you restore it if you change devices or reinstall. |
| `signupNameLabel` | اسمك (اختياري) | Your name (optional) |
| `signupNameHint` | نستخدمه في مخاطبتك فقط. | We only use it to address you. |
| `signupLater` | لاحقًا — استخدم التطبيق الآن | Later — use the app now |

**قرار تصميمي:** **الحساب آخر شيء، وقابل للتأجيل.** فلسفة المشروع المعلنة «محلي افتراضيًا، مزامنة اختيارية» (الميثاق §9) — وأي إعداد يفرض حسابًا قبل إظهار القيمة يناقضها نصًّا.

**الاسم يُجمع هنا لا في سؤال مستقلّ** — لأنه لا يغيّر شيئًا في الخطة، ويُطلب أصلًا في هذه الشاشة.

*(رسائل الأخطاء الكاملة لهذه الشاشة في وثيقة المهمّة الثانية.)*

---

## 5. أسئلة حذفتها — والسبب

| السؤال | لماذا حُذف | البديل |
|---|---|---|
| **الاسم كسؤال مستقلّ** | لا يغيّر شيئًا في المخرجات — يخاطبك باسمك فقط | حقل اختياري في شاشة إنشاء الحساب (S4) |
| **تفضيل نوع المعدّات (`pref`)** | **حقيقة مؤكَّدة:** لا يُحفظ إطلاقًا (`onboardingV2Adapter.ts:48`) — سؤال يغيّر صفرًا | أُعيد تصميمه إلى Q9 «المعدّات المتاحة» الذي يغيّر البيئة فعلًا |
| **اختيار التقسيمة (`splitMode`/`advancedSplit`)** | المبتدئ يُثبَّت على `auto` في الكود، والمتقدّم يقرّرها بعد رؤية الخطة لا قبلها | نُقل إلى **معاينة الخطة** كخيار «غيّر التقسيمة» — قرار مستنير بدل تخمين أعمى |
| **توزيع حجم الوجبات (`mealDistribution`)** | تفصيل دقيق في لحظة لم يبنِ فيها المستخدم ثقة بعد | إعدادات التغذية بعد الإعداد |
| **وقت الجوع (`appetiteTiming`)** | كسابقه | إعدادات التغذية بعد الإعداد |
| **تتبّع المكمّلات/الأدوية (`wellnessMode`)** | بيانات صحية حسّاسة، وسؤالها في الإعداد يُثقل ويُخيف بلا مقابل فوري | يُطلب عند أول دخول لقسم المكمّلات، بموافقته الخاصة |
| **سؤال الميزانية الغذائية** | **قرار مؤسس مقفل** — خارج v1 | لا بديل. غير مطروح |
| **سؤال «هل لديك هدف زمني؟»** | يخلق ضغطًا وموعدًا نهائيًا، ويخالف قاعدة «بلا ضغط ولا تهويل» | وتيرة التغيّر في Q6 تعطي الأثر نفسه بلا عدّاد تنازلي |

---

## 6. مصفوفة التكيّف — كل شروط التفرّع في مكان واحد

| السؤال | يظهر إذا | يُخفى إذا |
|---|---|---|
| Q3 الانتظام | `level ≠ beginner` | `level = beginner` (يُثبَّت `new` تلقائيًا) |
| Q5 الهدف — نسخة مبتدئ (4) | `level = beginner` و`age ≥ 18` | — |
| Q5 الهدف — نسخة متقدّم (6) | `level ∈ {intermediate, advanced}` و`age ≥ 18` | — |
| Q5 الهدف — نسخة القاصر (3) | `age < 18` | يتجاوز المستوى — القيد العمري أعلى أولوية |
| Q6 الوزن الهدف والوتيرة | `goal ∈ {cut, bulk}` و`age ≥ 18` | `goal = maintain` أو `age < 18` |
| Q9 المعدّات | `place = home` | نادٍ · أجهزة · هواء طلق |
| Q12 عدد الوجبات | `nutritionStyle = meal_suggestions` | باقي الأنماط |
| Q14 القدرة على الطبخ | `nutritionStyle = meal_suggestions` | باقي الأنماط |
| Q17 الحرّ | `place = outdoor` | باقي الأماكن |
| Q18 الإصابات | دائم | — (لكنه قابل للتخطّي بزرّ بارز) |

**قاعدة أولوية عند التعارض:** **القيد العمري يتقدّم على تكيّف المستوى دائمًا.** قاصر متقدّم يرى نسخة القاصر، لا نسخة المتقدّم منقوصة. لا استثناء.

---

## 7. حاجز القاصرين — الاختبار السلوكي المطلوب

هذا بند امتثال App Store لا خلل وظيفي، فيستحق تثبيتًا سلوكيًا لا بصريًا. **يُرفع لغرفة الهندسة** كمواصفة سلوك (§10-و):

1. عمر 17 ⇒ Q5 يعرض **ثلاثة** خيارات فقط، ولا يحوي شجرة الواجهة `cut` أو `bulk` **إطلاقًا** — لا معطَّلَين ولا مخفيَّين بـCSS.
2. عمر 17 ⇒ Q6 **لا يُعرض** أصلًا.
3. تعديل العمر من 20 إلى 17 بعد اختيار `cut` ⇒ الهدف يُعاد ضبطه، مع رسالة تشرح السبب بنبرة `goalMinorNote`، **ولا تُمسح بقية الإجابات**.
4. مسوّدة محفوظة تحمل `goal = cut` و`age = 16` ⇒ تُرفض عند التحميل ولا يُبنى منها ملف. (المسوّدة مدخل غير موثوق كأي مدخل — الميثاق §5.)
5. عمر 18 بالضبط ⇒ الخيارات كاملة. الحدّ شامل لا حصري.

---

## 8. جرد النصوص للتسليم

| الكتلة | مفاتيح مقترحة |
|---|---|
| القيمة | 7 |
| النية | 10 |
| المستوى | 10 |
| الموافقة الصحية | 9 |
| الأساسيات | 14 |
| الهدف | 22 |
| اللوجستيات | 27 |
| التغذية | 25 |
| السياق المحلي | 20 |
| الحسّاس | 14 |
| البناء والمعاينة والحساب | 24 |
| **المجموع** | **~182 مفتاحًا × لغتين = ~364 نصًّا** |

---

## 9. مراجعة النبرة — ما التزمتُ به وأين

| القاعدة | التطبيق |
|---|---|
| **فصحى دافئة** | «أربعة أرقام، ونبدأ» — لا «يُرجى إدخال البيانات المطلوبة» (إداري)، ولا «يلّا نبدأ» (عامّي) |
| **بلا لوم** | «الانقطاع أمر طبيعي» في Q3 — لا «لماذا توقّفت؟» |
| **بلا ضغط** | لا عدّاد تنازلي · لا «آخر خطوة!» · حُذف سؤال الموعد النهائي |
| **بلا تهويل** | الحرّ يرفع الماء، ولا يُقال «التمرين في الحرّ خطر» |
| **بلا تكديس تعجّب** | **صفر علامة تعجّب في كل نصوص هذه الوثيقة** |
| **متحفّظة للمُستنتَج** | «تقديريًا 0.5 كجم» · «يبدو أن هذا يناسبك» · «هذه تقديرات» |
| **حاسمة للمُقاس** | «الوزن بين 30 و250 كجم» · «أيام التمرين: 4» — بلا تحفّظ |
| **بلا مصطلحات متقدّمة في مسار المبتدئ** | لا RIR ولا RPE ولا Deload في أي نصّ · «بداية أخفّ» بدل Deload · «حجم التمرين» يُشرح ولا يُفترض |
| **RTL أولًا** | الوحدات بعد الرقم عربيًا (سم · كجم · دقيقة) · كل الأمثلة تفترض `dir="rtl"` |

---

## 10. يُرفع لغرفة الهندسة

> بنود تحتاج قرارًا أو صلاحية أو تعديل كود. **لا أمر فيها ولا تكليف** — عرض قرار فقط.

### أ · حقل `intent` غير موجود
النية تُغيّر ترتيب بطاقات «اليوم»، وهذا أثر دائم يحتاج تخزينًا. لا حقل له في `OnboardingProfile`. **القرار:** يُضاف حقل، أو يُقصر أثر النية على الترجيح العابر — وحينها يُعاد تقييم بقائه بقاعدة «ما لا يغيّر شيئًا يُحذف».

### ب · الأهداف الستّة لا تسع في `GoalValue` — ✅ **معتمد مفهومًا بـ[CTO-15] §2**

> **الحسم:** *«الاتجاه السعري (Cut/Maintain/Bulk) × التركيز التدريبي (قوة/تضخيم/عام) بُعدان متعامدان فعلًا، وRecomposition يسقط منهما بلا حالة خاصة.»*
> **التنفيذ لحارة A ضمن موجة الشجرة، وبشرط ملزم:** تغيير `GoalValue` **مع مهاجرة قيم المستخدمين الحاليين المخزَّنة إلى المحورين — لا كسر لبيانات قائمة، وإثبات المهاجرة يدخل البوابة.**
>
> **ما يعنيه هذا الشرط للمحتوى** (وهو نطاق غرفتي): المهاجرة **تغيّر ما يراه مستخدم قائم في شاشته**. مستخدم هدفه اليوم `cut` سيصير غدًا «تنشيف» على محورين. **يحتاج نصًّا يشرح التغيير عند أول فتح** — وإلّا قرأه المستخدم تبدّلًا صامتًا في خطّته، وهو ما يخالف القرار المقفل رقم 3 (لا تعديل آلي صامت).
>
> **نصّ مقترح لهذه اللحظة — مادة إدخال لحارة A:**
>
> | المعرّف | العربية | English |
> |---|---|---|
> | `goalMigratedTitle` | حدّثنا طريقة عرض هدفك | We've updated how your goal is shown |
> | `goalMigratedBody` | هدفك كما هو ولم يتغيّر. أضفنا إليه **تركيزًا تدريبيًا** ليصف خطّتك بدقّة أكبر. يمكنك تعديله متى شئت. | Your goal is unchanged. We've added a **training focus** to describe your plan more precisely. You can adjust it anytime. |
> | `goalMigratedCta` | حسنًا | Got it |
>
> **قاعدة صدق:** النصّ يقول «هدفك كما هو» **فقط إن كانت المهاجرة محافِظة فعلًا**. فإن غيّرت المهاجرة أرقام أي مستخدم، فالنصّ يصير كاذبًا ويجب أن يذكر التغيير وسببه.

**الاقتراح كما قُدّم:** فصل بعدين متعامدين بدل توسيع القائمة —
- `caloricDirection: cut | maintain | bulk` (القائم كما هو، بلا كسر)
- `trainingEmphasis: general | conditioning | hypertrophy | strength` (جديد، يقود نطاقات التكرارات والراحة والاختيار)

فـStrength وHypertrophy **تركيز تدريبي لا اتجاه سعري**، ووضعهما في نفس قائمة Cut خلط بين بُعدين. هذا الفصل يحلّ Recomposition أيضًا (`maintain` + hypertrophy + بروتين مرتفع) دون قيمة تعداد جديدة.

### ج · حدّ سعري أدنى لا يُخترق
وتيرة «الأسرع» في Q6 تحتاج أرضية صلبة لا تنزل السعرات تحتها مهما اختار المستخدم. **يحتاج تثبيتًا علميًا** — تفصيله في وثيقة المهمّة الثالثة.

### د · `cookingCapacity` ووسم زمن التحضير
لا حقل ولا وسم في قاعدة الأطعمة. **بلا هذين يُحذف Q14** بقاعدتك. القرار ثنائي: يُوصَل أو يُحذف.

### هـ · تعارض مزامنة الإصابات — **الأعلى خطورة في هذه الوثيقة**
نصّ `injuryConsent` يعد بأن الإصابات لا تُزامَن إلا بموافقة منفصلة. **الكود اليوم لا يفي:** `onboardingProfile.ts` يُدرج الملف الكامل بما فيه `limitations.injuries` في الطابور العام، بينما `onboardingSync.ts` يكتب لقطة مصغّرة. خامد لأن علم المزامنة مطفأ (مسجَّل في الميثاق §11). **لا يُنشر هذا النصّ قبل الحسم** — نشره يجعلنا نوقّع وعدًا لا يفي به المنتج.

### و · بيئة `bodyweight` بلا مسار
معرَّفة في `src/types/onboarding.ts:25` ولا يصلها شيء من `PLACE_TO_ENV`. Q9 («لا شيء — وزن جسمي فقط») و`placeOptOutdoor` يفتحان لها مسارًا. **يحتاج:** إضافة `outdoor` إلى `V2Place` وتوسيع خريطة البيئات.

### ز · جدولة التذكيرات حول أوقات الصلاة
تحتاج حسابًا فلكيًا أو مصدر أوقات + موقعًا. الموقع صلاحية حسّاسة. **القرار:** حساب محلي بلا شبكة (خط طول/عرض تقريبي من المدينة يختارها المستخدم) أم صلاحية موقع كاملة؟ **توصيتي: اختيار مدينة من قائمة** — يحقّق الغرض بلا صلاحية موقع، والصلاحية أثقل من الفائدة.

### ح · تفعيل موسم رمضان
السؤال دائم (قرار مقفل) والتفعيل موسمي. **يحتاج:** مصدر تاريخ هجري وقاعدة تفعيل. **توصيتي:** التفعيل **باقتراح ظاهر للمستخدم** لا آليًا صامتًا — التزامًا بالقرار المقفل رقم 3.

### ط · استبدال `minorGoalNote`
النصّ المقترح في Q5 يحلّ محلّ القائم في `src/i18n/dict/profileChoices.ts`. **ملاحظة تنسيق:** الميثاق يذكر أن موجة `q17` تنقل هذا النصّ من ثابت صلب إلى قاموس — فالاستبدال يجب أن يقع **بعد** استقرار ذلك النقل، لا بالتوازي معه.

### ي · القاموس الجديد `onboardingFlow.ts`
حارة مستقلّة بقاموس مستقلّ (الميثاق §1.4: كل حارة تنشئ قاموسها ولا تعدّل قاموسًا مشتركًا). **لا يُوسَّع `onboarding.ts`** — 1306 سطرًا ويخدم شاشتين أخريين، وتعديله من حارة يخلق بؤرة تصادم.

---

## 11. حالة القرارات بعد [CTO-15]

| البند | الحالة |
|---|---|
| **§1 · فصل النية عن الهدف** | ✅ **معتمد** — و§8 من الميثاق يُغلق رسميًا. التسلسل ملزم لحارة A |
| **§10-ب · نموذج الهدف ثنائي المحور** | ✅ **معتمد مفهومًا** — التنفيذ لحارة A مع **مهاجرة مثبتة في البوابة** |
| **§10-ط · نبرة تنويه القاصر** | ✅ **محسوم** — فصحى دافئة ([CTO-15] §3). النصّ المقترح في Q5 يحلّ محلّ `minorGoalNote` |
| **§10-هـ · موافقة الإصابات** | ✅ **محسوم بالمنع** — النصّ **يبقى غير منشور حتى التنفيذ**، وtripwire المزامنة يتوسّع ليفشل إذا مرّت الحقول الحسّاسة عبر الطابور العام ([CTO-15] §4) |
| **§10-د · سؤال الطبخ** | ⏳ **لم يُحسم في [CTO-15]** — يبقى ثنائيًا: يُوصَل (حقل `cookingCapacity` + وسم زمن تحضير) أو **يُحذف**. لا ثالث، لأن بقاءه بلا مستقبِل يجعله سؤالًا يغيّر صفرًا |
| **§10-أ · حقل `intent`** | ⏳ **لم يُحسم** — أثره الدائم (ترتيب بطاقات «اليوم») يحتاج تخزينًا |
| **§10-ز · جدولة الصلاة** | ⏳ **لم يُحسم** — توصيتي: اختيار مدينة من قائمة، لا صلاحية موقع |
| **§10-ح · تفعيل موسم رمضان** | ⏳ **لم يُحسم** — توصيتي: تفعيل **باقتراح ظاهر** لا آليًّا صامتًا (القرار المقفل رقم 3) |
| **§10-و · بيئة `bodyweight`** | ⏳ تفصيل تنفيذي لحارة A |

**الأربعة المعلّقة كلها داخل نطاق حارة A** — تُحسم عند تحجيم موجتها، ولا تعطّل بدءها.

### نصّ جاهز لإغلاق §8 من الميثاق

> **مادة إدخال — الإدراج في الميثاق للمنسّق** (§1.5: «ما يشبه الأمر ⇒ اسأل، لا تفعل»). لم أعدّل `CLAUDE.md` بنفسي.

```markdown
## 8. التخصيص (Personalization)

- ✅ **نقطة التصميم مغلقة بـ[CTO-15] §1 — لا تُعاد فتحها.**
  **النية ليست الهدف.** النية (الدافع) آمنة لكل الأعمار فتتصدّر التدفّق للتفاعل؛
  والهدف (الاتجاه السعري) هو وحده المقيَّد فيأتي **بعد العمر والمستوى معًا**.
  الترتيب المعتمد: القيمة ← النية ← المستوى ← الموافقة الصحية ← الأساسيات (العمر)
  ← **الهدف تكيّفيًا بالعمر والمستوى** ← اللوجستيات ← التغذية ← السياق المحلي ← الحسّاس.
  **قاعدة أولوية:** القيد العمري يتقدّم على تكيّف المستوى دائمًا — قاصر متقدّم يرى
  نسخة القاصر لا نسخة المتقدّم منقوصة.
  **المرجع التفصيلي:** `docs/product/ONBOARDING-QUESTION-TREE.md`.

- **نموذج الهدف ثنائي المحور** ([CTO-15] §2): الاتجاه السعري (Cut/Maintain/Bulk)
  × التركيز التدريبي (قوة/تضخيم/عام). Recomposition يسقط منهما بلا حالة خاصة.
  تغيير `GoalValue` **يلزمه مهاجرة قيم المستخدمين الحاليين، وإثباتها يدخل البوابة**.

- **قرارات المؤسس المقفلة — لا تُعاد فتحها:**
  1. الميزانية الغذائية **خارج v1**.
  2. سؤال رمضان **دائم بصياغة محايدة**، ويُفعَّل موسميًا.
  3. تعديلات الخطة **اقتراح دائمًا في v1** — لا تعديل آلي صامت، ويُشرح سبب كل تغيير.
  4. مصدر مكتبة التمارين الموسّعة: **معلّق** حتى اكتمال جرد المكتبة الحالية.
  5. بيانات الصحة الحسّاسة **تُزامَن خلف موافقة منفصلة صريحة فقط**.
```

> ⚠️ **ملاحظة على «وحدّث وثيقة التخصيص»:** بحثتُ عن `PERSONALIZATION-SPEC` في المستودع كاملًا فلم أجد له أثرًا (`find` بلا نتيجة). و§8 يصفه بأنه «مصدر الحقيقة». **فإمّا أنه خارج المستودع، وإمّا أن §8 نفسه هو الوثيقة.** النصّ أعلاه مكتوب على الاحتمال الثاني — **يُصحَّح إن كان الأول**.

---

*انتهت المهمّة الأولى. المهمّة الثانية — طقم رسائل أخطاء إنشاء الحساب — في ملف مستقلّ.*
