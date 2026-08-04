// ط-٢ · رحلة القاصر — امتثال قبل أن تكون اختبارًا
//
// مستخدم عمره ١٥ سنة. المطلوب إثباته:
//   • التنشيف والتضخيم **محجوبان فعلًا** — لا معطّلَين بصريًا فقط.
//   • المحافظة وحدها متاحة.
//   • التنويه محترم، حاضر، ومربوط بالخيارات المحجوبة برابط وصولية.
//   • والحساب نفسه يُجرى على المحافظة مهما كان المخزَّن (دفاع بعمق).
//
// ولماذا هي رحلة امتثال: بند App Store يسبق أي رفع لـTestFlight (الميثاق §11)،
// وحجبٌ يُرى ولا يُطبَّق أسوأ من غياب الحجب — لأنه يوهم بأن الأمر مُعالَج.
//
// §4.2 — كل حاجز يُهاجَم لا يُوصَف فقط:
//   الرحلة تحاول الالتفاف: تختار هدفًا مقيَّدًا بعمر بالغ، ثم تعود وتخفض العمر
//   إلى ١٥، وتتحقّق ممّا يبقى. **إحكامٌ لم يُهاجَم لا يُقبَل.**
//
// خطوات محجوبة بعطل مرفوع في ط-١ (شاشة التمارين لا ترى الخطة) تُعلَن بالتخطّي،
// بأمر [CTO-43/أ]: «امضي الآن بآلية التخطّي المعلَن — لا تنتظري الإصلاح».

import { chromium } from 'playwright'
import {
  VIEWPORTS, startApp, createRecorder, openPage, screenText,
  report, ensureProofRoot, seedSession,
} from './lib/kit.mjs'
import { loadJourneyCopy } from './lib/journey-copy.mjs'

const PORT = 5321
const LANG = 'ar'
const VIEWPORT = VIEWPORTS.large
const MINOR_AGE = '15'
const ADULT_AGE = '28'

const app = await startApp(PORT)
let browser
let exitCode = 1

