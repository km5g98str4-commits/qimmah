import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { MealRow } from '@/lib/customization'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة خطة الأكل. */
export function StepMeals({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const columns: ColumnDef<MealRow>[] = [
    { key: 'name', label: d.mealsColName, span: 'sm:col-span-3' },
    { key: 'time', label: d.mealsColTime, span: 'sm:col-span-2' },
    { key: 'calories', label: d.mealsColCalories, type: 'number', span: 'sm:col-span-2' },
    { key: 'protein', label: d.mealsColProtein, type: 'number', span: 'sm:col-span-2' },
    { key: 'carbs', label: d.mealsColCarbs, type: 'number', span: 'sm:col-span-1' },
    { key: 'fats', label: d.mealsColFats, type: 'number', span: 'sm:col-span-1' },
  ]
  return (
    <div>
      <StepHeader
        icon="Salad"
        title={d.mealsStepTitle}
        description={d.mealsStepDescription}
      />
      <EditableTable<MealRow>
        items={ctx.data.meals}
        columns={columns}
        onChange={(meals) => ctx.update({ meals })}
        makeEmpty={() => ({ name: '', time: '', calories: 0, protein: 0, carbs: 0, fats: 0 })}
        addLabel={d.mealsAddLabel}
        lang={ctx.lang}
      />
    </div>
  )
}
