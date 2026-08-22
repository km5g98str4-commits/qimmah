// ============================================================================
// test:admin-db — إثبات **منفَّذ** لبوّابة المركز التنفيذي على Postgres حقيقي.
// [OVERNIGHT-ADMIN] · AGENT-E.
// ============================================================================
// يشغّل هجرات المستودع **كما هي من القرص** على قاعدة PostgreSQL داخل العملية
// (PGlite/WASM)، ثم يمارس البوّابة فعليًا بأربع شخصيات: زائر، مستخدم عادي،
// منتحل يكتب الدور في `raw_user_meta_data`، ومؤسس مزوَّد من الخادم.
//
// ═══ لماذا تنفيذ لا فحص نصّ ═══
// فحص النصّ يثبت أن السطر مكتوب. ولا يثبت أن Postgres يقبله، ولا أن `revoke`
// وصل الدور المقصود، ولا أن الدالة **ترفع** بدل أن تعيد صفرًا. والفرق بين
// «ترفع» و«تعيد صفرًا» هو الفرق بين منعٍ يُقرأ منعًا ومنعٍ يُقرأ **رقمًا**.
//
// ═══ التأكيد المضادّ (الميثاق §4.2) ═══
// تُبنى بيئة ثانية تُنزَع فيها سطور `perform private.require_founder();` من
// الهجرة نفسها، ويُتأكّد أن مستخدمًا عاديًا **ينجح** فيها. فلو كان المنع في
// البيئة السليمة آتيًا من شيء آخر (لا صفوف، خطأ عام، دالة غائبة) لنجح المستخدم
// في البيئتين ولسقط هذا التأكيد باسمه.
//
// التشغيل: npm run test:admin-db
// ============================================================================
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createSandbox, asRole, makeUser, migrationFiles, readMigration } from './db/lib/supabase-sandbox.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIG_ROLE = '20260816120002_founder_role_provisioning.sql'
const MIG_READ = '20260816120003_founder_dashboard_reads.sql'

let pass = 0
const results = []
function check(name, ok, detail = '') {
  results.push(ok)
  if (ok) pass += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}
/** ينجح إذا رُفع استثناء **تطابق رسالته** `expect`. لا سقوط عام يُقبل. */
async function mustFail(name, fn, expect) {
  try {
    await fn()
    return check(name, false, 'لم يُرفع أي استثناء — المسار مفتوح')
  } catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.includes(expect) ? '' : `توقّعنا «${expect}» فجاء: ${m.slice(0, 140)}`)
  }
}

/**
 * أعمدة `auth.users` التي يملكها Supabase الحقيقي ولا يحملها الصندوق المصغّر.
 * تُضاف **هنا في الإثبات** لا في الهجرة: الهجرة لا يجوز أن تُعدّل مخطّط
 * المصادقة الذي تديره المنصّة.
 */
const AUTH_STUB = `
  alter table auth.users add column if not exists raw_app_meta_data jsonb default '{}'::jsonb;
  alter table auth.users add column if not exists last_sign_in_at timestamptz;
  alter table auth.users add column if not exists created_at timestamptz not null default now();
`

console.log('\nإثبات بوّابة المركز التنفيذي — Postgres منفَّذ')

// ═══════════════ ٠) الهجرتان موجودتان وتُطبَّقان ═══════════════
for (const f of [MIG_ROLE, MIG_READ]) {
  check(`هجرة ${f} موجودة`, existsSync(join(root, 'supabase/migrations', f)))
}
const roleSql = readMigration(MIG_ROLE)
const readSql = readMigration(MIG_READ)
check('هجرة التزويد تعرّف admin_set_role', roleSql.includes('function public.admin_set_role'))
check('هجرة القراءة تعرّف الدالتين', readSql.includes('function public.founder_executive_snapshot') && readSql.includes('function public.founder_user_page'))
// ولا فعل مدمّر في أيّهما — لوحة قراءة لا تكتب ولا تحذف.
for (const [name, sql] of [[MIG_ROLE, roleSql], [MIG_READ, readSql]]) {
  const body = sql.replace(/^--.*$/gm, ' ')
  const destructive = ['drop table', 'truncate', 'delete from'].filter((k) => body.toLowerCase().includes(k))
  check(`${name} بلا فعل مدمّر`, destructive.length === 0, destructive.join(', '))
}
check('هجرة القراءة بلا كتابة إطلاقًا', !/\b(insert into|update )\b/i.test(readSql.replace(/^--.*$/gm, ' ')))

