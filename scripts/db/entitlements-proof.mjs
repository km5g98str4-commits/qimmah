// ============================================================================
// test:entitlements — إثبات **منفَّذ** لنظام الوصول على Postgres حقيقي.
// ============================================================================
// يشغّل ملفَّي الهجرة **كما هما من القرص** (لا نسخة ولا إعادة كتابة) على قاعدة
// PostgreSQL حقيقية داخل العملية (PGlite/WASM)، ثم يمارس السلوك فعليًا.
//
// لماذا لا يكفي إثبات نصّي: فحص النصّ يثبت أن السطر مكتوب، لا أن Postgres يقبله
// ولا أن السلوك هو المقصود. حدّ التزامن، ودلالات الحذف، وحدود الوقت — كلّها
// تُثبَت بالتشغيل أو لا تُثبَت (§4 من الميثاق: ممنوع ادّعاء اكتمال بلا اختبار).
//
// ما لا يستطيعه هذا الإثبات ويُعلنه صراحةً: PGlite جلسة واحدة، فلا جلستان
// متوازيتان حقيقيتان. لذلك يُثبَت أمان التزامن بثلاث طبقات: وجود `for update`
// نصًّا · تسلسل الاستردادات فعليًا · و**رفض قاعدة البيانات** لتجاوز الحدّ حتى
// لو كُتب مباشرةً (القيد البنيوي هو شبكة الأمان لا القفل وحده).
//
// التشغيل: npm run test:entitlements
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mig = (f) => readFileSync(join(root, 'supabase/migrations', f), 'utf8')

const CORE = '20260806120001_entitlements_core.sql'
const RPCS = '20260806120002_entitlement_rpcs.sql'
const DEL = '20260713120007_delete_own_account.sql'

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
    return check(name, false, 'لم يُرفع أي استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? '' : `توقّعنا "${expect}" فجاء: ${m.slice(0, 120)}`)
  }
}

process.on('uncaughtException', (e) => {
  console.error(`\n⛔ توقّف الإثبات باستثناء غير متوقّع:\n   ${String(e.message || e).split('\n')[0]}`)
  if (e.query) console.error(`   عند: ${String(e.query).trim().split('\n')[0]}`)
  process.exit(1)
})

const db = await PGlite.create()
const asRole = async (role, uid) => {
  await db.exec(`reset role;`)
  if (uid !== undefined) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  if (role) await db.exec(`set role ${role};`)
}
const q = (sql, params) => db.query(sql, params)

console.log('\n🔐 إثبات نظام الوصول — Postgres منفَّذ (PGlite)\n')

// ── ٠) بيئة شبيهة بـSupabase: الأدوار + auth.uid() من الـGUC ────────────────
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- ⚠ محاكاة سلوك Supabase الحقيقي: المشروع يمنح anon/authenticated صلاحيات
  -- **كاملة** على جداول public افتراضيًا. بدون هذا السطر يمرّ كل فحص «ممنوع»
  -- مجّانًا — لأن الدور لم يُمنح شيئًا أصلًا — فيبدو الـREVOKE فعّالًا وهو غير
  -- مُختبَر. القاعدة: الاستثناء يُحرَس بتأكيد يثبت أنه لم يصر قاعدة (§4.2).
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    email_confirmed_at timestamptz
  );
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
`)
const ver = await q(`select version() as v`)
check('قاعدة بيانات حقيقية', /PostgreSQL/.test(ver.rows[0].v), ver.rows[0].v.split(' on ')[0])

// ── ١) إنشاء المخطّط من قاعدة نظيفة ────────────────────────────────────────
let created = true
try {
  await db.exec(mig(DEL)) // الدالة القائمة — تُختبر ضدّ الجداول الجديدة لاحقًا
  await db.exec(mig(CORE))
  await db.exec(mig(RPCS))
} catch (e) {
  created = false
  console.error('\n  المهاجرة فشلت:', e.message, '\n')
}
if (!check('إنشاء المخطّط من قاعدة نظيفة', created)) {
  console.log('\n⛔ توقّف: فشل الهجرة يمنع بقية الإثبات.\n')
  process.exit(1)
}

// idempotency: إعادة التشغيل لا تكسر
let rerun = true
try { await db.exec(mig(CORE)); await db.exec(mig(RPCS)) } catch (e) { rerun = false; console.error('   ', e.message) }
check('الهجرة idempotent (تشغيل ثانٍ)', rerun)

// ── ٢) الملح المُرقَّم ─────────────────────────────────────────────────────
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (1, 'pepper-v1-0123456789abcdef0123456789abcdef')`)

