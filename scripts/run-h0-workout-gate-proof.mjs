// ح-٠ — إثبات بوّابة تبويب التمارين.
//
// السؤال: مستخدم أكمل الإعداد وخطته محفوظة (علوي/سفلي، ٤ أيام) — هل يعرض تبويب
// التمارين تمرين اليوم، أم يرجعه لـ«أنشئ خطتي»؟
//
// الإثبات يزرع نفس الحالة المخزّنة التي تنتجها الرحلة الحقيقية (مولّدة بدالة
// الإعداد نفسها، انظر h0-workout-gate-seed.ts) ثم يفتح التبويبات على البناء
// الحقيقي ويقارن ما يقرأه كل تبويب من المتجر ذاته.
//
// التشغيل:  npm run build && node scripts/run-h0-workout-gate-proof.mjs

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PORT = 4321
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// مفاتيح التخزين الحقيقية للتطبيق (src/lib/customization.ts + src/lib/onboarding.ts).
const CUSTOMIZATION_KEY = 'qimmah:customization:v1'
const ONBOARDING_KEY = 'qimmah:onboarding:v1'

// النص الذي يعني «طريق مسدود» في تبويب التمارين (workoutScreen.noPlanYet).
const DEAD_END_AR = 'ما عندك جدول حالي'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** يولّد بذرة الحالة عبر مصدر التطبيق نفسه (esbuild + مسارات @/). */
async function buildSeed() {
  const outfile = resolve(here, '.h0-seed.bundle.mjs')
  await build({
    entryPoints: [resolve(here, 'h0-workout-gate-seed.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': '{}' },
    logLevel: 'warning',
  })
  try {
    await import(pathToFileURL(outfile).href)
  } finally {
    try {
      rmSync(outfile)
    } catch {
      /* ignore */
    }
  }
  const seedPath = resolve(here, '.h0-seed.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  try {
    rmSync(seedPath)
  } catch {
    /* ignore */
  }
  return seed
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

/**
 * ينتقل لمسار ويعيد نصّ الصفحة بعد زوال الشاشة الافتتاحية.
 * إعادة التحميل ضرورية: التنقّل بين المسارات تغيير hash فقط ولا يُعيد إقلاع التطبيق،
 * فبدونها نقرأ حالة ما قبل الزرع لا الحالة المزروعة.
 */
async function textAt(page, route) {
  await page.goto(`${URL}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  return page.locator('body').innerText()
}

const seed = await buildSeed()
const s = seed.summary
console.log(
  `\nالحالة المزروعة (من مولّد الإعداد نفسه): ${s.templateId} — ${s.daysPerWeek} أيام — ${s.dayNamesAr.join('، ')}\n`,
)

check('الرحلة تنتج تقسيمة علوي/سفلي', /upper-lower/.test(s.templateId), s.templateId)
check('الرحلة تنتج ٤ أيام في الأسبوع', s.daysPerWeek === 4, String(s.daysPerWeek))
check('كل يوم يحمل تمارين فعلية', s.exercisesPerDay.every((n) => n > 0), s.exercisesPerDay.join('/'))

const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()

  // زرع الحالة المخزّنة الحقيقية قبل أي إقلاع للتطبيق.
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ customization, customizationKey, onboardingKey }) => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(customizationKey, JSON.stringify(customization))
      localStorage.setItem(onboardingKey, JSON.stringify({ completed: true, lastStep: 18 }))
    },
    { customization: seed.customization, customizationKey: CUSTOMIZATION_KEY, onboardingKey: ONBOARDING_KEY },
  )

  // اليوم المتوقّع من الخطة المحفوظة لهذا اليوم من الأسبوع (نفس معادلة todayPlanDay).
  const todayName = s.dayNamesAr[new Date().getDay() % s.daysPerWeek]

  // شاهد الضبط: شاشة التغذية تقرأ نفس المخرَج (كما في الوصف).
  const nutritionText = await textAt(page, 'nutrition')
  check(
    'شاشة التغذية تقرأ الحالة المزروعة',
    !nutritionText.includes(DEAD_END_AR) && nutritionText.trim().length > 0,
  )

  // موضع العطل المزعوم: تبويب التمارين.
  const workoutText = await textAt(page, 'workout')
  check('تبويب التمارين لا يعرض طريقًا مسدودًا', !workoutText.includes(DEAD_END_AR))

  check(
    'تبويب التمارين يعرض تمرين اليوم من الخطة المحفوظة',
    workoutText.includes('تمرين اليوم') && workoutText.includes(todayName),
    `اليوم المتوقّع: ${todayName}`,
  )

  check(
    'تبويب التمارين يعرض تقسيمة وعدد أيام الخطة المحفوظة',
    workoutText.includes('علوي / سفلي') && workoutText.includes(`${s.daysPerWeek} أيام`),
    `علوي / سفلي — ${s.daysPerWeek} أيام`,
  )

  check(
    'كل أيام الخطة المحفوظة معروضة في التبويب',
    s.dayNamesAr.every((n) => workoutText.includes(n)),
    s.dayNamesAr.join('، '),
  )

  // الرئيسية تقرأ نفس المتجر وتعرض نفس يوم اليوم — لا اختلاف بين الشاشات.
  const dashboardText = await textAt(page, 'dashboard')
  check(
    'الرئيسية وتبويب التمارين يتفقان على يوم اليوم',
    dashboardText.includes(todayName),
    todayName,
  )

  // إعادة التحميل لا تُعيد الطريق المسدود ولا تُبدّل الخطة.
  const afterReload = await textAt(page, 'workout')
  check(
    'إعادة التحميل تُبقي الخطة المحفوظة ظاهرة',
    !afterReload.includes(DEAD_END_AR) && afterReload.includes(todayName),
  )
} catch (e) {
  check('إثبات ح-٠ اشتغل', false, e.message)
} finally {
  await browser?.close()
  preview?.kill('SIGKILL')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — ح-٠ بوّابة تبويب التمارين`)
process.exit(failed.length ? 1 : 0)
