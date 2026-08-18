// PERSONA 1 — New Preview User.
//
// Landing → onboarding → personalized reveal → decline Premium → Preview →
// browse every surface → attempt EVERY paid mutation → each must be refused
// honestly: the one Premium surface opens, NO stored state changes, and no raw
// exception reaches the user.
//
// Judgement rule: the boundary is measured by a byte diff of every `qimmah:*`
// key, never by whether a button was visible. Hiding a control is not a boundary.

import {
  createRecorder, settle, tap, tapIfPresent, gateVisible, dismissGate, goRoute,
  storageSnapshot, storageDiff, bodyText, RAW_EXCEPTION_RE, collectErrors, realConsoleErrors, realPageErrors,
} from '../lib/harness.mjs'
import { enterAsGuest, completeOnboarding, reachPlanHandoff, declinePremiumIntoPreview, isActiveSessionKey, ACTIVE_SESSION_KEYS, PLAN_DAY_1, WATER_PRESET_250 } from '../lib/drive.mjs'

/** Every action in `PAID_ACTIONS`. Each must end this suite classified, never silent. */
const PAID_ACTIONS = [
  'workout.start', 'workout.startEmpty', 'workout.logSet', 'workout.finish',
  'nutrition.addFood', 'nutrition.removeFood', 'nutrition.quickAdd', 'nutrition.water', 'nutrition.toggleMeal',
  'progress.logWeight', 'progress.logMeasurement', 'plan.saveEdit', 'recovery.log',
]

const BROWSABLE = [
  'dashboard', 'workout', 'exercises', 'nutrition', 'progress', 'measurements',
  'profile', 'stats', 'steps', 'recovery', 'settings', 'calc', 'privacy', 'terms', 'contact',
]

