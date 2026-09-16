// إثبات توحيد التغذية — بنية واحدة · تاريخ يومي · كمية · ترحيل فائض السعرات.
//
// يعمل فوق localStorage مُحاكى عبر run-nutrition-canonical-proof.mjs (نفس نمط
// run-nutrition-history-proof.mjs) وبساعة مُزيَّفة لعبور منتصف الليل حقيقةً لا
// تمثيلًا.
//
// يغطّي بنودًا مسمّاة:
//   ① البنية: لا فرع `style` في الشاشة الحيّة — ومحاكاة إعادته تسقط بفحص مسمّى.
//   ② اليوم المحلي: عبور منتصف الليل لا ينقل طعامًا بين يومين، ولا تحويل UTC.
//   ③ الكمية: تُحفظ · تُعرض · تُعدَّل — لليوم وللماضي — وبلا اختراع للقديم.
//   ④ الترحيل: مطفأ ⇒ صفر · مشتغل ⇒ الخصم الصحيح · الأساسي لا يُكتب فوقه أبدًا.
//   ⑤ حواف الترحيل: أيام متعدّدة · تعديل الأمس لاحقًا · الإطفاء · تغيير الخطة ·
//      فائض ضخم يقف عند الأرضية الآمنة القائمة.
//   ⑥ البقاء: تصدير/استيراد وإعادة الدخول لا تفقد تاريخًا ولا إعدادًا.

import { readFileSync } from 'node:fs'
import {
  getDayEntries,
  editEntry,
  ensureNutritionHistoryInit,
  earliestNutritionDate,
  findFoodItem,
  getDayNutritionStat,
  removeEntry,
  resolveFoodQuantity,
  addEntryToDay,
} from '@/lib/nutritionHistory'
import { addFoodToDay, loadNutritionDay } from '@/lib/nutritionV2Model'
import { getNutritionLog, saveNutritionLog } from '@/lib/historyStore'
import { getDayStamp, shiftDayStamp, daysBetweenStamps } from '@/lib/today'
import { stampDataOwner } from '@/lib/dataOwnership'
import { calorieFloor } from '@/lib/calculators'
import {
  CARRYOVER_DEFICIT_POLICY,
  CARRYOVER_LOOKBACK_DAYS,
  NUTRITION_CARRYOVER_KEY,
  computeDayTargets,
  getCarryoverSettings,
  getDayBaseTarget,
  getDayEffectiveTarget,
  recordDayTargets,
  setCarryoverEnabled,
} from '@/lib/nutritionCarryover'
import { buildExportBundle, applyImport } from '@/lib/portability'
import { setSyncRuntime } from '@/lib/syncQueue'

// نفس إعلان شخصية `nutrition-history-proof`: موضوع الإثبات سلوك التخزين
// والحساب لا الاستحقاق، وحارس الاستحقاق يحرسه `test:access-gate` بشخصيتيه.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })

let pass = 0
let fail = 0
const failures: string[] = []
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    failures.push(label)
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const ls = globalThis.localStorage
// جذر المستودع يُحقَن من المُشغّل (الحزمة تعمل من /tmp).
const ROOT = (globalThis as unknown as { __QIMMAH_ROOT?: string }).__QIMMAH_ROOT ?? '.'
const read = (rel: string): string => readFileSync(`${ROOT}/${rel}`, 'utf8')

// ── ساعة مُزيَّفة (نسخة مطابقة لنمط nutrition-history-proof) ──────────────────
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

/** يهيّئ جلسة نظيفة بمالك معروف وساعة مثبَّتة. */
function reset(today: string, owner = 'user-1'): void {
  ls.clear()
  ls.setItem('qimmah:history:migrated:v1', 'done')
  setFakeToday(today)
  stampDataOwner(owner)
  setEntitlement({ status: 'active', source: 'mock' })
}

const SUN = '2026-03-01'
const MON = '2026-03-02'
const TUE = '2026-03-03'
const WED = '2026-03-04'
const THU = '2026-03-05'

