import { useEffect, useMemo, useState } from 'react'
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
import { POLICY_LINKS, policyCopy } from '@/data/policyCopy'
import { toAnswersFromV2, type V2Place, type V2Pref } from '@/lib/onboardingV2Adapter'
import { isMinorAge } from '@/lib/calculators'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'
import {
  DAYS,
  DURATIONS,
  canAdvance,
  clearDraftV2,
  finalizeReduce,
  initialDraftV2,
  saveDraftV2,
  validateStep,
  type FinalizeStatus,
  type OnboardingV2Draft,
  type StepValidation,
} from '@/lib/onboardingV2Flow'

interface OnboardingV2Props {
  lang: Lang
  /** Preview-complete: enters the app via the existing safe local completion path. */
  onComplete: () => void
  /** Exit from the first step (back to Start). */
  onExit: () => void
}

const GOAL_ICON: Record<V2GoalValue, string> = { cut: 'Flame', maintain: 'ShieldCheck', bulk: 'TrendingUp' }

// Stable ids linking each step's region to its heading (aria-labelledby).
const TITLE_ID = ['onb-title-goal', 'onb-title-training', 'onb-title-equipment'] as const

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
 * summary) → Equipment/constraints — ending on a "plan ready" screen.
 *
 * Async + a11y hardened: plan assembly shows a full-screen loading state; a
 * failure surfaces a visible retry (never a silent drop into the app);
 * per-step Next validation is announced; answers persist as an owner-scoped
 * draft that survives reload and clears on finish; every choice group is a
 * labelled fieldset. Choices map to the existing `Answers` model
 * (onboardingV2Adapter) and run the SAME local generation pipeline v1 uses.
 */
