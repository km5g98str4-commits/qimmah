// Screenshots the Workout v2 substitution sheet (screen 31) + one-handed control
// cluster (screen 27, right & left) from the isolation harness at 393×852 (RTL).
// Starts a vite dev server, drives Chromium, saves PNGs under ./shots/.
// Run: node scripts/workout-v2-shot/shoot.mjs
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

const PORT = 5232
const base = `http://localhost:${PORT}/scripts/workout-v2-shot/index.html`
const VIEW = { width: 393, height: 852 }

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const r = await fetch(url); if (r.ok) return true } catch { /* not up */ }
    await sleep(500)
  }
  throw new Error('vite dev server did not come up')
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'inherit' })
let browser
try {
  await waitForServer(`http://localhost:${PORT}/`)
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 })
  await page.goto(base, { waitUntil: 'domcontentloaded' })

  // Plan → active
  await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
  await page.getByRole('button', { name: 'استبدال التمرين' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(700)

  // Screen 27 — one-handed, right hand (default)
  await page.screenshot({ path: resolve(outDir, 'onehanded-27-right.png') })

  // Screen 31 — substitution sheet (busy)
  await page.getByRole('button', { name: 'استبدال التمرين' }).click()
  await page.getByRole('heading', { name: 'استبدال التمرين' }).waitFor({ timeout: 8000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(outDir, 'substitution-31-busy.png') })

  // Screen 31 — home filter (equipment-aware narrowing)
  await page.getByRole('button', { name: 'في المنزل' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(outDir, 'substitution-31-home.png') })

  // Close sheet, flip to left hand → screen 27 mirrored
  await page.getByRole('button', { name: 'إلغاء' }).last().click()
  await page.getByRole('button', { name: 'وضع اليد اليسرى' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(outDir, 'onehanded-27-left.png') })

  console.log('✓ shots saved →', outDir)
} finally {
  if (browser) await browser.close()
  vite.kill('SIGTERM')
}
