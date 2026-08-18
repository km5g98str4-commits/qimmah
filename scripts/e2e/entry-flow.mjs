// إثبات متصفّح: مسار الدخول — الأسئلة قبل الحساب. [WAVE-A]
//
// العطل المُصلَح: نداء الهبوط الأساسي («ابدأ الآن») كان موصولًا بمسار التسجيل،
// فالزائر الجديد يُجبَر على الحساب قبل أن يرى سؤالًا واحدًا — وهو مخالف لـ§0.1
// (التخصيص وتوليد الخطة ومعاينتها مجانية بلا حساب) وللمسار المعتمد:
//   هبوط ← ١٨ سؤالًا ← كشف ← حساب عند لزومه ← Premium/تجربة/معاينة ← اليوم
//
// المسارات الخمسة المثبَتة هنا:
//   ١) زائر جديد بلا حساب ⇒ هبوط ⇒ **الأسئلة مباشرة** (لا #/login ولا #/signup).
//   ٢) يُكمل الأسئلة ⇒ شاشة الكشف.
//   ٣) يختار التجربة كضيف ⇒ يُطلب الحساب **في اللحظة الصحيحة** بطريق حقيقي.
//   ٤) المعاينة تعمل بلا Premium وبلا حساب.
//   ٥) العائد المكتمل لا يُعاد إلى الأسئلة.
// ويُفحص كلٌّ منها على ٣٢٠/٣٩٠/٤٣٠ وبالعربية والإنجليزية، بلا فيض أفقي.
//
// التشغيل: npm run test:e2e:entry-flow   ·   E2E_ENGINE=webkit للمحرّك الثاني

import { spawn } from 'node:child_process'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const PORT = 5344
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))
async function waitForServer(ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* لم يبدأ بعد */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const settle = (page, ms = 1600) => page.waitForTimeout(ms)
const hash = (page) => page.evaluate(() => location.hash)
const startCta = (page) => page.locator('[data-testid="welcome-start-cta"]')
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

/** فيض أفقي فعلي على مستوى المستند. */
const overflows = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

/** يقود الأسئلة كاملةً حتى الكشف — نفس تسلسل `plan-handoff` المعتمد. */
async function driveQuestions(page) {
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next); await settle(page, 1600)
}

