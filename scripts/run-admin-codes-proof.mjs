// ============================================================================
// test:admin-codes — إثبات **منفَّذ** لطبقة إدارة الوصول الجديدة.
// [ADMIN-R4] · حارة لوحة المؤسس.
// ============================================================================
// يشغّل هجرات المستودع كما هي على Postgres داخل العملية (PGlite)، ثم يمارس
// الدوال الأربع الجديدة بأربع شخصيات: زائر · مستخدم عادي · منتحل يكتب الدور في
// `raw_user_meta_data` · مؤسس مزوَّد من الخادم.
//
// ═══ لماذا هذا الملف موجود بجانب `test:admin-db` ═══
// ذاك يحرس بوّابة **القراءة** (اللقطة وصفحة الجدول). وهذه الموجة أضافت
// **كتابةً** يصل إليها متصفّح لأوّل مرّة: إصدار كود · تعطيله · سحب وصول. فحصُ
// الكتابة يحتاج أكثر من «هل مُنعت؟»: يحتاج أن يُثبت أن الأثر الإداري كُتب باسم
// الفاعل، وأن القدرات التي **لم** تُكشف ما زالت غير مكشوفة.
//
// ═══ التأكيدات المضادّة (الميثاق §4.2) ═══
//   ① بيئة تُنزَع فيها البوّابة من الهجرتين الجديدتين، ويجب أن **ينجح** فيها
//      مستخدم عادي — وإلا كان المنع في البيئة السليمة صدفةً لا بوّابة.
//   ② حقن `?? 0` في طبقة العقد يجب أن يُكشف بفحص مسمّى — الغياب لا يصير صفرًا.
//   ③ حذف المولّد يجب أن يُسقط فحص الإنتروبيا باسمه — لا يعود «لا مولّد» مرورًا.
//
// التشغيل: npm run test:admin-codes
// ============================================================================
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createSandbox, asRole, makeUser, migrationFiles, readMigration } from './db/lib/supabase-sandbox.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIG_DETAIL = '20260822120001_founder_user_detail.sql'
const MIG_CODES = '20260822120002_founder_code_management.sql'

let pass = 0
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  if (ok) pass += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}
/** ينجح إذا رُفع استثناء **تطابق رسالته** `expect`. لا سقوط عام يُقبل (§4.2). */
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

console.log('\nإثبات إدارة الوصول — Postgres منفَّذ')

// ═══════════════ ٠) الهجرتان موجودتان وشكلهما صحيح ═══════════════
for (const f of [MIG_DETAIL, MIG_CODES]) {
  check(`هجرة ${f} موجودة`, existsSync(join(root, 'supabase/migrations', f)))
}
const detailSql = readMigration(MIG_DETAIL)
const codesSql = readMigration(MIG_CODES)
// لوحة قراءة/إدارة لا تحذف شيئًا: لا جدولًا ولا صفًّا.
for (const [name, sql] of [[MIG_DETAIL, detailSql], [MIG_CODES, codesSql]]) {
  const body = sql.replace(/^--.*$/gm, ' ')
  const destructive = ['drop table', 'truncate', 'delete from'].filter((k) => body.toLowerCase().includes(k))
  check(`${name} بلا فعل مدمّر`, destructive.length === 0, destructive.join(', '))
}
check('هجرة التفصيل للقراءة فقط', !/\b(insert into|update )\b/i.test(detailSql.replace(/^--.*$/gm, ' ')))
// ⚠️ **القدرتان اللتان لم تُكشفا** — يُفحَص غيابهما لا وجودهما.
check(
  'لا غلاف مؤسس لمنح Premium الدائم',
  !/founder_[a-z_]*grant/i.test(codesSql) && !codesSql.includes('admin_grant_premium('),
)
check('لا غلاف مؤسس لرفع الحظر', !/founder_[a-z_]*unrevoke/i.test(codesSql))
check('وسبب الاستبعاد **مكتوب في الهجرة** لا مسكوت عنه', codesSql.includes('admin_unrevoke') && codesSql.includes('admin_grant_premium'))

