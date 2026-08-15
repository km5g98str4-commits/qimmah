/**
 * إثبات طبقة تسليم الكتالوج — [D-1/٢·٤·٥].
 *
 * السؤال الذي يجيبه: **هل يعمل كتالوج أكبر من حصّة `localStorage` فعلًا، بلا
 * تحميل كل السجلات مع كل ضغطة مفتاح؟** والجواب يُقاس بعدّادات حقيقية (جلب شبكة ·
 * شرائح محمَّلة · سجلات في الذاكرة) لا بادّعاء في تعليق.
 *
 * البيانات هنا **مُولَّدة عمدًا**: الشرائح الحقيقية (٩١ ميغابايت) لا تُلتزم في
 * git، والإثبات يجب أن يعمل بلا شبكة وبلا أرتيفكت مُولَّد — وإلا سقط على بيانٍ
 * بائت بدل انحدار حقيقي.
 */
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
/** تأكيد مضادّ: القاعدة يجب أن تكون **قابلة للسقوط**، وإلا فهي بلا أثر. */
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

const [{ Catalog }, { createMemoryCache }, routing] = await Promise.all([
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/food/shardRouting.ts'),
])

// ═══════════ توليد كتالوج أكبر من حصّة localStorage ═══════════
const SHARD_COUNT = 41
const RECORDS = 60_000
const LOCALSTORAGE_QUOTA_BYTES = 5 * 1024 * 1024

/**
 * GTIN-13 صالح (خانة تحقّق mod-10) — يمرّ بنفس `classifyGtin` الذي يستعمله
 * وقت التشغيل، فلا يختبر الإثبات مسارًا لا يقبله المنتج.
 */
function makeGtin(seed) {
  const body = String(seed).padStart(12, '6').slice(-12)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3)
  return `${body}${(10 - (sum % 10)) % 10}`
}
/** الشكل الموحَّد إلى ١٤ خانة — نفس ما يوجّه عليه خطّ الإنتاج. */
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

const shardJson = new Map()
const indexJson = new Map()
for (const [name, recs] of shardRecords) {
  shardJson.set(name, JSON.stringify(recs))
  const postings = {}
  recs.forEach((r, i) => {
    for (const tok of `${r.name_ar} ${r.name_en} ${r.brand_ar}`.toLowerCase().split(' ')) {
      if (tok.length < 2) continue
      ;(postings[tok] ||= []).push(i)
    }
  })
  indexJson.set(name, JSON.stringify({ postings }))
}
const hotJson = JSON.stringify(hot)
const manifestJson = JSON.stringify({
  shard_count: SHARD_COUNT,
  shards: [...shardRecords.keys()].map((s) => ({ shard: s, count: shardRecords.get(s).length, sha256: '' })),
  hot_set: { count: hot.length },
})

const datasetBytes = [...shardJson.values()].reduce((a, s) => a + Buffer.byteLength(s), 0)
ok(`الكتالوج المُولَّد ${RECORDS.toLocaleString('en')} سجلًا في ${shardRecords.size} شريحة`, shardRecords.size === SHARD_COUNT)
ok(
  `الكتالوج أكبر من حصّة localStorage (${(datasetBytes / 1048576).toFixed(1)} ميغابايت > ${LOCALSTORAGE_QUOTA_BYTES / 1048576} ميغابايت)`,
  datasetBytes > LOCALSTORAGE_QUOTA_BYTES,
  `${datasetBytes} بايت`,
)
ok('كل شريحة مأهولة — التوجيه لم ينهَر إلى نصف الجيوب', [...shardRecords.values()].every((r) => r.length > 0))

// ═══════════ جالب مُحقَن يعدّ كل طلب ═══════════
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

// ═══════════ ١) التهيئة لا تلمس أي شريحة ═══════════
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

// ═══════════ ٢) بحث الباركود: شريحة واحدة لا أربعون ═══════════
const coldGtin = makeGtin(45_123)
const expectedShard = routing.shardName(routing.assignShard(to14(coldGtin), SHARD_COUNT), SHARD_COUNT)
fetched = []
const found = await cat.lookupByGtin(coldGtin)
st = cat.getStats()
ok('الباركود: السجل وُجد', found?.gtin === to14(coldGtin), `${found?.gtin}`)
ok('الباركود: جُلبت شريحة **واحدة** بالضبط', st.shardsFetched.length === 1, JSON.stringify(st.shardsFetched))
ok('الباركود: الشريحة هي التي يحسبها التوجيه', st.shardsFetched[0] === expectedShard, `المحسوبة ${expectedShard}`)
ok('الباركود: لم تُجلب فهارس (المسار مفتاح مباشر لا بحث)', st.indexesFetched.length === 0)
// محاكاة التنفيذ الساذج: كتالوج يجلب كل شريحة. العدّادات يجب أن تكشفه.
{
  const naive = await Catalog.create({ fetchText, cache: createMemoryCache() })
  await naive.init()
  for (const name of shardRecords.keys()) await naive.lookupByGtin(makeGtin(shardRecords.get(name)[0].gtin.slice(-13, -1)))
  const ns = naive.getStats()
  counter('محاكاة الجلب الشامل تُكشف — الشرائح المجلوبة تتجاوز الواحدة بكثير', ns.shardsFetched.length > 1, `${ns.shardsFetched.length} شريحة`)
  counter('محاكاة الجلب الشامل تُكشف — السجلات في الذاكرة تتجاوز عُشر الكتالوج', ns.recordsInMemory > RECORDS * 0.1, `${ns.recordsInMemory}`)
}

