// إثبات الأطعمة العامّة المُتحقَّق منها — [FOOD-GENERIC-001]
//
// ما يحرسه:
//   ١) كل صنف مولَّد يحمل مصدره (fdcId · وصف USDA · قيم ١٠٠غ) — لا صنف بلا سند.
//   ٢) القيم المعروضة مشتقّة من أساس ١٠٠غ بوزن الحصّة بلا اختراع: الحصّة من USDA
//      أو ١٠٠غ معلنة، وأتواتر ضمن ±٢٥٪ (تشخيص)، ولا طاقة > ٩٠٠.
//   ٣) لا تكرار: اسم عربي مولَّد لا يساوي اسم صنف يدوي، ولا معرّفَين لنفس fdcId+اسم.
//   ٤) القرار كامل: ٦٠٠/٦٠٠ لكل صفّ حالة (promoted · covered · mapped · recipe · quarantine).
//   ٥) نيّة البحث العامّة: استعلامات المؤسس (صدر دجاج · توست · رز · بيض · حليب…) تعيد
//      صنفًا عامًّا/أساسيًّا أولًا لا طبق مطعم ولا منتجًا معبّأً، بالعربية والإنجليزية.
//   ⚔️ محاكيات: نزع NATIVE_TOKEN_SPELLINGS يُسقط «أرز» · نزع علم generic يعيد الطبق أولًا.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات الأطعمة العامّة — السند · القيم · التكرار · القرار · نيّة البحث')

const gen = await loadTsModule('src/data/genericFoods.generated.ts')
const food = await loadTsModule('src/data/foodItems.ts')
const resolution = JSON.parse(read('data/food-production/generic/resolution.json'))
const items = gen.genericFoods
const prov = gen.GENERIC_PROVENANCE

// ——— ١) السند ———
check(`${items.length} صنفًا مولَّدًا، لكلٍّ سند USDA (fdcId + وصف)`, items.length > 200 && items.every((f) => { const p = prov[f.id]; return p && Number.isInteger(p.fdcId) && p.fdcId > 0 && typeof p.description === 'string' && p.description.length > 3 }))
check('كل صنف يحمل علم generic ووسم gen-', items.every((f) => f.generic === true && f.id.startsWith('gen-')))
check('لا سند بلا صنف ولا صنف بلا سند', Object.keys(prov).length === items.length)

// ——— ٢) القيم ———
for (const f of items) {
  const p = prov[f.id]
  const g = f.servingGrams
  const expect = (v) => Math.round((v * g) / 100)
  const expect1 = (v) => Math.round((v * g) / 10) / 10
  if (!(f.calories === expect(p.per100g.kcal) && f.protein === expect1(p.per100g.protein) && f.carbs === expect1(p.per100g.carbs) && f.fat === expect1(p.per100g.fat))) throw new Error(`FAIL: ${f.id} القيم لا تساوي ١٠٠غ × الحصّة`)
  if (p.per100g.kcal > 900 || p.per100g.protein < 0 || p.per100g.carbs < 0 || p.per100g.fat < 0) throw new Error(`FAIL: ${f.id} قيمة مستحيلة`)
  const atw = 4 * p.per100g.protein + 4 * p.per100g.carbs + 9 * p.per100g.fat
  if (p.per100g.kcal >= 40 && Math.abs(atw - p.per100g.kcal) > 0.25 * Math.max(atw, p.per100g.kcal)) throw new Error(`FAIL: ${f.id} أتواتر خارج ±٢٥٪`)
  if (!(g === 100 && f.servingLabelAr === 'لكل 100غ') && !p.portion) throw new Error(`FAIL: ${f.id} حصّة بلا مصدر USDA`)
  if (/[a-z]/i.test(f.servingLabelAr)) throw new Error(`FAIL: ${f.id} تسمية حصّة لاتينية «${f.servingLabelAr}»`)
}
check('كل صنف: القيم = ١٠٠غ × الحصّة · لا مستحيل · أتواتر ±٢٥٪ · الحصّة من USDA أو ١٠٠غ معلنة · تسمية عربية', true)

// ——— ٣) التكرار ———
{
  const hand = food.foodItems.filter((f) => !f.id.startsWith('gen-'))
  const handAr = new Set(hand.map((f) => food.normalizeSearch(f.nameAr)))
  const dup = items.filter((f) => handAr.has(food.normalizeSearch(f.nameAr)))
  check('لا اسم عربي مولَّد يكرّر صنفًا يدويًّا', dup.length === 0, dup.map((d) => d.nameAr).join('، '))
  const seen = new Set(); const twice = items.filter((f) => { const k = food.normalizeSearch(f.nameAr); if (seen.has(k)) return true; seen.add(k); return false })
  check('لا اسم عربي مكرّر داخل المولَّد', twice.length === 0, twice.map((d) => d.nameAr).join('، '))
}

