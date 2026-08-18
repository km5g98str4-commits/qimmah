// QEA-004 — مصفوفة الإعداد الحالية: هدف × مكان × حركة يومية (3×3×4 = 36).
//
// كانت المصفوفة تفحص «تفضيل المعدّات»، لكن السؤال أُزيل لأنه لا يملك مستهلكًا
// تشغيليًا. المحور الثالث الآن `activity.neat`: حقيقة محفوظة تدخل حساب الطاقة.
// كل توليفة تمرّ بالمكوّن الحقيقي وبالأسئلة السبعة حتى ملخّص الخطة، ويضاف
// فحص ممثّل للفشل/إعادة المحاولة وفحص استئناف لمسار تاريخ التدريب المشروط.

import { spawn } from 'node:child_process'
import { chromium } from './e2e/lib/engine.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as sleep } from 'node:timers/promises'
import { assertDevFlag, loadAppCopy } from './e2e/lib/app-copy.mjs'
import { answerDietPattern } from './e2e/lib/onboarding-driver.mjs'

const EVIDENCE_DIR = resolve(process.argv[2] || process.env.EVIDENCE_DIR || join(tmpdir(), `qimmah-onboarding-matrix-${Date.now()}`))
mkdirSync(EVIDENCE_DIR, { recursive: true })

