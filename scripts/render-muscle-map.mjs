// أداة تطوير: تُصيّر خريطة العضلات (ذكر/أنثى × أمامي/خلفي) إلى صورة PNG كإثبات.
// ليست جزءًا من حزمة الإنتاج — تُشغّل يدويًا: node scripts/render-muscle-map.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'
import { chromium } from './e2e/lib/engine.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// حمّل دوال الرسم من ملف التشريح (TS) عبر تحويل esbuild ثم import ديناميكي.
const tsSource = readFileSync(resolve(root, 'src/data/bodyAnatomy.ts'), 'utf8')
const { code } = await transform(tsSource, { loader: 'ts', format: 'esm' })
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
// [مسح المنتج] كانت تفكّ أسماء دوالّ لا وجود لها (buildFront/BackRegions) —
// الوحدة تصدّر ثوابت FRONT_REGIONS/BACK_REGIONS، فكانت الأداة ميتة منذ التصدير.
const { buildSilhouette, FRONT_REGIONS, BACK_REGIONS, buildClothing } = mod

// ألوان مطابقة لمكوّن WeeklyMuscleMap.
const SKIN_FILL = '#E9D9C4'
const SKIN_STROKE = 'rgba(43,37,32,0.18)'
const MUSCLE_FILL = '#D8C3A4'
const MUSCLE_STROKE = 'rgba(43,37,32,0.16)'
const HEAT = '#F26A21'
const GARMENT_FILL = '#3B4A63'
const GARMENT_STROKE = 'rgba(20,28,44,0.7)'

// توزيع تغطية تجريبي لإظهار درجات الإضاءة.
const FRONT_HEAT = {
  chest_upper: 0.9, chest_mid: 0.85, chest_lower: 0.8, side_delts: 0.65, front_delts: 0.6,
  biceps: 0.55, abs: 0.95, obliques: 0.4, quads: 0.7, forearms: 0.3,
}
const BACK_HEAT = {
  lats: 0.9, traps: 0.6, glutes: 0.85, hamstrings: 0.65, rear_delts: 0.45,
  triceps: 0.55, calves: 0.35, upper_back: 0.4, lower_back: 0.5,
}

const heat = (v) => (v == null ? null : Math.min(0.92, 0.3 + v * 0.62))

function regionSvg(regions, heatMap) {
  let s = ''
  for (const r of regions) {
    for (const d of r.d) s += `<path d="${d}" fill="${MUSCLE_FILL}" stroke="${MUSCLE_STROKE}" stroke-width="1"/>`
    const h = heat(heatMap[r.m])
    if (h != null) for (const d of r.d) s += `<path d="${d}" fill="${HEAT}" fill-opacity="${h}" stroke="none"/>`
  }
  return s
}

function panel(gender, view) {
  const sil = buildSilhouette(gender, view)
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const clothing = buildClothing(gender, view)
  const heatMap = view === 'front' ? FRONT_HEAT : BACK_HEAT
  let svg = `<svg viewBox="0 0 220 470" width="200" xmlns="http://www.w3.org/2000/svg">`
  for (const d of sil) svg += `<path d="${d}" fill="${SKIN_FILL}" stroke="${SKIN_STROKE}" stroke-width="1.2" stroke-linejoin="round"/>`
  svg += regionSvg(regions, heatMap)
  for (const g of clothing)
    svg += `<path d="${g.d}" fill="${GARMENT_FILL}" fill-opacity="${g.opacity}" stroke="${GARMENT_STROKE}" stroke-width="1.4" stroke-linejoin="round"/>`
  svg += `</svg>`
  const label = `${gender === 'male' ? 'ذكر' : gender === 'female' ? 'أنثى' : 'محايد'} — ${view === 'front' ? 'أمامي' : 'خلفي'}`
  return `<figure><div class="body">${svg}</div><figcaption>${label}</figcaption></figure>`
}

const panels = [
  panel('male', 'front'), panel('male', 'back'),
  panel('female', 'front'), panel('female', 'back'),
]

const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;900&display=swap');
  body{margin:0;background:#101216;font-family:Tajawal,system-ui,sans-serif;padding:28px}
  h1{color:#f6f7f9;font-size:20px;font-weight:900;text-align:center;margin:0 0 4px}
  p.sub{color:#9099a6;font-size:12px;text-align:center;margin:0 0 22px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:960px;margin:0 auto}
  figure{margin:0;background:#181b21;border:1px solid #2c313b;border-radius:20px;padding:16px 8px 12px;
    box-shadow:0 12px 32px -16px rgba(0,0,0,.6)}
  .body{background:radial-gradient(70% 60% at 50% 30%,rgba(242,106,33,.10),transparent 70%);border-radius:14px;
    display:flex;justify-content:center;padding:6px}
  figcaption{color:#c4cad4;font-size:12px;font-weight:700;text-align:center;margin-top:10px}
  .legend{display:flex;gap:18px;justify-content:center;margin-top:22px;color:#9099a6;font-size:12px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .sw{width:26px;height:12px;border-radius:99px;background:linear-gradient(90deg,#F26A2155,#F26A21)}
  .sw2{width:12px;height:12px;border-radius:99px;background:#D8C3A4;border:1px solid rgba(43,37,32,.25)}
</style></head><body>
  <h1>خريطة عضلات Qimmah</h1>
  <p class="sub">جسم رياضي أصليّ واعٍ بالجنس — لباس محتشم — العضلات المُدرّبة تُضيء برتقاليًا</p>
  <div class="grid">${panels.join('')}</div>
  <div class="legend">
    <span><i class="sw"></i> درّبتها (الأغمق أكثر)</span>
    <span><i class="sw2"></i> لم تُدرّب</span>
  </div>
</body></html>`

const outDir = resolve(root, 'docs/product/assets')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'p3-muscle-map.html'), html)

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.screenshot({ path: resolve(outDir, 'p3-muscle-map.png'), fullPage: true })
await browser.close()
console.log('✓ docs/product/assets/p3-muscle-map.png')
