// إثبات قوائم المطاعم — [RESTAURANT-MENUS-001] · [PARTIAL-NUTRITION-001]
//
// ما يحرسه:
//   ١) كل صنف مطعم مولَّد يحمل مصدره (رابط https · نوع · سوق · تاريخ) وسعراته وبروتينه رسميان.
//   ٢) **لا ماكرو مُشتقّ في القاعدة القانونية**: الكارب/الدهون إمّا من المصدر أو غائبان (undefined) —
//      لا صفر ولا تقدير. CANONICAL_ESTIMATED_MACROS = 0 بنيويًّا.
//   ٣) تصنيف المصدر إلزامي ومتّسق: OFFICIAL_LOCAL ⇔ سوق SA · OFFICIAL_FOREIGN_MARKET/USDA_MEASURED ⇔ سوق أجنبي —
//      لا سجلّ أجنبي أو USDA يتنكّر سعوديًّا، والإفصاح للمستخدم سطر واحد «بيانات … مرجعية للسوق الأمريكي».
//   ٤) لا اسم مولَّد يكرّر صنفًا يدويًّا، ولا معرّف مكرّر، وكل سلسلة تصل بالبحث باسمها.
//   ⚔️ محاكيات: صنف بكارب مُشتقّ (4P+4C+9F=kcal بلا مصدر) يُرفض · سجلّ أجنبي مصنَّف OFFICIAL_LOCAL يُرفض.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const root = resolve(import.meta.dirname, '..')
let pass = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
console.log('\nإثبات قوائم المطاعم — المصدر · لا تقدير · التصنيف · التكرار · البحث')

const gen = await loadTsModule('src/data/restaurantFoods.generated.ts')
const food = await loadTsModule('src/data/foodItems.ts')
const resolution = JSON.parse(readFileSync(resolve(root, 'data/food-production/restaurants/resolution.json'), 'utf8'))
const items = gen.restaurantFoods
const prov = gen.RESTAURANT_PROVENANCE
const FOREIGN = new Set(['OFFICIAL_FOREIGN_MARKET', 'USDA_MEASURED'])

