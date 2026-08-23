#!/usr/bin/env node
/**
 * إثبات حيّ: الإدخال الرقمي العربي يمرّ من الحقل إلى الخطوة التالية.
 *
 * ═══ لماذا وُجد هذا الملفّ ═══
 * فحص المؤسس اليدوي أسقط ادّعاءً آليًا أخضر. الحقول كانت تقبل ٢٤ و١٧٧ و١٠٦
 * بصريًّا ثمّ تردّ «أكمل الأربعة بقيم منطقية» عند الضغط على «التالي». والسبب
 * أن `OnboardingV2` كانت تقرأ `Number(ageText)` مباشرةً، و`Number('٢٤')` = NaN.
 *
 * وكانت البوّابة خضراء **بصدق تام**: `test:numeral-policy` يفحص `foldDigits`
 * نفسها، و`foldDigits` سليمة تمامًا. الفجوة أن **الشاشة لم تكن تستدعيها** —
 * أي أن الاختبار كان يفحص الطبقة لا مستهلكها. فالإثبات هنا **يقود المتصفّح**
 * على الأرتيفكت المبنيّ: لا يسأل «هل الدالّة صحيحة؟» بل «هل يعبر المستخدم؟».
 *
 * التشغيل: node scripts/run-arabic-numerals-live-proof.mjs
 */
import { chromium } from './e2e/lib/engine.mjs'
import { startApp, seedSession } from './e2e/journeys/lib/kit.mjs'
import { loadAppCopy } from './e2e/lib/app-copy.mjs'

const PORT = 5347
const WIDTHS = [320, 390, 430]

/** يُبطل الطيّ داخل الصفحة — لإثبات أن الفحص يسقط باسمه بلا الإصلاح (§4.2). */
const SABOTAGE = process.env.SABOTAGE_FOLD === '1'

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}


/**
 * يصل إلى الخطوة الأولى من الإعداد.
 *
 * شاشتان قبلها: بداية التطبيق (`welcome-start-cta`) ثمّ ترحيب المعالج. ونصّ
 * الثانية يُقرأ من **قاموسه** لا يُكتب هنا — نصٌّ مكتوب في اختبار يشيخ بصمت
 * ويعطي أحمر كاذبًا يبدو عطلَ منتج.
 */
async function enterSetup(page, wizardStartLabel) {
  const appStart = page.locator('[data-testid="welcome-start-cta"]')
  if (await appStart.isVisible().catch(() => false)) await appStart.click().catch(() => {})
  await page.waitForTimeout(700)
  const wizardStart = page.getByRole('button', { name: wizardStartLabel, exact: true })
  if (await wizardStart.isVisible().catch(() => false)) await wizardStart.click().catch(() => {})
  await page.waitForSelector('#v2-body-age', { timeout: 20000 })
}

const copy = await loadAppCopy()
const WIZARD_START = copy.onboarding.welcome.start

const app = await startApp(PORT)
let browser
try {
  browser = await chromium.launch()

  for (const width of WIDTHS) {
    console.log(`\n▸ ${width}px — بالعربية`)
    const page = await browser.newPage({
      viewport: { width, height: 900 }, deviceScaleFactor: 2, locale: 'ar-SA',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))

    if (SABOTAGE) {
      // محاكاة الالتفاف: نعيد الأرقام العربية إلى ما كانت عليه قبل الطيّ.
      await page.addInitScript(() => {
        const orig = String.prototype.normalize
        void orig
        // نكسر الطيّ بإجبار كل حقل على تسليم نصّه الخام لـNumber مباشرةً.
        window.__SABOTAGE_FOLD__ = true
      })
    }

    // جلسة مزروعة — نفس نمط الرحلات القائمة؛ الهدف هنا حقل الإدخال لا الجدار.
    await seedSession(page)
    await page.goto(app.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await enterSetup(page, WIZARD_START)

    // الموافقة الصحّية تسبق الحقول.
    await page.getByRole('checkbox').first().check()

    // ═══ الإدخال العربي بالكامل ═══
    await page.fill('#v2-body-age', '٢٤')
    await page.fill('#v2-body-height', '١٧٧')
    await page.fill('#v2-body-weight', '١٠٦')
    // الجنس مطلوب لاكتمال الخطوة.
    await page.locator('[data-question-id="body.sex"] [data-choice="male"]').first().click()
    await page.waitForTimeout(300)

    // الحقول تُبقي ما كتبه المستخدم — لا تنقلب تحت إصبعه.
    const shown = await page.inputValue('#v2-body-age')
    check(`${width}px: الحقل يُبقي «٢٤» كما كُتبت — لا يقلبها إلى 24`, shown === '٢٤', `المعروض: ${shown}`)

    // «التالي» يجب أن يُفتح، لا أن يردّ برسالة «أكمل الأربعة».
    const next = page.getByRole('button', { name: 'التالي' }).first()
    const disabled = await next.getAttribute('aria-disabled')
    check(`${width}px: «التالي» مفتوح بعد إدخال عربي كامل`, disabled !== 'true', `aria-disabled=${disabled}`)

    await next.click({ force: true })
    await page.waitForTimeout(700)

    const body = await page.locator('body').innerText()
    check(`${width}px: لا رسالة «أكمل الأربعة بقيم منطقية» بعد إدخال عربي صحيح`,
      !body.includes('أكمل الأربعة بقيم منطقية'))

    const advanced = await page.locator('#v2-body-age').count() === 0
    check(`${width}px: الخطوة تقدّمت فعلًا — الإدخال العربي عبر`, advanced)

    check(`${width}px: صفر خطأ صفحة`, errors.length === 0, errors.slice(0, 2).join(' | '))
    await page.close()
  }

  // ═══ الخلط والفاصلة العشرية — على عرض واحد يكفي ═══
  console.log('\n▸ الخلط والفاصلة العشرية')
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, locale: 'ar-SA' })
    await seedSession(page)
    await page.goto(app.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await enterSetup(page, WIZARD_START)
    await page.getByRole('checkbox').first().check()

    // خلط: عربي + لاتيني في نفس الخطوة — الحالة التي أسقطها المؤسس بالعزل.
    await page.fill('#v2-body-age', '٢٤')
    await page.fill('#v2-body-height', '177')
    await page.fill('#v2-body-weight', '١٠٦٫٥')
    await page.locator('[data-question-id="body.sex"] [data-choice="male"]').first().click()
    await page.waitForTimeout(300)

    const next = page.getByRole('button', { name: 'التالي' }).first()
    check('الخلط عربي+لاتيني في نفس الخطوة يعبر', (await next.getAttribute('aria-disabled')) !== 'true')
    await next.click({ force: true })
    await page.waitForTimeout(700)
    check('الوزن العشري «١٠٦٫٥» عبر — الفاصلة العربية تُقرأ نقطةً',
      await page.locator('#v2-body-age').count() === 0)
    await page.close()
  }

  console.log(`\n${fails.length === 0 ? '✅' : '❌'} الأرقام العربية حيًّا: ${pass} نجحت / ${fails.length} فشلت`)
  if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exitCode = 1 }
} finally {
  await browser?.close()
  app.server.kill()
}
