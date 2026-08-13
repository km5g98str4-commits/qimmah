// إثبات متصفّح: عقد التنقّل والتاريخ.
// [QIM-WEB-FOUNDER-UX-006] الحزمة ٦.
//
// كل ما يُفحَص هنا كان معطلًا مقيسًا على البناء المعتمد:
//   • `#/signup` و`#/forgot-password` ⇒ صفحة ٤٠٤ (لم يكونا مسارين أصلًا).
//   • التبديل login⇄signup لا يحرّك العنوان، و«رجوع» يُفرّغ الـhash فيخرج
//     المستخدم من شاشة الحساب كلها.
//   • ضيف **مكتمل** يضغط «كمّل كضيف» فيهبط على `#/setup` — محرّر الخطة.
//   • فتح تفصيل تمرين لا يدفع مدخل تاريخ، فـ«رجوع» يقفز خارج المكتبة.
//
// التشغيل: npm run test:e2e:navigation

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const PORT = 5325
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
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const settle = (page, ms = 1700) => page.waitForTimeout(ms)
const hash = (page) => page.evaluate(() => window.location.hash)
/**
 * ⚠️ يطابق النصّ **أو** `aria-label`: أزرار الرجوع في هذا المستودع أيقونات بلا
 * نصّ (`aria-label="رجوع"`). أول نسخة طابقت النصّ وحده فبدت شاشات الخصوصية
 * والشروط والمعالج بلا مخرج رجوع — **وهي تملكه**. عيب قياس لا عيب منتج.
 */
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find(
    (b) => rx.test((b.textContent || '').trim()) || rx.test(b.getAttribute('aria-label') || ''),
  )
  if (!el) return false
  el.click()
  return true
}, re.source)
const is404 = (page) => page.evaluate(() => /الصفحة غير موجودة|Page not found/i.test(document.body.innerText))

let browser
async function fresh(w = 390, lang = 'ar') {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, locale: lang === 'ar' ? 'ar-SA' : 'en-US' })
  const page = await ctx.newPage()
  page.errs = []
  page.on('pageerror', (e) => page.errs.push(String(e)))
  page.ctx = ctx
  return page
}

async function onboardToPreview(page, ar = true) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  if (!ar) { await tap(page, /^EN$/); await settle(page, 1400) }
  await tap(page, ar ? /كضيف/ : /as guest/i); await settle(page, 1200)
  await tap(page, ar ? /نبدأ/ : /Get started/i)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28'); await page.fill('#v2-body-height', '178'); await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next)
  await settle(page, 1600)
  await tap(page, ar ? /الدخول للوحة/ : /Enter|Open/i)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await tap(page, ar ? /استعرض قِمّة أولًا/ : /Explore Qimmah/i)
  await settle(page, 2400)
}

