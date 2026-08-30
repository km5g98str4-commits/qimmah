// ============================================================================
// test:purchase-credential — صكّ الشراء: سلطة Premium الدائمة تحت الهجوم
// ============================================================================
// [COMMERCE-W1] يثبت العقد الذي أدخلته `20260829120001_purchase_credentials.sql`:
// كود بغرض `purchase` يمنح Premium دائمًا عبر سلطة شراء واحدة (`purchase_ledger`)،
// مفرد الاستخدام، بصمةً لا نصًّا، وإعادة محاولته مقنَّعة لا معاقَبة — وكل ذلك
// **دون أن يتغيّر سلوك الوصول الموقوت بحرف**.
//
// المنهج منهج المستودع: `check` مسمّى + `mustFail` يطابق **اسم** الخطأ لا مجرّد
// السقوط (§4.2)، وقاعدة كاملة من الهجرات الحقيقية (PGlite = PostgreSQL حقيقي
// باتصال واحد). ما يحتاج تزامنًا فعليًّا يثبته طقم العنقود
// `scripts/attack/purchase-credential-attack.mjs` — لا هذا الملف.
//
// قاعدة القراءة: ✓ = العقد صامد · ✗ = عيب مؤكَّد.
// ============================================================================
import { createSandbox, asRole, makeUser } from './lib/supabase-sandbox.mjs'

let pass = 0
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  if (ok) pass += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}
async function mustFail(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع أي استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? '' : `توقّعنا «${expect}» فجاء: ${m.slice(0, 140)}`)
  }
}

const AUTH_STUB = `
  alter table auth.users add column if not exists raw_app_meta_data jsonb default '{}'::jsonb;
  alter table auth.users add column if not exists last_sign_in_at timestamptz;
  alter table auth.users add column if not exists created_at timestamptz not null default now();
`

console.log('\nإثبات صكوك الشراء — Postgres منفَّذ بالهجرات كاملة')

