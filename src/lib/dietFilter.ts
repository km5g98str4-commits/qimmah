// فلتر النمط الغذائي (Qimmah) — يربط نمط الأكل من الإعداد (foodPreferences.dietPattern)
// باقتراح الوجبات والوجبات التلقائية والبدائل. بلا ادعاءات صحية — مجرّد تصفية مكوّنات.
//
// المبدأ: نصنّف كل مكوّن إلى فئة مصدرها (لحم/سمك/بيض/ألبان/عسل/نبات)، ثم نطبّق قاعدة النمط:
//  - نباتي (vegetarian): يستبعد اللحوم والأسماك/البحريات. الألبان والبيض مسموحة.
//  - نباتي صرف (vegan): نباتي فقط — يستبعد كل مشتقّات الحيوان (لحم/سمك/بيض/ألبان/عسل).
//  - بيسكتاريان (pescatarian): يستبعد لحوم الحيوانات البرّية فقط — السمك/البحريات مسموحة.
//  - بدون قيود/قليل كارب/كيتو: لا تصفية بالمصدر (أنماط ماكروز لا تُقصي اللحوم).

import type { DietPattern } from '@/types/onboarding'
import type { MealIngredient, MealTemplate, PlanMeal } from '@/types/nutrition'

/** فئة مصدر المكوّن الغذائي. */
export type DietSource = 'meat' | 'fish' | 'egg' | 'dairy' | 'honey' | 'plant'

// تصنيف صريح بالمعرّف للمكوّنات ذات المصدر الحيواني؛ ما عدا ذلك يُعدّ نباتيًا.
// (نعتمد التصنيف الصريح بدل الاستدلال من الفئة لتفادي الأخطاء — مثل واي بروتين = ألبان.)
const MEAT_IDS = new Set(['chicken-breast', 'lean-beef', 'ground-beef-lean', 'turkey-breast'])
const FISH_IDS = new Set(['tuna', 'salmon', 'shrimp'])
const EGG_IDS = new Set(['eggs', 'egg-whites'])
const DAIRY_IDS = new Set([
  'whey-protein', 'milk', 'greek-yogurt', 'laban', 'labneh', 'feta-cheese', 'cottage-cheese', 'butter',
])
const HONEY_IDS = new Set(['honey'])

/** يصنّف مكوّنًا حسب معرّفه إلى فئة مصدره. */
export function ingredientSource(ingredientId: string): DietSource {
  if (MEAT_IDS.has(ingredientId)) return 'meat'
  if (FISH_IDS.has(ingredientId)) return 'fish'
  if (EGG_IDS.has(ingredientId)) return 'egg'
  if (DAIRY_IDS.has(ingredientId)) return 'dairy'
  if (HONEY_IDS.has(ingredientId)) return 'honey'
  return 'plant'
}

/** هل تسمح قاعدة النمط بفئة مصدر معيّنة؟ */
export function dietAllowsSource(pattern: DietPattern | undefined, source: DietSource): boolean {
  switch (pattern) {
    case 'vegetarian':
      return source !== 'meat' && source !== 'fish'
    case 'vegan':
      return source === 'plant'
    case 'pescatarian':
      return source !== 'meat'
    // بدون قيود / قليل كارب / كيتو / غير محدّد: لا إقصاء بالمصدر.
    default:
      return true
  }
}

/** هل المكوّن مسموح ضمن النمط الغذائي؟ */
export function ingredientAllowedForDiet(ingredientId: string, pattern: DietPattern | undefined): boolean {
  return dietAllowsSource(pattern, ingredientSource(ingredientId))
}

/** هل كل مكوّنات هذه القائمة مسموحة ضمن النمط؟ */
function allIngredientsAllowed(ingredientIds: string[], pattern: DietPattern | undefined): boolean {
  return ingredientIds.every((id) => ingredientAllowedForDiet(id, pattern))
}

/** هل قالب الوجبة مسموح ضمن النمط الغذائي؟ */
export function templateAllowedForDiet(template: MealTemplate, pattern: DietPattern | undefined): boolean {
  return allIngredientsAllowed(template.ingredientIds, pattern)
}

/** هل وجبة الخطة (بمكوّناتها) مسموحة ضمن النمط الغذائي؟ */
export function mealAllowedForDiet(meal: Pick<PlanMeal, 'ingredients'>, pattern: DietPattern | undefined): boolean {
  return allIngredientsAllowed(meal.ingredients.map((mi: MealIngredient) => mi.ingredientId), pattern)
}

/** هل يفرض هذا النمط إقصاءً بالمصدر (نباتي/صرف/بيسكتاريان)؟ */
export function dietRestrictsSources(pattern: DietPattern | undefined): boolean {
  return pattern === 'vegetarian' || pattern === 'vegan' || pattern === 'pescatarian'
}
