// Runner for scripts/qae-onboarding-evidence-proof.ts — bundles the APP side
// (@/ + @qae/) over a simulated localStorage, no browser. Same shape as
// run-qae-shadow-proof.mjs plus the draft-store banner from
// run-onboarding-async-proof.mjs, because this proof exercises draft persistence.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(__dirname, 'qae-onboarding-evidence-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  loader: { '.json': 'json' },
  alias: {
    '@': resolve(root, 'src'),
    '@qae': resolve(root, 'QimmahAdaptiveEngine'),
  },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-onb-evidence-'))
const bundlePath = join(outDir, 'proof.mjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
