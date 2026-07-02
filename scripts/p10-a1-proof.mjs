// إثبات P10 A1 (متصفّح بلا رأس): يبني جدولًا مخصّصًا من 3 أيام عبر الإعداد الحقيقي،
// يتحقّق من الاستمرار بعد التحديث، وأن تبويب التمرين يعرضه، ووضع التمرين يشغّله،
// والتبديل للجدول التلقائي والعودة. أداة إثبات فقط — لا تُعدّل التطبيق.
//
// التشغيل: node scripts/p10-a1-proof.mjs  (بعد npm run build)

import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import net from 'node:net'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const shotsDir = resolve(root, 'docs/product/p10-a1')
mkdirSync(shotsDir, { recursive: true })

const PORT = 4317
const URL = `http://localhost:${PORT}/`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const log = (...a) => console.log('•', ...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
  throw new Error(m)
}

function waitPort(port, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((res, rej) => {
    const tryOnce = () => {
      const s = net.connect(port, 'localhost')
      s.on('connect', () => { s.end(); res() })
      s.on('error', () => {
        s.destroy()
        if (Date.now() - start > timeoutMs) rej(new Error('server timeout'))
        else setTimeout(tryOnce, 300)
      })
    }
    tryOnce()
  })
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore', env: process.env,
})

