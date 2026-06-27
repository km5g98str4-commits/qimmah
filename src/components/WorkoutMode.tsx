import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { MuscleChips } from './MuscleChips'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { PlanDay } from '@/types/workout'
import { exerciseDisplayName, planExerciseName, planExerciseVideo } from '@/lib/workoutPlan'
import { getAlternatives, getExercise } from '@/data/exercises'
import { getRecord, progressionHint } from '@/lib/exerciseHistory'
import { getDayStamp } from '@/lib/today'
import type { Difficulty, SetLog, WorkoutSession } from '@/lib/workoutSessions'

interface WorkoutModeProps {
  lang: Lang
  day: PlanDay
  onClose: () => void
  onFinish: (session: WorkoutSession) => void
}

interface ExState {
  sets: SetLog[]
  difficulty?: Difficulty
  painNote: string
  notes: string
}

/** وضع التمرين — تسجيل أداء كل مجموعة (وزن/تكرارات) داخل النادي. */
export function WorkoutMode({ lang, day, onClose, onFinish }: WorkoutModeProps) {
  const t = getStrings(lang).workout
  const [startedAt] = useState(() => new Date().toISOString())
  const [openAlt, setOpenAlt] = useState<string | null>(null)

  const [state, setState] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {}
    day.exercises.forEach((pe) => {
      const rec = getRecord(pe.exerciseId)
      const w = rec?.lastWeight ?? pe.startingWeight ?? ''
      const count = Math.max(1, pe.sets)
      init[pe.id] = {
        sets: Array.from({ length: count }, (_, i) => ({
          setNumber: i + 1,
          targetReps: pe.reps,
          actualReps: '',
          weightKg: w,
          completed: false,
        })),
        painNote: '',
        notes: pe.notes ?? '',
      }
    })
    return init
  })

  // مؤقّت الراحة
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

  const setMeta = (id: string, partial: Partial<ExState>) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  const setSet = (id: string, idx: number, partial: Partial<SetLog>) =>
    setState((prev) => ({
      ...prev,
      [id]: { ...prev[id], sets: prev[id].sets.map((s, i) => (i === idx ? { ...s, ...partial } : s)) },
    }))

  const exDone = (id: string) => state[id]?.sets.length > 0 && state[id].sets.every((s) => s.completed)
  const done = day.exercises.filter((pe) => exDone(pe.id)).length
  const total = day.exercises.length

  const startRest = (exId: string, sec: number) => setTimer({ exId, left: sec > 0 ? sec : 60, running: true })
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
          completed: exDone(pe.id),
          sets: s.sets,
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

  const numInput = 'w-full rounded-lg border border-line bg-beige px-2 py-1.5 text-center text-sm font-bold text-ink-900 focus:border-brand-500/50 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
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

      <main className="container-page flex-1 space-y-4 overflow-y-auto py-6">
        {day.exercises.map((pe) => {
          const s = state[pe.id]
          const rec = getRecord(pe.exerciseId)
          const alts = getAlternatives(pe.exerciseId)
          const timing = timer.exId === pe.id
          const hint = progressionHint(rec)
          return (
            <div key={pe.id} className={cn('card p-5', exDone(pe.id) && 'ring-1 ring-primary-soft')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink-900">{planExerciseName(pe, lang)}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{pe.sets} {t.sets} × {pe.reps} {t.reps} · {t.rest} {pe.restSec}ث</p>
                  {(rec?.lastWeight || rec?.bestWeight) && (
                    <p className="mt-1 text-[11px] text-primary-c">
                      {rec?.lastWeight ? `${t.prevWeight}: ${rec.lastWeight}${rec.lastReps ? `×${rec.lastReps}` : ''}` : ''}
                      {rec?.bestWeight ? `  ·  ${t.bestWeight}: ${rec.bestWeight}` : ''}
                    </p>
                  )}
                  {hint && <p className="mt-1 text-[11px] font-bold text-success">↑ {hint}</p>}
                  {getExercise(pe.exerciseId) && (
                    <MuscleChips
                      primary={getExercise(pe.exerciseId)!.primaryMusclesDetailed}
                      secondary={getExercise(pe.exerciseId)!.secondaryMusclesDetailed}
                      className="mt-2"
                    />
                  )}
                </div>
                <a href={planExerciseVideo(pe)} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label={t.watch}>
                  <Icon name="Globe" className="h-4 w-4" />
                </a>
              </div>

              {/* جدول المجموعات */}
              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 bg-beige px-2 py-1.5 text-[10px] font-bold text-ink-500">
                  <span className="text-center">#</span>
                  <span className="text-center">الوزن (كجم)</span>
                  <span className="text-center">{t.repsDone} ({pe.reps})</span>
                  <span className="text-center">تم</span>
                </div>
                {s.sets.map((st, i) => (
                  <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 border-t border-line px-2 py-1.5">
                    <span className="text-center text-xs font-bold text-ink-400">{st.setNumber}</span>
                    <input className={numInput} inputMode="decimal" value={st.weightKg} onChange={(e) => setSet(pe.id, i, { weightKg: e.target.value })} />
                    <input className={numInput} inputMode="numeric" value={st.actualReps} placeholder={pe.reps} onChange={(e) => setSet(pe.id, i, { actualReps: e.target.value })} />
                    <button type="button" onClick={() => setSet(pe.id, i, { completed: !st.completed })} aria-pressed={st.completed} className={cn('mx-auto grid h-8 w-8 place-items-center rounded-full border-2', st.completed ? 'border-transparent bg-primary text-white' : 'border-line text-transparent')}>
                      <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>

              {/* أزرار */}
              <div className="mt-3 flex flex-wrap gap-2">
                {!timing ? (
                  <button type="button" onClick={() => startRest(pe.id, pe.restSec)} className="btn-ghost px-3 py-2 text-xs">
                    <Icon name="RotateCcw" className="h-4 w-4" />{t.startRest}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-primary-soft bg-primary-soft px-3 py-2 text-xs font-bold text-primary-c">
                    <span>{t.rest}: {timer.left}ث</span>
                    <button type="button" onClick={() => setTimer((p) => ({ ...p, running: !p.running }))} aria-label={timer.running ? t.pause : t.resume}><Icon name={timer.running ? 'Minus' : 'Check'} className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setTimer({ exId: null, left: 0, running: false })} aria-label={t.reset}><Icon name="X" className="h-4 w-4" /></button>
                  </div>
                )}
                {alts.length > 0 && (
                  <button type="button" onClick={() => setOpenAlt(openAlt === pe.id ? null : pe.id)} className="btn-ghost px-3 py-2 text-xs"><Icon name="Layers" className="h-4 w-4" />{t.alternatives}</button>
                )}
              </div>

              {openAlt === pe.id && alts.length > 0 && (
                <div className="mt-3 rounded-xl border border-line bg-page p-3">
                  <p className="mb-2 text-xs font-bold text-ink-700">{t.altPrompt}</p>
                  <ul className="space-y-1.5">
                    {alts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-ink-900">{exerciseDisplayName(a.nameAr, a.nameEn, lang)}</span>
                        <a href={a.videoUrl} target="_blank" rel="noopener noreferrer" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label={t.watch}><Icon name="Globe" className="h-3.5 w-3.5" /></a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-500">{t.difficulty}:</span>
                {difficulties.map((d) => (
                  <button key={d.value} type="button" onClick={() => setMeta(pe.id, { difficulty: d.value })} className={cn('rounded-full border px-3 py-1 text-xs font-bold', s.difficulty === d.value ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700')}>{d.label}</button>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                <input className="w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:outline-none" value={s.notes} onChange={(e) => setMeta(pe.id, { notes: e.target.value })} placeholder={t.notes} />
                <input className="w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:outline-none" value={s.painNote} onChange={(e) => setMeta(pe.id, { painNote: e.target.value })} placeholder={t.painLabel} />
              </div>
            </div>
          )
        })}

        <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />{t.safety}
        </p>
      </main>

      <div className="sticky bottom-0 border-t border-line bg-page/90 backdrop-blur">
        <div className="container-page py-3">
          <button type="button" onClick={finish} className="btn-primary w-full py-4 text-base">
            <Icon name="CheckCircle2" className="h-5 w-5" />{t.finish}
          </button>
        </div>
      </div>
    </div>
  )
}
