import type { Lang } from '@/lib/appPreferences'

export interface NutritionScreenStrings {
  // units
  gramsUnit: string
  /** [CTO-009/WP-4] وحدة الإدخال: غرام أو حصة */
  unitGrams: string
  unitServings: string
  servingsUnit: string
  equalsApprox: string
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
  editEntry: string
  saveEdit: string
  cancelEdit: string
  quantity: string
  invalidQuantity: string
  saveFailed: string
  noResults: string
  /**
   * [COMMISSIONING §7] بلاغ الصنف الناقص — يظهر في حالة «ما فيه نتائج» وحدها.
   * النبرة: دعوة قصيرة بلا وعدٍ بموعد، ونتيجةٌ لكل حالة بسببها الصادق.
   */
  reportMissing: string
  reportMissingHint: string
  reportQueued: string
  reportAlreadyQueued: string
  reportRateLimited: string
  reportNeedsAccount: string
  reportNoBackend: string
  reportFailed: string
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
  scanTorch: string
  scanNoCamera: string
  scanErrorGeneric: string
  scanNetworkErrorTitle: string
  scanNetworkErrorHint: string
  scanRetry: string
  // تنبيه الحساسيات — الخطة لا تُفلتر تلقائيًا بعد
  allergyNoticeTitle: string
  allergyNoticeBodyPrefix: string
  allergyNoticeBodySuffix: string
  allergyNoticeSeparator: string
  // [FOOD-UX-001] «أكلاتي» — الأطعمة المخصّصة المحفوظة
  tabMine: string
  mineBadge: string
  saveToMine: string
  saveNeedsName: string
  mineEmpty: string
  mineLog: string
  mineEdit: string
  mineDelete: string
  mineConfirmDelete: string
  mineDeleteFailed: string
  mineSaved: string
  mineUpdated: string
  mineEditing: string
  perServing: string
  servingsLabel: string
  logAndSave: string
}

const ar: NutritionScreenStrings = {
  gramsUnit: 'غ',
  unitGrams: 'غرام',
  unitServings: 'حصة',
  servingsUnit: 'حصة',
  equalsApprox: '≈',
  mlUnit: 'مل',
  litersUnit: 'لتر',
  caloriesUnit: 'سعرة',
  proteinShort: 'بروتين',
  opMinus: '−',
  opPlus: '+',
  opEquals: '=',
  caloriesDotProteinG: 'بروتين',
  quickAddLabel: 'إضافة سريعة',
  editEntry: 'عدّل الكمية',
  saveEdit: 'احفظ التعديل',
  cancelEdit: 'إلغاء',
  quantity: 'الكمية',
  invalidQuantity: 'اكتب كمية أكبر من صفر وضمن الحد المسموح.',
  saveFailed: 'ما قدرنا نحفظ التغيير. مدخلاتك باقية—جرّب مرة ثانية.',
  noResults: 'ما فيه نتائج',
  reportMissing: 'بلّغنا عنه',
  reportMissingHint: 'نراجعه ونضيفه لو ضبط. ما نضيف أرقام من عندنا.',
  reportQueued: 'وصلنا بلاغك. نراجعه ونضيفه لو ضبط.',
  reportAlreadyQueued: 'فيه بلاغ عنه عندنا أصلًا — تحت المراجعة.',
  reportRateLimited: 'بلّغت كثير اليوم. جرّب بكرة.',
  reportNeedsAccount: 'تحتاج حساب عشان نعرف نرجع لك.',
  reportNoBackend: 'هذي نسخة مراجعة بلا خادم، فما نقدر نستقبل البلاغ.',
  reportFailed: 'ما وصل البلاغ — العطل عندنا. جرّب بعد شوي.',
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
  scanHint: 'وجّه الكاميرا على الباركود',
  scanCancel: 'إلغاء',
  scanPermissionDenied: 'ما قدرنا نوصل للكاميرا. تأكد إن صلاحية الكاميرا مسموحة من إعدادات المتصفح.',
  scanLookingUp: 'ندوّر على المنتج…',
  scanNotFoundTitle: 'ما لقينا المنتج',
  scanNotFoundHint: 'قاعدة البيانات ما تغطي كل المنتجات المحلية لسا — تقدر تضيفه يدوي.',
  scanAddManually: 'إضافة يدوية',
  scanTryAgain: 'امسح مرة ثانية',
  scanFoundHint: 'لقينا المنتج — راجع القيم وسجّله.',
  scanAttribution: 'بيانات المنتج من Open Food Facts (رخصة ODbL)',
  scanUnsupported: 'المتصفح ما يدعم مسح الباركود — استخدم الإضافة اليدوية.',
  scanTorch: 'الفلاش',
  scanNoCamera: 'ما لقينا كاميرا في الجهاز — أضف المنتج يدوي.',
  scanErrorGeneric: 'صار خطأ مو متوقّع وقت المسح. جرّب مرة ثانية أو أضف المنتج يدوي.',
  scanNetworkErrorTitle: 'ما فيه نت',
  scanNetworkErrorHint: 'قرينا الباركود بس ما قدرنا نوصل لقاعدة بيانات المنتجات. شيّك على النت وجرّب مرة ثانية، أو أضف المنتج يدوي.',
  scanRetry: 'جرّب مرة ثانية',
  allergyNoticeTitle: 'راجع مكوّنات وجباتك',
  allergyNoticeBodyPrefix: 'سجّلت حساسية من:',
  allergyNoticeBodySuffix:
    'خطة الوجبات الحالية ما تستبعدها تلقائيًا بعد — تأكّد من مكوّنات أي وجبة قبل ما تنفّذها، وبدّلها إذا لزم.',
  allergyNoticeSeparator: '، ',
  tabMine: 'أكلاتي',
  mineBadge: 'من أكلاتي',
  saveToMine: 'احفظها في أكلاتي',
  saveNeedsName: 'اكتب اسم عشان تنحفظ في أكلاتي.',
  mineEmpty: 'ما عندك أكلات محفوظة. سوّ وحدة من «إضافة مخصّصة» وتلقاها هنا كل يوم.',
  mineLog: 'سجّل',
  mineEdit: 'تعديل',
  mineDelete: 'حذف',
  mineConfirmDelete: 'أكّد الحذف',
  mineDeleteFailed: 'ما انحذفت. جرّب مرة ثانية.',
  mineSaved: 'انحفظت في أكلاتي.',
  mineUpdated: 'اتعدّلت.',
  mineEditing: 'تعديل أكلة',
  perServing: 'لكل حصة',
  servingsLabel: 'عدد الحصص',
  logAndSave: 'سجّل واحفظ',
}

