// Runs the theme-toggle proof: first asserts the v3.0 §F1 token corrections in
// tokens.css (fs), then bundles + runs the logic proof over a DOM/localStorage
// shim with a controllable matchMedia. No browser.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── (A) Token corrections in tokens.css ──
const css = readFileSync(resolve(root, 'src/design-system/tokens.css'), 'utf8')
let cssFail = 0
const c = (label, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + label); if (!cond) cssFail++ }
c('Teal corrected to v3.0 #159AA0', /--v2-teal:\s*#159aa0/i.test(css))
c('Error corrected to v3.0 #D23B2E', /--v2-error:\s*#d23b2e/i.test(css))
c('Amber token added #D99400', /--v2-amber:\s*#d99400/i.test(css))
c('old Teal #12a594 no longer defined', !/--v2-teal:\s*#12a594/i.test(css))
c('old Error #e11d2e no longer defined', !/--v2-error:\s*#e11d2e/i.test(css))
c('--color-warning maps to amber', /--color-warning:\s*var\(--v2-amber\)/i.test(css))
c('dark theme block present', /\[data-theme='dark'\]\s*body/.test(css))
c('light theme block present', /\[data-theme='light'\]\s*body/.test(css))
if (cssFail > 0) { console.log(`\nToken CSS: ${cssFail} failed`); process.exit(1) }

// ── (B) Theme logic proof ──
const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  get length() { return __store.size; },
};
globalThis.__mqDark = false;
const __de = { dataset: {} };
globalThis.localStorage = __ls;
globalThis.document = { documentElement: __de, addEventListener() {}, removeEventListener() {} };
globalThis.window = {
  localStorage: __ls,
  matchMedia: (q) => ({ matches: !!globalThis.__mqDark, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  addEventListener() {}, removeEventListener() {},
};
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/theme-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'theme-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
