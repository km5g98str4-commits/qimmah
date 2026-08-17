// ============================================================================
// test:email-outbox-db — إثبات منفَّذ لصندوق البريد الصادر على Postgres حقيقي.
// ============================================================================
// PGlite بنفس تهيئة `scripts/db/lib/supabase-sandbox.mjs` — أي بنفس السخاء
// الافتراضي الذي يمنحه Supabase لأدوار العميل، فيكون كل فحص «ممنوع» مُختبَرًا
// لا ناجحًا مجّانًا (§4.2).
//
// التشغيل: npm run test:email-outbox-db
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { createSandbox, asRole, canTruncate, CLIENT_ROLES } from './db/lib/supabase-sandbox.mjs'
import { NON_QUEUEABLE_TOKENS } from '../supabase/functions/_shared/email/outbox.mjs'
import { TEMPLATE_IDS, LANGS } from '../supabase/functions/_shared/email/templates.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATION = join(ROOT, 'supabase/migrations/20260816120004_email_outbox.sql')

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
async function mustFail(name, fn, expect) {
  try { await fn(); return check(name, false, 'لم يُرفع أي استثناء') }
  catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.split('\n')[0].slice(0, 110))
  }
}

console.log('\n▶ صندوق البريد الصادر — على Postgres حقيقي\n')

const { db, applied, failed } = await createSandbox()
const q = (sql, params) => db.query(sql, params)
check('كل الهجرات تُطبَّق من قاعدة نظيفة', failed.length === 0,
  failed.length ? failed.map((f) => f.file).join(', ') : `${applied.length} هجرة`)
check('هجرة البريد ضمن المطبَّق', applied.includes('20260816120004_email_outbox.sql'))

// ── ١) الحزامان: RLS بصفر سياسات + REVOKE صريح ─────────────────────────────
console.log('\n— ١) العزل: لا عميل يرى هذا الجدول ولا يمسّه')
await asRole(db, null)
const tbl = (await q(`select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
                      where n.nspname='public' and c.relname='email_outbox'`)).rows[0]
check('RLS مفعّل على email_outbox', tbl.relrowsecurity === true)
const pols = (await q(`select count(*)::int n from pg_policies where schemaname='public' and tablename='email_outbox'`)).rows[0].n
check('بصفر سياسات — البريد شأن خادم بحت', pols === 0, `${pols}`)
const grants = (await q(`select grantee, string_agg(privilege_type,',' order by privilege_type) p
                         from information_schema.role_table_grants
                         where table_schema='public' and table_name='email_outbox'
                           and grantee = any($1) group by grantee`, [CLIENT_ROLES])).rows
check('anon و authenticated بلا أي صلاحية جدول', grants.length === 0,
  grants.map((g) => `${g.grantee}=${g.p}`).join(' '))
const trunc = []
for (const role of CLIENT_ROLES) if (await canTruncate(db, role, 'email_outbox')) trunc.push(role)
check('TRUNCATE مرفوض بالتنفيذ لكل دور عميل (RLS لا تحرس TRUNCATE)',
  trunc.length === 0, trunc.join(', ') || 'مقيس بالتنفيذ')

// دوال البريد لا يبلغها عميل.
const clientExec = (await q(`
  select p.proname, a.grantee::regrole::text as role
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname in ('public','private') and p.proname like 'email\\_%'
    and a.privilege_type='EXECUTE' and a.grantee::regrole::text = any($1)`, [CLIENT_ROLES])).rows
check('لا EXECUTE لأي دور عميل على أي دالة email_*', clientExec.length === 0,
  clientExec.map((r) => `${r.proname}/${r.role}`).join(' '))
