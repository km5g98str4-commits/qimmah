/**
 * إثبات متصفّح حيّ لأمان معاينة المؤسس — [QIMMAH-FOUNDER-QA-PREVIEW-SAFETY-001].
 *
 * ═══ ما الفرق بينه وبين `test:preview-safety` ═══
 * ذاك يثبت **البنية** (الأرتيفكت خالٍ من بيانات الإنتاج، والكتّاب يفشلون مغلقين
 * حين تُستدعى دوالّهم مباشرةً). وهذا يثبت **الرحلة**: متصفّح حقيقي يفتح البناء
 * الذي سيُنشر، يمشي طريق المؤسس، ويحاول الأفعال الأربعة الخطرة — والشبكة كلّها
 * مُراقَبة ومُحصاة.
 *
 * ═══ لماذا لا يكفي أحدهما ═══
 * فحص الوحدة يستدعي الدالّة كما يفهمها كاتبه؛ وقد يكون في الواجهة طريق ثالث لا
 * يمرّ بها (نداء `fetch` مباشر · وسم `<img>` · عامل خدمة · إعادة توجيه). ولا
 * يكشف ذلك إلا **عدّ كل طلب يخرج من الصفحة** — وهو ما يفعله المُعترِض هنا.
 *
 * ═══ التأكيد المضادّ (الميثاق §4.2) ═══
 * «صفر طلبات إنتاج» عبارة تُرضى بمُراقب معطّل تمامًا كما تُرضى بتطبيق آمن.
 * فيُختم كل تشغيل بنداء `fetch` **متعمَّد** إلى مضيف الإنتاج من داخل الصفحة:
 * إن لم يلتقطه المُراقب سقط الإثبات باسمه، ولم يُقبل الصفر السابق.
 *
 * التشغيل: npm run test:e2e:preview-safety
 */
import { spawn, execSync } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, engineName } from './lib/engine.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const outDir = resolve(root, 'docs/execution/qimmah-founder-qa/preview-safety-shots')
const PORT = 5366
const URL = process.env.PREVIEW_URL || `http://localhost:${PORT}`

/** مضيف مشروع الإنتاج — ما يجب ألّا يُلمَس. */
const PROD_HOST = 'ledlypcyrtnzvjvhykwz.supabase.co'
/** المضيفات المسموح بها في تشغيل محلّي: خادم المعاينة وحده. */
const isLocal = (u) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(u) || u.startsWith('data:') || u.startsWith('blob:')

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

// ════════════════════════════════════════════════════════════════════════════
// ① بوّابة الأرتيفكت — لا نلتقط أدلّة جميلة لبناء خاطئ
// ════════════════════════════════════════════════════════════════════════════
console.log('\n① بوّابة الأرتيفكت — أهذا بناء المعاينة من الرأس الجاري؟')
const headSha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
const indexHtml = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const builtSha = (indexHtml.match(/name="qimmah-build"\s+content="[^·]*·([^"]+)"/) || [])[1]
check(`الأرتيفكت من الرأس الجاري (${headSha})`, builtSha === headSha, `الأرتيفكت: ${builtSha}`)
check('وسم البيئة يعلن `founder_preview`', /name="qimmah-env" content="founder_preview"/.test(indexHtml),
  (indexHtml.match(/name="qimmah-env" content="[^"]*"/) || ['غائب'])[0])

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}
// يشمل `sw.js` — وهو مهمّ: عامل الخدمة يطلب خارج مسار `page`، فلا يلتقطه
// مُعترِض المتصفّح. والضمان البنيوي وحده يغطّيه: العنوان غير موجود في ملفّه.
const distFiles = walk(resolve(root, 'dist'))
const hostHits = distFiles.filter((f) => { try { return readFileSync(f, 'utf8').includes('ledlypcyrtnzvjvhykwz') } catch { return false } })
check(`لا ملف في dist يحمل مضيف الإنتاج (${distFiles.length} ملفًا مفحوصًا)`, hostHits.length === 0, hostHits.slice(0, 3).join(' · '))
const swFile = distFiles.find((f) => /(^|\/)sw\.js$/.test(f))
check('وعامل الخدمة موجود ومفحوص ضمنها', Boolean(swFile), 'sw.js غير موجود')

if (fails.length) {
  console.log(`\n✗ بوّابة الأرتيفكت سقطت — لا معنى لأدلّة متصفّح فوق بناء خاطئ.\n   ${fails.join('\n   ')}`)
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// ════════════════════════════════════════════════════════════════════════════
// أدوات
// ════════════════════════════════════════════════════════════════════════════
const settle = (page, ms = 1600) => page.waitForTimeout(ms)
const overflows = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button')].find((b) => rx.test((b.textContent || '').trim()))
  if (el) el.click()
}, re.source)

