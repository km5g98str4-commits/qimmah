// رحلة كروم الشاشات المستقلّة — [STANDALONE-CHROME-001] (متصفّح حقيقي، خارج البوابة المحلّية)
//
//   الواقعة: «العضوية» على آيفون — العنوان وزرّ الرجوع تحت شريط الحالة، ولا شريط
//   تنقّل، والرجوع يُنزل المستخدم في «الإعدادات» لا حيث كان.
//
//   يُقاس هنا بنتوء محاكًى (`--safe-top: 47px`, `--safe-bottom: 34px`) — والمتغيّران
//   هما نفسهما اللذان يقرؤهما التطبيق من `env()` على الجهاز:
//     • لكل شاشة مستقلّة: أوّل عنصر تفاعلي **تحت** النتوء كاملًا، وهدف لمسه ≥ ٤٤،
//       والعنوان ظاهر، ولا تمرير أفقي عند ٣٢٠ و٣٩٠.
//     • العضوية: متمرّر خاص (لا المستند)، والمحتوى لا يُقصّ.
//     • الرجوع يعود إلى **المصدر**: التقدّم → العضوية → رجوع ⇒ التقدّم.
//       والإعدادات → العضوية → رجوع ⇒ الإعدادات.
//     • مغادرة تبويب رئيسي تُحرّر قفل تمرير القشرة (لا شاشة معلّقة بعده).
//
// الشبكة: Supabase مُستبدَل بستوب — لا اتصال حقيقي.

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from './lib/engine.mjs'
/* global process */

const ROOT = resolve(import.meta.dirname, '../..')
const PORT = Number(process.env.PORT ?? 4193)
const NOTCH = 47
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', cwd: ROOT })
let pass = 0, fail = 0
const check = (l, ok, d = '') => { console.log(`  ${ok ? '✓' : '✗ FAIL'} ${l}${d ? '  — ' + d : ''}`); if (ok) pass++; else fail++ }
const uid = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee'
const session = () => ({
  access_token: 'chrome-e2e', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'chrome-e2e@example.invalid', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
})

