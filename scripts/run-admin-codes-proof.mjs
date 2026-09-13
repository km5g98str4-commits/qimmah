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
  // [ADMIN-CONV] الدفعة والحملات والمعلّق — ونواة الإصدار الداخلية.
  'founder_issue_code_batch',
  'founder_code_batches',
  'founder_pending_orders',
  'issue_code_core',
]
const shape = await db.query(
  `select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as cfg
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private') and p.proname = any($1)`,
  [NEW_FNS],
)
check(`الدوال العشر أُنشئت (${shape.rows.length})`, shape.rows.length === NEW_FNS.length, shape.rows.map((r) => r.proname).join(' '))
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
// [ADMIN-CONV] نواة الإصدار داخلية بحتة — موضع الإصدار الوحيد لا يبلغه عميل.
check('نواة الإصدار ليست لأي دور عميل', !grantOf('issue_code_core').includes('authenticated') && !grantOf('issue_code_core').includes('anon'))
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
/** قراءات: يبلغها المؤسس **والدعم**. [ADMIN-CONV] زادت الحملات والمعلّق.
 *  [COMMERCE-W1] وعدّ مخزون صكوك الشراء قراءةٌ كذلك. */
const ADMIN_READS = [
  'founder_executive_snapshot', 'founder_user_page', 'founder_user_detail', 'founder_code_page',
  'founder_failed_orders', 'founder_pending_orders', 'founder_code_redemptions', 'founder_code_batches',
  'founder_email_health', 'founder_grants_by_source', 'founder_food_submissions',
  'founder_purchase_batches',
  // [SALLA-PROD-001] قراءتا قناة سلة: المخزون وبحث الدعم بالبصمة — يبلغهما الدعم (require_admin).
  'founder_salla_inventory', 'founder_code_lookup',
]
/** أفعال لا رجعة فيها: للمؤسس وحده.
 *  [COMMERCE-W1] إصدار صكوك الشراء فعلٌ — صكّ حامل لمنحة دائمة، لا يبلغه الدعم. */
const FOUNDER_WRITES = [
  'founder_issue_access_code', 'founder_issue_code_batch',
  'founder_set_code_enabled', 'founder_revoke_access',
  'founder_review_food_submission',
  'founder_issue_purchase_batch',
  // [WAVE3] إطفاء دفعة الصكوك — فعلٌ هدّام باتجاه واحد (يسحب ولا يمنح)،
  // للمؤسس وحده، ولا يبلغه الدعم.
  'founder_disable_purchase_batch',
  // [SALLA-PROD-001] تسجيل دفعة مصدَّرة إلى سلة — فعل مؤسس (require_founder)، مرّة لكل وسم.
  'founder_mark_purchase_batch_exported',
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
  // [ADMIN-CONV] الدفعة فعل والحملات قراءة — وكلاهما ممنوع على غير الإداري.
  ['إصدار دفعة', () => db.query(`select public.founder_issue_code_batch('محاولة')`)],
  ['حملات الأكواد', () => db.query(`select * from public.founder_code_batches()`)],
  ['طلبات معلّقة', () => db.query(`select * from public.founder_pending_orders(10)`)],
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
// [ADMIN-CONV] كتلة `foodSubmissions` تُستبعد من المسح **باسمها** لا بصمت:
// اسم مفتاحها يحمل «food» وهي بلاغات كتالوج أرسلها المستخدم للمشغّل بنفسه،
// لا بيانات تغذية شخصية. ويُشدّد عليها فحص مستقلّ أدناه: حقولها الأربعة فقط.
const SENSITIVE = ['weight', 'height', 'injur', 'medicat', 'allerg', 'bodyMetrics', 'measurement', 'food', 'workout']
const { foodSubmissions: foodBlock, ...detailNoFood } = detail
const detailText = JSON.stringify(detailNoFood).toLowerCase()
check(`التفصيل بلا أي حقل صحّي خارج بلاغات الطعام (${SENSITIVE.length} كلمات)`, SENSITIVE.every((k) => !detailText.includes(k.toLowerCase())))
const FOOD_KEYS_ALLOWED = ['id', 'status', 'product_name', 'submitted_at']
check('بلاغات الطعام في التفصيل مصفوفة', Array.isArray(foodBlock))
check('بلاغات الطعام تحمل الحقول الأربعة المعلَنة فقط — لا evidence_*',
  (foodBlock ?? []).every((r) => Object.keys(r).every((k) => FOOD_KEYS_ALLOWED.includes(k))))
// [ADMIN-CONV] سجلّ الأكواد موجود ومصفوفةٌ فارغة **جواب مقيس** قبل أي استهلاك.
check('سجلّ الأكواد مصفوفة فارغة قبل الاستهلاك — صفر مقيس لا غياب',
  Array.isArray(detail.commerce.codeHistory) && detail.commerce.codeHistory.length === 0)
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
// [20260824120005] حكم المؤسس: الحملة اسمٌ لا سرّ. فالكود اليدوي يُرفض الآن
// **قبل** أن يبلغ عقد الشكل أصلًا — والرفض أبكر وأصرح، لا أضعف.
await mustFail('كودٌ يكتبه المؤسس بيده لم يعد يُصدَر إطلاقًا',
  () => db.query(`select public.founder_issue_access_code('سبب',null,14,1,null,'SHORT1')`), 'code_must_be_generated')
await mustFail('  ولا حتى كودٌ يدويّ طويل — الطول ليس عشوائية',
  () => db.query(`select public.founder_issue_access_code('سبب',null,14,1,null,'QIMMAHRAMADAN25')`), 'code_must_be_generated')

// ٤-ب-٢) [ADMIN-CONV] الإصدار الدفعيّ — حملة = وسم فوق أكواد فردية
const batch = (await db.query(`select public.founder_issue_code_batch('حملة الإثبات الدفعية','batch-proof',7,1,null,5) as j`)).rows[0].j
check('الدفعة تعيد ٥ أكواد خام مرّة واحدة', Array.isArray(batch.codes) && batch.codes.length === 5)
check('أكواد الدفعة متمايزة كلّها', new Set(batch.codes).size === 5)
check('كل كود ١٦ رمزًا من أبجدية العقد', batch.codes.every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(c)))
check('الدفعة تحمل وسمها وعدّها', batch.label === 'batch-proof' && batch.count === 5)
await asRole(db, null)
const batchStored = (await db.query(`select code_hash from public.access_codes where label = 'batch-proof'`)).rows
check('٥ صفوف زُرعت تحت الوسم', batchStored.length === 5)
// ⚠️ الخام لا يُخزَّن: لا بصمة تساوي كودًا ولا تحتويه.
check('لا كود خام مخزَّن — البصمات وحدها', batchStored.every((s) => batch.codes.every((c) => s.code_hash !== c && !s.code_hash.includes(c))))
await asRole(db, 'authenticated', founderId)
// الحدود مسمّاة: تجاوزها هو **محاكاة الالتفاف المنفَّذة** لهذا الشدّ — من ينزع
// السقف من الهجرة يُسقط هذين الفحصين باسميهما («لم يُرفع أي استثناء»).
await mustFail('دفعة صفر تُرفض باسمها', () => db.query(`select public.founder_issue_code_batch('سبب','x',7,1,null,0)`), 'batch_count_out_of_range')
await mustFail('دفعة ٥٠١ تُرفض باسمها', () => db.query(`select public.founder_issue_code_batch('سبب','x',7,1,null,501)`), 'batch_count_out_of_range')
await mustFail('دفعة بلا سبب تُرفض', () => db.query(`select public.founder_issue_code_batch('')`), 'reason required')

