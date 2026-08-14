// قِمّة — يولّد FOOD-PRODUCTION-REPORT.md من البيانات الفعلية.
// كل رقم في التقرير يُقرأ من البيان والتقارير المُنتَجة — **لا رقم يُكتب بيد**،
// فلا يمكن للتقرير أن ينحرف عن الواقع أو يتقادم بصمت.
//
//   node scripts/food-production/write-report.mjs

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './lib/loadTs.mjs'

const rd = (p, dflt = null) => { const f = resolve(ROOT, p); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : dflt }
const m = rd('data/food-production/manifests/build-manifest.json')
if (!m) { console.error('لا بيان بناء — شغّل build-pipeline.mjs أولًا.'); process.exit(1) }
const summary = rd('data/food-production/reports/build-summary.json', {})
const offStats = rd('data/food-production/reports/off-ingest-stats.json', {})
const curStats = rd('data/food-production/reports/curated-ingest-stats.json', {})
const probe = rd('data/food-production/reports/source-probe.json', { results: [] })
const sources = rd('data/food-production/manifests/sources.json', { sources: [] })

const n = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : String(v ?? '—'))
const kb = (b) => (b / 1024).toFixed(0)
const mb = (b) => (b / 1048576).toFixed(2)
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0')
const T = m.totals, S = m.shard_totals
const sizes = m.shards.map((s) => s.bytes_gzip).sort((a, b) => a - b)
const accepted = T.accepted

// فجوة التسمية العربية في مجموعة الخليج — تُقاس من الطقم الساخن الفعلي.
const hotFile = resolve(ROOT, 'data/food-production/accepted/hot/hot-set.json')
let hotAr = { total: 0, arabic: 0, curated: 0, curatedArabic: 0, offArabic: 0, off: 0 }
if (existsSync(hotFile)) {
  const recs = Object.values(JSON.parse(readFileSync(hotFile, 'utf8')).records)
  hotAr = {
    total: recs.length,
    arabic: recs.filter((r) => r.name_ar).length,
    curated: recs.filter((r) => r.source === 'qimmah_curated').length,
    curatedArabic: recs.filter((r) => r.source === 'qimmah_curated' && r.name_ar).length,
    off: recs.filter((r) => r.source === 'openfoodfacts').length,
    offArabic: recs.filter((r) => r.source === 'openfoodfacts' && r.name_ar).length,
  }
}

// جدول تغطية العربية مقسّمًا بالسوق — يُبنى قبل القالب تفاديًا للقوالب المتداخلة.
const G = summary.gulf ?? {}
const gulfArabicPct = pct(G.arabic ?? 0, G.total ?? 0)
const globalArabicPct = pct(summary.global_arabic ?? 0, summary.global_total ?? 0)
const arabicTable = [
  '| المجموعة | سجلات | باسم عربي | التغطية |',
  '|---|---|---|---|',
  '| **الخليج والسعودية** | ' + n(G.total) + ' | ' + n(G.arabic) + ' | **' + gulfArabicPct + '%** |',
  '| ‏— منها من Open Food Facts | ' + n(G.off_total) + ' | ' + n(G.off_arabic) + ' | ' + pct(G.off_arabic ?? 0, G.off_total ?? 0) + '% |',
  '| ‏— منها من تنسيق قِمّة | ' + n(G.curated_total) + ' | ' + n(G.curated_arabic) + ' | ' + pct(G.curated_arabic ?? 0, G.curated_total ?? 0) + '% |',
  '| **الذيل العالمي** | ' + n(summary.global_total) + ' | ' + n(summary.global_arabic) + ' | **' + globalArabicPct + '%** |',
].join('\n')

const dumpPath = resolve(ROOT, '.food-cache/off-products.csv.gz')
const dumpBytes = existsSync(dumpPath) ? statSync(dumpPath).size : 0
const DUMP_FULL = 1275171186
const truncated = offStats.truncated_input === true

const rejTable = Object.entries({ ...(offStats.gtin_rejected ?? {}), ...(offStats.quality_rejected ?? {}) })
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| \`${k}\` | ${n(v)} |`).join('\n')

