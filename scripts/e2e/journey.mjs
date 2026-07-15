import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

mkdirSync('docs/testing/e2e', { recursive: true })
const steps = [
  ['signup/onboarding 12+ + health gate + retry', ['npm','run','test:e2e:onboarding']],
  ['reviewer journey: Today → workout 99 → reload/resume → finish → meal → progress/profile', ['node','scripts/appstore-screenshot-factory.mjs']],
  ['export/import bundle validity + owner isolation', ['npm','run','test:portability']],
  ['logout wipe + user-B zero residue', ['npm','run','test:isolation']],
  ['policy gate: signup blocked until 12+', ['npm','run','test:policy']],
]
for (const [label, [bin, ...args]] of steps) {
  console.log(`\n=== ${label} ===`)
  const run = spawnSync(bin, args, { stdio: 'inherit', env: { ...process.env, VITE_DESIGN_V2: 'true' } })
  if (run.status !== 0) process.exit(run.status ?? 1)
}
const required = ['01-welcome.png','02-today.png','03-workout.png','03b-workout-resumed.png','04-nutrition.png','05-progress.png','06-profile.png']
for (const file of required) {
  if (!existsSync(`docs/appstore/screenshots/raw/${file}`)) throw new Error(`missing journey screenshot: ${file}`)
}
console.log(`\n✅ deterministic journey complete — ${required.length} screenshots, export/import and account isolation green`)
