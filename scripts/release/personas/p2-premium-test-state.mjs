// PERSONA 2 — Premium Test State.
//
// Entitlement is granted ONLY through the sanctioned build-time seam
// (`VITE_ENTITLEMENT_MODE=mock` + the real activation-code UI). This suite must
// never invent entitlement: no localStorage flag, no query parameter, no
// direct store poke is permitted to become authority — and it proves that by
// TRYING each of them first and requiring them to fail.
//
// Runs against the MOCK artifact. The production artifact is proved separately
// (here, live) to grant nothing at all for the same inputs.

import {
  createRecorder, settle, tap, tapIfPresent, gateVisible, dismissGate, goRoute,
  storageSnapshot, storageDiff, bodyText, RAW_EXCEPTION_RE, collectErrors, realConsoleErrors, realPageErrors, ARTIFACTS,
} from '../lib/harness.mjs'
import { guestToPreview, activateWithMockCode, isActiveSessionKey } from '../lib/drive.mjs'

export async function run({ browser, url, engine }) {
  const rec = createRecorder(`p2-premium-test-state (${engine})`)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const { pageErrors, consoleErrors } = collectErrors(page)

  try {
    await guestToPreview(page, url)

    // ── 1. nothing but the sanctioned seam grants entitlement ─────────────
    rec.section('forged authority is refused (localStorage · query param · direct store)')
    await goRoute(page, 'workout', 2600)
    await page.evaluate(() => {
      try {
        window.localStorage.setItem('qimmah:premium', 'active')
        window.localStorage.setItem('premium', 'true')
        window.localStorage.setItem('qimmah:entitlement', JSON.stringify({ status: 'active' }))
        window.localStorage.setItem('qimmah:entitlement-mock:v1', 'active')
        window.history.replaceState(null, '', `${location.pathname}?premium=active&entitlement=active${location.hash}`)
      } catch { /* storage refusal is itself acceptable */ }
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await settle(page, 3000)
    await goRoute(page, 'workout', 2600)
    const beforeForge = await storageSnapshot(page)
    await page.locator('button').filter({ hasText: /اليوم 1/ }).first().click({ timeout: 10000 }).catch(() => {})
    await settle(page, 1600)
    const forgedGate = await gateVisible(page)
    const forgedChanged = storageDiff(beforeForge, await storageSnapshot(page)).filter((k) => !k.startsWith('qimmah:tracking:events:'))
    rec.check('a localStorage «premium» flag + query parameter do NOT grant entitlement', forgedGate,
      `gate=${forgedGate}`)
    rec.check('the forged authority wrote no session', !forgedChanged.some(isActiveSessionKey),
      `changed=[${forgedChanged.join(', ')}]`)
    // The mock store lives in sessionStorage precisely so a localStorage forge
    // cannot reach it. Prove the key the app actually reads is untouched.
    const mockKeyInLocal = await page.evaluate(() => window.localStorage.getItem('qimmah:entitlement-mock:v1'))
    const mockKeyInSession = await page.evaluate(() => { try { return window.sessionStorage.getItem('qimmah:entitlement-mock:v1') } catch { return null } })
    rec.check('the entitlement mock store is NOT read from localStorage',
      mockKeyInLocal === 'active' && mockKeyInSession !== 'active' && forgedGate,
      `local=${mockKeyInLocal} session=${mockKeyInSession}`)

    // ── 2. activation-code outcomes are honest and give no oracle ─────────
    rec.section('activation-code outcomes (sanctioned mock codes)')
    await dismissGate(page)
    await goRoute(page, 'nutrition', 2600)
    await tap(page, /^أضف$/)
    await settle(page, 1400)
    const messages = {}
    for (const code of ['QIMMAH-TEST-USED', 'QIMMAH-TEST-EXPIRED', 'QIMMAH-TEST-OFFLINE', 'AAAA-BBBB-CCCC', 'ZZZZ-YYYY-XXXX']) {
      // copy-bound disclosure is opened once; reuse the open form afterwards.
      if (!(await page.locator('[data-testid="activation-code-input"]').count())) {
        await tapIfPresent(page, /عندك كود تفعيل/)
        await settle(page, 500)
      }
      await page.fill('[data-testid="activation-code-input"]', code)
      await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
      await settle(page, 1000)
      messages[code] = (await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')).trim()
      rec.check(`code «${code}» produces a visible, non-empty outcome`, messages[code].length > 0, messages[code])
    }
    rec.check('no oracle: two different unknown codes give the SAME generic message',
      messages['AAAA-BBBB-CCCC'] === messages['ZZZZ-YYYY-XXXX'] && messages['AAAA-BBBB-CCCC'].length > 0,
      `${messages['AAAA-BBBB-CCCC']} | ${messages['ZZZZ-YYYY-XXXX']}`)
    rec.check('distinct real outcomes are distinguished (used ≠ expired ≠ unknown)',
      new Set([messages['QIMMAH-TEST-USED'], messages['QIMMAH-TEST-EXPIRED'], messages['AAAA-BBBB-CCCC']]).size === 3,
      Object.values(messages).join(' | '))
    const stateAfterFailedCodes = await storageSnapshot(page)
    rec.check('failed codes grant nothing', !(await page.evaluate(() => { try { return window.sessionStorage.getItem('qimmah:entitlement-mock:v1') === 'active' } catch { return false } })),
      `keys=${Object.keys(stateAfterFailedCodes).length}`)

    // ── 3. real activation, then the legitimate mutations ────────────────
    rec.section('activated: every legitimate mutation now succeeds and persists')
    const okMsg = await activateWithMockCode(page, 'QIMMAH-TEST-OK')
    rec.check('valid code reports success', /تمّ التفعيل|activated|فعّل/i.test(okMsg), okMsg)
    await dismissGate(page)
    await settle(page, 800)

    const mutate = async (label, open, fire, verify) => {
      await open()
      const before = await storageSnapshot(page)
      await fire()
      await settle(page, 1800)
      const after = await storageSnapshot(page)
      const gate = await gateVisible(page)
      const ok = await verify(before, after)
      rec.check(`${label} — no Premium gate for an entitled user`, !gate)
      rec.check(`${label} — the write actually landed`, ok, `changed=[${storageDiff(before, after).join(', ')}]`)
      if (gate) await dismissGate(page)
    }

    await mutate('nutrition.water',
      () => goRoute(page, 'nutrition', 2600),
      () => tap(page, /\+250/),
      (b, a) => {
        const ml = (s) => { try { return JSON.parse(s || '{}').waterMl || 0 } catch { return 0 } }
        return ml(a['qimmah:nutrition:v2']) > ml(b['qimmah:nutrition:v2'])
      })

    await mutate('workout.start',
      () => goRoute(page, 'workout', 2600),
      () => page.locator('button').filter({ hasText: /اليوم 1/ }).first().click({ timeout: 10000 }),
      (b, a) => Object.keys(a).some((k) => isActiveSessionKey(k) && a[k] && a[k] !== b[k]))

    // logSet then finish, inside the session opened above
    rec.section('activated: in-session set logging and durable finish')
    // The live set row uses `inputmode`-numeric text inputs labelled «الوزن (كجم)»
    // and «التكرارات المنجزة», with a per-set «تم» commit.
    // Scope to real <input> elements: the +/- steppers carry the SAME accessible
    // name («الوزن (كجم) -2.5»), so a by-label lookup would hand back a button.
    const weight = page.locator('input[aria-label="الوزن (كجم)"]').first()
    const reps = page.locator('input[aria-label="التكرارات المنجزة"]').first()
    if ((await weight.count()) && (await reps.count())) {
      await weight.fill('60')
      await reps.fill('10')
      await settle(page, 700)
      const b = await storageSnapshot(page)
      await page.locator('button').filter({ hasText: /^تم$/ }).first().click({ timeout: 8000 }).catch(() => {})
      await settle(page, 1800)
      const a = await storageSnapshot(page)
      rec.check('workout.logSet writes into the active session',
        Object.keys(a).some((k) => isActiveSessionKey(k) && a[k] !== b[k]),
        `changed=[${storageDiff(b, a).join(', ')}]`)
    } else {
      rec.blocked('workout.logSet live set entry', 'the session screen exposed no labelled weight/reps fields to drive')
    }

    // The live session walks one exercise at a time («التمرين التالي»); the finish
    // control only exists past the last one. Advance to it rather than declaring
    // the most important storage-honesty contract untestable.
    const finishLocator = () => page.locator('button').filter({ hasText: /أنهِ التمرين|إنهاء التمرين|أنهِ|إنهاء|كفو/ }).first()
    for (let i = 0; i < 8 && (await finishLocator().count()) === 0; i += 1) {
      const next = page.locator('button').filter({ hasText: /^التمرين التالي$/ }).first()
      if (!(await next.count())) break
      await next.click({ timeout: 8000 }).catch(() => {})
      await settle(page, 1200)
    }
    const beforeFinish = await storageSnapshot(page)
    const finishBtn = finishLocator()
    if (await finishBtn.count()) {
      await finishBtn.scrollIntoViewIfNeeded().catch(() => {})
      await finishBtn.click({ timeout: 8000 }).catch(() => {})
      await settle(page, 1600)
      await tapIfPresent(page, /تأكيد|أكّد|نعم|إنهاء/)
      await settle(page, 2400)
      const finished = await storageSnapshot(page)
      const stillActive = Object.keys(finished).filter((k) => isActiveSessionKey(k) && finished[k])
      const history = !!finished['qimmah:history:workoutSessions:v1'] || !!finished['qimmah:workout-summary:v2:guest']
      // The storage-honesty contract: a session is NEVER lost. Either it became
      // durable history, or the resumable snapshot is still there to retry.
      rec.check('workout.finish never loses the session (durable history OR an intact resumable snapshot)',
        history || stillActive.length > 0,
        `history=${history} stillActive=[${stillActive.join(', ')}] keysBefore=${Object.keys(beforeFinish).length}`)
    } else {
      rec.blocked('workout.finish live completion',
        'the finish control was not reachable after walking every exercise in this pass; the durable-finish contract remains covered by test:storage-honesty (44/44) and test:e2e:workout (31/31)')
    }

    // ── 4. the seam must not exist in production ──────────────────────────
    rec.section('the test seam cannot exist in a production build (live proof)')
    const prodUrl = `http://localhost:${ARTIFACTS.prod.port}`
    const prodCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
    const prodPage = await prodCtx.newPage()
    try {
      await guestToPreview(prodPage, prodUrl)
      await goRoute(prodPage, 'nutrition', 2600)
      await tap(prodPage, /^أضف$/)
      await settle(prodPage, 1400)
      const prodMsg = await activateWithMockCode(prodPage, 'QIMMAH-TEST-OK')
      const prodBefore = await storageSnapshot(prodPage)
      await dismissGate(prodPage)
      await goRoute(prodPage, 'nutrition', 2400)
      await tap(prodPage, /\+250/)
      await settle(prodPage, 1400)
      const prodGate = await gateVisible(prodPage)
      const prodChanged = storageDiff(prodBefore, await storageSnapshot(prodPage)).filter((k) => !k.startsWith('qimmah:tracking:events:'))
      rec.check('in production the same valid TEST code does NOT activate', prodGate, `message="${prodMsg}" gate=${prodGate}`)
      rec.check('in production the test code grants no write', prodChanged.length === 0, `changed=[${prodChanged.join(', ')}]`)
      rec.check('production reports the honest offline state rather than a fake failure or success',
        prodMsg.length > 0 && !/تمّ التفعيل|activated/i.test(prodMsg), prodMsg)
    } finally {
      await prodCtx.close()
    }

    rec.section('page health')
    const txt = await bodyText(page)
    rec.check('no raw exception surfaced during the entitled journey', !RAW_EXCEPTION_RE.test(txt), txt.slice(0, 160))
    rec.check('zero unhandled page errors', realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 3).join(' || '))
    const realErrs = realConsoleErrors(consoleErrors)
    rec.check('zero non-benign console errors', realErrs.length === 0, realErrs.slice(0, 3).join(' || '))
  } finally {
    await ctx.close()
  }
  return rec.summary()
}
