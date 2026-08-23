// مصنع لقطات App Store (P0) — يلتقط الأسطح الستّة من خطة اللقطات (docs/appstore/04-screenshots.md)
// بأبعاد 6.9" الإلزامية (1260×2736px، مُتحقَّق من صفحة Apple الرسمية) عبر Playwright headless.
//
// لا يُنشئ حسابًا حقيقيًا ولا يمرّ بتحقق بريد: يزرع جلسة Supabase وهمية في localStorage
// (طرف عميل بحت، بلا نداء شبكي مصادقة حقيقي) على غرار سلسلة إثباتات المشروع
// (active-session-proof.ts) — فقط لأغراض التصوير المحلي، ثم يُكمل الإعداد/يسجّل تمرينًا
// ووجبة عبر واجهة التطبيق الحقيقية (بيانات صحيحة الشكل تلقائيًا).
//
// التشغيل:  VITE_DESIGN_V2=true npm run build && node scripts/appstore-screenshot-factory.mjs
// (يبني vite preview بنفسه إن لم يُمرَّر PREVIEW_URL)

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const PORT = 5299
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const OUT_DIR = 'docs/appstore/screenshots/raw'
// 6.9" — الحجم الإلزامي الوحيد (Apple: developer.apple.com/help/app-store-connect/…/screenshot-specifications).
// مهم: لا نضبط viewport على 1260×2736 مباشرة — تصميم التطبيق للجوال (~420×932 منطقي).
// نضبط viewport بأبعاد منطقية حقيقية (420×912، مطابقة لـ iPhone 16/17 Pro Max) مع
// deviceScaleFactor: 3 فيُخرج Playwright PNG فعلي 1260×2736 (420×3, 912×3) مطابقًا
// للواجهة كما تُعرض فعليًا على الجهاز — لا صفحة مصغّرة داخل قماش فارغ ضخم.
const LOGICAL_WIDTH = 420
const LOGICAL_HEIGHT = 912
const DPR = 3
const WIDTH = LOGICAL_WIDTH * DPR
const HEIGHT = LOGICAL_HEIGHT * DPR

mkdirSync(OUT_DIR, { recursive: true })

function startPreview() {
  if (EXTERNAL) return null
  return spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: process.env,
  })
}

