// Regression أمنية حقيقية لمسار #/settings (QEA-001) — قِمّة.
//
// تقود صفحة الإعدادات الكلاسيكية (SettingsView) في متصفح حقيقي (Playwright/chromium)
// فوق بناء vite preview، وتثبت:
//   ١) الاستغلال القديم يفشل: كل ملفّ معادٍ/تالف/إصدار-غير-مدعوم/تلويث-نموذج/متجر-مجهول/
//      حقن-من-حساب-آخر → يظهر خطأ، ولا تظهر رسالة نجاح، ولا يتغيّر localStorage إطلاقًا.
//   ٢) الاستيراد الصحيح ينجح: تصدير حقيقي عبر الزر → معاينة → تأكيد → «تمّ الاستيراد».
//   ٣) user A ثم user B: لا يرى B أي بقايا من بيانات A.
//   ٤) لا تسريب Token/PII في console أو في اسم/محتوى ملفّ التصدير.
//
// التشغيل:  npm run build && node scripts/e2e/settings-import-security.mjs
//   (أو مرّر PREVIEW_URL لإعادة استخدام خادم قائم.)

import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from './lib/engine.mjs'
import { loadAppCopy, requireKey, assertUnregistered } from './lib/app-copy.mjs'

// مفاتيح التخزين تُقرأ من السجلّ المركزي (src/lib/userDataKeys.ts) لا مكرّرة هنا:
// مفتاح يُحذف أو يُعاد تسميته يجب أن يُسقط الاختبار بخطأ واضح، لا أن يمرّ صامتًا.
const { dataKeys } = await loadAppCopy()
const K_AUTH = requireKey(dataKeys, 'qimmah:supabase-auth:v1')
const K_ACCOUNTS = requireKey(dataKeys, 'qimmah:onboarding:accounts:v1')
const K_STEP_GOAL = requireKey(dataKeys, 'qimmah:stepGoal:v1')
// متجر مجهول عمدًا — حمولة هجوم، لا مفتاح تطبيق.
const K_UNKNOWN_STORE = assertUnregistered(dataKeys, 'qimmah:custom-plan:v1')
/** بادئة كل مفاتيح قِمّة — مشتقّة من السجلّ لا مكتوبة يدويًا. */
const KEY_PREFIX = dataKeys[0].key.slice(0, dataKeys[0].key.indexOf(':') + 1)

const PORT = 5311
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const TMP = mkdtempSync(join(tmpdir(), 'settings-sec-'))

const UID_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const UID_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const SECRET_TOKEN = 'sk-secretaccesstoken-DEADBEEF'

