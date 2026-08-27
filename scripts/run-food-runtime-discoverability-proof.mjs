/**
 * إثبات قابلية اكتشاف الطعام **وقت التشغيل** — لا عدّ مانيفست ولا عدّ قرص.
 *
 * ═══ السؤال الحاكم ═══
 * «لا تقبل عدّ المانيفست ولا عدّ توليد CI ولا عدّ ملفات القرص كمكافئ لقابلية
 * اكتشاف المستخدم. قِس القابلية الفعلية وقت التشغيل.» الادعاء المُعلَن: ٥٩٬٩٤١
 * صنفًا قابلًا للبحث. هذا الإثبات **يقيسه عبر نفس طبقة `Catalog`/`SearchCorpus`
 * التي يستدعيها المكوّن الحيّ** (`QuickMealLogger` ⇒ `rankPackaged(cat, q)` بعمق
 * مشتعل وميزانية افتراضية)، لا عبر قراءة رقم من بيانٍ.
 *
 * ═══ ما «قابل للاكتشاف» هنا ═══
 * سجل R قابل للاكتشاف إن أعاده خطّ الإنتاج الحيّ حين يكتب المستخدم كلمةً من
 * كلماته. المسار: `rankPackaged` ⇒ `Catalog.searchRanked({deep:true})` ⇒
 * `SearchCorpus` ⇒ حزمة مفتاحها أوّل ٣ محارف من الكلمة، تُقرأ صفحاتها حتى
 * ميزانية ٤ صفحات (٢٬٠٤٨ سجلًا). القياس البنيوي: **اتحاد أوّل ٤ صفحات من كل
 * حزمة** — أي مجموع ما يبلغه المستخدم بكلمة واحدة. إن ساوى ٥٩٬٩٤١ فالادعاء صادق
 * بالقياس لا بالإعلان.
 *
 * ═══ التمييز الدقيق (§4.2) ═══
 * «قابل للبحث ببادئة» ≠ «محمَّل كله». الحزمة الكبيرة `de` (٩٬٧٤٥ سجلًا / ٢٠ صفحة)
 * تُقرأ منها ٤ صفحات فقط، فسجلّ في صفحتها الخامسة **لا يبلغه** استعلام «de» —
 * لكنه يبلغه بكلمته المميِّزة الأخرى. الاكتشاف يركب على توجيه الكلمة النادرة، لا
 * على تحميل الحزمة كلّها. هذا الإثبات يهاجم القاعدة بمحاكاة التفاف مسمّاة.
 *
 * التشغيل: node scripts/run-food-runtime-discoverability-proof.mjs
 */
