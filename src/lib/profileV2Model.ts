// Profile v2 model — Qimmah Design v2.1 (Slice 7). Read-only training identity
// from real local/auth state. Honest: no fake workout counts, PRs, or streaks;
// no real subscription (Qimmah+ is an informational quiet line only). Delete /
// account actions route to the existing safe Settings flow (never reimplemented).

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

const WORKOUT_SUMMARY_KEY = 'qimmah:workout-summary:v2'
const GOAL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }

export interface AuthSummary { displayName: string | null; email: string | null; signedIn: boolean }

export interface ProfileV2Model {
  user: { displayName: string; initials: string; email: string | null; signedIn: boolean }
  trainingIdentity: { goal: CalorieGoal | null; goalLabel: string | null; planTitle: string; trainingDaysPerWeek: number | null; onboarded: boolean }
  stats: { workoutCount: number; streakDays: number; prCount: number; hasData: boolean }
  body: { weightKg: number | null; targetKg: number | null }
  privacy: { analyticsAnonymousEnabled: boolean; healthSharingAvailable: boolean; dataExportAvailable: boolean; deleteAccountAvailable: boolean }
  settings: { language: string; units: string; numerals: string; appearance: string; remindersAvailable: boolean }
  subscription: { showQuietLine: boolean; label: string; reason: string; enabled: boolean }
}

function initialsOf(name: string | null, ar: boolean): string {
  const n = (name ?? '').trim()
  if (!n) return ar ? 'ق' : 'Q'
  const parts = n.split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
function hasWorkoutSummary(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!localStorage.getItem(WORKOUT_SUMMARY_KEY)
  } catch {
    return false
  }
}

export function buildProfileV2Model(customization: Customization, auth: AuthSummary, lang: Lang): ProfileV2Model {
  const ar = lang !== 'en'
  const goal = customization.profile.goal ?? null
  const onb = loadOnboardingProfile()
  const onboarded = onb !== null
  const daysPerWeek = onb?.trainingPreferences?.daysPerWeek ?? null
  const goalWord = goal === 'cut' ? (ar ? 'التنشيف' : 'Cut') : goal === 'bulk' ? (ar ? 'التضخيم' : 'Bulk') : goal === 'maintain' ? (ar ? 'المحافظة' : 'Maintain') : ''

  const hasWorkout = hasWorkoutSummary()

  return {
    user: {
      displayName: auth.displayName || (ar ? 'ضيف قِمّة' : 'Qimmah guest'),
      initials: initialsOf(auth.displayName, ar),
      email: auth.signedIn ? auth.email : null,
      signedIn: auth.signedIn,
    },
    trainingIdentity: {
      goal,
      goalLabel: goal ? GOAL_AR[goal] : null,
      planTitle: goalWord ? (ar ? `برنامج ${goalWord}` : `${goalWord} program`) : ar ? 'خطتك' : 'Your plan',
      trainingDaysPerWeek: daysPerWeek,
      onboarded,
    },
    // Honest: only a local single-session summary can exist yet — never invent counts/PRs/streaks.
    stats: { workoutCount: hasWorkout ? 1 : 0, streakDays: 0, prCount: 0, hasData: hasWorkout },
    body: { weightKg: customization.profile.weightKg || null, targetKg: customization.profile.targetWeightKg || null },
    privacy: {
      analyticsAnonymousEnabled: true, // anonymous, consent-based (existing disclosure)
      healthSharingAvailable: false, // no HealthKit integration yet — honest
      dataExportAvailable: false, // no export built yet — honest disabled
      deleteAccountAvailable: true, // routes to the existing safe Settings flow
    },
    settings: {
      language: ar ? 'العربية' : 'English',
      units: ar ? 'كجم · سم' : 'kg · cm',
      numerals: ar ? '١٢٣٤' : '1234',
      appearance: ar ? 'داكن' : 'Dark',
      remindersAvailable: true,
    },
    subscription: {
      showQuietLine: true,
      label: ar ? 'قِمّة+ · خطط وتحليلات أعمق' : 'Qimmah+ · deeper plans & insights',
      reason: ar ? 'اعرف المزيد' : 'Learn more',
      enabled: false, // no real subscription — informational only
    },
  }
}
