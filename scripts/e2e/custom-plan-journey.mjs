// رحلة الجدول المخصّص — [CUSTOM-PLAN-DEADEND-001] (متصفّح حقيقي، خارج البوابة المحلّية)
//
//   الواقعة: مراجعة جدول بلا تمارين تعرض الأيام (١ دفع … ٦ أرجل) وزرّ الحفظ معطَّل،
//   والسبب أسفل القائمة تحت الطيّة — جدولٌ ظاهر وباب مقفل.
//
//   يُقاس هنا: من «التمارين» → إنشاء جدول مخصّص → الأيام → البناء → المراجعة:
//   الزرّ الرئيسي له فعلٌ دائمًا · تنبيه الأيام الفارغة في أوّل المراجعة داخل الشاشة ·
//   «عبّي الأيام الفارغة» يجعل الجدول قابلًا للحفظ · الحفظ يُغلق الباني ويُظهر الجدول ·
//   يبقى بعد إعادة التحميل · التعديل لا يكرّر السجلّ · الرجوع/الإلغاء آمنان ·
//   الضيف بلا استحقاق يرى بوّابة Premium ويبقى جدوله في الباني بعد إغلاقها ·
//   ٢ (الحدّ الأدنى) · ٣ · ٥ · ٦ أيام × AR/EN × ٣٢٠/٣٩٠/١٢٨٠ · زرّ القاع داخل الشاشة ولا تمرير أفقي.
//
// الشبكة: Supabase مُستبدَل بستوب — لا اتصال حقيقي.

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from './lib/engine.mjs'
/* global process */

const ROOT = resolve(import.meta.dirname, '../..')
const PORT = Number(process.env.PORT ?? 4192)
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', cwd: ROOT })
let pass = 0, fail = 0
const check = (l, ok, d = '') => { console.log(`  ${ok ? '✓' : '✗ FAIL'} ${l}${d ? '  — ' + d : ''}`); if (ok) pass++; else fail++ }
const uid = 'cccccccc-3333-4333-8333-cccccccccccc'
const session = () => ({
  access_token: 'plan-e2e', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'plan-e2e@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
})
const L = {
  ar: { create: 'أنشئ جدول مخصّص', inc: 'زيادة', dec: 'إنقاص', next: 'التالي', save: 'حفظ الجدول', fill: 'عبّي الأيام الفارغة', add: 'أضف تمارين', badge: 'جدول مخصّص', edit: 'تعديل جدولي', seed: 'عبّي الأيام بتمارين مقترحة', cancel: 'إلغاء', back: 'رجوع' },
  en: { create: 'Create a custom plan', inc: 'Increase', dec: 'Decrease', next: 'Next', save: 'Save plan', fill: 'Fill empty days', add: 'Add exercises', badge: 'Custom plan', edit: 'Edit my plan', seed: 'Fill the days with suggested exercises', cancel: 'Cancel', back: 'Back' },
}

