// P8 A3 proof — إضافة منتج يدويًا + OCR: يثبت أن (1) منتجًا مضافًا يدويًا بباركود يُحفظ
// ويُحلّ محليًا عند "مسح تالٍ" لنفس الباركود بلا شبكة، (2) الحفظ يعمل حتى بلا قيم غذائية
// (لا يُفقَد أي إدخال) ويُعلَّم pending_review، (3) استخراج OCR النصّي (best-effort) يلتقط
// قيمًا معقولة من نص عربي/إنجليزي نموذجي. أداة إثبات فقط (localStorage مُحاكى).

import { upsertProduct, getProductByBarcode, listUserProducts } from '@/features/products/addProduct/productStore'
import { parseNutritionText } from '@/features/products/addProduct/ocr'

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

// 1) إضافة يدوية بباركود لم يُوجد عبر Open Food Facts → upsert بقيم كاملة.
const barcode = '6281007000123'
const saved = upsertProduct({
  barcode,
  name: 'حليب قليل الدسم',
  brand: 'المراعي',
  per: 'serving',
  servingSize: '250 مل',
  kcal: 120,
  protein: 8,
  carbs: 12,
  fat: 3,
  imageUrl: 'data:image/jpeg;base64,AAA',
  nutritionImageUrl: 'data:image/jpeg;base64,BBB',
  sourceName: 'user',
  status: 'user_submitted',
})
check(saved.sourceName === 'user', 'sourceName محفوظ كـ user')
check(saved.status === 'user_submitted', 'status محفوظ كـ user_submitted لمنتج بقيم كاملة')
check(!!saved.imageUrl && !!saved.nutritionImageUrl, 'صورة المنتج وصورة الجدول الغذائي محفوظتان دائمًا')

// 2) "المسح التالي" لنفس الباركود يُحلّ محليًا من المتجر بلا أي طلب شبكة.
const resolved = getProductByBarcode(barcode)
check(!!resolved && resolved.name === 'حليب قليل الدسم', 'المنتج يُحلّ محليًا عند مسح نفس الباركود لاحقًا')
check(resolved?.id === saved.id, 'نفس السجل (id) يُعاد — لا تكرار عند مسح نفس الباركود مرة أخرى')

// 3) تحديث نفس الباركود (تصحيح لاحق) → upsert يحدّث السجل بدل إنشاء سجل مكرّر.
const updated = upsertProduct({ ...resolved!, kcal: 125 })
check(updated.id === saved.id && updated.kcal === 125, 'upsert لنفس الباركود يحدّث السجل الموجود (لا تكرار)')
check(listUserProducts().length === 1, 'قائمة المنتجات تحتوي سجلًا واحدًا فقط بعد التحديث')

// 4) الحفظ بلا أي قيم غذائية (OCR فشل تمامًا ولم يُدخل المستخدم شيئًا) → لا يُفقَد الإدخال،
//    يُعلَّم pending_review، والصور المرفقة تبقى محفوظة للمراجعة لاحقًا.
const barcode2 = '6281007000456'
const savedNoNutrition = upsertProduct({
  barcode: barcode2,
  name: 'منتج جديد · ' + barcode2,
  per: '100g',
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  nutritionImageUrl: 'data:image/jpeg;base64,CCC',
  sourceName: 'user',
  status: 'pending_review',
})
check(savedNoNutrition.status === 'pending_review', 'منتج بلا قيم غذائية يُحفظ ويُعلَّم pending_review')
check(!!getProductByBarcode(barcode2), 'الإدخال بلا قيم غذائية لا يُفقَد — يُحلّ لاحقًا من المتجر')
check(!!savedNoNutrition.nutritionImageUrl, 'صورة الجدول الغذائي تبقى محفوظة حتى مع فشل القيم')

// 5) استخراج OCR — نص عربي/إنجليزي نموذجي (best-effort، دقة غير مطلوبة، فقط تعبئة معقولة).
const sampleAr = 'الحقائق الغذائية\nسعرات حرارية 250\nبروتين 9 غ\nكربوهيدرات 30 غ\nدهون 7 غ'
const extractedAr = parseNutritionText(sampleAr)
check(extractedAr.kcal === 250, `OCR عربي: استخرج السعرات (${extractedAr.kcal})`)
check(extractedAr.protein === 9, `OCR عربي: استخرج البروتين (${extractedAr.protein})`)
check(extractedAr.carbs === 30, `OCR عربي: استخرج الكارب (${extractedAr.carbs})`)
check(extractedAr.fat === 7, `OCR عربي: استخرج الدهون (${extractedAr.fat})`)

const sampleEn = 'Nutrition Facts\nCalories 180\nProtein: 5g\nCarbohydrate 20g\nFat 4g'
const extractedEn = parseNutritionText(sampleEn)
check(extractedEn.kcal === 180, `OCR English: extracted calories (${extractedEn.kcal})`)
check(extractedEn.protein === 5, `OCR English: extracted protein (${extractedEn.protein})`)

// 6) نص بلا أرقام غذائية واضحة → best-effort يعيد undefined بدل تخمين رقم خاطئ.
const garbled = parseNutritionText('ملصق تالف بلا بيانات واضحة')
check(
  garbled.kcal === undefined && garbled.protein === undefined && garbled.carbs === undefined && garbled.fat === undefined,
  'نص بلا قيم غذائية واضحة لا يُنتج أرقامًا وهمية (undefined بدل تخمين)',
)

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
