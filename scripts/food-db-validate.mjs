// قِمّة — مُدقِّق قاعدة الأطعمة (Cycle 1).
// يفحص foodItems + الأطباق السعودية: اتساق السعرات مع الماكروز (قاعدة 4/4/9 ±15%)،
// الحقول الناقصة/غير الصالحة، النطاقات المستحيلة، وتكرار المعرّفات والأسماء.
//
// الاستخدام:
//   node scripts/food-db-validate.mjs           # تقرير كامل + رمز خروج (ERROR ⇒ 1)
//   node scripts/food-db-validate.mjs --json     # مخرجات JSON للبوّابة الآلية
//   node scripts/food-db-validate.mjs --strict    # يفشل أيضًا على التحذيرات (WARN)
//
// لا يعدّل أي ملف. مصدر البيانات هو src/data/foodItems.ts (يشمل الأطباق السعودية عبر spread).

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { rmSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outfile = resolve(here, '.food-db.bundle.mjs')

const JSON_OUT = process.argv.includes('--json')
const STRICT = process.argv.includes('--strict')

// ————— تحميل البيانات الحقيقية عبر تجميع TS —————
await build({
  entryPoints: [resolve(root, 'src/data/foodItems.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': '{}' },
  logLevel: 'silent',
})
let foodItems
let loanwordSpellings = []
try {
  const mod = await import(pathToFileURL(outfile).href)
  foodItems = mod.foodItems
  // مصدر واحد لمقابلات الكلمات الدخيلة: نقرأها من طبقة البيانات نفسها التي يستخدمها
  // البحث، فلا تتباعد قائمة المُدقِّق عن قائمة `searchFood` أبدًا.
  loanwordSpellings = mod.LOANWORD_SPELLINGS ?? []
} finally {
  try { rmSync(outfile) } catch { /* ignore */ }
}
// الأطباق السعودية التقليدية تُدمج في foodItems عبر spread بمعرّفات «sfct-*».
const saudiCount = foodItems.filter((f) => typeof f.id === 'string' && f.id.startsWith('sfct-')).length
const gccCount = foodItems.filter((f) => typeof f.id === 'string' && f.id.startsWith('gcc-')).length
// أصناف السلاسل المنسَّقة (فئة «مطاعم» خارج r2-eat-*) — يُصدَّر للبوّابة كي
// يُثبَّت بدقّة: total>=581 أرضية لا تعلن إضافة صامتة، والعدّ الدقيق يعلنها
// (نمط gcc==46). استثناء r2 قصديّ: عدّه مثبَّت بمسماره الخاص (r2==60).
const restaurantItems = foodItems.filter((f) => f.category === 'مطاعم' && !String(f.id).startsWith('r2-eat-'))
const restaurantCount = restaurantItems.length
// وسم «تقديري» على مستوى الصنف المعروض (نظير r2Estimated): رأس الكتلة كان يعلن
// التقدير عن الجميع والصنف المعروض للمستخدم صامت — الوسم الآن حيث يُقرأ.
const restaurantsEstimated = restaurantItems.filter((f) => typeof f.notesAr === 'string' && f.notesAr.includes('تقديري')).length
const r2Items = foodItems.filter((f) => typeof f.id === 'string' && f.id.startsWith('r2-eat-'))
const r2Estimated = r2Items.filter((f) => typeof f.notesAr === 'string' && f.notesAr.includes('تقديري')).length
const r2Categories = [...new Set(r2Items.map((f) => f.category))]
const r2Ranges = [
  { from: 1, to: 10, min: 150, max: 950, label: 'broast' },
  { from: 11, to: 20, min: 250, max: 850, label: 'shawarma' },
  { from: 21, to: 30, min: 250, max: 950, label: 'burgers' },
  { from: 31, to: 40, min: 350, max: 1050, label: 'rice plates' },
  { from: 41, to: 50, min: 0, max: 350, label: 'karak/coffee' },
  { from: 51, to: 60, min: 180, max: 500, label: 'bakery' },
]
const r2RangeViolations = r2Items.flatMap((item) => {
  const n = Number(item.id.slice(-3))
  const rule = r2Ranges.find((candidate) => n >= candidate.from && n <= candidate.to)
  return rule && item.calories >= rule.min && item.calories <= rule.max
    ? []
    : [{ id: item.id, calories: item.calories, expected: rule ? `${rule.min}-${rule.max}` : 'known R2 group' }]
})

// أسماء سلاسل مطاعم/مقاهٍ معروفة — التسمية في قاعدة البيانات يجب أن تبقى عامّة.
// القائمة إرشادية لا حصرية (تُفحص أصناف r2-eat-* فقط).
const TRADEMARKS = [
  /البيك|al[\s-]?baik/i,
  /هرفي|herfy/i,
  /كودو|kudu/i,
  /ماكدونالدز|mcdonald/i,
  /كنتاكي|\bkfc\b/i,
  /هارديز|hardee/i,
  /برجر\s?كنج|burger\s?king/i,
  /دومينوز|domino/i,
  /بيتزا\s?هت|pizza\s?hut/i,
  /صب\s?واي|subway/i,
  /ستاربكس|starbucks/i,
  /كوستا\s?كوفي|costa\s?coffee/i,
  /تيم\s?هورتنز|tim\s?hortons/i,
  /دانكن|dunkin/i,
  /كرسبي\s?كريم|krispy\s?kreme/i,
  /شاورمر|shawarmer/i,
  /الطازج|al[\s-]?tazaj/i,
  /نمرة\s?تسعة/i,
  // [مهمة الصقل §5] سدّ فجوة الحارس/المحتوى: القائمة كانت 18 نمطًا والسلاسل
  // المنسَّقة في القاعدة 25 — فصنف r2 عام باسم إحدى السبع الناقصة كان يمرّ صامتًا.
  // «مايسترو/ماسترو» بالهجاءين لأن LOANWORD_SPELLINGS تكافئهما في البحث أصلًا.
  /مايسترو|ماسترو|maestro/i,
  /الرومانسية|romansiah/i,
  /ماما\s?نورة|mama\s?noura/i,
  /برجرايزر|burgerizzr/i,
  /بابا\s?جونز|papa\s?john/i,
  /فايف\s?غايز|فايف\s?قايز|five\s?guys/i,
  /شيك\s?شاك|shake\s?shack/i,
  /باسكن|باسكين|baskin/i,
  /تكساس|texas\s?chicken/i,
  /كاريبو|caribou/i,
]

// تصنيف فئة فرعية من نص الاسم/الكلمات المفتاحية — لفحص منطقية كثافة السعرات فقط.
// \b على كل الكلمات اللاتينية لمنع تطابقات فرعية زائفة («platter» تحتوي «latte»،
// «steak» تحتوي «tea»). الكلمات العربية آمنة بلا حدود كلمة.
function classifyR2(blob) {
  const b = blob.toLowerCase()
  if (/\bbroast\b|بروست|كرسبي|أصابع دجاج|قطع دجاج|أجنحة|\bwings\b/.test(b)) return 'broast'
  if (/\bshawarma\b|شاورما/.test(b)) return 'shawarma'
  if (/\bburger\b|برجر/.test(b)) return 'burger'
  if (/\bmandi\b|\bmathbi\b|\bmadfoon\b|\bhaneeth\b|\bkabsa\b|مندي|مظبي|مدفون|حنيذ|كبسة|صالونة|مرق/.test(b)) return 'riceMeat'
  if (/\bkarak\b|كرك|\bcoffee\b|قهوة|\blatte\b|لاتيه|\bmocha\b|موكا|شاي|\btea\b/.test(b)) return 'coffee'
  if (/\bsamosa\b|\bfatayer\b|\bcroissant\b|\bdonut\b|\bcake\b|\bcheesecake\b|\bbrownie\b|\bknafeh\b|سمبوسة|فطيرة|كرواسون|دونات|كيك|براونيز|كنافة|آيس كريم|\bice cream\b/.test(b)) return 'bakery'
  return null
}

// نطاقات معقولة (سعرة/100غ) لكل فئة فرعية — واسعة عمدًا (سلامة عامة، الدقّة عبر 4/4/9).
// يكمّل r2Ranges أعلاه: ذاك يحدّ السعرات المطلقة، وهذا يحدّ الكثافة — صنفٌ بوزن حصّة
// كبير وسعرات منخفضة يمرّ من الأول ويسقط في الثاني.
const R2_KCAL_BOUNDS = {
  broast: [150, 400],
  shawarma: [140, 320],
  burger: [120, 320],
  riceMeat: [55, 250], // الحدّ الأدنى يشمل مرق/صالونة جانبية
  coffee: [0, 150],
  bakery: [150, 480],
}

// ————— إملاء الأسماء (NAME_SPELL) —————
// كانت القاعدة تفرض إملاءً واحدًا («برجر» لا «برغر») لأن البحث كان يطابق النص حرفيًا،
// فأي كتابة أخرى تعني صفر نتائج — أي أنّ الإملاء كان **شرط عثور**. بعد أن صار
// `searchFood` يوحّد متغيّرات الكلمات الدخيلة عبر `LOANWORD_SPELLINGS`، لم يبقَ الإملاء
// شرط عثور، فالقاعدة تنتقل من «فرض إملاء» إلى «قبول المتغيّرين لما في القائمة»:
// كل زوج تُوحّده طبقة البحث يُستثنى، وما عداه يبقى صارمًا كما هو.
const NAME_SPELL_RULES = [
  { wrong: 'برغر', right: 'برجر' },
]
const isLoanwordVariant = (a, b) =>
  loanwordSpellings.some((group) => group.includes(a) && group.includes(b))
const nameSpellExempt = NAME_SPELL_RULES.filter((r) => isLoanwordVariant(r.wrong, r.right))
const nameSpellActive = NAME_SPELL_RULES.filter((r) => !isLoanwordVariant(r.wrong, r.right))

// ————— إعدادات الفحص —————
const KCAL_TOL = 0.15 // ±15% لقاعدة 4/4/9
const MACRO_MAX_PER_100 = 100 // غرام لكل 100غ
const ENERGY_DENSITY_MAX = 9.1 // سعرة/غرام (دهن نقي ≈ 9)
const REQUIRED_STR = ['id', 'nameAr', 'nameEn', 'category', 'servingLabelAr']
const REQUIRED_NUM = ['calories', 'protein', 'carbs', 'fat']

const findings = [] // {level, code, id, name, detail}
const add = (level, code, id, name, detail) => findings.push({ level, code, id, name, detail })

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const predKcal = (m) => 4 * (m.protein || 0) + 4 * (m.carbs || 0) + 9 * (m.fat || 0)

/** تطبيع اسم عربي/إنجليزي لكشف التكرار: قصّ، دمج الفراغات، إزالة التطويل، توحيد الألف/الياء/التاء. */
function norm(s) {
  return String(s || '')
    .replace(/ـ/g, '') // tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ————— فحص عنصر واحد (أو حجم بديل) —————
function checkMacros(item, ctx) {
  const label = ctx ? `${item.id} · ${ctx}` : item.id
  const name = item.nameAr || item.labelAr || ''
  // 1) حقول رقمية صالحة
  for (const f of REQUIRED_NUM) {
    if (!isNum(item[f])) { add('ERROR', 'MISSING_NUM', label, name, `الحقل «${f}» مفقود أو غير رقمي`); return }
    if (item[f] < 0) add('ERROR', 'NEGATIVE', label, name, `«${f}» سالب (${item[f]})`)
  }
  if (item.fiber != null && (!isNum(item.fiber) || item.fiber < 0)) add('ERROR', 'BAD_FIBER', label, name, `«fiber» غير صالح (${item.fiber})`)

  const grams = isNum(item.servingGrams) ? item.servingGrams : null
  // 2) نطاقات لكل 100غ (فقط عندما تُعرف الغرامات)
  if (grams && grams > 0) {
    const per100 = (v) => (v / grams) * 100
    for (const f of ['protein', 'carbs', 'fat']) {
      if (per100(item[f]) > MACRO_MAX_PER_100 + 2) add('ERROR', 'RANGE_MACRO', label, name, `${f}=${item[f]}غ ⇒ ${per100(item[f]).toFixed(0)}غ/100غ (> 100)`)
    }
    const sumG = (item.protein + item.carbs + item.fat)
    if (per100(sumG) > 105) add('ERROR', 'RANGE_SUM', label, name, `مجموع الماكروز ${per100(sumG).toFixed(0)}غ/100غ (> 105)`)
    if (item.calories / grams > ENERGY_DENSITY_MAX) add('ERROR', 'RANGE_KCAL', label, name, `كثافة ${(item.calories / grams).toFixed(1)} سعرة/غ (> 9.1)`)
  }
  // 3) قاعدة 4/4/9 ±15% — واعية بالألياف (Atwater): الألياف تسهم بـ ~2 سعرة/غ لا 4،
  //    فالسعرات المعقولة تقع بين «صافي الكربوهيدرات» و«الكربوهيدرات الكلّية». نُحذّر فقط
  //    إذا خرجت السعرات عن هذا النطاق ±15% (يُزيل الإيجابيات الكاذبة للخضار عالية الألياف).
  const strict = predKcal(item) // 4·P + 4·(كارب كلّي) + 9·F
  const fiber = isNum(item.fiber) ? Math.min(item.fiber, item.carbs || 0) : 0
  const net = strict - 2 * fiber // الألياف بـ 2 سعرة/غ بدل 4
  const lo = Math.min(strict, net), hi = Math.max(strict, net)
  if (Math.max(item.calories, hi) >= 30) { // تجاهل ضجيج التقريب للأصناف شبه الصفرية
    if (item.calories < lo * (1 - KCAL_TOL) || item.calories > hi * (1 + KCAL_TOL)) {
      const ref = item.calories < lo ? lo : hi
      const dev = ((item.calories - ref) / Math.max(ref, 1)) * 100
      add('WARN', 'KCAL_449', label, name, `سعرات ${item.calories} خارج نطاق ${lo.toFixed(0)}–${hi.toFixed(0)} (انحراف ${dev.toFixed(0)}%)`)
    }
  }
}

// ————— المرور على كل الأصناف —————
for (const s of REQUIRED_STR) void s
for (const item of foodItems) {
  for (const f of REQUIRED_STR) {
    if (typeof item[f] !== 'string' || !item[f].trim()) add('ERROR', 'MISSING_STR', item.id || '(بلا معرّف)', item.nameAr || '', `الحقل النصّي «${f}» مفقود`)
  }
  checkMacros(item)
  // وحدات الحصص: تطبيع عربي فصيح ومتّسق (Cycle 3).
  const lbl = typeof item.servingLabelAr === 'string' ? item.servingLabelAr : ''
  if (/برغر/.test(lbl)) add('WARN', 'UNIT_SPELL', item.id, item.nameAr, `«برغر» غير قياسي — استخدم «برجر»: «${lbl}»`)
  if (/^نص\s/.test(lbl)) add('WARN', 'UNIT_MSA', item.id, item.nameAr, `«نص» عامّية — استخدم «نصف»: «${lbl}»`)
  if (/^\d+\s*(غ|مل)$/.test(lbl)) add('WARN', 'UNIT_BARE', item.id, item.nameAr, `وحدة مجرّدة بلا وصف «${lbl}» — استخدم «لكل Nغ» أو «حصة (Nغ)»`)
  // تناسق التسمية (Cycle 5، مُحدَّثة): صارمة لكل إملاء غير قياسي **لا** يوحّده البحث.
  const nameBlob = `${item.nameAr || ''} ${Array.isArray(item.keywords) ? item.keywords.join(' ') : ''}`
  for (const rule of nameSpellActive) {
    if (nameBlob.includes(rule.wrong)) add('WARN', 'NAME_SPELL', item.id, item.nameAr, `«${rule.wrong}» غير قياسي — استخدم «${rule.right}»`)
  }
  if (Array.isArray(item.sizes)) {
    for (const sz of item.sizes) checkMacros({ ...sz, servingGrams: sz.servingGrams }, `حجم:${sz.id || sz.labelAr || '?'}`)
  }
  // أصناف الأكل الخارجي (Round 2): التسمية عامّة قصدًا، والكثافة ضمن المعقول لفئتها.
  if (/^r2-eat-/.test(String(item.id))) {
    const blob = `${item.nameAr || ''} ${item.nameEn || ''} ${Array.isArray(item.keywords) ? item.keywords.join(' ') : ''}`
    for (const t of TRADEMARKS) {
      if (t.test(blob)) add('ERROR', 'TRADEMARK', item.id, item.nameAr, `يحتمل احتواء اسم علامة تجارية: نمط «${t.source}»`)
    }
    const g = isNum(item.servingGrams) && item.servingGrams > 0 ? item.servingGrams : null
    if (g) {
      const per100 = (item.calories / g) * 100
      const sub = classifyR2(blob)
      if (sub) {
        const [lo, hi] = R2_KCAL_BOUNDS[sub]
        if (per100 < lo || per100 > hi) add('WARN', 'CATEGORY_KCAL_R2', item.id, item.nameAr, `فئة «${sub}»: ${per100.toFixed(0)} سعرة/100غ خارج النطاق المعقول [${lo}–${hi}]`)
      }
    }
  }
}

// ————— تكرار المعرّفات والأسماء —————
const byId = new Map()
for (const it of foodItems) byId.set(it.id, (byId.get(it.id) || 0) + 1)
for (const [id, n] of byId) if (n > 1) add('ERROR', 'DUP_ID', id, '', `المعرّف مكرّر ${n} مرّات`)

const byNameAr = new Map()
const byNameEn = new Map()
for (const it of foodItems) {
  const a = norm(it.nameAr), e = norm(it.nameEn)
  if (a) (byNameAr.get(a) || byNameAr.set(a, []).get(a)).push(it.id)
  if (e) (byNameEn.get(e) || byNameEn.set(e, []).get(e)).push(it.id)
}
for (const [k, ids] of byNameAr) if (ids.length > 1) add('WARN', 'DUP_NAME_AR', ids.join(','), k, `اسم عربي مكرّر (${ids.length})`)
for (const [k, ids] of byNameEn) if (ids.length > 1) add('WARN', 'DUP_NAME_EN', ids.join(','), k, `اسم إنجليزي مكرّر (${ids.length})`)

// تباعد الطاقة بين أصناف تحمل الاسم نفسه (بعد التطبيع لكل 100غ) — يكشف تعارض بيانات حقيقيًا
// (طبق واحد بسعرات مختلفة جوهريًا في مدخلين). عتبة 1.30× (30%).
const per100cal = (it) => (isNum(it.servingGrams) && it.servingGrams > 0 ? (it.calories / it.servingGrams) * 100 : null)
const byId2 = new Map(foodItems.map((it) => [it.id, it]))
// اسم أساسي: يُزيل لاحقة المنطقة بين قوسين وبدائل «/» لتجميع «مطازيز» مع «مطازيز (القصيم)».
const baseName = (s) => norm(String(s || '').replace(/\([^)]*\)/g, '').split('/')[0])
const groups = new Map()
for (const it of foodItems) { const a = baseName(it.nameAr); if (a) (groups.get(a) || groups.set(a, []).get(a)).push(it.id) }
for (const [, ids] of groups) {
  if (ids.length < 2) continue
  const vals = ids.map((id) => ({ id, v: per100cal(byId2.get(id)) })).filter((x) => x.v != null)
  if (vals.length < 2) continue
  const min = Math.min(...vals.map((x) => x.v)), max = Math.max(...vals.map((x) => x.v))
  if (min > 0 && max / min > 1.30) add('WARN', 'DIVERGE_KCAL', vals.map((x) => x.id).join(','), byId2.get(ids[0]).nameAr, `سعرات/100غ متباعدة ${vals.map((x) => `${x.id}=${x.v.toFixed(0)}`).join(' vs ')} (نسبة ${(max / min).toFixed(1)}×)`)
}

// ————— التقرير —————
const errors = findings.filter((f) => f.level === 'ERROR')
const warns = findings.filter((f) => f.level === 'WARN')
const byCode = {}
for (const f of findings) (byCode[f.code] ||= []).push(f)

// إملاء الأسماء: نُصرّح بما يُطبَّق وما يُستثنى — الاستثناء المعلَن لا الصامت (§4).
const nameSpellReport = {
  active: nameSpellActive.map((r) => `${r.wrong}→${r.right}`),
  exempt: nameSpellExempt.map((r) => `${r.wrong}≡${r.right}`),
}

if (JSON_OUT) {
  console.log(JSON.stringify({ total: foodItems.length, saudi: saudiCount, gcc: gccCount, restaurants: restaurantCount, restaurantsEstimated, r2: r2Items.length, r2Estimated, r2Categories, r2RangeViolations, nameSpell: nameSpellReport, errors: errors.length, warnings: warns.length, byCode: Object.fromEntries(Object.entries(byCode).map(([k, v]) => [k, v.length])), findings }, null, 2))
} else {
  console.log('════════ مُدقِّق قاعدة الأطعمة — قِمّة ════════')
  console.log(`الإجمالي: ${foodItems.length} صنفًا (منها ${saudiCount} طبقًا سعوديًا)`)
  console.log(`أخطاء (ERROR): ${errors.length} · تحذيرات (WARN): ${warns.length}`)
  console.log(`إملاء الأسماء: ${nameSpellReport.active.length} قاعدة مطبَّقة · ${nameSpellReport.exempt.length} مستثناة بتوحيد البحث (${nameSpellReport.exempt.join('، ') || 'لا شيء'})\n`)
  const order = ['MISSING_STR', 'MISSING_NUM', 'NEGATIVE', 'BAD_FIBER', 'RANGE_MACRO', 'RANGE_SUM', 'RANGE_KCAL', 'DUP_ID', 'TRADEMARK', 'DIVERGE_KCAL', 'UNIT_SPELL', 'UNIT_MSA', 'UNIT_BARE', 'NAME_SPELL', 'KCAL_449', 'DUP_NAME_AR', 'DUP_NAME_EN', 'CATEGORY_KCAL_R2']
  for (const code of order) {
    const rows = byCode[code]
    if (!rows || !rows.length) continue
    console.log(`── ${code} (${rows[0].level}) × ${rows.length} ──`)
    for (const r of rows.slice(0, 60)) console.log(`   [${r.id}] ${r.name} — ${r.detail}`)
    if (rows.length > 60) console.log(`   … و${rows.length - 60} غيرها`)
    console.log('')
  }
  console.log(errors.length ? `❌ فشل التدقيق: ${errors.length} خطأ.` : warns.length ? `⚠️ نجح بلا أخطاء، مع ${warns.length} تحذيرًا للمراجعة.` : '✅ نجح التدقيق — بلا أخطاء أو تحذيرات.')
}

process.exit(errors.length > 0 || (STRICT && warns.length > 0) ? 1 : 0)
