/**
 * إثبات سلامة الأصول — [QIM-WEB-HOTFIX-002]
 *
 * يحرس عطل إنتاج P0 مقيسًا على الموقع الحيّ: طلب حزمة مُهشّمة مفقودة كان يعود
 * «HTTP 200 + جسم index.html» بدل 404، فيفشل المتصفّح بخطأ MIME (مع `nosniff`)
 * وتظهر بطاقة «صار خلل بسيط» بعد انتظار طويل — ويخزّن عاملُ الخدمة تلك الصفحة
 * تحت عنوان ملف JS فيصير العطل لزجًا.
 *
 * ثلاث طبقات فحص:
 *   ١) محاكي دلالات Cloudflare Pages فوق `_redirects` + قائمة ملفات `dist`.
 *   ٢) عامل الخدمة **الحقيقي** (`public/sw.js`) في بيئة مُموّهة.
 *   ٣) محاكاة التفاف (§4.2): إعادة القاعدة الشاملة أو حذف `404.html` **يجب**
 *      أن تُسقط الفحوص — بفحص مسمّى لا باستثناء تقني.
 *
 * دلالات المحاكي مستمدّة من وثائق Pages ومن قياس الإنتاج معًا:
 *   • الملف الساكن الموجود يُخدَم أولًا (قياس: الأصول الحقيقية كانت تُخدَم سليمة
 *     بينما القاعدة الشاملة قائمة، والمفقودة وحدها كانت تسقط عليها).
 *   • ثم قواعد `_redirects` بالترتيب، أول تطابق يفوز.
 *   • ثم `404.html` إن وُجد ⇒ **404**.
 *   • وإلّا فسلوك SPA الضمني ⇒ «/» بحالة **200** — وهذا هو الفخّ الموثَّق في
 *     pages/configuration/serving-pages، ولذلك `404.html` شرط لا زينة.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseRedirects, serve, listFiles } from './lib/pages-emulator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
let fail = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name}`)
  } else {
    fail += 1
    failures.push(name)
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ─────────────────────── الطبقة ١: التوجيه ───────────────────────

console.log('\n▸ الطبقة ١ — دلالات التوجيه على Pages')

const distDir = resolve(root, 'dist')
if (!existsSync(distDir)) {
  console.error('\n✖ لا يوجد dist/ — شغّل `npm run build` قبل هذا الإثبات.')
  process.exit(1)
}

const files = listFiles(distDir)
const redirectsText = readFileSync(resolve(distDir, '_redirects'), 'utf-8')
const rules = parseRedirects(redirectsText)
const has404 = files.has('/404.html')

const world = { files, rules, has404 }

check('`404.html` منشور في dist (شرط إبطال SPA الضمني)', has404)

check(
  'لا قاعدة شاملة `/*` في _redirects',
  !rules.some((r) => r.from === '/*'),
  rules.filter((r) => r.from === '/*').map((r) => `${r.from} → ${r.to} ${r.status}`).join(', '),
)

// (١) حزمة JS مفقودة ⇒ 404 لا index.html
const missJs = serve('/assets/index-DEADBEEF.js', world)
check(
  'حزمة JS مفقودة ⇒ 404',
  missJs.status === 404,
  `الحالة ${missJs.status} والجسم ${missJs.body}`,
)
check(
  'حزمة JS مفقودة لا تعيد index.html',
  missJs.body !== '/index.html',
  `الجسم ${missJs.body}`,
)

// (٢) ملف CSS مفقود ⇒ 404
const missCss = serve('/assets/index-DEADBEEF.css', world)
check('ملف CSS مفقود ⇒ 404', missCss.status === 404, `الحالة ${missCss.status}`)

// (٣) مسارات التطبيق ما زالت تعمل
// الجذر أولًا — أهمّ مسار في المنتج، ويُخدَم بفهرس المجلّد لا بقاعدة توجيه،
// ولذلك لم يتأثّر بحذف القاعدة الشاملة. يُفحص صراحةً لا استنتاجًا.
const rootPath = serve('/', world)
check(
  'جذر التطبيق «/» يخدم index.html بحالة 200 (لا يعتمد على قاعدة شاملة)',
  rootPath.status === 200 && rootPath.body === '/index.html',
  `${rootPath.status} → ${rootPath.body}`,
)

const settings = serve('/settings', world)
check(
  'المسار التطبيقي /settings يخدم القشرة بحالة 200',
  settings.status === 200 && settings.body === '/index.html',
  `${settings.status} → ${settings.body}`,
)
const rootDoc = serve('/index.html', world)
check(
  'مسار الهاش (#/settings) يصل القشرة — الخادم لا يرى إلا «/»',
  rootDoc.status === 200 && rootDoc.contentType.includes('text/html'),
)

// أصل حقيقي ما زال يُخدَم
const realAsset = [...files].find((f) => f.startsWith('/assets/') && f.endsWith('.js'))
const realServed = serve(realAsset, world)
check(
  'الأصل الحقيقي ما زال يُخدَم بحالة 200 ونوع JS',
  realServed.status === 200 && realServed.contentType.includes('javascript'),
  `${realAsset} → ${realServed.status} ${realServed.contentType}`,
)

// تزامن القائمة مع ROUTES
const routesSrc = readFileSync(resolve(root, 'src/lib/appRoutes.ts'), 'utf-8')
const routesBlock = routesSrc.match(/const ROUTES: AppRoute\[\] = \[([\s\S]*?)\]/)
const declaredRoutes = routesBlock
  ? [...routesBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : []
check('قُرئت ROUTES من appRoutes.ts', declaredRoutes.length > 0, `${declaredRoutes.length}`)

const missingRoutes = declaredRoutes.filter((r) => serve(`/${r}`, world).body !== '/index.html')
check(
  'كل مسار في ROUTES له قاعدة في _redirects (لا تشيخ إحداهما دون الأخرى)',
  missingRoutes.length === 0,
  missingRoutes.join(', '),
)

// التطابق **في الاتجاهين**: لا قاعدة يتيمة تشير إلى مسار لم يعد موجودًا في
// ROUTES. الاتجاه الأول وحده يترك قواعد ميتة تتراكم بلا أن يلاحظها أحد.
const rewriteRules = rules.filter((r) => r.status === 200 && r.to === '/index.html')
const orphanRules = rewriteRules
  .map((r) => r.from.replace(/^\//, ''))
  .filter((name) => !declaredRoutes.includes(name))
check(
  'ولا قاعدة يتيمة في _redirects بلا مسار مقابل في ROUTES (تطابق ١:١)',
  orphanRules.length === 0,
  orphanRules.join(', '),
)
check(
  'عدد القواعد = عدد المسارات بالضبط',
  rewriteRules.length === declaredRoutes.length,
  `قواعد ${rewriteRules.length} · مسارات ${declaredRoutes.length}`,
)

// محاكاة التفاف: مسار جديد يُضاف إلى ROUTES وينسى صاحبه قاعدته.
{
  const withNewRoute = [...declaredRoutes, 'brandNewScreen']
  const wouldMiss = withNewRoute.filter((r) => serve(`/${r}`, world).body !== '/index.html')
  check(
    'مسار جديد بلا قاعدة يسقط الفحص باسم واضح — الحارس يعمل استباقيًا',
    wouldMiss.length === 1 && wouldMiss[0] === 'brandNewScreen',
    wouldMiss.join(', '),
  )
}

// ─────────── الطبقة ٣أ: محاكاة الالتفاف على التوجيه (§4.2) ───────────

console.log('\n▸ الطبقة ٣أ — محاكاة التفاف: إعادة القاعدة الشاملة')

const withCatchAll = {
  ...world,
  rules: [...rules, { from: '/*', to: '/index.html', status: 200 }],
}
const bypassJs = serve('/assets/index-DEADBEEF.js', withCatchAll)
check(
  'إعادة `/*` تُرجع العطل: الحزمة المفقودة تعود 200 + index.html',
  bypassJs.status === 200 && bypassJs.body === '/index.html',
  `${bypassJs.status} → ${bypassJs.body}`,
)

console.log('\n▸ الطبقة ٣ب — محاكاة التفاف: حذف 404.html')
const without404 = { ...world, has404: false }
const bypass404 = serve('/assets/index-DEADBEEF.js', without404)
check(
  'حذف 404.html يُرجع العطل عبر سلوك SPA الضمني (200 + «/»)',
  bypass404.status === 200,
  `${bypass404.status} → ${bypass404.body}`,
)

// ─────────────────── الطبقة ٢: عامل الخدمة الحقيقي ───────────────────

console.log('\n▸ الطبقة ٢ — عامل الخدمة الحقيقي (public/sw.js)')

const swSource = readFileSync(resolve(root, 'public/sw.js'), 'utf-8')

// قيمة المهلة تُفحص على المصدر، ثم تُقصَّر للتنفيذ كي لا ينتظر الإثبات ٦ ثوانٍ.
const timeoutDecl = swSource.match(/const NAVIGATION_TIMEOUT_MS = (\d+)/)
check('عامل الخدمة يعلن مهلة تنقّل', Boolean(timeoutDecl))
const declaredTimeout = Number(timeoutDecl?.[1] ?? 0)
check(
  'المهلة المعلنة معقولة (0 < t ≤ 15000ms)',
  declaredTimeout > 0 && declaredTimeout <= 15000,
  `${declaredTimeout}ms`,
)

/** يبني بيئة عامل خدمة مُموّهة ويُحمّل sw.js الحقيقي فيها. */
function loadServiceWorker({ precache = ['/assets/app.js'], fetchImpl }) {
  const src = swSource
    .replace('__SW_VERSION__', 'testhash')
    .replace('__SW_PRECACHE_ASSETS__', JSON.stringify(precache))
    .replace(/const NAVIGATION_TIMEOUT_MS = \d+/, 'const NAVIGATION_TIMEOUT_MS = 60')

  const stores = new Map()
  const makeCache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)
    return {
      async put(req, res) {
        store.set(typeof req === 'string' ? req : req.url, res)
      },
      async add(url) {
        const res = await fetchImpl(new Request(new URL(url, 'https://x.test').href))
        if (!res.ok) throw new Error(`add failed ${url}`)
        store.set(new URL(url, 'https://x.test').href, res)
      },
      async addAll(urls) {
        for (const u of urls) await this.add(u)
      },
      async match(req) {
        return store.get(typeof req === 'string' ? new URL(req, 'https://x.test').href : req.url)
      },
    }
  }
  const caches = {
    _stores: stores,
    async open(name) {
      return makeCache(name)
    },
    async keys() {
      return [...stores.keys()]
    },
    async delete(name) {
      return stores.delete(name)
    },
    async match(req) {
      const key = typeof req === 'string' ? new URL(req, 'https://x.test').href : req.url
      for (const store of stores.values()) if (store.has(key)) return store.get(key)
      return undefined
    },
  }

  const handlers = {}
  const self = {
    addEventListener: (type, fn) => {
      handlers[type] = fn
    },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    location: { origin: 'https://x.test' },
  }

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', src)(self, caches, fetchImpl)
  return { handlers, caches, stores }
}

