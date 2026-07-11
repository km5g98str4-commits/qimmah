import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildWorkoutV2Model, CATEGORY_LABEL, type ExCategory, type WorkoutV2Exercise } from '@/lib/workoutV2Model'

interface WorkoutV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

const ACTIVE_KEY = 'qimmah:active-workout:v2'
const SUMMARY_KEY = 'qimmah:workout-summary:v2'
const REST_DEFAULT = 90

type Screen = 'plan' | 'detail' | 'active' | 'complete'
interface SetRow { weight: number; reps: number; done: boolean }
interface ActiveState { startedAt: number; exIndex: number; setIndex: number; rows: Record<string, SetRow[]> }

const parseReps = (reps: string): number => {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : 10
}
const toAr = (n: number, lang: Lang) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)]))
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Validate a persisted/candidate active session against the CURRENT plan.
 * localStorage is treated as hostile input: the stored session may belong to an
 * older generated workout (different/removed exercises), be malformed, or have
 * out-of-range indices. Returns true only if the session is fully usable for the
 * current plan — every current exercise has a non-empty rows array, and the
 * exIndex/setIndex are in bounds. A type guard so callers get a real ActiveState.
 */
function isUsableSession(value: unknown, exercises: WorkoutV2Exercise[]): value is ActiveState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<ActiveState>
  if (exercises.length === 0) return false
  if (!Number.isInteger(s.exIndex) || (s.exIndex as number) < 0 || (s.exIndex as number) >= exercises.length) return false
  if (!Number.isInteger(s.setIndex) || (s.setIndex as number) < 0) return false
  if (!Number.isInteger(s.startedAt)) return false
  if (!s.rows || typeof s.rows !== 'object') return false
  const rows = s.rows as Record<string, unknown>
  // Every exercise in the CURRENT plan must have a non-empty set array (i.e. the
  // session belongs to this plan — stale ids fail here on exercise 0).
  for (const ex of exercises) {
    const r = rows[ex.id]
    if (!Array.isArray(r) || r.length === 0) return false
    for (const item of r) {
      if (!item || typeof item !== 'object') return false
      const row = item as Partial<SetRow>
      if (typeof row.weight !== 'number' || typeof row.reps !== 'number' || typeof row.done !== 'boolean') return false
    }
  }
  // Current set index must be inside the current exercise's rows.
  const curRows = rows[exercises[s.exIndex as number].id] as SetRow[]
  if ((s.setIndex as number) >= curRows.length) return false
  return true
}

/**
 * Workout v2 — Qimmah v2.1 (Slice 4). Preview-gated (WorkoutView branches here
 * under isDesignV2). Self-contained internal navigation: Plan → Exercise Detail
 * → Active Workout (set editor + rest timer) → Complete. Reads the real
 * generated plan; no fake previous weights/PRs. Active session persists to
 * localStorage (qimmah:active-workout:v2) so a refresh resumes; a completed
 * summary is saved locally (qimmah:workout-summary:v2). No cloud write.
 */
