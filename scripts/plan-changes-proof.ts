// إثبات «وش بيتغيّر؟» — [CTO-71] البند ٥ (تحفّظ غرفتَي الجودة).
//
// `planChanges.ts` كان بلا كاشف رغم أنه يقرّر ما **يقرؤه المستخدم** عن أثر تعديله.
// ثلاث خصائص تُثبَّت هنا:
//   ١ إسقاط المتطابق — الدالة تعيد **فرقًا** لا جدولًا يعيد سرد ما لم يتغيّر.
//   ٢ وسم المشتقّ بسببه — الرقم المحسوب يقول **لماذا** تغيّر باسم المدخل الذي غيّره.
//   ٣ «عدّلته بنفسك» لليدوي — لا تعليل هندسي لقيمة كتبها المستخدم بيده.
//
// وقرار المؤسس المقفل (§8-٣): التعديلات **اقتراح** يُشرح سببه، لا تغيير آلي صامت.

import { buildPlanChanges, changedDrivers } from '@/lib/planChanges'
import { planChangeStrings } from '@/i18n/dict/planChanges'
import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { computeTargets } from '@/lib/calculators'

let pass = 0
const fails: string[] = []
const check = (label: string, ok: boolean) => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ ${label}`) }
}

/**
 * نسخة أساس **حقيقية** من مصنع التطبيق نفسه، لا كائن يدوي.
 * الفرق ليس تجميليًا: أول صياغة هنا كانت كائنًا مختصرًا بلا `workoutPlan`،
 * فسقط الإثبات بـ`TypeError` — سقوطٌ غير مسمّى لا يثبت شيئًا (§4.2). والمصنع
 * الحقيقي يضمن أن ما نفحصه هو الشكل الذي يراه المستخدم فعلًا.
 */
function base(): Customization {
  return getDefaultCustomization()
}

const c = planChangeStrings.ar

console.log('\n① إسقاط المتطابق — فرق لا جدول')
const same = buildPlanChanges(base(), base(), 'ar')
check('نسختان متطابقتان تعطيان صفر صفوف', same.length === 0)
const renamed = base()
renamed.identity = { ...renamed.identity, userName: 'محمد' }
const BASE_NAME = base().identity.userName
const oneRow = buildPlanChanges(base(), renamed, 'ar')
check('تغيير حقل واحد يعطي صفًّا واحدًا لا أكثر', oneRow.length === 1 && oneRow[0].key === 'name')
check('والصفّ يحمل القيمتين قبل وبعد', oneRow[0].before === BASE_NAME && oneRow[0].after === 'محمد')
// تأكيد مضادّ (§4.2): لولا الإسقاط لعادت كل الصفوف — نتحقّق أن الجدول الكامل أكبر فعلًا.
check('التأكيد المضادّ: عدد الصفوف الممكنة أكبر من واحد (الإسقاط فعل شيئًا)', buildPlanChanges(base(), { ...renamed, profile: { ...renamed.profile, weightKg: 88, trainingDays: 5 } } as Customization, 'ar').length > 1)

console.log('\n② وسم المشتقّ بسببه')
const heavier = base()
// الأهداف تُعاد حسابها من الملف كما يفعل التطبيق تمامًا — لا قيمة مدسوسة يدويًا.
// (أول صياغة عدّلت `targets.calories`، و`targetCaloriesFor` لا يقرؤه أصلًا بل
// يقرأ `cuttingCalories`/`bulkingCalories`/`maintenanceCalories` — فكان الفحص
// يمرّ على تغيير لا أثر له. القياس كشفه، لا المراجعة.)
heavier.profile = { ...heavier.profile, weightKg: base().profile.weightKg + 12 }
heavier.targets = computeTargets(heavier.profile)
const derived = buildPlanChanges(base(), heavier, 'ar')
const calorieRow = derived.find((r) => r.key === 'calories')
check('تغيّر الوزن يُنتج صفّ سعرات', !!calorieRow)
check('وسببه يسمّي المدخل الذي غيّره (لا سبب عامّ)', !!calorieRow?.reason && calorieRow.reason.includes(c.driver.weightKg))
check('والسبب ليس «عدّلته بنفسك» لرقم لم يكتبه المستخدم', calorieRow?.reason !== c.manualEdit)
check('changedDrivers يسمّي المدخل بالاسم لا عددًا', changedDrivers(base(), heavier).includes('weightKg'))

console.log('\n③ «عدّلته بنفسك» لليدوي')
const manual = base()
manual.identity = { ...manual.identity, userName: 'سعود' }
const manualRows = buildPlanChanges(base(), manual, 'ar')
check('حقل يكتبه المستخدم بيده سببه «عدّلته بنفسك»', manualRows[0]?.reason === c.manualEdit)
// وحين يتغيّر رقم مشتقّ **بلا** أي مدخل (تحرير مباشر للهدف) يعود للتعليل اليدوي.
const directTarget = base()
const goalField = base().profile.goal === 'cut' ? 'cuttingCalories' : base().profile.goal === 'bulk' ? 'bulkingCalories' : 'maintenanceCalories'
directTarget.targets = { ...directTarget.targets, [goalField]: base().targets[goalField] + 180 }
const directRows = buildPlanChanges(base(), directTarget, 'ar')
const directCalories = directRows.find((r) => r.key === 'calories')
check('رقم مشتقّ تغيّر بلا مدخل ⇒ «عدّلته بنفسك» لا سبب مخترع', directCalories?.reason === c.manualEdit)

console.log('\n④ الصدق: لا سبب يُخترع ولا صفّ بلا قيمتين')
const all = buildPlanChanges(base(), { ...heavier, identity: { ...heavier.identity, userName: 'نورة' } } as Customization, 'ar')
check('كل صفّ يحمل وسمًا وقيمتين', all.every((r) => r.label && r.before !== undefined && r.after !== undefined))
check('ولا صفّ قيمتاه متطابقتان (الإسقاط شامل لا انتقائي)', all.every((r) => r.before !== r.after))
check('وكل سبب إمّا نصّ من القاموس أو null صريح', all.every((r) => r.reason === null || typeof r.reason === 'string'))
check('اللغة الإنجليزية تبني نفس عدد الصفوف (لا فرق سلوك بين اللغتين)', buildPlanChanges(base(), heavier, 'en').length === derived.length)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات «وش بيتغيّر؟»: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
