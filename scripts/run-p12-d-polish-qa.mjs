// P12-D QA — جولة الصقل المحدودة:
//  (a) حساب فارغ (ar+en): الرئيسية/التمرين/التقدّم/التغذية/لوحتي/المكتبة تعرض
//      حالات فارغة ودّية بنصوصها المحددة — لا أقسام ميتة ولا أخطاء صفحة.
//  (b) حدّ أخطاء المسارات: إفشال تحميل حزمة شاشة كسولة (route abort) → بطاقة
//      «أعد المحاولة» بكلتا اللغتين، وإلغاء الإفشال + النقر يعيد تحميل الشاشة فعليًا.
//  (c) وصول: كل زر في قشرة التطبيق ووضع التمرين له اسم وصول (aria-label أو نص)،
//      وتبويبات الشريط السفلي ≥ 44px.
//  (d) الإعدادات: مجموعة «عن التطبيق» تعرض BUILD_LABEL ورابط «كيف نحسب أرقامك؟»
//      ينقل فعليًا إلى #/calc.
//  (e) هيكل التحميل: تأخير حزمة الرئيسية يُظهر dashboard-skeleton ثم يحلّ المحتوى مكانه.
//
// يتطلب dist مبنيًا (يبنيه تلقائيًا إن غاب): node scripts/run-p12-d-polish-qa.mjs
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4383
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const KEYS = {
  onboarding: 'qimmah:onboarding:v1',
  prefs: 'qimmah:prefs:v1',
}

// النصوص المتوقعة (مصدرها src/config/strings.ts + قواميس src/i18n/dict + strings الميزات).
const T = {
  ar: {
    todoEmpty: 'ما عندك مهام لليوم — أضف أول مهمة.',
    achievementsEmpty: 'أول وسام على بُعد تمرين واحد',
    templatesAuto: 'خطتك تُولَّد تلقائيًا من بياناتك.',
    noWeight: 'سجّل وزنك من قسم القياسات ليظهر هنا.',
    noPRs: 'أكمل تمرينًا بأوزان لتظهر أرقامك القياسية.',
    nutritionEmpty: 'ابدأ — سجّل أول وجبة',
    statsTrainingEmpty: 'ما سجّلت تمرينًا هذا الأسبوع بعد.',
    statsNutritionEmpty: 'ما فيه وجبات مسجّلة خلال آخر ٧ أيام.',
    statsWeightEmpty: 'ما فيه قياسات وزن بعد.',
    libraryNoResults: 'ما فيه نتائج مطابقة — جرّب كلمة أو فلتر مختلف.',
    errTitle: 'حدث خطأ غير متوقّع',
    retry: 'أعد المحاولة',
  },
  en: {
    todoEmpty: 'No tasks yet — add your first one.',
    achievementsEmpty: 'Your first badge is one workout away',
    templatesAuto: 'Your plan is generated automatically from your data.',
    noWeight: 'Log your weight in Measurements to see it here.',
    noPRs: 'Complete a weighted workout to see your PRs.',
    nutritionEmpty: 'Start — log your first meal',
    statsTrainingEmpty: "You haven't logged a workout this week yet.",
    statsNutritionEmpty: 'No meals logged in the last 7 days.',
    statsWeightEmpty: 'No weight measurements yet.',
    libraryNoResults: 'No matching results — try a different word or filter.',
    errTitle: 'Something went wrong',
    retry: 'Try again',
  },
}

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

/** يزرع حساب إعداده مكتمل بلا أي سجلّات (حساب فارغ) بلغة محددة ثم يعيد التحميل الكامل. */
async function seedEmptyAccount(page, lang, hash = '#/dashboard') {
  await page.goto(BASE)
  await page.evaluate(
    ({ KEYS, lang }) => {
      localStorage.clear()
      localStorage.setItem(KEYS.onboarding, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      localStorage.setItem(KEYS.prefs, JSON.stringify({ language: lang }))
    },
    { KEYS, lang },
  )
  await page.goto(`${BASE}/${hash}`)
  await page.reload()
  await sleep(600)
}

/** كل أزرار الصفحة لها اسم وصول: aria-label أو نص غير فارغ. */
async function unnamedButtons(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => !(b.getAttribute('aria-label') || '').trim() && !(b.textContent || '').trim())
      .map((b) => b.outerHTML.slice(0, 100)),
  )
}

