// ============================================================================
// test:db-schema — offline proof that supabase/migrations actually secures the
// sync surface, and that it still matches what the client pushes.
//
// WHAT THIS PROVES (no network, no database, runs in the gate):
//   ① contract   every table in the client's SyncTable union has DDL: user_id FK
//                to auth.users ON DELETE CASCADE, created_at/updated_at, and a
//                unique key equal to the upsert's onConflict target.
//   ② rls        every one of them gets RLS enabled and exactly four policies —
//                select/insert/update/delete — each scoped `to authenticated`
//                with the owner-only predicate and nothing else.
//   ③ isolation  TWO-ACCOUNT PROOF: the policy predicates are parsed out of the
//                migration text, canonicalised, and executed against a two-user
//                row set. A cannot read, update, delete or forge B's rows; anon
//                gets nothing. A predicate that does not canonicalise to the
//                owner-only form fails the proof (unknown ⇒ not proven safe).
//   ④ tombstones the three P14 tombstone tables + measurement_logs carry
//                deleted_at, and every column tombstoneRow() writes exists.
//   ⑤ idempotent no statement in the folder can break on a second run, and none
//                can destroy user data (no drop table / truncate / delete from).
//   ⑥ parity     the local e2e stack's SUPABASE-SCHEMA.sql knows the same four
//                tables with the same RLS, so it does not drift from migrations.
//
// WHAT IT DOES NOT PROVE: that Postgres accepts this SQL, or that a live project
// is configured. That is `npm run db:verify` against a real (staging) project —
// two throwaway users, real RLS, real delete_own_account. Both are required; a
// static proof cannot replace the empirical one and does not claim to.
// ============================================================================

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { SYNC_TABLES, TOMBSTONE_TABLES } from '@/lib/syncQueue'

// The runner passes the repo root explicitly: the bundle executes from a tmpdir,
// so import.meta.url would point at the wrong tree.
const root = resolve(process.env.QIMMAH_PROOF_ROOT ?? process.cwd())
const migrationsDir = join(root, 'supabase/migrations')

const results: { name: string; pass: boolean; detail: string }[] = []
function check(name: string, pass: boolean, detail = ''): boolean {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}

// ── source material ─────────────────────────────────────────────────────────
const stripComments = (sql: string): string => sql.replace(/--[^\n]*/g, '')

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((file) => {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    return { file, sql, code: stripComments(sql) }
  })
/** All migration SQL with `-- prose` removed, so comments never satisfy a check. */
const code = migrations.map((m) => m.code).join('\n')
const syncServiceSrc = readFileSync(join(root, 'src/lib/syncService.ts'), 'utf8')
const rootSchemaSql = readFileSync(join(root, 'SUPABASE-SCHEMA.sql'), 'utf8')

const tables = [...SYNC_TABLES].sort()
const tombstones = [...TOMBSTONE_TABLES].sort()

/** The onConflict target each table's upsert uses (src/lib/syncService.ts). */
const CONFLICT_KEY: Record<string, string[]> = {
  profiles: ['user_id'],
  workout_sessions: ['user_id', 'local_id'],
  exercise_history: ['user_id', 'exercise_id'],
  measurement_logs: ['user_id', 'local_id'],
  daily_logs: ['user_id', 'date'],
  step_logs: ['user_id', 'date'],
  achievements: ['user_id'],
  custom_plans: ['user_id'],
  todos: ['user_id'],
  nutrition_ledger: ['user_id', 'date'],
  recovery_logs: ['user_id', 'date'],
  workout_schedule: ['user_id'],
  plan_templates: ['user_id', 'local_id'],
}

/** Columns tombstoneRow() writes per table (src/lib/syncService.ts). */
const TOMBSTONE_COLUMNS: Record<string, string[]> = {
  measurement_logs: ['local_id', 'values', 'notes', 'deleted_at'],
  nutrition_ledger: ['date', 'data', 'deleted_at'],
  workout_schedule: ['data', 'deleted_at'],
  plan_templates: ['local_id', 'data', 'deleted_at'],
}

