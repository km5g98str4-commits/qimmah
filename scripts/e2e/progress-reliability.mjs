// إثبات متصفح للمسار الحي Progress ↔ Measurements.
// التشغيل القانوني: npm run test:e2e:progress

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

// 5329 لا 5325: كان هذا الطقم يتقاسم 5325 مع `navigation-history.mjs`. وما دام كلٌّ
// يبني `dist/` ثم يخدمه، فبقاء خادم أحدهما لحظةً إضافية يجعل الآخر يتصل بـ**بناء
// قديم** بدل بنائه هو — فيقرأ سلوكًا ليس سلوك الكود الحالي. سببٌ صامت لسقوط
// متقطّع لا يدلّ على المنتج. (لُوحظ فعليًا في تشغيل المصفوفة الكاملة.)
const PORT = 5329
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const MEASUREMENTS_KEY = 'qimmah:history:measurementLogs:v1'
const MOCK_ENTITLEMENT_KEY = 'qimmah:entitlement-mock:v1'

let pass = 0
let fail = 0
const failures = []
const check = (label, condition, detail = '') => {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))

async function waitForServer(ms = 30_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* لم يبدأ بعد. */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('progress preview server did not start')
}

const settle = (page, ms = 700) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')].find((candidate) => matcher.test((candidate.textContent || '').trim()))
  if (!node) return false
  node.click()
  return true
}, re.source)

async function onboardToPreview(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2_600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1_200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true })
  await rows.nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next)
  await settle(page, 1_600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_400)
}

async function activateFromOpenGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor()
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })
}

async function dismissGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })
}

const stored = (page) => page.evaluate((key) => localStorage.getItem(key), MEASUREMENTS_KEY)

async function installStorageFault(page) {
  await page.evaluate((measurementKey) => {
    window.__qimmahMeasurementOriginalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === measurementKey) throw new DOMException('quota', 'QuotaExceededError')
      return window.__qimmahMeasurementOriginalSetItem.call(this, key, value)
    }
  }, MEASUREMENTS_KEY)
}

async function clearStorageFault(page) {
  await page.evaluate(() => {
    if (window.__qimmahMeasurementOriginalSetItem) {
      Storage.prototype.setItem = window.__qimmahMeasurementOriginalSetItem
      delete window.__qimmahMeasurementOriginalSetItem
    }
  })
}

