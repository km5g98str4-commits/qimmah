// Bundles scripts/db/schema-rls-proof.ts (esbuild) and runs it. Offline: reads
// supabase/migrations + the client's SyncTable union and proves they agree, that
// RLS is owner-only, and that two accounts are isolated. Run: npm run test:db-schema
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const result = await build({
  entryPoints: [resolve(root, 'scripts/db/schema-rls-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: 'false' }) },
  logLevel: 'warning',
})

// The bundle runs from a tmpdir; hand it the repo root explicitly.
process.env.QIMMAH_PROOF_ROOT = root

const dir = mkdtempSync(join(tmpdir(), 'db-schema-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
