// P12 INSTALL-GUIDE QA — headless checks for the PWA install prompt + settings guide + 404 audit.
//   (a) Android: synthetic beforeinstallprompt → bottom banner + native install button (ar+en);
//       dismiss → banner gone + localStorage flag set; reload → does not reappear.
//   (b) iOS: iPhone Safari UA → "add to home screen" hint variant (no native button), ar+en.
//   (c) dismissed-flag path hides the banner even when installable.
//   (d) Settings: "ثبّت التطبيق" section renders iOS AND Android steps (ar+en), dir=rtl,
//       no horizontal overflow at 320x568 and 390x844.
//   (e) 404 audit: every main route + every settings/footer link resolves — never the NotFound view;
//       no uncaught page errors.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4329
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PREFS_KEY = 'qimmah:prefs:v1'
const ONB_KEY = 'qimmah:onboarding:v1'
const ONB_PROFILE_KEY = 'qimmah:onboarding:profile:v1'
const CUS_KEY = 'qimmah:customization:v1'
const DISMISS_KEY = 'qimmah:installPromptDismissed:v1'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'

// ملف إعداد مكتمل (لتُرسَم التبويبات الرئيسية بلا إعادة توجيه للمعالج) — مطابق لنمط p10.
const onbProfile = {
  profile: { sex: 'male', age: 30 },
  bodyMetrics: { heightCm: 180, currentWeightKg: 80 },
  goal: { type: 'maintain' },
  trainingPreferences: { daysPerWeek: 4 },
  activityProfile: { neat: 'moderate' },
  _meta: { completed: true, source: 'onboarding' },
}

// نصوص متوقّعة (ثنائية اللغة) — نتحقق من ظهورها في DOM.
const T = {
  ar: {
    installBtn: 'ثبّت التطبيق',
    iosHint: 'أضف إلى الشاشة الرئيسية',
    iosStep: 'أضف إلى الشاشة الرئيسية',
    androidStep: 'تثبيت التطبيق',
    notFound: 'الصفحة غير موجودة',
    sectionTitle: 'ثبّت التطبيق',
  },
  en: {
    installBtn: 'Install app',
    iosHint: 'Add to Home Screen',
    iosStep: 'Add to Home Screen',
    androidStep: 'Install app',
    notFound: 'Page not found',
    sectionTitle: 'Install app',
  },
}

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

// يزرع التخزين ثم يُعيد التحميل الكامل (تغيّر الـ hash وحده لا يعيد التحميل في SPA).
async function seedAndLoad(page, { lang = 'ar', onboarded = false, dismissed = false } = {}, hash = '') {
  await page.goto(BASE)
  await page.evaluate(
    ({ PREFS_KEY, ONB_KEY, ONB_PROFILE_KEY, CUS_KEY, DISMISS_KEY, lang, onboarded, dismissed, onbProfile }) => {
      localStorage.clear()
      localStorage.setItem(PREFS_KEY, JSON.stringify({ language: lang }))
      if (onboarded) {
        localStorage.setItem(ONB_KEY, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
        localStorage.setItem(ONB_PROFILE_KEY, JSON.stringify(onbProfile))
        localStorage.setItem(CUS_KEY, JSON.stringify({ profile: { gender: 'male', age: 30, heightCm: 180, weightKg: 80 } }))
      }
      if (dismissed) localStorage.setItem(DISMISS_KEY, '1')
    },
    { PREFS_KEY, ONB_KEY, ONB_PROFILE_KEY, CUS_KEY, DISMISS_KEY, lang, onboarded, dismissed, onbProfile },
  )
  await page.goto(`${BASE}/${hash}`)
  await page.reload()
  await sleep(700)
}

// يُطلق حدث beforeinstallprompt صناعيًا (كما يفعل كروم على أندرويد) فيُلتقط في lib/pwa.
async function fireBeforeInstallPrompt(page) {
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true })
    e.prompt = () => Promise.resolve()
    e.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(e)
  })
  await sleep(300)
}

