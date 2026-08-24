// ============================================================================
// رحلات التكليف — [COMMISSIONING §16] على قاعدة Postgres **حقيقية**
// ============================================================================
// هذا الطقم لا يفحص وجود الملفّات ولا شكل SQL. يفحص **قصص المستخدم**:
//
//   • حسابٌ جديد يبدأ تجربة، فتعمل Premium، وتصمد، وتنتهي بحُكم الخادم.
//   • طلبُ سلة يُفَى مرّة واحدة بالضبط — ولو تكرّر الويبهوك أو تسابق.
//   • مشترٍ بلا حساب يُحفَظ له الشراء، ثم يُطالِب به بعد التسجيل فيصير Premium.
//   • كودٌ يُصدَر ويُستهلَك مرّة، ولا يُستهلَك مرّتين **ولو من اتصالين متزامنين**.
//   • مؤسس يجد المستخدم ويفهم **لماذا** عنده Premium.
//
// ولماذا Postgres حقيقي لا PGlite: الرحلات الثلاث المُعلَّمة ⟂ أدناه تحتاج
// **اتصالين يتسابقان فعلًا**. وPGlite اتصالٌ واحد، فتمرّ فيها هذه الفحوص
// مجّانًا — تبدو خضراء وهي غير مُختبَرة (§4.2).
// ============================================================================
import { createStaging, makeUser, provision, clusterAvailable } from './lib/pg-staging.mjs'

let pass = 0
const fails = []
const check = (label, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}
/**
 * الاسترداد من منظور العميل — **`_v2` حصرًا**، لأن `20260824120004` نزعت وصول
 * العميل إلى الغلاف القديم (كان يلتفّ على حدّ المعدّل بتبديل الاسم).
 * و`_v2` تُعيد الفشل **قيمةً** لا استثناءً، فيُعاد الرفعُ هنا كي تبقى تأكيدات
 * `refuses` أدناه تفحص **اسم السبب** كما كانت بالضبط.
 */
function redeem(code, opts) {
  const raw = JSON.parse(stg.one(`select public.redeem_access_code_v2('${code}')::text;`, opts))
  if (raw.outcome === 'failed') { const e = new Error(raw.reason); e.stderr = raw.reason; throw e }
  if (raw.outcome === 'rate_limited') { const e = new Error('rate_limited'); e.stderr = 'rate_limited'; throw e }
  return raw.outcome
}

/** ينتظر فشلًا **مسمّى**: السقوط بلا اسم ليس إثباتًا (§4.2). */
function refuses(label, fn, expected) {
  try {
    const v = fn()
    check(label, false, `لم يرفض — عاد: ${v}`)
  } catch (e) {
    const msg = String(e.stderr || e.message || e)
    const named = msg.includes(expected)
    check(`${label} — بـ«${expected}»`, named, named ? '' : msg.split('\n').find((l) => /ERROR/.test(l)) || msg.slice(0, 160))
  }
}

if (!clusterAvailable()) {
  // التخطّي **معلَن** لا صامت: طقمٌ يمرّ بلا قاعدة يكذب.
  console.log('\n⛔ EXTERNALLY_BLOCKED: لا عنقود Postgres على 127.0.0.1:55432 — الرحلات لم تُشغَّل.')
  console.log('   التشغيل: /usr/lib/postgresql/16/bin/pg_ctl -D <dir> -o "-p 55432" start')
  process.exit(2)
}

console.log('\n══════════════════════════════════════════════════════════════')
console.log('  رحلات تكليف قِمّة — Postgres حقيقي، هجرات المستودع كاملة')
console.log('══════════════════════════════════════════════════════════════')

