// إثبات اكتشاف تسجيل الدخول — [AUTH-DISCOVERABILITY-001]
//
// الواقعة: ضيف يصل إلى تفعيل Premium فتقول له بوّابة Premium «سجّل دخولك أول»
// **بلا زرّ ولا مسار ظاهر**، و«التقدّم» لا يقول له أصلًا إنه غير مسجَّل. رسالة
// تصف بابًا ولا تفتحه.
//
// ما يحرسه هذا الفحص بنيويًا (والرحلة الحقيقية في scripts/e2e/auth-discoverability.mjs):
//   ١) «التقدّم» يركّب بطاقة حالة الحساب في رحلة «خطواتك» ويستقبل `onSignIn`.
//   ٢) البطاقة تعطي «تسجيل الدخول» للضيف و«تسجيل الخروج» (بتأكيد) للمسجَّل —
//      بنفس نصوص الحساب المعتمدة، لا نصوص صلبة.
//   ٣) بوّابة Premium تعرض زرّ دخول **مقترنًا** بحالة `not_authenticated` — لا
//      نصًّا وحده — على مسارَي الكود والتجربة.
//   ٤) الدخول من داخل التطبيق يعود إلى المسار الأصلي، ولا يعود إلى شاشات
//      الدخول/البداية/الإعداد أبدًا.
//   ٥) كل نصّ جديد في القاموس بالعربية والإنجليزية معًا.
//   ٦) لا تغيير في التفويض: لا أثر لدور المؤسس في أي ملف مسّته الموجة.

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
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

console.log('\nإثبات اكتشاف تسجيل الدخول — التقدّم · بوّابة Premium · العودة')

const progress = stripComments(read('src/views/ProgressV2.tsx'))
const progressView = stripComments(read('src/views/ProgressView.tsx'))
const card = stripComments(read('src/components/AccountStateCard.tsx'))
const gate = stripComments(read('src/components/PremiumGate.tsx'))
const app = stripComments(read('src/App.tsx'))
const dict = read('src/i18n/dict/accountState.ts')
const access = read('src/i18n/dict/access.ts')
const strings = read('src/config/strings.ts')

// ——— ١) التقدّم: البطاقة بعد بطاقة «خطواتك» مباشرة، بمدخل الدخول ———
{
  const steps = progress.indexOf("go('steps')")
  const cardAt = progress.indexOf('<AccountStateCard')
  check('ProgressV2 يستورد بطاقة حالة الحساب', /import \{ AccountStateCard \} from '@\/components\/AccountStateCard'/.test(progress))
  check('البطاقة تُركَّب بعد بطاقة «خطواتك» في نفس الشاشة', steps > 0 && cardAt > steps)
  check('البطاقة تستقبل onSignIn من التقدّم', /<AccountStateCard[^>]*onSignIn=\{onSignIn\}/.test(progress))
  check('البطاقة تفتح صفحة العضوية (حيث كود التفعيل)', /<AccountStateCard[^>]*onOpenMembership=\{\(\) => go\('premium'\)\}/.test(progress))
  check('ProgressView يمرّر onSignIn', /onSignIn\?: \(\) => void/.test(progressView))
  check('App يمرّر onSignIn إلى التقدّم من مسار progress', /<V\.ProgressView[^>]*onSignIn=\{\(\) => goAuthFrom\('progress', 'login'\)\}/.test(app))
}

// ——— ٢) البطاقة: فعل واحد لكل حالة، بنصوص الحساب المعتمدة ———
{
  check('الضيف يرى زرّ تسجيل الدخول (نصّ auth.login المعتمد)', /data-testid="account-state-sign-in"[\s\S]{0,200}\{t\.auth\.login\}/.test(card))
  check('المسجَّل يرى زرّ تسجيل الخروج (نصّ auth.logout المعتمد)', /data-testid="account-state-sign-out"[\s\S]{0,200}\{t\.auth\.logout\}/.test(card))
  check('الخروج مقترن بتأكيد صريح قبل signOut', /window\.confirm\(t\.auth\.logoutConfirm\)\) void auth\.signOut\(\)/.test(card))
  check('لا نصّ عربي صلب في البطاقة', !/[؀-ۿ]/.test(card.replace(/\/\/.*$/gm, '')))
  check('حالة الدخول تُقرأ من useAuth لا من التخزين', /useAuth\(\)/.test(card) && !/localStorage/.test(card))
  // ⚔️ محاكاة الالتفاف: بطاقة بلا زرّ دخول (نصّ فقط) يجب أن تسقط بفحصها المسمّى.
  const textOnly = card.replace(/<button[\s\S]*?data-testid="account-state-sign-in"[\s\S]*?<\/button>/, '')
  check('⚔️ محاكاة: نزع زرّ الدخول من البطاقة يُكتشف', !/data-testid="account-state-sign-in"/.test(textOnly))
}