const has = async (page, sel) => (await page.locator(sel).count()) > 0
const bodyText = (page) => page.evaluate(() => document.body.innerText)

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(BASE)
        if (r.ok) break
      } catch {
        /* not up yet */
      }
      await sleep(500)
    }
    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })

    // ——— (أ) العقد الجديد: لا شريط تثبيت **ثابتًا** فوق قاع الشاشة ———
    // [QIM-WEB-FOUNDER-UX-003/حزمة ١] كانت الأقسام (أ) و(ب) و(ج) هنا تؤكّد
    // **ظهور** `install-prompt` — شريط `fixed bottom-0 z-[60]`. وقد ثبت بالقياس
    // أن ذلك الشريط يغطّي شريط التنقّل السفلي كاملًا (التبويبات الخمسة)، وزرّ
    // «كمّل كضيف» على الهبوط، وزرّ «ادخل وشوف خطتي» على التسليم:
    // `elementFromPoint` في مركز كلٍّ منها كان يعيد الشريط لا الزرّ.
    //
    // فالتأكيدات القديمة كانت تحرس العطل بوصفه سلوكًا صحيحًا. لم تُحذف بل
    // **قُلبت إلى العقد الصحيح**: الشريط الثابت لا يُركَّب إطلاقًا، ودعوة
    // التثبيت تعيش في `InstallBanner` داخل مسار القشرة وفي دليل الإعدادات (د).
    //
    // الحارسان الحقيقيان: `test:bottom-overlay` (بنيوي، داخل البوابة) و
    // `test:e2e:install-overlap` (متصفّح، يقيس `elementFromPoint` فعلًا).
    for (const [label, opts] of [
      ['android', {}],
      ['ios', { userAgent: IPHONE_UA }],
      ['dismissed-flag', { dismissed: true }],
    ]) {
      const { dismissed, ...ctxOpts } = opts
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...ctxOpts })
      const page = await ctx.newPage()
      await seedAndLoad(page, { lang: 'ar', dismissed })
      await fireBeforeInstallPrompt(page)
      await sleep(300)
      const absent = !(await has(page, '[data-testid="install-prompt"]'))
      check(`(أ) ${label}: لا شريط تثبيت ثابت فوق قاع الشاشة`, absent)
      await ctx.close()
    }

    // ——— (d) قسم الإعدادات «ثبّت التطبيق»: خطوات iOS + أندرويد، dir صحيح، بلا تجاوز أفقي ———
    for (const lang of ['ar', 'en']) {
      for (const vp of [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
      ]) {
        const ctx = await browser.newContext({ viewport: vp })
        const page = await ctx.newPage()
        await seedAndLoad(page, { lang, onboarded: true }, '#/settings')
        await sleep(400)
        const section = await has(page, '[data-testid="install-guide-section"]')
        const txt = await bodyText(page)
        const iosSteps = txt.includes(T[lang].iosStep)
        const androidSteps = txt.includes(T[lang].androidStep)
        const dir = await page.evaluate(() => document.documentElement.dir)
        // نقيس تجاوز قسم دليل التثبيت نفسه (لا الصفحة كلها): هدف المهمة أن القسم المُضاف
        // لا يسبّب تمريرًا أفقيًا. (تجاوز رأس AppNav في الإنجليزية @320 مشكلة قائمة سابقًا
        // خارج ملكية هذا الوكيل — مذكورة في التقرير.)
        const sec = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="install-guide-section"]')
          if (!el) return { ok: false, detail: 'section missing' }
          const vw = document.documentElement.clientWidth
          let maxRight = el.getBoundingClientRect().right
          el.querySelectorAll('*').forEach((c) => {
            const r = c.getBoundingClientRect()
            if (r.right > maxRight) maxRight = r.right
          })
          const inner = el.scrollWidth - el.clientWidth
          return { ok: maxRight <= vw + 1 && inner <= 1, maxRight: Math.round(maxRight), vw, inner }
        })
        const tag = `${lang}@${vp.width}`
        check(`(d) settings[${tag}]: install-guide section renders`, section)
        check(`(d) settings[${tag}]: iOS steps present`, iosSteps)
        check(`(d) settings[${tag}]: Android steps present`, androidSteps)
        check(`(d) settings[${tag}]: dir = ${lang === 'en' ? 'ltr' : 'rtl'}`, dir === (lang === 'en' ? 'ltr' : 'rtl'), `dir=${dir}`)
        check(`(d) settings[${tag}]: install-guide section has no horizontal overflow`, sec.ok, JSON.stringify(sec))
        await ctx.close()
      }
    }

    // ——— (e) تدقيق 404: كل المسارات + روابط الفوتر/الإعدادات لا تسقط على NotFound ———
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await ctx.newPage()
      const pageErrors = []
      page.on('pageerror', (e) => pageErrors.push(String(e)))

      const routes = [
        'dashboard', 'workout', 'nutrition', 'progress', 'measurements', 'profile',
        'settings', 'privacy', 'terms', 'contact', 'calc', 'demo', 'login',
      ]
      await seedAndLoad(page, { lang: 'ar', onboarded: true }, '#/dashboard')
      for (const r of routes) {
        await page.goto(`${BASE}/#/${r}`)
        await page.reload()
        await sleep(500)
        const txt = await bodyText(page)
        const isNotFound = txt.includes(T.ar.notFound)
        check(`(e) route #/${r} does not render NotFound`, !isNotFound)
      }

      // روابط الفوتر/الإعدادات القابلة للنقر (من صفحة الإعدادات).
      await page.goto(`${BASE}/#/settings`)
      await page.reload()
      await sleep(600)
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href')),
      )
      const uniqueHrefs = [...new Set(hrefs)]
      check('(e) settings/footer anchor links found', uniqueHrefs.length > 0, uniqueHrefs.join(' '))
      let anyNotFound = false
      const broken = []
      for (const href of uniqueHrefs) {
        await page.goto(`${BASE}/#/settings`)
        await sleep(150)
        await page.evaluate((h) => {
          window.location.hash = h.replace(/^#/, '')
        }, href)
        await sleep(350)
        const txt = await bodyText(page)
        if (txt.includes(T.ar.notFound) || txt.includes(T.en.notFound)) {
          anyNotFound = true
          broken.push(href)
        }
      }
      check('(e) no footer/settings link lands on NotFound', !anyNotFound, broken.join(' '))

      // مسار route غير معروف حقيقي (#/asdf) لا يزال يعرض 404 (لم نكسر السلوك المقصود).
      await page.goto(`${BASE}/#/asdf-nope`)
      await page.reload()
      await sleep(500)
      const unknownTxt = await bodyText(page)
      check('(e) genuinely unknown route path still shows 404', unknownTxt.includes(T.ar.notFound))

      check('(e) no uncaught page errors during audit', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
      await ctx.close()
    }

    await browser.close()
  } finally {
    server.kill()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P12 INSTALL-GUIDE QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
