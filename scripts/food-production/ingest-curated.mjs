// قِمّة — استيعاب الدفعة المنسَّقة داخليًا (PKG-001: منتجات سعودية/خليجية معبّأة بباركود).
// هذه بيانات **مملوكة لقِمّة** ومُتحقَّق منها بمصدرين، فهي نواة «الطقم الساخن».
//
//   node scripts/food-production/ingest-curated.mjs [--out file.jsonl]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { loadShared, ROOT } from './lib/loadTs.mjs'
import * as N from './lib/normalize.mjs'
import { checkNutrition, BLOCKING_FLAGS, scoreConfidence } from './lib/sanity.mjs'

const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const SRC = resolve(ROOT, 'docs/data-factory/packaged/PKG-001-saudi-gulf-packaged.json')
const OUT = resolve(argOf('--out', resolve(ROOT, '.food-cache/curated-accepted.jsonl')))

const { norm, gtin: G } = await loadShared()
const INGESTED_AT = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString()

const pkg = JSON.parse(readFileSync(SRC, 'utf8'))
const stats = { input: pkg.items.length, rejected: {}, accepted: 0, flags: {} }
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1 }
const records = []

for (const item of pkg.items) {
  const cls = G.classifyGtin(item.barcode)
  if (!cls.ok) { bump(stats.rejected, `gtin_${cls.reason}`); continue }
  const n = item.per_100g_or_100ml ?? {}
  const { serving_size, serving_unit } = N.parseServing(item.serving_size, norm.foldArabicDigits)
  const basis = N.resolveBasis(serving_unit, item.package_size ?? item.serving_size)

  const rec = {
    product_id: `qimmah_curated:${cls.gtin14}`,
    gtin: cls.gtin14,
    gtin_as_source: cls.gtin,
    name_ar: N.str(item.name_ar),
    name_en: N.str(item.name_en),
    brand_ar: N.str(item.brand_ar),
    brand_en: null,
    manufacturer: null,
    // ⚠️ المصدر يصرّح أن المنشأ **مستنتَج من بادئة GS1** — والبادئة تعرّف المنظمة
    //    المرخِّصة لا بلد المنشأ. فلا يُكتب في `country` ادّعاءً؛ يبقى null.
    country: null,
    market: cls.prefix3 === '628' ? 'SA' : cls.gulfPrefix ? 'GCC' : 'GLOBAL',
    category: N.str(item.category_ar),
    serving_size,
    serving_unit,
    servings_per_container: null,
    nutrition_basis: basis,
    energy_kcal: N.num(n.energy_kcal),
    protein_g: N.num(n.protein_g),
    carbs_g: N.num(n.carbohydrates_g),
    fat_g: N.num(n.fat_g),
    saturated_fat_g: N.num(n.saturated_fat_g),
    sugar_g: N.num(n.sugars_g),
    fiber_g: N.num(n.fiber_g),
    sodium_mg: N.num(n.sodium_mg),
    micronutrients: null,
    ingredients: null,
    allergens: item.allergens_ar ? N.parseAllergens(item.allergens_ar) : null,
    image_url: null,
    source: 'qimmah_curated',
    source_record_id: `PKG-001:${cls.gtin}`,
    source_url: N.str(item.source_official_url) ?? N.str(item.source_off_url),
    source_updated_at: item.last_verified ? new Date(item.last_verified).toISOString() : null,
    ingested_at: INGESTED_AT,
    confidence: 0,
    quality_flags: [],
    normalization_version: norm.NORMALIZATION_VERSION,
    schema_version: '1.0.0',
  }

  const flags = checkNutrition(rec, 'kcal_field')
  const blocking = flags.filter((f) => BLOCKING_FLAGS.has(f))
  if (blocking.length) { for (const f of blocking) bump(stats.rejected, f); continue }
  rec.quality_flags = flags
  rec.confidence = scoreConfidence(rec, flags)
  for (const f of flags) bump(stats.flags, f)
  records.push(rec)
  stats.accepted++
}

records.sort((a, b) => (a.gtin < b.gtin ? -1 : 1))
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
mkdirSync(resolve(ROOT, 'data/food-production/reports'), { recursive: true })
writeFileSync(resolve(ROOT, 'data/food-production/reports/curated-ingest-stats.json'), JSON.stringify(stats, null, 2) + '\n')

console.log(`── curated (PKG-001) ──`)
console.log(`input ${stats.input} · accepted ${stats.accepted} · rejected ${stats.input - stats.accepted}`)
console.log(`arabic names: ${records.filter((r) => r.name_ar).length}/${records.length}`)
console.log(`→ ${OUT}`)
