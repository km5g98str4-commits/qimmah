// Profile v2 model — Qimmah Design v2.1 (Slice 7, §06). Read-only training
// identity from real local/auth state. Honest: no fabricated numbers. Workout
// count / streak / PRs / commitment come from the REAL stores (workout sessions,
// streaks, exercise history). Qimmah+ is an informational quiet line only — no
// real subscription. Delete / account actions route to the existing safe
// Settings flow (never reimplemented).

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { goalWordingFor } from '@/i18n/dict/onboardingIntent'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'
import { type V2Level } from '@/lib/onboardingV2Flow'
import { LEVEL_WHEN_UNKNOWN, declaredTrainingLevel } from '@/lib/declaredGoalWording'
import { workoutCounts } from '@/lib/progressStats'
import { workoutStreak } from '@/lib/streaks'
import { loadSessions } from '@/lib/workoutSessions'
import { loadAchievementState } from '@/features/achievements/engine'

/**
 * [CTO-65] البند ٥ — أُزيلت خريطة المصطلحات الثابتة.
 *
 * كانت `GOAL_AR = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }` تُعرض لكل
 * مستخدم مهما كان مستواه، فيرى المبتدئ الذي اختار «خسارة دهون» كلمةَ «تنشيف» في
 * ملفه وفي عنوان برنامجه. الصياغة الآن تتبع المستوى عبر `goalWordingFor` —
 * نفس مصدر صياغة الأهداف في الإعداد، فلا مصدرا تسمية متناقضان.
 */

// Program template length per goal (weeks). A product/plan default — NOT
// fabricated user data — mirroring the standard تنشيف/محافظة/تضخيم block lengths.
const PROGRAM_WEEKS: Record<CalorieGoal, number> = { cut: 8, maintain: 12, bulk: 12 }

/** How many recent weeks the commitment heatmap shows (§06: «آخر 10 أسابيع»). */
export const COMMITMENT_WEEKS = 10

const DAY_MS = 86400000
const WEEK_START_DAY = 6 // Saturday — the Gulf week start (matches streaks.ts).

export interface AuthSummary { displayName: string | null; email: string | null; signedIn: boolean }

/** One commitment-heatmap cell: a week bucket with a 0–3 intensity level. */
export interface CommitmentWeek {
  /** Finished workouts logged that week. */
  count: number
  /** 0 = none, 1 = light, 2 = on-track, 3 = at/above target. */
  level: 0 | 1 | 2 | 3
}

export interface ProfileV2Model {
  user: { displayName: string; initials: string; email: string | null; signedIn: boolean }
  trainingIdentity: { goal: CalorieGoal | null; goalLabel: string | null; planTitle: string; trainingDaysPerWeek: number | null; onboarded: boolean }
  stats: { workoutCount: number; streakDays: number; prCount: number; hasData: boolean }
  /** Program status card — real days/week; week derived from first logged session. */
  program: { title: string; weekOf: number; totalWeeks: number; daysPerWeek: number | null; onboarded: boolean }
  /** Commitment heatmap — last COMMITMENT_WEEKS weeks, oldest → newest. */
  commitment: { weeks: CommitmentWeek[]; hasData: boolean }
  body: { weightKg: number | null; targetKg: number | null }
  privacy: { usageEventsLocalOnly: boolean; healthSharingAvailable: boolean; dataExportAvailable: boolean; deleteAccountAvailable: boolean }
  settings: { language: string; units: string; numerals: string; appearance: string; remindersAvailable: boolean }
  subscription: { showQuietLine: boolean; text: string; cta: string; enabled: boolean }
}

function initialsOf(name: string | null, ar: boolean): string {
  const n = (name ?? '').trim()
  if (!n) return ar ? 'ق' : 'Q'
  const parts = n.split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Local-midnight Date from a `YYYY-MM-DD` day stamp (safe against bad input). */
function parseDay(stamp: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Saturday-anchored start of the week containing `d` (local midnight). */
function startOfWeek(d: Date): Date {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (base.getDay() - WEEK_START_DAY + 7) % 7
  base.setDate(base.getDate() - diff)
  return base
}

/** Whole weeks between two week-start dates. */
function weeksBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (7 * DAY_MS)))
}

/** Current program week from the first finished session (real), clamped to length. */
function weekOfProgram(finishedDates: string[], totalWeeks: number, now: Date): number {
  if (finishedDates.length === 0) return 1
  const first = finishedDates.reduce((a, b) => (a < b ? a : b))
  const start = parseDay(first)
  if (!start) return 1
  const elapsed = weeksBetween(startOfWeek(start), startOfWeek(now))
  return Math.min(Math.max(elapsed + 1, 1), totalWeeks)
}

/** Last COMMITMENT_WEEKS weekly buckets (oldest → newest) from real sessions. */
function commitmentWeeks(finishedDates: string[], daysPerWeek: number | null, now: Date): CommitmentWeek[] {
  const target = Math.max(1, daysPerWeek ?? 3)
  const thisWeekStart = startOfWeek(now).getTime()
  // Count finished sessions per week offset (0 = current week … N-1 = oldest).
  const counts = new Array<number>(COMMITMENT_WEEKS).fill(0)
  for (const stamp of finishedDates) {
    const d = parseDay(stamp)
    if (!d) continue
    const offset = Math.round((thisWeekStart - startOfWeek(d).getTime()) / (7 * DAY_MS))
    if (offset >= 0 && offset < COMMITMENT_WEEKS) counts[offset] += 1
  }
  // Oldest → newest so RTL reads right (oldest) → left (newest).
  return counts
    .slice()
    .reverse()
    .map((count) => {
      const ratio = count / target
      const level: CommitmentWeek['level'] = count === 0 ? 0 : ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1
      return { count, level }
    })
}

