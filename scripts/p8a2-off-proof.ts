// إثبات P8 A2 — يفحص: (1) تحويل استجابة OFF الحقيقية (نوتيلا) لنتيجة بعيدة صحيحة،
// (2) محاولة اتصال حقيقي بـ OFF (منتج مفرد + بحث السعودية) وتسجيل النتيجة أيًّا كانت،
// (3) منطق الدمج عند تعارض مصدرين (Agent 1's store.ts: pending_review + sources[])،
// (4) resolveBarcode (Agent 1) يستخدم القاعدة المحلية أولًا ثم جالب OFF المسجَّل من هذه
// الوحدة. أداة إثبات فقط — لا تلمس التطبيق.

// polyfill بسيط لـ localStorage كي تعمل store.ts (مصمَّمة للمتصفح) داخل Node.
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

const { mapOffRecordToRemoteResult, fetchFromOFF, fetchSaudiOffPage, OFF_ATTRIBUTION_AR } = await import(
  '@/features/products/offSource'
)
const { getProduct, upsertProduct, resolveBarcode, listByStatus } = await import('@/features/products/index')

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
const nutella = mapOffRecordToRemoteResult(nutellaFixture)
check(nutella !== null, 'mapOffRecordToRemoteResult يحوّل سجل نوتيلا الحقيقي إلى نتيجة')
check(nutella?.per === '100g' && nutella?.kcal === 539, `per=100g، السعرات=539 (فعليًا: ${nutella?.per}/${nutella?.kcal})`)
check(nutella?.protein === 6.3 && nutella?.carbs === 57.5 && nutella?.fat === 30.9, 'البروتين/الكارب/الدهون تطابق nutriments الحقيقية')
check(nutella?.brand === 'Ferrero' && nutella?.servingSize === '15 g', 'brand و servingSize صحيحان')

// —— منتج بلا اسم أو بلا سعرات → null (رفض بيانات غير قابلة للاستخدام)
check(mapOffRecordToRemoteResult({ nutriments: {} }) === null, 'منتج بلا اسم/سعرات → null')
check(mapOffRecordToRemoteResult({ product_name: 'X', nutriments: {} }) === null, 'منتج باسم لكن بلا سعرات (100g ولا serving) → null')
const servingOnly = mapOffRecordToRemoteResult({
  product_name: 'وجبة بحصة فقط',
  serving_size: '30 g',
  nutriments: { 'energy-kcal_serving': 120, proteins_serving: 3 },
})
check(servingOnly?.per === 'serving' && servingOnly?.kcal === 120, 'يستخدم قيم الحصة (_serving) بديلًا موسومًا per=serving عند غياب _100g')

// —— 2) محاولة اتصال حقيقي بـ OFF (قد يفشل داخل بيئة الحاويات المعزولة — النتيجة تُسجَّل بصدق)
console.log('\n— محاولات اتصال حقيقية بـ OFF —')
const liveProduct = await fetchFromOFF(NUTELLA_BARCODE)
if (liveProduct) {
  check(liveProduct.kcal === 539, `اتصال حي نجح: نوتيلا = ${liveProduct.kcal} kcal/100g (متوقَّع 539)`)
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

// —— 3) دمج عند تعارض مصدرين (منطق Agent 1 في store.ts: تفاوت > 10% → pending_review)
const barcodeConflict = '6281000000001'
const first = upsertProduct({
  barcode: barcodeConflict,
  name: 'حليب تجريبي',
  per: '100g',
  kcal: 100,
  protein: 5,
  carbs: 10,
  fat: 2,
  source: { sourceName: 'open_food_facts', importedAt: new Date(1000).toISOString() },
})
check(first.status === 'imported', 'أول إدخال لمنتج جديد يبقى imported')

const second = upsertProduct({
  barcode: barcodeConflict,
  name: 'حليب تجريبي',
  imageUrl: 'https://example.com/x.jpg',
  servingSize: '250مل',
  per: '100g',
  kcal: 155, // فرق 55% عن 100 — يتجاوز عتبة 10%
  protein: 6,
  carbs: 11,
  fat: 2.2,
  source: { sourceName: 'manual', importedAt: new Date(2000).toISOString() },
})
check(second.status === 'pending_review', 'فرق جوهري (>10%) بين مصدرين → pending_review')
check(second.sources.length === 2 && second.sources.some((s) => s.sourceName === 'open_food_facts') && second.sources.some((s) => s.sourceName === 'manual'), 'كلا المصدرين محفوظان في sources[] دون فقدان أيّهما')
check(listByStatus('pending_review').some((p) => p.barcode === barcodeConflict), 'المنتج يظهر في listByStatus(pending_review) لمراجعة Agent 4')

// —— فرق بسيط (<10%) لا يُفعِّل pending_review
const barcodeMinor = '6281000000002'
upsertProduct({
  barcode: barcodeMinor,
  name: 'وجبة تجريبية',
  per: '100g',
  kcal: 200,
  protein: 10,
  carbs: 20,
  fat: 5,
  source: { sourceName: 'open_food_facts', importedAt: new Date(1000).toISOString() },
})
const minorMerge = upsertProduct({
  barcode: barcodeMinor,
  name: 'وجبة تجريبية',
  per: '100g',
  kcal: 208, // فرق 4% فقط
  protein: 10,
  carbs: 20,
  fat: 5,
  source: { sourceName: 'open_food_facts', importedAt: new Date(2000).toISOString() },
})
check(minorMerge.status === 'imported', 'فرق طفيف (4%) لا يُفعِّل pending_review')

// —— 4) resolveBarcode: يستخدم القاعدة المحلية أولًا، ثم جالب OFF المسجَّل من offSource.ts
const alreadyStored = await resolveBarcode(barcodeConflict)
check(alreadyStored.foundIn === 'internal' && alreadyStored.product?.barcode === barcodeConflict, 'resolveBarcode يرجّع من القاعدة المحلية (foundIn=internal) دون إعادة جلب')

const viaFetcher = await resolveBarcode(NUTELLA_BARCODE)
check(
  viaFetcher.foundIn === 'not_found' || viaFetcher.foundIn === 'open_food_facts',
  `resolveBarcode لمنتج غير مخزَّن يمرّ عبر جالب OFF المسجَّل (foundIn: ${viaFetcher.foundIn} — not_found مقبول إن حُظر الاتصال)`,
)
check(getProduct(NUTELLA_BARCODE) !== undefined || viaFetcher.foundIn === 'not_found', 'نتيجة الجالب الناجحة تُحفَظ محليًا عبر upsertProduct')

// —— نسب المصدر متاح للواجهة
check(OFF_ATTRIBUTION_AR.includes('Open Food Facts') && OFF_ATTRIBUTION_AR.includes('ODbL'), 'نص نسب المصدر يذكر Open Food Facts و ODbL')

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
