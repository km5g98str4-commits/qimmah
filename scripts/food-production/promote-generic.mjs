// قِمّة — ترقية الأطعمة العامّة المُتحقَّق منها إلى الكتالوج المنسَّق — [FOOD-GENERIC-001]
//
//   node scripts/food-production/promote-generic.mjs
//
// ═══ خطّ الإنتاج (المرحلة المحلّية بعد دليل CI) ═══
//   DISCOVER   ← docs/data-factory/generic/GENERIC-600-2026-09-12.json (الأسماء والفئات والكلمات)
//   MATCH      ← USDA-MAP.json (قرار كل صفّ: exact/q · mapped · recipe · quarantine)
//   RESEARCH   ← data/food-production/generic/usda-evidence.json (قيم USDA كما هي لكل ١٠٠غ + الحصص)
//   NORMALIZE  → صنف FoodItem بأساس ١٠٠غ محفوظ، وحصّة معروضة **من حصص USDA فقط**
//   VALIDATE   → طاقة ≤ ٩٠٠ · لا سالب · مجموع الماكروز ≤ ١٠٥غ · أتواتر ±٢٥٪ (تشخيص لا تصحيح)
//   DEDUPE     → اسم عربي/إنجليزي مطبَّع مطابق لصنف منسَّق قائم ⇒ «مغطّى» لا يُنشأ
//   PROMOTE    → src/data/genericFoods.generated.ts + data/food-production/generic/resolution.json
//
// ═══ ما لا يحدث هنا ═══
//   • لا قيمة تُشتقّ: كل رقم من سجلّ USDA بمعرّفه، وكل حصّة من foodPortions بوزنها.
//   • لا صفّ يُرقّى «ليكتمل العدد»: غير المطابق والمركّب يبقيان مسمّيَين في القرار.
//   • أتواتر إشارة: الفشل يُقصي الصفّ إلى الحجر (لا نعدّل قيم المصدر لنرضي معادلة).

/* global process */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTsModule } from './lib/loadTs.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
const catalog = read('docs/data-factory/generic/GENERIC-600-2026-09-12.json').items
const map = Object.fromEntries(read('docs/data-factory/generic/USDA-MAP.json').rows.map((r) => [r.id, r]))
const evidence = read('data/food-production/generic/usda-evidence.json')
const ev = Object.fromEntries(evidence.results.map((r) => [r.id, r]))
const food = await loadTsModule('src/data/foodItems.ts')
const normalize = (s) => food.normalizeSearch(String(s ?? '')).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()
// التكرار يُقاس مقابل المنسَّق **اليدوي** فقط — لا مقابل الملف المولَّد نفسه (وإلا صار
// كل صنف رُقّي في جولة سابقة «مغطًّى» في الجولة التالية ولم يُولَّد ثانيةً).
const handCurated = food.foodItems.filter((f) => !f.id.startsWith('gen-'))
const existingAr = new Map(handCurated.map((f) => [normalize(f.nameAr), f.id]))
const existingEn = new Map(handCurated.map((f) => [normalize(f.nameEn), f.id]))

/** فئة قِمّة لكل فئة في ملف المؤسس. */
const CATEGORY = {
  'Proteins': 'بروتين', 'Breads & Bakery': 'كارب', 'Rice, Grains & Pasta': 'كارب', 'Dairy': 'ألبان',
  'Vegetables': 'خضار', 'Fruits': 'فواكه', 'Legumes': 'بروتين', 'Nuts & Seeds': 'دهون صحية',
  'Oils, Sauces & Condiments': 'دهون صحية', 'Beverages': 'مشروبات', 'Saudi & Gulf Dishes': 'أكلات سعودية/خليجية',
  'Breakfast & Snacks': 'فطور', 'Soups & Salads': 'خضار', 'Prepared International': 'مطاعم',
}
const SWEET = /cookie|cake|brownie|donut|doughnut|cheesecake|ice cream|croissant|chocolate|jam|honey|syrup|sugar|dates/i

/**
 * اختيار الحصّة المعروضة — **من حصص USDA وحدها**، بقاعدة لكل فئة. غياب الحصّة
 * المناسبة ⇒ ١٠٠غ معلنة («لكل 100غ») لا وزن مخمَّن.
 */
