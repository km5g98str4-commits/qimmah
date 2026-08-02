// فحوصات قبل-الطيران (offline): تعمل الآن بلا Docker/GoTrue/شبكة.
// تختبر حواجز الإنتاج والمولّدات ومحلّل رابط Inbucket، وتفحص صحّة السكربتات، وتبلّغ
// عن توفّر الأدوات. تفشل (exit 1) إن سقط أي تأكيد منطقي.

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  PROD_SUPABASE_REF,
  E2E_EMAIL_DOMAIN,
  assertLocalTarget,
  assertTestEmail,
  randomTestEmail,
  randomPassword,
  mailboxOf,
  pickRecoveryLink,
} from './lib.mjs'

let pass = 0
let fail = 0
function ok(name, cond) {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name}`)
  }
}
function throws(name, fn) {
  let threw = false
  try {
    fn()
  } catch {
    threw = true
  }
  ok(name, threw)
}

console.log('\n== 1) حواجز الإنتاج (production guards) ==')
// مفتاح إنتاج مُصطنع: ref = PROD_SUPABASE_REF داخل حمولة JWT.
const prodJwt =
  'x.' + Buffer.from(JSON.stringify({ ref: PROD_SUPABASE_REF, role: 'anon' })).toString('base64url') + '.y'
const localJwt = 'x.' + Buffer.from(JSON.stringify({ ref: 'localdev', role: 'anon' })).toString('base64url') + '.y'
throws('يرفض رابط الإنتاج (supabase.co)', () => assertLocalTarget('https://x.supabase.co', localJwt))
throws('يرفض رابطًا غير محلي (https خارجي)', () => assertLocalTarget('https://example.com', localJwt))
throws('يرفض مفتاحًا يعود لمشروع الإنتاج', () => assertLocalTarget('http://127.0.0.1:54321', prodJwt))
ok('يقبل هدفًا محليًا صالحًا', assertLocalTarget('http://127.0.0.1:54321', localJwt) === true)
ok('يقبل localhost', assertLocalTarget('http://localhost:54321', localJwt) === true)

console.log('\n== 2) حاجز بريد الاختبار ==')
throws('يرفض بريدًا حقيقيًا (@gmail.com)', () => assertTestEmail('real@gmail.com'))
throws('يرفض بريدًا على نطاق قريب', () => assertTestEmail('x@qimmah.app'))
ok('يقبل بريد نطاق الاختبار', assertTestEmail(`a@${E2E_EMAIL_DOMAIN}`) === true)

console.log('\n== 3) المولّدات ==')
const em = randomTestEmail(3)
ok('بريد الاختبار على النطاق الصحيح', em.endsWith('@' + E2E_EMAIL_DOMAIN))
ok('بريدان متتاليان مختلفان', randomTestEmail(1) !== randomTestEmail(1))
ok('mailboxOf يستخرج الجزء المحلي', mailboxOf('e2e-9-abcd@' + E2E_EMAIL_DOMAIN) === 'e2e-9-abcd')
// كلمة المرور تجتاز سياسة التطبيق: ٨+ أحرف + حرف + رقم (مطابقة passwordPolicy.ts).
const pw = randomPassword()
const policyOk = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
ok('كلمة المرور المولّدة تجتاز السياسة (٨+ / حرف / رقم)', policyOk)

console.log('\n== 4) محلّل رابط الاستعادة (Inbucket body) ==')
// نتحقّق من منطق الالتقاط نفسه المستخدم في fetchRecoveryLink (regex + تفضيل verify).
function pickLink(body) {
  const m = body.match(/https?:\/\/[^\s"'<>]+/g) || []
  return m.find((u) => /verify|recover|token|code=/.test(u)) || m[0] || null
}
const sampleHtml =
  '<p>مرحبًا</p><a href="http://127.0.0.1:54321/auth/v1/verify?token=REDACTED&type=recovery&redirect_to=http://127.0.0.1:4321/%23/reset">اضغط</a>'
ok('يلتقط رابط verify من HTML', (pickLink(sampleHtml) || '').includes('/auth/v1/verify'))
// فكّ ترميز HTML: يجب ألّا يبقى «&amp;» في الرابط الملتقَط (وإلا 400 من GoTrue).
ok('يفكّ &amp; في رابط verify', !pickRecoveryLink('http://127.0.0.1:54321/auth/v1/verify?token=T&amp;type=recovery').includes('&amp;'))
ok('يفضّل رابط الاستعادة على روابط أخرى', pickLink('http://a.b/x http://127.0.0.1/auth/v1/verify?token=t') === 'http://127.0.0.1/auth/v1/verify?token=t')
ok('يعيد null بلا روابط', pickLink('لا روابط هنا') === null)

console.log('\n== 5) صحّة السكربتات (node --check) ==')
for (const f of ['lib.mjs', 'preflight.mjs', 'run.mjs']) {
  const p = `scripts/e2e-auth/${f}`
  if (!existsSync(p)) {
    ok(`${f} موجود`, false)
    continue
  }
  let good = true
  try {
    execSync(`node --check ${p}`, { stdio: 'pipe' })
  } catch {
    good = false
  }
  ok(`${f} يمرّ node --check`, good)
}

console.log('\n== 6) توفّر الأدوات (إعلامي فقط — لا يُفشِل) ==')
const tool = (cmd) => {
  try {
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}
const dockerUp = tool('docker info')
const supabaseCli = tool('npx --yes supabase --version')
const psqlPresent = tool('which psql')
console.log(`  docker daemon: ${dockerUp ? 'يعمل' : 'متوقّف/غير متاح'}`)
console.log(`  supabase CLI : ${supabaseCli ? 'متاح' : 'غير متاح (سيُثبّت عند التشغيل)'}`)
console.log(`  psql client  : ${psqlPresent ? 'متاح' : 'غير متاح'}`)
console.log(
  `  → التشغيل الكامل (test:e2e:auth) يتطلّب: docker daemon + سحب صور Supabase. ` +
    `${dockerUp ? '' : '(daemon متوقّف) '}الصور تحتاج CDN صور Docker مفتوحًا في سياسة الشبكة.`,
)

console.log(`\n== النتيجة: ${pass} PASS · ${fail} FAIL ==`)
process.exit(fail === 0 ? 0 : 1)
