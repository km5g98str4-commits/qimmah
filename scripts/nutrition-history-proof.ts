// إثبات سجلّ التغذية المؤرَّخ (P7) — يعمل فوق localStorage مُحاكى عبر
// run-nutrition-history-proof.mjs. يغطّي: تهيئة runMigration (مرة واحدة + بذر
// أصناف اليوم الحقيقية فقط)، عبور حدود اليوم بساعة مُزيَّفة (الترحيل لا يفقد
// تفصيل الأمس)، نسخ وجبة للماضي→اليوم، تعديل كمية بإعادة حساب صادقة (مكتبة
// ونسبية)، حذف قيد (اليوم عبر المتجر الحيّ والماضي بالدفتر+المجاميع)، تحويلات
// جرامات↔حصص بلا اختراع، طعام يدوي + أطعمة شخصية، إحصاء أسبوعي يفرّق الفعلي عن
// التقديري، التشذيب ~90 يومًا، وصمود التخزين المعادي، وجولة تصدير/استيراد.

import {
  HISTORY_RETENTION_DAYS,
  MAX_PERSONAL_FOODS,
  NUTRITION_HISTORY_KEY,
  PERSONAL_FOODS_KEY,
  copyMealToToday,
  createManualFood,
  deletePersonalFood,
  editEntry,
  ensureNutritionHistoryInit,
  findFoodItem,
  getDayEntries,
  getWeeklyNutritionStats,
  gramsForServings,
  listPersonalFoods,
  loadLedgerDays,
  removeEntry,
  resolveFoodQuantity,
  servingsForGrams,
} from '@/lib/nutritionHistory'
import { NUTRITION_V2_KEY, addFoodToDay, loadNutritionDay } from '@/lib/nutritionV2Model'
import { getNutritionLog, saveNutritionLog } from '@/lib/historyStore'
import { isMigrationDone, stampDataOwner } from '@/lib/dataOwnership'
import { DATA_KEYS } from '@/lib/userDataKeys'
import { getDayStamp } from '@/lib/today'
import { setSyncRuntime } from '@/lib/syncQueue'
import { buildExportBundle, applyImport } from '@/lib/portability'
import { STORE_BY_ID } from '@/lib/portability/registry'
import { wipeUserData } from '@/lib/accountScope'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const ls = globalThis.localStorage

// ── ساعة مُزيَّفة: getDayStamp يقرأ new Date() — نبدّل Date لعبور حدود اليوم ──
const RealDate = Date
function setFakeToday(stamp: string): void {
  const [y, m, d] = stamp.split('-').map(Number)
  const fixed = new RealDate(y, m - 1, d, 12, 0, 0)
  // @ts-expect-error — استبدال مقصود للساعة العالمية داخل الإثبات فقط
  globalThis.Date = class extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length) {
        // @ts-expect-error تمرير الوسائط كما هي
        super(...args)
      } else {
        super(fixed.getTime())
      }
    }
    static now(): number {
      return fixed.getTime()
    }
  }
}

const D1 = '2026-07-20'
const D2 = '2026-07-21'
const D0 = '2026-07-15' // يوم قديم: مجاميع فقط (ما قبل الدفتر)

console.log('\n=== إثبات سجلّ التغذية المؤرَّخ (P7) ===')

console.log('\n① تهيئة runMigration: مرة واحدة، تبذر أصناف اليوم الحقيقية فقط')
{
  ls.clear()
  ls.setItem('qimmah:history:migrated:v1', 'done')
  setFakeToday(D1)
  check('الساعة المُزيَّفة تعمل: getDayStamp يعيد يوم الاختبار', getDayStamp() === D1)
  // أصناف يوم حقيقية موجودة في المتجر القانوني قبل أول لمسة للدفتر
  ls.setItem(NUTRITION_V2_KEY, JSON.stringify({ date: D1, foods: [{ id: 'seed1', nameAr: 'كبسة', calories: 600, protein: 35, carbs: 70, fat: 20, meal: 'lunch' }], waterMl: 0 }))
  const seeded = getDayEntries(D1) // أول لمسة تُهيّئ
  check('التهيئة بذرت صنف اليوم الموجود (تفصيل كامل لا مجاميع)', seeded.length === 1 && seeded[0].id === 'seed1' && seeded[0].nameAr === 'كبسة' && seeded[0].macros.calories === 600 && seeded[0].meal === 'lunch')
  check('سجل الهجرة موثَّق (init فقط)', isMigrationDone('nutrition-history-init-v1'))
  ensureNutritionHistoryInit()
  check('استدعاء التهيئة ثانيةً لا يكرّر البذر (idempotent)', getDayEntries(D1).length === 1)
}

