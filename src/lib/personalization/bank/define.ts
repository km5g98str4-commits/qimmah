// مُعرِّف السؤال — افتراضات صريحة بدل تكرارها 180 مرّة.
//
// الافتراض الوحيد الخطر هنا هو `safety: 'none'`: سؤال يمسّ السلامة **يجب** أن
// يعلنها صراحةً. ولذلك لا يوجد افتراض لـ`affects` — تركها فارغة خطأ ترجمة، لا
// سهو يمرّ. وهذا تطبيق مباشر للقاعدة الذهبية: «كل سؤال يغيّر شيئًا في المخرجات».

import { BANK_VERSION, type ProfileField, type QuestionDef } from '../types'

type Draft = Omit<QuestionDef, 'analyticsKey' | 'since' | 'required' | 'skippable' | 'safety' | 'priority' | 'infoGain'> & {
  affects: readonly [ProfileField, ...ProfileField[]]
  required?: boolean
  skippable?: boolean
  safety?: QuestionDef['safety']
  priority?: number
  infoGain?: number
  analyticsKey?: string
  since?: number
}

/** يبني تعريف سؤال مكتملًا. `affects` مطلوب نوعيًا بعنصر واحد على الأقل. */
export function q(def: Draft): QuestionDef {
  return {
    ...def,
    required: def.required ?? false,
    skippable: def.skippable ?? true,
    safety: def.safety ?? 'none',
    priority: def.priority ?? 50,
    infoGain: def.infoGain ?? 5,
    analyticsKey: def.analyticsKey ?? def.id,
    since: def.since ?? BANK_VERSION,
  }
}

/** خيارات نصّية بلا أثر مباشر — النص في القاموس، والقيمة وحدها هنا. */
export function opts(...values: string[]): QuestionDef['options'] {
  return values.map((value) => ({ value }))
}
