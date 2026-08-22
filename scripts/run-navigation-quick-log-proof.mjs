// Static contract for the launch-critical Quick Log and deterministic 404 recovery.
// Browser behavior is exercised by scripts/e2e/navigation-quick-log.mjs.

import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/components/MobileShell.tsx', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../src/views/ProfileV2.tsx', import.meta.url), 'utf8')

let passed = 0
function assertNamed(name, condition) {
  if (!condition) throw new Error(`[${name}] contract missing`)
  passed += 1
  console.log(`  ✓ ${name}`)
}

function assertAppContract(source) {
  assertNamed('quick-log-storage-fallback', /try\s*\{\s*window\.sessionStorage\.setItem\('qimmah:quick-log-intent', target\)\s*\}\s*catch/.test(source))
  assertNamed('quick-log-in-memory-handoff', /setPendingQuickLog\(target\)[\s\S]*quickLogIntent=\{pendingQuickLog\}[\s\S]*onQuickLogIntentHandled=\{clearPendingQuickLog\}/.test(source))
  assertNamed('quick-log-live-event-after-storage', /catch[^}]*\}\s*if \(target === 'routine'\)[\s\S]*dispatchEvent\(new CustomEvent\('qimmah:quick-log'/.test(source))
  assertNamed('not-found-owned-previous-route', /beforeNotFoundRef\s*=\s*useRef<AppRoute \| null>\(null\)/.test(source))
  assertNamed('not-found-replace-invalid-entry', /recoverNotFound[\s\S]*window\.location\.replace\(`#\/\$\{target\}`\)/.test(source))
  assertNamed('not-found-home-and-back-recover', /onHome=\{\(\) => recoverNotFound\([\s\S]*onBack=\{\(\) => recoverNotFound\(/.test(source))
}

console.log('\n=== Quick Log modal semantics ===')
assertNamed('quick-log-modal-semantics', /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="quick-log-title"/.test(shell))
assertNamed('quick-log-initial-focus-and-escape', /closeRef\.current\?\.focus\(\)[\s\S]*event\.key === 'Escape'/.test(shell))
assertNamed('quick-log-tab-trap', /event\.shiftKey[\s\S]*last\.focus\(\)[\s\S]*first\.focus\(\)/.test(shell))
assertNamed('quick-log-focus-return', /justClosed[\s\S]*quickLogTriggerRef\.current\?\.focus\(\)/.test(shell))
assertNamed('quick-log-touch-targets', /className="grid h-11 w-11[\s\S]*quick-log-action flex min-h-\[6\.5rem\]/.test(shell))

console.log('\n=== Storage and 404 product contract ===')
assertAppContract(app)
assertNamed('profile-session-storage-fallback', /try\s*\{[\s\S]*sessionStorage\.getItem\('qimmah:quick-log-intent'\)[\s\S]*\}\s*catch/.test(profile))

console.log('\n=== Named adversarial mutations ===')
for (const [name, mutated] of [
  ['quick-log-storage-fallback', app.replace(/try\s*\{\s*(window\.sessionStorage\.setItem\('qimmah:quick-log-intent', target\))\s*\}\s*catch\s*\{[^}]*\}/, '$1')],
  ['not-found-replace-invalid-entry', app.replace('window.location.replace(`#/${target}`)', 'window.location.hash = `/${target}`')],
]) {
  let rejectedByName = false
  try {
    assertAppContract(mutated)
  } catch (error) {
    rejectedByName = String(error).includes(`[${name}]`)
  }
  assertNamed(`mutation-rejected:${name}`, rejectedByName)
}

console.log(`\n✅ navigation-quick-log — ${passed} checks passed`)
