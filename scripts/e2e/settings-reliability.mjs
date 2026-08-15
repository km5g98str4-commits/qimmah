// إثبات متصفح لعقد اللغة/الاتجاه/الوحدات/الأرقام في #/settings.
// التشغيل القانوني: npm run test:e2e:settings

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { loadAppCopy, requireKey } from './lib/app-copy.mjs'

const { dataKeys } = await loadAppCopy()
const K_AUTH = requireKey(dataKeys, 'qimmah:supabase-auth:v1')
const K_ACCOUNTS = requireKey(dataKeys, 'qimmah:onboarding:accounts:v1')
const K_PREFS = requireKey(dataKeys, 'qimmah:prefs:v1')
const PORT = 5327
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
function check(label, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const preview = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
async function waitForServer(ms = 30_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* preview is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('settings reliability preview did not start')
}

function seed() {
  const uid = 'cccccccc-3333-4333-8333-cccccccccccc'
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    uid,
    auth: {
      access_token: 'settings-reliability-token', token_type: 'bearer', expires_in: 3600,
      expires_at: nowSec + 365 * 24 * 3600, refresh_token: 'settings-refresh',
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'settings@qimmah.app', email_confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
    },
  }
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined })
  const context = await browser.newContext({ viewport: { width: 320, height: 780 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const diagnostics = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error}`))
  page.on('console', (message) => { if (message.type() === 'error') diagnostics.push(`console: ${message.text()}`) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const seeded = seed()
  // **الزرع لا يغيّر المسار، والتنقّل يقع بعد إعادة التحميل لا قبلها.**
  //
  // كان `location.hash = '#/settings'` يجري هنا فيبدأ استيراد قطعة مسار الإعدادات
  // (lazy)، ثم يقطعه `reload()` بعده مباشرةً. وWebKit يُظهر الاستيراد المقطوع
  // خطأً حقيقيًا — `TypeError: Importing a module script failed` — يلتقطه
  // `RouteErrorBoundary` فيُسجَّل في console، فيسقط تأكيد «لا أخطاء صفحة أو console».
  // Chromium يبتلع الاستيراد المُجهَض بلا خطأ، فبقي السباق مخفيًا حتى شُغِّل WebKit.
  // (قِيس: نفس الأمر مرّ ثم سقط بلا أي تغيير كود — سباق لا انحدار.)
  await page.evaluate(({ seeded, keys }) => {
    localStorage.setItem(keys.auth, JSON.stringify(seeded.auth))
    localStorage.setItem(keys.accounts, JSON.stringify({ [seeded.uid]: { completedAt: '2026-01-01T00:00:00.000Z' } }))
    localStorage.setItem(keys.prefs, JSON.stringify({ language: 'ar' }))
  }, { seeded, keys: { auth: K_AUTH, accounts: K_ACCOUNTS, prefs: K_PREFS } })
  // ولا نُسابق إعادة تحميل التطبيق نفسه: زرع جلسة حسابٍ مختلف يجعل `App.tsx:176`
  // يفرض `window.location.reload()` بعد مسح بقايا الحساب السابق. فنتقارب على شرط
  // الجاهزية بدل التنافس على تنقّل. (طريقة الوصول لا ما يُفحَص — لا تأكيد يتغيّر.)
  const policy = page.locator('[data-testid="settings-numbers-policy"]')
  let ready = false
  for (let attempt = 0; attempt < 5 && !ready; attempt += 1) {
    try {
      await page.goto(`${URL}/#/settings`, { waitUntil: 'domcontentloaded' })
      await policy.waitFor({ timeout: 8000 })
      await page.waitForLoadState('networkidle').catch(() => {})
      ready = true
    } catch (error) {
      if (attempt === 4) throw error
      await page.waitForTimeout(400)
    }
  }

  console.log('\n=== العربية: تنفيذ حيّ وسياسة صادقة ===')
  check('المسار المباشر بقي #/settings', await page.evaluate(() => location.hash) === '#/settings')
  check('document lang=ar وdir=rtl', await page.evaluate(() => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'))
  check('العنوان يجمع اللغة والوحدات والأرقام', await page.getByText('اللغة والوحدات والأرقام', { exact: true }).isVisible())
  const arSample = (await page.locator('[data-testid="settings-numbers-sample"]').innerText()).trim()
  check('العينة عربية بلا رقم لاتيني', /[٠-٩]/.test(arSample) && !/[0-9]/.test(arSample), arSample)
  const units = page.locator('[data-testid="settings-units-policy"]')
  check('الوحدات المترية معلنة بلا تحكم وهمي', /متري/.test(await units.innerText()) && await units.evaluate((node) => !node.matches('button,a,[role="button"]')))
  const dataGroup = page.locator('[data-testid="settings-group-data"]')
  check('مجموعة البيانات disclosure حقيقية ومغلقة أولًا', await dataGroup.evaluate((node) => node instanceof HTMLDetailsElement && !node.open))
  await dataGroup.locator('summary').click()
  check('فتح البيانات يكشف النقل المحصّن', await page.locator('[data-testid="settings-data-import"]').isVisible())

  console.log('\n=== English: تبديل فوري ثم حفظ بعد reload ===')
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.waitForFunction(() => document.documentElement.lang === 'en' && document.documentElement.dir === 'ltr')
  check('التبديل يحدّث lang/dir فورًا', true)
  check('العناوين تحولت للإنجليزية', await page.getByText('Language, units & numbers', { exact: true }).isVisible())
  const enSample = (await page.locator('[data-testid="settings-numbers-sample"]').innerText()).trim()
  check('العينة لاتينية بلا رقم عربي', /[0-9]/.test(enSample) && !/[٠-٩]/.test(enSample), enSample)
  check('التفضيل المحفوظ صار en', await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').language === 'en', K_PREFS))
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-testid="settings-numbers-policy"]').waitFor()
  check('reload يحفظ الإنجليزية والاتجاه LTR', await page.evaluate(() => document.documentElement.lang === 'en' && document.documentElement.dir === 'ltr'))
  check('320px بلا فيض أفقي', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
  check('لا أخطاء صفحة أو console', diagnostics.length === 0, diagnostics.join(' | '))

  await context.close()
} finally {
  await browser?.close().catch(() => {})
  preview?.kill('SIGTERM')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} settings-reliability — ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
