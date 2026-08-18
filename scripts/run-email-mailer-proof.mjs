// ============================================================================
// test:email-mailer — إثبات المُرسِل: منع تكرار · إعادة · صندوق ميت · سجلّ نظيف.
// ============================================================================
// الزمن والتخزين والمزوّد والمُسجِّل كلها محقونة، فيُقاس السلوك الزمني كاملًا
// بلا انتظار ثانية. وكل حارس مقرون بتأكيد مضادّ يسقط **باسم** الفحص (§4.2).
//
// التشغيل: npm run test:email-mailer
// ============================================================================
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  createMailer, createMemoryStore, delayFor, DEFAULT_POLICY,
  NON_QUEUEABLE_TOKENS, assertQueueableData,
} from '../supabase/functions/_shared/email/outbox.mjs'
import {
  createBlockedProvider, createDryRunProvider, createHttpProvider,
  resolveProvider, classifyHttpStatus, REASONS,
} from '../supabase/functions/_shared/email/provider.mjs'
import {
  createSafeLogger, safeLogFields, findSecretLeak, recipientDomain, LOGGABLE_FIELDS,
} from '../supabase/functions/_shared/email/redact.mjs'
import { authorizeCall, constantTimeEqual } from '../supabase/functions/_shared/email/auth.mjs'
import { readMailerPolicy, parseSendRequest, httpStatusFor } from '../supabase/functions/qimmah-mailer/contract.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHARED = join(ROOT, 'supabase/functions/_shared/email')
const FN = join(ROOT, 'supabase/functions/qimmah-mailer')

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
async function mustFail(name, fn, expect) {
  try { await fn(); return check(name, false, 'لم يُرفع أي استثناء') }
  catch (e) {
    const m = String(e.message || e)
    // §4.2: سقوط باستثناء تقني ليس إثباتًا — لا بدّ أن يسقط باسمه.
    return check(name, m.includes(expect), m.split('\n')[0].slice(0, 100))
  }
}

const SUPPORT = 'qimmah.support@gmail.com'
const INVITE = 'https://example.com/invite/minted-abc123'
const CODE = 'SECRET-CODE-XYZ99'

/** بيئة اختبار: ساعة يدوية + مُسجِّل يلتقط + سكّاك يعدّ نداءاته. */
function harness({ provider, policy = DEFAULT_POLICY } = {}) {
  let t = 1_000_000
  const lines = []
  const minted = { calls: 0 }
  const store = createMemoryStore()
  const mailer = createMailer({
    store,
    provider: provider ?? createDryRunProvider(),
    clock: () => t,
    log: createSafeLogger((l) => lines.push(l)),
    policy,
    resolveLateTokens: async (names) => {
      minted.calls++
      return Object.fromEntries(names.map((n) => [n, INVITE]))
    },
  })
  return { mailer, store, lines, minted, advance: (ms) => { t += ms }, at: () => t }
}

const PREMIUM = (key = 'premium_purchase:salla:ORD-1029') => ({
  idempotencyKey: key, templateId: 'premium_purchase', lang: 'ar',
  to: 'buyer@example.com',
  data: { orderRef: 'ORD-1029', recipientEmail: 'buyer@example.com', supportEmail: SUPPORT },
})

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ١) منع التكرار — إعادة سلة الثلاثية لا تُنتج ثلاث رسائل\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const p = createDryRunProvider()
  const h = harness({ provider: p })
  const a = await h.mailer.enqueue(PREMIUM())
  const b = await h.mailer.enqueue(PREMIUM())
  const c = await h.mailer.enqueue(PREMIUM())
  check('أول إدراج queued والتاليان duplicate',
    a.outcome === 'queued' && b.outcome === 'duplicate' && c.outcome === 'duplicate',
    `${a.outcome}/${b.outcome}/${c.outcome}`)
  await h.mailer.runDue()
  check('ثلاثة إدراجات ⇒ إرسال واحد فقط', p.sent.length === 1, `${p.sent.length}`)
  await h.mailer.runDue()
  check('تصريفٌ ثانٍ بعد النجاح لا يُرسل شيئًا', p.sent.length === 1, `${p.sent.length}`)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٢) الإعادة بتراجع أسّي، ثم الصندوق الميت\n')