const stg = createStaging()
check(`الهجرات تُطبَّق من قاعدة نظيفة (${stg.applied.length})`, stg.failed.length === 0,
  stg.failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
if (stg.failed.length) { stg.drop(); process.exit(1) }

// الملح أوّلًا (لا يحتاج حسابًا)، ثم يُنشأ حساب المؤسس، ثم يُمنح الدور — وهذا
// ترتيب التكليف الحقيقي: لا يمكن منح دورٍ لحسابٍ لم يُنشأ بعد.
const steps = provision(stg)
const founderId = makeUser(stg, 'founder@qimmah.test')
steps.push(...provision(stg, { founderEmail: 'founder@qimmah.test' }).filter((x) => x.startsWith('founder')))
console.log(`  ⚙ تهيئة تشغيلية: ${steps.join(' · ')}`)

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n① التجربة الحقيقية — منحة خادم، مرّة واحدة، بحدّ زمني')
// ═══════════════════════════════════════════════════════════════════════════
const alice = makeUser(stg, 'alice@example.test')
// `my_entitlement()` تُرجِع **صفًّا** حالته `noAccess` لا NULL — وهذا أصدق:
// «لا استحقاق» جوابٌ معلَن، لا فراغٌ يُفسَّر في المتصفّح.
check('حساب جديد حالته `noAccess` — جوابٌ معلَن لا فراغ',
  stg.one('select (public.my_entitlement()).state;', { role: 'authenticated', uid: alice }) === 'noAccess')

check('«جرّب Premium» تمنح تجربة', stg.one('select public.start_trial();', { role: 'authenticated', uid: alice }) === 'trialActive')

const ent = stg.one(`select json_build_object(
    'state', (public.my_entitlement()).state,
    'type',  (public.my_entitlement()).entitlement_type,
    'hours', round(extract(epoch from ((public.my_entitlement()).expires_at - (public.my_entitlement()).activated_at))/3600)
  )::text;`, { role: 'authenticated', uid: alice })
const parsed = JSON.parse(ent)
check('الحالة `trialActive` ونوعها `trial`', parsed.state === 'trialActive' && parsed.type === 'trial', ent)
check('والمدّة ٧٢ ساعة بالضبط — لا تقريب', Number(parsed.hours) === 72, ent)

refuses('تجربة ثانية لنفس الهوية مرفوضة', () => stg.one('select public.start_trial();', { role: 'authenticated', uid: alice }), 'trial_already_used')

const ghost = makeUser(stg, 'ghost@example.test', { confirmed: false })
refuses('بريد غير مُوثَّق لا يبدأ تجربة', () => stg.one('select public.start_trial();', { role: 'authenticated', uid: ghost }), 'email_not_verified')

refuses('ومجهول الهوية لا يبدأ شيئًا', () => stg.one('select public.start_trial();', { role: 'authenticated', uid: null }), 'not authenticated')

// **حذف الحساب لا يرفع الحدّ**: نفس البريد بحساب جديد يبقى ممنوعًا.
stg.sql(`delete from auth.users where id = '${alice}';`)
const aliceAgain = makeUser(stg, 'alice@example.test')
refuses('حذف الحساب وإعادة التسجيل لا يمنحان تجربة ثانية',
  () => stg.one('select public.start_trial();', { role: 'authenticated', uid: aliceAgain }), 'trial_already_used')

// انتهاء التجربة **بحُكم الخادم** لا بساعة المتصفّح.
// (يُقاس على صاحب تجربةٍ فعليّة — `aliceAgain` رُفض فلا صفَّ له أصلًا.)
const eve = makeUser(stg, 'eve@example.test')
stg.one('select public.start_trial();', { role: 'authenticated', uid: eve })
stg.sql(`update public.entitlements set activated_at = now() - interval '80 hours',
                                        expires_at  = now() - interval '8 hours'
         where user_id = '${eve}';`)
const expired = stg.one('select (public.my_entitlement()).state;', { role: 'authenticated', uid: eve })
check('وبعد ٧٢ ساعة تصير `trialExpired` — والخادم هو من يقرّر', expired === 'trialExpired', `عاد: ${expired}`)
// ⚔️ وساعة المتصفّح لا تُطيلها: الحالة مشتقّة من `now()` في القاعدة.
check('⚔️ ولا يملك المتصفّح إطالتها — الاشتقاق من ساعة الخادم',
  stg.one("select prosrc like '%now()%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='derive_state';") === 't')

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n② سلة → Premium — مرّة واحدة بالضبط')
// ═══════════════════════════════════════════════════════════════════════════
const buyer = makeUser(stg, 'buyer@example.test')
const ORDER = 'SALLA-ORDER-1001'
const ING = (fp, grant = true, email = 'buyer@example.test', order = ORDER) =>
  stg.one(`select public.salla_ingest_event('${fp}','order.payment.updated','${order}','${email}',1999,'SAR','completed',${grant},null);`,
    { role: 'service_role' })

// العقد المُعلَن: النجاح `processed` (والسبب الداخلي يُحفظ في سطر التدقيق).
check('ويبهوك مدفوع يُفَى', ING('fp-001') === 'processed')
check('والمشتري صار Premium', stg.one("select (public.my_entitlement()).state;", { role: 'authenticated', uid: buyer }) === 'premiumActive')
check('بلا انتهاء — شراءٌ واحد لا اشتراك', stg.one("select (public.my_entitlement()).no_expiry;", { role: 'authenticated', uid: buyer }) === 't')

check('⟂ ويبهوك مكرَّر ببصمة مطابقة = `duplicate` بلا أثر', ING('fp-001') === 'duplicate')
check('⟂ وإعادة الإرسال ببصمة **جديدة** لا تمنح مرّتين — سجلّ شراء واحد',
  ING('fp-002') === 'processed' && stg.one(`select count(*) from public.purchase_ledger where provider_order_id = '${ORDER}';`) === '1')

// الطلب نفسه ببريدٍ آخر: خطأٌ **دائم**، فلا يُرمى إلى سلة (وإلا أعادت المحاولة
// إلى الأبد) بل يُسجَّل `rejected` ليراه إنسان. والمهمّ أنه **لا يمنح ولا يبدّل**.
const mismatch = ING('fp-003', true, 'someone-else@example.test')
check('وطلبٌ بنفس الرقم ببريد آخر يُصنَّف `rejected` — لا يُمنح ولا يُبدَّل',
  mismatch === 'rejected', `عاد: ${mismatch}`)
check('  والسبب المسجَّل يسمّي تضارب الهوية',
  (stg.one(`select reason from public.salla_webhook_events where event_fingerprint = 'fp-003';`) || '').includes('purchase_identity_mismatch'))
check('  وسجلّ الشراء ما زال واحدًا ببريد المشتري الأصلي',
  stg.one(`select count(*) from public.purchase_ledger where provider_order_id = '${ORDER}';`) === '1')

check('وطلب غير مدفوع يُصنَّف `ignored` لا يُمنح',
  stg.one(`select public.salla_ingest_event('fp-unpaid','order.created','SALLA-9','x@example.test',1999,'SAR','pending',false,'unpaid_or_incomplete');`, { role: 'service_role' }) === 'ignored')

refuses('وبصمة فارغة تُرفض — لا ابتلاع صامت',
  () => stg.one(`select public.salla_ingest_event('','e','o','x@example.test',1,'SAR','completed',true,null);`, { role: 'service_role' }), 'ingest_fingerprint_missing')

// ── مشترٍ بلا حساب: الشراء يُحفَظ ثم يُطالَب به ─────────────────────────────
console.log('\n  ── مشترٍ لم ينشئ حسابًا بعد')
// لا حساب ⇒ `admin_grant_premium` تعيد `pending_claim`، والويبهوك يُنهي `processed`
// (الطلب **عولج**)، والشراء ينتظر في السجلّ.
check('الشراء يُسجَّل ولو بلا حساب — والويبهوك يُنهي بنجاح',
  ING('fp-100', true, 'later@example.test', 'SALLA-ORDER-2002') === 'processed')
check('  والسبب المسجَّل `pending_claim` — منحةٌ تنتظر صاحبها',
  (stg.one(`select reason from public.salla_webhook_events where event_fingerprint = 'fp-100';`) || '').includes('pending_claim'))
const later = makeUser(stg, 'later@example.test')
check('ثم التسجيل يُطالِب به فيصير Premium',
  stg.one('select public.claim_pending_grants();', { role: 'authenticated', uid: later }) === 'premiumActive')
check('والمطالبة مرّة ثانية لا تضاعف شيئًا',
  stg.one('select public.claim_pending_grants();', { role: 'authenticated', uid: later }) === 'premiumActive'
  && stg.one(`select count(*) from public.entitlements where user_id = '${later}';`) === '1')

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n③ أكواد التفعيل — إصدار · استهلاك · تسابق · إبطال')
// ═══════════════════════════════════════════════════════════════════════════
// [20260824120005] الأكواد لم تعد تُكتب بيد — تُولَّد ويُلتقط نصّها من الرد
// **مرّة واحدة**. وهذا هو نفس ما يفعله المؤسس في وحدة التحكّم بالضبط.
const ISSUED_A = JSON.parse(stg.one(
  `select public.founder_issue_access_code('commissioning', 'batch-A', 14, 1)::text;`,
  { role: 'authenticated', uid: founderId }))
const CODE = ISSUED_A.code
check('المؤسس يُصدر كودًا من الخادم', typeof CODE === 'string' && CODE.length === 16, String(CODE))

const carol = makeUser(stg, 'carol@example.test')
check('المستخدم يستهلكه فيُمنح',
  redeem(CODE, { role: 'authenticated', uid: carol }) === 'specialAccessActive')
refuses('وإعادة استهلاكه مرفوضة',
  () => redeem(CODE, { role: 'authenticated', uid: carol }), 'invalid_code')

// **دمجٌ متعمّد لا كسل:** المستنفَد والمجهول والمُبطَل كلّها `invalid_code`،
// فلا يصير الردّ عرّافًا يكشف أيّ الأكواد حقيقي.
// والكود لا يُخزَّن نصًّا: تسريب القاعدة لا يسرّب أكوادًا صالحة.
check('والأكواد مخزَّنة مجزّأة لا نصًّا — لا عمود نصّ صريح',
  stg.one(`select count(*) from information_schema.columns
           where table_schema='public' and table_name='access_codes'
             and column_name in ('code','code_plain','code_normalized');`) === '0')
check('  والمُصدَر لا يوجد نصًّا في أي صفّ',
  stg.one(`select count(*) from public.access_codes where code_hash = '${CODE}';`) === '0')

// ⟂ التسابق الحقيقي: اتصالان مستقلّان على كودٍ بحصّة واحدة.
const raceIssued = JSON.parse(stg.one(`select public.founder_issue_access_code('race', 'batch-R', 14, 1)::text;`, { role: 'authenticated', uid: founderId }))
const r1 = makeUser(stg, 'race1@example.test')
const r2 = makeUser(stg, 'race2@example.test')
const results = await stg.race(
  [`select public.redeem_access_code_v2('${raceIssued.code}');`, `select public.redeem_access_code_v2('${raceIssued.code}');`],
  [{ role: 'authenticated', uid: r1 }, { role: 'authenticated', uid: r2 }]
)
const granted = results.filter((r) => r.code === 0 && r.out.includes('specialAccessActive')).length
check('⟂ اتصالان متزامنان على كودٍ بحصّة واحدة ⇒ منحة واحدة بالضبط', granted === 1,
  `منح=${granted} · ${results.map((r) => `[${r.code}] ${r.out || r.err.split('\n').find((l) => /ERROR/.test(l)) || ''}`).join(' | ')}`)
check('⟂ والسجلّ يحمل استهلاكًا واحدًا لا اثنين',
  stg.one(`select count(*) from public.code_redemption_ledger l
           join public.access_codes c on c.id = l.code_id where c.label = 'batch-R';`) === '1')
check('⟂ وعدّاد الكود نفسه واحد — لا تجاوز للحصّة',
  stg.one(`select redemption_count from public.access_codes where label = 'batch-R';`) === '1')

// الإبطال قبل الاستهلاك.
const revokeIssued = JSON.parse(stg.one(`select public.founder_issue_access_code('to-revoke', 'batch-X', 14, 1)::text;`, { role: 'authenticated', uid: founderId }))
const codeId = stg.one(`select id::text from public.access_codes where label = 'batch-X';`)
stg.one(`select public.founder_set_code_enabled('${codeId}', false, 'commissioning revoke');`, { role: 'authenticated', uid: founderId })
const dave = makeUser(stg, 'dave@example.test')
refuses('كودٌ مُبطَل لا يُستهلَك',
  () => redeem(revokeIssued.code, { role: 'authenticated', uid: dave }), 'invalid_code')

refuses('وكودٌ مجهول يُرفض بردٍّ عامّ',
  () => redeem('ZZZZQMMAH999', { role: 'authenticated', uid: dave }), 'invalid_code')

// وسلطة الإصدار للمؤسس وحده — لا يصدرها مستخدم عادي.
refuses('⚔️ ومستخدم عادي لا يُصدر أكوادًا',
  () => stg.one(`select public.founder_issue_access_code('attack', 'x', 14, 1, null, null);`, { role: 'authenticated', uid: carol }), 'founder_role_required')

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n④ سلطة المؤسس — من الخادم، ولا تُزوَّر من المتصفّح')
// ═══════════════════════════════════════════════════════════════════════════
const snap = stg.one('select public.founder_executive_snapshot()::text;', { role: 'authenticated', uid: founderId })
check('المؤسس يقرأ اللقطة التنفيذية', typeof snap === 'string' && snap.startsWith('{'), String(snap).slice(0, 120))

refuses('ومستخدم عادي لا يقرؤها',
  () => stg.one('select public.founder_executive_snapshot();', { role: 'authenticated', uid: carol }), 'founder_role_required')
// الزائر المجهول يُردّ **قبل** الدالّة: `execute` منزوع عنه أصلًا. وهذا أقوى
// لا أضعف — طبقتان لا واحدة، فحتى لو رخا الحارس الداخلي يومًا لبقي الباب مغلقًا.
refuses('وزائر مجهول يُردّ قبل الدالّة — `execute` منزوع',
  () => stg.one('select public.founder_executive_snapshot();', { role: 'anon', uid: null }), 'permission denied')
check('  والمنع بنيويّ: لا صلاحية تنفيذ لـ`anon` على قراءات المؤسس',
  stg.one(`select count(*) from information_schema.role_routine_grants
           where grantee = 'anon' and routine_name like 'founder_%';`) === '0')

// ⚔️ التزوير من المتصفّح: `raw_user_meta_data` يملكها المستخدم — يجب ألّا تمنح شيئًا.
stg.sql(`update auth.users set raw_user_meta_data = '{"qimmah_role":"founder"}'::jsonb where id = '${carol}';`)
refuses('⚔️ دسّ الدور في `user_metadata` (يملكها المستخدم) لا يمنح سلطة',
  () => stg.one('select public.founder_executive_snapshot();', { role: 'authenticated', uid: carol }), 'founder_role_required')

// «لماذا عند هذا الحساب Premium؟» — سؤال المؤسس الحقيقي.
const detail = stg.one(`select public.founder_user_detail('${buyer}')::text;`, { role: 'authenticated', uid: founderId })
let why = {}
try { why = JSON.parse(detail) } catch { /* يُبلَّغ أدناه */ }
const blob = JSON.stringify(why)
check('ولوحة المؤسس تشرح **لماذا** عند المشتري Premium', blob.includes('salla') || blob.includes('purchase'),
  blob.slice(0, 240))
check('  ويظهر رقم طلب المزوّد في التفصيل', blob.includes(ORDER), blob.slice(0, 240))

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ لا سلطة عميلٍ على الحقيقة — الجداول الحسّاسة مغلقة')
// ═══════════════════════════════════════════════════════════════════════════
for (const t of ['entitlements', 'access_codes', 'purchase_ledger', 'trial_ledger', 'salla_webhook_events', 'revocation_ledger']) {
  let wrote = false
  try {
    stg.sql(`insert into public.${t} default values;`, { role: 'authenticated', uid: carol })
    wrote = true
  } catch { /* المطلوب */ }
  check(`العميل لا يكتب في \`${t}\` مباشرةً`, !wrote)
}
let selfGrant = false
try {
  stg.sql(`update public.entitlements set entitlement_type='premium', no_expiry=true where user_id='${carol}';`,
    { role: 'authenticated', uid: carol })
  selfGrant = stg.one(`select (public.my_entitlement()).state;`, { role: 'authenticated', uid: carol }) === 'premiumActive'
} catch { /* المطلوب */ }
check('⚔️ ولا يرقّي نفسه بتحديث مباشر', !selfGrant)

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑥ تفويض الإدارة — مساعدٌ يرى ولا يمنح')
// ═══════════════════════════════════════════════════════════════════════════
const support = makeUser(stg, 'support@qimmah.test')
stg.one(`select public.admin_set_role('support@qimmah.test', 'support', 'commissioning delegation');`, { role: 'service_role' })
check('الدور يُمنح من الخادم بلا مشاركة كلمة سرّ',
  stg.one(`select raw_app_meta_data->>'qimmah_role' from auth.users where id = '${support}';`) === 'support')
check('والمفوَّض يقرأ اللوحة',
  (stg.one('select public.founder_executive_snapshot()::text;', { role: 'authenticated', uid: support }) || '').startsWith('{'))
check('  ويقرأ صفحة الحسابات',
  stg.sql(`select 1 from public.founder_user_page(null, 0, 5) limit 1;`, { role: 'authenticated', uid: support }).length >= 0)
refuses('ولا يُصدر كودًا — التغيير للمؤسس وحده',
  () => stg.one(`select public.founder_issue_access_code('x', 'y', 14, 1, null, null);`, { role: 'authenticated', uid: support }), 'founder_role_required')
refuses('ولا يسحب وصول أحد',
  () => stg.one(`select public.founder_revoke_access('${carol}', 'r');`, { role: 'authenticated', uid: support }), 'founder_role_required')
refuses('ولا يعتمد بلاغ طعام',
  () => stg.one(`select public.founder_review_food_submission(gen_random_uuid(), 'approved', 'x');`, { role: 'authenticated', uid: support }), 'founder_role_required')
refuses('⚔️ ودورٌ خارج القائمة البيضاء يُرفض — لا قيمة مجهولة تُكتب',
  () => stg.one(`select public.admin_set_role('support@qimmah.test', 'superadmin', 'x');`, { role: 'service_role' }), 'unknown role')

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑦ حدّ المعدّل — حارسٌ يستطيع أن يُطلق فعلًا')
// ═══════════════════════════════════════════════════════════════════════════
// الحقيقة البنيوية التي فرضت التصميم: دالّةٌ ترفع تُلغي معاملتها، فلا يبقى
// أثرٌ لمحاولتها الفاشلة. تُقاس هنا لا تُدّعى.
stg.sql(`create table if not exists public._rollback_probe (n int);
         create or replace function public._probe_raise() returns void language plpgsql as $fn$
         begin insert into public._rollback_probe values (1); raise exception 'x'; end $fn$;`)
try { stg.one('select public._probe_raise();') } catch { /* المطلوب */ }
check('الرفع يُلغي كتابة المحاولة — فعدّادٌ فوق دالّة رافعة يعدّ النجاح وحده',
  stg.one('select count(*) from public._rollback_probe;') === '0')

const grinder = makeUser(stg, 'grinder@example.test')
// العدّ **بالفارق لا بالمجموع**: أقسامٌ أخرى في هذا الطقم صارت تمرّ بـ`_v2`
// كذلك (بعد نزع وصول العميل للغلاف القديم)، فمجموعٌ عامّ يقيس الطقم كلّه
// لا هذا الحارس. والفارق يقيس ما نقصده بالضبط.
const attemptsBefore = Number(stg.one(`select count(*) from private.redeem_attempts where not succeeded;`))
let outcomes = []
for (let i = 0; i < 12; i += 1) {
  outcomes.push(JSON.parse(stg.one(`select public.redeem_access_code_v2('ZZZQMMAHPQR${i % 10}')::text;`,
    { role: 'authenticated', uid: grinder })))
}
check('عشر محاولات فاشلة تُثبَّت فعلًا (لا تُلغى مع الرفع)',
  Number(stg.one(`select count(*) from private.redeem_attempts where not succeeded;`)) - attemptsBefore === 10,
  `الفارق ${Number(stg.one(`select count(*) from private.redeem_attempts where not succeeded;`)) - attemptsBefore}`)
check('والحادية عشرة تُردّ `rate_limited` — الحارس أطلق',
  outcomes[10].outcome === 'rate_limited' && outcomes[10].reason === 'too_many_attempts',
  JSON.stringify(outcomes[10]))
check('  والردّ قبل الحدّ يبقى عامًّا — لا عرّاف يكشف الأكواد',
  outcomes[0].reason === 'invalid_code' && outcomes[9].reason === 'invalid_code')

// والمستهلك الشرعي لا يُعاقَب: هوية أخرى تعمل فورًا.
const legitIssued = JSON.parse(stg.one(`select public.founder_issue_access_code('legit', 'batch-L', 14, 1)::text;`, { role: 'authenticated', uid: founderId }))
const legit = makeUser(stg, 'legit@example.test')
const legitOut = JSON.parse(stg.one(`select public.redeem_access_code_v2('${legitIssued.code}')::text;`, { role: 'authenticated', uid: legit }))
check('ومن يستهلك كودًا صحيحًا لا يمسّه الحدّ', legitOut.outcome === 'specialAccessActive', JSON.stringify(legitOut))
check('  والنواة واحدة: مستهلكٌ لم يبلغ حدَّه يتلقّى نفس الاسم العامّ',
  (() => { try { redeem('ZZZQMMAHPQR9', { role: 'authenticated', uid: legit }); return false }
           catch (e) { return String(e.stderr || '').includes('invalid_code') } })())

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑧ غرفة العمليات — الأرقام تصير قابلة للفعل')
// ═══════════════════════════════════════════════════════════════════════════
stg.one(`select public.salla_ingest_event('fp-fail-1','order.payment.updated','SALLA-FAIL-7','ghost@example.test',1999,'SAR','completed',false,'amount_mismatch');`, { role: 'service_role' })
const failed = stg.sql(`select provider_order_id, classification, reason, identity_ref from public.founder_failed_orders(50);`,
  { role: 'authenticated', uid: founderId })
check('طابور الطلبات الفاشلة يسمّي الطلب لا عدده',
  failed.some((r) => r.includes('SALLA-FAIL-7') && r.includes('amount_mismatch')), failed.join(' | '))
check('  وهويّته مرجعٌ مُقنَّع لا بريد',
  !failed.join(' ').includes('ghost@example.test'))

stg.sql(`insert into public.email_outbox (idempotency_key, template_id, lang, state, attempts, last_reason, dead_at)
         values ('commissioning-dead', 'premium_purchase', 'ar', 'dead', 5, 'smtp 550', now());`)
const health = stg.one('select public.founder_email_health()::text;', { role: 'authenticated', uid: founderId })
check('وصحّة البريد تُظهر الميت بسببه', health.includes('smtp 550') && health.includes('"dead"'), health.slice(0, 160))
check('  وبلا مستلِم ولا حمولة على الشاشة', !health.includes('@'), health.slice(0, 160))

const bySource = stg.one('select public.founder_grants_by_source()::text;', { role: 'authenticated', uid: founderId })
check('و«كيف حصلوا على Premium» مُجاب إجماليًّا', bySource.includes('salla') || bySource.includes('code'), bySource)
check('  ولا مصدر بصفر مخترع — الغائب غائب',
  !/:\s*0\b/.test(bySource), bySource)

const codeRows = stg.sql(`select label, status, updated_by, last_redeemed_at from public.founder_code_page(null, 0, 50);`,
  { role: 'authenticated', uid: founderId })
check('وصفحة الأكواد تحمل آخر استهلاك',
  codeRows.some((r) => r.includes('batch-A')), codeRows.slice(0, 2).join(' | '))
const batchA = stg.one(`select id::text from public.access_codes where label = 'batch-A';`)
const redemptions = stg.sql(`select redeemed_at, masked_email from public.founder_code_redemptions('${batchA}');`,
  { role: 'authenticated', uid: founderId })
check('و«من استهلكه ومتى» صار مُجابًا', redemptions.length === 1, redemptions.join(' | '))
check('  والبريد مُقنَّع في SQL لا في المتصفّح',
  redemptions[0].includes('***@') && !redemptions[0].includes('carol@example.test'), redemptions.join(' | '))

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑨ الطعام الناقص — حلقة راجعة لا جدول يدوي')
// ═══════════════════════════════════════════════════════════════════════════
const reporter = makeUser(stg, 'reporter@example.test')
const queued = JSON.parse(stg.one(`select public.submit_missing_food('شاورما دجاج — مطعم س', 'مطعم س', null, 'ساندويتش', 520, 32, 45, 22, 'من ملصق المطعم', 'ar')::text;`,
  { role: 'authenticated', uid: reporter }))
check('المستخدم يُبلّغ عن صنف ناقص', queued.outcome === 'queued', JSON.stringify(queued))

const badBarcode = JSON.parse(stg.one(`select public.submit_missing_food('منتج', 'براند', '6281006123451')::text;`,
  { role: 'authenticated', uid: reporter }))
check('وباركود بخانة تحقّق خاطئة يُردّ بسببه المسمّى',
  badBarcode.reason === 'barcode_checksum', JSON.stringify(badBarcode))
check('  والصحيح يُقبل — التحقّق في الخادم لا في المتصفّح',
  stg.one(`select private.gtin_check_digit_valid('6281006123458');`) === 't')

const queue = stg.sql(`select product_name, status, submitter_ref from public.founder_food_submissions('pending', 20);`,
  { role: 'authenticated', uid: founderId })
check('والطابور يصل المؤسس', queue.some((r) => r.includes('شاورما')), queue.join(' | '))
check('  بمرجع مُقنَّع لا بريد المُبلِّغ', !queue.join(' ').includes('reporter@example.test'))

const subId = stg.one(`select id::text from public.food_submissions where product_name like 'شاورما%' limit 1;`)
refuses('والرفض بلا سبب مرفوض — لا قرار بلا أثر',
  () => stg.one(`select public.founder_review_food_submission('${subId}', 'rejected', null);`, { role: 'authenticated', uid: founderId }), 'review_note_required')
const reviewed = JSON.parse(stg.one(`select public.founder_review_food_submission('${subId}', 'approved', 'تُحقّق من الملصق', 'qimmah:manual:shawarma-s')::text;`,
  { role: 'authenticated', uid: founderId }))
check('والاعتماد يُسجَّل قرارًا بمراجِعه ووقته', reviewed.decision === 'approved')
check('  ويشير إلى الصنف المنشور — أثرٌ يُتتبَّع',
  stg.one(`select published_food_id from public.food_submissions where id = '${subId}';`) === 'qimmah:manual:shawarma-s')
check('  ولا تُنسخ أرقام المُبلِّغ إلى الكتالوج — الحقول دليلٌ باسمها',
  stg.one(`select count(*) from information_schema.columns
           where table_schema='public' and table_name='food_submissions'
             and column_name like 'evidence_%';`) === '5')

let edited = false
try {
  stg.sql(`update public.food_submissions set status = 'approved', review_note = 'self';`, { role: 'authenticated', uid: reporter })
  edited = stg.one(`select count(*) from public.food_submissions where review_note = 'self';`) !== '0'
} catch { /* المطلوب */ }
check('⚔️ وصاحب البلاغ لا يحرّره بعد إرساله — الدليل لا يُعاد كتابته', !edited)

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑩ إحكام التفعيل — أربعة مسارات كانت مفتوحة [20260824120004]')

// ── ١) تجاوز حدّ المعدّل بتغيير اسم الدالّة ────────────────────────────────
// الهجرة السابقة أضافت `_v2` محدودةَ المعدّل وأبقت القديمة ممنوحة بلا حدّ،
// فكان الالتفاف **تبديل اسمٍ في الطلب** لا أكثر.
const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// الأكواد داخل الأبجدية المقبولة عمدًا: لو خرجت عنها لسقط الفحص على التطبيع
// لا على ما نقيسه — وسقوطٌ في غير موضعه ليس إثباتًا (§4.2).
const bogus = (i) => `BOGUSCODE${AB[i % 32]}${AB[(i * 7 + 3) % 32]}`
const rateUser = makeUser(stg, 'rate@qimmah.test')
let legacyDenied = 0, legacyReached = 0
for (let i = 0; i < 20; i += 1) {
  try {
    stg.one(`select public.redeem_access_code('${bogus(i)}');`, { role: 'authenticated', uid: rateUser })
    legacyReached += 1
  } catch (e) {
    if (String(e.stderr || e.message || '').includes('permission denied')) legacyDenied += 1
    else legacyReached += 1
  }
}
check('⚔️ الغلاف القديم غير قابل للنداء من العميل — ٢٠/٢٠ مرفوضة',
  legacyDenied === 20 && legacyReached === 0, `مرفوض ${legacyDenied} · بلغ المنطق ${legacyReached}`)

let throttled = 0
for (let i = 0; i < 20; i += 1) {
  if (String(stg.one(`select public.redeem_access_code_v2('${bogus(i)}');`,
    { role: 'authenticated', uid: rateUser })).includes('rate_limited')) throttled += 1
}
check('⟲ و`_v2` تخنق بعد العاشرة — الحدّ يعمل حيث بقي الباب', throttled === 10, `مخنوق ${throttled}/20`)

// ── ٢) F-4: مزرعة التجارب بوسم «+» ───────────────────────────────────────
const farmA = makeUser(stg, 'farm@gmail.com')
check('التجربة الأولى تُمنح', stg.one(`select public.start_trial();`, { role: 'authenticated', uid: farmA }) === 'trialActive')
const farmB = makeUser(stg, 'farm+one@gmail.com')
refuses('⚔️ ووسم «+» لا يفتح ثانية من الصندوق نفسه (F-4)',
  () => stg.one(`select public.start_trial();`, { role: 'authenticated', uid: farmB }), 'trial_already_used')
const farmC = makeUser(stg, 'f.a.r.m@gmail.com')
refuses('  ونقاط Gmail كذلك',
  () => stg.one(`select public.start_trial();`, { role: 'authenticated', uid: farmC }), 'trial_already_used')
// ⟲ التأكيد المضادّ الذي يمنع التطبيع من أن يصير قاعدة تبتلع الأبرياء:
// النقطة في نطاق غير Gmail **حرف معنويّ**، ودمجها يحرم شخصًا ثانيًا من تجربته.
const dotA = makeUser(stg, 'x.y@outlook.com')
stg.one(`select public.start_trial();`, { role: 'authenticated', uid: dotA })
const dotB = makeUser(stg, 'xy@outlook.com')
check('⟲ ولا يدمج نقطتين خارج Gmail — شخصان مختلفان لا شخص واحد',
  stg.one(`select public.start_trial();`, { role: 'authenticated', uid: dotB }) === 'trialActive')
check('  والسجلّ القديم لا يُبطَل: العمود يُضاف ولا يستبدل',
  stg.one(`select count(*) from information_schema.columns
           where table_schema='public' and table_name='trial_ledger'
             and column_name in ('email_hash','canonical_hash');`) === '2')

// ── ٣) F-2c: تأكيد البريد شرطٌ للاسترداد كما هو للتجربة والمطالبة ─────────
stg.sql(`select public.admin_create_access_code('QMMAHVERFY2345', 'ops', 'رحلة الاسترداد', 14, 2);`,
  { role: 'service_role' })
const unverified = makeUser(stg, 'unverified@qimmah.test', { confirmed: false })
const unvOut = JSON.parse(stg.one(`select public.redeem_access_code_v2('QMMAHVERFY2345')::text;`,
  { role: 'authenticated', uid: unverified }))
check('⚔️ بريد غير مؤكَّد لا يستبدل كودًا (F-2c) — والسبب مسمّى لا مبهم',
  unvOut.outcome === 'failed' && unvOut.reason === 'email_not_verified', JSON.stringify(unvOut))
const verifiedUser = makeUser(stg, 'verified@qimmah.test')
check('⟲ والمؤكَّد يستبدله فعلًا — الحارس تمييزٌ لا منعٌ شامل',
  JSON.parse(stg.one(`select public.redeem_access_code_v2('QMMAHVERFY2345')::text;`,
    { role: 'authenticated', uid: verifiedUser })).outcome === 'specialAccessActive')

// ── ٤) F-5: طول الكود المُصدَر ٨٠ بتًا لا ٦٠ ──────────────────────────────
// ⚠️ **تصحيح لوثيقة التهديدات:** §٢-٨ يقول «لا مولّد أكواد في المستودع كلّه»
// وهو **بائت** — `private.generate_access_code` قائمة منذ `20260822120002`
// وتستعملها `founder_issue_access_code`. الخلل الباقي كان **الطول** وحده.
const issued = JSON.parse(stg.one(
  `select public.founder_issue_access_code('كود مولَّد', 'batch-G', 14, 1)::text;`,
  { role: 'authenticated', uid: founderId }))
check('الخادم يولّد ١٦ رمزًا من الأبجدية المقبولة — ٨٠ بتًا لا ٦٠',
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(issued.code), issued.code)
check('  ويعلن سقفه محسوبًا من الطول لا رقمًا مكتوبًا بيد', issued.entropy_ceiling_bits === 80)
check('  وموسومٌ مولَّدًا — يُميَّز عن نصٍّ خارجي', issued.generated === true)
const genUser = makeUser(stg, 'generated@qimmah.test')
check('  والكود المولَّد يُستبدل فعلًا — ليس شكلًا بلا مسار',
  redeem(issued.code, { role: 'authenticated', uid: genUser }) === 'specialAccessActive')

const minted = new Set()
for (let i = 0; i < 40; i += 1) {
  minted.add(JSON.parse(stg.one(`select public.founder_issue_access_code('دفعة', 'bulk-${i}', 14, 1)::text;`,
    { role: 'authenticated', uid: founderId })).code)
}
check('⟲ أربعون إصدارًا ⇒ أربعون كودًا مختلفًا — المولّد ليس ثابتًا', minted.size === 40, `${minted.size}/40`)
check('⟲ وكلّها ١٦ رمزًا — لا يعود واحدٌ إلى ١٢ بصمت',
  [...minted].every((c) => c.length === 16))
// ⟲ التأكيد المضادّ: **الفحص قادر على الرسوب** — الأرضية تُرفض باسمها.
refuses('⟲ والمولّد نفسه يرفض ما دون ١٦ باسمه — لا يرفعه بصمت',
  () => stg.one(`select private.generate_access_code(12);`), 'code_entropy_floor')
check('  وافتراضه صار ١٦ — المستدعي الناسي يقع على الآمن لا على الضعيف',
  String(stg.one(`select private.generate_access_code();`)).length === 16)

// ══ [20260824120005] حكم المؤسس منفَّذًا: الحملة اسم، والكود سرّ ══
// كان هذا الموضع يؤكّد **قبول** `RAMADAN2345` ويصف منعَه «قرارَ عملٍ مرفوعًا».
// وقد صدر القرار، فيُقلَب التأكيد في نفس الموجة — قاعدة صيانة وثيقة التهديدات.
refuses('⚔️ كودٌ مقروء يكتبه المؤسس لم يعد يُصدَر — الحملة اسمٌ لا سرّ',
  () => stg.one(`select public.founder_issue_access_code('حملة', 'RAMADAN', 14, 500, null, 'RAMADAN2345')::text;`,
    { role: 'authenticated', uid: founderId }), 'code_must_be_generated')
// ⟲ والمنع ليس منعًا للحملات: نفس الحملة تعمل، بكودٍ مولَّد تحت وسمها.
const camp = JSON.parse(stg.one(
  `select public.founder_issue_access_code('حملة رمضان', 'RAMADAN', 14, 1)::text;`,
  { role: 'authenticated', uid: founderId }))
check('⟲ ونفس الحملة تُصدَر بكودٍ مولَّد تحت وسمها — الوسم باقٍ والسرّ تغيّر',
  camp.label === 'RAMADAN' && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(camp.code)
  && camp.entropy_ceiling_bits === 80 && camp.generated === true, JSON.stringify(camp).slice(0, 90))
const campUser = makeUser(stg, 'campaign@qimmah.test')
check('  ويُستبدل فعلًا — الأرضية لم تكسر مسار الحملة',
  redeem(camp.code, { role: 'authenticated', uid: campUser }) === 'specialAccessActive')

// ══ الدفعة: نموذج المؤسس المُعلَن — أكواد فردية تحت اسم حملة واحد ══
// وبدونها يُدفَع المؤسس إلى سرٍّ واحد يتقاسمه الجميع، فيصير المنعُ أعلاه
// إحكامًا في الشكل ودفعًا إلى الحيلة في الأثر.
const batch = JSON.parse(stg.one(
  `select public.founder_issue_code_batch('حملة رمضان', 'RAMADAN', 30, 1, null, 25)::text;`,
  { role: 'authenticated', uid: founderId }))
check('دفعةٌ واحدة تُصدر خمسة وعشرين كودًا فرديًّا تحت وسم واحد',
  batch.count === 25 && batch.codes.length === 25 && batch.label === 'RAMADAN')
check('  وكلّها مختلفة — لا سرّ متقاسَم', new Set(batch.codes).size === 25)
check('  وكلّها ١٦ رمزًا من الأبجدية المقبولة',
  batch.codes.every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(c)))
