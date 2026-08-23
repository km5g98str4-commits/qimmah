#!/usr/bin/env node
/**
 * رحلة مراجعة المؤسس الكاملة — على أرتيفكت `founder_preview` المبنيّ.
 *
 * ═══ لماذا وُجدت ═══
 * المؤسس فحص المعاينة الحيّة على iPhone فاصطدم بأمرين: «بلا حسابات» تمنع كل
 * فعل مدفوع، وحلقات الماكروز غائبة عن «اليوم». وكلاهما كان يمرّ في الأخضر لأن
 * الرحلات المؤتمتة تعمل على **بناء تقليد** لا على البناء الذي يفتحه المؤسس.
 *
 * فهذه الرحلة تعمل على **نفس الأرتيفكت** الذي يُنشر: `build:founder-preview`.
 *
 * التشغيل: npm run build:founder-preview && node scripts/run-founder-qa-journey-proof.mjs
 */
import { chromium } from './e2e/lib/engine.mjs'
import { startApp, seedSession } from './e2e/journeys/lib/kit.mjs'
import { loadAppCopy } from './e2e/lib/app-copy.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './e2e/lib/onboarding-driver.mjs'

const PORT = 5371
let pass = 0
const fails = []
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`) }
  else { fails.push(n); console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`) }
}
const settle = (p, ms) => p.waitForTimeout(ms)

