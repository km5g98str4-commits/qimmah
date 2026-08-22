/**
 * ⛔ POST_LAUNCH — خارج نطاق V1، وبلا مُشغِّل.
 *
 * «المدرّب» (`src/lib/coach/`) **خارج V1** ما لم يتغيّر نطاق المنتج بقرار مؤسس
 * صريح. الحالة المقيسة اليوم: `context.ts` و`provenance.ts` و`types.ts` **بلا
 * مستورِد واحد** في `src/`، ولا يبلغها `src/main.tsx`.
 *
 * وهذا الملف تحديدًا **حارس بلا مُشغِّل**: ستة عشر فحصًا مسمّى (`ProvenanceCode`)
 * ولا سكربت npm ولا خطوة CI ولا إثبات يستدعيه، ومستهلكه المُعلَن في تعليقه
 * (`render.ts`) **غير موجود أصلًا**.
 *
 * ⚠️ لا تُحتسب هذه الفحوص الستّة عشر ضمن تغطية V1. حارسٌ لا يعمل ليس تغطية.
 */
// ═══════════════════════════════════════════════════════════════════════════
//  حارس الإسناد — [SOVEREIGN-COACH-001].
//
//  ═══ لماذا حارس بنيوي لا مراجعة نصّية ═══
//  «لا تختلق حالة المستخدم» قاعدة لا تُحرَس بالنية. الميثاق §4.2 يطلب أن تنجو
//  البوّابة **ببنيتها** لا بأخلاق من يكتب فوقها. فالجواب هنا لا يُرسم أبدًا قبل
//  أن يمرّ من `assertAnswerProvenance`: كل وسيط يُطابَق بقيمة حقيقته، وكل حقيقة
//  تُطابَق بمصدر مسجَّل، وكل حقيقة **يجب أن تُستهلك** — فحقيقة مدسوسة بلا سطر
//  يستعملها تسقط كما يسقط سطر يستعمل حقيقة غير موجودة.
//
//  ═══ كل فشل باسمه ═══
//  الرمي `CoachProvenanceError` يحمل `code` من اتحاد مغلق. الميثاق §4.2:
//  «سقوط غير مسمّى ليس إثباتًا» — فلا يُقبَل أن يسقط الإثبات المضادّ بـ
//  `TypeError` عابر، بل بـ`param-value-mismatch` أو `orphan-fact` باسمه.
// ═══════════════════════════════════════════════════════════════════════════

import {
  COACH_LINE_HEDGED,
  GROUNDING_SOURCES,
  isCoachLineKey,
  type CoachAnswer,
  type CoachFact,
} from './types'

/** رموز الفشل — اتحاد مغلق يُسمّى في المخرجات وفي الإثبات المضادّ. */
export type ProvenanceCode =
  | 'duplicate-fact-id'
  | 'unregistered-source'
  | 'unknown-fact-has-value'
  | 'known-fact-null-value'
  | 'unregistered-line-key'
  | 'param-missing-fact'
  | 'param-value-mismatch'
  | 'param-on-unknown-fact'
  | 'basis-missing-fact'
  | 'basis-on-unknown-fact'
  | 'unknown-ref-missing-fact'
  | 'unknown-ref-not-unknown'
  | 'exercise-ref-missing-fact'
  | 'exercise-ref-value-mismatch'
  | 'hedge-required'
  | 'orphan-fact'

export class CoachProvenanceError extends Error {
  readonly code: ProvenanceCode
  readonly detail: string
  constructor(code: ProvenanceCode, detail: string) {
    super(`CoachProvenanceError[${code}]: ${detail}`)
    this.name = 'CoachProvenanceError'
    this.code = code
    this.detail = detail
  }
}

export interface ProvenanceViolation {
  code: ProvenanceCode
  detail: string
}

const isRegisteredSource = (id: string): boolean =>
  Object.prototype.hasOwnProperty.call(GROUNDING_SOURCES, id)

/**
 * يفحص جوابًا كاملًا ويعيد **كل** المخالفات (لا أولاها) — التقرير الكامل أنفع
 * في الإثبات، والرمي يبقى على أولها في `assertAnswerProvenance`.
 *
 * دالة نقيّة: لا تخزين ولا لغة ولا DOM.
 */
