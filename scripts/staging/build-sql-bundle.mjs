#!/usr/bin/env node
// ============================================================================
// مولّد حِزَم SQL للصقها في محرّر Supabase — [STAGING-COMMISSIONING]
// ============================================================================
// ═══ لماذا وُجد ═══
// تطبيق الهجرات يحتاج إمّا `psql` (وكلمة مرور القاعدة) أو أداةً تنادي واجهة
// الإدارة ثلاثًا وثلاثين مرّة. وكلاهما تعثّر عمليًّا. والمسار الثالث — **محرّر
// SQL في لوحة Supabase** — لا يحتاج كلمة مرور ولا أداة ولا صلاحية خاصّة:
// يفتحه المؤسس بمتصفّحه ويلصق.
//
// لكن الهجرات ٣٤٠ كيلوبايت، ولصقةٌ بهذا الحجم تُثقل المحرّر. فتُقسَّم إلى حِزَم،
// **ولا تُقسَّم هجرةٌ أبدًا عبر حزمتين** — نصفُ هجرة ليس SQL صالحًا.
//
// ═══ وما تحمله كل حزمة زيادةً على الهجرات ═══
// ① **سجلّ الهجرات** (`supabase_migrations.schema_migrations`) — نفس الجدول
//    الذي يستعمله Supabase CLI. فمن يشغّل `supabase db push` لاحقًا لا يعيد
//    تطبيق ما طُبِّق هنا.
// ② **معاملة لكل هجرة** مع سطر سجلّها: تنجحان معًا أو لا يحدث شيء — فلا وجود
//    لهجرة «طُبِّقت ولم تُسجَّل».
// ③ **تخطٍّ آمن**: هجرةٌ مسجَّلة سلفًا تُقفز. فإعادة لصق حزمة لا تكسر شيئًا،
//    وهو بالضبط ما يفعله إنسانٌ ارتبك في المنتصف.
//
// ⚠️ **ولا تحمل الشيم إطلاقًا** (`supabase-shim.sql`) — ذاك يجعل Postgres
// عاديًّا يشبه Supabase، وتشغيله على Supabase أسقط أوّل محاولة حقيقية.
// ============================================================================
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')
const OUT = join(ROOT, 'docs/execution/qimmah-sovereign-closure/staging-sql')
const TARGET_BYTES = 70_000

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
const versionOf = (f) => (f.match(/^(\d+)/) || [])[1] || f

// ── تقسيمٌ على حدود الهجرات ───────────────────────────────────────────────
const chunks = []
let cur = []
let curBytes = 0
for (const f of files) {
  const size = readFileSync(join(MIGRATIONS, f)).length
  // هجرةٌ أكبر من الهدف وحدها تأخذ حزمتها — ولا تُقسَّم.
  if (cur.length > 0 && curBytes + size > TARGET_BYTES) { chunks.push(cur); cur = []; curBytes = 0 }
  cur.push(f)
  curBytes += size
}
if (cur.length > 0) chunks.push(cur)

const HEADER = (i, n, list) => `-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging ${i}/${n}
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق \`scripts/db/lib/supabase-shim.sql\`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ\`permission denied to alter role\`.
--
-- تحتوي (${list.length}):
${list.map((f) => `--   · ${f}`).join('\n')}
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());
`

/**
 * ═══ التخطّي الحقيقي — لا إشعارٌ يدّعيه ═══
 *
 * أوّل صيغة هنا طبعت «تخطٍّ» ثم **طبّقت الهجرة على أي حال**. وسقطت إعادة اللصق
 * بـ`cannot change return type of existing function` — أي أن الادّعاء «إعادة
 * اللصق آمنة» كان كذبًا مريحًا. والمكتوب في ترويسة الحزمة يُقرأ ويُعتمد عليه،
 * فإمّا أن يصحّ أو يُحذف.
 *
 * والتخطّي يصحّ بلفّ جسم الهجرة في `execute` داخل شرط: فلا يُنفَّذ الجسم أصلًا
 * إن كان مسجَّلًا. و`execute` في PL/pgSQL تقبل عبارات متعدّدة وتحتمل
 * `$$` المتداخلة — مقيسٌ لا مفترَض.
 *
 * ⚠️ والوسم الخارجي مشتقٌّ من رقم الهجرة، ويُتحقَّق أنه **لا يرد في جسمها**
 * قبل الاستعمال. وسمٌ يتصادم مع محتوى الجسم يقطع الاقتباس في منتصفه.
 */
