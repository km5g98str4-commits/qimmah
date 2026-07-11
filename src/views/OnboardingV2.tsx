import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { V2_GOAL_MODEL, V2_ONBOARDING, type V2GoalValue } from '@/design-system/v2/labels'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { buildCustomizationFromOnboarding, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { markCompleted } from '@/lib/onboarding'
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { track } from '@/lib/analytics'
import { toAnswersFromV2, type V2Place, type V2Pref } from '@/lib/onboardingV2Adapter'

interface OnboardingV2Props {
  lang: Lang
  /** Preview-complete: enters the app via the existing safe local completion path. */
  onComplete: () => void
  /** Exit from the first step (back to Start). */
  onExit: () => void
}

const GOAL_ICON: Record<V2GoalValue, string> = { cut: 'Flame', maintain: 'ShieldCheck', bulk: 'TrendingUp' }
const DAYS = [3, 4, 5, 6]
const DURATIONS = [30, 45, 60, 75]

/**
 * Suggested split label from weekly days — a real split descriptor (NOT
 * repeating "N-day split", which the summary already states) so the plan feels
 * concrete. Kept short so the summary row stays on one/two lines.
 */
function splitFor(days: number, lang: Lang): string {
  const ar = lang !== 'en'
  switch (days) {
    case 3:
      return ar ? 'دفع · سحب · أرجل' : 'Push · Pull · Legs'
    case 4:
      return ar ? 'علوي / سفلي' : 'Upper / Lower'
    case 5:
      return ar ? 'لكل عضلة يوم' : 'A day per muscle'
    case 6:
      return ar ? 'دفع · سحب · أرجل ×٢' : 'Push · Pull · Legs ×2'
    default:
      return ar ? 'تقسيمة مخصّصة' : 'Custom split'
  }
}

const toAr = (n: number, lang: Lang) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)]))

/**
 * Onboarding — Qimmah Design v2.1 (Slice 2). Preview-gated (see SetupView): a
 * focused, coach-like three-step flow — Goal → Training setup (live plan
 * summary) → Equipment/constraints — ending on a "plan ready" screen. Momentum
 * direction (graphite/ember, IBM Plex under the v2 seam).
 *
 * Slice 2B — now FUNCTIONAL: the choices map to the existing `Answers` model
 * (see onboardingV2Adapter) and run the SAME local plan generation + completion
 * v1 uses (buildOnboardingProfile → saveOnboardingProfile →
 * buildCustomizationFromOnboarding → applyCustomization → markCompleted). The
 * only v1 step deliberately skipped is the Supabase profile write
 * (persistOnboardingToProfile) — kept out of this slice for safety; it is a
 * best-effort cloud sync that requires a real account/staging to verify.
 */
export function OnboardingV2({ lang, onComplete, onExit }: OnboardingV2Props) {
  const t = V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  const userId = auth.user?.id ?? null
  const [step, setStep] = useState(0) // 0 goal · 1 training · 2 equipment · 3 ready
  const [finalizing, setFinalizing] = useState(false)

  const [goal, setGoal] = useState<V2GoalValue | null>(null)
  const [days, setDays] = useState(4)
  const [duration, setDuration] = useState(45)
  const [place, setPlace] = useState<string | null>(null)
  const [pref, setPref] = useState<string | null>(null)
  const [hasInjury, setHasInjury] = useState(false)
  const [injuries, setInjuries] = useState<string[]>([])

  const goalEntry = useMemo(() => V2_GOAL_MODEL.find((g) => g.value === goal) ?? null, [goal])
  const canNext = step === 0 ? !!goal : step === 2 ? !!place && !!pref : true

  const next = () => setStep((s) => Math.min(3, s + 1))
  const back = () => (step === 0 ? onExit() : setStep((s) => s - 1))
  const toggleInjury = (v: string) =>
    setInjuries((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]))

  // Real completion: map v2 choices → Answers, then run v1's local generation
  // pipeline. No Supabase write (skipped for safety). Never leaves the user
  // stuck: on any failure we still enter the app via onComplete.
  const finalize = () => {
    if (finalizing) return
    setFinalizing(true)
    void (async () => {
      try {
        const answers = toAnswersFromV2({ goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, injuries: hasInjury ? injuries : [] })
        const op = buildOnboardingProfile(answers)
        saveOnboardingProfile(op)
        const built = await buildCustomizationFromOnboarding(op, customization)
        applyCustomization(built)
        track('plan_generated', { source: 'onboarding' })
        markCompleted(userId)
        track('onboarding_completed', { planMode: 'auto' })
        // Cloud parity — EXACTLY as v1 (PlanBuilder): best-effort, fire-and-forget,
        // only when signed in. persistOnboardingToProfile never throws and merges
        // into the user's own profile row (anon client, RLS; no schema change, no
        // service_role). Local completion above is already the source of truth, so
        // a cloud failure changes nothing for the user.
        if (userId) void persistOnboardingToProfile(userId, op)
      } catch {
        // Generation should never trap the user in setup — fall through to enter.
      }
      onComplete()
    })()
  }

  // Ready screen — full-bleed confirmation.
  if (step === 3) {
    return (
      <ReadyScreen
        lang={lang}
        t={t}
        goalLabel={goalEntry?.label ?? ''}
        days={days}
        duration={duration}
        split={splitFor(days, lang)}
        placeLabel={t.places.find((p) => p.value === place)?.label ?? ''}
        finalizing={finalizing}
        onEnter={finalize}
      />
    )
  }

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="fixed inset-0 z-50 flex flex-col bg-page text-ink-900">
      {/* Header — back + segmented progress + step label. */}
      <header className="shrink-0 px-5" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            aria-label={t.back}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-700"
          >
            <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <span className="text-sm font-bold text-ink-500">{t.stepOf(step + 1)}</span>
          <span className="h-10 w-10" />
        </div>
        <div className="mx-auto mt-3 flex w-full max-w-md gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-line')} />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">
          {step === 0 && <GoalStep t={t} goal={goal} onPick={setGoal} />}
          {step === 1 && (
            <TrainingStep t={t} lang={lang} days={days} duration={duration} onDays={setDays} onDuration={setDuration} goalLabel={goalEntry?.label ?? ''} split={splitFor(days, lang)} />
          )}
          {step === 2 && (
            <EquipmentStep t={t} place={place} pref={pref} hasInjury={hasInjury} injuries={injuries} onPlace={setPlace} onPref={setPref} onToggleInjury={() => setHasInjury((v) => !v)} onInjury={toggleInjury} />
          )}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="shrink-0 border-t border-line bg-page/90 px-5 py-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}>
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="btn-primary w-full py-4 text-[1.1875rem] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 2 ? t.equipment.cta : t.next}
          </button>
        </div>
      </footer>
    </div>
  )
}

