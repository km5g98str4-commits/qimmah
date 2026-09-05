// Permanent proof for the founder-approved age contract:
// supported ages 12+, minor policy 12–17, adult numeric personalization 18+.
//
// This is intentionally structural. Runtime boundary behavior is exercised by
// `test:body-fields`, `test:formula`, and `test:prelaunch-age-beginner`.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

let passed = 0
const failures = []
const check = (label, condition) => {
  if (condition) { passed++; console.log(`  ✓ ${label}`) }
  else { failures.push(label); console.log(`  ✗ ${label}`) }
}

const policyBridge = read('src/data/policyCopy.ts')
const policy = read('src/legal/canonicalLegalContent.ts')
const validation = read('src/lib/validation.ts')
const onboarding = read('src/i18n/dict/onboarding.ts')
const bodyCopy = read('src/i18n/dict/bodyStep.ts')
const flow = read('src/lib/onboardingV2Flow.ts')
const domain = read('src/config/profileDomain.ts')
const calculators = read('src/lib/calculators.ts')

console.log('\n═══ 1) ACCOUNT ELIGIBILITY IS 12+ IN BOTH LANGUAGES ═══')
check('Arabic eligibility says 12 or older', policy.includes('عمري 12 سنة أو أكثر'))
check('English eligibility says 12 or older', policy.includes('I am 12 or older'))
check('Arabic required message says 12 or older', policy.includes('أكّد أن عمرك 12 سنة أو أكثر'))
check('English required message says 12 or older', policy.includes('you are 12 or older'))
check('Friendly below-minimum copy says 12+', bodyCopy.includes('قِمّة لعمر ١٢ وفوق') && bodyCopy.includes('ages 12 and up'))

console.log('\n═══ 2) ONE RUNTIME AGE RANGE: 12–100 ═══')
const ageRange = domain.match(/AGE_RANGE:\s*NumericRange\s*=\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\}/)
check('AGE_RANGE is readable from the single authority', !!ageRange)
const [, minAge, maxAge] = ageRange ?? [, '', '']
check('AGE_RANGE is exactly 12–100', minAge === '12' && maxAge === '100')
check('Age hint derives from AGE_RANGE', /AGE_HINT\s*=\s*rangeHint\(AGE_RANGE,/.test(domain))
check('Arabic age hint resolves to 12–100', `سنة (${minAge}–${maxAge})` === 'سنة (12–100)' && onboarding.includes('bodyAgeHint: AGE_HINT.ar'))
check('English age hint resolves to 12–100', `years (${minAge}–${maxAge})` === 'years (12–100)' && onboarding.includes('bodyAgeHint: AGE_HINT.en'))
check('Shared validation imports AGE_RANGE instead of declaring another age range', validation.includes('AGE_RANGE') && !/age:\s*\{\s*min:\s*\d+/.test(validation))
check('Onboarding flow imports AGE_RANGE instead of declaring another age range', flow.includes("from '@/config/profileDomain'") && !/AGE_RANGE\s*=\s*\{/.test(flow))

console.log('\n═══ 3) MINOR 12–17 / ADULT 18+ CONTRACT ═══')
check('Canonical English privacy says users aged 12–17 and minimum 12', policy.includes('Users aged 12–17') && policy.includes('minimum supported age is 12'))
check('Canonical Arabic privacy says ages 12–17 and minimum 12', policy.includes('الأعمار من 12 إلى 17') && policy.includes('الحد الأدنى المدعوم 12 سنة'))
check('Canonical Terms use the same 12–17 range', policy.includes('For users aged 12–17') && policy.includes('لمن أعمارهم من 12 إلى 17'))
check('Adult numeric boundary remains exactly 18', /ADULT_MIN_AGE\s*=\s*18\b/.test(calculators))
check('Minor predicate remains age < ADULT_MIN_AGE', /age\s*>\s*0\s*&&\s*age\s*<\s*ADULT_MIN_AGE/.test(calculators))

console.log('\n═══ 4) PRICE AND ENTITLEMENT WORDING ARE UNCHANGED ═══')
check('Canonical Terms retain exactly SAR 19.99', policy.includes('SAR 19.99') && policy.includes('19.99 ريال سعودي'))
check('Canonical Terms retain one-time purchase wording', policy.includes('one-time purchase') && policy.includes('شراء مرة واحدة'))
check('Canonical Terms retain no-monthly/no-auto-renewal wording', policy.includes('not a monthly or auto-renewing subscription') && policy.includes('ليس اشتراكًا شهريًا ولا تجديدًا تلقائيًا'))
check('No 19.90 value appears in canonical legal content', !/19[.,٫]90/.test(policy))

console.log('\n═══ 5) ANTI-REGRESSION / ANTI-BYPASS ═══')
const eligibilitySurfaces = { policy, bodyCopy, domain }
const forbidden = [
  ['Arabic eligibility regressed to 13', /عمري\s*13\s*سنة\s*أو\s*أكثر/],
  ['English eligibility regressed to 13', /\bI am 13 or older\b/i],
  ['Runtime minimum regressed to 13', /AGE_RANGE:\s*NumericRange\s*=\s*\{\s*min:\s*13\b/],
]
for (const [label, pattern] of forbidden) {
  const hits = Object.entries(eligibilitySurfaces).filter(([, source]) => pattern.test(source)).map(([name]) => name)
  check(`${label} — absent`, hits.length === 0)
  if (hits.length) console.log(`       found in: ${hits.join(', ')}`)
}
check('All structural surfaces were read with real content', Object.values(eligibilitySurfaces).every((source) => source.length > 500))
check('Compatibility bridge re-exports canonical policy instead of copying it', policyBridge.includes('canonicalLegalContent') && !policyBridge.includes('12 or older'))
const SMUGGLED = "import { AGE_RANGE } from '@/config/profileDomain'\nconst AGE_RANGE = { min: 13, max: 100 }"
check('Counter-attack: a smuggled min 13 is detected by the regression rule', /min:\s*13\b/.test(SMUGGLED) && /AGE_RANGE\s*=\s*\{/.test(SMUGGLED))

console.log(`\n${failures.length === 0 ? '✅' : '❌'} Age 12 policy proof: ${passed} passed, ${failures.length} failed.`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
