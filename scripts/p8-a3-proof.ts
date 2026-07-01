// P8 A3 proof — إضافة منتج يدويًا + OCR: يثبت أن (1) منتجًا مضافًا يدويًا بباركود يُحفظ عبر
// قاعدة منتجات وكيل P8-A1 المشتركة ويُحلّ محليًا عند "مسح تالٍ" لنفس الباركود بلا شبكة،
// (2) الحفظ يعمل حتى بلا قيم غذائية (لا يُفقَد أي إدخال) ويُعلَّم pending_review، (3) استخراج
// OCR النصّي (best-effort) يلتقط قيمًا معقولة من نص عربي/إنجليزي نموذجي. أداة إثبات فقط
// (localStorage مُحاكى).

import { upsertProduct, getProduct, searchProducts, getAuditLog } from '@/features/products'
import { parseNutritionText } from '@/features/products/addProduct/ocr'

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

// 1) إضافة يدوية بباركود لم يُوجد عبر Open Food Facts → upsert عبر قاعدة P8-A1 بقيم كاملة.
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
  status: 'user_submitted',
  source: { sourceName: 'user', importedAt: '2026-07-01T00:00:00.000Z' },
})
check(saved.sources.some((s) => s.sourceName === 'user'), 'مصدر user مسجَّل في sources[]')
check(saved.status === 'user_submitted', 'status محفوظ كـ user_submitted لمنتج بقيم كاملة')
check(!!saved.imageUrl && !!saved.nutritionImageUrl, 'صورة المنتج وصورة الجدول الغذائي محفوظتان دائمًا')

// 2) "المسح التالي" لنفس الباركود يُحلّ محليًا من المتجر المشترك بلا أي طلب شبكة.
const resolved = getProduct(barcode)
check(!!resolved && resolved.name === 'حليب قليل الدسم', 'المنتج يُحلّ محليًا عند مسح نفس الباركود لاحقًا')
check(resolved?.barcode === saved.barcode, 'نفس السجل (بالباركود) يُعاد — لا تكرار عند مسح نفس الباركود مرة أخرى')

// 3) تحديث نفس الباركود (تصحيح لاحق) → upsert يدمج في السجل الموجود بدل إنشاء سجل مكرّر.
const updated = upsertProduct({
  barcode,
  name: resolved!.name,
  per: resolved!.per,
  servingSize: resolved!.servingSize,
  kcal: 125,
  protein: resolved!.protein,
  carbs: resolved!.carbs,
  fat: resolved!.fat,
  status: 'user_submitted',
  source: { sourceName: 'user', importedAt: '2026-07-01T00:05:00.000Z' },
})
check(updated.barcode === saved.barcode && updated.kcal === 125, 'upsert لنفس الباركود يحدّث السجل الموجود (لا تكرار)')
check(updated.sources.filter((s) => s.sourceName === 'user').length === 1, 'مصدر user لا يتكرر في sources[] عند تحديثين متتاليين')
check(searchProducts('حليب قليل الدسم').length === 1, 'بحث الاسم يُرجع سجلًا واحدًا فقط بعد التحديث')
check(getAuditLog(barcode).some((e) => e.action === 'add') && getAuditLog(barcode).some((e) => e.action === 'merge'), 'سجل التدقيق يوثّق الإضافة ثم الدمج')

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
  status: 'pending_review',
  source: { sourceName: 'user', importedAt: '2026-07-01T00:10:00.000Z' },
})
check(savedNoNutrition.status === 'pending_review', 'منتج بلا قيم غذائية يُحفظ ويُعلَّم pending_review')
check(!!getProduct(barcode2), 'الإدخال بلا قيم غذائية لا يُفقَد — يُحلّ لاحقًا من المتجر')
check(!!savedNoNutrition.nutritionImageUrl, 'صورة الجدول الغذائي تبقى محفوظة حتى مع فشل القيم')

// 5) منتج بلا باركود (إضافة يدوية بحتة بلا مسح سابق) — الشاشة تولّد مفتاحًا محليًا فريدًا
//    (local:...) حتى يتوافق مع قاعدة المنتجات المفتاحة بالباركود دائمًا.
const localBarcode = `local:${Date.now().toString(36)}zzzzzz`
const savedLocal = upsertProduct({
  barcode: localBarcode,
  name: 'منتج بلا باركود',
  per: '100g',
  kcal: 50,
  protein: 2,
  carbs: 5,
  fat: 1,
  status: 'user_submitted',
  source: { sourceName: 'user', importedAt: '2026-07-01T00:15:00.000Z' },
})
check(!!getProduct(localBarcode) && savedLocal.name === 'منتج بلا باركود', 'منتج بمفتاح محلي مولَّد (بلا باركود حقيقي) يُحفظ ويُحلّ لاحقًا')

// 6) استخراج OCR — نص عربي/إنجليزي نموذجي (best-effort، دقة غير مطلوبة، فقط تعبئة معقولة).
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

// 7) نص بلا أرقام غذائية واضحة → best-effort يعيد undefined بدل تخمين رقم خاطئ.
const garbled = parseNutritionText('ملصق تالف بلا بيانات واضحة')
check(
  garbled.kcal === undefined && garbled.protein === undefined && garbled.carbs === undefined && garbled.fat === undefined,
  'نص بلا قيم غذائية واضحة لا يُنتج أرقامًا وهمية (undefined بدل تخمين)',
)

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
