import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5301
const BASE = `http://127.0.0.1:${PORT}`
const OUT = 'docs/proof/promotion'
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
for (let i = 0; i < 60; i += 1) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  await sleep(250)
  if (i === 59) throw new Error('promotion preview did not start')
}

const mockSession = (uid) => ({
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
  refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: `${uid}@qimmah.test`,
    email_confirmed_at: '2026-01-01T00:00:00.000Z', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
})

let browser
let failed = 0
try {
  browser = await chromium.launch({ headless: true })
  for (const profile of ['fresh', 'reviewer', 'veteran']) {
    const uid = `promotion-${profile}`
    const generated = spawnSync(process.execPath, ['scripts/run-demo-seed.mjs', `--profile=${profile}`, `--owner=${uid}`], { encoding: 'utf8' })
    if (generated.status !== 0) throw new Error(generated.stderr || `seed failed: ${profile}`)
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
    const page = await context.newPage()
    const errors = []
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.evaluate(({ session, snippet }) => {
      localStorage.clear()
      localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(session))
      // Seed generator is repository-owned deterministic development tooling.
      Function(snippet)()
    }, { session: mockSession(uid), snippet: generated.stdout })
    await page.waitForTimeout(2600)
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const dashboardText = await page.locator('body').innerText()
    const dashboardOk = dashboardText.includes('اليوم') || dashboardText.includes('يومك') || dashboardText.includes('أهلاً')
    for (const route of ['workout', 'nutrition', 'progress', 'profile']) {
      await page.goto(`${BASE}/#/${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(250)
      if ((await page.locator('#root').innerHTML()).length < 500) errors.push(`${route}: empty render`)
    }
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${profile}.png`, fullPage: true })
    const ok = dashboardOk && errors.length === 0
    console.log(`${ok ? '✅' : '❌'} ${profile}: dashboard + 4 routes, console errors=${errors.length}`)
    if (!ok) { console.error(errors.join(' | ')); failed += 1 }
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
if (failed) process.exit(1)
console.log(`✅ promotion smoke complete — fresh/reviewer/veteran, zero console errors`)