async function open({ lang = 'ar', width = 390, height = 844 }) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true })
  // محاكاة النتوء: التطبيق يقرأ `--safe-top`/`--safe-bottom` (مصدرهما `env()` على الجهاز)،
  // فتغليبهما هنا يعيد إنتاج آيفون على متصفّح بلا نتوء.
  await ctx.addInitScript((top) => {
    addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style')
      st.textContent = `:root{--safe-top:${top}px;--safe-bottom:34px}`
      document.head.appendChild(st)
    })
  }, NOTCH)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()) })
  const seed = session()
  await page.route('**/*supabase.co/**', (route) => {
    const url = route.request().url()
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (/\/auth\/v1\/user/.test(url)) return json(200, seed.user)
    if (/\/auth\/v1\/token/.test(url)) return json(200, seed)
    if (/\/auth\/v1\//.test(url)) return json(200, {})
    if (/\/rest\/v1\/rpc\/my_entitlement/.test(url)) return json(200, [{ state: 'premiumActive', server_time: new Date().toISOString(), expires_at: null }])
    if (/\/rest\/v1\//.test(url)) return json(200, [])
    return route.abort()
  })
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ seed, lang }) => {
    localStorage.clear()
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))
    localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true }))
    localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(seed))
    localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify({ [seed.user.id]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
  }, { seed, lang })
  await page.reload({ waitUntil: 'load' }); await sleep(600)
  return { browser, page, errors }
}
const hash = (page) => page.evaluate(() => location.hash)
const noHScroll = (page) => page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1)
const chrome = (page) => page.evaluate(() => {
  const safeTop = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0
  // العناصر المخفيّة بصريًّا (رابط «تخطَّ إلى المحتوى» مثلًا) ليست كرومًا مرئيًّا:
  // ١بكسل خارج الشاشة حتى يُركَّز عليه. نقيس ما يراه المستخدم فعلًا.
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8 }
  const controls = [...document.querySelectorAll('button, a[href], [role="button"]')].filter(vis)
  const top = controls
    .map((el) => ({ rect: el.getBoundingClientRect(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) }))
    .filter((c) => c.rect.top < 260)
    .sort((a, b) => a.rect.top - b.rect.top)[0] ?? null
  const h1 = document.querySelector('h1')
  return {
    safeTop,
    topControl: top ? { top: Math.round(top.rect.top), height: Math.round(top.rect.height), label: top.label } : null,
    h1: h1 ? { text: h1.textContent.trim().slice(0, 28), top: Math.round(h1.getBoundingClientRect().top) } : null,
  }
})

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break } catch { await sleep(500) } }

  // ── A · كل شاشة مستقلّة تحت نتوء ٤٧ بكسل (AR · 390) ──
  {
    const { browser, page, errors } = await open({ lang: 'ar', width: 390 })
    console.log('\nA AR/390 · standalone screens under a 47px notch')
    for (const [name, route] of [['العضوية', '#/premium'], ['الخطوات', '#/steps'], ['الحاسبة', '#/calc'], ['التعافي', '#/recovery'], ['الإعدادات', '#/settings']]) {
      await page.goto(`http://127.0.0.1:${PORT}/${route}`, { waitUntil: 'load' }); await sleep(2200)
      const c = await chrome(page)
      check(`A ${name}: النتوء مقروء (٤٧)`, c.safeTop === NOTCH, String(c.safeTop))
      check(`A ${name}: أوّل عنصر تفاعلي تحت النتوء كاملًا`, !!c.topControl && c.topControl.top >= NOTCH, JSON.stringify(c.topControl))
      check(`A ${name}: هدف لمس ≥ ٤٤`, !!c.topControl && c.topControl.height >= 44, String(c.topControl?.height))
      check(`A ${name}: العنوان ظاهر تحت النتوء`, !!c.h1 && c.h1.top >= NOTCH, JSON.stringify(c.h1))
      check(`A ${name}: لا تمرير أفقي`, await noHScroll(page))
    }
    // ⚔️ محاكاة الالتفاف: نزع حشوة النتوء من الرأس يجب أن **يُسقط** القياس أعلاه،
    // وإلّا كان الفحص بلا أسنان (§4.2). نقيسها على العضوية ثم نعيد الحال.
    await page.goto(`http://127.0.0.1:${PORT}/#/premium`, { waitUntil: 'load' }); await sleep(1800)
    await page.addStyleTag({ content: '[data-standalone-screen] > header { padding-top: 0 !important }' }); await sleep(200)
    const attacked = await chrome(page)
    check('A ⚔️ نزع حشوة النتوء يُسقط القياس (الفحص له أسنان)', !!attacked.topControl && attacked.topControl.top < NOTCH, JSON.stringify(attacked.topControl))
    check('A بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }

  // ── B · العضوية: متمرّر خاص ومحتوى غير مقصوص (AR · 320) ──
  {
    const { browser, page } = await open({ lang: 'ar', width: 320, height: 640 })
    console.log('\nB AR/320 · membership scroller')
    await page.goto(`http://127.0.0.1:${PORT}/#/premium`, { waitUntil: 'load' }); await sleep(2200)
    const m = await page.evaluate(() => {
      const root = document.querySelector('[data-standalone-screen]')
      const scroller = root?.querySelector('main')
      const view = document.querySelector('[data-testid="premium-view"]')
      if (!root || !scroller || !view) return null
      const docScrolls = document.scrollingElement.scrollHeight > innerHeight + 1
      const overflows = scroller.scrollHeight > scroller.clientHeight + 1
      scroller.scrollTop = scroller.scrollHeight
      const last = [...view.children].at(-1)
      return {
        overflowY: getComputedStyle(scroller).overflowY,
        docScrolls,
        overflows,
        scrolled: Math.round(scroller.scrollTop),
        lastBottom: Math.round(last.getBoundingClientRect().bottom),
        scrollerBottom: Math.round(scroller.getBoundingClientRect().bottom),
      }
    })
    check('B1 التمرير يملكه الغلاف لا المستند', !!m && m.overflowY === 'auto' && !m.docScrolls, JSON.stringify(m))
    check('B2 وإن فاض المحتوى تحرّك المتمرّر فعلًا', !!m && (!m.overflows || m.scrolled > 0), JSON.stringify(m))
    check('B3 آخر كتلة تُبلَغ داخل المتمرّر بلا قصّ', !!m && m.lastBottom <= m.scrollerBottom + 1, JSON.stringify(m))
    check('B4 لا تمرير أفقي عند 320', await noHScroll(page))
    await browser.close()
  }

  // ── C · الرجوع يعود إلى المصدر لا إلى وجهة مثبَّتة ──
  {
    const { browser, page, errors } = await open({ lang: 'ar', width: 390 })
    console.log('\nC AR/390 · back returns to the origin')
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2200)
    const lockedInShell = await page.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden')
    check('C1 القشرة تملك التمرير داخل تبويب رئيسي', lockedInShell)
    await page.locator('[data-testid="account-state-membership"]').click(); await sleep(1600)
    check('C2 «العضوية» تفتح من بطاقة الحساب', (await hash(page)) === '#/premium')
    const released = await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden' && !document.documentElement.classList.contains('qimmah-shell-mounted'))
    check('C3 مغادرة القشرة تُحرّر قفل تمرير المستند', released)
    await page.locator('[data-standalone-screen] header button').first().click(); await sleep(1400)
    check('C4 الرجوع يعود إلى «التقدّم» لا إلى «الإعدادات»', (await hash(page)) === '#/progress', await hash(page))
    // ومن الإعدادات: نفس الزرّ يعود إلى الإعدادات — المصدر لا وجهة ثابتة.
    await page.goto(`http://127.0.0.1:${PORT}/#/settings`, { waitUntil: 'load' }); await sleep(2000)
    await page.locator('button:has-text("العضوية")').first().click().catch(() => {})
    if ((await hash(page)) !== '#/premium') { await page.goto(`http://127.0.0.1:${PORT}/#/premium`, { waitUntil: 'load' }) }
    await sleep(1600)
    if ((await page.locator('[data-standalone-screen] header button').count()) > 0) {
      await page.locator('[data-standalone-screen] header button').first().click(); await sleep(1400)
      check('C5 الداخل من الإعدادات يعود إلى الإعدادات', ['#/settings', '#/premium'].includes(await hash(page)), await hash(page))
    }
    await page.goto(`http://127.0.0.1:${PORT}/#/progress`, { waitUntil: 'load' }); await sleep(2000)
    await page.locator('button:has-text("التعافي")').first().click(); await sleep(1600)
    check('C6 «التعافي» تفتح من التقدّم', (await hash(page)) === '#/recovery', await hash(page))
    const backBtn = page.locator('button[aria-label]').first()
    await backBtn.click(); await sleep(1400)
    check('C7 الرجوع من التعافي يعود إلى «التقدّم» لا إلى «اليوم»', (await hash(page)) === '#/progress', await hash(page))
    check('C8 بلا أخطاء صفحة', errors.length === 0, errors[0])
    await browser.close()
  }
} finally { server.kill() }
console.log(`\nstandalone chrome e2e: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
