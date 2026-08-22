import { readFileSync } from 'node:fs'
import { LIBRARY_AUDIT_PATH, validateLibraryAudit } from './library-audit-lib.mjs'

const original = JSON.parse(readFileSync(LIBRARY_AUDIT_PATH, 'utf8'))
const clone = () => structuredClone(original)

async function expectNamedFailure(name, mutate, expectedCode) {
  const candidate = clone()
  mutate(candidate)
  const result = await validateLibraryAudit(candidate)
  const codes = result.issues.map((found) => found.code)
  if (!codes.includes(expectedCode)) throw new Error(`${name}: expected ${expectedCode}; got ${codes.join(', ') || 'no failure'}`)
  console.log(`${name}: PASS -> ${expectedCode}`)
}

const base = await validateLibraryAudit(original)
if (base.issues.length) throw new Error(`BASE_LIBRARY_AUDIT: ${base.issues.map((found) => found.code).join(', ')}`)
if (
  base.computedSummary.catalogTotal !== 181 ||
  base.computedSummary.uniqueExerciseIds !== 181 ||
  base.computedSummary.core.complete !== 181 ||
  base.computedSummary.bilingualAuthored.complete !== 0 ||
  base.computedSummary.substitutions.withExplicit !== 54 ||
  base.computedSummary.substitutions.invalidReferences !== 0
) {
  throw new Error(`LIBRARY_BASELINE_COUNTS: ${JSON.stringify(base.computedSummary)}`)
}
console.log('BASE_LIBRARY_AUDIT: PASS -> 181 unique / 181 core complete / 0 bilingual authored complete / 54 with substitutions')

await expectNamedFailure('MUTATION_COVERAGE', (audit) => {
  audit.records.pop()
}, 'LIBRARY_COVERAGE')

await expectNamedFailure('MUTATION_UNIQUE_IDS', (audit) => {
  audit.records.push(structuredClone(audit.records[0]))
}, 'LIBRARY_UNIQUE_IDS')

await expectNamedFailure('MUTATION_SOURCE_FINGERPRINT', (audit) => {
  audit.baseline.sourceFingerprint = '0'.repeat(64)
}, 'LIBRARY_SOURCE_FINGERPRINT')

await expectNamedFailure('MUTATION_SOURCE_IDENTITY', (audit) => {
  audit.baseline.sourceFiles[0].path = 'src/data/not-the-canonical-source.ts'
}, 'LIBRARY_SOURCE_IDENTITY')

await expectNamedFailure('MUTATION_UNKNOWN_FIELD', (audit) => {
  audit.records[0].generatedDescription = 'not in schema'
}, 'LIBRARY_UNKNOWN_FIELD')

await expectNamedFailure('MUTATION_SUBSTITUTION_INTEGRITY', (audit) => {
  audit.records[0].substitutions = ['not-a-canonical-exercise']
}, 'LIBRARY_SUBSTITUTION_INTEGRITY')

await expectNamedFailure('MUTATION_FALLBACK_IS_NOT_AUTHORED', (audit) => {
  audit.records[0].authored.cues.ar = ['ركّز على الكور طوال الحركة.']
}, 'LIBRARY_FALLBACK_IS_NOT_AUTHORED')

await expectNamedFailure('MUTATION_MISSING_ENGLISH_VISIBILITY', (audit) => {
  audit.records[0].authored.description.en = 'Generated English description'
}, 'LIBRARY_MISSING_ENGLISH_VISIBILITY')

await expectNamedFailure('MUTATION_COUNT_DRIFT', (audit) => {
  audit.summary.catalogTotal += 1
}, 'LIBRARY_COUNT_DRIFT')

await expectNamedFailure('MUTATION_CORE_INTEGRITY', (audit) => {
  audit.records[0].core.equipment = []
}, 'LIBRARY_CORE_INTEGRITY')

const authoredArabicIndex = original.records.findIndex((record) => record.authored.description.ar !== null)
await expectNamedFailure('MUTATION_AUTHORED_TEXT_INTEGRITY', (audit) => {
  audit.records[authoredArabicIndex].authored.description.ar += ' altered'
}, 'LIBRARY_AUTHORED_TEXT_INTEGRITY')

await expectNamedFailure('MUTATION_COMPLETENESS_DRIFT', (audit) => {
  audit.records[0].completeness.bilingualAuthoredComplete = true
}, 'LIBRARY_COMPLETENESS_DRIFT')

console.log('EXERCISE_LIBRARY_AUDIT_PROOF: PASS (12 named mutations)')
