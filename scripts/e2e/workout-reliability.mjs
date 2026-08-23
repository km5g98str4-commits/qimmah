// إثبات متصفح للمسار الحي Today → Workout.
// التشغيل القانوني: npm run test:e2e:workout
// يبني وضع الاستحقاق التقليدي للاختبار فقط؛ بناء الإنتاج لا يملك هذا المصدر.

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = 5324
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const ACTIVE_KEY = 'qimmah:activeWorkout:v1'
const SESSIONS_KEY = 'qimmah:history:workoutSessions:v1'

let pass = 0
let fail = 0
const failures = []
const check = (label, condition, detail = '') => {
  if (condition) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    failures.push(label)
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const startPreview = () => (EXTERNAL
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))

async function waitForServer(ms = 30_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      // لم يبدأ بعد.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('workout preview server did not start')
}

const settle = (page, ms = 700) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')].find((candidate) => matcher.test((candidate.textContent || '').trim()))
  if (!node) return false
  node.click()
  return true
}, re.source)

/**
 * يعبر مرحلة الإحماء إن ظهرت.
 *
 * `startDay` تُظهر `WarmupScreen` كلّما كان لليوم خطوات إحماء والمستخدم لم
 * يعطّلها (`show: true` افتراضًا). فانتظارُ حقل الوزن مباشرةً بعد البدء افتراضٌ
 * يتخطّى مرحلة حقيقية، ويسقط بمهلة غامضة تبدو عطلَ تفعيل.
 */
async function passWarmup(page) {
  const start = page.locator('[data-testid="warmup-start"]')
  if (await start.isVisible().catch(() => false)) {
    await start.click({ force: true })
  }
}

async function onboardToPreview(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2_600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1_200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  // النيّة تُختار **بقيمتها** ثم تُبلَّغ بنفس القيمة — لا `nth(1)` هنا و«plan»
  // هناك. الافتراضان المتباعدان أسقطا حارس «نمط الأكل» على عيبٍ لا وجود له:
  // السكربت ينقر «meals» ويخبر السائق «plan»، فيبلّغ السائق عن سؤال بلا أثر.
  const chosenIntent = await selectIntent(page, 'meals')
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosenIntent })
  await settle(page, 1_600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_400)
  // نثبّت اليوم الحالي يوم تدريب في جدول الاختبار نفسه؛ Today وWorkout يقرآن
  // مصدر الحقيقة المسجّل ذاته، ولا تعتمد الرحلة على يوم تشغيل CI.
  await page.evaluate(() => {
    const key = 'qimmah:workoutCalendar:v1'
    const schedule = JSON.parse(localStorage.getItem(key) || 'null')
    if (!schedule || !Array.isArray(schedule.weekdays) || schedule.weekdays.length !== 7) {
      throw new Error('onboarding did not persist a valid workout calendar')
    }
    schedule.weekdays[new Date().getDay()] = 0
    schedule.updatedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(schedule))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1_500)
}

async function activateFromOpenGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor()
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })
}

const activeRaw = (page) => page.evaluate((key) => localStorage.getItem(key), ACTIVE_KEY)
const sessions = (page) => page.evaluate((key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}, SESSIONS_KEY)

async function installStorageFault(page, mode) {
  await page.evaluate(({ activeKey, faultMode }) => {
    window.__qimmahWorkoutOriginalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      const reject = faultMode === 'active' ? key === activeKey : key !== activeKey
      if (reject) throw new DOMException('quota', 'QuotaExceededError')
      return window.__qimmahWorkoutOriginalSetItem.call(this, key, value)
    }
  }, { activeKey: ACTIVE_KEY, faultMode: mode })
}

async function clearStorageFault(page) {
  await page.evaluate(() => {
    if (window.__qimmahWorkoutOriginalSetItem) {
      Storage.prototype.setItem = window.__qimmahWorkoutOriginalSetItem
      delete window.__qimmahWorkoutOriginalSetItem
    }
  })
}

