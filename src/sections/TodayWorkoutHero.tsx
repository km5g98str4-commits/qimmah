import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { PlanDay } from '@/types/workout'
import { weekdayName } from '@/lib/today'
import { dayTargetMuscles } from '@/lib/muscles'
import { estimateDurationMin, weeklyCompleted, workoutStreak } from '@/lib/workoutStats'
import { lastSession } from '@/lib/workoutSessions'

interface TodayWorkoutHeroProps {
  lang: Lang
  day?: PlanDay
  /** اسم التقسيمة (Split) — اختياري لعرضه كسطر فرعي. */
  splitName?: string
  /** هل اكتمل تمرين اليوم؟ */
  finished?: boolean
  onStart?: () => void
  /** هدف الماء (لتر) لعرض شريحة صغيرة. */
  waterLiters?: number
  /** هدف البروتين (غ) لعرض شريحة صغيرة. */
  proteinG?: number
}

/** بطاقة «تمرينك اليوم» — أول بطاقة مهيمنة بعد الترحيب، بنبرة نشطة وزر واحد واضح. */
export function TodayWorkoutHero({
  lang,
  day,
  splitName,
  finished,
  onStart,
  waterLiters,
  proteinG,
}: TodayWorkoutHeroProps) {
  const t = getStrings(lang).workout
  const weekday = weekdayName(lang === 'en' ? 'en' : 'ar')
  const workoutName = day ? (lang === 'en' ? day.nameEn : day.nameAr) : ''
  const muscles = useMemo(() => dayTargetMuscles(day, lang), [day, lang])
  const duration = useMemo(() => estimateDurationMin(day), [day])
  const exCount = day?.exercises.length ?? 0

  const last = useMemo(() => {
    const s = lastSession()
    if (!s) return null
    const sets = s.exercises.reduce((n, e) => n + (e.sets?.filter((x) => x.completed).length ?? 0), 0)
    return { name: s.workoutDayName, sets }
  }, [])

  const streak = useMemo(() => workoutStreak(), [])
  const week = useMemo(() => weeklyCompleted(), [])

  if (!day) return null

  return (
    <div className="card relative overflow-hidden p-6 sm:p-7">
      {/* وهج خلفي خفيف للإحساس النشط */}
      <div className="pointer-events-none absolute -top-16 -end-16 h-48 w-48 rounded-full bg-primary-soft blur-3xl" aria-hidden />

      <div className="relative">
        <span className="eyebrow">
          <Icon name="Flame" className="h-3.5 w-3.5" />
          {t.heroReady}
        </span>

        {/* اليوم — اسم التمرين */}
        <h2 className="mt-3 text-2xl font-black leading-tight text-ink-900 sm:text-3xl">
          {weekday} — {workoutName}
        </h2>
        {splitName && <p className="mt-1 text-sm font-bold text-primary-c">{splitName}</p>}

        {/* العضلات المستهدفة */}
        {muscles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {muscles.map((m) => (
              <span key={m} className="rounded-full bg-beige px-2.5 py-1 text-xs font-bold text-ink-700">
                {m}
              </span>
            ))}
          </div>
        )}

        {/* المدة + عدد التمارين */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <HeroStat icon="Clock" value={`${duration}`} label={t.minShort} />
          <HeroStat icon="Dumbbell" value={`${exCount}`} label={t.exercisesCount} />
        </div>

        {/* ملخّص آخر تمرين */}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-500">
          <Icon name="RotateCcw" className="h-3.5 w-3.5 shrink-0" />
          {last ? `${t.lastWorkout}: ${last.name} · ${last.sets} ${t.setsDone}` : t.noLastWorkout}
        </p>

        {/* زر البدء الكبير */}
        <div className="mt-5">
          {finished ? (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-primary-soft px-5 py-3.5 text-base font-bold text-primary-c">
              <Icon name="CheckCircle2" className="h-5 w-5" />
              {t.completedToday}
            </span>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="btn-primary w-full py-4 text-base sm:w-auto sm:px-8"
            >
              <Icon name="Play" className="h-5 w-5" />
              {t.startToday}
            </button>
          )}
        </div>

        {/* معلومات ثانوية: سلسلة + الأسبوع + شرائح ماء/بروتين */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Chip icon="Flame" text={`${streak} ${t.streakDays}`} highlight={streak > 0} />
          <Chip icon="CalendarDays" text={`${t.weekDone}: ${week}`} />
          {typeof proteinG === 'number' && <Chip icon="Salad" text={`${proteinG}غ`} />}
          {typeof waterLiters === 'number' && <Chip icon="Droplets" text={`${waterLiters} ${lang === 'en' ? 'L' : 'لتر'}`} />}
        </div>
      </div>
    </div>
  )
}

function HeroStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3.5 py-2">
      <Icon name={icon} className="h-4 w-4 text-primary-c" />
      <span className="text-sm font-black text-ink-900">{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  )
}

function Chip({ icon, text, highlight }: { icon: string; text: string; highlight?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        highlight ? 'bg-primary-soft text-primary-c' : 'bg-beige text-ink-500',
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {text}
    </span>
  )
}