const secdef = (await q(`
  select p.proname, coalesce(array_to_string(p.proconfig,','),'') cfg
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prosecdef and p.proname like 'email\\_%'`)).rows
check(`كل دوال البريد SECURITY DEFINER (${secdef.rows?.length ?? secdef.length}) بمسار مفرَّغ حرفيًا`,
  secdef.length >= 5 && secdef.every((r) => /(^|,)search_path=""(,|$)/.test(r.cfg)),
  secdef.filter((r) => !/search_path=""/.test(r.cfg)).map((r) => r.proname).join(' ') || `${secdef.length} دالة`)

// ── ٢) منع التكرار في القاعدة ──────────────────────────────────────────────
console.log('\n— ٢) منع التكرار — إعادة سلة الثلاثية صفٌّ واحد')
const enqueue = (key, tpl = 'premium_purchase', lang = 'ar', secret = false, email = 'b@example.com', payload = '{"orderRef":"ORD-1"}') =>
  q(`select public.email_outbox_enqueue($1,$2,$3,$4,$5,$6::jsonb) as s`, [key, tpl, lang, secret, email, payload])

check('أول إدراج queued', (await enqueue('ORD-1')).rows[0].s === 'queued')
check('الثاني duplicate', (await enqueue('ORD-1')).rows[0].s === 'duplicate')
check('الثالث duplicate', (await enqueue('ORD-1')).rows[0].s === 'duplicate')
check('وصفٌّ واحد في الجدول',
  (await q(`select count(*)::int n from public.email_outbox where idempotency_key='ORD-1'`)).rows[0].n === 1)

// ── ٣) القيود البنيوية — تُهاجَم من القاعدة مباشرةً لا من الدالة وحدها ──────
console.log('\n— ٣) القيود: تُهاجَم بالكتابة المباشرة، لا عبر الدالة فقط')
await mustFail('حامل لسرّ مع حمولة ⇒ رفض مسمّى من الدالة',
  () => q(`select public.email_outbox_enqueue('S-1','access_code','ar',true,'c@example.com','{"a":1}'::jsonb)`),
  'email_secret_template_not_queueable')
await mustFail('حمولة فيها مفتاح سرّي ⇒ رفض مسمّى من الدالة',
  () => q(`select public.email_outbox_enqueue('S-2','premium_purchase','ar',false,'c@example.com','{"activationUrl":"https://x"}'::jsonb)`),
  'email_secret_in_payload')
// الالتفاف على الدالة: كتابة مباشرة بدور المالك — يجب أن يوقفها **القيد**.
await mustFail('كتابة مباشرة بحمولة سرّية ⇒ ينتهك email_outbox_payload_clean',
  () => q(`insert into public.email_outbox (idempotency_key, template_id, lang, payload)
           values ('BYPASS-1','premium_purchase','ar','{"code":"ABC"}'::jsonb)`),
  'email_outbox_payload_clean')
await mustFail('كتابة مباشرة: حامل لسرّ ومعه مستلم ⇒ ينتهك email_outbox_secret_carries_nothing',
  () => q(`insert into public.email_outbox (idempotency_key, template_id, lang, carries_secret, recipient_email)
           values ('BYPASS-2','access_code','ar',true,'c@example.com')`),
  'email_outbox_secret_carries_nothing')
await mustFail('كتابة مباشرة: مُرسَل ومعه حمولة ⇒ ينتهك email_outbox_sent_is_redacted',
  () => q(`insert into public.email_outbox (idempotency_key, template_id, lang, state, payload)
           values ('BYPASS-3','premium_purchase','ar','sent','{"orderRef":"X"}'::jsonb)`),
  'email_outbox_sent_is_redacted')
await mustFail('قالب مجهول يُرفض بقيد القائمة المغلقة',
  () => q(`insert into public.email_outbox (idempotency_key, template_id, lang)
           values ('BAD-T','marketing_blast','ar')`), 'email_outbox_template_id_check')
await mustFail('لغة مجهولة تُرفض',
  () => q(`insert into public.email_outbox (idempotency_key, template_id, lang)
           values ('BAD-L','premium_purchase','fr')`), 'email_outbox_lang_check')
