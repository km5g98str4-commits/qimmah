import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const login = read('src/views/LoginView.tsx')
const plan = read('src/components/PlanBuilder.tsx')
const onbV2 = read('src/views/OnboardingV2.tsx')
const flow = read('src/lib/onboardingV2Flow.ts')
const profile = read('src/lib/planBuilderAnswers.ts')
const pwa = read('src/lib/pwa.ts')
const banner = read('src/components/InstallBanner.tsx')
const prompt = read('src/components/InstallPrompt.tsx')
const shell = read('src/components/MobileShell.tsx')
const labels = read('src/design-system/v2/labels.ts')
const profileV2 = read('src/views/ProfileV2.tsx')

console.log('\n① بوابة أهلية 12+ على سطح الحساب المشترك بين v1 وv2')
check('زر التسجيل محجوب بلا موافقة', /pw\.valid && eligible12/.test(login))
check('حارس الإرسال يعيد التحقق قبل signUp', login.indexOf('if (isSignup && !eligible12)') < login.indexOf('auth.signUp('))
check('روابط الشروط والخصوصية حقيقية وآمنة', login.includes('POLICY_LINKS.terms') && login.includes('POLICY_LINKS.privacy') && login.includes('noopener noreferrer'))

console.log('\n② موافقة البيانات الصحية محفوظة وليست افتراضًا')
check('v1 يحجب أول خطوة قياسات بلا موافقة', plan.includes("key: 'height'") && plan.includes('valid: a.healthDataConsent'))
check('v2 يحجب الانتقال بلا موافقة', flow.includes("return d.healthDataConsent ? null : 'healthConsent'"))
check('الموافقة تدخل مصدر الحقيقة', profile.includes('accepted: a.healthDataConsent'))
check('المسودة الجديدة لا تفترض الموافقة', flow.includes('healthDataConsent: false'))
check('سطح v2 يعرض رابط الخصوصية', onbV2.includes('POLICY_LINKS.privacy'))

console.log('\n③ حواجز التطبيق الأصلي والسياسة البصرية')
check('PWA يعتبر الغلاف الأصلي مثبتًا', /if \(isNativePlatform\(\)\) return true/.test(pwa))
check('InstallBanner لا يرندر أصليًا', banner.includes('if (isNativePlatform() || standalone'))
check('InstallPrompt لا يرندر أصليًا', prompt.includes('if (isNativePlatform() || standalone'))
check('التبويبات تستخدم قاموس v2 المركزي', shell.includes('V2_TAB_LABELS.today') && shell.includes('V2_TAB_LABELS.progress'))
check('تسميات §03 الخمس موجودة', ['اليوم', 'التمارين', 'تسجيل', 'التغذية', 'التقدّم'].every((s) => labels.includes(s)))
check('قِمّة+ سطر هادئ واحد', (profileV2.match(/Qimmah\+ — ONE quiet line/g) ?? []).length === 1)

console.log(`\n✅ نجحت ${pass} فحوص سياسة/غلاف أصلي.`)
