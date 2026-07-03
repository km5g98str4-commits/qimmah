// أداة تطوير: تولّد أيقونات PWA من SVG عبر متصفح headless (Playwright chromium المحلي).
// تُشغّل يدويًا عند الحاجة: node scripts/generate-pwa-assets.mjs
// ليست جزءًا من حزمة الإنتاج — المخرجات تُحفظ في public/ وتُدفع مع المستودع.
//
// المخرجات:
//   favicon.svg                    — العلامة (SVG) لتبويب المتصفح
//   icon-192.png / icon-512.png    — purpose "any" (هامش صغير، لا يلامس الحواف)
//   icon-maskable-192.png / -512   — purpose "maskable" (المنطقة الآمنة: دائرة نصف قطرها 40% من المركز)
//   apple-touch-icon.png 180×180   — خلفية معتمة (iOS يضيف تدويره بنفسه)
//   og-image.png (اختياري: --og)   — يتطلّب خط عربي مثبّت على الجهاز وإلا ظهر النص مربعات
import { writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'public')

const BRAND = '#F26A21'
const BRAND_DARK = '#D4540F'
const CREAM = '#FBF5EC'
const WHITE = '#FFFFFF'

// ————————————————————————————————————————————————————————————————
// العلامة: قمّة جبل (▲) فوق بار حديد — هوية «قِمّة».
// مرسومة في فضاء محلي مركزه (0,0) لتسهل معايرتها رياضيًا:
//   - الجبل: مثلث ممتلئ حاد، رأسه (0,-71) وقاعدته (±48, 5) — أضيق من البار ليقرأ «قمّة فوق بار».
//   - البار: خط أفقي y=47 بطول ±60 + قرصان رأسيان عند ±60 (y: 31..63).
//   - كل الخطوط بسماكة موحّدة 16 مع أطراف دائرية (نصف قطر الطرف 8).
// أبعد نقطة عن المركز: أسفل القرص (±60, 63) + طرف دائري 8 → √(60²+63²)+8 ≈ 95.1
// أنصاف الامتدادات المحيطة: أفقيًا 68 (60+8)، رأسيًا 71 (الرأس أعلى / أسفل القرص 63+8).
const GLYPH = { maxR: 95.1, halfW: 68, halfH: 71 }
const STROKE = 16

function glyphGroup(color) {
  return `<path d="M0 -71 L48 5 L-48 5 Z" fill="${color}"/>
    <g stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" fill="none">
      <line x1="-60" y1="47" x2="60" y2="47"/>
      <line x1="-60" y1="31" x2="-60" y2="63"/>
      <line x1="60" y1="31" x2="60" y2="63"/>
    </g>`
}

// مقياس العلامة داخل أيقونة بحجم size:
//  - maskable: أبعد نقطة ≤ 38% من الحجم (هامش أمان تحت حدّ الـ 40% القياسي).
//  - any: صندوق العلامة ≈ 84% من الارتفاع (هامش ≥ 8% من كل جهة — لا يلامس الحواف).
function glyphScale(size, variant) {
  return variant === 'maskable' ? (0.38 * size) / GLYPH.maxR : (0.42 * size) / GLYPH.halfH
}

// أيقونة مربّعة كاملة التغطية: خلفية برتقالية معتمة + علامة بيضاء موسّطة بصريًا.
function iconSvg(size, variant) {
  const k = glyphScale(size, variant)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(${k.toFixed(5)})">
    ${glyphGroup(WHITE)}
  </g>
</svg>`
}

// favicon.svg — نفس العلامة بزوايا مدوّرة خفيفة لتبويب المتصفح.
function faviconSvg() {
  const size = 64
  const k = glyphScale(size, 'any')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="14" fill="${BRAND}"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(${k.toFixed(5)})">
    ${glyphGroup(WHITE)}
  </g>
</svg>
`
}

// صورة OpenGraph 1200×630 — عنوان عربي + العلامة على خلفية كريمية.
// تُولَّد فقط بـ --og لأنها تتطلّب خطًا عربيًا مثبّتًا على جهاز التوليد.
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" dir="rtl">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${CREAM}"/>
  <rect width="1200" height="630" fill="url(#bg)" opacity="0.06"/>
  <rect x="0" y="0" width="18" height="630" fill="url(#bg)"/>
  <g font-family="Tajawal, 'Segoe UI', sans-serif" text-anchor="end">
    <text x="1110" y="210" font-size="120" font-weight="900" fill="${BRAND}">قِمّة</text>
    <text x="1110" y="315" font-size="52" font-weight="700" fill="#2B2520">تطبيقك الشخصي للتمرين والتغذية</text>
    <text x="1110" y="390" font-size="42" font-weight="500" fill="#5A514A">تمارين • تغذية • مكملات • قياسات • التزام يومي</text>
    <text x="1110" y="560" font-size="34" font-weight="700" fill="${BRAND_DARK}">عربي بالكامل — يعمل على جوالك</text>
  </g>
  <g transform="translate(150,315) scale(1.6)">
    ${glyphGroup(BRAND)}
  </g>
</svg>`
}

async function render(browser, svg, w, h, outPath) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:${w}px;height:${h}px}</style></head><body>${svg}</body></html>`,
    { waitUntil: 'networkidle' },
  )
  const el = await page.$('svg')
  const buf = await el.screenshot({ omitBackground: false })
  writeFileSync(outPath, buf)
  await page.close()
  console.log('✓', outPath.replace(root + '/', ''), `${w}×${h}`)
}

// متصفح Playwright المثبّت مسبقًا محليًا (بيئة بلا إنترنت).
const localChromium = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(
  existsSync(localChromium) ? { executablePath: localChromium } : {},
)

writeFileSync(resolve(outDir, 'favicon.svg'), faviconSvg())
console.log('✓ public/favicon.svg')

await render(browser, iconSvg(192, 'any'), 192, 192, resolve(outDir, 'icon-192.png'))
await render(browser, iconSvg(512, 'any'), 512, 512, resolve(outDir, 'icon-512.png'))
await render(browser, iconSvg(192, 'maskable'), 192, 192, resolve(outDir, 'icon-maskable-192.png'))
await render(browser, iconSvg(512, 'maskable'), 512, 512, resolve(outDir, 'icon-maskable-512.png'))
await render(browser, iconSvg(180, 'any'), 180, 180, resolve(outDir, 'apple-touch-icon.png'))
if (process.argv.includes('--og')) {
  await render(browser, ogSvg(), 1200, 630, resolve(outDir, 'og-image.png'))
}
await browser.close()
console.log('PWA assets generated.')