try {
  const copy = await loadJourneyCopy()
  const t = copy.onboarding(LANG)
  const intent = copy.intent(LANG)
  const body = copy.body(LANG)
  const choices = copy.profileChoices(LANG)
  // القاصر مبتدئ في هذه الرحلة — الصياغة التي يراها فعلًا.
  const wording = copy.goalWording(LANG, 'beginner')

  ensureProofRoot()
  const rec = createRecorder({
    id: 'j2-minor',
    titleAr: 'رحلة القاصر — حاجز الامتثال',
    titleEn: 'The minor journey — the compliance gate',
    lang: LANG,
    viewport: VIEWPORT,
  })

  browser = await chromium.launch()
  const { page, errors } = await openPage(browser, { viewport: VIEWPORT, lang: LANG })
  const visit = async (slug, ar, en) => {
    await rec.shot(page, slug, ar, en)
    return screenText(page)
  }

  // جدار الحساب مرفوع في ط-١ — لا يُكرَّر هنا. الجلسة مزروعة بالإعلان نفسه.
  await seedSession(page, { uid: 'journey-minor' })
  await page.goto(app.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /ابدأ|Start/ }).first().click().catch(() => {})
  await page.waitForTimeout(700)

  const next = page.getByRole('button', { name: t.next }).first()

  /** يملأ خطوة الجسد بعمر معيّن. */
  const fillBody = async (age) => {
    const nums = page.locator('input[inputmode="numeric"], input[type="number"]')
    await nums.nth(0).fill(age)
    await nums.nth(1).fill('170')
    await nums.nth(2).fill('60')
    await page.getByRole('button', { name: body.genderMale, exact: true }).first().click().catch(() => {})
    await page.waitForTimeout(300)
  }

  /** حالة أزرار الأهداف الثلاثة كما تراها الواجهة فعلًا. */
  const goalStates = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('main button, [role="main"] button')]
        .filter((b) => b.hasAttribute('aria-pressed'))
        .map((b) => ({
          text: (b.innerText || '').split('\n')[0].trim(),
          disabled: b.disabled,
          ariaDisabled: b.getAttribute('aria-disabled'),
          pressed: b.getAttribute('aria-pressed'),
          describedBy: b.getAttribute('aria-describedby'),
        })),
    )

  // ───────────────── ١) الإعداد بعمر ١٥ ─────────────────
  console.log('\n▸ الإعداد بعمر ١٥')
  await page.getByRole('checkbox').first().check()
  await fillBody(MINOR_AGE)
  await visit('body-15', `الأساسيات — العمر ${MINOR_AGE} سنة`, `Basics — age ${MINOR_AGE}`)
  rec.check('العمر ١٥ مقبول ولا يُطرد المستخدم', (await next.getAttribute('aria-disabled')) === 'false',
    'الحاجز تقييد لا طرد — الحدّ الأدنى ١٣')
  await next.click()
  await page.waitForTimeout(400)

  // النية والمستوى
  await page.getByRole('button', { name: new RegExp(intent.intents[0].label) }).first().click()
  await page.getByRole('button', { name: new RegExp(intent.levels.find((l) => l.value === 'beginner').label) }).first().click()
  await page.waitForTimeout(250)
  await next.click()
  await page.waitForTimeout(500)

  // ───────────────── ٢) شاشة الهدف — قلب الرحلة ─────────────────
  console.log('\n▸ شاشة الهدف للقاصر')
  const goalText = await visit('goal-minor', 'شاشة الهدف — القاصر يرى المحافظة وحدها متاحة', 'Goal step — only maintenance available to a minor')
  const states = await goalStates()

  const find = (label) => states.find((s) => s.text.includes(label))
  const cutBtn = find(wording.cut.label)
  const bulkBtn = find(wording.bulk.label)
  const maintainBtn = find(wording.maintain.label)

  rec.check('الأهداف الثلاثة معروضة (لا إخفاء صامت)', Boolean(cutBtn && bulkBtn && maintainBtn),
    states.map((s) => s.text).join(' · '))

  // الحجب الحقيقي: خاصية disabled الأصلية، لا تنسيق بصري.
  rec.check(`«${wording.cut.label}» محجوب بخاصية disabled الأصلية`, cutBtn?.disabled === true)
  rec.check(`«${wording.bulk.label}» محجوب بخاصية disabled الأصلية`, bulkBtn?.disabled === true)
  rec.check(`«${wording.maintain.label}» متاح`, maintainBtn?.disabled === false)

  // الوصولية: المحجوب معلَن لقارئ الشاشة ومربوط بسببه.
  rec.check('المحجوبان يحملان aria-disabled=true', cutBtn?.ariaDisabled === 'true' && bulkBtn?.ariaDisabled === 'true')
  rec.check(
    'المحجوبان مربوطان بالتنويه عبر aria-describedby',
    cutBtn?.describedBy === 'v2-goal-minor-note' && bulkBtn?.describedBy === 'v2-goal-minor-note',
    'قارئ الشاشة يسمع السبب لا الحجب وحده',
  )

  // التنويه — حاضر ومطابق للقاموس المركزي.
  rec.check('تنويه القاصر معروض بنصّه من القاموس', goalText.includes(choices.minorGoalNote), choices.minorGoalNote)
  // ونبرته: لا لوم ولا منع مجرَّد — يذكر سببًا وجهة.
  rec.check(
    'التنويه يذكر جهة مختصّة لا منعًا مجرَّدًا',
    /مختص|مختصّ/.test(choices.minorGoalNote),
    'يعطي طريقًا بدل أن يقف عند الرفض',
  )

  // ───────────────── ٣) الهجوم: النقر على المحجوب ─────────────────
  console.log('\n▸ محاولة الالتفاف ١ — النقر المباشر على هدف محجوب')
  await page.getByRole('button', { name: new RegExp(wording.cut.label) }).first()
    .click({ force: true, timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(300)
  const afterForce = await goalStates()
  rec.check(
    'النقر القسري على «خسارة دهون» لا يختاره',
    find.call(null, wording.cut.label) && afterForce.find((s) => s.text.includes(wording.cut.label))?.pressed !== 'true',
    'حارس ثانٍ في onPick خلف disabled',
  )
  rec.check('المتابعة تبقى محجوبة بلا هدف مختار', (await next.getAttribute('aria-disabled')) === 'true')
  await visit('goal-force-click-blocked', 'بعد نقر قسري على هدف محجوب — لا شيء تغيّر', 'After force-clicking a blocked goal — nothing changed')

  // ───────────────── ٤) الهجوم: خفض العمر بعد الاختيار ─────────────────
  console.log('\n▸ محاولة الالتفاف ٢ — اختيار الهدف ببلوغ ثم خفض العمر')
  // ارجع إلى خطوة الجسد وارفع العمر.
  const back = page.getByRole('button', { name: /رجوع|Back/ }).first()
  await back.click().catch(() => {}); await page.waitForTimeout(300)
  await back.click().catch(() => {}); await page.waitForTimeout(400)
  await fillBody(ADULT_AGE)
  await next.click(); await page.waitForTimeout(400)
  await next.click(); await page.waitForTimeout(500)

  const adultStates = await goalStates()
  const cutAdult = adultStates.find((s) => s.text.includes(wording.cut.label))
  rec.check(`بعمر ${ADULT_AGE} يصير «${wording.cut.label}» متاحًا`, cutAdult?.disabled === false,
    'الحاجز مرتبط بالعمر لا ثابت')
  await page.getByRole('button', { name: new RegExp(wording.cut.label) }).first().click()
  await page.waitForTimeout(300)
  rec.check('الهدف المقيَّد اختير فعلًا بعمر بالغ',
    (await goalStates()).find((s) => s.text.includes(wording.cut.label))?.pressed === 'true')
  await visit('goal-adult-cut', `بعمر ${ADULT_AGE} — «${wording.cut.label}» مختار`, `At ${ADULT_AGE} — restricted goal selected`)

  // الآن اخفض العمر إلى ١٥ وعُد.
  await back.click().catch(() => {}); await page.waitForTimeout(300)
  await back.click().catch(() => {}); await page.waitForTimeout(400)
  await fillBody(MINOR_AGE)
  await visit('age-lowered-to-15', 'خفض العمر إلى ١٥ بعد اختيار هدف مقيَّد', 'Age lowered to 15 after picking a restricted goal')
  await next.click(); await page.waitForTimeout(400)
  await next.click(); await page.waitForTimeout(600)

  const afterLower = await goalStates()
  const cutAfter = afterLower.find((s) => s.text.includes(wording.cut.label))
  const bypassText = await visit('goal-after-age-lowered', 'شاشة الهدف بعد خفض العمر — هل بقي المقيَّد مختارًا؟', 'Goal step after lowering age — did the restricted pick survive?')

  rec.check(`«${wording.cut.label}» عاد محجوبًا بعد خفض العمر`, cutAfter?.disabled === true)
  rec.check('تنويه القاصر عاد للظهور', bypassText.includes(choices.minorGoalNote))

  // الالتفاف الحقيقي: هل بقي الاختيار المقيَّد قائمًا على قاصر؟
  const stillSelected = cutAfter?.pressed === 'true'
  if (stillSelected) {
    rec.finding(
      'اختيار مقيَّد ينجو من خفض العمر — القاصر يبقى على هدف تنشيف مختار',
      `اختير «${wording.cut.label}» بعمر ${ADULT_AGE}، ثم خُفض العمر إلى ${MINOR_AGE}: الزرّ عاد ` +
        `disabled وظهر التنويه، لكن aria-pressed بقي "true" — أي أن الحالة المخزَّنة ما زالت هدفًا مقيَّدًا ` +
        'على مستخدم قاصر. الحاجز يمنع **الاختيار الجديد** ولا يُبطل **اختيارًا سابقًا** عند تغيّر العمر. ' +
        'الأثر محدود بالعرض لأن effectiveGoalTypeForAge (src/lib/calculators.ts) يفرض المحافظة عند الحساب — ' +
        'لكن شاشةً تُظهر «تنشيف» مختارًا لابن ١٥ بند امتثال بصري قائم.',
      'متوسط',
    )
  } else {
    rec.check('الاختيار المقيَّد أُبطل تلقائيًا عند خفض العمر', true, 'الحاجز يُبطل السابق لا يمنع الجديد فقط')
  }

  // ───────────────── ٥) الإكمال بالمحافظة ─────────────────
  console.log('\n▸ الإكمال بالمحافظة')
  await page.getByRole('button', { name: new RegExp(wording.maintain.label) }).first().click()
  await page.waitForTimeout(300)
  rec.check(`«${wording.maintain.label}» يُختار بلا عائق`,
    (await goalStates()).find((s) => s.text.includes(wording.maintain.label))?.pressed === 'true')
  await next.click(); await page.waitForTimeout(400)
  await next.click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: t.places.find((p) => p.value === 'gym').label, exact: true }).first().click().catch(() => {})
  await page.getByRole('button', { name: t.prefs.find((p) => p.value === 'mixed').label, exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: t.equipment.cta }).first().click().catch(() => {})
  await page.waitForTimeout(1400)

  const planText = await visit('plan-minor', 'خطة القاصر — على المحافظة', "The minor's plan — on maintenance")
  rec.check('شاشة «خطتك جاهزة» ظهرت للقاصر', planText.includes(t.ready.title))
  rec.check(`ملخّص الخطة يذكر «${wording.maintain.label}»`, planText.includes(wording.maintain.label))
  rec.check(
    `ملخّص الخطة لا يذكر «${wording.cut.label}» ولا «${wording.bulk.label}»`,
    !planText.includes(wording.cut.label) && !planText.includes(wording.bulk.label),
  )

  // ───────────────── ٦) الحساب نفسه ─────────────────
  await page.getByRole('button', { name: t.ready.enter }).first().click().catch(() => {})
  await page.waitForTimeout(1000)
  const stored = await page.evaluate(() => localStorage.getItem('qimmah:customization:v1') || '')
  let goalType = ''
  try { goalType = String(JSON.parse(stored)?.profile?.goalType ?? JSON.parse(stored)?.identity?.mainGoal ?? '') } catch { /* شكل مختلف */ }
  rec.check(
    'الهدف المخزَّن للقاصر ليس تنشيفًا ولا تضخيمًا',
    !/تنشيف|تضخيم|cutting|bulking/.test(goalType || stored.slice(0, 400)),
    goalType ? `goalType=${goalType}` : 'فُحص نصّ التخزين',
  )

  // التغذية تعكس المحافظة — الشاشة الوحيدة التي تقرأ الخطة بلا عطل (ط-١).
  await page.evaluate(() => { location.hash = '#/nutrition' })
  await page.waitForTimeout(1100)
  const nutriText = await visit('nutrition-minor', 'تغذية القاصر — بلا عجز أو فائض', "Minor's nutrition — no deficit or surplus")
  rec.check('شاشة التغذية لا تعرض هدف تنشيف للقاصر', !nutriText.includes('تنشيف'))

  // محجوب بعطل ط-١ المرفوع — بأمر [CTO-43/أ] يُعلَن ولا يُنتظر.
  rec.skip(
    'تمرين القاصر من شاشة التمارين',
    'التقاطة ط-١: شاشة التمارين لا ترى الخطة المبنيّة (أُسندت لحارة H موجةً طارئة) — تُعاد بعد هبوط الإصلاح',
  )

  const realErrors = errors.filter((e) => !(/401/.test(e) && /Failed to load resource/.test(e)))
  rec.check('لا أخطاء طرف عميل (عدا 401 الجلسة المزروعة — استثناء معلَن)', realErrors.length === 0,
    realErrors.slice(0, 3).join(' | '))

  exitCode = report('ط-٢ · رحلة القاصر', [rec.finish()])
} finally {
  if (browser) await browser.close()
  app.server.kill()
}

process.exit(exitCode)
