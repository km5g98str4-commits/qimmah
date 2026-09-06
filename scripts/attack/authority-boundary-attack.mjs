#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// [RELEASE-REVIEW-SEC] حدود السلطة — الهجوم الثاني (عين طازجة على Postgres حقيقي)
// ═══════════════════════════════════════════════════════════════════════════
// سبعة محاور: نداءات مجهولة · التفاف البوّابة (بلا ختم/مزوَّر/لغير/لفعل آخر/منتهٍ)
// · انتحال الدور (ادّعاء JWT · user_metadata · admin_set_role) · طفرة المنح مباشرةً
// (كل جداول المنح والسجلّات + قراءة صفوف الغير) · إساءة التجربة (تكرار · حالة
// الأحرف · حذف وعودة · بريد غير مؤكَّد) · إعادة استعمال الكود (تكرار · إعادة ·
// تعداد · حقن · حدّ المعدّل · إطفاء) · تزامن حقيقي على صكّ مفرد.
// التخطّي معلَن بلا عنقود (كبقيّة أطقم scripts/attack).
// ═══════════════════════════════════════════════════════════════════════════
import { clusterAvailable, createStaging, provision, makeUser, mintStampSync } from '../db/lib/pg-staging.mjs'
if (!clusterAvailable()) {
  console.log('⏭️  تخطٍّ معلَن: لا عنقود Postgres على QIMMAH_PG_URL — هذا الهجوم يحتاج عنقودًا حقيقيًّا (لا PGlite).')
  process.exit(0)
}
let pass = 0, fail = 0
const check = (l, ok, d = '') => { console.log(`  ${ok ? '🛡️  PASS' : '❌ FAIL'} — ${l}${d ? '  ⟨' + d + '⟩' : ''}`); ok ? pass++ : fail++ }
const attempt = (stg, sql, o) => { try { return { ok: true, out: stg.one(sql, o) } } catch (e) { return { ok: false, err: (String(e.stderr || e).split('\n').find((l) => /ERROR/.test(l)) || String(e)).slice(0, 140) } } }
const stg = createStaging()
try {
  const founder = makeUser(stg, 'founder@example.com'); provision(stg, { founderEmail: 'founder@example.com' })
  const alice = makeUser(stg, 'alice@example.com'); const bob = makeUser(stg, 'bob@example.com')
  const batch = JSON.parse(stg.one(`select public.founder_issue_purchase_batch('sec','SEC',2,null)::text;`, { role: 'authenticated', uid: founder }))
  const [c1, c2] = batch.codes
  console.log('① anonymous calls')
  for (const fn of ['public.start_trial()', "public.redeem_access_code_v2('X')", 'public.claim_pending_grants()', 'public.my_entitlement()', 'public.founder_executive_snapshot()', "public.admin_grant_premium('a@b.c','salla','o1',1999,'{}'::jsonb,'x',null)"]) {
    const r = attempt(stg, `select ${fn};`, { role: 'anon', stamp: false }); check(`anon ${fn.split('(')[0]} rejected`, !r.ok && /permission denied|not authenticated|gate/.test(r.err), r.ok ? r.out : r.err)
  }
  console.log('② direct RPC bypass of the gateway (authenticated, no stamp / forged stamp / other-user stamp)')
  let r = attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid: alice, stamp: false }); check('no stamp → gate_stamp_invalid', !r.ok && /gate_stamp_invalid/.test(r.err), r.err)
  r = attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid: alice, stamp: '1.' + 'a'.repeat(64) }); check('forged stamp → gate_stamp_invalid', !r.ok && /gate_stamp_invalid/.test(r.err), r.err)
  r = attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid: alice, stamp: mintStampSync(stg.gateSecret, 'start_trial', bob) }); check("other user's stamp → gate_stamp_invalid", !r.ok && /gate_stamp_invalid/.test(r.err), r.err)
  r = attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid: alice, stamp: mintStampSync(stg.gateSecret, 'redeem_access_code', alice) }); check('stamp for another action → gate_stamp_invalid', !r.ok && /gate_stamp_invalid/.test(r.err), r.err)
  r = attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid: alice, stamp: mintStampSync(stg.gateSecret, 'start_trial', alice, Date.now() - 10 * 60 * 1000) }); check('expired stamp (10 min) → gate_stamp_invalid', !r.ok && /gate_stamp_invalid/.test(r.err), r.err)
  console.log('③ role spoofing')
  r = attempt(stg, `do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role","sub":"${alice}"}', true); end $$; select public.founder_executive_snapshot()::text;`, { role: 'authenticated', uid: alice, stamp: false }); check('JWT claim role=service_role does not grant founder', !r.ok && /founder_role_required/.test(r.err), r.err)
  r = attempt(stg, `update auth.users set raw_user_meta_data = '{"qimmah_role":"founder"}' where id = '${alice}';`, { role: 'authenticated', uid: alice, stamp: false }); check('authenticated cannot write auth.users', !r.ok, r.err)
  stg.sql(`update auth.users set raw_user_meta_data = '{"qimmah_role":"founder"}' where id = '${alice}';`)
  r = attempt(stg, 'select public.founder_executive_snapshot()::text;', { role: 'authenticated', uid: alice, stamp: false }); check('user_metadata founder claim ignored by DB', !r.ok && /founder_role_required/.test(r.err), r.err)
  r = attempt(stg, `select public.admin_set_role('alice@example.com','founder','self');`, { role: 'authenticated', uid: alice, stamp: false }); check('authenticated cannot call admin_set_role', !r.ok && /permission denied/.test(r.err), r.err)
  console.log('④ entitlement mutation')
  for (const sql of [`insert into public.entitlements (user_id,email,entitlement_type,source,activated_at,expires_at,no_expiry) values ('${alice}','alice@example.com','premium','purchase_code',now(),null,true);`, `update public.entitlements set entitlement_type='premium' where user_id='${alice}';`, `delete from public.entitlements where user_id='${bob}';`, `insert into public.purchase_ledger (provider,provider_order_id,email_hash,hash_version,amount_minor,raw,recorded_by,source_event) values ('salla','x','h',1,1,'{}','me',null);`, `insert into public.access_codes (code_hash,hash_version,label,duration_days,max_redemptions,created_by,created_reason) values ('h',1,'l',30,1,'me','r');`, `delete from public.trial_ledger;`, `delete from public.revocation_ledger;`, `update public.access_code_redemptions set user_id='${alice}';`]) {
    r = attempt(stg, sql, { role: 'authenticated', uid: alice, stamp: false }); check(`authenticated blocked: ${sql.slice(0, 48)}`, !r.ok && /permission denied|violates row-level/.test(r.err), r.err)
  }
  r = attempt(stg, `select count(*) from public.entitlements where user_id='${bob}';`, { role: 'authenticated', uid: alice, stamp: false }); check("cannot read another user's entitlement row", r.ok && r.out === '0', r.out || r.err)
  r = attempt(stg, `select count(*) from public.profiles where user_id <> '${alice}';`, { role: 'authenticated', uid: alice, stamp: false }); check("cannot read other users' profiles (RLS)", r.ok && r.out === '0', r.out || r.err)
  console.log('⑤ trial abuse')
  const trial = (uid) => attempt(stg, 'select public.start_trial();', { role: 'authenticated', uid })
  r = trial(alice); check('alice trial ok', r.ok && r.out === 'trialActive', r.out || r.err)
  r = trial(alice); check('second trial same account → rejected by name', !r.ok && /trial_already_used|trial_not_applicable/.test(r.err), r.err)
  const alias = makeUser(stg, 'a.l.i.c.e+farm@example.com'); const alias2 = makeUser(stg, 'ALICE@example.com')
  r = trial(alias2); check('case-variant email → trial_already_used', !r.ok && /trial_already_used/.test(r.err), r.err)
  stg.sql(`delete from auth.users where id='${alice}';`); const alice2 = makeUser(stg, 'alice@example.com')
  r = trial(alice2); check('delete account + re-register → trial_already_used (ledger survives)', !r.ok && /trial_already_used/.test(r.err), r.err)
  const unconfirmed = makeUser(stg, 'unc@example.com', { confirmed: false }); r = trial(unconfirmed); check('unconfirmed email → email_not_verified', !r.ok && /email_not_verified/.test(r.err), r.err)
  console.log('⑥ code replay / reuse / enumeration / rate limit')
  const redeem = (uid, code) => attempt(stg, `select public.redeem_access_code_v2('${code}')::text;`, { role: 'authenticated', uid })
  r = redeem(bob, c1); check('bob redeems purchase code', r.ok && /premiumActive/.test(r.out), r.out || r.err)
  r = redeem(bob, c1); check('bob replays → converges premiumActive, no error', r.ok && /premiumActive/.test(r.out), r.out || r.err)
  const carol = makeUser(stg, 'carol@example.com'); r = redeem(carol, c1); check('carol reuses bob code → invalid_code (no oracle)', r.ok && /invalid_code/.test(r.out), r.out || r.err)
  r = redeem(carol, 'ZZZZZZZZZZZZZZZZ'); check('unknown code → invalid_code (same message as consumed)', r.ok && /invalid_code/.test(r.out), r.out || r.err)
  r = redeem(carol, "x''); drop table public.entitlements; --"); check('injection-shaped code → invalid_code, table intact', r.ok && /invalid_code/.test(r.out) && stg.one('select count(*) from public.entitlements;') !== null, r.out || r.err)
  let limited = false; for (let i = 0; i < 25; i++) { const x = redeem(carol, 'AAAAAAAAAAAAAAA' + (i % 10)); if (x.ok && /rate_limited/.test(x.out)) { limited = true; break } } check('per-identity redeem rate limit engages within 25 bad attempts', limited)
  r = redeem(carol, c2); check('rate-limited identity cannot redeem a valid code until window passes', r.ok && /rate_limited/.test(r.out), r.out || r.err)
  const c2id = stg.one(`select id from public.access_codes where label='SEC' and redemption_count = 0 limit 1;`)
  stg.one(`select public.founder_set_code_enabled('${c2id}', false, 'sec')::text;`, { role: 'authenticated', uid: founder }); const dave = makeUser(stg, 'dave@example.com')
  r = redeem(dave, c2); check('disabled code → invalid_code', r.ok && /invalid_code/.test(r.out), r.out || r.err)
  console.log('⑦ concurrency (real connections)')
  const eve = makeUser(stg, 'eve@example.com'); const b2 = JSON.parse(stg.one(`select public.founder_issue_purchase_batch('sec2','SEC2',1,null)::text;`, { role: 'authenticated', uid: founder }))
  const fran = makeUser(stg, 'fran@example.com')
  const res = await stg.race([`select public.redeem_access_code_v2('${b2.codes[0]}')::text;`, `select public.redeem_access_code_v2('${b2.codes[0]}')::text;`], [{ role: 'authenticated', uid: eve }, { role: 'authenticated', uid: fran }])
  const wins = res.filter((x) => /premiumActive/.test(x.out)).length; check('single-use purchase code under two simultaneous users → exactly one winner', wins === 1, res.map((x) => x.out || x.err.slice(0, 40)).join(' | '))
  check('exactly one live premium for that code', stg.one(`select count(*) from public.entitlements where entitlement_type='premium' and user_id in ('${eve}','${fran}');`) === '1')
} finally { stg.drop() }
console.log(`\nsecurity probe: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
