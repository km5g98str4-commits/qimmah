// Unit proof for the Today v2.1 command-center model (Slice 3). Drives
// buildTodayV2Model over a simulated localStorage to prove the three states are
// selected from REAL data and each carries the right hero + pillar semantics.

import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { getDayStamp } from '@/lib/today'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const ls = globalThis.localStorage
const stamp = getDayStamp()
const iso = new Date().toISOString()

/** A customization with real plan + explicit nutrition targets (manuallyEdited stops recompute). */
function baseCustomization(extra?: Partial<Customization>): Customization {
  const c = getDefaultCustomization()
  return {
    ...c,
    profile: { ...c.profile, name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    targetsMeta: { ...c.targetsMeta, manuallyEdited: true },
    nutritionPlan: { ...c.nutritionPlan, targetCalories: 2200, targetProtein: 160 },
    ...extra,
  }
}

const seedOnboarded = () => ls.setItem('qimmah:onboarding:profile:v1', '{}')
const seedMigrated = () => ls.setItem('qimmah:history:migrated:v1', 'done')
const seedSteps = (n: number) => ls.setItem('qimmah:steps:v1', JSON.stringify({ [stamp]: n }))
const seedNutrition = (calories: number, protein: number) =>
  ls.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify({ [stamp]: { date: stamp, doneMeals: {}, loggedFood: { calories, protein, carbs: 0, fat: 0 }, updatedAt: iso } }))
const seedFinished = () =>
  ls.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify([{ id: 's1', date: stamp, startedAt: iso, finishedAt: iso, workoutDayId: 'd1', workoutDayName: 'الصدر والكتف', exercises: [{ exerciseId: 'x', targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true }] }]),
  )
/** A finished session `daysAgo` days back (no session today) — the return-after-break signal. */
const seedFinishedDaysAgo = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const past = getDayStamp(d)
  ls.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify([{ id: 'sPast', date: past, startedAt: `${past}T07:00:00.000Z`, finishedAt: `${past}T07:40:00.000Z`, workoutDayId: 'd1', workoutDayName: 'الصدر والكتف', exercises: [{ exerciseId: 'x', targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true }] }]),
  )
}

console.log('\n① لم يُكمل الإعداد → new-user، البطل يوجّه للإعداد')
{
  ls.clear()
  seedMigrated()
  const m = buildTodayV2Model(baseCustomization(), 'ar')
  check('state = newUser', m.state === 'newUser')
  check('hero → setup (لا خطة بعد)', m.hero.destination === 'setup')
  check('لا يوجد أي عمود مكتمل', m.completedCount === 0)
  check('كل الأعمدة locked (لا حلقات فارغة)', m.pillars.every((p) => p.state === 'locked'))
  check('بطاقات إعداد (3)', m.cards.length === 3)
}

console.log('\n② مُعَدّ + خطة جاهزة بلا سجلّ → new-user، «ابدأ تمرينك الأول»')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  const m = buildTodayV2Model(baseCustomization(), 'ar')
  check('state = newUser', m.state === 'newUser')
  check('hero → workout', m.hero.destination === 'workout')
  check('عنوان البطل يذكر «الأول»', m.hero.title.includes('الأول'))
  check('نبرة الزر ember', m.hero.ctaTone === 'ember')
  check('«لم يبدأ بعد»', m.progressLabel.includes('لم يبدأ'))
}

console.log('\n③ مُعَدّ + خطوات + وجبة جزئية بلا جلسة منتهية → normal')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  seedSteps(8000) // 80%
  seedNutrition(1320, 125) // 60% سعرات · بقي 35g بروتين
  const m = buildTodayV2Model(baseCustomization(), 'ar')
  check('state = normal', m.state === 'normal')
  check('hero → workout', m.hero.destination === 'workout')
  check('التحية «يومك في قِمّة»', m.greeting.includes('قِمّة'))
  check('عمود التدريب ready (بطل اليوم)', m.pillars[0].state === 'ready')
  check('عمود التغذية active 60%', m.pillars[1].state === 'active' && m.pillars[1].percent === 60)
  check('عمود الحركة active 80%', m.pillars[2].state === 'active' && m.pillars[2].percent === 80)
  check('بطاقة بروتين «بقي 35g»', m.cards.some((c) => c.label.includes('35g') && c.destination === 'nutrition'))
  check('كل بطاقة لها وجهة (لا إحصاء ميّت)', m.cards.every((c) => c.destination !== null))
}

