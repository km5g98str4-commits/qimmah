import { build } from 'esbuild'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; }, key: (i) => [...__store.keys()][i] ?? null,
  getItem: (k) => (__store.has(k) ? __store.get(k) : null), setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); }, clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls; globalThis.window = { localStorage: __ls };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/plates-prs-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'qimmah-plates-prs-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)

const workout = readFileSync(resolve(root, 'src/views/WorkoutV2.tsx'), 'utf8')
const progress = readFileSync(resolve(root, 'src/views/ProgressV2.tsx'), 'utf8')
const staticChecks = [
  ['WorkoutV2 يسجّل PR في محرّك الإنجازات', /registerWorkoutPRs\(prs\)/.test(workout)],
  ['WorkoutV2 يفتح حاسبة الأقراص للوزن الحالي', /initialTargetKg=\{row\.weight\}/.test(workout)],
  ['Progress يعرض الخط الزمني الحقيقي', /strength\.prEvents\.map/.test(progress)],
  ['الواجهتان تستخدمان المكوّن المشترك', workout.includes('PlateCalculatorPanel') && progress.includes('PlateCalculatorPanel')],
]
let failed = 0
console.log('\n⑤ إثبات توصيل الواجهات')
staticChecks.forEach(([label, ok]) => { console.log(`  ${ok ? '✓' : '✗ FAIL:'} ${label}`); if (!ok) failed += 1 })
if (failed) process.exit(1)
console.log('\n✅ نجحت فحوص التوصيل الأربعة.')