console.log('\n② عبور حدود اليوم: الترحيل لا يفقد تفصيل الأمس أبدًا')
{
  const chicken = findFoodItem('chicken-breast-grilled')
  check('عنصر المكتبة موجود (sg=150)', chicken !== undefined && chicken.servingGrams === 150)
  const resolved = chicken ? resolveFoodQuantity(chicken, { servings: 1.5 }) : null
  check('حسم كمية 1.5 حصة: جرامات مشتقة وماكروز مضروبة', resolved?.status === 'ok' && resolved.quantity.grams === 225 && resolved.macros.calories === 372 && resolved.macros.protein === 69)
  if (resolved?.status === 'ok' && chicken) {
    addFoodToDay({ id: 'd1-chicken', nameAr: chicken.nameAr, calories: resolved.macros.calories, protein: resolved.macros.protein, carbs: resolved.macros.carbs, fat: resolved.macros.fat, meal: 'lunch', foodId: chicken.id, grams: resolved.quantity.grams, servings: resolved.quantity.servings, unit: 'serving' })
  }
  check('دفتر اليوم الأول: قيدان بتفصيلهما', getDayEntries(D1).length === 2 && getDayEntries(D1)[1].foodId === 'chicken-breast-grilled' && getDayEntries(D1)[1].quantity.servings === 1.5)

  setFakeToday(D2) // ← منتصف ليل جديد
  const fresh = loadNutritionDay()
  check('المتجر الحيّ يوم-فقط: اليوم الجديد يبدأ فارغًا', fresh.date === D2 && fresh.foods.length === 0)
  addFoodToDay({ id: 'd2-dates', nameAr: 'تمر', calories: 100, protein: 1, meal: 'breakfast' })
  check('الأمس بقي مقروءًا بتفصيله الكامل بعد العبور', getDayEntries(D1).length === 2 && getDayEntries(D1)[0].nameAr === 'كبسة' && getDayEntries(D1)[1].macros.calories === 372)
  check('اليوم الجديد يُدوَّن لتاريخه', getDayEntries(D2).length === 1 && getDayEntries(D2)[0].id === 'd2-dates')
  const rawV2 = JSON.parse(ls.getItem(NUTRITION_V2_KEY) ?? 'null') as { date?: string } | null
  check('عقد المتجر القانوني لم يتغيّر: مفتاح v2 يحمل اليوم فقط', rawV2?.date === D2)
  check('مجاميع الأمس القانونية (المرآة) بقيت', (getNutritionLog(D1)?.loggedFood?.calories ?? 0) === 972)
}

console.log('\n③ نسخ وجبة من الأمس إلى اليوم (copyMealToToday عبر addFoodToDay)')
{
  const before = loadNutritionDay().foods.length
  const copied = copyMealToToday(D1, 'lunch')
  const after = loadNutritionDay().foods
  check('نُسخ قيدا غداء الأمس لليوم', copied.status === 'ok' && copied.copied === 2 && after.length === before + 2)
  const copies = after.slice(-2)
  check('النسخ بمعرّفات جديدة ونفس الماكروز والوجبة', copies.every((f) => f.meal === 'lunch') && copies[0].id !== 'seed1' && copies[1].id !== 'd1-chicken' && copies[0].calories === 600 && copies[1].calories === 372)
  check('دفتر اليوم تبع النسخ (الكاتب الواحد)', getDayEntries(D2).length === 3)
  const empty = copyMealToToday(D1, 'dinner')
  check('وجبة فارغة → رفض nothing-to-copy برسالة ثنائية', empty.status === 'rejected' && empty.errors[0].code === 'nothing-to-copy' && empty.errors[0].messageAr.length > 0 && empty.errors[0].messageEn.length > 0)
}