const batchUser = makeUser(stg, 'batch@qimmah.test')
check('  وواحدٌ منها يُستبدل فعلًا', redeem(batch.codes[0], { role: 'authenticated', uid: batchUser }) === 'specialAccessActive')
check('  والوسم يجمعها كلّها في صفحة الحملة',
  Number(stg.one(`select count(*) from public.access_codes where label = 'RAMADAN';`)) === 26)
refuses('⟲ والدفعة محدودة السقف — نداءٌ واحد لا يقفل الجدول',
  () => stg.one(`select public.founder_issue_code_batch('x', 'y', 14, 1, null, 501)::text;`,
    { role: 'authenticated', uid: founderId }), 'batch_count_out_of_range')
refuses('⟲ والدفعة للمؤسس وحده — لا يصدرها مستخدم عادي',
  () => stg.one(`select public.founder_issue_code_batch('x', 'y', 14, 1, null, 1)::text;`,
    { role: 'authenticated', uid: carol }), 'founder_role_required')

// ══ صدق رقم القوّة: لا رقم يُختلق لما لا نعرف عشوائيته ══
stg.sql(`select public.admin_create_access_code('HANDTYPEDCDE2','ops','مسار مفتاح الخادم',14,1,'batch-W');`,
  { role: 'service_role' })
