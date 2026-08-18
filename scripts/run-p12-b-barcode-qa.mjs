// P12-B BARCODE QA — متانة ماسح الباركود بلا كاميرا حقيقية وبلا شبكة:
//  • فتح لوحة المسح على 4 أحجام شاشة (320/390/768/1280) بالعربية والإنجليزية بلا أخطاء صفحة.
//  • رفض صلاحية الكاميرا → رسالة ثنائية اللغة + زر إعادة محاولة + مسار الإضافة اليدوية.
//  • لا توجد كاميرا (صلاحية ممنوحة بلا جهاز) → رسالة مميّزة + المسار اليدوي.
//  • نسب المصدر (Open Food Facts / ODbL) ظاهر في اللوحة دائمًا.
//  • كاميرا وهمية (y4m بباركود EAN-13 حقيقي) + قطع طلب OFF → حالة «لا اتصال» المميّزة
//    عن «غير موجود»، وزر إعادة المحاولة يعيد البحث وينجح عند عودة الشبكة (استجابة مزيّفة).
// يتطلب dist مبنيًا مسبقًا (npm run build) — يشغّل vite preview مثل بقية سكربتات QA.
/* eslint-env node */
import { chromium } from './e2e/lib/engine.mjs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4612
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ONB_KEY = 'qimmah:onboarding:v1'
const PREFS_KEY = 'qimmah:prefs:v1'
const OFF_GLOB = 'https://world.openfoodfacts.org/**'

// باركود EAN-13 حقيقي وصالح (نوتيلا — نفس مثبّت إثبات P8 A2) يُرسم في فيديو الكاميرا الوهمية.
const BARCODE = '3017624010701'
const OFF_MOCK = {
  status: 1,
  code: BARCODE,
  product: {
    product_name: 'Nutella',
    brands: 'Ferrero',
    serving_size: '15 g',
    nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
  },
}

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]

// نصوص القاموس (مطابقة لـ src/i18n/dict/nutritionScreen.ts) — تُستخدم للتحقق من الواجهة.
const S = {
  ar: {
    add: 'أضف',
    scanBtn: 'امسح الباركود',
    title: 'مسح الباركود',
    denied: 'ما قدرنا نوصل للكاميرا',
    noCamera: 'ما لقينا كاميرا في هذا الجهاز',
    retry: 'حاول مرة ثانية',
    manual: 'إضافة يدوية',
    netTitle: 'ما فيه اتصال',
    netHint: 'تعذّر الوصول لقاعدة بيانات المنتجات',
    notFound: 'ما لقينا المنتج',
    genericError: 'صار خطأ غير متوقّع أثناء المسح',
    dir: 'rtl',
  },
  en: {
    add: 'Add',
    scanBtn: 'Scan barcode',
    title: 'Scan barcode',
    denied: "Couldn't access the camera",
    noCamera: 'No camera found on this device',
    retry: 'Try again',
    manual: 'Add manually',
    netTitle: 'No connection',
    netHint: "couldn't reach the product database",
    notFound: 'Product not found',
    genericError: 'Something went wrong while scanning',
    dir: 'ltr',
  },
}
const ATTRIBUTION = 'Open Food Facts'

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

// ---------------------------------------------------------------------------
// توليد فيديو y4m لكاميرا كروم الوهمية يعرض باركود EAN-13 صالحًا (رسم محلي، بلا أدوات خارجية).
// ---------------------------------------------------------------------------
const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']
const complement = (s) => [...s].map((b) => (b === '0' ? '1' : '0')).join('')
const R_CODES = L_CODES.map(complement)
const G_CODES = R_CODES.map((s) => [...s].reverse().join(''))

/** يبني وحدات EAN-13 (95 وحدة: حارس 101 + 6 يسار حسب التكافؤ + 01010 + 6 يمين + 101). */
function ean13Modules(code13) {
  const d = [...code13].map(Number)
  const parity = PARITY[d[0]]
  let m = '101'
  for (let i = 1; i <= 6; i++) m += (parity[i - 1] === 'L' ? L_CODES : G_CODES)[d[i]]
  m += '01010'
  for (let i = 7; i <= 12; i++) m += R_CODES[d[i]]
  return m + '101'
}

