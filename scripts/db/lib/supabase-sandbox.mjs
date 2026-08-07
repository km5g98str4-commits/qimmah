// ============================================================================
// صندوق Supabase الرملي — قاعدة Postgres حقيقية داخل العملية، مهيّأة كمشروع
// Supabase، تُطبَّق عليها **كل** هجرات المستودع من قاعدة نظيفة.
// ============================================================================
// يستخدمه إثباتان: `test:entitlements` و`test:privileges`.
//
// لماذا يهمّ التهيئة أن تُحاكي Supabase بدقّة: المشروع الحقيقي يمنح `anon`
// و`authenticated` صلاحيات **كاملة** على جداول `public` (عبر امتيازات افتراضية
// على المخطّط). أي صندوق لا يفعل ذلك يجعل كل فحص «ممنوع» ينجح مجّانًا — لأن
// الدور لم يُمنح شيئًا أصلًا — فيبدو الحارس فعّالًا وهو غير مُختبَر (§4.2).
// ============================================================================
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')

/** أسماء ملفات الهجرة مرتّبة كما يطبّقها Supabase CLI. */
export function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
}
export const readMigration = (f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8')

/** أدوار العميل التي يجب ألّا تملك أكثر ممّا تحتاج. */
export const CLIENT_ROLES = ['anon', 'authenticated']
export const ALL_ROLES = ['anon', 'authenticated', 'service_role']

/**
 * ينشئ قاعدة نظيفة، يهيّئها كمشروع Supabase، ثم يطبّق الهجرات.
 * @param {{ exclude?: string[] }} opts  هجرات تُستثنى (لتصوير حالة ما قبل الإصلاح).
 */
export async function createSandbox({ exclude = [] } = {}) {
  const db = await PGlite.create({ extensions: { pgcrypto } })

  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    grant usage on schema public to anon, authenticated, service_role;

    -- ⚠ سلوك Supabase الحقيقي: كل جدول جديد في public يُمنح كاملًا لهذه الأدوار.
    -- هذا هو منبع الثغرة التي تعالجها هجرة التحصين، ووجوده هنا شرط لصدق الإثبات.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

    create schema auth;
    create table auth.users (
      id                 uuid primary key default gen_random_uuid(),
      email              text unique,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    -- نفس شكل Supabase: المعرّف يُقرأ من مطالبة الـJWT.
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `)

  const applied = []
  const failed = []
  for (const f of migrationFiles()) {
    if (exclude.includes(f)) continue
    try {
      await db.exec(readMigration(f))
      applied.push(f)
    } catch (e) {
      failed.push({ file: f, message: String(e.message || e).split('\n')[0] })
    }
  }
  return { db, applied, failed }
}

/** يبدّل الدور الفعّال ومطالبة الهوية. `role=null` ⇒ مالك القاعدة. */
export async function asRole(db, role, uid) {
  await db.exec('reset role;')
  if (uid !== undefined) {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  }
  if (role) await db.exec(`set role ${role};`)
}

export async function makeUser(db, email, confirmed = true) {
  await db.exec('reset role;')
  const r = await db.query(
    `insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`,
    [email, confirmed ? new Date().toISOString() : null],
  )
  return r.rows[0].id
}

/** كل جداول public الأساسية. */
export async function publicTables(db) {
  await db.exec('reset role;')
  const r = await db.query(`
    select c.relname as table_name,
           pg_get_userbyid(c.relowner) as owner,
           c.relrowsecurity  as rls_enabled,
           c.relforcerowsecurity as rls_forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname`)
  return r.rows
}

/** مصفوفة الصلاحيات: جدول × دور → قائمة الصلاحيات الممنوحة فعليًا. */
export async function privilegeMatrix(db) {
  await db.exec('reset role;')
  const r = await db.query(`
    select table_name, grantee,
           string_agg(distinct privilege_type, ',' order by privilege_type) as privs
      from information_schema.role_table_grants
     where table_schema = 'public' and grantee = any($1)
     group by table_name, grantee`, [ALL_ROLES])
  /** @type {Record<string, Record<string, string[]>>} */
  const m = {}
  for (const row of r.rows) {
    m[row.table_name] ??= {}
    m[row.table_name][row.grantee] = row.privs.split(',')
  }
  return m
}

/** هل ينجح TRUNCATE فعليًا بهذا الدور؟ يُنفَّذ ويُتراجَع عنه — لا يُستنتج. */
export async function canTruncate(db, role, table) {
  await db.exec('reset role;')
  await db.exec('begin')
  try {
    await db.exec(`set role ${role};`)
    await db.exec(`truncate public.${table}`)
    return true
  } catch {
    return false
  } finally {
    // الترتيب مقصود: TRUNCATE مرفوض يُجهض المعاملة، وكل أمر بعده — بما فيه
    // `reset role` — يُرفض حتى تُغلَق. فالتراجع أولًا ثم استعادة الدور.
    await db.exec('rollback')
    await db.exec('reset role;')
  }
}