const { db, failed } = await createSandbox()
check('كل هجرات المستودع تُطبَّق من قاعدة نظيفة', failed.length === 0, failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
await db.exec(AUTH_STUB)

// ═══════════════ ١) شكل الدوال الجديدة ═══════════════
await asRole(db, null)
const NEW_FNS = [
  'founder_user_detail',
  'founder_issue_access_code',
  'founder_set_code_enabled',
  'founder_revoke_access',
  'founder_code_page',
  'generate_access_code',
]
const shape = await db.query(
  `select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as cfg
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private') and p.proname = any($1)`,
  [NEW_FNS],
)
check(`الدوال الست أُنشئت (${shape.rows.length})`, shape.rows.length === NEW_FNS.length, shape.rows.map((r) => r.proname).join(' '))
const lax = shape.rows.filter((r) => !r.prosecdef || !/(^|,)search_path=""(,|$)/.test(r.cfg))
check('كل دالة جديدة SECURITY DEFINER بمسار مفرَّغ حرفيًا', lax.length === 0, lax.map((r) => r.proname).join(' '))

const pubExec = await db.query(
  `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
   lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   where p.proname = any($1) and a.grantee = 0 and a.privilege_type = 'EXECUTE'`,
  [NEW_FNS],
)
check('لا EXECUTE عبر PUBLIC على أي دالة جديدة', pubExec.rows.length === 0, pubExec.rows.map((r) => r.proname).join(' '))

const grants = await db.query(
  `select routine_name, grantee from information_schema.role_routine_grants
    where routine_name = any($1)`,
  [NEW_FNS],
)
const grantOf = (fn) => grants.rows.filter((r) => r.routine_name === fn).map((r) => r.grantee).sort()
for (const fn of NEW_FNS.filter((f) => f.startsWith('founder_'))) {
  check(`${fn}: ليست لـanon`, !grantOf(fn).includes('anon'), grantOf(fn).join(','))
  check(`${fn}: ممنوحة لـauthenticated`, grantOf(fn).includes('authenticated'), grantOf(fn).join(','))
}
// المولّد داخلي بحت — لا يناديه عميل بأي دور.
check('المولّد ليس لأي دور عميل', !grantOf('generate_access_code').includes('authenticated') && !grantOf('generate_access_code').includes('anon'))
/**
 * وكل دالة `founder_*` تحمل البوّابة في **جسمها** لا في المنح وحده.
 *
 * ═══ [COMMISSIONING §4] القاعدة صارت أدقّ لا أرخى ═══
 * كانت جملةً واحدة: «كلٌّ تحمل `require_founder`». وهي تكفي حين يكون الدور
 * واحدًا — ولمّا أُضيف `support` (يقرأ ولا يغيّر) صارت الجملة الواحدة **تخفي
 * السؤال المهمّ**: أيّ دالّة يجوز للدعم أن يبلغها؟
 *
 * فصارت قائمتين مسمّاتين. والقائمة البيضاء هي الدفاع: دالّة `founder_*` جديدة
 * لا تُذكر في أيّهما **تُسقط الفحص** — فلا تُضاف قدرةٌ بلا قرار عن دورها.
 */
const bodies = await db.query(`select proname, prosrc from pg_proc where proname like 'founder\\_%'`)
/** قراءات: يبلغها المؤسس **والدعم**. */
const ADMIN_READS = [
  'founder_executive_snapshot', 'founder_user_page', 'founder_user_detail', 'founder_code_page',
  'founder_failed_orders', 'founder_code_redemptions', 'founder_email_health',
  'founder_grants_by_source', 'founder_food_submissions',
]
/** أفعال لا رجعة فيها: للمؤسس وحده. */
const FOUNDER_WRITES = [
  'founder_issue_access_code', 'founder_set_code_enabled', 'founder_revoke_access',
  'founder_review_food_submission',
]
const known = new Set([...ADMIN_READS, ...FOUNDER_WRITES])
const unclassified = bodies.rows.filter((r) => !known.has(r.proname)).map((r) => r.proname)
check(`كل دالة founder_* مصنَّفة قراءةً أو فعلًا (${bodies.rows.length})`,
  unclassified.length === 0, unclassified.join(' '))

const bodyOf = (fn) => bodies.rows.find((r) => r.proname === fn)?.prosrc ?? ''
const readsUngated = ADMIN_READS.filter((fn) => !bodyOf(fn).includes('require_admin'))
check(`والقراءات تحمل require_admin في أجسامها (${ADMIN_READS.length})`,
  readsUngated.length === 0, readsUngated.join(' '))
// ⚠️ الأهمّ: **لا فعل يقبل الدعم**. لو تسلّل `require_admin` إلى فعلٍ لصار
// المفوَّض يُصدر أكوادًا ويسحب وصولًا — وهو بالضبط ما وُجد الدوران لمنعه.
const writesLoose = FOUNDER_WRITES.filter((fn) => !bodyOf(fn).includes('require_founder') || bodyOf(fn).includes('require_admin'))
check(`ولا فعل يقبل الدعم — كلّها require_founder وحدها (${FOUNDER_WRITES.length})`,
  writesLoose.length === 0, writesLoose.join(' '))

// ⚔️ محاكاة الالتفاف: ترخية حارس فعلٍ إلى `require_admin` يجب أن تسقط باسمها.
{
  const tampered = FOUNDER_WRITES.map((fn) => bodyOf(fn).replace('require_founder', 'require_admin'))
  check('⚔️ ترخية حارس فعلٍ إلى require_admin تُسقط الفحص',
    tampered.every((b) => b.includes('require_admin') && !b.includes('require_founder')))
}

// ═══════════════ ٢) بيانات واقعية ═══════════════
await asRole(db, null)
await db.exec(`insert into private.identity_pepper (version, pepper) values (1, 'codes-proof-pepper-0123456789abcd')`)
const founderId = await makeUser(db, 'founder@qimmah.test')
const normalId = await makeUser(db, 'normal@qimmah.test')
const forgerId = await makeUser(db, 'forger@qimmah.test')
await asRole(db, null)
await db.exec(`insert into public.profiles (user_id, display_name, data)
               select u.id, 'حساب ' || left(u.id::text, 4), '{}'::jsonb from auth.users u
                where not exists (select 1 from public.profiles p where p.user_id = u.id)`)
await asRole(db, 'service_role')
await db.query(`select public.admin_grant_premium('normal@qimmah.test','salla','ORDER-77',1999,'{}'::jsonb)`)

// ═══════════════ ٣) المنع الافتراضي — بثلاث شخصيات ═══════════════
const CALLS = [
  ['تفصيل الحساب', (id) => db.query(`select public.founder_user_detail($1)`, [id])],
  ['قائمة الأكواد', () => db.query(`select * from public.founder_code_page('',1,10)`)],
  ['إصدار كود', () => db.query(`select public.founder_issue_access_code('محاولة')`)],
  ['تعطيل كود', () => db.query(`select public.founder_set_code_enabled(gen_random_uuid(), false, 'محاولة')`)],
  ['سحب وصول', (id) => db.query(`select public.founder_revoke_access($1,'محاولة')`, [id])],
]
await asRole(db, 'anon', null)
for (const [label, fn] of CALLS) {
  await mustFail(`زائر anon: ${label} ممنوع`, () => fn(normalId), 'permission denied')
}
await asRole(db, 'authenticated', normalId)
for (const [label, fn] of CALLS) {
  await mustFail(`مستخدم عادي: ${label} يُمنع بالاسم`, () => fn(normalId), 'founder_role_required')
}
// ⚠️ **الفحص الأهمّ**: ادّعاء مكتوب في الحقل الذي يملكه المستخدم نفسه.
await asRole(db, null)
await db.query(`update auth.users set raw_user_meta_data = '{"qimmah_role":"founder"}'::jsonb where id = $1`, [forgerId])
await asRole(db, 'authenticated', forgerId)
for (const [label, fn] of CALLS) {
  await mustFail(`ادّعاء مزوّر في user_metadata: ${label} لا يمنح شيئًا`, () => fn(normalId), 'founder_role_required')
}

// ═══════════════ ٤) المؤسس — والقدرات المكشوفة تعمل ═══════════════
await asRole(db, 'service_role')
await db.query(`select public.admin_set_role('founder@qimmah.test','founder','proof')`)
await asRole(db, 'authenticated', founderId)

// ٤-أ) تفصيل الحساب
const detail = (await db.query(`select public.founder_user_detail($1) as j`, [normalId])).rows[0].j
check('المؤسس يقرأ تفصيل الحساب', Boolean(detail) && typeof detail === 'object')
check('التفصيل يحمل لحظة قياس من الخادم', typeof detail.as_of === 'string' && detail.as_of.endsWith('Z'))
check('البريد مُقنَّع في SQL', String(detail.account.email_masked ?? '').includes('••••'))
check('لا بريد كامل في التفصيل', !JSON.stringify(detail).includes('normal@qimmah.test'))
check('حالة الاستحقاق مشتقّة لا مخزَّنة', detail.entitlement.state === 'premiumActive')
check('أثر الشراء مربوط بالبصمة', detail.commerce.purchases === 1 && detail.commerce.lastOrderId === 'ORDER-77')
check('التخصيص المجهول يبقى unknown لا incomplete', detail.onboarding === 'unknown')
// ⚠️ **ولا حقل صحّي واحد** — ولا حتى عدّاد أحداث القياس.
const SENSITIVE = ['weight', 'height', 'injur', 'medicat', 'allerg', 'bodyMetrics', 'measurement', 'food', 'workout']
const detailText = JSON.stringify(detail).toLowerCase()
check(`التفصيل بلا أي حقل صحّي (${SENSITIVE.length} كلمات)`, SENSITIVE.every((k) => !detailText.includes(k.toLowerCase())))
await mustFail('حساب غير موجود يُرفع استثناءً لا كائنًا فارغًا',
  () => db.query(`select public.founder_user_detail('00000000-0000-0000-0000-000000000000'::uuid)`), 'no such account')

// ٤-ب) الإصدار
const issued = (await db.query(`select public.founder_issue_access_code('حملة الإثبات','proof-label',30,5) as j`)).rows[0].j
check('الإصدار يعيد الكود الخام مرّة واحدة', typeof issued.code === 'string' && issued.code.length >= 10)
check('الكود من أبجدية العقد وحدها', /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(issued.code))
await asRole(db, null)
const stored = await db.query(`select code_hash, created_by, created_reason from public.access_codes where id = $1`, [issued.id])
check('الخام لا يُخزَّن — البصمة وحدها', stored.rows[0].code_hash !== issued.code && !stored.rows[0].code_hash.includes(issued.code))
check('أثر الفاعل جلسة مسمّاة لا سلسلة عامّة', String(stored.rows[0].created_by).startsWith(`founder:${founderId}`))
check('السبب مخزَّن كما كُتب', stored.rows[0].created_reason === 'حملة الإثبات')
await asRole(db, 'authenticated', founderId)
await mustFail('إصدار بلا سبب يُرفض', () => db.query(`select public.founder_issue_access_code('')`), 'reason required')
await mustFail('كود يدوي دون العقد يُرفض بنفس البوّابة',
  () => db.query(`select public.founder_issue_access_code('سبب',null,14,1,null,'SHORT1')`), 'invalid_access_code')

// ٤-ج) القائمة بحالاتها الأربع
const page = (await db.query(`select * from public.founder_code_page('',1,50)`)).rows
check('القائمة تعيد الكود الصادر', page.length === 1 && page[0].status === 'issued')
check('القائمة لا تحمل بصمة ولا كودًا خامًا', !Object.keys(page[0]).some((k) => /hash|code$/.test(k)) && !JSON.stringify(page).includes(issued.code))
// الاسترداد يقلب الحالة إلى «استُرد» حين تُستنفد الاستخدامات.
await asRole(db, 'authenticated', founderId)
const single = (await db.query(`select public.founder_issue_access_code('كود لمرّة','once',7,1) as j`)).rows[0].j
await asRole(db, 'authenticated', normalId)
// [20260824120004] الاسترداد من منظور العميل = `_v2` حصرًا؛ الاسم القديم نُزع
// من `authenticated` لأنه كان يلتفّ على حدّ المعدّل. **ولا يُبتلع الردّ:**
// كان هنا `.catch(() => null)` يخفي أي فشل، فتبقى الحالة `issued` ويُقرأ ذلك
// انحدارًا في صفحة الأكواد بدل أن يُقرأ عطلًا في الاسترداد. يُقاس الآن صراحةً.
const redeemOut = (await db.query(`select public.redeem_access_code_v2($1) as j`, [single.code])).rows[0].j
const redeemJson = typeof redeemOut === 'string' ? JSON.parse(redeemOut) : redeemOut
// ⚠️ والمتوقَّع **ليس** `specialAccessActive` بالضرورة: هذا المستخدم يحمل
// Premium من فقرة سابقة، و`redeem_core` تُبقي المنحة الأعلى وتعيدها
// (`premiumActive`) — **وتسجّل الاستهلاك على أي حال**، وهو ما يقلب الحالة
// أدناه. فالمقصود هنا: **لم يفشل**، لا اسمُ منحةٍ بعينها.
check('الاسترداد نفسه نجح — لا يُبتلع فشلٌ يُقرأ لاحقًا انحدارًا في الصفحة',
  redeemJson.outcome !== 'failed' && redeemJson.outcome !== 'rate_limited',
  JSON.stringify(redeemJson))
await asRole(db, 'authenticated', founderId)
const afterRedeem = (await db.query(`select * from public.founder_code_page('once',1,10)`)).rows[0]
check('كود استُنفد يصير «استُرد»', afterRedeem.status === 'redeemed', afterRedeem.status)
// التعطيل يقلب الحالة ولا يحذف الصفّ.
await db.query(`select public.founder_set_code_enabled($1, false, 'إيقاف الحملة')`, [issued.id])
const afterDisable = (await db.query(`select * from public.founder_code_page('proof-label',1,10)`)).rows[0]
check('التعطيل يقلب الحالة إلى «معطّل»', afterDisable.status === 'disabled')
await asRole(db, null)
const stillThere = await db.query(`select count(*)::int as n from public.access_codes where id = $1`, [issued.id])
check('التعطيل لا يحذف الصفّ — الأثر الإداري يبقى', stillThere.rows[0].n === 1)
await asRole(db, 'authenticated', founderId)
await mustFail('تعطيل بلا سبب يُرفض', () => db.query(`select public.founder_set_code_enabled($1, false, '')`, [issued.id]), 'reason required')
await mustFail('تعطيل كود غير موجود يُرفع باسمه',
  () => db.query(`select public.founder_set_code_enabled('00000000-0000-0000-0000-000000000000'::uuid, false, 'x')`), 'no such code')

// ٤-د) سحب الوصول — يسحب ولا يمنح
const revoked = (await db.query(`select public.founder_revoke_access($1,'إساءة استخدام') as r`, [normalId])).rows[0].r
check('سحب الوصول ينجح للمؤسس', revoked === 'revoked')
await asRole(db, null)
const ledger = (await db.query(`select revoked_by, revoked_reason, lifted_at from public.revocation_ledger`)).rows
check('الأثر الدائم يحمل الجلسة الفاعلة', ledger.length === 1 && ledger[0].revoked_by === `founder:${founderId}`)
check('الأثر يحمل السبب كما كُتب', ledger[0].revoked_reason === 'إساءة استخدام')
// ⚠️ **والرفع ليس بيد المتصفّح** — القدرة موجودة في القاعدة ومحجوبة عن العميل.
await asRole(db, 'authenticated', founderId)
await mustFail('رفع الحظر ممنوع على المؤسس من المتصفّح',
  () => db.query(`select public.admin_unrevoke($1,'محاولة')`, [normalId]), 'permission denied')
await mustFail('منح Premium الدائم ممنوع على المؤسس من المتصفّح',
  () => db.query(`select public.admin_grant_premium('x@y.z','manual','O-1',1999,'{}'::jsonb)`), 'permission denied')

// ٤-هـ) سحب الدور يُغلق كل شيء فورًا
await asRole(db, 'service_role')
await db.query(`select public.admin_clear_role('founder@qimmah.test','proof-rollback')`)
await asRole(db, 'authenticated', founderId)
for (const [label, fn] of CALLS) {
  await mustFail(`بعد سحب الدور: ${label} يُغلق فورًا`, () => fn(normalId), 'founder_role_required')
}

// ═══════════════ ٥) الإنتروبيا — الفجوة التي سجّلها G-8 ═══════════════
await asRole(db, null)
const DRAWS = 3000
const seen = new Set()
const symbolCounts = new Map()
for (let i = 0; i < DRAWS; i += 1) {
  const c = (await db.query(`select private.generate_access_code(12) as c`)).rows[0].c
  seen.add(c)
  for (const ch of c) symbolCounts.set(ch, (symbolCounts.get(ch) ?? 0) + 1)
}
check(`${DRAWS} سحبة بلا تكرار واحد`, seen.size === DRAWS, `${seen.size}`)
check('الطول ١٢ رمزًا في كل سحبة', [...seen].every((c) => c.length === 12))
check('أبجدية العقد وحدها', [...seen].every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(c)))
check('الأبجدية مستعمَلة كاملة (٣٢ رمزًا)', symbolCounts.size === 32, `${symbolCounts.size}`)
// توزيع منتظم: أي رمز يخرج ~١١٢٥ مرّة في ٣٦٠٠٠ موضع. حدّ فضفاض عمدًا (±٤٠٪):
// الغرض كشف **انحياز بنيوي** (بايت ثابت · modulo منحاز)، لا اختبار عشوائية.
const expected = (DRAWS * 12) / 32
const skewed = [...symbolCounts.entries()].filter(([, n]) => n < expected * 0.6 || n > expected * 1.4)
check('لا رمز منحاز بنيويًا', skewed.length === 0, skewed.map(([s, n]) => `${s}:${n}`).join(' '))
// حدّ العقد الأدنى مضمون حتى لو طُلب أقلّ.
const short = (await db.query(`select private.generate_access_code(2) as c`)).rows[0].c
check('طلب أقلّ من الحدّ يُرفع إلى ١٠ رموز', short.length === 10, short)
await db.close()

