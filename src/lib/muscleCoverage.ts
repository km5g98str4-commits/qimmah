// حاسبة التغطية العضلية الأسبوعية + تحلّل التعافي (Qimmah — هوية كمال الأجسام).
//
// المدخلات: جلسات التمرين، خطة التمرين، خريطة العضلات للتمارين، التاريخ الحالي.
// المخرجات: تغطية كل عضلة (مجموعات/تمارين/آخر تمرين/شدّة/حالة) + النواقص + الإفراط + توصيات عربية.
//
// القواعد:
// - كل مجموعة منجزة تُضيف 1.0 للعضلة الأساسية و0.5 للثانوية.
// - تحلّل التعافي: 0–24س طازج، 24–48س يتعافى، 48–72س جاهز، 72س+ ناقص إن قلّت المجموعات.
// - الهدف الأسبوعي: كبيرة 8–16، صغيرة 6–12 — يُعدَّل حسب مستوى التدريب.

import type { MuscleId, MuscleStatus, MuscleCoverage, WeeklyCoverageResult } from '@/types/muscles'
import type { WorkoutPlan } from '@/types/workout'
import type { TrainingLevel } from '@/types/profile'
import type { Lang } from '@/lib/appPreferences'
import type { WorkoutSession } from './workoutSessions'
import { muscleGroups, muscleMap, muscleGroupLabel } from '@/data/muscleGroups'
import { getExercise } from '@/data/exercises'
import { muscleCoverageStrings } from '@/i18n/dict/muscleCoverage'

/** التوصيات ثنائية اللغة (P12) — بالعربية والإنجليزية معًا. */
export interface LocalizedRecommendations {
  ar: string[]
  en: string[]
}

/** نتيجة التغطية مع توصيات ثنائية اللغة — recommendationsAr تبقى للتوافق مع المستهلكين الحاليين. */
export interface WeeklyCoverageResultLocalized extends WeeklyCoverageResult {
  recommendations: LocalizedRecommendations
}

const HOUR = 3600_000
const WEEK_MS = 7 * 24 * HOUR

interface CoverageInput {
  sessions: WorkoutSession[]
  plan?: WorkoutPlan
  level?: TrainingLevel
  /** التاريخ الحالي (افتراضيًا الآن) — قابل للحقن للاختبار/محاكاة الزمن. */
  now?: Date
}

/** الهدف المعدَّل حسب المستوى: مبتدئ → الحد الأدنى، متقدم → الأعلى، متوسط → المنتصف. */
function levelTarget(min: number, max: number, level: TrainingLevel): number {
  if (level === 'beginner') return min
  if (level === 'advanced') return max
  return Math.round((min + max) / 2)
}

/** الهدف الأسبوعي المعدَّل (بالمجموعات) لعضلة واحدة حسب المستوى — للاستخدام في الواجهة. */
export function weeklyTargetFor(muscleId: MuscleId, level: TrainingLevel = 'intermediate'): number {
  const mg = muscleMap[muscleId]
  if (!mg) return 0
  return levelTarget(mg.weeklyTarget.min, mg.weeklyTarget.max, level)
}

/** ساعات منذ آخر تمرين. */
function hoursSince(iso: string | undefined, now: number): number {
  if (!iso) return Infinity
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Infinity
  return (now - t) / HOUR
}

/** أفضل ختم زمني للجلسة (انتهاء ← بدء ← التاريخ). */
function sessionTime(s: WorkoutSession): string {
  return s.finishedAt ?? s.startedAt ?? `${s.date}T12:00:00`
}

/** عدد المجموعات المنجزة في تمرين الجلسة (مع توافق البيانات القديمة). */
function completedSetCount(ex: WorkoutSession['exercises'][number]): number {
  if (ex.sets && ex.sets.length) return ex.sets.filter((st) => st.completed).length
  // توافق قديم: لا توجد مجموعات مفصّلة — احسب الأهداف إن اكتمل التمرين
  if (ex.completed) return ex.targetSets || 0
  return 0
}

