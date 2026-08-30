/**
 * رحلة البرامج الجاهزة من Dataset B — [DATASET-B-RUNTIME].
 *
 * يثبت على **البناء الحيّ** ما لا يثبته أي برهان بنيوي: أن مستخدمًا حقيقيًّا
 * يفتح قائمة البرامج، يرى الثمانية بجدولها، يختار واحدًا، فتُحفظ الخطة كاملة
 * بمحتوى Dataset B نفسه — لا خطة مولَّدة محلّها — وتبقى بعد إعادة التحميل.
 *
 * «وجود الواجهة ليس دليلًا على عمل الميزة» (§2).
 */
import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = Number(process.env.PORT || 5419)
const URL = `http://localhost:${PORT}`
const settle = (page, ms = 700) => page.waitForTimeout(ms)

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
 * محرّر الخطة القائمة خلف استحقاق `plan.saveEdit` — بدون تفعيله يُحجب الحفظ
 * **بصمت** من ناحية الاختبار (تُفتح البوّابة بدل الكتابة)، فتبدو الخطة كأنها لم
 * تتغيّر. التفعيل هنا بنفس رمز الاختبار الذي تستعمله بقية الأطقم.
 */
async function activateGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  if (!(await gate.isVisible().catch(() => false))) return false
  await gate.locator('[data-testid="premium-gate-have-code"]').click()
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click()
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor({ timeout: 15000 })
  await gate.locator('[data-testid="premium-gate-dismiss"]').click()
  await gate.waitFor({ state: 'hidden', timeout: 10000 })
  return true
}

async function waitForServer(ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview did not start')
}

async function onboard(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true, timeout: 15000 })
  await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true, timeout: 8000 })
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