let browser
const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const diagnostics = { console: [], pageerror: [] }
  page.on('console', (message) => { if (message.type() === 'error') diagnostics.console.push(message.text()) })
  page.on('pageerror', (error) => diagnostics.pageerror.push(String(error)))

  console.log('\n=== المسار والفراغ والمعاينة ===')
  await onboardToPreview(page)
  await page.evaluate(() => { location.hash = '/measurements' })
  await page.getByRole('heading', { name: 'القياسات', exact: true }).waitFor()
  check('المسار العميق #/measurements يصل واجهة حيّة', (await page.url()).includes('#/measurements'))
  check('الحالة الفارغة صريحة وبفعل حقيقي', await page.locator('[data-testid="measurements-empty"]').isVisible())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'القياسات', exact: true }).waitFor()
  check('التحديث يبقى على مسار القياسات', (await page.url()).includes('#/measurements'))

  await page.locator('[data-testid="measurements-add"]').click()
  await page.waitForSelector('#v2-weight', { timeout: 10_000 }).catch(async (error) => {
    const snapshot = await page.evaluate(() => ({ hash: location.hash, body: document.body.innerText.slice(0, 900) }))
    throw new Error(`measurement editor did not open: ${JSON.stringify(snapshot)} · console=${diagnostics.console.join(' | ')} · pageerror=${diagnostics.pageerror.join(' | ')}`, { cause: error })
  })
  await page.getByLabel('الوزن').fill('12')
  await page.getByRole('button', { name: 'احفظ القياسات', exact: true }).click()
  check('التحقق يرفض وزنًا خارج المجال قبل أي بوابة أو كتابة', await page.getByRole('alert').filter({ hasText: /بين 15 و250/ }).isVisible() && (await stored(page)) === null)

  await page.getByLabel('الوزن').fill('81.5')
  await page.getByLabel('محيط الخصر').fill('20')
  await page.getByRole('button', { name: 'احفظ القياسات', exact: true }).click()
  check('خطأ الخصر يوسم الحقل نفسه ويربطه برسالة التنبيه', await page.locator('#v2-waist').getAttribute('aria-invalid') === 'true' && await page.locator('#v2-waist').getAttribute('aria-describedby') === 'measurement-error')
  await page.getByLabel('محيط الخصر').fill('87')
  await page.getByLabel(/نسبة الدهون/).fill('22')
  await page.getByRole('button', { name: 'احفظ القياسات', exact: true }).click()
  await page.locator('[data-testid="premium-gate"]').waitFor()
  check('Preview يفتح بوابة Premium عند الحفظ', await page.locator('[data-testid="premium-gate"]').isVisible())
  check('Preview لا يكتب القياس', (await stored(page)) === null)

  await activateFromOpenGate(page)
  await page.getByRole('button', { name: 'احفظ القياسات', exact: true }).click()
  await page.locator('[data-testid="measurements-history"]').waitFor()
  const firstBytes = await stored(page)
  check('Premium يحفظ الوزن والخصر ونسبة الدهون في السجل القانوني', !!firstBytes && firstBytes.includes('81.5') && firstBytes.includes('87') && firstBytes.includes('22'))
  const historyText = await page.locator('[data-testid="measurements-history"]').innerText()
  check('السجل يعرض القيم الحقيقية بأرقام العربية ووسم الدهون التقديري', historyText.includes('٨١٫٥') && !historyText.includes('81.5') && await page.getByText(/نسبة الدهون · تقديري/).isVisible())
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-testid="measurements-history"]').waitFor()
  const reloadedHistoryText = await page.locator('[data-testid="measurements-history"]').innerText()
  check('السجل يبقى بعد reload وبنفس سياسة الأرقام العربية', reloadedHistoryText.includes('٨١٫٥') && !reloadedHistoryText.includes('81.5'))

  console.log('\n=== مداخل Profile/Progress + Back ===')
  await page.getByRole('button', { name: 'رجوع إلى التقدّم' }).click()
  await page.getByRole('heading', { name: 'التقدّم', exact: true }).waitFor()
  check('Back يعيد إلى Progress ويحدّث العنوان', (await page.url()).includes('#/progress'))
  await page.locator('[data-testid="progress-measurements-entry"]').click()
  await page.getByRole('heading', { name: 'القياسات', exact: true }).waitFor()
  check('Progress يملك مدخلًا مباشرًا للقياسات', (await page.url()).includes('#/measurements'))
  await page.evaluate(() => { location.hash = '/profile' })
  await page.getByRole('heading', { name: 'ملفك', exact: true, level: 1 }).waitFor()
  await page.getByRole('button', { name: 'القياسات', exact: true }).click()
  await page.getByRole('heading', { name: 'القياسات', exact: true }).waitFor()
  check('Profile يملك مدخلًا مباشرًا بلا وعد صور زائف', (await page.url()).includes('#/measurements'))

  console.log('\n=== تعديل/حذف صادق تحت quota ===')
  await page.getByRole('button', { name: 'عدّل', exact: true }).click()
  await page.getByLabel('الوزن').fill('80.8')
  const beforeFailedEdit = await stored(page)
  await installStorageFault(page)
  await page.getByRole('button', { name: 'احفظ التعديل', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: /ما قدرنا نحفظ التغيير/ }).waitFor()
  check('فشل التعديل يعرض رسالة صادقة ويبقي المحرّر', await page.getByLabel('الوزن').inputValue() === '80.8')
  check('فشل التعديل يبقي البايتات القديمة', (await stored(page)) === beforeFailedEdit)
  await clearStorageFault(page)
  await page.getByRole('button', { name: 'احفظ التعديل', exact: true }).click()
  await page.locator('[data-testid="measurements-history"]').waitFor()
  check('إعادة محاولة التعديل الناجحة تحدّث السجل نفسه', (await stored(page)).includes('80.8') && !(await stored(page)).includes('81.5'))

  const beforeFailedDelete = await stored(page)
  await page.getByRole('button', { name: 'احذف', exact: true }).click()
  await page.locator('[data-testid="measurement-delete-confirm"]').waitFor()
  check('تأكيد الحذف ينقل التركيز إلى الإلغاء الآمن', await page.getByRole('button', { name: 'إلغاء', exact: true }).evaluate((node) => document.activeElement === node))
  await installStorageFault(page)
  await page.getByRole('button', { name: 'نعم، احذفه', exact: true }).click()
  await page.locator('[data-testid="measurements-error"]').waitFor()
  check('فشل الحذف يبقي السجل والبايتات القديمة', (await stored(page)) === beforeFailedDelete && await page.locator('[data-testid="measurements-history"]').isVisible())
  await clearStorageFault(page)
  await page.getByRole('button', { name: 'نعم، احذفه', exact: true }).click()
  await page.locator('[data-testid="measurements-empty"]').waitFor()
  check('الحذف الناجح وحده يعيد الحالة الفارغة', JSON.parse((await stored(page)) || '[]').length === 0)

  console.log('\n=== Preview يمنع edit/delete لسجل موجود ===')
  await page.evaluate(({ key, entitlement }) => {
    localStorage.setItem(key, JSON.stringify([{ id: 'preview-record', date: '2026-08-13', values: { weightKg: 79 }, source: 'manual' }]))
    sessionStorage.removeItem(entitlement)
  }, { key: MEASUREMENTS_KEY, entitlement: MOCK_ENTITLEMENT_KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-testid="measurements-history"]').waitFor()
  const previewBytes = await stored(page)
  await page.getByRole('button', { name: 'عدّل', exact: true }).click()
  await page.getByLabel('الوزن').fill('78')
  await page.getByRole('button', { name: 'احفظ التعديل', exact: true }).click()
  await page.locator('[data-testid="premium-gate"]').waitFor()
  check('Preview يمنع التعديل ولا يغيّر البايتات', (await stored(page)) === previewBytes)
  await dismissGate(page)
  await page.getByRole('button', { name: 'رجوع', exact: true }).click()
  await page.getByRole('button', { name: 'احذف', exact: true }).click()
  await page.getByRole('button', { name: 'نعم، احذفه', exact: true }).click()
  await page.locator('[data-testid="premium-gate"]').waitFor()
  check('Preview يمنع الحذف ولا يغيّر البايتات', (await stored(page)) === previewBytes)
  await dismissGate(page)

  console.log('\n=== 320px + English/LTR + touch ===')
  await page.setViewportSize({ width: 320, height: 780 })
  await page.evaluate(() => {
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: 'en', hapticsEnabled: true, theme: 'system', themeSchedule: { enabled: false, lat: null, lon: null, cityLabel: null } }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Measurements', exact: true }).waitFor()
  const layout = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    add: document.querySelector('[data-testid="measurements-add"]')?.getBoundingClientRect().height || 0,
    back: document.querySelector('button[aria-label="Back to Progress"]')?.getBoundingClientRect().height || 0,
  }))
  check('English يعرض LTR على المسار نفسه', layout.dir === 'ltr')
  check('320px بلا قص أفقي', layout.overflow <= 1, JSON.stringify(layout))
  check('أهداف اللمس الأساسية ≥44px', layout.add >= 44 && layout.back >= 44, JSON.stringify(layout))
  check('المسار كله بلا pageerror', diagnostics.pageerror.length === 0, diagnostics.pageerror.join(' | '))

  await context.close()
} catch (error) {
  fail += 1
  failures.push('unexpected exception')
  console.error(error)
} finally {
  await browser?.close().catch(() => {})
  preview?.kill()
}

console.log(fail === 0
  ? `\n✅ موثوقية Progress/Measurements: ${pass} فحوص، 0 فشل.`
  : `\n❌ موثوقية Progress/Measurements: ${pass} نجح، ${fail} فشل — ${failures.join(' | ')}`)
process.exit(fail === 0 ? 0 : 1)