type T = (typeof V2_ONBOARDING)['ar']

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="animate-fade-up">
      <h1 className="text-[1.7rem] font-black leading-tight tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
    </div>
  )
}

function GoalStep({ t, goal, onPick }: { t: T; goal: V2GoalValue | null; onPick: (g: V2GoalValue) => void }) {
  return (
    <div>
      <StepTitle title={t.goal.title} />
      <div className="mt-6 space-y-3">
        {V2_GOAL_MODEL.map((g) => {
          const on = goal === g.value
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onPick(g.value)}
              aria-pressed={on}
              className={cn(
                'relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-start transition-all active:scale-[0.99]',
                on ? 'border-primary bg-primary/10 shadow-glow' : 'border-line bg-surface hover:border-ink-400/40',
              )}
            >
              {/* Ember accent bar on selection. */}
              <span className={cn('absolute inset-y-0 start-0 w-1 transition-colors', on ? 'bg-primary' : 'bg-transparent')} />
              <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors', on ? 'bg-primary text-white' : 'bg-beige text-ink-500')}>
                <Icon name={GOAL_ICON[g.value]} className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black text-ink-900">{g.label}</span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-500">{g.description}</span>
              </span>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors', on ? 'border-primary bg-primary text-white' : 'border-line text-transparent')}>
                <Icon name="Check" className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-5 text-center text-xs font-medium text-ink-500">{t.goal.note}</p>
    </div>
  )
}

function Segmented({ options, value, onChange, render }: { options: number[]; value: number; onChange: (v: number) => void; render: (v: number) => ReactNode }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((o) => {
        const on = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={on}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-center transition-all active:scale-[0.97]',
              on ? 'border-primary bg-primary/10 text-ink-900' : 'border-line bg-surface text-ink-700 hover:border-ink-400/40',
            )}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function TrainingStep({ t, lang, days, duration, onDays, onDuration, goalLabel, split }: { t: T; lang: Lang; days: number; duration: number; onDays: (v: number) => void; onDuration: (v: number) => void; goalLabel: string; split: string }) {
  return (
    <div>
      <StepTitle title={t.training.title} subtitle={t.training.subtitle} />

      <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.daysQ}</p>
      <Segmented options={DAYS} value={days} onChange={onDays} render={(v) => <span className="text-xl font-black">{toAr(v, lang)}</span>} />

      <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.durationQ}</p>
      <Segmented options={DURATIONS} value={duration} onChange={onDuration} render={(v) => (
        <>
          <span className="text-lg font-black">{toAr(v, lang)}</span>
          <span className="text-[0.65rem] font-bold text-ink-500">{lang === 'en' ? 'min' : 'د'}</span>
        </>
      )} />

      {/* Live plan summary — updates as choices change. */}
      <div className="mt-7 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
        <div className="flex items-center gap-2">
          <Icon name="Sparkles" className="h-4 w-4 text-primary" />
          <span className="text-sm font-black text-primary">{t.training.summaryTitle}</span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <SummaryRow icon="Dumbbell" text={`${lang === 'en' ? `${days}-day split` : `تقسيمة ${toAr(days, lang)} ${t.training.daysUnit}`} · ${split}`} />
          <SummaryRow icon="Clock" text={`${toAr(duration, lang)} ${lang === 'en' ? 'min' : 'دقيقة'} ${t.training.perSession}`} />
          {goalLabel && <SummaryRow icon="Target" text={`${t.training.suitsGoal} ${goalLabel}`} />}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="flex items-center gap-2 font-semibold text-ink-900">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-ink-500" />
      <span>{text}</span>
    </p>
  )
}

function TileGroup({ options, value, onChange }: { options: readonly { value: string; label: string; icon: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={cn(
              'flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all active:scale-[0.97]',
              on ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-ink-400/40',
            )}
          >
            <Icon name={o.icon} className={cn('h-6 w-6', on ? 'text-primary' : 'text-ink-500')} strokeWidth={2.25} />
            <span className={cn('text-xs font-bold', on ? 'text-ink-900' : 'text-ink-700')}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function EquipmentStep({ t, place, pref, hasInjury, injuries, onPlace, onPref, onToggleInjury, onInjury }: { t: T; place: string | null; pref: string | null; hasInjury: boolean; injuries: string[]; onPlace: (v: string) => void; onPref: (v: string) => void; onToggleInjury: () => void; onInjury: (v: string) => void }) {
  return (
    <div>
      <StepTitle title={t.equipment.title} subtitle={t.equipment.subtitle} />

      <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.equipment.placeQ}</p>
      <TileGroup options={t.places} value={place} onChange={onPlace} />

      <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.equipment.prefQ}</p>
      <TileGroup options={t.prefs} value={pref} onChange={onPref} />

      {/* Injury — calm, coach-like, not medical. */}
      <div className="mt-7 rounded-2xl border border-line bg-surface p-4">
        <button type="button" onClick={onToggleInjury} aria-pressed={hasInjury} className="flex w-full items-center justify-between gap-3 text-start">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink-900">{t.equipment.injuryQ}</span>
            <span className="mt-0.5 block text-xs text-ink-500">{t.equipment.injuryNote}</span>
          </span>
          <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', hasInjury ? 'bg-primary' : 'bg-line')}>
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', hasInjury ? 'start-1' : 'end-1')} />
          </span>
        </button>
        {hasInjury && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {t.injuries.map((inj) => {
              const on = injuries.includes(inj.value)
              return (
                <button
                  key={inj.value}
                  type="button"
                  onClick={() => onInjury(inj.value)}
                  aria-pressed={on}
                  className={cn('rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors', on ? 'border-primary bg-primary/15 text-ink-900' : 'border-line bg-beige text-ink-700')}
                >
                  {inj.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ReadyScreen({ lang, t, goalLabel, days, duration, split, placeLabel, finalizing, onEnter }: { lang: Lang; t: T; goalLabel: string; days: number; duration: number; split: string; placeLabel: string; finalizing: boolean; onEnter: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute start-1/2 top-[10%] h-[40%] w-[80%] -translate-x-1/2 rounded-full blur-[2px]" style={{ background: 'radial-gradient(closest-side, rgba(242,106,33,0.26), rgba(242,106,33,0) 72%)' }} />
      </div>
      <div className="app-container relative z-10 flex flex-1 flex-col px-6" style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid h-16 w-16 animate-pop-in place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Check" className="h-8 w-8" strokeWidth={3} />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-widest text-primary">{t.ready.eyebrow}</p>
          <h1 className="mt-2 text-[2rem] font-black tracking-tight text-ink-900">{t.ready.title}</h1>
          <p className="mt-2 max-w-xs text-sm text-ink-500">{t.ready.subtitle}</p>

          <div className="mt-7 w-full max-w-sm space-y-2.5 rounded-2xl border border-line bg-surface p-4 text-start">
            <SummaryRow icon="Dumbbell" text={`${lang === 'en' ? `${days}-day split` : `تقسيمة ${toAr(days, lang)} ${t.training.daysUnit}`} · ${split}`} />
            <SummaryRow icon="Clock" text={`${toAr(duration, lang)} ${lang === 'en' ? 'min' : 'دقيقة'} ${t.training.perSession}`} />
            {goalLabel && <SummaryRow icon="Target" text={`${t.training.suitsGoal} ${goalLabel}`} />}
            {placeLabel && <SummaryRow icon="Building2" text={placeLabel} />}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-center text-[0.7rem] font-medium text-ink-400">{t.ready.previewNote}</p>
          <button type="button" onClick={onEnter} disabled={finalizing} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow disabled:opacity-60">
            {finalizing ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-label={t.ready.enter} />
            ) : (
              t.ready.enter
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
