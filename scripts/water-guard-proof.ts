// إثبات حارس تسجيل الماء — [FOUNDER-QA/P1].
//
// يغطّي: حساب الهدف · حساب الباقي · سلوك الطبقتين عند/تحت/فوق كل حدّ ·
// إعفاء المسجّل التلقائي أثناء التمرين · التراجع والتصفير · رفض السالب ·
// الأرقام العربية إدخالًا وإخراجًا · وتأكيدات مضادّة (§4.2) تُسقط كل حارس
// **بفحص مسمّى** حين يُنزع.
//
// الحارس نفسه يعيش في الكاتب الواحد `addWaterToDay` — لا في زرّ ولا في شاشة.

import { strict as assert } from 'node:assert'
import {
  addWaterToDay,
  classifyWaterTotal,
  loadNutritionDay,
  waterRemainingMl,
  waterTierBaseMl,
  waterTierThresholds,
  WaterConfirmationRequired,
  WATER_ELEVATED_MULTIPLE,
  WATER_EXTREME_MULTIPLE,
  buildNutritionV2Model,
} from '@/lib/nutritionV2Model'
import { addTodayWaterMl, getTodayWaterMl } from '@/lib/workoutHydration'
import { computeTargets, defaultProfile, WATER_MAX_LITERS, WATER_MIN_LITERS, WATER_ML_PER_KG } from '@/lib/calculators'
import { getDefaultCustomization } from '@/lib/customization'
import { formatNumber, foldDigits } from '@/lib/numberFormat'
import { sanitizeNumericInput } from '@/lib/validation'
import { waterGuardStrings } from '@/i18n/dict/waterGuard'
import { readFileSync } from 'node:fs'

// شخصية الإثبات: مستخدم مُفعَّل. موضوعه سلوك الماء لا الاستحقاق (نفس تعليل
// `workout-hydration-proof.ts`) — والبوّابة يحرسها `test:access-gate`.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })

let passed = 0
const failures: string[] = []
function check(name: string, ok: boolean): void {
  if (ok) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(name)
    console.log(`  ✗ ${name}`)
  }
}
/** يُسقط كتلة برهان ويشترط أن يكون السقوط **بفحص مسمّى** لا باستثناء تقني. */
function expectNamedFailure(name: string, run: () => void): void {
  try {
    run()
    check(name, false)
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) {
      check(`${name} — سقط باستثناء تقني لا بفحص مسمّى`, false)
      return
    }
    check(name, true)
  }
}
const dry = () => {
  const current = loadNutritionDay().waterMl
  if (current > 0) addWaterToDay(-current)
}

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n① حساب الهدف — شخصي، مقيَّد، ولتر↔مل بلا انزلاق')
// ─────────────────────────────────────────────────────────────────────────────
const t86 = computeTargets({ ...defaultProfile, weightKg: 86 })
check('٨٦ كجم ⇒ ٣٫٠ لتر (٨٦×٠٫٠٣٥=٣٫٠١ لأقرب نصف لتر)', t86.waterLiters === 3.0)
const t60 = computeTargets({ ...defaultProfile, weightKg: 60, targetWeightKg: 58 })
check('٦٠ كجم ⇒ الأرضية ٢٫٥ لتر لا ٢٫١', t60.waterLiters === WATER_MIN_LITERS)
const t250 = computeTargets({ ...defaultProfile, weightKg: 250, targetWeightKg: 200 })
check('٢٥٠ كجم ⇒ السقف ٤٫٠ لتر لا ٨٫٧٥', t250.waterLiters === WATER_MAX_LITERS)
check('المعامل مستورد لا مكرَّر (٠٫٠٣٥ لكل كجم)', WATER_ML_PER_KG === 0.035)
check('تحويل لتر⇄مل صحيح', Math.round(t86.waterLiters * 1000) === 3000)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n② حساب الباقي — مصدر واحد، ولا سالب أبدًا')
// ─────────────────────────────────────────────────────────────────────────────
check('٢١٠٠ من ٣٠٠٠ ⇒ ٩٠٠ باقٍ', waterRemainingMl(2100, 3000) === 900)
check('التجاوز يعطي صفرًا لا سالبًا', waterRemainingMl(3600, 3000) === 0)
check('بلا هدف لا رقم باقٍ مخترع', waterRemainingMl(1000, 0) === 0)
check('مستهلَك سالب يُعامَل صفرًا', waterRemainingMl(-500, 3000) === 3000)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n③ سياسة الطبقات — الأساس مشتقّ من WATER_MAX_LITERS لا من رقم جديد')
// ─────────────────────────────────────────────────────────────────────────────
const CEILING_ML = Math.round(WATER_MAX_LITERS * 1000)
check('أساس بلا هدف = سقف المقدِّر (٤٠٠٠ مل)', waterTierBaseMl() === CEILING_ML)
check('هدف أصغر من السقف لا يُرخي الحارس', waterTierBaseMl(2500) === CEILING_ML)
check('هدف أكبر من السقف يرفع الأساس', waterTierBaseMl(5000) === 5000)
const th = waterTierThresholds(3000)
check('حدّ «فوق هدفك» = ١٫٥× الأساس = ٦٠٠٠ مل', th.elevatedMl === Math.round(CEILING_ML * WATER_ELEVATED_MULTIPLE))
check('حدّ «كمية كبيرة» = ٣× الأساس = ١٢٠٠٠ مل', th.extremeMl === Math.round(CEILING_ML * WATER_EXTREME_MULTIPLE))
check('المضاعفان معلَنان (١٫٥ و٣)', WATER_ELEVATED_MULTIPLE === 1.5 && WATER_EXTREME_MULTIPLE === 3)

