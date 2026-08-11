// إثبات توحيد المخازن — مصدر حقيقة واحد لكل معلومة، اشتراكات بدل tick،
// هجرة v1 idempotent لا تفقد بيانات، ولا ازدواج في الماء أو القياسات.

import { strict as assert } from 'node:assert'
import {
  addFoodToDay,
  addWaterToDay,
  getNutritionDaySnapshot,
  loadNutritionDay,
  removeFoodFromDay,
  subscribeNutritionDay,
} from '@/lib/nutritionV2Model'
import { NUTRITION_TODAY_KEY, loadNutritionToday } from '@/lib/nutritionTracking'
import { getMeasurementLogs, getNutritionLog, getWaterLogs, saveMeasurementLog, saveNutritionLog } from '@/lib/historyStore'
import { loadLogs } from '@/lib/measurementLog'
import { isMigrationDone } from '@/lib/dataOwnership'
import { getDayStamp } from '@/lib/today'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}
const ls = globalThis.localStorage
const today = getDayStamp()

console.log('\n① هجرة v1→v2: تحفظ البيانات القديمة ولا تعمل مرتين')
ls.clear()
ls.setItem('qimmah:history:migrated:v1', 'done')
// بذر بيانات v1 ليوم اليوم (الشكل القديم: label/log)
ls.setItem(NUTRITION_TODAY_KEY, JSON.stringify({ date: today, doneMeals: { b: true }, waterMl: 500, log: [{ id: 'f1', label: 'كبسة', calories: 600, protein: 35, meal: 'lunch' }] }))
const migrated = loadNutritionDay() // أول قراءة تُهاجر
check('البيانات القديمة لم تضع: الصنف وصل للمصدر القانوني', migrated.foods.length === 1 && migrated.foods[0].nameAr === 'كبسة')
check('الماء القديم وصل', migrated.waterMl === 500)
check('مفتاح v1 حُذف بعد نجاح مثبت', ls.getItem(NUTRITION_TODAY_KEY) === null)
check('سجل الهجرة موثَّق', isMigrationDone('nutrition-unify-v1-to-v2'))
// إعادة بذر v1 ثم قراءة ثانية — يجب ألّا تُستورد (idempotent، لا re-run)
ls.setItem(NUTRITION_TODAY_KEY, JSON.stringify({ date: today, doneMeals: {}, waterMl: 9999, log: [{ id: 'ghost', label: 'شبح', calories: 1, protein: 1 }] }))
const second = loadNutritionDay()
check('الهجرة لا تُعاد: بذرة v1 الجديدة تُتجاهل', second.waterMl === 500 && !second.foods.some((f) => f.id === 'ghost'))
ls.removeItem(NUTRITION_TODAY_KEY)

console.log('\n② قارئان يحصلان على القيمة نفسها (الماء — لا ازدواج)')
addWaterToDay(250) // 500 + 250
const viaV2 = loadNutritionDay().waterMl
const viaAdapter = loadNutritionToday().waterMl
const viaWaterLog = getWaterLogs()[today]?.waterMl
check('v2 == adapter == waterLog == 750', viaV2 === 750 && viaAdapter === 750 && viaWaterLog === 750)
check('كاتب v1 ميت: المفتاح القديم لم يُكتب', ls.getItem(NUTRITION_TODAY_KEY) === null)

console.log('\n③ تحديث المتجر يصل المشتركين (لا tick يدوي)')
let fired = 0
const unsub = subscribeNutritionDay(() => {
  fired++
})
const snapBefore = getNutritionDaySnapshot()
check('اللقطة مستقرة المرجع بين القراءات', getNutritionDaySnapshot() === snapBefore)
addFoodToDay({ id: 'f2', nameAr: 'تمر', calories: 100, protein: 1, meal: 'snack' })
check('المشترك أُشعر عند الكتابة', fired >= 1)
check('اللقطة تجدّدت بعد الكتابة', getNutritionDaySnapshot() !== snapBefore && getNutritionDaySnapshot().foods.length === 2)
removeFoodFromDay('f2')
check('الحذف يعمل ويُشعر', getNutritionDaySnapshot().foods.length === 1 && fired >= 2)
unsub()

console.log('\n④ doneMeals عبر المصدر الدائم (historyStore) يظهر في المحوّل')
saveNutritionLog(today, { doneMeals: { breakfast: true, lunch: true } })
check('المحوّل يقرأ doneMeals من historyStore', loadNutritionToday().doneMeals.lunch === true)

console.log('\n⑤ القياسات — مصدر واحد بلا ازدواج')
saveMeasurementLog({ id: 'm1', date: today, values: { weightKg: 80 } })
saveMeasurementLog({ id: 'm1', date: today, values: { weightKg: 81 } }) // نفس المعرّف = تحديث لا تكرار
const viaHistory = getMeasurementLogs()
const viaWrapper = loadLogs()
check('نفس المعرّف لا يتكرر (تحديث في المكان)', viaHistory.filter((m) => m.id === 'm1').length === 1)
check('القيمة الأحدث هي المحفوظة', Number(viaHistory.find((m) => m.id === 'm1')?.values.weightKg) === 81)
check('القارئان متطابقان (wrapper == historyStore)', JSON.stringify(viaWrapper) === JSON.stringify(viaHistory))
check('التغذية اليومية الدائمة تحمل المجاميع (mirror واحد)', (getNutritionLog(today)?.loggedFood?.calories ?? 0) >= 600)

console.log(`\n✅ إثبات توحيد المخازن — ${pass} فحصًا.`)
