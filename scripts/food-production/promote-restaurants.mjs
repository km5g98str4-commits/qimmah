#!/usr/bin/env node
/**
 * مرقّي قوائم المطاعم — [RESTAURANT-MENUS-001]
 *
 * ═══ المدخل ═══
 * docs/data-factory/restaurants/<chain>.json — لكل سلسلة: مصدر رسمي واحد مقروء فعلًا
 * (رابط + تاريخ + نوع + سوق) وأصنافه كما وردت فيه. يكتبه قارئ الدليل (موجة مُراجَعة)
 * من data/food-production/chain-evidence/<slug>/text.txt — لا مستورد آلي من الشبكة.
 *
 * ═══ قاعدة الصدق (الميثاق §5 · [PARTIAL-NUTRITION-001]) ═══
 *   • السعرات رسمية دائمًا. صنف بلا سعرات رسمية لا يُرقّى.
 *   • الماكروز: إن أعطاها المصدر كاملة ⇒ تُنسخ كما هي. وإن أعطى السعرات (والبروتين) فقط —
 *     كما تُلزم لائحة SFDA — فالكارب/الدهون **يبقيان غير معروفين** (الحقل غائب لا صفر ولا تقدير).
 *     القاعدة القانونية لا تحمل أي ماكرو مُشتقّ؛ التقدير شأن ميزات مُعلَنة لاحقًا لا شأن الكتالوج.
 *   • كل صنف يحمل provenance: OFFICIAL_LOCAL (SA) · OFFICIAL_FOREIGN_MARKET (دليل رسمي أجنبي)
 *     · USDA_MEASURED (سجلّ USDA للمنتج في أمريكا) — والإفصاح للمستخدم سطر واحد.
 *
 * المخرج: src/data/restaurantFoods.generated.ts + data/food-production/restaurants/resolution.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IN = resolve(ROOT, 'docs/data-factory/restaurants')

const KIND_CLASS = { 'official-menu-sfda': 'OFFICIAL_LOCAL', 'official-nutrition-guide': 'OFFICIAL_FOREIGN_MARKET', 'usda-branded-record': 'USDA_MEASURED' }
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
    if (typeof row.protein !== 'number' || row.protein < 0) { resolution.push({ ...base, status: 'QUARANTINED', why: 'لا بروتين رسمي' }); continue }
    if (full) {
      const atw = 4 * row.protein + 4 * row.carbs + 9 * row.fat
      if (row.kcal >= 40 && Math.abs(atw - row.kcal) > 0.3 * Math.max(atw, row.kcal)) { resolution.push({ ...base, status: 'QUARANTINED', why: `أتواتر خارج ±٣٠٪ (${Math.round(atw)} مقابل ${row.kcal})` }); continue }
    }
    const macros = full ? 'official' : 'partial'
    const cls = KIND_CLASS[source.kind]
    if (!cls) { resolution.push({ ...base, status: 'QUARANTINED', why: `نوع مصدر غير مصنَّف: ${source.kind}` }); continue }
    if (cls === 'OFFICIAL_LOCAL' && source.market !== 'SA') { resolution.push({ ...base, status: 'QUARANTINED', why: 'مصدر محلّي بسوق غير سعودي' }); continue }
    if (cls !== 'OFFICIAL_LOCAL' && source.market === 'SA') { resolution.push({ ...base, status: 'QUARANTINED', why: 'سجلّ أجنبي/USDA لا يُوسم سعوديًّا' }); continue }
    // الإفصاح للمستخدم سطر واحد (لا فقرة): الأجنبي «بيانات مرجعية»، والمحلّي الناقص يصرّح بالنقص.
    const notesAr = cls === 'OFFICIAL_LOCAL'
      ? (macros === 'official' ? 'القيم من مصدر السلسلة الرسمي.' : 'السعرات والبروتين من المنيو الرسمي · الكارب والدهون غير متوفّرة.')
      : cls === 'OFFICIAL_FOREIGN_MARKET' ? 'بيانات مرجعية للسوق الأمريكي.' : 'بيانات USDA مرجعية للسوق الأمريكي.'
    const provenance = { class: cls, market: source.market, ref: row.fdcId ? `fdcId:${row.fdcId}` : source.url }
    const item = {
      id, nameAr: `${chain.ar} - ${row.nameAr}`, nameEn: `${chain.en} - ${row.nameEn}`, category: 'مطاعم',
      servingLabelAr: row.servingLabelAr ?? 'حصة', ...(typeof row.servingGrams === 'number' ? { servingGrams: row.servingGrams } : {}),
      calories: Math.round(row.kcal), protein: row.protein, ...(full ? { carbs: row.carbs, fat: row.fat } : {}), ...(typeof row.fiber === 'number' ? { fiber: row.fiber } : {}),
      keywords: [...new Set([...(chain.keywords ?? []), ...(row.keywords ?? []), row.nameEn.toLowerCase()])], notesAr, provenance,
    }
    items.push(item)
    prov[id] = { chain: chain.slug, source: source.url, kind: source.kind, market: source.market, accessed: source.accessed, kcal: 'official', macros, class: cls, type: row.type ?? null, sourceName: row.sourceName ?? row.nameEn }
    resolution.push({ ...base, status: macros === 'official' ? 'OFFICIAL_FULL' : 'OFFICIAL_PARTIAL', macros, class: cls })
  }
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const lines = [
  '// ⚠️ ملف مولَّد — لا يُحرَّر يدويًّا. [RESTAURANT-MENUS-001]',
  '// المصدر: docs/data-factory/restaurants/*.json (مصادر السلاسل الرسمية المقروءة في CI)،',
  '// والمولِّد scripts/food-production/promote-restaurants.mjs. كل صنف يحمل مصدره في RESTAURANT_PROVENANCE.',
  "import type { FoodItem } from './foodItems'",
  '',
  "import type { ProvenanceClass } from './foodItems'",
  '',
  "export interface RestaurantProvenance { chain: string; source: string; kind: string; market: string; accessed: string; kcal: 'official'; macros: 'official' | 'partial'; class: ProvenanceClass; type: string | null; sourceName: string }",
  '',
  'export const restaurantFoods: FoodItem[] = [',
]
for (const f of items) {
  lines.push(`  { id: '${f.id}', nameAr: '${esc(f.nameAr)}', nameEn: '${esc(f.nameEn)}', category: 'مطاعم', servingLabelAr: '${esc(f.servingLabelAr)}', ${f.servingGrams ? `servingGrams: ${f.servingGrams}, ` : ''}calories: ${f.calories}, protein: ${f.protein}, ${typeof f.carbs === 'number' ? `carbs: ${f.carbs}, fat: ${f.fat}, ` : ''}${f.fiber !== undefined ? `fiber: ${f.fiber}, ` : ''}keywords: [${f.keywords.map((k) => `'${esc(k)}'`).join(', ')}], notesAr: '${esc(f.notesAr)}', provenance: { class: '${f.provenance.class}', market: '${esc(f.provenance.market)}', ref: '${esc(f.provenance.ref)}' } },`)
}
lines.push(']', '', 'export const RESTAURANT_PROVENANCE: Record<string, RestaurantProvenance> = {')
for (const [id, p] of Object.entries(prov)) lines.push(`  '${id}': { chain: '${esc(p.chain)}', source: '${esc(p.source)}', kind: '${esc(p.kind)}', market: '${esc(p.market)}', accessed: '${esc(p.accessed)}', kcal: 'official', macros: '${p.macros}', class: '${p.class}', type: ${p.type ? `'${esc(p.type)}'` : 'null'}, sourceName: '${esc(p.sourceName)}' },`)
lines.push('}', '')
writeFileSync(resolve(ROOT, 'src/data/restaurantFoods.generated.ts'), lines.join('\n'))
mkdirSync(resolve(ROOT, 'data/food-production/restaurants'), { recursive: true })
const counts = resolution.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})
const byChain = resolution.reduce((a, r) => ((a[r.chain] = (a[r.chain] ?? 0) + (r.status !== 'QUARANTINED' ? 1 : 0)), a), {})
writeFileSync(resolve(ROOT, 'data/food-production/restaurants/resolution.json'), JSON.stringify({ counts, byChain, rows: resolution }, null, 1) + '\n')
console.log(JSON.stringify(counts), JSON.stringify(byChain))
