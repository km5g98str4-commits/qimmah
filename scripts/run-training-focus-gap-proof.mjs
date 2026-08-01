import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const doc = readFileSync(resolve(root, 'docs/product/TRAINING-FOCUS-GAP.md'), 'utf8')
const adapter = readFileSync(resolve(root, 'src/lib/onboardingV2Adapter.ts'), 'utf8')
const profile = readFileSync(resolve(root, 'src/lib/onboardingProfile.ts'), 'utf8')
const checks = [
  ['gap status is explicit', doc.includes('موثّقة، وليست مُفعّلة')],
  ['existing Profile field is named', doc.includes('Profile.muscleFocus')],
  ['v2 equipment preference is not reinterpreted as muscle focus', doc.includes('machines/free/mixed') && doc.includes('لا يصحّ الادعاء')],
  ['adapter documents the missing Answers field', adapter.includes('NO existing `Answers` field')],
  ['legacy adapter keeps balanced as the honest default', profile.includes("muscleFocus: 'balanced'")],
  ['migration plan requires an observable generator effect', doc.includes('أثبت تأثيرها على')],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ Training-focus gap: ${checks.length} checks passed.`)
