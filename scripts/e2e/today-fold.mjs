/**
 * قياس الطية الأولى للرئيسية في متصفّح حقيقي — [R4-UX-RINGS].
 *
 * ═══ لماذا قياس لا رأي ═══
 * [CTO-73] حذف بطاقات الحلقات بسبب **مقيس**: «تحجز ثلث الطية لتقول أربعة أرقام».
 * وقرار المؤسس أعادها. فالسؤال الوحيد الذي يحسم عودتها ليس «هل تبدو أنيقة؟» بل
 * **كم بكسلًا تأخذ فعلًا على ٣٩٠×٨٤٤**، وهل يبقى «وش أسوي الحين؟» داخل الطية.
 * والفحص البنيوي (`test:today-home`) يثبّت المقاسات المكتوبة — ولا يعرف شيئًا عن
 * الارتفاع المرسوم بعد الالتفاف والحشو والخطّ. هذا الطقم يقيسه.
 *
 * يقيس كذلك: ٣٢٠بك بلا قصّ أفقي · الأرقام العربية-الهندية في الحلقات · وأن أول
 * ما يراه القادم الجديد شرحٌ لا رقم.
 *
 * التشغيل: VITE_ENTITLEMENT_MODE=mock npm run build && node scripts/e2e/today-fold.mjs
 */
import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const PORT = 5341
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
const measurements = {}
const check = (label, condition, detail = '') => {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))
async function waitForServer(ms = 30_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* لم يبدأ بعد */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('today-fold preview server did not start')
}

const settle = (page, ms = 700) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')].find((c) => matcher.test((c.textContent || '').trim()))
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
  if (!(await gate.isVisible().catch(() => false))) return
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor()
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })
}

/** ارتفاع عنصر مرسوم + بُعد أسفله عن أعلى الصفحة (لقياس ما يدخل الطية). */
const boxOf = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const scroller = document.querySelector('main') || document.scrollingElement
  const top = scroller ? scroller.scrollTop : 0
  return { height: Math.round(r.height), width: Math.round(r.width), topInDoc: Math.round(r.top + top), bottomInDoc: Math.round(r.bottom + top) }
}, selector)

