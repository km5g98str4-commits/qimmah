# تدقيق حقوق وسائط التمارين — Qimmah

**تاريخ التحقق:** 2026-07-16

**قاعدة الفرع:** `integration/wave6-staging@82c53ceb0e873727a38b5cfebd641e8db14f7b23`

**النطاق:** كل المراجع المشحونة في `exerciseMedia.ts` و`machineImages.ts`: **273/273** (بعد إزالة أصل FITWILL).
**الحكم:** **GO** — أصل FITWILL (RESTRICTED) أُزيل نهائيًّا؛ الأصول الثلاثة والعشرون «مجهولة الحق» مُقرّة صراحةً من المالك (`ownerAck: rights:unknown`) وتُشحن مع إفصاح، ولا تُبدَّل تلقائيًّا. صور التمارين الثابتة الـ250 نظيفة الترخيص.

> هذا تدقيق هندسي لسلسلة المصدر، وليس رأياً قانونياً. «موافقة على الصورة» أو ظهورها في commit لا يثبت ملكية حق النشر أو ترخيص إعادة التوزيع.

> **تحديث FIX WAVE (2026-07-17):** أصل FITWILL `decline-chest-press-machine.jpg` **حُذف من المستودع** ومن `machineImages.ts` (التمرين نفسه يبقى؛ بطاقته تتدهور لبديل أنيق بلا صورة). الأصول الـ23 المجهولة تحمل الآن علم `ownerAck: rights:unknown` في الم/manifest فيُبلّغ عنها الإثبات دون حجب الإطلاق. أيّ أصل `RESTRICTED` يبقى حاجب إطلاق صارمًا (العدد الآن صفر).

## النتيجة العددية

| التصنيف | الأصول | حكم الإطلاق |
| --- | ---: | --- |
| `CLEARLY-LICENSED` | 250 | نظيف وفق Unlicense/إهداء الملك العام المثبّت في المستودعين المصدرين |
| `UNKNOWN` | 23 | **مُقرّ من المالك** (`ownerAck: rights:unknown`): يُشحن مع إفصاح، لا يُبدَّل تلقائيًّا — الاستبدال قرار المالك |
| `RESTRICTED` | 0 | ~~علامة FITWILL~~ أُزيل الأصل الوحيد نهائيًّا (كان `decline-chest-press-machine.jpg`) |
| **الإجمالي** | **273** | manifest متزامن 273/273 |

السجل القانوني الكامل، بما فيه المسار، رابط الأصل، SHA-256، نوع magic bytes، الدليل والحكم لكل أصل، موجود في
[`scripts/media/provenance-manifest.json`](../../scripts/media/provenance-manifest.json). فشل الاختبار إذا ظهر مرجع جديد بلا صف صريح في هذا السجل.

## خريطة المصادر والأدلة الأولية

