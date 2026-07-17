import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'

const base = process.env.AUDIT_BASE || 'http://127.0.0.1:4327'
const evidence = new URL('./evidence/', import.meta.url)
const uid = 'audit-owner-a'
const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
  refresh_token: 'mock-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer',
  user: { id: uid, email: 'audit-a@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
}
const checks = []
const check = (id, ok, detail = '') => checks.push({ id, ok, detail })
const browser = await chromium.launch()
try {
  // Public/App Review surfaces.
  const publicPage = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  await publicPage.goto(base, { waitUntil: 'domcontentloaded' })
  await publicPage.waitForTimeout(2800)
  const welcome = await publicPage.locator('body').innerText()
  check('welcome-rendered', welcome.includes('قِمّة'), welcome.slice(0, 120))
  check('no-pwa-banner-web-flagless', !/تثبيت|Install app/i.test(welcome), welcome.slice(0, 180))
  for (const path of ['/legal/privacy.html', '/legal/terms.html']) {
    const response = await publicPage.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    const text = await publicPage.locator('body').innerText()
    check(`legal-${path}`, response?.ok() === true && text.length > 200, `status=${response?.status()} chars=${text.length}`)
  }
  await publicPage.goto(`${base}/#/reset`, { waitUntil: 'domcontentloaded' })
  await publicPage.waitForTimeout(2800)
  check('reset-route-content', (await publicPage.locator('body').innerText()).length > 40)
  await publicPage.screenshot({ path: new URL('./evidence/reset-public.png', import.meta.url).pathname, fullPage: true })
  await publicPage.close()

  // Authenticated old Settings importer is an exposed, separate path from ProfileV2's hardened importer.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const dialogs = []
  page.on('dialog', async dialog => { dialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.accept() })
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  const seed = await readFile(new URL('./evidence/seed-fresh.js', import.meta.url), 'utf8')
  await page.evaluate(({ session, seed }) => {
    localStorage.clear(); localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(session))
    Function(seed.replace(/location\.reload\(\);?/, ''))()
  }, { session, seed })
  await page.goto(`${base}/#/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  const file = page.locator('input[type=file]').first()
  check('settings-import-exposed', await file.count() === 1)

  const cases = [
    { id: 'malformed', body: '{bad json' },
    { id: 'wrong-version', body: JSON.stringify({ version: 999, profile: { name: 'WRONG_VERSION_ACCEPTED' } }) },
    { id: 'cross-uid', body: JSON.stringify({ version: 1, customization: { profile: { name: 'OWNER_B_INJECTED' } }, ownerId: 'owner-b' }) },
    { id: 'oversized', body: JSON.stringify({ version: 1, customization: { profile: { name: 'OVERSIZED_ACCEPTED', padding: 'x'.repeat(10.5 * 1024 * 1024) } } }) },
  ]
  for (const item of cases) {
    dialogs.length = 0
    await file.setInputFiles({ name: `${item.id}.json`, mimeType: 'application/json', buffer: Buffer.from(item.body) })
    await page.waitForTimeout(350)
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('qimmah:customization:v1') || '{}').profile || {})
    check(`hostile-${item.id}`, dialogs.some(d => /تعذّر|خطأ|غير صالح/.test(d.message)), JSON.stringify({ dialogs, profileName: profile.name }))
  }

  // React escaping proof through a free-text profile field.
  await page.evaluate(() => {
    window.__qimmahXss = 0
    const current = JSON.parse(localStorage.getItem('qimmah:customization:v1') || '{}')
    current.profile = { ...(current.profile || {}), name: '<img src=x onerror="window.__qimmahXss=1">' }
    localStorage.setItem('qimmah:customization:v1', JSON.stringify(current))
  })
  await page.goto(`${base}/#/profile`, { waitUntil: 'networkidle' })
  check('xss-profile-name-escaped', await page.evaluate(() => window.__qimmahXss === 0 && !document.querySelector('img[src="x"]')))

  // Genuine network kill/reload after the production service worker has had time to register/cache.
  await page.goto(`${base}/#/workout`, { waitUntil: 'networkidle' })
  const swReady = await page.evaluate(() => Promise.race([
    navigator.serviceWorker?.ready.then(() => true) ?? Promise.resolve(false),
    new Promise(resolve => setTimeout(() => resolve(false), 5000)),
  ]))
  check('service-worker-ready-in-audit-build', swReady, 'custom docs/audit outDir cannot be post-processed by the hard-coded dist/sw.js build hook')
  await page.waitForTimeout(500)
  const before = (await page.locator('#root').innerHTML()).length
  await context.setOffline(true)
  let offlineLength = 0
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 })
    offlineLength = (await page.locator('#root').innerHTML()).length
  } catch (error) {
    check('offline-kill-reload', false, String(error))
  }
  if (!checks.some(c => c.id === 'offline-kill-reload')) check('offline-kill-reload', offlineLength > 500, `before=${before} offline=${offlineLength}`)
  await context.setOffline(false)
  await page.screenshot({ path: new URL('./evidence/settings-after-hostile-import.png', import.meta.url).pathname, fullPage: true })
  await context.close()
} finally {
  await browser.close()
}

const failures = checks.filter(c => !c.ok)
await writeFile(new URL('./evidence/targeted-results.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), checks, failures }, null, 2))
console.log(`${checks.length - failures.length}/${checks.length} checks passed; failures=${failures.length}`)
for (const f of failures) console.log(`FAIL ${f.id}: ${f.detail}`)
process.exitCode = failures.length ? 1 : 0
