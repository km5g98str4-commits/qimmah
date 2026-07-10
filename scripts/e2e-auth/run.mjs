// اختبار المصادقة الحيّ الكامل: Reset Password + Delete Account على Supabase محلي.
//
// يشغّل مكدّس Supabase محلي (Postgres + GoTrue + Inbucket)، يطبّق المخطط الحقيقي
// (SUPABASE-SCHEMA.sql بما فيه delete_own_account)، يبني التطبيق موجَّهًا للمكدّس المحلي،
// ثم يقود التدفّقين من نفس مسار التطبيق ويتحقّق من القاعدة مباشرة. تنظيف تلقائي دائمًا.
//
// ⚠️ لا يعمل إلا محليًا (حواجز lib.mjs). يفشل فورًا إن كان الهدف إنتاجًا.
// المتطلّبات: docker daemon يعمل + صور Supabase قابلة للسحب + supabase CLI + psql.

import { execSync, spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import {
  LOCAL,
  assertLocalTarget,
  assertTestEmail,
  randomTestEmail,
  randomPassword,
  fetchRecoveryLink,
  authUserCount,
  appRowsCount,
  cleanupTestUsers,
  localSupabaseEnv,
  psql,
  sleep,
} from './lib.mjs'

const PREVIEW_PORT = 4321
const WORKDIR = 'scripts/e2e-auth/.workdir'
const mask = (e) => e.replace(/^(.{6}).*(@.*)$/, '$1***$2')
const results = []
let currentFlow = ''
const record = (name, pass, evidence = '') => {
  results.push({ name, pass, evidence, flow: currentFlow })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${evidence ? `  — ${evidence}` : ''}`)
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit', ...opts })
}
function toolOk(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// ————————————————————————————————————————————————————————————————
// 0) بوابة المتطلّبات — بلا Docker/صور لا نُشغّل ولا نزيّف نجاحًا.
// ————————————————————————————————————————————————————————————————
function canPullImages() {
  // فحص سريع: هل تنزيل طبقات الصور متاح؟ (CDN صور Docker قد يكون محجوبًا رغم عمل الـ daemon.)
  try {
    execSync('docker pull hello-world:latest', { stdio: 'pipe', timeout: 60000 })
    return true
  } catch {
    return false
  }
}
function requirePrereqs() {
  const dockerUp = toolOk('docker info')
  const psqlOk = toolOk('which psql')
  const cliOk = toolOk('npx --yes supabase --version')
  const imagesOk = dockerUp ? canPullImages() : false
  if (!dockerUp || !psqlOk || !imagesOk) {
    console.error('\n⛔ BLOCKED — لا يمكن تشغيل الاختبار الحيّ الآن:')
    if (!dockerUp) console.error('   • Docker daemon متوقّف.')
    else if (!imagesOk) console.error('   • سحب صور Docker محجوب — طبقات الصور تُخدَّم من CDN مقفل في سياسة الشبكة (production.cloudfront.docker.com / production.cloudflare.docker.com).')
    if (!psqlOk) console.error('   • psql غير متاح.')
    if (!cliOk) console.error('   • supabase CLI غير متاح (يُثبَّت تلقائيًا لكنه يحتاج Docker).')
    console.error('\nالمطلوب لفكّ الحجب: فتح CDN صور Docker (production.cloudfront.docker.com,')
    console.error('production.cloudflare.docker.com, *.docker.io, ghcr.io) — ثم أعد التشغيل.')
    console.error('لم يُسجَّل أي PASS. الحزمة جاهزة وتعمل فور توفّر الوصول.\n')
    process.exit(2)
  }
}

// ————————————————————————————————————————————————————————————————
// إعداد المكدّس المحلي
// ————————————————————————————————————————————————————————————————
function startStack() {
  rmSync(WORKDIR, { recursive: true, force: true })
  mkdirSync(`${WORKDIR}/supabase`, { recursive: true })
  cpSync('scripts/e2e-auth/supabase-config.toml', `${WORKDIR}/supabase/config.toml`)
  // نُشغّل فقط خدمات المصادقة: db + auth(gotrue) + kong(بوابة) + inbucket(mailpit للبريد).
  // نستثني البقية (لوحة/تخزين/REST/وقت-حافة/تحليلات/…) لأنها غير لازمة لاختبار المصادقة،
  // وبعض صورها غير متاحة عبر المرآة. auth دائمًا يعمل (ليس ضمن قائمة الاستثناء).
  // الحدّ الأدنى لخدمات المصادقة فقط: db(أساسي) + auth(gotrue) + kong(بوابة) + mailpit(بريد).
  // نستثني كل ما عداها — غير لازم للمصادقة، وبعض حاوياته (edge-runtime) تفشل في ضبط rlimit
  // داخل حاوية-ضمن-حاوية (operation not permitted)، فاستثناؤها يتفادى ذلك.
  // نُبقي: db + auth(gotrue) + kong + inbucket(mailpit) + rest(postgrest للـ RPC والحذف)
  // + analytics(logflare) + vector (سلسلة السجلّات لصحّة الخدمات). نستثني ما لا يلزم أو يفشل:
  // edge-runtime (rlimit)، imgproxy/storage (غير لازمة)، studio/realtime/supavisor.
  // نُبقي فقط ما يلزم للمصادقة/الاستعادة/الحذف: db + auth(gotrue) + kong + inbucket(mailpit)
  // + rest(postgrest للـ RPC والحذف). نستثني بقية الخدمات — غير لازمة، وبعضها (logflare/vector/
  // postgres-meta) يظهر غير سليم أحيانًا فيمنع إقلاع المكدّس. لا حاجة لها هنا.
  const EXCLUDE = 'edge-runtime,imgproxy,storage-api,studio,realtime,supavisor,logflare,vector,postgres-meta'
  console.log('· supabase start (خدمات المصادقة فقط)…')
  sh(`npx --yes supabase start -x ${EXCLUDE}`, { cwd: WORKDIR })
  const env = localSupabaseEnv(WORKDIR) // يرمي إن لم يكن محليًا
  assertLocalTarget(env.url, env.anon)
  return env
}

function applySchema() {
  console.log('· تطبيق SUPABASE-SCHEMA.sql على القاعدة المحلية (جداول + RLS + delete_own_account)…')
  sh(`psql "${LOCAL.db}" -v ON_ERROR_STOP=1 -f SUPABASE-SCHEMA.sql`, { quiet: true })
}

function buildAndServe(env) {
  console.log('· بناء التطبيق موجَّهًا للمكدّس المحلي…')
  sh('npm run build', { quiet: true, env: { ...process.env, VITE_SUPABASE_URL: env.url, VITE_SUPABASE_ANON_KEY: env.anon } })
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT)], { stdio: 'ignore' })
  return preview
}

async function waitForApp() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(`http://localhost:${PREVIEW_PORT}/`)
      if (r.ok) return true
    } catch {
      /* ما زال يُقلع */
    }
    await sleep(500)
  }
  throw new Error('تعذّر إقلاع vite preview.')
}

