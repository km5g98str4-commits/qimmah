import { useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { warmupStrings } from '@/i18n/dict/warmup'
import type { WarmupPlan } from '@/lib/warmupPlan'

/**
 * شاشة الإحماء — [SOVEREIGN-TODAY-001] المهمّة ١.
 *
 * **أول مرحلة في الجلسة، لا بطاقة داخلها.** المسار صار يُقرأ:
 * «إحماء ← التمارين ← الإنهاء»، والمؤشّر أعلى الشاشة يقول أين نحن.
 * قبل هذه الشاشة كانت الجلسة تبدأ بالمجموعة العاملة الأولى مباشرةً بينما
 * «اليوم» يَعِد بإحماء — فالوعد يُسلَّم الآن قبل أول مجموعة عمل حرفيًّا.
 *
 * **التخطّي مسموح ومُعلَن.** من يتخطّى لا يُحسب له إحماء (النصّ يقولها، والكود
 * لا يستدعي `completeFirstWin('warmup')`) — فلا نُبلّغ نجاحًا لم يقع (§6-٤).
 */
interface WarmupScreenProps {
  lang: Lang
  plan: WarmupPlan
  dayNameAr: string
  dayNameEn: string
  onStart: () => void
  onSkip: () => void
  onDisable: () => void
}

export function WarmupScreen({ lang, plan, dayNameAr, dayNameEn, onStart, onSkip, onDisable }: WarmupScreenProps) {
  const ar = lang !== 'en'
  const w = warmupStrings[lang] ?? warmupStrings.ar
  const startRef = useRef<HTMLButtonElement>(null)

  // التركيز يبدأ على الفعل الأساسي — الشاشة مرحلة لا تحذير.
  useEffect(() => {
    startRef.current?.focus()
  }, [])

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      data-warmup-screen
      className="flex h-full flex-col overflow-y-auto bg-page px-4 pb-6 pt-4 text-ink-900"
      style={{ paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}
    >
      <div className="mx-auto w-full max-w-md">
        {/* مؤشّر المراحل — الجلسة تُقرأ كمسار: إحماء ← تمارين ← إنهاء. */}
        <ol
          aria-label={w.ariaStage(1, 3)}
          className="flex items-center gap-1.5 text-[11px] font-black"
        >
          {[w.stageWarmup, w.stageExercises, w.stageFinish].map((stage, i) => (
            <li key={stage} className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                aria-current={i === 0 ? 'step' : undefined}
                className={`min-w-0 flex-1 truncate rounded-full px-2.5 py-1.5 text-center ${
                  i === 0 ? 'bg-primary text-white' : 'bg-surface text-ink-400'
                }`}
              >
                {stage}
              </span>
            </li>
          ))}
        </ol>

        <header className="mt-5">
          <h2 className="text-2xl font-black leading-tight tracking-tight">{w.title}</h2>
          <p className="mt-1 text-base leading-relaxed text-ink-500">{w.subtitle}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Icon name="Clock" className="h-4 w-4 shrink-0" aria-hidden="true" />
              {w.estimate(plan.estMinutes)}
            </span>
            <span aria-hidden="true">·</span>
            <bdi className="min-w-0 truncate">{ar ? dayNameAr : dayNameEn}</bdi>
          </p>
        </header>

        <ol className="mt-5 space-y-2">
          {plan.steps.map((step, i) => (
            <li
              key={`${step.exerciseId}-${step.label}-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[11px] font-black text-primary-c">
                {w.stepLabel[step.label]}
              </span>
              <span className="min-w-0 flex-1">
                <bdi className="block truncate text-base font-bold leading-snug">
                  {ar ? step.nameAr : step.nameEn}
                </bdi>
                <span className="block text-sm font-bold text-ink-500 tabular-nums">
                  {step.kind === 'ramp' && step.weightKg !== undefined
                    ? w.loadLine(step.weightKg, step.reps)
                    : w.lightLine(step.reps)}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-2">
          <button
            ref={startRef}
            type="button"
            onClick={onStart}
            data-testid="warmup-start"
            className="btn-primary min-h-[52px] w-full py-3"
          >
            <Icon name="Flame" className="h-4 w-4" aria-hidden="true" />
            {w.startCta}
          </button>
          <button
            type="button"
            onClick={onSkip}
            data-testid="warmup-skip"
            className="tap-target w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700"
          >
            {w.skipCta}
          </button>
          <p className="text-center text-xs leading-relaxed text-ink-400">{w.skipNote}</p>
          <button
            type="button"
            onClick={onDisable}
            data-testid="warmup-disable"
            className="tap-target mx-auto inline-flex items-center px-3 text-xs font-bold text-ink-400 underline underline-offset-4"
          >
            {w.hideForever}
          </button>
        </div>
      </div>
    </div>
  )
}