await mustFail('مفتاح منع تكرار فارغ يُرفض باسمه',
  () => q(`select public.email_outbox_enqueue('   ','premium_purchase','ar',false,'c@example.com',null)`),
  'email_idempotency_key_missing')

// كل اسم رمز سرّي يُرفض واحدًا واحدًا — لا عيّنة منها.
{
  const rejected = []
  for (const name of NON_QUEUEABLE_TOKENS) {
    try {
      await q(`insert into public.email_outbox (idempotency_key, template_id, lang, payload)
               values ($1,'premium_purchase','ar', jsonb_build_object($2::text,'v'))`, [`K-${name}`, name])
    } catch (e) { if (String(e.message).includes('email_outbox_payload_clean')) rejected.push(name) }
  }
  check(`كل الرموز السرّية الـ${NON_QUEUEABLE_TOKENS.length} يرفضها القيد واحدًا واحدًا`,
    rejected.length === NON_QUEUEABLE_TOKENS.length, `${rejected.length}/${NON_QUEUEABLE_TOKENS.length}`)
  // والمفتاح البريء يمرّ — وإلا كان القيد يرفض كل شيء ويبدو فعّالًا وهو أعمى.
  await q(`insert into public.email_outbox (idempotency_key, template_id, lang, payload)
           values ('INNOCENT','premium_purchase','ar','{"orderRef":"ORD-9"}'::jsonb)`)
  check('ومفتاح بريء (orderRef) يمرّ — القيد ليس رافضًا للكل',
    (await q(`select count(*)::int n from public.email_outbox where idempotency_key='INNOCENT'`)).rows[0].n === 1)
  // وحساسية الحالة: `ActivationUrl` تُرفض أيضًا.
  await mustFail('اسم سرّي بحالة أحرف مختلفة يُرفض كذلك',
    () => q(`insert into public.email_outbox (idempotency_key, template_id, lang, payload)
             values ('CASE-1','premium_purchase','ar','{"ActivationUrl":"https://x"}'::jsonb)`),
    'email_outbox_payload_clean')
}

