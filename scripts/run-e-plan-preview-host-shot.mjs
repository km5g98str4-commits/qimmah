import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = process.cwd()
const output = resolve(root, 'docs/proof/e-plan-preview-host')
await mkdir(output, { recursive: true })

const server = await createServer({
  root,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 4177, strictPort: true },
})

let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  for (const lang of ['ar', 'en']) {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 })
    await page.goto(`http://127.0.0.1:4177/scripts/e-plan-preview-host-shot/index.html?lang=${lang}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="plan-preview-filled"]').waitFor()
    await page.evaluate(() => {
      const shell = document.querySelector('#root > div')
      const main = document.querySelector('main')
      if (shell instanceof HTMLElement) {
        shell.style.height = 'auto'
        shell.style.overflow = 'visible'
      }
      if (main instanceof HTMLElement) {
        main.style.height = 'auto'
        main.style.overflow = 'visible'
      }
    })
    await page.screenshot({ path: resolve(output, `plan-preview-${lang}-393.png`), fullPage: true })
    await page.close()
  }
} finally {
  await browser?.close()
  await server.close()
}