function chunkBody(list) {
  return list.map((f) => {
    const v = versionOf(f)
    const body = readFileSync(join(MIGRATIONS, f), 'utf8')
    const tag = `qimmah_mig_${v}`
    if (body.includes(`$${tag}$`)) {
      throw new Error(`وسم الاقتباس ${tag} يرد داخل ${f} — يلزم وسمٌ آخر.`)
    }
    return `
-- ───────────────────────────────────────────────────────────────────────────
-- ${f}
-- ───────────────────────────────────────────────────────────────────────────
do $${tag}_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '${v}') then
    raise notice 'تخطٍّ: ${f} مسجَّلة سلفًا';
    return;
  end if;

  execute $${tag}$
${body}
  $${tag}$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('${v}', '${f.replace(/'/g, "''")}');
end
$${tag}_wrap$;
`
  }).join('\n')
}

const VERIFY = `
-- ═══════════════════════════════════════════════════════════════════════════
-- الحزمة الأخيرة — بذرة الملح ثم التحقّق
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ **بذرة الملح خطوة لا تنشئها أي هجرة — لأنها سرّ.** وبدونها ترفع كل
--    دالّة كتابة \`identity_pepper: no active version\` عند أول مستخدم حقيقي.
--    ولا تُعاد إن كانت مبذورة: استبدال ملح قائم يُبطل **كل** بصمة مسجَّلة
--    (التجارب والأكواد والمشتريات). و\`on conflict do nothing\` يضمن ذلك.
insert into private.identity_pepper (version, pepper)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (version) do nothing;

-- ── التحقّق: من الكتالوج الحيّ لا من عدّ الملفات ──────────────────────────
-- عدُّ الملفات يقول «طُبِّق». الكتالوج يقول «يعمل».
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r')                            as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)       as with_rls,
  (select count(*) from pg_policies where schemaname = 'public')               as policies,
  (select count(*) from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and privilege_type in ('INSERT','UPDATE','DELETE'))                      as anon_writes,
  (select count(*) from private.identity_pepper)                               as pepper,
  (select count(*) from information_schema.role_routine_grants
    where grantee = 'authenticated' and routine_schema = 'public'
      and routine_name in ('my_entitlement','start_trial','redeem_access_code_v2',
                           'claim_pending_grants','submit_missing_food','delete_own_account'))
                                                                               as client_rpcs,
  (select count(*) from information_schema.role_routine_grants
    where grantee in ('anon','authenticated') and routine_schema = 'public'
      and routine_name = 'redeem_access_code')                                 as legacy_open,
  (select count(*) from supabase_migrations.schema_migrations)                 as migrations;

-- المتوقَّع: tables = with_rls · policies > 0 · anon_writes = 0 · pepper = 1
--            client_rpcs = 6 · legacy_open = 0 · migrations = ${files.length}
`

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
let total = 0
chunks.forEach((list, i) => {
  const n = String(i + 1).padStart(2, '0')
  const body = HEADER(i + 1, chunks.length, list) + chunkBody(list)
    + (i === chunks.length - 1 ? VERIFY : '')
  const path = join(OUT, `${n}-qimmah-staging.sql`)
  writeFileSync(path, body)
  total += body.length
  console.log(`  ${n}  ${String(list.length).padStart(2)} هجرة · ${(body.length / 1024).toFixed(0)} ك.ب`)
})
console.log(`\n✅ ${chunks.length} حزمة · ${files.length} هجرة · ${(total / 1024).toFixed(0)} ك.ب`)
console.log(`   ${OUT.replace(ROOT + '/', '')}`)
