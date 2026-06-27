import type { MuscleGroup, MuscleId } from '@/types/muscles'

// تصنيف العضلات التفصيلي — مصدر الحقيقة لأسماء العضلات والأهداف الأسبوعية.
// الأهداف الأسبوعية: العضلات الكبيرة 8–16 مجموعة، الصغيرة 6–12 (تُعدَّل حسب المستوى في muscleCoverage).

const LARGE = { min: 8, max: 16 }
const SMALL = { min: 6, max: 12 }

export const muscleGroups: MuscleGroup[] = [
  // ===== الصدر =====
  { id: 'chest_upper', labelAr: 'صدر علوي', labelEn: 'Upper Chest', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'push' },
  { id: 'chest_mid', labelAr: 'صدر', labelEn: 'Chest', view: 'front', size: 'large', weeklyTarget: LARGE, region: 'push' },
  { id: 'chest_lower', labelAr: 'صدر سفلي', labelEn: 'Lower Chest', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'push' },

  // ===== الظهر =====
  { id: 'lats', labelAr: 'لاتس', labelEn: 'Lats', view: 'back', size: 'large', weeklyTarget: LARGE, region: 'pull' },
  { id: 'upper_back', labelAr: 'ظهر علوي', labelEn: 'Upper Back', view: 'back', size: 'large', weeklyTarget: LARGE, region: 'pull' },
  { id: 'traps', labelAr: 'ترابيس', labelEn: 'Traps', view: 'back', size: 'small', weeklyTarget: SMALL, region: 'pull' },

  // ===== الأكتاف =====
  { id: 'rear_delts', labelAr: 'كتف خلفي', labelEn: 'Rear Delts', view: 'back', size: 'small', weeklyTarget: SMALL, region: 'pull' },
  { id: 'front_delts', labelAr: 'كتف أمامي', labelEn: 'Front Delts', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'push' },
  { id: 'side_delts', labelAr: 'كتف جانبي', labelEn: 'Side Delts', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'push' },

  // ===== الذراع =====
  { id: 'biceps', labelAr: 'بايسبس', labelEn: 'Biceps', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'pull' },
  { id: 'triceps', labelAr: 'ترايسبس', labelEn: 'Triceps', view: 'back', size: 'small', weeklyTarget: SMALL, region: 'push' },
  { id: 'forearms', labelAr: 'ساعد', labelEn: 'Forearms', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'pull' },

  // ===== الجذع =====
  { id: 'abs', labelAr: 'بطن', labelEn: 'Abs', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'core' },
  { id: 'obliques', labelAr: 'جوانب البطن', labelEn: 'Obliques', view: 'front', size: 'small', weeklyTarget: SMALL, region: 'core' },
  { id: 'lower_back', labelAr: 'أسفل الظهر', labelEn: 'Lower Back', view: 'back', size: 'small', weeklyTarget: SMALL, region: 'core' },

  // ===== الأرجل =====
  { id: 'quads', labelAr: 'أمامية الفخذ', labelEn: 'Quads', view: 'front', size: 'large', weeklyTarget: LARGE, region: 'legs' },
  { id: 'hamstrings', labelAr: 'خلفية الفخذ', labelEn: 'Hamstrings', view: 'back', size: 'large', weeklyTarget: LARGE, region: 'legs' },
  { id: 'glutes', labelAr: 'المؤخرة', labelEn: 'Glutes', view: 'back', size: 'large', weeklyTarget: LARGE, region: 'legs' },
  { id: 'calves', labelAr: 'السمانة', labelEn: 'Calves', view: 'back', size: 'small', weeklyTarget: SMALL, region: 'legs' },
]

/** خريطة سريعة للوصول لعضلة بالمعرّف. */
export const muscleMap: Record<MuscleId, MuscleGroup> = Object.fromEntries(
  muscleGroups.map((m) => [m.id, m]),
) as Record<MuscleId, MuscleGroup>

export function getMuscle(id: MuscleId): MuscleGroup | undefined {
  return muscleMap[id]
}

/** الاسم العربي لعضلة (أو المعرّف إن لم تُعرَّف). */
export function muscleLabelAr(id: MuscleId): string {
  return muscleMap[id]?.labelAr ?? id
}

export const ALL_MUSCLE_IDS: MuscleId[] = muscleGroups.map((m) => m.id)
