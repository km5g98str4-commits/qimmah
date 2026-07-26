// لقطات خريطة العضلات (Q21) — قبل/بعد وحالات الاختيار والفراغ.
//
// يقود سطح «التقدّم» في سقالة العرض التطويرية (scripts/momentum-shot) بمتصفّح
// حقيقي، ويحفظ اللقطات في docs/product/assets/q21/.
//
//   node scripts/shoot-muscle-map.mjs            # لقطات «بعد»
//   node scripts/shoot-muscle-map.mjs --before   # لقطة «قبل» (تتطلّب إعادة وصل المجسّم)

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4327
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/?surface=progress`
const OUT = 'docs/product/assets/q21'
const BEFORE = process.argv.includes('--before')

mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('harness server did not start')
}

/** يمرّر البطاقة إلى أعلى الشاشة ويُعيد إطار البطاقة للقصّ. */
const CARD_TITLE_AFTER = 'خريطة عضلاتك'
const CARD_TITLE_BEFORE = 'مجسّم'

async function focusCard(page, title) {
  return page.evaluate((t) => {
    // البطاقة قد تكون section أو div. نبدأ من أعمق عنصر يحوي العنوان ثم نصعد
    // حتى نصل إلى حاوية بحجم بطاقة حقيقية — الصعود الأعمى يعطي شريحة صغيرة.
    const nodes = [...document.querySelectorAll('section, div')].filter((n) => n.innerText?.includes(t))
    let card = nodes[nodes.length - 1] ?? null
    while (card && card.getBoundingClientRect().height < 220 && card.parentElement) {
      card = card.parentElement
    }
    if (!card) return null
    let el = card.parentElement
    let sc = null
    while (el) {
      const st = getComputedStyle(el)
      if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 20) { sc = el; break }
      el = el.parentElement
    }
    if (sc) {
      sc.style.scrollBehavior = 'auto'
      sc.scrollTop += card.getBoundingClientRect().top - 12
    }
    const r = card.getBoundingClientRect()
    return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: Math.min(375, r.width + 16), height: r.height + 16 }
  }, title)
}

const shots = []
let browser
try {
  await waitForServer()
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 375, height: 900 }, locale: 'ar-SA', deviceScaleFactor: 2 })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  if (BEFORE) {
    const clip = await focusCard(page, CARD_TITLE_BEFORE)
    if (!clip) throw new Error('لم أجد بطاقة المجسّم — أعد وصل BodyModel3D أولًا')
    await page.waitForTimeout(1200) // المجسّم يحتاج إطارًا أو اثنين للرسم
    await page.screenshot({ path: `${OUT}/before-body3d.png`, clip })
    shots.push('before-body3d.png')
  } else {
    // ① الحالة الافتراضية
    let clip = await focusCard(page, CARD_TITLE_AFTER)
    if (!clip) throw new Error('لم أجد بطاقة الخريطة')
    await page.screenshot({ path: `${OUT}/after-map-default.png`, clip })
    shots.push('after-map-default.png')

    // ② حالة الاختيار (الصدر)
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('section')].find((s) => s.innerText.includes('خريطة عضلاتك'))
      const chest = [...card.querySelectorAll('g[role="button"]')].find((g) => (g.getAttribute('aria-label') || '').startsWith('الصدر'))
      chest?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await page.waitForTimeout(500)
    clip = await focusCard(page, CARD_TITLE_AFTER)
    await page.screenshot({ path: `${OUT}/after-map-selected.png`, clip })
    shots.push('after-map-selected.png')

    // ③ الحالة الفارغة — بلا أي جلسة.
    // السقالة تعيد زرع بياناتها عند كل تحميل، فمسح localStorage ثم التحديث لا
    // يُنتج فراغًا. الحلّ: صفحة جديدة يُسجَّل عليها حجب مفاتيح الجلسات **قبل**
    // أول ملاحة (addInitScript لا يسري على صفحة سبقت ملاحتها)، فتزرع السقالة كل
    // شيء إلا سجلّ التمارين — وهذا بالضبط حال مستخدم جديد.
    const fresh = await browser.newPage({ viewport: { width: 375, height: 900 }, locale: 'ar-SA', deviceScaleFactor: 2 })
    await fresh.addInitScript(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function patched(key, value) {
        if (/workoutSessions|exerciseHistory/i.test(String(key))) return
        return original.call(this, key, value)
      }
    })
    await fresh.goto(BASE, { waitUntil: 'networkidle' })
    await fresh.waitForTimeout(700)
    const sessionCount = await fresh.evaluate(
      () => JSON.parse(localStorage.getItem('qimmah:history:workoutSessions:v1') || '[]').length,
    )
    if (sessionCount !== 0) throw new Error(`الحجب لم ينجح — ما زالت ${sessionCount} جلسة مزروعة`)
    clip = await focusCard(fresh, CARD_TITLE_AFTER)
    if (clip) {
      await fresh.screenshot({ path: `${OUT}/after-map-empty.png`, clip })
      shots.push('after-map-empty.png')
    }
    await fresh.close()
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

console.log(`✅ ${shots.length} لقطة في ${OUT}/`)
shots.forEach((s) => console.log(`   ${s}`))
