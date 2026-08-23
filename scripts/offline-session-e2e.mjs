// QEA-003 — إثبات دون اتصال حقيقي (لا رياضيات فقط): تثبيت متصل → بدء جلسة تمرين →
// قطع الشبكة → خلفية دقيقتين → إعادة تحميل → إعادة تشغيل السياق (يحاكي إغلاق/فتح
// التطبيق) → التحقّق من استعادة الجلسة دون فقد بيانات أو شاشة بيضاء.
//
// يبني بنفسه إلى مجلّد مخرجات مؤقّت (لا 'dist' الثابت — يثبت إصلاح QEA-003 لسدّاد
// swVersionPlugin على build.outDir الفعلي) ثم يخدمه عبر `vite preview`، فيسجَّل عامل
// الخدمة فعليًا (import.meta.env.PROD محقونة وقت البناء). سياق Playwright **دائم**
// (launchPersistentContext) بمجلّد بيانات مستخدم حقيقي — إغلاقه وإعادة فتحه يحاكي
// «إعادة تشغيل العملية» بصدق (سياق عادي يمسح كل التخزين عند الإغلاق).
//
// مجلّد الأدلة قابل للحقن (EVIDENCE_DIR أو أول معامل سطر أوامر) — لا كتابة في مسار ثابت.
//
// التشغيل:
//   node scripts/offline-session-e2e.mjs [evidenceDir]
//   EVIDENCE_DIR=/tmp/my-evidence node scripts/offline-session-e2e.mjs

import { spawn } from 'node:child_process'
import { chromium } from './e2e/lib/engine.mjs'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { completeOnboarding, seedMockSession } from './lib/onboarding-driver.mjs'

const EVIDENCE_DIR = resolve(process.argv[2] || process.env.EVIDENCE_DIR || join(tmpdir(), `qimmah-offline-evidence-${Date.now()}`))
mkdirSync(EVIDENCE_DIR, { recursive: true })

const PORT = 5193
const URL = `http://localhost:${PORT}`
const BACKGROUND_MS = 2 * 60 * 1000 // «خلفية دقيقتين» — انتظار حقيقي، لا محاكاة للساعة.

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

