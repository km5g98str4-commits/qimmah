// قِمّة — استيعاب تصدير Open Food Facts الجملي (CSV مفصول بجدولة، مضغوط gzip).
//
// المسار المسموح: ملف التصدير الرسمي تحت /data/ — **لا** زحف على /api أو /cgi
// (robots يمنعهما لكل الوكلاء). انظر `data/food-production/manifests/sources.json`.
//
//   node scripts/food-production/ingest-off.mjs --input <file.csv.gz> [--limit N] [--out file.jsonl]
//
// حتمي: نفس المدخل ⇒ نفس المخرج بايتًا ببايت (الترتيب مقطوع التعادل بالـGTIN).
// محدود الذاكرة: يحتفظ بأعلى N عالميًا فقط، ويُبقي كل سجلات السعودية/الخليج بلا حدّ.

import { createReadStream } from 'node:fs'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { loadShared, ROOT } from './lib/loadTs.mjs'
import * as N from './lib/normalize.mjs'
import { checkNutrition, BLOCKING_FLAGS, scoreConfidence } from './lib/sanity.mjs'

const args = process.argv.slice(2)
const argOf = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt }
const INPUT = resolve(argOf('--input', resolve(ROOT, '.food-cache/off-products.csv.gz')))
const OUT = resolve(argOf('--out', resolve(ROOT, '.food-cache/off-accepted.jsonl')))
const GLOBAL_LIMIT = Number(argOf('--limit', process.env.OFF_GLOBAL_LIMIT ?? 55000))
const PROGRESS_EVERY = 250000

const { norm, gtin: G } = await loadShared()
const INGESTED_AT = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString()

const stats = {
  rows_read: 0,
  gtin_rejected: {},
  quality_rejected: {},
  accepted_sa: 0,
  accepted_gcc: 0,
  accepted_global_considered: 0,
  flags: {},
}
const bump = (obj, key) => { obj[key] = (obj[key] ?? 0) + 1 }

const gulfRecords = []
let globalPool = []

/** ترتيب حتمي: الثقة تنازليًا، ثم GTIN تصاعديًا لقطع التعادل. */
const rank = (a, b) => (b.confidence - a.confidence) || (a.gtin < b.gtin ? -1 : a.gtin > b.gtin ? 1 : 0)

function prunePool() {
  if (globalPool.length <= GLOBAL_LIMIT * 2) return
  globalPool.sort(rank)
  globalPool.length = GLOBAL_LIMIT
}

function buildRecord(row) {
  const cls = G.classifyGtin(row.code)
  if (!cls.ok) { bump(stats.gtin_rejected, cls.reason); return null }

  const { serving_size, serving_unit } = N.parseServing(row.serving_size, norm.foldArabicDigits)
  const { energy_kcal, energy_from } = N.resolveEnergyKcal(row)
  const { sodium_mg } = N.resolveSodiumMg(row)
  const names = N.splitByScript(row.product_name)
  const brands = N.splitByScript(row.brands)
  const basis = N.resolveBasis(serving_unit, row.quantity)
  const market = N.resolveMarket(row.countries_en, cls)

  const rec = {
    product_id: `openfoodfacts:${cls.gtin14}`,
    gtin: cls.gtin14,
    gtin_as_source: cls.gtin,
    name_ar: names.ar,
    name_en: names.en,
    brand_ar: brands.ar,
    brand_en: brands.en,
    manufacturer: N.str(row.brand_owner) ?? N.str(row.manufacturing_places),
    country: N.str(row.countries_en),
    market,
    category: N.str(row.main_category_en) ?? N.str(row.pnns_groups_2),
    serving_size,
    serving_unit,
    servings_per_container: null,
    nutrition_basis: basis,
    energy_kcal: energy_kcal === null ? null : Number(energy_kcal.toFixed(2)),
    protein_g: N.num(row.proteins_100g),
    carbs_g: N.num(row.carbohydrates_100g),
    fat_g: N.num(row.fat_100g),
    saturated_fat_g: N.num(row['saturated-fat_100g']),
    sugar_g: N.num(row.sugars_100g),
    fiber_g: N.num(row.fiber_100g),
    sodium_mg: sodium_mg === null ? null : Number(sodium_mg.toFixed(2)),
    micronutrients: N.parseMicronutrients(row),
    ingredients: N.str(row.ingredients_text),
    allergens: N.parseAllergens(row.allergens_en ?? row.allergens),
    // ⛔ صور OFF تحت CC-BY-SA لكن شروط OFF نفسها تنبّه لحقوق أطراف ثالثة
    //    (تصميم العبوة/العلامة). ليست نظيفة الحقوق ⇒ لا تُستورد (قرار المؤسس ٨).
    image_url: null,
    source: 'openfoodfacts',
    source_record_id: cls.gtin,
    source_url: `https://world.openfoodfacts.org/product/${cls.gtin}`,
    source_updated_at: row.last_modified_datetime ? new Date(row.last_modified_datetime).toISOString() : null,
    ingested_at: INGESTED_AT,
    confidence: 0,
    quality_flags: [],
    normalization_version: norm.NORMALIZATION_VERSION,
    schema_version: '1.0.0',
  }

  if (!rec.name_ar && !rec.name_en) { bump(stats.quality_rejected, 'no_name'); return null }

  const flags = checkNutrition(rec, energy_from)
  const blocking = flags.filter((f) => BLOCKING_FLAGS.has(f))
  if (blocking.length) { for (const f of blocking) bump(stats.quality_rejected, f); return null }

  rec.quality_flags = flags
  rec.confidence = scoreConfidence(rec, flags)
  for (const f of flags) bump(stats.flags, f)
  return rec
}

