// إثبات متصفح لعقد Profile: الحقيقة، المالك القانوني للبيانات، سياق الرجوع والوصولية.
// التشغيل القانوني: npm run test:e2e:profile

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { loadAppCopy, requireKey } from './lib/app-copy.mjs'

const { dataKeys } = await loadAppCopy()
const K_AUTH = requireKey(dataKeys, 'qimmah:supabase-auth:v1')
const K_ACCOUNTS = requireKey(dataKeys, 'qimmah:onboarding:accounts:v1')
const K_ONBOARDING = requireKey(dataKeys, 'qimmah:onboarding:v1')
const K_PREFS = requireKey(dataKeys, 'qimmah:prefs:v1')
const PORT = 5328
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://127.0.0.1:${PORT}`

let pass = 0
let fail = 0
const failures = []
function check(label, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

// `detached` مقصود: `npx` يولّد `vite` حفيدًا، و`preview.kill()` يقتل الغلاف
// وحده. ومع stdio مُنبَّبًا (وهو ثمن إثبات جهوزية طفلنا في BUG-023) تبقى
// الأنابيب مفتوحة على الحفيد الحيّ فلا يخرج Node أبدًا — نجاح يُطبع ثم تعليق
// إلى ما لا نهاية. المجموعة الخاصة تجعل القتل يصل الحفيد فعلًا.
const preview = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  detached: true,
})

const previewReady = preview ? new Promise((resolve, reject) => {
  let output = ''
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-4_000)
    if (/Local:\s+http:\/\/127\.0\.0\.1:\d+\//.test(output)) resolve()
  }
  preview.stdout.on('data', append)
  preview.stderr.on('data', append)
  preview.once('error', (error) => reject(new Error(`profile reliability preview failed to start: ${error.message}`)))
  preview.once('exit', (code, signal) => reject(new Error(`profile reliability preview exited before ready (${code ?? signal ?? 'unknown'})\n${output}`)))
}) : Promise.resolve()

async function waitForServer(ms = 30_000) {
  await previewReady
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* preview is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('profile reliability preview did not start')
}

function authSeed() {
  const uid = 'dddddddd-4444-4444-8444-dddddddddddd'
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    uid,
    auth: {
      access_token: 'profile-reliability-token', token_type: 'bearer', expires_in: 3600,
      expires_at: nowSec + 365 * 24 * 3600, refresh_token: 'profile-refresh',
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'profile@qimmah.app', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: { display_name: 'مراجع قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
    },
  }
}

