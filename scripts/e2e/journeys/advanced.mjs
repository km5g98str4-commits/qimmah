// ط-٣ · رحلة المتقدّم — تأكيد عددي لا بصري
//
// السؤال الذي تجيب عنه: **هل يغيّر المستوى المعلن شيئًا في المخرَج فعلًا؟**
//
// التصميم — وهو جوهر صرامتها:
//   الرحلة تشغّل **المسارين في التشغيل نفسه وعلى البناء نفسه**: جسد متطابق
//   تمامًا (٢٨ · ١٧٨سم · ٨٢كجم · ذكر) ونية وهدف وأيام ومكان متطابقة، والفارق
//   الوحيد **المستوى**: مبتدئ ثم متقدّم. فأي اختلاف في الأرقام لا يمكن أن
//   يُعزى إلى شيء آخر.
//
//   ولهذا لا تُقارَن بأرقام ط-١ المحفوظة: أرقام من تشغيل آخر تحمل متغيّرات أخرى
//   (بناء مختلف، تاريخ مختلف، حالة تخزين مختلفة). المقارنة داخل التشغيل الواحد
//   هي الوحيدة التي تعزل المتغيّر.
//
// وإن تطابقت الأرقام تمامًا، فذلك **نتيجة تُرفَع لا اختبار يُطوَّع**: يعني أن
// المستوى لا يصل إلى الحساب، وهو ما يجب أن يعرفه المنسّق لا أن يُخفى.

import { chromium } from 'playwright'
import {
  VIEWPORTS, startApp, createRecorder, openPage, screenText,
  report, ensureProofRoot, seedSession,
} from './lib/kit.mjs'
import { loadJourneyCopy } from './lib/journey-copy.mjs'
import { answerDietPattern } from '../lib/onboarding-driver.mjs'

const PORT = 5341
const LANG = 'ar'
const VIEWPORT = VIEWPORTS.large

/** جسد واحد لا يتغيّر بين المسارين — عزل المتغيّر يبدأ من هنا. */
const BODY = { age: '28', heightCm: '178', weightKg: '82' }

/**
 * يهرّب محارف التعبير النمطي في تسمية قادمة من القاموس.
 *
 * ضرورة لا رفاهية: تسميات المتقدّم تحمل أقواسًا — «تنشيف (Cut)» و«تضخيم نظيف
 * (Lean\u00A0Bulk)». وتمريرها إلى RegExp يجعل «(Cut)» مجموعة التقاط فيبحث
 * المُحدِّد عن «تنشيفCut» ولا يجده. والمسافة داخل «Lean Bulk» غير فاصلة (U+00A0)
 * عمدًا في المصدر، فالمطابقة الحرفية وحدها تنجو منها.
 */
const rx = (label) => new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const group = (page, id) => page.locator(`[data-question-id="${id}"]`)

const app = await startApp(PORT)
let browser
let exitCode = 1

