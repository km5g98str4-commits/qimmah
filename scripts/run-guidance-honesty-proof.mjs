import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const checks = [
  ['Exercise has optional authored English guidance fields', /howToEn\?: string\[\]/.test(read('src/types/workout.ts')) && /techniqueTipsEn\?: string\[\]/.test(read('src/types/workout.ts'))],
  ['Guidance returns empty English content for known catalog items', /if \(getExercise\(exercise\.id\)\) return \[\]/.test(read('src/lib/exerciseGuidance.ts'))],
  ['Detail view passes the selected language into guidance', /guidanceFor\(ex, lang\)/.test(read('src/components/ExerciseDetail.tsx'))],
  ['Detail view shows a bilingual absence message instead of an empty block', /guidanceUnavailable/.test(read('src/components/ExerciseDetail.tsx')) && /guidanceUnavailable:/.test(read('src/i18n/dict/library.ts'))],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ Guidance honesty: ${checks.length} checks passed.`)
