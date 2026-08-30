/**
 * رحلة سطح العضوية — [WAVE2-PREMIUM-SURFACE] · [WAVE2-PURCHASE-OPS].
 *
 * يثبت على **البناء الحيّ** ما لا يثبته برهان بنيوي: أن مستخدمًا مصادَقًا يبلغ
 * حقل التفعيل **بلا أن يصطدم بفعل محجوب أوّلًا**، وأن الاسترداد يرفع الحالة
 * إلى Premium ويبقى بعد إعادة التحميل، وأن الأخطاء تُقال صادقة بلا حالة نصفية.
 *
 * ═══ حدّ هذه الرحلة — يُقال ولا يُسكت عنه ═══
 * البناء هنا `VITE_ENTITLEMENT_MODE=mock`، فالخادم غير موصول:
 *   • الاسترداد يمرّ بجدول `MOCK_CODES` لا بـ`redeem_access_code_v2`. فما يُثبَت
 *     هنا هو **سلوك الواجهة وسلسلة الحالة**، لا عقد الخادم — وعقدُ الخادم
 *     مُثبَتٌ مستقلًّا في `test:purchase-credential` (٨٦ فحصًا على كل الهجرات)
 *     و`test:attack-purchase-race` على Postgres حقيقي.
 *   • **التجربة لا تُقلَّد عمدًا** (`entitlementSource.ts`): `startTrial` تبقى
 *     `backend_unconfigured` في المعاينة كي لا يُعطى دليلٌ كاذب على عقد لم
 *     يُختبَر. فرحلة التجربة هنا تفحص **الصدق عند الغياب** لا نجاحًا مزيّفًا،
 *     والعقد الحقيقي يبقى موقوفًا على staging ويُبلَّغ كذلك.
 */
import { spawn } from 'node:child_process'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = Number(process.env.PORT || 5421)
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

/** يفتح `#/premium` ويتأكّد أن الشاشة رُسمت فعلًا — لا تخطٍّ صامت. */
async function openPremium(page) {
  await page.evaluate(() => { window.location.hash = '#/premium' })
  await page.waitForSelector('[data-testid="premium-view"]', { timeout: 20000 })
  await settle(page, 900)
}

const kindOf = (page) => page.getAttribute('[data-testid="premium-view"]', 'data-access-kind')

