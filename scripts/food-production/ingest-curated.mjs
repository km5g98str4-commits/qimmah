// قِمّة — استيعاب الدفعات المنسَّقة داخليًا (PKG-*: منتجات سعودية/خليجية معبّأة بباركود).
// هذه بيانات **مملوكة لقِمّة** ومُتحقَّق منها، فهي نواة «الطقم الساخن».
//
//   node scripts/food-production/ingest-curated.mjs [--out file.jsonl] [--batch PKG-002]
//
// ═══ لماذا صار متعدّد الدفعات ═══
// كان المسار **مثبَّتًا على `PKG-001`** في ثابت واحد، فكانت كل دفعة جديدة تعني تعديل
// السكربت نفسه. صار يكتشف كل `PKG-*.json` في مجلّد الدفعات ويعالجها **بترتيب اسم الملف**
// — والترتيب حتمي لأن `readdirSync` يُفرز صراحةً، فلا يتغيّر الناتج بتغيّر نظام الملفات.
//
// ⚠️ **سلوك PKG-001 لم يتغيّر بحرف**: نفس الحقول، ونفس `source_record_id` بصيغة
// `<batch>:<gtin>` التي كانت تُكتب `PKG-001:<gtin>` — لأن مُعرّف الدفعة يُقرأ الآن من
// حقل `batch` داخل الملف بدل أن يكون نصًّا صلبًا.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { loadShared, ROOT } from './lib/loadTs.mjs'
import * as N from './lib/normalize.mjs'
import { checkNutrition, BLOCKING_FLAGS, scoreConfidence } from './lib/sanity.mjs'

const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const PACK_DIR = resolve(ROOT, 'docs/data-factory/packaged')
const OUT = resolve(argOf('--out', resolve(ROOT, '.food-cache/curated-accepted.jsonl')))
const ONLY_BATCH = argOf('--batch', null)

/**
 * كل ملفات الدفعات، **مفروزة باسم الملف** — الحتمية شرط: نفس المدخلات تعطي نفس الـJSONL
 * بايتًا ببايت، وإلا صار الفرق في الناتج ضجيجًا لا إشارة.
 */
function discoverPacks() {
  return readdirSync(PACK_DIR)
    .filter((f) => /^PKG-\d+.*\.json$/.test(f))
    .sort()
    .map((f) => resolve(PACK_DIR, f))
}

const { norm, gtin: G } = await loadShared()
const INGESTED_AT = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString()

const stats = { input: 0, rejected: {}, accepted: 0, flags: {}, by_batch: {} }
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1 }
const records = []
/** GTIN ⇒ الدفعة التي طالبت به أولًا — التكرار عبر الدفعات يُرفض **مسمّىً** لا صامتًا. */
const claimedBy = new Map()

for (const file of discoverPacks()) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  const batch = N.str(pkg.batch) ?? basename(file).replace(/\.json$/, '')
  if (ONLY_BATCH && batch !== ONLY_BATCH) continue
  const bstat = { input: pkg.items.length, accepted: 0, rejected: 0 }
  stats.input += pkg.items.length

  for (const item of pkg.items) {
    const cls = G.classifyGtin(item.barcode)
    if (!cls.ok) { bump(stats.rejected, `gtin_${cls.reason}`); bstat.rejected++; continue }

    // سلعة طالبت بها دفعة أسبق ⇒ الأسبق تفوز، والتكرار يُعلَن باسم الدفعتين.
    const prior = claimedBy.get(cls.gtin14)
    if (prior) { bump(stats.rejected, `duplicate_gtin_claimed_by_${prior}`); bstat.rejected++; continue }

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
      source_record_id: `${batch}:${cls.gtin}`,
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
    if (blocking.length) { for (const f of blocking) bump(stats.rejected, f); bstat.rejected++; continue }
    rec.quality_flags = flags
    rec.confidence = scoreConfidence(rec, flags)
    for (const f of flags) bump(stats.flags, f)
    records.push(rec)
    claimedBy.set(cls.gtin14, batch)
    stats.accepted++
    bstat.accepted++
  }
  stats.by_batch[batch] = bstat
  console.log(`── curated (${batch}) ──`)
  console.log(`input ${bstat.input} · accepted ${bstat.accepted} · rejected ${bstat.rejected}`)
}

records.sort((a, b) => (a.gtin < b.gtin ? -1 : 1))
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
mkdirSync(resolve(ROOT, 'data/food-production/reports'), { recursive: true })
writeFileSync(resolve(ROOT, 'data/food-production/reports/curated-ingest-stats.json'), JSON.stringify(stats, null, 2) + '\n')

console.log(`── curated (all batches) ──`)
console.log(`input ${stats.input} · accepted ${stats.accepted} · rejected ${stats.input - stats.accepted}`)
console.log(`arabic names: ${records.filter((r) => r.name_ar).length}/${records.length}`)
console.log(`→ ${OUT}`)
