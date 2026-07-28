// Onboarding v2 browser E2E — runs the real component through the repository's
// dev-only visual harness, so no Supabase account or production data is needed.
// Covers the blocking health consent, all steps, assembly status, failure/retry,
// RTL, and horizontal overflow. Never contacts a backend.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

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
  await waitForServer()
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle' })

  check('RTL root', await page.evaluate(() => document.documentElement.dir === 'rtl'))
  check('320px has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const next = page.getByRole('button', { name: 'التالي' })
  check('Next starts blocked', await next.getAttribute('aria-disabled') === 'true')

  await page.getByRole('button', { name: /تنشيف/ }).click()
  await next.click({ force: true })
  check('health consent validation is visible', await page.getByRole('alert').isVisible())
  await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
  check('Next unlocks only after consent', await next.getAttribute('aria-disabled') === 'false')
  await next.click()

  check('training step rendered', await page.getByRole('heading', { name: 'نجهّز جدولك' }).isVisible())
  await page.getByRole('button', { name: 'التالي' }).click()
  check('equipment step exact dialect copy', await page.getByRole('heading', { name: 'وين وكيف تتمرّن؟' }).isVisible())
  await page.getByRole('button', { name: 'نادي', exact: true }).click()
  await page.getByRole('button', { name: 'مزيج', exact: true }).click()
  await page.getByRole('button', { name: 'اعتمد خطتي' }).click()
  check('summary rendered', await page.getByRole('heading', { name: 'خطتك جاهزة' }).isVisible())

  await page.evaluate(() => localStorage.setItem('qimmah:onboarding:force-fail', '1'))
  await page.getByRole('button', { name: 'الدخول للوحة' }).click()
  check('forced failure is visible', await page.getByRole('heading', { name: 'ما قدرنا نجهّز الخطة' }).isVisible())
  await page.evaluate(() => localStorage.removeItem('qimmah:onboarding:force-fail'))
  await page.getByRole('button', { name: 'جرّب مرة ثانية' }).click()
  await page.getByRole('heading', { name: 'ما قدرنا نجهّز الخطة' }).waitFor({ state: 'hidden' })
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
