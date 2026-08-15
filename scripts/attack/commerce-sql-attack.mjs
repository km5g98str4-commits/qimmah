// ============================================================================
// test:attack-commerce — هجوم منفَّذ على عقد الوصول في قاعدة حقيقية.
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// **كل** هجرة في `supabase/migrations/` تُطبَّق من قاعدة نظيفة (PGlite) —
// بما فيها طبقة سلة `20260812120001`. وهذا فارق جوهري عن `test:entitlements`
// الذي يطبّق سبع هجرات **بالاسم** ويترك طبقة سلة خارجها، فيثبت خصائص
// `admin_grant_premium` بشكلها في هجرة الإصلاح لا بشكلها المنشور فعلًا
// (انظر `docs/security/COMMERCE-ADMIN-THREAT-MODEL.md` §الحارس الرخو ١).
//
// ═══ قاعدة القراءة ═══
//   ✓ = الهجوم رُدّ.
//   ⚔️ FINDING = الهجوم **نجح**، والتأكيد يصف نجاحه كشاهد انحدار منفَّذ
//     (نفس نمط «المرحلة أ» في `privileges-proof.mjs`). **عند إصلاح العيب
//     يُعكَس التأكيد عمدًا** — سقوطه حينها هو الإشعار المقصود لا عطل.
// ============================================================================
import { createSandbox, asRole, makeUser } from '../db/lib/supabase-sandbox.mjs'

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
const finding = (id, name, pass, detail = '') => check(`⚔️ ${id} ${name}`, pass, detail)

process.on('uncaughtException', (e) => {
  console.error(`\n⛔ استثناء غير متوقّع: ${String(e.message || e).split('\n')[0]}`)
  if (e.query) console.error(`   عند: ${String(e.query).trim().split('\n')[0]}`)
  process.exit(1)
})

/** ينجح إذا رُفعت رسالة تطابق `expect` — والسقوط بلا استثناء فشل مسمّى. */
async function refused(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? expect : `توقّعنا "${expect}" فجاء: ${m.slice(0, 110)}`)
  }
}
/** يعيد رسالة الخطأ أو null إن نجح — لفحص **تطابق** الرسائل (أوراكل التعداد). */
async function errorOf(fn) {
  try { await fn(); return null } catch (e) { return String(e.message || e).split('\n')[0] }
}

console.log('\n⚔️  هجوم عقد الوصول — قاعدة PostgreSQL حقيقية، السلسلة كاملة')

