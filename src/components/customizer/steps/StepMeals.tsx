import { EditableTable, type ColumnDef } from '../EditableTable'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { MealRow } from '@/lib/customization'

const columns: ColumnDef<MealRow>[] = [
  { key: 'name', label: 'الوجبة', span: 'sm:col-span-3' },
  { key: 'time', label: 'الوقت', span: 'sm:col-span-2' },
  { key: 'calories', label: 'سعرات', type: 'number', span: 'sm:col-span-2' },
  { key: 'protein', label: 'بروتين', type: 'number', span: 'sm:col-span-2' },
  { key: 'carbs', label: 'كارب', type: 'number', span: 'sm:col-span-1' },
  { key: 'fats', label: 'دهون', type: 'number', span: 'sm:col-span-1' },
]

/** خطوة خطة الأكل. */
export function StepMeals({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="Salad"
        title="خطة الأكل"
        description="وجباتك وأوقاتها وسعراتك. خلّها بسيطة وواقعية تقدر تلتزم فيها."
      />
      <EditableTable<MealRow>
        items={ctx.data.meals}
        columns={columns}
        onChange={(meals) => ctx.update({ meals })}
        makeEmpty={() => ({ name: '', time: '', calories: 0, protein: 0, carbs: 0, fats: 0 })}
        addLabel="إضافة وجبة"
      />
    </div>
  )
}