import { readFile, readdir, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: القاعدة يجب أن تكون **قابلة للسقوط** (§4.2). */
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

// ═════ اختيار جذر الأصول: dist/food (مخرج البناء الحقيقي) وإلا public/food ═════
const exists = async (p) => { try { await access(p); return true } catch { return false } }
const DIST = resolve(ROOT, 'dist/food')
const PUB = resolve(ROOT, 'public/food')

// ═════ ضمان أصول البحث ═════
// حزم البحث (`search/`) **مولَّدة ولا تُلتزَم** (.gitignore)، ومسار البناء
// الحقيقي يولّدها عبر `ensure-search-assets.mjs`. لكن هذا الإثبات في البوّابة
// قد يجري في بيئة نظيفة (CI يبني بـ`vite build` لا `npm run build`، فلا
// يمرّ الضامن)، فلا يوجد `search/` تحت dist ولا public. فنولّدها هنا من
// الشرائح المُلتزَمة (حتمية، مبصومة، تُتخطّى إن كانت حديثة) — فيبقى الإثبات
// مكتفيًا بذاته في أي بيئة. الغياب الكامل للشرائح يبقى حالة صادقة يعلنها
// الضامن ويقيسها التدهور إلى ٥٩٤ أدناه.
if (!(await exists(resolve(DIST, 'search/directory.json'))) && !(await exists(resolve(PUB, 'search/directory.json')))) {
  try {
    execFileSync(process.execPath, [resolve(ROOT, 'scripts/food-production/ensure-search-assets.mjs')], { cwd: ROOT, stdio: 'inherit' })
  } catch { /* لا شرائح ⇒ الضامن يعلن الغياب ويمضي؛ التدهور أدناه يقيسه */ }
}

const FOOD = (await exists(resolve(DIST, 'search/directory.json'))) ? DIST : PUB
const STREAM = FOOD === DIST ? 'CODE_PROVEN (dist/food — مخرج build الحقيقي)' : 'CODE_PROVEN (public/food — مصدر مولَّد)'
console.log(`مصدر الأصول: ${FOOD === DIST ? 'dist/food' : 'public/food'} · التيار: ${STREAM}\n`)

/** جلب نصّي من القرص — ملف غائب ⇒ null، تمامًا كـ404 وقت التشغيل. */
const diskFetch = (base) => async (url) => {
  try { return await readFile(resolve(base, url.replace(/^\/food\//, '')), 'utf8') } catch { return null }
}

const [unified, { Catalog }, { createMemoryCache }, normMod, gtinMod, bucketsMod, barcode] = await Promise.all([
  loadTsModule('src/lib/food/unifiedSearch.ts'),
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/text/foodNormalize.ts'),
  loadTsModule('src/lib/food/gtin.ts'),
  loadTsModule('src/lib/food/searchBuckets.ts'),
  loadTsModule('src/features/barcode/validateBarcode.ts'),
])

const cat = await Catalog.create({ fetchText: diskFetch(FOOD), cache: createMemoryCache() })
await cat.init()
const hotCount = cat.getStats().hotSetCount
const hot = JSON.parse(await readFile(resolve(FOOD, 'hot-set.json'), 'utf8'))
const hotGtins = new Set(hot.order)
const manifest = JSON.parse(await readFile(resolve(FOOD, 'manifest.json'), 'utf8'))
const searchManifest = JSON.parse(await readFile(resolve(FOOD, 'search/manifest.json'), 'utf8'))
const directory = JSON.parse(await readFile(resolve(FOOD, 'search/directory.json'), 'utf8'))

// ═════════════════════════════════════════════════════════════════════════
// §٠ — الأصول حاضرة، والطقم الساخن **مقيس** لا مُعلَن.
// ═════════════════════════════════════════════════════════════════════════
ok(`الطقم الساخن محمَّل ومقيس (${hotCount} سجلًا) — لا ٥٩٩ المكتوبة في تعليق`, cat.getStats().hotSetLoaded && hotCount > 0, `hotSetCount=${hotCount}`)
ok(`البيان يعلن ${manifest.shard_count} شريحة / ${directory.total_records} سجلًا`, manifest.shard_count === 41 && directory.total_records === 59941, `shards=${manifest.shard_count} declared=${directory.total_records}`)
ok(`دليل الحزم حاضر: ${searchManifest.buckets} حزمة · ${searchManifest.files} ملفًا · merkle ${String(searchManifest.merkle_root).slice(0, 12)}…`, searchManifest.buckets > 4000 && searchManifest.total_records === 59941)

// ═════════════════════════════════════════════════════════════════════════
// §١ — بطارية الذيل الطويل العدائية عبر **المسار الحيّ نفسه** (rankPackaged).
//      كل استعلام: كلمة نادرة يستحيل أن تكون في الطقم الساخن (594). التوقّع
//      **سجل مسمّى** من الذيل الطويل. يقارَن GTIN المطابق حرفيًا.
// ═════════════════════════════════════════════════════════════════════════
// المصدر: مُنقّبة من بيانات dist/food الحقيقية (سكربت الاستكشاف)، وكلّها خارج الطقم الساخن.
const BATTERY = [
  // [نصّ إنجليزي]
  { q: 'radiatori', target: '08008343201377' },
  { q: 'baiocchi', target: '08076809574969' },
  { q: 'connetable', target: '03263670793819' },
  { q: 'jardiniere', target: '03017800201763' },
  { q: 'griechischer', target: '04061459015072' },
  { q: 'edeka', target: '04311501757376' },
  { q: 'jerky', target: '04251097402970' },
  { q: 'aioli', target: '03256220363105' },
  { q: 'pistacchio', target: '08076809581318' },
  { q: 'steinofenbrot', target: '04071800055619' },
  { q: 'mehrkorn', target: '04071800000992' },
  { q: 'parisienne', target: '03017800201770' },
  { q: 'asperges', target: '03256220360432' },
  { q: 'capsules', target: '08445290871923' },
  // [نصّ عربي]
  { q: 'طرتينو', target: '06130413002286' },
  { q: 'كاسكروط', target: '06130015061933' },
  { q: 'زنجبيل', target: '06132508340051' },
  { q: 'سيليكتو', target: '06130695111331' },
  { q: 'اوبتيلا', target: '06133337001250' },
  { q: 'جالاكسي', target: '06221134010718' },
]

const nameOf = (p) => (p?.name_ar || p?.name_en || '').slice(0, 46)
const bucketOf = (q) => normMod.normalizeProductKey(q).slice(0, bucketsMod.BUCKET_KEY_LENGTH)
let deepFound = 0
let hotOnlyFound = 0
const batteryRows = []
for (const { q, target } of BATTERY) {
  // ── المسار الحيّ بالضبط: rankPackaged بعمق مشتعل وميزانية افتراضية ──
  const deepHits = await unified.rankPackaged(cat, q)
  const hit = deepHits.find((h) => h.product.gtin === target)
  const targetInHot = hotGtins.has(target)
  const pass = !!hit && !targetInHot
  if (pass) deepFound += 1
  // ── نفس الاستعلام على الطقم الساخن وحده (deep:false) — يجب ألّا يجده ──
  const hotOnly = await unified.rankPackaged(cat, q, { deep: false })
  const inHotOnly = hotOnly.some((h) => h.product.gtin === target)
  if (inHotOnly) hotOnlyFound += 1
  const bucket = bucketOf(q)
  batteryRows.push({ q, target, tier: hit?.tier, name: nameOf(hit?.product), bucket, bucketSize: directory.buckets[bucket], inHotOnly })
  ok(
    `[الذيل] «${q}» ⇒ يصل السجل ${target} من الذيل الطويل (حزمة «${bucket}»=${directory.buckets[bucket]})`,
    pass,
    hit ? `${hit.tier} · «${nameOf(hit.product)}» · خارج الساخن=${!targetInHot}` : 'لم يصل',
  )
}
ok(`البطارية كاملة: ${deepFound}/${BATTERY.length} سجلًا من الذيل الطويل وصلت عبر المسار الحيّ`, deepFound === BATTERY.length, `${deepFound}/${BATTERY.length}`)

// ⟲ التأكيد المضادّ الحاسم: هذه السجلات **لا يصلها الطقم الساخن**. لو أطفأنا
// العمق (deep:false) لسقطت كلّها — فالاكتشاف من الحزم لا من الـ594، وهذا هو
// الفخّ الذي يجب أن يكشفه الإثبات (تدهور «بأدب» يدّعي التغطية).
counter(
  `إطفاء العمق (الطقم الساخن وحده) يُسقط كل البطارية — ٠/${BATTERY.length} تصل`,
  hotOnlyFound === 0,
  `deep:false وجد ${hotOnlyFound} من ${BATTERY.length}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٢ — الباركود: مسار `lookupByGtin` (المسح) — O(1) لأي سجل، بلا ميزانية.
// ═════════════════════════════════════════════════════════════════════════
const BARCODES = ['08017596002617', '03760130560580', '08076809574969', '04251097402970', '06130413002286']
let barcodeOk = 0
for (const padded of BARCODES) {
  const retail = gtinMod.retailGtin(padded)
  const byRetail = await cat.lookupByGtin(retail)
  const byPadded = await cat.lookupByGtin(padded)
  const pass = !!byRetail && byRetail.gtin === padded && !!byPadded && byPadded.gtin === padded && !hotGtins.has(padded)
  if (pass) barcodeOk += 1
  ok(`[باركود] ${retail} ⇒ سجل ذيل طويل ${padded} («${nameOf(byRetail)}»)`, pass, `retail⇒${byRetail ? byRetail.gtin : 'null'} · padded⇒${byPadded ? byPadded.gtin : 'null'}`)
}
ok(`الباركود: ${barcodeOk}/${BARCODES.length} سجل ذيل طويل يُبلَغ بالمسح`, barcodeOk === BARCODES.length)

// ⟲ باركود صحيح البنية لكنه غير موجود ⇒ null (لا «يطابق أي شيء»).
// نبني EAN-13 بخانة تحقّق صحيحة لجسمٍ غائب عن الكتالوج.
function ean13Check(body12) {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += (+body12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}
const absentBody = '628834001927' // بادئة سعودية، جسم غير متسلسل ولا مكرّر
const absentGtin = absentBody + ean13Check(absentBody)
const absentClass = gtinMod.classifyGtin(absentGtin)
const absentLookup = await cat.lookupByGtin(absentGtin)
counter(
  `باركود صحيح البنية وغائب (${absentGtin}) ⇒ null — المسح لا يطابق أي شيء`,
  absentClass.ok === true && absentLookup === null,
  `صالح=${absentClass.ok} · نتيجة=${absentLookup === null ? 'null' : absentLookup?.gtin}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٣ — الضابط السالب: البحث لا يطابق كل شيء (§4.2).
// ═════════════════════════════════════════════════════════════════════════
for (const q of ['زقزقزقكك', 'qzxqwkvj', 'ككككققققى']) {
  const n = (await unified.searchAllFoods(q, { catalog: cat, lang: 'ar', limit: 12 })).length
  const plan = bucketsMod.planBucketQuery(q, directory)
  ok(`ضابط سالب: «${q}» ⇒ صفر نتيجة (خطّة الحزم: ${plan.reason})`, n === 0, `نتائج=${n} · reason=${plan.reason}`)
}
// وخطّة الحزم **تفرّق** «غائب» عن «موجود» — لا صفرٌ شامل.
counter(
  'خطّة الحزم تميّز الغياب عن الوجود — «zzz…» absent بينما «rad…» ok',
  bucketsMod.planBucketQuery('zzzxqwk', directory).reason === 'absent'
    && bucketsMod.planBucketQuery('radiatori', directory).reason === 'ok',
  `zzz⇒${bucketsMod.planBucketQuery('zzzxqwk', directory).reason} · rad⇒${bucketsMod.planBucketQuery('radiatori', directory).reason}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٤ — القياس الحاكم: كم سجلًّا **يبلغه** المستخدم فعلًا؟
//      مسحٌ لكل صفحات الحزم على القرص، مرّة واحدة:
//        • distinctAll  — كل GTIN مميّز في الحزم (هل تحوي الحزمُ ٥٩٬٩٤١ فعلًا؟)
//        • withinBudget — كل GTIN في أوّل ٤ صفحات من حزمته (ما يبلغه استعلام واحد)
// ═════════════════════════════════════════════════════════════════════════
const BUDGET = bucketsMod.DEFAULT_BUCKET_PAGE_BUDGET // ٤ — نفس ما يقرؤه SearchCorpus
const PAGE = bucketsMod.BUCKET_PAGE_SIZE
const GT = bucketsMod.CARD_FIELDS.indexOf('gtin')
const bdir = resolve(FOOD, 'search/b')
const pageFiles = (await readdir(bdir)).filter((f) => f.endsWith('.json'))
const pageIndex = (f) => { const m = f.match(/-(\d+)\.json$/); return m ? +m[1] : -1 }
const distinctAll = new Set()
const withinBudget = new Set()
const withinCaps = { 0: new Set(), 1: new Set(), 2: new Set() }
const t0 = Date.now()
for (const f of pageFiles) {
  const p = pageIndex(f)
  let page
  try { page = JSON.parse(await readFile(resolve(bdir, f), 'utf8')) } catch { continue }
  const gtins = page.columns[GT] || []
  for (const g of gtins) {
    distinctAll.add(g)
    if (p < BUDGET) withinBudget.add(g)
    for (const cap of [1, 2]) if (p < cap) withinCaps[cap].add(g)
  }
}
const scanMs = Date.now() - t0
ok(
  `الحزم تحوي ${distinctAll.size} سجلًا مميّزًا فعلًا — لا رقم بيانٍ مُعلَن (مسح ${pageFiles.length} صفحة/${scanMs}م.ث)`,
  distinctAll.size === 59941,
  `distinctAll=${distinctAll.size}`,
)
ok(
  `القابل للاكتشاف بميزانية ٤ صفحات = ${withinBudget.size} — كل سجل يبلغه المستخدم بكلمة واحدة`,
  withinBudget.size === 59941,
  `withinBudget=${withinBudget.size} · declared=${directory.total_records}`,
)
// نطبع حساسية الميزانية: صفحة واحدة أقلّ من الكل، فالميزانية **تُقيّد** فعلًا.
ok(
  `الميزانية تُقيّد فعلًا: صفحة واحدة تبلغ ${withinCaps[1].size} فقط (<59941) — القياس ليس صحيحًا بلا معنى`,
  withinCaps[1].size < 59941 && withinCaps[1].size > 0,
  `1p=${withinCaps[1].size} · 2p=${withinCaps[2].size} · 4p=${withinBudget.size}`,
)

// ⟲ محاكاة الالتفاف (§4.2): «قابل ببادئة» ≠ «محمَّل كله».
// الحزمة `de` = ٩٬٧٤٥ سجلًا / ٢٠ صفحة. سجل في صفحتها ≥٥ (خارج الميزانية) **لا
// يبلغه** استعلام «de» عبر المسار الحيّ، لكن كلمته المميّزة تبلغه. لو كان القياس
// أعلاه «يحمّل الحزمة كلّها» لبلغه «de» — سقوطه هنا يثبت أن الاكتشاف يركب على
// توجيه الكلمة النادرة لا على تحميلٍ شامل.
const DE_TAIL_GTIN = '08410069017215' // "Ensaladas integral" — صفحة ٤ من حزمة de
const deKey = bucketsMod.encodeBucketKey('de')
// نتحقّق أنّه فعلًا خارج أوّل ٤ صفحات من حزمة de
let deTailPage = -1
for (let p = 0; ; p++) {
  let page
  try { page = JSON.parse(await readFile(resolve(bdir, `${deKey}-${p}.json`), 'utf8')) } catch { break }
  if ((page.columns[GT] || []).includes(DE_TAIL_GTIN)) { deTailPage = p; break }
}
const viaBigPrefix = (await unified.rankPackaged(cat, 'de')).some((h) => h.product.gtin === DE_TAIL_GTIN)
const viaRareWord = (await unified.rankPackaged(cat, 'ensaladas')).some((h) => h.product.gtin === DE_TAIL_GTIN)
counter(
  `سجل «de» في صفحة ${deTailPage} (≥${BUDGET}): استعلام البادئة «de» **لا يبلغه**، وكلمته «ensaladas» تبلغه`,
  deTailPage >= BUDGET && viaBigPrefix === false && viaRareWord === true,
  `page=${deTailPage} · via«de»=${viaBigPrefix} · via«ensaladas»=${viaRareWord}`,
)

// ═════════════════════════════════════════════════════════════════════════
// §٥ — الصدق: `searchableRecords` **مقيس** لا مُثبَّت. غياب الحزم ⇒ يهبط للساخن.
// ═════════════════════════════════════════════════════════════════════════
// نُدفئ استعلامًا عميقًا كي يُحمَّل الدليل، ثم نقرأ الرقم.
await unified.rankPackaged(cat, 'radiatori')
const avail = cat.longTailAvailability()
ok(
  `القابل للبحث المقيس (${avail.searchableRecords}) = المعلَن (${avail.declaredRecords}) — لأن الحزم مشحونة ومحمَّلة`,
  avail.searchableRecords === 59941 && avail.corpusRecords === 59941 && avail.verdict === 'available',
  `searchable=${avail.searchableRecords} · corpus=${avail.corpusRecords} · verdict=${avail.verdict}`,
)
ok(`ولا يتجاوز القابلُ المعلَنَ أبدًا (${avail.searchableRecords} ≤ ${avail.declaredRecords})`, avail.searchableRecords <= avail.declaredRecords)

// ⟲ الفخّ مكشوفًا: كتالوج بلا حزم ولا شرائح (يخدم الطقم الساخن والبيان فقط)
// **يهبط بأمانة إلى 594** ولا يدّعي 59941 — والاستعلام العميق يعود صفرًا.
const starvedFetch = async (url) => {
  const rel = url.replace(/^\/food\//, '')
  if (rel === 'manifest.json' || rel === 'hot-set.json') return diskFetch(FOOD)(url)
  return null // لا search/* ولا shards/*
}
const starved = await Catalog.create({ fetchText: starvedFetch, cache: createMemoryCache() })
await starved.init()
const starvedDeep = await unified.rankPackaged(starved, 'radiatori')
const starvedAvail = starved.longTailAvailability()
counter(
  `تدهور صادق: بلا حزم، القابل للبحث = ${starvedAvail.searchableRecords} (=الساخن ${hotCount}) لا 59941 — «لم نجرّب» ليست «متاح»`,
  starvedAvail.searchableRecords === hotCount && starvedAvail.corpusRecords === 0 && starvedDeep.length === 0,
  `searchable=${starvedAvail.searchableRecords} · corpus=${starvedAvail.corpusRecords} · deep«radiatori»=${starvedDeep.length}`,
)

// ═════════════════════════════════════════════════════════════════════════
const failed = checks.filter((c) => !c.pass)
for (const c of checks) console.log(`${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
console.log('')
console.log('═══════════════════════════════════════════════════════════════')
console.log(`الطقم الساخن (مقيس): ${hotCount}`)
console.log(`المعلَن في البيان:   ${directory.total_records}`)
console.log(`الحزم تحوي فعلًا:    ${distinctAll.size} سجلًا مميّزًا`)
console.log(`القابل للاكتشاف (ميزانية ٤ صفحات، المسار الحيّ): ${withinBudget.size}`)
console.log(`بطارية الذيل الطويل: ${deepFound}/${BATTERY.length} · الباركود: ${barcodeOk}/${BARCODES.length}`)
console.log('═══════════════════════════════════════════════════════════════')
if (failed.length > 0) {
  console.error(`\n❌ فشل الإثبات: ${failed.length} من ${checks.length} فحصًا.`)
  for (const c of failed) console.error(`   ✗ ${c.label} — ${c.detail}`)
  process.exit(1)
}
console.log(`\n✅ نجحت كل الفحوص — ${checks.length} فحصًا (منها ${checks.filter((c) => c.counter).length} تأكيدًا مضادًّا). التيار: ${STREAM}`)