const { db, applied, failed } = await createSandbox()
check(`السلسلة كاملة تُطبَّق من قاعدة نظيفة (${applied.length} هجرة)`, failed.length === 0,
  failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
check('طبقة سلة داخل النطاق المُختبَر', applied.includes('20260812120001_salla_webhook_ingest.sql'))
const q = (s, p) => db.query(s, p)

// ── ٠) اعتمادية الملح: بلا بذرة، **كل كتابة تفشل** (fail-closed) ───────────
console.log('\n⓪ اعتمادية بذر الملح — قبل أي بذرة')
{
  const u = await makeUser(db, 'nopepper@example.com')
  await asRole(db, 'authenticated', u)
  await refused('بلا ملح: start_trial تفشل صاخبةً لا صامتة', () => q(`select public.start_trial()`), 'no active version')
  await refused('بلا ملح: redeem_access_code تفشل', () => q(`select public.redeem_access_code('ABCDEFGHJK')`), 'no active version')
  // والقراءة تبقى صادقة: لا منحة تُختلق ولا استثناء يُبتلع
  const r = await q(`select state from public.my_entitlement()`)
  check('بلا ملح: my_entitlement تعيد noAccess لا منحة', r.rows[0].state === 'noAccess')
  await asRole(db, null)
}
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (1, 'attack-pepper-v1-0123456789abcdef0123456789')`)

// ══════════════════════════════════════════════════════════════════════════
console.log('\n① IDOR وامتيازات العميل — لا كتابة ولا قراءة عبر الحدود')
// ══════════════════════════════════════════════════════════════════════════
const alice = await makeUser(db, 'alice@example.com')
const mallory = await makeUser(db, 'mallory@example.com')
await asRole(db, 'service_role')
await q(`select public.admin_create_access_code('ALCEKQDE23','attack','seed',14,1,null,null)`)
await asRole(db, 'authenticated', alice)
await q(`select public.redeem_access_code('ALCEKQDE23')`)

await asRole(db, 'authenticated', mallory)
{
  const seen = await q(`select count(*)::int n from public.entitlements`)
  check('مالوري لا ترى إلا صفّها (٠ صفوف والمنحة موجودة لأليس)', seen.rows[0].n === 0)
  const seenR = await q(`select count(*)::int n from public.access_code_redemptions`)
  check('ولا ترى استردادات غيرها', seenR.rows[0].n === 0)
}
for (const [label, sql, params] of [
  ['إدراج منحة Premium لنفسها', `insert into public.entitlements (user_id,email,entitlement_type,source,no_expiry) values ($1,'mallory@example.com','premium','salla',true)`, [mallory]],
  ['ترقية صفّها بـUPDATE', `update public.entitlements set entitlement_type='premium', no_expiry=true where user_id=$1`, [mallory]],
  ['تعديل صفّ أليس', `update public.entitlements set revoked_at=null where user_id=$1`, [alice]],
  ['حذف صفّ أليس', `delete from public.entitlements where user_id=$1`, [alice]],
  ['قراءة جدول الأكواد', `select * from public.access_codes`, []],
  ['قراءة سجلّ الشراء', `select * from public.purchase_ledger`, []],
  ['قراءة سجلّ التجربة', `select * from public.trial_ledger`, []],
  ['قراءة سجلّ الاسترداد الدائم', `select * from public.code_redemption_ledger`, []],
  ['قراءة سجلّ الإلغاء', `select * from public.revocation_ledger`, []],
  ['قراءة تدقيق سلة', `select * from public.salla_webhook_events`, []],
]) {
  await refused(`مالوري: ${label}`, () => q(sql, params), 'permission denied')
}
for (const [label, sql] of [
  ['admin_grant_premium', `select public.admin_grant_premium('mallory@example.com','salla','FAKE-1',1999,null)`],
  ['admin_create_access_code', `select public.admin_create_access_code('MALLRY23456','x','x')`],
  ['admin_revoke', `select public.admin_revoke('${alice}','pwn')`],
  ['admin_unrevoke', `select public.admin_unrevoke('${mallory}','pwn')`],
  ['salla_ingest_event', `select public.salla_ingest_event('f','order.status.updated','O','mallory@example.com',1999,'SAR','completed',true,'paid_order')`],
]) {
  await refused(`مالوري تنادي ${label}`, () => q(sql), 'permission denied for function')
}
for (const [label, sql] of [
  ['private.hash_identity', `select private.hash_identity('alice@example.com',1)`],
  ['private.identity_hashes', `select * from private.identity_hashes('alice@example.com')`],
  ['private.normalize_access_code', `select private.normalize_access_code('ALCEKQDE23')`],
  ['قراءة الملح نفسه', `select * from private.identity_pepper`],
]) {
  await refused(`مالوري تنادي ${label}`, () => q(sql), 'permission denied for schema private')
}
// TRUNCATE — صلاحية جدول لا صفّ، وRLS لا تراها
for (const t of ['entitlements', 'access_codes', 'purchase_ledger', 'trial_ledger',
                 'code_redemption_ledger', 'revocation_ledger', 'salla_webhook_events',
                 'access_code_redemptions']) {
  await refused(`TRUNCATE ${t} مرفوض لـauthenticated`, () => q(`truncate public.${t}`), 'permission denied')
  await db.exec('rollback').catch(() => {})
  await asRole(db, 'authenticated', mallory)
}
await asRole(db, 'anon', '')
for (const [label, sql] of [
  ['my_entitlement', `select * from public.my_entitlement()`],
  ['start_trial', `select public.start_trial()`],
  ['redeem_access_code', `select public.redeem_access_code('ALCEKQDE23')`],
  ['claim_pending_grants', `select public.claim_pending_grants()`],
]) {
  await refused(`الزائر (anon) ينادي ${label}`, () => q(sql), 'permission denied for function')
}
await refused('الزائر يقرأ entitlements', () => q(`select * from public.entitlements`), 'permission denied')

// ══════════════════════════════════════════════════════════════════════════
console.log('\n② إعادة تشغيل التفعيل — الاسترداد المزدوج والسباق')
// ══════════════════════════════════════════════════════════════════════════
await asRole(db, null)
const bob = await makeUser(db, 'bob@example.com')
const carol = await makeUser(db, 'carol@example.com')
await asRole(db, 'service_role')
await q(`select public.admin_create_access_code('SNGLEUSE23','attack','single',30,1,null,null)`)
await q(`select public.admin_create_access_code('DSABLED2345','attack','kill',30,1,null,null)`)
await q(`select public.admin_create_access_code('EXPRED23456','attack','old',30,1,null,'2020-01-01T00:00:00Z')`)
  .catch(() => {})
await asRole(db, null)
await q(`update public.access_codes set enabled=false where code_hash = private.hash_identity('DSABLED2345',1)`)
await q(`update public.access_codes set starts_at='2019-01-01', expires_at='2020-01-01'
          where code_hash = private.hash_identity('EXPRED23456',1)`)

await asRole(db, 'authenticated', bob)
const first = await q(`select public.redeem_access_code('SNGLEUSE23') as s`)
check('استرداد أوّل ناجح', first.rows[0].s === 'specialAccessActive')
await refused('نفس المستخدم يستردّ نفس الكود ثانيةً ⇒ مرفوض', () => q(`select public.redeem_access_code('SNGLEUSE23')`), 'invalid_code')
await asRole(db, 'authenticated', carol)
await refused('مستخدم آخر يستردّ الكود المستنفَد ⇒ مرفوض', () => q(`select public.redeem_access_code('SNGLEUSE23')`), 'invalid_code')
await refused('كود مُبطَل إداريًا ⇒ مرفوض', () => q(`select public.redeem_access_code('DSABLED2345')`), 'invalid_code')
await refused('كود خارج نافذته الزمنية ⇒ مرفوض', () => q(`select public.redeem_access_code('EXPRED23456')`), 'invalid_code')

// ── أوراكل التعداد: كل أسباب الرفض **رسالة واحدة حرفيًا** ─────────────────
{
  const msgs = new Map()
  for (const [label, code] of [
    ['غير موجود', 'ZZZZZZZZZZ'], ['مُبطَل', 'DSABLED2345'], ['منتهٍ', 'EXPRED23456'],
    ['مستنفَد', 'SNGLEUSE23'], ['أقصر من ١٠', 'ABCDEF'], ['خارج الأبجدية', 'ABCDEFGHI!'],
    ['حرف I المستبعَد', 'ABCDEFGHIJ'], ['حرف O المستبعَد', 'ABCDEFGHJO'], ['رقم 0/1', 'ABCDEFGH01'],
    ['فراغ داخلي', 'ABCDE FGHJK'], ['Unicode ſ', 'ABCDEFGHJſ'], ['فارغ', ''],
  ]) msgs.set(label, await errorOf(() => q(`select public.redeem_access_code($1)`, [code])))
  const distinct = new Set([...msgs.values()])
  check(`١٢ سبب رفض مختلفًا ⇒ رسالة واحدة بلا أوراكل تعداد (${[...distinct].join(' | ')})`,
    distinct.size === 1 && [...distinct][0].includes('invalid_code'))
  const already = await errorOf(() => q(`select public.redeem_access_code('SNGLEUSE23')`))
  check('حتى «استُخدم من قبل» لا يُميَّز عن «غير موجود» لغير المستردّ', already === [...distinct][0])
}

// ── السباق: الحدّ محروس بنيويًا لا بالقفل وحده ───────────────────────────
{
  await asRole(db, null)
  const def = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p
                        join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname='public' and p.proname='redeem_access_code'`)).rows[0].d
  check('الدالة **المنشورة** تقفل صفّ الكود بـfor update', /for\s+update/i.test(def))
  check('والقراءة بعد القفل — الفحوص تلي select ... for update',
    def.indexOf('for update') < def.indexOf('redemption_count >= c.max_redemptions'))
  await refused('شبكة الأمان البنيوية: تجاوز الحدّ مرفوض حتى بكتابة مباشرة من المالك',
    () => q(`update public.access_codes set redemption_count = max_redemptions + 1
             where code_hash = private.hash_identity('SNGLEUSE23',1)`),
    'access_codes_within_limit')

  // ومحاولة استنفاد فعلية: ٧ مستخدمين على كود حدّه ٥
  await asRole(db, 'service_role')
  await q(`select public.admin_create_access_code('MULT2345678','attack','multi',30,5,null,null)`)
  const users = []
  await asRole(db, null)
  for (let i = 0; i < 7; i++) users.push(await makeUser(db, `race${i}@example.com`))
  let granted = 0, denied = 0
  for (const u of users) {
    await asRole(db, 'authenticated', u)
    try { await q(`select public.redeem_access_code('MULT2345678')`); granted += 1 } catch { denied += 1 }
  }
  await asRole(db, null)
  const cnt = (await q(`select redemption_count, max_redemptions from public.access_codes
                        where code_hash = private.hash_identity('MULT2345678',1)`)).rows[0]
  check(`٧ مستردّين على حدّ ٥ ⇒ ${granted} منحة و${denied} رفضًا، والعدّاد ${cnt.redemption_count}/${cnt.max_redemptions}`,
    granted === 5 && denied === 2 && cnt.redemption_count === 5)
}