let previewProc
let context
try {
  // ————— ١) بناء إلى مخرج مؤقّت (لا dist الثابت) — يمارس إصلاح QEA-003 فعليًا. —————
  const buildOutDir = mkdtempSync(join(tmpdir(), 'qimmah-offline-build-'))
  console.log(`— بناء flagless إلى مخرج مؤقّت: ${buildOutDir} —`)
  await new Promise((res, rej) => {
    const p = spawn('npx', ['vite', 'build', '--outDir', buildOutDir], { stdio: 'inherit', env: { ...process.env, VITE_DESIGN_V2: 'true' } })
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))))
  })
  check('البناء إلى مخرج مؤقّت نجح (لا dist ثابت)', true, buildOutDir)

  const swPath = join(buildOutDir, 'sw.js')
  const swContent = await import('node:fs').then((fs) => fs.readFileSync(swPath, 'utf-8'))
  check('sw.js في المخرج المؤقّت خالٍ من العناصر النائبة (QEA-003 مُصلَح)', !swContent.includes('__SW_VERSION__') && !swContent.includes('__SW_PRECACHE_ASSETS__'))

  // ————— ٢) تقديم عبر vite preview — PROD=true محقونة وقت البناء فيُسجَّل SW فعليًا. —————
  previewProc = spawn('npx', ['vite', 'preview', '--outDir', buildOutDir, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((res, rej) => {
    const start = Date.now()
    const poll = async () => {
      try { const r = await fetch(URL); if (r.ok) return res() } catch {}
      if (Date.now() - start > 20000) return rej(new Error('preview did not start'))
      setTimeout(poll, 300)
    }
    poll()
  })

  // ————— ٣) سياق Playwright دائم (مجلّد بيانات مستخدم حقيقي) — إغلاقه/إعادة فتحه = «إعادة تشغيل». —————
  const userDataDir = mkdtempSync(join(tmpdir(), 'qimmah-offline-profile-'))
  context = await chromium.launchPersistentContext(userDataDir, {
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ar',
  })
  let page = await context.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('response', (r) => { if (r.status() === 401) console.log('  [DIAG 401]', r.url()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

  // ————— ٤) تثبيت متصل: زيارة أولى + انتظار جهوزية عامل الخدمة فعليًا. —————
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported'
    try {
      await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))])
      return 'ready'
    } catch (e) {
      return 'timeout: ' + e.message
    }
  })
  check('عامل الخدمة أصبح جاهزًا فعليًا (تثبيت متصل)', swReady === 'ready', swReady)

  // ————— ٥) بدء جلسة تمرين وهي متّصلة — جلسة حقيقية (لا بيانات وهمية) عبر واجهة التطبيق. —————
  const uid = 'offline-qa-user-0001'
  await page.evaluate((s) => localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(s)), seedMockSession(uid))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)
  const onboarded = await completeOnboarding(page)
  check('الإعداد اكتمل (جاهز لبدء تمرين)', onboarded)

  await page.goto(`${URL}/#/workout`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  const startSession = page.getByRole('button', { name: /ابدأ الجلسة|Start session/ }).first()
  const sessionStarted = await startSession.click({ timeout: 3000 }).then(() => true).catch(() => false)
  await page.waitForTimeout(400)
  const startExercise = page.getByRole('button', { name: /ابدأ التمرين|Start exercise/ }).first()
  await startExercise.click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(400)
  const completeSet = page.getByRole('button', { name: /أنهِ المجموعة|Complete set/ }).first()
  const setLogged = await completeSet.click({ timeout: 3000 }).then(() => true).catch(() => false)
  check('جلسة التمرين بدأت فعليًا (متّصل)', sessionStarted && setLogged)
  // انتظار قصير: أثر React الذي يكتب الجلسة النشطة في localStorage يعمل بعد إعادة الرسم،
  // لا فور معالج النقر مباشرة — قراءة فورية بلا انتظار تُنتج سلبيًا كاذبًا هنا.
  await page.waitForTimeout(500)

  const activeKeySnapshot = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('qimmah:active-workout:v2')))
  check('مفتاح الجلسة النشطة موجود في التخزين قبل قطع الشبكة', Boolean(activeKeySnapshot), activeKeySnapshot || '(none)')

  // ————— ٦) قطع الشبكة فعليًا (لا محاكاة) — ثم خلفية حقيقية دقيقتين. —————
  await context.setOffline(true)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { value: true, configurable: true }))
  console.log(`— خلفية حقيقية ${BACKGROUND_MS / 1000} ثانية (بلا اتصال) — انتظار... —`)
  await page.waitForTimeout(BACKGROUND_MS)
  check('انقضت الخلفية بلا اتصال (دقيقتان) بلا انهيار الصفحة', !page.isClosed())

  // ————— ٧) إعادة تحميل وهي دون اتصال — يجب ألّا تظهر شاشة بيضاء أو خطأ متصفّح. —————
  let reloadOk = true
  let reloadErrorText = ''
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
  } catch (e) {
    reloadOk = false
    reloadErrorText = e.message
  }
  await page.waitForTimeout(1200)
  const bodyAfterReload = await page.locator('body').innerText().catch(() => '')
  const isWhiteScreen = bodyAfterReload.trim().length < 5
  check('إعادة التحميل دون اتصال نجحت (لا ERR_INTERNET_DISCONNECTED)', reloadOk, reloadErrorText)
  check('لا شاشة بيضاء بعد إعادة التحميل دون اتصال', !isWhiteScreen, `طول النص: ${bodyAfterReload.trim().length}`)
  const resumedAfterReload = /أنهِ المجموعة|Complete set|التمرين \d+ من \d+|Exercise \d+ of \d+/.test(bodyAfterReload)
  check('الجلسة النشطة استُعيدت مباشرة بعد إعادة التحميل (لا رجوع لشاشة البداية)', resumedAfterReload, bodyAfterReload.slice(0, 80).replace(/\n/g, ' | '))

  // ————— ٨) محاكاة «إعادة تشغيل العملية»: إغلاق السياق بالكامل ثم إعادة فتحه بنفس ملف
  //         بيانات المستخدم — لا يزال دون اتصال. يثبت أن الاستعادة تعتمد التخزين الدائم
  //         (localStorage/IndexedDB) لا حالة الذاكرة العابرة لعلامة تبويب واحدة. —————
  // مهلة استقرار قبل الإغلاق: تمنح Chromium فرصة لتفريغ كتابات localStorage المعلَّقة إلى
  // القرص (ملف بيانات المستخدم الدائم) قبل إنهاء العملية — إغلاق فوري بلا مهلة قد يُسابق
  // التفريغ الفعلي فينتج فقدًا ظاهريًا مصدره توقيت المتصفّح لا سلوك التطبيق.
  const activeKeyBeforeClose = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('qimmah:active-workout:v2')))
  check('مفتاح الجلسة النشطة موجود قبل إغلاق السياق (تأكيد إضافي)', Boolean(activeKeyBeforeClose), activeKeyBeforeClose || '(none)')
  await page.waitForTimeout(1500)
  await context.close()
  context = await chromium.launchPersistentContext(userDataDir, {
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ar',
    offline: true, // يبدأ السياق الجديد دون اتصال من أول لحظة — يحاكي فتح التطبيق بلا شبكة.
  })
  page = await context.newPage()
  const consoleErrors2 = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors2.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors2.push('pageerror: ' + e.message))
  page.on('response', (r) => { if (r.status() === 401) console.log('  [DIAG 401]', r.url()) })

  let restartOk = true
  let restartErrorText = ''
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
  } catch (e) {
    restartOk = false
    restartErrorText = e.message
  }
  await page.waitForTimeout(1500)
  const bodyAfterRestart = await page.locator('body').innerText().catch(() => '')
  const isWhiteScreenRestart = bodyAfterRestart.trim().length < 5
  check('فتح جديد للسياق (يحاكي إعادة تشغيل التطبيق) دون اتصال نجح', restartOk, restartErrorText)
  check('لا شاشة بيضاء بعد إعادة تشغيل العملية دون اتصال', !isWhiteScreenRestart, `طول النص: ${bodyAfterRestart.trim().length}`)

  const activeKeyAfterRestart = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('qimmah:active-workout:v2')))
  check('مفتاح الجلسة النشطة ما زال محفوظًا بعد إعادة التشغيل دون اتصال (لا فقد بيانات)', Boolean(activeKeyAfterRestart), activeKeyAfterRestart || '(none)')

  // ————— ٨ب) إعادة تشغيل العملية تهبط على لوحة اليوم (المسار الافتراضي) لا شاشة التمرين
  //          مباشرة — هذا سلوك إقلاع بارد طبيعي (كأغلب التطبيقات)، لا فقد بيانات: التنقّل
  //          الصريح لتبويب التمرين من هنا يجب أن يستعيد الجلسة فورًا (لا يبدأ من الصفر). —————
  await page.goto(`${URL}/#/workout`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(800)
  const bodyAfterNavToWorkout = await page.locator('body').innerText().catch(() => '')
  const resumedAfterNav = /أنهِ المجموعة|Complete set|التمرين \d+ من \d+|Exercise \d+ of \d+/.test(bodyAfterNavToWorkout)
  check('التنقّل لتبويب التمرين بعد إعادة التشغيل يستعيد الجلسة (لا يبدأ من الصفر)', resumedAfterNav, bodyAfterNavToWorkout.slice(0, 80).replace(/\n/g, ' | '))

  // ————— ٩) إعادة الاتصال — تأكيد سلامة عامة بعد العودة للشبكة. —————
  await context.setOffline(false)
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(800)
  const bodyReconnected = await page.locator('body').innerText().catch(() => '')
  check('التطبيق يعمل طبيعيًا بعد إعادة الاتصال', bodyReconnected.trim().length > 5)

  // 401 على REST /profiles متوقّع ومفسَّر: جلسة QA وهمية (رمز مصطنَع لا يقبله الخادم
  // الحقيقي) — مزامنة الملف السحابي بالخلفية ترفضها Supabase بصدق (يثبت أن RLS/التحقّق
  // يعملان، لا ثغرة). حساب حقيقي بجلسة صالحة لن يُنتج هذا. أي خطأ آخر غير هذا النمط يُفشل الفحص.
  const EXPECTED_MOCK_SESSION_401 = /Failed to load resource: the server responded with a status of 401/
  const allConsoleErrors = [...consoleErrors, ...consoleErrors2]
  const unexpectedErrors = allConsoleErrors.filter((e) => !EXPECTED_MOCK_SESSION_401.test(e))
  check(
    'لا أخطاء console غير متوقّعة (401 مزامنة الجلسة الوهمية مستثنى ومُوثَّق)',
    unexpectedErrors.length === 0,
    unexpectedErrors.length > 0 ? unexpectedErrors.join(' | ') : `(${allConsoleErrors.length} 401 متوقّع من REST /profiles — جلسة QA وهمية)`,
  )

  await context.close()
  context = null
  rmSync(userDataDir, { recursive: true, force: true })
  rmSync(buildOutDir, { recursive: true, force: true })
} catch (e) {
  check('اكتمل السيناريو بلا استثناء غير متوقّع', false, e.stack || e.message)
} finally {
  if (context) await context.close().catch(() => {})
  previewProc?.kill()
}

const failed = results.filter((r) => !r.ok)
const summary = { evidenceDir: EVIDENCE_DIR, total: results.length, passed: results.length - failed.length, failed: failed.length, results }
writeFileSync(join(EVIDENCE_DIR, 'offline-session-e2e.json'), JSON.stringify(summary, null, 2))
console.log(`\nالأدلة: ${join(EVIDENCE_DIR, 'offline-session-e2e.json')}`)
console.log(failed.length === 0 ? `\n✅ نجحت كل الفحوص — ${results.length} فحصًا.` : `\n❌ فشل ${failed.length} من ${results.length} فحصًا.`)
process.exit(failed.length === 0 ? 0 : 1)
