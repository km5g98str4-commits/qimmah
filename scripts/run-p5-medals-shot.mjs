// يُجمّع مولّد صفحة الأوسمة (TS) عبر esbuild ويشغّله لكتابة HTML، ثم يلتقط لقطة PNG
// عبر Chromium المثبّت مسبقًا (headless). أداة إثبات فقط — لا تلمس التطبيق.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// 1) جمّع مولّد الصفحة (CJS كي يعمل react-dom/server داخل Node) وشغّله في عملية فرعية.
const result = await build({
  entryPoints: [resolve(root, 'scripts/p5-medals-page.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': '{}' },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'p5-medals-'))
const file = join(dir, 'page.cjs')
writeFileSync(file, result.outputFiles[0].text)
const gen = spawnSync(process.execPath, [file], { stdio: 'inherit' })
if (gen.status !== 0) {
  console.error('❌ فشل توليد صفحة HTML.')
  process.exit(1)
}

// 2) التقط لقطة PNG عبر Chromium.
const htmlPath = resolve(root, 'docs/product/assets/p5-medals.html')
const pngPath = resolve(root, 'docs/product/assets/p5-medals.png')
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
if (!existsSync(CHROME)) {
  console.error(`❌ لم يُعثر على Chromium في ${CHROME} — عيّن CHROME_BIN.`)
  process.exit(1)
}
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--default-background-color=00000000',
  `--window-size=${process.env.SHOT_W || 1180},${process.env.SHOT_H || 1580}`,
  `--screenshot=${pngPath}`,
  pathToFileURL(htmlPath).href,
]
const r = spawnSync(CHROME, args, { stdio: 'inherit' })
if (r.status !== 0 || !existsSync(pngPath)) {
  console.error('❌ فشل التقاط اللقطة.')
  process.exit(1)
}
console.log(`✅ لقطة الأوسمة: docs/product/assets/p5-medals.png`)
