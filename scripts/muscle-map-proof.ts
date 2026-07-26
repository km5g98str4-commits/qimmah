// إثبات خريطة العضلات (Q21) — منطق خالص، بلا متصفّح.
//
// يغطّي: بناء النموذج من computeWeeklyCoverage، الاختيار، الحالة الفارغة،
// تغطية كل العضلات على المخطّط، صحّة المسارات، وحارس التسمية.

import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { buildRegionModels, heatFor, summarize } from '@/lib/muscleMapModel'
import {
  BACK_REGIONS,
  FRONT_REGIONS,
  mappedMuscles,
  MAP_VIEWBOX,
  regionPaths,
  SILHOUETTE,
} from '@/data/muscleMapRegions'
import { ALL_MUSCLE_IDS } from '@/data/muscleGroups'
import { getExercise } from '@/data/exercises'
import type { WorkoutSession } from '@/lib/workoutSessions'
import type { MuscleCoverage } from '@/types/muscles'

let pass = 0
let fail = 0
const failed: string[] = []
function check(label: string, cond: boolean) {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    failed.push(label)
    console.log(`  ✗ FAIL: ${label}`)
  }
}

/**
 * جلسة تمرين حقيقية من مكتبة التمارين.
 * حارس مقصود: معرّف تمرين غير موجود يُسقط الإثبات برسالة واضحة بدل أن يُنتج
 * تغطية صفرية تبدو عطلًا في المنتج (وقع هذا فعلًا مع «barbell-squat»).
 */
function session(id: string, exerciseIds: string[], daysAgo: number, setsEach = 4): WorkoutSession {
  for (const ex of exerciseIds) {
    if (!getExercise(ex)) throw new Error(`معرّف تمرين غير موجود في المكتبة: ${ex}`)
  }
  const at = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return {
    id,
    date: at.slice(0, 10),
    startedAt: at,
    finishedAt: at,
    workoutDayId: `day-${id}`,
    workoutDayName: id,
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      targetSets: setsEach,
      targetReps: '8-10',
      targetRestSec: 90,
      completed: true,
      sets: Array.from({ length: setsEach }, (_, i) => ({
        setNumber: i + 1,
        targetReps: '8-10',
        actualReps: '9',
        weightKg: '40',
        completed: true,
      })),
    })),
  }
}

const EMPTY: Record<string, MuscleCoverage> = computeWeeklyCoverage({ sessions: [] }).weeklyCoverage

console.log('\n① الحالة الفارغة — بلا أي جلسة')
{
  const front = buildRegionModels('front', EMPTY)
  const back = buildRegionModels('back', EMPTY)
  const stats = summarize(EMPTY, ALL_MUSCLE_IDS)
  check('كل مناطق الأمام بصفر مجموعات', front.every((r) => r.sets === 0))
  check('كل مناطق الخلف بصفر مجموعات', back.every((r) => r.sets === 0))
  check('لا منطقة مُبرَزة (heat = 0)', [...front, ...back].every((r) => r.heat === 0))
  check('كل الحالات «ناقصة»', [...front, ...back].every((r) => r.status === 'undertrained'))
  check('الملخّص: صفر عضلات مفعّلة', stats.trained === 0 && stats.totalSets === 0)
  check('الهدف موجود رغم غياب البيانات (لا قسمة على صفر)', front.every((r) => r.target > 0))
  check('النسبة صفر لا NaN', [...front, ...back].every((r) => r.ratio === 0))
}

console.log('\n② تغطية حقيقية — دفع + سحب')
{
  const coverage = computeWeeklyCoverage({
    sessions: [
      session('push', ['barbell-bench-press', 'incline-dumbbell-press', 'overhead-press'], 1),
      session('pull', ['lat-pulldown', 'barbell-row'], 3),
    ],
  }).weeklyCoverage
  const front = buildRegionModels('front', coverage)
  const back = buildRegionModels('back', coverage)
  const chest = front.find((r) => r.id === 'chest')!
  const lats = back.find((r) => r.id === 'lats')!
  const calves = back.find((r) => r.id === 'calves')!

  check('الصدر تلقّى مجموعات', chest.sets > 0)
  check('الصدر مُبرَز (heat > 0)', chest.heat > 0)
  check('اللاتس تلقّى مجموعات من السحب', lats.sets > 0)
  check('السمانة بلا مجموعات (لم تُدرَّب)', calves.sets === 0 && calves.heat === 0)
  check('اسم منطقة الصدر = اسم المجموعة لا عضلة مفردة', chest.label === 'الصدر')
  check('تفصيل الصدر يحوي ثلاث عضلات', chest.breakdown.length === 3)
  check('مجموع التفصيل يساوي مجموع المنطقة', Math.abs(chest.breakdown.reduce((n, b) => n + b.sets, 0) - chest.sets) < 0.05)
  check('النسبة داخل [0,1]', [...front, ...back].every((r) => r.ratio >= 0 && r.ratio <= 1))
  check('مصدر الحقيقة واحد: مجموع المخطّط = مجموع التغطية', (() => {
    const mapped = mappedMuscles()
    const fromCoverage = mapped.reduce((n, m) => n + (coverage[m]?.sets ?? 0), 0)
    const seen = new Set<string>()
    let fromMap = 0
    for (const r of [...front, ...back]) {
      for (const b of r.breakdown) {
        if (seen.has(b.id)) continue
        seen.add(b.id)
        fromMap += b.sets
      }
    }
    return Math.abs(fromMap - fromCoverage) < 0.05
  })())
}