// ═══════════════ ٦) التأكيد المضادّ ① — بيئة بلا بوّابة ═══════════════
console.log('\nالتأكيد المضادّ ① — بيئة تُنزَع فيها البوّابة من الهجرتين الجديدتين')
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
// ⚠️ النزع يشمل **كل** هجرة تحمل البوّابة لا هجرتين مسمّاتين: حصرُه بملفّين
// يجعل التأكيد يشيخ في أوّل هجرة تالية تعيد تعريف دالة بالبوّابة — وقد حدث
// ذلك فعلًا في `test:admin-db` وسقط باسمه.
const GATE_RE = /\n\s*perform private\.require_(?:founder|admin)\(\);/g
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
  stripped === gatedFiles.length && stripped >= 2,
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
  ungatedRead = (await ungatedDb.query(`select public.founder_user_detail($1) as j`, [uNormal])).rows[0].j
} catch (e) {
  ungatedRead = { error: String(e.message || e) }
}
check(
  'بلا البوّابة: المستخدم العادي يقرأ التفصيل — فالمنع مصدره البوّابة لا الصدفة',
  Boolean(ungatedRead) && typeof ungatedRead.account?.user_id === 'string',
  ungatedRead?.error ? `منع لسبب آخر: ${String(ungatedRead.error).slice(0, 120)}` : '',
)
let ungatedWrite = null
try {
  ungatedWrite = (await ungatedDb.query(`select public.founder_issue_access_code('counter') as j`)).rows[0].j
} catch (e) {
  ungatedWrite = { error: String(e.message || e) }
}
check(
  'بلا البوّابة: المستخدم العادي يُصدر كودًا — فمنع الكتابة مصدره البوّابة',
  Boolean(ungatedWrite) && typeof ungatedWrite.code === 'string',
  ungatedWrite?.error ? `منع لسبب آخر: ${String(ungatedWrite.error).slice(0, 120)}` : '',
)
await ungatedDb.close()

