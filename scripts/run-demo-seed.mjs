// Development-only local demo-data generator. It prints a browser snippet and
// never contacts Supabase or mutates the current browser by itself.
//
//   node scripts/run-demo-seed.mjs --profile=reviewer
//   node scripts/run-demo-seed.mjs --profile=veteran --out=demo.js
//   node scripts/run-demo-seed.mjs --profile=fresh --owner=<uid>
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/)
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true]
}))
const profile = args.profile
if (!['reviewer', 'fresh', 'veteran'].includes(profile)) {
  console.error('Usage: node scripts/run-demo-seed.mjs --profile=reviewer|fresh|veteran [--out=file.js] [--owner=<uid>]')
  process.exit(2)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const result = await build({
  entryPoints: [resolve(root, 'scripts/demo-seed.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  define: { 'import.meta.env': JSON.stringify({ MODE: 'dev', DEV: true, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'demo-seed-'))
const file = join(dir, 'seed.mjs')
writeFileSync(file, result.outputFiles[0].text)
const { buildSeed, browserSnippet } = await import(pathToFileURL(file).href)

const seed = buildSeed({ profile, nowMs: Date.now(), ownerId: args.owner || null })
const snippet = browserSnippet(seed)
if (args.out) { writeFileSync(resolve(root, String(args.out)), snippet); console.error(`✅ wrote ${args.out} (${Object.keys(seed).length} keys)`) }
console.log(snippet)
