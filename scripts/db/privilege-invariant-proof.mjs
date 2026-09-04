// ============================================================================
// test:privilege-invariant — ثابت صلاحيات العميل، مُقاسًا على **شكلَي قاعدة**
// [PROD-DRIFT] · إغلاق عطلٍ لم يكشفه staging لأنه لا يوجد فيه أصلًا
// ============================================================================
// ═══ العطل الذي وُجد هذا الملف له ═══
// `20260806120003` كانت تحصّن **قائمة مسمّاة** وتؤكّد **على المخطّط كلّه**.
// وعلى قاعدةٍ نظيفة لا فرق بين الأمرين — فمرّت على staging سنةً كاملة. وعلى
// الإنتاج (`ledlypcyrtnzvjvhykwz`، مقيسًا في ٤ سبتمبر ٢٠٢٦) ستّة جداول قديمة
// خارج القائمة، فسقط التأكيد وأُجهضت الهجرة **عند الجدول رقم ١٥ من ٤٤**.
//
// **الدرس البنيوي:** إثباتٌ يبني قاعدته من مجلّد الهجرات وحده لا يرى إلا العالم
// الذي تصنعه الهجرات. والإنتاج ليس كذلك — فيه رواسب. فهذا الملف يقيس **شكلين**:
//   CASE 1 — قاعدة نظيفة (ما يصنعه المجلّد).
//   CASE 2 — قاعدة **شبيهة بالإنتاج**: نفس الستّة، بنفس منحها ونفس سياساتها.
//
// ═══ الثابت المُثبَت هنا ═══
//   ① `anon` = صفر على كل جدول، بلا استثناء.
//   ② `authenticated` = ما تمنحه القائمة صراحةً، لا أكثر.
//   ③ **الجدول المجهول يسقط إلى الصفر** — لا إلى وراثة المنصّة.
//   ④ `service_role` لا يُمسّ.
//   ⑤ البيانات والبنية وRLS للجداول القديمة **باقية** — المسحوب صلاحيةُ عميل.
//
// التشغيل: npm run test:privilege-invariant
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSandbox, migrationFiles, readMigration, privilegeMatrix, canTruncate,
  CLIENT_ROLES, MIGRATIONS_DIR,
} from './lib/supabase-sandbox.mjs'

let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  if (ok) pass += 1
  else fail += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}

// ── العقد المعتمد: من يملك ماذا، ولا شيء غيره ──────────────────────────────
const SYNC_TABLES = [
  'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
  'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
  'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
  'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates',
]
const READ_ONLY_TABLES = ['entitlements', 'access_code_redemptions']
/**
 * تُمنح SELECT بهجرة **لاحقة** للتحصين (`20260824120003_food_submissions`)، لا
 * بالتحصين نفسه. تُذكر هنا صراحةً لأن الثابت يُقاس على السلسلة كاملة: إغفالها
 * كان سيجعل منحةً مشروعة تبدو خرقًا، وإدراجها بلا تسمية كان سيجعل أي منحة
 * لاحقة تمرّ صامتة. فالقائمة تُسمّى وتُعلّل — لا تُوسَّع لتخضرّ.
 */
const POST_HARDENING_READS = ['food_submissions']
const CRUD = 'DELETE,INSERT,SELECT,UPDATE'

/** الستّة المقيسة على الإنتاج — بأسمائها وأعمدتها الحقيقية. */
const LEGACY_TABLES = ['custom_foods', 'food_logs', 'progress_photos', 'weight_logs', 'workout_logs', 'workout_sets']

const HARDENING = '20260806120003_table_privileges_hardening.sql'

/**
 * تصوير الإنتاج كما قِيس: ستّة جداول أُنشئت **قبل** التحصين، فورثت منح المنصّة
 * كاملةً (‏SELECT…TRUNCATE لـanon وauthenticated)، وسياساتها بلا `to authenticated`
 * أي `{public}` — وهو حرفيًّا ما عاد من `pg_policies` على الإنتاج.
 */