// ═══════════════ ٧) التأكيد المضادّ ② — الغياب لا يصير صفرًا ═══════════════
console.log('\nالتأكيد المضادّ ② — حقن بديل صفري في طبقة العقد')
const CONTRACT = ['contract/liveSource.ts', 'contract/source.ts', 'contract/types.ts', 'contract/metrics.ts']
const UI = ['ui/AdminRoute.tsx', 'ui/AdminShell.tsx', 'ui/UserTable.tsx', 'ui/UserDetail.tsx', 'ui/CodesPanel.tsx', 'ui/MetricCard.tsx']
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ')
/** يفحص شجرةً بجذر مُعطى — فيصلح للشجرة الحقيقية وللمصابة معًا. */
function zeroFallbackOffenders(treeRoot) {
  const bad = []
  for (const rel of [...CONTRACT, ...UI]) {
    const p = join(treeRoot, 'src/admin', rel)
    if (!existsSync(p)) continue
    const code = stripComments(readFileSync(p, 'utf8'))
    if (/\?\?\s*0\b/.test(code) || /\|\|\s*0\b/.test(code)) bad.push(rel)
  }
  return bad
}
check(`لا بديل صفري في طبقة اللوحة (${CONTRACT.length + UI.length} ملفًا)`, zeroFallbackOffenders(root).length === 0, zeroFallbackOffenders(root).join(', '))

