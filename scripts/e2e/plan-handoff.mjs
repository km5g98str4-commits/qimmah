// إثبات متصفّح: شاشة التسليم تكشف قيمة حقيقية، وأرقامها هي المحفوظة.
// [QIM-WEB-FOUNDER-UX-004] الحزمة ٣.
//
// الشاشة السابقة أعلنت «جاهزة ومحفوظة» — حدثًا تقنيًا في أغلى لحظة في القمع.
// ما يثبته هذا السكربت:
//   ١) الحقائق المعروضة **تطابق التخصيص المحفوظ** (أيام/سعرات/بروتين/ماكروز).
//      وهذا هو الفحص الذي يمنع أخطر شكل من الكذب: شاشة وعد بأرقام غير أرقام
//      التطبيق. المقارنة بالقيمة المخزَّنة لا بنصّ متوقَّع مكتوب هنا.
//   ٢) لا رقم مخترع: كل عدد ظاهر موجود في الخطة المحفوظة.
//   ٣) «استعرض قِمّة أولًا» ⇒ Today، **لا محرّر الخطة**.
//   ٤) «احصل على قِمّة Premium» ⇒ حدّ الشراء المعتمد.
//   ٥) الزرّان قابلان للنقر فعلًا (`elementFromPoint`) على ٣٢٠/٣٩٠/٤٣٠/سطح مكتب.
//   ٦) لا شريط تثبيت على هذا السطح إطلاقًا (قرار المؤسس: لا منافسة في القمع).
//   ٧) بلا فيض أفقي، وبالعربية والإنجليزية.
//
// التشغيل: npm run test:e2e:plan-handoff

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = 5321
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const CUSTOMIZATION_KEY = 'qimmah:customization:v1'

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
 * أرقام عربية-هندية ⇒ لاتينية، **مع إزالة فاصل الآلاف**، ثم كل الأعداد الظاهرة.
 *
 * ⚠️ إزالة الفاصل ليست تجميلًا: بدونها كان «٢٬٢٠٧» سعرة يُقرأ عددين (٢ و٢٠٧)،
 * فسقط فحص السعرات خمس مرّات وبدا أن الشاشة لا تعرضها — **وهي تعرضها**. عيب في
 * القياس لا في المنتج. الفاصل العربي U+066C واللاتيني «,» كلاهما وارد.
 */
const numbersIn = (text) => {
  const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const joined = latin.replace(/(\d)[,\u066C\u2009\u00A0](?=\d{3}\b)/g, '$1')
  return (joined.match(/\d+/g) ?? []).map(Number)
}

/** يقود المعالج حتى شاشة التسليم (بلا ضغط زرّيها). */
async function driveToHandoff(page, ar) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  if (!ar) { await tap(page, /^EN$/); await settle(page, 1400) }
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1200)
  await tap(page, ar ? /نبدأ/ : /Get started/i)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  // [COMMISSIONING] النيّة تُختار **بالاسم** لا بالفهرس، وتُمرَّر للسائق.
  // كان `rows.nth(1)` ينقر «meals» ثم يُخبر السائق «plan» (افتراضه)، فيبلّغ
  // حارسُ «نمط الأكل» عن سؤالٍ بلا أثر — **عيبٌ لا وجود له** — وتموت الرحلة
  // قبل أول فحص. القيمة واحدة الآن في الموضعين.
  const chosenIntent = await selectIntent(page, 'meals')
  await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosenIntent }); await settle(page, 1600)

  /**
   * ═══ [COMMISSIONING §10] لحظة التجهيز — تُقاس بالساعة لا بقراءة مصدر ═══
   *
   * `SynthesisScreen` مبنيّة منذ `[OVERNIGHT-4]` بخمس مراحل ومسارِ «قلّل
   * الحركة» وعقدٍ اسمه `done`، **ولم تُستعمل قط**: التوليد ينتهي في نحو عشرين
   * ميلي ثانية فتُركَّب وتُفكَّك قبل أن تُقرأ كلمة، و`done` كانت `false` حرفيًّا
   * فمنطق «انتهى العمل فقف» لا يعمل أبدًا.
   *
   * ووجودُ المكوّن كان أخضر طوال الوقت — ولهذا **لا يُقاس هذا بقراءة مصدر**.
   *
   * والحدّان معًا: أرضيةٌ تكفي ليُقرأ سطران، **وسقفٌ** يمنع أن تتحوّل اللحظة
   * إلى انتظار نصنعه (التكليف: «لا تُبطئ التطبيق ثوانٍ لأجل حركة»).
   */
  const t0 = Date.now()
  await tap(page, ar ? /الدخول للوحة/ : /Enter|Open/i)
  let seenSynthesis = false
  let stagesSeen = 0
  let dwell = 0
  for (let i = 0; i < 150; i += 1) {
    const visible = await page.locator('[data-testid="reveal-synthesis"]').isVisible().catch(() => false)
    if (visible) {
      seenSynthesis = true
      dwell = Date.now() - t0
      // المعيار: **مراحل منجَزة تتراكم** — أي أن القصّة تحرّكت فعلًا.
      // (القيمة `active` لا `current` — قُرئت من المكوّن لا خُمّنت.)
      const n = await page.locator('[data-stage-state="done"]').count().catch(() => 0)
      if (n > stagesSeen) stagesSeen = n
    } else if (seenSynthesis) break
    await page.waitForTimeout(40)
  }
  synthesis = { seen: seenSynthesis, dwell, stages: stagesSeen }

  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await settle(page, 900)
}