async function seedAccount(page, language = 'ar') {
  const seeded = authSeed()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ seeded, language, keys }) => {
    localStorage.setItem(keys.auth, JSON.stringify(seeded.auth))
    localStorage.setItem(keys.accounts, JSON.stringify({ [seeded.uid]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
    localStorage.setItem(keys.prefs, JSON.stringify({ language }))
    location.hash = '#/profile'
  }, { seeded, language, keys: { auth: K_AUTH, accounts: K_ACCOUNTS, prefs: K_PREFS } })
  await page.reload({ waitUntil: 'networkidle' })
}

async function seedGuest(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate((keys) => {
    localStorage.setItem(keys.onboarding, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
    localStorage.setItem(keys.prefs, JSON.stringify({ language: 'ar' }))
    location.hash = '#/profile'
  }, { onboarding: K_ONBOARDING, prefs: K_PREFS })
  await page.reload({ waitUntil: 'networkidle' })
}

const height = (locator) => locator.evaluate((node) => node.getBoundingClientRect().height)
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined })

  const accountContext = await browser.newContext({ viewport: { width: 320, height: 780 }, locale: 'ar-SA' })
  const accountPage = await accountContext.newPage()
  const accountDiagnostics = []
  accountPage.on('pageerror', (error) => accountDiagnostics.push(`pageerror: ${error}`))
  accountPage.on('console', (message) => { if (message.type() === 'error') accountDiagnostics.push(`console: ${message.text()}`) })
  await seedAccount(accountPage)
  await accountPage.getByRole('heading', { name: 'ملفك', exact: true, level: 1 }).waitFor()

  console.log('\n=== الحساب: Profile حيّ وصادق ===')
  check('المسار المباشر بقي #/profile', await accountPage.evaluate(() => location.hash) === '#/profile')
  check('العربية تضبط lang/RTL', await accountPage.evaluate(() => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'))
  check('Profile يملك عنوان h1 واحدًا', await accountPage.locator('h1').count() === 1)
  const summary = accountPage.locator('[aria-label="ملخّص ملفك التدريبي"]')
  const summaryText = await summary.innerText()
  check('ملخّص الملف معنْون ويعرض أرقامًا عربية فقط', /[٠-٩]/.test(summaryText) && !/[0-9]/.test(summaryText), summaryText)
  check('320px بلا فيض أفقي', await accountPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))

  console.log('\n=== الإعدادات القانونية وسياق الرجوع ===')
  await accountPage.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await accountPage.getByRole('heading', { name: 'الإعدادات والخصوصية', exact: true }).waitFor()
  const profileBack = accountPage.getByRole('button', { name: 'رجوع', exact: true })
  check('زر الرجوع في شاشة Profile الفرعية 44px', await height(profileBack) >= 44)
  const switchHeights = await accountPage.getByRole('switch').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))
  check('كل مفاتيح السمة/الصحة الظاهرة أهدافها 44px', switchHeights.length >= 2 && switchHeights.every((value) => value >= 44), JSON.stringify(switchHeights))

  await accountPage.locator('[data-testid="profile-canonical-settings"]').click()
  await accountPage.getByRole('heading', { name: 'الإعدادات', exact: true }).waitFor()
  check('مدخل اللغة والوحدات والأرقام يصل #/settings القانوني', await accountPage.evaluate(() => location.hash) === '#/settings')
  await accountPage.goBack()
  await accountPage.getByRole('heading', { name: 'الإعدادات والخصوصية', exact: true }).waitFor()
  check('Back من Settings يعيد سياق Profile الداخلي نفسه', await accountPage.locator('[data-testid="profile-data-entry"]').isVisible())

  console.log('\n=== البيانات: مالك واحد ورجوع من سياقين ===')
  await accountPage.locator('[data-testid="profile-data-entry"]').click()
  await accountPage.getByRole('heading', { name: 'بياناتي', exact: true }).waitFor()
  check('بيانات Profile تستخدم لوحة النقل المحصّنة نفسها', await accountPage.locator('[data-testid="settings-data-import"]').isVisible())
  await accountPage.getByRole('button', { name: 'رجوع', exact: true }).click()
  check('رجوع البيانات من Settings يعود إلى Settings', await accountPage.locator('[data-testid="profile-data-entry"]').isVisible())

  await accountPage.locator('[data-testid="profile-privacy-entry"]').click()
  await accountPage.getByRole('heading', { name: 'الخصوصية والبيانات', exact: true }).waitFor()
  check('الحساب فقط يرى حذف الحساب النهائي', await accountPage.getByText('حذف الحساب نهائيًا', { exact: true }).isVisible())
  await accountPage.locator('[data-testid="profile-privacy-data-entry"]').click()
  await accountPage.getByRole('heading', { name: 'بياناتي', exact: true }).waitFor()
  await accountPage.getByRole('button', { name: 'رجوع', exact: true }).click()
  check('رجوع البيانات من Privacy يعود إلى Privacy لا Settings', await accountPage.getByRole('heading', { name: 'الخصوصية والبيانات', exact: true }).isVisible())
  await accountPage.locator('[data-testid="profile-account-data-action"]').click()
  await accountPage.getByRole('heading', { name: 'الإعدادات', exact: true }).waitFor()
  await accountPage.goBack()
  await accountPage.getByRole('heading', { name: 'الخصوصية والبيانات', exact: true }).waitFor()
  check('Back من إدارة الحساب يستعيد سياق Privacy', true)

  console.log('\n=== التذكيرات والوجهات الأساسية ===')
  await accountPage.getByRole('button', { name: 'رجوع', exact: true }).click()
  await accountPage.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await accountPage.locator('[data-testid="profile-reminders-entry"]').click()
  await accountPage.getByRole('heading', { name: 'التذكيرات', exact: true }).waitFor()
  const reminderSwitch = accountPage.getByRole('switch', { name: 'تفعيل التذكيرات', exact: true })
  check('مفتاح التذكيرات دلالي وصادق ومعطّل على الويب', await reminderSwitch.isDisabled())
  check('هدف مفتاح التذكيرات 44px', await height(reminderSwitch) >= 44)
  await accountPage.getByRole('button', { name: 'رجوع', exact: true }).click()
  await accountPage.getByRole('button', { name: 'رجوع', exact: true }).click()
  await accountPage.getByRole('button', { name: 'القياسات', exact: true }).click()
  await accountPage.getByRole('heading', { name: 'القياسات', exact: true }).waitFor()
  check('مدخل القياسات يفتح المسار الحقيقي', await accountPage.evaluate(() => location.hash) === '#/measurements')
  await accountPage.goBack()
  await accountPage.getByRole('heading', { name: 'ملفك', exact: true, level: 1 }).waitFor()

  console.log('\n=== English/LTR ونفس سياسة الأرقام ===')
  await accountPage.evaluate((key) => localStorage.setItem(key, JSON.stringify({ language: 'en' })), K_PREFS)
  await accountPage.reload({ waitUntil: 'networkidle' })
  await accountPage.getByRole('heading', { name: 'Profile', exact: true, level: 1 }).waitFor()
  const englishSummary = await accountPage.locator('[aria-label="Training profile summary"]').innerText()
  check('English يضبط lang/LTR', await accountPage.evaluate(() => document.documentElement.lang === 'en' && document.documentElement.dir === 'ltr'))
  check('English يحافظ على عنوان h1 واحد', await accountPage.locator('h1').count() === 1)
  check('ملخّص الإنجليزية بأرقام لاتينية بلا أرقام عربية', /[0-9]/.test(englishSummary) && !/[٠-٩]/.test(englishSummary), englishSummary)
  check('الحساب بلا أخطاء صفحة أو console', accountDiagnostics.length === 0, accountDiagnostics.join(' | '))
  await accountContext.close()

  console.log('\n=== الضيف: بيانات جهاز لا حساب وهمي ===')
  const guestContext = await browser.newContext({ viewport: { width: 320, height: 780 }, locale: 'ar-SA' })
  const guestPage = await guestContext.newPage()
  const guestDiagnostics = []
  guestPage.on('pageerror', (error) => guestDiagnostics.push(`pageerror: ${error}`))
  guestPage.on('console', (message) => { if (message.type() === 'error') guestDiagnostics.push(`console: ${message.text()}`) })
  await seedGuest(guestPage)
  await guestPage.getByRole('heading', { name: 'ملفك', exact: true, level: 1 }).waitFor()
  check('Profile متاح للتصفّح كضيف', await guestPage.evaluate(() => location.hash) === '#/profile')
  await guestPage.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click()
  await guestPage.getByRole('heading', { name: 'الإعدادات والخصوصية', exact: true }).waitFor()
  check('إعدادات الضيف لا تعرض تسجيل خروج أو حذف حساب', await guestPage.getByText('تسجيل الخروج · حذف الحساب', { exact: true }).count() === 0)
  await guestPage.locator('[data-testid="profile-privacy-entry"]').click()
  await guestPage.getByRole('heading', { name: 'الخصوصية والبيانات', exact: true }).waitFor()
  check('الضيف لا يرى وعد حذف حساب غير موجود', await guestPage.getByText('حذف الحساب نهائيًا', { exact: true }).count() === 0)
  check('الضيف يرى إدارة بيانات الجهاز الصادقة', await guestPage.getByText('إدارة بيانات هذا الجهاز', { exact: true }).isVisible())
  await guestPage.locator('[data-testid="profile-account-data-action"]').click()
  await guestPage.getByRole('heading', { name: 'الإعدادات', exact: true }).waitFor()
  check('إدارة بيانات الضيف تصل Settings الحقيقية', await guestPage.evaluate(() => location.hash) === '#/settings')
  check('الضيف بلا أخطاء صفحة أو console', guestDiagnostics.length === 0, guestDiagnostics.join(' | '))
  await guestContext.close()
} finally {
  await browser?.close().catch(() => {})
  if (preview) {
    // قتل المجموعة كاملة (الغلاف + حفيد vite)، ثم إغلاق الأنابيب حتى لا تُبقي
    // حلقة أحداث Node حيّة بعد انتهاء الإثبات.
    try { process.kill(-preview.pid, 'SIGTERM') } catch { preview.kill('SIGTERM') }
    preview.stdout?.destroy()
    preview.stderr?.destroy()
  }
}

console.log(`\n${fail === 0 ? '✅' : '❌'} profile-reliability — ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