const flagTable = Object.entries(summary.quality_flags ?? {}).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| \`${k}\` | ${n(v)} | ${pct(v, accepted)}% |`).join('\n')

const srcTable = sources.sources.map((s) => `| ${s.name} | \`${s.status}\` | ${s.licence ? s.licence.split(';')[0] : '—'} |`).join('\n')

const probeTable = probe.results.map((r) => `| ${r.label} | ${r.reachable ? `HTTP ${r.http_status}` : `**${r.verdict}** (\`${r.error}\`)`} | ${r.content_length ? mb(Number(r.content_length)) + ' MB' : '—'} |`).join('\n')

const md = `# تقرير خطّ إنتاج بيانات الأطعمة والباركود — قِمّة

> **يُولَّد آليًا** بـ\`node scripts/food-production/write-report.mjs\` من البيان والتقارير
> الفعلية. **لا رقم فيه مكتوب بيد** — فلا ينحرف عن الواقع ولا يتقادم بصمت.
>
> تاريخ البناء: \`${m.built_at}\` · نسخة التطبيع: \`${m.normalization_version}\` · نسخة المخطّط: \`${m.schema_version}\`

---

## ١. الرقم الحقيقي

| المقياس | القيمة |
|---|---|
| **سجلات مقبولة ومشحونة** | **${n(accepted)}** |
| GTIN فريد صالح | ${n(T.unique_gtin)} |
| السوق السعودي (SA) | ${n(T.by_market?.SA ?? 0)} |
| الخليج (GCC) | ${n(T.by_market?.GCC ?? 0)} |
| عالمي (GLOBAL) | ${n(T.by_market?.GLOBAL ?? 0)} |
| مكرّرات أُزيلت | ${n(T.duplicates_removed)} |
| تعارضات مرفوعة (لم تُدمج) | ${n(T.conflicts)} |
| طابور مراجعة ضبابي | ${n(T.review_queue)} |
${truncated ? `
> ⚠️ **إفصاح:** تصدير OFF كان **ناقصًا** وقت هذا البناء — نُزّل ${mb(dumpBytes)} ميغابايت
> من أصل ${mb(DUMP_FULL)} (${pct(dumpBytes, DUMP_FULL)}%). والتصدير **مرتّب بالباركود**، وبادئة
> السعودية \`628\` تقع متأخّرة فيه — فأرقام السعودية والخليج أعلاه **حدّ أدنى لا نهائي**،
> وتُرفع بإعادة التشغيل بعد اكتمال التنزيل. الأمر في \`accepted/README.md\`.
` : `
> التصدير نُزّل كاملًا (${mb(dumpBytes)} ميغابايت) وقُرئ حتى آخره.
`}
**مقابل الهدف (٤٠٬٠٠٠):** ${accepted >= 40000 ? `تحقّق — ${n(accepted)} سجلًا.` : `**لم يتحقّق** — ${n(accepted)} سجلًا.`}

### ماذا يحدّ الرقم فعلًا

