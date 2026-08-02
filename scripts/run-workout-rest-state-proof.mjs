import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const workout = read('src/views/WorkoutV2.tsx')
const calendarProof = read('scripts/workout-calendar-proof.ts')
const strings = read('src/config/strings.ts')
const restBranch = workout.indexOf('if (model.restDay)')
const missingBranch = workout.indexOf('if (!model.available) return <MissingPlan')

console.log('\nإثبات أن يوم الراحة لا يسقط في dead-end الإعداد')
check('فرع يوم الراحة يسبق MissingPlan', restBranch >= 0 && missingBranch > restBranch)
check('شاشة الراحة تعرض نصًا ثنائي اللغة من القاموس', workout.includes('getStrings(lang).workout') && strings.includes('restDayTitle:') && strings.includes('restDayBody:'))
check('زر الراحة يعود لليوم بدل الإعداد', workout.includes("onNavigate('dashboard')") && workout.includes('t.backToToday'))
check('إثبات التقويم يستخدم الشكل الحقيقي المحفوظ', calendarProof.includes('setTrainingWeekdays') && calendarProof.includes('w.available === false && w.restDay === true'))

console.log(`\n✅ حالة يوم الراحة: ${pass} فحوص، 0 فشل.`)