export function verifyAnswerProvenance(answer: CoachAnswer): ProvenanceViolation[] {
  const out: ProvenanceViolation[] = []
  const add = (code: ProvenanceCode, detail: string) => out.push({ code, detail })

  // ١) الحقائق نفسها: معرّف فريد · مصدر مسجَّل · شكل القيمة يطابق درجة اليقين.
  const byId = new Map<string, CoachFact>()
  for (const fact of answer.facts) {
    if (byId.has(fact.id)) add('duplicate-fact-id', fact.id)
    byId.set(fact.id, fact)
    if (!isRegisteredSource(fact.source)) add('unregistered-source', `${fact.id} → ${fact.source}`)
    if (fact.certainty === 'unknown' && fact.value !== null) {
      add('unknown-fact-has-value', `${fact.id} = ${String(fact.value)}`)
    }
    if (fact.certainty !== 'unknown' && fact.value === null) {
      add('known-fact-null-value', fact.id)
    }
  }

  // ٢) السطور: كل استعمال لحقيقة يُحصى، وكل قيمة معروضة تُطابَق بمصدرها.
  const used = new Set<string>()
  for (const line of answer.lines) {
    if (!isCoachLineKey(line.key)) {
      add('unregistered-line-key', line.key)
      continue
    }
    let carriesInferred = false

    for (const [name, param] of Object.entries(line.params ?? {})) {
      const fact = byId.get(param.factId)
      if (!fact) {
        add('param-missing-fact', `${line.key}.${name} → ${param.factId}`)
        continue
      }
      used.add(fact.id)
      if (fact.certainty === 'unknown') {
        // وسيط يعرض قيمة، والمجهول لا قيمة له — لو مرّ لصار «٠» في موضع «لا نعرف».
        add('param-on-unknown-fact', `${line.key}.${name} → ${fact.id}`)
        continue
      }
      if (String(param.value) !== String(fact.value)) {
        add('param-value-mismatch', `${line.key}.${name}: ${String(param.value)} ≠ ${String(fact.value)}`)
      }
      if (fact.certainty === 'inferred') carriesInferred = true
    }

    for (const factId of line.basis ?? []) {
      const fact = byId.get(factId)
      if (!fact) {
        add('basis-missing-fact', `${line.key} → ${factId}`)
        continue
      }
      used.add(fact.id)
      if (fact.certainty === 'unknown') add('basis-on-unknown-fact', `${line.key} → ${factId}`)
      if (fact.certainty === 'inferred') carriesInferred = true
    }

    for (const factId of line.unknown ?? []) {
      const fact = byId.get(factId)
      if (!fact) {
        add('unknown-ref-missing-fact', `${line.key} → ${factId}`)
        continue
      }
      used.add(fact.id)
      if (fact.certainty !== 'unknown') add('unknown-ref-not-unknown', `${line.key} → ${factId}`)
    }

    if (line.ref) {
      const fact = byId.get(line.ref.factId)
      if (!fact) {
        add('exercise-ref-missing-fact', `${line.key} → ${line.ref.factId}`)
      } else {
        used.add(fact.id)
        if (String(fact.value) !== line.ref.id) {
          add('exercise-ref-value-mismatch', `${line.key}: ${line.ref.id} ≠ ${String(fact.value)}`)
        }
      }
    }

    // §6/٢: المُستنتَج يُقال بلغة متحفّظة. سطر يحمل `inferred` بنصّ حاسم مخالفة.
    if (carriesInferred && !COACH_LINE_HEDGED[line.key]) {
      add('hedge-required', line.key)
    }
  }

  // ٣) لا حقيقة يتيمة: حقيقة مدسوسة في الطقم بلا سطر يستعملها تسقط هنا.
  for (const fact of answer.facts) {
    if (!used.has(fact.id)) add('orphan-fact', fact.id)
  }

  return out
}

/** يرمي عند أول مخالفة — تُستدعى قبل أي رسم (انظر `render.ts`). */
export function assertAnswerProvenance(answer: CoachAnswer): void {
  const violations = verifyAnswerProvenance(answer)
  if (violations.length) {
    throw new CoachProvenanceError(violations[0].code, violations[0].detail)
  }
}