console.log('\n④ تحويلات جرامات↔حصص: ثنائية الاتجاه، كسور، وبلا اختراع')
{
  const chicken = findFoodItem('chicken-breast-grilled')
  if (!chicken) throw new Error('missing fixture')
  check('حصص→جرامات: 0.5→75 · 0.25→37.5 · 1.5→225', gramsForServings(chicken, 0.5) === 75 && gramsForServings(chicken, 0.25) === 37.5 && gramsForServings(chicken, 1.5) === 225)
  check('جرامات→حصص: 225→1.5 · 100→0.67 (عشري)', servingsForGrams(chicken, 225) === 1.5 && servingsForGrams(chicken, 100) === 0.67)
  const byGrams = resolveFoodQuantity(chicken, { grams: 75 })
  check('حسم بالجرامات: نصف حصة بنصف الماكروز', byGrams.status === 'ok' && byGrams.unit === 'g' && byGrams.quantity.servings === 0.5 && byGrams.macros.calories === 124 && byGrams.macros.protein === 23)

  const servingOnly = { calories: 200, protein: 10, carbs: 30, fat: 5 } // بلا servingGrams
  check('عنصر حصص-فقط: لا جرامات مُخترعة (null)', gramsForServings(servingOnly, 2) === null && servingsForGrams(servingOnly, 100) === null)
  const okServings = resolveFoodQuantity(servingOnly, { servings: 2 })
  check('حصص-فقط بحصتين: ماكروز مضروبة والجرامات غائبة وconversion=null', okServings.status === 'ok' && okServings.macros.calories === 400 && okServings.quantity.grams === undefined && okServings.gramsPerServing === null)
  const badGrams = resolveFoodQuantity(servingOnly, { grams: 100 })
  check('حصص-فقط بجرامات → رفض serving-only-item', badGrams.status === 'rejected' && badGrams.errors[0].code === 'serving-only-item')

  const emptyQ = resolveFoodQuantity(chicken, {})
  const zeroQ = resolveFoodQuantity(chicken, { grams: 0 })
  const negQ = resolveFoodQuantity(chicken, { servings: -1 })
  const bothQ = resolveFoodQuantity(chicken, { grams: 100, servings: 1 })
  check('كمية فارغة/صفر/سالبة/مزدوجة → رفض (لا افتراضات)', emptyQ.status === 'rejected' && emptyQ.errors[0].code === 'empty-quantity' && zeroQ.status === 'rejected' && negQ.status === 'rejected' && bothQ.status === 'rejected' && bothQ.errors[0].code === 'ambiguous-quantity')
}

