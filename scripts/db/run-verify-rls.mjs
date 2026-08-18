// Bundles scripts/db/verify-rls.ts (esbuild) and runs it against a live Supabase
// project using env credentials. @supabase/supabase-js stays external (resolved
// from node_modules at runtime). Run: npm run db:verify
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'

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

// الحزمة تُكتب **داخل المستودع** لا في /tmp. السبب: `packages: 'external'`
// يُبقي `@supabase/supabase-js` استيرادًا وقت التشغيل، وNode يحلّه بالنسبة
// لموضع الملف — فمن /tmp لا يجد `node_modules` فيسقط الأمر بـ
// ERR_MODULE_NOT_FOUND قبل أن يقرأ متغيّرًا واحدًا. عطل سابق لهذه الموجة:
// `npm run db:verify` كان يفشل هكذا دائمًا، بأي بيانات اعتماد.
const cacheRoot = join(root, 'node_modules', '.cache')
mkdirSync(cacheRoot, { recursive: true })
const dir = mkdtempSync(join(cacheRoot, 'db-verify-'))
const file = join(dir, 'verify.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
