/**
 * إثبات: طبقة المدرّب **مؤجَّلة بإعلان**، لا ميتة بالصدفة ولا موصولة بالسهو.
 *
 * ═══ لماذا يوجد هذا الملف ═══
 * `src/lib/coach/` طبقة عقد كاملة **بصفر مستهلك** و**صفر حارس** — أي كودٌ ميت
 * وغير محروس معًا. وسجلّ الجولة السابقة يقول إن لها «حارس إسناد ١٦ فحصًا»،
 * وهو **غير موجود على الجذع**: حارته قُتلت قبل إيداعه. فالسجلّ نفسه كان بائتًا.
 *
 * والخطر ليس أنها ميتة، بل أن يصلها وكيلٌ قادم بواجهة فيشحن «مدرّبًا ذكيًّا»
 * يستثنيه `BACKLOG.md:32` صراحةً. فيُثبَّت التصنيف: مؤجَّلة، غير موصولة،
 * وعقدها سليم — ومن يصلها يسقط عنده هذا الحارس **باسمه** فيقرأ الوثيقة أوّلًا.
 *
 * المرجع: `docs/product/COACH-DEFERRAL-AND-SPEC.md` · سابقة الميثاق §8-٧.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { COACH_QUESTIONS } from '@/lib/coach/types'
import { verifyAnswerProvenance } from '@/lib/coach/provenance'
import type { CoachAnswer } from '@/lib/coach/types'

let pass = 0
const fails: string[] = []
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')
const files: string[] = []
;(function walk(dir: string) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.tsx?$/.test(e)) files.push(full)
  }
})(SRC)

console.log('\nإثبات تأجيل المدرّب — تصنيفٌ مُعلَن ومحروس\n')

console.log('① غير موصولة — التأجيل واقع لا نيّة')
const outside = files.filter((f) => !f.includes(`${'/'}lib${'/'}coach${'/'}`))
const importers = outside.filter((f) => /from '@\/lib\/coach(\/|')/.test(readFileSync(f, 'utf8')))
check(`لا مستهلك للطبقة في src/ (${outside.length} ملفًا مفحوصًا)`, importers.length === 0,
  importers.map((f) => f.replace(ROOT + '/', '')).join(' · '))

console.log('\n② الوثيقة موجودة وتقول ما تقوله الشيفرة')
const doc = readFileSync(resolve(ROOT, 'docs/product/COACH-DEFERRAL-AND-SPEC.md'), 'utf8')
check('وثيقة التأجيل موجودة', doc.length > 0)
check('وتُعلن الحالة DEFERRED صراحةً', doc.includes('DEFERRED'))
check('وتذكر استثناء الـBACKLOG بالاسم', doc.includes('BACKLOG.md:32'))
for (const q of COACH_QUESTIONS) {
  check(`السؤال «${q}» موصوف في الوثيقة`, doc.includes(q))
}

console.log('\n③ لا تسويق «ذكاء» في أي سطح يراه المستخدم')
const AI_WORDS = ['مدرب ذكي', 'مدرّب ذكي', 'ذكاء اصطناعي', 'AI Coach', 'AI coach']
const uiFiles = files.filter((f) => /\/(views|components)\//.test(f) || /\/i18n\/dict\//.test(f))
const offenders = uiFiles.filter((f) => {
  const t = readFileSync(f, 'utf8')
  return AI_WORDS.some((w) => t.includes(w))
})
check(`لا سطح واجهة يحمل تسويق ذكاء (${uiFiles.length} ملفًا)`, offenders.length === 0,
  offenders.map((f) => f.replace(ROOT + '/', '')).join(' · '))

console.log('\n④ عقد الإسناد سليم — التحفّظ مفروض بالنوع لا بالنيّة')
const hedgeless: CoachAnswer = {
  subject: 'todayPlan',
  providerId: 'deterministic',
  disclosure: 'derived',
  lines: [{ key: 'coach.today.plan', params: {} }],
  facts: [{ id: 'f1', source: 'plan', certainty: 'inferred', value: 'push' }],
} as unknown as CoachAnswer
const violations = verifyAnswerProvenance(hedgeless)
check('⚔️ حقيقة مُستنتَجة بلا تحفّظ تُرفَض', violations.length > 0,
  `المخالفات: ${violations.map((v) => v.code).join(' · ') || 'لا شيء — العقد رخو'}`)

const orphan = {
  subject: 'todayPlan', providerId: 'deterministic', disclosure: 'derived',
  lines: [], facts: [{ id: 'f1', source: 'plan', certainty: 'measured', value: 'x' }],
} as unknown as CoachAnswer
check('⚔️ وحقيقة لا يستعملها أي سطر تُرفَض يتيمةً',
  verifyAnswerProvenance(orphan).some((v) => v.code === 'orphan-fact'))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات تأجيل المدرّب: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
