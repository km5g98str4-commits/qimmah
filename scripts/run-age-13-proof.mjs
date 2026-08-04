// إثبات حدّ العمر ١٣ — لا سطح أهلية في التطبيق يعرض «12».
//
// الفجوة التي يُغلقها: `policyCopy.ts` كان يعلن «عمري 12 سنة أو أكثر» بينما
// مدقّق الإعداد يرفض ما دون 13 (`AGE_RANGE.min`) — أي أن التطبيق **يَعِد بما
// يمنعه**. وحزم الامتثال المشحونة تقول 13. القرار مقفل في [CTO-14/٢].
//
// فحص ساكن عمدًا: هذه أسطح **نصّية معروضة**، والتحقّق منها يكون على النصّ لا
// على سلوك وقت التشغيل.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const fails = []
const check = (label, ok) => {
  if (ok) { pass++; console.log('  ✓ ' + label) }
  else { fails.push(label); console.log('  ✗ ' + label) }
}

const policy = read('src/data/policyCopy.ts')
const validation = read('src/lib/validation.ts')
const onboarding = read('src/i18n/dict/onboarding.ts')
const flow = read('src/lib/onboardingV2Flow.ts')

console.log('\n═══ 1) مربّع الأهلية يقول ١٣ ═══')
check('العربية: «عمري 13 سنة أو أكثر»', policy.includes('عمري 13 سنة أو أكثر'))
check('الإنجليزية: «I am 13 or older»', policy.includes('I am 13 or older'))
check('رسالة الاشتراط العربية تقول 13', policy.includes('أكّد أن عمرك 13 سنة أو أكثر'))
check('رسالة الاشتراط الإنجليزية تقول 13', policy.includes('you are 13 or older'))

console.log('\n═══ 2) تلميح الحقل ١٣–١٠٠ ═══')
check('العربية: (13–100)', onboarding.includes('سنة (13–100)'))
check('الإنجليزية: (13–100)', onboarding.includes('years (13–100)'))
check('رسالة التحقق تقول 13 و100', validation.includes('بين 13 و100 سنة'))

console.log('\n═══ 3) المدقّق يطابق المعروض ═══')
check('validation.age = { min: 13, max: 100 }', /age:\s*\{\s*min:\s*13,\s*max:\s*100\s*\}/.test(validation))
check('AGE_RANGE = { min: 13, max: 100 }', /AGE_RANGE\s*=\s*\{\s*min:\s*13,\s*max:\s*100\s*\}/.test(flow))

console.log('\n═══ 4) التأكيد الحاسم — لا «12» في أي سطح أهلية (§4.2) ═══')
// كل صيغة قد يظهر بها الرقم للمستخدم، عربيةً وإنجليزيةً.
const FORBIDDEN = [
  ['عربي: «12 سنة أو أكثر»', /12\s*سنة\s*أو\s*أكثر/],
  ['إنجليزي: «12 or older»', /\b12\s+or\s+older\b/i],
  ['نطاق معروض 12–90', /12\s*[–-]\s*90/],
  ['رسالة «بين 12 و90»', /بين\s*12\s*و\s*90/],
  ['نطاق مدقّق min: 12', /min:\s*12\b/],
]
const SURFACES = { 'policyCopy.ts': policy, 'validation.ts': validation, 'onboarding.ts': onboarding, 'onboardingV2Flow.ts': flow }
for (const [label, re] of FORBIDDEN) {
  const hits = Object.entries(SURFACES).filter(([, src]) => re.test(src)).map(([n]) => n)
  check(`${label} — غائب من كل الأسطح`, hits.length === 0)
  if (hits.length) console.log('       ظهر في: ' + hits.join(', '))
}

console.log('\n═══ 5) تأكيد مضادّ — الإثبات ليس فارغًا (§4.2) ═══')
// لو صار أحد الأسطح فارغًا أو تغيّر مساره لمرّت الفحوص أعلاه مجّانًا.
check('كل الأسطح الأربعة قُرئت بمحتوى فعلي', Object.values(SURFACES).every((s) => s.length > 500))
check('سطح الأهلية يحوي فعلًا نصّ الموافقة', policy.includes('eligibilityPrefix'))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات حدّ العمر ١٣: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
