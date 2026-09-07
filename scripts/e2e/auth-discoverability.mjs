// رحلة اكتشاف تسجيل الدخول — [AUTH-DISCOVERABILITY-001] (متصفّح حقيقي، خارج البوابة المحلّية)
//
//   الضيف: التقدّم → البطاقة تقول «ما سجّلت دخولك» + زرّ → شاشة الدخول → نجاح
//          → يعود إلى التقدّم نفسه → البطاقة «مسجّل» → «العضوية» تفتح صفحة الكود.
//   الضيف: بوّابة Premium (فعل محجوب) → كود → `not_authenticated` → زرّ دخول داخل البوّابة.
//   المسجَّل: التقدّم → «تسجيل الخروج» بتأكيد → إلغاء يبقيه · قبول يخرجه ولا يبقى أثر جلسة.
//   المؤسس: #/admin ما زال يركّب اللوحة؛ المستخدم العادي ما زال مرفوضًا.
//   ٣٢٠ · ٣٩٠ · ١٢٨٠ × AR/EN: لا تمرير أفقي، والبطاقة ضمن الصفحة، وTab يصل الزرّ وEnter يفعّله.
//
// الشبكة: Supabase مُستبدَل بستوب — لا اتصال حقيقي ولا حساب حقيقي.

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from './lib/engine.mjs'
/* global process */

const ROOT = resolve(import.meta.dirname, '../..')
const PORT = Number(process.env.PORT ?? 4189)
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', cwd: ROOT })
let pass = 0, fail = 0
const check = (l, ok, d = '') => { console.log(`  ${ok ? '✓' : '✗ FAIL'} ${l}${d ? '  — ' + d : ''}`); if (ok) pass++; else fail++ }
const uid = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const session = (app_metadata = {}, user_metadata = { display_name: 'Test Athlete' }) => ({
  access_token: 'auth-e2e', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'auth-e2e@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata, app_metadata, created_at: '2026-01-01T00:00:00.000Z' },
})

