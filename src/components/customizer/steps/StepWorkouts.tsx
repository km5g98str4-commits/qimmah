import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { WorkoutRow } from '@/lib/customization'

const columns: ColumnDef<WorkoutRow>[] = [
  { key: 'name', label: 'التمرين', span: 'sm:col-span-3' },
  { key: 'muscle', label: 'العضلة', span: 'sm:col-span-2' },
  { key: 'sets', label: 'مجموعات', type: 'number', span: 'sm:col-span-2' },
  { key: 'reps', label: 'تكرارات', span: 'sm:col-span-2' },
  { key: 'weight', label: 'الوزن', span: 'sm:col-span-2' },
]

/** خطوة تمارين القوة. */
export function StepWorkouts({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="Dumbbell"
        title="تمارين القوة"
        description="تمارينك بمجموعاتها وتكراراتها وأوزانها — هذي اللي تظهر لك في «اليوم»."
      />
      <EditableTable<WorkoutRow>
        items={ctx.data.workouts}
        columns={columns}
        onChange={(workouts) => ctx.update({ workouts })}
        makeEmpty={() => ({ name: '', muscle: '', sets: 3, reps: '10', weight: '' })}
        addLabel="إضافة تمرين"
      />
    </div>
  )
}
