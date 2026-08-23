// Screenshots the Today home states from the isolation harness across the three
// required mobile widths in Arabic and English. Starts a vite dev server, drives
// Chromium (pre-installed), saves PNGs under scripts/today-v2-shot/shots/.
// Run: node scripts/today-v2-shot/shoot.mjs
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../e2e/lib/engine.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const outDir = resolve(__dirname, 'shots')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const PORT = 5199
const base = `http://localhost:${PORT}/scripts/today-v2-shot/index.html`

// المطلوب: الحالات الثلاث × ٣٢٠/٣٩٠/٤٣٠ بالعربية (٩ لقطات)، ثم الإنجليزية
// وحالتا الراحة/بلا خطة، ثم لوح ومكتب للتأكّد أنّ الشاشة الكبيرة ليست هاتفًا ممطوطًا.
const AR_STATES = ['normal', 'newUser', 'afterWorkout']
const WIDTHS = [
  { w: 320, h: 720, tag: '320' },
  { w: 390, h: 844, tag: '390' },
  { w: 430, h: 932, tag: '430' },
]
const SHOTS = [
  ...AR_STATES.flatMap((state) => WIDTHS.map(({ w, h, tag }) => ({ state, lang: 'ar', w, h, tag }))),
  ...AR_STATES.map((state) => ({ state, lang: 'en', w: 390, h: 844, tag: '390' })),
  { state: 'normal', lang: 'en', w: 320, h: 720, tag: '320' },
  { state: 'restDay', lang: 'ar', w: 390, h: 844, tag: '390' },
  { state: 'restDay', lang: 'en', w: 390, h: 844, tag: '390' },
  { state: 'noPlan', lang: 'ar', w: 390, h: 844, tag: '390' },
  { state: 'noPlan', lang: 'en', w: 390, h: 844, tag: '390' },
  { state: 'normal', lang: 'ar', w: 768, h: 1024, tag: '768' },
  { state: 'normal', lang: 'ar', w: 1280, h: 900, tag: '1280' },
]

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(url)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await sleep(500)
  }
  throw new Error('vite dev server did not come up')
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
let browser
let problems = 0
try {
  await waitForServer(`http://localhost:${PORT}/`)
  // نفس اصطلاح بقية أطقم e2e في المستودع: مسار متصفّح صريح حين توفّره البيئة.
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
  for (const { state, lang, w, h, tag } of SHOTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    await page.goto(`${base}?state=${state}&lang=${lang}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-today-root]', { timeout: 20000 })
    await page.waitForTimeout(900) // settle fonts + one-shot ring draw

    // فحص فيزيائي مع كل لقطة: تجاوز أفقي، ونصّ يفيض حاويته.
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      const horizontal = doc.scrollWidth - doc.clientWidth
      const clipped = Array.from(document.querySelectorAll('body *')).filter((el) => {
        const s = getComputedStyle(el)
        if (s.overflow !== 'visible' || s.position === 'absolute') return false
        return el.scrollWidth > el.clientWidth + 1
      }).length
      return { horizontal, clipped }
    })
    if (overflow.horizontal > 0 || overflow.clipped > 0 || errs.length > 0) problems += 1

    const file = resolve(outDir, `today-${state}-${lang}-${tag}.png`)
    await page.screenshot({ path: file, fullPage: true })
    const flags = [
      overflow.horizontal > 0 ? `⚠ h-overflow ${overflow.horizontal}px` : '',
      overflow.clipped > 0 ? `⚠ clipped ${overflow.clipped}` : '',
      errs.length ? `⚠ ${errs.length} page errors: ${errs[0]}` : '',
    ].filter(Boolean).join('  ')
    console.log(`${flags ? '✗' : '✓'} ${state.padEnd(13)} ${lang}  ${String(w).padEnd(5)} → ${file.split('/').pop()}${flags ? `  ${flags}` : ''}`)
    await page.close()
  }
} finally {
  if (browser) await browser.close()
  vite.kill('SIGTERM')
}
console.log(problems === 0 ? '\n✅ all shots captured — no overflow, no page errors' : `\n⚠️  ${problems} shot(s) flagged — inspect above`)
