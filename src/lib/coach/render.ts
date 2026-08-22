// ═══════════════════════════════════════════════════════════════════════════
//  الرسم — [SOVEREIGN-COACH-001].
//
//  ═══ نقطة الحراسة الوحيدة ═══
//  **لا سطر يصل الشاشة إلا من هنا، ولا شيء يمرّ من هنا قبل
//  `assertAnswerProvenance`.** فلو دُسّ رقم بلا حقيقة، أو قيمةٌ تخالف حقيقتها،
//  أو بقيت حقيقة يتيمة — يرمي الرسم باسم المخالفة بدل أن يعرض جملة واثقة.
//
//  ═══ ثلاثة أشياء تخرج مع كل سطر ═══
//  ① **نوعه** (`kind`): محسوب · اقتراح · ملاحظة — فالواجهة تفصلها بصريًا ونصًّا.
//  ② **مصادره**: أسماء بشرية للوحدات التي خرجت منها حقائقه، تُعرَض تحته.
//  ③ **مجاهيله**: الحقائق التي أقرّ السطر بعدم معرفتها — تُعرَض كذلك، فالجهل
//     المُعلَن جزء من الجواب لا نقص فيه.
//
//  الأرقام تمرّ من `formatNumber` وحدها — سياسة الأرقام واحدة في التطبيق كلّه،
//  ولا جدول محلّي هنا يفترق عنها بصمت.
// ═══════════════════════════════════════════════════════════════════════════

import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { assertAnswerProvenance } from './provenance'
import type { CoachStrings } from './strings'
import {
  COACH_LINE_HEDGED,
  COACH_LINE_KIND,
  type CoachAnswer,
  type CoachAnswerSubject,
  type CoachEnumTable,
  type CoachFact,
  type CoachLineKey,
  type CoachLineKind,
  type CoachProviderId,
  type GroundingSourceId,
  type LineParam,
} from './types'

export interface RenderedLine {
  key: CoachLineKey
  kind: CoachLineKind
  text: string
  hedged: boolean
  /** مصادر الحقائق المعروفة التي استند إليها السطر (بأسمائها البشرية). */
  sources: GroundingSourceId[]
  /** مصادر ما أقرّ السطر بجهله. */
  unknownSources: GroundingSourceId[]
  /** تمرين حقيقي يفتحه السطر. */
  exerciseId?: string
}

export interface RenderedAnswer {
  subject: CoachAnswerSubject
  providerId: CoachProviderId
  disclosure: string
  lines: RenderedLine[]
}

export type NumberFormatter = (value: number, lang: Lang) => string

const defaultFormatter: NumberFormatter = (value, lang) =>
  formatNumber(value, lang, { maximumFractionDigits: 1 })

function renderParam(param: LineParam, strings: CoachStrings, lang: Lang, fmt: NumberFormatter): string {
  if (param.enum) {
    const table = (strings.enums as unknown as Record<CoachEnumTable, Record<string, string>>)[param.enum]
    const label = table?.[String(param.value)]
    // مفتاح بلا ترجمة يظهر كما هو بدل أن يختفي السطر — والاتحادات المكتوبة في
    // `CoachEnumTables` تجعل هذه الحالة تسقط في `typecheck` أصلًا.
    return label ?? String(param.value)
  }
  return typeof param.value === 'number' ? fmt(param.value, lang) : String(param.value)
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : whole,
  )
}

/**
 * يحوّل جوابًا مُسنَدًا إلى سطور معروضة. **يرمي `CoachProvenanceError`** إن
 * خالف الجواب عقد الإسناد — ولا يبتلع المخالفة ولا يعرض جزءًا منها.
 */
export function renderCoachAnswer(
  answer: CoachAnswer,
  strings: CoachStrings,
  lang: Lang,
  fmt: NumberFormatter = defaultFormatter,
): RenderedAnswer {
  assertAnswerProvenance(answer)

  const byId = new Map<string, CoachFact>(answer.facts.map((f) => [f.id, f]))
  const sourceOf = (factId: string): GroundingSourceId | null => byId.get(factId)?.source ?? null
  const uniq = (ids: Array<GroundingSourceId | null>): GroundingSourceId[] =>
    [...new Set(ids.filter((s): s is GroundingSourceId => s !== null))]

  const lines: RenderedLine[] = answer.lines.map((line) => {
    const values: Record<string, string> = {}
    for (const [name, param] of Object.entries(line.params ?? {})) {
      values[name] = renderParam(param, strings, lang, fmt)
    }
    if (line.question) values.question = strings.questions[line.question]

    const known = uniq([
      ...Object.values(line.params ?? {}).map((p) => sourceOf(p.factId)),
      ...(line.basis ?? []).map(sourceOf),
      ...(line.ref ? [sourceOf(line.ref.factId)] : []),
    ])

    return {
      key: line.key,
      kind: COACH_LINE_KIND[line.key],
      text: fill(strings.lines[line.key], values),
      hedged: COACH_LINE_HEDGED[line.key],
      sources: known,
      unknownSources: uniq((line.unknown ?? []).map(sourceOf)),
      exerciseId: line.ref?.id,
    }
  })

  return {
    subject: answer.subject,
    providerId: answer.providerId,
    disclosure: answer.disclosure === 'localData' ? strings.disclosureLocal : strings.disclosureExternal,
    lines,
  }
}