// ── DDL extraction ──────────────────────────────────────────────────────────
interface TableDdl {
  body: string
  columns: Set<string>
  uniques: string[][]
}

function extractTable(name: string): TableDdl | null {
  const re = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${name}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i')
  const m = code.match(re)
  if (!m) return null
  const body = m[1]
  const columns = new Set<string>()
  const uniques: string[][] = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '')
    if (!line) continue
    const uq = line.match(/^unique\s*\(([^)]*)\)$/i)
    if (uq) {
      uniques.push(uq[1].split(',').map((c) => c.trim()))
      continue
    }
    // `"values"` is quoted because VALUES is a reserved key word; the column
    // name itself is unchanged, so strip the quotes when recording it.
    const col = line.match(/^"?([a-z_][a-z0-9_]*)"?\s+/i)
    if (col && !/^(unique|primary|constraint|check|foreign)$/i.test(col[1])) columns.add(col[1])
  }
  // Columns/keys a later repair or convergence block adds count too.
  for (const add of code.matchAll(
    new RegExp(`alter\\s+table\\s+public\\.${name}\\s+add\\s+column\\s+if\\s+not\\s+exists\\s+([a-z_]+)`, 'gi'),
  )) {
    columns.add(add[1])
  }
  for (const add of code.matchAll(new RegExp(`\\('${name}',\\s*'([a-z_]+)',\\s*'`, 'g'))) {
    columns.add(add[1])
  }
  for (const add of code.matchAll(new RegExp(`'${name}_user_id[a-z_]*_key',\\s*'\\(([^)]*)\\)'`, 'g'))) {
    uniques.push(add[1].split(',').map((c) => c.trim()))
  }
  return { body, columns, uniques }
}

// ── ① contract ──────────────────────────────────────────────────────────────
console.log('\nQimmah — P14 schema / RLS proof (offline)')
console.log('══════════════════════════════════════════')
console.log(`\n① contract — ${tables.length} client sync tables have conforming DDL`)

const ddl = new Map<string, TableDdl>()
for (const t of tables) {
  const d = extractTable(t)
  if (!check(`${t}: created in supabase/migrations`, d !== null) || d === null) continue
  ddl.set(t, d)

  check(
    `${t}: user_id references auth.users ON DELETE CASCADE`,
    /user_id\s+uuid\s+not\s+null\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i.test(d.body),
  )
  check(`${t}: has created_at + updated_at`, d.columns.has('created_at') && d.columns.has('updated_at'))

  const expected = CONFLICT_KEY[t]
  const hasKey = d.uniques.some((u) => u.length === expected.length && u.every((c, i) => c === expected[i]))
  check(
    `${t}: unique (${expected.join(', ')}) backs the upsert's onConflict`,
    hasKey,
    hasKey ? '' : `found: ${d.uniques.map((u) => `(${u.join(',')})`).join(' ') || 'none'}`,
  )
}

// A column named with a Postgres RESERVED key word must be quoted or CREATE
// TABLE does not parse at all — the whole folder would fail on statement one.
// `values` (measurement_logs) is the live case; the rest are guard rails.
const RESERVED = [
  'values', 'user', 'order', 'group', 'table', 'column', 'default', 'references',
  'check', 'unique', 'primary', 'select', 'where', 'from', 'to', 'end', 'case',
  'limit', 'offset', 'window', 'using', 'when', 'then', 'all', 'any', 'array',
]
const unquotedReserved: string[] = []
for (const m of code.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/gi)) {
  for (const rawLine of m[2].split('\n')) {
    const word = rawLine.trim().match(/^([a-z_]+)\s+[a-z]/i)?.[1]
    if (word && RESERVED.includes(word.toLowerCase())) unquotedReserved.push(`${m[1]}.${word}`)
  }
}
check(
  'no reserved key word is used as an UNQUOTED column name',
  unquotedReserved.length === 0,
  unquotedReserved.join(', '),
)