const MIG = '20260829120001_purchase_credentials.sql'
// [COMMERCE-W1-HARDENING] القدرة صار لها **هجرتان**: المُنشئة وتصليبها. ونسخة
// «ما قبل الهجرة» أدناه تقيس أن القدرة ابنة هجرتها — فتستبعد الاثنتين معًا،
// وإلّا لأنشأت هجرةُ التصليب `grant_premium_from_code` في عالمٍ يُفترض خلوّه
// منها، فيسقط تأكيدٌ سليم على تغييرٍ سليم. الاستبعاد يتّسع بقدر القدرة لا أكثر.
const MIG_HARDENING = '20260830120001_premium_authority_hardening.sql'
const { db, applied, failed } = await createSandbox()
check('كل هجرات المستودع تُطبَّق من قاعدة نظيفة', failed.length === 0,
  failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
check(`هجرة الصكوك ${MIG} ضمن المُطبَّق`, applied.includes(MIG))
await db.exec(AUTH_STUB)

// ═══════════════ ٠) بيانات واقعية ═══════════════
await asRole(db, null)
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (1, 'purchase-proof-pepper-0123456789abcd')`)
const founderId = await makeUser(db, 'founder@qimmah.test')
await asRole(db, 'service_role')
await db.query(`select public.admin_set_role('founder@qimmah.test', 'founder', 'purchase proof')`)
await asRole(db, 'service_role')
await db.query(`select public.admin_set_role('founder@qimmah.test', 'founder', 'idempotent re-set')`)

/** استدعاء redeem عبر المسار المعتمد `_v2` — الفشل قيمة {outcome, reason}. */
async function redeemV2(code) {
  const r = await db.query(`select public.redeem_access_code_v2($1) as res`, [code])
  return r.rows[0].res
}
async function myState() {
  const r = await db.query(`select * from public.my_entitlement()`)
  return r.rows[0]
}
/** دفعة صكوك باسم مؤسس فعلي — تعيد قائمة الخام (آخر مرّة تظهر فيها). */
async function issuePurchase(label, count, reason = 'wave-1 proof') {
  await asRole(db, 'authenticated', founderId)
  const r = await db.query(
    `select public.founder_issue_purchase_batch($1, $2, $3) as res`, [reason, label, count])
  return r.rows[0].res
}
/** معرّف صفّ الكود من خامه — بالبصمة لا بالترتيب (صفوف الدفعة تتشارك created_at). */
async function codeRowId(raw) {
  await asRole(db, null)
  const r = await db.query(
    `select id from public.access_codes
      where code_hash in (select ih.email_hash
                          from private.identity_hashes(private.normalize_access_code($1)) ih)`, [raw])
  return r.rows[0].id
}

// ═══════════════ ١) الإصدار: سلطة وشكل وسرّية ═══════════════
console.log('\n① الإصدار — سلطة المؤسس، شكل الصكّ، سرّية الخام')

await asRole(db, 'authenticated', founderId)
const batch = (await db.query(
  `select public.founder_issue_purchase_batch('إطلاق سلة — إثبات', 'SALLA-PROOF-001', 5) as res`,
)).rows[0].res
check('الدفعة تعود بخمسة صكوك', Array.isArray(batch.codes) && batch.codes.length === 5)
check('غرض الدفعة معلَن purchase', batch.grant_purpose === 'purchase')
check('سقف الإنتروبيا المعلَن ٨٠ بتًا', batch.entropy_ceiling_bits === 80)
const alphabetOk = batch.codes.every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(c))
check('كل صكّ ١٦ رمزًا من أبجدية ٣٢ (٨٠ بتًا مقيسة)', alphabetOk, batch.codes.join(' '))
check('لا تكرار داخل الدفعة', new Set(batch.codes).size === batch.codes.length)

await asRole(db, null)
const rows = await db.query(
  `select grant_purpose, duration_days, max_redemptions, generated_server_side, enabled,
          code_hash, label
     from public.access_codes where label = 'SALLA-PROOF-001'`)
check('خمسة صفوف بغرض purchase', rows.rows.length === 5 && rows.rows.every((r) => r.grant_purpose === 'purchase'))
check('صكّ الشراء بلا مدّة (duration_days IS NULL)', rows.rows.every((r) => r.duration_days === null))
check('صكّ الشراء مفرد الاستخدام بنيويًّا', rows.rows.every((r) => r.max_redemptions === 1))
check('التوليد خادمي مسجَّل', rows.rows.every((r) => r.generated_server_side === true))
// سرّية الخام: الجدول يحمل بصمة sha256 hex لا النصّ — والنصّ لا يُستعاد.
const hashesLookHashed = rows.rows.every((r) => /^[0-9a-f]{64}$/.test(r.code_hash))
check('المخزون بصمات sha256 لا نصوص (لا استرداد للخام من القاعدة)', hashesLookHashed)
// ═══ [COMMERCE-W1-HARDENING] كان هنا تأكيدٌ **لا يقول شيئًا** ═══
// كان: `where code_hash = any($1)` — يقارن بصمات ٦٤ خانة ستّ‌عشرية بأكواد من
// ١٦ رمزًا من أبجدية كبيرة. فمتى صحّ الفحص أعلاه (كلّها بصمات) استحال أن يعود
// هذا بصفٍّ — **تحصيل حاصل**، ويحمل مع ذلك دعوى عامّة: «لا استرداد للخام من
// القاعدة». والدعوى عامّة والقياس عمودٌ واحد (§4.2: مرورٌ غير مستحقّ ليس نجاحًا).
//
// فيُقاس ما يُدَّعى: مسحٌ شامل لكل جدول أساس في القاعدة عن **نصّ** أيّ صكّ —
// أيًّا كان العمود الذي قد يحمله (سبب · وسم · أثر تدقيق · حمولة jsonb).
const leaks = await db.query(`
  do $do$
  declare r record; n bigint; pats text[] := $1::text[]; found text := '';
  begin
    for r in select table_schema s, table_name t from information_schema.tables
              where table_type = 'BASE TABLE'
                and table_schema not in ('pg_catalog','information_schema') loop
      execute format('select count(*) from %I.%I x where x::text ilike any($1)', r.s, r.t)
        into n using pats;
      if n > 0 then found := found || format('%s.%s(%s) ', r.s, r.t, n); end if;
    end loop;
    if found <> '' then raise exception 'PLAINTEXT_LEAK: %', found; end if;
  end $do$;`.replace('$1::text[]', `array[${batch.codes.map((c) => `'%${c}%'`).join(',')}]`))
  .then(() => ({ leak: null }))
  .catch((e) => ({ leak: String(e.message || e) }))
check('لا نصّ صكٍّ واحد في **أي جدول** بالقاعدة — مسحٌ شامل لا عمودٌ واحد',
  leaks.leak === null, leaks.leak || 'نظيفة')
// ⚔️ ومحاكاة تسريب: لو حطّ الخام في أي عمود نصّي لالتُقط — فالمسح ليس أعمى.
await db.query(`update public.access_codes set created_reason = '${batch.codes[0]}'
                 where label = 'SALLA-PROOF-001'`)
const leakSim = await db.query(`
  do $do$
  declare r record; n bigint; found text := '';
  begin
    for r in select table_schema s, table_name t from information_schema.tables
              where table_type = 'BASE TABLE'
                and table_schema not in ('pg_catalog','information_schema') loop
      execute format('select count(*) from %I.%I x where x::text ilike any($1)', r.s, r.t)
        into n using array['%${batch.codes[0]}%'];
      if n > 0 then found := found || format('%s.%s ', r.s, r.t); end if;
    end loop;
    if found <> '' then raise exception 'PLAINTEXT_LEAK: %', found; end if;
  end $do$;`).then(() => ({ leak: null })).catch((e) => ({ leak: String(e.message || e) }))
check('⚔️ ولو دُسّ الخام في created_reason لالتقطه المسح باسم الجدول',
  leakSim.leak !== null && /access_codes/.test(leakSim.leak), leakSim.leak || 'لم يُلتقط — المسح أعمى')
await db.query(`update public.access_codes set created_reason = 'proof restore'
                 where label = 'SALLA-PROOF-001'`)

// السلطة: غير المؤسس والمجهول والدعم كلّهم مردودون باسم الرفض.
const plainId = await makeUser(db, 'plain@qimmah.test')
await asRole(db, 'authenticated', plainId)
await mustFail('مستخدم عاديّ لا يُصدر صكوك شراء',
  () => db.query(`select public.founder_issue_purchase_batch('r', 'X-BATCH', 1)`), 'founder_role_required')
await asRole(db, 'anon', null)
await mustFail('anon لا يبلغ الإصدار أصلًا',
  () => db.query(`select public.founder_issue_purchase_batch('r', 'X-BATCH', 1)`), 'permission denied')
await asRole(db, 'authenticated', founderId)
await mustFail('دفعة بلا وسم تُرفض باسمها — مخزون بلا اسم لا يُدقَّق',
  () => db.query(`select public.founder_issue_purchase_batch('r', null, 1)`), 'purchase_batch_label_required')
await mustFail('دفعة فوق ٥٠٠ تُرفض باسمها',
  () => db.query(`select public.founder_issue_purchase_batch('r', 'BIG', 501)`), 'batch_count_out_of_range')
await mustFail('سبب فارغ يُرفض',
  () => db.query(`select public.founder_issue_purchase_batch('', 'X', 1)`), 'reason required')

// ═══════════════ ٢) الاسترداد: Premium دائم عبر سلطة واحدة ═══════════════
console.log('\n② الاسترداد — noAccess → premiumActive، والأثر في سجلّ الشراء')

const buyerId = await makeUser(db, 'buyer@qimmah.test')
const codeA = batch.codes[0]
await asRole(db, 'authenticated', buyerId)
let res = await redeemV2(codeA)
check('الاسترداد الأول يعيد premiumActive قيمةً', res.outcome === 'premiumActive', JSON.stringify(res))
let st = await myState()
check('my_entitlement: premiumActive دائم بلا انتهاء',
  st.state === 'premiumActive' && st.no_expiry === true && st.expires_at === null)
check('المصدر purchase_code — أثرٌ يقول من أين جاء', st.source === 'purchase_code')

await asRole(db, null)
const ledger = await db.query(
  `select p.provider, p.provider_order_id, p.amount_minor, p.raw ->> 'label' as label
     from public.purchase_ledger p
     join public.access_codes c on c.id::text = p.provider_order_id
    where c.label = 'SALLA-PROOF-001'`)
check('سجلّ الشراء كُتب: provider=purchase_code، order=معرّف الصكّ',
  ledger.rows.length === 1 && ledger.rows[0].provider === 'purchase_code')
check('المبلغ NULL — لا نعلم ما دُفع في سلة ولا نخترع رقمًا', ledger.rows[0].amount_minor === null)
check('وسم الدفعة محفوظ في أثر الشراء', ledger.rows[0].label === 'SALLA-PROOF-001')
const entRow = await db.query(
  `select entitlement_type, source, no_expiry, activation_code_id from public.entitlements e
     join auth.users u on u.id = e.user_id where u.email = 'buyer@qimmah.test'`)
check('صفّ منحة واحد: premium + no_expiry + ربط بالصكّ',
  entRow.rows.length === 1 && entRow.rows[0].entitlement_type === 'premium'
  && entRow.rows[0].no_expiry === true && entRow.rows[0].activation_code_id !== null)

// ── هجوم ١٦/٣: المعاملة أُثبتت والردّ ضاع — إعادة المحاولة تتقارب لا تُعاقِب ──
await asRole(db, 'authenticated', buyerId)
res = await redeemV2(codeA)
check('إعادة محاولة صاحب الصكّ تعيد premiumActive قيمةً (idempotent)',
  res.outcome === 'premiumActive', JSON.stringify(res))
await asRole(db, null)
const codeARow = await codeRowId(codeA)
const after = await db.query(
  `select (select count(*)::int from public.purchase_ledger) as pl,
          (select redemption_count from public.access_codes where id = $1) as rc,
          (select count(*)::int from public.entitlements e join auth.users u on u.id = e.user_id
            where u.email = 'buyer@qimmah.test') as ents`, [codeARow])
check('لا أثر مزدوج: سجلّ شراء واحد، عدّاد استرداد = ١، منحة واحدة',
  after.rows[0].pl === 1 && after.rows[0].rc === 1 && after.rows[0].ents === 1,
  JSON.stringify(after.rows[0]))

// ── هجوم ٢ (تسلسلي): مستخدم آخر على صكّ مستهلَك — رفض عامّ بلا أوراكل ──
const rivalId = await makeUser(db, 'rival@qimmah.test')
await asRole(db, 'authenticated', rivalId)
res = await redeemV2(codeA)
check('هجوم: مستخدم آخر على صكّ مستهلَك ⇒ invalid_code (نفس رسالة المجهول)',
  res.outcome === 'failed' && res.reason.includes('invalid_code'), JSON.stringify(res))
await asRole(db, null)
const rivalEnt = await db.query(
  `select count(*)::int as n from public.entitlements e join auth.users u on u.id = e.user_id
    where u.email = 'rival@qimmah.test'`)
check('ولم تُسكّ له أي منحة', rivalEnt.rows[0].n === 0)

// ── هجوم ٤/٥/٦: تزوير وتشويه وتطبيع ──
await asRole(db, 'authenticated', rivalId)
res = await redeemV2('QQQQQQQQQQQQQQQQ')
check('هجوم: صكّ مُخمَّن ⇒ invalid_code', res.outcome === 'failed' && res.reason.includes('invalid_code'))
res = await redeemV2('ＱＩＭＭＡＨ２３４５６７８９ＡＢ')
check('هجوم: يونيكود متشابه (fullwidth) ⇒ invalid_code لا سقوط تقني',
  res.outcome === 'failed' && res.reason.includes('invalid_code'), JSON.stringify(res))
res = await redeemV2('')
check('هجوم: مدخل فارغ ⇒ invalid_code', res.outcome === 'failed' && res.reason.includes('invalid_code'))
// التطبيع المتعاقد: قصّ الأطراف ورفع الحالة — صكّ حقيقي بحروف صغيرة ومسافات يمرّ.
const codeB = batch.codes[1]
const buyer2 = await makeUser(db, 'buyer2@qimmah.test')
await asRole(db, 'authenticated', buyer2)
res = await redeemV2(`  ${codeB.toLowerCase()}  `)
check('مسافات + أحرف صغيرة تُطبَّع ويُقبل الصكّ (عقد normalize)',
  res.outcome === 'premiumActive', JSON.stringify(res))

// ── هجوم ٧: صكّ معطَّل وصكّ منتهي النافذة ──
const codeC = batch.codes[2]
const codeCId = await codeRowId(codeC)
await asRole(db, 'authenticated', founderId)
await db.query(`select public.founder_set_code_enabled($1, false, 'سحب من التداول — إثبات')`, [codeCId])
const buyer3 = await makeUser(db, 'buyer3@qimmah.test')
await asRole(db, 'authenticated', buyer3)
res = await redeemV2(codeC)
check('صكّ معطَّل ⇒ invalid_code (نفس الرسالة العامّة)',
  res.outcome === 'failed' && res.reason.includes('invalid_code'))
await asRole(db, 'authenticated', founderId)
await db.query(`select public.founder_set_code_enabled($1, true, 'إعادة للتداول — إثبات')`, [codeCId])
await asRole(db, null)
// نافذة منتهية صالحة الشكل: البداية قبل النهاية وكلاهما في الماضي (قيد access_codes_window).
await db.query(`update public.access_codes
                   set starts_at = now() - interval '2 hours',
                       expires_at = now() - interval '1 hour'
                 where id = $1`, [codeCId])
await asRole(db, 'authenticated', buyer3)
res = await redeemV2(codeC)
check('صكّ منتهي النافذة ⇒ invalid_code', res.outcome === 'failed' && res.reason.includes('invalid_code'))

// ── بريد غير مؤكَّد لا يستلم منحة شراء ──
const unverified = await makeUser(db, 'unverified@qimmah.test', false)
await asRole(db, 'authenticated', unverified)
res = await redeemV2(batch.codes[3])
check('بريد غير مؤكَّد ⇒ email_not_verified (لا منحة على هوية غير مثبتة)',
  res.outcome === 'failed' && res.reason.includes('email_not_verified'))

// ═══════════════ ٣) الانتقالات: التجربة والوصول الموقوت يرقيان ولا يهبطان ═══════════════
console.log('\n③ الانتقالات — trial/special → premium، وPremium لا تُخفَّض')

// هجوم ١٠: تجربة نشطة + صكّ شراء ⇒ ترقية.
const trialUser = await makeUser(db, 'trial-up@qimmah.test')
await asRole(db, 'authenticated', trialUser)
await db.query(`select public.start_trial()`)
st = await myState()
check('التمهيد: trialActive', st.state === 'trialActive')
const upBatch = await issuePurchase('SALLA-PROOF-UP', 3)
await asRole(db, 'authenticated', trialUser)
res = await redeemV2(upBatch.codes[0])
check('trialActive → premiumActive بالصكّ', res.outcome === 'premiumActive')
st = await myState()
check('المنحة صارت دائمة والمصدر purchase_code',
  st.state === 'premiumActive' && st.no_expiry === true && st.source === 'purchase_code')
await asRole(db, null)
const trialLedgerKept = await db.query(`select count(*)::int as n from public.trial_ledger`)
check('سجلّ التجربة الدائم لم يُمسّ بالترقية', trialLedgerKept.rows[0].n >= 1)

// هجوم ١١: تجربة منتهية ⇒ premium.
const expiredUser = await makeUser(db, 'trial-expired@qimmah.test')
await asRole(db, 'authenticated', expiredUser)
await db.query(`select public.start_trial()`)
await asRole(db, null)
await db.query(`update public.entitlements set expires_at = now() - interval '1 hour'
                 where user_id = $1`, [expiredUser])
await asRole(db, 'authenticated', expiredUser)
st = await myState()
check('التمهيد: trialExpired (بوقت القاعدة لا بساعة العميل)', st.state === 'trialExpired')
res = await redeemV2(upBatch.codes[1])
check('trialExpired → premiumActive بالصكّ', res.outcome === 'premiumActive')

// هجوم ١٢: وصول موقوت (special) ⇒ premium حتمًا.
const specialUser = await makeUser(db, 'special-up@qimmah.test')
await asRole(db, 'authenticated', founderId)
const specialCode = (await db.query(
  `select public.founder_issue_access_code('إثبات ترقية', 'UPGRADE-CAMPAIGN', 14, 1) as res`)).rows[0].res
await asRole(db, 'authenticated', specialUser)
res = await redeemV2(specialCode.code)
check('التمهيد: specialAccessActive', res.outcome === 'specialAccessActive')
res = await redeemV2(upBatch.codes[2])
check('specialAccessActive → premiumActive بالصكّ — حسم حتمي لا حالة هجينة',
  res.outcome === 'premiumActive')
st = await myState()
check('لا بقايا توقيت: expires_at=null وno_expiry=true', st.expires_at === null && st.no_expiry === true)

// هجوم ١٣: حامل Premium يستردّ صكًّا آخر — يُستهلك ويُسجَّل ولا ازدواج.
const secondBatch = await issuePurchase('SALLA-PROOF-2ND', 1)
await asRole(db, 'authenticated', buyerId)
res = await redeemV2(secondBatch.codes[0])
check('Premium قائم + صكّ ثانٍ ⇒ premiumActive (الصكّ يُستهلك ويُؤرشف)',
  res.outcome === 'premiumActive')
await asRole(db, null)
const buyerLedger = await db.query(
  `select count(*)::int as n from public.purchase_ledger p
    where p.email_hash in (select ih.email_hash from private.identity_hashes('buyer@qimmah.test') ih)`)
check('أثران شرائيان لهوية واحدة — والمنحة واحدة', buyerLedger.rows[0].n === 2)

// Premium لا تُخفَّض: كود موقوت بعد Premium، وتجربة بعد Premium.
await asRole(db, 'authenticated', founderId)
const weakCode = (await db.query(
  `select public.founder_issue_access_code('إثبات عدم التخفيض', null, 7, 5) as res`)).rows[0].res
await asRole(db, 'authenticated', buyerId)
res = await redeemV2(weakCode.code)
check('كود موقوت فوق Premium ⇒ premiumActive والمنحة لا تُمسّ', res.outcome === 'premiumActive')
st = await myState()
check('المنحة بقيت premium دائمة', st.state === 'premiumActive' && st.no_expiry === true)
res = await (async () => {
  try { await db.query(`select public.start_trial()`); return { ok: true } }
  catch (e) { return { ok: false, m: String(e.message || e) } }
})()
check('التجربة فوق Premium تُرفض trial_not_applicable',
  !res.ok && res.m.includes('trial_not_applicable'), res.m ?? '')

// ═══════════════ ٤) حذف الحساب والإلغاء ═══════════════
console.log('\n④ الدوام — الشراء ينجو من حذف الحساب، والإلغاء لاصق فوقه')

// هجوم ١٤: حذف الحساب ثم إعادة التسجيل ⇒ المطالبة تستعيد Premium.
const phoenixBatch = await issuePurchase('SALLA-PROOF-PHX', 1)
const phoenix1 = await makeUser(db, 'phoenix@qimmah.test')
await asRole(db, 'authenticated', phoenix1)
res = await redeemV2(phoenixBatch.codes[0])
check('التمهيد: phoenix اشترى', res.outcome === 'premiumActive')
await db.query(`select public.delete_own_account()`)
await asRole(db, null)
await db.query(`delete from auth.users where id = $1`, [phoenix1])
const phoenixGone = await db.query(
  `select count(*)::int as n from public.entitlements where user_id = $1`, [phoenix1])
check('الحذف محا صفّ المنحة (PDPL)', phoenixGone.rows[0].n === 0)
const phoenix2 = await makeUser(db, 'phoenix@qimmah.test')
await asRole(db, 'authenticated', phoenix2)
const claim = (await db.query(`select public.claim_pending_grants() as res`)).rows[0].res
check('claim_pending_grants بعد إعادة التسجيل ⇒ premiumActive (سلطة الشراء نجت)',
  claim === 'premiumActive')
st = await myState()
check('المصدر بعد الاسترجاع purchase_code — الأثر لا يضيع', st.source === 'purchase_code')

// الإلغاء لاصق: يعلو الشراء، ولا يرفعه مسار خدمة ذاتية.
await asRole(db, 'service_role')
await db.query(`select public.admin_revoke($1, 'إثبات: الإلغاء يعلو الشراء')`, [phoenix2])
await asRole(db, 'authenticated', phoenix2)
st = await myState()
check('my_entitlement بعد الإلغاء: revoked — الحقيقة الحيّة تعلو أي خبيئة', st.state === 'revoked')
const lateBatch = await issuePurchase('SALLA-PROOF-RVK', 1)
await asRole(db, 'authenticated', phoenix2)
res = await redeemV2(lateBatch.codes[0])
check('مُلغى يحاول صكًّا جديدًا ⇒ access_revoked (لا خدمة ذاتية ترفع الحظر)',
  res.outcome === 'failed' && res.reason.includes('access_revoked'))
res = await (async () => {
  try { const r = await db.query(`select public.claim_pending_grants() as res`); return { ok: true, r: r.rows[0].res } }
  catch (e) { return { ok: false, m: String(e.message || e) } }
})()
check('والمطالبة كذلك مردودة access_revoked', !res.ok && res.m.includes('access_revoked'), res.m ?? '')

// ═══════════════ ٥) البوّابة: النداء المباشر بلا ختم مرفوض ═══════════════
console.log('\n⑤ البوّابة — الصكّ لا يمرّ من غير الختم (هجوم ٩)')
{
  const gateBatch = await issuePurchase('SALLA-PROOF-GATE', 1)
  const gateUser = await makeUser(db, 'gate-bypass@qimmah.test')
  await asRole(db, 'authenticated', gateUser)
  // الصندوق يسكّ ختمًا صالحًا آليًّا قبل كل نداء مبوَّب؛ الهجوم يمحوه في نفس
  // الدفعة قبل بلوغ الدالّة — فيصل النداء بلا ختم كما يصل من PostgREST مباشرة.
  let out
  try {
    const r = await db.query(
      `with wipe as (select set_config('request.headers', '{}', true))
       select public.redeem_access_code_v2($1) as res from wipe`, [gateBatch.codes[0]])
    out = { ok: true, res: r.rows[0].res }
  } catch (e) {
    out = { ok: false, m: String(e.message || e) }
  }
  check('هجوم: استرداد صكّ بلا ختم بوّابة ⇒ gate_stamp_invalid',
    !out.ok && out.m.includes('gate_stamp_invalid'), JSON.stringify(out).slice(0, 140))
  await asRole(db, null)
  const notConsumed = await db.query(
    `select redemption_count from public.access_codes where label = 'SALLA-PROOF-GATE'`)
  check('والصكّ لم يُستهلك في المحاولة المرفوضة', notConsumed.rows[0].redemption_count === 0)
}

// ═══════════════ ٦) قراءات المؤسس: عدّ صادق ═══════════════
console.log('\n⑥ العدّ — أربعة أقسام تجمع الصادر، ولا ادّعاء «متبقٍ في سلة»')
{
  // دفعة قياس معزولة: ٥ صادرة — ٢ مستردّة، ١ معطَّلة، ٢ غير مستردّة.
  const audit = await issuePurchase('SALLA-AUDIT-001', 5)
  const a1 = await makeUser(db, 'audit1@qimmah.test')
  const a2 = await makeUser(db, 'audit2@qimmah.test')
  await asRole(db, 'authenticated', a1)
  await redeemV2(audit.codes[0])
  await asRole(db, 'authenticated', a2)
  await redeemV2(audit.codes[1])
  await asRole(db, null)
  const disableId = (await db.query(
    `select id from public.access_codes where label = 'SALLA-AUDIT-001' and redemption_count = 0
      order by created_at limit 1`)).rows[0].id
  await asRole(db, 'authenticated', founderId)
  await db.query(`select public.founder_set_code_enabled($1, false, 'سحب — إثبات العدّ')`, [disableId])
  const b = (await db.query(
    `select * from public.founder_purchase_batches(50)`)).rows.find((r) => r.label === 'SALLA-AUDIT-001')
  check('صادر=٥ · مستردّ=٢ · معطَّل غير مستردّ=١ · غير مستردّ=٢',
    b && Number(b.codes_issued) === 5 && Number(b.codes_redeemed) === 2
    && Number(b.codes_disabled_unredeemed) === 1 && Number(b.codes_unredeemed) === 2,
    JSON.stringify(b))
  check('الأقسام تجمع الصادر جمعًا تامًّا — لا تقاطع ولا فجوة',
    b && Number(b.codes_redeemed) + Number(b.codes_disabled_unredeemed)
      + Number(b.codes_expired_unredeemed) + Number(b.codes_unredeemed) === Number(b.codes_issued))
  check('آخر استرداد مقروء', b && b.last_redeemed_at !== null)
  // الصدق الاصطلاحي: لا عمود يدّعي علم مكان الصكّ.
  const cols = (await db.query(
    `select array_to_string(proargnames, ',') as names from pg_proc
      where proname = 'founder_purchase_batches'`)).rows[0].names
  check('لا عمود «remaining/سلة» — «غير مستردّ» هو أقصى ما نعلمه',
    !/remaining|salla_stock/i.test(cols), cols)

  // الفرز: حملات الوصول الموقوت لا ترى مخزون الشراء، والعكس صحيح.
  const specials = (await db.query(`select * from public.founder_code_batches(100)`)).rows
  check('founder_code_batches لا يعرض دفعات الشراء',
    !specials.some((r) => String(r.label ?? '').startsWith('SALLA-')),
    specials.map((r) => r.label).join(' | '))
  check('وحملة الوصول الموقوت ظاهرة فيه', specials.some((r) => r.label === 'UPGRADE-CAMPAIGN'))
  const purchases = (await db.query(`select * from public.founder_purchase_batches(100)`)).rows
  check('founder_purchase_batches لا يعرض الحملات الموقوتة',
    !purchases.some((r) => r.label === 'UPGRADE-CAMPAIGN'))

  // صفحة الأكواد ترى الغرض ولا تكسر مفردات الحالة.
  const page = (await db.query(
    `select * from public.founder_code_page('SALLA-AUDIT-001', 1, 20)`)).rows
  check('صفحة الأكواد: صفوف الشراء بغرض معلَن ومدّة NULL',
    page.length === 5 && page.every((r) => r.grant_purpose === 'purchase' && r.duration_days === null))
  const vocab = new Set(['issued', 'redeemed', 'expired', 'disabled'])
  check('ومفردات الحالة الأربع لم تتوسّع (عقد العميل)',
    page.every((r) => vocab.has(r.status)))
  // الدعم يقرأ العدّ ولا يُصدر.
  const supportId = await makeUser(db, 'support@qimmah.test')
  await asRole(db, 'service_role')
  await db.query(`select public.admin_set_role('support@qimmah.test', 'support', 'إثبات')`)
  await asRole(db, 'authenticated', supportId)
  const supportRead = (await db.query(`select * from public.founder_purchase_batches(5)`)).rows
  check('الدعم يقرأ عدّ المخزون (require_admin)', supportRead.length >= 1)
  await mustFail('والدعم لا يُصدر صكوكًا (require_founder)',
    () => db.query(`select public.founder_issue_purchase_batch('r', 'SUPPORT-TRY', 1)`), 'founder_role_required')
}

// ═══════════════ ٧) حدّ المعدّل قائم على مسار الصكّ ═══════════════
console.log('\n⑦ حدّ المعدّل — عشر محاولات فاشلة تقفل النافذة')
{
  const limitUser = await makeUser(db, 'limit@qimmah.test')
  await asRole(db, 'authenticated', limitUser)
  let sawRateLimit = false
  for (let i = 0; i < 12; i++) {
    const r = await redeemV2(`WRONGWRONGWRON${String(i % 10).repeat(2)}`)
    if (r.outcome === 'rate_limited') { sawRateLimit = true; break }
  }
  check('المحاولة الفاشلة المتكرّرة تبلغ rate_limited (الحدّ يعمل على الصكوك)', sawRateLimit)
}

// ═══════════════ ٨) التأكيد المضادّ (§4.2) ═══════════════
console.log('\n⑧ التأكيد المضادّ — الشكل يُهاجَم والسلوك القديم لم يُمسّ')

// الوصول الموقوت المفرد: إعادة محاولة صاحبه تبقى invalid_code — **لم نغيّرها**.
{
  await asRole(db, 'authenticated', founderId)
  const single = (await db.query(
    `select public.founder_issue_access_code('عقد قديم', null, 7, 1) as res`)).rows[0].res
  const oldUser = await makeUser(db, 'old-contract@qimmah.test')
  await asRole(db, 'authenticated', oldUser)
  let r = await redeemV2(single.code)
  check('التمهيد: كود موقوت مفرد استُردّ', r.outcome === 'specialAccessActive')
  r = await redeemV2(single.code)
  check('التأكيد المضادّ: إعادة محاولة الكود الموقوت بقيت invalid_code (السلوك القديم حرفيًّا)',
    r.outcome === 'failed' && r.reason.includes('invalid_code'), JSON.stringify(r))
}
// الشكل محروس بالقيود لا بالنوايا: عبث مباشر يُرفض باسم القيد.
await asRole(db, null)
await mustFail('عبث: صكّ شراء بتعدّد استخدام يُرفض بنيويًّا',
  () => db.query(`update public.access_codes set max_redemptions = 5
                   where label = 'SALLA-PROOF-2ND'`), 'access_codes_purchase_single_use')
await mustFail('عبث: صكّ شراء بمدّة يُرفض بنيويًّا',
  () => db.query(`update public.access_codes set duration_days = 30
                   where label = 'SALLA-PROOF-2ND'`), 'access_codes_purpose_duration_shape')
await mustFail('عبث: غرض خارج المفردات يُرفض',
  () => db.query(`update public.access_codes set grant_purpose = 'gift'
                   where label = 'SALLA-PROOF-2ND'`), 'access_codes_purpose')
await mustFail('عبث: provider خارج المفردات في سجلّ الشراء يُرفض',
  () => db.query(`insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version, recorded_by)
                  values ('gumroad', 'X-1', 'deadbeef', 1, 'proof:tamper')`), 'purchase_ledger_provider_check')
// ولو أخطأ القفل يومًا: القيد البنيوي يمنع تجاوز الحدّ — الحزام الثاني حيّ.
await mustFail('الحزام البنيوي: العدّاد لا يتجاوز الحدّ ولو عُبث به مباشرة',
  () => db.query(`update public.access_codes set redemption_count = 2
                   where label = 'SALLA-PROOF-2ND'`), 'access_codes_within_limit')

// نسخة ما قبل الهجرة: القدرة غائبة كلّها — فمصدرها هذه الهجرة لا غيرها.
{
  const { db: oldDb } = await createSandbox({ exclude: [MIG, MIG_HARDENING] })
  const missing = (await oldDb.query(
    `select to_regprocedure('public.founder_issue_purchase_batch(text, text, int, timestamptz)') as f1,
            to_regprocedure('public.founder_purchase_batches(int)') as f2,
            to_regprocedure('private.grant_premium_from_code(uuid, text, uuid, text, text, int)') as f3`)).rows[0]
  check('قبل الهجرة: لا إصدار صكوك ولا عدّ ولا سلطة منح — القدرة ابنة هجرتها',
    missing.f1 === null && missing.f2 === null && missing.f3 === null)
  const oldCol = await oldDb.query(
    `select count(*)::int as n from information_schema.columns
      where table_name = 'access_codes' and column_name = 'grant_purpose'`)
  check('قبل الهجرة: لا عمود غرض', oldCol.rows[0].n === 0)
  await oldDb.close?.()
}

// ═══════════════ الخلاصة ═══════════════
const failCount = results.length - pass
console.log(`\n${failCount === 0 ? '🎉' : '🔴'} صكوك الشراء: ${pass} نجحت / ${failCount} فشلت (المجموع ${results.length})`)
if (failCount > 0) {
  for (const r of results.filter((x) => !x.ok)) console.log(`   ✗ ${r.name}`)
  process.exit(1)
}