// ════════════════════════════════════════════════════════════════════════════
check('التراجع 1s → 4s → 16s → 64s وسقفه ١٥ دقيقة',
  [1, 2, 3, 4, 9].map((n) => delayFor(n)).join(',') === '1000,4000,16000,64000,900000')

{
  let calls = 0
  const flaky = { name: 'flaky', async send() {
    calls++
    return calls <= 2 ? { ok: false, retryable: true, reason: REASONS.serverError } : { ok: true, id: 'x' }
  } }
  const h = harness({ provider: flaky })
  await h.mailer.enqueue(PREMIUM())
  let o = await h.mailer.runDue()
  check('المحاولة ١ تفشل فتُجدوَل بعد 1000ms',
    o[0].outcome === 'retry' && o[0].wait === 1000, JSON.stringify(o[0]))
  check('لا شيء مستحقّ قبل انقضاء المهلة', (await h.mailer.runDue()).length === 0)
  h.advance(1000)
  o = await h.mailer.runDue()
  check('المحاولة ٢ تفشل فتُجدوَل بعد 4000ms',
    o[0].outcome === 'retry' && o[0].wait === 4000, JSON.stringify(o[0]))
  h.advance(4000)
  o = await h.mailer.runDue()
  check('المحاولة ٣ تنجح', o[0].outcome === 'sent' && o[0].attempt === 3, JSON.stringify(o[0]))
  check('المزوّد نُودي ثلاث مرّات بالضبط', calls === 3, `${calls}`)
  const row = await h.store.get('premium_purchase:salla:ORD-1029')
  check('بعد النجاح: الحمولة والمستلم يُفرَّغان', row.data === null && row.to === null)
  check('وحالة الصفّ sent', row.state === 'sent')
}

{
  const always = { name: 'always-500', async send() { return { ok: false, retryable: true, reason: REASONS.serverError } } }
  const h = harness({ provider: always })
  await h.mailer.enqueue(PREMIUM())
  let last
  for (let i = 0; i < 6; i++) { const o = await h.mailer.runDue(); if (o.length) last = o[0]; h.advance(delayFor(i + 1)) }
  check('بعد استنفاد المحاولات ⇒ صندوق ميت',
    last.outcome === 'dead' && last.attempt === DEFAULT_POLICY.maxAttempts, JSON.stringify(last))
  const row = await h.store.get('premium_purchase:salla:ORD-1029')
  check('الميت **يحتفظ** بحمولته كي يُعاد تشغيله بيد إنسان',
    row.state === 'dead' && row.data !== null && row.to !== null)
  check('وسبب الموت مسجَّل باسمه', row.lastReason === REASONS.serverError, row.lastReason)
}

