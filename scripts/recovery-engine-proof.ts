// برهان محرّك التعافي v2 (P11) — claude/recovery-engine-v1.
// يثبت بشخصيات (personas): مضاد المبالغة (قراءة سيئة واحدة ≠ راحة) · الألم الشديد
// حاسم منفردًا · التعارض ⇒ تقدّم بحذر بثقة منخفضة · كل المدخلات اختيارية ·
// الحمل التدريبي ٧ مقابل ٧ الأسبوع السابق · إشارات P9 اختيارية بالكامل ·
// سجلّ v2 موسوم بالمالك + استيراد v1 idempotent بلا حذف · اتجاه ٧/٢٨ يومًا ·
// قاعدة D (لا تعديل خطة — حارس نصّي) · لا لغة تشخيصية · نصوص ثنائية اللغة.

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  RULES_VERSION,
  RECOVERY_ENGINE_LOG_BASE,
  RECOVERY_ENGINE_LOG_CAP,
  recoveryEngineLogKey,
  evaluateRecovery,
  deriveTrainingLoad,
  healthSignalsFromStore,
  saveRecoveryEngineEntry,
  loadRecoveryEngineLog,
  todaysRecoveryEngineEntry,
  ensureRecoveryEngineMigrated,
  recoveryTrend,
  type RecoveryEngineInput,
} from '@/lib/recoveryEngine'
import { RECOVERY_LOG_BASE, recommendRecovery } from '@/lib/recovery'
import { getDayStamp } from '@/lib/today'
import type { WorkoutSession } from '@/lib/workoutSessions'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

const ROOT = process.cwd()
const engineSource = readFileSync(resolve(ROOT, 'src/lib/recoveryEngine.ts'), 'utf8')

console.log('\n— الشخصية ١: «المنهك» (نوم سيّئ + طاقة منخفضة + قفزة حمل) —')
{
  const evalRest = evaluateRecovery({
    sleepQuality: 'poor',
    energy: 'low',
    trainingLoad: { sessions7: 6, sessionsPrior7: 3, volume7: 60, volumePrior7: 30, ratio: 2 },
  })
  check('عوامل مُعزِّزة متعددة ⇒ راحة', evalRest.suggestion === 'rest')
  check('بلا ألم شديد ⇒ الراحة ليست «حاسمة منفردة»', evalRest.flags.decisiveSoreness === false)
  check('كل تقييم مختوم بإصدار القواعد', evalRest.rulesVersion === RULES_VERSION)
  check('أثر القرار يذكر كل عامل مُجهِد', evalRest.reasons.filter((r) => r.direction === 'strained').length === 3)
  check('درجة الجاهزية منخفضة (<50)', evalRest.score < 50)
}

console.log('\n— الشخصية ٢: مضاد المبالغة (قراءة سيئة واحدة ≠ راحة) —')
{
  const onlyPoorSleep = evaluateRecovery({ sleepQuality: 'poor' })
  check('نوم سيّئ وحده ⇒ تخفيف شدة لا راحة', onlyPoorSleep.suggestion === 'reduce_intensity')
  check('عامل واحد فقط ⇒ علم بيانات قليلة', onlyPoorSleep.flags.lowData === true)
  check('بيانات قليلة ⇒ ثقة منخفضة (≤0.3)', onlyPoorSleep.confidence <= 0.3)

  const twoStrainedSmallMargin = evaluateRecovery({ sleepQuality: 'poor', stress: 'high' })
  check('عاملان بهامش غير حاسم ⇒ ليست راحة', twoStrainedSmallMargin.suggestion !== 'rest')

  const highLoadOnly = evaluateRecovery({
    sleepQuality: 'poor',
    trainingLoad: { sessions7: 6, sessionsPrior7: 5, volume7: 90, volumePrior7: 50, ratio: 1.8 },
  })
  check('الحمل المرتفع يوجّه إلى تخفيف حجم', highLoadOnly.suggestion === 'reduce_volume')
}

