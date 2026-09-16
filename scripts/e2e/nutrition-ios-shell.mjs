// إثبات متصفّح: شاشة التغذية داخل **قشرة بمواصفات iPhone** (PWA مستقلّ).
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️  تصريح المحرّك — يُقرأ قبل أي نتيجة أدناه
// ═══════════════════════════════════════════════════════════════════════════
// هذا السكربت يعمل على **Chromium** بمواصفات جهاز iPhone 14 Pro (مقاس الشاشة ·
// كثافة البكسل · اللمس · هوية متصفّح الجوال) مع حقن مسافات الأمان
// (`--safe-top` / `--safe-bottom`) بقيم الجهاز — وهو نفس أسلوب
// `scripts/e2e/standalone-chrome.mjs` القائم.
//
// وهو **ليس**:
//   • جهازًا حقيقيًّا،
//   • ولا محرّك WebKit/Safari،
//   • ولا وضع `display-mode: standalone` حقيقيًّا: نسخة Chromium في هذه الحاوية
//     لا تستجيب لـ`Emulation.setEmulatedMedia` بميزة `display-mode` (قِيس:
//     `(display-mode: standalone)` يبقى `false` بعد الأمر بكل صيغه). فالادّعاء
//     أُسقط بدل أن يُمرَّر فحصٌ كاذب — والمقيس هو **قشرة الجهاز** لا وسم النافذة.
//
// السبب مقيس لا مُفترَض: WebKit **غير مثبَّت** في هذه الحاوية، وتنزيله محجوب
// بالوكيل (`playwright.download.prss.microsoft.com` ⇒ HTTP 403: «no rule or
// allowlist entry allows host»). وهذه الفجوة بعينها مسجّلة من قبل في رأس
// `scripts/e2e/lib/engine.mjs`: التحقّق على Safari إجراء مطلوب قبل الإنتاج
// وتعذّر لأن الحاوية لا تحمل WebKit. فما دون ذلك يُقال بحدّه لا بأكثر منه.
//
// ما **يقيسه** هذا السكربت فعلًا وبصدق: التخطيط عند مقاس iPhone، واستجابة
// الشاشة لمسافات الأمان، وتغطية شريط التنقّل لأهداف اللمس (`elementFromPoint`
// لا مجرّد `.click()`)، والاتجاه العربي، وتصفّح الأيام، وتعديل الكمية، وشرح
// الترحيل، وبقاء الحالة بعد إعادة الفتح، وعبور منتصف الليل بساعة محلية مُزاحة.
//
// التشغيل: npm run test:e2e:nutrition-ios

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = 5331
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

// iPhone 14 Pro: المقاس والكثافة، ومسافتا الأمان في الوضع المستقلّ.
const IPHONE = { width: 393, height: 660, dpr: 3 }
const SAFE_TOP = 59
const SAFE_BOTTOM = 34

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

const settle = (page, ms = 1600) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

let browser

/**
 * سياق بمواصفات iPhone: المقاس والكثافة واللمس وهوية جوال، مع توقيت الرياض
 * والعربية. ويُحقن قبل أي سكربت للصفحة:
 *   ١) ساعة محلية مُزاحة إلى ٢٣:٥٨ قابلة للتقديم (`__advanceClock`) — لعبور
 *      منتصف الليل **بالتقويم المحلي** لا بتزوير نتيجة.
 *   ٢) مسافتا الأمان كقيمتَي متغيّرين — الشاشة تقرأ `var(--safe-*)`، فالحقن
 *      يقيس استجابة التخطيط الحقيقية لمسافات الجهاز.
 */