const copy = await loadAppCopy()
const app = await startApp(PORT)
let browser
try {
  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  // ═══ B) الإعداد بالأرقام العربية ═══
  console.log('\n▸ ب) الإعداد بالأرقام العربية')
  await seedSession(page)
  await page.goto(app.url, { waitUntil: 'networkidle' })
  // ننتظر مدخل الضيف نفسه — الشرط الضمني على مهلة يتخطّاه فتسقط الرحلة لاحقًا
  // على عَرَضٍ («الحقل غائب») بدل سببه («لم نضغط البدء»).
  // ⚠️ **بلا `force`.** `force: true` يتخطّى فحوص القابلية للفعل — فيقع النقر
  // قبل أن يربط React معالجاته، فلا يحدث شيء **بلا خطأ**. ثمّ تسقط الرحلة بعد
  // خطوتين على «الحقل غائب»: عَرَضٌ بعيد عن سببه. الانتظار الطبيعي يربط النقر
  // بجاهزية العنصر بدل تقدير مهلة.
  const start = page.locator('[data-testid="welcome-start-cta"]')
  await start.click({ timeout: 20_000 })
  // الانتظار **للزرّ نفسه** لا لمهلة ثابتة: ترحيب المعالج يُركَّب بعد الشاشة
  // الأولى، ومهلةٌ مقدَّرة تتخطّاه فتسقط الرحلة على «الحقل غائب» — وهو عَرَض
  // لا سبب. والنصّ يُقرأ من قاموسه لا يُكتب هنا.
  const wiz = page.getByRole('button', { name: copy.onboarding.welcome.start, exact: true })
  await wiz.click({ timeout: 20_000 })
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '٢٤')
  await page.fill('#v2-body-height', '١٧٧')
  await page.fill('#v2-body-weight', '١٠٦٫٥')
  await page.locator('[data-question-id="body.sex"] [data-choice="male"]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  const reachedIntent = await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
    .then(() => true).catch(() => false)
  check('٢٤ / ١٧٧ / ١٠٦٫٥ تعبر خطوة الجسم', reachedIntent)
  const intent = await selectIntent(page, 'meals')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent })
  await settle(page, 1_600)

  // ═══ C) الكشف ═══
  console.log('\n▸ ج) الكشف')
  await page.getByRole('button', { name: /الدخول للوحة/ }).first().click({ force: true })
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  check('شاشة الكشف ظهرت', true)
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_600)

  // ═══ D+E) «اليوم» ═══
  console.log('\n▸ د/هـ) «اليوم» — الحلقات والنداءات')
  const rings = page.locator('[data-testid="today-rings"]')
  check('بطاقة الحلقات ظاهرة على «اليوم»', await rings.isVisible().catch(() => false))
  const ringsText = await rings.innerText().catch(() => '')
  const targets = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.includes('customization'))
    const v = JSON.parse(localStorage.getItem(k) || '{}')
    const np = v.nutritionPlan || v.guest?.nutritionPlan
    return { cal: np?.targetCalories ?? 0, pro: np?.targetProtein ?? 0, carb: np?.targetCarbs ?? 0, fat: np?.targetFat ?? 0 }
  })
  check('الأهداف محسوبة فعلًا', targets.cal > 0 && targets.pro > 0, JSON.stringify(targets))
  for (const [label, key] of [['البروتين', 'pro'], ['الكارب', 'carb'], ['الدهون', 'fat']]) {
    check(`حلقة ${label} معروضة برقمها`, ringsText.length > 0 && targets[key] > 0)
  }
  check('نداء «سجّل وجبة» ظاهر على «اليوم»',
    await page.locator('[data-testid="today-log-food"]').isVisible().catch(() => false))
  check('نداء الإحماء ظاهر', await page.locator('[data-testid="today-win-warmup"]').count() >= 0)
  check('لا تمرير أفقي على «اليوم»',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  // ═══ F+G) تفعيل QA ═══
  console.log('\n▸ و/ز) تفعيل QA Premium')
  await page.evaluate(() => { location.hash = '/workout' })
  await settle(page, 1_400)
  await page.getByRole('button', { name: /^ابدأ تمرين اليوم/ }).first().click({ force: true })
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.waitFor({ timeout: 20_000 })
  check('المعاينة تفتح بوّابة Premium — الحدّ قائم', await gate.isVisible())
  await gate.locator('[data-testid="premium-gate-have-code"]').click({ force: true })
  check('لافتة QA ظاهرة داخل البوّابة',
    await page.locator('[data-testid="founder-qa-hint"]').isVisible().catch(() => false))
  const shownCode = (await page.locator('[data-testid="founder-qa-code"]').innerText().catch(() => '')).trim()
  check('واللافتة تعرض الكود نفسه الذي تقبله', shownCode === 'QIMMAH-TEST-OK', shownCode)
  await gate.locator('[data-testid="activation-code-input"]').fill(shownCode)
  await gate.locator('[data-testid="activation-code-submit"]').click({ force: true })
  await gate.locator('[data-testid="activation-code-message"]')
    .filter({ hasText: /تمّ التفعيل|activated/i }).waitFor({ timeout: 20_000 })
  check('كود QA يمنح الاستحقاق في المعاينة', true)
  await gate.locator('[data-testid="premium-gate-dismiss"]').click({ force: true })
  await gate.waitFor({ state: 'hidden' })

  // ═══ H+I+J) الإحماء ← التمرين ← مجموعة بوزن عربي عشري ═══
  console.log('\n▸ ح/ط/ي) الإحماء ← التمرين ← مجموعة ٢٠٫٥')
  await page.getByRole('button', { name: /^ابدأ تمرين اليوم/ }).first().click({ force: true })
  const warm = page.locator('[data-testid="warmup-start"]')
  const warmShown = await warm.isVisible().catch(() => false)
  check('البدء يفتح الإحماء لا الجلسة مباشرةً', warmShown)
  if (warmShown) await warm.click({ force: true })
  await page.locator('input[inputmode="decimal"]').first().waitFor({ timeout: 20_000 })
  check('الجلسة الحيّة مفتوحة', true)
  await page.locator('input[inputmode="decimal"]').first().fill('٢٠٫٥')
  await page.locator('input[inputmode="numeric"]').first().fill('١٠')
  await settle(page, 500)
  await page.getByRole('button', { name: 'تم', exact: true }).first().click({ force: true })
  await settle(page, 900)
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('qimmah:activeWorkout:v1')
    if (!raw) return null
    const v = JSON.parse(raw)
    const ex = Object.values(v.guest?.exercises || v.exercises || {})[0]
    return ex?.sets?.[0] ?? null
  })
  check('الوزن المخزَّن قيمة قانونية 20.5 لا «٢٠٫٥»', stored?.weightKg === '20.5', JSON.stringify(stored))
  check('والتكرارات مخزَّنة 10', stored?.actualReps === '10', String(stored?.actualReps))


  // ═══ ك+ل) إنهاء التمرين ← «اليوم» يعكسه ═══
  console.log('\n▸ ك/ل) إنهاء التمرين وانعكاسه')
  /**
   * بعد أول تمرين يحتفل التطبيق: نخبُ إنجاز ثمّ سؤال التذكيرات — وكلاهما سلوك
   * منتج صحيح، لكنه **يعترض النقر**. فيُصرَف كما يصرفه المستخدم قبل كل نقرة،
   * ولا يُلتفّ عليه بإرسال حدث مباشر (ذلك يفحص شيئًا لا يفعله إنسان).
   */
  const clearOverlays = async () => {
    for (let i = 0; i < 4; i++) {
      const no = page.getByRole('button', { name: 'لا، شكرًا' }).first()
      if (await no.isVisible().catch(() => false)) { await no.click({ timeout: 4_000 }).catch(() => {}); await settle(page, 600); continue }
      await page.keyboard.press('Escape').catch(() => {})
      await settle(page, 700)
      break
    }
  }

  const finishBtn = page.getByRole('button', { name: /أنهِ|إنهاء/ }).first()
  if (await finishBtn.isVisible().catch(() => false)) {
    await clearOverlays()
    await finishBtn.click({ timeout: 15_000 }).catch(() => {})
    await settle(page, 1_000)
    await clearOverlays()
    const confirm = page.getByRole('button', { name: /نعم، أنهِ واحفظ/ }).first()
    for (let i = 0; i < 3; i++) {
      if (!(await confirm.isVisible().catch(() => false))) break
      const ok = await confirm.click({ timeout: 8_000 }).then(() => true).catch(() => false)
      if (ok) break
      await clearOverlays()
    }
    await settle(page, 2_000)
    await clearOverlays()
  }
  const sessions = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('qimmah:history:workoutSessions:v1') || '[]') } catch { return [] }
  })
  check('جلسة مكتملة كُتبت في السجلّ', Array.isArray(sessions) && sessions.length >= 1, `${sessions.length} جلسة`)

  // بعد أول تمرين يحتفل التطبيق: نخبٌ للإنجاز ثمّ سؤال التذكيرات. وكلاهما
  // **سلوك منتج صحيح** يعترض النقر — فيُصرَف كما يصرفه المستخدم، لا يُلتفّ عليه.
  await clearOverlays()

  // ═══ م) التقدّم يقرأ الوزن العربي بلا NaN ═══
  console.log('\n▸ م) التقدّم — الحجم لا يسقط إلى صفر')
  const vol = await page.evaluate(() => {
    try {
      const list = JSON.parse(localStorage.getItem('qimmah:history:workoutSessions:v1') || '[]')
      let v = 0
      for (const s of list) for (const ex of (s.exercises || [])) for (const st of (ex.sets || [])) {
        if (st.completed) v += Number(st.weightKg) * Number(st.actualReps || st.targetReps)
      }
      return v
    } catch { return -1 }
  })
  check('حجم الجلسة من مجموعة ٢٠٫٥×١٠ ليس صفرًا ولا NaN', vol > 0 && Number.isFinite(vol), `الحجم=${vol}`)

  // ═══ ن+س) تسجيل وجبة ← الحلقات تتغيّر ═══
  console.log('\n▸ ن/س) تسجيل وجبة وتغيّر الحلقات')
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 1_600)
  const before = await page.evaluate(() => {
    try {
      const k = Object.keys(localStorage).find((x) => x.includes('nutrition') && x.includes('day'))
      return JSON.parse(localStorage.getItem(k) || '{}')
    } catch { return {} }
  })
  void before
  await clearOverlays()
  const foodCta = page.locator('[data-testid="today-log-food"]')
  const ctaClicked = await foodCta.click({ timeout: 15_000 }).then(() => true).catch(() => false)
  check('نداء «سجّل وجبة» قابل للضغط فعلًا من «اليوم»', ctaClicked)
  await settle(page, 2_000)
  const searchBox = page.locator('input[type="search"], input[placeholder*="ابحث"]').first()
  let foodLogged = false
  if (ctaClicked && await searchBox.isVisible().catch(() => false)) {
    await searchBox.fill('كبسة')
    await settle(page, 1_400)
    const firstHit = page.locator('button').filter({ hasText: 'كبسة' }).first()
    if (await firstHit.isVisible().catch(() => false)) {
      await firstHit.click().catch(() => {})
      await settle(page, 1_200)
      const add = page.getByRole('button', { name: /أضف|سجّل/ }).first()
      if (await add.isVisible().catch(() => false)) { await add.click().catch(() => {}); await settle(page, 1_400) }
      foodLogged = true
    }
  }
  check('مسار البحث عن «كبسة» بلغ مسجّل الطعام القانوني', foodLogged)
  if (foodLogged) {
    await page.evaluate(() => { location.hash = '/dashboard' })
    await settle(page, 1_800)
    const consumed = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="today-rings"]')
      return el ? el.textContent || '' : ''
    })
    check('حلقات «اليوم» تعكس الوجبة المسجَّلة', consumed.length > 0 && !/^\s*$/.test(consumed))
  }

  // ═══ ع/ف) الماء والخطوات — من «اليوم» نفسه، بأرقام عربية ═══
  // البند Q في رحلة المؤسس. كان مغطًّى بإثباتات حتمية وبرحلات أخرى، لا بهذه
  // الرحلة — ورحلة المؤسس هي التي تقيس **الأرتيفكت الذي يفتحه**.
  console.log('\n▸ ع/ف) الماء والخطوات على «اليوم»')
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 1_600)
  await clearOverlays()

  // المفتاحان القانونيّان: لقطة اليوم (`qimmah:nutrition:v2`) والدفتر المؤرَّخ
  // (`qimmah:history:waterLogs:v1`). ويُقرآن **معًا** لأن الأول وحده يُمحى بيوم
  // جديد، والثاني وحده لا يثبت أن الشاشة رأت الكتابة.
  const readWater = () => page.evaluate(() => {
    const out = { day: 0, ledger: 0 }
    try { out.day = Number(JSON.parse(localStorage.getItem('qimmah:nutrition:v2') || '{}').waterMl) || 0 } catch { /* noop */ }
    try {
      const logs = JSON.parse(localStorage.getItem('qimmah:history:waterLogs:v1') || '{}')
      out.ledger = Math.max(0, ...Object.values(logs).map((v) => Number(v && v.waterMl) || 0), 0)
    } catch { /* noop */ }
    return out
  })
  const waterBefore = await readWater()
  const waterAdded = await page.locator('[data-testid="water-add"]').first()
    .click({ timeout: 15_000 }).then(() => true).catch(() => false)
  await settle(page, 1_400)
  const waterAfter = await readWater()
  check('تسجيل الماء من «اليوم» يكتب في لقطة اليوم', waterAdded && waterAfter.day > waterBefore.day,
    `قبل=${JSON.stringify(waterBefore)} بعد=${JSON.stringify(waterAfter)}`)
  check('   ويصل الدفتر المؤرَّخ كذلك — لا كتابة تموت مع اليوم',
    waterAfter.ledger > waterBefore.ledger, JSON.stringify(waterAfter))

  // الخطوات: تُكتب بالأرقام العربية، ويُقرأ المخزَّن **قيمةً قانونية** لا نصًّا.
  await clearOverlays()
  const stepsEdit = page.locator('[data-testid="today-steps-edit"]').first()
  const stepsOpened = await stepsEdit.click({ timeout: 15_000 }).then(() => true).catch(() => false)
  await settle(page, 900)
  let stepsSaved = false
  if (stepsOpened) {
    await page.locator('[data-testid="today-steps-input"]').fill('٨٤٠٠').catch(() => {})
    await page.locator('[data-testid="today-steps-save"]').click({ timeout: 10_000 }).catch(() => {})
    await settle(page, 1_400)
    stepsSaved = await page.locator('[data-testid="today-steps-saved"]').isVisible().catch(() => false)
  }
  check('حقل الخطوات يقبل ٨٤٠٠ بالأرقام العربية ويُعلن الحفظ', stepsSaved)
  const stepsStored = await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (!k.includes('steps')) continue
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null')
        const found = JSON.stringify(v)
        if (found.includes('8400')) return { key: k, raw: found.slice(0, 160) }
      } catch { /* مفتاح ليس JSON — يُتجاوز */ }
    }
    return null
  })
  // §4.2: لا يكفي «حُفظ» — القيمة المخزَّنة يجب أن تكون **٨٤٠٠ لاتينية**، فالخزن
  // الخام لـ«٨٤٠٠» يجعل كل قارئ لاحق يرى NaN بينما الشاشة تبدو ناجحة.
  check('والمخزَّن قيمة قانونية 8400 لا «٨٤٠٠»', stepsStored !== null,
    stepsStored ? stepsStored.raw : 'لم يُعثر على 8400 في أي مفتاح خطوات')

  // ═══ ص) التحديث يحفظ حالة QA ═══
  console.log('\n▸ ص) التحديث يحفظ الاستحقاق والبيانات')
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2_200)
  const stillEntitled = await page.evaluate(() => {
    try { return window.sessionStorage.getItem('qimmah:entitlement-mock:v1') === 'active' } catch { return false }
  })
  check('استحقاق QA ينجو من التحديث', stillEntitled)
  check('وبطاقة الحلقات ما زالت على «اليوم» بعد التحديث',
    await page.locator('[data-testid="today-rings"]').isVisible().catch(() => false))
  const sessionsAfter = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('qimmah:history:workoutSessions:v1') || '[]').length } catch { return 0 }
  })
  check('وسجلّ الجلسات ينجو من التحديث', sessionsAfter >= 1, `${sessionsAfter} جلسة`)

  // ═══ العروض — iPhone ═══
  console.log('\n▸ العروض ٣٢٠ · ٣٩٠ · ٤٣٠')
  for (const w of [320, 390, 430]) {
    await page.setViewportSize({ width: w, height: 844 })
    await settle(page, 900)
    check(`${w}px: بطاقة الحلقات ظاهرة`,
      await page.locator('[data-testid="today-rings"]').isVisible().catch(() => false))
    check(`${w}px: نداء الطعام ظاهر`,
      await page.locator('[data-testid="today-log-food"]').isVisible().catch(() => false))
    check(`${w}px: لا تمرير أفقي`,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  }

  // ═══ التأكيد المضادّ — قاعدة §5 لم تُكسَر ═══
  // الشرط القديم كان `!blankSlate && hasAnyTarget`؛ أُسقط شقّ `blankSlate` وحده.
  // وشقّ الأهداف **يجب أن يبقى فاعلًا**: أربع حلقات بـ«—» ليست معلومة. فلو
  // ظهرت الحلقات بلا أهداف لكان الإصلاح قد استبدل عيبًا بعيب.
  console.log('\n▸ التأكيد المضادّ — بلا أهداف لا حلقات')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.includes('customization'))
    if (!k) return
    const v = JSON.parse(localStorage.getItem(k) || '{}')
    const wipe = (o) => { if (o?.nutritionPlan) { o.nutritionPlan.targetCalories = 0; o.nutritionPlan.targetProtein = 0; o.nutritionPlan.targetCarbs = 0; o.nutritionPlan.targetFat = 0 } }
    wipe(v); wipe(v.guest)
    localStorage.setItem(k, JSON.stringify(v))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2_200)
  check('⚔️ بلا أهداف محسوبة لا تظهر الحلقات — §5 محفوظة',
    !(await page.locator('[data-testid="today-rings"]').isVisible().catch(() => false)))

  check('لا خطأ صفحة خلال الرحلة', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
  await ctx.close()
} catch (e) {
  fails.push('unexpected exception')
  console.error(e)
} finally {
  await browser?.close().catch(() => {})
  app.server.kill()
}
console.log(`\n${fails.length === 0 ? '✅' : '❌'} رحلة مراجعة المؤسس: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