console.log('\n— الشخصية ٣: ألم عضلي شديد صريح (الحاسم الوحيد) —')
{
  const severe = evaluateRecovery({ soreness: { legs: 'severe' }, sleepQuality: 'good', energy: 'high' })
  check('ألم شديد ⇒ راحة ولو كان الباقي مستشفيًا', severe.suggestion === 'rest')
  check('علم الحسم المنفرد مرفوع', severe.flags.decisiveSoreness === true)
  check('أثر القرار يعلّم العامل الحاسم', severe.reasons.some((r) => r.factor === 'soreness' && r.decisive === true))
  const moderateOnly = evaluateRecovery({ soreness: { chest: 'moderate', back: 'moderate' } })
  check('ألم متوسط متعدد المناطق بلا عوامل أخرى ⇒ ليست راحة', moderateOnly.suggestion !== 'rest')
}

console.log('\n— الشخصية ٤: إشارات متعارضة ⇒ تقدّم بحذر بثقة منخفضة —')
{
  const conflicted = evaluateRecovery({ sleepQuality: 'good', stress: 'high' })
  check('تعارض بفارق ضئيل ⇒ تقدّم (بحذر)', conflicted.suggestion === 'proceed')
  check('علم التعارض مرفوع', conflicted.flags.conflicting === true)
  check('التعارض يسقف الثقة (≤0.35)', conflicted.confidence <= 0.35)
}

console.log('\n— الشخصية ٥: مستشفٍ تمامًا + المدخلات الفارغة —')
{
  const fresh = evaluateRecovery({
    sleepQuality: 'good', sleepDurationH: 8, energy: 'high', stress: 'low',
    soreness: { general: 'none' },
    trainingLoad: { sessions7: 3, sessionsPrior7: 3, volume7: 30, volumePrior7: 30, ratio: 1 },
  })
  check('مستشفٍ ⇒ تقدّم بلا تعارض', fresh.suggestion === 'proceed' && fresh.flags.conflicting === false)
  check('درجة الجاهزية مرتفعة (>50) وثقة معقولة (≥0.6)', fresh.score > 50 && fresh.confidence >= 0.6)

  const empty = evaluateRecovery({})
  check('بلا أي مدخل ⇒ تقدّم بثقة منخفضة ولا عوامل مُخترعة', empty.suggestion === 'proceed' && empty.confidence <= 0.3 && empty.reasons.length === 0)
  check('البيانات الغائبة لا ترفع الثقة أبدًا', empty.confidence < fresh.confidence)
}

console.log('\n— نصوص ثنائية اللغة في أثر القرار —')
{
  const all = evaluateRecovery({
    sleepQuality: 'poor', sleepDurationH: 5, energy: 'low', stress: 'high',
    soreness: { legs: 'mild' },
    trainingLoad: { sessions7: 6, sessionsPrior7: 3, volume7: 60, volumePrior7: 30, ratio: 2 },
    restingHeartRate: { current: 70, baseline: 60 },
    hrv: { current: 40, baseline: 55 },
  })
  check('كل العوامل الثمانية حاضرة عند اكتمال المدخلات', all.reasons.length === 8)
  check('كل ملاحظة تحمل عربي + إنجليزي غير فارغين', all.reasons.every((r) => r.note.ar.trim().length > 0 && r.note.en.trim().length > 0))
}

console.log('\n— الحمل التدريبي: ٧ أيام مقابل الأسبوع السابق —')
{
  const now = new Date('2026-07-24T12:00:00Z')
  const session = (daysAgo: number, completedSets: number): WorkoutSession => ({
    id: `s-${daysAgo}-${completedSets}`,
    date: getDayStamp(new Date(now.getTime() - daysAgo * 86400000)),
    startedAt: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
    workoutDayId: 'd1',
    workoutDayName: 'دفع',
    exercises: [{
      exerciseId: 'e1', targetSets: completedSets, targetReps: '10', targetRestSec: 90, completed: true,
      sets: Array.from({ length: completedSets }, (_, i) => ({ setNumber: i + 1, targetReps: '10', actualReps: '10', weightKg: '40', completed: true })),
    }],
  })
  const spike = deriveTrainingLoad([session(1, 10), session(2, 10), session(3, 10), session(9, 5), session(10, 5)], now)
  assert(spike)
  check('قفزة حمل: النسبة بالحجم (30/10 = 3)', spike.ratio === 3 && spike.sessions7 === 3 && spike.sessionsPrior7 === 2)
  check('الأسبوعان فارغان ⇒ undefined (لا نسبة مُخترعة)', deriveTrainingLoad([session(20, 10)], now) === undefined)
  const legacy = deriveTrainingLoad([
    { ...session(1, 0), exercises: [{ exerciseId: 'e1', targetSets: 3, targetReps: '10', targetRestSec: 90, completed: true }] },
    { ...session(9, 0), exercises: [{ exerciseId: 'e1', targetSets: 3, targetReps: '10', targetRestSec: 90, completed: true }] },
  ], now)
  assert(legacy)
  check('سجلّات قديمة بلا أطقم تُحتسب كوحدة حجم', legacy.volume7 === 1 && legacy.volumePrior7 === 1 && legacy.ratio === 1)
}