let pass = 0
let fail = 0
const failures = []
function check(label, cond) {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}`) }
}

function startPreview() {
  if (EXTERNAL) return null
  return spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env })
}
async function waitForServer(ms = 30000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try { const r = await fetch(URL); if (r.ok) return true } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

/** جلسة Supabase وهمية + سجلّ حساب مُعدّ — طرف عميل بحت، بلا نداء شبكي. */
function seedInBrowser(uid, token) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    session: {
      access_token: token, token_type: 'bearer', expires_in: 3600,
      expires_at: nowSec + 365 * 24 * 3600, refresh_token: 'mock-refresh',
      user: {
        id: uid, aud: 'authenticated', role: 'authenticated', email: `sec-${uid.slice(0, 4)}@qimmah.app`,
        email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z',
        user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z',
      },
    },
    registry: { [uid]: { completedAt: '2026-01-01T00:00:00.000Z' } },
  }
}

async function gotoSettings(page, uid, token) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const { session, registry } = seedInBrowser(uid, token)
  const seed = { session, registry, kAuth: K_AUTH, kAccounts: K_ACCOUNTS }
  let seeded = false
  for (let attempt = 0; attempt < 3 && !seeded; attempt += 1) {
    try {
      await page.evaluate(({ session, registry, kAuth, kAccounts }) => {
        localStorage.setItem(kAuth, JSON.stringify(session))
        localStorage.setItem(kAccounts, JSON.stringify(registry))
      }, seed)
      seeded = true
    } catch (error) {
      // بعد الاستيراد/تبديل المالك قد يعيد التطبيق تحميل الوثيقة في نفس اللحظة.
      // أعد المحاولة فقط لسباق التنقّل؛ أي خطأ آخر يبقى فشلًا صريحًا.
      if (!String(error).includes('Execution context was destroyed') || attempt === 2) throw error
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page.waitForTimeout(150)
    }
  }
  // **لا نُسابق إعادة تحميل التطبيق نفسه — نتقارب على شرط الجاهزية.**
  //
  // زرعُ جلسةٍ لحسابٍ مختلف يجعل `reconcileAccountScope` يمسح بقايا الحساب السابق،
  // و`App.tsx:176` يفرض عندها `window.location.reload()`. فكان `page.reload()` هنا
  // يتنافس مع إعادة تحميل التطبيق المشروعة، فتُلغى إحداهما: WebKit يسمّيها
  // `Frame load interrupted`، وChromium يبتلعها بصمت — فبقي السباق مخفيًا حتى
  // شُغِّلت الأطقم على WebKit. **تنافس تنقّلين لا عطل منتج**، وقد ثبت بأن نفس الأمر
  // بلا تغيير كود يمرّ مرّةً ويسقط أخرى.
  //
  // ولذلك: تنقّل صريح واحد إلى الإعدادات، ثم **انتظار الشرط الحقيقي** (ظهور قسم
  // البيانات)، وإعادة المحاولة إن قطع التطبيق تنقّلنا. لا تأكيد يتغيّر — هذه طريقة
  // الوصول إلى الشاشة لا ما يُفحَص عليها.
  const dataGroup = page.locator('[data-testid="settings-group-data"]')
  let ready = false
  for (let attempt = 0; attempt < 5 && !ready; attempt += 1) {
    try {
      await page.goto(`${URL}/#/settings`, { waitUntil: 'domcontentloaded' })
      await dataGroup.waitFor({ state: 'visible', timeout: 8000 })
      await page.waitForLoadState('networkidle').catch(() => {})
      ready = true
    } catch (error) {
      if (attempt === 4) throw error
      await page.waitForTimeout(400)
    }
  }
  // البنية الجديدة تجعل أقسام الإعدادات مطوية. افتح «البيانات» كما يفعل المستخدم
  // بدل افتراض أن زر الاستيراد ظاهر مباشرةً في الصفحة.
  if (!(await dataGroup.evaluate((node) => (node instanceof HTMLDetailsElement ? node.open : false)))) {
    await dataGroup.locator('summary').click()
  }
  // زر الاستيراد مرئي بعد فتح القسم؛ حقل الملفّ نفسه مخفي عمدًا فننتظره «مرفقًا» فقط.
  await page.waitForSelector('[data-testid="settings-data-import"]', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[data-testid="settings-data-file"]', { state: 'attached', timeout: 15000 })
}

const snapshotLS = (page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))

function writeCase(name, content) {
  const p = join(TMP, name)
  writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content))
  return p
}

