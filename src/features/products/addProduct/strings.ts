import type { Lang } from '@/lib/appPreferences'

export interface AddProductStrings {
  title: string
  titleNew: string
  barcodeLabel: string
  barcodeNone: string
  nameLabel: string
  namePlaceholder: string
  brandLabel: string
  brandPlaceholder: string
  perLabel: string
  perServing: string
  per100g: string
  servingSizeLabel: string
  servingSizePlaceholder: string
  kcalLabel: string
  proteinLabel: string
  carbsLabel: string
  fatLabel: string
  optional: string
  gramsUnit: string

  photosTitle: string
  productPhotoLabel: string
  nutritionPhotoLabel: string
  photoHint: string
  retake: string
  remove: string
  takePhoto: string
  choosePhoto: string
  cameraDenied: string

  ocrTitle: string
  ocrRun: string
  ocrRunning: string
  ocrDisclaimer: string
  ocrFailed: string
  ocrNoneFound: string
  ocrFoundSome: string
  ocrConfirmLabel: string
  ocrConfirmRequired: string

  saveHint: string
  save: string
  saved: string
  cancel: string
  close: string
}

const ar: AddProductStrings = {
  title: 'إضافة منتج',
  titleNew: 'منتج جديد',
  barcodeLabel: 'الباركود',
  barcodeNone: 'بلا باركود (إضافة يدوية)',
  nameLabel: 'اسم المنتج',
  namePlaceholder: 'مثال: حليب قليل الدسم',
  brandLabel: 'العلامة التجارية',
  brandPlaceholder: 'مثال: المراعي',
  perLabel: 'القيم لكل',
  perServing: 'حصّة',
  per100g: '100 غ',
  servingSizeLabel: 'حجم الحصّة',
  servingSizePlaceholder: 'مثال: 250 مل، علبة واحدة',
  kcalLabel: 'سعرات حرارية',
  proteinLabel: 'بروتين',
  carbsLabel: 'كربوهيدرات',
  fatLabel: 'دهون',
  optional: 'اختياري',
  gramsUnit: 'غ',

  photosTitle: 'الصور',
  productPhotoLabel: 'صورة المنتج',
  nutritionPhotoLabel: 'صورة جدول الحقائق الغذائية',
  photoHint: 'وضّح الصورة لو تبي تستخدم القراءة التلقائية (OCR) بدقّة أفضل.',
  retake: 'إعادة التقاط',
  remove: 'إزالة',
  takePhoto: 'التقط صورة',
  choosePhoto: 'اختر من الاستديو',
  cameraDenied: 'ما قدرنا نوصل للكاميرا مباشرة — اختر صورة من الاستديو أو التقطها عبر كاميرا الجهاز.',

  ocrTitle: 'قراءة تلقائية للجدول الغذائي (OCR)',
  ocrRun: 'استخرج القيم تلقائيًا',
  ocrRunning: 'جارٍ التعرّف على النص… قد يستغرق لحظات',
  ocrDisclaimer: 'القراءة التلقائية مساعِدة فقط وقد تُخطئ — راجع القيم وصحّحها قبل الحفظ.',
  ocrFailed: 'ما قدرنا نقرأ الجدول تلقائيًا. عبّي القيم يدويًا — الصورة راح تُحفظ مع المنتج للمراجعة لاحقًا.',
  ocrNoneFound: 'ما لقينا أرقامًا واضحة في الصورة. عبّي القيم يدويًا.',
  ocrFoundSome: 'عبّينا بعض القيم من الصورة — راجعها وصحّح أي رقم قبل الحفظ.',
  ocrConfirmLabel: 'راجعت القيم المستخرجة وصحّحت أي خطأ فيها',
  ocrConfirmRequired: 'أكّد مراجعة القيم المستخرجة تلقائيًا قبل الحفظ.',

  saveHint: 'تقدر تحفظ المنتج الآن حتى بدون كل التفاصيل — تكمّلها لاحقًا. الصور تُحفظ دائمًا مع المنتج.',
  save: 'حفظ المنتج',
  saved: 'تم حفظ المنتج',
  cancel: 'إلغاء',
  close: 'إغلاق',
}

const en: AddProductStrings = {
  title: 'Add product',
  titleNew: 'New product',
  barcodeLabel: 'Barcode',
  barcodeNone: 'No barcode (manual entry)',
  nameLabel: 'Product name',
  namePlaceholder: 'e.g. Low-fat milk',
  brandLabel: 'Brand',
  brandPlaceholder: 'e.g. Almarai',
  perLabel: 'Values per',
  perServing: 'Serving',
  per100g: '100 g',
  servingSizeLabel: 'Serving size',
  servingSizePlaceholder: 'e.g. 250 ml, 1 pack',
  kcalLabel: 'Calories',
  proteinLabel: 'Protein',
  carbsLabel: 'Carbs',
  fatLabel: 'Fat',
  optional: 'optional',
  gramsUnit: 'g',

  photosTitle: 'Photos',
  productPhotoLabel: 'Product photo',
  nutritionPhotoLabel: 'Nutrition facts photo',
  photoHint: 'A clear, well-lit photo improves automatic reading (OCR) accuracy.',
  retake: 'Retake',
  remove: 'Remove',
  takePhoto: 'Take photo',
  choosePhoto: 'Choose from gallery',
  cameraDenied: "Couldn't access the camera directly — choose a photo from your gallery or use your device camera.",

  ocrTitle: 'Automatic nutrition-table reading (OCR)',
  ocrRun: 'Extract values automatically',
  ocrRunning: 'Reading the text… this may take a moment',
  ocrDisclaimer: 'Automatic reading is assistive only and may be wrong — review and correct the values before saving.',
  ocrFailed: "We couldn't read the table automatically. Fill in the values manually — the photo is still saved with the product for later review.",
  ocrNoneFound: "We couldn't find clear numbers in the photo. Fill in the values manually.",
  ocrFoundSome: 'We filled in some values from the photo — review and correct any number before saving.',
  ocrConfirmLabel: "I reviewed the extracted values and corrected any mistakes",
  ocrConfirmRequired: 'Confirm you reviewed the auto-extracted values before saving.',

  saveHint: 'You can save the product now even without every detail — finish it later. Photos are always saved with the product.',
  save: 'Save product',
  saved: 'Product saved',
  cancel: 'Cancel',
  close: 'Close',
}

export const addProductStrings: Record<Lang, AddProductStrings> = { ar, en }
