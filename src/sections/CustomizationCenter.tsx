import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted, restartOnboarding, setLastStep } from '@/lib/onboarding'
import type { WizardCtx } from '@/components/customizer/stepProps'
import { PreviewSummary } from '@/components/customizer/PreviewSummary'
import { StepWelcome } from '@/components/customizer/steps/StepWelcome'
import { StepBasics } from '@/components/customizer/steps/StepBasics'
import { StepBody } from '@/components/customizer/steps/StepBody'
import { StepSmartCalculations } from '@/components/customizer/steps/StepSmartCalculations'
import { StepGoal } from '@/components/customizer/steps/StepGoal'
import { StepSchedule } from '@/components/customizer/steps/StepSchedule'
import { StepWorkoutTemplate } from '@/components/customizer/steps/StepWorkoutTemplate'
import { StepNutrition } from '@/components/customizer/steps/StepNutrition'
import { StepWellness } from '@/components/customizer/steps/StepWellness'
import { StepCommitments } from '@/components/customizer/steps/StepCommitments'
import { StepMeasurements } from '@/components/customizer/steps/StepMeasurements'
import { StepLook } from '@/components/customizer/steps/StepLook'
import { StepSections } from '@/components/customizer/steps/StepSections'
import { StepReview } from '@/components/customizer/steps/StepReview'

interface CustomizationCenterProps {
  /** يُستدعى عند الإغلاق؛ completed=true عند «حفظ وإغلاق» لعرض تأكيد النجاح. */
  onBack: (completed?: boolean) => void
  /** الخطوة التي يبدأ منها المعالج (لاستئناف الإعداد غير المكتمل). */
  initialStep?: number
}

const steps: { title: string; Component: (p: { ctx: WizardCtx }) => JSX.Element }[] = [
  { title: 'الترحيب', Component: StepWelcome },
  { title: 'بياناتي الأساسية', Component: StepBasics },
  { title: 'بيانات الجسم', Component: StepBody },
  { title: 'الحسابات الذكية', Component: StepSmartCalculations },
  { title: 'هدفي الحالي', Component: StepGoal },
  { title: 'جدولي الأسبوعي', Component: StepSchedule },
  { title: 'اختيار جدول التمرين', Component: StepWorkoutTemplate },
  { title: 'خطة الأكل', Component: StepNutrition },
  { title: 'المكملات والأدوية', Component: StepWellness },
  { title: 'الالتزامات', Component: StepCommitments },
  { title: 'القياسات والمتابعة', Component: StepMeasurements },
  { title: 'شكل الصفحة', Component: StepLook },
  { title: 'الأقسام', Component: StepSections },
  { title: 'المراجعة والحفظ', Component: StepReview },
]

/** مركز التخصيص — معالج إعداد شخصي خطوة بخطوة (بلا backend، يُحفظ على الجهاز). */
export function CustomizationCenter({ onBack, initialStep = 0 }: CustomizationCenterProps) {
  const { customization, applyCustomization, resetCustomization } = useCustomization()
  const [data, setData] = useState<Customization>(() => customization)
  const [step, setStep] = useState(() =>
    Math.min(Math.max(0, initialStep), steps.length - 1),
  )
  const [saved, setSaved] = useState(false)

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
    applyCustomization(data)
    markCompleted(step)
    onBack(true)
  }
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

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
            <span className="text-base font-extrabold text-ink-900 sm:text-lg">إعداد صفحتي</span>
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
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                  i === step
                    ? 'border-primary-soft bg-primary-soft text-primary-c'
                    : i < step
                      ? 'border-line bg-surface text-ink-500'
                      : 'border-line bg-surface text-ink-400',
                )}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </div>
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
            <button type="button" onClick={saveAndClose} className="btn-primary px-6 py-3">
              <Icon name="Check" className="h-4 w-4" />
              حفظ وإغلاق
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-primary px-6 py-3">
              التالي
              <Icon name="ChevronLeft" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