console.log('\n⑤ تعديل كمية قيد: إعادة حساب صادقة — اليوم عبر المتجر الحيّ والماضي بالدفتر')
{
  // اليوم: نسخة الدجاج (بمرجع مكتبة) — 1.5 حصة → 3 حصص
  const copyId = getDayEntries(D2).find((e) => e.foodId === 'chicken-breast-grilled')?.id
  const editedToday = copyId ? editEntry(copyId, { quantity: { servings: 3 } }) : null
  check('تعديل قيد اليوم: الماكروز أُعيد حسابها من المكتبة (3 حصص)', editedToday?.status === 'ok' && editedToday.entry.macros.calories === 744 && editedToday.entry.quantity.grams === 450)
  const liveFood = loadNutritionDay().foods.find((f) => f.id === copyId)
  check('المتجر الحيّ تبع التعديل (updateFoodInDay — الكاتب الواحد)', liveFood?.calories === 744 && liveFood.servings === 3)
  check('دفتر اليوم تبع التعديل', getDayEntries(D2).find((e) => e.id === copyId)?.macros.calories === 744)
  check('مجاميع اليوم القانونية أُعيد حسابها', (getNutritionLog(D2)?.loggedFood?.calories ?? 0) === 100 + 600 + 744)

  // الماضي: قيد الأمس بمرجع مكتبة — 225غ → 300غ
  const editedPast = editEntry('d1-chicken', { quantity: { grams: 300 } })
  check('تعديل قيد ماضٍ: 300غ = حصتان بماكروز مضاعفة', editedPast.status === 'ok' && editedPast.entry.quantity.servings === 2 && editedPast.entry.macros.calories === 496)
  check('دفتر الأمس تحدّث والمجاميع القانونية أُعيد حسابها', getDayEntries(D1).find((e) => e.id === 'd1-chicken')?.macros.calories === 496 && (getNutritionLog(D1)?.loggedFood?.calories ?? 0) === 600 + 496)

  // قيد بلا مرجع ولا كمية أساس (seed1) → لا إعادة حساب مُختلَقة
  const unknown = editEntry('seed1', { quantity: { grams: 100 } })
  check('قيد بلا كمية أساس → رفض quantity-unknown (لا اختلاق)', unknown.status === 'rejected' && unknown.errors[0].code === 'quantity-unknown')

  // طعام يدوي (أساس جرامات) → قياس نسبي بنفس البُعد فقط — هنا بلا حفظ شخصي (opt-out)
  const manual = createManualFood({ nameAr: 'شوربة عدس بيتية', grams: 200, calories: 300, protein: 18, carbs: 40, fat: 8, meal: 'dinner' }, { saveToPersonal: false })
  check('طعام يدوي سُجّل لليوم بوحدة جرامات', manual.status === 'ok' && manual.food.unit === 'g' && manual.food.grams === 200)
  check('saveToPersonal:false يعطّل الحفظ الشخصي لهذه المرة', manual.status === 'ok' && manual.personal === undefined && listPersonalFoods().length === 0)
  const half = manual.status === 'ok' ? editEntry(manual.food.id, { quantity: { grams: 100 } }) : null
  check('تعديل اليدوي نسبيًا: النصف يُنصّف الماكروز', half?.status === 'ok' && half.entry.macros.calories === 150 && half.entry.macros.protein === 9)
  const crossDim = manual.status === 'ok' ? editEntry(manual.food.id, { quantity: { servings: 2 } }) : null
  check('تعديل يدوي ببُعد الحصص (لا أساس له) → رفض quantity-unknown', crossDim?.status === 'rejected' && crossDim.errors[0].code === 'quantity-unknown')

  const ghost = editEntry('ghost-entry', { quantity: { grams: 50 } })
  check('قيد غير موجود → رفض entry-not-found', ghost.status === 'rejected' && ghost.errors[0].code === 'entry-not-found')
}

console.log('\n⑥ حذف قيد: اليوم عبر المتجر الحيّ، والماضي بالدفتر + المجاميع')
{
  const kabsaCopy = getDayEntries(D2).find((e) => e.nameAr === 'كبسة')
  const liveBefore = loadNutritionDay().foods.length
  const removedToday = kabsaCopy ? removeEntry(kabsaCopy.id) : null
  check('حذف قيد اليوم: المتجر الحيّ والدفتر تقلّصا معًا', removedToday?.status === 'ok' && loadNutritionDay().foods.length === liveBefore - 1 && !getDayEntries(D2).some((e) => e.id === kabsaCopy?.id))
  check('مجاميع اليوم أُعيد حسابها بعد الحذف', (getNutritionLog(D2)?.loggedFood?.calories ?? 0) === 100 + 744 + 150)

  const removedPast = removeEntry('seed1')
  check('حذف قيد ماضٍ: الدفتر تقلّص والمجاميع القانونية تحدّثت', removedPast.status === 'ok' && getDayEntries(D1).length === 1 && (getNutritionLog(D1)?.loggedFood?.calories ?? 0) === 496)
  const again = removeEntry('seed1')
  check('حذف نفس القيد ثانيةً → رفض', again.status === 'rejected' && again.errors[0].code === 'entry-not-found')
}