/** يُملأ من أول تشغيل — اللحظة لا تتغيّر بالعرض، فتُقاس مرّة. */
let synthesis = null
const SYNTH_FLOOR_MS = 800
// [مهمة المنتج] الأرضية 3400 (سبع مراحل × 480) + هامش توليد ورسم — رُفع مع الأرضية في نفس الموجة.
const SYNTH_CEILING_MS = 4800

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  for (const { w, h, lang } of [
    { w: 320, h: 720, lang: 'ar' },
    { w: 390, h: 780, lang: 'ar' },
    { w: 430, h: 860, lang: 'ar' },
    { w: 1280, h: 900, lang: 'ar' },
    { w: 390, h: 780, lang: 'en' },
  ]) {
    const ar = lang === 'ar'
    const tag = `${w}/${lang}`
    console.log(`\n=== ${tag} ===`)
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: ar ? 'ar-SA' : 'en-US' })
    const page = await ctx.newPage()
    // نجعل التثبيت متاحًا عمدًا: العقد أن الشريط لا يظهر هنا **حتى لو أمكن**.
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const e = new Event('beforeinstallprompt', { cancelable: true })
        e.prompt = () => Promise.resolve()
        e.userChoice = Promise.resolve({ outcome: 'dismissed' })
        window.dispatchEvent(e)
      })
    })
    await driveToHandoff(page, ar)

    // (١) البنية المطلوبة موجودة.
    const structure = await page.evaluate(() => ({
      handoff: !!document.querySelector('[data-testid="plan-handoff"]'),
      preview: !!document.querySelector('[data-testid="plan-preview"]'),
      why: !!document.querySelector('[data-testid="plan-why-panel"]'),
      firstDay: !!document.querySelector('[data-testid="plan-preview-first-day"]'),
      macros: !!document.querySelector('[data-testid="plan-preview-macros"]'),
      benefits: document.querySelectorAll('[data-testid="handoff-benefits"] li').length,
      premium: !!document.querySelector('[data-testid="handoff-premium-cta"]'),
      previewCta: !!document.querySelector('[data-testid="handoff-preview-cta"]'),
      title: (document.querySelector('[data-testid="plan-handoff"] h1')?.textContent || '').trim(),
    }))
    check(`${tag}: شاشة التسليم مرسومة`, structure.handoff)
    check(`${tag}: معاينة الخطة الحقيقية معروضة`, structure.preview)
    check(`${tag}: «لماذا هذه خطتك» معروض`, structure.why)
    check(`${tag}: مقتطف أول يوم تدريب معروض`, structure.firstDay)
    check(`${tag}: الماكروز/السعرات معروضة`, structure.macros)
    check(`${tag}: ٢–٤ نقاط قيمة`, structure.benefits >= 2 && structure.benefits <= 4, String(structure.benefits))
    // [WAVE-A] توكيد بائت صُحِّح — **العطل كان في القياس لا في المنتج**.
    // `8f5d966` [OVERNIGHT-3/4] حوّل التسليم إلى شاشة كشف، فصار العنوان «هذي
    // نقطة البداية» بدل «جهزنا خطتك». والعنوان الجديد هو المطلوب دستوريًا
    // (نبرة الكشف: بداية رحلة لا إشعار حفظ)، فيتبعه التوكيد ولا يشدّه للخلف.
    check(`${tag}: عنوان الكشف يفتح رحلة لا يُعلن حفظًا`, ar ? /نقطة البداية/.test(structure.title) : /starting point/i.test(structure.title), structure.title)

    // (٢) الحقائق المعروضة = الخطة المحفوظة. جوهر هذا الإثبات.
    const match = await page.evaluate((key) => {
      const saved = JSON.parse(window.localStorage.getItem(key) || '{}')
      const days = saved?.workoutPlan?.days?.length ?? null
      const t = saved?.targets ?? {}
      const text = document.querySelector('[data-testid="plan-preview"]')?.textContent || ''
      const listed = document.querySelectorAll('[data-testid="plan-preview-days"] li').length
      return {
        savedDays: days,
        listedDays: listed,
        targets: { cal: t.targetCalories ?? null, p: t.proteinGrams ?? null, c: t.carbsGrams ?? null, f: t.fatGrams ?? null },
        text,
      }
    }, CUSTOMIZATION_KEY)
    const shown = numbersIn(match.text)
    check(`${tag}: عدد أيام المعاينة = عدد أيام الخطة المحفوظة`, match.savedDays !== null && match.listedDays === match.savedDays, `saved=${match.savedDays} listed=${match.listedDays}`)
    for (const [name, value] of Object.entries(match.targets)) {
      if (value === null) continue
      check(`${tag}: ${name}=${value} من الخطة المحفوظة يظهر في المعاينة`, shown.includes(Math.round(value)), `shown=${shown.slice(0, 14).join(',')}`)
    }

    // (٣) لا شريط تثبيت ينافس القرار.
    check(`${tag}: لا شريط تثبيت على شاشة التسليم`, !(await page.locator('[data-testid="install-prompt"]').isVisible().catch(() => false)))

    // (٤) الزرّان قابلان للنقر فعلًا — لا مغطّى ولا خارج الشاشة.
    const hits = await page.evaluate(() => ['handoff-premium-cta', 'handoff-preview-cta'].map((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`)
      if (!el) return { id, missing: true }
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { id, reachable: !!(top && (top === el || el.contains(top))), hit: (top?.textContent || '').slice(0, 30), h: Math.round(r.height) }
    }))
    for (const hit of hits) {
      check(`${tag}: «${hit.id}» قابل للنقر`, hit.reachable, `ابتلعه: ${hit.hit}`)
      check(`${tag}: «${hit.id}» هدف لمس ≥44بكسل`, (hit.h ?? 0) >= 44, `${hit.h}px`)
    }

    // (٥) بلا فيض أفقي ولا قصّ.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    check(`${tag}: بلا فيض أفقي`, !overflow)

    // (٦) «استعرض قِمّة أولًا» ⇒ Today، لا محرّر الخطة.
    await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
    await settle(page, 2600)
    const landed = await page.evaluate(() => ({ hash: location.hash, editor: /تعديل خطتي|Edit my plan/i.test(document.body.innerText) }))
    check(`${tag}: المعاينة تهبط على Today لا على محرّر الخطة`, landed.hash.includes('dashboard') && !landed.editor, JSON.stringify(landed))
    await ctx.close()
  }

  // (٧) حدّ الشراء المعتمد — يُقرأ من إعداد المنتج لا مكتوبًا هنا.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'ar-SA' })
    const page = await ctx.newPage()
    await driveToHandoff(page, true)
    const href = await page.locator('[data-testid="handoff-premium-cta"]').getAttribute('href')
    const target = await page.locator('[data-testid="handoff-premium-cta"]').getAttribute('target')
    const rel = await page.locator('[data-testid="handoff-premium-cta"]').getAttribute('rel')
    check('نداء Premium يشير إلى حدّ الشراء المعتمد', !!href && /^https:\/\//.test(href) && /salla/i.test(href), String(href))
    check('الرابط الخارجي محصّن (noopener noreferrer)', target === '_blank' && /noopener/.test(rel || '') && /noreferrer/.test(rel || ''), `${target} · ${rel}`)

    // (٨) الرجوع من التسليم لا يقذف المستخدم خارج التطبيق.
    await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
    await settle(page, 2400)
    await page.goBack()
    await settle(page, 2200)
    const back = await page.evaluate(() => ({ hash: location.hash, blank: document.body.innerText.trim().length < 40 }))
    check('الرجوع بعد التسليم يبقى داخل التطبيق', !back.blank, JSON.stringify(back))

    // ── لحظة التجهيز (تُقاس مرّة، من أول تشغيل) ────────────────────────────
    if (synthesis) {
      check('لحظة التجهيز ظهرت فعلًا — لا وميض غير مقروء', synthesis.seen, JSON.stringify(synthesis))
      check(`ومكثت ما يكفي لتُقرأ (${synthesis.dwell}م.ث ≥ ${SYNTH_FLOOR_MS})`,
        synthesis.dwell >= SYNTH_FLOOR_MS, `${synthesis.dwell}م.ث`)
      check(`ولم تتحوّل إلى انتظار مصطنع (${synthesis.dwell}م.ث ≤ ${SYNTH_CEILING_MS})`,
        synthesis.dwell <= SYNTH_CEILING_MS, `${synthesis.dwell}م.ث`)
      check(`وتقدّمت القصّة فعلًا — مرحلتان منجَزتان على الأقلّ (${synthesis.stages})`,
        synthesis.stages >= 2, `${synthesis.stages} منجَزة`)
      synthesis = null
    }
    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} تسليم الخطة: ${pass} فحوص، ${fail} فشل.`)
if (fail) {
  for (const f of failures) console.log(`   - ${f}`)
  process.exit(1)
}