// —— ملفّات الاستغلال ——
function exploitFiles() {
  const legacyV2 = {
    version: 2, exportedAt: '2026-01-01T00:00:00.000Z',
    customization: { identity: { appName: 'PWNED' }, profile: { age: 99 }, targets: { calories: 99999 } },
    history: { workoutSessions: [{ id: 'x' }] }, preferences: { lang: 'en' },
  }
  const wrongVersion = { kind: 'qimmah-data-export', schemaVersion: 999, app: 'qimmah', appVersion: '9.9.9',
    exportedAt: '2026-01-01T00:00:00.000Z', summaryAr: '', counts: {}, stores: {}, unregistered: {} }
  const unknownStore = { kind: 'qimmah-data-export', schemaVersion: 1, app: 'qimmah', appVersion: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z', summaryAr: '', counts: {}, stores: { 'attacker-store': [1, 2, 3] }, unregistered: {} }
  // حقن من حساب آخر: خريطة مالك أجنبية في مفتاح خام غير مسجّل → يجب أن تُرفض قبل أي كتابة.
  const crossOwner = { kind: 'qimmah-data-export', schemaVersion: 1, app: 'qimmah', appVersion: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z', summaryAr: '', counts: {}, stores: {},
    unregistered: { [K_AUTH]: { access_token: 'attacker' }, [K_UNKNOWN_STORE]: { [UID_B]: { plan: {} } } } }
  return [
    ['JSON تالف', writeCase('corrupt.json', '{ this is not valid json ')],
    ['نسخة قديمة (إصدار غير مدعوم)', writeCase('legacy-v2.json', legacyV2)],
    ['إصدار مخطّط غير مدعوم (999)', writeCase('wrong-version.json', wrongVersion)],
    ['تلويث النموذج (__proto__)', writeCase('proto.json', '{"kind":"qimmah-data-export","schemaVersion":1,"app":"qimmah","appVersion":"1.0.0","exportedAt":"2026-01-01T00:00:00.000Z","summaryAr":"","counts":{},"stores":{"__proto__":{"polluted":true}},"unregistered":{}}')],
    ['متجر مجهول', writeCase('unknown-store.json', unknownStore)],
    ['حقن من حساب آخر (unregistered)', writeCase('cross-owner.json', crossOwner)],
  ]
}

async function run() {
  const proc = startPreview()
  const consoleLines = []
  let browser
  try {
    await waitForServer()
    browser = await chromium.launch()
    const page = await browser.newPage()
    page.on('console', (m) => consoleLines.push(m.text()))
    page.on('pageerror', (e) => consoleLines.push(`PAGEERROR: ${e.message}`))

    // ===== المستخدم A =====
    console.log('\n=== user A: #/settings الاستغلال القديم يجب أن يفشل ===')
    await gotoSettings(page, UID_A, SECRET_TOKEN)
    check('صفحة #/settings الكلاسيكية ظهرت (لوحة البيانات المحصّنة)', await page.locator('[data-testid="settings-data-import"]').isVisible())

    for (const [label, path] of exploitFiles()) {
      const before = await snapshotLS(page)
      await page.setInputFiles('[data-testid="settings-data-file"]', path)
      // انتظر إمّا الخطأ أو المعاينة (يجب أن يكون خطأ)
      await page.waitForTimeout(400)
      const errorVisible = await page.locator('[data-testid="settings-import-error"]').isVisible().catch(() => false)
      const previewVisible = await page.locator('[data-testid="settings-import-preview"]').isVisible().catch(() => false)
      const successVisible = await page.locator('[data-testid="settings-import-success"]').isVisible().catch(() => false)
      const after = await snapshotLS(page)
      check(`«${label}»: رُفض بخطأ`, errorVisible)
      check(`«${label}»: لم تُعرض معاينة`, !previewVisible)
      check(`«${label}»: لم تُعرض رسالة نجاح`, !successVisible)
      check(`«${label}»: localStorage لم يتغيّر`, before === after)
      // نظّف حالة الخطأ قبل الحالة التالية باختيار زر التصدير (لا يفتح معاينة)
    }

    // ===== الاستيراد الصحيح ينجح (round-trip عبر واجهة #/settings) =====
    console.log('\n=== user A: تصدير حقيقي ثم استيراده يجب أن ينجح ===')
    // ازرع متجرًا بسيطًا (هدف الخطوات) كي تحمل النسخة محتوى قابلًا للمعاينة.
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify(8000)), K_STEP_GOAL)

    // [BUG-030] مسارا التسليم ليسا واحدًا، والمحرّك هو من يختار.
    //
    // `deliverBundle` يفضّل **ورقة المشاركة الأصلية** حين تتوفّر مشاركة الملفّات، ويسقط
    // إلى تنزيل Blob حين لا تتوفّر. وWebKit/Safari **يوفّرها على أصل حقيقي** (قِيس:
    // `navigator.share` و`canShare` دالّتان على الصفحة المخدومة، لا على `about:blank`)،
    // بينما Chromium بلا رأس لا يوفّرها. فكان هذا الطقم يفترض التنزيل دائمًا ويتعلّق
    // ٣٠ ثانية على WebKit — **عمى أداة عن سلوك صحيح**، لا عطل منتج.
    //
    // فنُثبت الفرعين معًا بدل إسقاط أحدهما: أولًا أن المشاركة الأصلية تُسلَّم وتُبلَّغ
    // بصدق حيث تتوفّر، ثم نُحيّدها لنُلزم مسار التنزيل — لأن تأكيدات العزل أدناه تقرأ
    // **الملفّ المُصدَّر نفسه**، ولا بديل عنه.
    const canShareFiles = await page.evaluate(() => {
      try {
        return !!navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'a.json', { type: 'application/json' })] })
      } catch { return false }
    })
    if (canShareFiles) {
      await page.locator('[data-testid="settings-data-export"]').click()
      await page.waitForSelector('[data-testid="settings-export-note"]', { timeout: 8000 })
      const sharedOk = await page.locator('[data-testid="settings-export-note"]').isVisible()
      const noError = !(await page.locator('[data-testid="settings-import-error"]').isVisible().catch(() => false))
      check('مشاركة أصلية متاحة ⇒ التصدير يُسلَّم عبرها ويُبلَّغ نجاحًا بلا خطأ', sharedOk && noError)
    }

    /**
     * يُحيّد مشاركة الملفّات في الوثيقة الحالية فيَلزم `deliverBundle` مسار التنزيل.
     * ليس إضعافًا: يحاكي متصفّحًا بلا Web Share (وهو واقع Chromium وFirefox)، ويُبقي
     * كل تأكيدات الملفّ المُصدَّر أدناه كما هي. ويُعاد استدعاؤه بعد كل تنقّل لأن
     * التحييد يعيش في وثيقة واحدة.
     */
    const forceDownloadDelivery = (p) => p.evaluate(() => {
      try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }) } catch { /* غير قابل للتهيئة */ }
      try { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }) } catch { /* غير قابل للتهيئة */ }
    })

    await forceDownloadDelivery(page)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="settings-data-export"]').click(),
    ])
    const validPath = join(TMP, 'valid-export.json')
    await download.saveAs(validPath)
    const dlName = download.suggestedFilename()
    check('اسم ملفّ التصدير لا يحوي token/بريد', !/sk-|@qimmah|access_token/i.test(dlName))

    // غيّر القيمة محليًا لنتأكّد أن الاستيراد يستعيدها فعلًا
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify(1)), K_STEP_GOAL)
    await page.setInputFiles('[data-testid="settings-data-file"]', validPath)
    await page.waitForSelector('[data-testid="settings-import-preview"]', { timeout: 8000 })
    check('النسخة الصحيحة فتحت معاينة', await page.locator('[data-testid="settings-import-preview"]').isVisible())
    await page.locator('[data-testid="settings-import-confirm"]').click()
    await page.waitForSelector('[data-testid="settings-import-success"]', { timeout: 8000 })
    check('عُرضت «تمّ الاستيراد» بعد التطبيق الفعلي', await page.locator('[data-testid="settings-import-success"]').isVisible())
    const restored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), K_STEP_GOAL)
    check('استُعيدت القيمة الأصلية (8000) بعد الاستيراد', restored === 8000)

    // التحقّق من عدم كتابة رمز الجلسة عبر الاستيراد (لم يُمسّ auth)
    const authAfter = await page.evaluate((k) => localStorage.getItem(k), K_AUTH)
    check('رمز الجلسة لم يُستبدَل عبر الاستيراد', typeof authAfter === 'string' && authAfter.includes(UID_A))

    // ===== المستخدم B: صفر بقايا من A =====
    console.log('\n=== user B: لا بقايا من بيانات A ===')
    await page.evaluate(({ kAuth, prefix }) => {
      // حاكِ تبديل الحساب: امسح مفاتيح قِمّة عدا رمز الجلسة (كما يفعل wipeUserData عند الدخول)
      const keep = new Set([kAuth])
      for (const k of Object.keys(localStorage)) if (k.startsWith(prefix) && !keep.has(k)) localStorage.removeItem(k)
    }, { kAuth: K_AUTH, prefix: KEY_PREFIX })
    await gotoSettings(page, UID_B, 'sk-tokenB-CAFEBABE')
    const bStepGoal = await page.evaluate((k) => localStorage.getItem(k), K_STEP_GOAL)
    check('B لا يملك هدف خطوات A (صفر بقايا)', bStepGoal === null)
    // تصدير B الحقيقي يجب أن يخلو من قيمة A (8000) — إثبات العزل عبر الواجهة.
    // `gotoSettings` أعادت التحميل، فالتحييد ماتَ مع الوثيقة السابقة ويُعاد هنا.
    await forceDownloadDelivery(page)
    const [dlB] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="settings-data-export"]').click(),
    ])
    const bPath = join(TMP, 'export-b.json')
    await dlB.saveAs(bPath)
    const bJson = readFileSync(bPath, 'utf8')
    check('نسخة B لا تحوي قيمة A (8000)', !bJson.includes('8000'))
    check('نسخة B لا تحوي رمز جلسة/بريد A', !/access_token|sec-aaaa@qimmah/i.test(bJson))

    // ===== فحص تسريب console/PII =====
    console.log('\n=== فحص تسريب Token/PII في console ===')
    const leak = consoleLines.filter((l) => /sk-|access_token|refresh_token|CAFEBABE|DEADBEEF/i.test(l))
    check('لا token/سرّ في console', leak.length === 0)
    if (leak.length) leak.slice(0, 5).forEach((l) => console.log(`     leak: ${l}`))

    await browser.close()
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (proc) proc.kill('SIGTERM')
  }

  console.log(`\n${fail === 0 ? '✅' : '❌'} settings-import-security — ${pass} passed, ${fail} failed`)
  if (fail > 0) { console.log('   failed:', failures.join(' | ')); process.exit(1) }
}

mkdirSync('docs/testing/e2e', { recursive: true })
run().catch((e) => { console.error(e); process.exit(1) })
