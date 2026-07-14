import { calculatePlateLoad } from '@/lib/plates'
import { derivePersonalRecordEvents, personalRecordCount } from '@/lib/personalRecords'
import { detectSessionPRs } from '@/lib/exerciseHistory'
import { buildProgressV2Model } from '@/lib/progressV2Model'
import { buildProfileV2Model } from '@/lib/profileV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import { wipeUserData } from '@/lib/accountScope'
import type { SessionExercise, WorkoutSession } from '@/lib/workoutSessions'

let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; console.log(`  ✗ FAIL: ${label}`) }
}

const exercise = (weightKg: number): SessionExercise => ({
  exerciseId: 'bench-press', exerciseNameAr: 'بنش برس', exerciseNameEn: 'Bench press',
  targetSets: 1, targetReps: '5', targetRestSec: 90, completed: true,
  sets: [{ setNumber: 1, targetReps: '5', actualReps: '5', weightKg: String(weightKg), completed: true }],
})
const session = (id: string, date: string, weightKg: number): WorkoutSession => ({
  id, date, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T11:00:00.000Z`,
  workoutDayId: 'push', workoutDayName: 'دفع', exercises: [exercise(weightKg)],
})
const sessions = [
  session('baseline', '2026-06-01', 80), session('equal', '2026-06-03', 80),
  session('lower', '2026-06-05', 77.5), session('pr-one', '2026-06-07', 82.5), session('pr-two', '2026-06-09', 85),
]

console.log('\n① حاسبة الأقراص — تركيب حقيقي لا تخمين')
const exact = calculatePlateLoad(100, 20)
check('100 كجم على بار 20 = تركيب مطابق', exact.status === 'ready' && exact.exact && exact.loadedKg === 100)
check('كل جهة تحمل 40 كجم', exact.status === 'ready' && exact.perSideKg === 40)
const nonGreedy = calculatePlateLoad(80, 20, [15])
check('الخوارزمية تجد 15+15 لكل جهة بدل فشل greedy', nonGreedy.status === 'ready' && nonGreedy.exact && nonGreedy.pairs[0]?.countPerSide === 2)
const nearest = calculatePlateLoad(103, 20, [20, 10, 5, 2.5, 1.25])
check('الوزن غير القابل للتركيب يرجع أقرب وزن أقل', nearest.status === 'ready' && !nearest.exact && nearest.loadedKg === 102.5 && nearest.differenceKg === 0.5)
check('لا تتجاوز الحاسبة الهدف', nearest.status === 'ready' && nearest.loadedKg <= nearest.targetKg)
const belowBar = calculatePlateLoad(15, 20)
check('هدف أخف من البار يُرفض', belowBar.status === 'error' && belowBar.error === 'belowBar')
const noPlates = calculatePlateLoad(40, 20, [])
check('غياب الأقراص يُرفض عندما نحتاجها', noPlates.status === 'error' && noPlates.error === 'noPlates')
const emptyBar = calculatePlateLoad(20, 20, [])
check('البار الفارغ نتيجة صالحة', emptyBar.status === 'ready' && emptyBar.exact && emptyBar.pairs.length === 0)

console.log('\n② سجل PR — baseline لا يُحسب')
const events = derivePersonalRecordEvents(sessions)
check('أول وزن ليس PR', !events.some((event) => event.sessionId === 'baseline'))
check('الوزن المساوي أو الأقل ليس PR', !events.some((event) => event.sessionId === 'equal' || event.sessionId === 'lower'))
check('تحسينان فقط = حدثان', events.length === 2)
check('الأحدث أولًا', events[0]?.weightKg === 85 && events[1]?.weightKg === 82.5)
check('يحفظ السابق ومقدار التحسن', events[0]?.previousBestKg === 82.5 && events[0]?.improvementKg === 2.5)
check('المعرّفات حتمية وفريدة', new Set(events.map((event) => event.id)).size === events.length && events.every((event) => event.id.includes(event.sessionId)))
check('كاشف الإنهاء يرفض baseline بلا سجل سابق', !detectSessionPRs({}, exercise(80)))
check('كاشف الإنهاء يقبل تحسنًا فوق سجل سابق', detectSessionPRs({ 'bench-press': { bestWeight: '80' } }, exercise(82.5)))

console.log('\n③ Progress/Profile يقرآن الجلسات القانونية نفسها')
globalThis.localStorage.clear()
globalThis.localStorage.setItem('qimmah:history:migrated:v1', 'done')
globalThis.localStorage.setItem('qimmah:history:workoutSessions:v1', JSON.stringify(sessions))
globalThis.localStorage.setItem('qimmah:history:exerciseHistory:v1', JSON.stringify({ 'bench-press': { bestWeight: '85', lastWeight: '85' } }))
globalThis.localStorage.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: {}, proteinDays: [], prCount: 99 }))
const customization = getDefaultCustomization()
const progress = buildProgressV2Model(customization, 'ar')
const profile = buildProfileV2Model(customization, { displayName: 'زياد', email: null, signedIn: false }, 'ar')
check('Progress يعرض حدثي PR الحقيقيين', progress.strength.prEvents.length === 2)
check('آخر سُلّم مصنّف رقمًا قياسيًا', progress.strength.lifts[0]?.status === 'pr')
check('Profile لا يثق بعدّاد إنجازات متضخم', profile.stats.prCount === 2)
check('القارئ القانوني يعيد العدد نفسه', personalRecordCount() === 2)

console.log('\n④ عزل الحساب — لا مفتاح PR ثانٍ')
wipeUserData('owner-a')
check('المسح يزيل مصدر الجلسات فتختفي أحداث A', personalRecordCount() === 0)
check('لا يُنشأ مفتاح تخزين خاص بالأرقام القياسية', Array.from({ length: globalThis.localStorage.length }, (_, index) => globalThis.localStorage.key(index)).every((key) => !key?.includes('personalRecords')))

console.log(`\n${'─'.repeat(52)}`)
if (fail === 0) console.log(`✅ نجحت كل فحوص الأقراص والأرقام القياسية — ${pass} فحصًا.`)
else { console.log(`❌ فشل ${fail} من ${pass + fail}.`); process.exit(1) }