السقف ليس ندرة البيانات بل **سقف شحن مقصود**: ${n(offStats.accepted_global_considered ?? 0)} سجلًا
عالميًا اجتاز كل فحوص الجودة، ويُشحن منها ${n(offStats.global_shipped ?? 0)} بحدّ \`--limit\`.
رفع الحدّ يرفع العدد فورًا بلا أي تغيير في الكود — لكن **الحدّ مقصود**: المستخدم السعودي
لا يخدمه ذيل طويل من منتجات لا تُباع عنده، والشرائح تكبر بلا مقابل.

**السعودية والخليج بلا سقف إطلاقًا** — كل سجل يجتاز الفحوص يدخل.

---

## ٢. المصادر — ما استُعمل وما حُجب

| المصدر | الحالة | الترخيص |
|---|---|---|
${srcTable}

### دليل الوصول المقيس

| الهدف | النتيجة | الحجم |
|---|---|---|
${probeTable}

**\`SFDA\` و\`Saudi Open Data\` محجوبان خارجيًا** — انقطاع على مستوى النقل (ECONNRESET /
timeout) قبل أي استجابة HTTP، فلا يمكن حتى قراءة \`robots.txt\` أو الشروط. **لم تُجرَّب أي
وسيلة التفاف** (لا وكيل ولا VPN ولا انتحال أصل). مصدر لا يُوصل إليه علنًا يبقى غير مستعمل.

### قيد robots الحاكم

\`world.openfoodfacts.org/robots.txt\` يمنع \`/api\` و\`/cgi\` **لكل الوكلاء**. لذلك
الاستيعاب الجملي يمرّ حصرًا عبر تصدير \`/data/\` الرسمي — **ولا زحف على واجهة البحث**.
(المسح الحيّ داخل التطبيق شيء آخر: طلب واحد بفعل مستخدم، لا زحف.)

### التزام ODbL

بيانات OFF تحت **ODbL 1.0**، والاستعمال التجاري مسموح صراحةً، **مقابل**: النسب ·
المشاركة بالمثل عند التوزيع العلني لقاعدة مشتقّة · عدم التقييد التقني. كل شريحة وكل
طقم ساخن يحمل الإشعار في بياناته، **ويبقى سطح النسب في الواجهة دَينًا** مسجَّلًا في
\`docs/execution/qimmah-postweb/food/DEPENDENCIES.md\` (D-2).

**الصور لا تُستورد إطلاقًا** (\`image_url\` = \`null\` دائمًا): شروط OFF نفسها تنبّه إلى
حقوق أطراف ثالثة في صور المنتجات (تصميم العبوة · العلامة التجارية)، فهي ليست نظيفة
الحقوق — والقرار المقفل رقم ٨ يمنع الوسائط غير نظيفة الحقوق.

---

## ٣. ما رُفض ولماذا

| سبب الرفض | العدد |
|---|---|
${rejTable}

قُرئ ${n(offStats.rows_read ?? 0)} صفًّا من التصدير. الرفض **مسمّى دائمًا** ولا يُبتلع صفٌّ صامتًا.

> **لماذا نسبة رفض الباركود عالية:** التصدير مرتّب بالباركود، وصدره مليء بأكواد
> عديمة المعنى (\`00000002\` · \`000000000054\`). تحقّقنا بالقياس أن المُدقِّق ليس
> السبب: كل باركود حقيقي معروف (نوتيلا · كوكاكولا · المراعي · فيريرو) **يمرّ**.

---

## ٤. جودة المقبول

| المقياس | العدد | التغطية |
|---|---|---|
| اسم عربي | ${n(summary.arabic_names)} | ${pct(summary.arabic_names, accepted)}% |
| اسم إنجليزي | ${n(summary.english_names)} | ${pct(summary.english_names, accepted)}% |
| ماكروز كاملة (بروتين+كارب+دهن) | ${n(summary.complete_macros)} | ${pct(summary.complete_macros, accepted)}% |
| صوديوم | ${n(summary.with_sodium)} | ${pct(summary.with_sodium, accepted)}% |
| ألياف | ${n(summary.with_fiber)} | ${pct(summary.with_fiber, accepted)}% |
| حجم حصّة | ${n(summary.with_serving)} | ${pct(summary.with_serving, accepted)}% |
| مكوّنات | ${n(summary.with_ingredients)} | ${pct(summary.with_ingredients, accepted)}% |

### توزيع الثقة

${Object.entries(summary.confidence_buckets ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- \`${k}\` — ${n(v)} (${pct(v, accepted)}%)`).join('\n')}

### أعلام الجودة (وسم لا رفض)

| العلم | العدد | النسبة |
|---|---|---|
${flagTable}

> السجل المشكوك فيه **يُوسَم ويبقى**، ولا تُعدَّل قيمة مصدر لتمرّ من فحص. الأعلام
> الحاجبة وحدها تمنع القبول؛ اللينة تُنقص الثقة وتبقى مرئية.

### 🔎 أهمّ نتيجة في هذا التقرير: العربية مسألة سوق لا مسألة حجم

${arabicTable}