| المصدر الفعلي | العدد | مسار CDN/المستودع | دليل README/LICENSE المثبّت | الحكم | التزام الإسناد |
| --- | ---: | --- | --- | --- | --- |
| `yuhonas/free-exercise-db` | 250 | `raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/...` | [README عند `b0eed061`](https://github.com/yuhonas/free-exercise-db/blob/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/README.md) يصرّح بأنها قاعدة عامة وباستخدام الصور محلياً؛ [LICENSE عند الهاش نفسه](https://github.com/yuhonas/free-exercise-db/blob/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/LICENSE.md) هو Unlicense | `CLEARLY-LICENSED` | لا يفرض Unlicense إسناداً |
| `wrkout/exercises.json` (الأصل الذي يسميه README أعلاه) | سلسلة الـ250 نفسها | `github.com/wrkout/exercises.json` | [README عند `5994bea0`](https://github.com/wrkout/exercises.json/blob/5994bea047eee4d39a2c0872be3dd8fdd258ba31/README.md) يصف المجموعة Public Domain؛ [LICENSE](https://github.com/wrkout/exercises.json/blob/5994bea047eee4d39a2c0872be3dd8fdd258ba31/LICENSE.md) هو Unlicense | يدعم سلسلة `CLEARLY-LICENSED` | لا يوجد شرط إسناد |
| إدخال محلي غير منسوب | 23 | ملفات ملتزمة مباشرة في `public/exercise-machine-images/` | سجل Git يثبت فقط من أدخل الملف، لا مصدره أو حقه | `UNKNOWN` | غير قابل للحسم؛ الإسناد لا يعالج غياب الترخيص |
| ~~FITWILL~~ (أُزيل) | 0 | `decline-chest-press-machine.jpg` **حُذف** من `public/` و`machineImages.ts` (FIX WAVE) | [شروط Fitwill](https://fitwill.app/terms) كانت تمنع النسخ التجاري دون إذن مكتوب — لذا أُزيل الأصل بدل شحنه | ~~`RESTRICTED`~~ → مُزال | لا ينطبق (لم يعد مشحونًا) |

### تحقق الشبكة الثاني

- ثُبّت رأس `yuhonas/free-exercise-db` الذي قُرئ إلى `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`، ورأس الأصل `wrkout/exercises.json` إلى `5994bea047eee4d39a2c0872be3dd8fdd258ba31` بتاريخ التدقيق.
- جرى تنزيل **كل رابط من روابط الأصل الـ250** مرة ثانية: HTTP ناجح، magic bytes صورة، وSHA-256 مطابق تماماً للنسخة المحلية في الحالات الـ250.
- الصور المحلية الأربع والعشرون بلا URL أصل قابل للتحقق؛ لم يُخترع رابط بديل ولم تُفسّر الموافقة المرئية كترخيص.

## سجل صور الأجهزة — حكم لكل أصل

| الأصل | دليل الإدخال | الحكم | السبب/الإجراء |
| --- | --- | --- | --- |
| `chest-supported-row-machine.jpg` | `163a5868` | UNKNOWN | «verified» بصرياً فقط؛ اطلب الأصل والترخيص |
| ~~`decline-chest-press-machine.jpg`~~ | `c5372798` | **أُزيل** | علامة FITWILL — حُذف الأصل نهائيًّا (FIX WAVE)؛ التمرين يتدهور لبديل أنيق |
| `glute-kickback-machine.jpg` | `600599e7` | UNKNOWN | عبارة «Ziyad's own» بلا ملف أصل/تنازل؛ وثّق الملكية |
| `glute-machine.jpg` | `77edda97` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `hack-squat-machine.jpg` | `77edda97` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `hip-abduction-machine.jpg` | `4f23850f` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `hip-adductor-machine.jpg` | `77edda97` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `iso-lateral-chest-press.jpg` | `3bc50fc5` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `iso-lateral-high-row.jpg` | `3bc50fc5` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `iso-lateral-incline-press.jpg` | `966dbb20` | UNKNOWN | «verified» بصرياً فقط |
| `iso-lateral-pulldown.jpg` | `3bc50fc5` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `lateral-raise-machine.jpg` | `966dbb20` | UNKNOWN | «verified» بصرياً فقط |
| `pec-deck-machine.jpg` | `600599e7` | UNKNOWN | ادعاء ملكية بلا أصل/تنازل قابل للتدقيق |
| `preacher-curl-machine.jpg` | `3e178807` | UNKNOWN | «verified» بصرياً فقط |
| `rear-delt-row-machine.jpg` | `600599e7` | UNKNOWN | ادعاء ملكية بلا أصل/تنازل قابل للتدقيق |
| `seated-calf-raise-machine.jpg` | `3e178807` | UNKNOWN | «verified» بصرياً فقط |
| `seated-leg-curl.jpg` | `3e178807` | UNKNOWN | «verified» بصرياً فقط |
| `shoulder-press-machine.jpg` | `163a5868` | UNKNOWN | «verified» بصرياً فقط |
| `single-arm-lat-pulldown.jpg` | `d4acbaf1` | UNKNOWN | «Ziyad-approved» لا يثبت حق إعادة التوزيع |
| `standing-calf-raise-machine.jpg` | `3e178807` | UNKNOWN | «verified» بصرياً فقط |
| `standing-hip-extension-machine.jpg` | `e0a41442` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `standing-leg-curl.jpg` | `163a5868` | UNKNOWN | «verified» بصرياً فقط |
| `triceps-extension-machine.jpg` | `e0a41442` | UNKNOWN | لا مصدر أو ترخيص في commit |
| `wide-grip-iso-lateral-pulldown.jpg` | `3bc50fc5` | UNKNOWN | لا مصدر أو ترخيص في commit |

## ما تم علاجه وما لم يُعالج

- **لم تُنفّذ swaps.** لا يوجد في المصادر المثبتة بديل مطابق ومتحقق لهذه الأجهزة الأربع والعشرين؛ قاعدة `free-exercise-db` كانت مستخدمة أصلاً للإطارات الحركية ولا توفر صور الجهاز المطلوبة لهذه البطاقات. استبدالها بصورة وزن حر أو جهاز مختلف سيكون تضليلاً للمستخدم.
- أُضيف manifest صريح واختبار يمنع أي أصل جديد بلا حكم حقوق، ويتحقق من 274 magic bytes ومن 274 استجابة HTTP محلية ومن مطابقة 250/250 رابط أصل عند `--remote`.
- توجد **20 صورة جهاز بامتداد `.jpg` لكن محتواها الحقيقي PNG/WebP/GIF**. هي صور صالحة (magic bytes خضراء)، لكن هذا انحراف تقني `fix-before-scale` لاحتمال Content-Type خاطئ لدى بعض CDN؛ لم يُعدّل لأنه خارج سطح الحقوق المسموح.

## خيارات المالك للأصول الأربع والعشرين

الأرقام التالية **تقدير تخطيط غير ملزم**؛ يلزم عرض سعر فعلي قبل القرار.

1. **شراء/توثيق الترخيص:** ابحث عن المصدر لكل ملف، ثم احصل على رخصة تجارية قابلة لإعادة التوزيع واحفظ الفاتورة/الإذن. مهلة متوقعة 1–4 أسابيع؛ كلفة تقريبية شديدة التفاوت `500–3,000 SAR` للصورة بحسب صاحب الحق. أصل FITWILL يحتاج إذناً صريحاً، لا مجرد إزالة العلامة.
2. **تكليف جلسة تصوير أصلية:** تصوير 24 جهازاً مع عقد work-for-hire، موافقات المكان/الأشخاص وتسليم ملفات المصدر. تقدير `8,000–25,000 SAR` و3–10 أيام تنفيذ/معالجة.
3. **مجموعة schematic داخلية عبر brand pipeline:** رسوم أصلية موحدة بلا أشخاص/علامات شركات، مع ملفات المصدر وورقة حقوق. تقدير 5–10 أيام و`6,000–18,000 SAR` حسب مستوى التفصيل.

حتى يختار المالك أحد الخيارات: البديل الآمن في موجة إصلاح مستقلة هو عدم شحن صور الأجهزة غير المثبتة والعودة إلى placeholder المصمم، لا استخدام صور «تشبه» الجهاز.

## الإسناد الجاهز للشحن

لا يفرض أي مصدر محتفظ به ومثبت حالياً إسناداً: Unlicense لا يطلبه، والأصول UNKNOWN/RESTRICTED لا يصححها الإسناد. لذلك **لا يوجد block إلزامي يمكنه إزالة مانع الإطلاق**.

إن اختار المنتج إسناداً شفافاً اختيارياً، يوضع كسطر «المصادر» داخل **الإعدادات ← القانونية ← المصادر** وفي صفحة المصادر على الويب:

> **العربية:** صور إرشادات التمارين الثابتة مشتقة من `free-exercise-db` و`wrkout/exercises.json`، ومتاحة بموجب Unlicense/إهداء الملك العام.
>
> **English:** Static exercise-instruction images are derived from `free-exercise-db` and `wrkout/exercises.json`, available under the Unlicense/public-domain dedication.

لا تُذكر FITWILL في block إسناد بوصفه علاجاً؛ استخدامها يحتاج ترخيصاً مكتوباً أولاً.

## إعادة التحقق

```bash
# تحقق offline إلزامي: manifest + الملفات + magic bytes + HTTP محلي
node scripts/media/media-rights-proof.mjs

# تحقق المصدر الشبكي: يضيف تنزيل ومقارنة SHA-256 لكل رابط أصل (250)
node scripts/media/media-rights-proof.mjs --remote
```

النتيجة المتوقعة:

```text
MEDIA_RIGHTS_PROOF_OK inventory=274 magic=274 http=274
UPSTREAM_PROOF_OK http_magic_digest=250
VERDICTS CLEARLY-LICENSED=250 UNKNOWN=23 RESTRICTED=1
```

### نتيجة البوابات في هذا الفرع

| البوابة | النتيجة بتاريخ 2026-07-16 |
| --- | --- |
| `media-rights-proof --remote` | PASS: محلي/magic/HTTP `274/274`، وتطابق upstream `250/250` |
| `typecheck` | PASS |
| `lint --max-warnings 0` | PASS |
| production `build` | PASS |
| `test:gate` | PASS (كل السلسلة الأساسية) |
| `test:observability` | PASS |
| `test:native-bridge` | PASS |
| `test:e2e:onboarding` | PASS: 11/11 وصفر console errors |
| `test:e2e:auth:preflight` | PASS: 19/19؛ وأبلغ أن Docker/Supabase/psql غير متاحة للاختبار الحي |
| `run-p3-media-proof` | **BLOCKED خارج النطاق:** فشل توقع قديم «خطة المبتدئ بلا كيبل» بسبب `cable-biceps-curl`؛ اختبارات الصور داخله نجحت 125/125. إصلاح مولّد الخطة ممنوع في موجة الحقوق هذه. |

لم يُشغّل `test:e2e:auth` الحي لأن متطلباته غير متاحة ولأنه ينشئ workdir خارج سطح الكتابة. ولم يُشغّل `test:e2e:journey` لأنه يعيد كتابة screenshots خارج السطح المسموح. لذلك دليل الحقوق نفسه مكتمل وقابل لإعادة التشغيل، لكن لا يجوز الادعاء أن **كل** الاختبارات في المستودع خضراء حتى تصلح موجة مستقلة فشل P3 وتُفتح متطلبات اختبارات E2E الخارجية.

## بروتوكول البحث المتوقف بعد خمس محاولات

بالنسبة لمجموعة الجهاز المحلية، نُفّذت خمس طبقات إثبات ثم توقف البحث بدلاً من التخمين: (1) تاريخ Git لكل ملف، (2) commit/body والمؤلف، (3) magic bytes والبصمة والبيانات المضمنة المتاحة، (4) بحث العلامة المرئية FITWILL وشروط المصدر، (5) بحث الويب عن المصدر/الترخيص. لم يظهر دليل قابل للمراجعة لـ23 ملفاً؛ لذلك الحكم `UNKNOWN` نهائي لهذه الموجة، وقابل للترقية فقط بوثيقة حقوق جديدة.