console.log('\n— إشارات P9 اختيارية بالكامل —')
{
  check('متجر صحّة فارغ ⇒ لا إشارات (والمحرّك يعمل يدويًا)', Object.keys(healthSignalsFromStore()).length === 0)
  const rhrStrained = evaluateRecovery({ restingHeartRate: { current: 68, baseline: 60 } })
  check('نبض راحة أعلى من الأساس ⇒ عامل إجهاد واحد (ليس راحة)', rhrStrained.suggestion !== 'rest' && rhrStrained.reasons.some((r) => r.factor === 'resting_hr' && r.direction === 'strained'))
  const invalidBaseline = evaluateRecovery({ hrv: { current: 40, baseline: 0 } })
  check('خط أساس غير صالح ⇒ العامل يُهمل ولا يُختلق', invalidBaseline.reasons.length === 0)
}

console.log('\n— سجلّ v2 موسوم بالمالك —')
{
  const OWNER = 'user-p11'
  check('مفتاح v2 موسوم بالمالك', recoveryEngineLogKey(OWNER) === `${RECOVERY_ENGINE_LOG_BASE}:${OWNER}` && recoveryEngineLogKey(null) === `${RECOVERY_ENGINE_LOG_BASE}:guest`)
  const saved = saveRecoveryEngineEntry(OWNER, { sleepQuality: 'poor' })
  check('الحفظ يعيد إدخالًا مختومًا بالتاريخ والإصدار', saved.date === getDayStamp() && saved.rulesVersion === RULES_VERSION)
  saveRecoveryEngineEntry(OWNER, { sleepQuality: 'good', energy: 'high' })
  const log = loadRecoveryEngineLog(OWNER)
  check('فحص اليوم يستبدل فحص اليوم نفسه (لا تكرار)', log.length === 1 && log[0].input.energy === 'high')
  check('todaysRecoveryEngineEntry يعيد فحص اليوم', todaysRecoveryEngineEntry(OWNER)?.input.energy === 'high')
  check('سجلّ المالك الآخر معزول', loadRecoveryEngineLog('user-other').length === 0)
  check('سقف السجلّ يطابق سياسة v1 (180)', RECOVERY_ENGINE_LOG_CAP === 180)
}

console.log('\n— استيراد سجلّ v1 (idempotent · بلا حذف · v2 يفوز لنفس اليوم) —')
{
  const OWNER = 'user-import'
  const today = getDayStamp()
  const v1Raw = JSON.stringify([
    { date: '2026-07-20', rec: 'rest', sleep: 'poor', soreness: 'severe' },
    { date: '2026-07-21', rec: 'full', energy: 'high' },
    { date: today, rec: 'light', sleep: 'ok' },
  ])
  window.localStorage.setItem(`${RECOVERY_LOG_BASE}:${OWNER}`, v1Raw)
  saveRecoveryEngineEntry(OWNER, { energy: 'low' }) // إدخال v2 لليوم نفسه — يجب أن يفوز
  check('الهجرة الأولى تكتمل', ensureRecoveryEngineMigrated(OWNER) === 'done')
  const merged = loadRecoveryEngineLog(OWNER)
  check('اليومان القديمان استُوردا واليوم الحالي لم يُكرَّر', merged.length === 3)
  check('إدخال v2 الموجود يفوز لنفس اليوم', merged.find((e) => e.date === today)?.input.energy === 'low')
  const imported = merged.find((e) => e.date === '2026-07-20')
  check('المستورد موسوم v1-import بثقة متدنية وعلم الألم الشديد', imported?.rulesVersion === 'v1-import' && imported.confidence === 0.3 && imported.flags.decisiveSoreness === true)
  check('اقتراحات v1 تُترجم بأمانة (rest→rest · full→proceed)', imported?.suggestion === 'rest' && merged.find((e) => e.date === '2026-07-21')?.suggestion === 'proceed')
  check('الهجرة الثانية لا-شيء (idempotent)', ensureRecoveryEngineMigrated(OWNER) === 'skipped' && loadRecoveryEngineLog(OWNER).length === 3)
  check('سجلّ v1 لم يُحذف (الوحدة القديمة تعمل)', window.localStorage.getItem(`${RECOVERY_LOG_BASE}:${OWNER}`) === v1Raw)
  check('الوحدة القديمة نفسها ما تزال تعمل', recommendRecovery({ soreness: 'severe' }) === 'rest')
}

