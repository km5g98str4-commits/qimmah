import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { RoutineRow } from '@/lib/customization'
import { routineTypeLabels } from '@/data/routine'
import { onboardingStrings } from '@/i18n/dict/onboarding'

const routineTypeOptions = (Object.keys(routineTypeLabels) as RoutineRow['type'][]).map((t) => ({
  value: t,
  label: routineTypeLabels[t],
}))

/** خطوة الجدول الأسبوعي. */
export function StepSchedule({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const columns: ColumnDef<RoutineRow>[] = [
    { key: 'day', label: d.scheduleColDay, span: 'sm:col-span-3' },
    { key: 'title', label: d.scheduleColTitle, span: 'sm:col-span-5' },
    { key: 'type', label: d.scheduleColType, options: routineTypeOptions, span: 'sm:col-span-3' },
  ]
  return (
    <div>
      <StepHeader
        icon="CalendarDays"
        title={d.scheduleTitle}
        description={d.scheduleDescription}
      />
      <EditableTable<RoutineRow>
        items={ctx.data.routine}
        columns={columns}
        onChange={(routine) => ctx.update({ routine })}
        makeEmpty={() => ({ day: '', title: '', type: 'rest' })}
        addLabel={d.scheduleAddLabel}
        lang={ctx.lang}
      />
    </div>
  )
}
