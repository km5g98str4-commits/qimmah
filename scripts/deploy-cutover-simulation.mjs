/**
 * محاكاة نشرة حقيقية — [QIM-WEB-HOTFIX-002] البند ٥
 *
 * تعيد إنتاج اللحظة التي كسرت الإنتاج فعلًا:
 *
 *   بناء A  →  عميل يحمّل قشرته ويسجّل عامل الخدمة
 *           →  تهبط نشرة B بأسماء حِزم مختلفة
 *           →  العميل القديم (ما زال على صفحة A) يطلب حزمة من A
 *           →  **يجب** أن يفشل بصدق (404) لا أن يستلم HTML متنكّرًا في هيئة JS
 *           →  والتحديث يصل إلى بناء B سليمًا
 *
 * البناءان حقيقيان (`vite build` مرّتين) لا مُصطنعان: يُفرَّق بينهما عبر
 * `CF_PAGES_COMMIT_SHA` الذي يدخل في `BUILD_LABEL` فيغيّر محتوى حزمة الدخول
 * ومن ثمّ هاشها — وهو نفس ما يحدث بين نشرتين متتاليتين على Pages.
 *
 * وتُقاس النتيجة مرّتين: بالتهيئة **بعد** الإصلاح وبالتهيئة **قبله** — فلا يُقبل
 * أن يمرّ الفحص لسبب غير الإصلاح (§4.2).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseRedirects, serve, listFiles, mimeFor } from './lib/pages-emulator.mjs'

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

const OUT_A = resolve(root, '.cutover-a')
const OUT_B = resolve(root, '.cutover-b')

function buildInto(outDir, sha) {
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
    cwd: root,
    env: { ...process.env, CF_PAGES_COMMIT_SHA: sha },
    stdio: 'pipe',
  })
}

/** حِزم الدخول التي يشير إليها index.html لبناء ما. */
function entryAssets(outDir) {
  const html = readFileSync(resolve(outDir, 'index.html'), 'utf-8')
  return [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[\w.-]+\.(?:js|css))"/g)].map((m) => m[1]))]
}

console.log('\n▸ بناء نشرتين متتاليتين بأسماء حِزم مختلفة')
for (const dir of [OUT_A, OUT_B]) if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })

buildInto(OUT_A, 'aaaaaaa')
buildInto(OUT_B, 'bbbbbbb')

const filesA = listFiles(OUT_A)
const filesB = listFiles(OUT_B)
const entriesA = entryAssets(OUT_A)
const entriesB = entryAssets(OUT_B)

// الحزمة التي تعيش في A ولا وجود لها في B — بالضبط ما يطلبه عميل قديم.
const staleChunk = entriesA.find((a) => !filesB.has(a))

check(
  'البناءان أنتجا حزمة دخول مختلفة (نشرة حقيقية لا تكرار)',
  Boolean(staleChunk),
  `A: ${entriesA.join(', ')} | B: ${entriesB.join(', ')}`,
)
if (!staleChunk) {
  console.log('\n✖ تعذّر إنتاج فرق بين البناءين — المحاكاة بلا معنى، توقّف.')
  process.exit(1)
}
console.log(`  ℹ الحزمة القديمة المفقودة في B: ${staleChunk}`)

// ─────────── الخادم: نشرة B بتهيئة ما بعد الإصلاح ───────────

const worldB = {
  files: filesB,
  rules: parseRedirects(readFileSync(resolve(OUT_B, '_redirects'), 'utf-8')),
  has404: filesB.has('/404.html'),
}

console.log('\n▸ عميل بناء A يطلب حزمته بعد هبوط B')

const stale = serve(staleChunk, worldB)
check('الحزمة القديمة ⇒ 404 لا 200', stale.status === 404, `الحالة ${stale.status}`)
check('الحزمة القديمة لا تعود بجسم index.html', stale.body !== '/index.html', `الجسم ${stale.body}`)
check(
  'لا يُقدَّم HTML على أنه JS بحالة نجاح',
  !(stale.status === 200 && stale.contentType.includes('text/html')),
  `${stale.status} · ${stale.contentType}`,
)

// ─────────── عامل الخدمة الحقيقي أمام هذا الردّ ───────────

console.log('\n▸ عامل الخدمة الحقيقي أمام الحزمة المفقودة')

