// Onboarding v2 browser E2E — runs the real component through the repository's
// dev-only visual harness, so no Supabase account or production data is needed.
// Covers the blocking health consent, all steps, assembly status, failure/retry,
// RTL, and horizontal overflow. Never contacts a backend.
//
// كل نصوص الواجهة تأتي من القواميس المركزية (scripts/e2e/lib/app-copy.mjs) لا
// مكرّرة هنا: تغيير نصّ في المصدر يجب أن يُحدّث الاختبار تلقائيًا، لا أن يكسره.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import { loadAppCopy, labelOf, assertDevFlag } from './e2e/lib/app-copy.mjs'

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
  const { onboarding: t, policy, intent, history } = await loadAppCopy()
  const historyOpt = (group, value) => history[group].find((o) => o.value === value).label
  const gymPlace = labelOf(t.places, 'gym')
  const mixedPref = labelOf(t.prefs, 'mixed')
  // عَلَم تطوير (ليس مفتاح بيانات) — نتحقّق أنه ما زال مقروءًا في المكوّن.
  const FORCE_FAIL = assertDevFlag('qimmah:onboarding:force-fail', 'src/views/OnboardingV2.tsx')

  await waitForServer()
  browser = await chromium.launch()
  const consoleErrors = []
  const makePage = async () => {
    const p = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
    p.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    p.on('pageerror', (e) => consoleErrors.push(String(e)))
    await p.goto(BASE, { waitUntil: 'networkidle' })
    return p
  }
  const fillBodyAndConsent = async (p) => {
    await p.getByRole('textbox', { name: /العمر/ }).fill('24')
    await p.getByRole('textbox', { name: /الطول/ }).fill('175')
    await p.getByRole('textbox', { name: /الوزن/ }).fill('78')
    await p.getByRole('button', { name: 'ذكر', exact: true }).click()
    await p.getByRole('checkbox', { name: new RegExp(policy.healthConsent) }).check()
  }

  // The live order is body + consent → intent/level → goal → training → equipment.
  const advancedPage = await makePage()
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
  await advancedNext.click()
  // ── خطوة تاريخ التدريب — المسار «تمرّن من قبل» (٤ أجوبة) ──────────────────
  check('history step rendered', await advancedPage.getByRole('heading', { name: history.title }).isVisible())
  check('history Next starts blocked', await advancedNext.getAttribute('aria-disabled') === 'true')
  // قبل الجواب الأول لا تظهر أسئلة المتابعة إطلاقًا.
  check('follow-ups hidden before answering', !(await advancedPage.getByText(history.totalMonthsQ).isVisible()))
  await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(historyOpt('trainedBefore', 'years'))) }).click()
  check('follow-ups appear for a trained user', await advancedPage.getByText(history.totalMonthsQ).isVisible())
  check('history Next still blocked with follow-ups unanswered', await advancedNext.getAttribute('aria-disabled') === 'true')
  await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(historyOpt('totalMonths', 'y1_3'))) }).click()
  await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(historyOpt('lastTrained', 'y1_plus'))) }).click()
  await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(historyOpt('consistency', 'mostly'))) }).click()
  check('history Next unlocks once all four are answered', await advancedNext.getAttribute('aria-disabled') === 'false')
  check('no horizontal overflow on the history step', await advancedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await advancedNext.click()
  const advancedCut = intent.goalWording.advanced.cut.label
  check('advanced goal uses level-specific wording', advancedCut.startsWith('تنشيف') && await advancedPage.getByRole('button', { name: new RegExp(escapeRegExp(advancedCut)) }).isVisible())
  await advancedPage.close()

  const page = await makePage()
  const next = page.getByRole('button', { name: t.next })
  await fillBodyAndConsent(page)
  await next.click()
  await page.getByRole('button', { name: new RegExp(intent.intents[0].label) }).click()
  await page.getByRole('button', { name: new RegExp(intent.levels.find((x) => x.value === 'beginner').label) }).click()
  await next.click()
  // ── خطوة تاريخ التدريب — المسار «ما تمرّنت قط» (جواب واحد يكفي) ───────────
  check('history step rendered (beginner path)', await page.getByRole('heading', { name: history.title }).isVisible())
  await page.getByRole('button', { name: new RegExp(escapeRegExp(historyOpt('trainedBefore', 'never'))) }).click()
  check('never-trained sees NO follow-up questions', !(await page.getByText(history.totalMonthsQ).isVisible()))
  check('never-trained is told the answer is enough', await page.getByText(history.neverNote).isVisible())
  check('never-trained unlocks Next with one answer', await next.getAttribute('aria-disabled') === 'false')
  await next.click()
  const beginnerCut = intent.goalWording.beginner.cut.label
  check('beginner goal uses level-specific wording', beginnerCut === 'خسارة دهون' && await page.getByRole('button', { name: new RegExp(escapeRegExp(beginnerCut)) }).isVisible())
  await page.getByRole('button', { name: new RegExp(escapeRegExp(beginnerCut)) }).click()
  await next.click()
  check('training step rendered', await page.getByRole('heading', { name: t.training.title }).isVisible())
  await next.click()
  check('equipment step exact dialect copy', await page.getByRole('heading', { name: t.equipment.title }).isVisible())
  await page.getByRole('button', { name: gymPlace, exact: true }).click()
  await page.getByRole('button', { name: mixedPref, exact: true }).click()
  await page.getByRole('button', { name: t.equipment.cta }).click()
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
