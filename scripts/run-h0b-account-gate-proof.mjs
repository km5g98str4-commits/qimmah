// ح-٠ب — إثبات الطريق المسدود عند الانتقال من ضيف إلى حساب.
//
// الرحلة الحقيقية: المستخدم يُكمل الإعداد كضيف («خطتك جاهزة»، والخطة محفوظة في
// qimmah:customization:v1)، ثم يُنشئ حسابًا. علامة الإكمال للضيف علمٌ على الجهاز،
// وعلامة الإكمال للحساب سجلٌّ منفصل (qimmah:onboarding:accounts:v1) — ولا شيء يربط
// الأولى بالثانية. النتيجة: نفس الجهاز ونفس الخطة، لكن بوّابة التبويبات ترمي المستخدم
// إلى الإعداد بعد تسجيل الدخول.
//
// الإثبات يشغّل دوال القرار الحقيقية (isOnboardingComplete + نسخة guardRoute) في
// متصفح حقيقي فوق localStorage حقيقي.
//
// التشغيل:  npm run build && node scripts/run-h0b-account-gate-proof.mjs

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium } from './e2e/lib/engine.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PORT = 4323
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const ONBOARDING_KEY = 'qimmah:onboarding:v1'
const ACCOUNTS_KEY = 'qimmah:onboarding:accounts:v1'
const NEW_UID = 'acc-00000000-0000-4000-8000-000000000001'
const OTHER_UID = 'acc-00000000-0000-4000-8000-000000000002'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** يُجمّع مسبار البوّابة من مصدر التطبيق نفسه ويعيده نصًّا لحقنه في الصفحة. */
async function buildProbe() {
  const outfile = resolve(here, '.h0-probe.js')
  await build({
    entryPoints: [resolve(here, 'h0-gate-probe.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': '{}' },
    logLevel: 'warning',
  })
  const code = readFileSync(outfile, 'utf8')
  try {
    rmSync(outfile)
  } catch {
    /* ignore */
  }
  return code
}

function startPreview() {
  if (EXTERNAL) return null
  return spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: process.env,
  })
}

