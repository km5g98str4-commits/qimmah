// QEA-004 — مصفوفة إعداد كاملة: كل هدف × كل مسار مكان/معدّات (3×3×3 = 27 توليفة)، عبر
// الأداة التطويرية momentum-shot (المكوّن الحقيقي OnboardingV2 بلا حساب/شبكة — نفس أداة
// scripts/e2e-onboarding.mjs الأصلية، هنا مُعمَّمة لكل توليفة بدل مسار واحد فقط). يضيف
// أيضًا: تحقّق فشل مجبَر/إعادة محاولة، واستئناف بعد إعادة تحميل — مرّة واحدة تمثيلية لكل
// (لا داعي لتكرارهما 27 مرّة؛ منطقهما لا يعتمد على التوليفة المختارة).
//
// مجلّد الأدلة قابل للحقن (EVIDENCE_DIR أو أول معامل سطر أوامر) — لا كتابة في مسار ثابت.
//
// التشغيل:
//   node scripts/onboarding-matrix-e2e.mjs [evidenceDir]
//   EVIDENCE_DIR=/tmp/my-evidence node scripts/onboarding-matrix-e2e.mjs

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as sleep } from 'node:timers/promises'

const EVIDENCE_DIR = resolve(process.argv[2] || process.env.EVIDENCE_DIR || join(tmpdir(), `qimmah-onboarding-matrix-${Date.now()}`))
mkdirSync(EVIDENCE_DIR, { recursive: true })

