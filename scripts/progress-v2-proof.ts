// Proof for the PDF §05 data path: cloud-hydrated canonical measurements must
// feed Progress, a new log must persist through historyStore, and Profile must
// count actual PR events rather than treating every exercise baseline as a PR.

import { getDefaultCustomization } from '@/lib/customization'
import { getMeasurementLogs } from '@/lib/historyStore'
import { addLog, loadLogs } from '@/lib/measurementLog'
import { buildProfileV2Model } from '@/lib/profileV2Model'
import { buildProgressV2Model } from '@/lib/progressV2Model'
import { getDayStamp } from '@/lib/today'

let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const day = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return getDayStamp(date)
}

console.log('\n① القياسات السحابية → مصدر الحقيقة → التقدّم')
globalThis.localStorage.clear()
globalThis.localStorage.setItem('qimmah:history:migrated:v1', 'done')
globalThis.localStorage.setItem('qimmah:history:measurementLogs:v1', JSON.stringify([
  { id: 'cloud-new', date: day(0), values: { weightKg: 78, waistCm: 86, bodyFatPercent: 18 } },
  { id: 'cloud-old', date: day(-10), values: { weightKg: 79, waistCm: 87 } },
]))
check('لا يوجد مفتاح قياسات قديم في الجهاز', globalThis.localStorage.getItem('qimmah:measurementLogs:v1') === null)
check('loadLogs يقرأ السجل القانوني الذي يملؤه hydrate', loadLogs().length === 2)

const customization = getDefaultCustomization()
customization.profile.goal = 'cut'
customization.profile.weightKg = 80
customization.profile.targetWeightKg = 75
const progress = buildProgressV2Model(customization, 'ar')
check('الوزن الحالي يأتي من السجل لا من fallback الملف', progress.weight.currentKg === 78)
check('الاتجاه يضم نقطتين حقيقيتين', progress.weight.series.length === 2)
check('تغيّر الوزن محسوب بصدق', progress.weight.changeKg === -1)
check('لغة الخلاصة متحوّطة بـ «شكلك/شكله»', progress.headline.startsWith('شكل') || progress.headline.startsWith('نحتاج بيانات'))
check('نسبة الدهون موسومة كبيان حقيقي تقديري', progress.weight.bodyFatPct === 18)

console.log('\n② تسجيل اليوم → التاريخ القانوني')
addLog({ id: 'local-today', date: day(0), values: { weightKg: 77.5, waistCm: 85.5 } })
check('السجل الجديد في مقدمة historyStore', getMeasurementLogs()[0]?.id === 'local-today')
check('قارئ Progress يرى السجل فورًا', loadLogs()[0]?.values.weightKg === 77.5)
check('لا تُنشأ نسخة جديدة في المفتاح المتقاعد', globalThis.localStorage.getItem('qimmah:measurementLogs:v1') === null)

console.log('\n③ الملف التدريبي يعدّ PR المحقّق فقط')
globalThis.localStorage.setItem('qimmah:history:exerciseHistory:v1', JSON.stringify({
  'bench-press': { bestWeight: '80' },
  deadlift: { bestWeight: '120' },
  squat: { bestWeight: '100' },
}))
globalThis.localStorage.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: {}, proteinDays: [], prCount: 1 }))
const profile = buildProfileV2Model(customization, { displayName: 'أحمد', email: null, signedIn: false }, 'ar')
check('ثلاثة baselines لا تتحول إلى ثلاثة PRs', profile.stats.prCount === 1)

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص مسار التقدّم نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
