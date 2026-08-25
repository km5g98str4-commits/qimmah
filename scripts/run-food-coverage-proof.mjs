/**
 * إثبات تغطية بحث الطعام — **هل يجد السعودي ما أكله فعلًا؟**
 *
 * ═══ السؤال الذي يجيبه ═══
 * شكوى المؤسّس كانت «التغطية»، والمطلوب **ليس عدد سجلات**: هو أن يكتب المستخدم
 * ما أكل — بالعربية أو الإنجليزية، بإملائه هو لا بإملاء البيانات — فيجد نتيجة
 * أولى **معقولة**. ولذلك لا يفحص هذا الإثبات «هل رجعت نتيجة» بل «هل النتيجة
 * الأولى هي الشيء المطلوب»، ولكل استعلام **توقّع مسمّى** يسقط باسمه إن انكسر.
 *
 * ═══ ما لا يدّعيه ═══
 * الذيل الطويل (٥٩٬٩٤١ سجلًا) **غير مشحون في المستودع**: `public/food/shards/`
 * غير ملتزم بالاتفاق، والقابل للبحث هنا هو الطقم الساخن (٥٩٩) + المنسَّق. وأي
 * تحسّن يقيسه هذا الإثبات هو **جودة بحث وتنسيق**، لا وصلٌ لقاعدة لم تُشحن.
 *
 * ═══ رقم «قبل» يُعاد حسابه لا يُنقل ═══
 * المطابق القديم مُعاد بناؤه هنا حرفيًا (§٠): تضمين الاستعلام **كسلسلة واحدة**،
 * سلّم يفصل العربي عن الإنجليزي، وقوائم مقابلات **بلا** ما أضافته هذه الموجة،
 * وقاعدة **بلا** أصنافها وكلماتها المفتاحية الجديدة. فرقم «قبل» يُحسب في كل
 * تشغيل ولا يتحوّل إلى أسطورة في تقرير.
 *
 * التشغيل: node scripts/run-food-coverage-proof.mjs
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: القاعدة يجب أن تكون **قابلة للسقوط**، وإلا فهي بلا أثر (§4.2). */
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

const [unified, foodData, variantsMod, normalizeMod, gtinMod, brandMod, appCatalog, { Catalog }, { createMemoryCache }, barcode] = await Promise.all([
  loadTsModule('src/lib/food/unifiedSearch.ts'),
  loadTsModule('src/data/foodItems.ts'),
  loadTsModule('src/lib/food/queryVariants.ts'),
  loadTsModule('src/lib/text/foodNormalize.ts'),
  loadTsModule('src/lib/food/gtin.ts'),
  loadTsModule('src/lib/food/brandCoverage.ts'),
  loadTsModule('src/lib/food/catalog/appCatalog.ts'),
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/features/barcode/validateBarcode.ts'),
])

const { foodItems, normalizeSearch, LOANWORD_SPELLINGS, SCRIPT_TRANSLITERATIONS } = foodData