/**
 * مُراقب الشبكة — يسجّل **كل** طلب خارجي ويوقفه.
 *
 * الإيقاف ليس تجميلًا: لو تسرّب طلب إنتاج فعلي فالإثبات يجب أن يسجّله **دون
 * أن ينفّذه**. أي أن الحاجز هنا حاجز أدلّة لا حاجز منتج — والحكم يبقى على العدد.
 */
function watchNetwork(context) {
  const external = []
  const prod = []
  context.route('**/*', async (route) => {
    const url = route.request().url()
    if (isLocal(url)) { await route.continue(); return }
    external.push(url)
    if (url.includes('ledlypcyrtnzvjvhykwz')) prod.push(url)
    await route.abort()
  })
  return { external, prod }
}

async function shoot(page, name, errs) {
  const overflow = await overflows(page)
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: true })
  const flags = [overflow ? '⚠ فيض أفقي' : '', errs.length ? `⚠ خطأ صفحة: ${errs[0]}` : ''].filter(Boolean).join('  ')
  check(`لقطة ${name}`, !flags, flags)
}

async function driveQuestions(page) {
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  const rows = page.locator('button[aria-pressed]')
  await rows.nth(1).click({ force: true }); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next); await settle(page, 1800)
}

/** الهبوط → الأسئلة → الكشف. يترك الصفحة على شاشة الكشف. */
async function toReveal(page, lang) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2400)
  if (lang === 'en') { await tap(page, /^EN$/); await settle(page, 1200) }
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1800)
  // النصوص مقروءة من `design-system/v2/labels.ts` لا مخمَّنة: `welcome.start`
  // و`ready.enter` — فتغييرها يكسر المُمسِك بوضوح بدل أن يمرّ صامتًا.
  await tap(page, lang === 'en' ? /Get started/ : /يلا نبدأ/)
  await settle(page, 1400)
  await driveQuestions(page)
  await tap(page, lang === 'en' ? /Enter dashboard/ : /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await settle(page, 900)
}

/** نصوص «نجاح» ممنوعة حين لا شيء وقع — الفشل الصادق شرط لا تفصيل. */
const SUCCESSY = /تم التفعيل|تم بدء|بدأت تجربتك|تم الحفظ|تم إنشاء|فُعّل|Activated|Trial started|Saved|Account created|Success/i

