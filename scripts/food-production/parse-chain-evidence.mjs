#!/usr/bin/env node
/**
 * قارئ أدلة السلاسل — [RESTAURANT-MENUS-001]
 *
 * يحوّل text.txt المُلتقط في CI (data/food-production/chain-evidence/<slug>/) إلى ملف مصدر
 * مُراجَع في docs/data-factory/restaurants/<chain>.json. كل قارئ مخصّص لبنية مصدره؛ ما لا
 * يُقرأ بنمط ثابت لا يُخمَّن. الملف الناتج يُراجَع بالعين قبل الالتزام (الأسماء العربية · الحصص).
 *
 *   node scripts/food-production/parse-chain-evidence.mjs shawarmer
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const EV = (slug, file = 'text.txt') => {
  const p = resolve(ROOT, 'data/food-production/chain-evidence', slug, file)
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}
const stripHtml = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
const textOf = (slug) => EV(slug) ?? (EV(slug, 'rendered.html') ? stripHtml(EV(slug, 'rendered.html')) : null)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const PARSERS = {
  // شاورمر: المنيو الرسمي يعرض لكل صنف «Protein / N g / M kcal / وصف / SR / سعر».
  // الأسماء العربية من الصفحة العربية بنفس البنية، تُحاذى بثلاثية (kcal · protein · سعر).
  shawarmer() {
    const parse = (txt) => {
      const L = txt.split('\n')
      const out = []
      for (let i = 0; i < L.length; i++) {
        if (!/^(Protein|البروتين|بروتين)$/i.test(L[i])) continue
        const p = L[i + 1]?.match(/^(\d+)\s*(g|غ|جم|جرام|غرام)$/i)
        const k = L[i + 2]?.match(/^(\d+)\s*(kcal|سعرة|سعره|كالوري)/i)
        if (!p || !k) continue
        const name = L[i - 1]
        let j = i + 3; let desc = ''; let price = null
        while (j < L.length && j < i + 8) { if (/^(SR|ر\.س|ريال)$/i.test(L[j])) { price = Number(L[j + 1]?.replace(/[^\d.]/g, '')) || null; break } desc += (desc ? ' ' : '') + L[j]; j++ }
        out.push({ name, protein: Number(p[1]), kcal: Number(k[1]), desc, price })
      }
      return out
    }
    const en = parse(textOf('shawarmer-menu') ?? '')
    const ar = parse(textOf('shawarmer-menu-ar') ?? '')
    const key = (r) => `${r.kcal}|${r.protein}|${r.price}`
    const arByKey = new Map(ar.map((r) => [key(r), r]))
    const seen = new Set()
    const items = []
    for (const r of en) {
      const k = key(r)
      if (seen.has(k)) continue
      seen.add(k)
      const a = arByKey.get(k)
      const lower = r.desc.toLowerCase()
      const type = /gathering|box|platter|sahen/i.test(r.name) || /box|platter/.test(lower) ? 'box' : /salad/i.test(r.name) ? 'salad' : /fries|potato/i.test(r.name) ? 'fries' : /nachos|bites|balls|sticks/i.test(r.name) ? 'side' : /drink|juice|soda|water/i.test(r.name) ? 'drink' : /dessert|cake|cookie|kunafa|brownie/i.test(r.name) ? 'dessert' : 'wrap'
      items.push({ id: slugify(r.name), nameAr: a?.name ?? null, nameEn: r.name, sourceName: r.name, kcal: r.kcal, protein: r.protein, type, servingLabelAr: type === 'box' ? 'بوكس' : type === 'salad' ? 'صحن' : type === 'drink' ? 'كوب' : 'حبة', keywords: [], descEn: r.desc, priceSar: r.price })
    }
    return {
      chain: { slug: 'shawarmer', ar: 'شاورمر', en: 'Shawarmer', keywords: ['shawarmer', 'شورمر', 'شاورمر'] },
      source: { url: 'https://shawarmer.com/en/menu/83', urlAr: 'https://shawarmer.com/ar/menu/83', kind: 'official-menu-sfda', market: 'SA', accessed: new Date().toISOString().slice(0, 10), note: 'المنيو الرسمي يعرض السعرات والبروتين لكل صنف (لائحة SFDA)؛ الكارب والدهون غير معروضين ⇒ تقدير موسوم.' },
      items,
    }
  },
  // دومينوز: دليل التغذية الرسمي (US، PDF عبر pdftotext -layout). كل صفّ: الاسم · الحصّة · ١٢ رقمًا
  // (غ · سعرات · دهون · مشبعة · متحوّلة · كوليسترول · صوديوم · كارب · ألياف · سكّر · مضاف · بروتين).
  // البيتزا المتخصّصة: سطر الاسم وحوله أربعة أسطر أحجام «S (1/4 pizza) …». نستورد شريحة L (1/8) وM (1/5).
  // يُستبعد ما فيه لحم خنزير باسمه (Bacon · Ham · Italian sausage) — لا يُباع في السعودية أصلًا.
  dominos() {
    const txt = textOf('dominos-us-nutrition-pdf') ?? ''
    const L = txt.split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
    const NUM = '(\\d+(?:\\.\\d+)?)'
    const twelve = new RegExp(`^(.*?)\\s+${Array(12).fill(NUM).join('\\s+')}$`)
    const EXCLUDE = /bacon|\bham\b|italian sausage|^italian |breakfast/i
    const AR = {
      'Buffalo Chicken': 'بافلو تشيكن', 'Cali Chicken Bacon Ranch': null, 'Deluxe': 'ديلوكس', 'ExtravaganZZa': 'إكسترافاغانزا', 'Honolulu Hawaiian': null,
      'MeatZZa': 'ميتزا', 'Memphis BBQ Chicken': 'دجاج باربكيو', 'Pacific Veggie': 'خضار باسيفيك', 'Philly Cheese Steak': 'فيلي تشيز ستيك', 'Spinach & Feta': 'سبانخ وفيتا',
      'Ultimate Pepperoni': 'ألتيميت بيبروني', 'Wisconsin 6 Cheese': 'ستّ أجبان',
      'Garlic Bread Twists': 'خبز بالثوم (قطعتان)', 'Parmesan Bread Twists': 'خبز بارميزان (قطعتان)', 'Stuffed Cheesy Bread': 'خبز محشو بالجبن (قطعة)', 'Pepperoni Stuffed Cheesy Bread': 'خبز محشو بالجبن والبيبروني (قطعة)', 'Spinach & Feta Stuffed Cheesy Bread': 'خبز محشو بالسبانخ والفيتا (قطعة)', 'Parmesan Bread Bites': 'كرات خبز بارميزان (٤ قطع)',
      'Boneless Chicken': 'دجاج بلا عظم (٣ قطع)', 'Plain Wings (No sauce)': 'أجنحة دجاج سادة (٤ قطع)', 'Honey BBQ Wings': 'أجنحة باربكيو بالعسل (٤ قطع)', 'Hot Buffalo Wings': 'أجنحة بافلو حارّة (٤ قطع)', 'Mild Buffalo Wings': 'أجنحة بافلو خفيفة (٤ قطع)', 'Garlic Parmesan Wings': 'أجنحة ثوم وبارميزان (٤ قطع)', 'Sweet Mango Habanero Wings': 'أجنحة مانجو هابانيرو (٤ قطع)',
      'Classic Hot Buffalo Loaded Chicken': 'دجاج محمَّل بافلو (٤ قطع)', 'Spicy Jalapeno & Pineapple Loaded Chicken': 'دجاج محمَّل هالبينو وأناناس (٤ قطع)',
      'Chocolate Lava Crunch Cake': 'كيك لافا شوكولاتة', 'Marbled Cookie Brownie': 'براوني كوكيز', 'Cinnamon Bread Twists': 'خبز قرفة (قطعتان)',
      'Honey BBQ': 'صوص باربكيو بالعسل (كوب)', 'Blue Cheese': 'صوص جبنة زرقاء (كوب)', 'Garlic': 'صوص ثوم (كوب)', 'Hot Buffalo': 'صوص بافلو حار (كوب)', 'Marinara': 'صوص مارينارا (كوب)', 'Ranch': 'صوص رانش (كوب)', 'Sweet Icing': 'صوص آيسنغ حلو (كوب)', 'Sweet Mango Habanero': 'صوص مانجو هابانيرو (كوب)', 'Nacho Cheese Dipping Cup': 'صوص جبنة ناتشو (كوب)',
      'Melty 3-Cheese Loaded Tots': 'بطاطس توتس بثلاث أجبان (ربع)', 'Philly Cheese Steak Loaded Tots': 'بطاطس توتس فيلي (ربع)', 'Cheesy Marinara Dip': 'غموس مارينارا بالجبن (ملعقتان)', '5-Cheese Dip': 'غموس خمس أجبان (ملعقتان)',
      'Chicken Parm': 'ساندويتش دجاج بارميزان (نصف)', 'Sweet & Spicy Chicken Habanero': 'ساندويتش دجاج هابانيرو (نصف)', 'Chicken Alfredo': 'باستا دجاج ألفريدو (طبق)', '5-Cheese Mac & Cheese': 'ماك آند تشيز خمس أجبان (طبق)', 'Spicy Buffalo 5-Cheese Mac & Cheese': 'ماك آند تشيز بافلو حار (طبق)', 'Classic Garden Salad': 'سلطة الحديقة (١٫٥ كوب)',
    }
    AR['Buffalo Chicken sandwich'] = 'ساندويتش بافلو تشيكن (نصف)'; AR['Philly Cheese Steak sandwich'] = 'ساندويتش فيلي تشيز ستيك (نصف)'
    const items = []
    const seen = new Set()
    const push = (nameEn, arName, servingEn, nums, type, servingLabelAr) => {
      if (EXCLUDE.test(nameEn) || arName === null || arName === undefined) return
      const id = slugify(`${nameEn} ${servingEn}`)
      if (seen.has(id)) return
      seen.add(id)
      const [g, kcal, fat, , , , , carbs, fiber, , , protein] = nums.map(Number)
      items.push({ id, nameAr: arName, nameEn: `${nameEn} (${servingEn})`, sourceName: `${nameEn} — ${servingEn}`, servingGrams: g, servingLabelAr, kcal, protein, carbs, fat, fiber, type, keywords: [] })
    }
    // ① البيتزا المتخصّصة (صفحة ١٥): من عنوان القسم حتى ذيل الصفحة.
    const start = L.findIndex((l) => /^SPECIALTY PIZZAS \(info for Hand Tossed Crust\)/.test(l))
    const end = L.findIndex((l, i) => i > start && /^The pizza products listed/.test(l))
    let pendingRows = []
    for (let i = start + 1; i < end; i++) {
      const l = L[i]
      const m = l.match(new RegExp(`^(S|M|L|XL) \\((1/\\d) pizza\\) ${Array(12).fill(NUM).join(' ')}$`))
      if (m) { pendingRows.push({ size: m[1], frac: m[2], nums: m.slice(3) }); continue }
      if (!l || /^\*|^Domino|^location|^\d+$/.test(l)) continue
      const nameEn = l
      // اسم البيتزا يقع بين صفّي M وL في مخرجات pdftotext — نلتقط الأربعة حوله.
      const rows = pendingRows.splice(0)
      const after = []
      for (let j = i + 1; j < end && after.length < 2; j++) { const mm = L[j].match(new RegExp(`^(S|M|L|XL) \\((1/\\d) pizza\\) ${Array(12).fill(NUM).join(' ')}$`)); if (mm) { after.push({ size: mm[1], frac: mm[2], nums: mm.slice(3) }); i = j } else if (L[j]) break }
      for (const r of [...rows, ...after]) {
        if (r.size !== 'L' && r.size !== 'M') continue
        const sizeAr = r.size === 'L' ? 'كبيرة' : 'وسط'
        push(nameEn, AR[nameEn] === undefined ? undefined : (AR[nameEn] === null ? null : `بيتزا ${AR[nameEn]} (شريحة ${sizeAr} ${r.frac})`), `${r.size}, ${r.frac} pizza`, r.nums, 'pizza', `شريحة (${r.frac} بيتزا ${sizeAr})`)
      }
    }
    // ② الأطباق الجانبية والساندويتشات والباستا والسلطات (صفحة ١٧ + ١٨) — صفّ واحد لكل صنف.
    const s2 = L.findIndex((l) => /^BREADS$/.test(l))
    const e2 = L.findIndex((l, i) => i > s2 && /^OVEN-BAKED SANDWICHES$/.test(l) && L.slice(i, i + 3).some((x) => /Nutrition Guide/.test(x)))
    let pendingHalf = null
    for (let i = s2; i < (e2 > 0 ? e2 : L.length); i++) {
      const l = L[i]
      if (/^(1\/2 bread bowl|1 Dish) /.test(l)) { const m = l.match(twelve); if (m) { pendingHalf = pendingHalf ?? []; pendingHalf.push({ serving: m[1], nums: m.slice(2) }) } continue }
      if (pendingHalf && l && !/\d/.test(l)) { // اسم الباستا يأتي بين صفّي «1/2 bread bowl» و«1 Dish»
        const nameEn = l; const nextRow = L[i + 1]?.match(twelve)
        if (nextRow && /^1 Dish/.test(nextRow[1])) { push(nameEn, AR[nameEn], '1 dish', nextRow.slice(2), 'plate', 'طبق'); i++ }
        pendingHalf = null; continue
      }
      const m = l.match(twelve)
      if (!m) continue
      const head = m[1]
      const sv = head.match(/^(.*?)\s+((?:\d+|1\/2|1\/4|1\.5)\s+(?:pieces?|cake|brownie|cup|tbsp|Sandwich|Dish|of Loaded Tots|bread bowl))$/)
      if (!sv) continue
      const nameEn = sv[1].trim(); const servingEn = sv[2]
      const type = /Sandwich/.test(servingEn) ? 'sandwich' : /Dish|bread bowl/.test(servingEn) ? 'plate' : /Salad/i.test(nameEn) ? 'salad' : /Wings|Chicken/.test(nameEn) ? 'fried_chicken' : /Cake|Brownie|Cinnamon|Icing/.test(nameEn) ? 'dessert' : /cup|tbsp/.test(servingEn) ? 'sauce' : 'side'
      const key = /Sandwich/.test(servingEn) && AR[`${nameEn} sandwich`] ? `${nameEn} sandwich` : nameEn
      const labelAr = /Sandwich/.test(servingEn) ? 'نصف ساندويتش' : /Dish/.test(servingEn) ? 'طبق' : /cup/.test(servingEn) ? 'كوب' : /tbsp/.test(servingEn) ? 'ملعقتان' : /pieces?/.test(servingEn) ? `${servingEn.replace(/ pieces?/, '')} قطعة` : /cake|brownie/.test(servingEn) ? 'حبة' : 'حصة'
      push(nameEn, AR[key], servingEn, m.slice(2), type, labelAr)
    }
    return {
      chain: { slug: 'dominos', ar: 'دومينوز', en: "Domino's", keywords: ["domino's", 'dominos', 'دومينوز', 'دومينوس', 'domino'] },
      source: { url: 'https://cache.dominos.com/olo/6_152_7/assets/build/market/US/_en/pdf/DominosNutritionGuide.pdf', kind: 'official-nutrition-guide', market: 'US', accessed: new Date().toISOString().slice(0, 10), note: 'دليل التغذية الرسمي (مارس ٢٠٢٥) كامل الماكروز — سوق أمريكا؛ الوصفة السعودية قد تختلف (البيبروني بقري محلّيًا). ما فيه لحم خنزير باسمه مستبعد.' },
      items,
    }
  },
  // سجلّات USDA للسلاسل (SR Legacy «Fast Foods/Restaurant Foods» + FNDDS): منتجات السوق الأمريكي
  // مقيسة مخبريًّا — كاملة الماكروز لكل ١٠٠غ مع حصص. الخريطة docs/data-factory/chains/USDA-MAP.json
  // والدليل data/food-production/chains/usda-evidence.json (جلب CI). يُنتج ملفًا لكل سلسلة.
  usda() {
    const map = JSON.parse(readFileSync(resolve(ROOT, 'docs/data-factory/chains/USDA-MAP.json'), 'utf8'))
    const evidence = JSON.parse(readFileSync(resolve(ROOT, 'data/food-production/chains/usda-evidence.json'), 'utf8'))
    const ev = Object.fromEntries(evidence.results.map((r) => [r.id, r]))
    const CHAIN = {
      mcdonalds: { ar: 'ماكدونالدز', en: "McDonald's", keywords: ['mcdonalds', "mcdonald's", 'ماك', 'مكدونالدز', 'ماكدونالدز'] },
      kfc: { ar: 'كنتاكي', en: 'KFC', keywords: ['kfc', 'كنتاكي', 'كي إف سي'] },
      burgerking: { ar: 'برجر كنج', en: 'Burger King', keywords: ['burger king', 'برجر كنج', 'برغر كنغ', 'bk'] },
      pizzahut: { ar: 'بيتزا هت', en: 'Pizza Hut', keywords: ['pizza hut', 'بيتزا هت', 'بيتزا هات'] },
      papajohns: { ar: 'بابا جونز', en: "Papa John's", keywords: ['papa johns', "papa john's", 'بابا جونز'] },
      subway: { ar: 'صب واي', en: 'Subway', keywords: ['subway', 'صب واي', 'صبواي'] },
      applebees: { ar: 'آبلبيز', en: "Applebee's", keywords: ['applebees', "applebee's", 'ابلبيز', 'آبلبيز'] },
      chilis: { ar: 'تشيليز', en: "Chili's", keywords: ['chilis', "chili's", 'تشيليز', 'شيليز'] },
      hardees: { ar: 'هارديز', en: "Hardee's", keywords: ['hardees', "hardee's", 'هارديز', "carl's jr"] },
      fiveguys: { ar: 'فايف غايز', en: 'Five Guys', keywords: ['five guys', 'فايف قايز', 'فايف غايز'] },
      texasroadhouse: { ar: 'تكساس رودهاوس', en: 'Texas Roadhouse', keywords: ['texas roadhouse', 'تكساس رودهاوس'] },
      pfchangs: { ar: 'بي إف تشانغز', en: "P.F. Chang's", keywords: ['pf changs', "p.f. chang's", 'بي اف تشانغز', 'بي إف تشانغز'] },
      shakeshack: { ar: 'شيك شاك', en: 'Shake Shack', keywords: ['shake shack', 'شيك شاك', 'شيك شك'] },
      raisingcanes: { ar: 'ريزينغ كينز', en: "Raising Cane's", keywords: ['raising canes', "raising cane's", 'كينز', 'ريزنق كينز', 'ريزينغ كينز'] },
    }
    const PORTION_PICK = /sandwich|burger|piece|slice|serving|order|item|cup|each|biscuit|cookie|pie|sundae|muffin|hotcake|wrap|salad|entree|plate/i
    const AR_UNIT = (u) => (/slice/i.test(u) ? 'شريحة' : /cup/i.test(u) ? 'كوب' : /piece|nugget|strip|tender|finger/i.test(u) ? 'قطعة' : /serving|order|entree|plate|salad/i.test(u) ? 'حصة' : 'حبة')
    const byChain = {}
    for (const row of map.rows) {
      const e = ev[row.id]
      byChain[row.chain] ??= []
      if (!e || e.status !== 'matched') { byChain[row.chain].push({ id: slugify(row.nameEn), nameAr: row.nameAr, nameEn: row.nameEn, sourceName: null, kcal: null, type: row.type, quarantine: e ? `USDA ${e.status}` : 'بلا دليل', candidates: e?.candidates?.map((c) => c.description) ?? [] }); continue }
      const portions = (e.portions ?? []).filter((p) => p.grams >= 10 && p.grams <= 900)
      // [FOOD-UX-001] التلميح يُطابق «العدد + الوصف» أيضًا («4 pieces» يختار حصة الأربع قطع لا أوّل حصة «pieces»).
      const portionText = (p) => `${typeof p.amount === 'number' ? p.amount : ''} ${p.modifier ?? p.unit ?? p.description ?? ''}`.trim()
      const hint = row.serving ? (portions.find((p) => new RegExp(`^${row.serving}$`, 'i').test(portionText(p))) ?? portions.find((p) => new RegExp(row.serving, 'i').test(portionText(p)))) : null
      const pick = hint ?? portions.find((p) => PORTION_PICK.test(String(p.modifier ?? p.unit ?? p.description ?? ''))) ?? portions[0] ?? null
      const g = pick ? Math.round(pick.grams) : 100
      const unit = pick ? String(pick.modifier ?? pick.unit ?? pick.description ?? '') : ''
      const n = e.per100g
      const per = (v) => Math.round((v * g) / 10) / 10
      byChain[row.chain].push({ id: slugify(row.nameEn), nameAr: row.nameAr, nameEn: row.nameEn, sourceName: e.description, fdcId: e.fdcId, dataType: e.dataType, servingGrams: g, servingLabelAr: pick ? `${typeof pick.amount === 'number' && pick.amount > 1 ? `${pick.amount} ${AR_UNIT(unit) === 'قطعة' ? 'قطع' : AR_UNIT(unit)}` : AR_UNIT(unit)} (${g}غ)` : 'لكل 100غ', kcal: Math.round((n.kcal * g) / 100), protein: per(n.protein), carbs: per(n.carbs), fat: per(n.fat), ...(typeof n.fiber === 'number' ? { fiber: per(n.fiber) } : {}), type: row.type, keywords: [], usdaPortion: unit || null })
    }
    const docs = {}
    for (const [chain, items] of Object.entries(byChain)) {
      const kept = items.filter((i) => !i.quarantine)
      docs[`usda-${chain}`] = {
        chain: { slug: chain, ...CHAIN[chain] },
        source: { url: 'https://fdc.nal.usda.gov/', kind: 'usda-branded-record', market: 'US', accessed: String(evidence.generated_at).slice(0, 10), note: 'سجلّات USDA FoodData Central لمنتجات السلسلة في السوق الأمريكي (قياس مخبري، ملك عامّ) — كاملة الماكروز؛ الوصفة السعودية قد تختلف.' },
        items: kept,
        quarantined: items.filter((i) => i.quarantine).map((i) => ({ nameEn: i.nameEn, why: i.quarantine, candidates: i.candidates })),
      }
    }
    return docs
  },
}

const which = process.argv[2]
if (!which || !PARSERS[which]) { console.error(`استعمال: parse-chain-evidence.mjs <${Object.keys(PARSERS).join('|')}>`); process.exit(2) }
const result = PARSERS[which]()
const docs = which === 'usda' ? result : { [which]: result }
for (const [name, doc] of Object.entries(docs)) {
  const out = resolve(ROOT, 'docs/data-factory/restaurants', `${name}.json`)
  writeFileSync(out, JSON.stringify(doc, null, 1) + '\n')
  const missingAr = doc.items.filter((i) => !i.nameAr).length
  console.log(`${name}: ${doc.items.length} صنفًا${doc.quarantined?.length ? ` · محجور ${doc.quarantined.length}` : ''} → ${out}${missingAr ? ` · ⚠️ ${missingAr} بلا اسم عربي` : ''}`)
}