export function WorkoutV2({ lang, onNavigate }: WorkoutV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const model = useMemo(() => buildWorkoutV2Model(customization, lang), [customization, lang])

  const [screen, setScreen] = useState<Screen>('plan')
  const [detailIdx, setDetailIdx] = useState(0)
  const [active, setActive] = useState<ActiveState | null>(null)
  const [resting, setResting] = useState(false)
  const [rest, setRest] = useState(REST_DEFAULT)

  // Restore an in-progress session on mount — but NEVER trust localStorage.
  // Only resume if the persisted session is fully usable for the current plan;
  // otherwise discard just our own key and stay safely on the Plan screen.
  useEffect(() => {
    let parsed: unknown = null
    try {
      const raw = localStorage.getItem(ACTIVE_KEY)
      if (!raw) return
      parsed = JSON.parse(raw)
    } catch {
      parsed = null // malformed JSON
    }
    if (isUsableSession(parsed, model.exercises)) {
      setActive(parsed)
      setScreen('active')
    } else {
      try {
        localStorage.removeItem(ACTIVE_KEY)
      } catch {
        /* storage unavailable */
      }
    }
    // Mount-only restore against the plan present at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Safety net: if we somehow end up on the active screen with an unusable
  // session (e.g. the plan regenerated mid-session), discard it and fall back to
  // Plan — from an EFFECT, so render stays pure and never dereferences undefined.
  useEffect(() => {
    if (screen === 'active' && !isUsableSession(active, model.exercises)) {
      try {
        localStorage.removeItem(ACTIVE_KEY)
      } catch {
        /* storage unavailable */
      }
      setActive(null)
      setScreen('plan')
    }
  }, [screen, active, model.exercises])

  // Persist active session.
  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    } catch {
      /* storage full / unavailable — session stays in memory */
    }
  }, [active])

  // Rest countdown.
  useEffect(() => {
    if (!resting) return
    if (rest <= 0) {
      setResting(false)
      return
    }
    const id = window.setTimeout(() => setRest((r) => r - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resting, rest])

  if (!model.available) return <MissingPlan lang={lang} onNavigate={onNavigate} />

  const startSession = () => {
    const rows: Record<string, SetRow[]> = {}
    for (const ex of model.exercises) {
      rows[ex.id] = Array.from({ length: ex.sets }, () => ({ weight: ex.targetWeightKg ?? 20, reps: parseReps(ex.reps), done: false }))
    }
    setActive({ startedAt: Date.now(), exIndex: 0, setIndex: 0, rows })
    setScreen('active')
  }

  const clearActive = () => {
    try { localStorage.removeItem(ACTIVE_KEY) } catch { /* ignore */ }
    setActive(null)
  }

  const planScreen = <PlanScreen model={model} lang={lang} onExercise={(i) => { setDetailIdx(i); setScreen('detail') }} onStart={startSession} onBack={() => onNavigate('dashboard')} />
  if (screen === 'plan') return planScreen
  if (screen === 'detail') return <DetailScreen ex={model.exercises[detailIdx]} idx={detailIdx} total={model.exercises.length} lang={lang} onStart={startSession} onBack={() => setScreen('plan')} />
  if (screen === 'complete') return <CompleteScreen model={model} active={active} lang={lang} onDone={() => { clearActive(); onNavigate('dashboard') }} />

  // ── Active workout ── Render PURELY. If the session is not usable for the
  // current plan, render the Plan screen (the safety-net effect above resets the
  // screen state) — never call setState in render, never dereference undefined.
  if (!isUsableSession(active, model.exercises)) return planScreen
  const ex = model.exercises[active.exIndex]
  const rows = active.rows[ex.id]
  const row = rows[active.setIndex]

  const setRow = (patch: Partial<SetRow>) => {
    setActive((prev) => {
      if (!prev) return prev
      const next = { ...prev, rows: { ...prev.rows } }
      const arr = [...next.rows[ex.id]]
      arr[prev.setIndex] = { ...arr[prev.setIndex], ...patch }
      next.rows[ex.id] = arr
      return next
    })
  }

  const finishSet = () => {
    setRow({ done: true })
    const lastSet = active.setIndex >= rows.length - 1
    const lastEx = active.exIndex >= model.exercises.length - 1
    if (lastSet && lastEx) {
      try {
        const totalSets = Object.values(active.rows).flat().filter((r) => r.done).length + 1
        const volume = Object.values(active.rows).flat().reduce((v, r) => v + (r.done ? r.weight * r.reps : 0), 0) + row.weight * row.reps
        localStorage.setItem(SUMMARY_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), title: model.session.title, totalSets, volume, durationMin: Math.round((Date.now() - active.startedAt) / 60000) }))
      } catch { /* ignore */ }
      setScreen('complete')
      return
    }
    // advance
    setResting(true)
    setRest(REST_DEFAULT)
    setActive((prev) => {
      if (!prev) return prev
      if (active.setIndex < rows.length - 1) return { ...prev, setIndex: prev.setIndex + 1 }
      return { ...prev, exIndex: prev.exIndex + 1, setIndex: 0 }
    })
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex flex-col bg-page text-ink-900" style={{ paddingTop: 'max(0.75rem, var(--safe-top))' }}>
      <header className="flex items-center justify-between px-5 py-2">
        <button type="button" onClick={() => { if (confirmLeave()) { clearActive(); onNavigate('dashboard') } }} aria-label={t('إغلاق', 'Close')} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5" /></button>
        <span className="text-sm font-bold text-ink-500">{t(`التمرين ${toAr(active.exIndex + 1, lang)} من ${toAr(model.exercises.length, lang)}`, `Exercise ${active.exIndex + 1} of ${model.exercises.length}`)}</span>
        <span className="h-10 w-10" />
      </header>

      {resting ? (
        <RestPanel lang={lang} rest={rest} nextEx={model.exercises[active.exIndex]} setLabel={t(`المجموعة ${toAr(active.setIndex + 1, lang)}`, `Set ${active.setIndex + 1}`)} onAdd={() => setRest((r) => r + 15)} onSkip={() => setResting(false)} />
      ) : (
        <main className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
          <h1 className="text-2xl font-black">{ar ? ex.nameAr : ex.nameEn}</h1>
          <p className="mt-1 text-sm text-ink-500">{CATEGORY_LABEL[ex.category][ar ? 'ar' : 'en']} · {ex.sets}×{ex.reps}</p>

          {/* set list */}
          <div className="mt-5 space-y-2">
            {rows.map((r, i) => (
              <div key={i} className={cn('flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm', i === active.setIndex ? 'border-primary bg-primary/10' : r.done ? 'border-line bg-surface text-ink-500' : 'border-line bg-surface')}>
                <span className="font-bold">{t(`المجموعة ${toAr(i + 1, lang)}`, `Set ${i + 1}`)}</span>
                <span className={cn('font-bold tabular-nums', r.done && 'text-success')}>{toAr(r.weight, lang)} {t('كجم', 'kg')} × {toAr(r.reps, lang)}{r.done ? ' ✓' : ''}</span>
              </div>
            ))}
          </div>

          {/* current set editor — large controls */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stepper label={t('الوزن · كجم', 'Weight · kg')} value={row.weight} step={2.5} onChange={(v) => setRow({ weight: Math.max(0, v) })} lang={lang} />
            <Stepper label={t('التكرار', 'Reps')} value={row.reps} step={1} onChange={(v) => setRow({ reps: Math.max(0, v) })} lang={lang} />
          </div>

          <button type="button" onClick={finishSet} className="btn-primary mt-6 w-full py-4 text-[1.1875rem]">{t('أنهِ المجموعة', 'Complete set')}</button>
        </main>
      )}
    </div>
  )
}