// ═══════════ ٣) الطقم الساخن يعمل بلا شبكة ═══════════
fetched = []
const beforeNet = cat.getStats().networkFetches
const hotHit = await cat.lookupByGtin(hot[10].gtin)
ok('الساخن: أُصيب من الذاكرة بلا أي طلب شبكة', hotHit?.gtin === hot[10].gtin && fetched.length === 0, `${fetched.length} طلبًا`)
ok('الساخن: عدّاد الشبكة لم يتحرّك', cat.getStats().networkFetches === beforeNet)

// ═══════════ ٤) الكتابة على كل ضغطة مفتاح لا تُعيد التحميل ═══════════
const typed = ['م', 'من', 'منت', 'منتج', 'منتج ', 'منتج 4', 'منتج 45', 'منتج 451']
const netBefore = cat.getStats().networkFetches
const memBefore = cat.getStats().recordsInMemory
const t0 = process.hrtime.bigint()
for (const q of typed) await cat.search(q, { limit: 20 })
const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
const netAfter = cat.getStats().networkFetches
ok(`الكتابة: ${typed.length} ضغطات لم تُنتج **أي** طلب شبكة`, netAfter === netBefore, `${netAfter - netBefore} طلبًا`)
ok('الكتابة: عدد السجلات في الذاكرة لم يتغيّر', cat.getStats().recordsInMemory === memBefore)
ok(
  `الكتابة: السجلات في الذاكرة تبقى جزءًا ضئيلًا (${cat.getStats().recordsInMemory.toLocaleString('en')} من ${RECORDS.toLocaleString('en')})`,
  cat.getStats().recordsInMemory < RECORDS * 0.1,
)
ok(`الكتابة: زمن ${typed.length} استعلامات ${elapsedMs.toFixed(1)}مي — دون ٥٠٠مي`, elapsedMs < 500, `${elapsedMs.toFixed(1)}ms`)
counter('عدّاد الشبكة فعّال — التهيئة نفسها سجّلت طلبات', netBefore > 0)

// ═══════════ ٥) البحث العميق يستشير الفهرس لا الكتالوج ═══════════
const deepShard = st.shardsFetched[0]
const idxBefore = cat.getStats().indexesFetched.length
await cat.search('منتج 45123', { deepShards: [deepShard], limit: 10 })
const stDeep = cat.getStats()
ok('العميق: جُلب فهرس واحد للشريحة المطلوبة', stDeep.indexesFetched.length === idxBefore + 1, JSON.stringify(stDeep.indexesFetched))
ok('العميق: لم تُجلب شرائح إضافية', stDeep.shardsFetched.length === 1, JSON.stringify(stDeep.shardsFetched))
ok(
  `العميق: الفهرس أصغر من شريحته (${Buffer.byteLength(indexJson.get(deepShard))} < ${Buffer.byteLength(shardJson.get(deepShard))} بايت)`,
  Buffer.byteLength(indexJson.get(deepShard)) < Buffer.byteLength(shardJson.get(deepShard)),
)

// ═══════════ ٦) الذاكرة المؤقتة تمنع الجلب المكرّر ═══════════
const netB = cat.getStats().networkFetches
await cat.lookupByGtin(makeGtin(45_124))
const sameShard = routing.shardName(routing.assignShard(to14(makeGtin(45_124)), SHARD_COUNT), SHARD_COUNT)
if (sameShard === deepShard) {
  ok('الذاكرة: GTIN ثانٍ من نفس الشريحة لم يُنتج جلبًا جديدًا', cat.getStats().networkFetches === netB)
} else {
  ok('الذاكرة: GTIN من شريحة أخرى جلب شريحته وحدها', cat.getStats().shardsFetched.length === 2)
}

// ═══════════ ٧) لا `localStorage` في مسار الكتالوج ═══════════
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

// ═══════════ ٨) غياب IndexedDB لا يعطّل الكتالوج ═══════════
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
console.log(`   الكتالوج: ${RECORDS.toLocaleString('en')} سجلًا · ${(datasetBytes / 1048576).toFixed(1)}ميغابايت · ${SHARD_COUNT} شريحة`)
console.log(`   زمن ${typed.length} استعلامات متتابعة: ${elapsedMs.toFixed(1)}مي`)