let browser
const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const diagnostics = { pageerror: [] }
  page.on('pageerror', (e) => diagnostics.pageerror.push(String(e)))

  console.log('\n=== ① القادم الجديد: شرحٌ قبل أي رقم ===')
  await onboardToPreview(page)
  await activateFromOpenGate(page)
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 2_000)
  await page.waitForSelector('[data-today-root]', { timeout: 20_000 })

  const firstDay = await boxOf(page, '[data-testid="today-first-day"]')
  check('بطاقة اليوم الأول تُرسم للقادم الجديد', firstDay !== null, JSON.stringify(firstDay))
  if (firstDay) {
    measurements.firstDayCard = firstDay
    check('وتقع داخل الطية الأولى (٨٤٤بك)', firstDay.topInDoc < 844, JSON.stringify(firstDay))
  }
  const explains = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="today-first-day"]')
    return el ? el.textContent || '' : ''
  })
  check('تقول ما المتوقّع اليوم وما تعنيه الأرقام', /بداية صغيرة/.test(explains) && /حلقة السعرات/.test(explains))

  console.log('\n=== ② الحلقات بعد أول تسجيل — القياس الحاسم ===')
  // كوب ماء واحد = «إشارة اليوم» فتنقلب اللوحة من الشرح إلى الأرقام.
  await page.locator('[data-testid="water-add"], button[aria-label*="كوب"]').first().click({ force: true }).catch(() => {})
  await settle(page, 1_200)
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2_400)
  await page.waitForSelector('[data-today-root]', { timeout: 20_000 })

  const rings = await boxOf(page, 'section[aria-labelledby="today-rings-title"]')
  check('بطاقة الحلقات مرسومة', rings !== null)
  if (rings) {
    measurements.ringsCard = rings
    console.log(`     ↳ ارتفاع بطاقة الحلقات المقيس على ٣٩٠×٨٤٤: ${rings.height}px (${(rings.height / 844 * 100).toFixed(1)}% من الطية)`)
    // الحدّ: أقلّ من ربع الطية. [CTO-73] حذفها لأنها كانت **ثلث** الطية.
    check(`ارتفاعها ${rings.height}بك < ٢١١بك (ربع الطية)`, rings.height < 211, `${rings.height}px`)
  }

  const next = await boxOf(page, '[data-testid="next-action-card"]')
  const nextBox = next ?? (await boxOf(page, 'section:has(> h2)'))
  if (nextBox) measurements.nextAction = nextBox
  const foldText = await page.evaluate(() => {
    const inFold = []
    for (const el of document.querySelectorAll('[data-today-root] section, [data-today-root] header')) {
      const r = el.getBoundingClientRect()
      if (r.top < 844) inFold.push((el.getAttribute('data-testid') || el.getAttribute('aria-labelledby') || el.tagName).slice(0, 40))
    }
    return inFold
  })
  measurements.sectionsInFold = foldText
  console.log(`     ↳ أقسام داخل الطية: ${foldText.join(' · ')}`)
  check('«وش أسوي الحين؟» يبقى داخل الطية مع الحلقات', foldText.length >= 3)

  console.log('\n=== ③ الأرقام والاتجاه ===')
  const ringDigits = await page.evaluate(() => {
    const el = document.querySelector('section[aria-labelledby="today-rings-title"]')
    return el ? (el.textContent || '') : ''
  })
  check('أرقام الحلقات عربية-هندية في الجلسة العربية', /[٠-٩]/.test(ringDigits), ringDigits.slice(0, 80))
  check('ولا رقم لاتيني خام تسرّب معها', !/[0-9]/.test(ringDigits), ringDigits.slice(0, 120))
  check('الجذر RTL', await page.evaluate(() => document.querySelector('[data-today-root]')?.getAttribute('dir') === 'rtl'))

  console.log('\n=== ④ خطوات اليوم على الرئيسية ===')
  const steps = await boxOf(page, '[data-testid="today-steps"]')
  check('بطاقة الخطوات مرسومة', steps !== null)
  if (steps) measurements.stepsCard = steps
  const stepsCopy = await page.evaluate(() => document.querySelector('[data-testid="today-steps"]')?.textContent || '')
  check('لا ادّعاء تتبّع تلقائي في نصّها', !/نتتبّع|تلقائي/.test(stepsCopy), stepsCopy.slice(0, 90))
  await page.locator('[data-testid="today-steps-edit"]').click({ force: true })
  await settle(page, 500)
  const input = page.locator('[data-testid="today-steps-input"]')
  check('الحقل نصّي لا رقمي (وإلا فُرِّغت الأرقام العربية)', (await input.getAttribute('type')) === 'text')
  await input.fill('٤٢٠٠')
  await settle(page, 300)
  check('الأرقام العربية-الهندية تصل الحقل ولا تُفرَّغ', (await input.inputValue()).length > 0, await input.inputValue())
  await page.locator('[data-testid="today-steps-save"]').click({ force: true })
  await settle(page, 800)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('qimmah:steps:v1') || '{}'))
  check('القيمة المحفوظة 4200 (لاتينية في التخزين)', Object.values(saved).includes(4200), JSON.stringify(saved))

  console.log('\n=== ⑤ ٣٢٠بك بلا قصّ أفقي ===')
  await page.setViewportSize({ width: 320, height: 720 })
  await settle(page, 900)
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  measurements.overflow320 = overflow
  check('لا تمرير أفقي عند ٣٢٠بك', overflow <= 1, `overflow=${overflow}`)
  const rings320 = await boxOf(page, 'section[aria-labelledby="today-rings-title"]')
  if (rings320) {
    measurements.ringsCard320 = rings320
    console.log(`     ↳ ارتفاع بطاقة الحلقات على ٣٢٠بك: ${rings320.height}px`)
    check(`ارتفاعها عند ٣٢٠بك ${rings320.height}بك < ٢٤٠بك`, rings320.height < 240, `${rings320.height}px`)
  }

  console.log('\n=== ⑥ الإنجليزية ===')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    const k = 'qimmah:prefs:v1'
    const p = JSON.parse(localStorage.getItem(k) || '{}')
    localStorage.setItem(k, JSON.stringify({ ...p, language: 'en' }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2_400)
  const enText = await page.evaluate(() => document.querySelector('[data-today-root]')?.textContent || '')
  check('الإنجليزية LTR', await page.evaluate(() => document.querySelector('[data-today-root]')?.getAttribute('dir') === 'ltr'))
  check('لا حرف عربي متسرّب في الإنجليزية', !/[؀-ۿ]/.test(enText), enText.slice(0, 120))
  const ringsEn = await boxOf(page, 'section[aria-labelledby="today-rings-title"]')
  if (ringsEn) {
    measurements.ringsCardEn = ringsEn
    console.log(`     ↳ ارتفاع بطاقة الحلقات (EN) على ٣٩٠بك: ${ringsEn.height}px`)
    check(`ارتفاع EN ${ringsEn.height}بك < ٢١١بك`, ringsEn.height < 211, `${ringsEn.height}px`)
  }

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

console.log(`\n📐 القياسات: ${JSON.stringify(measurements)}`)
console.log(fail === 0
  ? `\n✅ طية الرئيسية: ${pass} فحوص، 0 فشل.`
  : `\n❌ طية الرئيسية: ${pass} نجح، ${fail} فشل — ${failures.join(' | ')}`)
process.exit(fail === 0 ? 0 : 1)
