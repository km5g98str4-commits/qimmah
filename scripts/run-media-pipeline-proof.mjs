// مشغّل برهان P10 (كتالوج وسائط التمارين) — نمط شيم esbuild المعتمد.
// المرحلة 1: انحراف المولّد + فحوص grep (لا يوتيوب، لا تحميل جماعي خارج الواجهة).
// المرحلة 2: برهان media-pipeline-proof.ts (تغطية/حقوق/مقاسات/قرص/تحميل-التالي-فقط).

import { build } from 'esbuild'
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── انحراف المولّد: الملف المُلتزَم مطابق تمامًا لإعادة التوليد من مصادره ──────
try {
  execFileSync(process.execPath, [resolve(root, 'scripts/build-media-manifest.mjs'), '--check'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  })
  console.log('  ✓ مولّد: exerciseMediaManifest.generated.ts مطابق لمصادره (لا انحراف)')
} catch (err) {
  console.error('✗ FAIL (مولّد): الكتالوج المُلتزَم منحرف — أعد التوليد: node scripts/build-media-manifest.mjs')
  console.error(String(err.stdout ?? '') + String(err.stderr ?? ''))
  process.exit(1)
}

// ── فحوص grep ────────────────────────────────────────────────────────────────
const grepZero = (pattern, target, label) => {
  let out = ''
  try {
    out = execSync(`grep -rnE '${pattern}' ${target} || true`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    out = ''
  }
  if (out) {
    console.error(`✗ FAIL: ${label}\n${out}`)
    process.exit(1)
  }
  console.log(`  ✓ ${label}`)
}

// لا روابط يوتيوب/بحث في الكتالوج المُولَّد أو واجهته — الفيديو الحقيقي فقط أو null.
grepZero(
  'youtube|youtu\\.be|search_query',
  'src/data/exerciseMediaManifest.generated.ts src/lib/exerciseMediaPipeline.ts',
  'لا روابط يوتيوب/بحث في كتالوج الوسائط أو واجهته',
)
// «التالي فقط»: لا مستهلك يسخّن الكتالوج كاملًا — التحميل المسبق محصور في preloadNextExercise.
grepZero(
  'preload(All|Batch|Every)|for.*exerciseMediaManifest.*(new Image|createImage)',
  "src --include='*.ts' --include='*.tsx'",
  'لا تحميل مسبق جماعي — preloadNextExercise وحده يسخّن',
)

// ── برهان الوحدات ────────────────────────────────────────────────────────────
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = { localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/media-pipeline-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'media-pipeline-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
process.chdir(root) // البرهان يفحص public/ على القرص — يعمل من جذر المشروع دائمًا
await import(pathToFileURL(file).href)
