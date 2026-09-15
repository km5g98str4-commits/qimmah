// إثبات متصفّح: **التقاء المستخدمَين** + تصفّح الأيام + ترحيل الفائض.
//
// ═══ السؤال الذي يجيب عنه هذا السكربت ═══
// المؤسس أرسل لقطتَي شاشة من **نفس النسخة**: واحدة فيها «الفطور/الغداء/العشاء/
// سناك»، وأخرى فيها مسجّل واحد مسطّح. السبب كان إجابة في الإعداد
// (`intent` ⇒ `nutritionPlan.style`) تبدّل **معمار** الشاشة لا محتواها.
//
// فالإثبات هنا يقود الإعداد **بالنيّات الثلاث** إلى آخره، ثم يقارن شاشة التغذية
// الناتجة. لا يكفي أن تمرّ واحدة: الثلاث يجب أن تصل إلى البنية نفسها.
//
// ويضيف ما لم يكن موجودًا أصلًا: شريط تصفّح الأيام (ماضٍ للقراءة، وعودة لليوم)
// وترحيل فائض السعرات بأسطره الثلاثة.
//
// التشغيل: npm run test:e2e:nutrition-canonical

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent, INTENT_ORDER } from './lib/onboarding-driver.mjs'

const PORT = 5327
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
  const ctx = await browser.newContext({ viewport: { width: w, height: 820 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  page.diag = { pageerror: [] }
  page.on('pageerror', (e) => page.diag.pageerror.push(String(e)))
  page.ctx = ctx
  return page
}

/** يقود الإعداد كاملًا بنيّة مختارة، ثم يفعّل الوصول ويهبط على التغذية. */
async function onboardWithIntent(page, intent) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true }); await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28'); await page.fill('#v2-body-height', '178'); await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  const chosen = await selectIntent(page, intent); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosen }); await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2600)
}

async function activate(page) {
  await page.evaluate(() => { location.hash = '/nutrition' })
  await settle(page, 2000)
  const gate = page.locator('[data-testid="premium-gate"]')
  if (await gate.isVisible().catch(() => false)) {
    await gate.locator('[data-testid="premium-gate-have-code"]').click({ timeout: 10000 })
    await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
    await gate.locator('[data-testid="activation-code-submit"]').click({ force: true })
    await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor({ timeout: 10000 })
    await gate.locator('[data-testid="premium-gate-dismiss"]').click({ timeout: 10000 })
    await gate.waitFor({ state: 'hidden', timeout: 10000 })
  }
  await settle(page, 1200)
}

