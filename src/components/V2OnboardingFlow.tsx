import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { designV2Onboarding as copy } from '@/config/designV2'
import type { Environment } from '@/types/onboarding'
import type { GoalValue } from '@/data/planBuilder'
import type { Answers } from '@/lib/planBuilderAnswers'
import { buildOnboardingProfile, defaultAnswers } from '@/lib/planBuilderAnswers'
import { buildCustomizationFromOnboarding, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { loadDraft, markCompleted, saveDraft, setLastStep } from '@/lib/onboarding'
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'

interface V2OnboardingFlowProps { onComplete: () => void; onExit: () => void }
type FlowStatus = 'default' | 'loading' | 'error'

export function V2OnboardingFlow({ onComplete, onExit }: V2OnboardingFlowProps) {
  const { customization, applyCustomization } = useCustomization()
  const userId = useAuth().user?.id ?? null
  const [answers, setAnswers] = useState<Answers>(() => ({ ...defaultAnswers, ...loadDraft<Partial<Answers>>(userId) }))
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<FlowStatus>('default')
  const [built, setBuilt] = useState<typeof customization | null>(null)
  const total = 4

  const goal = copy.goal.options.find((item) => item.value === answers.goalValue)
  const place = copy.equipment.options.find((item) => item.value === answers.environment)
  const valid = step === 0 ? Boolean(answers.goalValue) : step === 2 ? Boolean(answers.environment) : true

  useEffect(() => { saveDraft(answers, userId); setLastStep(step) }, [answers, step, userId])

  const assemble = useCallback(async () => {
    setStatus('loading')
    setBuilt(null)
    try {
      const profile = buildOnboardingProfile(answers)
      const buildPromise = buildCustomizationFromOnboarding(profile, customization)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const minimumStatus = reduceMotion ? Promise.resolve() : new Promise((resolve) => window.setTimeout(resolve, 800))
      const [next] = await Promise.all([buildPromise, minimumStatus])
      saveOnboardingProfile(profile)
      setBuilt(next)
      setStatus('default')
    } catch {
      setStatus('error')
    }
  }, [answers, customization])

  useEffect(() => { if (step === 3) void assemble() }, [assemble, step])

  const advance = async () => {
    if (!valid) { setStatus('error'); return }
    setStatus('loading')
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise((resolve) => window.setTimeout(resolve, 160))
    setStatus('default')
    setStep((current) => Math.min(3, current + 1))
  }

  const finish = () => {
    if (!built) return
    applyCustomization(built)
    const profile = buildOnboardingProfile(answers)
    markCompleted(userId, 3)
    if (userId) void persistOnboardingToProfile(userId, profile)
    onComplete()
  }

  const errorText = step === 0 ? copy.goal.error : step === 1 ? copy.reality.error : step === 2 ? copy.equipment.error : copy.assembly.error
  const content = useMemo(() => {
    if (step === 0) return <ChoiceList label={copy.goal.title} items={copy.goal.options} value={answers.goalValue} onChange={(value) => setAnswers((a) => ({ ...a, goalValue: value as GoalValue }))} />
    if (step === 1) return (
      <div className="space-y-7">
        <ChoiceList compact label={copy.reality.daysLabel} items={copy.reality.days.map((value) => ({ value, label: String(value), description: copy.reality.dayUnit }))} value={answers.trainingDays} onChange={(value) => setAnswers((a) => ({ ...a, trainingDays: Number(value), daysTouched: true }))} />
        <ChoiceList compact label={copy.reality.durationLabel} items={copy.reality.durations.map((value) => ({ value, label: String(value), description: copy.reality.minuteUnit }))} value={answers.sessionDurationMin} onChange={(value) => setAnswers((a) => ({ ...a, sessionDurationMin: Number(value) }))} />
      </div>
    )
    if (step === 2) return <ChoiceList label={copy.equipment.title} items={copy.equipment.options} value={answers.environment} onChange={(value) => setAnswers((a) => ({ ...a, environment: value as Environment }))} />
    return null
  }, [answers, step])

  const section = step === 0 ? copy.goal : step === 1 ? copy.reality : step === 2 ? copy.equipment : copy.assembly
  const screenTitle = step === 0 ? copy.goal.title : step === 1 ? copy.reality.title : copy.equipment.title
  const screenHint = step === 0 ? copy.goal.hint : step === 1 ? copy.reality.hint : copy.equipment.hint
  return (
    <main className="v2-onboarding" dir="rtl" aria-busy={status === 'loading'}>
      <header className="v2-onboarding__header">
        <button type="button" className="v2-onboarding__back" onClick={step === 0 ? onExit : () => { setStatus('default'); setStep((s) => s - 1) }} aria-label={copy.back}><Icon name="ChevronRight" className="h-5 w-5" /></button>
        <p>{copy.progressLabel} <span>{step + 1}/{total}</span></p>
      </header>
      <div className="v2-onboarding__progress" aria-hidden="true"><span style={{ inlineSize: `${((step + 1) / total) * 100}%` }} /></div>
      <section className="v2-onboarding__body" aria-labelledby="v2-onboarding-title">
        <p className="v2-onboarding__eyebrow">{section.eyebrow}</p>
        {step < 3 && <><h1 id="v2-onboarding-title">{screenTitle}</h1><p className="v2-onboarding__hint">{screenHint}</p><div className="mt-7">{content}</div></>}
        {step === 3 && <Assembly status={status} goal={goal?.label ?? ''} schedule={`${answers.trainingDays} ${copy.reality.dayUnit} · ${answers.sessionDurationMin} ${copy.reality.minuteUnit}`} place={place?.label ?? ''} onRetry={() => void assemble()} />}
      </section>
      <footer className="v2-onboarding__footer">
        {status === 'error' && <p role="alert" className="v2-onboarding__error"><Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />{errorText}</p>}
        {step < 3 && <button type="button" className="v2-btn-primary w-full" onClick={() => void advance()} disabled={status === 'loading'} aria-busy={status === 'loading'}>{status === 'loading' ? copy.assembly.loadingTitle : copy.next}</button>}
        {step === 3 && built && status === 'default' && <button type="button" className="v2-btn-primary w-full" onClick={finish}>{copy.assembly.start}</button>}
      </footer>
    </main>
  )
}

interface ChoiceItem { value: string | number; label: string; description: string; icon?: string }
function ChoiceList({ label, items, value, onChange, compact = false }: { label: string; items: readonly ChoiceItem[]; value?: string | number; onChange: (value: string | number) => void; compact?: boolean }) {
  return <fieldset><legend className="sr-only">{label}</legend><div className={compact ? 'grid grid-cols-4 gap-2' : 'space-y-3'}>{items.map((item) => <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className={cn('v2-onboarding__choice', compact && 'v2-onboarding__choice--compact', value === item.value && 'is-selected')}>{item.icon && <Icon name={item.icon} className="h-5 w-5 shrink-0" />}<span><strong>{item.label}</strong><small>{item.description}</small></span><Icon name="Check" className="v2-onboarding__check h-4 w-4" /></button>)}</div></fieldset>
}

function Assembly({ status, goal, schedule, place, onRetry }: { status: FlowStatus; goal: string; schedule: string; place: string; onRetry: () => void }) {
  if (status === 'loading') return <div className="v2-onboarding__assembly" role="status" aria-live="polite"><span className="v2-onboarding__spinner"><Icon name="Sparkles" className="h-7 w-7" /></span><h1 id="v2-onboarding-title">{copy.assembly.loadingTitle}</h1><p>{copy.assembly.loadingBody}</p></div>
  if (status === 'error') return <div className="v2-onboarding__assembly"><Icon name="AlertTriangle" className="h-9 w-9 text-[var(--v2-error)]" /><h1 id="v2-onboarding-title">{copy.assembly.error}</h1><button type="button" className="v2-onboarding__retry" onClick={onRetry}>{copy.retry}</button></div>
  return <div><h1 id="v2-onboarding-title">{copy.assembly.readyTitle}</h1><p className="v2-onboarding__hint">{copy.assembly.readyBody}</p><dl className="v2-onboarding__summary"><div><dt>{copy.assembly.goalLabel}</dt><dd>{goal}</dd></div><div><dt>{copy.assembly.scheduleLabel}</dt><dd>{schedule}</dd></div><div><dt>{copy.assembly.placeLabel}</dt><dd>{place}</dd></div></dl></div>
}
