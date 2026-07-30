import { existsSync, readFileSync } from 'node:fs'
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
const policy = read('src/data/policyCopy.ts')
const onbV2 = read('src/views/OnboardingV2.tsx')
const flow = read('src/lib/onboardingV2Flow.ts')
const profile = read('src/lib/planBuilderAnswers.ts')
const pwa = read('src/lib/pwa.ts')
const banner = read('src/components/InstallBanner.tsx')
const prompt = read('src/components/InstallPrompt.tsx')
const shell = read('src/components/MobileShell.tsx')
const labels = read('src/design-system/v2/labels.ts')
const profileV2 = read('src/views/ProfileV2.tsx')
const publicRedirects = read('public/_redirects')

console.log('\n① بوابة أهلية 12+ على سطح الحساب المشترك بين v1 وv2')
check('زر التسجيل محجوب بلا موافقة', /pw\.valid && eligible12/.test(login))
check('حارس الإرسال يعيد التحقق قبل signUp', login.indexOf('if (isSignup && !eligible12)') < login.indexOf('auth.signUp('))
check('روابط الشروط والخصوصية داخلية ولا تفتح صفحة ويب منفصلة', login.includes('POLICY_LINKS.terms') && login.includes('POLICY_LINKS.privacy') && policy.includes("terms: '#/terms'") && policy.includes("privacy: '#/privacy'") && !login.includes('target="_blank"'))
check('وضع إنشاء الحساب محفوظ عند فتح شاشة قانونية والرجوع', login.includes("onModeChange?.(next)") && read('src/App.tsx').includes('onModeChange={setLoginMode}'))
check('روابط HTML القانونية القديمة تحوّل للشاشات الداخلية ولا تُشحن كمسودات', publicRedirects.includes('/legal/terms.html      /#/terms') && publicRedirects.includes('/legal/privacy.html    /#/privacy') && !existsSync(resolve(root, 'public/legal/terms.html')) && !existsSync(resolve(root, 'public/legal/privacy.html')))

console.log('\n② موافقة البيانات الصحية محفوظة وليست افتراضًا')
// المقصد نفسه، والبنية تغيّرت: الخطوة الأولى صارت «الجسد» (تجمع العمر/الجنس/
// الطول/الوزن) بدل «الهدف»، لأن حاجز القاصرين يحتاج العمر قبل عرض الأهداف.
// فالموافقة انتقلت معها لتبقى **قبل** أي جمع — وشرطها في validateStep(0) يسبق
// فحص الحقول، فلا يتقدّم أحد خطوة دون إذن صريح.
// ⚠️ كان هذا الفحص خمس `includes()` **منفصلة** — يُرضى بوجود كلٍّ منها في أي
// موضع من الملف. أي أنه كان يمرّ لو نُقل `<BodyStep>` إلى خطوة أخرى وبقيت في
// الملف كتلة `step === 0 && (` لمكوّن آخر. بلّغ وكيل حارة A بالثغرة ورفض
// استغلالها وهو قادر — والردّ الصحيح شدّ البوابة لا الاكتفاء بأخلاق مَن مرّ بها.
//
// البديل: تأكيد **بنيوي مقترن** — كتلة `step === 0` تُستخرج بحدودها، ثم يُشترط
// أن يكون `<BodyStep>` داخلها **ومعه** ضوابط الموافقة الثلاثة. لا يمكن إرضاؤه
// بمكوّن في خطوة وموافقة في أخرى.
const step0Block = (() => {
  const start = onbV2.indexOf('{step === 0 && (')
  if (start === -1) return ''
  // نهاية الكتلة = **أي** `{step === n` تالٍ، لا الرقم 1 تحديدًا.
  // الحدّ على الرقم 1 وحده كان ثغرة: إدراج `{step === 9 && (<BodyStep .../>)}`
  // بينهما يجعل الكتلة تبتلعه فيمرّ الالتفاف. التُقط بمحاكاة الالتفاف نفسه.
  const rest = onbV2.slice(start + 1)
  const m = rest.match(/\{step === \d+ &&/)
  return m ? onbV2.slice(start, start + 1 + m.index) : onbV2.slice(start)
})()
check(
  'بوابة الموافقة على أول خطوة قبل أي جمع بيانات (تأكيد بنيوي مقترن)',
  step0Block.includes('<BodyStep') &&
    step0Block.includes('healthDataConsent={healthDataConsent}') &&
    step0Block.includes('onConsent={setHealthDataConsent}') &&
    onbV2.includes('checked={healthDataConsent}'),
)
// تأكيد مضادّ (§4.2): الكتلة المستخرَجة ليست الملف كله — وإلا لصار الاقتران وهميًا.
check(
  'كتلة الخطوة 0 مستخرَجة بحدودها لا الملف كله',
  step0Block.length > 0 && step0Block.length < onbV2.length * 0.5,
)
check('الموافقة شرط سابق لحقول الجسد في منطق التحقق', /if \(!d\.healthDataConsent\) return 'healthConsent'/.test(flow))
check('v2 يحجب الانتقال بلا موافقة', /if \(!d\.healthDataConsent\) return 'healthConsent'/.test(flow))
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
check('شاشات الدخول العامة تستخدم viewport داخليًا بدل تمرير صفحة ويب', ['LoginView', 'ResetPasswordView', 'VerifyEmailView', 'NotFoundView'].every((name) => { const source = read(`src/views/${name}.tsx`); return source.includes('h-[100dvh]') && source.includes('app-scroll') && !source.includes('min-h-screen') }))

console.log(`\n✅ نجحت ${pass} فحوص سياسة/غلاف أصلي.`)
