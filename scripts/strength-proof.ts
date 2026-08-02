// إثبات نظام القوة — Qimmah. رياضيات الأقراص، صيغ e1RM مقابل قيم يدوية، كشف
// الأرقام القياسية (لا رقم كاذب عند التخفيف)، تقريب الإحماء، وعزل إعداد الأقراص
// بين حسابين. يعمل فوق localStorage مُحاكى (banner) بلا متصفح.

import {
  computeLoadout, totalFromPerSide, defaultPlateConfig, loadPlateConfig, savePlateConfig, KSA_PLATES_KG, type PlateConfig,
  epley, brzycki, e1rm, e1rmSeries, velocityKgPerWeek, sessionExerciseE1RM,
  generateWarmup, loadWarmupPref, saveWarmupPref,
  detectSessionPRs, prHistory, repMaxInExercise,
} from '@/lib/strength'
import type { WorkoutSession, SetLog } from '@/lib/workoutSessions'

let pass = 0, fail = 0
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  ✓ ${label}`) } else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps

const DEF = defaultPlateConfig() // bar 20, KSA plates, وافرة

console.log('\n① رياضيات الأقراص')
{
  const l100 = computeLoadout(100, DEF)
  check('100كجم قابل للتحقيق', l100.reachable && l100.achievedKg === 100)
  check('100كجم: مجموع الجهتين + البار = 100', totalFromPerSide(l100.perSide, 20) === 100)
  check('البار وحده (20) قابل، بلا أقراص', computeLoadout(20, DEF).reachable && computeLoadout(20, DEF).perSide.length === 0)
  check('22.5كجم = قرص 1.25 لكل جهة', computeLoadout(22.5, DEF).reachable && totalFromPerSide(computeLoadout(22.5, DEF).perSide, 20) === 22.5)
  // هدف فردي غير قابل للتحقيق.
  const odd = computeLoadout(61, DEF)
  check('61كجم غير قابل → أقرب 60 (delta −1)', !odd.reachable && odd.achievedKg === 60 && near(odd.deltaKg, -1))
  check('61كجم اقتراح ±: نزول 60 وصعود 62.5', odd.suggestion?.downKg === 60 && odd.suggestion?.upKg === 62.5)
  // أقراص محدودة.
  const limited: PlateConfig = { barKg: 20, plates: [{ kg: 20, pairs: 1 }, { kg: 5, pairs: 1 }] }
  const l = computeLoadout(100, limited)
  check('أقراص محدودة: 100 غير قابل → أقصى 70', !l.reachable && l.achievedKg === 70 && l.suggestion?.upKg === null)
  // بار 15.
  const bar15: PlateConfig = { ...DEF, barKg: 15 }
  const l55 = computeLoadout(55, bar15)
  check('بار 15: 55كجم = قرص 20 لكل جهة', l55.reachable && totalFromPerSide(l55.perSide, 15) === 55)
}

console.log('\n② صيغ e1RM مقابل قيم يدوية')
{
  check('Epley(100,5) = 116.67', near(epley(100, 5), 116.6667, 0.001))
  check('Brzycki(100,5) = 112.5', near(brzycki(100, 5), 112.5))
  check('e1rm(100,5) = Brzycki مقرَّب 112.5', e1rm(100, 5) === 112.5)
  check('e1rm(100,1) = 100', e1rm(100, 1) === 100)
  check('e1rm(100,12) = Epley 140 (reps>10)', e1rm(100, 12) === 140)
  check('e1rm بمدخلات غير صالحة = NaN', Number.isNaN(e1rm(0, 5)) && Number.isNaN(e1rm(100, 0)))
}

// —— جلسات اصطناعية ——
const mkSet = (n: number, w: number, r: number): SetLog => ({ setNumber: n, targetReps: String(r), actualReps: String(r), weightKg: String(w), completed: true })
function mkSession(id: string, date: string, w: number, reps: number): WorkoutSession {
  return { id, date, startedAt: `${date}T18:00:00Z`, finishedAt: `${date}T19:00:00Z`, workoutDayId: 'd', workoutDayName: 'يوم', exercises: [{ exerciseId: 'barbell-bench-press', exerciseNameAr: 'بنش', targetSets: 3, targetReps: String(reps), targetRestSec: 90, completed: true, sets: [mkSet(1, w, reps), mkSet(2, w, reps), mkSet(3, w, reps)] }] }
}

console.log('\n③ كشف الأرقام القياسية (لا رقم كاذب)')
{
  const s1 = mkSession('s1', '2026-07-01', 100, 5)
  const s2 = mkSession('s2', '2026-07-08', 105, 5)
  const s3 = mkSession('s3', '2026-07-15', 90, 5) // تخفيف
  check('الجلسة الأولى: لا رقم (تثبيت خط الأساس)', detectSessionPRs(s1, []).length === 0)
  const pr2 = detectSessionPRs(s2, [s1])
  check('الجلسة الثانية (105>100): أرقام قياسية', pr2.length > 0 && pr2.some((p) => p.kind === '5RM' && p.valueKg === 105))
  check('الجلسة الثانية: تشمل e1RM', pr2.some((p) => p.kind === 'e1RM'))
  check('التخفيف (90<105): لا رقم كاذب', detectSessionPRs(s3, [s1, s2]).length === 0)
  // سجلّ الأرقام المؤرّخ (الأحدث أولًا) + سلسلة e1RM.
  const log = prHistory('barbell-bench-press', [s1, s2, s3])
  check('سجلّ الأرقام: يتضمّن كسر 5RM إلى 105', log.length >= 1 && log.some((p) => p.kind === '5RM' && p.valueKg === 105))
  const series = e1rmSeries('barbell-bench-press', [s1, s2, s3])
  check('سلسلة e1RM: 3 نقاط تصاعديًا', series.length === 3 && series[0].date === '2026-07-01')
  const vel = velocityKgPerWeek('barbell-bench-press', [s1, s2, s3])
  check('سرعة التقدّم محسوبة (كجم/أسبوع)', vel !== null)
}

console.log('\n④ تقريب الإحماء')
{
  const w = generateWarmup(100, DEF, 5)
  check('آخر خطوة = العمل (100 × 5)', w[w.length - 1].isWork && w[w.length - 1].weightKg === 100 && w[w.length - 1].reps === 5)
  check('البار أولًا (20 × 10)', w[0].weightKg === 20 && w[0].reps === 10)
  check('كل الأوزان قابلة للتحقيق ودون وزن العمل', w.every((s) => s.loadout.reachable && s.weightKg <= 100))
  check('تصاعدي تمامًا', w.every((s, i) => i === 0 || s.weightKg > w[i - 1].weightKg))
  check('عمل ≤ البار → لا إحماء', generateWarmup(20, DEF).length === 0)
  // تفضيل الإحماء مربوط بالحساب.
  saveWarmupPref('userA', { show: false })
  check('تفضيل الإحماء يُحفظ ويُقرأ', loadWarmupPref('userA').show === false && loadWarmupPref('userB').show === true)
}

console.log('\n⑤ عزل إعداد الأقراص بين حسابين')
{
  const cfgA: PlateConfig = { barKg: 15, plates: [{ kg: 20, pairs: 2 }] }
  savePlateConfig('userA', cfgA)
  check('userA يقرأ إعداده', JSON.stringify(loadPlateConfig('userA')) === JSON.stringify(cfgA))
  check('userB يقرأ الافتراضي (لا تسرّب)', loadPlateConfig('userB').barKg === 20)
  check('الضيف مستقلّ عن userA', loadPlateConfig(null).barKg === 20)
  const hostile = { barKg: 20, plates: [{ kg: 1.25, pairs: 1_000_000_000 }] } as PlateConfig
  savePlateConfig('hostile', hostile)
  check('عدد أقراص عدائي يُرفض قبل التخزين', loadPlateConfig('hostile').barKg === 20 && loadPlateConfig('hostile').plates.length === KSA_PLATES_KG.length)
}

console.log('\n⑥ actualReps=0 لا يتحوّل إلى تكرارات الهدف')
{
  const zeroActual = { exerciseId: 'barbell-bench-press', exerciseNameAr: 'بنش', targetSets: 1, targetReps: '5', targetRestSec: 90, completed: true, sets: [{ ...mkSet(1, 100, 5), actualReps: '0' }] }
  check('صفر فعلي لا يُسجَّل 1RM', Number.isNaN(repMaxInExercise(zeroActual, 1)))
  check('صفر فعلي لا يُنتج e1RM', Number.isNaN(sessionExerciseE1RM(zeroActual)))
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) console.log(`✅ كل فحوص نظام القوة نجحت — ${pass} فحصًا.`)
else { console.log(`❌ فشل ${fail} من ${pass + fail}.`); process.exit(1) }