const PORTION_RULES = [
  { test: /bread|toast|bagel|muffin|roll|bun|tortilla|pita|chapati|naan|rusk|cake, plain|rice cakes|corn cakes/i, pick: /slice|piece|cake|muffin|roll|bagel|tortilla|pita|loaf$/i, ar: (n) => (/slice/i.test(n) ? (/large/i.test(n) ? 'شريحة كبيرة' : /thin/i.test(n) ? 'شريحة رقيقة' : 'شريحة') : /muffin|bagel|roll|tortilla|pita|loaf|cake/i.test(n) ? 'حبة' : 'قطعة') },
  { test: /egg/i, pick: /^large$/i, ar: () => 'بيضة كبيرة' },
  { test: /oil|butter|mayonnaise|dressing|sauce|catsup|ketchup|mustard|vinegar|honey|syrup|jam|tahini|peanut butter|almond butter|cashew butter|spread|molasses|cream|paste/i, pick: /^tbsp$|^tablespoon$/i, ar: () => 'ملعقة كبيرة' },
  { test: /milk|yogurt|kefir|buttermilk|juice|coffee|tea|water|soda|beverage|drink|latte|cappuccino|cocoa|smoothie|shake|nectar|soymilk/i, pick: /^cup$|^cup \(8 fl oz\)$|^cup, /i, ar: () => 'كوب' },
  { test: /rice|pasta|noodle|couscous|bulgur|quinoa|barley|oats|oatmeal|cereal|grits|lentil|bean|chickpea|pea|corn|hummus|granola|muesli|flour|semolina/i, pick: /^cup$|^cup, cooked|^cup cooked|^cup, /i, ar: () => 'كوب' },
  { test: /apple|banana|orange|pear|peach|plum|kiwi|mango|nectarine|apricot|fig|persimmon|guava|tangerine|lemon|lime|avocado|tomato|cucumber|potato|onion|carrot|pepper|zucchini|eggplant|beet|turnip|radish/i, pick: /^medium$|medium \(/i, ar: () => 'حبة متوسطة' },
  { test: /dates|olives|cherries|grapes|strawberr|berries|nuts|almond|walnut|cashew|pistachio|peanut|hazelnut|pecan|seed|chips|popcorn|crackers|cookie|biscuit/i, pick: /^cup$|^oz$|^cup, /i, ar: (n) => (/oz/i.test(n) ? '٣٠غ (أونصة)' : 'كوب') },
]
function choosePortion(desc, portions) {
  for (const rule of PORTION_RULES) {
    if (!rule.test.test(desc)) continue
    const hit = portions.find((p) => rule.pick.test(String(p.modifier ?? p.unit ?? '')) && p.grams >= 3 && p.grams <= 400)
    if (hit) return { grams: hit.grams, labelAr: rule.ar(String(hit.modifier ?? hit.unit)), usda: `${hit.amount ?? 1} ${hit.modifier ?? hit.unit}` }
  }
  return { grams: 100, labelAr: 'لكل 100غ', usda: null }
}

const round1 = (n) => Math.round(n * 10) / 10
const per = (v, grams) => (typeof v === 'number' ? Math.round((v * grams) / 100) : 0)
const per1 = (v, grams) => (typeof v === 'number' ? Math.round((v * grams) / 10) / 10 : 0)

const resolution = []
const promoted = []
const coveredKeywords = new Map()
let seq = 0
for (const row of catalog) {
  const id = row.food_id
  const m = map[id] ?? {}
  const e = ev[id]
  const nameAr = String(row.name_ar).trim()
  const nameEn = String(row.name_en).trim()
  const coveredBy = existingAr.get(normalize(nameAr)) ?? existingEn.get(normalize(nameEn)) ?? null
  const base = { id, nameAr, nameEn, category: row.category, priority: row.priority }

  // الحالات الأربع المعتمدة (تقرير المؤسس): VERIFIED_AND_LOGGABLE · EXISTING_COVERAGE · RECIPE_BASED · QUARANTINED.
  // الوصفة لا تُعدّ تغطية حيّة: تبقى RECIPE_BASED ولو وُجد طبق منسَّق يغطّيها (يُذكر في loggableVia فقط).
  if (m.resolve === 'mapped') { resolution.push({ ...base, status: 'EXISTING_COVERAGE', via: 'map', by: m.curated }); continue }
  if (m.resolve === 'recipe') { resolution.push({ ...base, status: 'RECIPE_BASED', why: m.why, loggableVia: coveredBy }); continue }
  if (m.resolve === 'quarantine' || !e) { resolution.push({ ...base, status: 'QUARANTINED', why: m.why ?? 'بلا دليل' }); continue }
  if (e.status !== 'matched') { resolution.push({ ...base, status: 'QUARANTINED', why: `USDA ${e.status}`, candidates: e.candidates?.map((c) => c.description) ?? [] }); continue }
  // سجلّ أوسع من الصنف المسمّى (بسمتي ⇐ أرز أبيض طويل الحبّة): يُعلَن proxy بملاحظة، لا يُخفى ولا تُخترع فروق.
  const sourceMatch = m.proxy ? 'proxy' : 'exact'
  const proxyNote = m.proxy ?? null
  if (coveredBy) {
    // الصنف اليدوي يغطّي الصفّ؛ تُنقل إليه كلمات بحث الصفّ (اسمه وكلماته) فيبلغه
    // استعلام المؤسس («أرز أبيض مطبوخ» ⇒ «رز أبيض») بلا صنف مكرّر.
    const extra = [nameAr, nameEn, ...String(row.search_aliases_ar ?? '').split(/[،,;|]/), ...String(row.search_aliases_en ?? '').split(/[،,;|]/)].map((x) => x.trim()).filter(Boolean)
    coveredKeywords.set(coveredBy, [...new Set([...(coveredKeywords.get(coveredBy) ?? []), ...extra])])
    resolution.push({ ...base, status: 'EXISTING_COVERAGE', via: 'name', by: coveredBy, fdcId: e.fdcId, sourceMatch, proxyNote }); continue
  }

  // VALIDATE
  const n = e.per100g
  const problems = []
  if (typeof n.kcal !== 'number' || typeof n.protein !== 'number' || typeof n.carbs !== 'number' || typeof n.fat !== 'number') problems.push('missing_macros')
  if (n.kcal < 0 || n.protein < 0 || n.carbs < 0 || n.fat < 0) problems.push('negative_value')
  if (n.kcal > 900) problems.push('energy_density_impossible')
  if (n.protein + n.carbs + n.fat > 105) problems.push('macro_sum_exceeds_mass')
  const atwater = 4 * (n.protein ?? 0) + 4 * (n.carbs ?? 0) + 9 * (n.fat ?? 0)
  const kcalRef = n.kcal ?? 0
  if (kcalRef >= 40 && Math.abs(atwater - kcalRef) > 0.25 * Math.max(atwater, kcalRef)) problems.push('atwater_mismatch')
  if (problems.length) { resolution.push({ ...base, status: 'QUARANTINED', why: problems.join(','), fdcId: e.fdcId, per100g: n }); continue }

  // NORMALIZE
  const portion = choosePortion(e.description, e.portions ?? [])
  const g = portion.grams
  seq += 1
  const item = {
    id: `gen-${id.toLowerCase()}`,
    nameAr, nameEn,
    category: (row.category === 'Breakfast & Snacks' && SWEET.test(nameEn)) ? 'حلويات' : CATEGORY[row.category] ?? 'كارب',
    servingLabelAr: portion.labelAr, servingGrams: g,
    // الماكروز بعُشر غرام: تقريبها إلى عدد صحيح على حصّة ١٣٫٥غ (ملعقة زيت) يعطي ١٤غ دهن
    // ⇒ ١٠٣غ/١٠٠غ — رقم مستحيل يخلقه التقريب لا المصدر (يحرسه food-db-validate).
    calories: per(n.kcal, g), protein: per1(n.protein, g), carbs: per1(n.carbs, g), fat: per1(n.fat, g),
    fiber: typeof n.fiber === 'number' ? round1((n.fiber * g) / 100) : undefined,
    keywords: [...new Set([...String(row.search_aliases_ar ?? '').split(/[،,;|]/), ...String(row.search_aliases_en ?? '').split(/[،,;|]/), nameEn.toLowerCase()].map((s) => s.trim()).filter((s) => s && normalize(s) !== normalize(nameAr)))],
    generic: true,
    provenance: { class: sourceMatch === 'proxy' ? 'GENERIC_PROXY' : 'USDA_MEASURED', ref: `fdcId:${e.fdcId}` },
  }
  promoted.push({ item, provenance: { fdcId: e.fdcId, dataType: e.dataType, description: e.description, publicationDate: e.publicationDate, per100g: n, portion: portion.usda, portionGrams: g, preparation: row.preparation ?? null, sourceMatch, proxyNote, retrieved: evidence.generated_at } })
  resolution.push({ ...base, status: 'VERIFIED_AND_LOGGABLE', itemId: item.id, fdcId: e.fdcId, description: e.description, sourceMatch, proxyNote })
}

// PROMOTE — الملف المولَّد
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const lines = [
  '// ⚠️ ملف مولَّد — لا يُحرَّر يدويًّا. [FOOD-GENERIC-001]',
  '// المصدر: USDA FoodData Central (ملك عامّ) عبر data/food-production/generic/usda-evidence.json،',
  '// والمولِّد scripts/food-production/promote-generic.mjs. كل صنف يحمل fdcId في GENERIC_PROVENANCE.',
  "import type { FoodItem } from './foodItems'",
  '',
  'export interface GenericProvenance { fdcId: number; dataType: string; description: string; per100g: { kcal: number; protein: number; carbs: number; fat: number; fiber: number | null }; portion: string | null; portionGrams: number; preparation: string | null; sourceMatch: "exact" | "proxy"; proxyNote: string | null }',
  '',
  'export const genericFoods: FoodItem[] = [',
]
for (const { item } of promoted) {
  const kw = item.keywords.map((k) => `'${esc(k)}'`).join(', ')
  lines.push(`  { id: '${item.id}', nameAr: '${esc(item.nameAr)}', nameEn: '${esc(item.nameEn)}', category: '${item.category}', servingLabelAr: '${esc(item.servingLabelAr)}', servingGrams: ${item.servingGrams}, calories: ${item.calories}, protein: ${item.protein}, carbs: ${item.carbs}, fat: ${item.fat}${item.fiber !== undefined ? `, fiber: ${item.fiber}` : ''}, keywords: [${kw}], generic: true, provenance: { class: '${item.provenance.class}', ref: '${item.provenance.ref}' } },`)
}
lines.push(']', '')
lines.push('/** أصناف منسَّقة قائمة غطّت صفًّا من الـ٦٠٠ (نفس الاسم) — تُعامَل كأصناف عامّة في الترتيب بلا تكرار. */')
lines.push(`export const GENERIC_COVERED_IDS: ReadonlySet<string> = new Set([${[...new Set(resolution.filter((r) => r.status === 'EXISTING_COVERAGE' && r.via === 'name').map((r) => r.by))].map((id) => `'${esc(id)}'`).join(', ')}])`, '')
lines.push('/** كلمات بحث من صفوف الـ٦٠٠ المغطّاة تُضاف إلى الصنف اليدوي الذي يغطّيها. */')
lines.push('export const GENERIC_COVERED_KEYWORDS: Record<string, readonly string[]> = {')
for (const [id, kws] of coveredKeywords) lines.push(`  '${esc(id)}': [${kws.map((k) => `'${esc(k)}'`).join(', ')}],`)
lines.push('}', '')
lines.push('export const GENERIC_PROVENANCE: Record<string, GenericProvenance> = {')
for (const { item, provenance: p } of promoted) {
  lines.push(`  '${item.id}': { fdcId: ${p.fdcId}, dataType: '${esc(p.dataType)}', description: '${esc(p.description)}', per100g: { kcal: ${p.per100g.kcal}, protein: ${p.per100g.protein}, carbs: ${p.per100g.carbs}, fat: ${p.per100g.fat}, fiber: ${typeof p.per100g.fiber === 'number' ? p.per100g.fiber : 'null'} }, portion: ${p.portion ? `'${esc(p.portion)}'` : 'null'}, portionGrams: ${p.portionGrams}, preparation: ${p.preparation ? `'${esc(p.preparation)}'` : 'null'}, sourceMatch: '${p.sourceMatch}', proxyNote: ${p.proxyNote ? `'${esc(p.proxyNote)}'` : 'null'} },`)
}
lines.push('}', '')
writeFileSync(resolve(ROOT, 'src/data/genericFoods.generated.ts'), lines.join('\n'))

mkdirSync(resolve(ROOT, 'data/food-production/generic'), { recursive: true })
const counts = resolution.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})
counts.proxy_of_verified = resolution.filter((r) => r.status === 'VERIFIED_AND_LOGGABLE' && r.sourceMatch === 'proxy').length
counts.recipe_loggable_via_curated = resolution.filter((r) => r.status === 'RECIPE_BASED' && r.loggableVia).length
writeFileSync(resolve(ROOT, 'data/food-production/generic/resolution.json'), JSON.stringify({ generated_at: evidence.generated_at, counts, rows: resolution }, null, 1) + '\n')
console.log(JSON.stringify(counts), `· promoted ${promoted.length} · total ${resolution.length}`)
