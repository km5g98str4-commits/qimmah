// أداة تطوير: تولّد أيقونات PWA (192/512 maskable + apple-touch) وصورة OG من SVG عبر
// متصفح headless. تُشغّل يدويًا عند الحاجة: node scripts/generate-pwa-assets.mjs
// ليست جزءًا من حزمة الإنتاج — المخرجات تُحفظ في public/ وتُدفع مع المستودع.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'public')
mkdirSync(outDir, { recursive: true })

const BRAND = '#F26A21'
const BRAND_DARK = '#D4540F'
const CREAM = '#FBF5EC'

// شعار «قِمّة» — قمّة جبل (رمز الاسم) فوق دمبل، بلون كريمي على تدرّج برتقالي.
// مصمّم maskable: المحتوى داخل المنطقة الآمنة (المركز ~72%) مع خلفية ممتدة.
function iconSvg(size, { maskable = true } = {}) {
  const pad = maskable ? size * 0.14 : size * 0.06 // منطقة آمنة للأيقونة القابلة للقصّ
  const inner = size - pad * 2
  const cx = size / 2
  // إحداثيات نسبية داخل المربّع الداخلي
  const peakTop = pad + inner * 0.22
  const peakBase = pad + inner * 0.5
  const barY = pad + inner * 0.7
  const barHalf = inner * 0.3
  const plateH = inner * 0.16
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <!-- قمّة جبل -->
  <path d="M${cx} ${peakTop} L${cx + inner * 0.28} ${peakBase} L${cx + inner * 0.14} ${peakBase} L${cx} ${peakBase - inner * 0.12} L${cx - inner * 0.14} ${peakBase} L${cx - inner * 0.28} ${peakBase} Z"
        fill="${CREAM}"/>
  <!-- دمبل -->
  <g stroke="${CREAM}" stroke-width="${inner * 0.08}" stroke-linecap="round" fill="none">
    <line x1="${cx - barHalf}" y1="${barY}" x2="${cx + barHalf}" y2="${barY}"/>
    <line x1="${cx - barHalf}" y1="${barY - plateH}" x2="${cx - barHalf}" y2="${barY + plateH}"/>
    <line x1="${cx + barHalf}" y1="${barY - plateH}" x2="${cx + barHalf}" y2="${barY + plateH}"/>
  </g>
</svg>`
}

// صورة OpenGraph 1200×630 — عنوان عربي + شعار على خلفية العلامة.
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
  <!-- شعار القمّة -->
  <g transform="translate(150,315)">
    <path d="M0 -120 L90 40 L45 40 L0 0 L-45 40 L-90 40 Z" fill="${BRAND}"/>
    <g stroke="${BRAND}" stroke-width="22" stroke-linecap="round" fill="none">
      <line x1="-80" y1="110" x2="80" y2="110"/>
      <line x1="-80" y1="80" x2="-80" y2="140"/>
      <line x1="80" y1="80" x2="80" y2="140"/>
    </g>
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

const browser = await chromium.launch()
await render(browser, iconSvg(192), 192, 192, resolve(outDir, 'icon-192.png'))
await render(browser, iconSvg(512), 512, 512, resolve(outDir, 'icon-512.png'))
await render(browser, iconSvg(180, { maskable: false }), 180, 180, resolve(outDir, 'apple-touch-icon.png'))
await render(browser, ogSvg(), 1200, 630, resolve(outDir, 'og-image.png'))
await browser.close()
console.log('PWA assets generated.')
