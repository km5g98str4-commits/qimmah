// Screenshots the three Today v2.1 states from the isolation harness at several
// RTL viewports. Starts a vite dev server, drives Chromium (pre-installed), saves
// PNGs under scripts/today-v2-shot/shots/. Run: node scripts/today-v2-shot/shoot.mjs
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const outDir = resolve(__dirname, 'shots')
mkdirSync(outDir, { recursive: true })

const PORT = 5199
const base = `http://localhost:${PORT}/scripts/today-v2-shot/index.html`

// state × viewport matrix: all three states on mobile; normal also at 320/768/1280.
const STATES = ['normal', 'newUser', 'afterWorkout']
const SHOTS = [
  ...STATES.map((s) => ({ state: s, w: 390, h: 844, tag: 'mobile-390' })),
  ...STATES.map((s) => ({ state: s, w: 320, h: 720, tag: 'small-320' })),
  { state: 'normal', w: 768, h: 1024, tag: 'tablet-768' },
  { state: 'normal', w: 1280, h: 900, tag: 'desktop-1280' },
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

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'inherit' })
let browser
try {
  await waitForServer(`http://localhost:${PORT}/`)
  browser = await chromium.launch()
  for (const { state, w, h, tag } of SHOTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
    await page.goto(`${base}?state=${state}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 15000 })
    await page.waitForTimeout(900) // settle fonts + entrance motion
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    const file = resolve(outDir, `today-${state}-${tag}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`✓ ${state.padEnd(13)} ${tag.padEnd(13)} → ${file}${errs.length ? `  ⚠ ${errs.length} page errors` : ''}`)
    await page.close()
  }
} finally {
  if (browser) await browser.close()
  vite.kill('SIGTERM')
}
console.log('\n✅ all state shots captured')