const PORT = 4321
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/?surface=onboarding`
const GOALS = ['cut', 'maintain', 'bulk']
const PLACES = ['gym', 'home', 'machines']
const NEAT = ['sedentary', 'light', 'moderate', 'high']
const FORCE_FAIL = assertDevFlag('qimmah:onboarding:force-fail', 'src/views/OnboardingV2.tsx')
const group = (page, id) => page.locator(`[data-question-id="${id}"]`)

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function freshPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('qimmah:onboarding:v1'))
  await page.reload({ waitUntil: 'networkidle' })
  return { ctx, page, consoleErrors }
}

async function begin(page, copy) {
  await page.getByRole('button', { name: copy.onboarding.welcome.start }).click()
  await page.getByRole('checkbox').first().check()
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await group(page, 'body.sex').getByRole('button').first().click()
  await page.locator('footer button').last().click()
  await group(page, 'intent.primary').getByRole('button').first().click()
  await group(page, 'experience.declared').getByRole('button').nth(1).click()
  await page.locator('footer button').last().click()
}

/** يمرّ بمسار كامل؛ التاريخ «أول مرة» ثابت لعزل محاور المصفوفة الثلاثة. */
async function runCombo(page, copy, goal, place, neat) {
  const next = () => page.locator('footer button').last().click()
  await begin(page, copy)
  await group(page, 'history.trained_before').getByRole('button').first().click()
  await next()
  await group(page, 'goal.primary').getByRole('button').nth(GOALS.indexOf(goal)).click()
  await next()
  await next() // قيم الجدول الافتراضية صالحة ومعلنة في الواجهة.
  await group(page, 'training.place').getByRole('button').nth(PLACES.indexOf(place)).click()
  await group(page, 'activity.neat').getByRole('button').nth(NEAT.indexOf(neat)).click()
  // نمط الأكل مشروط بالنيّة؛ الطقم يختار `intents[0]`. نقيس التطابق ونسقط باسمه.
  const diet = await answerDietPattern(page, copy.intent.intents[0].value)
  if (!diet.agrees) {
    throw new Error(`عقد نمط الأكل انكسر: النيّة «${copy.intent.intents[0].value}» تتوقّع ظهورًا=${diet.applies} والشاشة أعطت ${diet.rendered}`)
  }
  await next()
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click()
  await next()
  await page.getByRole('heading', { name: copy.onboarding.ready.title }).waitFor()

  const text = await page.locator('body').innerText()
  const goalLabel = copy.goals.find((entry) => entry.value === goal)?.label ?? goal
  const placeLabel = copy.onboarding.places.find((entry) => entry.value === place)?.label ?? place
  return {
    ok: text.includes(goalLabel) && text.includes(placeLabel),
    detail: `goal=${goalLabel}, place=${placeLabel}, neat=${neat}`,
  }
}

let browser
let server
try {
  const copy = await loadAppCopy()
  server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  const started = Date.now()
  while (true) {
    try { if ((await fetch(BASE)).ok) break } catch { /* not ready */ }
    if (Date.now() - started > 20000) throw new Error('server did not start')
    await sleep(250)
  }

  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
  let index = 0
  const totalCombos = GOALS.length * PLACES.length * NEAT.length
  for (const goal of GOALS) {
    for (const place of PLACES) {
      for (const neat of NEAT) {
        index += 1
        const { ctx, page, consoleErrors } = await freshPage(browser)
        const label = `[${index}/${totalCombos}] ${goal} × ${place} × ${neat}`
        try {
          const result = await runCombo(page, copy, goal, place, neat)
          check(label, result.ok, result.detail)
          check(`${label} — zero console errors`, consoleErrors.length === 0, consoleErrors.join(' | '))
        } catch (error) {
          check(label, false, error.message)
        } finally {
          await ctx.close()
        }
      }
    }
  }

  // فشل مجبَر وإعادة محاولة بعد اكتمال الأسئلة — مرة ممثّلة.
  {
    const { ctx, page } = await freshPage(browser)
    try {
      await runCombo(page, copy, 'cut', 'gym', 'moderate')
      await page.evaluate((key) => localStorage.setItem(key, '1'), FORCE_FAIL)
      await page.getByRole('button', { name: copy.onboarding.ready.enter }).click()
      check('فشل مجبَر: شاشة الخطأ تظهر', await page.getByRole('heading', { name: copy.onboarding.error.title }).isVisible())
      await page.evaluate((key) => localStorage.removeItem(key), FORCE_FAIL)
      await page.getByRole('button', { name: copy.onboarding.error.retry }).click()
      check('إعادة المحاولة: شاشة الخطأ تختفي', await page.getByRole('heading', { name: copy.onboarding.error.title }).waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false))
    } catch (error) {
      check('فشل مجبَر/إعادة محاولة: اكتمل بلا استثناء', false, error.message)
    } finally {
      await ctx.close()
    }
  }

  // الاستئناف يحفظ الأسئلة الشرطية الأربعة، لا رقم الخطوة وحده.
  {
    const { ctx, page } = await freshPage(browser)
    try {
      await begin(page, copy)
      await group(page, 'history.trained_before').getByRole('button').nth(3).click()
      await group(page, 'history.total_months').getByRole('button').nth(4).click()
      await group(page, 'history.last_trained').getByRole('button').nth(2).click()
      await group(page, 'history.consistency').getByRole('button').nth(3).click()
      await page.reload({ waitUntil: 'networkidle' })
      await sleep(400)
      check('استئناف تاريخ التدريب: يبقى على الشاشة نفسها', await page.locator('#onb-title-history').isVisible())
      check('استئناف تاريخ التدريب: الأسئلة الأربعة وإجاباتها باقية',
        await page.locator('[data-question-id^="history."]').count() === 4 &&
          await page.locator('[data-question-id^="history."] button[aria-pressed="true"]').count() === 4)
    } catch (error) {
      check('استئناف تاريخ التدريب: اكتمل بلا استثناء', false, error.message)
    } finally {
      await ctx.close()
    }
  }
} catch (error) {
  check('اكتمل السيناريو بلا استثناء غير متوقّع', false, error.stack || error.message)
} finally {
  await browser?.close()
  server?.kill('SIGTERM')
}

const failed = results.filter((result) => !result.ok)
const dimensions = { goals: GOALS.length, places: PLACES.length, neat: NEAT.length }
const summary = { evidenceDir: EVIDENCE_DIR, dimensions, totalCombos: GOALS.length * PLACES.length * NEAT.length, total: results.length, passed: results.length - failed.length, failed: failed.length, results }
writeFileSync(join(EVIDENCE_DIR, 'onboarding-matrix-e2e.json'), JSON.stringify(summary, null, 2))
console.log(`\nالأدلة: ${join(EVIDENCE_DIR, 'onboarding-matrix-e2e.json')}`)
console.log(failed.length === 0 ? `\n✅ نجحت كل الفحوص — ${summary.totalCombos} توليفة هدف×مكان×حركة.` : `\n❌ فشل ${failed.length} من ${results.length} فحصًا.`)
process.exit(failed.length === 0 ? 0 : 1)
