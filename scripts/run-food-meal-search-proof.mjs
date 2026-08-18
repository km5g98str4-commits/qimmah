/**
 * إثبات اتحاد سلطة البحث في الطعام — [SOVEREIGN-FOOD-001].
 *
 * السؤال الذي يجيبه: **هل يجد من يكتب «شاورما» شاورما؟**
 *
 * ═══ الفجوة المقيسة قبل هذه الموجة ═══
 * `QuickMealLogger` كان يستدعي `catalog.search()` وحدها — أي الطقم الساخن المعبّأ
 * (٥٩٩ سجل باركود) لا غير. القياس المنفَّذ على الجذع
 * (`docs/execution/qimmah-sovereign-closure/recon/R6-food.md` §٥):
 *   شاورما ٠ · شاورما دجاج ٠ · كبسة ٠ · مندي ٠ · برجر ١ (خبز برجر) · بيتزا ١ (صلصة)
 * بينما `src/data/foodItems.ts` — المتاح في نفس الحزمة — كان يُرجع:
 *   شاورما ١٨ · كبسة ١٤ · برجر ٣١ · مندي ١٢ · دجاج ٩٢
 * **عطل تكامل مصدر بيانات، لا نقص بيانات.**
 *
 * ═══ لماذا هذا الإثبات ليس فراغًا ═══
 * يقرأ `public/food/` **الحقيقي** من القرص عبر `fetchText` مدعوم بنظام الملفات:
 * ملف غائب ⇒ `null`، تمامًا كما يفعل ٤٠٤. فلو حُذف `hot-set.json` سقط الإثبات،
 * ولا يمرّ على صفٍّ مُصطنَع في الذاكرة.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: القاعدة يجب أن تكون **قابلة للسقوط**، وإلا فهي بلا أثر. */
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

const [unified, { Catalog }, { createMemoryCache }, foodData, variants] = await Promise.all([
  loadTsModule('src/lib/food/unifiedSearch.ts'),
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/data/foodItems.ts'),
  loadTsModule('src/lib/food/queryVariants.ts'),
])

