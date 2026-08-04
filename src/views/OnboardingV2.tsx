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
import { bodyStepStrings } from '@/i18n/dict/bodyStep'
import { goalWordingFor, onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
import {
  AGE_RANGE,
  DAYS,
  DURATIONS,
  LAST_INPUT_STEP,
  canAdvance,
  clearDraftV2,
  finalizeReduce,
  initialDraftV2,
  saveDraftV2,
  validateStep,
  type FinalizeStatus,
  type OnboardingV2Draft,
  type StepValidation,
  type V2Gender,
  type V2Intent,
  type V2Level,
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
// الترتيب: الأساسيات · النية والمستوى · الهدف · التدريب · المعدّات.
const TITLE_ID = ['onb-title-body', 'onb-title-intent', 'onb-title-goal', 'onb-title-training', 'onb-title-equipment'] as const

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
  // 0 الأساسيات · 1 النية والمستوى · 2 الهدف · 3 التدريب · 4 المعدّات · 5 جاهز.
  const [step, setStep] = useState(initialDraft.step)
  const [status, setStatus] = useState<FinalizeStatus>('idle')

  // بيانات الجسم — تُحفظ نصًّا أثناء الكتابة (حالات وسيطة كـ«١» أو «» مسموحة)
  // وتُحوَّل إلى أرقام عند التحقق والحفظ. هكذا لا يُمحى ما يكتبه المستخدم.
  const [ageText, setAgeText] = useState(initialDraft.age == null ? '' : String(initialDraft.age))
  const [gender, setGender] = useState<V2Gender | null>(initialDraft.gender)
  const [heightText, setHeightText] = useState(initialDraft.heightCm == null ? '' : String(initialDraft.heightCm))
  const [weightText, setWeightText] = useState(initialDraft.weightKg == null ? '' : String(initialDraft.weightKg))

  // النية والمستوى — سؤالان قبل الهدف: الأول يحدّد شكل الخطة، والثاني يحدّد
  // **لغة** الأهداف المعروضة (مبتدئ بلغة نتيجة · متقدّم بالمصطلحات القياسية).
  const [intent, setIntent] = useState<V2Intent | null>(initialDraft.intent)
  const [level, setLevel] = useState<V2Level | null>(initialDraft.level)
  const [yearsText, setYearsText] = useState(initialDraft.trainingYears == null ? '' : String(initialDraft.trainingYears))

  const [goal, setGoal] = useState<V2GoalValue | null>(initialDraft.goal)
  const [days, setDays] = useState(initialDraft.days)
  const [duration, setDuration] = useState(initialDraft.duration)
  const [place, setPlace] = useState<string | null>(initialDraft.place)
  const [pref, setPref] = useState<string | null>(initialDraft.pref)
  const [hasInjury, setHasInjury] = useState(initialDraft.hasInjury)
  const [injuries, setInjuries] = useState<string[]>(initialDraft.injuries)
  const [healthDataConsent, setHealthDataConsent] = useState(initialDraft.healthDataConsent)
  const [validation, setValidation] = useState<StepValidation>(null)

  // أرقام الجسم المُحوَّلة (NaN حين يكون الحقل فارغًا أو نصًّا غير رقمي).
  const ageNum = ageText.trim() === '' ? null : Number(ageText)
  const heightNum = heightText.trim() === '' ? null : Number(heightText)
  const weightNum = weightText.trim() === '' ? null : Number(weightText)
  // السنوات اختيارية: فراغ = null (تمرّ)، ونصّ غير رقمي = NaN (يُحجب لا يُبتلع).
  const yearsNum = yearsText.trim() === '' ? null : Number(yearsText)

  // القاصرون (دون 18) — المحافظة فقط.
  // العمر يُجمَع الآن في الخطوة الأولى، فالحاجز يعمل للضيف الجديد أيضًا. سابقًا
  // كان يُستنتج من ملف محفوظ فقط، ما يعني أن كل ضيف جديد يُعامَل كبالغ ويُعرض
  // عليه التنشيف/التضخيم مهما كان عمره — وهو بند امتثال لا خلل وظيفي فحسب.
  const minor = isMinorAge(ageNum ?? customization.profile.age)
  const intentT = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  // صياغة الأهداف تتبع المستوى المُعلن — نفس القيم المخزّنة، لغة مختلفة.
  const goalWording = useMemo(() => goalWordingFor(lang, level), [lang, level])
  const goalLabel = goal ? goalWording[goal].label : ''
  const levelLabel = intentT.levels.find((l) => l.value === level)?.label ?? ''
  const intentLabel = intentT.intents.find((i) => i.value === intent)?.label ?? ''
  const answers = {
    age: ageNum, gender, heightCm: heightNum, weightKg: weightNum,
    intent, level, trainingYears: yearsNum,
    goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, healthDataConsent,
  }

  // Persist the draft on every answer/step change — a reload resumes here.
  // Never while the plan is being built or after a successful finish.
  useEffect(() => {
    if (status === 'building' || status === 'done') return
    const draft: OnboardingV2Draft = { step, age: ageNum, gender, heightCm: heightNum, weightKg: weightNum, intent, level, trainingYears: yearsNum, goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, hasInjury, injuries, healthDataConsent }
    saveDraftV2(draft, userId)
  }, [step, ageNum, gender, heightNum, weightNum, intent, level, yearsNum, goal, days, duration, place, pref, hasInjury, injuries, healthDataConsent, status, userId])

  // Auto-dismiss a shown validation message once the step becomes complete.
  useEffect(() => {
    if (validation && canAdvance(step, answers)) setValidation(null)
    // answers is derived each render; the primitive fields are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, step, intent, level, yearsNum, goal, days, duration, place, pref, healthDataConsent])

  const next = () => {
    const v = validateStep(step, answers)
    if (v) {
      setValidation(v)
      return
    }
    setValidation(null)
    setStep((s) => Math.min(LAST_INPUT_STEP + 1, s + 1))
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
        const built0 = toAnswersFromV2({ age: ageNum, gender, heightCm: heightNum, weightKg: weightNum, intent, level, trainingYears: yearsNum, goal, days, duration, place: place as V2Place | null, pref: pref as V2Pref | null, injuries: hasInjury ? injuries : [], healthDataConsent })
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
  if (step === LAST_INPUT_STEP + 1) {
    return (
      <>
        <ReadyScreen
          lang={lang}
          t={t}
          goalLabel={goalLabel}
          days={days}
          duration={duration}
          split={splitFor(days, lang)}
          placeLabel={t.places.find((p) => p.value === place)?.label ?? ''}
          levelRow={levelLabel ? intentT.summaryLevel(levelLabel) : ''}
          focusRow={intentLabel ? intentT.summaryFocus(intentLabel) : ''}
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
          {/* عدّاد الخطوات من قاموس هذه الموجة: عدد الخطوات صار خمسًا، والنص
              المركزي في labels.ts مثبَّت على «من ٤» — فلا نعدّل قاموسًا مشتركًا. */}
          <span className="text-sm font-bold text-ink-500">{intentT.stepOf(toAr(step + 1, lang), toAr(LAST_INPUT_STEP + 1, lang))}</span>
          <span className="h-11 w-11" />
        </div>
        <div className="mx-auto mt-3 flex w-full max-w-md gap-1.5">
          {Array.from({ length: LAST_INPUT_STEP + 1 }, (_, i) => i).map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'v2-bg-blue' : 'bg-line')} />
          ))}
        </div>
      </header>

      {/* Content — each step is a region named by its heading. */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="v2-screen-enter mx-auto w-full max-w-md">
          {step === 0 && (
            <BodyStep
              lang={lang}
              titleId={stepTitleId}
              age={ageText}
              gender={gender}
              heightCm={heightText}
              weightKg={weightText}
              healthDataConsent={healthDataConsent}
              onConsent={setHealthDataConsent}
              onAge={(v) => { setAgeText(v); setValidation(null) }}
              onGender={(g) => { setGender(g); setValidation(null) }}
              onHeight={(v) => { setHeightText(v); setValidation(null) }}
              onWeight={(v) => { setWeightText(v); setValidation(null) }}
            />
          )}
          {step === 1 && (
            <IntentStep
              lang={lang}
              titleId={stepTitleId}
              intent={intent}
              level={level}
              years={yearsText}
              onIntent={(v) => { setIntent(v); setValidation(null) }}
              // اختيار «مبتدئ» يُلغي السنوات: الحقل لا يُعرض له، فبقاء قيمة
              // مخفيّة تؤثّر على الخبرة إدخال شبح.
              onLevel={(v) => { setLevel(v); if (v === 'beginner') setYearsText(''); setValidation(null) }}
              onYears={(v) => { setYearsText(v); setValidation(null) }}
            />
          )}
          {step === 2 && <GoalStep lang={lang} t={t} titleId={stepTitleId} goal={goal} wording={goalWording} isMinor={minor} onPick={(g) => { if (minor && (g === 'cut' || g === 'bulk')) return; setGoal(g); setValidation(null) }} />}
          {step === 3 && (
            <TrainingStep t={t} titleId={stepTitleId} lang={lang} days={days} duration={duration} onDays={setDays} onDuration={setDuration} goalLabel={goalLabel} split={splitFor(days, lang)} />
          )}
          {step === 4 && (
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
              <span>
                {validation === 'healthConsent'
                  ? policyCopy[lang].healthConsentRequired
                  : validation === 'intentLevel'
                    ? intentT.validation
                    : t.validation[validation]}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={next}
            aria-disabled={!canAdvance(step, answers)}
            className="btn-primary w-full py-4 text-[1.1875rem]"
          >
            {step === LAST_INPUT_STEP ? t.equipment.cta : t.next}
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

/**
 * حقل رقمي واحد من خطوة الجسد.
 *
 * `inputMode="numeric"` لا `type="number"`: يفتح لوحة أرقام على الجوال بلا
 * أسهم زيادة/نقصان ولا تمرير عجلة يغيّر القيمة بالخطأ. والقيمة تبقى نصًّا
 * أثناء الكتابة كي لا يُمحى ما يكتبه المستخدم عند حالة وسيطة غير صالحة.
 */
function NumField({
  id, label, unit, placeholder, value, onChange,
}: { id: string; label: string; unit: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[0.82rem] font-bold text-ink-700">{label}</span>
      <span className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-ink-400">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // ≥16px يمنع تكبير iOS التلقائي عند التركيز.
          className="min-w-0 flex-1 bg-transparent text-[1rem] font-bold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
        />
        <span className="shrink-0 text-[0.8rem] font-bold text-ink-500">{unit}</span>
      </span>
    </label>
  )
}

/**
 * الخطوة الأولى — بيانات الجسم.
 *
 * كانت غائبة تمامًا: التدفّق لا يسأل العمر ولا الجنس ولا الطول ولا الوزن،
 * فتسقط كلها على قيم افتراضية ثابتة (٢٥ سنة · ١٧٠سم · ٧٥كجم) — أي **نفس BMR
 * لكل مستخدمي التطبيق**. وبلا عمر، حاجز القاصرين لا يُفعَّل أصلًا.
 */
function BodyStep({
  lang, titleId, age, gender, heightCm, weightKg, healthDataConsent, onAge, onGender, onHeight, onWeight, onConsent,
}: {
  lang: Lang; titleId: string
  age: string; gender: V2Gender | null; heightCm: string; weightKg: string; healthDataConsent: boolean
  onAge: (v: string) => void; onGender: (g: V2Gender) => void; onHeight: (v: string) => void; onWeight: (v: string) => void
  onConsent: (checked: boolean) => void
}) {
  const s = bodyStepStrings[lang]
  const policy = policyCopy[lang]
  const parsedAge = Number(age)
  const showMinorNote = Number.isFinite(parsedAge) && parsedAge >= AGE_RANGE.min && parsedAge < 18
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.title} subtitle={s.subtitle} />

      {/* الموافقة الصحية **قبل** أي حقل — الإذن يسبق الجمع لا يليه. */}
      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm leading-relaxed text-ink-500">{policy.healthExplanation}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-start text-sm font-bold leading-relaxed text-ink-900">
          <input type="checkbox" checked={healthDataConsent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span>{policy.healthConsent} · <a href={POLICY_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="text-[color:var(--v2-blue)] underline underline-offset-2">{policy.privacy}</a></span>
        </label>
      </div>

      <Group legend={s.title} className="mt-5 block space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField id="v2-body-age" label={s.ageLabel} unit={s.ageUnit} placeholder={s.agePlaceholder} value={age} onChange={onAge} />
          <NumField id="v2-body-height" label={s.heightLabel} unit={s.heightUnit} placeholder={s.heightPlaceholder} value={heightCm} onChange={onHeight} />
        </div>
        <NumField id="v2-body-weight" label={s.weightLabel} unit={s.weightUnit} placeholder={s.weightPlaceholder} value={weightKg} onChange={onWeight} />

        <div>
          <span className="mb-1.5 block text-[0.82rem] font-bold text-ink-700">{s.genderLabel}</span>
          <div className="flex gap-3">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGender(g)}
                aria-pressed={gender === g}
                className={cn(
                  'min-h-[44px] flex-1 rounded-2xl border px-4 py-3 text-[0.9rem] font-bold transition',
                  gender === g ? 'border-ink-900 bg-ink-900 text-page' : 'border-line bg-surface text-ink-700',
                )}
              >
                {g === 'male' ? s.genderMale : s.genderFemale}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.78rem] leading-snug text-ink-500">{s.genderNote}</p>
        </div>
      </Group>

      {showMinorNote && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
          {s.minorNote}
        </p>
      )}

      <p className="mt-5 text-[0.8rem] leading-relaxed text-ink-500">{s.whyNote}</p>
    </section>
  )
}

/**
 * صف اختيار واحد بعنوان ووصف — يُستخدم للنية والمستوى.
 * هدف لمس ≥44px، ودلالة اختيار غير لونية (شارة صح) لا لونًا فقط (WCAG 1.4.1).
 */
function ChoiceRow({ label, desc, icon, selected, onSelect }: { label: string; desc: string; icon: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'v2-pressable relative flex min-h-[44px] w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-start',
        selected ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
      )}
    >
      <span className={cn('absolute inset-y-0 start-0 w-1 transition-colors', selected ? 'v2-choice-accent' : 'bg-transparent')} />
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors', selected ? 'v2-choice-icon-selected' : 'bg-beige text-ink-500')}>
        <Icon name={icon} className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-black text-ink-900">{label}</span>
        <span className="mt-0.5 block text-[0.78rem] leading-snug text-ink-500">{desc}</span>
      </span>
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', selected ? 'v2-choice-icon-selected border-[color:var(--v2-blue)]' : 'border-line text-transparent')}>
        <Icon name="Check" className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  )
}

/**
 * الخطوة الثانية — النية والمستوى.
 *
 * سؤالان **يغيّران المخرجات فعلًا**، لا تجميل:
 *   • النية ⇒ أسلوب التغذية (اقتراح وجبات / أرقام فقط / إرشاد مبسّط).
 *   • المستوى (+ السنوات اختياريًا) ⇒ مستوى الخبرة ⇒ عدد تمارين الجلسة وتثبيت
 *     التقسيمة على «تلقائي» للمبتدئ، **و**لغة الأهداف في الخطوة التالية.
 *
 * لماذا هنا لا في الموضع الأول؟ الموضع الأول يملكه حاجز الموافقة الصحية — انظر
 * التعليق المطوّل فوق `validateStep` في `onboardingV2Flow.ts`.
 */
function IntentStep({
  lang, titleId, intent, level, years, onIntent, onLevel, onYears,
}: {
  lang: Lang; titleId: string
  intent: V2Intent | null; level: V2Level | null; years: string
  onIntent: (v: V2Intent) => void; onLevel: (v: V2Level) => void; onYears: (v: string) => void
}) {
  const s = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  // السنوات تُسأل لغير المبتدئ فقط — المبتدئ بلا سنوات يُذكرها أصلًا.
  const showYears = level === 'intermediate' || level === 'advanced'
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.title} subtitle={s.subtitle} />

      <Group legend={s.legends.intent} className="block">
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{s.intentQ}</p>
        <div className="space-y-2.5">
          {s.intents.map((o) => (
            <ChoiceRow key={o.value} label={o.label} desc={o.desc} icon={o.icon} selected={intent === o.value} onSelect={() => onIntent(o.value)} />
          ))}
        </div>
      </Group>

      <Group legend={s.legends.level} className="block">
        <p className="mt-7 mb-3 text-sm font-bold text-ink-700">{s.levelQ}</p>
        <div className="space-y-2.5">
          {s.levels.map((o) => (
            <ChoiceRow key={o.value} label={o.label} desc={o.desc} icon={o.icon} selected={level === o.value} onSelect={() => onLevel(o.value)} />
          ))}
        </div>
      </Group>

      {showYears && (
        <div className="mt-5">
          <NumField id="v2-training-years" label={s.yearsLabel} unit={s.yearsUnit} placeholder={s.yearsPlaceholder} value={years} onChange={onYears} />
          <p className="mt-2 text-[0.78rem] leading-snug text-ink-500">{s.yearsNote}</p>
        </div>
      )}
    </section>
  )
}

function GoalStep({ lang, t, titleId, goal, wording, isMinor, onPick }: { lang: Lang; t: T; titleId: string; goal: V2GoalValue | null; wording: Record<V2GoalValue, { label: string; desc: string }>; isMinor: boolean; onPick: (g: V2GoalValue) => void }) {
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.goal.title} />
      <Group legend={t.legends.goal} className="mt-6 block space-y-3">
        {/* القيم والأيقونات من النموذج المركزي؛ **الصياغة** من قاموس المستوى. */}
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
                <span className="block text-lg font-black text-ink-900">{wording[g.value].label}</span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-500">{wording[g.value].desc}</span>
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

function ReadyScreen({ lang, t, goalLabel, days, duration, split, placeLabel, levelRow, focusRow, busy, onEnter }: { lang: Lang; t: T; goalLabel: string; days: number; duration: number; split: string; placeLabel: string; levelRow: string; focusRow: string; busy: boolean; onEnter: () => void }) {
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
            {/* المستوى والنية يظهران في الملخّص — إجابة تراها في المخرجات. */}
            {levelRow && <SummaryRow icon="Trophy" text={levelRow} />}
            {focusRow && <SummaryRow icon="Compass" text={focusRow} />}
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