export function OnboardingV2({ lang, onComplete, onExit }: OnboardingV2Props) {
  const t = V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  const userId = auth.user?.id ?? null
  const [initialDraft] = useState(() => initialDraftV2(userId))
  const [step, setStep] = useState(initialDraft.step) // 0 goal · 1 training · 2 equipment · 3 ready
  const [status, setStatus] = useState<FinalizeStatus>('idle')

  const [goal, setGoal] = useState<V2GoalValue | null>(initialDraft.goal)
  const [days, setDays] = useState(initialDraft.days)
  const [duration, setDuration] = useState(initialDraft.duration)
  const [place, setPlace] = useState<string | null>(initialDraft.place)
  const [pref, setPref] = useState<string | null>(initialDraft.pref)
  const [hasInjury, setHasInjury] = useState(initialDraft.hasInjury)
  const [injuries, setInjuries] = useState<string[]>(initialDraft.injuries)
  const [healthDataConsent, setHealthDataConsent] = useState(initialDraft.healthDataConsent)
  const [validation, setValidation] = useState<StepValidation>(null)

  // القاصرون (دون 18) — المحافظة فقط. العمر لا يُجمَع في تدفّق v2؛ نستنتجه من ملف محفوظ
  // (حساب قاصر عائد لإعادة الإعداد). للضيف الجديد بلا عمر: لا تقييد (adult افتراضًا).
  const minor = isMinorAge(customization.profile.age)
  const goalEntry = useMemo(() => V2_GOAL_MODEL.find((g) => g.value === goal) ?? null, [goal])
  const answers = { goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, healthDataConsent }

  // Persist the draft on every answer/step change — a reload resumes here.
  // Never while the plan is being built or after a successful finish.
  useEffect(() => {
    if (status === 'building' || status === 'done') return
    const draft: OnboardingV2Draft = { step, goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, hasInjury, injuries, healthDataConsent }
    saveDraftV2(draft, userId)
  }, [step, goal, days, duration, place, pref, hasInjury, injuries, healthDataConsent, status, userId])

  // Auto-dismiss a shown validation message once the step becomes complete.
  useEffect(() => {
    if (validation && canAdvance(step, answers)) setValidation(null)
    // answers is derived each render; the primitive fields are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, step, goal, days, duration, place, pref, healthDataConsent])

  const next = () => {
    const v = validateStep(step, answers)
    if (v) {
      setValidation(v)
      return
    }
    setValidation(null)
    setStep((s) => Math.min(3, s + 1))
  }
  const back = () => {
    setValidation(null)
    if (step === 0) return onExit()
    setStep((s) => s - 1)
  }
  const toggleInjury = (v: string) =>
    setInjuries((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]))

  // Real completion: map v2 choices → Answers, then run v1's local generation
  // pipeline. Visible failure: on any throw we surface the error screen with a
  // retry and DO NOT enter the app. On success we clear the draft and enter.
  const finalize = () => {
    if (status === 'building') return
    setStatus((s) => finalizeReduce(s, 'start'))
    void (async () => {
      try {
        // DEV-only preview seam to exercise the async states without a real
        // failure. `hang` holds the loading state (for observing it); `error`
        // throws so the failure/retry UI shows. Zero effect in production.
        if (import.meta.env.DEV) {
          const mode = readForceFail()
          if (mode === 'hang') await new Promise(() => {})
          if (mode === 'error') throw new Error('forced onboarding failure (dev preview)')
        }
        const built0 = toAnswersFromV2({ goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, injuries: hasInjury ? injuries : [], healthDataConsent })
        const op = buildOnboardingProfile(built0)
        saveOnboardingProfile(op)
        const built = await buildCustomizationFromOnboarding(op, customization)
        applyCustomization(built)
        track('plan_generated', { source: 'onboarding' })
        markCompleted(userId)
        track('onboarding_completed', { planMode: 'auto' })
        // Cloud parity — EXACTLY as v1 (PlanBuilder): best-effort, fire-and-forget,
        // only when signed in. persistOnboardingToProfile never throws.
        if (userId) void persistOnboardingToProfile(userId, op)
        clearDraftV2(userId) // discard the resumable draft — setup is complete
        setStatus((s) => finalizeReduce(s, 'ok'))
        onComplete()
      } catch {
        // Visible failure — surface retry, keep the user in setup (draft intact).
        setStatus((s) => finalizeReduce(s, 'fail'))
      }
    })()
  }

  // Ready screen (+ async overlays). Building/error overlay ON TOP so the CTA
  // stays mounted with aria-busy during async work.
  if (step === 3) {
    return (
      <>
        <ReadyScreen
          lang={lang}
          t={t}
          goalLabel={goalEntry?.label ?? ''}
          days={days}
          duration={duration}
          split={splitFor(days, lang)}
          placeLabel={t.places.find((p) => p.value === place)?.label ?? ''}
          busy={status === 'building'}
          onEnter={finalize}
        />
        {status === 'building' && <BuildingScreen lang={lang} t={t} />}
        {status === 'error' && <ErrorScreen lang={lang} t={t} onRetry={finalize} onDismiss={() => setStatus('idle')} />}
      </>
    )
  }

  const stepTitleId = TITLE_ID[step]
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-dark fixed inset-0 z-50 flex flex-col bg-page text-ink-900">
      {/* Header — back + segmented progress + step label. */}
      <header className="shrink-0 px-5" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            aria-label={t.back}
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-700"
          >
            <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <span className="text-sm font-bold text-ink-500">{t.stepOf(step + 1)}</span>
          <span className="h-11 w-11" />
        </div>
        <div className="mx-auto mt-3 flex w-full max-w-md gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'v2-bg-blue' : 'bg-line')} />
          ))}
        </div>
      </header>

      {/* Content — each step is a region named by its heading. */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="v2-screen-enter mx-auto w-full max-w-md">
          {step === 0 && <GoalStep lang={lang} t={t} titleId={stepTitleId} goal={goal} isMinor={minor} healthDataConsent={healthDataConsent} onConsent={setHealthDataConsent} onPick={(g) => { if (minor && (g === 'cut' || g === 'bulk')) return; setGoal(g); setValidation(null) }} />}
          {step === 1 && (
            <TrainingStep t={t} titleId={stepTitleId} lang={lang} days={days} duration={duration} onDays={setDays} onDuration={setDuration} goalLabel={goalEntry?.label ?? ''} split={splitFor(days, lang)} />
          )}
          {step === 2 && (
            <EquipmentStep t={t} titleId={stepTitleId} place={place} pref={pref} hasInjury={hasInjury} injuries={injuries} onPlace={(v) => { setPlace(v); setValidation(null) }} onPref={(v) => { setPref(v); setValidation(null) }} onToggleInjury={() => setHasInjury((v) => !v)} onInjury={toggleInjury} />
          )}
        </div>
      </main>

      {/* Footer CTA + inline validation (announced). */}
      <footer className="shrink-0 border-t border-line bg-page/90 px-5 py-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}>
        <div className="mx-auto w-full max-w-md">
          {/* High-contrast text + danger icon/border (not colour-only) so the
              message stays AA-legible on both the light and dark token themes. */}
          {validation && (
            <p role="alert" className="v2-error-panel mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold text-ink-900">
              <Icon name="AlertCircle" className="v2-error-icon h-4 w-4 shrink-0" />
              <span>{validation === 'healthConsent' ? policyCopy[lang].healthConsentRequired : t.validation[validation]}</span>
            </p>
          )}
          <button
            type="button"
            onClick={next}
            aria-disabled={!canAdvance(step, answers)}
            className="btn-primary w-full py-4 text-[1.1875rem]"
          >
            {step === 2 ? t.equipment.cta : t.next}
          </button>
        </div>
      </footer>
    </div>
  )
}

