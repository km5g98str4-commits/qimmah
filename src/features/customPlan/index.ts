// ميزة «الجدول المخصّص» (P10 A1) — باني خطة يدوي + تخزين لكل حساب + توصيل التبويب.

export { CustomPlanBuilder } from './CustomPlanBuilder'
export { PlanChoiceScreen } from './PlanChoiceScreen'
export { ExercisePickerSheet } from './ExercisePickerSheet'
export { customPlanStrings } from './strings'
export type { CustomPlanStrings, MuscleFilter } from './strings'
export {
  CUSTOM_PLAN_KEY,
  loadCustomPlanRecord,
  hasCustomPlan,
  saveCustomPlan,
  clearCustomPlan,
  getPlanSource,
  setPlanSource,
  getActivePlan,
  ownerKey,
} from './storage'
export type { PlanSource, CustomPlanRecord } from './storage'
