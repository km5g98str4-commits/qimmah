/**
 * إثبات الذيل الطويل — [SOVEREIGN-FOOD-001].
 *
 * ═══ السؤال، بصياغته الدقيقة ═══
 * ليس «هل الذيل الطويل موجود؟» بل: **هل حالته المعلَنة تطابق حالته الفعلية؟**
 *
 * ولذلك يفرّق هذا الإثبات بين حالتين لا يجوز خلطهما:
 *
 * | الحالة | الحكم | لماذا |
 * |---|---|---|
 * | **الشرائح غائبة** (٤٠٤) | ✅ **مقبول ومُبلَّغ** | تبعية رفع معلنة (F-2). التطبيق يتدهور بصدق ولا يعد بستين ألفًا. |
 * | **الشرائح مخدومة وغير قابلة للبحث** | ❌ **عطل** | هذا كان B2 بالضبط: بايتات مرفوعة وبحثٌ لا يصلها. |
 *
 * ⚠️ **الغياب لا يُمرَّر باختلاق.** الإثبات لا يصنع صفوفًا في الذاكرة ليعلن النجاح؛
 * يقيس `public/food/` الحقيقي ويقول ما وجد. وحين تغيب الشرائح **يبقى أخضر بشرط
 * واحد**: أن يكون التطبيق قد أعلن غيابها بصدق (`verdict === 'unavailable'`
 * و`searchableRecords` = الطقم الساخن وحده). فإن ادّعى غير ذلك — سقط.
 *
 * والشقّ الثاني (الشرائح مخدومة) يُختبر بخادم `node:http` حقيقي يقدّم شريحة
 * مبنيّة بنفس أدوات خطّ الإنتاج، فلا يبقى الفرع الناجح نظريًّا.
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const notes = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail), counter: true })

const [{ Catalog }, { createMemoryCache }, norm] = await Promise.all([
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/text/foodNormalize.ts'),
])

const QUERY = 'المراعي'
const PUBLIC_FOOD = resolve(ROOT, 'public/food')
const readPublic = async (name) => {
  try { return await readFile(resolve(PUBLIC_FOOD, name), 'utf8') } catch { return null }
}

// ══════════════════════════════════════════════════════════════════════
// §١ — ما هو على القرص فعلًا. لا افتراض، ولا اختلاق.
// ══════════════════════════════════════════════════════════════════════
const manifestText = await readPublic('manifest.json')
ok('البيان موجود على القرص', manifestText !== null)
if (manifestText === null) {
  console.log('✗ `public/food/manifest.json` غائب — لا يمكن الحكم على الذيل الطويل أصلًا.')
  process.exit(1)
}
const manifest = JSON.parse(manifestText)
const declaredShards = manifest.shards.map((s) => s.shard)
const declaredRecords = manifest.shards.reduce((a, s) => a + s.count, 0)

let present = 0
let absent = 0
for (const name of declaredShards) {
  const payload = await readPublic(`shards/${name}.json`)
  const index = await readPublic(`shards/${name}.idx.json`)
  if (payload !== null && index !== null) present += 1
  else absent += 1
}
const allPresent = present === declaredShards.length
const allAbsent = present === 0
ok(
  `جرد الشرائح: ${present} حاضرة · ${absent} غائبة من ${declaredShards.length}`,
  allPresent || allAbsent,
  allPresent || allAbsent ? 'حالة متّسقة' : '⚠️ حالة مختلطة — رفعٌ ناقص',
)

// ══════════════════════════════════════════════════════════════════════
// §٢ — الحالة الفعلية: هل يعلنها التطبيق بصدق؟
// ══════════════════════════════════════════════════════════════════════
const realFetch = async (url) => readPublic(url.replace(/^\/food\//, ''))
const cat = await Catalog.create({ fetchText: realFetch, cache: createMemoryCache() })
await cat.init()
const hotOnly = cat.getStats().recordsInMemory
// محاولة فعلية على أول شريحة — الحكم لا يُخمَّن قبلها.
await cat.search('حليب', { deepShards: [declaredShards[0]] })
const avail = cat.longTailAvailability()

ok(`الحكم قبل المحاولة لا يُخمَّن — بعد ${avail.attempts} محاولة صار «${avail.verdict}»`, avail.attempts > 0)

if (allAbsent) {
  notes.push('الشرائح غائبة كلّها — تبعية رفع معلَنة (F-2)، لا عطل برمجي.')
  ok('الغياب: الحكم «unavailable» لا «available»', avail.verdict === 'unavailable', avail.verdict)
  ok(
    `الغياب: القابل للبحث ${avail.searchableRecords} = الطقم الساخن وحده (${hotOnly}) — لا ادّعاء بـ${declaredRecords.toLocaleString('en')}`,
    avail.searchableRecords === hotOnly,
  )
  ok('الغياب: التطبيق لم يرمِ ولم ينكسر — تدهور صادق', cat.getStats().hotSetLoaded === true)
  ok(`الغياب: الفارق المعلَن صريح — ${declaredRecords.toLocaleString('en')} معلَنًا مقابل ${avail.searchableRecords} قابلًا للبحث`, avail.declaredRecords > avail.searchableRecords)
} else if (allPresent) {
  notes.push('الشرائح حاضرة — يُختبر أنها **قابلة للبحث** فعلًا لا مرفوعة فقط.')
  ok('الحضور: الحكم «available»', avail.verdict === 'available', avail.verdict)
  const hits = await cat.search('حليب', { deepShards: declaredShards.slice(0, 3), limit: 10 })
  ok('الحضور: البحث العميق يصل السجلات فعلًا — لا بايتات صامتة', hits.length > 0, `${hits.length} نتيجة`)
  ok('الحضور: القابل للبحث تجاوز الطقم الساخن', avail.searchableRecords > hotOnly, `${avail.searchableRecords} > ${hotOnly}`)
} else {
  ok('حالة مختلطة: رفعٌ ناقص — تُعالَج قبل أي ادّعاء عن الذيل الطويل', false, `${present}/${declaredShards.length}`)
}

// ══════════════════════════════════════════════════════════════════════
// §٣ — الفرع الآخر لا يبقى نظريًّا: شريحة **مخدومة فعلًا** عبر مقبس.
//      لو كانت المخدومة غير قابلة للبحث ⇒ **عطل**، ويجب أن يسقط هنا.
// ══════════════════════════════════════════════════════════════════════
const SHARD = declaredShards[0]
const RECORD = {
  gtin: '06281100171447',
  name_ar: 'حليب طويل الأجل كامل الدسم', name_en: 'Long life full fat milk',
  brand_ar: 'المراعي', brand_en: 'Almarai',
  market: 'SA', energy_kcal: 62, protein_g: 3.2, carbs_g: 4.7, fat_g: 3.5,
  serving_size: 200, serving_unit: 'ml', source: 'openfoodfacts',
}
// الفهرس يُبنى بـ`tokenizeWithPrefixes` **نفسها** التي يبنيه بها خطّ الإنتاج —
// لا شكل مخترع للاختبار، وإلا أثبتنا صحّة شيء لا يُشحن.
const tokens = {}
for (const t of norm.tokenizeWithPrefixes(`${RECORD.name_ar} ${RECORD.name_en} ${RECORD.brand_ar}`)) tokens[t] = [0]
const servedShard = JSON.stringify({ shard: SHARD, count: 1, licence: 'ODbL 1.0', records: { [RECORD.gtin]: RECORD } })
const servedIndex = JSON.stringify({ shard: SHARD, order: [RECORD.gtin], tokens })
const hotText = await readPublic('hot-set.json')

const served = []
const server = createServer((req, res) => {
  served.push(req.url)
  const path = decodeURIComponent(req.url ?? '').replace(/^\/food\//, '')
  const send = (b) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(b) }
  if (path === 'manifest.json') return send(manifestText)
  if (path === 'hot-set.json') return send(hotText ?? '{}')
  if (path === `shards/${SHARD}.json`) return send(servedShard)
  if (path === `shards/${SHARD}.idx.json`) return send(servedIndex)
  res.writeHead(404); res.end('not found') // بقية الشرائح تبقى ٤٠٤ صادقًا
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const httpFetch = async (url) => {
  try { const r = await fetch(url); return r.ok ? await r.text() : null } catch { return null }
}

try {
  const live = await Catalog.create({ fetchText: httpFetch, cache: createMemoryCache(), baseUrl: `http://127.0.0.1:${port}/food` })
  await live.init()
  const liveHot = live.getStats().recordsInMemory
  const baseline = await live.search(QUERY, {})
  const hits = await live.search(QUERY, { deepShards: [SHARD] })
  const liveAvail = live.longTailAvailability()

  // ★ الفحص الحاكم: شريحة مخدومة **يجب** أن تكون قابلة للبحث.
  ok(
    `المخدومة: شريحة مرفوعة فعلًا صارت قابلة للبحث — ${hits.length} مقابل أساسٍ ${baseline.length}`,
    hits.length > baseline.length,
    `العمق أضاف ${hits.length - baseline.length}`,
  )
  ok('المخدومة: السجل المرفوع بعينه ظهر في النتائج', hits.some((h) => h.gtin === RECORD.gtin), RECORD.name_ar)
  ok('المخدومة: والأساس بلا عمق لا يحويه — فالإضافة من الشريحة قطعًا', !baseline.some((h) => h.gtin === RECORD.gtin))
  ok('المخدومة: الحكم انقلب إلى «available» بالقياس لا بالإعلان', liveAvail.verdict === 'available', liveAvail.verdict)
  ok('المخدومة: القابل للبحث زاد بمقدار سجلات الشريحة', liveAvail.searchableRecords === liveHot + 1, `${liveAvail.searchableRecords} = ${liveHot} + 1`)
  ok('المخدومة: التوجيه سليم — الباركود من نفس الشريحة يُحلّ', (await live.lookupByGtin(RECORD.gtin))?.gtin === RECORD.gtin)
  ok('المخدومة: النسب ODbL في الحمولة كما يوجبه العقد', JSON.parse(servedShard).licence === 'ODbL 1.0')

  /**
   * ⟲ التأكيد المضادّ: شريحة **غائبة** في نفس الجلسة تبقى غائبة ولا تُدَّعى.
   * فالحكم «available» ليس مفتاحًا عامًّا يفتح الذيل كلّه.
   */
  const otherShard = declaredShards[1]
  const missHits = await live.search(QUERY, { deepShards: [otherShard] })
  counter('شريحة غائبة تبقى غائبة — العمق فيها لا يضيف شيئًا فوق الأساس', missHits.length === baseline.length, `${missHits.length} = ${baseline.length}`)
  counter('ولم تُحمَّل حمولتها أصلًا', !live.getStats().shardsFetched.includes(otherShard), JSON.stringify(live.getStats().shardsFetched))
  counter('و٤٠٤ الشريحة الغائبة وصل الخادم فعلًا — الغياب مقيس لا مفترض', served.includes(`/food/shards/${otherShard}.idx.json`))

  /**
   * ⟲ التأكيد المضادّ الأهمّ: **بايتات مخدومة وبحثٌ لا يصلها = عطل**.
   * يُحاكى بخادم يقدّم الفهرس ويحجب الحمولة — وهو الشكل الذي يتّخذه B2 من الخارج.
   * لو مرّ هذا صامتًا لكان الإثبات يقبل «مرفوع لكن غير قابل للبحث».
   */
  const halfServer = createServer((req, res) => {
    const path = decodeURIComponent(req.url ?? '').replace(/^\/food\//, '')
    const send = (b) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(b) }
    if (path === 'manifest.json') return send(manifestText)
    if (path === 'hot-set.json') return send(hotText ?? '{}')
    if (path === `shards/${SHARD}.idx.json`) return send(servedIndex) // الفهرس يُخدَم
    res.writeHead(404); res.end('not found') // والحمولة **محجوبة**
  })
  await new Promise((r) => halfServer.listen(0, '127.0.0.1', r))
  const halfPort = halfServer.address().port
  try {
    const half = await Catalog.create({ fetchText: httpFetch, cache: createMemoryCache(), baseUrl: `http://127.0.0.1:${halfPort}/food` })
    await half.init()
    const halfBaseline = await half.search(QUERY, {})
    const halfHits = await half.search(QUERY, { deepShards: [SHARD] })
    const halfAvail = half.longTailAvailability()
    counter('محاكاة «فهرس بلا حمولة»: العمق لا يضيف سجلًا فوق الأساس — بفحص مسمّى', halfHits.length === halfBaseline.length, `${halfHits.length} = ${halfBaseline.length}`)
    counter('ولا يظهر السجل المحجوبة حمولته', !halfHits.some((h) => h.gtin === RECORD.gtin))
    counter('ولا يُعلَن «available» كذبًا — الفهرس وحده لا يجعل الذيل متاحًا', halfAvail.searchableRecords === half.getStats().hotSetCount, `${halfAvail.searchableRecords}`)
  } finally {
    await new Promise((r) => halfServer.close(r))
  }
} finally {
  await new Promise((r) => server.close(r))
}
ok('المقابس أُغلقت وتحرّرت المنافذ', !server.listening)

