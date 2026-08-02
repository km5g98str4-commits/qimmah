// ط-١ · رحلة المولود الجديد
//
// إنسان يفتح قِمّة أول مرّة ويصل إلى وجبة مسجَّلة، بلا أي معرفة سابقة.
// الرحلة تشغّل حزمة **الإنتاج** وتوثّق كل شاشة بلقطة متسلسلة.
//
// المسار المُثبَت:
//   الترحيب ← الإعداد كاملًا ← الخطة تظهر ← أول تمرين ← جولة تُسجَّل
//   ← إنهاء بالتأكيد ← وجبة «كبسة» تُبحث وتُسجَّل
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

import { chromium } from 'playwright'
import {
  VIEWPORTS, startApp, createRecorder, createVocabularyGuard,
  openPage, screenText, report, ensureProofRoot, seedSession,
} from './lib/kit.mjs'
import { loadJourneyCopy, assertTermExistsInSource } from './lib/journey-copy.mjs'

const PORT = 5311
const LANG = 'ar'
const VIEWPORT = VIEWPORTS.large

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
  const intent = copy.intent(LANG)
  const body = copy.body(LANG)
  const policy = copy.policy(LANG)
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
  const { page, errors } = await openPage(browser, { viewport: VIEWPORT, lang: LANG })

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

  // ───────── جدار الحساب: ما يصطدم به المولود الجديد فعلًا ─────────
  const welcomeButtons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter(Boolean),
  )
  const hasGuestPath = welcomeButtons.some((b) => /ضيف|Guest/.test(b))
  if (!hasGuestPath) {
    rec.finding(
      'لا مسار ضيف من شاشة الترحيب — «ابدأ الآن» تقود إلى إنشاء حساب',
      'أزرار الترحيب: ' + welcomeButtons.join(' · ') + ' — و«ابدأ الآن» تنقل إلى #/login. ' +
        'ونصّ «كمّل كضيف» موجود في src/config/strings.ts (٤ مداخل عربي+إنجليزي) ولا يشير إليه أي مكوّن: ' +
        'StartViewV2 يرسم onSignup وonLogin فقط. وعد «محلي افتراضيًا» (الميثاق §9) بلا مدخل في تدفّق v2.',
      'عالٍ',
    )
  }
  const gatedToday = await page.evaluate(async () => {
    location.hash = '#/today'
    await new Promise((r) => setTimeout(r, 600))
    return document.body.innerText.includes('الصفحة غير موجودة')
  })
  if (gatedToday) {
    rec.finding(
      'مسارات التطبيق محجوبة للزائر غير المسجَّل — #/today و#/onboarding تعرضان «الصفحة غير موجودة»',
      'زائر بلا جلسة لا يصل إلى أي شاشة منتج، والرسالة المعروضة «غير موجودة» لا «تحتاج حسابًا» — ' +
        'رسالة مضلّلة تصف الحجب كعطل.',
      'متوسط',
    )
  }

  // الرحلة تكمل بجلسة مزروعة — نفس نمط مصنع اللقطات القائم على الجذع.
  // هذا **إعلان لا التفاف**: الجدار مرفوع أعلاه بالتقاطتين.
  await seedSession(page)
  await page.goto(app.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // ───────────────────────── ٢) الإعداد ─────────────────────────
  console.log('\n▸ الإعداد')
  const startBtn = page.getByRole('button', { name: /ابدأ|Start/ }).first()
  const startVisible = await startBtn.isVisible().catch(() => false)
  if (startVisible) await startBtn.click().catch(() => {})
  await page.waitForTimeout(700)

  // خطوة ٠ — الجسد + الموافقة الصحية (الترتيب الفعلي على الجذع)
  await visit('setup-1-body', 'خطوة ١ — الأساسيات والموافقة الصحية', 'Step 1 — basics and health consent')

  const next = page.getByRole('button', { name: t.next }).first()
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
  await page.getByRole('button', { name: body.genderMale }).first().click().catch(() => {})
  await page.waitForTimeout(250)
  await visit('setup-1-body-filled', 'الأساسيات بعد التعبئة — ٢٨ سنة · ١٧٨سم · ٨٢كجم', 'Basics filled — 28y · 178cm · 82kg')

  rec.check('المتابعة تُفتح بعد اكتمال الأساسيات', (await next.getAttribute('aria-disabled')) === 'false')
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ١ — النية والمستوى
  await visit('setup-2-intent', 'خطوة ٢ — النية والمستوى', 'Step 2 — intent and level')
  const planIntent = intent.intents[0]
  const beginnerLevel = intent.levels.find((l) => l.value === 'beginner')
  await page.getByRole('button', { name: new RegExp(planIntent.label) }).first().click()
  await page.getByRole('button', { name: new RegExp(beginnerLevel.label) }).first().click()
  await page.waitForTimeout(250)
  rec.check('اختيار «مبتدئ» يُخفي حقل سنوات التدريب', !(await page.getByText(intent.yearsLabel).isVisible().catch(() => false)))
  await visit('setup-2-intent-picked', `النية «${planIntent.label}» والمستوى «${beginnerLevel.label}»`, `Intent and beginner level picked`)
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٢ — الهدف بصياغة المبتدئ
  const goalText = await visit('setup-3-goal', 'خطوة ٣ — الهدف بصياغة المبتدئ', 'Step 3 — goal in beginner wording')
  rec.check(
    `المبتدئ يرى «${beginnerGoals.cut.label}» لا مصطلح الصالة`,
    goalText.includes(beginnerGoals.cut.label),
    beginnerGoals.cut.label,
  )
  rec.check(
    'صياغة المتقدّم لا تظهر للمبتدئ في شاشة الهدف',
    !goalText.includes(copy.goalWording(LANG, 'advanced').maintain.label),
  )
  await page.getByRole('button', { name: new RegExp(beginnerGoals.cut.label) }).first().click()
  await page.waitForTimeout(250)
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٣ — التدريب
  await visit('setup-4-training', 'خطوة ٤ — أيام التمرين ومدّته', 'Step 4 — training days and duration')
  await next.click()
  await page.waitForTimeout(400)

  // خطوة ٤ — المعدّات
  await visit('setup-5-equipment', 'خطوة ٥ — المكان والمعدّات', 'Step 5 — place and equipment')
  // مطابقة **تامّة** لا نمطية: تسمية التفضيل «أجهزة» جزء من تسمية المكان
  // «أجهزة فقط»، فالتعبير النمطي يلتقط زرّ المكان ويترك التفضيل بلا اختيار —
  // فيبقى الإعداد ناقصًا والرحلة تظنّ أنها تقدّمت. الالتقاطة كانت من اللقطة نفسها.
  var place = t.places.find((p) => p.value === 'gym') ?? t.places[0]
  var pref = t.prefs.find((p) => p.value === 'mixed') ?? t.prefs[0]
  await page.getByRole('button', { name: place.label, exact: true }).first().click().catch(() => {})
  await page.getByRole('button', { name: pref.label, exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(300)
  const equipText = await screenText(page)
  rec.check(
    `المكان «${place.label}» والتفضيل «${pref.label}» كلاهما مُختار`,
    equipText.includes(place.label) && equipText.includes(pref.label),
  )
  const buildBtn = page.getByRole('button', { name: t.equipment.cta }).first()
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
  const enterBtn = page.getByRole('button', { name: t.ready.enter }).first()
  const entered = await enterBtn.click({ timeout: 5000 }).then(() => true).catch(() => false)
  rec.check(`زرّ «${t.ready.enter}» ينقل إلى التطبيق`, entered)
  await page.waitForTimeout(900)
  await visit('dashboard', 'لوحة اليوم — بعد اعتماد الخطة', 'Today dashboard — after approving the plan')

  // ───────────────────────── ٤) التمرين ─────────────────────────
  console.log('\n▸ التمرين')
  // التنقّل **داخل التطبيق** عبر الشريط السفلي، لا بـ`page.goto` على الهاش:
  // الأخير إعادة تحميل كاملة، والرحلة تحاكي إنسانًا يضغط تبويبًا لا يكتب رابطًا.
  const goTab = async (key, route) => {
    const label = copy.tab(key, LANG)
    const tab = page.getByRole('button', { name: label, exact: true })
      .or(page.getByRole('link', { name: label, exact: true })).last()
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
  const workoutNav = await goTab('workout', '#/workout')
  rec.check(`«${workoutNav.label}» وصل إلى شاشة التمارين`, workoutNav.arrived)
  const workoutText = await visit('workout', 'شاشة التمارين بعد اعتماد الخطة', 'Workout tab after approving the plan')

  // هل ترى شاشة التمارين الخطة التي بناها الإعداد قبل قليل؟
  const setupPrompt = 'أكمل إعداد خطتك'
  const planInvisible = workoutText.includes(setupPrompt)
  if (planInvisible) {
    // دليل من التخزين لا من الشاشة: الخطة **مكتوبة** فعلًا.
    const stored = await page.evaluate(() => ({
      calendar: localStorage.getItem('qimmah:workoutCalendar:v1'),
      customization: (localStorage.getItem('qimmah:customization:v1') || '').length,
    }))
    let cal = {}
    try { cal = JSON.parse(stored.calendar ?? '{}') } catch { /* غير قابل للتحليل */ }
    rec.finding(
      'الإعداد يكتب الخطة وشاشة التمارين لا تراها — مسار المولود الجديد ينتهي إلى طريق مسدود',
      `بعد إعداد كامل واعتماد الخطة، تعرض #/workout «${setupPrompt}» بينما التخزين يحمل الخطة فعلًا: ` +
        `qimmah:workoutCalendar:v1 = {split:"${cal.split}", daysPerWeek:${cal.daysPerWeek}, source:"${cal.source}"} ` +
        `ويطابق ملخّص «خطتك جاهزة» المعروض قبل لحظات · qimmah:customization:v1 مكتوب (${stored.customization} حرفًا). ` +
        'أي أن الحالة محفوظة وشرط «الإعداد مكتمل» في شاشة التمارين لا يقرؤها. ' +
        'واللوحة تعد المستخدم بـ«تمرين اليوم» فيصل إلى «ابدأ الإعداد» — وعدٌ يخلفه المنتج في أول دقيقة.',
      'عالٍ',
    )
    rec.skip('جولة تُسجَّل وتُنهى بالتأكيد', 'الالتقاطة: شاشة التمارين لا ترى الخطة المبنيّة')
  } else {
    const startSession = page.getByRole('button', { name: /ابدأ الجلسة|ابدأ التمرين/ }).first()
    const sessionStarted = await startSession.click({ timeout: 4000 }).then(() => true).catch(() => false)
    rec.check('الجلسة تبدأ من شاشة التمارين', sessionStarted)
    await page.waitForTimeout(600)
    await visit('workout-active', 'الجلسة نشطة — أول تمرين', 'Session active — first exercise')
    const weight = page.locator('input[inputmode="decimal"], input[type="number"]').first()
    if (await weight.isVisible().catch(() => false)) await weight.fill('40')
    const completeSet = page.getByRole('button', { name: /أنهِ المجموعة/ }).first()
    rec.check(
      'جولة تُسجَّل فعليًا',
      await completeSet.click({ timeout: 4000 }).then(() => true).catch(() => false),
    )
    await page.waitForTimeout(500)
    await visit('workout-set-logged', 'جولة مسجَّلة — ٤٠ كجم', 'A set logged — 40 kg')
  }

  // ───────────────────────── ٥) وجبة ─────────────────────────
  console.log('\n▸ التغذية')
  const nutritionNav = await goTab('nutrition', '#/nutrition')
  rec.check(`«${nutritionNav.label}» وصل إلى شاشة التغذية`, nutritionNav.arrived)
  await visit('nutrition', 'شاشة التغذية', 'Nutrition screen')

  // شاشة التغذية **ترى** مخرَج الإعداد نفسه الذي لا تراه شاشة التمارين — وهذا
  // ما يجعل الالتقاطة أعلاه دقيقة: العطل في شاشة واحدة لا في الحفظ.
  const nutritionText = await screenText(page)
  rec.check(
    'شاشة التغذية تعكس الهدف المختار في الإعداد',
    nutritionText.includes(copy.goalWording(LANG, 'intermediate').cut.label) ||
      nutritionText.includes(beginnerGoals.cut.label),
    'وسم الهدف ظاهر أعلى الشاشة',
  )
  rec.check('هدف السعرات اليومي محسوب ومعروض', /\d{1,2},\d{3}/.test(nutritionText))

  // البحث خلف «أضف وجبة» — لا حقل ظاهر على السطح.
  const addMeal = page.getByRole('button', { name: /أضف وجبة/ }).first()
  const sheetOpen = await addMeal.click({ timeout: 5000 }).then(() => true).catch(() => false)
  rec.check('زرّ «أضف وجبة» يفتح لوحة الإضافة', sheetOpen)
  await page.waitForTimeout(700)
  await visit('nutrition-add-sheet', 'لوحة إضافة وجبة', 'Add-a-meal sheet')

  const search = page.getByRole('searchbox')
    .or(page.locator('input[type="search"], input[type="text"]')).first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill('كبسة')
    await page.waitForTimeout(1100)
    const results = await screenText(page)
    rec.check('البحث عن «كبسة» يُرجع نتيجة من قاعدة الأطعمة السعودية', results.includes('كبسة'))
    await visit('nutrition-search-kabsa', 'البحث عن «كبسة» — نتائج القاعدة السعودية', 'Searching "Kabsa" — Saudi food results')
  } else {
    rec.skip('البحث عن «كبسة» وتسجيلها', 'لوحة إضافة الوجبة لم تُفتح — حقل البحث غير متاح')
  }

  // ───────────────────────── التأكيد السلبي ─────────────────────────
  console.log('\n▸ حارس مفردات المبتدئ')
  vocab.assert(rec.check)

  // استثناء **معلَن** (§4: الممنوع هو التعطيل الصامت): الجلسة المزروعة رمز وهمي،
  // فأي نداء إلى Supabase يردّ 401. هذا أثر أداة الاختبار لا عطل منتج. وأي خطأ
  // آخر يبقى محسوبًا — والقائمة تُطبع كاملة عند السقوط.
  const seededAuthNoise = (e) => /401/.test(e) && /Failed to load resource/.test(e)
  const realErrors = errors.filter((e) => !seededAuthNoise(e))
  rec.check(
    'لا أخطاء طرف عميل خلال الرحلة (عدا 401 الجلسة المزروعة — استثناء معلَن)',
    realErrors.length === 0,
    realErrors.slice(0, 3).join(' | '),
  )

  const result = rec.finish()
  exitCode = report('ط-١ · رحلة المولود الجديد', [result])
} finally {
  if (browser) await browser.close()
  app.server.kill()
}

process.exit(exitCode)
