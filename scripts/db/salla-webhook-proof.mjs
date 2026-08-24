// ============================================================================
// test:salla-webhook — إثبات منفَّذ لدورة الشراء: سلة → منحة.
// ============================================================================
// يغطّي الأربعة عشر اختبارًا الملزَمة في [CTO-BACKEND-001]، ومعها تأكيدات
// مضادّة (§4.2): كل حارس يُهاجَم بمحاكاة التفافٍ **تفشل بفحص مسمّى**.
//
// ثلاث طبقات، ومعها رابعة تمنع تباعدها:
//   ① منطق العقد الخالص  — `contract.mjs` مباشرةً (توقيع · تحليل · قرار).
//   ② القاعدة            — الهجرات كما هي على Postgres حقيقي (PGlite).
//   ③ **الاقتران**       — محاكاة الطرفية كاملةً: تحقّق ← تحليل ← قرار ←
//                          استيعاب. لأن سلامة الأجزاء متفرّقةً لا تثبت سلامة
//                          تركيبها (§4.2: «مرور غير مستحقّ ليس نجاحًا»).
//   ④ **مضاهاة `index.ts`** — الطبقة ③ محاكاة، والمحاكاة تشيخ. فحصٌ بنيويّ
//                          يثبت أن الطرفية الحقيقية ما زالت تنادي نفس الدوال
//                          بنفس الترتيب — وإلا صار الإثبات يحرس نسخته وحدها.
//
// التشغيل: npm run test:salla-webhook
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { createSandbox, asRole, makeUser } from './lib/supabase-sandbox.mjs'
import {
  verifyAuthenticity, parseSallaEvent, decideGrant, readPolicy,
  bodyFingerprint, hmacSha256Hex, timingSafeEqual, httpStatusFor,
  SUPPORTED_EVENTS, DEFAULT_PAID_SLUGS,
} from '../../supabase/functions/salla-webhook/contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const FN_DIR = join(root, 'supabase/functions/salla-webhook')

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
/** ينجح إذا رُفعت رسالة تطابق `expect`. الفشل بلا استثناء = فشل مسمّى. */
async function mustFail(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع أي استثناء')
  } catch (e) {
    const m = String(e.message || e)
    // §4.2: سقوط باستثناء تقني ليس إثباتًا — لا بدّ أن يسقط **باسمه**.
    return check(name, m.includes(expect), m.split('\n')[0].slice(0, 110))
  }
}

const SECRET = 'salla-test-secret-value-0123456789'
const PEPPER = 'proof-pepper-0123456789abcdef0123456789'

const ENV = {
  SALLA_WEBHOOK_SECRET: SECRET,
  SALLA_AMOUNT_POLICY: 'exact',
  SALLA_EXPECTED_AMOUNT_MINOR: '1999',
  SALLA_EXPECTED_CURRENCY: 'SAR',
  SALLA_PAID_STATUS_SLUGS: 'completed',
  SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM',
}

/**
 * حمولة `order.status.updated` **بالشكل الرسمي**، منقولة من مرجع سلة:
 *   SallaApp/salla-partners-agent-kit →
 *   .agents/skills/salla-app-functions-design/references/event-contexts.md
 *
 * وبنيتها هي بيت الداء الذي أصلحه [CTO-86]:
 *   data.id      = معرّف **تغيّر الحالة** (يتبدّل مع كل انتقال)
 *   data.status  = **نصّ** معروض بالعربية، لا كائن فيه slug
 *   data.order   = كائن الطلب الحقيقي، ومنه وحده تُقرأ كل الحقول
 *
 * `statusChangeId` مختلف عمدًا عن `orderId` في كل استدعاء: أي قارئ يخلط
 * بينهما يسقط فورًا في الفحوص أدناه.
 */
function sallaPayload({
  event = 'order.status.updated', orderId = 'ORD-1001', slug = 'completed',
  email = 'buyer@example.com', amount = 19.99, currency = 'SAR',
  productId = 'PROD-PREMIUM', createdAt = '2026-08-11T10:00:00Z',
  statusChangeId = 'STATUSCHANGE-9999', pendingPayment = false,
} = {}) {
  const order = {
    id: orderId,
    reference_id: 55501,
    status: { id: 566146469, name: 'تم التنفيذ', slug, customized: null },
    payment_method: 'credit_card',
    currency,
    amounts: {
      sub_total: { amount, currency },
      shipping_cost: { amount: 0, currency },
      total: { amount, currency },
    },
    items: [{ id: 9, name: 'Qimmah Premium', sku: 'SKU-PREM',
      product: { id: productId, name: 'Qimmah Premium' }, quantity: 1 }],
    customer: { id: 77, first_name: 'B', last_name: 'X', email, mobile: 5000000, country: 'SA' },
    is_pending_payment: pendingPayment,
  }
  return JSON.stringify({
    event,
    merchant: 472944967,
    created_at: createdAt,
    data: {
      id: statusChangeId,
      status: 'تم التنفيذ',
      customized: null,
      note: '',
      created_at: { date: createdAt, timezone_type: 3, timezone: 'Asia/Riyadh' },
      order,
    },
  })
}

/** الشكل المسطّح (`order.created`) — الطلب مباشرةً تحت `data`. للمقارنة. */
function flatOrderPayload({ event = 'order.created', orderId = 'ORD-FLAT', slug = 'completed',
  email = 'buyer@example.com', amount = 19.99, currency = 'SAR', productId = 'PROD-PREMIUM',
  createdAt = '2026-08-11T10:00:00Z', pendingPayment = false } = {}) {
  return JSON.stringify({
    event, merchant: 472944967, created_at: createdAt,
    data: {
      id: orderId, reference_id: 41027662,
      status: { id: 566146469, name: '…', slug, customized: null },
      payment_method: 'bank', currency,
      amounts: { sub_total: { amount, currency }, total: { amount, currency } },
      items: [{ id: 9, sku: 'SKU-PREM', product: { id: productId, name: 'Qimmah Premium' }, quantity: 1 }],
      customer: { id: 77, first_name: 'B', last_name: 'X', email },
      is_pending_payment: pendingPayment,
    },
  })
}

const signedHeaders = async (body, { secret = SECRET, strategy = 'signature', sig = null } = {}) =>
  new Headers({
    'X-Salla-Security-Strategy': strategy,
    'X-Salla-Signature': sig ?? (await hmacSha256Hex(secret, body)),
    'content-type': 'application/json',
  })

