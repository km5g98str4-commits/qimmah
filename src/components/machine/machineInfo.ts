// (P12) بحث سريع في كتالوج الأجهزة — يعيد عنصر الكتالوج ومجموعته لمعرّف تمرين
// (يقبل المعرّفات القديمة عبر canonicalExerciseId). الجهاز المشترك بين مجموعتين
// (مثل جهاز الغطس المساعد) يُنسب لأول مجموعة يظهر فيها.

import { machineCatalog, type MachineGroup, type MachineItem } from '@/data/machineCatalog'
import { canonicalExerciseId } from '@/data/exercises'

export interface MachineInfo {
  group: MachineGroup
  item: MachineItem
}

const byExerciseId = new Map<string, MachineInfo>()
for (const group of machineCatalog) {
  for (const item of group.items) {
    if (!byExerciseId.has(item.exerciseId)) byExerciseId.set(item.exerciseId, { group, item })
  }
}

/** عنصر الكتالوج لمعرّف تمرين (أو undefined إن لم يكن جهاز كتالوج). */
export function findMachineInfo(exerciseId: string): MachineInfo | undefined {
  return byExerciseId.get(canonicalExerciseId(exerciseId))
}