async function timerValue(button) {
  return button.evaluate((node) => {
    const text = node.closest('.container-page')?.textContent || ''
    const match = text.match(/\d+/)
    return match ? Number(match[0]) : NaN
  })
}

async function moveToLastExercise(page) {
  for (let i = 0; i < 20; i += 1) {
    const finish = page.getByRole('button', { name: 'إنهاء التمرين', exact: true })
    if (await finish.isVisible().catch(() => false)) return finish
    const next = page.getByRole('button', { name: 'التمرين التالي', exact: true })
    if (!(await next.isVisible().catch(() => false))) break
    await next.click()
    await settle(page, 150)
  }
  throw new Error('could not reach the last workout exercise')
}

async function completeEverySet(page) {
  for (let step = 0; step < 100; step += 1) {
    const undone = page.getByRole('button', { name: 'تم', exact: true }).first()
    if (await undone.isVisible().catch(() => false)) {
      await undone.click()
      await settle(page, 90)
      const skip = page.getByRole('button', { name: 'تخطي الراحة', exact: true })
      if (await skip.isVisible().catch(() => false)) await skip.click()
      continue
    }
    const finish = page.getByRole('button', { name: 'إنهاء التمرين', exact: true })
    if (await finish.isVisible().catch(() => false)) return finish
    const next = page.getByRole('button', { name: 'التمرين التالي', exact: true })
    if (await next.isVisible().catch(() => false)) {
      await next.click()
      await settle(page, 90)
      continue
    }
    throw new Error('full-workout traversal reached no actionable control')
  }
  throw new Error('full-workout traversal exceeded 100 actions')
}

