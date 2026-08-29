/**
 * رحلة اتّصال الجلسة — [WORKOUT-CONTINUITY-001].
 *
 * يقود **جلسة كاملة متعدّدة التمارين** على البناء الحيّ (mock entitlement) ويؤكّد
 * أن المستخدم يعرف موضعه في **كل** شاشة: إحماء ← تمرين i من N ← جولات ← التالي
 * ← الإنهاء. الحارس البنيوي (`scripts/run-workout-continuity-proof.mjs`) يحرس
 * الكود؛ هذا يحرس **ما يصل المستخدم فعلًا** — و«وجود الواجهة ليس دليلًا على عمل
 * الميزة» (§2).
 *
 * ويُقاس هنا ما لا يُقاس بنيويًّا: موضع التمرير بعد كل انتقال، وعدد إعادات تركيب
 * حاوية الجلسة، وزمن «التمرين التالي» حتى التفاعل.
 */
import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = Number(process.env.PORT || 5407)
const URL = `http://localhost:${PORT}`
const settle = (page, ms = 700) => page.waitForTimeout(ms)
/** الأرقام تُعرض عربية-هندية في الواجهة العربية — الوعد يُقارن بصيغته المعروضة. */
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

let pass = 0
let fail = 0
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}${detail ? `\n      ↳ ${detail}` : ''}`) }
}

const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source)
  const node = [...document.querySelectorAll('button,a')].find((c) => matcher.test((c.textContent || '').trim()))
  if (!node) return false
  node.click()
  return true
}, re.source)

/**
 * الرحلة تحتاج أرتيفكت **mock entitlement** — بدونه لا يُفعَّل كود التجربة فلا
 * تُفتح جلسة أصلًا، فيسقط الطقم بصفر فحوص وسببٍ غامض. تُقال الحاجة صراحةً هنا
 * بدل أن تُكتشف من عدّاد صفري: `VITE_ENTITLEMENT_MODE=mock npm run build`.
 */
async function assertMockArtifact() {
  const { readdirSync, readFileSync } = await import('node:fs')
  const { dirname, resolve, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  // ملاحظة: `URL` مُظلَّل في هذا الملف بثابت عنوان المعاينة أعلاه — فالمسارات
  // تُحلّ عبر `node:path` لا عبر `new URL(...)`.
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'assets')
  let files
  try { files = readdirSync(dir) } catch {
    throw new Error('لا يوجد dist/ — ابنِ أولًا: VITE_ENTITLEMENT_MODE=mock npm run build')
  }
  const mocked = files.some((f) => f.endsWith('.js') && readFileSync(join(dir, f), 'utf8').includes('QIMMAH-TEST-OK'))
  if (!mocked) {
    throw new Error(
      'الأرتيفكت المبني ليس نسخة mock entitlement (لا أثر لكود التجربة فيه).\n' +
      '      أعد البناء: VITE_ENTITLEMENT_MODE=mock npm run build',
    )
  }
}

async function waitForServer(ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview did not start')
}

const INSTRUMENT = () => {
  window.__C = { roots: 0, rootSeen: null }
  const probe = () => {
    const el = document.querySelector('div.fixed.inset-0.z-50')
    if (el && el !== window.__C.rootSeen) { window.__C.rootSeen = el; window.__C.roots += 1 }
  }
  new MutationObserver(probe).observe(document.body, { childList: true, subtree: true })
  probe()
}

async function onboard(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const intent = await selectIntent(page, 'meals')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent })
  await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2400)
}

/** يجعل اليوم يوم تدريب. `backdate` يتخطّى سقف الأسبوع الأول فتُسلَّم الجلسة كاملة. */
async function arrangeToday(page, { backdate }) {
  await page.evaluate((backdate) => {
    const k = 'qimmah:workoutCalendar:v1'
    const s = JSON.parse(localStorage.getItem(k) || 'null')
    if (!s) throw new Error('no calendar')
    s.weekdays[new Date().getDay()] = 0
    s.updatedAt = new Date().toISOString()
    localStorage.setItem(k, JSON.stringify(s))
    if (!backdate) return
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('qimmah:tracking:events:v1')) continue
      const ev = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(ev) && ev.length) {
        ev[0].ts = Date.now() - 30 * 86400000
        localStorage.setItem(key, JSON.stringify(ev))
      }
    }
  }, backdate)
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

/** لقطة الموضع كما يراها المستخدم على هذه الشاشة. */
const snapshot = (page) => page.evaluate(() => {
  // العدّاد يُقرأ من عنصره المسمّى لا بمطابقة نصّ الصفحة: تنويه الاقتطاع يحمل
  // «من» ورقمين كذلك، فالمطابقة العامّة تلتقط أيهما جاء أولًا وتكذب بصمت.
  const counter = document.querySelector('[data-session-counter]')
  const norm = (counter ? counter.textContent : '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const m = norm.match(/(\d+)\s*من\s*(\d+)/)
  const rail = document.querySelector('[data-session-rail]')
  const main = document.querySelector('main.container-page')
  const current = rail ? rail.querySelector('[aria-current="step"]') : null
  return {
    railStage: rail ? rail.getAttribute('data-session-rail') : null,
    railLabels: rail ? [...rail.querySelectorAll('span[data-stage]')].map((n) => n.textContent.trim()) : null,
    railCurrent: current ? current.textContent.trim() : null,
    ofIndicator: m ? `${m[1]}/${m[2]}` : null,
    scrollTop: main ? Math.round(main.scrollTop) : null,
    trimmedNotice: (() => {
      const n = document.querySelector('[data-session-trimmed]')
      return n ? { reason: n.getAttribute('data-session-trimmed'), text: n.innerText.replace(/\n+/g, ' ') } : null
    })(),
  }
})

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
let browser
try {
  await assertMockArtifact()
  await waitForServer()
  browser = await chromium.launch({ args: ['--no-sandbox'] })

  // ══════════════════════════════════════════════════════════════════════════
  // ① الجلسة الكاملة — المؤشّر حاضر على كل شاشة، والتمرير يبدأ من أعلى كل تمرين
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n① جلسة كاملة متعدّدة التمارين — «وين أنا؟» لها جواب في كل شاشة')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await onboard(page)
    await arrangeToday(page, { backdate: true })
    await page.addInitScript(INSTRUMENT)
    await page.reload({ waitUntil: 'networkidle' })
    await settle(page, 1200)
    await page.evaluate(INSTRUMENT)
    await page.evaluate(() => { window.location.hash = '#/workout' })
    await settle(page, 1200)
    await activateGate(page)
    await tap(page, /ابدأ تمرين اليوم/)
    await settle(page, 900)
    if (await activateGate(page)) { await settle(page, 600); await tap(page, /ابدأ تمرين اليوم/); await settle(page, 1200) }

    // — شاشة الإحماء —
    const warmVisible = await page.locator('[data-warmup-screen]').isVisible().catch(() => false)
    check('شاشة الإحماء ظهرت كمرحلة أولى', warmVisible)
    const warm = await snapshot(page)
    check('المؤشّر حاضر على شاشة الإحماء وعلامته «إحماء»', warm.railStage === 'warmup' && warm.railCurrent === 'إحماء',
      JSON.stringify(warm))
    check('المؤشّر يعرض المراحل الثلاث كاملة', Array.isArray(warm.railLabels) && warm.railLabels.length === 3,
      JSON.stringify(warm.railLabels))

    const warmGuide = await page.evaluate(() => {
      const root = document.querySelector('[data-warmup-screen]')
      const lis = [...root.querySelectorAll('ol')].pop()
      const items = lis ? [...lis.querySelectorAll('li')] : []
      return {
        steps: items.length,
        stepsWithCue: items.filter((li) => li.querySelectorAll('[data-warmup-cue]').length > 0).length,
        emptyCues: items.filter((li) => [...li.querySelectorAll('[data-warmup-cue]')].some((c) => !c.textContent.trim())).length,
        nextLine: (document.querySelector('[data-warmup-next]') || {}).innerText || null,
      }
    })
    check('كل خطوة إحماء تحمل تعليمة غير فارغة',
      warmGuide.steps > 0 && warmGuide.stepsWithCue === warmGuide.steps && warmGuide.emptyCues === 0,
      JSON.stringify(warmGuide))
    check('شاشة الإحماء تقول ماذا ينتظر بعدها', !!warmGuide.nextLine && /تمارين|تمرين/.test(warmGuide.nextLine),
      String(warmGuide.nextLine))

    await page.locator('[data-testid="warmup-start"]').click({ force: true })
    await settle(page, 1000)

    // — التمارين، واحدًا واحدًا —
    const seen = []
    const scrolls = []
    for (let i = 0; i < 12; i += 1) {
      const shot = await snapshot(page)
      seen.push(shot)
      check(`تمرين ${i + 1}: المؤشّر حاضر وعلامته «التمارين»`,
        shot.railStage === 'exercises' && shot.railCurrent === 'التمارين', JSON.stringify(shot))
      check(`تمرين ${i + 1}: عدّاد «i من N» حاضر`, !!shot.ofIndicator, JSON.stringify(shot))

      // مستخدم حقيقي: يسجّل جولة ثم ينزل لأسفل الصفحة قبل أن يضغط «التالي».
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('main button')].find((x) => /^(سجّل|تم)$/.test((x.textContent || '').trim()))
        if (b) b.click()
        const m = document.querySelector('main.container-page')
        if (m) m.scrollTop = m.scrollHeight
      })
      await settle(page, 400)

      const hasNext = await page.evaluate(() => !![...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'التمرين التالي'))
      if (!hasNext) break
      const before = await page.evaluate(() => Math.round(document.querySelector('main.container-page').scrollTop))
      const t = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'التمرين التالي')
        const t0 = performance.now()
        btn.click()
        return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const idle = (cb) => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1000 }) : setTimeout(cb, 0))
          idle(() => res({
            interactiveMs: Math.round((performance.now() - t0) * 10) / 10,
            scrollTop: Math.round(document.querySelector('main.container-page').scrollTop),
          }))
        })))
      })
      scrolls.push({ before, after: t.scrollTop, ms: t.interactiveMs })
      await settle(page, 400)
    }

    check('الجلسة فعلًا متعدّدة التمارين (لا تمرين واحد يتيم)', seen.length >= 2, `عدد الشاشات: ${seen.length}`)
    check('العدّاد يتقدّم تمرينًا بتمرين',
      seen.every((s, i) => s.ofIndicator && s.ofIndicator.startsWith(`${i + 1}/`)),
      seen.map((s) => s.ofIndicator).join(' · '))
    check('كل انتقال يبدأ من أعلى التمرين الجديد لا من منتصفه',
      scrolls.length > 0 && scrolls.every((s) => s.after === 0),
      scrolls.map((s) => `${s.before}→${s.after}`).join(' · '))
    check('كل انتقال نزل من موضع تمرير غير صفري (فالفحص أعلاه ليس فراغًا)',
      scrolls.every((s) => s.before > 0),
      scrolls.map((s) => s.before).join(' · '))

    // — نافذة الإنهاء —
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'إنهاء التمرين')
      if (b) b.click()
    })
    await settle(page, 700)
    const fin = await snapshot(page)
    check('نافذة الإنهاء تقدّم المؤشّر للمرحلة الثالثة',
      fin.railStage === 'finish' && fin.railCurrent === 'الإنهاء', JSON.stringify(fin))

    const roots = await page.evaluate(() => window.__C.roots)
    check('حاوية الجلسة رُكّبت مرّة واحدة للجلسة كلّها (لا إعادة تركيب لكل تمرين)',
      roots === 1, `مرّات التركيب: ${roots}`)
    console.log(`  · زمن «التمرين التالي» حتى التفاعل: ${scrolls.map((s) => `${s.ms}ms`).join(' · ')}`)
    await ctx.close()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ② الجلسة المقتطَعة — لا تُسلَّم مبتورة بلا خبر
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n② الأسبوع الأول — الجلسة كاملة، والتخفيف اختيار لا اقتطاع صامت')
  //
  // كان هذا القسم يؤكّد **اقتطاعًا تلقائيًا** في الأسبوع الأول مع تنويهه
  // ([WORKOUT-CONTINUITY-001]). ثم رُفع ذلك السقف بأمر المؤسس [FOUNDER-QA-001]
  // لأنه هو نفسه مصدر عطل «١ من ١»: كان يقتطع بنسبة السقف÷المدّة حتى ينهار يوم
  // كامل إلى تمرين واحد. و`TrimmedInfo.reason` فقد قيمة `'firstWeek'` من نوعه.
  //
  // فالقسم لم يُحذف بل **قُلب إلى حارس للقاعدة الجديدة**: لا اقتطاع بلا طلب،
  // والوعد من رقم التسليم نفسه. ومسار التنويه يبقى محروسًا كما كان — لكن عبر
  // مُشغّله الحقيقي (اختيار المستخدم) لا عبر وضعٍ لم يعد موجودًا.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await onboard(page)
    await arrangeToday(page, { backdate: false })
    await page.evaluate(() => { window.location.hash = '#/workout' })
    await settle(page, 1200)
    await activateGate(page)

    const planned = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('qimmah:customization:v1') || 'null')
      return (c?.workoutPlan?.days || []).map((d) => d.exercises.length)
    })
    const promise = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /ابدأ تمرين اليوم/.test(x.textContent || ''))
      return b ? b.innerText.replace(/\n+/g, ' ') : null
    })

    await tap(page, /ابدأ تمرين اليوم/)
    await settle(page, 900)
    if (await activateGate(page)) { await settle(page, 600); await tap(page, /ابدأ تمرين اليوم/); await settle(page, 1200) }
    const warmSeen = await page.locator('[data-warmup-screen]').isVisible().catch(() => false)
    if (warmSeen) { await page.locator('[data-testid="warmup-start"]').click({ force: true }); await settle(page, 1000) }

    const shot = await snapshot(page)
    const deliveredFull = shot.ofIndicator ? Number(shot.ofIndicator.split('/')[1]) : null
    const dayCount = Math.max(...planned)
    check('الأسبوع الأول لا يقتطع الجلسة بلا طلب (حارس عطل «١ من ١»)',
      deliveredFull !== null && deliveredFull === dayCount,
      `${shot.ofIndicator} مقابل يوم الخطة ${dayCount} · الخطة ${planned.join(',')}`)
    check('وعد الزرّ هو رقم التسليم نفسه — لا رقمان',
      !!promise && !!deliveredFull && new RegExp(`(^|[^٠-٩\\d])${toArabicDigits(deliveredFull)}([^٠-٩\\d]|$)`).test(promise),
      `${promise} · سُلّم ${deliveredFull}`)
    check('لا تنويه اقتطاع حين لا اقتطاع (نصّ لا يَعِد بوضعٍ غير قائم)',
      !shot.trimmedNotice, JSON.stringify(shot.trimmedNotice))
    check('والمؤشّر حاضر هنا أيضًا', shot.railStage === 'exercises', JSON.stringify(shot))
    await ctx.close()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ③ التخفيف باختيار المستخدم — يقصّر فعلًا، ويقول كم سُلّم من كم
  // ══════════════════════════════════════════════════════════════════════════
  // التأكيد المضادّ للقسم ② : لولا هذا لكان «لا تنويه» يمرّ لأن التنويه مات لا
  // لأن الاقتطاع لم يُطلَب. هنا يُطلب الاقتطاع صراحةً فيجب أن يظهر الاثنان معًا.
  console.log('\n③ النسخة الأخفّ باختيار المستخدم — تقصر فعلًا والتنويه يسمّي سببه')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await onboard(page)
    await arrangeToday(page, { backdate: false })
    // نفس الحالة التي يكتبها زرّ «ابدأ بنسخة أخفّ» (`enableEasyToday`): ختم اليوم
    // تحت مفتاح المالك. تُكتب هنا مباشرةً لأن الزرّ يعيش في بطاقة عودة قد لا
    // تُعرض في كل جلسة — والمقصود فحص سلوك وقت التشغيل بعد الاختيار لا مكان الزرّ.
    await page.evaluate(() => {
      const d = new Date()
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      for (const owner of ['guest', ...Object.keys(localStorage).map((k) => k.split(':').pop())]) {
        if (owner) localStorage.setItem(`qimmah:easySession:v1:${owner}`, JSON.stringify({ date: stamp }))
      }
    })
    await page.reload({ waitUntil: 'networkidle' })
    await settle(page, 1400)
    await page.evaluate(() => { window.location.hash = '#/workout' })
    await settle(page, 1200)
    await activateGate(page)

    const planned = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('qimmah:customization:v1') || 'null')
      return (c?.workoutPlan?.days || []).map((d) => d.exercises.length)
    })
    await tap(page, /ابدأ تمرين اليوم/)
    await settle(page, 900)
    if (await activateGate(page)) { await settle(page, 600); await tap(page, /ابدأ تمرين اليوم/); await settle(page, 1200) }
    const warmSeen = await page.locator('[data-warmup-screen]').isVisible().catch(() => false)
    if (warmSeen) { await page.locator('[data-testid="warmup-start"]').click({ force: true }); await settle(page, 1000) }

    const shot = await snapshot(page)
    const delivered = shot.ofIndicator ? Number(shot.ofIndicator.split('/')[1]) : null
    const dayCount = Math.max(...planned)
    // الأرضية `EASY_MIN_EXERCISES` تمنع الهبوط إلى تمرين واحد — تُفحص صراحةً.
    check('النسخة الأخفّ أقصر من يوم الخطة فعلًا', delivered !== null && delivered < dayCount,
      `${shot.ofIndicator} مقابل يوم الخطة ${dayCount}`)
    check('ولا تنهار إلى تمرين واحد (أرضية «أخفّ»)', delivered !== null && delivered >= Math.min(3, dayCount),
      String(delivered))
    check('التنويه حاضر وسببه اختيار المستخدم',
      !!shot.trimmedNotice && shot.trimmedNotice.reason === 'easy', JSON.stringify(shot.trimmedNotice))
    check('ونصّه يذكر كم سُلّم من كم — لا عبارة عامّة',
      !!shot.trimmedNotice && /من/.test(shot.trimmedNotice.text) && /[٠-٩\d]/.test(shot.trimmedNotice.text),
      shot.trimmedNotice ? shot.trimmedNotice.text : 'لا تنويه')
    await ctx.close()
  }
} catch (e) {
  fail += 1
  console.log(`\n✗ استثناء أثناء الرحلة: ${(e && e.stack) || e}`)
} finally {
  if (browser) await browser.close()
  preview.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} رحلة اتّصال الجلسة: ${pass} فحصًا، ${fail} فشل.`)
process.exit(fail === 0 ? 0 : 1)
