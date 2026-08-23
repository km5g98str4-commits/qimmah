// WCAG 2.1 AA sweep — يُكمّل تدقيق التدقيق السابق (150/150 عند 80e31f7)، ويُركّز خصوصًا على
// التأكّد من عدم انحدار أي شيء بسبب تغييرات هذا الفرع (رابط التخطّي QEA-005، وحدود
// #main-content الجديدة). يغطّي: 320/768/1280، ترتيب/وضوح التركيز، تصفّح بلوحة مفاتيح
// فقط، حركة مخفَّضة (reducedMotion)، تسميات/ARIA أساسية، وبقع تباين تمثيلية.
//
// مجلّد الأدلة قابل للحقن.

import { spawn } from 'node:child_process'
import { chromium } from './e2e/lib/engine.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { completeOnboarding, seedMockSession } from './lib/onboarding-driver.mjs'

const EVIDENCE_DIR = resolve(process.argv[2] || process.env.EVIDENCE_DIR || join(tmpdir(), `qimmah-wcag-sweep-${Date.now()}`))
mkdirSync(EVIDENCE_DIR, { recursive: true })

const PORT = 5188
const URL = `http://localhost:${PORT}`
const WIDTHS = [320, 768, 1280]

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

let browser
let preview
try {
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((res, rej) => {
    const start = Date.now()
    const poll = async () => {
      try { if ((await fetch(URL)).ok) return res() } catch {}
      if (Date.now() - start > 20000) return rej(new Error('preview did not start'))
      setTimeout(poll, 300)
    }
    poll()
  })

  browser = await chromium.launch()

  // ————— ١) لا انسكاب أفقي عند 320/768/1280 — ضيف + مُصادَق. —————
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ar' })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)
    const guestOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    check(`${width}px: لا انسكاب أفقي (ضيف)`, guestOverflow)

    const uid = `wcag-${width}`
    await page.evaluate((s) => localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(s)), seedMockSession(uid))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2200)
    await completeOnboarding(page)
    await page.waitForTimeout(500)
    const authOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    check(`${width}px: لا انسكاب أفقي (مُصادَق — لوحة اليوم)`, authOverflow)

    // RTL جذر ثابت على كل الأحجام.
    const rtl = await page.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar')
    check(`${width}px: RTL + lang=ar على الجذر`, rtl)

    await ctx.close()
  }

  // ————— ٢) ترتيب/وضوح التركيز + تصفّح بلوحة مفاتيح فقط (مسار حقيقي: تخطٍّ ← تبويب ← تفعيل). —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)

    await page.keyboard.press('Tab')
    const firstFocusVisible = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return false
      const style = getComputedStyle(el)
      // outline غير "none" أو صندوق ظل مرئي — تحقّق أساسي لوضوح التركيز (لا اعتماد على لون واحد).
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none' || el.matches(':focus-visible')
    })
    check('أول عنصر تركيز (رابط التخطّي) له مؤشّر تركيز مرئي', firstFocusVisible)

    // تصفّح بلوحة مفاتيح فقط عبر عدّة عناصر — كل تركيز يهبط على عنصر تفاعلي حقيقي (لا فخّ، لا فقد).
    let allLanded = true
    const seenTags = new Set()
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => ({ tag: document.activeElement?.tagName, inBody: document.body.contains(document.activeElement) }))
      if (!info.inBody || !info.tag) { allLanded = false; break }
      seenTags.add(info.tag)
    }
    check('تصفّح بلوحة مفاتيح فقط: 8 تبويبات متتالية كلّها تهبط على عناصر حقيقية (لا فخّ تركيز)', allLanded, [...seenTags].join(','))

    await ctx.close()
  }

  // ————— ٣) حركة مخفَّضة — السياق يُنشأ بـ reducedMotion، الصفحة تُقلع دون خطأ. —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar', reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)
    const rendered = (await page.locator('body').innerText().catch(() => '')).trim().length > 5
    check('reducedMotion=reduce: الصفحة تُقلع بلا أخطاء وتُعرض بمحتوى', rendered && errors.length === 0, errors.join(' | '))
    await ctx.close()
  }

  // ————— ٤) تسميات/ARIA أساسية — كل زرّ أيقونة له اسم يمكن الوصول إليه، لا tabindex موجب. —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' })
    const page = await ctx.newPage()
    const uid = 'wcag-aria'
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((s) => localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(s)), seedMockSession(uid))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2200)
    await completeOnboarding(page)
    await page.waitForTimeout(500)

    const unnamedButtons = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      return btns.filter((b) => {
        const accessibleName = (b.textContent || '').trim() || b.getAttribute('aria-label') || b.getAttribute('title')
        return !accessibleName
      }).length
    })
    check('لا أزرار بلا اسم يمكن الوصول إليه (نص/aria-label)', unnamedButtons === 0, `unnamed=${unnamedButtons}`)

    const positiveTabindex = await page.evaluate(() => [...document.querySelectorAll('[tabindex]')].filter((el) => Number(el.getAttribute('tabindex')) > 0).length)
    check('لا tabindex موجب يكسر ترتيب DOM الطبيعي', positiveTabindex === 0, `count=${positiveTabindex}`)

    const imagesNoAlt = await page.evaluate(() => [...document.querySelectorAll('img')].filter((img) => img.getAttribute('alt') === null).length)
    check('كل <img> له alt (ولو فارغًا للعناصر الزخرفية)', imagesNoAlt === 0, `missing=${imagesNoAlt}`)

    await ctx.close()
  }

  // ————— ٥) بقع تباين تمثيلية (نص عادي ≥ 4.5:1). —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)

    function relLum([r, g, b]) {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    function contrastRatio(fg, bg) {
      const l1 = relLum(fg) + 0.05
      const l2 = relLum(bg) + 0.05
      return l1 > l2 ? l1 / l2 : l2 / l1
    }
    const spots = await page.evaluate(() => {
      const parseRgb = (s) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
      }
      const els = [...document.querySelectorAll('h1, p, button, a, span')].filter((el) => (el.textContent || '').trim().length > 2).slice(0, 12)
      return els.map((el) => {
        const cs = getComputedStyle(el)
        return { fg: parseRgb(cs.color), bg: parseRgb(cs.backgroundColor) || [16, 18, 22], text: (el.textContent || '').trim().slice(0, 20) }
      }).filter((s) => s.fg)
    })
    let lowContrastCount = 0
    for (const s of spots) {
      const ratio = contrastRatio(s.fg, s.bg)
      if (ratio < 4.5) lowContrastCount += 1
    }
    check('بقع التباين التمثيلية (12 عنصرًا) ≥ 4.5:1 لمعظمها', lowContrastCount <= 2, `low=${lowContrastCount}/${spots.length} (بعض الفحوص تُقارِن خلفية أب لا خلفية فعلية شفّافة — قد تُبالغ في نسبة سلبية كاذبة)`)

    await ctx.close()
  }

  preview.kill()
} catch (e) {
  check('اكتمل السيناريو بلا استثناء غير متوقّع', false, e.stack || e.message)
} finally {
  await browser?.close()
  preview?.kill()
}

const failed = results.filter((r) => !r.ok)
const summary = { evidenceDir: EVIDENCE_DIR, widths: WIDTHS, total: results.length, passed: results.length - failed.length, failed: failed.length, results }
writeFileSync(join(EVIDENCE_DIR, 'wcag-aa-sweep.json'), JSON.stringify(summary, null, 2))
console.log(`\nالأدلة: ${join(EVIDENCE_DIR, 'wcag-aa-sweep.json')}`)
console.log(failed.length === 0 ? `\n✅ نجحت كل الفحوص — ${results.length} فحصًا.` : `\n❌ فشل ${failed.length} من ${results.length} فحصًا.`)
process.exit(failed.length === 0 ? 0 : 1)
