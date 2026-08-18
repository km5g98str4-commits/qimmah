/**
 * إثبات طبقة تسليم الكتالوج — [D-1/٢·٤·٥] · مُعاد بناؤه في [SOVEREIGN-FOOD-001].
 *
 * السؤال الذي يجيبه: **هل يعمل كتالوج أكبر من حصّة `localStorage` فعلًا، بلا
 * تحميل كل السجلات مع كل ضغطة مفتاح — وهل يصل البحث العميق إلى سجلاته؟**
 *
 * ═══ لماذا أُعيد بناؤه: كان الإثبات فراغًا ═══
 * النسخة السابقة كانت ٢٩ فحصًا **خضراء على ٦٠٬٠٠٠ صفٍّ مُصطنَع في الذاكرة**:
 * لا تقرأ `public/food/` ولا تفتح مقبسًا، وكانت **تبقى خضراء لو حُذف المجلّد كلّه**.
 * وأسوأ من ذلك أن كتلة البحث العميق فيها كانت تؤكّد الآتي حرفيًا:
 *     `ok('العميق: لم تُجلب شرائح إضافية', stDeep.shardsFetched.length === 1)`
 * وهو **وصفٌ للعطل B2 لا حارسٌ عليه**: `search()` كانت تجلب فهرس الشريحة ثم تقرأ
 * `this.shards.get(name)` — خريطةً لا يملؤها إلا مسار الباركود — فتخرج صفر اليدين
 * دائمًا. والاختبار كان (أ) يبحث عميقًا في شريحة **سبق أن أدفأها** فحصُ باركود
 * قبله، وهي الحالة الوحيدة التي يصادف فيها المسار المكسور النجاح، و(ب) **يرمي
 * النتيجة** ويؤكّد على العدّادات وحدها. تأكيدٌ واحد بـ`hits.length > 0` على كتالوج
 * بارد كان سيسقط منذ اليوم الأول.
 *
 * ═══ ثلاث طبقات، وكلٌّ تسدّ ثغرة الأخرى ═══
 * §٠ **ملفات حقيقية** — `public/food/` من القرص. حذفُ المجلّد يُسقط الإثبات بفحص مسمّى.
 * §٥ **مقبس حقيقي** — خادم `node:http` يقدّم الشرائح المُصطنَعة، فيصير جلب الحمولة
 *     دورةَ شبكة فعلية لا استدعاء دالّة محقونة. والبحث العميق يُقاس على كتالوج
 *     **بارد** بلا إدفاء، ويُطلب منه `hits.length > 0`.
 * §١–§٤ **نموذج الحجم** — ٦٠٬٠٠٠ صفٍّ مُولَّد. يبقى مُصطنعًا **عمدًا**: الشرائح
 *     الحقيقية (٧٤ ميغابايت) لا تُلتزم في git. وهو نموذج **حجمٍ** لا ادّعاء تسليم،
 *     ومسألة التسليم يحملها §٠ و`run-food-longtail-proof.mjs`.
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: القاعدة يجب أن تكون **قابلة للسقوط**، وإلا فهي بلا أثر. */
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

const [{ Catalog, DEFAULT_DEEP_PAYLOAD_BUDGET }, { createMemoryCache }, routing] = await Promise.all([
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/food/shardRouting.ts'),
])

// ══════════════════════════════════════════════════════════════════════
// §٠ — الملفات الحقيقية على القرص. حذفُ `public/food/` يُسقط هذه الكتلة.
// ══════════════════════════════════════════════════════════════════════
const PUBLIC_FOOD = resolve(ROOT, 'public/food')
const readPublic = async (name) => {
  try { return await readFile(resolve(PUBLIC_FOOD, name), 'utf8') } catch { return null }
}

const realManifestText = await readPublic('manifest.json')
const realHotText = await readPublic('hot-set.json')
ok('حقيقي: `public/food/manifest.json` موجود ومقروء', realManifestText !== null, `${realManifestText?.length ?? 0} بايت`)
ok('حقيقي: `public/food/hot-set.json` موجود ومقروء', realHotText !== null, `${realHotText?.length ?? 0} بايت`)
if (realManifestText === null || realHotText === null) {
  console.log('✗ أصول الكتالوج الحقيقية غائبة — الإثبات لا يستطيع أن يدّعي شيئًا عن التسليم.')
  process.exit(1)
}
const realManifest = JSON.parse(realManifestText)
const realHot = JSON.parse(realHotText)

