import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import { useCustomization } from '@/lib/customizationContext'
import {
  activityOptions,
  BULK_SURPLUS,
  CUT_DEFICIT,
  FAT_CALORIE_RATIO,
  genderOptions,
  goalTypeLabel,
  mifflinSexConstant,
  PROTEIN_PER_KG,
  totalActivityMultiplier,
} from '@/lib/calculators'
import { calcScreenStrings } from '@/i18n/dict/calcScreen'
import type { Lang } from '@/lib/appPreferences'

interface CalcExplainerViewProps {
  lang: Lang
  onBack: () => void
}

/**
 * صفحة «كيف نحسب أرقامك؟» — تشرح كل حساب (BMR/TDEE/سعرات/بروتين/كارب/دهون/BMI)
 * بأساسه العلمي وبأرقام المستخدم الفعلية محسوبة حيًّا. تقديرات تعليمية — لا نصيحة طبية.
 */
export function CalcExplainerView({ lang, onBack }: CalcExplainerViewProps) {
  const d = calcScreenStrings[lang]
  const { customization } = useCustomization()
  const p = customization.profile
  const t = customization.targets

  const hasData = t.bmr > 0 && t.tdee > 0 && p.weightKg > 0

  // — أرقام حيّة من ملف المستخدم (لا قيم ثابتة) —
  const w = p.weightKg
  const h = p.heightCm
  const age = p.age
  const sexConst = mifflinSexConstant(p.gender)
  const sexLabel = genderOptions.find((o) => o.value === p.gender)?.label ?? ''
  const sexSign = sexConst >= 0 ? '+' : '−'
  const sexAbs = Math.abs(sexConst)

  const multiplier = totalActivityMultiplier(p.activityLevel, p.trainingDays)
  const activityLabel = activityOptions.find((o) => o.value === p.activityLevel)?.label ?? ''

  const goalAdj = p.goalType === 'cutting' ? -CUT_DEFICIT : p.goalType === 'bulking' ? BULK_SURPLUS : 0
  const proteinPerKg = w > 0 ? Math.round((t.proteinGrams / w) * 10) / 10 : PROTEIN_PER_KG
  const fatPct = Math.round(FAT_CALORIE_RATIO * 100)

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="container-page flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-700 transition-colors hover:text-ink-900"
          >
            <Icon name="ChevronLeft" className="h-5 w-5 rtl:rotate-180" />
            {d.back}
          </button>
        </div>
      </header>

      <main className="container-page py-8">
        <div className="mx-auto max-w-2xl">
          {/* الترويسة */}
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
              <Icon name="Calculator" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-ink-900">{d.pageTitle}</h1>
              <p className="mt-0.5 text-sm text-ink-500">{d.pageSubtitle}</p>
            </div>
          </div>

          <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-600">
            {d.intro}
          </p>

          {!hasData ? (
            <p className="mt-6 flex items-start gap-2 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-500">
              <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-primary-c" />
              {d.needData}
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {/* 1) BMR */}
              <Card icon="Flame" title={d.bmrTitle} basis={d.bmrBasis}>
                <p className="text-sm leading-relaxed text-ink-600">{d.bmrDesc}</p>
                <Formula>{`BMR = 10×${w} + 6.25×${h} − 5×${age} ${sexSign} ${sexAbs}`}</Formula>
                <p className="text-[11px] text-ink-400" dir="ltr">
                  {`(${sexSign}${sexAbs} = ${sexLabel})`}
                </p>
                <Result label={d.bmrResult} value={`${t.bmr}`} unit={d.unitCal} />
              </Card>

              {/* 2) TDEE */}
              <Card icon="Activity" title={d.tdeeTitle}>
                <p className="text-sm leading-relaxed text-ink-600">{d.tdeeDesc}</p>
                <div className="overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-beige text-ink-500">
                      <tr>
                        <th className="p-2.5 text-start font-bold">{d.tdeeTableActivity}</th>
                        <th className="p-2.5 text-end font-bold">{d.tdeeTableMultiplier}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {activityOptions.map((o) => {
                        const picked = o.value === p.activityLevel
                        const factor = totalActivityMultiplier(o.value, p.trainingDays)
                        return (
                          <tr key={o.value} className={picked ? 'bg-primary-soft font-bold text-primary-c' : 'text-ink-700'}>
                            <td className="p-2.5 text-start">
                              {o.label}
                              {picked && <span className="ms-1.5 text-[10px]">• {d.tdeeYourPick}</span>}
                            </td>
                            <td className="p-2.5 text-end tabular-nums" dir="ltr">
                              ×{factor.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-ink-400">{d.tdeeTrainingAdd}</p>
                <Formula>{`TDEE = ${t.bmr} × ${multiplier.toFixed(2)}  (${activityLabel} + ${p.trainingDays})`}</Formula>
                <Result label={d.tdeeResult} value={`${t.tdee}`} unit={d.unitCal} />
              </Card>

              {/* 3) السعرات المستهدفة حسب الهدف */}
              <Card icon="Target" title={d.caloriesTitle}>
                <p className="text-sm leading-relaxed text-ink-600">{d.caloriesDesc}</p>
                <ul className="space-y-1.5 text-sm text-ink-600">
                  <GoalLine active={p.goalType === 'cutting'} text={d.goalCut} />
                  <GoalLine active={p.goalType === 'maintenance'} text={d.goalMaintain} />
                  <GoalLine active={p.goalType === 'bulking'} text={d.goalBulk} />
                </ul>
                <Formula>
                  {goalAdj !== 0
                    ? `${t.tdee} ${goalAdj < 0 ? '−' : '+'} ${Math.abs(goalAdj)} = ${t.targetCalories}`
                    : `${t.tdee} (${goalTypeLabel(p.goalType)}) = ${t.targetCalories}`}
                </Formula>
                <Result label={d.caloriesResult} value={`${t.targetCalories}`} unit={d.unitCalPerDay} highlight />
              </Card>

              {/* 4) البروتين */}
              <Card icon="Salad" title={d.proteinTitle}>
                <p className="text-sm leading-relaxed text-ink-600">{d.proteinDesc}</p>
                <p className="text-sm leading-relaxed text-ink-500">{d.proteinRationale}</p>
                <Formula>{`${proteinPerKg} × ${w} ${d.unitKg} = ${t.proteinGrams} ${d.unitGram}`}</Formula>
                <Result label={d.proteinResult} value={`${t.proteinGrams}`} unit={d.unitGramPerDay} />
              </Card>

              {/* 5) الدهون والكربوهيدرات */}
              <Card icon="Percent" title={d.macrosTitle}>
                <p className="text-sm leading-relaxed text-ink-600">{d.fatDesc}</p>
                <Formula>{`(${t.targetCalories} × ${fatPct}%) ÷ 9 = ${t.fatGrams} ${d.unitGram}`}</Formula>
                <p className="text-sm leading-relaxed text-ink-600">{d.carbsDesc}</p>
                <Formula>{`(${t.targetCalories} − ${t.proteinGrams}×4 − ${t.fatGrams}×9) ÷ 4 = ${t.carbsGrams} ${d.unitGram}`}</Formula>
                <div className="grid grid-cols-2 gap-3">
                  <Result label={d.fatLabel} value={`${t.fatGrams}`} unit={d.unitGramPerDay} />
                  <Result label={d.carbsLabel} value={`${t.carbsGrams}`} unit={d.unitGramPerDay} />
                </div>
              </Card>

              {/* 6) BMI */}
              <Card icon="Scale" title={d.bmiTitle}>
                <p className="text-sm leading-relaxed text-ink-600">{d.bmiDesc}</p>
                <Formula>{`${w} ÷ (${(h / 100).toFixed(2)})² = ${t.bmi}`}</Formula>
                <Result label={d.bmiResult} value={`${t.bmi}`} unit={t.bmiLabel} />
                <p className="flex items-start gap-2 rounded-xl border border-line bg-beige p-3 text-xs leading-relaxed text-ink-500">
                  <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                  {d.bmiNote}
                </p>
              </Card>
            </div>
          )}

          {/* تنويه ختامي — لا نصيحة طبية */}
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-400">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {d.disclaimer}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Card({
  icon,
  title,
  basis,
  children,
}: {
  icon: string
  title: string
  basis?: string
  children: ReactNode
}) {
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-ink-900">{title}</h2>
          {basis && <p className="text-[11px] font-bold text-primary-c">{basis}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p
      className="overflow-x-auto rounded-lg bg-beige px-3 py-2 text-[13px] font-bold text-ink-700"
      dir="ltr"
    >
      {children}
    </p>
  )
}

function Result({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between rounded-xl px-4 py-3 ${
        highlight ? 'bg-primary text-white' : 'border border-line bg-surface'
      }`}
    >
      <span className={`text-sm font-bold ${highlight ? 'text-white/90' : 'text-ink-600'}`}>{label}</span>
      <span className={`text-lg font-black ${highlight ? 'text-white' : 'text-ink-900'}`}>
        {value}
        {unit && (
          <span className={`ms-1 text-[11px] font-bold ${highlight ? 'text-white/80' : 'text-ink-400'}`}>{unit}</span>
        )}
      </span>
    </div>
  )
}

function GoalLine({ active, text }: { active: boolean; text: string }) {
  return (
    <li className={`flex items-start gap-2 ${active ? 'font-bold text-ink-900' : ''}`}>
      <Icon
        name={active ? 'CheckCircle2' : 'Circle'}
        className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary-c' : 'text-ink-300'}`}
      />
      <span>{text}</span>
    </li>
  )
}