/** يفتح خطوة «جدول التمرين» داخل مركز التخصيص. يرمي إن تعذّر — لا تخطٍّ صامت. */
async function openTemplateStep(page) {
  const onStep = () => page.evaluate(() => document.body.innerText.includes('أجهزة وكيبل فقط'))
  if (await onStep()) return true
  // مدخل المحرّر «تعديل خطتي» في شاشة الإعدادات (لا في الملف الشخصي).
  await page.evaluate(() => { window.location.hash = '#/settings' })
  await settle(page, 1100)
  const opened = await tap(page, /^تعديل خطتي$/)
  await settle(page, 1800)
  // المحرّر يعرض شريط خطوات مرقّمًا — الانتقال المباشر أوثق من زرّ «التالي»
  // الذي قد يحجبه تحقّق الخطوة الحالية.
  for (let i = 0; i < 6; i += 1) {
    await tap(page, /جدول التمرين/)
    await settle(page, 900)
    if (await onStep()) return true
  }
  throw new Error(`تعذّر بلوغ خطوة «جدول التمرين» (فتح المحرّر: ${opened})`)
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 })
  // مهلة قصيرة صريحة: المهلة الافتراضية (٣٠ ثانية) داخل حلقة بحث تحوّل تعذّرًا
  // بسيطًا إلى تعليق طويل بلا مخرجات — وهو ما يجعل الفشل غامضًا بدل أن يُسمّى.
  ctx.setDefaultTimeout(3000)
  const page = await ctx.newPage()

  console.log('\n① قائمة البرامج الجاهزة كما يراها المستخدم')
  await onboard(page)
  await openTemplateStep(page)

  const cards = await page.evaluate(() => {
    const out = []
    for (const b of document.querySelectorAll('button')) {
      const t = (b.innerText || '').trim()
      if (!t.includes('أجهزة وكيبل فقط')) continue
      out.push({
        title: t.split('\n')[0],
        perWeek: /(\d|[٠-٩]+)\s*أيام\/أسبوع/.exec(t)?.[0] ?? null,
        machineLabel: t.includes('أجهزة وكيبل فقط'),
        scheduleLines: (t.match(/اليوم\s+[٠-٩\d]+\s+—/g) || []).length,
        text: t,
      })
    }
    return out
  })
  check('كل البرامج الثمانية معروضة', cards.length === 8, `المعروض: ${cards.length} — ${cards.map((c) => c.title).join(' | ')}`)
  check('كل بطاقة تحمل وسم العدّة «أجهزة وكيبل فقط»', cards.every((c) => c.machineLabel))
  check('كل بطاقة تعلن أيام/أسبوع', cards.every((c) => c.perWeek), JSON.stringify(cards.map((c) => c.perWeek)))
  check('كل بطاقة تعرض معاينة جدول من سبعة أيام', cards.every((c) => c.scheduleLines === 7), JSON.stringify(cards.map((c) => c.scheduleLines)))

  console.log('\n② اختيار «علوي/سفلي — ٤ أيام» يحفظ محتوى Dataset B نفسه')
  const picked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').includes('أجهزة وكيبل فقط') && /علوي\s*\/\s*سفلي/.test((x.innerText || '').split('\n')[0]))
    if (!b) return null
    b.click()
    return (b.innerText || '').split('\n')[0]
  })
  check('بطاقة «علوي / سفلي» قابلة للاختيار', Boolean(picked), String(picked))
  await settle(page, 1200)
  // خطة فيها محتوى ⇒ المحرّر يطلب تأكيد الاستبدال قبل تطبيق البرنامج. بلا هذا
  // التأكيد يُحفظ ما كان، فيبدو الاختيار وكأنه لم يصل — وهو ما أخفى العطل أول مرّة.
  const needsConfirm = await page.evaluate(() => document.body.innerText.includes('بنستبدل جدول التمرين الحالي'))
  if (needsConfirm) {
    const confirmed = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'تأكيد')
      if (!b) return false
      b.click()
      return true
    })
    check('تأكيد الاستبدال مضغوط', confirmed)
  }
  await settle(page, 1200)
  // المحرّر يمسك الخطة في حالته حتى يُحفظ — «حفظ مؤقت» هو الكاتب الفعلي
  // لـ`qimmah:customization:v1`. بدونه نقرأ تخزينًا لم يُكتب بعد.
  let savedDraft = await tap(page, /^حفظ مؤقت$|^تم الحفظ$/)
  await settle(page, 900)
  if (await activateGate(page)) {
    // البوّابة ظهرت ⇒ الحفظ الأول حُجب. نُفعّل ثم نحفظ فعلًا.
    await settle(page, 700)
    savedDraft = await tap(page, /^حفظ مؤقت$|^تم الحفظ$/)
  }
  check('زرّ الحفظ موجود ومضغوط', savedDraft)
  await settle(page, 1600)

  const readPlan = () => page.evaluate(() => {
    const raw = localStorage.getItem('qimmah:customization:v1')
    const c = raw ? JSON.parse(raw) : null
    const plan = c?.workoutPlan ?? c?.value?.workoutPlan ?? null
    if (!plan?.days) return null
    return { templateId: plan.templateId, days: plan.days.map((d) => ({ n: d.exercises.length, ids: d.exercises.map((e) => e.exerciseId) })) }
  })
  let plan = await readPlan()
  check('الخطة محفوظة فعلًا في التخزين', Boolean(plan), JSON.stringify(plan))
  if (plan && plan.templateId !== 'builtin-upper-lower-4') {
    const dump = await page.evaluate(() => {
      const out = []
      for (const k of Object.keys(localStorage)) {
        let v
        try { v = JSON.parse(localStorage.getItem(k) || 'null') } catch { continue }
        const find = (o, path) => {
          if (!o || typeof o !== 'object') return
          if (Array.isArray(o.days) && o.templateId) out.push({ key: k, path, templateId: o.templateId, counts: o.days.map((d) => (d.exercises || []).length) })
          for (const [kk, vv] of Object.entries(o)) if (vv && typeof vv === 'object' && path.split('.').length < 4) find(vv, path + '.' + kk)
        }
        find(v, '')
      }
      return out
    })
    console.log('      ↳ كل مواضع الخطة في التخزين: ' + JSON.stringify(dump))
  }
  if (plan) {
    check('معرّف البرنامج المحفوظ هو البرنامج الجاهز', plan.templateId === 'builtin-upper-lower-4', String(plan.templateId))
    check('الخطة أربعة أيام', plan.days.length === 4, String(plan.days.length))
    check('أعداد التمارين ٩ · ٦ · ٩ · ٦ كما في Dataset B', JSON.stringify(plan.days.map((d) => d.n)) === JSON.stringify([9, 6, 9, 6]), JSON.stringify(plan.days.map((d) => d.n)))
    check('لا يوم واحدَ التمرين (لا انهيار إلى ١ من ١)', plan.days.every((d) => d.n > 1))
    const upperA = plan.days[0]?.ids ?? []
    check('اليوم العلوي أ يبدأ بضغط الصدر العلوي (ترتيب Q19 محفوظ)', upperA[0] === 'incline-chest-press-machine', upperA.join(' → '))
    check('اليوم العلوي أ يحمل كيبل الترايسبس المعتمد', upperA.includes('cable-triceps-pushdown'), upperA.join(' → '))
    check('لا وزن حرّ في أي يوم', plan.days.every((d) => d.ids.every((id) => !/dumbbell|barbell|kettlebell|push-up/.test(id))))
  }

  console.log('\n③ إعادة التحميل تُبقي الخطة كاملة')
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 1600)
  const after = await readPlan()
  check('الخطة باقية بعد إعادة التحميل', Boolean(after))
  // الفحصان التاليان يشترطان وجود الخطتين فعلًا: مقارنة undefined بـundefined
  // كانت ستمرّ على بيانات غائبة — وهو مرور غير مستحقّ (§4.2).
  check('نفس عدد الأيام ونفس أعداد التمارين',
    Boolean(after && plan) && JSON.stringify(after.days.map((d) => d.n)) === JSON.stringify(plan.days.map((d) => d.n)),
    JSON.stringify(after?.days.map((d) => d.n)))
  check('نفس التمارين بنفس الترتيب',
    Boolean(after && plan) && JSON.stringify(after.days.map((d) => d.ids)) === JSON.stringify(plan.days.map((d) => d.ids)))

  console.log('\n④ البرامج الأخرى — فحص سريع لثلاثة')
  for (const [needle, label, expected] of [
    [/جسم كامل/, 'جسم كامل — ٣ أيام', [7, 7, 7]],
    [/دفع\s*\/\s*سحب\s*\/\s*أرجل/, 'دفع/سحب/أرجل — ٦ أيام', [6, 6, 6, 6, 6, 6]],
    [/أجهزة للمبتدئ/, 'أجهزة للمبتدئ — ٣ أيام', [6, 6, 6]],
  ]) {
    await openTemplateStep(page).catch(() => {})
    const ok = await page.evaluate((src) => {
      const re = new RegExp(src)
      const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').includes('أجهزة وكيبل فقط') && re.test((x.innerText || '').split('\n')[0]))
      if (!b) return false
      b.click()
      return true
    }, needle.source)
    check(`${label}: البطاقة موجودة وقابلة للاختيار`, ok)
    await settle(page, 1000)
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'تأكيد')
      if (b) b.click()
    })
    await settle(page, 900)
    await tap(page, /^حفظ مؤقت$|^تم الحفظ$/)
    await settle(page, 800)
    if (await activateGate(page)) { await settle(page, 600); await tap(page, /^حفظ مؤقت$|^تم الحفظ$/) }
    await settle(page, 1400)
    const p = await readPlan()
    check(`${label}: يُحفظ بأعداد ${expected.join('·')}`, JSON.stringify(p?.days.map((d) => d.n)) === JSON.stringify(expected), JSON.stringify(p?.days.map((d) => d.n)))
  }

  await ctx.close()
} catch (err) {
  fail += 1
  console.log(`\n✗ استثناء أثناء الرحلة: ${err?.message || err}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  preview.kill('SIGTERM')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} رحلة برامج Dataset B: ${pass} فحصًا، ${fail} فشل.`)
process.exit(fail === 0 ? 0 : 1)