console.log(`── ingest Open Food Facts ──\ninput: ${INPUT}\nglobal cap: ${GLOBAL_LIMIT.toLocaleString()}`)
const started = Date.now()

// الملفّات المضغوطة تُفكّ أثناء البثّ؛ و`.tsv` الصِّرف مقبول كي تبقى العيّنات
// المرجعية (fixtures) نصًّا مقروءًا يُراجَع في الـdiff بدل كتلة ثنائية معتمة.
const rawStream = createReadStream(INPUT)
const rl = createInterface({
  input: INPUT.endsWith('.gz') ? rawStream.pipe(createGunzip()) : rawStream,
  crlfDelay: Infinity,
})

// تحمّل ملفّ ناقص: نسخة التصدير قد تكون قيد التنزيل. الانقطاع يُسجَّل بصدق
// (`truncated_input`) ويُستكمل ما قُرئ — لا انهيار، ولا ادّعاء أن الملفّ كامل.
// ملاحظة تنفيذية: مستمع `error` على المجرى **لا يكفي** — مُكرِّر `for await` يرفض
// الوعد بنفسه، فاللقط يجب أن يكون حول الحلقة لا على المجرى.
let truncated = false
let header = null
try {
for await (const line of rl) {
  if (header === null) { header = line.split('\t'); continue }
  stats.rows_read++
  if (stats.rows_read % PROGRESS_EVERY === 0) {
    process.stdout.write(`  … ${stats.rows_read.toLocaleString()} rows · gulf ${gulfRecords.length.toLocaleString()} · pool ${globalPool.length.toLocaleString()}\r`)
  }
  const cells = line.split('\t')
  if (cells.length < 20) continue
  const row = {}
  for (let i = 0; i < header.length; i++) row[header[i]] = cells[i]

  let rec
  try { rec = buildRecord(row) } catch { bump(stats.quality_rejected, 'parse_error'); continue }
  if (!rec) continue

  if (rec.market === 'SA') { stats.accepted_sa++; gulfRecords.push(rec) }
  else if (rec.market === 'GCC') { stats.accepted_gcc++; gulfRecords.push(rec) }
  else { stats.accepted_global_considered++; globalPool.push(rec); prunePool() }
}
} catch (err) {
  if (/unexpected end of file|premature|Z_BUF_ERROR|Z_DATA_ERROR/i.test(String(err?.message ?? err))) {
    truncated = true
  } else throw err
}

globalPool.sort(rank)
globalPool = globalPool.slice(0, GLOBAL_LIMIT)
const all = [...gulfRecords, ...globalPool].sort((a, b) => (a.gtin < b.gtin ? -1 : a.gtin > b.gtin ? 1 : 0))

mkdirSync(dirname(OUT), { recursive: true })
const out = createWriteStream(OUT)
for (const rec of all) out.write(JSON.stringify(rec) + '\n')
await new Promise((res) => out.end(res))

stats.truncated_input = truncated
stats.elapsed_s = Math.round((Date.now() - started) / 1000)
stats.written = all.length
stats.global_shipped = globalPool.length
mkdirSync(resolve(ROOT, 'data/food-production/reports'), { recursive: true })
writeFileSync(resolve(ROOT, 'data/food-production/reports/off-ingest-stats.json'), JSON.stringify(stats, null, 2) + '\n')

console.log(`\n✓ rows read      : ${stats.rows_read.toLocaleString()}`)
console.log(`✓ Saudi (SA)     : ${stats.accepted_sa.toLocaleString()}`)
console.log(`✓ Gulf  (GCC)    : ${stats.accepted_gcc.toLocaleString()}`)
console.log(`✓ global passed  : ${stats.accepted_global_considered.toLocaleString()} → shipped ${stats.global_shipped.toLocaleString()}`)
console.log(`✓ written        : ${all.length.toLocaleString()} → ${OUT}`)
console.log(`  elapsed ${stats.elapsed_s}s`)
if (truncated) console.log('⚠️  المدخل ناقص (التنزيل لم يكتمل) — الأرقام أعلاه تخصّ ما قُرئ فعلًا لا الملفّ كاملًا.')