console.log('\n④ جلسة منتهية اليوم → after-workout، تعافي + وقود، زر أخضر')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  seedSteps(10200) // مكتمل
  seedNutrition(1540, 125) // 70% · بقي 35g
  seedFinished()
  const m = buildTodayV2Model(baseCustomization({ wellnessPlan: { enabled: true, supplements: [{ id: 's', supplementId: 'mag', order: 0 }], medications: [] } }), 'ar')
  check('state = afterWorkout', m.state === 'afterWorkout')
  check('التحية «أحسنت اليوم»', m.greeting.includes('أحسنت'))
  check('البطل: eyebrow «أنهيت …» بعلامة صح', m.hero.eyebrowDone === true && m.hero.eyebrow.includes('أنهيت'))
  check('عنوان: وجبة ما بعد التمرين', m.hero.title.includes('ما بعد التمرين'))
  check('نبرة الزر green', m.hero.ctaTone === 'green')
  check('hero → nutrition', m.hero.destination === 'nutrition')
  check('عمود التدريب done', m.pillars[0].state === 'done')
  check('عمود الحركة done', m.pillars[2].state === 'done')
  check('عمود التغذية active 70%', m.pillars[1].state === 'active' && m.pillars[1].percent === 70)
  check('عدّاد الإكمال ≥ 2', m.completedCount >= 2)
  check('بطاقة تذكير مساء (تعافي)', m.cards.some((c) => c.tone === 'recover'))
}

console.log('\n⑥ فجوة ≥٣ أيام منذ آخر تمرين → return-after-break (نبرة لطيفة، اقتراح لا تغيير)')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  seedFinishedDaysAgo(5) // آخر تمرين قبل ٥ أيام، لا جلسة اليوم
  const m = buildTodayV2Model(baseCustomization(), 'ar')
  check('state = returnAfterBreak', m.state === 'returnAfterBreak')
  check('التحية بلا لوم «سعيدون بعودتك»', m.greeting.includes('بعودتك'))
  check('البطل: عنوان تمرين عودة خفيف', m.hero.title.includes('عودة'))
  check('البطل يذكر «١٥ دقيقة»', m.hero.subtitle.includes('١٥'))
  check('«تقدّمك السابق محفوظ»', m.hero.subtitle.includes('محفوظ'))
  check('صفر لوم/ذنب (لا ذكر لعدد أيام الغياب)', !/\d+\s*(يوم|أيام|days?)/.test(`${m.greeting} ${m.hero.eyebrow} ${m.hero.title} ${m.hero.subtitle}`))
  check('الستريك غير مُوبَّخ (لا كلمات لوم)', !/(فاتك|انقطعت|خسرت|أضعت|للأسف|missed|lost|broke)/i.test(`${m.greeting} ${m.hero.subtitle}`))
  check('القاعدة D: البطل اقتراح ببدء صريح → workout', m.hero.destination === 'workout')
  check('خيار «خطة كاملة» ظاهر كبطاقة → workout', m.cards.some((c) => c.label.includes('كاملة') && c.destination === 'workout'))
  check('كل بطاقة لها وجهة', m.cards.every((c) => c.destination !== null))
  check('السياقات الأخرى سليمة: أعمدة غير مقفلة بالكامل', m.pillars.some((p) => p.state !== 'locked'))
}

console.log('\n⑦ فجوة يوم واحد فقط → يبقى normal (لا عودة قبل ٣ أيام)')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  seedFinishedDaysAgo(1)
  const m = buildTodayV2Model(baseCustomization(), 'ar')
  check('state = normal (فجوة < ٣ أيام)', m.state === 'normal')
}

console.log('\n⑤ الإنجليزية: نفس المنطق، نصوص EN')
{
  ls.clear()
  seedMigrated()
  seedOnboarded()
  const m = buildTodayV2Model(baseCustomization(), 'en')
  check('state = newUser', m.state === 'newUser')
  check('greeting EN', m.greeting.startsWith('Hi') || m.greeting.startsWith('Welcome'))
  check('progress EN «Not started»', m.progressLabel.includes('Not started'))
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص نموذج اليوم v2.1 نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
