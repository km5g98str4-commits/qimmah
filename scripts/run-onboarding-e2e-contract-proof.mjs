import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'scripts/e2e-onboarding.mjs'), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات عقد onboarding e2e الجديد')
check('الاختبار يملأ بيانات الجسم قبل النية', source.indexOf('fillBodyAndConsent') < source.indexOf('intent.intents'))
check('الموافقة الصحية جزء من خطوة الأساسيات', source.includes('policy.healthConsent') && source.includes('body validation is visible'))
check('اختبار المبتدئ يتحقق من «خسارة دهون»', source.includes("beginnerCut === 'خسارة دهون'"))
check('اختبار المتقدم يتحقق من صياغة «تنشيف»', source.includes("advancedCut.startsWith('تنشيف')"))
check('الترتيب الكامل يمرّ بالتاريخ ثم السياق والقيود', source.includes('answerHistory') && source.includes('finishInputSteps'))
check('المتدرّب يغطي أسئلة التاريخ الأربعة', source.includes('advancedHistory.historyGroups === 4'))
check('never يرى سؤال تاريخ واحدًا', source.includes('neverHistory.historyGroups === 1'))
check('لا رجوع للضغط على هدف قديم قبل الأساسيات', !source.includes('cutGoal') && !source.includes("new RegExp(cutGoal)"))

console.log(`\n✅ عقد onboarding e2e: ${pass} فحوص، 0 فشل.`)
