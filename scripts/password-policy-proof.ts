// Password policy proof — the signup check must recognise numbers written in
// Arabic-Indic (٠-٩) and Persian (۰-۹), not only ASCII, while still requiring a
// letter AND a number. Regression guard for the Arabic-numeral bug.

import { evaluatePassword } from '@/lib/passwordPolicy'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// ── The fix: numbers in any script are recognised ──
const arabic = evaluatePassword('مرحبا١٢٣') // 5 Arabic letters + 3 Arabic-Indic digits = 8
check('Arabic-Indic digits count as a number', arabic.hasNumber === true)
check('Arabic letters count as a letter', arabic.hasLetter === true)
check('Arabic letters + Arabic digits (8 chars) is VALID', arabic.valid === true)

const persian = evaluatePassword('abcd۱۲۳۴') // Latin letters + Persian digits
check('Persian (extended Arabic-Indic) digits count as a number', persian.hasNumber === true)
check('Latin letters + Persian digits is VALID', persian.valid === true)

const latin = evaluatePassword('abcd1234')
check('ASCII digits still count (no regression)', latin.hasNumber === true && latin.valid === true)

const mixed = evaluatePassword('pass١٢٣٤') // Latin letters + Arabic digits, 8 chars
check('mixed Latin letters + Arabic digits is VALID', mixed.valid === true)

// ── The letter+number rule is still enforced (no false positives) ──
const digitsOnly = evaluatePassword('١٢٣٤٥٦٧٨') // 8 Arabic digits, NO letter
check('all Arabic digits, no letter → hasLetter false', digitsOnly.hasLetter === false)
check('all Arabic digits, no letter → NOT valid', digitsOnly.valid === false)

const lettersOnly = evaluatePassword('مرحباابك') // 8 Arabic letters, no number
check('Arabic letters only, no number → hasNumber false', lettersOnly.hasNumber === false)
check('Arabic letters only, no number → NOT valid', lettersOnly.valid === false)

const short = evaluatePassword('مر١') // has letter+number but too short
check('too short → not valid even with letter+number', short.valid === false)

const empty = evaluatePassword('')
check('empty → level empty, not valid', empty.level === 'empty' && empty.valid === false)

// symbol still boosts strength (Arabic digit is NOT a symbol)
const sym = evaluatePassword('abcd1234!')
check('a real symbol raises score above the plain letter+number password', sym.score > latin.score)

console.log(`\nPassword-policy proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