const h1 = await q(`select private.hash_identity('A@Example.COM ', 1) as h`)
const h2 = await q(`select private.hash_identity('a@example.com', 1) as h`)
check('البصمة تُطبَّع (حالة أحرف/مسافات)', h1.rows[0].h === h2.rows[0].h)
check('البصمة ليست البريد نصًّا', !h1.rows[0].h.includes('@') && h1.rows[0].h.length === 64)

await mustFail('رفض إصدار ملح مجهول', () => q(`select private.hash_identity('a@example.com', 99)`), 'unknown pepper version')
await mustFail('رفض هوية فارغة', () => q(`select private.hash_identity('   ', 1)`), 'empty identity')

// لا رجوع صامت: إصدار ٢ يعطي بصمة مختلفة، ولا يُخدَم أحدهما مكان الآخر
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (2, 'pepper-v2-fedcba9876543210fedcba9876543210')`)
const hv2 = await q(`select private.hash_identity('a@example.com', 2) as h`)
check('كل إصدار بصمة مستقلّة (لا رجوع صامت)', hv2.rows[0].h !== h1.rows[0].h)
const act = await q(`select private.active_pepper_version() as v`)
check('الإصدار النشط = الأحدث غير المتقاعد', act.rows[0].v === 2)
await db.exec(`update private.identity_pepper set retired_at = now() where version = 2`)
const act2 = await q(`select private.active_pepper_version() as v`)
check('التقاعد يعيد النشط للإصدار السابق', act2.rows[0].v === 1)
const lookup = await q(`select count(*)::int as n from private.identity_hashes('a@example.com')`)
check('البحث يمسح الإصدارات المتقاعدة أيضًا', lookup.rows[0].n === 2, `${lookup.rows[0].n} إصدارين`)

// ── ٣) المستخدمون ─────────────────────────────────────────────────────────
// إنشاء مستخدم = عمل مالك القاعدة (Supabase Auth)، لا عمل دور عميل.
// `reset role` هنا مقصود: مخطّط auth ممنوع على anon/authenticated — وهذا
// جزء من الضمان لا عائق فيه.
const mkUser = async (email, confirmed = true) => {
  await db.exec(`reset role;`)
  const r = await q(
    `insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`,
    [email, confirmed ? new Date().toISOString() : null],
  )
  return r.rows[0].id
}
const A = await mkUser('a@example.com')
const B = await mkUser('b@example.com')
const U = await mkUser('unconfirmed@example.com', false)

// ── ٣.٥) تأكيد مضادّ: المنح الافتراضي حيّ فعلًا ────────────────────────────
// لولا هذا لكانت كل نتيجة «permission denied» أدناه مجّانية. نُنشئ جدولًا لم
// تمسّه الهجرة، ونثبت أن `authenticated` يقرؤه — فما مُنع بعده مُنع بالـREVOKE.
await asRole(null)
await db.exec(`create table public.grant_probe (id int); insert into public.grant_probe values (1);`)
await asRole('authenticated', A)
let probeOk = false
try { probeOk = (await q(`select count(*)::int n from public.grant_probe`)).rows[0].n === 1 } catch { probeOk = false }
check('المنح الافتراضي حيّ (فحوص المنع ليست مجّانية)', probeOk)

// ── ٤) لا كتابة من العميل ─────────────────────────────────────────────────
await asRole('authenticated', A)
await mustFail('العميل لا يُدرِج منحة لنفسه', () =>
  q(`insert into public.entitlements (user_id, email, entitlement_type, source, no_expiry)
     values ($1,'a@example.com','premium','manual',true)`, [A]), 'permission denied')
await mustFail('العميل لا يقرأ جدول الأكواد', () => q(`select * from public.access_codes`), 'permission denied')
await mustFail('العميل لا يقرأ سجلّ التجربة', () => q(`select * from public.trial_ledger`), 'permission denied')
await mustFail('العميل لا يقرأ سجلّ الشراء', () => q(`select * from public.purchase_ledger`), 'permission denied')
await mustFail('العميل لا ينادي دالة الإدارة', () =>
  q(`select public.admin_revoke($1,'x')`, [A]), 'permission denied')
await mustFail('العميل لا ينادي دالة البصمة الداخلية', () =>
  q(`select private.hash_identity('a@example.com',1)`), 'permission denied')

// TRUNCATE **لا تحرسها RLS** — صلاحية جدول لا صفّ. سحب insert/update/delete
// وحدها كان يترك للعميل محو منح كل المستخدمين بأمر واحد (أُثبت عمليًا).
for (const t of ['entitlements', 'access_code_redemptions', 'access_codes',
                 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger']) {
  await mustFail(`العميل لا يستطيع TRUNCATE على ${t}`,
    () => db.exec(`truncate public.${t}`), 'permission denied')
}
// وصلاحيات `authenticated` على الجدولين المقروءين = SELECT وحدها، لا أكثر.
await asRole(null)
const grants = await q(`select table_name, string_agg(distinct privilege_type, ',' order by privilege_type) pr
                        from information_schema.role_table_grants
                        where table_schema='public' and grantee='authenticated'
                          and table_name in ('entitlements','access_code_redemptions')
                        group by table_name order by table_name`)
check('authenticated يملك SELECT فقط على الجدولين المقروءين',
  grants.rows.length === 2 && grants.rows.every((r) => r.pr === 'SELECT'),
  grants.rows.map((r) => `${r.table_name}=${r.pr}`).join(' '))
const anyGrant = await q(`select count(*)::int n from information_schema.role_table_grants
                          where table_schema='public' and grantee in ('anon','authenticated')
                            and table_name in ('access_codes','trial_ledger','purchase_ledger','code_redemption_ledger')`)
check('لا صلاحية إطلاقًا على الأكواد والسجلّات لأي دور عميل', anyGrant.rows[0].n === 0, `${anyGrant.rows[0].n}`)

await asRole('anon')
await mustFail('anon لا يقرأ المنح', () => q(`select * from public.entitlements`), 'permission denied')
await mustFail('anon لا ينادي my_entitlement', () => q(`select * from public.my_entitlement()`), 'permission denied')

// ── ٥) التجربة ────────────────────────────────────────────────────────────
await asRole('authenticated', U)
await mustFail('بريد غير مؤكَّد لا يبدأ تجربة', () => q(`select public.start_trial()`), 'email_not_verified')

await asRole('authenticated', A)
const t1 = await q(`select public.start_trial() as s`)
check('بدء التجربة ينجح لحساب مُوثَّق', t1.rows[0].s === 'trialActive')

const span = await q(`select (expires_at - activated_at) = interval '72 hours' as ok
                      from public.entitlements where user_id = $1`, [A])
check('مدّة التجربة ٧٢ ساعة بالضبط', span.rows[0].ok === true)

await mustFail('تجربة ثانية لنفس الهوية مرفوضة بسبب السجلّ الدائم',
  () => q(`select public.start_trial()`), 'trial_already_used')

// حدّ الانتهاء مُشتقّ من وقت القاعدة — يُختبر على الحدّ نفسه.
// يُنادى بدور المالك: `private` ممنوع على كل دور عميل (أُثبت أعلاه)، والمسار
// الشرعي للعميل هو my_entitlement() وحدها.
await asRole(null)
const der = await q(`
  select private.derive_state('trial', false, now() + interval '1 second', null) as before,
         private.derive_state('trial', false, now(),                        null) as at_boundary,
         private.derive_state('trial', false, now() - interval '1 second',  null) as after`)
check('قبل الـ٧٢ ساعة: trialActive', der.rows[0].before === 'trialActive')
check('عند الحدّ تمامًا: trialExpired (حصري)', der.rows[0].at_boundary === 'trialExpired')
check('بعد الحدّ: trialExpired', der.rows[0].after === 'trialExpired')

// ── ٦) عزل حسابين ─────────────────────────────────────────────────────────
await asRole('authenticated', B)
const bSees = await q(`select count(*)::int as n from public.entitlements`)
check('B لا يرى صفّ A (RLS بلا where)', bSees.rows[0].n === 0)
const bMine = await q(`select state from public.my_entitlement()`)
check('B يرى حالته هو فقط', bMine.rows[0].state === 'noAccess')
await asRole('authenticated', A)
const aSees = await q(`select count(*)::int as n from public.entitlements`)
check('A يرى صفّه هو', aSees.rows[0].n === 1)
const aMine = await q(`select state from public.my_entitlement()`)
check('A يرى trialActive عبر الدالة المعتمدة', aMine.rows[0].state === 'trialActive')

// ── ٧) الأكواد: الحدّ والانتهاء والتزامن ──────────────────────────────────
await asRole('service_role')
const code = await q(`select public.admin_create_access_code(
  'INFLU-2026','founder','حملة مؤثّر تجريبية',14,2,'influencer-x',null) as id`)
const codeId = code.rows[0].id
await q(`select public.admin_create_access_code('DEFAULT-DUR','founder','فحص الافتراضي') as id`)
await asRole(null)
const dflt = await q(`select duration_days from public.access_codes where id=$1`, [codeId])
const ddur = await q(`select duration_days from public.access_codes
                      where code_hash = private.hash_identity('DEFAULT-DUR',1)`)
check('مدّة الكود الافتراضية ١٤ يومًا', ddur.rows[0].duration_days === 14)
check('الكود المُنشأ يحمل مدّته المطلوبة', dflt.rows[0].duration_days === 14)

const audit = await q(`select created_by, created_reason, created_at is not null as ts
                       from public.access_codes where id=$1`, [codeId])
check('أثر إداري مسجَّل (created_by/reason/at)',
  audit.rows[0].created_by === 'founder' && audit.rows[0].created_reason.length > 0 && audit.rows[0].ts)

await asRole('authenticated', B)
const r1 = await q(`select public.redeem_access_code('influ-2026') as s`)
check('استرداد كود ينجح (وغير حسّاس لحالة الأحرف)', r1.rows[0].s === 'specialAccessActive')
await mustFail('نفس الهوية لا تستردّ نفس الكود مرّتين',
  () => q(`select public.redeem_access_code('INFLU-2026')`), 'code_already_redeemed')

// المستخدم الثالث يستهلك الحصّة الثانية، والرابع يُرفض
const C = await mkUser('c@example.com')
const D = await mkUser('d@example.com')
await asRole('authenticated', C)
const r2 = await q(`select public.redeem_access_code('INFLU-2026') as s`)
check('الاسترداد الثاني ضمن الحدّ ينجح', r2.rows[0].s === 'specialAccessActive')
await asRole('authenticated', D)
await mustFail('الاسترداد الثالث يتجاوز الحدّ فيُرفض',
  () => q(`select public.redeem_access_code('INFLU-2026')`), 'invalid_code')

// شبكة الأمان البنيوية: حتى الكتابة المباشرة لا تتجاوز الحدّ
await asRole(null)
await mustFail('القيد البنيوي يرفض تجاوز الحدّ حتى بكتابة مباشرة',
  () => q(`update public.access_codes set redemption_count = max_redemptions + 1 where id=$1`, [codeId]),
  'access_codes_within_limit')
check('قفل الصفّ `for update` موجود في مسار الاسترداد', /for update/i.test(mig(RPCS)))

// كود معطّل ومنتهٍ
await asRole('service_role')
await q(`select public.admin_create_access_code('DISABLED-1','founder','فحص التعطيل')`)
await asRole(null)
await q(`update public.access_codes set enabled=false where code_hash = private.hash_identity('DISABLED-1',1)`)
await asRole('authenticated', D)
await mustFail('كود معطّل يُرفض برسالة عامّة', () => q(`select public.redeem_access_code('DISABLED-1')`), 'invalid_code')
// كود منتهٍ: يُنشأ صحيحًا ثم **يُشيَّخ**. القيد `access_codes_window` يمنع ولادة
// كود ميت (expires_at <= starts_at) — وهو حارس مقصود ضدّ خطأ إداري، فالانتهاء
// في الإنتاج يأتي بمرور الوقت لا بالإنشاء.
await asRole('service_role')
await q(`select public.admin_create_access_code('EXPIRED-1','founder','فحص الانتهاء',14,1,null, now() + interval '1 day')`)
await asRole(null)
await mustFail('القيد يرفض كودًا يُولَد منتهيًا',
  () => q(`update public.access_codes set expires_at = starts_at - interval '1 day'
           where code_hash = private.hash_identity('EXPIRED-1',1)`), 'access_codes_window')
await q(`update public.access_codes
            set starts_at = now() - interval '10 days', expires_at = now() - interval '1 day'
          where code_hash = private.hash_identity('EXPIRED-1',1)`)
await asRole('authenticated', D)
await mustFail('كود خارج نافذته يُرفض بنفس الرسالة', () => q(`select public.redeem_access_code('EXPIRED-1')`), 'invalid_code')
await mustFail('كود غير موجود يُرفض بنفس الرسالة (لا تعداد)', () => q(`select public.redeem_access_code('NOPE-404')`), 'invalid_code')

// انتهاء صلاحية الكود الممنوح
await asRole(null)
const sp = await q(`select private.derive_state('special', false, now() - interval '1 second', null) as expired,
                           private.derive_state('special', false, now() + interval '1 day',    null) as active`)
check('منحة الكود تنتهي بانقضاء مدّتها', sp.rows[0].expired === 'noAccess' && sp.rows[0].active === 'specialAccessActive')

// ── ٨) أسبقية Premium والإلغاء ────────────────────────────────────────────
await asRole('service_role')
const g1 = await q(`select public.admin_grant_premium('b@example.com','salla','ORD-1',1999,'{}'::jsonb) as s`)
check('منح Premium ينجح', g1.rows[0].s === 'premiumActive')
const g2 = await q(`select public.admin_grant_premium('b@example.com','salla','ORD-1',1999,'{}'::jsonb) as s`)
await asRole(null)
const dup = await q(`select count(*)::int as n from public.purchase_ledger where provider_order_id='ORD-1'`)
check('تكرار حدث المزوّد idempotent (صفّ واحد)', dup.rows[0].n === 1 && g2.rows[0].s === 'premiumActive')

await asRole('authenticated', B)
const bState = await q(`select state, no_expiry, expires_at from public.my_entitlement()`)
check('B صار premiumActive بلا تاريخ انتهاء',
  bState.rows[0].state === 'premiumActive' && bState.rows[0].no_expiry === true && bState.rows[0].expires_at === null)

// كود لاحق لا يخفض Premium
await asRole('service_role')
await q(`select public.admin_create_access_code('AFTER-PREM','founder','أسبقية Premium',7,5)`)
await asRole('authenticated', B)
const afterCode = await q(`select public.redeem_access_code('AFTER-PREM') as s`)
check('كود بعد Premium لا يخفض المنحة', afterCode.rows[0].s === 'premiumActive')
const stillPrem = await q(`select state from public.my_entitlement()`)
check('الحالة بقيت premiumActive بعد الاسترداد', stillPrem.rows[0].state === 'premiumActive')

// الإلغاء يعلو على كل شيء
await asRole('service_role')
await q(`select public.admin_revoke($1,'اختبار') as s`, [B])
await asRole('authenticated', B)
const revoked = await q(`select state from public.my_entitlement()`)
check('الإلغاء يعلو حتى على Premium', revoked.rows[0].state === 'revoked')

// ── ٨.٥) مراجعة الكود: أربعة عيوب حقيقية، لكلٍّ فحصه ──────────────────────

// (أ) الإلغاء لاصق — كانت المسارات الثلاثة تُصفّر revoked_at فتُعيد الوصول ذاتيًا.
await asRole('service_role')
const R1 = await mkUser('revoked@example.com')
await asRole(null)
await q(`insert into public.entitlements (user_id,email,entitlement_type,source,activated_at,expires_at,no_expiry,revoked_at,revoked_reason)
         values ($1,'revoked@example.com','trial','trial',now(),now()+interval '72 hours',false,now(),'اختبار')`, [R1])
await asRole('authenticated', R1)
await mustFail('مُلغىً لا يبدأ تجربة ليرفع الإلغاء', () => q(`select public.start_trial()`), 'access_revoked')
await mustFail('مُلغىً لا يستردّ كودًا ليرفع الإلغاء', () => q(`select public.redeem_access_code('AFTER-PREM')`), 'access_revoked')
await mustFail('مُلغىً لا يطالب بشراء ليرفع الإلغاء', () => q(`select public.claim_pending_grants()`), 'access_revoked')
const stillRevoked = await q(`select state from public.my_entitlement()`)
check('الحالة بقيت revoked بعد المحاولات الثلاث', stillRevoked.rows[0].state === 'revoked')

// (ب) دوران الملح لا يُعطّل كودًا قائمًا — الكود أُنشئ تحت الإصدار ١.
await asRole(null)
await db.exec(`insert into private.identity_pepper (version, pepper)
               values (3, 'pepper-v3-aaaabbbbccccddddeeeeffff00001111')`)
const V3 = await mkUser('rotate@example.com')
await asRole('authenticated', V3)
const afterRotate = await q(`select public.redeem_access_code('AFTER-PREM') as s`)
check('كود أُنشئ قبل دوران الملح يبقى قابلًا للاسترداد', afterRotate.rows[0].s === 'specialAccessActive')
await asRole(null)
await db.exec(`update private.identity_pepper set retired_at = now() where version = 3`)

// (ج) كود أقصر لا يقصّ منحة سارية أطول.
await asRole('service_role')
await q(`select public.admin_create_access_code('LONG-30','founder','منحة طويلة',30,5)`)
await q(`select public.admin_create_access_code('SHORT-1','founder','منحة قصيرة',1,5)`)
const S1 = await mkUser('shorten@example.com')
await asRole('authenticated', S1)
await q(`select public.redeem_access_code('LONG-30')`)
const longExp = (await q(`select expires_at from public.my_entitlement()`)).rows[0].expires_at
await q(`select public.redeem_access_code('SHORT-1')`)
const afterShort = (await q(`select expires_at, state from public.my_entitlement()`)).rows[0]
check('كود ليوم واحد لا يقصّ منحة ٣٠ يومًا سارية',
  new Date(afterShort.expires_at).getTime() === new Date(longExp).getTime() &&
  afterShort.state === 'specialAccessActive')

// (د) لا فهرس مكرّر على user_id (قيد unique يكفي).
await asRole(null)
const idx = await q(`select count(*)::int n from pg_indexes
                     where schemaname='public' and tablename='entitlements'
                       and indexdef ilike '%(user_id)%'`)
check('فهرس واحد فقط على entitlements.user_id', idx.rows[0].n === 1, `${idx.rows[0].n}`)

// ── ٩) حذف الحساب — أخطر بند ──────────────────────────────────────────────
await asRole('service_role')
await q(`update public.entitlements set revoked_at=null, revoked_reason=null where user_id=$1`, [B])
await asRole('authenticated', B)
const beforeDel = {
  ent: (await q(`select count(*)::int n from public.entitlements`)).rows[0].n,
}
await q(`select public.delete_own_account()`)
await asRole(null)
const afterDel = {
  ent: (await q(`select count(*)::int n from public.entitlements where user_id=$1`, [B])).rows[0].n,
  red: (await q(`select count(*)::int n from public.access_code_redemptions where user_id=$1`, [B])).rows[0].n,
  usr: (await q(`select count(*)::int n from auth.users where id=$1`, [B])).rows[0].n,
  trial: (await q(`select count(*)::int n from public.trial_ledger`)).rows[0].n,
  purch: (await q(`select count(*)::int n from public.purchase_ledger`)).rows[0].n,
  codeled: (await q(`select count(*)::int n from public.code_redemption_ledger`)).rows[0].n,
}
check('حذف الحساب يمحو منحة المستخدم', beforeDel.ent === 1 && afterDel.ent === 0)
check('حذف الحساب يمحو استرداداته المنسوبة', afterDel.red === 0)
check('حذف الحساب يزيل الهوية', afterDel.usr === 0)
check('سجلّ التجربة ينجو من حذف الحساب', afterDel.trial >= 1)
check('سجلّ الشراء ينجو من حذف الحساب', afterDel.purch >= 1)
check('سجلّ حدود الأكواد ينجو من حذف الحساب', afterDel.codeled >= 1)

// إعادة التسجيل بنفس البريد: التجربة لا تتكرّر، وPremium يُسترجَع
const B2 = await mkUser('b@example.com')
await asRole('authenticated', B2)
const reclaim = await q(`select public.claim_pending_grants() as s`)
check('Premium يُسترجَع بعد الحذف وإعادة التسجيل', reclaim.rows[0].s === 'premiumActive')

const A_del = A
await asRole('authenticated', A_del)
await q(`select public.delete_own_account()`)
const A2 = await mkUser('a@example.com')
await asRole('authenticated', A2)
await mustFail('التجربة لا تتكرّر بحذف الحساب وإعادة التسجيل',
  () => q(`select public.start_trial()`), 'trial_already_used')

// حدّ الكود ينجو كذلك: C حُذف ثم عاد ⇒ لا استرداد ثانٍ لنفس الكود
await asRole('authenticated', C)
await q(`select public.delete_own_account()`)
const C2 = await mkUser('c@example.com')
await asRole('authenticated', C2)
await mustFail('حدّ الكود ينجو من حذف الحساب',
  () => q(`select public.redeem_access_code('INFLU-2026')`), 'invalid_code')

// ── ١٠) سلامة search_path و SECURITY DEFINER ──────────────────────────────
await asRole(null)
const fns = await q(`
  select n.nspname||'.'||p.proname as fn, p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), '') as cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public','private')
    and p.proname in ('my_entitlement','start_trial','redeem_access_code','claim_pending_grants',
                      'admin_create_access_code','admin_grant_premium','admin_revoke',
                      'hash_identity','identity_hashes','active_pepper_version','derive_state','grant_rank',
                      'entitlements_touch_updated_at')`)
const bad = fns.rows.filter((r) => !r.prosecdef || !r.cfg.includes('search_path='))
check(`كل دوال الوصول security definer + search_path=''`, bad.length === 0,
  bad.length ? bad.map((b) => b.fn).join(', ') : `${fns.rows.length} دالة`)
const empty = fns.rows.filter((r) => r.cfg.includes('search_path=') && !/search_path=("")|(search_path=$)|search_path=,|search_path=""/.test(r.cfg + ','))
check('search_path مُفرَّغ لا موروث', empty.length === 0 || fns.rows.every((r) => /search_path=/.test(r.cfg)))

// ── ١١) ضمانات بنيوية على المخطّط ─────────────────────────────────────────
const noStatus = await q(`select count(*)::int n from information_schema.columns
                          where table_schema='public' and table_name='entitlements' and column_name='status'`)
check('لا عمود status في المخطّط (الحالة تُشتقّ)', noStatus.rows[0].n === 0)

const durable = ['trial_ledger', 'purchase_ledger', 'code_redemption_ledger']
const withUid = await q(`select table_name from information_schema.columns
                         where table_schema='public' and column_name='user_id'
                           and table_name = any($1)`, [durable])
check('السجلّات الدائمة بلا عمود user_id (تنجو من الحذف)', withUid.rows.length === 0,
  withUid.rows.map((r) => r.table_name).join(', '))

const hv = await q(`select table_name from unnest($1::text[]) t(table_name)
                    where not exists (select 1 from information_schema.columns c
                      where c.table_schema='public' and c.table_name=t.table_name and c.column_name='hash_version')`,
  [durable])
check('hash_version على كل سجلّ هويّة دائم', hv.rows.length === 0, hv.rows.map((r) => r.table_name).join(', '))

const plain = await q(`select count(*)::int n from public.purchase_ledger where email_hash like '%@%'`)
const plain2 = await q(`select count(*)::int n from public.trial_ledger where email_hash like '%@%'`)
check('لا بريد صريح في السجلّات الدائمة', plain.rows[0].n === 0 && plain2.rows[0].n === 0)

const ret = await q(`select retention_policy,
                            (retain_until - first_trial_at) between interval '729 days' and interval '732 days' as ok
                     from public.trial_ledger limit 1`)
check('احتفاظ سجلّ التجربة موسوم ٢٤ شهرًا',
  ret.rows[0].retention_policy === 'anti_abuse_24m' && ret.rows[0].ok === true)
const pret = await q(`select retention_policy, retain_until from public.purchase_ledger limit 1`)
check('احتفاظ سجلّ الشراء مربوط بالعقد (retain_until NULL عمدًا)',
  pret.rows[0].retention_policy === 'contract_premium_recovery' && pret.rows[0].retain_until === null)

// الفحص يقرأ **الكود بلا تعليقات**: النسخة الأولى منه رسبت على نفسها لأن نصّ
// الهجرة يشرح «لا delete from في هذا الملف» — فطابَق الشرحُ النمطَ. تعليق لا
// يُنفَّذ، فلا يجوز أن يُسقط فحصًا ولا أن يُرضيه.
const stripSql = (t) => t.replace(/--[^\n]*/g, '')
const DESTRUCTIVE = /(delete\s+from|truncate|drop\s+table|pg_cron|cron\.schedule)/i
const noAuto = !DESTRUCTIVE.test(stripSql(mig(CORE)) + stripSql(mig(RPCS)))
check('لا أتمتة حذف في P2 (لا delete/truncate/cron)', noAuto)
// تأكيد مضادّ: الكاشف يفشل فعلًا على انتهاك مزروع — وإلا فالفحص زينة.
check('كاشف الأتمتة يلتقط انتهاكًا مزروعًا',
  DESTRUCTIVE.test(stripSql('-- تعليق بريء\ndelete from public.trial_ledger where true;')))

const writePolicies = await q(`select policyname, cmd from pg_policies
                               where schemaname='public'
                                 and tablename in ('entitlements','access_codes','access_code_redemptions',
                                                   'trial_ledger','purchase_ledger','code_redemption_ledger')
                                 and cmd <> 'SELECT'`)
check('لا سياسة كتابة على أي جدول وصول', writePolicies.rows.length === 0,
  writePolicies.rows.map((r) => r.policyname).join(', '))

const rlsOff = await q(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
                        where n.nspname='public' and c.relrowsecurity = false
                          and relname in ('entitlements','access_codes','access_code_redemptions',
                                          'trial_ledger','purchase_ledger','code_redemption_ledger')`)
check('RLS مفعّل على كل جداول الوصول', rlsOff.rows.length === 0, rlsOff.rows.map((r) => r.relname).join(', '))

const banned = /مدى الحياة|lifetime/i.test(mig(CORE) + mig(RPCS))
check('لا مصطلح محظور في المخطّط', !banned)

// ── الخلاصة ───────────────────────────────────────────────────────────────
await db.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${failed.length === 0 ? '🎉' : '⛔'} ${results.length - failed.length} نجحت / ${failed.length} فشلت\n`)
if (failed.length) { failed.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
