import type { Lang } from '@/lib/appPreferences'

export interface NutritionScreenStrings {
  // units
  gramsUnit: string
  mlUnit: string
  litersUnit: string
  caloriesUnit: string
  proteinShort: string
  // equation operators
  opMinus: string
  opPlus: string
  opEquals: string
  // composed captions
  caloriesDotProteinG: string // ...cal · Ng protein
  // quick add fallback / search
  quickAddLabel: string
  noResults: string
  foodNameExample: string
  // ingredient picker
  ingredientLibraryTitle: string
  close: string
  noResultsDot: string
  add: string
  catAll: string
  catProtein: string
  catCarb: string
  catFat: string
  catVegetable: string
  catFruit: string
  catDairy: string
  catDrink: string
  catOther: string
}

const ar: NutritionScreenStrings = {
  gramsUnit: 'غ',
  mlUnit: 'مل',
  litersUnit: 'لتر',
  caloriesUnit: 'سعرة',
  proteinShort: 'بروتين',
  opMinus: '−',
  opPlus: '+',
  opEquals: '=',
  caloriesDotProteinG: 'بروتين',
  quickAddLabel: 'إضافة سريعة',
  noResults: 'لا نتائج',
  foodNameExample: 'مثال: صحن كبسة بيت',
  ingredientLibraryTitle: 'مكتبة المكونات',
  close: 'إغلاق',
  noResultsDot: 'ما فيه نتائج.',
  add: 'أضف',
  catAll: 'كل الأصناف',
  catProtein: 'بروتين',
  catCarb: 'كربوهيدرات',
  catFat: 'دهون',
  catVegetable: 'خضار',
  catFruit: 'فواكه',
  catDairy: 'ألبان',
  catDrink: 'مشروبات',
  catOther: 'أخرى',
}

const en: NutritionScreenStrings = {
  gramsUnit: 'g',
  mlUnit: 'ml',
  litersUnit: 'L',
  caloriesUnit: 'cal',
  proteinShort: 'Protein',
  opMinus: '−',
  opPlus: '+',
  opEquals: '=',
  caloriesDotProteinG: 'protein',
  quickAddLabel: 'Quick add',
  noResults: 'No results',
  foodNameExample: 'e.g. Home kabsa plate',
  ingredientLibraryTitle: 'Ingredient library',
  close: 'Close',
  noResultsDot: 'No results.',
  add: 'Add',
  catAll: 'All categories',
  catProtein: 'Protein',
  catCarb: 'Carbs',
  catFat: 'Fat',
  catVegetable: 'Vegetables',
  catFruit: 'Fruit',
  catDairy: 'Dairy',
  catDrink: 'Drinks',
  catOther: 'Other',
}

export const nutritionScreenStrings: Record<Lang, NutritionScreenStrings> = { ar, en }
