// ============================================================================
// test:attack-webhook — تزوير طرفية سلة: كل مسار يُجرَّب قبل أي كتابة.
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// يستورد `supabase/functions/salla-webhook/contract.mjs` **نفسه** (لا نسخة)
// ويشغّل عليه هجومًا حقيقيًا: بلا توقيع · بتوقيع خاطئ · بتوقيع صحيح على جسم
// آخر · معاد · بترتيب مقلوب · بمنتج خاطئ · بحالة غير مدفوعة · بمبلغ مختلف ·
// بترقية استراتيجية · بحشو JSON · بتضخيم المبلغ عبر الشكل المتداخل.
//
// **حدّ معلَن:** `index.ts` طبقة نقل لـDeno ولا تُستورَد من Node. فالتحقّق من
// «لا كتابة قبل التوقيع» يجري بطريقين مقترنين: (أ) تحليل بنيوي لترتيب النداءات
// في `index.ts` بحدود الكتلة لا بـ`includes` متفرّقة، (ب) إعادة تركيب نفس
// التسلسل هنا فوق طرفية مزيَّفة تعدّ كتابات القاعدة — فإن سبقت كتابةٌ التحقّق
// سقط الفحص باسمه.
// ============================================================================
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  verifyAuthenticity, parseSallaEvent, decideGrant, readPolicy,
  bodyFingerprint, httpStatusFor, timingSafeEqual, hmacSha256Hex,
  SUPPORTED_EVENTS, DEFAULT_PAID_SLUGS,
} from '../../supabase/functions/salla-webhook/contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
let passed = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  passed += 1
  console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`)
}

const SECRET = 'salla-webhook-secret-for-the-attack-suite'
const H = (obj) => ({ get: (k) => obj[k] ?? obj[String(k).toLowerCase()] ?? null })
const sign = (body) => hmacSha256Hex(SECRET, body)

const ENV = {
  SALLA_AMOUNT_POLICY: 'exact',
  SALLA_EXPECTED_AMOUNT_MINOR: '1999',
  SALLA_EXPECTED_CURRENCY: 'SAR',
  SALLA_PAID_STATUS_SLUGS: 'completed',
  SALLA_EXPECTED_PRODUCT_IDS: '2106415557',
}
const POL = readPolicy(ENV)
if (!POL.ok) throw new Error(`FAIL: تهيئة الاختبار مرفوضة — ${POL.reason}`)
const policy = POL.policy

/** حمولة سلة الحقيقية الشكل (order.status.updated المتداخلة). */
const payload = (over = {}) => JSON.stringify({
  event: over.event ?? 'order.status.updated',
  merchant: 1234,
  created_at: over.createdAt ?? '2026-08-16T00:00:00Z',
  data: {
    id: 198290473,
    status: 'تم التنفيذ',
    order: {
      id: over.orderId ?? 629263027,
      status: { slug: over.slug ?? 'completed' },
      is_pending_payment: over.pendingPayment,
      customer: { email: over.email ?? 'Buyer@Example.COM' },
      amounts: { total: { amount: over.amount ?? 19.99, currency: over.currency ?? 'SAR' } },
      items: [{ product: { id: over.productId ?? 2106415557 }, sku: over.sku ?? 'QIMMAH-PREMIUM' }],
    },
  },
})

console.log('\n⚔️  هجوم تزوير طرفية سلة')

// ══════════════════════ ① الأصالة قبل كل شيء ══════════════════════════════
console.log('\n① التحقّق من الأصالة')
const good = payload()
const goodSig = await sign(good)

check('توقيع صحيح على الجسم الصحيح ⇒ مقبول',
  (await verifyAuthenticity({ headers: H({ 'X-Salla-Signature': goodSig }), rawBody: good, secret: SECRET })).ok === true)

for (const [label, headers, body] of [
  ['بلا ترويسة توقيع إطلاقًا', {}, good],
  ['توقيع فارغ', { 'X-Salla-Signature': '' }, good],
  ['توقيع فراغات', { 'X-Salla-Signature': '     ' }, good],
  ['توقيع عشوائي بالطول الصحيح', { 'X-Salla-Signature': 'a'.repeat(64) }, good],
  ['توقيع مقتطع', { 'X-Salla-Signature': goodSig.slice(0, 63) }, good],
  ['توقيع بحرف واحد مقلوب', { 'X-Salla-Signature': (goodSig[0] === '0' ? '1' : '0') + goodSig.slice(1) }, good],
  ['توقيع بأحرف كبيرة (لا تطبيع متساهل)', { 'X-Salla-Signature': goodSig.toUpperCase() }, good],
  ['توقيع صحيح على **جسم آخر**', { 'X-Salla-Signature': goodSig }, payload({ amount: 999.99 })],
  ['توقيع صحيح لجسم قديم مع بريد مبدَّل', { 'X-Salla-Signature': goodSig }, payload({ email: 'attacker@evil.example' })],
  ['ترويسة Authorization بدل التوقيع', { Authorization: 'Bearer anything' }, good],
]) {
  const r = await verifyAuthenticity({ headers: H(headers), rawBody: body, secret: SECRET })
  check(`مرفوض: ${label}`, r.ok === false, r.reason)
}

// ترقية/تخفيض الاستراتيجية بيد المهاجم — يجب أن تفشل مغلقةً
for (const [label, strategy, headers, opts] of [
  ['استراتيجية مجهولة', 'jwt', { 'X-Salla-Signature': goodSig }, { secret: SECRET }],
  ['تخفيض إلى token والرمز غير مهيّأ', 'token', { Authorization: 'Bearer x' }, { secret: SECRET }],
  ['استراتيجية فارغة تُقرأ signature (الافتراض الأضيق)', '', { }, { secret: SECRET }],
  ['signature والسرّ غير مهيّأ', 'signature', { 'X-Salla-Signature': goodSig }, { secret: undefined }],
  ['token والرمز خاطئ', 'token', { Authorization: 'Bearer wrong' }, { token: 'Bearer right' }],
]) {
  const r = await verifyAuthenticity({
    headers: H({ 'X-Salla-Security-Strategy': strategy, ...headers }), rawBody: good, ...opts,
  })
  check(`مرفوض: ${label}`, r.ok === false, r.reason)
}
check('ورمز صحيح باستراتيجية token يمرّ — فالرفض ليس عامًّا',
  (await verifyAuthenticity({ headers: H({ 'X-Salla-Security-Strategy': 'token', Authorization: 'Bearer right' }), rawBody: good, token: 'Bearer right' })).ok === true)

// المقارنة ثابتة الزمن سلوكيًا
check('timingSafeEqual يرفض اختلاف الطول', timingSafeEqual('abc', 'abcd') === false)
check('timingSafeEqual يرفض اختلافًا في آخر خانة', timingSafeEqual('a'.repeat(63) + 'b', 'a'.repeat(64)) === false)
check('timingSafeEqual يقبل التطابق التام', timingSafeEqual(goodSig, goodSig) === true)
check('timingSafeEqual لا ينهار على null/undefined', timingSafeEqual(null, undefined) === true && timingSafeEqual(null, 'x') === false)

// ══════════════════════ ② الإعادة والبصمة ═══════════════════════════════
console.log('\n② الإعادة — البصمة على الجسم الخام')
const fp1 = await bodyFingerprint(good)
const fp2 = await bodyFingerprint(good)
check('نفس الجسم ⇒ نفس البصمة (منع التكرار يعمل)', fp1 === fp2 && /^[0-9a-f]{64}$/.test(fp1))
check('حرف واحد مختلف ⇒ بصمة مختلفة', (await bodyFingerprint(good + ' ')) !== fp1)
check('طلب مختلف ⇒ بصمة مختلفة', (await bodyFingerprint(payload({ orderId: 1 }))) !== fp1)
// ⚠️ لا نافذة زمنية: `created_at` لا يدخل أي قرار
check('⚠️ حدّ معلَن: لا فحص طزاجة زمنية — جسم موقَّع ملتقَط يبقى صالحًا للأبد، ويردّه منع التكرار وحده',
  !/created_at/.test(readFileSync(resolve(root, 'supabase/functions/salla-webhook/index.ts'), 'utf8')))
// ومحاكاة الالتفاف: لو حُذف نداء البصمة، لصار كل جسم موقَّع قابلًا لإعادة المنح.
check('محاكاة الالتفاف: البصمة تُمرَّر فعلًا إلى الاستيعاب (لا تُحسَب وتُهمَل)',
  /p_fingerprint:\s*fingerprint/.test(readFileSync(resolve(root, 'supabase/functions/salla-webhook/index.ts'), 'utf8')))

// ══════════════════════ ③ قرار المنح ═════════════════════════════════════
console.log('\n③ قرار المنح — كل انحراف يُردّ بسبب مسمّى')
const decideOf = (over) => {
  const p = parseSallaEvent(payload(over))
  if (!p.ok) return { grant: false, reason: `parse:${p.reason}` }
  return decideGrant(p.event, policy)
}
check('طلب مطابق للسياسة ⇒ منحة', decideOf({}).grant === true && decideOf({}).reason === 'paid_order')
for (const [label, over, reason] of [
  ['حدث غير مدعوم (order.created)', { event: 'order.created' }, 'unsupported_event'],
  ['حدث تغيّر وسيلة الدفع', { event: 'order.payment.updated' }, 'unsupported_event'],
  ['شريحة غير مدفوعة', { slug: 'payment_pending' }, 'unpaid_or_incomplete'],
  ['شريحة under_review', { slug: 'under_review' }, 'unpaid_or_incomplete'],
  ['شريحة فارغة', { slug: '' }, 'unpaid_or_incomplete'],
  ['شريحة completed لكن is_pending_payment=true', { pendingPayment: true }, 'payment_pending'],
  ['بلا بريد عميل', { email: '' }, 'missing_customer_email'],
  ['عملة مختلفة', { currency: 'USD' }, 'currency_mismatch'],
  ['مبلغ أقلّ', { amount: 0.01 }, 'amount_mismatch'],
  ['مبلغ أكبر', { amount: 199.99 }, 'amount_mismatch'],
  ['مبلغ صفر', { amount: 0 }, 'amount_mismatch'],
  ['مبلغ سالب', { amount: -19.99 }, 'amount_mismatch'],
  ['منتج آخر من نفس المتجر', { productId: 999, sku: 'TSHIRT' }, 'product_mismatch'],
]) {
  const d = decideOf(over)
  check(`مرفوض: ${label}`, d.grant === false && d.reason === reason, d.reason)
}
// ترتيب الفحوص: الشريحة تسبق البريد فلا يتسرّب وجود البريد كأوراكل
check('طلب غير مدفوع بلا بريد يُردّ بسبب عدم الدفع لا بغياب البريد',
  decideOf({ slug: 'pending', email: '' }).reason === 'unpaid_or_incomplete')

// حمولة مشوّهة/عدائية
for (const [label, raw, reason] of [
  ['JSON غير صالح', '{', 'malformed_json'],
  ['مصفوفة بدل كائن', '[]', 'malformed_payload'],
  ['null', 'null', 'malformed_payload'],
  ['بلا حقل event', JSON.stringify({ data: {} }), 'missing_event'],
  ['event ليس نصًّا', JSON.stringify({ event: 42, data: {} }), 'missing_event'],
  ['بلا data', JSON.stringify({ event: 'order.status.updated' }), 'missing_data'],
  ['data مصفوفة', JSON.stringify({ event: 'order.status.updated', data: [] }), 'missing_data'],
  ['بلا معرّف طلب', JSON.stringify({ event: 'order.status.updated', data: { order: { status: { slug: 'completed' } } } }), 'missing_order_id'],
]) {
  const p = parseSallaEvent(raw)
  check(`تحليل مرفوض: ${label}`, p.ok === false && p.reason === reason, p.reason)
}
// ⚠️ الفخّ الذي وثّقه [CTO-86]: `data.id` ليس معرّف الطلب
{
  const p = parseSallaEvent(payload({}))
  check('معرّف الطلب يُقرأ من data.order.id لا من data.id (فخّ CTO-86)',
    p.ok && p.event.orderId === '629263027')
  check('والشريحة تُقرأ من كائن الطلب لا من data.status النصّي', p.event.statusSlug === 'completed')
  check('والبريد يُطبَّع صغيرًا', p.event.email === 'buyer@example.com')
  check('والمبلغ يتحوّل لأصغر وحدة بالتقريب لا بالبتر', p.event.amountMinor === 1999)
}
// حشو JSON: مفتاح مكرّر يفوز آخره في JSON.parse — والتوقيع على الخام يمنع الاستغلال
{
  const smuggle = '{"event":"order.status.updated","data":{"order":{"id":1,"status":{"slug":"pending"},"status":{"slug":"completed"}}}}'
  const p = parseSallaEvent(smuggle)
  check('تكرار مفاتيح JSON لا يخترق: القرار على القيمة المحلَّلة والتوقيع على الخام',
    p.ok && p.event.statusSlug === 'completed' && decideGrant(p.event, policy).grant === false)
}

// ══════════════════════ ④ السياسة ترفض الإقلاع الناقص ════════════════════
console.log('\n④ التهيئة — لا منحة لأن متغيّرًا لم يُضبط')
for (const [label, env] of [
  ['بلا SALLA_AMOUNT_POLICY', { ...ENV, SALLA_AMOUNT_POLICY: '' }],
  ['سياسة مبلغ مجهولة', { ...ENV, SALLA_AMOUNT_POLICY: 'loose' }],
  ['exact بلا مبلغ', { ...ENV, SALLA_EXPECTED_AMOUNT_MINOR: '' }],
  ['exact بمبلغ غير رقمي', { ...ENV, SALLA_EXPECTED_AMOUNT_MINOR: '19.99' }],
  ['بلا شرائح مدفوعة', { ...ENV, SALLA_PAID_STATUS_SLUGS: '' }],
  ['بلا معرّفات منتج', { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: '' }],
  ['بيئة فارغة تمامًا', {}],
]) {
  const r = readPolicy(env)
  check(`الإقلاع مرفوض: ${label}`, r.ok === false, r.reason.slice(0, 60))
}
check('لا شريحة مدفوعة افتراضية إطلاقًا (لا تخمين)', Array.isArray(DEFAULT_PAID_SLUGS) && DEFAULT_PAID_SLUGS.length === 0)
check('حدث واحد مدعوم فقط، وليس order.payment.updated',
  SUPPORTED_EVENTS.length === 1 && SUPPORTED_EVENTS[0] === 'order.status.updated')
check('وسياسة off مسموحة صراحةً (قرار معلَن لا سهو)', readPolicy({ ...ENV, SALLA_AMOUNT_POLICY: 'off' }).ok === true)

// ══════════════════════ ⑤ حالات HTTP وإعادة سلة ═════════════════════════
console.log('\n⑤ ربط النتيجة بحالة HTTP')
check('توقيع فاسد ⇒ 401', httpStatusFor('unauthorized') === 401)
check('حمولة مشوّهة ⇒ 400', httpStatusFor('malformed') === 400)
check('غير POST ⇒ 405', httpStatusFor('method_not_allowed') === 405)
check('تهيئة ناقصة ⇒ 500 (توقّف لا منح)', httpStatusFor('misconfigured') === 500)
check('عطل قاعدة ⇒ 500 كي تعيد سلة', httpStatusFor('failed') === 500)
check('رفض دائم ⇒ 200 (الإعادة لا تغيّره)', httpStatusFor('rejected') === 200 && httpStatusFor('ignored') === 200)
check('نجاح/مكرّر ⇒ 200', httpStatusFor('processed') === 200 && httpStatusFor('duplicate') === 200)
check('نتيجة مجهولة ⇒ 500 لا 200 (fail-closed)', httpStatusFor('anything-else') === 500)

// ══════════════ ⑥ لا كتابة قبل التحقّق — بنيويًا ثم سلوكيًا ═══════════════
console.log('\n⑥ لا كتابة قبل التحقّق')
const idxFull = readFileSync(resolve(root, 'supabase/functions/salla-webhook/index.ts'), 'utf8')
// **جسم المعالج وحده.** كتلة الاستيراد تذكر كل الأسماء بترتيب لا علاقة له
// بترتيب التنفيذ — تحليلها كان سيقيس ترتيب الاستيراد ويسمّيه ترتيب أمان.
const handlerAt = idxFull.indexOf('Deno.serve(')
if (handlerAt < 0) throw new Error('FAIL: لم يُعثر على معالج Deno.serve — تغيّرت بنية الطرفية')
const idx = idxFull.slice(handlerAt)
const at = (needle) => {
  const i = idx.indexOf(needle)
  if (i < 0) throw new Error(`FAIL: «${needle}» غائب عن جسم المعالج — الترتيب لا يُقاس على غائب`)
  return i
}
check('كتلة الاستيراد مستبعَدة: التحليل على جسم Deno.serve وحده', idx.startsWith('Deno.serve('))
check('verifyAuthenticity قبل أي إنشاء لعميل القاعدة', at('verifyAuthenticity') < at('createClient'))
check('verifyAuthenticity قبل أي نداء rpc', at('verifyAuthenticity') < at(".rpc('salla_ingest_event'"))
check('والردّ بالرفض يسبق العميل نصًّا (لا مسار يتخطّاه)', at("if (!auth.ok)") < at('createClient'))
check('readPolicy قبل قراءة الجسم — تهيئة ناقصة توقف قبل أي عمل', at('readPolicy(env)') < at('await req.text()'))
check('لا مسار تخطٍّ للتحقّق بعلم بيئة أو وضع تطوير',
  !/(SKIP|BYPASS|DISABLE)_?(SIG|VERIF|WEBHOOK)/i.test(idxFull) && !/NODE_ENV|import\.meta\.env\.DEV/.test(idxFull))
check('المفتاح المميّز يُقرأ من البيئة ولا يُكتب في المستودع',
  idx.includes('env.SUPABASE_SERVICE_ROLE_KEY') && !/eyJ[A-Za-z0-9_-]{20,}/.test(idxFull))

// إعادة تركيب التسلسل فوق طرفية مزيَّفة تعدّ الكتابات
{
  let dbWrites = 0
  const fakeRpc = async () => { dbWrites += 1; return { data: 'processed', error: null } }
  const handle = async (headers, rawBody) => {
    const pol = readPolicy(ENV)
    if (!pol.ok) return 'misconfigured'
    const auth = await verifyAuthenticity({ headers: H(headers), rawBody, secret: SECRET })
    if (!auth.ok) return 'unauthorized'
    const parsed = parseSallaEvent(rawBody)
    if (!parsed.ok) return 'malformed'
    const d = decideGrant(parsed.event, pol.policy)
    await fakeRpc(d)
    return 'processed'
  }
  const spoofs = [
    [{}, good], [{ 'X-Salla-Signature': 'z'.repeat(64) }, good],
    [{ 'X-Salla-Signature': goodSig }, payload({ amount: 1 })],
    [{ 'X-Salla-Security-Strategy': 'jwt', 'X-Salla-Signature': goodSig }, good],
  ]
  for (const [h, b] of spoofs) check(`طلب مزوَّر يُردّ unauthorized بلا كتابة`, (await handle(h, b)) === 'unauthorized')
  check(`عدّاد كتابات القاعدة بعد ${spoofs.length} تزويرات = 0`, dbWrites === 0)
  check('وطلب أصيل يكتب مرّة واحدة — فالعدّاد يعدّ فعلًا', (await handle({ 'X-Salla-Signature': goodSig }, good)) === 'processed' && dbWrites === 1)
}

console.log(`\n✅ تزوير سلة: ${passed} فحصًا، 0 اختراق.\n`)
