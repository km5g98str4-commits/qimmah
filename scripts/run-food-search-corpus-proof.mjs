/**
 * إثبات حزم البحث — [FOOD-LONGTAIL-002].
 *
 * ═══ السؤال ═══
 * ليس «هل الشرائح مرفوعة؟» (أثبته `run-food-longtail-proof`)، بل الفجوة الأخيرة:
 * **هل يصل مستخدم لا يعرف شريحةً ولا باركودًا إلى الستين ألفًا بما يكتبه؟**
 *
 * ═══ لماذا مقبس حقيقي وملفات حقيقية ═══
 * سبق أن مرّ حارسٌ ٢٩/٢٩ على ستين ألف صفٍّ **مخترَع في الذاكرة** — فلم يثبت شيئًا.
 * هنا كل بايت يمرّ عبر `node:http` من `public/food/` على القرص: الدليل، الصفحات،
 * الشرائح. ويُقاس المنقول **مضغوطًا** كما ينقله CDN فعلًا.
 *
 * ═══ وضابط الاختلاق ═══
 * §4.2: كل إحكام يُهاجَم. فيتحقّق الإثبات أن سجلًا من الحزمة **يطابق حقلًا بحقل**
 * نظيره في حمولة الشريحة — فلو كانت الحزم مصنوعة لا مشتقّة لسقط باسمه.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const facts = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail) })
const fact = (key, value) => facts.push([key, String(value)])

const FOOD = resolve(ROOT, 'public/food')
const SEARCH = resolve(FOOD, 'search')

// ══ §٠ — الأصول موجودة على القرص؟ لا ادّعاء بلا ملف. ══
let directory = null
try { directory = JSON.parse(readFileSync(resolve(SEARCH, 'directory.json'), 'utf8')) } catch { /* غائب */ }
// ═══ الأصول غائبة: تبعية نشر، لا عطل كود — ونفس معاملة `run-food-longtail-proof` ═══
//
// حزم البحث مشتقّة من `public/food/shards/` وكلاهما خارج git (٤٦ + ٨٢ ميغابايت).
// فعلى نسخة نظيفة لا وجود لهما. والحكم حينها **ليس** «سقط الإثبات» بل: هل يتدهور
// التطبيق بصدق؟ يبقى أخضر بشرط واحد — أن يعلن الغياب لا أن يبتلعه.
//
// ⚠️ **وهذا الفرع ثغرة محتملة بطبعه:** بوّابة تخضرّ أبدًا لأن الأصول غائبة أبدًا
// لا تحرس شيئًا. حراسة **وجود** الأصول شأن `test:artifact-freshness` ومسار
// النشر، لا شأن هذا الملف — ويُسمّى هنا كي لا يُنسى.
if (!directory) {
  const { Catalog: C } = await loadTsModule('src/lib/food/catalog/catalog.ts')
  const { createMemoryCache: mem } = await loadTsModule('src/lib/food/catalog/idbCache.ts')
  const bare = await C.create({ fetchText: async () => null, cache: mem() })
  await bare.init()
  await bare.searchRanked('kinder', { deep: true })
  const a = bare.longTailAvailability()
  const honest = a.verdict === 'unavailable' && a.corpusRecords === 0
  console.log('⚠️  `public/food/search/` غائب — لم تُقَس التغطية في هذا التشغيل.')
  console.log('   أنتجه: node scripts/food-production/emit-search-buckets.mjs (يتطلّب public/food/shards/)')
  console.log(`${honest ? '✓' : '✗'} وفي غيابه يتدهور التطبيق بصدق: verdict=${a.verdict} · حزم=${a.corpusRecords}`)
  process.exit(honest ? 0 : 1)
}
const corpusManifest = JSON.parse(readFileSync(resolve(SEARCH, 'manifest.json'), 'utf8'))
const shardManifest = JSON.parse(readFileSync(resolve(FOOD, 'manifest.json'), 'utf8'))
const hotSet = JSON.parse(readFileSync(resolve(FOOD, 'hot-set.json'), 'utf8'))
const hotGtins = new Set(hotSet.order)

