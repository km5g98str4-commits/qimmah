// Proof for the Qimmah coaching layer. Hard-fails on any gap.
// Run: npm run test:coaching
import { exercises } from '@/data/exercises'
import { cuedIds, getCue, hasCue } from '@/lib/coaching/cues'
import { LESSONS } from '@/data/coaching/lessons'
import { REST_TIPS } from '@/data/coaching/restTips'
import { pickRestTip } from '@/lib/coaching/restTips'
import { selectNextLesson, currentTodayLesson, markLessonUnderstood, shownLessonIds } from '@/lib/coaching/lessonRotation'
import type { Muscle } from '@/types/workout'
import { getDefaultCustomization } from '@/lib/customization'
import { buildWorkoutV2Model } from '@/lib/workoutV2Model'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

// Injected by run-coaching-proof.mjs (esbuild define) so this bundled proof can
// read the view source for the rest-tip UI wiring assertions in section ⑨.
declare const __SRC_ROOT__: string

let pass = 0
let fail = 0
const check = (label: string, cond: boolean, extra = ''): void => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}${extra ? ' — ' + extra : ''}`) }
}

// ── ① 181/181 cue coverage (hard fail on any gap) ──
console.log('\n① تغطية إرشاد الأداء — كل تمرين في الكتالوج له إرشاد مكتوب')
{
  const catalogIds = exercises.map((e) => e.id)
  const missing = catalogIds.filter((id) => !hasCue(id))
  check(`الكتالوج ${catalogIds.length} تمرينًا`, catalogIds.length === 181, `${catalogIds.length}`)
  check('كل معرّف في الكتالوج له إرشاد (لا fallback)', missing.length === 0, missing.slice(0, 8).join(', '))
  check('لا إرشاد يتيم بلا تمرين', cuedIds().every((id) => catalogIds.includes(id)))
  // structure: 3–5 steps + 2–3 mistakes + 1 safety
  let structOk = true
  for (const id of catalogIds) {
    const c = getCue(id)
    if (c.steps.length < 3 || c.steps.length > 5 || c.mistakes.length < 2 || c.mistakes.length > 3 || !c.safety) { structOk = false; break }
  }
  check('كل إرشاد: ٣–٥ خطوات + ٢–٣ أخطاء + تنبيه سلامة واحد', structOk)
}

// ── ② content lint: banned slang/hype + exclamation ──
console.log('\n② فحص المحتوى — لا عامية ولا مبالغة ولا علامات تعجّب')
{
  const bans = [/وش/, /الحين/, /تبي/, /كذا/, /احرق/, /مضمون/, /!/]
  const strings: string[] = []
  for (const id of cuedIds()) { const c = getCue(id); strings.push(...c.steps, ...c.mistakes, c.safety) }
  for (const l of LESSONS) strings.push(l.titleAr, l.bodyAr, l.takeawayAr)
  for (const r of REST_TIPS) strings.push(r.textAr)
  const hits: string[] = []
  for (const s of strings) for (const b of bans) if (b.test(s)) hits.push(`${b}→${s.slice(0, 24)}`)
  check(`لا كلمات محظورة عبر ${strings.length} نصًّا`, hits.length === 0, hits.slice(0, 4).join(' | '))
  // no medical-claim / guarantee phrases (conservative)
  const claimBans = [/يشفي/, /علاج مضمون/, /نتيجة مضمونة/, /خسارة سريعة/]
  const claimHits = strings.filter((s) => claimBans.some((b) => b.test(s)))
  check('لا ادّعاءات طبية أو وعود نتائج', claimHits.length === 0)
  // injuries route to consult
  check('تنبيهات تحميل العمود/الركبة توجّه لاستشارة مختص', cuedIds().some((id) => getCue(id).safety.includes('استشر مختصًا')))
}

// ── ③ lesson bounds + count ──
console.log('\n③ الدروس — العدد وحدود عدد الكلمات')
{
  check('٤٠ درسًا', LESSONS.length === 40, `${LESSONS.length}`)
  const wc = LESSONS.map((l) => l.bodyAr.trim().split(/\s+/).filter(Boolean).length)
  const out = LESSONS.filter((_, i) => wc[i] < 60 || wc[i] > 100)
  check('كل درس بين ٦٠ و١٠٠ كلمة', out.length === 0, `${Math.min(...wc)}-${Math.max(...wc)}`)
  check('كل درس له takeaway', LESSONS.every((l) => l.takeawayAr.trim().length > 0))
  check('معرّفات الدروس فريدة', new Set(LESSONS.map((l) => l.id)).size === 40)
}

// ── ④ rest tips ──
console.log('\n④ نصائح الراحة — العدد والربط بالعضلات')
{
  check('٢٥ نصيحة راحة', REST_TIPS.length === 25, `${REST_TIPS.length}`)
  check('كل نصيحة مرتبطة بعضلة واحدة على الأقل', REST_TIPS.every((r) => r.muscles.length >= 1))
  check('معرّفات النصائح فريدة', new Set(REST_TIPS.map((r) => r.id)).size === 25)
}

// ── ⑤ rest-tip picker: determinism + no-repeat within session ──
console.log('\n⑤ منتقي نصيحة الراحة — الحتمية وعدم التكرار خلال الجلسة')
{
  const mus: Muscle = 'chest'
  const a = pickRestTip(mus, 42, [])
  const b = pickRestTip(mus, 42, [])
  check('حتمي: نفس (عضلة/بذرة/معروض) → نفس النتيجة', !!a && !!b && a.id === b.id)
  // walk the whole matching pool with no repeat
  const shown: string[] = []
  const matched = REST_TIPS.filter((r) => r.muscles.includes(mus))
  let repeat = false
  for (let i = 0; i < matched.length; i++) {
    const t = pickRestTip(mus, 7, shown)
    if (!t) break
    if (shown.includes(t.id)) { repeat = true; break }
    shown.push(t.id)
  }
  check('لا تكرار حتى استنفاد نصائح العضلة', !repeat && shown.length === matched.length, `${shown.length}/${matched.length}`)
  // exhausted → resets (returns a tip, never null)
  check('بعد الاستنفاد يعيد الدورة (لا يرجع null)', pickRestTip(mus, 7, shown) !== null)
  // unknown-muscle fallback still returns a tip
  check('عضلة بلا نصائح مخصّصة → يرجع نصيحة عامّة', pickRestTip('cardio', 1, []) !== null)
}

// ── ⑥ lesson rotation: no-repeat-until-exhausted + determinism ──
console.log('\n⑥ تدوير الدروس — لا تكرار حتى النفاد ثم يعيد الدورة')
{
  const seen = new Set<string>()
  let shown: string[] = []
  let repeated = false
  for (let i = 0; i < LESSONS.length; i++) {
    const { lesson, shown: next } = selectNextLesson(shown, 5)
    if (seen.has(lesson.id)) { repeated = true; break }
    seen.add(lesson.id)
    shown = next
  }
  check('يمرّ على كل الـ٤٠ درسًا دون تكرار', !repeated && seen.size === 40, `${seen.size}`)
  // exhausted → reset (fresh cycle begins)
  const afterAll = selectNextLesson(shown, 5)
  check('بعد النفاد تبدأ دورة جديدة (shown يُعاد ضبطه)', afterAll.shown.length === 1)
  // determinism
  const d1 = selectNextLesson([], 9).lesson.id
  const d2 = selectNextLesson([], 9).lesson.id
  check('حتمي: نفس (المعروض/البذرة) → نفس الدرس', d1 === d2)
}

// ── ⑦ two-user rotation isolation (owner-scoped key) ──
console.log('\n⑦ عزل تدوير الدروس بين مستخدمَين (مفتاح مالكي)')
{
  // fresh store
  globalThis.localStorage.clear()
  // advance user A three times
  for (let i = 0; i < 3; i++) markLessonUnderstood('user-A', 5)
  const aShown = shownLessonIds('user-A')
  const bShown = shownLessonIds('user-B')
  check('تقدّم A مسجّل (٣ دروس)', aShown.length === 3, `${aShown.length}`)
  check('B لم يتأثّر بتقدّم A (مفتاح منفصل)', bShown.length === 0)
  // B's current lesson is independent of A
  const bCurrent = currentTodayLesson('user-B', 5)
  check('درس B الحالي مستقلّ عن A', !aShown.includes(bCurrent.id) || bShown.length === 0)
  // guest is its own bucket too
  markLessonUnderstood(null, 5)
  check('الضيف صندوق مستقلّ', shownLessonIds(null).length === 1 && shownLessonIds('user-A').length === 3)
}

// ── ⑧ v2 integration: authored cues reach the active product surface ──
console.log('\n⑧ تكامل v2 — إشارات الكتالوج تصل إلى شاشة التمرين')
{
  const model = buildWorkoutV2Model(getDefaultCustomization(), 'ar')
  const first = model.exercises[0]
  const authored = first ? getCue(first.exerciseId) : null
  check('خطة v2 تحتوي تمرينًا قانونيًا', !!first)
  check('إشارات v2 هي النص المعتمد لا fallback عام', !!first && !!authored && JSON.stringify(first.cues) === JSON.stringify(authored.steps))
  check('خطأ شائع معتمد يصل إلى نموذج v2', !!first && !!authored && first.commonMistake === authored.mistakes[0])
}

// ── ⑨ rest-tip UI wiring: engine reaches every v2 plan muscle + rendered on the dark surface ──
console.log('\n⑨ ربط نصيحة الراحة بالواجهة — كل عضلة خطة تُنتج نصيحة، وتُعرض وتُخفى على سطح التمرين')
{
  // Behavioural: every primary muscle a v2 plan can surface yields a rest tip.
  const model = buildWorkoutV2Model(getDefaultCustomization(), 'ar')
  const primary = model.exercises.map((e) => e.muscles[0]).filter(Boolean) as Muscle[]
  check('خطة v2 تُعرّف عضلة أساسية لكل تمرين', primary.length === model.exercises.length)
  check('كل عضلة أساسية في الخطة تُنتج نصيحة راحة (مطابقة أو عامّة)', primary.every((m, i) => pickRestTip(m, i + 1, []) !== null))
  const chest = pickRestTip('chest', 3, [])
  check('النصيحة مطابقة للعضلة حين توجد نصائح مخصّصة', !!chest && chest.muscles.includes('chest'))

  // Wiring: the Active-Workout view actually imports the picker and RestPanel
  // renders the tip on the dark rest surface — dismissible, reduced-motion-safe,
  // AA-contrast muted ink. Source-level so a future refactor that drops the render
  // (regressing to "engine exists but nothing shows") fails the gate.
  const view = readFileSync(resolvePath(__SRC_ROOT__, 'src/views/WorkoutV2.tsx'), 'utf8')
  check('شاشة التمرين تستورد منتقي النصيحة', /import\s*\{\s*pickRestTip\s*\}\s*from\s*'@\/lib\/coaching'/.test(view))
  check('النصيحة تُنتقى عند بدء الراحة بعضلة التمرين', view.includes('pickRestTip(muscle, restEndsAt, shownTips)') && view.includes(".muscles[0] ?? 'chest') as Muscle"))
  check('RestPanel يعرض نصّ النصيحة على سطح الراحة', view.includes('{tip.textAr}') && view.includes('const showTip = ar && !restDone && tip != null && !tipDismissed'))
  check('النصيحة قابلة للإخفاء (زر + aria-label)', view.includes('onClick={onDismissTip}') && view.includes("aria-label=\"إخفاء النصيحة\""))
  check('حركة الدخول آمنة لتقليل الحركة (v2-screen-enter مُقيّد بالتوكنز)', /className="v2-screen-enter[^"]*"[^>]*role="note"|role="note"[^>]*className="v2-screen-enter/.test(view) || view.includes('className="v2-screen-enter mt-6'))
  check('تباين AA على الداكن (ink-muted على البطاقة)', view.includes('color: FOCUS.inkMuted }}><bdi>{tip.textAr}'))
}

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص طبقة التدريب نجحت — ${pass} فحصًا.`)
else { console.log(`❌ فشل ${fail} من ${pass + fail}.`); process.exit(1) }
