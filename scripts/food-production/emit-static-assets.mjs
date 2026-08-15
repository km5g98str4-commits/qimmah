/**
 * [D-1/١] تسليم الأصول الساكنة — من مخرجات خطّ الإنتاج إلى `public/food/`.
 *
 * ما يُنسخ: الطقم الساخن (١٢٠ك مضغوطًا) وبيان مختصر للتشغيل. **الذيل الطويل لا
 * يُنسخ**: ٤١ شريحة / ٧٠ ميغابايت لا مكان لها في المستودع ولا في الحزمة —
 * تُولَّد حتميًا وتُرفع إلى الاستضافة الساكنة عند النشر.
 *
 * البصمات تُنقل كما هي من `build-manifest.json` ولا تُعاد حسابتها من الملف
 * المنسوخ: إعادة الحساب تجعل البصمة تصف النسخة لا المصدر، فتمرّ نسخةٌ تالفة
 * ببصمةٍ «صحيحة» تصفها هي نفسها.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = resolve(ROOT, 'public/food')

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'data/food-production/manifests/build-manifest.json'), 'utf8'))
const hotRaw = readFileSync(resolve(ROOT, 'data/food-production/accepted/hot/hot-set.json'))

mkdirSync(OUT, { recursive: true })

// ── الطقم الساخن ───────────────────────────────────────────────────────────
const actual = createHash('sha256').update(hotRaw).digest('hex')
if (manifest.hot_set.sha256 !== actual) {
  console.error(`✗ بصمة الطقم الساخن لا تطابق البيان.\n  البيان: ${manifest.hot_set.sha256}\n  الملف : ${actual}`)
  process.exit(1)
}
writeFileSync(resolve(OUT, 'hot-set.json'), hotRaw)

// ── بيان التشغيل ───────────────────────────────────────────────────────────
// مختصر عمدًا: وقت التشغيل يحتاج عدد الشرائح وبصماتها والترخيص، ولا يحتاج
// تقارير الجودة ولا إحصاءات البناء. أصغر ملفّ يُجلب أولًا ⇒ أسرع إقلاع.
const runtime = {
  schema_version: manifest.schema_version,
  normalization_version: manifest.normalization_version,
  licence: manifest.licence,
  routing: manifest.routing?.method ?? manifest.routing,
  shard_count: manifest.shard_totals.shard_count,
  hot_set: { count: manifest.hot_set.count, sha256: manifest.hot_set.sha256 },
  shards: manifest.shards.map((s) => ({ shard: s.shard, count: s.count, sha256: s.sha256, index_sha256: s.index_sha256 })),
}
writeFileSync(resolve(OUT, 'manifest.json'), `${JSON.stringify(runtime, null, 2)}\n`)

// ── ملاحظة بجوار الأصول: الشرائح ليست هنا، وهذا مقصود ────────────────────
writeFileSync(
  resolve(OUT, 'README.md'),
  [
    '# أصول الكتالوج الساكنة',
    '',
    '| الملف | ملتزم؟ | لماذا |',
    '|---|---|---|',
    '| `hot-set.json` | ✅ | الطقم الساخن — يعمل بلا شبكة، وميزانيته معلنة ومقيسة |',
    '| `manifest.json` | ✅ | بيان تشغيل مختصر: عدد الشرائح وبصماتها والترخيص |',
    '| `shards/` | ❌ | ٤١ شريحة / ~٧٠ ميغابايت — تُولَّد حتميًا وتُرفع للاستضافة الساكنة عند النشر |',
    '',
    'إعادة التوليد: `npm run food:build` ثم `npm run food:emit`.',
    '',
    'البيانات المشتقّة من Open Food Facts متاحة برخصة ODbL — والنسب ظاهر للمستخدم',
    'في واجهة البحث والمسح، لا في البيانات وحدها.',
    '',
  ].join('\n'),
)

console.log('✅ أصول الكتالوج الساكنة:')
console.log(`   public/food/hot-set.json   ${(hotRaw.length / 1024).toFixed(0)}ك · ${manifest.hot_set.count} سجلًا · بصمة مطابقة للبيان`)
console.log(`   public/food/manifest.json  ${runtime.shard_count} شريحة معلَنة ببصماتها`)
console.log('   الشرائح غير منسوخة عمدًا — تُرفع للاستضافة الساكنة عند النشر.')