// ══ خادم حقيقي: يقدّم الملفات ويحسب البايتات المنقولة **مضغوطة** ══
let sentGzip = 0
let sentRaw = 0
let requests = 0
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.replace(/^\/food\//, '').split('?')[0])
  let body
  try { body = readFileSync(resolve(FOOD, path)) } catch {
    res.writeHead(404); res.end(); return
  }
  const gz = gzipSync(body, { level: 6 })
  requests += 1
  sentRaw += body.length
  sentGzip += gz.length
  res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' })
  res.end(gz)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/food`

const [{ Catalog }, { createMemoryCache }, unified, corpusMod] = await Promise.all([
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/food/unifiedSearch.ts'),
  loadTsModule('src/lib/food/searchBuckets.ts'),
])

const fetchText = async (url) => {
  const res = await fetch(url)
  return res.ok ? await res.text() : null
}
const newCatalog = async () => {
  const cat = await Catalog.create({ fetchText, baseUrl: base, cache: createMemoryCache() })
  await cat.init()
  return cat
}
const meter = () => { const r = sentGzip, w = sentRaw, q = requests; return () => ({ gzip: sentGzip - r, raw: sentRaw - w, requests: requests - q }) }

const catalog = await newCatalog()

// ══════════════════════════════════════════════════════════════════════
// §١ — الأرقام المعلَنة، مقيسة لا منقولة
// ══════════════════════════════════════════════════════════════════════
const declaredRecords = shardManifest.shards.reduce((a, s) => a + s.count, 0)
const pageFiles = readdirSync(resolve(SEARCH, 'b')).length
fact('TOTAL_RECORDS_AVAILABLE', declaredRecords)
fact('HOT_SET', hotSet.order.length)
fact('SHARDS', shardManifest.shards.length)
fact('BUCKETS', Object.keys(directory.buckets).length)
fact('BUCKET_PAGE_FILES', pageFiles)

ok('دليل الحزم يعلن نفس عدد سجلات بيان الشرائح', directory.total_records === declaredRecords,
  `${directory.total_records} = ${declaredRecords}`)
ok('نسخة التطبيع في الدليل = نسخة وقت التشغيل', directory.normalization_version === corpusManifest.normalization_version,
  directory.normalization_version)

// ══════════════════════════════════════════════════════════════════════
// §٢ — التغطية: كم سجلًا يمكن بلوغه فعلًا، من الملفات المصدَّرة نفسها
// ══════════════════════════════════════════════════════════════════════
// «قابل للبلوغ» بتعريفين دقيقين، وكلاهما مقيس من الملفات المصدَّرة لا مقدَّر:
//
//   أ) **ممسوح ضمن الميزانية** — السجل يقع في أوّل `budget` صفحات حزمةٍ ما، أي
//      أن استعلامًا يختار تلك الحزمة **سيفحصه**.
//   ب) **قابل للبلوغ باسمه** — وهو ما يفعله المستخدم فعلًا: يكتب اسم المنتج.
//      يُحسب بالمخطّط الحقيقي (`planBucketQuery`) على اسم السجل نفسه، ثم يُتحقّق
//      أن السجل داخل صفحات الحزمة التي **يختارها المخطّط** لا أي حزمة.
//
// (ب) أضيق من (أ) وهو الرقم الذي يُعلَن، لأنه وحده يصف فعلًا يقوم به إنسان.
const { DEFAULT_BUCKET_PAGE_BUDGET, encodeBucketKey, planBucketQuery } = corpusMod
const bucketsOf = new Map()
const nameOf = new Map()
for (const [key, count] of Object.entries(directory.buckets)) {
  const pages = Math.ceil(count / directory.page_size)
  for (let p = 0; p < Math.min(pages, DEFAULT_BUCKET_PAGE_BUDGET); p++) {
    const page = JSON.parse(readFileSync(resolve(SEARCH, 'b', `${encodeBucketKey(key)}-${p}.json`), 'utf8'))
    const gi = page.fields.indexOf('gtin')
    const ar = page.fields.indexOf('name_ar')
    const en = page.fields.indexOf('name_en')
    const bar = page.fields.indexOf('brand_ar')
    const ben = page.fields.indexOf('brand_en')
    page.columns[gi].forEach((gtin, i) => {
      let set = bucketsOf.get(gtin)
      if (!set) { set = new Set(); bucketsOf.set(gtin, set) }
      set.add(key)
      if (!nameOf.has(gtin)) {
        nameOf.set(gtin, [page.columns[ar][i] || page.columns[en][i] || '',
                          page.columns[bar][i] || page.columns[ben][i] || ''])
      }
    })
  }
}
const reaches = (gtin, text) => {
  const plan = planBucketQuery(text, directory)
  return plan.reason === 'ok' && !!bucketsOf.get(gtin)?.has(plan.key)
}
let byName = 0
let byNameOrBrand = 0
const shortNamed = []
const residue = []
const routingDefects = []
for (const [gtin, [name, brand]] of nameOf) {
  const namePlan = planBucketQuery(name, directory)
  const nameWorks = namePlan.reason === 'ok' && !!bucketsOf.get(gtin)?.has(namePlan.key)
  if (nameWorks) byName += 1
  else if (name.trim().length < directory.key_length && shortNamed.length < 3) shortNamed.push(`${gtin}«${name}»→${brand || '—'}`)
  const brandPlan = planBucketQuery(brand, directory)
  if (nameWorks || (brandPlan.reason === 'ok' && bucketsOf.get(gtin)?.has(brandPlan.key))) { byNameOrBrand += 1; continue }
  // ═══ البقيّة تُصنَّف، لا تُدوَّر ═══
  // «تعذّر» له سببان لا يجوز خلطهما: اسمٌ يذوب تحت حدّ البادئة (بيانات)، أو
  // توجيهٌ فشل رغم وجود كلمة صالحة (**عطل**). الثاني يُسمّى ويُسقط الإثبات.
  if (namePlan.reason === 'too-short' && brandPlan.reason === 'too-short') residue.push(`${gtin}«${name}»`)
  else routingDefects.push(`${gtin}«${name}»/«${brand}» name=${namePlan.reason} brand=${brandPlan.reason}`)
}
fact('TOTAL_RECORDS_SCANNABLE', `${bucketsOf.size} (${((bucketsOf.size / declaredRecords) * 100).toFixed(3)}%)`)
fact('TOTAL_RECORDS_DISCOVERABLE', `${byNameOrBrand} (${((byNameOrBrand / declaredRecords) * 100).toFixed(3)}% — بكلمة مقروءة عن العلبة: الاسم أو العلامة)`)
fact('  منها بالاسم وحده', `${byName} (${((byName / declaredRecords) * 100).toFixed(3)}%)`)
fact('  خارج المتناول نصًّا', `${residue.length} — اسمها وعلامتها كلاهما يذوب تحت حدّ البادئة (${residue.slice(0, 3).join(' · ')})`)
ok('كل سجل معلَن يقع ضمن ميزانية صفحات حزمةٍ من حزمه',
  bucketsOf.size === declaredRecords, `${bucketsOf.size}/${declaredRecords}`)
// ⚠️ الفارق عن ١٠٠٪ **بيانات لا توجيه**: ٣٩ سجلًا اسمها «12» أو «24»، وخمسة
// اسمها وعلامتها «M&M's» — يطبّعها `normalizeProductKey` إلى «m m s»، وكلماتها
// كلّها دون حدّ البادئة. إصلاحه يمرّ بـ`NORMALIZATION_VERSION` ويُبطل كل الفهارس،
// فهو قرار موجة أخرى. **يُعلَن ولا يُدوَّر.**
ok('لا سجل يتعذّر بلوغه بسبب **توجيه**؛ البقيّة كلّها كلمات دون حدّ البادئة',
  routingDefects.length === 0, routingDefects.slice(0, 3).join(' · ') || `${residue.length} سجلًا بيانيًّا`)
ok('السجلات التي لا يبلغها اسمها اسمُها أقصر من حدّ البادئة — لا عطل توجيه',
  shortNamed.length > 0 || byName === declaredRecords,
  `${declaredRecords - byName} سجلًا · مثال: ${shortNamed.join(' · ') || 'لا شيء'}`)

// ══════════════════════════════════════════════════════════════════════
// §٣ — الاستعلامات العشرة: نتائج ذات معنى، عبر المقبس
// ══════════════════════════════════════════════════════════════════════
const QUERIES = ['شاورما', 'كبسة', 'مندي', 'فول', 'تميس', 'بروست', 'رز', 'دجاج', 'برجر', 'بيتزا']
const loads = []
for (const q of QUERIES) {
  const stop = meter()
  const results = await unified.searchAllFoods(q, { catalog, lang: 'ar' })
  const spend = stop()
  loads.push({ q, ...spend, n: results.length })
  ok(`«${q}» يعيد نتائج`, results.length > 0,
    `${results.length} نتيجة · الأولى: ${results[0]?.item.nameAr ?? '—'} (${results[0]?.source ?? '—'}) · ${spend.gzip} بايت`)
}
// «شاورما» ساندويتش لا رغيف: المنسَّق يسبق المعبّأ عند تكافؤ المعنى.
const shawarma = await unified.searchAllFoods('شاورما', { catalog, lang: 'ar' })
ok('«شاورما» أولها منسَّق لا معبّأ — الترتيب لم ينكسر بالعمق',
  shawarma[0]?.source === 'curated', shawarma[0]?.item.nameAr ?? '—')

// ══════════════════════════════════════════════════════════════════════
// §٤ — خمسة سجلات معبّأة **خارج الطقم الساخن**، بأسمائها
// ══════════════════════════════════════════════════════════════════════
// الاستعلام لكل سجل هو **ما يكتبه إنسان**: اسم المنتج كما يقرؤه على العلبة.
// و«Lurpak» يُبحث بعلامته لأن اسم سجله «Unsalted Butter» والعلامة في حقلها —
// وهي حالة حقيقية في القاعدة، فتُختبر كما هي لا كما نحبّ.
const LONG_TAIL = [
  { q: 'kinder chocolate', gtin: '08000500141601', name: 'Kinder Chocolate', tier: 'name-exact' },
  { q: 'oreo', gtin: '00044000060237', name: 'OREO', tier: 'name-exact' },
  { q: 'almarai vanilla', gtin: '06281007038959', name: 'Almarai vanilla flavored milk', tier: 'name-prefix' },
  { q: 'pringles salt', gtin: '05053990167531', name: 'Pringles Salt & Vinegar', tier: 'name-prefix' },
  { q: 'lurpak', gtin: '05740900404700', name: 'Lurpak Unsalted Butter', tier: 'brand' },
]
for (const item of LONG_TAIL) {
  ok(`«${item.name}» خارج الطقم الساخن فعلًا`, !hotGtins.has(item.gtin), item.gtin)
  const stop = meter()
  const hits = await catalog.searchRanked(item.q, { deep: true, limit: 24 })
  const spend = stop()
  loads.push({ q: item.q, ...spend, n: hits.length })
  const found = hits.find((h) => h.product.gtin === item.gtin)
  ok(`«${item.q}» يبلغ ${item.name} من الذيل الطويل برتبة ${item.tier}`,
    !!found && found.tier === item.tier,
    `${hits.length} مطابقة · ${spend.gzip} بايت · ${found ? found.tier : 'غائب'}`)
}

// ═══ الوصل نفسه محروس، لا الآلة وحدها ═══
//
// ⚠️ **هذا الفحص كُتب بعد التفاف نجح.** كانت فحوص الذيل الطويل أعلاه تنادي
// `searchRanked(..., { deep: true })` صراحةً — أي تختبر **الآلة**. فحين خُرِّب
// السطر الذي يشعل العمق في `unifiedSearch` (وهو السطر الوحيد الذي يصل الشاشة
// بالذيل الطويل) **مرّ الإثبات كاملًا أخضر**. §4.2: مرورٌ غير مستحقّ ليس نجاحًا.
//
// فيُختبر هنا **نفس النداء الذي تكتبه الشاشة**: بلا `deep`، بلا `deepShards`،
// بكتالوج جديد لم يُحمَّل له شيء. سقوطه يعني أن المستخدم فقد الذيل الطويل.
{
  const wired = await newCatalog()
  // (أ) سطر الوصل نفسه، قبل أي إزالة تكرار: المرشّح المعبّأ يصل بالـGTIN بعينه.
  const wiredHits = await unified.rankPackaged(wired, 'kinder chocolate')
  ok('المسار الذي تستدعيه الشاشة — بلا أي خيار عمق — يبلغ الذيل الطويل',
    wiredHits.some((h) => h.product.gtin === '08000500141601'),
    `${wiredHits.length} مرشّحًا معبّأً`)
  // (ب) وما يراه المستخدم فعلًا بعد الاتحاد وإزالة التكرار: سجلٌ من خارج الساخن.
  //     التمييز مقصود — الدمج يوحّد الأسماء المتطابقة، فقد يفوز GTIN آخر بنفس
  //     الاسم. المطلوب أن **يصل الذيل الطويل**، لا أن يفوز صفٌّ بعينه.
  const asScreenCalls = await unified.searchAllFoods('kinder chocolate', { catalog: wired, lang: 'ar', limit: 24 })
  const topOff = asScreenCalls[0]
  ok('وما يظهر للمستخدم سجلٌ معبّأ من خارج الطقم الساخن',
    !!topOff && topOff.source === 'packaged' && topOff.item.id.startsWith('off:')
      && !hotGtins.has(topOff.item.id.slice(4)),
    `${asScreenCalls.length} نتيجة · ${topOff?.item.nameAr ?? '—'} (${topOff?.item.id})`)
  const availability = wired.longTailAvailability()
  ok('وبعده يصير القابل للبحث = المعلَن، عن قياسٍ لا عن بيان',
    availability.searchableRecords === availability.declaredRecords && availability.verdict === 'available',
    `قابل ${availability.searchableRecords} · معلَن ${availability.declaredRecords} · ${availability.verdict}`)
}

// ضابط الاختلاق: سجل الحزمة **مشتقّ** من حمولة الشريحة، لا مصنوع.
const kinderHit = (await catalog.searchRanked('kinder chocolate', { deep: true, limit: 24 }))
  .find((h) => h.product.gtin === '08000500141601')
// الشريحة تُحسب بالتوجيه نفسه لا تُكتب باسمها: عدد الشرائح يتغيّر مع كل إعادة بناء
// (٤١ ⇒ ٤٤ مع كتالوج OFF السعودي)، واسمٌ مثبَّت يجعل الإثبات يقيس شريحة خاطئة.
const routing = await loadTsModule('src/lib/food/shardRouting.ts')
const kinderShardName = routing.shardName(routing.assignShard('08000500141601', shardManifest.shard_count), shardManifest.shard_count)
const kinderShard = JSON.parse(readFileSync(resolve(FOOD, `shards/${kinderShardName}.json`), 'utf8')).records['08000500141601']
const sameFields = kinderHit && kinderShard && ['name_en', 'brand_en', 'energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'market']
  .every((f) => kinderHit.product[f] === kinderShard[f])
counter('سجل الحزمة يطابق حمولة الشريحة حقلًا بحقل — لا صفوف مخترَعة',
  !!sameFields, `kcal ${kinderHit?.product.energy_kcal} = ${kinderShard?.energy_kcal}`)

// ══════════════════════════════════════════════════════════════════════
// §٥ — كلفة الاستعلام، بالبايت المنقول فعلًا
// ══════════════════════════════════════════════════════════════════════
const dirBytes = gzipSync(readFileSync(resolve(SEARCH, 'directory.json')), { level: 6 }).length
const perQuery = loads.map((l) => l.gzip)
const avg = Math.round(perQuery.reduce((a, b) => a + b, 0) / perQuery.length)
const max = Math.max(...perQuery)
fact('ONE_TIME_INDEX_LOAD', `${dirBytes} بايت مضغوطًا (الدليل، مرّة واحدة لكل جلسة)`)
fact('AVERAGE_QUERY_LOAD', `${avg} بايت مضغوطًا (${loads.length} استعلامًا، شامل تحميل الدليل مرّة)`)
fact('MAX_QUERY_LOAD', `${max} بايت مضغوطًا (${loads.find((l) => l.gzip === max)?.q})`)
const warm = loads.filter((l) => l.gzip < dirBytes)
fact('WARM_QUERY_LOAD', `وسيط ${warm.length ? Math.round(warm.reduce((a, b) => a + b.gzip, 0) / warm.length) : 0} بايت (بعد تحميل الدليل)`)
ok('لا استعلام يتجاوز نصف ميغابايت — التنزيل الكامل ممنوع بنيويًا',
  max < 512 * 1024, `${max} بايت`)
ok('الطقم الساخن + الدليل وحدهما لا يجرّان شريحة واحدة',
  catalog.getStats().shardsFetched.length === 0, JSON.stringify(catalog.getStats().shardsFetched))

// ══════════════════════════════════════════════════════════════════════
// §٦ — الضوابط المضادّة (§4.2): كل ضمانة تُهاجَم بفحص **مسمّى**
// ══════════════════════════════════════════════════════════════════════

// ⟲ ١ — بناء **لا يستشير التوجيه**: هو بالضبط الجذع قبل هذه الموجة.
const blind = await newCatalog()
const blindKinder = await blind.searchRanked('kinder', { limit: 24 })
counter('بناء بلا استشارة الدليل لا يبلغ Kinder — الفحص المسمّى يحمرّ',
  blindKinder.every((h) => h.product.gtin !== '08000500141601'),
  `${blindKinder.length} مطابقة من الطقم الساخن وحده`)
counter('وذلك البناء لا يجلب أي صفحة حزمة — العجز بنيوي لا عرضي',
  blind.corpusStats().pagesFetched.length === 0 && !blind.corpusStats().directoryLoaded,
  `صفحات ${blind.corpusStats().pagesFetched.length}`)

// ⟲ ٢ — دليل مقطوع (٤٠٤): لا يجوز أن يُعلن صفرًا صادقًا وهو لا يعرف.
const severed = await Catalog.create({
  fetchText: async (url) => (url.includes('/search/') ? null : fetchText(url)),
  baseUrl: base,
  cache: createMemoryCache(),
})
await severed.init()
const severedHits = await severed.searchRanked('kinder', { deep: true, limit: 24 })
counter('دليل مقطوع ⇒ صفر من الذيل الطويل **وحكم `unavailable` معلَن** لا صمت',
  severedHits.length === 0 && severed.longTailAvailability().verdict === 'unavailable',
  `verdict=${severed.longTailAvailability().verdict} · searchable=${severed.longTailAvailability().searchableRecords}`)

// ⟲ ٣ — الغياب يبقى صفرًا: لا مطابقات شبحية، بمسارَيه المختلفين.
//
// المساران **ليسا واحدًا**، وخلطهما يخفي عطلًا:
//   • بادئة غائبة عن الدليل ⇒ صفر **بلا بايت واحد** (استنتاج من الدليل).
//   • بادئة موجودة وكلمة غائبة ⇒ تُقرأ الحزمة ثم صفر (المطابقة على الاستعلام كاملًا).
const ABSENT_PREFIX = ['zzzqwx', 'ججقظخ']
for (const term of ABSENT_PREFIX) {
  const stop = meter()
  const hits = await catalog.searchRanked(term, { deep: true, limit: 24 })
  const spend = stop()
  counter(`«${term}» بادئتها غائبة ⇒ صفر مطابقة بلا أي طلب`,
    hits.length === 0 && spend.requests === 0 && catalog.lastCorpusTrace?.plan.reason === 'absent',
    `${hits.length} مطابقة · ${spend.requests} طلبًا · plan=${catalog.lastCorpusTrace?.plan.reason}`)
}
const PRESENT_PREFIX_ABSENT_WORD = ['blorptastic', 'kinderzzz', 'كوكاكولازابادي']
for (const term of PRESENT_PREFIX_ABSENT_WORD) {
  const hits = await catalog.searchRanked(term, { deep: true, limit: 24 })
  counter(`«${term}» بادئتها موجودة والكلمة لا ⇒ صفر بعد قراءة الحزمة`,
    hits.length === 0 && catalog.lastCorpusTrace?.plan.reason === 'ok',
    `${hits.length} مطابقة · plan=${catalog.lastCorpusTrace?.plan.reason} · فُحص ${catalog.lastCorpusTrace?.recordsScanned} سجلًا`)
}

// ⟲ ٤ — الباركود لم يُمَسّ: نفس المسار، شريحة واحدة محسوبة.
const beforeShards = catalog.getStats().shardsFetched.length
const scanned = await catalog.lookupByGtin('08000500141601')
counter('مسح الباركود يبقى O(1) عبر الشريحة المحسوبة — لا حزم ولا مسح',
  scanned?.gtin === '08000500141601' && catalog.getStats().shardsFetched.length === beforeShards + 1,
  `${scanned?.name_en} · شرائح ${catalog.getStats().shardsFetched.join(',')}`)

// ⟲ ٥ — الميزانية تُحترم: حزمة عامّة لا تُنزَّل كلّها.
// أكبر حزمة **مفتاحها بطول حدّ البادئة** — مفاتيح المحرفين لا يوجّهها أي استعلام.
const bigKey = Object.entries(directory.buckets)
  .filter(([k]) => k.length >= directory.key_length)
  .sort((a, b) => b[1] - a[1])[0]
await catalog.searchRanked(bigKey[0], { deep: true, limit: 12 })
const trace = catalog.lastCorpusTrace
counter(`حزمة «${bigKey[0]}» (${bigKey[1]} سجلًا) تُقرأ ضمن الميزانية لا كلّها`,
  trace !== null && trace.pagesRead <= DEFAULT_BUCKET_PAGE_BUDGET && trace.pagesRead < trace.pagesAvailable,
  `قُرئت ${trace?.pagesRead} من ${trace?.pagesAvailable} صفحة`)

// ⟲ ٦ — استعلام أقصر من حدّ البادئة لا يلمس الشبكة إطلاقًا.
const stopShort = meter()
await catalog.searchRanked('رز', { deep: true, limit: 12 })
counter('«رز» (محرفان) لا يفتح طلبًا — ما دون حدّ البادئة يخدمه المنسَّق والساخن',
  stopShort().requests === 0 && catalog.lastCorpusTrace?.plan.reason === 'too-short',
  `plan=${catalog.lastCorpusTrace?.plan.reason}`)

// ══════════════════════════════════════════════════════════════════════
server.close()

const failed = checks.filter((c) => !c.pass)
console.log('\n═══ حزم البحث — الأرقام المقيسة ═══')
for (const [k, v] of facts) console.log(`  ${k.padEnd(26)} ${v}`)
console.log('\n═══ الفحوص ═══')
for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
console.log(`\n${failed.length === 0 ? '✓' : '✗'} ${checks.length - failed.length}/${checks.length}`)
process.exit(failed.length === 0 ? 0 : 1)
