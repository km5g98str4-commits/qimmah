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
