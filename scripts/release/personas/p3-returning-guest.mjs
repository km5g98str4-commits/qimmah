// PERSONA 3 — Returning Guest.
//
// A guest who finished setup earlier reopens the app: the correct dashboard must
// appear WITHOUT re-running onboarding, and must survive refresh, Back and
// Forward with the same data. The seed is a capture of real product output, so
// "state retained" is judged against what the app itself wrote.

import {
  createRecorder, settle, goRoute, storageSnapshot, storageDiff, bodyText,
  RAW_EXCEPTION_RE, collectErrors, realConsoleErrors,
} from '../lib/harness.mjs'
import { contextWithState } from '../lib/drive.mjs'

export async function run({ browser, url, engine, seed }) {
  const rec = createRecorder(`p3-returning-guest (${engine})`)
  const { ctx, page } = await contextWithState(browser, url, seed.seed)
  const { pageErrors, consoleErrors } = collectErrors(page)

  try {
    rec.section('reopening lands on the dashboard, not onboarding')
    const first = await page.evaluate(() => ({
      hash: location.hash,
      onboarding: !!document.querySelector('#v2-body-age') || !!document.querySelector('#onb-title-intent'),
      text: (document.body.innerText || '').trim(),
    }))
    rec.check('no onboarding is re-imposed on a completed guest', !first.onboarding, `hash=${first.hash}`)
    rec.check('the app renders a populated dashboard', first.text.length > 200 && !/الصفحة غير موجودة/.test(first.text), `len=${first.text.length}`)

    const completed = await page.evaluate(() => {
      try { return !!JSON.parse(window.localStorage.getItem('qimmah:onboarding:v1') || '{}').completed } catch { return false }
    })
    rec.check('the completed-setup flag survived the reopen', completed)

    rec.section('the plan itself is retained, not regenerated blank')
    const planFacts = async () => {
      await goRoute(page, 'profile', 2600)
      const profileText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
      await goRoute(page, 'workout', 2600)
      const days = await page.evaluate(() => document.querySelectorAll('button').length)
      const workoutText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
      return { profileText, workoutText, days }
    }
    const before = await planFacts()
    rec.check('the profile shows a real programme, not an empty shell', before.profileText.length > 120, `len=${before.profileText.length}`)
    rec.check('the workout screen lists the generated plan days', /اليوم\s*[0-9٠-٩]/.test(before.workoutText), before.workoutText.slice(0, 120))

    rec.section('refresh · Back · Forward all preserve state')
    const storedBefore = await storageSnapshot(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await settle(page, 3000)
    const afterReload = await planFacts()
    rec.check('refresh keeps the same plan', afterReload.workoutText.slice(0, 200) === before.workoutText.slice(0, 200),
      `${before.workoutText.slice(0, 60)} vs ${afterReload.workoutText.slice(0, 60)}`)

    await goRoute(page, 'nutrition', 2400)
    await goRoute(page, 'progress', 2400)
    await page.goBack(); await settle(page, 2200)
    const backHash = await page.evaluate(() => location.hash)
    await page.goForward(); await settle(page, 2200)
    const fwdHash = await page.evaluate(() => location.hash)
    rec.check('Back returns to the previously visited route', /nutrition/.test(backHash), backHash)
    rec.check('Forward returns to the route left behind', /progress/.test(fwdHash), fwdHash)

    const storedAfter = await storageSnapshot(page)
    const lost = Object.keys(storedBefore).filter((k) => !(k in storedAfter))
    const mutated = storageDiff(storedBefore, storedAfter)
      .filter((k) => !k.startsWith('qimmah:tracking:events:'))
    rec.check('browsing destroyed no stored key', lost.length === 0, `lost=[${lost.join(', ')}]`)
    rec.check('browsing mutated no user data', mutated.length === 0, `mutated=[${mutated.join(', ')}]`)

    rec.section('a returning guest is still a Preview user')
    await goRoute(page, 'workout', 2600)
    const beforeAttempt = await storageSnapshot(page)
    await page.locator('button').filter({ hasText: /اليوم 1/ }).first().click({ timeout: 10000 }).catch(() => {})
    await settle(page, 1600)
    const gate = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
    const changed = storageDiff(beforeAttempt, await storageSnapshot(page)).filter((k) => !k.startsWith('qimmah:tracking:events:'))
    rec.check('the returning guest still meets the Premium boundary', gate)
    rec.check('the returning guest still writes no paid state', changed.length === 0, `changed=[${changed.join(', ')}]`)

    rec.section('page health')
    const txt = await bodyText(page)
    rec.check('no raw exception surfaced', !RAW_EXCEPTION_RE.test(txt), txt.slice(0, 160))
    rec.check('zero unhandled page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' || '))
    const realErrs = realConsoleErrors(consoleErrors)
    rec.check('zero non-benign console errors', realErrs.length === 0, realErrs.slice(0, 3).join(' || '))
  } finally {
    await ctx.close()
  }
  return rec.summary()
}
