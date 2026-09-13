// إثبات قوائم المطاعم — [RESTAURANT-MENUS-001]
//
// ما يحرسه:
//   ١) كل صنف مطعم مولَّد يحمل مصدره: رابط رسمي · نوع · سوق · تاريخ اطّلاع، وسعراته رسمية دائمًا.
//   ٢) الماكروز: رسمية كاملة (أتواتر ±٣٠٪ من السعرات الرسمية) أو تقدير **موسوم** يظهر للمستخدم في
//      notesAr — لا صنف بماكروز تقديرية بلا وسم، ولا صنف من سوق أجنبي بلا وسم السوق.
//   ٣) التقدير يعيد بناء السعرات الرسمية: 4P + 4C + 9F ≈ kcal (±٢٪) — المنهج معلَن لا اعتباطي.
//   ٤) لا اسم مولَّد يكرّر صنفًا يدويًّا، ولا معرّف مكرّر، وكل سلسلة تصل بالبحث باسمها.
//   ⚔️ محاكاة: صنف تقديري بلا وسم في notesAr يسقط بفحص مسمّى.

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
console.log('\nإثبات قوائم المطاعم — المصدر · الوسم · المنهج · التكرار · البحث')

const gen = await loadTsModule('src/data/restaurantFoods.generated.ts')
const food = await loadTsModule('src/data/foodItems.ts')
const resolution = JSON.parse(readFileSync(resolve(root, 'data/food-production/restaurants/resolution.json'), 'utf8'))
const items = gen.restaurantFoods
const prov = gen.RESTAURANT_PROVENANCE

check(`${items.length} صنفًا (≥ ٣٠)، لكلٍّ مصدر رسمي (رابط https · نوع · سوق · تاريخ)`, items.length >= 30 && items.every((f) => { const p = prov[f.id]; return p && /^https:\/\//.test(p.source) && p.kind && p.market && /^\d{4}-\d{2}-\d{2}$/.test(p.accessed) && p.kcal === 'official' }))
check('لا مصدر بلا صنف ولا صنف بلا مصدر', Object.keys(prov).length === items.length)

const tagged = (f) => {
  const p = prov[f.id]
  if (p.market !== 'SA' && !/الوصفة السعودية قد تختلف/.test(f.notesAr ?? '')) return false
  if (p.macros === 'official') return true
  return /تقدير/.test(f.notesAr ?? '')
}
check('كل تقدير موسوم في notesAr، وكل سوق أجنبي موسوم', items.every(tagged))
for (const f of items) {
  const atw = 4 * f.protein + 4 * f.carbs + 9 * f.fat
  const p = prov[f.id]
  const tol = p.macros === 'official' ? 0.3 : 0.02
  if (f.calories >= 40 && Math.abs(atw - f.calories) > tol * Math.max(atw, f.calories)) throw new Error(`FAIL: ${f.id} 4P+4C+9F=${Math.round(atw)} مقابل ${f.calories} (${p.macros})`)
}
check('الماكروز تعيد بناء السعرات الرسمية (رسمي ±٣٠٪ · تقدير ±٢٪)', true)
{
  const ids = new Set(); const dupId = items.filter((f) => ids.has(f.id) || !ids.add(f.id))
  check('لا معرّف مكرّر', dupId.length === 0)
  const hand = food.foodItems.filter((f) => !/^(gen|bakery|rst)-/.test(f.id))
  const handAr = new Set(hand.map((f) => food.normalizeSearch(f.nameAr)))
  const dup = items.filter((f) => handAr.has(food.normalizeSearch(f.nameAr)))
  check('لا اسم عربي مولَّد يكرّر صنفًا يدويًّا', dup.length === 0, dup.map((d) => d.nameAr).join('، '))
  check('كل صنف في فئة «مطاعم» واسمه يبدأ باسم السلسلة', items.every((f) => f.category === 'مطاعم' && f.nameAr.includes(' - ')))
}
{
  const chains = [...new Set(items.map((f) => prov[f.id].chain))]
  for (const c of chains) {
    const sample = items.find((f) => prov[f.id].chain === c)
    const chainAr = sample.nameAr.split(' - ')[0]
    const top = food.searchFoodScored(chainAr).slice(0, 10).map((r) => r.item)
    check(`«${chainAr}» يعيد أصناف السلسلة ضمن أول ١٠ (${items.filter((f) => prov[f.id].chain === c).length} صنفًا)`, top.some((f) => prov[f.id]?.chain === c), top.map((f) => f.nameAr).join(' · '))
  }
  const c = resolution.counts
  check(`القرار: OFFICIAL_FULL ${c.OFFICIAL_FULL ?? 0} · OFFICIAL_KCAL_ESTIMATED_MACROS ${c.OFFICIAL_KCAL_ESTIMATED_MACROS ?? 0} · QUARANTINED ${c.QUARANTINED ?? 0}`, (c.OFFICIAL_FULL ?? 0) + (c.OFFICIAL_KCAL_ESTIMATED_MACROS ?? 0) === items.length)
}
// ⚔️ محاكاة: تقدير بلا وسم يُرفض.
{
  const est = items.find((f) => prov[f.id].macros !== 'official') ?? items[0]
  const forged = { ...est, notesAr: 'القيم من مصدر السلسلة الرسمي.' }
  check('⚔️ محاكاة: صنف تقديري بلا وسم «تقدير» يُرفض', prov[est.id].macros === 'official' || !tagged(forged))
}
console.log(`\n✅ قوائم المطاعم: ${pass} فحصًا، 0 فشل.`)