const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  // ═══ ١) مسارات الحساب الثلاثة — رابط مباشر، تحديث، رجوع، تقدّم ═══
  for (const lang of ['ar', 'en']) {
    for (const w of [320, 390, 1280]) {
      const tag = `${w}/${lang}`
      const page = await fresh(w, lang)
      for (const route of ['login', 'signup', 'forgot']) {
        await page.goto(`${URL}#/${route}`, { waitUntil: 'networkidle' })
        await settle(page, 2400)
        check(`${tag}: #/${route} رابط مباشر يعمل (لا ٤٠٤)`, !(await is404(page)) && (await hash(page)).includes(route), await hash(page))
        await page.reload({ waitUntil: 'networkidle' })
        await settle(page, 2400)
        check(`${tag}: #/${route} يبقى بعد التحديث`, (await hash(page)).includes(route), await hash(page))
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
        check(`${tag}: #/${route} بلا فيض أفقي`, !overflow)
      }
      await page.ctx.close()
    }
  }

  // ═══ ٢) التبديل بين أوضاع الحساب يحرّك العنوان، والرجوع يمشي في التاريخ ═══
  {
    const page = await fresh()
    await page.goto(`${URL}#/login`, { waitUntil: 'networkidle' })
    await settle(page, 2400)
    const atLogin = await hash(page)
    await tap(page, /افتح حساب|ما عندك حساب/)
    await settle(page, 1500)
    const atSignup = await hash(page)
    check('login → signup يغيّر العنوان', atSignup.includes('signup') && atSignup !== atLogin, `${atLogin} → ${atSignup}`)

    await tap(page, /سجّل الدخول|عندك حساب/)
    await settle(page, 1500)
    check('signup → login يغيّر العنوان عودةً', (await hash(page)).includes('login'), await hash(page))

    await page.goto(`${URL}#/login`, { waitUntil: 'networkidle' }); await settle(page, 2200)
    await tap(page, /نسيت كلمة المرور/)
    await settle(page, 1500)
    check('«نسيت كلمة المرور» له عنوانه', (await hash(page)).includes('forgot'), await hash(page))

    // رجوع/تقدّم حقيقيان — ولا hash فارغ (العطل المقيس سابقًا).
    await page.goBack(); await settle(page, 1600)
    const back1 = await hash(page)
    check('الرجوع من forgot يعود إلى شاشة حساب لا إلى فراغ', back1.length > 1 && /login|signup/.test(back1), back1)
    await page.goForward(); await settle(page, 1600)
    check('التقدّم يعيد forgot', (await hash(page)).includes('forgot'), await hash(page))
    check('لا أخطاء أثناء تنقّل الحساب', page.errs.length === 0, page.errs.slice(0, 1).join())
    await page.ctx.close()
  }

  // ═══ ٣) الاسم في إنشاء الحساب — الفراغ وحده غير صالح ═══
  {
    const page = await fresh()
    await page.goto(`${URL}#/signup`, { waitUntil: 'networkidle' })
    await settle(page, 2400)
    // يملأ النموذج كاملًا — **بما فيه مربّع أهلية العمر**. إغفاله يُبقي الإرسال
    // معطّلًا لسبب آخر تمامًا، فيبدو تحقّق الاسم فاشلًا وهو سليم.
    const submitState = async (name) => page.evaluate((n) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      const inputs = [...document.querySelectorAll('input')]
      const put = (el, v) => { if (!el) return; setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
      put(inputs.find((i) => i.type === 'text'), n)
      put(inputs.find((i) => i.type === 'email'), 'a@b.co')
      put(inputs.find((i) => i.type === 'password'), 'Str0ng!Passw0rd')
      const box = inputs.find((i) => i.type === 'checkbox')
      if (box && !box.checked) box.click()
      return true
    }, name)
    const submitDisabled = () => page.evaluate(() => {
      const b = document.querySelector('button[type=submit]')
      return !b || b.disabled || b.getAttribute('aria-disabled') === 'true'
    })
    await submitState('   ')
    await settle(page, 900)
    check('اسم من فراغات فقط ⇒ لا يمكن الإرسال', await submitDisabled())
    await submitState(' زياد ')
    await settle(page, 900)
    check('اسم حقيقي بفراغات حوله ⇒ الإرسال متاح', !(await submitDisabled()))
    await page.ctx.close()
  }

  // ═══ ٤) الضيف العائد — Today لا محرّر الخطة ═══
  {
    const page = await fresh()
    await onboardToPreview(page)
    await page.goto(URL, { waitUntil: 'networkidle' })
    await settle(page, 2800)
    const clicked = await tap(page, /كضيف/)
    await settle(page, 2600)
    const landed = await hash(page)
    check('ضيف مكتمل: «كمّل كضيف» موجود', clicked)
    check('ضيف مكتمل ⇒ اليوم لا محرّر الخطة', landed.includes('dashboard') && !landed.includes('setup'), landed)
    await page.ctx.close()
  }
  {
    // وضيف جديد ما زال يذهب إلى الأسئلة — الإصلاح لم يقلب الحالة الأخرى.
    const page = await fresh()
    await page.goto(URL, { waitUntil: 'networkidle' })
    await settle(page, 2600)
    await tap(page, /كضيف/)
    await settle(page, 2200)
    check('ضيف جديد ⇒ الأسئلة (setup)', (await hash(page)).includes('setup'), await hash(page))
    await page.ctx.close()
  }

  // ═══ ٥) تفصيل التمرين — رابط عميق وتاريخ ═══
  {
    const page = await fresh()
    await onboardToPreview(page)
    await page.evaluate(() => { window.location.hash = '/exercises' })
    await settle(page, 2600)
    const libHash = await hash(page)
    // بطاقة تمرين حقيقية: زرّ داخل قائمة المكتبة يحمل اسمًا — لا أي زرّ في الصفحة
    // (المرشّحات والتبويبات أزرار أيضًا، وأولها ليس تمرينًا).
    const opened = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('li button, ul button, [data-testid*=exercise] button')]
        .filter((b) => (b.textContent || '').trim().length > 3 && !b.getAttribute('aria-selected'))
      const card = cards[cards.length > 3 ? 3 : 0]
      if (!card) return null
      card.click()
      return true
    })
    await settle(page, 1800)
    const detailHash = await hash(page)
    check('فتح التفصيل يدفع مدخل تاريخ بمعرّف', !!opened && /#\/exercises\/.+/.test(detailHash), `${libHash} → ${detailHash}`)

    await page.goBack(); await settle(page, 1800)
    check('الرجوع من التفصيل يعود إلى المكتبة', (await hash(page)) === '#/exercises', await hash(page))
    await page.goForward(); await settle(page, 1800)
    check('التقدّم يعيد نفس التمرين', (await hash(page)) === detailHash, await hash(page))

    await page.reload({ waitUntil: 'networkidle' }); await settle(page, 2800)
    check('تحديث التفصيل يبقي نفس التمرين', (await hash(page)) === detailHash, await hash(page))
    check('التفصيل مرسوم بعد التحديث (رابط عميق حقيقي)', await page.evaluate(() => !!document.querySelector('[role=dialog], .fixed')))

    // معرّف مجهول ⇒ يهبط على المكتبة بلا انهيار ولا ٤٠٤.
    await page.evaluate(() => { window.location.hash = '/exercises/not-a-real-exercise' })
    await settle(page, 2400)
    check('معرّف مجهول ⇒ المكتبة بأمان', (await hash(page)) === '#/exercises' && !(await is404(page)), await hash(page))
    check('لا أخطاء أثناء تنقّل التمارين', page.errs.length === 0, page.errs.slice(0, 1).join())
    await page.ctx.close()
  }

  // ═══ ٦) استئناف الـOnboarding — إثبات انحدار (السلوك القائم صحيح) ═══
  {
    const page = await fresh()
    await page.goto(URL, { waitUntil: 'networkidle' }); await settle(page, 2600)
    await tap(page, /كضيف/); await settle(page, 1200)
    await tap(page, /نبدأ/)
    await page.waitForSelector('#v2-body-age', { timeout: 25000 })
    await page.locator('input[type=checkbox]').first().check({ force: true })
    await page.fill('#v2-body-age', '31'); await page.fill('#v2-body-height', '175'); await page.fill('#v2-body-weight', '80')
    await page.locator('button[aria-pressed]').first().click({ force: true })
    await page.locator('footer button').last().click({ force: true })
    await page.waitForSelector('#onb-title-intent', { timeout: 20000 })

    await page.reload({ waitUntil: 'networkidle' }); await settle(page, 3000)
    const resumed = await page.evaluate(() => ({
      step: !!document.querySelector('#onb-title-intent'),
      anyStep: !!document.querySelector('#v2-body-age, #onb-title-intent, #onb-title-goal'),
      hash: location.hash,
    }))
    check('التحديث في منتصف الأسئلة يستأنف الخطوة نفسها', resumed.step, JSON.stringify(resumed))
    // والإجابات محفوظة: الرجوع لخطوة الجسد يجب أن يعرض ما كُتب.
    await tap(page, /رجوع|Back/)
    await settle(page, 1500)
    const kept = await page.evaluate(() => {
      const age = document.querySelector('#v2-body-age')
      const h = document.querySelector('#v2-body-height')
      const w = document.querySelector('#v2-body-weight')
      return { age: age?.value ?? '', h: h?.value ?? '', w: w?.value ?? '' }
    })
    check('الإجابات محفوظة بعد التحديث', kept.age === '31' && kept.h === '175' && kept.w === '80', JSON.stringify(kept))
    await page.ctx.close()
  }

  // ═══ ٧) لا ٤٠٤ لأي مسار مُعلَن، ولا #/setup غير متوقّع ═══
  {
    const page = await fresh()
    await onboardToPreview(page)
    const ROUTES = ['dashboard', 'workout', 'exercises', 'nutrition', 'progress', 'profile', 'settings', 'privacy', 'terms', 'contact', 'calc', 'stats', 'steps', 'recovery', 'login', 'signup', 'forgot']
    for (const r of ROUTES) {
      await page.evaluate((h) => { window.location.hash = '/' + h }, r)
      await settle(page, 1400)
      const h = await hash(page)
      check(`#/${r}: لا ٤٠٤ ولا قفزة إلى محرّر الخطة`, !(await is404(page)) && !h.includes('setup'), h)
    }
    // ومسار غير مُعلَن ما زال يعطي ٤٠٤ بصدق — وإلا كان الفحص أعلاه بلا معنى.
    await page.evaluate(() => { window.location.hash = '/definitely-not-a-route' })
    await settle(page, 1800)
    check('مسار غير مُعلَن ما زال يعطي ٤٠٤ (تأكيد مضادّ)', await is404(page))
    await page.ctx.close()
  }

  // ═══ ٨) قشرة الإعدادات — سياق التطبيق محفوظ ═══
  {
    const page = await fresh()
    await onboardToPreview(page)
    for (const [route, expectNav] of [['settings', true], ['privacy', false], ['terms', false]]) {
      await page.evaluate((h) => { window.location.hash = '/' + h }, route)
      await settle(page, 2000)
      const shell = await page.evaluate(() => ({
        nav: !!document.querySelector('nav'),
        // نفس درس `tap`: أزرار الرجوع أيقونات بلا نصّ، وتُعرَّف بـ`aria-label`.
        back: [...document.querySelectorAll('button')].some(
          (b) => /رجوع|Back/i.test(b.textContent || '') || /رجوع|Back/i.test(b.getAttribute('aria-label') || ''),
        ),
      }))
      if (expectNav) check(`#/${route}: يحتفظ بسياق تنقّل التطبيق`, shell.nav || shell.back, JSON.stringify(shell))
      else check(`#/${route}: صفحة وثيقة بمخرج رجوع واضح`, shell.back || shell.nav, JSON.stringify(shell))
    }
    await page.ctx.close()
  }
} finally {
  if (browser) await browser.close()
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} التنقّل والتاريخ: ${pass} فحوص، ${fail} فشل.`)
if (fail) {
  for (const f of failures) console.log(`   - ${f}`)
  process.exit(1)
}
