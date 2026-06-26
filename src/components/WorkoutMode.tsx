import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { PlanDay } from '@/types/workout'
import { exerciseDisplayName, planExerciseName, planExerciseVideo } from '@/lib/workoutPlan'
import { getAlternatives, getExercise } from '@/data/exercises'
import { getRecord } from '@/lib/exerciseHistory'
import { getDayStamp } from '@/lib/today'
import type { Difficulty, WorkoutSession } from '@/lib/workoutSessions'

interface WorkoutModeProps {
  lang: Lang
  day: PlanDay
  onClose: () => void
  onFinish: (session: WorkoutSession) => void
}

interface ExState {
  completed: boolean
  weight: string
  repsDone: string
  difficulty?: Difficulty
  painNote: string
  notes: string
}

/** وضع التمرين — تجربة مركّزة لإكمال جلسة كاملة داخل النادي. */
export function WorkoutMode({ lang, day, onClose, onFinish }: WorkoutModeProps) {
  const t = getStrings(lang).workout
  const [startedAt] = useState(() => new Date().toISOString())
  const [openAlt, setOpenAlt] = useState<string | null>(null)

  const [state, setState] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {}
    day.exercises.forEach((pe) => {
      const rec = getRecord(pe.exerciseId)
      init[pe.id] = {
        completed: false,
        weight: rec?.lastWeight ?? pe.startingWeight ?? '',
        repsDone: '',
        painNote: '',
        notes: pe.notes ?? '',
      }
    })
    return init
  })

  // مؤقّت الراحة (واحد نشط)
  const [timer, setTimer] = useState<{ exId: string | null; left: number; running: boolean }>({
    exId: null,
    left: 0,
    running: false,
  })
  useEffect(() => {
    if (!timer.running) return
    if (timer.left <= 0) {
      setTimer((p) => ({ ...p, running: false }))
      return
    }
    const id = window.setTimeout(() => setTimer((p) => ({ ...p, left: p.left - 1 })), 1000)
    return () => window.clearTimeout(id)
  }, [timer.running, timer.left])

  const set = (id: string, partial: Partial<ExState>) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }))

  const done = day.exercises.filter((pe) => state[pe.id]?.completed).length
  const total = day.exercises.length

  const startRest = (exId: string, sec: number) =>
    setTimer({ exId, left: sec > 0 ? sec : 60, running: true })

  const dayName = lang === 'en' ? day.nameEn : day.nameAr

  const finish = () => {
    if (done < total && !window.confirm(t.confirmUnfinished)) return
    const session: WorkoutSession = {
      id: `session-${startedAt}`,
      date: getDayStamp(),
      startedAt,
      finishedAt: new Date().toISOString(),
      workoutDayId: day.id,
      workoutDayName: dayName,
      exercises: day.exercises.map((pe) => {
        const s = state[pe.id]
        const ex = getExercise(pe.exerciseId)
        return {
          exerciseId: pe.exerciseId,
          exerciseNameAr: ex?.nameAr,
          exerciseNameEn: ex?.nameEn,
          targetSets: pe.sets,
          targetReps: pe.reps,
          targetRestSec: pe.restSec,
          completed: s.completed,
          weight: s.weight,
          repsDone: s.repsDone,
          difficulty: s.difficulty,
          painNote: s.painNote,
          notes: s.notes,
        }
      }),
    }
    onFinish(session)
  }

  const difficulties: { value: Difficulty; label: string }[] = useMemo(
    () => [
      { value: 'easy', label: t.easy },
      { value: 'medium', label: t.medium },
      { value: 'hard', label: t.hard },
    ],
    [t],
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      {/* رأس ثابت */}
      <header className="sticky top-0 z-10 glass border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink-700">
            <Icon name="X" className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-black text-ink-900">{dayName}</p>
            <p className="text-xs text-ink-500">{t.progress}: {done}/{total}</p>
          </div>
          <div className="h-10 w-10" />
        </div>
        <div className="container-page pb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
      </header>

      {/* التمارين */}
      <main className="container-page flex-1 space-y-4 overflow-y-auto py-6">
        {day.exercises.map((pe) => {
          const s = state[pe.id]
          const rec = getRecord(pe.exerciseId)
          const alts = getAlternatives(pe.exerciseId)
          const timing = timer.exId === pe.id
          return (
            <div key={pe.id} className={cn('card p-5', s.completed && 'ring-1 ring-primary-soft')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink-900">{planExerciseName(pe, lang)}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {pe.sets} {t.sets} × {pe.reps} {t.reps} · {t.rest} {pe.restSec}ث
                  </p>
                  {(rec?.lastWeight || rec?.bestWeight) && (
                    <p className="mt-1 text-[11px] text-primary-c">
                      {rec?.lastWeight ? `${t.prevWeight}: ${rec.lastWeight}` : ''}
                      {rec?.bestWeight ? `  ·  ${t.bestWeight}: ${rec.bestWeight}` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => set(pe.id, { completed: !s.completed })}
                  aria-pressed={s.completed}
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition-colors',
                    s.completed ? 'border-transparent bg-primary text-white' : 'border-line text-transparent',
                  )}
                >
                  <Icon name="Check" className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>

              {/* مدخلات */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Field label={t.todayWeight}>
                  <input className={inputCls} value={s.weight} onChange={(e) => set(pe.id, { weight: e.target.value })} placeholder="كجم" />
                </Field>
                <Field label={t.repsDone}>
                  <input className={inputCls} value={s.repsDone} onChange={(e) => set(pe.id, { repsDone: e.target.value })} placeholder={pe.reps} />
                </Field>
              </div>

              {/* أزرار */}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={planExerciseVideo(pe)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-2 text-xs">
                  <Icon name="Globe" className="h-4 w-4" />
                  {t.watch}
                </a>
                {!timing ? (
                  <button type="button" onClick={() => startRest(pe.id, pe.restSec)} className="btn-ghost px-3 py-2 text-xs">
                    <Icon name="RotateCcw" className="h-4 w-4" />
                    {t.startRest}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-primary-soft bg-primary-soft px-3 py-2 text-xs font-bold text-primary-c">
                    <span>{t.rest}: {timer.left}ث</span>
                    <button type="button" onClick={() => setTimer((p) => ({ ...p, running: !p.running }))} aria-label={timer.running ? t.pause : t.resume}>
                      <Icon name={timer.running ? 'Minus' : 'Check'} className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setTimer({ exId: null, left: 0, running: false })} aria-label={t.reset}>
                      <Icon name="X" className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {alts.length > 0 && (
                  <button type="button" onClick={() => setOpenAlt(openAlt === pe.id ? null : pe.id)} className="btn-ghost px-3 py-2 text-xs">
                    <Icon name="Layers" className="h-4 w-4" />
                    {t.alternatives}
                  </button>
                )}
              </div>

              {/* البدائل */}
              {openAlt === pe.id && alts.length > 0 && (
                <div className="mt-3 rounded-xl border border-line bg-page p-3">
                  <p className="mb-2 text-xs font-bold text-ink-700">{t.altPrompt}</p>
                  <ul className="space-y-1.5">
                    {alts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-ink-900">{exerciseDisplayName(a.nameAr, a.nameEn, lang)}</span>
                        <a href={a.videoUrl} target="_blank" rel="noopener noreferrer" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label={t.watch}>
                          <Icon name="Globe" className="h-3.5 w-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* الصعوبة */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-500">{t.difficulty}:</span>
                {difficulties.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => set(pe.id, { difficulty: d.value })}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                      s.difficulty === d.value ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* ملاحظات + ألم */}
              <div className="mt-3 grid gap-2">
                <input className={inputCls} value={s.notes} onChange={(e) => set(pe.id, { notes: e.target.value })} placeholder={t.notes} />
                <input className={inputCls} value={s.painNote} onChange={(e) => set(pe.id, { painNote: e.target.value })} placeholder={t.painLabel} />
              </div>
            </div>
          )
        })}

        <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {t.safety}
        </p>
      </main>

      {/* إنهاء */}
      <div className="sticky bottom-0 border-t border-line bg-page/90 backdrop-blur">
        <div className="container-page py-3">
          <button type="button" onClick={finish} className="btn-primary w-full py-4 text-base">
            <Icon name="CheckCircle2" className="h-5 w-5" />
            {t.finish}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-ink-500">{label}</span>
      {children}
    </label>
  )
}
