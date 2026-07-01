import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { SupplementRow } from '@/lib/customization'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة المكملات والأدوية — مع تنويه صحي. */
export function StepSupplements({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const typeOptions = [
    { value: 'supplement', label: d.suppTypeSupplement },
    { value: 'medication', label: d.suppTypeMedication },
  ]
  const columns: ColumnDef<SupplementRow>[] = [
    { key: 'name', label: d.suppColName, span: 'sm:col-span-3' },
    { key: 'dose', label: d.suppColDose, span: 'sm:col-span-3' },
    { key: 'timing', label: d.suppColTiming, span: 'sm:col-span-3' },
    { key: 'type', label: d.suppColType, options: typeOptions, span: 'sm:col-span-2' },
  ]
  return (
    <div>
      <StepHeader
        icon="Pill"
        title={d.suppStepTitle}
        description={d.suppStepDescription}
      />

      {/* تنويه صحي */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
        <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
        <p className="text-sm leading-relaxed text-ink-700">
          {d.suppSafetyNote}
        </p>
      </div>

      <EditableTable<SupplementRow>
        items={ctx.data.supplements}
        columns={columns}
        onChange={(supplements) => ctx.update({ supplements })}
        makeEmpty={() => ({ name: '', dose: '', timing: '', type: 'supplement' })}
        addLabel={d.suppAddLabel}
        lang={ctx.lang}
      />
    </div>
  )
}