check(`${items.length} صنفًا (≥ ٣٠)، لكلٍّ مصدر (رابط https · نوع · سوق · تاريخ) وسعرات وبروتين رسميان`, items.length >= 30 && items.every((f) => { const p = prov[f.id]; return p && /^https:\/\//.test(p.source) && p.kind && p.market && /^\d{4}-\d{2}-\d{2}$/.test(p.accessed) && p.kcal === 'official' && typeof f.calories === 'number' && typeof f.protein === 'number' }))
check('لا مصدر بلا صنف ولا صنف بلا مصدر', Object.keys(prov).length === items.length)

// ——— ٢) لا ماكرو مُشتقّ ———
const consistentWithSource = (f) => {
  const p = prov[f.id]
  if (p.macros === 'official') return typeof f.carbs === 'number' && typeof f.fat === 'number'
  return f.carbs === undefined && f.fat === undefined // جزئي ⇒ غائب، لا صفر ولا تقدير
}
check('كل صنف: الماكروز من المصدر كاملة، أو غائبة كليًّا (undefined) — لا صفر ولا اشتقاق', items.every(consistentWithSource))
const partial = items.filter((f) => prov[f.id].macros === 'partial')
check(`${partial.length} صنفًا جزئيًّا (شاورمر): بلا حقل carbs/fat، وملاحظته تصرّح «غير متوفّرة»`, partial.length > 0 && partial.every((f) => !('carbs' in f) && !('fat' in f) && /غير متوفّرة/.test(f.notesAr ?? '')))
check('لا كلمة «تقدير» في أي ملاحظة صنف مولَّد — التقدير خارج القاعدة القانونية', items.every((f) => !/تقدير/.test(f.notesAr ?? '')))
check('لا تعريف لحصّة كارب/دهون في المرقّي (CARB_SHARE أُزيل)', !/CARB_SHARE/.test(readFileSync(resolve(root, 'scripts/food-production/promote-restaurants.mjs'), 'utf8')))
for (const f of items) {
  if (prov[f.id].macros !== 'official') continue
  const atw = 4 * f.protein + 4 * f.carbs + 9 * f.fat
  if (f.calories >= 40 && Math.abs(atw - f.calories) > 0.3 * Math.max(atw, f.calories)) throw new Error(`FAIL: ${f.id} 4P+4C+9F=${Math.round(atw)} مقابل ${f.calories}`)
}
check('الماكروز الرسمية تتّسق مع السعرات الرسمية (±٣٠٪)', true)

// ——— ٣) التصنيف ———
const classOk = (f) => {
  const c = f.provenance?.class, m = f.provenance?.market
  if (!c || !m || c !== prov[f.id].class) return false
  if (c === 'OFFICIAL_LOCAL') return m === 'SA'
  if (FOREIGN.has(c)) return m !== 'SA'
  return false
}
check('كل صنف يحمل provenance.class ∈ {OFFICIAL_LOCAL · OFFICIAL_FOREIGN_MARKET · USDA_MEASURED} متّسقًا مع سوقه', items.every(classOk))
const foreign = items.filter((f) => FOREIGN.has(f.provenance.class))
check(`${foreign.length} صنفًا أجنبيًّا: إفصاح سطر واحد «بيانات … مرجعية للسوق الأمريكي» وسطح الإفصاح يعرضه`, foreign.every((f) => /^بيانات (USDA )?مرجعية للسوق الأمريكي\.$/.test(f.notesAr) && /مرجعية للسوق الأمريكي/.test(food.provenanceDisclosure(f.provenance, 'ar'))))
check('لا سجلّ أجنبي/USDA بسوق SA ولا محلّي بسوق أجنبي', !items.some((f) => (FOREIGN.has(f.provenance.class) && f.provenance.market === 'SA') || (f.provenance.class === 'OFFICIAL_LOCAL' && f.provenance.market !== 'SA')))
check('مطابق USDA يحمل مرجع fdcId', items.filter((f) => f.provenance.class === 'USDA_MEASURED').every((f) => /^fdcId:\d+$/.test(f.provenance.ref)))

// ——— ٤) التكرار والبحث ———
{
  const ids = new Set(); const dupId = items.filter((f) => ids.has(f.id) || !ids.add(f.id))
  check('لا معرّف مكرّر', dupId.length === 0)
  const hand = food.foodItems.filter((f) => !/^(gen|bakery|rst)-/.test(f.id))
  const handAr = new Set(hand.map((f) => food.normalizeSearch(f.nameAr)))
  const dup = items.filter((f) => handAr.has(food.normalizeSearch(f.nameAr)))
  check('لا اسم عربي مولَّد يكرّر صنفًا يدويًّا', dup.length === 0, dup.map((d) => d.nameAr).join('، '))
  check('كل صنف في فئة «مطاعم» واسمه يبدأ باسم السلسلة', items.every((f) => f.category === 'مطاعم' && f.nameAr.includes(' - ')))
  const chains = [...new Set(items.map((f) => prov[f.id].chain))]
  for (const c of chains) {
    const sample = items.find((f) => prov[f.id].chain === c)
    const chainAr = sample.nameAr.split(' - ')[0]
    const top = food.searchFoodScored(chainAr).slice(0, 10).map((r) => r.item)
    check(`«${chainAr}» يعيد أصناف السلسلة ضمن أول ١٠ (${items.filter((f) => prov[f.id].chain === c).length} صنفًا)`, top.some((f) => prov[f.id]?.chain === c), top.map((f) => f.nameAr).join(' · '))
  }
  const c = resolution.counts
  check(`القرار: OFFICIAL_FULL ${c.OFFICIAL_FULL ?? 0} · OFFICIAL_PARTIAL ${c.OFFICIAL_PARTIAL ?? 0} · QUARANTINED ${c.QUARANTINED ?? 0} · لا حالة تقدير`, (c.OFFICIAL_FULL ?? 0) + (c.OFFICIAL_PARTIAL ?? 0) === items.length && !Object.keys(c).some((k) => /ESTIMAT/.test(k)))
}

// ——— ⚔️ محاكيات ———
{
  const p0 = partial[0]
  const forgedMacros = { ...p0, carbs: Math.round(((p0.calories - 4 * p0.protein) * 0.55) / 4), fat: Math.round(((p0.calories - 4 * p0.protein) * 0.45) / 9) }
  check('⚔️ محاكاة: صنف جزئي حُقن بكارب/دهون مُشتقّة يُرفض', !consistentWithSource(forgedMacros))
  const f0 = foreign[0]
  const forgedClass = { ...f0, provenance: { ...f0.provenance, class: 'OFFICIAL_LOCAL', market: 'SA' } }
  check('⚔️ محاكاة: سجلّ أجنبي أُعيد تصنيفه محلّيًّا سعوديًّا يُرفض', !classOk(forgedClass))
}
console.log(`\n✅ قوائم المطاعم: ${pass} فحصًا، 0 فشل.`)