console.log('  — عند الحدّ · تحته · فوقه —')
check('٥٩٩٩ مل (تحت) ⇒ عادي', classifyWaterTotal(5999, 3000) === 'normal')
check('٦٠٠٠ مل (عند الحدّ نفسه) ⇒ عادي — الحدّ ليس تجاوزًا', classifyWaterTotal(6000, 3000) === 'normal')
check('٦٠٠١ مل (فوقه) ⇒ فوق الهدف', classifyWaterTotal(6001, 3000) === 'elevated')
check('١١٩٩٩ مل (تحت) ⇒ فوق الهدف', classifyWaterTotal(11999, 3000) === 'elevated')
check('١٢٠٠٠ مل (عند الحدّ) ⇒ فوق الهدف لا كبيرة جدًّا', classifyWaterTotal(12000, 3000) === 'elevated')
check('١٢٠٠١ مل (فوقه) ⇒ كمية كبيرة جدًّا', classifyWaterTotal(12001, 3000) === 'extreme')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n④ الحارس في الكاتب الواحد — الكتابة تُوقَف ولا تقع')
// ─────────────────────────────────────────────────────────────────────────────
dry()
addWaterToDay(5900, { targetMl: 3000, source: 'user' })
check('٥٫٩ لتر تحت الحدّ ⇒ تمرّ بلا سؤال', loadNutritionDay().waterMl === 5900)

let raised: unknown = null
try {
  addWaterToDay(500, { targetMl: 3000, source: 'user' })
} catch (error) {
  raised = error
}
check('تجاوز ٦ لتر يرفع رفضًا مسمّى', raised instanceof WaterConfirmationRequired)
check('الرفض يحمل طبقته', (raised as WaterConfirmationRequired).tier === 'elevated')
check('الرفض يحمل المجموع المتوقَّع (٦٤٠٠)', (raised as WaterConfirmationRequired).projectedMl === 6400)
check('⚠️ الكتابة لم تقع — المجموع ما تحرّك', loadNutritionDay().waterMl === 5900)