const swSource = readFileSync(resolve(root, 'public/sw.js'), 'utf-8')

function loadSW(fetchImpl) {
  const src = swSource
    .replace('__SW_VERSION__', 'cutover')
    .replace('__SW_PRECACHE_ASSETS__', '[]')
    .replace(/const NAVIGATION_TIMEOUT_MS = \d+/, 'const NAVIGATION_TIMEOUT_MS = 60')
  const stores = new Map()
  const caches = {
    async open(n) {
      if (!stores.has(n)) stores.set(n, new Map())
      const s = stores.get(n)
      return {
        async put(req, res) { s.set(req.url, res) },
        async match(req) { return s.get(req.url) },
        async add() {},
        async addAll() {},
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(n) { return stores.delete(n) },
    async match(req) {
      const key = typeof req === 'string' ? new URL(req, 'https://x.test').href : req.url
      for (const s of stores.values()) if (s.has(key)) return s.get(key)
      return undefined
    },
  }
  const handlers = {}
  const self = {
    addEventListener: (t, f) => { handlers[t] = f },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    location: { origin: 'https://x.test' },
  }
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', src)(self, caches, fetchImpl)
  return { handlers, caches, stores }
}

/** يحوّل ردّ المحاكي إلى Response بنوع `basic` كما يراه المتصفّح لنفس الأصل. */
function toResponse(result, outDir) {
  const body = result.status === 404 || result.body.endsWith('.html')
    ? readFileSync(resolve(outDir, result.body.slice(1)), 'utf-8')
    : 'asset'
  const res = new Response(body, {
    status: result.status,
    headers: { 'content-type': result.contentType },
  })
  Object.defineProperty(res, 'type', { value: 'basic' })
  return res
}

async function requestThroughSW(sw, url, { mode = 'no-cors', destination = '' } = {}) {
  const request = new Request(url)
  Object.defineProperty(request, 'mode', { value: mode })
  Object.defineProperty(request, 'destination', { value: destination })
  let out
  await sw.handlers.fetch({ request, respondWith: (p) => { out = p } })
  return out
}

{
  const sw = loadSW(async (req) => {
    const path = new URL(req.url).pathname
    return toResponse(serve(path, worldB), OUT_B)
  })

  const res = await requestThroughSW(sw, `https://x.test${staleChunk}`, { destination: 'script' })
  check('عامل الخدمة يمرّر الفشل كما هو (404)', res.status === 404, `الحالة ${res.status}`)

  const runtime = [...sw.stores.entries()].find(([k]) => k.includes('runtime'))
  const poisoned = runtime ? runtime[1].size : 0
  check('لا تسميم للكاش: لا شيء خُزِّن تحت عنوان الحزمة المفقودة', poisoned === 0, `${poisoned}`)

  // التعافي: التنقّل يصل قشرة B، وقشرة B تشير إلى حِزم B.
  const nav = await requestThroughSW(sw, 'https://x.test/', { mode: 'navigate', destination: 'document' })
  const navBody = await nav.text()
  check('التحديث يصل قشرة بناء B بحالة 200', nav.status === 200)
  check(
    'قشرة B تشير إلى حِزم B لا حِزم A',
    entriesB.every((e) => navBody.includes(e)) && !navBody.includes(staleChunk),
  )
}

// ─────────── محاكاة التفاف: نفس السيناريو بتهيئة ما قبل الإصلاح ───────────

console.log('\n▸ محاكاة التفاف — نفس النشرة بتهيئة ما قبل الإصلاح')
{
  const worldOld = {
    files: filesB,
    rules: [...worldB.rules, { from: '/*', to: '/index.html', status: 200 }],
    has404: false,
  }
  const old = serve(staleChunk, worldOld)
  check(
    'بالتهيئة القديمة تعود الحزمة المفقودة «200 + HTML» — العطل الأصلي',
    old.status === 200 && old.contentType.includes('text/html'),
    `${old.status} · ${old.contentType}`,
  )

  // وبالشرط القديم في عامل الخدمة، تُخزَّن تلك الصفحة تحت عنوان JS.
  const oldSw = swSource
    .replace('__SW_VERSION__', 'cutover')
    .replace('__SW_PRECACHE_ASSETS__', '[]')
    .replace(
      /function mayCache\(request, url, response\) \{[\s\S]*?\n\}/,
      `function mayCache(request, url, response) {
  return Boolean(response && response.status === 200 && response.type === 'basic')
}`,
    )
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
  const selfMock = {
    addEventListener: (t, f) => { handlers[t] = f },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    location: { origin: 'https://x.test' },
  }
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', oldSw)(selfMock, caches, async () => {
    const res = new Response('<html>shell</html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
    Object.defineProperty(res, 'type', { value: 'basic' })
    return res
  })
  const request = new Request(`https://x.test${staleChunk}`)
  Object.defineProperty(request, 'mode', { value: 'no-cors' })
  Object.defineProperty(request, 'destination', { value: 'script' })
  let p
  await handlers.fetch({ request, respondWith: (x) => { p = x } })
  await p
  const runtime = [...stores.entries()].find(([k]) => k.includes('runtime'))
  check(
    'وبالشرط القديم تُخزَّن صفحة HTML تحت عنوان JS — العطل اللزج',
    Boolean(runtime && runtime[1].size === 1),
    `مخزَّن: ${runtime ? runtime[1].size : 0}`,
  )
}

// ─────────── الحلقة الثانية: B → C (المطلوب في البند ٣) ───────────
//
// نشرة واحدة ناجحة لا تثبت تقاربًا مستدامًا: قد يكون الانتقال الأول نجح لأن
// الكاش كان فارغًا. فنكرّر على نشرة ثالثة بعميل خرج للتوّ من B.

console.log('\n▸ الحلقة الثانية — نشرة C بعد B')

const OUT_C = resolve(root, '.cutover-c')
if (existsSync(OUT_C)) rmSync(OUT_C, { recursive: true, force: true })
buildInto(OUT_C, 'ccccccc')

const filesC = listFiles(OUT_C)
const entriesC = entryAssets(OUT_C)
const staleFromB = entriesB.find((b) => !filesC.has(b))

check('C أنتج حزمة دخول مختلفة عن B', Boolean(staleFromB), `B: ${entriesB.join(', ')} | C: ${entriesC.join(', ')}`)

if (staleFromB) {
  const worldC = {
    files: filesC,
    rules: parseRedirects(readFileSync(resolve(OUT_C, '_redirects'), 'utf-8')),
    has404: filesC.has('/404.html'),
  }
  const staleB = serve(staleFromB, worldC)
  check('حزمة B القديمة على نشرة C ⇒ 404 لا HTML', staleB.status === 404, `الحالة ${staleB.status}`)

  const sw = loadSW(async (req) => toResponse(serve(new URL(req.url).pathname, worldC), OUT_C))
  const res = await requestThroughSW(sw, `https://x.test${staleFromB}`, { destination: 'script' })
  check('عامل الخدمة يمرّر فشل B→C بصدق', res.status === 404)
  const runtime = [...sw.stores.entries()].find(([k]) => k.includes('runtime'))
  check('لا تسميم في الانتقال B→C', !runtime || runtime[1].size === 0)

  const nav = await requestThroughSW(sw, 'https://x.test/', { mode: 'navigate', destination: 'document' })
  const body = await nav.text()
  check(
    'التحديث يصل قشرة C وتشير إلى حِزم C',
    nav.status === 200 && entriesC.every((e) => body.includes(e)) && !body.includes(staleFromB),
  )

  // هوية البناء تفرّق النشرات الثلاث بلا لبس.
  const idOf = (dir) =>
    readFileSync(resolve(dir, 'index.html'), 'utf-8').match(/name="qimmah-commit" content="([^"]*)"/)?.[1]
  const ids = [idOf(OUT_A), idOf(OUT_B), idOf(OUT_C)]
  check(
    'هوية البناء في HTML تميّز النشرات الثلاث (aaaaaaa · bbbbbbb · ccccccc)',
    new Set(ids).size === 3,
    ids.join(' · '),
  )
}

for (const dir of [OUT_A, OUT_B, OUT_C]) rmSync(dir, { recursive: true, force: true })

console.log(`\n${'─'.repeat(60)}`)
console.log(`محاكاة النشرة: ${pass} ناجح · ${fail} فاشل`)
if (fail > 0) {
  console.log('الفاشل:')
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
console.log('✅ سيناريو النشرة يعبر: الحزمة القديمة تفشل بصدق، والتعافي يصل البناء الجديد')