// ── ٤) تطابق القائمتين — SQL و JS لا يتباعدان بصمت ─────────────────────────
console.log('\n— ٤) قائمة الأسماء السرّية: نسخة SQL تطابق نسخة JS')
{
  const sql = readFileSync(MIGRATION, 'utf8')
  const block = sql.match(/where lower\(k\) = any \(array\[([\s\S]*?)\]\)/)
  const sqlNames = block ? [...block[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort() : []
  const jsNames = NON_QUEUEABLE_TOKENS.map((n) => n.toLowerCase()).sort()
  check('نسخة SQL تطابق NON_QUEUEABLE_TOKENS حرفًا بحرف',
    sqlNames.join() === jsNames.join(), `SQL=${sqlNames.length} JS=${jsNames.length}`)
}
// وقائمة القوالب في القيد تطابق سجلّ القوالب.
{
  const sql = readFileSync(MIGRATION, 'utf8')
  const m = sql.match(/template_id\s+text not null check \(template_id in \(([\s\S]*?)\)\)/)
  const sqlIds = m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort() : []
  check('قائمة القوالب في القيد تطابق سجلّ القوالب',
    sqlIds.join() === [...TEMPLATE_IDS].sort().join(), sqlIds.join(','))
  check('واللغتان في القيد تطابقان LANGS', LANGS.join() === 'ar,en')
}

// ── ٥) دورة الحياة ─────────────────────────────────────────────────────────
console.log('\n— ٥) دورة الحياة: مستحقّ ← إعادة جدولة ← نجاح / موت')
await q(`delete from public.email_outbox`)
await enqueue('LIFE-1')
check('المُدرَج مستحقّ فورًا',
  (await q(`select count(*)::int n from public.email_outbox_due(50)`)).rows[0].n === 1)

await q(`select public.email_outbox_reschedule('LIFE-1',1,4000,'EMAIL_PROVIDER_SERVER_ERROR')`)
const resc = (await q(`select attempts, last_reason, next_attempt_at > now() as future from public.email_outbox where idempotency_key='LIFE-1'`)).rows[0]
check('الإعادة ترفع العدّاد وتؤجّل للمستقبل وتسجّل السبب',
  resc.attempts === 1 && resc.future === true && resc.last_reason === 'EMAIL_PROVIDER_SERVER_ERROR')
check('والمؤجَّل لا يظهر مستحقًّا',
  (await q(`select count(*)::int n from public.email_outbox_due(50)`)).rows[0].n === 0)

await q(`select public.email_outbox_mark_sent('LIFE-1',2)`)
const sent = (await q(`select state, payload, recipient_email, sent_at is not null as stamped from public.email_outbox where idempotency_key='LIFE-1'`)).rows[0]
check('النجاح يُفرِّغ الحمولة والمستلم ويختم الوقت',
  sent.state === 'sent' && sent.payload === null && sent.recipient_email === null && sent.stamped === true)

await enqueue('LIFE-2')
await q(`select public.email_outbox_mark_dead('LIFE-2',5,'EMAIL_PROVIDER_EXTERNAL')`)
const dead = (await q(`select state, payload, recipient_email, last_reason from public.email_outbox where idempotency_key='LIFE-2'`)).rows[0]
check('الموت **يحتفظ** بالحمولة والمستلم — الصندوق الميت يُعاد تشغيله',
  dead.state === 'dead' && dead.payload !== null && dead.recipient_email !== null
  && dead.last_reason === 'EMAIL_PROVIDER_EXTERNAL')

await mustFail('تحديث مفتاح غير موجود يفشل باسمه',
  () => q(`select public.email_outbox_mark_sent('NO-SUCH-KEY',1)`), 'email_job_not_found')

// الحامل للسرّ: أثرٌ بلا حمولة، وحالته sending لا queued (لا يُصرَّف أبدًا).
await q(`select public.email_outbox_enqueue('SECRET-1','access_code','ar',true,null,null)`)
const sec = (await q(`select state, payload, recipient_email, next_attempt_at from public.email_outbox where idempotency_key='SECRET-1'`)).rows[0]
check('الحامل للسرّ: أثرٌ بلا حمولة ولا مستلم، وحالته sending',
  sec.state === 'sending' && sec.payload === null && sec.recipient_email === null && sec.next_attempt_at === null)
check('ولا يظهر أبدًا في قائمة المستحقّ (فلا يُطابَر ولا يُعاد)',
  (await q(`select count(*)::int n from public.email_outbox_due(50) where idempotency_key='SECRET-1'`)).rows[0].n === 0)

// ── ٦) الاحتفاظ وسمٌ لا حذف ────────────────────────────────────────────────
console.log('\n— ٦) الاحتفاظ: وسم وصفي بلا أتمتة حذف')
const ret = (await q(`select retention_policy, retain_until > now() as future from public.email_outbox limit 1`)).rows[0]
check('سياسة احتفاظ موسومة ١٢ شهرًا', ret.retention_policy === 'mail_audit_12m' && ret.future === true)
{
  const sql = readFileSync(MIGRATION, 'utf8')
  check('ولا حذف آلي في الهجرة (لا cron ولا trigger حذف ولا delete from)',
    !/\bcron\b/i.test(sql) && !/delete\s+from/i.test(sql))
}

await db.close()

// ════════════════════════════════════════════════════════════════════════════
const failedChecks = results.filter((r) => !r.pass)
console.log(`\n${'─'.repeat(70)}`)
console.log(`  ${results.length - failedChecks.length}/${results.length} فحصًا ناجحًا`)
if (failedChecks.length) {
  console.log(`\n✗ ${failedChecks.length} فحصًا ساقطًا:`)
  for (const f of failedChecks) console.log(`   - ${f.name}`)
  process.exit(1)
}
console.log('✓ test:email-outbox-db — كل الفحوص ناجحة\n')