// ——— ٣) بوّابة Premium: الزرّ مقترن بالحالة لا بالنصّ ———
{
  check('بوّابة Premium تقبل onSignIn', /export function PremiumGate\(\{ lang, onSignIn \}/.test(gate))
  check('زرّ الدخول يظهر عند not_authenticated على مسار الكود', /state === 'not_authenticated' && onSignIn \? \([\s\S]{0,300}data-testid="premium-gate-sign-in"/.test(gate))
  check('زرّ الدخول يظهر عند not_authenticated على مسار التجربة', /trialState === 'not_authenticated' && onSignIn \? \([\s\S]{0,300}data-testid="premium-gate-trial-sign-in"/.test(gate))
  check('App يمرّر onSignIn إلى طبقة البوّابة من المسار الحالي', /<PremiumGateLayer[^>]*onSignIn=\{\(\) => goAuthFrom\(view, 'login'\)\}/.test(app))
  // ⚔️ محاكاة الالتفاف: زرّ يظهر دائمًا (بلا اقتران بالحالة) لا يُرضي الفحص.
  const always = gate.replace("state === 'not_authenticated' && onSignIn ? (", 'onSignIn ? (')
  check('⚔️ محاكاة: فكّ اقتران الزرّ بحالة not_authenticated يُكتشف', !/state === 'not_authenticated' && onSignIn \? \([\s\S]{0,300}data-testid="premium-gate-sign-in"/.test(always))
}

// ——— ٤) العودة بعد الدخول: إلى المصدر، لا إلى شاشات الدخول ———
{
  check('goAuthFrom يحفظ المسار الأصلي ويستهلكه enterApp', /authReturnRef\.current = isAuthReturnTarget\(from\) \? from : null/.test(app) && /const back = authReturnRef\.current\s+authReturnRef\.current = null\s+if \(onboarded\) setView\(back \? guardRoute\(back, signedInId\) : 'dashboard'\)/.test(app))
  const m = app.match(/function isAuthReturnTarget\(route: AppRoute\): boolean \{\s*return !\[([^\]]+)\]\.includes\(route\)/)
  check('isAuthReturnTarget يستثني شاشات الدخول والبداية والإعداد', !!m && ['start', 'login', 'signup', 'forgot', 'reset', 'setup', 'accountRequired', 'notfound'].every((r) => m[1].includes(`'${r}'`)))
  check('العودة تمرّ بالحارس (guardRoute) لا مباشرة', /setView\(back \? guardRoute\(back, signedInId\)/.test(app))
  check('زرّ الرجوع من شاشة الدخول يعود إلى المصدر أيضًا', /onBack=\{\(\) => \{\s*const back = authReturnRef\.current\s+authReturnRef\.current = null\s+setView\(back \? guardRoute\(back, uid\) : 'start'\)/.test(app))
  check('الإعدادات تستعمل نفس مسار العودة', /onLogin=\{\(\) => goAuthFrom\('settings', 'login'\)\}/.test(app))
}

// ——— ٥) القاموس: عربي وإنجليزي معًا ———
{
  const keys = ['title', 'guestTitle', 'guestBody', 'signedInTitle', 'signedInBody', 'membership']
  for (const lang of ['ar', 'en']) {
    const block = dict.split(`${lang}: {`)[1]?.split('},')[0] ?? ''
    check(`accountState.${lang} يحمل المفاتيح الستّة`, keys.every((k) => new RegExp(`\\b${k}: `).test(block)))
  }
  check('access.signInCta بالعربية والإنجليزية', (access.match(/signInCta: '/g) ?? []).length === 2)
  check('auth.logoutConfirm بالعربية والإنجليزية', (strings.match(/logoutConfirm: ['"]/g) ?? []).length === 2)
  check('لا لفظ ممنوع في نصوص Premium الجديدة', !/lifetime|مدى الحياة/i.test(dict))
}

// ——— ٦) مصادقة لا تفويض ———
{
  for (const f of ['src/components/AccountStateCard.tsx', 'src/views/ProgressV2.tsx', 'src/components/PremiumGate.tsx']) {
    // (لافتة QA في بوّابة Premium تحمل لفظ founder منذ [FOUNDER-QA] — وهي نصّ وقت البناء لا قراءة دور.)
    check(`${f} لا يقرأ الدور ولا يفتح لوحة الإدارة`, !/qimmah_role|app_metadata|require_founder|go\('admin'\)|setView\('admin'\)/.test(stripComments(read(f))))
  }
}

console.log(`\n✅ اكتشاف تسجيل الدخول: ${pass} فحصًا، 0 فشل.`)
