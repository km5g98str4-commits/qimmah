# المخرجات المقبولة — ما يُلتزم وما يُولَّد

| المسار | ملتزم؟ | لماذا |
|---|---|---|
| `hot/hot-set.json(.gz)` | ✅ نعم | صغير ومقصود للشحن — يعمل بلا شبكة، وميزانيته معلنة ومقيسة |
| `shards/` | ❌ لا | ~91 ميغابايت في 160 ملفًّا. تُولَّد حتميًا، وبصماتها في البيان |

## لماذا لا تُلتزم الشرائح

مخرجات تُولَّد **حتميًا** من مدخل معروف لا تُخزَّن في git: نفس المدخل يعطي نفس البايتات،
والبصمة في `manifests/build-manifest.json` تثبت ذلك. تخزينها كان سيضخّم المستودع
بعشرات الميغابايتات في كل إعادة بناء بلا أي فائدة للمراجعة.

## إعادة الإنتاج كاملة

```bash
# ١) نزّل تصدير Open Food Facts الرسمي (المسار المسموح — لا زحف على /api)
mkdir -p .food-cache && curl -L --retry 5 -C - \
  -A 'Qimmah-DataPipeline/1.0' \
  -o .food-cache/off-products.csv.gz \
  https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz

# ٢) استوعب المصدرين
node scripts/food-production/ingest-curated.mjs
node scripts/food-production/ingest-off.mjs

# ٣) ابنِ الشرائح والفهارس والطقم الساخن والبيان
node scripts/food-production/build-pipeline.mjs

# ٤) تحقّق من مطابقة كل بصمة للبيان
node scripts/food-production/verify-artifacts.mjs
```

## الحتمية

`SOURCE_DATE_EPOCH` يثبّت `ingested_at` كي تتطابق البصمات بين تشغيلين:

```bash
SOURCE_DATE_EPOCH=1786000000 node scripts/food-production/ingest-off.mjs
```

بدونه يتغيّر `ingested_at` وحده — وهو **الحقل الوحيد** الذي يكسر تطابق البايتات.