const LEGACY_FIXTURE = `
  create table if not exists public.custom_foods (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    barcode text, name text not null, brand text, per text default '100g',
    kcal numeric, protein numeric, carbs numeric, fat numeric,
    status text default 'pending', created_at timestamptz default now());
  create table if not exists public.food_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    food_name text not null, meal_type text, grams numeric, kcal numeric,
    logged_at date not null default current_date, created_at timestamptz default now());
  create table if not exists public.progress_photos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null, storage_path text, caption text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists public.weight_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    weight_kg numeric not null, logged_at date not null default current_date,
    note text, created_at timestamptz default now());
  create table if not exists public.workout_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    exercise_id text, exercise_name text, sets jsonb,
    logged_at date not null default current_date, created_at timestamptz default now());
  create table if not exists public.workout_sets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id uuid, exercise_id text not null, set_number int,
    actual_reps text, weight_kg text, completed boolean default false,
    created_at timestamptz not null default now());

  alter table public.custom_foods     enable row level security;
  alter table public.food_logs        enable row level security;
  alter table public.progress_photos  enable row level security;
  alter table public.weight_logs      enable row level security;
  alter table public.workout_logs     enable row level security;
  alter table public.workout_sets     enable row level security;

  -- سياسات بلا \`to authenticated\` ⇒ {public} — كما هي على الإنتاج حرفيًّا.
  create policy "read verified or own foods" on public.custom_foods for select
    using (status = 'verified' or auth.uid() = user_id);
  create policy "own foods"    on public.food_logs    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own weights"  on public.weight_logs  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own workouts" on public.workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy progress_photos_select_own on public.progress_photos for select using (auth.uid() = user_id);
  create policy workout_sets_select_own    on public.workout_sets    for select using (auth.uid() = user_id);
`

