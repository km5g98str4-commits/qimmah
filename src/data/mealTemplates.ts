import type { MealTemplate } from '@/types/nutrition'

// قوالب وجبات جاهزة (~20) — تستخدم معرّفات مكونات من mealIngredients.ts.

export const mealTemplates: MealTemplate[] = [
  { id: 'high-protein-breakfast', nameAr: 'فطور عالي البروتين', nameEn: 'High-Protein Breakfast', mealType: 'breakfast', ingredientIds: ['eggs', 'egg-whites', 'arabic-bread', 'mixed-salad'], defaultServings: { eggs: 3, 'egg-whites': 2, 'arabic-bread': 1, 'mixed-salad': 1 } },
  { id: 'eggs-and-bread', nameAr: 'بيض وخبز', nameEn: 'Eggs & Bread', mealType: 'breakfast', ingredientIds: ['eggs', 'white-bread', 'olive-oil'], defaultServings: { eggs: 2, 'white-bread': 2, 'olive-oil': 1 } },
  { id: 'oats-and-whey', nameAr: 'شوفان وواي', nameEn: 'Oats & Whey', mealType: 'breakfast', ingredientIds: ['oats', 'whey-protein', 'banana', 'peanut-butter'], defaultServings: { oats: 1, 'whey-protein': 1, banana: 1, 'peanut-butter': 1 } },
  { id: 'light-yogurt-oats', nameAr: 'زبادي وشوفان', nameEn: 'Yogurt & Oats', mealType: 'breakfast', ingredientIds: ['greek-yogurt', 'oats', 'strawberry'], defaultServings: { 'greek-yogurt': 1, oats: 1, strawberry: 1 } },
  { id: 'fava-bread-breakfast', nameAr: 'فول وخبز', nameEn: 'Fava & Bread', mealType: 'breakfast', ingredientIds: ['fava-beans', 'arabic-bread', 'olive-oil', 'tomato'], defaultServings: { 'fava-beans': 1, 'arabic-bread': 1, 'olive-oil': 1, tomato: 1 } },
  { id: 'chicken-rice', nameAr: 'دجاج وأرز', nameEn: 'Chicken & Rice', mealType: 'lunch', ingredientIds: ['chicken-breast', 'white-rice', 'mixed-vegetables', 'olive-oil'], defaultServings: { 'chicken-breast': 2, 'white-rice': 1, 'mixed-vegetables': 1, 'olive-oil': 1 } },
  { id: 'beef-rice', nameAr: 'لحم وأرز', nameEn: 'Beef & Rice', mealType: 'lunch', ingredientIds: ['lean-beef', 'brown-rice', 'mixed-salad'], defaultServings: { 'lean-beef': 2, 'brown-rice': 1, 'mixed-salad': 1 } },
  { id: 'kabsa-chicken', nameAr: 'كبسة دجاج', nameEn: 'Chicken Kabsa', mealType: 'lunch', ingredientIds: ['kabsa-rice', 'chicken-breast', 'mixed-salad'], defaultServings: { 'kabsa-rice': 2, 'chicken-breast': 2, 'mixed-salad': 1 } },
  { id: 'shrimp-rice', nameAr: 'روبيان وأرز', nameEn: 'Shrimp & Rice', mealType: 'lunch', ingredientIds: ['shrimp', 'white-rice', 'broccoli'], defaultServings: { shrimp: 2, 'white-rice': 1, broccoli: 1 } },
  { id: 'chicken-sweet-potato', nameAr: 'دجاج وبطاطا', nameEn: 'Chicken & Sweet Potato', mealType: 'lunch', ingredientIds: ['chicken-breast', 'sweet-potato', 'broccoli'], defaultServings: { 'chicken-breast': 2, 'sweet-potato': 1, broccoli: 1 } },
  { id: 'turkey-wrap', nameAr: 'راب ديك رومي', nameEn: 'Turkey Wrap', mealType: 'lunch', ingredientIds: ['turkey-breast', 'arabic-bread', 'mixed-salad'], defaultServings: { 'turkey-breast': 2, 'arabic-bread': 1, 'mixed-salad': 1 } },
  { id: 'tuna-sandwich', nameAr: 'سندويتش تونة', nameEn: 'Tuna Sandwich', mealType: 'snack', ingredientIds: ['tuna', 'brown-bread', 'cucumber'], defaultServings: { tuna: 1, 'brown-bread': 2, cucumber: 1 } },
  { id: 'greek-yogurt-snack', nameAr: 'سناك زبادي', nameEn: 'Greek Yogurt Snack', mealType: 'snack', ingredientIds: ['greek-yogurt', 'mixed-nuts', 'honey'], defaultServings: { 'greek-yogurt': 1, 'mixed-nuts': 1, honey: 1 } },
  { id: 'cottage-fruit', nameAr: 'جبن قريش وفاكهة', nameEn: 'Cottage & Fruit', mealType: 'snack', ingredientIds: ['cottage-cheese', 'apple', 'almonds'], defaultServings: { 'cottage-cheese': 1, apple: 1, almonds: 1 } },
  { id: 'nuts-dates-snack', nameAr: 'مكسرات وتمر', nameEn: 'Nuts & Dates', mealType: 'snack', ingredientIds: ['mixed-nuts', 'dates'], defaultServings: { 'mixed-nuts': 1, dates: 3 } },
  { id: 'pre-workout-snack', nameAr: 'سناك قبل التمرين', nameEn: 'Pre-Workout Snack', mealType: 'pre_workout', ingredientIds: ['banana', 'coffee', 'dates'], defaultServings: { banana: 1, coffee: 1, dates: 3 } },
  { id: 'post-workout-meal', nameAr: 'وجبة بعد التمرين', nameEn: 'Post-Workout Meal', mealType: 'post_workout', ingredientIds: ['whey-protein', 'white-rice', 'chicken-breast'], defaultServings: { 'whey-protein': 1, 'white-rice': 1, 'chicken-breast': 1 } },
  { id: 'protein-shake', nameAr: 'شيك بروتين', nameEn: 'Protein Shake', mealType: 'post_workout', ingredientIds: ['whey-protein', 'milk', 'banana'], defaultServings: { 'whey-protein': 1, milk: 1, banana: 1 } },
  { id: 'light-dinner', nameAr: 'عشاء خفيف', nameEn: 'Light Dinner', mealType: 'dinner', ingredientIds: ['salmon', 'mixed-salad', 'sweet-potato'], defaultServings: { salmon: 1, 'mixed-salad': 1, 'sweet-potato': 1 } },
  { id: 'salmon-quinoa', nameAr: 'سلمون وكينوا', nameEn: 'Salmon & Quinoa', mealType: 'dinner', ingredientIds: ['salmon', 'quinoa', 'spinach'], defaultServings: { salmon: 1, quinoa: 1, spinach: 1 } },
]

export const mealTemplateMap: Record<string, MealTemplate> = Object.fromEntries(
  mealTemplates.map((t) => [t.id, t]),
)

export function getMealTemplate(id: string): MealTemplate | undefined {
  return mealTemplateMap[id]
}
