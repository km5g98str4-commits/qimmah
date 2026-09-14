/**
 * إثبات «أكلاتي» — الأطعمة المخصّصة المحفوظة [FOOD-UX-001]
 *
 * رحلة المستخدم الحقيقية على المخزن نفسه الذي تقرؤه الشاشة:
 *   أنشئ أكلة بكسور عشرية → احفظ → سجّل → «اليوم التالي» (سجلّ اليوم يتبدّل والمخزن
 *   الشخصي يبقى) → ابحث عنها → سجّلها بمضاعف → عدّلها → احذفها.
 *
 * ثم محاولات كسر مسمّاة: تكرار الاسم (يُحدَّث لا يُكرَّر) · اسم مطبَّع (كبسه ≡ كبسة) ·
 * سقف العدد · أرقام غير صالحة · فشل التخزين يعود `storage` لا `ok` · تعديل بمعرّف
 * غير موجود · اصطدام اسم عند التعديل · عزل المالك · التعقيم العشري للحقول.
 *
 * وفحص بنيوي على مصدر الشاشة: حقول المخصّص عشرية (inputMode="decimal" + step="any")
 * وتبويب «أكلاتي» موصول بالمخزن — لا واجهة بلا مسار حفظ.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MAX_PERSONAL_FOODS,
  PERSONAL_FOODS_KEY,
  deletePersonalFood,
  listPersonalFoods,
  listPersonalFoodsByRecency,
  markPersonalFoodUsed,
  personalFoodNameKey,
  personalFoodPortion,
  savePersonalFood,
  searchPersonalFoods,
} from '@/lib/nutritionHistory'
import { addFoodToDay, loadNutritionDay, NUTRITION_V2_KEY } from '@/lib/nutritionV2Model'
import { sanitizeNumericInput, parseSafeNumber } from '@/lib/validation'
import { setEntitlement } from '@/lib/access/entitlementStore'

declare const __QIMMAH_ROOT__: string
declare global {
  // eslint-disable-next-line no-var
  var __qimmahThrowingLocalStorage: () => void
  // eslint-disable-next-line no-var
  var __qimmahRestoreLocalStorage: () => void
}

let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}

setEntitlement({ status: 'active', source: 'mock' })
console.log('\n① إنشاء بكسور عشرية → حفظ → تسجيل')
const created = savePersonalFood({ nameAr: 'وجبة الدجاج حقّتي', calories: 300.5, protein: 27.5, carbs: 8.25, fat: 12.75 })
check('الحفظ ينجح بمعرّف pf-1', created.status === 'ok' && created.food.id === 'pf-1' && !created.replaced)
const f1 = listPersonalFoods()[0]
check('الكسور محفوظة كما كُتبت (خانة عشرية): 300.5 · 27.5 · 8.3 · 12.8', f1.calories === 300.5 && f1.protein === 27.5 && f1.carbs === 8.3 && f1.fat === 12.8)
check('لا غرامات مخترعة حين لم تُكتب', f1.grams === undefined)
const portion1 = personalFoodPortion(f1, 1)
addFoodToDay({ id: 'e-1', nameAr: f1.nameAr, calories: portion1.calories, protein: portion1.protein, carbs: portion1.carbs, fat: portion1.fat, meal: 'lunch', foodId: `personal:${f1.id}`, servings: 1, unit: 'serving' })
markPersonalFoodUsed(f1.id)
check('سجّل اليوم يحمل الأكلة بقيمها العشرية', loadNutritionDay().foods.some((e) => e.foodId === 'personal:pf-1' && e.calories === 300.5 && e.protein === 27.5))
check('ختم الاستعمال: useCount=1 وlastUsedAt موجود', listPersonalFoods()[0].useCount === 1 && !!listPersonalFoods()[0].lastUsedAt)

console.log('\n② «اليوم التالي»: سجلّ اليوم يتبدّل والأكلة تبقى')
localStorage.removeItem(NUTRITION_V2_KEY) // يوم جديد: لا سجلّ — المخزن الشخصي مفتاح مستقل
check('سجلّ اليوم فارغ', loadNutritionDay().foods.length === 0)
check('الأكلة ما زالت في أكلاتي', listPersonalFoods().length === 1 && listPersonalFoods()[0].nameAr === 'وجبة الدجاج حقّتي')

console.log('\n③ البحث بنفس ما يكتبه المستخدم')
check('«دجاج» يجدها', searchPersonalFoods('دجاج').length === 1)
check('«وجبه الدجاج» (تاء مربوطة مطويّة) يجدها', searchPersonalFoods('وجبه الدجاج').length === 1)
check('«حقتي دجاج» (كلمتان بأي ترتيب) يجدها', searchPersonalFoods('حقتي دجاج').length === 1)
check('«كبسة» لا يجدها', searchPersonalFoods('كبسة').length === 0)
check('استعلام فارغ ⇒ لا شيء', searchPersonalFoods('   ').length === 0)

console.log('\n④ التسجيل بمضاعف حصص — الحساب في نقطة واحدة')
const half = personalFoodPortion(f1, 1.5)
check('١٫٥ حصة: 450.8 سعرة · 41.3 بروتين · 12.5 كارب · 19.2 دهون', half.calories === 450.8 && half.protein === 41.3 && half.carbs === 12.5 && half.fat === 19.2 && half.servings === 1.5)
const partial = savePersonalFood({ nameAr: 'شاورما الحي', calories: 520, protein: 30 })
check('أكلة بلا كارب/دهون تُحفظ والحقلان غائبان لا صفر', partial.status === 'ok' && partial.food.carbs === undefined && partial.food.fat === undefined)
check('مضاعفة الجزئي يبقي الغائب غائبًا', personalFoodPortion(partial.status === 'ok' ? partial.food : f1, 2).carbs === undefined)
check('مضاعف غير صالح ⇒ حصة واحدة لا صفر', personalFoodPortion(f1, 0).calories === 300.5 && personalFoodPortion(f1, Number.NaN).calories === 300.5)

console.log('\n⑤ التعديل')
const edited = savePersonalFood({ nameAr: 'وجبة الدجاج حقّتي', calories: 310, protein: 28, carbs: 9 }, 'pf-1')
check('التعديل بالمعرّف يحدّث القيم ويحذف الدهون الفارغة', edited.status === 'ok' && edited.replaced && edited.food.calories === 310 && edited.food.fat === undefined && !!edited.food.updatedAt)
check('المعرّف والإنشاء والاستعمال محفوظة عبر التعديل', listPersonalFoods()[0].id === 'pf-1' && listPersonalFoods()[0].useCount === 1)
const renamed = savePersonalFood({ nameAr: 'وجبة الدجاج — نسخة الظهر', calories: 310, protein: 28 }, 'pf-1')
check('إعادة التسمية بالمعرّف مقبولة', renamed.status === 'ok' && listPersonalFoods().some((f) => f.nameAr === 'وجبة الدجاج — نسخة الظهر') && listPersonalFoods().length === 2)

console.log('\n⑥ محاولات كسر')
const dup = savePersonalFood({ nameAr: 'شاورما الحي', calories: 600, protein: 35 })
check('⚔️ نفس الاسم بلا معرّف ⇒ يُحدَّث الموجود لا يُكرَّر', dup.status === 'ok' && dup.replaced && dup.food.id === 'pf-2' && listPersonalFoods().length === 2)
const dupFold = savePersonalFood({ nameAr: 'شاورما الحى', calories: 610, protein: 36 })
check('⚔️ الاسم المطبَّع (ى/ي · ة/ه · الهمزة) يُعامَل اسمًا واحدًا', dupFold.status === 'ok' && dupFold.replaced && listPersonalFoods().length === 2 && personalFoodNameKey('شاورما الحى') === personalFoodNameKey('شاورما الحي') && personalFoodNameKey('كبسه') === personalFoodNameKey('كبسة') && personalFoodNameKey('أكلة') === personalFoodNameKey('اكله'))
const clash = savePersonalFood({ nameAr: 'شاورما الحي', calories: 1, protein: 1 }, 'pf-1')
check('⚔️ تعديل يصطدم باسم أكلة أخرى ⇒ رفض مسمّى', clash.status === 'rejected')
const ghost = savePersonalFood({ nameAr: 'x', calories: 1, protein: 1 }, 'pf-999')
check('⚔️ تعديل معرّف غير موجود ⇒ رفض لا إنشاء صامت', ghost.status === 'rejected' && listPersonalFoods().length === 2)
const noName = savePersonalFood({ nameAr: '   ', calories: 100, protein: 5 })
const zero = savePersonalFood({ nameAr: 'لا شيء', calories: 0, protein: 0 })
const neg = savePersonalFood({ nameAr: 'سالب', calories: -5, protein: 5 })
const nan = savePersonalFood({ nameAr: 'نان', calories: Number.NaN, protein: 5 })
const badCarb = savePersonalFood({ nameAr: 'كارب سالب', calories: 100, protein: 5, carbs: -1 })
const badGrams = savePersonalFood({ nameAr: 'غرام صفر', calories: 100, protein: 5, grams: 0 })
check('⚔️ اسم فارغ · صفر/صفر · سالب · NaN · كارب سالب · غرام صفر ⇒ كلها مرفوضة', [noName, zero, neg, nan, badCarb, badGrams].every((r) => r.status === 'rejected'))
check('⚔️ لا أثر للمرفوضات في المخزن', listPersonalFoods().length === 2)

// سقف العدد: نملأ حتى الحدّ ثم نحاول واحدة زيادة.
for (let i = listPersonalFoods().length; i < MAX_PERSONAL_FOODS; i++) {
  const r = savePersonalFood({ nameAr: `أكلة رقم ${i}`, calories: 100 + i, protein: 10 })
  assert.equal(r.status, 'ok', `fill ${i}`)
}
const over = savePersonalFood({ nameAr: 'فوق الحدّ', calories: 100, protein: 10 })
check(`⚔️ السقف (${MAX_PERSONAL_FOODS}) يُرفض بخطأ مسمّى ولا يُسقط الأقدم`, over.status === 'rejected' && listPersonalFoods().length === MAX_PERSONAL_FOODS && listPersonalFoods()[0].id === 'pf-1')
const stillEditable = savePersonalFood({ nameAr: 'وجبة الدجاج — نسخة الظهر', calories: 311, protein: 28 }, 'pf-1')
check('عند السقف يبقى التعديل ممكنًا', stillEditable.status === 'ok')

console.log('\n⑦ فشل التخزين لا يُبتلع')
globalThis.__qimmahThrowingLocalStorage()
const failed = savePersonalFood({ nameAr: 'أثناء العطل', calories: 100, protein: 10 }, 'pf-1')
check('⚔️ رمي التخزين ⇒ status=storage (لا ok)', failed.status === 'storage')
check('⚔️ الحذف أثناء العطل يعيد false', deletePersonalFood('pf-1') === false)
globalThis.__qimmahRestoreLocalStorage()
check('بعد العودة: المخزن كما كان (لم يُحذف شيء)', listPersonalFoods().length === MAX_PERSONAL_FOODS)

console.log('\n⑧ الحذف والترتيب')
check('الحذف ينجح ويُزيل واحدة', deletePersonalFood('pf-3') && listPersonalFoods().length === MAX_PERSONAL_FOODS - 1)
check('حذف غير موجود ⇒ false', deletePersonalFood('pf-3') === false)
markPersonalFoodUsed('pf-2')
check('الأحدث استعمالًا أولًا في «أكلاتي»', listPersonalFoodsByRecency()[0].id === 'pf-2')
markPersonalFoodUsed('pf-nope')
check('ختم معرّف غير موجود لا يغيّر شيئًا', listPersonalFoods().length === MAX_PERSONAL_FOODS - 1)

console.log('\n⑨ عزل المالك')
check('مالك آخر يرى قائمة فارغة', listPersonalFoods('user-Z-99999999').length === 0)
const raw = JSON.parse(localStorage.getItem(PERSONAL_FOODS_KEY) ?? '{}') as Record<string, unknown[]>
check('المخزن مقسَّم بالمالك (guest)', Array.isArray(raw.guest) && Object.keys(raw).length === 1)

console.log('\n⑩ التعقيم العشري للحقول')
check('«27.5» يبقى 27.5', sanitizeNumericInput('27.5', { max: 500, decimal: true }) === '27.5')
check('«27,5» (فاصلة) ⇒ 27.5', sanitizeNumericInput('27,5', { max: 500, decimal: true }) === '27.5')
check('«٢٧٫٥» (أرقام عربية وفاصلة عربية) ⇒ 27.5', sanitizeNumericInput('٢٧٫٥', { max: 500, decimal: true }) === '27.5')
check('«8.25» ⇒ 8.25 ثم parse ⇒ 8.25', parseSafeNumber(sanitizeNumericInput('8.25', { max: 1000, decimal: true }), { min: 0, max: 1000 }) === 8.25)
check('«3..5» ⇒ 3.5 (نقطة واحدة)', sanitizeNumericInput('3..5', { max: 1000, decimal: true }) === '3.5')
check('⚔️ الوضع غير العشري ما زال يحذف الفاصلة (لا انحدار): «27,5» ⇒ 275', sanitizeNumericInput('27,5', { max: 5000 }) === '275')

console.log('\n⑪ الشاشة موصولة بالمخزن (فحص بنيوي)')
const src = readFileSync(resolve(__QIMMAH_ROOT__, 'src/components/nutrition/QuickMealLogger.tsx'), 'utf8')
const fieldBlock = src.slice(src.indexOf('function Field('), src.indexOf('function Stat('))
check('حقول المخصّص عشرية: inputMode="decimal" + step="any" + decimal:true', /inputMode="decimal"/.test(fieldBlock) && /step="any"/.test(fieldBlock) && /decimal: true/.test(fieldBlock))
check('⚔️ لا inputMode="numeric" باقٍ في حقل المخصّص', !/inputMode="numeric"/.test(fieldBlock))
check('تبويب «أكلاتي» موجود ويقرأ من المخزن', /testId="tab-mine"/.test(src) && /listPersonalFoodsByRecency\(\)/.test(src))
check('الحفظ من المخصّص يمرّ بـsavePersonalFood والحذف بـdeletePersonalFood', /savePersonalFood\(input/.test(src) && /deletePersonalFood\(id\)/.test(src))
check('البحث يعرض أكلاتي فوق النتائج', /searchPersonalFoods\(query\)/.test(src) && /data-testid="personal-hit"/.test(src))
check('التسجيل من أكلاتي يمرّ بـpersonalFoodPortion لا بحساب في الواجهة', /personalFoodPortion\(selectedPersonal/.test(src))
check('الحذف بتأكيد على خطوتين', /mine-delete-confirm/.test(src) && /confirmDeleteId !== id/.test(src))
check('فشل الحفظ الشخصي يُعرض ولا يُبتلع', /res\.status === 'storage'\) \{ setSaveError\(true\)/.test(src))
check('التعديل لا يسجّل لليوم', /if \(editingId\) \{[\s\S]*?savePersonalFood\(input, editingId\)[\s\S]*?return\n\s*\}/.test(src))

console.log(`\n✅ أكلاتي: ${pass} فحصًا، 0 فشل.`)
