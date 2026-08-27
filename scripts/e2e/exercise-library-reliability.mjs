// إثبات متصفح لعقد مكتبة التمارين والتفصيل.
// التشغيل القانوني: npm run test:e2e:exercises

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = 5326
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`

let pass = 0
let fail = 0
const failures = []
const check = (label, condition, detail = '') => {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))

async function waitForServer(ms = 30_000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* preview is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('exercise-library preview server did not start')
}

const settle = (page, ms = 700) => page.waitForTimeout(ms)
const currentHash = (page) => page.evaluate(() => location.hash)
const tap = (page, re) => page.evaluate((source) => {
  const matcher = new RegExp(source, 'i')
  const node = [...document.querySelectorAll('button,a')].find((candidate) => (
    matcher.test((candidate.textContent || '').trim()) || matcher.test(candidate.getAttribute('aria-label') || '')
  ))
  if (!node) return false
  node.click()
  return true
}, re.source)

async function onboardToPreview(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2_600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true })
  await settle(page, 1_200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25_000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28')
  await page.fill('#v2-body-height', '178')
  await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-intent', { timeout: 20_000 })
  // [مهمة الصقل §7] عيب التقاء مقيس: كانت الرحلة تنقر خيار النيّة بفهرسه الخام
  // `nth(1)` (= «اقتراحات أكل») ثم تستدعي `finishInputSteps` بافتراضه `plan`،
  // فيصدق حارس «نمط الأكل» على التناقض ويُسقط الرحلة كلها. `selectIntent`
  // يجعل المُختار والمُبلَّغ قيمة واحدة — كما توصي وثيقة السائق نفسها.
  const chosenIntent = await selectIntent(page, 'meals')
  await page.locator('button[aria-pressed]').nth(3).click({ force: true })
  await answerHistory(page, next, { trained: true })
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosenIntent })
  await settle(page, 1_600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25_000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2_400)
}

let browser
const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA' })
  const page = await context.newPage()
  const diagnostics = { console: [], pageerror: [] }
  page.on('console', (message) => { if (message.type() === 'error') diagnostics.console.push(message.text()) })
  page.on('pageerror', (error) => diagnostics.pageerror.push(String(error)))

  console.log('\n=== الكتالوج والبحث والفلاتر ===')
  await onboardToPreview(page)
  await page.evaluate(() => { location.hash = '/exercises' })
  await page.locator('[data-testid="library-screen"]').waitFor()
  check('المسار العميق #/exercises يصل المكتبة', (await currentHash(page)) === '#/exercises')
  // [مهمة الصقل §7] فحصان كانا مثبَّتين على بيانات تغيّرت: العدّاد صار يُعرض
  // بالأرقام العربية بعد موجة سياسة الأرقام (فيُطوى النظامان قبل المطابقة)،
  // وبديل الوسيط فقد شاهده لأن التغطية اكتملت 181/181 — فالفحص ثنائي الحالة:
  // بديل معلَن عند وجود نقص، أو تغطية كاملة مسمّاة عند غيابه. لا حالة صامتة.
  const foldDigits = (t) => t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const countText = foldDigits((await page.locator('[data-testid="exercise-library-count"]').innerText()).trim())
  check('العداد المرئي يعلن 181 تمرينًا (بأي نظام أرقام)', /^181\b/.test(countText), countText)
  check('كل بطاقات التمارين الـ181 موجودة', await page.locator('[data-testid="exercise-card"]').count() === 181)
  const fallbackCount = await page.locator('[data-media-state="fallback"]').count()
  const cardMediaCount = await page.locator('[data-testid="exercise-card-media"]').count()
  check(
    fallbackCount > 0
      ? 'بديل الوسيط الصادق مستخدم عند غياب الصورة'
      : 'لا بديل لأن تغطية الوسائط كاملة — حالة صادقة مسمّاة لا فحص صامت',
    fallbackCount > 0 || cardMediaCount === 181,
    `fallback=${fallbackCount} · media=${cardMediaCount}`,
  )

  const firstCard = page.locator('[data-testid="exercise-card"]').first()
  const firstId = await firstCard.getAttribute('data-exercise-id')
  const names = await firstCard.locator('bdi').allTextContents()
  check('البطاقة العربية تحمل اسمًا عربيًا وآخر إنجليزيًا قابلين للبحث', names.length >= 2 && names.every((name) => name.trim().length > 0), JSON.stringify(names))
  const search = page.locator('[data-testid="exercise-library-search"]')
  await search.fill(names[0])
  check('البحث العربي يجد البطاقة الأصلية', await page.locator(`[data-exercise-id="${firstId}"]`).count() === 1)
  await search.fill(names[1].toUpperCase())
  check('البحث الإنجليزي غير حساس لحالة الأحرف', await page.locator(`[data-exercise-id="${firstId}"]`).count() === 1)
  await search.fill('')

  await page.locator('[data-filter-kind="muscle"][data-filter-value="chest"]').click()
  await page.locator('[data-filter-kind="equipment"][data-filter-value="barbell"]').click()
  const combinedCount = await page.locator('[data-testid="exercise-card"]').count()
  check('دمج فلتر الصدر والبار يعيد مجموعة أضيق غير فارغة', combinedCount > 0 && combinedCount < 181, String(combinedCount))
  check('حالة الفلاتر المختارة معلنة بـaria-pressed', await page.locator('[data-filter-value="chest"]').getAttribute('aria-pressed') === 'true' && await page.locator('[data-filter-value="barbell"]').getAttribute('aria-pressed') === 'true')
  await search.fill('qimmah-no-such-exercise-001')
  check('النتيجة الفارغة صريحة', await page.getByText(/ما فيه نتائج مطابقة/).isVisible())
  await page.getByRole('button', { name: 'امسح الفلاتر', exact: true }).first().click()
  check('مسح الفلاتر يعيد الكتالوج كاملًا', await page.locator('[data-testid="exercise-card"]').count() === 181)

  console.log('\n=== التفصيل والتاريخ والوصولية ===')
  const opener = page.locator('[data-testid="exercise-card"]').first()
  const openedId = await opener.getAttribute('data-exercise-id')
  await opener.click()
  const dialog = page.locator('[data-testid="exercise-detail"]')
  await dialog.waitFor()
  check('فتح البطاقة يدفع رابط تمرين بمعرّفه', (await currentHash(page)) === `#/exercises/${openedId}`, await currentHash(page))
  check('التفصيل حوار modal معنْون', await dialog.getAttribute('role') === 'dialog' && await dialog.getAttribute('aria-modal') === 'true' && !!(await dialog.getAttribute('aria-labelledby')))
  const backButton = page.getByRole('button', { name: 'الرجوع لمكتبة التمارين', exact: true })
  check('التركيز يبدأ في مخرج الرجوع', await backButton.evaluate((node) => document.activeElement === node))
  check('مخرج الرجوع هدف لمس 44px', await backButton.evaluate((node) => node.getBoundingClientRect().height >= 44))
  check('تعليمات الأداء ظاهرة من القاموس', await page.getByRole('heading', { name: 'طريقة الأداء', exact: true }).isVisible())
  await page.keyboard.press('Shift+Tab')
  check('مصيدة التركيز تبقي Shift+Tab داخل الحوار', await dialog.evaluate((node) => node.contains(document.activeElement)))
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check('Escape يرجع إلى المكتبة', (await currentHash(page)) === '#/exercises')
  // عند الفشل: قُل **أين** ذهبت البؤرة بدل «false» عارية. استعادة البؤرة تختلف بين
  // المحرّكات (Safari لا يُركّز الزرّ عند النقر)، وتشخيصها بلا هذا السطر تخمين.
  check(
    'إغلاق التفصيل يعيد التركيز إلى بطاقة الفتح',
    await page.locator(`[data-exercise-id="${openedId}"]`).first().evaluate((node) => document.activeElement === node),
    await page.evaluate((id) => {
      const a = document.activeElement
      return `activeElement=${a?.tagName ?? 'null'}` +
        ` exId=${a?.getAttribute?.('data-exercise-id') ?? '-'}` +
        ` cardInDom=${!!document.querySelector(`[data-exercise-id="${id}"]`)}`
    }, openedId),
  )

  await page.locator(`[data-testid="exercise-card"][data-exercise-id="${openedId}"]`).click()
  const detailHash = await currentHash(page)
  await page.goBack()
  await page.locator('[data-testid="library-screen"]').waitFor()
  check('Back من التفصيل يعود للمكتبة لا Today', (await currentHash(page)) === '#/exercises')
  await page.goForward()
  await dialog.waitFor()
  check('Forward يعيد نفس التمرين', (await currentHash(page)) === detailHash)
  await page.reload({ waitUntil: 'networkidle' })
  await dialog.waitFor()
  check('Refresh يحفظ رابط التفصيل والتمرين', (await currentHash(page)) === detailHash && await dialog.getAttribute('data-exercise-id') === openedId)
  await page.getByRole('button', { name: 'الرجوع لمكتبة التمارين', exact: true }).click()
  await page.locator('[data-testid="library-screen"]').waitFor()
  check('زر الرابط العميق المباشر يرجع للمكتبة بدل الخروج من قِمّة', (await currentHash(page)) === '#/exercises')

  await page.evaluate(() => { location.hash = '/exercises/not-a-real-exercise' })
  await settle(page, 900)
  check('المعرّف المجهول يُستبدل بالمكتبة بلا 404', (await currentHash(page)) === '#/exercises' && await page.locator('[data-testid="library-screen"]').isVisible())

  console.log('\n=== كتالوج الأجهزة و320px/English ===')
  await page.getByRole('tab', { name: /الأجهزة/ }).click()
  check('كتالوج الأجهزة يُرسم مرة واحدة', await page.locator('[data-testid="exercise-machine-browser"]').count() === 1)
  const machineCard = page.locator('[data-testid="exercise-machine-card"]').first()
  const machineId = await machineCard.getAttribute('data-exercise-id')
  await machineCard.click()
  await dialog.waitFor()
  check('فتح جهاز يستخدم الرابط العميق نفسه', (await currentHash(page)) === `#/exercises/${machineId}`, await currentHash(page))
  await page.getByRole('button', { name: 'الرجوع لمكتبة التمارين', exact: true }).click()
  check('رجوع الجهاز يعود للمكتبة', (await currentHash(page)) === '#/exercises')

  await page.setViewportSize({ width: 320, height: 780 })
  await page.evaluate(() => {
    localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: 'en', hapticsEnabled: true, theme: 'system', themeSchedule: { enabled: false, lat: null, lon: null, cityLabel: null } }))
    location.hash = '/exercises'
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Exercise library', exact: true }).waitFor()
  const layout = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tabs: [...document.querySelectorAll('[role="tab"]')].map((node) => node.getBoundingClientRect().height),
    filters: [...document.querySelectorAll('[data-filter-kind]')].slice(0, 4).map((node) => node.getBoundingClientRect().height),
  }))
  check('English يعرض LTR على المسار نفسه', layout.dir === 'ltr')
  check('320px بلا قص أفقي', layout.overflow <= 1, JSON.stringify(layout))
  check('أهداف لمس التبويبات والفلاتر ≥44px', [...layout.tabs, ...layout.filters].every((height) => height >= 44), JSON.stringify(layout))
  await page.locator('[data-testid="exercise-card"]').first().click()
  await page.locator('[data-testid="exercise-detail"]').waitFor()
  check('تفصيل English يبقى داخل 320px', await page.locator('[data-testid="exercise-detail"]').evaluate((node) => node.getBoundingClientRect().width <= document.documentElement.clientWidth + 1))
  check('المسار كله بلا pageerror', diagnostics.pageerror.length === 0, diagnostics.pageerror.join(' | '))

  await context.close()
} catch (error) {
  fail += 1
  failures.push('unexpected exception')
  console.error(error)
} finally {
  await browser?.close().catch(() => {})
  preview?.kill()
}

console.log(fail === 0
  ? `\n✅ موثوقية مكتبة التمارين: ${pass} فحوص، 0 فشل.`
  : `\n❌ موثوقية مكتبة التمارين: ${pass} نجح، ${fail} فشل — ${failures.join(' | ')}`)
process.exit(fail === 0 ? 0 : 1)
