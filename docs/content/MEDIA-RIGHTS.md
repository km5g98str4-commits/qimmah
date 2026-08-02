# تدقيق ومعالجة حقوق وسائط التمارين — Qimmah

**تاريخ التدقيق:** 2026-07-16 · **تاريخ المعالجة:** 2026-07-16

**قاعدة الفرع:** `integration/wave6-staging@82c53ceb0e873727a38b5cfebd641e8db14f7b23`
**فرع المعالجة:** `fix/media-rights-remediation`

**النطاق:** كل المراجع المشحونة في `exerciseMedia.ts` و`machineImages.ts`: **274/274**.

**الحكم بعد المعالجة:** **GO.** أُزيل مانع الإطلاق. الأصول الأربعة والعشرون غير الآمنة (٢٣ `UNKNOWN` + ١ `RESTRICTED`)
حُذفت من مسار الشحن واستُبدلت برسوم توضيحية متجهية أصلية (SVG) من إنتاج قِمّة الداخلي. لم يُشحن أي أصل «يشبه» الجهاز
ولا أي مادة مقيّدة. النتيجة: **`UNKNOWN=0`، `RESTRICTED=0`، كل أصل `CLEARLY-LICENSED` أو `IN-HOUSE`.**

> هذا تدقيق هندسي لسلسلة المصدر، وليس رأياً قانونياً. «موافقة على الصورة» أو ظهورها في commit لا يثبت ملكية حق النشر أو ترخيص إعادة التوزيع.

## النتيجة العددية

| التصنيف | قبل | بعد | حكم الإطلاق |
| --- | ---: | ---: | --- |
| `CLEARLY-LICENSED` | 250 | 250 | نظيف وفق Unlicense/إهداء الملك العام المثبّت في المستودعين المصدرين |
| `IN-HOUSE` | 0 | 24 | عمل أصلي 100% من `scripts/media/build-machine-placeholders.mjs` — لا مصدر طرف ثالث ولا علامة |
| `UNKNOWN` | 23 | **0** | ✅ عولج |
| `RESTRICTED` | 1 | **0** | ✅ عولج (حُذف أصل FITWILL نهائيًا) |
| **الإجمالي** | **274** | **274** | manifest متزامن 274/274، جميعها بحكم صالح |

السجل القانوني الكامل — المسار، رابط الأصل، SHA-256، نوع magic bytes، الدليل والحكم لكل أصل — في
[`scripts/media/provenance-manifest.json`](../../scripts/media/provenance-manifest.json). **يفشل الاختبار** إذا ظهر مرجع بلا صف صريح،
أو برابط أصل من مضيف غير موثوق، أو بـ magic bytes خاطئة، أو باختلاف في العدد، أو بأي حكم `UNKNOWN`/`RESTRICTED`.

## ما الذي عُولج (سجل التغيير)

1. **حذف الأصول الأربعة والعشرين غير الآمنة** من `public/exercise-machine-images/` — بما فيها أصل FITWILL المائي
   `decline-chest-press-machine.jpg` — من مسار الشحن تمامًا.
2. **توليد ٢٤ رسمًا توضيحيًا داخليًا (SVG)** عبر `scripts/media/build-machine-placeholders.mjs` (pipeline الهوية):
   رسم متجهي موحّد لجهاز مقاومة عام + اسم الجهاز (عربي/إنجليزي) + شارة نزاهة «رسم توضيحي داخلي · قِمّة». حتمي
   (نفس البايتات في كل تشغيل) وقابل للتدقيق نصيًا. لا يدّعي أنه صورة فوتوغرافية للجهاز المحدّد، فلا يُضلّل المستخدم.
3. **إعادة توصيل** `src/data/machineImages.ts` (مُولّد) إلى مسارات `.svg`، وتحديث البديل بالاصطلاح في
   `ExerciseMedia.tsx` إلى `.svg`. غياب الملف → البديل الأنيق (لا صورة مكسورة).
4. **تشديد** `scripts/media/media-rights-proof.mjs`: يفشل الآن على أصل بلا rights row، أو URL أصل من مضيف غير موثوق،
   أو magic bytes خاطئة (الأجهزة يجب أن تكون `image/svg+xml`)، أو mismatch في العدد، أو أي حكم `UNKNOWN`/`RESTRICTED`.
5. **إعادة ختم** `provenance-manifest.json` بـ 274 صفًّا (250 `CLEARLY-LICENSED` + 24 `IN-HOUSE`).
6. **إصلاح** فشل `run-p3-media-proof` (تسرّب `cable-biceps-curl` إلى خطة المبتدئ): جُعل اختيار الإضافة
   (`pickAccessory`) واعيًا بالمستوى فيطبّق `cableOk` — الكيبل الحرّ للمتقدّم فقط. خطة المبتدئ بقيت ٢٤ تمرينًا بصفر كيبل حرّ.

## خريطة المصادر والأدلة

