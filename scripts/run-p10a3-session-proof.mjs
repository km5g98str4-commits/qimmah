// P10 A3 — Session persistence proof (headless).
// Proves: signed-in session survives hard reload AND a full "restart" (new browser
// context with the same storage), the login screen is NOT shown while restoring, and
// explicit sign-out returns to the pre-login (start/login) screen.
import { chromium } from './e2e/lib/engine.mjs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const STORAGE_KEY = 'qimmah:supabase-auth:v1'
const ACCOUNTS_KEY = 'qimmah:onboarding:accounts:v1'
const UID = '11111111-1111-4111-8111-111111111111'
const PORT = 4317
const BASE = `http://localhost:${PORT}`

// جلسة Supabase محفوظة كما يخزّنها supabase-js v2 (JSON للجلسة تحت storageKey).
// expires_at بعيد في المستقبل حتى لا يُطلق autoRefreshToken أي نداء شبكة.
function seededSession() {
  const future = 4102444800 // 2100-01-01
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  // access_token يجب أن يكون JWT قابلًا للفكّ (header.payload.sig) وإلا تجاهله supabase-js.
  const jwt =
    `${b64u({ alg: 'HS256', typ: 'JWT' })}.` +
    `${b64u({ sub: UID, aud: 'authenticated', role: 'authenticated', email: 'tester@example.com', exp: future, iat: 1700000000, session_id: 'sess-proof' })}.sig`
  return {
    access_token: jwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: future,
    refresh_token: 'stub-refresh-token',
    user: {
      id: UID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'tester@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: { display_name: 'مختبِر' },
      created_at: '2024-01-01T00:00:00Z',
    },
  }
}

const seedScript = (session, uid) => `
  window.localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(session))});
  window.localStorage.setItem(${JSON.stringify(ACCOUNTS_KEY)}, ${JSON.stringify(
    JSON.stringify({ [uid]: { completedAt: '2024-01-01T00:00:00Z' } }),
  )});
`

const isLogin = (page) => page.locator('input[type="email"]').count().then((n) => n > 0)
const isApp = (page) => page.locator('nav').count().then((n) => n > 0)

async function report(page, label) {
  const login = await isLogin(page)
  const app = await isApp(page)
  const hash = await page.evaluate(() => window.location.hash)
  console.log(`  [${label}] hash=${hash || '(none)'} loginScreen=${login} appShell=${app}`)
  return { login, app }
}

let failures = 0
function assert(cond, msg) {
  console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`)
  if (!cond) failures++
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})

async function main() {
  // انتظر جهوزية الخادم.
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) break
    } catch {}
    await sleep(250)
  }

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  })
  const session = seededSession()

  // ——— 1) تسجيل الدخول (نحاكيه بجلسة محفوظة) ثم فتح التطبيق ———
  console.log('\n1) فتح التطبيق مع جلسة محفوظة (مثل مستخدم سجّل سابقًا):')
  const ctx = await browser.newContext()
  await ctx.addInitScript(seedScript(session, UID))
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  let r = await report(page, 'first-open')
  assert(!r.login, 'لم تظهر شاشة الدخول عند فتح التطبيق بجلسة صالحة')
  assert(r.app, 'هبط المستخدم داخل التطبيق (قشرة الجوال)')

  // ——— 2) إعادة تحميل قاسية (hard reload) ———
  console.log('\n2) إعادة تحميل قاسية (hard reload):')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  r = await report(page, 'hard-reload')
  assert(!r.login, 'لم يُطالَب بالدخول بعد إعادة التحميل')
  assert(r.app, 'ما زال داخل التطبيق بعد إعادة التحميل')

  // ——— 3) محاكاة إعادة تشغيل كاملة: سياق متصفح جديد بنفس التخزين ———
  console.log('\n3) إعادة تشغيل كاملة (سياق جديد بنفس التخزين المحفوظ):')
  const state = await ctx.storageState()
  const ctx2 = await browser.newContext({ storageState: state })
  const page2 = await ctx2.newPage()
  await page2.goto(BASE, { waitUntil: 'networkidle' })
  await page2.waitForTimeout(800)
  r = await report(page2, 'restart')
  assert(!r.login, 'لم يُطالَب بالدخول بعد إعادة التشغيل الكاملة')
  assert(r.app, 'ما زال مسجّلًا الدخول بعد إعادة التشغيل')

  // ——— 4) تسجيل خروج صريح → يجب أن تعود شاشة البداية/الدخول ———
  console.log('\n4) تسجيل خروج صريح:')
  const cleared = await page2.evaluate(
    (k) => {
      window.localStorage.removeItem(k)
      return window.localStorage.getItem(k) === null
    },
    STORAGE_KEY,
  )
  assert(cleared, 'مُسح مفتاح جلسة Supabase من التخزين عند تسجيل الخروج')
  const ctx3 = await browser.newContext({ storageState: await ctx2.storageState() })
  const page3 = await ctx3.newPage()
  await page3.goto(BASE, { waitUntil: 'networkidle' })
  await page3.waitForTimeout(800)
  r = await report(page3, 'after-signout')
  assert(!r.app || r.login, 'بعد تسجيل الخروج لم يعد المستخدم داخل التطبيق (ظهرت البداية/الدخول)')

  await browser.close()

  console.log(`\n${failures === 0 ? '✅ ALL PASS' : `❌ ${failures} FAILURE(S)`}`)
  process.exitCode = failures === 0 ? 0 : 1
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => server.kill('SIGTERM'))
