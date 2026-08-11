// إثبات متصفّح: موثوقية التغذية — العطل P0-B الذي أبلغ عنه المؤسس، والنيّة، والقصّ.
// [QIM-WEB-FOUNDER-UX-004] الحزمة ٤.
//
// ثلاثة أشياء يحرسها هذا السكربت:
//   ١) **تغطية انحدار حول Today → Nutrition** بكل الحالات التي عدّدها المؤسس.
//      انهيار المؤسس **لم يتكرّر** على هذا الفرع (١٨ سيناريو، صفر انهيار)، ولم
//      يُخترع له سبب. هذه التغطية تجعل أي انهيار قادم يسقط هنا لا على جهازه.
//   ٢) نيّة التسجيل السريع تُستهلك في المسار **الحيّ**: فتحة واحدة، وتُمسح، ولا
//      يعيدها التحديث، والقيمة المجهولة تُتجاهَل بأمان.
//   ٣) وسوم الماكروز لا تُقصّ عند أي عرض — والعطل كان نقطة توقّف تسأل عن
//      النافذة بينما الحاوية مقفولة على 448بكسل.
//
// التشغيل: npm run test:e2e:nutrition

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5323
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const INTENT_KEY = 'qimmah:quick-log-intent'

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

const settle = (page, ms = 1800) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

let browser
async function fresh(w = 390) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  page.diag = { console: [], pageerror: [] }
  page.on('console', (m) => { if (m.type() === 'error') page.diag.console.push(m.text()) })
  page.on('pageerror', (e) => page.diag.pageerror.push(String(e)))
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', (e) => { (window.__rej = window.__rej || []).push(String(e.reason)) })
  })
  page.ctx = ctx
  return page
}

/** هل ظهرت شاشة خطأ من أي نوع؟ نصّها هو نصّ المؤسس حرفيًا. */
const errorState = (page) => page.evaluate(() => ({
  routeCard: !!document.querySelector('[data-testid="route-error-card"]'),
  copy: /صار خطأ غير متوقّع|صار خلل بسيط|ما قدرنا نحمّل/.test(document.body.innerText),
  rejections: (window.__rej || []).length,
  snippet: document.body.innerText.slice(0, 90).replace(/\n+/g, ' | '),
}))

async function onboardToPreview(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await tap(page, /كضيف/); await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28'); await page.fill('#v2-body-height', '178'); await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await next(); await page.waitForSelector('#onb-title-goal', { timeout: 20000 })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next(); await page.waitForSelector('#onb-title-equipment', { timeout: 20000 })
  const tiles = page.locator('button[aria-pressed]')
  await tiles.nth(0).click({ force: true }); await tiles.nth(3).click({ force: true })
  await next(); await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await tap(page, /استعرض قِمّة أولًا/)
  await settle(page, 2600)
}

