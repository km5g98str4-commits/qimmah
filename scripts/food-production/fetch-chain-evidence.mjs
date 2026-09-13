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
import { execFileSync } from 'node:child_process'
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

// نصّ مجرّد من الوسوم — يجعل قراءة الدليل رخيصة (المنيو بسعراته يظهر سطرًا سطرًا).
const stripHtml = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
// PDF ⇒ نصّ عبر pdftotext (poppler) إن وُجد؛ غيابه يُعلَن لا يُخفى.
const pdfText = (file) => {
  try { return execFileSync('pdftotext', ['-layout', file, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8') } catch { return null }
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
    if (isPdf) {
      const txt = pdfText(resolve(dir, file))
      if (txt) { writeFileSync(resolve(dir, 'text.txt'), txt); row.text = { from: 'pdftotext', bytes: Buffer.byteLength(txt) } } else row.text = { error: 'pdftotext unavailable' }
    } else if (!s.render && res.status === 200) {
      const txt = type.includes('json') ? buf.toString('utf8') : stripHtml(buf.toString('utf8'))
      writeFileSync(resolve(dir, 'text.txt'), txt); row.text = { from: 'raw', bytes: Buffer.byteLength(txt) }
    }
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
      // تمرير حتى الأسفل: قوائم كثيرة تحمّل أصنافها كسولًا عند الظهور.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight && y < 40000; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } window.scrollTo(0, 0) }).catch(() => {})
      await page.waitForTimeout(1500)
      let html = await page.content()
      const truncated = Buffer.byteLength(html) > RENDER_CAP_BYTES
      if (truncated) html = html.slice(0, RENDER_CAP_BYTES)
      writeFileSync(resolve(dir, 'rendered.html'), html)
      const txt = stripHtml(html)
      writeFileSync(resolve(dir, 'text.txt'), txt); row.text = { from: 'rendered', bytes: Buffer.byteLength(txt) }
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