// DEV-only preview switch (see finalize). Guarded by import.meta.env.DEV at the
// call site. 'hang' → stay on the loading screen; 'error' → surface the failure.
function readForceFail(): 'off' | 'hang' | 'error' {
  try {
    if (typeof localStorage === 'undefined') return 'off'
    const v = localStorage.getItem('qimmah:onboarding:force-fail')
    return v === 'hang' ? 'hang' : v === '1' ? 'error' : 'off'
  } catch {
    return 'off'
  }
}

type T = (typeof V2_ONBOARDING)['ar']

/** A choice group wrapped as a labelled fieldset (legend is sr-only). */
function Group({ legend, children, className }: { legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{legend}</legend>
      {children}
    </fieldset>
  )
}

function StepTitle({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div className="animate-fade-up">
      <h1 id={id} className="text-[1.7rem] font-black leading-tight tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
    </div>
  )
}

function GoalStep({ lang, t, titleId, goal, isMinor, healthDataConsent, onConsent, onPick }: { lang: Lang; t: T; titleId: string; goal: V2GoalValue | null; isMinor: boolean; healthDataConsent: boolean; onConsent: (checked: boolean) => void; onPick: (g: V2GoalValue) => void }) {
  const policy = policyCopy[lang]
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.goal.title} />
      <Group legend={t.legends.goal} className="mt-6 block space-y-3">
        {V2_GOAL_MODEL.map((g) => {
          const on = goal === g.value
          // القاصرون: تعديل الوزن (تنشيف/تضخيم) معطّل — المحافظة فقط.
          const disabled = isMinor && (g.value === 'cut' || g.value === 'bulk')
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onPick(g.value)}
              disabled={disabled}
              aria-pressed={on}
              aria-disabled={disabled}
              aria-describedby={disabled ? 'v2-goal-minor-note' : undefined}
              className={cn(
                'v2-pressable relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-start',
                disabled ? 'cursor-not-allowed border-line bg-beige' : on ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
              )}
            >
              {/* Ember accent bar on selection. */}
              <span className={cn('absolute inset-y-0 start-0 w-1 transition-colors', on && !disabled ? 'v2-choice-accent' : 'bg-transparent')} />
              <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors', on && !disabled ? 'v2-choice-icon-selected' : 'bg-beige text-ink-500')}>
                <Icon name={GOAL_ICON[g.value]} className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black text-ink-900">{g.label}</span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-500">{g.description}</span>
              </span>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors', on && !disabled ? 'v2-choice-icon-selected border-[color:var(--v2-blue)]' : 'border-line text-transparent')}>
                <Icon name="Check" className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </Group>
      {isMinor && (
        <p id="v2-goal-minor-note" className="mt-3 flex items-start gap-2 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
          <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {profileChoiceStrings[lang].minorGoalNote}
        </p>
      )}
      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm leading-relaxed text-ink-500">{policy.healthExplanation}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-start text-sm font-bold leading-relaxed text-ink-900">
          <input type="checkbox" checked={healthDataConsent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span>{policy.healthConsent} · <a href={POLICY_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="text-[color:var(--v2-blue)] underline underline-offset-2">{policy.privacy}</a></span>
        </label>
      </div>
      <p className="mt-5 text-center text-xs font-medium text-ink-500">{t.goal.note}</p>
    </section>
  )
}

function Segmented({ options, value, onChange, render }: { options: readonly number[]; value: number; onChange: (v: number) => void; render: (v: number) => ReactNode }) {
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
              'v2-pressable relative flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-center',
              on ? 'v2-choice-selected text-ink-900' : 'border-line bg-surface text-ink-700 hover:border-ink-400/40',
            )}
          >
            {/* دلالة اختيار غير لونية (WCAG 1.4.1): شارة صح تظهر على المحدَّد فقط. */}
            {on && (
              <span className="v2-choice-icon-selected absolute -top-1.5 -end-1.5 grid h-4 w-4 place-items-center rounded-full" aria-hidden="true">
                <Icon name="Check" className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function TrainingStep({ t, titleId, lang, days, duration, onDays, onDuration, goalLabel, split }: { t: T; titleId: string; lang: Lang; days: number; duration: number; onDays: (v: number) => void; onDuration: (v: number) => void; goalLabel: string; split: string }) {
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.training.title} subtitle={t.training.subtitle} />

      <Group legend={t.legends.days}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.daysQ}</p>
        <Segmented options={DAYS} value={days} onChange={onDays} render={(v) => <span className="text-xl font-black">{toAr(v, lang)}</span>} />
      </Group>

      <Group legend={t.legends.duration}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.durationQ}</p>
        <Segmented options={DURATIONS} value={duration} onChange={onDuration} render={(v) => (
          <>
            <span className="text-lg font-black">{toAr(v, lang)}</span>
            <span className="text-[0.65rem] font-bold text-ink-500">{lang === 'en' ? 'min' : 'د'}</span>
          </>
        )} />
      </Group>

      {/* Live plan summary — updates as choices change. */}
      <div className="v2-info-panel mt-7 overflow-hidden rounded-2xl border p-4">
        <div className="flex items-center gap-2">
          <Icon name="Sparkles" className="h-4 w-4 text-[color:var(--v2-blue)]" />
          <span className="text-sm font-black text-ink-900">{t.training.summaryTitle}</span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <SummaryRow icon="Dumbbell" text={`${lang === 'en' ? `${days}-day split` : `تقسيمة ${toAr(days, lang)} ${t.training.daysUnit}`} · ${split}`} />
          <SummaryRow icon="Clock" text={`${toAr(duration, lang)} ${lang === 'en' ? 'min' : 'دقيقة'} ${t.training.perSession}`} />
          {goalLabel && <SummaryRow icon="Target" text={`${t.training.suitsGoal} ${goalLabel}`} />}
        </div>
      </div>
    </section>
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
              'v2-pressable relative flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center',
              on ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
            )}
          >
            {/* دلالة اختيار غير لونية (WCAG 1.4.1): شارة صح تظهر على المحدَّد فقط. */}
            {on && (
              <span className="v2-choice-icon-selected absolute -top-1.5 -end-1.5 grid h-4 w-4 place-items-center rounded-full" aria-hidden="true">
                <Icon name="Check" className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            <Icon name={o.icon} className={cn('h-6 w-6', on ? 'text-[color:var(--v2-blue)]' : 'text-ink-500')} strokeWidth={2.25} />
            <span className={cn('text-xs font-bold', on ? 'text-ink-900' : 'text-ink-700')}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function EquipmentStep({ t, titleId, place, pref, hasInjury, injuries, onPlace, onPref, onToggleInjury, onInjury }: { t: T; titleId: string; place: string | null; pref: string | null; hasInjury: boolean; injuries: string[]; onPlace: (v: string) => void; onPref: (v: string) => void; onToggleInjury: () => void; onInjury: (v: string) => void }) {
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.equipment.title} subtitle={t.equipment.subtitle} />

      <Group legend={t.legends.place}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.equipment.placeQ}</p>
        <TileGroup options={t.places} value={place} onChange={onPlace} />
      </Group>

      <Group legend={t.legends.pref}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.equipment.prefQ}</p>
        <TileGroup options={t.prefs} value={pref} onChange={onPref} />
      </Group>

      {/* Injury — calm, coach-like, not medical. */}
      <div className="mt-7 rounded-2xl border border-line bg-surface p-4">
        <button type="button" onClick={onToggleInjury} role="switch" aria-checked={hasInjury} className="flex w-full items-center justify-between gap-3 text-start">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink-900">{t.equipment.injuryQ}</span>
            <span className="mt-0.5 block text-xs text-ink-500">{t.equipment.injuryNote}</span>
          </span>
          <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', hasInjury ? 'v2-bg-blue' : 'bg-line')}>
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', hasInjury ? 'start-1' : 'end-1')} />
          </span>
        </button>
        {hasInjury && (
          <Group legend={t.legends.injuries} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {t.injuries.map((inj) => {
              const on = injuries.includes(inj.value)
              return (
                <button
                  key={inj.value}
                  type="button"
                  onClick={() => onInjury(inj.value)}
                  aria-pressed={on}
                  className={cn('v2-pressable rounded-full border px-3.5 py-2 text-sm font-semibold', on ? 'v2-choice-selected text-ink-900' : 'border-line bg-beige text-ink-700')}
                >
                  {inj.label}
                </button>
              )
            })}
          </Group>
        )}
      </div>
    </section>
  )
}

