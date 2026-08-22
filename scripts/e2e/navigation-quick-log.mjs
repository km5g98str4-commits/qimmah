// Built-artifact browser proof: Quick Log keyboard/pointer contract, fail-safe
// sessionStorage behavior, and deterministic 404 recovery.

import { spawn } from 'node:child_process'
import { chromium, webkit } from 'playwright'
import { loadAppCopy, requireKey } from './lib/app-copy.mjs'

const { dataKeys } = await loadAppCopy()
const K_ONBOARDING = requireKey(dataKeys, 'qimmah:onboarding:v1')
const K_PREFS = requireKey(dataKeys, 'qimmah:prefs:v1')
const K_NUTRITION = requireKey(dataKeys, 'qimmah:nutrition:v2')
const INTENT_KEY = 'qimmah:quick-log-intent'
const PORT = 5330
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://127.0.0.1:${PORT}`
const BROWSER_NAME = process.env.QIMMAH_BROWSER === 'webkit' ? 'webkit' : 'chromium'
const BROWSER_TYPE = BROWSER_NAME === 'webkit' ? webkit : chromium

let pass = 0
let fail = 0
const failures = []
function check(label, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const preview = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  // `npx` may leave Vite as a grandchild; own a process group so teardown
  // cannot print green and then hang on the still-open ready-signal pipes.
  detached: true,
})
const previewReady = preview ? new Promise((resolve, reject) => {
  let output = ''
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-4_000)
    if (/Local:\s+http:\/\/127\.0\.0\.1:\d+\//.test(output)) resolve()
  }
  preview.stdout.on('data', append)
  preview.stderr.on('data', append)
  preview.once('error', (error) => reject(new Error(`quick-log preview failed to start: ${error.message}`)))
  preview.once('exit', (code, signal) => reject(new Error(`quick-log preview exited before ready (${code ?? signal ?? 'unknown'})\n${output}`)))
}) : Promise.resolve()

async function waitForServer(ms = 30_000) {
  await previewReady
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* owned preview is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('quick-log preview did not become ready')
}

function diagnostics(page) {
  const values = []
  page.on('pageerror', (error) => values.push(`pageerror: ${error}`))
  page.on('console', (message) => { if (message.type() === 'error') values.push(`console: ${message.text()}`) })
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') values.push(`script-requestfailed: ${request.url()} — ${request.failure()?.errorText ?? 'unknown'}`)
  })
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script' && response.status() >= 400) values.push(`script-response: ${response.status()} ${response.url()}`)
  })
  return values
}

async function newSeededPage(browser, { width = 390, lang = 'ar', blockIntentStorage = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, locale: lang === 'ar' ? 'ar-SA' : 'en-US' })
  // Seed before the first application byte executes. The old fixture opened an
  // unseeded app at `domcontentloaded`, then rewrote storage/hash and reloaded.
  // WebKit correctly reported the deliberately aborted, still-pending Supabase
  // module import as a failed script request. That measured the fixture's forced
  // navigation, not a user's seeded boot. Dirty-state owns unseeded/legacy boot.
  await context.addInitScript(({ onboarding, prefs, language }) => {
    localStorage.setItem(onboarding, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
    localStorage.setItem(prefs, JSON.stringify({ language }))
  }, { onboarding: K_ONBOARDING, prefs: K_PREFS, language: lang })
  if (blockIntentStorage) {
    await context.addInitScript((intentKey) => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function setItem(key, value) {
        if (this === window.sessionStorage && key === intentKey) throw new DOMException('Blocked for reliability proof', 'SecurityError')
        return original.call(this, key, value)
      }
    }, INTENT_KEY)
  }
  const page = await context.newPage()
  const errors = diagnostics(page)
  await page.goto(`${URL}#/dashboard`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: lang === 'ar' ? 'تسجيل' : 'Log', exact: true }).waitFor()
  return { context, page, errors }
}

const rect = (locator) => locator.evaluate((node) => {
  const box = node.getBoundingClientRect()
  return { width: box.width, height: box.height, top: box.top, bottom: box.bottom, left: box.left, right: box.right }
})