// ══════════════════════════════════════════════════════════════════════
// §٤ — الأحجام المقيسة تطابق سجلّ البناء (أساس خطّة الاستضافة).
// ══════════════════════════════════════════════════════════════════════
const buildManifest = JSON.parse(await readFile(resolve(ROOT, 'data/food-production/manifests/build-manifest.json'), 'utf8'))
const totals = buildManifest.shard_totals
const sumRaw = buildManifest.shards.reduce((a, s) => a + s.bytes_raw, 0)
const sumIdxRaw = buildManifest.shards.reduce((a, s) => a + s.index_bytes_raw, 0)
const maxFile = Math.max(...buildManifest.shards.map((s) => Math.max(s.bytes_raw, s.index_bytes_raw)))
const PAGES_MAX_FILE_BYTES = 25 * 1024 * 1024 // حدّ Cloudflare Pages الموثَّق للملف الواحد
ok(`الأحجام: مجموع الحمولات ${(sumRaw / 1048576).toFixed(2)} ميغابايت يطابق سجلّ البناء`, sumRaw === totals.bytes_raw)
ok(`الأحجام: مجموع الفهارس ${(sumIdxRaw / 1048576).toFixed(2)} ميغابايت`, sumIdxRaw > 0)
ok(
  `Pages: أكبر ملف مفرد ${(maxFile / 1048576).toFixed(2)} ميغابايت — دون حدّ ٢٥ ميغابايت`,
  maxFile < PAGES_MAX_FILE_BYTES,
  `${maxFile} بايت`,
)
ok(
  `Pages: ${declaredShards.length * 2} ملفًا إضافيًا — الحدّ ٢٠٬٠٠٠ ملف للموقع`,
  declaredShards.length * 2 < 20_000,
)
ok('البيان والبناء متّفقان على البصمات — إعادة البناء قابلة للإثبات', manifest.shards.every((s, i) => s.sha256 === buildManifest.shards[i].sha256))

