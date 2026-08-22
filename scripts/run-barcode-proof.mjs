// مشغّل برهان P8 (الباركود الأصلي/الويب) — نمط شيم esbuild المعتمد (data-safety).
// المرحلة 1: فحوص grep «لا رفع» — ضمانة أن أي إطار كاميرا لا يغادر الجهاز أبدًا،
// وأن OFF لا يستلم سوى رقم الباركود. المرحلة 2: برهان barcode-proof.ts.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── فحوص «لا رفع للإطارات» ─────────────────────────────────────────────────
const { execSync } = await import('node:child_process')

const grepZero = (pattern, target, label) => {
  let out = ''
  try {
    out = execSync(`grep -rnE '${pattern}' ${target} || true`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    out = ''
  }
  if (out) {
    console.error(`✗ FAIL (خصوصية): ${label}\n${out}`)
    process.exit(1)
  }
  console.log(`  ✓ خصوصية: ${label}`)
}

const grepPresent = (pattern, target, label) => {
  let out = ''
  try {
    out = execSync(`grep -rnE '${pattern}' ${target} || true`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    out = ''
  }
  if (!out) {
    console.error(`✗ FAIL (خصوصية): ${label} — النمط المتوقع غير موجود`)
    process.exit(1)
  }
  console.log(`  ✓ خصوصية: ${label}`)
}

// الشبكة في ميزة الباركود محصورة في openFoodFacts.ts حصرًا.
grepZero(
  'fetch\\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource',
  "src/features/barcode --include='*.ts' --include='*.tsx' --exclude=openFoodFacts.ts",
  'لا اتصال شبكة خارج openFoodFacts.ts في ميزة الباركود',
)
// لا تسلسل لإطارات الكاميرا إلى صيغ قابلة للرفع في أي ملف من الميزة.
grepZero(
  'toDataURL|toBlob|getImageData|createImageBitmap|new FormData',
  'src/features/barcode',
  'لا تسلسل لإطارات الكاميرا (toDataURL/toBlob/getImageData/FormData)',
)
// طلب OFF يظل GET خالصًا يحمل الباركود فقط — لا body ولا method.
grepZero("method:|body:", 'src/features/barcode/openFoodFacts.ts', 'طلب OFF بلا body/method — GET بالباركود فقط')
grepPresent('encodeURIComponent\\(barcode\\)', 'src/features/barcode/openFoodFacts.ts', 'OFF يستلم رقم الباركود فقط في المسار')
// الإضافة الأصلية بلا أي شبكة إطلاقًا — الفكّ داخل النظام والقيمة النصية فقط تعبر الجسر.
grepZero(
  'URLSession|URLRequest|dataTask|Alamofire',
  'ios/App/App/BarcodeScanPlugin.swift',
  'لا شبكة في الإضافة الأصلية (AVFoundation فقط)',
)
// التشخيص بيانات وصفية — لا لمس للبكسلات إطلاقًا.
grepZero(
  'toDataURL|toBlob|getImageData|drawImage|createElement',
  'src/features/barcode/scanDiagnostics.ts',
  'التشخيص لا يلمس canvas/بكسلات',
)

// ── برهان الوحدات ───────────────────────────────────────────────────────────
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/barcode-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'barcode-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
