import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { SETUP_FOCUS_KEY } from '@/lib/setupFocus'
import { cn } from '@/lib/cn'
import { type Customization, getDefaultCustomization, isExistingPlanEdit } from '@/lib/customization'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted, restartOnboarding, setLastStep } from '@/lib/onboarding'
import { useAuth } from '@/lib/authContext'
import { useAccess } from '@/lib/access/useAccess'
import type { WizardCtx } from '@/components/customizer/stepProps'
import { PreviewSummary } from '@/components/customizer/PreviewSummary'
import { StepWelcome } from '@/components/customizer/steps/StepWelcome'
import { StepBody } from '@/components/customizer/steps/StepBody'
import { StepGeneratePlan } from '@/components/customizer/steps/StepGeneratePlan'
import { StepSmartCalculations } from '@/components/customizer/steps/StepSmartCalculations'
import { StepWorkoutTemplate } from '@/components/customizer/steps/StepWorkoutTemplate'
import { StepNutrition } from '@/components/customizer/steps/StepNutrition'
import { StepWellness } from '@/components/customizer/steps/StepWellness'
import { StepCommitments } from '@/components/customizer/steps/StepCommitments'
import { StepMeasurements } from '@/components/customizer/steps/StepMeasurements'
import { StepSections } from '@/components/customizer/steps/StepSections'
import { StepReview } from '@/components/customizer/steps/StepReview'
import { isProfileValid } from '@/lib/validation'
import { useLang } from '@/i18n'
import { onboardingStrings, type OnboardingStrings } from '@/i18n/dict/onboarding'

interface CustomizationCenterProps {
  /** يُستدعى عند الإغلاق؛ completed=true عند «حفظ وإغلاق» لعرض تأكيد النجاح. */
  onBack: (completed?: boolean) => void
  /** الخطوة التي يبدأ منها المعالج (لاستئناف الإعداد غير المكتمل). */
  initialStep?: number
  /** onboarding = تدفّق موجّه يولّد الخطة · advanced = محرّرات متقدمة. */
  mode?: 'onboarding' | 'advanced'
}

type StepDef = {
  titleKey: keyof OnboardingStrings
  Component: (p: { ctx: WizardCtx }) => JSX.Element
  validate?: (d: Customization) => boolean
}

const onboardingSteps: StepDef[] = [
  { titleKey: 'ccWelcome', Component: StepWelcome, validate: (d) => d.identity.userName.trim().length > 0 },
  { titleKey: 'ccBody', Component: StepBody, validate: (d) => isProfileValid(d.profile) },
  { titleKey: 'ccPlan', Component: StepGeneratePlan },
  { titleKey: 'ccWellness', Component: StepWellness },
  { titleKey: 'ccMeasurements', Component: StepMeasurements },
  { titleKey: 'ccReview', Component: StepReview },
]

// تعديل الخطة (متقدّم) — يُقسَّم لتقليل الزحام:
//  - الأساسيات: ما يحتاجه المبتدئ فعلًا (بياناته + التمرين + الأكل).
//  - الإضافات: ضبط نادر الاستخدام يُكشف خلف زرّ «خيارات متقدّمة».
const advancedEssentialSteps: StepDef[] = [
  { titleKey: 'ccBody', Component: StepBody, validate: (d) => isProfileValid(d.profile) },
  { titleKey: 'ccWorkoutTemplate', Component: StepWorkoutTemplate },
  { titleKey: 'ccNutrition', Component: StepNutrition },
]

const advancedExtraSteps: StepDef[] = [
  { titleKey: 'ccSmartCalc', Component: StepSmartCalculations },
  { titleKey: 'ccWellness', Component: StepWellness },
  { titleKey: 'ccMeasurements', Component: StepMeasurements },
  { titleKey: 'ccCommitments', Component: StepCommitments },
  { titleKey: 'ccSections', Component: StepSections },
]

const advancedReviewStep: StepDef = { titleKey: 'ccReview', Component: StepReview }

