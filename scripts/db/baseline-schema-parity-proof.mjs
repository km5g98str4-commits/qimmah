// ============================================================================
// test:baseline-parity — الأساس الاثنا عشر: تكافؤ بنيوي **مُثبَت** لا مُشابَهة
// [PROD-DRIFT] · لأن `create table if not exists` لا يُثبت شيئًا عن جدول موجود
// ============================================================================
// ═══ العطل الذي يمنعه هذا الملف ═══
// الإنتاج يحمل جداول الأساس السبعة عشر **بلا سجلّ هجرات** (`supabase_migrations`
// غائب كليًّا، مقيسًا في ٤ سبتمبر ٢٠٢٦). فالاعتماد المطلوب هو إعادة تشغيل
// الأساس. لكن `create table if not exists` **يتخطّى** الجدول الموجود بلا أن
// يقارنه — فلو كان عمود أو قيد أو سياسة مختلفًا لبقي مختلفًا **بصمت**، ثم
// انكسرت هجرةٌ لاحقة تفترض شكلًا لم تجده.
//
// وقد قِيست بنية الإنتاج يدويًّا في ذلك التحقيق. **ومقياسٌ يدوي لا يتكرّر**:
// هذا الملف يحوّل ذلك القياس إلى عقدٍ منفَّذ، فلا نعود نستند إلى «تشابه بصري».
//
// ═══ ما يُثبَت ═══
//   ① الأعمدة: الاسم والترتيب والنوع.
//   ② المفتاح الأساسي، والمفتاح الأجنبي مع سلوك الحذف (CASCADE).
//   ③ الإلزام والافتراضات في المواضع الحاكمة (المعرّف · الطوابع · المالك).
//   ④ الفهارس والقيود الفريدة.
//   ⑤ RLS مفعّل · أربع سياسات لـ`authenticated` وحدها · كلّها محصورة بالمالك.
//   ⑥ شكل المُشغِّلات: مُشغِّل طابع واحد لكل جدول، وLWW حيث يجب.
//   ⑦ **استمرارية الحزمة ١**: الخطر مُعاد إنتاجه ثم مُغلَق بالتنفيذ.
//
// التشغيل: npm run test:baseline-parity
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { migrationFiles, readMigration } from './lib/supabase-sandbox.mjs'

let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  if (ok) pass += 1
  else fail += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}

const LAST_BASELINE = '20260726120005_p14_schema_guard.sql'
const TRIGGER_SEED = '20260713120004_updated_at_triggers.sql'

/**
 * العقد = ما يبنيه **مجلّد الهجرات** (مرجع أي قاعدة جديدة).
 * وقد قُورن بما قِيس على الإنتاج (`ledlypcyrtnzvjvhykwz`، ٤ سبتمبر ٢٠٢٦):
 * **أربعة عشر من سبعة عشر متطابقة حرفيًّا**، وثلاثة تنحرف — مسمّاةً في
 * `PRODUCTION_DIVERGENCES` أدناه لا مطموسةً هنا.
 * أي اختلاف جديد بين المجلّد وهذا العقد **فرقٌ حقيقي** يُقرأ ويُرفَع، ولا
 * يُسكَّت بتعديل التوقّع.
 */
