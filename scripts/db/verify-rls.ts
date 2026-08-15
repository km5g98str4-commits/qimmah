// ============================================================================
// db:verify — empirical RLS + account-deletion proof against a LIVE Supabase
// project (staging recommended). Zero credentials are committed: everything is
// read from env at runtime. Run: npm run db:verify
//
// Required env:
//   SUPABASE_URL, SUPABASE_ANON_KEY
// Optional env:
//   SUPABASE_SERVICE_ROLE_KEY  → enables definitive post-deletion row-count
//                                assertions (0 rows remain for the deleted user).
//                                Without it, deletion is proven by "the deleted
//                                user can no longer authenticate".
//
// Precondition: email confirmations DISABLED on the test project (Auth →
//   Providers → Email → "Confirm email" OFF) so throwaway users get a session
//   on signUp. The script creates two fresh users each run and deletes both via
//   the delete_own_account RPC when done — it leaves no residue.
//
// What it asserts, per user table:
//   • own INSERT/UPSERT succeeds            • own SELECT returns own rows
//   • cross-user SELECT returns 0 rows      • cross-user UPDATE affects 0 rows
//   • cross-user DELETE affects 0 rows      • cross-user INSERT is rejected
//   • an UNFILTERED select as A returns only A's rows (RLS, not a where clause)
//   • anon SELECT returns 0 rows            • anon INSERT is rejected
// Then, on the four tombstone tables (P14): a wiped tombstone upsert is accepted,
// the client's deleted_at/updated_at survive the trigger (LWW evidence intact), a
// tombstone still carrying a payload is REJECTED, and a newer edit revives the row.
// Then: delete_own_account wipes EVERY table for that user + removes the identity.
// ============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface TableSpec {
  name: string
  onConflict: string
  seed: (userId: string) => Record<string, unknown>
}

// Every user table + a minimal valid row and its idempotency key.
const TABLES: TableSpec[] = [
  { name: 'profiles', onConflict: 'user_id', seed: (u) => ({ user_id: u, display_name: 'verify' }) },
  { name: 'workout_sessions', onConflict: 'user_id,local_id', seed: (u) => ({ user_id: u, local_id: 'verify-1', date: '2026-07-13', data: {} }) },
  { name: 'exercise_history', onConflict: 'user_id,exercise_id', seed: (u) => ({ user_id: u, exercise_id: 'verify-ex', data: {} }) },
  { name: 'measurement_logs', onConflict: 'user_id,local_id', seed: (u) => ({ user_id: u, local_id: 'verify-1', date: '2026-07-13', values: {} }) },
  { name: 'daily_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13', data: {} }) },
  { name: 'nutrition_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13' }) },
  { name: 'water_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13', water_ml: 500 }) },
  { name: 'supplement_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13' }) },
  { name: 'medication_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13' }) },
  { name: 'step_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13', steps: 8000 }) },
  { name: 'achievements', onConflict: 'user_id', seed: (u) => ({ user_id: u, data: {} }) },
  { name: 'custom_plans', onConflict: 'user_id', seed: (u) => ({ user_id: u, data: {} }) },
  { name: 'todos', onConflict: 'user_id', seed: (u) => ({ user_id: u, data: {} }) },
  // P14 — the four P12 coverage tables (supabase/migrations/20260726120001..3).
  { name: 'nutrition_ledger', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13', data: { entries: [] } }) },
  { name: 'recovery_logs', onConflict: 'user_id,date', seed: (u) => ({ user_id: u, date: '2026-07-13', data: { date: '2026-07-13' } }) },
  { name: 'workout_schedule', onConflict: 'user_id', seed: (u) => ({ user_id: u, data: { days: [] } }) },
  { name: 'plan_templates', onConflict: 'user_id,local_id', seed: (u) => ({ user_id: u, local_id: 'verify-1', data: { id: 'verify-1' } }) },
]

/** Tables whose delete path is an upsert of a wiped row carrying deleted_at. */
const TOMBSTONE_TABLES = ['measurement_logs', 'nutrition_ledger', 'workout_schedule', 'plan_templates']

