// رحلة القشرة على الجوال — [MOBILE-SHELL-001] (متصفّح حقيقي، خارج البوابة المحلّية)
//
//   الواقعة (المؤسس): تسجيل الأكل على الجوال «يقفز ويتمدّد غريبًا»: التركيز على حقل
//   يكبّر الصفحة كلها (iOS يكبّر أي حقل دون ١٦ بكسل)، لوحة المفاتيح تُخفي الحقل
//   وتترك شريط التنقّل فوقها، والحوارات داخل متمرّر القشرة تُحبَس فيه على WebKit
//   فيبقى الهيدر والشريط قابلَين للنقر خلف «حوار».
//
//   ما يُقاس هنا (AR 320 · AR 390 · EN 430، ونتوء محاكًى ٤٧/٣٤):
//     • لا حقل إدخال ظاهر دون ١٦ بكسل على شاشة التغذية (بحث · كمية · تعديل · ماء).
//     • لوحة المفاتيح (محاكاة بتقليص visualViewport): القشرة تنكمش إلى المرئي،
//       الشريط السفلي يختفي، الحقل المركَّز يبقى داخل المتمرّر المرئي، ويعود كل
//       شيء بعد الإغلاق (لا فجوة).
//     • تحت محاكاة حبس WebKit (`transform` على المتمرّر): كل تراكب (ماسح الباركود ·
//       تفاصيل التمرين · ورقة التسجيل · بوّابة Premium للضيف) يملأ الشاشة كاملةً
//       ويعيش في `document.body`، ويرث الاتجاه الصحيح.
//     • رحلة التسجيل كاملة: بحث ← اختيار ← كمية ← حفظ ← تعديل ← حذف — بلا أخطاء
//       صفحة ولا تمرير أفقي.
//     ⚔️ أسنان: عنصر ثابت مزروع **داخل** المتمرّر يُحبَس فعلًا تحت المحاكاة (فالمحاكاة
//       تعضّ)، ونزع `.app-viewport-h` يُسقط قياس لوحة المفاتيح.
//
// الشبكة: Supabase مُستبدَل بستوب — لا اتصال حقيقي.

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from './lib/engine.mjs'
/* global process */

const ROOT = resolve(import.meta.dirname, '../..')
const PORT = Number(process.env.PORT ?? 4194)
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', cwd: ROOT })
const BASE = `http://127.0.0.1:${PORT}`
let pass = 0, fail = 0
const check = (l, ok, d = '') => { console.log(`  ${ok ? '✓' : '✗ FAIL'} ${l}${d ? '  — ' + d : ''}`); if (ok) pass++; else fail++ }
const uid = 'eeeeeeee-6666-4666-8666-eeeeeeeeeeee'
const session = () => ({
  access_token: 'shell-e2e', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'shell-e2e@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
})

async function open({ lang = 'ar', width = 390, height = 844, guest = false, entitlement = 'premiumActive' }) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true })
  // نتوء محاكًى + محاكاة حبس WebKit للثابت داخل متمرّر القشرة.
  await ctx.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style')
      st.textContent = ':root{--safe-top:47px;--safe-bottom:34px} main.app-scroll{transform:translateZ(0)}'
      document.head.appendChild(st)
    })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()) })
  const seed = session()
  await page.route('**/*supabase.co/**', (route) => {
    const url = route.request().url()
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (/\/auth\/v1\/user/.test(url)) return json(guest ? 401 : 200, guest ? {} : seed.user)
    if (/\/auth\/v1\/token/.test(url)) return json(200, seed)
    if (/\/auth\/v1\//.test(url)) return json(200, {})
    if (/\/rest\/v1\/rpc\/my_entitlement/.test(url)) return json(200, [{ state: entitlement, server_time: new Date().toISOString(), expires_at: null }])
    if (/\/rest\/v1\//.test(url)) return json(200, [])
    return route.abort()
  })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ seed, lang, guest }) => {
    localStorage.clear()
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))
    localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true }))
    if (!guest) {
      localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(seed))
      localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify({ [seed.user.id]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
    }
  }, { seed, lang, guest })
  await page.reload({ waitUntil: 'load' }); await sleep(800)
  return { browser, page, errors }
}