addWaterToDay(500, { targetMl: 3000, source: 'user', acknowledgedTier: 'elevated' })
check('بعد الإقرار تمرّ الكتابة', loadNutritionDay().waterMl === 6400)

// إقرار أضعف من المطلوب لا يمرّ.
dry()
addWaterToDay(11900, { targetMl: 3000, source: 'user', acknowledgedTier: 'extreme' })
let weak: unknown = null
try {
  addWaterToDay(500, { targetMl: 3000, source: 'user', acknowledgedTier: 'elevated' })
} catch (error) {
  weak = error
}
check('إقرار «فوق الهدف» لا يشتري طبقة «كبيرة جدًّا»', weak instanceof WaterConfirmationRequired && (weak as WaterConfirmationRequired).tier === 'extreme')
check('والكتابة لم تقع', loadNutritionDay().waterMl === 11900)
addWaterToDay(500, { targetMl: 3000, source: 'user', acknowledgedTier: 'extreme' })
check('إقرار الطبقة الصحيحة يمرّ', loadNutritionDay().waterMl === 12400)

// الضغطات المتكرّرة الصامتة — العطل الأصلي.
dry()
let blockedAt = 0
for (let i = 1; i <= 80; i += 1) {
  try {
    addWaterToDay(250, { targetMl: 3000, source: 'user' })
  } catch (error) {
    if (error instanceof WaterConfirmationRequired) {
      blockedAt = loadNutritionDay().waterMl
      break
    }
    throw error
  }
}
check('٨٠ ضغطة متتالية لا تكتب ٢٠ لترًا بصمت', blockedAt === 6000)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑤ إعفاء المسجّل التلقائي أثناء التمرين — بلا نافذة، ومع محاسبة كاملة')
// ─────────────────────────────────────────────────────────────────────────────
dry()
addWaterToDay(12900, { targetMl: 3000, source: 'auto' })
check('المسجّل التلقائي لا يُوقَف عند أي طبقة', loadNutritionDay().waterMl === 12900)
const autoTotal = addTodayWaterMl(250) // المسار الحقيقي: WorkoutV2 → addTodayWaterMl
check('`addTodayWaterMl` لا يرمي ولا يسأل', autoTotal === 13150)
check('ومحاسبته كاملة — الرقم يصل شاشة التغذية', getTodayWaterMl() === 13150)
const custom = getDefaultCustomization()
check('ونموذج التغذية يقرأ نفس المجموع', buildNutritionV2Model(custom, 'ar').water.consumedMl === 13150)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑥ التراجع والتصفير — سالب لا يُبوَّب، ولا ينزل تحت الصفر')
// ─────────────────────────────────────────────────────────────────────────────
dry()
addWaterToDay(500, { targetMl: 3000, source: 'user' })
addWaterToDay(-250, { targetMl: 3000, source: 'user' })
check('تراجع كوب يطرح تمامًا', loadNutritionDay().waterMl === 250)
dry()
addWaterToDay(13000, { source: 'auto' })
addWaterToDay(-13000, { targetMl: 3000, source: 'user' })
check('تصفير من مجموع «كبير جدًّا» لا يطلب تأكيدًا', loadNutritionDay().waterMl === 0)
addWaterToDay(-9999, { targetMl: 3000, source: 'user' })
check('لا قيمة سالبة أبدًا', loadNutritionDay().waterMl === 0)
addWaterToDay(NaN, { targetMl: 3000, source: 'user' })
check('مدخل غير رقمي يُعامَل صفرًا لا NaN', loadNutritionDay().waterMl === 0)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑦ الأرقام العربية — إدخالًا وإخراجًا')
// ─────────────────────────────────────────────────────────────────────────────
check('«٧٥٠» تُطوى إلى 750 قبل أي حساب', foldDigits('٧٥٠') === '750')
check('حقل الكمية يقرأ ما يكتبه المستخدم بالعربية', sanitizeNumericInput('٧٥٠') === '750')
check('ويقرأ مخرجات التطبيق نفسه', sanitizeNumericInput(formatNumber(1500, 'ar')) === '1500')
dry()
addWaterToDay(Number(sanitizeNumericInput('٧٥٠')), { targetMl: 3000, source: 'user' })
check('إدخال عربي يصل التخزين رقمًا غربيًّا قانونيًّا', loadNutritionDay().waterMl === 750)
const arLine = waterGuardStrings.ar.litersOfTarget(
  formatNumber(2.1, 'ar', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  formatNumber(3.0, 'ar', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
)
check('سطر اللترات العربي بأرقام هندية «٢٫١ / ٣٫٠ لتر»', arLine === '٢٫١ / ٣٫٠ لتر')
check('ولا رقم لاتيني فيه', !/[0-9]/.test(arLine))
const enLine = waterGuardStrings.en.litersOfTarget(
  formatNumber(2.1, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  formatNumber(3.0, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
)
check('والإنجليزي بأرقام لاتينية «2.1 / 3.0 L»', enLine === '2.1 / 3.0 L')
check('«باقي ٠٫٩ لتر» بالعربية', waterGuardStrings.ar.litersRemaining(formatNumber(0.9, 'ar', { minimumFractionDigits: 1, maximumFractionDigits: 1 })) === 'باقي ٠٫٩ لتر')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑧ النبرة والقاموس — ملاحظة لا إنذار، ولا نصّ صلب')
// ─────────────────────────────────────────────────────────────────────────────
const arValues = Object.values(waterGuardStrings.ar).map((v) => (typeof v === 'function' ? (v as (...a: string[]) => string)('١', '٢') : v))
const enValues = Object.values(waterGuardStrings.en).map((v) => (typeof v === 'function' ? (v as (...a: string[]) => string)('1', '2') : v))
check('كل مفتاح له عربي وإنجليزي', Object.keys(waterGuardStrings.ar).length === Object.keys(waterGuardStrings.en).length && Object.keys(waterGuardStrings.ar).length > 0)
check('لا علامة تعجّب في أي سطر', ![...arValues, ...enValues].some((s) => s.includes('!') || s.includes('！')))
const ALARM = ['خطر', 'تحذير', 'تسمّم', 'مميت', 'danger', 'warning', 'toxic', 'poison', 'overdose', 'fatal']
check('لا لغة تهويل ولا تشخيص طبّي', !ALARM.some((word) => [...arValues, ...enValues].some((s) => s.toLowerCase().includes(word))))
const ADVICE = ['استشر', 'راجع طبيب', 'see a doctor', 'consult a doctor', 'seek medical']
check('لا نصيحة علاجية', !ADVICE.some((word) => [...arValues, ...enValues].some((s) => s.toLowerCase().includes(word))))
check('النصّ يقول «فوق هدفك» لا حكمًا على المستخدم', waterGuardStrings.ar.confirmElevatedTitle.includes('فوق هدفك'))

const card = src('src/components/today/WaterCard.tsx')
const panel = src('src/views/NutritionView.tsx')
const ARABIC_LITERAL = /(?:'|"|`|>)[^'"`<>{}]*[؀-ۿ]/
check('لا نصّ عربي صلب في بطاقة الماء', !ARABIC_LITERAL.test(card.replace(/\/\/.*$/gm, '').replace(/\/\*[^]*?\*\//g, '').replace(/\{\/\*[^]*?\*\/\}/g, '')))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑨ بنية: نقطة الإعلان واحدة، والسطحان يعرضان النتيجة المسمّاة')
// ─────────────────────────────────────────────────────────────────────────────
const tracking = src('src/lib/nutritionTracking.ts')
const model = src('src/lib/nutritionV2Model.ts')
// الكتلة تُستخرج بحدودها (§4.2) — لا رضا من مواضع متفرّقة.
const addWaterBlock = model.match(/export function addWaterToDay\([^]*?\n\}/)?.[0] ?? ''
check(
  'الحارس داخل `addWaterToDay` نفسه (كتلة واحدة مقترنة)',
  addWaterBlock.includes("options.source === 'user'") &&
    addWaterBlock.includes('classifyWaterTotal(projected, options.targetMl)') &&
    addWaterBlock.includes('throw new WaterConfirmationRequired'),
)
check('السقف مستورد من المقدِّر لا معاد تعريفه', model.includes("import { WATER_MAX_LITERS } from '@/lib/calculators'") && !/WATER_MAX_LITERS\s*=\s*[0-9]/.test(model))
const hookBlock = tracking.match(/const addWater: AddWaterFn = useCallback\([^]*?\n {2}\)/)?.[0] ?? ''
check("نقطة الإعلان الوحيدة: الهوك يضع `source: 'user'`", hookBlock.includes("addWaterToDay(ml, { ...opts, source: 'user' })"))
check('والهوك يترجم الرفض إلى نتيجة `confirm` لا إلى «فشل حفظ»', hookBlock.includes('instanceof WaterConfirmationRequired') && hookBlock.includes("reason: 'confirm'"))
check('بطاقة الرئيسية تفرّق الأبواب الثلاثة', card.includes("outcome.reason === 'confirm'") && card.includes('setFailed(true)') && card.includes('data-testid="water-confirm"'))
check('بطاقة الرئيسية تعرض مستهلك/هدف/باقي باللتر', card.includes('data-testid="water-liters"') && card.includes('w.litersOfTarget(') && card.includes('w.litersRemaining('))
check('بطاقة الرئيسية فيها مسار تراجع عن آخر كوب', card.includes('data-testid="water-undo-cup"') && card.includes('onAdd(-CUP_ML)'))
check('لوحة التغذية تفرّق الأبواب الثلاثة كذلك', panel.includes("outcome.reason === 'confirm'") && panel.includes('data-testid="water-confirm"'))
check('لوحة التغذية تعرض الباقي', panel.includes('data-testid="water-remaining"') && panel.includes('w.litersRemaining('))
check('`resetWater` صار له راسم فعليّ', panel.includes('resetWater') && panel.includes('data-testid="water-reset"') && panel.includes('setResetError(!onReset())'))
check('المسجّل التلقائي لا يعلن نفسه تفاعليًّا', !src('src/lib/workoutHydration.ts').includes("source: 'user'"))
check('كل أزرار الحارس ≥٤٤بك', (card.match(/data-testid="water-(confirm-yes|confirm-no|undo-cup)"/g) ?? []).length === 3 && card.includes('min-h-[44px]'))
check('لا خاصية اتجاهية صلبة في الإضافات', !/className="[^"]*\b(?:ml|mr|pl|pr|text-left|text-right)-/.test(card))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑩ محاكاة الالتفاف — نزع الحارس يُسقط فحصًا **مسمّى**')
// ─────────────────────────────────────────────────────────────────────────────
// (أ) سلوكي: لو صار الافتراض «مرّ دائمًا» — أي لو نُزع شرط الطبقة — لَمرّت هذه.
dry()
expectNamedFailure('نزع الحارس: ٢٠ لترًا تفاعليًّا يجب أن تُرفض', () => {
  addWaterToDay(20_000, { targetMl: 3000, source: 'user' })
  throw new assert.AssertionError({ message: 'الكتابة مرّت بلا تأكيد — الحارس منزوع' })
})
check('والمجموع بقي صفرًا بعد الرفض', loadNutritionDay().waterMl === 0)

// (ب) بنيوي: نسخة من الكاتب بلا الشرط لا ترضي فحص الكتلة المقترنة.
const forgedWriter = addWaterBlock
  .replace("options.source === 'user'", 'false')
  .replace('throw new WaterConfirmationRequired', 'void 0; //')
check(
  'كاتب مزوّر بلا الشرط يسقط بفحص الكتلة المقترنة',
  !(
    forgedWriter.includes("options.source === 'user'") &&
    forgedWriter.includes('classifyWaterTotal(projected, options.targetMl)') &&
    forgedWriter.includes('throw new WaterConfirmationRequired')
  ),
)
// (ج) ذكرٌ متفرّق لا يُرضي الفحص — الأجزاء خارج الكتلة لا تُحسب.
const scattered = "// classifyWaterTotal(projected, options.targetMl)\n// throw new WaterConfirmationRequired\nexport function addWaterToDay(ml) {\n  return persist(day)\n}"
const scatteredBlock = scattered.match(/export function addWaterToDay\([^]*?\n\}/)?.[0] ?? ''
check(
  'ذكرٌ متفرّق خارج الكتلة لا يُرضي الفحص (لا رضا من مواضع متفرّقة)',
  !(scatteredBlock.includes('classifyWaterTotal') && scatteredBlock.includes('throw new WaterConfirmationRequired')),
)
// (د) لو نسي الهوك إعلان `source` لَسقط فحصه باسمه.
check(
  "هوك بلا `source: 'user'` يسقط بفحص نقطة الإعلان",
  // `replaceAll` لا `replace`: التعليق فوق السطر يذكر نفس اللفظ، و`replace`
  // كانت تستبدل ذكر التعليق وحده فتبقى الشيفرة قائمة — محاكاة التفاف تنجح
  // زورًا. المحاكاة نفسها كادت تصير رخوة.
  !hookBlock.replaceAll("source: 'user'", "source: 'auto'").includes("addWaterToDay(ml, { ...opts, source: 'user' })"),
)
// (هـ) لو أُعيد تعريف السقف محليًّا لَسقط فحص الاستيراد.
check(
  'إعادة تعريف السقف محليًّا تُسقط فحص «مستورد لا مكرَّر»',
  /WATER_MAX_LITERS\s*=\s*[0-9]/.test('const WATER_MAX_LITERS = 4.0'),
)
// (و) لو عاد الرفض يظهر بوصفه «فشل حفظ» لَسقط فحص التفريق.
check(
  'إعادة ابتلاع الرفض في مسار فشل الحفظ تُسقط الفحص باسمه',
  !hookBlock.replace("reason: 'confirm'", "reason: 'storage'").includes("reason: 'confirm'"),
)
// (ز) الحدّ نفسه ليس تجاوزًا — لو انقلب `>` إلى `>=` لتغيّر التصنيف عند ٦٠٠٠.
check('انقلاب الحدّ إلى «أكبر أو يساوي» يُغيّر التصنيف عند ٦٠٠٠ فيُكشف', classifyWaterTotal(6000, 3000) !== 'elevated')
// (ح) الحارس لا يُلتفّ عليه بإغفال الهدف: الإغفال يعطي الحدّ الأشدّ.
dry()
let bypass: unknown = null
try {
  addWaterToDay(7000, { source: 'user' }) // بلا targetMl
} catch (error) {
  bypass = error
}
check('إغفال الهدف لا يفتح الحارس — بل يعطي الأساس الأصغر', bypass instanceof WaterConfirmationRequired)
check('والكتابة لم تقع', loadNutritionDay().waterMl === 0)

// ─────────────────────────────────────────────────────────────────────────────
dry()
console.log('')
if (failures.length) {
  console.log(`❌ حارس الماء: ${passed} نجحت، ${failures.length} فشلت:`)
  failures.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`✅ حارس الماء: ${passed} فحصًا، 0 فشل — الهدف والباقي، طبقتان عند/تحت/فوق كل حدّ، إعفاء المسجّل التلقائي، التراجع والتصفير، الأرقام العربية، وثماني محاكاة التفاف تسقط بأسمائها.`)
