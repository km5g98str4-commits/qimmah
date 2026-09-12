// قِمّة — بحث القيم الغذائية للأطعمة العامّة من USDA FoodData Central — [FOOD-GENERIC-001]
//
//   node scripts/food-production/research-usda.mjs --sr <sr_legacy.json> --fndds <fndds.json> [--foundation <foundation.json>]
//
// ═══ لماذا في CI ═══
// مضيفو USDA محجوبون في بيئة الوكلاء (CONNECT 000/403 مقيسة)، وعدّاء GitHub Actions
// شبكته مفتوحة (نفس منطق food-corpus.yml وchain-evidence.yml). فالتنزيل والمطابقة
// يجريان هناك، والدليل الناتج يُلتزم في `data/food-production/generic/usda-evidence.json`.
//
// ═══ العقد ═══
//   • المدخل خريطة `docs/data-factory/generic/USDA-MAP.json`: لكل صفّ من الـ٦٠٠ إمّا
//     `exact` (وصف USDA حرفيًّا) أو `q` (رموز يجب أن تظهر كلّها في الوصف) و`not`.
//   • المطابقة **تفرض وصفًا واحدًا**: تطابق حرفي، وإلا مرشّح واحد بعد التصفية؛
//     تعدّد المرشّحين ⇒ لا يُختار شيء، وتُكتب القائمة للمراجعة (لا تخمين).
//   • تُنسخ الطاقة (kcal) والبروتين والكارب والدهون والألياف والسكّر والصوديوم
//     **كما هي** من المصدر لكل ١٠٠غ، مع `fdcId` و`dataType` و`description` وتاريخ
//     النشر — لا تعديل ولا تقريب.
//   • حصص USDA (`foodPortions`) تُنسخ كلّها بوزنها؛ اختيار ما يُعرض قرار محلّي لاحق.
//   • لا قيمة تُخترع: صفٌّ بلا مطابقة يبقى بلا قيم ويُعلَن `unmatched`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const MAP = resolve(ROOT, 'docs/data-factory/generic/USDA-MAP.json')
const OUT = resolve(ROOT, 'data/food-production/generic/usda-evidence.json')

const NUTRIENT = { kcal: [1008], protein: [1003], carbs: [1005], fat: [1004], fiber: [1079], sugar: [2000, 1063], sodium: [1093], satFat: [1258] }

function loadDataset(path, dataType) {
  if (!path) return []
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const key = Object.keys(raw).find((k) => Array.isArray(raw[k])) ?? null
  const foods = key ? raw[key] : Array.isArray(raw) ? raw : []
  return foods.map((f) => ({ ...f, __dt: dataType, __desc: String(f.description ?? '').trim(), __norm: norm(String(f.description ?? '')) }))
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim()

function nutrients(f) {
  const out = {}
  const byId = new Map()
  for (const fn of f.foodNutrients ?? []) {
    const id = fn.nutrient?.id ?? fn.nutrientId
    const amount = typeof fn.amount === 'number' ? fn.amount : (typeof fn.value === 'number' ? fn.value : null)
    if (id && amount !== null && !byId.has(id)) byId.set(id, { amount, unit: fn.nutrient?.unitName ?? fn.unitName ?? null })
  }
  for (const [k, ids] of Object.entries(NUTRIENT)) {
    const hit = ids.map((i) => byId.get(i)).find(Boolean)
    out[k] = hit ? hit.amount : null
  }
  return out
}
function portions(f) {
  return (f.foodPortions ?? []).map((p) => ({
    grams: typeof p.gramWeight === 'number' ? p.gramWeight : null,
    amount: p.amount ?? null,
    unit: p.measureUnit?.name ?? p.measureUnit?.abbreviation ?? null,
    // FNDDS يضع الوصف المقروء في portionDescription والرمز في modifier — الوصف أولًا.
    modifier: p.portionDescription ?? p.modifier ?? null,
  })).filter((p) => p.grams && p.grams > 0)
}

const map = JSON.parse(readFileSync(MAP, 'utf8'))
const sets = [
  ['sr', loadDataset(argOf('--sr'), 'SR Legacy')],
  ['foundation', loadDataset(argOf('--foundation'), 'Foundation')],
  ['fndds', loadDataset(argOf('--fndds'), 'FNDDS')],
].filter(([, arr]) => arr.length)
console.log(sets.map(([n, a]) => `${n}: ${a.length.toLocaleString()} foods`).join(' · '))

const results = []
const stats = { matched: 0, exact: 0, single: 0, ambiguous: 0, unmatched: 0, skipped: 0 }
for (const row of map.rows) {
  if (!row.exact && !row.q) { results.push({ id: row.id, status: 'skipped', reason: row.resolve ?? 'no-query' }); stats.skipped++; continue }
  const prefer = row.prefer ?? ['sr', 'foundation', 'fndds']
  let chosen = null, how = null, candidates = []
  for (const dtName of prefer) {
    const set = sets.find(([n]) => n === dtName)?.[1] ?? []
    if (row.exact) {
      const ex = norm(row.exact)
      const hit = set.find((f) => f.__norm === ex)
      if (hit) { chosen = hit; how = 'exact'; break }
    }
    const query = row.q ?? (row.exact ? row.exact.replace(/[(),"]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !/^(and|or|with|without|the|of|to|as|in|from|includes|type|all)$/i.test(t)).slice(0, 5).join(' ') : null)
    if (query) {
      const need = norm(query).split(' ').filter(Boolean)
      const ban = (row.not ?? []).map((t) => norm(t))
      const c = set.filter((f) => need.every((t) => (` ${f.__norm} `).includes(` ${t} `)) && !ban.some((t) => (` ${f.__norm} `).includes(` ${t} `)))
      if (c.length === 1 && row.q) { chosen = c[0]; how = 'single'; break }
      if (c.length > 1) { candidates = c.slice(0, 8).map((f) => ({ fdcId: f.fdcId, dataType: f.__dt, description: f.__desc })); if (row.pick) { const p = c.find((f) => f.__norm === norm(row.pick)); if (p) { chosen = p; how = 'pick'; break } } }
    }
  }
  if (chosen) {
    const n = nutrients(chosen)
    results.push({
      id: row.id, status: 'matched', how,
      fdcId: chosen.fdcId, dataType: chosen.__dt, description: chosen.__desc,
      publicationDate: chosen.publicationDate ?? null, ndbNumber: chosen.ndbNumber ?? null, foodCode: chosen.foodCode ?? null,
      per100g: n, portions: portions(chosen),
    })
    stats.matched++; stats[how === 'exact' ? 'exact' : 'single']++
  } else if (candidates.length) {
    results.push({ id: row.id, status: 'ambiguous', candidates }); stats.ambiguous++
  } else {
    results.push({ id: row.id, status: 'unmatched' }); stats.unmatched++
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'USDA FoodData Central (SR Legacy 2018-04 · Foundation Foods · FNDDS 2021-2023) — public domain (CC0)',
  datasets: sets.map(([n, a]) => ({ name: n, foods: a.length })),
  stats, results,
}, null, 2) + '\n')
console.log(JSON.stringify(stats))
console.log(`→ ${OUT}`)