/** جالب مدعوم بنظام الملفات: ملف غائب ⇒ `null` — نفس ما يفعل ٤٠٤ في `appCatalog`. */
const realFetch = async (url) => readPublic(url.replace(/^\/food\//, ''))

const realCat = await Catalog.create({ fetchText: realFetch, cache: createMemoryCache() })
await realCat.init()
const realStats = realCat.getStats()
ok(
  `حقيقي: الكتالوج تهيّأ من القرص — ${realStats.hotSetCount} سجلًا ساخنًا`,
  realStats.hotSetLoaded && realStats.hotSetCount === realHot.order.length,
  `البيان يعلن ${realManifest.hot_set.count}`,
)
ok(
  `حقيقي: البيان يعلن ${realManifest.shards.length} شريحة (${realManifest.shards.reduce((a, s) => a + s.count, 0).toLocaleString('en')} سجلًا)`,
  realManifest.shards.length === realManifest.shard_count,
)
/**
 * ⟲ الحارس المضادّ الذي كان غائبًا تمامًا: لو صار `public/food/` فارغًا، **يجب**
 * أن يسقط الإثبات بفحص مسمّى لا أن يبقى أخضر على صفوف الذاكرة.
 */
{
  const blind = await Catalog.create({ fetchText: async () => null, cache: createMemoryCache() })
  await blind.init()
  counter('كتالوج بلا أصول يُكشف — الطقم الساخن غير محمَّل', blind.getStats().hotSetLoaded === false)
  counter('وكتالوج بلا أصول لا يدّعي سجلًا واحدًا', blind.getStats().recordsInMemory === 0, `${blind.getStats().recordsInMemory}`)
}

// حالة الذيل الطويل على القرص الحقيقي — تُقاس بمحاولة فعلية لا بافتراض.
const realShardName = realManifest.shards[0].shard
await realCat.search('حليب', { deepShards: [realShardName] })
const realAvail = realCat.longTailAvailability()
ok(
  `حقيقي: حالة الذيل الطويل «${realAvail.verdict}» بعد ${realAvail.attempts} محاولة`,
  realAvail.attempts > 0,
  `فشل ${realAvail.failures} من ${realAvail.attempts}`,
)
ok(
  `حقيقي: القابل للبحث ${realAvail.searchableRecords} ≠ المعلَن ${realAvail.declaredRecords} — الرقم الصادق معلَن`,
  realAvail.searchableRecords !== realAvail.declaredRecords,
)

// ══════════════════════════════════════════════════════════════════════
// §١ — نموذج الحجم: كتالوج مُولَّد أكبر من حصّة `localStorage`.
//      مُصطنَع **عمدًا ومعلَنًا**: ٧٤ ميغابايت لا تُلتزم في git.
// ══════════════════════════════════════════════════════════════════════
const SHARD_COUNT = 41
const RECORDS = 60_000
const LOCALSTORAGE_QUOTA_BYTES = 5 * 1024 * 1024

/** GTIN-13 صالح (خانة تحقّق mod-10) — يمرّ بنفس `classifyGtin` الذي يستعمله وقت التشغيل. */
function makeGtin(seed) {
  const body = String(seed).padStart(12, '6').slice(-12)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3)
  return `${body}${(10 - (sum % 10)) % 10}`
}
const to14 = (g) => g.padStart(14, '0')

const shardRecords = new Map()
const hot = []
for (let i = 0; i < RECORDS; i++) {
  const gtin = makeGtin(i)
  const rec = {
    gtin: to14(gtin), name_ar: `منتج ${i}`, name_en: `product ${i}`,
    brand_ar: `علامة ${i % 500}`, brand_en: `brand ${i % 500}`,
    market: i % 97 === 0 ? 'SA' : i % 53 === 0 ? 'GCC' : 'GLOBAL',
    kcal: 100 + (i % 400), protein: i % 30, carbs: i % 60, fat: i % 20,
    serving_g: 100, source: 'openfoodfacts',
  }
  const name = routing.shardName(routing.assignShard(to14(gtin), SHARD_COUNT), SHARD_COUNT)
  if (!shardRecords.has(name)) shardRecords.set(name, [])
  shardRecords.get(name).push(rec)
  if (hot.length < 599 && rec.market !== 'GLOBAL') hot.push(rec)
}

/** أغلفة مطابقة لما يكتبه خطّ الإنتاج فعلًا — لا شكل مخترع للاختبار. */
const tokensOf = (recs) => {
  const t = {}
  recs.forEach((r, i) => {
    for (const tok of `${r.name_ar} ${r.name_en} ${r.brand_ar}`.toLowerCase().split(' ')) {
      if (tok.length < 2) continue
      ;(t[tok] ||= []).push(i)
    }
  })
  return t
}
const shardJson = new Map()
const indexJson = new Map()
for (const [name, recs] of shardRecords) {
  const byGtin = {}
  for (const r of recs) byGtin[r.gtin] = r
  shardJson.set(name, JSON.stringify({ shard: name, count: recs.length, licence: 'ODbL 1.0', records: byGtin }))
  indexJson.set(name, JSON.stringify({ shard: name, order: recs.map((r) => r.gtin), tokens: tokensOf(recs) }))
}
const hotByGtin = {}
for (const r of hot) hotByGtin[r.gtin] = r
const hotJson = JSON.stringify({ count: hot.length, licence: 'ODbL 1.0', order: hot.map((r) => r.gtin), records: hotByGtin, tokens: tokensOf(hot) })
const manifestJson = JSON.stringify({
  shard_count: SHARD_COUNT,
  shards: [...shardRecords.keys()].map((s) => ({ shard: s, count: shardRecords.get(s).length, sha256: '' })),
  hot_set: { count: hot.length },
})

const datasetBytes = [...shardJson.values()].reduce((a, s) => a + Buffer.byteLength(s), 0)
ok(`النموذج: ${RECORDS.toLocaleString('en')} سجلًا في ${shardRecords.size} شريحة`, shardRecords.size === SHARD_COUNT)
ok(
  `النموذج: أكبر من حصّة localStorage (${(datasetBytes / 1048576).toFixed(1)} ميغابايت > ${LOCALSTORAGE_QUOTA_BYTES / 1048576} ميغابايت)`,
  datasetBytes > LOCALSTORAGE_QUOTA_BYTES,
  `${datasetBytes} بايت`,
)
ok('النموذج: كل شريحة مأهولة — التوجيه لم ينهَر إلى نصف الجيوب', [...shardRecords.values()].every((r) => r.length > 0))

// ═══════════ جالب مُحقَن يعدّ كل طلب (لكتل الحجم) ═══════════
let fetched = []
const fetchText = async (url) => {
  fetched.push(url)
  const path = url.replace(/^\/food\//, '')
  if (path === 'manifest.json') return manifestJson
  if (path === 'hot-set.json') return hotJson
  const m = path.match(/^shards\/(.+?)(\.idx)?\.json$/)
  if (!m) return null
  return m[2] ? (indexJson.get(m[1]) ?? null) : (shardJson.get(m[1]) ?? null)
}
const bytesOverWire = () =>
  fetched.reduce((a, u) => {
    const p = u.replace(/^\/food\//, '')
    if (p === 'manifest.json') return a + Buffer.byteLength(manifestJson)
    if (p === 'hot-set.json') return a + Buffer.byteLength(hotJson)
    const m = p.match(/^shards\/(.+?)(\.idx)?\.json$/)
    if (!m) return a
    return a + Buffer.byteLength((m[2] ? indexJson.get(m[1]) : shardJson.get(m[1])) ?? '')
  }, 0)

// ═══════════ ٢) التهيئة لا تلمس أي شريحة ═══════════
const cat = await Catalog.create({ fetchText, cache: createMemoryCache() })
await cat.init()
let st = cat.getStats()
ok('التهيئة: الطقم الساخن محمَّل', st.hotSetLoaded && st.hotSetCount === hot.length, `${st.hotSetCount}`)
ok('التهيئة: **صفر** شرائح مجلوبة', st.shardsFetched.length === 0, JSON.stringify(st.shardsFetched))
ok('التهيئة: السجلات في الذاكرة = الطقم الساخن وحده', st.recordsInMemory === hot.length, `${st.recordsInMemory}`)
ok(
  `التهيئة: البايتات المنقولة جزء ضئيل من الكتالوج (${(bytesOverWire() / 1048576).toFixed(2)} من ${(datasetBytes / 1048576).toFixed(1)} ميغابايت)`,
  bytesOverWire() < datasetBytes * 0.1,
)

// ═══════════ ٣) بحث الباركود: شريحة واحدة لا أربعون ═══════════
const coldGtin = makeGtin(45_123)
const expectedShard = routing.shardName(routing.assignShard(to14(coldGtin), SHARD_COUNT), SHARD_COUNT)
fetched = []
const found = await cat.lookupByGtin(coldGtin)
st = cat.getStats()
ok('الباركود: السجل وُجد', found?.gtin === to14(coldGtin), `${found?.gtin}`)
ok('الباركود: جُلبت شريحة **واحدة** بالضبط', st.shardsFetched.length === 1, JSON.stringify(st.shardsFetched))
ok('الباركود: الشريحة هي التي يحسبها التوجيه', st.shardsFetched[0] === expectedShard, `المحسوبة ${expectedShard}`)
ok('الباركود: لم تُجلب فهارس (المسار مفتاح مباشر لا بحث)', st.indexesFetched.length === 0)
{
  const naive = await Catalog.create({ fetchText, cache: createMemoryCache() })
  await naive.init()
  for (const name of shardRecords.keys()) await naive.lookupByGtin(makeGtin(shardRecords.get(name)[0].gtin.slice(-13, -1)))
  const ns = naive.getStats()
  counter('محاكاة الجلب الشامل تُكشف — الشرائح المجلوبة تتجاوز الواحدة بكثير', ns.shardsFetched.length > 1, `${ns.shardsFetched.length} شريحة`)
  counter('محاكاة الجلب الشامل تُكشف — السجلات في الذاكرة تتجاوز عُشر الكتالوج', ns.recordsInMemory > RECORDS * 0.1, `${ns.recordsInMemory}`)
}

// ═══════════ ٤) الطقم الساخن يعمل بلا شبكة ═══════════
fetched = []
const beforeNet = cat.getStats().networkFetches
const hotHit = await cat.lookupByGtin(hot[10].gtin)
ok('الساخن: أُصيب من الذاكرة بلا أي طلب شبكة', hotHit?.gtin === hot[10].gtin && fetched.length === 0, `${fetched.length} طلبًا`)
ok('الساخن: عدّاد الشبكة لم يتحرّك', cat.getStats().networkFetches === beforeNet)

// ═══════════ ٥) الكتابة على كل ضغطة مفتاح لا تُعيد التحميل ═══════════
const typed = ['م', 'من', 'منت', 'منتج', 'منتج ', 'منتج 4', 'منتج 45', 'منتج 451']
const netBefore = cat.getStats().networkFetches
const memBefore = cat.getStats().recordsInMemory
const t0 = process.hrtime.bigint()
for (const q of typed) await cat.search(q, { limit: 20 })
const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
ok(`الكتابة: ${typed.length} ضغطات لم تُنتج **أي** طلب شبكة`, cat.getStats().networkFetches === netBefore, `${cat.getStats().networkFetches - netBefore} طلبًا`)
ok('الكتابة: عدد السجلات في الذاكرة لم يتغيّر', cat.getStats().recordsInMemory === memBefore)
ok(
  `الكتابة: السجلات في الذاكرة تبقى جزءًا ضئيلًا (${cat.getStats().recordsInMemory.toLocaleString('en')} من ${RECORDS.toLocaleString('en')})`,
  cat.getStats().recordsInMemory < RECORDS * 0.1,
)
ok(`الكتابة: زمن ${typed.length} استعلامات ${elapsedMs.toFixed(1)}مي — دون ٥٠٠مي`, elapsedMs < 500, `${elapsedMs.toFixed(1)}ms`)
counter('عدّاد الشبكة فعّال — التهيئة نفسها سجّلت طلبات', netBefore > 0)

// ══════════════════════════════════════════════════════════════════════
// §٦ — البحث العميق عبر **مقبس حقيقي**، على كتالوج **بارد**.
//      هنا كان العطل B2، وهنا كان الاختبار يصفه بدل أن يحرسه.
// ══════════════════════════════════════════════════════════════════════
const httpHits = []
const server = createServer((req, res) => {
  httpHits.push(req.url)
  const path = decodeURIComponent(req.url ?? '').replace(/^\/food\//, '')
  const send = (body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(body) }
  if (path === 'manifest.json') return send(manifestJson)
  if (path === 'hot-set.json') return send(hotJson)
  const m = path.match(/^shards\/(.+?)(\.idx)?\.json$/)
  const body = m ? (m[2] ? indexJson.get(m[1]) : shardJson.get(m[1])) : undefined
  if (!body) { res.writeHead(404); return res.end('not found') } // ٤٠٤ صادق، لا احتياط HTML
  return send(body)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const httpFetch = async (url) => {
  try {
    const res = await fetch(url)
    return res.ok ? await res.text() : null
  } catch { return null }
}

let deepReport = ''
try {
  // كتالوج **بارد**: لا فحص باركود قبله، فلا شريحة مُدفأة تنجّي مسارًا مكسورًا.
  const cold = await Catalog.create({ fetchText: httpFetch, cache: createMemoryCache(), baseUrl: `http://127.0.0.1:${port}/food` })
  await cold.init()
  ok('المقبس: التهيئة عبر HTTP حقيقي نجحت', cold.getStats().hotSetLoaded, `المنفذ ${port}`)
  ok('المقبس: كتالوج بارد — صفر شرائح قبل البحث', cold.getStats().shardsFetched.length === 0)

  // الرمز `45123` موجود في فهرس شريحة السجل نفسه — بحث نصّي لا باركود.
  const targetShard = expectedShard
  const deepHits = await cold.search('45123', { deepShards: [targetShard], limit: 10 })
  const coldStats = cold.getStats()

  // ★ التأكيد الذي كان مقلوبًا: العميق **يجد**، ولا يكتفي بجلب فهرس.
  ok(`العميق: البحث على كتالوج بارد **وجد** ${deepHits.length} سجلًا`, deepHits.length > 0, `${deepHits[0]?.name_ar ?? '—'}`)
  ok('العميق: الحمولة جُلبت فعلًا — لا قراءة خريطة فارغة', coldStats.shardsFetched.includes(targetShard), JSON.stringify(coldStats.shardsFetched))
  ok('العميق: الفهرس جُلب أيضًا (الفهرس يقود، الحمولة تتبع)', coldStats.indexesFetched.includes(targetShard))
  ok('العميق: الطلبان وصلا الخادم فعلًا عبر الشبكة', httpHits.includes(`/food/shards/${targetShard}.idx.json`) && httpHits.includes(`/food/shards/${targetShard}.json`), `${httpHits.length} طلبًا`)

  /**
   * ⟲ التأكيد المضادّ لـB2 — **محاكاة المسار غير الجالب بفحص مسمّى لا باستثناء تقني**.
   *
   * يعيد المحاكي خوارزمية النسخة المكسورة حرفيًا: يستشير الفهرس، ثم يقرأ من
   * خريطة الشرائح **المقيمة** بدل جلب الحمولة. الخريطة هنا فارغة لأن الكتالوج بارد
   * — فيخرج صفرًا. الفحص يسمّي الصفر ويقارنه بنتيجة المسار المشحون.
   */
  const residentShards = new Map() // ما كانت `this.shards` عليه في كتالوج بارد
  const idxRaw = JSON.parse(indexJson.get(targetShard))
  const brokenPositions = new Set()
  for (const [token, pos] of Object.entries(idxRaw.tokens)) {
    if (token.startsWith('45123')) for (const i of pos) brokenPositions.add(i)
  }
  const brokenHits = []
  if (brokenPositions.size > 0) {
    const shard = residentShards.get(targetShard) // ← السطر المعطوب بعينه
    if (shard) for (const i of brokenPositions) brokenHits.push(idxRaw.order[i])
  }
  counter('محاكاة B2: الفهرس **يجد** مواضع مطابقة — فالمشكلة ليست في الفهرس', brokenPositions.size > 0, `${brokenPositions.size} موضعًا`)
  counter('محاكاة B2: المسار غير الجالب يخرج صفرًا رغم ذلك — بفحص مسمّى لا برمي', brokenHits.length === 0, `${brokenHits.length} نتيجة`)
  counter('محاكاة B2: والمسار المشحون يتفوّق عليه فعلًا', deepHits.length > brokenHits.length, `${deepHits.length} > ${brokenHits.length}`)

  // ═══ ميزانية الحمولات: استعلام واحد لا ينزّل الذيل كلّه ═══
  const budgetCat = await Catalog.create({ fetchText: httpFetch, cache: createMemoryCache(), baseUrl: `http://127.0.0.1:${port}/food` })
  await budgetCat.init()
  const allShards = [...shardRecords.keys()]
  await budgetCat.search('منتج', { deepShards: allShards, limit: 50 })
  const bs = budgetCat.getStats()
  ok(
    `الميزانية: استعلام على ${allShards.length} شريحة جلب ${bs.shardsFetched.length} حمولة فقط (الحدّ ${DEFAULT_DEEP_PAYLOAD_BUDGET})`,
    bs.shardsFetched.length <= DEFAULT_DEEP_PAYLOAD_BUDGET,
    JSON.stringify(bs.shardsFetched),
  )
  ok(
    `الميزانية: والفهارس المجلوبة ${bs.indexesFetched.length} — لم يُمسح الذيل كلّه`,
    bs.indexesFetched.length <= DEFAULT_DEEP_PAYLOAD_BUDGET + 1,
    JSON.stringify(bs.indexesFetched),
  )
  counter(
    'محاكاة تجاهل الميزانية تُكشف — رفعها يزيد الحمولات فعلًا',
    await (async () => {
      const wide = await Catalog.create({ fetchText: httpFetch, cache: createMemoryCache(), baseUrl: `http://127.0.0.1:${port}/food` })
      await wide.init()
      await wide.search('منتج', { deepShards: allShards, limit: 50, maxShardPayloads: 5 })
      return wide.getStats().shardsFetched.length > DEFAULT_DEEP_PAYLOAD_BUDGET
    })(),
  )
  deepReport = `العميق البارد: ${deepHits.length} نتيجة · ${httpHits.length} طلب HTTP · المنفذ ${port}`
} finally {
  await new Promise((r) => server.close(r))
}
ok('المقبس: أُغلق الخادم وتحرّر المنفذ', !server.listening)

// ═══════════ ٧) الذاكرة المؤقتة تمنع الجلب المكرّر ═══════════
const netB = cat.getStats().networkFetches
await cat.lookupByGtin(makeGtin(45_124))
const sameShard = routing.shardName(routing.assignShard(to14(makeGtin(45_124)), SHARD_COUNT), SHARD_COUNT)
if (sameShard === expectedShard) {
  ok('الذاكرة: GTIN ثانٍ من نفس الشريحة لم يُنتج جلبًا جديدًا', cat.getStats().networkFetches === netB)
} else {
  ok('الذاكرة: GTIN من شريحة أخرى جلب شريحته وحدها', cat.getStats().shardsFetched.length === 2)
}

// ═══════════ ٨) لا `localStorage` في مسار الكتالوج ═══════════
const { readFileSync } = await import('node:fs')
const catalogSrcs = [
  'src/lib/food/catalog/catalog.ts',
  'src/lib/food/catalog/idbCache.ts',
  'src/lib/food/catalog/rank.ts',
].map((p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))
const stripped = catalogSrcs.map((s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '))
ok('الحصّة: لا `localStorage` في أي ملف من طبقة الكتالوج', stripped.every((s) => !/localStorage/.test(s)))
ok('الحصّة: الذاكرة المؤقتة IndexedDB لا غير', /indexedDB|IDBFactory/.test(catalogSrcs[1]))
counter('حارس الحصّة فعّال — ذكرٌ في تعليق لا يخدعه', !/localStorage/.test('/* localStorage */'.replace(/\/\*[\s\S]*?\*\//g, ' ')))

// ═══════════ ٩) غياب IndexedDB لا يعطّل الكتالوج ═══════════
const degraded = await Catalog.create({ fetchText, cache: createMemoryCache() })
await degraded.init()
const dGtin = makeGtin(31_337)
const dFound = await degraded.lookupByGtin(dGtin)
ok('التدهور: الكتالوج يعمل بلا IndexedDB', dFound?.gtin === to14(dGtin))
ok('التدهور: الطبقة العاملة معلَنة لا مسكوت عنها', degraded.getStats().cacheKind === 'memory')

// ═══════════ التقرير ═══════════
console.log('════════ إثبات طبقة تسليم الكتالوج — قِمّة ════════\n')
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
console.log(`   حقيقي: ${realStats.hotSetCount} سجلًا ساخنًا من public/food/ · البيان يعلن ${realAvail.declaredRecords.toLocaleString('en')} · القابل للبحث ${realAvail.searchableRecords}`)
console.log(`   نموذج الحجم: ${RECORDS.toLocaleString('en')} سجلًا · ${(datasetBytes / 1048576).toFixed(1)}ميغابايت · ${SHARD_COUNT} شريحة`)
console.log(`   ${deepReport}`)