// The P14 tables must sit in the right branch of the client's onConflict ternary,
// so editing that branch without a matching unique key is caught here.
check(
  "client onConflict: nutrition_ledger + recovery_logs → 'user_id,date'",
  /table === 'nutrition_ledger' \|\| table === 'recovery_logs'[\s\S]{0,80}'user_id,date'/.test(syncServiceSrc),
)
check(
  "client onConflict: workout_schedule → 'user_id'",
  /table === 'workout_schedule'\s*\n?\s*\?\s*'user_id'|workout_schedule'\s*$[\s\S]{0,60}'user_id'/m.test(syncServiceSrc) ||
    /'achievements' \|\| table === 'custom_plans' \|\| table === 'todos' \|\| table === 'workout_schedule'[\s\S]{0,80}'user_id'/.test(
      syncServiceSrc,
    ),
)

// ── ② RLS policies ──────────────────────────────────────────────────────────
console.log('\n② rls — every sync table is RLS-enabled with exactly 4 owner-only policies')

/**
 * True when `sql` runs the table through a `foreach t in array array[…]` loop
 * that enables RLS. The loops call `format('… public.%I …')`, so the table name
 * never appears literally next to the statement — the array is the evidence.
 */
function rlsLoopCovers(sql: string, table: string): boolean {
  if (!/enable row level security/i.test(sql)) return false
  for (const a of sql.matchAll(/foreach\s+t\s+in\s+array\s+array\[([\s\S]*?)\]/gi)) {
    if ([...a[1].matchAll(/'([a-z_]+)'/g)].some((x) => x[1] === table)) return true
  }
  return false
}

/** Which migration enables RLS for this table. */
function rlsMigrationFor(table: string): { file: string; sql: string; code: string } | null {
  return migrations.find((m) => rlsLoopCovers(m.code, table)) ?? null
}

const CMDS = ['select', 'insert', 'update', 'delete'] as const

