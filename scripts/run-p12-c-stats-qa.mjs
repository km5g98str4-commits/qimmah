// P12-C QA — شاشة «لوحتي» (#/stats): ملخّص التمرين الأسبوعي + متوسطات التغذية
// مقابل الهدف + مؤشّر الوزن (SVG محلي)، بحساب محلي بالكامل من historyStore.
//
// يتطلب dist مبنيًا مسبقًا: npm run build && node scripts/run-p12-c-stats-qa.mjs
//
// المصفوفة:
//  (a) حساب مزروع (إعداد مكتمل + جلسات بمجموعات + سجلّات وجبات + ٣ قياسات وزن)
//      → الأقسام الأربعة تعرض الأرقام المزروعة بقيم محددة.
//  (b) العضلات المغطّاة/الناقصة تعكس الجلسات المزروعة + السلسلة تُعرض.
//  (c) حساب فارغ → حالات فارغة ودّية، لا NaN/undefined/أقسام بيضاء.
//  (d) ar (rtl) + en (ltr)، صفر تسرّب عربي في EN، لا انزلاق أفقي على 320×568 و390×844.
//  (e) فتح المسار من بطاقة الرئيسية + لا أخطاء صفحة في كامل الجولة.
import { chromium } from './e2e/lib/engine.mjs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4378
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const KEYS = {
  onboarding: 'qimmah:onboarding:v1',
  prefs: 'qimmah:prefs:v1',
  customization: 'qimmah:customization:v1',
  migrated: 'qimmah:history:migrated:v1',
  workoutSessions: 'qimmah:history:workoutSessions:v1',
  nutritionLogs: 'qimmah:history:nutritionLogs:v1',
  measurementLogs: 'qimmah:history:measurementLogs:v1',
}

// ————— تواريخ نسبية (محلية) —————
const dayStamp = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const stampAgo = (n) => dayStamp(daysAgo(n))

// ————— البذرة —————
// جلستان مكتملتان خلال آخر ٧ أيام: أمس (بنش ٣ + سحب ٣) وقبل ٣ أيام (تجديف ٣) → ٢ جلسة، ٩ مجموعات.
const set = (n) => ({ setNumber: n, targetReps: '8–10', actualReps: '10', weightKg: '60', completed: true })
const sets3 = [set(1), set(2), set(3)]
const sessionExercise = (exerciseId) => ({
  exerciseId,
  targetSets: 3,
  targetReps: '8–10',
  targetRestSec: 90,
  completed: true,
  sets: sets3,
})
const seededSessions = [
  {
    id: 'qa-s1',
    date: stampAgo(1),
    startedAt: `${stampAgo(1)}T17:00:00`,
    finishedAt: `${stampAgo(1)}T18:00:00`,
    workoutDayId: 'day-1',
    workoutDayName: 'يوم ١',
    exercises: [sessionExercise('barbell-bench-press'), sessionExercise('lat-pulldown-machine')],
  },
  {
    id: 'qa-s2',
    date: stampAgo(3),
    startedAt: `${stampAgo(3)}T17:00:00`,
    finishedAt: `${stampAgo(3)}T18:00:00`,
    workoutDayId: 'day-2',
    workoutDayName: 'يوم ٢',
    exercises: [sessionExercise('barbell-row')],
  },
]
// العضلات المتوقعة من خريطة exercises.ts:
// bench: chest_mid,triceps,front_delts (+chest_upper) | lat-pulldown: lats (+biceps,upper_back)
// barbell-row: lats,upper_back (+biceps,rear_delts,lower_back,forearms) → ١٠ عضلات مغطّاة.
const EXPECTED_COVERED = 10

// وجبات خطة بمعرّفات وأرقام معلومة → يومان مسجّلان: 1800/135 و1300/95 → متوسط 1550 سعرة / 115غ.
const meal = (id, order, calories, protein) => ({
  id,
  nameAr: `وجبة ${order + 1}`,
  nameEn: `Meal ${order + 1}`,
  mealType: 'snack',
  ingredients: [],
  calories,
  protein,
  carbs: 0,
  fat: 0,
  notes: '',
  order,
})
const seededCustomization = {
  targetsMeta: { manuallyEdited: true, lastCalculatedFromProfileHash: 'qa-fixed' },
  targets: { targetCalories: 2200, proteinGrams: 150 },
  nutritionPlan: {
    enabled: true,
    targetCalories: 2200,
    targetProtein: 150,
    targetCarbs: 220,
    targetFat: 70,
    targetWaterLiters: 3,
    meals: [meal('qa-m1', 0, 600, 45), meal('qa-m2', 1, 700, 50), meal('qa-m3', 2, 500, 40)],
    style: 'meal_suggestions',
    mealsPerDay: 3,
  },
}
const seededNutritionLogs = {
  [stampAgo(1)]: {
    date: stampAgo(1),
    doneMeals: { 'qa-m1': true, 'qa-m2': true, 'qa-m3': true },
    updatedAt: new Date().toISOString(),
  },
  [stampAgo(2)]: {
    date: stampAgo(2),
    doneMeals: { 'qa-m1': true, 'qa-m2': true, 'qa-m3': false },
    updatedAt: new Date().toISOString(),
  },
}
// ٣ قياسات وزن (الأحدث أولًا كما يخزنها المتجر): 82.5 → 81.8 → 81.2 (التغيّر −1.3).
const seededMeasurements = [
  { id: 'qa-w3', date: stampAgo(2), values: { weightKg: 81.2 } },
  { id: 'qa-w2', date: stampAgo(10), values: { weightKg: 81.8 } },
  { id: 'qa-w1', date: stampAgo(21), values: { weightKg: 82.5 } },
]

