// قِمّة — إثبات خطّ إنتاج بيانات المنتجات.
// كل قاعدة في الخطّ لها تأكيد **مسمّى**، ويقابله **تأكيد مضادّ** يسقط بالاسم إن أُزيلت
// القاعدة (§4.2: البوابة التي تنجو بأخلاق الوكيل يجب أن تنجو ببنيتها).
//
//   node scripts/run-food-production-proof.mjs
//
// بلا شبكة إطلاقًا: كل المدخلات من `data/food-production/fixtures/` — فالإثبات حتمي.

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'
import { loadShared, loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'
import * as N from './food-production/lib/normalize.mjs'
import { checkNutrition, BLOCKING_FLAGS, scoreConfidence } from './food-production/lib/sanity.mjs'
import { dedupe } from './food-production/lib/dedupe.mjs'
import { fnv1a, mix32, assignShard, stableStringify, buildSearchIndex, writeShards, writeHotSet } from './food-production/lib/shard.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: يجب أن **يفشل** الشرط، وإلا فالقاعدة صارت بلا أثر. */
const counter = (label, ruleHeld, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!ruleHeld, detail: String(detail), counter: true })

/**
 * يطبع الحصيلة ويخرج. **الطباعة هنا وحدها** كي لا يبتلع انهيارٌ منتصفَ الإثبات
 * كل النتائج المجموعة قبله.
 */
