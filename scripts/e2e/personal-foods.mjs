// إثبات متصفّح: «أكلاتي» — الأطعمة المخصّصة تعيش أكثر من يوم. [FOOD-UX-001]
//
// الرحلة كما يعيشها المستخدم على الواجهة الحيّة (لا على الدوال):
//   أنشئ وجبة مخصّصة بكسور عشرية (300.5 · 27.5 · 8.25 · «12,75» بفاصلة) → سجّل واحفظ
//   → غادر (إعادة تحميل + يوم جديد بلا سجلّ) → ارجع → تلقاها في «أكلاتي» → سجّلها
//   بمضاعف ١٫٥ → تظهر في البحث بشارتها → عدّلها → احذفها بتأكيد → الإنجليزية.
//
// التشغيل: npm run test:e2e:personal-foods  (يبني بـ VITE_ENTITLEMENT_MODE=mock)

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { answerHistory, finishInputSteps, selectIntent } from './lib/onboarding-driver.mjs'

const PORT = 5327
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const PERSONAL_KEY = 'qimmah:personalFoods:v1'
const DAY_KEY = 'qimmah:nutrition:v2'

let pass = 0
let fail = 0
const failures = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const startPreview = () => (EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: process.env }))
async function waitForServer(ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const settle = (page, ms = 1500) => page.waitForTimeout(ms)
const tap = (page, re) => page.evaluate((s) => {
  const rx = new RegExp(s)
  const el = [...document.querySelectorAll('button,a')].find((b) => rx.test((b.textContent || '').trim()))
  if (!el) return false
  el.click()
  return true
}, re.source)

let browser
async function fresh(w = 390) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, locale: 'ar-SA' })
  const page = await ctx.newPage()
  page.diag = { pageerror: [] }
  page.on('pageerror', (e) => page.diag.pageerror.push(String(e)))
  page.ctx = ctx
  return page
}

async function onboardToPreview(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await settle(page, 2600)
  await page.locator('[data-testid="welcome-start-cta"]').click({ force: true }); await settle(page, 1200)
  await tap(page, /نبدأ/)
  await page.waitForSelector('#v2-body-age', { timeout: 25000 })
  await page.locator('input[type=checkbox]').first().check({ force: true })
  await page.fill('#v2-body-age', '28'); await page.fill('#v2-body-height', '178'); await page.fill('#v2-body-weight', '82')
  await page.locator('button[aria-pressed]').first().click({ force: true })
  const next = () => page.locator('footer button').last().click({ force: true })
  await next(); await page.waitForSelector('#onb-title-intent', { timeout: 20000 })
  const rows = page.locator('button[aria-pressed]')
  const chosenIntent = await selectIntent(page, 'meals'); await rows.nth(3).click({ force: true })
  await answerHistory(page, next)
  await page.locator('button[aria-pressed]').first().click({ force: true })
  await finishInputSteps(page, next, { intent: chosenIntent }); await settle(page, 1600)
  await tap(page, /الدخول للوحة/)
  await page.waitForSelector('[data-testid="plan-handoff"]', { timeout: 25000 })
  await page.locator('[data-testid="handoff-preview-cta"]').click({ force: true })
  await settle(page, 2600)
}

async function activateFromOpenGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  await gate.locator('[data-testid="premium-gate-have-code"]').click({ timeout: 10000 })
  await gate.locator('[data-testid="activation-code-input"]').fill('QIMMAH-TEST-OK')
  await gate.locator('[data-testid="activation-code-submit"]').click({ force: true })
  await gate.locator('[data-testid="activation-code-message"]').filter({ hasText: /تمّ التفعيل|activated/i }).waitFor({ timeout: 10000 })
  await gate.locator('[data-testid="premium-gate-dismiss"]').click({ timeout: 10000 })
  await gate.waitFor({ state: 'hidden', timeout: 10000 })
}