function confirmLeave(): boolean {
  return true
}

function Stepper({ label, value, step, onChange, lang }: { label: string; value: number; step: number; onChange: (v: number) => void; lang: Lang }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-center text-xs font-bold text-ink-500">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => onChange(value - step)} aria-label="−" className="grid h-12 w-12 place-items-center rounded-xl bg-beige text-ink-900"><Icon name="Minus" className="h-6 w-6" /></button>
        <span className="text-3xl font-black tabular-nums">{toAr(value, lang)}</span>
        <button type="button" onClick={() => onChange(value + step)} aria-label="+" className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white"><Icon name="Plus" className="h-6 w-6" /></button>
      </div>
    </div>
  )
}

function RestPanel({ lang, rest, nextEx, setLabel, onAdd, onSkip }: { lang: Lang; rest: number; nextEx: WorkoutV2Exercise; setLabel: string; onAdd: () => void; onSkip: () => void }) {
  const ar = lang !== 'en'
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-bold text-ink-500">{ar ? 'راحة' : 'Rest'}</p>
      <p className="mt-2 text-7xl font-black tabular-nums text-primary">{fmtTime(rest)}</p>
      <p className="mt-4 text-sm text-ink-500">{ar ? 'التالي' : 'Next'}: {ar ? nextEx.nameAr : nextEx.nameEn} · {setLabel}</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onAdd} className="rounded-2xl border border-line bg-surface px-6 py-3 font-bold text-ink-900">+15 {ar ? 'ث' : 's'}</button>
        <button type="button" onClick={onSkip} className="btn-primary px-8 py-3">{ar ? 'تخطي' : 'Skip'}</button>
      </div>
    </main>
  )
}