// ═══════════ جالب مدعوم بـ`public/food/` الحقيقي ═══════════
const PUBLIC_FOOD = resolve(ROOT, 'public/food')
const requested = []
const fetchText = async (url) => {
  requested.push(url)
  const rel = url.replace(/^\/food\//, '')
  try {
    return await readFile(resolve(PUBLIC_FOOD, rel), 'utf8')
  } catch {
    return null // ملف غائب = ٤٠٤، بلا رمي — نفس سلوك `appCatalog.fetchText`
  }
}

const cat = await Catalog.create({ fetchText, cache: createMemoryCache() })
await cat.init()
const stats = cat.getStats()
ok(
  `القراءة من القرص الحقيقي: الطقم الساخن محمَّل من public/food/ (${stats.hotSetCount} سجلًا)`,
  stats.hotSetLoaded && stats.hotSetCount > 0,
  `${stats.hotSetCount}`,
)
ok('الأصناف المنسَّقة محمَّلة من الوحدة نفسها لا من نسخة', foodData.foodItems.length > 600, `${foodData.foodItems.length} صنفًا`)

// ═══════════ ١) بطارية الاستعلامات — الرقم قبل والرقم بعد ═══════════
/**
 * `before` = القياس المنفَّذ على الجذع (recon §٥-أ): `cat.search(q,{limit:8})` وحدها.
 * يُعاد حسابه هنا حيًّا لا نقلًا، فلا يتحوّل رقم التقرير إلى أسطورة.
 */
const BATTERY = [
  { q: 'شاورما', min: 10 },
  { q: 'شاورما دجاج', min: 5 },
  { q: 'كبسة', min: 8 },
  { q: 'مندي', min: 8 },
  { q: 'برجر', min: 10 },
  { q: 'بيتزا', min: 8 },
  { q: 'رز', min: 3 },
  { q: 'دجاج', min: 15 },
  { q: 'rice', min: 3 },
  { q: 'chicken', min: 5 },
]
const CONTROLS = ['squat', 'zzzz', 'squats']

const rows = []
for (const { q, min } of BATTERY) {
  const before = (await cat.search(q, { limit: 8 })).length
  const after = await unified.searchAllFoods(q, { catalog: cat, lang: 'ar', limit: 50 })
  rows.push({ q, before, after: after.length, top: after[0]?.item.nameAr ?? '—', topSource: after[0]?.source ?? '—' })
  ok(`«${q}»: ${before} ⇐ ${after.length} نتيجة (الحدّ ${min})`, after.length >= min, `الأعلى: ${after[0]?.item.nameAr ?? '—'}`)
}
for (const q of CONTROLS) {
  const n = (await unified.searchAllFoods(q, { catalog: cat, lang: 'ar', limit: 50 })).length
  ok(`ضابط سالب «${q}»: صفر نتيجة`, n === 0, `${n}`)
}

// ═══════════ ٢) الترتيب: الساندويتش قبل رغيفه ═══════════
//
// هذا هو **مقصد** الاتحاد لا أثرًا جانبيًا: من كتب «برجر» يريد الوجبة. والطقم
// الساخن لا يملك وجبة برجر واحدة — أقرب ما فيه «خبز البرجر بالسمسم».
const burger = await unified.searchAllFoods('برجر', { catalog: cat, lang: 'ar', limit: 50 })
ok('«برجر»: النتيجة الأولى من المصدر المنسَّق لا المعبّأ', burger[0]?.source === 'curated', `${burger[0]?.source} — ${burger[0]?.item.nameAr}`)
ok('«برجر»: النتيجة الأولى ليست خبزًا', !/خبز/.test(burger[0]?.item.nameAr ?? ''), `${burger[0]?.item.nameAr}`)
const bunIndex = burger.findIndex((r) => /خبز/.test(r.item.nameAr))
ok(
  bunIndex < 0 ? '«برجر»: خبز البرجر ليس ضمن المعروض' : `«برجر»: خبز البرجر هبط إلى الموضع ${bunIndex + 1}`,
  bunIndex !== 0,
  `موضعه ${bunIndex < 0 ? 'خارج القائمة' : bunIndex + 1}`,
)
const pizza = await unified.searchAllFoods('بيتزا', { catalog: cat, lang: 'ar', limit: 50 })
ok('«بيتزا»: النتيجة الأولى ليست صلصة', !/صلصة/.test(pizza[0]?.item.nameAr ?? ''), `${pizza[0]?.item.nameAr}`)

/**
 * ⟲ التأكيد المضادّ للترتيب (§4.2): محاكاة **اللصق بترتيب المصدر** — أي
 * السلوك الذي تستبدله هذه الموجة. لو كان الترتيب ترتيبَ مصدرٍ لا ترتيبَ مطابقة،
 * لتصدَّر المعبّأُ حين يُلصق أولًا. الفحص يسمّي ذلك بدل أن يمرّ صامتًا.
 */
{
  const packagedFirst = await unified.rankPackaged(cat, 'برجر')
  const naiveTop = packagedFirst[0]
  counter(
    'محاكاة اللصق بترتيب المصدر تُكشف — أعلى المعبّأ لـ«برجر» خبزٌ لا وجبة',
    !!naiveTop && /خبز/.test(naiveTop.product.name_ar ?? ''),
    `${naiveTop?.product.name_ar ?? 'لا مرشّح معبّأ'}`,
  )
  counter(
    'وسلّم القوّة يضعه تحت المنسَّق فعلًا — لا بالمصادفة',
    burger.findIndex((r) => r.source === 'curated') < (bunIndex < 0 ? Number.POSITIVE_INFINITY : bunIndex),
  )
}

// ═══════════ ٣) المصدر يبقى معلَنًا — نسب ODbL لا يكذب في أي اتجاه ═══════════
const OFF_PREFIX = 'off:'
const allCurated = burger.filter((r) => r.source === 'curated')
ok('المنسَّق لا يحمل بادئة off: — فلا يُنسب صنف قِمّة لمصدر لم يأتِ منه', allCurated.every((r) => !r.item.id.startsWith(OFF_PREFIX)), `${allCurated.length} صنفًا`)
const packagedAnywhere = (await unified.searchAllFoods('دجاج', { catalog: cat, lang: 'ar', limit: 50 })).filter((r) => r.source === 'packaged')
ok('المعبّأ يحمل بادئة off: — فيظهر النسب حين يظهر', packagedAnywhere.length > 0 && packagedAnywhere.every((r) => r.item.id.startsWith(OFF_PREFIX)), `${packagedAnywhere.length} سجلًا`)

// ═══════════ ٤) الباركود بلا مساس — نفس السلوك حرفيًا ═══════════
const hotRaw = await readFile(resolve(PUBLIC_FOOD, 'hot-set.json'), 'utf8')
const hotSet = JSON.parse(hotRaw)
const sampleGtin = hotSet.order[7]
const netBefore = cat.getStats().networkFetches
const scanned = await cat.lookupByGtin(sampleGtin)
ok('الباركود: GTIN من الطقم الساخن يُحلّ كما كان', scanned?.gtin === sampleGtin, `${scanned?.gtin}`)
ok('الباركود: بلا أي طلب شبكة (الطقم في الذاكرة)', cat.getStats().networkFetches === netBefore)
ok('الباركود: باركود غير صالح يبقى `null` لا رميًا', (await cat.lookupByGtin('123')) === null)

// ═══════════ ٥) التطبيع العربي وردّ المفرد الإنجليزي ═══════════
const countOf = async (q) => (await unified.searchAllFoods(q, { catalog: cat, lang: 'ar', limit: 50 })).length
const plain = await countOf('دجاج')
const diacritics = await countOf('دَجَاج')
const tatweel = await countOf('دجـاج')
ok(`التشكيل: «دَجَاج» ≡ «دجاج» (${diacritics} = ${plain})`, diacritics === plain && plain > 0)
ok(`التطويل: «دجـاج» ≡ «دجاج» (${tatweel} = ${plain})`, tatweel === plain && plain > 0)
const taMarbuta = await countOf('كبسه')
const taMarbutaAlt = await countOf('كبسة')
ok(`التاء المربوطة: «كبسه» ≡ «كبسة» (${taMarbuta} = ${taMarbutaAlt})`, taMarbuta === taMarbutaAlt && taMarbutaAlt > 0)

ok('ردّ المفرد: `squats` ⇒ `squat`', variants.singularizeLatin('squats') === 'squat')
ok('ردّ المفرد: `berries` ⇒ `berry`', variants.singularizeLatin('berries') === 'berry')
ok('ردّ المفرد: `sandwiches` ⇒ `sandwich`', variants.singularizeLatin('sandwiches') === 'sandwich')
/**
 * ⟲ التأكيد المضادّ لطيّ الجمع (§4.2): القاعدة **ليست** «احذف كل s أخيرة».
 * لو كانت كذلك لتحوّل `hummus ⇒ hummu` و`rice ⇒ ric`، وامتلأ البحث بضجيج.
 */
counter('حذف الـs الأعمى مستبعَد — `hummus` تبقى كما هي', variants.singularizeLatin('hummus') === 'hummus')
counter('و`couscous` كذلك — نهاية `us` ليست جمعًا', variants.singularizeLatin('couscous') === 'couscous')
counter('و`grass` كذلك — نهاية `ss`', variants.singularizeLatin('grass') === 'grass')
counter('لكن الجمع الحقيقي يمرّ — `dates` ⇒ `date` و`oats` ⇒ `oat`', variants.singularizeLatin('dates') === 'date' && variants.singularizeLatin('oats') === 'oat')
counter('و`rice` لا تُمَسّ (لا تنتهي بجمع)', variants.singularizeLatin('rice') === 'rice')
counter('والكلمة القصيرة محميّة — `abs` تبقى `abs`', variants.singularizeLatin('abs') === 'abs')
counter('والعربية لا تمرّ بقواعد الجمع الإنجليزي — «تمرس» تبقى كما هي', variants.singularizeLatin('تمرس') === 'تمرس')
const chickenPlural = await countOf('chickens')
const chickenSingular = await countOf('chicken')
ok(`ردّ المفرد يصل النتائج فعلًا: «chickens» ⇒ ${chickenPlural} (المفرد ${chickenSingular})`, chickenPlural > 0 && chickenPlural === chickenSingular)
counter('وردّ المفرد لا يخترع مطابقة — `squats` و`squat` كلاهما صفر', (await countOf('squats')) === 0 && (await countOf('squat')) === 0)

// ═══════════ ٦) الصدق: لا ادّعاء ذيل طويل والشرائح غائبة ═══════════
const availability = cat.longTailAvailability()
ok(
  `الصدق: القابل للبحث الآن ${availability.searchableRecords} سجلًا معبّأً — لا ${availability.declaredRecords} المعلَنة في البيان`,
  availability.searchableRecords < availability.declaredRecords,
  `معلَن ${availability.declaredRecords} · قابل ${availability.searchableRecords}`,
)
ok(
  `الصدق: حكم الذيل الطويل «${availability.verdict}» — لا يُخمَّن قبل المحاولة`,
  ['unproven', 'available', 'unavailable'].includes(availability.verdict),
  `${availability.attempts} محاولة · ${availability.failures} فشلًا`,
)

// ═══════════ التقرير ═══════════
console.log('════════ إثبات اتحاد سلطة البحث في الطعام — قِمّة ════════\n')
console.log('┌ الاستعلام            │ قبل │ بعد │ الأعلى')
for (const r of rows) {
  console.log(`│ ${r.q.padEnd(18)} │ ${String(r.before).padStart(3)} │ ${String(r.after).padStart(3)} │ [${r.topSource}] ${r.top}`)
}
console.log('└──────────────────────┴─────┴─────┴────────\n')

let failed = 0
for (const c of checks) {
  console.log(`${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
  if (!c.pass) failed++
}
const counters = checks.filter((c) => c.counter).length
console.log('')
if (failed) {
  console.log(`❌ فشل الإثبات: ${failed} من ${checks.length} فحصًا.`)
  process.exit(1)
}
console.log(`✅ نجحت كل الفحوص — ${checks.length} فحصًا (منها ${counters} تأكيدًا مضادًّا).`)
console.log(`   المصدران: ${foodData.foodItems.length} صنفًا منسَّقًا · ${stats.hotSetCount} سجلًا معبّأً · القابل للبحث ${availability.searchableRecords}`)
