import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// سقالة متصفّح مصغّرة: المحرّك لا يحتاج إلا ImageData وسياق canvas صوريًّا،
// لأن كل الرسم يجري في مخازن TypedArray داخل الراستَرايزر البرمجي.
const banner = `
class ImageData {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
}
globalThis.ImageData = ImageData;
globalThis.makeCtx = () => ({
  setTransform() {}, clearRect() {}, putImageData() {}, save() {}, restore() {},
  translate() {}, scale() {}, beginPath() {}, arc() {}, fill() {},
  createRadialGradient: () => ({ addColorStop() {} }),
  globalCompositeOperation: '', fillStyle: '',
});
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/body3d-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'body3d-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