const dayFoods = (page) => page.evaluate((k) => {
  try { const d = JSON.parse(localStorage.getItem(k) || '{}'); return Array.isArray(d.foods) ? d.foods : [] } catch { return [] }
}, DAY_KEY)
const personalFoods = (page) => page.evaluate((k) => {
  try { const r = JSON.parse(localStorage.getItem(k) || '{}'); return Object.values(r).flat() } catch { return [] }
}, PERSONAL_KEY)

const mealCard = (page, name) => page.getByText(name, { exact: true })
  .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " card ")][1]')

const preview = startPreview()
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

  console.log('\n=== ① إنشاء وجبة مخصّصة بكسور → سجّل واحفظ ===')
  const page = await fresh(390)
  await onboardToPreview(page)
  await page.evaluate(() => { location.hash = '/nutrition' })
  await settle(page, 2200)

  const breakfast = mealCard(page, 'الفطور')
  await breakfast.getByRole('button', { name: 'أضف', exact: true }).click()
  await activateFromOpenGate(page)
  await breakfast.getByRole('button', { name: 'أضف', exact: true }).click()
  await settle(page, 600)
  await breakfast.getByRole('button', { name: 'إضافة سريعة مخصّصة', exact: true }).click()
  await settle(page, 400)
  const form = breakfast.locator('[data-testid="custom-food-form"]')
  check('نموذج المخصّص ظاهر مع خيار «احفظها في أكلاتي» مفعَّل افتراضيًا', await form.isVisible() && await form.locator('[data-testid="save-to-mine"]').isChecked())
  const decimalKeyboard = await form.evaluate((el) => [...el.querySelectorAll('input')].filter((i) => i.id !== 'qml-custom-name' && i.type !== 'checkbox').every((i) => i.getAttribute('inputmode') === 'decimal'))
  check('حقول الأرقام الأربعة تطلب لوحة مفاتيح عشرية على الجوال', decimalKeyboard)
  await form.locator('#qml-custom-name').fill('وجبة الدجاج حقّتي')
  const numInputs = form.locator('input[inputmode="decimal"]')
  await numInputs.nth(0).pressSequentially('300.5')
  await numInputs.nth(1).pressSequentially('٢٧٫٥') // أرقام عربية وفاصلة عربية كما تكتبها لوحة iOS العربية
  await numInputs.nth(2).pressSequentially('8.25')
  await numInputs.nth(3).pressSequentially('12,75') // فاصلة لاتينية
  const typed = await Promise.all([0, 1, 2, 3].map((i) => numInputs.nth(i).inputValue()))
  check('الكسور تبقى كما كُتبت بعد التطبيع: 300.5 · 27.5 · 8.25 · 12.75', JSON.stringify(typed) === JSON.stringify(['300.5', '27.5', '8.25', '12.75']), JSON.stringify(typed))
  const submit = form.locator('[data-testid="custom-submit"]')
  check('زر الإرسال يقول «سجّل واحفظ» حين يوجد اسم والحفظ مفعَّل', (await submit.textContent() || '').includes('سجّل واحفظ'))
  await submit.click()
  await settle(page, 900)

  let foods = await dayFoods(page)
  const e1 = foods[0]
  check('سجّل اليوم: 300.5 سعرة · 27.5 بروتين · 8.3 كارب · 12.8 دهون (خانة عشرية) تحت الفطور', foods.length === 1 && e1.calories === 300.5 && e1.protein === 27.5 && e1.carbs === 8.3 && e1.fat === 12.8 && e1.meal === 'breakfast', JSON.stringify(e1))
  let mine = await personalFoods(page)
  check('«أكلاتي» تحمل الوجبة بنفس الكسور', mine.length === 1 && mine[0].nameAr === 'وجبة الدجاج حقّتي' && mine[0].calories === 300.5 && mine[0].protein === 27.5, JSON.stringify(mine))

  console.log('\n=== ② المغادرة والعودة في يوم جديد ===')
  await page.evaluate((k) => { localStorage.removeItem(k) }, DAY_KEY) // «بكرة»: سجلّ اليوم يبدأ فارغًا
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 2000)
  check('سجلّ اليوم الجديد فارغ', (await dayFoods(page)).length === 0)
  const lunch = mealCard(page, 'الغداء')
  await lunch.getByRole('button', { name: 'أضف', exact: true }).click()
  await settle(page, 600)
  await lunch.locator('[data-testid="tab-mine"]').click()
  await settle(page, 400)
  const row = lunch.locator('[data-testid="mine-row"]')
  check('تبويب «أكلاتي» يعرض الوجبة المحفوظة أمس', await row.count() === 1 && /وجبة الدجاج حقّتي/.test(await row.first().textContent() || ''))
  await row.first().locator('button').first().click()
  await settle(page, 400)
  const panel = lunch.locator('[data-testid="personal-portion"]')
  check('اختيار الوجبة يفتح لوحة الحصص', await panel.isVisible())
  await panel.locator('#qml-personal-servings').fill('1.5')
  await settle(page, 200)
  check('المعاينة تعرض ١٫٥ حصة = 450.8 سعرة قبل التسجيل', /450\.8|٤٥٠٫٨/.test(await panel.textContent() || ''), (await panel.textContent() || '').slice(0, 120))
  await panel.locator('[data-testid="personal-add"]').click()
  await settle(page, 900)
  foods = await dayFoods(page)
  const e2 = foods[0]
  check('تسجيل ١٫٥ حصة تحت الغداء: 450.8 سعرة · 41.3 بروتين · foodId=personal:pf-1', foods.length === 1 && e2.meal === 'lunch' && e2.calories === 450.8 && e2.protein === 41.3 && e2.foodId === 'personal:pf-1' && e2.servings === 1.5, JSON.stringify(e2))
  mine = await personalFoods(page)
  check('ختم الاستعمال على الوجبة (useCount=1)', mine[0].useCount === 1 && !!mine[0].lastUsedAt)

  console.log('\n=== ③ البحث يعرض أكلاتي أوّلًا ===')
  const dinner = mealCard(page, 'العشاء')
  await dinner.getByRole('button', { name: 'أضف', exact: true }).click()
  await settle(page, 600)
  await dinner.getByPlaceholder('ابحث عن أكل…').fill('دجاج')
  await settle(page, 700)
  const hit = dinner.locator('[data-testid="personal-hit"]')
  check('«دجاج» يعرض الوجبة المحفوظة بشارة «من أكلاتي»', await hit.count() === 1 && /من أكلاتي/.test(await hit.first().textContent() || ''))
  const firstRow = await dinner.locator('ul li').first().textContent()
  check('وتظهر قبل نتائج القاعدة', /وجبة الدجاج حقّتي/.test(firstRow || ''), (firstRow || '').slice(0, 60))
  await dinner.getByPlaceholder('ابحث عن أكل…').fill('كبسة')
  await settle(page, 700)
  check('«كبسة» لا يعرض الوجبة الشخصية (لا مطابقة زائفة)', await dinner.locator('[data-testid="personal-hit"]').count() === 0)

  console.log('\n=== ④ التعديل ===')
  await dinner.locator('[data-testid="tab-mine"]').click()
  await settle(page, 400)
  await dinner.locator('button[aria-label^="تعديل:"]').first().click()
  await settle(page, 400)
  const editForm = dinner.locator('[data-testid="custom-food-form"]')
  check('التعديل يفتح نموذج المخصّص بقيم الوجبة وترويسة «تعديل أكلة»', await editForm.getAttribute('data-editing') === 'pf-1' && await editForm.locator('#qml-custom-name').inputValue() === 'وجبة الدجاج حقّتي' && /تعديل أكلة/.test(await editForm.textContent() || ''))
  const editNums = editForm.locator('input[inputmode="decimal"]')
  await editNums.nth(0).fill('310')
  const editSubmit = editForm.locator('[data-testid="custom-submit"]')
  check('زر الحفظ يقول «احفظ التعديل»', /احفظ التعديل/.test(await editSubmit.textContent() || ''))
  const beforeEdit = (await dayFoods(page)).length
  await editSubmit.click()
  await settle(page, 700)
  mine = await personalFoods(page)
  check('التعديل يحدّث «أكلاتي» (310) ولا يسجّل شيئًا لليوم', mine.length === 1 && mine[0].calories === 310 && !!mine[0].updatedAt && (await dayFoods(page)).length === beforeEdit, JSON.stringify(mine[0]))
  check('رسالة «اتعدّلت.» ظاهرة في تبويب أكلاتي', /اتعدّلت/.test(await dinner.locator('[data-testid="mine-message"]').textContent().catch(() => '') || ''))

  console.log('\n=== ⑤ الحذف بتأكيد ===')
  await dinner.locator('[data-testid="mine-delete"]').first().click()
  await settle(page, 300)
  check('الضغطة الأولى تطلب تأكيدًا ولا تحذف', await dinner.locator('[data-testid="mine-delete-confirm"]').count() === 1 && (await personalFoods(page)).length === 1)
  await dinner.locator('[data-testid="mine-delete-confirm"]').click()
  await settle(page, 500)
  check('التأكيد يحذف وتظهر حالة الفراغ', (await personalFoods(page)).length === 0 && await dinner.locator('[data-testid="mine-empty"]').isVisible())
  check('سجلّ اليوم لا يتأثّر بحذف الأكلة من أكلاتي', (await dayFoods(page)).length === beforeEdit)
  check('بلا استثناءات صفحة', page.diag.pageerror.length === 0, page.diag.pageerror.slice(0, 1).join(' '))
  await page.ctx.close()

  console.log('\n=== ⑥ الإنجليزية ===')
  const en = await fresh(390)
  await onboardToPreview(en)
  await en.evaluate((k) => {
    const p = JSON.parse(localStorage.getItem('qimmah:prefs:v1') || '{}'); p.language = 'en'; localStorage.setItem('qimmah:prefs:v1', JSON.stringify(p))
    localStorage.setItem(k, JSON.stringify({ guest: [{ id: 'pf-1', nameAr: 'My chicken meal', calories: 300.5, protein: 27.5, createdAt: '2026-09-13T00:00:00.000Z' }] }))
  }, PERSONAL_KEY)
  await en.reload({ waitUntil: 'networkidle' })
  await settle(en, 2000)
  await en.evaluate(() => { location.hash = '/nutrition' })
  await settle(en, 2000)
  const bf = mealCard(en, 'Breakfast')
  await bf.getByRole('button', { name: 'Add', exact: true }).click()
  await settle(en, 500)
  if (await en.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)) { await activateFromOpenGate(en); await bf.getByRole('button', { name: 'Add', exact: true }).click(); await settle(en, 500) }
  const enTab = bf.locator('[data-testid="tab-mine"]')
  check('@en: tab reads “My foods”', (await enTab.textContent() || '').trim() === 'My foods')
  await enTab.click()
  await settle(en, 400)
  check('@en: saved food listed with “per serving”', /My chicken meal/.test(await bf.locator('[data-testid="mine-row"]').first().textContent() || '') && /per serving/.test(await bf.textContent() || ''))
  await bf.getByRole('button', { name: 'Custom quick add', exact: true }).click()
  await settle(en, 300)
  check('@en: save checkbox copy', /Save to my foods/.test(await bf.locator('[data-testid="custom-food-form"]').textContent() || ''))
  check('@en: no page errors', en.diag.pageerror.length === 0)
  await en.ctx.close()
} catch (err) {
  fail += 1
  failures.push(`exception: ${String(err?.message ?? err)}`)
  console.log(`  ✗ EXCEPTION: ${String(err?.stack ?? err)}`)
} finally {
  await browser?.close().catch(() => {})
  preview?.kill()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} أكلاتي في المتصفّح: ${pass} نجحت / ${fail} فشلت`)
if (fail) { console.log(failures.map((f) => ` - ${f}`).join('\n')); process.exit(1) }
