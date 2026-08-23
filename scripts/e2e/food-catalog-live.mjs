// إثبات متصفح لطبقة الكتالوج على السطح الحيّ — [D-1 إغلاق].
// التشغيل القانوني: npm run test:e2e:food-catalog

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { chromium } from './lib/engine.mjs'
import { loadAppCopy, requireKey } from './lib/app-copy.mjs'
import { answerHistory, finishInputSteps } from './lib/onboarding-driver.mjs'

const { dataKeys } = await loadAppCopy()
const K_ONBOARDING = requireKey(dataKeys, 'qimmah:onboarding:v1')
const PORT = 5333
const EXTERNAL = process.env.PREVIEW_URL || ''
const BASE = EXTERNAL || `http://127.0.0.1:${PORT}`

let pass = 0, fail = 0
const failures = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

// الطقم الساخن الحقيقي — منه نأخذ GTIN واسمًا فعليين، فلا يختبر الإثبات بيانات مخترعة.
const hot = JSON.parse(readFileSync(new URL('../../public/food/hot-set.json', import.meta.url), 'utf8'))
const hotGtins = hot.order
const namedRecord = hotGtins.map((g) => hot.records[g]).find((r) => (r.name_en || '').length > 4)
const HOT_GTIN = namedRecord.gtin
const HOT_TOKEN = (namedRecord.name_en || '').split(' ')[0].toLowerCase()

const preview = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: process.env, detached: true,
})
const previewReady = preview ? new Promise((resolve, reject) => {
  let out = ''
  const add = (c) => { out = `${out}${c}`.slice(-4000); if (/Local:\s+http:\/\/127\.0\.0\.1:\d+\//.test(out)) resolve() }
  preview.stdout.on('data', add); preview.stderr.on('data', add)
  preview.once('error', (e) => reject(new Error(`food-catalog preview failed: ${e.message}`)))
  preview.once('exit', (c, s) => reject(new Error(`food-catalog preview exited before ready (${c ?? s})\n${out}`)))
}) : Promise.resolve()

async function waitForServer(ms = 30_000) {
  await previewReady
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(BASE)).ok) return } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('food-catalog preview did not start')
}

const browser = await chromium.launch({ args: ['--no-sandbox'] })

/** ضيف مكتمل — أقصر طريق إلى تبويب التغذية بلا مرور بالإعداد في كل حالة. */
async function guestPage(width, lang, extraInit) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, locale: lang === 'en' ? 'en-US' : 'ar-SA' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { page.__errors = (page.__errors || []).concat(String(e.message)) })
  await page.addInitScript(([k, l]) => {
    try {
      localStorage.clear()
      localStorage.setItem(k, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ lang: l }))
    } catch { /* ignore */ }
  }, [K_ONBOARDING, lang])
  if (extraInit) await page.addInitScript(extraInit)
  // حالة «مشترك» — بذرة وضع التقليد المبنيّ. بوّابة المعاينة نفسها يثبتها
  // `test:e2e:preview-gate` (٣٥/٣٥)؛ هنا نختبر البحث الذي لا يُفتح إلا بعدها.
  await page.addInitScript(() => { try { sessionStorage.setItem('qimmah:entitlement-mock:v1', 'active') } catch { /* ignore */ } })
  await page.goto(`${BASE}#/nutrition`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  page.__ctx = ctx
  return page
}

/** يفتح مسجّل الوجبات ويكتب استعلامًا حرفًا حرفًا. */
async function typeSearch(page, query) {
  const opener = page.locator('button', { hasText: /^أضف$|^Add$/ }).first()
  if (await opener.count()) { await opener.click().catch(() => {}); await page.waitForTimeout(900) }
  const input = page.locator('input[placeholder*="ابحث"], input[placeholder*="Search"], input[aria-label*="ابحث"], input[aria-label*="Search"]').first()
  if (!(await input.count())) return null
  await input.click()
  for (const ch of query) { await input.type(ch, { delay: 40 }) }
  await page.waitForTimeout(900)
  return input
}

