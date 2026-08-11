// إثبات بذرة العرض — يتحقّق أن كل بروفايل يُنتج أشكال متاجر يقرؤها التطبيق فعليًا
// (عبر المُحمِّلات الحقيقية من src/lib — قراءة فقط)، وأن إعادة البذر حتمية (idempotent).
// يعمل فوق localStorage مُحاكى (banner في المُشغّل) بلا متصفح ولا شبكة ولا Supabase.

import { buildSeed, type SeedProfile } from './demo-seed'
import { getWorkoutSessions, getMeasurementLogs, getNutritionLog, getWaterLogs, getDailyLogs } from '@/lib/historyStore'
import { loadLogs } from '@/lib/measurementLog'
import { loadAchievementState } from '@/features/achievements/engine'
import { loadNutritionDay } from '@/lib/nutritionV2Model'
import { getDayStamp } from '@/lib/today'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


let pass = 0
let fail = 0
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  ✓ ${label}`) } else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}

const NOW = 1_783_900_000_000 // طابع ثابت لاختبار الحتمية
const store = globalThis.localStorage

function applySeed(map: Record<string, string>): void {
  store.clear()
  for (const [k, v] of Object.entries(map)) store.setItem(k, v)
}

// ① الحتمية / idempotency — نفس (البروفايل، nowMs) ⇒ نفس الخريطة تمامًا.
console.log('\n① الحتمية (idempotent)')
for (const p of ['reviewer', 'fresh', 'veteran'] as SeedProfile[]) {
  const a = JSON.stringify(buildSeed({ profile: p, nowMs: NOW }))
  const b = JSON.stringify(buildSeed({ profile: p, nowMs: NOW }))
  check(`${p}: إعادة البذر تُنتج نفس الخريطة`, a === b)
}

// ② أشكال المتاجر التي يقرؤها التطبيق (المُحمِّلات الحقيقية لا ترمي وتعيد أنواعًا صحيحة).
function validateProfile(p: SeedProfile, nowMs: number): void {
  applySeed(buildSeed({ profile: p, nowMs }))
  const sessions = getWorkoutSessions()
  const meas = loadLogs()
  const measHist = getMeasurementLogs()
  const ach = loadAchievementState()
  const today = getDayStamp()
  const nut = getNutritionLog(today)
  const water = getWaterLogs()
  const daily = getDailyLogs()
  const nutV2 = loadNutritionDay()

  console.log(`\n② بروفايل «${p}»`)
  // كل جلسة بشكل صالح (id/date/تمارين بمجموعات).
  const sessionsValid = sessions.every((s) => typeof s.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Array.isArray(s.exercises) && s.exercises.every((e) => typeof e.exerciseId === 'string' && Array.isArray(e.sets)))
  check('الجلسات تُقرأ بشكل صالح (getWorkoutSessions)', sessionsValid)
  check('قياسات الوزن تُقرأ من المتجر القانوني', Array.isArray(meas) && meas.every((m) => typeof m.date === 'string' && !!m.values))
  check('قياسات المتجر الدائم متطابقة (historyStore)', measHist.length === meas.length)
  check('حالة الإنجازات بشكل صالح', ach && typeof ach.prCount === 'number' && ach.unlocked && typeof ach.unlocked === 'object')
  check('سجلّات الماء واللقطات اليومية كائنات', water && typeof water === 'object' && daily && typeof daily === 'object')

  if (p === 'fresh') {
    check('fresh: لا جلسات (مستخدم جديد)', sessions.length === 0)
    check('fresh: لا إنجازات مفتوحة', Object.keys(ach.unlocked).length === 0)
  } else {
    check(`${p}: جلسات مؤرّخة موجودة`, sessions.length > 0)
    check(`${p}: سجل أداء يُنتج قوة/أرقام قياسية`, sessions.some((s) => s.exercises.some((e) => (e.sets ?? []).some((x) => Number(x.weightKg) > 0))))
    check(`${p}: اتجاه وزن (≥ نقطتين)`, meas.filter((m) => m.values.weightKg !== undefined).length >= 2)
    check(`${p}: تغذية اليوم موجودة (ركيزة اليوم ستتحرّك)`, !!nut && !!nut.loggedFood && (nut.loggedFood.calories ?? 0) > 0)
    check(`${p}: أطعمة سعودية في سجلّ v2`, nutV2.foods.length > 0)
    check(`${p}: رقم قياسي واحد على الأقل`, ach.prCount >= 1)
  }
}

for (const p of ['reviewer', 'fresh', 'veteran'] as SeedProfile[]) validateProfile(p, Date.now())

// ③ الأمان: البذرة لا تكتب رمز جلسة Supabase (لا تلمس الحسابات الحقيقية).
console.log('\n③ الأمان (لا مساس بالحسابات)')
for (const p of ['reviewer', 'fresh', 'veteran'] as SeedProfile[]) {
  const map = buildSeed({ profile: p, nowMs: NOW })
  check(`${p}: لا يكتب qimmah:supabase-auth (لا يلمس الجلسة)`, !('qimmah:supabase-auth:v1' in map))
}

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص البذرة نجحت — ${pass} فحصًا.`)
else { console.log(`❌ فشل ${fail} من ${pass + fail}.`); process.exit(1) }