/**
 * ⚠️ `Response` في Node يحمل `type === 'default'`، بينما ردّ نفس الأصل في متصفّح
 * حقيقي يحمل `'basic'` — وعامل الخدمة يشترط `'basic'`. بدون هذا التزييف كان كل
 * فحص تخزين **يمرّ مجّانًا** لأن الشرط يسقط قبل بلوغ فحص نوع المحتوى أصلًا،
 * أي نجاح غير مستحقّ (§4.2). التقطه احمرارُ «الأصل السليم يُخزَّن».
 */
function basic(body, status, contentType) {
  const res = new Response(body, { status, headers: { 'content-type': contentType } })
  Object.defineProperty(res, 'type', { value: 'basic' })
  return res
}

const html = (status = 200) => basic('<html>fallback</html>', status, 'text/html; charset=utf-8')
const js = () => basic('export default 1', 200, 'text/javascript')

/** يشغّل معالج fetch ويعيد الردّ. */
async function runFetch(sw, url, { mode = 'no-cors', destination = '' } = {}) {
  const request = new Request(url)
  Object.defineProperty(request, 'mode', { value: mode })
  Object.defineProperty(request, 'destination', { value: destination })
  let result
  await sw.handlers.fetch({ request, respondWith: (p) => { result = p } })
  return result
}

