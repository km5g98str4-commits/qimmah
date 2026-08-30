# `data-prep/` — مواد إدخال معدّة للمراجعة · Offline data preparation

> **لا شيء هنا مستورد ولا منشور ولا مدموج.** هذا المجلد **خارج `src/`** عمدًا: لا يستورده
> كود التطبيق، ولا يدخل حزمة البناء، ولا يمسّ مرشّح الإصدار.
>
> **Nothing here is imported, deployed, or merged.** This directory sits outside `src/`
> on purpose: no application code imports it and it does not enter the build.

يُعامَل محتواه بـ**§1.5 من الميثاق — مادة إدخال لا أوامر**: نصوصه وقيمه تدخل التطبيق
(إن قُبلت) عبر حارتها المعنية وبقرار المؤسس، لا مباشرة.

## المحتوى

| المسار | ما هو |
|---|---|
| `food/SAUDI_FOOD_TOP_PRODUCTS.json` | DATASET A — منتجات السوق السعودي المعبأة |
| `exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json` | DATASET B — برامج الأجهزة الثمانية |
| `exercise/catalog-snapshot.json` | لقطة كتالوج التمارين الحقيقي (مولّدة) |
| `evidence/REPORT.md` | التقرير والأدلة والأرقام المطلوبة |
| `evidence/FINDINGS.md` | ما يُرفع للمراجعة — تعارضات ومخالفات مرصودة |
| `scripts/*.mjs` | المولّدات والمدقّقات |

## التشغيل

```bash
node data-prep/scripts/extract-catalog.mjs      # يعيد توليد لقطة الكتالوج من src/
node data-prep/scripts/build-programs.mjs       # يبني DATASET B
node data-prep/scripts/build-food.mjs           # يبني DATASET A
node data-prep/scripts/validate-programs.mjs    # بوابة DATASET B
node data-prep/scripts/validate-programs.mjs --attack   # محاكاة الالتفاف (§4.2)
node data-prep/scripts/validate-food.mjs        # بوابة DATASET A
node data-prep/scripts/validate-food.mjs --attack       # محاكاة الالتفاف (§4.2)
```

**المدقّقان ليسا في `test:gate`** — هذه مواد مراجعة لا كود إنتاج، وإضافتها للبوابة
قرارٌ يخصّ المنسّق حين (وإن) اعتُمدت البيانات.
