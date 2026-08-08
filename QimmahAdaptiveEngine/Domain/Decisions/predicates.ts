// Declarative predicate evaluator (RULE-MODEL §3). Total: never throws on
// missing facts — an unknown path evaluates false, so a rule cannot fire on
// data that is not there.

import type { FactValue, Predicate } from './model'

export function evaluatePredicate(pred: Predicate, facts: Readonly<Record<string, FactValue>>): boolean {
  switch (pred.op) {
    case 'const':
      return pred.value
    case 'all':
      return pred.children.every((c) => evaluatePredicate(c, facts))
    case 'any':
      return pred.children.some((c) => evaluatePredicate(c, facts))
    case 'not':
      return !evaluatePredicate(pred.child, facts)
    case 'eq':
      return facts[pred.path] === pred.value
    case 'ne':
      return pred.path in facts && facts[pred.path] !== pred.value
    case 'in':
      return pred.path in facts && pred.values.includes(facts[pred.path])
    case 'nin':
      return pred.path in facts && !pred.values.includes(facts[pred.path])
    case 'exists':
      return pred.path in facts
    case 'notExists':
      return !(pred.path in facts)
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const v = facts[pred.path]
      if (typeof v !== 'number' || !Number.isSafeInteger(v)) return false
      if (pred.op === 'gt') return v > pred.value
      if (pred.op === 'gte') return v >= pred.value
      if (pred.op === 'lt') return v < pred.value
      return v <= pred.value
    }
  }
}