async function openQuickLog(page, lang) {
  const trigger = page.getByRole('button', { name: lang === 'ar' ? 'تسجيل' : 'Log', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: lang === 'ar' ? 'وش بتسجّل؟' : 'What do you want to log?', exact: true })
  await dialog.waitFor()
  return { trigger, dialog, close: page.getByRole('button', { name: lang === 'ar' ? 'إغلاق التسجيل السريع' : 'Close quick log', exact: true }) }
}

let browser
try {
  await waitForServer()
  browser = await BROWSER_TYPE.launch(BROWSER_NAME === 'chromium'
    ? { headless: true, executablePath: process.env.PW_CHROMIUM || undefined }
    : { headless: true })
  console.log(`\n=== Browser: ${BROWSER_NAME} ${await browser.version()} ===`)

  console.log('\n=== AR/EN × 320/390/430 modal matrix ===')
  for (const lang of ['ar', 'en']) {
    for (const width of [320, 390, 430]) {
      const tag = `${lang}/${width}`
      const { context, page, errors } = await newSeededPage(browser, { width, lang })
      const { trigger, dialog, close } = await openQuickLog(page, lang)
      const box = await rect(dialog)
      const targetBoxes = await dialog.getByRole('button').evaluateAll((nodes) => nodes.map((node) => {
        const b = node.getBoundingClientRect(); return { width: b.width, height: b.height }
      }))
      check(`${tag}: modal + language direction`, await dialog.getAttribute('aria-modal') === 'true' && await page.evaluate((expected) => document.documentElement.dir === expected, lang === 'ar' ? 'rtl' : 'ltr'))
      check(`${tag}: initial focus is close`, await close.evaluate((node) => document.activeElement === node))
      check(`${tag}: all dialog targets meet 44px`, targetBoxes.length === 4 && targetBoxes.every((b) => b.width >= 44 && b.height >= 44), JSON.stringify(targetBoxes))
      check(`${tag}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
      check(`${tag}: dialog stays in viewport`, box.left >= -1 && box.right <= width + 1 && box.top >= -1 && box.bottom <= 801, JSON.stringify(box))
      await page.keyboard.press('Shift+Tab')
      check(`${tag}: Shift+Tab remains inside modal`, await dialog.evaluate((node) => node.contains(document.activeElement)))
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      check(`${tag}: Escape closes and restores trigger focus`, await trigger.evaluate((node) => document.activeElement === node))
      check(`${tag}: no page/console errors`, errors.length === 0, errors.join(' | '))
      await context.close()
    }
  }

  console.log('\n=== Real-pointer destinations and Preview mutation gate ===')
  {
    const { context, page, errors } = await newSeededPage(browser)
    const before = await page.evaluate((key) => localStorage.getItem(key), K_NUTRITION)
    const { dialog } = await openQuickLog(page, 'ar')
    await dialog.getByRole('button', { name: 'وجبة', exact: true }).click()
    await page.waitForURL(/#\/nutrition$/)
    await page.getByTestId('premium-gate').waitFor()
    const after = await page.evaluate((key) => localStorage.getItem(key), K_NUTRITION)
    check('Meal routes to Nutrition and is blocked by Preview gate', await page.getByTestId('premium-gate').isVisible())
    check('Meal intent causes no Preview data mutation', before === after)
    check('Meal intent is consumed once', await page.evaluate((key) => sessionStorage.getItem(key), INTENT_KEY) === null)
    check('Meal flow has no page/console errors', errors.length === 0, errors.join(' | '))
    await context.close()
  }
  {
    const { context, page, errors } = await newSeededPage(browser)
    const { dialog } = await openQuickLog(page, 'ar')
    await dialog.getByRole('button', { name: 'ماء', exact: true }).click()
    await page.waitForURL(/#\/nutrition$/)
    const waterAction = page.getByRole('button', { name: '+250 مل', exact: true })
    await waterAction.waitFor()
    check('Water routes to its live panel and focuses the first action', await waterAction.evaluate((node) => document.activeElement === node))
    check('Water intent does not fabricate a log or open the mutation gate', await page.getByTestId('premium-gate').count() === 0)
    check('Water flow has no page/console errors', errors.length === 0, errors.join(' | '))
    await context.close()
  }
  {
    const { context, page, errors } = await newSeededPage(browser)
    const { dialog } = await openQuickLog(page, 'ar')
    await dialog.getByRole('button', { name: 'دواء أو مكمّل', exact: true }).click()
    await page.waitForURL(/#\/profile$/)
    await page.getByRole('heading', { name: 'دوائي ومكمّلاتي', exact: true, level: 2 }).waitFor()
    check('Routine routes to the actual Profile routine screen', true)
    check('Routine flow has no page/console errors', errors.length === 0, errors.join(' | '))
    await context.close()
  }

  console.log('\n=== Blocked sessionStorage counter-proof ===')
  for (const target of ['meal', 'water', 'routine']) {
    const { context, page, errors } = await newSeededPage(browser, { blockIntentStorage: true })
    const { dialog } = await openQuickLog(page, 'ar')
    const label = target === 'meal' ? 'وجبة' : target === 'water' ? 'ماء' : 'دواء أو مكمّل'
    await dialog.getByRole('button', { name: label, exact: true }).click()
    let reachedLiveDestination = true
    if (target === 'meal') {
      await page.waitForURL(/#\/nutrition$/)
      await page.getByTestId('premium-gate').waitFor()
    } else if (target === 'water') {
      await page.waitForURL(/#\/nutrition$/)
      const waterAction = page.getByRole('button', { name: '+250 مل', exact: true })
      await waterAction.waitFor()
      reachedLiveDestination = await waterAction.evaluate((node) => document.activeElement === node)
    } else {
      await page.waitForURL(/#\/profile$/)
      await page.getByRole('heading', { name: 'دوائي ومكمّلاتي', exact: true, level: 2 }).waitFor()
    }
    check(`blocked sessionStorage: ${target} still reaches live destination`, reachedLiveDestination)
    check(`blocked sessionStorage: ${target} has no uncaught error`, errors.length === 0, errors.join(' | '))
    await context.close()
  }

  console.log('\n=== Deterministic 404 recovery ===')
  {
    const { context, page, errors } = await newSeededPage(browser)
    await page.evaluate(() => { location.hash = '#/definitely-missing' })
    await page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true }).waitFor()
    await page.getByRole('button', { name: 'الشاشة السابقة', exact: true }).click()
    await page.waitForURL(/#\/dashboard$/)
    check('internal 404 Back restores previous valid in-app route', await page.evaluate(() => location.hash) === '#/dashboard')
    await page.goBack()
    check('recovered invalid entry does not form a 404 loop', await page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true }).count() === 0)
    check('internal 404 recovery has no page/console errors', errors.length === 0, errors.join(' | '))
    await context.close()
  }
  {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 }, locale: 'ar-SA' })
    const page = await context.newPage()
    const errors = diagnostics(page)
    await page.goto(`${URL}#/directly-missing`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true }).waitFor()
    await page.getByRole('button', { name: 'الشاشة السابقة', exact: true }).click()
    await page.waitForURL(/#\/start$/)
    check('direct-entry 404 Back stays inside Qimmah at safe start', await page.evaluate((expectedOrigin) => location.origin === expectedOrigin && location.hash === '#/start', new globalThis.URL(URL).origin))
    check('direct-entry 404 recovery has no page/console errors', errors.length === 0, errors.join(' | '))
    await context.close()
  }
} finally {
  await browser?.close().catch(() => {})
  if (preview) {
    try { process.kill(-preview.pid, 'SIGTERM') } catch { preview.kill('SIGTERM') }
    preview.stdout?.destroy()
    preview.stderr?.destroy()
  }
}

console.log(`\n${fail === 0 ? '✅' : '❌'} navigation-quick-log — ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
