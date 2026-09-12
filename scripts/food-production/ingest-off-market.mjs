// قِمّة — استيعاب «كتالوج السوق السعودي» من Open Food Facts (ملف مؤسس مُنقّى).
//
//   node scripts/food-production/ingest-off-market.mjs [--out file.jsonl]
//
// ═══ لماذا مسار ثالث بجانب ingest-off ═══
// `ingest-off` يقرأ التصدير الجملي (١٫٢ غ.ب) ويُبقي السعودية/الخليج **بحسب بادئة
// GS1 أو حقل البلد**، ويقصّ الذيل العالمي بعدّاد المسح. فمنتج يُباع في السعودية
// ببادئة إيطالية وبلا عدّاد مسح (نوتيلا ٧٥٠غ) قد يسقط خارج السقف. المؤسس سحب
// من OFF **كامل الكتالوج الموسوم «Saudi Arabia»** (١٥٬٩٠٩) ونقّاه إلى ٤٬٩٣٦ سجلًا
// بماكروز، وهذا الملف مُلتزم في `docs/data-factory/off-market/`.
//
// ═══ العقد ═══
//   • المصدر يبقى `openfoodfacts` (ODbL) — النسب يظهر في الواجهة كما لأي سجل OFF.
//   • السوق `SA` لأن المصدر يعلن البلد؛ البادئة إشارة ثانوية (resolveMarket).
//   • نفس بوابات الجودة (`checkNutrition` · `BLOCKING_FLAGS`) ونفس الثقة المشتقّة.
//   • الملح/الصوديوم **لا يُستوردان**: مقياسهما في الملف غير مؤكّد (نوتيلا ١٫٠٧غ ملح
//     مقابل ٠٫١٠٧ في البطاقة) — ما لا نثق به لا يُعرض رقمًا (§5).
//   • عند تكرار GTIN مع سجل OFF قائم يحسمه `dedupe` (الأعلى ثقةً/الأحدث) لا هذا الملف.
//   • حتمي: نفس الملف ⇒ نفس المخرج بايتًا ببايت (SOURCE_DATE_EPOCH يثبّت ingested_at).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { loadShared, ROOT } from './lib/loadTs.mjs'
import * as N from './lib/normalize.mjs'
import { checkNutrition, BLOCKING_FLAGS, scoreConfidence } from './lib/sanity.mjs'

const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const INPUT = resolve(ROOT, argOf('--input', 'docs/data-factory/off-market/OFF-SA-2026-07-14.json'))
const OUT = resolve(argOf('--out', resolve(ROOT, '.food-cache/off-market-accepted.jsonl')))
const STATS = resolve(ROOT, 'data/food-production/reports/off-market-ingest-stats.json')

const { norm, gtin: G } = await loadShared()
/** حدّ بادئة حزم البحث — نفس `BUCKET_KEY_LENGTH` في src/lib/food/searchBuckets.ts. */
const SEARCH_KEY_LENGTH = 3
const INGESTED_AT = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString()

const pack = JSON.parse(readFileSync(INPUT, 'utf8'))
const stats = { input: pack.items.length, pulled_on: pack.pulled_on, gtin_rejected: {}, quality_rejected: {}, accepted: 0, arabic_names: 0, flags: {} }
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1 }
const records = []
const seen = new Set()

for (const item of pack.items) {
  const cls = G.classifyGtin(item.barcode)
  if (!cls.ok) { bump(stats.gtin_rejected, cls.reason); continue }
  if (seen.has(cls.gtin14)) { bump(stats.gtin_rejected, 'duplicate_in_file'); continue }

  const { serving_size, serving_unit } = N.parseServing(item.serving_size, norm.foldArabicDigits)
  const names = N.splitByScript(item.name)
  const brands = N.splitByScript(item.brand)
  const name_ar = N.str(item.name_ar) ?? names.ar
  const name_en = names.en
  if (!name_ar && !name_en) { bump(stats.quality_rejected, 'no_name'); continue }
  // سجلٌ لا كلمة فيه تبلغ حدّ بادئة حزم البحث (٣ محارف بعد التطبيع: «M&M's» ⇒ «m m s»)
  // لا يبلغه أحد بالنصّ، فيُرفض مسمّىً بدل أن يكسر عقد «كل سجل معلَن قابل للبلوغ»
  // (test:food-search-corpus). البحث بالباركود لهذا المنتج يبقى عبر OFF الحيّ.
  const searchable = [name_ar, name_en, brands.ar, brands.en]
    .flatMap((v) => norm.normalizeProductKey(v ?? '').split(/\s+/))
    .some((t) => t.length >= SEARCH_KEY_LENGTH)
  if (!searchable) { bump(stats.quality_rejected, 'no_searchable_token'); continue }

  const rec = {
    product_id: `openfoodfacts:${cls.gtin14}`,
    gtin: cls.gtin14,
    gtin_as_source: cls.gtin,
    name_ar,
    name_en,
    brand_ar: brands.ar,
    brand_en: brands.en,
    manufacturer: null,
    country: pack.countries,
    market: N.resolveMarket(pack.countries, cls),
    category: N.str(item.category),
    serving_size,
    serving_unit,
    servings_per_container: null,
    nutrition_basis: N.resolveBasis(serving_unit, item.quantity),
    energy_kcal: N.num(item.energy_kcal_100g),
    protein_g: N.num(item.proteins_100g),
    carbs_g: N.num(item.carbohydrates_100g),
    fat_g: N.num(item.fat_100g),
    saturated_fat_g: N.num(item.saturated_fat_100g),
    sugar_g: N.num(item.sugars_100g),
    fiber_g: N.num(item.fiber_100g),
    sodium_mg: null,
    micronutrients: null,
    ingredients: null,
    allergens: null,
    image_url: null,
    source: 'openfoodfacts',
    source_record_id: cls.gtin,
    source_url: `https://world.openfoodfacts.org/product/${cls.gtin}`,
    source_updated_at: new Date(`${pack.pulled_on}T00:00:00.000Z`).toISOString(),
    ingested_at: INGESTED_AT,
    confidence: 0,
    quality_flags: [],
    normalization_version: norm.NORMALIZATION_VERSION,
    schema_version: '1.0.0',
  }

  const flags = checkNutrition(rec, 'kcal_field')
  const blocking = flags.filter((f) => BLOCKING_FLAGS.has(f))
  if (blocking.length) { for (const f of blocking) bump(stats.quality_rejected, f); continue }
  rec.quality_flags = flags
  rec.confidence = scoreConfidence(rec, flags)
  for (const f of flags) bump(stats.flags, f)
  records.push(rec)
  seen.add(cls.gtin14)
  stats.accepted++
  if (rec.name_ar) stats.arabic_names++
}

records.sort((a, b) => (a.gtin < b.gtin ? -1 : 1))
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
mkdirSync(dirname(STATS), { recursive: true })
writeFileSync(STATS, JSON.stringify(stats, null, 2) + '\n')
console.log(`── off-market (OFF SA ${pack.pulled_on}) ──`)
console.log(`input ${stats.input} · accepted ${stats.accepted} · gtin rejected ${JSON.stringify(stats.gtin_rejected)} · quality rejected ${JSON.stringify(stats.quality_rejected)}`)
console.log(`arabic names: ${stats.arabic_names}/${stats.accepted}`)
console.log(`→ ${OUT}`)