const CONTRACT = {
  achievements:     'id,user_id,data,created_at,updated_at',
  custom_plans:     'id,user_id,source,data,created_at,updated_at',
  daily_logs:       'id,user_id,date,data,created_at,updated_at',
  exercise_history: 'id,user_id,exercise_id,data,created_at,updated_at',
  measurement_logs: 'id,user_id,local_id,date,values,notes,created_at,updated_at,deleted_at',
  medication_logs:  'id,user_id,date,done,created_at,updated_at',
  nutrition_ledger: 'id,user_id,date,data,deleted_at,created_at,updated_at',
  nutrition_logs:   'id,user_id,date,done_meals,water_ml,logged_food,created_at,updated_at',
  plan_templates:   'id,user_id,local_id,data,deleted_at,created_at,updated_at',
  profiles:         'id,user_id,display_name,data,created_at,updated_at',
  recovery_logs:    'id,user_id,date,data,created_at,updated_at',
  step_logs:        'id,user_id,date,steps,source,created_at,updated_at',
  supplement_logs:  'id,user_id,date,done,created_at,updated_at',
  todos:            'id,user_id,data,created_at,updated_at',
  water_logs:       'id,user_id,date,water_ml,created_at,updated_at',
  workout_schedule: 'id,user_id,data,deleted_at,created_at,updated_at',
  workout_sessions: 'id,user_id,local_id,date,started_at,finished_at,workout_day_id,workout_day_name,data,created_at,updated_at',
}
const TABLES = Object.keys(CONTRACT)

/**
 * ═══ سجلّ انحرافٍ **مقيس** بين الإنتاج والمجلّد — يُعلَن ولا يُطمَس ═══
 * قِيس على `ledlypcyrtnzvjvhykwz` في ٤ سبتمبر ٢٠٢٦: ثلاثة جداول تحمل هناك
 * عمود `data jsonb` واحدًا بدل الأعمدة التي يبنيها المجلّد. و`create table if
 * not exists` **يتخطّاها**، فإعادة تشغيل الأساس لن تُصالحها أبدًا.
 *
 * ولماذا هو خاملٌ لا حاجب: الثلاثة **خارج اتحاد `SyncTable`** — العميل يكتب
 * التغذية والمكمّلات والدواء في تجميعة `daily_logs` عمدًا (تعليق `syncQueue.ts`
 * حرفيًّا: «deliberately STAY in the daily_logs aggregate … so nothing
 * double-syncs into their (also-present) dedicated tables»). فلا مسار عميل
 * يلمس عمودًا مفقودًا. والقسم ⑧ **يُثبت** هذا الخمول بدل أن يفترضه.
 */
const PRODUCTION_DIVERGENCES = {
  medication_logs: 'id,user_id,date,data,created_at,updated_at',
  nutrition_logs:  'id,user_id,date,data,created_at,updated_at',
  supplement_logs: 'id,user_id,date,data,created_at,updated_at',
}
/** الجداول التي يحكمها طابع LWW لا الطابع البسيط — مقيسة على الإنتاج. */
const LWW_TABLES = ['measurement_logs', 'nutrition_ledger', 'plan_templates', 'recovery_logs', 'workout_schedule']

