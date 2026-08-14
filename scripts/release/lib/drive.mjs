// Reusable app drivers for the release-convergence personas.
//
// Binding policy: selectors bind to STABLE contract surfaces in this order —
//   1. `data-testid` / `data-question-id` / element `id` (owned by the app),
//   2. structural position inside a known landmark (`footer button:last`),
//   3. copy regex ONLY where the app exposes no stable handle.
// Copy-bound selectors are marked `// copy-bound` so a future copy change shows
// up as a driver fix, not a false product defect.

import { settle, tap, tapIfPresent } from './harness.mjs'

export const PREFS_KEY = 'qimmah:prefs:v1'
export const ONBOARDING_KEY = 'qimmah:onboarding:v1'
export const NUTRITION_KEY = 'qimmah:nutrition:v2'
export const MEASUREMENTS_KEY = 'qimmah:history:measurementLogs:v1'
export const ACTIVE_WORKOUT_KEY = 'qimmah:active-workout:v2'
export const RECOVERY_KEY = 'qimmah:recovery-log:v1:guest'

/** Seeds the device language BEFORE first paint so the app boots in that locale. */
export async function seedLanguage(ctx, url, lang) {
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ key, language }) => {
    window.localStorage.setItem(key, JSON.stringify({ language, hapticsEnabled: true, theme: 'system' }))
  }, { key: PREFS_KEY, language: lang })
  await page.close()
}

/** Seeds arbitrary localStorage entries before the app boots (dirty-state personas). */
export async function seedStorage(ctx, url, entries) {
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate((pairs) => {
    for (const [k, v] of pairs) {
      if (v === null) window.localStorage.removeItem(k)
      else window.localStorage.setItem(k, v)
    }
  }, Object.entries(entries))
  await page.close()
}

const group = (page, id) => page.locator(`[data-question-id="${id}"]`)
const footerNext = (page) => page.locator('footer button').last()

/** Start screen → guest entry → welcome → first question screen. */
export async function enterAsGuest(page, url, { lang = 'ar' } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await settle(page, 2400)
  // copy-bound: StartViewV2 exposes no testid for its three entry choices.
  await tap(page, lang === 'en' ? /Continue as guest|guest/i : /كضيف/)
  await settle(page, 1000)
  // copy-bound: welcome screen CTA.
  await tap(page, lang === 'en' ? /Let'?s start|Start/i : /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
}

/**
 * Fills the body basics step. Age is the minor-gate input, so it is a parameter
 * of every persona rather than a constant.
 */
export async function fillBody(page, { age = 28, height = 178, weight = 82 } = {}) {
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', String(age))
  await page.fill('#v2-body-height', String(height))
  await page.fill('#v2-body-weight', String(weight))
  await page.locator('button[aria-pressed]').first().click({ force: true })
}

/** Body → intent → history → goal → training → lifestyle → limitations → generate. */
export async function completeOnboarding(page, { age = 28, height = 178, weight = 82, trained = false } = {}) {
  await fillBody(page, { age, height, weight })
  const next = () => footerNext(page).click({ force: true })

  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const intentRows = page.locator('button[aria-pressed]')
  await intentRows.nth(1).click({ force: true })
  await intentRows.nth(3).click({ force: true })

  await next()
  await page.waitForSelector('#onb-title-history', { timeout: 20000 })
  await group(page, 'history.trained_before').getByRole('button').nth(trained ? 2 : 0).click({ force: true })
  if (trained) {
    await group(page, 'history.total_months').getByRole('button').nth(1).click({ force: true })
    await group(page, 'history.last_trained').getByRole('button').nth(0).click({ force: true })
    await group(page, 'history.consistency').getByRole('button').nth(2).click({ force: true })
  }

  await next()
  await page.waitForSelector('#onb-title-goal', { timeout: 20000 })
  await page.locator('button[aria-pressed]').first().click({ force: true })

  await next()
  await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next()
  await page.waitForSelector('#onb-title-lifestyle', { timeout: 20000 })
  await group(page, 'training.place').getByRole('button').nth(0).click({ force: true })
  await group(page, 'activity.neat').getByRole('button').nth(1).click({ force: true })
  await group(page, 'nutrition.diet_pattern').getByRole('button').nth(0).click({ force: true })

  await next()
  await page.waitForSelector('#onb-title-limitations', { timeout: 20000 })
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click({ force: true })
  await footerNext(page).click({ force: true })
}

/**
 * Ready screen → plan handoff. Returns once `[data-testid="plan-handoff"]` is up,
 * which is the contract surface for the Preview/Premium decision.
 */
export async function reachPlanHandoff(page, { lang = 'ar' } = {}) {
  await settle(page, 2000)
  // copy-bound: ReadyScreen CTA has no testid (`t.ready.enter`).
  await tapIfPresent(page, lang === 'en' ? /Enter dashboard/i : /الدخول للوحة/, { timeout: 20000 })
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 30000 })
}

/** Declines Premium at the handoff and lands in Preview. Stable testid. */
export async function declinePremiumIntoPreview(page) {
  await page.locator('[data-testid="handoff-preview-cta"]').click({ timeout: 15000 })
  await settle(page, 2600)
}

/** Full new-preview-user path in one call. */
export async function guestToPreview(page, url, opts = {}) {
  await enterAsGuest(page, url, opts)
  await completeOnboarding(page, opts)
  await reachPlanHandoff(page, opts)
  await declinePremiumIntoPreview(page)
}

/** Redeems the sanctioned mock activation code through the real Premium gate UI. */
export async function activateWithMockCode(page, code = 'QIMMAH-TEST-OK') {
  const gate = page.locator('[data-testid="premium-gate"]')
  if (!(await gate.isVisible().catch(() => false))) throw new Error('activateWithMockCode: Premium gate is not open')
  // copy-bound: the code disclosure toggle has no testid.
  await tap(page, /عندك كود تفعيل|activation code/i)
  await settle(page, 500)
  await page.fill('[data-testid="activation-code-input"]', code)
  await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
  await settle(page, 1600)
  return (await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')).trim()
}

// ─────────────────────── reusable completed-guest seed ───────────────────────

/**
 * Runs the real onboarding ONCE and captures the resulting local state.
 *
 * Every persona that needs "a guest who already finished setup" restores this
 * map instead of re-driving 18 questions. It is a capture of real product
 * output, not hand-authored fixture data — so it cannot drift into fiction.
 */
export async function captureGuestSeed(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  await guestToPreview(page, url)
  const seed = await page.evaluate(() => {
    const out = {}
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)
      if (k) out[k] = window.localStorage.getItem(k)
    }
    return out
  })
  const hash = await page.evaluate(() => location.hash)
  await ctx.close()
  if (!seed['qimmah:onboarding:v1']) throw new Error('captureGuestSeed: onboarding envelope missing from captured state')
  return { seed, hash }
}

/** Opens a fresh context whose storage already contains a captured state map. */
export async function contextWithState(browser, url, state, { width = 390, height = 844, locale = 'ar-SA', engineCtxOpts = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale, ...engineCtxOpts })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate((pairs) => {
    window.localStorage.clear()
    for (const [k, v] of pairs) window.localStorage.setItem(k, v)
  }, Object.entries(state))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await settle(page, 2600)
  return { ctx, page }
}
