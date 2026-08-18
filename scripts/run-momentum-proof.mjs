import { chromium } from './e2e/lib/engine.mjs'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 5198
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/`
const OUT = 'docs/proof/design-v21-momentum/screenshots'
const surfaces = ['welcome', 'onboarding', 'today', 'nutrition', 'progress', 'profile', 'workout', 'summary']
const widths = [320, 768, 1280]
const heights = { 320: 720, 768: 1024, 1280: 900 }
const failures = []

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  detached: true,
  stdio: 'ignore',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // Vite is still starting.
    }
    await sleep(250)
  }
  throw new Error('visual proof server did not start')
}

async function openSurface(page, surface) {
  await page.goto(`${BASE}?surface=${surface}`, { waitUntil: 'networkidle' })
  if (surface === 'workout') {
    await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
    await page.waitForTimeout(150)
  }
  if (surface === 'summary') {
    await page.getByRole('button', { name: /تنشيف/ }).click()
    await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page.getByRole('button', { name: 'التالي' }).click()
    const choices = page.locator('fieldset button')
    await choices.nth(0).click()
    await choices.nth(3).click()
    await page.getByRole('button', { name: 'اعتمد خطتي' }).click()
    await page.getByRole('heading', { name: 'خطتك جاهزة' }).waitFor()
  }
}

async function answerOnboarding(page) {
  await page.getByRole('button', { name: /تنشيف/ }).click()
  await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.getByRole('button', { name: 'نادي', exact: true }).click()
  await page.getByRole('button', { name: 'مزيج', exact: true }).click()
  await page.getByRole('button', { name: 'اعتمد خطتي' }).click()
  await page.getByRole('heading', { name: 'خطتك جاهزة' }).waitFor()
}

async function openProfilePrivacy(page) {
  await openSurface(page, 'profile')
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await page.getByRole('button', { name: /^الخصوصية والبيانات/ }).click()
  await page.getByRole('heading', { name: 'الخصوصية والبيانات' }).waitFor()
}

async function openProfileNotifications(page) {
  await openSurface(page, 'profile')
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await page.getByRole('button', { name: /^التذكيرات/ }).click()
  await page.getByRole('heading', { name: 'التذكيرات', level: 2 }).waitFor()
}

function ratio(lighter, darker) {
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255)
  const [r, g, b] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const pairs = [
  ['Strong ink / cream', '#0E0D0A', '#F1EEE8', 4.5],
  ['Secondary ink / cream', '#2A251E', '#F1EEE8', 4.5],
  ['Muted ink / cream', '#625F5A', '#F1EEE8', 4.5],
  ['Faint ink / cream', '#726B62', '#F1EEE8', 4.5],
  ['Dark strong / dark canvas', '#F1EEE8', '#16140F', 4.5],
  ['Dark muted / dark canvas', '#C5BFB5', '#16140F', 4.5],
  ['Blue text / white', '#245FC5', '#FFFFFF', 4.5],
  ['Green text / white', '#157F46', '#FFFFFF', 4.5],
  ['Teal text / white', '#0E8578', '#FFFFFF', 4.5],
  ['Error / white', '#E11D2E', '#FFFFFF', 4.5],
  ['White large CTA / Ember', '#FFFFFF', '#F0512A', 3],
]

await mkdir(OUT, { recursive: true })
let browser
try {
  await waitForServer()
  browser = await chromium.launch()
  for (const width of widths) {
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport: { width, height: heights[width] }, locale: 'ar-SA' })
      const page = await context.newPage()
      const consoleErrors = []
      page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
      page.on('pageerror', (error) => consoleErrors.push(String(error)))
      await openSurface(page, surface)
      await page.waitForTimeout(700)
      const audit = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }))
      if (audit.dir !== 'rtl') failures.push(`${surface}-${width}: dir=${audit.dir}`)
      if (audit.overflow > 1) failures.push(`${surface}-${width}: horizontal overflow ${audit.overflow}px`)
      if (consoleErrors.length) failures.push(`${surface}-${width}: console ${consoleErrors.join(' | ')}`)
      await page.screenshot({ path: `${OUT}/${surface}-${width}.png`, fullPage: true })
      await context.close()
    }
  }

  // PDPL access right: the privacy sub-screen is a real, accessible export
  // surface at every approved breakpoint, not a disabled “coming later” row.
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: heights[width] }, locale: 'ar-SA', acceptDownloads: true })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(String(error)))
    await openProfilePrivacy(page)
    await page.waitForTimeout(700)
    const audit = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }))
    if (audit.dir !== 'rtl') failures.push(`privacy-${width}: dir=${audit.dir}`)
    if (audit.overflow > 1) failures.push(`privacy-${width}: horizontal overflow ${audit.overflow}px`)
    if (consoleErrors.length) failures.push(`privacy-${width}: console ${consoleErrors.join(' | ')}`)
    await page.screenshot({ path: `${OUT}/privacy-${width}.png`, fullPage: true })
    await context.close()
  }

  // Notification settings: unsupported web state remains honest, labelled,
  // keyboard-semantic, and overflow-free; native behavior is proven separately.
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: heights[width] }, locale: 'ar-SA' })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(String(error)))
    await openProfileNotifications(page)
    await page.waitForTimeout(700)
    const audit = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }))
    if (audit.dir !== 'rtl') failures.push(`notifications-${width}: dir=${audit.dir}`)
    if (audit.overflow > 1) failures.push(`notifications-${width}: horizontal overflow ${audit.overflow}px`)
    if (consoleErrors.length) failures.push(`notifications-${width}: console ${consoleErrors.join(' | ')}`)
    const master = page.getByRole('switch', { name: /تفعيل تذكيرات قِمّة/ })
    if (!(await master.isDisabled())) failures.push(`notifications-${width}: web master switch should be honestly disabled`)
    if (!(await page.getByText(/متاحة داخل تطبيق قِمّة على iPhone/).count())) failures.push(`notifications-${width}: missing unsupported explanation`)
    await page.screenshot({ path: `${OUT}/notifications-${width}.png`, fullPage: true })
    await context.close()
  }

  // Owner mismatch must fail with icon + text; a matching guest scope then
  // downloads a schema-labelled file without auth/sync material.
  const exportContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA', acceptDownloads: true })
  const exportPage = await exportContext.newPage()
  await openProfilePrivacy(exportPage)
  await exportPage.evaluate(() => {
    localStorage.setItem('qimmah:lastUser:v1', 'someone-else')
    localStorage.setItem('qimmah:supabase-auth:v1', 'BROWSER_AUTH_SECRET')
    localStorage.setItem('qimmah:syncQueue:v1:guest', 'BROWSER_QUEUE_SECRET')
  })
  const exportButton = exportPage.getByRole('button', { name: /تنزيل نسخة من بياناتي/ })
  await exportButton.click()
  const exportAlert = exportPage.getByRole('alert')
  await exportAlert.waitFor()
  if (!(await exportAlert.locator('svg').count())) failures.push('privacy export error lacks icon + text')
  await exportPage.evaluate(() => localStorage.setItem('qimmah:lastUser:v1', 'guest'))
  const downloadPromise = exportPage.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  const exportJson = downloadPath ? await readFile(downloadPath, 'utf8') : ''
  const exportBundle = exportJson ? JSON.parse(exportJson) : null
  if (download.suggestedFilename() !== `qimmah-data-${new Date().toISOString().slice(0, 10)}.json`) failures.push(`privacy export filename = ${download.suggestedFilename()}`)
  if (exportBundle?.format !== 'qimmah-data-export' || exportBundle?.schemaVersion !== 1) failures.push('privacy export format/schema invalid')
  if (exportJson.includes('BROWSER_AUTH_SECRET') || exportJson.includes('BROWSER_QUEUE_SECRET')) failures.push('privacy export leaked auth/sync material')
  await exportPage.getByRole('status').waitFor()
  await exportContext.close()

  // Today hierarchy: coaching supports the command center without displacing
  // its hero. The lesson is compact by default and expands accessibly.
  const todayContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const todayPage = await todayContext.newPage()
  await openSurface(todayPage, 'today')
  if ((await todayPage.getByText('رؤى الأسبوع', { exact: true }).count()) === 0) failures.push('today weekly insight card is missing')
  const lessonToggle = todayPage.locator('section[aria-label="تعلّم"] button[aria-controls="today-learning-detail"]')
  await lessonToggle.waitFor()
  if ((await lessonToggle.getAttribute('aria-expanded')) !== 'false') failures.push('today lesson is not collapsed by default')
  if (!(await todayPage.locator('#today-learning-detail').isHidden())) failures.push('today lesson body displaces the command center')
  await lessonToggle.click()
  if ((await lessonToggle.getAttribute('aria-expanded')) !== 'true') failures.push('today lesson aria-expanded did not update')
  if (!(await todayPage.locator('#today-learning-detail').isVisible())) failures.push('today lesson did not expand')
  await todayContext.close()

  // PDF §05 action proof: the ember weight CTA must write through the canonical
  // history path and immediately redraw the detail — never route to itself.
  const progressContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const progressPage = await progressContext.newPage()
  await openSurface(progressPage, 'progress')
  if ((await progressPage.getByText('رؤى الأسبوع', { exact: true }).count()) === 0) failures.push('progress weekly insights are missing')
  await progressPage.getByRole('button', { name: /الوزن والجسم/ }).click()
  await progressPage.getByRole('button', { name: 'تسجيل وزن اليوم' }).click()
  await progressPage.getByLabel('الوزن').fill('')
  await progressPage.getByRole('button', { name: 'احفظ القياسات' }).click()
  await progressPage.getByRole('alert').waitFor()
  await progressPage.getByLabel('الوزن').fill('80.7')
  await progressPage.getByLabel('محيط الخصر').fill('86')
  await progressPage.getByRole('button', { name: 'احفظ القياسات' }).click()
  await progressPage.getByRole('heading', { name: 'الوزن والجسم' }).waitFor()
  const savedMeasurement = await progressPage.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem('qimmah:history:measurementLogs:v1') || '[]')
    return rows[0]?.values?.weightKg
  })
  if (savedMeasurement !== 80.7) failures.push(`progress canonical measurement write = ${savedMeasurement}`)
  await progressContext.close()

  const reduced = await browser.newContext({ viewport: { width: 320, height: 720 }, reducedMotion: 'reduce', locale: 'ar-SA' })
  const reducedPage = await reduced.newPage()
  await openSurface(reducedPage, 'today')
  const motion = await reducedPage.evaluate(() => {
    const selectors = ['.v2-screen-enter', '.v2-pressable', '.v2-fill', '.v2-earned-moment']
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => {
      const style = getComputedStyle(node)
      return { selector, animation: style.animationDuration, transition: style.transitionDuration }
    }))
  })
  const tooSlow = motion.filter(({ animation, transition }) => {
    const duration = (value) => Math.max(...value.split(',').map((part) => parseFloat(part) * (part.includes('ms') ? 1 : 1000)))
    return duration(animation) > 1 || duration(transition) > 1
  })
  if (tooSlow.length) failures.push(`reduced motion durations: ${JSON.stringify(tooSlow)}`)
  await reduced.close()

  // Async smoke: exercise the observable building state, then a forced failure
  // and successful retry. These switches exist only in the DEV proof seam.
  const asyncContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const asyncPage = await asyncContext.newPage()
  await asyncPage.goto(`${BASE}?surface=summary`, { waitUntil: 'networkidle' })
  await answerOnboarding(asyncPage)
  await asyncPage.evaluate(() => localStorage.setItem('qimmah:onboarding:force-fail', 'hang'))
  await asyncPage.getByRole('button', { name: 'الدخول للوحة' }).click()
  await asyncPage.getByRole('heading', { name: 'يتم إعداد خطتك' }).waitFor()
  await asyncContext.close()

  const retryContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const retryPage = await retryContext.newPage()
  await retryPage.goto(`${BASE}?surface=summary`, { waitUntil: 'networkidle' })
  await answerOnboarding(retryPage)
  await retryPage.evaluate(() => localStorage.setItem('qimmah:onboarding:force-fail', '1'))
  await retryPage.getByRole('button', { name: 'الدخول للوحة' }).click()
  await retryPage.getByRole('heading', { name: 'تعذّر إعداد الخطة' }).waitFor()
  await retryPage.evaluate(() => localStorage.removeItem('qimmah:onboarding:force-fail'))
  await retryPage.getByRole('button', { name: 'أعد المحاولة' }).click()
  await retryPage.getByRole('heading', { name: 'تعذّر إعداد الخطة' }).waitFor({ state: 'hidden' })
  await retryContext.close()

  const contrastRows = pairs.map(([label, fg, bg, minimum]) => {
    const l1 = luminance(fg)
    const l2 = luminance(bg)
    const value = ratio(Math.max(l1, l2), Math.min(l1, l2))
    if (value + 0.001 < minimum) failures.push(`${label}: ${value.toFixed(2)} < ${minimum}`)
    return `| ${label} | \`${fg}\` | \`${bg}\` | ${value.toFixed(2)}:1 | ${minimum}:1 | ${value >= minimum ? 'Pass' : 'Fail'} |`
  })
  await writeFile(
    'docs/proof/design-v21-momentum/contrast.md',
    `# Momentum contrast proof\n\nWCAG 2.2 AA contrast pairs used across the recolored v2 surfaces. The Ember CTA is 19px bold, so the 3:1 large-text threshold applies. Errors always include an icon and text.\n\n| Role | Foreground | Background | Ratio | AA minimum | Result |\n|---|---:|---:|---:|---:|---|\n${contrastRows.join('\n')}\n`,
  )
} finally {
  if (browser) await browser.close()
  try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(`PASS ${surfaces.length * widths.length + widths.length * 2} RTL screenshots, zero console errors, no horizontal overflow`)
  console.log('PASS reduced-motion fallbacks and WCAG AA token contrast')
}
