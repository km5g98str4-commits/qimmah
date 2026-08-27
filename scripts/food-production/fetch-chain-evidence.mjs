#!/usr/bin/env node
/**
 * جالب أدلة قوائم السلاسل — [مهمة الصقل §5]
 *
 * ═══ لماذا وجد ═══
 * موجة السلاسل انتهت بصفر استيراد لأن **كل** مضيفي المصادر الرسمية محجوبون في
 * بيئة الوكلاء (CONNECT 403 مقيسة على 27 مضيفًا — docs/content/CHAIN-MENU-SOURCES.md §2)،
 * وشرط الميثاق §5 قاطع: ما لا يُقرأ من مصدره لا يُستورد. عدّاء CI شبكته مفتوحة
 * (نفس منطق food-corpus وvideo-verify)، فهذا السكربت يجري هناك ويلتقط الأدلة:
 * الصفحة الخام + الصفحة بعد تنفيذ JS (القوائم الحديثة تُرسم عميلًا) + لقطة شاشة.
 *
 * ═══ ما هو وما ليس هو ═══
 * دليلُ قراءةٍ فعلية تُبنى عليه موجة استيراد **مُراجَعة** لاحقًا — ليس مستوردًا
 * آليًا: لا يكتب في foodItems.ts شيئًا، وشرط القبول (الماكروز الأربعة كاملة من
 * المصدر) يفصل فيه قارئ الدليل لا هذا الجالب.
 *
 *   node scripts/food-production/fetch-chain-evidence.mjs
 *
 * المخرج: data/food-production/chain-evidence/<slug>/{raw.html|raw.pdf,rendered.html,shot.png}
 *         + index.json بحالة كل مصدر (نجاح/فشل مسمّى + الأحجام).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = resolve(ROOT, 'data/food-production/chain-evidence')
const { sources } = JSON.parse(readFileSync(resolve(ROOT, 'scripts/food-production/chain-evidence-sources.json'), 'utf8'))

const UA = 'Qimmah-DataPipeline/1.0 (github-actions; nutrition-evidence; contact: repo owner)'
const RENDER_CAP_BYTES = 5 * 1024 * 1024 // صفحة مرسومة أكبر من 5م.ب تُقتطع معلَنًا لا تُلتزم كاملة.

// المتصفّح اختياري معلَن: غيابه (تشغيل محلّي بلا تثبيت) يهبط بالجلب الخام وحده.
let chromium = null
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.log('⚠️  playwright غير متاح — سيُلتقط الخام فقط، وrendered يُعلَّم skipped.')
}

const index = { _readme: 'دليل جلب CI لمصادر السلاسل الرسمية — يقرؤه بشر/موجة استيراد، لا مستورد آلي.', fetchedAt: new Date().toISOString(), results: [] }
const browser = chromium ? await chromium.launch() : null

for (const s of sources) {
  const dir = resolve(OUT, s.slug)
  mkdirSync(dir, { recursive: true })
  const row = { slug: s.slug, chain: s.chain, url: s.url, raw: null, rendered: null, screenshot: null }

  // ① الجلب الخام — يوثّق ما يعيده الخادم بلا JS (وPDF يُحفظ كما هو).
  try {
    const res = await fetch(s.url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(45000) })
    const type = res.headers.get('content-type') ?? ''
    const buf = Buffer.from(await res.arrayBuffer())
    const isPdf = type.includes('pdf') || s.url.endsWith('.pdf')
    const file = isPdf ? 'raw.pdf' : 'raw.html'
    writeFileSync(resolve(dir, file), buf)
    row.raw = { status: res.status, contentType: type, bytes: buf.length, file }
    console.log(`✓ ${s.slug.padEnd(26)} raw ${res.status} ${type.split(';')[0]} ${buf.length}b`)
  } catch (err) {
    row.raw = { error: String(err?.message ?? err) }
    console.log(`✗ ${s.slug.padEnd(26)} raw: ${row.raw.error}`)
  }

  // ② الصفحة بعد JS + لقطة — للقوائم المرسومة عميلًا (سعرات الأصناف تظهر هنا).
  if (s.render && browser) {
    try {
      const page = await browser.newPage({ userAgent: UA, viewport: { width: 1280, height: 2000 } })
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { /* صفحات لا تهدأ شبكتها — نلتقط ما استقرّ */ })
      let html = await page.content()
      const truncated = Buffer.byteLength(html) > RENDER_CAP_BYTES
      if (truncated) html = html.slice(0, RENDER_CAP_BYTES)
      writeFileSync(resolve(dir, 'rendered.html'), html)
      await page.screenshot({ path: resolve(dir, 'shot.png'), fullPage: false })
      row.rendered = { bytes: Buffer.byteLength(html), truncated }
      row.screenshot = 'shot.png'
      await page.close()
      console.log(`  ${' '.repeat(26)} rendered ${row.rendered.bytes}b${truncated ? ' (مقتطعة معلَنة)' : ''} + لقطة`)
    } catch (err) {
      row.rendered = { error: String(err?.message ?? err) }
      console.log(`  ${' '.repeat(26)} rendered ✗ ${row.rendered.error}`)
    }
  } else if (s.render) {
    row.rendered = { skipped: 'playwright unavailable' }
  }

  index.results.push(row)
}

if (browser) await browser.close()
mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')

const ok = index.results.filter((r) => r.raw && !r.raw.error).length
console.log(`\n── الخلاصة ── خام ناجح ${ok}/${sources.length} → ${OUT}/index.json`)
