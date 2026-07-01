import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { WorkoutRow } from '@/lib/customization'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة تمارين القوة. */
export function StepWorkouts({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const columns: ColumnDef<WorkoutRow>[] = [
    { key: 'name', label: d.workoutsColName, span: 'sm:col-span-3' },
    { key: 'muscle', label: d.workoutsColMuscle, span: 'sm:col-span-2' },
    { key: 'sets', label: d.workoutsColSets, type: 'number', span: 'sm:col-span-2' },
    { key: 'reps', label: d.workoutsColReps, span: 'sm:col-span-2' },
    { key: 'weight', label: d.workoutsColWeight, span: 'sm:col-span-2' },
  ]
  return (
    <div>
      <StepHeader
        icon="Dumbbell"
        title={d.workoutsStepTitle}
        description={d.workoutsStepDescription}
      />
      <EditableTable<WorkoutRow>
        items={ctx.data.workouts}
        columns={columns}
        onChange={(workouts) => ctx.update({ workouts })}
        makeEmpty={() => ({ name: '', muscle: '', sets: 3, reps: '10', weight: '' })}
        addLabel={d.workoutsAddLabel}
        lang={ctx.lang}
      />
    </div>
  )
}