console.log('\n⑦ الأطعمة الشخصية: يدوي = تسجيل + متجر شخصي افتراضيًا، عزل مالك، تحقّق صارم')
{
  const saved = createManualFood({ nameAr: 'خلطة شوفان زياد', grams: 150, calories: 420, protein: 22, carbs: 60, fat: 10 })
  check('اليدوي يُحفظ شخصيًا افتراضيًا (عقد P7): pf-1 + مسجَّل لليوم', saved.status === 'ok' && saved.personal?.id === 'pf-1' && listPersonalFoods().length === 1)
  check('عزل المالك: قائمة مالك آخر فارغة', listPersonalFoods('user-B-22222222').length === 0)
  const noName = createManualFood({ nameAr: '   ', grams: 100, calories: 100, protein: 5, carbs: 10, fat: 2 })
  const noGrams = createManualFood({ nameAr: 'x', grams: 0, calories: 100, protein: 5, carbs: 10, fat: 2 })
  const negMacro = createManualFood({ nameAr: 'x', grams: 100, calories: 100, protein: -5, carbs: 10, fat: 2 })
  const nanMacro = createManualFood({ nameAr: 'x', grams: 100, calories: Number.NaN, protein: 5, carbs: 10, fat: 2 })
  check('اسم فارغ/جرامات صفر/ماكرو سالب/NaN → رفض invalid-manual-food', [noName, noGrams, negMacro, nanMacro].every((r) => r.status === 'rejected' && r.errors[0].code === 'invalid-manual-food'))
  check('حذف الطعام الشخصي: مرة تنجح والثانية ترفض', deletePersonalFood('pf-1') === true && deletePersonalFood('pf-1') === false && listPersonalFoods().length === 0)
  check(`السقف موثّق كثابت مُصدَّر (${MAX_PERSONAL_FOODS})`, MAX_PERSONAL_FOODS === 200)
}

console.log('\n⑧ الإحصاء الأسبوعي: قيود فعلية، والأيام القديمة مجاميع موسومة {estimated:true}')
{
  saveNutritionLog(D0, { loggedFood: { calories: 1800, protein: 90, carbs: 150, fat: 60 } }) // يوم ما قبل الدفتر
  const stats = getWeeklyNutritionStats(D2)
  check('٧ أيام تنتهي باليوم، الأقدم أولًا', stats.length === 7 && stats[0].date === D0 && stats[6].date === D2)
  const d0 = stats.find((s) => s.date === D0)
  check('اليوم القديم: مجاميع فقط + estimated:true (لا تفصيل مُختلَق)', d0?.source === 'totals' && d0.estimated === true && d0.totals.calories === 1800 && d0.entryCount === 0)
  // اليوم بعد ⑤–⑦: تمر 100 + دجاج معدَّل 744 + شوربة منصَّفة 150 + خلطة شوفان 420 = 1414
  check('الأمس واليوم: من القيود الفعلية + estimated:false', stats[5].source === 'entries' && stats[5].estimated === false && stats[5].totals.calories === 496 && stats[6].source === 'entries' && stats[6].totals.calories === 1414)
  const empty = stats.find((s) => s.date === '2026-07-16')
  check('يوم بلا أي بيانات: none بأصفار', empty?.source === 'none' && empty.estimated === false && empty.totals.calories === 0)
  check('الصدق: يوم المجاميع القديم لا قيود له في الدفتر', getDayEntries(D0).length === 0)
}

console.log(`\n⑨ التشذيب: تفصيل أقدم من ${HISTORY_RETENTION_DAYS} يومًا يُشذَّب عند الكتابة (المجاميع تبقى)`)
{
  const ancient = '2026-04-10' // أقدم من نافذة الاحتفاظ نسبةً إلى D2
  const ledger = JSON.parse(ls.getItem(NUTRITION_HISTORY_KEY) ?? '{}') as Record<string, Record<string, unknown[]>>
  ledger.guest = { ...ledger.guest, [ancient]: [{ id: 'old1', nameAr: 'قديم', meal: 'snack', quantity: {}, unit: 'serving', macros: { calories: 100, protein: 5 }, addedAt: '' }] }
  ls.setItem(NUTRITION_HISTORY_KEY, JSON.stringify(ledger))
  check('تمهيد: اليوم القديم موجود في الدفتر', getDayEntries(ancient).length === 1)
  addFoodToDay({ id: 'd2-water-biscuit', nameAr: 'بسكويت', calories: 50, protein: 1, meal: 'snack' }) // كتابة تُطلق التشذيب
  check('بعد الكتابة: التفصيل القديم شُذِّب والأيام الحديثة بقيت', getDayEntries(ancient).length === 0 && getDayEntries(D1).length === 1 && getDayEntries(D2).length > 0)
}

