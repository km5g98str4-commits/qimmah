/**
 * قياس الترتيب **البصري** لسطر التاريخ في Chromium حقيقي — [R3-UX-BIDI].
 *
 * خارج البوابة المحلّية عمدًا (§4.0): كلفة متصفّح في كل بوابة أعلى من عائدها،
 * والمقابل الملزم هو تشغيل هذا السكربت وقراءة مخرجاته عند أي مساس بسطر التاريخ.
 * البنية التي يحرسها `run-today-bidi-proof.mjs` هي ما يجعل هذا القياس مستقرًّا.
 *
 * التشغيل: node scripts/today-bidi-order-shot.mjs
 */
import { chromium } from './e2e/lib/engine.mjs'

const MARKUP = (dir, weekday, detail) => `
<div dir="${dir}" style="width:390px;font:700 14px system-ui">
  <p id="line" style="display:flex;flex-wrap:wrap;align-items:baseline;column-gap:6px;margin:0">
    <span data-part="weekday">${weekday}</span>
    <span data-part="sep">·</span>
    <bdi data-part="detail">${detail}</bdi>
  </p>
</div>`

// النصّ المركَّب القديم — للمقارنة، وليس ما تُصيّره الواجهة اليوم.
const LEGACY = (dir, text) => `<div dir="${dir}" style="width:390px;font:700 14px system-ui"><p id="line" style="margin:0">${text}</p></div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const orderOfParts = async (html) => {
  await page.setContent(html)
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-part]')]
      .map((el) => ({ k: el.dataset.part, x: el.getBoundingClientRect().left }))
      .sort((a, b) => a.x - b.x)
      .map((o) => o.k),
  )
}

const orderOfText = async (html, text) => {
  await page.setContent(html)
  return page.evaluate((t) => {
    const node = document.getElementById('line').firstChild
    const kind = (ch) => (/[0-9٠-٩]/.test(ch) ? 'N' : /\s/.test(ch) ? 'S' : 'W')
    const out = []
    let start = 0
    for (let i = 1; i <= t.length; i++) {
      if (i === t.length || kind(t[i]) !== kind(t[start])) {
        const r = document.createRange()
        r.setStart(node, start); r.setEnd(node, i)
        out.push({ t: t.slice(start, i), x: r.getBoundingClientRect().left })
        start = i
      }
    }
    return out.filter((o) => o.t.trim() !== '').sort((a, b) => a.x - b.x).map((o) => o.t)
  }, text)
}

const cases = [
  { dir: 'rtl', weekday: 'الاثنين', detail: '17 أغسطس', expect: ['detail', 'sep', 'weekday'] },
  { dir: 'rtl', weekday: 'الاثنين', detail: '١٧ أغسطس', expect: ['detail', 'sep', 'weekday'] },
  { dir: 'ltr', weekday: 'Monday', detail: 'August 17', expect: ['weekday', 'sep', 'detail'] },
]

let bad = 0
for (const c of cases) {
  const got = await orderOfParts(MARKUP(c.dir, c.weekday, c.detail))
  const ok = JSON.stringify(got) === JSON.stringify(c.expect)
  if (!ok) bad += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'} [${c.dir}] «${c.weekday} · ${c.detail}» ترتيب بصري يسار→يمين: ${JSON.stringify(got)} (المنتظر ${JSON.stringify(c.expect)})`)
}

console.log('\n  للمقارنة — النصّ المركَّب القديم (نفس المحتوى، عنصر واحد):')
for (const dir of ['rtl', 'ltr']) {
  const text = 'الاثنين · 17 أغسطس'
  console.log(`    [${dir}] ${JSON.stringify(await orderOfText(LEGACY(dir, text), text))}`)
}

await browser.close()
if (bad) { console.log(`\n✗ ${bad} حالة بترتيب بصري خاطئ`); process.exit(1) }
console.log('\n✅ الترتيب البصري مطابق لترتيب الـDOM في الاتجاهين وبنظامَي الأرقام')