/** يحسب التغطية الأسبوعية الكاملة لكل العضلات. */
export function computeWeeklyCoverage(input: CoverageInput): WeeklyCoverageResultLocalized {
  const now = (input.now ?? new Date()).getTime()
  const level = input.level ?? 'intermediate'
  const windowStart = now - WEEK_MS

  // تجميع: مجموعات مرجّحة + آخر تمرين + التمارين الفريدة لكل عضلة
  const acc: Record<string, { sets: number; lastAt?: string; exIds: Set<string> }> = {}
  const ensure = (id: MuscleId) => (acc[id] ??= { sets: 0, exIds: new Set() })

  input.sessions
    .filter((s) => {
      const t = new Date(sessionTime(s)).getTime()
      return !Number.isNaN(t) && t >= windowStart && t <= now
    })
    .forEach((s) => {
      const when = sessionTime(s)
      s.exercises.forEach((se) => {
        const setCount = completedSetCount(se)
        if (setCount <= 0) return
        const lib = getExercise(se.exerciseId)
        const primary = lib?.primaryMusclesDetailed ?? []
        const secondary = lib?.secondaryMusclesDetailed ?? []
        primary.forEach((m) => {
          const a = ensure(m)
          a.sets += setCount * 1.0
          a.exIds.add(se.exerciseId)
          if (!a.lastAt || when > a.lastAt) a.lastAt = when
        })
        secondary.forEach((m) => {
          const a = ensure(m)
          a.sets += setCount * 0.5
          a.exIds.add(se.exerciseId)
          if (!a.lastAt || when > a.lastAt) a.lastAt = when
        })
      })
    })

  // العضلات التي تستهدفها الخطة (لتحديد النواقص بدقّة)
  const plannedMuscles = plannedMuscleSet(input.plan)

  const weeklyCoverage: Record<string, MuscleCoverage> = {}
  const missingMuscles: MuscleId[] = []
  const overtrainedMuscles: MuscleId[] = []

  muscleGroups.forEach((mg) => {
    const a = acc[mg.id] ?? { sets: 0, exIds: new Set<string>() }
    const target = levelTarget(mg.weeklyTarget.min, mg.weeklyTarget.max, level)
    const intensity = target > 0 ? Math.min(1, a.sets / target) : 0
    const hrs = hoursSince(a.lastAt, now)
    const status = deriveStatus(a.sets, hrs, target)

    weeklyCoverage[mg.id] = {
      muscleId: mg.id,
      sets: Math.round(a.sets * 10) / 10,
      exercises: a.exIds.size,
      lastTrainedAt: a.lastAt,
      intensity: Math.round(intensity * 100) / 100,
      status,
    }

    if (a.sets <= 0) {
      // ناقص فعليًا: إمّا أنه ضمن الخطة ولم يُمرّن، أو عضلة كبيرة بلا خطة
      if (plannedMuscles.size === 0 ? mg.size === 'large' : plannedMuscles.has(mg.id)) {
        missingMuscles.push(mg.id)
      }
    }
    if (a.sets > mg.weeklyTarget.max * 1.25) overtrainedMuscles.push(mg.id)
  })

  const recommendations = buildRecommendations(weeklyCoverage, missingMuscles, overtrainedMuscles, now)

  return {
    weeklyCoverage,
    missingMuscles,
    overtrainedMuscles,
    recommendations,
    // توافق: المستهلكون الحاليون يقرأون recommendationsAr — مشتقة من البنية الجديدة.
    recommendationsAr: recommendations.ar,
  }
}

/** يستخرج العضلات التي تلمسها الخطة (أساسية + ثانوية). */
function plannedMuscleSet(plan?: WorkoutPlan): Set<MuscleId> {
  const set = new Set<MuscleId>()
  if (!plan) return set
  plan.days.forEach((d) =>
    d.exercises.forEach((pe) => {
      const lib = getExercise(pe.exerciseId)
      lib?.primaryMusclesDetailed.forEach((m) => set.add(m))
      lib?.secondaryMusclesDetailed.forEach((m) => set.add(m))
    }),
  )
  return set
}