let browser
const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const diagnostics = { console: [], pageerror: [] }
  page.on('console', (message) => { if (message.type() === 'error') diagnostics.console.push(message.text()) })
  page.on('pageerror', (error) => diagnostics.pageerror.push(String(error)))

  console.log('\n=== Today ↔ Workout — مصدر يوم واحد ومعاينة مغلقة ===')
  await onboardToPreview(page)
  const todayText = await page.locator('body').innerText()
  await page.evaluate(() => { location.hash = '/workout' })
  await page.getByRole('heading', { name: 'تمرين', exact: true }).waitFor()
  const todayMarker = page.getByText('تمرين اليوم', { exact: true })
  const workoutName = (await todayMarker.locator('xpath=..').locator('p').nth(1).innerText()).trim()
  check('Today وWorkout يعرضان اسم تمرين اليوم نفسه', workoutName.length > 0 && todayText.includes(workoutName), workoutName)

  const startToday = page.getByRole('button', { name: /^ابدأ تمرين اليوم/ }).first()
  await startToday.click()
  await page.locator('[data-testid="premium-gate"]').waitFor()
  check('المعاينة تفتح بوّابة Premium عند البدء', await page.locator('[data-testid="premium-gate"]').isVisible())
  check('المعاينة لا تنشئ لقطة تمرين قبل التفعيل', (await activeRaw(page)) === null)
  await activateFromOpenGate(page)

  await startToday.click()

  // ═══ الإحماء مرحلة قبل أول مجموعة عمل — لا يُقفز عنها ═══
  // كانت الرحلة تنتظر حقل الوزن مباشرةً بعد البدء، وهو افتراض بائت: `startDay`
  // تُظهر شاشة الإحماء أولًا (الافتراض `show: true`). فكانت تسقط بمهلة غامضة
  // تبدو عطلَ تفعيل، ومصدرها توقّعٌ يتخطّى مرحلة حقيقية.
  await page.locator('[data-testid="warmup-start"]').waitFor({ timeout: 20_000 })
  check('بدء التمرين يفتح شاشة الإحماء لا الجلسة مباشرةً',
    await page.locator('[data-testid="warmup-start"]').isVisible())
  check('وشاشة الإحماء تعرض التخطّي كخيار صريح',
    await page.locator('[data-testid="warmup-skip"]').isVisible())
  check('ولا حقل وزن قبل إتمام الإحماء أو تخطّيه — الترتيب محفوظ',
    (await page.locator('input[inputmode="decimal"]').count()) === 0)
  await page.locator('[data-testid="warmup-start"]').click({ force: true })

  await page.locator('input[inputmode="decimal"]').first().waitFor()
  check('التفعيل يفتح وضع الجلسة الحيّ', await page.getByRole('button', { name: 'إغلاق', exact: true }).isVisible())

  console.log('\n=== الوزن/التكرارات + فشل لقطة الجلسة + المؤقّت ===')
  const weight = page.locator('input[inputmode="decimal"]').first()
  const reps = page.locator('input[inputmode="numeric"]').first()
  await weight.fill('77.5')
  await reps.fill('9')
  await settle(page, 350)
  const beforeFailedSet = await activeRaw(page)
  await installStorageFault(page, 'active')
  await page.getByRole('button', { name: 'تم', exact: true }).first().click()
  await page.getByRole('alert').filter({ hasText: /لم نتمكّن من حفظ التمرين/ }).waitFor()
  check('فشل لقطة المجموعة يُعرض ولا يدّعي حفظًا', await page.getByText(/تمرينك ما زال مفتوحًا/).isVisible())
  check('فشل لقطة المجموعة يبقي آخر نسخة سليمة بلا فساد', (await activeRaw(page)) === beforeFailedSet)
  check('فشل لقطة المجموعة يبقي الوزن والتكرارات في الواجهة', await weight.inputValue() === '77.5' && await reps.inputValue() === '9')
  await clearStorageFault(page)
  await page.getByRole('button', { name: 'رجوع للتمرين', exact: true }).click()
  await reps.fill('10')
  await settle(page, 350)
  const recoveredActive = JSON.parse((await activeRaw(page)) || '{}')
  const recoveredSet = Object.values(recoveredActive.guest?.exercises || {})[0]?.sets?.[0]
  check('إعادة الكتابة بعد التعافي تحفظ الوزن والتكرارات وحالة الجولة', recoveredSet?.weightKg === '77.5' && recoveredSet?.actualReps === '10' && recoveredSet?.completed === true, JSON.stringify(recoveredSet))

  const plus30 = page.getByRole('button', { name: '+30 ث', exact: true })
  await plus30.waitFor()
  const beforePlus = await timerValue(plus30)
  await plus30.click()
  const afterPlus = await timerValue(plus30)
  check('زر +30 يزيد مؤقّت الراحة فعلًا', Number.isFinite(beforePlus) && afterPlus >= beforePlus + 29, `${beforePlus} → ${afterPlus}`)
  await page.getByRole('button', { name: 'تخطي الراحة', exact: true }).click()
  check('تخطي الراحة يغلق المؤقّت', !(await plus30.isVisible().catch(() => false)))

  console.log('\n=== reload/resume + Back الحارس ===')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'أكمل تمريني', exact: true }).waitFor()
  check('reload يعرض استئناف الجلسة بدل بدء جديد', (await activeRaw(page)) !== null)
  await page.getByRole('button', { name: 'أكمل تمريني', exact: true }).click()
  check('الاستئناف يعيد الوزن والتكرارات', await page.locator('input[inputmode="decimal"]').first().inputValue() === '77.5' && await page.locator('input[inputmode="numeric"]').first().inputValue() === '10')
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click()
  await page.getByRole('dialog', { name: 'تأكيد قبل ترك الجلسة' }).waitFor()
  check('Back مع تقدّم يفتح الحارس ولا يتخلّى بصمت', await page.getByText(/سجّلت ١ مجموعة/).isVisible())
  await page.getByRole('button', { name: 'كمّل التمرين', exact: true }).click()
  check('الخيار الآمن يرجع للجلسة', await page.locator('input[inputmode="decimal"]').first().isVisible())
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click()
  await page.getByRole('button', { name: 'وقّف الحين', exact: true }).click()
  await page.getByRole('button', { name: 'أكمل تمريني', exact: true }).waitFor()
  check('التوقّف يبقي اللقطة ويعرض الاستئناف', (await activeRaw(page)) !== null)
  await page.getByRole('button', { name: 'أكمل تمريني', exact: true }).click()

  console.log('\n=== إنهاء مبكر + quota على الكاتب الدائم ===')
  const earlyFinish = await moveToLastExercise(page)
  await earlyFinish.click()
  check('الإنهاء المبكر يعلن أن تمارين ما زالت ناقصة', await page.getByText(/لسا فيه تمارين ما خلّصتها/).isVisible())
  const activeBeforeFinishFailure = await activeRaw(page)
  await installStorageFault(page, 'history')
  await page.getByRole('button', { name: 'نعم، أنهِ واحفظ', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: /لم نتمكّن من حفظ التمرين/ }).waitFor()
  check('فشل الإنهاء لا يعرض ملخّص نجاح', !(await page.getByText(/تمرينك انحفظ/).isVisible().catch(() => false)))
  check('فشل الإنهاء يبقي لقطة الاستئناف بايتًا ببايت', (await activeRaw(page)) === activeBeforeFinishFailure)
  check('فشل الإنهاء لا يضيف جلسة منتهية', (await sessions(page)).length === 0)
  await clearStorageFault(page)
  await page.getByRole('button', { name: 'رجوع للتمرين', exact: true }).click()
  await page.getByRole('button', { name: 'إنهاء التمرين', exact: true }).click()
  await page.getByRole('button', { name: 'نعم، أنهِ واحفظ', exact: true }).click()
  await page.getByText(/تمرينك انحفظ/).waitFor()
  const afterEarly = await sessions(page)
  check('الإنهاء المبكر الناجح يُختم ended_early', afterEarly.length === 1 && afterEarly[0].status === 'ended_early', JSON.stringify(afterEarly.map((s) => s.status)))
  check('النجاح وحده يمسح لقطة الاستئناف', (await activeRaw(page)) === '{}')
  check('الملخّص يعرض التمرين القادم', await page.getByText(/تمرينك الجاي/).isVisible())
  await page.getByRole('button', { name: 'ارجع لليوم', exact: true }).click()
  await page.waitForFunction(() => location.hash.includes('dashboard'))
  check('زر «ارجع لليوم» يذهب فعلًا إلى Today', locationHash(await page.url()).includes('dashboard'))
  check('جلسة ended_early لا تُعرض كاكتمال اليوم', !(await page.getByRole('heading', { name: /^كفو عليك اليوم/ }).isVisible().catch(() => false)))

  console.log('\n=== جلسة كاملة ثانية + اكتمال Today بعد multiple completed ===')
  await page.evaluate(() => { location.hash = '/workout' })
  await page.getByRole('button', { name: /^ابدأ تمرين اليوم/ }).first().click()
  // المخرج الثاني من الإحماء: **التخطّي**. الجلسة الأولى دخلت عبر «ابدأ»،
  // وهذه تدخل عبر «تخطَّ» — فالمساران مُثبَتان لا أحدهما.
  {
    const skip = page.locator('[data-testid="warmup-skip"]')
    const shown = await skip.isVisible().catch(() => false)
    check('الإحماء يُعرض عند البدء الثاني كذلك', shown)
    if (shown) await skip.click({ force: true })
  }
  await page.locator('input[inputmode="decimal"]').first().waitFor()
  const fullFinish = await completeEverySet(page)
  await fullFinish.click()
  check('الجلسة الكاملة تعرض نص الحفظ الكامل', await page.getByText('بنحفظ تمرينك ونعرض الملخّص.', { exact: true }).isVisible())
  await page.getByRole('button', { name: 'نعم، أنهِ واحفظ', exact: true }).click()
  await page.getByText(/تمرينك انحفظ/).waitFor()
  const afterFull = await sessions(page)
  check('جلسة كاملة بعد المبكرة تعطي سجلّين بلا ازدواج', afterFull.length === 2)
  check('أحدث جلسة مكتملة صراحةً', afterFull[0]?.status === 'completed', JSON.stringify(afterFull.map((s) => s.status)))
  check('ملخّص الجلسة الكاملة يعرض التمرين القادم', await page.getByText(/تمرينك الجاي/).isVisible())
  await page.getByRole('button', { name: 'ارجع لليوم', exact: true }).click()
  await page.waitForFunction(() => location.hash.includes('dashboard'))
  await settle(page, 900)
  const completionDiagnostic = await page.evaluate((key) => {
    const history = JSON.parse(localStorage.getItem(key) || '[]')
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return { stamp, sessions: history.map((s) => ({ date: s.date, status: s.status })), body: document.body.innerText.slice(0, 600) }
  }, SESSIONS_KEY)
  check(
    'Today يتفاعل مع الجلسة المكتملة الثانية',
    await page.getByRole('heading', { name: /^كفو عليك اليوم/ }).isVisible(),
    JSON.stringify(completionDiagnostic),
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /^كفو عليك اليوم/ }).waitFor()
  check('اكتمال Today يبقى بعد reload', await page.getByRole('heading', { name: /^كفو عليك اليوم/ }).isVisible())

  console.log('\n=== نداء الإحماء في «اليوم» يفتح الإحماء فعلًا ===')
  // [LIVE-QA-005] «اليوم» يعرض «إحماء قصير · سوّه الحين»، وضغطُه كان ينفّذ
  // `onNavigate('workout')` وحدها — فيهبط المستخدم على الشاشة العامّة. شاشة
  // الإحماء موجودة وموصولة، لكن مدخلها الوحيد `startDay` **داخل** شاشة التمرين.
  //
  // يُفحص الأمران: الآلية (النيّة تُكتب وتُستهلَك) والنداء الحقيقي حين يُعرض.
  // والفصل مقصود: `suggestFirstWin` يقترح الماء بعد التاسعة مساءً، فالنداء قد
  // لا يكون معروضًا وقت التشغيل — والآلية تبقى قابلة للفحص في كل وقت.
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 1_200)

  // الآلية — حتمية في كل وقت: النيّة تُكتب ثم يُنتقل، فتُستهلَك عند الدخول.
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 900)
  await page.evaluate(() => window.sessionStorage.setItem('qimmah:workout-intent', 'warmup'))
  await page.evaluate(() => { location.hash = '/workout' })
  await settle(page, 1_600)
  check('نيّة «warmup» المحمولة عبر الحدّ تفتح شاشة الإحماء',
    await page.locator('[data-testid="warmup-start"]').isVisible().catch(() => false))
  // والنيّة **مستهلِكة**: لا يُعاد فتح الإحماء عند كل دخول لاحق.
  const intentAfter = await page.evaluate(() => window.sessionStorage.getItem('qimmah:workout-intent'))
  check('النيّة تُستهلَك عند القراءة — لا تبقى معلّقة', intentAfter === null, String(intentAfter))
  await passWarmup(page)
  await settle(page, 800)
  await page.evaluate(() => { location.hash = '/dashboard' })
  await settle(page, 1_200)
  check('⚔️ الدخول التالي بلا نيّة لا يفتح الإحماء — الفحص ليس دائم الصدق',
    !(await page.locator('[data-testid="warmup-start"]').isVisible().catch(() => false)))

  check('المسار كله بلا pageerror', diagnostics.pageerror.length === 0, diagnostics.pageerror.join(' | '))

  await context.close()
} catch (error) {
  fail += 1
  failures.push('unexpected exception')
  console.error(error)
} finally {
  await browser?.close().catch(() => {})
  preview?.kill()
}

function locationHash(url) {
  return new globalThis.URL(url).hash
}

console.log(fail === 0
  ? `\n✅ موثوقية Today/Workout: ${pass} فحوص، 0 فشل.`
  : `\n❌ موثوقية Today/Workout: ${pass} نجح، ${fail} فشل — ${failures.join(' | ')}`)
process.exit(fail === 0 ? 0 : 1)