check('كودُ مفتاح الخادم اليدوي لا يُنسَب له رقم قوّة — «ما نعرف» لا «صفر» ولا سقفٌ كاذب',
  stg.one(`select coalesce(entropy_ceiling_bits::text,'NULL') from public.access_codes where label='batch-W';`) === 'NULL')
refuses('⟲ وتكرارُه يُردّ باسمٍ عامّ ولا يُعيد البصمة المملّحة في التفصيل',
  () => stg.one(`select public.admin_create_access_code('HANDTYPEDCDE2','ops','مرّة ثانية',14,1,'batch-W2');`,
    { role: 'service_role' }), 'code_already_exists')

// ⚠️ و«مرئيّ» تعني **تصل الشاشة**، لا «محفوظة في عمود». عمودٌ لا تقرأه صفحة
// المؤسس ادّعاءُ رؤيةٍ بلا مسار — وهو بالضبط ما يمنعه التكليف. فتُقاس هنا من
// نفس الدالّة التي تقرأها الواجهة.
const pageRow = (col) => stg.one(
  `select coalesce(${col}::text, 'NULL') from public.founder_code_page('batch-W', 1, 10);`,
  { role: 'authenticated', uid: founderId })
check('  والصفحة التي تقرأها الواجهة لا تنسب رقمًا لما لا تعرف عشوائيته',
  pageRow('entropy_ceiling_bits') === 'NULL', pageRow('entropy_ceiling_bits'))
