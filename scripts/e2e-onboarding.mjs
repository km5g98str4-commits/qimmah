// Onboarding v2 browser E2E — runs the real component through the repository's
// dev-only visual harness, so no Supabase account or production data is needed.
// Covers the blocking health consent, all steps, assembly status, failure/retry,
// RTL, and horizontal overflow. Never contacts a backend.
//
// كل نصوص الواجهة تأتي من القواميس المركزية (scripts/e2e/lib/app-copy.mjs) لا
// مكرّرة هنا: تغيير نصّ في المصدر يجب أن يُحدّث الاختبار تلقائيًا، لا أن يكسره.

import { spawn } from 'node:child_process'
import { chromium } from './e2e/lib/engine.mjs'
import { setTimeout as sleep } from 'node:timers/promises'
import { loadAppCopy, labelOf, assertDevFlag } from './e2e/lib/app-copy.mjs'
import { answerHistory, finishInputSteps } from './e2e/lib/onboarding-driver.mjs'

const PORT = 4319
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/?surface=onboarding`
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return } catch { /* starting */ }
    await sleep(250)
  }
  throw new Error('onboarding proof server did not start')
}

let browser
try {
  // القواميس المركزية — نفس المصدر الذي يرسم منه المكوّن.
  const { onboarding: t, policy, intent } = await loadAppCopy()
  labelOf(t.places, 'gym') // fail fast if canonical place copy disappears
  // عَلَم تطوير (ليس مفتاح بيانات) — نتحقّق أنه ما زال مقروءًا في المكوّن.
  const FORCE_FAIL = assertDevFlag('qimmah:onboarding:force-fail', 'src/views/OnboardingV2.tsx')

  let welcomeSeen = false
  await waitForServer()
  browser = await chromium.launch()
  const consoleErrors = []
  const makePage = async () => {
    const p = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
    p.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    p.on('pageerror', (e) => consoleErrors.push(String(e)))
    await p.goto(BASE, { waitUntil: 'networkidle' })
    // [CTO-85] شاشة الترحيب تسبق أول سؤال منذ [CTO-009/WP-2]. الحصّاد كان يبدأ
    // من حقول الجسد مباشرةً، فصار ينتظر «التالي» على شاشة لا تحمله ويسقط
    // بمهلة ٣٠ ثانية. نعبرها **بعد التأكّد من وجودها** — لا نتخطّاها بصمت،
    // فبقاؤها جزء من التدفّق المعتمد.
    const start = p.getByRole('button', { name: t.welcome.start, exact: true })
    if (await start.isVisible().catch(() => false)) {
      welcomeSeen = true
      await start.click()
    }
    return p
  }
  const fillBodyAndConsent = async (p) => {
    await p.getByRole('textbox', { name: /العمر/ }).fill('24')
    await p.getByRole('textbox', { name: /الطول/ }).fill('175')
    await p.getByRole('textbox', { name: /الوزن/ }).fill('78')
    await p.getByRole('button', { name: 'ذكر', exact: true }).click()
    await p.getByRole('checkbox', { name: new RegExp(policy.healthConsent) }).check()
  }

  // Live order: body → intent → history → goal → schedule → lifestyle → limitations.
  const advancedPage = await makePage()
  check('شاشة الترحيب تسبق أول سؤال', welcomeSeen)
  check('RTL root', await advancedPage.evaluate(() => document.documentElement.dir === 'rtl'))
  check('320px has no horizontal overflow', await advancedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const advancedNext = advancedPage.getByRole('button', { name: t.next })
  check('Next starts blocked', await advancedNext.getAttribute('aria-disabled') === 'true')
  await advancedNext.click({ force: true })
  check('body validation is visible', await advancedPage.getByRole('alert').isVisible())
  await fillBodyAndConsent(advancedPage)
  check('Next unlocks after body + consent', await advancedNext.getAttribute('aria-disabled') === 'false')
  await advancedNext.click()
  await advancedPage.getByRole('button', { name: new RegExp(intent.intents[0].label) }).click()
  await advancedPage.getByRole('button', { name: new RegExp(intent.levels.find((x) => x.value === 'advanced').label) }).click()
  const advancedHistory = await answerHistory(advancedPage, () => advancedNext.click(), { trained: true })
  check('trained history shows all four meaningful questions', advancedHistory.historyGroups === 4)
  const advancedCut = intent.goalWording.advanced.cut.label
  check('advanced goal uses level-specific wording', advancedCut.startsWith('تنشيف') && await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(advancedCut)) }).isVisible())
  await advancedPage.close()

  // Draft/resume + stale conditional clearing in the real browser.
  const resumePage = await makePage()
  const resumeNext = resumePage.getByRole('button', { name: t.next })
  await fillBodyAndConsent(resumePage)
  await resumeNext.click()
  await resumePage.getByRole('button', { name: new RegExp(intent.intents[0].label) }).click()
  await resumePage.getByRole('button', { name: new RegExp(intent.levels.find((x) => x.value === 'intermediate').label) }).click()
  await resumeNext.click()
  await resumePage.locator('[data-question-id="history.trained_before"] button').nth(2).click()
  await resumePage.locator('[data-question-id="history.total_months"] button').nth(1).click()
  await resumePage.locator('[data-question-id="history.last_trained"] button').nth(0).click()
  await resumePage.locator('[data-question-id="history.consistency"] button').nth(2).click()
  await resumePage.waitForTimeout(150)
  await resumePage.reload({ waitUntil: 'networkidle' })
  await resumePage.waitForSelector('#onb-title-history')
  check('mid-onboarding reload resumes the same step', await resumePage.locator('[data-question-id^="history."]').count() === 4)
  check('reload preserves four answered history facts', await resumePage.locator('[data-question-id^="history."] button[aria-pressed="true"]').count() === 4)
  await resumePage.locator('[data-question-id="history.trained_before"] button').nth(0).click()
  check('switching to never hides all three follow-ups', await resumePage.locator('[data-question-id^="history."]').count() === 1)
  await resumePage.locator('[data-question-id="history.trained_before"] button').nth(3).click()
  check('switching back does not resurrect skipped answers', await resumePage.locator('[data-question-id^="history."] button[aria-pressed="true"]').count() === 1)
  await resumePage.getByRole('button', { name: t.back }).click()
  check('Back returns to intent without losing it', await resumePage.getByRole('heading', { name: intent.title }).isVisible())
  await resumeNext.click()
  check('Forward returns to history', await resumePage.locator('#onb-title-history').isVisible())
  await resumePage.close()

  const page = await makePage()
  const next = page.getByRole('button', { name: t.next })
  await fillBodyAndConsent(page)
  await next.click()
  await page.getByRole('button', { name: new RegExp(intent.intents[0].label) }).click()
  await page.getByRole('button', { name: new RegExp(intent.levels.find((x) => x.value === 'beginner').label) }).click()
  const neverHistory = await answerHistory(page, () => next.click())
  check('never-trained sees one history question only', neverHistory.historyGroups === 1)
  const beginnerCut = intent.goalWording.beginner.cut.label
  check('beginner goal uses level-specific wording', beginnerCut === 'خسارة دهون' && await page.getByRole('button', { name: new RegExp(escapeRegExp(beginnerCut)) }).isVisible())
  await page.getByRole('button', { name: new RegExp(escapeRegExp(beginnerCut)) }).click()
  // النيّة المختارة أعلاه هي `intents[0]`؛ نمرّرها بقيمتها لا بنصّها كي يفحص
  // السائق عقد ظهور سؤال نمط الأكل في الاتجاهين.
  const chosenIntent = intent.intents[0].value
  const inputSteps = await finishInputSteps(page, () => next.click(), { intent: chosenIntent })
  check(
    'diet pattern renders only for the meals intent',
    inputSteps.dietRendered === inputSteps.dietApplies,
    `intent=${chosenIntent} applies=${inputSteps.dietApplies} rendered=${inputSteps.dietRendered}`,
  )
  check(
    'the place seeds real equipment (the step cannot advance empty)',
    inputSteps.seededEquipment > 0 && inputSteps.equipmentSelected > 0,
    `seeded=${inputSteps.seededEquipment} selected=${inputSteps.equipmentSelected}`,
  )
  check('summary rendered', await page.getByRole('heading', { name: t.ready.title }).isVisible())

  await page.evaluate((k) => localStorage.setItem(k, '1'), FORCE_FAIL)
  await page.getByRole('button', { name: t.ready.enter }).click()
  check('forced failure is visible', await page.getByRole('heading', { name: t.error.title }).isVisible())
  await page.evaluate((k) => localStorage.removeItem(k), FORCE_FAIL)
  await page.getByRole('button', { name: t.error.retry }).click()
  await page.getByRole('heading', { name: t.error.title }).waitFor({ state: 'hidden' })
  check('retry clears failure', true)
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '))
} catch (error) {
  check('E2E harness completed', false, String(error))
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — onboarding v2 e2e`)
process.exit(failed.length ? 1 : 0)