async function iphoneContext() {
  const ctx = await browser.newContext({
    viewport: { width: IPHONE.width, height: IPHONE.height },
    deviceScaleFactor: IPHONE.dpr,
    isMobile: true,
    hasTouch: true,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  })
  await ctx.addInitScript(({ top, bottom }) => {
    // ① ساعة محلية عند ٢٣:٥٨ اليوم، قابلة للتقديم من الاختبار.
    const Real = Date
    const now = new Real()
    let offset = new Real(now.getFullYear(), now.getMonth(), now.getDate(), 23, 58, 0).getTime() - now.getTime()
    class Shifted extends Real {
      constructor(...args) {
        if (args.length) super(...args)
        else super(Real.now() + offset)
      }
      static now() { return Real.now() + offset }
    }
    globalThis.Date = Shifted
    globalThis.__advanceClock = (ms) => { offset += ms }

    // ② مسافتا الأمان — `env(safe-area-inset-*)` صفر في المتصفّح المكتبي،
    //    والحقن يجعل التخطيط يواجه قيم الجهاز فعلًا.
    const apply = () => {
      const st = document.createElement('style')
      st.id = 'ios-safe-areas'
      st.textContent = `:root{--safe-top:${top}px;--safe-bottom:${bottom}px}`
      document.head.appendChild(st)
    }
    if (document.head) apply()
    else document.addEventListener('DOMContentLoaded', apply, { once: true })
  }, { top: SAFE_TOP, bottom: SAFE_BOTTOM })

  const page = await ctx.newPage()
  page.diag = { pageerror: [] }
  page.on('pageerror', (e) => page.diag.pageerror.push(String(e)))
  page.ctx = ctx
  return page
}

async function onboard(page, intent = 'numbers') {
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
  const chosen = await selectIntent(page, intent)
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosen }); await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2600)
}

/** يضغط «أضف» على بطاقة وجبة مسمّاة داخل أقسام اليوم المعروض. */
const clickAdd = (page, meal) => page.evaluate((name) => {
  const sections = document.querySelector('[data-testid="nutrition-meal-sections"]')
  const card = [...(sections?.querySelectorAll('.card') ?? [])].find((c) => new RegExp(name).test(c.textContent || ''))
  const add = [...(card?.querySelectorAll('button') ?? [])].find((b) => (b.textContent || '').trim() === 'أضف')
  if (!add) return false
  add.scrollIntoView({ block: 'center' })
  add.click()
  return true
}, meal)

/**
 * التفعيل يمرّ **بالفعل المحجوب نفسه**: البوّابة لا تظهر بمجرّد فتح التبويب،
 * بل عند أوّل كتابة. ولذلك كان التفعيل «الاستباقي» عند التنقّل لا يجد بوّابة
 * فيمرّ بلا أثر — ثم يفشل أوّل ضغط على «أضف» بعده. نفس ترتيب
 * `nutrition-reliability.mjs`: اضغط · فعِّل · اضغط ثانيةً.
 */
async function activate(page) {
  await page.evaluate(() => { location.hash = '/nutrition' })
  await settle(page, 2000)
  await clickAdd(page, 'الفطور')
  await settle(page, 1200)
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

/**
 * هل يصل الإصبع فعلًا إلى هذا العنصر؟ — `elementFromPoint` في مركزه، لا
 * `.click()` البرمجي الذي يتجاوز اختبار الإصابة. هذه هي الطريقة التي كشفت بها
 * `test:e2e:install-overlap` أن قاع التطبيق كان محجوبًا بالكامل.
 */
const hittable = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return { found: false }
  el.scrollIntoView({ block: 'center' })
  const r = el.getBoundingClientRect()
  const x = Math.round(r.left + r.width / 2)
  const y = Math.round(r.top + r.height / 2)
  const hit = document.elementFromPoint(x, y)
  return {
    found: true,
    inViewport: r.top >= 0 && r.bottom <= window.innerHeight + 0.5,
    self: !!hit && (hit === el || el.contains(hit) || hit.contains(el)),
    blocker: hit ? `${hit.tagName}.${String(hit.className || '').split(' ').slice(0, 2).join('.')}` : 'none',
    w: Math.round(r.width),
    h: Math.round(r.height),
  }
}, selector)