async function open({ lang = 'ar', width = 390, height = 844, seed = null, guestDone = true }) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  const errors = []; const reqs = []
  const state = { session: seed }
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()) })
  await page.route('**/*supabase.co/**', (route) => {
    const url = route.request().url(); reqs.push(url)
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (/\/auth\/v1\/token\?grant_type=password/.test(url)) { state.session = session(); return json(200, state.session) }
    if (/\/auth\/v1\/user/.test(url)) return state.session ? json(200, state.session.user) : json(401, { message: 'no session' })
    if (/\/auth\/v1\/token/.test(url)) return state.session ? json(200, state.session) : json(401, { message: 'no session' })
    if (/\/auth\/v1\/logout/.test(url)) { state.session = null; return route.fulfill({ status: 204, body: '' }) }
    if (/\/auth\/v1\//.test(url)) return json(200, {})
    if (/\/rest\/v1\/rpc\/redeem_access_code/.test(url)) return state.session ? json(200, { state: 'noAccess' }) : json(401, { message: 'not authenticated', code: 'PGRST301' })
    if (/\/rest\/v1\/rpc\/my_entitlement/.test(url)) return json(200, [])
    if (/\/rest\/v1\/rpc\/founder_/.test(url)) return json(503, { message: 'e2e', code: 'E2E' })
    if (/\/rest\/v1\//.test(url)) return json(200, [])
    return route.abort()
  })
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ seed, lang, guestDone }) => {
    localStorage.clear()
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))
    if (guestDone) localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true }))
    if (seed) {
      localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(seed))
      localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify({ [seed.user.id]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
    }
  }, { seed, lang, guestDone })
  // التفضيلات تُقرأ عند الإقلاع — إعادة التحميل تجعل البذر ساري المفعول.
  await page.reload({ waitUntil: 'load' }); await sleep(800)
  return { browser, page, errors, reqs, state }
}
const hash = (page) => page.evaluate(() => location.hash)
const noHScroll = (page) => page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1)

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break } catch { await sleep(500) } }

  // ── A · الضيف (AR · 390): التقدّم → دخول → عودة → العضوية ──
  {
    const { browser, page, errors } = await open({ lang: 'ar', width: 390 })
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2500)
    console.log('\nA guest AR/390: hash', await hash(page))
    const card = page.locator('[data-testid="account-state"]')
    check('A1 بطاقة الحساب على التقدّم بحالة ضيف', (await card.count()) === 1 && (await card.getAttribute('data-signed-in')) === 'false')
    const body = await card.innerText()
    check('A2 تقول «ما سجّلت دخولك» وتحمل زرّ «تسجيل الدخول»', /ما سجّلت دخولك/.test(body) && /تسجيل الدخول/.test(body))
    check('A3 لا تمرير أفقي', await noHScroll(page))
    const steps = page.locator('button:has-text("خطواتك")'); const sBox = await steps.boundingBox(); const cBox = await card.boundingBox()
    check('A4 البطاقة تحت بطاقة «خطواتك» مباشرة', !!sBox && !!cBox && cBox.y > sBox.y && cBox.y - (sBox.y + sBox.height) < 40)
    await page.locator('[data-testid="account-state-sign-in"]').click(); await sleep(800)
    check('A5 الزرّ يفتح شاشة الدخول', (await hash(page)) === '#/login')
    await page.locator('input[type="email"]').fill('auth-e2e@example.invalid')
    await page.locator('input[type="password"]').fill('correct-horse-battery')
    await page.locator('form button[type="submit"]').first().click(); await sleep(3000)
    check('A6 بعد الدخول يعود إلى التقدّم نفسه لا إلى «اليوم»', (await hash(page)) === '#/progress', await hash(page))
    const card2 = page.locator('[data-testid="account-state"]')
    check('A7 البطاقة الآن «مسجّل دخولك» باسم الحساب', (await card2.getAttribute('data-signed-in')) === 'true' && /Test Athlete/.test(await card2.innerText()))
    check('A8 زرّ «تسجيل الخروج» ظاهر', (await page.locator('[data-testid="account-state-sign-out"]').count()) === 1)
    await page.locator('[data-testid="account-state-membership"]').click(); await sleep(800)
    check('A9 «العضوية» تفتح صفحة الكود', (await hash(page)) === '#/premium' && (await page.locator('[data-testid="premium-view"]').count()) === 1)
    check('A10 بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── B · الضيف (EN · 320): بوّابة Premium → كود → زرّ دخول داخل البوّابة → دخول → عودة ──
  {
    const { browser, page, errors } = await open({ lang: 'en', width: 320, height: 640 })
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2500)
    console.log('\nB guest EN/320')
    check('B1 no horizontal scroll at 320', await noHScroll(page))
    check('B2 card in English', /not signed in/i.test(await page.locator('[data-testid="account-state"]').innerText()))
    await page.locator('button.card:has-text("Weight")').first().click(); await sleep(800)
    await page.locator('button:has-text("Log today")').first().click(); await sleep(800)
    const weightInput = page.locator('#v2-weight')
    check('B2b weight log form reachable', (await weightInput.count()) === 1)
    if ((await weightInput.count()) === 1) {
      await weightInput.fill('80'); await page.locator('form button[type="submit"]').click(); await sleep(1200)
    }
    const gate = page.locator('[data-testid="premium-gate"]')
    check('B3 paid action opens the Premium gate for a guest', (await gate.count()) === 1)
    if ((await gate.count()) === 1) {
      await page.locator('[data-testid="premium-gate-have-code"]').click()
      await page.locator('[data-testid="activation-code-input"]').fill('QMH7K3XP9W2RT6ZY')
      await page.locator('[data-testid="activation-code-submit"]').click(); await sleep(1500)
      const msg = await page.locator('[data-testid="activation-code-message"]').innerText()
      check('B4 server says sign in first', /sign in first/i.test(msg), msg)
      const cta = page.locator('[data-testid="premium-gate-sign-in"]')
      check('B5 and a Sign in button is right there', (await cta.count()) === 1 && /sign in/i.test(await cta.innerText()))
      await cta.click(); await sleep(800)
      check('B6 gate CTA opens the login screen', (await hash(page)) === '#/login')
      await page.locator('input[type="email"]').fill('auth-e2e@example.invalid')
      await page.locator('input[type="password"]').fill('correct-horse-battery')
      await page.locator('form button[type="submit"]').first().click(); await sleep(3000)
      check('B7 returns to Progress after login', (await hash(page)) === '#/progress', await hash(page))
      check('B8 gate is closed after route change', (await page.locator('[data-testid="premium-gate"]').count()) === 0)
    }
    check('B9 no page errors', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── C · المسجَّل (EN · 1280): تأكيد الخروج — إلغاء ثم قبول — ولا أثر بعده ──
  {
    const { browser, page, errors, state } = await open({ lang: 'en', width: 1280, height: 900, seed: session() })
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2500)
    console.log('\nC signed-in EN/1280')
    const card = page.locator('[data-testid="account-state"]')
    check('C1 signed-in state with name and Sign out', (await card.getAttribute('data-signed-in')) === 'true' && /Test Athlete/.test(await card.innerText()) && (await page.locator('[data-testid="account-state-sign-out"]').count()) === 1)
    check('C2 no horizontal scroll on desktop', await noHScroll(page))
    page.once('dialog', (d) => d.dismiss())
    await page.locator('[data-testid="account-state-sign-out"]').click(); await sleep(800)
    check('C3 cancelling the confirm keeps the session', (await page.locator('[data-testid="account-state"]').getAttribute('data-signed-in')) === 'true' && state.session !== null)
    let confirmText = ''
    page.once('dialog', (d) => { confirmText = d.message(); d.accept() })
    await page.locator('[data-testid="account-state-sign-out"]').click(); await sleep(2500)
    check('C4 confirm text is the approved logout warning', /removes your data from this device/.test(confirmText), confirmText)
    const h = await hash(page)
    const leak = await page.locator('[data-testid="account-state"][data-signed-in="true"]').count()
    const stored = await page.evaluate(() => localStorage.getItem('qimmah:supabase-auth:v1'))
    const guestCard = await page.locator('[data-testid="account-state"][data-signed-in="false"]').count()
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /auth|onboarding|customization/.test(k)))
    check('C5 after sign-out: no signed-in surface, no stored session', leak === 0 && stored === null, `hash=${h} guestCard=${guestCard} keys=${keys.join(',')}`)
    check('C6 no page errors', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── D · التفويض لم يتغيّر ──
  {
    const { browser, page } = await open({ lang: 'ar', seed: session({ qimmah_role: 'founder' }) })
    await page.goto(`http://127.0.0.1:${PORT}/?admin#/admin`, { waitUntil: 'load' }); await sleep(4000)
    check('D1 founder still mounts #/admin', (await page.locator('[data-admin-shell]').count()) === 1)
    await browser.close()
    const g = await open({ lang: 'ar', seed: session({}) })
    await g.page.goto(`http://127.0.0.1:${PORT}/?admin#/admin`, { waitUntil: 'load' }); await sleep(4000)
    check('D2 normal user still denied at #/admin', (await g.page.locator('[data-admin-denied]').count()) === 1 && (await g.page.locator('[data-admin-shell]').count()) === 0)
    const progressText = await (async () => { await g.page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2000); return g.page.locator('[data-testid="account-state"]').innerText() })()
    check('D3 normal user card exposes no admin control', !/admin|إدارة|لوحة/i.test(progressText))
    await g.browser.close()
  }

  // ── E · لوحة المفاتيح (AR · 390): Tab يصل زرّ الدخول وEnter يفعّله ──
  {
    const { browser, page } = await open({ lang: 'ar', width: 390 })
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2500)
    let reached = false
    for (let i = 0; i < 80 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'account-state-sign-in')
    }
    check('E1 Tab reaches the Sign in button', reached)
    if (reached) { await page.keyboard.press('Enter'); await sleep(800); check('E2 Enter opens the login screen', (await hash(page)) === '#/login') }
    await browser.close()
  }
} finally { server.kill() }
console.log(`\nauth discoverability e2e: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
