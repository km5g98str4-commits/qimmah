#!/usr/bin/env node
/**
 * ضامن أصول البحث عند البناء — [مهمة الطعام ٢٠k]
 *
 * ═══ الفجوة التي يسدّها ═══
 * `public/food/search/` **مولَّد ولا يُلتزم** (قرار موثَّق في .gitignore: حتمي
 * بالبايت وجذر مِركل في بيانه). لكن لا شيء كان يولّده في مسار البناء — فكل
 * نشرة تخرج بلا ذيل بحث طويل حتى لو كانت الشرائح حاضرة، ويتدهور التطبيق
 * «بأدب» إلى ٥٩٩ سجلًا بينما البيان يعلن ستّين ألفًا.
 *
 * فيُربط هذا في `build` قبل `vite build`: إن وُجدت شرائح في `public/food/shards`
 * وُلِّدت حزم البحث منها؛ وإن لم توجد أُعلن الغياب بصوت عالٍ ومُضي — الغياب
 * الكامل حالة صادقة يعرضها التطبيق كما هي (test:food-longtail يحرسها).
 *
 * ═══ ولماذا لا يعيد التوليد في كل بناء ═══
 * التوليد من ٦٠ ألف سجل يستغرق ثواني، و`npm run build` يعمل عشرات المرّات في
 * البراهين المحلّية وCI. فتُحسب بصمة مدخلات (sha256 لمحتوى كل شريحة +
 * ملفَي الإصدار الحاكمَين) وتُخزَّن مع المخرجات؛ تطابقت ⇒ تخطٍّ فوري.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SHARDS = resolve(ROOT, 'public/food/shards')
const OUT = resolve(ROOT, 'public/food/search')
const STAMP = resolve(OUT, '.inputs.json')

const idxFiles = existsSync(SHARDS)
  ? readdirSync(SHARDS).filter((f) => f.endsWith('.idx.json')).sort()
  : []

if (idxFiles.length === 0) {
  console.log('⏭️  food-search: لا شرائح في public/food/shards — الذيل الطويل غائب غيابًا كاملًا معلَنًا.')
  console.log('    (الحالة صادقة في الواجهة ويحرسها test:food-longtail — لا شيء يُولَّد.)')
  process.exit(0)
}

// بصمة المدخلات: محتوى الشرائح كلّها + الملفان الحاكمان لصيغة الحزم.
const h = createHash('sha256')
for (const f of idxFiles) {
  h.update(f)
  h.update(readFileSync(resolve(SHARDS, f)))
  const payload = f.replace('.idx.json', '.json')
  h.update(payload)
  h.update(readFileSync(resolve(SHARDS, payload)))
}
h.update(readFileSync(resolve(ROOT, 'src/lib/food/searchBuckets.ts')))
h.update(readFileSync(resolve(ROOT, 'src/lib/text/foodNormalize.ts')))
const fingerprint = h.digest('hex')

let prior = null
try { prior = JSON.parse(readFileSync(STAMP, 'utf8')) } catch { /* لا ختم سابق */ }
if (prior?.fingerprint === fingerprint && existsSync(resolve(OUT, 'manifest.json'))) {
  console.log(`✓ food-search: حديثة (بصمة المدخلات مطابقة ${fingerprint.slice(0, 12)}…) — تخطٍّ.`)
  process.exit(0)
}

console.log(`⚙️  food-search: توليد حزم البحث من ${idxFiles.length} شريحة…`)
execFileSync(process.execPath, [resolve(ROOT, 'scripts/food-production/emit-search-buckets.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
})
mkdirSync(OUT, { recursive: true })
writeFileSync(STAMP, JSON.stringify({ fingerprint, generated_at_epoch: 'SOURCE_DATE_EPOCH-free: stamp only' }))
console.log('✓ food-search: وُلِّدت وخُتمت.')