// (٤) HTML لا يُخزَّن تحت عنوان .js
{
  const sw = loadServiceWorker({ fetchImpl: async () => html(200) })
  const res = await runFetch(sw, 'https://x.test/assets/ghost.js', { destination: 'script' })
  check('HTML بحالة 200 يمرّ كما هو تحت عنوان .js (لا يُستبدل)', res.status === 200)
  const runtime = [...sw.stores.entries()].find(([k]) => k.includes('runtime'))
  const cachedCount = runtime ? runtime[1].size : 0
  check('HTML **لا يُخزَّن** تحت عنوان .js', cachedCount === 0, `مخزَّن: ${cachedCount}`)
}

// (٧) الأصل السليم ما زال قابلًا للتخزين
{
  const sw = loadServiceWorker({ fetchImpl: async () => js() })
  await runFetch(sw, 'https://x.test/assets/real.js', { destination: 'script' })
  const runtime = [...sw.stores.entries()].find(([k]) => k.includes('runtime'))
  check('الأصل السليم (نوع JS) يُخزَّن', runtime && runtime[1].size === 1)
}

// (٥) الحزمة المفقودة (404) لا تسمّم الكاش ولا تُقنَّع
{
  const sw = loadServiceWorker({
    fetchImpl: async () =>
      new Response('<html>404</html>', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
  })
  const res = await runFetch(sw, 'https://x.test/assets/stale-from-build-a.js', {
    destination: 'script',
  })
  check('حزمة قديمة مفقودة تفشل بصدق (404 يمرّ كما هو)', res.status === 404)
  const runtime = [...sw.stores.entries()].find(([k]) => k.includes('runtime'))
  check('الحزمة المفقودة لا تُخزَّن — لا تسميم للكاش', !runtime || runtime[1].size === 0)
}

// (٦) التنقّل البطيء يصل للقشرة خلال المهلة
{
  let aborted = false
  const sw = loadServiceWorker({
    fetchImpl: (req, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(new Error('AbortError'))
        })
      }),
  })
  const shellCache = await sw.caches.open('qimmah-testhash-shell')
  await shellCache.put('https://x.test/index.html', html(200))

  const started = Date.now()
  const res = await runFetch(sw, 'https://x.test/', { mode: 'navigate', destination: 'document' })
  const elapsed = Date.now() - started
  check('التنقّل البطيء أُلغي بالمهلة', aborted)
  check('التنقّل البطيء يرجع إلى القشرة المخزّنة', res && res.status === 200)
  check('الرجوع تمّ خلال المهلة (لا تعليق مفتوح)', elapsed < 2000, `${elapsed}ms`)
}

