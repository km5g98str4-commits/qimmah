// قِمّة — فحوص سلامة القيم الغذائية.
// **المبدأ الحاكم: لا تصحيح صامت.** السجل المشكوك فيه يُوسَم بعلم مسمّى ويبقى قابلًا
// للمراجعة؛ ولا تُعدَّل قيمة مصدر أبدًا لتمرّ من فحص (§5 الصدق قبل الطمأنينة).

/** أقصى طاقة ممكنة لكل 100غ: دهن نقي ≈ 900 سعرة. ما فوقها مستحيل فيزيائيًا. */
export const MAX_KCAL_PER_100 = 900
/** هامش تسامح قاعدة أتواتر 4/4/9. */
export const ATWATER_TOLERANCE = 0.25
/** أدنى طاقة تُفحص بأتواتر — تحت ذلك ضجيج التقريب يغلب الإشارة. */
export const ATWATER_MIN_KCAL = 40
/** أقصى صوديوم معقول لكل 100غ (الملح النقي ≈ 39000 مغ). */
export const MAX_SODIUM_MG_PER_100 = 40000

const ATWATER = { protein: 4, carbs: 4, fat: 9 }

/**
 * يفحص سجلًا مطبَّعًا ويعيد أعلام الجودة. لا يعدّل السجل.
 * `energy_from` يأتي من التطبيع ويُستعمل لتمييز اشتباه خلط كيلوجول/سعرة.
 */
export function checkNutrition(rec, energyFrom = 'kcal_field') {
  const flags = []
  const { energy_kcal: kcal, protein_g: p, carbs_g: c, fat_g: f } = rec

  // ١) قيم سالبة — خطأ إدخال صريح لا تقدير.
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && v < 0 && k.endsWith('_g')) { flags.push('negative_value'); break }
  }
  if (typeof rec.energy_kcal === 'number' && rec.energy_kcal < 0) flags.push('negative_value')
  if (typeof rec.sodium_mg === 'number' && rec.sodium_mg < 0) flags.push('negative_value')

  // ٢) اكتمال أساسي.
  if (kcal === null || kcal === 0) flags.push('missing_energy')
  if (p === null && c === null && f === null) flags.push('missing_macros')

  // ٣) طاقة مستحيلة — دهن نقي هو السقف الفيزيائي.
  if (kcal !== null && kcal > MAX_KCAL_PER_100) {
    flags.push('energy_density_impossible')
    // القيمة فوق السقف وأتت من حقل «سعرات» ⇒ الأرجح أنها كيلوجول وُضعت في خانة السعرات.
    // الاشتباه يُعلَن ولا يُصحَّح: 2000 قد تكون kJ لمنتج 478 سعرة، وقد تكون خطأ آخر.
    if (energyFrom === 'kcal_field' && kcal / 4.184 <= MAX_KCAL_PER_100) flags.push('energy_unit_suspect_kj')
  }

  // ٤) مجموع الماكروز لا يتجاوز الكتلة (100غ لكل 100غ).
  const macroSum = [p, c, f].filter((v) => typeof v === 'number').reduce((a, b) => a + b, 0)
  if (macroSum > 105) flags.push('macro_sum_exceeds_mass')

  // ٥) مصالحة أتواتر: الطاقة المصرَّحة مقابل المحسوبة من الماكروز.
  if (kcal !== null && kcal >= ATWATER_MIN_KCAL && p !== null && c !== null && f !== null) {
    const predicted = ATWATER.protein * p + ATWATER.carbs * c + ATWATER.fat * f
    if (predicted >= ATWATER_MIN_KCAL) {
      const ratio = kcal / predicted
      if (ratio < 1 - ATWATER_TOLERANCE || ratio > 1 + ATWATER_TOLERANCE) flags.push('macro_energy_mismatch')
    }
  }

  // ٦) علاقات داخلية لا يجوز أن تنقلب.
  if (rec.sugar_g !== null && c !== null && rec.sugar_g > c + 0.5) flags.push('sugar_exceeds_carbs')
  if (rec.fiber_g !== null && c !== null && rec.fiber_g > c + 0.5) flags.push('fiber_exceeds_carbs')
  if (rec.saturated_fat_g !== null && f !== null && rec.saturated_fat_g > f + 0.5) flags.push('saturated_exceeds_fat')

  // ٧) الصوديوم — يكشف خطأ وحدة (مغ كُتبت مكان غ أو العكس).
  if (rec.sodium_mg !== null && rec.sodium_mg > MAX_SODIUM_MG_PER_100) flags.push('sodium_out_of_range')

  // ٨) اشتباه خلط الأساس: قيم «لكل 100غ» تتجاوز الكتلة بوضوح ⇒ الأرجح أنها لكل حصّة.
  if (macroSum > 100 && rec.serving_size !== null && rec.serving_size > 100) flags.push('serving_basis_suspect')

  // ٩) حجم حصّة غير معقول.
  if (rec.serving_size !== null && (rec.serving_size <= 0 || rec.serving_size > 5000)) flags.push('serving_size_implausible')

  // ١٠) اكتمال التسمية والعلامة.
  if (!rec.name_ar) flags.push('no_arabic_name')
  if (!rec.name_en) flags.push('no_english_name')
  if (!rec.brand_ar && !rec.brand_en) flags.push('no_brand')

  return [...new Set(flags)]
}

/** أعلام تمنع القبول — عطب بنيوي لا يُصلحه وسمٌ. */
export const BLOCKING_FLAGS = new Set([
  'negative_value',
  'missing_energy',
  'missing_macros',
  'energy_density_impossible',
  'macro_sum_exceeds_mass',
  'sodium_out_of_range',
])

/** أعلام تُنقص الثقة دون أن تمنع القبول. */
const SOFT_PENALTY = {
  macro_energy_mismatch: 0.25,
  sugar_exceeds_carbs: 0.1,
  fiber_exceeds_carbs: 0.1,
  saturated_exceeds_fat: 0.1,
  serving_basis_suspect: 0.15,
  serving_size_implausible: 0.05,
  no_arabic_name: 0.1,
  no_english_name: 0.05,
  no_brand: 0.05,
  energy_unit_suspect_kj: 0.2,
}

/**
 * ثقة مركّبة 0–1 = اكتمال الحقول − عقوبات الأعلام اللينة.
 * مشتقّة لا مُدخلة — لا رقم ثقة يُكتب يدويًا في أي سجل.
 */
export function scoreConfidence(rec, flags) {
  const completenessFields = [
    rec.energy_kcal, rec.protein_g, rec.carbs_g, rec.fat_g,
    rec.sugar_g, rec.fiber_g, rec.sodium_mg,
    rec.name_ar ?? rec.name_en, rec.brand_ar ?? rec.brand_en,
    rec.serving_size, rec.ingredients, rec.category,
  ]
  const present = completenessFields.filter((v) => v !== null && v !== undefined && v !== '').length
  let score = present / completenessFields.length
  for (const f of flags) score -= SOFT_PENALTY[f] ?? 0
  return Math.max(0, Math.min(1, Number(score.toFixed(4))))
}