// ————————————————————————————————————————————————————————————————
// أدوات واجهة (نصوص عربية مطابقة للتطبيق)
// ————————————————————————————————————————————————————————————————
const BASE = `http://localhost:${PREVIEW_PORT}`
async function register(page, email, password) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.getByText('أنشئ حسابًا', { exact: false }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  await page.locator('input[type="text"]').first().fill('اختبار').catch(() => {})
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /إنشاء حساب/ }).click()
  await page.waitForTimeout(2500)
}
async function login(page, email, password) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click()
  await page.waitForTimeout(2500)
}
async function isSignedIn(page) {
  // مسجّل الدخول إذا لم نعد على شاشة الحساب (لا يوجد حقل بريد).
  return (await page.locator('input[type="email"]').count()) === 0
}

// ————————————————————————————————————————————————————————————————
// اختبار Reset Password
// ————————————————————————————————————————————————————————————————
async function testReset(browser) {
  console.log('\n== Reset Password ==')
  currentFlow = 'reset'
  const email = randomTestEmail(0)
  assertTestEmail(email)
  const pwOld = randomPassword('Old')
  const pwNew = randomPassword('New')
  const ctx = await browser.newContext({ locale: 'ar' })
  const page = await ctx.newPage()
  const consoleErrors = []
  const failedResponses = []
  const redact = (s) => s.replace(/((?:access_token|code|token|refresh_token|apikey)=)[^&#\s"']+/g, '$1<redacted>')
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(redact(m.text()).slice(0, 200)) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + redact(e.message).slice(0, 200)))
  page.on('response', (r) => {
    if (r.status() >= 400) {
      // مسار الطلب فقط (بلا استعلام يحمل رموزًا) + الحالة.
      const path = r.url().split('?')[0].replace(/^https?:\/\/[^/]+/, '')
      failedResponses.push(`${r.status()} ${r.request().method()} ${path}`)
    }
  })
  try {
    // MINOR-1: رابط استعادة مشوّه (ترميز percent فاسد «%zz») يجب ألّا يُعلّق الشاشة على
    // «جارٍ التحقّق» — تظهر حالة «الرابط لم يعد صالحًا» الهادئة. تحميل مستند جديد كليًّا
    // (كنقرة بريد حقيقية) ليُلتقط العنوان في snapshot الإقلاع.
    await page.goto('about:blank')
    await page.goto(`${BASE}/#/reset#access_token=%zz&refresh_token=x`, { waitUntil: 'load' })
    const expiredShown = await page
      .getByText('الرابط لم يعد صالحًا', { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false)
    record('رابط مشوّه لا يعلّق الشاشة (تظهر حالة «منتهٍ»)', expiredShown)

    await register(page, email, pwOld)
    record('إنشاء حساب تجريبي', authUserCount(email) === 1, mask(email))

    // تسجيل خروج حقيقي: مسح جلسة supabase من التخزين المحلي ثم فتح شاشة الحساب نظيفة.
    await page.goto(`${BASE}/#/login`, { waitUntil: 'load' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.getByText('نسيت كلمة المرور؟', { exact: false }).first().click()
    await page.waitForTimeout(400)
    await page.locator('input[type="email"]').fill(email)
    await page.getByRole('button', { name: /إرسال رابط الاستعادة/ }).click()
    await page.waitForTimeout(1500)

    const link = await fetchRecoveryLink(email)
    record('وصول رابط الاستعادة إلى Inbucket', !!link, link ? 'link received (redacted)' : 'no email')
    if (!link) throw new Error('لم يصل رابط الاستعادة')

    // خطوة verify عبر الخادم (Node) — تمامًا كما يفعل المتصفّح عند فتح الرابط، لكن fetch من
    // Node يصل بوابة كونغ بثبات (بينما تنقّل المتصفّح المباشر لنقطة verify يُعاد ضبطه في هذه
    // البيئة المعزولة). نلتقط وجهة إعادة التوجيه (تحمل code/الرموز) ثم نفتحها في المتصفّح الذي
    // يملك code_verifier فيُكمل التبادل (H1). محاكاة أمينة لسلسلة البريد→verify→تطبيق.
    let dest = null
    let verifyStatus = 0
    try {
      const vr = await fetch(link, { redirect: 'manual' })
      verifyStatus = vr.status
      dest = vr.headers.get('location')
    } catch (e) {
      console.log(`    · verify fetch error: ${e.message}`)
    }
    const destRedacted = (dest || '').replace(/((?:access_token|code|token|refresh_token)=)[^&#]+/g, '$1<redacted>')
    console.log(`    · GoTrue verify status: ${verifyStatus}  → ${destRedacted || '(no redirect)'}`)
    record('verify يعيد التوجيه لوجهة التطبيق (لا خطأ)', !!dest && /localhost:4321|127\.0\.0\.1:4321/.test(dest))
    if (!dest) throw new Error(`verify لم يُعِد وجهة (status=${verifyStatus})`)

    const appUrl = dest.startsWith('http') ? dest : `${BASE}${dest}`

    // إجبار تحميل مستند جديد كليًّا: زيارة رابط الاستعادة تغيّر الـ hash فقط على تطبيق
    // صفحة-واحدة مُحمَّل مسبقًا (نفس الأصل)، فلا يُعاد تقييم حزمة JS ولا تُلتقط رموز الرابط.
    // المستخدم الحقيقي يفتح الرابط في تحميل جديد؛ نحاكي ذلك عبر about:blank ثم الوجهة.
    await page.goto('about:blank')
    await page.goto(appUrl, { waitUntil: 'load' })
    await page.waitForTimeout(3500)
    let sessionAppeared = false
    for (let i = 0; i < 16; i++) {
      sessionAppeared = await page.evaluate(() =>
        Object.keys(localStorage).some((k) => k.includes('supabase-auth') && (localStorage.getItem(k) || '').includes('access_token')),
      )
      if (sessionAppeared) break
      await page.waitForTimeout(500)
    }
    console.log(`    · session appeared in storage within ~8s: ${sessionAppeared}`)
    if (consoleErrors.length) console.log(`    · console errors: ${JSON.stringify(consoleErrors.slice(0, 4))}`)
    if (failedResponses.length) console.log(`    · failed requests: ${JSON.stringify([...new Set(failedResponses)].slice(0, 6))}`)
    const onForm = (await page.locator('input[type="password"]').count()) >= 1
    record('فتح شاشة تعيين كلمة مرور جديدة (وليس expired)', onForm)
    if (!onForm) throw new Error(`الرابط فتح expired بدل النموذج (sessionAppeared=${sessionAppeared})`)

    // تعيين كلمة مرور جديدة
    const pwFields = page.locator('input[type="password"]')
    await pwFields.nth(0).fill(pwNew)
    await pwFields.nth(1).fill(pwNew)
    await page.getByRole('button', { name: /حفظ كلمة المرور/ }).click()
    await page.waitForTimeout(2500)
    const success = await page.getByText('تم تحديث كلمة المرور', { exact: false }).count()
    record('حالة نجاح تعيين كلمة المرور', success > 0)

    // الدخول بالجديدة ينجح
    await login(page, email, pwNew)
    record('الدخول بكلمة المرور الجديدة ينجح', await isSignedIn(page))

    // الدخول بالقديمة يفشل
    await page.evaluate(() => localStorage.clear())
    await login(page, email, pwOld)
    record('الدخول بكلمة المرور القديمة يفشل', !(await isSignedIn(page)))
  } finally {
    await ctx.close()
  }
  // نجاح التدفّق = كل خطواته سُجّلت ومرّت (وقد سُجّلت خطوات فعلًا).
  const steps = results.filter((r) => r.flow === 'reset')
  return steps.length >= 6 && steps.every((r) => r.pass)
}

// ————————————————————————————————————————————————————————————————
// اختبار Delete Account
// ————————————————————————————————————————————————————————————————
async function testDelete(browser) {
  console.log('\n== Delete Account ==')
  currentFlow = 'delete'
  const email = randomTestEmail(1)
  assertTestEmail(email)
  const pw = randomPassword('Del')
  const ctx = await browser.newContext({ locale: 'ar' })
  const page = await ctx.newPage()
  try {
    await register(page, email, pw)
    const uid = psql(`select id from auth.users where email = '${email}'`).trim()
    record('إنشاء حساب تجريبي (موجود في auth.users)', !!uid, mask(email))

    // صفّ profiles يُنشأ تلقائيًا عبر trigger handle_new_user عند التسجيل — بيانات مرتبطة حقيقية.
    const before = appRowsCount(uid)
    record('وجود بيانات مرتبطة قبل الحذف (profiles)', before >= 1, `rows=${before}`)

    // Settings → حذف الحساب: Cancel أولًا
    await page.goto(`${BASE}/#/settings`, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'حذف الحساب', exact: true }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'إلغاء', exact: true }).click()
    await page.waitForTimeout(400)
    record('زر الإلغاء يُغلق التأكيد', (await page.locator('#delete-confirm').count()) === 0)

    // إعادة الفتح ثم التأكيد بكتابة الكلمة
    await page.getByRole('button', { name: 'حذف الحساب', exact: true }).first().click()
    await page.waitForTimeout(400)
    await page.locator('#delete-confirm').fill('حذف')
    await page.getByRole('button', { name: /حذف حسابي نهائيًا/ }).click()
    // الحذف يُنهي بإعادة تحميل الصفحة لشاشة الحساب
    await page.waitForTimeout(4000)

    // تحقّق مباشر من القاعدة
    const authGone = authUserCount(email) === 0
    const rowsGone = appRowsCount(uid) === 0
    record('حذف مستخدم المصادقة من auth.users', authGone)
    record('حذف كل صفوف بيانات المستخدم (cascade)', rowsGone, `rows=${appRowsCount(uid)}`)

    // الدخول بعد الحذف يفشل
    await page.evaluate(() => localStorage.clear()).catch(() => {})
    await login(page, email, pw)
    record('الدخول بعد الحذف يفشل', !(await isSignedIn(page)))
  } finally {
    await ctx.close()
  }
  const steps = results.filter((r) => r.flow === 'delete')
  return steps.length >= 6 && steps.every((r) => r.pass)
}

// ————————————————————————————————————————————————————————————————
// التشغيل
// ————————————————————————————————————————————————————————————————
let preview
let browser
let startedStack = false
let resetResult = 'DID NOT RUN'
let deleteResult = 'DID NOT RUN'
try {
  requirePrereqs()
  const env = startStack()
  startedStack = true
  applySchema()
  preview = buildAndServe(env)
  await waitForApp()

  const exe = execSync('find /opt/pw-browsers -name chrome -path "*chromium-*" | head -1').toString().trim()
  browser = await chromium.launch({ executablePath: exe || undefined })

  // تدفّقان مستقلّان: فشل أحدهما لا يمنع تشغيل الآخر.
  resetResult = (await testReset(browser).catch((e) => { console.error('✖ reset:', e.message); return false })) ? 'PASS' : 'FAIL'
  deleteResult = (await testDelete(browser).catch((e) => { console.error('✖ delete:', e.message); return false })) ? 'PASS' : 'FAIL'
} catch (e) {
  console.error('\n✖ خطأ أثناء الاختبار:', e.message)
  results.push({ name: 'تشغيل الحزمة', pass: false, evidence: e.message })
} finally {
  // تنظيف تلقائي دائمًا (حتى عند الفشل)
  try {
    if (browser) await browser.close()
  } catch {}
  try {
    if (preview) preview.kill()
  } catch {}
  if (startedStack) {
    try {
      const n = cleanupTestUsers()
      console.log(`\n· تنظيف حسابات الاختبار: ${n >= 0 ? n : 'تعذّر'}`)
    } catch {}
    try {
      execSync('npx --yes supabase stop --no-backup', { cwd: WORKDIR, stdio: 'pipe' })
    } catch {}
  }
  rmSync(WORKDIR, { recursive: true, force: true })
}

// التقرير — صادق: لا يُعلن PASS لتدفّق لم يُشغَّل فعلًا.
const passed = results.filter((r) => r.pass).length
console.log(`\n==== خطوات مُنفَّذة: ${passed}/${results.length} PASS ====`)
console.log(`Reset Password: ${resetResult}`)
console.log(`Delete Account: ${deleteResult}`)
const bothPass = resetResult === 'PASS' && deleteResult === 'PASS'
process.exit(bothPass ? 0 : 1)
