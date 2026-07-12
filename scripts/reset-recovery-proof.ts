// إثبات وحدة لمنطق حالة استعادة كلمة المرور (دوال خالصة، بلا متصفح/شبكة/Supabase).
// يغطّي: استخراج مؤشّرات الاستعادة من أشكال العناوين المختلفة (PKCE/implicit/hash router/
// deep link)، قرار التوجيه من مصدر الحقيقة (حدث/مؤشّر)، وقرار طور الشاشة.

import {
  parseRecoveryParams,
  isRecoveryUrl,
  implicitTokens,
  shouldRouteToRecovery,
  decideResetPhase,
  safeDecode,
  RECOVERY_TYPE,
} from '@/lib/recoveryState'

let pass = 0
let fail = 0
function check(label: string, cond: boolean): void {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

// رموز وهمية للاختبار فقط (ليست أسرارًا) — طويلة كفاية لتشبه الشكل الحقيقي.
const AT = 'aaaa.bbbb.cccc'
const RT = 'refresh-xyz-123'
const CODE = 'pkce-code-4827'

console.log('① استخراج PKCE (?code=) — الرمز في query')
{
  const p = parseRecoveryParams(`https://qimmah.app/?code=${CODE}`)
  check('code مُستخرَج', p.code === CODE)
  check('لا رموز implicit', p.accessToken === null && p.refreshToken === null)
  check('hasRecovery = true (PKCE)', p.hasRecovery === true)
}

console.log('② التدفّق الضمني (#access_token…&refresh_token…&type=recovery)')
{
  const p = parseRecoveryParams(`https://qimmah.app/#access_token=${AT}&refresh_token=${RT}&type=recovery`)
  check('access_token مُستخرَج', p.accessToken === AT)
  check('refresh_token مُستخرَج', p.refreshToken === RT)
  check('type = recovery', p.type === RECOVERY_TYPE)
  check('hasRecovery = true (implicit)', p.hasRecovery === true)
  const tok = implicitTokens(p)
  check('implicitTokens يعيد الزوج', tok?.access_token === AT && tok?.refresh_token === RT)
}

console.log('③ hash router: الرمز داخل مسار التوجيه (#/reset?code=…)')
{
  const p = parseRecoveryParams(`https://qimmah.app/#/reset?code=${CODE}`)
  check('code مُستخرَج رغم #/reset', p.code === CODE)
  check('hasRecovery = true', p.hasRecovery === true)
}

console.log('④ hash router + fragment ضمني ثانٍ (#/reset#access_token=…&refresh_token=…)')
{
  const p = parseRecoveryParams(`https://qimmah.app/#/reset#access_token=${AT}&refresh_token=${RT}`)
  check('access_token مُستخرَج من fragment ثانٍ', p.accessToken === AT)
  check('refresh_token مُستخرَج', p.refreshToken === RT)
  check('hasRecovery = true', p.hasRecovery === true)
}

console.log('⑤ رابط عميق بمخطّط مخصّص (com.qimmah.mobile://reset?code=…) — سياق iOS')
{
  const p = parseRecoveryParams(`com.qimmah.mobile://reset?code=${CODE}`)
  check('code مُستخرَج من مخطّط مخصّص', p.code === CODE)
  check('hasRecovery = true', p.hasRecovery === true)
}

console.log('⑥ عناوين بلا استعادة → hasRecovery = false')
{
  check('جذر بلا معاملات', isRecoveryUrl('https://qimmah.app/') === false)
  check('#/dashboard عادي', isRecoveryUrl('https://qimmah.app/#/dashboard') === false)
  check('null', isRecoveryUrl(null) === false)
  check('فارغ', isRecoveryUrl('') === false)
  check('type=signup ليس recovery', parseRecoveryParams('https://qimmah.app/#type=signup').hasRecovery === false)
  // access_token وحده بلا refresh_token ليس زوجًا صالحًا للتدفّق الضمني.
  check('access_token وحده (بلا refresh) ليس استعادة', parseRecoveryParams(`https://qimmah.app/#access_token=${AT}`).hasRecovery === false)
}

console.log('⑦ فكّ ترميز آمن — ترميز percent مشوّه لا يرمي (يعيد null بدل تعليق الشاشة)')
{
  check('%zz مشوّه → null', safeDecode('%zz') === null)
  check('ترميز صالح يُفكّ', safeDecode('a%20b') === 'a b')
  // رمز مشوّه داخل عنوان → لا يُلتقط كرمز صالح (null) فلا استعادة زائفة.
  const p = parseRecoveryParams('https://qimmah.app/?code=%zz')
  check('code مشوّه → null', p.code === null)
  check('hasRecovery = false مع رمز مشوّه', p.hasRecovery === false)
}

console.log('⑧ قرار التوجيه — مصدر الحقيقة (حدث PASSWORD_RECOVERY أو مؤشّر عنوان)')
{
  check('حدث PASSWORD_RECOVERY → route', shouldRouteToRecovery({ event: 'PASSWORD_RECOVERY' }) === true)
  check('مؤشّر عنوان بلا حدث → route', shouldRouteToRecovery({ hasRecoveryParam: true }) === true)
  check('حدث آخر بلا مؤشّر → لا route', shouldRouteToRecovery({ event: 'SIGNED_IN', hasRecoveryParam: false }) === false)
  check('لا حدث ولا مؤشّر → لا route', shouldRouteToRecovery({}) === false)
}

console.log('⑨ قرار طور الشاشة (checking / ready / expired)')
{
  check('جلسة حاضرة → ready', decideResetPhase({ hasSession: true, hasRecoveryIndicator: true, exchangeResolved: false }) === 'ready')
  check('لا جلسة + مؤشّر + لم يُحسم → checking', decideResetPhase({ hasSession: false, hasRecoveryIndicator: true, exchangeResolved: false }) === 'checking')
  check('لا جلسة + مؤشّر + حُسم فشلًا → expired', decideResetPhase({ hasSession: false, hasRecoveryIndicator: true, exchangeResolved: true }) === 'expired')
  check('لا جلسة + لا مؤشّر → expired فورًا', decideResetPhase({ hasSession: false, hasRecoveryIndicator: false, exchangeResolved: false }) === 'expired')
}

console.log('\n────────────────────────────────────────────')
if (fail === 0) {
  console.log(`✅ كل الفحوص نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail} فحصًا.`)
  // رمز خروج غير صفري كي تفشل بوّابة الـ CI.
  const proc = (globalThis as { process?: { exitCode?: number } }).process
  if (proc) proc.exitCode = 1
}
