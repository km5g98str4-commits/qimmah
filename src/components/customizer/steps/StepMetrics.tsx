import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { MetricRow } from '@/lib/customization'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة القياسات والمتابعة. */
export function StepMetrics({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const columns: ColumnDef<MetricRow>[] = [
    { key: 'label', label: d.metricsColLabel, span: 'sm:col-span-5' },
    { key: 'value', label: d.metricsColValue, span: 'sm:col-span-3' },
    { key: 'unit', label: d.metricsColUnit, span: 'sm:col-span-3' },
  ]
  return (
    <div>
      <StepHeader
        icon="Ruler"
        title={d.metricsTitle}
        description={d.metricsDescription}
      />
      <EditableTable<MetricRow>
        items={ctx.data.metrics}
        columns={columns}
        onChange={(metrics) => ctx.update({ metrics })}
        makeEmpty={() => ({ label: '', value: '', unit: '' })}
        addLabel={d.metricsAddLabel}
        lang={ctx.lang}
      />
    </div>
  )
}
