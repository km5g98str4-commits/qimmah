// مقيّم الشروط — قلب «القواعد بيانات لا كود».
//
// كل شرط تفرّع في البنك يمرّ من هنا. الفائدة ليست أناقة: مصفوفة التفرّع صارت
// **قابلة للطباعة والفحص الآلي**، فالإثبات يستطيع أن يسأل «أيّ سؤال يظهر لقاصر؟»
// بتقييم الشروط لا بمحاكاة الواجهة.
//
// المقيّم **صارم عمدًا**: قيمة غير متوقّعة تُقيَّم `false` ولا ترمي. سؤال لم
// يظهر أهون من تدفّق انهار — لكنّ الصمت لا يُقبل في التطوير، فـ`explain()`
// يعطي أثرًا كاملًا يستعمله الإثبات.

import type { Condition, ConditionField, ConditionOp, PersonalizationState } from './types'

/** قراءة قيمة الحقل من الحالة. `answers.x` أو `derived.x` — البادئة إلزامية. */
export function readField(field: ConditionField, state: PersonalizationState): unknown {
  const dot = field.indexOf('.')
  if (dot < 0) return undefined
  const scope = field.slice(0, dot)
  const key = field.slice(dot + 1)
  if (!key) return undefined
  if (scope === 'answers') return state.answers[key]
  if (scope === 'derived') return state.derived[key]
  return undefined
}

function isAnswered(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return Number.isFinite(v)
  return true
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function numeric(a: unknown, b: unknown): [number, number] | null {
  if (typeof a !== 'number' || !Number.isFinite(a)) return null
  if (typeof b !== 'number' || !Number.isFinite(b)) return null
  return [a, b]
}

/** يطبّق عاملًا واحدًا. غير معروف ⇒ `false` (لا رمي، ولا `true` متساهل). */
export function applyOp(op: ConditionOp, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case 'answered':
      return isAnswered(actual)
    case 'unanswered':
      return !isAnswered(actual)
    case 'eq':
      return actual === expected
    case 'ne':
      return actual !== expected
    case 'in':
      return asArray(expected).includes(actual as never)
    case 'nin':
      return isAnswered(actual) && !asArray(expected).includes(actual as never)
    case 'gt': {
      const p = numeric(actual, expected)
      return p !== null && p[0] > p[1]
    }
    case 'gte': {
      const p = numeric(actual, expected)
      return p !== null && p[0] >= p[1]
    }
    case 'lt': {
      const p = numeric(actual, expected)
      return p !== null && p[0] < p[1]
    }
    case 'lte': {
      const p = numeric(actual, expected)
      return p !== null && p[0] <= p[1]
    }
    case 'has':
      return asArray(actual).includes(expected as never)
    case 'hasAny': {
      const want = asArray(expected)
      return asArray(actual).some((x) => want.includes(x as never))
    }
    case 'hasNone': {
      const want = asArray(expected)
      return !asArray(actual).some((x) => want.includes(x as never))
    }
    default:
      return false
  }
}

/** يقيّم شرطًا مركّبًا. نقيّ تمامًا — لا قراءة تخزين ولا وقت. */
export function evaluate(cond: Condition | undefined, state: PersonalizationState): boolean {
  if (!cond) return true
  if ('const' in cond) return cond.const
  if ('all' in cond) return cond.all.every((c) => evaluate(c, state))
  if ('any' in cond) return cond.any.some((c) => evaluate(c, state))
  if ('not' in cond) return !evaluate(cond.not, state)
  if ('field' in cond) return applyOp(cond.op, readField(cond.field, state), cond.value)
  return false
}

/** كل الحقول التي يقرأها شرط — يستعمله الإثبات لكشف حقل لا يكتبه أي سؤال. */
export function fieldsOf(cond: Condition | undefined, out: Set<string> = new Set()): Set<string> {
  if (!cond) return out
  if ('all' in cond) cond.all.forEach((c) => fieldsOf(c, out))
  else if ('any' in cond) cond.any.forEach((c) => fieldsOf(c, out))
  else if ('not' in cond) fieldsOf(cond.not, out)
  else if ('field' in cond) out.add(cond.field)
  return out
}

export interface ExplainNode {
  cond: Condition
  result: boolean
  actual?: unknown
  children?: ExplainNode[]
}

/** أثر تقييم كامل — للتشخيص وللإثبات، لا لواجهة المستخدم. */
export function explain(cond: Condition | undefined, state: PersonalizationState): ExplainNode {
  if (!cond) return { cond: { const: true }, result: true }
  if ('const' in cond) return { cond, result: cond.const }
  if ('all' in cond) {
    const children = cond.all.map((c) => explain(c, state))
    return { cond, result: children.every((c) => c.result), children }
  }
  if ('any' in cond) {
    const children = cond.any.map((c) => explain(c, state))
    return { cond, result: children.some((c) => c.result), children }
  }
  if ('not' in cond) {
    const child = explain(cond.not, state)
    return { cond, result: !child.result, children: [child] }
  }
  if ('field' in cond) {
    const actual = readField(cond.field, state)
    return { cond, result: applyOp(cond.op, actual, cond.value), actual }
  }
  return { cond, result: false }
}

// ————————————————————————— مختصرات بناء الشروط —————————————————————————
//
// موجودة لتقصير البنك لا لإخفاء المنطق — كلّها تعيد نفس البنية المعطاة أعلاه.

export const eq = (field: ConditionField, value: unknown): Condition => ({ field, op: 'eq', value })
export const ne = (field: ConditionField, value: unknown): Condition => ({ field, op: 'ne', value })
export const oneOf = (field: ConditionField, value: unknown[]): Condition => ({ field, op: 'in', value })
export const notOneOf = (field: ConditionField, value: unknown[]): Condition => ({ field, op: 'nin', value })
export const gte = (field: ConditionField, value: number): Condition => ({ field, op: 'gte', value })
export const lt = (field: ConditionField, value: number): Condition => ({ field, op: 'lt', value })
export const has = (field: ConditionField, value: unknown): Condition => ({ field, op: 'has', value })
export const hasAny = (field: ConditionField, value: unknown[]): Condition => ({ field, op: 'hasAny', value })
export const hasNone = (field: ConditionField, value: unknown[]): Condition => ({ field, op: 'hasNone', value })
export const answered = (field: ConditionField): Condition => ({ field, op: 'answered' })
export const unanswered = (field: ConditionField): Condition => ({ field, op: 'unanswered' })
export const all = (...c: Condition[]): Condition => ({ all: c })
export const any = (...c: Condition[]): Condition => ({ any: c })
export const not = (c: Condition): Condition => ({ not: c })
