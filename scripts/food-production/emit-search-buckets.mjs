/**
 * مُصدِر حزم البحث — [SOVEREIGN-FOOD-002].
 *
 * ═══ لماذا تقسيم ثانٍ ═══
 * `public/food/shards/` مقسّمة بـ`assignShard(gtin)`، أي **بالباركود**. ذلك صحيح
 * لمسح الباركود ولا يُمَسّ. لكنه لا يخدم البحث النصّي: من يكتب اسمًا لا يعرف
 * الـGTIN فلا يعرف الشريحة. فيُشتقّ من نفس السجلات تقسيمٌ ثانٍ مفتاحه **الكلمة**.
 *
 * ═══ حتمية البايتات ═══
 * كل ترتيب هنا معلَن: الحزم بمفاتيحها مرتّبة، والسجلات داخل الحزمة بمفتاح فرز
 * ثلاثي (سوق ← طول الاسم ← GTIN)، والـJSON بمفاتيح مرتّبة. فإعادة التصدير على
 * نفس المدخل تعطي **نفس البايتات** — يثبتها `--verify` بجذر مِركل واحد.
 *
 * ═══ ترتيب السجلات داخل الحزمة ليس تزيينًا ═══
 * الحزمة العامّة («cho» ⇒ ٦٬٠٥٨) تُصفَّح، والاستعلام يجلب أوّل صفحاتها ضمن
 * ميزانيته. فما يقع في الصفحة الأولى هو ما يراه المستخدم: **السعودي أولًا، ثم
 * الاسم الأقصر** — والأقصر أقرب إلى المطابقة التامّة أو البادئة (`classifyMatch`)،
 * فالترتيب يوافق سلّم الرتب بدل أن يعانده.
 *
 * التشغيل:
 *   node scripts/food-production/emit-search-buckets.mjs            # يكتب
 *   node scripts/food-production/emit-search-buckets.mjs --verify   # يقارن بلا كتابة
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './lib/loadTs.mjs'
import { stableStringify } from './lib/shard.mjs'

const buckets = await loadTsModule('src/lib/food/searchBuckets.ts')
const {
  SEARCH_CORPUS_VERSION, BUCKET_KEY_LENGTH, BUCKET_PAGE_SIZE, CARD_FIELDS,
  bucketKeysForText, bucketPagePath, pageCount,
} = buckets
const { NORMALIZATION_VERSION } = await loadTsModule('src/lib/text/foodNormalize.ts')

const VERIFY = process.argv.includes('--verify')
const FOOD = resolve(ROOT, 'public/food')
const SHARDS = resolve(FOOD, 'shards')
const OUT = resolve(FOOD, 'search')
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// ── ١) قراءة الشرائح: صفوف نحيفة + نصّ الفهرسة نفسه الذي يستعمله خطّ الإنتاج ──
const idxFiles = readdirSync(SHARDS).filter((f) => f.endsWith('.idx.json')).sort()
if (idxFiles.length === 0) {
  console.error('✗ لا شرائح في public/food/shards — لا شيء يُصدَّر.')
  process.exit(1)
}

const rows = []
const keysOf = []
for (const file of idxFiles) {
  const idx = JSON.parse(readFileSync(resolve(SHARDS, file), 'utf8'))
  const payload = JSON.parse(readFileSync(resolve(SHARDS, file.replace('.idx.json', '.json')), 'utf8'))
  for (const gtin of idx.order) {
    const rec = payload.records[gtin]
    if (!rec) continue
    // **نفس** تركيب نصّ الفهرسة في `buildSearchIndex` — لا تركيب ثانٍ يتباعد عنه.
    const text = [rec.name_ar, rec.name_en, rec.brand_ar, rec.brand_en, rec.category].filter(Boolean).join(' ')
    rows.push(CARD_FIELDS.map((f) => (rec[f] === undefined ? null : rec[f])))
    keysOf.push(bucketKeysForText(text))
  }
}

// ── ٢) بناء الحزم ──
const MARKET_RANK = { SA: 0, GCC: 1, GLOBAL: 2 }
const NAME_AR = CARD_FIELDS.indexOf('name_ar')
const NAME_EN = CARD_FIELDS.indexOf('name_en')
const GTIN = CARD_FIELDS.indexOf('gtin')
const MARKET = CARD_FIELDS.indexOf('market')
const displayName = (r) => String(r[NAME_AR] ?? r[NAME_EN] ?? r[GTIN])

const map = new Map()
let postings = 0
for (let i = 0; i < rows.length; i++) {
  for (const key of keysOf[i]) {
    let list = map.get(key)
    if (!list) { list = []; map.set(key, list) }
    list.push(i)
    postings += 1
  }
}

for (const list of map.values()) {
  list.sort((a, b) => {
    const ra = MARKET_RANK[rows[a][MARKET]] ?? 3
    const rb = MARKET_RANK[rows[b][MARKET]] ?? 3
    if (ra !== rb) return ra - rb
    const la = displayName(rows[a]).length
    const lb = displayName(rows[b]).length
    if (la !== lb) return la - lb
    return rows[a][GTIN] < rows[b][GTIN] ? -1 : rows[a][GTIN] > rows[b][GTIN] ? 1 : 0
  })
}

const keys = [...map.keys()].sort()

// ── ٣) التصدير ──
const directory = {
  version: SEARCH_CORPUS_VERSION,
  normalization_version: NORMALIZATION_VERSION,
  key_length: BUCKET_KEY_LENGTH,
  page_size: BUCKET_PAGE_SIZE,
  total_records: rows.length,
  total_postings: postings,
  buckets: Object.fromEntries(keys.map((k) => [k, map.get(k).length])),
}

const files = [['search/directory.json', Buffer.from(stableStringify(directory))]]
for (const key of keys) {
  const list = map.get(key)
  const pages = pageCount(list.length, BUCKET_PAGE_SIZE)
  for (let p = 0; p < pages; p++) {
    const slice = list.slice(p * BUCKET_PAGE_SIZE, (p + 1) * BUCKET_PAGE_SIZE)
    const page = {
      key,
      page: p,
      fields: [...CARD_FIELDS],
      columns: CARD_FIELDS.map((_, j) => slice.map((i) => rows[i][j])),
    }
    files.push([bucketPagePath(key, p), Buffer.from(JSON.stringify(page))])
  }
}

let totalBytes = 0
const lines = []
for (const [path, buf] of files) { totalBytes += buf.length; lines.push(`${path}:${sha256(buf)}`) }
lines.sort()
const root = sha256(Buffer.from(lines.join('\n')))

const manifest = {
  version: SEARCH_CORPUS_VERSION,
  normalization_version: NORMALIZATION_VERSION,
  key_length: BUCKET_KEY_LENGTH,
  page_size: BUCKET_PAGE_SIZE,
  buckets: keys.length,
  files: files.length,
  total_records: rows.length,
  total_postings: postings,
  total_bytes: totalBytes,
  merkle_root: root,
}

if (VERIFY) {
  let prior = null
  try { prior = JSON.parse(readFileSync(resolve(OUT, 'manifest.json'), 'utf8')) } catch { /* لا بيان سابق */ }
  if (!prior) { console.error('✗ لا بيان سابق في public/food/search — لا شيء يُقارَن.'); process.exit(1) }
  const same = prior.merkle_root === root && prior.files === manifest.files && prior.total_bytes === manifest.total_bytes
  console.log(`${same ? '✓' : '✗'} إعادة التصدير ${same ? 'مطابقة بالبايت' : 'مختلفة'} — root ${root.slice(0, 16)}… مقابل ${String(prior.merkle_root).slice(0, 16)}…`)
  process.exit(same ? 0 : 1)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(resolve(OUT, 'b'), { recursive: true })
for (const [path, buf] of files) writeFileSync(resolve(FOOD, path), buf)
writeFileSync(resolve(OUT, 'manifest.json'), stableStringify(manifest))

console.log(`✓ ${manifest.buckets} حزمة · ${manifest.files} ملفًا · ${(totalBytes / 1048576).toFixed(2)} ميغابايت خامًا · ${postings} إدراجًا لـ${rows.length} سجلًا`)
console.log(`  merkle_root ${root}`)