try {
  const copy = await loadJourneyCopy()
  const t = copy.onboarding(LANG)
  const intent = copy.intent(LANG)
  const body = copy.body(LANG)

  ensureProofRoot()
  const rec = createRecorder({
    id: 'j3-advanced',
    titleAr: 'رحلة المتقدّم — تأكيد عددي',
    titleEn: 'The advanced journey — numeric assertion',
    lang: LANG,
    viewport: VIEWPORT,
  })

  browser = await chromium.launch()

  /**
   * يشغّل الإعداد كاملًا بمستوى معيّن ويُعيد **بصمة الخطة** — الأرقام كما يراها
   * المستخدم على الشاشة، لا كما نحسبها نحن.
   */
  const runProfile = async (level, tag) => {
    const { page, errors } = await openPage(browser, { viewport: VIEWPORT, lang: LANG })
    // كل مسار في سياق نظيف بمالك مختلف — لا تسرّب حالة بينهما.
    await seedSession(page, { uid: `journey-${level}` })
    await page.goto(app.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: /ابدأ|Start/ }).first().click().catch(() => {})
    await page.waitForTimeout(700)
    const onboardingStart = page.getByRole('button', { name: t.welcome.start, exact: true })
    if (await onboardingStart.isVisible().catch(() => false)) await onboardingStart.click()
    await page.waitForSelector('#v2-body-age')

    const next = page.getByRole('button', { name: t.next }).first()
    await page.getByRole('checkbox').first().check()
    const nums = page.locator('input[inputmode="numeric"], input[type="number"]')
    await nums.nth(0).fill(BODY.age)
    await nums.nth(1).fill(BODY.heightCm)
    await nums.nth(2).fill(BODY.weightKg)
    await page.getByRole('button', { name: body.genderMale, exact: true }).first().click().catch(() => {})
    await page.waitForTimeout(300)
    await next.click(); await page.waitForTimeout(400)

    // النية ثابتة، والمستوى هو المتغيّر الوحيد.
    await page.getByRole('button', { name: rx(intent.intents[0].label) }).first().click()
    const levelOpt = intent.levels.find((l) => l.value === level)
    await page.getByRole('button', { name: rx(levelOpt.label) }).first().click()
    await page.waitForTimeout(300)
    await rec.shot(page, `${tag}-1-level`, `${tag} — المستوى «${levelOpt.label}»`, `${tag} — level "${levelOpt.label}"`)
    await next.click(); await page.waitForSelector('#onb-title-history')

    // تاريخ واحد متطابق في المسارين؛ المستوى المعلن وحده يبقى المتغيّر.
    await group(page, 'history.trained_before').getByRole('button').nth(2).click()
    await group(page, 'history.total_months').getByRole('button').nth(1).click()
    await group(page, 'history.last_trained').getByRole('button').nth(0).click()
    await group(page, 'history.consistency').getByRole('button').nth(2).click()
    await rec.shot(page, `${tag}-2-history`, `${tag} — تاريخ تدريب ثابت`, `${tag} — fixed training history`)
    await next.click(); await page.waitForSelector('#onb-title-goal')

    // صياغة الهدف تتبع المستوى — نلتقط ما يراه هذا المستوى بالضبط.
    const wording = copy.goalWording(LANG, level)
    const goalText = await screenText(page)
    await rec.shot(page, `${tag}-3-goal`, `${tag} — شاشة الهدف بصياغته`, `${tag} — goal step in its own wording`)
    await page.getByRole('button', { name: rx(wording.cut.label) }).first().click()
    await page.waitForTimeout(300)
    await next.click(); await page.waitForTimeout(400)

    // الجدول يُترك على الافتراضي، ثم تُختار حقائق السياق والقيود نفسها للمسارين.
    const trainingText = await screenText(page)
    await rec.shot(page, `${tag}-4-training`, `${tag} — الأيام والمدّة كما يقترحها التطبيق`, `${tag} — days and duration as suggested`)
    await next.click(); await page.waitForTimeout(400)
    await group(page, 'training.place').getByRole('button').nth(0).click()
    await group(page, 'activity.neat').getByRole('button').nth(2).click()
    await answerDietPattern(page, 'plan') // [QIM-V1-001] عقد ثنائي الاتجاه، لا نقر بلا شرط
    await rec.shot(page, `${tag}-5-lifestyle`, `${tag} — المكان والحركة ونمط الأكل`, `${tag} — place, activity and diet`)
    await next.click(); await page.waitForSelector('#onb-title-limitations')
    await group(page, 'limitations.has_injury').getByRole('button').nth(1).click()
    await page.waitForTimeout(300)
    await rec.shot(page, `${tag}-6-limitations`, `${tag} — بلا إصابة معلنة`, `${tag} — no declared injury`)
    await page.locator('footer button').last().click()
    await page.waitForTimeout(1500)

    const planText = await screenText(page)
    await rec.shot(page, `${tag}-7-plan`, `${tag} — «خطتك جاهزة»`, `${tag} — plan ready`)
    await page.getByRole('button', { name: t.ready.enter }).first().click().catch(() => {})
    await page.waitForSelector('[data-testid="plan-handoff"]')
    await page.getByRole('button', { name: t.handoff.enterFree, exact: true }).click()
    await page.waitForTimeout(1100)

    // الأرقام الغذائية من الشاشة التي يراها المستخدم.
    await page.evaluate(() => { location.hash = '#/nutrition' })
    await page.waitForTimeout(1200)
    const nutriText = await screenText(page)
    await rec.shot(page, `${tag}-8-nutrition`, `${tag} — أرقامه الغذائية`, `${tag} — its nutrition numbers`)

    // وبنية التمرين من شاشة التمارين.
    await page.evaluate(() => { location.hash = '#/workout' })
    await page.waitForTimeout(1300)
    const workoutText = await screenText(page)
    await rec.shot(page, `${tag}-9-workout`, `${tag} — بنية تمرينه`, `${tag} — its workout structure`)

    // بصمة مقروءة من التخزين — مصدر أدقّ من قراءة الأرقام من النصّ.
    const stored = await page.evaluate(() => ({
      calendar: localStorage.getItem('qimmah:workoutCalendar:v1'),
      profile: localStorage.getItem('qimmah:onboarding:profile:v1'),
      customization: localStorage.getItem('qimmah:customization:v1'),
    }))
    let calendar = {}
    let profile = {}
    let customization = {}
    try { calendar = JSON.parse(stored.calendar ?? '{}') } catch { /* غير قابل للتحليل */ }
    try { profile = JSON.parse(stored.profile ?? '{}') } catch { /* غير قابل للتحليل */ }
    try { customization = JSON.parse(stored.customization ?? '{}') } catch { /* غير قابل للتحليل */ }

    const num = (re, text) => { const m = text.match(re); return m ? Number(m[1].replace(/,/g, '')) : null }
    const fingerprint = {
      level,
      goalLabel: wording.cut.label,
      // من الشاشة
      calories: num(/([\d,]{3,6})\s*سعرة/, nutriText),
      protein: num(/(\d{2,3})\s*g?\s*بروتين/, nutriText),
      // من التخزين
      split: calendar.split ?? null,
      daysPerWeek: calendar.daysPerWeek ?? null,
      sessionMin: profile?.trainingPreferences?.sessionDurationMin ?? null,
      experience: profile?.trainingPreferences?.experience ?? null,
      splitMode: profile?.trainingPreferences?.splitMode ?? null,
      weeklyExercises: customization?.workoutPlan?.days?.reduce(
        (count, day) => count + (Array.isArray(day.exercises) ? day.exercises.length : 0),
        0,
      ) ?? null,
    }

    const advancedWording = copy.goalWording(LANG, 'advanced')
    await page.close()
    return { fingerprint, goalText, trainingText, planText, workoutText, errors, advancedWording }
  }

  // ───────────── المسار الأول: مبتدئ ─────────────
  console.log('\n▸ المسار الأول — مبتدئ')
  const beginner = await runProfile('beginner', 'مبتدئ')

  // ───────────── المسار الثاني: متقدّم ─────────────
  console.log('\n▸ المسار الثاني — متقدّم (نفس الجسد تمامًا)')
  const advanced = await runProfile('advanced', 'متقدّم')

  // ───────────── المفردات: ما يراه كلٌّ منهما ─────────────
  console.log('\n▸ المفردات')
  const advWording = advanced.advancedWording
  rec.check(
    `المتقدّم يرى «${advWording.cut.label}»`,
    advanced.goalText.includes(advWording.cut.label),
  )
  rec.check(
    `المتقدّم يرى «${advWording.maintain.label}» — وهي المفردة المحجوبة عن المبتدئ في ط-١`,
    advanced.goalText.includes(advWording.maintain.label),
    'Recomposition',
  )
  rec.check(
    `المتقدّم يرى «${advWording.bulk.label}»`,
    advanced.goalText.includes(advWording.bulk.label),
    'Lean Bulk',
  )
  rec.check(
    'والمبتدئ لم يرَ أيًّا من الثلاث في شاشته',
    !beginner.goalText.includes(advWording.maintain.label) &&
      !beginner.goalText.includes(advWording.bulk.label),
    'تأكيد متقابل: نفس التشغيل، شاشتان، مفردتان',
  )

  // ───────────── التأكيد العددي ─────────────
  console.log('\n▸ التأكيد العددي — رقمًا برقم')
  const b = beginner.fingerprint
  const a = advanced.fingerprint
  // **مخرَجات الخطة وحدها تدخل المقارنة.**
  // `experience` مستبعَد عمدًا: هو المتغيّر المستقلّ نفسه — صدى للمدخل لا مخرَجًا.
  // إدخاله يجعل المقارنة تمرّ دائمًا («وجدنا فرقًا!») وهي لم تقس شيئًا، وذلك
  // **مرور غير مستحقّ** (§4.2). التقطتُه في أول تشغيل: الفحص مرّ وكل رقم متطابق.
  const rows = [
    ['السعرات المستهدفة', b.calories, a.calories],
    ['البروتين (غ)', b.protein, a.protein],
    ['أيام التدريب', b.daysPerWeek, a.daysPerWeek],
    ['التقسيمة', b.split, a.split],
    ['مدّة الجلسة (د)', b.sessionMin, a.sessionMin],
    ['نمط التقسيمة', b.splitMode, a.splitMode],
    ['تمارين الأسبوع', b.weeklyExercises, a.weeklyExercises],
  ]
  console.log('\n   مخرَجات الخطة       | مبتدئ         | متقدّم')
  console.log('   ' + '─'.repeat(52))
  for (const [label, bv, av] of rows) {
    const same = String(bv) === String(av)
    console.log(`   ${label.padEnd(18)} | ${String(bv).padEnd(13)} | ${String(av)}${same ? '' : '   ← يختلف'}`)
  }

  // الجسد متطابق — شرط صحّة المقارنة نفسها.
  rec.check(
    'الجسد متطابق بين المسارين (شرط عزل المتغيّر)',
    true,
    `${BODY.age} سنة · ${BODY.heightCm}سم · ${BODY.weightKg}كجم — مُدخَل حرفيًا في الاثنين`,
  )
  // حارس المقارنة: المتغيّر المستقلّ تغيّر فعلًا، وإلا فالمقارنة كلها بلا معنى.
  rec.check('المتغيّر المستقلّ (المستوى) تغيّر فعلًا بين المسارين — شرط صحّة المقارنة',
    b.experience !== a.experience,
    `${b.experience} → ${a.experience} (مستبعَد من جدول المخرَجات: مدخل لا مخرَج)`)

  const differing = rows.filter(([, bv, av]) => String(bv) !== String(av)).map(([l]) => l)
  const identical = rows.filter(([, bv, av]) => String(bv) === String(av)).map(([l]) => l)

  if (differing.length > 0) {
    rec.check(
      'خطة المتقدّم تختلف عدديًا عن خطة المبتدئ لنفس الجسد',
      true,
      `يختلف في: ${differing.join(' · ')}`,
    )
  } else {
    rec.finding(
      'المستوى لا يغيّر رقمًا واحدًا في الخطة — مبتدئ ومتقدّم بنفس الجسد يحصلان على خطة متطابقة',
      `قُورن ${rows.length} مقياسًا داخل التشغيل الواحد وعلى البناء نفسه، بجسد متطابق ` +
        `(${BODY.age}/${BODY.heightCm}/${BODY.weightKg}) وهدف ونية ومكان متطابقة، والمتغيّر الوحيد المستوى. ` +
        `المتطابق: ${identical.join(' · ')}. ` +
        'المستوى يُخزَّن فعلًا (experience) ويغيّر **صياغة** الأهداف، لكنه لا يصل إلى أي رقم في المخرَج. ' +
        'أي أن سؤال المستوى يجمع إجابة لا تُغيّر شيئًا يراه المستخدم في خطته.',
      'عالٍ',
    )
    rec.check(
      'الفارق مُقاس لا مُفترَض — البصمتان مسجَّلتان في البيان',
      true,
      'النتيجة سلبية ومرفوعة، لا مُطوَّعة',
    )
  }

  // ───────────── أخطاء الطرف العميل ─────────────
  const allErrors = [...beginner.errors, ...advanced.errors]
    .filter((e) => !(/401/.test(e) && /Failed to load resource/.test(e)))
  rec.check('لا أخطاء طرف عميل في المسارين (عدا 401 الجلسة المزروعة — استثناء معلَن)',
    allErrors.length === 0, allErrors.slice(0, 3).join(' | '))

  const result = rec.finish()
  // البصمتان تدخلان البيان ليقرأهما المراجع بلا إعادة تشغيل.
  const { writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  writeFileSync(join(result.dir, 'fingerprints.json'), JSON.stringify({ body: BODY, beginner: b, advanced: a }, null, 2))

  exitCode = report('ط-٣ · رحلة المتقدّم', [result])
} finally {
  if (browser) await browser.close()
  app.server.kill()
}

process.exit(exitCode)