/** يكتب ملف y4m (‏640×480، C420) بإطارات متطابقة تعرض الباركود على خلفية بيضاء. */
function writeBarcodeY4m(path, code13, frames = 40) {
  const W = 640
  const H = 480
  const modules = ean13Modules(code13)
  const mw = 5 // عرض الوحدة بالبكسل → 475px + هوامش هادئة واسعة (~16 وحدة لكل جانب)
  const xStart = Math.floor((W - modules.length * mw) / 2)
  const yTop = 100
  const yBottom = 380

  const yPlane = Buffer.alloc(W * H, 235) // أبيض
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      for (let x = xStart + i * mw; x < xStart + (i + 1) * mw; x++) {
        for (let y = yTop; y < yBottom; y++) yPlane[y * W + x] = 16 // أسود
      }
    }
  }
  const uPlane = Buffer.alloc((W / 2) * (H / 2), 128)
  const frame = Buffer.concat([Buffer.from('FRAME\n'), yPlane, uPlane, uPlane])
  const chunks = [Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420\n`)]
  for (let i = 0; i < frames; i++) chunks.push(frame)
  writeFileSync(path, Buffer.concat(chunks))
}

// ---------------------------------------------------------------------------
// مساعدو التنقّل
// ---------------------------------------------------------------------------

/** يزرع إعدادًا مكتملًا + لغة الواجهة ثم يفتح تبويب التغذية (إعادة تحميل كاملة لتفعيل اللغة). */
async function gotoNutrition(page, lang) {
  await page.goto(BASE)
  await page.evaluate(
    ({ ONB_KEY, PREFS_KEY, lang }) => {
      localStorage.clear()
      localStorage.setItem(ONB_KEY, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      localStorage.setItem(PREFS_KEY, JSON.stringify({ language: lang }))
    },
    { ONB_KEY, PREFS_KEY, lang },
  )
  await page.goto(`${BASE}/#/nutrition`)
  await page.reload()
  await page.waitForSelector('nav', { timeout: 10000 })
}

/** يفتح لوحة مسح الباركود: زر «أضف» بأول قسم وجبة → زر «امسح الباركود». */
async function openScanPanel(page, lang) {
  const s = S[lang]
  await gotoNutrition(page, lang)
  await page.getByRole('button', { name: s.add, exact: false }).first().click()
  await page.getByRole('button', { name: s.scanBtn }).first().click()
  await page.getByRole('heading', { name: s.title }).waitFor({ timeout: 8000 })
}