{
  let calls = 0
  const rejecting = { name: 'reject', async send() { calls++; return { ok: false, retryable: false, reason: REASONS.rejected } } }
  const h = harness({ provider: rejecting })
  await h.mailer.enqueue(PREMIUM())
  const o = await h.mailer.runDue()
  check('رفض دائم ⇒ صندوق ميت من أول محاولة بلا إعادة',
    o[0].outcome === 'dead' && o[0].attempt === 1 && calls === 1, JSON.stringify(o[0]))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٣) المزوّد الخارجي المحجوب — حالة معلَنة لا نقص مُخفى\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ provider: createBlockedProvider() })
  await h.mailer.enqueue(PREMIUM())
  const o = await h.mailer.runDue()
  check('بلا مزوّد مهيّأ: الرسالة تموت بسبب EMAIL_PROVIDER_EXTERNAL',
    o[0].outcome === 'dead' && o[0].reason === 'EMAIL_PROVIDER_EXTERNAL', JSON.stringify(o[0]))
  check('ولا يُعاد المحاولة على حاجز خارجي', o[0].attempt === 1)
}
check('بيئة بلا EMAIL_PROVIDER_KIND ⇒ المزوّد blocked', resolveProvider({}).name === 'blocked')
check('EMAIL_PROVIDER_KIND=dryrun ⇒ مزوّد جاف', resolveProvider({ EMAIL_PROVIDER_KIND: 'dryrun' }).name === 'dryrun')

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٤) مِهاد المزوّد — الحقيقي يدخل بمتغيّرات بيئة فقط\n')
// ════════════════════════════════════════════════════════════════════════════
check('٤٢٩ و٥xx قابلة للإعادة، و٤xx غيرها رفض دائم',
  classifyHttpStatus(429).retryable === true && classifyHttpStatus(503).retryable === true
  && classifyHttpStatus(422).retryable === false && classifyHttpStatus(200).ok === true)
{
  const seen = []
  const fakeFetch = async (url, init) => { seen.push({ url, init }); return { status: 200 } }
  const resend = createHttpProvider({ kind: 'resend', apiKey: 'K', from: 'no-reply@example.com' }, fakeFetch)
  await resend.send({ to: 'u@example.com', subject: 'S', html: '<p>H</p>', text: 'T' })
  const body = JSON.parse(seen[0].init.body)
  check('resend: نقطة النهاية والترويسة والحمولة بالشكل الصحيح',
    seen[0].url.includes('api.resend.com') && seen[0].init.headers.authorization === 'Bearer K'
    && body.to[0] === 'u@example.com' && body.html === '<p>H</p>')

  const postmark = createHttpProvider({ kind: 'postmark', apiKey: 'T0', from: 'no-reply@example.com' }, fakeFetch)
  await postmark.send({ to: 'u@example.com', subject: 'S', html: '<p>H</p>', text: 'T' })
  const pmBody = JSON.parse(seen[1].init.body)
  check('postmark: نفس الواجهة بشكل حمولة مختلف — الطابور لا يتغيّر',
    seen[1].init.headers['x-postmark-server-token'] === 'T0' && pmBody.HtmlBody === '<p>H</p>')
}
{
  const noKey = createHttpProvider({ kind: 'resend', from: 'a@b.co' }, async () => ({ status: 200 }))
  const r = await noKey.send({ to: 'u@example.com', subject: 'S', html: '', text: '' })
  check('مفتاح ناقص ⇒ misconfigured دائم لا إعادة',
    !r.ok && r.retryable === false && r.reason === REASONS.misconfigured, JSON.stringify(r))
  const boom = createHttpProvider({ kind: 'resend', apiKey: 'K', from: 'a@b.co' },
    async () => { throw new Error('getaddrinfo ENOTFOUND https://api.resend.com/emails?key=K') })
  const rn = await boom.send({ to: 'u@example.com', subject: 'S', html: '', text: '' })
  check('عطل شبكة ⇒ قابل للإعادة، **وبلا تمرير نصّ الخطأ** (قد يحمل الرابط)',
    rn.retryable === true && rn.reason === REASONS.network && !JSON.stringify(rn).includes('key=K'),
    JSON.stringify(rn))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٥) السرّ لا يبلغ سجلًّا ولا مخزنًا — الفحص ثم التأكيد المضادّ\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const p = createDryRunProvider()
  const h = harness({ provider: p })
  await h.mailer.enqueue(PREMIUM())
  await h.mailer.runDue()
  await h.mailer.sendNow({
    idempotencyKey: 'access_code:campaign:C-1', templateId: 'access_code', lang: 'ar',
    to: 'coach@example.com', data: { code: CODE, durationDays: '١٤ يومًا', supportEmail: SUPPORT },
  })
  check('الرسالتان وصلتا المزوّد فعلًا (وإلّا كان «لا تسريب» مجّانيًا)', p.sent.length === 2)
  check('وجسد رسالة الكود يحمل الكود فعلًا', p.sent[1].html.includes(CODE) && p.sent[1].text.includes(CODE))

  const leak = findSecretLeak(h.lines, [CODE, INVITE, 'buyer@example.com', 'coach@example.com',
    p.sent[0].html, p.sent[1].html, p.sent[0].text, p.sent[1].text])
  check('لا كود ولا رابط دعوة ولا بريد ولا جسد في أي سطر سجلّ',
    !leak.leaked, leak.leaked ? `${leak.secret} في ${leak.line.slice(0, 60)}` : `${h.lines.length} سطرًا`)
  check('والسجلّ ليس فارغًا — فيه أسطر فعلية تُفحص', h.lines.length >= 3, `${h.lines.length}`)
  check('نطاق المستلم وحده يُسجَّل (تشخيص بلا قائمة بريدية)',
    h.lines.some((l) => l.includes('"recipientDomain":"example.com"')))

  const rows = await h.store.all()
  const dump = JSON.stringify(rows)
  check('ولا سرّ في المخزن: لا كود ولا رابط دعوة ولا جسد',
    !dump.includes(CODE) && !dump.includes(INVITE) && !dump.includes('<html'), dump.slice(0, 80))
  const secretRow = rows.find((r) => r.templateId === 'access_code')
  check('صفّ الكود أثرٌ بلا حمولة ولا مستلم',
    secretRow.data === null && secretRow.to === null && secretRow.state === 'sent')
}
// التأكيد المضادّ: مُسجِّل ساذج يطبع كل شيء ⇒ الكاشف يجب أن يسقط **باسم السرّ**.
{
  const naive = []
  const p = createDryRunProvider()
  const store = createMemoryStore()
  const mailer = createMailer({
    store, provider: p, clock: () => 0,
    log: (event, fields) => naive.push(`${event} ${JSON.stringify(fields)}`),
    resolveLateTokens: async (n) => Object.fromEntries(n.map((x) => [x, INVITE])),
  })
  await mailer.sendNow({
    idempotencyKey: 'k', templateId: 'access_code', lang: 'ar', to: 'c@example.com',
    // مُسجِّل ساذج يطبع الحقول كما وصلته — نزرع سرًّا في حقل يمرّره.
    data: { code: CODE, durationDays: '١٤', supportEmail: SUPPORT },
  })
  naive.push(`leaky ${JSON.stringify({ code: CODE, html: p.sent[0].html })}`)
  const leak = findSecretLeak(naive, [CODE])
  check('مُسجِّل ساذج مزروع ⇒ الكاشف يسقط باسم السرّ المسرَّب',
    leak.leaked && leak.secret === CODE, leak.secret || 'لم يُلتقط')
}
// قائمة السماح تُسقط الحقل غير المُعلَن — وهذا هو الفرق عن قائمة المنع.
{
  const out = safeLogFields({ templateId: 'access_code', inviteLink: INVITE, html: '<p>x</p>', code: CODE, attempt: 2 })
  check('قائمة السماح تُمرّر المعلَن وتُسقط كل ما عداه',
    Object.keys(out).sort().join() === 'attempt,templateId', JSON.stringify(out))
  check('حقل جديد لم يُضَف للقائمة يسقط افتراضيًا (لا يتسرّب)',
    safeLogFields({ brandNewSecretField: 'oops' }).brandNewSecretField === undefined)
  check('«activationUrl» ليس في قائمة السماح إطلاقًا', !LOGGABLE_FIELDS.has('activationUrl'))
  check('الكائنات المتداخلة تسقط كاملة (طريق التهريب المعتاد)',
    safeLogFields({ event: 'x', reason: { nested: CODE } }).reason === undefined)
  check('نطاق البريد يُستخرج ولا يُبنى منه عنوان',
    recipientDomain('a.b+c@Mail.Example.COM') === 'mail.example.com')
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٦) الحدّ البنيوي: ما يُسكّ من جديد يُطابَر، وما لا يُسكّ يُمرَّر\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const h = harness()
  await mustFail('قالب حامل لسرّ يُرفض من الطابور باسمه',
    () => h.mailer.enqueue({ idempotencyKey: 'x1', templateId: 'access_code', lang: 'ar',
      to: 'a@example.com', data: { code: CODE, durationDays: '١٤', supportEmail: SUPPORT } }),
    'EMAIL_SECRET_TEMPLATE_NOT_QUEUEABLE:access_code')

  await mustFail('حمولة تحمل اسم رمز سرّي تُرفض ولو كان القالب عاديًا',
    () => h.mailer.enqueue({ ...PREMIUM('x2'), data: { ...PREMIUM().data, activationUrl: INVITE } }),
    'EMAIL_SECRET_IN_QUEUE:activationUrl')

  check('قائمة الرموز غير القابلة للمطابرة تشمل الرابط والكود وكلمة المرور',
    ['code', 'activationUrl', 'password'].every((n) => NON_QUEUEABLE_TOKENS.includes(n)))
  for (const n of NON_QUEUEABLE_TOKENS) {
    let caught = false
    try { assertQueueableData({ [n]: 'v' }) } catch (e) { caught = String(e.message).includes(`EMAIL_SECRET_IN_QUEUE:${n}`) }
    if (!caught) check(`الرمز ${n} يجب أن يُرفض`, false)
  }
  check(`كل الرموز الـ${NON_QUEUEABLE_TOKENS.length} تُرفض واحدًا واحدًا`, true)
}
{
  // السكّ المتأخّر: لا يُنادى عند الإدراج، ويُنادى عند كل تسليم.
  const h = harness()
  await h.mailer.enqueue(PREMIUM())
  check('السكّاك لم يُنادَ عند الإدراج — لا رابط يُخزَّن', h.minted.calls === 0)
  const rows1 = await h.store.all()
  check('ولا أثر للرابط في المخزن بعد الإدراج', !JSON.stringify(rows1).includes(INVITE))
  await h.mailer.runDue()
  check('السكّاك نُودي مرّة واحدة عند التسليم', h.minted.calls === 1)
}
{
  // بلا سكّاك مربوط: توقّف صاخب لا رسالة بزرٍّ ميت.
  const store = createMemoryStore()
  const mailer = createMailer({ store, provider: createDryRunProvider(), clock: () => 0, log: () => {} })
  await mailer.enqueue(PREMIUM())
  await mustFail('قالب يطلب رمزًا متأخّرًا بلا سكّاك ⇒ توقّف مسمّى',
    () => mailer.runDue(), 'EMAIL_NO_LATE_TOKEN_MINTER:activationUrl')
}
{
  // سكّاك يعيد فراغًا: لا تُرسَل رسالة بزرٍّ لا يقود إلى شيء.
  const store = createMemoryStore()
  const p = createDryRunProvider()
  const mailer = createMailer({ store, provider: p, clock: () => 0, log: () => {},
    resolveLateTokens: async () => ({}) })
  await mailer.enqueue(PREMIUM())
  await mustFail('سكّاك يعيد فراغًا ⇒ EMAIL_LATE_TOKEN_UNMINTED', () => mailer.runDue(),
    'EMAIL_LATE_TOKEN_UNMINTED:activationUrl')
  check('ولم تُرسَل أي رسالة ناقصة', p.sent.length === 0)
}
{
  // التمرير المباشر: تكراره لا يُرسل مرّتين، وموته يُعلن ضياع السرّ.
  const p = createDryRunProvider()
  const h = harness({ provider: p })
  const arg = { idempotencyKey: 'access_code:C-9', templateId: 'access_code', lang: 'en',
    to: 'coach@example.com', data: { code: CODE, durationDays: '14 days', supportEmail: SUPPORT } }
  const a = await h.mailer.sendNow(arg)
  const b = await h.mailer.sendNow(arg)
  check('تمرير مباشر مكرَّر ⇒ duplicate بإرسال واحد',
    a.outcome === 'sent' && b.outcome === 'duplicate' && p.sent.length === 1, `${a.outcome}/${b.outcome}`)

  const dead = harness({ provider: createBlockedProvider() })
  const d = await dead.mailer.sendNow({ ...arg, idempotencyKey: 'access_code:C-10' })
  check('فشل التمرير المباشر يُعلن أن السرّ غير قابل للاسترجاع',
    d.outcome === 'dead' && d.secretUnrecoverable === true, JSON.stringify(d))
  check('ويُسجَّل ذلك في السجلّ الآمن بلا كشف السرّ',
    dead.lines.some((l) => l.includes('secret_unrecoverable')) && !findSecretLeak(dead.lines, [CODE]).leaked)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٧) العقد — التهيئة والتفويض وقراءة الطلب\n')
