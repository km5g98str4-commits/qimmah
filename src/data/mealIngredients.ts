import type { Ingredient, IngredientCategory } from '@/types/nutrition'

// مكتبة المكونات — ~60 صنفًا شائعًا ومناسبًا للسوق السعودي/الخليجي.
// القيم لكل «حصة» وتقريبية وقد تختلف حسب المنتج وطريقة التحضير.

interface IngInput {
  id: string
  nameAr: string
  nameEn: string
  category: IngredientCategory
  servingAr: string
  servingEn: string
  cal: number
  p: number
  c: number
  f: number
}

function ing(i: IngInput): Ingredient {
  return {
    id: i.id,
    nameAr: i.nameAr,
    nameEn: i.nameEn,
    category: i.category,
    servingLabelAr: i.servingAr,
    servingLabelEn: i.servingEn,
    calories: i.cal,
    protein: i.p,
    carbs: i.c,
    fat: i.f,
  }
}

export const mealIngredients: Ingredient[] = [
  // ===== بروتين =====
  ing({ id: 'chicken-breast', nameAr: 'صدر دجاج', nameEn: 'Chicken Breast', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 165, p: 31, c: 0, f: 4 }),
  ing({ id: 'lean-beef', nameAr: 'لحم بقري قليل الدهن', nameEn: 'Lean Beef', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 180, p: 26, c: 0, f: 8 }),
  ing({ id: 'ground-beef-lean', nameAr: 'لحم مفروم قليل الدهن', nameEn: 'Lean Ground Beef', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 200, p: 26, c: 0, f: 11 }),
  ing({ id: 'eggs', nameAr: 'بيض', nameEn: 'Eggs', category: 'protein', servingAr: 'بيضة', servingEn: '1 egg', cal: 78, p: 6, c: 1, f: 5 }),
  ing({ id: 'egg-whites', nameAr: 'بياض بيض', nameEn: 'Egg Whites', category: 'protein', servingAr: 'بياض بيضة', servingEn: '1 white', cal: 17, p: 4, c: 0, f: 0 }),
  ing({ id: 'tuna', nameAr: 'تونة (ماء)', nameEn: 'Tuna (water)', category: 'protein', servingAr: 'علبة', servingEn: '1 can', cal: 110, p: 25, c: 0, f: 1 }),
  ing({ id: 'salmon', nameAr: 'سلمون', nameEn: 'Salmon', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 208, p: 20, c: 0, f: 13 }),
  ing({ id: 'shrimp', nameAr: 'روبيان', nameEn: 'Shrimp', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 99, p: 24, c: 0, f: 1 }),
  ing({ id: 'turkey-breast', nameAr: 'صدر ديك رومي', nameEn: 'Turkey Breast', category: 'protein', servingAr: '100غ', servingEn: '100g', cal: 135, p: 30, c: 0, f: 1 }),
  ing({ id: 'whey-protein', nameAr: 'واي بروتين', nameEn: 'Whey Protein', category: 'protein', servingAr: 'مكيال', servingEn: '1 scoop', cal: 120, p: 24, c: 3, f: 1 }),
  ing({ id: 'lentils', nameAr: 'عدس', nameEn: 'Lentils', category: 'protein', servingAr: 'كوب مطبوخ', servingEn: '1 cup', cal: 230, p: 18, c: 40, f: 1 }),
  ing({ id: 'chickpeas', nameAr: 'حمّص حب', nameEn: 'Chickpeas', category: 'protein', servingAr: 'كوب', servingEn: '1 cup', cal: 269, p: 15, c: 45, f: 4 }),
  ing({ id: 'fava-beans', nameAr: 'فول', nameEn: 'Fava Beans', category: 'protein', servingAr: 'كوب', servingEn: '1 cup', cal: 187, p: 13, c: 33, f: 1 }),

  // ===== كربوهيدرات =====
  ing({ id: 'white-rice', nameAr: 'أرز أبيض', nameEn: 'White Rice', category: 'carb', servingAr: 'كوب مطبوخ', servingEn: '1 cup', cal: 205, p: 4, c: 45, f: 0 }),
  ing({ id: 'brown-rice', nameAr: 'أرز بني', nameEn: 'Brown Rice', category: 'carb', servingAr: 'كوب مطبوخ', servingEn: '1 cup', cal: 216, p: 5, c: 45, f: 2 }),
  ing({ id: 'kabsa-rice', nameAr: 'أرز كبسة', nameEn: 'Kabsa Rice', category: 'carb', servingAr: 'كوب', servingEn: '1 cup', cal: 250, p: 5, c: 46, f: 5 }),
  ing({ id: 'potato', nameAr: 'بطاطس', nameEn: 'Potato', category: 'carb', servingAr: 'حبة متوسطة', servingEn: '1 medium', cal: 161, p: 4, c: 37, f: 0 }),
  ing({ id: 'sweet-potato', nameAr: 'بطاطا حلوة', nameEn: 'Sweet Potato', category: 'carb', servingAr: 'حبة', servingEn: '1 medium', cal: 112, p: 2, c: 26, f: 0 }),
  ing({ id: 'oats', nameAr: 'شوفان', nameEn: 'Oats', category: 'carb', servingAr: 'نصف كوب جاف', servingEn: '½ cup dry', cal: 150, p: 5, c: 27, f: 3 }),
  ing({ id: 'white-bread', nameAr: 'خبز أبيض', nameEn: 'White Bread', category: 'carb', servingAr: 'شريحة', servingEn: '1 slice', cal: 75, p: 3, c: 14, f: 1 }),
  ing({ id: 'brown-bread', nameAr: 'خبز أسمر', nameEn: 'Brown Bread', category: 'carb', servingAr: 'شريحة', servingEn: '1 slice', cal: 80, p: 4, c: 14, f: 1 }),
  ing({ id: 'arabic-bread', nameAr: 'خبز عربي', nameEn: 'Arabic Bread', category: 'carb', servingAr: 'رغيف', servingEn: '1 loaf', cal: 165, p: 5, c: 33, f: 1 }),
  ing({ id: 'pasta', nameAr: 'معكرونة', nameEn: 'Pasta', category: 'carb', servingAr: 'كوب مطبوخ', servingEn: '1 cup', cal: 200, p: 7, c: 42, f: 1 }),
  ing({ id: 'dates', nameAr: 'تمر', nameEn: 'Dates', category: 'carb', servingAr: 'تمرة', servingEn: '1 date', cal: 20, p: 0, c: 5, f: 0 }),
  ing({ id: 'honey', nameAr: 'عسل', nameEn: 'Honey', category: 'carb', servingAr: 'ملعقة', servingEn: '1 tbsp', cal: 64, p: 0, c: 17, f: 0 }),
  ing({ id: 'bulgur', nameAr: 'برغل', nameEn: 'Bulgur', category: 'carb', servingAr: 'كوب', servingEn: '1 cup', cal: 150, p: 6, c: 34, f: 0 }),
  ing({ id: 'cornflakes', nameAr: 'كورن فليكس', nameEn: 'Cornflakes', category: 'carb', servingAr: 'كوب', servingEn: '1 cup', cal: 100, p: 2, c: 24, f: 0 }),
  ing({ id: 'quinoa', nameAr: 'كينوا', nameEn: 'Quinoa', category: 'carb', servingAr: 'كوب', servingEn: '1 cup', cal: 222, p: 8, c: 39, f: 4 }),

  // ===== دهون =====
  ing({ id: 'olive-oil', nameAr: 'زيت زيتون', nameEn: 'Olive Oil', category: 'fat', servingAr: 'ملعقة', servingEn: '1 tbsp', cal: 119, p: 0, c: 0, f: 14 }),
  ing({ id: 'mixed-nuts', nameAr: 'مكسرات مشكّلة', nameEn: 'Mixed Nuts', category: 'fat', servingAr: 'حفنة 30غ', servingEn: '30g', cal: 180, p: 5, c: 6, f: 16 }),
  ing({ id: 'almonds', nameAr: 'لوز', nameEn: 'Almonds', category: 'fat', servingAr: '20 حبة', servingEn: '20 nuts', cal: 140, p: 5, c: 5, f: 12 }),
  ing({ id: 'peanut-butter', nameAr: 'زبدة فول سوداني', nameEn: 'Peanut Butter', category: 'fat', servingAr: 'ملعقة', servingEn: '1 tbsp', cal: 94, p: 4, c: 3, f: 8 }),
  ing({ id: 'avocado', nameAr: 'أفوكادو', nameEn: 'Avocado', category: 'fat', servingAr: 'نصف ثمرة', servingEn: '½ fruit', cal: 120, p: 1, c: 6, f: 11 }),
  ing({ id: 'tahini', nameAr: 'طحينة', nameEn: 'Tahini', category: 'fat', servingAr: 'ملعقة', servingEn: '1 tbsp', cal: 89, p: 3, c: 3, f: 8 }),
  ing({ id: 'butter', nameAr: 'زبدة', nameEn: 'Butter', category: 'fat', servingAr: 'ملعقة صغيرة', servingEn: '1 tsp', cal: 36, p: 0, c: 0, f: 4 }),

  // ===== خضار =====
  ing({ id: 'mixed-salad', nameAr: 'سلطة خضراء', nameEn: 'Mixed Salad', category: 'vegetable', servingAr: 'طبق', servingEn: '1 plate', cal: 50, p: 2, c: 10, f: 0 }),
  ing({ id: 'cucumber', nameAr: 'خيار', nameEn: 'Cucumber', category: 'vegetable', servingAr: 'حبة', servingEn: '1 piece', cal: 16, p: 1, c: 4, f: 0 }),
  ing({ id: 'tomato', nameAr: 'طماطم', nameEn: 'Tomato', category: 'vegetable', servingAr: 'حبة', servingEn: '1 piece', cal: 22, p: 1, c: 5, f: 0 }),
  ing({ id: 'broccoli', nameAr: 'بروكلي', nameEn: 'Broccoli', category: 'vegetable', servingAr: 'كوب', servingEn: '1 cup', cal: 55, p: 4, c: 11, f: 0 }),
  ing({ id: 'mixed-vegetables', nameAr: 'خضار مشكّلة', nameEn: 'Mixed Vegetables', category: 'vegetable', servingAr: 'كوب', servingEn: '1 cup', cal: 70, p: 3, c: 13, f: 0 }),
  ing({ id: 'spinach', nameAr: 'سبانخ', nameEn: 'Spinach', category: 'vegetable', servingAr: 'كوب', servingEn: '1 cup', cal: 7, p: 1, c: 1, f: 0 }),
  ing({ id: 'carrots', nameAr: 'جزر', nameEn: 'Carrots', category: 'vegetable', servingAr: 'حبة', servingEn: '1 piece', cal: 25, p: 1, c: 6, f: 0 }),

  // ===== فواكه =====
  ing({ id: 'banana', nameAr: 'موز', nameEn: 'Banana', category: 'fruit', servingAr: 'حبة', servingEn: '1 piece', cal: 105, p: 1, c: 27, f: 0 }),
  ing({ id: 'apple', nameAr: 'تفاح', nameEn: 'Apple', category: 'fruit', servingAr: 'حبة', servingEn: '1 piece', cal: 95, p: 0, c: 25, f: 0 }),
  ing({ id: 'orange', nameAr: 'برتقال', nameEn: 'Orange', category: 'fruit', servingAr: 'حبة', servingEn: '1 piece', cal: 62, p: 1, c: 15, f: 0 }),
  ing({ id: 'grapes', nameAr: 'عنب', nameEn: 'Grapes', category: 'fruit', servingAr: 'كوب', servingEn: '1 cup', cal: 104, p: 1, c: 27, f: 0 }),
  ing({ id: 'watermelon', nameAr: 'بطيخ', nameEn: 'Watermelon', category: 'fruit', servingAr: 'شريحة', servingEn: '1 slice', cal: 86, p: 2, c: 22, f: 0 }),
  ing({ id: 'strawberry', nameAr: 'فراولة', nameEn: 'Strawberry', category: 'fruit', servingAr: 'كوب', servingEn: '1 cup', cal: 49, p: 1, c: 12, f: 0 }),

  // ===== ألبان =====
  ing({ id: 'milk', nameAr: 'حليب قليل الدسم', nameEn: 'Low-Fat Milk', category: 'dairy', servingAr: 'كوب', servingEn: '1 cup', cal: 103, p: 8, c: 12, f: 2 }),
  ing({ id: 'greek-yogurt', nameAr: 'زبادي يوناني', nameEn: 'Greek Yogurt', category: 'dairy', servingAr: 'علبة 170غ', servingEn: '170g', cal: 100, p: 17, c: 6, f: 0 }),
  ing({ id: 'laban', nameAr: 'لبن', nameEn: 'Laban', category: 'dairy', servingAr: 'كوب', servingEn: '1 cup', cal: 80, p: 4, c: 10, f: 3 }),
  ing({ id: 'labneh', nameAr: 'لبنة', nameEn: 'Labneh', category: 'dairy', servingAr: 'ملعقتان', servingEn: '2 tbsp', cal: 60, p: 3, c: 2, f: 4 }),
  ing({ id: 'feta-cheese', nameAr: 'جبن فيتا', nameEn: 'Feta Cheese', category: 'dairy', servingAr: '30غ', servingEn: '30g', cal: 80, p: 4, c: 1, f: 6 }),
  ing({ id: 'cottage-cheese', nameAr: 'جبن قريش', nameEn: 'Cottage Cheese', category: 'dairy', servingAr: 'نصف كوب', servingEn: '½ cup', cal: 90, p: 12, c: 4, f: 3 }),

  // ===== مشروبات =====
  ing({ id: 'water', nameAr: 'ماء', nameEn: 'Water', category: 'drink', servingAr: 'كوب', servingEn: '1 cup', cal: 0, p: 0, c: 0, f: 0 }),
  ing({ id: 'coffee', nameAr: 'قهوة (سادة)', nameEn: 'Coffee (black)', category: 'drink', servingAr: 'فنجان', servingEn: '1 cup', cal: 2, p: 0, c: 0, f: 0 }),
  ing({ id: 'tea', nameAr: 'شاي (سادة)', nameEn: 'Tea (plain)', category: 'drink', servingAr: 'كوب', servingEn: '1 cup', cal: 2, p: 0, c: 0, f: 0 }),
  ing({ id: 'orange-juice', nameAr: 'عصير برتقال', nameEn: 'Orange Juice', category: 'drink', servingAr: 'كوب', servingEn: '1 cup', cal: 112, p: 2, c: 26, f: 0 }),

  // ===== أخرى =====
  ing({ id: 'dark-chocolate', nameAr: 'شوكولاتة داكنة', nameEn: 'Dark Chocolate', category: 'other', servingAr: 'مربعان 20غ', servingEn: '20g', cal: 120, p: 2, c: 9, f: 9 }),
  ing({ id: 'hummus', nameAr: 'حمّص بطحينة', nameEn: 'Hummus', category: 'other', servingAr: 'ملعقتان', servingEn: '2 tbsp', cal: 70, p: 2, c: 6, f: 5 }),
]

export const ingredientMap: Record<string, Ingredient> = Object.fromEntries(
  mealIngredients.map((i) => [i.id, i]),
)

export function getIngredient(id: string): Ingredient | undefined {
  return ingredientMap[id]
}