/** Full-screen plan-assembly loading state (a bare button spinner is forbidden). */
function BuildingScreen({ lang, t }: { lang: Lang; t: T }) {
  return (
    <div
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-page px-6 text-center text-ink-900"
    >
      <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary" aria-hidden="true" />
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t.building.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{t.building.subtitle}</p>
      </div>
    </div>
  )
}

/** Visible plan-generation failure with retry — never a silent drop into the app. */
function ErrorScreen({ lang, t, onRetry, onDismiss }: { lang: Lang; t: T; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      <div role="alert" className="flex flex-col items-center">
        <span className="v2-error-panel v2-error-icon grid h-16 w-16 place-items-center rounded-2xl border">
          <Icon name="AlertTriangle" className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight">{t.error.title}</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-500">{t.error.message}</p>
      </div>
      <div className="mt-7 w-full max-w-xs space-y-2.5">
        <button type="button" onClick={onRetry} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow">
          <Icon name="RotateCcw" className="h-5 w-5" />
          {t.error.retry}
        </button>
        <button type="button" onClick={onDismiss} className="w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700">
          {t.back}
        </button>
      </div>
    </div>
  )
}

function ReadyScreen({ lang, t, goalLabel, days, duration, split, placeLabel, busy, onEnter }: { lang: Lang; t: T; goalLabel: string; days: number; duration: number; split: string; placeLabel: string; busy: boolean; onEnter: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} aria-busy={busy} className="v2-surface-light fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-1/2 top-[10%] h-[40%] w-[80%] -translate-x-1/2 rounded-full blur-[2px]" />
      </div>
      <div className="app-container v2-screen-enter relative z-10 flex flex-1 flex-col px-6" style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="v2-earned-moment v2-bg-green grid h-16 w-16 place-items-center rounded-2xl text-white">
            <Icon name="Check" className="h-8 w-8" strokeWidth={3} />
          </span>
          <p className="v2-text-green mt-5 text-xs font-black uppercase tracking-widest">{t.ready.eyebrow}</p>
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
          <button type="button" onClick={onEnter} disabled={busy} aria-busy={busy} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow disabled:opacity-60">
            {t.ready.enter}
          </button>
        </div>
      </div>
    </div>
  )
}
