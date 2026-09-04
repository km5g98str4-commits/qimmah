import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const body = readFileSync(resolve(root, 'src/i18n/dict/bodyStep.ts'), 'utf8')
const intent = readFileSync(resolve(root, 'src/i18n/dict/onboardingIntent.ts'), 'utf8')
const canonical = readFileSync(resolve(root, 'src/legal/canonicalLegalContent.ts'), 'utf8')
const canonicalView = readFileSync(resolve(root, 'src/components/legal/CanonicalLegalView.tsx'), 'utf8')
const privacyView = readFileSync(resolve(root, 'src/views/PrivacyView.tsx'), 'utf8')
const termsView = readFileSync(resolve(root, 'src/views/TermsView.tsx'), 'utf8')
const legalStart = canonical.indexOf('function privacy(lang: Lang)')
const legalEnd = canonical.indexOf('export function getLegalDocument', legalStart)
const legal = canonical.slice(legalStart, legalEnd)
const casualMarkers = /تقدر|عشان|وش|لسا|بتشوف|تبغى|تبي|خل تسجيل/
const checks = [
  ['body UI declares white Saudi tone', body.includes('عامية بيضاء سعودية') && !body.includes('فصحى دافئة')],
  ['intent UI declares white Saudi tone', intent.includes('عامية بيضاء سعودية') && !intent.includes('فصحى دافئة')],
  ['body UI uses casual markers', ['عشان', 'تقدر', 'عبّ'].every((word) => body.includes(word))],
  ['intent UI uses casual markers', ['وش', 'جوابين', 'توّك'].every((word) => intent.includes(word))],
  ['legal copy stays formal', legal.includes('يمكنك طلب حذف') && !casualMarkers.test(legal)],
  ['legal copy is separate from casual UI',
    canonicalView.includes('getLegalDocument(kind, lang)') &&
    privacyView.includes('<CanonicalLegalView kind="privacy"') &&
    termsView.includes('<CanonicalLegalView kind="terms"')],
  ['smuggled casual legal copy is rejected', casualMarkers.test("تقدر تطلب حذف حسابك")],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ Tone debt: ${checks.length} checks passed.`)
