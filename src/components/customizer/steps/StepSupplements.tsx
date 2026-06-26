import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { SupplementRow } from '@/lib/customization'

const typeOptions = [
  { value: 'supplement', label: 'مكمل' },
  { value: 'medication', label: 'دواء' },
]

const columns: ColumnDef<SupplementRow>[] = [
  { key: 'name', label: 'الاسم', span: 'sm:col-span-3' },
  { key: 'dose', label: 'الجرعة', span: 'sm:col-span-3' },
  { key: 'timing', label: 'التوقيت', span: 'sm:col-span-3' },
  { key: 'type', label: 'النوع', options: typeOptions, span: 'sm:col-span-2' },
]

/** خطوة المكملات والأدوية — مع تنويه صحي. */
export function StepSupplements({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="Pill"
        title="المكملات والأدوية"
        description="سجّل وش تاخذ، الجرعة، ووقتها — عشان تتابعها بدون ما تنسى."
      />

      {/* تنويه صحي */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
        <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
        <p className="text-sm leading-relaxed text-ink-700">
          هذه الصفحة للتنظيم والمتابعة فقط، ولا تغني عن استشارة الطبيب. لا تغيّر جرعة أي دواء بدون
          الرجوع للطبيب.
        </p>
      </div>

      <EditableTable<SupplementRow>
        items={ctx.data.supplements}
        columns={columns}
        onChange={(supplements) => ctx.update({ supplements })}
        makeEmpty={() => ({ name: '', dose: '', timing: '', type: 'supplement' })}
        addLabel="إضافة مكمل / دواء"
      />
    </div>
  )
}
