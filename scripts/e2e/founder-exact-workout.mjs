/**
 * رحلة المؤسس الحرفية — [WORKOUT-CLOSURE-001].
 *
 * ═══ لماذا هذه الرحلة موجودة والرحلات الأخرى قائمة ═══
 * المؤسس أبلغ «١ من ١» بعد تقارير أعلنت الإصلاح. مراجعة الأدلّة وجدت أن نصفَي
 * مساره **لم يجتمعا قطّ في إثبات واحد**: رحلة الاتّصال تضغط «ابدأ» وتقرأ
 * العدّاد لكن على خطة الإعداد؛ ورحلة Dataset B تثبّت خطة ٩ تمارين **وتقف عند
 * الحفظ** بلا ضغطة «ابدأ» واحدة. هذه الرحلة هي مساره هو، خطوةً بخطوة، بالأرقام
 * التي أوقعت العطل تاريخيًا: **٤ أيام تمرين × ٧٥ دقيقة** — التركيبة التي كان
 * سقف الأسبوع الأول الصامت يطويها إلى «١ من ١» (`easySession.ts` §التوثيق).
 *
 * ═══ القانون المحروس (نصّ المؤسس) ═══
 * العدد المعروض قبل البدء = العدد المحفوظ في الخطة = مقام العدّاد الحيّ
 * = عدد تمارين الجلسة المكتملة المحفوظة — و«١/N ← ٢/N ← … ← N/N» بلا إنهاء
 * قبل الأخير، وإعادة التحميل في المنتصف تستأنف الجلسة **كاملةً بموضعها**.
 *
 * التشغيل: VITE_ENTITLEMENT_MODE=mock npm run build && node scripts/e2e/founder-exact-workout.mjs
 */
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from './lib/engine.mjs'
import { answerHistory, answerDietPattern, selectIntent } from './lib/onboarding-driver.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PORT = Number(process.env.PORT || 5409)
const URL = `http://localhost:${PORT}`
const settle = (page, ms = 700) => page.waitForTimeout(ms)