/** يحدّد حالة العضلة من المجموعات + ساعات منذ آخر تمرين + الهدف. */
function deriveStatus(sets: number, hrs: number, target: number): MuscleStatus {
  if (sets <= 0) return 'undertrained'
  if (hrs < 24) return 'fresh'
  if (hrs < 48) return 'recovering'
  if (hrs < 72) return 'ready'
  // 72 ساعة فأكثر: تعافت تمامًا — جاهزة، إلا إن كان الحجم الأسبوعي أقل من نصف الهدف
  return sets < target * 0.5 ? 'undertrained' : 'ready'
}

/** يملأ قالب توصية بأسماء العضلات بلغة محددة. */
function fillTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '')
}

/** يبني توصيات موجزة ثنائية اللغة (P12) بناءً على التغطية — القوالب من i18n/dict/muscleCoverage. */
function buildRecommendations(
  coverage: Record<string, MuscleCoverage>,
  missing: MuscleId[],
  overtrained: MuscleId[],
  now: number,
): LocalizedRecommendations {
  const recs: LocalizedRecommendations = { ar: [], en: [] }
  const langs: Lang[] = ['ar', 'en']
  const push = (build: (lang: Lang) => string) => {
    langs.forEach((lang) => recs[lang].push(build(lang)))
  }
  const joinNames = (ids: MuscleId[], lang: Lang) =>
    ids.map((id) => muscleGroupLabel(id, lang)).join(muscleCoverageStrings[lang].listSeparator)

  // 1) أبرز عضلة ناقصة
  if (missing.length) {
    const key = missing.length > 1 ? 'missingMultiple' : 'missingSingle'
    push((lang) => fillTemplate(muscleCoverageStrings[lang][key], { muscles: joinNames(missing.slice(0, 3), lang) }))
  }

  // 2) عضلة تحتاج راحة اليوم (تُمرّنت خلال أقل من 48 ساعة)
  const needRest = muscleGroups
    .map((m) => coverage[m.id])
    .filter((c) => c && (c.status === 'fresh' || c.status === 'recovering'))
    .sort((a, b) => hoursSince(a.lastTrainedAt, now) - hoursSince(b.lastTrainedAt, now))[0]
  if (needRest) {
    push((lang) => fillTemplate(muscleCoverageStrings[lang].needsRest, { muscle: muscleGroupLabel(needRest.muscleId, lang) }))
  }

  // 3) إفراط
  if (overtrained.length) {
    push((lang) => fillTemplate(muscleCoverageStrings[lang].overtrained, { muscles: joinNames(overtrained.slice(0, 2), lang) }))
  }

  // 4) عضلة جاهزة للتمرين (تعافت)
  if (recs.ar.length < 2) {
    const ready = muscleGroups
      .map((m) => coverage[m.id])
      .find((c) => c && c.status === 'ready' && c.sets > 0)
    if (ready) {
      push((lang) => fillTemplate(muscleCoverageStrings[lang].readyToTrain, { muscle: muscleGroupLabel(ready.muscleId, lang) }))
    }
  }

  return recs
}

/** تصنيف العضلات حسب الحالة — لملخّص اللوحة. */
export function summarizeCoverage(result: WeeklyCoverageResult) {
  const list = muscleGroups.map((m) => result.weeklyCoverage[m.id]).filter(Boolean)
  const complete = list.filter((c) => c.status === 'trained' || (c.status === 'ready' && c.sets > 0) || c.status === 'fresh' || c.status === 'recovering')
  const needRecovery = list.filter((c) => c.status === 'fresh' || c.status === 'recovering')
  const undertrained = list.filter((c) => c.status === 'undertrained')
  return {
    completeCount: complete.length,
    undertrainedCount: undertrained.length,
    needRecoveryCount: needRecovery.length,
  }
}
