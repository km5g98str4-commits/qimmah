#!/usr/bin/env node
/**
 * إثبات حيّ: نداء الإحماء في «اليوم» يفتح الإحماء — لا الشاشة العامّة.
 *
 * ═══ العطل الذي وُلد منه ═══
 * «اليوم» يعرض «إحماء قصير · سوّه الحين»، وضغطُه كان ينفّذ `onNavigate('workout')`
 * وحدها. وشاشة الإحماء موجودة وموصولة (`WarmupScreen` داخل `WorkoutView`) لكن
 * مدخلها الوحيد `startDay` — أي زرّ البدء **داخل** شاشة التمرين. فتُفقد النيّة
 * عند الحدّ بين الشاشتين ويهبط المستخدم على قائمة التمارين: نداءٌ يَعِد بالإحماء
 * ويُسلّم غيره (§6-٤).
 *
 * ═══ لماذا سكربت مستقلّ ═══
 * الفحص يحتاج ثلاثة شروط معًا: خطّة مبنيّة · استحقاق فعّال · ويومٌ **لم يُتمرَّن
 * بعد**. ورحلة `workout-reliability` تستهلك اليوم بجلستين كاملتين، فبعدها لا
 * يبقى إحماء يُقترح أصلًا فيغيب النداء **بحقّ**. وفحصٌ يغيب شرطه ليس إثباتًا.
 *
 * والساعة تُثبَّت نهارًا لأن `suggestFirstWin` يقترح الماء بعد التاسعة مساءً —
 * فحصٌ يصدق نصف اليوم ويصمت نصفه ليس إثباتًا كذلك.
 *
 * التشغيل: VITE_ENTITLEMENT_MODE=mock npm run build && node scripts/run-warmup-cta-live-proof.mjs
 */
import { spawn } from 'node:child_process'
import { chromium } from './e2e/lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './e2e/lib/onboarding-driver.mjs'

const PORT = 5353
const URL = process.env.PREVIEW_URL || `http://localhost:${PORT}`

let pass = 0
const fails = []
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`) }
}
const settle = (page, ms) => page.waitForTimeout(ms)

const preview = process.env.PREVIEW_URL
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
for (let i = 0; i < 75; i++) {
  try { if ((await fetch(URL)).ok) break } catch { /* لم يبدأ بعد */ }
  await new Promise((r) => setTimeout(r, 400))
}

let browser
try {
  browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  // ═══ ١) خطّة مبنيّة عبر الإعداد الحقيقي ═══
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2_400)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1_200)
  await page.getByRole('button', { name: /نبدأ/ }).first().click({ force: true })
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  const chosenIntent = await selectIntent(page, 'meals')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosenIntent })
  await settle(page, 1_600)
  await page.getByRole('button', { name: /الدخول للوحة/ }).first().click({ force: true })
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_400)

  // اليوم الحالي يوم تدريب — لا نعلّق الإثبات على يوم تشغيل CI.
  await page.evaluate(() => {
    const key = 'qimmah:workoutCalendar:v1'
    const schedule = JSON.parse(localStorage.getItem(key) || 'null')
    if (!schedule || !Array.isArray(schedule.weekdays)) throw new Error('no workout calendar persisted')
    schedule.weekdays[new Date().getDay()] = 0
    schedule.updatedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(schedule))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1_600)

  // ═══ ٢) استحقاق فعّال عبر بوّابة التفعيل الحقيقية ═══
  await page.evaluate(() => { location.hash = '/workout' })
  await settle(page, 1_400)
  await page.getByRole('button', { name: /^ابدأ تمرين اليوم/ }).first().click({ force: true })
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.waitFor({ timeout: 20_000 })
  check('المعاينة تفتح بوّابة Premium — الحدّ قائم قبل التفعيل', await gate.isVisible())
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor()
  check('كود التفعيل يمنح الاستحقاق', true)
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })

  // ═══ ٣) النداء نفسه — بساعة مثبَّتة نهارًا ويومٍ لم يُتمرَّن بعد ═══
  await page.clock.setFixedTime(new Date('2026-08-23T10:00:00'))
  await page.evaluate(() => { location.hash = '/dashboard' })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2_000)

  const cta = page.locator('[data-testid="today-win-warmup"]')
  check('«اليوم» يعرض نداء الإحماء نهارًا', await cta.isVisible().catch(() => false))
  await cta.click({ force: true })
  await settle(page, 2_000)

  check('ضغط «سوّه الحين» يفتح شاشة الإحماء — لا قائمة التمارين',
    await page.locator('[data-testid="warmup-start"]').isVisible().catch(() => false))
  check('ولا حقل وزن قبل الإحماء — الترتيب محفوظ',
    (await page.locator('input[inputmode="decimal"]').count()) === 0)

  // ═══ ٤) المخرج: «ابدأ الإحماء» ← الجلسة الحيّة ═══
  // محروس: بلا الإصلاح لا تُفتح الشاشة أصلًا، فيجب أن يسقط الفحص **باسمه**
  // لا بمهلة عارية — «السقوط غير المسمّى ليس إثباتًا» (§4.2).
  const warmStart = page.locator('[data-testid="warmup-start"]')
  if (await warmStart.isVisible().catch(() => false)) {
    await warmStart.click({ force: true })
    const entered = await page.locator('input[inputmode="decimal"]').first()
      .waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)
    check('«ابدأ الإحماء» ← الجلسة الحيّة', entered)
  } else {
    check('«ابدأ الإحماء» ← الجلسة الحيّة', false, 'شاشة الإحماء لم تُفتح أصلًا')
  }

  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 1_400)
  await page.evaluate(() => { location.hash = '/workout' })
  await settle(page, 1_400)
  const resume = page.getByRole('button', { name: /أكمل|استئناف|ارجع/ }).first()
  if (await resume.isVisible().catch(() => false)) await resume.click({ force: true })
  await settle(page, 1_200)

  check('المسار كله بلا pageerror', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
  await context.close()
} catch (e) {
  fails.push('unexpected exception')
  console.error(e)
} finally {
  await browser?.close().catch(() => {})
  preview?.kill()
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} نداء الإحماء حيًّا: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
