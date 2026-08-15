// إثبات مسار التغذية الحيّ: الكمية/المصدر لا يضيعان، وفشل التخزين لا يتحول
// إلى نجاح وهمي ولا يغيّر لقطة الذاكرة أو يوقظ المشتركين.

import { setEntitlement } from '@/lib/access/entitlementStore'
import {
  NUTRITION_V2_KEY,
  NutritionStorageError,
  addFoodToDay,
  getNutritionDaySnapshot,
  loadNutritionDay,
  removeFoodFromDay,
  subscribeNutritionDay,
  updateFoodInDay,
} from '@/lib/nutritionV2Model'
import { loadNutritionToday } from '@/lib/nutritionTracking'
import { sanitizeNumericInput } from '@/lib/validation'

declare global {
  // يعرّفها غلاف الإثبات فقط؛ ليست جزءًا من التطبيق.
  // eslint-disable-next-line no-var
  var __nutritionWriteFailure: 'quota' | 'security' | null
}

let pass = 0
const check = (label: string, condition: boolean): void => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات صدق مسار التغذية الحيّ')
localStorage.clear()
setEntitlement({ status: 'active', source: 'mock' })

check('مُطهّر كمية الحصص يبقي 0.25 و1.5 ككسور لا يحوّلهما إلى 25 و15', sanitizeNumericInput('0.25', { max: 20, decimal: true }) === '0.25' && sanitizeNumericInput('1.5', { max: 20, decimal: true }) === '1.5')
check('مُطهّر كمية الحصص يحصر الحد الأعلى ولا يسمح بإشارة سالبة', sanitizeNumericInput('25.5', { max: 20, decimal: true }) === '20' && sanitizeNumericInput('-1.5', { max: 20, decimal: true }) === '1.5')

const initial = {
  id: 'live-chicken',
  nameAr: 'صدر دجاج مشوي',
  nameEn: 'Grilled chicken breast',
  calories: 298,
  protein: 55.2,
  carbs: 0,
  fat: 6.5,
  meal: 'breakfast' as const,
  foodId: 'chicken-breast-grilled',
  grams: 180,
  servings: 1.2,
  unit: 'g' as const,
}

addFoodToDay(initial)
const canonical = loadNutritionDay().foods[0]
check('الكاتب القانوني يحفظ foodId والجرامات والحصص ووحدة الإدخال', canonical.foodId === initial.foodId && canonical.grams === 180 && canonical.servings === 1.2 && canonical.unit === 'g')

const adapted = loadNutritionToday().log[0]
check('محوّل الشاشة يعيد الكمية والمصدر بلا إسقاط', adapted.foodId === initial.foodId && adapted.grams === 180 && adapted.servings === 1.2 && adapted.unit === 'g')

const stableSnapshot = getNutritionDaySnapshot()
const storedBeforeFailure = localStorage.getItem(NUTRITION_V2_KEY)
let notifications = 0
const unsubscribe = subscribeNutritionDay(() => { notifications += 1 })

globalThis.__nutritionWriteFailure = 'quota'
let quotaError: unknown
try {
  updateFoodInDay({ ...initial, grams: 300, servings: 2, calories: 496, protein: 92, unit: 'serving' })
} catch (error) {
  quotaError = error
}
check('امتلاء الحصّة يرمي NutritionStorageError مسمّى بنتيجة quota', quotaError instanceof NutritionStorageError && quotaError.result === 'quota')
check('فشل التعديل لا يغيّر البايتات المحفوظة', localStorage.getItem(NUTRITION_V2_KEY) === storedBeforeFailure)
check('فشل التعديل لا يبدّل لقطة الذاكرة ولا يرسل إشعار نجاح', getNutritionDaySnapshot() === stableSnapshot && notifications === 0)

globalThis.__nutritionWriteFailure = null
updateFoodInDay({ ...initial, grams: 300, servings: 2, calories: 496, protein: 92, unit: 'serving' })
const updated = getNutritionDaySnapshot().foods[0]
check('إعادة المحاولة الناجحة تحدّث الكمية والماكروز ووحدة الإدخال معًا', updated.grams === 300 && updated.servings === 2 && updated.calories === 496 && updated.protein === 92 && updated.unit === 'serving')
check('النجاح وحده يوقظ المشتركين', notifications === 1)

const storedBeforeRemoveFailure = localStorage.getItem(NUTRITION_V2_KEY)
globalThis.__nutritionWriteFailure = 'security'
let securityError: unknown
try {
  removeFoodFromDay(initial.id)
} catch (error) {
  securityError = error
}
check('حجب التخزين يُصنّف unavailable ولا يبتلع الحذف', securityError instanceof NutritionStorageError && securityError.result === 'unavailable')
check('الحذف الفاشل يبقي القيد ولقطة الذاكرة كما هما', localStorage.getItem(NUTRITION_V2_KEY) === storedBeforeRemoveFailure && getNutritionDaySnapshot().foods.some((food) => food.id === initial.id) && notifications === 1)

globalThis.__nutritionWriteFailure = null
removeFoodFromDay(initial.id)
check('الحذف الناجح وحده يزيل القيد', getNutritionDaySnapshot().foods.length === 0 && notifications === 2)

addFoodToDay({ id: 'legacy-unknown', nameAr: 'قيد قديم', calories: 120, protein: 4, meal: 'snack' })
const legacyAdapted = loadNutritionToday().log.find((food) => food.id === 'legacy-unknown')
check('القيد القديم بلا كمية يبقى مجهول الكمية؛ لا تُختلق له حصة واحدة', legacyAdapted?.grams === undefined && legacyAdapted?.servings === undefined && legacyAdapted?.unit === undefined)
removeFoodFromDay('legacy-unknown')
unsubscribe()

console.log(`\n✅ صدق التغذية الحيّة: ${pass} فحوص، 0 فشل.`)
