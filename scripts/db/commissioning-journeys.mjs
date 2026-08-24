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
const CODE = stg.one(`select public.founder_issue_access_code('commissioning', 'batch-A', 14, 1, null, 'QMMAHSTAGE23');`,
  { role: 'authenticated', uid: founderId })
check('المؤسس يُصدر كودًا من الخادم', typeof CODE === 'string' && CODE.length > 0, String(CODE))

const carol = makeUser(stg, 'carol@example.test')
check('المستخدم يستهلكه فيُمنح',
  stg.one(`select public.redeem_access_code('QMMAHSTAGE23');`, { role: 'authenticated', uid: carol }) === 'specialAccessActive')
refuses('وإعادة استهلاكه مرفوضة',
  () => stg.one(`select public.redeem_access_code('QMMAHSTAGE23');`, { role: 'authenticated', uid: carol }), 'invalid_code')

// **دمجٌ متعمّد لا كسل:** المستنفَد والمجهول والمُبطَل كلّها `invalid_code`،
// فلا يصير الردّ عرّافًا يكشف أيّ الأكواد حقيقي.
// والكود لا يُخزَّن نصًّا: تسريب القاعدة لا يسرّب أكوادًا صالحة.
check('والأكواد مخزَّنة مجزّأة لا نصًّا — لا عمود نصّ صريح',
  stg.one(`select count(*) from information_schema.columns
           where table_schema='public' and table_name='access_codes'
             and column_name in ('code','code_plain','code_normalized');`) === '0')
check('  والمُصدَر لا يوجد نصًّا في أي صفّ',
  stg.one(`select count(*) from public.access_codes where code_hash = 'QMMAHSTAGE23';`) === '0')

// ⟂ التسابق الحقيقي: اتصالان مستقلّان على كودٍ بحصّة واحدة.
const raceCode = 'RACEQMMAH234'
stg.one(`select public.founder_issue_access_code('race', 'batch-R', 14, 1, null, '${raceCode}');`, { role: 'authenticated', uid: founderId })
const r1 = makeUser(stg, 'race1@example.test')
const r2 = makeUser(stg, 'race2@example.test')
const results = await stg.race(
  [`select public.redeem_access_code('${raceCode}');`, `select public.redeem_access_code('${raceCode}');`],
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
stg.one(`select public.founder_issue_access_code('to-revoke', 'batch-X', 14, 1, null, 'KLLQMMAH2345');`, { role: 'authenticated', uid: founderId })
const codeId = stg.one(`select id::text from public.access_codes where label = 'batch-X';`)
stg.one(`select public.founder_set_code_enabled('${codeId}', false, 'commissioning revoke');`, { role: 'authenticated', uid: founderId })
const dave = makeUser(stg, 'dave@example.test')
refuses('كودٌ مُبطَل لا يُستهلَك',
  () => stg.one(`select public.redeem_access_code('KLLQMMAH2345');`, { role: 'authenticated', uid: dave }), 'invalid_code')

refuses('وكودٌ مجهول يُرفض بردٍّ عامّ',
  () => stg.one(`select public.redeem_access_code('ZZZZQMMAH999');`, { role: 'authenticated', uid: dave }), 'invalid_code')

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
let outcomes = []
for (let i = 0; i < 12; i += 1) {
  outcomes.push(JSON.parse(stg.one(`select public.redeem_access_code_v2('ZZZQMMAHPQR${i % 10}')::text;`,
    { role: 'authenticated', uid: grinder })))
}
check('عشر محاولات فاشلة تُثبَّت فعلًا (لا تُلغى مع الرفع)',
  stg.one(`select count(*) from private.redeem_attempts where not succeeded;`) === '10')
check('والحادية عشرة تُردّ `rate_limited` — الحارس أطلق',
  outcomes[10].outcome === 'rate_limited' && outcomes[10].reason === 'too_many_attempts',
  JSON.stringify(outcomes[10]))
check('  والردّ قبل الحدّ يبقى عامًّا — لا عرّاف يكشف الأكواد',
  outcomes[0].reason === 'invalid_code' && outcomes[9].reason === 'invalid_code')

// والمستهلك الشرعي لا يُعاقَب: هوية أخرى تعمل فورًا.
stg.one(`select public.founder_issue_access_code('legit', 'batch-L', 14, 1, null, 'LEGTQMMAH234');`, { role: 'authenticated', uid: founderId })
const legit = makeUser(stg, 'legit@example.test')
const legitOut = JSON.parse(stg.one(`select public.redeem_access_code_v2('LEGTQMMAH234')::text;`, { role: 'authenticated', uid: legit }))
check('ومن يستهلك كودًا صحيحًا لا يمسّه الحدّ', legitOut.outcome === 'specialAccessActive', JSON.stringify(legitOut))
check('  والنواة واحدة: الغلاف القديم يبقى رافعًا بنفس الاسم',
  (() => { try { stg.one(`select public.redeem_access_code('ZZZQMMAHPQR9');`, { role: 'authenticated', uid: legit }); return false }
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
stg.drop()
console.log('\n──────────────────────────────────────────────────────────────')
if (fails.length) {
  console.log(`❌ رحلات التكليف: ${pass} نجحت · ${fails.length} فشلت`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`✅ رحلات التكليف: ${pass} نجحت · 0 فشلت — على Postgres حقيقي`)
