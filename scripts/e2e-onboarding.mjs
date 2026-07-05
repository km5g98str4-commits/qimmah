// اختبار e2e (P0) — يمنع تكرار «قفل الإعداد»: مستخدم جديد ← معالج الإعداد ← اللوحة.
// يُثبت أنّ حقل الاسم يستقبل الكتابة، وزرّ «التالي» يتقدّم بالخطوة، وأنّ مخرج الطوارئ
// «تخطّي» يوصل اللوحة دائمًا، وأنّ إعادة التحميل لا تُعيد الحبس. يعمل على كل بناء.
//
// التشغيل:  npm run build && node scripts/e2e-onboarding.mjs
// يبني بيئته بنفسه (vite preview) ويطبع PASS/FAIL ويُرجع رمز خروج مناسبًا للـ CI.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4319
// PREVIEW_URL يتخطّى تشغيل الخادم داخليًا (لبيئات CI/الرمل التي تمنع إنشاء خادم متفرّع):
// شغّل `vite preview` بنفسك ثم مرّر PREVIEW_URL=http://localhost:4173 node scripts/e2e-onboarding.mjs
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

function startPreview() {
  if (EXTERNAL) return null // خادم خارجي جاهز — لا نُشغّل ولا نُنهي شيئًا
  return spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: process.env,
  })
}

async function waitForServer(ms = 20000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(URL)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.goto(`${URL}/#/setup`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600) // انتظار زوال الشاشة الافتتاحية (~2.15ث)

  const nameInput = page.locator('input[type="text"]').first()
  check('setup wizard renders (name input present)', await nameInput.isVisible().catch(() => false))

  const counterBefore = (await page.locator('body').innerText()).match(/\d+\/\d+/)?.[0] ?? null

  await nameInput.fill('Ziyad E2E').catch(() => {})
  const typed = await nameInput.inputValue().catch(() => '')
  check('name input accepts keyboard input', typed === 'Ziyad E2E', `value="${typed}"`)

  await page.getByRole('button', { name: /التالي|Next/ }).first().click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(400)
  const counterAfter = (await page.locator('body').innerText()).match(/\d+\/\d+/)?.[0] ?? null
  check('Next advances the step', counterBefore && counterAfter && counterBefore !== counterAfter, `${counterBefore} → ${counterAfter}`)

  await page.getByRole('button', { name: /تخطّي الإعداد والدخول للوحة|Skip setup and go to dashboard/ }).first().click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const inWizardAfterSkip = /\/\s*18\b/.test(await page.locator('body').innerText())
  check('Skip escape reaches the dashboard (never trapped)', !inWizardAfterSkip && page.url().includes('/dashboard'), page.url())

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  const inWizardAfterReload = /\/\s*18\b/.test(await page.locator('body').innerText())
  check('reload does not re-trap in the wizard', !inWizardAfterReload, page.url())
} catch (e) {
  check('e2e harness ran', false, e.message)
} finally {
  await browser?.close()
  preview?.kill('SIGKILL')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — onboarding e2e`)
process.exit(failed.length ? 1 : 0)
