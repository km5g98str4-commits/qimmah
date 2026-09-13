#!/usr/bin/env node
/**
 * مرقّي قوائم المطاعم — [RESTAURANT-MENUS-001]
 *
 * ═══ المدخل ═══
 * docs/data-factory/restaurants/<chain>.json — لكل سلسلة: مصدر رسمي واحد مقروء فعلًا
 * (رابط + تاريخ + نوع + سوق) وأصنافه كما وردت فيه. يكتبه قارئ الدليل (موجة مُراجَعة)
 * من data/food-production/chain-evidence/<slug>/text.txt — لا مستورد آلي من الشبكة.
 *
 * ═══ قاعدة الصدق (الميثاق §5) ═══
 *   • السعرات رسمية دائمًا. صنف بلا سعرات رسمية لا يُرقّى.
 *   • الماكروز: إن أعطاها المصدر كاملة ⇒ رسمية (نمط الأدلة العالمية). وإن أعطى المصدر
 *     السعرات (والبروتين) فقط — وهو ما تُلزم به لائحة SFDA السعودية — فالناقص **تقدير
 *     موسوم** بطريقة معلَنة أدناه، لا رقم يُنسب للمصدر:
 *       بروتين رسمي إن وُجد؛ الباقي R = kcal − 4·P يُقسم طاقةً بين الكارب والدهون
 *       بحصّة كارب لنوع الصنف (ساندويتش/راب ٠٫٥٥ · بطاطس ٠٫٥٠ · صحن ٠٫٥٠ · سلطة ٠٫٤٥ ·
 *       حلويات ٠٫٦٥ · مشروب ١٫٠٠ · دجاج مقلي ٠٫٣٥ · بيتزا ٠٫٥٥ · برجر ٠٫٤٥).
 *     الوسم يظهر للمستخدم في notesAr ويُسجَّل في RESTAURANT_PROVENANCE.
 *   • الأدلة العالمية (US/UK) تُوسم بسوق المصدر: الوصفة السعودية قد تختلف.
 *
 * المخرج: src/data/restaurantFoods.generated.ts + data/food-production/restaurants/resolution.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IN = resolve(ROOT, 'docs/data-factory/restaurants')

export const CARB_SHARE = { sandwich: 0.55, wrap: 0.55, fries: 0.5, plate: 0.5, box: 0.5, salad: 0.45, dessert: 0.65, drink: 1.0, fried_chicken: 0.35, pizza: 0.55, burger: 0.45, side: 0.5, sauce: 0.3, soup: 0.5, breakfast: 0.5 }
const MARKET_AR = { SA: 'السعودية', US: 'أمريكا', UK: 'بريطانيا', UAE: 'الإمارات' }

const round1 = (n) => Math.round(n * 10) / 10
const files = readdirSync(IN).filter((f) => f.endsWith('.json')).sort()
const items = []
const prov = {}
const resolution = []
const seenIds = new Set()

for (const file of files) {
  const doc = JSON.parse(readFileSync(resolve(IN, file), 'utf8'))
  const { chain, source } = doc
  if (!chain?.ar || !chain?.en || !source?.url || !source?.accessed || !source?.kind || !source?.market) throw new Error(`${file}: chain/source ناقص`)
  for (const row of doc.items) {
    const id = `rst-${chain.slug}-${row.id}`
    if (seenIds.has(id)) throw new Error(`معرّف مكرّر ${id}`)
    seenIds.add(id)
    const base = { id, chain: chain.slug, nameAr: row.nameAr, nameEn: row.nameEn }
    if (typeof row.kcal !== 'number' || row.kcal <= 0) { resolution.push({ ...base, status: 'QUARANTINED', why: 'لا سعرات رسمية' }); continue }
    if (!row.nameAr || !row.nameEn) { resolution.push({ ...base, status: 'QUARANTINED', why: 'اسم ناقص' }); continue }
    const full = [row.protein, row.carbs, row.fat].every((v) => typeof v === 'number' && v >= 0)
    let protein, carbs, fat, macros
    if (full) {
      ;({ protein, carbs, fat } = row)
      macros = 'official'
      const atw = 4 * protein + 4 * carbs + 9 * fat
      if (row.kcal >= 40 && Math.abs(atw - row.kcal) > 0.3 * Math.max(atw, row.kcal)) { resolution.push({ ...base, status: 'QUARANTINED', why: `أتواتر خارج ±٣٠٪ (${Math.round(atw)} مقابل ${row.kcal})` }); continue }
    } else {
      const share = CARB_SHARE[row.type]
      if (share === undefined) { resolution.push({ ...base, status: 'QUARANTINED', why: `نوع غير معروف للتقدير: ${row.type}` }); continue }
      const pOfficial = typeof row.protein === 'number' && row.protein >= 0
      protein = pOfficial ? row.protein : null
      let R = row.kcal - (pOfficial ? 4 * row.protein : 0)
      if (R < 0) { resolution.push({ ...base, status: 'QUARANTINED', why: 'البروتين الرسمي يتجاوز طاقة الصنف' }); continue }
      if (!pOfficial) {
        // بلا بروتين رسمي: حصّة بروتين لنوع الصنف (طاقةً) ثم الباقي كارب/دهون.
        const pShare = row.type === 'fried_chicken' ? 0.3 : row.type === 'drink' || row.type === 'dessert' ? 0.05 : 0.2
        protein = round1((row.kcal * pShare) / 4)
        R = row.kcal - 4 * protein
      }
      carbs = round1((R * share) / 4)
      fat = round1((R * (1 - share)) / 9)
      macros = pOfficial ? 'partial-estimated' : 'estimated'
    }
    const marketAr = MARKET_AR[source.market] ?? source.market
    const notesAr = source.market === 'SA'
      ? (macros === 'official' ? 'القيم من مصدر السلسلة الرسمي.' : macros === 'partial-estimated' ? 'السعرات والبروتين من منيو السلسلة الرسمي · الكارب والدهون تقدير.' : 'السعرات من منيو السلسلة الرسمي · الماكروز تقدير.')
      : source.kind === 'usda-branded-record' ? `القيم من سجلّ USDA لمنتج السلسلة في ${marketAr} — الوصفة السعودية قد تختلف.` : `القيم من دليل التغذية الرسمي للسلسلة في ${marketAr} — الوصفة السعودية قد تختلف.`
    const item = {
      id, nameAr: `${chain.ar} - ${row.nameAr}`, nameEn: `${chain.en} - ${row.nameEn}`, category: 'مطاعم',
      servingLabelAr: row.servingLabelAr ?? 'حصة', ...(typeof row.servingGrams === 'number' ? { servingGrams: row.servingGrams } : {}),
      calories: Math.round(row.kcal), protein, carbs, fat, ...(typeof row.fiber === 'number' ? { fiber: row.fiber } : {}),
      keywords: [...new Set([...(chain.keywords ?? []), ...(row.keywords ?? []), row.nameEn.toLowerCase()])], notesAr,
    }
    items.push(item)
    prov[id] = { chain: chain.slug, source: source.url, kind: source.kind, market: source.market, accessed: source.accessed, kcal: 'official', macros, type: row.type ?? null, sourceName: row.sourceName ?? row.nameEn }
    resolution.push({ ...base, status: macros === 'official' ? 'OFFICIAL_FULL' : 'OFFICIAL_KCAL_ESTIMATED_MACROS', macros })
  }
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const lines = [
  '// ⚠️ ملف مولَّد — لا يُحرَّر يدويًّا. [RESTAURANT-MENUS-001]',
  '// المصدر: docs/data-factory/restaurants/*.json (مصادر السلاسل الرسمية المقروءة في CI)،',
  '// والمولِّد scripts/food-production/promote-restaurants.mjs. كل صنف يحمل مصدره في RESTAURANT_PROVENANCE.',
  "import type { FoodItem } from './foodItems'",
  '',
  "export interface RestaurantProvenance { chain: string; source: string; kind: string; market: string; accessed: string; kcal: 'official'; macros: 'official' | 'partial-estimated' | 'estimated'; type: string | null; sourceName: string }",
  '',
  'export const restaurantFoods: FoodItem[] = [',
]
for (const f of items) {
  lines.push(`  { id: '${f.id}', nameAr: '${esc(f.nameAr)}', nameEn: '${esc(f.nameEn)}', category: 'مطاعم', servingLabelAr: '${esc(f.servingLabelAr)}', ${f.servingGrams ? `servingGrams: ${f.servingGrams}, ` : ''}calories: ${f.calories}, protein: ${f.protein}, carbs: ${f.carbs}, fat: ${f.fat}, ${f.fiber !== undefined ? `fiber: ${f.fiber}, ` : ''}keywords: [${f.keywords.map((k) => `'${esc(k)}'`).join(', ')}], notesAr: '${esc(f.notesAr)}' },`)
}
lines.push(']', '', 'export const RESTAURANT_PROVENANCE: Record<string, RestaurantProvenance> = {')
for (const [id, p] of Object.entries(prov)) lines.push(`  '${id}': { chain: '${esc(p.chain)}', source: '${esc(p.source)}', kind: '${esc(p.kind)}', market: '${esc(p.market)}', accessed: '${esc(p.accessed)}', kcal: 'official', macros: '${p.macros}', type: ${p.type ? `'${esc(p.type)}'` : 'null'}, sourceName: '${esc(p.sourceName)}' },`)
lines.push('}', '')
writeFileSync(resolve(ROOT, 'src/data/restaurantFoods.generated.ts'), lines.join('\n'))
mkdirSync(resolve(ROOT, 'data/food-production/restaurants'), { recursive: true })
const counts = resolution.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})
const byChain = resolution.reduce((a, r) => ((a[r.chain] = (a[r.chain] ?? 0) + (r.status !== 'QUARANTINED' ? 1 : 0)), a), {})
writeFileSync(resolve(ROOT, 'data/food-production/restaurants/resolution.json'), JSON.stringify({ counts, byChain, rows: resolution }, null, 1) + '\n')
console.log(JSON.stringify(counts), JSON.stringify(byChain))
