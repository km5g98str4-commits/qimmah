// قِمّة — منسّق خطّ إنتاج بيانات المنتجات.
// يقرأ ملفات JSONL المستوعَبة ⇒ يزيل التكرار ⇒ يبني الطقم الساخن والشرائح والفهارس
// ⇒ يكتب البيان بالبصمات والتقارير. حتمي وقابل لإعادة الإنتاج بايتًا ببايت.
//
//   node scripts/food-production/build-pipeline.mjs --in a.jsonl --in b.jsonl [--out-dir DIR]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadShared, ROOT } from './lib/loadTs.mjs'
import { dedupe } from './lib/dedupe.mjs'
import {
  writeShards, writeHotSet, chooseShardCount, stableStringify, sha256,
  SHARD_TARGET_GZIP_BYTES, HOT_SET_BUDGET_GZIP_BYTES,
} from './lib/shard.mjs'

const args = process.argv.slice(2)
const argsOf = (flag) => args.reduce((acc, a, i) => (a === flag ? [...acc, args[i + 1]] : acc), [])
const argOf = (flag, d) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : d }

const INPUTS = (argsOf('--in').length ? argsOf('--in') : [
  '.food-cache/curated-accepted.jsonl',
  '.food-cache/off-accepted.jsonl',
]).map((p) => resolve(ROOT, p)).filter((p) => existsSync(p))

const OUT_DIR = resolve(ROOT, argOf('--out-dir', 'data/food-production/accepted'))
const REPORT_DIR = resolve(ROOT, 'data/food-production/reports')
const REJECT_DIR = resolve(ROOT, 'data/food-production/rejected')
const HOT_MAX = Number(argOf('--hot-max', process.env.HOT_SET_MAX ?? 600))

if (!INPUTS.length) { console.error('no input JSONL found — run the ingest scripts first'); process.exit(1) }

const { norm } = await loadShared()

// ── تحميل ──
const records = []
for (const file of INPUTS) {
  let n = 0
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    records.push(JSON.parse(line)); n++
  }
  console.log(`  loaded ${n.toLocaleString().padStart(9)}  ${file.replace(ROOT + '/', '')}`)
}
console.log(`  total raw: ${records.length.toLocaleString()}`)

// ── إزالة التكرار ──
const { accepted, conflicts, reviewQueue, stats: dedupeStats } = dedupe(records, norm.normalizeProductKey)
console.log(`  after dedupe: ${accepted.length.toLocaleString()} (removed ${dedupeStats.duplicates_removed.toLocaleString()}, conflicts ${conflicts.length}, review ${reviewQueue.length})`)

// ── الطقم الساخن: المنسَّق كلّه + أعلى السعودي/الخليجي ثقةً ──
const rank = (a, b) => (b.confidence - a.confidence) || (a.gtin < b.gtin ? -1 : 1)
const curated = accepted.filter((r) => r.source === 'qimmah_curated')
const curatedGtins = new Set(curated.map((r) => r.gtin))
/**
 * ترتيب الطقم الساخن — **الاسم العربي قبل الثقة الخام**.
 * هذا الملفّ هو ما يعمل بلا شبكة للمستخدم السعودي، فسجلٌّ بلا اسم عربي فيه أقلّ نفعًا
 * من سجلٍّ بعربية أضعف ثقةً بقليل: الأول لا يُعثر عليه بالبحث العربي أصلًا.
 * الترتيب: السعودية قبل الخليج ← ثم وجود اسم عربي ← ثم الثقة ← ثم الـGTIN (قطع تعادل).
 */
const hotRank = (a, b) => {
  if (a.market !== b.market) return a.market === 'SA' ? -1 : 1
  const aAr = a.name_ar ? 0 : 1
  const bAr = b.name_ar ? 0 : 1
  if (aAr !== bAr) return aAr - bAr
  return rank(a, b)
}
const gulfRest = accepted
  .filter((r) => !curatedGtins.has(r.gtin) && (r.market === 'SA' || r.market === 'GCC'))
  .sort(hotRank)
const hotSet = [...curated, ...gulfRest].slice(0, Math.max(curated.length, HOT_MAX))

// ── الكتابة ──
mkdirSync(OUT_DIR, { recursive: true })
const shardCount = chooseShardCount(accepted)
const shardResult = writeShards({
  records: accepted,
  outDir: resolve(OUT_DIR, 'shards'),
  shardCount,
  tokenize: norm.tokenize,
  normalizationVersion: norm.NORMALIZATION_VERSION,
  schemaVersion: '1.0.0',
})
const hotResult = writeHotSet({
  records: hotSet,
  outDir: resolve(OUT_DIR, 'hot'),
  tokenize: norm.tokenize,
  normalizationVersion: norm.NORMALIZATION_VERSION,
  schemaVersion: '1.0.0',
})

// ── البيان ──
const byMarket = accepted.reduce((a, r) => ((a[r.market] = (a[r.market] ?? 0) + 1), a), {})
const bySource = accepted.reduce((a, r) => ((a[r.source] = (a[r.source] ?? 0) + 1), a), {})
const flagCounts = {}
for (const r of accepted) for (const f of r.quality_flags) flagCounts[f] = (flagCounts[f] ?? 0) + 1