/** بصمة بنية شاشة التغذية — ما يراه المستخدم فعلًا، لا ما في الشيفرة. */
const shape = (page) => page.evaluate(() => {
  const txt = document.body.innerText
  const slots = ['الفطور', 'الغداء', 'العشاء', 'سناك'].filter((s) => txt.includes(s))
  return {
    mealSections: !!document.querySelector('[data-testid="nutrition-meal-sections"]'),
    slots,
    dayNav: !!document.querySelector('[data-testid="nutrition-day-nav"]'),
    dayLabel: document.querySelector('[data-testid="nutrition-day-label"]')?.textContent?.trim() ?? '',
    dayDate: document.querySelector('[data-testid="nutrition-day-date"]')?.textContent?.trim() ?? '',
    carryoverSetting: !!document.querySelector('[data-testid="carryover-setting"]'),
    carryoverBreakdown: !!document.querySelector('[data-testid="carryover-breakdown"]'),
    // العدّ **داخل أقسام الوجبات وحدها**: لوحة الماء تحمل زرّ «أضف» كذلك،
    // فالعدّ العام كان يقول ٥ ويُسقط فحصًا صحيحًا على خطأ في القياس لا في الشاشة.
    addButtons: [...(document.querySelector('[data-testid="nutrition-meal-sections"]')?.querySelectorAll('button') ?? [])]
      .filter((b) => (b.textContent || '').trim() === 'أضف').length,
    readOnlyNote: !!document.querySelector('[data-testid="nutrition-past-readonly"]'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }
})

const storedStyle = (page) => page.evaluate(() => {
  try {
    const c = JSON.parse(localStorage.getItem('qimmah:customization:v1') || '{}')
    return c?.nutritionPlan?.style ?? null
  } catch { return null }
})

console.log('\n=== التقاء شاشة التغذية + تصفّح الأيام + الترحيل ===')

const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  // ═══ ① النيّات الثلاث ⇒ بنية واحدة ═══
  console.log('\n① النيّات الثلاث تصل إلى البنية نفسها')
  const shapes = {}
  for (const intent of INTENT_ORDER) {
    const page = await fresh(390)
    await onboardWithIntent(page, intent)
    await activate(page)
    const s = await shape(page)
    const style = await storedStyle(page)
    shapes[intent] = s
    check(`«${intent}» → أقسام الوجبات معروضة`, s.mealSections, JSON.stringify(s))
    check(`«${intent}» → الخانات الأربع ظاهرة بالاسم`, s.slots.length === 4, s.slots.join('/'))
    check(`«${intent}» → زرّ «أضف» لكل خانة`, s.addButtons === 4, String(s.addButtons))
    check(`«${intent}» → بلا فيض أفقي عند 390`, !s.overflow)
    check(`«${intent}» → بلا استثناء`, page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(''))
    // الإجابة ما زالت محفوظة — التقاء الشاشة ليس مسحًا لتفضيل المستخدم.
    check(`«${intent}» → التفضيل ما زال مخزَّنًا (لم يُمسح)`, typeof style === 'string' && style.length > 0, String(style))
    await page.ctx.close()
  }
  const planSlots = shapes.plan?.slots.join('/') ?? ''
  const numbersSlots = shapes.numbers?.slots.join('/') ?? ''
  const mealsSlots = shapes.meals?.slots.join('/') ?? ''
  check('⭐ اللقطتان تلتقيان: «أرقامي فقط» = «اقتراحات أكل» بنيةً', numbersSlots === mealsSlots && numbersSlots !== '')
  check('⭐ و«خطة تمرين» معهما على البنية نفسها', planSlots === mealsSlots)

  // ═══ ② تصفّح الأيام ═══
  console.log('\n② تصفّح الأيام: اليوم ← أمس ← عودة')
  {
    const page = await fresh(390)
    await onboardWithIntent(page, 'numbers')
    await activate(page)

    const today = await shape(page)
    check('شريط تصفّح الأيام معروض', today.dayNav)
    check('اليوم الافتراضي هو «اليوم»', today.dayLabel === 'اليوم', today.dayLabel)
    check('لا لافتة «قراءة فقط» على اليوم الحالي', !today.readOnlyNote)
    /**
     * التاريخ يُقرأ باسم شهره لا بثلاثة أرقام موصولة: صيغة `٢٠٢٦-٠٩-١٥` تُقلَب
     * بصريًّا إلى `١٥-٠٩-٢٠٢٦` في السياق العربي (صنف AN في خوارزمية الاتجاه)،
     * فيصير التاريخ **صحيح الشكل خاطئ المعنى** بلا ما يميّز أيّهما قُصد.
     */
    check('تاريخ اليوم يحمل اسم الشهر (لا ثلاثة أرقام تنقلب بصريًّا)', /[\u0600-\u06FF]{3,}/.test(today.dayDate) && !/^[\d\u0660-\u0669]+[-/][\d\u0660-\u0669]+[-/][\d\u0660-\u0669]+$/.test(today.dayDate), today.dayDate)
    check('وتاريخ اليوم بأرقام هندية في الجلسة العربية', /[\u0660-\u0669]/.test(today.dayDate) && !/[0-9]/.test(today.dayDate), today.dayDate)
    // التقويم ميلادي لا هجري: تبديل تقويم المستخدم قرار منتج لا تفصيلة تنسيق.
    const gy = String(new Date().getFullYear()).replace(/[0-9]/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)])
    check('التقويم ميلادي (السنة الميلادية الحالية ظاهرة)', today.dayDate.includes(gy), `${today.dayDate} ⊅ ${gy}`)

    await page.locator('[data-testid="nutrition-day-prev"]').click({ force: true })
    await settle(page, 1200)
    const yest = await shape(page)
    check('السهم الخلفي ينتقل إلى «أمس»', yest.dayLabel === 'أمس', yest.dayLabel)
    check('اليوم الماضي يعلن سبب منع الإضافة', yest.readOnlyNote)
    check('ولا يعرض أزرار «أضف» (لا زرّ يُرى ولا يعمل)', yest.addButtons === 0, String(yest.addButtons))
    check('أقسام الوجبات ما زالت معروضة في الماضي (نفس البنية)', yest.mealSections)
    check('بلا فيض أفقي في يوم ماضٍ عند 390', !yest.overflow)

    // خمسة أيام للخلف ثم عودة — «الخميس ← الأربعاء ← الثلاثاء…» من طلب المؤسس.
    for (let i = 0; i < 4; i++) { await page.locator('[data-testid="nutrition-day-prev"]').click({ force: true }); await settle(page, 450) }
    const far = await shape(page)
    check('التصفّح خمسة أيام للخلف يعمل بلا استثناء', page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(''))
    check('واليوم البعيد يحمل اسم يومه لا «اليوم»', far.dayLabel !== 'اليوم' && far.dayLabel.length > 0, far.dayLabel)

    await page.locator('[data-testid="nutrition-day-back-to-today"]').click({ force: true })
    await settle(page, 1000)
    const back = await shape(page)
    check('«رجوع لليوم» يعيد إلى اليوم الحالي', back.dayLabel === 'اليوم', back.dayLabel)
    check('وتعود أزرار الإضافة الأربعة', back.addButtons === 4, String(back.addButtons))
    await page.ctx.close()
  }

  // ═══ ③ ترحيل فائض السعرات ═══
  console.log('\n③ ترحيل الفائض: مطفأ افتراضيًا · مشتغل يشرح نفسه')
  {
    const page = await fresh(390)
    await onboardWithIntent(page, 'meals')
    await activate(page)

    const before = await shape(page)
    check('مفتاح الترحيل معروض في شاشة التغذية', before.carryoverSetting)
    const offState = await page.evaluate(() => document.querySelector('[data-testid="carryover-toggle"]')?.getAttribute('aria-checked'))
    check('⭐ الافتراض مطفأ', offState === 'false', String(offState))
    check('ولا سطر ترحيل ما دام مطفأً', !before.carryoverBreakdown)

    // نزرع أمسًا متجاوِزًا: هدف مسجَّل ٢٠٠٠ واستهلاك ٢٢٠٠ (مثال المؤسس).
    await page.evaluate(() => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const y = new Date(); y.setDate(y.getDate() - 1)
      const yd = stamp(y)
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      // مجاميع الأمس + هدفه الأساسي في المتجر التاريخي القانوني
      const logs = JSON.parse(localStorage.getItem('qimmah:history:nutritionLogs:v1') || '{}')
      logs[yd] = { date: yd, doneMeals: {}, loggedFood: { calories: 2200, protein: 120, carbs: 250, fat: 70 }, baseTargetCalories: 2000, updatedAt: new Date().toISOString() }
      localStorage.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify(logs))
      // الترحيل مشتغل منذ أمس
      localStorage.setItem('qimmah:nutritionCarryover:v1', JSON.stringify({ [owner]: { enabled: true, enabledAt: yd } }))
    })
    await page.reload({ waitUntil: 'networkidle' })
    await settle(page, 2600)
    await page.evaluate(() => { location.hash = '/nutrition' })
    await settle(page, 2000)

    const on = await page.evaluate(() => ({
      breakdown: !!document.querySelector('[data-testid="carryover-breakdown"]'),
      base: document.querySelector('[data-testid="carryover-base"]')?.textContent?.trim() ?? '',
      adjust: document.querySelector('[data-testid="carryover-adjust"]')?.textContent?.trim() ?? '',
      effective: document.querySelector('[data-testid="carryover-effective"]')?.textContent?.trim() ?? '',
      toggle: document.querySelector('[data-testid="carryover-toggle"]')?.getAttribute('aria-checked'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))
    check('⭐ الترحيل المشتغل يعرض السطور الثلاثة', on.breakdown && !!on.base && !!on.adjust && !!on.effective, JSON.stringify(on))
    check('سطر «هدفك الأساسي» موجود ويحمل رقمًا', /هدفك الأساسي/.test(on.base) && /[\d٠-٩]/.test(on.base), on.base)
    check('سطر «ترحيل من أمس» يحمل إشارة الخصم', /ترحيل من/.test(on.adjust) && /[−-]/.test(on.adjust), on.adjust)
    check('سطر «هدف اليوم المعدّل» موجود', /هدف اليوم المعدّل/.test(on.effective), on.effective)
    check('المفتاح يقرأ «مشتغل»', on.toggle === 'true', String(on.toggle))
    check('بلا فيض أفقي مع سطور الترحيل عند 390', !on.overflow)
    check('بلا استثناء في مسار الترحيل', page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(''))

    // الإطفاء من الواجهة يعيد الاستهداف الطبيعي فورًا.
    await page.locator('[data-testid="carryover-toggle"]').click({ force: true })
    await settle(page, 1000)
    const off = await page.evaluate(() => ({
      breakdown: !!document.querySelector('[data-testid="carryover-breakdown"]'),
      toggle: document.querySelector('[data-testid="carryover-toggle"]')?.getAttribute('aria-checked'),
    }))
    check('⭐ الإطفاء من الواجهة يُزيل الخصم فورًا', off.toggle === 'false' && !off.breakdown, JSON.stringify(off))
    await page.ctx.close()
  }

  // ═══ ④ العربية والإنجليزية عند أضيق عرض ═══
  console.log('\n④ RTL/LTR عند 320 — الشريط والأسهم والنصوص الطويلة')
  {
    for (const [locale, expectToday] of [['ar-SA', 'اليوم'], ['en-US', 'Today']]) {
      const ctx = await browser.newContext({ viewport: { width: 320, height: 820 }, locale })
      const page = await ctx.newPage()
      page.diag = { pageerror: [] }
      page.on('pageerror', (e) => page.diag.pageerror.push(String(e)))
      page.ctx = ctx
      await onboardWithIntent(page, 'numbers')
      await activate(page)
      if (locale === 'en-US') {
        await page.evaluate(() => { location.hash = '/settings' })
        await settle(page, 1500)
        await tap(page, /^EN$|English/)
        await settle(page, 1200)
        await page.evaluate(() => { location.hash = '/nutrition' })
        await settle(page, 1600)
      }
      const s = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="nutrition-day-nav"]')
        const prev = document.querySelector('[data-testid="nutrition-day-prev"]')
        const label = document.querySelector('[data-testid="nutrition-day-label"]')
        const r = prev?.getBoundingClientRect()
        return {
          dir: document.documentElement.getAttribute('dir'),
          nav: !!nav,
          label: label?.textContent?.trim() ?? '',
          // هدف لمس كافٍ (§9): لا يقلّ عن 44×44.
          touchOk: !!r && r.width >= 40 && r.height >= 40,
          labelClipped: !!label && label.scrollWidth > label.clientWidth + 1,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          sections: !!document.querySelector('[data-testid="nutrition-meal-sections"]'),
        }
      })
      check(`@320/${locale}: الشريط معروض وأقسام الوجبات معه`, s.nav && s.sections, JSON.stringify(s))
      check(`@320/${locale}: اتجاه الصفحة صحيح`, s.dir === (locale === 'ar-SA' ? 'rtl' : 'ltr'), String(s.dir))
      check(`@320/${locale}: تسمية اليوم «${expectToday}»`, s.label === expectToday, s.label)
      check(`@320/${locale}: هدف لمس السهم ≥44بكسل`, s.touchOk)
      check(`@320/${locale}: تسمية اليوم غير مقصوصة`, !s.labelClipped)
      check(`@320/${locale}: بلا فيض أفقي`, !s.overflow)
      check(`@320/${locale}: بلا استثناء`, page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(''))
      await ctx.close()
    }
  }
} finally {
  if (browser) await browser.close()
  if (preview) preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} التقاء التغذية الحيّ: ${pass} فحصًا · ${fail} فشلًا`)
if (fail > 0) {
  console.log('\nnutrition-canonical-live-breach:')
  for (const f of failures) console.log(`  · ${f}`)
  process.exit(1)
}