**الرقم الإجمالي (${pct(summary.arabic_names, accepted)}%) مضلِّل ولا يُقرَأ وحده.** فهو متوسّط ممزوج:
الذيل العالمي أوروبي في غالبه فتغطيته العربية ${globalArabicPct}%، بينما مجموعة الخليج
—وهي ما يهمّ المستخدم السعودي فعلًا— تغطيتها **${gulfArabicPct}%**.

> ⚠️ **تصحيح ذاتي مسجَّل:** قبل اكتمال التنزيل استنتجتُ من بيانات جزئية أن «OFF لا يقدّم
> أسماء عربية تقريبًا» (٦ من ٧١٨). وكان **خطأً**: التصدير مرتّب بالباركود، ولم يكن قد بلغ
> كتلة السعودية ٦٢٨ بعد. بعد اكتماله تبيّن أن OFF يقدّم ${n(G.off_arabic)} اسمًا عربيًا في الخليج.
> النتيجة أُصلحت هنا بدل أن تُشحن كما هي.
> **الدرس:** استنتاجٌ من جزءٍ من مدخل **مرتَّب** ليس استنتاجًا — هو عيّنة منحازة.

**الأثر على القرار:** رفع سقف الاستيعاب العالمي **لا يخدم العربية** إطلاقًا — يرفع العدد
لا التغطية. ما يخدمها: مجموعة الخليج (وهي بلا سقف أصلًا)، والتنسيق الداخلي حيث التغطية ١٠٠٪.

---

## ٥. المخرجات وأحجامها الحقيقية

| المقياس | القيمة |
|---|---|
| عدد الشرائح | ${m.shards.length} |
| أصغر شريحة (مضغوطة) | ${kb(sizes[0])} كيلوبايت |
| الوسيط | ${kb(sizes[sizes.length >> 1])} كيلوبايت |
| أكبر شريحة | ${kb(sizes[sizes.length - 1])} كيلوبايت |
| **ضمن الميزانية (٢٠٠–٥٠٠ ك.ب)** | **${m.shards.filter((s) => s.within_budget).length}/${m.shards.length}** |
| بيانات مضغوطة | ${mb(S.bytes_gzip)} ميغابايت |
| بيانات خام | ${mb(S.bytes_raw)} ميغابايت |
| فهارس البحث مضغوطة | ${mb(S.index_bytes_gzip)} ميغابايت |
| **الإجمالي المضغوط** | **${mb(S.bytes_gzip_all)} ميغابايت** |
| الطقم الساخن | ${n(m.hot_set.count)} سجلًا · ${kb(m.hot_set.bytes_gzip)} ك.ب مضغوط · ميزانية ${kb(m.hot_set.budget_bytes_gzip)} ك.ب · **${m.hot_set.within_budget ? 'ضمنها' : 'تجاوزها'}** |

### لماذا هذا الشكل