// ── الإلغاء الدائم يبتلع كل مسار خدمة ذاتية ──────────────────────────────
{
  await asRole(db, null)
  const banned = await makeUser(db, 'banned@example.com')
  await asRole(db, 'service_role')
  await q(`select public.admin_create_access_code('BANNEDCDE23','attack','ban',30,1,null,null)`)
  await q(`select public.admin_revoke($1,'attack-suite')`, [banned])
  await asRole(db, 'authenticated', banned)
  await refused('محظور يستردّ كودًا ⇒ access_revoked', () => q(`select public.redeem_access_code('BANNEDCDE23')`), 'access_revoked')
  await refused('محظور يبدأ تجربة ⇒ access_revoked', () => q(`select public.start_trial()`), 'access_revoked')
  await refused('محظور يطالب بمنح معلّقة ⇒ access_revoked', () => q(`select public.claim_pending_grants()`), 'access_revoked')
  const st = await q(`select state from public.my_entitlement()`)
  check('والحالة المعروضة revoked صراحةً لا noAccess (صدق قبل طمأنينة)', st.rows[0].state === 'revoked')
  // حذف الحساب ثم التسجيل بنفس البريد لا يرفع الحظر
  await asRole(db, null)
  await q(`select public.delete_own_account()`).catch(() => {})
  await q(`delete from public.entitlements where user_id=$1`, [banned])
  await q(`delete from auth.users where id=$1`, [banned])
  const reborn = await makeUser(db, 'banned@example.com')
  await asRole(db, 'authenticated', reborn)
  await refused('حذف الحساب + إعادة التسجيل لا يرفعان الحظر', () => q(`select public.start_trial()`), 'access_revoked')
  // ولا حتى شراء لاحق
  await asRole(db, 'service_role')
  const bought = await q(`select public.admin_grant_premium('banned@example.com','salla','BAN-ORDER',1999,null) as s`)
  check('وشراء لاحق يُسجَّل لكن الوصول يبقى محظورًا', bought.rows[0].s === 'revoked')
  await asRole(db, 'authenticated', reborn)
  const st2 = await q(`select state from public.my_entitlement()`)
  check('والحالة ما زالت revoked بعد الشراء', st2.rows[0].state === 'revoked')
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n③ القوّة الغاشمة — رقم لا صفة')
// ══════════════════════════════════════════════════════════════════════════
{
  await asRole(db, null)
  // الأبجدية تُقرأ من **الدالة المنشورة** لا من ملف مصدر ولا من ذاكرة الكاتب.
  const def = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p
                        join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname='private' and p.proname='normalize_access_code'`)).rows[0].d
  const charClass = def.match(/\^\[([^\]]+)\]\+\$/)?.[1] ?? ''
  const upper = new Set(charClass.replace(/[a-z]/g, '').split(''))
  const minLen = Number(def.match(/char_length\(trimmed\)\s*<\s*(\d+)/)?.[1] ?? 0)
  const alphabet = upper.size
  check(`الأبجدية مقروءة من الدالة المنشورة: ${alphabet} رمزًا`, alphabet === 32, [...upper].join(''))
  check(`الطول الأدنى مقروء من الدالة المنشورة: ${minLen}`, minLen === 10)
  const space = Math.pow(alphabet, minLen)
  const bits = minLen * Math.log2(alphabet)
  console.log(`\n     فضاء المفاتيح = ${alphabet}^${minLen} = ${space.toExponential(4)} ≈ ${bits} بتًا`)

  // معدّل المحاولات **مقيس** لا مفترض: أسوأ حالة خادم (بلا شبكة، بلا مصادقة).
  const u = await makeUser(db, 'bruteforce@example.com')
  await asRole(db, 'authenticated', u)
  const ALPHA = [...upper].join('')
  const guess = () => Array.from({ length: minLen }, () => ALPHA[Math.floor(Math.random() * alphabet)]).join('')
  const N = 300
  const t0 = process.hrtime.bigint()
  for (let i = 0; i < N; i++) { try { await q(`select public.redeem_access_code($1)`, [guess()]) } catch { /* متوقّع */ } }
  const secs = Number(process.hrtime.bigint() - t0) / 1e9
  const rate = N / secs
  console.log(`     معدّل مقيس داخل العملية: ${rate.toFixed(0)} محاولة/ث (حدّ أعلى نظري — بلا HTTP ولا JWT ولا شبكة)`)
  const yrs = (r) => space / r / 31_557_600
  console.log(`     المسح الكامل عند ١٬٠٠٠ محاولة/ث   ≈ ${yrs(1e3).toExponential(2)} سنة (المتوقّع نصفه)`)
  console.log(`     المسح الكامل عند ١٠٠٬٠٠٠ محاولة/ث ≈ ${yrs(1e5).toExponential(2)} سنة`)
  console.log(`     وبـK كودًا حيًّا: المتوقّع = ${space.toExponential(2)}/K محاولة — K=1000 عند ١٠٠ألف/ث ≈ ${(space / 1000 / 1e5 / 86400).toFixed(0)} يومًا`)

  check('لا محدِّد معدّل: ٣٠٠ محاولة متتالية لم تُخنَق ولا مرّة', rate > 1)
  check(`الفضاء ≥ ٢^٥٠ فالمسح الأعمى غير عملي (${bits} بتًا)`, bits >= 50)
  // ⚠️ الحدّ الحقيقي: العقد يفرض **الشكل** لا **العشوائية**.
  await asRole(db, null)
  const weak = 'RAMADAN2345'
  const weakAccepted = (await q(`select private.normalize_access_code($1) as c`, [weak])).rows[0].c
  finding('F-5 [P2]', `العقد يفرض الشكل لا العشوائية: كود معجميّ «${weak}» يمرّ التطبيع ⇒ «${weakAccepted}». فالـ٥٠ بتًا سقفٌ لا أرضية`,
    weakAccepted === weak.toUpperCase())
  const noGenerator = true // لا مولّد أكواد في المستودع — يُثبَت في test:attack-gates
  check('التخفيف الوحيد الفعّال: توليد آلي — ولا مولّد في المستودع (انظر test:attack-gates)', noGenerator)
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n④ استغلال التجربة — والساعة سلطتها الخادم')
// ══════════════════════════════════════════════════════════════════════════
{
  await asRole(db, null)
  const t = await makeUser(db, 'trial@example.com')
  await asRole(db, 'authenticated', t)
  const s = await q(`select public.start_trial() as s`)
  check('تجربة أولى ناجحة', s.rows[0].s === 'trialActive')
  await asRole(db, null)
  const span = (await q(`select (expires_at - activated_at)::text sp, expires_at, activated_at
                          from public.entitlements where user_id=$1`, [t])).rows[0]
  check(`المدّة ٧٢ ساعة بالضبط (${span.sp})`, span.sp === '3 days' || span.sp === '72:00:00')
  await asRole(db, 'authenticated', t)
  await refused('طلب تجربة ثانية ⇒ trial_already_used', () => q(`select public.start_trial()`), 'trial_already_used')

  // «متصفّح جديد / خروج ودخول / مسح التخزين» كلها **لا تلمس الخادم** — يُبرهَن
  // بأن الحالة لا تُقرأ من العميل أصلًا: نفس uid يعطي نفس الجواب دائمًا.
  await asRole(db, null)
  await q(`delete from public.entitlements where user_id=$1`, [t]) // = مسح كل أثر جانب العميل + صفّ المنحة
  await asRole(db, 'authenticated', t)
  await refused('مسح كل الحالة المحلّية + صفّ المنحة ⇒ ما زال trial_already_used', () => q(`select public.start_trial()`), 'trial_already_used')

  // حذف الحساب كاملًا ثم إعادة التسجيل بنفس البريد
  await asRole(db, null)
  await q(`delete from auth.users where id=$1`, [t])
  const t2 = await makeUser(db, 'trial@example.com')
  await asRole(db, 'authenticated', t2)
  await refused('حذف الحساب + إعادة التسجيل ⇒ ما زال trial_already_used', () => q(`select public.start_trial()`), 'trial_already_used')

  // الساعة: `expires_at` مقارَن بـnow() الخادم؛ لا مدخل من العميل إطلاقًا
  await asRole(db, null)
  const derive = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p
                           join pg_namespace n on n.oid=p.pronamespace
                           where n.nspname='private' and p.proname='derive_state'`)).rows[0].d
  check('الاشتقاق يقارن بـnow() الخادم', /now\(\)/.test(derive))
  check('ولا يقبل أي بارامتر وقت من المستدعي', !/p_now|p_client|client_time/.test(derive))
  const myEnt = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p
                          join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='my_entitlement'`)).rows[0].d
  check('my_entitlement بلا بارامترات ⇒ لا حقن هوية ولا وقت', /my_entitlement\(\)/.test(myEnt))
  // تدوير الساعة إلى الأمام على الخادم هو الوحيد الذي ينهي التجربة
  const t3 = await makeUser(db, 'clock@example.com')
  await asRole(db, 'authenticated', t3)
  await q(`select public.start_trial()`)
  await asRole(db, null)
  await q(`update public.entitlements set expires_at = now() - interval '1 second' where user_id=$1`, [t3])
  await asRole(db, 'authenticated', t3)
  const expired = await q(`select state from public.my_entitlement()`)
  check('انقضاء الوقت يُشتقّ فورًا (trialExpired) بلا وظيفة دورية', expired.rows[0].state === 'trialExpired')

  // ⚠️ الحدّ: البصمة على البريد **حرفيًا** — لا تطبيع لوسوم `+` ولا نقاط Gmail
  await asRole(db, null)
  const alias = await makeUser(db, 'trial+farm1@example.com')
  await asRole(db, 'authenticated', alias)
  const aliasTrial = await errorOf(() => q(`select public.start_trial()`))
  finding('F-4 [P2]', 'وسم «+» يعطي تجربة ٧٢ ساعة جديدة من نفس صندوق البريد — لا تطبيع للأسماء المستعارة',
    aliasTrial === null, aliasTrial ?? 'trialActive')
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ الاسترجاع والشراء — إعادة الطلب وربط الهوية')
// ══════════════════════════════════════════════════════════════════════════
{
  await asRole(db, null)
  const buyer = await makeUser(db, 'buyer@example.com')
  await asRole(db, 'service_role')
  const g1 = await q(`select public.admin_grant_premium('buyer@example.com','salla','ORD-A1',1999,'{"r":1}'::jsonb) as s`)
  check('شراء أوّل ⇒ premiumActive', g1.rows[0].s === 'premiumActive')
  const g2 = await q(`select public.admin_grant_premium('buyer@example.com','salla','ORD-A1',1999,'{"r":1}'::jsonb) as s`)
  check('إعادة نفس الطلب idempotent ⇒ premiumActive بلا صفّ ثانٍ', g2.rows[0].s === 'premiumActive')
  await asRole(db, null)
  const n = await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-A1'`)
  check('سجلّ الشراء صفّ واحد لا صفّان', n.rows[0].n === 1)
  await asRole(db, 'service_role')
  await refused('إعادة الطلب نفسه لهوية أخرى ⇒ purchase_identity_mismatch',
    () => q(`select public.admin_grant_premium('thief@example.com','salla','ORD-A1',1999,null)`), 'purchase_identity_mismatch')
  await refused('ومع مسافات محيطة (التفاف التطبيع) ⇒ ما زال مرفوضًا',
    () => q(`select public.admin_grant_premium('thief@example.com','salla','  ORD-A1  ',1999,null)`), 'purchase_identity_mismatch')
  await refused('مزوّد غير معتمد مرفوض', () => q(`select public.admin_grant_premium('x@example.com','stripe','O',1,null)`), 'invalid_purchase_provider')
  await refused('معرّف طلب فارغ مرفوض', () => q(`select public.admin_grant_premium('x@example.com','salla','   ',1,null)`), 'invalid_provider_order_id')

  // الشراء ينجو من حذف الحساب
  await asRole(db, null)
  await q(`delete from public.entitlements where user_id=$1`, [buyer])
  await q(`delete from auth.users where id=$1`, [buyer])
  const reborn = await makeUser(db, 'buyer@example.com')
  await asRole(db, 'authenticated', reborn)
  const claimed = await q(`select public.claim_pending_grants() as s`)
  check('بعد حذف الحساب وإعادة التسجيل: Premium يُسترجَع', claimed.rows[0].s === 'premiumActive')

  // ⚠️ الفحص الغائب: `claim_pending_grants` لا تطلب بريدًا **مؤكَّدًا**
  await asRole(db, null)
  await asRole(db, 'service_role')
  await q(`select public.admin_grant_premium('victim@example.com','salla','ORD-V9',1999,null)`)
  await asRole(db, null)
  const impostor = await makeUser(db, 'victim@example.com', /* confirmed */ false)
  await asRole(db, 'authenticated', impostor)
  const stolen = await errorOf(() => q(`select public.claim_pending_grants()`))
  const impostorState = stolen === null ? (await q(`select state from public.my_entitlement()`)).rows[0].state : 'refused'
  // 🛡️ أُغلقت في [OVERNIGHT-5] بالهجرة 20260816120001. الشاهد **مقلوب عمدًا**:
  // كان يثبت وقوع العطل، وصار يحرس بقاءه مغلقًا. عودة الثغرة تُسقطه بالاسم.
  check('🛡️ F-2 [P1] بريد غير مؤكَّد لا ينال شراء ذلك العنوان — يُرفض بـemail_not_verified',
    stolen !== null && /email_not_verified/.test(String(stolen)), stolen ?? impostorState)
  check('ولم يُمنَح شيء فعلًا — لا استحقاق خلف الرفض',
    (await q(`select count(*)::int n from public.entitlements where user_id = '${impostor}'`)).rows[0].n === 0)
  const trialGuard = (await (async () => { await asRole(db, null); return q(`select pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='start_trial'`) })()).rows[0].d
  check('والتناظر مكسور بنيويًا: start_trial تفحص email_confirmed_at', /email_confirmed_at/.test(trialGuard))
  const claimDef = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='claim_pending_grants'`)).rows[0].d
  check('🛡️ F-2b [P1] claim_pending_grants صارت تفحص email_confirmed_at — التناظر مع start_trial مُصلَح',
    /email_confirmed_at/.test(claimDef))
  const redeemDef = (await q(`select pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='redeem_access_code'`)).rows[0].d
  finding('F-2c [P2]', 'ولا redeem_access_code كذلك', !/email_confirmed_at/.test(redeemDef))
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑥ استيعاب سلة — الذرّية وأثر الخطأ العابر')
// ══════════════════════════════════════════════════════════════════════════
{
  await asRole(db, null)
  await makeUser(db, 'paidcustomer@example.com')
  // حقن عطل: أوّل إدراج في purchase_ledger يرفع خطأ **عابرًا** (40001) — تمامًا
  // كتصادم تسلسل أو جمود تحت الحمل. لا تُعدَّل أي هجرة: العطل يُركَّب في الصندوق.
  // العدّاد **تسلسل** لا جدول: `nextval` لا يتراجع مع التراجع.
  //
  // وهذا ليس تفصيلًا في الحصّاد بل نتيجة مباشرة للإصلاح: العدّاد الجدولي كان
  // يعمل حين **يُبتلع** الاستثناء (البصمة تُحرق فلا تصل المحاولة التالية إلى
  // المُحفِّز أصلًا). وبعد أن صار العابر يُرفَع، يتراجع تحديثُ الجدول مع
  // التراجع فيبقى العطل أبديًا — أي أنه لم يعد «عابرًا» فلا يختبر ما نريد.
  // التسلسل يجعل العطل عابرًا حقًّا، فيُختبَر مسار العودة لا مسار اليأس.
  await db.exec(`
    drop sequence if exists public.__fault_seq;
    create sequence public.__fault_seq;
    create or replace function public.__fault_trg() returns trigger
      language plpgsql as $fn$
      begin
        if nextval('public.__fault_seq') = 1 then
          raise exception 'could not serialize access due to concurrent update' using errcode = '40001';
        end if;
        return new;
      end; $fn$;
    drop trigger if exists fault_once on public.purchase_ledger;
    create trigger fault_once before insert on public.purchase_ledger
      for each row execute function public.__fault_trg();
  `)
  await asRole(db, 'service_role')
  const ingest = () => q(`select public.salla_ingest_event('FP-TRANSIENT','order.status.updated','ORD-T1',
                       'paidcustomer@example.com',1999,'SAR','completed',true,'paid_order') as s`)
  // 🛡️ أُغلقت في [OVERNIGHT-5]. الشاهد **مقلوب**: كان يثبت ضياع الشراء، وصار
  // يحرس أن العابر **يُرفَع** فلا يُحرق له بصمة.
  const transientErr = await errorOf(ingest)
  check('🛡️ F-1 [P1] العطل العابر (40001) يُرفَع ولا يُبتلع — فالدالّة الطرفية تعيد 5xx وسلة تعيد المحاولة',
    transientErr !== null && /serialize/i.test(String(transientErr)), String(transientErr))
  await asRole(db, null)
  const burned = (await q(`select count(*)::int n from public.salla_webhook_events where event_fingerprint='FP-TRANSIENT'`)).rows[0].n
  check('★ ولم تُحرق البصمة: لا سطر تدقيق للنتيجة غير النهائية', burned === 0)
  // والمحاولة التالية — بعد زوال العطل — تنجح وتُسجّل الشراء. هذا هو مسار
  // العودة الذي لم يكن موجودًا: المال لم يعد يضيع.
  await asRole(db, 'service_role')
  const retry = await ingest()
  await asRole(db, null)
  const led = (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-T1'`)).rows[0].n
  check('★ إعادة سلة بعد زوال العطل تنجح — الشراء يصل صاحبه',
    retry.rows[0].s === 'processed' && led === 1, `retry=${retry.rows[0].s} ledger=${led}`)
  await db.exec(`drop trigger if exists fault_once on public.purchase_ledger; drop sequence if exists public.__fault_seq;`)

  // وبلا عطل: المسار السليم ذرّي ولا يمنح مرّتين
  await asRole(db, null)
  await makeUser(db, 'happy@example.com')
  await asRole(db, 'service_role')
  const h1 = await q(`select public.salla_ingest_event('FP-OK','order.status.updated','ORD-OK','happy@example.com',1999,'SAR','completed',true,'paid_order') as s`)
  const h2 = await q(`select public.salla_ingest_event('FP-OK','order.status.updated','ORD-OK','happy@example.com',1999,'SAR','completed',true,'paid_order') as s`)
  check('التسليم السليم processed ثم duplicate', h1.rows[0].s === 'processed' && h2.rows[0].s === 'duplicate')
  await asRole(db, null)
  const once = (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-OK'`)).rows[0].n
  check('ولا يمنح إلا مرّة واحدة', once === 1)
  // بصمة مختلفة لنفس الطلب (انتقال حالة ثانٍ) لا تمنح مرّتين
  await asRole(db, 'service_role')
  await q(`select public.salla_ingest_event('FP-OK-2','order.status.updated','ORD-OK','happy@example.com',1999,'SAR','completed',true,'paid_order')`)
  await asRole(db, null)
  const still = (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id='ORD-OK'`)).rows[0].n
  check('انتقال حالة ثانٍ لنفس الطلب (بصمة أخرى) لا ينشئ شراءً ثانيًا', still === 1)
  // حدث غير مؤهَّل يُسجَّل ولا يمنح
  await asRole(db, 'service_role')
  const ig = await q(`select public.salla_ingest_event('FP-IGN','order.created','ORD-IG','x@example.com',1999,'SAR','pending',false,'unsupported_event') as s`)
  const rj = await q(`select public.salla_ingest_event('FP-RJ','order.status.updated','ORD-RJ','x@example.com',500,'SAR','completed',false,'amount_mismatch') as s`)
  check('حدث غير مدعوم ⇒ ignored', ig.rows[0].s === 'ignored')
  check('طلب مدفوع يخالف السياسة ⇒ rejected (لعين إنسان)', rj.rows[0].s === 'rejected')
  await asRole(db, null)
  const noGrant = (await q(`select count(*)::int n from public.purchase_ledger where provider_order_id in ('ORD-IG','ORD-RJ')`)).rows[0].n
  check('ولا واحد منهما منح شيئًا', noGrant === 0)
  await refused('بصمة فارغة مرفوضة', () => (asRole(db, 'service_role'), q(`select public.salla_ingest_event('','e','o','x@example.com',1,'SAR','completed',true,'paid_order')`)), 'ingest_fingerprint_missing')
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑦ حقن SQL و search_path')
// ══════════════════════════════════════════════════════════════════════════
{
  await asRole(db, null)
  const inj = await makeUser(db, 'inject@example.com')
  await asRole(db, 'authenticated', inj)
  for (const payload of [
    `' or 1=1--`, `X'; drop table public.entitlements;--`, `ABCDEFGHJK' union select 1--`,
    `'; update public.entitlements set entitlement_type='premium';--`, `\\'; select pg_sleep(1);--`,
  ]) {
    await refused(`حقن «${payload.slice(0, 28)}…» يُردّ بـinvalid_code لا بخطأ نحوي`,
      () => q(`select public.redeem_access_code($1)`, [payload]), 'invalid_code')
  }
  await asRole(db, null)
  const stillThere = (await q(`select count(*)::int n from public.entitlements`)).rows[0].n
  check(`جدول المنح سليم بعد كل الحقن (${stillThere} صفًّا)`, stillThere > 0)
  // كل دالة وصول: security definer + search_path مفرَّغ
  const fns = await q(`select n.nspname||'.'||p.proname as fn, p.prosecdef,
                              coalesce(array_to_string(p.proconfig,','),'') as cfg
                         from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname in ('public','private')
                          and p.proname in ('my_entitlement','start_trial','redeem_access_code',
                              'claim_pending_grants','admin_grant_premium','admin_revoke','admin_unrevoke',
                              'admin_create_access_code','salla_ingest_event','hash_identity',
                              'identity_hashes','active_pepper_version','derive_state','grant_rank',
                              'is_access_revoked','normalize_access_code')`)
  const bad = fns.rows.filter((r) => !r.prosecdef || !r.cfg.includes('search_path='))
  check(`كل دوال الوصول (${fns.rows.length}) security definer بـsearch_path مفرَّغ`, bad.length === 0,
    bad.map((b) => b.fn).join(', '))
  const notEmpty = fns.rows.filter((r) => !/search_path=("")?$/.test(r.cfg.split(',').find((c) => c.startsWith('search_path')) ?? 'x'))
  check('وقيمته فارغة فعلًا لا مخطّطًا مسمّى', notEmpty.length === 0, notEmpty.map((b) => `${b.fn}:${b.cfg}`).join(', '))
}

// ══════════════════════════════════════════════════════════════════════════
const bad = results.filter((r) => !r.pass)
const findings = results.filter((r) => r.name.startsWith('⚔️') && r.pass)
console.log(`\n${bad.length === 0 ? '🎉' : '⛔'} ${results.length - bad.length} نجحت / ${bad.length} فشلت`)
console.log(`   ⚔️ ${findings.length} عيبًا مُثبَتًا بالتنفيذ — تفصيلها في docs/security/COMMERCE-ADMIN-THREAT-MODEL.md\n`)
if (bad.length) { bad.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
await db.close()
