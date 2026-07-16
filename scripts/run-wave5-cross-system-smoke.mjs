// Wave 5 coexistence proof: the five commissioned systems render and operate
// together against the real v2 surfaces with the canonical reviewer seed.
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5315
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/`
const OUT = 'docs/proof/wave5-cross-system'
const OWNER = 'wave5-reviewer-0000-0000-0000-000000000001'
const failures = []
const screenshot = async (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
const check = (condition, label) => {
  if (!condition) failures.push(label)
  else console.log(`✓ ${label}`)
}

mkdirSync(OUT, { recursive: true })
const seedSnippet = execFileSync(process.execPath, ['scripts/run-demo-seed.mjs', '--profile=reviewer', `--owner=${OWNER}`], { encoding: 'utf8' })
  .replace("  location.reload();\n})();", "})();")
const nowSec = Math.floor(Date.now() / 1000)
const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: OWNER, role: 'authenticated' })).toString('base64')}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: nowSec + 365 * 24 * 3600,
  refresh_token: 'wave5-proof-refresh',
  user: {
    id: OWNER, aud: 'authenticated', role: 'authenticated', email: 'wave5-proof@qimmah.app',
    email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z',
    user_metadata: { display_name: 'مراجع قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z',
  },
}
const initScript = `${seedSnippet}\nlocalStorage.setItem('qimmah:supabase-auth:v1', ${JSON.stringify(JSON.stringify(session))});\nlocalStorage.setItem('qimmah:lastUser:v1', ${JSON.stringify(OWNER)});`

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(BASE)).ok) return } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Wave 5 smoke server did not start')
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA', acceptDownloads: true })
  await context.addInitScript({ content: initScript })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  const open = async (surface) => {
    await page.goto(`${BASE}?surface=${surface}`, { waitUntil: 'domcontentloaded' })
    await page.locator('#root').waitFor()
    await page.waitForTimeout(500)
    const layout = await page.evaluate(() => ({ dir: document.documentElement.dir, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
    check(layout.dir === 'rtl', `${surface}: RTL root`)
    check(layout.overflow <= 1, `${surface}: no horizontal overflow`)
  }

  // 1) Notifications — commissioned settings surface, honest web state.
  await open('profile')
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await page.getByRole('button', { name: /^التذكيرات/ }).click()
  await page.getByRole('heading', { name: 'التذكيرات', level: 1 }).waitFor()
  check(await page.getByRole('switch', { name: /تفعيل التذكيرات/ }).count() === 1, 'notifications: semantic master switch renders')
  await screenshot(page, '01-notifications')

  // 2) Insights + Today lesson — both consumers of canonical history.
  await open('today')
  check(await page.getByText('رؤى الأسبوع', { exact: true }).count() > 0, 'insights: Today card renders')
  const lessonToggle = page.locator('section[aria-label="تعلّم"] button[aria-controls="today-learning-detail"]')
  await lessonToggle.click()
  check(await page.locator('#today-learning-detail').isVisible(), 'coach: Today lesson expands')
  await screenshot(page, '02-insights-today-lesson')
  await open('progress')
  check(await page.getByText('رؤى الأسبوع', { exact: true }).count() > 0, 'insights: Progress cards render')
  await screenshot(page, '03-insights-progress')

  // 3) Authored exercise cue + plate calculator + contextual rest tip.
  await open('workout')
  await page.locator('button.v2-pressable').first().click()
  await page.getByText('إشارات سريعة', { exact: true }).waitFor()
  const cues = await page.locator('ul li').allTextContents()
  const generic = ['تحكّم في الهبوط', 'مدى حركة كامل', 'زفير عند الدفع']
  check(cues.length >= 3 && JSON.stringify(cues.slice(0, 3)) !== JSON.stringify(generic), 'coach: authored exercise cues reach WorkoutV2')
  await screenshot(page, '04-coach-exercise-cues')

  await open('workout')
  await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
  await page.getByRole('button', { name: 'حاسبة الأقراص' }).click()
  check(await page.getByRole('group', { name: 'حاسبة الأقراص' }).count() === 1, 'strength: plate calculator opens in the set row')
  await screenshot(page, '05-plate-calculator')
  await page.getByRole('button', { name: 'أنهِ المجموعة' }).click()
  const restTip = page.locator('[data-coaching-rest-tip="true"]')
  check(await restTip.count() === 1 && (await restTip.innerText()).trim().length > 20, 'coach: contextual rest tip renders during rest')
  await screenshot(page, '06-coach-rest-tip')

  // 4) Portability — real browser download, preview, guarded apply, and completion.
  await open('profile')
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await page.getByRole('button', { name: /^تصدير واستيراد/ }).click()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /تصدير بياناتي/ }).click()
  const download = await downloadEvent
  const filePath = await download.path()
  check(Boolean(filePath), 'portability: JSON export downloads')
  if (filePath) {
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await page.getByRole('heading', { name: 'معاينة الاستيراد' }).waitFor()
    await page.getByRole('button', { name: 'تأكيد الاستيراد' }).click()
    await page.getByRole('heading', { name: 'تمّ الاستيراد' }).waitFor()
  }
  await screenshot(page, '07-portability-roundtrip')

  check(consoleErrors.length === 0, `all systems: zero console errors${consoleErrors.length ? ` (${consoleErrors.join(' | ')})` : ''}`)
  await context.close()
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

if (failures.length) {
  console.error(failures.map((failure) => `✗ ${failure}`).join('\n'))
  process.exit(1)
}
console.log(`\n✅ Wave 5 cross-system smoke passed — 7 screenshots in ${OUT}`)