console.log('\n③ درجات الإبراز')
{
  check('صفر مجموعات ⇒ درجة 0 مهما كانت النسبة', heatFor(0, 1) === 0)
  check('نسبة ضعيفة ⇒ درجة 1', heatFor(2, 0.2) === 1)
  check('نسبة متوسطة ⇒ درجة 2', heatFor(5, 0.45) === 2)
  check('نسبة عالية ⇒ درجة 3', heatFor(9, 0.75) === 3)
  check('نسبة مكتملة ⇒ درجة 4', heatFor(12, 1) === 4)
}

console.log('\n④ سلامة المخطّط')
{
  const all = [...FRONT_REGIONS, ...BACK_REGIONS]
  const mapped = mappedMuscles()
  const missing = ALL_MUSCLE_IDS.filter((m) => !mapped.includes(m))
  check(`كل العضلات الـ${ALL_MUSCLE_IDS.length} ممثّلة على المخطّط`, missing.length === 0)
  if (missing.length) console.log(`     غير ممثّلة: ${missing.join(', ')}`)

  const frontIds = FRONT_REGIONS.map((r) => r.id)
  const backIds = BACK_REGIONS.map((r) => r.id)
  check('معرّفات مناطق الأمام فريدة', new Set(frontIds).size === frontIds.length)
  check('معرّفات مناطق الخلف فريدة', new Set(backIds).size === backIds.length)
  check('كل منطقة لها مسار رسم واحد على الأقل', all.every((r) => regionPaths(r).length > 0))
  check('كل المسارات مغلقة وصالحة', [...all.flatMap(regionPaths), ...SILHOUETTE].every((d) => /^M[\d.\s-]/.test(d) && d.trim().endsWith('Z')))
  check('المسارات المعكوسة تُنتج عددًا مزدوجًا', all.filter((r) => r.mirror).every((r) => regionPaths(r).length === r.d.length * 2))

  // كل الإحداثيات داخل لوحة الرسم — يمنع منطقة تخرج عن الجسم بعد أي تعديل.
  const outOfBounds: string[] = []
  for (const r of all) {
    for (const d of regionPaths(r)) {
      const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i]
        const y = nums[i + 1]
        if (x < 0 || x > MAP_VIEWBOX.width || y < 0 || y > MAP_VIEWBOX.height) {
          outOfBounds.push(`${r.id} (${x},${y})`)
        }
      }
    }
  }
  check('لا منطقة خارج حدود لوحة الرسم', outOfBounds.length === 0)
  if (outOfBounds.length) console.log(`     خارج الحدود: ${outOfBounds.slice(0, 4).join(' | ')}`)
}

console.log('\n⑤ الاختيار (منطق البطاقة)')
{
  const coverage = computeWeeklyCoverage({ sessions: [session('legs', ['barbell-back-squat'], 2)] }).weeklyCoverage
  const front = buildRegionModels('front', coverage)
  const back = buildRegionModels('back', coverage)
  const all = [...front, ...back]

  // ما تفعله البطاقة عند الضغط: تبحث بالمعرّف في الجهتين.
  const find = (id: string | null) => all.find((r) => r.id === id) ?? null
  check('اختيار منطقة أمامية يُرجع نموذجها', find('quads')?.id === 'quads')
  check('اختيار منطقة خلفية يُرجع نموذجها', find('hamstrings')?.id === 'hamstrings')
  check('معرّف غير موجود يُرجع null (لا انهيار)', find('nope') === null)
  check('null يُرجع null', find(null) === null)
  check('لا تعارض معرّفات بين الجهتين', (() => {
    const dup = front.map((r) => r.id).filter((id) => back.some((b) => b.id === id))
    return dup.length === 0
  })())
  const quads = find('quads')!
  check('السكوات فعّل أمامية الفخذ', quads.sets > 0 && quads.heat > 0)
  check('لكل نموذج تفصيل غير فارغ', all.every((r) => r.breakdown.length > 0))
}

console.log(`\n${fail === 0 ? '✅' : '❌'} muscle-map — ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log(`   failed: ${failed.join(' | ')}`)
  process.exit(1)
}