console.log('\n— اتجاه الأسبوع (٧/٢٨ يومًا) —')
{
  const OWNER = 'user-trend'
  const today = '2026-07-24'
  const entry = (date: string, score: number) => ({
    date, rulesVersion: RULES_VERSION, input: {} as RecoveryEngineInput,
    suggestion: 'proceed' as const, confidence: 0.5, score, reasons: [], flags: { conflicting: false, lowData: false, decisiveSoreness: false },
  })
  window.localStorage.setItem(recoveryEngineLogKey(OWNER), JSON.stringify([
    entry('2026-07-23', 70), entry('2026-07-22', 65), entry('2026-07-20', 40), entry('2026-07-19', 35),
  ]))
  const week = recoveryTrend(OWNER, 7, today)
  check('سلسلة ٧ أيام كاملة بأيام فارغة صريحة (null)', week.series.length === 7 && week.series.filter((p) => p.score === null).length === 3)
  check('الأقدم ← الأحدث', week.series[0].day === '2026-07-18' && week.series[6].day === today)
  check('تحسّن واضح ⇒ improving', week.direction === 'improving' && week.sampledDays === 4)
  const month = recoveryTrend(OWNER, 28, today)
  check('سلسلة ٢٨ يومًا', month.days === 28 && month.series.length === 28)
  const sparse = recoveryTrend('user-sparse', 7, today)
  check('أقل من فحصين ⇒ اتجاه ثابت بصدق', sparse.direction === 'stable' && sparse.sampledDays === 0)
}

console.log('\n— قاعدة D + الحوارس النصّية —')
{
  const planStores = ['customPlan', 'workoutCalendar', 'commitmentPlan', 'todayV2Model', 'activeSession']
  check('لا استيراد لأي متجر خطة في المحرّك (قاعدة D)', planStores.every((m) => !engineSource.includes(`from './${m}'`) && !engineSource.includes(`from '@/lib/${m}`)))
  const setItemCalls = engineSource.split('localStorage.setItem').length - 1
  check('كتابة واحدة فقط — سجلّ المحرّك نفسه لا غير', setItemCalls === 1 && engineSource.includes('recoveryEngineLogKey(ownerId)'))
  check('لا حذف لسجلّ v1 في المحرّك', !engineSource.includes('removeItem'))
  // الحارس يفحص الكود والنصوص الظاهرة (بعد تجريد التعليقات — التوثيق يذكر القاعدة نفسها).
  const codeOnly = engineSource.split('\n').map((line) => line.replace(/\/\/.*$/u, '')).join('\n').replace(/\/\*[\s\S]*?\*\//gu, '')
  const diagnostic = ['تشخيص', 'مرض', 'علاج', 'دواء', 'إصابة', 'diagnos', 'disease', 'illness', 'medical condition', 'overtraining syndrome', 'injury']
  check('لا لغة تشخيصية في المحرّك (مؤشرات راحة وحمل فقط)', diagnostic.every((w) => !codeOnly.toLowerCase().includes(w.toLowerCase())))
  check('الهجرة تمرّ عبر مشغّل الهجرات الموحّد', engineSource.includes("from './dataOwnership'") && engineSource.includes('runMigration'))
  check('إصدار القواعد v2 مصرّح', RULES_VERSION === 'v2.0.0')
}

console.log(`\nالمحصلة: ${passed} نجحت، ${failed} فشلت`)
if (failed > 0) process.exit(1)