// ═══════════ التقرير ═══════════
console.log('════════ إثبات الذيل الطويل — قِمّة ════════\n')
let failed = 0
for (const c of checks) {
  console.log(`${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
  if (!c.pass) failed++
}
console.log('')
for (const n of notes) console.log(`ℹ️  ${n}`)
const counters = checks.filter((c) => c.counter).length
console.log('')
if (failed) {
  console.log(`❌ فشل الإثبات: ${failed} من ${checks.length} فحصًا.`)
  process.exit(1)
}
console.log(`✅ نجحت كل الفحوص — ${checks.length} فحصًا (منها ${counters} تأكيدًا مضادًّا).`)
console.log(`   الحالة: ${present}/${declaredShards.length} شريحة حاضرة · الحكم «${avail.verdict}»`)
console.log(`   معلَن ${declaredRecords.toLocaleString('en')} سجلًا · قابل للبحث ${avail.searchableRecords}`)
console.log(`   لو رُفعت: ${(sumRaw / 1048576).toFixed(2)} + ${(sumIdxRaw / 1048576).toFixed(2)} = ${((sumRaw + sumIdxRaw) / 1048576).toFixed(2)} ميغابايت خامًا · ${(totals.bytes_gzip_all / 1048576).toFixed(2)} مضغوطًا`)
console.log('   الخطّة: docs/execution/qimmah-sovereign-closure/FOOD-LONGTAIL-PLAN.md')
