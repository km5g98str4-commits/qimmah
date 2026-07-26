// يلتقط لقطات الحالات الثلاث من harness التطوير (Q20).
// يفترض خادم vite شغّالًا: PORT=5201 node scripts/media/q20-shot/capture.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const PORT = process.env.PORT ?? '5201'
const outDir = resolve(root, 'docs/content/exercise-media-shots')
mkdirSync(outDir, { recursive: true })

const CASES = [
  { id: 'leg-press-machine', file: '1-sequence-leg-press' },
  { id: 'shoulder-press-machine', file: '2-machine-diagram-shoulder-press' },
  { id: 'chest-press-machine', file: '3-pending-chest-press' },
]

const browser = await chromium.launch()
let shots = 0
for (const lang of ['ar', 'en']) {
  const page = await browser.newPage({ viewport: { width: 420, height: 1200 }, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/scripts/media/q20-shot/index.html?lang=${lang}`, { waitUntil: 'networkidle' })
  // انتظر تحميل الصور فعلًا (loading="lazy" — نُمرّر الصفحة لتدخل مجال الرؤية)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 })
  const sections = page.locator('section')
  for (let i = 0; i < CASES.length; i++) {
    const path = resolve(outDir, `${CASES[i].file}.${lang}.png`)
    await sections.nth(i).screenshot({ path })
    shots++
    console.log(`  ✓ ${CASES[i].file}.${lang}.png`)
  }
  await page.close()
}
await browser.close()
console.log(`\n✅ ${shots} لقطة في docs/content/exercise-media-shots/`)
