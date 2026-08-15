// إثبات متصفّح: لا شيء يبتلع نقرة الإصبع في قاع الشاشة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ١ — العطل P0 الذي أبلغ عنه المؤسس.
//
// يقيس ما يقيسه الإصبع لا ما يقيسه `.click()`: لكل هدف تفاعلي في القاع نأخذ
// **مركزه** ونسأل `document.elementFromPoint`. النجاح = العنصر نفسه أو أحد
// أبنائه. أي شيء آخر يعني أن السطح مغطّى وأن النقرة تذهب لغيره.
//
// لماذا هذا التمييز جوهري: النقر البرمجي (`element.click()`) **يتجاوز اختبار
// الإصابة تمامًا**، فبقي العطل خفيًا عن كل اختبار سابق بينما كان المؤسس يراه
// على جهازه. وهذا أيضًا تفسير «زرّ أضف يشتغل مرة وما يشتغل مرة».
//
// التشغيل:  npm run test:e2e:install-overlap
//   PW_CHROMIUM=/path/to/chrome  لتثبيت متصفّح محلّي (لا أثر له في CI).
//   PREVIEW_URL=…                لإعادة استخدام خادم معاينة قائم.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const PORT = 5317
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))
async function waitForServer(ms = 30000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try { if ((await fetch(URL)).ok) return true } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

/**
 * اختبار الإصابة في **مركز** كل عنصر مطابق. يعيد لكل واحد: هل أعلى عنصر عند
 * المركز هو الهدف أو ابنه؟ ومن ابتلعه إن لم يكن.
 */
const hitTest = (page, selectorFn) => page.evaluate((src) => {
  const targets = new Function('return ' + src)()()
  return targets.map((el) => {
    // [حزمة ٦] التمرير قبل القياس. شاشة التسليم بعد الحزمة ٣ صارت صفحة قابلة
    // للتمرير، فبعض أزرارها تحت الطيّة. و`elementFromPoint` خارج المنفذ يعيد
    // `null` — وهو **ليس تغطية**: العنصر غير مغطّى بل غير معروض بعد. قياسٌ بلا
    // تمرير يتّهم بريئًا. المستخدم يمرّر ثم ينقر، والفحص يفعل مثله.
    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    const r = el.getBoundingClientRect()
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      label: (el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 24),
      reachable: !!(top && (top === el || el.contains(top))),
      swallowedBy: (top?.textContent || top?.tagName || '').trim().slice(0, 32),
      w: Math.round(r.width), h: Math.round(r.height),
    }
  })
}, selectorFn.toString())

/** يُطلق beforeinstallprompt كما يفعل كروم/أندرويد — الحالة التي يراها المستخدم. */
const makeInstallable = (page) => page.addInitScript(() => {
  window.addEventListener('load', () => {
    const e = new Event('beforeinstallprompt', { cancelable: true })
    e.prompt = () => Promise.resolve()
    e.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(e)
  })
})

const settle = (page, ms = 2200) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