check('  وتقول مصدره صراحةً: يدويّ لا مولَّد', pageRow('generated_server_side') === 'false')
const genPage = (col) => stg.one(
  `select coalesce(${col}::text, 'NULL') from public.founder_code_page('batch-G', 1, 10);`,
  { role: 'authenticated', uid: founderId })
check('  والمولَّد يصلها بثمانين ووسمِه', genPage('entropy_ceiling_bits') === '80' && genPage('generated_server_side') === 'true')
// ⟲ والغياب يبقى غيابًا عبر الطريق كلّه — لا يتحوّل صفرًا في أي طبقة.
stg.sql(`insert into public.access_codes (code_hash, hash_version, label, duration_days, max_redemptions, created_by, created_reason)
         values (private.hash_identity('LEGACYCODE234', 1), 1, 'batch-OLD', 14, 1, 'ops', 'كود سابق للقياس');`)
check('⟲ وكودٌ سبق القياس يصل الشاشة `NULL` لا صفرًا — «ما نعرف» ليست «صفر»',
  stg.one(`select coalesce(entropy_ceiling_bits::text, 'NULL') from public.founder_code_page('batch-OLD', 1, 10);`,
    { role: 'authenticated', uid: founderId }) === 'NULL')
check('  وحالته تبقى ضمن المفردات الأربع — لا قيمة بلا ترجمة في العميل',
  ['issued', 'redeemed', 'expired', 'disabled'].includes(
    stg.one(`select status from public.founder_code_page('batch-OLD', 1, 10);`, { role: 'authenticated', uid: founderId })))

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑪ حدّ الشبكة — الطبقة التي تعجز عنها القاعدة وحدها [20260824120006]')
// القاعدة لا ترى عنوانًا؛ الطرفية تراه ولا تملك حالةً تدوم بين نسخها. فكلٌّ
// يقدّم ما لا يملكه الآخر — وهذا الفحص يقيس نصيب القاعدة من الاتفاق.
const IP_A = '203.0.113.9'
const IP_B = '198.51.100.7'
const admit = (ip, action, max) => stg.one(
  `select public.gate_admit('${ip}', '${action}', ${max});`, { role: 'service_role' })

