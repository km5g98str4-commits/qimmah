import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import {
  activityOptions,
  BULK_SURPLUS,
  CUT_DEFICIT,
  goalTypeLabel,
  totalActivityMultiplier,
} from '@/lib/calculators'
import { useLang } from '@/i18n'
import { calorieExplainerStrings } from '@/i18n/dict/calorieExplainer'
import { activityLabelI18n, goalTypeLabelI18n } from '@/lib/i18nLabels'

/**
 * «كيف نحسب سعراتك؟» — يفكّك منطق الحساب بأرقامك الفعلية (BMR ← TDEE ← تعديل الهدف ← البروتين)
 * حتى يثق المستخدم بالأرقام بدل التحقّق منها في مكان آخر. تقديرات للتنظيم فقط — لا نصيحة طبية.
 */
export function CalorieExplainer() {
  const { customization } = useCustomization()
  const p = customization.profile
  const t = customization.targets
  const lang = useLang()
  const d = calorieExplainerStrings[lang]
  const [open, setOpen] = useState(false)

  // القيم الفعلية من ملفك — لا أرقام ثابتة.
  const multiplier = totalActivityMultiplier(p.activityLevel, p.trainingDays)
  const activityLabelAr = activityOptions.find((o) => o.value === p.activityLevel)?.label ?? ''
  const activityLabel = activityLabelI18n(p.activityLevel, activityLabelAr, lang)
  const goalAdj = p.goalType === 'cutting' ? -CUT_DEFICIT : p.goalType === 'bulking' ? BULK_SURPLUS : 0
  const goalLabel = goalTypeLabelI18n(p.goalType, goalTypeLabel(p.goalType), lang)
  const proteinPerKg = p.weightKg > 0 ? Math.round((t.proteinGrams / p.weightKg) * 10) / 10 : 0

  // بدون بيانات جسم كافية لا توجد أرقام نشرحها.
  const hasData = t.bmr > 0 && t.tdee > 0

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-start"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="Calculator" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink-900">{d.toggleTitle}</span>
          <span className="block text-[11px] text-ink-400">{d.toggleHint}</span>
        </span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="h-5 w-5 shrink-0 text-ink-400" />
      </button>

      {open && (
        <div className="border-t border-line p-5">
          {!hasData ? (
            <p className="text-sm text-ink-500">{d.needData}</p>
          ) : (
            <>
              <ol className="space-y-4">
                <Step n={1} title={d.bmrTitle} desc={d.bmrDesc} value={`${t.bmr}`} unit={d.calorieUnit} />
                <Step
                  n={2}
                  title={d.tdeeTitle}
                  desc={`${d.tdeeDescPrefix} (${activityLabel} + ${p.trainingDays} ${d.daysWord}) = ×${multiplier.toFixed(2)}.`}
                  value={`${t.tdee}`}
                  unit={d.calorieUnit}
                  formula={`${t.bmr} × ${multiplier.toFixed(2)}`}
                />
                <Step
                  n={3}
                  title={`${d.goalTitlePrefix} (${goalLabel})`}
                  desc={goalAdj < 0 ? d.descCut : goalAdj > 0 ? d.descBulk : d.descMaintain}
                  value={`${t.targetCalories}`}
                  unit={d.targetDayUnit}
                  // حين تُطبَّق أرضية السعرات الآمنة (تنشيف) يختلف الناتج عن (TDEE−٤٠٠)،
                  // فنعرض «الحد الأدنى الآمن» بدل معادلة لا تساوي الرقم المعروض.
                  formula={
                    goalAdj === 0
                      ? `${t.tdee}`
                      : t.targetCalories !== t.tdee + goalAdj
                        ? d.floorLabel
                        : `${t.tdee} ${goalAdj < 0 ? '−' : '+'} ${Math.abs(goalAdj)}`
                  }
                  highlight
                />
                <Step
                  n={4}
                  title={d.proteinTitle}
                  desc={`${d.proteinDescA}${proteinPerKg}${d.proteinDescB}`}
                  value={`${t.proteinGrams}`}
                  unit={d.proteinDayUnit}
                  formula={`${proteinPerKg} × ${p.weightKg} ${d.kg}`}
                />
              </ol>

              <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-400">
                <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {d.disclaimer}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Step({
  n,
  title,
  desc,
  value,
  unit,
  formula,
  highlight = false,
}: {
  n: number
  title: string
  desc: string
  value: string
  unit: string
  formula?: string
  highlight?: boolean
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
          highlight ? 'bg-primary text-white' : 'bg-primary-soft text-primary-c'
        }`}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-bold text-ink-900">{title}</p>
          <p className="text-sm font-black text-ink-900">
            {value} <span className="text-[11px] font-bold text-ink-400">{unit}</span>
          </p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{desc}</p>
        {formula && (
          <p className="mt-1 inline-block rounded-md bg-page px-2 py-0.5 text-[11px] font-bold text-ink-600" dir="ltr">
            {formula}
          </p>
        )}
      </div>
    </li>
  )
}