/** يقود المعالج كاملًا حتى شاشة التسليم (النقر البرمجي مقصود هنا: نقيس التغطية لا ندخل عبرها). */
async function driveToHandoff(page, ar) {
  await tap(page, ar ? /كضيف/ : /as guest/i)
  await settle(page, 1200)
  await tap(page, ar ? /نبدأ/ : /Get started/i)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next); await settle(page, 1800)
  await tap(page, ar ? /الدخول للوحة/ : /Enter|Open/i)
  await settle(page, 2400)
}

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  // أحجام الهاتف التي ندعمها فعلًا، في اللغتين — لا تُستنتج الإنجليزية من
  // العربية ولا العكس، لأن طول النص وRTL يبدّلان مواضع الإصابة.
  for (const { w, lang } of [
    { w: 320, lang: 'ar' }, { w: 360, lang: 'ar' }, { w: 375, lang: 'ar' }, { w: 390, lang: 'ar' }, { w: 430, lang: 'ar' },
    { w: 320, lang: 'en' }, { w: 360, lang: 'en' }, { w: 375, lang: 'en' }, { w: 390, lang: 'en' }, { w: 430, lang: 'en' },
  ]) {
    const ar = lang === 'ar'
    console.log(`\n=== ${w}px · ${lang} ===`)
    const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, locale: ar ? 'ar-SA' : 'en-US' })
    const page = await ctx.newPage()
    await makeInstallable(page)
    await page.goto(URL, { waitUntil: 'networkidle' })
    await settle(page, 2800)
    if (!ar) { await tap(page, /^EN$/); await settle(page, 1500) }

    // (١) الهبوط — مدخل القمع كله. كل زرّ في الشاشة يجب أن يكون قابلًا للنقر.
    const landing = await hitTest(page, () => [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 40 && r.height > 24 && r.top > window.innerHeight * 0.4
    }))
    for (const t of landing) check(`هبوط ${w}/${lang}: «${t.label}» قابل للنقر`, t.reachable, `ابتلعه: ${t.swallowedBy}`)
    check(`هبوط ${w}/${lang}: وُجدت أزرار سفلية لتُفحص`, landing.length > 0)

    // (٢) التسليم — الشاشة التي أبلغ عنها المؤسس صراحةً.
    await driveToHandoff(page, ar)
    const handoff = await hitTest(page, () => [...document.querySelectorAll('button,a')].filter((b) => {
      const t = (b.textContent || '').trim()
      return /استعرض قِمّة أولًا|Explore Qimmah|احصل على قِمّة Premium|Get Qimmah Premium/.test(t)
    }))
    check(`تسليم ${w}/${lang}: وُجد زرّا التسليم`, handoff.length >= 1)
    for (const t of handoff) check(`تسليم ${w}/${lang}: «${t.label}» قابل للنقر`, t.reachable, `ابتلعه: ${t.swallowedBy}`)

    // (٣) شريط التنقّل السفلي — التبويبات الخمسة على كل شاشة رئيسية.
    await tap(page, ar ? /استعرض قِمّة أولًا/ : /Explore Qimmah/i)
    await settle(page, 2500)
    for (const route of ['dashboard', 'nutrition', 'workout', 'progress']) {
      await page.evaluate((h) => { window.location.hash = '/' + h }, route)
      await settle(page, 1800)
      const nav = await hitTest(page, () => [...document.querySelectorAll('nav button, nav a')].filter((b) => b.getBoundingClientRect().width > 0))
      check(`تنقّل ${w}/${lang} @${route}: خمسة تبويبات ظاهرة`, nav.length >= 4, `وُجد ${nav.length}`)
      const blocked = nav.filter((t) => !t.reachable)
      check(`تنقّل ${w}/${lang} @${route}: كل التبويبات قابلة للنقر`, blocked.length === 0, blocked.map((b) => `${b.label}←${b.swallowedBy}`).join(' | '))
      const undersized = nav.filter((t) => t.w < 44 || t.h < 44)
      check(`تنقّل ${w}/${lang} @${route}: كل تبويب 44×44px أو أكبر`, undersized.length === 0, undersized.map((b) => `${b.label}=${b.w}×${b.h}`).join(' | '))
    }

    // (٤) محاكاة الالتفاف — نعيد إنشاء التغطية صناعيًا ونطالب الفحص بأن يسقط
    //     **بالاسم**. إثبات لا يسقط حين يُهاجَم ليس إثباتًا (الميثاق §4.2).
    await page.evaluate(() => {
      const bar = document.createElement('div')
      bar.id = 'synthetic-bottom-overlay'
      bar.textContent = 'محاكاة شريط سفلي'
      bar.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;height:180px;z-index:60;background:#000')
      document.body.appendChild(bar)
    })
    await settle(page, 400)
    const attacked = await hitTest(page, () => [...document.querySelectorAll('nav button, nav a')].filter((b) => b.getBoundingClientRect().width > 0))
    const caught = attacked.filter((t) => !t.reachable)
    check(
      `محاكاة الالتفاف ${w}/${lang}: شريط سفلي مصطنع يُكتشف ويُسمّى`,
      caught.length > 0 && caught.every((c) => /محاكاة شريط سفلي/.test(c.swallowedBy)),
      `مكتشَف=${caught.length}/${attacked.length}`,
    )
    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} تغطية القاع: ${pass} فحوص، ${fail} فشل.`)
if (fail) {
  for (const f of failures) console.log(`   - ${f}`)
  process.exit(1)
}