// ════════════════════════════════════════════════════════════════════════════
const server = process.env.PREVIEW_URL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
async function waitForServer(ms = 40_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
  console.log(`\nالمحرّك: ${engineName} · الخادم: ${URL}`)

  // ══════════════════════════════════════════════════════════════════════════
  // ② الرحلة عند المقاسات الثلاثة — عربي وإنجليزي
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n② الرحلة: الهبوط → الأسئلة → الكشف → المعاينة/الرئيسية')
  for (const { w, lang } of [{ w: 320, lang: 'ar' }, { w: 390, lang: 'ar' }, { w: 430, lang: 'ar' }, { w: 390, lang: 'en' }]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, locale: lang === 'en' ? 'en-US' : 'ar-SA' })
    const net = watchNetwork(ctx)
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message)))

    await toReveal(page, lang)
    await shoot(page, `journey-${lang}-${w}-reveal`, errs)
    await page.locator('[data-testid="handoff-preview-cta"]').first().click({ force: true })
    await settle(page, 2600)
    await shoot(page, `journey-${lang}-${w}-today`, errs)

    const reachedToday = await page.evaluate(() => document.body.innerText.trim().length > 200 && !/الصفحة غير موجودة|Not found/i.test(document.body.innerText))
    check(`${lang}·${w}: الرئيسية وصلت بمحتوى`, reachedToday)
    check(`${lang}·${w}: صفر طلبات إلى مضيف الإنتاج`, net.prod.length === 0, net.prod.slice(0, 2).join(' · '))
    check(`${lang}·${w}: صفر طلبات خارجية إطلاقًا (${net.external.length})`, net.external.length === 0, net.external.slice(0, 3).join(' · '))
    await ctx.close()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ③ الأفعال الأربعة الخطرة — بالعربية ثم بالإنجليزية
  // ══════════════════════════════════════════════════════════════════════════
  for (const lang of ['ar', 'en']) {
    console.log(`\n③ الأفعال الخطرة — ${lang === 'en' ? 'الإنجليزية' : 'العربية'}`)
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: lang === 'en' ? 'en-US' : 'ar-SA' })
    const net = watchNetwork(ctx)
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message)))
    await toReveal(page, lang)

    // ── (أ) التجربة ──────────────────────────────────────────────────────────
    await page.locator('[data-testid="handoff-trial-cta"]').click({ force: true })
    await settle(page, 2200)
    const trialMsg = (await page.locator('[data-testid="reveal-trial-status"]').innerText().catch(() => '')).trim()
    check(`${lang}: التجربة تردّ برسالة مرئية`, trialMsg.length > 0)
    check(`${lang}: ولا تدّعي نجاحًا («${trialMsg}»)`, trialMsg.length > 0 && !SUCCESSY.test(trialMsg))
    check(`${lang}: التجربة لم تُرسل شيئًا للإنتاج`, net.prod.length === 0)
    await shoot(page, `action-${lang}-trial`, errs)

    // ── (ب) Premium — رابط خارجي لا طفرة داخلية ──────────────────────────────
    const premium = page.locator('[data-testid="handoff-premium-cta"]')
    const href = await premium.getAttribute('href')
    const rel = await premium.getAttribute('rel')
    const target = await premium.getAttribute('target')
    check(`${lang}: نداء Premium وجهته سلة`, /salla\.sa/.test(String(href)), String(href))
    check(`${lang}: ويفتح في لسان جديد مؤمّن`, target === '_blank' && /noopener/.test(String(rel)))
    check(`${lang}: وليس طلبًا يُطلقه التطبيق (لا شبكة حتى النقر)`, net.external.length === 0, net.external.slice(0, 3).join(' · '))

    // ── (ج) عملية حسّاسة بالحساب ─────────────────────────────────────────────
    const createCta = page.locator('[data-testid="reveal-create-account-cta"]')
    const hasCreate = await createCta.count()
    check(`${lang}: طريق إنشاء الحساب معروض بعد ردّ التجربة`, hasCreate > 0)
    if (hasCreate > 0) {
      await createCta.click({ force: true })
      await settle(page, 2400)
      const auth = await page.evaluate(() => ({
        text: document.body.innerText,
        emailInputs: document.querySelectorAll('input[type=email]').length,
        passwordInputs: document.querySelectorAll('input[type=password]').length,
      }))
      const disabledPanel = /تسجيل الدخول السحابي مو مفعّل|Cloud login isn't available/i.test(auth.text)
      check(`${lang}: شاشة الحساب تعلن أن الدخول السحابي غير متاح`, disabledPanel, auth.text.slice(0, 120))
      check(`${lang}: ولا حقل بريد ولا كلمة مرور يُعرَض — لا حساب يُنشأ أصلًا`, auth.emailInputs === 0 && auth.passwordInputs === 0,
        `email=${auth.emailInputs} password=${auth.passwordInputs}`)
      check(`${lang}: ولا نصّ نجاح على الشاشة`, !SUCCESSY.test(auth.text))
      check(`${lang}: وصفر طلبات إنتاج`, net.prod.length === 0)
      await shoot(page, `action-${lang}-account`, errs)
    }

    // ── (د) كود التفعيل — عبر بوّابة Premium من فعل محجوب حقيقي ───────────────
    // ═══ لماذا الماء لا «ابدأ تمرين اليوم» ═══
    // بطل المُمسِك النصّي وكشف أمرين: بطلان الفحص الإنجليزي (لا زرّ بذلك النصّ
    // — اليوم يوم راحة في الخطة المولَّدة فلا بطل للشاشة)، **ومرورًا غير مستحقّ
    // في العربي**: `/ابدأ تمرين/` كانت تمسك «ابدأ تمرين فاضي» فيمرّ الفحص على
    // زرّ غير المقصود. الوسم لا يتأثّر بلغة ولا بحالة يوم.
    await page.evaluate(() => { window.location.hash = '/nutrition' })
    await settle(page, 3200)
    await page.locator('[data-testid="water-preset-250"]').first().click({ timeout: 15_000 })
    await settle(page, 1800)
    const gate = page.locator('[data-testid="premium-gate"]')
    const gateShown = await gate.isVisible().catch(() => false)
    // حين لا تظهر البوّابة نطبع ما على الشاشة فعلًا: فشل مُمسِك وفشل حماية
    // يتشابهان في السطر ويختلفان في المعنى، ولا يفرّقهما إلا هذا.
    const screen = gateShown ? '' : JSON.stringify(await page.evaluate(() => ({
      hash: location.hash,
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 12),
    })))
    check(`${lang}: فعل مدفوع يفتح بوّابة Premium`, gateShown, screen)
    if (gateShown) {
      await gate.locator('[data-testid="premium-gate-have-code"]').click({ force: true })
      await settle(page, 600)
      await page.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
      await page.locator('[data-testid="activation-code-submit"]').click({ force: true })
      await settle(page, 2600)
      const codeMsg = (await page.locator('[data-testid="activation-code-message"]').innerText().catch(() => '')).trim()
      check(`${lang}: التفعيل يردّ برسالة مرئية`, codeMsg.length > 0)
      check(`${lang}: ولا يدّعي تفعيلًا («${codeMsg}»)`, codeMsg.length > 0 && !SUCCESSY.test(codeMsg))
      check(`${lang}: ولا يستهلك كودًا حقيقيًا — صفر طلبات إنتاج`, net.prod.length === 0, net.prod.slice(0, 2).join(' · '))
      await shoot(page, `action-${lang}-activation`, errs)

      // الحكم النهائي على «هل وقع الفعل؟» يُقرأ من الحالة المخزَّنة لا من الرسالة.
      const stored = await page.evaluate(() => {
        const out = {}
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const k = window.localStorage.key(i)
          if (/entitle|premium|access|trial/i.test(k || '')) out[k] = window.localStorage.getItem(k)
        }
        return out
      })
      const claimsPaid = Object.values(stored).some((v) => /"?(active|premium|trial)"?/i.test(String(v)))
      check(`${lang}: ولا حالة مدفوعة كُتبت محلّيًا`, !claimsPaid, JSON.stringify(stored).slice(0, 160))

      // والفعل المحجوب نفسه (تسجيل الماء) لم يقع — الحكم من الحالة لا من الشاشة.
      const water = await page.evaluate(() => {
        const raw = window.localStorage.getItem('qimmah:nutrition:v2')
        return { raw: raw !== null, ml: JSON.parse(raw || '{}').waterMl ?? 0 }
      })
      check(`${lang}: ولا ماء سُجِّل — الفعل المدفوع لم يقع (${water.ml})`, water.ml === 0)
    }

    // ── (هـ) أصل البناء مرئي للمراجع بلا أدوات مطوّر ──────────────────────────
    await page.evaluate(() => { window.location.hash = '/settings' })
    await settle(page, 2800)
    // ═══ الوسم يُقرأ من الشاشة نصًّا لا يُستدَلّ عليه ═══
    // «فيه كلمة founder_preview في مكان ما» يُرضيه نصّ عابر. المطلوب **الوسم
    // نفسه**: إصدار · هاش · بيئة. ويُقارَن الهاش برأس Git الجاري، فبناءٌ بائت
    // يُنشر بوسم قديم يسقط هنا باسمه بدل أن يُقرأ كأنه الرأس.
    const label = await page.evaluate(() => {
      const m = document.body.innerText.match(/v\d+\.\d+\.\d+[^\s]*founder_preview/)
      return m ? m[0] : ''
    })
    check(`${lang}: وسم البناء ظاهر على الشاشة («${label || 'غائب'}»)`, label.length > 0)
    check(`${lang}: ويعلن البيئة founder_preview`, label.includes('founder_preview'))
    check(`${lang}: ويحمل هاش الرأس الجاري (${headSha})`, label.includes(headSha), label)
    if (label) await shoot(page, `action-${lang}-build-label`, errs)

    // ── (و) التأكيد المضادّ: هل المُراقب حيّ أصلًا؟ ───────────────────────────
    const before = net.prod.length
    await page.evaluate((h) => fetch(`https://${h}/rest/v1/entitlements`).catch(() => null), PROD_HOST)
    await settle(page, 1200)
    check(`${lang}: المُراقب صالح — نداء إنتاج متعمَّد التُقط (${before} → ${net.prod.length})`, net.prod.length === before + 1)
    check(`${lang}: وما قبله كان صفرًا حقيقيًّا لا صمتًا`, before === 0)

    check(`${lang}: لا أخطاء صفحة طوال الجولة (${errs.length})`, errs.length === 0, errs[0] || '')
    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  if (server) server.kill('SIGTERM')
}

console.log(fails.length === 0
  ? `\n✅ أمان المعاينة حيًّا: ${pass} فحصًا · 0 فشل — صفر طفرة إنتاج على كل الرحلة والأفعال`
  : `\n✗ ${fails.length} فشل:\n   ${fails.join('\n   ')}`)
process.exit(fails.length === 0 ? 0 : 1)
