// Bundles the proof harness (resolving @/ alias against ./src) into a Node-runnable file, then runs it.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

await build({
  entryPoints: [resolve(__dirname, 'p3proof.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: resolve(root, 'scripts/.p3proof.bundle.mjs'),
  alias: { '@': resolve(root, 'src') },
  // Vite-only globals — stub for Node runtime proof.
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
console.log('bundled OK')
