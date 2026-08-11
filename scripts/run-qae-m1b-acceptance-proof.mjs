// Runner for scripts/qae-m1b-acceptance-proof.ts — bundles the APP side
// (@/ + @qae/) over a simulated localStorage and runs it headless.
//
// It also answers ONE question the bundle cannot answer about itself: does any
// application module import the shadow? That is a source-tree fact, so it is
// measured here with fs and injected as a define. A proof that asked the bundle
// "is anything importing you?" would be asking the wrong process.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join, relative } from 'node:path'
import { writeFileSync, mkdtempSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const srcDir = resolve(root, 'src')

/** Every .ts/.tsx under src/, excluding the shadow module's own directory. */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

const shadowImporters = walk(srcDir)
  .filter((f) => !relative(srcDir, f).startsWith(join('lib', 'qae')))
  .filter((f) => /from\s+['"][^'"]*(qae\/shadow|lib\/qae)['"]/.test(readFileSync(f, 'utf8')))
  .map((f) => relative(root, f))

if (shadowImporters.length > 0) {
  console.log(`  (app modules importing the shadow: ${shadowImporters.join(', ')})`)
}

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
  entryPoints: [resolve(__dirname, 'qae-m1b-acceptance-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  loader: { '.json': 'json' },
  alias: {
    '@': srcDir,
    '@qae': resolve(root, 'QimmahAdaptiveEngine'),
  },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    __APP_IMPORTS_SHADOW__: JSON.stringify(shadowImporters.length > 0),
  },
  logLevel: 'warning',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-m1b-'))
const bundlePath = join(outDir, 'proof.mjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