const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  // ═══ ١) تغطية انحدار Today → Nutrition بكل حالات المؤسس ═══
  console.log('\n=== Today → Nutrition — حالات المؤسس ===')
  const SCENARIOS = [
    ['نقر تبويب التغذية من اليوم', async (p) => { await p.evaluate(() => { location.hash = '/dashboard' }); await settle(p, 1800); await tap(p, /التغذية/) }],
    ['مسار hash مباشر', async (p) => { await p.evaluate(() => { location.hash = '/dashboard' }); await settle(p, 1400); await p.evaluate(() => { location.hash = '/nutrition' }) }],
    ['بعد إعادة تحميل على التغذية', async (p) => { await p.evaluate(() => { location.hash = '/nutrition' }); await settle(p, 1600); await p.reload({ waitUntil: 'networkidle' }) }],
    ['نيّة تسجيل معلّقة', async (p) => { await p.evaluate(() => { location.hash = '/dashboard' }); await settle(p, 1800); await tap(p, /سجّل وجبة/) }],
    ['نيّة بائتة مزروعة', async (p) => { await p.evaluate((k) => { sessionStorage.setItem(k, 'meal') }, INTENT_KEY); await p.evaluate(() => { location.hash = '/nutrition' }) }],
    ['نيّة بقيمة مجهولة', async (p) => { await p.evaluate((k) => { sessionStorage.setItem(k, '{{bogus}}') }, INTENT_KEY); await p.evaluate(() => { location.hash = '/nutrition' }) }],
    ['تنقّل متكرّر اليوم↔التغذية', async (p) => { for (let i = 0; i < 6; i++) { await p.evaluate(() => { location.hash = '/dashboard' }); await settle(p, 500); await p.evaluate(() => { location.hash = '/nutrition' }); await settle(p, 500) } }],
    ['مخزن اليوم تالف', async (p) => { await p.evaluate(() => { localStorage.setItem('qimmah:nutrition:v2', '{"foods":"not-an-array","waterMl":"x"}') }); await p.evaluate(() => { location.hash = '/nutrition' }) }],
    ['التخصيص بلا targets/nutritionPlan', async (p) => { await p.evaluate(() => { const k = 'qimmah:customization:v1'; const c = JSON.parse(localStorage.getItem(k) || '{}'); delete c.targets; delete c.nutritionPlan; localStorage.setItem(k, JSON.stringify(c)) }); await p.reload({ waitUntil: 'networkidle' }); await settle(p, 2000); await p.evaluate(() => { location.hash = '/nutrition' }) }],
  ]
  for (const w of [320, 390]) {
    for (const [name, run] of SCENARIOS) {
      const page = await fresh(w)
      await onboardToPreview(page)
      await run(page)
      await settle(page, 2400)
      const e = await errorState(page)
      const bad = e.routeCard || e.copy || e.rejections > 0 || page.diag.pageerror.length > 0
      check(`@${w} ${name}: بلا شاشة خطأ ولا استثناء`, !bad, `${e.snippet} · pageerror=${page.diag.pageerror.slice(0, 1)}`)
      await page.ctx.close()
    }
  }

  // ═══ ٢) نيّة التسجيل السريع — تُستهلك في المسار الحيّ ═══
  console.log('\n=== نيّة التسجيل السريع ===')
  {
    const page = await fresh(390)
    await onboardToPreview(page)
    await page.evaluate(() => { location.hash = '/dashboard' })
    await settle(page, 2000)
    const clicked = await tap(page, /سجّل وجبة/)
    await settle(page, 2600)
    const after = await page.evaluate((k) => ({
      hash: location.hash,
      intent: sessionStorage.getItem(k),
      gate: !!document.querySelector('[data-testid="premium-gate"]'),
    }), INTENT_KEY)
    check('«سجّل وجبة» موجود على اليوم', clicked)
    check('النيّة تنقل إلى التغذية', after.hash.includes('nutrition'), after.hash)
    check('النيّة تُمسح بعد الاستهلاك (لا تبقى عالقة)', after.intent === null, String(after.intent))
    // معاينة: النيّة تقود إلى البوّابة لا إلى لوحة التسجيل — لا باب خلفي للطفرة.
    check('في المعاينة: النيّة تفتح بوّابة Premium لا مسجّل الأكل', after.gate)
    // إعادة التحميل لا تعيد الفتح إلى الأبد.
    await page.reload({ waitUntil: 'networkidle' })
    await settle(page, 2600)
    const reloaded = await page.evaluate((k) => ({
      intent: sessionStorage.getItem(k),
      gate: !!document.querySelector('[data-testid="premium-gate"]'),
    }), INTENT_KEY)
    check('إعادة التحميل لا تُعيد فتح النيّة', reloaded.intent === null && !reloaded.gate, JSON.stringify(reloaded))
    await page.ctx.close()
  }

  // ═══ ٣) زرّ «أضف» — النقر الحقيقي بعد إزالة الشريط (الحزمة ١) ═══
  console.log('\n=== زرّ «أضف» — نقر حقيقي ===')
  for (const w of [320, 390]) {
    const page = await fresh(w)
    // نجعل التثبيت متاحًا: كان الشريط هو المعترض المؤكَّد قبل الحزمة ١.
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const e = new Event('beforeinstallprompt', { cancelable: true })
        e.prompt = () => Promise.resolve(); e.userChoice = Promise.resolve({ outcome: 'dismissed' })
        window.dispatchEvent(e)
      })
    })
    await onboardToPreview(page)
    await page.evaluate(() => { location.hash = '/nutrition' })
    await settle(page, 2400)
    const hits = await page.evaluate(() => {
      const out = []
      for (const b of document.querySelectorAll('button')) {
        if ((b.textContent || '').trim() !== 'أضف') continue
        b.scrollIntoView({ block: 'center' })
        const r = b.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        out.push({ reachable: !!(top && (top === b || b.contains(top))), hit: (top?.textContent || '').slice(0, 26), h: Math.round(r.height) })
      }
      return out
    })
    check(`@${w}: أزرار «أضف» موجودة`, hits.length > 0, String(hits.length))
    const blocked = hits.filter((x) => !x.reachable)
    check(`@${w}: كل أزرار «أضف» تستقبل النقر الحقيقي`, blocked.length === 0, blocked.map((b) => b.hit).join(' | '))
    check(`@${w}: هدف لمس «أضف» ≥44بكسل`, hits.every((x) => x.h >= 44), hits.map((x) => x.h).join(','))
    // نقرة حقيقية بالماوس (لا element.click) على أول «أضف».
    const first = page.locator('button', { hasText: /^أضف$/ }).first()
    await first.scrollIntoViewIfNeeded()
    await first.click({ timeout: 8000 })
    await settle(page, 1400)
    check(`@${w}: النقر الحقيقي على «أضف» يفتح بوّابة Premium (معاينة)`, await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false))
    await page.ctx.close()
  }

  // ═══ ٤) وسوم الماكروز — بلا قصّ عند أي عرض، بالعربية والإنجليزية ═══
  console.log('\n=== وسوم الماكروز ===')
  for (const w of [320, 390, 640, 768, 894, 1280]) {
    for (const lang of ['ar', 'en']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, locale: lang === 'ar' ? 'ar-SA' : 'en-US' })
      const page = await ctx.newPage()
      page.diag = { console: [], pageerror: [] }
      await page.goto(URL, { waitUntil: 'networkidle' })
      await settle(page, 2600)
      if (lang === 'en') { await tap(page, /^EN$/); await settle(page, 1400) }
      await tap(page, lang === 'ar' ? /كضيف/ : /as guest/i); await settle(page, 1200)
      await tap(page, lang === 'ar' ? /نبدأ/ : /Get started/i)
      await page.waitForSelector('#v2-body-age', { timeout: 25000 })
      await page.locator('input[type=checkbox]').first().check({ force: true })
      await page.fill('#v2-body-age', '28'); await page.fill('#v2-body-height', '178'); await page.fill('#v2-body-weight', '82')
      await page.locator('button[aria-pressed]').first().click({ force: true })
      const next = () => page.locator('footer button').last().click({ force: true })
      await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
      const rows = page.locator('button[aria-pressed]')
      await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
      await next(); await page.waitForSelector('#onb-title-goal', { timeout: 20000 })
      await page.locator('button[aria-pressed]').first().click({ force: true })
      await next(); await page.waitForSelector('#onb-title-training', { timeout: 20000 })
      await next(); await page.waitForSelector('#onb-title-equipment', { timeout: 20000 })
      const tiles = page.locator('button[aria-pressed]')
      await tiles.nth(0).click({ force: true }); await tiles.nth(3).click({ force: true })
      await next(); await settle(page, 1600)
      await tap(page, lang === 'ar' ? /الدخول للوحة/ : /Enter|Open/i)
      await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
      await tap(page, lang === 'ar' ? /استعرض قِمّة أولًا/ : /Explore Qimmah/i)
      await settle(page, 2400)
      await page.evaluate(() => { location.hash = '/nutrition' })
      await settle(page, 2400)
      const res = await page.evaluate(() => {
        const labels = []
        for (const p of document.querySelectorAll('p')) {
          const t = (p.textContent || '').trim()
          if (!/^(بروتين|كارب|كاربوهيدرات|دهون|ماء|Protein|Carbs|Fat|Water)$/.test(t)) continue
          labels.push({ t, cw: Math.round(p.clientWidth), sw: Math.round(p.scrollWidth), clipped: p.scrollWidth > p.clientWidth + 1 })
        }
        return { labels, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
      })
      check(`@${w}/${lang}: الوسوم الأربعة موجودة`, res.labels.length === 4, JSON.stringify(res.labels.map((l) => l.t)))
      const bad = res.labels.filter((l) => l.clipped)
      check(`@${w}/${lang}: لا قصّ في أي وسم`, bad.length === 0, bad.map((b) => `${b.t}(${b.cw}/${b.sw})`).join(', '))
      // تأكيد مضادّ ضدّ «المرور الفارغ»: وسمٌ مخفي أو بلا محتوى يعطي 0/0 فيمرّ
      // فحص القصّ (`sw <= cw`) بلا معنى. فنطالب بعرض حقيقي > 0 للصندوق وللنصّ.
      //
      // ⚠️ لا نطالب بعتبة بكسلات ثابتة: الصندوق `min-w-0` يتقلّص ليطابق النصّ،
      // فـ«ماء» تعطي 15بكسل **وهي سليمة تمامًا** (15=15، بلا قصّ). عتبة ≥20 كانت
      // تُسقط وسمًا صحيحًا أربع عشرة مرّة — فحصٌ يقيس قِصَر الكلمة لا العطل.
      check(`@${w}/${lang}: كل وسم مرسوم بعرض حقيقي (لا صندوق فارغ)`, res.labels.every((l) => l.cw > 0 && l.sw > 0), res.labels.map((l) => `${l.t}:${l.cw}/${l.sw}`).join(','))
      // ونطالب صراحةً بأن النصّ المعروض هو الكلمة كاملة — مقارنةً بالمتوقَّع.
      const expected = lang === 'ar' ? ['بروتين', 'كارب', 'دهون', 'ماء'] : ['Protein', 'Carbs', 'Fat', 'Water']
      check(`@${w}/${lang}: الكلمات كاملة لا مبتورة`, expected.every((e) => res.labels.some((l) => l.t === e)), res.labels.map((l) => l.t).join(','))
      check(`@${w}/${lang}: بلا فيض أفقي`, !res.overflow)
      await ctx.close()
    }
  }
} finally {
  if (browser) await browser.close()
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} موثوقية التغذية: ${pass} فحوص، ${fail} فشل.`)
if (fail) {
  for (const f of failures) console.log(`   - ${f}`)
  process.exit(1)
}