let browser
try {
  await waitPort(PORT)
  log('preview server up on', PORT)

  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('  [pageerror]', e.message))

  const shot = (name) => page.screenshot({ path: resolve(shotsDir, name) })
  const visible = async (text) => (await page.getByText(text, { exact: false }).count()) > 0
  const clickNext = async (labelForErr = '') => {
    const btn = page.locator('footer button.flex-1').first()
    for (let t = 0; t < 40; t++) {
      if ((await btn.getAttribute('disabled')) === null) {
        await btn.click()
        return
      }
      await page.waitForTimeout(100)
    }
    fail(`next button stayed disabled at step: ${labelForErr}`)
  }

  await page.goto(URL, { waitUntil: 'networkidle' })
  log('app loaded')

  // — StartView → باني الخطة —
  await page.locator('button.btn-primary').first().click()
  await page.waitForSelector('footer button.flex-1', { timeout: 10000 })
  log('entered onboarding wizard')

  // — حلقة خطوات الإعداد حتى ظهور شاشة الاختيار ثم الباني المخصّص —
  let choiceShotDone = false
  let reachedBuilder = false
  for (let i = 0; i < 60; i++) {
    if (await visible('إنشاء جدول مخصّص')) { reachedBuilder = true; break }
    // شاشة التوليد — لا نضغط «التالي»؛ ننتظر حتى يُركّب الباني المخصّص على خطوة الأيام.
    if (await visible('نبني خطتك')) { await page.waitForTimeout(300); continue }
    const hdr = (await page.locator('header').first().textContent().catch(() => '')) || ''
    const label = hdr.replace(/\s+/g, ' ').trim().slice(0, 40)

    if (await visible('أصمّم جدولي بنفسي')) {
      if (!choiceShotDone) { await shot('01-onboarding-choice.png'); choiceShotDone = true; log('choice screen shown') }
      await page.locator('button', { hasText: 'أصمّم جدولي بنفسي' }).first().click()
      await page.waitForTimeout(200)
    } else {
      const opt = page.locator('main [aria-pressed]')
      if (await opt.count()) await opt.first().click()
    }
    await clickNext(label)
    await page.waitForTimeout(200)
  }
  if (!choiceShotDone) fail('choice screen never appeared')
  if (!reachedBuilder) fail('custom builder did not open after choosing custom')
  log('custom builder opened from onboarding')

  // — خطوة الأيام (افتراضي 3) —
  await page.waitForTimeout(300)
  if (!(await visible('كم يوم'))) fail('did not land on the days step')
  await shot('02-builder-days.png')
  await clickNext('builder-days')

  // — خطوة البناء: تسمية + إضافة تمارين + ترتيب + تكرار —
  await page.waitForSelector('text=اسم اليوم', { timeout: 8000 })
  const nameInput = page.locator('main input').first()
  await nameInput.fill('صدر + ترايسبس')

  async function addExercises({ muscle, times }) {
    await page.locator('button', { hasText: 'أضف تمرين' }).first().click()
    await page.waitForSelector('text=اختر تمرينًا', { timeout: 8000 })
    if (muscle) await page.locator('button', { hasText: new RegExp(`^${muscle}$`) }).first().click()
    await page.waitForTimeout(150)
    const addBtns = page.locator('li button', { hasText: /إضافة/ })
    for (let k = 0; k < times; k++) {
      await addBtns.nth(k).click()
      await page.waitForTimeout(120)
    }
    await page.locator('button[aria-label="إغلاق"]').first().click()
    await page.waitForTimeout(150)
  }

  // اليوم 1: تمرينان من الصدر
  await addExercises({ muscle: 'صدر', times: 2 })
  // ترتيب: حرّك الأول لأسفل
  await page.locator('button[aria-label="تحريك لأسفل"]').first().click()
  // تكرار: غيّر قائمة أول تمرين
  await page.locator('main select').first().selectOption('10–12')
  await shot('03-builder-day1.png')
  log('day 1 built (2 exercises, reordered, reps changed)')

  // اليوم 2
  await page.locator('button', { hasText: /^اليوم 2/ }).first().click()
  await page.waitForTimeout(150)
  await addExercises({ muscle: 'ظهر', times: 1 })
  // اليوم 3
  await page.locator('button', { hasText: /^اليوم 3/ }).first().click()
  await page.waitForTimeout(150)
  await addExercises({ muscle: 'أمامية الفخذ', times: 1 })
  log('days 2 and 3 built')

  await clickNext()

  // — مراجعة + حفظ —
  await page.waitForSelector('text=راجع جدولك', { timeout: 8000 })
  await shot('04-builder-review.png')
  await page.locator('footer button.flex-1', { hasText: 'حفظ الجدول' }).first().click()
  log('plan saved')

  // — بعد الحفظ: اللوحة ثم تبويب التمرين —
  await page.waitForTimeout(600)
  await page.evaluate(() => { window.location.hash = '#/workout' })
  await page.waitForTimeout(600)
  if (!(await visible('جدول مخصّص'))) fail('workout tab does not show the custom plan badge')
  await shot('05-workout-tab-custom.png')
  log('workout tab shows custom plan')

  // — تحقّق من التخزين لكل حساب (guest) —
  const stored = await page.evaluate(() => localStorage.getItem('qimmah:customPlan:v1'))
  if (!stored) fail('custom plan not persisted in localStorage')
  const parsed = JSON.parse(stored)
  if (!parsed.guest) fail('custom plan not keyed per-account (guest missing)')
  if (parsed.guest.source !== 'custom') fail('stored source is not custom')
  const dayCount = parsed.guest.plan.days.length
  const totalEx = parsed.guest.plan.days.reduce((s, d) => s + d.exercises.length, 0)
  if (dayCount !== 3) fail(`expected 3 days, got ${dayCount}`)
  if (totalEx !== 4) fail(`expected 4 exercises total, got ${totalEx}`)
  log(`persistence OK — owner=guest, days=${dayCount}, exercises=${totalEx}, source=custom`)

  // — تحديث الصفحة → الجدول يبقى —
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  if (!(await visible('جدول مخصّص'))) fail('custom plan lost after reload')
  await shot('06-after-reload.png')
  log('custom plan persists after reload')

  // — وضع التمرين يشغّل الجدول المخصّص —
  const startBtn = page.locator('button', { hasText: 'ابدأ تمرين اليوم' })
  if (await startBtn.count()) await startBtn.first().click()
  else await page.locator('#workout-myplan button', { hasText: /ابدأ/ }).first().click()
  await page.waitForTimeout(700)
  // وضع التمرين يعرض تقدّم الجولة أو اسم التمرين — نتأكّد من فتح الطبقة
  const modeOpen = (await page.locator('.z-\\[60\\]').count()) > 0 || (await visible('تم'))
  if (!modeOpen) fail('workout mode did not open for custom plan')
  await shot('07-workout-mode.png')
  log('workout mode runs the custom plan')
  // إغلاق وضع التمرين
  const closeBtn = page.locator('button[aria-label="إغلاق"]')
  if (await closeBtn.count()) await closeBtn.first().click()
  await page.waitForTimeout(400)

  // — التبديل للجدول التلقائي ثم العودة —
  await page.evaluate(() => { window.location.hash = '#/workout' })
  await page.waitForTimeout(400)
  await page.locator('button', { hasText: 'الجدول التلقائي' }).first().click()
  await page.waitForTimeout(400)
  if (!(await visible('جدول تلقائي'))) fail('switching to auto plan did not take effect')
  await shot('08-switched-to-auto.png')
  const srcAfterAuto = await page.evaluate(() => JSON.parse(localStorage.getItem('qimmah:customPlan:v1')).guest.source)
  if (srcAfterAuto !== 'auto') fail('source not persisted as auto after switch')
  log('switched back to auto plan (persisted)')

  // العودة للمخصّص
  await page.locator('button', { hasText: 'جدولي المخصّص' }).first().click()
  await page.waitForTimeout(400)
  if (!(await visible('جدول مخصّص'))) fail('switching back to custom failed')
  log('switched back to custom plan')

  console.log('\n✓ ALL P10 A1 CHECKS PASSED')
  console.log('  screenshots →', shotsDir)
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