| المصدر الفعلي | العدد | مسار CDN/المصدر | دليل الترخيص المثبّت | الحكم | الإسناد |
| --- | ---: | --- | --- | --- | --- |
| `yuhonas/free-exercise-db` | 250 | `raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/...` | [README](https://github.com/yuhonas/free-exercise-db/blob/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/README.md) قاعدة عامة + [LICENSE](https://github.com/yuhonas/free-exercise-db/blob/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/LICENSE.md) Unlicense | `CLEARLY-LICENSED` | لا يفرض Unlicense إسناداً |
| `wrkout/exercises.json` (الأصل الجذر) | سلسلة الـ250 نفسها | `github.com/wrkout/exercises.json` | [README](https://github.com/wrkout/exercises.json/blob/5994bea047eee4d39a2c0872be3dd8fdd258ba31/README.md) Public Domain + [LICENSE](https://github.com/wrkout/exercises.json/blob/5994bea047eee4d39a2c0872be3dd8fdd258ba31/LICENSE.md) Unlicense | يدعم `CLEARLY-LICENSED` | لا شرط إسناد |
| قِمّة — رسوم داخلية (IN-HOUSE) | 24 | `public/exercise-machine-images/{slug}.svg` مُولّدة من `scripts/media/build-machine-placeholders.mjs` | عمل أصلي 100% داخل المستودع، بلا مصدر طرف ثالث ولا علامة تجارية ولا أشخاص؛ حتمي وقابل لإعادة التوليد | `IN-HOUSE` | نملك الحقوق كاملة؛ إسناد اختياري |

### تحقق الشبكة

- ثُبّت رأس `yuhonas/free-exercise-db` عند `b0eed061…`، ورأس الأصل الجذر `wrkout/exercises.json` عند `5994bea0…`.
- جرى تنزيل **كل رابط من روابط الأصل الـ250**: HTTP ناجح، magic bytes صورة، وSHA-256 مطابق تمامًا للنسخة المحلية (250/250).
- الأصول الأربعة والعشرون الآن داخلية بلا رابط أصل خارجي — لا حاجة لتحقق شبكي، ومصدرها سكربت التوليد داخل المستودع.

## سجل صور الأجهزة — الحكم بعد المعالجة

جميع الأصول أدناه أصبحت `IN-HOUSE` (رسم توضيحي متجهي أصلي بديل)، والحكم السابق مذكور للسجل. عمود commit يشير إلى
إدخال الملف القديم غير الآمن الذي حُذف.

| الأصل (الآن `{slug}.svg`) | الحكم السابق | commit القديم المحذوف | الحكم الحالي |
| --- | --- | --- | --- |
| `chest-supported-row-machine` | UNKNOWN | `163a5868` | **IN-HOUSE** |
| `decline-chest-press-machine` | **RESTRICTED** (FITWILL) | `c5372798` | **IN-HOUSE** (حُذف أصل FITWILL) |
| `glute-kickback-machine` | UNKNOWN | `600599e7` | **IN-HOUSE** |
| `glute-machine` | UNKNOWN | `77edda97` | **IN-HOUSE** |
| `hack-squat-machine` | UNKNOWN | `77edda97` | **IN-HOUSE** |
| `hip-abduction-machine` | UNKNOWN | `4f23850f` | **IN-HOUSE** |
| `hip-adductor-machine` | UNKNOWN | `77edda97` | **IN-HOUSE** |
| `iso-lateral-chest-press` | UNKNOWN | `3bc50fc5` | **IN-HOUSE** |
| `iso-lateral-high-row` | UNKNOWN | `3bc50fc5` | **IN-HOUSE** |
| `iso-lateral-incline-press` | UNKNOWN | `966dbb20` | **IN-HOUSE** |
| `iso-lateral-pulldown` | UNKNOWN | `3bc50fc5` | **IN-HOUSE** |
| `lateral-raise-machine` | UNKNOWN | `966dbb20` | **IN-HOUSE** |
| `pec-deck-machine` | UNKNOWN | `600599e7` | **IN-HOUSE** |
| `preacher-curl-machine` | UNKNOWN | `3e178807` | **IN-HOUSE** |
| `rear-delt-row-machine` | UNKNOWN | `600599e7` | **IN-HOUSE** |
| `seated-calf-raise-machine` | UNKNOWN | `3e178807` | **IN-HOUSE** |
| `seated-leg-curl` | UNKNOWN | `3e178807` | **IN-HOUSE** |
| `shoulder-press-machine` | UNKNOWN | `163a5868` | **IN-HOUSE** |
| `single-arm-lat-pulldown` | UNKNOWN | `d4acbaf1` | **IN-HOUSE** |
| `standing-calf-raise-machine` | UNKNOWN | `3e178807` | **IN-HOUSE** |
| `standing-hip-extension-machine` | UNKNOWN | `e0a41442` | **IN-HOUSE** |
| `standing-leg-curl` | UNKNOWN | `163a5868` | **IN-HOUSE** |
| `triceps-extension-machine` | UNKNOWN | `e0a41442` | **IN-HOUSE** |
| `wide-grip-iso-lateral-pulldown` | UNKNOWN | `3bc50fc5` | **IN-HOUSE** |

## لماذا رسوم داخلية لا «swaps» من الـ250؟

لا يوجد في المصادر المثبتة بديل مطابق ومتحقق لهذه الأجهزة: قاعدة `free-exercise-db` تعرض إطارات حركة بوزن حرّ لا
لقطات جهاز، فاستبدال بطاقة جهاز بصورة وزن حرّ أو جهاز مختلف تضليل للمستخدم. التحقق من التطابق التشريحي (العضلة، نوع الجهاز،
اتجاه الحركة، وضع البداية/النهاية) استبعد كل مرشّح بالاسم فقط. لذلك المسار الأأمن — وهو ما نفّذناه — رسم توضيحي
داخلي موحّد نملك حقوقه، لا مادة «تشبه» الجهاز. يبقى خيار المالك لاحقًا: جلسة تصوير أصلية (work-for-hire) أو مجموعة
رسوم مفصّلة لكل جهاز، تُرقّى حينها الأصول من `IN-HOUSE` العام إلى صور جهاز محدّدة موثّقة.

## الإسناد الجاهز للشحن — AR/EN ومكان ظهوره

لا يفرض Unlicense إسناداً، والرسوم الداخلية نملكها؛ فالإسناد **اختياري وشفّاف** لا إلزامي. يظهر النص التالي داخل
التطبيق في **الإعدادات ← شروط الاستخدام** (`termsBody` في `src/config/strings.ts`، عربي وإنجليزي)، وعلى صفحة الشروط في الويب:

> **العربية:** مصادر الوسائط: صور إرشادات التمارين الثابتة مشتقة من قاعدتَي `free-exercise-db` و`wrkout/exercises.json`،
> ومتاحة بموجب Unlicense/إهداء الملك العام. أمّا الرسوم التوضيحية لبطاقات الأجهزة فهي أعمال أصلية من إنتاج قِمّة (IN-HOUSE) نملك حقوقها كاملةً.
>
> **English:** Media sources: Static exercise-instruction images are derived from `free-exercise-db` and `wrkout/exercises.json`,
> available under the Unlicense/public-domain dedication. Machine-card illustrations are original in-house Qimmah artwork that we fully own.

لا تُذكر FITWILL في أي إسناد؛ أصلها حُذف نهائيًا من المستودع ومسار الشحن.

## إعادة التحقق

```bash
# تحقق offline إلزامي: manifest + الملفات + magic bytes + HTTP محلي + بوابة الأحكام
node scripts/media/media-rights-proof.mjs

# تحقق المصدر الشبكي: يضيف تنزيل ومقارنة SHA-256 لكل رابط أصل (250)
node scripts/media/media-rights-proof.mjs --remote

# إعادة توليد الرسوم الداخلية + الخريطة (حتمي)، ثم إعادة الختم:
node scripts/media/build-machine-placeholders.mjs && node scripts/media/media-rights-proof.mjs --bootstrap
```

النتيجة المتوقعة:

```text
MEDIA_RIGHTS_PROOF_OK inventory=274 magic=274 http=274
UPSTREAM_PROOF_OK http_magic_digest=250
VERDICTS CLEARLY-LICENSED=250 IN-HOUSE=24
```

### نتيجة البوابات (فرع المعالجة)

| البوابة | النتيجة |
| --- | --- |
| `media-rights-proof --remote` | PASS: محلي/magic/HTTP `274/274`، upstream `250/250`، `UNKNOWN=0 RESTRICTED=0` |
| بوابات الفشل (rights row / URL مجهول / magic خاطئة / count) | PASS: تحقّقت سلبيًا — كل بوابة تُفشِل الاختبار فعليًا |
| `run-p3-media-proof` | PASS: خطة المبتدئ ٢٤ تمرينًا بصفر كيبل حرّ (عولج تسرّب `cable-biceps-curl`) |
| `typecheck` / `lint` / production `build` | PASS |
| `test:*` (السلسلة الكاملة) | يُشغَّل في بوابة التسليم |

## بروتوكول التدقيق الأصلي (سجل)

قبل المعالجة نُفّذت خمس طبقات إثبات لكل ملف جهاز ثم توقف البحث بدل التخمين: (1) تاريخ Git، (2) commit/body والمؤلف،
(3) magic bytes والبصمة، (4) بحث العلامة المرئية FITWILL وشروط المصدر، (5) بحث الويب عن المصدر/الترخيص. لم يظهر دليل
قابل للمراجعة لـ23 ملفًا، وأصل FITWILL كان مقيّدًا صراحةً — لذلك كان الحكم `UNKNOWN×23 + RESTRICTED×1` نهائيًا،
وعولج بالاستبدال الداخلي الموثّق أعلاه بدل ترقية وهمية للحكم.
