// إثبات سلوكي لخطوات اليوم اليدوية — [R4-UX-STEPS].
//
// يقود `writeSteps`/`writeStepGoal` فوق تخزين مُحاكى ليثبت ثلاثة أشياء لا يمكن
// لفحص نصّي أن يثبتها: أن الكتابة **تُفصح عن فشلها**، وأن الفشل **لا يمسح** ما
// كان محفوظًا، وأن حدث التحديث يُطلق عند النجاح **وحده** (فلا يُعاد رسم سطح على
// كتابة لم تقع).

import { getStepSource, getSteps, loadStepGoal, stepEntryMode, writeStepGoal, writeSteps, STEPS_UPDATED_EVENT } from '@/lib/stepCounter'
import { sanitizeNumericInput } from '@/lib/validation'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) } else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}

const ls = globalThis.localStorage
const win = globalThis.window as unknown as {
  __events: string[]
  __failNextWrites: string | null
}

console.log('\n① الإدخال اليدوي يصل التخزين ويُعلن نفسه')
win.__events.length = 0
const first = writeSteps(8000)
check('كتابة ٨٠٠٠ خطوة تنجح وتُرجع القيمة المقصوصة', first.ok && first.reason === 'ok' && first.steps === 8000)
check('القراءة اللاحقة تُرجع نفس الرقم', getSteps() === 8000)
check('المصدر المسجَّل «يدوي» لا مخترَعًا', getStepSource() === 'manual')
check('حدث التحديث أُطلق مرّة واحدة', win.__events.filter((e) => e === STEPS_UPDATED_EVENT).length === 1)

console.log('\n② الهدف اليومي اختياري ومقصوص بحدود معقولة')
check('هدف ١٢٠٠٠ يُحفظ كما هو', writeStepGoal(12000).ok && loadStepGoal() === 12000)
check('هدف ٥٠ يُرفع للحدّ الأدنى ١٠٠٠ (لا هدف مستحيل الفشل)', writeStepGoal(50).steps === 1000 && loadStepGoal() === 1000)
check('هدف ٥٠٠٠٠٠ يُقصّ للحدّ الأعلى ١٠٠٠٠٠', writeStepGoal(500000).steps === 100000 && loadStepGoal() === 100000)

console.log('\n③ الأرقام العربية-الهندية تصل سليمة (لا `type="number"`)')
check('«٨٠٠٠» تُطوى إلى 8000', sanitizeNumericInput('٨٠٠٠') === '8000')
check('«١٢٬٥٠٠» بفاصل الآلاف العربي تُطوى إلى 12500', sanitizeNumericInput('١٢٬٥٠٠') === '12500')
check('«۹٥۰۰» بالمحارف الفارسية تُطوى كذلك', sanitizeNumericInput('۹٥۰۰') === '9500')
writeStepGoal(10000)
const arabicWrite = writeSteps(Number(sanitizeNumericInput('٤٬٢٠٠')))
check('ما يُكتب بالعربية يُحفظ رقمًا صحيحًا', arabicWrite.ok && getSteps() === 4200)

console.log('\n④ فشل التخزين يُقال ولا يُبتلع — ولا يمسح ما كان')
win.__events.length = 0
win.__failNextWrites = 'QuotaExceededError'
const failed = writeSteps(9999)
win.__failNextWrites = null
check('الكتابة تُرجع ok=false', !failed.ok)
check('السبب مسمّى «quota» لا رسالة عامّة', failed.reason === 'quota')
check('الرقم السابق ما زال محفوظًا (لا مسح على فشل)', getSteps() === 4200)
check('لا حدث تحديث على كتابة لم تقع', win.__events.filter((e) => e === STEPS_UPDATED_EVENT).length === 0)

win.__failNextWrites = 'SecurityError'
const blocked = writeSteps(7000)
win.__failNextWrites = null
check('التخزين المحجوب يُصنَّف «unavailable» لا «quota»', !blocked.ok && blocked.reason === 'unavailable')

console.log('\n⑤ بناء الويب لا يدّعي قراءة تلقائية')
check('وضع الإدخال على الويب `manual-only`', stepEntryMode() === 'manual-only')

console.log('\n⑥ الصفر يمسح اليوم بدل أن يُخزَّن رقمًا كاذبًا')
check('كتابة ٠ تحذف قيد اليوم', writeSteps(0).ok && getSteps() === 0)
check('وتحذف مصدره معه (لا سجلّ بلا مصدر)', ls.getItem('qimmah:stepSource:v1') === '{}')

if (fail > 0) {
  console.log(`\n❌ خطوات اليوم (سلوكي): ${pass} نجحت، ${fail} فشلت.`)
  process.exit(1)
}
console.log(`\n✓ خطوات اليوم (سلوكي): ${pass} فحصًا، 0 فشل.`)