console.log('\n=== إثبات توحيد التغذية (بنية · تاريخ · كمية · ترحيل) ===')

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n① بنية واحدة: لا فرع `style` يبدّل معمار الشاشة')
{
  const view = read('src/views/NutritionView.tsx')

  // الفرع المحذوف بعينه: كان `style === 'meal_suggestions' ? …أقسام… : …مسجّل مسطّح…`
  check(
    'الشاشة الحيّة لا تقرأ `nutritionPlan.style` أصلًا',
    !/\bnp\.style\b/.test(view) && !/style === 'meal_suggestions'/.test(view),
  )
  check(
    'أقسام الوجبات تُرسَم بلا شرط — لكل مستخدم',
    /data-testid="nutrition-meal-sections"/.test(view) && /mealSlots\.map\(\(slot\) => \(/.test(view),
  )
  /**
   * المسجّل السريع يبقى **مضمَّنًا داخل بطاقة الوجبة** وحدها. الفحص مقترن لا
   * متفرّق: كل استخدام لـ`<QuickMealLogger` في الشاشة يجب أن يحمل `embedded`،
   * فلا يمرّ سطح مسطّح مستقلّ بادّعاء أن الكلمة موجودة في مكان ما من الملفّ.
   */
  const usages = [...view.matchAll(/<QuickMealLogger\b[\s\S]*?\/>/g)].map((m) => m[0])
  check('كل استخدام للمسجّل داخل الشاشة مضمَّن في بطاقة وجبة', usages.length > 0 && usages.every((u) => /\bembedded\b/.test(u)))
  check('واستخدام واحد فقط — لا سطح تسجيل ثانٍ', usages.length === 1)

  /**
   * ═══ المسجّل لا يعرف «اليوم» ضمنًا ═══
   * أخطر انحدار ممكن في تسجيل الماضي: أن يعود `QuickMealLogger` إلى
   * `useNutritionToday` فيكتب في اليوم الحالي مهما كان اليوم المعروض — فيسجّل
   * المستخدم عشاء الأربعاء ويجده في الخميس. الفحص بنيويّ مقترن: لا استيراد
   * للهوك اليوميّ، **و** اليوم يصل إليه وسيطًا صريحًا من الشاشة.
   */
  const qml = read('src/components/nutrition/QuickMealLogger.tsx')
  check('المسجّل لا يستورد هوك «اليوم» (لا كتابة ضمنية في اليوم الحالي)', !/\buseNutritionToday\b/.test(qml))
  check('المسجّل يكتب في اليوم الممرَّر إليه صراحةً', /useNutritionDay\(logDate \?\? getDayStamp\(\)\)/.test(qml))
  check('والشاشة تمرّر اليوم المعروض لبطاقة الوجبة ثم للمسجّل', /logDate=\{viewDate\}/.test(view) && /logDate=\{logDate\}/.test(view))
  /**
   * حدّ الزرّ = حدّ الكاتب. لو اتّسع أحدهما دون الآخر لظهر زرّ «أضف» على يوم
   * يرفضه الكاتب — وعدٌ يفشل عند الضغط. الفحص يربطهما بالثابت نفسه.
   */
  const dayHook = read('src/lib/nutritionDay.ts')
  check('حدّ إتاحة الإضافة مشتقّ من نافذة الحفظ نفسها لا من ثابت ثانٍ', /HISTORY_RETENTION_DAYS/.test(dayHook) && /canAdd: writable/.test(dayHook))
  check('و`canAdd` ليس ثابتًا مقنّعًا (يومٌ غير قابل للكتابة يعيد false)', /const writable = date <= todayStamp && date >= shiftDayStamp\(todayStamp, -HISTORY_RETENTION_DAYS\)/.test(dayHook))

  console.log('\n   ⚔️ محاكاة: عودة المسجّل إلى هوك «اليوم» تسقط بفحص مسمّى')
  {
    const regressed = qml.replace("import { useNutritionDay } from '@/lib/nutritionDay'", "import { useNutritionToday } from '@/lib/nutritionTracking'")
    check('⚔️ المحاكاة غيّرت النصّ فعلًا', regressed !== qml)
    check('⚔️ وتسقط بفحص «لا يستورد هوك اليوم»', /\buseNutritionToday\b/.test(regressed))
    const dropped = view.replace('logDate={viewDate}', '')
    check('⚔️ وإسقاط تمرير اليوم من الشاشة يسقط بفحصه', !/logDate=\{viewDate\}/.test(dropped))
  }

  // الاستهلاك الوحيد الباقي لـ`style` هو توليد الخطة ووصفها — لا معمار الشاشة.
  const gen = read('src/lib/planGenerator.ts')
  check('`style` ما زال تفضيلًا حيًّا في توليد الخطة (السؤال لم يصر بلا أثر)', /nutritionDisplayStyle/.test(gen))

  console.log('\n   ⚔️ محاكاة الالتفاف — الحارس يُهاجَم من الجهتين')
  {
    // (١) إعادة الفرع البنيوي بصيغته القديمة.
    const revived = view.replace(
      '<div className="mt-6 space-y-4" data-testid="nutrition-meal-sections">',
      '{np.style === \'meal_suggestions\' ? (\n        <div className="mt-6 space-y-4" data-testid="nutrition-meal-sections">',
    )
    check('⚔️ المحاكاة الأولى غيّرت النصّ فعلًا (لا هجمة على الفراغ)', revived !== view)
    check('⚔️ إعادة الفرع تسقط بالفحص المسمّى «لا تقرأ np.style»', /\bnp\.style\b/.test(revived))

    // (٢) إعادة سطح تسجيل مسطّح ثانٍ **غير مضمَّن** — الالتفاف الأخطر، لأنه يعيد
    //     الشاشة الثانية بلا أن يذكر `style` إطلاقًا.
    const flattened = view.replace(
      '<div className="mt-6 space-y-4" data-testid="nutrition-meal-sections">',
      '<QuickMealLogger lang={lang} targetCalories={targetCalories} targetProtein={targetProtein} showTargets={hasNumericTargets} />\n        <div className="mt-6 space-y-4" data-testid="nutrition-meal-sections">',
    )
    const attackedUsages = [...flattened.matchAll(/<QuickMealLogger\b[\s\S]*?\/>/g)].map((m) => m[0])
    check('⚔️ المحاكاة الثانية غيّرت النصّ فعلًا', flattened !== view)
    check('⚔️ سطح تسجيل مسطّح ثانٍ يسقط بفحص «كل استخدام مضمَّن»', !attackedUsages.every((u) => /\bembedded\b/.test(u)))
    check('⚔️ ويسقط كذلك بفحص «استخدام واحد فقط»', attackedUsages.length !== 1)

    // (٣) نزع وسم الأقسام يسقط الفحص الإيجابي — الحارس له أسنان في الاتجاهين.
    const stripped = view.replace('data-testid="nutrition-meal-sections"', 'data-testid="x"')
    check('⚔️ نزع أقسام الوجبات يسقط الفحص الإيجابي', !/data-testid="nutrition-meal-sections"/.test(stripped))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n② اليوم المحلي: منتصف الليل لا ينقل طعامًا بين يومين')
{
  reset(WED)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()

  check('الساعة المُزيَّفة تعمل', getDayStamp() === WED)
  check('`shiftDayStamp` حساب تقويم محلي لا UTC', shiftDayStamp(WED, -1) === TUE && shiftDayStamp(WED, 1) === THU)
  check('`daysBetweenStamps` يعدّ أيام التقويم', daysBetweenStamps(SUN, THU) === 4 && daysBetweenStamps(THU, SUN) === -4)

  addFoodToDay({ id: 'wed-rice', nameAr: 'رز أبيض', calories: 260, protein: 5, carbs: 57, fat: 1, meal: 'lunch', grams: 200, unit: 'g' })
  check('الأربعاء سُجِّل', getDayEntries(WED).length === 1 && getDayEntries(WED)[0].macros.calories === 260)

  setFakeToday(THU) // ← منتصف الليل
  addFoodToDay({ id: 'thu-eggs', nameAr: 'بيض', calories: 150, protein: 13, carbs: 1, fat: 10, meal: 'breakfast', grams: 100, unit: 'g' })

  check('إضافة الخميس لم تمسّ الأربعاء', getDayEntries(WED).length === 1 && getDayEntries(WED)[0].id === 'wed-rice')
  check('الخميس يحمل قيده وحده', getDayEntries(THU).length === 1 && getDayEntries(THU)[0].id === 'thu-eggs')
  check('مجاميع كل يوم منفصلة', getDayNutritionStat(WED).totals.calories === 260 && getDayNutritionStat(THU).totals.calories === 150)
  check('المتجر الحيّ يوم-فقط والدفتر يحفظ الأمس', loadNutritionDay().date === THU && loadNutritionDay().foods.length === 1)

  // الختم يُبنى من التقويم المحلي: منتصف ليل محليّ ≠ منتصف ليل UTC في +03.
  const localMidnight = new RealDate(2026, 2, 5, 0, 30, 0) // 5 مارس 00:30 محليًّا
  check('ختم 00:30 محليًّا هو يوم ٥ لا يوم ٤ (لا انزلاق UTC)', getDayStamp(localMidnight) === THU)
  const lateNight = new RealDate(2026, 2, 4, 23, 45, 0)
  check('ختم 23:45 محليًّا يبقى يوم ٤', getDayStamp(lateNight) === WED)

  check('التصفّح يعرف أقدم يوم مسجَّل', earliestNutritionDate() === WED)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n③ الكمية: تُحفظ وتُعرض وتُعدَّل — لليوم وللماضي')
{
  reset(WED)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()

  const rice = findFoodItem('rice-white-cooked') ?? findFoodItem('chicken-breast-grilled')
  check('عنصر مكتبة بمرجع وحصة معروفة موجود', !!rice && typeof rice.servingGrams === 'number')
  if (rice) {
    const resolved = resolveFoodQuantity(rice, { grams: 200 })
    check('حسم ٢٠٠غ ينتج ماكروز محسوبة وحصصًا مشتقّة', resolved.status === 'ok' && resolved.quantity.grams === 200)
    if (resolved.status === 'ok') {
      addFoodToDay({
        id: 'q-1', nameAr: rice.nameAr, calories: resolved.macros.calories, protein: resolved.macros.protein,
        carbs: resolved.macros.carbs, fat: resolved.macros.fat, meal: 'lunch',
        foodId: rice.id, grams: resolved.quantity.grams, servings: resolved.quantity.servings, unit: 'g',
      })
      const saved = getDayEntries(WED)[0]
      check('الكمية محفوظة في القيد (جرامات + وحدة + مرجع)', saved.quantity.grams === 200 && saved.unit === 'g' && saved.foodId === rice.id)

      const before = saved.macros.calories
      const edited = editEntry('q-1', { quantity: { grams: 150 } })
      const after = getDayEntries(WED)[0]
      check('تعديل ٢٠٠غ ⇒ ١٥٠غ مقبول', edited.status === 'ok' && after.quantity.grams === 150)
      check('الماكروز أُعيد حسابها من المكتبة لا بالتناسب الأعمى', after.macros.calories === Math.round((rice.calories || 0) * (150 / (rice.servingGrams || 100))))
      check('وهي أقلّ من قيمة ٢٠٠غ (التعديل أثّر فعلًا)', after.macros.calories < before)
    }
  }

  // الماضي: نفس العقد — الكمية تبقى مرئية وقابلة للتعديل بعد انقضاء اليوم.
  setFakeToday(THU)
  const pastBefore = getDayEntries(WED)[0]
  check('كمية الأمس ما زالت مقروءة بعد العبور', pastBefore?.quantity.grams === 150)
  const pastEdit = editEntry('q-1', { quantity: { grams: 300 } })
  check('تعديل كمية يوم ماضٍ مقبول', pastEdit.status === 'ok' && getDayEntries(WED)[0].quantity.grams === 300)
  check('ومجاميع ذلك اليوم القانونية تتبع التعديل', (getNutritionLog(WED)?.loggedFood?.calories ?? -1) === getDayEntries(WED)[0].macros.calories)
  check('التعديل لم يمسّ اليوم الحالي', loadNutritionDay().date === THU && loadNutritionDay().foods.length === 0)

  // لا اختراع لقديم بلا كمية.
  addFoodToDay({ id: 'q-old', nameAr: 'صنف قديم بلا كمية', calories: 300, protein: 10, meal: 'dinner' })
  const noQty = editEntry('q-old', { quantity: { grams: 120 } })
  check('قيد بلا كمية أساس يُرفض بسبب مسمّى — لا حصة مُخترعة', noQty.status === 'rejected' && noQty.errors[0].code === 'quantity-unknown')

  check('الحذف يعمل على الماضي كذلك', removeEntry('q-1').status === 'ok' && getDayEntries(WED).length === 0)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n④ الترحيل: مطفأ ⇒ صفر · مشتغل ⇒ الخصم الصحيح · الأساسي لا يُمسّ')
{
  reset(WED)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()

  check('الافتراض مطفأ — لا يُشغَّل نيابةً عن أحد', getCarryoverSettings().enabled === false)
  check('سياسة العجز معزولة ومعلَنة', CARRYOVER_DEFICIT_POLICY === 'ignore')

  // الأمس: هدف ٢٠٠٠ واستهلاك ٢٢٠٠ ⇒ فائض ٢٠٠ (مثال المؤسس حرفيًّا).
  setFakeToday(TUE)
  recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'tue-food', nameAr: 'وجبة', calories: 2200, protein: 100, meal: 'lunch' })
  check('هدف الأمس الأساسي مسجَّل', getDayBaseTarget(TUE) === 2000)
  check('استهلاك الأمس مقروء', getDayNutritionStat(TUE).totals.calories === 2200)

  setFakeToday(WED)
  recordDayTargets(WED, { base: 2000, effective: 2000 })

  const off = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('مطفأ: لا خصم، والمعدَّل = الأساسي', off.carryover === 0 && off.effective === 2000 && off.active === false)

  check('التشغيل يُحفظ', setCarryoverEnabled(true, TUE) === 'ok' && getCarryoverSettings().enabled === true)
  const on = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('مشتغل: الخصم −٢٠٠ بالضبط', on.carryover === -200)
  check('هدف اليوم المعدَّل ١٨٠٠', on.effective === 1800)
  check('والهدف الأساسي ما زال ٢٠٠٠ في التفصيل نفسه', on.base === 2000)
  check('مصدر الخصم مسمّى بيومه وفائضه', on.sourceDate === TUE && on.sourceSurplus === 200)
  check('⭐ الأساسي في الخطة/السجلّ لم يُكتب فوقه', getDayBaseTarget(TUE) === 2000 && getDayBaseTarget(WED) === 2000)

  // أقلّ من الهدف ⇒ لا رصيد يُضاف للغد.
  reset(WED)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'tue-light', nameAr: 'خفيف', calories: 1500, protein: 80, meal: 'lunch' })
  setFakeToday(WED)
  const under = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('أقلّ من الهدف ⇒ صفر لا رصيد (الفائض وحده يُرحَّل)', under.carryover === 0 && under.effective === 2000)

  // لا أثر رجعي: يوم قبل السريان لا يُرحَّل منه.
  reset(WED)
  ensureNutritionHistoryInit()
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'tue-over', nameAr: 'فائض', calories: 2500, protein: 100, meal: 'lunch' })
  setFakeToday(WED)
  setCarryoverEnabled(true, WED) // شُغِّلت **اليوم**
  const noRetro = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('التشغيل اليوم لا يعاقب على أمسٍ كانت الميزة فيه مطفأة', noRetro.carryover === 0 && noRetro.effective === 2000)

  // يوم بلا هدف مسجَّل لا يُرحَّل منه — لا هدف مُختلَق.
  reset(WED)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE)
  addFoodToDay({ id: 'tue-nobase', nameAr: 'بلا هدف', calories: 3000, protein: 100, meal: 'lunch' })
  setFakeToday(WED)
  const noBase = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('يوم بلا هدف مسجَّل ⇒ لا خصم (لا رقم مخترَع)', getDayBaseTarget(TUE) === null && noBase.carryover === 0)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ حواف الترحيل')
{
  // (أ) أيام فائض متتالية — الفائض يُقاس على **المعدَّل** فلا يتضاعف الدَّين.
  reset(THU)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'e-tue', nameAr: 'ثلاثاء', calories: 2200, protein: 90, meal: 'lunch' })
  setFakeToday(WED)
  const wedT = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('(أ) الأربعاء معدَّله ١٨٠٠', wedT.effective === 1800)
  // الشاشة تسجّل **ما عرضته**: الأساسي والمعدَّل معًا. وهذا التسجيل هو ما يجعل
  // نظرة الغد يومًا واحدًا بلا سلسلة.
  recordDayTargets(WED, { base: wedT.base, effective: wedT.effective })
  check('(أ) المعدَّل المعروض هو المسجَّل حرفيًّا', getDayEffectiveTarget(WED) === 1800 && getDayBaseTarget(WED) === 2000)
  addFoodToDay({ id: 'e-wed', nameAr: 'أربعاء', calories: 2000, protein: 90, meal: 'lunch' })
  setFakeToday(THU)
  const thuT = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('(أ) الخميس يخصم فائض الأربعاء فوق معدَّله (٢٠٠٠−١٨٠٠=٢٠٠) لا فوق الأساسي', thuT.carryover === -200 && thuT.effective === 1800)

  // (ب) تعديل طعام الأمس **لاحقًا** يصحّح خصم اليوم فورًا — لأن الخصم مشتقّ لا
  //     مخزَّن. هذا هو البند الذي يجعل الميزة تبدو «عشوائية» حين يُخزَّن الخصم.
  reset(THU)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  const chicken = findFoodItem('chicken-breast-grilled')
  check('(ب) عنصر مكتبة بحصة معروفة (١٥٠غ)', chicken?.servingGrams === 150)
  setFakeToday(WED)
  recordDayTargets(WED, { base: 2000, effective: 2000 })
  if (chicken) {
    // ١٥٠٠غ دجاج + وجبة ثابتة ⇒ استهلاك فوق الهدف بوضوح.
    const big = resolveFoodQuantity(chicken, { grams: 1500 })
    if (big.status === 'ok') {
      addFoodToDay({ id: 'b-wed', nameAr: chicken.nameAr, calories: big.macros.calories, protein: big.macros.protein, carbs: big.macros.carbs, fat: big.macros.fat, meal: 'lunch', foodId: chicken.id, grams: 1500, servings: big.quantity.servings, unit: 'g' })
    }
  }
  setFakeToday(THU)
  const beforeEdit = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('(ب) قبل التعديل: خصم موجود لأن الأمس تجاوز هدفه', beforeEdit.carryover < 0 && beforeEdit.sourceDate === WED)
  const surplusBefore = beforeEdit.sourceSurplus ?? 0

  // المستخدم يصحّح: كان ٥٠٠غ لا ١٥٠٠غ.
  const shrink = editEntry('b-wed', { quantity: { grams: 500 } })
  check('(ب) تعديل كمية يوم ماضٍ مقبول', shrink.status === 'ok')
  const afterEdit = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('(ب) الخصم أُعيد حسابه فورًا بعد تعديل الماضي', afterEdit.carryover > beforeEdit.carryover)
  check('(ب) والفائض الجديد أصغر من السابق بمقدار ما نقص من الطعام', (afterEdit.sourceSurplus ?? 0) < surplusBefore)
  check('(ب) والأساسي لم يتغيّر بأيّ من العمليتين', afterEdit.base === 2000 && getDayBaseTarget(WED) === 2000)

  // وحذف طعام الأمس كلّه يلغي الخصم من تلقائه — بلا هجرة ولا مسار إبطال.
  check('(ب) حذف القيد مقبول', removeEntry('b-wed').status === 'ok')
  const afterRemoval = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('(ب) حذف طعام الأمس ألغى الخصم من تلقائه', afterRemoval.carryover === 0 && afterRemoval.effective === 2000)

  // (ج) الإطفاء يعيد الاستهداف الطبيعي فورًا.
  reset(WED)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'c-tue', nameAr: 'فائض', calories: 2400, protein: 90, meal: 'lunch' })
  setFakeToday(WED)
  check('(ج) قبل الإطفاء: خصم −٤٠٠', computeDayTargets({ base: 2000, date: WED, gender: 'male' }).carryover === -400)
  check('(ج) الإطفاء يُحفظ', setCarryoverEnabled(false, WED) === 'ok')
  const afterOff = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('(ج) بعد الإطفاء: الهدف طبيعي فورًا بلا خطوة تنظيف', afterOff.carryover === 0 && afterOff.effective === 2000 && afterOff.active === false)
  check('(ج) والإطفاء لم يمسّ بيانات الأمس', getDayEntries(TUE).length === 1 && getDayBaseTarget(TUE) === 2000)

  // (د) تغيير خطة السعرات: خصم اليوم يُقاس على هدف **الأمس** المسجَّل لا هدف اليوم.
  reset(WED)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'd-tue', nameAr: 'فائض', calories: 2300, protein: 90, meal: 'lunch' })
  setFakeToday(WED); recordDayTargets(WED, { base: 2600, effective: 2600 }) // الخطة تغيّرت اليوم
  const planChanged = computeDayTargets({ base: 2600, date: WED, gender: 'male' })
  check('(د) الفائض محسوب على هدف الأمس (٢٣٠٠−٢٠٠٠=٣٠٠) لا على هدف اليوم الجديد', planChanged.carryover === -300)
  check('(د) والمعدَّل يُبنى على الأساس الجديد ٢٦٠٠ ⇒ ٢٣٠٠', planChanged.effective === 2300 && planChanged.base === 2600)

  // (هـ) فائض ضخم: يقف عند الأرضية الآمنة القائمة — لا رقم جديد ولا دَين مؤجَّل.
  reset(WED)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'h-tue', nameAr: 'فائض ضخم', calories: 9000, protein: 90, meal: 'lunch' })
  setFakeToday(WED)
  const huge = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
  check('(هـ) الأرضية مستوردة من `calculators` لا معرَّفة هنا', huge.floor === calorieFloor('male') && huge.floor === 1500)
  check('(هـ) المعدَّل لا ينزل تحت الأرضية مهما كان الفائض', huge.effective === 1500 && huge.floorApplied === true)
  const hugeF = computeDayTargets({ base: 2000, date: WED, gender: 'female' })
  check('(هـ) والأرضية تتبع الجنس كما في المقدِّر', hugeF.floor === calorieFloor('female') && hugeF.effective === 1200)
  // الباقي فوق الأرضية لا يُدوَّر: غدٌ بلا استهلاك لا يرث شيئًا.
  // الأربعاء (اليوم الذي قُصّ فيه الهدف) سجّل ما عُرض: أساسي ٢٠٠٠ · معدَّل ١٥٠٠.
  recordDayTargets(WED, { base: huge.base, effective: huge.effective })
  setFakeToday(THU)
  const nextDay = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('(هـ) الباقي لا يُدوَّر ليوم ثالث (لا دَين يلاحق المستخدم)', nextDay.carryover === 0 && nextDay.effective === 2000)

  // (و) النظرة يوم واحد — لا نافذة ولا سلسلة ولا سقف مصطنع.
  check('(و) النظرة يوم واحد معلَنة ثابتًا', CARRYOVER_LOOKBACK_DAYS === 1)
  check('(و) لا ثابت نافذة/سلسلة باقٍ في الوحدة', !/CARRYOVER_CHAIN_DAYS/.test(read('src/lib/nutritionCarryover.ts')))
  {
    /**
     * الكلفة لا تتبع طول التاريخ: سريان منذ ٢٠٢٠ يقرأ **يومًا واحدًا** تمامًا
     * كسريان منذ أمس. نقيسها بعدّ قراءات المتجر لا بالساعة (الساعة تتقلّب).
     */
    reset(WED)
    ensureNutritionHistoryInit()
    setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
    addFoodToDay({ id: 'w-tue', nameAr: 'فائض', calories: 2200, protein: 90, meal: 'lunch' })
    setFakeToday(WED)
    const realGet = globalThis.localStorage.getItem.bind(globalThis.localStorage)
    let reads = 0
    globalThis.localStorage.getItem = (k: string) => { reads += 1; return realGet(k) }
    const ancient = computeDayTargets({ base: 2000, date: WED, settings: { enabled: true, enabledAt: '2020-01-01' }, gender: 'male' })
    const ancientReads = reads
    reads = 0
    const recent = computeDayTargets({ base: 2000, date: WED, settings: { enabled: true, enabledAt: TUE }, gender: 'male' })
    const recentReads = reads
    globalThis.localStorage.getItem = realGet
    check('(و) سريان منذ ٢٠٢٠ يعطي نفس نتيجة سريانٍ منذ أمس', ancient.carryover === recent.carryover && ancient.carryover === -200)
    check('(و) وبنفس عدد القراءات تمامًا — الكلفة لا تتبع طول التاريخ', ancientReads === recentReads && ancientReads > 0)
  }

  // (ح) الهدف يُثبَّت بانقضاء يومه: تعديل طعام **أوّل أمس** لا يعيد كتابة هدف أمس.
  {
    reset(THU)
    ensureNutritionHistoryInit()
    setCarryoverEnabled(true, MON)
    setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
    addFoodToDay({ id: 'h2-tue', nameAr: 'ثلاثاء', calories: 2400, protein: 90, meal: 'lunch' })
    setFakeToday(WED)
    const wed = computeDayTargets({ base: 2000, date: WED, gender: 'male' })
    recordDayTargets(WED, { base: wed.base, effective: wed.effective })
    check('(ح) الأربعاء عُرض ١٦٠٠ وسُجِّل', wed.effective === 1600 && getDayEffectiveTarget(WED) === 1600)
    addFoodToDay({ id: 'h2-wed', nameAr: 'أربعاء', calories: 1800, protein: 90, meal: 'lunch' })
    setFakeToday(THU)
    const before = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
    check('(ح) الخميس يخصم فائض الأربعاء فوق ١٦٠٠ = −٢٠٠', before.carryover === -200)
    // الآن يعدّل المستخدم طعام **الثلاثاء** (أوّل أمس).
    removeEntry('h2-tue')
    const after = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
    check('(ح) هدف الأربعاء المسجَّل لم يُعَد كتابته بأثر رجعي', getDayEffectiveTarget(WED) === 1600)
    check('(ح) وخصم الخميس ثابت — الهدف الذي أكل مقابله لا يتغيّر بعد انقضائه', after.carryover === -200)
  }

  // (ز) هدف محجوب (قاصر/بيانات ناقصة) ⇒ لا ترحيل بتاتًا.
  const blocked = computeDayTargets({ base: 0, date: WED, settings: { enabled: true, enabledAt: MON }, gender: 'unspecified' })
  check('(ز) هدف محجوب ⇒ لا خصم ولا أرضية مفروضة', blocked.carryover === 0 && blocked.effective === 0 && blocked.active === false)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑥ البقاء: إعادة تحميل · تبديل مالك · تصدير/استيراد')
{
  reset(WED, 'user-A')
  setSyncRuntime(null)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(TUE); recordDayTargets(TUE, { base: 2000, effective: 2000 })
  addFoodToDay({ id: 'p-tue', nameAr: 'عشاء', calories: 700, protein: 40, carbs: 60, fat: 25, meal: 'dinner', grams: 350, unit: 'g' })
  setFakeToday(WED)

  // «إعادة تحميل» = قراءة جديدة من نفس التخزين بلا ذاكرة عملية.
  check('بعد إعادة التحميل: الإعداد باقٍ', getCarryoverSettings().enabled === true)
  check('بعد إعادة التحميل: تفصيل الأمس وكميته باقيان', getDayEntries(TUE)[0]?.quantity.grams === 350)

  // مالك آخر لا يرى إعداد الأوّل ولا تاريخه (العزل بالمالك).
  stampDataOwner('user-B')
  check('مالك آخر يبدأ بإعداد مطفأ', getCarryoverSettings().enabled === false)
  check('ولا يرى تاريخ الأوّل', getDayEntries(TUE).length === 0)

  // العودة للمالك الأوّل تستعيد كليهما — «إعادة الدخول لا تفقد شيئًا».
  stampDataOwner('user-A')
  check('العودة للمالك الأول تستعيد الإعداد', getCarryoverSettings().enabled === true)
  check('والعودة تستعيد التاريخ بتفصيله', getDayEntries(TUE)[0]?.quantity.grams === 350)

  // التصدير يحمل الإعداد والتاريخ معًا، والاستيراد يعيدهما.
  setSyncRuntime('user-A', false)
  const bundle = buildExportBundle('user-A')
  check('الحزمة تحمل إعداد الترحيل مع بقية المتاجر', bundle.counts.nutritionCarryover === 1 && bundle.counts.nutritionHistory >= 1)

  ls.removeItem(NUTRITION_CARRYOVER_KEY)
  check('بعد المسح: الإعداد مطفأ', getCarryoverSettings().enabled === false)

  const result = applyImport(bundle, 'user-A', 'user-A')
  check('الاستيراد طبّق متاجر', result.storesApplied > 0)
  check('الاستيراد أعاد الإعداد مشتغلًا بتاريخ سريانه', getCarryoverSettings().enabled === true && getCarryoverSettings().enabledAt === MON)
  check('والتاريخ عاد بكميته', getDayEntries(TUE)[0]?.quantity.grams === 350)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑦ يوم أقدم من الدفتر: مجاميع موسومة بلا تفصيل مُختلَق')
{
  reset(THU)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()
  saveNutritionLog(SUN, { loggedFood: { calories: 1900, protein: 110, carbs: 200, fat: 60 } })
  const stat = getDayNutritionStat(SUN)
  check('اليوم القديم يعود بمجاميعه موسومة تقديرية', stat.source === 'totals' && stat.estimated === true && stat.totals.calories === 1900)
  check('ولا أصناف مُختلَقة له', getDayEntries(SUN).length === 0 && stat.entryCount === 0)
  const none = getDayNutritionStat(MON)
  check('ويوم بلا شيء يعود «لا بيانات» لا صفرًا مُدّعى', none.source === 'none' && none.estimated === false)
  check('حدّ التصفّح يشمل الأيام القديمة ذات المجاميع', earliestNutritionDate() === SUN)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑧ التسجيل في يوم ماضٍ — ولا يتسرّب حرف إلى اليوم')
{
  reset(THU)
  setSyncRuntime(null)
  ensureNutritionHistoryInit()

  // اليوم الحالي فيه قيده الخاص — الشاهد على أنه لم يُمسّ.
  addFoodToDay({ id: 'thu-own', nameAr: 'فطور الخميس', calories: 300, protein: 20, meal: 'breakfast', grams: 150, unit: 'g' })
  const chicken = findFoodItem('chicken-breast-grilled')
  check('عنصر مكتبة جاهز', chicken?.servingGrams === 150)

  // «نسيت أسجّل عشاء الأربعاء» — نفس مسار الكمية القانوني.
  const resolved = chicken ? resolveFoodQuantity(chicken, { grams: 300 }) : null
  check('الكمية تُحسم بنفس الدالّة القانونية', resolved?.status === 'ok' && resolved.quantity.grams === 300)
  let added: ReturnType<typeof addEntryToDay> | null = null
  if (chicken && resolved?.status === 'ok') {
    added = addEntryToDay(WED, {
      id: '', nameAr: chicken.nameAr, calories: resolved.macros.calories, protein: resolved.macros.protein,
      carbs: resolved.macros.carbs, fat: resolved.macros.fat, meal: 'dinner',
      foodId: chicken.id, grams: resolved.quantity.grams, servings: resolved.quantity.servings, unit: 'g',
    })
  }
  check('الإضافة لليوم الماضي نجحت', added?.status === 'ok' && added.date === WED)

  const wed = getDayEntries(WED)
  check('⭐ القيد وقع في الأربعاء', wed.length === 1 && wed[0].meal === 'dinner' && wed[0].quantity.grams === 300)
  check('⭐ والخميس لم يُمسّ — قيده الوحيد كما هو', getDayEntries(THU).length === 1 && getDayEntries(THU)[0].id === 'thu-own')
  check('⭐ ومتجر اليوم الحيّ لم يستقبل شيئًا', loadNutritionDay().date === THU && loadNutritionDay().foods.length === 1 && loadNutritionDay().foods[0].id === 'thu-own')
  check('مجاميع الأربعاء القانونية تحدّثت وحدها', (getNutritionLog(WED)?.loggedFood?.calories ?? 0) === wed[0].macros.calories)
  check('ومجاميع الخميس بقيت على قيدها', (getNutritionLog(THU)?.loggedFood?.calories ?? 0) === 300)
  check('المعرّف مولَّد ولا يصطدم بقيد اليوم', wed[0].id !== 'thu-own' && wed[0].id.length > 0)

  // القيد المضاف للماضي يخضع لنفس عقد التعديل والحذف.
  const edited = editEntry(wed[0].id, { quantity: { grams: 150 } })
  check('يُعدَّل بنفس مسار الكمية', edited.status === 'ok' && getDayEntries(WED)[0].quantity.grams === 150)
  check('والماكروز أُعيد حسابها من المكتبة', getDayEntries(WED)[0].macros.calories === Math.round((chicken?.calories ?? 0) * (150 / 150)))

  // الحدود: لا مستقبل، ولا خارج نافذة الحفظ.
  const future = addEntryToDay(shiftDayStamp(THU, 1), { id: '', nameAr: 'غدًا', calories: 100, protein: 5, meal: 'snack' })
  check('⭐ يوم لم يأتِ يُرفض بسبب مسمّى', future.status === 'rejected' && future.errors[0].code === 'day-out-of-range')
  const ancient = addEntryToDay(shiftDayStamp(THU, -400), { id: '', nameAr: 'قديم', calories: 100, protein: 5, meal: 'snack' })
  check('⭐ يوم خارج نافذة الحفظ يُرفض بدل وعدٍ يختفي', ancient.status === 'rejected' && ancient.errors[0].code === 'day-out-of-range')
  check('ولا الرفضان كتبا شيئًا', getDayEntries(THU).length === 1 && getDayEntries(WED).length === 1)

  // اليوم الحالي عبر نفس الباب يمرّ للكاتب الواحد لا للدفتر مباشرةً.
  const todayAdd = addEntryToDay(THU, { id: 'thu-second', nameAr: 'سناك', calories: 120, protein: 3, meal: 'snack' })
  check('نفس الباب يوجّه اليوم الحالي لكاتب اليوم', todayAdd.status === 'ok' && loadNutritionDay().foods.length === 2)

  // والتسجيل في الماضي يغذّي الترحيل بصدق: الأربعاء صار فوق هدفه.
  reset(THU)
  ensureNutritionHistoryInit()
  setCarryoverEnabled(true, MON)
  setFakeToday(WED); recordDayTargets(WED, { base: 2000, effective: 2000 })
  setFakeToday(THU)
  check('قبل الإضافة: لا خصم على الخميس', computeDayTargets({ base: 2000, date: THU, gender: 'male' }).carryover === 0)
  addEntryToDay(WED, { id: '', nameAr: 'عشاء متأخّر', calories: 2300, protein: 90, meal: 'dinner', grams: 500, unit: 'g' })
  const afterLate = computeDayTargets({ base: 2000, date: THU, gender: 'male' })
  check('⭐ تسجيل متأخّر في الأمس يُحدث خصم اليوم فورًا', afterLate.carryover === -300 && afterLate.sourceDate === WED)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} توحيد التغذية: ${pass} فحصًا · ${fail} فشلًا`)
if (fail > 0) {
  console.log('\nnutrition-canonical-breach:')
  for (const f of failures) console.log(`  · ${f}`)
  process.exit(1)
}
