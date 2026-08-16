/**
 * لقطات مرشّح مراجعة المؤسس — من **التطبيق المبنيّ نفسه** لا من مشغّل معزول.
 *
 * لماذا على `dist` لا على `vite dev`: المؤسس سيفتح البناء، فاللقطة يجب أن تأتي
 * من نفس الشيء الذي سيراه — بحِزَمه الكسولة وتقسيمها وأصولها المُهشّمة.
 *
 * ═══ بوّابة أصالة الأرتيفكت (دفاع الأرتيفكت البائت) ═══
 * قبل أي لقطة يُقارَن وسم الهوية المحقون في `dist/index.html` برأس Git الحالي.
 * اختلافهما يوقف السكربت **باسمه** بدل أن ينتج أدلّة جميلة لبناء قديم — وهو
 * النمط الذي تكرّر في هذا المستودع (`--skip-build` فوق `dist` بائت يُختم برأس
 * جارٍ). لا يُقبل: FINAL_HEAD ≠ BUILT_ARTIFACT_HEAD.
 *
 * التشغيل: node scripts/e2e/founder-qa-shots.mjs
 */
import { spawn, execSync } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const outDir = resolve(root, 'docs/execution/qimmah-founder-qa/shots')
const PORT = 5352
const URL = process.env.PREVIEW_URL || `http://localhost:${PORT}`

// ── بوّابة الأصالة ───────────────────────────────────────────────────────────
const headSha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
const indexHtml = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const builtSha = (indexHtml.match(/name="qimmah-build"\s+content="[^·]*·([^"]+)"/) || [])[1]
if (!builtSha) {
  console.error('✗ artifact-identity-missing: لا وسم هوية في dist/index.html — ابنِ أولًا.')
  process.exit(1)
}
if (builtSha !== headSha) {
  console.error(`✗ stale-artifact: البناء من ${builtSha} والرأس ${headSha} — أعد البناء قبل التقاط الأدلّة.`)
  process.exit(1)
}
console.log(`✓ الأرتيفكت من الرأس الجاري (${headSha})`)

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

let problems = 0
const settle = (page, ms = 1600) => page.waitForTimeout(ms)
const startCta = (page) => page.locator('[data-testid="welcome-start-cta"]')
const overflows = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button')].find((b) => rx.test((b.textContent || '').trim()))
  if (el) el.click()
}, re.source)

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
async function waitForServer(ms = 30_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview did not start')
}

/** لقطة واحدة + فحصان فيزيائيان يرافقانها دائمًا (فيض أفقي · أخطاء صفحة). */
async function shoot(page, name, errs) {
  const overflow = await overflows(page)
  const file = resolve(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  const flags = [overflow ? '⚠ فيض أفقي' : '', errs.length ? `⚠ ${errs.length} خطأ صفحة: ${errs[0]}` : ''].filter(Boolean).join('  ')
  if (flags) problems += 1
  console.log(`${flags ? '✗' : '✓'} ${name.padEnd(34)}${flags ? `  ${flags}` : ''}`)
}

async function driveQuestions(page) {
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next); await settle(page, 1800)
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
  console.log(`\nلقطات مرشّح المؤسس — المحرّك: ${engineName}\n`)

  // ── ① الدخول: الهبوط عند المقاسات الثلاثة + الإنجليزية ──────────────────
  for (const { w, lang } of [{ w: 320, lang: 'ar' }, { w: 390, lang: 'ar' }, { w: 430, lang: 'ar' }, { w: 390, lang: 'en' }]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message)))
    await page.goto(URL, { waitUntil: 'networkidle' })
    await settle(page, 2200)
    if (lang === 'en') { await tap(page, /^EN$/); await settle(page, 1200) }
    await shoot(page, `01-welcome-${lang}-${w}`, errs)
    await ctx.close()
  }

  // ── ② الأسئلة ثم الكشف ثم المعاينة ثم اليوم — رحلة واحدة متصلة ─────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message)))
    await page.goto(URL, { waitUntil: 'networkidle' })
    await settle(page, 2200)

    await startCta(page).click({ force: true })
    await settle(page, 2000)
    await shoot(page, '02-first-question-ar-390', errs)

    await driveQuestions(page)
    await shoot(page, '03-reveal-ar-390', errs)

    // المعاينة تدخل التطبيق بلا حساب — هي الطريق الذي سيمشيه المؤسس.
    await page.locator('[data-testid="handoff-preview-cta"]').first().click({ force: true })
    await settle(page, 2600)
    await shoot(page, '04-today-after-preview-ar-390', errs)

    // «كيف نحسب أرقامك؟» — مدخلها من الرئيسية بعد إعادة التصميم.
    await page.evaluate(() => { location.hash = '#/calc' })
    await settle(page, 2200)
    await shoot(page, '05-calc-explainer-ar-390', errs)

    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  preview.kill('SIGTERM')
}

console.log(problems === 0
  ? '\n✅ كل لقطات مرشّح المؤسس التُقطت — بلا فيض أفقي ولا أخطاء صفحة'
  : `\n⚠️  ${problems} لقطة موسومة — راجع أعلاه`)
if (problems > 0) process.exitCode = 1
