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
const record = (name, pass, evidence = '') => {
  results.push({ name, pass, evidence })
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
  console.log('· supabase start (قد يستغرق دقائق أول مرّة — سحب الصور)…')
  sh('npx --yes supabase start', { cwd: WORKDIR })
  const env = localSupabaseEnv() // يرمي إن لم يكن محليًا
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
  const email = randomTestEmail(0)
  assertTestEmail(email)
  const pwOld = randomPassword('Old')
  const pwNew = randomPassword('New')
  const ctx = await browser.newContext({ locale: 'ar' })
  const page = await ctx.newPage()
  try {
    await register(page, email, pwOld)
    record('إنشاء حساب تجريبي', authUserCount(email) === 1, mask(email))

    // تسجيل خروج ثم طلب الاستعادة
    await ctx.clearCookies()
    await page.context().addInitScript(() => {})
    await page.goto(`${BASE}/#/login`, { waitUntil: 'load' })
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.getByText('نسيت كلمة المرور؟', { exact: false }).first().click()
    await page.waitForTimeout(400)
    await page.locator('input[type="email"]').fill(email)
    await page.getByRole('button', { name: /إرسال رابط الاستعادة/ }).click()
    await page.waitForTimeout(1500)

    const link = await fetchRecoveryLink(email)
    record('وصول رابط الاستعادة إلى Inbucket', !!link, link ? 'link received (redacted)' : 'no email')
    if (!link) throw new Error('لم يصل رابط الاستعادة')

    // فتح الرابط الحقيقي → GoTrue verify → إعادة توجيه إلى #/reset → استبدال الرمز (H1)
    await page.goto(link, { waitUntil: 'load' })
    await page.waitForTimeout(3500)
    const onForm = (await page.locator('input[type="password"]').count()) >= 1
    record('فتح شاشة تعيين كلمة مرور جديدة (وليس expired)', onForm)
    if (!onForm) throw new Error('الرابط فتح expired بدل النموذج')

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
}

// ————————————————————————————————————————————————————————————————
// اختبار Delete Account
// ————————————————————————————————————————————————————————————————
async function testDelete(browser) {
  console.log('\n== Delete Account ==')
  const email = randomTestEmail(1)
  assertTestEmail(email)
  const pw = randomPassword('Del')
  const ctx = await browser.newContext({ locale: 'ar' })
  const page = await ctx.newPage()
  try {
    await register(page, email, pw)
    const uid = psql(`select id from auth.users where email = '${email}'`).trim()
    record('إنشاء حساب تجريبي وتسجيل الدخول', !!uid && (await isSignedIn(page)), mask(email))

    // بيانات مرتبطة لاختبار الحذف (صفوف حقيقية عبر القاعدة)
    psql(
      `insert into public.measurement_logs (user_id, local_id, date, data) ` +
        `values ('${uid}', 'e2e', current_date, '{}'::jsonb) on conflict do nothing`,
    )
    const before = appRowsCount(uid)
    record('وجود بيانات مرتبطة قبل الحذف', before >= 1, `rows=${before}`)

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
}

// ————————————————————————————————————————————————————————————————
// التشغيل
// ————————————————————————————————————————————————————————————————
let preview
let browser
let startedStack = false
try {
  requirePrereqs()
  const env = startStack()
  startedStack = true
  applySchema()
  preview = buildAndServe(env)
  await waitForApp()

  const exe = execSync('find /opt/pw-browsers -name chrome -path "*chromium-*" | head -1').toString().trim()
  browser = await chromium.launch({ executablePath: exe || undefined })

  await testReset(browser)
  await testDelete(browser)
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

// التقرير
const passed = results.filter((r) => r.pass).length
const failed = results.length - passed
console.log(`\n==== النتيجة: ${passed}/${results.length} PASS ====`)
const resetPass = results.filter((r) => r.name.includes('كلمة المرور') || r.name.includes('الاستعادة') || r.name.includes('تعيين')).every((r) => r.pass)
console.log(`Reset Password: ${results.length && resetPass ? 'PASS' : 'FAIL/INCOMPLETE'}`)
console.log(`Delete Account: ${results.some((r) => r.name.includes('auth.users')) && results.filter((r) => r.name.includes('حذف') || r.name.includes('الدخول بعد')).every((r) => r.pass) ? 'PASS' : 'FAIL/INCOMPLETE'}`)
process.exit(failed === 0 && results.length > 0 ? 0 : 1)