export function buildProfileV2Model(customization: Customization, auth: AuthSummary, lang: Lang): ProfileV2Model {
  const ar = lang !== 'en'
  const goal = customization.profile.goal ?? null
  const onb = loadOnboardingProfile()
  const onboarded = onb !== null
  const daysPerWeek = onb?.trainingPreferences?.daysPerWeek ?? null
  /**
   * [CTO-65] البند ٥ — المستوى **المُعلَن** لا قيمة افتراضية.
   *
   * ⚠️ فخّان مقيسان يجعلان المصدر الخطأ يبدو صحيحًا:
   *   • `defaultProfile.trainingLevel = 'intermediate'` — فقراءة
   *     `customization.profile.trainingLevel` تُلبِس **كل** مستخدم صياغةَ المتوسط
   *     حتى قبل أن يُجيب شيئًا.
   *   • `toLegacyProfile` يسقط على نفس الافتراضي حين لا تُحفظ خبرة، فحتى شرط
   *     «أكمل الإعداد» لا يكفي وحده.
   * لذلك نقرأ **الإجابة المحفوظة نفسها** (`trainingPreferences.experience`) عبر
   * `v2LevelFromExperience`، وهي وحدها التي تعيد `null` حين لا إجابة.
   *
   * ولا نمرّر `null` إلى `goalWordingFor`: توقيعها `level ?? 'intermediate'`
   * يسقط صامتًا على المتوسط — وهو بالضبط ما نتجنّبه (انظر `LEVEL_WHEN_UNKNOWN`).
   *
   * [CTO-67] البند ٤: المنطق نفسه انتقل إلى `lib/declaredGoalWording` ليستهلكه
   * **كل** سطح يعرض اسم الهدف (الملف الشخصي · معاينة الخطة · المراجعة) — نسخة
   * ثانية منه هنا كانت ستصنع مصدرَي تسمية، وهو أصل العطب لا علاجه.
   */
  const declaredLevel: V2Level | null = declaredTrainingLevel()
  const wording = goalWordingFor(lang, declaredLevel ?? LEVEL_WHEN_UNKNOWN)

  // ——— REAL training data (honest, never invented) ———
  const now = new Date()
  const finishedDates = loadSessions()
    .filter((s) => s.finishedAt)
    .map((s) => s.date)
  const workoutCount = workoutCounts().total
  const streakDays = workoutStreak(now)
  // A best weight is only a baseline; the achievements engine increments this
  // counter only when a finished workout actually beats a previous result.
  const prCount = loadAchievementState().prCount
  const hasData = workoutCount > 0

  const totalWeeks = goal ? PROGRAM_WEEKS[goal] : PROGRAM_WEEKS.maintain
  const weeks = commitmentWeeks(finishedDates, daysPerWeek, now)

  return {
    user: {
      displayName: auth.displayName || (ar ? 'ضيف قِمّة' : 'Qimmah guest'),
      initials: initialsOf(auth.displayName, ar),
      email: auth.signedIn ? auth.email : null,
      signedIn: auth.signedIn,
    },
    trainingIdentity: {
      goal,
      goalLabel: goal ? wording[goal].label : null,
      // `programTitle` اسم مستقلّ من القاموس لا تركيب على `label`: تركيب
      // «برنامج {label}» يعطي «برنامج ثبات وتحسين عام» — جملة لا عنوان.
      planTitle: goal ? wording[goal].programTitle : ar ? 'خطتك' : 'Your plan',
      trainingDaysPerWeek: daysPerWeek,
      onboarded,
    },
    stats: { workoutCount, streakDays, prCount, hasData },
    program: {
      title: goal ? wording[goal].programTitle : ar ? 'خطتك' : 'Your plan',
      weekOf: weekOfProgram(finishedDates, totalWeeks, now),
      totalWeeks,
      daysPerWeek,
      onboarded,
    },
    commitment: { weeks, hasData: finishedDates.length > 0 },
    body: { weightKg: customization.profile.weightKg || null, targetKg: customization.profile.targetWeightKg || null },
    privacy: {
      // [CTO-71] البند ١: لم تعد هناك طبقة قادرة على الإرسال. الأحداث محلية حصرًا.
      usageEventsLocalOnly: true,
      healthSharingAvailable: false, // no HealthKit integration yet — honest
      dataExportAvailable: true,
      // [CTO-65] البند ١: التعليق السابق ادّعى «routes to the existing safe Settings
      // flow» ولم يكن لذلك المسار وجود — الزرّ يحوّل إلى الإعدادات وليس فيها حذف.
      // صار الادّعاء صحيحًا: صفّ الحذف + نافذة التأكيد المكتوب في SettingsView.
      deleteAccountAvailable: true, // routes to the delete-account row in SettingsView
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
      // §06 quiet line — one calm line, honest framing, no fake scarcity.
      text: ar ? 'قِمّة+ · خطط وتحليلات أعمق' : 'Qimmah+ · deeper plans & insights',
      cta: ar ? 'اعرف المزيد' : 'Learn more',
      enabled: false, // no real subscription — informational only
    },
  }
}
