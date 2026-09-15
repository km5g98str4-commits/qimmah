// إثبات السجلّات الغذائية الجزئية — [PARTIAL-NUTRITION-001]
//
// ما يحرسه:
//   ١) النموذج: FoodItem يتحمّل غياب الكارب/الدهون (الحقل غائب لا صفر)، وunknownNutrients يسمّي الغائب.
//   ٢) التسجيل: القيد المسجّل من صنف جزئي لا يحمل carbs/fat (لا صفر)، والتحويل القانوني ذهابًا وإيابًا يحفظ الغياب،
//      وتعديل الكمية لا يخترع الغائب.
//   ٣) المجاميع: logTotals وnutritionDayTotals تجمع المعروف فقط **وتعلن** عدد القيود الناقصة لكل مغذٍّ —
//      «المجموع ناقص» ظاهر لا مخفيّ؛ والقيد بكارب = ٠ فعليًّا يُعدّ معروفًا لا ناقصًا (الصفر ليس غيابًا).
//   ٤) الواجهة: المسجّل السريع لا يصفّر الغائب ويعرض «غير متوفّر» وسطح الإفصاح؛ بطاقة الماكرو تحمل علامة النقص؛
//      حلقات اليوم تمرّر عدد النقص.
//   ⚔️ محاكاة: مجاميع تُصفّر الغائب بصمت (بلا unknown) تُرفض بفحص مسمّى.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
console.log('\nإثبات السجلّات الغذائية الجزئية — النموذج · التسجيل · المجاميع · الواجهة')

const food = await loadTsModule('src/data/foodItems.ts')
const tracking = await loadTsModule('src/lib/nutritionTracking.ts')
const v2 = await loadTsModule('src/lib/nutritionV2Model.ts')

// ——— ١) النموذج ———
const partialItem = food.foodItems.find((f) => f.carbs === undefined && f.fat === undefined)
check('يوجد صنف جزئي في الكتالوج (سعرات + بروتين رسميان بلا كارب/دهون)', !!partialItem && typeof partialItem.calories === 'number' && typeof partialItem.protein === 'number')
check('unknownNutrients يسمّي الغائب [carbs, fat] للصنف الجزئي و[] للصنف الكامل', JSON.stringify(food.unknownNutrients(partialItem)) === '["carbs","fat"]' && food.unknownNutrients({ carbs: 0, fat: 0 }).length === 0)
check('الصنف الجزئي مصنَّف OFFICIAL_LOCAL بسوق SA — لا صنف جزئي بلا تصنيف', food.foodItems.filter((f) => f.carbs === undefined || f.fat === undefined).every((f) => f.provenance?.class === 'OFFICIAL_LOCAL' && f.provenance.market === 'SA'))
check('تصنيفات المصدر الستّ معرَّفة ولها إفصاح موجز بالعربية والإنجليزية', ['OFFICIAL_LOCAL', 'OFFICIAL_FOREIGN_MARKET', 'USDA_MEASURED', 'GENERIC_PROXY', 'RECIPE_ESTIMATE', 'CURATED_ESTIMATE'].every((c) => typeof food.provenanceDisclosure({ class: c, market: c === 'OFFICIAL_LOCAL' ? 'SA' : 'US' }, 'ar') === 'string' && typeof food.provenanceDisclosure({ class: c, market: 'US' }, 'en') === 'string'))
check('الإفصاح الأجنبي موجز: «بيانات مرجعية للسوق الأمريكي» (سطر واحد، لا فقرة)', food.provenanceDisclosure({ class: 'OFFICIAL_FOREIGN_MARKET', market: 'US' }, 'ar') === 'بيانات مرجعية للسوق الأمريكي' && food.provenanceDisclosure({ class: 'USDA_MEASURED', market: 'US' }, 'ar').length < 60)

// ——— ٢) التسجيل والتحويل ———
const log = [
  { id: 'a', label: 'كامل', calories: 300, protein: 20, carbs: 30, fat: 10 },
  { id: 'b', label: 'جزئي', calories: 400, protein: 34 },
  { id: 'c', label: 'صفر فعلي', calories: 50, protein: 12, carbs: 0, fat: 0 },
]
const t = tracking.logTotals(log)
check('logTotals: المعروف يُجمع (كارب ٣٠ · دهون ١٠)، والغائب لا يُجمع صفرًا بل يُعدّ: unknown.carbs = 1 · unknown.fat = 1', t.carbs === 30 && t.fat === 10 && t.unknown.carbs === 1 && t.unknown.fat === 1 && t.unknown.protein === 0)
check('الصفر الفعلي (carbs: 0) معروف لا ناقص — الصفر ليس غيابًا', tracking.logTotals([log[2]]).unknown.carbs === 0)
const dt = v2.nutritionDayTotals([{ id: 'x', nameAr: 'x', calories: 400, protein: 34, meal: 'lunch' }, { id: 'y', nameAr: 'y', calories: 100, protein: 5, carbs: 12, fat: 3, meal: 'lunch' }])
check('nutritionDayTotals (المصدر القانوني v2): كارب ١٢ · unknown.carbs = 1 · unknown.fat = 1', dt.carbs === 12 && dt.unknown.carbs === 1 && dt.unknown.fat === 1)