/** مركز التخصيص — معالج إعداد شخصي خطوة بخطوة (بلا backend، يُحفظ على الجهاز). */
export function CustomizationCenter({ onBack, initialStep = 0, mode = 'onboarding' }: CustomizationCenterProps) {
  const lang = useLang()
  const d = onboardingStrings[lang]
  const { customization, applyCustomization, applyPlanEdit, resetCustomization } = useCustomization()
  const { guard: guardPaid } = useAccess()
  const auth = useAuth()
  // المالك الحالي — الإكمال/إعادة التشغيل يُنسبان للحساب لا للجهاز.
  const userId = auth.user?.id ?? null
  // الخيارات المتقدّمة في «تعديل خطتي» مطويّة بالافتراض (تقليل التعقيد).
  // [CTO-65] البند ٨ — نيّة فتح موضعية: زرّ «تعديل» في بطاقة المكمّلات والأدوية
  // (ProfileV2) يكتب هذا المفتاح قبل التنقّل، فيفتح المعالج على خطوة الروتين بدل
  // أوّله. يُقرأ مرّة واحدة ويُمسح فورًا فلا يعلق على فتحات لاحقة. نفس نمط
  // `qimmah:quick-log-intent` القائم — لا آلية جديدة.
  //
  // ⚠️ [QA-27] — كان `useMemo` يقرأ النيّة **ويمسحها داخله**: أثر جانبي في حساب
  // يُفترض أنه نقيّ. و`<StrictMode>` يستدعي الحساب **مرّتين** في التطوير عمدًا
  // لكشف هذا بالضبط: الاستدعاء الأول يقرأ `'wellness'` ويمسحها، والثاني يقرأ
  // `null` — وهي المحتفَظ بها، فتضيع الوجهة. الإنتاج يستدعيها مرّة فيمرّ سليمًا،
  // فيبقى العطل مخفيًا حتى يتحقّق أحدهم على خادم التطوير فيراه مكسورًا.
  //
  // العلاج: **قراءة نقيّة** بلا مسح — فتكرارها يعطي نفس القيمة مهما استُدعيت —
  // والمسح في `useEffect` بعد التثبيت.
  //
  // ⚠️ ولا يكفي نقل الحساب إلى مُهيّئ `useState` مع إبقاء المسح داخله: React 18
  // يُكرّر **مُهيّئات `useState`/`useMemo` كليهما** تحت StrictMode، فيبقى نفس
  // العطل بشكل آخر. النقاء نفسه هو الإصلاح لا نوع الخطّاف.
  const [focusIntent] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage.getItem(SETUP_FOCUS_KEY)
    } catch {
      return null
    }
  })
  // المسح أثر جانبي فموضعه بعد التثبيت. تكراره تحت StrictMode غير ضارّ (مُتَعادِد):
  // القيمة التُقطت في الحالة أصلًا، والمفتاح يُمسح مرّة أو مرّتين بنفس النتيجة.
  useEffect(() => {
    if (!focusIntent) return
    try {
      window.sessionStorage.removeItem(SETUP_FOCUS_KEY)
    } catch {
      /* تجاهل — النيّة استُهلكت في الحالة بالفعل */
    }
  }, [focusIntent])
  // خطوة الروتين تقع في «الخيارات المتقدّمة» المطويّة افتراضيًا — فالنيّة تفتحها،
  // وإلا وصل المستخدم لمعالج لا تظهر فيه الخطوة المقصودة أصلًا.
  const [showAdvanced, setShowAdvanced] = useState(focusIntent === 'wellness')
  const steps = useMemo<StepDef[]>(() => {
    if (mode !== 'advanced') return onboardingSteps
    return showAdvanced
      ? [...advancedEssentialSteps, ...advancedExtraSteps, advancedReviewStep]
      : [...advancedEssentialSteps, advancedReviewStep]
  }, [mode, showAdvanced])
  const [data, setData] = useState<Customization>(() => customization)
  const [step, setStep] = useState(() => {
    // النيّة الموضعية تسبق initialStep: نبحث عن الخطوة بمفتاح عنوانها لا برقم ثابت،
    // فإعادة ترتيب الخطوات لاحقًا لا تكسر الوجهة (رقم صلب كان سيصير خاطئًا بصمت).
    if (focusIntent === 'wellness') {
      const i = steps.findIndex((s) => s.titleKey === 'ccWellness')
      if (i >= 0) return i
    }
    return Math.min(Math.max(0, initialStep), steps.length - 1)
  })
  const [saved, setSaved] = useState(false)
  const stepValid = !steps[step].validate || steps[step].validate!(data)
  // أول خطوة مطلوبة غير مكتملة (-1 إذا كل الخطوات صالحة).
  const firstInvalidIndex = steps.findIndex((s) => s.validate && !s.validate(data))
  const allValid = firstInvalidIndex === -1
  // يُسمح بالقفز عبر الشِّيپس للخلف بحرّية، وللأمام فقط حتى أول خطوة ناقصة (لا تجاوزها).
  const canReachStep = (i: number) => allValid || i <= firstInvalidIndex

  // تذكّر آخر خطوة (يسمح باستئناف الإعداد لاحقًا) دون المساس بحالة الإكمال
  useEffect(() => {
    setLastStep(step)
  }, [step])

  const isFirst = step === 0
  const isLast = step === steps.length - 1
  const progress = Math.round(((step + 1) / steps.length) * 100)

  const update = (partial: Partial<Customization>) => {
    setData((prev) => ({ ...prev, ...partial }))
    setSaved(false)
  }
  const updateIdentity = (partial: Partial<Customization['identity']>) =>
    update({ identity: { ...data.identity, ...partial } })
  const updateColors = (partial: Partial<Customization['colors']>) =>
    update({ colors: { ...data.colors, ...partial } })

  // تنزيل نسخة احتياطية على جهاز المستخدم
  const onExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qimmah-plan.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  // استعادة من ملف نسخة الخطة (`qimmah-plan.json`).
  // ملاحظة (QEA-001 / دفاع في العمق): هذا مسار استعادة *مسودّة الخطة* داخل المعالج — يكتب في
  // حالة React فقط ولا يُثبَّت إلا بحفظ صريح، ولا يمسّ متاجر البيانات المرتبطة بالمالك (السجل/
  // القياسات/الجلسات) ولا رمز الجلسة. مع ذلك نحرس المُدخل: reviver يرفض تلويث النموذج
  // (`__proto__`/`constructor`/`prototype`) في أي عمق، ونتحقّق أنّه كائن Customization فعلي.
  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result), (key, value) => {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined
          return value
        }) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
        const p = parsed as Partial<Customization>
        setData((prev) => ({
          ...prev,
          ...p,
          identity: { ...prev.identity, ...(p.identity ?? {}) },
          colors: { ...prev.colors, ...(p.colors ?? {}) },
        }))
        setSaved(false)
      } catch {
        /* ملف غير صالح — تجاهل */
      }
    }
    reader.readAsText(file)
  }
  const onReset = () => {
    resetCustomization()
    setData(getDefaultCustomization())
    setStep(0)
    setSaved(false)
  }
  // إعادة تشغيل الإعداد الأولي — لا يمسح بيانات التخصيص
  const onRestartOnboarding = () => {
    restartOnboarding(userId)
    setStep(0)
    setSaved(false)
  }

  const ctx: WizardCtx = {
    lang,
    data,
    // [CTO-65] البند ٤ — المرجع المحفوظ لعرض «كان → صار» في المراجعة.
    // `customization` من السياق هو آخر ما حُفظ فعلًا؛ `data` نسخة العمل.
    saved: customization,
    update,
    updateIdentity,
    updateColors,
    onExport,
    onImportFile,
    onReset,
    onRestartOnboarding,
  }

  /**
   * [REL-002] مسارا الحفظ في «تعديل خطتي» — **كلاهما فعل مدفوع واحد**.
   *
   * كان `saveDraft` و`saveAndClose` يكتبان الخطة مباشرةً، فيغيّر مستخدم المعاينة
   * هدفه من «تنشيف» إلى «تضخيم» **ويبقى التغيير بعد التحديث**. الزرّ الظاهر لم يكن
   * العطل — العطل أن **الكتابة نفسها** لم تكن تمرّ بسلطة. ولذلك لا يكفي لفّ زرّ
   * واحد: كل مسار يُنتج خطة محفوظة يمرّ من `plan.saveEdit` ولا استثناء.
   *
   * الحارس هنا واجهة (يفتح بوّابة Premium القانونية بدل التنفيذ)، و`applyPlanEdit`
   * هو الحماية (يرمي قبل الحالة والتخزين). ولا بوّابة جديدة ولا تنفيذ ثانٍ للحجب.
   */
  // ── [FINAL-CONVERGENCE] ثلاث طبقات، وحدٌّ واحد يفصل المجّاني عن المدفوع ──────
  //  ① المعالج هنا يفتح بوّابة Premium بدل التنفيذ — إقناع لا حماية.
  //  ② `applyPlanEdit` يرمي **قبل** `setCustomization` — فلا تُعرض خطة لم تُحفَظ
  //     (ميثاق §5). وهذا ما كان ينقص: `applyCustomization` يحدّث الحالة ثم يكتب.
  //  ③ `saveCustomization` يبقى الكاتب الحارس — شبكة الأمان الأخيرة، لا تُنزع.
  //
  // والحدّ **واحد** يستهلكه المعالج والكاتب معًا: `isExistingPlanEdit()`. إنشاء
  // أول خطة يمرّ حرًّا (ميثاق §0.1)، وتحوير خطة قائمة فعل مدفوع. ولا يُعتمد على
  // كون هذه الشاشة «للتعديل فقط» بحكم التوجيه: `mode` الافتراضي هنا ما زال
  // `'onboarding'` وما زالت تنادي `markCompleted` — فلو أُعيد توجيه أوّل تشغيل
  // إليها يومًا، لوجب أن يمرّ حرًّا لا أن يُرمى عليه استثناء.
  const commitPlan = (next: Customization) => {
    if (isExistingPlanEdit()) applyPlanEdit(next)
    else applyCustomization(next)
  }
  const guardPlanEdit = (run: () => void) => () => {
    if (!isExistingPlanEdit()) { run(); return }
    guardPaid('plan.saveEdit', run)()
  }

  const saveDraft = guardPlanEdit(() => {
    commitPlan(data)
    setLastStep(step)
    setSaved(true)
  })
  const saveAndClose = guardPlanEdit(() => {
    // لا يكتمل الإعداد والحقول المطلوبة ناقصة — انتقل لأول خطوة ناقصة لإصلاحها.
    if (!allValid) {
      setStep(firstInvalidIndex)
      return
    }
    commitPlan(data)
    markCompleted(userId, step)
    onBack(true)
  })
  const next = () => {
    if (!stepValid) return
    setStep((s) => Math.min(steps.length - 1, s + 1))
  }
  const prev = () => setStep((s) => Math.max(0, s - 1))

  // كشف/طيّ الخطوات المتقدّمة مع تثبيت الموضع ضمن الحدود الجديدة.
  const toggleAdvanced = () => {
    const next = !showAdvanced
    const nextLen =
      (next ? advancedEssentialSteps.length + advancedExtraSteps.length : advancedEssentialSteps.length) + 1
    setShowAdvanced(next)
    setStep((st) => Math.min(st, nextLen - 1))
  }

  const Current = steps[step].Component

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-page">
      {/* شريط علوي */}
      <header className="z-40 shrink-0 border-b border-line glass pt-[env(safe-area-inset-top)]">
        <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="Palette" className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-extrabold text-ink-900 sm:text-lg">{mode === 'advanced' ? d.editPlanTitle : d.setupPlanTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={saveDraft} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              <Icon name={saved ? 'CheckCircle2' : 'Check'} className="h-4 w-4" />
              {saved ? d.saved : d.saveDraft}
            </button>
            <button type="button" onClick={() => onBack()} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              <Icon name="Globe" className="h-4 w-4" />
              <span className="hidden sm:inline">{d.previewOnSite}</span>
              <span className="sm:hidden">{d.preview}</span>
            </button>
          </div>
        </div>

        {/* مؤشر التقدّم */}
        <div className="container-page pb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-700">
              {d.stepPrefix} {step + 1} {d.stepOf} {steps.length}: {d[steps[step].titleKey]}
            </span>
            <span className="font-bold text-primary-c">{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* خطوات قابلة للنقر (تمرير أفقي على الجوال) */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {steps.map((s, i) => {
              const reachable = canReachStep(i)
              return (
                <button
                  key={s.titleKey}
                  type="button"
                  onClick={() => reachable && setStep(i)}
                  disabled={!reachable}
                  aria-disabled={!reachable}
                  title={reachable ? undefined : d.completeRequiredFirst}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                    !reachable && 'cursor-not-allowed opacity-40',
                    i === step
                      ? 'border-primary-soft bg-primary-soft text-primary-c'
                      : i < step
                        ? 'border-line bg-surface text-ink-500'
                        : 'border-line bg-surface text-ink-400',
                  )}
                >
                  {i + 1}. {d[s.titleKey]}
                </button>
              )
            })}
          </div>

          {/* كشف الخيارات المتقدّمة — مطويّة بالافتراض لتبسيط «تعديل خطتي» */}
          {mode === 'advanced' && (
            <button
              type="button"
              onClick={toggleAdvanced}
              aria-expanded={showAdvanced}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-500 transition-colors hover:text-primary-c"
            >
              <Icon name={showAdvanced ? 'ChevronDown' : 'SlidersHorizontal'} className="h-3.5 w-3.5" />
              {showAdvanced ? d.hideAdvanced : d.advancedOptions}
            </button>
          )}
        </div>
      </header>

      {/* المحتوى */}
      <main className="app-scroll container-page min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-5 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8">
              <Current ctx={ctx} />
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-40 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{d.livePreview}</p>
              <PreviewSummary data={data} lang={lang} />
            </div>
          </aside>
        </div>
      </main>

      {/* شريط التنقّل السفلي */}
      <div className="z-30 shrink-0 border-t border-line bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="btn-ghost px-5 py-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="ChevronLeft" className="h-4 w-4 rotate-180" />
            {d.prev}
          </button>

          {isLast ? (
            <button type="button" onClick={saveAndClose} disabled={!allValid} className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40">
              <Icon name="Check" className="h-4 w-4" />
              {mode === 'advanced' ? d.saveAndClose : d.approveAndStart}
            </button>
          ) : (
            <button type="button" onClick={next} disabled={!stepValid} className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40">
              {d.next}
              <Icon name="ChevronLeft" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
