// إثبات بصري لخريطة العضلات (react-body-highlighter) — لقطة headless.
//
// التشغيل (يتطلب متصفّح Chromium مُثبّتًا مسبقًا + playwright-core):
//   npm run dev -- --port 5199            # نافذة طرفية أولى
//   npm i --no-save playwright-core       # أداة مؤقتة (غير محفوظة في package.json)
//   node scripts/p31-muscle-proof.mjs     # نافذة ثانية
//
// المخرجات: docs/product/assets/p31-muscle-map.png (شبكة: ذكر/أنثى × أمامي/خلفي + تدرّج الشدّة).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const EXE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PORT = process.env.PROOF_PORT || '5199'
const BASE = `http://localhost:${PORT}/scripts/muscle-map-proof.html`
const OUT = resolve(root, 'docs/product/assets/p31-muscle-map.png')

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2 })

async function shot(gender, view) {
  await page.goto(`${BASE}?gender=${gender}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('svg.rbh polygon')
  if (view === 'back') {
    await page.getByRole('button', { name: 'خلفي' }).click()
    await page.waitForTimeout(300)
  }
  const buf = await page.locator('.card').first().screenshot()
  return 'data:image/png;base64,' + buf.toString('base64')
}

const tiles = [
  { label: 'ذكر — أمامي', img: await shot('male', 'front') },
  { label: 'ذكر — خلفي', img: await shot('male', 'back') },
  { label: 'أنثى — أمامي', img: await shot('female', 'front') },
  { label: 'أنثى — خلفي', img: await shot('female', 'back') },
  { label: 'عدة عضلات مُفعّلة — تدرّج الشدّة (أمامي)', img: await shot('male', 'front') },
]

const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
  body{margin:0;background:#0f1115;font-family:system-ui,'Segoe UI',sans-serif;padding:28px}
  h1{color:#fff;font-size:20px;margin:0 0 6px;text-align:center}
  p.sub{color:#9aa1ab;font-size:12px;margin:0 0 22px;text-align:center}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1120px;margin:0 auto}
  .tile{background:#181b21;border:1px solid #2a2f38;border-radius:16px;padding:12px}
  .tile figcaption{color:#F58145;font-size:13px;font-weight:700;text-align:center;margin-bottom:8px}
  .tile img{width:100%;display:block;border-radius:10px}
</style></head><body>
<h1>Qimmah — خريطة العضلات (react-body-highlighter · MIT)</h1>
<p class="sub">جسم تشريحي مجرّد محتشم · لا لوح رمادي · التلوين البرتقالي حسب شدّة التدريب الأسبوعي</p>
<div class="grid">
${tiles.map((t) => `<figure class="tile"><figcaption>${t.label}</figcaption><img src="${t.img}"></figure>`).join('')}
</div></body></html>`

const mp = await browser.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 2 })
await mp.setContent(html, { waitUntil: 'networkidle' })
await mp.waitForTimeout(200)
await mp.locator('body').screenshot({ path: OUT })
console.log('SAVED', OUT)

await browser.close()