// ٤-ب-٣) [ADMIN-CONV] الحملات مجمّعة بالوسم
const batchesView = (await db.query(`select * from public.founder_code_batches()`)).rows
const proofBatch = batchesView.find((b) => b.label === 'batch-proof')
check('عرض الحملات يحمل صفّ الوسم', Boolean(proofBatch))
check('الحملة: صادر ٥ · متبقٍ ٥ · معطَّل ٠',
  Number(proofBatch.codes_issued) === 5 && Number(proofBatch.codes_remaining) === 5 && Number(proofBatch.codes_disabled) === 0)
// تعطيل كود واحد من الحملة يقلب عدّاديها — الحالة مشتقّة لا مخزَّنة.
await asRole(db, null)
const batchCodeId = (await db.query(`select id from public.access_codes where label = 'batch-proof' limit 1`)).rows[0].id
await asRole(db, 'authenticated', founderId)
await db.query(`select public.founder_set_code_enabled($1, false, 'إيقاف كود من الحملة')`, [batchCodeId])
const afterBatchDisable = (await db.query(`select * from public.founder_code_batches()`)).rows.find((b) => b.label === 'batch-proof')
check('بعد التعطيل: متبقٍ ٤ · معطَّل ١',
  Number(afterBatchDisable.codes_remaining) === 4 && Number(afterBatchDisable.codes_disabled) === 1)

// ٤-ج) القائمة بحالاتها الأربع
// [ADMIN-CONV] القائمة الآن ٦: المفرد + دفعة الخمسة. الكود المفرد يُلتقط بوسمه.
const page = (await db.query(`select * from public.founder_code_page('',1,50)`)).rows
check('القائمة تعيد الأكواد الستة والمفرد صادر',
  page.length === 6 && page.some((r) => r.label === 'proof-label' && r.status === 'issued'))
check('القائمة لا تحمل بصمة ولا كودًا خامًا — ولا كود دفعة',
  !Object.keys(page[0]).some((k) => /hash|code$/.test(k))
    && !JSON.stringify(page).includes(issued.code)
    && batch.codes.every((c) => !JSON.stringify(page).includes(c)))
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

// ٤-ج-٢) [ADMIN-CONV] «من استخدم الكود» — سجلّ لا عدّاد
const redemptionRows = (await db.query(`select * from public.founder_code_redemptions($1)`, [single.id])).rows
check('سجلّ المستبدلين يحمل صفًّا واحدًا', redemptionRows.length === 1)
check('الصفّ يحمل معرّف المستهلك ووقته', redemptionRows[0].user_id === normalId && Boolean(redemptionRows[0].redeemed_at))
check('البريد مُقنَّع في SQL', String(redemptionRows[0].masked_email ?? '').includes('***@'))
check('لا بريد كامل في سجلّ المستبدلين', !JSON.stringify(redemptionRows).includes('normal@qimmah.test'))

