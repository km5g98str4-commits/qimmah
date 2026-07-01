// إثبات P8 A2 — يفحص: (1) تحويل استجابة OFF الحقيقية (نوتيلا) لمنتج داخلي صحيح،
// (2) محاولة اتصال حقيقي بـ OFF (منتج مفرد + بحث السعودية) وتسجيل النتيجة أيًّا كانت،
// (3) منطق الدمج عند تعارض مصدرين (pending_review + alternateValues)، (4) resolveBarcode
// يستخدم القاعدة المحلية أولًا ثم الجالب المسجَّل. أداة إثبات فقط — لا تلمس التطبيق.

// polyfill بسيط لـ localStorage كي تعمل productDb.ts (مصمَّمة للمتصفح) داخل Node.
function makeMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  }
}
const globalWithWindow = globalThis as unknown as { window: { localStorage: ReturnType<typeof makeMemoryStorage> } }
globalWithWindow.window = { localStorage: makeMemoryStorage() }

const { mapOffRecordToProduct, fetchFromOFF, fetchSaudiOffPage, OFF_ATTRIBUTION_AR } = await import(
  '@/features/products/offSource'
)
const { upsert, getProduct, resolveBarcode, listPendingReview } = await import('@/features/products/productDb')

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

// —— 1) تحويل سجل OFF حقيقي (نوتيلا 3017624010701) — القيم موثّقة علنًا وسبق التحقق منها
// بـ curl حقيقي في جلسة P6 A3 (docs/product/P6_A3.md): status:1، energy-kcal_100g:539.
const NUTELLA_BARCODE = '3017624010701'
const nutellaFixture = {
  product_name: 'Nutella',
  brands: 'Ferrero',
  image_url: 'https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.jpg',
  serving_size: '15 g',
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
  },
}
const nutella = mapOffRecordToProduct(NUTELLA_BARCODE, nutellaFixture, 1000)
check(nutella !== null, 'mapOffRecordToProduct يحوّل سجل نوتيلا الحقيقي إلى منتج')
check(nutella?.caloriesPer100g === 539, `السعرات = 539 (فعليًا: ${nutella?.caloriesPer100g})`)
check(nutella?.proteinPer100g === 6.3 && nutella?.carbsPer100g === 57.5 && nutella?.fatPer100g === 30.9, 'البروتين/الكارب/الدهون تطابق nutriments الحقيقية')
check(nutella?.sourceName === 'open_food_facts' && nutella?.status === 'imported', 'sourceName=open_food_facts و status=imported')
check(nutella?.sourceUrl === `https://world.openfoodfacts.org/product/${NUTELLA_BARCODE}`, 'sourceUrl يشير لصفحة المنتج الحقيقية')

// —— منتج بلا اسم أو بلا سعرات → null (رفض بيانات غير قابلة للاستخدام)
check(mapOffRecordToProduct('0000000000000', { nutriments: {} }, 1) === null, 'منتج بلا اسم/سعرات → null')
check(mapOffRecordToProduct('123', { product_name: 'X', nutriments: {} }, 1) === null, 'منتج باسم لكن بلا سعرات → null')

// —— 2) محاولة اتصال حقيقي بـ OFF (قد يفشل داخل بيئة الحاويات المعزولة — النتيجة تُسجَّل بصدق)
console.log('\n— محاولات اتصال حقيقية بـ OFF —')
const liveProduct = await fetchFromOFF(NUTELLA_BARCODE)
if (liveProduct) {
  check(liveProduct.caloriesPer100g === 539, `اتصال حي نجح: نوتيلا = ${liveProduct.caloriesPer100g} kcal/100g (متوقَّع 539)`)
} else {
  console.log('⚠️  لم يُنفَّذ اتصال حي (بلا نتيجة) — راجع docs/product/P8_A2.md لتفسير قيد الشبكة في هذه الجلسة.')
}
const liveSaudiPage = await fetchSaudiOffPage(1, 5).catch((err: unknown) => {
  console.log(`⚠️  فشل بحث السعودية الحي: ${err instanceof Error ? err.message : err}`)
  return null
})
if (liveSaudiPage) {
  console.log(`ℹ️  بحث السعودية الحي رجّع ${liveSaudiPage.length} منتج(ات) من الصفحة الأولى.`)
}