// الكتالوج المعبّأ من `public/food/` الحقيقي — ملف غائب ⇒ null، تمامًا كـ404.
const PUBLIC_FOOD = resolve(ROOT, 'public/food')
const fetchText = async (url) => {
  try { return await readFile(resolve(PUBLIC_FOOD, url.replace(/^\/food\//, '')), 'utf8') } catch { return null }
}
const cat = await Catalog.create({ fetchText, cache: createMemoryCache() })
await cat.init()
ok(`الكتالوج المعبّأ محمَّل من القرص (${cat.getStats().hotSetCount} سجلًا)`, cat.getStats().hotSetLoaded && cat.getStats().hotSetCount > 0)
ok(`القاعدة المنسَّقة محمَّلة (${foodItems.length} صنفًا)`, foodItems.length > 600)

// ═════════════════════════════════════════════════════════════════════════
// بطارية الاستعلامات — قائمة المؤسّس، عربيةً وإنجليزيةً، بتوقّع مسمّى لكل سطر.
// التوقّع **جوهر الإثبات**: «رجعت نتيجة» لا يعني «وجد أكله». يقارَن التوقّع
// بالاسم المعروض في لغة البحث، بعد التطبيع العربي على الطرفين.
// ═════════════════════════════════════════════════════════════════════════
const AR_BATTERY = [
  ['كبسة', ['كبسة']], ['برياني', ['برياني']], ['شاورما', ['شاورما']], ['مندي', ['مندي']],
  ['مضغوط', ['مضغوط']], ['البيك', ['البيك']], ['بروست', ['بروست']], ['دجاج مقلي', ['بروست', 'مقلي']],
  ['المراعي', ['المراعي', 'almarai']], ['حليب', ['حليب']], ['لبن', ['لبن']], ['زبادي', ['زبادي']],
  ['جبن', ['جبن']], ['ستاربكس', ['ستاربكس']], ['لاتيه', ['لاتيه']], ['كابتشينو', ['كابتشينو']],
  ['قهوة عربية', ['قهوة عربية']], ['دنكن', ['دانكن']], ['دونات', ['دونات']], ['صب واي', ['صب واي']],
  ['ماكدونالدز', ['ماكدونالدز']], ['بيج ماك', ['بيج ماك']], ['بطاطس مقلية', ['بطاطس مقلية']],
  ['كنتاكي', ['كنتاكي']], ['هرفي', ['هرفي']], ['شاورمر', ['شاورمر']], ['ماما نورة', ['ماما نورة']],
  ['الرومانسية', ['الرومانسية']], ['مايسترو', ['ماسترو']], ['دومينوز', ['دومينوز']],
  ['بيتزا', ['بيتزا']], ['بيتزا هت', ['بيتزا هت']], ['نادك', ['نادك', 'nadec']], ['عصير', ['عصير']],
  ['تمر', ['تمر']], ['خبز عربي', ['خبز عربي']], ['خبز توست', ['خبز توست']], ['رز بسمتي', ['رز']],
  ['معكرونة', ['مكرونة', 'معكرونة']], ['بيض', ['بيض']], ['صدر دجاج', ['صدر دجاج']], ['لحم', ['لحم']],
  ['سمك', ['سمك']], ['تونة', ['تونة']], ['شوكولاتة', ['شوكولاتة']], ['بسكويت', ['بسكويت']],
  ['كيك', ['كيك']], ['معمول', ['معمول']], ['كنافة', ['كنافة']], ['بروتين واي', ['بروتين']],
  ['مكسرات', ['لوز', 'كاجو', 'جوز', 'فستق', 'فول سوداني']], ['عسل', ['عسل']],
  ['زيت زيتون', ['زيت زيتون']], ['طماطم', ['طماطم']], ['خيار', ['خيار']], ['تفاح', ['تفاح']], ['موز', ['موز']],
]

const EN_BATTERY = [
  ['kabsa', ['kabsa']], ['biryani', ['biryani']], ['shawarma', ['shawarma']], ['mandi', ['mandi']],
  ['madghout', ['madghoot', 'madghout']], ['albaik', ['albaik']], ['broast', ['broast']],
  ['fried chicken', ['broast', 'fried']], ['almarai', ['almarai']], ['milk', ['milk']],
  ['laban', ['laban']], ['yogurt', ['yogurt']], ['cheese', ['cheese']], ['starbucks', ['starbucks']],
  ['latte', ['latte']], ['cappuccino', ['cappuccino']], ['arabic coffee', ['arabic coffee']],
  ['dunkin', ['dunkin']], ['donut', ['donut']], ['subway', ['subway']], ['mcdonalds', ['mcdonald']],
  ['big mac', ['big mac']], ['french fries', ['french fries']], ['kfc', ['kfc']], ['herfy', ['herfy']],
  ['shawarmer', ['shawarmer']], ['mama noura', ['mama noura']], ['al romansiah', ['romansiah']],
  ['maestro pizza', ['maestro']], ['dominos', ['domino']], ['pizza', ['pizza']], ['pizza hut', ['pizza hut']],
  ['nadec', ['nadec']], ['juice', ['juice']], ['dates', ['date']], ['arabic bread', ['bread']],
  ['toast bread', ['toast']], ['basmati rice', ['rice']], ['pasta', ['pasta']], ['eggs', ['egg']],
  ['chicken breast', ['chicken breast']], ['beef', ['beef']], ['fish', ['fish']], ['tuna', ['tuna']],
  ['chocolate', ['chocolate']], ['biscuit', ['biscuit']], ['cake', ['cake']], ['maamoul', ['maamoul']],
  ['kunafa', ['kunafa', 'kunafah']], ['whey protein', ['whey protein']], ['nuts', ['nut']],
  ['honey', ['honey']], ['olive oil', ['olive oil']], ['tomato', ['tomato']], ['cucumber', ['cucumber']],
  ['apple', ['apple']], ['banana', ['banana']],
]

const norm = (s) => normalizeSearch(String(s ?? ''))
const satisfies = (name, expected) => {
  const n = norm(name)
  return expected.some((e) => n.includes(norm(e)))
}

// ═════════════════════════════════════════════════════════════════════════
// §٠ — المطابق **القديم** مُعاد بناؤه، فرقم «قبل» يُحسب لا يُنقل.
// ═════════════════════════════════════════════════════════════════════════

/** المجموعات التي أضافتها هذه الموجة — تُنزَع لإعادة بناء الحالة السابقة. */
const WAVE_LOANWORDS = new Set(['ماسترو', 'دانكن', 'مارغريتا'])
const WAVE_TRANSLIT = new Set(['مضغوط'])
/** الكلمات المفتاحية التي أضافتها هذه الموجة إلى أصناف قائمة. */
const WAVE_KEYWORDS = {
  'broast-chicken': ['دجاج مقلي', 'fried chicken', 'broast', 'بروست', 'دجاج مقرمش'],
  'white-rice': ['بسمتي', 'basmati', 'رز مسلوق', 'plain rice', 'ارز ابيض'],
  'pita-bread': ['خبز', 'pita', 'khubz', 'صامولي', 'bread'],
  almonds: ['مكسرات', 'nuts', 'لوز', 'almond'],
  walnuts: ['مكسرات', 'nuts', 'جوز', 'walnut', 'عين جمل'],
  cashews: ['مكسرات', 'nuts', 'كاجو', 'cashew'],
  peanuts: ['مكسرات', 'nuts', 'فول سوداني', 'peanut'],
  pistachio: ['مكسرات', 'nuts', 'فستق', 'pistachio'],
  water: ['مياه', 'ماي', 'water', 'مويه'],
  dates: ['بلح', 'رطب', 'dates', 'تمور'],
}
/** الأصناف العامّة التي أضافتها هذه الموجة. */
const WAVE_ITEM_IDS = new Set(['gcc-41', 'gcc-42', 'gcc-43', 'gcc-44', 'gcc-45', 'gcc-46'])

const legacyReplacements = (groups, skip) => groups
  .filter((g) => !skip.has(g[0]))
  .flatMap(([canonical, ...vs]) => vs.map((v) => [norm(v), norm(canonical)]))
  .sort((a, b) => b[0].length - a[0].length)
const LEGACY_MAP = [
  ...legacyReplacements(LOANWORD_SPELLINGS, WAVE_LOANWORDS),
  ...legacyReplacements(SCRIPT_TRANSLITERATIONS, WAVE_TRANSLIT),
].sort((a, b) => b[0].length - a[0].length)

/** التطبيع القديم: **تبديل مدمّر** بلا حفظ الصيغة الخام (وهو أصل عطل `cake`). */
function legacyCanon(text) {
  let out = norm(text)
  for (const [v, c] of LEGACY_MAP) if (out.includes(v)) out = out.split(v).join(c)
  return out
}

/** القاعدة كما كانت: بلا أصناف الموجة وبلا كلماتها المفتاحية. */
const LEGACY_ITEMS = foodItems
  .filter((f) => !WAVE_ITEM_IDS.has(f.id))
  .map((f) => {
    const added = new Set((WAVE_KEYWORDS[f.id] ?? []).map(norm))
    return { item: f, keywords: (f.keywords ?? []).filter((k) => !added.has(norm(k))) }
  })

/** السلّم القديم: ٠–٢ عربي · ٣–٤ إنجليزي · ٥–٦ كلمات مفتاحية · تضمين سلسلة كاملة. */
const LEGACY_CURATED_STRENGTH = [1, 3, 5, 7, 9, 11, 13]
function legacySearch(query) {
  const q = legacyCanon(query)
  if (!q) return []
  const scored = []
  for (let i = 0; i < LEGACY_ITEMS.length; i++) {
    const { item, keywords } = LEGACY_ITEMS[i]
    const ar = legacyCanon(item.nameAr)
    const en = legacyCanon(item.nameEn)
    const kws = keywords.map(legacyCanon)
    let score = Infinity
    if (ar === q) score = 0
    else if (ar.startsWith(q)) score = 1
    else if (ar.includes(q)) score = 2
    else if (en.startsWith(q)) score = 3
    else if (en.includes(q)) score = 4
    else if (kws.some((k) => k === q || k.startsWith(q))) score = 5
    else if (kws.some((k) => k.includes(q))) score = 6
    if (score !== Infinity) scored.push({ item, score, i })
  }
  return scored.sort((a, b) => (a.score - b.score) || (a.i - b.i)).slice(0, 12)
}

/** «قبل» الموحَّد: منسَّق قديم + معبّأ حقيقي، بلا أرضية الصيغ المخمَّنة. */
async function legacyUnified(query, lang) {
  const curated = legacySearch(query).map(({ item, score }) => ({
    item, source: 'curated', strength: LEGACY_CURATED_STRENGTH[score] ?? 14,
  }))
  const packaged = (await unified.rankPackaged(cat, query)).map((h) => ({ ...h, derivedOnly: false }))
  return unified.mergeUnified(curated, packaged, lang, 18)
}

// ═════════════════════════════════════════════════════════════════════════
// §١ — قبل / بعد، استعلامًا استعلامًا.
// ═════════════════════════════════════════════════════════════════════════
const report = { ar: { before: 0, after: 0, fixed: [] }, en: { before: 0, after: 0, fixed: [] } }
/**
 * مقياس ثانٍ **مستقلّ عن التغطية**: كم استعلامًا تتصدّره نتيجة **منسَّقة**؟
 *
 * لماذا يلزم رقمان لا رقم: «رجعت نتيجة تحمل الكلمة» ليس «وجد أكله». بحث `milk`
 * كان يُرجع «Milk — TOPS» فيمرّ من فحص التغطية وهو ضجيج عبوة، بينما المطلوب
 * «حليب كامل الدسم». فالتغطية تقيس **العثور**، وهذا يقيس **جودة الصدارة**.
 */
const curatedTop = { before: 0, after: 0 }

for (const [lang, battery] of [['ar', AR_BATTERY], ['en', EN_BATTERY]]) {
  const nameOf = (r) => (lang === 'ar' ? r.item.nameAr : r.item.nameEn)
  for (const [q, expected] of battery) {
    const beforeTop = (await legacyUnified(q, lang))[0]
    const afterRes = await unified.searchAllFoods(q, { catalog: cat, lang, limit: 8 })
    const afterTop = afterRes[0]
    const beforeOk = !!beforeTop && satisfies(nameOf(beforeTop), expected)
    const afterOk = !!afterTop && satisfies(nameOf(afterTop), expected)
    if (beforeTop?.source === 'curated') curatedTop.before++
    if (afterTop?.source === 'curated') curatedTop.after++
    if (beforeOk) report[lang].before++
    if (afterOk) report[lang].after++
    if (!beforeOk && afterOk) report[lang].fixed.push(q)
    ok(
      `[${lang}] «${q}» ⇒ نتيجة أولى معقولة (${expected.join(' | ')})`,
      afterOk,
      afterTop ? `${nameOf(afterTop)} · ${afterRes.length} نتيجة` : 'صفر نتيجة',
    )
  }
}

const TOTAL = AR_BATTERY.length + EN_BATTERY.length
const beforeTotal = report.ar.before + report.en.before
const afterTotal = report.ar.after + report.en.after
ok(`التغطية بعد: ${afterTotal}/${TOTAL} (قبل: ${beforeTotal}/${TOTAL})`, afterTotal === TOTAL, `عربي ${report.ar.after}/${AR_BATTERY.length} · إنجليزي ${report.en.after}/${EN_BATTERY.length}`)
counter(
  'رقم «قبل» ليس مساويًا لرقم «بعد» — وإلا كان الإثبات يقيس لا شيء',
  beforeTotal < afterTotal,
  `قبل ${beforeTotal} · بعد ${afterTotal}`,
)
ok(
  `جودة الصدارة: ${curatedTop.after}/${TOTAL} استعلامًا تتصدّره نتيجة منسَّقة (قبل: ${curatedTop.before}/${TOTAL})`,
  curatedTop.after > curatedTop.before,
  `قبل ${curatedTop.before} · بعد ${curatedTop.after}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٢ — الضوابط السالبة: التغطية ليست «كل شيء يطابق كل شيء».
// ═════════════════════════════════════════════════════════════════════════
for (const q of ['زززززز', 'qqqqzz', 'سكوات', 'squat', 'كرسي مكتب']) {
  const n = (await unified.searchAllFoods(q, { catalog: cat, lang: 'ar', limit: 8 })).length
  ok(`ضابط سالب: «${q}» ⇒ صفر نتيجة`, n === 0, `${n}`)
}
// مطابقة الرموز **مقترنة لا مفرَّقة**: كلمتان حاضرتان في القاعدة لكن ليس في صنف واحد.
const splitTokens = await unified.searchAllFoods('كنافة سكوات', { catalog: cat, lang: 'ar', limit: 8 })
ok('مطابقة الرموز تشترط اجتماعها في صنف واحد — «كنافة سكوات» ⇒ صفر', splitTokens.length === 0, `${splitTokens.length}`)
// ورمز واحد لا يشعلها: «رز» وحدها تُطابَق بالتضمين لا بمطابقة الرموز.
const singleToken = unified.rankCurated('رز', 12)
ok('استعلام برمز واحد لا يمرّ من مطابقة الرموز — كل نتائجه أقوى منها', singleToken.length > 0 && singleToken.every((r) => r.strength < 10), `${singleToken.length} نتيجة`)

// ═════════════════════════════════════════════════════════════════════════
// §٣ — الترتيب: التنسيق البشري يسبق التخمين البنيوي.
// ═════════════════════════════════════════════════════════════════════════
const nutsAfter = await unified.searchAllFoods('nuts', { catalog: cat, lang: 'en', limit: 8 })
ok('«nuts»: الصدارة منسَّقة لا «nutella»', nutsAfter[0]?.source === 'curated' && !/nutella/i.test(nutsAfter[0]?.item.nameEn ?? ''), `${nutsAfter[0]?.item.nameEn}`)
/**
 * ⟲ تأكيد مضادّ (§4.2): نزع وسم «الصيغة المخمَّنة» **من نفس المرشّحين** يعيد
 * العطل حرفيًا. لو كانت الأرضية بلا أثر لبقيت الصدارة كما هي — فتسقط هذه القاعدة.
 */
{
  const curatedNuts = unified.rankCurated('nuts')
  const rawHits = (await unified.rankPackaged(cat, 'nuts')).map((h) => ({ ...h, derivedOnly: false }))
  const tampered = unified.mergeUnified(curatedNuts, rawHits, 'en', 8)
  counter(
    'نزع أرضية الصيغ المخمَّنة يعيد «nutella» إلى الصدارة',
    tampered[0]?.source === 'packaged' && /nutella/i.test(tampered[0]?.item.nameEn ?? ''),
    `المعطوب: ${tampered[0]?.item.nameEn} · السليم: ${nutsAfter[0]?.item.nameEn}`,
  )
  counter(
    'والصيغة المخمَّنة موسومة فعلًا — لا يمرّ الفحص على مصادفة',
    (await unified.rankPackaged(cat, 'nuts')).some((h) => h.derivedOnly === true),
  )
}

/**
 * ⟲ تأكيد مضادّ: السلّم القديم كان يهبط بمطابقة الاسم **الإنجليزي** المنسَّق إلى
 * ٧/٩ — دون بادئة اسمٍ معبّأ (٤). نعيد بناء ذلك على نفس المرشّحين ونثبت انقلاب
 * الصدارة. الفحص يشترط اختلاف الصدارتين، فلا يمرّ بلا أن يفرّق بين ترتيبين.
 */
for (const q of ['pizza', 'tomato']) {
  const after = await unified.searchAllFoods(q, { catalog: cat, lang: 'en', limit: 8 })
  ok(`«${q}»: الصدارة منسَّقة لا ضجيج عبوات`, after[0]?.source === 'curated', `${after[0]?.item.nameEn}`)
  const qn = norm(q)
  const demoted = unified.rankCurated(q).map((r) => {
    const arHit = norm(r.item.nameAr).includes(qn)
    if (arHit || r.strength > 5) return r
    // مطابقة جاءت من الاسم الإنجليزي وحده ⇒ رتبتها القديمة ٧ (بادئة) أو ٩ (تضمين).
    return { ...r, strength: norm(r.item.nameEn).startsWith(qn) ? 7 : 9 }
  })
  const packaged = await unified.rankPackaged(cat, q)
  const legacyTop = unified.mergeUnified(demoted, packaged, 'en', 8)[0]
  counter(
    `«${q}»: إعادة السلّم القديم تقلب الصدارة إلى المعبّأ`,
    legacyTop?.source === 'packaged' && legacyTop?.item.nameEn !== after[0]?.item.nameEn,
    `القديم: ${legacyTop?.item.nameEn} · الجديد: ${after[0]?.item.nameEn}`,
  )
}

/** ⟲ مطابقة الرموز: نزعُها يعيد «بروتين واي» إلى صفر — بالمطابق القديم نفسه. */
counter(
  'إلغاء مطابقة الرموز يعيد «بروتين واي» إلى صفر',
  legacySearch('بروتين واي').length === 0 && unified.rankCurated('بروتين واي').length > 0,
  `قديم ${legacySearch('بروتين واي').length} · جديد ${unified.rankCurated('بروتين واي').length}`,
)
counter(
  'ونزعُ مقابلة «مايسترو⇒ماسترو» يعيدها إلى صفر',
  legacySearch('مايسترو').length === 0 && unified.rankCurated('مايسترو').length > 0,
  `قديم ${legacySearch('مايسترو').length} · جديد ${unified.rankCurated('مايسترو').length}`,
)
counter(
  'ونزعُ صنف «عسل (عام)» يعيد «عسل» إلى صفر من المنسَّق',
  legacySearch('عسل').length === 0 && unified.rankCurated('عسل').length > 0,
  `قديم ${legacySearch('عسل').length} · جديد ${unified.rankCurated('عسل').length}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٤ — «ال» أداة تعريف: صيغة إضافية لا حذف حرف.
// ═════════════════════════════════════════════════════════════════════════
ok('«الكبسة» تولّد صيغة بلا «ال»', variantsMod.queryVariants('الكبسة').some((v) => v.includes('كبسه') && !v.startsWith('ال')), variantsMod.queryVariants('الكبسة').join(' · '))
ok('والأصل يبقى **أوّل** الصيغ — تُقاس مطابقة ما كتبه أولًا', variantsMod.queryVariants('الكبسة')[0] === 'الكبسة')
/**
 * ⟲ حدّ القصّ **يطابق حدّ الفهرس** — لا حدّان يتباعدان.
 *
 * ⚠️ **هذه القاعدة كُتبت بعد سقوطٍ فعليّ لا احترازًا.** كانت صيغتها الأولى تدّعي
 * أن «العلم» لا تُقصّ، فسقطت في أوّل تشغيل: `withAlDefinite` في
 * `src/lib/text/foodNormalize.ts` تقصّ كل كلمة أطول من أربعة محارف — و«العلم»
 * خمسة. فالحدّ صحيح والادّعاء خاطئ. والضمانة الحقيقية ليست «لا تُقصّ» بل
 * **الالتقاء**: ما يقصّه الفهرس يقصّه الاستعلام، وما يبقيه يبقيه — وإلا صار
 * طرفان لا يلتقيان (وهو بالضبط العطل الذي وُلد منه هذا التغيير).
 */
{
  const tok = (w) => normalizeMod.tokenize(w)
  counter(
    'حدّ القصّ يطابق الفهرس: «الرز» (٤ محارف) لا تُقصّ في الطرفين',
    !tok('الرز').includes('رز') && !variantsMod.queryVariants('الرز').includes('رز'),
    `فهرس: ${tok('الرز').join(',')} · استعلام: ${variantsMod.queryVariants('الرز').join(',')}`,
  )
  counter(
    'و«العلم» (٥ محارف) تُقصّ في الطرفين معًا — التقاءٌ لا تباعد',
    tok('العلم').includes('علم') && variantsMod.queryVariants('العلم').includes('علم'),
    `فهرس: ${tok('العلم').join(',')} · استعلام: ${variantsMod.queryVariants('العلم').join(',')}`,
  )
  counter(
    'والأصل يبقى مقيسًا أولًا، فالقصّ إضافةٌ لا استبدال',
    variantsMod.queryVariants('العلم')[0] === 'العلم',
  )
}
counter('و«البيك» تبقى موجودة بأصلها — الحذف إضافةٌ لا استبدال', unified.rankCurated('البيك').some((r) => r.item.nameAr.includes('البيك')))
ok('الصيغ المخمَّنة موسومة والأصلية غير موسومة', (() => {
  const d = variantsMod.queryVariantsDetailed('nuts')
  return d[0]?.derived === false && d.some((v) => v.derived === true)
})(), variantsMod.queryVariantsDetailed('nuts').map((v) => `${v.value}${v.derived ? '*' : ''}`).join(' · '))

// ═════════════════════════════════════════════════════════════════════════
// §٥ — بديل العلامة العام: صادق، وأضعف من كل مطابقة.
// ═════════════════════════════════════════════════════════════════════════
const cola = unified.rankCurated('كوكاكولا')
ok('«كوكاكولا» تُرجع الصنف العام لا شاشة فارغة', cola.length > 0, `${cola[0]?.item.nameAr}`)
ok('والاسم المعروض عامّ — لا اسم علامة في نصّ النتيجة', cola.every((r) => !/كوكا|coca/i.test(`${r.item.nameAr} ${r.item.nameEn}`)), cola.map((r) => r.item.nameAr).join(' · '))
ok('وبديل العلامة أضعف رتبة في السلّم كلّه', cola.every((r) => r.strength === brandMod.BRAND_FALLBACK_STRENGTH), `${cola.map((r) => r.strength).join(',')}`)
counter('المطابقة تامّة لا تضمين — «كوكاكولا زيرو 330» لا تستدعي البديل', brandMod.brandFallbackIds('كوكاكولا زيرو 330', norm).length === 0)
counter('ولا بادئة — «كوكا كو» لا تستدعيه', brandMod.brandFallbackIds('كوكا كو', norm).length === 0)
ok('كل معرّف في خريطة البدائل يقابل صنفًا حقيقيًا', brandMod.BRAND_GENERIC_FALLBACKS.every((b) => b.genericIds.every((id) => foodItems.some((f) => f.id === id))), `${brandMod.BRAND_GENERIC_FALLBACKS.length} علامة`)
ok('وقائمة العلامات المطلوبة مكتوبة بأسباب مسمّاة لا «لاحقًا»', brandMod.WANTED_BRANDS.length > 0 && brandMod.WANTED_BRANDS.every((w) => w.reason.length > 20 && !/لاحق/.test(w.reason)), `${brandMod.WANTED_BRANDS.length} علامة`)
// ولا يزاحم مطابقةً حقيقية: العلامة المغطّاة منسَّقًا لا تُحقن ببديل عام.
const albaik = unified.rankCurated('البيك')
ok('علامة مغطّاة منسَّقًا لا يُحقن معها بديل عام', albaik.every((r) => r.strength < brandMod.BRAND_FALLBACK_STRENGTH))

// ═════════════════════════════════════════════════════════════════════════
// §٦ — الباركود: لا معرّف داخلي في موضع يُقرأ فيه GTIN.
// ═════════════════════════════════════════════════════════════════════════
const PADDED = '00000017919678'
const RETAIL = '17919678'
ok(`الشكل التجاري: ${PADDED} ⇒ ${RETAIL}`, gtinMod.retailGtin(PADDED) === RETAIL, gtinMod.retailGtin(PADDED))
ok('ولا يخترع رقمًا: خانة التحقّق تبقى صحيحة بعد التجريد', barcode.gtinCheckDigitValid(gtinMod.retailGtin(PADDED)))
ok('UPC-A لا يُقصّ إلى ١١ — يبقى ١٢ خانة', gtinMod.retailGtin('00012345678905').length === 12, gtinMod.retailGtin('00012345678905'))
ok('وEAN-13 يبقى ١٣', gtinMod.retailGtin('06281006001111').length === 13, gtinMod.retailGtin('06281006001111'))

/** سجل بلا اسم عربي ولا إنجليزي — يعترف المخطّط بإمكانه (`no_arabic_name`). */
const namelessProduct = {
  gtin: PADDED, name_ar: null, name_en: null, brand_ar: null, brand_en: null,
  market: 'SA', energy_kcal: 190, protein_g: 13, carbs_g: 22, fat_g: 5,
  serving_size: null, serving_unit: null, source: 'openfoodfacts',
}
for (const lang of ['ar', 'en']) {
  const converted = appCatalog.catalogProductToFoodItem(namelessProduct, lang)
  const surfaces = [converted.nameAr, converted.nameEn, ...(converted.keywords ?? [])].join(' ')
  ok(`[${lang}] السجل بلا اسم لا يعرض مفتاحنا الداخلي ${PADDED}`, !surfaces.includes(PADDED), surfaces)
  ok(`[${lang}] بل اسمًا صريحًا وباركودًا موسومًا`, /باركود|Barcode/.test(surfaces) && surfaces.includes(RETAIL), converted.nameAr)
}
/** ⟲ التعبير القديم كان يبثّه فعلًا — وإلا كان هذا الإصلاح بلا عطلٍ يصلحه. */
counter(
  'التعبير القديم (name_ar || name_en || gtin) كان يبثّ المفتاح الداخلي',
  (namelessProduct.name_ar || namelessProduct.name_en || namelessProduct.gtin) === PADDED,
)
/** ولا يُخلط سجلان بلا اسم في واحد — الاسم البديل يبقى مميِّزًا. */
{
  const a = appCatalog.catalogProductToFoodItem(namelessProduct, 'ar')
  const b = appCatalog.catalogProductToFoodItem({ ...namelessProduct, gtin: '00000029573103' }, 'ar')
  counter('سجلان بلا اسم يبقيان متمايزين — لا ينهار إسقاط التكرار عليهما', a.nameAr !== b.nameAr, `${a.nameAr} ≠ ${b.nameAr}`)
}

/** ولا معرّف صنف منسَّق يمكن أن يُقرأ باركودًا. */
const gtinShapedIds = foodItems.filter((f) => /^\d{8}$|^\d{12,14}$/.test(f.id))
ok('لا معرّف صنف منسَّق بشكل GTIN (٨/١٢/١٣/١٤ رقمًا)', gtinShapedIds.length === 0, `${gtinShapedIds.length}`)
counter('والفحص قادر على الرسوب — نمطه يلتقط كودًا حقيقيًا', /^\d{8}$|^\d{12,14}$/.test(RETAIL) && /^\d{8}$|^\d{12,14}$/.test(PADDED))

// ═════════════════════════════════════════════════════════════════════════
// §٧ — الصدق: لا ادّعاء بأن الذيل الطويل حيّ.
// ═════════════════════════════════════════════════════════════════════════
// الباركود المطابق تمامًا لا يُطاله فلتر الصيغ المخمَّنة — ولو وُسم مخمَّنًا.
{
  const hot = JSON.parse(await readFile(resolve(PUBLIC_FOOD, 'hot-set.json'), 'utf8'))
  const sample = hot.order[3]
  const product = hot.records[sample]
  const forced = unified.mergeUnified([], [{ product, tier: 'gtin-exact', derivedOnly: true }], 'ar', 8)
  ok('الباركود المطابق تمامًا يبقى في القمّة (٠) ولو وُسم مخمَّنًا', forced[0]?.strength === 0, `${forced[0]?.strength}`)
  const forcedPrefix = unified.mergeUnified([], [{ product, tier: 'name-prefix', derivedOnly: true }], 'ar', 8)
  counter('والأرضية تعمل فعلًا على ما دونه — بادئة اسمٍ مخمَّنة تهبط إلى ١١', forcedPrefix[0]?.strength === unified.PACKAGED_DERIVED_FLOOR, `${forcedPrefix[0]?.strength}`)
}

const availability = cat.longTailAvailability()
ok(
  `الصدق: القابل للبحث ${availability.searchableRecords} لا يتجاوز المعلَن ${availability.declaredRecords}`,
  availability.searchableRecords <= availability.declaredRecords,
  `معلَن ${availability.declaredRecords} · قابل ${availability.searchableRecords}`,
)
// [مهمة الطعام ٢٠k] الفحص ثنائي الحالة **بالاسم** — لا حالة تمرّ مجّانًا (§4.2):
//   • الذيل غائب ⇒ القابل للبحث هو الطقم الساخن بالضبط (التدهور الصادق).
//   • الذيل مشحون ⇒ القابل للبحث هو فهرس الحزم بالضبط — وكان الشرط القديم
//     (قابل === ساخن) يحمرّ هنا على النجاح نفسه، فكان بوّابة ضدّ الشحن.
{
  const longTailShipped = availability.corpusRecords > 0
  ok(
    longTailShipped
      ? `الذيل الطويل مشحون: القابل للبحث يساوي فهرس الحزم (${availability.corpusRecords})`
      : 'وهذه التغطية تحقّقت بجودة بحث وتنسيق — لا بشرائح غير مشحونة',
    longTailShipped
      ? availability.searchableRecords === availability.corpusRecords
      : availability.searchableRecords === cat.getStats().hotSetCount,
    `قابل ${availability.searchableRecords} · حزم ${availability.corpusRecords} · ساخن ${cat.getStats().hotSetCount}`,
  )
}

// ═════════════════════════════════════════════════════════════════════════
const failed = checks.filter((c) => !c.pass)
for (const c of checks) console.log(`${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
console.log('')
console.log(`تغطية (نتيجة أولى معقولة): ${beforeTotal}/${TOTAL} ⇐ ${afterTotal}/${TOTAL}`)
console.log(`جودة الصدارة (منسَّقة لا ضجيج عبوة): ${curatedTop.before}/${TOTAL} ⇐ ${curatedTop.after}/${TOTAL}`)
console.log(`  عربي  ${report.ar.before} ⇐ ${report.ar.after} · أُصلح: ${report.ar.fixed.join(' · ') || '—'}`)
console.log(`  إنجليزي ${report.en.before} ⇐ ${report.en.after} · أُصلح: ${report.en.fixed.join(' · ') || '—'}`)
if (failed.length > 0) {
  console.error(`\n❌ فشل الإثبات: ${failed.length} من ${checks.length} فحصًا.`)
  for (const c of failed) console.error(`   ✗ ${c.label} — ${c.detail}`)
  process.exit(1)
}
console.log(`\n✅ نجحت كل الفحوص — ${checks.length} فحصًا (منها ${checks.filter((c) => c.counter).length} تأكيدًا مضادًّا).`)