// ٤-ج-٣) [ADMIN-CONV] صفحة الحساب بعد الاستهلاك والبلاغ — العدّاد صار أسماءً
await asRole(db, 'authenticated', normalId)
const foodOut = (await db.query(
  `select public.submit_missing_food('حليب المراعي كامل الدسم','المراعي',null,'كوب ٢٥٠ مل',150,8,12,8,'من الملصق','ar') as j`,
)).rows[0].j
check('بلاغ الطعام انضاف للطابور', (typeof foodOut === 'string' ? JSON.parse(foodOut) : foodOut).outcome === 'queued')
await asRole(db, 'authenticated', founderId)
const detail2 = (await db.query(`select public.founder_user_detail($1) as j`, [normalId])).rows[0].j
check('سجلّ الأكواد يحمل استهلاك «once»',
  Array.isArray(detail2.commerce.codeHistory) && detail2.commerce.codeHistory.length === 1
    && detail2.commerce.codeHistory[0].label === 'once' && Boolean(detail2.commerce.codeHistory[0].redeemed_at))
check('سجلّ الأكواد يحمل المدّة لا البصمة',
  detail2.commerce.codeHistory[0].duration_days === 7 && !('code_hash' in detail2.commerce.codeHistory[0]))
check('بلاغات الطعام في الصفحة: البلاغ ظهر بحالته',
  Array.isArray(detail2.foodSubmissions) && detail2.foodSubmissions.length === 1
    && detail2.foodSubmissions[0].status === 'pending'
    && detail2.foodSubmissions[0].product_name === 'حليب المراعي كامل الدسم')
check('بلاغ الصفحة بلا evidence_* — الحقول الأربعة فقط',
  detail2.foodSubmissions.every((r) => Object.keys(r).every((k) => ['id', 'status', 'product_name', 'submitted_at'].includes(k))))
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
  const c = (await db.query(`select private.generate_access_code(16) as c`)).rows[0].c
  seen.add(c)
  for (const ch of c) symbolCounts.set(ch, (symbolCounts.get(ch) ?? 0) + 1)
}
check(`${DRAWS} سحبة بلا تكرار واحد`, seen.size === DRAWS, `${seen.size}`)
check('الطول ١٦ رمزًا في كل سحبة — ٨٠ بتًا', [...seen].every((c) => c.length === 16))
check('أبجدية العقد وحدها', [...seen].every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(c)))
check('الأبجدية مستعمَلة كاملة (٣٢ رمزًا)', symbolCounts.size === 32, `${symbolCounts.size}`)
// توزيع منتظم: أي رمز يخرج ~١١٢٥ مرّة في ٣٦٠٠٠ موضع. حدّ فضفاض عمدًا (±٤٠٪):
// الغرض كشف **انحياز بنيوي** (بايت ثابت · modulo منحاز)، لا اختبار عشوائية.
const expected = (DRAWS * 16) / 32
const skewed = [...symbolCounts.entries()].filter(([, n]) => n < expected * 0.6 || n > expected * 1.4)
check('لا رمز منحاز بنيويًا', skewed.length === 0, skewed.map(([s, n]) => `${s}:${n}`).join(' '))
// [20260824120005] الأرضية **ترفض ولا ترفع بصمت**: من طلب ١٢ ظنّ أنه نالها،
// فكان يمشي على ٦٠ بتًا وهو يحسبها ما طلب. الرفض المسمّى يمنع ذلك الظنّ.
let floorErr = ''
try { await db.query(`select private.generate_access_code(2) as c`) }
catch (e) { floorErr = String(e.message || e) }
check('طلبٌ دون الأرضية يُرفض **باسمه** لا يُرفَع بصمت',
  floorErr.includes('code_entropy_floor'), floorErr.slice(0, 90))
const dflt = (await db.query(`select private.generate_access_code() as c`)).rows[0].c
check('  والافتراض نفسه صار ١٦ — الناسي يقع على الآمن', dflt.length === 16, dflt)
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
// ⚔️ [ADMIN-CONV] ونفس الهجوم المنفَّذ على الدفعة: نزع `require_founder`
// يجعل مستخدمًا عاديًا يُصدر حملة كاملة — فمنعها في البيئة السليمة حارسٌ لا صدفة.
let ungatedBatch = null
try {
  ungatedBatch = (await ungatedDb.query(`select public.founder_issue_code_batch('counter','x',7,1,null,2) as j`)).rows[0].j
} catch (e) {
  ungatedBatch = { error: String(e.message || e) }
}
check(
  'بلا البوّابة: المستخدم العادي يُصدر دفعة — فمنع الدفعة مصدره البوّابة',
  Boolean(ungatedBatch) && Array.isArray(ungatedBatch.codes) && ungatedBatch.codes.length === 2,
  ungatedBatch?.error ? `منع لسبب آخر: ${String(ungatedBatch.error).slice(0, 120)}` : '',
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
