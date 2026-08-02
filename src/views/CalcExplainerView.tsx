import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
import { StateBlock } from '@/components/StateBlock'
import { eCalcStrings, type ECalcInputId, type ECalcStrings } from '@/i18n/dict/eCalc'
import {
  FAT_CALORIE_RATIO,
  KCAL_PER_KG,
  PROTEIN_PER_KG,
  WATER_ML_PER_KG,
  isMinorAge,
} from '@/lib/calculators'
import type { Lang } from '@/lib/appPreferences'
import { useCustomization } from '@/lib/customizationContext'
import {
  buildCalcExplainerSnapshot,
  type CalcExplainerData,
  type CalcExplainerSnapshot,
} from '@/lib/eCalcExplainerModel'
import { loadLogs } from '@/lib/measurementLog'

interface CalcExplainerViewProps {
  lang: Lang
  onBack: () => void
  onEditProfile: () => void
}

export function CalcExplainerView({ lang, onBack, onEditProfile }: CalcExplainerViewProps) {
  const d = eCalcStrings[lang]
  const { customization } = useCustomization()
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState<CalcExplainerSnapshot | null>(null)

  useEffect(() => {
    setSnapshot(null)
    const frame = window.requestAnimationFrame(() => {
      setSnapshot(
        buildCalcExplainerSnapshot(
          customization.profile,
          customization.targets,
          customization.targetsMeta.manuallyEdited,
          loadLogs(),
        ),
      )
    })
    return () => window.cancelAnimationFrame(frame)
  }, [attempt, customization.profile, customization.targets, customization.targetsMeta.manuallyEdited])

  return (
    <StandaloneAppScreen lang={lang} title={d.pageTitle} backLabel={d.back} onBack={onBack}>
      <div data-testid="e-calc-screen" className="space-y-5">
        {!snapshot ? (
          <StateBlock
            variant="loading"
            title={d.loadingTitle}
            body={d.loadingBody}
            testId="e-calc-loading"
          />
        ) : snapshot.status === 'empty' ? (
          <StateBlock
            variant="empty"
            title={d.emptyTitle}
            body={d.emptyBody}
            actions={[{ label: d.completeProfileAction, onClick: onEditProfile, primary: true }]}
            testId="e-calc-empty"
          />
        ) : snapshot.status === 'error' ? (
          <StateBlock
            variant="error"
            title={d.errorTitle}
            body={d.errorBody}
            actions={[
              { label: d.retryAction, onClick: () => setAttempt((value) => value + 1), primary: true },
              { label: d.completeProfileAction, onClick: onEditProfile },
            ]}
            testId="e-calc-error"
          />
        ) : (
          <CalcFilled data={snapshot.data} lang={lang} d={d} />
        )}
      </div>
    </StandaloneAppScreen>
  )
}

