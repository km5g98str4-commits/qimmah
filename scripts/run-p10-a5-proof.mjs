// إثبات P10 A5 (مهام اليوم) في متصفح فعلي (headless Chromium عبر Playwright):
//   1) إضافة 3 مهام عبر الإضافة السريعة في الودجة الحقيقية.
//   2) إنجاز مهمة (علامة صح) + حذف مهمة.
//   3) إعادة تحميل الصفحة → الحالة تبقى (persist).
//   4) عزل لكل حساب: حساب مختلف لا يرى مهام الأول.
//   5) قاعدة التدوير: مهمة أمس غير المنجزة تُرحّل موسومة، والمنجزة تُحذف (على المتجر الحقيقي).
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// playwright مثبّت عالميًا في هذه البيئة.
const require = createRequire(pathToFileURL(process.execPath))
const gRoot = execSync('npm root -g').toString().trim()
const { chromium } = require(join(gRoot, 'playwright'))
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`)
let failures = 0
const assert = (cond, msg) => {
  if (!cond) failures += 1
  log(cond, msg)
}

// --- حزم الـ harness (React + الكود الحقيقي) عبر esbuild ---
const result = await build({
  entryPoints: [resolve(root, 'scripts/p10-a5-harness.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': '{"MODE":"test","DEV":false,"PROD":false}',
    'process.env.NODE_ENV': '"production"',
  },
  loader: { '.css': 'empty' },
  logLevel: 'error',
})
const bundleJs = result.outputFiles[0].text
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body style="background:#101216;color:#fff;font-family:system-ui"><div id="root"></div><script type="module">${bundleJs}</script></body></html>`

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port
const url = `http://127.0.0.1:${port}/`

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))
await page.goto(url)
await page.waitForSelector('[data-testid="widget-host"]')

const KEY_GUEST = 'qimmah:todo:v1:guest'
const read = (k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k)

// ===== 1) إضافة 3 مهام عبر الإضافة السريعة (زر ＋ مهمة → إدخال → Enter) =====
const addBtn = () => page.locator('[data-testid="widget-host"] button[aria-label="أضف مهمة جديدة"]')
const field = () => page.locator('[data-testid="widget-host"] input[aria-label="نص المهمة الجديدة"]')
const quickAdd = async (text) => {
  // افتح وضع الإضافة فقط إن لم يكن حقل الإدخال مفتوحًا (نُبقيه مفتوحًا للإضافة المتتالية).
  if ((await field().count()) === 0) await addBtn().first().click({ timeout: 8000 })
  await field().fill(text, { timeout: 8000 })
  await field().press('Enter')
  await page.waitForTimeout(40)
}
await quickAdd('شراء بروتين')
await quickAdd('تمرين الصدر')
await quickAdd('شرب ٣ لتر ماء')
await page.locator('[data-testid="probe-owner"]').click() // blur لإغلاق الإدخال
await page.waitForTimeout(30)

let s = await read(KEY_GUEST)
assert(s && s.items.length === 3, `أُضيفت 3 مهام عبر الإضافة السريعة (المخزَّن=${s?.items?.length})`)

// وسّع لعرض الكل (زر الطيّ/العرض) لتظهر كل الصفوف
await page.locator('[data-testid="widget-host"] button[aria-expanded]').first().click().catch(() => {})
await page.waitForTimeout(30)

// ===== 2) إنجاز مهمة (علامة صح) + حذف مهمة =====
await page.locator('[data-testid="widget-host"] button[aria-label="بدّل حالة الإنجاز"]').first().click()
await page.waitForTimeout(40)
s = await read(KEY_GUEST)
assert(s.items.filter((i) => i.done).length === 1, `إنجاز مهمة واحدة بعلامة صح (done=${s.items.filter((i) => i.done).length})`)

await page.locator('[data-testid="widget-host"] button[aria-label="حذف المهمة"]').last().click()
await page.waitForTimeout(40)
s = await read(KEY_GUEST)
assert(s.items.length === 2, `حذف مهمة (المتبقّي=${s.items.length})`)
const before = s

// ===== 3) إعادة التحميل → الحالة تبقى =====
await page.reload()
await page.waitForSelector('[data-testid="widget-host"]')
await page.locator('[data-testid="widget-host"] button[aria-expanded]').first().click().catch(() => {})
const s3 = await read(KEY_GUEST)
const persisted =
  s3.items.length === 2 &&
  s3.items.filter((i) => i.done).length === 1 &&
  JSON.stringify(s3.items.map((i) => i.text)) === JSON.stringify(before.items.map((i) => i.text))