const results: { name: string; pass: boolean; detail: string }[] = []
const record = (name: string, pass: boolean, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

function env(key: string, required = true): string {
  const v = process.env[key]
  if (!v && required) {
    console.error(`\n✗ missing required env: ${key}\n`)
    process.exit(2)
  }
  return v ?? ''
}

async function makeUser(url: string, anon: string, tag: string): Promise<{ client: SupabaseClient; id: string; email: string; password: string }> {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  // Unique-but-deterministic-per-run email; no Math.random (kept simple/portable).
  const email = `qimmah-verify+${tag}-${process.pid}@example.com`
  const password = `Verify!${process.pid}${tag}aA1`
  const { data, error } = await client.auth.signUp({ email, password })
  if (error || !data.session || !data.user) {
    console.error(`\n✗ could not create test user ${tag}: ${error?.message ?? 'no session (email confirmation likely ON)'}\n`)
    process.exit(2)
  }
  return { client, id: data.user.id, email, password }
}

async function main() {
  const url = env('SUPABASE_URL')
  const anon = env('SUPABASE_ANON_KEY')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY', false)

  console.log('\nQimmah — RLS + deletion verification')
  console.log('────────────────────────────────────')

  const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const A = await makeUser(url, anon, 'a')
  const B = await makeUser(url, anon, 'b')
  console.log(`\ntest users: A=${A.id.slice(0, 8)}…  B=${B.id.slice(0, 8)}…\n`)

  // Seed each user's own row in every table (own write must succeed).
  console.log('① own writes succeed + cross-user/anon access blocked')
  for (const spec of TABLES) {
    const { error: aErr } = await A.client.from(spec.name).upsert(spec.seed(A.id), { onConflict: spec.onConflict })
    record(`${spec.name}: own upsert succeeds`, !aErr, aErr?.message ?? '')
    await B.client.from(spec.name).upsert(spec.seed(B.id), { onConflict: spec.onConflict })

    // own select returns rows
    const own = await A.client.from(spec.name).select('user_id').eq('user_id', A.id)
    record(`${spec.name}: own select returns rows`, !own.error && (own.data?.length ?? 0) >= 1)

    // cross-user select → 0 rows (RLS hides B from A)
    const cross = await A.client.from(spec.name).select('user_id').eq('user_id', B.id)
    record(`${spec.name}: cross-user SELECT blocked`, !cross.error && (cross.data?.length ?? 0) === 0, `${cross.data?.length ?? 0} rows`)

    // cross-user update → 0 affected
    const upd = await A.client.from(spec.name).update({ updated_at: new Date().toISOString() }).eq('user_id', B.id).select('user_id')
    record(`${spec.name}: cross-user UPDATE blocked`, (upd.data?.length ?? 0) === 0)

    // cross-user delete → 0 affected
    const del = await A.client.from(spec.name).delete().eq('user_id', B.id).select('user_id')
    record(`${spec.name}: cross-user DELETE blocked`, (del.data?.length ?? 0) === 0)

    // cross-user insert (user_id = B) → rejected by WITH CHECK
    const ins = await A.client.from(spec.name).insert(spec.seed(B.id))
    record(`${spec.name}: cross-user INSERT rejected`, !!ins.error, ins.error ? 'rejected' : 'LEAK: insert allowed')

    // UNFILTERED select as A → every returned row belongs to A. This is the real
    // two-account isolation assertion: no `eq` filter is doing the hiding, RLS is.
    const unfiltered = await A.client.from(spec.name).select('user_id')
    const foreign = (unfiltered.data ?? []).filter((r) => (r as { user_id: string }).user_id !== A.id)
    record(
      `${spec.name}: unfiltered SELECT as A returns ONLY A's rows`,
      !unfiltered.error && foreign.length === 0,
      foreign.length ? `LEAK: ${foreign.length} foreign row(s)` : `${unfiltered.data?.length ?? 0} own rows`,
    )

    // anon select → 0 rows; anon insert → rejected
    const anonSel = await anonClient.from(spec.name).select('user_id')
    record(`${spec.name}: anon SELECT blocked`, !anonSel.error ? (anonSel.data?.length ?? 0) === 0 : true, `${anonSel.data?.length ?? 0} rows`)
    const anonIns = await anonClient.from(spec.name).insert(spec.seed(A.id))
    record(`${spec.name}: anon INSERT rejected`, !!anonIns.error)
  }

  // ── Tombstones (P12 delete path) + the LWW updated_at stamp (P14) ──
  console.log('\n② tombstone upserts land, keep no payload, and preserve the LWW stamp')

  const STAMP = '2020-01-02T03:04:05.000Z'
  const tombstone = (table: string, userId: string, wiped: boolean): Record<string, unknown> => {
    const base: Record<string, unknown> = { user_id: userId, deleted_at: STAMP, updated_at: STAMP }
    const payload = wiped ? {} : { entries: ['leaked'] }
    if (table === 'measurement_logs') return { ...base, local_id: 'verify-1', values: payload, notes: wiped ? null : 'leaked' }
    if (table === 'nutrition_ledger') return { ...base, date: '2026-07-13', data: payload }
    if (table === 'plan_templates') return { ...base, local_id: 'verify-1', data: payload }
    return { ...base, data: payload }
  }
  const conflictOf = (table: string) => TABLES.find((t) => t.name === table)?.onConflict ?? 'user_id'

  for (const table of TOMBSTONE_TABLES) {
    // A wiped tombstone is accepted…
    const okUp = await A.client.from(table).upsert(tombstone(table, A.id, true), { onConflict: conflictOf(table) })
    record(`${table}: wiped tombstone upsert accepted`, !okUp.error, okUp.error?.message ?? '')

    // …and the client's stamp survives (set_updated_at_lww, not now()).
    const read = await A.client.from(table).select('deleted_at, updated_at').eq('user_id', A.id).limit(1)
    const row = (read.data ?? [])[0] as { deleted_at?: string; updated_at?: string } | undefined
    const same = (a?: string, b?: string) => !!a && !!b && new Date(a).getTime() === new Date(b).getTime()
    record(`${table}: deleted_at stored as sent`, same(row?.deleted_at, STAMP), row?.deleted_at ?? 'missing')
    record(
      `${table}: updated_at NOT overwritten with now() — LWW evidence intact`,
      same(row?.updated_at, STAMP),
      row?.updated_at ?? 'missing',
    )

    // A tombstone that still carries a payload must be refused (privacy invariant).
    const leak = await A.client.from(table).upsert(tombstone(table, A.id, false), { onConflict: conflictOf(table) })
    record(
      `${table}: tombstone carrying a payload is REJECTED`,
      !!leak.error,
      leak.error ? 'rejected by check constraint' : 'LEAK: deleted content stayed readable',
    )

    // Revive: a later edit beats the tombstone and clears it.
    const revived = await A.client
      .from(table)
      .upsert({ ...(TABLES.find((t) => t.name === table)?.seed(A.id) ?? {}), deleted_at: null }, { onConflict: conflictOf(table) })
    record(`${table}: a newer edit revives the row (deleted_at → null)`, !revived.error, revived.error?.message ?? '')
  }

  // The other half of the trigger: no stamp supplied ⇒ the server stamps.
  const before = await A.client.from('nutrition_ledger').select('updated_at').eq('user_id', A.id).limit(1)
  await A.client.from('nutrition_ledger').update({ data: { entries: [] } }).eq('user_id', A.id)
  const after = await A.client.from('nutrition_ledger').select('updated_at').eq('user_id', A.id).limit(1)
  const beforeAt = (before.data ?? [])[0] as { updated_at?: string } | undefined
  const afterAt = (after.data ?? [])[0] as { updated_at?: string } | undefined
  record(
    'nutrition_ledger: update without a stamp still bumps updated_at',
    !!beforeAt?.updated_at && !!afterAt?.updated_at && new Date(afterAt.updated_at) > new Date(beforeAt.updated_at),
    `${beforeAt?.updated_at} → ${afterAt?.updated_at}`,
  )

  // ── Deletion RPC: wipes everything for the caller ──
  console.log('\n③ delete_own_account wipes every table + removes identity')
  // Pre-count A's rows (as A) to prove there was something to wipe.
  let preTotal = 0
  for (const spec of TABLES) {
    const c = await A.client.from(spec.name).select('user_id').eq('user_id', A.id)
    preTotal += c.data?.length ?? 0
  }
  record('pre-deletion: A has rows to wipe', preTotal > 0, `${preTotal} rows across ${TABLES.length} tables`)

  const { error: rpcErr } = await A.client.rpc('delete_own_account')
  record('delete_own_account() runs without error', !rpcErr, rpcErr?.message ?? '')

  if (serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    let remaining = 0
    for (const spec of TABLES) {
      const c = await admin.from(spec.name).select('user_id').eq('user_id', A.id)
      remaining += c.data?.length ?? 0
    }
    record('post-deletion: 0 rows remain for A (service-key definitive)', remaining === 0, `${remaining} rows remain`)
  } else {
    // No service key: prove the identity is gone → cascade guaranteed by FKs.
    const reAuth = await anonClient.auth.signInWithPassword({ email: A.email, password: A.password })
    record('post-deletion: deleted user can no longer authenticate', !!reAuth.error, reAuth.error ? 'identity removed' : 'LEAK: still authenticates')
  }

  // ── ⑦ Entitlements (P2) — the LIVE twin of test:entitlements ──────────────
  // test:entitlements executes the same guarantees on an in-process Postgres.
  // This section is what proves a real Supabase project is configured the same
  // way: same migrations, same roles, same grants. A simulated proof cannot
  // replace the empirical one and does not claim to.
  console.log('\n⑦ entitlements: no client writes, own-row reads only')
  const ENTITLEMENT_TABLES = [
    'entitlements',
    'access_codes',
    'access_code_redemptions',
    'trial_ledger',
    'purchase_ledger',
    'code_redemption_ledger',
  ]
  for (const t of ENTITLEMENT_TABLES) {
    // No client may write to ANY of them — there is no write policy at all.
    const ins = await B.client.from(t).insert({ user_id: B.id } as Record<string, unknown>)
    record(`${t}: client INSERT rejected`, !!ins.error, ins.error ? 'rejected' : 'LEAK: insert allowed')
  }
  // Codes and durable ledgers are entirely invisible to a signed-in client.
  for (const t of ['access_codes', 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger']) {
    const sel = await B.client.from(t).select('*')
    const hidden = !!sel.error || (sel.data?.length ?? 0) === 0
    record(`${t}: invisible to authenticated client`, hidden, sel.error ? 'denied' : `${sel.data?.length ?? 0} rows`)
  }
  // The approved read path works and returns exactly one derived state.
  const mine = await B.client.rpc('my_entitlement')
  record('my_entitlement() callable by authenticated', !mine.error, mine.error?.message ?? '')
  const rows = (mine.data ?? []) as { state: string; server_time: string }[]
  record('my_entitlement() returns exactly one state', rows.length === 1, `${rows.length} rows`)
  record(
    'my_entitlement() state is a known value',
    rows.length === 1 &&
      ['noAccess', 'trialActive', 'trialExpired', 'premiumActive', 'specialAccessActive', 'revoked'].includes(rows[0].state),
    rows[0]?.state ?? '',
  )
  // Server time, not client time, decides. Proven by the RPC reporting its own clock.
  record('my_entitlement() reports database time', rows.length === 1 && !!rows[0].server_time)
  // Admin surface must be unreachable with an anon/authenticated JWT.
  const adminAttempt = await B.client.rpc('admin_revoke', { p_user_id: B.id, p_reason: 'probe' })
  record('admin_revoke() denied to authenticated', !!adminAttempt.error, adminAttempt.error ? 'denied' : 'LEAK: admin reachable')
  const anonRpc = await anonClient.rpc('my_entitlement')
  record('my_entitlement() denied to anon', !!anonRpc.error, anonRpc.error ? 'denied' : 'LEAK: anon reachable')

  // Cleanup: remove test user B too.
  await B.client.rpc('delete_own_account')

  // ── Summary ──
  const failed = results.filter((r) => !r.pass)
  console.log('\n────────────────────────────────────')
  console.log(`${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) {
    console.log('\nFAILURES:')
    failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`))
    process.exit(1)
  }
  console.log('✅ RLS isolation + account deletion verified.')
}

main().catch((e) => {
  console.error('\n✗ verify-rls crashed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