async function waitForServer(ms = 20000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(URL)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const probe = await buildProbe()
const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })

  // ١) ضيف أكمل الإعداد فعلًا — بدوال التطبيق نفسها، لا بكتابة يدوية للمفاتيح.
  await page.addScriptTag({ content: probe })
  const guest = await page.evaluate(
    ({ onboardingKey, accountsKey, uid }) => {
      localStorage.clear()
      window.__h0.markCompleted(null, 18) // إنهاء الإعداد كضيف
      return {
        deviceFlag: JSON.parse(localStorage.getItem(onboardingKey) || '{}'),
        accountsRegistry: localStorage.getItem(accountsKey),
        guestComplete: window.__h0.isOnboardingComplete(null),
        guestWorkoutRoute: window.__h0.guardRoute('workout', null),
        accountComplete: window.__h0.isOnboardingComplete(uid),
        accountWorkoutRoute: window.__h0.guardRoute('workout', uid),
        accountNutritionRoute: window.__h0.guardRoute('nutrition', uid),
        accountDashboardRoute: window.__h0.guardRoute('dashboard', uid),
      }
    },
    { onboardingKey: ONBOARDING_KEY, accountsKey: ACCOUNTS_KEY, uid: NEW_UID },
  )

  check('الضيف أكمل الإعداد فعلًا (علم الجهاز مكتوب)', guest.deviceFlag.completed === true)
  check('التبويبات مفتوحة للضيف', guest.guestComplete && guest.guestWorkoutRoute === 'workout', guest.guestWorkoutRoute)

  // ٢) نفس الجهاز، نفس اللحظة — بعد إنشاء حساب.
  check(
    'سجلّ الحسابات لا يعرف هذا الحساب بعد إنشائه',
    guest.accountsRegistry === null,
    String(guest.accountsRegistry),
  )
  check(
    'بوّابة الإعداد ترفض الحساب رغم اكتمال الإعداد على الجهاز',
    guest.accountComplete === false,
    `isOnboardingComplete("${NEW_UID}") = ${guest.accountComplete}`,
  )
  check(
    'تبويب التمارين يُقذف إلى الإعداد بعد إنشاء الحساب',
    guest.accountWorkoutRoute === 'setup',
    `workout → ${guest.accountWorkoutRoute}`,
  )

  // ٣) نطاق العطل: كل التبويبات لا تبويب التمارين وحده.
  console.log(
    `\nقبل الإصلاح — مسار التبويبات بعد إنشاء الحساب: تمرين → ${guest.accountWorkoutRoute} · تغذية → ${guest.accountNutritionRoute} · الرئيسية → ${guest.accountDashboardRoute}\n`,
  )
  check(
    'العطل يشمل كل التبويبات لا تبويب التمارين وحده',
    guest.accountNutritionRoute === 'setup' && guest.accountDashboardRoute === 'setup',
    `تغذية → ${guest.accountNutritionRoute} · الرئيسية → ${guest.accountDashboardRoute}`,
  )

  // ٤) بعد الإصلاح: التبنّي يفتح التبويبات للحساب الأول على هذا الجهاز.
  const fixed = await page.evaluate(
    ({ uid, otherUid }) => {
      const adopted = window.__h0.adoptGuestOnboarding(uid)
      const after = {
        adopted,
        accountComplete: window.__h0.isOnboardingComplete(uid),
        workoutRoute: window.__h0.guardRoute('workout', uid),
        nutritionRoute: window.__h0.guardRoute('nutrition', uid),
        // حساب ثانٍ مختلف على الجهاز نفسه — يجب ألّا يرث شيئًا.
        secondAdopted: window.__h0.adoptGuestOnboarding(otherUid),
        secondComplete: window.__h0.isOnboardingComplete(otherUid),
        secondWorkoutRoute: window.__h0.guardRoute('workout', otherUid),
        // التبنّي مرّة واحدة: إعادة النداء لا تفعل شيئًا جديدًا.
        repeatAdopted: window.__h0.adoptGuestOnboarding(uid),
      }
      return after
    },
    { uid: NEW_UID, otherUid: OTHER_UID },
  )

  check('التبنّي تمّ للحساب الأول على هذا الجهاز', fixed.adopted === true)
  check(
    'تبويب التمارين يفتح بعد إنشاء الحساب',
    fixed.accountComplete === true && fixed.workoutRoute === 'workout',
    `workout → ${fixed.workoutRoute}`,
  )
  check('بقية التبويبات تفتح كذلك', fixed.nutritionRoute === 'nutrition', `nutrition → ${fixed.nutritionRoute}`)
  check('التبنّي لا يتكرّر للحساب نفسه', fixed.repeatAdopted === false)

  // ضمانة العزلة: الحساب الثاني لا يرث إعداد الأول (السلوك المقصود يبقى كما هو).
  check(
    'حساب ثانٍ على الجهاز نفسه لا يرث الإعداد',
    fixed.secondAdopted === false && fixed.secondComplete === false && fixed.secondWorkoutRoute === 'setup',
    `حساب ثانٍ: workout → ${fixed.secondWorkoutRoute}`,
  )

  // جهاز نظيف بلا إعداد ضيف: الحساب الجديد يُطالَب بالإعداد كما يجب.
  const freshDevice = await page.evaluate(({ uid }) => {
    localStorage.clear()
    return {
      adopted: window.__h0.adoptGuestOnboarding(uid),
      route: window.__h0.guardRoute('workout', uid),
    }
  }, { uid: NEW_UID })
  check(
    'جهاز بلا إعداد ضيف: الحساب الجديد يُطالَب بالإعداد',
    freshDevice.adopted === false && freshDevice.route === 'setup',
    `workout → ${freshDevice.route}`,
  )
} catch (e) {
  check('إثبات ح-٠ب اشتغل', false, e.message)
} finally {
  await browser?.close()
  preview?.kill('SIGKILL')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — ح-٠ب بوّابة الحساب`)
process.exit(failed.length ? 1 : 0)