function CalcFilled({ data, lang, d }: { data: CalcExplainerData; lang: Lang; d: ECalcStrings }) {
  const n = useMemo(
    () => new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US', { maximumFractionDigits: 2 }),
    [lang],
  )
  const value = (number: number) => n.format(number)
  const p = data.profile
  const t = data.calculated
  const minor = isMinorAge(p.age)
  const sign = data.sexConstant >= 0 ? '+' : '−'
  const fatPercent = FAT_CALORIE_RATIO * 100
  const expectedRate = data.expectedWeeklyChangeKg

  const inputValue = (id: ECalcInputId): string => {
    switch (id) {
      case 'age': return `${value(p.age)} ${d.inputValueUnits.age}`
      case 'height': return `${value(p.heightCm)} ${d.inputValueUnits.height}`
      case 'weight': return `${value(p.weightKg)} ${d.inputValueUnits.weight}`
      case 'training_days': return `${value(p.trainingDays)} ${d.inputValueUnits.training_days}`
      case 'gender': return d.genderLabels[p.gender]
      case 'activity_level': return d.activityLabels[p.activityLevel]
      case 'goal': return d.goalLabels[p.goalType]
    }
  }

  return (
    <div data-testid="e-calc-filled" className="space-y-5">
      <header className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="Calculator" className="h-6 w-6" />
        </span>
        <p className="pt-1 text-sm leading-relaxed text-ink-500">{d.pageSubtitle}</p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm leading-relaxed text-ink-700">{d.intro}</p>
        <p className="mt-3 rounded-xl bg-beige p-3 text-sm font-bold leading-relaxed text-ink-700">
          {d.introEstimate}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-black text-ink-900">{d.inputsTitle}</h2>
        <p className="mt-1 text-sm text-ink-500">{d.inputsNote}</p>
        <div className="mt-4 divide-y divide-line">
          {d.inputRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-bold text-ink-900">{row.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{row.usedBy}</p>
              </div>
              <span className="self-start rounded-lg bg-beige px-2.5 py-1 font-mono text-xs font-black text-ink-700">
                {inputValue(row.id)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-bold leading-relaxed text-primary-c">{d.inputsAccuracy}</p>
      </section>

      <ExplainerSection icon="Scale" title={d.bmiTitle} result={value(t.bmi)}>
        <Body>{d.bmiWhat}</Body>
        <Formula>{`${value(p.weightKg)} ÷ (${value(p.heightCm / 100)})² = ${value(t.bmi)}`}</Formula>
        <Body>{d.bmiSource}</Body>
        <Note>{minor ? d.bmiMinor : d.bmiLimits}</Note>
      </ExplainerSection>

      <ExplainerSection icon="Flame" title={d.bmrTitle} result={value(t.bmr)} unit={d.unitKcalPerDay}>
        <Body>{d.bmrWhat}</Body>
        <Formula>
          {`10×${value(p.weightKg)} + 6.25×${value(p.heightCm)} − 5×${value(p.age)} ${sign} ${value(Math.abs(data.sexConstant))} = ${value(t.bmr)}`}
        </Formula>
        <Body>{d.bmrSource}</Body>
        <Note>{d.bmrAssume} {d.bmrLimits} {d.bmrWhyNoBodyFat}</Note>
      </ExplainerSection>

      <ExplainerSection icon="Activity" title={d.tdeeTitle} result={value(t.tdee)} unit={d.unitKcalPerDay}>
        <Body>{d.tdeeWhat}</Body>
        <Formula>{`${value(t.bmr)} × ${value(data.activityMultiplier)} = ${value(t.tdee)}`}</Formula>
        <Body>{d.tdeeApproach}</Body>
        <Note>{d.tdeeTrainingAdd} {d.tdeeCap}</Note>
        <Honesty>{d.tdeeHonesty}</Honesty>
        <Body>{d.tdeeLimits} {d.tdeeCalibrate}</Body>
      </ExplainerSection>

      <ExplainerSection
        icon="Target"
        title={d.caloriesTitle}
        result={value(data.manuallyEdited ? data.saved.targetCalories : t.targetCalories)}
        unit={d.unitKcalPerDay}
        highlight
      >
        <Body>{d.caloriesWhat}</Body>
        <Formula>
          {data.calorieAdjustment === 0
            ? `${value(t.tdee)} = ${value(t.targetCalories)}`
            : `${value(t.tdee)} ${data.calorieAdjustment < 0 ? '−' : '+'} ${value(Math.abs(data.calorieAdjustment))} = ${value(t.targetCalories)}`}
        </Formula>
        {data.calorieFloorApplied && <Note>{d.caloriesFloor}</Note>}
        {minor && <Note>{d.caloriesMinor}</Note>}
        {data.manuallyEdited && (
          <div className="rounded-xl border border-primary/20 bg-primary-soft p-3">
            <p className="text-sm font-black text-primary-c">{d.manualOverrideTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{d.manualOverrideBody}</p>
            <ResultLine value={value(data.saved.targetCalories)} unit={d.unitKcalPerDay} />
          </div>
        )}
        <Honesty>{d.caloriesHonesty}</Honesty>
        <Body>{d.caloriesAdjust}</Body>
      </ExplainerSection>

      <ExplainerSection icon="Percent" title={d.macrosTitle} result={value(t.proteinGrams)} unit={d.unitGramPerDay}>
        <MetricBlock title={d.proteinTitle} result={value(t.proteinGrams)} unit={d.unitGramPerDay}>
          <Formula>{`${value(PROTEIN_PER_KG)} × ${value(p.weightKg)} = ${value(t.proteinGrams)}`}</Formula>
          <Body>{d.proteinWhy} {d.proteinSource}</Body>
        </MetricBlock>
        <MetricBlock title={d.fatTitle} result={value(t.fatGrams)} unit={d.unitGramPerDay}>
          <Formula>{`(${value(t.targetCalories)} × ${value(fatPercent)}%) ÷ 9 = ${value(t.fatGrams)}`}</Formula>
          <Body>{d.fatWhy} {d.fatSource}</Body>
        </MetricBlock>
        <MetricBlock title={d.carbsTitle} result={value(t.carbsGrams)} unit={d.unitGramPerDay}>
          <Formula>{`(${value(t.targetCalories)} − ${value(t.proteinGrams)}×4 − ${value(t.fatGrams)}×9) ÷ 4 = ${value(t.carbsGrams)}`}</Formula>
          <Body>{d.carbsWhy}</Body>
        </MetricBlock>
        <Note>{d.macrosConversion} {d.macrosLimits}</Note>
      </ExplainerSection>

      <ExplainerSection icon="Droplets" title={d.waterTitle} result={value(t.waterLiters)} unit={d.unitLiterPerDay}>
        <Formula>{`${value(p.weightKg)} × ${value(WATER_ML_PER_KG)} → ${value(t.waterLiters)}`}</Formula>
        <Body>{d.waterFormula} {d.waterRange}</Body>
        <Honesty>{d.waterHonesty}</Honesty>
        <Body>{d.waterFloorWhy} {d.waterCapWhy} {d.waterDrinking} {d.waterHeat}</Body>
      </ExplainerSection>

      <ExplainerSection icon="TrendingUp" title={d.rateTitle} result={value(expectedRate)} unit={d.unitKgPerWeek}>
        <Body>{d.rateWhat}</Body>
        <Formula>{`${value(Math.abs(data.calorieAdjustment))} × 7 ÷ ${value(KCAL_PER_KG)} = ${value(Math.abs(expectedRate))}`}</Formula>
        <Body>{d.rateWhyKcalPerKg}</Body>
        <Honesty>{d.rateHonesty}</Honesty>
        <Body>{d.rateWater} {d.rateReal}</Body>
        <div className="rounded-xl border border-line bg-beige p-3">
          {data.actualWeeklyChangeKg === null ? (
            <p className="text-sm font-bold leading-relaxed text-ink-500">{d.actualRateMissing}</p>
          ) : (
            <>
              <ResultLine value={value(data.actualWeeklyChangeKg)} unit={d.unitKgPerWeek} />
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{d.actualRateAvailable}</p>
            </>
          )}
        </div>
      </ExplainerSection>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-black text-ink-900">{d.accuracyTitle}</h2>
        <p className="mt-2 text-sm font-bold text-ink-700">{d.accuracyIntro}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{d.accuracyBody}</p>
        <p className="mt-3 text-sm font-bold leading-relaxed text-ink-800">{d.accuracyWhatMatters}</p>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">{d.accuracyHelp}</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-black text-ink-900">{d.sourcesTitle}</h2>
        <p className="mt-1 text-sm text-ink-500">{d.sourcesIntro}</p>
        <div className="mt-4 space-y-3">
          {d.sourceRows.map((row) => (
            <div key={row.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-black text-ink-900">{row.label}</p>
                <CertaintyBadge certainty={row.certainty} label={d.certaintyLabels[row.certainty]} />
              </div>
              <p className="mt-1 text-xs text-ink-500">{row.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-beige p-5">
        <div className="flex items-center gap-2">
          <Icon name="Info" className="h-4 w-4 text-primary-c" />
          <h2 className="text-sm font-black text-ink-900">{d.disclaimerTitle}</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">{d.disclaimerBody}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{d.disclaimerWhen}</p>
        <p className="mt-2 text-xs font-bold leading-relaxed text-ink-700">{d.disclaimerYou}</p>
      </section>
    </div>
  )
}

function ExplainerSection({
  icon,
  title,
  result,
  unit,
  highlight,
  children,
}: {
  icon: string
  title: string
  result: string
  unit?: string
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-ink-900">{title}</span>
          <span className={`mt-0.5 block font-mono text-lg font-black tabular-nums ${highlight ? 'text-primary-c' : 'text-ink-900'}`}>
            {result}
            {unit && <span className="ms-1 font-sans text-[0.65rem] text-ink-400">{unit}</span>}
          </span>
        </span>
        <Icon name="ChevronDown" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-line p-4">{children}</div>
    </details>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink-600">{children}</p>
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-beige p-3 text-xs leading-relaxed text-ink-500">{children}</p>
}

function Honesty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-950">
      {children}
    </p>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p dir="ltr" className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink-900 px-3 py-2.5 font-mono text-xs font-bold tabular-nums text-white">
      {children}
    </p>
  )
}

function ResultLine({ value, unit }: { value: string; unit: string }) {
  return (
    <p className="font-mono text-lg font-black tabular-nums text-ink-900">
      {value}
      <span className="ms-1 font-sans text-[0.65rem] text-ink-400">{unit}</span>
    </p>
  )
}

function MetricBlock({ title, result, unit, children }: { title: string; result: string; unit: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black text-ink-900">{title}</h3>
        <ResultLine value={result} unit={unit} />
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  )
}

function CertaintyBadge({
  certainty,
  label,
}: {
  certainty: 'published_equation' | 'established_range_choice' | 'qimmah_practical_estimate'
  label: string
}) {
  const tone = {
    published_equation: 'bg-emerald-50 text-emerald-800',
    established_range_choice: 'bg-blue-50 text-blue-800',
    qimmah_practical_estimate: 'bg-amber-50 text-amber-900',
  }[certainty]
  return (
    <span title={label} className={`max-w-[55%] shrink-0 rounded-full px-2 py-1 text-center text-[0.6rem] font-black leading-tight ${tone}`}>
      {label.split('—')[0]}
    </span>
  )
}
