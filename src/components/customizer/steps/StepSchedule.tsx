import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { RoutineRow } from '@/lib/customization'
import { routineTypeLabels } from '@/data/routine'

const routineTypeOptions = (Object.keys(routineTypeLabels) as RoutineRow['type'][]).map((t) => ({
  value: t,
  label: routineTypeLabels[t],
}))

const columns: ColumnDef<RoutineRow>[] = [
  { key: 'day', label: 'اليوم', span: 'sm:col-span-3' },
  { key: 'title', label: 'الوصف', span: 'sm:col-span-5' },
  { key: 'type', label: 'النوع', options: routineTypeOptions, span: 'sm:col-span-3' },
]

/** خطوة الجدول الأسبوعي. */
export function StepSchedule({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="CalendarDays"
        title="جدولي الأسبوعي"
        description="رتّب أيامك بين تمرين وراحة. اضغط «إضافة يوم» أو احذف اللي ما يناسبك."
      />
      <EditableTable<RoutineRow>
        items={ctx.data.routine}
        columns={columns}
        onChange={(routine) => ctx.update({ routine })}
        makeEmpty={() => ({ day: '', title: '', type: 'rest' })}
        addLabel="إضافة يوم"
      />
    </div>
  )
}