/** تهيئة قاعدة بشكل Supabase الحقيقي — مرآةٌ لبوتستراب `supabase-sandbox`. */
async function bootstrap() {
  const db = await PGlite.create({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    -- سلوك المنصّة الحقيقي: كل جدول جديد يُمنح كاملًا لهذه الأدوار.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique, email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `)
  return db
}

/**
 * يطبّق الهجرات بالترتيب، مع خطّافٍ يُنفَّذ **قبل** ملفّ مسمّى، وإمكان **إبدال**
 * ملفّ بنصٍّ آخر — وبه يُصوَّر التصميم القديم في موضعه الحقيقي من السلسلة.
 */
async function applyMigrations(db, { before = null, hook = null, stopAfter = null, replace = null } = {}) {
  const failed = []
  for (const f of migrationFiles()) {
    if (before && f === before && hook) await hook(db)
    try {
      await db.exec(replace && replace.file === f ? replace.sql : readMigration(f))
    } catch (e) {
      failed.push({ file: f, message: String(e.message || e).split('\n')[0] })
    }
    if (stopAfter && f === stopAfter) break
  }
  return failed
}

/** الثابت مُقيَّمًا في JS — يُستعمل للإثبات **وللتأكيد المضادّ**. */
function invariantViolations(matrix, tables) {
  const bad = []
  for (const t of tables) {
    const anon = (matrix[t]?.anon ?? [])
    const auth = (matrix[t]?.authenticated ?? []).slice().sort().join(',')
    if (anon.length) bad.push(`${t}: anon=${anon.join('/')}`)
    const expected = SYNC_TABLES.includes(t) ? CRUD
      : (READ_ONLY_TABLES.includes(t) || POST_HARDENING_READS.includes(t)) ? 'SELECT' : ''
    if (auth !== expected) bad.push(`${t}: authenticated="${auth}" expected "${expected}"`)
  }
  return bad
}

const tableNames = async (db) => (await db.query(
  `select c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by 1`)).rows.map((r) => r.t)

console.log('\n════ ثابت صلاحيات العميل — شكلان: نظيف · شبيه بالإنتاج ════')

// ═════════════════════════════════════════════════════════════════════════
// ⓪ حارس بنيوي: الفعل في الهجرة يجب أن يكون **مسحًا للكتالوج** لا قائمة
// ═════════════════════════════════════════════════════════════════════════
console.log('\n⓪ بنية الهجرة — الفعل بحجم التأكيد')
{
  const src = readFileSync(join(MIGRATIONS_DIR, HARDENING), 'utf8')
  const code = src.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n')
  const action = code.slice(0, code.indexOf('alter default privileges'))
  check('السحب يُشتقّ من كتالوج الجداول لا من مصفوفة أسماء',
    /from\s+pg_class\s+c\s+join\s+pg_namespace/i.test(action) && /revoke all on public\.%I from anon, authenticated/.test(action))
  check('ولا منحة واحدة لـanon في جسم الهجرة', !/to\s+anon\b/i.test(action))
  check('والتأكيد الموجب حاضر: جدول خارج القائمة لا يمنح authenticated',
    /unlisted table still grants authenticated/.test(code))
}

// ═════════════════════════════════════════════════════════════════════════
// ① CASE 1 — قاعدة نظيفة (ما يصنعه مجلّد الهجرات وحده)
// ═════════════════════════════════════════════════════════════════════════
console.log('\n① CASE 1 — مخطّط نظيف قانوني')
{
  const { db, failed } = await createSandbox()
  check('الهجرات الـ٤٤ تُطبَّق من قاعدة نظيفة بلا فشل', failed.length === 0,
    failed.map((f) => `${f.file}: ${f.message}`).join(' | ').slice(0, 220))

  const matrix = await privilegeMatrix(db)
  const tables = await tableNames(db)
  const bad = invariantViolations(matrix, tables)
  check(`الثابت قائم على ${tables.length} جدولًا`, bad.length === 0, bad.slice(0, 4).join(' | '))
  check('service_role باقٍ على سلطته (لم يُمسّ)',
    tables.filter((t) => (matrix[t]?.service_role ?? []).length > 0).length === tables.length)
  await db.close?.()
}

// ═════════════════════════════════════════════════════════════════════════
// ② CASE 2 — قاعدة شبيهة بالإنتاج: الستّة القديمة بمنحها وسياساتها
// ═════════════════════════════════════════════════════════════════════════
console.log('\n② CASE 2 — مخطّط شبيه بالإنتاج (الستّة القديمة حاضرة)')
let case2Ok = false
{
  const db = await bootstrap()
  // الجداول القديمة تُزرع **قبل** التحصين — كما وُجدت على الإنتاج بالضبط.
  const failed = await applyMigrations(db, { before: HARDENING, hook: async (d) => { await d.exec(LEGACY_FIXTURE) } })

  // ── أمانة التصوير: الثغرة موجودة فعلًا قبل أن نزعم إغلاقها ──
  const tables = await tableNames(db)
  check(`القاعدة تحمل الستّة القديمة (${tables.length} جدولًا إجمالًا)`,
    LEGACY_TABLES.every((t) => tables.includes(t)), LEGACY_TABLES.filter((t) => !tables.includes(t)).join(', '))

  check('الهجرة ٢٠٢٦٠٨٠٦١٢٠٠٠٣ **طُبِّقت** على الشكل الذي كان يُجهضها',
    !failed.some((f) => f.file === HARDENING),
    failed.filter((f) => f.file === HARDENING).map((f) => f.message).join(''))
  check('وبقيّة السلسلة تكمل بعدها بلا فشل', failed.length === 0,
    failed.map((f) => `${f.file}: ${f.message}`).join(' | ').slice(0, 220))

  const matrix = await privilegeMatrix(db)
  const bad = invariantViolations(matrix, tables)
  check('الثابت قائم على المخطّط كلّه — القديم والقانوني معًا', bad.length === 0, bad.slice(0, 5).join(' | '))

  const legacyLeft = LEGACY_TABLES.filter((t) => (matrix[t]?.anon ?? []).length || (matrix[t]?.authenticated ?? []).length)
  check('الستّة القديمة: **صفر** صلاحية عميل', legacyLeft.length === 0, legacyLeft.join(', '))

  // TRUNCATE يُنفَّذ ويُرفض — لا يُستنتج من المصفوفة
  const truncatable = []
  for (const t of LEGACY_TABLES) {
    for (const role of CLIENT_ROLES) if (await canTruncate(db, role, t)) truncatable.push(`${role}:${t}`)
  }
  check('وTRUNCATE مرفوض بالتنفيذ على الستّة × الدورين', truncatable.length === 0, truncatable.join(', '))

  // البنية والبيانات باقية — المسحوب صلاحية لا جدول
  const still = await db.query(
    `select count(*)::int n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
      where ns.nspname='public' and c.relkind='r' and c.relname = any($1) and c.relrowsecurity`, [LEGACY_TABLES])
  check('الجداول القديمة باقية وRLS عليها مفعّل (لا حذف ولا تعطيل)', still.rows[0].n === LEGACY_TABLES.length,
    `${still.rows[0].n}/${LEGACY_TABLES.length}`)
  const pol = await db.query(`select count(*)::int n from pg_policies where schemaname='public' and tablename = any($1)`, [LEGACY_TABLES])
  check('وسياساتها لم تُمسّ', pol.rows[0].n === 6, `${pol.rows[0].n} سياسة`)

  case2Ok = true
  await db.close?.()
}

// ═════════════════════════════════════════════════════════════════════════
// ③ التأكيد المضادّ — التصميم القديم يسقط، وبفحص مسمّى (§4.2)
// ═════════════════════════════════════════════════════════════════════════
console.log('\n③ ⚔️ التأكيد المضادّ — الفعل المحصور بقائمة يُدان')
{
  const db = await bootstrap()
  // نفس الشكل تمامًا، لكن يحلّ **التصميم القديم** محلّ الهجرة في موضعها نفسه:
  // سحبٌ ومنحٌ على القائمة وحدها، بلا مسحٍ للكتالوج.
  const listScoped = [
    ...SYNC_TABLES.map((t) => `revoke all on public.${t} from anon, authenticated; grant select, insert, update, delete on public.${t} to authenticated;`),
    ...READ_ONLY_TABLES.map((t) => `revoke all on public.${t} from anon, authenticated; grant select on public.${t} to authenticated;`),
  ].join('\n')
  await applyMigrations(db, {
    before: HARDENING,
    hook: async (d) => { await d.exec(LEGACY_FIXTURE) },
    replace: { file: HARDENING, sql: listScoped },
    stopAfter: HARDENING,
  })

  const matrix = await privilegeMatrix(db)
  const tables = await tableNames(db)
  const bad = invariantViolations(matrix, tables)
  check('⟲ التصميم القديم يترك خرقًا مسمّى (لا يمرّ صامتًا)', bad.length > 0,
    `${bad.length} خرقًا · مثال: ${bad[0] ?? '—'}`)
  const legacyStillOpen = LEGACY_TABLES.filter((t) => (matrix[t]?.anon ?? []).includes('TRUNCATE'))
  check('⟲ وتحديدًا: anon يحتفظ بـTRUNCATE على الستّة تحت التصميم القديم',
    legacyStillOpen.length === LEGACY_TABLES.length, legacyStillOpen.join(', '))
  await db.close?.()
}

// ═════════════════════════════════════════════════════════════════════════
// ④ الجدول المجهول — الافتراض مغلق، لا مفتوح
// ═════════════════════════════════════════════════════════════════════════
console.log('\n④ الجدول المجهول يسقط إلى الصفر — لا بالاسم بل بالبنية')
{
  const db = await bootstrap()
  await applyMigrations(db, {
    before: HARDENING,
    hook: async (d) => {
      await d.exec(`create table public.zz_out_of_band_probe (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete cascade, payload jsonb);
        alter table public.zz_out_of_band_probe enable row level security;`)
    },
  })
  const matrix = await privilegeMatrix(db)
  const probe = matrix['zz_out_of_band_probe'] ?? {}
  check('جدولٌ باسمٍ لم يعرفه أحد ⇒ anon صفر · authenticated صفر',
    (probe.anon ?? []).length === 0 && (probe.authenticated ?? []).length === 0,
    `anon=${(probe.anon ?? []).join('/') || '∅'} auth=${(probe.authenticated ?? []).join('/') || '∅'}`)
  check('وservice_role عليه باقٍ — الحجب للعميل لا للخادم', (probe.service_role ?? []).length > 0)
  await db.close?.()
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ثابت الصلاحيات: ${pass} ناجحة · ${fail} فاشلة`)
if (!case2Ok) console.log('   ⚠️ لم يكتمل CASE 2 — الشكل الشبيه بالإنتاج هو مقصد هذا الملف.')
process.exit(fail === 0 ? 0 : 1)