// 5xx لا يُخفى خلف القشرة
{
  const sw = loadServiceWorker({ fetchImpl: async () => html(503) })
  const shellCache = await sw.caches.open('qimmah-testhash-shell')
  await shellCache.put('https://x.test/index.html', html(200))
  const res = await runFetch(sw, 'https://x.test/', { mode: 'navigate', destination: 'document' })
  check('5xx يمرّ كما هو ولا يُقنَّع بالقشرة', res.status === 503, `الحالة ${res.status}`)
}

// (٨) التثبيت والتفعيل
{
  const sw = loadServiceWorker({
    precache: ['/assets/app.js'],
    fetchImpl: async (req) =>
      req.url.endsWith('.js') || req.url.endsWith('/') || req.url.endsWith('.html')
        ? js()
        : new Response('x', { status: 200, headers: { 'content-type': 'image/png' } }),
  })
  check('معالج التثبيت مُسجَّل', typeof sw.handlers.install === 'function')
  check('معالج التفعيل مُسجَّل', typeof sw.handlers.activate === 'function')

  let installed = false
  await new Promise((done) => {
    sw.handlers.install({
      waitUntil: (p) => p.then(() => { installed = true; done() }).catch(() => done()),
    })
  })
  check('التثبيت ينجح والقشرة تُخزَّن', installed)

  let activated = false
  await new Promise((done) => {
    sw.handlers.activate({
      waitUntil: (p) => p.then(() => { activated = true; done() }).catch(() => done()),
    })
  })
  check('التفعيل ينجح (تنظيف الكاشات القديمة + claim)', activated)
}