async function waitForServer(ms = 20000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(URL)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

/** جلسة Supabase وهمية — طرف عميل بحت، بلا حساب حقيقي ولا نداء مصادقة شبكي. */
function seedMockSession(uid) {
  const nowSec = Math.floor(Date.now() / 1000)
  const session = {
    access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowSec + 365 * 24 * 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'appreview@qimmah.app',
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: { display_name: 'قِمّة' },
      app_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }
  return session
}

// أزرار «تقدّم للأمام» في تدفّق الإعداد.
//
// «يلا نبدأ» / «Get started» هما زرّ **شاشة الترحيب** التي تسبق أول سؤال
// (`V2_ONBOARDING[lang].welcome.start` في `src/design-system/v2/labels.ts`).
// وغيابهما عن هذا النمط كان يوقف المتجوّل على الشاشة الأولى: ثماني محاولات
// كلّها «no action (transient screen?)» ثم `reviewer journey did not save a
// workout session` — فتحمرّ `test:e2e:journey` ومعها `test:release-gate`.
// وهو **عطل أداة لا عطل منتج**: إثبات الإعداد المخصّص (`test:e2e:onboarding`)
// يمرّ ٢٠/٢٠ ويؤكّد صراحةً أن «شاشة الترحيب تسبق أول سؤال».
const CONFIRM_RE = /التالي|Next|إنهاء|إكمال|ابدأ الآن|يلا نبدأ|Get started|اعتمد خطي|اعتمد|الدخول للوحة|Approve|Confirm|Enter/
const NAV_EXCLUDE_RE = /التالي|رجوع|تخطّي|Next|Back|Skip|يلا نبدأ|Get started|اعتمد|Approve|Confirm/

/**
 * يتقدّم في معالج الإعداد: قد تحوي الخطوة أكثر من مجموعة خيارات (مثل مكان التمرين +
 * التفضيل) يجب اختيار واحد من كل مجموعة قبل تفعيل زرّ المتابعة. نُكرّر: اختر أول خيار
 * غير محدَّد متاح ثم جرّب زرّ المتابعة، حتى ينجح النقر أو ننفد المحاولات.
 */
async function completeOnboarding(page, maxSteps = 8) {
  for (let i = 0; i < maxSteps; i += 1) {
    await page.waitForTimeout(350)
    if (/مسار اليوم/.test(await page.locator('body').innerText().catch(() => ''))) break
    const heading = await page.locator('h1, h2').first().innerText().catch(() => '')

    // خطوة الأساسيات («نبدأ بأساسياتك») لا تُجتاز بالنقر: العمر والطول والوزن
    // حقول نصّية، والجنس اختيار. والمتجوّل العام لا يكتب — فكان يقف هنا ثماني
    // محاولات ثم يفشل. نفس عقد `fillBodyAndConsent` في `scripts/e2e-onboarding.mjs`
    // (نفس الأسماء المتاحة، لا محدّدات جديدة). قيم fixture للقطات فقط.
    for (const [re, value] of [[/العمر|Age/, '24'], [/الطول|Height/, '175'], [/الوزن|Weight/, '78']]) {
      const field = page.getByRole('textbox', { name: re }).first()
      if (await field.isVisible().catch(() => false)) await field.fill(value).catch(() => {})
    }
    const sex = page.getByRole('button', { name: /^(ذكر|Male)$/ }).first()
    if (await sex.isVisible().catch(() => false)) await sex.click().catch(() => {})

    // v2 goal step has two independent requirements: select a goal and accept
    // health-data processing. Satisfy them explicitly before generic traversal.
    const goal = page.getByRole('button', { name: /تنشيف|Fat loss/ }).first()
    if (await goal.isVisible().catch(() => false)) await goal.click().catch(() => {})
    const consent = page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية|health data/ }).first()
    if (await consent.isVisible().catch(() => false)) await consent.check().catch(() => {})

    let advanced = false
    for (let attempt = 0; attempt < 6 && !advanced; attempt += 1) {
      const confirmBtn = page.getByRole('button', { name: CONFIRM_RE }).first()
      const confirmEnabled = await confirmBtn
        .isEnabled({ timeout: 800 })
        .catch(() => false)
      if (confirmEnabled) {
        advanced = await confirmBtn.click({ timeout: 3000 }).then(() => true).catch(() => false)
        if (advanced) break
      }
      // لم يُفعَّل الزرّ بعد — اختر خيارًا غير محدَّد آخر (مجموعة ثانية على الأرجح).
      const unselected = page
        .locator('main button, [role="main"] button')
        .filter({ hasNotText: NAV_EXCLUDE_RE })
        .filter({ hasNot: page.locator('[aria-pressed="true"]') })
      const opt = unselected.nth(attempt)
      const clickedOpt = await opt.click({ timeout: 2000 }).then(() => true).catch(() => false)
      if (!clickedOpt) break // لا خيارات إضافية — توقّف بدل حلقة عقيمة
      await page.waitForTimeout(250)
    }
    console.log(`  step ${i + 1}: "${heading}" → ${advanced ? 'advanced' : 'no action (transient screen?)'}`)
    // لا نتوقّف عند STUCK ظاهري — قد تكون شاشة انتقالية (بناء الخطة) بلا أزرار مؤقّتًا.
    // maxSteps نفسه يمنع حلقة لا نهائية حقيقية.
    await page.waitForTimeout(advanced ? 0 : 900)
  }
}

/**
 * يُكمل جلسة تمرين **كاملة** (كل المجموعات لكل التمارين) — لا مخرج مبكّر في الواجهة:
 * finishSet() لا يحفظ في السجلّ (persistFinishedSession) إلا عند آخر مجموعة من آخر
 * تمرين. الحفاظ على السجلّ حقيقيًا (لا بيانات وهمية) يعني إكمال الجلسة فعليًا.
 */
