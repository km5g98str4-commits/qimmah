#!/usr/bin/env node
/**
 * مرقّي الأفران والوجبات الجاهزة — [BAKERY-READY-001]
 *
 * نفس عقد promote-generic: الخريطة docs/data-factory/bakery/USDA-MAP.json (أسماء + استعلام
 * + proxy/quarantine) والدليل data/food-production/bakery/usda-evidence.json (يجلبه CI من
 * USDA FoodData Central). القيم تُنسخ لكل ١٠٠غ كما هي، والحصّة من foodPortions أو ١٠٠غ
 * معلنة. الوكيل (سجلّ أوسع) مُعلَن بملاحظة؛ الغائب محجور باسمه؛ لا رقم يُخترع.
 *
 * المخرج: src/data/bakeryFoods.generated.ts + data/food-production/bakery/resolution.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
const map = read('docs/data-factory/bakery/USDA-MAP.json')
const evidence = read('data/food-production/bakery/usda-evidence.json')
const ev = Object.fromEntries(evidence.results.map((r) => [r.id, r]))

// الحصّة: قطعة/شريحة/حبة/كوب/وجبة من USDA؛ وإلا ١٠٠غ معلنة.
const PORTION_RULES = [
  { pick: /^(piece|slice|croissant|muffin|roll|danish|pastry|pie|quiche|calzone|samosa|turnover|patty|stick|burrito|egg roll|spring roll|bun|naan|pita|flatbread|breadstick|serving|meal|entree|package|cup|bowl|sandwich|pocket|nugget|meatball|kabob|skewer)s?(\s|$|,)/i, ar: (u) => (/cup|bowl/i.test(u) ? 'كوب' : /meal|entree|package|serving/i.test(u) ? 'وجبة' : /slice/i.test(u) ? 'شريحة' : /nugget|meatball|stick/i.test(u) ? 'قطعة' : 'حبة') },
]
function choosePortion(portions) {
  for (const p of portions) {
    const u = String(p.modifier ?? p.unit ?? p.description ?? '').trim()
    if (!u || !(p.grams >= 8 && p.grams <= 600)) continue
    for (const rule of PORTION_RULES) if (rule.pick.test(u)) {
      const n = typeof p.amount === 'number' && p.amount > 0 ? p.amount : 1
      const label = `${rule.ar(u)}${n !== 1 ? ` ×${n}` : ''} (${Math.round(p.grams)}غ)`
      return { grams: Math.round(p.grams), labelAr: label, usda: `${p.amount ?? 1} ${u}` }
    }
  }
  return { grams: 100, labelAr: 'لكل 100غ', usda: null }
}
const per = (v, g) => (typeof v === 'number' ? Math.round((v * g) / 100) : 0)
const per1 = (v, g) => (typeof v === 'number' ? Math.round((v * g) / 10) / 10 : 0)

const items = []
const prov = {}
const resolution = []
for (const row of map.rows) {
  const e = ev[row.id]
  const base = { id: row.id, nameAr: row.nameAr, nameEn: row.nameEn, category: row.category }
  if (row.resolve === 'quarantine' || !e) { resolution.push({ ...base, status: 'QUARANTINED', why: row.why ?? 'بلا دليل' }); continue }
  if (e.status !== 'matched') { resolution.push({ ...base, status: 'QUARANTINED', why: `USDA ${e.status}`, candidates: (e.candidates ?? []).map((c) => c.description) }); continue }
  const n = e.per100g
  const problems = []
  if (![n.kcal, n.protein, n.carbs, n.fat].every((v) => typeof v === 'number' && v >= 0)) problems.push('missing_macros')
  if (n.kcal > 900) problems.push('energy_density_impossible')
  if (n.protein + n.carbs + n.fat > 105) problems.push('macro_sum_exceeds_mass')
  const atw = 4 * n.protein + 4 * n.carbs + 9 * n.fat
  if (n.kcal >= 40 && Math.abs(atw - n.kcal) > 0.25 * Math.max(atw, n.kcal)) problems.push('atwater_mismatch')
  if (problems.length) { resolution.push({ ...base, status: 'QUARANTINED', why: problems.join(','), fdcId: e.fdcId }); continue }
  const portion = choosePortion(e.portions ?? [])
  const g = portion.grams
  const sourceMatch = row.proxy ? 'proxy' : 'exact'
  const id = `bk-${row.id.toLowerCase()}`
  items.push({
    id, nameAr: row.nameAr, nameEn: row.nameEn, category: row.category, servingLabelAr: portion.labelAr, servingGrams: g,
    calories: per(n.kcal, g), protein: per1(n.protein, g), carbs: per1(n.carbs, g), fat: per1(n.fat, g),
    fiber: typeof n.fiber === 'number' ? Math.round((n.fiber * g) / 10) / 10 : undefined,
    keywords: [...new Set([...(row.keywords ?? []), row.nameEn.toLowerCase()])],
  })
  prov[id] = { fdcId: e.fdcId, dataType: e.dataType, description: e.description, per100g: n, portion: portion.usda, portionGrams: g, sourceMatch, proxyNote: row.proxy ?? null }
  resolution.push({ ...base, status: 'VERIFIED_AND_LOGGABLE', itemId: id, fdcId: e.fdcId, description: e.description, sourceMatch, proxyNote: row.proxy ?? null })
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const lines = [
  '// ⚠️ ملف مولَّد — لا يُحرَّر يدويًّا. [BAKERY-READY-001]',
  '// المصدر: USDA FoodData Central عبر data/food-production/bakery/usda-evidence.json، والمولِّد promote-bakery.mjs.',
  "import type { FoodItem } from './foodItems'",
  "import type { GenericProvenance } from './genericFoods.generated'",
  '',
  'export const bakeryFoods: FoodItem[] = [',
]
for (const f of items) lines.push(`  { id: '${f.id}', nameAr: '${esc(f.nameAr)}', nameEn: '${esc(f.nameEn)}', category: '${f.category}', servingLabelAr: '${esc(f.servingLabelAr)}', servingGrams: ${f.servingGrams}, calories: ${f.calories}, protein: ${f.protein}, carbs: ${f.carbs}, fat: ${f.fat}${f.fiber !== undefined ? `, fiber: ${f.fiber}` : ''}, keywords: [${f.keywords.map((k) => `'${esc(k)}'`).join(', ')}] },`)
lines.push(']', '', 'export const BAKERY_PROVENANCE: Record<string, GenericProvenance> = {')
for (const [id, p] of Object.entries(prov)) lines.push(`  '${id}': { fdcId: ${p.fdcId}, dataType: '${esc(p.dataType)}', description: '${esc(p.description)}', per100g: { kcal: ${p.per100g.kcal}, protein: ${p.per100g.protein}, carbs: ${p.per100g.carbs}, fat: ${p.per100g.fat}, fiber: ${typeof p.per100g.fiber === 'number' ? p.per100g.fiber : 'null'} }, portion: ${p.portion ? `'${esc(p.portion)}'` : 'null'}, portionGrams: ${p.portionGrams}, preparation: null, sourceMatch: '${p.sourceMatch}', proxyNote: ${p.proxyNote ? `'${esc(p.proxyNote)}'` : 'null'} },`)
lines.push('}', '')
writeFileSync(resolve(ROOT, 'src/data/bakeryFoods.generated.ts'), lines.join('\n'))
mkdirSync(resolve(ROOT, 'data/food-production/bakery'), { recursive: true })
const counts = resolution.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})
counts.proxy_of_verified = resolution.filter((r) => r.sourceMatch === 'proxy').length
writeFileSync(resolve(ROOT, 'data/food-production/bakery/resolution.json'), JSON.stringify({ generated_at: evidence.generated_at, counts, rows: resolution }, null, 1) + '\n')
console.log(JSON.stringify(counts), `· ${items.length} صنفًا`)