const en: NutritionScreenStrings = {
  gramsUnit: 'g',
  unitGrams: 'Grams',
  unitServings: 'Servings',
  servingsUnit: 'serving(s)',
  equalsApprox: '≈',
  mlUnit: 'ml',
  litersUnit: 'L',
  caloriesUnit: 'cal',
  proteinShort: 'Protein',
  opMinus: '−',
  opPlus: '+',
  opEquals: '=',
  caloriesDotProteinG: 'protein',
  quickAddLabel: 'Quick add',
  editEntry: 'Edit quantity',
  saveEdit: 'Save change',
  cancelEdit: 'Cancel',
  quantity: 'Quantity',
  invalidQuantity: 'Enter an amount above zero and within the allowed limit.',
  saveFailed: "Couldn't save the change. Your input is still here—try again.",
  noResults: 'No results',
  reportMissing: 'Tell us',
  reportMissingHint: "We'll review it and add it if it checks out. We never make up numbers.",
  reportQueued: "Got it. We'll review it and add it if it checks out.",
  reportAlreadyQueued: "Someone already reported this — it's in review.",
  reportRateLimited: "That's a lot of reports today. Try again tomorrow.",
  reportNeedsAccount: 'You need an account so we can follow up.',
  reportNoBackend: 'This is a review build with no server, so we cannot take the report.',
  reportFailed: "The report didn't go through — that's on us. Try again shortly.",
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
  scanTorch: 'Flashlight',
  scanNoCamera: 'No camera found on this device — add the product manually.',
  scanErrorGeneric: 'Something went wrong while scanning. Try again or add the product manually.',
  scanNetworkErrorTitle: 'No connection',
  scanNetworkErrorHint: "We read the barcode but couldn't reach the product database. Check your connection and try again, or add the product manually.",
  scanRetry: 'Try again',
  allergyNoticeTitle: 'Check your meal ingredients',
  allergyNoticeBodyPrefix: 'You told us you are allergic to:',
  allergyNoticeBodySuffix: 'Your meal plan does not exclude these automatically yet — check the ingredients of any meal before you make it, and swap it if needed.',
  allergyNoticeSeparator: ', ',
  tabMine: 'My foods',
  mineBadge: 'Saved',
  saveToMine: 'Save to my foods',
  saveNeedsName: 'Add a name to save it to your foods.',
  mineEmpty: 'No saved foods yet. Create one from “Custom add” and find it here every day.',
  mineLog: 'Log',
  mineEdit: 'Edit',
  mineDelete: 'Delete',
  mineConfirmDelete: 'Confirm delete',
  mineDeleteFailed: 'Could not delete. Try again.',
  mineSaved: 'Saved to your foods.',
  mineUpdated: 'Updated.',
  mineEditing: 'Editing food',
  perServing: 'per serving',
  servingsLabel: 'Servings',
  logAndSave: 'Log & save',
}

export const nutritionScreenStrings: Record<Lang, NutritionScreenStrings> = { ar, en }
