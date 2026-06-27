// تجميع التغطية على مستوى المجموعات العضلية (الصدر/الظهر/الأكتاف/الذراع/الأرجل/الكور).
// منطق خالص بلا واجهة — يُستخدم في بطاقات تغطية العضلات وملخّصها.

import type { MuscleCoverage, MuscleId, MuscleStatus } from '@/types/muscles'
import type { TrainingLevel } from '@/types/profile'
import { weeklyTargetFor } from './muscleCoverage'

export interface MuscleGroupDef {
  name: string
  muscles: MuscleId[]
}

/** المجموعات العضلية بترتيب كمال الأجسام. */
export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  { name: 'الصدر', muscles: ['chest_upper', 'chest_mid', 'chest_lower'] },
  { name: 'الظهر', muscles: ['lats', 'upper_back', 'traps', 'lower_back'] },
  { name: 'الأكتاف', muscles: ['front_delts', 'side_delts', 'rear_delts'] },
  { name: 'الذراع', muscles: ['biceps', 'triceps', 'forearms'] },
  { name: 'الأرجل', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { name: 'الكور', muscles: ['abs', 'obliques'] },
]

export interface GroupResult {
  def: MuscleGroupDef
  sets: number
  target: number
  status: MuscleStatus
  recommendation: string
}

/** يجمع تغطية مجموعة عضلية ويحدّد حالتها وتوصيتها. */
function computeGroup(def: MuscleGroupDef, coverage: Record<string, MuscleCoverage>, level: TrainingLevel): GroupResult {
  let sets = 0
  let target = 0
  let fresh = 0
  let recovering = 0
  def.muscles.forEach((m) => {
    const c = coverage[m]
    sets += c?.sets ?? 0
    target += weeklyTargetFor(m, level)
    if (c?.status === 'fresh') fresh += 1
    if (c?.status === 'recovering') recovering += 1
  })
  sets = Math.round(sets * 10) / 10

  let status: MuscleStatus
  if (sets <= 0) status = 'undertrained'
  else if (fresh > 0) status = 'fresh'
  else if (recovering > 0) status = 'recovering'
  else if (sets >= target) status = 'trained'
  else if (sets >= target * 0.5) status = 'ready'
  else status = 'undertrained'

  return { def, sets, target, status, recommendation: recommendFor(def.name, status, sets, target) }
}

function recommendFor(name: string, status: MuscleStatus, sets: number, target: number): string {
  switch (status) {
    case 'trained':
      return 'تغطية ممتازة — حافظ على هالمستوى.'
    case 'ready':
      return `قربت من الهدف — ${Math.max(1, Math.ceil(target - sets))} مجموعات وتكتمل.`
    case 'recovering':
      return 'أعطها يوم راحة قبل التمرين الجاي.'
    case 'fresh':
      return 'تمرّنت للتو — راحة ٢٤–٤٨ ساعة.'
    case 'undertrained':
    default:
      return sets <= 0 ? `ابدأ تمرين ${name} هالأسبوع.` : `أضف ٢–٣ مجموعات لتغطية ${name}.`
  }
}

/** يحسب نتائج كل المجموعات. */
export function computeGroups(coverage: Record<string, MuscleCoverage>, level: TrainingLevel = 'intermediate'): GroupResult[] {
  return MUSCLE_GROUPS.map((g) => computeGroup(g, coverage, level))
}

/** ملخّص حالات المجموعات الست — يطابق ما تعرضه البطاقات. */
export function summarizeMuscleGroups(coverage: Record<string, MuscleCoverage>, level: TrainingLevel = 'intermediate') {
  const groups = computeGroups(coverage, level)
  return {
    complete: groups.filter((g) => g.status === 'trained').length,
    ready: groups.filter((g) => g.status === 'ready').length,
    needRest: groups.filter((g) => g.status === 'recovering' || g.status === 'fresh').length,
    undertrained: groups.filter((g) => g.status === 'undertrained').length,
  }
}
