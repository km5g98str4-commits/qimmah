// PERSONA 8 — width × language matrix.
//
// Ten mandated widths, both languages, on the surfaces a Preview user actually
// lands on. The failures this catches are the ones screenshots hide: a page that
// scrolls sideways, a bottom tab bar that covers the last control, a Premium
// dialog that overflows its own viewport, and touch targets under 44px.
//
// When this runs on WebKit it IS the iPhone-engine evidence; on Chromium it is
// the layout matrix. The engine is recorded in the suite name either way.

import { createRecorder, settle, goRoute, WIDTHS, collectErrors, realPageErrors } from '../lib/harness.mjs'
import { PREFS_KEY } from '../lib/drive.mjs'

// [REL-001] numeral-agnostic: the Arabic UI renders Arabic-Indic digits per the
// one numeral policy. Pinning a digit form makes a CORRECT product change fail here.

const SURFACES = ['dashboard', 'workout', 'nutrition', 'progress', 'measurements', 'profile', 'settings']

export async function run({ browser, url, engine, seed }) {
  const rec = createRecorder(`p8-responsive-matrix (${engine})`)

  for (const lang of ['ar', 'en']) {
    for (const vp of WIDTHS) {
      // `isMobile` is deliberately NOT set: WebKit rejects it on some hosts, and
      // the defects this matrix hunts are width-driven layout failures, which
      // reproduce from the viewport alone.
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        locale: lang === 'en' ? 'en-US' : 'ar-SA',
      })
      const page = await ctx.newPage()
      const { pageErrors } = collectErrors(page)
      try {
        // WebKit aborts an in-flight navigation with "Frame load interrupted" if
        // a second `goto` starts before the first commits. `waitUntil: 'commit'`
        // plus an explicit settle is stable on both engines and still gives the
        // app a full cold boot at this viewport.
        const load = async () => {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try { await page.goto(url, { waitUntil: 'commit' }); return } catch (err) {
              if (attempt === 2) throw err
              await settle(page, 600)
            }
          }
        }
        await load()
        await settle(page, 1200)
        await page.evaluate(({ pairs, key, language }) => {
          window.localStorage.clear()
          for (const [k, v] of pairs) window.localStorage.setItem(k, v)
          window.localStorage.setItem(key, JSON.stringify({ language, hapticsEnabled: true, theme: 'system' }))
        }, { pairs: Object.entries(seed.seed), key: PREFS_KEY, language: lang })
        await load()
        await settle(page, 3000)

        rec.section(`${vp.w}px (${vp.name}) · ${lang}`)
        const overflowing = []
        const emptySurfaces = []
        for (const route of SURFACES) {
          await goRoute(page, route, 2000)
          const m = await page.evaluate(() => ({
            scrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
            len: (document.body.innerText || '').trim().length,
            dir: document.documentElement.dir,
          }))
          // 1px of rounding slack; anything more is a real sideways scroll.
          if (m.scrollW > m.clientW + 1) overflowing.push(`${route}(${m.scrollW}>${m.clientW})`)
          if (m.len < 80) emptySurfaces.push(`${route}(${m.len})`)
        }
        rec.check(`${vp.w}px/${lang}: no surface scrolls horizontally`, overflowing.length === 0, overflowing.join(', '))
        rec.check(`${vp.w}px/${lang}: every surface renders content`, emptySurfaces.length === 0, emptySurfaces.join(', '))

        const dir = await page.evaluate(() => document.documentElement.dir)
        rec.check(`${vp.w}px/${lang}: document direction is ${lang === 'en' ? 'ltr' : 'rtl'}`,
          dir === (lang === 'en' ? 'ltr' : 'rtl'), `dir=${dir}`)

        // The bottom tab bar must not cover the last interactive element.
        await goRoute(page, 'nutrition', 2200)
        const covered = await page.evaluate(() => {
          const nav = document.querySelector('nav[class*="fixed"], [data-testid="tab-bar"], footer nav')
          if (!nav) return { navFound: false, covered: [] }
          const navBox = nav.getBoundingClientRect()
          const hits = [...document.querySelectorAll('main button, main a')]
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.height > 0 && r.top < navBox.bottom && r.bottom > navBox.top)
            .map(({ el }) => (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24))
          return { navFound: true, covered: hits.slice(0, 5) }
        })
        rec.check(`${vp.w}px/${lang}: the bottom bar covers no interactive content`,
          !covered.navFound || covered.covered.length === 0, JSON.stringify(covered))

        // Premium dialog must fit and stay operable at this width.
        await goRoute(page, 'workout', 2400)
        await page.locator('button').filter({ hasText: /اليوم\s*[1١]|Day\s*1/ }).first().click({ timeout: 8000 }).catch(() => {})
        await settle(page, 1400)
        const gate = await page.evaluate(() => {
          const g = document.querySelector('[data-testid="premium-gate"]')
          if (!g) return { open: false }
          const r = g.getBoundingClientRect()
          const small = [...g.querySelectorAll('button, a')]
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({ label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20), h: Math.round(el.getBoundingClientRect().height) }))
            .filter((x) => x.h > 0 && x.h < 44)
          return {
            open: true,
            fits: r.width <= window.innerWidth + 1,
            scrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
            small,
          }
        })
        if (!gate.open) {
          rec.check(`${vp.w}px/${lang}: the Premium boundary still engages at this width`, false, 'gate did not open')
        } else {
          rec.check(`${vp.w}px/${lang}: the Premium dialog fits its viewport`,
            gate.fits && gate.scrollW <= gate.clientW + 1, JSON.stringify(gate))
          rec.check(`${vp.w}px/${lang}: every Premium dialog control meets the 44px touch target`,
            gate.small.length === 0, JSON.stringify(gate.small))
        }

        rec.check(`${vp.w}px/${lang}: zero unhandled page errors`,
          realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 2).join(' || '))
      } catch (e) {
        rec.check(`${vp.w}px/${lang}: matrix cell completed`, false, String(e).split('\n')[0])
      } finally {
        await ctx.close()
      }
    }
  }

  return rec.summary()
}
