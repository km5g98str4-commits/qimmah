// إثبات الأفران والوجبات الجاهزة — [BAKERY-READY-001]
//
// ما يحرسه:
//   ١) كل صنف مولَّد يحمل سند USDA (fdcId · وصف · قيم ١٠٠غ) — لا صنف بلا سند.
//   ٢) القيم = ١٠٠غ × الحصّة بلا اختراع؛ الحصّة من USDA أو ١٠٠غ معلنة؛ أتواتر ±٢٥٪؛ لا طاقة > ٩٠٠.
//   ٣) الفئتان الجديدتان ('أفران' · 'وجبات جاهزة') معرَّفتان بتسمية إنجليزية، وكل صنف في إحداهما.
//   ٤) القرار كامل لكل صفّ في الخريطة (VERIFIED_AND_LOGGABLE · QUARANTINED)، والمحجور بسبب مسمّى،
//      والوكيل مُعلَن بملاحظة، ولا اسم مولَّد يكرّر صنفًا يدويًّا.
//   ٥) البحث يبلغها: «مناقيش» · «كرواسون جبن» · «لازانيا» · «ناجتس» تعيد صنفًا من الفئتين ضمن أول ٥.
//   ⚔️ محاكاة: صنف بقيمة ١٠٠غ مخالفة للسند يسقط بفحص مسمّى.

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
console.log('\nإثبات الأفران والوجبات الجاهزة — السند · القيم · الفئات · القرار · البحث')

const gen = await loadTsModule('src/data/bakeryFoods.generated.ts')
const food = await loadTsModule('src/data/foodItems.ts')
const resolution = JSON.parse(readFileSync(resolve(root, 'data/food-production/bakery/resolution.json'), 'utf8'))
const map = JSON.parse(readFileSync(resolve(root, 'docs/data-factory/bakery/USDA-MAP.json'), 'utf8'))
const items = gen.bakeryFoods
const prov = gen.BAKERY_PROVENANCE

check(`${items.length} صنفًا مولَّدًا (≥ ٣٠)، لكلٍّ سند USDA`, items.length >= 30 && items.every((f) => { const p = prov[f.id]; return p && Number.isInteger(p.fdcId) && p.fdcId > 0 && p.description.length > 3 }))
check('لا سند بلا صنف ولا صنف بلا سند', Object.keys(prov).length === items.length)
const valuesOk = (f, p) => {
  const g = f.servingGrams
  const e = (v) => Math.round((v * g) / 100)
  const e1 = (v) => Math.round((v * g) / 10) / 10
  return f.calories === e(p.per100g.kcal) && f.protein === e1(p.per100g.protein) && f.carbs === e1(p.per100g.carbs) && f.fat === e1(p.per100g.fat)
}
for (const f of items) {
  const p = prov[f.id]
  if (!valuesOk(f, p)) throw new Error(`FAIL: ${f.id} القيم لا تساوي ١٠٠غ × الحصّة`)
  if (p.per100g.kcal > 900) throw new Error(`FAIL: ${f.id} طاقة مستحيلة`)
  const atw = 4 * p.per100g.protein + 4 * p.per100g.carbs + 9 * p.per100g.fat
  if (p.per100g.kcal >= 40 && Math.abs(atw - p.per100g.kcal) > 0.25 * Math.max(atw, p.per100g.kcal)) throw new Error(`FAIL: ${f.id} أتواتر خارج ±٢٥٪`)
  if (!(f.servingGrams === 100 && f.servingLabelAr === 'لكل 100غ') && !p.portion) throw new Error(`FAIL: ${f.id} حصّة بلا مصدر USDA`)
  if (/[a-z]/i.test(f.servingLabelAr)) throw new Error(`FAIL: ${f.id} تسمية حصّة لاتينية`)
}
check('كل صنف: القيم = ١٠٠غ × الحصّة · أتواتر ±٢٥٪ · الحصّة من USDA أو ١٠٠غ معلنة · تسمية عربية', true)
check("الفئتان 'أفران' و'وجبات جاهزة' معرَّفتان بالإنجليزية وكل صنف في إحداهما", food.foodCategoryEn['أفران'] === 'Bakeries' && food.foodCategoryEn['وجبات جاهزة'] === 'Ready meals' && items.every((f) => f.category === 'أفران' || f.category === 'وجبات جاهزة'))
{
  const c = resolution.counts
  check(`قرار لكل صفّ في الخريطة (${map.rows.length}): VERIFIED_AND_LOGGABLE ${c.VERIFIED_AND_LOGGABLE ?? 0} · QUARANTINED ${c.QUARANTINED ?? 0}`, (c.VERIFIED_AND_LOGGABLE ?? 0) + (c.QUARANTINED ?? 0) === map.rows.length && resolution.rows.length === map.rows.length)
  check('المُتحقَّق في القرار = المولَّد في الملف', c.VERIFIED_AND_LOGGABLE === items.length)
  check('كل محجور بسبب مسمّى', resolution.rows.filter((r) => r.status === 'QUARANTINED').every((r) => typeof r.why === 'string' && r.why.length > 2))
  check('الوكيل مُعلَن بملاحظة والمطابق بلا ملاحظة', items.every((f) => (prov[f.id].sourceMatch === 'exact' && prov[f.id].proxyNote === null) || (prov[f.id].sourceMatch === 'proxy' && prov[f.id].proxyNote.length > 5)))
  const hand = food.foodItems.filter((f) => !/^(gen|bakery|rst)-/.test(f.id))
  const handAr = new Set(hand.map((f) => food.normalizeSearch(f.nameAr)))
  const dup = items.filter((f) => handAr.has(food.normalizeSearch(f.nameAr)))
  check('لا اسم عربي مولَّد يكرّر صنفًا يدويًّا', dup.length === 0, dup.map((d) => d.nameAr).join('، '))
}
{
  const top5 = (q) => food.searchFoodScored(q).slice(0, 5).map((r) => r.item)
  for (const [q, cat] of [['مناقيش', 'أفران'], ['كرواسون جبن', 'أفران'], ['لازانيا', 'وجبات جاهزة'], ['ناجتس', 'وجبات جاهزة'], ['naan', 'أفران'], ['frozen pizza', 'وجبات جاهزة']]) {
    const hit = top5(q).find((f) => f.category === cat)
    check(`«${q}» يبلغ صنفًا من «${cat}» ضمن أول ٥`, !!hit, top5(q).map((f) => f.nameAr).join(' · '))
  }
}
// ⚔️ محاكاة: قيمة مزوّرة تسقط بفحص القيم المسمّى.
{
  const f = { ...items[0], calories: items[0].calories + 50 }
  check('⚔️ محاكاة: صنف بسعرات مخالفة للسند يُرفض', !valuesOk(f, prov[items[0].id]))
}
console.log(`\n✅ الأفران والوجبات الجاهزة: ${pass} فحصًا، 0 فشل.`)