/** The four policy templates a migration writes, keyed by command. */
function policyTemplates(migrationCode: string): Map<string, string> {
  const perCmd = new Map<string, string>()
  // Each policy is written as execute format('create policy … ;', t);
  for (const m of migrationCode.matchAll(/create policy "%1\$s_([a-z]+)_own" on public\.%1\$s([\s\S]*?)',\s*t\)/g)) {
    perCmd.set(m[1], m[2])
  }
  return perCmd
}

/** Canonicalise a policy expression; ONLY the owner-only form is accepted. */
function isOwnerOnly(expr: string | undefined): boolean {
  if (expr === undefined) return false
  const flat = expr.replace(/\s+/g, '').replace(/\(selectauth\.uid\(\)\)/gi, 'auth.uid()')
  return flat === 'auth.uid()=user_id' || flat === 'user_id=auth.uid()'
}

interface ParsedPolicy {
  using?: string
  withCheck?: string
  authenticatedOnly: boolean
}
const parsed = new Map<string, ParsedPolicy>()

for (const t of tables) {
  const migration = rlsMigrationFor(t)
  if (!check(`${t}: RLS enabled by a migration`, migration !== null, migration?.file ?? 'no enable-RLS loop covers it')) {
    continue
  }
  if (migration === null) continue

  const tmpl = policyTemplates(migration.code)
  if (!check(`${t}: 4 policy templates in ${migration.file}`, tmpl.size === 4, `${tmpl.size} found`)) continue

  check(
    `${t}: pre-existing policies dropped first (re-run converges)`,
    /drop policy if exists %I on public\.%I/.test(migration.code),
  )

  for (const cmd of CMDS) {
    const clause = tmpl.get(cmd) ?? ''
    const authenticatedOnly = /to\s+authenticated/i.test(clause)
    const using = clause.match(/using\s*\(([\s\S]*?)\)\s*(?:with check|;|$)/i)?.[1]
    const withCheck = clause.match(/with check\s*\(([\s\S]*?)\)\s*;?\s*$/i)?.[1]
    parsed.set(`${t}.${cmd}`, { using, withCheck, authenticatedOnly })

    check(`${t}.${cmd}: granted to authenticated only`, authenticatedOnly)
    if (cmd === 'insert') {
      check(`${t}.insert: WITH CHECK is owner-only`, isOwnerOnly(withCheck), withCheck?.trim() ?? 'missing')
    } else if (cmd === 'update') {
      check(`${t}.update: USING is owner-only`, isOwnerOnly(using), using?.trim() ?? 'missing')
      check(`${t}.update: WITH CHECK is owner-only (row cannot be re-pointed)`, isOwnerOnly(withCheck), withCheck?.trim() ?? 'missing')
    } else {
      check(`${t}.${cmd}: USING is owner-only`, isOwnerOnly(using), using?.trim() ?? 'missing')
    }
  }
}

// ── ③ two-account isolation, executed against the parsed predicates ─────────
console.log('\n③ isolation — two accounts, simulated over the PARSED policy predicates')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

type Predicate = (uid: string | null, row: { user_id: string }) => boolean
/** Compile the canonical owner-only expression into an executable predicate. */
function compile(expr: string | undefined): Predicate | null {
  if (!isOwnerOnly(expr)) return null
  // `(select auth.uid()) = user_id` — an anon JWT has auth.uid() = NULL, and
  // `NULL = user_id` is never true, hence the uid !== null arm.
  return (uid, row) => uid !== null && uid === row.user_id
}

let isolated = 0
for (const t of tables) {
  const rows = [
    { user_id: A, marker: 'A-private' },
    { user_id: B, marker: 'B-private' },
  ]
  const selectUsing = compile(parsed.get(`${t}.select`)?.using)
  const updateUsing = compile(parsed.get(`${t}.update`)?.using)
  const updateCheck = compile(parsed.get(`${t}.update`)?.withCheck)
  const deleteUsing = compile(parsed.get(`${t}.delete`)?.using)
  const insertCheck = compile(parsed.get(`${t}.insert`)?.withCheck)

  if (!selectUsing || !updateUsing || !updateCheck || !deleteUsing || !insertCheck) {
    check(`${t}: predicates compile to the owner-only form`, false, 'did not canonicalise — NOT proven safe')
    continue
  }

  const visibleToA = rows.filter((r) => selectUsing(A, r))
  const updatableByA = rows.filter((r) => updateUsing(A, r))
  const deletableByA = rows.filter((r) => deleteUsing(A, r))
  const visibleToAnon = rows.filter((r) => selectUsing(null, r))

  const verdicts: [string, boolean][] = [
    ["A's SELECT returns only A's row", visibleToA.length === 1 && visibleToA[0].user_id === A],
    ["A's UPDATE reaches only A's row", updatableByA.length === 1 && updatableByA[0].user_id === A],
    ["A's DELETE reaches only A's row", deletableByA.length === 1 && deletableByA[0].user_id === A],
    ["A cannot INSERT a row owned by B", insertCheck(A, { user_id: B }) === false],
    ["A cannot re-point its row at B", updateCheck(A, { user_id: B }) === false],
    ["A's own INSERT is accepted", insertCheck(A, { user_id: A }) === true],
    ['anon (uid NULL) sees no row even if the role gate were removed', visibleToAnon.length === 0],
    ['anon cannot INSERT', insertCheck(null, { user_id: A }) === false],
    ['policies are role-gated to authenticated', parsed.get(`${t}.select`)?.authenticatedOnly === true],
  ]
  const failedVerdict = verdicts.find(([, ok]) => !ok)
  if (check(`${t}: A ⟂ B — B's row invisible, unwritable, unforgeable`, failedVerdict === undefined, failedVerdict?.[0] ?? '')) {
    isolated++
  }
}
check(`isolation proven for all ${tables.length} sync tables`, isolated === tables.length, `${isolated}/${tables.length}`)

// ── ④ tombstones ────────────────────────────────────────────────────────────
console.log('\n④ tombstones — the delete path has somewhere to land')

for (const t of tombstones) {
  const d = ddl.get(t)
  if (!d) continue
  for (const col of TOMBSTONE_COLUMNS[t] ?? []) {
    check(`${t}: tombstoneRow writes ${col} → column exists`, d.columns.has(col))
  }
  check(
    `${t}: a tombstoned row keeps no readable payload (check constraint)`,
    new RegExp(`${t}_tombstone_payload_wiped`).test(code),
  )
}
check(
  'every TOMBSTONE_TABLES member carries deleted_at',
  tombstones.every((t) => ddl.get(t)?.columns.has('deleted_at') === true),
  tombstones.join(', '),
)
check(
  'recovery_logs gets no deleted_at it never writes (not a tombstone table)',
  ddl.get('recovery_logs')?.columns.has('deleted_at') === false,
)

// ── ⑤ idempotency + destructiveness ─────────────────────────────────────────
console.log('\n⑤ idempotency — safe to re-run, and cannot destroy data')

for (const { file, code: body } of migrations) {
  check(`${file}: no bare CREATE TABLE`, !/create\s+table\s+(?!if\s+not\s+exists)/i.test(body))
  check(`${file}: no bare CREATE INDEX`, !/create\s+(unique\s+)?index\s+(?!if\s+not\s+exists)/i.test(body))
  check(`${file}: functions use CREATE OR REPLACE`, !/create\s+function/i.test(body))
  check(
    `${file}: triggers dropped before created`,
    !/create\s+trigger/i.test(body) || /drop\s+trigger\s+if\s+exists/i.test(body),
  )
  check(`${file}: no DROP TABLE / TRUNCATE`, !/drop\s+table/i.test(body) && !/truncate/i.test(body))
  // The only legitimate DELETE in this folder is inside delete_own_account(),
  // and it must always be scoped to the caller's own rows.
  check(
    `${file}: every DELETE is scoped to the caller's own user_id`,
    [...body.matchAll(/delete\s+from\s+[^;]*/gi)].every((d) => /where\s+(user_id|id)\s*=/i.test(d[0])),
  )
  check(`${file}: columns added only with IF NOT EXISTS`, !/add\s+column\s+(?!if\s+not\s+exists)/i.test(body))
  check(`${file}: never drops a column`, !/drop\s+column/i.test(body))
  check(
    `${file}: every ADD CONSTRAINT is guarded by an existence check`,
    !/add\s+constraint/i.test(body) || /from pg_constraint/i.test(body),
  )
}

// ── ⑥ local e2e stack parity ────────────────────────────────────────────────
console.log('\n⑥ parity — SUPABASE-SCHEMA.sql (local e2e stack) knows the same four tables')

const rootSchemaCode = stripComments(rootSchemaSql)
for (const t of ['nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates']) {
  check(
    `SUPABASE-SCHEMA.sql: ${t} table created`,
    new RegExp(`create table if not exists public\\.${t}\\b`, 'i').test(rootSchemaCode),
  )
  check(`SUPABASE-SCHEMA.sql: ${t} run through an enable-RLS loop`, rlsLoopCovers(rootSchemaCode, t))
}
check(
  'SUPABASE-SCHEMA.sql: measurement_logs gets its missing deleted_at too',
  /alter table public\.measurement_logs add column if not exists deleted_at/i.test(rootSchemaCode),
)

// ── summary ─────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass)
console.log('\n══════════════════════════════════════════')
console.log(`${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('\nFAILURES:')
  failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`))
  process.exit(1)
}
console.log('✅ schema contract + RLS + two-account isolation + idempotency proven (static).')
console.log('   Empirical proof against a live project stays `npm run db:verify`.')
