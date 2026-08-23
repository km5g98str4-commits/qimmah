# بوّابة الإصدار — الحقيقة الواحدة

> **بوّابة واحدة لا عدّة بوّابات.** ما ليس هنا ليس مقيسًا.
> الرأس المقيس: `4f68486e51f7ee3e9c6cb9c738c1fd27526d8395`

## الطبقة ١ — البوّابة المحلّية (١٦٢ خطوة + ٣ سابقاتها)

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm run test:gate
```

| الخطوة | النتيجة |
|---|---|
| `typecheck` | ✅ |
| `lint` | ✅ (`--max-warnings 0`) |
| `build` | ✅ |
| `test:gate` | ✅ **١٦٢/١٦٢** |

**ثلاث خطوات دخلت البوّابة عند الالتقاء:** `test:chaos` · `test:journey-selectors`
· `test:sensitive-consent`. وثمانٍ كانت خارجها قبله: `today-a11y` · `today-bidi` ·
`today-steps` · `install-invite` · `journey-noise` · `admin-codes` ·
`migration-order` · `admin-chunk`.

## الطبقة ٢ — الرحلات الثلاث (خارج `test:gate` عمدًا: كلفة متصفّح)

```bash
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  node scripts/e2e/journeys/{newcomer,minor,advanced}.mjs
```

| الرحلة | فحوص | لقطات | بلاغات |
|---|---|---|---|
| ط-١ المولود الجديد | ٣٦ | ١٨ | ٠ |
| ط-٢ القاصر | ٢٦ | ١٠ | ٠ |
| ط-٣ المتقدّم | ٩ | ١٨ | ٠ |

**ومحروسة بحارسها:** `test:journey-selectors` يفرض «ما يُضغَط يُحدَّد ببنية، وما
يُقرأ يُقارَن بنصّ»، ويؤكّد أن كل معرّف تستعمله الرحلات **موجود في مكوّن حيّ**
(١٨ معرّفًا) — فلا فحص على معرّف يتيم يصدق أبدًا.

## الطبقة ٣ — التقاء الإصدار (١٠ عروض × لغتين)

```bash
npm run test:release:convergence
```

ثمانية أنماط مستخدمين + طقمان ساكنان، ومصفوفة `p8` تغطّي **عشرة عروض مفروضة
بالعربية والإنجليزية** — والعروض الثلاثة المطلوبة (٣٢٠ · ٣٩٠ · ٤٣٠) داخلها.

## المحرّكات — وهبوط تحقّق مُعلَن

| المحرّك | متاح | الدليل |
|---|---|---|
| Chromium | ✅ | `141.0.7390.37` |
| WebKit | ❌ | `Executable doesn't exist at /opt/pw-browsers/webkit-2311/pw_run.sh` |
| Firefox | ❌ | `Executable doesn't exist at /opt/pw-browsers/firefox-1532/firefox/firefox` |

`VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE` — **هبوط باسمه لا تخطٍّ صامت**.
والفجوة حقيقية: الجمهور على iOS حيث Safari سائد، وBUG-024 نفسه كان على شكل Safari.
التفصيل في [`EXTERNAL-BLOCKERS.md`](./EXTERNAL-BLOCKERS.md) §٢.

## ما ليس مقيسًا هنا — وقيل صراحةً

- **الإنتاج.** لا نشر ولا ترقية `main` — كلاهما فعل مؤسس.
- **قاعدة حيّة.** لا هجرة طُبِّقت. `test:migration-order` يقيس على PGlite لا على الإنتاج.
- **التزامن الحقيقي** على الاسترداد — PGlite جلسة واحدة.
- **جهاز iOS فعلي** — وعطل إقلاع `ERR_UNKNOWN` دَين مفتوح خارج نطاق هذه المهمّة.

---

## نتيجة التقاء الإصدار — قيست فعلًا

```
✅ static-bundle-safety              pass  26 · fail 0 · blocked 0
✅ static-regression-ledger          pass  45 · fail 0 · blocked 3
✅ p1-preview-user (chromium)        pass  67 · fail 0 · blocked 1
✅ p2-premium-test-state             pass  25 · fail 0 · blocked 0
✅ p3-returning-guest                pass  15 · fail 0 · blocked 0
✅ p4-interrupted-onboarding         pass  16 · fail 0 · blocked 0
✅ p5-dirty-state                    pass  52 · fail 0 · blocked 0
✅ p6-auth                           pass  50 · fail 0 · blocked 1
✅ p7-failure-conditions             pass  27 · fail 0 · blocked 0
✅ p8-responsive-matrix              pass 140 · fail 0 · blocked 0
────────────────────────────────────────────────────────────────
TOTAL  pass 463 · fail 0 · externally-blocked 5
```

الخمسة المحجوبة خارجيًا محجوبة **بغياب خادم وقاعدة**، لا بعطل — وهو الحجب المُعلَن
نفسه في [`EXTERNAL-BLOCKERS.md`](./EXTERNAL-BLOCKERS.md).

## أرتيفكت المعاينة — فُحص بيدي لا بتقرير حارسه

`npm run build:founder-preview` ثمّ تمشيط `dist/` مباشرةً:

| الشرط | المقيس |
|---|---|
| `qimmah-env = founder_preview` | ✅ `<meta name="qimmah-env" content="founder_preview">` |
| عنوان مشروع Supabase الإنتاجي | ✅ **٠ ملفّ** |
| مفتاح anon الإنتاجي | ✅ **٠ ملفّ** |
| `service_role` | ✅ **٠ ملفّ** |
| وسم تقليد الاستحقاق | ✅ **٠ ملفّ** |
| `BUILD_LABEL` = هاش الرأس | ✅ `e8e8ff83` = `HEAD` |

**ومطابقتان بقيتا — وكلتاهما نمط بدل لا مشروع:** `dist/_headers` يحمل
`connect-src … https://*.supabase.co` (قيد CSP لا اعتماد)، و`index-*.js` يحمل
`e.push("*.supabase.co","*.supabase.in")` (قائمة مضيفين). لا مرجع مشروع في أيّهما.

> والفرق حاكم: الاعتمادات **غير موجودة في الأرتيفكت**، لا «موجودة ولا تُستعمل».
> `import.meta.env.VITE_APP_ENV` يُقرأ حرفيًا وقت البناء فيطوي المُصغِّر الشرط
> ويهزّ `DEFAULT_SUPABASE_*` خارج الحزمة بالكامل.

**فالأرتيفكت جاهز للنشر — والنشر وحده هو المحجوب**، لا سلامته.