const { db, failed } = await createSandbox()
check('كل هجرات المستودع تُطبَّق من قاعدة نظيفة', failed.length === 0, failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
await db.exec(AUTH_STUB)

// ═══════════════ ١) شكل الدوال: search_path مفرَّغ + لا EXECUTE لـPUBLIC ═══════════════
await asRole(db, null)
const NEW_FNS = ['account_role', 'is_founder', 'require_founder', 'admin_set_role', 'admin_clear_role', 'founder_executive_snapshot', 'founder_user_page']
const shape = await db.query(`
  select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as cfg
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public','private') and p.proname = any($1)`, [NEW_FNS])
check(`الدوال السبع أُنشئت (${shape.rows.length})`, shape.rows.length === NEW_FNS.length)
const lax = shape.rows.filter((r) => !r.prosecdef || !/(^|,)search_path=""(,|$)/.test(r.cfg))
check('كل دالة جديدة SECURITY DEFINER بمسار مفرَّغ حرفيًا', lax.length === 0, lax.map((r) => r.proname).join(' '))

const pubExec = await db.query(`
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where p.proname = any($1) and a.grantee = 0 and a.privilege_type = 'EXECUTE'`, [NEW_FNS])
check('لا EXECUTE عبر PUBLIC على أي دالة جديدة', pubExec.rows.length === 0, pubExec.rows.map((r) => r.proname).join(' '))

const grants = await db.query(`
  select routine_name, grantee from information_schema.role_routine_grants
   where routine_schema='public' and routine_name = any($1)`, [NEW_FNS])
// المالك (`postgres`) يملك EXECUTE ضمنًا دائمًا ولا يُعدّ منحًا — الفحص على
// **أدوار العميل** وعلى `service_role` صراحةً.
const grantOf = (fn) => grants.rows.filter((r) => r.routine_name === fn).map((r) => r.grantee).sort()
for (const fn of ['admin_set_role', 'admin_clear_role']) {
  const g = grantOf(fn)
  check(`${fn}: لا anon ولا authenticated`, !g.includes('anon') && !g.includes('authenticated'), g.join(','))
  check(`${fn}: ممنوحة لـservice_role`, g.includes('service_role'), g.join(','))
}
check('founder_executive_snapshot ليست لـanon', !grantOf('founder_executive_snapshot').includes('anon'))
check('founder_executive_snapshot ممنوحة لـauthenticated', grantOf('founder_executive_snapshot').includes('authenticated'))
check('founder_user_page ليست لـanon', !grantOf('founder_user_page').includes('anon'))
// وكل دالة `founder_*` تحمل البوّابة في **جسمها** لا في المنح وحده.
const bodies = await db.query(`select proname, prosrc from pg_proc where proname like 'founder\\_%'`)
const ungated = bodies.rows.filter((r) => !r.prosrc.includes('require_founder'))
check(`كل دالة founder_* تحمل require_founder في جسمها (${bodies.rows.length})`, ungated.length === 0, ungated.map((r) => r.proname).join(' '))

// ═══════════════ ٢) بيانات واقعية ═══════════════
await asRole(db, null)
await db.exec(`insert into private.identity_pepper (version, pepper) values (1, 'admin-proof-pepper-0123456789abcdef')`)
const founderId = await makeUser(db, 'founder@qimmah.test')
const normalId = await makeUser(db, 'normal@qimmah.test')
const forgerId = await makeUser(db, 'forger@qimmah.test')
await asRole(db, null)
// مُشغّل handle_new_user قد لا يُنشئ صفوف profiles في الصندوق — تُضمَن هنا.
await db.exec(`insert into public.profiles (user_id, display_name, data)
               select u.id, 'حساب ' || left(u.id::text, 4), '{"_meta":{"completed":true}}'::jsonb
                 from auth.users u
                where not exists (select 1 from public.profiles p where p.user_id = u.id)`)
await db.query(`update auth.users set last_sign_in_at = now() - interval '2 days' where id = $1`, [founderId])
await db.query(`update auth.users set last_sign_in_at = now() - interval '90 days' where id = $1`, [normalId])
// منحة Premium حقيقية عبر المسار الإداري القائم.
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('normal@qimmah.test','salla','ORDER-1',1999,'{}'::jsonb)`)
await asRole(db, null)
await db.exec(`insert into public.salla_webhook_events (event_fingerprint, provider_order_id, classification)
               values ('fp-1','ORDER-1','processed'), ('fp-2','ORDER-2','failed')`)
await db.exec(`insert into public.access_codes (code_hash, hash_version, created_by, created_reason)
               values ('hash-a', 1, 'proof', 'test'), ('hash-b', 1, 'proof', 'test')`)

// ═══════════════ ٣) المنع — بأربع شخصيات ═══════════════
await asRole(db, 'anon', null)
await mustFail('زائر anon لا ينفّذ لقطة اللوحة', () => db.query('select public.founder_executive_snapshot()'), 'permission denied')
await mustFail('زائر anon لا ينفّذ صفحة الجدول', () => db.query(`select * from public.founder_user_page('',1,10)`), 'permission denied')
await mustFail('زائر anon لا يمنح دورًا', () => db.query(`select public.admin_set_role('x@y.z','founder','r')`), 'permission denied')

await asRole(db, 'authenticated', normalId)
await mustFail('مستخدم عادي مسجّل يُمنع بالاسم', () => db.query('select public.founder_executive_snapshot()'), 'founder_role_required')
await mustFail('مستخدم عادي لا يقرأ صفحة الجدول', () => db.query(`select * from public.founder_user_page('',1,10)`), 'founder_role_required')
await mustFail('مستخدم عادي لا يمنح نفسه الدور', () => db.query(`select public.admin_set_role('normal@qimmah.test','founder','self')`), 'permission denied')

// ⚠️ **الفحص الأهمّ:** ادّعاء مكتوب في الحقل الذي يملكه المستخدم نفسه.
await asRole(db, null)
await db.query(`update auth.users set raw_user_meta_data = '{"qimmah_role":"founder"}'::jsonb where id = $1`, [forgerId])
await asRole(db, 'authenticated', forgerId)
await mustFail(
  'ادّعاء مزوّر في raw_user_meta_data لا يمنح شيئًا',
  () => db.query('select public.founder_executive_snapshot()'),
  'founder_role_required',
)

// ═══════════════ ٤) المؤسس — عبر المسار الإداري وحده ═══════════════
await asRole(db, 'service_role')
await db.query(`select public.admin_set_role('founder@qimmah.test','founder','proof')`)
await mustFail('قيمة دور خارج القائمة البيضاء تُرفض', () => db.query(`select public.admin_set_role('normal@qimmah.test','superuser','x')`), 'unknown role')
await mustFail('منح بلا سبب يُرفض', () => db.query(`select public.admin_set_role('normal@qimmah.test','founder','')`), 'reason required')

await asRole(db, null)
const claim = await db.query(`select raw_app_meta_data ->> 'qimmah_role' as r, raw_user_meta_data from auth.users where id = $1`, [founderId])
check('الدور كُتب في app_metadata', claim.rows[0].r === 'founder')
check('الدور لم يُكتب في user_metadata', !JSON.stringify(claim.rows[0].raw_user_meta_data ?? {}).includes('qimmah_role'))

await asRole(db, 'authenticated', founderId)
const snap = (await db.query('select public.founder_executive_snapshot() as j')).rows[0].j
check('المؤسس يقرأ اللقطة', Boolean(snap) && typeof snap === 'object')
check('اللقطة تحمل لحظة قياس من الخادم', typeof snap.as_of === 'string' && snap.as_of.endsWith('Z'))
check('إجمالي الحسابات مقيس (٣)', snap.users.total === 3)
check('سلسلة النمو مصفوفة', Array.isArray(snap.users.growthSeries))
check('سجّلوا دخول ٧ أيام = ١', snap.activity.signedIn7d === 1)
check('الخامل ٣٠ يومًا = ٢', snap.activity.dormant30d === 2)
check('Premium فعّال = ١', snap.entitlement.premiumActive === 1)
check('المعاينة = ٢ (مشتقّة من المقام الكامل)', snap.entitlement.previewOnly === 2)
check('أوامر سلة المميّزة = ٢', snap.commerce.ordersSeen === 2)
check('أوامر مدفوعة = ١', snap.commerce.ordersPaid === 1)
check('أوامر فاشلة = ١', snap.commerce.ordersFailed === 1)
check('أكواد صادرة = ٢', snap.commerce.codesIssued === 2)
// ⚠️ **ما لا مصدر له لا يُرجَع أصلًا** — لا مفتاحًا ولا صفرًا.
check('اللقطة لا تحمل محاولات استرداد مرفوضة', !('redemptionFailures24h' in snap.commerce))
check('اللقطة لا تحمل كتلة أخطاء', !('errors' in snap))
check('اللقطة لا تحمل إكمال تخصيص', !('onboarding' in snap))

// ولا حقل صحّي واحد في أي مخرج.
const SENSITIVE = ['weight', 'height', 'injur', 'medicat', 'allerg', 'bodyMetrics', 'measurement']
const snapText = JSON.stringify(snap)
check(`اللقطة بلا أي حقل صحّي (${SENSITIVE.length} كلمات)`, SENSITIVE.every((k) => !snapText.toLowerCase().includes(k.toLowerCase())))

const page = await db.query(`select * from public.founder_user_page('',1,10)`)
check('صفحة الجدول تعيد الصفوف الثلاثة', page.rows.length === 3)
check('العدد الكلّي معلَن في كل صفّ', page.rows.every((r) => Number(r.total_rows) === 3))
check('البريد مُقنَّع في SQL', page.rows.every((r) => (r.email_masked ?? '').includes('••••')))
check('لا بريد كامل في المخرجات', !JSON.stringify(page.rows).includes('founder@qimmah.test'))
check('صفّ Premium مصنّف premium', page.rows.some((r) => r.entitlement === 'premium'))
const pageText = JSON.stringify(page.rows).toLowerCase()
check('صفوف الجدول بلا أي حقل صحّي', SENSITIVE.every((k) => !pageText.includes(k.toLowerCase())))
const search = await db.query(`select * from public.founder_user_page('normal',1,10)`)
check('البحث يصفّي على الخادم', search.rows.length === 1)
const empty = await db.query(`select * from public.founder_user_page('zzz-لا-يوجد',1,10)`)
check('بحث بلا نتيجة يعيد فارغًا لا خطأ', empty.rows.length === 0)

// ⚠️ **ثلاثية القيم**: حساب بلا ادّعاء يجعل المقارنة `NULL` لا `false`.
// الفحص صريح لأن هذا بالضبط ما فشل مفتوحًا قبل الإصلاح.
await asRole(db, null)
const triState = await db.query(`select private.is_founder() as b`)
check('is_founder لا تعيد NULL أبدًا', triState.rows[0].b === true || triState.rows[0].b === false)
await asRole(db, 'authenticated', normalId)
const normalTri = await db.query(`select private.is_founder() as b`).catch(() => null)
check('is_founder للمستخدم العادي false صريحة', normalTri === null || normalTri.rows[0].b === false)

// سحب الدور يُغلق الباب فورًا.
await asRole(db, 'service_role')
await db.query(`select public.admin_clear_role('founder@qimmah.test','proof-rollback')`)
await asRole(db, 'authenticated', founderId)
await mustFail('سحب الدور يُغلق الباب فورًا', () => db.query('select public.founder_executive_snapshot()'), 'founder_role_required')
await db.close()

// ═══════════════ ٥) التأكيد المضادّ — بيئة بلا بوّابة ═══════════════
console.log('\nالتأكيد المضادّ — بيئة تُنزَع فيها البوّابة من الهجرة نفسها')
const ungatedDb = await PGlite.create({ extensions: { pgcrypto } })
await ungatedDb.exec(`
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
                           email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`)
// ⚠️ **النزع يشمل كل هجرة تحمل البوّابة، لا هجرةً بعينها.**
// كان النزع محصورًا بـ`MIG_READ`، فلمّا هبطت هجرة لاحقة تعيد تعريف
// `founder_executive_snapshot` **بالبوّابة** عادت البوّابة بعد نزعها — وسقط
// التأكيد المضادّ باسمه (`منع لسبب آخر: founder_role_required`).
// وهذا بالضبط ما بُني له: **حارسٌ مربوط بملفٍّ واحد يشيخ في أوّل هجرة تالية**.
// والعدّ الآن يُقاس من الشجرة لا يُكتب رقمًا: أي هجرة جديدة تحمل البوّابة
// تدخل الحساب تلقائيًا.
const GATE_RE = /\n\s*perform private\.require_founder\(\);/g
const gatedFiles = migrationFiles().filter((f) => GATE_RE.test(readMigration(f)) && (GATE_RE.lastIndex = 0) === 0)
let stripped = 0
for (const f of migrationFiles()) {
  let sql = readMigration(f)
  const before = sql
  sql = sql.replace(GATE_RE, '\n  -- gate removed by counter-proof')
  if (sql !== before) stripped += 1
  await ungatedDb.exec(sql)
}
check(
  `البوّابة نُزعت من كل هجرة تحملها (${stripped}/${gatedFiles.length})`,
  stripped === gatedFiles.length && stripped > 0,
  gatedFiles.join(' '),
)
await ungatedDb.exec(AUTH_STUB)
await ungatedDb.exec(`insert into private.identity_pepper (version, pepper) values (1, 'counter-proof-pepper-0123456789ab')`)
const uNormal = (await ungatedDb.query(`insert into auth.users (email) values ('u@x.test') returning id`)).rows[0].id
await ungatedDb.exec(`insert into public.profiles (user_id, data)
                      select u.id, '{}'::jsonb from auth.users u
                       where not exists (select 1 from public.profiles p where p.user_id = u.id)`)
await ungatedDb.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uNormal])
await ungatedDb.exec('set role authenticated;')
let ungatedRead = null
try {
  ungatedRead = (await ungatedDb.query('select public.founder_executive_snapshot() as j')).rows[0].j
} catch (e) {
  ungatedRead = { error: String(e.message || e) }
}
// ⚠️ **هذا هو مقصد التأكيد**: بلا البوّابة يقرأ المستخدم العادي **فعلًا**.
// فلو منع شيءٌ آخر في البيئتين لسقط هذا الفحص باسمه، ولانكشف أن الفحص السابق
// كان يمرّ مجّانًا.
check(
  'بلا البوّابة: المستخدم العادي يقرأ اللقطة — فالمنع مصدره البوّابة لا الصدفة',
  Boolean(ungatedRead) && typeof ungatedRead.users?.total === 'number',
  ungatedRead?.error ? `منع لسبب آخر: ${ungatedRead.error.slice(0, 120)}` : '',
)
await ungatedDb.close()

const failedCount = results.filter((r) => !r).length
console.log(`\n${failedCount === 0 ? '✅' : '❌'} ${pass}/${results.length} فحصًا — بوّابة قاعدة البيانات\n`)
if (failedCount > 0) {
  console.error(`FAIL: ${failedCount} فحصًا سقط في إثبات بوّابة المركز التنفيذي`)
  process.exit(1)
}