// ════════════════════════════════════════════════════════════════════════════
const ENV = {
  EMAIL_FROM_ADDRESS: 'no-reply@example.com',
  EMAIL_SUPPORT_ADDRESS: SUPPORT,
  QIMMAH_MAILER_SECRET: 'S'.repeat(40),
}
const pol = readMailerPolicy(ENV)
check('تهيئة كاملة تُقبَل وتُشتقّ منها اللغة الافتراضية ar',
  pol.ok && pol.policy.defaultLang === 'ar')
for (const k of ['EMAIL_FROM_ADDRESS', 'EMAIL_SUPPORT_ADDRESS', 'QIMMAH_MAILER_SECRET']) {
  const bad = { ...ENV }; delete bad[k]
  check(`متغيّر ناقص (${k}) ⇒ توقّف مُعلَن باسمه`,
    readMailerPolicy(bad).ok === false && readMailerPolicy(bad).reason.includes(k))
}
check('سرّ قصير يُرفض (لا يُعامَل «التفويض معطّل»)',
  readMailerPolicy({ ...ENV, QIMMAH_MAILER_SECRET: 'short' }).ok === false)
check('لغة افتراضية مجهولة تُرفض', readMailerPolicy({ ...ENV, EMAIL_DEFAULT_LANG: 'fr' }).ok === false)

