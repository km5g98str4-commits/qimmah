// Q19 after-shots: workout overview + active session in the REAL MobileShell,
// with a simulated iOS safe-area inset (the reference device condition). Proves
// the top header is not clipped and the day/program/exercise pyramid is clear.
// Run: node scripts/workout-v2-shot/q19-shoot.mjs
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

const PORT = 5233
const base = `http://localhost:${PORT}/scripts/workout-v2-shot/shell.html`
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
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2, colorScheme: 'dark' })
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  // Overview under the shell header — clear pyramid, nothing clipped.
  await page.screenshot({ path: resolve(outDir, 'q19-after-overview.png') })

  // Active session — program·day eyebrow + primary-first order, top not clipped.
  await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
  await page.getByRole('button', { name: 'استبدال التمرين' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(outDir, 'q19-after-active.png') })

  console.log('✓ Q19 shots saved →', outDir)
} finally {
  if (browser) await browser.close()
  vite.kill('SIGTERM')
}