const work = mkdtempSync(join(tmpdir(), 'admin-codes-'))
try {
  const infectedDir = join(work, 'tree')
  const target = join(infectedDir, 'src/admin/contract/liveSource.ts')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(dirname(target), { recursive: true })
  const original = readFileSync(join(root, 'src/admin/contract/liveSource.ts'), 'utf8')
  const infected = original.replace(
    '  if (typeof raw === \'number\' && Number.isFinite(raw)) return ready(raw, asOf)\n  return fallback',
    '  if (typeof raw === \'number\' && Number.isFinite(raw)) return ready(raw, asOf)\n  return ready((raw as number) ?? 0, asOf)',
  )
  if (infected === original) throw new Error('FAIL: محاكاة البديل الصفري لم تغيّر الملف — نصّها البديل لم يعد يطابق liveSource.ts')
  writeFileSync(target, infected)
  const caught = zeroFallbackOffenders(infectedDir)
  check('حقن `?? 0` يُكشف بفحص مسمّى', caught.includes('contract/liveSource.ts'), caught.join(', '))
} finally {
  rmSync(work, { recursive: true, force: true })
}

// ═══════════════ ٨) التأكيد المضادّ ③ — المولّد لا يختفي بصمت ═══════════════
console.log('\nالتأكيد المضادّ ③ — غياب المولّد يُسقط الفحص باسمه')
const hasGenerator = /create or replace function private\.generate_access_code/.test(codesSql)
check('المولّد معرَّف في الهجرة', hasGenerator)
check('المولّد يتجاوز بايتَي النسخة والنوع', /continue when i = 6 or i = 8/.test(codesSql))
// النطاق **جسم الدالة وحده**: رأس الهجرة يشرح لماذا تُرك الامتداد، فمسحُ الملفّ
// كلّه كان سيسقط على شرحه — سقوطٌ باسم خاطئ، وهو أسوأ من لا فحص.
const genBody = codesSql.slice(
  codesSql.indexOf('create or replace function private.generate_access_code'),
  codesSql.indexOf('-- ── ٢) الإصدار'),
)
check('جسم المولّد استُخرج للفحص', genBody.length > 200, `${genBody.length}`)
// الاسم مُركَّب لا حرفيًّا: كتابته حرفيًّا هنا تجعل حارس G-8 يقرأ **الإثبات**
// مولّدًا ويسقط عليه. الفحص على المضمون لا على وجود السلسلة في هذا الملف.
const EXTENSION_RNG = ['gen', 'random', 'bytes'].join('_')
check('المولّد لا يعتمد على امتداد خارج النواة', !genBody.includes(EXTENSION_RNG))
check('المولّد يستعمل عشوائية النواة', genBody.includes('gen_random_uuid()'))
const generatorRemoved = codesSql.replace(/create or replace function private\.generate_access_code/, 'create or replace function private.__removed__')
check(
  'محاكاة: إزالة المولّد تُسقط هذا الفحص',
  !/create or replace function private\.generate_access_code/.test(generatorRemoved),
)

const failedCount = results.filter((r) => !r.ok).length
console.log(`\n${failedCount === 0 ? '✅' : '❌'} ${pass}/${results.length} فحصًا — إدارة الوصول\n`)
if (failedCount > 0) {
  for (const r of results.filter((x) => !x.ok)) console.error(`   ✗ ${r.name}`)
  console.error(`FAIL: ${failedCount} فحصًا سقط في إثبات إدارة الوصول`)
  process.exit(1)
}