// ── الطبقة ③: محاكاة الطرفية كاملةً بنفس ترتيب `index.ts` ──────────────────
async function simulateWebhook(db, { headers, rawBody, env = ENV, method = 'POST' }) {
  if (method !== 'POST') return { outcome: 'method_not_allowed', wrote: false }

  const pol = readPolicy(env)
  if (!pol.ok) return { outcome: 'misconfigured', wrote: false, reason: pol.reason }

  const auth = await verifyAuthenticity({
    headers, rawBody, secret: env.SALLA_WEBHOOK_SECRET, token: env.SALLA_WEBHOOK_TOKEN,
  })
  // ⚠️ لا كتابة قبل التحقّق — نفس قرار `index.ts`، ويُحرَس بفحص مسمّى أدناه.
  if (!auth.ok) return { outcome: 'unauthorized', wrote: false, reason: auth.reason }

  const parsed = parseSallaEvent(rawBody)
  if (!parsed.ok) return { outcome: 'malformed', wrote: false, reason: parsed.reason }

  const event = parsed.event
  const decision = decideGrant(event, pol.policy)
  const fingerprint = await bodyFingerprint(rawBody)

  await asRole(db, 'service_role')
  const r = await db.query(
    `select public.salla_ingest_event($1,$2,$3,$4,$5,$6,$7,$8,$9) as outcome`,
    [fingerprint, event.eventName, event.orderId, event.email || null,
      event.amountMinor, event.currency || null, event.statusSlug || null,
      decision.grant, decision.reason],
  )
  await asRole(db, null)
  return { outcome: r.rows[0].outcome, wrote: true, reason: decision.reason, fingerprint }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ salla-webhook — دورة الشراء الكاملة\n')

const { db, failed } = await createSandbox()
if (failed.length) {
  console.error('✗ فشل تطبيق الهجرات:', failed)
  process.exit(1)
}
await db.exec(`insert into private.identity_pepper (version, pepper) values (1, '${PEPPER}')`)
const q = async (sql, args) => { await asRole(db, null); return db.query(sql, args) }

// ── ١) حدث مدفوع صحيح ⇒ الشراء يُسجَّل ─────────────────────────────────────
console.log('— ١) حدث مدفوع صحيح')
const buyerId = await makeUser(db, 'buyer@example.com')
let body = sallaPayload()
let res = await simulateWebhook(db, { headers: await signedHeaders(body), rawBody: body })
check('حدث مدفوع صحيح ⇒ processed', res.outcome === 'processed', res.outcome)

let led = await q(`select provider, provider_order_id, amount_minor, currency, recorded_by, source_event
                   from public.purchase_ledger`)
check('الشراء مسجَّل في السجلّ الدائم', led.rows.length === 1 && led.rows[0].provider_order_id === 'ORD-1001')
check('المبلغ محفوظ بأصغر وحدة من عشريّ سلة (19.99 ⇒ 1999)', led.rows[0].amount_minor === 1999,
  String(led.rows[0].amount_minor))
check('أثر الشراء مسمّى (recorded_by = webhook:salla)', led.rows[0].recorded_by === 'webhook:salla',
  led.rows[0].recorded_by)
check('السجلّ مربوط بحدث التدقيق (source_event)', led.rows[0].source_event === res.fingerprint)

// ── ٢) المنحة فعّالة وقابلة للاسترجاع ──────────────────────────────────────
console.log('\n— ٢) المنحة')
await asRole(db, 'authenticated', buyerId)
let st = await db.query(`select state from public.my_entitlement()`)
await asRole(db, null)
check('المشتري يرى premiumActive', st.rows[0].state === 'premiumActive', st.rows[0].state)

// ── ٣) التكرار ⇒ لا شراء ثانٍ ولا منحة ثانية ───────────────────────────────
console.log('\n— ٣) إعادة الإرسال (سلة تعيد ٣ مرّات)')
const before = (await q(`select count(*)::int n from public.purchase_ledger`)).rows[0].n
res = await simulateWebhook(db, { headers: await signedHeaders(body), rawBody: body })
check('إعادة نفس الحدث ⇒ duplicate', res.outcome === 'duplicate', res.outcome)
const after = (await q(`select count(*)::int n from public.purchase_ledger`)).rows[0].n
check('لا صفّ شراء ثانٍ', before === after, `${before} → ${after}`)
const evCount = (await q(`select count(*)::int n from public.salla_webhook_events`)).rows[0].n
check('لا سطر تدقيق ثانٍ لنفس البصمة', evCount === 1, String(evCount))

// ── ٤) نفس الطلب ببريد آخر ⇒ رفض ───────────────────────────────────────────
console.log('\n— ٤) نفس الطلب، هوية أخرى')
await makeUser(db, 'thief@example.com')
// `created_at` مختلف ⇒ بصمة مختلفة ⇒ ليس تكرارًا: هذا هجوم لا إعادة.
let attack = sallaPayload({ email: 'thief@example.com', createdAt: '2026-08-11T11:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(attack), rawBody: attack })
check('نفس الطلب ببريد آخر ⇒ rejected', res.outcome === 'rejected', res.outcome)
const thiefEnt = await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
                          where u.email='thief@example.com'`)
check('اللص لا ينال منحة', thiefEnt.rows[0].n === 0)
const stillAlice = await q(`select email_hash from public.purchase_ledger where provider_order_id='ORD-1001'`)
const buyerHash = (await q(`select private.hash_identity('buyer@example.com',1) h`)).rows[0].h
check('السجلّ ما زال مربوطًا بالمشتري الأصلي', stillAlice.rows[0].email_hash === buyerHash)
const rej = await q(`select classification, reason from public.salla_webhook_events
                     where reason like '%purchase_identity_mismatch%'`)
check('الرفض مسجَّل في التدقيق بسببه', rej.rows.length === 1
  && rej.rows[0].classification === 'rejected', rej.rows[0]?.reason?.slice(0, 60))

// ── ٥) توقيع فاسد ⇒ رفض بلا أي كتابة ───────────────────────────────────────
console.log('\n— ٥) التوقيع')
let evBefore = (await q(`select count(*)::int n from public.salla_webhook_events`)).rows[0].n
body = sallaPayload({ orderId: 'ORD-BAD-SIG' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(body, { sig: 'f'.repeat(64) }), rawBody: body,
})
check('توقيع فاسد ⇒ unauthorized', res.outcome === 'unauthorized' && res.reason === 'bad_signature', res.reason)
let evAfter = (await q(`select count(*)::int n from public.salla_webhook_events`)).rows[0].n
check('توقيع فاسد لا يكتب سطر تدقيق (الطرفية ليست مضخّة كتابة)', evBefore === evAfter,
  `${evBefore} → ${evAfter}`)

res = await simulateWebhook(db, { headers: new Headers({}), rawBody: body })
check('توقيع غائب ⇒ unauthorized/missing_signature', res.reason === 'missing_signature', res.reason)

res = await simulateWebhook(db, {
  headers: await signedHeaders(body), rawBody: body,
  env: { ...ENV, SALLA_WEBHOOK_SECRET: '' },
})
check('سرّ غير مهيّأ ⇒ فشل مغلق لا تخطٍّ للتحقّق', res.reason === 'secret_not_configured', res.reason)

// التوقيع محسوب على **الجسم الخام**: تغيير بايت واحد يبطله.
const tampered = body.replace('19.99', '0.01')
res = await simulateWebhook(db, { headers: await signedHeaders(body), rawBody: tampered })
check('العبث بالجسم بعد التوقيع يُكتشف', res.reason === 'bad_signature', res.reason)

// استراتيجية الرمز — المسار الثاني الموثَّق
res = await simulateWebhook(db, {
  headers: new Headers({ 'X-Salla-Security-Strategy': 'token', Authorization: 'tok-right' }),
  rawBody: body, env: { ...ENV, SALLA_WEBHOOK_TOKEN: 'tok-right' },
})
check('استراتيجية الرمز تعمل بالرمز الصحيح', res.outcome !== 'unauthorized', res.outcome)
res = await simulateWebhook(db, {
  headers: new Headers({ 'X-Salla-Security-Strategy': 'token', Authorization: 'tok-wrong' }),
  rawBody: body, env: { ...ENV, SALLA_WEBHOOK_TOKEN: 'tok-right' },
})
check('رمز خاطئ ⇒ unauthorized', res.reason === 'bad_token', res.reason)
res = await simulateWebhook(db, {
  headers: new Headers({ 'X-Salla-Security-Strategy': 'nonsense' }), rawBody: body,
})
check('استراتيجية مجهولة ⇒ فشل مغلق', res.reason === 'unknown_strategy', res.reason)

// ── ٦) حمولة مشوَّهة ⇒ رفض ──────────────────────────────────────────────────
console.log('\n— ٦) الحمولة المشوَّهة')
for (const [label, raw, expected] of [
  ['ليس JSON', 'not json at all', 'malformed_json'],
  ['مصفوفة لا كائن', '[]', 'malformed_payload'],
  ['بلا event', JSON.stringify({ data: { id: 1 } }), 'missing_event'],
  ['بلا data', JSON.stringify({ event: 'order.payment.updated' }), 'missing_data'],
  ['بلا معرّف طلب', JSON.stringify({ event: 'order.payment.updated', data: {} }), 'missing_order_id'],
]) {
  const r = await simulateWebhook(db, { headers: await signedHeaders(raw), rawBody: raw })
  check(`حمولة مشوَّهة (${label}) ⇒ ${expected}`, r.outcome === 'malformed' && r.reason === expected, r.reason)
}

// ── ٧) طلب غير مدفوع ⇒ لا منحة ─────────────────────────────────────────────
console.log('\n— ٧) غير مدفوع')
await makeUser(db, 'pending@example.com')
for (const slug of ['payment_pending', 'under_review', 'canceled', '']) {
  const b = sallaPayload({ orderId: `ORD-UNPAID-${slug || 'none'}`, slug, email: 'pending@example.com' })
  const r = await simulateWebhook(db, { headers: await signedHeaders(b), rawBody: b })
  check(`حالة «${slug || '(غائبة)'}» ⇒ لا منحة`, r.reason === 'unpaid_or_incomplete' && r.outcome !== 'processed',
    `${r.outcome}/${r.reason}`)
}
let pend = await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
                    where u.email='pending@example.com'`)
check('المشتري غير المدفوع بلا منحة إطلاقًا', pend.rows[0].n === 0)
check('لكن أحداثه مسجَّلة في التدقيق',
  (await q(`select count(*)::int n from public.salla_webhook_events where reason='unpaid_or_incomplete'`))
    .rows[0].n === 4)

// حدث غير مدعوم
let b2 = sallaPayload({ event: 'order.refund.created', orderId: 'ORD-REFUND' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('حدث غير مدعوم ⇒ ignored بلا منحة', res.reason === 'unsupported_event' && res.outcome !== 'processed',
  `${res.outcome}/${res.reason}`)

// ── ٨) منتج مخالف ⇒ لا منحة ────────────────────────────────────────────────
console.log('\n— ٨) المنتج')
await makeUser(db, 'wrongprod@example.com')
b2 = sallaPayload({ orderId: 'ORD-WRONGPROD', productId: 'PROD-TSHIRT', email: 'wrongprod@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('منتج مخالف ⇒ لا منحة', res.reason === 'product_mismatch' && res.outcome !== 'processed',
  `${res.outcome}/${res.reason}`)
check('مشتري المنتج المخالف بلا منحة',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='wrongprod@example.com'`)).rows[0].n === 0)

// ── ٩) مبلغ مخالف ⇒ فشل مغلق ───────────────────────────────────────────────
console.log('\n— ٩) المبلغ')
await makeUser(db, 'cheap@example.com')
b2 = sallaPayload({ orderId: 'ORD-CHEAP', amount: 0.01, email: 'cheap@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('مبلغ مخالف مع سياسة exact ⇒ لا منحة', res.reason === 'amount_mismatch' && res.outcome !== 'processed',
  `${res.outcome}/${res.reason}`)

b2 = sallaPayload({ orderId: 'ORD-CUR', currency: 'USD', email: 'cheap@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('عملة مخالفة ⇒ لا منحة', res.reason === 'currency_mismatch', res.reason)

// السياسة نفسها تفشل مغلقة عند سوء التهيئة — أخطر ما يفعله بابُ دفعٍ أن يمنح
// لأن متغيّرًا لم يُضبط.
check('سياسة المبلغ غائبة ⇒ الطرفية لا تقلع',
  readPolicy({ ...ENV, SALLA_AMOUNT_POLICY: '' }).ok === false)
check('exact بلا مبلغ متوقَّع ⇒ لا تقلع',
  readPolicy({ ...ENV, SALLA_EXPECTED_AMOUNT_MINOR: '' }).ok === false)
check('exact بمبلغ غير رقمي ⇒ لا تقلع',
  readPolicy({ ...ENV, SALLA_EXPECTED_AMOUNT_MINOR: '19.99' }).ok === false)
check('off قرار معلَن مقبول', readPolicy({ ...ENV, SALLA_AMOUNT_POLICY: 'off' }).ok === true)

// ── ١٠) شراء قبل الحساب ⇒ سجلّ دائم فقط ────────────────────────────────────
console.log('\n— ١٠) الشراء قبل الحساب')
b2 = sallaPayload({ orderId: 'ORD-NOACCT', email: 'future@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('مشترٍ بلا حساب ⇒ الحدث يُعالَج', res.outcome === 'processed', res.outcome)
const futureHash = (await q(`select private.hash_identity('future@example.com',1) h`)).rows[0].h
check('الشراء محفوظ دائمًا بانتظاره',
  (await q(`select count(*)::int n from public.purchase_ledger where email_hash=$1`, [futureHash]))
    .rows[0].n === 1)
check('ولا منحة معلّقة في الهواء',
  (await q(`select count(*)::int n from public.entitlements`)).rows[0].n
  === (await q(`select count(*)::int n from auth.users u join public.entitlements e on e.user_id=u.id`)).rows[0].n)

// ── ١١) التسجيل لاحقًا ⇒ claim_pending_grants ينجح ─────────────────────────
console.log('\n— ١١) التسجيل بعد الشراء')
const futureId = await makeUser(db, 'future@example.com')
await asRole(db, 'authenticated', futureId)
const claimed = await db.query(`select public.claim_pending_grants() as s`)
await asRole(db, null)
check('claim_pending_grants ⇒ premiumActive', claimed.rows[0].s === 'premiumActive', claimed.rows[0].s)
await asRole(db, 'authenticated', futureId)
st = await db.query(`select state, source from public.my_entitlement()`)
await asRole(db, null)
check('الحالة الفعّالة premiumActive بمصدر salla',
  st.rows[0].state === 'premiumActive' && st.rows[0].source === 'salla', JSON.stringify(st.rows[0]))

// ── ١٢) مشترٍ محظور ⇒ الشراء يُسجَّل والوصول يبقى محظورًا ───────────────────
console.log('\n— ١٢) المحظور')
const banned = await makeUser(db, 'banned@example.com')
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('banned@example.com','manual','SEED-1',1999,null,'admin:test')`)
await db.query(`select public.admin_revoke($1,'proof: abuse')`, [banned])
await asRole(db, null)
b2 = sallaPayload({ orderId: 'ORD-BANNED', email: 'banned@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
check('شراء محظور ⇒ الحدث يُعالَج (لا يُبتلع)', res.outcome === 'processed', res.outcome)
check('والشراء **مسجَّل** — المال حقيقي فأثره يُحفَظ',
  (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-BANNED'`))
    .rows[0].n === 1)
const bannedRow = await q(`select revoked_at from public.entitlements where user_id=$1`, [banned])
check('الشراء لم يرفع الحظر (revoked_at باقٍ)', bannedRow.rows[0].revoked_at !== null)
await asRole(db, 'authenticated', banned)
st = await db.query(`select state from public.my_entitlement()`)
await asRole(db, null)
check('الحالة الفعّالة للمحظور: revoked', st.rows[0].state === 'revoked', st.rows[0].state)

// الحظر الدائم ينجو من حذف الحساب ثم شراء جديد
await q(`delete from public.entitlements where user_id=$1`, [banned])  // محاكاة delete_own_account
b2 = sallaPayload({ orderId: 'ORD-BANNED-2', email: 'banned@example.com' })
res = await simulateWebhook(db, { headers: await signedHeaders(b2), rawBody: b2 })
// ⚠️ الأساس المُراجَع يكتب صفّ المنحة **ثم** يفحص الإلغاء ويُرجع 'revoked'.
// فالثابت ليس «لا صفّ» بل **«لا وصول فعّال»**. عدّ الصفوف كان يمرّ على خطّي
// وحده ويسقط على المُراجَع بلا أن يعني شيئًا أمنيًا — فالفحص على الحالة الفعّالة.
await asRole(db, 'authenticated', banned)
const revivedState = await db.query(`select state from public.my_entitlement()`)
await asRole(db, null)
check('حذف الحساب ثم شراء جديد لا يحيي الوصول (السجلّ الدائم يلاحق)',
  revivedState.rows[0].state === 'revoked', `state=${revivedState.rows[0].state}`)
check('ورقم الشراء الجديد مسجَّل رغم الحظر (أثر المال يُحفَظ)',
  (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-BANNED-2'`))
    .rows[0].n === 1)

// ── ١٣) لا دور عميل يبلغ مسار الإدارة ──────────────────────────────────────
console.log('\n— ١٣) صلاحيات مسار الإدارة')
for (const role of ['anon', 'authenticated']) {
  await mustFail(`دور ${role} لا ينفّذ admin_grant_premium`, async () => {
    await asRole(db, role, buyerId)
    await db.query(`select public.admin_grant_premium('x@y.z','salla','HACK',1999,null,'x')`)
  }, 'permission denied')
  await mustFail(`دور ${role} لا ينفّذ salla_ingest_event`, async () => {
    await asRole(db, role, buyerId)
    await db.query(`select public.salla_ingest_event('fp','e','o','x@y.z',1999,'SAR','completed',true,null)`)
  }, 'permission denied')
  await mustFail(`دور ${role} لا يقرأ جدول تدقيق الأحداث`, async () => {
    await asRole(db, role, buyerId)
    await db.query(`select * from public.salla_webhook_events`)
  }, 'permission denied')
  await mustFail(`دور ${role} لا يكتب في purchase_ledger مباشرةً`, async () => {
    await asRole(db, role, buyerId)
    await db.query(`insert into public.purchase_ledger (provider,provider_order_id,email_hash,hash_version,recorded_by)
                    values ('salla','SELF','h',1,'self')`)
  }, 'permission denied')
}
await asRole(db, null)

// ── ١٤) الإعادة لا تغيّر هوية الشراء الأصلية ───────────────────────────────
console.log('\n— ١٤) ثبات هوية الشراء')
const origHash = (await q(`select email_hash from public.purchase_ledger where provider_order_id='ORD-1001'`))
  .rows[0].email_hash
// محاولات متعدّدة بأشكال مختلفة على نفس الطلب
for (const [label, payload] of [
  ['بريد آخر', sallaPayload({ email: 'thief@example.com', createdAt: '2026-08-11T12:00:00Z' })],
  ['بمبلغ أعلى', sallaPayload({ email: 'thief@example.com', amount: 999, createdAt: '2026-08-11T13:00:00Z' })],
  ['بحدث آخر', sallaPayload({ email: 'thief@example.com', event: 'order.status.updated', createdAt: '2026-08-11T14:00:00Z' })],
]) {
  await simulateWebhook(db, { headers: await signedHeaders(payload), rawBody: payload })
  const now = (await q(`select email_hash, amount_minor from public.purchase_ledger where provider_order_id='ORD-1001'`)).rows[0]
  check(`إعادة (${label}) لا تغيّر هوية الطلب ولا مبلغه`,
    now.email_hash === origHash && now.amount_minor === 1999)
}
check('اللص ما زال بلا منحة بعد كل المحاولات',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='thief@example.com'`)).rows[0].n === 0)

// دوران الملح ليس بابًا خلفيًا: إصدار جديد لا يجعل الطلب «حرًّا»
await q(`insert into private.identity_pepper (version, pepper) values (2, 'rotated-pepper-abcdef0123456789abcdef')`)
await q(`update private.identity_pepper set retired_at = now() where version = 1`)
const afterRotate = sallaPayload({ email: 'thief@example.com', createdAt: '2026-08-11T15:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(afterRotate), rawBody: afterRotate })
check('دوران الملح لا يفتح الطلب لهوية أخرى', res.outcome === 'rejected', res.outcome)
// وصاحبه الأصلي ما زال يملكه رغم اختلاف الإصدار النشط
const ownerReplay = sallaPayload({ createdAt: '2026-08-11T16:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(ownerReplay), rawBody: ownerReplay })
check('وصاحب الطلب الأصلي ما زال يملكه بعد الدوران', res.outcome === 'processed', res.outcome)

// ── أرضية عشوائية الأكواد ──────────────────────────────────────────────────
// عقد الأساس المُراجَع: خطأ **عام واحد** (`invalid_access_code`) لكل مخالفة
// شكل — والعموم هنا حماية لا كسل: تمييز «قصير» عن «خارج الأبجدية» يعطي
// المهاجم مقياسًا يقرّبه من كود صحيح، وتحديد المعدّل ما زال عائقًا خارجيًا.
console.log('\n— عقد كود الوصول (الأساس المُراجَع)')
await asRole(db, 'service_role')
for (const code of ['A', 'SHORT9CHR', 'qimmah-code-1', 'ABCDEFGHIO']) {
  await mustFail(`كود «${code}» يُرفض`, async () => {
    await db.query(`select public.admin_create_access_code($1,'proof','shape test')`, [code])
  }, 'invalid_access_code')
}
const good = await db.query(`select public.admin_create_access_code('K7M2QX9PWT','proof','ok') as id`)
check('كود سليم داخل أبجدية الأساس يُقبل', !!good.rows[0].id)
await asRole(db, null)

// ── لا أسرار ولا بريد صريح في جدول التدقيق ─────────────────────────────────
console.log('\n— خصوصية جدول التدقيق')
const cols = await q(`select column_name from information_schema.columns
                      where table_schema='public' and table_name='salla_webhook_events'`)
const names = cols.rows.map((r) => r.column_name)
check('لا عمود سرّ/توقيع/مفتاح في جدول التدقيق',
  !names.some((n) => /secret|signature|hmac|token|key|password/i.test(n)), names.join(','))
check('لا عمود حمولة خام', !names.some((n) => /^(raw|payload|body)$/i.test(n)))
// فحص القيم لا الأسماء: عمود بريء الاسم قد يحمل بريدًا.
const textCols = (await q(`select column_name from information_schema.columns
   where table_schema='public' and table_name='salla_webhook_events' and data_type in ('text','character varying')`))
  .rows.map((r) => r.column_name)
const emailish = await q(
  `select count(*)::int n from public.salla_webhook_events where ${textCols.map((c) => `coalesce(${c},'') like '%@%'`).join(' or ')}`)
check('لا قيمة تحمل بريدًا صريحًا في أي عمود نصّي', emailish.rows[0].n === 0,
  `فُحص ${textCols.length} عمودًا`)
// تأكيد مضادّ: الكاشف يلتقط زرعًا
await q(`insert into public.salla_webhook_events (event_fingerprint, classification, reason)
         values ('planted-pii','received','leak@example.com')`)
const emailish2 = await q(
  `select count(*)::int n from public.salla_webhook_events where ${textCols.map((c) => `coalesce(${c},'') like '%@%'`).join(' or ')}`)
check('كاشف البريد يسقط على زرع مقصود', emailish2.rows[0].n === 1)
await q(`delete from public.salla_webhook_events where event_fingerprint='planted-pii'`)

// ── تأكيدات مضادّة على منطق العقد (§4.2) ───────────────────────────────────
console.log('\n— تأكيدات مضادّة')
check('timingSafeEqual يرفض طولًا مختلفًا', timingSafeEqual('abc', 'abcd') === false)
check('timingSafeEqual يرفض فرقًا في آخر محرف', timingSafeEqual('abcd', 'abce') === false)
check('timingSafeEqual يقبل المطابق', timingSafeEqual('abcd', 'abcd') === true)
const h1 = await hmacSha256Hex(SECRET, 'a')
const h2 = await hmacSha256Hex(SECRET, 'b')
check('HMAC يختلف باختلاف الجسم', h1 !== h2)
check('HMAC بطول ٦٤ خانة ست عشرية', /^[0-9a-f]{64}$/.test(h1))
const hOther = await hmacSha256Hex('other-secret-value-0123456789abc', 'a')
check('HMAC يختلف باختلاف السرّ', h1 !== hOther)
check('بصمتان لجسمين مختلفين تختلفان',
  (await bodyFingerprint('x')) !== (await bodyFingerprint('y')))
check('بصمة نفس الجسم ثابتة',
  (await bodyFingerprint('same')) === (await bodyFingerprint('same')))

// قائمة الأحداث والشرائح ليست مفتوحة
check('قائمة الأحداث المدعومة محصورة ولا تشمل الاسترجاع',
  SUPPORTED_EVENTS.length === 1 && !SUPPORTED_EVENTS.includes('order.refund.created'))
check('شريحة مجهولة لا تُعتبر مدفوعة',
  decideGrant({ eventName: 'order.payment.updated', statusSlug: 'brand_new_slug', email: 'a@b.c',
    amountMinor: 1999, currency: 'SAR', productIds: ['PROD-PREMIUM'] },
  readPolicy(ENV).policy).grant === false)

// ربط حالات HTTP — الرفض الدائم ٢٠٠ عمدًا كي لا تعيد سلة ثلاثًا بلا فائدة
check('الرفض الدائم يُردّ ٢٠٠ (لا إعادة بلا فائدة)', httpStatusFor('rejected') === 200)
check('التوقيع الفاسد ٤٠١', httpStatusFor('unauthorized') === 401)
check('العطل العابر ٥٠٠ (كي تُعيد سلة)', httpStatusFor('failed') === 500)
check('سوء التهيئة ٥٠٠', httpStatusFor('misconfigured') === 500)
check('التكرار ٢٠٠', httpStatusFor('duplicate') === 200)

// ── زرع الثغرة الأصلية — الحارس يُهاجَم لا يُصدَّق (§4.2) ────────────────────
console.log('\n— زرع الثغرتين اللتين أغلقتهما هذه الموجة')
// نزع الهجرة من القرص يُسقط الإثبات بخطأ توقيع — وذلك سقوط تقني لا مسمّى.
// فتُزرَع النسخة **الهشّة** بنفس التوقيع الجديد: `on conflict do nothing` ثم
// منحٌ بلا شرط، و`revoked_at = null`. هكذا يسقط الفحص بمقصده لا بعرَضه.
const VULNERABLE = `
create or replace function public.admin_grant_premium(
  p_email text, p_provider text, p_provider_order_id text,
  p_amount_minor int default null, p_raw jsonb default null,
  p_recorded_by text default 'admin:unspecified', p_source_event text default null
) returns text language plpgsql security definer set search_path = '' as $fn$
declare ver int; h text; uid uuid;
begin
  ver := private.active_pepper_version();
  h   := private.hash_identity(p_email, ver);
  insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version,
                                      amount_minor, raw, recorded_by, source_event)
  values (p_provider, p_provider_order_id, h, ver, p_amount_minor, p_raw, p_recorded_by, p_source_event)
  on conflict (provider, provider_order_id) do nothing;
  select u.id into uid from auth.users u where lower(btrim(u.email)) = lower(btrim(p_email));
  if uid is null then return 'pending_claim'; end if;
  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, p_email, 'premium', 'salla', now(), null, true)
  on conflict (user_id) do update
    set entitlement_type = 'premium', source = 'salla', activated_at = now(),
        expires_at = null, no_expiry = true, revoked_at = null, revoked_reason = null;
  return 'premiumActive';
end; $fn$;`
// الاستعادة من **الهجرة المصالَحة** لا من المرفوضة: `20260811120001` لم تُنقل
// أصلًا (كانت تفوز بالترقيم وتعيد فتح أربع ثغرات)، والمحصَّن الآن هو ما بُني
// فوق الأساس المُراجَع.
const HARDENED = readFileSync(join(root, 'supabase/migrations/20260812120001_salla_webhook_ingest.sql'), 'utf8')

// `exec` لا `query`: ملف الهجرة عدّة أوامر، والثانية لا تقبلها.
const execSql = async (sql) => { await asRole(db, null); await db.exec(sql) }

await execSql(VULNERABLE)
await makeUser(db, 'victim@example.com')
await makeUser(db, 'attacker@example.com')
let vb = sallaPayload({ orderId: 'ORD-PLANT', email: 'victim@example.com', createdAt: '2026-08-12T01:00:00Z' })
await simulateWebhook(db, { headers: await signedHeaders(vb), rawBody: vb })
vb = sallaPayload({ orderId: 'ORD-PLANT', email: 'attacker@example.com', createdAt: '2026-08-12T02:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(vb), rawBody: vb })
const stolen = (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
                         where u.email='attacker@example.com' and e.entitlement_type='premium'`)).rows[0].n
check('الزرع يعيد الثغرة فعليًا: نفس الطلب ببريد آخر يمنح Premium',
  res.outcome === 'processed' && stolen === 1, `outcome=${res.outcome} stolen=${stolen}`)

const pv = await makeUser(db, 'planted-ban@example.com')
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('planted-ban@example.com','manual','SEED-P',1999,null,'admin:test')`)
await db.query(`select public.admin_revoke($1,'planted')`, [pv])
await asRole(db, null)
vb = sallaPayload({ orderId: 'ORD-PLANT-BAN', email: 'planted-ban@example.com', createdAt: '2026-08-12T03:00:00Z' })
await simulateWebhook(db, { headers: await signedHeaders(vb), rawBody: vb })
const lifted = (await q(`select revoked_at from public.entitlements where user_id=$1`, [pv])).rows[0].revoked_at
check('الزرع يعيد الثغرة الثانية: الشراء يرفع الحظر بصمت', lifted === null)

// استعادة النسخة المحصَّنة من الهجرة **كما هي على القرص** — لا نسخة يدوية.
await execSql(HARDENED)
res = await simulateWebhook(db, {
  headers: await signedHeaders(sallaPayload({ orderId: 'ORD-PLANT', email: 'attacker@example.com', createdAt: '2026-08-12T04:00:00Z' })),
  rawBody: sallaPayload({ orderId: 'ORD-PLANT', email: 'attacker@example.com', createdAt: '2026-08-12T04:00:00Z' }),
})
check('بعد استعادة الهجرة يعود الفحص نظيفًا: الطلب مغلق على هويته',
  res.outcome === 'rejected', res.outcome)
await asRole(db, 'service_role')
await db.query(`select public.admin_revoke($1,'planted again')`, [pv])
await asRole(db, null)
vb = sallaPayload({ orderId: 'ORD-PLANT-BAN2', email: 'planted-ban@example.com', createdAt: '2026-08-12T05:00:00Z' })
await simulateWebhook(db, { headers: await signedHeaders(vb), rawBody: vb })
check('وبعد الاستعادة لا يرفع الشراء الحظر',
  (await q(`select revoked_at from public.entitlements where user_id=$1`, [pv])).rows[0].revoked_at !== null)

// ── [CTO-86] عقد سلة الرسمي — التصحيحان وحُرّاسهما ──────────────────────────
console.log('\n— [CTO-86] عقد الأحداث والحمولة')

// ① `order.payment.updated` = «تغيّرت وسيلة الدفع»، لا «وصل المال».
check('order.payment.updated لم يعد حدثًا مقبولًا',
  !SUPPORTED_EVENTS.includes('order.payment.updated'), SUPPORTED_EVENTS.join(','))
await makeUser(db, 'methodchange@example.com')
let pm = sallaPayload({ event: 'order.payment.updated', orderId: 'ORD-PMUPD',
  email: 'methodchange@example.com', createdAt: '2026-08-13T01:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(pm), rawBody: pm })
check('تغيّر وسيلة الدفع لا يمنح شيئًا',
  res.reason === 'unsupported_event' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)
check('ولا يترك صفّ شراء',
  (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-PMUPD'`))
    .rows[0].n === 0)

// ② المفتاح يُربط بمعرّف **الطلب** لا بمعرّف تغيّر الحالة.
console.log('  · ربط المفتاح بمعرّف الطلب لا بتغيّر الحالة')
await makeUser(db, 'nested@example.com')
const nestedA = sallaPayload({ orderId: 'ORD-NEST', statusChangeId: 'SC-AAA',
  email: 'nested@example.com', createdAt: '2026-08-13T02:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(nestedA), rawBody: nestedA })
check('حدث تغيّر الحالة المتداخل يُعالَج', res.outcome === 'processed', res.outcome)
const nestedLed = await q(`select provider_order_id, amount_minor from public.purchase_ledger
                           where provider_order_id in ('ORD-NEST','SC-AAA')`)
check('السجلّ حمل معرّف الطلب (ORD-NEST) لا معرّف تغيّر الحالة (SC-AAA)',
  nestedLed.rows.length === 1 && nestedLed.rows[0].provider_order_id === 'ORD-NEST',
  nestedLed.rows.map((r) => r.provider_order_id).join(','))
check('والمبلغ قُرئ من data.order.amounts لا من المظروف', nestedLed.rows[0].amount_minor === 1999)

// الاختبار الحاسم: **نفس الطلب، انتقال حالة ثانٍ** — معرّف تغيّر مختلف.
// بالقراءة القديمة كان يبدو طلبًا جديدًا ⇒ منحة ثانية وحارس الهوية أعمى.
await makeUser(db, 'nestthief@example.com')
const nestedB = sallaPayload({ orderId: 'ORD-NEST', statusChangeId: 'SC-BBB',
  email: 'nestthief@example.com', createdAt: '2026-08-13T03:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(nestedB), rawBody: nestedB })
check('انتقال حالة ثانٍ لنفس الطلب ببريد آخر ⇒ rejected (الحارس يرى الطلب)',
  res.outcome === 'rejected', res.outcome)
check('ولا منحة للثاني',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='nestthief@example.com'`)).rows[0].n === 0)
check('ولا صفّ شراء ثانٍ للطلب نفسه',
  (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-NEST'`))
    .rows[0].n === 1)

// النصّ العربي المعروض في `data.status` لا يتسرّب إلى قرار الشريحة.
const parsedNested = parseSallaEvent(nestedA)
check('data.status النصّي («تم التنفيذ») لا يُقرأ شريحةً',
  parsedNested.ok && parsedNested.event.statusSlug === 'completed', parsedNested.event?.statusSlug)
check('والقارئ يعلن أنه رأى الشكل المتداخل', parsedNested.event.nestedShape === true)

// الشكل المسطّح ما زال يُقرأ صحيحًا (لم يُكسر بإصلاح المتداخل).
const parsedFlat = parseSallaEvent(flatOrderPayload({ orderId: 'ORD-FLAT2' }))
check('الشكل المسطّح يُقرأ صحيحًا أيضًا',
  parsedFlat.ok && parsedFlat.event.orderId === 'ORD-FLAT2'
  && parsedFlat.event.statusSlug === 'completed' && parsedFlat.event.amountMinor === 1999)
check('والمسطّح يُعلَن غير متداخل', parsedFlat.event.nestedShape === false)

// ③ `is_pending_payment` — إشارة موثَّقة تسبق الشريحة.
console.log('  · إشارة is_pending_payment')
await makeUser(db, 'pendflag@example.com')
const pend2 = sallaPayload({ orderId: 'ORD-PENDFLAG', slug: 'completed', pendingPayment: true,
  email: 'pendflag@example.com', createdAt: '2026-08-13T04:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(pend2), rawBody: pend2 })
check('is_pending_payment=true يمنع المنحة ولو كانت الشريحة completed',
  res.reason === 'payment_pending' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)
check('ولا منحة',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='pendflag@example.com'`)).rows[0].n === 0)

// ④ السياسة صارت إلزامية — لا شرائح مفترضة ولا منتج مفتوح.
console.log('  · السياسة الإلزامية')
check('لا شريحة مدفوعة افتراضية إطلاقًا', DEFAULT_PAID_SLUGS.length === 0)
const noSlugs = { ...ENV }; delete noSlugs.SALLA_PAID_STATUS_SLUGS
check('غياب SALLA_PAID_STATUS_SLUGS ⇒ الطرفية لا تقلع', readPolicy(noSlugs).ok === false,
  readPolicy(noSlugs).reason?.slice(0, 70))
const noProd = { ...ENV }; delete noProd.SALLA_EXPECTED_PRODUCT_IDS
check('غياب SALLA_EXPECTED_PRODUCT_IDS ⇒ الطرفية لا تقلع', readPolicy(noProd).ok === false,
  readPolicy(noProd).reason?.slice(0, 70))
res = await simulateWebhook(db, {
  headers: await signedHeaders(nestedA), rawBody: nestedA, env: noProd,
})
check('وبلا ربط منتج لا يمرّ أي حدث', res.outcome === 'misconfigured', res.outcome)

// ⑤ ربط المنتج يقبل SKU كما يقبل معرّف المنتج، ولا يقبل الاسم المعروض.
console.log('  · هوية منتج Premium')
await makeUser(db, 'skubuyer@example.com')
const bySku = sallaPayload({ orderId: 'ORD-SKU', productId: 'SOME-OTHER-ID',
  email: 'skubuyer@example.com', createdAt: '2026-08-13T05:00:00Z' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(bySku), rawBody: bySku,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'SKU-PREM' },
})
check('المطابقة بالـSKU تعمل', res.outcome === 'processed', res.outcome)
const byName = parseSallaEvent(sallaPayload({ productId: 'X' }))
check('الاسم المعروض لا يدخل معرّفات المنتج (قابل للتغيير من لوحة التاجر)',
  !byName.event.productIds.includes('Qimmah Premium'), byName.event.productIds.join(','))

// ── [CTO-BACKEND-003] §9 — بوّابة ربط المنتج، بالحالات السالبة ─────────────
console.log('\n— [BACKEND-003] بوّابة المنتج: أربع حالات لا تمنح')

// أ) منتج سلة مختلف تمامًا
await makeUser(db, 'g-other@example.com')
let g = sallaPayload({ orderId: 'ORD-G-OTHER', productId: 'PROD-TSHIRT',
  email: 'g-other@example.com', createdAt: '2026-08-14T01:00:00Z' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(g), rawBody: g,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM' },
})
check('أ) منتج آخر ⇒ لا منحة', res.reason === 'product_mismatch' && res.outcome !== 'processed',
  `${res.outcome}/${res.reason}`)

// ب) **نفس الاسم المعروض، معرّف مختلف** — الحالة التي يسقط فيها من يوثّق بالاسم.
//    منتج اسمه «Qimmah Premium» حرفيًا لكن معرّفه مقلَّد.
await makeUser(db, 'g-clone@example.com')
g = sallaPayload({ orderId: 'ORD-G-CLONE', productId: 'PROD-IMPOSTOR',
  email: 'g-clone@example.com', createdAt: '2026-08-14T02:00:00Z' })
check('  (الحمولة تحمل الاسم المعروض «Qimmah Premium» فعلًا)', g.includes('Qimmah Premium'))
res = await simulateWebhook(db, {
  headers: await signedHeaders(g), rawBody: g,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM' },
})
check('ب) نفس الاسم بمعرّف مختلف ⇒ لا منحة',
  res.reason === 'product_mismatch' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)
check('   ولا منحة للمقلِّد',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='g-clone@example.com'`)).rows[0].n === 0)

// ج) المبلغ صحيح تمامًا والمنتج خطأ — المال وحده ليس سندًا
await makeUser(db, 'g-amt@example.com')
g = sallaPayload({ orderId: 'ORD-G-AMT', productId: 'PROD-TSHIRT', amount: 19.99,
  email: 'g-amt@example.com', createdAt: '2026-08-14T03:00:00Z' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(g), rawBody: g,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM' },
})
check('ج) مبلغ مطابق ومنتج خطأ ⇒ لا منحة (الدفع ليس تفويضًا)',
  res.reason === 'product_mismatch' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)

// د) المنتج صحيح والشريحة غير مقبولة
await makeUser(db, 'g-status@example.com')
g = sallaPayload({ orderId: 'ORD-G-STATUS', productId: 'PROD-PREMIUM', slug: 'under_review',
  email: 'g-status@example.com', createdAt: '2026-08-14T04:00:00Z' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(g), rawBody: g,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM' },
})
check('د) منتج صحيح بشريحة غير مقبولة ⇒ لا منحة',
  res.reason === 'unpaid_or_incomplete' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)

// والموجب المقابل: نفس الطلب بالمنتج والشريحة الصحيحين يمرّ — كي لا تكون
// السوالب الأربعة نجاحًا مجّانيًا لبوّابة ترفض كل شيء (§4.2).
await makeUser(db, 'g-ok@example.com')
g = sallaPayload({ orderId: 'ORD-G-OK', productId: 'PROD-PREMIUM', slug: 'completed',
  email: 'g-ok@example.com', createdAt: '2026-08-14T05:00:00Z' })
res = await simulateWebhook(db, {
  headers: await signedHeaders(g), rawBody: g,
  env: { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: 'PROD-PREMIUM' },
})
check('والموجب: منتج وشريحة صحيحان ⇒ منحة (البوّابة ليست رافضة لكل شيء)',
  res.outcome === 'processed', res.outcome)

// ── [CTO-SALLA-002] §C — ثوابت الأساس المُراجَع لا تنكسر بطبقة سلة ─────────
// هذه الكتلة هي **سبب وجود الموجة**: خطّ سلة السابق كان يعيد فتح أربعًا منها
// لأن ترقيم هجرته أحدث. كل ثابت هنا يُهاجَم بالمسار الذي كان يكسره.
console.log('\n— [SALLA-002] ثوابت الأساس المُراجَع بعد المصالحة')

// ① التحقّق ASCII **قبل** طيّ الحالة — `ſ` تنطوي إلى `S` تحت upper()
await asRole(db, 'service_role')
check('طيّ Unicode لا يصنع كودًا صالحًا (ſ → S)',
  'K7M2QX9PWſ'.toUpperCase() === 'K7M2QX9PWS')   // الخطر حقيقي لا نظري
await mustFail('كود فيه ſ يُرفض رغم أن طيّه يقع داخل الأبجدية', async () => {
  await db.query(`select public.admin_create_access_code($1,'proof','unicode')`, ['K7M2QX9PWſ'])
}, 'invalid_access_code')
await asRole(db, null)

// ② `provider_order_id` مطبَّع بـbtrim — وإلا صار ' ORD-X ' طلبًا آخر
await makeUser(db, 'ws-owner@example.com')
await makeUser(db, 'ws-thief@example.com')
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('ws-owner@example.com','salla','ORD-WS',1999,null,'admin:test')`)
await asRole(db, null)
await mustFail('طلب بمسافات محيطة هو نفس الطلب (لا التفاف)', async () => {
  await asRole(db, 'service_role')
  await db.query(`select public.admin_grant_premium('ws-thief@example.com','salla','  ORD-WS  ',1999,null,'admin:test')`)
}, 'purchase_identity_mismatch')
await asRole(db, null)
check('ولم يُنشأ صفّ شراء ثانٍ بمسافات',
  (await q(`select count(*)::int n from public.purchase_ledger where btrim(provider_order_id)='ORD-WS'`))
    .rows[0].n === 1)

// ③ الإعادة لا تعيد تأريخ Premium قائمة
await asRole(db, null)
const rdBefore = (await q(`select activated_at from public.entitlements e join auth.users u on u.id=e.user_id
                           where u.email='ws-owner@example.com'`)).rows[0].activated_at
await new Promise((r) => setTimeout(r, 25))
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('ws-owner@example.com','salla','ORD-WS',1999,null,'admin:test')`)
await asRole(db, null)
const rdAfter = (await q(`select activated_at from public.entitlements e join auth.users u on u.id=e.user_id
                          where u.email='ws-owner@example.com'`)).rows[0].activated_at
check('إعادة الطلب لا تعيد تأريخ activated_at',
  new Date(rdBefore).getTime() === new Date(rdAfter).getTime(),
  `${new Date(rdBefore).toISOString()} → ${new Date(rdAfter).toISOString()}`)

// ④+⑤ صدق المصدر في الاتجاهين
await makeUser(db, 'srcman@example.com')
await makeUser(db, 'srcsalla@example.com')
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('srcman@example.com','manual','MAN-9',0,null,'admin:founder')`)
await db.query(`select public.admin_grant_premium('srcsalla@example.com','salla','SAL-9',1999,null,'webhook:salla')`)
await asRole(db, null)
const srcs = await q(`select u.email, e.source from public.entitlements e join auth.users u on u.id=e.user_id
                      where u.email in ('srcman@example.com','srcsalla@example.com') order by u.email`)
check('منحة يدوية ⇒ source = manual',
  srcs.rows.find((r) => r.email === 'srcman@example.com').source === 'manual',
  srcs.rows.find((r) => r.email === 'srcman@example.com').source)
check('منحة سلة ⇒ source = salla',
  srcs.rows.find((r) => r.email === 'srcsalla@example.com').source === 'salla',
  srcs.rows.find((r) => r.email === 'srcsalla@example.com').source)

// ⑥ الإلغاء الدائم يعلو على الشراء (فُحص أعلاه بالحالة الفعّالة كذلك)
check('سجلّ الإلغاء الدائم ما زال بلا عمود user_id (ينجو من الحذف)',
  (await q(`select count(*)::int n from information_schema.columns
            where table_schema='public' and table_name='revocation_ledger' and column_name='user_id'`))
    .rows[0].n === 0)

// ⑦ تعارض هوية الطلب مفروض — أُثبت أعلاه؛ وهنا الأثر مسجَّل
check('تعارض الهوية يظهر في التدقيق مصنَّفًا rejected',
  (await q(`select count(*)::int n from public.salla_webhook_events
            where classification='rejected' and reason like '%purchase_identity_mismatch%'`)).rows[0].n >= 1)

// ⑧ دوران الملح: نفس الهوية تبقى مالكة بعد الدوران (فُحص أعلاه سلبًا وإيجابًا)
check('المقارنة تستعمل إصدار ملح صفّ الشراء لا الإصدار النشط',
  /existing\.hash_version/.test(
    readFileSync(join(root, 'supabase/migrations/20260812120001_salla_webhook_ingest.sql'), 'utf8')))

// ⑨ PUBLIC EXECUTE مغلق على الدوال الجديدة
const pubExec = await q(`
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public','private')
     and p.proname in ('salla_ingest_event','admin_grant_premium')
     and has_function_privilege('public', p.oid, 'execute')`)
check('لا PUBLIC EXECUTE على دوال طبقة سلة', pubExec.rows.length === 0,
  pubExec.rows.map((r) => r.proname).join(','))

// ⑩ أقل صلاحية: جدول التدقيق مغلق تمامًا على أدوار العميل
for (const role of ['anon', 'authenticated']) {
  const gr = await q(`select count(*)::int n from information_schema.role_table_grants
                      where table_schema='public' and table_name='salla_webhook_events' and grantee=$1`, [role])
  check(`لا صلاحية جدول لـ${role} على salla_webhook_events`, gr.rows[0].n === 0, String(gr.rows[0].n))
}

// ── [CTO-SALLA-002] §D — الربط بالمنتج المعتمد الحقيقي ─────────────────────
// معرّفات حقيقية من متجر `Qimmahsa` (المعرّف 1460504714)، لا أسماء وهمية:
//   1181109938 = «تطبيق قمة»            ← Premium المعتمد وحده
//   1084925309 = «تطبيق قمة تجربة مجانية» ← **ممنوع أن يمنح شيئًا**
console.log('\n— [SALLA-002] ربط المنتج المعتمد 1181109938')
const PREMIUM_ID = '1181109938'
const TRIAL_ID = '1084925309'
const PROD_ENV = { ...ENV, SALLA_EXPECTED_PRODUCT_IDS: PREMIUM_ID }

await makeUser(db, 'realbuy@example.com')
let rp = sallaPayload({ orderId: 'ORD-REAL-1', productId: PREMIUM_ID,
  email: 'realbuy@example.com', createdAt: '2026-08-15T01:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(rp), rawBody: rp, env: PROD_ENV })
check('المنتج المعتمد 1181109938 ⇒ منحة', res.outcome === 'processed', res.outcome)
await asRole(db, 'authenticated', (await q(`select id from auth.users where email='realbuy@example.com'`)).rows[0].id)
st = await db.query(`select state, source, no_expiry, expires_at from public.my_entitlement()`)
await asRole(db, null)
check('الحالة premiumActive بمصدر salla', st.rows[0].state === 'premiumActive' && st.rows[0].source === 'salla',
  JSON.stringify(st.rows[0]))
// §3 من الأمر: شراء واحد بلا انتهاء — لا اشتراك سنويّ ولا شهريّ.
check('العقد التجاري: no_expiry=true و expires_at=null (شراء واحد لا اشتراك)',
  st.rows[0].no_expiry === true && st.rows[0].expires_at === null, JSON.stringify(st.rows[0]))

// منتج التجربة المجانية: يصل الـwebhook ولا يمنح شيئًا
await makeUser(db, 'trialbuy@example.com')
rp = sallaPayload({ orderId: 'ORD-TRIALPROD', productId: TRIAL_ID,
  email: 'trialbuy@example.com', createdAt: '2026-08-15T02:00:00Z' })
res = await simulateWebhook(db, { headers: await signedHeaders(rp), rawBody: rp, env: PROD_ENV })
check('منتج التجربة المجانية 1084925309 ⇒ لا منحة',
  res.reason === 'product_mismatch' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)
check('ولا صفّ منحة لمشتري التجربة',
  (await q(`select count(*)::int n from public.entitlements e join auth.users u on u.id=e.user_id
            where u.email='trialbuy@example.com'`)).rows[0].n === 0)
check('ولا صفّ شراء له (لم يصل admin_grant_premium أصلًا)',
  (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-TRIALPROD'`))
    .rows[0].n === 0)
check('والحدث مسجَّل في التدقيق للمراجعة',
  (await q(`select count(*)::int n from public.salla_webhook_events
            where provider_order_id='ORD-TRIALPROD' and classification='rejected'`)).rows[0].n === 1)

// نفس الاسم المعروض بمعرّف مختلف — الاسم ليس سندًا
await makeUser(db, 'clone2@example.com')
rp = sallaPayload({ orderId: 'ORD-CLONE2', productId: '9999999999',
  email: 'clone2@example.com', createdAt: '2026-08-15T03:00:00Z' })
check('  (الحمولة تحمل الاسم المعروض «Qimmah Premium»)', rp.includes('Qimmah Premium'))
res = await simulateWebhook(db, { headers: await signedHeaders(rp), rawBody: rp, env: PROD_ENV })
check('اسم معروض مطابق بمعرّف مختلف ⇒ لا منحة',
  res.reason === 'product_mismatch' && res.outcome !== 'processed', `${res.outcome}/${res.reason}`)

// ── الطبقة ④: مضاهاة `index.ts` — المحاكاة لا تحرس نفسها ───────────────────
console.log('\n— مضاهاة الطرفية الحقيقية')
const idx = readFileSync(join(FN_DIR, 'index.ts'), 'utf8')
const stripped = idx.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
for (const fn of ['readPolicy', 'verifyAuthenticity', 'parseSallaEvent', 'decideGrant',
  'bodyFingerprint', 'salla_ingest_event']) {
  check(`الطرفية تنادي ${fn}`, stripped.includes(fn))
}
// الترتيب هو الضمانة، لا مجرّد الوجود (§4.2: وجود أجزاء متفرّقة ليس اقترانًا).
const posVerify = stripped.indexOf('verifyAuthenticity')
const posIngest = stripped.indexOf('salla_ingest_event')
const posParse = stripped.indexOf('parseSallaEvent')
check('التحقّق يسبق الاستيعاب في الطرفية الحقيقية', posVerify > 0 && posVerify < posIngest)
check('التحقّق يسبق التحليل كذلك', posVerify < posParse)
check('الطرفية ترفض غير POST', /method\s*!==\s*'POST'/.test(stripped))
check('الطرفية تقرأ الجسم الخام (text) لا JSON مباشرةً',
  /req\.text\(\)/.test(stripped) && !/req\.json\(\)/.test(stripped))
check('لا سرّ مكتوب في كود الطرفية',
  !/SALLA_WEBHOOK_SECRET\s*=\s*['"][^'"]+['"]/.test(stripped))
const contractSrc = readFileSync(join(FN_DIR, 'contract.mjs'), 'utf8')
check('لا مسار «تخطَّ التحقّق» في العقد',
  !/skip.?verif|bypass|NODE_ENV\s*===?\s*['"]dev/i.test(contractSrc))

// تأكيد مضادّ لمضاهاة الترتيب: لو انقلب الترتيب لسقط الفحص
const flipped = stripped.replace(/verifyAuthenticity/g, 'ZZZ').replace(/salla_ingest_event/g, 'verifyAuthenticity')
check('فحص الترتيب يسقط على ترتيب مقلوب مزروع',
  !(flipped.indexOf('verifyAuthenticity') > 0 && flipped.indexOf('ZZZ') > flipped.indexOf('verifyAuthenticity')))

// ── بوّابة المنصّة: الإعلان الذي بدونه لا يصل التسليم أصلًا ────────────────
/**
 * ⚠️ **أخطر ما في هذا الملف كلّه ليس منطقًا بل إعلانًا.**
 * طرفيات Supabase تتحقّق من JWT افتراضًا، وسلة لا ترسل JWT. فبلا
 * `verify_jwt = false` تردّ بوّابة المنصّة كل تسليم بـ401 **قبل أن يعمل سطر
 * واحد ممّا يفحصه هذا الطقم** — فتمرّ الـ157 فحصًا خضراء بينما لا يصل شراءٌ
 * واحد. عطلٌ يعيش في الفجوة بين ما نختبره وما يُنشَر، فيُحرَس هنا.
 */
{
  const cfgPath = resolve(root, 'supabase/config.toml')
  let cfg = ''
  try { cfg = readFileSync(cfgPath, 'utf8') } catch { cfg = '' }
  const strip = (t) => t.replace(/^\s*#.*$/gm, '')
  const clean = strip(cfg)
  const sectionOf = (name) => {
    const i = clean.indexOf(`[functions.${name}]`)
    if (i < 0) return ''
    const rest = clean.slice(i + `[functions.${name}]`.length)
    const j = rest.indexOf('[')
    return j < 0 ? rest : rest.slice(0, j)
  }
  check('supabase/config.toml موجود — بدونه لا إعلان أصلًا', cfg.trim() !== '')
  check('⚔️ وطرفية سلة معلَنة `verify_jwt = false` — وإلا رُدّ كل تسليم ٤٠١ قبل كودنا',
    /verify_jwt\s*=\s*false/.test(sectionOf('salla-webhook')))
  // ⟲ التأكيد المضادّ: الفحص يقرأ **قسم الطرفية** لا الملف كلّه. لو قرأ الملف
  // كلّه لأرضاه `verify_jwt = false` في قسم طرفية أخرى تمامًا.
  check('⟲ والفحص يقرأ قسم الطرفية لا الملف — قسمٌ آخر لا يُرضيه',
    !/verify_jwt\s*=\s*false/.test(sectionOf('qimmah-gateway')))
  check('⟲ والبوّابة التجارية تُبقيه `true` — متصفّح مصادَق لا webhook',
    /verify_jwt\s*=\s*true/.test(sectionOf('qimmah-gateway')))
}

// ── الخلاصة ────────────────────────────────────────────────────────────────
await db.close()
const passed = results.filter((r) => r.pass).length
const failedN = results.length - passed
console.log(`\n${failedN === 0 ? '🎉' : '💥'} ${passed} نجحت / ${failedN} فشلت\n`)
if (failedN > 0) {
  console.log('الفاشلة:')
  results.filter((r) => !r.pass).forEach((r) => console.log('  ✗', r.name))
}
process.exit(failedN === 0 ? 0 : 1)
