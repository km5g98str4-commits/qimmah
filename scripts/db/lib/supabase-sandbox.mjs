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
import { randomBytes } from 'node:crypto'
// وعي البوّابة [20260827120004]: نُعيد استعمال ساكّ الختم المتزامن نفسه الذي
// يستعمله طقم Postgres الحقيقي — مصدرٌ واحد فلا يتباعد التنفيذان.
import { mintStampSync, GATE_ACTION_BY_RPC } from './pg-staging.mjs'

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

  // ── بديل Vault + وعي البوّابة [20260827120004] ─────────────────────────────
  // بعد تبويب الطفرات الأربع، لا تُنفَّذ بلا ختم `x-qimmah-gate` صالح. الصندوق —
  // بوصفه محاكيًا أمينًا — يزرع بديل vault بنفس شكل Supabase (name/decrypted_secret)
  // بسرٍّ يُولَّد وقت التشغيل، ثم **يلفّ** db.query/db.exec فيسكّ الختم نفسه الذي
  // تسكّه البوّابة لكل نداء مبوَّب — فتبقى الإثباتات القائمة خضراء بلا تعديل سطر
  // فيها، بينما يبقى الحارس فعّالًا (غياب السرّ ⇒ فشل مغلق).
  const gateSecret = `sbx-gate-secret-${randomBytes(24).toString('hex')}` // ≥32 محرفًا
  await db.exec(`
    create schema if not exists vault;
    create table if not exists vault._secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
    create or replace view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault._secrets;
    insert into vault._secrets(name, secret) values ('qimmah_gate_secret', '${gateSecret}')
      on conflict (name) do update set secret = excluded.secret;
  `)

  const origQuery = db.query.bind(db)
  const origExec = db.exec.bind(db)
  const gateActionsInSql = (sql) => {
    const hits = new Set()
    for (const [rpc, action] of Object.entries(GATE_ACTION_BY_RPC)) {
      if (new RegExp(`\\b${rpc}\\s*\\(`).test(sql)) hits.add(action)
    }
    return [...hits]
  }
  // قبل كل نداء لِـRPC مبوَّبة (فعلٌ واحد بالضبط في العبارة)، اقرأ الهوية الحاليّة
  // واسكّ ختمًا صحيحًا في request.headers — تمامًا كما تفعل البوّابة. بلا هوية أو
  // بأفعال متعدّدة: لا نلمس شيئًا (يسقط عند «not authenticated» كما كان).
  const ensureStamp = async (sql) => {
    if (typeof sql !== 'string') return
    const actions = gateActionsInSql(sql)
    if (actions.length !== 1) return
    let uid = null
    try { uid = (await origQuery(`select nullif(current_setting('request.jwt.claim.sub', true), '') as u`)).rows[0].u } catch { /* لا هوية */ }
    if (!uid) return
    await origQuery(`select set_config('request.headers', $1, false)`,
      [JSON.stringify({ 'x-qimmah-gate': mintStampSync(gateSecret, actions[0], uid) })])
  }
  db.query = async (sql, params) => { await ensureStamp(sql); return origQuery(sql, params) }
  db.exec = async (sql) => { await ensureStamp(sql); return origExec(sql) }

  return { db, applied, failed, gateSecret }
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
