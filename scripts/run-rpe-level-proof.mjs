import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const workout = readFileSync(resolve(root, 'src/views/WorkoutV2.tsx'), 'utf8')
const persist = readFileSync(resolve(root, 'src/lib/workoutV2Persist.ts'), 'utf8')
const checks = [
  ['RPE eligibility is restricted to intermediate/advanced', /rpeLevel === 'intermediate' \|\| rpeLevel === 'advanced'/.test(workout)],
  ['RPE picker is rendered behind the eligibility gate', /rpeEnabled && \(\s*<RpePicker/.test(workout)],
  ['RPE is optional and can be cleared', /value === rpe \? undefined : rpe/.test(workout)],
  ['RPE is carried into canonical saved set logs', /typeof r\.rpe === 'number' \? \{ rpe: r\.rpe \}/.test(persist)],
  ['RPE has an accessible bilingual group label', /مجهود المجموعة \(RPE\)/.test(workout) && /Set effort \(RPE\)/.test(workout)],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ RPE level gate: ${checks.length} checks passed.`)
