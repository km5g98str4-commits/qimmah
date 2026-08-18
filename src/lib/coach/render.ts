// ═══════════════════════════════════════════════════════════════════════════
//  الرسم — [SOVEREIGN-003].
//
//  الطبقة الوحيدة التي تحوّل جوابًا مُسنَدًا إلى نصّ يقرأه إنسان. وشرطها الأول
//  **قبل أي حرف**: `assertAnswerProvenance`. فالحارس ليس فحصًا اختياريًا في
//  اختبار، بل **بوّابة على الطريق الوحيد إلى الشاشة** — لا يمرّ سطر إلى الواجهة
//  إلا من هنا، ولا يمرّ من هنا جواب لم يُسنَد.
//
//  والمصادر تُحسب هنا لا في الواجهة: كل سطر يخرج ومعه **مصادره** و**درجة يقينه**،
//  فتعرضهما الواجهة كما هما ولا تجتهد. الواجهة ترسم ولا تقرّر.
// ═══════════════════════════════════════════════════════════════════════════

import type { CoachStrings } from '@/i18n/dict/coach'
import { assertAnswerProvenance } from './provenance'
import type {
  AnswerLine,
  Certainty,
  CoachAnswer,
  CoachFact,
  CoachLineKey,
  ExerciseRef,
  GroundingSourceId,
} from './types'

/** درجة يقين السطر ككل — أضعف حلقاته. `none` لسطر لا يصف حالة مستخدم أصلًا. */
export type LineCertainty = Certainty | 'none'

export interface RenderedLine {
  key: CoachLineKey
  text: string
  /** مصادر السطر — تُعرض للمستخدم، وترتيبها ثابت (ترتيب أول ظهور). */
  sources: readonly GroundingSourceId[]
  certainty: LineCertainty
  ref?: ExerciseRef
}

export interface RenderedAnswer {
  subject: CoachAnswer['subject']
  disclosure: CoachAnswer['disclosure']
  lines: readonly RenderedLine[]
}

const weakest = (certainties: readonly Certainty[]): LineCertainty => {
  if (!certainties.length) return 'none'
  if (certainties.includes('unknown')) return 'unknown'
  if (certainties.includes('inferred')) return 'inferred'
  return 'measured'
}

function factsOf(line: AnswerLine, byId: ReadonlyMap<string, CoachFact>): CoachFact[] {
  const ids: string[] = []
  for (const p of Object.values(line.params ?? {})) ids.push(p.factId)
  for (const id of line.basis ?? []) ids.push(id)
  for (const id of line.unknown ?? []) ids.push(id)
  if (line.ref) ids.push(line.ref.factId)
  const out: CoachFact[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const fact = byId.get(id)
    // `assertAnswerProvenance` سبق ومنع الحقيقة المفقودة؛ الحارس هنا للنوع لا للمنطق.
    if (fact) out.push(fact)
  }
  return out
}

/**
 * يحوّل جوابًا إلى سطور معروضة. **يرمي `CoachProvenanceError`** قبل أي رسم لو
 * اختلّ الإسناد — والرمي مقصود: عرض جواب غير مُسنَد أسوأ من عدم عرض شيء.
 */
export function renderAnswer(answer: CoachAnswer, strings: CoachStrings): RenderedAnswer {
  assertAnswerProvenance(answer)

  const byId = new Map(answer.facts.map((f) => [f.id, f]))
  const lines = answer.lines.map((line): RenderedLine => {
    const values: Record<string, string | number> = {}
    for (const [name, p] of Object.entries(line.params ?? {})) {
      const table = p.enum ? (strings.enums[p.enum] as Record<string, string | undefined>) : undefined
      // القيمة المنظَّمة تُترجَم ولا تُغيَّر؛ وغياب ترجمتها يُبقي المفتاح ظاهرًا
      // بدل أن يُخفي السطر — مفتاح مكشوف عيب مرئي، والحذف الصامت عيب خفيّ.
      values[name] = table?.[String(p.value)] ?? p.value
    }
    const facts = factsOf(line, byId)
    const sources: GroundingSourceId[] = []
    for (const fact of facts) if (!sources.includes(fact.source)) sources.push(fact.source)
    return {
      key: line.key,
      text: strings.lines[line.key](values),
      sources,
      certainty: weakest(facts.map((f) => f.certainty)),
      ...(line.ref ? { ref: line.ref } : {}),
    }
  })

  return { subject: answer.subject, disclosure: answer.disclosure, lines }
}
