import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted, restartOnboarding, setLastStep } from '@/lib/onboarding'
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

interface CustomizationCenterProps {
  /** يُستدعى عند الإغلاق؛ completed=true عند «حفظ وإغلاق» لعرض تأكيد النجاح. */
  onBack: (completed?: boolean) => void
  /** الخطوة التي يبدأ منها المعالج (لاستئناف الإعداد غير المكتمل). */
  initialStep?: number
  /** onboarding = تدفّق موجّه يولّد الخطة · advanced = محرّرات متقدمة. */
  mode?: 'onboarding' | 'advanced'
}

type StepDef = {
  title: string
  Component: (p: { ctx: WizardCtx }) => JSX.Element
  validate?: (d: Customization) => boolean
}

const onboardingSteps: StepDef[] = [
  { title: 'الترحيب', Component: StepWelcome, validate: (d) => d.identity.userName.trim().length > 0 },
  { title: 'بياناتك', Component: StepBody, validate: (d) => isProfileValid(d.profile) },
  { title: 'خطتك', Component: StepGeneratePlan },
  { title: 'المكملات والأدوية', Component: StepWellness },
  { title: 'القياسات والمتابعة', Component: StepMeasurements },
  { title: 'المراجعة', Component: StepReview },
]

// تعديل الخطة (متقدّم) — يُقسَّم لتقليل الزحام:
//  - الأساسيات: ما يحتاجه المبتدئ فعلًا (بياناته + التمرين + الأكل).
//  - الإضافات: ضبط نادر الاستخدام يُكشف خلف زرّ «خيارات متقدّمة».
const advancedEssentialSteps: StepDef[] = [
  { title: 'بياناتك', Component: StepBody, validate: (d) => isProfileValid(d.profile) },
  { title: 'جدول التمرين', Component: StepWorkoutTemplate },
  { title: 'خطة الأكل', Component: StepNutrition },
]

const advancedExtraSteps: StepDef[] = [
  { title: 'الحسابات الذكية', Component: StepSmartCalculations },
  { title: 'المكملات والأدوية', Component: StepWellness },
  { title: 'القياسات والمتابعة', Component: StepMeasurements },
  { title: 'الأقسام', Component: StepCommitments },
  { title: 'إظهار الأقسام', Component: StepSections },
]

const advancedReviewStep: StepDef = { title: 'المراجعة', Component: StepReview }

/** مركز التخصيص — معالج إعداد شخصي خطوة بخطوة (بلا backend، يُحفظ على الجهاز). */
export function CustomizationCenter({ onBack, initialStep = 0, mode = 'onboarding' }: CustomizationCenterProps) {
  const { customization, applyCustomization, resetCustomization } = useCustomization()
  // الخيارات المتقدّمة في «تعديل خطتي» مطويّة بالافتراض (تقليل التعقيد).
  const [showAdvanced, setShowAdvanced] = useState(false)
  const steps = useMemo<StepDef[]>(() => {
    if (mode !== 'advanced') return onboardingSteps
    return showAdvanced
      ? [...advancedEssentialSteps, ...advancedExtraSteps, advancedReviewStep]
      : [...advancedEssentialSteps, advancedReviewStep]
  }, [mode, showAdvanced])
  const [data, setData] = useState<Customization>(() => customization)
  const [step, setStep] = useState(() =>
    Math.min(Math.max(0, initialStep), steps.length - 1),
  )
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
  // استعادة من ملف نسخة
  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result)) as Partial<Customization>
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
    restartOnboarding()
    setStep(0)
    setSaved(false)
  }

  const ctx: WizardCtx = {
    data,
    update,
    updateIdentity,
    updateColors,
    onExport,
    onImportFile,
    onReset,
    onRestartOnboarding,
  }

  const saveDraft = () => {
    applyCustomization(data)
    setLastStep(step)
    setSaved(true)
  }
  const saveAndClose = () => {
    // لا يكتمل الإعداد والحقول المطلوبة ناقصة — انتقل لأول خطوة ناقصة لإصلاحها.
    if (!allValid) {
      setStep(firstInvalidIndex)
      return
    }
    applyCustomization(data)
    markCompleted(step)
    onBack(true)
  }
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
    <div className="flex min-h-screen flex-col bg-page">
      {/* شريط علوي */}
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="Palette" className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-extrabold text-ink-900 sm:text-lg">{mode === 'advanced' ? 'تعديل خطتي' : 'إعداد خطتي'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={saveDraft} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              <Icon name={saved ? 'CheckCircle2' : 'Check'} className="h-4 w-4" />
              {saved ? 'تم الحفظ' : 'حفظ مؤقت'}
            </button>
            <button type="button" onClick={() => onBack()} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              <Icon name="Globe" className="h-4 w-4" />
              <span className="hidden sm:inline">معاينة في الموقع</span>
              <span className="sm:hidden">معاينة</span>
            </button>
          </div>
        </div>

        {/* مؤشر التقدّم */}
        <div className="container-page pb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-700">
              الخطوة {step + 1} من {steps.length}: {steps[step].title}
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
                  key={s.title}
                  type="button"
                  onClick={() => reachable && setStep(i)}
                  disabled={!reachable}
                  aria-disabled={!reachable}
                  title={reachable ? undefined : 'أكمل الخطوات المطلوبة أولًا'}
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
                  {i + 1}. {s.title}
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
              {showAdvanced ? 'إخفاء الخيارات المتقدّمة' : 'خيارات متقدّمة'}
            </button>
          )}
        </div>
      </header>

      {/* المحتوى */}
      <main className="container-page flex-1 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8">
              <Current ctx={ctx} />
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-40 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">معاينة حية</p>
              <PreviewSummary data={data} />
            </div>
          </aside>
        </div>
      </main>

      {/* شريط التنقّل السفلي */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-page/90 backdrop-blur">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="btn-ghost px-5 py-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="ChevronLeft" className="h-4 w-4 rotate-180" />
            السابق
          </button>

          {isLast ? (
            <button type="button" onClick={saveAndClose} disabled={!allValid} className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40">
              <Icon name="Check" className="h-4 w-4" />
              {mode === 'advanced' ? 'حفظ وإغلاق' : 'اعتمد خطتي وابدأ'}
            </button>
          ) : (
            <button type="button" onClick={next} disabled={!stepValid} className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40">
              التالي
              <Icon name="ChevronLeft" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
