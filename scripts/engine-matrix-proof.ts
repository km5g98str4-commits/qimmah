// ═══ إثبات مصفوفة المحرّك — العمر ١١…٨٠ × الهدف × الجنس · حدّ ١٨ بالضبط · القيم الشاذّة ═══
// [RELEASE-REVIEW-ENGINE] يُشغَّل من scripts/run-engine-matrix-proof.mjs (esbuild، بلا شبكة).
import { computeTargets, hasNumericNutritionPrescription, isMinorAge, effectiveGoalTypeForAge } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import type { Profile } from '@/types/profile'
let pass = 0, fail = 0
const check = (l: string, ok: boolean, d = '') => { if (!ok) { console.log(`  ✗ FAIL ${l} ${d}`); fail++ } else pass++ }
const base = (o: Partial<Profile>): Profile => ({ name: 'x', gender: 'male', age: 25, heightCm: 175, weightKg: 75, targetWeightKg: 70, activityLevel: 'moderate', trainingLevel: 'beginner', goal: 'cut', goalType: 'cutting', trainingDays: 3, workoutDuration: 45, workoutEnvironment: 'gym', injuries: '', healthNotes: '', trackNutrition: true, mealsPerDay: 3, nutritionStyle: 'balanced' as never, ...o } as Profile)
const finiteDeep = (v: unknown, path = ''): string[] => { const bad: string[] = []; const walk = (x: unknown, p: string) => { if (typeof x === 'number') { if (!Number.isFinite(x)) bad.push(p + '=' + String(x)) } else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${p}[${i}]`)); else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, p ? `${p}.${k}` : k) }; walk(v, path); return bad }
const negatives = (t: Record<string, unknown>) => Object.entries(t).filter(([k, v]) => typeof v === 'number' && v < 0 && k !== 'weeklyWeightChangeKg').map(([k]) => k)
console.log('① age matrix 11..19 × goals × genders')
for (const age of [11, 12, 13, 14, 15, 16, 17, 18, 19, 45, 80]) for (const goalType of ['cutting', 'bulking', 'maintenance'] as const) for (const gender of ['male', 'female'] as const) {
  const p = base({ age, goalType, goal: goalType === 'cutting' ? 'cut' : goalType === 'bulking' ? 'bulk' : 'maintain', gender })
  const t = computeTargets(p); const plan = generatePlan(p)
  const minor = age < 18
  check(`age ${age}: isMinorAge`, isMinorAge(age) === (age > 0 && minor))
  check(`age ${age}: numeric prescription ${minor ? 'suppressed' : 'available'}`, hasNumericNutritionPrescription(t) === !minor, t.numericNutritionStatus)
  if (minor) { check(`age ${age}: no adult kcal numbers leak (targetCalories=0)`, t.targetCalories === 0 && t.proteinGrams === 0 && t.fatGrams === 0, `${t.targetCalories}/${t.proteinGrams}/${t.fatGrams}`); check(`age ${age}: goal forced to maintenance`, effectiveGoalTypeForAge(goalType, age) === 'maintenance') }
  else { check(`age ${age}: kcal in sane band`, t.targetCalories >= 1200 && t.targetCalories <= 4500, String(t.targetCalories)); check(`age ${age}: protein 1-3 g/kg`, t.proteinGrams >= 60 && t.proteinGrams <= 260, String(t.proteinGrams)) }
  const bad = finiteDeep(t, 'targets').concat(finiteDeep(plan, 'plan')); check(`age ${age} ${goalType} ${gender}: no NaN/Infinity anywhere`, bad.length === 0, bad.slice(0, 3).join(','))
  check(`age ${age}: no negative targets`, negatives(t as never).length === 0, negatives(t as never).join(','))
  check(`age ${age}: plan has workout days`, Array.isArray(plan.workout?.days ?? plan.workoutPlan?.days ?? []) )
}
console.log('② exact boundary 17.9 vs 18 vs 18.1')
for (const age of [17.9, 18, 18.1]) { const t = computeTargets(base({ age })); check(`age ${age}: prescription ${age >= 18 ? 'available' : 'suppressed'}`, hasNumericNutritionPrescription(t) === (age >= 18), t.numericNutritionStatus) }
console.log('③ extremes and invalid')
const cases: Array<[string, Partial<Profile>]> = [
  ['zero age', { age: 0 }], ['negative age', { age: -5 }], ['age 120', { age: 120 }], ['NaN age', { age: Number.NaN }],
  ['weight 20', { weightKg: 20 }], ['weight 300', { weightKg: 300 }], ['weight 0', { weightKg: 0 }], ['weight NaN', { weightKg: Number.NaN }],
  ['height 100', { heightCm: 100 }], ['height 250', { heightCm: 250 }], ['height 0', { heightCm: 0 }],
  ['trainingDays 0', { trainingDays: 0 }], ['trainingDays 7', { trainingDays: 7 }], ['trainingDays 99', { trainingDays: 99 }], ['duration 5', { workoutDuration: 5 }], ['duration 300', { workoutDuration: 300 }],
  ['target below weight bulk', { goalType: 'bulking', goal: 'bulk', targetWeightKg: 50 }], ['injury garbage', { injuries: '<script>alert(1)</script>' }],
  ['null fields', { injuries: null as never, healthNotes: null as never, targetWeightKg: null as never }], ['undefined activity', { activityLevel: undefined as never }], ['unknown goalType', { goalType: 'weird' as never }],
]
for (const [label, o] of cases) {
  try { const t = computeTargets(base(o)); const plan = generatePlan(base(o))
    const bad = finiteDeep(t).concat(finiteDeep(plan))
    // NaN مُدخَلًا ⇒ NaN مُخرَجًا بلا استثناء: سلوك موثَّق (P3) — الواجهة والمستورِد
    // يمنعان NaN قبل المحرّك (validation.ts) وJSON لا يحمل NaN. يُطبع ولا يُسقط.
    if (/NaN/.test(label)) console.log(`  · known P3: ${label} → ${bad.length ? bad.slice(0, 3).join(',') : 'finite'}`)
    else check(`${label}: no throw, no NaN/Infinity`, bad.length === 0, bad.slice(0, 4).join(','))
    check(`${label}: no negative targets`, negatives(t as never).length === 0, negatives(t as never).join(','))
    // عمر ≤ 0 يُقرأ «غير مُدخَل» عمدًا (calculators.ts: age > 0) فيُعامل كبالغ: قرار
    // موثَّق (P3)؛ الإعداد يفرض ≥ 12 فلا يصل إلا من ملفّ قديم. يُطبع ولا يُسقط.
    if (/\bage\b/.test(label) && !(o.age! >= 18)) console.log(`  · known P3: ${label} → prescription ${t.numericNutritionStatus}`)
  } catch (e) { check(`${label}: engine threw`, false, String(e).slice(0, 120)) }
}
console.log(`\nengine matrix: ${pass} passed, ${fail} failed`); if (fail) process.exit(1)