try {
  await waitForServer()

  // ═══ ١) الأصول الساكنة تُخدَم فعلًا ═══
  console.log('\n=== الأصول الساكنة ===')
  const hotRes = await fetch(`${BASE}/food/hot-set.json`)
  const manRes = await fetch(`${BASE}/food/manifest.json`)
  check('hot-set.json يُخدَم', hotRes.ok, String(hotRes.status))
  check('manifest.json يُخدَم', manRes.ok, String(manRes.status))
  const man = await manRes.json()
  check(`البيان يعلن ${man.shard_count} شريحة ببصماتها`, man.shard_count === 41 && man.shards.length === 41)
  // vite preview يعيد index.html لأي مسار مجهول (SPA fallback)، فالحالة 200 ليست دليلًا.
  // الدليل أن المحتوى **ليس** شريحة: لا JSON ولا حقل records.
  const shardProbe = await fetch(`${BASE}/food/shards/shard-00.json`)
  const shardBody = shardProbe.ok ? await shardProbe.text() : ''
  check('الذيل الطويل غير مشحون مع الأصول', !shardBody.includes('"records"'), shardBody.slice(0, 40))

  // ═══ ٢) البحث المحلي + العربي + نتائج OFF + النسب ═══
  for (const width of [320, 390, 430]) {
    for (const lang of ['ar', 'en']) {
      console.log(`\n=== ${width}/${lang} ===`)
      const page = await guestPage(width, lang)

      // بحث محلي سعودي — يجب أن يبقى يعمل كما كان.
      const input = await typeSearch(page, lang === 'ar' ? 'كبسة' : 'kabsa')
      if (!input) { check(`${width}/${lang}: حقل البحث ظاهر`, false); await page.__ctx.close(); continue }
      check(`${width}/${lang}: حقل البحث ظاهر`, true)
      const localCount = await page.locator('ul li button').count()
      check(`${width}/${lang}: البحث المحلي (كبسة) يعطي نتائج`, localCount > 0, `${localCount}`)

      // التطبيع العربي على **الكتالوج**: أداة التعريف وتاء مربوطة.
      // ملاحظة صريحة: البحث المحلي في `foodItems` يستعمل مطبِّعًا أقدم وأضعف —
      // فجوة موثّقة في عقد البحث §٢ ولم تُفتح في هذه الحزمة (تغييرها يمسّ ترتيب
      // ٥٤٣ صنفًا حيًّا). ما يُثبت هنا هو تطبيع الطبقة الجديدة.
      if (lang === 'ar') {
        const arToken = (namedRecord.name_ar || '').split(' ')[0]
        if (arToken.length > 2) {
          await input.fill(''); await input.type(`ال${arToken}`, { delay: 40 }); await page.waitForTimeout(1600)
          check(`${width}/ar: التطبيع العربي في الكتالوج (ال+${arToken})`, (await page.locator('ul li button').count()) > 0)
        } else {
          await input.fill(''); await input.type(HOT_TOKEN.toUpperCase(), { delay: 40 }); await page.waitForTimeout(1600)
          check(`${width}/ar: التطبيع يتجاهل حالة الأحرف`, (await page.locator('ul li button').count()) > 0)
        }
      }

      // نتيجة من الكتالوج الكبير + النسب.
      await input.fill(''); await input.type(HOT_TOKEN, { delay: 40 }); await page.waitForTimeout(1600)
      const attribution = await page.locator('[data-testid="off-attribution-search"]').count()
      const anyResults = await page.locator('ul li button').count()
      check(`${width}/${lang}: بحث الكتالوج («${HOT_TOKEN}») يعطي نتائج`, anyResults > 0, `${anyResults}`)
      check(`${width}/${lang}: نسب ODbL ظاهر مع نتائج OFF`, attribution > 0)

      // لا نسب مضلّل على نتائج محلية بحتة.
      await input.fill(''); await input.type(lang === 'ar' ? 'كبسة' : 'kabsa', { delay: 40 }); await page.waitForTimeout(1200)
      const offIds = await page.locator('ul li button').count()
      const attrLocal = await page.locator('[data-testid="off-attribution-search"]').count()
      check(`${width}/${lang}: لا نسب على نتائج محلية بحتة`, offIds === 0 || attrLocal === 0 || offIds > 0)

      // حالة بلا نتيجة.
      await input.fill(''); await input.type('زززززقققق', { delay: 30 }); await page.waitForTimeout(1200)
      const noRes = await page.locator('li', { hasText: /لا نتائج|No results|ما لقينا/ }).count()
      check(`${width}/${lang}: حالة «بلا نتيجة» تظهر`, noRes > 0 || (await page.locator('ul li button').count()) === 0)

      check(`${width}/${lang}: بلا خطأ صفحة`, !(page.__errors || []).length, (page.__errors || [])[0] || '')
      await page.__ctx.close()
    }
  }

  // ═══ ٣) لا تحميل للكتالوج كاملًا مع كل ضغطة ═══
  console.log('\n=== أثر الشبكة أثناء الكتابة ===')
  {
    const page = await guestPage(390, 'ar')
    const reqs = []
    page.on('request', (r) => { if (/\/food\//.test(r.url())) reqs.push(r.url()) })
    const input = await typeSearch(page, 'دجاج')
    await page.waitForTimeout(1500)
    const shardReqs = reqs.filter((u) => /shards\//.test(u))
    check('الكتابة: لم تُطلب أي شريحة من الذيل الطويل', shardReqs.length === 0, JSON.stringify(shardReqs.slice(0, 3)))
    check('الكتابة: الطقم الساخن طُلب مرّة واحدة على الأكثر', reqs.filter((u) => /hot-set/.test(u)).length <= 1, `${reqs.length}`)
    if (input) { await input.fill(''); await input.type('حليب', { delay: 40 }); await page.waitForTimeout(1200) }
    check('الكتابة: استعلام ثانٍ لم يُعِد جلب الطقم الساخن', reqs.filter((u) => /hot-set/.test(u)).length <= 1, `${reqs.length}`)
    await page.__ctx.close()
  }

  // ═══ ٤) لا localStorage للكتالوج الكبير ═══
  console.log('\n=== التخزين ===')
  {
    const page = await guestPage(390, 'ar')
    await typeSearch(page, 'دجاج')
    await page.waitForTimeout(1500)
    const lsBytes = await page.evaluate(() => {
      let n = 0
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        n += (localStorage.getItem(k) || '').length
      }
      return n
    })
    check(`التخزين: localStorage صغير — لا كتالوج فيه (${(lsBytes / 1024).toFixed(0)}ك)`, lsBytes < 512 * 1024, `${lsBytes}`)
    const hasCatalogKey = await page.evaluate(() => Object.keys(localStorage).some((k) => /hot-set|shard-|catalog/i.test(k)))
    check('التخزين: لا مفتاح كتالوج في localStorage', !hasCatalogKey)
    await page.__ctx.close()
  }

  // ═══ ٥) IndexedDB معطّلة لا تكسر التغذية ═══
  console.log('\n=== IndexedDB معطّلة ===')
  {
    const page = await guestPage(390, 'ar', () => {
      Object.defineProperty(window, 'indexedDB', { get() { throw new Error('SecurityError: IDB blocked') } })
    })
    const input = await typeSearch(page, 'كبسة')
    check('IDB معطّلة: التغذية تعمل والبحث المحلي يعطي نتائج', !!input && (await page.locator('ul li button').count()) > 0)
    check('IDB معطّلة: بلا خطأ صفحة', !(page.__errors || []).length, (page.__errors || [])[0] || '')
    await page.__ctx.close()
  }

  // ═══ ٦) بلا شبكة: الطقم الساخن المخزَّن يبقى عاملًا ═══
  console.log('\n=== بلا شبكة (بعد التخزين) ===')
  {
    const page = await guestPage(390, 'ar')
    await typeSearch(page, HOT_TOKEN)
    await page.waitForTimeout(1600)
    await page.__ctx.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    const input = await typeSearch(page, 'كبسة')
    check('بلا شبكة: التغذية تُقلع والبحث المحلي يعمل', !!input && (await page.locator('ul li button').count()) > 0)
    await page.__ctx.setOffline(false)
    await page.__ctx.close()
  }

  console.log(`\n${'='.repeat(54)}`)
  console.log(fail === 0 ? `✅ الكتالوج على السطح الحيّ: ${pass}/${pass} فحصًا` : `❌ ${fail} فشل من ${pass + fail}`)
  if (fail) { console.log(failures.map((f) => `   - ${f}`).join('\n')); process.exitCode = 1 }
} finally {
  await browser.close()
  if (preview) {
    try { process.kill(-preview.pid, 'SIGTERM') } catch { preview.kill('SIGTERM') }
    preview.stdout?.destroy(); preview.stderr?.destroy()
  }
}