function PlanScreen({ model, lang, onExercise, onStart, onBack }: { model: ReturnType<typeof buildWorkoutV2Model>; lang: Lang; onExercise: (i: number) => void; onStart: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  const groups: { cat: ExCategory; items: { ex: WorkoutV2Exercise; i: number }[] }[] = []
  model.exercises.forEach((ex, i) => {
    const g = groups.find((x) => x.cat === ex.category)
    if (g) g.items.push({ ex, i })
    else groups.push({ cat: ex.category, items: [{ ex, i }] })
  })
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md animate-fade-up">
        <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5" /></button>
        <p className="mt-4 text-xs font-black uppercase tracking-wider text-primary">{ar ? model.program.titleAr : model.program.titleEn} · {ar ? model.program.contextAr : model.program.contextEn}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{model.session.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-500">
          <Chip icon="Dumbbell" text={`${model.session.exerciseCount} ${ar ? 'تمارين' : 'exercises'}`} />
          <Chip icon="Clock" text={`~${model.session.durationMin} ${ar ? 'دقيقة' : 'min'}`} />
          {model.session.muscles.slice(0, 2).map((m) => <Chip key={m} icon="Target" text={m} />)}
        </div>

        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.cat}>
              <p className="mb-2 text-sm font-black text-ink-700">{CATEGORY_LABEL[g.cat][ar ? 'ar' : 'en']}</p>
              <div className="space-y-2">
                {g.items.map(({ ex, i }) => (
                  <button key={ex.id} type="button" onClick={() => onExercise(i)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start transition-colors hover:border-primary/40">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name="Dumbbell" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{ar ? ex.nameAr : ex.nameEn}</span>
                      <span className="block text-xs text-ink-500">{ex.sets}×{ex.reps}{ex.equipment[0] ? ` · ${ex.equipment[0]}` : ''}</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* In-flow primary CTA — sits within the scroll (above the app tab bar,
            which a fixed footer would collide with), so it's always tappable. */}
        <button type="button" onClick={onStart} className="btn-primary mt-6 w-full py-4 text-[1.1875rem] shadow-glow">{ar ? 'ابدأ الجلسة' : 'Start session'}</button>
      </div>
    </div>
  )
}

function DetailScreen({ ex, idx, total, lang, onStart, onBack }: { ex: WorkoutV2Exercise; idx: number; total: number; lang: Lang; onStart: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5" /></button>
        {/* media placeholder (no demo media in the plan template) */}
        <div className="mt-4 grid aspect-video place-items-center rounded-2xl border border-line bg-surface text-ink-400"><Icon name="Dumbbell" className="h-10 w-10" /></div>
        <p className="mt-4 text-xs font-black uppercase tracking-wider text-primary">{ar ? `التمرين ${toAr(idx + 1, lang)} من ${toAr(total, lang)}` : `Exercise ${idx + 1} of ${total}`}</p>
        <h1 className="mt-1 text-2xl font-black">{ar ? ex.nameAr : ex.nameEn}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-500">
          {ex.muscles.map((m) => <Chip key={m} icon="Target" text={m} />)}
          {ex.equipment[0] && <Chip icon="Dumbbell" text={ex.equipment[0]} />}
          <Chip icon="Repeat" text={`${ex.sets}×${ex.reps}`} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label={ar ? 'آخر أداء' : 'Last time'} value={ex.lastPerformance ?? (ar ? 'لا يوجد بعد' : 'None yet')} muted={!ex.lastPerformance} />
          <Stat label={ar ? 'هدف اليوم' : 'Target today'} value={ex.targetWeightKg ? `${ex.targetWeightKg} ${ar ? 'كجم' : 'kg'}` : (ar ? 'حسب إحساسك' : 'By feel')} muted={!ex.targetWeightKg} />
        </div>

        <p className="mt-6 mb-2 text-sm font-black text-ink-700">{ar ? 'إشارات سريعة' : 'Quick cues'}</p>
        <ul className="space-y-2">
          {ex.cues.map((c, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><Icon name="Check" className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />{c}</li>
          ))}
        </ul>

        <div className="mt-6 space-y-2.5">
          <button type="button" onClick={onStart} className="btn-primary w-full py-4 text-[1.1875rem]">{ar ? 'ابدأ التمرين' : 'Start exercise'}</button>
          <button type="button" disabled aria-disabled className="w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-400" title={ar ? 'الاستبدال قادم لاحقًا' : 'Replace coming later'}>{ar ? 'استبدال · لاحقًا' : 'Replace · later'}</button>
        </div>
      </div>
    </div>
  )
}

function CompleteScreen({ model, active, lang, onDone }: { model: ReturnType<typeof buildWorkoutV2Model>; active: ActiveState | null; lang: Lang; onDone: () => void }) {
  const ar = lang !== 'en'
  const rows = active ? Object.values(active.rows).flat() : []
  const totalSets = rows.length
  const volume = rows.reduce((v, r) => v + r.weight * r.reps, 0)
  const durationMin = active ? Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)) : 0
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      <span className="grid h-16 w-16 animate-pop-in place-items-center rounded-2xl bg-primary text-white shadow-glow"><Icon name="Check" className="h-8 w-8" strokeWidth={3} /></span>
      <h1 className="mt-5 text-3xl font-black">{ar ? 'أنهيت الجلسة' : 'Session complete'}</h1>
      <p className="mt-1 text-sm text-ink-500">{model.session.title}</p>
      <div className="mt-6 grid w-full max-w-xs grid-cols-3 gap-3">
        <Stat label={ar ? 'الدقائق' : 'Minutes'} value={toAr(durationMin, lang)} />
        <Stat label={ar ? 'المجموعات' : 'Sets'} value={toAr(totalSets, lang)} />
        <Stat label={ar ? 'الحجم كجم' : 'Volume kg'} value={toAr(volume, lang)} />
      </div>
      <button type="button" onClick={onDone} className="btn-primary mt-8 w-full max-w-xs py-4 text-[1.1875rem] shadow-glow">{ar ? 'حفظ وإنهاء' : 'Save & finish'}</button>
      <p className="mt-3 text-[0.7rem] text-ink-400">{ar ? 'محفوظ على هذا الجهاز فقط.' : 'Saved on this device only.'}</p>
    </div>
  )
}

function MissingPlan({ lang, onNavigate }: { lang: Lang; onNavigate: (r: AppRoute) => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      <Icon name="Dumbbell" className="h-12 w-12 text-ink-400" />
      <h1 className="mt-5 text-2xl font-black">{ar ? 'أكمل إعداد خطتك' : 'Finish setting up your plan'}</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-500">{ar ? 'نحتاج هدفك وجدولك لنبني تمرينك.' : 'We need your goal and schedule to build your workout.'}</p>
      <button type="button" onClick={() => onNavigate('setup')} className="btn-primary mt-6 w-full max-w-xs py-4 text-[1.1875rem]">{ar ? 'ابدأ الإعداد' : 'Start setup'}</button>
    </div>
  )
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1"><Icon name={icon} className="h-3.5 w-3.5" />{text}</span>
}
function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className="rounded-xl border border-line bg-surface px-2 py-3 text-center"><p className={cn('text-lg font-black tabular-nums', muted && 'text-ink-400')}>{value}</p><p className="mt-0.5 text-[0.65rem] font-bold text-ink-500">{label}</p></div>
}