// السلسلة المتوقعة: بداية الأسبوع سبت (منطق streaks.ts) — نعيد الحساب هنا للتثبيت.
function expectedThisWeekCount() {
  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = (base.getDay() - 6 + 7) % 7
  const weekStart = new Date(base)
  weekStart.setDate(base.getDate() - diff)
  const workoutStamps = [stampAgo(1), stampAgo(3)]
  let count = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    if (workoutStamps.includes(dayStamp(d))) count++
  }
  return count
}

// ————— أدوات الفحص —————
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function seedAndOpen(page, { lang = 'ar', seeded = true } = {}, hash = '#/stats') {
  await page.goto(BASE)
  await page.evaluate(
    ({ KEYS, lang, seeded, seededSessions, seededNutritionLogs, seededMeasurements, seededCustomization }) => {
      localStorage.clear()
      localStorage.setItem(KEYS.onboarding, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      localStorage.setItem(KEYS.prefs, JSON.stringify({ language: lang }))
      localStorage.setItem(KEYS.migrated, 'done')
      if (seeded) {
        localStorage.setItem(KEYS.customization, JSON.stringify(seededCustomization))
        localStorage.setItem(KEYS.workoutSessions, JSON.stringify(seededSessions))
        localStorage.setItem(KEYS.nutritionLogs, JSON.stringify(seededNutritionLogs))
        localStorage.setItem(KEYS.measurementLogs, JSON.stringify(seededMeasurements))
      }
    },
    { KEYS, lang, seeded, seededSessions, seededNutritionLogs, seededMeasurements, seededCustomization },
  )
  await page.goto(`${BASE}/${hash}`)
  await page.reload()
  await page.waitForSelector(hash === '#/stats' ? '[data-testid="stats-view"]' : 'nav', { timeout: 15000 })
  await sleep(400)
}

const text = (page, id) => page.locator(`[data-testid="${id}"]`).first().innerText()
const exists = (page, id) => page.locator(`[data-testid="${id}"]`).count().then((c) => c > 0)

async function main() {
  // detached + قتل مجموعة العمليات كاملة عند الإنهاء — حتى لا يبقى خادم vite معلّقًا على المنفذ بعد npx.
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  })
  let browser
  try {
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(BASE)
        if (r.ok) break
      } catch {
        /* الخادم لم يجهز بعد */
      }
      await sleep(500)
    }
    browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    const pageErrors = []

    const newPage = async (viewport) => {
      const p = await browser.newPage({ viewport })
      p.on('pageerror', (e) => pageErrors.push(String(e)))
      return p
    }

    // ————— (a)+(b) حساب مزروع — عربي 390×844 —————
    {
      const page = await newPage({ width: 390, height: 844 })
      await seedAndOpen(page, { lang: 'ar', seeded: true })

      check('(a) AR: جلسات هذا الأسبوع = 2', (await text(page, 'stats-workouts')).trim() === '2')
      check('(a) AR: مجموع المجموعات = 9', (await text(page, 'stats-sets')).trim() === '9')

      const thisWeek = expectedThisWeekCount()
      const thisWeekText = (await text(page, 'stats-thisweek')).trim()
      check(`(b) AR: هذا الأسبوع يبدأ بـ ${thisWeek}/`, new RegExp(`^${thisWeek}/\\d+$`).test(thisWeekText), thisWeekText)
      const streakText = (await text(page, 'stats-streak')).trim()
      check('(b) AR: السلسلة تُعرض رقمًا (0 متوقعة)', streakText === '0', streakText)

      const covered = (await text(page, 'stats-covered')).trim()
      check(`(b) AR: العضلات المغطّاة = ${EXPECTED_COVERED}`, covered === String(EXPECTED_COVERED), covered)
      const coveredList = await text(page, 'stats-covered-list')
      check('(b) AR: قائمة المغطّاة تشمل «صدر» و«لاتس»', coveredList.includes('صدر') && coveredList.includes('لاتس'))
      const hasMissed = await exists(page, 'stats-missed-list')
      check('(b) AR: قسم الناقصة يظهر (الخطة الافتراضية تشمل الأرجل)', hasMissed)
      if (hasMissed) {
        const missedList = await text(page, 'stats-missed-list')
        check('(b) AR: الناقصة تشمل عضلة أرجل (أمامية الفخذ)', missedList.includes('أمامية الفخذ'), missedList.slice(0, 80))
      }

      check('(a) AR: متوسط السعرات = 1550', (await text(page, 'stats-avg-calories')).includes('1550'))
      check('(a) AR: هدف السعرات = 2200 و70% من الهدف', (await text(page, 'stats-avg-calories-target')).includes('2200') && (await text(page, 'stats-avg-calories-pct')).includes('70%'))
      check('(a) AR: متوسط البروتين = 115', (await text(page, 'stats-avg-protein')).includes('115'))
      check('(a) AR: هدف البروتين = 150 و77% من الهدف', (await text(page, 'stats-avg-protein-target')).includes('150') && (await text(page, 'stats-avg-protein-pct')).includes('77%'))
      check('(a) AR: أيام مسجّلة = 2', (await text(page, 'stats-tracked-days')).includes('2'))

      check('(a) AR: آخر وزن = 81.2', (await text(page, 'stats-weight-latest')).includes('81.2'))
      check('(a) AR: التغيّر = -1.3', (await text(page, 'stats-weight-delta')).includes('-1.3'))
      const chartDots = await page.locator('[data-testid="stats-weight-chart"] circle').count()
      check('(a) AR: رسم الوزن SVG بثلاث نقاط', chartDots === 3, `${chartDots} نقطة`)
      const hasPolyline = (await page.locator('[data-testid="stats-weight-chart"] polyline').count()) === 1
      check('(a) AR: خط الاتجاه (polyline) موجود', hasPolyline)

      check('(d) AR: الاتجاه rtl', await page.evaluate(() => document.documentElement.dir === 'rtl'))
      await page.close()
    }

    // ————— (a)+(d) حساب مزروع — إنجليزي، وفحص الانزلاق على الحجمين —————
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      for (const lang of ['ar', 'en']) {
        const tag = `${viewport.width}×${viewport.height} ${lang}`
        const page = await newPage(viewport)
        await seedAndOpen(page, { lang, seeded: true })
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        check(`(d) ${tag}: لا انزلاق أفقي (seeded)`, overflow <= 1, `فرق ${overflow}px`)
        if (lang === 'en') {
          const body = await text(page, 'stats-view')
          check(`(d) ${tag}: صفر تسرّب عربي في EN`, !/[؀-ۿ]/.test(body), (body.match(/[؀-ۿ][^\n]{0,30}/) || [''])[0])
          check(`(d) ${tag}: الاتجاه ltr`, await page.evaluate(() => document.documentElement.dir === 'ltr'))
          check(`(d) ${tag}: الأرقام المزروعة تظهر بالإنجليزية أيضًا`, body.includes('1550') && body.includes('81.2'))
        }
        const noNan = !/(NaN|undefined)/.test(await text(page, 'stats-view'))
        check(`(c/d) ${tag}: لا NaN/undefined (seeded)`, noNan)
        await page.close()
      }
    }

    // ————— (c) حساب فارغ — حالات فارغة ودّية بالعربية والإنجليزية —————
    for (const lang of ['ar', 'en']) {
      const page = await newPage({ width: 320, height: 568 })
      await seedAndOpen(page, { lang, seeded: false })
      check(`(c) ${lang}: حالة تمرين فارغة تظهر`, await exists(page, 'stats-training-empty'))
      check(`(c) ${lang}: حالة تغذية فارغة تظهر`, await exists(page, 'stats-nutrition-empty'))
      check(`(c) ${lang}: حالة وزن فارغة تظهر`, await exists(page, 'stats-weight-empty'))
      const body = await text(page, 'stats-view')
      check(`(c) ${lang}: لا NaN/undefined (فارغ)`, !/(NaN|undefined)/.test(body))
      check(`(c) ${lang}: الأقسام ليست بيضاء (نص كافٍ)`, body.trim().length > 80, `${body.trim().length} حرفًا`)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      check(`(c) ${lang}: لا انزلاق أفقي (فارغ 320)`, overflow <= 1, `فرق ${overflow}px`)
      await page.close()
    }

    // ————— (e) المدخل من بطاقة الرئيسية —————
    {
      const page = await newPage({ width: 390, height: 844 })
      await seedAndOpen(page, { lang: 'ar', seeded: true }, '#/dashboard')
      await page.locator('[data-testid="stats-entry"]').first().click()
      await page.waitForSelector('[data-testid="stats-view"]', { timeout: 10000 })
      const hash = await page.evaluate(() => window.location.hash)
      check('(e) بطاقة الرئيسية تفتح #/stats', hash === '#/stats', hash)
      check('(e) الشاشة تُعرض بعد النقر', await exists(page, 'stats-view'))
      await page.close()
    }

    check('(e) لا أخطاء صفحة غير ملتقطة في كامل الجولة', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  } finally {
    if (browser) await browser.close().catch(() => {})
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill()
    }
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P12-C STATS QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
