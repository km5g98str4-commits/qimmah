import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { Targets } from '@/types/profile'
import { computeTargets, profileHash } from '@/lib/calculators'

/** خطوة الحسابات الذكية — أرقام مقدّرة قابلة للتعديل اليدوي. */
export function StepSmartCalculations({ ctx }: { ctx: WizardCtx }) {
  const t = ctx.data.targets
  const manual = ctx.data.targetsMeta.manuallyEdited
  // أي تعديل يدوي على رقم → يضع علامة «معدّل يدويًا»
  const setT = (partial: Partial<Targets>) =>
    ctx.update({ targets: { ...t, ...partial }, targetsMeta: { ...ctx.data.targetsMeta, manuallyEdited: true } })
  // إعادة الحساب من الملف → يلغي التعديل اليدوي
  const recalc = () =>
    ctx.update({
      targets: computeTargets(ctx.data.profile),
      targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: profileHash(ctx.data.profile) },
    })

  return (
    <div>
      <StepHeader
        icon="BarChart3"
        title="الحسابات الذكية"
        description="قِمّة قدّرت لك الأرقام من بياناتك. عدّل أي رقم يدويًا إذا تبي."
      />

      {/* تنويه */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
        <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
        <p className="text-sm leading-relaxed text-ink-700">
          هذه الحسابات تقديرية للتنظيم والمتابعة فقط، وليست بديلًا عن مختص.
        </p>
      </div>

      {/* إشعار التعديل اليدوي */}
      {manual ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-primary-soft bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-ink-900">
            لديك تعديلات يدوية على الحسابات. تقدر إعادة الحساب من بياناتك في أي وقت.
          </p>
          <button type="button" onClick={recalc} className="btn-primary px-4 py-2 text-sm">
            <Icon name="RotateCcw" className="h-4 w-4" />
            إعادة الحساب الآن
          </button>
        </div>
      ) : (
        <button type="button" onClick={recalc} className="btn-ghost mb-6 w-full py-3 sm:w-auto">
          <Icon name="RotateCcw" className="h-4 w-4" />
          إعادة الحساب من بياناتي
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* السعرات */}
        <Card icon="Flame" title="السعرات">
          <NumField label="الأساس (BMR)" value={t.bmr} unit="سعرة" onChange={(v) => setT({ bmr: v })} />
          <NumField label="إجمالي الحركة (TDEE)" value={t.tdee} unit="سعرة" onChange={(v) => setT({ tdee: v })} />
          <NumField label="المحافظة" value={t.maintenanceCalories} unit="سعرة" onChange={(v) => setT({ maintenanceCalories: v })} />
          <NumField label="التنشيف" value={t.cuttingCalories} unit="سعرة" onChange={(v) => setT({ cuttingCalories: v })} />
          <NumField label="التضخيم" value={t.bulkingCalories} unit="سعرة" onChange={(v) => setT({ bulkingCalories: v })} />
        </Card>

        {/* الماكروز */}
        <Card icon="Salad" title="الماكروز">
          <NumField label="البروتين" value={t.proteinGrams} unit="غ" onChange={(v) => setT({ proteinGrams: v })} />
          <NumField label="الدهون" value={t.fatGrams} unit="غ" onChange={(v) => setT({ fatGrams: v })} />
          <NumField label="الكربوهيدرات" value={t.carbsGrams} unit="غ" onChange={(v) => setT({ carbsGrams: v })} />
        </Card>

        {/* الماء */}
        <Card icon="Droplets" title="الماء">
          <NumField label="الماء اليومي" value={t.waterLiters} unit="لتر" step="0.1" onChange={(v) => setT({ waterLiters: v })} />
        </Card>

        {/* الوزن والهدف */}
        <Card icon="Scale" title="الوزن والهدف">
          <NumField label="مؤشر الكتلة (BMI)" value={t.bmi} step="0.1" onChange={(v) => setT({ bmi: v })} />
          <TextField label="تصنيف المؤشر" value={t.bmiLabel} onChange={(v) => setT({ bmiLabel: v })} />
          <NumField label="تغيّر أسبوعي متوقّع" value={t.weeklyWeightChangeKg} unit="كجم" step="0.05" onChange={(v) => setT({ weeklyWeightChangeKg: v })} />
          <NumField label="أسابيع تقديرية للهدف" value={t.estimatedWeeksToGoal} unit="أسبوع" onChange={(v) => setT({ estimatedWeeksToGoal: v })} />
        </Card>

        {/* اقتراح التمرين */}
        <Card icon="Dumbbell" title="اقتراح التمرين" full>
          <TextField label="التقسيمة المقترحة" value={t.suggestedTrainingSplit} onChange={(v) => setT({ suggestedTrainingSplit: v })} />
          <TextField label="ملاحظات" value={t.notes} onChange={(v) => setT({ notes: v })} />
        </Card>
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  children,
  full,
}: {
  icon: string
  title: string
  children: ReactNode
  full?: boolean
}) {
  return (
    <div className={`card p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

const fieldInput =
  'w-28 rounded-lg border border-line bg-beige px-3 py-2 text-sm font-bold text-ink-900 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

function NumField({
  label,
  value,
  unit,
  step,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  step?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step ?? '1'}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={fieldInput}
        />
        {unit && <span className="w-10 text-xs text-ink-400">{unit}</span>}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-ink-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-beige px-3 py-2 text-sm text-ink-900 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  )
}