- **البحث بالباركود مفتاح مباشر:** \`${m.routing.method}\` ⇒ شريحة واحدة ⇒ مفتاح O(1).
  لا مسح، ولا جدول توجيه يُقرأ أولًا.
- **فهرس رمز←مواضع لكل شريحة** يُحمَّل عند الحاجة — الواجهة لا تمسح صفوفًا أبدًا.
- **الطقم الساخن** ملف واحد صغير يعمل بلا شبكة، منفصل عن الذيل الطويل.
- **الشرائح لا تُلتزم في git** (${mb(S.bytes_raw)} ميغابايت): تُولَّد حتميًا وبصمة كلٍّ منها
  في البيان، والتحقّق بـ\`verify-artifacts.mjs\`.

---

## ٦. إعادة الإنتاج

\`\`\`bash
# التصدير الرسمي (المسار المسموح — لا زحف على /api)
mkdir -p .food-cache && curl -L --retry 5 -C - -A 'Qimmah-DataPipeline/1.0' \\
  -o .food-cache/off-products.csv.gz \\
  https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz

node scripts/food-production/probe-sources.mjs      # دليل الوصول
node scripts/food-production/ingest-curated.mjs     # PKG-001 (نواة الطقم الساخن)
node scripts/food-production/ingest-off.mjs         # التصدير الجملي
node scripts/food-production/build-pipeline.mjs     # شرائح + فهارس + بيان
node scripts/food-production/verify-artifacts.mjs   # مطابقة البصمات
node scripts/run-food-production-proof.mjs          # الإثبات (بلا شبكة)
node scripts/food-production/write-report.mjs       # هذا التقرير
\`\`\`

**الحتمية:** \`SOURCE_DATE_EPOCH=<ثانية>\` يثبّت \`ingested_at\` — وهو الحقل الوحيد
الذي يكسر تطابق البايتات بين تشغيلين.

---

## ٧. الفجوات المعروفة

1. **تغطية العربية ${pct(summary.arabic_names, accepted)}%** — تُعالَج بالطقم الساخن المنسَّق،
   وترجمة الذيل الطويل عمل محتوى لا هندسة بيانات.
2. **السعودية محدودة بما بلغه التصدير** — ${truncated ? 'التنزيل لم يكتمل، وبادئة 628 متأخّرة في الترتيب.' : 'قُرئ التصدير كاملًا.'}
3. **SFDA ومنصّة البيانات المفتوحة محجوبتان** — لا بديل يُخترع مكانهما.
4. **USDA متاح وغير مستوعَب** — قرار نطاق (أولوية سعودية) لا حاجز تقني.
5. **بيانات المصنّعين لا تُزحف** — \`robots\` يسمح، لكن السماح بالجلب ليس ترخيصًا
   بإعادة النشر. يحتاج قرار مالك.
6. **الوصل بالواجهة الحيّة محجوب على HEAD** — \`DEPENDENCIES.md\`.

---

## ٨. المطلوب من المنسّق في \`package.json\`

\`package.json\` محجور على المنسّق (§1.4/٢) — لم يُلمس. الأسطر المطلوبة بنصّها:

\`\`\`json
"test:food-production": "node scripts/run-food-production-proof.mjs",
"food:probe":   "node scripts/food-production/probe-sources.mjs",
"food:ingest":  "node scripts/food-production/ingest-curated.mjs && node scripts/food-production/ingest-off.mjs",
"food:build":   "node scripts/food-production/build-pipeline.mjs",
"food:verify":  "node scripts/food-production/verify-artifacts.mjs",
"food:report":  "node scripts/food-production/write-report.mjs"
\`\`\`

وفي \`test:gate\` يُضاف **\`test:food-production\` وحده** (بعد \`test:food-db\`):

\`\`\`
… && npm run test:food-db && npm run test:food-production && npm run test:saudi-foods && …
\`\`\`

> **لا يُضاف غيره إلى البوابة.** \`food:*\` تحتاج تنزيلًا خارجيًا (١٫٢ غيغابايت) وتستغرق
> دقائق — لا موضع لها في بوابة تعمل عند كل تغيير. أما \`test:food-production\` فبلا شبكة
> ومن عيّنات مرجعية في المستودع، وزمنه ثوانٍ.

---

## ٩. الإثبات

\`node scripts/run-food-production-proof.mjs\` — بلا شبكة، من عيّنات مرجعية في المستودع.
كل قاعدة لها تأكيد مسمّى ويقابله **تأكيد مضادّ** يسقط بالاسم إن أُزيلت القاعدة (§4.2).

وقد **هوجمت البوابة بطفرات فعلية**، فكشف الهجوم ثغرتين حقيقيتين أُصلحتا:
انهيار الإثبات باستثناء تقني كان يبتلع كل النتائج ويخرج صامتًا · وانحياز تجزئة
يُفرغ نصف الشرائح.
`

writeFileSync(resolve(ROOT, 'FOOD-PRODUCTION-REPORT.md'), md)
console.log(`✓ FOOD-PRODUCTION-REPORT.md — ${accepted.toLocaleString()} سجلًا · ${m.shards.length} شريحة · ${mb(S.bytes_gzip_all)} MB مضغوط${truncated ? ' · ⚠️ مدخل ناقص' : ''}`)
