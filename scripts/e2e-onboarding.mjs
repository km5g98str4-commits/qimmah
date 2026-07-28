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
  const { onboarding: t, goals, policy } = await loadAppCopy()
  const cutGoal = labelOf(goals, 'cut')
  const gymPlace = labelOf(t.places, 'gym')
  const mixedPref = labelOf(t.prefs, 'mixed')
  // عَلَم تطوير (ليس مفتاح بيانات) — نتحقّق أنه ما زال مقروءًا في المكوّن.
  const FORCE_FAIL = assertDevFlag('qimmah:onboarding:force-fail', 'src/views/OnboardingV2.tsx')

  await waitForServer()
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle' })

  check('RTL root', await page.evaluate(() => document.documentElement.dir === 'rtl'))
  check('320px has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const next = page.getByRole('button', { name: t.next })
  check('Next starts blocked', await next.getAttribute('aria-disabled') === 'true')

  await page.getByRole('button', { name: new RegExp(cutGoal) }).click()
  await next.click({ force: true })
  check('health consent validation is visible', await page.getByRole('alert').isVisible())
  await page.getByRole('checkbox', { name: new RegExp(policy.healthConsent) }).check()
  check('Next unlocks only after consent', await next.getAttribute('aria-disabled') === 'false')
  await next.click()

  check('training step rendered', await page.getByRole('heading', { name: t.training.title }).isVisible())
  await page.getByRole('button', { name: t.next }).click()
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
