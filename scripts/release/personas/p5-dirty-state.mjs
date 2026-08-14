// PERSONA 5 — Dirty / Corrupt State.
//
// Real devices carry junk: a previous schema, a half-written JSON blob, a value
// of the wrong shape, an unknown version stamp, a full disk. The contract under
// attack is narrow and absolute:
//   • the app must not crash to a blank screen,
//   • it must not SILENTLY DESTROY data it merely failed to understand,
//   • and it must not report success for a write that did not land.
//
// Each vector runs in its own fresh context so one failure cannot mask another.

import {
  createRecorder, settle, goRoute, storageSnapshot, bodyText,
  RAW_EXCEPTION_RE, collectErrors, realPageErrors,
} from '../lib/harness.mjs'

const VECTORS = [
  {
    id: 'legacy-v5-draft',
    why: 'a draft written by the previous schema version must migrate, not vanish',
    mutate: (s) => ({ ...s, 'qimmah:onboarding:v1': JSON.stringify({ completed: false, draft: { v: 5, age: 30, heightCm: 180, weightKg: 84 } }) }),
    preserveKey: null,
  },
  {
    id: 'malformed-json',
    why: 'a truncated write must not take the app down',
    mutate: (s) => ({ ...s, 'qimmah:nutrition:v2': '{"foods":[{"id":"a","calories":' }),
    preserveKey: null,
  },
  {
    id: 'unknown-future-version',
    why: 'a newer schema from a newer build must be refused, never silently reinterpreted',
    mutate: (s) => ({ ...s, 'qimmah:onboarding:v1': JSON.stringify({ completed: true, draft: { v: 999, unknown: true } }) }),
    preserveKey: 'qimmah:onboarding:v1',
  },
  {
    id: 'array-object-mismatch',
    why: 'a store expecting a list handed an object must not corrupt the rest of the device',
    mutate: (s) => ({ ...s, 'qimmah:history:measurementLogs:v1': JSON.stringify({ notAnArray: true }) }),
    preserveKey: 'qimmah:onboarding:profile:v1',
  },
  {
    id: 'primitive-where-object-expected',
    why: 'a scalar in a structured slot must be rejected at the boundary',
    mutate: (s) => ({ ...s, 'qimmah:customization:v1': '42' }),
    preserveKey: 'qimmah:onboarding:v1',
  },
  {
    id: 'stale-active-workout',
    why: 'a foreign/stale session payload must not be resumed as if it were the user’s',
    mutate: (s) => ({ ...s, 'qimmah:active-workout:v2': JSON.stringify({ hacked: true, exercises: 'nope' }) }),
    preserveKey: 'qimmah:onboarding:v1',
  },
  {
    id: 'empty-string-values',
    why: 'empty values are a real disk outcome and must read as absent, not as data',
    mutate: (s) => ({ ...s, 'qimmah:nutrition:v2': '', 'qimmah:history:workoutSessions:v1': '' }),
    preserveKey: 'qimmah:onboarding:v1',
  },
  {
    id: 'prototype-pollution-payload',
    why: 'untrusted stored JSON must not be able to reach Object.prototype',
    mutate: (s) => ({ ...s, 'qimmah:customization:v1': '{"__proto__":{"polluted":"yes"},"profile":{"goal":"cut"}}' }),
    preserveKey: 'qimmah:onboarding:v1',
  },
]

