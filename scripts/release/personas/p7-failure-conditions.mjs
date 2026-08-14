// PERSONA 7 — Failure conditions.
//
// Everything that goes wrong on a real device: the network dies mid-session, a
// lazy route chunk never arrives, a deep link points at nothing, the URL is
// nonsense, a render throws. The contract is the same in every case — say what
// happened, offer a way forward, keep the data.

import {
  createRecorder, settle, goRoute, bodyText, storageSnapshot,
  RAW_EXCEPTION_RE, collectErrors, realPageErrors,
} from '../lib/harness.mjs'
import { contextWithState } from '../lib/drive.mjs'

export async function run({ browser, url, engine, seed }) {
  const rec = createRecorder(`p7-failure-conditions (${engine})`)

  // ── 1. invalid routes and deep links ───────────────────────────────────
  {
    const { ctx, page } = await contextWithState(browser, url, seed.seed)
    const { pageErrors } = collectErrors(page)
    try {
      rec.section('invalid routes and deep links resolve honestly')
      const cases = [
        { hash: '#/asdf', expect: 'notfound', why: 'an unknown route must reach a real 404, not a blank screen' },
        { hash: '#/exercises/does-not-exist', expect: 'exercises', why: 'an unknown exercise id must fall back to the library' },
        { hash: '#/exercises/%E0%A4%A', expect: 'exercises', why: 'a malformed percent-encoded id must not throw' },
        { hash: '#/../../etc/passwd', expect: 'any', why: 'a traversal-shaped hash must not break routing' },
        { hash: '#/dashboard?injected=<script>alert(1)</script>', expect: 'dashboard', why: 'query junk on a hash route must be ignored, never executed' },
      ]
      for (const c of cases) {
        await page.goto(`${url}/${c.hash}`, { waitUntil: 'domcontentloaded' })
        await settle(page, 3000)
        const state = await page.evaluate(() => ({
          hash: location.hash,
          text: (document.body.innerText || '').trim(),
          children: document.getElementById('root')?.childElementCount ?? 0,
          alerted: window.__qimmahAlerted === true,
        }))
        const notFound = /الصفحة غير موجودة|Not found/i.test(state.text)
        const ok = state.children > 0 && state.text.length > 40
          && (c.expect === 'notfound' ? notFound : c.expect === 'any' ? true : (state.hash.includes(c.expect) || notFound))
        rec.check(`${c.hash} → ${c.why}`, ok, `hash=${state.hash} len=${state.text.length} notFound=${notFound}`)
        rec.check(`${c.hash} shows no raw exception`, !RAW_EXCEPTION_RE.test(state.text), state.text.slice(0, 140))
      }
      rec.check('invalid routing produced zero unhandled page errors', realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 3).join(' || '))

      rec.section('the 404 offers a way back rather than trapping the user')
      await page.goto(`${url}/#/definitely-not-a-route`, { waitUntil: 'domcontentloaded' })
      await settle(page, 2800)
      const exits = await page.evaluate(() =>
        [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()).filter(Boolean))
      rec.check('the 404 screen offers at least one exit control', exits.length > 0, exits.slice(0, 5).join(' ¦ '))
    } finally {
      await ctx.close()
    }
  }

  // ── 2. offline / failed asset delivery ─────────────────────────────────
  {
    // `serviceWorkers: 'block'` is REQUIRED here, not a convenience: with a
    // service worker installed, the chunk request is served by the worker and
    // never reaches `page.route`, so the injected failure silently does nothing
    // and the assertion below would measure an app that never failed. Blocking
    // the worker is what makes this vector real.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA', serviceWorkers: 'block' })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.evaluate((pairs) => {
      window.localStorage.clear()
      for (const [k, v] of pairs) window.localStorage.setItem(k, v)
    }, Object.entries(seed.seed))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await settle(page, 2800)
    const { pageErrors } = collectErrors(page)
    try {
      rec.section('a lazy route chunk that never arrives must not blank the app')
      const before = await storageSnapshot(page)
      // Fail only the not-yet-loaded route chunk; the shell stays alive, which is
      // exactly the real-world case this app's RouteErrorBoundary exists for.
      let aborted = 0
      await page.route('**/assets/ExerciseLibraryView-*.js', (r) => { aborted += 1; return r.abort('failed') })
      await goRoute(page, 'exercises', 5000)
      // Counter-proof (§4.2): if nothing was actually aborted, everything below
      // is measuring a healthy app and must NOT be reported as a pass.
      rec.check('the failure injection actually fired (the chunk request was aborted)', aborted > 0, `aborted=${aborted}`)
      const state = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim(),
        children: document.getElementById('root')?.childElementCount ?? 0,
      }))
      rec.check('the shell survives a failed route chunk', state.children > 0 && state.text.length > 40, `len=${state.text.length}`)
      rec.check('the user is told something failed rather than shown a blank screen',
        /تعذّر|ما قدرنا|خطأ|أعد|حاول|فشل|error|retry|try again|QW-/i.test(state.text), state.text.slice(0, 220))
      rec.check('the failure surface exposes no stack trace or raw message',
        !RAW_EXCEPTION_RE.test(state.text), state.text.slice(0, 220))
      const recoveryControls = await page.evaluate(() =>
        [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()).filter(Boolean))
      rec.check('the failure surface offers a recovery action', recoveryControls.length > 0, recoveryControls.slice(0, 5).join(' ¦ '))
      // A support reference id is the BUG-005 contract.
      rec.check('a support reference id is offered for correlation (BUG-005 contract)',
        /QW-[A-Z0-9]/i.test(state.text) || /qimmah\.support@gmail\.com/i.test(state.text), state.text.slice(0, 220))

      await page.unroute('**/assets/ExerciseLibraryView-*.js')
      const after = await storageSnapshot(page)
      const lost = Object.keys(before).filter((k) => !(k in after))
      rec.check('a delivery failure destroyed no stored data', lost.length === 0, `lost=[${lost.join(', ')}]`)
      rec.check('the only page errors are the injected import failure itself',
        realPageErrors(pageErrors).every((e) => /Failed to fetch dynamically imported|ChunkLoadError|import|NetworkError|Load failed/i.test(e)),
        realPageErrors(pageErrors).slice(0, 3).join(' || '))
    } finally {
      await ctx.close()
    }
  }

  // ── 3. fully offline navigation ────────────────────────────────────────
  {
    const { ctx, page } = await contextWithState(browser, url, seed.seed)
    const { pageErrors } = collectErrors(page)
    try {
      rec.section('going fully offline mid-session')
      await goRoute(page, 'dashboard', 2600)
      await ctx.setOffline(true)
      await goRoute(page, 'nutrition', 3000)
      await goRoute(page, 'progress', 3000)
      const offlineState = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim(),
        children: document.getElementById('root')?.childElementCount ?? 0,
      }))
      rec.check('already-loaded surfaces keep working offline (local-first)',
        offlineState.children > 0 && offlineState.text.length > 60, `len=${offlineState.text.length}`)
      rec.check('offline navigation shows no raw exception', !RAW_EXCEPTION_RE.test(offlineState.text), offlineState.text.slice(0, 160))
      await ctx.setOffline(false)
      await goRoute(page, 'dashboard', 2600)
      const back = await bodyText(page)
      rec.check('coming back online restores normal navigation', back.trim().length > 60, `len=${back.trim().length}`)
      rec.check('offline session produced no unhandled page error beyond the network loss itself',
        realPageErrors(pageErrors).filter((e) => !/Failed to fetch|NetworkError|Load failed|dynamically imported/i.test(e)).length === 0,
        realPageErrors(pageErrors).slice(0, 3).join(' || '))
    } finally {
      await ctx.close()
    }
  }

  // ── 4. activation input under a production build ───────────────────────
  {
    const { ctx, page } = await contextWithState(browser, url, seed.seed)
    try {
      rec.section('invalid activation input in a production build')
      await goRoute(page, 'nutrition', 2800)
      await page.locator('button, a').filter({ hasText: /^أضف$/ }).first().click({ timeout: 10000 }).catch(() => {})
      await settle(page, 1400)
      const gateOpen = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
      if (!gateOpen) {
        rec.blocked('activation input under production', 'the Premium gate did not open, so the activation form was unreachable in this pass')
      } else {
        await page.locator('button, a').filter({ hasText: /عندك كود تفعيل/ }).first().click({ timeout: 8000 }).catch(() => {})
        await settle(page, 600)
        const outcomes = []
        for (const bad of ['', '   ', '<script>alert(1)</script>', 'A'.repeat(300), 'QIMMAH-TEST-OK']) {
          await page.fill('[data-testid="activation-code-input"]', bad).catch(() => {})
          await page.locator('[data-testid="activation-code-submit"]').click({ force: true }).catch(() => {})
          await settle(page, 900)
          outcomes.push((await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')).trim())
        }
        const t = await bodyText(page)
        rec.check('hostile activation input never crashes the gate', !RAW_EXCEPTION_RE.test(t), t.slice(0, 160))
        rec.check('a production build grants nothing for ANY code, including the test code',
          !(await page.evaluate(() => { try { return window.sessionStorage.getItem('qimmah:entitlement-mock:v1') === 'active' } catch { return false } })),
          outcomes.join(' | '))
        rec.check('every activation attempt returns a visible, non-empty outcome',
          outcomes.slice(2).every((o) => o.length > 0), outcomes.join(' | '))
      }
    } finally {
      await ctx.close()
    }
  }

  return rec.summary()
}