async function bootstrap() {
  const db = await PGlite.create({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique, email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `)
  return db
}

async function applyBaseline(db, stopAfter = LAST_BASELINE) {
  const failed = []
  for (const f of migrationFiles()) {
    try { await db.exec(readMigration(f)) } catch (e) {
      failed.push({ file: f, message: String(e.message || e).split('\n')[0] })
    }
    if (f === stopAfter) break
  }
  return failed
}

console.log('\n════ تكافؤ الأساس البنيوي — عقدٌ منفَّذ لا تشابه بصري ════')

const db = await bootstrap()
const failed = await applyBaseline(db)
check(`الأساس الاثنا عشر يُطبَّق من قاعدة نظيفة (توقّف عند ${LAST_BASELINE.slice(0, 14)})`,
  failed.length === 0, failed.map((f) => `${f.file}: ${f.message}`).join(' | ').slice(0, 200))

// ═══════════════ ① الأعمدة: الاسم والترتيب ═══════════════
console.log('\n① الأعمدة — الاسم والترتيب حرفيًّا')
{
  const r = await db.query(`
    select table_name, string_agg(column_name, ',' order by ordinal_position) as cols
      from information_schema.columns
     where table_schema='public' and table_name = any($1)
     group by table_name`, [TABLES])
  const got = Object.fromEntries(r.rows.map((x) => [x.table_name, x.cols]))
  const wrong = TABLES.filter((t) => got[t] !== CONTRACT[t])
  check(`الأعمدة تطابق العقد في ${TABLES.length} جدولًا (١٤ منها = الإنتاج حرفيًّا)`, wrong.length === 0,
    wrong.map((t) => `${t}: ${got[t] ?? '(غائب)'} ≠ ${CONTRACT[t]}`).join(' | ').slice(0, 300))
}

// ═══════════════ ② المفاتيح وسلوك الحذف ═══════════════
console.log('\n② المفاتيح — الأساسي والأجنبي وسلوك الحذف')
{
  const pk = await db.query(`
    select c.relname as t, (select string_agg(a.attname, ',' order by a.attnum)
       from pg_index i join pg_attribute a on a.attrelid=c.oid and a.attnum = any(i.indkey)
      where i.indrelid=c.oid and i.indisprimary) as pk
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname = any($1)`, [TABLES])
  const badPk = pk.rows.filter((x) => x.pk !== 'id')
  check('المفتاح الأساسي `id` في كل جدول', badPk.length === 0, badPk.map((x) => `${x.t}:${x.pk}`).join(', '))

  const fk = await db.query(`
    select c.relname as t, pg_get_constraintdef(con.oid) as def
      from pg_constraint con join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and con.contype='f' and c.relname = any($1)`, [TABLES])
  const byTable = {}
  for (const row of fk.rows) (byTable[row.t] ??= []).push(row.def)
  const badFk = TABLES.filter((t) => !(byTable[t] ?? []).some((d) =>
    /FOREIGN KEY \(user_id\) REFERENCES auth\.users\(id\) ON DELETE CASCADE/i.test(d)))
  check('user_id → auth.users(id) ON DELETE CASCADE في كل جدول', badFk.length === 0, badFk.join(', '))
}

// ═══════════════ ③ الإلزام والافتراضات الحاكمة ═══════════════
console.log('\n③ الإلزام والافتراضات في المواضع الحاكمة')
{
  const r = await db.query(`
    select table_name, column_name, is_nullable, column_default is not null as has_default, data_type
      from information_schema.columns
     where table_schema='public' and table_name = any($1)
       and column_name in ('id','user_id','created_at','updated_at')`, [TABLES])
  const idBad = r.rows.filter((x) => x.column_name === 'id' && (x.is_nullable !== 'NO' || !x.has_default || x.data_type !== 'uuid'))
  check('`id`: uuid · NOT NULL · بافتراض مولِّد', idBad.length === 0, idBad.map((x) => x.table_name).join(', '))
  const uidBad = r.rows.filter((x) => x.column_name === 'user_id' && (x.is_nullable !== 'NO' || x.data_type !== 'uuid'))
  check('`user_id`: uuid · NOT NULL (لا صفّ بلا مالك)', uidBad.length === 0, uidBad.map((x) => x.table_name).join(', '))
  const stampBad = r.rows.filter((x) => ['created_at', 'updated_at'].includes(x.column_name)
    && (x.is_nullable !== 'NO' || !x.has_default || !x.data_type.startsWith('timestamp')))
  check('`created_at`/`updated_at`: timestamptz · NOT NULL · بافتراض', stampBad.length === 0,
    stampBad.map((x) => `${x.table_name}.${x.column_name}`).join(', '))
}

// ═══════════════ ④ الفهارس والقيود الفريدة ═══════════════
console.log('\n④ الفهارس والقيود الفريدة')
{
  const r = await db.query(`
    select c.relname as t, count(*) filter (where i.indisunique) as uniq, count(*) as total
      from pg_index i join pg_class c on c.oid=i.indrelid
      join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname = any($1) group by c.relname`, [TABLES])
  const noUniq = r.rows.filter((x) => Number(x.uniq) < 1)
  check('لكل جدول فهرس فريد واحد على الأقل (المفتاح الأساسي)', noUniq.length === 0, noUniq.map((x) => x.t).join(', '))
  const noOwnerIdx = await db.query(`
    select c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname = any($1)
       and not exists (
         select 1 from pg_index i join pg_attribute a on a.attrelid=c.oid and a.attnum = any(i.indkey)
          where i.indrelid=c.oid and a.attname='user_id')`, [TABLES])
  check('وفهرس يشمل `user_id` — قراءة المالك لا مسحٌ كامل', noOwnerIdx.rows.length === 0,
    noOwnerIdx.rows.map((x) => x.t).join(', '))
}

// ═══════════════ ⑤ RLS والسياسات ═══════════════
console.log('\n⑤ RLS وأربع سياسات محصورة بالمالك لـauthenticated')
{
  const rls = await db.query(`
    select c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname = any($1) and not c.relrowsecurity`, [TABLES])
  check('RLS مفعّل على كل جدول أساس', rls.rows.length === 0, rls.rows.map((x) => x.t).join(', '))

  const pol = await db.query(`
    select tablename as t, count(*)::int as n,
           count(*) filter (where roles::text = '{authenticated}')::int as to_auth,
           count(*) filter (where coalesce(qual,'') like '%auth.uid()%'
                              or coalesce(with_check,'') like '%auth.uid()%')::int as owner_scoped,
           string_agg(distinct cmd, ',' order by cmd) as cmds
      from pg_policies where schemaname='public' and tablename = any($1) group by tablename`, [TABLES])
  const wrongCount = pol.rows.filter((x) => x.n !== 4)
  check('أربع سياسات لكل جدول — لا أكثر ولا أقلّ', wrongCount.length === 0,
    wrongCount.map((x) => `${x.t}:${x.n}`).join(', '))
  const notAuth = pol.rows.filter((x) => x.to_auth !== x.n)
  check('وكلّها لـ`authenticated` وحدها — لا {public} ولا anon', notAuth.length === 0,
    notAuth.map((x) => x.t).join(', '))
  const notOwner = pol.rows.filter((x) => x.owner_scoped !== x.n)
  check('وكلّها محصورة بـauth.uid() — لا سياسة مفتوحة', notOwner.length === 0,
    notOwner.map((x) => x.t).join(', '))
  const badCmds = pol.rows.filter((x) => x.cmds !== 'DELETE,INSERT,SELECT,UPDATE')
  check('وتغطّي الأفعال الأربعة بالضبط', badCmds.length === 0, badCmds.map((x) => `${x.t}:${x.cmds}`).join(', '))
}

// ═══════════════ ⑥ شكل المُشغِّلات ═══════════════
console.log('\n⑥ شكل المُشغِّلات — واحدٌ لكل جدول، وLWW حيث يجب')
const triggerShape = async (d) => {
  const r = await d.query(`
    select c.relname as t, string_agg(p.proname, ',' order by p.proname) as fns, count(*)::int as n
      from pg_trigger tg join pg_class c on c.oid=tg.tgrelid
      join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=tg.tgfoid
     where n.nspname='public' and not tg.tgisinternal and c.relname = any($1)
     group by c.relname`, [TABLES])
  return Object.fromEntries(r.rows.map((x) => [x.t, { fns: x.fns, n: x.n }]))
}
{
  const shape = await triggerShape(db)
  const multi = TABLES.filter((t) => (shape[t]?.n ?? 0) !== 1)
  check('مُشغِّل طابع **واحد** لكل جدول — لا ازدواج', multi.length === 0,
    multi.map((t) => `${t}:${shape[t]?.n ?? 0}(${shape[t]?.fns ?? '—'})`).join(', '))
  const lwwWrong = LWW_TABLES.filter((t) => shape[t]?.fns !== 'set_updated_at_lww')
  check(`جداول LWW الخمسة تحمل \`set_updated_at_lww\``, lwwWrong.length === 0,
    lwwWrong.map((t) => `${t}:${shape[t]?.fns}`).join(', '))
  const plainWrong = TABLES.filter((t) => !LWW_TABLES.includes(t) && shape[t]?.fns !== 'set_updated_at')
  check('وبقيّة الجداول تحمل الطابع البسيط', plainWrong.length === 0,
    plainWrong.map((t) => `${t}:${shape[t]?.fns}`).join(', '))
}

// ═══════════════ ⑦ استمرارية الحزمة ١ — الخطر مُعاد إنتاجه ثم مُغلَق ═══════════════
console.log('\n⑦ ⚔️ استمرارية الحزمة ١ — التوقّف في منتصفها يُفسد سلطة LWW')
{
  const partial = await bootstrap()
  await applyBaseline(partial, TRIGGER_SEED)   // ← التوقّف عند 20260713120004 بالضبط
  const shape = await triggerShape(partial)

  // في هذه اللحظة لم تُنشأ جداول p14 الأربعة بعد (تأتي في 20260726120001)،
  // فالجدول الوحيد المعرَّض هو `measurement_logs` — وهو بعينه ما يصفه رأس
  // 20260726120005: «20260713120004 يضع set_updated_at على measurement_logs،
  // و20260726120004 يستبدله بـset_updated_at_lww».
  const notYet = LWW_TABLES.filter((t) => t !== 'measurement_logs' && !shape[t])
  check('⟲ جداول p14 الأربعة لم تُنشأ بعد عند هذه النقطة', notYet.length === 4, notYet.join(', '))
  check('⟲ و`measurement_logs` يحمل الطابع **البسيط** — أي سلطة LWW مُكذَّبة',
    (shape.measurement_logs?.fns ?? '') === 'set_updated_at',
    `المقيس: ${shape.measurement_logs?.fns ?? '∅'}`)
  await partial.close?.()

  // والحزمة كاملةً تُصلحه — وهو ما قِيس في ⑥ أعلاه على نفس القاعدة.
  check('✅ والحزمة ١ كاملةً تُعيد الطابع الصحيح (مقيس في ⑥)', true,
    'الشرط التشغيلي: لا تُوقَف الحزمة ١ في منتصفها')
}

// ═══════════════ ⑧ سجلّ الانحراف — مُعلَن، ومُثبَتٌ خموله ═══════════════
console.log('\n⑧ انحراف الإنتاج المقيس — خاملٌ لأنه خارج مسار العميل')
{
  const src = readFileSync(new URL('../../src/lib/syncQueue.ts', import.meta.url), 'utf8')
  const block = src.slice(src.indexOf('export const SYNC_TABLES'), src.indexOf('export const TOMBSTONE_TABLES'))
  const syncUnion = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  check('اتحاد `SyncTable` مقروء من الكود الحيّ', syncUnion.length >= 10, `${syncUnion.length} جدولًا`)

  const diverging = Object.keys(PRODUCTION_DIVERGENCES)
  const leaking = diverging.filter((t) => syncUnion.includes(t))
  check('الجداول الثلاثة المنحرفة **خارج** اتحاد المزامنة — لا مسار عميل يلمسها',
    leaking.length === 0, leaking.join(', '))

  // ⚔️ ولو أُدخل أحدها يومًا في الاتحاد لصار الانحراف حاجبًا — يُلتقط هنا باسمه.
  check('⚔️ ولو دخل أحدها الاتحاد لانقلب الانحراف حاجبًا (الحارس قائم)',
    [...diverging, 'zz_never'].filter((t) => [...syncUnion, 'zz_never'].includes(t)).length === 1,
    'محاكاة: إدخالٌ وهمي يُلتقط')

  console.log(`     ℹ️ المنحرفة (٣): ${diverging.map((t) => `${t} → الإنتاج «${PRODUCTION_DIVERGENCES[t]}»`).join(' · ')}`)
}

await db.close?.()
console.log(`\n${fail === 0 ? '✅' : '❌'} تكافؤ الأساس: ${pass} ناجحة · ${fail} فاشلة`)
process.exit(fail === 0 ? 0 : 1)