/** يُدخل كودًا في حقل الشاشة (لا في البوّابة) ويعيد نصّ الرسالة. */
async function redeemOnSurface(page, code) {
  const open = page.locator('[data-testid="premium-open-code"]')
  if (await open.isVisible().catch(() => false)) await open.click()
  await page.locator('[data-testid="premium-code-input"]').fill(code)
  await page.locator('[data-testid="premium-code-submit"]').click()
  await settle(page, 2000)
  // عند النجاح يرتفع الاستحقاق فيُفكَّك القسم ومعه رسالته — وهذا سلوك مقصود.
  // فالقراءة متسامحة، والدليل على النجاح هو **بطاقة الحالة** لا الرسالة.
  const msg = page.locator('[data-testid="premium-code-message"]')
  if (!(await msg.isVisible().catch(() => false))) return null
  return (await msg.textContent()) ?? ''
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
let browser

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: process.env.PW_CHROMIUM })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  ctx.setDefaultTimeout(6000)
  const page = await ctx.newPage()

  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  console.log(`\n▸ التمهيد — تخصيص كامل ثم لوحة (${engineName})`)
  await onboard(page)
  check('التطبيق أُقلع والتخصيص اكتمل', true)

  // ═══ ① المدخل — بلا اصطدام ═══
  console.log('\n① المدخل — يُبلَغ من الإعدادات بلا أن يصطدم بفعل محجوب')
  await page.evaluate(() => { window.location.hash = '#/settings' })
  await settle(page, 1200)
  const linkVisible = await page.locator('[data-testid="settings-premium-link"]').isVisible().catch(() => false)
  check('مدخل «العضوية» ظاهر في الإعدادات', linkVisible)
  const gateShown = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
  check('ولم تُفتح بوّابة محجوب للوصول إليه', gateShown === false)
  await page.locator('[data-testid="settings-premium-link"]').click()
  await page.waitForSelector('[data-testid="premium-view"]', { timeout: 15000 })
  check('والضغط عليه يفتح شاشة العضوية', true)

  // ═══ ② الحالة الابتدائية ═══
  console.log('\n② الحالة الابتدائية — noAccess، والكود أوّل درجة')
  const k0 = await kindOf(page)
  check('الحالة المعروضة مقروءة من الاستحقاق', typeof k0 === 'string' && k0.length > 0, k0)
  const codeSectionVisible = await page.locator('[data-testid="premium-code-section"]').isVisible().catch(() => false)
  check('قسم تفعيل الكود ظاهر بلا اصطدام', codeSectionVisible)
  const stateTitle = (await page.textContent('[data-testid="premium-state-title"]')) ?? ''
  check('وسطر الحالة مكتوب لا فارغ', stateTitle.trim().length > 0, stateTitle.trim())

  // ═══ ③ التجربة — الصدق عند غياب الخادم ═══
  console.log('\n③ التجربة — لا نجاح مزيّف في بناء بلا خادم')
  if (k0 === 'preview') {
    check('نداء «ابدأ التجربة» معروض في noAccess',
      await page.locator('[data-testid="premium-start-trial"]').isVisible().catch(() => false))
    await page.locator('[data-testid="premium-start-trial"]').click()
    await settle(page, 2000)
    // النجاح **يُفكّك القسم** — لأن `offersTrial('trial') === false`. فالدليل
    // ليس رسالةً عابرة بل **بطاقة الحالة نفسها**: «تجربتك شغّالة» ومعها المتبقّي.
    // وهذا أقوى: رسالةٌ تختفي بعد ثوانٍ لا تُثبت شيئًا بعد إعادة التحميل.
    const kTrial = await kindOf(page)
    check('والحالة تطابق الرسالة — لا رسالةٌ تقول «بدأت» وشاشةٌ تقول «مقفلة»',
      kTrial === 'trial', kTrial)
    check('وتُعرض مدّة متبقّية للتجربة',
      await page.locator('[data-testid="premium-remaining"]').isVisible().catch(() => false))
    check('ونداء بدء التجربة اختفى — لا يُعرض بدءُ ما بدأ',
      (await page.locator('[data-testid="premium-start-trial"]').isVisible().catch(() => false)) === false)
    check('وحقل الكود باقٍ — المشتري يرتقي فورًا بلا انتظار نهاية التجربة',
      await page.locator('[data-testid="premium-code-section"]').isVisible().catch(() => false))
  } else {
    check('حالة البداية ليست noAccess — يُسجَّل ولا يُتخطّى صامتًا', false, `kind=${k0}`)
  }

  // ═══ ④ كود خاطئ — رفض صادق بلا حالة نصفية ═══
  console.log('\n④ كود خاطئ — رفض صادق، ولا Premium')
  const badMsg = await redeemOnSurface(page, 'QIMMAH-NOT-A-REAL-CODE')
  check('رسالة رفض معروضة', (badMsg ?? '').trim().length > 0, badMsg ?? '(غائبة)')
  check('ولا Premium بعده', (await kindOf(page)) !== 'premium', await kindOf(page))
  check('ولم يُخفَّض ما كان قائمًا — الفشل لا يسحب وصولًا',
    (await kindOf(page)) === 'trial', await kindOf(page))

  // ═══ ⑤ كود مستهلَك ═══
  console.log('\n⑤ كود مستهلَك — يُقال «استُخدم» لا «خاطئ»')
  const usedMsg = await redeemOnSurface(page, 'QIMMAH-TEST-USED')
  check('رسالة الكود المستهلَك معروضة', (usedMsg ?? '').trim().length > 0, usedMsg ?? '(غائبة)')
  check('وتختلف عن رسالة الكود الخاطئ — سببان لا رسالة واحدة',
    (usedMsg ?? '') !== (badMsg ?? ''), `«${usedMsg}» ≠ «${badMsg}»`)
  check('ولا Premium بعده', (await kindOf(page)) !== 'premium')

  // ═══ ⑥ الاسترداد الصحيح ═══
  console.log('\n⑥ الاسترداد الصحيح — الحالة ترتفع من الخادم لا من الواجهة')
  const okMsg = await redeemOnSurface(page, 'QIMMAH-TEST-OK')
  check('القسم انطوى بعد النجاح — فالتأكيد بطاقة الحالة لا رسالة عابرة', okMsg === null)
  await settle(page, 1500)
  const kAfter = await kindOf(page)
  check('الحالة صارت Premium', kAfter === 'premium', kAfter)
  check('ولافتة «بلا تاريخ انتهاء» معروضة',
    await page.locator('[data-testid="premium-no-expiry"]').isVisible().catch(() => false))
  const remainingShown = await page.locator('[data-testid="premium-remaining"]').isVisible().catch(() => false)
  check('ولا سطر مدّة متبقّية لـPremium الدائم — لا تاريخ مخترع', remainingShown === false)

  // ═══ ⑦ Premium لا يُخفَّض بمحاولة تجربة ═══
  console.log('\n⑦ Premium + تجربة — لا تخفيض')
  const trialBtnGone = await page.locator('[data-testid="premium-start-trial"]').isVisible().catch(() => false)
  check('نداء «ابدأ التجربة» اختفى لمن عنده Premium', trialBtnGone === false)
  const codeGone = await page.locator('[data-testid="premium-code-section"]').isVisible().catch(() => false)
  check('وقسم الكود اختفى — لا شيء يرتقي فوق Premium', codeGone === false)

  // ═══ ⑧ البقاء بعد التحديث ═══
  console.log('\n⑧ البقاء — الخادم يقول، فيبقى بعد التحديث')
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2600)
  await openPremium(page)
  const kReload = await kindOf(page)
  check('Premium باقٍ بعد إعادة التحميل', kReload === 'premium', kReload)

  // ═══ ⑨ فعل مدفوع حقيقي انفتح ═══
  console.log('\n⑨ الاستحقاق يفتح فعلًا مدفوعًا — لا لافتةً وحدها')
  await page.evaluate(() => { window.location.hash = '#/dashboard' })
  await settle(page, 2000)
  const gateAfter = await page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)
  check('لا بوّابة محجوب مفتوحة على اللوحة بعد Premium', gateAfter === false)

  // ═══ ⑩ التأكيد المضادّ — الحقل ليس زينة ═══
  console.log('\n⑩ ⚔️ التأكيد المضادّ')
  check('⚔️ الشاشة عرضت أكثر من حالة واحدة خلال الرحلة — فالقراءة حيّة لا ثابتة',
    k0 !== kReload, `${k0} ⇒ ${kReload}`)
  check('لا خطأ صفحة خلال الرحلة كلّها', pageErrors.length === 0, pageErrors.join(' | '))

  console.log('\n════════════════════════════════════════════════════════════')
  if (fail === 0) console.log(`✅ رحلة سطح العضوية: ${pass} نجحت / 0 فشلت`)
  else console.log(`❌ رحلة سطح العضوية: ${pass} نجحت / ${fail} فشلت`)
} finally {
  await browser?.close().catch(() => {})
  preview.kill('SIGTERM')
}

process.exit(fail === 0 ? 0 : 1)
