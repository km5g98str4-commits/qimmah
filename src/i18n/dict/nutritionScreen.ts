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
  // barcode scanner
  scanBarcode: string
  scanTitle: string
  scanHint: string
  scanCancel: string
  scanPermissionDenied: string
  scanLookingUp: string
  scanNotFoundTitle: string
  scanNotFoundHint: string
  scanAddManually: string
  scanTryAgain: string
  scanFoundHint: string
  scanAttribution: string
  scanUnsupported: string
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
  scanBarcode: 'امسح الباركود 📷',
  scanTitle: 'مسح الباركود',
  scanHint: 'وجّه الكاميرا نحو الباركود',
  scanCancel: 'إلغاء',
  scanPermissionDenied: 'ما قدرنا نوصل للكاميرا. تأكد من منح صلاحية الكاميرا من إعدادات المتصفح.',
  scanLookingUp: 'جارٍ البحث عن المنتج…',
  scanNotFoundTitle: 'ما لقينا المنتج',
  scanNotFoundHint: 'تغطية قاعدة البيانات ما تشمل كل المنتجات المحلية بعد — تقدر تضيفه يدويًا.',
  scanAddManually: 'إضافة يدوية',
  scanTryAgain: 'أعد المسح',
  scanFoundHint: 'لقينا المنتج — راجع القيم وسجّله.',
  scanAttribution: 'بيانات المنتج من Open Food Facts (رخصة ODbL)',
  scanUnsupported: 'المتصفح ما يدعم مسح الباركود — استخدم الإضافة اليدوية.',
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
  scanBarcode: 'Scan barcode 📷',
  scanTitle: 'Scan barcode',
  scanHint: 'Point the camera at the barcode',
  scanCancel: 'Cancel',
  scanPermissionDenied: "Couldn't access the camera. Check camera permission in your browser settings.",
  scanLookingUp: 'Looking up product…',
  scanNotFoundTitle: 'Product not found',
  scanNotFoundHint: "Database coverage doesn't include every local product yet — you can add it manually.",
  scanAddManually: 'Add manually',
  scanTryAgain: 'Scan again',
  scanFoundHint: 'Found it — review the values and log it.',
  scanAttribution: 'Product data from Open Food Facts (ODbL license)',
  scanUnsupported: "This browser doesn't support barcode scanning — use manual entry instead.",
}

export const nutritionScreenStrings: Record<Lang, NutritionScreenStrings> = { ar, en }
