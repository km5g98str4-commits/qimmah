// Fail-closed environment contract for the offline browser harness.
// This module is deliberately dependency-free so it can run before Playwright,
// a browser process, a build, a preview server, or any network request exists.
export const PRODUCTION_REFS = Object.freeze(['ledlypcyrtnzvjvhykwz'])
export const STAGING_REFS = Object.freeze(['odpkvswfiihrkglgfghd'])

export function inspectOfflineHarnessEnv(env = process.env) {
  const targetEnv = String(env.QIMMAH_OFFLINE_TARGET_ENV ?? '').trim()
  const targetUrl = String(env.VITE_SUPABASE_URL ?? '').trim()
  const combined = Object.values(env).filter((value) => typeof value === 'string').join('\n')

  if (PRODUCTION_REFS.some((ref) => combined.includes(ref))) {
    return { ok: false, code: 'production_ref_denied' }
  }
  if (targetEnv !== 'local' && targetEnv !== 'staging') {
    return { ok: false, code: 'safe_environment_required' }
  }
  if (targetEnv === 'local' && targetUrl) {
    return { ok: false, code: 'local_target_must_be_disconnected' }
  }
  if (targetEnv === 'staging' && !STAGING_REFS.some((ref) => targetUrl.includes(`${ref}.supabase.co`))) {
    return { ok: false, code: 'staging_ref_not_allowlisted' }
  }
  return { ok: true, code: 'safe_target_confirmed', targetEnv }
}

export function assertOfflineHarnessEnv(env = process.env) {
  const result = inspectOfflineHarnessEnv(env)
  if (!result.ok) throw new Error(`OFFLINE_HARNESS_REFUSED:${result.code}`)
  return result
}