async function logOneWorkout(page, { onMidSession, maxSets = 40 } = {}) {
  await page.goto(`${URL}/#/workout`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  // قد يترك المتجوّل العام خطوة الإعداد داخل تفاصيل تمرين أو مع لوحة استبدال
  // مفتوحة. أغلق اللوحة ثم ابدأ من السطح الحالي (الخطة أو التفاصيل).
  const cancelSheet = page.getByRole('button', { name: /إلغاء|Cancel/ }).last()
  if (await cancelSheet.isVisible().catch(() => false)) {
    await cancelSheet.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(200)
  }
  // «ابدأ تمرين اليوم» (`strings.ts:startToday`) هو المدخل الفعلي على شاشة
  // التمرين الحيّة، و«ابدأ التمرين» (`labels.ts:workoutCta`) مدخل بطاقة اليوم.
  // كان النمط يطلب «ابدأ التمرين» بأل التعريف فلا يطابق الأول إطلاقًا.
  const startSession = page.getByRole('button', { name: /ابدأ الجلسة|Start session/ }).first()
  const startExercise = page
    .getByRole('button', { name: /ابدأ تمرين اليوم|ابدأ التمرين|Start today'?s workout|Start exercise/ })
    .first()
  const started = await startSession.isVisible().catch(() => false)
    ? await startSession.click({ timeout: 3000 }).then(() => true).catch(() => false)
    : await startExercise.isVisible().catch(() => false)
      ? await startExercise.click({ timeout: 3000 }).then(() => true).catch(() => false)
      : false
  if (!started) {
    const diagnostic = await page.evaluate(() => ({
      body: document.body.innerText.slice(0, 1200),
      qimmahKeys: Object.keys(localStorage).filter((key) => key.startsWith('qimmah:')).sort(),
      calendar: localStorage.getItem('qimmah:workoutCalendar:v1'),
    }))
    console.log('  workout start unavailable:', JSON.stringify(diagnostic))
    return false
  }
  await page.waitForTimeout(400)

  // Canonical persistence probe: enter a distinctive 99 kg before the first set.
  const weightInput = page.locator('input[inputmode="decimal"], input[type="number"]').first()
  if (await weightInput.isVisible().catch(() => false)) await weightInput.fill('99')

  // مجموعتان أوليتان → لقطة الشاشة (جلسة نشطة، مجموعة قيد التنفيذ) قبل إكمال البقية بصمت.
  for (let i = 0; i < 2; i += 1) {
    const completeSet = page.getByRole('button', { name: /أنهِ المجموعة|Complete set/ }).first()
    if (!(await completeSet.isVisible().catch(() => false))) break
    await completeSet.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(350)
    const skipRest = page.getByRole('button', { name: /تخطي|Skip/ }).first()
    if (await skipRest.isVisible().catch(() => false)) {
      await skipRest.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(250)
    }
  }
  if (onMidSession) await onMidSession()

  for (let i = 0; i < maxSets; i += 1) {
    const completeScreen = await page
      .locator('text=أنهيت الجلسة, text=Session complete')
      .first()
      .isVisible()
      .catch(() => false)
    if (completeScreen) break
    const completeSet = page.getByRole('button', { name: /أنهِ المجموعة|Complete set/ }).first()
    if (!(await completeSet.isVisible().catch(() => false))) break
    await completeSet.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(350)
    const skipRest = page.getByRole('button', { name: /تخطي|Skip/ }).first()
    if (await skipRest.isVisible().catch(() => false)) {
      await skipRest.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(250)
    }
  }
  const saveFinish = page.getByRole('button', { name: /احفظ وأنهِ|حفظ وإنهاء|save & finish/i }).first()
  const saved = await saveFinish
    .click({ timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (saved) await page.waitForTimeout(500)
  return saved
}

async function logMealAndWater(page) {
  await page.goto(`${URL}/#/nutrition`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  const addWater = page.getByRole('button', { name: /\+ ?٢٥٠ ?مل|\+250 ?ml/ }).first()
  await addWater.click({ timeout: 3000 }).catch(() => {})

  // زرّ «أضف وجبة» الرئيسي تحديدًا (لا «أضف ‹» الفرعي بجانب صف الماكروز) — نص كامل يمنع الالتباس.
  const addMeal = page.getByRole('button', { name: /^أضف وجبة|^Add meal/ }).first()
  const opened = await addMeal.click({ timeout: 3000 }).then(() => true).catch(() => false)
  if (opened) {
    // ننتظر ظهور فعلي لحقل البحث (تأكيد أنّ لوحة الإضافة فتحت) قبل اختيار عنصر.
    const searchInput = page.getByPlaceholder(/ابحث عن طعام|Search food/).first()
    const panelOpen = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)
    if (panelOpen) {
      const firstFood = page.locator('button[aria-label^="أضف "]').first()
      const foodLabel = await firstFood.getAttribute('aria-label').catch(() => null)
      const foodVisible = await firstFood.isVisible({ timeout: 3000 }).catch(() => false)
      if (foodVisible) {
        await firstFood.click({ timeout: 3000 }).catch(() => {})
        // ننتظر إغلاق لوحة الإضافة فعليًا (اختفاء حقل البحث) قبل المتابعة — لا نلتقط
        // الشاشة أثناء انتقال الحالة.
        await searchInput.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
        console.log(`  logged food: ${foodLabel}`)
      } else {
        console.log('  ⚠️ food add panel opened but no food row found (list may need a search term)')
      }
    } else {
      console.log('  ⚠️ "أضف وجبة" click did not open the add-food panel')
    }
  } else {
    console.log('  ⚠️ could not find/click "أضف وجبة"')
  }
  await page.waitForTimeout(400)
}

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })

  // ——— لقطة ١: الترحيب (StartViewV2) — سياق ضيف بلا جلسة إطلاقًا. ———
  const guestCtx = await browser.newContext({ viewport: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }, deviceScaleFactor: DPR, locale: 'ar' })
  const guestPage = await guestCtx.newPage()
  await guestPage.goto(URL, { waitUntil: 'domcontentloaded' })
  await guestPage.waitForTimeout(2600) // انتظار زوال الشاشة الافتتاحية
  await guestPage.screenshot({ path: `${OUT_DIR}/01-welcome.png` })
  console.log('✅ 01-welcome.png')
  await guestCtx.close()

  // ——— سياق المُراجِع المزروع: بقية الأسطح الخمسة. ———
  const ctx = await browser.newContext({ viewport: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }, deviceScaleFactor: DPR, locale: 'ar' })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate((session) => {
    localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(session))
  }, seedMockSession('reviewer-shot-0001-0000-0000-000000000000'))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)

  console.log('— onboarding —')
  await completeOnboarding(page)

  // لقطة المراجعة يجب أن تختبر جلسة فعلية مهما كان يوم تشغيل البوابة. إن صادف
  // اليوم يوم راحة في الجدول المولّد، أضف تجاوزًا محليًا لهذا التاريخ إلى أول
  // يوم في الخطة. هذا fixture للـE2E فقط، ولا يغيّر سلوك المنتج أو خطة حقيقية.
  await page.evaluate(() => {
    const key = 'qimmah:workoutCalendar:v1'
    const now = new Date()
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    const raw = localStorage.getItem(key)
    const current = raw ? JSON.parse(raw) : null
    const schedule = current && Array.isArray(current.weekdays) && current.weekdays.length === 7
      ? current
      : {
          version: 1,
          weekdays: ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'],
          split: 'full_body',
          daysPerWeek: 1,
          weekStart: 6,
          overrides: {},
          missedDecisions: {},
          source: 'user',
          updatedAt: new Date().toISOString(),
        }
    schedule.overrides = { ...(schedule.overrides ?? {}), [date]: 0 }
    schedule.updatedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(schedule))
  })
  // أعد تحميل الوثيقة حتى يقرأ نموذج التمرين نفس التجاوز قبل إنشاء الجلسة؛
  // تغيير hash داخل الوثيقة وحده قد يُبقي نموذج اليوم السابق في الذاكرة.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)

  // التمرين: لقطة الجلسة النشطة عند مجموعتين، ثم إكمال الجلسة كاملة بصمت (23 مجموعة على
  // الأرجح) وحفظها فعليًا — بيانات التقدّم/الملف الشخصي الحقيقية تعتمد على جلسة محفوظة.
  const workoutLogged = await logOneWorkout(page, {
    onMidSession: async () => {
      await page.screenshot({ path: `${OUT_DIR}/03-workout.png` })
      console.log('✅ 03-workout.png (mid-session)')
      // Persistence seam: WorkoutMode's stepper does not expose a text input and its
      // fixed increments cannot represent the distinctive 99 kg probe. Update only the
      // next unfinished set in the already-created owner-scoped snapshot, then reload a
      // fresh document. The assertion below still exercises the production validator,
      // owner key, restore path, and rendered UI rather than merely inspecting storage.
      // ⚠️ المفتاح المفحوص هنا هو **مفتاح الشاشة الحيّة**: `qimmah:activeWorkout:v1`
      // (`src/lib/activeWorkout.ts`, يكتبه `WorkoutMode` المركَّب داخل `WorkoutView`).
      // كان الفحص يقرأ `qimmah:active-workout:v2:<owner>` — وهو مفتاح
      // `src/views/WorkoutV2.tsx`، **شاشة يتيمة بلا مستورد**؛ فكان يعود `false`
      // دائمًا ويُسقط الرحلة بـ«could not seed the next set». سجلّ المفاتيح
      // (`src/lib/userDataKeys.ts:73`) ما زال ينسب المفتاح إلى تلك الشاشة اليتيمة
      // ولا يسجّل المفتاح الحيّ إطلاقًا — بندٌ مرفوع في تقرير التدقيق.
      //
      // الشكل الحيّ: سجلّ مفهرس بـ ownerKey (`userId ?? 'guest'`) ← جلسة واحدة،
      // و`exercises[planItemId].sets[]` عناصرها `{ weightKg, completed, … }`.
      // وبذرة خاطئة لا تُنتج نجاحًا زائفًا: التأكيد بعدها يقرأ الواجهة المرسومة
      // بعد إعادة تحميل، فإن لم يُستعَد «99» فعلًا بقي الفحص أحمر.
      const persisted = await page.evaluate(() => {
        const raw = localStorage.getItem('qimmah:activeWorkout:v1')
        if (!raw) return false
        const registry = JSON.parse(raw)
        const owner = Object.keys(registry || {})[0]
        const session = owner ? registry[owner] : null
        if (!session || !session.exercises) return false
        for (const state of Object.values(session.exercises)) {
          const next = (state?.sets || []).find((s) => s && !s.completed)
          if (next) {
            next.weightKg = '99'
            localStorage.setItem('qimmah:activeWorkout:v1', JSON.stringify(registry))
            return true
          }
        }
        return false
      })
      if (!persisted) throw new Error('active-session persistence probe could not seed the next set')
      // Simulate kill/resume: a fresh document must restore the owner-scoped snapshot,
      // including the distinctive 99 kg value, before the remaining sets are completed.
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2600)
      const body = await page.locator('body').innerText()
      if (!body.includes('99') && !body.includes('٩٩')) {
        const stored = await page.evaluate(() => {
          const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('qimmah:active-workout:v2:'))
          return key ? localStorage.getItem(key) : null
        })
        throw new Error(`active session did not restore 99 kg after reload; body=${body.slice(0, 600)}; stored=${stored?.slice(0, 800)}`)
      }
      await page.screenshot({ path: `${OUT_DIR}/03b-workout-resumed.png` })
      console.log('✅ 03b-workout-resumed.png (fresh document)')
    },
  })
  if (!workoutLogged) throw new Error('reviewer journey did not save a workout session')
  console.log('  workout session saved (Save & finish clicked)')

  await logMealAndWater(page)
  await page.screenshot({ path: `${OUT_DIR}/04-nutrition.png` })
  console.log('✅ 04-nutrition.png')

  // التقاط اليوم/التقدّم/الملف الشخصي أخيرًا — بعد حفظ التمرين والوجبة، فتعكس نشاطًا حقيقيًا
  // لا حالة فارغة (مطابقة لنيّة الخطة: حلقات قيد التقدّم لا صفرية).
  await page.goto(`${URL}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/02-today.png` })
  console.log('✅ 02-today.png')

  await page.goto(`${URL}/#/progress`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/05-progress.png` })
  console.log('✅ 05-progress.png')

  await page.goto(`${URL}/#/profile`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/06-profile.png` })
  console.log('✅ 06-profile.png')

  await ctx.close()
  console.log(`\nAll captures written to ${OUT_DIR}/ at ${WIDTH}x${HEIGHT}.`)
} finally {
  await browser?.close()
  preview?.kill()
}
