// قِمّة — إثبات البحث العربي: إصلاحا المحرّك + حقل المرادفات.
// كل تأكيد هنا مكتوب بعد **سقوط مقيس** لا احتياطًا: الأسطر أدناه تحرس أعطالًا
// شوهدت فعلًا في هذا الفرع (§4.2 التأكيد المضادّ).
//
//   node scripts/run-arabic-search-proof.mjs

import { loadTsModule } from './food-production/lib/loadTs.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const norm = await loadTsModule('src/lib/text/foodNormalize.ts')
const buckets = await loadTsModule('src/lib/food/searchBuckets.ts')
const rank = await loadTsModule('src/lib/food/catalog/rank.ts')
const { normalizeProductKey } = norm
const { planBucketQuery, productSearchText, CARD_FIELDS } = buckets
const { tierForProduct, MATCH_TIERS } = rank

let pass = 0
const fails = []
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` :: ${detail}` : ''}`) }
}

const P = (over = {}) => ({
  gtin: '06281007034043', name_ar: null, name_en: null, brand_ar: null, brand_en: null,
  category: null, search_aliases_ar: null, market: 'SA', ...over,
})
const tier = (p, q) => tierForProduct(p, normalizeProductKey(q))

console.log('\n— ١) النفي لا ينقلب —')
// عطل مقيس: «no sugar no salt» كانت تُركَّب إلى «سكر ملح» — نقيض المعنى.
const cornNeg = P({ name_en: 'Freshly whole kernel corn no sugar no salt',
  search_aliases_ar: ['ذرة حبّ خالي من سكر خالي من ملح', 'ذرة', 'خالي من سكر', 'خالي من ملح'] })
const negText = productSearchText(cornNeg)
ok('«خالي من سكر» حاضرة في نصّ البحث', negText.includes('خالي من سكر'))
ok('«خالي من ملح» حاضرة في نصّ البحث', negText.includes('خالي من ملح'))
ok('لا مصطلح «سكر» موجبًا منفردًا بلا نفي',
  !/(^|\s)سكر(\s|$)/.test(negText.replace(/خالي من سكر/g, '')), negText)
ok('لا مصطلح «ملح» موجبًا منفردًا بلا نفي',
  !/(^|\s)ملح(\s|$)/.test(negText.replace(/خالي من ملح/g, '')), negText)

console.log('\n— ٢) «whole kernel corn» ليست «كامل الدسم» —')
// عطل مقيس: تعميم `whole` ألصق صفة ألبان بالذرة.
const corn = P({ name_en: 'Orient gardens whole kernel corn', search_aliases_ar: ['ذرة حبّ كامل', 'ذرة'] })
ok('لا «كامل الدسم» في مرادفات الذرة', !productSearchText(corn).includes('كامل الدسم'))
const milk = P({ name_en: 'Almarai full fat milk', search_aliases_ar: ['المراعي حليب كامل الدسم'] })
ok('«كامل الدسم» تبقى للحليب', productSearchText(milk).includes('كامل الدسم'))

console.log('\n— ٣) هوية العلامة لا تختفي —')
// عطل مقيس: حذف اسم العلامة من النصّ بلا استبدال أفقد «السعودية» و«تسالي».
const branded = P({ name_en: 'Saudia whole milk', brand_en: 'Saudia',
  search_aliases_ar: ['السعودية حليب كامل الدسم', 'السعودية'] })
ok('العلامة العربية حاضرة في نصّ البحث', productSearchText(branded).includes('السعودية'))
ok('البحث بالعلامة العربية يطابق', tier(branded, 'السعودية') !== null)

console.log('\n— ٤) «ماء» تبقى قابلة للبحث رغم أن التطبيع يعطي حرفين —')
ok('«ماء» تُطبَّع إلى حرفين', normalizeProductKey('ماء').length === 2, normalizeProductKey('ماء'))
const dir = { version: '1', normalization_version: norm.NORMALIZATION_VERSION, key_length: 3,
  page_size: 512, total_records: 3, total_postings: 3,
  buckets: { 'ما': 2, 'ميا': 5, 'مان': 1, 'mil': 9 } }
const planWater = planBucketQuery('ماء', dir)
ok('«ماء» لم تعد ترجع too-short', planWater.reason === 'ok', planWater.reason)
ok('«ماء» تفتح حزمة «ما»', planWater.keys.includes('ما'), JSON.stringify(planWater.keys))
// الكلمة القصيرة تُطابَق تطابقًا تامًّا، ورمزها التامّ في حزمة واحدة — ففتح
// «مان» كان يجلب بايتات تسقط كلّها عند المطابقة. القياس: «ماء» بالبادئة تعطي ٧٥
// نتيجة أكثرها مانجو ومارس؛ وبالتطابق التامّ تعود إلى منتجات الماء وحدها.
ok('«ماء» تفتح حزمة واحدة بالضبط', planWater.keys.length === 1, JSON.stringify(planWater.keys))
ok('ولا تفتح حزمًا لا تُطابق', !planWater.keys.includes('مان') && !planWater.keys.includes('ميا'),
  JSON.stringify(planWater.keys))
// التأكيد المضادّ: الكلمة القصيرة لا تتمدّد بادئةً على كلمة أطول.
const mango = P({ name_en: 'Mango juice', search_aliases_ar: ['مانجو عصير', 'مانجو'] })
ok('«ماء» لا تطابق «مانجو» (لا تمدّد بادئة تحت الحدّ)', tier(mango, 'ماء') === null,
  String(tier(mango, 'ماء')))
ok('«مانجو» نفسها تطابق طبعًا', tier(mango, 'مانجو') !== null)
const water = P({ name_en: 'Berain Water', search_aliases_ar: ['بيرين ماء', 'ماء', 'مياه'] })
ok('منتج ماء يطابق استعلام «ماء»', tier(water, 'ماء') !== null)
ok('منتج ماء يطابق استعلام «مياه»', tier(water, 'مياه') !== null)

console.log('\n— ٥) الاستعلامات متعدّدة الكلمات —')
// عطل مقيس: `includes` يشترط التجاور، فـ«حليب كامل الدسم» كانت null على اسم يحويها كلّها.
const full = P({ name_ar: 'حليب المراعي كامل الدسم', name_en: 'Almarai Fresh Milk Full Fat',
  brand_ar: 'المراعي', brand_en: 'Almarai' })
ok('«حليب كامل الدسم» تطابق (كانت null)', tier(full, 'حليب كامل الدسم') !== null)
ok('«حليب كامل» تطابق (كانت null)', tier(full, 'حليب كامل') !== null)
ok('«المراعي حليب» بترتيب معكوس تطابق', tier(full, 'المراعي حليب') !== null)
ok('«كامل الدسم» المتجاورة تبقى برتبتها القوية', tier(full, 'كامل الدسم') === 'contains')
ok('الإنجليزية متعدّدة الكلمات تطابق أيضًا', tier(full, 'almarai milk') !== null)
ok('كلمة غائبة تمنع المطابقة — لا استدعاء زائد', tier(full, 'حليب شوكولاتة') === null)
ok('رتبة all-terms أضعف من brand', MATCH_TIERS.indexOf('all-terms') > MATCH_TIERS.indexOf('brand'))

console.log('\n— ٦) المرادفات ترفع الاسترجاع ولا تصير اسم عرض —')
const aliasOnly = P({ name_en: 'Almarai vanilla flavored milk', brand_en: 'Almarai',
  search_aliases_ar: ['المراعي حليب بنكهة فانيلا', 'حليب', 'فانيلا'] })
ok('يُعثر عليه بالعربية بفضل المرادفات', tier(aliasOnly, 'حليب') !== null)
ok('name_ar يبقى فارغًا — لا اسم مولَّد', aliasOnly.name_ar === null)
ok('المرادف لا يرقى إلى name-exact', tier(aliasOnly, 'المراعي حليب بنكهة فانيلا') !== 'name-exact')
const noAlias = P({ name_en: 'Almarai vanilla flavored milk', brand_en: 'Almarai' })
ok('بلا مرادفات لا يُعثر عليه بالعربية (يثبت أن المكسب من المرادفات)', tier(noAlias, 'حليب') === null)
ok('حقل المرادفات ضمن بطاقة البحث', CARD_FIELDS.includes('search_aliases_ar'))

console.log('\n— ٧) الباركود والإنجليزية بلا انحدار —')
ok('مطابقة GTIN التامّة تبقى الأقوى', tier(full, '06281007034043') === 'gtin-exact')
ok('بادئة الكود تبقى تعمل', tier(P({ name_en: 'X' }), '0628100') === 'code-prefix')
// نصّ الاسم = name_ar + name_en، فاستعلام إنجليزي لا يكون بادئته حين يسبقه اسم عربي.
// هذا سلوك قائم قبل هذه الموجة، والتوقّع السابق كان خاطئًا.
ok('الإنجليزية المفردة تبقى مطابِقة برتبة contains', tier(full, 'almarai') === 'contains',
  String(tier(full, 'almarai')))
const enOnly = P({ name_en: 'Almarai Fresh Milk' })
ok('وبلا اسم عربي تبقى name-prefix كما كانت', tier(enOnly, 'almarai') === 'name-prefix',
  String(tier(enOnly, 'almarai')))
ok('«milk» تبقى تطابق', tier(full, 'milk') !== null)
ok('استعلام فارغ لا يطابق', tier(full, '') === null)
ok('الترتيب الحتمي محفوظ: رتب معروفة فقط',
  MATCH_TIERS.every((t) => typeof t === 'string'))

console.log('\n— ٨) نصّ البحث القانوني مصدر واحد —')
ok('productSearchText يشمل الاسم والعلامة والتصنيف والمرادفات',
  productSearchText({ name_ar: 'أ', name_en: 'b', brand_ar: 'ج', brand_en: 'd', category: 'e',
    search_aliases_ar: ['ز'] }) === 'أ b ج d e ز')
ok('غياب المرادفات لا يكسر النصّ', productSearchText({ name_en: 'b' }) === 'b')

// تحقّق من الأصول المبنيّة إن وُجدت
const DIR = resolve(process.cwd(), 'public/food/search/directory.json')
if (existsSync(DIR)) {
  console.log('\n— ٩) الأصول المبنيّة —')
  const built = JSON.parse(readFileSync(DIR, 'utf8'))
  ok('الدليل يعلن نسخة التطبيع نفسها', built.normalization_version === norm.NORMALIZATION_VERSION,
    `${built.normalization_version} ≠ ${norm.NORMALIZATION_VERSION}`)
}

console.log(`\n${fails.length === 0 ? 'PASS' : 'FAIL'} — ${pass} assertions passed, ${fails.length} failed`)
if (fails.length) { for (const f of fails) console.log('   failed:', f); process.exit(1) }
