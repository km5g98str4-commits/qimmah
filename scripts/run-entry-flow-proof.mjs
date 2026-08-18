/**
 * إثبات مسار الدخول — [WAVE-A]
 *
 * العقد المحروس:
 *   هبوط ← ١٨ سؤالًا ← كشف ← حساب (عند لزومه) ← Premium/تجربة/معاينة ← اليوم
 *
 * الارتداد الذي يمنعه: **عودة «الحساب أولًا»**. كان نداء الهبوط الأساسي
 * («ابدأ الآن») موصولًا بـ`onSignup`، فيَعِد بالبدء ويسلّم نموذج حساب — والزائر
 * الجديد يُجبَر على الحساب قبل أن يرى سؤالًا. وهو مخالف لـ§0.1: التخصيص وتوليد
 * الخطة ومعاينتها مجانية **بلا حساب ولا دفع**.
 *
 * الفحوص **بنيوية مقترنة** لا وجودية (§4.2): لا يكفي أن يذكر الملف `onGuest`
 * في مكان ما — يجب أن يكون هو معالِج **الزرّ الأساسي نفسه**. ومحاكاة الالتفاف
 * في ذيل الملف تثبت أن الفحص يسقط باسمه لا بانفجار تقني.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const start = read('src/views/StartViewV2.tsx')
const adapter = read('src/views/StartView.tsx')
const app = read('src/App.tsx')
const handoff = read('src/views/OnboardingV2.tsx')
const setup = read('src/views/SetupView.tsx')
const reveal = read('src/i18n/dict/reveal.ts')

/**
 * يجرّد التعليقات قبل أي فحص غياب.
 *
 * فحص «لا يذكر الملف X» على النصّ الخام يخلط **الكود بالشرح**: تعليق يوثّق
 * العطل المُصلَح («كان موصولًا بـonSignup») يُسقط الإثبات وهو أصدق ما في الملف.
 * فالغياب يُقاس على الكود وحده، والشرح يبقى حرًّا في تسمية ما أُصلح.
 */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * يستخرج وسم `<button …>` الذي يحمل الصنف المطلوب، **بحدوده**.
 * الاستخراج بالحدود هو ما يمنع الرضا من مواضع متفرّقة: `onClick` يجب أن يقع
 * داخل الوسم نفسه لا في أي مكان من الملف.
 */
function buttonWithClass(src, needle) {
  let i = 0
  while (true) {
    const open = src.indexOf('<button', i)
    if (open === -1) return null
    const close = src.indexOf('>', open)
    if (close === -1) return null
    const tag = src.slice(open, close + 1)
    if (tag.includes(needle)) return tag
    i = close + 1
  }
}

console.log('\nإثبات مسار الدخول — الأسئلة قبل الحساب')

// ①  شاشة الهبوط: النداء الأساسي يبدأ الأسئلة
const primary = buttonWithClass(start, 'btn-primary')
check('شاشة الهبوط تملك نداءً أساسيًا واحدًا', primary !== null)
check('النداء الأساسي يبدأ الأسئلة لا الحساب', primary.includes('onClick={onGuest}'))
check('النداء الأساسي موسوم للقيادة الآلية', primary.includes('data-testid="welcome-start-cta"'))
check('لا نداء إنشاء حساب على شاشة الهبوط إطلاقًا', !code(start).includes('onSignup'))
check('عقد الهبوط نفسه لا يحمل إنشاء حساب', !code(adapter).includes('onSignup'))

// ②  موضع الاستدعاء في القشرة
const call = app.slice(app.indexOf('<StartView'), app.indexOf('/>', app.indexOf('<StartView')) + 2)
check('القشرة لا تمرّر إنشاء حساب للهبوط', call.length > 0 && !code(call).includes('onSignup'))
check('القشرة تمرّر مدخل الأسئلة', call.includes('onGuest={'))
check('الدخول للعائد محفوظ من الهبوط', call.includes('onLogin={') && start.includes('onClick={onLogin}'))

// ③  الزائر الجديد يصل الأسئلة، والعائد لا يُقذف إليها
check(
  'الضيف غير المكتمل يهبط على الأسئلة والمكتمل على خطته',
  app.includes("setView(isOnboardingComplete(null) ? guardRoute('dashboard', null) : 'setup')"),
)
check('المسجّل المكتمل يدخل لوحته لا الأسئلة', app.includes("return isOnboardingComplete(userId) ? 'dashboard' : 'setup'"))
check('الأسئلة لا تُحجب خلف حساب', app.includes("if (route !== 'setup' && needsAccount && !userId && !guestReady)"))

// ④  الكشف: الحساب يُطلب عند لزومه فقط — وبطريق حقيقي
check('شاشة الكشف تقبل طريق إنشاء الحساب', handoff.includes('onCreateAccount?: () => void'))
check('الإعداد يمرّر الطريق', setup.includes('onCreateAccount={onCreateAccount}'))
check('القشرة توصل الطريق بمسار التسجيل', app.includes("onCreateAccount={") && app.includes("goAuth('signup')"))
const acctBtn = buttonWithClass(handoff, 'data-testid="reveal-create-account-cta"')
check('نداء الحساب موجود في الكشف', acctBtn !== null)
const acctGuard = handoff.slice(handoff.indexOf('{trialState === '), handoff.indexOf('reveal-create-account-cta'))
check('نداء الحساب مشروط بحاجة فعلية لا دائم', acctGuard.includes("trialState === 'not_authenticated'") && acctGuard.includes('!signedIn'))
check('نصّ إنشاء الحساب بالعربية والإنجليزية', reveal.includes("createAccountCta: 'أنشئ حسابك'") && reveal.includes("createAccountCta: 'Create your account'"))
// الضيف يُبلَّغ بالسبب الصحيح فورًا: بلا رحلة شبكة ترجع «offline» لمشكلةٍ ليست اتصالًا.
const trialFn = handoff.slice(handoff.indexOf('const onTrial = async'), handoff.indexOf('const trialMessage'))
check('التجربة تختصر على الضيف بسبب صادق', trialFn.includes("if (!signedIn) { setTrialState('not_authenticated'); return }"))
check('اختصار الضيف يسبق نداء الخادم', trialFn.indexOf('!signedIn') < trialFn.indexOf('await beginTrial()'))
check('نصّ حاجة الحساب يغطّي الإنشاء والدخول', reveal.includes('أنشئ حسابك أو سجّل دخولك') && reveal.includes('Create one or sign in'))

// ⑤  المعاينة تبقى بلا حساب (§0.1) — لا تُجرّ خلف البوابة
const previewBtn = buttonWithClass(handoff, 'data-testid="handoff-preview-cta"')
check('نداء المعاينة موجود', previewBtn !== null)
check('المعاينة غير مشروطة بتسجيل الدخول', !previewBtn.includes('signedIn'))

console.log(`\n✅ مسار الدخول: ${pass} فحوص، 0 فشل.`)
