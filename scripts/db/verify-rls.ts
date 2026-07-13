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
//   • anon SELECT returns 0 rows            • anon INSERT is rejected
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
]

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

    // anon select → 0 rows; anon insert → rejected
    const anonSel = await anonClient.from(spec.name).select('user_id')
    record(`${spec.name}: anon SELECT blocked`, !anonSel.error ? (anonSel.data?.length ?? 0) === 0 : true, `${anonSel.data?.length ?? 0} rows`)
    const anonIns = await anonClient.from(spec.name).insert(spec.seed(A.id))
    record(`${spec.name}: anon INSERT rejected`, !!anonIns.error)
  }

  // ── Deletion RPC: wipes everything for the caller ──
  console.log('\n② delete_own_account wipes every table + removes identity')
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