async function open({ lang = 'ar', width = 390, height = 844, premium = true }) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()) })
  const seed = premium ? session() : null
  await page.route('**/*supabase.co/**', (route) => {
    const url = route.request().url()
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (/\/auth\/v1\/user/.test(url)) return seed ? json(200, seed.user) : json(401, { message: 'no session' })
    if (/\/auth\/v1\/token/.test(url)) return seed ? json(200, seed) : json(401, { message: 'no session' })
    if (/\/auth\/v1\//.test(url)) return json(200, {})
    if (/\/rest\/v1\/rpc\/my_entitlement/.test(url)) return seed ? json(200, [{ state: 'premiumActive', server_time: new Date().toISOString(), expires_at: null }]) : json(401, { message: 'not authenticated' })
    if (/\/rest\/v1\//.test(url)) return json(200, [])
    return route.abort()
  })
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ seed, lang }) => {
    localStorage.clear()
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))
    localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true }))
    if (seed) {
      localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(seed))
      localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify({ [seed.user.id]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
    }
  }, { seed, lang })
  await page.reload({ waitUntil: 'load' }); await sleep(600)
  await page.goto(`http://127.0.0.1:${PORT}/#/workout`, { waitUntil: 'load' }); await sleep(2500)
  return { browser, page, errors }
}
const inView = async (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0 }, sel)
const noHScroll = (page) => page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1)
const primary = (page) => page.locator('[data-testid="plan-builder-primary"]')
const label = async (page) => (await primary(page).innerText()).trim()
const readDays = (page, t) => page.evaluate((inc) => {
  const btn = document.querySelector(`button[aria-label="${inc}"]`)
  const txt = btn?.parentElement?.textContent ?? ''
  const west = txt.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const m = west.match(/\d+/)
  return m ? Number(m[0]) : -1
}, t.inc)
const setDays = async (page, t, target) => {
  for (let i = 0; i < 10; i++) {
    const v = await readDays(page, t)
    if (v === target) return
    if (v < 0) throw new Error('days stepper not found')
    await page.locator(`button[aria-label="${v < target ? t.inc : t.dec}"]`).click(); await sleep(150)
  }
}
const records = (page) => page.evaluate(() => { const raw = localStorage.getItem('qimmah:customPlan:v1'); return raw ? JSON.parse(raw) : null })

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break } catch { await sleep(500) } }

  // ── A · AR/390 · ٦ أيام بلا تعبئة → مراجعة → «عبّي الأيام الفارغة» → حفظ → ثبات → تعديل ──
  {
    const t = L.ar
    const { browser, page, errors } = await open({ lang: 'ar', width: 390 })
    console.log('\nA AR/390 · 6 days, manual path')
    await page.locator(`button:has-text("${t.create}")`).first().click(); await sleep(900)
    check('A1 الباني يفتح وزرّه الرئيسي داخل الشاشة', await inView(page, '[data-testid="plan-builder-primary"]'))
    // [CUSTOM-PLAN-IOS-OVERLAY] الباني خارج متمرّر القشرة (بوّابة إلى body) والقشرة منغمسة (لا رأس ولا شريط).
    const portalOk = await page.evaluate(() => { const el = document.querySelector('[data-testid="custom-plan-portal"]'); return !!el && el.parentElement === document.body })
    const chrome = await page.evaluate(() => ({ nav: document.querySelector('nav')?.hidden ?? null, header: document.querySelector('header[class*="z-40"]')?.hidden ?? null }))
    check('A1b الباني يُرسم في body لا داخل main (بوّابة)', portalOk)
    check('A1c القشرة منغمسة: شريط التنقّل والرأس مخفيّان أثناء الباني', chrome.nav === true && chrome.header === true, JSON.stringify(chrome))
    // ⚔️ محاكاة iOS WebKit: حاوية محوَّلة تحصر fixed داخلها — الذيل يبقى داخل الشاشة لأن الباني خارجها.
    await page.addStyleTag({ content: 'main.app-scroll { transform: translateZ(0) !important; }' }); await sleep(200)
    check('A1d مع حصر fixed داخل main (محاكاة WebKit) يبقى الذيل داخل الشاشة', await inView(page, '[data-testid="plan-builder-primary"]'))
    await setDays(page, t, 6)
    check('A2 ستة أيام بأسماء مقترحة معروضة', (await page.locator('main li').count()) === 6)
    check('A3 خطوة الأيام: الزرّ «التالي»', (await label(page)) === t.next)
    await primary(page).click(); await sleep(500)
    check('A4 خطوة البناء: الزرّ «التالي» ولا تعبئة تلقائية خلسة', (await label(page)) === t.next)
    await primary(page).click(); await sleep(500)
    const notice = page.locator('[data-testid="plan-review-empty"]')
    check('A5 المراجعة: تنبيه الأيام الفارغة أوّل الشاشة وداخلها', (await notice.count()) === 1 && (await inView(page, '[data-testid="plan-review-empty"]')))
    check('A6 الزرّ الرئيسي ليس معطَّلًا ونصّه «عبّي الأيام الفارغة»', (await primary(page).isEnabled()) && (await label(page)) === t.fill)
    check('A7 لكل يوم فارغ رابط «أضف تمارين»', (await page.locator('[data-testid="plan-review-day-add"]').count()) === 6)
    check('A8 لا تمرير أفقي', await noHScroll(page))
    await primary(page).click(); await sleep(600)
    check('A9 بعد التعبئة: لا تنبيه، والزرّ «حفظ الجدول»', (await notice.count()) === 0 && (await label(page)) === t.save)
    const filled = await page.locator('main .card ul li').count()
    check('A10 الأيام الستّة امتلأت بتمارين', filled >= 6, `${filled} exercises listed`)
    await primary(page).click(); await sleep(1200)
    check('A10b بعد الحفظ تعود القشرة: شريط التنقّل ظاهر', (await page.evaluate(() => document.querySelector('nav')?.hidden)) === false)
    check('A11 الحفظ يُغلق الباني ويُظهر بطاقة الجدول المخصّص', (await page.locator('[data-testid="plan-builder-primary"]').count()) === 0 && /جدول مخصّص/.test(await page.locator('[data-testid="workout-plan-card"]').innerText()))
    check('A12 ستّة أيام في البطاقة', (await page.locator('[data-testid="workout-plan-day"]').count()) === 6)
    let rec = await records(page)
    check('A13 سجلّ واحد لهذا الحساب مصدره custom', rec && Object.keys(rec).length === 1 && Object.values(rec)[0].source === 'custom' && Object.values(rec)[0].plan.days.length === 6)
    await page.reload({ waitUntil: 'load' }); await sleep(2500)
    check('A14 بعد إعادة التحميل: الجدول المخصّص ما زال هو المعروض', /جدول مخصّص/.test(await page.locator('[data-testid="workout-plan-card"]').innerText()) && (await page.locator('[data-testid="workout-plan-day"]').count()) === 6)
    await page.locator(`button:has-text("${t.edit}")`).first().click(); await sleep(900)
    await setDays(page, t, 5)
    await primary(page).click(); await sleep(400); await primary(page).click(); await sleep(400)
    check('A15 التعديل: المراجعة بخمسة أيام كلّها ممتلئة والزرّ «حفظ الجدول»', (await label(page)) === t.save)
    await primary(page).click(); await sleep(1200)
    rec = await records(page)
    check('A16 التعديل استبدل الخطة ولم يكرّر السجلّ', rec && Object.keys(rec).length === 1 && Object.values(rec)[0].plan.days.length === 5 && (await page.locator('[data-testid="workout-plan-day"]').count()) === 5)
    check('A17 بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── B · EN/320 · يوم واحد بالتعبئة من خطوة الأيام → حفظ ──
  {
    const t = L.en
    const { browser, page, errors } = await open({ lang: 'en', width: 320, height: 640 })
    console.log('\nB EN/320 · 2 days (builder minimum), seeded path')
    await page.locator(`button:has-text("${t.create}")`).first().click(); await sleep(900)
    await setDays(page, t, 2)
    await page.locator(`button:has-text("${t.seed}")`).click(); await sleep(200)
    check('B1 primary CTA in view at 320', await inView(page, '[data-testid="plan-builder-primary"]'))
    check('B2 no horizontal scroll at 320', await noHScroll(page))
    await primary(page).click(); await sleep(500)
    await primary(page).click(); await sleep(500)
    check('B3 review is saveable straight away: Save plan', (await label(page)) === t.save && (await page.locator('[data-testid="plan-review-empty"]').count()) === 0)
    await primary(page).click(); await sleep(1200)
    check('B4 saved: two-day custom plan on the card', /Custom plan/.test(await page.locator('[data-testid="workout-plan-card"]').innerText()) && (await page.locator('[data-testid="workout-plan-day"]').count()) === 2)
    check('B5 no page errors', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── C · EN/1280 · ٣ أيام: «Add exercises» من المراجعة يقفز للبناء على اليوم الفارغ · الرجوع والإلغاء ──
  {
    const t = L.en
    const { browser, page, errors } = await open({ lang: 'en', width: 1280, height: 900 })
    console.log('\nC EN/1280 · 3 days, add-from-review, back/cancel')
    await page.locator(`button:has-text("${t.create}")`).first().click(); await sleep(900)
    await setDays(page, t, 3)
    await primary(page).click(); await sleep(400); await primary(page).click(); await sleep(400)
    await page.locator('[data-testid="plan-review-day-add"]').nth(1).click(); await sleep(500)
    const pressed = await page.locator('main button[aria-pressed="true"]').first().innerText()
    check('C1 "Add exercises" on day 2 opens the build step with day 2 active', (await label(page)) === t.next && /2/.test(pressed), pressed)
    await page.locator(`footer button:has-text("${t.back}")`).click(); await sleep(400)
    check('C2 Back from build returns to days', (await page.locator(`button[aria-label="${t.inc}"]`).count()) === 1)
    await page.locator(`footer button:has-text("${t.cancel}")`).click(); await sleep(600)
    check('C2b nav is back after cancel', (await page.evaluate(() => document.querySelector('nav')?.hidden)) === false || (await page.locator('nav').count()) === 0)
    check('C3 Cancel closes the builder without creating a record', (await page.locator('[data-testid="plan-builder-primary"]').count()) === 0 && (await records(page)) === null)
    check('C4 no page errors', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── D · AR/390 · ضيف بلا استحقاق: الحفظ يفتح بوّابة Premium، وإغلاقها يعيده إلى بانيه بجدوله ──
  {
    const t = L.ar
    const { browser, page } = await open({ lang: 'ar', width: 390, premium: false })
    console.log('\nD AR/390 · guest without entitlement')
    await page.locator(`button:has-text("${t.create}")`).first().click(); await sleep(900)
    await setDays(page, t, 3)
    await page.locator(`button:has-text("${t.seed}")`).click(); await sleep(200)
    await primary(page).click(); await sleep(400); await primary(page).click(); await sleep(400)
    await primary(page).click(); await sleep(1200)
    const gate = page.locator('[data-testid="premium-gate"]')
    check('D1 الحفظ بلا استحقاق يفتح بوّابة Premium الواحدة', (await gate.count()) === 1)
    await page.locator('[data-testid="premium-gate-dismiss"]').click(); await sleep(500)
    const dPrimary = await primary(page).count(); const dLabel = dPrimary ? await label(page) : '(none)'; const dCards = await page.locator('main .card').count()
    const dGate = await gate.count(); const dText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220)
    check('D2 إغلاق البوّابة يعيده إلى المراجعة وجدوله كما هو', dPrimary === 1 && dLabel === t.save && dCards >= 3 && dGate === 0, `primary=${dPrimary} label=${dLabel} cards=${dCards} gate=${dGate} :: ${dText}`)
    await browser.close()
  }
} finally { server.kill() }
console.log(`\ncustom plan journey: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