export async function run({ browser, url, engine, seed }) {
  const rec = createRecorder(`p5-dirty-state (${engine})`)

  for (const v of VECTORS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
    const page = await ctx.newPage()
    const { pageErrors } = collectErrors(page)
    try {
      rec.section(`${v.id} — ${v.why}`)
      const dirty = v.mutate({ ...seed.seed })
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.evaluate((pairs) => {
        window.localStorage.clear()
        for (const [k, val] of pairs) window.localStorage.setItem(k, val)
      }, Object.entries(dirty))
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await settle(page, 3400)

      const rendered = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim(),
        rootChildren: document.getElementById('root')?.childElementCount ?? 0,
      }))
      rec.check(`${v.id}: the app renders instead of blanking`,
        rendered.rootChildren > 0 && rendered.text.length > 60,
        `children=${rendered.rootChildren} len=${rendered.text.length}`)
      rec.check(`${v.id}: no raw exception text reaches the user`,
        !RAW_EXCEPTION_RE.test(rendered.text), rendered.text.slice(0, 180))
      rec.check(`${v.id}: no unhandled page error`, realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 2).join(' || '))

      // walk the main surfaces — a corrupt store often only bites on its own screen
      for (const route of ['dashboard', 'workout', 'nutrition', 'progress', 'profile']) {
        await goRoute(page, route, 2200)
      }
      const after = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim(),
        rootChildren: document.getElementById('root')?.childElementCount ?? 0,
      }))
      rec.check(`${v.id}: every main tab still renders after the corrupt read`,
        after.rootChildren > 0 && after.text.length > 60, `len=${after.text.length}`)

      if (v.preserveKey) {
        const stored = await storageSnapshot(page)
        rec.check(`${v.id}: unrelated user data (${v.preserveKey}) was NOT destroyed`,
          typeof stored[v.preserveKey] === 'string' && stored[v.preserveKey].length > 2,
          `value=${String(stored[v.preserveKey]).slice(0, 80)}`)
      }

      if (v.id === 'prototype-pollution-payload') {
        const polluted = await page.evaluate(() => ({}).polluted === 'yes' || Object.prototype.polluted === 'yes')
        rec.check(`${v.id}: Object.prototype was not polluted by stored JSON`, !polluted, `polluted=${polluted}`)
      }

      rec.check(`${v.id}: zero unhandled page errors after the surface walk`,
        realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 2).join(' || '))
    } catch (e) {
      rec.check(`${v.id}: vector completed without a driver failure`, false, String(e).split('\n')[0])
    } finally {
      await ctx.close()
    }
  }

  // ── quota failure: the honest-write contract under a blocked disk ───────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
    const page = await ctx.newPage()
    const { pageErrors } = collectErrors(page)
    try {
      rec.section('storage quota failure — a refused write must never look like a success')
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.evaluate((pairs) => {
        window.localStorage.clear()
        for (const [k, val] of pairs) window.localStorage.setItem(k, val)
      }, Object.entries(seed.seed))
      // Block every future write BEFORE the app boots, the way a full disk does.
      await page.addInitScript(() => {
        const proto = Object.getPrototypeOf(window.localStorage)
        const original = proto.setItem
        proto.setItem = function blocked(key, value) {
          if (String(key).startsWith('qimmah:')) {
            const err = new Error('QuotaExceededError: simulated full device')
            err.name = 'QuotaExceededError'
            throw err
          }
          return original.call(this, key, value)
        }
      })
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await settle(page, 3400)
      const boot = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim(),
        children: document.getElementById('root')?.childElementCount ?? 0,
      }))
      rec.check('the app still boots on a device that refuses every write',
        boot.children > 0 && boot.text.length > 60, `len=${boot.text.length}`)
      rec.check('no raw storage exception reaches the user on boot',
        !RAW_EXCEPTION_RE.test(boot.text), boot.text.slice(0, 180))

      const before = await storageSnapshot(page)
      await goRoute(page, 'workout', 2600)
      await page.locator('button').filter({ hasText: /اليوم 1/ }).first().click({ timeout: 8000 }).catch(() => {})
      await settle(page, 1600)
      const after = await storageSnapshot(page)
      const destroyed = Object.keys(before).filter((k) => !(k in after))
      rec.check('a refused write destroyed no existing key', destroyed.length === 0, `destroyed=[${destroyed.join(', ')}]`)
      const txt = await bodyText(page)
      rec.check('no raw storage exception reaches the user during a blocked mutation',
        !RAW_EXCEPTION_RE.test(txt), txt.slice(0, 180))
      rec.check('zero unhandled page errors under a fully blocked disk',
        realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 3).join(' || '))
    } catch (e) {
      rec.check('quota vector completed without a driver failure', false, String(e).split('\n')[0])
    } finally {
      await ctx.close()
    }
  }

  return rec.summary()
}