// التحويل ذهابًا وإيابًا (v1 ↔ v2) يحفظ الغياب — نقرأ الدوال الخاصة عبر النصّ إذ ليست مصدَّرة.
const trackingSrc = read('src/lib/nutritionTracking.ts')
check('fromCanonical/toCanonical ينشران carbs/fat فقط حين تكون أرقامًا (لا `?? 0`)', !/carbs: f\.carbs \?\? 0|fat: f\.fat \?\? 0|carbs: item\.carbs,|fat: item\.fat,/.test(trackingSrc) && /typeof f\.carbs === 'number' \? \{ carbs: f\.carbs \}/.test(trackingSrc) && /typeof item\.carbs === 'number' \? \{ carbs: item\.carbs \}/.test(trackingSrc))
check('updateLogQuantity يحجّم الكارب/الدهون فقط إن كانت معروفة — لا يخترع الغائب', /typeof current\.carbs === 'number' \? \{ carbs: Math\.round\(current\.carbs \* ratio/.test(trackingSrc) && !/carbs: Math\.round\(current\.carbs \* ratio \* 10\) \/ 10,\n/.test(trackingSrc))
check('LoggedFood (v1) وLoggedFood (v2) يعلنان carbs?/fat? اختياريين', /carbs\?: number\n\s+fat\?: number/.test(trackingSrc) && /carbs\?: number\n\s+fat\?: number/.test(read('src/lib/nutritionV2Model.ts')))

// ——— ٤) الواجهة ———
const qml = read('src/components/nutrition/QuickMealLogger.tsx')
check('المسجّل السريع: لا `?? 0` للكارب/الدهون، والإضافة تنشر الحقل فقط إن كان معروفًا', !/selected\?\.carbs \?\? 0|selected\?\.fat \?\? 0/.test(qml) && /typeof baseCarb === 'number' \? \{ carbs: round\(baseCarb \* factor\) \}/.test(qml) && !/carbs: round\(baseCarb \* factor\),/.test(qml))
check('المسجّل السريع يعرض «غير متوفّر» للغائب وسطح إفصاح المصدر', /t\.nutrientUnknown/.test(qml) && /data-testid="food-provenance"/.test(qml) && /provenanceDisclosure\(selected\.provenance, lang\)/.test(qml))
check('الإضافة المخصّصة: الحقل الفارغ يبقى غير معروف لا صفرًا', /cCarb\.trim\(\) \? round1\(/.test(qml) && /: undefined/.test(qml) && /carbVal !== undefined \? \{ carbs: carbVal \}/.test(qml) && /fatVal !== undefined \? \{ fat: fatVal \}/.test(qml) && !/carbs: round\(parseSafeNumber\(cCarb/.test(qml))
const nv = read('src/views/NutritionView.tsx')
// `day.totals` بعد موجة توحيد التغذية: المصدر نفسه (`logTotals`) لكنه صار
// مربوطًا **باليوم المعروض** لا بـ«اليوم الحالي» ضمنًا — فعلامة النقص تتبع اليوم
// الذي يقرأه المستخدم. الفحص يبقى بنيويًّا مقترنًا: علامة بلا عدّاد تسقط.
check('شاشة التغذية: بطاقتا الكارب والدهون تحملان علامة النقص من totals.unknown لليوم المعروض', /incomplete=\{day\.totals\.unknown\.carbs\}/.test(nv) && /incomplete=\{day\.totals\.unknown\.fat\}/.test(nv) && /data-testid="macro-incomplete"/.test(nv))
const today = read('src/views/TodayV2.tsx'); const rings = read('src/components/today/DailyRingsCard.tsx')
check('اليوم: حلقات الماكرو تستقبل unknown وتعرض «بلا بيانات لـn صنف»', /unknown: totals\.unknown\.carbs/.test(today) && /unknown: totals\.unknown\.fat/.test(today) && /m\.slice\.unknown \?/.test(rings) && /macroIncomplete/.test(rings))
const strings = read('src/config/strings.ts')
check('النصوص بالعربية والإنجليزية: nutrientUnknown · nutrientsIncomplete', (strings.match(/nutrientUnknown: '/g) ?? []).length === 2 && (strings.match(/nutrientsIncomplete: \(n\) =>/g) ?? []).length === 2)

// ——— ⚔️ محاكاة ———
{
  const silent = (entries) => entries.reduce((a, e) => ({ carbs: a.carbs + (e.carbs ?? 0), fat: a.fat + (e.fat ?? 0) }), { carbs: 0, fat: 0 })
  const s = silent(log)
  check('⚔️ محاكاة: مجاميع تُصفّر الغائب بصمت تُميَّز عن logTotals (لا unknown فيها) وتُرفض', s.unknown === undefined && t.unknown.carbs === 1)
}
console.log(`\n✅ السجلّات الجزئية: ${pass} فحصًا، 0 فشل.`)
