// PERSONA 6 — Auth surfaces.
//
// login / signup / forgot are REAL routes (not component state), so the whole
// contract is a routing contract: direct load, refresh, Back, Forward, keyboard
// reachability, honest validation, and both languages.
//
// No account is created and no credential is ever submitted to a real backend:
// the suite only proves the CLIENT contract (routing, labels, validation,
// language, focus). Anything that needs a live Supabase session is recorded as
// EXTERNALLY_BLOCKED rather than simulated.

import {
  createRecorder, settle, goRoute, bodyText, RAW_EXCEPTION_RE,
  collectErrors, realConsoleErrors,
} from '../lib/harness.mjs'
import { PREFS_KEY } from '../lib/drive.mjs'

const AUTH_ROUTES = ['login', 'signup', 'forgot']

async function openFresh(browser, url, { lang = 'ar' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang === 'en' ? 'en-US' : 'ar-SA' })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ key, language }) => {
    window.localStorage.clear()
    window.localStorage.setItem(key, JSON.stringify({ language, hapticsEnabled: true, theme: 'system' }))
  }, { key: PREFS_KEY, language: lang })
  return { ctx, page }
}

export async function run({ browser, url, engine }) {
  const rec = createRecorder(`p6-auth (${engine})`)

  for (const lang of ['ar', 'en']) {
    const { ctx, page } = await openFresh(browser, url, { lang })
    const { pageErrors, consoleErrors } = collectErrors(page)
    try {
      rec.section(`[${lang}] each auth screen is a real, directly-loadable route`)
      for (const route of AUTH_ROUTES) {
        // load it DIRECTLY, cold — the route must own the screen, not a parent's state
        await page.goto(`${url}/#/${route}`, { waitUntil: 'domcontentloaded' })
        await settle(page, 3000)
        const state = await page.evaluate(() => ({
          hash: location.hash,
          dir: document.documentElement.dir,
          htmlLang: document.documentElement.lang,
          hasEmail: !!document.querySelector('input[type=email]'),
          hasPassword: !!document.querySelector('input[type=password]'),
          labelled: [...document.querySelectorAll('input')].every((i) => !!(i.getAttribute('aria-label') || i.labels?.length || i.getAttribute('aria-labelledby'))),
          text: (document.body.innerText || '').trim(),
        }))
        rec.check(`[${lang}] #/${route} loads directly and owns the URL`, state.hash.includes(route), state.hash)
        rec.check(`[${lang}] #/${route} renders real content`, state.text.length > 60, `len=${state.text.length}`)
        rec.check(`[${lang}] #/${route} labels every input (a11y)`, state.labelled, `emailField=${state.hasEmail} pwField=${state.hasPassword}`)
        rec.check(`[${lang}] #/${route} sets document direction and language correctly`,
          state.dir === (lang === 'en' ? 'ltr' : 'rtl') && state.htmlLang.startsWith(lang),
          `dir=${state.dir} lang=${state.htmlLang}`)
      }

      rec.section(`[${lang}] refresh · Back · Forward across the auth routes`)
      await page.goto(`${url}/#/login`, { waitUntil: 'domcontentloaded' }); await settle(page, 2600)
      await goRoute(page, 'signup', 2400)
      await goRoute(page, 'forgot', 2400)
      await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page, 2800)
      const afterReload = await page.evaluate(() => location.hash)
      rec.check(`[${lang}] refreshing on #/forgot stays on #/forgot`, afterReload.includes('forgot'), afterReload)
      await page.goBack(); await settle(page, 2000)
      const back1 = await page.evaluate(() => location.hash)
      rec.check(`[${lang}] Back from forgot returns to signup (a real history entry)`, back1.includes('signup'), back1)
      await page.goBack(); await settle(page, 2000)
      const back2 = await page.evaluate(() => location.hash)
      rec.check(`[${lang}] Back again returns to login`, back2.includes('login'), back2)
      await page.goForward(); await settle(page, 2000)
      const fwd = await page.evaluate(() => location.hash)
      rec.check(`[${lang}] Forward returns to signup`, fwd.includes('signup'), fwd)

      rec.section(`[${lang}] invalid input is refused honestly, with no crash`)
      await page.goto(`${url}/#/login`, { waitUntil: 'domcontentloaded' }); await settle(page, 2800)
      const email = page.locator('input[type=email]').first()
      const password = page.locator('input[type=password]').first()
      if (await email.count()) {
        await email.fill('not-an-email')
        if (await password.count()) await password.fill('x')
        await page.locator('form button[type=submit], form button').last().click({ timeout: 6000 }).catch(() => {})
        await settle(page, 1600)
        const t = await bodyText(page)
        rec.check(`[${lang}] an invalid email is refused without a raw exception`, !RAW_EXCEPTION_RE.test(t), t.slice(0, 160))
        rec.check(`[${lang}] the user is told something went wrong (visible feedback)`,
          /غير صالح|صحيح|خطأ|مطلوب|invalid|required|check/i.test(t), t.slice(0, 200))
        rec.check(`[${lang}] a failed submit leaves the user on the auth route`,
          (await page.evaluate(() => location.hash)).includes('login'))
        const stored = await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.includes('supabase') || k.includes('auth')))
        rec.check(`[${lang}] a failed submit wrote no session token`, stored.length === 0, `keys=[${stored.join(', ')}]`)
      } else {
        rec.blocked(`[${lang}] invalid-form validation`, 'the login route exposed no email input to drive')
      }

      rec.section(`[${lang}] keyboard reachability`)
      await page.goto(`${url}/#/login`, { waitUntil: 'domcontentloaded' }); await settle(page, 2800)
      const tabbed = []
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab')
        tabbed.push(await page.evaluate(() => {
          const a = document.activeElement
          return a ? `${a.tagName.toLowerCase()}${a.type ? `[${a.type}]` : ''}` : 'none'
        }))
      }
      rec.check(`[${lang}] Tab reaches the email field`, tabbed.some((t) => t.includes('email')), tabbed.join(' → '))
      rec.check(`[${lang}] Tab reaches a submit control`, tabbed.some((t) => t.startsWith('button')), tabbed.join(' → '))
      rec.check(`[${lang}] focus never falls off the document`, !tabbed.includes('none'), tabbed.join(' → '))

      rec.section(`[${lang}] page health`)
      rec.check(`[${lang}] zero unhandled page errors across auth`, pageErrors.length === 0, pageErrors.slice(0, 3).join(' || '))
      const realErrs = realConsoleErrors(consoleErrors)
      rec.check(`[${lang}] zero non-benign console errors across auth`, realErrs.length === 0, realErrs.slice(0, 3).join(' || '))
    } catch (e) {
      rec.check(`[${lang}] auth persona completed without a driver failure`, false, String(e).split('\n')[0])
    } finally {
      await ctx.close()
    }
  }

  rec.section('what this environment cannot prove')
  rec.blocked('real sign-up / sign-in / password reset round trip',
    'requires a live Supabase project; Supabase is a declared no-touch zone for this contract and no staging credentials exist on this machine. Client routing/validation is proved above; server-side behaviour is not.')

  return rec.summary()
}
