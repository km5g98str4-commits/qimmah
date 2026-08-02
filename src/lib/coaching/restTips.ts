// Rest-period tip picker — pure + deterministic.
//
// Picks a tip matching the current exercise's muscle group, never repeating
// within a session until the matching pool is exhausted, and fully reproducible
// given the same (muscle, seed, shown) inputs. No side effects, no storage —
// the caller (Active Workout) tracks the per-session `shown` list in component
// state, so a session's tips reset naturally when the workout ends.
import type { Muscle } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { REST_TIPS } from '@/data/coaching/restTips'
import type { Localized, RestTip } from './types'
import { hashStr } from './hash'

/** The tip text in `lang`. Arabic is the default so existing callers are unaffected. */
export function restTipText(tip: RestTip, lang: Lang = 'ar'): string {
  return lang === 'en' ? tip.textEn : tip.textAr
}

/**
 * Choose the next rest tip for `muscle`, avoiding any id in `shown`.
 * - Prefers tips whose `muscles` include the current muscle; if none match,
 *   falls back to the full set so a rest period always has a line.
 * - No-repeat within the session: excludes `shown`; when the pool is exhausted
 *   it resets (allowing a fresh cycle) rather than returning null.
 * - Deterministic: same (muscle, seed, shown) → same tip.
 *
 * `lang` only resolves the added `text` field — it never changes WHICH tip is
 * picked, so selection stays reproducible across languages. Omitting it keeps the
 * previous behaviour exactly: the returned object still carries `textAr`.
 */
export function pickRestTip(
  muscle: Muscle,
  seed: number,
  shown: readonly string[] = [],
  lang: Lang = 'ar',
): Localized<RestTip, 'text'> | null {
  if (REST_TIPS.length === 0) return null
  const matched = REST_TIPS.filter((t) => t.muscles.includes(muscle))
  const candidates = matched.length > 0 ? matched : REST_TIPS
  const fresh = candidates.filter((t) => !shown.includes(t.id))
  const pool = fresh.length > 0 ? fresh : candidates
  const idx = hashStr(`${seed}|${muscle}|${[...shown].sort().join(',')}`) % pool.length
  const tip = pool[idx]
  return { ...tip, text: restTipText(tip, lang) }
}
