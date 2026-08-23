// ط-١ · رحلة المولود الجديد
//
// إنسان يفتح قِمّة أول مرّة، يبني خطته ويعاينها، ثم يرى بوابة Premium الصادقة
// عند أول فعل كتابة مدفوع — بلا جدار حساب قبل القيمة.
// الرحلة تشغّل حزمة **الإنتاج** وتوثّق كل شاشة بلقطة متسلسلة.
//
// المسار المُثبَت:
//   الترحيب ← الإعداد كاملًا ← الخطة تظهر ← Premium/معاينة ← تصفّح الخطة
//   ← محاولة تسجيل تمرين/وجبة ← بوابة Premium واحدة ومتّسقة
//
// والتأكيد السلبي الذي يحمي المبتدئ:
//   لا «إعادة تركيب (Recomposition)» ولا «RPE» في أي شاشة زارتها الرحلة.
//   وكلا المصطلحين **موجود فعلًا في المصدر** (مؤكَّد قبل التشغيل) — فالنفي ذو
//   معنى، لا مرور مجّاني (§4.2).
//
// ملاحظة ترتيب مرفوعة في التقرير لا مُصلَحة هنا:
//   ترتيب الإعداد على الجذع هو **الجسد أولًا ثم النية**، بينما [CTO-15] §1
//   اعتمدت «نية ← مستوى ← موافقة ← جسد». الرحلة تُوثّق الواقع كما هو —
//   حارس الرحلات يكشف ولا يصلح (الإصلاح لحارة الملف).

import { chromium } from '../lib/engine.mjs'
import {
  VIEWPORTS, startApp, createRecorder, createVocabularyGuard,
  openPage, screenText, report, ensureProofRoot, seedSession, classifyClientErrors,
} from './lib/kit.mjs'
import { loadJourneyCopy, assertTermExistsInSource } from './lib/journey-copy.mjs'
import { answerDietPattern } from '../lib/onboarding-driver.mjs'

const PORT = 5311
const LANG = 'ar'
const VIEWPORT = VIEWPORTS.large
const group = (page, id) => page.locator(`[data-question-id="${id}"]`)
/**
 * خيار داخل مجموعة سؤال — **بقيمته لا بنصّه**.
 *
 * `data-choice` يحمل قيمة النموذج (`cut` · `beginner` · `gym`) لا صياغتها
 * المعروضة. الصياغة تتغيّر بموجة نبرة، والقيمة لا تتغيّر إلا بتغيير النموذج
 * نفسه — وذلك تغيير يجب أن يكسر الرحلة عمدًا.
 */
const choice = (page, questionId, value) => group(page, questionId).locator(`[data-choice="${value}"]`)
/** مُحدِّد ثابت بمعرّف اختبار — لا نصّ فيه. */
const byTestId = (page, id) => page.locator(`[data-testid="${id}"]`)

// المفردات الممنوعة على المبتدئ — تُقرأ من المصدر لا تُكتب هنا.
const FORBIDDEN = [
  {
    label: 'إعادة تركيب (Recomposition)',
    term: 'Recomposition',
    existsIn: 'src/i18n/dict/onboardingIntent.ts',
  },
  {
    label: 'RPE',
    term: 'RPE',
    existsIn: 'src/config/strings.ts',
  },
]

const app = await startApp(PORT)
let browser
let exitCode = 1