console.log('\n⑩ التخزين المعادي: تلف لا يرمي، والقيد المشوّه يُسقط بصمت')
{
  const backup = ls.getItem(NUTRITION_HISTORY_KEY)
  ls.setItem(NUTRITION_HISTORY_KEY, '{broken json')
  check('دفتر تالف → قراءة فارغة بلا رمي', getDayEntries(D1).length === 0)
  ls.setItem(NUTRITION_HISTORY_KEY, JSON.stringify({ guest: { [D1]: [{ id: 'x' }, { id: 'ok', nameAr: 'سليم', meal: 'weird-slot', quantity: { grams: -5 }, unit: 'x', macros: { calories: 10, protein: 1 }, addedAt: '' }] } }))
  const cleaned = getDayEntries(D1)
  check('المشوّه يُسقط والسليم يُطبَّع (وجبة غريبة→snack، كمية سالبة→تُسقط)', cleaned.length === 1 && cleaned[0].id === 'ok' && cleaned[0].meal === 'snack' && cleaned[0].quantity.grams === undefined)
  if (backup) ls.setItem(NUTRITION_HISTORY_KEY, backup)
}

console.log('\n⑪ التسجيل المركزي + جولة تصدير/استيراد كاملة')
{
  check('السجلّ المركزي: مفتاح الدفتر مسجّل (user/scoped/exported/مُزامَن P12)', DATA_KEYS.some((d) => d.key === NUTRITION_HISTORY_KEY && d.kind === 'user' && d.scoped && d.exported && d.synced))
  check('السجلّ المركزي: مفتاح الأطعمة الشخصية مسجّل', DATA_KEYS.some((d) => d.key === PERSONAL_FOODS_KEY && d.kind === 'user' && d.scoped && d.exported && !d.synced))
  check('سجلّ النقل: متجرا nutritionHistory وpersonalFoods معرّفان (ownerMap)', STORE_BY_ID.nutritionHistory?.kind === 'ownerMap' && STORE_BY_ID.personalFoods?.kind === 'ownerMap')

  ls.clear()
  const UID = 'user-A-11111111'
  stampDataOwner(UID) // الدفتر يُنسب لمالكه (ختم الملكية)
  setSyncRuntime(UID, false)
  addFoodToDay({ id: 'exp-1', nameAr: 'جريش', calories: 350, protein: 12, meal: 'lunch', grams: 250, unit: 'g' })
  const savedPersonal = createManualFood({ nameAr: 'صوص زبادي', grams: 50, calories: 60, protein: 4, carbs: 5, fat: 3 }, { saveToPersonal: true })
  check('تمهيد: قيدا يوم تحت المالك + طعام شخصي', savedPersonal.status === 'ok' && Object.keys(loadLedgerDays(UID)).length === 1 && loadLedgerDays(UID)[D2].length === 2 && listPersonalFoods(UID).length === 1)

  const bundle = buildExportBundle(UID)
  check('الحزمة تحمل الدفتر والأطعمة الشخصية بعدّادات صحيحة', bundle.counts.nutritionHistory === 1 && bundle.counts.personalFoods === 1)

  wipeUserData(UID)
  check('بعد المسح: لا دفتر ولا أطعمة شخصية', Object.keys(loadLedgerDays(UID)).length === 0 && listPersonalFoods(UID).length === 0)

  const result = applyImport(bundle, UID, UID)
  const restored = loadLedgerDays(UID)
  check('الاستيراد يعيد الدفتر بتفصيله تحت المالك نفسه', result.storesApplied > 0 && restored[D2]?.length === 2 && restored[D2][0].nameAr === 'جريش' && restored[D2][0].quantity.grams === 250)
  check('الاستيراد يعيد الأطعمة الشخصية', listPersonalFoods(UID).length === 1 && listPersonalFoods(UID)[0].nameAr === 'صوص زبادي')
}

console.log(`\n=== النتيجة: ${pass} ✓ / ${fail} ✗ ===`)
if (fail > 0) process.exit(1)