{
  // التثبيت ينجح رغم فقد أيقونة اختيارية، ويسقط عند فقد أصل إقلاع لازم.
  const mk = (missing) =>
    loadServiceWorker({
      precache: ['/assets/app.js'],
      fetchImpl: async (req) =>
        missing.some((m) => req.url.endsWith(m))
          ? new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } })
          : js(),
    })

  let optionalOk = true
  const swOpt = mk(['/icon-512.png'])
  await new Promise((done) => {
    swOpt.handlers.install({
      waitUntil: (p) => p.then(() => done()).catch(() => { optionalOk = false; done() }),
    })
  })
  check('فقد أيقونة اختيارية لا يُسقط التثبيت', optionalOk)

  let requiredFailed = false
  const swReq = mk(['/assets/app.js'])
  await new Promise((done) => {
    swReq.handlers.install({
      waitUntil: (p) => p.then(() => done()).catch(() => { requiredFailed = true; done() }),
    })
  })
  check('فقد أصل إقلاع لازم يُسقط التثبيت (لا وعد كاذب بالعمل دون اتصال)', requiredFailed)
}

// ─────────── محاكاة التفاف على حارس عامل الخدمة (§4.2) ───────────

console.log('\n▸ الطبقة ٣ج — محاكاة التفاف: استعادة شرط ما قبل الإصلاح')
{
  // ملاحظة من أول تشغيل: إسقاط سطر HTML وحده **لا يكفي** لإعادة العطل، لأن فحص
  // نوع المحتوى للسكربتات يحجبه استقلالًا (حراسة متطبّقة). فالمحاكاة الصادقة هي
  // استعادة الشرط الأصلي كاملًا: «الحالة 200 وحدها إذنٌ بالتخزين».
  const OLD_PREDICATE = `function mayCache(request, url, response) {
  return Boolean(response && response.status === 200 && response.type === 'basic')
}`
  const weakened = swSource
    .replace('__SW_VERSION__', 'testhash')
    .replace('__SW_PRECACHE_ASSETS__', '[]')
    .replace(/function mayCache\(request, url, response\) \{[\s\S]*?\n\}/, OLD_PREDICATE)
  const changed = weakened.includes(OLD_PREDICATE)
  check('استُعيد شرط ما قبل الإصلاح فعلًا في نسخة المحاكاة', changed)

  if (changed) {
    const stores = new Map()
    const caches = {
      async open(n) {
        if (!stores.has(n)) stores.set(n, new Map())
        const s = stores.get(n)
        return { async put(req, res) { s.set(req.url, res) }, async match() {}, async add() {}, async addAll() {} }
      },
      async keys() { return [...stores.keys()] },
      async delete(n) { return stores.delete(n) },
      async match() { return undefined },
    }
    const handlers = {}
    const self = {
      addEventListener: (t, f) => { handlers[t] = f },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
      location: { origin: 'https://x.test' },
    }
    // eslint-disable-next-line no-new-func
    new Function('self', 'caches', 'fetch', weakened)(self, caches, async () => html(200))

    const request = new Request('https://x.test/assets/ghost.js')
    Object.defineProperty(request, 'mode', { value: 'no-cors' })
    Object.defineProperty(request, 'destination', { value: 'script' })
    let p
    await handlers.fetch({ request, respondWith: (x) => { p = x } })
    await p
    const runtime = [...stores.entries()].find(([k]) => k.includes('runtime'))
    check(
      'بشرط ما قبل الإصلاح يعود التسميم (HTML يُخزَّن تحت .js) — فالحارس هو المانع فعلًا',
      Boolean(runtime && runtime[1].size === 1),
      `مخزَّن: ${runtime ? runtime[1].size : 0}`,
    )
  }
}

// ───────────────────────────── الخلاصة ─────────────────────────────

console.log(`\n${'─'.repeat(60)}`)
console.log(`إثبات سلامة الأصول: ${pass} ناجح · ${fail} فاشل`)
if (fail > 0) {
  console.log('الفاشل:')
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
console.log('✅ كل الفحوص خضراء')