const hdr = (v) => ({ get: (k) => (k === 'authorization' ? v : null) })
check('تفويض صحيح يمرّ', authorizeCall(hdr(`Bearer ${'S'.repeat(40)}`), 'S'.repeat(40)).ok === true)
check('تفويض مفقود يُرفض باسمه', authorizeCall(hdr(null), 'S'.repeat(40)).reason === 'authorization_missing')
check('تفويض خاطئ يُرفض باسمه', authorizeCall(hdr('Bearer wrong'), 'S'.repeat(40)).reason === 'authorization_mismatch')
check('سرّ الخادم غائب ⇒ رفض لا فتح', authorizeCall(hdr('Bearer x'), '').reason === 'mailer_secret_missing')
check('سرّ الخادم قصير ⇒ رفض', authorizeCall(hdr('Bearer short'), 'short').reason === 'mailer_secret_missing')
check('المقارنة ثابتة الزمن صحيحة منطقيًا',
  constantTimeEqual('abc', 'abc') && !constantTimeEqual('abc', 'abd') && !constantTimeEqual('abc', 'abcd'))

const req = (o) => parseSendRequest(JSON.stringify(o), pol.policy)
check('طلب سليم يُقبَل، وعنوان الدعم يُحقَن من التهيئة لا من المستدعي', (() => {
  const r = req({ template: 'trial_started', lang: 'ar', to: 'u@example.com',
    idempotencyKey: 'trial:u-1', data: { trialEndsAt: 'الأحد ٩ م', supportEmail: 'evil@phish.example' } })
  return r.ok && r.request.data.supportEmail === SUPPORT
})())
check('قالب مجهول يُرفض', req({ template: 'nope', to: 'u@example.com', idempotencyKey: 'k12345' }).reason === 'unknown_template')
check('بريد غير صالح يُرفض', req({ template: 'trial_started', to: 'not-an-email', idempotencyKey: 'k12345', data: { trialEndsAt: 'x' } }).reason === 'bad_recipient')
check('مفتاح منع تكرار قصير يُرفض', req({ template: 'trial_started', to: 'u@example.com', idempotencyKey: 'ab', data: { trialEndsAt: 'x' } }).reason === 'bad_idempotency_key')
check('رمز ناقص يُرفض باسمه', req({ template: 'support_fallback', to: 'u@example.com', idempotencyKey: 'k12345', data: {} }).reason === 'missing_tokens:reference')
check('رابط دعوة مُمرَّر من الخارج يُرفض باسمه — لا نقبل بيانات اعتماد من غيرنا',
  req({ template: 'premium_purchase', to: 'u@example.com', idempotencyKey: 'k12345',
    data: { orderRef: 'O1', recipientEmail: 'u@example.com', activationUrl: 'https://evil.example/steal' } })
    .reason === 'late_token_not_accepted:activationUrl')
