import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const base = process.env.AUDIT_BASE || 'http://127.0.0.1:4327'
const out = new URL('./evidence/', import.meta.url)
await mkdir(out, { recursive: true })
const profiles = ['fresh', 'reviewer', 'veteran']
const viewports = [
  { name: 'mobile-320', width: 320, height: 720 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
]
const routes = ['dashboard', 'workout', 'nutrition', 'progress', 'profile', 'settings', 'insights', 'privacy', 'terms', 'reset']
const uid = 'audit-owner-a'
const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
  refresh_token: 'mock-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer',
  user: { id: uid, email: 'audit-a@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
}
const results = []
const failures = []
const add = (profile, check, ok, detail = '') => {
  results.push({ profile, check, ok, detail })
  if (!ok) failures.push({ profile, check, detail })
}

const browser = await chromium.launch()
try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA', reducedMotion: 'reduce' })
    const page = await context.newPage()
    const consoleErrors = []
    const consoleSecrets = []
    page.on('console', message => {
      const text = message.text()
      if (message.type() === 'error') consoleErrors.push(text)
      if (/audit-redacted-token|audit-redacted-refresh|eyJ[A-Za-z0-9_-]{10}/.test(text)) consoleSecrets.push(text)
    })
    page.on('pageerror', error => consoleErrors.push(String(error)))
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    const snippet = await readFile(new URL(`./evidence/seed-${profile}.js`, import.meta.url), 'utf8')
    await page.evaluate(({ session, snippet }) => {
      localStorage.clear()
      localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(session))
      // Strip the terminal reload: navigation below performs the reload deterministically.
      Function(snippet.replace(/location\.reload\(\);?/, ''))()
    }, { session, snippet })
    await page.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2600)
    add(profile, 'authenticated shell renders', (await page.locator('#root').innerHTML()).length > 500)

    for (const route of routes) {
      await page.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' })
      const rootLength = (await page.locator('#root').innerHTML()).length
      add(profile, `route #/${route} renders`, rootLength > 200, `root=${rootLength}`)
    }
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      for (const route of ['dashboard', 'workout', 'nutrition', 'progress', 'profile', 'settings']) {
        await page.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' })
        const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
        add(profile, `${viewport.name} #/${route} no overflow`, dimensions.scrollWidth <= dimensions.innerWidth, JSON.stringify(dimensions))
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: new URL(`./evidence/${profile}-dashboard.png`, import.meta.url).pathname, fullPage: true })
    const semantic = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      unnamedButtons: [...document.querySelectorAll('button')].filter(el => !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title')).length,
      positiveTabindex: document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length,
      imagesMissingAlt: [...document.querySelectorAll('img')].filter(img => !img.hasAttribute('alt')).length,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName),
    }))
    add(profile, 'RTL document root', semantic.dir === 'rtl', JSON.stringify(semantic))
    add(profile, 'document language Arabic', semantic.lang.startsWith('ar'), semantic.lang)
    add(profile, 'no unnamed buttons on dashboard', semantic.unnamedButtons === 0, String(semantic.unnamedButtons))
    add(profile, 'no positive tabindex', semantic.positiveTabindex === 0, String(semantic.positiveTabindex))
    add(profile, 'images carry alt attribute', semantic.imagesMissingAlt === 0, String(semantic.imagesMissingAlt))
    add(profile, 'no console secrets', consoleSecrets.length === 0, consoleSecrets.join(' | '))
    add(profile, 'zero console/page errors', consoleErrors.length === 0, consoleErrors.join(' | '))

    // Corrupt every Qimmah-owned key one at a time and verify the shell survives.
    const ownerKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('qimmah:') && !k.includes('supabase-auth')))
    for (const key of ownerKeys) {
      const original = await page.evaluate(k => localStorage.getItem(k), key)
      await page.evaluate(k => localStorage.setItem(k, '{bad-json'), key)
      await page.reload({ waitUntil: 'domcontentloaded' })
      const rootLength = await page.locator('#root').evaluate(el => el.innerHTML.length).catch(() => 0)
      add(profile, `corrupt key fail-safe: ${key}`, rootLength > 200, `root=${rootLength}`)
      if (original == null) await page.evaluate(k => localStorage.removeItem(k), key)
      else await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key, original })
    }
    await context.close()
  }

  const publicContext = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const publicPage = await publicContext.newPage()
  await publicPage.goto(`${base}/#/reset`, { waitUntil: 'networkidle' })
  add('apple-reviewer', '#/reset renders without white screen', (await publicPage.locator('#root').innerHTML()).length > 200)
  const privacyResponse = await publicPage.goto(`${base}/legal/privacy.html`, { waitUntil: 'networkidle' })
  add('apple-reviewer', 'privacy link resolves', privacyResponse?.ok() === true && (await publicPage.locator('body').innerText()).length > 100)
  const termsResponse = await publicPage.goto(`${base}/legal/terms.html`, { waitUntil: 'networkidle' })
  add('apple-reviewer', 'terms link resolves', termsResponse?.ok() === true && (await publicPage.locator('body').innerText()).length > 100)
  await publicPage.screenshot({ path: new URL('./evidence/public-terms.png', import.meta.url).pathname, fullPage: true })
  await publicContext.close()
} finally {
  await browser.close()
}

await writeFile(new URL('./evidence/runtime-results.json', import.meta.url), JSON.stringify({ base, generatedAt: new Date().toISOString(), results, failures }, null, 2))
console.log(`${results.length - failures.length}/${results.length} checks passed; failures=${failures.length}`)
for (const failure of failures) console.log(`FAIL ${failure.profile}: ${failure.check} — ${failure.detail}`)
process.exitCode = failures.length ? 1 : 0
