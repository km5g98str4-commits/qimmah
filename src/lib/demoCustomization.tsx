// وضع النموذج (Demo) — بيانات عرض غنية مولّدة، بلا حفظ.
//
// فُصل عن customizationContext (P11.5): هذا الملف يستورد مولّد الخطط (وقاعدة
// التمارين) لذا يجب أن يبقى ضمن حزمة DemoView الكسولة فقط — لا في حزمة الإقلاع.

import { useState } from 'react'
import type { ReactNode } from 'react'
import { type Customization, getDefaultCustomization } from './customization'
import { StaticCustomizationProvider } from './customizationContext'
import { generatePlan } from './planGenerator'

/** يبني نسخة عرض غنية للنموذج (دون حفظ) — خطة مولّدة ومتّسقة. */
function buildDemoCustomization(): Customization {
  const base = getDefaultCustomization()
  // النموذج التجريبي فقط يستخدم اسمًا توضيحيًا «أحمد محمد» (لا يظهر في إعداد المستخدم الحقيقي).
  const demoProfile = { ...base.profile, name: 'أحمد محمد' }
  const g = generatePlan(demoProfile)
  return {
    ...base,
    // هوية عيّنة للنموذج فقط (واضح أنها تجريبية) — لا تُكتب في تخزين المستخدم.
    identity: {
      ...base.identity,
      userName: 'أحمد (نموذج)',
      mainGoal: 'الوصول إلى 78 كجم وتحسين شكل الجسم',
    },
    profile: demoProfile,
    targets: g.targets,
    workoutPlan: g.workoutPlan,
    routine: g.weeklySchedule,
    nutritionPlan: g.nutritionPlan,
    commitmentPlan: g.commitmentPlan,
    measurementPlan: g.measurementPlan,
    wellnessPlan: {
      ...base.wellnessPlan,
      // عيّنة دواء للمتابعة (الجرعة مُدخلة كمثال فقط — ليست توصية)
      medications: [
        {
          id: 'demo-med-1',
          medicationId: 'vitamin-d-rx',
          dose: 'حبة',
          timing: 'مع الإفطار',
          frequency: 'أسبوعيًا',
          beforeAfterFood: 'with',
          notes: '',
          doctorNote: 'حسب وصف الطبيب',
          order: 0,
        },
      ],
    },
  }
}

/** مزوّد للعرض فقط (النموذج) — بيانات تجريبية غنية، بلا حفظ وبلا تغيير ألوان عامة. */
export function DemoCustomizationProvider({ children }: { children: ReactNode }) {
  const [customization] = useState<Customization>(() => buildDemoCustomization())
  return <StaticCustomizationProvider customization={customization}>{children}</StaticCustomizationProvider>
}
