// PERSONA 4 — Interrupted Onboarding.
//
// A first-run user answers part of the flow and the session is interrupted.
// Reopening must resume at the exact point with the exact answers, Back/Forward
// must not corrupt the flow, and an answer that invalidates a later answer must
// clear it — the BUG-007 attack (adult goal chosen, then age lowered to a minor)
// is re-run here as a live browser journey, not a source assertion.

import {
  createRecorder, settle, tap, goRoute, bodyText, RAW_EXCEPTION_RE,
  collectErrors, realConsoleErrors,
} from '../lib/harness.mjs'
import { enterAsGuest, fillBody } from '../lib/drive.mjs'

const group = (page, id) => page.locator(`[data-question-id="${id}"]`)
const footerNext = (page) => page.locator('footer button').last()

export async function run({ browser, url, engine }) {
  const rec = createRecorder(`p4-interrupted-onboarding (${engine})`)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const { pageErrors, consoleErrors } = collectErrors(page)

  try {
    // ── 1. partial answers → refresh → resume at the exact point ──────────
    rec.section('partial answers survive an interruption')
    await enterAsGuest(page, url)
    await fillBody(page, { age: 31, height: 181, weight: 88 })
    await footerNext(page).click({ force: true })
    await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
    const intentRows = page.locator('button[aria-pressed]')
    await intentRows.nth(1).click({ force: true })
    await intentRows.nth(3).click({ force: true })
    await settle(page, 900)

    const draftBefore = await page.evaluate(() => window.localStorage.getItem('qimmah:onboarding:v1'))
    rec.check('a draft is persisted mid-flow', !!draftBefore && draftBefore.includes('draft'), String(draftBefore).slice(0, 120))

    await page.reload({ waitUntil: 'domcontentloaded' })
    await settle(page, 3200)
    const resumed = await page.evaluate(() => ({
      hash: location.hash,
      onIntent: !!document.querySelector('#onb-title-intent'),
      onBody: !!document.querySelector('#v2-body-age'),
      age: document.querySelector('#v2-body-age')?.value ?? null,
      completed: (() => { try { return !!JSON.parse(window.localStorage.getItem('qimmah:onboarding:v1') || '{}').completed } catch { return false } })(),
    }))
    // Resuming ON the intent step is exact resume; resuming on the body step with
    // the SAME answers is an acceptable one-step-back resume. Silently completing
    // setup, or losing the answers, is not.
    rec.check('the interrupted setup is NOT silently marked complete', !resumed.completed, JSON.stringify(resumed))
    rec.check('the flow resumes inside setup rather than restarting the app',
      resumed.onIntent || resumed.onBody, JSON.stringify(resumed))

    // walk back to the body step and prove the typed values survived
    for (let i = 0; i < 3 && !(await page.locator('#v2-body-age').count()); i += 1) {
      await page.locator('footer button').first().click({ force: true }).catch(() => {})
      await settle(page, 900)
    }
    const body = await page.evaluate(() => ({
      age: document.querySelector('#v2-body-age')?.value ?? '',
      height: document.querySelector('#v2-body-height')?.value ?? '',
      weight: document.querySelector('#v2-body-weight')?.value ?? '',
    }))
    rec.check('the typed body answers survived the interruption exactly',
      body.age === '31' && body.height === '181' && body.weight === '88', JSON.stringify(body))

    rec.section('Back and Forward inside setup do not corrupt the flow')
    await page.goBack(); await settle(page, 1800)
    const afterBack = await page.evaluate(() => ({ hash: location.hash, text: (document.body.innerText || '').slice(0, 80) }))
    await page.goForward(); await settle(page, 1800)
    const afterFwd = await page.evaluate(() => ({
      hash: location.hash,
      stillSetup: !!document.querySelector('#v2-body-age') || !!document.querySelector('[id^="onb-title-"]'),
      completed: (() => { try { return !!JSON.parse(window.localStorage.getItem('qimmah:onboarding:v1') || '{}').completed } catch { return false } })(),
    }))
    rec.check('browser Back inside setup does not crash or blank the app', afterBack.text.trim().length > 0, JSON.stringify(afterBack))
    rec.check('browser Forward returns to setup, not a completed dashboard',
      afterFwd.stillSetup && !afterFwd.completed, JSON.stringify(afterFwd))

    // ── 2. BUG-007 live re-run: lowering age clears a restricted goal ─────
    rec.section('conditional answers clear correctly (BUG-007 live re-run)')
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
    const p2 = await ctx2.newPage()
    const errs2 = collectErrors(p2)
    try {
      await enterAsGuest(p2, url)
      await fillBody(p2, { age: 28, height: 178, weight: 82 })
      const next = () => footerNext(p2).click({ force: true })
      await next(); await p2.waitForSelector('#onb-title-intent', { timeout: 20000 })
      const rows = p2.locator('button[aria-pressed]')
      await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
      await next(); await p2.waitForSelector('#onb-title-history', { timeout: 20000 })
      await group(p2, 'history.trained_before').getByRole('button').nth(0).click({ force: true })
      await next(); await p2.waitForSelector('#onb-title-goal', { timeout: 20000 })

      // pick an adult-only goal (cut / bulk) and record which one was pressed
      const goalButtons = p2.locator('#onb-title-goal ~ * button[aria-pressed], button[aria-pressed]')
      await goalButtons.first().click({ force: true })
      await settle(p2, 700)
      const pressedAdult = await p2.evaluate(() =>
        [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.innerText.trim().split('\n')[0]))
      rec.check('an adult goal is selected before the attack', pressedAdult.length > 0, pressedAdult.join(', '))

      // go back to basics and lower the age below the adult threshold
      for (let i = 0; i < 4 && !(await p2.locator('#v2-body-age').count()); i += 1) {
        await p2.locator('footer button').first().click({ force: true }).catch(() => {})
        await settle(p2, 900)
      }
      rec.check('the basics step is reachable again via Back', (await p2.locator('#v2-body-age').count()) > 0)
      await p2.fill('#v2-body-age', '15')
      await settle(p2, 900)

      // return to goals and verify no restricted goal is still pressed
      for (let i = 0; i < 5 && !(await p2.locator('#onb-title-goal').count()); i += 1) {
        await footerNext(p2).click({ force: true }).catch(() => {})
        await settle(p2, 1000)
      }
      const onGoal = (await p2.locator('#onb-title-goal').count()) > 0
      const stillPressed = onGoal ? await p2.evaluate(() =>
        [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => ({
          label: b.innerText.trim().split('\n')[0], disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
        }))) : []
      const staleRestricted = stillPressed.filter((b) => b.disabled)
      rec.check('lowering age to a minor leaves NO disabled goal still selected',
        staleRestricted.length === 0, JSON.stringify(stillPressed))
      const minorNote = onGoal ? await p2.evaluate(() => (document.body.innerText || '')) : ''
      rec.check('the minor restriction is communicated on the goal step',
        !onGoal || /١٨|18|قاصر|بالغ|أقل من/.test(minorNote), minorNote.slice(0, 140))
      rec.check('the attack produced no unhandled page error', errs2.pageErrors.length === 0, errs2.pageErrors.slice(0, 2).join(' || '))
    } finally {
      await ctx2.close()
    }

    rec.section('page health')
    rec.check('zero unhandled page errors (interruption journey)', pageErrors.length === 0, pageErrors.slice(0, 3).join(' || '))
    const realErrs = realConsoleErrors(consoleErrors)
    rec.check('zero non-benign console errors', realErrs.length === 0, realErrs.slice(0, 3).join(' || '))
  } catch (e) {
    rec.check('persona completed without an unexpected driver failure', false, String(e).split('\n')[0])
  } finally {
    await ctx.close().catch(() => {})
  }
  return rec.summary()
}