const PORT = 4321
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/?surface=onboarding`

const GOALS = ['تنشيف', 'محافظة', 'تضخيم']
const PLACES = ['نادي', 'منزل', 'أجهزة فقط']
const PREFS = ['أجهزة', 'أوزان حرة', 'مزيج']

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
  // بداية نظيفة: لا مسودة سابقة من توليفة أخرى.
  await page.evaluate(() => localStorage.removeItem('qimmah:onboarding:v1'))
  await page.reload({ waitUntil: 'networkidle' })
  return { ctx, page, consoleErrors }
}

/** يمرّ عبر التوليفة كاملة: هدف → موافقة → تدريب (افتراضي) → مكان/تفضيل → اعتماد. */
async function runCombo(page, goal, place, pref) {
  const next = page.getByRole('button', { name: 'التالي' })

  // خطوة ١: الهدف + الموافقة الصحية.
  await page.getByRole('button', { name: new RegExp(goal) }).click()
  await next.click({ force: true })
  const consentAlertVisible = await page.getByRole('alert').isVisible().catch(() => false)
  if (!consentAlertVisible) return { ok: false, stage: 'consent-validation-missing' }
  await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
  const unlockedAfterConsent = (await next.getAttribute('aria-disabled')) === 'false'
  if (!unlockedAfterConsent) return { ok: false, stage: 'consent-did-not-unlock' }
  await next.click()

  // خطوة ٢: التدريب — افتراضيًا صالح (أيام/مدة لهما قيم افتراضية) — تابع مباشرة.
  const trainingHeadingVisible = await page.getByRole('heading', { name: 'نُعد جدولك' }).isVisible().catch(() => false)
  if (!trainingHeadingVisible) return { ok: false, stage: 'training-step-missing' }
  await page.getByRole('button', { name: 'التالي' }).click()

  // خطوة ٣: المكان + التفضيل — التحقّق: بلا اختيار، الزرّ يبقى معطّلًا (اختبار سلبي أولًا).
  const equipmentHeadingVisible = await page.getByRole('heading', { name: 'أين وكيف تتمرّن؟' }).isVisible().catch(() => false)
  if (!equipmentHeadingVisible) return { ok: false, stage: 'equipment-step-missing' }
  const confirmBtn = page.getByRole('button', { name: 'اعتمد خطتي' })
  const disabledBeforeChoice = (await confirmBtn.getAttribute('aria-disabled')) === 'true'
  if (!disabledBeforeChoice) return { ok: false, stage: 'equipment-not-blocked-before-choice' }

  await page.getByRole('button', { name: place, exact: true }).click()
  await page.getByRole('button', { name: pref, exact: true }).click()
  const unlockedAfterChoice = (await confirmBtn.getAttribute('aria-disabled')) === 'false'
  if (!unlockedAfterChoice) return { ok: false, stage: 'equipment-did-not-unlock' }
  await confirmBtn.click()

  const summaryVisible = await page.getByRole('heading', { name: 'خطتك جاهزة' }).isVisible().catch(() => false)
  if (!summaryVisible) return { ok: false, stage: 'summary-missing' }

  // الملخّص يعكس التوليفة الفعلية — لا نص عام بلا صلة بالاختيارات.
  const summaryText = await page.locator('body').innerText().catch(() => '')
  const reflectsPlace = summaryText.includes(place)
  return { ok: reflectsPlace, stage: reflectsPlace ? 'done' : 'summary-does-not-reflect-place', summaryText: summaryText.slice(0, 200) }
}

let browser
try {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((res, rej) => {
    const start = Date.now()
    const poll = async () => {
      try { if ((await fetch(BASE)).ok) return res() } catch {}
      if (Date.now() - start > 20000) return rej(new Error('server did not start'))
      setTimeout(poll, 250)
    }
    poll()
  })

  browser = await chromium.launch()
  let comboIndex = 0
  const totalCombos = GOALS.length * PLACES.length * PREFS.length

  for (const goal of GOALS) {
    for (const place of PLACES) {
      for (const pref of PREFS) {
        comboIndex += 1
        const { ctx, page, consoleErrors } = await freshPage(browser)
        const label = `[${comboIndex}/${totalCombos}] ${goal} × ${place} × ${pref}`
        try {
          const result = await runCombo(page, goal, place, pref)
          check(label, result.ok, result.ok ? 'summary reflects choices' : `فشل في: ${result.stage}`)
          if (consoleErrors.length > 0) check(`${label} — zero console errors`, false, consoleErrors.join(' | '))
        } catch (e) {
          check(label, false, e.message)
        } finally {
          await ctx.close()
        }
      }
    }
  }

  // ————— فشل مجبَر / إعادة محاولة (مرّة تمثيلية واحدة — منطقه مستقلّ عن التوليفة). —————
  {
    const { ctx, page } = await freshPage(browser)
    try {
      await page.getByRole('button', { name: /تنشيف/ }).click()
      await page.getByRole('button', { name: 'التالي' }).click({ force: true })
      await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
      await page.getByRole('button', { name: 'التالي' }).click()
      await page.getByRole('button', { name: 'التالي' }).click()
      await page.getByRole('button', { name: 'نادي', exact: true }).click()
      await page.getByRole('button', { name: 'مزيج', exact: true }).click()
      await page.getByRole('button', { name: 'اعتمد خطتي' }).click()
      await page.getByRole('heading', { name: 'خطتك جاهزة' }).waitFor()

      await page.evaluate(() => localStorage.setItem('qimmah:onboarding:force-fail', '1'))
      await page.getByRole('button', { name: 'الدخول للوحة' }).click()
      const failureVisible = await page.getByRole('heading', { name: 'تعذّر إعداد الخطة' }).isVisible().catch(() => false)
      check('فشل مجبَر: شاشة الخطأ تظهر', failureVisible)

      await page.evaluate(() => localStorage.removeItem('qimmah:onboarding:force-fail'))
      await page.getByRole('button', { name: 'أعد المحاولة' }).click()
      const clearedAfterRetry = await page.getByRole('heading', { name: 'تعذّر إعداد الخطة' }).waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false)
      check('إعادة المحاولة: شاشة الخطأ تختفي', clearedAfterRetry)
    } catch (e) {
      check('فشل مجبَر/إعادة محاولة: اكتمل بلا استثناء', false, e.message)
    } finally {
      await ctx.close()
    }
  }

  // ————— استئناف بعد إعادة تحميل (مرّة تمثيلية — اختيار هدف، إعادة تحميل، تحقّق البقاء). —————
  {
    const { ctx, page } = await freshPage(browser)
    try {
      await page.getByRole('button', { name: /تضخيم/ }).click()
      await page.getByRole('button', { name: 'التالي' }).click({ force: true })
      await page.getByRole('checkbox', { name: /أوافق على معالجة بياناتي الصحية/ }).check()
      await page.getByRole('button', { name: 'التالي' }).click()
      // الآن في خطوة التدريب (الخطوة ٢) — نُعيد التحميل هنا بلا إكمال.
      await page.reload({ waitUntil: 'networkidle' })
      await sleep(400)
      const resumedOnTrainingStep = await page.getByRole('heading', { name: 'نُعد جدولك' }).isVisible().catch(() => false)
      check('استئناف بعد إعادة التحميل: يبقى على خطوة التدريب (لا يعود للبداية)', resumedOnTrainingStep)

      // العودة خطوة للخلف تؤكّد أن اختيار الهدف (تضخيم) نفسه استُعيد أيضًا، لا فقط رقم الخطوة.
      const back = page.getByRole('button', { name: /رجوع/ }).first()
      if (await back.isVisible().catch(() => false)) {
        await back.click()
        await sleep(200)
        const goalStillSelected = await page.getByRole('button', { name: /تضخيم/ }).getAttribute('aria-pressed').catch(() => null)
        check('استئناف بعد إعادة التحميل: اختيار الهدف (تضخيم) محفوظ أيضًا', goalStillSelected === 'true', String(goalStillSelected))
      } else {
        check('استئناف بعد إعادة التحميل: اختيار الهدف (تضخيم) محفوظ أيضًا', false, 'no back button found')
      }
    } catch (e) {
      check('استئناف بعد إعادة التحميل: اكتمل بلا استثناء', false, e.message)
    } finally {
      await ctx.close()
    }
  }

  server.kill('SIGTERM')
} catch (e) {
  check('اكتمل السيناريو بلا استثناء غير متوقّع', false, e.stack || e.message)
} finally {
  await browser?.close()
}

const failed = results.filter((r) => !r.ok)
const summary = { evidenceDir: EVIDENCE_DIR, totalCombos: GOALS.length * PLACES.length * PREFS.length, total: results.length, passed: results.length - failed.length, failed: failed.length, results }
writeFileSync(join(EVIDENCE_DIR, 'onboarding-matrix-e2e.json'), JSON.stringify(summary, null, 2))
console.log(`\nالأدلة: ${join(EVIDENCE_DIR, 'onboarding-matrix-e2e.json')}`)
console.log(failed.length === 0 ? `\n✅ نجحت كل الفحوص — ${results.length} فحصًا (${GOALS.length}×${PLACES.length}×${PREFS.length} توليفة + فشل/إعادة محاولة + استئناف).` : `\n❌ فشل ${failed.length} من ${results.length} فحصًا.`)
process.exit(failed.length === 0 ? 0 : 1)
