// Bundles the coaching proof (TS with @/ paths) via esbuild over a simulated
// localStorage and runs it (no browser). Run: npm run test:coaching
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// spec-complete localStorage (length + key) for the owner-scoped rotation store
const banner = `
const __s = new Map();
const __ls = {
  get length(){return __s.size},
  key(i){return Array.from(__s.keys())[i] ?? null},
  getItem:(k)=>(__s.has(k)?__s.get(k):null),
  setItem:(k,v)=>{__s.set(k,String(v))},
  removeItem:(k)=>{__s.delete(k)},
  clear:()=>{__s.clear()},
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener(){}, removeEventListener(){} };
`

const r = await build({
  entryPoints: [resolve(root, 'scripts/coaching/coaching-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'coaching-'))
const f = join(dir, 'proof.mjs')
writeFileSync(f, r.outputFiles[0].text)
await import(pathToFileURL(f).href)