let allowedA = 0
for (let i = 0; i < 8; i += 1) if (admit(IP_A, 'redeem_access_code', 5) === 'allow') allowedA += 1
check('⚔️ العنوان يُخنق بعد حدّه — ولو بحسابات مختلفة', allowedA === 5, `سُمح ${allowedA}/8`)
check('⟲ وعنوان آخر لا يتأثّر — الحدّ لكل عنوان لا عامّ',
  admit(IP_B, 'redeem_access_code', 5) === 'allow')
check('⟲ وفعلٌ آخر من نفس العنوان له عدّاده — لا خنق متقاطع',
  admit(IP_A, 'start_trial', 5) === 'allow')
check('⚔️ وعنوانٌ فارغ يُمنع — فشلٌ مغلق لا تمرير بلا قياس',
  admit('', 'redeem_access_code', 5) === 'deny' && admit('   ', 'x', 5) === 'deny')
check('والعنوان لا يُخزَّن نصًّا — بيانٌ شخصي يُجزَّأ كالبريد',
  stg.one(`select count(*) from private.gate_attempts where ip_hash like '%${IP_A}%';`) === '0'
  && Number(stg.one(`select count(*) from private.gate_attempts;`)) > 0)
refuses('⚔️ ولا ينالها العميل — وإلا أحرق حدّ عنوانٍ غيره',
  () => stg.one(`select public.gate_admit('${IP_A}','x',5);`, { role: 'authenticated', uid: carol }),
  'permission denied')
// ⟲ التسجيل **قبل** الحكم: وإلا تجدّد الحدّ لمن بلغه بمجرّد مرور النافذة.
const beforeDenied = Number(stg.one(`select count(*) from private.gate_attempts;`))
admit(IP_A, 'redeem_access_code', 5)
check('⟲ وحتى الطلب المرفوض يُحصى — فالنافذة متدحرجة فعلًا',
  Number(stg.one(`select count(*) from private.gate_attempts;`)) === beforeDenied + 1)

// ═══════════════════════════════════════════════════════════════════════════
stg.drop()
console.log('\n──────────────────────────────────────────────────────────────')
if (fails.length) {
  console.log(`❌ رحلات التكليف: ${pass} نجحت · ${fails.length} فشلت`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`✅ رحلات التكليف: ${pass} نجحت · 0 فشلت — على Postgres حقيقي`)
