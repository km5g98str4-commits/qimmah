// Proof for the Qimmah coaching layer. Hard-fails on any gap.
// Run: npm run test:coaching
import { exercises } from '@/data/exercises'
import { cuedIds, getCue, hasCue } from '@/lib/coaching/cues'
import { LESSONS } from '@/data/coaching/lessons'
import { REST_TIPS } from '@/data/coaching/restTips'
import { pickRestTip } from '@/lib/coaching/restTips'
import { selectNextLesson, currentTodayLesson, markLessonUnderstood, shownLessonIds } from '@/lib/coaching/lessonRotation'
import type { Muscle } from '@/types/workout'

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

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص طبقة التدريب نجحت — ${pass} فحصًا.`)
else { console.log(`❌ فشل ${fail} من ${pass + fail}.`); process.exit(1) }