export async function run({ browser, url, engine }) {
  const rec = createRecorder(`p1-preview-user (${engine})`)
  const classified = new Map()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const { pageErrors, consoleErrors } = collectErrors(page)

  try {
    // ── 1. entry + onboarding + reveal ────────────────────────────────────
    rec.section('entry → onboarding → personalized reveal')
    await enterAsGuest(page, url)
    rec.check('landing offers guest entry and reaches the first question', true, 'first field #v2-body-age present')

    await completeOnboarding(page, { age: 28, height: 178, weight: 82 })
    await reachPlanHandoff(page)
    const handoff = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="plan-handoff"]')
      return {
        text: el ? el.innerText : '',
        cta: document.querySelector('[data-testid="handoff-premium-cta"]')?.getAttribute('href') || '',
        rel: document.querySelector('[data-testid="handoff-premium-cta"]')?.getAttribute('rel') || '',
        preview: !!document.querySelector('[data-testid="handoff-preview-cta"]'),
      }
    })
    // The reveal must carry the generated plan, not a generic "saved" notice.
    rec.check('reveal shows a personalized plan (day count + session length present)',
      /\d|[٠-٩]/.test(handoff.text) && handoff.text.length > 200, `len=${handoff.text.length}`)
    rec.check('reveal offers BOTH a Premium purchase and a free-preview exit',
      /^https?:\/\//.test(handoff.cta) && handoff.preview, `cta=${handoff.cta}`)
    rec.check('Premium CTA opens externally with noopener noreferrer',
      /noopener/.test(handoff.rel) && /noreferrer/.test(handoff.rel), `rel="${handoff.rel}"`)
    rec.check('reveal copy carries no forbidden Premium promise (lifetime / مدى الحياة)',
      !/mdى الحياة|مدى الحياة|lifetime/i.test(handoff.text), handoff.text.slice(0, 160))

    await declinePremiumIntoPreview(page)
    const landedHash = await page.evaluate(() => location.hash)
    rec.check('declining Premium lands inside the app (Preview), not a dead end',
      /dashboard/.test(landedHash), landedHash)

    // ── 2. browse every surface ───────────────────────────────────────────
    rec.section('Preview browses every surface (block the action, not the page)')
    for (const route of BROWSABLE) {
      await goRoute(page, route, 2600)
      const state = await page.evaluate(() => ({
        hash: location.hash,
        text: (document.body.innerText || '').trim(),
      }))
      const notFound = /الصفحة غير موجودة|Not found/i.test(state.text)
      rec.check(`#/${route} is browsable in Preview`,
        state.hash.includes(route) && !notFound && state.text.length > 150,
        `hash=${state.hash} len=${state.text.length} notFound=${notFound}`)
    }

    // exercise detail deep link is browse-only content and must stay open
    await goRoute(page, 'exercises', 2600)
    await page.locator('button').filter({ hasText: /بلانك|Plank/ }).first().click({ timeout: 10000 }).catch(() => {})
    await settle(page, 1400)
    const detail = await page.evaluate(() => ({ hash: location.hash, dialog: !!document.querySelector('[role="dialog"]') }))
    rec.check('exercise detail is reachable in Preview and owns the URL',
      /#\/exercises\/.+/.test(detail.hash) && detail.dialog, JSON.stringify(detail))
    await page.keyboard.press('Escape')
    await settle(page, 800)

    // ── 3. paid mutation matrix ───────────────────────────────────────────
    rec.section('every paid mutation is refused honestly (gate opens · zero writes · no raw exception)')

    /**
     * Attempts one mutation and judges it by stored bytes.
     * `open` navigates/prepares; `fire` performs the blocked action.
     */
    const attempt = async (action, label, open, fire) => {
      await open()
      const before = await storageSnapshot(page)
      const errsBefore = pageErrors.length
      // An affordance that cannot be found must NOT kill the suite. p1 covers ~20
      // preview-gate assertions; one missing button previously threw and zeroed
      // them all, which reads as "untested" but tallies as a single failure.
      // Charter §4.2: it fails BY NAME, and the remaining attempts still run.
      try {
        await fire()
      } catch (err) {
        rec.check(`${action} — affordance reachable`, false, `${label} — ${String(err).split('\n')[0]}`)
        classified.set(action, 'AFFORDANCE_NOT_FOUND')
        return
      }
      rec.check(`${action} — affordance reachable`, true, label)
      await settle(page, 1400)
      const gate = await gateVisible(page)
      const after = await storageSnapshot(page)
      const changed = storageDiff(before, after)
        // Local usage telemetry is a device log, not paid state; it legitimately
        // records that the user *tried*. Named exclusion, guarded below.
        .filter((k) => !k.startsWith('qimmah:tracking:events:'))
      const txt = await bodyText(page)
      const raw = RAW_EXCEPTION_RE.test(txt)
      rec.check(`${action} — Premium surface opens`, gate, label)
      rec.check(`${action} — no paid state written`, changed.length === 0, `changed=[${changed.join(', ')}]`)
      rec.check(`${action} — no raw exception surfaces`, !raw && pageErrors.length === errsBefore,
        raw ? txt.slice(0, 200) : pageErrors.slice(errsBefore).join(' | '))
      classified.set(action, 'EXERCISED_LIVE')
      await dismissGate(page)
      await settle(page, 400)
    }

    // NOTE: the dashboard «ابدأ التمرين» CTA is NAVIGATION to #/workout, not a
    // mutation — verified separately below. The real `workout.start` affordance
    // is a plan day card on the Workout screen.
    await attempt('workout.start', '#/workout plan day card «اليوم ١»',
      () => goRoute(page, 'workout', 2600),
      () => page.locator('button').filter({ hasText: PLAN_DAY_1 }).first().click({ timeout: 10000 }))

    await attempt('workout.startEmpty', '#/workout «ابدأ تمرين فارغ»',
      () => goRoute(page, 'workout', 2400),
      () => tap(page, /ابدأ تمرين فارغ/))

    await attempt('nutrition.addFood', '#/nutrition «أضف»',
      () => goRoute(page, 'nutrition', 2600),
      () => tap(page, /^أضف$/))

    await attempt('nutrition.water', '#/nutrition «+٢٥٠ مل»',
      () => goRoute(page, 'nutrition', 2400),
      () => tap(page, WATER_PRESET_250))

    await attempt('recovery.log', '#/recovery «اعرض توصيتي»',
      () => goRoute(page, 'recovery', 2400),
      () => tap(page, /اعرض توصيتي/))

    await attempt('progress.logMeasurement', '#/measurements «أضف قياسًا» → save',
      async () => {
        await goRoute(page, 'measurements', 2600)
        await tap(page, /أضف قياسًا/)
        await settle(page, 900)
      },
      async () => {
        const w = page.locator('#v2-weight')
        if (await w.count()) await w.fill('81')
        await tap(page, /احفظ القياسات|احفظ/)
      })

    await attempt('progress.logWeight', '#/progress «الوزن والجسم» → «تسجيل وزن اليوم» → save',
      async () => {
        await goRoute(page, 'progress', 2600)
        await tapIfPresent(page, /الوزن والجسم/)
        await settle(page, 800)
        await tapIfPresent(page, /تسجيل وزن اليوم|سجّل الحين|قِس/)
        await settle(page, 900)
      },
      async () => {
        const w = page.locator('#v2-weight')
        if (await w.count()) await w.fill('80')
        await tap(page, /احفظ القياسات|احفظ|سجّل/)
      })

    // quick-log is a distinct writer (nutrition.quickAdd) with its own entry
    await attempt('nutrition.quickAdd', 'dashboard quick-log «سجّل وجبة»',
      async () => {
        await goRoute(page, 'dashboard', 2400)
        // firstWin.ts:107-110 — primary/alternative flip at EVENING_HOUR (21):
        // day → meal «سجّل وجبة», evening → dinner «سجّل عشاك». Matching one only
        // made this suite fail after 21:00 and pass before it.
        await tap(page, /سجّل وجبة|سجّل عشاك/)
        await settle(page, 1200)
      },
      async () => {
        const custom = await tapIfPresent(page, /إضافة سريعة|أضف يدويًا|سعرات/)
        if (!custom) await tapIfPresent(page, /^أضف$/)
        await settle(page, 600)
        await tapIfPresent(page, /^أضف$|احفظ/)
      })

    // `plan.saveEdit` has TWO live paths. Path 1 (`WorkoutView` custom plan
    // builder) is the one `test:access-gate` names. Path 2 is Settings →
    // «تعديل خطتي» → the customization centre at #/setup, which persists the
    // same paid concern. Both are attempted here — a paid action must not be
    // enforceable on one route and open on another.
    await goRoute(page, 'workout', 2600)
    await tap(page, /أنشئ جدول مخصّص/)
    await settle(page, 1600)
    await tapIfPresent(page, /^التالي$/); await settle(page, 1100)
    await tapIfPresent(page, /أضف تمرين/); await settle(page, 1400)
    await tapIfPresent(page, /^إضافة$/); await settle(page, 1100)
    await tapIfPresent(page, /^التالي$|^رجوع$/); await settle(page, 1100)
    await tapIfPresent(page, /^التالي$/); await settle(page, 1100)
    const save1 = page.locator('button').filter({ hasText: /حفظ الجدول/ }).first()
    const save1Ready = (await save1.count()) > 0 && (await save1.isEnabled().catch(() => false))
    if (save1Ready) {
      const b = await storageSnapshot(page)
      await save1.click({ timeout: 8000 })
      await settle(page, 1600)
      const g = await gateVisible(page)
      const changed = storageDiff(b, await storageSnapshot(page)).filter((k) => !k.startsWith('qimmah:tracking:events:'))
      rec.check('plan.saveEdit (path 1 — Workout custom plan builder) — Premium surface opens', g, 'حفظ الجدول')
      rec.check('plan.saveEdit (path 1) — no paid state written', changed.length === 0, `changed=[${changed.join(', ')}]`)
      await dismissGate(page)
    } else {
      rec.blocked('plan.saveEdit (path 1 — Workout custom plan builder) live save',
        'the builder’s «حفظ الجدول» stays disabled until a complete schedule exists; the guard on this path is proved statically by test:access-gate (WorkoutView CustomPlanBuilder.onSave)')
    }

    rec.section('plan-edit boundary — the SECOND live path to the same paid state')
    await goRoute(page, 'settings', 2600)
    await tap(page, /تعديل خطتي/)
    await settle(page, 2200)
    const editHash = await page.evaluate(() => location.hash)
    const readGoal = () => page.evaluate(() => {
      try { return JSON.parse(window.localStorage.getItem('qimmah:customization:v1') || '{}').profile?.goal ?? null }
      catch { return null }
    })
    const goalBefore = await readGoal()
    await page.locator('button').filter({ hasText: /^تضخيم$/ }).first().click({ timeout: 8000 }).catch(() => {})
    await settle(page, 900)
    const gateOnChange = await gateVisible(page)
    await tapIfPresent(page, /حفظ مؤقت/)
    await settle(page, 1600)
    const gateOnSave = await gateVisible(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await settle(page, 2600)
    const goalAfter = await readGoal()
    rec.check('Preview reaching the plan editor opens the Premium surface OR persists nothing',
      gateOnChange || gateOnSave || goalAfter === goalBefore,
      `route=${editHash} gateOnChange=${gateOnChange} gateOnSave=${gateOnSave} goal ${goalBefore} → ${goalAfter} (after reload)`)
    rec.check('the declared paid action `plan.saveEdit` is enforced on EVERY live path, not one',
      gateOnSave || goalAfter === goalBefore,
      `path-1 (WorkoutView) is guarded; path-2 (${editHash}) wrote goal="${goalAfter}" with no gate`)
    await dismissGate(page)
    classified.set('plan.saveEdit', 'EXERCISED_LIVE')

    // ── 4. actions with no Preview-reachable affordance ───────────────────
    rec.section('paid actions with no Preview-reachable affordance — classified, not skipped')
    // workout.logSet / workout.finish live INSIDE a session. Preview cannot open
    // a session (proved above), so the correct assertion is that no session key
    // was ever created during the entire matrix.
    const finalKeys = Object.keys(await storageSnapshot(page))
    rec.check('workout.logSet / workout.finish are unreachable because no session was ever written',
      !finalKeys.some(isActiveSessionKey),
      `watched=[${ACTIVE_SESSION_KEYS.join(', ')}] present=[${finalKeys.filter(isActiveSessionKey).join(', ') || 'none'}]`)
    // Counter-proof (§4.2): the key this assertion watches must be the one the
    // app REALLY writes. p2 proves an entitled user creates `qimmah:activeWorkout:v1`;
    // watching only the registered-but-unused `:active-workout:v2` would make the
    // assertion above pass no matter what Preview did.
    rec.check('the watched session key set includes the LIVE writer key, not only the registered one',
      ACTIVE_SESSION_KEYS.includes('qimmah:activeWorkout:v1'), ACTIVE_SESSION_KEYS.join(', '))
    classified.set('workout.logSet', 'UNREACHABLE_NO_SESSION')
    classified.set('workout.finish', 'UNREACHABLE_NO_SESSION')

    // nutrition.removeFood / toggleMeal need an existing logged row. Preview can
    // never create one, so their live surface is unreachable BY CONSTRUCTION.
    await goRoute(page, 'nutrition', 2600)
    const rows = await page.evaluate(() => {
      const raw = window.localStorage.getItem('qimmah:nutrition:v2')
      try { return (JSON.parse(raw || '{}').foods || []).length } catch { return -1 }
    })
    rec.check('nutrition.removeFood / toggleMeal are unreachable because Preview logged zero rows',
      rows === 0 || rows === -1, `rows=${rows}`)
    classified.set('nutrition.removeFood', 'UNREACHABLE_NO_ROW')
    classified.set('nutrition.toggleMeal', 'UNREACHABLE_NO_ROW')

    rec.check('every PAID_ACTION is classified (exercised or reasoned) — none silently skipped',
      PAID_ACTIONS.every((a) => classified.has(a)),
      PAID_ACTIONS.filter((a) => !classified.has(a)).join(', ') || 'all 13 classified')

    // ── 5. counter-proof: the exclusion above is not a loophole ───────────
    rec.section('counter-proof — the tracking-key exclusion is not a blanket pass')
    const probeBefore = await storageSnapshot(page)
    await page.evaluate(() => window.localStorage.setItem('qimmah:nutrition:v2', JSON.stringify({ foods: [{ id: 'probe' }] })))
    const probeAfter = await storageSnapshot(page)
    const probeChanged = storageDiff(probeBefore, probeAfter).filter((k) => !k.startsWith('qimmah:tracking:events:'))
    rec.check('a real paid-state write WOULD be detected by the same diff', probeChanged.includes('qimmah:nutrition:v2'), `detected=[${probeChanged.join(', ')}]`)
    await page.evaluate(() => window.localStorage.removeItem('qimmah:nutrition:v2'))

    // ── 5b. numeral policy is one policy, not per-screen ──────────────────
    // PKG-7/BUG-019 declared `formatNumber` the single presentation boundary:
    // Arabic-Indic digits in Arabic, Latin digits in English. A user in one
    // Arabic session must not see the same fact in two numeral systems.
    //
    // NAMED EXCLUSION (§4.2): `#/calc` prints published equations, whose literal
    // constants (`10`, `6.25`, `9`, `4`, `7`) and citations (`Mifflin-St Jeor
    // (1990)`) are notation, not user values — they stay Latin by design, while
    // that same screen renders the USER's numbers Arabic-Indic. The exclusion is
    // guarded by the paired same-fact check below, which `#/calc` cannot satisfy
    // by accident.
    rec.section('numeral policy holds across every LIVE numeric surface (Arabic session)')
    const digitsOn = async (route) => {
      await goRoute(page, route, 2600)
      return page.evaluate(() => {
        const root = document.querySelector('main') || document.body
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        const latin = []
        let n
        while ((n = walker.nextNode())) {
          const t = (n.nodeValue || '').trim()
          if (/[0-9]/.test(t)) latin.push(t.slice(0, 48))
        }
        return { latin, arabicIndic: /[٠-٩]/.test(root.innerText || '') }
      })
    }

    const nut = await digitsOn('nutrition')
    rec.check('LIVE Nutrition renders its numbers in the Arabic numeral policy',
      nut.latin.length === 0, `latin values: ${JSON.stringify(nut.latin.slice(0, 8))}`)

    const wk = await digitsOn('workout')
    rec.check('LIVE Workout renders its numbers in the Arabic numeral policy',
      wk.latin.length === 0, `latin values: ${JSON.stringify(wk.latin.slice(0, 8))}`)

    const prog = await digitsOn('progress')
    rec.check('LIVE Progress renders its numbers in the Arabic numeral policy',
      prog.latin.length === 0, `latin values: ${JSON.stringify(prog.latin.slice(0, 8))}`)

    // Paired counter-proof: ONE fact — training days per week — read off two live
    // screens in the SAME Arabic session. Two numeral systems for one fact is
    // the user-visible form of the defect, and no incidental digit can fake it.
    const daysOn = async (route) => {
      await goRoute(page, route, 2600)
      return page.evaluate(() => {
        const t = (document.querySelector('main')?.innerText || '')
        const m = t.match(/([0-9٠-٩]+)\s*(?:أيام|يوم)\s*\/?\s*(?:أسبوع|في الأسبوع)/)
        return m ? m[0] : ''
      })
    }
    const daysProfile = await daysOn('profile')
    const daysWorkout = await daysOn('workout')
    const system = (s) => (/[٠-٩]/.test(s) ? 'arabic-indic' : /[0-9]/.test(s) ? 'latin' : 'none')
    rec.check('the SAME fact (training days per week) uses ONE numeral system on every live screen',
      !daysProfile || !daysWorkout || system(daysProfile) === system(daysWorkout),
      `#/profile "${daysProfile}" → ${system(daysProfile)}  vs  #/workout "${daysWorkout}" → ${system(daysWorkout)}`)

    // ── 6. page health ────────────────────────────────────────────────────
    rec.section('page health across the whole journey')
    rec.check('zero unhandled page errors', realPageErrors(pageErrors).length === 0, realPageErrors(pageErrors).slice(0, 3).join(' || '))
    const realErrs = realConsoleErrors(consoleErrors)
    rec.check('zero non-benign console errors', realErrs.length === 0, realErrs.slice(0, 3).join(' || '))
  } finally {
    await ctx.close()
  }
  return rec.summary()
}