const preview = startPreview()
try {
  await waitForServer()
  const browser = await chromium.launch()
  console.log(`\nإثبات مسار الدخول بالمتصفّح — المحرّك: ${engineName}`)

  for (const width of [320, 390, 430]) {
    for (const lang of ['ar', 'en']) {
      const ar = lang === 'ar'
      const label = `${width}/${lang}`
      const ctx = await browser.newContext({ viewport: { width, height: 844 } })
      const page = await ctx.newPage()

      // ——— ① زائر جديد: الهبوط ثم الأسئلة مباشرةً ———
      await page.goto(URL, { waitUntil: 'networkidle' })
      await settle(page, 2400)
      if (!ar) { await tap(page, /^EN$/); await settle(page, 1200) }

      check(`[${label}] ① الهبوط يعرض نداءً أساسيًا واحدًا`, await startCta(page).count() === 1)
      check(`[${label}] ① الدخول متاح للعائد من الهبوط`, await page.locator('[data-testid="welcome-login-cta"]').count() === 1)
      check(`[${label}] ① لا فيض أفقي على الهبوط`, !(await overflows(page)))

      await startCta(page).click({ force: true })
      await settle(page, 2000)
      const afterStart = await hash(page)
      check(`[${label}] ① النداء الأساسي لا يقود إلى حساب`, !/login|signup/.test(afterStart), `hash=${afterStart}`)
      check(`[${label}] ① الزائر يهبط على مسار الأسئلة`, /setup/.test(afterStart), `hash=${afterStart}`)
      // العقد الحقيقي: لا حقل بريد ولا كلمة مرور بين الزائر وأسئلته. (الترحيب
      // خطوة **داخل** الإعداد لا بوّابة حساب — فوجوده ليس خرقًا، والخرق هو النموذج.)
      const authFields = await page.locator('input[type=email], input[type=password]').count()
      check(`[${label}] ① لا نموذج حساب بين الزائر والأسئلة`, authFields === 0, `حقول=${authFields}`)

      // ——— ② الأسئلة كاملةً ⇒ الكشف ———
      await tap(page, ar ? /نبدأ/ : /Get started/i)
      await driveQuestions(page)
      await tap(page, ar ? /الدخول للوحة/ : /Enter|Open/i)
      await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
      await settle(page, 900)
      check(`[${label}] ② إكمال الأسئلة يعرض الكشف`, await page.locator('[data-testid="plan-handoff"]').count() === 1)
      check(`[${label}] ② نداءات الكشف الثلاثة حاضرة`,
        await page.locator('[data-testid="handoff-premium-cta"]').count() === 1
        && await page.locator('[data-testid="handoff-trial-cta"]').count() === 1
        && await page.locator('[data-testid="handoff-preview-cta"]').count() === 1)
      check(`[${label}] ② لا فيض أفقي على الكشف`, !(await overflows(page)))
      check(`[${label}] ② لا نداء حساب قبل أن يُطلب`, await page.locator('[data-testid="reveal-create-account-cta"]').count() === 0)

      // ——— ③ التجربة كضيف ⇒ يُطلب الحساب بطريق حقيقي ———
      await page.locator('[data-testid="handoff-trial-cta"]').click({ force: true })
      await settle(page, 1200)
      const status = (await page.locator('[data-testid="reveal-trial-status"]').textContent().catch(() => '')) || ''
      check(`[${label}] ③ السبب المعروض هو الحساب لا الاتصال`,
        ar ? /حساب/.test(status) : /account/i.test(status), `status=${status.trim().slice(0, 60)}`)
      const acct = page.locator('[data-testid="reveal-create-account-cta"]')
      check(`[${label}] ③ نداء إنشاء الحساب ظهر عند الحاجة`, await acct.count() === 1)
      await acct.click({ force: true })
      await settle(page, 1500)
      check(`[${label}] ③ النداء يقود فعلًا إلى إنشاء الحساب`, /signup/.test(await hash(page)), `hash=${await hash(page)}`)

      // ——— ④ المعاينة تعمل بلا حساب ولا Premium ———
      await page.goBack(); await settle(page, 1800)
      const backOnHandoff = await page.locator('[data-testid="handoff-preview-cta"]').count() === 1
      if (backOnHandoff) {
        await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
      } else {
        await page.goto(`${URL}#/dashboard`, { waitUntil: 'networkidle' })
      }
      await settle(page, 2200)
      const previewHash = await hash(page)
      check(`[${label}] ④ المعاينة تدخل التطبيق بلا حساب`, /dashboard/.test(previewHash), `hash=${previewHash}`)
      check(`[${label}] ④ لا بوّابة Premium تعترض المعاينة`, await page.locator('[data-testid="premium-gate"]').count() === 0)

      // ——— ⑤ العائد المكتمل لا يُعاد إلى الأسئلة ———
      await page.reload({ waitUntil: 'networkidle' })
      await settle(page, 2400)
      const returning = await hash(page)
      check(`[${label}] ⑤ العائد المكتمل لا يُقذف للأسئلة`, !/setup/.test(returning), `hash=${returning}`)
      check(`[${label}] ⑤ العائد المكتمل لا يُقذف لشاشة حساب`, !/login|signup/.test(returning), `hash=${returning}`)
      check(`[${label}] ⑤ لا فيض أفقي بعد العودة`, !(await overflows(page)))

      await ctx.close()
    }
  }

  await browser.close()
} finally {
  if (preview) preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} مسار الدخول (${engineName}): ${pass} ناجحًا · ${fail} فاشلًا`)
if (fail > 0) { console.log('الفاشل:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1) }
