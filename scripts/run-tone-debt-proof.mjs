import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const body = readFileSync(resolve(root, 'src/i18n/dict/bodyStep.ts'), 'utf8')
const intent = readFileSync(resolve(root, 'src/i18n/dict/onboardingIntent.ts'), 'utf8')
const strings = readFileSync(resolve(root, 'src/config/strings.ts'), 'utf8')
const arabicLegal = strings.indexOf("privacyTitle: 'سياسة")
const legalStart = strings.lastIndexOf('  legal: {', arabicLegal)
const legal = strings.slice(legalStart, strings.indexOf('  notFound:', legalStart))
const checks = [
  ['body UI declares white Saudi tone', body.includes('عامية بيضاء سعودية') && !body.includes('فصحى دافئة')],
  ['intent UI declares white Saudi tone', intent.includes('عامية بيضاء سعودية') && !intent.includes('فصحى دافئة')],
  ['body UI uses casual markers', ['عشان', 'تقدر', 'عبّ'].every((word) => body.includes(word))],
  ['intent UI uses casual markers', ['وش', 'جوابين', 'توّك'].every((word) => intent.includes(word))],
  ['legal copy stays formal', legal.includes('يمكنك حذف') && !/تقدر|عشان|وش|لسا|بتشوف|تبغى|تبي|خل تسجيل/.test(legal)],
  ['legal copy is separate from casual UI', strings.includes('  legal:') && strings.includes('  tabs:')],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ Tone debt: ${checks.length} checks passed.`)