assert(persisted, `الحالة ثابتة بعد إعادة التحميل (${s3.items.length} عناصر، ${s3.items.filter((i) => i.done).length} منجزة)`)
const domTexts = await page.locator('[data-testid="widget-host"] li span').allInnerTexts()
assert(domTexts.some((t) => t.includes('شراء بروتين')), 'المهام معروضة في DOM بعد إعادة التحميل')

// ===== 4) عزل لكل حساب (هوك useTodos الحقيقي بمعرّفين) =====
await page.locator('[data-testid="probe-add"]').click()
await page.locator('[data-testid="probe-add"]').click()
await page.waitForTimeout(30)
assert((await page.locator('[data-testid="probe-count"]').innerText()) === '2', 'الحساب A لديه مهمّتان')
await page.locator('[data-testid="probe-switch"]').click()
await page.waitForTimeout(30)
assert((await page.locator('[data-testid="probe-owner"]').innerText()) === 'B', 'تبديل للحساب B')
assert((await page.locator('[data-testid="probe-count"]').innerText()) === '0', 'الحساب B لا يرى مهام الحساب A (عزل)')
await page.locator('[data-testid="probe-add"]').click()
await page.locator('[data-testid="probe-switch"]').click()
await page.waitForTimeout(30)
assert((await page.locator('[data-testid="probe-count"]').innerText()) === '2', 'مهام الحساب A بقيت بعد الرجوع (عزل ثنائي الاتجاه)')
const keyA = await read('qimmah:todo:v1:account-A')
const keyB = await read('qimmah:todo:v1:account-B')
assert(keyA.items.length === 2 && keyB.items.length === 1, `مفاتيح منفصلة لكل حساب (A=${keyA.items.length}, B=${keyB.items.length})`)

// لقطة للهوية البصرية
mkdirSync(resolve(root, 'docs/product/assets'), { recursive: true })
await page.screenshot({ path: resolve(root, 'docs/product/assets/p10_a5_todo.png') })

await browser.close()
server.close()

// ===== 5) تحقّق قاعدة التدوير على المتجر الحقيقي (Node + localStorage مُحاكى) =====
await verifyRollover()

console.log('')
if (failures === 0) console.log('🎉 P10 A5 — كل الفحوص خضراء (متصفح فعلي + منطق التدوير).')
else console.log(`⚠️  P10 A5 — ${failures} فحص فشل.`)
process.exit(failures === 0 ? 0 : 1)

async function verifyRollover() {
  const b = await build({
    stdin: {
      contents: `import { loadTodos } from '@/features/todo/store'\nglobalThis.__loadTodos = loadTodos`,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': '{}' },
    logLevel: 'error',
  })
  const dir = mkdtempSync(join(tmpdir(), 'p10-a5-node-'))
  const file = join(dir, 'store.mjs')
  const banner = `
    const __m = new Map();
    globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: { getItem:k=>__m.has(k)?__m.get(k):null, setItem:(k,v)=>__m.set(k,String(v)), removeItem:k=>__m.delete(k), get length(){return __m.size}, key:i=>[...__m.keys()][i] } };
    globalThis.localStorage = globalThis.window.localStorage;
  `
  writeFileSync(file, banner + '\n' + b.outputFiles[0].text)
  await import(pathToFileURL(file).href)
  const key = 'qimmah:todo:v1:rollover-user'
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  globalThis.localStorage.setItem(
    key,
    JSON.stringify({
      date: stamp,
      items: [
        { id: 'y1', text: 'مهمة أمس غير منجزة', done: false },
        { id: 'y2', text: 'مهمة أمس منجزة', done: true },
      ],
    }),
  )
  const rolled = globalThis.__loadTodos('rollover-user')
  assert(rolled.items.length === 1 && rolled.items[0].text === 'مهمة أمس غير منجزة', `التدوير: بقيت غير المنجزة فقط (${rolled.items.length})`)
  assert(rolled.items[0]?.rolledOver === true && rolled.items[0]?.done === false, 'التدوير: المُرحّلة موسومة «من الأمس» وغير منجزة')
  assert(rolled.date !== stamp, 'التدوير: تاريخ الحالة صار اليوم')
}