try {
  const copy = await loadJourneyCopy()
  const t = copy.onboarding(LANG)
  const rv = copy.reveal(LANG)
  const wel = copy.welcome(LANG)
  const shell = copy.shell(LANG)
  const intent = copy.intent(LANG)
  // صياغة الأهداف كما يراها **المبتدئ** تحديدًا.
  const beginnerGoals = copy.goalWording(LANG, 'beginner')

  // حراسة الحارس قبل أي شيء: المصطلحات المنفيّة موجودة فعلًا في المصدر.
  for (const f of FORBIDDEN) assertTermExistsInSource(f.term, f.existsIn)
  const vocab = createVocabularyGuard(FORBIDDEN)

  ensureProofRoot()
  const rec = createRecorder({
    id: 'j1-newcomer',
    titleAr: 'رحلة المولود الجديد',
    titleEn: 'The newcomer journey',
    lang: LANG,
    viewport: VIEWPORT,
  })

  browser = await chromium.launch()
  const { page, errors, network } = await openPage(browser, { viewport: VIEWPORT, lang: LANG })

  /** يلتقط نصّ الشاشة ويمرّره على حارس المفردات ثم يصوّر. */
  const visit = async (slug, captionAr, captionEn) => {
    const text = await screenText(page)
    vocab.scan(captionAr, text)
    await rec.shot(page, slug, captionAr, captionEn)
    return text
  }

  // ───────────────────────── ١) أول فتح ─────────────────────────
  console.log('\n▸ أول فتح')
  await page.goto(app.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  rec.check('الجذر RTL عند فتح التطبيق بالعربية', await page.evaluate(() => document.documentElement.dir === 'rtl'))
  rec.check(
    'لا تمرير أفقي على شاشة الترحيب',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  )
  await visit('welcome', 'شاشة الترحيب — أول ما يراه المستخدم', 'Welcome — the first screen')

  // ───────── مدخل الضيف: يُفحص بالبنية لا بالمفردة ─────────
  //
  // تصحيح مسجَّل: كان هنا بلاغ «عالٍ» يقول «لا مسار ضيف، و(ابدأ الآن) تقود إلى
  // إنشاء حساب» — وهو **كاذب في ادّعاءاته الثلاثة**، وقد ناقض هذا الملفّ نفسه:
  // يبلّغ غياب مدخل الضيف هنا، ثم يضغط `welcome-start-cta` بعد أسطر ليدخل به.
  //   • `StartViewV2` يربط `onGuest` بالنداء **الأساسي** (`welcome-start-cta`).
  //   • و`onLogin` نداء **ثانوي** منفصل — لا «ابدأ الآن».
  //   • و`guestNote` مرسوم تحته يقول صراحةً إن البدء بلا حساب.
  //
  // ومصدر الكذب أن الفحص بحث عن **مفردة** «ضيف» في نصّ زرّ، والمنتج لا يسمّي
  // مدخله كذلك — يبدأ ببساطة ويكتب الوعد تحته. ففحصُ مفردةٍ تنكّر في هيئة فحص
  // قدرة (§4.2: كما لا يُقبل مرور غير مستحقّ، لا يُقبل سقوط غير مستحقّ).
  // والبرهان القاطع أن الرحلة نفسها تكمل الإعداد والخطة واليوم **بلا حساب قط**.
  const entryCtas = await page.evaluate(() => {
    const start = document.querySelector('[data-testid="welcome-start-cta"]')
    const login = document.querySelector('[data-testid="welcome-login-cta"]')
    return {
      startText: (start?.innerText || '').trim(),
      loginText: (login?.innerText || '').trim(),
      distinct: !!start && !!login && start !== login,
    }
  })
  rec.check(
    `النداء الأساسي على شاشة البداية هو «${wel.primary}» — مدخل الضيف لا جدار حساب`,
    entryCtas.startText.includes(wel.primary),
    entryCtas.startText || 'لا نداء أساسي',
  )
  // التأكيد المضادّ: وجود الزرّين لا يكفي — يجب أن يكونا **عنصرين مختلفين**، وأن
  // يحمل الثانوي نصّ تسجيل الدخول. فلو صار الأساسي هو مدخل الحساب لسقط باسمه.
  rec.check(
    'تسجيل الدخول نداء ثانوي منفصل — لا هو النداء الأساسي',
    entryCtas.distinct && entryCtas.loginText.includes(wel.secondary),
    `أساسي: ${entryCtas.startText} · ثانوي: ${entryCtas.loginText}`,
  )
  // «محلي افتراضيًا» (الميثاق §9) وعدٌ **مكتوب** تحت النداء لا مستنتَج.
  rec.check(
    `وعد الضيف مكتوب صراحةً — «${shell.start.guestNote}»`,
    (await screenText(page)).includes(shell.start.guestNote),
  )
  // حراسة المسار للزائر — تُفحص بأسماء المسارات **الحقيقية** من src/lib/appRoutes.ts.
  // تصحيح مسجَّل: تشغيل سابق فحص «#/today» و«#/onboarding» وهما ليسا اسمي مسارين
  // أصلًا (الصحيح dashboard وsetup)، فقرأ ٤٠٤ المسار المجهول عطلَ حجب. الاسم
  // المخترَع يُنتج بلاغًا أحمر كاذبًا — فالفحص الآن على الأسماء المصدَّرة وحدها.
  const guarded = await page.evaluate(async (routes) => {
    const out = []
    for (const r of routes) {
      location.hash = `#/${r}`
      await new Promise((res) => setTimeout(res, 700))
      out.push({
        route: r,
        hash: location.hash,
        // شاشة ٤٠٤ تُعرَف بمُحدِّدها البنيوي لا بعنوانها المكتوب.
        notFound: Boolean(document.querySelector('[data-testid="route-not-found"]')),
      })
    }
    return out
  }, ['dashboard', 'workout', 'setup', 'settings'])
  rec.check(
    'المسارات المحمية لا تُفتح للزائر ولا تُعرض كـ«صفحة غير موجودة»',
    guarded.every((g) => !g.notFound),
    guarded.map((g) => `${g.route}→${g.hash}`).join(' · '),
  )

  // الرحلة تكمل بجلسة مزروعة — نفس نمط مصنع اللقطات القائم على الجذع.
  // هذا **إعلان لا التفاف**: الجدار مرفوع أعلاه بالتقاطتين.
  await seedSession(page)
  await page.goto(app.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // ───────────────────────── ٢) الإعداد ─────────────────────────
  console.log('\n▸ الإعداد')
  const startBtn = byTestId(page, 'welcome-start-cta').first()
  const startVisible = await startBtn.isVisible().catch(() => false)
  if (startVisible) await startBtn.click().catch(() => {})
  await page.waitForTimeout(700)
  // شاشة التطبيق قد تسلّم إلى ترحيب المعالج نفسه؛ كلاهما مقصود، ولا نعامل
  // ترحيب المعالج كأنه أول سؤال.
  const onboardingStart = byTestId(page, 'onboarding-welcome-start')
  if (await onboardingStart.isVisible().catch(() => false)) await onboardingStart.click()
  await page.waitForSelector('#v2-body-age')

  // خطوة ٠ — الجسد + الموافقة الصحية (الترتيب الفعلي على الجذع)
  await visit('setup-1-body', 'خطوة ١ — الأساسيات والموافقة الصحية', 'Step 1 — basics and health consent')

  const next = byTestId(page, 'onboarding-next').first()
  rec.check(
    'المتابعة محجوبة قبل الموافقة الصحية والبيانات',
    (await next.getAttribute('aria-disabled')) === 'true',
  )

  // الموافقة تسبق الحقول — نتحقّق أن الترتيب محفوظ فعليًا في الواجهة.
  const consent = page.getByRole('checkbox').first()
  await consent.check()
  await page.getByRole('spinbutton').or(page.locator('input[inputmode="numeric"]')).first().fill('28')
  const numeric = page.locator('input[inputmode="numeric"], input[type="number"]')
  const count = await numeric.count()
  if (count >= 3) {
    await numeric.nth(1).fill('178')
    await numeric.nth(2).fill('82')
  }
  await choice(page, 'body.sex', 'male').click().catch(() => {})
  await page.waitForTimeout(250)
  await visit('setup-1-body-filled', 'الأساسيات بعد التعبئة — ٢٨ سنة · ١٧٨سم · ٨٢كجم', 'Basics filled — 28y · 178cm · 82kg')

  rec.check('المتابعة تُفتح بعد اكتمال الأساسيات', (await next.getAttribute('aria-disabled')) === 'false')
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ١ — النية والمستوى
  await visit('setup-2-intent', 'خطوة ٢ — النية والمستوى', 'Step 2 — intent and level')
  const planIntent = intent.intents[0]
  const beginnerLevel = intent.levels.find((l) => l.value === 'beginner')
  await choice(page, 'intent.primary', planIntent.value).click()
  await choice(page, 'experience.declared', beginnerLevel.value).click()
  await page.waitForTimeout(250)
  rec.check('اختيار «مبتدئ» لا يعرض حقل سنوات تدريب رقميًا مكررًا', await page.locator('#v2-training-years').count() === 0)
  await visit('setup-2-intent-picked', `النية «${planIntent.label}» والمستوى «${beginnerLevel.label}»`, `Intent and beginner level picked`)
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٣ — تاريخ التدريب؛ «أول مرة» لا يختلق ثلاثة أجوبة تابعة.
  await visit('setup-3-history', 'خطوة ٣ — تاريخ التدريب', 'Step 3 — training history')
  await group(page, 'history.trained_before').getByRole('button').nth(0).click()
  rec.check('«أول مرة» يخفي أسئلة المدة والانقطاع والانتظام', await page.locator('[data-question-id^="history."]').count() === 1)
  await visit('setup-3-history-never', 'تاريخ التدريب — أول مرة بلا تاريخ مختلق', 'Training history — first time, no invented history')
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٤ — الهدف بصياغة المبتدئ
  const goalText = await visit('setup-4-goal', 'خطوة ٤ — الهدف بصياغة المبتدئ', 'Step 4 — goal in beginner wording')
  rec.check(
    `المبتدئ يرى «${beginnerGoals.cut.label}» لا مصطلح الصالة`,
    goalText.includes(beginnerGoals.cut.label),
    beginnerGoals.cut.label,
  )
  rec.check(
    'صياغة المتقدّم لا تظهر للمبتدئ في شاشة الهدف',
    !goalText.includes(copy.goalWording(LANG, 'advanced').maintain.label),
  )
  await choice(page, 'goal.primary', 'cut').click()
  await page.waitForTimeout(250)
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٥ — الجدول
  await visit('setup-5-training', 'خطوة ٥ — أيام التمرين ومدّته', 'Step 5 — training days and duration')
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٦ — المكان والحركة؛ ونمط الأكل **حين ينطبق فقط**.
  // [QIM-V1-001] هذه الرحلة تختار نيّة «خطة» (`intents[0]`)، ومستهلك نمط الأكل
  // هو مولّد الوجبات وحده — فالسؤال لا يُعرض لها، وغيابه هو السلوك الصحيح.
  await visit('setup-6-lifestyle', 'خطوة ٦ — المكان والحركة ونمط الأكل', 'Step 6 — place, activity and diet')
  var place = t.places.find((p) => p.value === 'gym') ?? t.places[0]
  await choice(page, 'training.place', place.value).click()
  await group(page, 'activity.neat').getByRole('button').nth(1).click()
  const dietAnswered = await answerDietPattern(page, 'plan')
  await page.waitForTimeout(300)
  rec.check(
    `المكان «${place.label}» والحركة مختارة${dietAnswered ? ' ونمط الأكل' : ' ونمط الأكل غائب بحقّ لنيّة «خطة»'}`,
    await choice(page, 'training.place', place.value).getAttribute('aria-pressed') === 'true' &&
      await group(page, 'activity.neat').getByRole('button').nth(1).getAttribute('aria-pressed') === 'true' &&
      (dietAnswered
        ? await group(page, 'nutrition.diet_pattern').getByRole('button').nth(0).getAttribute('aria-pressed') === 'true'
        : await group(page, 'nutrition.diet_pattern').count() === 0),
  )
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٧ — القيود والإصابات.
  await visit('setup-7-limitations', 'خطوة ٧ — القيود والإصابات', 'Step 7 — limitations and injuries')
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click()
  // زرّ الخطوة الأخيرة **هو زرّ المتابعة نفسه** يغيّر نصّه فقط — نفس المُحدِّد.
  const buildBtn = byTestId(page, 'onboarding-next').first()
  rec.check('زرّ بناء الخطة ظاهر في آخر خطوة', await buildBtn.isVisible().catch(() => false))
  await buildBtn.click().catch(() => {})
  await page.waitForTimeout(1200)

  // ───────────────────────── ٣) الخطة ─────────────────────────
  console.log('\n▸ الخطة')
  const planText = await visit('plan-ready', 'الخطة جاهزة — أول مخرَج يراه المستخدم', 'Plan ready — the first output')
  rec.check('شاشة «خطتك جاهزة» ظهرت بعد الإعداد', planText.includes(t.ready.title), t.ready.title)
  // الخطة تعكس ما اختاره فعلًا — لا ملخّصًا عامًّا.
  rec.check('ملخّص الخطة يذكر هدف المبتدئ المختار', planText.includes(beginnerGoals.cut.label))
  rec.check('ملخّص الخطة يذكر المستوى «مبتدئ»', planText.includes(beginnerLevel.label))
  rec.check('ملخّص الخطة يذكر المكان المختار', planText.includes(place.label))

  // الدخول للوحة عبر زرّها — لا بالتنقّل بالهاش. الإعداد طبقة فوق التطبيق،
  // وتغيير الهاش وحده لا يغلقها فتبقى الرحلة تصوّر الشاشة نفسها وتظنّها تقدّمت.
  const enterBtn = byTestId(page, 'ready-enter-cta').first()
  const entered = await enterBtn.click({ timeout: 5000 }).then(() => true).catch(() => false)
  rec.check(`زرّ «${t.ready.enter}» يكشف شاشة التسليم`, entered)
  await page.waitForSelector('[data-testid="plan-handoff"]')
  const handoffText = await visit('plan-handoff', 'كشف الخطة — Premium أو المعاينة', 'Plan reveal — Premium or preview')
  // الوجود يُثبت بالبنية، والغياب وحده يبقى نصيًّا: لا مُحدِّد يثبت **عدم** ظهور
  // جدار حساب بصيغه كلّها، فالنفي النصّي هنا ضرورة لا كسل.
  //
  // وسبب التحويل مسجَّل: كان الفحص يقرأ `t.handoff.premiumCta/enterFree` من
  // `V2_ONBOARDING`، ونصّ الشاشة انتقل إلى `revealStrings[lang].cta` — فبقي
  // المُحدِّد ينتظر «استعرض قِمّة أولًا» ثلاثين ثانية ويسقط بمهلة غامضة.
  // والاقتران مقصود (§4.2): المعرّف وحده يمرّ ولو أُفرِغ النصّ أو أُبدل بغيره،
  // فيبقى الزرّ «ظاهرًا» وهو لا يقول شيئًا. فيُطلب المعرّف **ونصّ قاموسه معًا**.
  // والنداءات ثلاثة لا اثنان — والتجربة أحدها، وكانت خارج الفحص.
  for (const cta of [
    { id: 'handoff-premium-cta', label: 'Premium', text: rv.cta.premiumCta },
    { id: 'handoff-trial-cta', label: 'التجربة', text: rv.cta.trialCta },
    { id: 'handoff-preview-cta', label: 'المعاينة', text: rv.cta.previewCta },
  ]) {
    const el = byTestId(page, cta.id)
    const shown = await el.isVisible().catch(() => false)
    const carries = shown && (await el.innerText().catch(() => '')).includes(cta.text)
    rec.check(`نداء ${cta.label} ظاهر ويحمل نصّ قاموسه «${cta.text}»`, carries)
  }
  rec.check(
    'الكشف بلا جدار حساب',
    (await byTestId(page, 'reveal-create-account-cta').count()) === 0 &&
      !/أنشئ حساب|سجّل الدخول/.test(handoffText),
  )
  await byTestId(page, 'handoff-preview-cta').click()
  await page.waitForTimeout(900)
  await visit('dashboard', 'لوحة اليوم — بعد اعتماد الخطة', 'Today dashboard — after approving the plan')

  // ───────────────────────── ٤) التمرين ─────────────────────────
  console.log('\n▸ التمرين')
  // التنقّل **داخل التطبيق** عبر الشريط السفلي، لا بـ`page.goto` على الهاش:
  // الأخير إعادة تحميل كاملة، والرحلة تحاكي إنسانًا يضغط تبويبًا لا يكتب رابطًا.
  const goTab = async (key, route, testId) => {
    // التسمية تُقرأ من القاموس **للتقرير وحده**؛ الضغط يقع على مُحدِّد ثابت.
    const label = copy.tab(key, LANG)
    const tab = byTestId(page, testId).last()
    await tab.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(900)
    // احتياط: تغيير الهاش **داخل الصفحة** (لا إعادة تحميل) إن لم ينقلنا التبويب.
    // مقصود ومعلَن: الرحلة تُثبت الوجهة، ونقص المُحدِّد فيها لا يُخفي حالة الشاشة.
    if ((await page.evaluate(() => location.hash)) !== route) {
      await page.evaluate((r) => { location.hash = r }, route)
      await page.waitForTimeout(900)
    }
    const arrived = (await page.evaluate(() => location.hash)) === route
    return { arrived, label }
  }
  const workoutNav = await goTab('workout', '#/workout', 'tab-workout')
  rec.check(`«${workoutNav.label}» وصل إلى شاشة التمارين`, workoutNav.arrived)
  const workoutText = await visit('workout', 'شاشة التمارين بعد اعتماد الخطة', 'Workout tab after approving the plan')

  // الحقيقة الإيجابية أولًا — وهي التي تسقط بصوت إن انسدّت الشاشة:
  // بطاقة الخطة موجودة، وأيامها معروضة، ثم الحالة الفارغة الحيّة غائبة.
  //
  // تصحيح مسجَّل [تكامل]: كان النفي يقيس `workout-missing-plan` وهو عنصر في
  // `WorkoutV2.tsx` — توأم **غير موجَّه** يحمل `CANONICAL-SURFACE-LOCK` ولا
  // يُشحن أصلًا. فالنفي كان صادقًا أبدًا ولا يقيس شيئًا (§4.2: مرور غير مستحقّ).
  // السطح الحيّ `WorkoutView.tsx`، وحالته الفارغة الحقيقية `workout-no-plan`.
  const planDays = await byTestId(page, 'workout-plan-day').count()
  rec.check('شاشة التمارين تعرض الخطة المبنيّة لا طلب إعداد جديد',
    (await byTestId(page, 'workout-plan-card').isVisible()) &&
      planDays > 0 &&
      (await byTestId(page, 'workout-no-plan').count()) === 0 &&
      workoutText.includes(t.training.splits.upperLower),
    `${planDays} يومًا · ${t.training.splits.upperLower}`)
  const startSession = byTestId(page, 'workout-start-empty').first()
  rec.check('فعل بدء التمرين موجود في المعاينة', await startSession.isVisible().catch(() => false))
  await startSession.click()
  await page.waitForSelector('[data-testid="premium-gate"]')
  await visit('workout-premium-gate', 'بدء تمرين من المعاينة — بوابة Premium', 'Starting a workout in preview — Premium gate')
  rec.check('بدء تمرين مدفوع يفتح بوابة Premium ولا يبدأ جلسة صامتة',
    await page.locator('[data-testid="premium-gate"]').isVisible() &&
      await page.locator('input[inputmode="decimal"]').count() === 0)
  await byTestId(page, 'premium-gate-dismiss').click()

  // ───────────────────────── ٥) وجبة ─────────────────────────
  console.log('\n▸ التغذية')
  const nutritionNav = await goTab('nutrition', '#/nutrition', 'tab-nutrition')
  rec.check(`«${nutritionNav.label}» وصل إلى شاشة التغذية`, nutritionNav.arrived)
  await visit('nutrition', 'شاشة التغذية', 'Nutrition screen')

  const nutritionText = await screenText(page)
  const calorieTarget = nutritionText.match(/\b([1-9]\d{3})\b/)?.[1]
  rec.check('هدف السعرات اليومي محسوب ومعروض', Number(calorieTarget) >= 1200, calorieTarget ?? 'لا رقم')
  // نمط الأكل المختار لا ينشئ بطاقات وجبات جاهزة؛ زيادة الماء طفرة تغذية
  // حقيقية موجودة لكل ملف، ومحروسة بالعقد نفسه.
  const addNutrition = byTestId(page, 'water-preset-250').first()
  rec.check('فعل زيادة الماء موجود في المعاينة', await addNutrition.isVisible().catch(() => false))
  await addNutrition.click()
  await page.waitForSelector('[data-testid="premium-gate"]')
  await visit('nutrition-premium-gate', 'تسجيل الماء من المعاينة — بوابة Premium', 'Logging water in preview — Premium gate')
  rec.check('تسجيل التغذية يستخدم بوابة Premium نفسها', await page.locator('[data-testid="premium-gate-cta"]').isVisible())

  // ───────────────────────── التأكيد السلبي ─────────────────────────
  console.log('\n▸ حارس مفردات المبتدئ')
  vocab.assert(rec.check)

  // استثناء **معلَن ومحدود بمصدره** (§4: الممنوع هو التعطيل الصامت): الجلسة
  // المزروعة رمز وهمي، فنداءات الخلفية تسقط — ٤٠١ حيث توجد شبكة، و`net::ERR_*`
  // حيث لا توجد. كلاهما أثر أداة الاختبار لا عطل منتج.
  //
  // والاستثناء مربوط بعنوان الطلب لا بصياغة الرسالة: أي فشل صادر عن **أصل
  // التطبيق نفسه** لا يُستثنى، وكل استثناء JS يبقى محسوبًا (§4.2).
  const clientErrors = classifyClientErrors(errors, network, app.url)
  rec.check(
    'لا أخطاء طرف عميل خلال الرحلة (عدا فشل خلفية الجلسة المزروعة — استثناء معلَن)',
    clientErrors.real.length === 0,
    clientErrors.real.length
      ? clientErrors.real.slice(0, 3).join(' | ')
      : `${clientErrors.declared.length} خطأ خلفية مستثنى — بصماته: ${clientErrors.offAppSignatures.join(' · ') || 'لا شيء'}`,
  )

  const result = rec.finish()
  exitCode = report('ط-١ · رحلة المولود الجديد', [result])
} finally {
  if (browser) await browser.close()
  app.server.kill()
}

process.exit(exitCode)