const goto = async (page, route) => { await page.goto(`${BASE}/${route}`, { waitUntil: 'load' }); await sleep(2000) }
const tapText = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()) && b.getClientRects().length)
  if (!el) return false
  el.click(); return true
}, re.source)
const noHScroll = (page) => page.evaluate(() => {
  const main = document.querySelector('main.app-scroll')
  return document.scrollingElement.scrollWidth <= innerWidth + 1 && (!main || main.scrollWidth <= main.clientWidth + 1)
})
const smallInputs = (page) => page.evaluate(() =>
  [...document.querySelectorAll('input,select,textarea')]
    .filter((el) => el.getClientRects().length)
    .map((el) => ({ id: el.id || el.getAttribute('aria-label') || el.type, fs: Number.parseFloat(getComputedStyle(el).fontSize) }))
    .filter((i) => i.fs < 16))
const overlay = (page) => page.evaluate(() => {
  const o = [...document.querySelectorAll('[data-app-overlay]')].at(-1)
  if (!o) return null
  const r = o.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inBody: o.parentElement === document.body, dir: getComputedStyle(o).direction }
})
const shell = (page) => page.evaluate(() => {
  const main = document.querySelector('main.app-scroll')
  const nav = document.querySelector('nav[aria-label]')
  const r = (el) => { const b = el.getBoundingClientRect(); return { y: Math.round(b.y), b: Math.round(b.bottom), h: Math.round(b.height) } }
  const active = document.activeElement
  return {
    keyboard: document.documentElement.getAttribute('data-keyboard'),
    shellH: Math.round(document.querySelector('.qimmah-app-shell')?.getBoundingClientRect().height ?? 0),
    main: main ? r(main) : null,
    navHidden: !!nav?.hidden,
    navVar: getComputedStyle(document.documentElement).getPropertyValue('--qimmah-nav-h').trim(),
    active: active && active !== document.body ? r(active) : null,
  }
})
const L = {
  ar: { add: /^أضف$/, addToLog: /^أضف للسجل$/, scan: /باركود/, edit: 'عدّل', cancel: /^إلغاء$/, query: 'كبسة', remove: 'حذف' },
  en: { add: /^Add$/, addToLog: /^Add to log$/, scan: /barcode/i, edit: 'Edit', cancel: /^Cancel$/, query: 'chicken', remove: 'Remove' },
}

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`${BASE}/`); break } catch { await sleep(500) } }

  // ── A · رحلة التسجيل والقشرة في ثلاث شاشات ──
  for (const cfg of [{ lang: 'ar', width: 320, height: 568 }, { lang: 'ar', width: 390, height: 844 }, { lang: 'en', width: 430, height: 932 }]) {
    const { lang, width, height } = cfg
    const tag = `A ${lang.toUpperCase()}/${width}`
    const l = L[lang]
    const { browser, page, errors } = await open(cfg)
    console.log(`\n${tag} · food logging + shell under a 47px notch and WebKit confinement`)
    await goto(page, '#/nutrition')
    check(`${tag}: الاتجاه ${lang === 'ar' ? 'RTL' : 'LTR'}`, (await page.evaluate(() => document.documentElement.dir)) === (lang === 'ar' ? 'rtl' : 'ltr'))
    check(`${tag}: لا تمرير أفقي على الشاشة`, await noHScroll(page))
    check(`${tag}: فتح «أضف» على أوّل وجبة`, await tapText(page, l.add)); await sleep(500)
    const search = page.locator('main input[type="text"]').first()
    await search.focus(); await sleep(300)
    let s0 = await shell(page)
    check(`${tag}: الحقل المركَّز داخل المتمرّر المرئي`, !!s0.active && s0.active.b <= s0.main.b && s0.active.y >= s0.main.y, JSON.stringify(s0))
    let small = await smallInputs(page)
    check(`${tag}: لا حقل دون ١٦ بكسل بعد فتح التسجيل`, small.length === 0, JSON.stringify(small))

    // لوحة مفاتيح محاكاة: تقليص المنطقة المرئية ٣٠٠ بكسل والحقل مركَّز.
    await page.setViewportSize({ width, height: height - 300 }); await sleep(600)
    const kb = await shell(page)
    check(`${tag}: لوحة المفاتيح مكتشَفة (data-keyboard)`, kb.keyboard === 'open', JSON.stringify(kb))
    check(`${tag}: القشرة تنكمش إلى المرئي`, kb.shellH === height - 300, String(kb.shellH))
    check(`${tag}: شريط التنقّل يختفي فوق اللوحة و--qimmah-nav-h = 0`, kb.navHidden && kb.navVar === '0px', `${kb.navHidden} ${kb.navVar}`)
    check(`${tag}: الحقل المركَّز ظاهر فوق اللوحة`, !!kb.active && kb.active.b <= kb.main.b && kb.active.y >= kb.main.y, JSON.stringify(kb))
    await page.setViewportSize({ width, height }); await sleep(600)
    const back = await shell(page)
    check(`${tag}: بعد إغلاق اللوحة يعود الشريط والقشرة بلا فجوة`, back.keyboard === null && !back.navHidden && back.shellH === height && (await page.evaluate(() => scrollY)) === 0, JSON.stringify(back))

    // بحث ← اختيار ← الماسح (تراكب) ← كمية ← حفظ.
    await search.fill(l.query); await sleep(900)
    const results = page.locator('main ul li button')
    check(`${tag}: نتائج البحث ظاهرة`, (await results.count()) > 0)
    await results.first().click(); await sleep(400)
    small = await smallInputs(page)
    check(`${tag}: حقل الكمية ≥ ١٦ بكسل`, small.length === 0, JSON.stringify(small))
    check(`${tag}: فتح ماسح الباركود`, await tapText(page, l.scan)); await sleep(1200)
    let ov = await overlay(page)
    check(`${tag}: الماسح يملأ الشاشة كاملةً تحت محاكاة الحبس`, !!ov && ov.x === 0 && ov.y === 0 && ov.w === width && ov.h === height, JSON.stringify(ov))
    check(`${tag}: الماسح في document.body ويرث الاتجاه`, !!ov && ov.inBody && ov.dir === (lang === 'ar' ? 'rtl' : 'ltr'), JSON.stringify(ov))
    await page.evaluate(() => document.querySelector('[data-app-overlay] button[aria-label]')?.click()); await sleep(400)
    check(`${tag}: الماسح أُغلق`, (await overlay(page)) === null)
    const amount = page.locator('#qml-amount')
    await amount.fill('150'); await sleep(200)
    const addBtn = page.locator('main button', { hasText: l.addToLog }).first()
    await addBtn.scrollIntoViewIfNeeded(); await addBtn.click(); await sleep(600)
    const editBtn = page.locator(`main li button[aria-label^="${l.edit}"]`)
    check(`${tag}: الصنف سُجّل بكمية ١٥٠غ`, (await editBtn.count()) === 1 && (await page.locator('main li').filter({ hasText: /150|١٥٠/ }).count()) > 0)
    await editBtn.first().click(); await sleep(400)
    small = await smallInputs(page)
    check(`${tag}: حقل التعديل ≥ ١٦ بكسل`, small.length === 0, JSON.stringify(small))
    await page.locator('main li input').first().fill('200'); await sleep(200)
    await page.evaluate(() => { const b = [...document.querySelectorAll('main li button')].find((x) => x.className.includes('btn-primary')); b?.click() }); await sleep(500)
    check(`${tag}: التعديل حُفظ (٢٠٠غ)`, (await page.locator('main li').filter({ hasText: /200|٢٠٠/ }).count()) > 0)
    await page.locator(`main li button[aria-label^="${l.remove}"]`).first().click(); await sleep(500)
    check(`${tag}: الحذف أزال الصنف`, (await editBtn.count()) === 0)
    check(`${tag}: لا حقل دون ١٦ بكسل في لوحة الماء`, (await smallInputs(page)).length === 0)
    check(`${tag}: لا تمرير أفقي بعد الرحلة`, await noHScroll(page))

    // ورقة التسجيل السريع وتفاصيل التمرين — تراكبات القشرة.
    await page.getByTestId('tab-log-action').click(); await sleep(500)
    const sheet = await page.evaluate(() => { const d = document.querySelector('[role="dialog"][aria-labelledby="quick-log-title"]')?.closest('.fixed'); const r = d?.getBoundingClientRect(); return r ? { y: Math.round(r.y), h: Math.round(r.height) } : null })
    check(`${tag}: ورقة التسجيل السريع تملأ الشاشة`, !!sheet && sheet.y === 0 && sheet.h === height, JSON.stringify(sheet))
    await page.keyboard.press('Escape'); await sleep(300)
    await goto(page, '#/exercises')
    await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.querySelector('img'))?.click()); await sleep(900)
    ov = await overlay(page)
    check(`${tag}: تفاصيل التمرين تملأ الشاشة (لا تُحبَس في المتمرّر)`, !!ov && ov.y === 0 && ov.h === height && ov.inBody, JSON.stringify(ov))
    check(`${tag}: بلا أخطاء صفحة`, errors.length === 0, errors[0])
    await browser.close()
  }

  // ── B · الضيف: بوّابة Premium تراكبٌ كامل وفيه طريق دخول ──
  {
    const { browser, page, errors } = await open({ lang: 'ar', width: 390, height: 844, guest: true })
    console.log('\nB AR/390 guest · Premium gate is a full overlay with a sign-in path')
    await goto(page, '#/nutrition')
    await tapText(page, L.ar.add); await sleep(700)
    const ov = await overlay(page)
    check('B: بوّابة Premium تملأ الشاشة في document.body', !!ov && ov.y === 0 && ov.h === 844 && ov.inBody, JSON.stringify(ov))
    const actions = await page.evaluate(() => [...document.querySelectorAll('[data-app-overlay] button, [data-app-overlay] a')].filter((b) => b.getClientRects().length).map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30)))
    check('B: البوّابة تحمل فعلًا واضحًا (دخول/تفعيل/إغلاق) لا طريقًا مسدودًا', actions.length >= 2, JSON.stringify(actions))
    check('B: بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── B2 · مستخدم مسجَّل بلا عضوية (مجاني): نفس البوّابة، تراكبٌ كامل ──
  {
    const { browser, page, errors } = await open({ lang: 'en', width: 320, height: 568, entitlement: 'none' })
    console.log('\nB2 EN/320 signed-in free user · Premium gate is a full overlay')
    await goto(page, '#/nutrition')
    await tapText(page, L.en.add); await sleep(700)
    const ov = await overlay(page)
    check('B2: بوّابة Premium تملأ الشاشة الصغيرة كاملةً في document.body', !!ov && ov.y === 0 && ov.h === 568 && ov.w === 320 && ov.inBody && ov.dir === 'ltr', JSON.stringify(ov))
    check('B2: لا تمرير أفقي', await noHScroll(page))
    check('B2: بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── ⚔️ C · أسنان القياس ──
  {
    const { browser, page } = await open({ lang: 'ar', width: 390, height: 844 })
    console.log('\nC ⚔️ teeth · the confinement simulation bites, and the keyboard check fails without .app-viewport-h')
    await goto(page, '#/nutrition')
    const planted = await page.evaluate(() => {
      const el = document.createElement('div')
      el.id = 'planted-fixed'; el.style.cssText = 'position:fixed;inset:0'
      document.querySelector('main.app-scroll').appendChild(el)
      const r = el.getBoundingClientRect(); el.remove()
      return { y: Math.round(r.y), h: Math.round(r.height) }
    })
    check('C ⚔️ عنصر ثابت داخل المتمرّر يُحبَس فيه تحت المحاكاة (المحاكاة تعضّ)', planted.y > 0 && planted.h < 844, JSON.stringify(planted))
    // القشرة تستهلك المتغيّر فعلًا: قيمة مفروضة تُغيّر ارتفاعها، ونزع الصنف يعيده —
    // فالقياس أعلاه يسقط لو صار الصنف زينة. (تقليص viewport في Chromium يقلّص
    // dvh معًا، فلا يصلح شاهدًا على الصنف وحده.)
    await page.addStyleTag({ content: ':root{--qimmah-vvh:400px}' }); await sleep(200)
    const forced = await shell(page)
    check('C ⚔️ القشرة تستهلك --qimmah-vvh (٤٠٠ ⇒ ٤٠٠)', forced.shellH === 400, String(forced.shellH))
    await page.addStyleTag({ content: '.app-viewport-h{height:100dvh !important}' }); await sleep(200)
    const stripped = await shell(page)
    check('C ⚔️ نزع .app-viewport-h يُسقط الانكماش (الفحص له أسنان)', stripped.shellH === 844, String(stripped.shellH))
    await browser.close()
  }
} catch (e) {
  console.error('✗ EXCEPTION', e); fail++
} finally {
  server.kill()
}
console.log(`\n${fail === 0 ? '✅' : '❌'} mobile-shell: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