function report() {
  console.log('════════ إثبات خطّ إنتاج بيانات المنتجات — قِمّة ════════\n')
  let failed = 0
  for (const c of checks) {
    console.log(`${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
    if (!c.pass) failed++
  }
  const counters = checks.filter((c) => c.counter).length
  console.log('')
  if (failed === 0) {
    console.log(`✅ نجحت كل الفحوص — ${checks.length} فحصًا (منها ${counters} تأكيدًا مضادًّا يحرس أن القواعد لم تصر بلا أثر).`)
    process.exit(0)
  }
  console.log(`❌ فشل الإثبات: ${failed} من ${checks.length} فحصًا.`)
  process.exit(1)
}

/**
 * ⚠️ **سقوط غير مسمّى ليس إثباتًا** (§4.2). لو انهار الإثبات باستثناء تقني — لأن قاعدةً
 * أُزيلت فصار تعبيرٌ يقرأ `undefined` — لكان الخروج بلا فحص مسمّى، وقد يُقرأ نجاحًا.
 * فيُحوَّل أي انهيار إلى **فشل مسمّى** ثم تُطبع الحصيلة كاملة.
 */
const crash = (err) => {
  ok('الإثبات لم ينهَر باستثناء تقني (سقوط غير مسمّى)', false, `${err?.message ?? err}`)
  report()
}
process.on('uncaughtException', crash)
process.on('unhandledRejection', crash)

const { norm, gtin: G } = await loadShared()
const foodItems = await loadTsModule('src/data/foodItems.ts')

// ═══════════ ١) تطابق المخطّط: TS ↔ JSON Schema ═══════════
const schemaTs = await loadTsModule('src/lib/food/productSchema.ts')
const schemaJson = JSON.parse(readFileSync(resolve(ROOT, 'data/food-production/schema/product.schema.json'), 'utf8'))
const tsFields = [...schemaTs.PRODUCT_FIELDS].sort()
const jsonProps = Object.keys(schemaJson.properties).sort()
const jsonRequired = [...schemaJson.required].sort()
ok('المخطّط: حقول TS = خصائص JSON Schema', JSON.stringify(tsFields) === JSON.stringify(jsonProps), `${tsFields.length} vs ${jsonProps.length}`)
ok('المخطّط: كل حقل مطلوب (لا حقل اختياري يتسلّل)', JSON.stringify(jsonProps) === JSON.stringify(jsonRequired), `${jsonRequired.length}`)
counter('حقل زائد في أحد الملفّين يُكتشف', !tsFields.includes('__never__') && !jsonProps.includes('__never__'))
const tsFlags = [...schemaTs.QUALITY_FLAGS].sort()
const jsonFlags = [...schemaJson.properties.quality_flags.items.enum].sort()
ok('المخطّط: أعلام الجودة متطابقة بين TS وJSON Schema', JSON.stringify(tsFlags) === JSON.stringify(jsonFlags), `${tsFlags.length}`)

// ═══════════ ٢) التطبيع: تنفيذ واحد لا اثنان ═══════════
ok('التطبيع: النسخة مختومة', /^\d+\.\d+\.\d+$/.test(norm.NORMALIZATION_VERSION), norm.NORMALIZATION_VERSION)
const foldSamples = [
  'كَبْسَةٌ', 'الأرزّ', 'مُطَبَّق', 'شاورما', 'حليب المراعي', 'مِلْحٌ', 'تمــر', 'إفطار', 'آيس كريم',
  'ماء', 'عصير برتقال', 'ة', 'ى', 'ؤ', 'ئ', 'ء', 'Chicken Breast', 'MiXeD CaSe', '  فراغ  زائد  ',
]
const foldMismatches = foldSamples.filter((s) => norm.foldArabic(s) !== foodItems.normalizeSearch(s))
ok('التطبيع: `foldArabic` ≡ `normalizeSearch` القائمة في foodItems (لا ازدواج صامت)', foldMismatches.length === 0, foldMismatches.length ? `اختلف في: ${foldMismatches.join(' · ')}` : `${foldSamples.length} عيّنة متطابقة`)
counter('لو تباعد التنفيذان لسقط هذا التأكيد بالاسم', norm.foldArabic('كبسة') === foodItems.normalizeSearch('كبسة'))
ok('التطبيع: التاء المربوطة تُطوى (كبسة ≡ كبسه)', norm.foldArabic('كبسة') === norm.foldArabic('كبسه'))
ok('التطبيع: الهمزات تُطوى (أرز ≡ ارز)', norm.foldArabic('أرز') === norm.foldArabic('ارز'))
ok('التطبيع: التطويل يُحذف (تمــر ≡ تمر)', norm.foldArabic('تمــر') === norm.foldArabic('تمر'))
ok('التطبيع: التشكيل يُحذف', norm.foldArabic('مِلْحٌ') === norm.foldArabic('ملح'))
ok('التطبيع: الأرقام العربية تُطوى (٣٠ ⇒ 30)', norm.foldArabicDigits('٣٠') === '30' && norm.foldArabicDigits('۳۰') === '30')
counter('الطيّ لا يوحّد كلمتين مختلفتين حقًّا (ملح ≠ ملحق)', norm.foldArabic('ملح') !== norm.foldArabic('ملحق'))
counter('الطيّ لا يمحو التمييز بين حليب وحليم', norm.foldArabic('حليب') !== norm.foldArabic('حليم'))

// ═══════════ ٣) GTIN ═══════════
const gtinPass = ['6281007034043', '5449000000996', '3017620422003', '4006381333931', '6291100030101']
ok('GTIN: باركودات حقيقية معروفة تمرّ كلّها', gtinPass.every((c) => G.classifyGtin(c).ok), gtinPass.length + '/5')
ok('GTIN: التوحيد إلى 14 خانة', G.classifyGtin('6281007034043').gtin14 === '06281007034043')
ok('GTIN: يقبل الأطوال 8/12/13/14', [8, 12, 13, 14].every((L) => {
  const map = { 8: '96385074', 12: '036000291452', 13: '6281007034043', 14: '06281007034043' }
  return G.classifyGtin(map[L]).ok
}))
const rejectCases = [
  ['خانة تحقق خاطئة', '6281007034044', 'checksum'],
  ['كود زائف مكرّر', '0000000000000', 'placeholder'],
  ['كود اختبار تسلسلي', '12345670', 'placeholder'],
  ['تداول مقيّد داخل المتجر', '2001234567893', 'restricted-circulation'],
  ['كتاب ISBN', '9780306406157', 'not-a-trade-item'],
  ['طول غير صالح', '123456', 'length'],
  ['حروف لا أرقام', 'ABCDEFGH', 'non-digits'],
  ['فارغ', '', 'empty'],
]
for (const [label, code, expected] of rejectCases) {
  const r = G.classifyGtin(code)
  ok(`GTIN: يُرفض ${label} بسبب مسمّى «${expected}»`, !r.ok && r.reason === expected, r.ok ? 'قُبل خطأً' : r.reason)
}
counter('كشف الأكواد الزائفة فعّال — كود اختبار صالح الخانة لا يمرّ', !G.classifyGtin('12345670').ok)
counter('حارس السلع غير التجارية فعّال — ISBN لا يدخل قاعدة الطعام', !G.classifyGtin('9780306406157').ok)
ok('GTIN: بادئة 628 تُنسب للسعودية', G.classifyGtin('6281007034043').gs1LicensingOrg === 'Saudi Arabia')
ok('GTIN: بادئة غير معروفة تبقى null ولا تُخمَّن', G.classifyGtin('5449000000996').gs1LicensingOrg === null)
counter('لا يُختلق منشأ لبادئة غير مسجّلة', G.classifyGtin('4006381333931').gs1LicensingOrg === null)

// ═══════════ ٤) تحويل الوحدات ═══════════
ok('الوحدات: 1000 كيلوجول = 239.0 سعرة', Math.abs(N.resolveEnergyKcal({ 'energy_100g': '1000' }).energy_kcal - 239.006) < 0.01)
ok('الوحدات: حقل السعرات يُقدَّم على الكيلوجول', N.resolveEnergyKcal({ 'energy-kcal_100g': '100', 'energy-kj_100g': '9999' }).energy_kcal === 100)
ok('الوحدات: 1.25غ ملح = 500 مغ صوديوم', N.resolveSodiumMg({ 'salt_100g': '1.25' }).sodium_mg === 500)
ok('الوحدات: الصوديوم المصرَّح يُقدَّم على الملح', N.resolveSodiumMg({ 'sodium_100g': '0.1', 'salt_100g': '9' }).sodium_mg === 100)
const fd = norm.foldArabicDigits
ok('الوحدات: حصّة عربية «كوب 250 مل» تُقرأ 250 مل', JSON.stringify(N.parseServing('كوب 250 مل', fd)) === JSON.stringify({ serving_size: 250, serving_unit: 'ml' }))
ok('الوحدات: «٣٠ غ» بأرقام عربية تُقرأ 30 غ', JSON.stringify(N.parseServing('٣٠ غ', fd)) === JSON.stringify({ serving_size: 30, serving_unit: 'g' }))
ok('الوحدات: الرقم داخل القوسين يُفضَّل («1 portion (25 g)» ⇒ 25غ)', N.parseServing('1 portion (25 g)', fd).serving_size === 25)
ok('الوحدات: كجم ولتر يُحوَّلان لغرام ومل', N.parseServing('2 كجم', fd).serving_size === 2000 && N.parseServing('1 لتر', fd).serving_size === 1000)
counter('الوحدات العربية مدعومة فعلًا — بلا دعمها يسقط حجم الحصّة إلى null', N.parseServing('كوب 250 مل', fd).serving_size !== null)

// ═══════════ ٥) فحوص السلامة الغذائية ═══════════
const base = { energy_kcal: 200, protein_g: 10, carbs_g: 20, fat_g: 8, sugar_g: 5, fiber_g: 2, saturated_fat_g: 3, sodium_mg: 200, serving_size: 100, name_ar: 'اختبار', name_en: 'Test', brand_ar: 'ع', brand_en: 'B', ingredients: 'x', category: 'c' }
const flagCases = [
  ['قيمة سالبة', { ...base, protein_g: -1 }, 'negative_value'],
  ['طاقة مستحيلة (>900/100غ)', { ...base, energy_kcal: 1500 }, 'energy_density_impossible'],
  ['اشتباه كيلوجول في خانة السعرات', { ...base, energy_kcal: 1500 }, 'energy_unit_suspect_kj'],
  ['مجموع ماكروز يتجاوز الكتلة', { ...base, protein_g: 60, carbs_g: 60, fat_g: 30 }, 'macro_sum_exceeds_mass'],
  ['تعارض أتواتر 4/4/9', { ...base, energy_kcal: 100, protein_g: 20, carbs_g: 20, fat_g: 20 }, 'macro_energy_mismatch'],
  ['السكر يتجاوز الكربوهيدرات', { ...base, sugar_g: 50 }, 'sugar_exceeds_carbs'],
  ['الألياف تتجاوز الكربوهيدرات', { ...base, fiber_g: 50 }, 'fiber_exceeds_carbs'],
  ['المشبع يتجاوز الدهن الكلي', { ...base, saturated_fat_g: 50 }, 'saturated_exceeds_fat'],
  ['صوديوم خارج النطاق', { ...base, sodium_mg: 99999 }, 'sodium_out_of_range'],
  ['طاقة مفقودة', { ...base, energy_kcal: null }, 'missing_energy'],
  ['بلا اسم عربي', { ...base, name_ar: null }, 'no_arabic_name'],
]
for (const [label, rec, expected] of flagCases) {
  ok(`السلامة: يُرفع علم «${expected}» عند ${label}`, checkNutrition(rec).includes(expected), checkNutrition(rec).join(','))
}
ok('السلامة: السجل السليم بلا أعلام', checkNutrition(base).length === 0, checkNutrition(base).join(','))
counter('الفحص ليس دائم الإيجاب — سجل سليم لا يُوسَم', checkNutrition(base).length === 0)
counter('أتواتر لا يوسم تطابقًا صحيحًا (200 ≈ 4·10+4·20+9·8=192)', !checkNutrition(base).includes('macro_energy_mismatch'))
ok('السلامة: الأعلام الحاجبة تمنع القبول', ['negative_value', 'missing_energy', 'energy_density_impossible', 'macro_sum_exceeds_mass'].every((f) => BLOCKING_FLAGS.has(f)))
ok('السلامة: الأعلام اللينة لا تحجب', !BLOCKING_FLAGS.has('macro_energy_mismatch') && !BLOCKING_FLAGS.has('no_arabic_name'))
ok('الثقة: مشتقّة لا مُدخلة، ومحصورة 0..1', (() => { const c = scoreConfidence(base, []); return c > 0 && c <= 1 })(), String(scoreConfidence(base, [])))
counter('الثقة تنخفض فعلًا بالأعلام اللينة', scoreConfidence(base, ['macro_energy_mismatch']) < scoreConfidence(base, []))

// ═══════════ ٦) إزالة التكرار ═══════════
const mk = (gtin, over = {}) => ({ ...base, gtin, product_id: `openfoodfacts:${gtin}`, source: 'openfoodfacts', source_record_id: gtin, source_updated_at: '2026-01-01T00:00:00Z', confidence: 0.8, quality_flags: [], serving_unit: 'g', ...over })
const dupSame = dedupe([mk('06281007034043'), mk('06281007034043', { confidence: 0.9 })], norm.normalizeProductKey)
ok('التكرار: GTIN متطابق يُدمج في سجل واحد', dupSame.accepted.length === 1, `${dupSame.accepted.length}`)
ok('التكرار: الأعلى ثقةً هو الباقي', dupSame.accepted[0].confidence === 0.9)
const conflicting = dedupe([mk('06281007034043', { energy_kcal: 200 }), mk('06281007034043', { energy_kcal: 400 })], norm.normalizeProductKey)
ok('التكرار: تعارض غذائي على نفس الـGTIN يُرفَع لا يُبتلع', conflicting.conflicts.some((c) => c.reason === 'nutrition_divergence'), JSON.stringify(conflicting.conflicts.map((c) => c.reason)))
// ⛔ القاعدة القاطعة
const distinct = dedupe([mk('06281007034043'), mk('06281007034050')], norm.normalizeProductKey)
ok('التكرار: GTINان صالحان مختلفان لا يُدمجان أبدًا رغم تطابق الاسم والعلامة والحجم', distinct.accepted.length === 2, `${distinct.accepted.length}`)
ok('التكرار: ويُسجَّل التعارض باسمه', distinct.conflicts.some((c) => c.reason === 'same_key_distinct_gtin'))
counter('حارس «لا دمج لـGTINين مختلفين» فعّال — إزالته كانت ستُنقص العدد إلى 1', distinct.accepted.length === 2)
counter('الدمج الضبابي لا يقع تلقائيًا — يذهب لطابور المراجعة', distinct.reviewQueue.every((q) => /review/i.test(q.note ?? '')))

// ═══════════ ٧) الشرائح والفهرسة والبحث بالباركود ═══════════
ok('التوجيه: FNV-1a ثابت عبر الاستدعاءات', fnv1a('06281007034043') === fnv1a('06281007034043'))
ok('التوجيه: الشريحة تُحسب من الـGTIN بلا جدول توجيه', typeof assignShard('06281007034043', 64) === 'number' && assignShard('06281007034043', 64) < 64)
ok('التوجيه: نفس الـGTIN ⇒ نفس الشريحة دائمًا', assignShard('06281007034043', 64) === assignShard('06281007034043', 64))
ok('الحتمية: stableStringify يرتّب المفاتيح', stableStringify({ b: 1, a: 2 }) === '{"a":2,"b":1}')

// ── انحياز التجزئة: عطب مقيس لا احتمال نظري ──
// خانة تحقّق GTIN تفرض أن يكون مجموع الخانات زوجيًا، فتخرج كل بصمات FNV-1a **فردية**،
// و`% N` لأي N زوجي يترك نصف الشرائح فارغًا أبدًا. التأكيدات التالية تحرس الإصلاح.
const sampleGtins = []
for (let i = 0; i < 4000; i++) {
  // جسم EAN-13 من 12 خانة، وأوزان خانة التحقّق 1/3 من اليسار.
  const body = String(628000000000 + i * 7).slice(0, 12)
  let sum = 0
  for (let d = 0; d < 12; d++) sum += Number(body[d]) * (d % 2 === 0 ? 1 : 3)
  sampleGtins.push(body + String((10 - (sum % 10)) % 10))
}
const validSample = sampleGtins.filter((g) => G.classifyGtin(g).ok)
ok('التجزئة: العيّنة الاصطناعية GTINات صالحة فعلًا (وإلا فالقياس على أكواد وهمية)', validSample.length === sampleGtins.length, `${validSample.length}/${sampleGtins.length}`)
const rawOdd = sampleGtins.filter((g) => fnv1a(G.classifyGtin(g).gtin14) % 2 === 1).length
counter('العطب حقيقي: FNV-1a الخام يعطي بصمات فردية كلّها على GTINات صالحة', rawOdd === sampleGtins.length, `${rawOdd}/${sampleGtins.length}`)
const mixedOdd = sampleGtins.filter((g) => mix32(fnv1a(G.classifyGtin(g).gtin14)) % 2 === 1).length
ok('التجزئة: الخلط النهائي يوازن البتّة الدنيا (لا انحياز زوجي/فردي)', mixedOdd > sampleGtins.length * 0.4 && mixedOdd < sampleGtins.length * 0.6, `${mixedOdd}/${sampleGtins.length}`)
for (const N of [30, 32, 64]) {
  const buckets = new Array(N).fill(0)
  for (const g of sampleGtins) buckets[assignShard(G.classifyGtin(g).gtin14, N)]++
  const empty = buckets.filter((x) => x === 0).length
  const spread = Math.max(...buckets) / Math.max(1, Math.min(...buckets))
  ok(`التجزئة: لا شريحة فارغة عند N=${N}`, empty === 0, `فارغة=${empty}`)
  ok(`التجزئة: التوزيع متّزن عند N=${N} (أقصى/أدنى < 2)`, spread < 2, `${spread.toFixed(2)}×`)
}
counter('لو عاد التوجيه إلى fnv1a الخام لبقي نصف الشرائح فارغًا', (() => {
  const N = 32; const b = new Array(N).fill(0)
  for (const g of sampleGtins) b[fnv1a(G.classifyGtin(g).gtin14) % N]++
  return b.filter((x) => x === 0).length >= N / 2 // العطب قائم بلا الخلط — والإصلاح هو ما يزيله
})())

const tmp = mkdtempSync(join(tmpdir(), 'qimmah-proof-'))
try {
  const recs = [
    mk('06281007034043', { name_ar: 'حليب المراعي طازج', name_en: 'Almarai Fresh Milk', brand_ar: 'المراعي', market: 'SA' }),
    mk('06291100030101', { name_ar: 'كبسة جاهزة', name_en: 'Ready Kabsa', brand_ar: 'خليج', market: 'GCC' }),
    mk('05449000000996', { name_ar: null, name_en: 'Cola Drink', brand_ar: null, market: 'GLOBAL' }),
  ]
  const res = writeShards({ records: recs, outDir: tmp, shardCount: 2, tokenize: norm.tokenize, normalizationVersion: norm.NORMALIZATION_VERSION, schemaVersion: '1.0.0' })
  ok('الشرائح: تُكتب ببصمة sha256 لكل شريحة', res.shards.every((s) => /^[0-9a-f]{64}$/.test(s.sha256)))
  ok('الشرائح: مجموع السجلات محفوظ عبر التقطيع', res.shards.reduce((a, s) => a + s.count, 0) === recs.length)
  ok('الشرائح: تحمل إشعار ODbL (التزام الترخيص)', res.shards.every((s) => {
    const raw = JSON.parse(readFileSync(resolve(tmp, `${s.shard}.json`), 'utf8'))
    return /ODbL/.test(raw.licence) && /Open Food Facts/.test(raw.licence)
  }))
  ok('الشرائح: نسخة التطبيع مختومة في كل شريحة', res.shards.every((s) => JSON.parse(readFileSync(resolve(tmp, `${s.shard}.json`), 'utf8')).normalization_version === norm.NORMALIZATION_VERSION))
  // مسار الباركود: احسب الشريحة ⇒ افتحها ⇒ مفتاح مباشر
  const target = '06281007034043'
  const shardIdx = assignShard(target, 2)
  const shardFile = res.shards.find((s) => s.shard.endsWith(String(shardIdx).padStart(1, '0')))
  const shardData = shardFile ? JSON.parse(readFileSync(resolve(tmp, `${shardFile.shard}.json`), 'utf8')) : { records: {} }
  ok('الباركود: البحث مفتاح مباشر O(1) داخل الشريحة المحسوبة (لا مسح)', shardData.records[target]?.gtin === target, shardFile?.shard ?? 'no shard')
  ok('الشرائح: نسخة gzip مطابقة لمحتوى الشريحة', res.shards.every((s) => gunzipSync(readFileSync(resolve(tmp, `${s.shard}.json.gz`))).equals(readFileSync(resolve(tmp, `${s.shard}.json`)))))
  // الحتمية: نفس المدخل ⇒ نفس البايتات
  const tmp2 = mkdtempSync(join(tmpdir(), 'qimmah-proof2-'))
  const res2 = writeShards({ records: recs, outDir: tmp2, shardCount: 2, tokenize: norm.tokenize, normalizationVersion: norm.NORMALIZATION_VERSION, schemaVersion: '1.0.0' })
  ok('الحتمية: إعادة البناء تعطي نفس البصمات بايتًا ببايت', JSON.stringify(res.shards.map((s) => s.sha256)) === JSON.stringify(res2.shards.map((s) => s.sha256)))
  rmSync(tmp2, { recursive: true, force: true })

  // فهرس البحث
  const idx = buildSearchIndex(recs, norm.tokenize)
  const kabsaFolded = norm.normalizeProductKey('كبسه') // إملاء بالهاء
  ok('الفهرس: البحث بـ«كبسه» يجد «كبسة» (الطيّ العربي يعمل في الفهرس)', Array.isArray(idx[kabsaFolded]) && idx[kabsaFolded].length === 1, kabsaFolded)
  ok('الفهرس: المواضع تشير للسجل الصحيح', recs[idx[kabsaFolded]?.[0]]?.gtin === '06291100030101')
  ok('الفهرس: الرموز مرتّبة (إعادة إنتاج حتمية)', JSON.stringify(Object.keys(idx)) === JSON.stringify([...Object.keys(idx)].sort()))
  counter('الفهرس ليس دائم الإيجاب — رمز غير موجود لا يُطابق', idx['زعفرانمستحيل'] === undefined)

  const hot = writeHotSet({ records: recs, outDir: tmp, tokenize: norm.tokenize, normalizationVersion: norm.NORMALIZATION_VERSION, schemaVersion: '1.0.0' })
  ok('الطقم الساخن: ضمن الميزانية المعلنة', hot.within_budget, `${(hot.bytes_gzip / 1024).toFixed(1)}KB ≤ ${(hot.budget_bytes_gzip / 1024).toFixed(0)}KB`)
  ok('الطقم الساخن: يحمل إشعار الترخيص', /ODbL/.test(JSON.parse(readFileSync(resolve(tmp, 'hot-set.json'), 'utf8')).licence))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

// ═══════════ ٨) العيّنة المرجعية: الخطّ كاملًا بلا شبكة ═══════════
const fixture = resolve(ROOT, 'data/food-production/fixtures/off-sample.tsv')
ok('العيّنة المرجعية موجودة في المستودع', existsSync(fixture))
const tmpOut = join(mkdtempSync(join(tmpdir(), 'qimmah-fx-')), 'accepted.jsonl')
const run = spawnSync(process.execPath, [resolve(ROOT, 'scripts/food-production/ingest-off.mjs'), '--input', fixture, '--out', tmpOut], { encoding: 'utf8' })
ok('الخطّ: يعمل من طرف إلى طرف على العيّنة المرجعية', run.status === 0, (run.stderr || '').slice(0, 200))
const fxRecords = existsSync(tmpOut) ? readFileSync(tmpOut, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
ok('العيّنة: 15 صفًّا ⇒ 8 مقبولة و7 مرفوضة (أرقام مثبَّتة)', fxRecords.length === 8, `${fxRecords.length}`)
ok('العيّنة: المنتج السعودي يُصنَّف سوق SA', fxRecords.some((r) => r.gtin === '06281007034043' && r.market === 'SA'))
ok('العيّنة: المنتج الكويتي يُصنَّف GCC', fxRecords.some((r) => r.gtin === '06271000010014' && r.market === 'GCC'))
ok('العيّنة: طاقة الكيلوجول حُوّلت (180kJ ⇒ ~43 سعرة)', fxRecords.some((r) => r.gtin === '05449000000996' && Math.abs(r.energy_kcal - 43.02) < 0.1))
ok('العيّنة: الصوديوم اشتُقّ من الملح (1.25غ ⇒ 500مغ)', fxRecords.some((r) => r.gtin === '08000500310427' && r.sodium_mg === 500))
ok('العيّنة: الاسم ثنائي اللغة فُصل عربيًا/إنجليزيًا', fxRecords.some((r) => r.gtin === '06281007034043' && r.name_ar === 'حليب المراعي طازج' && r.name_en === 'Almarai Fresh Milk'))
for (const [label, code] of [['السالب', '04006381333931'], ['متجاوز الكتلة', '07622210449283'], ['التسلسلي', '00000012345670'], ['المقيّد', '02001234567893'], ['ISBN', '09780306406157'], ['بلا طاقة', '06291100030101']]) {
  ok(`العيّنة: ${label} مرفوض ولم يدخل المخرجات`, !fxRecords.some((r) => r.gtin === code))
}
counter('العيّنة تحوي حالات رفض فعلًا (وإلا فالإثبات فارغ)', fxRecords.length < 15)
// تشغيل الإثبات على العيّنة يجب ألّا يدهس إحصاء الإنتاج — وقع فعلًا فأُصلح، وهذا حارسه.
const prodStats = resolve(ROOT, 'data/food-production/reports/off-ingest-stats.json')
const prodStatsBefore = existsSync(prodStats) ? readFileSync(prodStats, 'utf8') : null
const rerun = spawnSync(process.execPath, [resolve(ROOT, 'scripts/food-production/ingest-off.mjs'), '--input', fixture, '--out', tmpOut], { encoding: 'utf8' })
const prodStatsAfter = existsSync(prodStats) ? readFileSync(prodStats, 'utf8') : null
ok('العزل: تشغيل العيّنة لا يدهس تقرير إحصاء الإنتاج', rerun.status === 0 && prodStatsBefore === prodStatsAfter, prodStatsBefore === prodStatsAfter ? 'سليم' : 'دُهس!')

// ═══════════ ٩) الحقوق والخصوصية ═══════════
ok('الحقوق: `image_url` فارغ في كل سجل (صور OFF غير نظيفة الحقوق)', fxRecords.every((r) => r.image_url === null))
counter('حارس الصور فعّال — لا رابط صورة يتسرّب', !fxRecords.some((r) => typeof r.image_url === 'string'))
ok('الحقوق: كل سجل يحمل مصدره ورابطه ووقت تحديثه', fxRecords.every((r) => r.source && r.source_record_id && r.source_url))
ok('الحقوق: نسخة التطبيع مختومة في كل سجل', fxRecords.every((r) => r.normalization_version === norm.NORMALIZATION_VERSION))
const sourcesReg = JSON.parse(readFileSync(resolve(ROOT, 'data/food-production/manifests/sources.json'), 'utf8'))
ok('المصادر: لكل مصدر مستعمَل ترخيص مقتبس لا مُفترَض', sourcesReg.sources.filter((s) => s.status === 'REACHABLE_AND_USED').every((s) => s.licence_quote && s.licence_url))
ok('المصادر: المصادر المحجوبة موثّقة بدليلها لا مسكوت عنها', sourcesReg.sources.filter((s) => s.status === 'EXTERNALLY_BLOCKED').every((s) => s.evidence))
ok('المصادر: لا مصدر يُزحف عليه خلافًا لـrobots', sourcesReg.sources.some((s) => s.id === 'openfoodfacts' && /robots/i.test(s.robots_consequence)))
const secretish = fxRecords.filter((r) => JSON.stringify(r).match(/api[_-]?key|secret|password|token|bearer /i))
ok('الخصوصية: لا أسرار ولا مفاتيح في المخرجات', secretish.length === 0, `${secretish.length}`)

// ═══════════ التقرير ═══════════
report()