/** فحوص سلامة التخطيط: لا انزياح أفقي للصفحة، ولوحة المسح ضمن حدود الشاشة. */
async function layoutIntact(page, viewport) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const heading = page.getByRole('heading', { name: new RegExp(`^(${S.ar.title}|${S.en.title})$`) })
  const box = await heading.locator('xpath=ancestor::div[contains(@class,"max-w-md")]').boundingBox()
  const panelFits = !!box && box.x >= -1 && box.x + box.width <= viewport.width + 1
  return { overflow, panelFits }
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'p12b-'))
  const y4mPath = join(tmp, 'ean13.y4m')
  writeBarcodeY4m(y4mPath, BARCODE)

  // تشغيل vite مباشرة (لا عبر npx) كي يقتل server.kill() الخادم نفسه ولا يترك عملية يتيمة.
  const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  const browsers = []
  try {
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(BASE)
        if (r.ok) break
      } catch {
        /* الخادم لم يجهز بعد */
      }
      await sleep(500)
    }

    // متصفحان: «plain» بلا أي جهاز كاميرا (واقع هذه البيئة → NotFoundError حقيقي)،
    // و«fake» بجهاز كاميرا وهمي يعرض y4m الباركود (مسار فكّ التشفير الحي).
    // ملاحظة مثبتة تجريبيًا: كروم مقطوع الرأس لا يرفض getUserMedia برفض صلاحية حقيقي
    // (بلا جهاز → NotFoundError، وبجهاز وهمي بلا منح → طلب معلّق للأبد)، لذا حالة «رفض
    // الصلاحية» تُنتَج بحقن getUserMedia يرفض بـ DOMException NotAllowedError حقيقي —
    // وهو نفس الكائن الذي يصنّفه BarcodeCamera.classifyCameraError.
    const plain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    const fake = await chromium.launch({
      executablePath: CHROME,
      args: [
        '--no-sandbox',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${y4mPath}`,
      ],
    })
    browsers.push(plain, fake)

    const DENY_CAMERA_INIT = `
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
      }
    `

    // ============ الجزء 1: صلاحية الكاميرا مرفوضة (المصفوفة الكاملة 4×2) ============
    for (const viewport of VIEWPORTS) {
      for (const lang of ['ar', 'en']) {
        const s = S[lang]
        const tag = `${viewport.width}×${viewport.height} ${lang}`
        const ctx = await plain.newContext({ viewport })
        await ctx.addInitScript(DENY_CAMERA_INIT)
        const page = await ctx.newPage()
        const pageErrors = []
        page.on('pageerror', (e) => pageErrors.push(String(e)))
        await ctx.route(OFF_GLOB, (route) => route.abort()) // حسم: لا اتصال خارجي إطلاقًا

        await openScanPanel(page, lang)
        await page.getByText(s.denied, { exact: false }).waitFor({ timeout: 8000 })
        check(`[${tag}] panel opens + permission-denied message`, true)
        check(`[${tag}] denied: retry button visible`, await page.getByRole('button', { name: s.retry }).isVisible())
        check(`[${tag}] denied: manual-entry button visible`, await page.getByRole('button', { name: s.manual }).isVisible())
        check(`[${tag}] attribution "${ATTRIBUTION}" visible`, await page.getByText(ATTRIBUTION).isVisible())
        check(`[${tag}] document dir=${s.dir}`, (await page.evaluate(() => document.documentElement.dir)) === s.dir)
        const { overflow, panelFits } = await layoutIntact(page, viewport)
        check(`[${tag}] no horizontal overflow`, overflow <= 0, `overflow=${overflow}px`)
        check(`[${tag}] scan panel fits viewport width`, panelFits)
        check(`[${tag}] no uncaught page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
        await ctx.close()
      }
    }

    // ============ الجزء 2: لا جهاز كاميرا إطلاقًا → حالة «لا توجد كاميرا» المميّزة ============
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) {
      for (const lang of ['ar', 'en']) {
        const s = S[lang]
        const tag = `${viewport.width}×${viewport.height} ${lang}`
        const ctx = await plain.newContext({ viewport, permissions: ['camera'] })
        const page = await ctx.newPage()
        const pageErrors = []
        page.on('pageerror', (e) => pageErrors.push(String(e)))
        await ctx.route(OFF_GLOB, (route) => route.abort())

        await openScanPanel(page, lang)
        await page.getByText(s.noCamera, { exact: false }).waitFor({ timeout: 8000 })
        check(`[${tag}] no-camera: distinct message shown`, true)
        check(`[${tag}] no-camera: manual-entry button visible`, await page.getByRole('button', { name: s.manual }).isVisible())
        check(`[${tag}] no-camera: no uncaught page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
        await ctx.close()
      }
    }

    // ============ الجزء 2ب: فشل تشغيل عام (استثناء غير مصنَّف) → حالة خطأ، لا شاشة بيضاء ============
    for (const lang of ['ar', 'en']) {
      const s = S[lang]
      const tag = `390×844 ${lang}`
      const ctx = await plain.newContext({ viewport: VIEWPORTS[1] })
      await ctx.addInitScript(
        `if (navigator.mediaDevices) {
           navigator.mediaDevices.getUserMedia = () => Promise.reject(new TypeError('boom: scanner exploded'))
         }`,
      )
      const page = await ctx.newPage()
      const pageErrors = []
      page.on('pageerror', (e) => pageErrors.push(String(e)))
      await ctx.route(OFF_GLOB, (route) => route.abort())

      await openScanPanel(page, lang)
      await page.getByText(s.genericError, { exact: false }).waitFor({ timeout: 8000 })
      check(`[${tag}] start-failure exception → generic error state (no white screen)`, true)
      check(`[${tag}] generic error: retry button visible`, await page.getByRole('button', { name: s.retry }).isVisible())
      check(`[${tag}] generic error: manual-entry button visible`, await page.getByRole('button', { name: s.manual }).isVisible())
      check(`[${tag}] generic error: no uncaught page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
      await ctx.close()
    }

    // ============ الجزء 3: كاميرا وهمية بصلاحية — فشل الشبكة ثم نجاح إعادة المحاولة ============

    for (const lang of ['ar', 'en']) {
      const s = S[lang]
      const tag = `fake-cam 390×844 ${lang}`
      const ctx = await fake.newContext({ viewport: VIEWPORTS[1], permissions: ['camera'] })
      const page = await ctx.newPage()
      const pageErrors = []
      page.on('pageerror', (e) => pageErrors.push(String(e)))
      let offBlocked = true
      await ctx.route(OFF_GLOB, (route) => {
        if (offBlocked) return route.abort() // محاكاة انقطاع الشبكة
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(OFF_MOCK) })
      })

      await openScanPanel(page, lang)
      // zxing يفكّ الباركود من الفيديو الوهمي → البحث يفشل (مقطوع) → حالة «لا اتصال»
      await page.getByText(s.netTitle).waitFor({ timeout: 20000 })
      check(`[${tag}] lookup abort → network-error state (barcode decoded live)`, true)
      check(`[${tag}] network-error hint text shown`, await page.getByText(s.netHint, { exact: false }).isVisible())
      check(`[${tag}] network-error ≠ not-found (distinguishable)`, !(await page.getByText(s.notFound).isVisible().catch(() => false)))
      check(`[${tag}] network-error: retry button visible`, await page.getByRole('button', { name: s.retry }).isVisible())
      check(`[${tag}] network-error: manual-entry button visible`, await page.getByRole('button', { name: s.manual }).isVisible())
      check(`[${tag}] attribution visible in error state`, await page.getByText(ATTRIBUTION).isVisible())

      // عادت الشبكة (استجابة مزيّفة) → «حاول مرة ثانية» يعيد البحث بنفس الباركود وينجح
      offBlocked = false
      await page.getByRole('button', { name: s.retry }).click()
      await page.getByText('Nutella', { exact: false }).first().waitFor({ timeout: 10000 })
      check(`[${tag}] retry after network back → product resolved (Nutella)`, true)
      check(`[${tag}] resolved product shows OFF calories (539)`, (await page.evaluate(() => document.body.innerText)).includes('539'))
      check(`[${tag}] no uncaught page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
      await ctx.close()
    }
  } finally {
    for (const b of browsers) await b.close().catch(() => {})
    server.kill()
    rmSync(tmp, { recursive: true, force: true })
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P12-B BARCODE QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'} (${results.length} checks)`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
