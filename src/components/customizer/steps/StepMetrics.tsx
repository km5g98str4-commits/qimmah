import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { MetricRow } from '@/lib/customization'

const columns: ColumnDef<MetricRow>[] = [
  { key: 'label', label: 'القياس', span: 'sm:col-span-5' },
  { key: 'value', label: 'القيمة', span: 'sm:col-span-3' },
  { key: 'unit', label: 'الوحدة', span: 'sm:col-span-3' },
]

/** خطوة القياسات والمتابعة. */
export function StepMetrics({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="Ruler"
        title="القياسات والمتابعة"
        description="الأرقام اللي تبي تتابعها — وزنك، نسبة دهونك، محيطاتك. تساعدك تشوف تقدّمك."
      />
      <EditableTable<MetricRow>
        items={ctx.data.metrics}
        columns={columns}
        onChange={(metrics) => ctx.update({ metrics })}
        makeEmpty={() => ({ label: '', value: '', unit: '' })}
        addLabel="إضافة قياس"
      />
    </div>
  )
}