async function main() {
  // بناء dist عند غيابه فقط (بوابات التسليم تبنيه مسبقًا فلا نبني مرتين).
  if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
    console.log('… dist غير موجود — تشغيل npm run build')
    const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
    if (b.status !== 0) throw new Error('build failed')
  }

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(BASE); if (r.ok) break } catch { /* not up yet */ }
      await sleep(500)
    }

    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    // نحجب عامل الخدمة كي تمرّ كل طلبات الحِزم عبر الشبكة (وإلا تجاوزت كاش SW اعتراض route).
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const page = await ctx.newPage()
    // بيئة QA بلا إنترنت: أفشل طلبات خطوط Google فورًا (وإلا علّق طلب معلّق
    // ورقة الأنماط الخارجية رسمَ الصفحة بعد إعادة التحميل).
    await page.route('**fonts.googleapis.com**', (r) => r.abort())
    await page.route('**fonts.gstatic.com**', (r) => r.abort())
    let pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    // ———————————————————— (a) جولة الحساب الفارغ ar + en ————————————————————
    for (const lang of ['ar', 'en']) {
      const t = T[lang]
      pageErrors = []

      await seedEmptyAccount(page, lang, '#/dashboard')
      let text = await page.evaluate(() => document.body.innerText)
      check(`(a/${lang}) dashboard: todo empty state`, text.includes(t.todoEmpty))
      check(`(a/${lang}) dashboard: achievements empty state`, text.includes(t.achievementsEmpty))

      await page.goto(`${BASE}/#/workout`); await sleep(700)
      text = await page.evaluate(() => document.body.innerText)
      check(`(a/${lang}) workout: templates auto-generated empty card`, text.includes(t.templatesAuto))

      await page.goto(`${BASE}/#/progress`); await sleep(700)
      text = await page.evaluate(() => document.body.innerText)
      check(`(a/${lang}) progress: no-weight empty state`, text.includes(t.noWeight))
      check(`(a/${lang}) progress: no-PRs empty state`, text.includes(t.noPRs))

      await page.goto(`${BASE}/#/nutrition`); await sleep(700)
      text = await page.evaluate(() => document.body.innerText)
      check(`(a/${lang}) nutrition: first-meal empty state`, text.includes(t.nutritionEmpty))

      await page.goto(`${BASE}/#/stats`); await sleep(700)
      for (const [tid, expected, label] of [
        ['stats-training-empty', t.statsTrainingEmpty, 'training'],
        ['stats-nutrition-empty', t.statsNutritionEmpty, 'nutrition'],
        ['stats-weight-empty', t.statsWeightEmpty, 'weight'],
      ]) {
        const el = page.locator(`[data-testid="${tid}"]`)
        const ok = (await el.count()) === 1 && ((await el.innerText()) || '').includes(expected)
        check(`(a/${lang}) stats: ${label} empty state`, ok)
      }

      await page.goto(`${BASE}/#/exercises`); await sleep(700)
      await page.getByRole('textbox').first().fill('zzz-no-such-exercise-123')
      await sleep(400)
      text = await page.evaluate(() => document.body.innerText)
      check(`(a/${lang}) library: no-results empty state`, text.includes(t.libraryNoResults))

      check(`(a/${lang}) sweep: no uncaught page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
    }

    // ———————————————————— (b) حدّ أخطاء المسارات + إعادة المحاولة ————————————————————
    for (const lang of ['ar', 'en']) {
      const t = T[lang]
      await seedEmptyAccount(page, lang, '#/dashboard')

      // أفشل تحميل حزمة «لوحتي» ثم انتقل إليها (تنقّل SPA — الحزمة تُطلب الآن فقط).
      const abortRoute = '**/assets/MyStatsView*'
      await page.route(abortRoute, (route) => route.abort())
      await page.goto(`${BASE}/#/stats`)
      const card = page.locator('[data-testid="route-error-card"]')
      await card.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
      const cardText = (await card.count()) ? await card.innerText() : ''
      check(`(b/${lang}) chunk failure shows retry card`, cardText.includes(t.errTitle), cardText.slice(0, 60))
      check(`(b/${lang}) retry card has retry button`, cardText.includes(t.retry))

      // ألغِ الإفشال ثم «أعد المحاولة» → الشاشة تُحمَّل فعليًا (إعادة استيراد حقيقية).
      await page.unroute(abortRoute)
      await page.locator('[data-testid="route-error-retry"]').click()
      const loaded = await page
        .locator('[data-testid="stats-view"]')
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false)
      check(`(b/${lang}) retry re-imports the chunk and renders the view`, loaded)
    }

    // ———————————————————— (c) وصول: أسماء الأزرار + أحجام اللمس ————————————————————
    pageErrors = []
    await seedEmptyAccount(page, 'ar', '#/dashboard')
    let bad = await unnamedButtons(page)
    check('(c) dashboard shell: every button has an accessible name', bad.length === 0, bad.slice(0, 2).join(' | '))

    // تبويبات الشريط السفلي ≥ 44px
    const navBoxes = await page.locator('nav button').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height) }
      }),
    )
    check(
      '(c) bottom nav tabs are ≥44px touch targets',
      navBoxes.length >= 5 && navBoxes.every((b) => b.w >= 44 && b.h >= 44),
      JSON.stringify(navBoxes),
    )

    // الإعدادات + التمرين
    await page.goto(`${BASE}/#/settings`); await sleep(700)
    bad = await unnamedButtons(page)
    check('(c) settings: every button has an accessible name', bad.length === 0, bad.slice(0, 2).join(' | '))

    await page.goto(`${BASE}/#/workout`); await sleep(800)
    bad = await unnamedButtons(page)
    check('(c) workout tab: every button has an accessible name', bad.length === 0, bad.slice(0, 2).join(' | '))

    // افتح وضع التمرين: يوم من «خطتي» إن وُجد، وإلا «تمرين فارغ» (زرّا البدء السريع الثاني).
    const dayBtn = page.locator('#workout-myplan .grid button').first()
    if (await dayBtn.count()) await dayBtn.click()
    else await page.locator('section button').nth(1).click()
    await sleep(900)
    const inWorkoutMode = (await page.locator('.fixed.inset-0').count()) > 0
    check('(c) workout mode opens', inWorkoutMode)
    bad = await unnamedButtons(page)
    check('(c) workout mode: every button has an accessible name', bad.length === 0, bad.slice(0, 2).join(' | '))
    // أزرار الجرعات (+/−) في وضع التمرين ≥ 44px إن وُجدت
    const stepBoxes = await page
      .locator('button[aria-label="+"], button[aria-label="-"]')
      .evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height) }
      }))
    check(
      '(c) workout mode steppers are ≥44px (when present)',
      stepBoxes.every((b) => b.w >= 44 && b.h >= 44),
      `${stepBoxes.length} steppers`,
    )
    check('(c) a11y pass: no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

    // ———————————————————— (d) الإعدادات: BUILD_LABEL + رابط الحاسبة ————————————————————
    pageErrors = []
    await seedEmptyAccount(page, 'ar', '#/settings')
    const buildLabel = ((await page.locator('[data-testid="settings-build-label"]').innerText()) || '').trim()
    check('(d) settings shows BUILD_LABEL (v<version>·<commit>)', /^v.+·.+$/.test(buildLabel), buildLabel)
    await page.locator('[data-testid="settings-calc-link"]').click()
    await sleep(900)
    const hash = await page.evaluate(() => window.location.hash)
    const calcLen = await page.evaluate(() => document.body.innerText.length)
    check('(d) calc link navigates to #/calc and renders content', hash === '#/calc' && calcLen > 200, `${hash}, ${calcLen} chars`)
    check('(d) settings/calc: no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

    // ———————————————————— (e) هيكل تحميل الرئيسية أثناء تأخّر الحزمة ————————————————————
    pageErrors = []
    await page.goto(BASE)
    await page.evaluate(({ KEYS }) => {
      localStorage.clear()
      localStorage.setItem(KEYS.onboarding, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      localStorage.setItem(KEYS.prefs, JSON.stringify({ language: 'ar' }))
    }, { KEYS })
    await page.route('**/assets/DashboardView*', async (route) => {
      await sleep(900)
      await route.continue()
    })
    // تحميل مستند كامل → حزمة الرئيسية تُجلب من جديد (متأخرة) → الهيكل يظهر أولًا.
    const gotoP = page.goto(`${BASE}/#/dashboard`)
    const skeletonShown = await page
      .locator('[data-testid="dashboard-skeleton"]')
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    await gotoP.catch(() => {})
    check('(e) dashboard skeleton shows while its chunk is delayed', skeletonShown)
    const contentShown = await page
      .locator('[data-testid="stats-entry"]')
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    const skeletonGone = (await page.locator('[data-testid="dashboard-skeleton"]').count()) === 0
    check('(e) dashboard content replaces the skeleton', contentShown && skeletonGone)
    await page.unroute('**/assets/DashboardView*')
    check('(e) skeleton pass: no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

    await browser.close()
  } finally {
    server.kill()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P12-D POLISH QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