const manifest = {
  manifest_version: '1.0.0',
  built_at: new Date().toISOString(),
  normalization_version: norm.NORMALIZATION_VERSION,
  schema_version: '1.0.0',
  licence: {
    notice: 'Contains information from Open Food Facts (https://world.openfoodfacts.org), made available under the Open Database License (ODbL) v1.0.',
    obligations: ['attribution', 'share-alike on public distribution of derived database', 'keep-open'],
  },
  routing: {
    method: 'FNV-1a 32-bit over the canonical GTIN-14, modulo shard_count',
    barcode_lookup: 'O(1): compute shard from GTIN-14, fetch that shard only, index the records object by GTIN-14. No scan, no routing table.',
    shard_count: shardCount,
  },
  totals: {
    accepted: accepted.length,
    by_market: byMarket,
    by_source: bySource,
    unique_gtin: new Set(accepted.map((r) => r.gtin)).size,
    duplicates_removed: dedupeStats.duplicates_removed,
    conflicts: conflicts.length,
    review_queue: reviewQueue.length,
  },
  budgets: {
    shard_target_gzip_bytes: SHARD_TARGET_GZIP_BYTES,
    hot_set_budget_gzip_bytes: HOT_SET_BUDGET_GZIP_BYTES,
  },
  hot_set: hotResult,
  shards: shardResult.shards,
  shard_totals: shardResult.totals,
  quality_flags: flagCounts,
  dedupe: dedupeStats,
}
const manifestRaw = Buffer.from(stableStringify(manifest))
mkdirSync(resolve(ROOT, 'data/food-production/manifests'), { recursive: true })
writeFileSync(resolve(ROOT, 'data/food-production/manifests/build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(resolve(ROOT, 'data/food-production/manifests/build-manifest.sha256'), sha256(manifestRaw) + '\n')

mkdirSync(REJECT_DIR, { recursive: true })
/**
 * تُكتب **عيّنة** لا القائمة كاملة: العدد الكامل معلن في `_total` وفي البيان، والقوائم
 * الكاملة تُولَّد بإعادة التشغيل. التزام آلاف الصفوف في git ينتفخ بلا فائدة للمراجعة —
 * والعدد هو المعلومة، لا كل صفّ منه.
 */
const SAMPLE = 200
const writeSample = (file, rows, note) => writeFileSync(resolve(REJECT_DIR, file), JSON.stringify({
  _note: note,
  _total: rows.length,
  _sample_size: Math.min(SAMPLE, rows.length),
  sample: rows.slice(0, SAMPLE),
}, null, 2) + '\n')
writeSample('conflicts.json', conflicts, 'تعارضات مرفوعة لا مدموجة — العدد الكامل في _total، والقائمة كاملةً تُولَّد بإعادة تشغيل الخطّ.')
writeSample('review-queue.json', reviewQueue, 'مرشّحون ضبابيون لمراجعة بشرية — لا يُدمجون آليًا أبدًا.')
mkdirSync(REPORT_DIR, { recursive: true })
writeFileSync(resolve(REPORT_DIR, 'build-summary.json'), JSON.stringify({
  accepted: accepted.length, by_market: byMarket, by_source: bySource,
  arabic_names: accepted.filter((r) => r.name_ar).length,
  english_names: accepted.filter((r) => r.name_en).length,
  with_serving: accepted.filter((r) => r.serving_size !== null).length,
  complete_macros: accepted.filter((r) => r.protein_g !== null && r.carbs_g !== null && r.fat_g !== null).length,
  with_sodium: accepted.filter((r) => r.sodium_mg !== null).length,
  with_fiber: accepted.filter((r) => r.fiber_g !== null).length,
  with_ingredients: accepted.filter((r) => r.ingredients !== null).length,
  quality_flags: flagCounts,
  confidence_buckets: accepted.reduce((a, r) => {
    const b = r.confidence >= 0.8 ? 'high_0.8+' : r.confidence >= 0.6 ? 'mid_0.6-0.8' : r.confidence >= 0.4 ? 'low_0.4-0.6' : 'very_low_<0.4'
    a[b] = (a[b] ?? 0) + 1; return a
  }, {}),
}, null, 2) + '\n')

const mb = (b) => (b / 1048576).toFixed(2) + ' MB'
const kb = (b) => (b / 1024).toFixed(1) + ' KB'
console.log(`\n── artifacts ──`)
console.log(`  shards        : ${shardCount} × avg ${kb(shardResult.totals.bytes_gzip / shardCount)} gzip  (budget ${kb(SHARD_TARGET_GZIP_BYTES.min)}–${kb(SHARD_TARGET_GZIP_BYTES.max)})`)
console.log(`  within budget : ${shardResult.shards.filter((s) => s.within_budget).length}/${shardCount}`)
console.log(`  data gzip     : ${mb(shardResult.totals.bytes_gzip)}   raw ${mb(shardResult.totals.bytes_raw)}`)
console.log(`  index gzip    : ${mb(shardResult.totals.index_bytes_gzip)}`)
console.log(`  TOTAL gzip    : ${mb(shardResult.totals.bytes_gzip_all)}`)
console.log(`  hot set       : ${hotResult.count} recs · ${kb(hotResult.bytes_gzip)} gzip · budget ${kb(HOT_SET_BUDGET_GZIP_BYTES)} · ${hotResult.within_budget ? 'WITHIN' : 'OVER'}`)
console.log(`  by market     : ${JSON.stringify(byMarket)}`)