console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║  المحرّك: Chromium بمواصفات iPhone 14 Pro + PWA مستقلّ         ║')
console.log('║  ليس Safari/WebKit · وليس جهازًا حقيقيًّا (WebKit محجوب بالوكيل) ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  const page = await iphoneContext()
  await onboard(page)
  await activate(page)

  // ═══ ① القشرة: الوضع المستقلّ · الاتجاه · مسافات الأمان ═══
  console.log('\n① القشرة: مقاس الجهاز · RTL · مسافات الأمان')
  {
    const shell = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="tab-nutrition"]')?.closest('nav')
      const navStyle = nav ? getComputedStyle(nav) : null
      const root = getComputedStyle(document.documentElement)
      return {
        standalone: matchMedia('(display-mode: standalone)').matches,
        dir: document.documentElement.getAttribute('dir'),
        safeTop: root.getPropertyValue('--safe-top').trim(),
        safeBottom: root.getPropertyValue('--safe-bottom').trim(),
        navPadBottom: navStyle ? Math.round(parseFloat(navStyle.paddingBottom)) : -1,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        width: window.innerWidth,
        dpr: window.devicePixelRatio,
      }
    })
    // `display-mode` غير قابل للمحاكاة في هذه النسخة — يُعلَن ولا يُدَّعى.
    console.log(`  ⊘ غير مقيس هنا: display-mode = ${shell.standalone ? 'standalone' : 'browser'} (المحاكاة غير مدعومة في هذه النسخة)`)
    check(`المقاس والكثافة كجهاز iPhone (${shell.width}×${IPHONE.height} @${shell.dpr}x)`, shell.width === IPHONE.width && shell.dpr === IPHONE.dpr)
    check('الاتجاه عربي (rtl)', shell.dir === 'rtl', String(shell.dir))
    check('مسافتا الأمان واصلتان للتخطيط', shell.safeTop === `${SAFE_TOP}px` && shell.safeBottom === `${SAFE_BOTTOM}px`, `${shell.safeTop}/${shell.safeBottom}`)
    check('⭐ شريط التنقّل يحترم مسافة القاع (لا يلتصق بشريط الإيماءة)', shell.navPadBottom >= SAFE_BOTTOM, `padding-bottom=${shell.navPadBottom}`)
    check('بلا فيض أفقي عند مقاس iPhone', !shell.overflowX)
  }

  // ═══ ② تغطية شريط التنقّل — إصبعٌ لا نقرة برمجية ═══
  console.log('\n② أهداف اللمس: لا شيء محجوب تحت الشريط السفلي')
  {
    for (const id of ['tab-dashboard', 'tab-workout', 'tab-nutrition', 'tab-progress']) {
      const h = await hittable(page, `[data-testid="${id}"]`)
      check(`«${id}» قابل للّمس فعلًا (elementFromPoint)`, h.found && h.self, h.blocker)
      check(`«${id}» هدف لمس ≥44بكسل`, h.h >= 44, `h=${h.h}`)
    }
    for (const sel of ['[data-testid="nutrition-day-prev"]', '[data-testid="nutrition-day-next"]', '[data-testid="carryover-toggle"]']) {
      const h = await hittable(page, sel)
      check(`${sel} غير محجوب بالشريط السفلي`, h.found && h.self, h.blocker)
    }
  }

  // ═══ ③ تصفّح الأيام + التسجيل في يوم ماضٍ + تعديل الكمية ═══
  console.log('\n③ تصفّح الأيام · تسجيل في الأمس · تعديل الكمية')
  {
    await page.locator('[data-testid="nutrition-day-prev"]').click({ force: true })
    await settle(page, 1200)
    const y = await page.evaluate(() => ({
      label: document.querySelector('[data-testid="nutrition-day-label"]')?.textContent?.trim() ?? '',
      note: document.querySelector('[data-testid="nutrition-past-writing"]')?.textContent?.trim() ?? '',
      adds: [...(document.querySelector('[data-testid="nutrition-meal-sections"]')?.querySelectorAll('button') ?? [])]
        .filter((b) => (b.textContent || '').trim() === 'أضف').length,
    }))
    check('السهم ينتقل إلى «أمس»', y.label === 'أمس', y.label)
    check('⭐ الشاشة تعلن أنك تسجّل في يوم مضى لا في اليوم', /يوم مضى/.test(y.note) && /مو على اليوم/.test(y.note), y.note)
    check('وأزرار «أضف» متاحة على الأمس (التسجيل المتأخّر ممكن)', y.adds === 4, String(y.adds))

    // سجّل صنفًا في الأمس عبر بطاقة «العشاء».
    check('زرّ «أضف» على عشاء الأمس يُضغط', await clickAdd(page, 'العشاء'))
    await settle(page, 1400)
    check('ولا بوّابة بعد التفعيل', !(await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)))
    await page.locator('input[aria-label="ابحث عن أكل…"]').first().fill('دجاج')
    await settle(page, 1400)
    const picked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /دجاج/.test(b.textContent || '') && b.closest('li'))
      if (!btn) return false
      btn.click()
      return true
    })
    check('اختيار صنف من المكتبة داخل بطاقة الأمس', picked)
    await settle(page, 1000)
    const logged = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'أضف للسجل')
      if (!btn) return false
      btn.scrollIntoView({ block: 'center' })
      btn.click()
      return true
    })
    check('زرّ التسجيل موجود ويُضغط', logged)
    await settle(page, 1800)

    const stored = await page.evaluate(() => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const t = new Date(); const yd = new Date(t); yd.setDate(yd.getDate() - 1)
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')[owner] ?? {}
      const live = JSON.parse(localStorage.getItem('qimmah:nutrition:v2') || '{}')
      return {
        yesterday: (ledger[stamp(yd)] ?? []).length,
        todayLedger: (ledger[stamp(t)] ?? []).length,
        liveDate: live.date ?? null,
        liveFoods: Array.isArray(live.foods) ? live.foods.length : -1,
        yGrams: (ledger[stamp(yd)] ?? [])[0]?.quantity?.grams ?? null,
      }
    })
    check('⭐ القيد وقع في الأمس', stored.yesterday === 1, JSON.stringify(stored))
    /**
     * `liveFoods === -1` تعني أن مفتاح متجر اليوم (`qimmah:nutrition:v2`) **لم
     * يُنشأ أصلًا** — وهي أقوى صورة لـ«لم يتسرّب شيء» لا أضعفها: لم تقع كتابة
     * واحدة على اليوم الحالي طوال تسجيلٍ كامل في الأمس. فالفحص يقبلها كما يقبل
     * صفرًا، ويرفض أي عدد موجب.
     */
    check('⭐ ولم يتسرّب إلى اليوم — لا في الدفتر ولا في المتجر الحيّ', stored.todayLedger === 0 && stored.liveFoods <= 0, JSON.stringify(stored))
    check('ومتجر اليوم لم يُكتب فيه حرف (المفتاح غير موجود أو فارغ)', stored.liveFoods === -1 || (stored.liveDate !== null && stored.liveFoods === 0), JSON.stringify(stored))
    check('والكمية محفوظة بالجرام', typeof stored.yGrams === 'number' && stored.yGrams > 0, String(stored.yGrams))

    // تعديل الكمية من نفس الشاشة.
    const opened = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /عدّل الكمية/.test(b.getAttribute('aria-label') || ''))
      if (!btn) return false
      btn.scrollIntoView({ block: 'center' }); btn.click()
      return true
    })
    check('زرّ تعديل الكمية ظاهر على قيد الأمس', opened)
    await settle(page, 800)
    if (opened) {
      const field = page.locator('input[inputmode="decimal"]').first()
      await field.fill('120')
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => /احفظ التعديل/.test((b.textContent || '').trim()))
        btn?.click()
      })
      await settle(page, 1500)
      const after = await page.evaluate(() => {
        const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const yd = new Date(); yd.setDate(yd.getDate() - 1)
        const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
        const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')[owner] ?? {}
        return (ledger[stamp(yd)] ?? [])[0]?.quantity?.grams ?? null
      })
      check('⭐ تعديل الكمية على يوم ماضٍ يُحفظ (١٢٠غ)', after === 120, String(after))
    }
  }

  // ═══ ④ شرح الترحيل — ثلاثة أسطر مقروءة بلا قصّ ═══
  console.log('\n④ شرح الترحيل داخل قشرة الجهاز')
  {
    await page.locator('[data-testid="nutrition-day-back-to-today"]').click({ force: true })
    await settle(page, 1000)
    /**
     * أمسٌ متجاوِز — **بقيد حقيقي في الدفتر** لا بمجاميع مزروعة.
     *
     * أوّل صياغة زرعت `loggedFood` وحدها، وأمسُ هذا الاختبار يحمل قيدًا فعليًّا
     * سُجِّل في البند ③. و`getDayNutritionStat` يفضّل التفصيل على المجاميع —
     * بحقّ — فبقي الاستهلاك صغيرًا ولم يظهر أي ترحيل. الخلل كان في بيانات
     * الاختبار لا في المنتج، فصُحّحت البيانات.
     */
    await page.evaluate(() => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const y = new Date(); y.setDate(y.getDate() - 1)
      const yd = stamp(y)
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')
      const days = ledger[owner] ?? {}
      days[yd] = [...(days[yd] ?? []), {
        id: 'ios-big-dinner', nameAr: 'عشاء كبير', meal: 'dinner',
        quantity: { grams: 900 }, unit: 'g',
        macros: { calories: 2200, protein: 120, carbs: 250, fat: 70 },
        addedAt: new Date().toISOString(),
      }]
      ledger[owner] = days
      localStorage.setItem('qimmah:nutritionHistory:v1', JSON.stringify(ledger))
      const logs = JSON.parse(localStorage.getItem('qimmah:history:nutritionLogs:v1') || '{}')
      logs[yd] = { ...(logs[yd] ?? {}), date: yd, doneMeals: {}, baseTargetCalories: 2000, effectiveTargetCalories: 2000, updatedAt: new Date().toISOString() }
      localStorage.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify(logs))
      localStorage.setItem('qimmah:nutritionCarryover:v1', JSON.stringify({ [owner]: { enabled: true, enabledAt: yd } }))
    })
    await page.reload({ waitUntil: 'networkidle' }); await settle(page, 2600)
    await page.evaluate(() => { location.hash = '/nutrition' }); await settle(page, 2000)

    const rows = await page.evaluate(() => {
      const pick = (id) => {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        const spans = [...el.querySelectorAll('span')]
        return {
          text: el.textContent?.trim() ?? '',
          clipped: spans.some((sp) => sp.scrollWidth > sp.clientWidth + 1),
          right: Math.round(r.right),
          left: Math.round(r.left),
        }
      }
      return { base: pick('carryover-base'), adjust: pick('carryover-adjust'), effective: pick('carryover-effective'), vw: window.innerWidth }
    })
    check('⭐ السطور الثلاثة معروضة داخل قشرة الجهاز', !!rows.base && !!rows.adjust && !!rows.effective)
    check('«هدفك الأساسي» بلا قصّ', rows.base && !rows.base.clipped, rows.base?.text)
    check('«ترحيل من أمس» بلا قصّ', rows.adjust && !rows.adjust.clipped, rows.adjust?.text)
    check('«هدف اليوم المعدّل» بلا قصّ', rows.effective && !rows.effective.clipped, rows.effective?.text)
    check('السطور داخل حدود الشاشة أفقيًّا', [rows.base, rows.adjust, rows.effective].every((r) => r && r.left >= 0 && r.right <= rows.vw + 1))
  }

  // ═══ ⑤ إعادة فتح التطبيق (PWA) — الحالة والإعداد يبقيان ═══
  console.log('\n⑤ إعادة الفتح: الحالة والإعداد يبقيان')
  {
    const before = await page.evaluate(() => ({
      carryover: !!document.querySelector('[data-testid="carryover-breakdown"]'),
      toggle: document.querySelector('[data-testid="carryover-toggle"]')?.getAttribute('aria-checked'),
    }))
    // إعادة فتح كاملة: صفحة جديدة في نفس السياق (نفس التخزين) — كإغلاق التطبيق وفتحه.
    const reopened = await page.ctx.newPage()
    await reopened.goto(`${URL}#/nutrition`, { waitUntil: 'networkidle' })
    await reopened.waitForTimeout(3000)
    const after = await reopened.evaluate(() => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const yd = new Date(); yd.setDate(yd.getDate() - 1)
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')[owner] ?? {}
      return {
        carryover: !!document.querySelector('[data-testid="carryover-breakdown"]'),
        toggle: document.querySelector('[data-testid="carryover-toggle"]')?.getAttribute('aria-checked'),
        sections: !!document.querySelector('[data-testid="nutrition-meal-sections"]'),
        yGrams: (ledger[stamp(yd)] ?? [])[0]?.quantity?.grams ?? null,
      }
    })
    check('⭐ إعداد الترحيل باقٍ بعد إعادة الفتح', after.toggle === 'true' && after.toggle === before.toggle, `${before.toggle}→${after.toggle}`)
    check('⭐ وشرح الترحيل يُرسَم كما كان', after.carryover && before.carryover)
    check('⭐ وقيد الأمس بكميته المعدَّلة باقٍ', after.yGrams === 120, String(after.yGrams))
    check('والبنية القانونية كما هي', after.sections)
    await reopened.close()
  }

  // ═══ ⑥ عبور منتصف الليل بالتقويم المحلي ═══
  console.log('\n⑥ منتصف الليل المحلي: اليوم يتقدّم والبيانات تبقى مكانها')
  {
    // لقطة **قبل** العبور: عدد قيود الأمس كما هو الآن. الفحص بعد العبور يقارن
    // بها لا برقم مكتوب بيد — فلا يسقط لأن بندًا سابقًا أضاف قيدًا مشروعًا.
    const before = await page.evaluate(() => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const y = new Date(); y.setDate(y.getDate() - 1)
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')[owner] ?? {}
      return {
        label: document.querySelector('[data-testid="nutrition-day-label"]')?.textContent?.trim() ?? '',
        stamp: stamp(new Date()),
        hours: new Date().getHours(),
        yesterdayStamp: stamp(y),
        yesterdayCount: (ledger[stamp(y)] ?? []).length,
      }
    })
    check('تمهيد: الأمس يحمل قيودًا فعلية قبل العبور', before.yesterdayCount > 0, String(before.yesterdayCount))
    check('الساعة المحقونة قبل منتصف الليل (٢٣:٥٨)', before.hours === 23, String(before.hours))
    check('اليوم المعروض هو «اليوم»', before.label === 'اليوم', before.label)

    // +٥ دقائق ⇒ عبرنا منتصف الليل محليًّا.
    await page.evaluate(() => { globalThis.__advanceClock(5 * 60 * 1000) })
    await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
    await settle(page, 2200)

    const after = await page.evaluate((prevStamp) => {
      const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const now = new Date()
      const owner = JSON.parse(localStorage.getItem('qimmah:dataOwner:v1') || 'null')?.owner ?? 'guest'
      const ledger = JSON.parse(localStorage.getItem('qimmah:nutritionHistory:v1') || '{}')[owner] ?? {}
      return {
        label: document.querySelector('[data-testid="nutrition-day-label"]')?.textContent?.trim() ?? '',
        stamp: stamp(now),
        hours: now.getHours(),
        // نفس اليوم بختمه الأصلي — يجب ألّا يتغيّر محتواه بعبور منتصف الليل.
        originalDay: (ledger[prevStamp] ?? []).length,
        todayLedger: (ledger[stamp(now)] ?? []).length,
      }
    }, before.yesterdayStamp)
    check('الساعة عبرت إلى ٠٠:٠٣', after.hours === 0, String(after.hours))
    check('⭐ ختم اليوم تقدّم يومًا واحدًا بالتقويم المحلي', after.stamp !== before.stamp, `${before.stamp}→${after.stamp}`)
    check('⭐ الشاشة ما زالت تعرض «اليوم» (الإزاحة تتبع التقويم لا ختمًا مجمّدًا)', after.label === 'اليوم', after.label)
    check('⭐ القيد المسجَّل لم ينتقل إلى اليوم الجديد', after.todayLedger === 0, String(after.todayLedger))
    check('⭐ وقيود ذلك اليوم بقيت على ختمه الأصلي بالعدد نفسه', after.originalDay === before.yesterdayCount, `${before.yesterdayCount}→${after.originalDay} @${before.yesterdayStamp}`)
    check('بلا استثناء عبر العبور', page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(''))
  }

  // ═══ ⑦ الاتجاه والقصّ عند أضيق مقاس iPhone ═══
  console.log('\n⑦ iPhone SE (375) — لا قصّ ولا فيض')
  {
    await page.setViewportSize({ width: 375, height: 667 })
    await settle(page, 1200)
    const narrow = await page.evaluate(() => {
      const ids = ['nutrition-day-label', 'nutrition-day-date', 'carryover-base', 'carryover-adjust', 'carryover-effective']
      const clipped = ids.filter((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) return false
        return el.scrollWidth > el.clientWidth + 1 || [...el.querySelectorAll('span')].some((sp) => sp.scrollWidth > sp.clientWidth + 1)
      })
      return { clipped, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
    })
    check('لا نصّ مقصوص عند ٣٧٥بكسل', narrow.clipped.length === 0, narrow.clipped.join(','))
    check('ولا فيض أفقي', !narrow.overflowX)
    const navHit = await hittable(page, '[data-testid="tab-nutrition"]')
    check('شريط التنقّل ما زال قابلًا للّمس عند ٣٧٥', navHit.found && navHit.self, navHit.blocker)
  }
} finally {
  if (browser) await browser.close()
  if (preview) preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} قشرة iPhone (Chromium — ليس Safari): ${pass} فحصًا · ${fail} فشلًا`)
if (fail > 0) {
  console.log('\nnutrition-ios-shell-breach:')
  for (const f of failures) console.log(`  · ${f}`)
  process.exit(1)
}