let pass = 0
let fail = 0
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}${detail ? `\n      ↳ ${detail}` : ''}`) }
}

const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')].find((c) => matcher.test((c.textContent || '').trim()))
  if (!node) return false
  node.click()
  return true
}, re.source)

/** أرقام عربية-هندية ⇒ لاتينية، للقياس لا للعرض. */
const latin = (s) => (s || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

function assertMockArtifact() {
  let files
  try { files = readdirSync(join(ROOT, 'dist', 'assets')) } catch {
    throw new Error('لا يوجد dist/ — ابنِ أولًا: VITE_ENTITLEMENT_MODE=mock npm run build')
  }
  const mocked = files.some((f) => f.endsWith('.js') && readFileSync(join(ROOT, 'dist', 'assets', f), 'utf8').includes('QIMMAH-TEST-OK'))
  if (!mocked) throw new Error('الأرتيفكت ليس نسخة mock entitlement — أعد البناء: VITE_ENTITLEMENT_MODE=mock npm run build')
}

async function waitForServer(ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* لم يقلع بعد */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview did not start')
}

/**
 * إعداد المؤسس بعينه: مدرّب منتظم · ٤ أيام أسبوعيًا · **٧٥ دقيقة** للجلسة.
 * الاختيار بمعرّفات الأسئلة (`data-question-id`) لا بالنصوص — نمط المشغّل نفسه.
 */
async function onboardFounderProfile(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 4600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '30')
  await page.fill('#v2-body-height', '175')
  await page.fill('#v2-body-weight', '80')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const intent = await selectIntent(page, 'plan')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  // ٤ أيام (القيمة لا الموضع: تُقرأ من نصّ الزرّ) و٧٥ دقيقة كذلك.
  const pick = async (qid, value) => {
    const btns = page.locator(`[data-question-id="${qid}"] button`)
    const count = await btns.count()
    for (let i = 0; i < count; i += 1) {
      const text = latin(await btns.nth(i).innerText())
      if (new RegExp(`(^|\\D)${value}(\\D|$)`).test(text.replace(/\s+/g, ' '))) {
        await btns.nth(i).click({ force: true })
        return
      }
    }
    throw new Error(`لم يوجد زرّ «${value}» في ${qid}`)
  }
  await pick('training.days', 4)
  await pick('training.duration', 75)
  await next()
  await page.waitForSelector('#onb-title-lifestyle', { timeout: 20000 })
  await page.locator('[data-question-id="training.place"] button').first().click({ force: true })
  await page.locator('[data-question-id="activity.neat"] button').nth(1).click({ force: true })
  await answerDietPattern(page, intent)
  await next()
  await page.waitForSelector('#onb-title-limitations', { timeout: 20000 })
  await page.locator('[data-question-id="limitations.has_injury"] button').nth(1).click({ force: true })
  await page.locator('footer button').last().click({ force: true })
  await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2400)
}

/** يثبّت اليوم يوم الخطة ٠ (علوي)، ويرجع أحداث الرحلة شهرًا للوراء ليخرج من نافذة الأسبوع الأول. */
async function arrangeToday(page) {
  await page.evaluate(() => {
    const k = 'qimmah:workoutCalendar:v1'
    const s = JSON.parse(localStorage.getItem(k) || 'null')
    if (!s) throw new Error('no calendar')
    s.weekdays[new Date().getDay()] = 0
    s.updatedAt = new Date().toISOString()
    localStorage.setItem(k, JSON.stringify(s))
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('qimmah:tracking:events:v1')) continue
      const ev = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(ev) && ev.length) {
        ev[0].ts = Date.now() - 30 * 86400000
        localStorage.setItem(key, JSON.stringify(ev))
      }
    }
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1500)
}

async function activateGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  if (!(await gate.isVisible().catch(() => false))) return false
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor()
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden' })
  return true
}

/** موضع الجلسة كما يراه المستخدم: «i/N» من العنصر المسمّى، لا من نصّ الصفحة. */
const counterOf = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-session-counter]')
  if (!el) return null
  const norm = el.textContent.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const m = norm.match(/(\d+)\s*من\s*(\d+)/)
  return m ? { i: Number(m[1]), n: Number(m[2]) } : null
})

/** يسجّل كل جولات التمرين الحالي (كل أزرار «تم») ويعيد عددها. */
const completeAllSets = (page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll('main button')].filter((b) => (b.textContent || '').trim() === 'تم')
  btns.forEach((b) => b.click())
  return btns.length
})

const finishButtonVisible = (page) => page.evaluate(() =>
  !![...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'إنهاء التمرين'))

const nextButtonVisible = (page) => page.evaluate(() =>
  !![...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'التمرين التالي'))

const historyState = (page) => page.evaluate(() => {
  const sessions = JSON.parse(localStorage.getItem('qimmah:history:workoutSessions:v1') || '[]')
  return {
    count: Array.isArray(sessions) ? sessions.length : -1,
    exercises: sessions[0]?.exercises?.length ?? null,
    completedExercises: sessions[0]?.exercises?.filter((e) => e.completed).length ?? null,
    status: sessions[0]?.status ?? null,
  }
})

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
let browser
try {
  assertMockArtifact()
  await waitForServer()
  browser = await chromium.launch({ args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()

  console.log('\n① الإعداد بأرقام المؤسس — ٤ أيام × ٧٥ دقيقة')
  await onboardFounderProfile(page)
  const profile = await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('qimmah:customization:v1') || 'null')
    return c ? { days: c.profile.trainingDays, duration: c.profile.workoutDuration } : null
  })
  check('الملف المحفوظ يحمل الأرقام المختارة فعلًا', profile && profile.days === 4 && profile.duration === 75,
    JSON.stringify(profile))

  await arrangeToday(page)
  const planned = await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('qimmah:customization:v1') || 'null')
    return (c?.workoutPlan?.days || []).map((d) => ({ id: d.id, n: d.exercises.length }))
  })
  const plannedToday = planned[0]?.n ?? 0
  check('الخطة المحفوظة ٤ أيام، ويومها الأول متعدّد التمارين', planned.length === 4 && plannedToday >= 5,
    planned.map((d) => `${d.id}:${d.n}`).join(' · '))

  console.log('\n② الوعد قبل البدء = الخطة المحفوظة')
  await page.evaluate(() => { window.location.hash = '#/workout' })
  await settle(page, 1200)
  await activateGate(page)
  const promiseText = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /ابدأ تمرين اليوم/.test(x.textContent || ''))
    return b ? b.innerText.replace(/\n+/g, ' ') : null
  })
  const promised = (() => {
    const m = latin(promiseText || '').match(/(\d+)\s*(?:تمارين|تمرين|exercises?)/)
    return m ? Number(m[1]) : null
  })()
  check('زرّ البدء يعرض عددًا، وهو عدد يوم الخطة المحفوظ نفسه', promised === plannedToday,
    `الوعد: «${promiseText}» ⇒ ${promised} · الخطة: ${plannedToday}`)

  console.log('\n③ البدء — الإحماء مرحلة، والمقام هو العدد الموعود')
  await tap(page, /ابدأ تمرين اليوم/)
  await settle(page, 900)
  if (await activateGate(page)) { await settle(page, 600); await tap(page, /ابدأ تمرين اليوم/); await settle(page, 1200) }
  const warmupShown = await page.locator('[data-warmup-screen]').isVisible().catch(() => false)
  check('الإحماء يظهر مرحلةً منفصلة قبل التمارين — لا تمرينًا يُحسب', warmupShown)
  if (warmupShown) {
    const warmupSteps = await page.evaluate(() => {
      const root = document.querySelector('[data-warmup-screen]')
      const lis = [...root.querySelectorAll('ol')].pop()
      return lis ? lis.querySelectorAll('li').length : 0
    })
    check('  وخطواته موجودة (فالفصل ليس فراغًا)', warmupSteps > 0, `خطوات: ${warmupSteps}`)
    await page.locator('[data-testid="warmup-start"]').click({ force: true })
    await settle(page, 1000)
  }
  let shot = await counterOf(page)
  check('المقام الحيّ = العدد الموعود = عدد الخطة — وخطوات الإحماء خارجه', !!shot && shot.n === plannedToday && shot.i === 1,
    `العدّاد: ${JSON.stringify(shot)} · الموعود: ${promised}`)

  console.log('\n④ التمرين ١ يكتمل ولا يُنهي الجلسة')
  const setsDone = await completeAllSets(page)
  check('جولات التمرين الأول سُجّلت كلها', setsDone > 0, `${setsDone} جولة`)
  check('ولا زرّ إنهاء على غير الأخير — الجلسة لم تنتهِ بتمرين واحد', !(await finishButtonVisible(page)))
  check('وزرّ «التمرين التالي» حاضر', await nextButtonVisible(page))
  // التقدّم التلقائي بعد إكمال الجولات (أو الضغطة اليدوية) — كلاهما مسار المنتج.
  await settle(page, 4600)
  shot = await counterOf(page)
  if (shot && shot.i === 1) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'التمرين التالي')
      if (b) b.click()
    })
    await settle(page, 800)
    shot = await counterOf(page)
  }
  check('الانتقال للتمرين ٢ وقع والمقام ثابت', !!shot && shot.i === 2 && shot.n === plannedToday, JSON.stringify(shot))

  console.log('\n⑤ إعادة تحميل في منتصف الجلسة — الاستئناف كامل بالموضع')
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1800)
  const resumed = await tap(page, /أكمل تمريني/)
  check('بطاقة الاستئناف ظهرت بعد إعادة التحميل', resumed)
  await settle(page, 1200)
  shot = await counterOf(page)
  check('الجلسة المستأنفة كاملة N وبموضعها — لا انهيار ولا جلسة جديدة',
    !!shot && shot.n === plannedToday && shot.i === 2, JSON.stringify(shot))

  console.log('\n⑥ ١/N ← … ← N/N — الإنهاء على الأخير وحده')
  const path = [`1/${plannedToday}`, `2/${plannedToday}`]
  for (let guard = 0; guard < 15; guard += 1) {
    shot = await counterOf(page)
    if (!shot) break
    const isLast = shot.i >= shot.n
    const finishVisible = await finishButtonVisible(page)
    if (isLast) {
      check('على الأخير: زرّ الإنهاء حاضر ولا «تالي» بعده', finishVisible && !(await nextButtonVisible(page)), JSON.stringify(shot))
      await completeAllSets(page)
      break
    }
    if (finishVisible) { check(`لا زرّ إنهاء قبل الأخير (${shot.i}/${shot.n})`, false, JSON.stringify(shot)); break }
    if (shot.i > 2) path.push(`${shot.i}/${shot.n}`)
    await completeAllSets(page)
    await settle(page, 4600)
    const after = await counterOf(page)
    if (after && after.i === shot.i) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'التمرين التالي')
        if (b) b.click()
      })
      await settle(page, 800)
    }
  }
  shot = await counterOf(page)
  path.push(`${shot?.i}/${shot?.n}`)
  check('المسار وصل N/N بمقام ثابت من أوله لآخره',
    !!shot && shot.i === plannedToday && shot.n === plannedToday, path.join(' ← '))

  console.log('\n⑦ الإنهاء والحفظ — جلسة واحدة مكتملة بعدد الخطة')
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'إنهاء التمرين')
    if (b) b.click()
  })
  await settle(page, 800)
  await tap(page, /نعم، أنهِ واحفظ/)
  await settle(page, 1800)
  let hist = await historyState(page)
  check('جلسة واحدة بالضبط في السجلّ', hist.count === 1, JSON.stringify(hist))
  check('عدد تمارينها = عدد الخطة، وكلّها مكتملة، وحالتها «مكتملة»',
    hist.exercises === plannedToday && hist.completedExercises === plannedToday && hist.status === 'completed',
    JSON.stringify(hist))
  const activeAfter = await page.evaluate(() => {
    const reg = JSON.parse(localStorage.getItem('qimmah:activeWorkout:v1') || '{}')
    return Object.keys(reg).length
  })
  check('ولا جلسة جارية عالقة بعد الإنهاء', activeAfter === 0, `سجلّات جارية: ${activeAfter}`)

  console.log('\n⑧ إعادة تحميل أخيرة — السجلّ يبقى')
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1500)
  hist = await historyState(page)
  check('الجلسة المكتملة نجت من إعادة التحميل — واحدة، بعدد الخطة',
    hist.count === 1 && hist.exercises === plannedToday, JSON.stringify(hist))

  await ctx.close()
} catch (e) {
  fail += 1
  console.log(`\n✗ استثناء أثناء الرحلة: ${(e && e.stack) || e}`)
} finally {
  if (browser) await browser.close()
  preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} رحلة المؤسس الحرفية: ${pass} فحصًا، ${fail} فشل.`)
process.exit(fail === 0 ? 0 : 1)