check('جسم غير JSON يُرفض', parseSendRequest('{oops', pol.policy).reason === 'not_json')
check('حالات HTTP: مصرَّح ٤٠١ · مشوَّه ٤٠٠ · مُدرَج ٢٠٠ · تهيئة ٥٠٠',
  httpStatusFor('unauthorized') === 401 && httpStatusFor('malformed') === 400
  && httpStatusFor('queued') === 200 && httpStatusFor('duplicate') === 200
  && httpStatusFor('misconfigured') === 500)

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٨) الحظر المطلق: لا توليد كلمة مرور في أي مصدر\n')
// ════════════════════════════════════════════════════════════════════════════
{
  const sources = []
  for (const d of [SHARED, FN]) {
    for (const f of readdirSync(d)) {
      if (/\.(mjs|ts)$/.test(f)) sources.push({ path: `${d.split('/').slice(-2).join('/')}/${f}`, code: readFileSync(join(d, f), 'utf8') })
    }
  }
  check('كل مصادر البريد مقروءة', sources.length >= 7, `${sources.length} ملفًا`)
  // توليد سرّ = عشوائية + بناء نصّ. أيّهما وحده بريء؛ الحظر على وجودهما هنا أصلًا.
  const RANDOM = /crypto\.randomUUID|getRandomValues|randomBytes|Math\.random/
  const rnd = sources.filter((s) => RANDOM.test(s.code))
  check('لا مصدر عشوائية في طبقة البريد إطلاقًا (فلا سرّ يُولَّد فيها)',
    rnd.length === 0, rnd.map((s) => s.path).join(' '))
  const pwWord = sources.filter((s) => /\bpassword\s*[:=]\s*['"`]/i.test(s.code))
  check('ولا قيمة كلمة مرور مسنَدة في أي مصدر', pwWord.length === 0, pwWord.map((s) => s.path).join(' '))
  // التأكيد المضادّ: مصدر مزروع فيه توليد يُلتقط باسمه.
  check('مصدر مزروع فيه توليد عشوائي يُلتقط',
    RANDOM.test("const pw = crypto.randomUUID().slice(0, 12)"))
  check('و«password = "..."» مزروعة تُلتقط', /\bpassword\s*[:=]\s*['"`]/i.test('const password = "hunter2"'))
}

// ════════════════════════════════════════════════════════════════════════════
const failed = results.filter((r) => !r.pass)
console.log(`\n${'─'.repeat(70)}`)
console.log(`  ${results.length - failed.length}/${results.length} فحصًا ناجحًا`)
if (failed.length) {
  console.log(`\n✗ ${failed.length} فحصًا ساقطًا:`)
  for (const f of failed) console.log(`   - ${f.name}`)
  process.exit(1)
}
console.log('✓ test:email-mailer — كل الفحوص ناجحة\n')
