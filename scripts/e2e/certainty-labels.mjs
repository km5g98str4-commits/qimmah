// إثبات متصفّح: تصنيف اليقين صادق ومقروء على الشاشة الحيّة. [WAVE-B]
//
// العطل المُصلَح: الشارة كانت تعرض `label.split('—')[0]` — الاسم وحده — والقيد
// («لم نجد له مرجعًا منشورًا») يعيش في `title=`، وهي سمة لا تظهر على اللمس.
// فوصل مستخدمَ الجوال «تقدير عملي من قِمّة» عاريةً فوق **أربعة صفوف ليست تقديرًا**:
// قراران سياسةُ منتج، وقاعدتان لهما مرجع منشور — إحداهما ثابت ٧٧٠٠ الذي يستشهد
// `calculators.ts` بمرجعه (Wishnofsky 1958, PMID 13594881) بالاسم.
//
// يُفحص هنا على الشاشة الحيّة لا على حاضنة: نقود ضيفًا خلال الأسئلة ثم ندخل
// «كيف نحسب أرقامك؟» ونقرأ ما يراه المستخدم فعلًا.
//
// التشغيل: npm run test:e2e:certainty   ·   E2E_ENGINE=webkit للمحرّك الثاني

import { spawn } from 'node:child_process'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const PORT = 5347
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
    try { if ((await fetch(URL)).ok) return } catch { /* لم يبدأ */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const settle = (page, ms = 1500) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

const AR = {
  badges: ['معادلة منشورة', 'قاعدة معروفة', 'اختيار داخل نطاق معتمد', 'تقدير من قِمّة', 'قرار من قِمّة'],
  estimate: 'تقدير من قِمّة',
  policy: 'قرار من قِمّة',
  rule: 'قاعدة معروفة',
  wishnofsky: 'Wishnofsky (1958)',
}
const EN = {
  badges: ['Published equation', 'Well-known rule', 'A choice within an established range', 'A Qimmah estimate', 'A Qimmah decision'],
  estimate: 'A Qimmah estimate',
  policy: 'A Qimmah decision',
  rule: 'Well-known rule',
  wishnofsky: 'Wishnofsky (1958)',
}

const preview = startPreview()
try {
  await waitForServer()
  const browser = await chromium.launch()
  console.log(`\nإثبات تصنيف اليقين بالمتصفّح — المحرّك: ${engineName}`)

  for (const width of [320, 390, 430]) {
    for (const lang of ['ar', 'en']) {
      const ar = lang === 'ar'
      const t = ar ? AR : EN
      const label = `${width}/${lang}`
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()

      // ——— قيادة ضيف حتى إكمال الخطة ———
      await page.goto(URL, { waitUntil: 'networkidle' })
      await settle(page, 2400)
      if (!ar) { await tap(page, /^EN$/); await settle(page, 1200) }
      await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
      await settle(page, 1600)
      await tap(page, ar ? /نبدأ/ : /Get started/i)
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
      await tap(page, ar ? /الدخول للوحة/ : /Enter|Open/i)
      await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
      await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
      await settle(page, 2000)

      // ——— شاشة «كيف نحسب أرقامك؟» ———
      await page.goto(`${URL}#/calc`, { waitUntil: 'networkidle' })
      await settle(page, 2400)
      const body = await page.evaluate(() => document.body.innerText)

      check(`[${label}] الشاشة وصلت`, body.length > 400, `طول=${body.length}`)

      // كل الشارات الخمس ظاهرة كما هي — بلا بتر
      for (const b of t.badges) {
        check(`[${label}] الشارة «${b}» تظهر كاملة`, body.includes(b))
      }

      // «تقدير من قِمّة» لم تعد مظلّة: مرة واحدة فقط على الشاشة كلها
      const estimateCount = body.split(t.estimate).length - 1
      check(`[${label}] التقدير ليس مظلّة (مرّة واحدة)`, estimateCount === 1, `عدد=${estimateCount}`)

      // القرارات والقواعد صارت مسمّاة بنفسها
      check(`[${label}] سياسة المنتج مسمّاة قرارًا`, (body.split(t.policy).length - 1) === 2, `عدد=${body.split(t.policy).length - 1}`)
      check(`[${label}] القواعد المنشورة مسمّاة قاعدة`, (body.split(t.rule).length - 1) === 2, `عدد=${body.split(t.rule).length - 1}`)

      // التناقض انتهى: الشاشة تسمّي مرجع ٧٧٠٠ بدل نفيه
      check(`[${label}] مرجع ٧٧٠٠ مذكور على الشاشة`, body.includes(t.wishnofsky))
      check(`[${label}] لا نفي لمرجع منشور فوق قاعدة لها مرجع`,
        !(body.includes(ar ? 'ما لقينا له مرجعًا منشورًا' : 'no published reference') && !body.includes(t.wishnofsky)))

      // الشرح مرئي فعلًا لا مخفيّ في title
      const noteVisible = await page.evaluate(() => {
        const ps = [...document.querySelectorAll('p')]
        return ps.some((p) => /قرار منّا لا نتيجة بحث|Our decision, not a research finding/.test(p.textContent || ''))
      })
      check(`[${label}] شرح الدرجة مرئي في المستند`, noteVisible)

      // لا شارة مبتورة بشرطة معلّقة، ولا فيض أفقي
      const dangling = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('span')]
        return spans.some((s) => /—\s*$/.test((s.textContent || '').trim()))
      })
      check(`[${label}] لا شارة تنتهي بشرطة معلّقة`, !dangling)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      check(`[${label}] لا فيض أفقي`, !overflow)

      await ctx.close()
    }
  }
  await browser.close()
} finally {
  if (preview) preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} تصنيف اليقين (${engineName}): ${pass} ناجحًا · ${fail} فاشلًا`)
if (fail > 0) { console.log('الفاشل:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1) }
