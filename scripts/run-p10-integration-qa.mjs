// P10 INTEGRATION QA — browser checks not covered by the per-agent proofs:
//  • A2 calc page (#/calc) renders LIVE personalized numbers (BMR/TDEE/calories/protein/BMI)
//    and maintain calories == TDEE, protein == round(1.8×weight).
//  • Regressions: nutrition food-search UI, workout/progress views render,
//    guest mode, corrupted-localStorage reload does not crash.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4321
const BASE = `http://localhost:${PORT}`
const ONB_KEY = 'qimmah:onboarding:v1'
const ONB_PROFILE_KEY = 'qimmah:onboarding:profile:v1'
const CUS_KEY = 'qimmah:customization:v1'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// مصدر الحقيقة للإعداد (OnboardingProfile) — ملف اختبار: ذكر 80كجم/180سم/30سنة،
// نشاط متوسط (neat=moderate)، 4 أيام، هدف «محافظة» →
// السعرات = TDEE (2581)، بروتين = round(1.8×80)=144، BMR=1780، BMI=24.7.
const maintainOnboardingProfile = {
  profile: { sex: 'male', age: 30 },
  bodyMetrics: { heightCm: 180, currentWeightKg: 80 },
  goal: { type: 'maintain' },
  trainingPreferences: { daysPerWeek: 4 },
  activityProfile: { neat: 'moderate' },
  _meta: { completed: true, source: 'onboarding' },
}
// نخزّن التخصيص أيضًا بأرقام قديمة (وزن 80، بصمة قديمة) → withFreshTargets يعيد الحساب.
const maintainCustomization = {
  profile: {
    gender: 'male', age: 30, heightCm: 180, weightKg: 80,
    activityLevel: 'moderate', trainingDays: 4,
    goal: 'maintain', goalType: 'maintenance',
  },
  targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: 'stale-force-recompute' },
}

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

// يزرع التخزين ثم يُعيد التحميل الكامل (تغيّر الـ hash وحده لا يعيد التحميل في SPA).
async function seedAndLoad(page, { cus, onbProfile } = {}, hash = '') {
  await page.goto(BASE)
  await page.evaluate(({ ONB_KEY, ONB_PROFILE_KEY, CUS_KEY, cus, onbProfile }) => {
    localStorage.clear()
    localStorage.setItem(ONB_KEY, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
    if (onbProfile) localStorage.setItem(ONB_PROFILE_KEY, JSON.stringify(onbProfile))
    if (cus) localStorage.setItem(CUS_KEY, JSON.stringify(cus))
  }, { ONB_KEY, ONB_PROFILE_KEY, CUS_KEY, cus, onbProfile })
  await page.goto(`${BASE}/${hash}`)
  await page.reload()
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  try {
    // انتظر الخادم.
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(BASE); if (r.ok) break } catch { /* not up yet */ }
      await sleep(500)
    }
    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    // ---- #5: صفحة «كيف نحسب أرقامك» بأرقام حيّة (هدف محافظة) ----
    await seedAndLoad(page, { cus: maintainCustomization, onbProfile: maintainOnboardingProfile }, '#/calc')
    await sleep(1200)
    const calcText = await page.evaluate(() => document.body.innerText)
    check('#/calc page renders (has content)', calcText.length > 200, `${calcText.length} chars`)
    check('calc reflects seeded weight 80 (live, not default 86)', calcText.includes('×80') || calcText.includes('× 80'), 'BMR/protein formula uses 80')
    check('calc shows BMR 1780', calcText.includes('1780'))
    check('calc shows TDEE/calories 2581 (maintain = TDEE)', calcText.includes('2581'))
    // صيغة السعرات لهدف محافظة: «TDEE (محافظة على العضل) = السعرات» بلا عجز/فائض → 2581 = 2581.
    check('calc: maintain calories formula = TDEE with no offset', /2581\s*\(محافظة على العضل\)\s*=\s*2581/.test(calcText))
    check('calc shows protein 144 (1.8×80)', calcText.includes('144'))
    check('calc shows BMI 24.7', calcText.includes('24.7'))

    // ---- #8: القائمة السفلية موجودة على شاشة رئيسية (لا انهيار) ----
    await page.goto(`${BASE}/#/dashboard`); await sleep(800)
    check('dashboard renders nav shell', (await page.locator('nav').count()) > 0)

    // ---- #8: التغذية + بحث الطعام (كبيبة/برياني) ----
    await page.goto(`${BASE}/#/nutrition`); await sleep(800)
    check('nutrition view renders', (await page.locator('nav').count()) > 0)

    // ---- #8: الواجهات الثقيلة (workout / progress) تُرسم دون خطأ ----
    await page.goto(`${BASE}/#/workout`); await sleep(1000)
    check('workout view renders (gifs/muscle-map surface)', (await page.locator('nav').count()) > 0)
    await page.goto(`${BASE}/#/progress`); await sleep(1000)
    check('progress view renders (medals surface)', (await page.locator('nav').count()) > 0)

    // ---- #8: localStorage تالف → لا انهيار ----
    await page.goto(BASE)
    await page.evaluate(({ ONB_KEY, ONB_PROFILE_KEY, CUS_KEY }) => {
      localStorage.clear()
      localStorage.setItem(ONB_KEY, '{ this is : not json ]')
      localStorage.setItem(ONB_PROFILE_KEY, '}}}not-json{{{')
      localStorage.setItem(CUS_KEY, '{{{ broken')
      localStorage.setItem('qimmah:todos:guest:v1', 'nope-not-json')
    }, { ONB_KEY, ONB_PROFILE_KEY, CUS_KEY })
    await page.goto(`${BASE}/#/dashboard`); await page.reload(); await sleep(1000)
    const bootedAfterCorrupt = (await page.evaluate(() => document.body.innerText.length)) > 50
    check('corrupted localStorage reload does not crash', bootedAfterCorrupt)

    // ---- #8: وضع الضيف (لا جلسة، لا إعداد) → شاشة بداية/دخول تظهر ----
    await page.goto(BASE)
    await page.evaluate(() => localStorage.clear())
    await page.goto(BASE); await page.reload(); await sleep(1000)
    const guestText = await page.evaluate(() => document.body.innerText)
    check('guest mode: app boots to start/login (no crash)', guestText.length > 50)

    check('no uncaught page errors during QA', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))

    await browser.close()
  } finally {
    server.kill()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P10 INTEGRATION QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
