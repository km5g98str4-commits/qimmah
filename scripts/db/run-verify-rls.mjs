// Bundles scripts/db/verify-rls.ts (esbuild) and runs it against a live Supabase
// project using env credentials. @supabase/supabase-js stays external (resolved
// from node_modules at runtime). Run: npm run db:verify
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

const result = await build({
  entryPoints: [resolve(root, 'scripts/db/verify-rls.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  packages: 'external', // keep @supabase/supabase-js + node builtins external
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'db-verify-'))
const file = join(dir, 'verify.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
