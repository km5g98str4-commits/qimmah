# المعوّقات الخارجية — ما لا يُغلق من داخل هذه الجلسة

> كلٌّ منها **مالكه إنسان**، ولا يُغلق بكود. وكلٌّ مذكور بأمره الحرفي حتى يُنفَّذ بلا اجتهاد.

## ١. نشر معاينة المؤسس — محجوب بسببين مستقلّين

**السبب الأول — الصلاحية.** الميثاق (§1 · §1.1) يحصر **أي نشر** بالمؤسس، ويشترط
تفويضًا مسمّىً في كل مرّة. ولم يصل تفويض بالنشر في هذه المهمّة.

**السبب الثاني — الاعتماد.** لا `CLOUDFLARE_API_TOKEN` ولا `CF_API_TOKEN` في بيئة
هذه الحاوية (`env | grep -ci 'CLOUDFLARE\|CF_API'` ⇒ ٠). فحتى لو أُذن، لا يستطيع
`wrangler` المصادقة من هنا.

**الأمر المعتمد** — كما هو موثّق في `docs/execution/qimmah-founder-qa/PREVIEW-SAFETY.md:219`:

```bash
npm run build:founder-preview && \
  npx wrangler pages deploy dist --project-name qimmah --branch founder-qa-preview
```

⚠️ **`--branch founder-qa-preview` ليس زينة.** حذفه ينشر على فرع الإنتاج.
⚠️ **و`build:founder-preview` ليس `build`.** الأول يضبط `VITE_APP_ENV=founder_preview`؛
واستبداله بـ`npm run build` عاديًا يشحن اعتمادات الإنتاج في الأرتيفكت — وهو مسجَّل
خطرًا **حرجًا** في `docs/execution/qimmah-sovereign-closure/recon/R7-commerce.md:698`.

**BLOCKER — المؤسس — نفّذ الأمر أعلاه بحرفه، ثم سلّم الرابط الناتج ليُفحص.**

## ٢. WebKit — غير مثبَّت في هذه الحاوية

`/opt/pw-browsers/` يحمل `chromium` و`chromium-1194` و`chromium_headless_shell-1194`
و`ffmpeg-1011` — **ولا webkit**. وبيئة التنفيذ تمنع صراحةً `playwright install`.

فالحكم `VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE` — **هبوط مُعلَن باسمه**، لا تخطٍّ
صامت. والفجوة حقيقية لا شكلية: الجمهور المستهدَف على iOS حيث Safari هو السائد،
وعطل BUG-024 نفسه كان على شكل Safari (تخزين محجوب).

**BLOCKER — المؤسس أو مشغّل البيئة — شغّل الرحلات على حاوية تحمل WebKit عبر
`E2E_ENGINE=webkit`، أو على جهاز iOS فعلي.**

## ٣. تطبيق الهجرات على قاعدة حيّة

خمس عشرة هجرة مكتوبة ولم تُطبَّق على أي قاعدة قط. التطبيق فعل مؤسس بتفويض مسمّى.
الترتيب والأوامر والمتحقّقات كلها في `MIGRATIONS-APPLY-PENDING.md`.

**BLOCKER — المؤسس — طبّق الخمس عشرة بالترتيب الموثّق، بتفويض مسمّى.**

## ٤. التزامن الحقيقي على الاسترداد

`test:attack-commerce` يثبت عقد الاسترداد على Postgres حقيقي، لكن PGlite **جلسة
واحدة** فلا تزامن فعلي. الضمان يقوم على ثلاث طبقات (قفل نصّي مُثبَت · تسلسل ·
قيد بنيوي) — والتزامن الحقيقي يحتاج staging.

**BLOCKER — المؤسس — وفّر قاعدة staging لاختبار الاسترداد المتزامن قبل بيع حقيقي.**