// —— 3) دمج عند تعارض مصدرين: فرق جوهري (> 15%) يُعلَّم pending_review ويحفظ البديل
const barcodeConflict = '6281000000001'
const first = upsert({
  barcode: barcodeConflict,
  name: 'حليب تجريبي',
  caloriesPer100g: 100,
  proteinPer100g: 5,
  carbsPer100g: 10,
  fatPer100g: 2,
  sourceName: 'open_food_facts',
  status: 'imported',
  updatedAt: 1000,
})
check(first.status === 'imported', 'أول إدخال لمنتج جديد يبقى imported')

const second = upsert({
  barcode: barcodeConflict,
  name: 'حليب تجريبي',
  imageUrl: 'https://example.com/x.jpg',
  servingSize: '250مل',
  caloriesPer100g: 155, // فرق 55% عن 100 — جوهري
  proteinPer100g: 6,
  carbsPer100g: 11,
  fatPer100g: 2.2,
  sourceName: 'manual',
  status: 'imported',
  updatedAt: 2000,
})
check(second.status === 'pending_review', 'فرق جوهري (55%) بين مصدرين → pending_review')
check(second.alternateValues?.caloriesPer100g === 100 && second.alternateValues?.sourceName === 'open_food_facts', 'القيمة الأخرى (100 kcal من open_food_facts) محفوظة في alternateValues')
check(second.caloriesPer100g === 155, 'القيمة المعتمدة = الأحدث/الأكمل (155 kcal)')
check(listPendingReview().some((p) => p.barcode === barcodeConflict), 'المنتج يظهر في listPendingReview لمراجعة Agent 4')

// —— فرق بسيط (<15%) لا يُفعِّل pending_review
const barcodeMinor = '6281000000002'
upsert({
  barcode: barcodeMinor,
  name: 'وجبة تجريبية',
  caloriesPer100g: 200,
  proteinPer100g: 10,
  carbsPer100g: 20,
  fatPer100g: 5,
  sourceName: 'open_food_facts',
  status: 'imported',
  updatedAt: 1000,
})
const minorMerge = upsert({
  barcode: barcodeMinor,
  name: 'وجبة تجريبية',
  caloriesPer100g: 210, // فرق 5% فقط
  proteinPer100g: 10,
  carbsPer100g: 20,
  fatPer100g: 5,
  sourceName: 'open_food_facts',
  status: 'imported',
  updatedAt: 2000,
})
check(minorMerge.status === 'imported', 'فرق طفيف (5%) لا يُفعِّل pending_review')

// —— 4) resolveBarcode: يستخدم القاعدة المحلية أولًا، ثم الجالب المسجَّل (OFF) للمنتجات الجديدة
const alreadyStored = await resolveBarcode(barcodeConflict)
check(alreadyStored?.barcode === barcodeConflict, 'resolveBarcode يرجّع من القاعدة المحلية دون إعادة جلب')

const viaFetcher = await resolveBarcode(NUTELLA_BARCODE)
check(
  viaFetcher === null || viaFetcher.sourceName === 'open_food_facts',
  'resolveBarcode لمنتج غير مخزَّن يمرّ عبر جالب open_food_facts المسجَّل (نتيجة null مقبولة إن حُظر الاتصال)',
)
check(getProduct(NUTELLA_BARCODE) !== null || viaFetcher === null, 'نتيجة الجالب الناجحة تُحفَظ محليًا عبر upsert')

// —— نسب المصدر متاح للواجهة
check(OFF_ATTRIBUTION_AR.includes('Open Food Facts') && OFF_ATTRIBUTION_AR.includes('ODbL'), 'نص نسب المصدر يذكر Open Food Facts و ODbL')

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
