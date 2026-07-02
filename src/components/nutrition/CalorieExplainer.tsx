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

/**
 * «كيف نحسب سعراتك؟» — يفكّك منطق الحساب بأرقامك الفعلية (BMR ← TDEE ← تعديل الهدف ← البروتين)
 * حتى يثق المستخدم بالأرقام بدل التحقّق منها في مكان آخر. تقديرات للتنظيم فقط — لا نصيحة طبية.
 */
export function CalorieExplainer() {
  const { customization } = useCustomization()
  const p = customization.profile
  const t = customization.targets
  const [open, setOpen] = useState(false)

  // القيم الفعلية من ملفك — لا أرقام ثابتة.
  const multiplier = totalActivityMultiplier(p.activityLevel, p.trainingDays)
  const activityLabel = activityOptions.find((o) => o.value === p.activityLevel)?.label ?? ''
  const goalAdj = p.goalType === 'cutting' ? -CUT_DEFICIT : p.goalType === 'bulking' ? BULK_SURPLUS : 0
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
          <span className="block text-sm font-bold text-ink-900">كيف نحسب سعراتك؟</span>
          <span className="block text-[11px] text-ink-400">اعرف من وين جت أرقامك خطوة بخطوة</span>
        </span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="h-5 w-5 shrink-0 text-ink-400" />
      </button>

      {open && (
        <div className="border-t border-line p-5">
          {!hasData ? (
            <p className="text-sm text-ink-500">
              أكمل بيانات جسمك (الوزن والطول والعمر) في الإعداد حتى نعرض لك طريقة الحساب بأرقامك.
            </p>
          ) : (
            <>
              <ol className="space-y-4">
                <Step
                  n={1}
                  title="سعرات جسمك وأنت مرتاح (BMR)"
                  desc="كم يحرق جسمك لو ما تحركت طول اليوم — نحسبها بمعادلة Mifflin-St Jeor من وزنك وطولك وعمرك."
                  value={`${t.bmr}`}
                  unit="سعرة"
                />
                <Step
                  n={2}
                  title="سعرات يومك كامل (TDEE)"
                  desc={`نضرب BMR في معامل حركتك (${activityLabel} + ${p.trainingDays} أيام تمرين) = ×${multiplier.toFixed(2)}.`}
                  value={`${t.tdee}`}
                  unit="سعرة"
                  formula={`${t.bmr} × ${multiplier.toFixed(2)}`}
                />
                <Step
                  n={3}
                  title={`تعديل حسب هدفك (${goalTypeLabel(p.goalType)})`}
                  desc={
                    goalAdj < 0
                      ? 'للتنشيف ننقص ٤٠٠ سعرة عن سعرات يومك لخسارة الدهون بثبات.'
                      : goalAdj > 0
                        ? 'للتضخيم نزيد ٣٠٠ سعرة فوق سعرات يومك لبناء العضل تدريجيًا.'
                        : 'لهدف الثبات نبقى على سعرات يومك بدون زيادة أو نقص.'
                  }
                  value={`${t.targetCalories}`}
                  unit="سعرة / يوم"
                  formula={goalAdj !== 0 ? `${t.tdee} ${goalAdj < 0 ? '−' : '+'} ${Math.abs(goalAdj)}` : `${t.tdee}`}
                  highlight
                />
                <Step
                  n={4}
                  title="بروتينك اليومي"
                  desc={`نحسب ${proteinPerKg}غ لكل كيلو من وزنك — ضمن النطاق الموصى به للرياضيين ١٫٦–٢٫٢غ/كجم للحفاظ على العضل.`}
                  value={`${t.proteinGrams}`}
                  unit="غرام / يوم"
                  formula={`${proteinPerKg} × ${p.weightKg} كجم`}
                />
              </ol>

              <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-400">
                <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                هذه تقديرات لتنظيم أكلك ومتابعة تقدّمك فقط، وليست نصيحة طبية. عدّلها حسب إحساسك ونتائجك على أرض الواقع.
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
