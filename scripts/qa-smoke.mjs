// أداة QA تطويرية: تحمّل حزمة الإنتاج في متصفح headless وتتحقق من المسارات،
// وسلامة التخزين التالف، والتنقّل بين التبويبات، وغياب أخطاء الـ console.
// تشغيل: node scripts/qa-smoke.mjs  (يتطلّب خادمًا يخدم dist على المنفذ المُمرّر أو 4173)
import { chromium } from './e2e/lib/engine.mjs'

const BASE = process.env.QA_BASE || 'http://localhost:4173'
const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  // نتجاهل فشل تحميل موارد خارجية (خطوط Google) لأنه من بيئة الاختبار المعزولة عن الشبكة،
  // وليس خطأً في التطبيق — نركّز على أخطاء كود التطبيق (pageerror + console.error الحقيقية).
  const isExternalResource = (m) => {
    const url = m.location?.().url || ''
    const txt = m.text()
    return /Failed to load resource/.test(txt) && /fonts\.(googleapis|gstatic)\.com|^$/.test(url)
  }
  page.on('console', (m) => {
    if (m.type() === 'error' && !isExternalResource(m)) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  return { page, errors }
}

// 1) تحميل الهبوط بلا أخطاء console
{
  const { page, errors } = await newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const rootHtml = await page.$eval('#root', (el) => el.innerHTML.length)
  check('الهبوط يرسم محتوى (StartView)', rootHtml > 500, `root html=${rootHtml}b`)
  check('لا أخطاء console على الهبوط', errors.length === 0, errors.slice(0, 3).join(' | '))
  // وسوم SEO/PWA في الـ DOM
  const hasManifest = await page.$('link[rel="manifest"]')
  const hasJsonLd = await page.$('script[type="application/ld+json"]')
  const hasOg = await page.$('meta[property="og:image"]')
  check('رابط manifest موجود', !!hasManifest)
  check('JSON-LD موجود', !!hasJsonLd)
  check('og:image موجود', !!hasOg)
  await page.close()
}

// 2) مسار غير معروف → صفحة 404
{
  const { page, errors } = await newPage()
  await page.goto(`${BASE}/#/asdf-not-real`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const body = await page.textContent('body')
  check('المسار المجهول يعرض 404', /٤٠٤|404|غير موجود/.test(body || ''))
  check('لا أخطاء console على 404', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// 3) تخزين تالف → لا انهيار (يعود للهبوط)
{
  const { page, errors } = await newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('qimmah:onboarding:v1', '{ this is : not json }')
    localStorage.setItem('qimmah:onboarding:profile:v1', '<<<broken>>>')
    localStorage.setItem('qimmah:history:dailyLogs:v1', 'null}{')
  })
  await page.reload({ waitUntil: 'networkidle' })
  const rootHtml = await page.$eval('#root', (el) => el.innerHTML.length)
  check('تخزين تالف لا يكسر التطبيق', rootHtml > 300, `root html=${rootHtml}b`)
  check('لا أخطاء console مع تخزين تالف', errors.length === 0, errors.slice(0, 3).join(' | '))
  await page.close()
}

// 4) إعداد مكتمل → لوحة + تنقّل بين التبويبات الرئيسية بلا أخطاء
{
  const { page, errors } = await newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true, completedAt: '2026-01-01', lastStep: 99 }))
  })
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const dashHtml = await page.$eval('#root', (el) => el.innerHTML.length)
  check('اللوحة ترسم بعد إعداد مكتمل', dashHtml > 800, `root html=${dashHtml}b`)

  for (const tab of ['workout', 'nutrition', 'progress', 'profile']) {
    await page.goto(`${BASE}/#/${tab}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const html = await page.$eval('#root', (el) => el.innerHTML.length)
    check(`تبويب ${tab} يرسم (تحميل حزمة عند الطلب)`, html > 500, `html=${html}b`)
  }
  check('لا أخطاء console عبر كل التبويبات', errors.length === 0, errors.slice(0, 4).join(' | '))
  await page.close()
}

await browser.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('FAILURES:', failed.map((f) => f.name).join(', '))
  process.exit(1)
}
