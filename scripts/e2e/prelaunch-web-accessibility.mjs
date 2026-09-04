/**
 * Browser-level closure for QIM-RED-007/008/010.
 *
 * Source assertions cannot prove that React's conditional shell produces one
 * target at runtime, that the skip link moves focus without changing the hash,
 * or that the water validation is actually associated in the accessibility
 * tree. This journey measures those contracts in Chromium on the shipped build.
 */
import { spawn } from 'node:child_process'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = Number(process.env.PORT || 5433)
const URL = `http://localhost:${PORT}`
const settle = (page, ms = 700) => page.waitForTimeout(ms)
let pass = 0
let fail = 0
const check = (label, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fail++; console.error(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function waitForServer(ms = 40_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('preview did not start')
}

const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')]
    .find((candidate) => matcher.test((candidate.textContent || '').trim()))
  if (!node) return false
  node.click()
  return true
}, re.source)

async function onboard(page) {
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true, timeout: 15_000 })
  await settle(page, 1_000)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true, timeout: 8_000 })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  const intent = await selectIntent(page, 'meals')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent })
  await settle(page, 1_500)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_200)
}

const domContract = (page) => page.evaluate(() => ({
  skipLinks: document.querySelectorAll('a[href="#main-content"]').length,
  mainLandmarks: document.querySelectorAll('main').length,
  targets: document.querySelectorAll('#main-content').length,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}))

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  env: process.env,
})
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--no-sandbox'] })
  // 1280×900 physical canvas at 200% => 640×450 CSS viewport.
  const context = await browser.newContext({
    viewport: { width: 640, height: 450 },
    deviceScaleFactor: 2,
    locale: 'ar-SA',
  })
  context.setDefaultTimeout(8_000)
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  console.log(`\n① الصفحة المستقلة — DOM حيّ (${engineName})`)
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 1_500)
  const standalone = await domContract(page)
  check('رابط تخطٍّ واحد', standalone.skipLinks === 1, JSON.stringify(standalone))
  check('معلم main واحد', standalone.mainLandmarks === 1, JSON.stringify(standalone))
  check('هدف main-content واحد', standalone.targets === 1, JSON.stringify(standalone))
  check('لا تمرير أفقي عند محاكاة 200% على الصفحة المستقلة', standalone.overflow <= 1, `overflow=${standalone.overflow}`)

  const hashBefore = await page.evaluate(() => location.hash)
  await page.locator('a[href="#main-content"]').focus()
  await page.keyboard.press('Enter')
  const skipResult = await page.evaluate(() => ({ hash: location.hash, activeId: document.activeElement?.id }))
  check('التخطّي ينقل التركيز إلى المحتوى', skipResult.activeId === 'main-content', skipResult.activeId || '(none)')
  check('التخطّي لا يغيّر hash routing', skipResult.hash === hashBefore, `${hashBefore} ⇒ ${skipResult.hash}`)

  console.log('\n② قشرة التطبيق — نفس العقد بعد التخصيص')
  await onboard(page)
  const shell = await domContract(page)
  check('رابط تخطٍّ واحد داخل القشرة', shell.skipLinks === 1, JSON.stringify(shell))
  check('معلم main واحد داخل القشرة', shell.mainLandmarks === 1, JSON.stringify(shell))
  check('هدف main-content واحد داخل القشرة', shell.targets === 1, JSON.stringify(shell))
  check('لا تمرير أفقي عند 200% داخل القشرة', shell.overflow <= 1, `overflow=${shell.overflow}`)

  const shellHash = await page.evaluate(() => location.hash)
  await page.locator('a[href="#main-content"]').focus()
  await page.keyboard.press('Enter')
  const shellSkip = await page.evaluate(() => ({ hash: location.hash, activeId: document.activeElement?.id }))
  check('تخطّي القشرة يركّز main الفعلي', shellSkip.activeId === 'main-content', shellSkip.activeId || '(none)')
  check('وتخطّي القشرة لا يغيّر المسار', shellSkip.hash === shellHash, `${shellHash} ⇒ ${shellSkip.hash}`)

  console.log('\n③ حقل الماء — اسم وتحقق مرتبطان فعليًّا')
  await page.evaluate(() => {
    sessionStorage.setItem('qimmah:entitlement-mock:v1', 'active')
    sessionStorage.setItem('qimmah:entitlement-mock-kind:v1', 'premium')
    location.hash = '#/nutrition'
  })
  await page.reload({ waitUntil: 'networkidle' })
  const input = page.locator('#custom-water-amount')
  await input.waitFor({ state: 'visible', timeout: 20_000 })
  const arabicName = await input.evaluate((element) => element.labels?.[0]?.textContent?.trim() || '')
  check('للحقل اسم عربي مرتبط عبر label', arabicName.length > 0, arabicName)
  await input.fill('1')
  const invalid = await input.getAttribute('aria-invalid')
  const describedBy = await input.getAttribute('aria-describedby')
  const messageVisible = await page.locator('#custom-water-msg[role="alert"]').isVisible()
  check('القيمة غير الصالحة معلنة', invalid === 'true', String(invalid))
  check('الحقل مرتبط برسالة التحقق', describedBy === 'custom-water-msg' && messageVisible, String(describedBy))
  const nutrition = await domContract(page)
  check('لا تمرير أفقي عند 200% في شاشة التغذية', nutrition.overflow <= 1, `overflow=${nutrition.overflow}`)

  await page.evaluate(() => {
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({
      language: 'en', hapticsEnabled: true, theme: 'system',
      themeSchedule: { enabled: false, lat: null, lon: null, cityLabel: null },
      numeralStyle: 'auto',
    }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await input.waitFor({ state: 'visible', timeout: 20_000 })
  const englishName = await input.evaluate((element) => element.labels?.[0]?.textContent?.trim() || '')
  check('وللحقل اسم إنجليزي مرتبط ومختلف', englishName.length > 0 && englishName !== arabicName, englishName)
  check('لا أخطاء صفحة', pageErrors.length === 0, pageErrors.join(' | '))

  console.log(`\n${fail === 0 ? '✅' : '❌'} prelaunch browser accessibility: ${pass} passed, ${fail} failed`)
} finally {
  await browser?.close().catch(() => {})
  preview.kill('SIGTERM')
}

process.exit(fail === 0 ? 0 : 1)
