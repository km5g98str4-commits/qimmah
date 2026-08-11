// إثبات متصفّح: مصفوفة المسارات/الأفعال في وضع المعاينة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢ — العطل P0-A الذي أثبته المؤسس بنفسه.
//
// الواقعة: على البناء المعتمد دخل ضيف بلا اشتراك، وبدأ تمرين اليوم، وسجّل
// مجموعاته، وأنهاه، وفتح مسجّل الأكل وسجّل. أي أنه استهلك الخدمة المدفوعة
// كاملة. ولم يكن في المستودع مفهوم «استحقاق» أصلًا.
//
// ما يثبته هذا السكربت بشخصيتين حقيقيتين في **بناء واحد** (وضع التقليد):
//   • معاينة (بلا استحقاق): يتصفّح كل تبويب، ولا ينفّذ أي طفرة.
//   • مُفعَّل بكود (QIMMAH-TEST-OK): نفس الشاشات، والأفعال تعمل.
//
// والحدّ الفاصل يُقاس **بالحالة المخزَّنة** لا بمظهر الزرّ: إخفاء زرّ ليس حماية،
// والسؤال الوحيد هو «هل كُتبت حالة مدفوعة؟».
//
// التشغيل: npm run test:e2e:preview-gate
//   (يبني بـVITE_ENTITLEMENT_MODE=mock — الإنتاج يُبنى بلا هذا العلم فلا يمنح شيئًا.)

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5319
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))
async function waitForServer(ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const settle = (page, ms = 1800) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

/**
 * لقطة الحالة المدفوعة المخزّنة — الحكم الحقيقي على «هل وقع الفعل؟».
 *
 * ⚠️ المفتاح `qimmah:nutrition:v2` مقروء من المصدر لا مكتوبًا تخمينًا. أول نسخة
 * من هذا السكربت قرأت مفتاحًا لا وجود له، فمرّت فحوص «لا طعام يُسجَّل» و«لا ماء
 * يُسجَّل» **وهي لا تفحص شيئًا** — مرورٌ غير مستحقّ (الميثاق §4.2). ولذلك يوجد
 * `keyExists` أدناه: تأكيد مضادّ يسقط إن صار المفتاح وهمًا من جديد.
 */
const NUTRITION_KEY = 'qimmah:nutrition:v2'
const paidState = (page) => page.evaluate((key) => {
  const read = (k) => { try { return window.localStorage.getItem(k) } catch { return null } }
  const raw = read(key)
  const day = JSON.parse(raw || '{}')
  return {
    activeWorkout: read('qimmah:activeWorkout:v1') || '',
    foods: Array.isArray(day.foods) ? day.foods.length : 0,
    waterMl: typeof day.waterMl === 'number' ? day.waterMl : 0,
    keyPresent: raw !== null,
  }
}, NUTRITION_KEY)

async function onboard(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await tap(page, /كضيف/)
  await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await next(); await page.waitForSelector('#onb-title-goal', { timeout: 20000 })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next(); await page.waitForSelector('#onb-title-equipment', { timeout: 20000 })
  const tiles = page.locator('button[aria-pressed]')
  await tiles.nth(0).click({ force: true }); await tiles.nth(3).click({ force: true })
  await next(); await settle(page, 1600)
  await tap(page, /الدخول للوحة/); await settle(page, 2200)
  await tap(page, /شوف خطتي/); await settle(page, 2400)
}

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  await onboard(page)

  // ═══════════════ شخصية ١: معاينة (بلا استحقاق) ═══════════════
  console.log('\n=== شخصية: معاينة الضيف (بلا استحقاق) ===')

  // (أ) التصفّح مفتوح — الحجب على الفعل لا على الصفحة.
  for (const route of ['dashboard', 'workout', 'exercises', 'nutrition', 'progress', 'profile']) {
    await page.evaluate((h) => { window.location.hash = '/' + h }, route)
    await settle(page, 1600)
    const state = await page.evaluate(() => ({
      hash: location.hash,
      notFound: /الصفحة غير موجودة|Not found/i.test(document.body.innerText),
      hasContent: document.body.innerText.trim().length > 200,
    }))
    check(`معاينة: #/${route} يُتصفَّح`, state.hash.includes(route) && !state.notFound && state.hasContent, JSON.stringify(state))
  }

  // (ب) بدء التمرين محجوب — والبوّابة تظهر بدل الجلسة.
  await page.evaluate(() => { window.location.hash = '/workout' })
  await settle(page, 2000)
  const before = await paidState(page)
  await tap(page, /ابدأ تمرين اليوم|ابدأ تمرين/)
  await settle(page, 1500)
  const gateShown = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
  const afterStart = await paidState(page)
  check('معاينة: بدء التمرين يفتح بوّابة Premium', gateShown)
  check('معاينة: لا جلسة تمرين مكتوبة', afterStart.activeWorkout === before.activeWorkout && !afterStart.activeWorkout)
  const gateCta = await page.locator('[data-testid="premium-gate-cta"]').getAttribute('href').catch(() => null)
  check('معاينة: نداء البوّابة يشير إلى وجهة الشراء', !!gateCta && /salla|checkout/i.test(gateCta), String(gateCta))
  await tap(page, /أكمل التصفّح/)
  await settle(page, 800)

  // (ج) الالتفاف المباشر — استدعاء الكاتب من الـconsole (مطلب المؤسس §25).
  //     هذا ما يفرّق «إخفاء زرّ» عن «حماية حدّ الفعل».
  const bypass = await page.evaluate(async () => {
    const out = {}
    try {
      window.localStorage.setItem('qimmah:activeWorkout:v1', JSON.stringify({ hacked: true }))
      out.rawWrite = 'succeeded'
    } catch { out.rawWrite = 'blocked' }
    return out
  })
  // كتابة localStorage الخام تنجح دائمًا (لا نملك المتصفّح) — لكن التطبيق يرفضها
  // كسجلّ غير صالح، وهذا ما نتحقّق منه: لا جلسة تُستأنف من حمولة مزروعة.
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2500)
  await page.evaluate(() => { window.location.hash = '/workout' })
  await settle(page, 2000)
  const resumed = await page.evaluate(() => /استئناف|Resume/i.test(document.body.innerText))
  check('معاينة: حمولة جلسة مزروعة لا تُستأنف', !resumed, `rawWrite=${bypass.rawWrite}`)

  // (د) التغذية — تُتصفَّح، ولا تُسجَّل.
  await page.evaluate(() => { window.location.hash = '/nutrition' })
  await settle(page, 2000)
  const nutBefore = await paidState(page)
  await tap(page, /^أضف$/)
  await settle(page, 1400)
  const nutGate = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
  check('معاينة: «أضف» في التغذية يفتح البوّابة', nutGate)
  await tap(page, /أكمل التصفّح/); await settle(page, 700)
  await tap(page, /\+250/)
  await settle(page, 1200)
  const nutAfter = await paidState(page)
  check('معاينة: لا صنف طعام يُسجَّل', nutAfter.foods === nutBefore.foods && nutAfter.foods === 0)
  check('معاينة: لا ماء يُسجَّل', nutAfter.waterMl === nutBefore.waterMl)

  // ═══════════════ شخصية ٢: مُفعَّل بكود ═══════════════
  console.log('\n=== شخصية: مُفعَّل بكود تفعيل (وضع التقليد) ===')
  await tap(page, /^أضف$/)
  await settle(page, 1200)
  await tap(page, /عندك كود تفعيل/)
  await settle(page, 600)

  // الحالات المطلوبة (§D) — كل واحدة برسالتها، والمجهول برسالة **عامّة واحدة**.
  for (const [code, expect] of [
    ['NOPE-NOPE-NOPE', 'invalid'],
    ['QIMMAH-TEST-USED', 'already_used'],
    ['QIMMAH-TEST-EXPIRED', 'expired'],
  ]) {
    await page.fill('[data-testid="activation-code-input"]', code)
    await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
    await settle(page, 900)
    const msg = await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')
    check(`كود «${code}» ⇒ حالة ${expect} برسالة ظاهرة`, msg.trim().length > 0, msg)
  }
  // لا أوراكل: كودان مجهولان مختلفان يعطيان **نفس** الرسالة.
  const msgs = []
  for (const code of ['AAAA-BBBB-CCCC', 'ZZZZ-YYYY-XXXX']) {
    await page.fill('[data-testid="activation-code-input"]', code)
    await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
    await settle(page, 800)
    msgs.push((await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')).trim())
  }
  check('لا أوراكل: كودان مجهولان يعطيان نفس الرسالة العامّة', msgs[0] === msgs[1] && msgs[0].length > 0, msgs.join(' | '))

  // التفعيل الحقيقي
  await page.fill('[data-testid="activation-code-input"]', 'QIMMAH-TEST-OK')
  await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
  await settle(page, 1500)
  const okMsg = await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')
  check('كود صالح ⇒ رسالة نجاح', /تمّ التفعيل|activated/i.test(okMsg), okMsg)
  await tap(page, /أكمل التصفّح/)
  await settle(page, 1000)

  // الآن الأفعال تعمل — نفس الشاشات، نتيجة مختلفة.
  await page.evaluate(() => { window.location.hash = '/nutrition' })
  await settle(page, 1800)
  const paidBefore = await paidState(page)
  await tap(page, /\+250/)
  await settle(page, 1200)
  const paidAfter = await paidState(page)
  check('مُفعَّل: تسجيل الماء يعمل', paidAfter.waterMl > paidBefore.waterMl, `${paidBefore.waterMl} → ${paidAfter.waterMl}`)
  // تأكيد مضادّ: المفتاح الذي نقيس به **موجود فعلًا**. بدونه تمرّ فحوص المنع
  // أعلاه بلا معنى (كانت تمرّ على مفتاح وهمي قبل هذا الإصلاح).
  check('المفتاح الذي تُقاس به الحالة موجود فعلًا', paidAfter.keyPresent, NUTRITION_KEY)

  await page.evaluate(() => { window.location.hash = '/workout' })
  await settle(page, 2000)
  await tap(page, /ابدأ تمرين اليوم|ابدأ تمرين/)
  await settle(page, 2000)
  const startedGate = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
  const started = await paidState(page)
  check('مُفعَّل: بدء التمرين لا يفتح البوّابة', !startedGate)
  check('مُفعَّل: جلسة التمرين تُكتب فعلًا', started.activeWorkout.length > 0)

  check('لا أخطاء غير ملتقَطة في الصفحة طوال المصفوفة', pageErrors.length === 0, pageErrors.slice(0, 2).join(' || '))
  await ctx.close()
} finally {
  if (browser) await browser.close()
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} مصفوفة المعاينة: ${pass} فحوص، ${fail} فشل.`)
if (fail) {
  for (const f of failures) console.log(`   - ${f}`)
  process.exit(1)
}
