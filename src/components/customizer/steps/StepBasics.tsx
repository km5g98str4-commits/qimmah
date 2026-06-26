import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { userTypeOptions, type Customization } from '@/lib/customization'

/** خطوة البيانات الأساسية — الاسم، اسم الصفحة، الوصف، والنوع. */
export function StepBasics({ ctx }: { ctx: WizardCtx }) {
  const { data, updateIdentity } = ctx
  return (
    <div>
      <StepHeader
        icon="Users"
        title="بياناتي الأساسية"
        description="نبدأ بأسمك وشكل التعريف بصفحتك. كل هذا تقدر تغيّره لاحقًا."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="اسمك" hint="يظهر في صفحتك وفي ترحيب «اليوم»">
          <input
            className={inputClass}
            value={data.identity.userName}
            placeholder="مثال: زياد"
            onChange={(e) => updateIdentity({ userName: e.target.value })}
          />
        </Field>
        <Field label="اسم صفحتك" hint="العنوان اللي يظهر فوق">
          <input
            className={inputClass}
            value={data.identity.brandName}
            placeholder="مثال: قِمّة"
            onChange={(e) => updateIdentity({ brandName: e.target.value })}
          />
        </Field>
        <Field label="وصف قصير" hint="جملة تعرّف بصفحتك">
          <input
            className={inputClass}
            value={data.identity.tagline}
            placeholder="مثال: خطتي الشخصية للنادي"
            onChange={(e) => updateIdentity({ tagline: e.target.value })}
          />
        </Field>
        <Field label="نوعك">
          <select
            className={inputClass}
            value={data.identity.userType}
            onChange={(e) =>
              updateIdentity({ userType: e.target.value as Customization['identity']['userType'] })
            }
          >
            {userTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}