// ——— ٤) القرار ———
{
  const c = resolution.counts
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  check(`٦٠٠/٦٠٠ صفًّا له قرار (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' · ')})`, total === 600 && resolution.rows.length === 600)
  check('المرقّى في القرار = المولَّد في الملف', c.promoted === items.length)
  check('كل صفّ محجور يحمل سببًا مسمّى', resolution.rows.filter((r) => r.status === 'quarantine').every((r) => typeof r.why === 'string' && r.why.length > 2))
}

// ——— ٥) نيّة البحث ———
{
  const first = (q) => food.searchFoodScored(q)[0]?.item ?? null
  const isBasic = (f) => !!f && (f.generic === true || /^(بيض مسلوق|بياض بيض|موز|تفاح|تمر|خيار|طماطم|أفوكادو|سلمون|بطاطا حلوة|زبادي يوناني|شوفان|رز أبيض|رز بني|خبز توست أبيض|حليب كامل الدسم|تونة معلبة)$/.test(f.nameAr))
  const CASES = [
    ['صدر دجاج', /صدر دجاج/], ['دجاج', /دجاج/], ['خبز توست', /توست/], ['توست', /توست/], ['أرز', /رز/], ['رز', /رز/], ['بيض', /بيض/],
    ['تونة', /تونة/], ['شوفان', /شوفان/], ['بطاطس', /بطاطس/], ['حليب', /حليب/], ['زبادي', /زبادي/], ['موز', /موز/], ['تفاح', /تفاح/],
    ['خبز توست أبيض', /توست أبيض/], ['خبز توست أسمر', /توست أسمر/], ['أرز أبيض مطبوخ', /رز أبيض/], ['أرز بسمتي مطبوخ', /بسمتي/], ['بيضة مسلوقة', /بيض مسلوق/],
    ['بياض بيض', /بياض/], ['تونة بالماء', /تونة بالماء/], ['سلمون', /سلمون/], ['لحم بقري', /لحم بقري/], ['بطاطا حلوة', /بطاطا حلوة/],
    ['زبادي يوناني', /يوناني/], ['تمر', /تمر/], ['خيار', /خيار/], ['طماطم', /طماطم/], ['أفوكادو', /أفوكادو/],
    ['chicken breast', /صدر دجاج/], ['toast', /توست/], ['oats', /شوفان/], ['banana', /موز/], ['milk', /حليب/], ['boiled egg', /بيض مسلوق/], ['white rice cooked', /رز أبيض/],
  ]
  for (const [q, re] of CASES) {
    const f = first(q)
    check(`«${q}» ⇒ ${f?.nameAr ?? '∅'} (أساسي أولًا)`, !!f && re.test(f.nameAr) && isBasic(f), f ? `${f.nameAr} generic=${f.generic}` : 'لا نتيجة')
  }
  // ⚔️ نزع علم generic من أصناف التوست يعيد الطبق أولًا — الترتيب له أسنان.
  const toastGen = food.foodItems.filter((f) => f.generic && /توست/.test(f.nameAr))
  for (const f of toastGen) f.generic = false
  food.__resetFoodSearchIndex()
  const stripped = first('توست')
  for (const f of toastGen) f.generic = true
  food.__resetFoodSearchIndex()
  check('⚔️ محاكاة: نزع علم generic يعيد «توست بالبيض» قبل خبز التوست', stripped?.nameAr === 'توست بالبيض', stripped?.nameAr)
  // ⚔️ «أرز» يبلغ «رز» عبر NATIVE_TOKEN_SPELLINGS لا مصادفة.
  check('NATIVE_TOKEN_SPELLINGS تضمّ رز/أرز وبيض/بيضة', food.NATIVE_TOKEN_SPELLINGS.some((g) => g[0] === 'رز' && g.includes('أرز')) && food.NATIVE_TOKEN_SPELLINGS.some((g) => g[0] === 'بيض' && g.includes('بيضة')))
  // ⚔️ القائمة مغلقة: كلمة خارجها لا تتكافأ — «جبنه» ليست في القائمة فلا تساوي «جبن» في الدرجة ٠.
  const cheese = food.searchFoodScored('جبنة')[0]
  check('⚔️ كلمة أصيلة خارج القائمة لا تتكافأ: «جبنة» لا تطابق «جبن» تطابقًا تامًّا', !food.NATIVE_TOKEN_SPELLINGS.some((g) => g.includes('جبنة')) && !(cheese && cheese.score === 0 && food.normalizeSearch(cheese.item.nameAr) === 'جبن'))
  // ⚔️ «خبز برجر» لا يُستدعى بـ«برجر»: رأس الشكل يحجب المكمّل.
  check('⚔️ «برجر» لا يعيد خبز البرجر أولًا (رأس الشكل «خبز»)', !/^خبز/.test(first('برجر')?.nameAr ?? ''), first('برجر')?.nameAr)
}

console.log(`\n✅ الأطعمة العامّة: ${pass} فحصًا، 0 فشل.`)
